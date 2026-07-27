import { useEffect, useMemo } from 'react'
import { HOLES } from '../data/holes'
import { buildTerrain } from '../lib/terrain'
import { useStore } from '../store'
import { AimReticle } from './AimReticle'
import { Ball } from './Ball'
import { CameraRig } from './CameraRig'
import { PerfMonitor } from './PerfMonitor'
import { Pin } from './Pin'
import { ShotArc } from './ShotArc'
import { Terrain } from './Terrain'
import { Trees } from './Trees'
import { Water } from './Water'

export function Scene() {
  const holeIndex = useStore((s) => s.holeIndex)
  const hole = HOLES[holeIndex]

  // ~80k triangles: build once per hole, never per render.
  const terrain = useMemo(() => buildTerrain(hole), [hole])

  // Free the GPU buffers on hole switch. JS garbage collection does not cover WebGL
  // resources — without this, ten hole switches leak ten terrains.
  useEffect(() => () => terrain.geometry.dispose(), [terrain])

  const { bounds } = terrain
  const cx = (bounds.minX + bounds.maxX) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const spanX = bounds.maxX - bounds.minX
  const spanZ = bounds.maxZ - bounds.minZ
  // Fit the shadow camera to the hole. The default +/-5 box would put the entire course
  // outside the shadow frustum.
  const shadowExtent = Math.max(spanX, spanZ) / 2 + 20

  return (
    <>
      <color attach="background" args={['#9fc6de']} />
      <fog attach="fog" args={['#9fc6de', 400, 700]} />

      <hemisphereLight args={['#cfe4f2', '#33502c', 0.55]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        castShadow
        position={[cx + 140, 220, cz + 160]}
        intensity={1.7}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={1}
        shadow-camera-far={900}
        shadow-bias={-0.0005}
      />

      <Terrain terrain={terrain} />
      <Water hole={hole} terrain={terrain} />
      <Trees hole={hole} terrain={terrain} />
      <Pin hole={hole} terrain={terrain} />
      <Ball terrain={terrain} />
      <ShotArc terrain={terrain} />
      <AimReticle terrain={terrain} />
      <CameraRig terrain={terrain} />
      {import.meta.env.DEV && <PerfMonitor />}
    </>
  )
}
