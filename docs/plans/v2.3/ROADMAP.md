# Pi.js 2.3 Roadmap

Target release: Pi.js 2.3.0
Last updated: 2026-09-27

This is the definitive plan for 2.3. It holds every implementation step, the status of every
workstream, and every cross-cutting decision. The audits record findings only, and the design
documents record design only. When a task lands, update its row and the index below in the same
pull request.

## Index

### Next steps

Work in progress, in the order to take it up. Rows that can run in parallel say so.

| Order | Task | What | Waits on |
| --- | --- | --- | --- |
| 1 | [Pointer 1.8](#61-phase-1-fixes-and-tests), [Gamepad 1.1](#71-phase-1-fixes-and-tests) | Continue the pointer and gamepad Phase 1s, in parallel | Nothing |
| 2 | [Keyboard 2.1](#52-phase-2-api-breaking-set-200) | Start the keyboard breaking set on one long-lived branch (Section 1.4) | Nothing. Can run in parallel with 1 |
| 3 | [Sound 10.1](#42-phase-10-sample-instruments) | Core `getAudioBuffer` service member for sample instruments | Nothing. Can run in parallel |
| 4 | [Core 5–13](#32-phase-2-fixes) | Remaining core fixes, tests, and the two approved API changes, in any order. Core 8 and Core 13 land before the pointer and gamepad Phase 2 sets | Nothing. Can run in parallel |

Open manual checks are collected in the [release checklist](#83-manual-release-checks).

### Workstream status

| Workstream | Section | Status | Next |
| --- | --- | --- | --- |
| Core | [3](#3-core) | Phase 1 done. Core 1, 2, and 4 done, 10 tasks left | Core 5–13 |
| Sound | [4](#4-sound) | Phases 0–9 done; Phases 10–11 not started | Sound 10.1 |
| Keyboard | [5](#5-keyboard) | Phase 1 done; Phase 2 not started | Keyboard 2.1 |
| Pointer | [6](#6-pointer) | Phase 1: 1.1–1.7 done, 2 tasks left | Pointer 1.8 |
| Gamepad | [7](#7-gamepad) | Approved; Phase 1 not started | Gamepad 1.1 |
| Tests | [13.2](#132-tests) | Complete (TEST-001–028). Its handoffs are tasks in the owning sections | — |
| CI/CD | [13.3](#133-cicd) | Complete (CI 1.1–3.9) | — |
| Plugin removal | [13.1](#131-plugin-removal) | Complete (P.1–P.6) | — |
| Release | [8](#8-release) | Waits for the other workstreams | R.1 |

### Documents

All in `docs/plans/v2.3/`, with evidence in `docs/evidence/<workstream>-2.3/`.

| Document | Holds | Evidence |
| --- | --- | --- |
| `ROADMAP.md` | Tasks, status, decisions, rules (this document) | — |
| [AUDIT-CORE.md](AUDIT-CORE.md) | Core findings CORE-001–020 and proposals C1–C11 | [core-2.3](../../evidence/core-2.3/README.md) |
| [AUDIT-KEYBOARD.md](AUDIT-KEYBOARD.md) | Keyboard findings KEY-001–019 and proposals A1–A17 | [keyboard-2.3](../../evidence/keyboard-2.3/README.md) |
| [AUDIT-POINTER.md](AUDIT-POINTER.md) | Pointer findings PTR-001–017 and proposals B1–B13 | [pointer-2.3](../../evidence/pointer-2.3/README.md) |
| [AUDIT-GAMEPAD.md](AUDIT-GAMEPAD.md) | Gamepad findings PAD-001–017 and proposals A1–A12 | [gamepad-2.3](../../evidence/gamepad-2.3/README.md) |
| [AUDIT-TESTS.md](AUDIT-TESTS.md) | Test suite findings TEST-001–028 and handoffs | [tests-2.3](../../evidence/tests-2.3/README.md) |
| [AUDIT-CI.md](AUDIT-CI.md) | Cross-platform and CI/CD findings CI-001–013 | [ci-2.3](../../evidence/ci-2.3/README.md) |
| [DESIGN-SOUND.md](DESIGN-SOUND.md) | Core `sound` 2.0.0 and `sound-advanced` 1.0.0 design; D1–D6 | [sound-2.3](../../evidence/sound-2.3/README.md) |
| [DESIGN-SOUND-ADVANCED.md](DESIGN-SOUND-ADVANCED.md) | `sound-advanced` expansion design (Phases 7–10); D7–D17 | [sound-2.3](../../evidence/sound-2.3/README.md) |

## 1. Scope and Rules

### 1.1 Goals

Pi.js 2.3 is an API-quality release for the core plugins:

1. **Sound:** rebuild the `sound` plugin on one Web Audio graph, add `sound-advanced`, and
   expand it with recording, more bus effects, a sound-effect generator, music sync, and sample
   instruments.
2. **Keyboard, pointer, and gamepad:** fix the audited defects and move all three to one API
   convention (Section 2). Breaking changes are allowed where the audits showed a clear
   improvement.
3. **Core:** fix the findings of a lighter re-audit of the core library, focused on the plugin
   API, packaging, and declarations.
4. **Tests:** remove redundant tests so the suite is smaller and faster with the same coverage.
5. **CI/CD:** make the tests pass on Linux, macOS, and Windows, and run them in GitHub Actions.
6. **Plugin removal:** remove the incomplete non-core plugins `onscreen-keyboard`,
   `pi-vision`, `print-table`, and `pens`.

### 1.2 Scope decisions

| Topic | Decision |
| --- | --- |
| Compatibility | Breaking changes are allowed in `sound`, `keyboard`, `pointer`, and `gamepad` when an accepted audit or design item justifies them. Each needs a recorded rationale and an entry in its workstream's compatibility summary |
| Core API | Core stays stable unless a change fixes a confirmed defect or serves an accepted plugin change. Each core API change needs explicit maintainer approval. C7 (strict `set()`) is the only one approved |
| Removed APIs | Removed or renamed commands and parameters fail loudly: an unknown command, or a validation error that names the change. Values are never silently reinterpreted. No aliases (I16). One exception: a parameter removed from a removal command (`offX()`) is ignored when it can no longer change which handler is removed, such as `offKey`'s `once` and `allowRepeat` under I4 |
| Plugin versions | A plugin's banner moves to the next major version with its first breaking change, and to a new minor version for additive changes only. The version changes in the task that makes the change. `sound` is 2.0.0 and `sound-advanced` 1.0.0; the input plugins move to 2.0.0 with their Phase 2 (G1) |
| Package version | Staged at `2.3.0` / `"2.3"` (Sound 0.2). Every API change is layered under `metadata/pi-2.3/` |
| Upgrade guide | One user-facing `docs/UPGRADE-V2.3.md` for the whole release, written in R.4 from the workstreams' compatibility summaries |
| Plugins | The repository keeps the core plugins (`sound`, `keyboard`, `pointer`, `gamepad`, `polygons`), `sound-advanced`, and `example-plugin` |

### 1.3 Standing rules

Every task in every workstream follows these rules.

**Tests**

- Each task ends with `npm test` green on the maintainer's Windows machine and with `ci.yml`
  green on Linux and Windows. Each change ships with its tests.
- Before adding a test, look for an existing test of the same behavior and extend it where that
  fits. Pure logic goes in the Node test; the browser test keeps only what needs a browser.
- New and changed tests do not depend on the host platform: no shell-specific commands,
  hard-coded path separators, or line-ending assumptions.
- A test is removed only when another maintained test covers the same behavior. The removal
  names the covering tests, with a deliberate break in the library where practical, and the
  coverage map loses no entry. A test is never removed to make a suite pass. Removals are logged
  in `test/TEST-CONSOLIDATION-LOG.md`.
- A task that finds a defect in another workstream's area reports it to that workstream instead
  of working around it in a test.

**Visual baselines**

- Baselines change only after an image-by-image review with `scripts/visual-review.js`. A
  baseline is deleted only with its fixture, and a merged fixture gets a newly reviewed
  baseline.
- Tolerances are never loosened to make a platform pass. macOS runs pixel comparisons in the
  report-only mode (`PI_VISUAL_PIXELS=report`, G4).
- A fixture that is flaky on CI runners carries `ciSkip` with its reason and owner. The owner
  removes it with the fix.

**API changes**

- Metadata, generated declarations, and signature tests accompany each API change in its task.
  `docs/llms/pi.d.ts` is regenerated by every `npm run build`; commit it with the change.
- A change to an input plugin updates the demos, fixtures, manual pages, and `tools/` pages that
  use it, in the same task.
- Each workstream records its plugin's gzipped size (`npm run size`) at every phase exit, in its
  evidence folder.

**Documentation**

- `API.md`, plugin READMEs, `docs/GAMEPAD.md`, and the hand-written llms references
  (`llms.txt`, `llms-full.txt`, `examples.txt`) change only in the release phase (R.2, R.3), once
  behavior is final.
- `test/README.md` changes in the task that changes a test command, environment variable, or
  requirement.
- Closing a decision updates the document that owns it (Section 9) in the same commit.

**Sound**

- Each sound phase ends with a listening check of its demo in Chromium, Firefox, and WebKit
  (Safari). Checks that cannot run yet are listed in Section 8.3.

### 1.4 Working practice

Every task lands through its own short-lived branch and pull request:

- **Branch** named after the task, such as `keyboard-1.2-held-state`.
- **Pull-request title** is the task's workstream, number, and name, such as
  `Keyboard 1.2: Held state by code`. The description gives the behavior change, the
  validation commands run, and before/after screenshots for rendering changes (`AGENTS.md`).
- **Merge only with `ci.yml` green.** Branch protection on `main` requires the `ci` check. A
  red check is fixed or explained, never merged over.
- **Squash-merge** small tasks, so `main` keeps one commit per task. An input plugin's Phase 2
  (its breaking set) is built on one long-lived branch and lands with a merge commit, so the set
  can be held back as a unit (Section 10).
- **Delete the branch** after merging.
- **Task numbers** are sequential within a phase. A task added later takes the next free
  number.

The maintainer manages every branch, commit, and pull request with the GitHub CLI. An assistant
working in the repository leaves its changes uncommitted and gives each command in chat.

| Command | Does |
| --- | --- |
| `gh pr create --fill --base main` | Opens a pull request for the current branch |
| `gh pr checks --watch` | Follows the pull request's `ci.yml` checks |
| `gh pr merge --squash --delete-branch` | Squash-merges a green pull request and deletes its branch |
| `gh run view <id> --log-failed` | Shows the log of a run's failed steps |

Setup on a new machine: `winget install --id GitHub.cli`, then `gh auth login` (GitHub.com,
HTTPS, web browser login, `gh` as the git credential helper), then check with `gh auth status`.

### 1.5 Sequencing and milestones

```
Core Phase 1 (Core 4) ─────────────────┐
                                        ▼
Input roadmap approval (U2) ──► Keyboard, Pointer, Gamepad
                                Phase 1 ► Phase 2 ► Phase 3 ──────┐
Core Phases 2–3 ─────────────────────────────────────────────────┤
Sound Phases 9–11 ────────────────────────────────────────────────┤
                                                                  ▼
                                                     Release (Section 8)
```

- The three input plugins run in parallel. Each finishes Phase 1 before starting Phase 2.
- Core 4 lands before any input task that regenerates declarations, so the input plugins
  regenerate them once, against the new declaration layout.
- Sound, core Phases 2–3, and the input plugins do not depend on each other.

| Milestone | Contents | Status |
| --- | --- | --- |
| U1: Audits complete | Core, keyboard, pointer, gamepad, and test audits; CI exploration; every finding decided | Done 2026-09-26 |
| U2: Roadmaps approved | Sections 3–7 approved; G1–G8 closed | Done 2026-09-27 |
| U3: Implementation complete | Every workstream's exit criteria met with `npm test` green | Open |
| U4: Release | Section 8; the `releases/pi-2.3.0` snapshot exists | Open |

Workstream milestones:

- **Sound:** M1 core foundation, M2 core complete, M3 `sound-advanced` 1.0.0, and M4 size
  review are done. M5, expansion complete, closes when Phases 9–10 are done or cut and D13–D15
  are closed.
- **CI:** CI milestones C1 (stable baselines), C2 (portable tests), and C3 (CI running) are done.

## 2. Input Conventions

Decided 2026-09-25. They apply to `keyboard`, `pointer`, and `gamepad`, and to the handler
commands of `sound-advanced` (Sound 9.3). Where an item changes an accepted audit proposal, the
item takes precedence.

| ID | Decision | Affects |
| --- | --- | --- |
| I1 | **camelCase names.** Every input command is camelCase: `inX` for polling, `onX`/`offX` for handlers, `startX`/`stopX`, and `setX` for settings. Renames: `inkey`, `onkey`, `offkey` become `inKey`, `onKey`, `offKey`. `inmouse`, `onmouse`, `offmouse` become `inMouse`, `onMouse`, `offMouse`, and likewise for touch (`inTouch`, `onTouch`, `offTouch`) and press (`inPress`, `onPress`, `offPress`). `onclick`, `offclick` become `onClick`, `offClick`. `ingamepad` becomes `inGamepad`. Other commands keep their names except where I2, I12, or an accepted audit item renames them | All three plugins; gamepad A5, pointer B11 |
| I2 | **Handler signature.** `onX( [selector,] mode, fn, once, …extras )` and `offX( [selector,] mode, fn )`. Commands with one event have no mode: `onClick( fn, once, hitBox, customData )`, `onWheel( fn, once, hitBox, customData )`. Gamepad connection handlers become `onGamepad( mode, fn, once )` and `offGamepad( mode, fn )` with modes `"connect"` and `"disconnect"`, replacing `onGamepadConnected` and `onGamepadDisconnected`. Music sync is `onPlay( mode, fn, once )` and `offPlay( mode, fn )` with modes `"note"` and `"end"`. The object form of each command follows its parameter names | Gamepad A5, PAD-012, pointer B11, Sound 9.3 |
| I3 | **Pointer modes.** `onMouse`, `onTouch`, and `onPress` all use `"down"`, `"move"`, and `"up"`, matching the `action` field of pointer B7's data. `onTouch( "start" )` and `onTouch( "end" )` throw an `INVALID_MODE` error that names the new mode | Pointer B7, PTR-013 |
| I4 | **Removal.** A handler is identified by its selector (key or key set), mode, and function; `once`, `allowRepeat`, hit boxes, and custom data are ignored. Registering the same function for the same selector and mode again does nothing, as in the DOM. `offX( mode )` without a function removes every handler of that mode. `offX( null, fn )`, or the object form without `mode`, removes the function from every mode. Omitting both throws `TypeError` with code `INVALID_MODE` and a message that points to `clearEvents()`. Commands with one event (`offClick`, `offWheel`) have an implied mode, so calling them without a function removes every handler of that command for the screen. Keyboard's selector is always required | KEY-007, keyboard A14, PTR-009, pointer B1, gamepad A5 |
| I5 | **Start and stop.** Tracking starts on first use: the first read, handler registration, or a setting that needs tracking. Listeners are attached then, not at plugin load. After `stopX()`, tracking stays stopped until `startX()`. While stopped, reads return empty state, and handlers stay registered but are not called. A stop releases held input as I6 describes. The `input()` prompt keeps its own listener (keyboard A2). Per-canvas defaults that track no input, such as suppressing the context menu, apply from screen creation. Keyboard's `setActionKeys()` and `set( { actionKeys } )` start tracking, and pointer sets the canvas `touch-action` when touch or press tracking starts on that screen (pointer B10) | KEY-006, keyboard A13, PAD-012, PTR-010, pointer B12, gamepad A12 |
| I6 | **Cancelled input.** A release the player did not make is dispatched through the normal `"up"` mode with `cancelled: true` in its data. This covers the page becoming hidden, a stop command, `touchcancel` and `pointercancel`, and, for keyboard, window blur, an event from an editable target, and an `input()` prompt taking the keyboard. Keyboard's blur and editable-target reset, which clear held keys silently today, dispatch `"up"` for each held key; a second trigger finds nothing held. A cancelled release never clicks. Every pointer and keyboard data object carries a boolean `cancelled`, `false` unless cancelled; a cancelled keyboard `"up"` copies the last keydown's fields with `repeat: false`. Gamepad has no button handlers; a hidden page and `stopGamepad()` release its polled state as gamepad A2 describes | Pointer B3, B5, PTR-007, KEY-011, keyboard A8 |
| I7 | **Polled and callback objects.** Reads do not allocate. Keyboard and pointer data objects are created once per event and frozen; a single-item read returns the latest one until the next event, and handlers receive the same objects. List reads (`inKey()`, `inTouch()`) return a frozen array that is replaced when the state changes. Gamepad pads are live objects updated in place once per frame, and `inGamepad()` reuses one array per frame (gamepad A7); both are documented as live | KEY-013, keyboard A10, pointer B13, PAD-009, gamepad A7 |
| I8 | **Dispatch.** State is updated before dispatch. Handlers added during a dispatch first run in the next one. A handler removed during a dispatch does not run later in it. A `once` handler is removed before it runs. Each handler runs in its own `try`, and a throw is reported with `console.error` without stopping the others. Keyboard combinations match a release against the keys held just before it: a combination's `"up"` handlers run when a keyup releases one of its keys while all of them were held, with the keyup data for the released key and the held data for the others | PAD-003, PAD-007, PTR-006, PTR-009, gamepad A3, pointer B1, B2 |
| I9 | **Return shapes.** A single-item read returns the object or `null`, never `undefined`. A list read always returns an array, empty when nothing is held, connected, or tracking is stopped | PAD-010, gamepad A6 |
| I10 | **`clearEvents` scope.** A screen's `clearEvents()` clears per-screen handlers (mouse, touch, press, click, wheel) for that screen only; `$.clearEvents()` clears them on every screen (Core 13). Global handlers (keyboard, gamepad, play) are cleared everywhere, whichever form is called. `"click"` becomes its own type, so `"press"` no longer clears clicks, and `"wheel"` arrives with wheel input (pointer B11). `sound-advanced` registers `"play"`. The keyboard prompt follows keyboard A2: `$.clearEvents( "keyboard" )` cancels every prompt, and a screen's `clearEvents` cancels only its own | KEY-002, KEY-016, keyboard A15, PAD-012 |
| I11 | **Validation errors.** `TypeError` for a wrong type and `RangeError` for a value out of range, with the per-parameter codes in the table below and a message starting `"<command>: "` (for a pad helper, the method name). Every flag is a boolean or omitted. An index that can never be valid throws; a well-formed index with nothing behind it, such as button 20 on a pad with 16 buttons, returns the empty value (`false`, `0`, or `null`). Keyboard, pointer, and gamepad stop using `INVALID_PARAMETERS` and plain `Error`. Core keeps its own codes | KEY-009, keyboard A7, PAD-008, gamepad A8, PTR-012, pointer B9 |
| I12 | **Settings.** Settings are named for the feature, and boolean settings take `isEnabled`. `setEnableContextMenu` becomes `setContextMenu( isEnabled )` with option `contextMenu`. `setPinchZoom( isEnabled )` keeps its name and becomes a screen command (pointer B10). `setGamepadDeadZone` is as accepted (gamepad A9) | Pointer B10, PTR-014, gamepad A9 |
| I13 | **Gamepad names.** Standard-mapping names are positional and camelCase. Buttons: `south`, `east`, `west`, `north`, `leftShoulder`, `rightShoulder`, `leftTrigger`, `rightTrigger`, `select`, `start`, `leftStick`, `rightStick`, `dpadUp`, `dpadDown`, `dpadLeft`, `dpadRight`, `home`. Axes: `leftX`, `leftY`, `rightX`, `rightY` | Gamepad A10 |
| I14 | **Key names.** Codes (`"KeyA"`, `"ArrowLeft"`) are documented for game controls and values (`"a"`) for text; both keep working. Combinations match when their keys are held, even if other keys are also held; there is no exact-match option in 2.3 | KEY-001, keyboard A1 |
| I15 | **Dependents.** The conventions apply to the core plugins and `sound-advanced`. `onscreen-keyboard`, `pi-vision`, `print-table`, and `pens` are not updated; they are removed (P.1–P.6) | CORE-004 |
| I16 | **Old names.** No aliases. Renamed and removed commands are unregistered, so old code fails at its first call; the upgrade guide lists every rename. Old handler modes and option names fail with validation errors (I3, core C7) | All renames |

**I11 codes.** One table for the input plugins and `sound-advanced`, decided 2026-09-27. A new
parameter takes a code named after it.

| Code | Parameters | `TypeError` | `RangeError` |
| --- | --- | --- | --- |
| `INVALID_MODE` | `mode` of every `onX`/`offX`; `offX()` with neither mode nor function (I4) | Not a string, or both omitted | Not a mode of the command |
| `INVALID_FUNCTION` | `fn` | Not a function | — |
| `INVALID_ONCE` | `once` | Not a boolean | — |
| `INVALID_ALLOW_REPEAT` | Keyboard `allowRepeat` | Not a boolean | — |
| `INVALID_KEY` | Keyboard `key` of `onKey`, `offKey`, `inKey` | Not a string or an array of strings | Empty string or empty array |
| `INVALID_KEYS` | `setActionKeys`, `removeActionKeys` | Not an array of strings | Empty string in the array |
| `INVALID_PROMPT`, `INVALID_CURSOR` | `input()` `prompt`, `cursor` | Not a string | — |
| `INVALID_MAX_LENGTH` | `input()` `maxLength` | Not an integer | Below 1 |
| `INVALID_IS_NUMBER`, `INVALID_IS_INTEGER`, `INVALID_ALLOW_NEGATIVE` | `input()` flags | Not a boolean | — |
| `INVALID_IS_ENABLED` | `isEnabled` of `setContextMenu`, `setPinchZoom` | Not a boolean | — |
| `INVALID_HITBOX` | Pointer `hitBox` | Not an object with finite `x`, `y`, `width`, `height` | Negative width or height |
| `INVALID_INDEX` | `gamepadIndex`, button and axis indices, and I13 names | Not an integer or a name | Negative, or an unknown name |
| `INVALID_DEAD_ZONE` | `setGamepadDeadZone` | Not a finite number | Outside 0 to under 1 |
| `INVALID_DURATION`, `INVALID_STRONG`, `INVALID_WEAK` | `vibrateGamepad` | Not a finite number | Negative duration; magnitude outside 0–1 |

I1, I2, I3, I10's `"press"` change, I11's error codes, and I12's rename are breaking. Each lands
in its plugin's Phase 2 and is listed in its compatibility summary.

## 3. Core

Findings: [AUDIT-CORE.md](AUDIT-CORE.md). Proposals C1–C11:
[AUDIT-CORE.md §4](AUDIT-CORE.md#4-proposed-changes). Core 1, 2, and 4 are done
([Section 13.5](#135-core)). The task numbers follow the audit's follow-up order, so Core 3–10
keep their original numbers and Core 11–12 are the test audit's handoffs.

### 3.1 Phase 1: before input implementation

Done: Core 1, 2, and 4 ([Section 13.5](#135-core)).

### 3.2 Phase 2: fixes

In any order, in parallel with the input work.

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| Core 5 | **Offscreen context lifetime (C1).** Discard the shared offscreen context when its last screen is removed. Test: context loss after every member has gone, in `context-recovery-browser.test.js` (probe C01) | [CORE-001](AUDIT-CORE.md#core-001) | — |
| Core 6 | **Option and value handling (C6).** `parseOptions` maps `undefined` to `null`. `getPal( false )` excludes index 0. Fix `getImage( screen )` for offscreen screens. Clip polygon spans. Add numeric checks for `arc`, `loadFont`, and `setPrintSize`. Give `removeScreen` its object form and coded errors. Tests: `parseOptions` with explicit `undefined` in the Node suites (C06); numeric boundary rows for `arc`, `loadFont`, `setPrintSize`, and polygon extents (C11, C12) | [CORE-007](AUDIT-CORE.md#core-007), [CORE-009](AUDIT-CORE.md#core-009), [CORE-011](AUDIT-CORE.md#core-011), [CORE-012](AUDIT-CORE.md#core-012), [CORE-013](AUDIT-CORE.md#core-013), [CORE-015](AUDIT-CORE.md#core-015) | — |
| Core 7 | **Canvas textures, `setChar`, cache bounds (C8).** Upload static canvas textures once, make `setChar` also edit the source canvas, and bound the circle geometry cache. Test: `setChar` on the default font (C09) | [CORE-010](AUDIT-CORE.md#core-010), [CORE-018](AUDIT-CORE.md#core-018) | — |
| Core 9 | **Packaging (C11).** Add `"private": true` to the root manifest, and ship `CHANGELOG.md` in the release tarball. The `releases/PUBLISH.md` rename is done (CI 2.1) | [CORE-019](AUDIT-CORE.md#core-019) | — |
| Core 10 | **Metadata against runtime.** A generated check that every registered command and setting in each bundle has metadata with matching parameters, and that the declared command set matches the runtime objects (test audit SYS-012 gap) | [CORE-020](AUDIT-CORE.md#core-020), [AUDIT-TESTS §5.5](AUDIT-TESTS.md#55-core-audit) | — |
| Core 11 | **`shaders_lifecycle`.** Fix the 7 failing checks the fixture's full sequence exposes: sampler contexts, automatic presentation after removal and failure, and shader disposal. Make the capture deterministic, re-record and review its baseline, and remove its `ciSkip` | [AUDIT-TESTS §5.5](AUDIT-TESTS.md#55-core-audit) | — |
| Core 12 | **Test audit coverage gaps.** Tests for `blitImage`, `blitSprite`, `setDefaultAnchor`, and `calcWidth`; for explicit `registerPlugin()` without `window.pi` (SYS-013); and assertions for the visual-only `getDefaultPal`, `getShaderInfo`, `screenToView`, and `setPrintSize`. Resolve the redundant filter cleanup: remove the `cancelFilter` pre-cleanup hook or the per-pixel check in `src/api/pixels.js`, and correct the comment that says there is no per-pixel check | [AUDIT-TESTS §5.5](AUDIT-TESTS.md#55-core-audit) | — |

### 3.3 Phase 3: API change

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| Core 8 | **Strict `set()` (C7, breaking, approved).** `set()` throws `INVALID_OPTION` for unknown or unavailable names, and the no-screen error for screen settings. Tests: `set()` names in the Node suites (C07), including Full-only options in Lite. Not cut: the I16 rule for renamed options (`enableContextMenu`, `gamepadSensitivity`) depends on it, so it lands before 2.3.0 with the pointer and gamepad Phase 2 sets | [CORE-008](AUDIT-CORE.md#core-008) | — |
| Core 13 | **`$.clearEvents()` clears every screen (I10, breaking, approved 2026-09-27).** `$.clearEvents()` passes no screen to the clear handlers, so per-screen handlers are cleared on every screen; a screen's `clearEvents()` still passes itself. The plugin API does not change: clear handlers already treat no screen as every screen. Tests: pointer handlers on two screens cleared by each form, and the keyboard prompt rule of I10. Lands before the pointer Phase 2 set (pointer 2.6) | — | — |

Core 3 (document that `clearEvents()` reaches handlers a plugin registers through the public
input commands, CORE-004, in place of the rejected C4) and C10 (the characters each built-in
font draws, CORE-014) are written in the release phase (R.2).

**Exit criteria:** every accepted CORE finding is fixed or explicitly deferred. No core task is
left open except C10's Latin-1 mapping, which is deferred to a later release.

### 3.4 Compatibility summary

Input to `UPGRADE-V2.3.md` (R.4):

- **C7 (breaking):** "`set()` now throws `INVALID_OPTION` for an option it does not recognize,
  including options from plugins that are not loaded. Remove the option, fix its spelling, or
  load the plugin that provides it."
- **Core 13 (breaking):** "`$.clearEvents()` now clears mouse, touch, press, and click handlers
  on every screen, not only the active one. Call `clearEvents()` on a screen to clear only that
  screen."
- **C3:** "The standalone plugin entry points (`pijs-web/plugins/…`) are for Lite. Loading one
  that the Full bundle already includes throws `DUPLICATE_PLUGIN`."
- **C5:** "TypeScript projects using `nodenext` module resolution now get the package's types.
  Lite projects that load a plugin get that plugin's command, screen command, and setting
  types. The standalone declarations of the plugins that Full bundles type them for Lite only.
  The global `pi` and `$` are declared by the Full declarations only, so Lite projects use
  the module's exports."
- **C2:** a plugin whose initialization fails leaves nothing installed, and its name can be
  registered again. `getPlugins()` reports each plugin's `state`, and registering after
  initialization throws `REGISTRATION_CLOSED`.

## 4. Sound

Design: [DESIGN-SOUND.md](DESIGN-SOUND.md) (Phases 0–6) and
[DESIGN-SOUND-ADVANCED.md](DESIGN-SOUND-ADVANCED.md) (Phases 7–10). Phases 0–9 are done
([Section 13.4](#134-sound)).

### 4.1 Phase 9: game features

Done ([Section 13.4](#134-sound)). Its listening check is in the
[release checklist](#83-manual-release-checks).

### 4.2 Phase 10: sample instruments

Design: [DESIGN-SOUND-ADVANCED §7](DESIGN-SOUND-ADVANCED.md#7-phase-10-sample-instruments).

| # | Task | Status |
| --- | --- | --- |
| 10.1 | Core `getAudioBuffer` service member, contract test, member pin update, size entry | — |
| 10.2 | Sample source factory, per-name registration, pitch by playback rate, and detune | — |
| 10.3 | `defineInstrument` `audio`, `rootFrequency`, and `loop` options, validation, and not-ready behavior. Closes D15 | — |
| 10.4 | Metadata, types, and a sample instrument in the demo | — |

**Exit criteria:**

- An offline render of a sine sample shows the expected pitch for notes across three octaves,
  and the envelope and loop behavior match the synthesized case.
- Vibrato on a sample instrument modulates its pitch.
- Not-ready files play silence with one warning, never an error.
- A size entry, and the listening check (Section 8.3).

### 4.3 Phase 11: test upkeep

The test audit's sound handoffs ([AUDIT-TESTS §5.1](AUDIT-TESTS.md#51-sound)). They change only
tests, so they can continue after 2.3.0 (Section 10).

| # | Task | Status |
| --- | --- | --- |
| 11.1 | One Firefox process per test stage instead of one per audio suite (about 20 s of the sound browser time), or a smaller Firefox subset in `npm test` with the full set in `test:firefox` | — |
| 11.2 | Skip at the suite level when an engine lacks Web Audio or offline `suspend()`, instead of per test, so the report stays readable | — |
| 11.3 | One shared `near()` helper for the `sound-advanced`, `sound-envelope`, `sound-play`, and `sound-samples` Node tests | — |
| 11.4 | Decide whether `test/scripts/record-sound-references.js` and `test/media/sound-2.2/` are still needed, and remove them if not | — |
| 11.5 | Review the `sound-*` Node and `audio-*` browser test pairs against the Node/browser rule (Section 1.3) | — |

### 4.4 Compatibility summary

The upgrade guide's sound entries come from
[DESIGN-SOUND §11](DESIGN-SOUND.md#11-compatibility-summary) (core
`sound` 2.0.0) and
[DESIGN-SOUND-ADVANCED §10](DESIGN-SOUND-ADVANCED.md#10-compatibility-summary)
(the expansion). Each task that changes the sound API keeps them current.

## 5. Keyboard

**Approved 2026-09-27.** Findings: [AUDIT-KEYBOARD.md](AUDIT-KEYBOARD.md). Proposals
A1–A17: [AUDIT-KEYBOARD §4](AUDIT-KEYBOARD.md#4-proposed-api). Probe IDs (K1, K9n, …) name the
reproductions in `docs/evidence/keyboard-2.3/probes.js`, where each test starts. The probe
script builds the removed `print-table` and `onscreen-keyboard` plugins, so it no longer runs as
written; tests are written from its probe code. Baseline: 1.0.0, 3,110 bytes gzipped.

The order differs from the audit's recommendation in one way. Validation (A7) moves from
Phase 1 to Phase 2, so it lands once with the I11 error codes instead of twice.

### 5.1 Phase 1: fixes and tests

No API change; the version stays 1.0.0. Pure logic tests go in `keyboard-lifecycle.test.js`,
whose `vm` harness maps arguments with core's `parseOptions` and dispatches events through the
plugin's listeners (task 1.1). Phase 1 is done: tasks 1.1–1.13 ([Section 13.6](#136-keyboard)); its size is in `docs/evidence/keyboard-2.3/`.

| # | Task | Findings | Status |
| --- | --- | --- | --- |

**Exit criteria:** KEY-001, KEY-002, KEY-004, KEY-005, KEY-008, KEY-012, KEY-018, KEY-019, and
CI-008 fixed with tests; the Phase 1 parts of KEY-003, KEY-006, KEY-011, and KEY-013 fixed with
tests (their Phase 2 tasks complete them); KEY-017's metadata corrected; `npm test` green; size
recorded in `docs/evidence/keyboard-2.3/`.

### 5.2 Phase 2: API (breaking set, 2.0.0)

Built on one branch and landed as a set (Section 1.4). Each task updates metadata, declarations,
signature tests, and every demo, fixture, manual page, and `tools/` page (`charedit.html`,
`dataedit.html`) that uses the changed command, plus `test/scripts/firefox-smoke.js`,
`test/scripts/package-types-consumer.test.js`, and the evidence `device-check.html` that
Section 8.3 uses.

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| 2.1 | **Renames and 2.0.0 (I1, I16).** `inkey`, `onkey`, `offkey` become `inKey`, `onKey`, `offKey`, with the old names in `_removed.toml`. The banner moves to 2.0.0 | — | — |
| 2.2 | **Handler signature and removal (I2, I4, A14).** `onKey( key, mode, fn, once, allowRepeat )`; `offKey( key, mode, fn )` matches key set, mode, and function only, and its old `once` and `allowRepeat` arguments are ignored (§1.2); `offKey( key, mode )` removes every handler of the mode; `offKey( key, null, fn )` and the object form without `mode` remove from both modes; `offKey( key )` throws `INVALID_MODE`; duplicate registrations are ignored. Metadata examples use codes for game controls (I14). Test: removal forms (K5) | [KEY-007](AUDIT-KEYBOARD.md#key-007) | — |
| 2.3 | **Start and stop (I5, A13).** Listeners, including `blur` and `visibilitychange`, attach on first use, not at plugin load; `setActionKeys()` and `set( { actionKeys } )` count as first use; `stopKeyboard()` holds until `startKeyboard()`; reads return empty state while stopped. Test: each start trigger, and handlers not called while stopped | [KEY-006](AUDIT-KEYBOARD.md#key-006) | — |
| 2.4 | **Cancelled input (I6).** Blur, a hidden page, stop, an event from an editable target, and a prompt taking the keyboard dispatch `"up"` with `cancelled: true` for each held key. Key data carries `cancelled`, `false` unless cancelled; a cancelled `"up"` copies the last keydown's fields with `repeat: false`. Test: each trigger, and no second release | [KEY-011](AUDIT-KEYBOARD.md#key-011) | — |
| 2.5 | **Reads and dispatch (I7, I8, I9).** `inKey()` returns a frozen array replaced when the state changes; `inKey( key )` returns the object or `null`; dispatch follows I8, so state is updated first and handler errors go to `console.error` instead of a rethrow. Combination `"up"` handlers follow I8's release rule. Test: the SYS-011 keyup test keeps its combination and gains `inKey( "a" ) === null` inside the handler | [KEY-013](AUDIT-KEYBOARD.md#key-013) | — |
| 2.6 | **`clearEvents` scope (I10, A15).** `clearEvents( "keyboard" )` clears every keyboard handler from any screen; the prompt follows I10 and task 1.3. Test: both forms, with prompts on two screens | [KEY-016](AUDIT-KEYBOARD.md#key-016) | — |
| 2.7 | **Validation (A7, I11).** `mode` must be `"up"` or `"down"`; `key` a non-empty string or array of them, copied and de-duplicated; action keys strings; `once` and `allowRepeat` booleans; `maxLength: undefined` means no limit (with Core 6's `undefined` mapping); `inKey()` rejects non-strings. Codes from the I11 table. Tests: validation and combination arrays (K3, K4, K6, K20) | [KEY-009](AUDIT-KEYBOARD.md#key-009), [KEY-010](AUDIT-KEYBOARD.md#key-010) | — |
| 2.8 | **Prompt keys withheld (A11).** While a prompt is active, its keys do not reach `onKey()` handlers or `inKey()`. Keys held when the prompt starts are released as 2.4 describes. Test: a key held across the prompt's start | [KEY-003](AUDIT-KEYBOARD.md#key-003) | — |
| 2.9 | **`setActionKeys()` replaces (A12).** The command and `set( { "actionKeys": … } )` replace the set; `removeActionKeys()` is unchanged. Test: replacing sets (K20), updating task 1.11's test | [KEY-014](AUDIT-KEYBOARD.md#key-014) | — |

**Exit criteria:** every Phase 2 item in, `npm test` green, the compatibility summary complete,
and size recorded.

### 5.3 Phase 3: additive and release inputs

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| 3.1 | **Composed, pasted, and mobile text (A16).** A hidden, focused text field while a prompt is active, for IME composition, paste, and mobile soft keyboards; its events bypass the editable-target filter. Measure its size | [KEY-015](AUDIT-KEYBOARD.md#key-015) | — |
| 3.2 | **Release inputs.** Complete the compatibility summary below, add the plugin's open device checks to Section 8.3, and record the final size | — | — |

**Exit criteria:** KEY-015 fixed with tests, `npm test` green, the compatibility summary
complete, and the final size recorded.

### 5.4 Compatibility summary

Input to `UPGRADE-V2.3.md` (R.4), completed by task 3.2:

- **Renames (I1):** `inkey` → `inKey`, `onkey` → `onKey`, `offkey` → `offKey`. The old names
  are unregistered (I16).
- **`offKey()` (I4):** matches on key, mode, and function only; `once` and `allowRepeat` are
  ignored. `offKey( key, mode )` removes every handler of that mode, and `offKey( key )` throws.
  Registering the same function for the same key and mode again does nothing, so code that
  registered twice now runs once.
- **Start rule (I5):** the plugin starts on first use; `stopKeyboard()` holds until
  `startKeyboard()`.
- **Cancelled releases (I6):** blur, a hidden page, `stopKeyboard()`, typing into a text field,
  and an `input()` prompt release held keys through `"up"` handlers with `cancelled: true`. Key
  data has a `cancelled` field.
- **Dispatch (I8):** state is updated before handlers run, so `inKey()` inside an `"up"` handler
  no longer reports the released key. A handler that throws is reported with `console.error`
  instead of being rethrown, so `window` error listeners no longer see it.
- **Errors (I11):** validation throws `TypeError` or `RangeError` with per-parameter codes
  instead of `INVALID_PARAMETERS`. `inKey( "" )` and `inKey( 0 )` now throw instead of returning
  the list.
- **A11:** "Keys typed into an `input()` prompt no longer reach `onKey()` handlers or `inKey()`.
  Handle the prompt's result instead of watching for Enter."
- **A12:** "`setActionKeys()` replaces the action keys. Pass every key in one call, or use
  `removeActionKeys()` to remove some."
- **A10 and I7:** not breaking for documented use. Code that wrote to a key data object or the
  array from `inKey()` now fails silently, or throws in strict mode.

## 6. Pointer

**Approved 2026-09-27.** Findings: [AUDIT-POINTER.md](AUDIT-POINTER.md). Proposals B1–B13:
[AUDIT-POINTER §4](AUDIT-POINTER.md#4-proposed-api). Probe IDs (P1, T1, …) name the
reproductions in `docs/evidence/pointer-2.3/probes.js`. The probe script builds the removed
`print-table` and `onscreen-keyboard` plugins, so it no longer runs as written; tests are written
from its probe code. Baseline: 1.0.0, 3,951 bytes gzipped.

Dispatch logic tests go in `pointer-events.test.js`, whose harness (task 1.1) drives `mouse.js`,
`touch.js`, and `press.js` against fake `window`, `document`, and canvas objects; event wiring
goes in `pointer-browser.test.js`. Two changes from the audit's order: validation (B9) moves to
Phase 2 to land once with I11, and the steps that updated `onscreen-keyboard` and `pi-vision`
are dropped, since both plugins are removed.

### 6.1 Phase 1: fixes and tests

No breaking change; the version stays 1.0.0. B3 and B4 keep today's data shape here, plus the
additive `cancelled` field (I6); the action names change in Phase 2. Phase 1 ships even if
Phase 2 is cut, so its release fixes stand on their own. Done: 1.1–1.7
([Section 13.7](#137-pointer)).

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| 1.8 | **Metadata and manual pages.** Correct the metadata for current behavior; the Lite declaration gap is closed by Core 4. Make the manual pointer pages that keyboard 1.12 does not own load cleanly. Test: Lite with the standalone plugin (P16) | [PTR-015](AUDIT-POINTER.md#ptr-015), [PTR-016](AUDIT-POINTER.md#ptr-016) | — |
| 1.9 | **Fixtures.** Make `inpress_01` and `intouch_01` deterministic on CI runners and remove their `ciSkip`. Merge the near-duplicate fixtures: `onpress_01`, `onpress_02`, and `ontouch_04` run identical scripts, `onmouse_03` repeats them without touch, and `inmouse_01`, `intouch_01`, `inpress_01`, and `onmouse_01` repeat one drag. Keep `intouch_01`, the COV-001 contract fixture; in each other duplicate group keep one fixture and log the rest in `test/TEST-CONSOLIDATION-LOG.md`. Remove the three duplicate tests that TEST-014 and TEST-015 moved: `pointer-browser.test.js:25` (repeats the `pointer_lifecycle_01` visual), `pointer-browser.test.js:143` (repeats `:105`), and `pointer-events.test.js:34`. Add tests for `offtouch`, and a second for `offclick`, `offpress`, and `setEnableContextMenu`, in the 1.1 harness. Remove the manual pages `ontouch_01` and `ontouch_02` where the automated fixtures cover them; keep `ontouch_03` and `events_comprehensive`, which the Section 8.3 touch checks use | [PTR-017](AUDIT-POINTER.md#ptr-017), [CI-008](AUDIT-CI.md#ci-008), [AUDIT-TESTS §5.2](AUDIT-TESTS.md#52-pointer) | — |

**Exit criteria:** PTR-001–011, PTR-016, and PTR-017 fixed with tests; PTR-012's hit-box part
fixed with tests (2.8 completes it); PTR-015's metadata corrected (R.2 and R.3 complete it); no
pointer fixture carries `ciSkip`; `npm test` green; size recorded in `docs/evidence/pointer-2.3/`.

### 6.2 Phase 2: Pointer Events and API (breaking set, 2.0.0)

Built on one branch and landed as a set. Each task updates metadata, declarations, signature
tests, and the demos, fixtures, and manual pages that use the changed command, plus the `tools/`
pages, `scripts/validate-type-definitions.js`, `test/scripts/firefox-smoke.js`,
`test/scripts/package-types-consumer.test.js`, `test/unit/plugin-installation-browser.test.js`,
and the evidence `device-check.html` that Section 8.3 uses. Core 8 and Core 13 land first.

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| 2.1 | **Renames and 2.0.0 (I1, I16).** `inMouse`, `onMouse`, `offMouse`, `inTouch`, `onTouch`, `offTouch`, `inPress`, `onPress`, `offPress`, `onClick`, `offClick`, with the old names in `_removed.toml`. The banner moves to 2.0.0 | — | — |
| 2.2 | **One Pointer Events path (B6).** `pointerdown`/`pointermove`/`pointerup`/`pointercancel` on the canvas with `setPointerCapture()`, and `touch-action` instead of `preventDefault()` on `touchstart`. Mouse commands observe mouse and pen, touch commands touch, press the primary pointer. `pointercancel` releases with `cancelled: true` (I6). `setPointerCapture()` is guarded for pointers the browser does not track. Replaces only the Phase 1 window listener; the hidden-page and stop releases stay. The visual runner and `pointer-browser.test.js` move from synthetic `TouchEvent`s to pointer events or CDP touch input, with `test/README.md` updated | [PTR-004](AUDIT-POINTER.md#ptr-004), [PTR-006](AUDIT-POINTER.md#ptr-006) | — |
| 2.3 | **One data shape and modes (B7, I3).** `{ x, y, lastX, lastY, buttons, action, type, id, cancelled }` for mouse, touch, and press, with press data adding `touches`, frozen copies of the active touches; modes `"down"`, `"move"`, `"up"`; `onTouch( "start" )` and `"end"` throw `INVALID_MODE`; click data has `action: "click"`. Test: data shapes, including serializing `inPress()` (P12) | [PTR-013](AUDIT-POINTER.md#ptr-013) | — |
| 2.4 | **Handler signature and removal (I2, I4).** `onClick( fn, once, hitBox, customData )`; `offX( mode )` and `offX( null, fn )` forms; `offX()` with neither throws `INVALID_MODE`; `offClick()` without a function removes every click handler of the screen (implied mode); duplicate registrations are ignored, so the 1.1 duplicate-`once` test changes | [PTR-009](AUDIT-POINTER.md#ptr-009) | — |
| 2.5 | **Start, stop, and reads (I5, I7, I8, I9, B13).** Tracking starts on first use; data objects frozen and created once per event; list reads return frozen arrays replaced on change; `inMouse()` and `inPress()` return `null` before the first event and while stopped. Test: no allocation per read (P15) | [PTR-010](AUDIT-POINTER.md#ptr-010) | — |
| 2.6 | **`clearEvents` scope (I10).** `"click"` becomes its own type; `"press"` no longer clears clicks; `$.clearEvents()` clears every screen through Core 13, and the plugin's no-screen branch is tested. Test: both forms on two screens | — | — |
| 2.7 | **Gesture settings (B10, I12).** `setContextMenu( isEnabled )` replaces `setEnableContextMenu`; the menu is suppressed from screen creation (I5), and `setContextMenu()` no longer starts mouse tracking. The canvas gets `touch-action: none` when touch or press tracking starts on its screen, including `noCss` screens; `setPinchZoom( isEnabled )` becomes a screen command that sets the canvas `touch-action` at any time, never `<body>`. The old option `enableContextMenu` fails through Core 8. Test: context-menu default, `touch-action` before and after tracking, pinch zoom on the canvas (P13, P14) | [PTR-014](AUDIT-POINTER.md#ptr-014) | — |
| 2.8 | **Validation (B9, I11).** `isEnabled` and `once` must be booleans or omitted; the existing plain `Error`s for mode, function, and hit box become `TypeError` or `RangeError`; codes from the I11 table | [PTR-012](AUDIT-POINTER.md#ptr-012) | — |

**Exit criteria:** every Phase 2 item in, `npm test` green, the compatibility summary complete,
and size recorded.

### 6.3 Phase 3: additive and release inputs

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| 3.1 | **Wheel input (B11).** `onWheel( fn, once, hitBox, customData )` and `offWheel( fn )`, deltas normalized to pixels, page scrolling prevented while a wheel handler is registered for the screen, and a `"wheel"` type for `clearEvents()`. Estimated 200–300 bytes gzipped | — | — |
| 3.2 | **Release inputs.** Complete the compatibility summary below, add the open device checks to Section 8.3, and record the final size. The new plugin README is written in R.3 | — | — |

### 6.4 Compatibility summary

Input to `UPGRADE-V2.3.md` (R.4), completed by task 3.2:

- **Renames (I1):** every mouse, touch, press, and click command moves to camelCase, and
  `setEnableContextMenu` becomes `setContextMenu` (I12). The old names are unregistered.
- **B7 and I3:** "Press, touch, and click data share one shape. Touch handlers use the modes
  `"down"`, `"move"`, and `"up"` instead of `"start"`, `"move"`, and `"end"`; `lastX` and
  `lastY` start at the current position instead of `null`; click data has `action: "click"`.
  `inPress().touches` holds copies, so it no longer contains the press object itself."
- **B10:** "`setPinchZoom()` is a screen command and sets `touch-action` on that screen's
  canvas; it no longer changes `<body>`. The context menu is suppressed from screen creation."
- **B6 observable changes:** pen input is reported with `type: "pen"`; a drag that leaves the
  canvas keeps reporting moves.
- **Phase 1 fixes (B3, B4, B5, B8, PTR-008):** touch handlers receive the touches the event
  changed, so `"end"` handlers receive the touch that lifted, and hit boxes test those touches;
  each touch in `intouch()` keeps its own action; a touch the browser cancels calls the `"end"`
  and press `"up"` handlers with `cancelled: true` and never clicks; a drag released outside the
  canvas reports its release, and a release for a button or touch that is not held is ignored;
  blur no longer resets polled state, and hiding the page or a stop command calls the `"up"`
  handlers with `cancelled: true`; press follows only the primary touch;
  a click needs the same pointer's down and release inside its box, and each finger clicks on
  its own; right and middle buttons no longer click; a press that starts on the canvas border or
  padding is ignored, and a drag that starts off the screen reports no buttons; hit boxes accept
  fractional values, and a negative hit-box size throws.
- **I4:** registering the same function for the same mode again does nothing; `offX( null, fn )`
  removes a function from every mode; `offX()` with neither argument throws.
- **I7 and I9:** data objects and list arrays are frozen; `inMouse()` and `inPress()` return
  `null` before the first event.
- **I10:** `clearEvents( "press" )` no longer clears click handlers; use `"click"`.
- **I12:** `set( { enableContextMenu } )` becomes `set( { contextMenu } )`, and
  `set( { pinchZoom } )` needs a screen.
- **Errors (I11):** validation throws `TypeError` or `RangeError` with per-parameter codes instead
  of plain `Error`; `"false"` and other non-booleans for `isEnabled` and `once` throw instead of
  being coerced.
- **B11:** additive; no upgrade entry.

## 7. Gamepad

**Approved 2026-09-27.** Findings: [AUDIT-GAMEPAD.md](AUDIT-GAMEPAD.md). Proposals A1–A12:
[AUDIT-GAMEPAD §4](AUDIT-GAMEPAD.md#4-proposed-api). Probe IDs (P1, P5b, …) name the
reproductions in `docs/evidence/gamepad-2.3/probes.js`. Baseline: 1.0.0, 1,428 bytes gzipped.

Pure logic tests go in `gamepad-validation.test.js`, whose `vm` harness scripts pads and frames;
task 1.1 moves it onto the shared `vm-module-harness.js` and extends it to dispatch `window` and
`document` events (connection, `visibilitychange`) and to register `clearEvents` handlers.
`gamepad-validation-browser` keeps only bundle wiring. One change from the audit's order: helper
validation (A8) moves to Phase 2 to land once with I11.

### 7.1 Phase 1: fixes and tests

No API change; the version stays 1.0.0.

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| 1.1 | **One updater (A1).** First, the harness extension above. The polling loop is the only updater and accumulates edges every frame. A read is any `ingamepad()` call or pad helper call, including on a pad object the game kept; the first read in an animation frame takes the edges accumulated since the last frame with a read, and every other read in that frame, from any code, sees the same result. A press and a release between two reads are both reported. `getAxisChanged` compares with the value at the previous read. The first read starts polling (I5) and runs one immediate update without edges. A newly recorded pad starts with every button released, so the press that exposed it is reported on the next read; connect handlers see the pad before that edge. Connection events do not consume edges. Tests: edges read every frame, every other frame, and from timers; a tap between reads; the exposing press (P1, P3b) | [PAD-001](AUDIT-GAMEPAD.md#pad-001), [PAD-017](AUDIT-GAMEPAD.md#pad-017) | — |
| 1.2 | **Visibility, not blur (A2).** Keep polling while visible; on `visibilitychange` to hidden, release every button, zero the axes, and clear edges. The first update after the page is visible again records the current state without edges, so a button held on return reads as pressed but not just pressed. Tests: blur and focus (P4), and a hidden page, which no probe covers | [PAD-002](AUDIT-GAMEPAD.md#pad-002) | — |
| 1.3 | **Dispatch isolation (A3).** Dispatch follows I8: handlers added during a dispatch run in the next one, a handler removed during a dispatch does not run later in it, and a `once` handler is removed before it runs; each handler in its own `try`; update the pad list before dispatch; schedule the loop before the start-up scan. Tests: throwing handlers, pad removal, handlers added during dispatch (P5, P5b, P6) | [PAD-003](AUDIT-GAMEPAD.md#pad-003) (P1), [PAD-004](AUDIT-GAMEPAD.md#pad-004), [PAD-007](AUDIT-GAMEPAD.md#pad-007) | — |
| 1.4 | **Connection replay (A4).** New connect handlers receive the pads already connected; no second dispatch for a tracked, connected index; each handler receives each connected pad once, so the start-up scan and the replay never both deliver to the same handler. Test: replay and duplicate events (P3, P7) | [PAD-005](AUDIT-GAMEPAD.md#pad-005), [PAD-006](AUDIT-GAMEPAD.md#pad-006) | — |
| 1.5 | **Stable live objects (A7).** Update `buttons`, each button, and `axes` in place; the list form reuses one array per frame. Test: stable objects and no per-frame allocation (P12) | [PAD-009](AUDIT-GAMEPAD.md#pad-009) | — |
| 1.6 | **Listeners on first start (A12).** Add the `visibilitychange` and connection listeners on the first start, and remove the `webkitGetGamepads` fallback. Tests: lifecycle, including start, stop, repeat start, reads and registration after stop (P8), asserting today's behavior that 2.3 changes; first tests for `startGamepad` and the connection handlers | [PAD-016](AUDIT-GAMEPAD.md#pad-016), [AUDIT-TESTS §5.4](AUDIT-TESTS.md#54-gamepad) | — |
| 1.7 | **Metadata and manual pages.** Correct the metadata for current behavior; the Lite declaration gap is closed by Core 4. Remove the extra plugin scripts from the manual gamepad pages that keyboard 1.12 does not own, and fix `gamepad_03`'s `if( m_gamepadIndex )`, which skips pad 0. Reduce `gamepad-validation-browser` to bundle wiring; it already runs Lite with the standalone plugin (P14b) | [PAD-014](AUDIT-GAMEPAD.md#pad-014), [PAD-015](AUDIT-GAMEPAD.md#pad-015) | — |

**Exit criteria:** PAD-001–007, PAD-009, PAD-015, PAD-016, and PAD-017 fixed with tests;
PAD-014's metadata corrected (R.2 completes it); `npm test` green; size recorded in
`docs/evidence/gamepad-2.3/`.

### 7.2 Phase 2: API (breaking set, 2.0.0)

Built on one branch and landed as a set. Each task updates metadata, declarations, signature
tests, and the pages that use the changed command: the manual gamepad pages,
`html-manual/clearevents_02`, `events_comprehensive`, and the evidence `device-check.html` that
Section 8.3 uses. Core 8 lands first.

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| 2.1 | **Rename and 2.0.0 (I1, I16).** `ingamepad` becomes `inGamepad`, with the old name in `_removed.toml`. The banner moves to 2.0.0 | — | — |
| 2.2 | **Connection handlers (A5, I2, I4, I8).** `onGamepad( mode, fn, once )` and `offGamepad( mode, fn )` with modes `"connect"` and `"disconnect"`, replacing `onGamepadConnected` and `onGamepadDisconnected`, which go in `_removed.toml` | [PAD-012](AUDIT-GAMEPAD.md#pad-012) | — |
| 2.3 | **Start, stop, and `clearEvents` (I5, I6, I10).** Polling starts on first use; `stopGamepad()` holds until `startGamepad()`, even when a handler is registered; `stopGamepad()` releases buttons, zeroes axes, and clears edges as a hidden page does, and the first update after `startGamepad()` has no edges; connection handlers are not called while stopped; `clearEvents( "gamepad" )` clears every handler from any screen. Tests, in the `vm` harness: stop and restart, handlers while stopped, `clearEvents` scope and the handlers left afterward (P9) | [PAD-012](AUDIT-GAMEPAD.md#pad-012) | — |
| 2.4 | **Return shapes (A6, I9).** `inGamepad()` always returns an array; `inGamepad( index )` returns the pad or `null`. Test: return shapes and index gaps (P11) | [PAD-010](AUDIT-GAMEPAD.md#pad-010) | — |
| 2.5 | **Validation (A8, I11).** Indices for `inGamepad()` and the helpers must be integers: a non-integer throws `TypeError` and a negative index `RangeError`, both `INVALID_INDEX`; a well-formed index with nothing behind it returns `false`, `0`, or `null`. `onGamepad` validates `mode`, `fn`, and `once`. Codes from the I11 table instead of `INVALID_PARAMETERS`. Test: helper validation and out-of-range values (P10) | [PAD-008](AUDIT-GAMEPAD.md#pad-008) | — |
| 2.6 | **Radial dead zone (A9, I12).** Radial for the two standard sticks, per-axis for other axes; `setGamepadSensitivity` becomes `setGamepadDeadZone` with option `gamepadDeadZone`, range 0 to under 1 (`RangeError`, `INVALID_DEAD_ZONE`), with the old name in `_removed.toml`; the old option fails through Core 8. The SYS-021 sensitivity tests move to `setGamepadDeadZone`. Test: dead-zone model per axis pair (P13) | [PAD-011](AUDIT-GAMEPAD.md#pad-011) | — |

**Exit criteria:** every Phase 2 item in, `npm test` green, the compatibility summary complete,
and size recorded.

### 7.3 Phase 3: additive and release inputs

| # | Task | Findings | Status |
| --- | --- | --- | --- |
| 3.1 | **Standard names (A10, I13).** Helper methods accept the I13 button and axis names; numbers still work | — | — |
| 3.2 | **Vibration (A11).** `vibrateGamepad( gamepadIndex, duration, strong, weak )` through `playEffect( "dual-rumble" )`, returning whether the pad supports it. Estimated under 150 bytes gzipped | — | — |
| 3.3 | **Release inputs.** Complete the compatibility summary below, add the open device checks to Section 8.3, and record the final size | — | — |

### 7.4 Compatibility summary

Input to `UPGRADE-V2.3.md` (R.4), completed by task 3.3:

- **Rename (I1):** `ingamepad` → `inGamepad`.
- **I2:** `onGamepadConnected( fn )` and `onGamepadDisconnected( fn )` become
  `onGamepad( "connect", fn )` and `onGamepad( "disconnect", fn )`, with `offGamepad()` to
  remove them.
- **A6:** "`inGamepad()` always returns an array, and `inGamepad( i )` returns `null` for a
  missing pad. Replace `if( pads )` checks with a length check, and `=== undefined` with
  `=== null`."
- **A9:** "`setGamepadSensitivity()` is now `setGamepadDeadZone()`, and
  `set( { gamepadSensitivity } )` is now `set( { gamepadDeadZone } )`. Stick values are
  measured radially, so diagonal movement near the center is no longer lost."
- **I16:** `ingamepad`, `onGamepadConnected`, `onGamepadDisconnected`, and
  `setGamepadSensitivity` are unregistered.
- **I5 and I6:** `stopGamepad()` holds even when a handler is registered, releases every button,
  and stops connection handlers until `startGamepad()`.
- **A1:** "just pressed", "just released", and "axis changed" report what happened since the
  previous read, shared by every reader in the same frame, so timer-driven and slower loops see
  every press.
- **A4:** a connect handler registered later receives the pads already connected. Code that also
  loops over `inGamepad()` to set up players can set one up twice.
- **A7 and I7:** pads, their `buttons` and `axes`, and the list are live objects updated in
  place. Copy them to keep a snapshot.
- **Errors (I11):** validation throws with per-parameter codes instead of `INVALID_PARAMETERS`.
  `getButton( "0" )` and other non-integer indices throw, and `setGamepadDeadZone( 1 )` throws
  where `setGamepadSensitivity( 1 )` was accepted.
- **A10 and A11:** additive; no upgrade entry.

## 8. Release

### 8.1 Entry criteria

- Every workstream in Sections 3–7 has met its exit criteria, or a cut is recorded under
  Section 10.
- Every accepted finding is fixed or explicitly deferred in its audit's Review Decisions.
- D13–D15 and every other open decision are closed (Section 9).
- `npm test` passes on Linux, macOS (report-only pixels), and Windows through `ci.yml`.

### 8.2 Tasks

| # | Task | Status |
| --- | --- | --- |
| R.1 | Confirm the entry criteria and record any deferrals in the owning documents | — |
| R.2 | Rewrite the `API.md` Sound and Music section and the Input sections (Keyboard; Mouse, Touch, and Press; Gamepad) to describe final behavior. Also: the `set()` and `removeScreen` text (Core 6, Core 8); that `clearEvents()` also removes handlers a plugin registers through the public input commands, written for plugin authors (Core 3, CORE-004); and the characters each built-in font draws and the one-cell-per-UTF-16-unit rule (C10, CORE-014) | — |
| R.3 | Update the `docs/llms/` references and examples, commit the regenerated `pi.d.ts`, and update the plugin READMEs: `sound-advanced` for the expansion commands, a new pointer README, keyboard, and `docs/GAMEPAD.md` (PAD-013). State that the standalone plugin entry points are for Lite (C3) | — |
| R.4 | Write `docs/UPGRADE-V2.3.md` from the compatibility summaries: core (Section 3.4), sound (Section 4.4), keyboard (5.4), pointer (6.4), gamepad (7.4), and plugin removal (13.1) | — |
| R.5 | Update `releases/pi-latest/README.md` and `CHANGELOG.md` (including the CI build note in Section 13.3), and point `releases/PUBLISH.md` at the 2.3 upgrade guide | — |
| R.6 | Verify that `package.json` (2.3.0), every plugin banner (`sound` 2.0.0, `sound-advanced` 1.0.0, `keyboard`, `pointer`, and `gamepad` 2.0.0), the release `package.json`, and the declaration headers agree, with `npm run release:check` | — |
| R.7 | Run `npm test` and `npm run test:firefox`, the manual checks in Section 8.3, then tag `v2.3.0` so `release.yml` drafts the release, create the snapshot with `npm run snapshot`, and publish the verified tarball by hand | — |

**Exit criteria:** every decision closed; the upgrade guide reviewed; `npm test` green and the
manual checks recorded; the `releases/pi-2.3.0` snapshot created.

### 8.3 Manual release checks

Checks that automated tests cannot cover, collected from every workstream. Record each result
in its workstream's evidence folder.

**Sound listening pass,** in Chromium, Firefox, and Safari:

- [ ] `sound_lab_01.html`: envelopes, limiter, noise, pan sweep, sweeps, the D1 prototype; WebKit
  envelope timing (Phases 1–2).
- [ ] `sound_samples_01.html`: samples, and the 64-slot budget by ear with mixed synth and
  sample load (Phase 3).
- [ ] `sound_play_01.html`: tune the default PLAY envelope (MA 15, MD 20, MH 65, MR 20) by ear,
  and a long song in a hidden tab (Phase 4).
- [ ] `sound_advanced_01.html`: synth features, presets, instruments, bus effects, level meter
  (Phase 5); recording and saving a WAV (Phase 7); new effects and chains (Phase 8); generator
  categories across seeds, and the beat-synced visual watched against the music in each
  engine, including a tab hidden mid-song (Phase 9); a sample instrument (Phase 10).
- [ ] Autoplay unlock on desktop and on an iOS or Android device.
- [ ] A stream instance deferred while locked starts on the unlocking gesture, in desktop Safari
  or on iOS.
- [ ] iOS mute switch behavior under the `"ambient"` session (D5).

**Input device pass:**

- [ ] Keyboard: a non-US layout with AltGr; an input method (IME) and a mobile soft keyboard
  (A16); Safari and macOS Meta, if macOS hardware is available.
- [ ] Pointer: the mouse pass in Firefox and Safari; touch and multi-touch on a phone or tablet
  (PTR-002, PTR-003); `touchcancel` from a system gesture (PTR-005); pinch zoom with
  `setPinchZoom` on and off (PTR-014); compatibility mouse events after a tap; long-press
  context menu; iOS double-tap zoom; pen input. Use `html-manual/events_comprehensive` and
  `ontouch_03`.
- [ ] Gamepad: re-check PAD-001, PAD-002, and PAD-017 in Chrome and Firefox with a controller;
  Safari, if macOS hardware is available; `vibrateGamepad()` in Chrome (A11).

**Other:** a hardware-GPU check of the visual demos, and baseline approval for any fixture
re-recorded during the release.

## 9. Decisions

### 9.1 Release decisions

All closed.

| ID | Decision | Outcome |
| --- | --- | --- |
| G1 | Input plugin versions after breaking changes | **Closed 2026-09-25:** each plugin moves to 2.0.0 with its first breaking change, as `sound` did: the I1 renames that open its Phase 2 |
| G2 | Whether the input conventions apply to `onscreen-keyboard` and `pi-vision` | **Closed 2026-09-25 (I15):** no; they are removed |
| G3 | Aliases for renamed input commands | **Closed 2026-09-25 (I16):** no aliases. Renamed commands are unregistered and fail at their first call; the upgrade guide lists every rename |
| G4 | How visual baselines work across platforms | **Closed 2026-09-26:** one baseline set, with Chromium pinned to SwiftShader (`--disable-gpu --enable-unsafe-swiftshader`). Pixel comparisons are required on Linux and Windows, whose captures match, and report-only on macOS, whose SwiftShader backend differs on 2 fixtures ([AUDIT-CI Q2](AUDIT-CI.md#q2-how-should-visual-comparison-work-across-platforms)) |
| G5 | Whether CI must be running before 2.3.0 ships | **Closed 2026-09-26:** no. Moot: CI has run since CI 3.3 |
| G6 | How much of publishing is automated | **Closed 2026-09-26:** on a version tag, CI verifies the build and tests, packs the tarball, and attaches it to a draft GitHub release. `npm publish` stays manual for 2.3.0 |
| G7 | What happens to `onscreen-keyboard`, `pi-vision`, and their fixtures | **Closed 2026-09-25:** removed with `print-table` and `pens`, and all their fixtures and metadata (P.1–P.6). The fixtures went because their features went, not to make a suite pass |
| G8 | The Node floor in `engines` | **Closed 2026-09-26:** `>=22`, since Node 18 and 20 are past end of life and CI tests 22 (CI 2.7) |

### 9.2 Other decision records

- **Input conventions I1–I16:** Section 2.
- **Sound D1–D6:** [DESIGN-SOUND §12](DESIGN-SOUND.md#12-decisions), all resolved.
- **Sound expansion D7–D17:**
  [DESIGN-SOUND-ADVANCED §11](DESIGN-SOUND-ADVANCED.md#11-decisions). Open: D13 and D14
  (closed by Sound 9.3) and D15 (closed by Sound 10.3).
- **Finding decisions:** the Review Decisions section of each audit.

## 10. Scope-Cut Order

If the schedule slips, cut in this order. Earlier items go first.

1. **Test upkeep:** Sound 11.1–11.5 and the test-only parts of Core 12. They do not change the
   package and can continue after 2.3.0.
2. **Sound Phase 10**, sample instruments. The `getAudioBuffer` service member is not added.
3. **Sound 9.3–9.4 music sync.** The generator ships; the `observePlay` service member (9.2)
   stays in core.
4. **Input additive items:** keyboard A16, pointer B11, gamepad A10 and A11 move to 2.3.x.
5. **Single breaking items,** each with its fallback:
   - Keyboard A12: `setActionKeys()` keeps adding, and the documentation says so.
   - Pointer B6: B5 keeps its window listeners, and B10 keeps `preventDefault()` with a
     per-screen flag.
   - Gamepad A9: the dead zone keeps its name and gains the radial model as a fix.
6. **Core:** C8, then Core 13 (`$.clearEvents()` keeps clearing only the active screen, and
   I10 says so), then C11's changelog item. Other P3 findings are deferred; P1 and P2 findings
   are fixed or accepted as known issues.
7. **An input plugin's Phase 2 as a set.** Its breaking changes move to the next minor release
   together, so users update each API once. Its Phase 1 fixes and Phase 3 additive items still
   ship in 2.3.0; Phase 3 items that validate input use the I11 codes either way.

Not cut: the input plugins' Phase 1, Core 4, Core 5 (CORE-001), and Core 8 (C7), which the I16
rule for renamed options depends on. If Core 8 has to be cut anyway, its fallback is that the
pointer and gamepad plugins register their old setter names (`setEnableContextMenu`,
`setGamepadSensitivity`) as commands that throw an error naming the new command, which also
covers the old `set()` options.

## 11. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Breaking changes in four plugins at once | Large upgrade effort for existing games | One upgrade guide; shared conventions; loud errors; each plugin's breaking changes ship as a set |
| Input behavior depends on devices and browsers | Tests pass but real devices misbehave | Synthetic-event tests for logic; the manual device pass (Section 8.3); audits record what cannot be automated |
| Removed plugins are still in use | Games that load a removed plugin lose it | Accepted (G7). None was in the release package; the upgrade guide points to the `v2.2.0` source |
| Full-build size growth | `pi.min.js` grows beyond the sound targets | Size at every phase exit; the sound size order in [DESIGN-SOUND-ADVANCED §8](DESIGN-SOUND-ADVANCED.md#8-size) |
| Sound expansion delays the release | The release waits on sound | Expansion phases are cut independently (Section 10) |
| A merged or removed test was the only check of a behavior | A regression goes unnoticed | The removal rules in Section 1.3 |

Sound design risks are in [DESIGN-SOUND §13](DESIGN-SOUND.md#13-risks) and
[DESIGN-SOUND-ADVANCED §12](DESIGN-SOUND-ADVANCED.md#12-risks).

## 12. Out of Scope for 2.3

- Redesigning `polygons`.
- New input device types, such as MIDI, WebXR controllers, or motion sensors.
- A full rendering re-audit or a new performance campaign.
- Replacing the test frameworks (Playwright and `node:test`).
- A core frame hook for input plugins (C9); a self-hosted GPU runner; a `safaridriver`
  harness; a nightly CI workflow.
- Sound items listed in [DESIGN-SOUND §14](DESIGN-SOUND.md#14-out-of-scope-for-23) and
  [DESIGN-SOUND-ADVANCED §9](DESIGN-SOUND-ADVANCED.md#9-out-of-scope-for-23).

## 13. Completed Work

One row per task. The details are in git history and the pull requests.

### 13.1 Plugin removal

Done 2026-09-26. Exit criteria met: `npm test` green with the six fixtures removed, and a clean
build produces no output for the removed plugins.

| # | Task |
| --- | --- |
| P.1 | Deleted `plugins/onscreen-keyboard/`, `pi-vision/`, `print-table/`, and `pens/` |
| P.2 | Deleted `metadata/plugin-onscreen-keyboard/` and `metadata/plugin-print-table/` |
| P.3 | Deleted the fixtures `onscreen_keyboard_01`–`04`, `pi_vision_01`, `table_01`, their baselines, and the manual page `pi_vision_window_01`; logged as feature removals in `test/TEST-CONSOLIDATION-LOG.md` |
| P.4 | Rewrote the tests that used the removed plugins as fixtures: the late-dependency test (now `sound-advanced` before `sound`) and `size.test.js` (now `example-plugin`) |
| P.5 | Fixed the remaining live references outside `docs/archive/`, `docs/evidence/`, and `releases/` |
| P.6 | Wrote the compatibility summary below |

**Compatibility summary** (input to R.4). None of the four plugins was part of the release
package, so projects that use the package's builds are not affected. The source of each remains
available at the `v2.2.0` tag.

| Removed plugin | What it provided | For projects that used it |
| --- | --- | --- |
| `onscreen-keyboard` | `showKeyboard()` and `hideKeyboard()`: a virtual keyboard for touch devices, drawn with `print-table`, that fed keystrokes to `input()` and the keyboard handlers | No replacement in 2.3. Build it from the `v2.2.0` source; it needs the pre-2.3 `keyboard` and `pointer` APIs |
| `pi-vision` | Retro character-cell windows and controls under `$.vis` | No replacement in 2.3. Build it from the `v2.2.0` source; it needs the pre-2.3 `pointer` API |
| `print-table` | `printTable( items, tableFormat, borderStyle, isCentered )`: ASCII tables with borders | No replacement in 2.3. Build it from the `v2.2.0` source |
| `pens` | Nothing: an incomplete, deprecated stub that registered no commands | None needed |

### 13.2 Tests

All 28 findings of [AUDIT-TESTS.md](AUDIT-TESTS.md) were accepted and applied on 2026-09-24.
`npm test` went from about 174 s to 135 s. The after metrics and deviations are in the
[evidence README](../../evidence/tests-2.3/README.md). Handoffs to other workstreams are tasks
in their sections: Core 10–12, Sound 11.1–11.5, Keyboard 1.1, 1.12–1.13, Pointer 1.9, and
Gamepad 1.6.

| ID | Outcome |
| --- | --- |
| TEST-001 | 74 orphan baselines removed |
| TEST-002 | Plugin copy of `polygon_01` removed |
| TEST-003 | `screen_overlaping` renamed `screen_draw_offscreen_01` |
| TEST-004 | `ownership-reentrancy` pair deleted; the shared-context test moved to `screen-lifecycle-browser` |
| TEST-005 | `numeric-boundaries-browser` merged into the Node table |
| TEST-006 | `color-validation-browser` 8 → 4 cases |
| TEST-007 | `arc-circle-browser` 8 → 4 cases |
| TEST-008 | `font-publication-browser` 14 → 6 cases |
| TEST-009 | `image-lifecycle-browser` 24 → 10 cases |
| TEST-010 | `alpha-composition-browser` 19 → 15 cases |
| TEST-011 | `batch-reservations-browser` 18 → 10 cases |
| TEST-012 | `context-recovery-browser` 52 → 24 cases |
| TEST-013 | `pixel-disposal-browser` 10 → 6 cases |
| TEST-014 | `patch-lifecycle` split into subject suites |
| TEST-015 | `patch-browser` split into subject suites |
| TEST-016 | `test:patch` removed |
| TEST-017 | Env-gated visual blocks removed |
| TEST-018 | Shared `useBrowserBundles()` browser helper |
| TEST-019 | Shared `vm-module-harness.js` Node loader |
| TEST-020 | Benchmark tests moved to `npm run test:benchmark` |
| TEST-021 | Benchmark manifest rename retried on Windows |
| TEST-022 | Visual runner waits cut |
| TEST-023 | Package metadata generated once |
| TEST-024 | `errors_01` and `errors_02` moved to assertions; message typo fixed |
| TEST-025 | Dead code in `paint_02` removed |
| TEST-026 | Manual pages removed or renamed |
| TEST-027 | Stale test documentation and configuration fixed |
| TEST-028 | 120 s timeout on the Node and browser stages |

### 13.3 CI/CD

Complete 2026-09-26 (CI milestones C1–C3). `ci.yml` was first green on `main` in run
36266162164; `release.yml`'s first manual run, 36276727365, drafted `v2.3.0` with the verified
tarball. Findings: [AUDIT-CI.md](AUDIT-CI.md).

| # | Task | Findings |
| --- | --- | --- |
| 1.1 | Pinned the Chromium renderer (`--disable-gpu --enable-unsafe-swiftshader`) in a shared launch helper and `playwright.config.js` | [CI-003](AUDIT-CI.md#ci-003) |
| 1.2 | Kept system fonts out of the `pointer_lifecycle_01` capture | [CI-004](AUDIT-CI.md#ci-004) |
| 1.3 | LF line endings everywhere (`.gitattributes`) | [CI-007](AUDIT-CI.md#ci-007) |
| 1.4 | Re-recorded every visual baseline once, after P.3 | [CI-009](AUDIT-CI.md#ci-009) |
| 2.1 | Case-only renames of `releases/PUBLISH.md` and `docs/GAMEPAD.md` | [CI-001](AUDIT-CI.md#ci-001) |
| 2.2 | Portable release snapshot (`npm run snapshot`) | [CI-002](AUDIT-CI.md#ci-002) |
| 2.3 | Realtime audio switch (`PI_AUDIO_REALTIME=0`) | [CI-005](AUDIT-CI.md#ci-005) |
| 2.4 | WebKit audio tolerances | [CI-011](AUDIT-CI.md#ci-011) |
| 2.5 | Visual report modal race | [CI-013](AUDIT-CI.md#ci-013) |
| 2.6 | Firefox WebGL on GPU-less machines (`PI_FIREFOX_HEADED`) | [CI-012](AUDIT-CI.md#ci-012) |
| 2.7 | Node 22 in `engines` (G8) | — |
| 2.8 | Report-only pixel mode (`PI_VISUAL_PIXELS=report`) | — |
| 2.9 | `ciSkip` for known flaky fixtures | [CI-008](AUDIT-CI.md#ci-008) |
| 3.1 | CI test settings: `retries: 1` with `failOnFlakyTests`, default workers | [CI-006](AUDIT-CI.md#ci-006) |
| 3.2 | Size diff script | — |
| 3.3 | Pull-request workflow `ci.yml` | [CI-010](AUDIT-CI.md#ci-010) |
| 3.4 | Firefox check in `ci.yml`; no nightly workflow | [CI-010](AUDIT-CI.md#ci-010) |
| 3.5 | Dependabot for GitHub Actions | — |
| 3.6 | Release workflow `release.yml` and `npm run release:check` | — |
| 3.7 | CI documentation in `test/README.md` and the publish guide | — |
| 3.8 | Required checks on `main` ([#12](https://github.com/AndyStubbs/pijs/pull/12)); documentation-only changes skip the test jobs ([#15](https://github.com/AndyStubbs/pijs/pull/15)) | — |
| 3.9 | GitHub CLI and pull-request practice (Section 1.4) | — |

**Compatibility summary.** No public API changes, so nothing goes in the upgrade guide. For the
changelog (R.5): built on Windows, `pi.min.js` and `pi.lite.min.js` lose about 134 bytes of `\r`
characters, so builds are identical on every platform. For contributors: Node 22 or later,
LF checkouts on Windows, and the test variables `PI_AUDIO_REALTIME`, `PI_VISUAL_PIXELS`, and
`PI_FIREFOX_HEADED`, all described in `test/README.md`.

### 13.4 Sound

Design section numbers refer to [DESIGN-SOUND.md](DESIGN-SOUND.md) for Phases 0–6 and
[DESIGN-SOUND-ADVANCED.md](DESIGN-SOUND-ADVANCED.md) for Phases 7–9. What later work builds on
is in [DESIGN-SOUND §15](DESIGN-SOUND.md#15-implementation-notes), and each phase's size is in
the [evidence README](../../evidence/sound-2.3/README.md).

**Phase 0: foundations (M1)**

| # | Task | § |
| --- | --- | --- |
| 0.1 | Build report for plugin bundles; `npm run size` with `build/size-report.json`; 2.2 baseline | 9.1 |
| 0.2 | Staged the 2.3 version and `metadata/pi-2.3/` | 9.2 |
| 0.3 | Resolved D6 (service API names) | 12 |
| 0.4 | `provideService()` / `getService()` | 4.3 |
| 0.5 | Firefox and WebKit projects for the audio browser tests | 10.3 |
| 0.6 | `OfflineAudioContext` render harness | 10.1 |
| 0.7 | Reference residual checks and calibrated tolerances | 10.2 |
| 0.8 | 2.2 reference renders | 10.3 |
| 0.9 | Split `sound.js` into modules with no behavior change | 4.1 |
| 0.10 | `sound_lab_01.html` scaffold | 10.3 |

**Phase 1: bus safety and envelope (M1)**

| # | Task | § |
| --- | --- | --- |
| 1.1 | Bus graph with effect slots and output gains | 5 |
| 1.2 | Bus-volume service method | 4.3.2 |
| 1.3 | `setVolume()` on the master gain only | 5.1 |
| 1.4 | Two-stage limiter and `setSoundLimiter()` | 5.2 |
| 1.5 | `envelope.js` | 6.2 |
| 1.6 | New `sound()` signature; `sound` 2.0.0 | 6.1, 9.2, 12 |
| 1.7 | `MIN_RAMP`, `SCHEDULE_LEAD`, single `stopVoice()` fade path | 6.2, 6.3 |
| 1.8 | Voice lifecycle states and caps; interim PLAY exemption | 6.3 |
| 1.9 | Occupancy-interval admission and stealing | 6.3 |
| 1.10 | Hard-cap cleanup order | 6.3 |
| 1.11 | Late requests | 8.1 |
| 1.12 | Autoplay unlock; resolved D3 | 5.3, 12 |
| 1.13 | Removed the `webkitAudioContext` fallback | 3 |

**Phase 2: core sound design (M2)**

| # | Task | § |
| --- | --- | --- |
| 2.1 | `noise.js` | 6.4 |
| 2.2 | White and pink noise in `sound()` | 6.1 |
| 2.3 | Conditional panner and `pan` | 5, 6.1 |
| 2.4 | `frequencyEnd` sweep | 6.1 |
| 2.5 | Sound lab controls for noise, pan, and sweep | 10.3 |
| 2.6 | Resolved D1 | 12 |

**Phase 3: sample engine (M2)**

| # | Task | § |
| --- | --- | --- |
| 3.1 | Decode-mode loading | 7.2 |
| 3.2 | Stream-mode loading | 5.3, 7.2 |
| 3.3 | Sample instances | 7.1, 7.3 |
| 3.4 | `stopAudio()`, `pauseAudio()`, `resumeAudio()` | 7.1, 7.3 |
| 3.5 | Position model and `setAudio()` in every state | 6.3, 7.3 |
| 3.6 | Per-mode `playbackRate` validation | 7.1 |
| 3.7 | Removed `poolSize` and pool terminology | 7.1, 11 |
| 3.8 | Rewrote the audio lifecycle tests | 10.3 |
| 3.9 | Stream-mode realtime browser test | 10.3 |
| 3.10 | `sound_samples_01.html`; resolved D5 | 10.3, 12 |
| 3.11 | Shared-cap admission and protected loops | 6.3 |
| 3.12 | Late samples | 8.1 |

**Phase 4: music engine (M2)**

| # | Task | § |
| --- | --- | --- |
| 4.1 | Scheduler for `play()` events with hidden-tab lookahead | 8.1 |
| 4.2 | `play()` on the scheduler; removed the interim PLAY exemption | 8.1 |
| 4.3 | `stopPlay()` for pending and active notes | 8.1 |
| 4.4 | Tokenizer rewrite | 8.2 |
| 4.5 | `registerPlayExtension` | 4.3.3, 8.2 |
| 4.6 | Immutable event snapshots | 4.3 |
| 4.7 | Default PLAY envelope | 8.2 |
| 4.8 | Late PLAY notes | 8.1 |

**Phase 5: `sound-advanced` 1.0.0 (M3)**

| # | Task | § |
| --- | --- | --- |
| 5.1 | Plugin scaffold | 4.2, 4.3 |
| 5.2 | Source, insert, bus, and tap contracts | 4.3 |
| 5.3 | `synth.js` filter and filter envelope | 9 |
| 5.4 | `synth.js` LFOs, pulse duty, arpeggio | 9 |
| 5.5 | `periodic-noise.js` | 9 |
| 5.6 | Public `setBusVolume()` (moved to core in 6.2) | 9 |
| 5.7 | Reverb and delay | 9 |
| 5.8 | `getSoundLevels()` | 9 |
| 5.9 | `sfx()`, `definePreset()`, built-in presets | 9 |
| 5.10 | `defineInstrument()` and `@n` | 9 |
| 5.11 | Plugin README, types, and demo | 10.3 |
| 5.12 | Froze service v1 | 4.3 |

**Phase 6: size review (M4)**

| # | Task | § |
| --- | --- | --- |
| 6.1 | Size review; resolved D4 (`setBusVolume()` is core) | 9.1, 12 |
| 6.2 | Applied the promotion; no full merge | 9.1 |

**Phase 7: recording** (design §3.1, §4)

| # | Task |
| --- | --- |
| 7.1 | Core output stage and `tapBus( "output" )` |
| 7.2 | Shared worklet loader |
| 7.3 | `wav.js` encoder |
| 7.4 | `recorder.js` |
| 7.5 | `saveRecording()` |
| 7.6 | `getSoundLevels( "output" )` |
| 7.7 | Metadata, types, and demo controls |

**Phase 8: bus effects** (design §5)

| # | Task |
| --- | --- |
| 8.1 | Effect stage builders |
| 8.2 | Effect chains |
| 8.3 | In-place updates |
| 8.4 | `"filter"` and `"distortion"` |
| 8.5 | `"chorus"` |
| 8.6 | `"bitcrush"` |
| 8.7 | Metadata, types, and demo controls |

**Phase 9: game features** (design §3.2, §6)

| # | Task |
| --- | --- |
| 9.1 | `generateSfx()` |
| 9.2 | Core `observePlay` service member |
| 9.3 | Music sync (`sync.js`): `onPlay( mode, fn, once )` and `offPlay( mode, fn )` with modes `"note"` and `"end"`, dispatched on animation frames at the audible time; notes more than 250 ms late dropped; `clearEvents( "play" )`. Closed D13 and D14 |
| 9.4 | Metadata and types for `generateSfx()`, `onPlay()`, and `offPlay()`; the generator panel and the beat-synced music sync panel in `sound_advanced_01.html`; the Phase 9 size entry |

### 13.5 Core

| # | Task | Findings | Ref |
| --- | --- | --- | --- |
| Core 1 | Transactional plugin installation and error routing (C2): registrations committed after installation succeeds; screen installation rolls back; `getPlugins()` reports `state`; registration after init throws `REGISTRATION_CLOSED` | [CORE-002](AUDIT-CORE.md#core-002), [CORE-006](AUDIT-CORE.md#core-006) | [#13](https://github.com/AndyStubbs/pijs/pull/13) |
| Core 2 | Documented the Lite-only plugin entry points (C3) in `plugins/README.md`, `plugins/polygons/README.md`, and `llms-full.txt`; the release README follows in R.3 | [CORE-003](AUDIT-CORE.md#core-003) | [#14](https://github.com/AndyStubbs/pijs/pull/14) |
| Core 4 | Declarations and release manifest (C5): `"type": "module"` in the release manifest; plugin declarations augment Lite, and `sound-advanced` both Full and Lite, through `PluginCommands`, `PluginScreenCommands`, and `PluginOptions`; object types only a plugin uses move from Lite to that plugin's declarations; Lite `Options` holds Lite settings only; the global `pi` and `$` are declared by Full only; `addCommand`'s `isScreenOptional` is optional and its JSDoc example is corrected; `Screen.removeScreen()` is declared. Type consumers compile under `bundler` and `nodenext`, including Lite with each exported plugin | [CORE-005](AUDIT-CORE.md#core-005), [CORE-015](AUDIT-CORE.md#core-015), [CORE-016](AUDIT-CORE.md#core-016), [CORE-017](AUDIT-CORE.md#core-017) | — |

### 13.6 Keyboard

| # | Task | Findings | Ref |
| --- | --- | --- | --- |
| 1.1 | Test harness: `keyboard-lifecycle.test.js` maps arguments with core's `parseOptions`, so both forms run, and dispatches key events through the plugin's `window` and `document` listeners with `target`, `composedPath()`, and `getModifierState()`, on a controllable clock. `keyboard-lifecycle-browser` keeps real `KeyboardEvent` dispatch, cursor rendering, and drawing after removal; two duplicate tests were removed (`test/TEST-CONSOLIDATION-LOG.md`) | [KEY-019](AUDIT-KEYBOARD.md#key-019), [AUDIT-TESTS §5.3](AUDIT-TESTS.md#53-keyboard) | [#21](https://github.com/AndyStubbs/pijs/pull/21) |
| 1.2 | Held state by code (A1): one table of held codes, each with the data of its latest keydown; a keyup releases by code whatever value it reports; a value lookup or combination is satisfied by any held code with that value, the latest press first. Tests: modifier released first, two keys with one value, `"Process"` (K1, K1b, K14) in `keyboard-lifecycle.test.js`, and native keys (K1n) in `keyboard-lifecycle-browser.test.js` | [KEY-001](AUDIT-KEYBOARD.md#key-001) (P1) | [#22](https://github.com/AndyStubbs/pijs/pull/22) |
| 1.3 | Prompt listener (A2): the prompt reads keys from its own capture `keydown` listener on `window`, added when it starts and removed when it ends, with the plugin's editable-target filter. `stopKeyboard()` and cleared key handlers no longer affect it; `clearEvents( "keyboard" )` cancels it only with no screen or from the owning screen. Tests: `clearEvents( "keyboard" )` from another screen, the owner, and no screen (K2); a prompt started and continued while stopped; keys from editable elements; no listener left after a prompt | [KEY-002](AUDIT-KEYBOARD.md#key-002), [KEY-006](AUDIT-KEYBOARD.md#key-006) | [#23](https://github.com/AndyStubbs/pijs/pull/23) |
| 1.4 | Prompt owns the keyboard (A3): while a prompt is active it prevents the default action of every keydown it handles, including Space, Tab, Backspace, Enter, and the arrows; keydowns with Ctrl or Meta are left to the browser unless AltGr is held, so they neither type nor are prevented, and Ctrl+V pastes; a `paste` listener, active only during the prompt, inserts the pasted text character by character by the typing rules, dropping control characters. Tests: default prevention, Ctrl, Meta, and AltGr, and paste into text and numeric prompts (K9) in `keyboard-lifecycle.test.js`; Space, Tab, and Ctrl+V with the native keyboard on a tall page (K9n) in `keyboard-lifecycle-browser.test.js` | [KEY-003](AUDIT-KEYBOARD.md#key-003) | [#24](https://github.com/AndyStubbs/pijs/pull/24) |
| 1.5 | Shadow-DOM editable targets (A4): the editable-target check, shared by the plugin's listeners and the prompt, reads the original target from `event.composedPath()[ 0 ]`, so keys typed into an input inside an open shadow root are ignored; a closed shadow root is judged by its host. Tests: a retargeted event in `keyboard-lifecycle.test.js`, and a real open shadow root with the native keyboard (K12) in `keyboard-lifecycle-browser.test.js` | [KEY-004](AUDIT-KEYBOARD.md#key-004) | [#25](https://github.com/AndyStubbs/pijs/pull/25) |
| 1.6 | Prompt layout (A5): the prompt captures one print line at the print cursor's height, from its start to the right edge of the view; it keeps to that line by showing the end of a long value, with room left for the cursor; after it ends, printing continues at column 0 of the line below. Tests: capture size, line advance, and scrolled value in `keyboard-lifecycle.test.js`, whose fake screen now models the print cursor's size; after inline text, with scaled print, and with a 30-character value on a 26-column screen (K11) in `keyboard-lifecycle-browser.test.js` | [KEY-005](AUDIT-KEYBOARD.md#key-005) | [#26](https://github.com/AndyStubbs/pijs/pull/26) |
| 1.7 | Numeric prompts (A6): a prompt with `isNumber` or `isInteger` keeps a value that matches `-?\d*\.?\d*`, or `-?\d*` for integers, with the minus only when `allowNegative` is set; each typed or pasted character is checked against the pattern instead of `Number()`. Typing `-` adds a leading minus and `+`, by value only, removes it; the minus counts toward `maxLength`. `isInteger` alone also returns a number. A value with no digits (`""`, `"-"`, `"."`) and `-0` resolve to 0. Test: the numeric rules (K10) in `keyboard-lifecycle.test.js` | [KEY-008](AUDIT-KEYBOARD.md#key-008) | [#27](https://github.com/AndyStubbs/pijs/pull/27) |
| 1.8 | Release data (A8): up handlers receive data from the keyup event. A keyup runs the up handlers of its code, of the value it reports, and of the value the key was pressed with, when that differs because a modifier changed during the hold. Single-key and `"any"` up handlers run even when the press was not seen; a combination's up handler still needs every key held, and gets the release data for the released key and the held data for the others. Tests: release data, unseen presses, a changed value, and combination data (K13) in `keyboard-lifecycle.test.js` | [KEY-011](AUDIT-KEYBOARD.md#key-011) | [#28](https://github.com/AndyStubbs/pijs/pull/28) |
| 1.9 | Focus kept on start (A9): `startKeyboard()`, which also runs at plugin load, no longer blurs the focused element. Lifecycle test (K8) in `keyboard-lifecycle.test.js`, the first assertions for `startKeyboard` and `stopKeyboard`: plugin load and start keep focus; start and stop attach and remove the listeners once each, however often they are called; a stop clears held keys and holds, through handler registration and reads, until `startKeyboard()` | [KEY-012](AUDIT-KEYBOARD.md#key-012), [KEY-019](AUDIT-KEYBOARD.md#key-019) | [#29](https://github.com/AndyStubbs/pijs/pull/29) |
| 1.10 | Frozen key data (A10): key data objects, both held keydown data and keyup release data, are frozen when they are created, so `inkey()` and handlers cannot change plugin state through them; `inkey()` still returns a new array. Test: writes to polled and handler data fail, and combination and release data are frozen (K7), in `keyboard-lifecycle.test.js` | [KEY-013](AUDIT-KEYBOARD.md#key-013) | [#30](https://github.com/AndyStubbs/pijs/pull/30) |
| 1.11 | Metadata for current behavior: `metadata/pi-2.3/` overrides for `input` (resolves with a string, a number, or `null`; callback type; the cursor default is character code 219; `maxLength` takes `null`; the numeric, paste, layout, and cancellation rules of tasks 1.3–1.7), `inkey` (value lookups, frozen data, a working example), `onkey` and `offkey` (callbacks receive an array for combinations; `offkey`'s `mode` is required; codes and values; release data; the example removes the right function), `setActionKeys` (it adds; codes and values), `startKeyboard` (no automatic restart; focus kept), and `stopKeyboard` (a prompt keeps working). Tests: `input` and `onkey` signatures in `validate-type-definitions.js` and the Lite keyboard type consumer; action keys added by `setActionKeys()` and removed by `removeActionKeys()` in `keyboard-lifecycle.test.js`, and added by `set( { "actionKeys" } )` in `keyboard-lifecycle-browser.test.js` (K20); 2.9 changes the adding tests | [KEY-017](AUDIT-KEYBOARD.md#key-017) | [#31](https://github.com/AndyStubbs/pijs/pull/31) |
| 1.12 | Manual pages and tools: removed the plugin scripts that Full already includes from `clearevents_01`, `events_comprehensive`, `gamepad_01`, and `onkey_sound_01`, which now load without errors. Removed `html-manual/input_01`; its custom-cursor case is covered by a Node test that checks the printed line rather than by `keyboard_input`, whose capture is taken after every prompt has ended, and each removal is logged in `test/TEST-CONSOLIDATION-LOG.md`. `tools/dataedit.html` loads `../build/pi.js`, and the `input()` calls in `tools/charedit.html` and `tools/dataedit.html` pass `cursor` in its place. `tools/charedit.html` still calls the removed `$.util` helpers, which is outside this task | [KEY-018](AUDIT-KEYBOARD.md#key-018), [AUDIT-TESTS §5.3](AUDIT-TESTS.md#53-keyboard) | [#32](https://github.com/AndyStubbs/pijs/pull/32) |
| 1.13 | `keyboard_commands` timing: the fixture no longer depends on timers. The keyboard is restarted by the page's own listener for R instead of a 1-second timeout; the `inkey()` section reads the held keys after every key event instead of polling every 15 ms, so each state is drawn once; the section starts directly instead of after 200 ms; and the 2.0 s of `DL` waits are gone. Five runs gave byte-identical captures; the baseline was re-recorded and reviewed. Phase 1 exit: size recorded in `docs/evidence/keyboard-2.3/README.md` (plugin +380 bytes gzipped) | [CI-008](AUDIT-CI.md#ci-008), [AUDIT-TESTS §5.3](AUDIT-TESTS.md#53-keyboard) | [#33](https://github.com/AndyStubbs/pijs/pull/33) |

### 13.7 Pointer

| # | Task | Findings | Ref |
| --- | --- | --- | --- |
| 1.1 | Handler bookkeeping (B1): dispatch runs whenever a mode has handlers, and the per-type counters that `off*()` adjusted by guesswork are gone. `off*( mode, fn )` removes only that function's registrations in that mode; a `once` registration removes only itself, before its handler runs; a handler removed or cleared during a dispatch does not run later in it. Harness: `pointer-events.test.js` loads `mouse.js`, `touch.js`, `press.js`, and the plugin entry into `vm` contexts, maps arguments with core's `parseOptions`, and dispatches mouse and touch events through the plugin's canvas listeners; the fake event target moved from `keyboard-lifecycle.test.js` to `vm-module-harness.js` for the pointer and gamepad harnesses. Tests: clearing one mode, removing functions that were never added, removal and clearing during a dispatch, and `once` with a duplicate registration (P1, P7, today's duplicate semantics) | [PTR-001](AUDIT-POINTER.md#ptr-001) (P1), [PTR-009](AUDIT-POINTER.md#ptr-009) | [#34](https://github.com/AndyStubbs/pijs/pull/34) |
| 1.2 | Dispatch isolation (B2): each mouse, touch, press, and click handler runs in its own `try`, and a throw is reported with `console.error`, naming the command and mode, so the other handlers and the press and click dispatches of the same event still run. `touchstart` is prevented before any handler runs; state was already updated before dispatch. The harness stubs `console.error`. Test: throwing mouse, press, click, and touch handlers, with the touch start still prevented (P6) | [PTR-006](AUDIT-POINTER.md#ptr-006) | [#35](https://github.com/AndyStubbs/pijs/pull/35) |
| 1.3 | Per-touch tracking (B3): touch state is updated from `changedTouches`, so each touch keeps its own action and `intouch()` shows only touches still down. Touch handlers receive copies of the touches the event changed, and hit boxes test them: `"end"` reports the touch that lifted, at the position where it lifted. `touchcancel` has its own listener: it calls the `"end"` handlers and the press `"up"` handlers with `cancelled: true`, disarms every click listener of the screen, and never clicks. Touch, press, and mouse data carry `cancelled`, `false` unless cancelled (I6), and the SYS-009 late-installation test expects it; the data shape is otherwise unchanged. The visual runner's `TE` sends the ended touch at its last position in `changedTouches` with an empty `touches` list, documented in `test/README.md`; every pointer fixture kept its baseline. Tests: end data and hit boxes, per-touch actions and changed-touch data (P2), and cancel data, no click, and disarming (P4) | [PTR-002](AUDIT-POINTER.md#ptr-002), [PTR-005](AUDIT-POINTER.md#ptr-005) | [#36](https://github.com/AndyStubbs/pijs/pull/36) |
| 1.4 | Primary pointer and clicks (B4): press follows the primary pointer, the mouse or the primary touch. A touch is primary when it starts with no other touch down, and stays primary until it lifts; after that no touch is primary until every touch is up (the Pointer Events `isPrimary` rule). Press `"down"`, `"move"`, and `"up"` dispatch only for the primary touch; its release reports `action: "up"` and `buttons: 0`, and `inpress()` keeps it until the next primary touch. Touch press data is the primary touch, and `touches` holds it followed by the other touches still down. Clicks are per pointer: a down inside a click box arms the listener for that pointer, only for the primary mouse button; that pointer's release inside the box fires it with its own data; any other release, a release outside the box, or a cancel disarms it. The screen's `lastTouches` is replaced by the primary touch's press record. The harness sends `button` with mouse events. Tests: press and clicks with two fingers and the primary rule (P3), right and middle buttons (P5), and stale arming with the mouse and touch (P4) | [PTR-003](AUDIT-POINTER.md#ptr-003), [PTR-005](AUDIT-POINTER.md#ptr-005), [PTR-008](AUDIT-POINTER.md#ptr-008) | [#37](https://github.com/AndyStubbs/pijs/pull/37) |
| 1.5 | Every press ends with one release (B5): the canvas `mouseup` listener is replaced by a capture `mouseup` listener on `window`, attached only while some screen holds a button, so a release outside the canvas arrives and reports its position there. A release for a button a screen does not hold is ignored, and so is an end for a touch that is not held; a touch event that changes no tracked touch calls no handler. The `window` `blur` listeners and their silent resets are removed. A `visibilitychange` listener on `document`, added at registration until 1.7, releases held buttons and touches when the page is hidden; `stopMouse()` and `stopTouch()` release them first. These releases run the mouse `"up"`, touch `"end"`, and press `"up"` handlers with `cancelled: true` and never click. Screen removal clears the handlers before stopping, so it calls none of them. The harness document is an event target with `visibilityState`, and mouse events bubble to the window. Tests: a release outside the canvas, releases not held (P8), blur (P9), a hidden page and the late real releases (P9), stop commands (P10), and screen removal in `pointer-events.test.js`; a trusted drag released outside the canvas (T1) in `pointer-browser.test.js` | [PTR-004](AUDIT-POINTER.md#ptr-004), [PTR-007](AUDIT-POINTER.md#ptr-007), [PTR-010](AUDIT-POINTER.md#ptr-010) | [#38](https://github.com/AndyStubbs/pijs/pull/38) |
| 1.6 | Border and padding (B8): a `mousedown` or `touchstart` that maps outside the screen, on the canvas border or padding, is ignored (`isOnScreen()` in `target.js`). So that such a press never becomes held, mouse data reports only buttons pressed on the screen (`e.buttons` masked by the held buttons on down, move, and release), and moves and ends of a touch that is not tracked are ignored. Moves and releases report their true position, which can be outside the screen. Hit boxes accept any finite `x`, `y`, `width`, and `height`; a negative size throws `RangeError` with `INVALID_HITBOX`, and the other hit-box errors stay plain `Error`s until 2.8. Tests: presses, moves, and releases on the border for mouse and touch (P11), and fractional and invalid hit boxes (P13); a test that moved a touch it never started now starts it | [PTR-011](AUDIT-POINTER.md#ptr-011), [PTR-012](AUDIT-POINTER.md#ptr-012) | [#39](https://github.com/AndyStubbs/pijs/pull/39) |
| 1.7 | Listeners on first start (B12): the mouse and touch `visibilitychange` listeners are added to `document` when mouse or touch tracking first starts on any screen, once each, instead of at plugin load, and stay for the page's life; the `window` `mouseup` listener is attached only while a button is held (1.5), and the `blur` listeners are gone (1.5). A page that loads the plugin without using pointer input attaches no `window` or `document` listener. Test: no listener after load, one per module after starts on two screens and a stop and restart | — | — |

## 14. Glossary

| Prefix | Meaning | Defined in |
| --- | --- | --- |
| KEY-, PTR-, PAD-, CORE-, TEST-, CI- | Findings | The matching audit |
| Keyboard A1–A17, pointer B1–B13, gamepad A1–A12, core C1–C11 | Proposed changes | Each audit's proposed changes section |
| I1–I16 | Input conventions | Section 2 |
| G1–G8 | Release decisions | Section 9.1 |
| D1–D17 | Sound decisions | The sound design documents |
| P.1–P.6, R.1–R.7 | Plugin removal and release tasks | Sections 13.1 and 8.2 |
| U1–U4 | Release milestones | Section 1.5 |
| M1–M5 | Sound milestones | Section 1.5 |
| K1…, P1…, T1…, C01… | Probes in `docs/evidence/<workstream>-2.3/probes.js` | The evidence folders |

**ID collisions:** keyboard and gamepad both number their proposals A1 onward, and the CI
milestones C1–C3 share names with core proposals C1–C11. This document always qualifies them
("keyboard A1", "CI milestone C1").

**Priorities:** **P1** blocks a supported workflow or corrupts shared state; **P2** is
incorrect behavior under a specific trigger; **P3** is a lower-impact contract defect.
