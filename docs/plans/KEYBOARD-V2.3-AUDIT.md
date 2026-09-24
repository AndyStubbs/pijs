# Pi.js 2.3 Keyboard Audit

Status: Written 2026-09-24; device pass run in Chrome 153 with a US layout (Section 6.3);
awaiting maintainer review (Section 9)
Plan: [UPGRADE-V2.3-PLAN.md](UPGRADE-V2.3-PLAN.md), Section 5
Evidence: [docs/evidence/keyboard-2.3/](../evidence/keyboard-2.3/README.md)

## 1. Summary

- **Revision:** `cfc32a9` (working tree at that commit, 2026-09-24).
- **Environment:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0, Playwright
  1.56.0 (Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0), esbuild 0.25.10.
- **Scope:** `plugins/keyboard/index.js` (528 lines) and `plugins/keyboard/input.js` (466
  lines), version 1.0.0; their metadata, declarations, documentation, and tests; and the
  plugin's use by `onscreen-keyboard`. The plugin is bundled in `pi.js` (Full) and built
  standalone for Lite.
- **Size:** 3,110 bytes gzipped standalone, about 4.3% of `pi.min.js`.
- **Method:** source review, then reproductions in `probes.js` run in all three engines:
  script-dispatched `KeyboardEvent`s for most probes, Playwright's native keyboard for K1n and
  K9n, and native mouse clicks on the on-screen keyboard for K15. All three engines agree on
  every observation. A device pass in Chrome 153 with a US keyboard confirmed KEY-001 and
  KEY-003 on hardware (Section 6.3). Other layouts, AltGr, input methods, and Safari were not
  available.

The event model is sound for the documented common case: a game that names keys by `code`
(`"ArrowLeft"`, `"KeyA"`) and polls `inkey()` or registers `onkey()` handlers sees correct
presses and releases, and the 2.2 dispatch fixes hold. Outside that case, held state is
corrupted when a key's value changes between press and release, and the `input()` prompt does
not own the keyboard while it is active.

Most important findings:
1. **Keys named by value stick (KEY-001).** Held state is also stored by `key` value, and a
   release is matched by the release's value. Press Shift and A, release Shift first, and
   `inkey( "A" )` reports A held until the window loses focus. Playwright's native keyboard
   reproduces it in all three engines. Two keys with one value have the opposite problem:
   releasing right Shift reports Shift released while left Shift is held.
2. **`clearEvents()` from another screen strands a prompt (KEY-002).** Clearing removes the
   prompt's own key handler for every screen but cancels only the calling screen's prompt. The
   prompt's promise never settles, and its timer keeps redrawing.
3. **The prompt does not own the keyboard (KEY-003).** Space scrolls the page (576–686 px in
   the native probe). Tab moves focus, and then the prompt ignores every key; on hardware,
   Enter pressed the focused page button and the typed text was lost. Ctrl+V types "v", and
   game `onkey()` handlers run for keys typed into the prompt.
4. **`stopKeyboard()` is permanent, contrary to the documentation (KEY-006).** `API.md` and the
   llms references say polling and registration start the tracker. They do not, and an
   `input()` prompt started while stopped can never finish.
5. **Typing in a shadow-DOM input drives the game (KEY-004).** The editable-target check reads
   the retargeted event target, so keys typed in a web component's input reach handlers, and
   action keys block typing there.

The 2.2 contracts SYS-003 (screen disposal during `input()`) and SYS-011 (once-handlers and
released keys) still hold: both keyboard test files pass, 30 of 30.

## 2. API Inventory

### 2.1 Commands

Sources compared: the runtime (`plugins/keyboard/index.js`, `input.js`), metadata
(`metadata/pi-2.0/keyboard-*.toml`, `clearEvents.toml`), the generated `docs/llms/pi.d.ts`,
`docs/API.md:358-391`, `plugins/keyboard/README.md`, and `docs/llms/llms.txt`,
`llms-full.txt`, and `examples.txt`. The pi-2.1 to pi-2.3 metadata layers have no keyboard
entries, so the pi-2.0 entries are current.

| Command | Runtime | Disagreements |
| --- | --- | --- |
| `startKeyboard()` | Adds capture-phase `keydown`/`keyup` listeners on `window` if not active, then blurs `document.activeElement` (`:74-84`). Also runs at plugin load (`:44`) | The blur is undocumented (KEY-012). `startKeyboard.toml` says "the keyboard automatically starts when key commands are called"; nothing does (KEY-006) |
| `stopKeyboard()` | Removes both listeners and clears held keys (`:91-101`). Handlers and an active prompt stay registered | `API.md:360-361`, `llms.txt:106`, `llms-full.txt:419-420`: polling and registration restart tracking. They do not (K8) |
| `inkey( key )` | A truthy `key` looks up held state by code, then by key value, and returns the stored object or `null`; a truthy non-string throws `INVALID_PARAMETERS`; a falsy key (`0`, `""`, none) returns a new array of held keys by code (`:109-142`) | The returned object is the plugin's live state (KEY-013). `pi.d.ts:2097-2098` returns `object \| any[] \| null` with no key-data type. `inkey.toml` example calls `inkey()` twice and iterates the second array |
| `setActionKeys( keys )` | Array required; adds each element to the set without validating it (`:150-161`). Also reachable as `set( { "actionKeys": … } )` | The toml summary says "Sets"; its description says "Adds" and gives the key value `"Arrow Up"` (it is `"ArrowUp"`). Adding, not replacing, is KEY-014 |
| `removeActionKeys( keys )` | Array required; deletes each element (`:169-180`) | None |
| `onkey( key, mode, fn, once, allowRepeat )` | `key` a truthy string or array; `mode` any truthy string; `fn` a function. The array is sorted in place and kept by reference; one handler object is pushed to each key's bucket (`:187-237`) | Error text says "up or down" but any string is accepted (KEY-009). `pi.d.ts:2216-2217` types `fn` as `( keyData: object ) => void`; combos pass an array. `API.md` does not say whether names are codes or key values |
| `offkey( key, mode, fn, once, allowRepeat )` | Removes handlers whose sorted key list, `mode`, `fn`, `once`, and `allowRepeat` all match (`:245-300`); `mode` not validated | `offkey.toml` and `pi.d.ts:2174-2175` mark `mode` optional, but omitting it removes nothing (KEY-007). The toml example removes `keyPress` from `"q"`, which was registered with `stopPress` |
| `input( prompt, fn, cursor, isNumber, isInteger, allowNegative, maxLength )` | Screen command. Starts one global prompt (replacing any other), captures the line background, registers a public `onkey( "any", "down" )` handler, and blinks on a 100 ms timer (`input.js:69-204`). Resolves a string, a number when `isNumber`, or `null` on cancel | `pi.d.ts:1355-1356` returns `Promise<string>`, types `fn` as `( message: string )`, and `maxLength?: number`; `undefined` throws and `null` (documented "no limit") is not allowed (KEY-009). Cursor default documented as "█"; it is `String.fromCharCode( 219 )`. "Decimal points are not allowed" is false for NumpadDecimal (KEY-008). `isInteger` without `isNumber` returns a string (KEY-017) |
| `cancelInput()` | Screen command; cancels the prompt only if this screen owns it (`input.js:172-176`) | Consistent |
| `clearEvents( "keyboard" )` | Deletes every keyboard handler for all screens, including the prompt's, then cancels the prompt only when no screen is passed or the passed screen owns it (`:505-517`, `input.js:454-466`). `$.clearEvents()` passes the active screen | `API.md:375-377`: event clearing cancels the prompt (KEY-002). `clearEvents.toml:37` lists `"keyboard"` |

