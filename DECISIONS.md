# Decisions

Ambiguities in `GOLF-HOLE-EXPLORER-SPEC.md`, resolved toward the simplest option that satisfies
the acceptance criteria.

## Phase 0

- **No test framework.** §12 forbids dependencies beyond §2, which rules out vitest. Pure
  algorithm modules are verified with throwaway scripts run via `npx tsx@latest` (npx does not add
  anything to `package.json`); scene and UI behaviour is verified in the browser against each
  phase's acceptance criteria. `npm run build` (`tsc -b && vite build`) is the standing gate.
- **`oxlint` and `@types/node` removed from the Vite template's scaffold.** The current
  `react-ts` template ships both, and neither appears in §2's dependency list. `tsconfig.node.json`
  now sets `"types": []` instead of `["node"]`; `vite.config.ts` uses no Node APIs, so nothing
  needs them.
- **`"strict": true` added to both tsconfigs.** The template omits it, and §2 requires it.
- **The template's `public/favicon.svg` and `public/icons.svg` were deleted** — §2 forbids asset
  files. `public/` stays empty until the Phase 5 screenshot lands there.
- **`<Canvas shadows="percentage">` instead of bare `shadows`.** three 0.185 has deprecated
  `PCFSoftShadowMap`, which is R3F's default for `shadows`, and silently falls back to
  `PCFShadowMap` with a console warning. Naming `percentage` selects that same map explicitly:
  identical output, one less warning. Shadows are still on, as §6 requires.
- **Repo:** https://github.com/ad0maa/golf-hole-explorer ·
  **Live:** https://golf-hole-explorer.vercel.app
- **Vercel is Git-connected, not CLI-deployed.** `vercel link` attached the project to the GitHub
  repo, so pushes to `main` build production automatically and pull requests get preview
  deployments. §9's `vercel --prod` would have created a project that deploys from local files
  with no Git connection, which has to be linked up afterwards anyway.
- **`GOLF-HOLE-EXPLORER-SPEC.md` and `docs/superpowers/` are gitignored.** They are working
  documents; the repo is the portfolio artefact. This file carries the record of what was
  ambiguous and how it was resolved.
- **`typescript` / `@types/*` left as `latest`**, exactly as §2's dependency block specifies,
  rather than pinned to a resolved version.
- **Favicon is an inline SVG data URI** in `index.html`. Without one the browser requests
  `/favicon.ico` and logs a 404, and §2 forbids asset files — so it is drawn in markup like
  everything else in the scene.

## Phase 1

- **Noise base period is 64m, not 16m.** The terrain grid is 201x201 vertices over a ~500m
  hole, so vertices sit ~2.5m apart. With 4 octaves a 16m base puts the finest octave on a 2m
  lattice — below the grid's Nyquist limit — and that detail aliases into faceted noise instead
  of dunes. At 64m the finest octave is 8m, comfortably above twice the sample spacing.
  Measured: max height change between adjacent vertices dropped from 0.517 to 0.164.
- **Mown-grass colour boundaries are blended over a 3m band.** Surface classification is
  per-vertex and binary, so switching colour on the flag stair-steps the fairway edge along
  grid cells and reads as a bug. `classify()` stays binary — the blend only affects what you
  see, never where the ball lies. Sand and water keep the hard edges §5.1 specifies.
- **Hole 2's water is an irregular polygon**, not the axis-aligned rectangle it started as. A
  rectangle reads as a swimming pool from above; the hole's character is a coastal inlet.
- **`r3f-perf` was never installed.** §6 says use it in development then remove it before
  shipping; §12 says prefer the hand-rolled version over a new dependency. `PerfMonitor.tsx`
  reports draw calls, triangles, live geometries and fps into the leva panel §2 already
  allocates for "a dev-only debug panel", using `renderer.info`. No dependency, nothing to
  remove later.
- **`PerfMonitor` samples on a 250ms timer, not in `useFrame`.** Frame callbacks stop when the
  tab is backgrounded, freezing the readout; and on a hole switch the old geometry is disposed
  immediately while the new one is not uploaded until the next render, so a frame-timed sample
  can land in that gap and report zero geometries.
- **`FrameHole` in `Scene.tsx` is a Phase 1 placeholder.** Holes range from 165m to 480m and no
  single fixed camera frames them all. Phase 4 replaces it with `CameraRig`.
