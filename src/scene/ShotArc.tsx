import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { clubById } from '../data/clubs'
import { shotArc } from '../lib/ballistics'
import type { TerrainData } from '../lib/terrain'
import { useStore } from '../store'

/**
 * The dimmed preview arc from the ball to the cursor, drawn with the same `shotArc` call
 * the real shot uses — so what you see is exactly what you get. Recomputed only when the
 * throttled aim point commits, never per frame.
 *
 * The arc turns amber and stops short when the selected club cannot reach the cursor,
 * which is what makes club choice matter before you commit to the swing.
 */
export function ShotArc({ terrain }: { terrain: TerrainData }) {
  const aim = useStore((s) => s.aim)
  const ballPos = useStore((s) => s.ballPos)
  const clubId = useStore((s) => s.clubId)
  const wind = useStore((s) => s.wind)
  const flying = useStore((s) => s.flying)
  const holedOut = useStore((s) => s.holedOut)

  const shot = useMemo(() => {
    if (!aim) return null
    // Ground-to-ground, matching Ball.tsx: shotArc snaps its landing to terrain height, so
    // both ends of the arc live in ground space and the ball radius is added at render time.
    const from = new THREE.Vector3(
      ballPos[0],
      terrain.sampleHeight(ballPos[0], ballPos[2]),
      ballPos[2],
    )
    const to = new THREE.Vector3(aim[0], aim[1], aim[2])
    return shotArc(from, to, clubById(clubId), wind, terrain.sampleHeight)
  }, [aim, ballPos, clubId, wind, terrain])

  if (!shot || flying || holedOut) return null

  const colour = shot.short ? '#e8a33d' : '#f4f8fa'

  return (
    <>
      <Line points={shot.points} color={colour} lineWidth={2} transparent opacity={0.6} />
      <mesh position={shot.landing} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.4, 24]} />
        <meshBasicMaterial color={colour} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}
