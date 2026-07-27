import type { TerrainData } from '../lib/terrain'
import { useStore } from '../store'

/** Exaggerated: a true-scale 21mm ball is sub-pixel at these camera distances. */
export const BALL_R = 0.6

export function Ball({ terrain }: { terrain: TerrainData }) {
  const ballPos = useStore((s) => s.ballPos)
  const y = terrain.sampleHeight(ballPos[0], ballPos[2]) + BALL_R

  return (
    <mesh position={[ballPos[0], y, ballPos[2]]} castShadow>
      <sphereGeometry args={[BALL_R, 16, 12]} />
      <meshStandardMaterial color="#fbfbf6" roughness={0.35} metalness={0} />
    </mesh>
  )
}