### 2.2 Key data

| Member | Runtime | Disagreements |
| --- | --- | --- |
| `code`, `key`, `location` | Copied from the keydown | Listed in `inkey.toml`; no declared type |
| `altKey`, `ctrlKey`, `metaKey`, `shiftKey` | Modifier state at the keydown; release handlers receive the same values (KEY-011) | Same |
| `repeat` | The keydown's `repeat`; the object is replaced on each repeat | Same |
| Combination data | An array of key data in sorted key-name order, not the order given (K6) | `onkey.toml` says "an array of key data objects"; order unstated |
| Object identity | One object per keydown, shared by `inkey( code )`, `inkey( key )`, and every handler for that press | Not documented (KEY-013) |

### 2.3 Build and declarations

- The standalone `build/plugins/keyboard/keyboard.d.ts` declares only the init function, and
  `build/pi.lite.d.ts` has no keyboard commands, so a Lite user who loads the plugin gets no
  command types (K19 shows the commands do exist at runtime). Full-bundled plugins have no
  `metadata/plugin-<name>/` folder (handoff to the core audit, Section 8).
- The plugin registers itself whenever `window.pi` exists (`:520-528`). The comment says IIFE
  mode, but the ESM build does the same, because both core builds set `window.pi`
  (`src/index.js:63-66`). Loading it after Full throws `DUPLICATE_PLUGIN` (KEY-018), and so
  does the README's ESM example, which registers the plugin explicitly (KEY-017).

## 3. Findings

Priorities follow the 2.2 audit: **P1** blocks a supported workflow or corrupts shared state;
**P2** is incorrect behavior under a specific trigger; **P3** is a lower-impact contract
defect. Line numbers refer to `plugins/keyboard/index.js` at `cfc32a9` unless another file is
named. Each finding names its probe in `probes.js`; the results are in `probes-output.json`.

### KEY-001 — P1 — defect — Key-value state is keyed by value, so keys stick or release early

**Locations:** `onKeyDown()` `:315-326`, `onKeyUp()` `:345-361`, `inkey()` `:120-128`,
`triggerKeyEventHandlers()` `:423-445`.

**Trigger/reproduction (K1, K1n, K1b, K14):**

```javascript
// Shift down, A down (key "A"), Shift up, A up (key "a")
$.inkey( "A" );      // still held until the window loses focus
$.inkey( "KeyA" );   // null, correctly
$.onkey( [ "A", "Enter" ], "down", fn );   // fires when Enter is pressed later
```

**Expected:** after every key is released, no key reports held, whether it is named by code or
by value.

**Actual:** each keydown stores its data twice, under `m_inCodes[ code ]` and
`m_inKeys[ key ]`. A keyup deletes `m_inKeys[ event.key ]` using the release's value, which can
differ from the press's value:
- **Modifier released first (K1, K1n):** A pressed with Shift is stored as `"A"` and released
  as `"a"`, so `"A"` stays held. The reverse order leaves `"w"` held when W is released while
  Shift is down. Playwright's native keyboard gives the same result in all three engines.
- **Composition (K14):** a keydown reported as `"Process"` is released as `"n"`, so
  `"Process"` stays held.
- **Two keys with one value (K1b):** ShiftLeft and ShiftRight, or Digit1 and Numpad1, share one
  `m_inKeys` slot. Releasing either deletes it, so `inkey( "Shift" )` returns `null` while left
  Shift is still held.

Combination matching and `"any"` handlers read the same table, so a stuck value also completes
combinations (`[ "A", "Enter" ]` fired once after A was released).

**Evidence:** confirmed on hardware in Chrome 153: both release orders left a value stuck
(`"A"` and `"w"`; device step 3). K1 and K1n confirmed in all three engines
(`inkeyA: true`, `inkeyKeyA: false`,
the combination fired once); K1b (`shiftWhileShiftLeftHeld: null`); K14
(`processHeldAfterRelease: true`).

**Impact:** `inkey.toml` documents lookup by key value (`"a"`). A game that polls letters by
value keeps moving after release whenever the player uses Shift, for example to sprint. The
state stays wrong until the window loses focus or `stopKeyboard()` runs. The documentation's
own examples use codes, which are not affected.

**Proposed fix:** keep held state by code only, record each code's key value from its latest
keydown, and answer value lookups from the held codes (Section 4, A1).

### KEY-002 — P2 — defect — `clearEvents()` from another screen strands the active prompt

**Locations:** `clearKeyboardEvents()` `:505-517`, `input.js` `startInput()` `:196`,
`cancelAllInputs()` `:454-466`; `src/core/plugins.js:200-245`.

**Trigger/reproduction (K2):**

```javascript
const owner = $.screen( "160x80" );
owner.input( "Name?" );          // prompt on the first screen
const active = $.screen( "160x80" );
active.clearEvents();            // or $.clearEvents(), which passes the active screen
// Type "x" and Enter: nothing happens; the promise stays pending
```

**Expected:** `API.md:375-377` says event clearing cancels the prompt: the promise resolves with
`null` and the callback runs once. Leaving the prompt fully working would also be consistent.

**Actual:** `clearKeyboardEvents()` deletes every handler bucket, including the `"any"` handler
the prompt registered through the public `onkey()`. `cancelAllInputs( screenData )` then
cancels only a prompt owned by the passed screen. The prompt is left with no key handler: keys
do nothing, the promise and callback never complete, and the 100 ms timer keeps redrawing it.
Only `owner.cancelInput()`, a new `input()`, or removing the owner releases it.

