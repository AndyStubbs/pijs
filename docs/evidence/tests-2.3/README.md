# Tests 2.3 Evidence

This folder holds measurements and checks for the 2.3 test audit
([AUDIT-TESTS.md](../../plans/v2.3/AUDIT-TESTS.md)). It records:
- **Revision:** `bd7bd70`, measured 2026-09-23.
- **Machine:** Windows 11, 16 logical CPUs, Node 22.19.0.
- **Browsers:** Playwright 1.56.0 with Chromium 141, Firefox 142 and WebKit 26.
- **Units:** times are wall-clock milliseconds unless a file says otherwise.

## Files

| File | Contents |
| --- | --- |
| `timings-before.json` | Stage times from two `npm test`-equivalent runs, per-file medians from three isolated runs (with test and skip counts), and per-capture visual times with one worker |
| `flakes-before.json` | Repeat-run counts and every non-deterministic result |
| `coverage-map-before.json` | One row per command (146) with the Node, browser, and visual tests that reference it; one row per 2.2 audit contract with its tests |
| `break-checks.md` | Deliberate breaks in library source that confirm each proposed removal is still caught by a remaining test, and the checks repeated after the follow-ups |
| `timings-after.json` | The same measurements after the accepted findings were applied (2026-09-24) |
| `flakes-after.json` | Repeat-run counts after the follow-ups, the one visual failure, and a host audio problem seen during the work |
| `coverage-map-after.json` | The command rows recomputed on the final tree, and each contract's tests in their new suites |

The after files measure `4f57582` plus the follow-up changes, on the same machine and browsers.

## Measurement notes

- **Stage times** follow the stage order of `scripts/test.js all`. The orchestrator prints no
  times, so a script outside the repository ran the same commands and timed each one.
- **Per-file times** come from running each file alone with
  `node --test --test-concurrency=1`. Each file then pays its own Node start and browser launch,
  as it does inside a stage. Summed per stage, the browser files match the stage time within
  1%. The Node files sum to 11.4 s against a 9.6 s stage, because a stage starts its test
  runner once.
- **Visual per-capture times** use `--workers=1`, so the numbers don't include contention
  between workers. `npm test` uses Playwright's default of 8 workers on this machine.
- **Launch and build costs**, measured separately:

  | Item | Cost |
  | --- | --- |
  | Chromium launch and close | about 0.19 s |
  | WebKit launch and close | about 0.17 s |
  | Firefox launch and close | about 1.4 s |
  | In-memory esbuild bundle of `src/index-full.js` | 16–40 ms |

## Orphan baselines (TEST-001)

These are the 74 PNGs in `test/tests/screenshots/` that no fixture produced, 527,161 bytes in
total:

arc_01, arc_02, arc_03, bezier_01, blend_01, canvas_01, circle_01, circle_02, circle_03, cls_01,
drawImage_01, drawImage_02, drawSprite_01, drawSprite_02, draw_01, draw_02, ellipse_01,
ellipse_02, ellipse_03, filterImg_01, getPixel_01, getScreen_01, get_01,
graphics_advanced_comprehensive, inkey_01, input_01, input_02, input_03, keyboard_comprehensive,
line_01, line_02, loadFont_01, loadFont_02, offkey_01, offkey_02, offscreen_01, onkey_01,
palette_01, pens_01, pens_02, pens_03, point_01, pos_01, print_01–print_10, pset_01, put_01,
rect_01, rect_02, rect_03, resize_01, screen_01–screen_11, screen_comprehensive,
screen_comprehensive_02, screen_nocontainer, setScreen_01.

Most of their fixtures were removed by the October–November 2025 consolidations recorded in
`test/TEST-CONSOLIDATION-LOG.md`. The exceptions:
- `screen_comprehensive` became stale when its fixture was renamed `screen_comprehensive_01`.
- `screen_nocontainer` never had a fixture. It is byte-identical to
  `screen_comprehensive_02.png`.

The follow-ups removed all 74 (TEST-001).

## Follow-up results

