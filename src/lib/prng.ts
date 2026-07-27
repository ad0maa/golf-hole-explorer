/**
 * mulberry32 — a 32-bit seeded PRNG. Small, fast, and good enough for scatter and
 * colour jitter.
 *
 * Seeded on purpose: tree positions and colour noise must be identical on every render.
 * Math.random() here would reshuffle the scene whenever React re-rendered.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
