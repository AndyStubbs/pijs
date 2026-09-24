# Pi.js 2.3 Test Audit

Status: All findings accepted; follow-ups complete (2026-09-24)
Plan: [UPGRADE-V2.3-PLAN.md](UPGRADE-V2.3-PLAN.md), Section 8
Evidence: [docs/evidence/tests-2.3/](../evidence/tests-2.3/README.md)

## 1. Summary

- **Revision:** `bd7bd70` (working tree at that commit, 2026-09-23).
- **Environment:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0, Playwright
  1.56.0 (Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0), esbuild 0.25.10.
- **Result at the revision:** `npm test` passes. It runs 421 Node tests, 695 browser tests
  (489 pass, 206 skip), 2 package-type tests, and 68 visual captures. It takes about
  **174 s**, of which the browser stage is **126 s** (72%).

The suite is sound: every command but eight has a test, no visual fixture is flaky, and the
2.2 regression contracts all still run. Its weight comes from four places:

1. **Browser tests of logic that Node already tests.** Most 2.2 audit contracts have a Node test
   of the module and a browser test of the public API. About 45 browser test cases repeat a
   Node test or another browser test without adding anything that needs a browser. The
   `ownership-reentrancy-*` and `numeric-boundaries-browser` suites repeat subject suites
   almost entirely.
2. **Suites organized by history.** `patch-lifecycle` and `patch-browser` hold 51 test cases
   from the 2.2 audit follow-ups. Some are the only coverage of their contract, and the rest
   repeat subject suites. `npm run test:patch` does not run them specifically.
3. **Tooling tests inside `npm test`.** The four benchmark-harness files take 16.3 s, more than
   any core browser file. `benchmark-browser` is the slowest file in the browser stage.
4. **Fixed waits in the visual runner.** Every capture waits for `networkidle` (at least
   500 ms) and then a fixed 100 ms. These waits are most of the time of a simple fixture. They
   cost little with 8 local workers but about 37 s with the single CI worker that
   `playwright.config.js` sets.

The audit also found:
- one flaky test (TEST-021);
- two regressions that would hang `npm test` instead of failing it, because the Node and
  browser stages have no test timeout (TEST-028);
- 74 orphan baselines (TEST-001).

**Estimated savings.** The accepted removals, merges and speed-ups in this report are
estimated to cut about **35 s (20%)** from a local `npm test`:
- browser removals and merges about 15 s;
- benchmark tests moved to their own command 16.3 s;
- visual waits about 4 s.

Estimates are per finding in Section 4 and are checked against the after metrics.

**Handoffs.** Items in areas another workstream is rewriting are handed to that workstream
(Section 5):
- the Firefox launches in the audio suites (about 20 s) go to sound;
- four near-duplicate pointer fixtures (24.5 s of single-worker time) go to pointer.

No test, fixture, baseline, or harness was changed by this audit.

## 2. Inventory and Before Metrics

### 2.1 Inventory

| Item | Count |
| --- | --- |
| `test/unit/` test files | 66 (35 browser, 31 Node), plus 10 helper modules |
| `test/scripts/` files | 14 (6 test files, 8 runners and tools) |
| Test files per `npm test` stage | Node 36, browser 35, types 1 |
| Visual fixtures | 46: 37 `html-core`, 9 `html-plugins`; 22 core fixtures also run in lite |
| Visual captures per `npm test` | 68 (full 37, lite 22, plugins 9) |
| Approved baselines | 119 PNGs; 45 used, 74 orphans |
| Manual pages, demos | 25 in `test/tests/html-manual/`, 13 in `test/demos/` |

### 2.2 Stage times

Wall-clock times of the `npm test` stages, run in sequence the way `scripts/test.js all` runs
them. There are two consecutive runs. The orchestrator prints no times, so a scratch script
mirrored its stages (Section 8).

| Stage | Run 1 (ms) | Run 2 (ms) | Share |
| --- | --- | --- | --- |
| Test artifact build | 1,050 | 866 | 1% |
| Node tests | 9,559 | 9,613 | 5% |
| Browser regressions | 126,018 | 125,766 | 72% |
| Metadata and types | 6,519 | 6,406 | 4% |
| Visual full | 22,975 | 20,888 | 12% |
| Visual lite | 5,203 | 5,178 | 3% |
| Visual plugins | 4,141 | 4,122 | 2% |
| **Total** | **175,465** | **172,839** | |

### 2.3 Time by owner

Each file was run alone three times, and the table uses the median. The browser rows add up to
the browser stage time within 1%. The Node rows add up to about 2 s more than the Node stage,
because each file run alone starts its own test runner.

| Stage | Owner | Files | Test cases | Skipped | Time (s) |
| --- | --- | --- | --- | --- | --- |
| Browser | core | 15 | 204 | 0 | 55.2 |
| Browser | sound | 15 | 463 | 206 | 51.3 |
| Browser | tooling | 3 | 14 | 0 | 16.3 |
| Browser | keyboard | 1 | 10 | 0 | 2.4 |
| Browser | gamepad | 1 | 4 | 0 | 1.1 |
| Node | core | 13 | 202 | 0 | 2.4 |
| Node | sound | 11 | 110 | 0 | 2.9 |
| Node | tooling | 10 | 71 | 0 | 5.7 |
| Node | keyboard, gamepad | 2 | 38 | 0 | 0.3 |
| Types | tooling | 1 | 2 | 0 | 6.2 |

All 206 skips are audio engine limits:
- 139 because Playwright's Windows WebKit has no Web Audio API;
- 67 because Firefox has no offline `suspend()`.

### 2.4 Slowest files

