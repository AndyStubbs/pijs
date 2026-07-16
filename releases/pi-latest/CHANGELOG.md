## [2.0.3] - 2026-07-15
### Fixed
- Package `exports` no longer list a `browser` condition pointing at IIFE
  builds. Vite and similar bundlers now resolve `import` / `default` to the
  ESM files (`pi.esm.js`, lite, plugins). CDN `<script>` tags still use
  `unpkg` / `jsdelivr` → `dist/pi.min.js`.

## [2.0.2] - 2026-07-15
### Fixed
- Package `exports` and `types` paths now point at `dist/…` so Vite/npm
  resolve `import $ from "pijs-web"` correctly
- `$.play()` no longer creates a new AudioContext per call, which could
  exhaust the browser limit and stop sound (e.g. fireworks demo). Notes
  now share one context and disconnect Web Audio nodes when they end.
- Sound envelopes use linear ramps instead of `setValueCurveAtTime`, which
  could throw on a shared context, leak audio nodes (errors often swallowed
  by callers), degrade playback, and eventually crash the tab. Concurrent
  voices are also capped to avoid renderer overload.
- Voice limiting only stops notes that have already started, so long
  `$.play()` melodies are no longer silenced while notes are queued.
- `$.play()` again returns the track ID so `$.stopPlay( trackId )` works.

## [2.0.1] - 2025-12-14
### Fixed
- Array.includes() bug in plugins.js
- Error message typo in colors.js
- Wrong function name in graphics.js
- Null reference in screen-manager.js
- Variable shadowing in images.js
- Function signature mismatch in pixels.js
- Typo in comment (colors.js line 268)
- Inconsistent return types in pixels.js
- Plugin dependencies resolve immediatly if plugins exist in plugins.js
- Plugin tests no longer have redundant plugins
