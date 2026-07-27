import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import type * as THREE from 'three'
import { Scene } from './scene/Scene'
import { Hud } from './ui/Hud'

declare global {
  interface Window {
    /** Dev-only handle on the renderer, for reading `gl.info` from the console. */
    gl?: THREE.WebGLRenderer
    /** Dev-only handle on the default camera, for projecting world points to screen. */
    camera?: THREE.Camera
  }
}

export default function App() {
  return (
    <>
      <Canvas
        // Pin the canvas container to the viewport instead of letting it inherit a height
        // through html -> body -> #root. If any link in that percentage chain loses its
        // height, the container sizes to its content — which is the canvas — while the
        // canvas sizes to the container, so a stale size feeds back on itself and the view
        // stays frozen at whatever dimensions it last had, parked in the top-left corner.
        //
        // This has to go through `style` rather than a CSS class: R3F writes
        // `position: relative` as an inline style on this element and spreads the `style`
        // prop last, so an external stylesheet silently loses to it.
        style={{ position: 'fixed', inset: 0 }}
        dpr={[1, 2]}
        shadows="percentage"
        camera={{ position: [60, 90, 120], fov: 55, near: 0.5, far: 2000 }}
        // Stands in for r3f-perf: `gl.info.render` gives draw calls and triangle counts,
        // and `gl.info.memory` proves geometries are disposed on hole switch. Dev only,
        // so it is stripped from the production bundle.
        onCreated={({ gl, camera }) => {
          if (import.meta.env.DEV) {
            window.gl = gl
            window.camera = camera
          }
        }}
      >
        <Scene />
      </Canvas>
      <Hud />
      <Leva hidden={import.meta.env.PROD} />
    </>
  )
}
