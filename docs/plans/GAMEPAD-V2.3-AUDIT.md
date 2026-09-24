# Pi.js 2.3 Gamepad Audit

Status: Reviewed 2026-09-24; every finding and proposal accepted (Section 9); the roadmap
waits for the input conventions review
Plan: [UPGRADE-V2.3-PLAN.md](UPGRADE-V2.3-PLAN.md), Section 5
Evidence: [docs/evidence/gamepad-2.3/](../evidence/gamepad-2.3/README.md)

## 1. Summary

- **Revision:** `b37e9b8` (working tree at that commit, 2026-09-24).
- **Environment:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0, Playwright
  1.56.0 (Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0), esbuild 0.25.10.
- **Scope:** `plugins/gamepad/index.js` (442 lines, version 1.0.0), its metadata and
  declarations, its documentation, and its tests. The plugin is bundled in `pi.js` (Full) and
  built standalone for Lite.
- **Size:** 1,428 bytes gzipped standalone, about 2.0% of `pi.min.js`.
- **Method:** source review, then reproductions in `probes.js` with a scripted
  `navigator.getGamepads()`, animation-frame queue, and connection events, run in all three
  engines. All three engines agree on every observation. A device pass with Xbox One
  controllers in Chrome 153 and Firefox 156 confirmed PAD-001, PAD-002, and PAD-017 on
  hardware in both browsers (Section 6.3). Safari was not available.

The plugin is small and its polling model is sound for the common case: a game that reads
`ingamepad()` once per animation frame sees correct buttons, axes, and edges. Outside that
case it has three state defects and a documentation set that mostly describes a removed API.
Even in that case, the press that first exposes a controller is lost (PAD-017).

Most important findings:
1. **Edges are lost at other read rates (PAD-001).** A game that reads less often than every
   frame, such as a 30 Hz timer loop or a 60 Hz loop on a faster display, misses most
   press, release, and axis-change edges. On a 100 Hz display with a real controller, a 30 Hz
   loop saw 1 of 26 presses.
2. **One throwing handler corrupts the pad list (PAD-003).** A throwing disconnect handler
   skips the removal of the pad, which then stays in `ingamepad()` with `connected: true`.
   Later handlers never run.
3. **Blur freezes state (PAD-002).** While the window is unfocused, a press edge repeats on
   every frame and a released button stays pressed. `GAMEPAD.md` says the pause prevents
   stuck buttons. With a real controller in Chrome and Firefox, a button held at blur stayed
   pressed in Pi.js until after focus returned, while the browser reported it released.
4. **`GAMEPAD.md` documents the removed 1.2 API (PAD-013).** It centers on `ongamepad()`,
   `offgamepad()`, and `axes2`, so nearly every example throws.
5. **Only two of six commands are tested (PAD-016).** No test covers buttons, edges,
   connection handlers, the lifecycle, or blur.

The 2.2 contract SYS-021 (non-finite sensitivity rejected) still holds: both gamepad test files
pass, 22 of 22.

## 2. API Inventory

### 2.1 Commands

Sources compared: the runtime (`plugins/gamepad/index.js`), metadata
(`metadata/pi-2.0/gamepad-*.toml`, `_objects.toml:102-141`), the generated
`docs/llms/pi.d.ts`, `docs/API.md:408-413`, `docs/GAMEPAD.md`, and `docs/llms/llms-full.txt`.
The pi-2.1 to pi-2.3 metadata layers have no gamepad entries, so the pi-2.0 entries are
current.

| Command | Runtime | Disagreements |
| --- | --- | --- |
| `startGamepad()` | Adds the connection listeners and scans for pads on the first call only (`:74-91`); clears the stopped flag; starts the loop | Metadata says it detects connected pads; that happens only on the first call. `GAMEPAD.md:17,58` says it starts automatically "when using `ongamepad`", which does not exist |
| `stopGamepad()` | Cancels the loop and sets the stopped flag (`:98-109`) | Undocumented everywhere: `ingamepad()` then returns `null`, and registering a connection handler restarts polling (P8). Connection events still run handlers while stopped (P8); only the metadata says so |
| `ingamepad( gamepadIndex )` | One pad, `undefined` for an unknown index, a sorted array with no index, `null` after `stopGamepad()`; a negative or non-integer index throws `INVALID_PARAMETERS` (`:117-143`) | `pi.d.ts:2083-2084` returns `object \| any[]` and does not accept `null`. `API.md:411` omits the shapes and the error. `GAMEPAD.md:77,81` says index 0–3 and "null if not connected" |
| `setGamepadSensitivity( sensitivity )` | Finite 0–1; 1 becomes 0.99999; default 0.2; `TypeError` with `INVALID_PARAMETERS` (`:151-167`). Also reachable as `set( { "gamepadSensitivity": … } )` | Metadata has no default, error, or the rescaling above the threshold. `GAMEPAD.md:120-133` is correct |
| `onGamepadConnected( fn )` | Appends a handler and starts polling (`:175-186`); handlers get the live pad object | `onGamepadConnected.toml:10-11` says the callback also runs for pads already connected; only the first start does this (PAD-005). No removal command exists. Undocumented: it undoes `stopGamepad()` |
| `onGamepadDisconnected( fn )` | Appends a handler and starts polling (`:194-205`); handlers get `{ index, id, mapping, connected }` | `pi.d.ts:2198-2199` and the metadata signature type the argument as `GamepadData`; the metadata description is correct |
| `clearEvents( "gamepad" )` | Empties both handler lists for every screen (`:429-432`), including when called on a screen's API (P9) | `clearEvents.toml:37` does not list `"gamepad"` |
| `ongamepad()`, `offgamepad()`, `ingamepads()` | Not registered; removed by `metadata/pi-2.0/_removed.toml` | `GAMEPAD.md:44-51,137-243` and examples 1, 3, 5–8 document them |

