import * as THREE from 'three'
import { pinOf, type HoleDefinition } from '../data/holes'
import { buildCentreline, type Centreline } from './curve'
import { fbm2D } from './noise'
import { pointInPolygon } from './polygon'
import { mulberry32 } from './prng'

export type Surface = 'fairway' | 'green' | 'rough' | 'sand' | 'water'

export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number }

export type TerrainData = {
  geometry: THREE.BufferGeometry
  /**
   * Bilinear interpolation of the height grid. Used instead of raycasting to sit the ball,
   * pin, trees and reticle on the surface.
   */
  sampleHeight(x: number, z: number): number
  classify(x: number, z: number): Surface
  bounds: Bounds
  centreline: Centreline
  /** Wall-clock milliseconds this build took. Surfaced in the README. */
  buildMs: number
}

/** 200 x 200 quads => 201 x 201 = 40,401 vertices, 80,000 triangles. */
const GRID = 200
const COLS = GRID + 1
/** Padding around the hole's own extents, in metres. */
const MARGIN = 45

/**
 * GLSL argument order: smoothstep(edge0, edge1, x). This is NOT the same as
 * THREE.MathUtils.smoothstep(x, min, max), and mixing them up is a silent bug — so it is
 * hand-rolled here. Works with edge0 > edge1 (an inverted ramp) too.
 */
const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const SURFACE_ORDER: readonly Surface[] = ['fairway', 'green', 'rough', 'sand', 'water']

const SURFACE_COLOUR: Record<Surface, string> = {
  fairway: '#5f8f45',
  green: '#76a94f',
  rough: '#3f6330',
  sand: '#d8c68d',
  water: '#1e4d63',
}

/** Per-surface brightness jitter, as a fraction. Keeps large areas from reading flat. */
const SURFACE_JITTER: Record<Surface, number> = {
  fairway: 0.03,
  green: 0,
  rough: 0.06,
  sand: 0,
  water: 0,
}

function boundsFor(hole: HoleDefinition): Bounds {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  const include = (x: number, z: number) => {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }

  // Bounds are driven by the playable hole only. Water polygons are deliberately excluded
  // so a hazard can be authored wider than the terrain and run clean off both edges — if
  // water expanded the bounds, the terrain would always outlast it and the hazard would
  // end mid-map in a straight cliff.
  for (const p of hole.centreline) include(p[0], p[2])
  for (const b of hole.bunkers) for (const p of b.polygon) include(p[0], p[1])

  const pin = pinOf(hole)
  include(pin[0] - hole.greenRadius, pin[2] - hole.greenRadius)
  include(pin[0] + hole.greenRadius, pin[2] + hole.greenRadius)

  return {
    minX: minX - MARGIN,
    maxX: maxX + MARGIN,
    minZ: minZ - MARGIN,
    maxZ: maxZ + MARGIN + hole.teeOffsetM,
  }
}

/**
 * Build ONE BufferGeometry per hole by hand — positions, normals and a `color` attribute
 * written straight into typed arrays.
 *
 * Deliberately not a displaced PlaneGeometry: constructing the buffers explicitly is the
 * point. Vertex colours rather than textures means one draw call and no asset loading.
 */
