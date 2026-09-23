# Pi.js 2.3 Upgrade Plan

Status: Sound Phases 0–6 complete, expansion Phase 7 implemented, and Phases 8–10 proposed;
audits and the CI/CD exploration not started
Target release: Pi.js 2.3.0
Workstream documents:

- Sound: [SOUND-V2.3-PLAN.md](SOUND-V2.3-PLAN.md),
  [SOUND-V2.3-ROADMAP.md](SOUND-V2.3-ROADMAP.md), and
  [SOUND-ADVANCED-V2.3-PLAN.md](SOUND-ADVANCED-V2.3-PLAN.md)
- Keyboard, pointer, gamepad, core, tests, and CI/CD: audit reports, exploration results, and
  roadmaps are created by the steps in Sections 5–9

## 1. Purpose

Pi.js 2.3 is an API-quality release for the core plugins. It covers four plugins bundled in
`pi.js`, a lighter re-audit of the core library, and the test and build infrastructure:

1. **Sound:** rebuild the `sound` plugin on one Web Audio graph and add `sound-advanced`. The
   sound plan and roadmap define this work. The expansion plan then grows `sound-advanced`
   with recording, more bus effects, a sound-effect generator, music sync, and sample
   instruments.
2. **Keyboard, pointer, and gamepad:** audit each plugin for correctness and API design, then
   improve its API. Breaking changes are allowed where the audit shows a clear improvement.
3. **Core:** repeat the 2.2 whole-system audit at a lighter depth. It focuses on changes made
   since that audit and on the core surfaces the plugins build on.
4. **Tests:** audit the test suites to remove redundant tests, so the suite gets smaller and
   faster without losing coverage.
5. **CI/CD and cross-platform:** explore what it takes for the tests to pass on Linux, macOS,
   and Windows, and how continuous integration and release automation should run them.

This plan covers what the workstreams share: the audit method, sequencing, standing rules, and
the release phase. Each workstream's design and task list live in its own documents.

## 2. Workstreams

| Workstream | Scope | Documents | Status |
| --- | --- | --- | --- |
| Sound | `plugins/sound/`, `plugins/sound-advanced/` | `SOUND-V2.3-PLAN.md`, `SOUND-V2.3-ROADMAP.md`, `SOUND-ADVANCED-V2.3-PLAN.md` | Phases 0–6 implemented; expansion Phase 7 implemented, Phases 8–10 proposed |
| Keyboard | `plugins/keyboard/`: key state, action keys, key handlers, `input()` prompts | `KEYBOARD-V2.3-AUDIT.md`, then `KEYBOARD-V2.3-ROADMAP.md` | Audit not started |
| Pointer | `plugins/pointer/`: mouse, touch, press, click, context menu, pinch zoom | `POINTER-V2.3-AUDIT.md`, then `POINTER-V2.3-ROADMAP.md` | Audit not started |
| Gamepad | `plugins/gamepad/`: polling loop, state, sensitivity, connection events | `GAMEPAD-V2.3-AUDIT.md`, then `GAMEPAD-V2.3-ROADMAP.md` | Audit not started |
| Core | `src/`, plugin API, build, metadata, declarations | `CORE-V2.3-AUDIT.md` | Audit not started |
| Tests | `test/` suites, visual fixtures and baselines, harnesses, `scripts/test.js` | `TESTS-V2.3-AUDIT.md` | Audit not started |
| CI/CD | Cross-platform test runs, CI pipeline, release automation | `CI-V2.3-EXPLORATION.md`, then `CI-V2.3-ROADMAP.md` | Exploration not started |
| Release | Documentation, upgrade guide, version checks, snapshot | This plan, Section 11 | Waits for the other workstreams |

All workstream documents live in `docs/plans/`. Measurements and other evidence go in
`docs/evidence/<workstream>-2.3/`, following `docs/evidence/sound-2.3/`.

## 3. Scope Decisions

These decisions apply to every workstream and are fixed for this plan.

