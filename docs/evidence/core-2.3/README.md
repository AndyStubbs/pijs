# Core 2.3 Evidence

This folder holds measurements and reproductions for the 2.3 core audit
([CORE-V2.3-AUDIT.md](../../plans/CORE-V2.3-AUDIT.md)). It records:
- **Revision:** `96279b9`, measured 2026-09-24. The audit changed no library code or tests.
- **Machine:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0.
- **Browsers:** Playwright 1.56.0 with Chromium 141.0.7390.37, Firefox 142.0.1 and WebKit 26.0.
- **Tools:** esbuild 0.25.10 and TypeScript 5.6.3, from the repository's `node_modules`.
- **Units:** sizes are bytes of the minified IIFE bundle and its gzip level 9 compression;
  times are wall-clock milliseconds.

## Files

| File | Contents |
| --- | --- |
| `contracts-2.2.json` | Each 2.2 audit contract (SYS-001–023, COV-001–005), its tests, the result of running each suite alone, and the deliberate-break results for the P1 contracts |
| `size-baseline.json` | `npm run size -- --out=docs/evidence/core-2.3/size-baseline.json` at the revision |
| `probes.js` | Browser reproductions C01–C14, run in Chromium, Firefox and WebKit against fresh in-memory bundles of the current source, and declaration probes compiled with TypeScript |
| `probes-output.json` | Observed and expected results per engine and probe, with page errors, and the TypeScript errors per consumer and module resolution |

## 2.2 contracts

Each contract maps to its tests through the test audit's
[coverage map](../tests-2.3/coverage-map-after.json). Every listed suite was run alone with
`node --test --test-concurrency=1`: 35 files, 458 tests, 450 passed, 8 skipped, none failed.
The skips are the WebKit audio-engine cases in `audio-lifecycle-browser.test.js`
(Playwright's Windows WebKit has no Web Audio API). The visual contracts (SYS-023, COV-001,
COV-002) use the full `npm test` run at the same revision: 35 full, 20 lite and 8 plugin
visual tests passed, none skipped.

**Deliberate breaks.** Each P1 fix was reverted in a scratch copy of the tree made with
`git archive HEAD`, never in the working tree. The contract's own suites were then run against
the copy:

| Contract | Break | Caught by |
| --- | --- | --- |
| SYS-001 | `removeScreen()` sets the next active screen without rebuilding global bindings (`src/core/screen-manager.js`) | 4 tests in `screen-lifecycle-browser.test.js` |
| SYS-002 | `checkReady()` calls callbacks without isolating a throw (`src/core/commands.js`) | 1 test in `ready.test.js` |
| SYS-003 | Screen removal no longer disposes an active `input()` prompt (`plugins/keyboard/input.js`) | 12 or more tests in `keyboard-lifecycle.test.js`, 4 in `keyboard-lifecycle-browser.test.js` |
| SYS-004 | `settleLoad()` releases a readiness wait every time it is called (`plugins/sound/samples.js`) | 8 tests in `audio-lifecycle.test.js`, 6 in `audio-lifecycle-browser.test.js` |

## Size baseline

| Bundle | Bytes | Gzip |
| --- | --- | --- |
| `pi.min.js` (Full) | 208,078 | 72,604 |
| `pi.lite.min.js` | 137,458 | 48,585 |
| `sound` 2.0.0 | 42,607 | 15,559 |
| `sound-advanced` 1.0.0 | 31,605 | 11,163 |
| `pi-vision` | 13,925 | 4,762 |
| `pointer` 1.0.0 | 12,738 | 3,951 |
| `keyboard` 1.0.0 | 8,436 | 3,110 |
| `onscreen-keyboard` 1.0.0 | 6,876 | 2,606 |
| `print-table` 1.0.0 | 5,441 | 2,046 |
| `gamepad` 1.0.0 | 4,006 | 1,428 |
| `polygons` 1.0.0 | 3,582 | 1,660 |

Merging `sound-advanced` into Full would add 10.10 KB gzipped. The size report has no version
for `pi-vision` because its bundle has no version banner.

## Probes

Run `node docs/evidence/core-2.3/probes.js`. It needs no server and rewrites
`probes-output.json`. Run `npm run build` first if `build/` is stale: the declaration probes
assemble the release package from `build/` and `releases/pi-latest/package.json` in a
temporary folder.

Each browser probe opens a fresh page, loads a bundle built from the current source, awaits
`$.ready()`, and runs one scenario through the public API. Two probes drive a whole page:
- **C04** serves the Full bundle and the standalone keyboard plugin from a routed origin,
  once as classic scripts and once as ES modules, and records whether the application code
  after them runs.
- **C05** loads Full with `print-table` and `onscreen-keyboard`, shows the number keyboard,
  and taps a key with trusted mouse input before and after `clearEvents( "press" )`.

The declaration probes compile six small consumers with `--strict` under `bundler` and
`nodenext` module resolution. Package paths in the recorded errors are shortened to
`<package>`.

A probe's `confirmed` flag is true when the observed behavior differs from the expected
contract.

**Results:** all three engines give the same observations for every probe. They differ only
in the text of browser `TypeError` messages. All six declaration consumers differ from
runtime behavior.