**Evidence:** K2 in all three engines: `settledAfterClearAndEnter: "pending"`, no callback
call, and `null` after `owner.cancelInput()`. The unit test calls `clearKeyboardEvents()` with
no screen, which takes the cancel-everything path, so it does not catch this.

**Impact:** a game that clears events on its active screen, for example between levels, while a
prompt is open on another screen, such as a HUD overlay, hangs any `await $.input()`.

**Proposed fix:** the prompt reads keys from its own listener, not the public handler table, so
clearing handlers cannot break it; cancellation follows `cancelInput()`'s screen rule (Section
4, A2).

### KEY-003 — P2 — defect — The prompt does not own the keyboard while it is active

**Locations:** `input.js` `onInputKeyDown()` `:241-316`; `onKeyDown()` `:308-336`,
`isFromEditableTarget()` `:456-479`.

**Trigger/reproduction (K9, K9n):** start `$.input( "?" )` with an `onkey( "Enter", "down" )`
handler registered, then press Space, Tab, Ctrl+V, and Enter.

**Expected:** keys the prompt handles do not scroll the page or move focus, Ctrl and Meta
shortcuts do not type, and game handlers do not treat typed keys as game input.

**Actual:**
- No keydown the prompt handles calls `preventDefault()`. Space scrolled the page 576–686 px
  with the native keyboard (K9n), and Tab is not prevented (K9: `tabDefaultPrevented: false`),
  so it moves focus.
- Once Tab lands on a button or form field, every key comes from an editable target and is
  ignored. The prompt can no longer be finished or cancelled from the keyboard (K9:
  `promptAfterEnterFromFocusedButton: "pending"`) until the player clicks elsewhere. Enter
  instead activates the focused control. In the device pass, Enter pressed the page's
  "Start number input()" button, which Tab had focused: a "Number:" prompt appeared, and the
  text prompt resolved `null`, discarding the typed text.
- Modifiers are ignored: Ctrl+V appends "v" (value `" v"`), and so do Ctrl+C and Ctrl+A.
  There is no paste.
- The prompt is an ordinary `"any"` handler, so the game's own handlers and `inkey()` also see
  every typed key (the Enter handler ran once).

**Evidence:** K9 and K9n, identical in all three engines apart from the scroll distance. The
device pass (step 8) confirmed the Tab and Enter behavior in Chrome 153. It could not measure the
Space scroll, because focusing the button scrolled it back into view before the page read the
scroll position.

**Impact:** name entry on a page taller than the window scrolls the game away on every space;
after a stray Tab, Enter operates whatever control has focus and the typed text is lost; a game
that binds Space or Enter reacts to typing.

**Proposed fix:** the prompt consumes its keys: default prevention, modifier handling, and paste
(Section 4, A3). Withholding prompt keys from game handlers changes documented behavior and is
proposed separately (A11).

### KEY-004 — P2 — defect — Keys typed into a shadow-DOM input reach game handlers

**Locations:** `isFromEditableTarget()` `:456-479`.

**Trigger/reproduction (K12):** an `<input>` inside an open shadow root has focus; the player
types "a".

**Expected:** the key is ignored, as it is for a light-DOM `<input>`.

**Actual:** the listener runs on `window`, where `event.target` is retargeted to the shadow host
(a `<div>`), so the check fails. The comment "Inputs inside shadow roots" sits above a check
for `role="textbox"` and `role="searchbox"`, which does not look inside the shadow root. The
`onkey( "KeyA" )` handler ran and `inkey( "KeyA" )` reported the key held; with a light-DOM
input, neither happened.

**Evidence:** K12 in all three engines.

**Impact:** pages that combine a game canvas with web-component UI (chat boxes, settings
panels) send the player's typing to the game. If a typed key is an action key, such as Space,
`preventDefault()` also stops it from being typed.

**Proposed fix:** read the original target from `event.composedPath()[ 0 ]` (Section 4, A4).

### KEY-005 — P2 — defect — Prompt layout ignores print scale, line length, and mid-line starts

**Locations:** `input.js` `captureBackground()` `:206-239`, `showPrompt()` `:318-356`,
`finishInput()` `:383-386`; `src/text/print.js:388-446`.

**Trigger/reproduction (K11):** three prompts on a 160×80 screen (8-pixel font, 26 columns):
after `print( "Name", true )`; after `setPrintSize( 2, 2 )`; and with 30 characters typed.

**Expected:** after Enter, the print cursor is at column 0 of the line below everything the
prompt drew; redraws restore everything the prompt drew over; the player can see what they
type.

**Actual:**
- **Mid-line start:** the cursor ends at `x: 24`, the prompt's start, one font height lower.
  The next `print()` is indented.
- **Scaled print:** the capture and the line advance use `font.height` (8) instead of the print
  cursor's height (16). After Enter the cursor is still on row 0, so the next line prints over
  the prompt. The capture covers only the top half of the prompt's line, so erased characters
  are only half restored on each redraw.
- **Long value:** the prompt prints inline, and `print()` wraps only non-inline text
  (`print.js:388-419`), so characters past the right edge are drawn off the screen. With 30
  characters on a 26-column screen, the player cannot see the last five.

**Evidence:** K11 cursor positions in all three engines (`midLine.after.x: 24`,
`scaled.row: 0`). The half-restored pixels follow from the capture size, and the clipped value
from `print.js`; the probe measures the cursor, not the pixels.

**Impact:** any prompt that follows inline text or uses a scaled font corrupts the screen, and
input longer than the rest of the line is invisible.

**Proposed fix:** use the print cursor's height and advance to column 0; keep the prompt to one
line by scrolling the shown value (Section 4, A5).

### KEY-006 — P2 — defect — `stopKeyboard()` is not undone by use, and strands prompts

**Locations:** `startKeyboard()` `:74-84`, `stopKeyboard()` `:91-101`; `input.js:196`.

**Trigger/reproduction (K8):**

```javascript
$.stopKeyboard();
$.onkey( "KeyA", "down", fn );   // registration
$.inkey( "KeyA" );               // polling
// Press A: fn never runs
$.input( "?" );                  // Enter never settles it
```

**Expected:** `API.md:360-361`, `llms.txt:106`, `llms-full.txt:419-420`, and
`startKeyboard.toml` say polling and handler registration start tracking. By that contract, the
handler runs.

**Actual:** only plugin load and `startKeyboard()` add the listeners. After `stopKeyboard()`,
`inkey()` reports nothing, handlers never run, and a prompt started before or after the stop
can never be finished (`promptSettledAfterEnterWhileStopped: "pending"`). Whether the
documentation or the runtime is right is a convention question (Section 4, A13); the stranded
prompt is a defect either way.