| Topic | Decision |
| --- | --- |
| Compatibility | Breaking changes are allowed in `sound`, `keyboard`, `pointer`, and `gamepad` when an accepted audit or plan item justifies them. Each breaking change needs a recorded rationale and an entry in the workstream's compatibility summary |
| Core API | The core audit may propose API changes, but core stays stable unless a change is needed by a confirmed defect or a plugin's accepted API change. Each core change needs explicit maintainer approval |
| Audits before changes | Keyboard, pointer, and gamepad API changes start only after the audit is reviewed and the roadmap is approved |
| Removed APIs | Removed or renamed commands and parameters fail loudly: an unknown command, or a validation error that names the change. Values are never silently reinterpreted. Aliases are added only when a roadmap justifies one (G3) |
| Plugin versions | A plugin's banner moves to the next major version with its first breaking change and to a new minor version for additive changes only. The version changes in the task that makes the change, following the `sound` 2.0.0 precedent |
| Package version | Staged at `2.3.0` / `"2.3"` by sound task 0.2 and shared by all workstreams. Every API change is layered under `metadata/pi-2.3/` |
| Plan location | Plans, audits, and roadmaps go in `docs/plans/`. The user-facing `docs/UPGRADE-V2.3.md` is written only in the release phase |
| Upgrade guide | One guide for the whole release, assembled from each workstream's compatibility summary |

## 4. Sequencing

```
Sound Phases 0–6 (done) ──► Sound Phases 7–10 (expansion) ───────────┐
                                                                     │
Core audit ──► core follow-up fixes ─────────────────────────────────┤
                                                                     │
Keyboard audit ─┐                                                    │
Pointer audit  ─┼─► Input conventions ─► per-plugin ─► roadmap work ─┤
Gamepad audit  ─┘   review               roadmaps                    │
                                                                     │
Test audit ──► accepted removals ────────────────────────────────────┤
                                                                     │
CI/CD exploration ──► portability fixes and CI roadmap ──────────────┤
                                                                     ▼
                                                           Release (Section 11)
```

- The three input audits are independent and can run in any order or in parallel.
- The core audit should finish before the input roadmaps are approved. Its plugin-API findings
  can change what the input plugins build on.
- The input conventions review (Section 6) runs after all three input audits and before any
  input roadmap is approved, so the three plugins change toward one convention.
- Sound Phase 6 is complete. The expansion (Phases 7–10) is independent of the audits and the
  CI/CD exploration and can start at once, except task 9.3 (music sync callbacks), which waits
  for the input conventions review so its handler commands follow the same convention.
- The test audit and the CI/CD exploration do not depend on the plugin work and can start at
  once. The test audit reuses the core audit's coverage map if it is available, and the
  exploration's per-platform runs feed the test audit's list of flaky tests.
- Test changes in an area another workstream is rewriting are handed to that workstream
  (Section 8.3), so the test audit never edits tests that a roadmap is about to replace.
- If the exploration leads to re-recording visual baselines (G4), that happens once, as its
  own reviewed task, before input roadmap implementation starts.
- Input roadmaps can run in parallel once approved. A change to `keyboard` or `pointer` also
  updates `onscreen-keyboard` and `pi-vision`, which depend on them (Section 10).

### Milestones

| Milestone | Contents | Gate |
| --- | --- | --- |
| U1: Audits complete | Core, keyboard, pointer, gamepad, and test audit reports; CI/CD exploration results | Each report reviewed; every finding accepted, rejected, or deferred |
| U2: Roadmaps approved | Input conventions decisions; keyboard, pointer, gamepad, and CI roadmaps | Open decisions G1–G6 closed; each input roadmap has a compatibility summary |
| U3: Implementation complete | Sound Phases 6–10 (sound M5); all input roadmaps; accepted core fixes, test removals, and portability fixes | Every workstream's exit criteria met with `npm test` green |
| U4: Release | Section 11 | Pi.js 2.3.0 snapshot created |

## 5. Input Plugin Audits

Keyboard, pointer, and gamepad each get a separate audit that follows this method. An audit
records findings and proposes changes. It does not change code, tests, or baselines. Fixes go
through the plugin's roadmap after review.