| File | Median (s) | Notes |
| --- | --- | --- |
| `benchmark-browser.test.js` | 13.7 | Two tests take 11.3 s: failure diagnostics and extra warm-up |
| `context-recovery-browser.test.js` | 12.6 | 52 cases at about 0.2 s each; 30 are loop variants |
| `batch-reservations-browser.test.js` | 8.4 | Full HD paint and put, 0.9–1.0 s each |
| `audio-stream-browser.test.js` | 8.3 | Realtime playback |
| `alpha-composition-browser.test.js` | 6.7 | Nested layers, 1.0 s per bundle |
| `package-types-consumer.test.js` | 6.2 | Two `tsc` consumers, each generating metadata again |
| `patch-browser.test.js` | 5.9 | The shader orientation page is loaded four times |
| `audio-recording-realtime-browser.test.js` | 5.4 | Realtime recording |
| `image-lifecycle-browser.test.js` | 4.1 | 24 cases |
| `audio-lifecycle-browser.test.js` | 3.7 | Three engines |

**Where the per-file cost goes:**
- The per-file floor is about 0.8 s: Node start, the Playwright import, and one Chromium launch.
- An in-memory esbuild bundle takes 16–40 ms, and a Chromium or WebKit launch about 0.2 s.
- A Firefox launch takes about 1.4 s.
- A browser test case costs about 0.13–0.2 s, mostly page setup.

### 2.5 Visual captures

With a single worker, a simple capture takes 0.75–0.85 s. Of that, 0.6 s is the fixed wait
(`networkidle` and 100 ms).

| Mode | Single worker (s) | 8 workers (s) | Longest captures (single worker, s) |
| --- | --- | --- | --- |
| full | 59.2 | 20.9–23.0 | onpress_02 6.8, ontouch_04 6.6, onpress_01 6.5, onmouse_03 4.5, keyboard_commands 3.4 |
| lite | 19.5 | 5.2 | paint_02 1.1, images_comprehensive 1.1, shaders_lifecycle 1.0 |
| plugins | 9.8 | 4.1 | onscreen_keyboard_01 1.4, onscreen_keyboard_02 1.2 |

The four pointer fixtures onpress_01, onpress_02, ontouch_04 and onmouse_03 take 24.5 s of
the 58 s single-worker full run.

### 2.6 Flaky tests

**Runs:**
- Each Node and browser file ran 6 times: one `npm test`, two stage runs, and three runs
  alone.
- Each visual fixture ran 9 times: one `npm test`, two stage runs, one single-worker run, and
  `--repeat-each=5`.

**Result:**
- One test failed once: `benchmark.test.js`, "campaign failures and resume preserve completed
  results", failed once in six runs with a Windows `EPERM` on an atomic rename (TEST-021).
- All 612 visual runs passed.

These runs cover Windows only. The CI/CD exploration's runs on Linux and macOS will add to this
list (plan Section 9).

## 3. Coverage Map

The full map is `coverage-map-before.json`.
- **Command rows:** every method in the 2.3 reference plus the plugin commands, 146 rows.
- **Contract rows:** the 28 findings of the 2.2 audit (SYS-001–023, COV-001–005), each with
  the tests that check it.

A test file counts toward a command when it calls the command or names it. Rows with zero or
one reference were confirmed by reading.

### 3.1 Commands by area

| Area | Commands | No test | One test |
| --- | --- | --- | --- |
| Core (colors, text, images, shaders, view, primitives, pixels, blending, effects, core, plugins, graphics) | 82 | 4 | 5 |
| Polygons and other optional plugins (polygons, print-table, pi-vision, onscreen-keyboard) | 5 | 0 | 2 |
| Sound and sound-advanced | 25 | 0 | 0 |
| Keyboard | 9 | 0 | 3 |
| Pointer | 17 | 1 | 3 |
| Gamepad | 6 | 3 | 1 |

**Commands with no test:**
- core: `blitImage`, `blitSprite`, `setDefaultAnchor`, `calcWidth`;
- pointer: `offtouch`;
- gamepad: `startGamepad`, `onGamepadConnected`, `onGamepadDisconnected`.

The only references to `calcWidth` and `blitImage` in tests are stubs. These gaps go to their
owners (Section 5).

**Commands covered only by one visual fixture:**
- `getDefaultPal`, `getShaderInfo`, `screenToView`, `setPrintSize`;
- `printTable` and the `vis` object.

Keyboard and pointer have more such commands, listed in Section 5. A single-reference row
blocks removal of its test, and no finding below removes one.

### 3.2 Contracts from the 2.2 audit

Every SYS and COV contract still has at least one test at the revision.

| Contract | Tests | Note |
| --- | --- | --- |
| SYS-001 active-screen removal | `patch-browser` only | Moves to a screen-lifecycle suite (TEST-015) |
| SYS-002 ready isolation | `patch-lifecycle`, `ownership-reentrancy-browser` | Node test is canonical (TEST-014) |
| SYS-005 pixel disposal | `patch-lifecycle`, `pixel-disposal-browser`, ownership pair | TEST-004, TEST-013, TEST-014 |
| SYS-009 late plugins | `plugin-installation-browser`, `plugin-services`, `patch-lifecycle`, `patch-browser` | TEST-014, TEST-015 |
| SYS-012 declarations | `package-types-consumer`, `validate-type-definitions.js` | Declaration side only; see Section 5.5 |
| SYS-013 ESM plugin registration | `polygons-bundles-browser`, `sound-advanced-bundles-browser` | Explicit `registerPlugin()` without `window.pi` is only type-checked |
| COV-003 numeric boundaries | `numeric-boundaries` pair | `pushView` and `setBlend` ranges exist only here; the Node file stays |
| COV-004 ownership and reentrancy | `ownership-reentrancy` pair | Covered by subject suites (TEST-004) |

The rest (SYS-003/004/006/007/008/010/011/014–022, COV-001/002/005) each have a subject suite or
fixture named after the contract. The JSON lists them.

