import * as THREE from 'three'

export type CurveHit = {
  /** HORIZONTAL distance from the query point to the closest sample, in metres. */
  distance: number
  /** Curve parameter in [0, 1] at that sample. */
  t: number
  /** World Y of that sample — the design height of the fairway there. */
  y: number
}

export type Centreline = {
  curve: THREE.CatmullRomCurve3
  /** Approximate arc length in metres. */
  length: number
  closestPointOnCurve(x: number, z: number): CurveHit
}

const DEFAULT_SAMPLES = 400

/**
 * Build a Catmull-Rom curve through the hole centreline and flatten `samples` evenly
 * spaced points into a Float32Array for fast repeated queries.
 *
 * `closestPointOnCurve` is a linear scan over every sample: 400 samples against the 40,401
 * terrain vertices is ~16M distance checks per hole. That runs in ~100ms at build time,
 * which is fine because it happens once per hole and the result is memoised. If it ever
 * needed to run interactively I'd bucket the samples into a uniform XZ grid and scan only
 * the buckets near the query point, turning O(n) into O(1) amortised.
 *
 * Distance is HORIZONTAL ONLY — the sample's Y is deliberately ignored. Hole 3 climbs 21m,
 * and a full 3D distance would make the fairway measurably narrower on the uphill stretches.
 * That would be wrong: fairway width is a plan-view property.
 */
export function buildCentreline(
  points: readonly [number, number, number][],
  samples = DEFAULT_SAMPLES,
): Centreline {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'catmullrom',
    0.5,
  )

  const spaced = curve.getSpacedPoints(samples - 1)
  const flat = new Float32Array(samples * 3)
  for (let i = 0; i < samples; i++) {
    flat[i * 3 + 0] = spaced[i].x
    flat[i * 3 + 1] = spaced[i].y
    flat[i * 3 + 2] = spaced[i].z
  }

  const length = curve.getLength()

  const closestPointOnCurve = (x: number, z: number): CurveHit => {
    let bestSq = Infinity
    let bestIndex = 0
    for (let i = 0; i < samples; i++) {
      const dx = x - flat[i * 3 + 0]
      const dz = z - flat[i * 3 + 2]
      const sq = dx * dx + dz * dz
      if (sq < bestSq) {
        bestSq = sq
        bestIndex = i
      }
    }
    return {
      distance: Math.sqrt(bestSq),
      t: bestIndex / (samples - 1),
      y: flat[bestIndex * 3 + 1],
    }
  }

  return { curve, length, closestPointOnCurve }
}