### 5.1 Goals

Each audit produces:

1. **Correctness findings:** confirmed defects with a reproduction, in the 2.2 audit format.
2. **An API design review:** what the plugin exposes, how well it serves games, and a proposed
   API with each change marked breaking or additive.
3. **A coverage map:** what the tests check, what they do not, and which tests to add first.
4. **A baseline:** gzipped plugin size from `npm run size`, plus runtime command inventory.

### 5.2 Baseline and prior work

- **Source revision:** record the commit audited. Audit the working tree at that revision, not
  a released snapshot.
- **2.2 audit:** findings in the plugins were fixed in 2.2: SYS-003 and SYS-011 (keyboard),
  SYS-021 (gamepad), and COV-001 (touch fixture). Re-run their regression tests and treat those
  behaviors as fixed contracts, not new findings, unless they have regressed. The report was
  removed from the tree; read it with `git show 991e340^:docs/SYSTEM-AUDIT-2.2.md`.
- **Current contract:** `docs/API.md` (Input section), `metadata/` layers, generated
  `docs/llms/pi.d.ts`, hand-written `docs/llms/` references, plugin READMEs, and
  `docs/GAMEPAD.md`.
- **Dependents:** `onscreen-keyboard` depends on `pointer` and `keyboard`; `pi-vision` depends
  on `pointer`. Demos in `test/` and visual fixtures in `test/tests/html-core/` also use the
  input commands.

### 5.3 Common checklist

Every input audit covers these areas:

| Area | Questions |
| --- | --- |
| Inventory | Does every registered command match its metadata, declarations, `API.md`, llms references, and README in name, parameters, defaults, return value, and errors? Are documented commands missing at runtime, or runtime commands undocumented? |
| Lifecycle | Do start, stop, and auto-start behave consistently? Are listeners, timers, and animation frames owned and released? What happens with repeated start/stop, screen removal, late plugin registration, and page visibility changes? |
| Event semantics | Dispatch order, once-handlers, removal and registration during dispatch, throwing callbacks, focus and blur, and held state after the page loses focus |
| Validation | Consistent error codes and messages; finite, integer, and range checks; behavior on invalid input leaves prior state intact |
| API design | Naming and casing, argument order, positional and object forms, parity between polling (`in*`) and handlers (`on*`/`off*`), return shapes, missing capabilities games commonly need, and commands that could be removed or merged |
| Allocation | Per-frame allocation in polling functions and dispatch; objects returned to user code that are reused or copied |
| Browser behavior | Chromium, Firefox, and WebKit differences; mobile browsers where relevant. Record what can be tested with synthetic events and what needs a physical device |
| Tests | Coverage map of unit, browser, and visual tests; gaps ranked by value |
| Size | Gzipped plugin size and share of `pi.min.js` |

### 5.4 Plugin focus areas

These are starting points. The audit adds anything else it finds.

- **Keyboard:**
  - Key identity: `key` compared with `code`, keyboard layouts, modifiers, and combinations.
  - `inkey()` return shapes; action keys and browser-default prevention.
  - Auto-repeat handling in `onkey()`.
  - `input()` prompts: whether they belong in the keyboard plugin, their dependency on text
    printing, IME and composition input, editable targets, and blur during a prompt.
  - Integration with `onscreen-keyboard`.
- **Pointer:**
  - Whether separate mouse and touch listeners should become one Pointer Events path, and what
    `press` means afterward.
  - Hit boxes and `customData`, the `buttons` bitmask, and multi-touch data.
  - Coordinate mapping with views, CSS scaling, and `noCss` screens.
  - Context menu and pinch-zoom settings; pointer capture; missing input such as the wheel.
  - Integration with `pi-vision` and `onscreen-keyboard`.
- **Gamepad:**
  - Polling loop ownership and timing relative to the frame.
  - Standard mapping, button and axis naming, and controller index stability across reconnects.
  - Dead-zone model (per-axis or radial) and the `setGamepadSensitivity()` name and range.
  - Event API parity with keyboard and pointer. `docs/GAMEPAD.md` documents commands such as
    `ongamepad()` that the plugin does not register, so the audit reconciles the two.
  - Whether vibration is in scope for 2.3.