### 3.3 Checking the map after the proposals

**Whole files the proposals delete:**
- `ownership-reentrancy-matrix`, `ownership-reentrancy-browser`, `numeric-boundaries-browser`;
- `errors_01`, `errors_02`, and the plugin copy of `polygon_01`.

Recomputing the map without them removes no command row's last reference. Section 6 checks
the test-level removals with deliberate breaks.

## 4. Findings

**Classes:** remove, merge, move, rename, speed up, or fix flake.

**Savings:**
- "Saves" is estimated `npm test` wall-clock time at 8 visual workers, from the measured
  per-test and per-file times in Section 2.
- A test case is one runtime `node:test` case, and loops count each variant.
- Line numbers are `test(` call sites at the revision.

### Baselines and fixtures

#### TEST-001 — remove — 74 orphan baselines

- **Location:** `test/tests/screenshots/`.
- **Problem:** 74 of the 119 PNGs have no fixture: `arc_01`–`03`, `print_01`–`10`,
  `screen_01`–`11`, `screen_comprehensive`, `screen_nocontainer` and others (full list in the
  evidence README). They total 527,161 bytes. The 2025 consolidations deleted their fixtures and
  left the PNGs. `screen_comprehensive` went stale in a rename, and `screen_nocontainer` never
  had a fixture.
- **Checked:** nothing reads them. The only references are the SHA manifests of old
  performance snapshots, the consolidation log, and naming examples (`loadFont_01`, `circle_01`)
  in comments and documentation.
- **Covering tests:** none needed. The fixtures that replaced them are listed in
  `test/TEST-CONSOLIDATION-LOG.md`.
- **Saves:** no time; 0.5 MB of tracked files.
- **Log entry:** removing them is logged in `TEST-CONSOLIDATION-LOG.md`.

#### TEST-002 — remove — Plugin copy of `polygon_01`

- **Location:** `test/tests/html-plugins/polygon_01.html`.
- **Problem:** it is identical to `html-core/polygon_01.html` except for its script tags: lite
  plus the polygons plugin instead of the full bundle. Both write the same baseline name, so
  they must render the same pixels.
- **Covering tests:**
  - pixels: core `polygon_01`;
  - lite plus plugin wiring for IIFE and ESM, minified and not: `polygons-bundles-browser`;
  - spans, winding and outline: `polygons.test.js`.
- **Saves:** one plugins capture (0.75 s of worker time); removes the shared-baseline collision.

#### TEST-003 — rename — `screen_overlaping.html`

- **Problem:**
  - The file name is misspelled.
  - The TOML still says `file = "view_01"` and the title says "View 01" from before a rename.
  - The page tests drawing an offscreen screen into another screen with `drawImage`.
- **Change:** rename the fixture and its baseline to one name, such as `screen_draw_offscreen_01`,
  and update the title. The pixels do not change, so the baseline needs no new review.
- **Saves:** no time.

#### TEST-024 — move — `errors_01` and `errors_02` fixtures

- **Problem:** each fixture prints the message of one thrown error and compares a screenshot.
  - `errors_01`: `$.draw()` with no screen gives `NO_ACTIVE_SCREEN`
    (`src/core/screen-manager.js:256`).
  - `errors_02`: `$.draw( 75 )` gives `INVALID_PARAMETER` (`src/api/draw.js:56`).
- **Gap:** no unit test asserts either code or message.
- **Change:** move both cases into a browser suite as assertions on code and message, for full
  and lite, and remove both fixtures and baselines.
- **Also:** the `errors_01` baseline shows a "there there" typo in the `NO_ACTIVE_SCREEN`
  message. That goes to the core audit (Section 5.5), so the new assertion should be written
  after that decision.
- **Saves:** 4 captures (about 0.4 s).

#### TEST-025 — remove — Dead code in `paint_02`

- **Problem:** `paint_02` imports `seedrandom` and calls `Math.seedrandom`, which has no effect
  (noise uses its own seed, `src/api/blends.js:170`). `paint_03` uses an implicit global `i`.
- **Keep both fixtures:** they are not duplicates. `paint_02` fills with noise off at tolerance
  0.3, and `paint_03` fills with noise on at 0.13.
- **Change:** remove the dead import and call. The rendering does not change.
- **Saves:** no time.

### Redundant tests in the 2.2 contract suites

#### TEST-004 — remove, move — The `ownership-reentrancy` pair (COV-004)

| Test | Covered by | Verdict |
| --- | --- | --- |
| matrix :193 image pending removal | `image-lifecycle.test.js:66`, which checks more, and `:226` (B4) | Remove |
| matrix :214 audio pending removal | `audio-lifecycle.test.js:80` | Handoff to sound (Section 5.1) |
| matrix :234 dispose during pixel read | `patch-lifecycle.test.js:94`, `pixel-disposal-browser.test.js:69` (B3) | Remove |
| matrix :245, :270 failed init, reentrant registration | `patch-lifecycle.test.js:383`, which checks more (B8) | Remove |
| browser :72 dispose during pixel read | `pixel-disposal-browser.test.js:69` (B3) | Remove |
| browser :92 throwing ready | `patch-lifecycle.test.js:260`, which checks more (B7) | Remove |
| browser :113 image reuse after pending removal | `image-lifecycle.test.js:226`, `image-lifecycle-browser.test.js:287`, `:331` (B4) | Remove |
| browser :126 shared-context child survives parent removal | None | Move to the screen-lifecycle browser suite (TEST-015) |

- **Also removed:** the matrix's `createReadyPluginHarness` loads `commands.js` and discards
  it (lines 94–104).
- **Result:** once :126 moves and sound decides on :214, both files are deleted.
- **Saves:** about 1.7 s (one browser file of 1.6 s, one Node file).