### 2.2 The pad object

| Member | Runtime | Disagreements |
| --- | --- | --- |
| `index`, `id`, `connected`, `mapping` | Copied from the browser pad | `pi.d.ts` and `_objects.toml` say index is 0–3; any browser index is kept |
| `timestamp`, `vibrationActuator` | Copied each update | Not in metadata, `pi.d.ts`, or `GAMEPAD.md` |
| `buttons[]` | `{ pressed, value, pressStarted, pressReleased }`, replaced every update | Typed `Array<object>`; `GAMEPAD.md:113` lists `pressed` and `value` only |
| `axes[]` | Dead zone applied, replaced every update | Documented as raw -1 to 1; `GAMEPAD.md:114-115` describes `axes` as raw and a nonexistent `axes2` as calibrated |
| `lastAxes[]` | The previous update's axes | Not in metadata or `pi.d.ts`; `GAMEPAD.md:452` calls it `lastAxes2` |
| `getButton( i )`, `getButtonPressed( i )` | `null` out of range; non-integers crash or return `undefined` (P10) | Listed in the `ingamepad` description, not declared on `GamepadData` |
| `getButtonJustPressed( i )`, `getButtonJustReleased( i )` | `false` out of range | Same |
| `getAxis( i )`, `getAxisChanged( i )` | `0` and `false` out of range; `getAxis( 1.5 )` returns `undefined` | Same |

### 2.3 Build and declarations

- The standalone `build/plugins/gamepad/gamepad.d.ts` declares only the init function, so a
  Lite user who loads the plugin gets no command types. Full-bundled plugins have no
  `metadata/plugin-<name>/` folder (handoff to the core audit, Section 8).
- `build/pi.lite.d.ts:180,372` declares `GamepadData` and `gamepadSensitivity`, although Lite
  has no gamepad plugin.
- The IIFE build registers itself when `window.pi` exists (`:435-442`). Loading it after the
  Full bundle throws `DUPLICATE_PLUGIN` (PAD-015).

## 3. Findings

Priorities follow the 2.2 audit: **P1** blocks a supported workflow or corrupts shared state;
**P2** is incorrect behavior under a specific trigger; **P3** is a lower-impact contract
defect. Line numbers refer to `plugins/gamepad/index.js` at `b37e9b8` unless another file is
named. Each finding names its probe in `probes.js`; the results are in `probes-output.json`.

### PAD-001 — P2 — defect — Button and axis edges are lost unless every frame is read

**Locations:** `updateGamepads()` `:277-300`, `gamepadLoop()` `:241-250`,
`updateGamepad()` `:367-386`.

**Trigger/reproduction (P1):** a pad presses button 0 for three frames while axis 0 moves. The
consumer reads `$.ingamepad( 0 )` either in its own `requestAnimationFrame` loop or in a
timer, every frame or every other frame.

```javascript
setInterval( () => {
	const pad = $.ingamepad( 0 );
	if( pad && pad.getButtonJustPressed( 0 ) ) { jump(); }
}, 1000 / 30 );
```

**Expected:** each press and release is reported once to any consumer.

**Actual:**

| Consumer | Presses | Releases | Axis changes |
| --- | --- | --- | --- |
| Every frame, after the plugin loop | 1 | 1 | 2 |
| Every frame, before the plugin loop | 1 | 1 | 2 |
| Timer, every frame | 1 | 1 | 2 |
| Every other frame (animation frame) | 0 | 0 | 0 |
| Timer, every other frame | 0 | 0 | 0 |

Every update recomputes the edges against the previous update. The per-tick guard lets a read
update again whenever the loop advanced its tick since the last read. So when the loop has
already updated in a tick that no read covered, the next read updates again from the same
browser snapshot, and every edge becomes false. Only a consumer that reads in every tick
avoids the second update.

**Evidence:** P1, identical in all three engines. The device pass reproduced it with a real
controller on a 100 Hz display. A 30 Hz timer loop saw 1 of 26 presses and 4 of 26 releases
in Chrome, and 8 of 22 presses and 6 of 22 releases in Firefox. An every-frame loop on the
same page saw all presses but one in each browser; the missing press is PAD-017.

**Impact:** fixed-step and timer-driven loops, and 60 Hz loops on displays faster than 60 Hz,
drop most "just pressed" events, so jump or fire buttons do not work reliably.

**Proposed fix:** make the loop the only updater, and report edges that happened since the
previous read, with reads in the same frame seeing the same result (Section 4, A1).

### PAD-002 — P2 — defect — Blur freezes gamepad state, repeating edges and holding buttons

**Locations:** `onWindowBlur()` `:403-412`, `onWindowFocus()` `:414-420`, the guard at
`:280-284`; the claim at `docs/GAMEPAD.md:437-439`.

**Trigger/reproduction (P4):** a game reads every frame; button 0 is pressed; the window loses
focus; the button is released while the window is unfocused.

**Expected:** "just pressed" is true on one frame only. A released button reads as released,
or the plugin releases held buttons on blur as the keyboard plugin does
(`plugins/keyboard/index.js:45`).

**Actual:** on blur the plugin cancels its loop but leaves the tick unchanged. Every later read
returns the snapshot from before the blur. `getButtonJustPressed( 0 )` is true on every frame
while unfocused, and `getButtonPressed( 0 )` stays true after the release. On the first frame
after focus, the game's loop runs before the resumed plugin loop, so it reads stale state once
more.