### 5.5 Report format

Each report is `docs/plans/<PLUGIN>-V2.3-AUDIT.md` with these sections:

1. **Summary:** revision, environment, overall assessment, and the most important findings.
2. **API inventory:** a table of every command with its parameters, return value, errors, and
   where each source of truth disagrees.
3. **Findings:** confirmed issues, each with an ID (`KEY-001`, `PTR-001`, `PAD-001`), priority,
   type (defect, API, documentation, or test gap), locations, reproduction, and expected
   behavior. Priorities follow the 2.2 audit: P1 blocks a supported workflow or corrupts shared
   state; P2 is incorrect behavior under a specific trigger; P3 is a lower-impact contract
   defect. Unconfirmed concerns are listed separately and are not findings.
4. **Proposed API:** the recommended API, with each change marked breaking or additive, its
   rationale, its dependents, and a sketch of the upgrade-guide entry.
5. **Coverage map:** what is tested and which tests to add first.
6. **Validation:** commands run, results, and environment.
7. **Recommended roadmap:** proposed phases and task order.

### 5.6 From audit to roadmap

1. The maintainer reviews the report and marks each finding and proposed API change accepted,
   rejected, or deferred to a later release. The decision is recorded in the report.
2. The input conventions review (Section 6) settles cross-plugin choices.
3. The roadmap `docs/plans/<PLUGIN>-V2.3-ROADMAP.md` is written from the accepted items. It
   follows the sound roadmap's structure: phases with numbered tasks, exit criteria, "results
   that later phases depend on", standing rules, and a scope-cut order.
4. Every roadmap ends with a **compatibility summary**, the input to `UPGRADE-V2.3.md`, even if
   it lists only additive changes.
5. When the design needs more detail than a roadmap holds, a separate
   `<PLUGIN>-V2.3-PLAN.md` is added, as sound did.

Every plugin gets a roadmap, even when its audit finds no API change; that roadmap holds the
accepted fixes and tests.

## 6. Input Conventions Review

The three input plugins were written separately, so their APIs have diverged. For example,
handler names mix `onkey` and `onGamepadConnected`, and handler signatures differ across
plugins. This review runs after all three audits and decides one convention before the
roadmaps are written.

It covers:

- Command naming and casing for polling, handler, start/stop, and settings commands.
- The shape of `on*`/`off*` signatures: mode strings, `once`, hit boxes, custom data, and how a
  handler is identified for removal.
- Auto-start rules and what explicit start/stop commands are still for.
- Shapes of returned state objects and callback data.
- Error-code naming.
- Whether the conventions also apply to `onscreen-keyboard` and `pi-vision` in 2.3.

The decisions are recorded in this section as numbered items (I1, I2, …), with the affected
audit findings, before the roadmaps are approved. Closing the review also closes G2 and G3 in
Section 13.

## 7. Core Audit

The 2.2 audit covered the whole system (SYS-001–023 and COV-001–005, all completed). The 2.3
core audit is lighter. It concentrates on what changed since then and on the surfaces the plugin
upgrades depend on. Like the input audits, it records findings and proposes changes; it does
not fix them.

### 7.1 Scope

1. **Regression check:** confirm the 2.2 regression suites still exist and pass
   (`npm run test:patch`, lifecycle, ownership, and numeric-boundary suites), and spot-check
   the P1 fixes.
2. **Changes since the 2.2 audit:** review the diff from the 2.2 audit revision (`694d02a`).
   It includes the larger 2.2 fixes (context recovery, premultiplied alpha, batch chunking,
   late plugin registration), the polygons refactor and its move into the full build,
   optimized line drawing, geometry and texture optimizations, and the plugin API changes
   made for sound (`provideService()`, `getService()`, `PluginCommands`).
3. **Plugin API surface:** commands, screen hooks, late registration, services, and dependency
   handling. Record anything the input roadmaps may need from core.
4. **Public API consistency:** a quick pass over core commands against the conventions from
   Section 6, recording inconsistencies. Changes follow the Core API rule in Section 3.