- **One console warning remains:** `THREE.Clock has been deprecated`, emitted from inside
  @react-three/fiber 9.6.1 against three 0.185. Not ours, and not fixable without patching R3F
  or moving off the pinned versions.

## Phase 2

- **Water is a flat translucent surface, not a shader ripple.** §8 Phase 2 explicitly permits
  this, and it keeps water to one draw call and zero shader code.
- **Water geometry is built from the hole's polygons via `THREE.Shape` + `ShapeGeometry`**, not
  from their bounding box. A bbox plane overhangs the irregular shoreline, floats above the
  land and casts a straight-edged shadow that gives the whole trick away. `ShapeGeometry`
  triangulates with the earcut implementation already inside three, so no new dependency.
- **Water polygons no longer expand the terrain bounds** (`boundsFor` in `terrain.ts`). They
  used to, which meant the terrain always outlasted the hazard by the 45m margin and the water
  ended mid-map in a straight cliff. Hazards are now authored wider than the terrain and run
  cleanly off both edges; the water geometry is clamped back to the terrain bounds so it does
  not hang past the map into open sky.
- **Land is clamped to `waterLevel + 0.4`** on holes with water. Rough noise swings several
  metres and dipped below the waterline outside the hazard, exposing the water surface as a
  floating sheet over dry ground.
- **The flag waves by rotating the flag group** in `useFrame`, not by displacing vertices —
  §8 says not to write a custom shader unless there is time.
- **Ball radius is 0.6m**, not the real 21mm: a true-scale ball is sub-pixel at these camera
  distances.

## Phase 3

- **`<Html>` needs `style={{ pointerEvents: 'none' }}`, and this is load-bearing.** drei renders
  `<Html>` into a wrapper div layered over the canvas, and that wrapper accepts pointer events by
  default. Once the reticle label appeared it sat over the cursor and swallowed every click:
  R3F never saw the event, `onClick` never fired, and shots silently did not happen while aiming
  still worked perfectly. Setting `pointer-events: none` on the inner `.reticle-label` is not
  enough — the wrapper is a separate element.
- **`occlude` dropped from `<Html>`.** §5.4 asks for `<Html occlude transform={false} />`;
  `occlude` makes drei raycast the label against scene meshes every frame, which costs more than
  it gives on a label that has to stay readable. Kept `transform={false}`.
- **`shotSeq` added to the store.** The spec's `State` has no shot trigger. A monotonically
  increasing counter bumped by a terrain click is the smallest thing that lets `Ball.tsx` start a
  flight without putting a three.js object in the store. `requestShot` refuses to bump it while
  `flying` or `holedOut`, which is how §5.7's "ignore pointer clicks entirely while flying" is
  enforced in one place.
- **Shot arcs are computed ground-to-ground**, with the ball radius added at render time.
  `shotArc` snaps its landing to terrain height, so starting the arc at ball-centre height left
  the ball half-buried on impact and popped it up a radius when it settled.
- **A putt's final sample keeps its ground clearance.** Every putt point sits `PUTT_LIFT` above
  the green, but the last sample was being overwritten with the raw landing point at ground
  level, so the putt line dipped into the surface right at the cup.
- **Dev-only `window.gl`, `window.camera` and `window.store` handles**, all stripped from
  production builds. They are what made the `<Html>` diagnosis possible.

## Phase 4

- **Snap-back to orbit waits for a drag, not any pointerdown.** §5.6 says a `pointerdown` or
  `wheel` in a preset mode should hand control back to orbit — but `pointerdown` is also how a
  shot is played, so taken literally every swing kicks the player out of Tee view. A drag is the
  gesture that means "I want the camera"; a click means "hit the ball". The listener now waits
  for 6px of pointer travel before escaping, and a wheel still escapes immediately. Verified:
  clicking in Tee view plays the shot and stays in Tee; dragging or scrolling returns to orbit.
- **Tee camera sits 16m back at 5.5m up, not the spec's 8m/6m.** At 8m back with the camera
  looking at a pin hundreds of metres away, the ball falls ~35 degrees below the view axis —
  outside the 55 degree vertical FOV — so the player cannot see their own ball. 16m keeps the
  over-the-shoulder framing and lifts the ball clear of the club picker, which occupies the same
  bottom-centre screen space.
- **Overhead height is derived from the FOV**, `span / 2 / tan(fov/2)`, not guessed as a multiple
  of the hole span. Fitting a ~460m hole at 20 degrees needs about 1300m of altitude; a guessed
  multiple left most of the hole off-screen.