**Evidence:** K8 in all three engines.

**Impact:** a game that pauses input with `stopKeyboard()` and relies on the documented
restart stays deaf; a prompt during the pause hangs.

**Proposed fix:** the prompt keeps its own listener while active, so it works regardless of
`stopKeyboard()` (Section 4, A2). The start rule follows the conventions review (A13).

### KEY-007 — P3 — API — `offkey()` needs every flag of the registration

**Locations:** `offkey()` `:245-300`.

**Trigger/reproduction (K5):** `onkey( "KeyA", "down", fn, true )`, then
`offkey( "KeyA", "down", fn )`; or `onkey( "KeyC", "down", fn )`, then
`offkey( { "key": "KeyC", "fn": fn } )`.

**Expected:** the handler is removed. `offkey.toml` and `pi.d.ts:2174-2175` mark `mode`
optional.

**Actual:** nothing is removed. `once` and `allowRepeat` must match exactly, and an omitted
`mode` matches nothing. Each handler ran once afterward. `offkey.toml` states the exact-match
rule in its description, but its parameter table contradicts it.

**Evidence:** K5 in all three engines.

**Impact:** handlers leak and run twice after re-registration. To cancel a once-handler before
it fires, the caller must repeat `once: true`.

**Proposed fix:** decided with handler identity in the conventions review (Section 4, A14).

### KEY-008 — P3 — defect — Numeric prompts accept or change values unexpectedly

**Locations:** `input.js` `onInputKeyDown()` `:264-312`, `finishInput()` `:370-379`.

**Trigger/reproduction (K10):**

| Prompt options | Keys | Result |
| --- | --- | --- |
| `isNumber`, `allowNegative`, `maxLength: 2` | `1 2 -` | `-12` (three characters) |
| `isNumber` | `. 5` | `5`: the point is rejected because `Number( "." )` is `NaN` |
| `isNumber`, `isInteger` | `1`, NumpadDecimal, `0` | Shows `1.0`, resolves `1`; only `code === "Period"` is blocked |
| `isNumber` | `␠4␠` | Accepted and shown with spaces; resolves `4` |
| `isInteger` without `isNumber` | `1 2 a` | Resolves the string `"12"` |

**Expected:** the value never exceeds `maxLength`; a value typed as `.5` means 0.5; integer
prompts show no decimal point; spaces are not accepted in numbers.

**Actual:** as in the table. `+` removes a minus sign by value or by `code === "Equal"`, a
physical position that types other characters on non-US layouts.

**Evidence:** K10 in all three engines.

**Impact:** small, but a player who types `.5` gets 5.

**Proposed fix:** validate against a pattern instead of `Number()`, and count the sign toward
`maxLength` (Section 4, A6).

### KEY-009 — P3 — defect — Validation gaps in `onkey`, `offkey`, `setActionKeys`, `input`

**Locations:** `onkey()` `:194-210`, `offkey()` `:252-262`, `setActionKeys()` `:153-160`,
`inkey()` `:112-118`, `input.js:106-113`.

**Trigger/reproduction (K3, K4, K20):**
- `onkey( "KeyA", "press", fn )`, `"DOWN"`, and `"keydown"` are accepted and never fire.
  `offkey()` accepts any mode.
- `onkey( [], "down", fn )` is accepted and registers nothing.
- `setActionKeys( [ 1, null ] )` is accepted.
- `input( { "prompt": "?", "maxLength": undefined } )`, and the positional form with an
  explicit `undefined`, throw `INVALID_PARAMETERS`, although the parameter is optional and
  typed `maxLength?: number`. The Node harness turns `undefined` into `null`
  (`test/unit/keyboard-lifecycle.test.js:27`), which hides this.
- `inkey( 0 )` and `inkey( "" )` return the held-key list instead of throwing.

**Expected:** invalid values throw `INVALID_PARAMETERS`; `undefined` for an optional parameter
means the default.

**Evidence:** K3, K4, and K20 in all three engines; `inkey` from the source.

**Impact:** typos fail silently; an options object built with an absent `maxLength` throws.

**Proposed fix:** Section 4, A7.

### KEY-010 — P3 — defect — `onkey()` sorts the caller's array and counts duplicates twice

**Locations:** `onkey()` `:213-236`, `offkey()` `:265-271`.

**Trigger/reproduction (K6):** `const combo = [ "KeyS", "Control" ]; $.onkey( combo, … )`.
`$.onkey( [ "KeyD", "KeyD" ], … )`.

**Expected:** the caller's array is unchanged; a key listed twice counts once.

**Actual:** `combo.sort()` reorders the caller's array to `[ "Control", "KeyS" ]`, and the
handler keeps that array by reference, so a later change by the caller changes the
registration. The duplicate combination is pushed to the `"KeyD"` bucket twice and fires twice
per press. Combination data arrives in sorted order, not the order given. `comboKey` joins the
names with no separator; no real key names collide, so this is noted only.

**Evidence:** K6 in all three engines.

**Proposed fix:** Section 4, A7.

### KEY-011 — P3 — defect — Release handlers get press data; unseen presses never release

**Locations:** `triggerKeyEventHandlers()` `:423-452`, `onKeyUp()` `:345-352`.

**Trigger/reproduction (K13):** press A, release it with Shift held: the `"any"` up handler
receives `shiftKey: false`. Stop the keyboard, press B, start it, release B: the `"KeyB"` up
handler does not run.

**Expected:** a release handler describes the release. A release of a key whose press was not
seen still reaches up handlers for that key.

**Actual:** every up handler receives the stored keydown object. Handlers for a key whose press
happened while stopped, or while an editable element had focus, never run on release.

**Evidence:** K13 in all three engines.

**Proposed fix:** Section 4, A8.

### KEY-012 — P3 — defect — `startKeyboard()` blurs the focused element

**Locations:** `startKeyboard()` `:81-83`, plugin init `:44`.

**Trigger/reproduction (K8):** focus an `<input>`, then call `startKeyboard()`: the input loses
focus. The same code runs when the plugin loads, so a Full page whose script runs after an
autofocused field loses that focus.

**Expected:** starting the keyboard does not change focus; the editable-target check already
keeps typing out of the game.

**Evidence:** K8 in all three engines (`fieldFocusedAfterStart: false`). Not documented anywhere.

**Proposed fix:** remove the blur (Section 4, A9).

### KEY-013 — P3 — API — `inkey( key )` and handlers get the plugin's live state

**Locations:** `inkey()` `:120-128`, `onKeyDown()` `:315-326`.

