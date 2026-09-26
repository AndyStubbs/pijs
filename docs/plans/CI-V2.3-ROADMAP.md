# Pi.js 2.3 CI/CD Roadmap

Status: Phase 1 complete (milestone C1, 2026-09-26); Phase 2 in progress (tasks 2.1 and 2.3
done). Next: 2.4, 2.5, 2.8, then 3.1–3.3 and 3.9 (see Task order)
Exploration: [CI-V2.3-EXPLORATION.md](CI-V2.3-EXPLORATION.md) (the `CI-0xx` items, questions,
and sections below refer to it)
Release plan: [UPGRADE-V2.3-PLAN.md](UPGRADE-V2.3-PLAN.md) (Section 9, decisions G4–G6 and G8)
Evidence: [`docs/evidence/ci-2.3/`](../evidence/ci-2.3/README.md)

## Overview

The exploration found that the library and its build tooling behave the same on Linux, macOS,
and Windows. Every difference comes from the test environment: renderer selection, one fixture
that shows system fonts, uncalibrated WebKit audio tolerances, realtime audio devices, Firefox
WebGL on GPU-less machines, and line endings in the build input. This roadmap schedules the
accepted fixes and the CI pipeline in three phases:

- **Phase 1 (renderer and baselines)** pins Chromium's renderer, fixes the line endings, and
  re-records the visual baselines once. It must finish before any input roadmap implementation
  starts (plan Section 4).
- **Phase 2 (cross-platform `npm test`)** makes `npm test` and `npm run test:firefox` pass on
  all three platforms.
- **Phase 3 (pipeline)** adds the GitHub Actions workflows. It does not block 2.3.0 (G5).

```
Phase 1  Renderer & Baselines ──► Phase 2  Cross-Platform npm test ──► Phase 3  Pipeline
         (before input roadmap              (2.3.0)                     (when ready, G5)
          implementation)
```

Phases 1 and 2 ship in 2.3.0. Phase 3 is repository infrastructure and ships when ready. If it is
running before the release, release task R.7 uses it.

### Task order

The phases overlap. Pull-request checks become useful as soon as `ci.yml` (task 3.3) runs green,
so the tasks that `ci.yml` needs come first, and the rest of Phase 2 follows:

1. **Before `ci.yml`,** the tasks without which its checks would fail or be incomplete:
   - 2.3 (realtime audio switch): `ci.yml` sets `PI_AUDIO_REALTIME=0`;
   - 2.4 (WebKit tolerances): 40 WebKit tests fail on Linux and macOS without them;
   - 2.5 (visual report race): it failed on the Windows runner;
   - 2.8 (report-only pixels): the macOS job uses it;
   - 3.1 (CI test settings): so the checks run with the intended retries and workers;
   - 3.2 (size diff): the `size` job uses it.
2. **3.3 (`ci.yml`) and 3.9 (GitHub CLI).** From the first green `ci.yml` run on `main`, work
   moves to branches and pull requests (Branches and pull requests, below).
3. **The rest of Phase 2:** 2.2, 2.6, and 2.7, each through a pull request.
4. **The rest of Phase 3:** 3.4–3.8.

Tasks already done keep their numbers. The order changes nothing in the phases' exit criteria.

### Branches and pull requests

**Until `ci.yml` runs green on `main`:** commit to `main` directly, one commit per task, as for
Phase 1. Use a local branch (`git switch -c <name>`) only for risky or long work: anything that
changes baselines, anything that may be abandoned, or several days of work. Merge it when done.
Task 3.3 itself lands on `main` directly, and its first push run is the first `ci.yml` run.

**After that,** every roadmap task goes through a pull request:

- **One short-lived branch per task,** named after the task, such as
  `ci-2.2-release-snapshot`.
- **The pull-request title is the task's issue title,** such as
  `CI 2.2: Portable release snapshot`. The description follows the pull-request guidelines in
  `AGENTS.md`: the behavior change, the validation commands run, the linked issue, and
  before/after screenshots for rendering changes.
- **Merge only with `ci.yml` green** on Linux and Windows. A red check is fixed or explained in
  the pull request, never merged over. Until task 3.8 makes the checks required, this is a
  rule, not a setting.
- **Squash-merge small tasks,** so `main` keeps one commit per task. Keep a merge commit for
  larger work with meaningful steps, such as the input roadmaps' breaking API changes.
- **Delete the branch after merging.**

The other 2.3 workstreams follow the same practice from that point on.

### GitHub CLI setup

The maintainer installs the GitHub CLI (`gh`) once, as part of task 3.9, and manages every
commit, pull request, and issue with it. An assistant working in the repository leaves its
changes uncommitted and gives the commands instead. On Windows:

