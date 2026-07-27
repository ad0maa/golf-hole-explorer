/**
 * Ray-casting point-in-polygon test in the XZ plane.
 *
 * Cast a ray in +X from (x, z) and count how many polygon edges it crosses: odd means
 * inside, even means outside. Handles concave polygons, and assumes the polygon is simple
 * (non-self-intersecting), which every bunker and water polygon in holes.ts is.
 */
export function pointInPolygon(
  x: number,
  z: number,
  polygon: readonly (readonly [number, number])[],
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const zi = polygon[i][1]
    const xj = polygon[j][0]
    const zj = polygon[j][1]
    // Does edge j->i straddle the horizontal line at `z`, and is the crossing to our right?
    const straddles = zi > z !== zj > z
    if (straddles && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
