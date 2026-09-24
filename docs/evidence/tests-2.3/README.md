# Tests 2.3 Evidence

This folder holds measurements and checks for the 2.3 test audit
([TESTS-V2.3-AUDIT.md](../../plans/TESTS-V2.3-AUDIT.md)). It records:
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