5. **Build, metadata, and types:** `metadata/pi-2.3/` layering, generated declarations, the
   `PluginCommands` interface, package exports, `npm run size`, and the release copy script.

Out of scope: a full rendering re-audit, a new performance campaign, and a GPU or browser
portability campaign. Platform differences in the tests belong to the CI/CD exploration
(Section 9).

### 7.2 Deliverable

`docs/plans/CORE-V2.3-AUDIT.md`, in the report format of Section 5.5, with findings numbered
`CORE-001` onward and a coverage map limited to the areas in 7.1. Accepted fixes are tracked in
a follow-up table in the report, as in 2.2. If an accepted item changes the core API, a short
`CORE-V2.3-ROADMAP.md` is written for it.

## 8. Test Audit

The suite has grown through the 2.0 refactors, the 2.2 audit follow-ups, and the sound work. It
now has subject-area suites, suites named after audit findings, Node and browser versions of
similar checks, and visual fixtures. The main goal of this audit is to remove redundant tests,
so `npm test` gets smaller and faster while every contract stays covered. It also records slow
and flaky tests. Like the other audits, it records findings and proposes changes; accepted
changes are made afterward.

### 8.1 Baseline

- **Inventory:** at the time of writing, `test/unit/` has 61 test files (32 of them browser
  tests), `test/scripts/` has 6, and `test/tests/html-core/` and `test/tests/html-plugins/`
  have 46 visual fixtures with 119 approved PNGs. Manual pages (`test/tests/html-manual/`),
  demos (`test/demos/`), and performance and benchmark tests are also in scope. The audit
  recounts these at its source revision.
- **Metrics:** record the test count and wall-clock time of each `npm test` stage and each test
  file, so the result can be compared after the removals.
- **Prior work:** `test/TEST-CONSOLIDATION-LOG.md` records an earlier consolidation of the
  graphics fixtures. Removals from this audit are logged there in the same format.

### 8.2 What counts as redundant

A test is redundant when another maintained test checks the same behavior through the same or a
stronger path. Places to look:

- **Node and browser pairs,** such as `color-validation.test.js` and
  `color-validation-browser.test.js`. Pure logic belongs in the Node test; the browser test
  should keep only what needs a browser.
- **Visual fixtures** that repeat each other, or that repeat what an assertion test already
  checks exactly.
- **Suites organized by history** rather than subject: `npm run test:patch` and files named
  after 2.2 audit work (`patch-*`, `ownership-reentrancy-*`, `numeric-boundaries-*`) may
  overlap the subject-area suites for the same modules.
- **Tests of replaced behavior,** such as 2.2 sound behavior. The owning workstream handles
  these.
- **Duplicated helpers and harnesses** across test files.
- **Orphans:** baselines without a fixture, fixtures without a baseline, and manual pages or
  demos that duplicate an automated fixture.

### 8.3 Removal rules

- Every proposed removal names the tests that still cover its behavior. Where practical, the
  evidence is a deliberate break in the library that the remaining test still catches.
- The coverage map (per command and per documented contract) must not lose an entry.
- A test is never removed to make a suite pass. A failing test is fixed or reported.
- A baseline is deleted only with its fixture. A merged fixture gets a newly reviewed
  baseline.
- Changes to tests in an area that sound, keyboard, pointer, or gamepad is rewriting are
  handed to that workstream's roadmap instead of being made by the test audit.

### 8.4 Other findings

- **Slow tests:** the slowest files and fixtures, with ways to speed them up.
- **Flaky tests:** found with repeated runs (such as `--repeat-each`) and with the CI/CD
  exploration's runs on other platforms.
- **Structure:** whether suite names and commands (`test:patch`, the `unit`/`browser` split)
  still match how the tests are organized, and what `test/README.md` should say.
- **Coverage gaps** found while mapping are reported to the owning workstream, not fixed by
  the test audit.

### 8.5 Deliverable