**Evidence:** P4, identical in all three engines. The device pass reproduced the held button
in both browsers (Section 6.3):
- **Firefox 156:** the page stayed visible while unfocused. The browser kept reporting the
  real state, held at 0.7 s after the blur and released at 1.7 s. Pi.js reported pressed
  throughout, including at the focus event.
- **Chrome 153:** 70 ms after the blur, with the page still visible, the browser reported the
  button released. Pi.js kept reporting it pressed for the next 3 s, including at the focus
  event.

The repeating press edge was not seen on the device, because the edge had already been read
when focus left.

**Impact:** a press repeats every frame while the page is unfocused. A held direction or
button keeps acting after release. This happens when focus moves to DevTools, another window
on a second monitor, or the parent page of an embed. The documentation claims the pause
prevents stuck buttons.

**Proposed fix:** keep polling while the page is visible, whether or not it has focus, and
release every button and clear edges when the page is hidden (Section 4, A2). Firefox delivers
real input to an unfocused page, and Chrome reports held buttons as released, so polling gives
the correct state in both.

### PAD-003 — P1 — defect — A throwing handler stops dispatch and leaves a ghost gamepad

**Locations:** `gamepadConnected()` `:213-222`, `gamepadDisconnected()` `:224-239`.

**Trigger/reproduction (P5):**

```javascript
$.onGamepadDisconnected( () => { throw new Error( "bug" ); } );
$.onGamepadDisconnected( data => { removePlayer( data.index ); } );
// Pad 1 disconnects.
$.ingamepad();   // [ pad 0, pad 1 ] — pad 1 still reports connected: true
```

**Expected:** every handler runs, the error is reported, and the pad leaves the list.

**Actual:** the throw ends the event listener. Later handlers never run, and the
`delete m_gamepads[ index ]` after the loop is skipped. `ingamepad()` keeps returning the
disconnected pad with `connected: true`, since `updateGamepads()` skips pads the browser no
longer lists. A throwing connect handler also stops the handlers after it. The errors surface
only as uncaught page errors.

**Evidence:** P5, identical in all three engines.

**Impact:** one faulty handler corrupts shared input state for the whole page. The ghost pad
stays until a pad connects at the same index. This matches the 2.2 precedent SYS-002.

**Proposed fix:** remove the pad before dispatch, call each handler from a snapshot of the
list, and report each throw without stopping the others (Section 4, A3).

### PAD-004 — P2 — defect — A throwing scan handler escapes and leaves polling off

**Locations:** `startGamepad()` `:74-91`, `scanForGamepads()` `:252-275`.

**Trigger/reproduction (P5b):** a pad is already connected, and the first command that starts
polling is `$.onGamepadConnected( fn )` where `fn` throws.

**Expected:** registration succeeds and polling starts.

**Actual:** the scan calls `fn` synchronously inside `startGamepad()`, so the error escapes
from `onGamepadConnected()`, or from `ingamepad()` when that command starts polling. The
listeners are marked initialized, but no animation frame is requested. Polling stays off until
a later command calls `startGamepad()`.

**Evidence:** P5b, identical in all three engines: `thrownFromOnGamepadConnected` is the
handler's message and no frame is pending.

**Impact:** a bug in a callback appears as a failure of an unrelated read, and the game gets no
updates until it happens to call another starting command.

**Proposed fix:** the same dispatch isolation as PAD-003. Schedule the loop before the scan.

### PAD-005 — P2 — defect — Later connect handlers are never told about connected pads

**Locations:** `startGamepad()` `:75-82`, `onGamepadConnected()` `:175-186`; the contract at
`metadata/pi-2.0/gamepad-onGamepadConnected.toml:10-11`.

**Trigger/reproduction (P7):** with a pad connected, register two connect handlers, or call
`ingamepad()` before registering one.

**Expected (metadata):** "The callback will also be triggered for any gamepads that are
already connected when the callback is registered."

**Actual:** only the first `startGamepad()` scans. The first handler receives pad 0 and the
second receives nothing.

**Evidence:** P7, identical in all three engines.

**Impact:** a game that polls first and registers a connect handler later, or registers
handlers from several modules, misses pads that are already connected. Player setup then
never runs for them.

**Proposed fix:** replay the currently connected pads to each new connect handler
(Section 4, A4).

### PAD-006 — P3 — defect — A connection event for a tracked pad fires handlers again

**Locations:** `gamepadConnected()` `:213-222`.

**Trigger/reproduction (P3):** the start-up scan finds pad 0, then a `gamepadconnected` event
for pad 0 arrives.

**Expected:** one connect call per connection.

**Actual:** two calls. `gamepadConnected()` does not check whether the pad is already
tracked. The scan checks, but the event handler does not.

**Evidence:** P3, identical in all three engines. The device pass did not see it: every
browser connection event, including reconnects, gave exactly one Pi.js call, in Chrome (three
events, two controllers) and Firefox (two events).

**Impact:** duplicate player setup, if a browser produces the sequence. No browser has been
seen to.

**Proposed fix:** ignore connection events for a tracked index that is still connected, or
treat them as a reconnect (Section 4, A4).

### PAD-007 — P3 — defect — A handler added during dispatch runs in the same dispatch

**Locations:** the `for…of` loops at `:219`, `:234`, `:270`.

**Trigger/reproduction (P6):** a connect handler registers another connect handler.

**Expected:** the new handler waits for the next event, as in the keyboard plugin, which
dispatches from a copy (`plugins/keyboard/index.js:404`).

**Actual:** the loop iterates the live array, so the new handler runs immediately for the same
event.

**Evidence:** P6, identical in all three engines.

**Impact:** handlers that register handlers see the event twice or out of order.

**Proposed fix:** dispatch from a copy of the list (Section 4, A3).