#### TEST-005 — merge — `numeric-boundaries-browser.test.js` (COV-003)

- **Problem:** its one test per bundle repeats the Node table through positional public calls.
  The only check the Node table lacks is a non-finite `rect` width. Break check B13(c)
  confirms this: breaking that validation is caught only by the browser file.
- **Change:**
  1. Add the `rect` width case to `numeric-boundaries.test.js:426`.
  2. Delete the browser file.
- **Covering tests:** `numeric-boundaries.test.js`. The public argument mapping is covered by
  `batch-reservations-browser` (pushView, paint, rect) and `arc-circle-browser` (arc).
- **Saves:** about 0.9 s.

#### TEST-006 — remove — `color-validation-browser.test.js:80` and a duplicate block (SYS-017)

- **Problem:**
  - The two overload variants of "setters preserve drawing and new-screen defaults" (4 cases)
    repeat `color-validation.test.js:50` and `:78` on the same module (B9).
  - The index-key block at lines 174–177 repeats `color-validation.test.js:70`.
- **Keep:**
  - :124, DOM background and fill validation (`INVALID_COLOR` is tested only there);
  - :153, CSS string parsing, which needs a real canvas.
- **Saves:** about 1.3 s.

#### TEST-007 — remove — `arc-circle-browser.test.js:126` and `:152` (SYS-015, SYS-016)

- **Tests:**
  - :126 repeats `arc-full-turn.test.js:26`, `:33` and `:44` in degrees (B10).
  - :152 checks translucent outlines. Its cause, unique points, is `circle-outline.test.js:11`,
    `:29` and `:41` (B11), and its alpha arithmetic is `alpha-composition-browser.test.js:279`.
- **Keep:**
  - :94, the public degree API with GPU equality;
  - :187, clipping across forced chunks.
- **Saves:** about 0.5 s.

#### TEST-008 — remove, merge — `font-publication-browser.test.js` (SYS-022)

- **Remove:** :213 "synchronous setup failures release readiness" (4 cases), which repeats
  `font-publication.test.js:114` with weaker assertions (B12).
- **Merge:** fold the positional and object variants of :165 and :243 into one test each per
  bundle. Both overloads stay in :165.
- **Saves:** about 1.0 s.

#### TEST-009 — remove, merge — `image-lifecycle-browser.test.js` (SYS-010)

- **Remove** (8 cases):
  - :209 "cancellation isolates replacements" (B4);
  - :240 "failed images removed and reused" (B4);
  - :263 "throwing reentrant events" (B5).

  Covering tests: `image-lifecycle.test.js:66`, `:92`, `:116`, `:226`, and the browser tests
  :287 and :331, which keep real decoding and replacement drawing. `image-lifecycle.test.js:226`
  must stay: it is the only Node test that catches a pending removal leaving the name
  registered (B4c).
- **Merge:** fold the four loader and overload variants of :109 into one looped test per bundle.
- **Saves:** about 1.7 s.

#### TEST-010 — remove — `alpha-composition-browser.test.js:122` (SYS-006)

- **Problem:** the two "composition through shared context" variants run the same probe and each
  asserts half of its result.
- **Covering tests:**
  - layered equals direct: :166, over 10 alpha cases and both paths (B14b);
  - cross-context copies: :335 (B14a). The layers in :166 share one context, so :335 must stay;
  - the absolute value: :197, :239 and :335.
- **Saves:** about 1.1 s.

#### TEST-011 — remove, merge — `batch-reservations-browser.test.js` (SYS-007)

- **Remove:** :248 "10000 unique points survive growth". Its behavior is
  `batch-reservations.test.js:258` (B16). The exact capacity of 15000 is asserted only here, so
  move that one assertion to the Node test first.
- **Merge:**
  - Full HD paint :197 and put :212 into one page per bundle;
  - the three modes of :262 into one test per bundle.
- **Saves:** about 1.5 s.

#### TEST-012 — remove, merge — `context-recovery-browser.test.js` (SYS-008)

- **Remove:** :105 "warm static textures preserve state and recover". The warm path is
  `static-texture-cache.test.js:98`, which checks the same call list and GL state (B15).
  Pending loss is :128, and re-upload after restore is browser :449.
- **Merge:**
  - the 9 operations of :243 into one looped test per bundle (18 cases, 3.6 s);
  - the 6 creation points of :493 into one test per bundle (12 cases, 2.1 s).

  Each still needs its own loss, but they can share a page and one setup.
- **Saves:** about 3.4 s.

#### TEST-013 — remove — `pixel-disposal-browser.test.js:93` and `:106` (SYS-005)

- **Problem:** both repeat Node tests that count calls exactly:
  - :93 repeats `patch-lifecycle.test.js:114` (disposal between readback and conversion, B1);
  - :106 repeats `patch-lifecycle.test.js:175` (filter lifetime, B2).
- **Keep:** :69 as the `removeScreen` integration check, and :131 and :160, which have no other
  coverage.
- **Saves:** about 0.5 s.

### Suites organized by history

#### TEST-014 — move — Split `patch-lifecycle.test.js`

The 27 cases move to subject suites. The pixel tests at :94 and :114 stay as Node tests
(TEST-013 removes their browser repeats).

| Tests | Destination |
| --- | --- |
| :94, :114, :127, :142, :162, :175, :211 (SYS-005, SYS-008 pixels and filters) | New `test/unit/pixels.test.js`, the Node partner of `pixel-disposal-browser` |
| :260, :299, :323, :352, :373 (SYS-002 ready) | New `test/unit/ready.test.js`; these are the only tests of DOM readiness, async callbacks and `INVALID_CALLBACK` |
| :383, :466 (plugin registry) | `plugin-services.test.js`, renamed `plugins.test.js` |
| :427, :450 (pointer shared events) | Handoff to pointer (Section 5.2) |