1. Install it: `winget install --id GitHub.cli`, then open a new terminal so `gh` is on the
   `PATH`.
2. Sign in: `gh auth login`. Choose GitHub.com, HTTPS, and "Login with a web browser", and
   allow `gh` to act as the git credential helper. The token stays in the system's credential
   store; never paste it into a file or a chat.
3. Check it: `gh auth status` shows the account and the `repo` scope, and
   `gh repo view AndyStubbs/pijs` shows the repository.
4. In WSL, if pull requests are also opened from there: install `gh` with Ubuntu's package
   manager (`sudo apt install gh`) and run `gh auth login` there as well.

Everyday commands once it is set up:

| Command | Does |
| --- | --- |
| `gh pr create --fill --base main` | Opens a pull request for the current branch |
| `gh pr checks --watch` | Follows the pull request's `ci.yml` checks until they finish |
| `gh pr merge --squash --delete-branch` | Squash-merges a green pull request and deletes its branch |
| `gh run list --workflow ci.yml` | Lists recent `ci.yml` runs |
| `gh run view <id> --log-failed` | Shows the log of a run's failed steps |
| `gh issue create --title "CI 2.2: Portable release snapshot" --milestone "CI Phase 2"` | Opens a task issue |

### Milestones

| Milestone | Contents | Gate |
| --- | --- | --- |
| C1: Stable baselines | Phase 1 | Chromium's renderer is pinned. Baselines are re-recorded and reviewed. Windows and Linux builds are byte-identical |
| C2: Portable tests | Phase 2 | `npm test` and `npm run test:firefox` pass on Windows and Linux. The remaining macOS difference is handled by the report-only pixel mode |
| C3: CI running | Phase 3 | Pull-request, nightly, and release workflows green. Required checks configured |

### Standing rules for every phase

- Each task ends with `npm test` green on the maintainer's Windows machine. From Phase 2 on, it
  must also be green on Linux (WSL or a runner).
- No task changes library behavior. A task that finds a library defect reports it to the
  owning workstream instead of working around it in a test.
- Visual baselines change only in task 1.2 (one fixture) and task 1.4 (all). Each change is
  reviewed image by image with `scripts/visual-review.js`.
- Tolerances are never loosened to make a platform pass. A platform that cannot match is
  handled by the report-only mode (task 2.8), with the reason recorded here.
- New or changed tests follow the plan's platform rules (plan Section 10): no shell-specific
  commands, hard-coded separators, or line-ending assumptions.
- `test/README.md` is updated in the task that changes a command, an environment variable, or
  a requirement.
- User documentation (`API.md`, `docs/llms/`) is not affected by this roadmap.
- Task numbers are sequential within a phase and become GitHub issue titles, such as
  `CI 1.1: Pin the Chromium renderer`. A task added later takes the next free number.

### Coordination with other workstreams

| Workstream | Shared item | Agreement |
| --- | --- | --- |
| Plugin removal (plan Section 3.1) | Task 1.4 re-records every baseline | Run task 1.4 after P.3 has deleted the removed plugins' fixtures and baselines, so they are not re-recorded. If P.3 slips, task 1.4 still runs before input implementation, and P.3 deletes those baselines afterwards |
| Pointer roadmap | `pointer_lifecycle_01` (task 1.2) and the timing-sensitive fixtures `inpress_01` and `intouch_01` (CI-008) | Task 1.2 changes only what the fixture captures, and lands before pointer implementation starts. The pointer roadmap owns the fixture after that, and owns the timing fixes |
| Keyboard roadmap | `keyboard_commands` (CI-008) | The keyboard roadmap owns its timing fix |
| Sound | `test/unit/audio-tolerances.js` (task 2.4) and the realtime suites (task 2.3) | Both tasks are reviewed with the sound workstream. If a WebKit render exposes a library defect, the sound workstream fixes it. Task 2.4 does not loosen a tolerance for it |
| Core | `releases/publish.md` rename (core C11, task 2.1) | Task 2.1 makes both case renames. C11 keeps `"private": true` and the changelog in the tarball |
| Test audit handoff | `shaders_lifecycle` (a known flake) | Stays with its current owner. Phase 3's nightly repeats report it |

## Phase 1: Renderer and Baselines

Chromium picks SwiftShader today through an automatic fallback that Chromium is removing. This
phase makes the choice explicit. It then removes the one platform-dependent capture and the
line-ending dependence of the build, and re-records the baselines once so later changes start
from a clean set. Plan Section 4 requires the re-record before any input roadmap implementation.

