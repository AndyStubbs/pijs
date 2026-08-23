# Repository Guidelines

## Project Structure & Module Organization

Pi.js is a browser-only WebGL 2 graphics, sound, and input library. Source code lives in
`src/`: public API modules are under `src/api/`, rendering code under `src/renderer/`, core
state and utilities under `src/core/`, and bitmap-font support under `src/text/`. Optional
features are organized as separate packages in `plugins/`. Build tooling is in `scripts/`,
while generated bundles go to `build/`; do not edit generated bundles directly. Documentation
belongs in `docs/`, release snapshots in `releases/`, and development utilities in `tools/`.

Visual regression fixtures are split between `test/tests/html-core/` and
`test/tests/html-plugins/`. Their approved PNG baselines live in `test/tests/screenshots/`.
Manual demos and performance checks have dedicated directories under `test/`.

## Build, Test, and Development Commands

- `npm install` installs the Node 18+ development dependencies.
- `npm run build` uses esbuild to produce full, lite, ESM, IIFE, and plugin bundles.
- `npm run server` serves the repository at `http://localhost:8080/` for demos and tests.
- `npm test` runs Chromium visual regression tests through Playwright.
- `npm run test:grep -- "Circle"` runs matching visual tests only.
- `npm run test:plugins` runs the plugin fixture suite (the packaged script uses Windows-style
  environment syntax; on POSIX use `PI_TEST_TYPE=plugins npx playwright test`).

## Coding Style & Naming Conventions

Follow `.editorconfig` and `.cursorrules`: indent with tabs (width 4), use LF endings, keep lines
under 100 characters, and use double-quoted strings. Put spaces inside call parentheses
(`draw( x, y )`), but none before control parentheses (`if( ready )`). Quote object keys and
prefer explicit `if`/`else` over ternaries. Use `camelCase` for functions and variables,
`UPPER_CASE` for true constants, and `m_` for module-private state. Add file-level JSDoc and
document public functions.

## Testing Guidelines

Tests use Playwright plus deterministic PNG comparison. Name fixtures descriptively with
numbered suffixes, such as `circle_01.html`, and include the required TOML metadata block.
Review images generated in `test/tests/screenshots/new/`; never replace approved baselines
without deliberate visual review. Test results and traces appear under `test/test-results/` and
`test/playwright-report/`.

## Commit & Pull Request Guidelines

Recent history uses short, imperative summaries such as `Added custom shaders` and
`Fixed font case`. Keep each commit focused and reference an issue when applicable. Pull
requests should explain behavior changes, list validation commands, link related issues, and
include before/after screenshots for rendering changes. Do not commit build outputs or updated
visual baselines unless they are intentional and reviewed.