**Saves:** no time. The file name then describes its subject, and the `createPixelHarness` copy
in the ownership matrix goes with TEST-004.

#### TEST-015 — move, remove — Split `patch-browser.test.js`

**Remove** (6 cases, B6, B17):

| Test | Covered by |
| --- | --- |
| :25 shader source kinds | The visual `shader_orientation_01`, which loads the same page in full and lite, awaits `patchResult` and compares pixels |
| :36 "no requestFrame" variant | Nothing in `src/` reads `requestFrame`, so it takes the same path as :25 |
| :186 and :619 image callbacks | `image-lifecycle-browser.test.js:109` and `:331` |
| :432 noCss host styles | :256 and :666 |
| :445 custom sampler orientation | `shader_orientation_01` and `shaders_lifecycle` |

The visual runner does not check the value 132. Give it a check that `patchResult` equals the
fixture's expected count, so :25 loses nothing.

**Move:**

| Tests | Destination |
| --- | --- |
| :118, :144, :167 (SYS-001), :196, :324 with :418, :666, the layout part of :256; ownership :126 from TEST-004 | New `test/unit/screen-lifecycle-browser.test.js` |
| :478, :543, :640 (video, sampler caches, queued dynamic content) | New `test/unit/shader-samplers-browser.test.js` |
| :701 lite plugins with late real dependencies | `plugin-installation-browser.test.js` |
| :350 duplicate image terminal events | `image-lifecycle.test.js` (Node) |
| :36 "rounding" and "wrong corner" (checker self-tests) | A Node test of `checkPixel` in `test/tests/patch-shader-checks.js`, instead of reloading the video page twice |
| :83, :380, :469, the pointer part of :256 | Handoff to pointer (Section 5.2) |

The moved tests should use the shared `probe()` from TEST-018, which collects page errors and
runs both bundles. `patch-browser`'s own `probe()` loads only the full bundle and ignores page
errors.

**Saves:** about 2.7 s of redundant cases. The file becomes two, so the net saving is about
2 s.

#### TEST-016 — rename — The `test:patch` command

- **Problem:** `npm run test:patch` runs the test build, then every Node and browser test. It
  does not select the `patch-*` files, and none of those stages reads `build/`. The name is
  historical, and `test-workflow.test.js` does not test it.
- **Change:**
  1. Remove the command, since `test:unit` and `test:browser` cover it.
  2. Remove `patch` from `scripts/test.js` and the README.
- **Saves:** no time.

### Harness duplication

#### TEST-017 — remove — The `PI_ALPHA_VISUAL`, `PI_RASTER_VISUAL` and `PI_BATCH_VISUAL` blocks

- **Location:**
  - `alpha-composition-browser.test.js` 437–520;
  - `arc-circle-browser.test.js` 250–312;
  - `batch-reservations-browser.test.js` 340–431.
- **Problem:** each re-screenshots html-core fixtures against the approved baselines with the
  same tolerance as the visual runner, writing to `screenshots/new/`. `npm test` already covers
  all nine fixtures in full and lite. The runner is stricter: it honors `expectPageError` and
  fails on a false `patchResult`.
- **Other consumers:** the blocks are off by default. Their only consumer is the gitignored
  `test/performance/investigation/verify.js`.
- **Change:** remove the three blocks, their pngjs and TOML imports, and the `new/` output.
- **Saves:** no time; about 240 lines.

#### TEST-018 — merge — One browser probe and bundle helper

- **Duplicated code:**
  - 12 browser files copy the same esbuild block;
  - 13 files have their own `probe()` page loader and Chromium launch.
- **Change:**
  1. Add a `stdin` option to `browser-source-harness.buildSource` for the four files that expose
     renderer internals.
  2. Add one `probe( bundle, fn, options )` that collects page errors and loops over full and
     lite.
- **Saves:** little time, since a build takes 16–40 ms. The value is about 300 lines less and
  consistent page-error checks.

#### TEST-019 — merge — One Node `vm` module loader

- **Duplicated code:**
  - The import-stripping `vm` loader is written 12 times.
  - The `g_contextState` shim is copied 5 times.
  - `createPixelHarness`, the ready and plugin harnesses, and the image harness each exist twice.
- **Change:** move the loader and shim into one helper beside `rasterization-harness.js`. Do
  this before TEST-014, so the moved tests use it.
- **Saves:** no time.

### Speed and flakes

#### TEST-020 — move — Benchmark tooling tests out of `npm test`

- **Problem:** `benchmark.test.js`, `benchmark-diagnostics.test.js`,
  `benchmark-readiness.test.js` and `benchmark-browser.test.js` test the performance harness in
  `test/performance/benchmark/`, not the library. They take 16.3 s, and `benchmark-browser` is
  the slowest file in the browser stage.
- **Change:** run them only through `npm run test:benchmark`, which already selects them. Run
  that before performance campaigns and, once CI exists, on a schedule.
- **Needs a maintainer decision:** this narrows what `npm test` checks. Section 10 of the plan
  describes `npm test` as the correctness gate.
- **Saves:** about 16.3 s.

#### TEST-021 — fix flake — `benchmark.test.js` "campaign failures and resume…"

- **Symptom:** it failed once in six runs with `EPERM` renaming `manifest.json.tmp` to
  `manifest.json` (`test/performance/benchmark/artifacts.js:166`, `writeJson`).
- **Cause:** Windows can hold a new file briefly (indexing or antivirus), so an atomic rename
  can fail.
- **Change:** retry the rename a few times on `EPERM`, `EACCES` or `EBUSY` with a short delay.
  The fix belongs in the tool, not the test, since campaigns hit the same path.

#### TEST-022 — speed up — Visual runner waits

