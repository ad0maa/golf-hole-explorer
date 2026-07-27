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
