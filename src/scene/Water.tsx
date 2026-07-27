import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { HoleDefinition } from '../data/holes'
import type { TerrainData } from '../lib/terrain'

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/**
 * A translucent surface at the hole's water level, built from the hole's actual water
 * polygons rather than their bounding box — a bbox plane overhangs the irregular shoreline
 * and floats above the land, casting a giveaway straight-edged shadow.
 *
 * Vertices are clamped to the terrain bounds. Hazards are authored wider than the terrain
 * on purpose (see `boundsFor` in terrain.ts) so they run off both edges instead of ending
 * in a mid-map cliff, which means the raw polygon would otherwise hang past the terrain
 * into open sky. Clamping is exact here because the polygons' outermost edges are straight
 * and axis-aligned; a general case would want Sutherland-Hodgman clipping.
 *
 * THREE.Shape + ShapeGeometry triangulates the polygon (earcut, built into three), so no
 * new dependency and no hand-rolled ear clipping.
 *
 * ShapeGeometry builds in the XY plane. Rotating -90 degrees about X maps a shape point
 * (x, y) to world (x, 0, -y), so the shape is authored with y = -z to land face-up at the
 * right world coordinates.
 */
export function Water({ hole, terrain }: { hole: HoleDefinition; terrain: TerrainData }) {
  const geometry = useMemo(() => {
    if (hole.water.length === 0) return null
    const { minX, maxX, minZ, maxZ } = terrain.bounds
    const shapes = hole.water.map((w) => {
      const shape = new THREE.Shape()
      w.polygon.forEach(([px, pz], i) => {
        const x = clamp(px, minX, maxX)
        const z = clamp(pz, minZ, maxZ)
        if (i === 0) shape.moveTo(x, -z)
        else shape.lineTo(x, -z)
      })
      shape.closePath()
      return shape
    })
    return new THREE.ShapeGeometry(shapes)
  }, [hole, terrain])

  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!geometry) return null

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, hole.waterLevel, 0]}>
      <meshStandardMaterial
        color="#2c6f92"
        transparent
        opacity={0.72}
        roughness={0.12}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