- **Location:** `test/scripts/run-visual-tests.js`: 774–777 (`networkidle`) and 807 (100 ms).
- **Problem:** every capture waits for `networkidle`, which settles only after 500 ms without
  requests, and then 100 ms more.
- **Change:**
  1. Load with `domcontentloaded`.
  2. Await `$.ready()`, which resolves when the page's resource waits are released.
  3. Wait for two animation frames before the screenshot.
  4. Keep `delay`, `DL` and the step waits, which fixtures rely on.
- **Check:** every capture must still match its baseline with no new baselines, in all three
  modes.
- **Saves:** about 0.55 s per capture. That is about 4 s locally, and about 37 s with the single
  worker `playwright.config.js` uses when `CI` is set.

#### TEST-023 — speed up — `package-types-consumer.test.js`

- **Problem:** each of its two tests calls `generateMetadata()` before type-checking. The
  metadata stage generates the same output just before this file runs.
- **Change:** generate once per file, in `before()`, and share the consumer package between the
  two tests.
- **Saves:** unmeasured, within the file's 6.2 s. Measure after the change.

#### TEST-028 — fix flake — No timeout on Node and browser test stages

- **Problem:** `scripts/test.js` runs `node --test` with no `--test-timeout`. The break checks
  found two regressions that make a browser test wait forever instead of failing (Section 6):
  - a ready wait that is never released hangs `patch-browser.test.js:619`;
  - a ready queue that aborts hangs `ownership-reentrancy-browser.test.js:92` in lite.

  `npm test` would then never finish, which matters most once CI runs it.
- **Change:** pass a per-test timeout to both stages, such as 60 s, matching the visual
  runner's test timeout. The slowest test case measured is 6.0 s. Give a test with a longer
  need its own `timeout` option.
- **Saves:** no time in a passing run. A hang becomes a failure that names the test.

### Manual pages and documentation

#### TEST-026 — remove, rename — Manual pages

- **Remove:**
  - `html-manual/temp.html`, an empty scratch page;
  - `html-manual/pi-vision-01.html`, an older, smaller copy of the automated `pi_vision_01`
    with the same baseline name.
- **Fix:** `html-manual/draw_01.html`, whose TOML says `file = "contextmenu_01"` and collides
  with `contextmenu_01.html`.

Manual pages about input and sound go to their workstreams (Section 5).

#### TEST-027 — rename — Stale test documentation and configuration

- **`test/README.md`:** says full mode has 36 fixtures; there are 37, and TEST-002 and TEST-024
  change the counts again. It should also describe the suite layout after TEST-014 and
  TEST-015, and drop `test:patch` (TEST-016).
- **`.gitignore`:** lines 11–12 name `test/tests-plugins/`, which does not exist.
- **Fixtures:** 9 carry `test = "screenshot.js"`, which the runner ignores.
- **`test/tests/logs/`:** gitignored and no longer written. The runner now writes logs under
  `test/test-results/<mode>/logs`.

## 5. Handoffs

Under plan Section 8.3, test changes in an area another workstream is rewriting go to that
workstream's roadmap. Coverage gaps go to their owner.

### 5.1 Sound

| Item | Detail |
| --- | --- |
| Firefox launches | Each audio suite launches its own Firefox, at about 1.4 s each (14 launches, about 20 s of the 51 s sound browser time). One engine process per stage, or a smaller Firefox subset in `npm test` with the full set in `test:firefox`, would cut most of it |
| Permanent skips | 206 skipped cases on Windows: 139 WebKit (no Web Audio API) and 67 Firefox (no offline `suspend()`). Skipping at the suite level when the engine lacks the API would keep the report readable; the launch itself is cheap (0.2 s) |
| COV-004 audio case | `ownership-reentrancy-matrix.test.js:214` repeats `audio-lifecycle.test.js:80` (retry timing). Remove it or move it with TEST-004 |
| Helper duplication | `near()` is defined in `sound-advanced`, `sound-envelope`, `sound-play`, and `sound-samples` Node tests |
| 2.2 references | `test/scripts/record-sound-references.js` and `test/media/sound-2.2/` record 2.2 sound behavior; the roadmap decides whether they are still needed |
| Node and browser pairs | The `sound-*` Node tests and `audio-*` browser tests pair up by module; the roadmap reviews them against the rule in plan Section 8.2 |

### 5.2 Pointer

| Item | Detail |
| --- | --- |
| Near-duplicate fixtures | `onpress_01`, `onpress_02`, and `ontouch_04` run identical command scripts (6.5–6.8 s each with one worker); `onmouse_03` is the same scenario without touch. `inmouse_01`, `intouch_01`, `inpress_01`, and `onmouse_01` repeat one X-drag at the same size. The first four take 24.5 s of single-worker time, the longest captures in the suite |
| `patch-*` pointer tests | `patch-lifecycle` :427, :450 (the latter repeats `pointer_lifecycle_01`); `patch-browser` :83 (repeats the visual run), :380, :469 (repeats :380), and the pointer part of :256 |
| Gaps | `offtouch` has no test; `offclick`, `offpress`, and `setEnableContextMenu` have one each |
| Manual pages | `ontouch_01`–`03` and `events_comprehensive` overlap the automated fixtures |

### 5.3 Keyboard

| Item | Detail |
| --- | --- |
| Waits | `keyboard_commands` spends 2.0 s in 35 `DL` commands |
| Node and browser pair | The SYS-003 browser tests in `keyboard-lifecycle-browser` repeat the Node test titles; the browser file needs to keep only real `KeyboardEvent` dispatch and cursor rendering |
| Gaps | `startKeyboard`, `stopKeyboard`, and `removeActionKeys` are covered only by `keyboard_commands` |
| Manual page | `html-manual/input_01` overlaps `keyboard_input` |

### 5.4 Gamepad