**Trigger/reproduction (K7):** `$.inkey( "KeyA" ).code = "Mutated"`; the next
`$.inkey( "KeyA" )` returns the same object with `code: "Mutated"`.

**Expected:** callers cannot change plugin state through a returned object.

**Actual:** the stored object is returned, and the same object goes to every handler for that
press. `inkey()` with no key returns a new array each call, holding the same objects.

**Evidence:** K7 in all three engines.

**Proposed fix:** Section 4, A10.

### KEY-014 — P3 — API — `setActionKeys()` adds to the set

**Locations:** `setActionKeys()` `:150-161`; `src/core/commands.js:88`.

**Trigger/reproduction (K20):** `setActionKeys( [ "Space" ] )`, then
`setActionKeys( [ "KeyA" ] )`: Space is still prevented. `set( { "actionKeys": [ "KeyB" ] } )`
also adds.

**Expected:** a `set` command and setting replace the value, as other settings do.

**Actual:** the command adds to the set. The toml description says so; its summary says "Sets".

**Evidence:** K20 in all three engines.

**Proposed fix:** Section 4, A12 (breaking).

### KEY-015 — P3 — API — The prompt cannot receive composed or pasted text

**Locations:** `input.js` `onInputKeyDown()` `:264`.

**Trigger/reproduction (K14):** a composing keydown reports `key: "Process"`, then
`compositionend` carries the text `"に"`. The prompt's value stays `""`.

**Expected:** players using an input method (Chinese, Japanese, Korean) can enter text; paste
works; phones can open a soft keyboard.

**Actual:** the prompt accepts only keydowns whose `key` is one character. Browsers deliver
composed and pasted text through composition, `input`, and `paste` events, which the plugin
does not handle. With no focused editable element, mobile browsers show no soft keyboard.

**Evidence:** K14 in all three engines. Whether a desktop input method engages at all when no
editable element has focus is a device question (Section 6.3, step 9).

**Proposed fix:** an optional hidden text field for the prompt (Section 4, A16).

### KEY-016 — P3 — API — `clearEvents()` on any screen clears every keyboard handler

**Locations:** `clearKeyboardEvents()` `:505-517`.

**Trigger/reproduction (K2):** a handler registered before `active.clearEvents()` on any screen
no longer runs (`globalHandlerRegisteredBeforeClearFired: 0`).

**Expected:** undecided. Keyboard handlers are global, but `clearEvents()` is a screen command,
and prompt cancellation is per screen (KEY-002). This is the same question as PAD-012.

**Proposed fix:** decided by the conventions review (Section 4, A15).

### KEY-017 — P3 — documentation — Metadata, declarations, `API.md`, and README misstate behavior

**Locations and disagreements:**
- **Start rule:** `API.md:360-361`, `llms.txt:106`, `llms-full.txt:419-420`, and
  `startKeyboard.toml` (KEY-006).
- **`input` types:** `input.toml` and `pi.d.ts:1355-1356` return `Promise<string>`; the value
  can be a number or `null`. `fn` is typed `( message: string )`. `maxLength?: number` rejects
  the documented `null` and allows `undefined`, which throws.
- **`input` defaults and rules:** the cursor default is documented as "█" (U+2588), which the
  default fonts cannot draw; the runtime default is character code 219, which they draw as a
  block. `isInteger` without `isNumber` returns a string. "Decimal points are not allowed" is
  false for NumpadDecimal (KEY-008).
- **`onkey` and `offkey`:** `fn` types omit the combination array; `offkey` marks `mode`
  optional (KEY-007). `API.md` does not say that names can be codes or key values, or which to
  prefer.
- **Examples:** `offkey.toml` removes the wrong function; `inkey.toml` calls `inkey()` twice and
  mixes the arrays; `setActionKeys.toml` gives `"Arrow Up"`; `examples.txt:409-436` never calls
  `draw()`.
- **README:** the ESM example imports the Full bundle and registers the plugin explicitly, which
  throws `DUPLICATE_PLUGIN` because the module has already registered itself (Section 2.3). It
  says builds go to `dist/`; they go to `build/plugins/keyboard/`. It does not document
  `input()` or `cancelInput()`, that `setActionKeys()` adds, or the blur on start.
- **Declarations:** Lite and standalone declarations have no keyboard commands (Section 2.3).
- **`clearEvents`:** `API.md:375-377` (KEY-002).

**Proposed fix:** metadata and declarations in roadmap Phase 1; `API.md`, the README, and the
llms references in the release phase (R.2, R.3).

### KEY-018 — P3 — test gap — Five manual pages register the plugin twice

**Locations:** `test/tests/html-manual/clearevents_01.html`, `events_comprehensive.html`,
`gamepad_01.html`, `input_01.html`, `onkey_sound_01.html`.

**Trigger/reproduction:** each page loads `build/pi.js` and then
`build/plugins/keyboard/keyboard.js`. The plugin registers itself again and throws
`registerPlugin: Plugin 'keyboard' is already registered.` in all three engines (the manual-page
check in `probes.js`). The pages keep working because Full already has the plugin. Some also
load `pointer`, `gamepad`, or `sound` twice.

**Proposed fix:** remove the extra script tags (roadmap Phase 1); self-registration after Full
is handed to the core audit, as PAD-015 was.

### KEY-019 — P3 — test gap — Lifecycle, editable targets, and `input()` rules are untested

**Locations:** Section 5.1.

`startKeyboard`, `stopKeyboard`, and `removeActionKeys` appear only in the
`keyboard_commands` visual fixture. No test covers blur, editable targets, key-value release,
`clearEvents( "keyboard" )` with a screen, the prompt's numeric rules as assertions, or the
prompt's effect on default actions. The Node harness converts `undefined` to `null`, so it
cannot see KEY-009's `maxLength` case.

**Proposed fix:** the tests in Section 5.2.

### Unconfirmed concerns

These are not findings. The device pass (Section 6.3) settled the first one for Chrome on
Windows; the layout, input-method, and macOS items stay open for the release pass (R.7).

- **Keys held through a focus change.** **Settled for Chrome:** Pi.js released every key within
  100 ms of each blur, and the browser sent no keyup for a key released in another window. A
  key still held when focus returned was reported released, and nothing restored it: no browser
  API reports keys already held, so the game sees the key on its next press. This is a platform
  limit, not a defect.
- **Layouts and AltGr.** Codes name physical positions (`"KeyA"` types "q" on AZERTY), which
  suits movement keys. Letters by value follow the layout. On Windows, AltGr sets both
  `ctrlKey` and `altKey`, which matters for any Ctrl filtering in the prompt (A3). Only a US
  layout was available, so device step 6 was not run.