### PAD-008 — P3 — defect — Helper methods crash on non-integers and disagree on range

**Locations:** `createNewGamepadData()` `:318-355`.

**Trigger/reproduction (P10):**

| Call | Result |
| --- | --- |
| `getButtonPressed( 1.5 )`, `( NaN )`, `()` | Throws a raw `TypeError` reading `pressed` of `undefined` |
| `getButtonJustPressed( 1.5 )` | Throws the same `TypeError` |
| `getButton( "0" )` | Returns button 0 |
| `getButton( "a" )`, `getAxis( 1.5 )` | `undefined` |
| Out of range: `getButton`, `getButtonPressed` | `null` |
| Out of range: `getButtonJust*`, `getAxisChanged` | `false` |
| Out of range: `getAxis` | `0` |

**Expected:** invalid indices are rejected with the plugin's error code, like `ingamepad()`, or
reported with one consistent value.

**Evidence:** P10, identical in all three engines.

**Impact:** a typo or a computed index gives an unhelpful crash or a silently wrong value.

**Proposed fix:** Section 4, A8.

### PAD-009 — P3 — API — The pad object is live but its arrays are replaced every update

**Locations:** `updateGamepad()` `:360-392`.

**Trigger/reproduction (P12):** keep `pad.buttons` or `pad.buttons[ 0 ]` across a frame.

**Actual:** the pad object is the same on every read and is mutated in place, including the
object passed to connect handlers. Each update replaces `buttons`, every button object,
`axes`, and `lastAxes`, so a saved reference to an array goes stale. Every update allocates
one array and one object per button, plus two axis arrays per pad. `ingamepad()` with no
index allocates and sorts a new array on every call.

**Expected:** one documented model: stable live objects updated in place, or snapshots.

**Evidence:** P12, identical in all three engines.

**Impact:** confusing aliasing, and steady garbage from a per-frame input path (§5.3
Allocation).

**Proposed fix:** Section 4, A7.

### PAD-010 — P3 — API — `ingamepad()` has four return shapes

**Locations:** `ingamepad()` `:117-143`; `docs/llms/pi.d.ts:2083-2084`.

**Trigger/reproduction (P11):** pads at indices 0 and 2.

**Actual:**
- `ingamepad()` returns `[ pad0, pad2 ]`, so list position 1 holds index 2.
- `ingamepad( 1 )` returns `undefined`.
- After `stopGamepad()`, both forms return `null`.
- A negative index throws `INVALID_PARAMETERS`.

The declared type is `object | any[]`.

**Expected:** a list is always a list and a missing pad has one value, so code can use
`for…of` and a single null check.

**Evidence:** P11, identical in all three engines.

**Impact:** games need three checks. The declaration hides all of them.

**Proposed fix:** Section 4, A6.

### PAD-011 — P3 — API — The per-axis dead zone distorts stick input

**Locations:** `smoothAxis()` `:394-401`, `setGamepadSensitivity()` `:151-167`.

**Trigger/reproduction (P13),** default dead zone 0.2:

| Stick input | Reported |
| --- | --- |
| (0.15, 0.15), magnitude 0.21 | (0, 0) |
| (0.5, 0.1) | (0.375, 0): snapped to the horizontal |
| (0.7071, 0.7071), magnitude 1 | (0.634, 0.634), magnitude 0.90 |
| Sensitivity 1: (0.99, 1) | (0, 1) |

**Expected:** stick movement past the dead zone is reported in its direction. Radial dead
zones are the common model for sticks.

**Evidence:** P13, identical in all three engines. With a real Xbox One controller, the stick
was past a 0.2 radius on 444 frames in Chrome and 231 in Firefox, and Pi.js reported it
centered on 1 and 4 of them. The loss near
the center is therefore rare in practice. The snapping and the weaker diagonals were not
measured on the device.

**Impact:** near-cardinal movement snaps to the axis, and full diagonals are weaker than full
cardinals. Slow diagonal movement right at the threshold is lost, but rarely. The name
"sensitivity" describes the opposite of what the value does: a larger value makes the stick
less sensitive.

**Proposed fix:** Section 4, A9.

### PAD-012 — P3 — API — Handlers have no removal or once, and any screen clears them

**Locations:** `onGamepadConnected()` `:175-186`, `onGamepadDisconnected()` `:194-205`,
`clearGamepadEvents()` `:429-432`.

**Trigger/reproduction (P8, P9):**
- A handler can be removed only with `clearEvents( "gamepad" )` or `clearEvents()`, which
  remove every gamepad handler.
- `screen.clearEvents( "gamepad" )` on any screen clears the global handlers.
- Registering a handler after `stopGamepad()` restarts polling.
- While stopped, connection events still run handlers and update the pad list.

**Expected:** parity with keyboard and pointer (`onkey`/`offkey` with `once`), and a stop that
stays stopped until the game starts polling again.

**Evidence:** P8 and P9, identical in all three engines.

**Impact:** modular games cannot remove one handler; a scene that clears its own screen's
events removes other scenes' gamepad handlers.

**Proposed fix:** decided by the conventions review (Section 4, A5; Section 8).

### PAD-013 — P2 — documentation — `GAMEPAD.md` documents the removed 1.2 API

**Locations:** `docs/GAMEPAD.md`:
- `:3`, `:17`, `:58`: an "event-driven API" auto-started by `ongamepad`
- `:44-51`, `:137-243`: `ongamepad()` and `offgamepad()` with six modes
- `:115`, `:317-318`, `:445-452`: `axes2` and `lastAxes2`
- `:155-156`: connect callbacks receive `{ index, type }`
- `:437-439`: blur prevents stuck buttons (false, PAD-002)
- examples 1, 3, and 5–8 (`:247-402`)

