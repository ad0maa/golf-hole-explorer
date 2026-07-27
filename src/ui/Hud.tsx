import { useEffect } from 'react'
import { CLUBS } from '../data/clubs'
import { HOLES, pinOf } from '../data/holes'
import { useStore } from '../store'
import { ClubPicker } from './ClubPicker'
import { HoleTabs } from './HoleTabs'

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const digit = Number(e.key)
      if (Number.isInteger(digit) && digit >= 1 && digit <= CLUBS.length) {
        useStore.getState().setClub(CLUBS[digit - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function Scorecard() {
  const holeIndex = useStore((s) => s.holeIndex)
  const strokes = useStore((s) => s.strokes)
  const ballPos = useStore((s) => s.ballPos)
  const hole = HOLES[holeIndex]
  const pin = pinOf(hole)
  const toPin = Math.hypot(ballPos[0] - pin[0], ballPos[2] - pin[2])

  return (
    <div className="panel panel-bl mono">
      Stroke {strokes + 1} · Par {hole.par} · {Math.round(toPin)} m to pin
    </div>
  )
}

export function Hud() {
  useKeyboardShortcuts()

  return (
    <div className="hud">
      <HoleTabs />
      <Scorecard />
      <ClubPicker />
    </div>
  )
}
