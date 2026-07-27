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
- **`typescript` / `@types/*` left as `latest`**, exactly as §2's dependency block specifies,
  rather than pinned to a resolved version.