`docs/plans/TESTS-V2.3-AUDIT.md`, with the before metrics, the coverage map, and findings
numbered `TEST-001` onward. Each finding is classified as remove, merge, move, rename, speed
up, or fix flake, and lists its covering tests and estimated time saved. Accepted items are
tracked in a follow-up table in the report, as in the 2.2 audit. When they are done, the report
records the after metrics. Evidence goes in `docs/evidence/tests-2.3/`.

## 9. CI/CD and Cross-Platform Exploration

This is an exploration, not an implementation. It runs the tests on each platform, evaluates
options, and recommends. Portability fixes and any pipeline follow only after the
recommendation is accepted.

### 9.1 Current state

- **No CI:** the GitHub repository has no workflow configuration, and all testing is run by hand
  on Windows. `playwright.config.js` already changes retries, workers, and `forbidOnly` when
  `CI` is set.
- **Runner:** `scripts/test.js` spawns Node directly without a shell, and `test/README.md`
  says the command wrappers work on Windows and POSIX. This has not been verified on Linux or
  macOS.
- **Visual baselines** were recorded with Chromium on Windows. A pixel differs when its
  channel differences sum to more than 6, and a comparison fails when more than 0.1% of pixels
  differ.
- **Release steps:** `releases/PUBLISH.md` copies the snapshot with `xcopy`, which is
  Windows-only.
- **Browser coverage:** Safari is untested for lack of macOS hardware. Playwright's Windows
  WebKit has no Web Audio API, so WebKit runs only the audio lifecycle tests (sound Phase 0
  results).

### 9.2 Questions

Cross-platform:

1. **What differs?** Run `npm test`, `npm run test:firefox`, and the three audio engines on
   Linux, macOS, and Windows, on CI runners or local machines. Classify each difference:
   rendering (GPU backend, ANGLE, anti-aliasing), text rendering in fixtures, timing, file
   system (case-sensitive names, path separators, line endings under `core.autocrlf`),
   process handling (signals, ports), and missing system dependencies.
2. **How should visual comparison work across platforms?** Options to evaluate:
   - Force the same software renderer on every platform (for example, Chromium's SwiftShader
     through ANGLE launch flags) and keep one baseline set.
   - Keep a baseline set per platform.
   - Compare pixels on one reference platform only, with assertion tests everywhere.
   - Change tolerances per fixture.

   Compare them on the risk of false passes, baseline maintenance, and run time.
3. **What browser coverage becomes possible?** For example, WebKit with Web Audio on macOS or
   Linux, and whether Safari itself can run on a macOS runner.
4. **Which scripts and documents assume one platform?** Replace Windows-only or POSIX-only
   steps that are part of a workflow, such as the `xcopy` step, with Node scripts.

CI:

5. **Provider:** GitHub Actions is the default because the repository is on GitHub. Compare
   its limits and cost, especially macOS minutes, with alternatives, including a self-hosted
   runner if hardware GPU coverage is wanted.
6. **Pipeline:** which stages run on pull requests, on `main`, nightly, and on release tags; the
   operating system and browser matrix; caching of `node_modules` and Playwright browsers;
   uploading test results, reports, and `build/size-report.json`; a size diff against the base
   branch; and a time budget for pull-request checks.
7. **What stays manual:** listening checks, device passes, baseline approval, and performance
   campaigns.

CD:

8. **Release automation:** on a release tag, build, run the checks, and inspect
   `npm pack --dry-run`. Decide whether npm publishing (with provenance), the release
   snapshot, and documentation publishing are automated or stay manual.

### 9.3 Deliverable

`docs/plans/CI-V2.3-EXPLORATION.md`, with a results table per platform and browser, the
classified differences, the options and a recommendation for each question, a proposed pipeline
(jobs, triggers, matrix, and estimated run time and cost), and a list of portability fixes.
Evidence goes in `docs/evidence/ci-2.3/`. After review, the accepted fixes and pipeline become
`docs/plans/CI-V2.3-ROADMAP.md`.

### 9.4 Relationship to the release

Portability fixes that let `npm test` pass on Linux, macOS, and Windows are targeted for 2.3.0.
The CI pipeline is repository infrastructure, not part of the package, so it ships when ready
and does not block the release (G5). If it is running before the release, R.7 uses it.

