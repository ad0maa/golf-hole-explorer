import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls } from 'leva'

/** Sampling period for the readout, in milliseconds. */
const SAMPLE_MS = 250

/**
 * Dev-only renderer stats in the leva panel: draw calls, triangles, live geometries, fps.
 *
 * This stands in for `r3f-perf` — §12 says to hand-roll rather than add a dependency, and
 * `renderer.info` already carries every number §6 asks for. `info.memory.geometries`
 * staying flat across hole switches is the proof that terrain geometry is really disposed.
 *
 * Sampling runs on a timer, not in useFrame, for two reasons. Frame callbacks stop when
 * the tab is backgrounded, which freezes the readout at whatever it last saw; and on a
 * hole switch the old geometry is disposed immediately while the new one is not uploaded
 * until the next render, so a frame-timed sample can land in that gap and report zero
 * geometries. The only per-frame work left is incrementing a counter.
 */
export function PerfMonitor() {
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)

  const [, set] = useControls('renderer', () => ({
    drawCalls: { value: 0, editable: false },
    triangles: { value: 0, editable: false },
    geometries: { value: 0, editable: false },
    programs: { value: 0, editable: false },
    fps: { value: 0, editable: false },
  }))

  useFrame(() => {
    frames.current++
  })

  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const elapsed = (now - last) / 1000
      last = now

      // info.memory is a running total and safe to read at any time. info.render is reset
      // at the start of each render, so this reports the most recently drawn frame.
      const { render, memory, programs } = gl.info
      set({
        drawCalls: render.calls,
        triangles: render.triangles,
        geometries: memory.geometries,
        programs: programs?.length ?? 0,
        fps: elapsed > 0 ? Math.round(frames.current / elapsed) : 0,
      })
      frames.current = 0
    }, SAMPLE_MS)

    return () => clearInterval(id)
  }, [gl, set])

  return null
}
