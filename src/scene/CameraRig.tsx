import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { HOLES, pinOf } from '../data/holes'
import type { TerrainData } from '../lib/terrain'
import { useStore } from '../store'

const DEFAULT_FOV = 55
const OVERHEAD_FOV = 20
/** Ground-level fog, matching Scene.tsx. */
const FOG_NEAR = 400
const FOG_FAR = 700
/**
 * Overhead pushes the fog effectively out of range. Fitting a ~460m hole at a 20 degree
 * FOV puts the camera about 1300m up, which is far past the 700m fog plane — leaving the
 * course fogged out to flat background colour. A plan view has no use for atmospheric
 * depth anyway; the ground-level modes keep it.
 */
const OVERHEAD_FOG_NEAR = 3000
const OVERHEAD_FOG_FAR = 9000
const FLYOVER_SECONDS = 12
const FLYOVER_HEIGHT = 14
const FLYOVER_LOOKAHEAD_M = 40
/** Pointer travel, in px, that counts as a camera drag rather than a shot. */
const DRAG_PX = 6

/** Module-scope scratch — reused every frame, never reallocated. */
const targetPos = new THREE.Vector3()
const targetLook = new THREE.Vector3()
const currentLook = new THREE.Vector3()
const scratchA = new THREE.Vector3()
const scratchB = new THREE.Vector3()

/**
 * Frame-rate-independent damping. A fixed lerp factor moves twice as far per second at
 * 120fps as at 60fps; this converges at the same rate regardless of frame time. `k` is the
 * fraction of the remaining distance still left after one second.
 */
const dampFactor = (delta: number, k = 0.001): number => 1 - Math.pow(k, delta)

