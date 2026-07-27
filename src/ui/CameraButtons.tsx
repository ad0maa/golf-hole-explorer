import type { CameraMode } from '../store'
import { useStore } from '../store'

export const CAMERA_MODES: { mode: CameraMode; label: string; key: string }[] = [
  { mode: 'tee', label: 'Tee', key: 'T' },
  { mode: 'green', label: 'Green', key: 'G' },
  { mode: 'overhead', label: 'Overhead', key: 'O' },
  { mode: 'orbit', label: 'Orbit', key: 'R' },
  { mode: 'flyover', label: 'Flyover', key: 'F' },
]

export function CameraButtons() {
  const cameraMode = useStore((s) => s.cameraMode)
  const setCamera = useStore((s) => s.setCamera)

  return (
    <div className="panel panel-br">
      <div className="cams">
        {CAMERA_MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            className={m.mode === cameraMode ? 'cam cam-on' : 'cam'}
            onClick={() => setCamera(m.mode)}
          >
            <span>{m.label}</span>
            <span className="mono dim">{m.key}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
