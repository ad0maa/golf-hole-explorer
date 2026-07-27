import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { HoleDefinition } from '../data/holes'
import { mulberry32 } from '../lib/prng'
import type { TerrainData } from '../lib/terrain'

const CANDIDATES = 400
const TRUNK_H = 3.2
const CANOPY_H = 7.5
/** Trees stay at least this far outside the fairway edge. */
const CLEARANCE = 12

/** Module-scope scratch objects — reused, never reallocated. */
const scratchMatrix = new THREE.Matrix4()
const scratchPos = new THREE.Vector3()
const scratchQuat = new THREE.Quaternion()
const scratchScale = new THREE.Vector3()
const scratchEuler = new THREE.Euler()

type Placement = { x: number; y: number; z: number; scale: number; rotY: number }

/**
 * 400 candidate trees in TWO draw calls: one InstancedMesh for the trunks, one for the
 * canopies, sharing the same per-instance transforms.
 *
 * Positions come from the hole's seeded PRNG, so they are identical on every render.
 * Math.random() here would teleport every tree whenever React re-rendered — a great bug to
 * have already avoided.
 */
export function Trees({ hole, terrain }: { hole: HoleDefinition; terrain: TerrainData }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)

  const placements = useMemo<Placement[]>(() => {
    const rng = mulberry32(hole.seed + 991)
    const { bounds } = terrain
    const minClearance = hole.fairwayWidth / 2 + CLEARANCE
    const out: Placement[] = []

    // Rejection sampling: keep only candidates that land in rough, well clear of the
    // playing corridor. Draw every random number before the tests so the sequence — and
    // therefore the layout — does not depend on which candidates get rejected.
    for (let i = 0; i < CANDIDATES; i++) {
      const x = bounds.minX + rng() * (bounds.maxX - bounds.minX)
      const z = bounds.minZ + rng() * (bounds.maxZ - bounds.minZ)
      const scale = 0.8 + rng() * 0.6
      const rotY = rng() * Math.PI * 2
      if (terrain.classify(x, z) !== 'rough') continue
      if (terrain.centreline.closestPointOnCurve(x, z).distance <= minClearance) continue
      out.push({ x, y: terrain.sampleHeight(x, z), z, scale, rotY })
    }
    return out
  }, [hole, terrain])

  useLayoutEffect(() => {
    const trunk = trunkRef.current
    const canopy = canopyRef.current
    if (!trunk || !canopy) return

    for (let i = 0; i < placements.length; i++) {
      const p = placements[i]
      scratchEuler.set(0, p.rotY, 0)
      scratchQuat.setFromEuler(scratchEuler)
      scratchScale.set(p.scale, p.scale, p.scale)

      scratchPos.set(p.x, p.y + (TRUNK_H * p.scale) / 2, p.z)
      scratchMatrix.compose(scratchPos, scratchQuat, scratchScale)
      trunk.setMatrixAt(i, scratchMatrix)

      scratchPos.set(p.x, p.y + (TRUNK_H + CANOPY_H / 2) * p.scale, p.z)
      scratchMatrix.compose(scratchPos, scratchQuat, scratchScale)
      canopy.setMatrixAt(i, scratchMatrix)
    }

    trunk.count = placements.length
    canopy.count = placements.length
    trunk.instanceMatrix.needsUpdate = true
    canopy.instanceMatrix.needsUpdate = true
  }, [placements])

  if (placements.length === 0) return null

  return (
    <>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, placements.length]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.28, 0.42, TRUNK_H, 6]} />
        <meshStandardMaterial color="#4a3a28" roughness={0.95} metalness={0} />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[undefined, undefined, placements.length]}
        castShadow
        frustumCulled={false}
      >
        <coneGeometry args={[2.6, CANOPY_H, 7]} />
        <meshStandardMaterial color="#2f5227" roughness={0.9} metalness={0} flatShading />
      </instancedMesh>
    </>
  )
}
