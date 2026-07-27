import { HOLES } from '../data/holes'
import { useStore } from '../store'

/** Golf's names for a score relative to par. */
function verdictFor(strokes: number, par: number): string {
  const diff = strokes - par
  if (strokes === 1) return 'Hole in one'
  if (diff <= -3) return 'Albatross'
  if (diff === -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double bogey'
  return `${diff} over par`
}

export function HoledOutBanner() {
  const holedOut = useStore((s) => s.holedOut)
  const strokes = useStore((s) => s.strokes)
  const holeIndex = useStore((s) => s.holeIndex)
  const resetHole = useStore((s) => s.resetHole)

  if (!holedOut) return null

  const hole = HOLES[holeIndex]

  return (
    <div className="banner">
      <div className="banner-title">
        Holed out in {strokes} — {verdictFor(strokes, hole.par)}
      </div>
      <div className="banner-sub mono dim">
        {hole.name} · Par {hole.par}
      </div>
      <button type="button" className="banner-btn" onClick={resetHole}>
        Play again
      </button>
    </div>
  )
}
