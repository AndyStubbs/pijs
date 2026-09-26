# Pi.js 2.3 CI/CD and Cross-Platform Exploration

Status: Exploration complete (E1–E7) and reviewed 2026-09-26. Every recommendation was
accepted (Sections 8 and 9), and the accepted items are scheduled in
[CI-V2.3-ROADMAP.md](CI-V2.3-ROADMAP.md).
Revision: `48bb54f`
Plan: [UPGRADE-V2.3-PLAN.md](UPGRADE-V2.3-PLAN.md), Section 9
Evidence: [`docs/evidence/ci-2.3/`](../evidence/ci-2.3/README.md)

## 1. Summary

The exploration asks what it takes for `npm test` to pass on Linux, macOS, and Windows, and how
continuous integration and release automation should run it. It records findings and
recommendations and does not change code, tests, or baselines. Accepted items become
`CI-V2.3-ROADMAP.md`.

It ran `npm test` and the Firefox check in five environments:

- the maintainer's Windows machine;
- Ubuntu under WSL on the same machine;
- GitHub-hosted `ubuntu-24.04`, `windows-2025`, and `macos-15` runners (run
  [36212469703](https://github.com/AndyStubbs/pijs/actions/runs/36212469703)), and again for
  Firefox WebGL (E7, run
  [36214772060](https://github.com/AndyStubbs/pijs/actions/runs/36214772060)).

Findings:

- **Linux and Windows can share one baseline set. macOS cannot.**
  - Playwright's headless Chromium renders WebGL with SwiftShader everywhere, even on the
    maintainer's GPU machine, so the approved baselines are software renders.
  - Linux and Windows runner captures are byte-identical to the local Windows captures, except
    for timing-sensitive input fixtures and one fixture that shows system-font text.
  - macOS's Chromium uses a different SwiftShader backend (LLVM instead of Subzero).
    `paint_02` and `paint_03` differ from Windows by 0.13% and 0.22% of pixels, above the 0.1%
    limit, whichever flags are used (Q2).
- **The renderer flags matter.** `--disable-gpu --enable-unsafe-swiftshader` reproduces
  today's renders. `--use-angle=swiftshader` changes the compositing of CSS-scaled canvases and
  fails `renderer_comprehensive` (CI-003).
- **WebKit has Web Audio on Linux and macOS.** 139 WebKit audio tests that skip on Windows run
  there. They fail only because `test/unit/audio-tolerances.js` has no WebKit values. With
  Chromium's values, all 95 WebKit render tests pass on both platforms, and WebKit's residuals
  match Chromium's precision (CI-011).
- **Realtime audio cannot run cleanly on any hosted runner.** Every runner arrangement tried
  failed some realtime tests:
  - no audio device: Firefox fails;
  - PulseAudio null sink on Linux: Chromium's audio clock stalls;
  - macOS's virtual device: two Firefox position checks miss their timing limit.

  The two realtime suites belong outside the CI gate (CI-005).
- **Firefox has no WebGL2 by default on the Linux and Windows runners.** Every `test:firefox`
  check fails there. E7 found a fix for each, and with it the check passes on all three
  runners (CI-012):
  - **Windows:** the `webgl.force-enabled` preference gives WebGL2 through WARP, Windows'
    software rasterizer.
  - **Linux:** headless Firefox fails with every preference tried. Headed Firefox under Xvfb
    renders with Mesa's llvmpipe.
- **Release builds depend on the checkout's line endings.** Four shader sources are CRLF in a
  Windows checkout, and esbuild embeds the `\r` characters. `pi.min.js` is 134 bytes larger
  when built on the maintainer's machine and 304 bytes larger on the Windows runner than on
  Linux or macOS (CI-007).
- **The rest is portable.** The test runner, server, metadata, types, and Node tests pass
  everywhere. Two files have lowercase names in git (CI-001), and the publish guide's `xcopy`
  step is Windows-only (CI-002).
- **Cost and time are not constraints.** Hosted runners are free for this public repository,
  including macOS. With the fixes, a pull-request job should take about 5–7 minutes.

Recommendations in brief:

- **Provider:** GitHub Actions.
- **Baselines (G4):** one baseline set with pinned SwiftShader flags, compared pixel for pixel
  on Linux and Windows. macOS runs the assertion tests, and its pixel results are reported
  without failing the run.
- **Realtime audio:** the realtime suites run locally and in a report-only nightly job, not in
  the CI gate.
- **When CI runs:** Linux and Windows on every pull request; macOS on `main` and nightly.
- **Release:** verification on tags, with `npm publish` kept manual for 2.3.0.

## 2. Results

### 2.1 Environments

| Environment | CPUs | Checkout | Audio output | Notes |
| --- | --- | --- | --- | --- |
| Windows 11 (maintainer) | 16 | `core.autocrlf=true`, 271 CRLF files | Hardware | Node 22.19.0, NVIDIA GTX 980 |
| Ubuntu 24.04.1, WSL 2 (E1) | 16 | Fresh clone, LF | WSLg PulseAudio server | Node 22.23.3; `playwright install-deps` |
| `ubuntu-24.04` runner | 4 | LF | None | Image 20260920.314.1 |
| `windows-2025` runner | 4 | `core.autocrlf=true`, 235 CRLF files | No sound device (audio service running) | Image 20260922.246.2 |
| `macos-15` runner | 3 (ARM64) | LF | Apple Virtual Sound Device | Image 20260907.0337.1 |

All five use Playwright 1.56.0 with Chromium 141.0.7390.37, Firefox 142.0.1, and WebKit 26.0.

### 2.2 Results per environment

| Check | Windows local | Linux (WSL) | Linux runner | Windows runner | macOS runner |
| --- | --- | --- | --- | --- | --- |
| Node tests (400) | Pass | Pass | Pass | Pass | Pass |
| Metadata and types | Pass | Pass | Pass | Pass | Pass |
| Browser regressions: pass / fail / skip | 406 / 0 / 206 | 505 / 40 / 67 | 496 / 47 / 67 | 396 / 8 / 206 | 503 / 42 / 67 |
| WebKit tolerance failures | — (no Web Audio) | 40 | 40 | — (no Web Audio) | 40 |
| Realtime audio failures | 0 | 0 | Firefox stream 5; recording file timed out | Firefox stream 5; recording file timed out | Firefox stream 2 (timing) |
| Other browser failures | 0 | 0 | 0 | 1: `visual-report-browser` click race | 0 |
| Visual full / lite / plugins | Pass | Plugins: `pointer_lifecycle_01` | Plugins: `pointer_lifecycle_01`. Full: timing failures in some runs (1 flaky with `CI`, 1 of 35 without, 2 of 105 in repeats) | Pass, including 3 repeats | Full: `paint_02`, `paint_03`, and timing fixtures |
| `npm run test:firefox` | Pass (test audit) | Pass | Fail: no WebGL2. Pass headed under Xvfb (E7) | Fail: no WebGL2. Pass with `webgl.force-enabled` (E7) | Pass |
| Chromium WebGL | SwiftShader Subzero | SwiftShader Subzero | SwiftShader Subzero | SwiftShader Subzero | SwiftShader LLVM |
| Firefox WebGL | Hardware (D3D11) | llvmpipe | None headless; llvmpipe headed under Xvfb | WARP with `webgl.force-enabled`; WebGL1 only by default | Apple M1 (virtual) |
| WebKit Web Audio | No | Yes, with offline `suspend()` | Yes | No | Yes |
| `pi.min.js` bytes | 208,078 | 207,944 | 207,944 | 208,248 | 207,944 |

The skip counts follow engine capability. Windows WebKit has no Web Audio (139 skips), and
Firefox has no offline `suspend()` (67 skips everywhere). WebKit on Linux and macOS skips
nothing. On Linux and Windows runners, the browser-test count is 611, not 612, because the
realtime recording file stopped at its 120 s limit.

### 2.3 Visual captures

A pixel counts as different when its RGB channel differences sum to more than 6. A capture
fails when more than 0.1% of its pixels differ.

**Against the approved baselines.** Local Windows, WSL, and both X64 runners show the same
drift: 11 captures differ within tolerance, with identical pixel counts on every one of those
platforms (`windows-pixels.json`, `linux-pixels.json`, `runners.json`). `paint_03` uses 81% of
its failure budget. The baselines predate recent browser updates, and CI-009 re-records them.

| Capture | Changed pixels | Over tolerance |
| --- | --- | --- |
| `paint_02` | 17,025 | 0.018% |
| `paint_03` | 13,907 | 0.081% |
| `parameters_01` | 556 | 0 |
| `keyboard_input` | 146 | 0.048% |
| `onscreen_keyboard_01` | 69 | 0.062% |
| `draw_comprehensive` | 2 | 0.001% |
| `keyboard_commands`, `inpress_01`, `intouch_01` | Varies by run | Up to 0.13% (timing) |

**Against the local Windows captures of the same revision, byte for byte:**

| Environment | Identical | Different |
| --- | --- | --- |
| Windows local, second run | 69 of 70 | `keyboard_commands` (timing) |
| Windows runner | 61 of 63 | `inpress_01`, `keyboard_commands` (timing) |
| Linux (WSL) | 61 of 63 | `keyboard_commands` (timing), `pointer_lifecycle_01` (font: 8.08% over tolerance) |
| Linux runner | 59 of 63 | `inpress_01`, `intouch_01`, `keyboard_commands` (timing), `pointer_lifecycle_01` (font) |
| macOS runner (full only) | 28 of 35 | Renderer: `paint_02` (0.127%), `paint_03` (0.217%), `parameters_01`, `renderer_comprehensive`, `set_01` (within tolerance). Timing: `inpress_01`, `keyboard_commands` |

The macOS visual stages stopped after the full suite failed, so lite and plugins were not
captured there.

**Renderer flags** (`linux-renderer-flags.json`, runner `flags-*` comparisons):

- **Same captures as the default launch on Linux, WSL, and Windows:** `--enable-unsafe-swiftshader`,
  `--disable-gpu`, or both. Only the timing fixtures differ.
- **Changed captures:** `--use-angle=swiftshader`, with or without `--enable-unsafe-swiftshader`.
  It changes `print_comprehensive` and `renderer_comprehensive` on every platform, and
  `renderer_comprehensive` fails (0.12%).
- **macOS:** no flag set removes the `paint_02` and `paint_03` differences. In the
  `--disable-gpu` run, `shaders_lifecycle` also differed by 11%. That fixture is a known flake
  (TEST audit), and this was a single run.

### 2.4 Audio

**WebKit renders (E6, `linux-webkit-audio.json`, `runners.json`).** The runner scripts gave
WebKit another engine's tolerances in a scratch copy of the test tree, then ran the 8 render
suites. The tolerance file in the repository was not changed.

| Environment | With Firefox's tolerances | With Chromium's tolerances | Valid stop residual, max |
| --- | --- | --- | --- |
| Linux (WSL) | 95 of 95 | 95 of 95 | 2.90e-7 |
| Linux runner | 95 of 95 | 95 of 95 | 2.90e-7 |
| macOS runner | 95 of 95 | 95 of 95 | 2.87e-7 |

For comparison, the maximum valid stop residual is 2.8e-7 for Chromium and 7.6e-3 for Firefox.
The abrupt fixtures keep the same separation. WebKit multi-voice mixes passed Firefox's
`mixDeterminism` of 0 in these trials, but repeated runs in task 2.4 differ by 4.9e-7 in about
a third of page loads, as Chromium's do (`webkit-mix-determinism.json`).

**Realtime audio (E3).** `audio-stream-browser` and `audio-recording-realtime-browser` play
through a real `AudioContext`:

| Environment | Chromium | Firefox |
| --- | --- | --- |
| Maintainer's Windows, WSL | Pass | Pass |
| Linux or Windows runner, no device | Pass | 5 of 6 stream tests fail. The recording does not decode, and the file then runs to its 120 s limit |
| Linux runner, PulseAudio null sink | Recording: the context advanced 0.012 s. Stream: element at 0.5 s, expected 0.90 s | Pass |
| macOS runner, virtual device | Pass | 2 of 6 stream tests fail: the element was at 1.745 s, expected 1.947 s, outside the 120 ms limit |

### 2.5 Timings

**Per-stage wall time on the runners, in seconds** (`runners.json`). The job took 9.3 minutes
on Linux, 11.4 on Windows, and 12.2 on macOS, including all the exploration repeats.

| Stage | Linux | Windows | macOS |
| --- | --- | --- | --- |
| `npm ci` | 5 | 6 | 2 |
| Browser download (Linux: with system libraries) | 63 | 25 | 31 |
| Node tests | 5 | 11 | 10 |
| Browser regressions | 229 | 292 | 177 |
| Metadata and types | 7 | 13 | 7 |
| Visuals with `CI` (1 worker, 2 retries) | 48 | 60 | 74 (full only) |
| Visuals without `CI` (default workers) | 23 (full only) | 46 | 58 (full only) |

Two things inflate the browser stage on the Linux and Windows runners:

- the realtime recording file runs to its 120 s timeout;
- the Firefox stream tests wait on media events.

Without the realtime suites, the stage would take about 100–160 s.

**Estimated pull-request job,** with CI-005 and CI-006 applied: setup about 1.5 minutes, then
`npm test` in 3–4 minutes on Linux and 4–5 minutes on Windows.

### 2.6 Static portability scan

| Area | Result |
| --- | --- |
| Name case (`paths.json`) | 2 of 991 tracked files have names in git that differ from the Windows tree and the documents: `releases/publish.md` (CORE-019) and `docs/gamepad.md`. A Linux clone gets the lowercase names. No code, fixture, or test reference depends on case (6,218 checked) |
| Test runner | `scripts/test.js` spawns `process.execPath` with `shell: false`. The test server listens on `127.0.0.1` on port 0. It ran unchanged on all five environments |
| Line endings | The git index is LF. `.gitattributes` forces LF only for `*.toml`, `*.js`, `*.json`, and `*.ts`. With `core.autocrlf=true`, which is the Windows runner's default, the shader files (`*.vert`, `*.frag`) and 230 others are checked out as CRLF. esbuild's text loader embeds the `\r` characters in the build |
| Browser launch flags | Chromium is launched in about 10 places (`test/unit/*-browser.test.js`, `browser-source-harness.js`, `audio-engines.js`, and `playwright.config.js`), none with renderer flags |
| System-font text | Only `pointer_lifecycle_01` shows DOM text in a capture. The four fixtures with native buttons hide them with `opacity: 0` |
| CI settings | With `CI` set, `playwright.config.js` uses 2 retries and 1 worker. Visuals take 1.3–2.1 times as long, and the retries hide flakes, against the plan's rule |
| Node versions | `engines` is `>=18.0.0`. Node 18 and Node 20 are past end of life |

## 3. Classified Differences

| Class | Finding | Fix |
| --- | --- | --- |
| Rendering | Chromium: identical on Linux and Windows. macOS uses SwiftShader's LLVM backend, and 2 fixtures exceed tolerance. Firefox: no WebGL2 by default on GPU-less Linux and Windows runners. It gets WebGL2 through WARP on Windows, and through llvmpipe when headed under Xvfb on Linux | CI-003, G4 (macOS report-only), CI-012 |
| Text rendering | `pointer_lifecycle_01` only | CI-004 |
| Timing | `inpress_01`, `intouch_01`, and `keyboard_commands` vary between runs within tolerance, except `inpress_01` on macOS (0.12%). `shaders_lifecycle` is a known flake. The `visual-report-browser` modal test races on the Windows runner. Firefox realtime positions lag on macOS | CI-008, CI-013, CI-005 |
| File system | The two lowercase names | CI-001 |
| Line endings | Build output depends on the checkout | CI-007 |
| Process handling | None | — |
| System dependencies | Linux needs Playwright's libraries. The runner installed them in 63 s with `--with-deps` | Pipeline (Section 6) |
| Browser capability | WebKit Web Audio on Linux and macOS: 139 more tests, which need WebKit tolerances | CI-011 |
| Audio output | No runner arrangement passes both engines' realtime tests | CI-005 |

## 4. Exploration Steps

| # | Step | Result |
| --- | --- | --- |
| E1 | Linux locally, in WSL, from a fresh clone | Done 2026-09-25 (Sections 2.2–2.4) |
| E2 | All three platforms on hosted runners. The throwaway branch `ci-exploration` runs every stage timed, without stopping on failures. A final job commits the raw results to `ci-exploration-results` | Done 2026-09-26, run 36212469703. Both branches are deleted once this report is reviewed |
| E3 | Realtime audio with no device, with a PulseAudio null sink, and with macOS's virtual device | Done (Section 2.4) |
| E4 | Renderer flag sets compared with the default launch | Done locally (8 flag sets) and on each runner (2 flag sets) |
| E5 | Analysis | This document |
| E6 | WebKit audio with borrowed tolerances and calibration output | Done on WSL, the Linux runner, and the macOS runner |
| E7 | Firefox WebGL on runners. Eight preference and environment sets were tried on each runner; on Linux, again after adding Mesa's EGL packages, both headless and headed under Xvfb. The first set that worked then ran the real Firefox check (`runners-e7.json`) | Done 2026-09-26, run 36214772060. The check passes on all three runners: with `webgl.force-enabled` on Windows, headed under Xvfb on Linux, and unchanged on macOS. Headless Linux fails with every set. `webgl.out-of-process: false` crashes the page on Windows |

## 5. Questions and Recommendations

### Q1. What differs across platforms?

Recorded in Sections 2 and 3. The library and its build tooling behave the same everywhere.
All differences come from the test environment:

- the renderer backend on macOS;
- one fixture that shows system fonts;
- the WebKit tolerances that were never calibrated;
- Firefox's WebGL on GPU-less runners;
- realtime audio devices;
- line endings in the build input;
- timing on slower machines.

### Q2. How should visual comparison work across platforms?

| Option | Risk of false passes | Baseline maintenance | Assessment |
| --- | --- | --- | --- |
| A. Pinned SwiftShader, one baseline set | Low. Same tolerance as today | One set | **Recommended for Linux and Windows.** Their captures are byte-identical apart from timing and the font fixture |
| B. One baseline set per platform | Low | A macOS set that can only be recorded and reviewed from CI artifacts. Every intended change is reviewed twice | Not recommended. It costs a second review for two fixtures |
| C. Pixels on the reference platforms, assertions elsewhere | Medium on the excluded platform | One set | **Recommended for macOS.** Its pixel results are reported but do not fail the run |
| D. Per-fixture tolerances | High | One set plus tuned numbers | Not recommended. `paint_03` would need 0.25%, which weakens a fill-accuracy fixture on every platform |

**Recommendation (G4):**

- **Linux and Windows:** Option A. Pin `--disable-gpu --enable-unsafe-swiftshader` wherever
  Chromium is launched (CI-003). The suite then chooses the renderer, rather than Chromium's
  automatic fallback, which Chromium is removing. The flags reproduce today's captures on both
  platforms. Do not use `--use-angle=swiftshader`.
- **macOS:** Option C. The runner still runs every visual fixture, so page errors and patch
  checks fail the run. Pixel mismatches are listed in the job summary without failing it.
- **Re-recording (CI-009):** re-record once, after CI-003, as one reviewed task before input
  roadmap implementation starts. That removes the drift in Section 2.3. It does not remove the
  macOS difference, which is measured against current renders (0.127% and 0.217%).

### Q3. What browser coverage becomes possible?

- **WebKit Web Audio:** on Linux and macOS, 139 WebKit audio tests run, which gives the first
  automated WebKit audio coverage. It needs only CI-011.
- **Firefox:** the full check runs on all three runners once CI-012 lands (E7). It covers two
  more rendering paths than the maintainer's GPU: WARP on Windows and llvmpipe on Linux.
- **Safari:** Playwright cannot drive it. **Recommendation:** Playwright WebKit on macOS is the
  CI proxy, and Safari stays in the manual release pass. No `safaridriver` harness in 2.3.
- **Mobile browsers:** out of scope. Touch and device behavior stay manual.

### Q4. Which scripts and documents assume one platform?

Only the publish guide's `xcopy` step (CI-002) and the two case-only names (CI-001). Line
endings (CI-007) affect the build output rather than a script.

### Q5. Provider

**Recommendation: GitHub Actions.** The repository is on GitHub, and hosted runners are free
for public repositories, macOS included. E2 used three runners at once without queueing,
within the free plan's limits of 20 concurrent jobs and 5 concurrent macOS jobs. The plan's
tracking already uses GitHub milestones and issues.

Alternatives considered:

- **CircleCI or Azure Pipelines:** no advantage for a public GitHub repository.
- **A self-hosted GPU runner:** it would give hardware WebGL and a real audio device. On a public
  repository, it could run code from fork pull requests. **Recommendation:** not in 2.3.

### Q6. Pipeline

Detailed in Section 6:

- **Pull requests:** Linux and Windows, required once CI-003, CI-004, CI-005, CI-007, CI-011,
  and CI-013 land. Until then they run as non-required checks.
- **`main` and nightly:** adds macOS. Its assertion tests are required, and its pixel results
  are report-only (G4).
- **Linux setup:** `npx playwright install --with-deps` (63 s) or the Playwright container
  image. **Windows and macOS setup:** a Playwright browser cache keyed on the Playwright
  version.
- **Flakes:** `retries: 1` with `failOnFlakyTests`, and default workers (CI-006). Nightly adds
  `--repeat-each=3` visuals, which E2 ran on every runner in 1–3 minutes.
- **Artifacts:** the size report on every run. Test results, reports, and captures on failure,
  kept 14 days.
- **Size diff:** a job summary against the base branch, from the Linux job, whose build matches
  macOS.
- **Time budget:** pull-request jobs under 10 minutes. The estimate is 5–7 minutes.

### Q7. What stays manual

- **Baseline approval.** CI uploads captures and never writes baselines.
- **Realtime audio suites.** They run in local `npm test` on machines with an audio device and
  in the report-only nightly job (CI-005).
- **Listening checks, the input device pass, Safari, and hardware-GPU checks** (plan R.7).
- **Performance and benchmark campaigns.**

### Q8. Release automation

**Recommendation (G6):** on a `v*` tag, a workflow does the following:

- builds the package on Linux;
- runs `npm test` on Linux and Windows, and the macOS job as in Q6;
- runs `npm run copy-to-release`, then `npm pack --dry-run` and `npm pack`;
- checks that the tag, `package.json`, and plugin banners agree (R.6);
- attaches the tarball to a draft GitHub Release.

`npm publish` stays manual for 2.3.0 and publishes the verified tarball. Until CI-007 lands, the
package must be built from an LF checkout, so that the published build does not depend on the
maintainer's machine. Later, npm trusted publishing (OIDC) can move publishing into the tag
workflow, with provenance. The versioned snapshot stays a reviewed commit, made by a Node script
(CI-002).

**G5:** CI does not block 2.3.0. The fixes that make `npm test` pass on all three platforms do
ship in 2.3.0.

## 6. Proposed Pipeline

| Workflow | Trigger | Jobs and matrix | Wall time |
| --- | --- | --- | --- |
| `ci.yml` | Pull request, push to `main` | `test` (`npm test` with `PI_AUDIO_REALTIME=0`) on `ubuntu-24.04` and `windows-2025`. `macos-15` added on `main`. `size` on Linux | 5–7 min per job, in parallel |
| `nightly.yml` | Daily, manual | `test` on all three platforms, plus `test:firefox` (Linux under `xvfb-run`), `--repeat-each=3` visuals, and a report-only realtime-audio job on macOS | 10–15 min per job |
| `release.yml` | Tag `v*`, manual | `verify` as `ci.yml`, then `package` on Linux: copy to release, pack, version checks, draft release | About 10 min |

Common settings:

- `permissions: contents: read` by default. `pull_request`, never `pull_request_target`.
- Concurrency groups cancel superseded pull-request runs.
- Current major versions of the actions (`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`,
  `download-artifact@v8`), kept current by Dependabot.
- Node 22, and Node 24 on nightly once G8 is decided.
- Playwright pinned to the locked version. An upgrade is its own change, with a baseline review.

## 7. Portability Fixes and CI Changes

Candidates for `CI-V2.3-ROADMAP.md`. "For 2.3.0" marks what `npm test` needs to pass on all
three platforms, or what the release needs (plan Section 9.4).

| ID | Change | For 2.3.0 | Evidence and notes |
| --- | --- | --- | --- |
| CI-001 | Rename `releases/publish.md` to `PUBLISH.md` and `docs/gamepad.md` to `GAMEPAD.md` in git (in two steps on Windows) | Yes | `paths.json`. The first rename is core C11 |
| CI-002 | Replace the publish guide's `xcopy` with a Node script, such as `npm run snapshot` | Yes | The only platform-specific release step |
| CI-003 | Pin `--disable-gpu --enable-unsafe-swiftshader` in `playwright.config.js` and in one shared Chromium launch helper used by `test/unit/` | Yes | Reproduces today's captures on Linux and Windows. Not `--use-angle=swiftshader`. The benchmark keeps its own flags |
| CI-004 | Keep the system-font text out of the `pointer_lifecycle_01` capture: hide it once it is checked, or capture only the canvas | Yes | 8.08% over tolerance on Linux. One baseline, reviewed |
| CI-005 | Make the realtime suites (`audio-stream-browser`, `audio-recording-realtime-browser`) skip with a stated reason when `PI_AUDIO_REALTIME=0`. CI sets it; local runs keep them | Yes | Section 2.4. Without it, the recording file costs 120 s per run, and Firefox fails on every device-less runner |
| CI-006 | CI settings in `playwright.config.js`: `retries: 1` with `failOnFlakyTests`, and default workers | No (CI only) | Visuals take 1.3–2.1 times as long with 1 worker |
| CI-007 | `.gitattributes`: `* text=auto eol=lf`, with binary markers for PNG, WAV, WebP, and fonts; then re-check out once on Windows | **Yes** | Release builds differ by checkout: `pi.min.js` is 207,944 bytes on Linux and macOS, 208,078 locally, and 208,248 on the Windows runner |
| CI-008 | Timing-sensitive visual fixtures: `inpress_01`, `intouch_01`, `keyboard_commands`, and `shaders_lifecycle` | Owned elsewhere | Pointer and keyboard roadmaps, and the test audit handoff. Nightly repeats track them |
| CI-009 | Re-record all baselines once, after CI-003, in one reviewed task | Yes | Clears the same drift seen on every platform (Section 2.3) |
| CI-010 | The workflows in Section 6 | No (G5) | Ships when ready |
| CI-011 | Add WebKit values to `test/unit/audio-tolerances.js`: Chromium's values, including `mixDeterminism`, and the WebKit calibration ranges in the comments | Yes | 95 of 95 pass on Linux and macOS (Section 2.4). With the sound workstream |
| CI-012 | Firefox WebGL on runners: launch Firefox in `firefox-smoke.js` with `firefoxUserPrefs: { "webgl.force-enabled": true }`. On Linux CI, install `libegl1`, `libegl-mesa0`, and `libgles2`, and run the check headed under `xvfb-run` through a launch option (such as `PI_FIREFOX_HEADED=true`) | No (CI only) | E7: the check passes 6 of 6 on all three runners. The preference does not change rendering on GPU machines (probed locally). Headed Firefox was tested only after the EGL packages were added; E7 did not isolate whether they are needed, and they take 2 s to install |
| CI-013 | Fix the race in `visual-report-browser.test.js` ("comparison and approval requests use the selected mode"): wait for the diff modal to close before clicking the section header | Yes | Failed on the Windows runner. The modal intercepted the click |

## 8. Decisions

Recorded 2026-09-26. The maintainer accepted every recommendation.

| ID | Decision | Outcome |
| --- | --- | --- |
| G4 | How visual baselines work across platforms | **Closed:** one baseline set with pinned SwiftShader flags. Pixel comparisons are required on Linux and Windows and report-only on macOS (Q2) |
| G5 | Whether CI must be running before 2.3.0 ships | **Closed:** no. The fixes marked "Yes" in Section 7 ship in 2.3.0 |
| G6 | How much of publishing is automated | **Closed:** tag-triggered verification and a draft release. `npm publish` stays manual for 2.3.0 (Q8) |
| G8 | The Node floor in `engines` | **Closed:** `>=22`. Node 18 and 20 are past end of life, and CI tests 22 and 24 |
| E-C | Delete the temporary exploration branches | **Done 2026-09-26.** `ci-exploration`, `ci-exploration-results`, and `ci-exploration-results-e7` are deleted. `runners.json` and `runners-e7.json` keep the results |

## 9. Review Decisions

| ID | Decision | Notes |
| --- | --- | --- |
| CI-001–CI-007 | Accepted | Roadmap Phases 1–3 |
| CI-008 | Accepted as a handoff | The pointer and keyboard roadmaps own the timing-sensitive fixtures. CI's nightly repeats report them |
| CI-009–CI-013 | Accepted | Roadmap Phases 1–3 |

The accepted items are scheduled in [CI-V2.3-ROADMAP.md](CI-V2.3-ROADMAP.md).
