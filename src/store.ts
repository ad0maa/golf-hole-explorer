import { create } from 'zustand'
import type { ClubId } from './data/clubs'
import { HOLES, teeOf, windForHole } from './data/holes'

export type CameraMode = 'tee' | 'green' | 'overhead' | 'orbit' | 'flyover'

export type Wind = { dir: number; speed: number }

/**
 * Rule: NO THREE.* instances in this store. Plain numbers and arrays only, converted at
 * the boundary. Mutating a Vector3 held in a store doesn't trigger a re-render, and mixing
 * the two models is where R3F apps get confusing.
 *
 * Rule: the ball's per-frame animated position lives in a ref in Ball.tsx. Only the
 * settled landing position is committed here — writing to a store 60x/second re-renders
 * the React tree 60x/second for no reason.
 */
type State = {
  holeIndex: number
  ballPos: [number, number, number]
  strokes: number
  clubId: ClubId
  cameraMode: CameraMode
  wind: Wind
  /** Cursor point on the terrain, null when the pointer is off-surface. */
  aim: [number, number, number] | null
  /** True while the ball animates. */
  flying: boolean
  holedOut: boolean
  /** Bumped by a terrain click to trigger a shot. Ball.tsx watches it. */
  shotSeq: number
  /** Dismissible first-load hint. */
  hintVisible: boolean

  setHole: (index: number) => void
  setClub: (id: ClubId) => void
  setCamera: (mode: CameraMode) => void
  setAim: (aim: [number, number, number] | null) => void
  setFlying: (flying: boolean) => void
  requestShot: () => void
  /** Commit a settled shot: new position, stroke count, hole-out result. */
  landShot: (pos: [number, number, number], penaltyStrokes: number, holedOut: boolean) => void
  resetHole: () => void
  dismissHint: () => void
}

declare global {
  interface Window {
    /** Dev-only handle for inspecting game state from the console. */
    store?: typeof useStore
  }
}

/** Y is a placeholder; Ball.tsx snaps it to sampleHeight once the terrain exists. */
const teeStart = (holeIndex: number): [number, number, number] => teeOf(HOLES[holeIndex])

export const useStore = create<State>((set) => ({
  holeIndex: 0,
  ballPos: teeStart(0),
  strokes: 0,
  clubId: 'driver',
  cameraMode: 'tee',
  wind: windForHole(HOLES[0]),
  aim: null,
  flying: false,
  holedOut: false,
  shotSeq: 0,
  hintVisible: true,

  setHole: (holeIndex) =>
    set({
      holeIndex,
      ballPos: teeStart(holeIndex),
      strokes: 0,
      wind: windForHole(HOLES[holeIndex]),
      aim: null,
      flying: false,
      holedOut: false,
      cameraMode: 'tee',
    }),
  setClub: (clubId) => set({ clubId }),
  setCamera: (cameraMode) => set({ cameraMode }),
  setAim: (aim) => set({ aim }),
  setFlying: (flying) => set({ flying }),
  requestShot: () => set((s) => (s.flying || s.holedOut ? s : { shotSeq: s.shotSeq + 1 })),
  landShot: (ballPos, penaltyStrokes, holedOut) =>
    set((s) => ({
      ballPos,
      strokes: s.strokes + 1 + penaltyStrokes,
      flying: false,
      holedOut,
    })),
  resetHole: () =>
    set((s) => ({
      ballPos: teeStart(s.holeIndex),
      strokes: 0,
      aim: null,
      flying: false,
      holedOut: false,
    })),
  dismissHint: () => set({ hintVisible: false }),
}))

if (import.meta.env.DEV) window.store = useStore