| Item | Detail |
| --- | --- |
| Node and browser pair | `gamepad-validation-browser` adds only bundle wiring to the Node test |
| Gaps | `startGamepad`, `onGamepadConnected`, and `onGamepadDisconnected` have no test; `stopGamepad` has one |

### 5.5 Core audit

| Item | Detail |
| --- | --- |
| Gaps | `blitImage`, `blitSprite`, `setDefaultAnchor`, and `calcWidth` have no test |
| Error message | The `NO_ACTIVE_SCREEN` message reads "there there" (`src/core/screen-manager.js:259`), and the `errors_01` baseline records it |
| SYS-012 | Declarations are checked against metadata and compiled by consumers, but nothing compares the declared command set with the runtime objects of each bundle |
| SYS-013 | Explicit `registerPlugin()` without `window.pi`, the documented alternative to ESM auto-registration, is only type-checked |
| Visual-only commands | `getDefaultPal`, `getShaderInfo`, `screenToView`, and `setPrintSize` are checked only by one fixture's pixels |
| Filter cleanup hook | Break check B2a: removing the `cancelFilter` pre-cleanup hook (`src/api/pixels.js:37`) changes nothing observable, because the per-pixel check at `:417` already stops the filter. The comment at `:391` says there is no per-pixel check. Either the hook or the check is redundant |

### 5.6 CI/CD exploration

- Flake data here is Windows-only (Section 2.6).
- With `CI` set, `playwright.config.js` uses one worker, so the visual waits in TEST-022 cost
  about 37 s there.

## 6. Break Checks

Each removal of a library test was checked by breaking the behavior in `src/` in a temporary
worktree and running the tests that remain. The full table is `break-checks.md` in the
evidence.

There were 28 breaks, covering 17 proposals, at the source locations listed in the evidence.

- **Safe (26):** a remaining test failed. For B4c, only `image-lifecycle.test.js:226` and the
  kept browser image tests failed. For B14a, only `alpha-composition-browser.test.js:335`
  failed. Both are named as covering tests above.
- **Not safe until merged (1), B13(c):** a non-finite `rect` width is caught only by
  `numeric-boundaries-browser`. TEST-005 adds the case to the Node table before the file is
  deleted.
- **Inconclusive (1), B2a:** no test fails when the filter pre-cleanup hook is not registered.
  The per-pixel disposal check in `src/api/pixels.js:417` already stops the filter, so the hook
  may be redundant code. It goes to the core audit (Section 5.5). No removal depends on it.

Two breaks also showed that a regression can make a test hang instead of fail:
- B6 hangs `patch-browser.test.js:619`;
- B7 hangs the lite variant of `ownership-reentrancy-browser.test.js:92`.

`scripts/test.js` sets no test timeout, so `npm test` would never finish (TEST-028).

## 7. Structure

- **Node and browser split:** the split by file suffix works. After this audit it should also
  follow the plan's rule: logic in the Node file, and only what needs a browser in the browser
  file. TEST-005 to TEST-013 apply it to the 2.2 contract suites.
- **History names:** `patch-*`, `ownership-reentrancy-*`, `numeric-boundaries-browser` and
  `test:patch` disappear under TEST-004, TEST-005 and TEST-014 to TEST-016.
  `numeric-boundaries.test.js` stays; it is the only home of the view and blend range tables
  and is named for its subject.
- **Tooling tests:** `npm test` runs tests of the build, release copy, size report, metadata,
  test workflow, visual report and performance report scripts, plus the benchmark harness.
  All but the benchmark harness are fast (under 1.5 s each) and guard release steps, so they
  stay. The benchmark harness moves (TEST-020).
- **`test/README.md`:** should describe the suites by subject after the moves, state the rule
  above, and name the commands that remain (TEST-027).

## 8. Validation

**Method:**
- The scripts used for the measurements are scratch tools and are not in the repository. The
  commands below reproduce the after metrics on the same machine class.
- Break checks ran in a temporary worktree that was removed afterward.
- The working tree was not changed.

| Measurement | Command |
| --- | --- |
| Correctness | `npm test` (passed at `bd7bd70`) |
| Stage times | The seven stages of `scripts/test.js all`, each timed in sequence: `node scripts/build.js --test-only`; `node --test --test-concurrency=1` on the Node group, then the browser group; the four metadata and types commands; and Playwright per mode inside `withTestServer`, with `PI_TEST_STRICT=true` |
| Per-file times and counts | `node --test --test-concurrency=1 --test-reporter=junit --test-reporter-destination=<file>.xml <file>` for every file of each group, three times |
| Visual per-capture times | `PLAYWRIGHT_JSON_OUTPUT_NAME=<mode>.json node scripts/test.js visual --mode=<mode> --workers=1 --reporter=json` |
| Visual flakes | The same command with `--repeat-each=5` instead of `--workers=1` |
| Coverage map | Every method in `build/reference-2.3.json` and `metadata/plugin-*/`, searched in `test/unit`, `test/scripts`, and the fixtures |

## 9. Recommended Order

1. **Cleanups with no coverage risk:** TEST-001, TEST-003, TEST-017, TEST-021, TEST-025,
   TEST-026, TEST-027, TEST-028.
2. **Shared harnesses:** TEST-019, then TEST-018, so the moved tests land on them.
3. **Moves:** TEST-014, TEST-015, then TEST-004 (after sound decides on the audio case).
4. **Removals and merges:** TEST-005 to TEST-013, TEST-002, TEST-024.
5. **Speed-ups:** TEST-022, with a full baseline check in all modes; TEST-023; and TEST-020 if
   accepted.
6. Record the after metrics with the commands in Section 8, and add the removals to
   `test/TEST-CONSOLIDATION-LOG.md`.

Each step ends with `npm test` green. No baseline is re-recorded except where a merged fixture
needs one (none are proposed).