export function CameraRig({ terrain }: { terrain: TerrainData }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  const cameraMode = useStore((s) => s.cameraMode)
  const holeIndex = useStore((s) => s.holeIndex)
  const ballPos = useStore((s) => s.ballPos)
  const hole = HOLES[holeIndex]

  const flyoverT = useRef(0)

  // Entering a mode restarts the flyover and seeds the look-at from wherever the camera is
  // pointing now, so the damping eases out of the current view instead of whipping.
  useEffect(() => {
    flyoverT.current = 0
    const controls = controlsRef.current
    if (controls) currentLook.copy(controls.target)
  }, [cameraMode, holeIndex])

  /**
   * Disabled OrbitControls emit no events, so handing control back to the user is driven by
   * raw DOM listeners on the canvas.
   *
   * The spec calls for any pointerdown to snap back to orbit, but pointerdown is also how a
   * shot is played — that would kick the player out of Tee view on every swing. A drag is
   * the gesture that actually means "I want the camera"; a click means "hit the ball". So
   * this waits for the pointer to travel DRAG_PX before escaping, and treats a wheel as an
   * immediate escape.
   */
  useEffect(() => {
    const el = gl.domElement
    let downX = 0
    let downY = 0
    let pressed = false

    const escape = () => {
      if (useStore.getState().cameraMode === 'orbit') return
      // Re-seat the orbit pivot on whatever we were looking at, so the view does not jump.
      const controls = controlsRef.current
      if (controls) {
        controls.target.copy(currentLook)
        controls.update()
      }
      useStore.getState().setCamera('orbit')
    }

    const onPointerDown = (e: PointerEvent) => {
      pressed = true
      downX = e.clientX
      downY = e.clientY
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!pressed) return
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_PX) {
        pressed = false
        escape()
      }
    }
    const onPointerUp = () => {
      pressed = false
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('wheel', escape, { passive: true })
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('wheel', escape)
    }
  }, [gl])

  useFrame((_state, delta) => {
    const controls = controlsRef.current
    const mode = useStore.getState().cameraMode
    const f = dampFactor(delta)

    /** Ease the FOV toward `to`. Overhead narrows it; every other mode restores it. */
    const dampFov = (to: number) => {
      if (Math.abs(camera.fov - to) < 0.01) return
      camera.fov += (to - camera.fov) * f
      camera.updateProjectionMatrix()
    }

    /** Ease the fog planes, so entering and leaving Overhead does not pop. */
    const dampFog = (near: number, far: number) => {
      const fog = scene.fog
      if (!(fog instanceof THREE.Fog)) return
      fog.near += (near - fog.near) * f
      fog.far += (far - fog.far) * f
    }

    if (mode === 'orbit') {
      // Track where the user is looking, so a later preset -> orbit handover has a pivot.
      if (controls) currentLook.copy(controls.target)
      // Still restore the FOV: leaving Overhead for Orbit otherwise strands the camera at
      // 20 degrees, and the user has no way to widen it again.
      dampFov(DEFAULT_FOV)
      dampFog(FOG_NEAR, FOG_FAR)
      return
    }

    const pin = pinOf(hole)
    const ballY = terrain.sampleHeight(ballPos[0], ballPos[2])
    let fov = DEFAULT_FOV
    let fogNear = FOG_NEAR
    let fogFar = FOG_FAR

    if (mode === 'tee') {
      // Behind the ball, looking down the hole toward the pin.
      //
      // The spec's 8m setback at 6m up puts the ball ~35 degrees below the view axis while
      // the camera looks at a pin hundreds of metres away — outside the 55 degree vertical
      // FOV, so the player cannot see their own ball. 19m back at 5.5m up keeps the same
      // over-the-shoulder framing and lifts the ball clear of the club picker, which sits
      // bottom-centre in the same part of the screen. The extra setback is for short
      // viewports: the ball's position is in NDC but the HUD is in pixels, so a 630px-tall
      // window pinches the two together while a 720px one does not.
      scratchA.set(pin[0] - ballPos[0], 0, pin[2] - ballPos[2])
      if (scratchA.lengthSq() < 1e-6) scratchA.set(0, 0, -1)
      scratchA.normalize()
      targetPos.set(ballPos[0] - scratchA.x * 19, ballY + 5.5, ballPos[2] - scratchA.z * 19)
      targetLook.set(pin[0], pin[1] + 1, pin[2])
    } else if (mode === 'green') {
      // 40m short of the pin along the hole's axis, 18m up.
      scratchA.set(pin[0] - ballPos[0], 0, pin[2] - ballPos[2])
      if (scratchA.lengthSq() < 1e-6) scratchA.set(0, 0, -1)
      scratchA.normalize()
      targetPos.set(pin[0] - scratchA.x * 40, pin[1] + 18, pin[2] - scratchA.z * 40)
      targetLook.set(pin[0], pin[1], pin[2])
    } else if (mode === 'overhead') {
      // Same perspective camera, narrowed FOV for a flat plan-like read. Deliberately not
      // an OrthographicCamera: one camera for the whole app, no makeDefault juggling.
      const b = terrain.bounds
      const cx = (b.minX + b.maxX) / 2
      const cz = (b.minZ + b.maxZ) / 2
      const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ)
      // Height is derived from the FOV rather than guessed: to fit `span` across a 20
      // degree vertical FOV the camera has to sit span/2/tan(fov/2) up, with a little
      // margin. Guessing a multiple of the span leaves most of the hole off-screen.
      const height = (span / 2 / Math.tan(THREE.MathUtils.degToRad(OVERHEAD_FOV / 2))) * 1.08
      // The z epsilon keeps the view direction off exactly straight-down, which would make
      // the up-vector degenerate and flip the camera.
      targetPos.set(cx, height, cz + 0.01)
      targetLook.set(cx, 0, cz)
      fov = OVERHEAD_FOV
      fogNear = OVERHEAD_FOG_NEAR
      fogFar = OVERHEAD_FOG_FAR
    } else {
      // flyover
      flyoverT.current = Math.min(1, flyoverT.current + delta / FLYOVER_SECONDS)
      const t = flyoverT.current
      const curve = terrain.centreline.curve
      curve.getPointAt(t, scratchA)
      const ahead = Math.min(1, t + FLYOVER_LOOKAHEAD_M / terrain.centreline.length)
      curve.getPointAt(ahead, scratchB)
      targetPos.set(scratchA.x, scratchA.y + FLYOVER_HEIGHT, scratchA.z)
      targetLook.copy(scratchB)
      if (t >= 1) {
        currentLook.copy(targetLook)
        if (controls) {
          controls.target.copy(targetLook)
          controls.update()
        }
        useStore.getState().setCamera('orbit')
      }
    }

    camera.position.lerp(targetPos, f)
    currentLook.lerp(targetLook, f)
    camera.lookAt(currentLook)
    dampFov(fov)
    dampFog(fogNear, fogFar)
  })

  return (
    <OrbitControls
      ref={controlsRef}
      // Non-negotiable: while a preset drives the camera from useFrame, the controls' own
      // writes fight it and the view jitters. This is the classic R3F camera bug.
      enabled={cameraMode === 'orbit'}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.03}
      minDistance={5}
      maxDistance={1500}
    />
  )
}
