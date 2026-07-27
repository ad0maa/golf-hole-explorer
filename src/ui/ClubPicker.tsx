import { CLUBS } from '../data/clubs'
import { useStore } from '../store'

export function ClubPicker() {
  const clubId = useStore((s) => s.clubId)
  const setClub = useStore((s) => s.setClub)

  return (
    <div className="panel panel-bc">
      <div className="clubs">
        {CLUBS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={c.id === clubId ? 'club club-on' : 'club'}
            onClick={() => setClub(c.id)}
          >
            <span className="club-key mono">{i + 1}</span>
            <span className="club-label">{c.label}</span>
            <span className="club-carry mono dim">{c.carry} m</span>
          </button>
        ))}
      </div>
    </div>
  )
}
