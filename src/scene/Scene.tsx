import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { HOLES } from '../data/holes'
import { buildTerrain, type TerrainData } from '../lib/terrain'
import { useStore } from '../store'
import { AimReticle } from './AimReticle'
import { Ball } from './Ball'
import { PerfMonitor } from './PerfMonitor'
import { Pin } from './Pin'
import { ShotArc } from './ShotArc'
import { Terrain } from './Terrain'
import { Trees } from './Trees'
import { Water } from './Water'

/**
 * Placeholder framing so every hole is viewable in Phase 1 — holes range from 165m to
 * 480m, and one fixed camera cannot frame them all. Phase 4 replaces this entirely with
 * CameraRig and its five modes.
 */
function FrameHole({ terrain }: { terrain: TerrainData }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const controls = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    const { bounds } = terrain
    const cx = (bounds.minX + bounds.maxX) / 2
    const cz = (bounds.minZ + bounds.maxZ) / 2
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)
    // Pull back far enough that `span` fits the vertical FOV, then come in closer and
    // lower: the spec's 400-700m fog is tuned for a tee-level camera, and a full overview
    // sits far enough away to wash the green out entirely.
    const dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    camera.position.set(cx + span * 0.15, dist * 0.42, cz + dist * 0.52)
    camera.updateProjectionMatrix()
    controls.current?.target.set(cx, 0, cz)
    controls.current?.update()
  }, [terrain, camera])

  return <OrbitControls ref={controls} enableDamping dampingFactor={0.08} maxDistance={1500} />
}

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
      <FrameHole terrain={terrain} />
      {import.meta.env.DEV && <PerfMonitor />}
    </>
  )
}
