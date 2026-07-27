import { useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { TerrainData } from '../lib/terrain'
import { useStore } from '../store'

/** Only commit a new aim point when it moves more than this, in metres. */
const AIM_EPSILON = 0.25

/** Module-scope scratch — the pending pointer point, never reallocated. */
const pending = { x: 0, y: 0, z: 0, dirty: false }

export function Terrain({ terrain }: { terrain: TerrainData }) {
  const setAim = useStore((s) => s.setAim)
  const requestShot = useStore((s) => s.requestShot)
  const lastCommitted = useRef<[number, number, number] | null>(null)

  // R3F's onPointerMove is a raycast under the hood, against THIS mesh only rather than
  // the whole scene. Pointer events fire faster than frames, so stash the hit here and
  // commit at most once per frame.
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    pending.x = e.point.x
    pending.y = e.point.y
    pending.z = e.point.z
    pending.dirty = true
  }

  const onPointerOut = () => {
    pending.dirty = false
    lastCommitted.current = null
    setAim(null)
  }

  useFrame(() => {
    if (!pending.dirty) return
    pending.dirty = false
    const prev = lastCommitted.current
    if (prev && Math.hypot(pending.x - prev[0], pending.z - prev[2]) < AIM_EPSILON) return
    const next: [number, number, number] = [pending.x, pending.y, pending.z]
    lastCommitted.current = next
    setAim(next)
  })

  return (
    <mesh
      geometry={terrain.geometry}
      receiveShadow
      castShadow
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      onClick={() => requestShot()}
    >
      <meshStandardMaterial vertexColors flatShading={false} roughness={0.95} metalness={0} />
    </mesh>
  )
}