export function buildTerrain(hole: HoleDefinition): TerrainData {
  const started = performance.now()

  const bounds = boundsFor(hole)
  const spanX = bounds.maxX - bounds.minX
  const spanZ = bounds.maxZ - bounds.minZ
  const centreline = buildCentreline(hole.centreline)
  const pin = pinOf(hole)
  const pinY = pin[1]
  const halfWidth = hole.fairwayWidth / 2
  const rng = mulberry32(hole.seed)
  const hasWater = hole.water.length > 0
  const minLandY = hole.waterLevel + 0.4

  const vertexCount = COLS * COLS
  const positions = new Float32Array(vertexCount * 3)
  const colours = new Float32Array(vertexCount * 3)
  const heights = new Float32Array(vertexCount)
  /** Index into SURFACE_ORDER, one byte per vertex. */
  const surfaces = new Uint8Array(vertexCount)

  const colour = new THREE.Color()
  const blend = new THREE.Color()

  for (let iz = 0; iz < COLS; iz++) {
    const z = bounds.minZ + (iz / GRID) * spanZ
    for (let ix = 0; ix < COLS; ix++) {
      const x = bounds.minX + (ix / GRID) * spanX
      const i = iz * COLS + ix

      const hit = centreline.closestPointOnCurve(x, z)
      const designY = hit.y
      const distToPin = Math.hypot(x - pin[0], z - pin[2])

      // 1. Base height: flat near the centreline, increasingly noisy out in the rough.
      const falloff = smoothstep(halfWidth, halfWidth + 25, hit.distance)
      let y =
        designY +
        fbm2D(x, z, hole.seed) * hole.roughness * 6 * falloff +
        fbm2D(x * 0.25, z * 0.25, hole.seed + 1) * 1.5

      // 2. Surface classification — drives vertex colour and gameplay.
      let surface: Surface = 'rough'
      if (hit.distance < halfWidth) surface = 'fairway'
      if (distToPin < hole.greenRadius) {
        surface = 'green'
        // Flatten toward pin height across the inner 60% of the green.
        y = lerp(y, pinY, smoothstep(hole.greenRadius, hole.greenRadius * 0.6, distToPin))
      }
      for (const b of hole.bunkers) {
        if (pointInPolygon(x, z, b.polygon)) {
          surface = 'sand'
          // Hard step down, no edge falloff. A signed-distance-to-edge ramp would look
          // nicer but needs a helper polygon.ts doesn't have, and the hard edge reads
          // fine at this grid spacing.
          y -= b.depth
          break
        }
      }
      for (const w of hole.water) {
        if (pointInPolygon(x, z, w.polygon)) {
          surface = 'water'
          y = hole.waterLevel - 1.2
          break
        }
      }

      // Land must never sit below the water plane. Rough noise swings several metres, and
      // where it dips under the waterline outside the hazard the water plane's edge shows
      // through as a floating wall with a hard straight shadow.
      if (hasWater && surface !== 'water' && y < minLandY) y = minLandY

      positions[i * 3 + 0] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      heights[i] = y
      surfaces[i] = SURFACE_ORDER.indexOf(surface)

      // 3. Vertex colour from surface, with seeded brightness jitter.
      // new THREE.Color(hex) reads the hex as sRGB and converts into the renderer's
      // working colour space, so these are the literal palette values.
      //
      // The mown-grass boundaries are blended over a 3m band rather than snapped to the
      // surface flag. Classification is per-vertex and binary, so a hard colour switch
      // stair-steps along the ~2.5m grid cells and reads as an artifact. `classify` above
      // stays binary — this only changes what you see, not where the ball lies.
      // Sand and water keep their hard edges, as specified.
      if (surface === 'sand' || surface === 'water') {
        colour.set(SURFACE_COLOUR[surface])
      } else {
        const roughMix = smoothstep(halfWidth - 1.5, halfWidth + 1.5, hit.distance)
        colour.set(SURFACE_COLOUR.fairway).lerp(blend.set(SURFACE_COLOUR.rough), roughMix)
        const greenMix = smoothstep(hole.greenRadius + 1.5, hole.greenRadius - 1.5, distToPin)
        if (greenMix > 0) colour.lerp(blend.set(SURFACE_COLOUR.green), greenMix)
        const jitter = lerp(SURFACE_JITTER.fairway, SURFACE_JITTER.rough, roughMix) * (1 - greenMix)
        if (jitter > 0) colour.multiplyScalar(1 + (rng() * 2 - 1) * jitter)
      }
      colours[i * 3 + 0] = colour.r
      colours[i * 3 + 1] = colour.g
      colours[i * 3 + 2] = colour.b
    }
  }

  // 40,401 vertices exceeds the 65,535 ceiling of a Uint16 index buffer.
  const indices = new Uint32Array(GRID * GRID * 6)
  let w = 0
  for (let iz = 0; iz < GRID; iz++) {
    for (let ix = 0; ix < GRID; ix++) {
      const a = iz * COLS + ix
      const b = a + 1
      const c = a + COLS
      const d = c + 1
      indices[w++] = a
      indices[w++] = c
      indices[w++] = b
      indices[w++] = b
      indices[w++] = c
      indices[w++] = d
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  // Normals must be computed AFTER displacement — flat-plane normals are meaningless here.
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const cellX = spanX / GRID
  const cellZ = spanZ / GRID
  const clampIndex = (v: number): number => Math.min(COLS - 1, Math.max(0, v))

  const sampleHeight = (x: number, z: number): number => {
    const fx = Math.min(GRID, Math.max(0, (x - bounds.minX) / cellX))
    const fz = Math.min(GRID, Math.max(0, (z - bounds.minZ) / cellZ))
    const ix = Math.floor(fx)
    const iz = Math.floor(fz)
    const tx = fx - ix
    const tz = fz - iz
    const i0 = clampIndex(ix)
    const i1 = clampIndex(ix + 1)
    const j0 = clampIndex(iz)
    const j1 = clampIndex(iz + 1)
    const h00 = heights[j0 * COLS + i0]
    const h10 = heights[j0 * COLS + i1]
    const h01 = heights[j1 * COLS + i0]
    const h11 = heights[j1 * COLS + i1]
    return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz)
  }

  const classify = (x: number, z: number): Surface => {
    const ix = clampIndex(Math.round((x - bounds.minX) / cellX))
    const iz = clampIndex(Math.round((z - bounds.minZ) / cellZ))
    return SURFACE_ORDER[surfaces[iz * COLS + ix]]
  }

  return {
    geometry,
    sampleHeight,
    classify,
    bounds,
    centreline,
    buildMs: performance.now() - started,
  }
}
