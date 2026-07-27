import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pinOf, type HoleDefinition } from '../data/holes'
import type { TerrainData } from '../lib/terrain'

const POLE_H = 2.4

export function Pin({ hole, terrain }: { hole: HoleDefinition; terrain: TerrainData }) {
  const flagRef = useRef<THREE.Group>(null)
  const pin = pinOf(hole)
  const groundY = terrain.sampleHeight(pin[0], pin[2])

  // A cheap wave: rotate the flag group rather than displacing vertices or writing a
  // custom shader. Two sines at different rates keep it from looking metronomic.
  useFrame((state) => {
    const flag = flagRef.current
    if (!flag) return
    const t = state.clock.elapsedTime
    flag.rotation.y = Math.sin(t * 1.6) * 0.28
    flag.rotation.z = Math.sin(t * 2.3 + 1) * 0.06
  })

  return (
    <group position={[pin[0], groundY, pin[2]]}>
      <mesh position={[0, POLE_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, POLE_H, 6]} />
        <meshStandardMaterial color="#f2f2ee" roughness={0.6} metalness={0} />
      </mesh>
      {/* Cup rim, so the target reads from directly above. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.16, 0.24, 20]} />
        <meshStandardMaterial color="#16210f" roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <group ref={flagRef} position={[0, POLE_H - 0.28, 0]}>
        <mesh position={[0.42, 0, 0]} castShadow>
          <planeGeometry args={[0.84, 0.52]} />
          <meshStandardMaterial
            color="#d94f3d"
            roughness={0.8}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  )
}