- **Input methods without an editable element.** Whether an IME composes at all when focus is
  on the page body. No input method was installed, so device step 9 was not run.
- **macOS Meta.** Chromium and WebKit on macOS do not send keyup for keys released while Meta is
  held, so those keys stay held until blur, even after A1. Common workarounds release every
  non-modifier key when Meta is released. No macOS hardware is available. The Windows check
  (device step 7) is not an analogue after all: Windows handled Win+E itself, the page saw only
  the Meta keydown, and the window then lost focus.
- **Mobile soft keyboards.** Not tested. `onscreen-keyboard` is the supported alternative today.
- **`isTrusted`.** The plugin accepts script-dispatched events. `onscreen-keyboard` depends on
  this, so it is noted, not proposed for change.
- **Initialization rollback.** If init threw after `startKeyboard()`, the listeners would stay
  attached. No path reaches it today, since a duplicate registration fails before init.
- **Safari.** Not available.

## 4. Proposed API

Each item is marked **fix** (restores documented or expected behavior), **additive**,
**breaking**, or **§6** (waits for the input conventions review). Dependents:
`onscreen-keyboard` sends synthetic events and reads nothing from the plugin; demos, fixtures,
manual pages, `tools/charedit.html`, and `tools/dataedit.html` use `onkey`, `offkey`, `inkey`,
and `input`. `pi-vision` does not use keyboard. The first breaking item moves the plugin to
2.0.0 (G1).

| ID | Change | Kind | Findings |
| --- | --- | --- | --- |
| A1 | Held state keyed by `code` only. Each held code records the `key` of its latest keydown; a value lookup or combination is satisfied by any held code with that value; keyup deletes by code. A value stays held until every key producing it is released | fix | KEY-001 |
| A2 | The prompt reads keys from its own listener, added when it starts and removed when it ends, before the handler table. `stopKeyboard()` and handler clearing no longer affect it. `clearEvents( "keyboard" )` cancels the prompt when called with no screen or from the owning screen, as `cancelInput()` does | fix | KEY-002, KEY-006 |
| A3 | While a prompt is active it prevents the default action of every key it receives, including Space, Tab, Backspace, and Enter. Keydowns with Ctrl or Meta are ignored, except AltGr (`getModifierState( "AltGraph" )`). A `paste` event inserts the pasted text, filtered by the prompt's rules | fix | KEY-003 |
| A4 | The editable-target check reads `event.composedPath()[ 0 ]` | fix | KEY-004 |
| A5 | Prompt layout uses the print cursor's height for the capture and the line advance and ends at column 0. The prompt keeps to one line and scrolls the shown value when it would reach the edge | fix | KEY-005 |
| A6 | Numeric prompts validate against patterns (`-?\d*\.?\d*`, or `-?\d*` for integers) instead of `Number()`. The sign counts toward `maxLength`; `+` is matched by value only; no whitespace | fix | KEY-008 |
| A7 | `mode` must be `"up"` or `"down"` in `onkey` and `offkey`. `key` must be a non-empty string or a non-empty array of non-empty strings; the array is copied and duplicates removed. Action keys must be strings. `maxLength: undefined` means no limit. `inkey()` throws for a non-string key other than `null` or `undefined` | fix | KEY-009, KEY-010 |
| A8 | Up handlers receive data from the keyup event. A keyup for a key with no recorded press still runs single-key and `"any"` up handlers | fix | KEY-011 |
| A9 | `startKeyboard()` no longer blurs the focused element | fix | KEY-012 |
| A10 | Key data objects are frozen before they are stored, so polling and handlers cannot change plugin state. `inkey()` still returns a new array | fix | KEY-013 |
| A11 | While a prompt is active, its keys do not reach `onkey()` handlers or `inkey()`, as a focused text field would behave | breaking | KEY-003 |
| A12 | `setActionKeys( keys )` replaces the set, so the command and `set( { "actionKeys": … } )` behave as settings do. `removeActionKeys()` is unchanged | breaking | KEY-014 |
| A13 | One start rule for all input plugins: either reads and registration undo `stopKeyboard()` (the documented rule), or the stop holds until `startKeyboard()` (the runtime rule). Documentation or runtime changes to match | §6 | KEY-006 |
| A14 | Handler identity for removal: match on key set, mode, and `fn`, ignoring `once` and `allowRepeat`; whether an omitted mode removes both modes | §6 | KEY-007 |
| A15 | `clearEvents( "keyboard" )` scope for global handlers, decided with PAD-012 | §6 | KEY-016 |
| A16 | A hidden, focused text field while a prompt is active, for composition (IME) input, paste, and mobile soft keyboards. Its events bypass the editable-target filter. Size to be measured in the roadmap. The device pass could not test an input method, so recommended for 2.3.x unless one is tested before the roadmap is approved | additive | KEY-015 |
| A17 | `input()` stays in the keyboard plugin. It depends only on core printing and image commands; moving it would save nothing in Full and would break Lite pages that load the keyboard plugin for prompts | no change | — |

**Upgrade-guide sketches:**
- **A11:** "Keys typed into an `input()` prompt no longer reach `onkey()` handlers or `inkey()`.
  Handle the prompt's result instead of watching for Enter."
- **A12:** "`setActionKeys()` replaces the action keys. Pass every key in one call, or use
  `removeActionKeys()` to remove some."
- **A10:** not breaking for documented use. Code that wrote to a key data object now fails
  silently, or throws in strict mode.
- **A13–A15:** depend on §6. If `offkey()` matching changes, say which flags it ignores.

## 5. Coverage Map

### 5.1 Current coverage