| # | Task | Exploration |
| --- | --- | --- |
| 1.1 | **Pin the Chromium renderer.** Add a shared launch helper in `test/unit/` that launches Chromium with `--disable-gpu --enable-unsafe-swiftshader`, merged with any caller arguments such as the realtime autoplay flag. Use it at every Chromium launch site in `test/unit/` and `audio-engines.js`, and set the same flags in `playwright.config.js` (`use.launchOptions.args`). The benchmark keeps its own flags. Do not use `--use-angle=swiftshader` | CI-003, Q2 |
| 1.2 | **`pointer_lifecycle_01` without system fonts.** Keep the DOM results text out of the capture: hide it after it is checked, or capture only the canvas area. Keep the assertions the text reports. Re-record and review this one baseline | CI-004 |
| 1.3 | **LF line endings everywhere.** In `.gitattributes`, add `* text=auto eol=lf` and mark binary files (PNG, JPEG, GIF, WebP, WAV, MP3, OGG, fonts). Run `git add --renormalize .` and commit any result. Refresh the Windows working tree, and record the steps for other Windows clones in `test/README.md` | CI-007 |
| 1.4 | **Re-record every visual baseline once.** After 1.1–1.3 (and after plugin removal P.3; see Coordination), capture every fixture in the full, lite, and plugins modes on the maintainer's Windows machine. Review each changed image with `scripts/visual-review.js`, and record the per-fixture pixel differences from the old baselines in `docs/evidence/ci-2.3/` | CI-009, G4 |

Exit criteria:

- The renderer probe (`node docs/evidence/ci-2.3/probes.js renderer`) reports SwiftShader for
  Chromium, and the flag-pinned captures are byte-identical to the unpinned captures on Windows
  and on Linux (WSL), apart from the timing-sensitive fixtures (CI-008).
- `npm run build` produces byte-identical `pi.min.js` and `pi.lite.min.js` on Windows and Linux.
  The Windows build shrinks by about 134 bytes, the `\r` characters it embeds today.
- Every capture matches its new baseline with no changed pixels on Windows, except the
  timing-sensitive fixtures.
- On Linux (WSL), every capture passes, including `pointer_lifecycle_01`.
- `npm test` passes on Windows.

## Phase 2: Cross-Platform `npm test`

This phase closes the remaining differences, so that `npm test` and the Firefox check pass on
Windows and Linux, and on macOS with the report-only pixel mode (G4). Tasks 2.1–2.8 are
independent of each other. They land in the order under Task order: 2.3, 2.4, 2.5, and 2.8
before `ci.yml`, and 2.2, 2.6, and 2.7 after it, through pull requests.

| # | Task | Exploration |
| --- | --- | --- |
| 2.1 | **Case-only renames.** Rename `releases/publish.md` to `PUBLISH.md` and `docs/gamepad.md` to `GAMEPAD.md` in git, in two steps on Windows (to a temporary name, then to the final name). Check that the `paths` probe reports no mismatches | CI-001, core C11 |
| 2.2 | **Portable release snapshot.** Add a Node script with an npm command, such as `npm run snapshot`, that copies `releases/pi-latest/dist` to `releases/pi-<version>` and refuses to overwrite an existing snapshot. Add its test to `test/scripts/`. Replace the `xcopy` step in the publish guide | CI-002 |
| 2.3 | **Realtime audio switch.** When `PI_AUDIO_REALTIME=0`, `audio-stream-browser.test.js` and `audio-recording-realtime-browser.test.js` skip with a stated reason. Local runs keep them by default. Document the variable in `test/README.md` | CI-005, Section 2.4 |
| 2.4 | **WebKit audio tolerances.** Add WebKit values to `test/unit/audio-tolerances.js`: Chromium's values and `mixDeterminism` 0. Record the WebKit calibration ranges from `linux-webkit-audio.json` and the macOS runner in the comments. Update the engine table in `test/README.md` to cover WebKit on Linux and macOS | CI-011, Section 2.4 |
| 2.5 | **Visual report race.** In `visual-report-browser.test.js`, "comparison and approval requests use the selected mode" waits for the diff modal to close before clicking the section header | CI-013 |
| 2.6 | **Firefox WebGL on GPU-less machines.** Launch Firefox in `firefox-smoke.js` with `firefoxUserPrefs: { "webgl.force-enabled": true }`. Add a headed option (such as `PI_FIREFOX_HEADED=true`) for running under `xvfb-run` on Linux. Document both in `test/README.md` | CI-012, E7 |
| 2.7 | **Node 22.** Set `engines` to `>=22` in `package.json`. Update the Node version in `AGENTS.md`, `test/README.md`, and `test/performance/README.md` | G8 |
| 2.8 | **Report-only pixel mode.** With `PI_VISUAL_PIXELS=report`, a pixel mismatch is recorded in the results and the Playwright report without failing the test. Page errors, missing baselines, and patch checks still fail it. The minimal reporter prints the names of fixtures with mismatches, so CI logs show them. Document the mode in `test/README.md`. The macOS jobs use it (G4) | G4, Q2 |