**Expected:** the guide documents the six registered commands, the pad object, and its
methods.

**Actual:** `ongamepad`, `offgamepad`, and `axes2` were removed in 2.0
(`metadata/pi-2.0/_removed.toml`), so nearly every example throws. The guide never mentions
`onGamepadConnected`, `onGamepadDisconnected`, the helper methods,
`set( { gamepadSensitivity } )`, or `clearEvents( "gamepad" )`. Only the
`setGamepadSensitivity` section (`:120-133`) is current.

**Impact:** a user following the gamepad guide cannot write a working program.

**Proposed fix:** rewrite the guide for the final 2.3 API in the release phase (R.3).

### PAD-014 — P3 — documentation — Metadata, declarations, and `API.md` misstate behavior

**Locations:** Section 2.

**Actual:**
- `GamepadData` (`_objects.toml:102-141`, `pi.d.ts:180-210`):
  - it lacks `timestamp`, `vibrationActuator`, `lastAxes`, and all six methods;
  - `index` is described as 0–3;
  - it claims the disconnect callback receives it.
- `ingamepad` returns `object | any[]`.
- The disconnect callback is typed as `GamepadData`.
- `setGamepadSensitivity` metadata has no default or error.
- `clearEvents` metadata (`clearEvents.toml:37`) omits `"gamepad"` from its types.
- `API.md:408-413` omits return shapes, errors, auto-start, the pad object, and that the plugin
  is Full-only.
- Lite declarations include gamepad types.

**Impact:** TypeScript users cannot call the helper methods without casts, and the reference
does not say what the commands return.

**Proposed fix:** update metadata and declarations with each roadmap task, as the standing
rules require. Correct the metadata for current behavior in the first roadmap phase, and
update `API.md` in the release phase.

### PAD-015 — P3 — test gap — The manual gamepad pages register the plugin twice

**Locations:** `test/tests/html-manual/gamepad_01.html:7-9`, `gamepad_02.html:7-8`,
`gamepad_03.html:7-8`, `:121`.

**Trigger/reproduction:** `probes.js` loads each page through the source-serving context.

**Actual:** each page loads `pi.js`, which already contains gamepad (and keyboard), then the
standalone `gamepad.js`, whose self-registration throws `registerPlugin: Plugin 'gamepad' is
already registered.` `gamepad_01` also reports it for `keyboard`. In `gamepad_03.html:121`,
`if( m_gamepadIndex )` is false for pad index 0, so the footer never draws for the first pad.

**Evidence:** manual page results in `probes-output.json`, identical in all three engines.
The pages still run, because the error is thrown by the second script and the Full bundle's
plugin is already registered.

**Impact:** the manual device pages start with an error, which hides real errors during a
device pass.

**Proposed fix:** drop the standalone script from Full pages, or load Lite plus the plugin, and
test the index against `null`. This is the gamepad roadmap's task (plan §8.3). The
self-registration behavior is handed to the core audit (Section 8).

### PAD-016 — P3 — test gap — Most gamepad behavior has no automated test

**Locations:** `test/unit/gamepad-validation.test.js`,
`test/unit/gamepad-validation-browser.test.js`;
`docs/evidence/tests-2.3/coverage-map-after.json`.

**Actual:** the tests check sensitivity validation and dead-zone output only. `startGamepad`,
`onGamepadConnected`, and `onGamepadDisconnected` have no test, and `stopGamepad` appears only
in a `finally`. No test covers buttons, edges, connection dispatch, `clearEvents( "gamepad" )`,
blur and focus, return shapes, or the helper methods. The test audit handed these gaps to this
workstream (TESTS-V2.3-AUDIT.md §5.4).

**Impact:** PAD-001 to PAD-012 and PAD-017 could appear or return without a failing test.

**Proposed fix:** Section 5.2.

### PAD-017 — P3 — defect — The press that exposes a pad is never reported as just pressed

**Locations:** `gamepadConnected()` `:213-222`, the guard at `:280-284`.

**Trigger/reproduction (P3b):** browsers hide a pad until a button is pressed, then dispatch
`gamepadconnected` with that button held. A game reads every frame.

**Expected:** the game sees that press once, as it sees later presses.

**Actual:** the event creates the pad outside the per-tick guard, with the press as an edge.
The game's next read updates again from the same snapshot, which clears the edge.
`getButtonJustPressed()` is never true for the exposing press. P3b made two presses and the
game saw one.

**Evidence:** P3b, identical in all three engines. It matches the device pass, where an
every-frame loop saw 25 of 26 presses in Chrome and 21 of 22 in Firefox, with every release.
A pad reconnected after the first press needed no press to reappear, and none of its presses
were lost.

**Impact:** "Press any button to join" screens that poll for a press miss the first press on
each controller. A connect handler still sees the pad.

**Proposed fix:** covered by A1: with the loop as the only updater, the connection event
records the pad without consuming its edges.

### Unconfirmed concerns

These are not findings. The device pass (Section 6.3) settled most of them for Chrome and
Firefox on Windows; Safari was not checked.

- **Focus and input delivery.** The Gamepad specification withholds input only from documents
  that are hidden or not fully active. **Firefox:** it delivered real input to a visible,
  unfocused page. **Chrome:** it reported a held button as released 70 ms after a blur, with
  the page still visible. This is consistent with Chromium withholding input from unfocused
  windows, although a release that fast cannot be ruled out. Either way, polling while the
  page is visible gives the browser's own answer (A2).