| Command or behavior | Node | Browser | Visual | Manual |
| --- | --- | --- | --- | --- |
| Held state, `inkey( key )` by code and value | `keyboard-lifecycle` (release after keyup) | `keyboard-lifecycle-browser` (release) | `keyboard_commands`, `onscreen_keyboard_02` | — |
| `inkey()` list | — | — | `keyboard_commands` | — |
| `onkey` by code, value, `"any"`, combinations, `once` (SYS-011) | `keyboard-lifecycle` (six once variants, errors, nested presses) | `keyboard-lifecycle-browser` (once combination, throwing keyup) | `keyboard_commands`, `onmouse_01`, `onscreen_keyboard_01` | `fireworks`, `sound_02` |
| `offkey` | `keyboard-lifecycle` (removal during dispatch) | — | `keyboard_commands`, `onmouse_01` | — |
| Auto-repeat filtering | `keyboard-lifecycle` | — | — | — |
| `setActionKeys` | `keyboard-lifecycle` (prevention with a throwing keyup) | `keyboard-lifecycle-browser` | `keyboard_commands` | — |
| `removeActionKeys`, `startKeyboard`, `stopKeyboard` | — | — | `keyboard_commands` only | — |
| Blur, editable targets, key-value release | — | — | — | — |
| `input()` text, number, integer, length, Escape | `keyboard-lifecycle` (settle on Enter, Escape, clear) | — | `keyboard_input`, `onscreen_keyboard_03`, `onscreen_keyboard_04` | `input_01` |
| `input()` disposal and reentrancy (SYS-003) | `keyboard-lifecycle` (7 tests) | `keyboard-lifecycle-browser` (4 per bundle) | — | — |
| `cancelInput` | `keyboard-lifecycle` | — | `onclick_01` | — |
| `clearEvents( "keyboard" )` | `keyboard-lifecycle` (no screen; during dispatch) | — | — | `clearevents_01`, `clearevents_02`, `events_comprehensive` (no-throw only) |
| Lite plus standalone plugin | — | `keyboard-lifecycle-browser` (Lite bundle), `plugin-installation-browser` | — | — |
| Trusted (native) key input | — | `firefox-smoke` (one `onkey`) | Every keyboard fixture (Playwright keyboard) | — |

### 5.2 Tests to add first

Ranked by value. Each test starts from the probe that reproduces its finding. Following the
standing rules, pure logic goes in the Node test (`keyboard-lifecycle.test.js`, whose `vm`
harness drives `onKeyDown` and `onKeyUp` directly), and only what needs a browser goes in the
browser test. Fix the harness's `undefined`-to-`null` conversion first.

1. Held state by code: modifier released first, two keys with one value, `"Process"` (K1, K1b,
   K14; KEY-001). Add one native-keyboard case to the browser test (K1n).
2. `clearEvents( "keyboard" )` with prompts on two screens (K2; KEY-002, KEY-016).
3. Prompt key ownership: default prevention, Ctrl and AltGr, Tab, handlers during a prompt (K9,
   K9n; KEY-003).
4. Lifecycle: start, stop, repeated calls, registration and polling after a stop, a prompt
   during a stop, focus kept on start (K8; KEY-006, KEY-012). This removes the three
   single-reference commands.
5. Editable targets, including shadow roots, in the browser test (K12; KEY-004).
6. Validation and combination arrays (K3, K4, K6, K20; KEY-009, KEY-010).
7. Numeric prompt rules (K10; KEY-008).
8. Prompt layout after inline text, with scaled print, and with long input, in the browser test
   (K11; KEY-005).
9. Release data and releases of unseen presses (K13; KEY-011).
10. `removeActionKeys` and `set( { "actionKeys" } )` (K20; KEY-014).

## 6. Validation

### 6.1 Commands

| Check | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | Passed; no tracked file changed |
| Size | `npm run size -- --out=docs/evidence/keyboard-2.3/size-baseline.json` | Keyboard 8,436 B, 3,110 B gzip; onscreen-keyboard 6,876 B, 2,606 B gzip |
| 2.2 regressions | `node --test test/unit/keyboard-lifecycle.test.js test/unit/keyboard-lifecycle-browser.test.js` | 30 of 30 passed |
| Keyboard visuals | `npm run test:grep -- "keyboard"` | 2 of 2 passed |
| On-screen keyboard visuals | `npm run test:plugins:grep -- "onscreen"` | 4 of 4 passed |
| Reproductions | `node docs/evidence/keyboard-2.3/probes.js` | Every probe matched the source analysis in Chromium, Firefox, and WebKit; the K18 and K19b controls passed |

### 6.2 Browser behavior

From the UI Events specification and MDN:

| Behavior | Source | Testable with synthetic events? |
| --- | --- | --- |
| `code` names the physical key regardless of layout and modifiers; `key` is the produced value and depends on both, so a key's keyup can carry a different `key` than its keydown | UI Events `code` and `key` | Yes (K1); also with the native keyboard (K1n) |
| Repeated keydowns while a key is held have `repeat: true`; one keyup at release | UI Events | Yes |
| Keydowns during composition have `isComposing: true`, and Chromium and Firefox report `key` as `"Process"`. Composed text arrives through composition and `input` events on an editable target | UI Events, MDN | Partly (K14); device step 9 |
| No keyup is sent for a key released while the window is unfocused | UI Events (events go to the focused document) | Partly; device step 4 |
| Scrolling on Space, arrow, and Page keys and focus navigation on Tab are keydown default actions, cancelled by `preventDefault()` | UI Events, HTML | Yes (K9n) |
| Events that leave a shadow tree are retargeted to the host; `composedPath()[ 0 ]` is the original target | DOM | Yes (K12) |
| On Windows, AltGr sets both `ctrlKey` and `altKey`; `getModifierState( "AltGraph" )` identifies it | UI Events, MDN | No; device step 6 |
| On macOS, keyup is not sent for keys released while Meta is held | Browser behavior (Chromium, WebKit) | No; no macOS hardware |

### 6.3 Device pass

The user runs the pass with a physical keyboard and
`docs/evidence/keyboard-2.3/device-check.html`, following the steps in the evidence README. It
covers the modifier release order (KEY-001), focus changes, auto-repeat, layouts and AltGr, the
Windows key, the prompt's handling of Space, Tab, and paste (KEY-003), and IME input (KEY-015).

**Results (2026-09-24),** Chrome 153 on Windows 11 with a US keyboard layout. Steps 6 and 9
were not run (no other layout or input method), and step 7 was inconclusive.

| Check | Chrome 153 |
| --- | --- |
| Shift release order (KEY-001), step 3 | Both orders left a value stuck: `"A"` (Shift released first) and `"w"` (Shift pressed during the hold) |
| Focus change, step 4 | Pi.js reported no keys 100 ms after each of three blurs. The browser sent no keyup for D released in another window. D held through the return was reported released at focus |
| Auto-repeat, step 5 | 202 repeat keydowns from the browser; the `allowRepeat` handler ran 202 times; the default handler ran only for the 15 non-repeat presses of the session |
| Windows key, step 7 | Windows handled Win+E; the page saw only the Meta keydown before losing focus. Not an analogue of the macOS Meta problem |
| Prompt keys (KEY-003), step 8 | After Tab, Enter activated the focused "Start number input()" button: a "Number:" prompt appeared and the text prompt resolved `null`. After a click on the page, Enter resolved the number prompt with `0`, the empty-number value. Scroll not measurable (Section 3, KEY-003) |
| Layouts, AltGr, IME, steps 6 and 9 | Not run |

The page's own record of browser-held keys is stale after a blur, since it learns releases
only from keyup events. The focus results above therefore use its blur and focus samples of
Pi.js state, not its browser column.