- **Overhead pushes the fog out of range.** Two spec requirements collide: fog at 400-700m (§8)
  and an overhead plan view at ~20 degrees FOV (§5.6). At the altitude needed to frame a hole,
  the entire course sits beyond the fog far plane and renders as flat background colour. The fog
  planes are damped out to 3000/9000 in Overhead and back on exit. A plan view has no use for
  atmospheric depth; the ground-level modes keep it.
- **FOV is restored in orbit mode too.** The first version returned early for `orbit` before the
  FOV damping ran, so leaving Overhead for Orbit stranded the camera at 20 degrees with no way
  to widen it again.
- **Camera keys are derived from the same table the buttons render** (`CAMERA_MODES`), so the
  shortcuts and the UI cannot drift apart.

## Phase 5

- **The README reports an Apple M1 Pro, not the M2 Pro** the spec's template assumed. The numbers
  are what this machine actually measured; shipping the template's hardware would be a false claim.
- **fps is reported as 95, not 60.** 60 was the spec's target; 95 is what was measured at 2560x1440
  in Chromium, which does not cap to the display's refresh rate. On a vsynced browser this would
  read 60.
- **The wind arrow maps a world bearing to a screen rotation.** `wind.dir` is `atan2(x, z)`, and
  the HUD reads as a plan view with -Z up and +X right, which works out to a clockwise SVG
  rotation of `PI - bearing`. A wind blowing straight down the hole points straight up in the HUD.
- **Tee setback ended at 19m** rather than the 16m Phase 4 landed on. The ball's position in frame
  is in NDC but the HUD is in pixels, so a 630px-tall window pinches the ball against the club
  picker while a 720px one does not. 19m clears both.
- **The OG image is a screenshot of the app's own output**, taken from the production build at
  1200x630, so `public/og.png` is the only file in `public/` and no asset was downloaded.
- **`r3f-perf` was never installed and so never needed removing** — see the Phase 1 note. The leva
  panel does the job §6 wanted it for.

### Phase 5 measurements

Apple M1 Pro, 2560x1440, Chromium:

- **95 fps**, **15-19 draw calls**, **177k-180k triangles**, **10-11 geometries**
- Terrain build **87 / 69 / 63 ms** for holes 1-3
- Bundle **1,340 kB raw / 383 kB gzipped** (three.js dominates), CSS 3.3 kB / 1.1 kB gzipped
- Production build verified to strip leva, `window.gl`, `window.camera` and `window.store`

### Phase 4 measurements

- **Zero jitter in every preset:** max camera movement between consecutive frames measured at
  **0.00000** units once settled, for Tee, Green and Overhead
- Flyover traverses the hole (z −58 → −361, rising 14→19m with the terrain) and hands back to
  orbit on schedule
- Overhead: 1461m altitude, 20 degree FOV, whole hole framed; FOV restores to 55 on exit
- All five camera keys (T G O R F) and all six club keys verified

### Phase 3 measurements

- **14 draw calls, 180k triangles, 10 geometries** while aiming (arc line, landing ring and
  reticle ring on top of the scene's 7), 60fps+
- **No leak while aiming:** geometries held at 10 across 120 cursor moves, each rebuilding the
  preview arc, and fell back to 7 when the pointer left the terrain
- Verified end to end: club clamping (a driver aimed at 276m carries exactly its 235m), water
  penalty (stroke + penalty, ball returned to origin), hole-out inside 1m, and mid-flight clicks
  ignored

### Phase 2 measurements

- **10-15 draw calls**, 176k-184k triangles rendered, **60fps**
- **7 geometries** on holes 1 and 3, **8** on hole 2 (which adds water) — stable across 24
  hole switches, so the Phase 1 disposal guarantee still holds with the dressing added
- ~300 of 400 candidate trees survive rejection sampling, drawn in **2 draw calls**

### Phase 1 measurements

- Terrain build: **69ms / 57ms / 52ms** for holes 1-3 (budget was 250ms)
- 40,401 vertices, 80,000 triangles per hole, one `BufferGeometry`, Uint32 index buffer
- **2 draw calls, 160,000 triangles rendered** (80k twice: shadow pass + main pass)
- **60fps** at 1200x1223
- **No geometry leak:** `renderer.info.memory.geometries` held at exactly 1 across 30 hole
  switches