- **Duplicate connection events (PAD-006).** Not seen in Chrome or Firefox.
- **Reconnect indices.** The specification reuses the lowest free index on reconnect. Pi.js
  keys pads by index, so a different controller can take a disconnected player's slot.
  **Settled for Chrome and Firefox:** a disconnected pad 0 came back as index 0, in Chrome
  with pad 1 still connected. Pi.js matched the browser events one for one. Swapping in a
  different controller was not tried.
- **Pad identifiers.** The same Xbox One controller reported `id` as
  `"Xbox One Game Controller (STANDARD GAMEPAD)"` in Chrome and `"xinput"` in Firefox. Games
  should not rely on `id` to recognize a controller model.
- **Vibration.** `vibrationActuator.playEffect( "dual-rumble" )` is listed for Chromium 68+ and
  Safari 16.4+. Firefox has only `hapticActuators[].pulse()`, and iOS Safari has neither.
  **Settled for Chrome and Firefox:** `dual-rumble` played in Chrome 153. Firefox 156 exposed
  neither `vibrationActuator` nor `hapticActuators`, so nothing could vibrate.
- **`webkitGetGamepads`.** The prefixed fallback (`:257`, `:288`) is dead in every supported
  browser (unprefixed since Chrome 35 and Safari 10.1). This is noted for size only.

## 4. Proposed API

Each item is marked **fix** (restores documented or expected behavior), **additive**, or
**breaking**. Names and handler shapes marked "§6" wait for the input conventions review.
Dependents: no other plugin uses gamepad; the manual pages and `test/gamepad.html` do. The
first breaking item moves the plugin to 2.0.0 (G1).

| ID | Change | Kind | Findings |
| --- | --- | --- | --- |
| A1 | The polling loop is the only updater. Reads return the latest update and never trigger one while the loop runs. Edges report what happened since the previous read, and reads in the same animation frame see the same result. Connection events record a pad without consuming its edges | fix | PAD-001, PAD-017 |
| A2 | Stop pausing on blur: keep polling while the page is visible, focused or not. Firefox delivers real input to an unfocused page, and Chrome reports held buttons released, so polling tracks the browser in both. On `visibilitychange` to hidden, when animation frames stop, release every button, zero the axes, and clear edges; resume when visible | fix | PAD-002 |
| A3 | Dispatch from a copy of the handler list; call each handler in its own `try`, reporting errors with `console.error` as `clearEvents` does (`src/core/plugins.js:200-245`); update the pad list before dispatch; schedule the loop before the start-up scan | fix | PAD-003, PAD-004, PAD-007 |
| A4 | Each new connect handler receives the pads already connected. A connection event for a tracked, connected index does not dispatch again | fix | PAD-005, PAD-006 |
| A5 | Handler removal and `once`, either as `offGamepadConnected`/`offGamepadDisconnected` (additive) or one event pair such as `ongamepad( "connect", fn, once )` / `offgamepad( … )` (breaking). `stopGamepad()` stays in force until `startGamepad()` or a read. `clearEvents( "gamepad" )` on a screen follows the §6 rule for global handlers | §6 | PAD-012 |
| A6 | `ingamepad()` always returns an array (empty when stopped or when no pad is connected). `ingamepad( index )` returns the pad or `null` | breaking | PAD-010 |
| A7 | Stable live objects: `buttons`, each button, and `axes` are updated in place. The list form reuses one array per frame. Documented as live, with a copy left to the game when it needs one | fix | PAD-009 |
| A8 | Helper indices must be integers, or they throw `INVALID_PARAMETERS`, as `ingamepad()` does. Out of range: `false` from boolean queries, `0` from `getAxis()`, `null` from `getButton()` | fix | PAD-008 |
| A9 | A radial dead zone for the two sticks of the standard mapping (axes 0–1 and 2–3), rescaled from the threshold to 1, and per-axis for other axes. Rename `setGamepadSensitivity` to a dead-zone name, such as `setGamepadDeadZone` with option `gamepadDeadZone`, range 0 to under 1. The old name fails as an unknown command (G3) | breaking | PAD-011 |
| A10 | Standard-mapping names accepted by the helper methods, such as `"south"`, `"east"`, `"l1"`, `"start"`, `"up"` for buttons and `"leftX"`, `"rightY"` for axes. Numbers still work | additive | — |
| A11 | `vibrateGamepad( gamepadIndex, duration, strong, weak )` using `playEffect( "dual-rumble" )`, returning whether the pad supports it. It covers Chromium and desktop Safari; Firefox and iOS return false. The device pass played `dual-rumble` on an Xbox One controller in Chrome 153; Firefox 156 exposed no actuator. Estimated under 150 bytes gzipped. Recommended in scope; the alternative is to leave `vibrationActuator` as the only access | additive | — |
| A12 | Remove the `webkitGetGamepads` fallback. Add the blur and focus listeners on the first start instead of at plugin registration, so Full pages that never use a gamepad attach nothing | fix | — |

**Upgrade-guide sketches:**
- **A6:** "`ingamepad()` always returns an array, and `ingamepad( i )` returns `null` for a
  missing pad. Replace `if( pads )` checks with a length check, and `=== undefined` with
  `=== null`."
- **A9:** "`setGamepadSensitivity()` is now `setGamepadDeadZone()`, and
  `set( { gamepadSensitivity } )` is now `set( { gamepadDeadZone } )`. Stick values are
  measured radially, so diagonal movement near the center is no longer lost."
- **A5:** depends on §6. If the handlers are renamed, list each old name and its replacement.

## 5. Coverage Map

### 5.1 Current coverage

