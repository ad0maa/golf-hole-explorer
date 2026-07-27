import { useStore } from '../store'

/**
 * `wind.dir` is a world bearing, `atan2(x, z)`: 0 points toward +Z, PI toward -Z.
 *
 * On screen the arrow is drawn pointing up and rotated clockwise by `theta`, giving a
 * direction of `(sin theta, -cos theta)`. Reading the HUD as a plan view with -Z up and +X
 * right, a bearing `b` should point at `(sin b, cos b)` in SVG coordinates (where +y is
 * down). Solving the two gives `theta = PI - b`, so a wind blowing straight down the hole
 * points straight up in the HUD.
 */
const bearingToScreenDeg = (bearing: number): number => 180 - (bearing * 180) / Math.PI

export function WindIndicator() {
  const wind = useStore((s) => s.wind)
  // wind.speed is stored in m/s; the HUD shows km/h.
  const kmh = Math.round(wind.speed * 3.6)

  return (
    <div className="panel panel-tr">
      <div className="wind-row">
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          aria-hidden="true"
          style={{ transform: `rotate(${bearingToScreenDeg(wind.dir)}deg)` }}
        >
          <path d="M13 3 L19.5 21.5 L13 17 L6.5 21.5 Z" fill="#eef4f7" />
        </svg>
        <div className="wind-text">
          <div className="mono">{kmh} km/h</div>
          <div className="mono dim wind-cap">wind</div>
        </div>
      </div>
    </div>
  )
}
