import { useEffect } from 'react'
import { CLUBS } from '../data/clubs'
import { HOLES, pinOf } from '../data/holes'
import type { CameraMode } from '../store'
import { useStore } from '../store'
import { CameraButtons, CAMERA_MODES } from './CameraButtons'
import { ClubPicker } from './ClubPicker'
import { HoledOutBanner } from './HoledOutBanner'
import { HoleTabs } from './HoleTabs'
import { WindIndicator } from './WindIndicator'

/** Keyed off the same table the buttons render, so the two can never drift apart. */
const CAMERA_KEYS: Record<string, CameraMode> = Object.fromEntries(
  CAMERA_MODES.map((m) => [m.key.toLowerCase(), m.mode]),
)

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const digit = Number(e.key)
      if (Number.isInteger(digit) && digit >= 1 && digit <= CLUBS.length) {
        useStore.getState().setClub(CLUBS[digit - 1].id)
        return
      }
      const mode = CAMERA_KEYS[e.key.toLowerCase()]
      if (mode) useStore.getState().setCamera(mode)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function Hint() {
  const hintVisible = useStore((s) => s.hintVisible)
  const dismissHint = useStore((s) => s.dismissHint)
  if (!hintVisible) return null

  return (
    <div className="panel panel-hint">
      <span>Move the mouse over the course to aim. Click to hit.</span>
      <button type="button" className="hint-x" onClick={dismissHint} aria-label="Dismiss hint">
        ×
      </button>
    </div>
  )
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
      <WindIndicator />
      <Hint />
      <Scorecard />
      <ClubPicker />
      <CameraButtons />
      <HoledOutBanner />
    </div>
  )
}
