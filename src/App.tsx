import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import type * as THREE from 'three'
import { Scene } from './scene/Scene'
import { Hud } from './ui/Hud'

declare global {
  interface Window {
    /** Dev-only handle on the renderer, for reading `gl.info` from the console. */
    gl?: THREE.WebGLRenderer
  }
}

export default function App() {
  return (
    <>
      <Canvas
        dpr={[1, 2]}
        shadows="percentage"
        camera={{ position: [60, 90, 120], fov: 55, near: 0.5, far: 2000 }}
        // Stands in for r3f-perf: `gl.info.render` gives draw calls and triangle counts,
        // and `gl.info.memory` proves geometries are disposed on hole switch. Dev only,
        // so it is stripped from the production bundle.
        onCreated={({ gl }) => {
          if (import.meta.env.DEV) window.gl = gl
        }}
      >
        <Scene />
      </Canvas>
      <Hud />
      <Leva hidden={import.meta.env.PROD} />
    </>
  )
}