## 10. Follow-up

**Decision:** accepted, rejected, or deferred, recorded by the maintainer.
**After:** the measured result once the item is done.

| ID | Class | Summary | Estimated saving | Decision | After |
| --- | --- | --- | --- | --- | --- |
| TEST-001 | remove | 74 orphan baselines | 0.5 MB | Accepted | 74 PNGs (527,161 bytes) removed; 43 baselines remain, all used |
| TEST-002 | remove | Plugin copy of `polygon_01` | 0.75 s worker time | Accepted | Removed; plugins mode has 8 fixtures |
| TEST-003 | rename | `screen_overlaping` → one fixture and baseline name | — | Accepted | Fixture and baseline renamed `screen_draw_offscreen_01` |
| TEST-004 | remove, move | `ownership-reentrancy` pair | 1.7 s | Accepted; the audio case (:214) is removed, as it repeats `audio-lifecycle.test.js:80` | Both files deleted; the shared-context child test moved to `screen-lifecycle-browser` (−1.7 s) |
| TEST-005 | merge | `numeric-boundaries-browser` into the Node table | 0.9 s | Accepted | `rect` width and height cases added; B13(c) now fails the Node test; browser file deleted (−0.9 s) |
| TEST-006 | remove | `color-validation-browser` :80, lines 174–177 | 1.3 s | Accepted | 8 → 4 cases; 2.3 → 1.2 s |
| TEST-007 | remove | `arc-circle-browser` :126, :152 | 0.5 s | Accepted | 8 → 4 cases; 1.9 → 1.4 s |
| TEST-008 | remove, merge | `font-publication-browser` :213, overload variants | 1.0 s | Accepted | 14 → 6 cases; 2.8 → 2.2 s |
| TEST-009 | remove, merge | `image-lifecycle-browser` :209, :240, :263, :109 | 1.7 s | Accepted | 24 → 10 cases; 4.1 → 2.4 s |
| TEST-010 | remove | `alpha-composition-browser` :122 | 1.1 s | Accepted | 19 → 15 cases; 6.7 → 5.7 s |
| TEST-011 | remove, merge | `batch-reservations-browser` :248, :197/:212, :262 | 1.5 s | Accepted | 18 → 10 cases; 8.4 → 7.5 s; the 15000 capacity check moved to the Node test |
| TEST-012 | remove, merge | `context-recovery-browser` :105, :243, :493 | 3.4 s | Accepted | 52 → 24 cases; 12.6 → 9.7 s |
| TEST-013 | remove | `pixel-disposal-browser` :93, :106 | 0.5 s | Accepted | 10 → 6 cases; 2.0 → 1.5 s |
| TEST-014 | move | Split `patch-lifecycle` | — | Accepted | Split into `pixels.test.js`, `ready.test.js`, `plugins.test.js` and the pointer-owned `pointer-events.test.js` |
| TEST-015 | move, remove | Split `patch-browser` | 2 s | Accepted | Split into `screen-lifecycle-browser`, `shader-samplers-browser` and the pointer-owned `pointer-browser`; 5.9 → 7.4 s, because the moved tests now also run the lite bundle (Section 11.2) |
| TEST-016 | rename | Remove `test:patch` | — | Accepted | Removed |
| TEST-017 | remove | Env-gated visual blocks | — | Accepted | Removed (257 lines) |
| TEST-018 | merge | Shared browser probe and bundle helper | small | Accepted | `useBrowserBundles()` in `browser-source-harness.js`; 10 suites converted |
| TEST-019 | merge | Shared Node `vm` loader | — | Accepted | `vm-module-harness.js`; 11 private loaders replaced |
| TEST-020 | move | Benchmark tests to `test:benchmark` | 16.3 s | Accepted; `npm test` no longer runs the benchmark harness | 4 files, 25 tests, 16.2 s moved to `test:benchmark` |
| TEST-021 | fix flake | Retry the benchmark manifest rename on Windows | — | Accepted | No failure in 9 runs of the four files |
| TEST-022 | speed up | Visual runner waits | 4 s (37 s at one worker) | Accepted, with one fixture exception (Section 11.2) | Visual stages 31.3 → 20.0 s; single-worker captures 88.5 → 57.8 s |
| TEST-023 | speed up | Generate package metadata once | unmeasured | Accepted | 6.2 → 6.0 s; `tsc` dominates |
| TEST-024 | move | `errors_01`/`errors_02` to assertions | 0.4 s | Accepted; the "there there" message typo is fixed first | Message fixed; both errors asserted in `screen-lifecycle-browser`; fixtures and baselines removed |
| TEST-025 | remove | Dead code in `paint_02` | — | Accepted | Done |
| TEST-026 | remove, rename | Manual pages | — | Accepted | Done |
| TEST-027 | rename | Stale test documentation and configuration | — | Accepted | Done |
| TEST-028 | fix flake | Test timeout for Node and browser stages | — | Accepted, with a 120 s limit (Section 11.2) | 120 s limit; an audio hang at `4f57582` would now fail by name (Section 11.2) |

After metrics are in Section 11.

## 11. Follow-up Results

All 28 findings were accepted and applied on 2026-09-24, on top of `4f57582`, in the order of
Section 9. The after measurements used the commands in Section 8 on the same machine. They are
recorded in `timings-after.json`, `flakes-after.json` and `coverage-map-after.json` in the
evidence folder.

### 11.1 After metrics

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
  `patch-browser` tests cost 1.5 s more than before (Section 11.2).
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
under `--repeat-each=5` (Section 11.2).

### 11.2 Notes and deviations

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
  `pointer-browser.test.js` for the pointer roadmap (Section 5.2). The :256 test was split:
  its layout checks moved to `screen-lifecycle-browser` and its pointer checks to
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
