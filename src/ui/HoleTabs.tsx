import { HOLES } from '../data/holes'
import { useStore } from '../store'

export function HoleTabs() {
  const holeIndex = useStore((s) => s.holeIndex)
  const setHole = useStore((s) => s.setHole)
  const hole = HOLES[holeIndex]

  return (
    <div className="panel panel-tl">
      <div className="tabs">
        {HOLES.map((h, i) => (
          <button
            key={h.number}
            type="button"
            className={i === holeIndex ? 'tab tab-on' : 'tab'}
            onClick={() => setHole(i)}
          >
            {h.number}
          </button>
        ))}
      </div>
      <div className="hole-name">{hole.name}</div>
      <div className="mono dim">
        Par {hole.par} · {hole.lengthM} m
      </div>
    </div>
  )
}