| Command or behavior | Node | Browser | Manual |
| --- | --- | --- | --- |
| `setGamepadSensitivity` validation and dead-zone output (SYS-021) | `gamepad-validation` (18 cases) | `gamepad-validation-browser` (4) | `gamepad_01` |
| `ingamepad( index )` axes | `gamepad-validation` | `gamepad-validation-browser` | `gamepad_01–03` |
| `ingamepad()` list | — | — | `gamepad_02` |
| `stopGamepad` | — | Called in `finally` only | — |
| `startGamepad` | — | — | — |
| `onGamepadConnected`, `onGamepadDisconnected` | — | — | `gamepad_01`, `gamepad_03` |
| Buttons and edges | — | — | `gamepad_01`, `gamepad_03` |
| `clearEvents( "gamepad" )` | — | — | `clearevents_02`, `events_comprehensive` (no-throw only) |
| Blur and focus, lifecycle, helper validation, Lite plus plugin | — | — | — |

### 5.2 Tests to add first

Ranked by value. Each test starts from the probe that reproduces its finding. Following the
standing rules, pure logic goes in the Node test (`gamepad-validation.test.js`, whose `vm`
harness already scripts pads and frames), and only bundle wiring goes in the browser test.

1. Edges by read timing: every frame, every other frame, timer reads (P1, PAD-001).
2. Dispatch isolation: throwing handlers, pad removal, handlers added during dispatch (P5,
   P5b, P6).
3. Blur and focus: released state and cleared edges (P4, PAD-002).
4. Connection replay, duplicate events, and the exposing press (P7, P3, P3b).
5. Lifecycle: start, stop, repeat start, reads and registration after stop (P8).
6. `clearEvents( "gamepad" )` scope and the handlers left afterward (P9).
7. Helper validation and out-of-range values (P10).
8. Return shapes and index gaps (P11).
9. Stable objects and no per-frame allocation (P12).
10. Dead-zone model per axis pair (P13).
11. Lite with the standalone plugin, in the existing browser file (P14b).

## 6. Validation

### 6.1 Commands

| Check | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | Passed; no tracked file changed |
| Size | `npm run size -- --out=docs/evidence/gamepad-2.3/size-baseline.json` | Gamepad 4,006 B, 1,428 B gzip |
| 2.2 regressions | `node --test test/unit/gamepad-validation.test.js test/unit/gamepad-validation-browser.test.js` | 22 of 22 passed |
| Reproductions | `node docs/evidence/gamepad-2.3/probes.js` | Every probe matched the source analysis in Chromium, Firefox, and WebKit; P14b control passed |

### 6.2 Browser behavior

From the W3C Gamepad specification and MDN browser compatibility data:

| Behavior | Source | Testable with synthetic events? |
| --- | --- | --- |
| No pads until a button press or axis movement (the privacy gate) | Spec, `getGamepads()` | No: device pass step 2 |
| The `"gamepad"` Permissions-Policy feature, default allowlist `*`, so cross-origin iframes are allowed unless the embedder restricts them | Spec | Partly: can be set in a test page |
| Input withheld only from hidden or inactive documents; focus not mentioned | Spec | No: device pass step 5 |
| Indices first come, first served; the lowest free index is reused on reconnect; `getGamepads()` keeps `null` holes | Spec, MDN | Partly: the probes model holes; device pass step 7 |
| Standard mapping: buttons 0–16, axes 0–3 | Spec | Yes |
| `getGamepads()` returns snapshots updated from the gamepad task source, not per frame | Spec | Partly |
| Axis values -1 to 1; any dead zone is the page's to apply | Spec | Yes |
| `playEffect( "dual-rumble" )`: Chrome 68, Safari 16.4; `trigger-rumble`: Chrome 126; Firefox: `pulse()` only; iOS Safari: none | MDN compatibility data | No: device pass step 8 |

### 6.3 Device pass

The user runs the pass with a physical controller and
`docs/evidence/gamepad-2.3/device-check.html`, following the steps in the evidence README. It
covers the privacy gate, connect callbacks, press counts at two read rates, state across a
focus change, stick dead-zone loss, reconnect indices, and vibration.

**Results (2026-09-24),** on Windows 11 with a 100 Hz display and Xbox One controllers
(standard mapping). Chrome 153 used two controllers; Firefox 156 used one.

| Check | Chrome 153 | Firefox 156 |
| --- | --- | --- |
| Privacy gate | Both pads appeared together on the first press, 4.7 s after load | The pad appeared on the first press, 5.0 s after load |
| Connect callbacks | 3 browser events, 3 Pi.js calls | 2 browser events, 2 Pi.js calls |
| Press edges, every frame (PAD-017) | 25 of 26 presses, 26 of 26 releases | 21 of 22 presses, 22 of 22 releases |
| Press edges, 30 Hz timer (PAD-001) | 1 of 26 presses, 4 of 26 releases | 8 of 22 presses, 6 of 22 releases |
| Focus change with button held (PAD-002) | Page hidden 120 ms after the blur. The browser reported released 70 ms after the blur, while still visible; Pi.js stayed pressed until after focus returned | Page stayed visible. The browser reported the button held, then released 1.7 s after the blur; Pi.js stayed pressed until after focus returned |
| Focus change, no button held | Pi.js and the browser agreed (released) | Not run |
| Dead zone (PAD-011) | Past a 0.2 radius on 444 frames; Pi.js centered on 1 | Past a 0.2 radius on 231 frames; Pi.js centered on 4 |
| Reconnect | With pad 1 connected, pad 0 reconnected as index 0, with no press needed | Pad 0 reconnected as index 0 |
| `id` | `"Xbox One Game Controller (STANDARD GAMEPAD)"` | `"xinput"` |
| Vibration | `dual-rumble` played | No `vibrationActuator` or `hapticActuators`; nothing to play |

**Open device checks,** for the release pass (R.7): Safari, if macOS hardware is available.

## 7. Recommended Roadmap

