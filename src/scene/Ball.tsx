import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clubById } from '../data/clubs'
import { HOLES, pinOf } from '../data/holes'
import { shotArc } from '../lib/ballistics'
import type { TerrainData } from '../lib/terrain'
import { useStore } from '../store'

/** Exaggerated: a true-scale 21mm ball is sub-pixel at these camera distances. */
export const BALL_R = 0.6
/** Within this distance of the pin, the ball is holed. */
const HOLED_OUT_RADIUS = 1

/** Module-scope scratch — reused every frame, never reallocated. */
const scratchPoint = new THREE.Vector3()
const scratchFrom = new THREE.Vector3()
const scratchTo = new THREE.Vector3()

type Flight = {
  curve: THREE.CatmullRomCurve3
  duration: number
  elapsed: number
  landing: THREE.Vector3
  /** Where the ball was played from — restored on a water penalty. */
  origin: [number, number, number]
}

export function Ball({ terrain }: { terrain: TerrainData }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const flightRef = useRef<Flight | null>(null)

  const shotSeq = useStore((s) => s.shotSeq)
  const ballPos = useStore((s) => s.ballPos)
  const holeIndex = useStore((s) => s.holeIndex)

  // Start a flight when a terrain click bumps shotSeq. Everything else is read through
  // getState() so this effect does not re-run on unrelated store changes.
  useEffect(() => {
    if (shotSeq === 0) return
    const s = useStore.getState()
    if (!s.aim || s.flying || s.holedOut) return

    // The arc is computed ground-to-ground: shotArc snaps its landing to terrain height,
    // so starting it at ball-centre height would leave the ball half-buried on impact and
    // pop it up a radius when it settles. The radius is added at render time instead.
    scratchFrom.set(s.ballPos[0], terrain.sampleHeight(s.ballPos[0], s.ballPos[2]), s.ballPos[2])
    scratchTo.set(s.aim[0], s.aim[1], s.aim[2])
    const shot = shotArc(scratchFrom, scratchTo, clubById(s.clubId), s.wind, terrain.sampleHeight)

    flightRef.current = {
      curve: new THREE.CatmullRomCurve3(shot.points),
      duration: 0.6 + shot.carry / 220,
      elapsed: 0,
      landing: shot.landing,
      origin: [s.ballPos[0], s.ballPos[1], s.ballPos[2]],
    }
    s.setFlying(true)
  }, [shotSeq, terrain])

  // Cancel any shot in the air when the hole changes.
  useEffect(() => {
    flightRef.current = null
  }, [holeIndex])

  useFrame((_state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const flight = flightRef.current
    if (!flight) {
      // Settled: sit on the terrain at the committed position.
      mesh.position.set(
        ballPos[0],
        terrain.sampleHeight(ballPos[0], ballPos[2]) + BALL_R,
        ballPos[2],
      )
      return
    }

    flight.elapsed += delta
    const t = Math.min(1, flight.elapsed / flight.duration)
    flight.curve.getPointAt(t, scratchPoint)
    mesh.position.copy(scratchPoint)
    mesh.position.y += BALL_R

    if (t < 1) return

    // Landed: resolve the outcome and commit exactly once.
    flightRef.current = null
    const s = useStore.getState()
    const hole = HOLES[s.holeIndex]
    const pin = pinOf(hole)
    const surface = terrain.classify(flight.landing.x, flight.landing.z)

    if (surface === 'water') {
      // One penalty stroke, and the ball returns to where it was played from.
      s.landShot(flight.origin, 1, false)
      return
    }

    const settled: [number, number, number] = [
      flight.landing.x,
      flight.landing.y,
      flight.landing.z,
    ]
    const toPin = Math.hypot(settled[0] - pin[0], settled[2] - pin[2])
    s.landShot(settled, 0, toPin < HOLED_OUT_RADIUS)
  })

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[BALL_R, 16, 12]} />
      <meshStandardMaterial color="#fbfbf6" roughness={0.35} metalness={0} />
    </mesh>
  )
}