## 10. Standing Rules

These apply to every workstream. Workstream roadmaps can add rules but not relax these.

- **Tests:** each phase ends with `npm test` green. Each change ships with its tests. Visual
  baselines change only after deliberate review.
- **New tests:** check for an existing test of the same behavior before adding one, and extend
  it where that fits. New tests must not depend on the host platform: no shell-specific
  commands, hard-coded path separators, or line-ending assumptions.
- **Declarations:** `docs/llms/pi.d.ts` is regenerated by every `npm run build`. Commit it with
  each API change, along with metadata and signature tests.
- **User documentation:** `API.md`, plugin READMEs, `docs/GAMEPAD.md`, and the hand-written
  llms references (`llms.txt`, `llms-full.txt`, `examples.txt`) are updated only in the release
  phase, once behavior is final. Plan documents record intermediate decisions.
- **Dependents:** a change to `keyboard` or `pointer` updates `onscreen-keyboard`, `pi-vision`,
  demos, and fixtures that use it in the same task, and the plugin visual suite must pass.
- **Size:** each input roadmap records its plugin's size at the audit baseline and at each
  phase exit, using `npm run size`.
- **Tracking:** each roadmap phase is a GitHub milestone, and each task is an issue titled with
  its workstream and number, such as `Keyboard 1.2: Unify handler signatures`.
- **Decisions:** closing an open decision updates the document that owns it in the same commit.
- **Commits:** short, imperative, and focused on one change.

## 11. Release

The release phase for all of 2.3. It moved here from the sound roadmap, which now ends with its
Phase 6 size review.

### 11.1 Entry criteria

- Sound Phase 6 is complete: size review done, promotions applied, and D4 resolved.
- Sound expansion Phases 7–10 are complete, or cut under the expansion plan's scope-cut order
  with the cut recorded, and D7–D17 are closed.
- Every input roadmap has met its exit criteria.
- Every accepted core finding is fixed. Any finding not fixed is explicitly deferred.
- Every accepted test-audit item is done or explicitly deferred, and the after metrics are
  recorded.
- `npm test` passes on Linux, macOS, and Windows, or each remaining difference is recorded in
  the CI roadmap.
- All open decisions in every 2.3 plan are closed.

### 11.2 Tasks

| # | Task |
| --- | --- |
| R.1 | Confirm the entry criteria and record any deferrals in the owning documents |
| R.2 | Rewrite the `API.md` Sound and Music section and the Input sections (Keyboard; Mouse, Touch, and Press; Gamepad), plus any core section a core fix changed, to describe final behavior |
| R.3 | Update `docs/llms/` references and examples, commit the regenerated `pi.d.ts`, and update plugin READMEs (including the `sound-advanced` README for the expansion commands) and `docs/GAMEPAD.md` |
| R.4 | Write `docs/UPGRADE-V2.3.md` from the compatibility summaries: sound plan Section 11, expansion plan Section 11, each input roadmap, and the core audit |
| R.5 | Update `releases/pi-latest/README.md` and `CHANGELOG.md`, and point `releases/PUBLISH.md` at the 2.3 upgrade guide |
| R.6 | Verify that `package.json` (2.3.0), every plugin banner (`sound` 2.0.0, `sound-advanced` 1.0.0, and the `keyboard`, `pointer`, and `gamepad` versions set by their roadmaps), the release `package.json`, and the declaration headers agree |
| R.7 | Full `npm test` and `npm run test:firefox`, the three-engine sound listening pass (including recording and saving a WAV), the input manual device pass, then the release snapshot following `releases/PUBLISH.md` |

The input manual device pass covers what synthetic events cannot: physical gamepads, touch and
multi-touch on a phone or tablet, and keyboard layouts and IME input on desktop. Each input
roadmap lists its own manual checks, and R.7 runs any that are still open.

### 11.3 Exit criteria

- All open decisions are closed.
- The upgrade guide has been reviewed.
- `npm test` is green, and the manual checks are recorded.
- The release snapshot `releases/pi-2.3.0` has been created.