Exit criteria:

- `npm test` and `npm run test:firefox` pass on the maintainer's Windows machine and on Linux
  (WSL):
  - on Linux, both with and without `PI_AUDIO_REALTIME=0`, since WSLg provides an audio server;
  - the Firefox check also passes on Linux, headed under `xvfb-run`.
- The WebKit audio render tests run on Linux with no failures and no skips beyond the Firefox
  `suspend()` skips.
- With `PI_VISUAL_PIXELS=report`, a deliberately changed baseline is reported by name, and the
  run still passes.
- The `paths` probe reports no case mismatches, and `npm run snapshot` works on Windows and
  Linux.
- macOS is first verified by the Phase 3 workflows. Until then, its known difference is
  recorded below, which meets the plan's release entry criterion (plan Section 11.1).

Known macOS difference (G4): Chromium on the macOS runner uses SwiftShader's LLVM backend.
`paint_02` and `paint_03` differ from the Windows renders by 0.127% and 0.217% of pixels, above
the 0.1% limit. The macOS jobs therefore run the visual suites in report-only pixel mode.

## Phase 3: Pipeline

The workflows follow the exploration's Section 6 and G6. The repository is public, so hosted
runners, macOS included, cost nothing. This phase does not block 2.3.0 (G5). Tasks 3.1–3.3 and
3.9 come before the rest of Phase 2 (Task order). Tasks 3.4–3.8 follow it.

| # | Task | Exploration |
| --- | --- | --- |
| 3.1 | **CI test settings.** In `playwright.config.js`, with `CI` set, use `retries: 1` with `failOnFlakyTests`, and default workers instead of 1 | CI-006 |
| 3.2 | **Size diff.** Add a script that compares two `build/size-report.json` files and writes a Markdown table of the byte and gzip changes per bundle and plugin. Add its test to `test/scripts/` | Q6 |
| 3.3 | **Pull-request workflow (`ci.yml`).**<br>• Triggers: pull requests, and pushes to `main`.<br>• `test` job: `npm ci`, the browsers (`--with-deps` on Linux; a cache keyed on the Playwright version on Windows and macOS), and `npm test` with `PI_AUDIO_REALTIME=0`. It runs on `ubuntu-24.04` and `windows-2025`, and on `main` also on `macos-15` with `PI_VISUAL_PIXELS=report`.<br>• `size` job (Linux): builds the base branch and the change, and writes the size diff to the job summary.<br>• Permissions: `contents: read`, and `pull_request`, never `pull_request_target`.<br>• Concurrency cancels superseded runs.<br>• Artifacts: test results, reports, and captures on failure, kept 14 days | CI-010, Q6 |
| 3.4 | **Nightly workflow (`nightly.yml`).**<br>• Triggers: a daily schedule, and manual runs.<br>• `test` on all three platforms, with macOS in report-only pixel mode.<br>• `npm run test:firefox` on all three; on Linux, with Mesa's EGL packages and headed under `xvfb-run`.<br>• The visual suites with `--repeat-each=3`.<br>• Node 24 alongside Node 22.<br>• A report-only realtime-audio job on macOS, which runs the two realtime suites without failing the workflow | CI-010, CI-008, Q6, Q7 |
| 3.5 | **Dependabot** for GitHub Actions versions (`.github/dependabot.yml`), weekly | Section 6 |
| 3.6 | **Release workflow (`release.yml`).**<br>• Triggers: a `v*` tag, and manual runs.<br>• Runs the `ci.yml` test matrix.<br>• A Linux `package` job then:<br>&nbsp;&nbsp;• builds and runs `npm run copy-to-release`;<br>&nbsp;&nbsp;• checks that the tag, `package.json`, `releases/pi-latest/package.json`, and the plugin banners agree (R.6);<br>&nbsp;&nbsp;• runs `npm pack --dry-run` and `npm pack` in `releases/pi-latest`;<br>&nbsp;&nbsp;• attaches the tarball to a draft GitHub release.<br>• `npm publish` stays manual and publishes that tarball | G6, Q8 |
| 3.7 | **Documentation.** Add a CI section to `test/README.md`: the workflows, what each runs, and how to reproduce a CI failure locally. In the publish guide, add the release workflow and the rule that the published tarball is the one the release workflow verified | Q7, Q8 |
| 3.8 | **Required checks.** The maintainer configures branch protection on `main`. The Linux and Windows `test` jobs and the `size` job become required after one week green. The macOS `test` job becomes required after two weeks green | Q6 |
| 3.9 | **GitHub CLI and pull requests.** The maintainer installs and signs in to `gh` (GitHub CLI setup, above). Create the GitHub milestones for Phases 2 and 3, and issues for their open tasks. From the first green `ci.yml` run on `main`, follow Branches and pull requests | Q6 |

