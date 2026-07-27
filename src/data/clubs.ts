export type ClubId = 'driver' | 'wood3' | 'iron5' | 'iron8' | 'wedge' | 'putter'

export type Club = {
  id: ClubId
  label: string
  /** Maximum carry in metres. */
  carry: number
  /**
   * Launch angle in DEGREES. Every trig call must convert first —
   * `Math.tan(12)` reads 12 radians and gives nonsense.
   */
  launchAngle: number
}

export const CLUBS: readonly Club[] = [
  { id: 'driver', label: 'Driver', carry: 235, launchAngle: 12 },
  { id: 'wood3', label: '3 Wood', carry: 205, launchAngle: 14 },
  { id: 'iron5', label: '5 Iron', carry: 170, launchAngle: 22 },
  { id: 'iron8', label: '8 Iron', carry: 135, launchAngle: 32 },
  { id: 'wedge', label: 'Pitching Wedge', carry: 100, launchAngle: 45 },
  { id: 'putter', label: 'Putter', carry: 25, launchAngle: 0 },
]

export function clubById(id: ClubId): Club {
  const club = CLUBS.find((c) => c.id === id)
  if (!club) throw new Error(`Unknown club: ${id}`)
  return club
}