## 12. Scope-Cut Order

If the schedule slips:

1. **Sound:** follow the scope-cut order in the sound roadmap, which cuts the expansion
   phases first (expansion plan Section 9).
2. **Core:** deferred P3 findings move to a later release. P1 and P2 findings are fixed or
   explicitly accepted as known issues.
3. **Input plugins:** a plugin's breaking changes ship together or not at all, so users update
   each API once. If a plugin's roadmap slips, its breaking changes move to the next minor
   release as a set, and its additive changes and fixes still ship in 2.3.0.
4. **Tests and CI/CD:** test removals and the CI pipeline can continue after 2.3.0, since they
   do not change the package. Portability fixes are deferred last.

## 13. Open Decisions

| ID | Decision | Recommendation | Resolve by |
| --- | --- | --- | --- |
| G1 | Input plugin versions after breaking changes | Move each plugin to 2.0.0 with its first breaking change, as `sound` did | U2 |
| G2 | Whether the input conventions apply to `onscreen-keyboard` and `pi-vision` in 2.3 | Update them only where a core input plugin change requires it; defer broader alignment | Input conventions review |
| G3 | Aliases for renamed input commands | No aliases: removed names fail as unknown commands, matching the 2.2 image palette and 2.3 sound changes. An alias is acceptable only for a widely used command where it adds almost nothing to the size | Input conventions review |
| G4 | How visual baselines work across platforms | Decide from the exploration's data. Prefer one baseline set rendered the same way on every platform; keep per-platform sets as the fallback | CI/CD exploration review |
| G5 | Whether CI must be running before 2.3.0 ships | No. Portability fixes ship in 2.3.0; the pipeline follows when ready | CI/CD exploration review |
| G6 | How much of publishing is automated | Automate release verification on tags (build, checks, `npm pack --dry-run`); keep `npm publish` manual for 2.3.0 | CI/CD exploration review |

## 14. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Breaking changes in four plugins at once | Large upgrade effort for existing games | One upgrade guide; shared conventions; loud errors; per-plugin breaking changes ship as a set |
| Input behavior depends on devices and browsers | Tests pass but real devices misbehave | Synthetic-event browser tests for logic; a manual device pass at release; audits record what cannot be automated |
| Dependent plugins break | `onscreen-keyboard` or `pi-vision` stop working | Dependents are updated in the same task; plugin visual suite at every phase exit |
| Audits grow into rewrites | Schedule slips before any fix lands | Audits only record findings; changes go through reviewed roadmaps |
| Full-build size growth | `pi.min.js` grows beyond the sound targets | Per-plugin size reporting at each phase exit |
| Sound expansion delays the release | The sound workstream reopens after it closed | Expansion phases are cut independently, before any core sound item; recording is cut last, and its core output stage ships in 2.3.0 even if the plugin part slips |
| Inconsistent APIs after separate roadmaps | Three plugins improve in different directions | The conventions review runs before any input roadmap is approved |
| A removed test was the only check of a behavior | A regression goes unnoticed | Each removal names its covering tests, with a deliberate-break check where practical; the coverage map must not lose entries |
| Test audit collides with workstream rewrites | Duplicate or conflicting test changes | Changes in an active workstream's area are handed to its roadmap |
| Rendering differs across platforms | All baselines need re-recording and review | Decide G4 from data; re-record once, as its own reviewed task, before input implementation |
| CI cost or flaky CI | Slow feedback, or failures that get ignored | Expensive matrix jobs run nightly; flaky tests are tracked and fixed, not retried away |

## 15. Out of Scope for 2.3

- Redesigning optional plugins (`polygons`, `print-table`, `onscreen-keyboard`, `pi-vision`,
  `pens`), except where they depend on a changed input plugin.
- New input device types, such as MIDI, WebXR controllers, or motion sensors.
- A full rendering re-audit or new performance campaign.
- Replacing the test frameworks (Playwright and `node:test`).
- Sound items listed in Section 14 of the sound plan and Section 10 of the expansion plan.