Exit criteria:

- `ci.yml` passes on a pull request on Linux and Windows, and on `main` on all three platforms.
- `nightly.yml` passes three nights in a row. Any flaky fixture it reports is filed with the
  owning workstream.
- A manual `release.yml` run produces a draft release whose tarball has the same file list as
  a local `npm pack --dry-run`.
- The required checks are configured.
- `gh auth status` succeeds on the maintainer's machine, and every task after 3.3 landed
  through a pull request with a green `ci.yml`.

## Results Carried from the Exploration

- **Renderer:** headless Chromium uses SwiftShader on every platform tested. The flags from
  task 1.1 reproduce today's captures on Linux and Windows. `--use-angle=swiftshader` changes
  the compositing of CSS-scaled canvases and fails `renderer_comprehensive`.
- **Timing-sensitive fixtures:** `inpress_01`, `intouch_01`, and `keyboard_commands` vary
  between runs within tolerance on Linux and Windows. `inpress_01` exceeded it once on macOS
  (0.12%). Their owners are listed under Coordination.
- **WebKit audio:** all 95 WebKit render tests pass with Chromium's tolerances on Linux and
  macOS. WebKit mixes are bit-identical between page loads.
- **Realtime audio:** no hosted-runner arrangement passes both engines. With no device, Firefox
  fails. With a PulseAudio null sink, Chromium's clock stalls. On macOS's virtual device, two
  Firefox position checks miss the 120 ms limit.
- **Firefox WebGL:** on Windows, `webgl.force-enabled` gives WebGL2 through WARP. On Linux,
  headless Firefox never gets WebGL; headed under Xvfb it uses llvmpipe. The in-process WebGL
  preference crashes the page and must not be used.
- **Runner times** (E2, before these fixes): browser stage 229 s on Linux, 292 s on Windows,
  and 177 s on macOS, of which the realtime recording's 120 s timeout is part on Linux and
  Windows. The estimate for a pull-request job after Phase 2 is 5–7 minutes.

## Scope-Cut Order

If the schedule slips, cut in this order. Earlier items go first.

1. **Tasks 3.4–3.8** (nightly, Dependabot, release workflow, CI documentation, required
   checks) move after 2.3.0. R.7 then runs the release checks by hand.
2. **Phase 3 as a whole** moves after 2.3.0 (G5).
3. **Task 2.6** (Firefox on GPU-less machines) moves with Phase 3. It matters only in CI, since
   the maintainer's machine has a GPU.

Phase 1 is not cut: plan Section 4 requires the baseline re-record before input
implementation, and task 1.3 keeps release builds independent of the checkout. Tasks 2.1–2.5,
2.7, and 2.8 are small and are needed for the plan's release entry criterion (plan Section 11.1).

## Compatibility Summary

No public API, command, or behavior changes. Nothing in this roadmap needs an entry in
`UPGRADE-V2.3.md`.

- **Package build:** built on Windows, `pi.min.js` and `pi.lite.min.js` lose the `\r`
  characters embedded in the shader sources, about 134 bytes. Builds are then identical on
  every platform. This is a changelog note, not an upgrade-guide entry.
- **Contributors:**
  - Node 22 or later is required.
  - Windows clones check out LF line endings.
  - New test environment variables: `PI_AUDIO_REALTIME`, `PI_VISUAL_PIXELS`, and
    `PI_FIREFOX_HEADED`.
  - `test/README.md` and `AGENTS.md` describe these.

## Tracking

- **Progress:** each phase is a GitHub milestone, with one issue per task, titled like
  `CI 1.1: Pin the Chromium renderer`. Task 3.9 creates the milestones and issues for the open
  tasks. After 3.3, each task's pull request uses the issue's title and closes the issue.
- **Decisions:** any change to G4–G6 or G8 updates the upgrade plan's Section 13 and the
  exploration's Section 8 in the same commit.
- **Evidence:** baseline re-record differences (task 1.4) and the first workflow timings
  (Phase 3) go in `docs/evidence/ci-2.3/`.