All 28 findings were accepted and applied on 2026-09-24, on top of `4f57582`, in cleanup, harness,
move, removal, and speed-up order. The after measurements used the commands in the audit's
[Section 8](../../plans/v2.3/AUDIT-TESTS.md#8-validation) on the same machine. They are recorded
in `timings-after.json`, `flakes-after.json` and `coverage-map-after.json`.

### After metrics

| Stage | Before (s, two runs) | After (s, two runs) |
| --- | --- | --- |
| Test artifact build | 1.1, 0.9 | 0.9, 1.0 |
| Node tests | 9.6, 9.6 | 7.3, 7.0 |
| Browser regressions | 126.0, 125.8 | 101.6, 99.9 |
| Metadata and types | 6.5, 6.4 | 6.2, 6.3 |
| Visual full | 23.0, 20.9 | 12.0, 12.9 |
| Visual lite | 5.2, 5.2 | 4.5, 4.1 |
| Visual plugins | 4.1, 4.1 | 3.3, 3.3 |
| **Total** | **175.5, 172.8** | **135.7, 134.3** |

`npm test` is about **39 s (22%) faster**, against the estimate of 35 s:
- **Benchmark tests moved:** 16.3 s, as estimated.
- **Browser removals and merges:** about 11.6 s, against an estimate of 15 s. The moved
  `patch-browser` tests cost 1.5 s more than before (Notes and deviations, below).
- **Visual waits:** about 11 s at 8 workers, against an estimate of 4 s. Single-worker captures
  went from 88.5 s to 57.8 s across the three modes. The four pointer fixtures are now the only
  captures over 3 s.

| Count | Before | After |
| --- | --- | --- |
| Node tests in `npm test` | 421 | 400 |
| Browser tests in `npm test` | 695 (489 pass, 206 skip) | 612 (406 pass, 206 skip) |
| Visual captures (full, lite, plugins) | 37, 22, 9 | 35, 20, 8 |
| Approved baselines | 119 | 43 |
| Test files (`test/unit` and `test/scripts`) | 72 | 74 |
| Benchmark-harness tests (`npm run test:benchmark` only) | in `npm test` | 25 |

**Coverage.** Recomputing the command map loses no command's last reference. The unreferenced
and single-reference lists are the same as before, except that `setEnableContextMenu` is now
referenced from `pointer-browser`. Every SYS and COV contract still has a test. The map lists
the new homes, such as `ready.test.js` for SYS-002 and `screen-lifecycle-browser` for SYS-001.

**Flakes.** No Node or browser test failed in the measured runs. Each Node and browser file ran
5 times, and the benchmark files 9 times. Of 504 visual captures, one failed: `shaders_lifecycle`
under `--repeat-each=5` (Notes and deviations, below).

### Notes and deviations

- **TEST-022 and `shaders_lifecycle`.**
  - *What happened:* the faster waits exposed a bug in this fixture. Its approved baseline,
    last recorded on 2026-08-26, is a capture taken partway through its check sequence.
    Section 22's sampler shader declared `u_texture` without using it. Compilers strip an
    unused uniform, so `applyShader` threw `MISSING_U_TEXTURE` and ended the sequence on
    both software and GPU WebGL. The old waits usually captured just before that point.
  - *Changes:* the shader now samples `u_texture`. The fixture keeps its old capture timing
    through two new TOML options: `waitUntil = "networkidle"` and `renderWait = 100`.
  - *What is still open:* with the fix, the sequence runs to the end, and 7 of its checks fail:
    sampler contexts, automatic presentation after removal and failure, and shader disposal.
    Those checks, and a deterministic capture with a reviewed baseline, go to the core audit.
    Until then the fixture can still race under heavy parallel load (1 of its 16 measured runs).
- **TEST-028.** The limit is 120 s, not 60 s. Node applies `--test-timeout` to each test file's
  run as a whole as well as to each test, and the slowest file takes about 14 s. This mattered in
  practice: during the follow-up work, Firefox realtime audio failed on the host for about
  30 minutes. `audio-recording-realtime-browser` then failed at the limit, while the same file
  at `4f57582` hung until it was killed.
- **TEST-015.** The moved screen, sampler and noCss tests now run in both the full and the lite
  bundles, and fail on unexpected page errors. That added about 1.5 s, but covers the lite bundle
  for the first time. The pointer tests moved unchanged into `pointer-events.test.js` and
  `pointer-browser.test.js` for the pointer workstream (audit Section 5.2). The :256 test was
  split: its layout checks moved to `screen-lifecycle-browser` and its pointer checks to
  `pointer-browser`. The visual runner now checks `expectPatchResult = 132` for
  `shader_orientation_01`. `shader-orientation-checks.test.js` tests the shared corner checker
  in Node.
- **TEST-011.** The Node test asserts the real default point capacity: 7500, doubled to 15000.
- **TEST-021.** The retry changes `test/performance/benchmark/artifacts.js`, a runner file that
  campaign fingerprints hash. Campaigns recorded before this change have a different runner
  fingerprint.
- **TEST-027.** The `.gitignore` entries for `test/tests/logs/` and `test/tests/screenshots/new/`
  stay, because stale local copies of both folders can exist. Nothing writes them any more.
- **Break checks.** B13(c) and a new check for the moved duplicate-terminal-event test were run
  on the final tree (`break-checks.md`).