`GAMEPAD-V2.3-ROADMAP.md` is written from the accepted items after the conventions review.
Proposed order:

**Phase 1 — Fixes and tests (no API change):**
- A1–A4, A7, A8, A12.
- Metadata corrections for current behavior (PAD-014).
- The manual page fixes (PAD-015).
- The tests in Section 5.2.

These can start once the roadmap is approved, and they do not depend on §6.

**Phase 2 — API (after §6):**
- A5, A6, A9, A10, and A11.
- The version moves to 2.0.0 with the first breaking change.
- Each task updates metadata, declarations, and signature tests.

**Phase 3 — Release inputs:**
- The compatibility summary.
- The device checks still open for R.7.
- Size at each phase exit.

The user documentation (`GAMEPAD.md`, `API.md`, the llms references) is rewritten in the
release phase (R.2, R.3), as the standing rules require.

**Scope-cut order:**
1. A10 and A11 (additive, can follow in 2.3.x).
2. A9 (then the dead zone keeps its name and gains the radial model as a fix).
3. Phase 2 as a set, per plan §12.3.

Phase 1 is not cut.

## 8. Handoffs

### Core audit

| Item | Detail |
| --- | --- |
| `set()` accepts unknown options | `set( { "notARealOption": 1 } )` and, in Lite, `set( { "gamepadSensitivity": 0.5 } )` are silently ignored (P14). `API.md:218` says unsupported properties are not accepted |
| Standalone plugin declarations | Plugins bundled in Full have no `metadata/plugin-<name>/` folder, so their standalone `.d.ts` declares only the init function; Lite declarations include Full-only plugin types |
| Self-registration after Full | A standalone IIFE plugin loaded after `pi.js` throws `DUPLICATE_PLUGIN` (PAD-015). Decide whether self-registration should skip a plugin that is already registered |
| `addCommand` JSDoc | The example at `src/core/plugins.js:71` puts the parameter array in the `isScreen` slot |
| Frame hook | Core has no animation-frame hook, so gamepad runs its own loop and each input plugin decides its own timing. Record whether input plugins need one |

### Input conventions review (§6)

| Item | Detail |
| --- | --- |
| Handler names | `onGamepadConnected` is camel case; keyboard uses `onkey`/`offkey`; gamepad has no `off` |
| Handler shape | `once`, removal identity, and whether connection handlers take a pad index |
| Callback data | Connect handlers receive the live pad object; disconnect handlers a plain copy |
| Auto-start | Reads and handler registration start polling; registration also undoes `stopGamepad()` |
| Return shapes | Polling returns `null`, `undefined`, an object, or an array (PAD-010) |
| Global handlers and `clearEvents` | Whether a screen's `clearEvents` clears global input handlers |
| Error codes | Gamepad uses `INVALID_PARAMETERS` with a `TypeError` for every validation error |

## 9. Review Decisions

The maintainer marks each item accepted, rejected, or deferred (plan §5.6). Decisions
recorded 2026-09-24.

| ID | Summary | Decision | Notes |
| --- | --- | --- | --- |
| PAD-001 | Edges lost unless every frame is read | Accepted | Fixed by A1. Confirmed on hardware in Chrome and Firefox |
| PAD-002 | Blur freezes state | Accepted | Fixed by A2. Confirmed on hardware in Chrome and Firefox |
| PAD-003 | Throwing handler stops dispatch, ghost pad | Accepted | Fixed by A3. P1 |
| PAD-004 | Throwing scan handler escapes, polling off | Accepted | Fixed by A3 |
| PAD-005 | Later connect handlers miss connected pads | Accepted | Fixed by A4 |
| PAD-006 | Duplicate connect for a tracked pad | Accepted | Fixed by A4. Not seen on hardware; the guard is kept because it is cheap |
| PAD-007 | Handler added during dispatch runs at once | Accepted | Fixed by A3 |
| PAD-008 | Helper index validation and range values | Accepted | Fixed by A8 |
| PAD-009 | Live object with replaced arrays | Accepted | Fixed by A7 |
| PAD-010 | Four `ingamepad()` return shapes | Accepted | Fixed by A6 (breaking) |
| PAD-011 | Per-axis dead zone | Accepted | Fixed by A9 (breaking) |
| PAD-012 | No handler removal; screen-wide clear | Accepted | Fixed by A5; the shape follows the conventions review |
| PAD-013 | `GAMEPAD.md` documents the removed API | Accepted | Rewritten in the release phase (R.3) |
| PAD-014 | Metadata, declarations, `API.md` gaps | Accepted | Metadata and declarations in the roadmap; `API.md` in R.2 |
| PAD-015 | Manual pages register the plugin twice | Accepted | Roadmap Phase 1. Self-registration handed to the core audit |
| PAD-016 | Missing automated tests | Accepted | Roadmap Phase 1, Section 5.2 |
| PAD-017 | The exposing press is not reported | Accepted | Fixed by A1. Confirmed on hardware in Chrome and Firefox |
| A1–A4, A7, A8, A12 | Fixes | Accepted | Roadmap Phase 1; no API change |
| A5 | Handler removal and `once` (§6) | Accepted | Names and signatures decided by the conventions review |
| A6 | Return shapes | Accepted | Breaking; moves the plugin to 2.0.0 |
| A9 | Radial dead zone and rename | Accepted | Breaking: radial stick dead zone, and `setGamepadSensitivity` becomes `setGamepadDeadZone` (`gamepadDeadZone`). The old name fails as an unknown command (G3) |
| A10 | Standard-mapping names | Accepted | Additive. The name set follows the conventions review |
| A11 | `vibrateGamepad()` | Accepted | Additive. Returns false where unsupported (Firefox 156, iOS Safari) |
