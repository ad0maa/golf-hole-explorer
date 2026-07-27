import { Html } from '@react-three/drei'
import type { TerrainData } from '../lib/terrain'
import { useStore } from '../store'

export function AimReticle({ terrain }: { terrain: TerrainData }) {
  const aim = useStore((s) => s.aim)
  const ballPos = useStore((s) => s.ballPos)
  const flying = useStore((s) => s.flying)
  const holedOut = useStore((s) => s.holedOut)

  if (!aim || flying || holedOut) return null

  const groundY = terrain.sampleHeight(aim[0], aim[2])
  const ballY = terrain.sampleHeight(ballPos[0], ballPos[2])
  const distance = Math.hypot(aim[0] - ballPos[0], aim[2] - ballPos[2])
  const rise = groundY - ballY
  const riseLabel = `${rise >= 0 ? '+' : '−'}${Math.abs(Math.round(rise))} m`

  return (
    <group position={[aim[0], groundY + 0.05, aim[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.9, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      {/* Screen-space HTML: crisp text at any distance, at the cost of DOM work and no
          depth occlusion. transform={false} keeps it a flat overlay rather than a
          3D-projected plane that would shrink and skew with the terrain.
          pointerEvents:'none' is load-bearing, not cosmetic: drei renders this into a
          wrapper div layered over the canvas, and that wrapper defaults to accepting
          pointer events. Once the label appears under the cursor it swallows the click,
          R3F never sees it, and the shot silently never fires. Styling the inner label
          alone is not enough — the wrapper is a separate element. */}
      <Html
        position={[0, 2.6, 0]}
        center
        transform={false}
        zIndexRange={[5, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="reticle-label mono">
          {Math.round(distance)} m · {riseLabel}
        </div>
      </Html>
    </group>
  )
}