**Open device checks,** for the release pass (R.7): a non-US layout with AltGr, an input
method, and Safari and macOS Meta, if macOS hardware is available.

## 7. Recommended Roadmap

`KEYBOARD-V2.3-ROADMAP.md` is written from the accepted items after the conventions review.
Proposed order:

**Phase 1 — Fixes and tests (no API change):**
- A1–A10.
- Metadata and declaration corrections for current behavior (KEY-017).
- The manual page fixes (KEY-018).
- The tests in Section 5.2.

These can start once the roadmap is approved, and they do not depend on §6. A1 and A8 change
what `onscreen-keyboard`'s synthetic events produce only in the ways the fixes intend; its
visual suite runs at each task's end.

**Phase 2 — API (after §6):**
- A11–A15.
- The version moves to 2.0.0 with the first breaking change.
- Each task updates metadata, declarations, and signature tests, and checks the demos,
  fixtures, and `tools/` pages that use the changed command.

**Phase 3 — Release inputs:**
- A16 if kept in 2.3.
- The compatibility summary.
- The device checks still open for R.7.
- Size at each phase exit.

The user documentation (`API.md`, the README, the llms references) is rewritten in the release
phase (R.2, R.3), as the standing rules require.

**Scope-cut order:**
1. A16 (additive, can follow in 2.3.x).
2. A12 (then `setActionKeys()` keeps adding, and the documentation says so).
3. Phase 2 as a set, per plan §12.3.

Phase 1 is not cut.

## 8. Handoffs

### Core audit

| Item | Detail |
| --- | --- |
| Standalone plugin declarations | As for gamepad: no `metadata/plugin-keyboard/`, so `keyboard.d.ts` declares only the init function, and `pi.lite.d.ts` has no keyboard commands |
| Self-registration | The IIFE and ESM plugin modules register themselves whenever `window.pi` exists (KEY-018, KEY-017's README case). Decide whether self-registration should skip a plugin that is already registered |
| `parseOptions` and `undefined` | An explicit `undefined` stays `undefined` instead of the `null` default (`src/core/utils.js:35-71`), so `null` checks in commands reject it (KEY-009). Other commands may share this |
| Font glyph mapping | `print()` maps character codes through the font's table (`src/text/print.js:484`), so characters outside it, including most non-Latin text typed into a prompt, are not drawn. Relevant if A16 lands |
| Frame hook | Keyboard is event-driven and does not need one |

### Input conventions review (§6)

Keyboard's answers to the questions the gamepad audit raised:

| Item | Keyboard today |
| --- | --- |
| Handler names | `onkey` / `offkey`, lowercase; gamepad uses `onGamepadConnected` with no `off` |
| Handler shape | `onkey( key, mode, fn, once, allowRepeat )`; removal matches every argument, including the flags (KEY-007) |
| Callback data | One key: the press's data object, shared with `inkey()` (KEY-013). Combination: an array in sorted name order. Release handlers get the press's data (KEY-011) |
| Auto-start | Starts at plugin load. `stopKeyboard()` holds until `startKeyboard()`; reads and registration do not restart, although the documentation says they do (KEY-006) |
| Return shapes | `inkey()`: a new array; `inkey( key )`: object or `null`. After a stop: `[]` and `null` |
| Global handlers and `clearEvents` | `clearEvents( "keyboard" )` from any screen clears every handler, but cancels only that screen's prompt (KEY-002, KEY-016) |
| Error codes | `TypeError` with `INVALID_PARAMETERS` for validation; `Error` with `SCREEN_REMOVED` for `input()` on a screen being removed |
| Names: codes or values | Both accepted in one namespace, codes checked first. The review should recommend one for documentation (codes for game controls) |
| Modifier matching | Combinations allow extra held keys: `[ "Control", "KeyC" ]` also matches Ctrl+Shift+C. Decide whether an exact-match option is wanted |

### Dependents (G2)

`onscreen-keyboard` 1.0.0, confirmed by K15 in all three engines:
- It sends `code` equal to the character (`"q"`, not `"KeyQ"`), so code-based handlers and
  `inkey( "KeyQ" )` never see on-screen presses.
- Tapping the SYMBOLS or CapsLock key stores `null` in its active-key map, and `onKeyboardUp()`
  does not remove it (`plugins/onscreen-keyboard/index.js:342-354`, `:396`, `:420`). A later
  `hideKeyboard()` or `removeScreen()` then throws "Cannot read properties of null" from
  `simulateKeyRelease()`.
- Its +/- key sends `"-"`, which the prompt only ever prepends, so it cannot remove a minus.
- It works only while the keyboard is started.

Per G2, these are recorded for the owner rather than fixed by this roadmap, except where A1 or A7
changes what its events produce.

## 9. Review Decisions

The maintainer marks each item accepted, rejected, or deferred (plan §5.6).

| ID | Summary | Decision | Notes |
| --- | --- | --- | --- |
| KEY-001 | Key-value state sticks or releases early | Pending | |
| KEY-002 | `clearEvents()` from another screen strands a prompt | Pending | |
| KEY-003 | Prompt does not own the keyboard | Pending | |
| KEY-004 | Shadow-DOM inputs reach game handlers | Pending | |
| KEY-005 | Prompt layout | Pending | |
| KEY-006 | `stopKeyboard()` not undone; strands prompts | Pending | |
| KEY-007 | `offkey()` needs every flag | Pending | |
| KEY-008 | Numeric prompt edge cases | Pending | |
| KEY-009 | Validation gaps | Pending | |
| KEY-010 | Caller's array sorted; duplicates fire twice | Pending | |
| KEY-011 | Release data and unseen presses | Pending | |
| KEY-012 | `startKeyboard()` blurs focus | Pending | |
| KEY-013 | Live key data | Pending | |
| KEY-014 | `setActionKeys()` adds | Pending | |
| KEY-015 | No composed or pasted text | Pending | |
| KEY-016 | `clearEvents()` scope | Pending | |
| KEY-017 | Documentation and declarations | Pending | |
| KEY-018 | Manual pages register twice | Pending | |
| KEY-019 | Missing automated tests | Pending | |
| A1–A10 | Fixes | Pending | |
| A11 | Prompt keys withheld from handlers | Pending | Breaking |
| A12 | `setActionKeys()` replaces | Pending | Breaking |
| A13–A15 | Start rule, handler identity, `clearEvents` scope | Pending | §6 |
| A16 | Hidden text field for IME, paste, and mobile | Pending | Additive |
| A17 | `input()` stays in the plugin | Pending | |
