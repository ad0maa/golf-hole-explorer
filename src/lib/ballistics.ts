import * as THREE from 'three'
import type { Club } from '../data/clubs'
import type { Wind } from '../store'

export type Shot = {
  /** 48 samples from the ball to the landing point. */
  points: THREE.Vector3[]
  landing: THREE.Vector3
  /** Actual carry after clamping to the club's maximum, in metres. */
  carry: number
  /** True if the club could not reach `to`. */
  short: boolean
}

const SAMPLES = 48
/** How far a rolling putt floats above the green, so the line is not z-fighting it. */
const PUTT_LIFT = 0.12

/**
 * A ballistic arc as a parabola fitted to the club's carry and launch angle. No drag, no
 * roll, no bounce — h = D * tan(theta) / 4 is the standard apex for a projectile of range
 * D launched at theta, which is easy to justify out loud and good enough here.
 *
 * Launch angles are stored in DEGREES and Math.tan takes radians, so degToRad is not
 * optional: Math.tan(12) reads as 12 radians and returns nonsense.
 *
 * Allocation note: this builds 48 Vector3s per call. It is never called from inside
 * useFrame — only when the throttled aim point commits, or on a click — so the
 * zero-allocations-per-frame rule holds.
 */
export function shotArc(
  from: THREE.Vector3,
  to: THREE.Vector3,
  club: Club,
  wind: Wind,
  sampleHeight: (x: number, z: number) => number,
): Shot {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const requested = Math.hypot(dx, dz)

  const carry = Math.min(requested, club.carry)
  const short = requested - carry > 1e-6

  const dirX = requested > 1e-6 ? dx / requested : 0
  const dirZ = requested > 1e-6 ? dz / requested : -1

  const landX = from.x + dirX * carry
  const landZ = from.z + dirZ * carry
  const landY = sampleHeight(landX, landZ)

  const apex = (carry * Math.tan(THREE.MathUtils.degToRad(club.launchAngle))) / 4

  // Crosswind, computed once per shot. A pure head or tail wind gives cross ~ 0 and no
  // lateral drift, which is the point of taking the sine of the angle between them.
  const shotBearing = Math.atan2(dirX, dirZ)
  const cross = Math.sin(wind.dir - shotBearing) * wind.speed

  // Horizontal normal to the shot line, for lateral drift.
  const normX = dirZ
  const normZ = -dirX

  // Putter: launch angle 0 => apex 0 => the arc is a ground-hugging line.
  const isPutt = club.launchAngle === 0

  const points: THREE.Vector3[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const u = i / (SAMPLES - 1)
    const drift = Math.sin(u * Math.PI) * cross * 0.35 * (carry / 100)
    const px = from.x + dirX * carry * u + normX * drift
    const pz = from.z + dirZ * carry * u + normZ * drift
    // Sample the terrain at every point of a putt so it follows the green's contour.
    const py = isPutt
      ? sampleHeight(px, pz) + PUTT_LIFT
      : from.y + (landY - from.y) * u + 4 * apex * u * (1 - u)
    points.push(new THREE.Vector3(px, py, pz))
  }

  const landing = new THREE.Vector3(landX, landY, landZ)
  // Snap the final sample onto the landing point to kill accumulated float drift, but keep
  // a putt's ground clearance — copying `landing` wholesale drops the last vertex to ground
  // level and the putt line dips into the green right at the cup.
  points[SAMPLES - 1].set(landX, isPutt ? landY + PUTT_LIFT : landY, landZ)

  return { points, landing, carry, short }
}
