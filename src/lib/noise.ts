/**
 * 2D value noise + fBm, hand-rolled.
 *
 * Value noise: hash the four integer lattice corners around (x, y) to pseudo-random
 * values, then smoothstep-interpolate between them. Cheaper and simpler to explain than
 * gradient (Perlin) noise, and at this grid resolution the difference is invisible.
 */

/**
 * One noise lattice cell per 64 world metres, so callers pass raw world coordinates.
 *
 * 64m is chosen against the terrain grid, not by eye. The grid is 201x201 vertices over a
 * ~500m hole, so vertices sit ~2.5m apart. With 4 octaves the finest octave's lattice is
 * 64/8 = 8m — comfortably above twice the sample spacing. A tighter base period pushes the
 * top octave below the Nyquist limit of the grid, and that detail aliases into faceted
 * noise instead of dunes.
 */
const BASE_FREQ = 1 / 64

/** Integer hash -> [0, 1). Deterministic for a given (ix, iy, seed). */
function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const fade = (t: number): number => t * t * (3 - 2 * t)

/** Value noise in world metres. Returns [-1, 1]. */
export function valueNoise2D(x: number, y: number, seed: number): number {
  const sx = x * BASE_FREQ
  const sy = y * BASE_FREQ
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const u = fade(sx - ix)
  const v = fade(sy - iy)

  const n00 = hash2(ix, iy, seed)
  const n10 = hash2(ix + 1, iy, seed)
  const n01 = hash2(ix, iy + 1, seed)
  const n11 = hash2(ix + 1, iy + 1, seed)

  const a = n00 + (n10 - n00) * u
  const b = n01 + (n11 - n01) * u
  return (a + (b - a) * v) * 2 - 1
}

/** Fractal Brownian motion: octaves of value noise at doubling frequency, halving amplitude. */
export function fbm2D(x: number, y: number, seed: number, octaves = 4): number {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise2D(x * freq, y * freq, seed + o * 131) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}
