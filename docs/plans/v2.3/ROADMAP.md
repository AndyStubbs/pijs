# Pi.js 2.3 Roadmap

Target release: Pi.js 2.3.0
Last updated: 2026-09-28

This is the definitive plan for 2.3. It holds every implementation step, the status of every
workstream, and every cross-cutting decision. The audits record findings only, and the design
documents record design only. When a task lands, update its row and the index below in the same
pull request.

## Index

### Next steps

Work in progress, in the order to take it up. Rows that can run in parallel say so.

| Order | Task | What | Waits on |
| --- | --- | --- | --- |
| 1 | [Sound 11.3–11.5](#43-phase-11-test-upkeep) | Sound test upkeep, in any order; first to cut, and can continue after 2.3.0 (Section 10) | Nothing. Can run in parallel |

Open manual checks are collected in the [release checklist](#83-manual-release-checks).

### Workstream status

| Workstream | Section | Status | Next |
| --- | --- | --- | --- |
| Core | [3](#3-core) | Complete (Phases 1–3); Core 3 and C10 are written in R.2 | — |
| Sound | [4](#4-sound) | Phases 0–10 done. Its listening checks are in Section 8.3; Phase 11: 11.1–11.2 done, 3 tasks left | Sound 11.3–11.5 |
| Keyboard | [5](#5-keyboard) | Complete (Phases 1–3). Its device checks are in Section 8.3 | — |
| Pointer | [6](#6-pointer) | Complete (Phases 1–3). Its device checks are in Section 8.3 | — |
| Gamepad | [7](#7-gamepad) | Complete (Phases 1–3). Its device checks are in Section 8.3 | — |
| Tests | [13.2](#132-tests) | Complete (TEST-001–028). Its handoffs are tasks in the owning sections | — |
| CI/CD | [13.3](#133-cicd) | Complete (CI 1.1–3.11) | — |
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

- **Sound:** M1 core foundation, M2 core complete, M3 `sound-advanced` 1.0.0, M4 size
  review, and M5 expansion complete (Phases 7–10, D7–D17 closed) are done.
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
[AUDIT-CORE.md §4](AUDIT-CORE.md#4-proposed-changes). Core 1, 2, and 4–13 are done
([Section 13.5](#135-core)); Core 3 is documentation for R.2. The task numbers follow the audit's follow-up order, so Core 3–10
keep their original numbers and Core 11–12 are the test audit's handoffs.

### 3.1 Phase 1: before input implementation

Done: Core 1, 2, and 4 ([Section 13.5](#135-core)).

### 3.2 Phase 2: fixes

Phase 2 is done ([Section 13.5](#135-core)). The size at the exit of Phases 2 and 3 is in
`docs/evidence/core-2.3/`.

| # | Task | Findings | Status |
| --- | --- | --- | --- |

### 3.3 Phase 3: API change

Phase 3 is done: Core 8 and Core 13 ([Section 13.5](#135-core)).

| # | Task | Findings | Status |
| --- | --- | --- | --- |

Core 3 (document that `clearEvents()` reaches handlers a plugin registers through the public
input commands, CORE-004, in place of the rejected C4) and C10 (the characters each built-in
font draws, CORE-014) are written in the release phase (R.2).

**Exit criteria:** every accepted CORE finding is fixed or explicitly deferred. No core task is
left open except C10's Latin-1 mapping, which is deferred to a later release.

### 3.4 Compatibility summary

Input to `UPGRADE-V2.3.md` (R.4):

- **C7 (breaking):** "`set()` now throws `INVALID_OPTION` for an option it does not recognize,
  including options from plugins that are not loaded. Remove the option, fix its spelling, or
  load the plugin that provides it." Also: options that are not an object throw
  `INVALID_OPTIONS`, and a screen setting with no active screen throws `NO_ACTIVE_SCREEN`
  instead of a raw `TypeError`. Every name is checked first, so a call that throws applies no
  setting.
- **Core 13 (breaking):** "`$.clearEvents()` now clears mouse, touch, press, and click handlers
  on every screen, not only the active one, and cancels an `input()` prompt on any screen. Call
  `clearEvents()` on a screen to clear only that screen."
- **C6 (fixes that reject input they used to accept):** "`arc()` angles must be finite.
  `loadFont()` sizes must be integers of at least 1 and its margin an integer of 0 or more.
  `setPrintSize()` scales must be finite numbers, and padding an integer of 0 or more.
  `$.removeScreen()` throws `INVALID_SCREEN_ID` for a missing, unknown, or already removed
  screen instead of doing nothing." Also: an argument passed as `undefined` now counts as
  omitted; `getPal( false )` and `getDefaultPal( false )` exclude index 0, as the default does;
  `getImage()` of an offscreen screen returns a canvas copy of its pixels; and `polygon()` fills
  coordinates far off the screen correctly.
- **Core 12:** `blitImage()` and `blitSprite()` accept every color form `drawImage()` accepts,
  where a color made the pixels transparent, and their object forms apply the documented
  defaults, where an omitted scale drew nothing.
- **C8:** "`setChar()` now works on every font, including the default font, and changes the
  character on every screen that uses the font. It edits the font's own copy of its image, so
  an image or canvas passed to `loadFont()` is left unchanged." Printing with the default font
  no longer uploads its texture for each character.
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
[DESIGN-SOUND-ADVANCED.md](DESIGN-SOUND-ADVANCED.md) (Phases 7–10). Phases 0–10 are done
([Section 13.4](#134-sound)).

### 4.1 Phase 9: game features

Done ([Section 13.4](#134-sound)). Its listening check is in the
[release checklist](#83-manual-release-checks).

### 4.2 Phase 10: sample instruments

Design: [DESIGN-SOUND-ADVANCED §7](DESIGN-SOUND-ADVANCED.md#7-phase-10-sample-instruments).
Done ([Section 13.4](#134-sound)). Every exit criterion is met in `npm test` except the
listening check, which is in the [release checklist](#83-manual-release-checks):

- An offline render of a sine sample shows the expected pitch for notes across three octaves,
  and the envelope and loop behavior match the synthesized case.
- Vibrato on a sample instrument modulates its pitch.
- Not-ready files play silence with one warning, never an error.
- A size entry (`size-phase10.json`).

### 4.3 Phase 11: test upkeep

The test audit's sound handoffs ([AUDIT-TESTS §5.1](AUDIT-TESTS.md#51-sound)). They change only
tests, so they can continue after 2.3.0 (Section 10). Done: 11.1 and 11.2
([Section 13.4](#134-sound)).

| # | Task | Status |
| --- | --- | --- |
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
Phase 1 to Phase 2, so it lands once with the I11 error codes instead of twice. A16, a hidden
text field for composed (IME) text and mobile soft keyboards, was dropped on 2026-09-28: it is
not wanted for this library. Pasted text is handled by the prompt (A3).

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
Section 8.3 uses. Phase 2 is done: tasks 2.1–2.9 ([Section 13.6](#136-keyboard)); its size is
in `docs/evidence/keyboard-2.3/`. It landed on `main` from `keyboard-2` with a merge commit
([#62](https://github.com/AndyStubbs/pijs/pull/62)).

| # | Task | Findings | Status |
| --- | --- | --- | --- |

**Exit criteria:** every Phase 2 item in, `npm test` green, the compatibility summary complete,
and size recorded.

### 5.3 Phase 3: release inputs

Phase 3 is done: task 3.1 ([Section 13.6](#136-keyboard)).

| # | Task | Findings | Status |
| --- | --- | --- | --- |

**Exit criteria:** `npm test` green, the compatibility summary complete, and the final size
recorded.

### 5.4 Compatibility summary

Input to `UPGRADE-V2.3.md` (R.4), completed by task 3.1:

- **Version (G1):** the keyboard plugin is 2.0.0.
- **Renames (I1):** `inkey` → `inKey`, `onkey` → `onKey`, `offkey` → `offKey`. The old names
  are unregistered (I16).
- **`offKey()` (I4):** matches on key, mode, and function only; `once` and `allowRepeat` are
  ignored. `offKey( key, mode )` removes every handler of that mode, `offKey( key, null, fn )`
  removes the function from both modes, and `offKey( key )` throws.
  Registering the same function for the same key and mode again does nothing, so code that
  registered twice now runs once.
- **Start rule (I5):** the plugin starts on first use (`inKey()`, `onKey()`, or action keys),
  not at load, so keys pressed earlier are not tracked; call `startKeyboard()` to track from an
  earlier point. `stopKeyboard()` holds until `startKeyboard()`.
- **Cancelled releases (I6):** blur, a hidden page, `stopKeyboard()`, typing into a text field,
  and an `input()` prompt release held keys through `"up"` handlers with `cancelled: true`. Key
  data has a `cancelled` field.
- **Dispatch (I8):** state is updated before handlers run, so `inKey()` inside an `"up"` handler
  no longer reports the released key. A handler that throws is reported with `console.error`
  instead of being rethrown, so `window` error listeners no longer see it. A handler registered
  during a key event first runs for the next one, and a combination that lists both a key's
  code and its value runs once per event.
- **Errors (I11):** validation throws `TypeError` or `RangeError` with per-parameter codes
  instead of `INVALID_PARAMETERS`. `inKey( "" )` and `inKey( 0 )` now throw instead of returning
  the list. Modes other than `"up"` and `"down"`, empty keys, `"any"` in a combination,
  non-boolean `once`, `allowRepeat`, and `input()` flags, and `maxLength: 0` now throw.
- **Combinations (A7):** the key array is copied and de-duplicated, so the caller's array is no
  longer sorted, and a combination's callback receives its key data in the order given.
- **A11:** "Keys typed into an `input()` prompt no longer reach `onKey()` handlers or `inKey()`,
  including the Enter that ends it. Handle the prompt's result instead of watching for Enter."
- **A12:** "`setActionKeys()` and `set( { "actionKeys": … } )` replace the action keys. Pass
  every key in one call, or use `removeActionKeys()` to remove some."
- **Phase 1 fixes (A1–A6, A8, A9):** a key is released by its code whatever value its keyup
  reports, so a letter pressed with Shift no longer stays held, and a key value is held while
  any key that produced it is held. `input()` reads its own keys, so it works after
  `stopKeyboard()`; it prevents the default action of the keys it handles, so Space no longer
  scrolls and Tab no longer moves focus; Ctrl and Meta shortcuts are left to the browser, and
  pasted text is inserted. Keys typed into an input inside a shadow root are ignored. The prompt
  keeps to one line, and printing continues on the line below it. Numeric prompts resolve with a
  number, `isInteger` alone included, and a value with no digits resolves to 0. `"up"` handlers
  receive the keyup's data, and a keyup whose press was not seen still reaches single-key and
  `"any"` handlers. `startKeyboard()` no longer blurs the focused element.
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
Phase 2 is cut, so its release fixes stand on their own. Phase 1 is done: tasks 1.1–1.9
([Section 13.7](#137-pointer)); its size is in `docs/evidence/pointer-2.3/`.

| # | Task | Findings | Status |
| --- | --- | --- | --- |

**Exit criteria:** PTR-001–011, PTR-016, and PTR-017 fixed with tests; PTR-012's hit-box part
fixed with tests (2.8 completes it); PTR-015's metadata corrected (R.2 and R.3 complete it); no
pointer fixture carries `ciSkip`; `npm test` green; size recorded in `docs/evidence/pointer-2.3/`.

### 6.2 Phase 2: Pointer Events and API (breaking set, 2.0.0)

Built on one branch and landed as a set. Each task updates metadata, declarations, signature
tests, and the demos, fixtures, and manual pages that use the changed command, plus the `tools/`
pages, `scripts/validate-type-definitions.js`, `test/scripts/firefox-smoke.js`,
`test/scripts/package-types-consumer.test.js`, `test/unit/plugin-installation-browser.test.js`,
and the evidence `device-check.html` that Section 8.3 uses. Core 8 and Core 13, which it
depends on, are done. Phase 2 is done: tasks 2.1–2.8 ([Section 13.7](#137-pointer)); its
size is in `docs/evidence/pointer-2.3/`. It landed on `main` from `pointer-2` with a merge
commit ([#86](https://github.com/AndyStubbs/pijs/pull/86)).

| # | Task | Findings | Status |
| --- | --- | --- | --- |

**Exit criteria:** every Phase 2 item in, `npm test` green, the compatibility summary complete,
and size recorded.

### 6.3 Phase 3: additive and release inputs

Phase 3 is done: tasks 3.1–3.2 ([Section 13.7](#137-pointer)).

| # | Task | Findings | Status |
| --- | --- | --- | --- |

### 6.4 Compatibility summary

Input to `UPGRADE-V2.3.md` (R.4), completed by task 3.2:

- **Version (G1):** the pointer plugin is 2.0.0.
- **Renames (I1):** every mouse, touch, press, and click command moves to camelCase:
  `inMouse`, `onMouse`, `offMouse`, `inTouch`, `onTouch`, `offTouch`, `inPress`, `onPress`,
  `offPress`, `onClick`, and `offClick`; and `setEnableContextMenu` becomes `setContextMenu`
  (I12). The old names are unregistered, so old code fails at its first call.
- **B7 and I3:** "Mouse, touch, press, and click data share one shape: `x`, `y`, `lastX`,
  `lastY`, `buttons`, `action`, `type`, `id`, and `cancelled`. Touch handlers use the modes
  `"down"`, `"move"`, and `"up"` instead of `"start"`, `"move"`, and `"end"`, and touch data
  uses those actions; `onTouch( "start" )` and `"end"` throw `INVALID_MODE`, naming the new mode.
  `lastX` and `lastY` start at the current position instead of `null`; touch data has `buttons`
  (1 while down); mouse data has `id`; click data has `action: "click"`. `inPress().touches`
  holds copies of the touches down, empty for the mouse, so it no longer contains the press
  object itself and the press serializes."
- **B10:** "`setPinchZoom()` is a screen command and sets `touch-action` on that screen's
  canvas, `pinch-zoom` or `none`, at any time; it no longer changes `<body>`. The context menu is
  suppressed from screen creation, and `setContextMenu()` no longer starts mouse tracking."
- **B6 observable changes:** pen input is reported with `type: "pen"`; a drag that leaves the
  canvas keeps reporting moves; touch handlers run once per touch, so touches that start together
  arrive in separate calls; the canvas has `touch-action: none` while touch tracking runs, instead
  of Pi.js preventing `touchstart`; a pointer the browser cancels releases a held mouse button
  with `cancelled: true`.
- **Phase 1 fixes (B3, B4, B5, B8, PTR-008):** touch handlers receive the touches the event
  changed, so touch `"up"` handlers receive the touch that lifted, and hit boxes test those
  touches; each touch in `inTouch()` keeps its own action; a touch the browser cancels calls the
  touch and press `"up"` handlers with `cancelled: true` and never clicks; a drag released outside
  the canvas reports its release, and a release for a button or touch that is not held is ignored;
  blur no longer resets polled state, and hiding the page or a stop command calls the `"up"`
  handlers with `cancelled: true`; press follows only the primary touch; a click needs the same
  pointer's down and release inside its box, and each finger clicks on its own; right and middle
  buttons no longer click; a press that starts on the canvas border or padding is ignored, and a
  drag that starts off the screen reports no buttons; hit boxes accept fractional values, and a
  negative hit-box size throws.
- **I4:** registering the same function for the same mode again does nothing, whatever its
  `once`, hit box, and custom data, so a function registered with and without `once` runs once;
  `offX( null, fn )` removes a function from every mode; `offX()` with neither argument throws
  `TypeError` with code `INVALID_MODE`.
- **Dispatch (I8, B1, B2):** state is updated before handlers run. A handler that throws is
  reported with `console.error`, and the event's other handlers still run. A handler registered
  during an event first runs for the next one, a handler removed during an event does not run
  later in it, and `once` removes only its own registration, before the handler runs, so
  removing one handler no longer disables the others of its mode.
- **I7 and I9:** data objects and list arrays are frozen and created once per event, so a read
  returns the object the handlers received, the same one until the next event, and `inTouch()`
  the same array until a touch changes; `inMouse()` and `inPress()` return `null` before the
  first event and after the stop of their input, instead of a centered record with action
  `"none"`, and `inTouch()` returns an empty array after `stopTouch()`.
- **I10:** `clearEvents( "press" )` no longer clears click handlers; use `"click"`.
- **I12:** `set( { enableContextMenu } )` becomes `set( { contextMenu } )`, and
  `set( { pinchZoom } )` needs a screen.
- **Errors (I11):** validation throws `TypeError` or `RangeError` with per-parameter codes instead
  of plain `Error`; `"false"` and other non-booleans for `isEnabled` and `once` throw instead of
  being coerced, and a hit box that is not an object, such as `false`, throws instead of being
  ignored.
- **B11:** additive; no upgrade entry.

## 7. Gamepad

**Approved 2026-09-27.** Findings: [AUDIT-GAMEPAD.md](AUDIT-GAMEPAD.md). Proposals A1–A12:
[AUDIT-GAMEPAD §4](AUDIT-GAMEPAD.md#4-proposed-api). Probe IDs (P1, P5b, …) name the
reproductions in `docs/evidence/gamepad-2.3/probes.js`. Baseline: 1.0.0, 1,428 bytes gzipped.

Pure logic tests go in `gamepad-validation.test.js`, whose harness (task 1.1) loads the plugin
with the shared `vm-module-harness.js`, scripts pads and frames, dispatches `window` and
`document` events (connection, `visibilitychange`), and keeps the `clearEvents` handler.
`gamepad-validation-browser` keeps only bundle wiring. One change from the audit's order: helper
validation (A8) moves to Phase 2 to land once with I11.

### 7.1 Phase 1: fixes and tests

No API change; the version stays 1.0.0. Phase 1 is done: tasks 1.1–1.7
([Section 13.8](#138-gamepad)); its size is in `docs/evidence/gamepad-2.3/`.

| # | Task | Findings | Status |
| --- | --- | --- | --- |

**Exit criteria:** PAD-001–007, PAD-009, PAD-015, PAD-016, and PAD-017 fixed with tests;
PAD-014's metadata corrected (R.2 completes it); `npm test` green; size recorded in
`docs/evidence/gamepad-2.3/`.

### 7.2 Phase 2: API (breaking set, 2.0.0)

Built on one branch and landed as a set. Each task updates metadata, declarations, signature
tests, and the pages that use the changed command: the manual gamepad pages,
`html-manual/clearevents_02`, `events_comprehensive`, and the evidence `device-check.html` that
Section 8.3 uses. Core 8, which it depends on, is done. Phase 2 is done: tasks 2.1–2.6
([Section 13.8](#138-gamepad)); its size is in `docs/evidence/gamepad-2.3/`. It landed on
`main` from `gamepad-2` with a merge commit ([#95](https://github.com/AndyStubbs/pijs/pull/95)).

| # | Task | Findings | Status |
| --- | --- | --- | --- |

**Exit criteria:** every Phase 2 item in, `npm test` green, the compatibility summary complete,
and size recorded.

### 7.3 Phase 3: additive and release inputs

Phase 3 is done: tasks 3.1–3.3 ([Section 13.8](#138-gamepad)).

| # | Task | Findings | Status |
| --- | --- | --- | --- |

### 7.4 Compatibility summary

Input to `UPGRADE-V2.3.md` (R.4), completed by task 3.3:

- **Version (G1):** the gamepad plugin is 2.0.0.
- **Rename (I1):** `ingamepad` → `inGamepad`.
- **I2:** `onGamepadConnected( fn )` and `onGamepadDisconnected( fn )` become
  `onGamepad( "connect", fn )` and `onGamepad( "disconnect", fn )`, with `offGamepad()` to
  remove them.
- **I4:** a connection handler is identified by its mode and function: registering the same
  function for the same mode again does nothing, where each registration used to be called.
  `once` removes a handler before its first call, and a `once` connect handler receives one pad.
- **A6:** "`inGamepad()` always returns an array, empty while polling is stopped, and
  `inGamepad( i )` returns `null` for a missing pad and while stopped. Replace `if( pads )`
  checks with a length check, and `=== undefined` with `=== null`."
- **A9:** "`setGamepadSensitivity()` is now `setGamepadDeadZone()`, and
  `set( { gamepadSensitivity } )` is now `set( { gamepadDeadZone } )`; the dead zone is under 1.
  On pads with the standard mapping, the two sticks are measured radially, so diagonal movement
  near the center is no longer lost, near-cardinal movement no longer snaps to the axis, and a
  full diagonal reads a distance of 1 instead of about 0.9. Other axes keep the per-axis dead
  zone."
- **I16:** `ingamepad`, `onGamepadConnected`, `onGamepadDisconnected`, and
  `setGamepadSensitivity` are unregistered.
- **I5 and I6:** `stopGamepad()` holds even when a handler is registered, releases every button,
  and stops connection handlers until `startGamepad()`; connections made or lost while stopped
  are reported when it restarts, and a button pressed while stopped reads as held, not as just
  pressed.
- **A1:** "just pressed", "just released", and "axis changed" report what happened since the
  previous read, shared by every reader in the same frame, so timer-driven and slower loops see
  every press.
- **Dispatch (I8, A3):** connection handlers are called from a copy of the list: a handler that
  throws is reported with `console.error`, and the others still run; a handler registered during
  a dispatch first runs for the next one, and one removed during it does not run later in it.
  The pad list is updated before the handlers run.
- **A2:** input keeps updating when the window loses focus but the page stays visible, where it
  used to freeze. Hiding the page releases every button and centers the axes, without reporting
  a release; a button still held when the page returns reads as pressed, not just pressed.
- **A4:** a connect handler registered later receives the pads already connected. Code that also
  loops over `inGamepad()` to set up players can set one up twice.
- **A7 and I7:** pads, their `buttons` and `axes`, and the list are live objects updated in
  place. Copy them to keep a snapshot.
- **Errors (I11):** validation throws with per-parameter codes instead of `INVALID_PARAMETERS`. A
  helper index that is neither an integer nor a standard name (A10) throws: `getButton( "0" )` used
  to return button 0 and now throws `RangeError`, `getButton( 1.5 )` throws `TypeError`, and a
  negative index throws `RangeError`, `getButtonPressed()` past the buttons returns `false` instead
  of `null`, a non-boolean `once` throws, and `setGamepadDeadZone( 1 )` throws where
  `setGamepadSensitivity( 1 )` was accepted.
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
  engine, including a tab hidden mid-song (Phase 9); the plucked and looped sample
  instruments across their range, and a song started before its file loads (Phase 10).
- [ ] Autoplay unlock on desktop and on an iOS or Android device.
- [ ] A stream instance deferred while locked starts on the unlocking gesture, in desktop Safari
  or on iOS.
- [ ] iOS mute switch behavior under the `"ambient"` session (D5).

**Input device pass:**

- [ ] Keyboard: the release pass in `docs/evidence/keyboard-2.3/README.md`, in Chrome, Firefox,
  and Safari: stuck keys (A1), cancelled releases on blur and on a hidden tab (I6), auto-repeat,
  and the prompt's keys (A3, A11); a non-US layout with AltGr; an input method leaves no key
  held; macOS Cmd, if macOS hardware is available.
- [ ] Pointer: the release pass in `docs/evidence/pointer-2.3/README.md`: the mouse in Chrome,
  Firefox, and Safari, including a release outside the canvas, the context menu from screen
  creation (B10), a hidden tab with a button held (I6), and the wheel with and without a handler
  (B11); touch and multi-touch on a phone or tablet in Chrome and Safari (PTR-002, PTR-003); a
  system gesture's `touchcancel` (PTR-005); pinch zoom with `setPinchZoom` on and off, the long
  press, and iOS double-tap zoom (PTR-014); a pen, if one is available.
- [ ] Gamepad: the release pass in `docs/evidence/gamepad-2.3/README.md`, in Chrome and Firefox
  with a controller and in Safari if macOS hardware is available: the connect replay (A4),
  press edges (A1, PAD-001, PAD-017), focus and a hidden tab (A2, PAD-002), the radial dead zone
  (A9), reconnects, a stop and restart (I5, I6), names (A10), and `vibrateGamepad()` (A11).

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
4. **Input additive items:** pointer B11, gamepad A10 and A11 move to 2.3.x.
5. **Single breaking items,** each with its fallback:
   - Keyboard A12: `setActionKeys()` keeps adding, and the documentation says so.
   - Pointer B6: B5 keeps its window listeners, and B10 keeps `preventDefault()` with a
     per-screen flag.
   - Gamepad A9: the dead zone keeps its name and gains the radial model as a fix.
6. **Core:** the remaining P3 findings are deferred; P1 and P2 findings are fixed or accepted
   as known issues. C8 and C11 are done.
7. **An input plugin's Phase 2 as a set.** Its breaking changes move to the next minor release
   together, so users update each API once. Its Phase 1 fixes and Phase 3 additive items still
   ship in 2.3.0; Phase 3 items that validate input use the I11 codes either way.

Not cut: the input plugins' Phase 1, Core 4, Core 5 (CORE-001, done), and Core 8 (C7, done),
which the I16 rule for renamed options depends on.

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
| 3.10 | Resize waits: the noCss tests in `screen-lifecycle-browser.test.js` and `pointer-browser.test.js` wait up to 2 s for the canvas to reach each expected size instead of a fixed 80 ms, which a macOS runner missed after Gamepad 1.6 (run 36427632948); checks that nothing changes keep the fixed wait | [CI-008](AUDIT-CI.md#ci-008) |
| 3.11 | Visual recapture: a pixel mismatch is captured once more before it counts. `test/scripts/visual-recapture.js` exports `compareWithRecapture()`: a match or a comparison error (size, missing file) is final; after a pixel mismatch the runner keeps the first capture, waits two animation frames, captures again to the same file, and the second comparison decides. Every recapture is reported: a `recapture` annotation with the first capture attached, `recapture` per test and a `recaptures` count in `summary.json`, a note on the results page, and a `Recapture: <fixture>: <description>` console line. Found when a Windows CI run of PR #94 captured all seven `shaders_comprehensive` canvases blank while the trace frames before and after showed them drawn. `test/README.md` describes it. Tests: `compareWithRecapture()` with a match, a size error, and a mismatch that matches or still differs on the recapture; the reporter test counts and prints a recapture and finds it on the results page. A run against a deliberately altered baseline recaptured once and still failed | — |

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

**Phase 10: sample instruments** (design §3.3, §7)

| # | Task |
| --- | --- |
| 10.1 | Core `getAudioBuffer( name )` service member: the decoded buffer of a loaded decode-mode file, `null` while loading, for streamed files, and for unknown or removed names; documented in `plugins/PLUGIN-SYSTEM.md` with the rule that the shared buffer is not modified. Tests: the member pin and a contract test in `audio-service-browser.test.js`, and a streamed file in `audio-stream-browser.test.js`. Size: +55 bytes in the `sound` plugin, 258 under its target |
| 10.2 | `sample-source.js`: a source type registered on first use for each audio name, root frequency, and loop setting (`sample:"piano"`, `@392`, `:loop`), since a factory receives only the voice spec and PLAY observers report the note's own frequency; the factory reads the buffer per voice, sets `playbackRate` to `frequency / rootFrequency` with core's sweep rule, returns `frequency: null` and the buffer source's `detune`, loops or ends with the file, plays silence without a buffer, and plays each note from the file's start. Tests: type names, registration, the source contract, and the rate schedule in `sound-advanced.test.js`; offline renders through a page probe (`audio-sample-source-probe.js`, the new `sources` option of `audio-browser-suite.js`): three octaves, another root frequency, a sweep, vibrato, one-shot and looped ends, and a missing file, plus a single-pass case for Firefox. Not yet in the plugin bundle, so no size change |
| 10.3 | Sample instruments: `defineInstrument` takes `audio`, `rootFrequency` (default 261.63), and `loop` (default `false`) and plays the file through a `sample-source.js` type; the other `synth()` options apply as before. Validation: `INVALID_AUDIO`, `INVALID_ROOT_FREQUENCY`, `INVALID_LOOP`, and `INVALID_INSTRUMENT` for `audio` with an `oType`, or `rootFrequency` or `loop` without `audio`. A note resolved while its file is not loaded, or is streamed, plays at volume 0 with one warning per instrument and `play()` call. Closed D15. Tests: validation and not-ready resolution in `sound-advanced.test.js`; offline renders of three octaves, a root frequency, a sweep, vibrato, loop and one-shot ends, a missing file with its one warning, and an envelope matching the oscillator's, plus a single-pass case for Firefox. The 10.2 page probe and its `sources` suite option are removed, since instruments cover every case. Size: +744 bytes in `sound-advanced`, which now includes `sample-source.js` |
| 10.4 | `defineInstrument` metadata describes sample instruments, their errors, and the not-ready rule, with a sample instrument in its example; a type consumer passes `audio`, `rootFrequency`, and `loop`. `sound_advanced_01.html` gains a Sample instruments section: a plucked C4 string and a looped organ tone made in the page as WAV files and loaded with `loadAudio()`, and a song started before its file loads. Phase 10 exit: `size-phase10.json`, and M5 closed |

**Phase 11: test upkeep** ([AUDIT-TESTS §5.1](AUDIT-TESTS.md#51-sound))

| # | Task |
| --- | --- |
| 11.1 | One Firefox per test stage: `withSharedFirefox()` in `test/unit/audio-engines.js` starts one headless Firefox server for a stage and passes its endpoint in `PI_AUDIO_FIREFOX_ENDPOINT`; `launchEngine( "firefox" )` connects to it, and a suite's `close()` only disconnects, so the next suite reuses it. The browser regressions stage of `scripts/test.js` (`npm test`, `npm run test:browser`) runs its files inside it; the realtime suites, which need autoplay preferences, and focused `node --test` runs launch their own, and without Firefox in `PI_AUDIO_ENGINES` nothing is started. The 15 audio browser files, run as the stage runs them with `PI_AUDIO_REALTIME=0`, took 30 s instead of 41 s on the development machine, with the same 236 passes and 211 skips. `test/README.md` describes it. Test: `audio-engines-browser.test.js`: two suites in turn connect, run a page, and close, and the server is gone after the stage |
| 11.2 | Suite-level skips: suites read each engine's Web Audio support before defining tests, so an engine without Web Audio is one skipped block and the tests that need offline `suspend()` are one skipped group, each named once per suite. `probeSupport()` in `test/unit/audio-engines.js` checks `AudioContext`, `OfflineAudioContext`, and its `suspend()` on a blank page; `withAudioEngines()` (formerly `withSharedFirefox()`) probes once per stage, through the shared Firefox server, and passes the result in `PI_AUDIO_SUPPORT`; `loadSupport()` reads it, or probes when a focused `node --test` run has none. `describeAudioEngines()` skips an engine without Web Audio, and its new `clockTest()` defines a test in a "clock-driven renders" group that runs after the engine's other tests and that an engine without `suspend()` skips; the 60 test definitions that passed `needsSuspend` (68 tests with their loops) use it, and `inHarness()` no longer takes the test context or the `needsWebAudio` and `needsSuspend` options. The reference suite skips such an engine, and the lifecycle suite moves its four Web Audio tests per bundle into a "decoded audio" group, so its stream-mode tests still run on Windows WebKit. The two tests that ran without Web Audio (harness timers, `sound()` validation) now skip with the rest of Windows WebKit; they still run in Chromium and Firefox. Six clock-test titles lost a word or two to stay under 100 columns. With `PI_AUDIO_REALTIME=0` on the development machine, the 211 skipped tests became 24 skipped suites and groups (11 WebKit engines, nine Firefox clock-driven groups, one decoded-audio group, three realtime suites), with 237 passes, as before: two new tests, two fewer WebKit runs. `test/README.md` describes it. Tests: `audio-engines-browser.test.js`: the stage's probe covers every engine and Chromium supports both; a suite reads the stage's probe and probes when it misses an engine; a fixture suite in a child process reports a missing Web Audio engine and a missing-`suspend()` group as one skip each, never runs the skipped test, and runs the group when `suspend()` is present. Removing either skip, or ignoring the stage's probe, fails them |

### 13.5 Core

| # | Task | Findings | Ref |
| --- | --- | --- | --- |
| Core 1 | Transactional plugin installation and error routing (C2): registrations committed after installation succeeds; screen installation rolls back; `getPlugins()` reports `state`; registration after init throws `REGISTRATION_CLOSED` | [CORE-002](AUDIT-CORE.md#core-002), [CORE-006](AUDIT-CORE.md#core-006) | [#13](https://github.com/AndyStubbs/pijs/pull/13) |
| Core 2 | Documented the Lite-only plugin entry points (C3) in `plugins/README.md`, `plugins/polygons/README.md`, and `llms-full.txt`; the release README follows in R.3 | [CORE-003](AUDIT-CORE.md#core-003) | [#14](https://github.com/AndyStubbs/pijs/pull/14) |
| Core 4 | Declarations and release manifest (C5): `"type": "module"` in the release manifest; plugin declarations augment Lite, and `sound-advanced` both Full and Lite, through `PluginCommands`, `PluginScreenCommands`, and `PluginOptions`; object types only a plugin uses move from Lite to that plugin's declarations; Lite `Options` holds Lite settings only; the global `pi` and `$` are declared by Full only; `addCommand`'s `isScreenOptional` is optional and its JSDoc example is corrected; `Screen.removeScreen()` is declared. Type consumers compile under `bundler` and `nodenext`, including Lite with each exported plugin | [CORE-005](AUDIT-CORE.md#core-005), [CORE-015](AUDIT-CORE.md#core-015), [CORE-016](AUDIT-CORE.md#core-016), [CORE-017](AUDIT-CORE.md#core-017) | [#17](https://github.com/AndyStubbs/pijs/pull/17) |
| Core 8 | Strict `set()` (C7, breaking): every option name is checked before any setting applies; a name that is not a registered setting, including an inherited name such as `toString` or a setting of a plugin that is not loaded, throws `RangeError` `INVALID_OPTION`; options that are not an object throw `TypeError` `INVALID_OPTIONS`; a screen setting with no active screen throws `NO_ACTIVE_SCREEN`, unless a `screen` option before it provides one. Settings are held in a null-prototype table, and the unused `addSetting` export is removed. Tests: `test/unit/settings.test.js` (C07) and the Full and Lite cases in `plugin-installation-browser.test.js`, including a Lite setting that appears when its plugin loads; `metadata/pi-2.3/set.toml` | [CORE-008](AUDIT-CORE.md#core-008) | [#65](https://github.com/AndyStubbs/pijs/pull/65) |
| Core 6 | Option and value handling (C6): `parseOptions` maps `undefined` to `null`, positionally and by name, and `set()` skips an `undefined` option as it skips `null` (CORE-007); `getPal( false )` and `getDefaultPal( false )` exclude index 0 (CORE-009); `getImage()` of an offscreen screen returns a new canvas holding a copy of its pixels, and of any other screen its canvas (CORE-011); `polygon()` sweeps only the visible rows and clips span ends to the visible columns, with spans cached per view bounds (CORE-012); `arc()` angles must be finite, `loadFont()` sizes integers of at least 1 and margins integers of 0 or more (`INVALID_DIMENSIONS`, `INVALID_MARGIN`), and `setPrintSize()` scales finite and padding integers of 0 or more (`INVALID_SIZE`, `INVALID_PADDING`) (CORE-013); `$.removeScreen()` takes `{ "screen": screen }` and throws `INVALID_SCREEN_ID` for a missing, unknown, or removed screen; its `screen` parameter stays optional in the declarations, because the global API extends `Screen`, whose `removeScreen()` takes none (CORE-015). Metadata for `arc`, `getImage`, `loadFont`, `removeScreen`, and `setPrintSize`. Tests: `settings.test.js` (C06), `numeric-boundaries.test.js` (C12), `polygons.test.js` (C11), and in both bundles `color-validation-browser.test.js` (C08), `image-lifecycle-browser.test.js` (C10), and `screen-lifecycle-browser.test.js` (C14); a type consumer uses the `removeScreen` forms | [CORE-007](AUDIT-CORE.md#core-007), [CORE-009](AUDIT-CORE.md#core-009), [CORE-011](AUDIT-CORE.md#core-011), [CORE-012](AUDIT-CORE.md#core-012), [CORE-013](AUDIT-CORE.md#core-013), [CORE-015](AUDIT-CORE.md#core-015) | [#72](https://github.com/AndyStubbs/pijs/pull/72) |
| Core 7 | Canvas textures, `setChar`, and cache bounds (C8): a canvas marked static (`isDirty` false) is uploaded once per context, and again only when its `version` changes; the default font's canvas is static. `setChar` draws the glyph into the font's own canvas and bumps its version, so every screen picks up the edit on its next lookup, after text queued with the old glyph, and a restored context uploads it; an image font, or one loaded from a caller's canvas, is copied into an owned canvas on its first edit, and the old image's textures are released. The filled-circle geometry cache holds at most 1,048,576 coordinates (about 4 MB), evicting the least recently used first, and does not cache geometry larger than that. Metadata: `setChar`. Tests: `font-publication-browser.test.js` (C09) in both bundles: the default font's edit, a later screen, an image font edited on two screens, a context restore, and no uploads while printing; `batch-reservations.test.js`: the cache budget and eviction order | [CORE-010](AUDIT-CORE.md#core-010), [CORE-018](AUDIT-CORE.md#core-018) | [#73](https://github.com/AndyStubbs/pijs/pull/73) |
| Core 9 | Packaging (C11): the root `package.json` is `"private": true`, so npm refuses to publish the development tree; `releases/base-package.json` and `releases/pi-latest/package.json` list `CHANGELOG.md` in `files`, so the tarball ships it with the README and LICENSE (checked with `npm pack --dry-run` in `releases/pi-latest`). The `releases/PUBLISH.md` rename landed in CI 2.1. Test: `copy-to-release.test.js` checks both manifests' `files`, that each entry exists in the release package, and the root's `private` | [CORE-019](AUDIT-CORE.md#core-019) | [#74](https://github.com/AndyStubbs/pijs/pull/74) |
| Core 10 | Metadata against runtime: `metadata-runtime-browser.test.js` compares each bundle's runtime with the metadata the declarations come from. Full is compared with the core and bundled-plugin metadata; Lite, with every plugin loaded standalone including `sound-advanced`, also with `metadata/plugin-sound-advanced`. Every registered command must have metadata with the same parameter names in order, and the functions on `$` and on a screen must be exactly the declared commands and screen commands, which also covers the screen flag, the forms installed outside the registry (`removeScreen`, a screen's `clearEvents`), and settings, which are the `set` commands. No mismatch was found. Support: `commands.getCommandDescriptors()`, `layerMetadata()` and `readPluginMethods()` exported from `scripts/generate-metadata.js` (its output is unchanged), and the harness `expose` option includes the command module. Break checks: a renamed parameter, a missing metadata file, and an undocumented command each fail | [CORE-020](AUDIT-CORE.md#core-020), [AUDIT-TESTS §5.5](AUDIT-TESTS.md#55-core-audit) | [#75](https://github.com/AndyStubbs/pijs/pull/75) |
| Core 11 | `shaders_lifecycle`: the 7 failing checks were fixture defects, not library ones. A 2x2 `rect()` fill is covered by its outline, drawn in the current color, so the sampler sources in sections 23, 25, 26, and 28 were gray; each now sets its color first. Section 28's shader was an identity tint, so its disposal checks could not tell it from no shader; it now keeps green and blue only, over a white source, with a new check that the display shader filters before disposal. The fixture resolves `window.patchResult` with its check count (`expectPatchResult = 122`), so the runner captures once the sequence ends; `waitUntil`, `delay`, `renderWait`, and `ciSkip` are removed, and the runner's `waitUntil` and `renderWait` options, which only this fixture used, are removed with their `test/README.md` text. The capture matches the approved baseline in full and lite, so it is unchanged. Checks: 10 of 10 repeats, and the full visual suite 3 times (90 of 90); removing the renderer's rescheduling safeguard now fails the fixture | [AUDIT-TESTS §5.5](AUDIT-TESTS.md#55-core-audit) | [#76](https://github.com/AndyStubbs/pijs/pull/76) |
| Core 12 | Test audit coverage gaps: `blitImage`, `blitSprite`, and `setDefaultAnchor` (`image-lifecycle-browser.test.js`: replace mode, scale, color, the default anchor per screen, its errors, and sprite frames), `calcWidth` (`font-publication-browser.test.js`), `screenToView` and `viewToScreen` (`numeric-boundaries.test.js`), and `getDefaultPal` values (`color-validation-browser.test.js`); `getShaderInfo` and `setPrintSize` are asserted since Core 11 and Core 6. SYS-013: an ESM plugin imported before Pi.js registers explicitly (`polygons-bundles-browser.test.js`). The tests found two blit defects, now fixed: any color made the pixels transparent, and the object forms drew nothing when a scale was omitted. Filter cleanup: the `cancelFilter` pre-cleanup hook is removed, since the check after each callback already stops the filter on removal and also on context loss, which a new case covers; removing that check fails both cases. Size: `size-phases2-3.json` | [AUDIT-TESTS §5.5](AUDIT-TESTS.md#55-core-audit) | — |
| Core 13 | `$.clearEvents()` clears every screen (I10, breaking): the global command passes no screen to the clear handlers, and each screen's `clearEvents()` passes that screen; the plugin API is unchanged, since every clear handler already treats no screen as every screen. So `$.clearEvents()` clears pointer handlers on every screen and cancels an `input()` prompt on any screen. Metadata: `clearEvents` describes both forms. Tests: the registry passes no screen from the global form (`plugins.test.js`); mouse, touch, press, and click handlers on two screens cleared by each form and by type (`pointer-browser.test.js`); KEY-016's `$` forms now cancel a prompt on the screen that is not active. The pointer Node harness clears as `$.clearEvents()` does | — | [#66](https://github.com/AndyStubbs/pijs/pull/66) |
| Core 5 | Offscreen context lifetime (C1): when the last screen of the shared offscreen context is removed, the renderer discards the context and releases it with `WEBGL_lose_context`, and the screen manager stops sharing its canvas (`releaseOffscreenCanvas`), since `getContext()` on that canvas would return the old context. The next standalone offscreen screen creates a new canvas and context with its own loss and restore listeners. A child screen keeps the context in use after its standalone parent goes. Test: `context-recovery-browser.test.js` (C01), in Full and Lite: the last member removed while the context works and while it is lost, a child keeping the context shared, the next screens drawing on a new shared context, the old context released, and the new context recovering from its own loss | [CORE-001](AUDIT-CORE.md#core-001) | [#71](https://github.com/AndyStubbs/pijs/pull/71) |

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
| 2.1 | Renames and 2.0.0 (I1, I16): the plugin registers `inKey`, `onKey`, and `offKey`, whose error messages start with the new names, and no longer registers `inkey`, `onkey`, and `offkey`, which `metadata/pi-2.3/_removed.toml` lists; the banner, the IIFE registration, and the module header are 2.0.0. The 2.3 metadata overrides are renamed (`keyboard-inKey.toml`, `keyboard-onKey.toml`, `keyboard-offKey.toml`), and every effective metadata example uses the new names, including new 2.3 overrides for `cancelInput` and `removeActionKeys` and the `sound-advanced` metadata. Callers updated: `html-core/keyboard_commands` (its printed labels, part of the baseline, are unchanged), the manual pages `clearevents_01`, `clearevents_02`, `fireworks`, `gamepad_01`, `onkey_sound_01`, and `sound_02`, `test/demos/galaga.html`, `tools/charedit.html` and `dataedit.html`, the evidence `device-check.html`, `firefox-smoke.js`, the type validator and consumer, and the keyboard Node and browser tests. `API.md`, the plugin README, and the llms references follow in R.2 and R.3. Tests: the new names are registered and the old ones are not and fail at their first call, and the Lite type consumer rejects `onkey` | — | [#51](https://github.com/AndyStubbs/pijs/pull/51) |
| 2.2 | Handler signature and removal (I2, I4, A14): a handler is identified by its key set, mode, and function. `onKey()` ignores a second registration of the same function for the same keys and mode, whatever its `once` and `allowRepeat`. `offKey( key, mode, fn )` removes that handler from every key it is registered under; `offKey( key, mode )` removes every handler of the mode; `offKey( key, null, fn )` and the object form without `mode` remove the function from both modes; `offKey( key )` throws `TypeError` with code `INVALID_MODE` and a message that points to `clearEvents( "keyboard" )`. `offKey` takes `key`, `mode`, and `fn`, so the old `once` and `allowRepeat` arguments are ignored (§1.2). Metadata: `offKey`'s `mode` and `fn` are optional and its flags are gone; the `onKey` and `offKey` examples use codes for game controls (I14). Tests: every removal form and the flags that no longer matter (K5), duplicate registrations, the `offKey` signature in `validate-type-definitions.js`, and the removal forms in the Lite type consumer | [KEY-007](AUDIT-KEYBOARD.md#key-007) | [#53](https://github.com/AndyStubbs/pijs/pull/53) |
| 2.3 | Start and stop (I5, A13): the plugin no longer starts at load. The first `inKey()` call, `onKey()` registration, or `setActionKeys()` call, including `set( { actionKeys } )`, starts tracking unless `stopKeyboard()` was called, and adds the `keydown`, `keyup`, and `blur` listeners, the last once; keys pressed before then are not tracked. `stopKeyboard()` holds until `startKeyboard()`: handlers stay registered but are not called, reads report nothing, and no use restarts tracking. An `input()` prompt keeps its own listener and does not start tracking. The hidden-page listener arrives with 2.4. Metadata: `startKeyboard`, `stopKeyboard`, `inKey`, `onKey`, and `setActionKeys` state the rule. Tests: nothing attached at load, each start trigger once, the prompt, and a stop that holds through every use until `startKeyboard()`; `set( { actionKeys } )` as the first use in the browser test (K20); the lifecycle test (K8) and the tests that pressed keys before any use now read first | [KEY-006](AUDIT-KEYBOARD.md#key-006) | [#54](https://github.com/AndyStubbs/pijs/pull/54) |
| 2.4 | Cancelled input (I6): window blur, the page becoming hidden, `stopKeyboard()`, a key event from an editable target, and an `input()` prompt starting release every held key through the normal `"up"` dispatch, in press order, instead of clearing held keys silently. Each release copies the key's last keydown data with `repeat: false` and `cancelled: true`, runs the handlers of its code, its value, and `"any"`, and a combination's `"up"` once, with the cancelled data for the released key and held data for the others; a later trigger finds nothing held. `stopKeyboard()` releases before removing its listeners. Key data carries `cancelled`, `false` unless cancelled. `onKeyUp` and the cancelled releases share one release path; the `visibilitychange` listener is added on the first start with `blur`; the prompt calls the plugin's release when it takes the keyboard. A real keyup that arrives after a cancelled release still reaches single-key and `"any"` handlers, as task 1.8 set. Metadata: `onKey`, `inKey`, `startKeyboard`, `stopKeyboard`, and `input`. Test: each trigger, the release data and order, the combination, no second release, and `cancelled: false` otherwise | [KEY-011](AUDIT-KEYBOARD.md#key-011) || [#55](https://github.com/AndyStubbs/pijs/pull/55) |
| 2.5 | Reads and dispatch (I7, I8, I9): `inKey()` returns a frozen array of the held key data, the same array until a key is pressed or released, and `inKey( key )` returns the key data or `null`. State is updated before dispatch: a keydown is held before its handlers run, and a keyup or cancelled release is removed before its `"up"` handlers run, so they no longer see the key in `inKey()`; combination `"up"` handlers match against the keys held just before the release. One dispatch collects the handlers of the key's code, its values, and `"any"` when it starts, so handlers added during it first run in the next event, and a combination registered under several of the names runs once. A handler that throws is reported with `console.error` (`onKey: Handler for "<mode>" failed:`) instead of a rethrow from a microtask; the prompt's completion callback keeps its microtask rethrow. Metadata: `onKey` and `inKey`; the `stopKeyboard` description rewrapped. Tests: one frozen list per state and the `null` reads; state inside down and up handlers, a handler added during a dispatch, and a combination under a code and value; a throwing handler reported while the others run; the SYS-011 keyup test checks `inKey( "a" ) === null` inside its combination handler, and the Node and browser error tests read `console.error` | [KEY-013](AUDIT-KEYBOARD.md#key-013) | [#57](https://github.com/AndyStubbs/pijs/pull/57) |
| 2.6 | `clearEvents` scope (I10, A15): `clearEvents( "keyboard" )` already removed every key handler whichever screen called it, and cancelled the prompt only with no screen or from its owner (task 1.3), so the behavior is unchanged; `clearKeyboardEvents()` documents the rule. Tracking, held keys, and action keys are untouched by clearing. `$.clearEvents()` still passes the active screen until Core 13, so the browser test puts the `$` forms' prompts on the active screen; Core 13 tests the prompt on another screen. Metadata: `clearEvents` describes the `"keyboard"` type. Tests: prompts owned by each of two screens, cleared from the other screen, the owner, and no screen, with the handlers gone and tracking kept in every case; in the browser, both screen forms, `$.clearEvents( "keyboard" )`, and `$.clearEvents()`. Removing either half of the rule fails the Node test | [KEY-016](AUDIT-KEYBOARD.md#key-016) | [#58](https://github.com/AndyStubbs/pijs/pull/58) |
| 2.7 | Validation (A7, I11): `onKey` and `offKey` take a key that is a non-empty string or a non-empty array of strings (`INVALID_KEY`: `TypeError` for a wrong type, `RangeError` for an empty string or array, and for `"any"` inside a combination, which could never run); the array is copied and de-duplicated in the order given, so the caller's array is no longer sorted, combination data follows the order given, and the key-set identity is a sorted JSON copy. `mode` is `"up"` or `"down"` (`INVALID_MODE`, `RangeError` for another string); `fn` uses `INVALID_FUNCTION`; `once` and `allowRepeat` are booleans or omitted (`INVALID_ONCE`, `INVALID_ALLOW_REPEAT`). `inKey()` treats `null` and `undefined` as no key and throws `INVALID_KEY` for other non-strings and `""`. Action keys, including `set( { actionKeys } )`, are arrays of non-empty strings (`INVALID_KEYS`). `input()` uses `INVALID_PROMPT`, `INVALID_FUNCTION`, `INVALID_CURSOR`, the three flag codes, and `INVALID_MAX_LENGTH` (`TypeError` for a non-integer, `RangeError` below 1); `null` and `undefined` take the defaults, so `maxLength: undefined` works before Core 6, and an empty cursor keeps the block. Each file has a `throwCode` helper, as `sound-advanced` does; `INVALID_PARAMETERS` is gone from the plugin. Metadata: `onKey`, `offKey`, `inKey`, `setActionKeys`, `removeActionKeys`, `input`; compatibility summary 5.4. Tests: every rejected argument with its error type, code, and command prefix, and the defaults for omitted values; `input()` options, including `maxLength` omitted in both forms; the caller's array, order, duplicates, and `offKey` matching (K6); `set( { actionKeys } )` in the browser (K20); the I6 test's combination data now in the order given | [KEY-009](AUDIT-KEYBOARD.md#key-009), [KEY-010](AUDIT-KEYBOARD.md#key-010) | [#59](https://github.com/AndyStubbs/pijs/pull/59) |
| 2.8 | Prompt keys withheld (A11): while an `input()` prompt is active, key events do not reach `onKey()` handlers or `inKey()`, as keys typed into a text field do not. The prompt's listener marks each event it reads (`isPromptKey()` in `input.js`: a prompt is active, or a prompt read the event), so the Enter that ends a prompt is withheld whichever listener runs first. A keyup is also withheld when its code's keydown was, or when the prompt's start released the key as cancelled (task 2.4), so no key is released twice; a later keydown of the code outside a prompt clears this. Action keys keep their default prevented while withheld. The prompt calls the plugin's `withholdHeldKeys()` when it starts. `charedit.html` and `dataedit.html` no longer run their menu handlers for digits typed into their prompts. Metadata: `input`, `onKey`, `inKey`. Tests: a key held across the prompt's start, typed keys, releases during and after the prompt, the ending Enter, and keys reaching handlers again afterward; the ending key with the prompt's listener first and an action key; the native-keyboard prompt test (K9n) with game handlers; the 2.6 test's held count while its kept prompt is active | [KEY-003](AUDIT-KEYBOARD.md#key-003) | [#60](https://github.com/AndyStubbs/pijs/pull/60) |
| 2.9 | `setActionKeys()` replaces (A12): the command and `set( { "actionKeys": … } )` replace the action keys; the keys are checked first, so an invalid call leaves the set unchanged, and an empty array clears it. `removeActionKeys()` is unchanged. No demo, fixture, tool page, or manual page called `setActionKeys()` twice; the keyboard README still shows adding, for R.3. Metadata: `setActionKeys` (summary, description, and parameter); compatibility summary 5.4. Size at the Phase 2 exit in `docs/evidence/keyboard-2.3/size-phase2.json` and its README: the standalone plugin 2.0.0 is 4,206 bytes gzipped (+716 since Phase 1). Tests: task 1.11's Node test now replaces sets, keeps the set after an invalid call, removes some keys, and clears with an empty array; the browser test replaces through both the command and `set()` (K20) | [KEY-014](AUDIT-KEYBOARD.md#key-014) | [#61](https://github.com/AndyStubbs/pijs/pull/61) |
| 3.1 | Release inputs: the compatibility summary (5.4) completed with the plugin version, the Phase 1 fixes, dispatch timing, and the prompt's Enter; the keyboard's device checks in Section 8.3 point to a release pass in `docs/evidence/keyboard-2.3/README.md`, with expected results per step and a new hidden-tab step; `device-check.html` shows cancelled releases (I6) and key handler calls during a prompt (A11), checked headless in Chromium. The final size, measured on `main` at `44d1fb1`, equals the Phase 2 exit: 4,206 bytes gzipped for the standalone plugin 2.0.0, +1,096 since the baseline | — | — |

### 13.7 Pointer

| # | Task | Findings | Ref |
| --- | --- | --- | --- |
| 1.1 | Handler bookkeeping (B1): dispatch runs whenever a mode has handlers, and the per-type counters that `off*()` adjusted by guesswork are gone. `off*( mode, fn )` removes only that function's registrations in that mode; a `once` registration removes only itself, before its handler runs; a handler removed or cleared during a dispatch does not run later in it. Harness: `pointer-events.test.js` loads `mouse.js`, `touch.js`, `press.js`, and the plugin entry into `vm` contexts, maps arguments with core's `parseOptions`, and dispatches mouse and touch events through the plugin's canvas listeners; the fake event target moved from `keyboard-lifecycle.test.js` to `vm-module-harness.js` for the pointer and gamepad harnesses. Tests: clearing one mode, removing functions that were never added, removal and clearing during a dispatch, and `once` with a duplicate registration (P1, P7, today's duplicate semantics) | [PTR-001](AUDIT-POINTER.md#ptr-001) (P1), [PTR-009](AUDIT-POINTER.md#ptr-009) | [#34](https://github.com/AndyStubbs/pijs/pull/34) |
| 1.2 | Dispatch isolation (B2): each mouse, touch, press, and click handler runs in its own `try`, and a throw is reported with `console.error`, naming the command and mode, so the other handlers and the press and click dispatches of the same event still run. `touchstart` is prevented before any handler runs; state was already updated before dispatch. The harness stubs `console.error`. Test: throwing mouse, press, click, and touch handlers, with the touch start still prevented (P6) | [PTR-006](AUDIT-POINTER.md#ptr-006) | [#35](https://github.com/AndyStubbs/pijs/pull/35) |
| 1.3 | Per-touch tracking (B3): touch state is updated from `changedTouches`, so each touch keeps its own action and `intouch()` shows only touches still down. Touch handlers receive copies of the touches the event changed, and hit boxes test them: `"end"` reports the touch that lifted, at the position where it lifted. `touchcancel` has its own listener: it calls the `"end"` handlers and the press `"up"` handlers with `cancelled: true`, disarms every click listener of the screen, and never clicks. Touch, press, and mouse data carry `cancelled`, `false` unless cancelled (I6), and the SYS-009 late-installation test expects it; the data shape is otherwise unchanged. The visual runner's `TE` sends the ended touch at its last position in `changedTouches` with an empty `touches` list, documented in `test/README.md`; every pointer fixture kept its baseline. Tests: end data and hit boxes, per-touch actions and changed-touch data (P2), and cancel data, no click, and disarming (P4) | [PTR-002](AUDIT-POINTER.md#ptr-002), [PTR-005](AUDIT-POINTER.md#ptr-005) | [#36](https://github.com/AndyStubbs/pijs/pull/36) |
| 1.4 | Primary pointer and clicks (B4): press follows the primary pointer, the mouse or the primary touch. A touch is primary when it starts with no other touch down, and stays primary until it lifts; after that no touch is primary until every touch is up (the Pointer Events `isPrimary` rule). Press `"down"`, `"move"`, and `"up"` dispatch only for the primary touch; its release reports `action: "up"` and `buttons: 0`, and `inpress()` keeps it until the next primary touch. Touch press data is the primary touch, and `touches` holds it followed by the other touches still down. Clicks are per pointer: a down inside a click box arms the listener for that pointer, only for the primary mouse button; that pointer's release inside the box fires it with its own data; any other release, a release outside the box, or a cancel disarms it. The screen's `lastTouches` is replaced by the primary touch's press record. The harness sends `button` with mouse events. Tests: press and clicks with two fingers and the primary rule (P3), right and middle buttons (P5), and stale arming with the mouse and touch (P4) | [PTR-003](AUDIT-POINTER.md#ptr-003), [PTR-005](AUDIT-POINTER.md#ptr-005), [PTR-008](AUDIT-POINTER.md#ptr-008) | [#37](https://github.com/AndyStubbs/pijs/pull/37) |
| 1.5 | Every press ends with one release (B5): the canvas `mouseup` listener is replaced by a capture `mouseup` listener on `window`, attached only while some screen holds a button, so a release outside the canvas arrives and reports its position there. A release for a button a screen does not hold is ignored, and so is an end for a touch that is not held; a touch event that changes no tracked touch calls no handler. The `window` `blur` listeners and their silent resets are removed. A `visibilitychange` listener on `document`, added at registration until 1.7, releases held buttons and touches when the page is hidden; `stopMouse()` and `stopTouch()` release them first. These releases run the mouse `"up"`, touch `"end"`, and press `"up"` handlers with `cancelled: true` and never click. Screen removal clears the handlers before stopping, so it calls none of them. The harness document is an event target with `visibilityState`, and mouse events bubble to the window. Tests: a release outside the canvas, releases not held (P8), blur (P9), a hidden page and the late real releases (P9), stop commands (P10), and screen removal in `pointer-events.test.js`; a trusted drag released outside the canvas (T1) in `pointer-browser.test.js` | [PTR-004](AUDIT-POINTER.md#ptr-004), [PTR-007](AUDIT-POINTER.md#ptr-007), [PTR-010](AUDIT-POINTER.md#ptr-010) | [#38](https://github.com/AndyStubbs/pijs/pull/38) |
| 1.6 | Border and padding (B8): a `mousedown` or `touchstart` that maps outside the screen, on the canvas border or padding, is ignored (`isOnScreen()` in `target.js`). So that such a press never becomes held, mouse data reports only buttons pressed on the screen (`e.buttons` masked by the held buttons on down, move, and release), and moves and ends of a touch that is not tracked are ignored. Moves and releases report their true position, which can be outside the screen. Hit boxes accept any finite `x`, `y`, `width`, and `height`; a negative size throws `RangeError` with `INVALID_HITBOX`, and the other hit-box errors stay plain `Error`s until 2.8. Tests: presses, moves, and releases on the border for mouse and touch (P11), and fractional and invalid hit boxes (P13); a test that moved a touch it never started now starts it | [PTR-011](AUDIT-POINTER.md#ptr-011), [PTR-012](AUDIT-POINTER.md#ptr-012) | [#39](https://github.com/AndyStubbs/pijs/pull/39) |
| 1.7 | Listeners on first start (B12): the mouse and touch `visibilitychange` listeners are added to `document` when mouse or touch tracking first starts on any screen, once each, instead of at plugin load, and stay for the page's life; the `window` `mouseup` listener is attached only while a button is held (1.5), and the `blur` listeners are gone (1.5). A page that loads the plugin without using pointer input attaches no `window` or `document` listener. Test: no listener after load, one per module after starts on two screens and a stop and restart | — | [#40](https://github.com/AndyStubbs/pijs/pull/40) |
| 1.8 | Metadata and manual pages: `metadata/pi-2.3/` overrides for all 17 pointer commands and `clearEvents`, and current `HitBox`, `MouseData`, `PressData`, `ClickData`, and `TouchData` objects, describing Phase 1 behavior: first-use start and sticky stops, releases outside the canvas and cancelled releases, presses on the border ignored and true positions, changed touches for touch handlers, the primary pointer for press, per-pointer clicks, handler bookkeeping and isolation, finite hit boxes, the context-menu and pinch-zoom behavior, `"press"` clearing clicks, and `cancelled` and nullable `lastX`/`lastY` in the data types; the `startMouse` reference to `getMouse()` and the always-true `lastX !== undefined` examples are gone, and "Requires an onscreen screen" is stated only for the commands that check it. `html-manual/contextmenu_01` no longer loads the standalone plugin after Full, and `ontouch_03` no longer calls the removed `$.render()` and `pi.util.clamp()`; every manual pointer page loads without errors in Chromium. Tests: the `ontouch` signature and the `TouchData` fields in `validate-type-definitions.js` and the Lite pointer type consumer; a press, blur, and a hidden page with Lite and the standalone plugin loaded after its screens (P16) in the late-installation test | [PTR-015](AUDIT-POINTER.md#ptr-015), [PTR-016](AUDIT-POINTER.md#ptr-016) | [#41](https://github.com/AndyStubbs/pijs/pull/41) |
| 1.9 | Fixtures: `intouch_01` and `inpress_01` read their polled state after every input event instead of on a 15 ms interval or an animation frame, and their `DL` waits are gone; five runs gave captures byte-identical to the approved baselines, so no baseline changed, and both lose their `ciSkip`. The X-drag group keeps `intouch_01` (COV-001) and `inpress_01` (the one polled command driven by mouse and touch) and removes `inmouse_01` and `onmouse_01`; the identical-script group keeps `onpress_01` and removes `onpress_02`, `ontouch_04`, and `onmouse_03`; the manual pages `ontouch_01` and `ontouch_02` are removed. The duplicate tests `pointer-events` "registration can be removed in the same turn" and `pointer-browser` "lifecycle fixture clears subscriptions" and "offscreen pointer commands report the invoked command" are removed. New Node tests: `offtouch()` (its first), `offpress()` and `offclick()` (a second), and `setEnableContextMenu()`; the P10 test also checks touch after `stopTouch()` and restarting. Each removal names its covering tests and a deliberate break in `test/TEST-CONSOLIDATION-LOG.md`; every pointer command keeps a test. Visual fixtures: 35 to 30 full, 20 Lite. Phase 1 exit: size recorded in `docs/evidence/pointer-2.3/README.md` (plugin +822 bytes gzipped) | [PTR-017](AUDIT-POINTER.md#ptr-017), [CI-008](AUDIT-CI.md#ci-008), [AUDIT-TESTS §5.2](AUDIT-TESTS.md#52-pointer) | [#42](https://github.com/AndyStubbs/pijs/pull/42) |
| 2.1 | Renames and 2.0.0 (I1, I16): the plugin registers `inMouse`, `onMouse`, `offMouse`, `inTouch`, `onTouch`, `offTouch`, `inPress`, `onPress`, `offPress`, `onClick`, and `offClick`, whose error messages start with the new names, and no longer registers the lowercase names, which `metadata/pi-2.3/_removed.toml` lists; the banner, the IIFE registration, and the module header are 2.0.0. The 2.3 metadata files and titles are renamed, `screen` gains a 2.3 override for its `inMouse()` mention, and the declarations are regenerated. Call sites move in the tests, fixtures (whose file and fixture names stay), manual pages, `galaga.html`, `tools/`, the Firefox smoke test, the type checks, and the evidence `device-check.html`. Test: the new names are registered and the old ones are not (`pointer-events.test.js`) | — | [#78](https://github.com/AndyStubbs/pijs/pull/78) |
| 2.2 | One Pointer Events path (B6): a new `listeners.js` gives each canvas one set of `pointerdown`/`pointermove`/`pointerup`/`pointercancel` listeners while mouse or touch tracking runs, routing mouse and pen pointers to the mouse handlers and touch pointers to the touch handlers, each only while its tracking runs; an accepted press captures its pointer, guarded for pointers the browser refuses. Chorded buttons arrive as moves naming the button. `pointercancel` releases with `cancelled: true` (I6) and never clicks. Pens report `type: "pen"`. Each touch pointer is one touch, keyed by `pointerId`. Touch tracking sets the canvas `touch-action` to `none` and restores it on stop, replacing `preventDefault()` on `touchstart`. The Phase 1 window `mouseup` listener is gone; the hidden-page and stop releases stay. Tests: the Node harness sends the pointer events a browser sends, with a capturing fake canvas, plus chorded buttons, a cancelled mouse, pens, a refused capture, and shared listeners with `touch-action`; the browser tests use `PointerEvent`s, and a new trusted CDP touch drag leaves the canvas and ends once. The visual runner's touch commands, `inpress_01`, `intouch_01`, `pointer_lifecycle_01`, and the evidence `device-check.html` use pointer events; `test/README.md` and the metadata describe the new path | [PTR-004](AUDIT-POINTER.md#ptr-004), [PTR-006](AUDIT-POINTER.md#ptr-006) | [#79](https://github.com/AndyStubbs/pijs/pull/79) |
| 2.3 | One data shape and modes (B7, I3): `createPointerData()` in `target.js` builds every mouse, touch, press, and click object as `{ x, y, lastX, lastY, buttons, action, type, id, cancelled }`; press data adds `touches`, frozen copies of the active touches (empty for the mouse), so `inPress()` serializes. Touch modes and actions are `"down"`, `"move"`, and `"up"`, touch `buttons` is 1 while down, and `onTouch`/`offTouch` with `"start"` or `"end"` throw `INVALID_MODE` naming the new mode. `lastX`/`lastY` equal `x`/`y` on a pointer's first event; mouse `id` is the `pointerId` (-1 before the first event); click data has `action: "click"`. Metadata: `MouseData`, `TouchData`, `PressData`, and `ClickData` in the shared order, and the touch commands' modes; the type check pins `touches`. Tests: the shape of every kind of data, serializing `inPress()`, and the renamed-mode errors (P12); the touch tests use the new modes and actions; the manual pages and a type consumer use them too | [PTR-013](AUDIT-POINTER.md#ptr-013) | [#80](https://github.com/AndyStubbs/pijs/pull/80) |
| 2.4 | Handler signature and removal (I2, I4): a handler is identified by its mode and function. `onMouse`, `onTouch`, `onPress`, and `onClick` ignore a second registration of the same function for the same mode, whatever its `once`, hit box, and custom data, so the 1.1 duplicate-`once` test now counts one call. `offX( mode, fn )` removes that handler; `offX( mode )` removes every handler of the mode; `offX( null, fn )` and the object form without `mode` remove the function from every mode; `offX()` with neither throws `TypeError` with code `INVALID_MODE` and a message that points to `clearEvents( "mouse" )`, `"touch"`, or `"press"`. `offClick()` without a function removes every click handler of the screen (implied mode). `onClick( fn, once, hitBox, customData )` already had the I2 signature (task 2.1). The shared `onevent`/`offevent` helpers lose their unused `extraId` and `extraData` arguments. Metadata: `offMouse`, `offTouch`, and `offPress` take an optional `mode` (`string | null`) and describe every removal form; the `onX` and `offClick` descriptions state the identity rule. Tests: duplicate registrations with other flags, hit boxes, and custom data; the same function in two modes; each removal form and the `offX()` errors for the three commands; `offClick()`; the `offMouse` signature in `validate-type-definitions.js` and the removal forms in the Lite type consumer | [PTR-009](AUDIT-POINTER.md#ptr-009) | [#81](https://github.com/AndyStubbs/pijs/pull/81) |
| 2.5 | Start, stop, and reads (I5, I7, I8, I9, B13): pointer data is created once per event and frozen (`createPointerData()` freezes), and reads return the stored objects instead of copies. `inMouse()` returns the mouse data of the latest event, the object its `onMouse` handlers received, and `null` before the first mouse event and after `stopMouse()` (the centered `action: "none"` record is gone). `inPress()` returns the press data of the latest accepted mouse or touch event, the object its `onPress` handlers received, and `null` before the first event and after the stop of the input it came from; an ignored touch no longer switches the press to touch. `inTouch()` returns a frozen list, replaced when a touch changes, whose touches are the objects the `onTouch` handlers received; press `touches` is that list. Handler arrays, hit-box-filtered arrays, and click data are frozen. Tracking already started on first use and stayed stopped until `startX()` (I5); state was already updated before dispatch (I8). The empty touch list is set at screen init, since screen data items are copied without their freeze. Metadata: `inMouse`, `inPress`, `inTouch`, `stopMouse`, `stopTouch`, and the `MouseData`, `PressData`, `TouchData`, and `ClickData` descriptions; `inMouse()` and `inPress()` return `MouseData | null` and `PressData | null`, pinned in `validate-type-definitions.js`, and the examples check for `null`. Tests: one object per event for every read and handler, frozen data and lists, the `null` reads before the first event, after each stop, and after a restart (P15); the P2 test checks frozen touches, and the stop and screen-removal tests read `null`; the late-install test expects `null`; the Lite type consumer reads `inMouse()?.x`; `inpress_01`, `view_comprehensive`, and the manual events page check for `null` | [PTR-010](AUDIT-POINTER.md#ptr-010) | [#82](https://github.com/AndyStubbs/pijs/pull/82) |
| 2.6 | `clearEvents` scope (I10): the plugin registers `"click"` as its own type, so `"press"` clears only `onPress` handlers and `"click"` only `onClick` handlers. The four types share one registration helper in `index.js`: a screen's `clearEvents()` clears that screen, and `$.clearEvents()`, which passes no screen (Core 13), clears every screen. `offClick` names `"click"` as its clear type. Metadata: `clearEvents` lists the four pointer types and the commands each clears. Tests: `"press"` keeps clicks, and `"click"` on one screen and on every screen, in the Node harness; the Core 13 browser test's `"press"` case keeps clicks and gains `first.clearEvents( "click" )` and `$.clearEvents( "click" )` | — | [#83](https://github.com/AndyStubbs/pijs/pull/83) |
| 2.7 | Gesture settings (B10, I12): `setContextMenu( isEnabled )` replaces `setEnableContextMenu`, which goes in `_removed.toml`; option `contextMenu`, and the old option `enableContextMenu` fails through Core 8. The `contextmenu` listener is added at screen init for onscreen canvases and removed at screen cleanup, so the menu is suppressed from screen creation whether or not mouse tracking runs; `setContextMenu()` no longer starts mouse tracking, and `stopMouse()` no longer lets the menu open. `setPinchZoom( isEnabled )` is a screen command that validates its target and sets the canvas `touch-action` at any time, `"pinch-zoom"` or `"none"`, never `<body>`, without starting touch tracking. Touch tracking still sets `none` when it starts and restores the previous value when it stops, unless `setPinchZoom()` set the canvas, whose value it then keeps; `noCss` canvases are no different. Metadata: `setContextMenu` replaces `setEnableContextMenu`, and `setPinchZoom` is a screen command describing the canvas values; the type check pins `setContextMenu` and `contextMenu`. Tests: the menu from screen creation, per screen, without starting tracking, after `stopMouse()`, and with no listener left on a removed screen; `setPinchZoom` before, during, and after tracking, on one canvas only, and never on `<body>` (P13, P14); the B6 listener test keeps `contextmenu` after both stops; a browser test with a `noCss` screen covers the menu, `touch-action`, `set( { contextMenu, pinchZoom } )`, `<body>`, and the old option and command; the offscreen validation test covers `setContextMenu` and `setPinchZoom`; the Lite type consumer sets `contextMenu` and rejects `enableContextMenu`. Fixtures, manual pages, `tools/charedit.html`, `tools/dataedit.html`, and the evidence `device-check.html` use the new names | [PTR-014](AUDIT-POINTER.md#ptr-014) | [#84](https://github.com/AndyStubbs/pijs/pull/84) |
| 2.8 | Validation (B9, I11): the shared handler helpers check the mode (`TypeError` for a non-string, `RangeError` for an unknown mode, `INVALID_MODE`), the function (`TypeError`, `INVALID_FUNCTION`), `once` (a boolean or omitted, else `TypeError`, `INVALID_ONCE`), and the hit box (`TypeError` for anything but an object with finite `x`, `y`, `width`, and `height`, including `false` and numbers; `RangeError` for a negative size, `INVALID_HITBOX`), with messages starting with the command name. The renamed touch modes throw `RangeError`. `setContextMenu` and `setPinchZoom` take a boolean `isEnabled`, or omitted for `false`; any other value throws `TypeError` with `INVALID_IS_ENABLED` and changes nothing. No plain `Error` is left in the plugin. Metadata: the `onX` and `offX` descriptions give the rules and codes, and the settings their `isEnabled` rule. Tests: every code and error type for registration, removal, and settings, exact messages, nothing registered or changed by a rejected call, and `once` omitted, `null`, or boolean (P13); the hit-box test expects `TypeError` and covers non-objects. Phase 2 exit: `docs/evidence/pointer-2.3/size-phase2.json` and its README section (standalone 2.0.0: 5,056 bytes gzipped, +283 from Phase 1) | [PTR-012](AUDIT-POINTER.md#ptr-012) | [#85](https://github.com/AndyStubbs/pijs/pull/85) |
| 3.1 | Wheel input (B11): a new `wheel.js` registers `onWheel( fn, once, hitBox, customData )` and `offWheel( fn )` through the shared handler helpers, so identity, `once`, hit boxes, dispatch isolation, and I11 validation match the other commands. A screen's canvas has a non-passive `wheel` listener only while the screen has wheel handlers; it calls `preventDefault()`, so the page does not scroll with the wheel over the canvas, and it goes with the last handler, including a spent `once` handler, `offWheel()`, `clearEvents( "wheel" )`, and screen removal. Handlers receive frozen `{ x, y, deltaX, deltaY }` at the screen position, with deltas in CSS pixels: lines are 16 pixels and pages the window size. Wheel needs no tracking, so the mouse start and stop commands do not affect it. `clearEvents` gains the `"wheel"` type (I10). Metadata: `onWheel`, `offWheel`, `WheelData`, and the `clearEvents` types; the type check pins `WheelData` and the `onWheel` signature. Tests: pixel, line, and page deltas, frozen data, custom data, hit boxes, `once`, identity, the listener and prevented scroll only while handlers exist, `offWheel()`, `clearEvents( "wheel" )` on one screen and every screen, screen removal, and validation, in the Node harness (whose fake listeners now record `passive`); a trusted wheel in Chromium reaches the handler at its screen position without scrolling the page, and scrolls it after `offWheel`; the Lite type consumer registers and removes a wheel handler. Size: the standalone plugin is 5,440 bytes gzipped, +384 over Phase 2, above the 200–300 byte estimate | — | [#87](https://github.com/AndyStubbs/pijs/pull/87) |
| 3.2 | Release inputs: the compatibility summary (6.4) completed with dispatch (I8, B1, B2) and the Phase 1 fixes in the new touch mode names; the pointer's device checks in Section 8.3 point to a release pass in `docs/evidence/pointer-2.3/README.md`, with 13 steps and expected results for the mouse, the wheel, a hidden tab, touches, a system gesture, pinch zoom, and a pen. `device-check.html` works with the 2.0.0 API again (`inMouse()` and `inPress()` are `null` before the first event, which stopped its drawing after Pointer 2.5) and shows cancelled releases, touches, the wheel with a handler toggle and the page scroll, the canvas `touch-action` with a pinch-zoom toggle, and the pointer type; a **Record step** button serves touch devices. Checked headless in Chromium with trusted mouse, wheel, and touch input and no page errors. The final size, `size-final.json` on `main` at `603ef3f`: 5,440 bytes gzipped for the standalone plugin 2.0.0, +1,489 since the baseline. The audit's status table marks every finding done | — | [#88](https://github.com/AndyStubbs/pijs/pull/88) |

### 13.8 Gamepad

| # | Task | Findings | Ref |
| --- | --- | --- | --- |
| 1.1 | One updater (A1): the polling loop is the only updater. It keeps each pad's state apart from the pad object and accumulates presses and releases every frame. A read, any `ingamepad()` call or pad helper call, including on a pad object the game kept, publishes that state to the pad objects on the first read in each loop frame: the edges since the last frame with a read, `lastAxes` as the axes at the previous read, and the current buttons and axes; every other read in the frame sees the same result, and a press and a release between reads are both reported. The read that starts polling records the current state without edges. A pad recorded by a connection event, the start-up scan, or the loop starts with every button released, so the press that exposed it is reported on the next read, after the connect handlers have seen the pad; connection events never update a tracked pad, so they consume no edges. The per-tick update guard is gone. Harness: `gamepad-validation.test.js` loads the plugin with `vm-module-harness.js`, maps arguments with core's `parseOptions`, scripts pads and animation frames, dispatches connection and `visibilitychange` events through fake `window` and `document` targets, and keeps the `clearEvents` handler; the SYS-021 tests run on it unchanged. Tests: every-frame, every-other-frame, and timer readers, before and after the plugin loop (P1); a tap between reads; one result per frame from any code; the first read; the exposing press (P3b); a connection event after an edge | [PAD-001](AUDIT-GAMEPAD.md#pad-001), [PAD-017](AUDIT-GAMEPAD.md#pad-017) | [#43](https://github.com/AndyStubbs/pijs/pull/43) |
| 1.2 | Visibility, not blur (A2): the `window` `blur` and `focus` listeners, which paused the loop and froze the last snapshot, are removed, so polling continues on a visible page without focus. A `visibilitychange` listener on `document`, added at registration until 1.6, releases every button, zeroes the axes, and clears pending edges when the page is hidden, and the next read publishes that state even within a frame already read; the loop skips updates while the page is hidden, and its first update after the page is visible again records the current state without edges, so a button held on return reads as pressed but not just pressed. Tests: blur and focus with a press and release (P4), and a hidden page with a press pending, frames while hidden, and the return with the button held | [PAD-002](AUDIT-GAMEPAD.md#pad-002) | [#44](https://github.com/AndyStubbs/pijs/pull/44) |
| 1.3 | Dispatch isolation (A3): connect and disconnect handlers are registrations dispatched from a copy of the list, so handlers added during a dispatch first run in the next one, and handlers cleared by `clearEvents( "gamepad" )` during a dispatch do not run later in it; the 1.x commands have no `once` or removal, which arrive with 2.2. Each handler runs in its own `try`, and a throw is reported with `console.error` as `"<command>: Handler failed:"` with the error. A disconnected pad leaves the list before its handlers run, and the start-up scan records every pad before dispatching. `startGamepad()` schedules the loop before the scan, so a throwing scan handler neither escapes from the command that started polling nor leaves polling off. Tests: throwing disconnect and connect handlers and the pad list (P5), a throwing handler in the start-up scan (P5b), and handlers added and cleared during a dispatch (P6) | [PAD-003](AUDIT-GAMEPAD.md#pad-003) (P1), [PAD-004](AUDIT-GAMEPAD.md#pad-004), [PAD-007](AUDIT-GAMEPAD.md#pad-007) | [#45](https://github.com/AndyStubbs/pijs/pull/45) |
| 1.4 | Connection replay (A4): each connect registration keeps the pad objects it has received, and every delivery, from the start-up scan, a connection event, or a replay, skips a pad the handler already has, so each handler receives each connection once and a reconnect, a new pad object, is delivered again. `onGamepadConnected()` replays the connected pads to the new handler in index order, after the start-up scan it may trigger; a handler registered during a dispatch receives them when the outermost dispatch ends (I8). A second connection event for a tracked, connected pad calls no handler, while a pad the loop recorded before its event still reaches every handler once. Tests: replay after the scan, after polling, and for a pad the loop recorded early (P7); duplicate events and a reconnect (P3); the P5 and P6 tests now expect the replay | [PAD-005](AUDIT-GAMEPAD.md#pad-005), [PAD-006](AUDIT-GAMEPAD.md#pad-006) | [#46](https://github.com/AndyStubbs/pijs/pull/46) |
| 1.5 | Stable live objects (A7): a read updates each pad's `buttons` array, every button object, `axes`, and `lastAxes` in place, so saved references stay current; the loop updates its internal button and axis state in place, and a hidden page releases it in place, so polling allocates nothing per frame. `ingamepad()` without an index refills one array in place in index order instead of allocating and sorting a new one per call. Test: the pad, its arrays, a button object, the list, and the internal state keep their identity across frames, a hidden page, and a disconnect, and a held reference sees the press (P12); the harness exposes the internal state for it | [PAD-009](AUDIT-GAMEPAD.md#pad-009) | [#47](https://github.com/AndyStubbs/pijs/pull/47) |
| 1.6 | Listeners on first start (A12): the `visibilitychange` listener joins the connection listeners, which are added once, when polling first starts, so a page that loads the plugin without using a gamepad attaches no `window` or `document` listener; the blur and focus listeners were removed by 1.2. The `webkitGetGamepads` fallback is gone; one helper reads `navigator.getGamepads()`. Tests: listeners and the loop only after a start, once however often it runs, and the loop cancelled by a stop; the lifecycle (P8), asserting today's behavior that 2.3 changes: reads after a stop return `null` without restarting, registering a handler restarts polling, connection handlers run while stopped, and `startGamepad()` resumes; and a navigator with only `webkitGetGamepads`. These are the first tests of `startGamepad`, `onGamepadConnected`, and `onGamepadDisconnected` together with `stopGamepad` | [PAD-016](AUDIT-GAMEPAD.md#pad-016), [AUDIT-TESTS §5.4](AUDIT-TESTS.md#54-gamepad) | [#48](https://github.com/AndyStubbs/pijs/pull/48) |
| 1.7 | Metadata and manual pages: `metadata/pi-2.3/` overrides for the six gamepad commands and current `GamepadData` and new `GamepadButton` objects. `GamepadData` gains `timestamp`, `vibrationActuator`, `lastAxes`, and the six helper methods with their out-of-range values, and describes live pads, reads and edges, and the index as the browser's; `ingamepad` returns `GamepadData | Array<GamepadData> | null | undefined` with each case; the disconnect callback receives `{ index, id, mapping, connected }`, not `GamepadData`; `setGamepadSensitivity` gives its default, scaling, and error; the start, stop, and connection commands describe first-use start, replay, the hidden page, and what a stop leaves running; `clearEvents` lists `"gamepad"`. `html-manual/gamepad_02` and `gamepad_03` no longer load the standalone plugin after Full, and `gamepad_03` draws its footer for pad 0. `gamepad-validation-browser` keeps only bundle wiring, logged with its breaks in `test/TEST-CONSOLIDATION-LOG.md`. Tests: the `ingamepad` return type and a helper signature in `validate-type-definitions.js`, and the Lite gamepad type consumer narrowing the list and calling a helper and the disconnect callback. Phase 1 exit: size recorded in `docs/evidence/gamepad-2.3/README.md` (plugin +594 bytes gzipped) | [PAD-014](AUDIT-GAMEPAD.md#pad-014), [PAD-015](AUDIT-GAMEPAD.md#pad-015) | — |
| 2.1 | Rename and 2.0.0 (I1, I16): `ingamepad` becomes `inGamepad`, and the old name is unregistered and listed in `_removed.toml`; its metadata file becomes `gamepad-inGamepad.toml`, a case-only rename. The banner, the module `@version`, and the registration move to 2.0.0. The other gamepad metadata, `_objects.toml`, the manual pages `gamepad_01`–`gamepad_03`, the evidence `device-check.html`, the type check, and the Lite type consumer use the new name; the audit's `probes.js` keeps the old API it measured, and `docs/GAMEPAD.md` is updated in R.3. Tests: the Node harness registers `inGamepad` and not `ingamepad`, the browser wiring test checks the old name is gone from the Full bundle, and the existing tests read through `inGamepad` | — | [#89](https://github.com/AndyStubbs/pijs/pull/89) |
| 2.2 | Connection handlers (A5, I2, I4, I8): `onGamepad( mode, fn, once )` and `offGamepad( mode, fn )` with modes `"connect"` and `"disconnect"` replace `onGamepadConnected` and `onGamepadDisconnected`, which are unregistered and listed in `_removed.toml`. Registrations are kept per mode; a handler is identified by its mode and function, so a second registration does nothing. `once` removes the registration before it runs, including in the replay of connected pads, so a `once` connect handler receives one pad. `offGamepad( mode, fn )` removes that handler, `offGamepad( mode )` every handler of the mode, and `offGamepad( null, fn )` or the object form without `mode` the function from both modes; `offGamepad()` with neither throws `TypeError` with `INVALID_MODE`, pointing to `clearEvents( "gamepad" )`. As new commands, both use the I11 codes for their mode (`TypeError` for a non-string, `RangeError` for an unknown mode, `INVALID_MODE`) and function (`INVALID_FUNCTION`); `once` is validated in task 2.5. A failing handler is reported as `onGamepad: Handler for "<mode>" failed:`. Registering still starts polling (task 2.3 changes that). Metadata: `onGamepad` and `offGamepad` replace the two old files, a new `GamepadDisconnectData` object types the disconnect data, and `startGamepad`, `stopGamepad`, `clearEvents`, and `GamepadData` name the new command; the type check pins the `onGamepad` signature. Tests: identity, the removal forms, `once` with the replay, re-registration after `once`, removal during a dispatch, validation with exact messages, and the old names unregistered, in the Node harness; the existing connection tests use `onGamepad`; the browser wiring test lists the new commands; the Lite type consumer removes a handler and rejects `onGamepadConnected`. The manual pages `gamepad_01`, `gamepad_03`, and `clearevents_02` and the evidence `device-check.html` use the new commands | [PAD-012](AUDIT-GAMEPAD.md#pad-012) | [#90](https://github.com/AndyStubbs/pijs/pull/90) |
| 2.3 | Start, stop, and `clearEvents` (I5, I6, I10): polling starts on first use, the first `inGamepad()` or `onGamepad()` registration, through `startGamepadInternal()`, and after `stopGamepad()` only `startGamepad()` restarts it; a registration while stopped neither starts polling nor replays connected pads. `stopGamepad()` releases every button, zeroes the axes, and clears edges as a hidden page does (`releasePads()`, shared with the visibility handler), so a kept pad reads released without a release edge. Connection events are ignored while stopped, and pads do not join or leave the list; `startGamepad()` after a stop catches up (`syncConnections()`, which replaces the start-up scan): pads the browser no longer lists go through the disconnect handlers, new pads are recorded, and each connect handler receives the connected pads it has not received. Its first update has no edges, so a button pressed while stopped reads as pressed, not just pressed. `startGamepad()` while polling does nothing. `clearEvents( "gamepad" )` already cleared every handler whatever screen called it. Metadata: `startGamepad`, `stopGamepad`, `inGamepad`, and `onGamepad`. Tests: the PAD-016 lifecycle test now checks that the stop holds through reads and registrations, releases a kept pad, calls no handler for connection events, and that the restart catches up with a pad that left and one that arrived; a new test checks the edge-free first update after a restart and the edges after it; a new test clears from a screen and checks no handler is left and new ones run (P9); the harness's `clearEvents` takes a screen | [PAD-012](AUDIT-GAMEPAD.md#pad-012) | [#91](https://github.com/AndyStubbs/pijs/pull/91) |
| 2.4 | Return shapes (A6, I9): `inGamepad()` always returns its one live array, refilled in index order: empty with no pad connected, and emptied while polling is stopped. `inGamepad( index )` returns the pad, or `null` for an index with no pad and while stopped, never `undefined`. The list stays compact, so a pad's position is not always its index. The index is checked before the stop, so a malformed index throws while stopped too. Metadata: `inGamepad` (description and return type, now `GamepadData | Array<GamepadData> | null`) and `stopGamepad`; the type check pins the return type; the evidence `device-check.html` no longer guards the list read. Tests: an empty list and `null` before any pad, pads at 0 and 2 with the gap reading `null`, the same array from every list read including the object form and `null`, a disconnected pad reading `null`, and the emptied list and `null` while stopped (P11); the PAD-016 stop test reads an empty list | [PAD-010](AUDIT-GAMEPAD.md#pad-010) | [#92](https://github.com/AndyStubbs/pijs/pull/92) |
| 2.5 | Validation (A8, I11): `inGamepad( gamepadIndex )` and the six pad helpers check their index with `checkIndex()` before they read: a value that is not an integer, including `"0"`, `NaN`, and an omitted helper index, throws `TypeError`, and a negative index `RangeError`, both `INVALID_INDEX`, with a message starting with the command or method name and naming `gamepadIndex`, `buttonIndex`, or `axisIndex`. A well-formed index past the pad returns the empty value: `null` from `getButton()` and `inGamepad()`, `0` from `getAxis()`, and `false` from the other helpers, so `getButtonPressed()` returns `false` instead of `null`. `onGamepad` takes a boolean `once` or none (`TypeError`, `INVALID_ONCE`); its mode and function codes came with task 2.2. `INVALID_PARAMETERS` is left only in `setGamepadSensitivity`, which task 2.6 replaces. Metadata: `GamepadData` gives the index rule and the empty values, `getButtonPressed` returns `boolean`, and `inGamepad` and `onGamepad` name their codes. Tests: every helper and `inGamepad` with non-integers, a negative index, and an index past the pad, with exact messages; `once` rejected and accepted (P10) | [PAD-008](AUDIT-GAMEPAD.md#pad-008) | [#93](https://github.com/AndyStubbs/pijs/pull/93) |
| 2.6 | Radial dead zone (A9, I12): on a pad with the standard mapping, the two sticks, axes 0 and 1 and axes 2 and 3, use a radial dead zone: a stick inside it reads 0, and outside it the stick's distance from the center is rescaled from the dead zone to 1, capped at 1, in the same direction, so a diagonal just past the dead zone moves, near-cardinal movement is not snapped to the axis, and a full diagonal reaches 1. Every other axis, and every axis of another mapping, keeps the per-axis model. `setGamepadSensitivity( sensitivity )` becomes `setGamepadDeadZone( deadZone )` with option `gamepadDeadZone`: a finite number from 0 to under 1, else `TypeError` for a non-finite value or `RangeError` out of range, both `INVALID_DEAD_ZONE`, keeping the previous setting; 1 is no longer accepted. The old name is in `_removed.toml`, and `set( { gamepadSensitivity } )` fails through Core 8 with `INVALID_OPTION`. `INVALID_PARAMETERS` is gone from the plugin. Metadata: `setGamepadDeadZone` replaces `setGamepadSensitivity`, and `GamepadData.axes` describes both models; the type check pins the command. Tests: the SYS-021 tests use `setGamepadDeadZone`, with 1 added to the rejected values and the error type per value, on a pad without the standard mapping, whose harness `setPad()` now takes a `mapping`; a new test checks the radial model on both sticks, the per-axis fifth axis, the clamp at 1, and a pad without the standard mapping (P13); the browser wiring test sets the option, checks the old option and command are gone, and uses a pad without the standard mapping; the Lite type consumer sets `gamepadDeadZone` and rejects `gamepadSensitivity`. `gamepad_01` adjusts the dead zone up to 0.95. Phase 2 exit: `docs/evidence/gamepad-2.3/size-phase2.json` and its README section (standalone 2.0.0: 2,576 bytes gzipped, +554 from Phase 1) | [PAD-011](AUDIT-GAMEPAD.md#pad-011) | [#94](https://github.com/AndyStubbs/pijs/pull/94) |
| 3.1 | Standard names (A10, I13): the six pad helpers take a button or axis as a non-negative integer or an I13 name, which reads the position the standard mapping gives it on any pad: buttons `south` to `home` (0 to 16) for the four button helpers, and `leftX`, `leftY`, `rightX`, and `rightY` (0 to 3) for `getAxis()` and `getAxisChanged()`. Names are exact and per kind. An unknown name, including `"0"` and an axis name given to a button helper, throws `RangeError` with `INVALID_INDEX` (`getButton: buttonIndex "leftX" is not a button name.`); a value that is neither an integer nor a string throws `TypeError` (`must be an integer or a button name`). `inGamepad( gamepadIndex )` still takes integers only. Metadata: `GamepadData` lists the names and the rules, and the helper signatures take `number | string`; the type check pins `getButtonJustPressed`. Tests: every name against its index for all six helpers, a release by name, exact and per-kind names; the 2.5 validation test now expects `"0"` to be an unknown name and the new `TypeError` message; the Lite type consumer reads a button and an axis by name. Size: the standalone plugin is 2,768 bytes gzipped, +192 | — | [#96](https://github.com/AndyStubbs/pijs/pull/96) |
| 3.2 | Vibration (A11): `vibrateGamepad( gamepadIndex, duration, strong, weak )` plays the pad's `vibrationActuator.playEffect( "dual-rumble" )` with `startDelay` 0 and returns `true`; it returns `false`, playing nothing, for a missing or disconnected pad or one whose actuator does not list `dual-rumble` (a browser that reports one `type` is checked by it, and an actuator that reports neither is tried). It reads the browser's pad directly, so it needs no polling and does not start it; a rejected effect promise is caught. `strong` and `weak` default to 1. Validation (I11): `INVALID_INDEX` as `inGamepad`, `INVALID_DURATION` (`TypeError` for a non-finite value, `RangeError` when negative), `INVALID_STRONG` and `INVALID_WEAK` (`TypeError` for a non-finite value, `RangeError` outside 0 to 1). Metadata: a new `vibrateGamepad` entry, and `GamepadData.vibrationActuator` points to it; the type check pins the signature. Tests: the effect and its parameters in both call forms, no polling, unsupported, missing, and disconnected pads, a single-`type` actuator with a rejected effect, and every validation error with its message, with nothing played; the harness `setPad()` takes a `vibrationActuator`; the browser wiring test lists the command; the Lite type consumer reads its `boolean`. The evidence `device-check.html` gains a **vibrateGamepad pad 0** button that records the return value. Size: the standalone plugin is 3,090 bytes gzipped, +322, above the 150-byte estimate; most of it is the validation and its messages | — | [#97](https://github.com/AndyStubbs/pijs/pull/97) |
| 3.3 | Release inputs: the compatibility summary (7.4) completed with dispatch (I8, A3) and the names' effect on string indices; the gamepad's device checks in Section 8.3 point to a release pass in `docs/evidence/gamepad-2.3/README.md`, with nine steps and expected results for the connect replay, press edges, focus and a hidden tab, the radial dead zone, reconnects, a stop and restart, names, and vibration. `device-check.html` gains a **Stop polling** toggle and rows for the left stick's distance from the center, the south button and left stick read by name, and the polling state; checked headless in Chromium with a scripted standard pad and no page errors. The final size, `size-final.json` on `main` at `9ba0a7b`: 3,090 bytes gzipped for the standalone plugin 2.0.0, +1,662 since the baseline. The audit's status table marks every finding done | — | [#98](https://github.com/AndyStubbs/pijs/pull/98) |

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
