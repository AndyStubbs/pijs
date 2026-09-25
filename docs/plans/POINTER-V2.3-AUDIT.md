# Pi.js 2.3 Pointer Audit

Status: Reviewed 2026-09-25; every finding and proposal accepted (Section 9); the roadmap
waits for the input conventions review
Plan: [UPGRADE-V2.3-PLAN.md](UPGRADE-V2.3-PLAN.md), Section 5
Evidence: [docs/evidence/pointer-2.3/](../evidence/pointer-2.3/README.md)

## 1. Summary

- **Revision:** `cfc32a9` (working tree at that commit, 2026-09-24).
- **Environment:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0, Playwright
  1.56.0 (Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0), esbuild 0.25.10.
- **Scope:** `plugins/pointer/` (six modules, 1,275 lines, version 1.0.0), its core
  dependencies (`src/core/canvas-layout.js`, `utils.inRange()`, the screen hooks and
  `clearEvents`), its metadata and declarations, its documentation, its tests, and its
  dependents `onscreen-keyboard` and `pi-vision`. The plugin is bundled in `pi.js` (Full) and
  built standalone for Lite.
- **Size:** 3,951 bytes gzipped standalone, about 5.4% of `pi.min.js`.
- **Method:** source review, then reproductions in `probes.js` with synthetic mouse and touch
  events, run in all three engines. T1 repeats the mouse scenarios with Playwright's trusted
  input, so the browser chooses the event targets itself. All three engines agree on every
  observation. A mouse device pass in Chrome 153 confirmed PTR-004, PTR-005, PTR-007,
  PTR-008, and PTR-011 on hardware (Section 6.3). No touch hardware was available, and Firefox
  and Safari were not checked by hand.

The plugin covers the common single-pointer case: one mouse or one finger, pressed and
released on the canvas, read by polling or by one handler per mode. Outside that case its
handler bookkeeping, multi-touch model, and release tracking are unreliable, and one of these
defects is reachable through a bundled dependent.

Most important findings:
1. **Removing a handler can disable all handlers of that type (PTR-001, P1).** Dispatch is
   gated by a per-type counter that `off*()` changes by guesswork. Clearing one mode, or
   removing a function that was never added, stops every other handler of that type. Showing
   and hiding the on-screen keyboard is enough to silence a game's `onpress` handlers, in
   every engine (P17).
2. **Multi-touch reports the wrong touch (PTR-002, PTR-003).** Touch data is rebuilt from the
   touches still down, so the touch that ended is never reported, and press and click follow
   whichever touch is first in the list. A hit-boxed `ontouch( "end" )` never fires when its
   finger lifts, and fires when a different finger lifts elsewhere.
3. **Releases the canvas does not see are lost (PTR-004, PTR-007).** Releasing the button
   outside the canvas leaves `buttons` held and never dispatches `up`; trusted input confirms
   this in all three engines, and so does a real mouse in Chrome. On blur, polling is reset but
   handlers are never told, so the two disagree; in Chrome the button was still held.
4. **Clicks fire when they should not (PTR-005, PTR-008).** A click listener stays armed after
   a press ends outside its box, so a later drag into the box clicks. Cancelled touches, right
   clicks, and middle clicks all fire `onclick`.
5. **One throwing handler breaks the event (PTR-006).** It stops later handlers, the press and
   click dispatch of the same event, and, for touch, the `preventDefault()` that suppresses
   browser gestures.

The 2.2 contracts still hold: COV-001 (`intouch_01` touch fixture), SYS-009 (late plugin
installation, exercised with pointer on Lite), and SYS-013 (automatic plugin registration). All
pointer tests pass: 11 of 11 Node and browser tests, all 11 core pointer visual fixtures, and
6 of 6 plugin visual fixtures.

## 2. API Inventory

### 2.1 Commands

Sources compared: the runtime (`plugins/pointer/`), metadata (`metadata/pi-2.0/pointer-*.toml`
overridden by `metadata/pi-2.2/pointer-*.toml` for 10 commands; data types in
`metadata/pi-1.2/_objects.toml`), the generated `docs/llms/pi.d.ts`, `docs/API.md:393-406`,
`docs/llms/llms-full.txt:451-477`, and `docs/llms/examples.txt`. The pi-2.1 and pi-2.3 layers
have no pointer entries. The plugin has no README.

| Command | Runtime | Disagreements |
| --- | --- | --- |
| `startMouse()` | Validates an onscreen target; clears the stopped flag; adds `mousemove`, `mousedown`, `mouseup`, and `contextmenu` listeners to the canvas once (`mouse.js:89-102`) | `pointer-startMouse.toml:7` and `pi.d.ts:1902` say state is available via `getMouse()`, which does not exist, and that registering a handler starts tracking; after `stopMouse()` it does not (P10) |
| `stopMouse()` | Sets a sticky stopped flag and removes the listeners (`mouse.js:110-123`). Held buttons stay held (P10). Reads and handler registration do not restart tracking | The stickiness is shown only by the `startMouse` example. Not validated for offscreen screens, unlike `startMouse` |
| `inmouse()` | A new `{ x, y, lastX, lastY, buttons, action, type }` object each call; starts tracking unless stopped (`mouse.js:143-147`). Before any event: the screen center with action `"none"` | `pointer-inmouse.toml` example tests `lastX !== undefined`, which is always true; `MouseData.action` omits `"none"` |
| `onmouse( mode, fn, once, hitBox, customData )` | Modes `down`, `up`, `move`. Errors `INVALID_MODE`, `INVALID_FUNCTION`, `INVALID_HITBOX` as plain `Error`s (`shared-events.js:17-90`). Hit box values must be integers (P13) | `HitBox` is typed `number`; integer-only is undocumented. Negative sizes are accepted |
| `offmouse( mode, fn )` | `fn` omitted clears the mode; `mode` is required, so there is no way to clear all modes (`mouse.js:195-214`). Adjusts the dispatch counter by guesswork (PTR-001) | Metadata has no 2.2 layer; its description is correct |
| `setEnableContextMenu( isEnabled )` | Screen command; coerces any value with `!!` (P13); starts mouse tracking (`mouse.js:156-160`). The menu is suppressed only while mouse tracking runs (P14) | `pointer-setEnableContextMenu.toml:7` says disabled is the default; it is disabled only once tracking has started |
| `startTouch()`, `stopTouch()` | Non-passive `touchstart`, `touchmove`, `touchend`, `touchcancel` listeners (`touch.js:80-114`); stop is sticky and keeps held touches (P10) | The `stopTouch` JSDoc (`touch.js:97`) says it resets the touch state; it does not |
| `intouch()` | A new array of new objects each call (`touch.js:122-126`), ordered by identifier. Every touch carries the last event's action (PTR-002). `lastX`/`lastY` are `null` on a touch's first event | `TouchData.lastX` is typed `number` |
| `ontouch( mode, fn, once, hitBox, customData )`, `offtouch( mode, fn )` | Modes `start`, `end`, `move`. The callback receives the touches still down; a hit box filters that array (`shared-events.js:158-168`) | `pointer-ontouch.toml` says the callback fires when touches are within the hit box; for `end` it tests the wrong touches (PTR-002) |
| `setPinchZoom( isEnabled )` | Global command. Writes `document.body.style.touchAction` (`""` or `"none"`), replacing the page's own value (`touch.js:188-195`). While touch is tracked, `touchstart` is always prevented, so pinch zoom cannot start on the canvas even when enabled (P14) | Metadata says it is global; no 2.2 layer. `API.md` lists it with the screen commands |
| `inpress()` | Starts mouse and touch; returns the touch press if the last event was touch, else `inmouse()` (`press.js:58-67`) | See Section 2.2 |
| `onpress( mode, fn, once, hitBox, customData )`, `offpress( mode, fn )` | Modes `down`, `up`, `move`; touch `start`/`end` are dispatched as `down`/`up` but keep their touch action names in the data (P12) | `PressData.action` is documented as `down`/`up`/`move` |
| `onclick( fn, once, hitBox, customData )`, `offclick( fn )` | A down inside the hit box arms the listener; an up inside it fires (`shared-events.js:150-183`). Any mouse button (PTR-008). The default hit box is the screen size at registration (`press.js:138-145`) | `pointer-onclick.toml:7` says the release must be "in the same location"; it is the same hit box |
| `clearEvents( "mouse" \| "touch" \| "press" )` | Per screen, or all screens from the global API (`index.js:40-85`). `"press"` also clears click handlers; there is no `"click"` type | `clearEvents.toml:37` does not say that `"press"` clears clicks |

### 2.2 Callback and polling data

| Type | Runtime | Disagreements |
| --- | --- | --- |
| `MouseData` | `{ x, y, lastX, lastY, buttons, action, type: "mouse" }`; `buttons` is the browser bitmask; `action` is `"none"`, `"down"`, `"up"`, or `"move"` | `"none"` undocumented |
| `TouchData` | `{ x, y, id, lastX, lastY, action, type: "touch" }`; `lastX`/`lastY` `null` on first sight; `action` shared by all touches of the event | `lastX` typed `number` |
| `PressData` (mouse) | The `MouseData` object | `PressData.buttons` documented as 0 or 1; mouse press reports the bitmask |
| `PressData` (touch) | The first touch in identifier order plus `buttons` (0 or 1) and `touches`, an array whose first element is the result itself, so `JSON.stringify()` throws (P12). `action` is `"start"`, `"move"`, `"end"`, or `"up"` (after the last lift). With no touch ever seen: `x`, `y`, `id` of `-1` | `id` and `touches` not declared; action names differ from the documented `down`/`up`/`move` |
| `ClickData` | The press data of the release: `action` is `"up"` for mouse, `"end"` or `"up"` for touch | Documented as "typically `'click'`" |
| `HitBox` | Integer `x`, `y`, `width`, `height`; `inRange()` is inclusive at the top-left and exclusive at the bottom-right (`src/core/utils.js:141-144`) | Typed `number`; the edge rule is undocumented |

### 2.3 Build and declarations

- The standalone `build/plugins/pointer/pointer.d.ts` declares only the init function, so a
  Lite user who loads the plugin gets no command types; `build/pi.lite.d.ts:246` declares
  `MouseData` without the commands. This is the same issue the gamepad audit handed to the core
  audit.
- The IIFE build registers itself when `window.pi` exists (`index.js:104-111`). Loading it
  after the Full bundle throws `DUPLICATE_PLUGIN` (PTR-016).
- The plugin adds two `window` `blur` listeners at registration (`mouse.js:50`,
  `touch.js:46`), so every Full page attaches them whether or not it uses pointer input.
- Dependents: `onscreen-keyboard` uses `onpress`/`offpress` for all three modes and reads
  `inpress()` `.buttons`, `.type`, `.x`, `.y`, and `.touches[]`
  (`plugins/onscreen-keyboard/index.js:299-326,475-487`). `pi-vision` registers `onpress`
  for all three modes once per root screen and reads `x`, `y`, and `buttons`
  (`plugins/pi-vision/window.js:332-347`). Neither uses mouse or touch commands directly.

## 3. Findings

Priorities follow the 2.2 audit: **P1** blocks a supported workflow or corrupts shared state;
**P2** is incorrect behavior under a specific trigger; **P3** is a lower-impact contract
defect. Line numbers refer to `plugins/pointer/` at `cfc32a9` unless another file is named.
Each finding names its probe in `probes.js`; the results are in `probes-output.json`.

### PTR-001 — P1 — defect — Removing a handler can disable all handlers of that type

**Locations:** `mouse.js:182-214`, `touch.js:148-180`, `press.js:89-183`,
`shared-events.js:69-73,122-137`; triggered through
`plugins/onscreen-keyboard/index.js:299-326`.

Each type (mouse, touch, press, click) keeps a counter of active handlers, and dispatch is
skipped when it is 0 (`mouse.js:232`, `press.js:213,227`). Registration adds 1. Removal
guesses: `off*( mode )` sets the counter to 0 whatever other modes hold, `off*( mode, fn )`
subtracts 1 whenever the mode has any handler even if `fn` is not among them, and a `once`
handler removes itself without subtracting.

**Trigger/reproduction (P1, P17):**

```javascript
$.onpress( "down", jump );
$.onpress( "up", () => {} );
$.offpress( "up" );          // jump never runs again

$.onpress( "down", jump );
$.showKeyboard( "text" );    // removes its handlers first: counter 1 → 0 → 3
$.hideKeyboard();            // counter 3 → 0; jump never runs again
```

**Expected:** a handler runs until it is removed, whatever happens to other handlers.

**Actual:** in every engine, after clearing another mode, the remaining mouse, touch, and press
handlers receive nothing; after `offmouse( "down", other )` and `offclick( other )` with
functions that were never added, the registered handlers receive nothing. With the on-screen
keyboard shown and hidden once, the game's press handler ran 0 times for a press it had
received before. `pi-vision` registers its press handlers once per screen and never again
(`window.js:333-347`), so the same sequence can stop its window dragging (not probed).

### PTR-002 — P2 — defect — Touch end reports the touches still down, not the one that ended

**Locations:** `updateTouch()` `touch.js:239-262`, `touchEnd()` `:225-237`, hit-box
filtering `shared-events.js:158-168`.

**Trigger/reproduction (P2):** register `ontouch( "end", fn )` and the same with a hit box
around (10, 10). Lift a single finger at (10, 10); then put fingers down at (10, 10) and
(80, 80) and lift the second.

**Expected:** each `end` reports the touch that lifted, at its last position; the hit-boxed
handler fires for the lift inside its box only; `intouch()` shows touch 1 still down.

**Actual:** the single lift delivers `[]`, and the hit-boxed handler does not fire. The second
lift delivers touch 1 (still down, at 10, 10) with action `"end"`, and the hit-boxed handler
fires for a finger that lifted at (80, 80). `intouch()` then reports touch 1 with action
`"end"`. Every touch in an event takes that event's action, so a `move` marks stationary
touches as moving too.

### PTR-003 — P2 — defect — Press and click follow the first touch, not the one that changed

**Locations:** `getTouchPress()` `press.js:238-284`, `touch.js:207-236`.

**Trigger/reproduction (P3):** `onpress( "down" )`, `onpress( "up" )`, and `onclick` with a box
at (70, 70, 20, 20). Finger 1 down at (10, 10), finger 2 down at (80, 80), finger 2 up, finger 1
up.

**Expected:** press down at (10, 10), then (80, 80), or only the primary finger's events; the
tap by finger 2 inside the box clicks once.

**Actual:** both press downs report (10, 10). The first press up reports finger 1 with action
`"end"` and `buttons: 1`, although it is still down; the second reports action `"up"`. The click
never fires. `onscreen-keyboard` reads every finger from `inpress().touches`, but it releases
all keys on each press `up` (`plugins/onscreen-keyboard/index.js:342-350`), and press `up`
fires whenever any finger lifts, so lifting one finger releases keys other fingers still hold.

### PTR-004 — P2 — defect — A release outside the canvas is never seen

**Locations:** `startMouse()` `mouse.js:95-101` (canvas listeners only, no pointer capture).

**Trigger/reproduction (P8, T1):** press on the canvas, drag off it, release.

**Expected:** `onmouse( "up" )` and `onpress( "up" )` run; `inmouse().buttons` becomes 0.

**Actual:** with trusted input in all three engines, the browser sends the `mouseup` to the
element under the cursor; Pi.js dispatches no `up` and polling keeps `buttons: 1` and
`inpress().buttons: 1` until the next event on the canvas. Moves outside the canvas are not
reported, so a drag stops at the edge. A game polling `buttons` sees the button held; a drag
handler waiting for `up` never finishes (`pi-vision` window dragging is one).

### PTR-005 — P2 — defect — Click listeners stay armed; cancelled touches click

**Locations:** `triggerEventListeners()` `shared-events.js:150-183`, `touchcancel` bound to
`touchEnd` `touch.js:91`.

**Trigger/reproduction (P4, T1):** `onclick` with a box at (0, 0, 20, 20). Press inside and
release outside; press outside, drag in, and release; touch inside and have the browser cancel
the touch.

**Expected:** no clicks. A click needs the press and release inside the box, and a cancelled
touch is not a tap.

**Actual:** the first press arms the listener and the release outside does not disarm it, so
the second press clicks, with trusted input as well. The cancelled touch clicks. Browsers send
`touchcancel` when they take over a gesture, such as a scroll, zoom, or system edge swipe.

### PTR-006 — P2 — defect — A throwing handler breaks the rest of the event

**Locations:** `triggerEventListeners()` `shared-events.js:147-187`; `mouseDown()`
`mouse.js:238-250`; `touchStart()` `touch.js:197-210`.

**Trigger/reproduction (P6):** a throwing `onmouse( "down" )` handler followed by another
`onmouse( "down" )`, an `onpress( "down" )`, and an `onclick`; then a throwing
`ontouch( "start" )` handler followed by another.

**Expected:** every handler runs and the error is reported; the touch start is still
prevented.

**Actual:** the later handler, the press handler, and the click never run: the click listener
was not armed on down, so the release does not click. The touch start is not prevented, because
`preventDefault()` comes after the dispatch. On a touch device the browser then runs its default
action (scrolling or zooming) and sends compatibility mouse events, which `onpress` handlers
receive as a second press (device check, R.7).

### PTR-007 — P2 — defect — Blur resets polling without telling handlers

**Locations:** `onWindowBlurMouse()` `mouse.js:315-321`, `onWindowBlurTouch()`
`touch.js:290-296`.

**Trigger/reproduction (P9):** hold a button (or a touch) on the canvas, then blur the window;
separately, hide the page with a button held.

**Expected:** polling and handlers agree. If the plugin releases held input on blur, the release
reaches the `up` and `end` handlers.

**Actual:** after blur, `inmouse()` reports `buttons: 0`, action `"up"`, and `intouch()` is empty,
but no `up`, `end`, or press `up` handler runs. A drag handler is left waiting, while polling
code sees the release. Hiding the page (`visibilitychange`) changes nothing: `buttons` stays 1.

**Device pass (Chrome 153):** with the button held at blur, the browser still reported it held
and the page stayed visible, while Pi.js already reported it released. The up handlers ran only
later, when Chrome delivered the real release to the unfocused page. The blur reset is
therefore wrong as well as incomplete: B5 drops it.

### PTR-008 — P3 — defect — `onclick` fires for the right and middle buttons

**Locations:** `mouseDown()`/`mouseUp()` `mouse.js:238-264`; `triggerClickListeners()`
`press.js:226-230`.

**Trigger/reproduction (P5, T1):** `onclick( fn )`, then a right click and a middle click.

**Expected:** no click. The browser's `click` event is for the primary button, and a right
click on a game button should not activate it.

**Actual:** both fire `onclick`, with trusted input in all three engines. The click data has
`buttons: 0` (the state after release), so the handler cannot tell which button was used.

### PTR-009 — P3 — defect — `once` removes other registrations; removed handlers still run

**Locations:** `onevent()` once wrapper `shared-events.js:69-73`, `offevent()` `:126-130`,
dispatch copy `:145`.

**Trigger/reproduction (P7):** register the same function with `once` and without it, then press
twice. Separately, have a `down` handler remove a later `down` handler.

**Expected:** 3 calls (2, then 1). A handler removed during a dispatch does not run later in
that dispatch, as with DOM events.

**Actual:** 2 calls: the `once` wrapper removes every registration of the function. The removed
handler still runs, because dispatch uses a copy made before the first handler.

### PTR-010 — P3 — defect — `stopMouse()` and `stopTouch()` keep held state

**Locations:** `stopMouse()` `mouse.js:110-123`, `stopTouch()` `touch.js:102-114`.

**Trigger/reproduction (P10):** hold a button and a touch, then call `stopMouse()` and
`stopTouch()`.

**Expected:** held input is released. The `stopTouch` JSDoc says the state is reset.

**Actual:** `inmouse().buttons` stays 1 and `intouch()` keeps the touch for as long as input is
stopped. `inpress()` reports the same.

### PTR-011 — P3 — defect — Border and padding points map outside the screen

**Locations:** `pointerPosition()` `target.js:31-41`.

**Trigger/reproduction (P11):** give the canvas 10 px of padding and a 5 px border, and move
the mouse over the border near two corners of a 100x100 screen.

**Expected:** no position outside 0–99, or no event for the border and padding.

**Actual:** the handler receives (-2, -2) and (101, 101). Mouse events reach the canvas over its
whole border box, while the mapping uses the content box. Drawing or hit-testing code that
indexes by position gets out-of-range values; the core `noCss` layout and user CSS both
produce borders and padding.

### PTR-012 — P3 — defect — Settings and hit boxes are not validated consistently

**Locations:** `setEnableContextMenu()` `mouse.js:156-160`, `setPinchZoom()`
`touch.js:188-195`, `onevent()` `shared-events.js:37-59`.

**Trigger/reproduction (P13):** `setEnableContextMenu( "false" )`, `setPinchZoom( "false" )`,
and hit boxes with a fraction or a negative width.

**Expected:** non-boolean settings are rejected, or at least not read as `true`; hit boxes
accept any finite position and reject negative sizes.

**Actual:** the string `"false"` enables the context menu and pinch zoom. `once` is coerced the
same way. A hit box with `x: 0.5` throws `INVALID_HITBOX`, although positions from views or
scaling are often fractional; a negative width is accepted and never matches. Handler
validation throws plain `Error`s, while gamepad throws `TypeError`s (Section 8).

### PTR-013 — P3 — API — Press, touch, and click data disagree

**Locations:** `getTouchPress()` `press.js:238-284`, `updateTouch()` `touch.js:239-262`,
`getMouse()` `mouse.js:125-135`.

**Trigger/reproduction (P12):** read `inpress()` after a mouse press and after a touch; record
the touch press action and the click action.

**Expected:** one press shape whatever the input, with the documented actions, that can be
serialized.

**Actual:** mouse press has 7 keys; touch press has 9, including `touches`, whose first element
is the press object itself, so `JSON.stringify( $.inpress() )` throws. Touch press actions are
`"start"`/`"move"`/`"end"`/`"up"` against the documented `"down"`/`"move"`/`"up"`. Mouse
`lastX` is a number on the first event and touch `lastX` is `null`. Click data has action
`"up"` against the documented `"click"`. `buttons` is a bitmask for mouse and 0 or 1 for touch.

### PTR-014 — P3 — API — Pinch zoom is page-wide; context-menu suppression starts late

**Locations:** `setPinchZoom()` `touch.js:188-195`, `touchStart()` `:208`,
`startMouse()` `mouse.js:95-101`.

**Trigger/reproduction (P14):** right-click before any pointer command, then after
`inmouse()`; set `<body style="touch-action: pan-y">`, call `setPinchZoom( true )`, track
touch, and start two touches; call `setPinchZoom( false )`.

**Expected:** the context menu is suppressed by default, as documented; enabling pinch zoom lets
a pinch start on the canvas; the page's own `touch-action` is kept.

**Actual:** the menu is shown until mouse tracking starts. The two-finger start is prevented
even with pinch zoom enabled, because `touchstart` is always prevented. `setPinchZoom( true )`
erases the page's `pan-y`, and `setPinchZoom( false )` sets `touch-action: none` on `<body>`,
which stops panning and zooming on every element of the page, not only the canvas. The
setting belongs on the canvas, per screen.

### PTR-015 — P3 — documentation — Metadata, declarations, and `API.md` misstate behavior

**Locations:** `metadata/pi-2.2/pointer-*.toml`, `metadata/pi-2.0/pointer-*.toml`,
`metadata/pi-1.2/_objects.toml:22-280`, `docs/llms/pi.d.ts`, `docs/API.md:393-406`.

- `startMouse` refers to a nonexistent `getMouse()` (also in `pi.d.ts:1902`) and says handler
  registration starts tracking, which it does not after `stopMouse()`.
- The `inmouse` and `inpress` examples test `lastX !== undefined`, which is always true.
- `PressData` omits `id` and `touches`, documents `buttons` as 0 or 1, and lists mouse action
  names for touch presses. `TouchData.lastX` is typed `number` but starts `null`. `ClickData`
  documents action `'click'`. `MouseData` omits `"none"`.
- `HitBox` is typed `number`; integers are required, and the inclusive/exclusive edges are
  undocumented.
- `setEnableContextMenu` says the menu is disabled by default; it is disabled only once mouse
  tracking starts. `clearEvents( "press" )` also clears clicks, which is undocumented.
- `API.md` lists `setPinchZoom()` with the screen commands; it is global. Neither `API.md` nor
  the metadata says that tracked touches suppress browser gestures on the canvas.
- The `stopTouch` JSDoc (`touch.js:97`) says it resets state.
- The plugin has no README.

### PTR-016 — P3 — test gap — Manual pointer pages do not load cleanly

**Locations:** `test/tests/html-manual/contextmenu_01.html:19-20`,
`clearevents_01.html:112-114`, `events_comprehensive.html:138-140`, `ontouch_03.html:33-65`.

**Trigger/reproduction (manual-page load in `probes.js`):** load each manual pointer page.

**Actual:** three pages load `pi.js` (which includes pointer and keyboard) and then the
standalone plugins, so registration throws `DUPLICATE_PLUGIN`. `ontouch_03` calls
`$.render()`, which does not exist in 2.x, and throws on load. The same in every engine. The
standalone pages are what a maintainer would use for the touch checks in R.7.

### PTR-017 — P3 — test gap — Most pointer behavior has no automated test

Dispatch counters, removal, multi-touch, release tracking, clicks, blur, stop commands,
throwing handlers, `setPinchZoom`, context-menu suppression, and validation have no automated
test (Section 5). The visual fixtures cover single-pointer happy paths; the Node test stubs
`inRange()` and checks only snapshot and removal timing.

### Unconfirmed concerns

These are not findings; each needs a device or a decision to confirm.
- **Compatibility mouse events on touch devices:** when `touchstart` is not prevented
  (PTR-006, or touch not tracked while mouse is), a tap also produces `mousedown`/`mouseup`,
  which `onpress` would receive as a second press. Needs a touch device (R.7).
- **`clearEvents()` removes dependents' handlers:** a screen's `clearEvents()` or
  `clearEvents( "press" )` removes the `onpress` handlers that `pi-vision` and
  `onscreen-keyboard` registered, and `pi-vision` never registers them again
  (`window.js:333-347`). Whether user-level `clearEvents` should reach plugin-internal
  subscriptions is a conventions question (Section 8).
- **Default click hit box:** `onclick` without a hit box stores the screen size at
  registration. If a screen's logical size changes later, the box is stale. No resize path that
  changes the logical size was found.
- **Long-press context menu on touch:** Android browsers send `contextmenu` on long press; it is
  suppressed only while mouse tracking runs. Needs a device.
- **iOS double-tap zoom and `gesturestart`:** not covered by `touch-action` on `<body>` in all
  iOS versions. Needs a device.
- **Pen input:** without Pointer Events, pens arrive as mouse events (Windows) or touch events
  (iPad) and cannot be told apart. Needs a pen.

## 4. Proposed API

Dependents: `onscreen-keyboard` and `pi-vision` use press data and handlers; demos and the
visual fixtures use every command. The first breaking item moves the plugin to 2.0.0 (G1).

| ID | Change | Kind | Findings |
| --- | --- | --- | --- |
| B1 | Handler bookkeeping without counters: dispatch whenever a mode has handlers. `off*( mode, fn )` removes only matching registrations; `once` removes only its own registration. A handler removed during a dispatch does not run later in that dispatch (DOM semantics); handlers added during a dispatch wait for the next (already the case) | fix | PTR-001, PTR-009 |
| B2 | Dispatch isolation: update state and prevent defaults before dispatch; call each handler in its own `try`, reporting errors with `console.error` as `clearEvents` does (`src/core/plugins.js:200-245`), matching gamepad A3 | fix | PTR-006 |
| B3 | Per-touch tracking from `changedTouches`: `end` reports the touch that ended at its last position; each touch keeps its own action; a hit box tests the changed touches; `intouch()` shows only touches still down with their own actions. `touchcancel` is reported as a cancel (shape per §6) and never clicks | fix | PTR-002, PTR-005 |
| B4 | Press follows the primary pointer: the mouse, or the first touch until it lifts (the Pointer Events `isPrimary` rule). Other touches reach touch handlers and `intouch()`, not press. Click is per pointer: armed by a primary-button down inside the box, disarmed by any release or cancel, fired by a release inside the box | fix | PTR-003, PTR-005, PTR-008 |
| B5 | Every press ends with exactly one release: pointer capture on down (B6), or a `window` listener while a button is held, so releases outside the canvas arrive. Blur changes nothing, because Chrome keeps delivering input, including the release, to an unfocused page (Section 6.3). On `visibilitychange` to hidden, held buttons and touches are released through the normal `up`/`end` dispatch, marked as cancelled (§6); `stopMouse()`/`stopTouch()` release the same way. A release for a button that is not held is ignored, so a late real release does not dispatch twice | fix | PTR-004, PTR-007, PTR-010 |
| B6 | One Pointer Events path: `pointerdown`/`pointermove`/`pointerup`/`pointercancel` on the canvas, `setPointerCapture()` on down, and `touch-action` on the canvas instead of `preventDefault()` on `touchstart`. Mouse commands observe mouse and pen pointers, touch commands observe touch pointers, press observes the primary pointer. Pointer Events are available in every supported browser (Chrome 55, Firefox 59, Safari 13). Five listeners (with `contextmenu`) replace eight, and compatibility mouse events no longer need suppressing | fix; observable changes listed in the compatibility summary | PTR-004, PTR-006, supports B3–B5 |
| B7 | One data shape for mouse, touch, and press: `{ x, y, lastX, lastY, buttons, action, type, id }`, with `action` `"down"`/`"move"`/`"up"` (plus the §6 cancel marker), `type` `"mouse"`/`"touch"`/`"pen"`, `lastX`/`lastY` equal to `x`/`y` on a pointer's first event, `buttons` a bitmask everywhere (touch contact is 1). Touch press `touches` becomes an array of separate objects, so the result serializes. Click data has action `"click"` | breaking | PTR-013 |
| B8 | Coordinates: a press that starts on the border or padding is ignored; moves and the release of a captured press report the true position, which can be outside the screen (documented). Hit boxes accept any finite `x`, `y` and non-negative `width`, `height` | fix | PTR-011, PTR-012 |
| B9 | Validation: `isEnabled` and `once` must be booleans (or omitted), else a validation error with the §6 code and error type | fix | PTR-012 |
| B10 | Browser-gesture settings per screen, on the canvas: pinch zoom and panning through the canvas `touch-action` (default `none`), never `<body>`; context menu suppressed from screen creation. `setPinchZoom` becomes a screen command; its name and `setEnableContextMenu`'s follow §6 | breaking | PTR-014 |
| B11 | Wheel input: `onwheel( fn, once, hitBox, customData )` and `offwheel( fn )`, with deltas normalized to pixels and page scrolling prevented while a wheel handler is registered for the screen. Games use the wheel for zoom, weapon switching, and scrolling lists. Estimated 200–300 bytes gzipped. Polled wheel state is not proposed; it would lose deltas between reads as PAD-001 did | additive | — |
| B12 | Attach the `window` listeners on the first start instead of at registration, as gamepad A12 does | fix | — |
| B13 | Allocation: polling returns a new object each call and each event allocates its data. Decide with gamepad A7 in §6 whether polling returns stable live objects; callbacks keep per-event objects | §6 | — |

**Upgrade-guide sketches:**
- **B7:** "Press, touch, and click data share one shape. Touch presses report `action` as
  `"down"`, `"move"`, and `"up"` instead of `"start"`, `"move"`, and `"end"`; `lastX` and
  `lastY` start at the current position instead of `null`; click data has `action: "click"`.
  `inpress().touches` holds copies, so it no longer contains the press object itself."
- **B10:** "`setPinchZoom()` is a screen command and sets `touch-action` on that screen's
  canvas; it no longer changes `<body>`. The context menu is suppressed from screen creation."
- **B6 observable changes:** pen input is reported with `type: "pen"`; a drag that leaves the
  canvas keeps reporting moves and its release; a press that starts on the canvas border is
  ignored.
- **B11:** additive; no upgrade entry.

## 5. Coverage Map

### 5.1 Current coverage

| Command or behavior | Node | Browser | Visual | Manual |
| --- | --- | --- | --- | --- |
| Dispatch snapshot, `once` in nested dispatch, same-turn removal | `pointer-events` (2) | — | — | — |
| Offscreen validation for 10 commands | — | `pointer-browser` (2) | — | — |
| `noCss` coordinates with margins, padding, borders, and CSS scale | — | `pointer-browser` | — | — |
| Late installation on Lite screens (SYS-009) | — | `plugin-installation-browser` (2) | — | — |
| Subscriptions cleared before screen disposal | — | `pointer-browser` | `pointer_lifecycle_01` | — |
| `inmouse` | — | — | `inmouse_01` | — |
| `onmouse`, `offmouse` | — | `firefox-smoke` (register only) | `onmouse_01–03` | `events_comprehensive` |
| `intouch` (COV-001) | — | — | `intouch_01` | `ontouch_01–03` |
| `ontouch`, `startTouch`, `stopTouch` | — | — | `ontouch_04` | `ontouch_01–03` |
| `inpress`, `onpress`, `offpress`, `startMouse`, `stopMouse` | — | — | `inpress_01`, `onpress_01–02`, `onmouse_03` | — |
| `onclick`, `offclick` | — | — | `onclick_01` | `events_comprehensive` |
| Views with pointer input | — | — | `view_comprehensive` | — |
| Dependents | — | — | `onscreen_keyboard_01–04`, `pi_vision_01` | — |
| `setEnableContextMenu` | — | offscreen only | — | `contextmenu_01` |
| `clearEvents( "mouse" \| "touch" \| "press" )` | — | — | — | `clearevents_01–02`, `events_comprehensive` |
| Counters, multi-touch, releases outside the canvas, blur, stop state, throwing handlers, clicks by button, `touchcancel`, `setPinchZoom`, validation | — | — | — | — |

### 5.2 Tests to add first

Ranked by value. Each test starts from the probe that reproduces its finding. Following the
standing rules, pure dispatch logic goes in the Node test (`pointer-events.test.js`), and event
wiring goes in the browser test (`pointer-browser.test.js`), which can reuse the probes'
synthetic touch events.

1. Handler bookkeeping: clearing one mode, removing unknown functions, `once` with a duplicate,
   and the on-screen keyboard show/hide sequence (P1, P7, P17).
2. Multi-touch: end and cancel data, per-touch actions, press and click with two fingers (P2,
   P3, P4).
3. Release tracking: release outside the canvas with trusted input, blur, hidden page, and stop
   commands (T1, P8, P9, P10).
4. Dispatch isolation: throwing mouse, press, and touch handlers; `preventDefault()` still
   applied (P6).
5. Clicks: button filtering and stale arming (P4, P5).
6. Coordinates on the border and padding (P11).
7. Settings: context-menu default, pinch zoom on the canvas, and validation (P13, P14).
8. Data shapes, including serialization of `inpress()` (P12).
9. Lite with the standalone plugin (P16), in the existing browser file.

## 6. Validation

### 6.1 Commands

| Check | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | Passed; no tracked file changed |
| Size | `npm run size -- --out=docs/evidence/pointer-2.3/size-baseline.json` | Pointer 12,738 B, 3,951 B gzip |
| Pointer tests and 2.2 regressions | `node --test test/unit/pointer-events.test.js test/unit/pointer-browser.test.js test/unit/plugin-installation-browser.test.js` | 11 of 11 passed |
| Core visual fixtures | `npm run test:grep -- "mouse\|touch\|press\|click"`, then `"comprehensive"` for `view_comprehensive` | 10 of 10 passed, including `intouch 01` (COV-001); 9 of 9 passed |
| Plugin visual fixtures | `npm run test:plugins:grep --` with `"onscreen"`, `"vision"`, `"lifecycle"` | 6 of 6 passed |
| Reproductions | `node docs/evidence/pointer-2.3/probes.js` | Every probe matched the source analysis in Chromium, Firefox, and WebKit, trusted input included; the P16 control passed |

### 6.2 Browser behavior

From the W3C Pointer Events and Touch Events specifications and MDN browser compatibility
data:

| Behavior | Source | Testable with synthetic events? |
| --- | --- | --- |
| Pointer Events unify mouse, pen, and touch, with `pointerId`, `pointerType`, `isPrimary`, `button`, and `buttons`; supported in Chrome 55, Firefox 59, and Safari 13 (iOS 13) | Pointer Events spec, MDN | Yes |
| A mouse release goes to the element under the cursor unless the pointer is captured; `setPointerCapture()` routes it to the capturing element | Spec | Yes, with trusted input (T1) |
| Touch pointers are implicitly captured to the element where they started; touch events always target the start element | Spec | Partly |
| Browser panning and zooming are controlled by CSS `touch-action` on the element and its ancestors; `preventDefault()` on `pointerdown` does not stop them | Pointer Events spec | No: device check |
| Canceling `touchstart` or `touchmove` stops scrolling, zooming, and the compatibility mouse events of a tap. Touch listeners on `window`, `document`, and `<body>` are passive by default in current browsers; listeners on the canvas are not | Touch Events spec, MDN | Partly: device check |
| The browser sends `touchcancel`/`pointercancel` when it takes over a gesture or the system interrupts | Specs | No: device check |
| `mouseup.buttons` is the state after release; `button` names the changed button | UI Events spec | Yes |
| Right-click, Ctrl+click on macOS, and long press on Android send `contextmenu` | MDN | Partly |
| `wheel` delta units vary (`deltaMode` pixels or lines by browser and device) | UI Events spec, MDN | Partly |
| iOS Safari ignores `user-scalable=no`; pinch and double-tap zoom are controlled by `touch-action` and prevented touch events | MDN, WebKit release notes | No: device check |

### 6.3 Device pass

The user runs the pass with a mouse and `docs/evidence/pointer-2.3/device-check.html`,
following the steps in the evidence README. It covers a release outside the canvas, right and
middle clicks, stale clicks, a focus change with the button held, the wheel, the context
menu, and coordinates over the canvas border. No touch device was available.

**Results (2026-09-24),** Windows 11, Chrome 153, mouse. The canvas is 200x150 logical pixels
shown at 400x300 CSS pixels with an 8 px border, so the border is 4 logical pixels wide.

| Check | Chrome 153 |
| --- | --- |
| Release outside the canvas (PTR-004) | The browser delivered the release outside the canvas (1 up, buttons 0); Pi.js dispatched 0 mouse ups and 0 press ups and kept `buttons: 1` |
| Right and middle click in the click box (PTR-008) | 2 Pi.js clicks, both at the same point, with `buttons: 0` (from the log; the step was not recorded with its key) |
| Down in the box and up outside, then down outside and up inside (PTR-005) | 1 Pi.js click, for the second press |
| Focus change with the button held (PTR-007) | At blur the browser reported the button held (`buttons: 1`) and the page stayed visible; Pi.js already reported `buttons: 0` and dispatched no up. The up handlers ran later, when the browser delivered the release to the canvas, before focus returned |
| Focus change, no button held | Blur, then the page went hidden 25 ms later; Pi.js and the browser agreed (released) |
| Wheel | 7 wheel events over the canvas; Pi.js has no wheel input |
| Context menu | Suppressed by default once tracking had started (1 event prevented); shown after `setEnableContextMenu( true )` (1 event not prevented) |
| Border coordinates (PTR-011) | Moves over the border reported x -4 to 203 and y -5 to 153, against 0–199 and 0–149 |

The focus result refines B5. Chrome kept delivering mouse events to the unfocused page and
delivered the release itself, so a release made up at blur would have been followed by a second,
real release. B5 therefore releases on `visibilitychange` to hidden (as gamepad A2 does), not
on blur, and ignores a release for a button that is not held.

Firefox was not run.

**Open device checks,** for the release pass (R.7): the mouse pass in Firefox and Safari; touch
and multi-touch on a phone or tablet
(PTR-002, PTR-003), `touchcancel` from a system gesture (PTR-005), pinch zoom with
`setPinchZoom` on and off (PTR-014), compatibility mouse events after a tap, long-press
context menu, iOS double-tap zoom, and pen input.

## 7. Recommended Roadmap

`POINTER-V2.3-ROADMAP.md` is written from the accepted items after the conventions review.
Proposed order:

**Phase 1 — Fixes and tests (no API change):**
- B1, B2, B5 (window listeners for releases), B8, B12.
- B3 and B4 where they keep the current data shape; the action names follow in Phase 2.
- Metadata corrections for current behavior (PTR-015).
- The manual page fixes (PTR-016).
- The tests in Section 5.2.

B1 fixes the P1 finding and is the first task. These can start once the roadmap is approved,
and they do not depend on §6.

**Phase 2 — Pointer Events and API (after §6):**
- B6, which replaces the listeners behind the Phase 1 fixes.
- B7, B9, B10, B11, and B13.
- The version moves to 2.0.0 with the first breaking change.
- Each task updates metadata, declarations, signature tests, and the dependents
  (`onscreen-keyboard`, `pi-vision`), with the plugin visual suite passing.

**Phase 3 — Release inputs:**
- The compatibility summary.
- The device checks still open for R.7.
- Size at each phase exit.

The user documentation (`API.md`, the llms references, and a new plugin README) is written in
the release phase (R.2, R.3), as the standing rules require.

**Scope-cut order:**
1. B11 (additive, can follow in 2.3.x).
2. B6 (then B5 keeps window listeners and B10 keeps `preventDefault()` with a per-screen flag).
3. Phase 2 breaking items as a set, per plan §12.3.

Phase 1 is not cut.

## 8. Handoffs

### Core audit

| Item | Detail |
| --- | --- |
| Standalone plugin declarations | Same as the gamepad handoff: the standalone `pointer.d.ts` declares only the init function, and Lite declarations include pointer data types |
| Self-registration after Full | The standalone plugin loaded after `pi.js` throws `DUPLICATE_PLUGIN` (PTR-016); gamepad raised the same question |
| `canvas-layout.js` | Pointer mapping and presentation sizing share `getCanvasContentRect()`; its content-box rule is why border points map outside the screen (PTR-011). Rotation and skew are unsupported by design |
| Plugin-internal subscriptions and `clearEvents` | `clearEvents()` on a screen removes handlers that plugins registered for their own use (`pi-vision`, `onscreen-keyboard`). Decide whether plugins need subscriptions that user-level `clearEvents` does not reach |

### Input conventions review (§6)

| Item | Detail |
| --- | --- |
| Handler names | `onmouse`/`offmouse`, `ontouch`, `onpress`, `onclick` are lower case with a mode argument; gamepad uses `onGamepadConnected` with no `off`; keyboard uses `onkey`/`offkey` |
| Handler shape | Mode strings, `once` as a positional boolean, hit boxes, and `customData` on every pointer handler; removal by mode and function; `off*()` cannot clear all modes |
| Dispatch semantics | Pointer snapshots additions (as gamepad A3 will); B1 proposes that removals take effect at once, as in the DOM. One rule for all three plugins |
| Cancelled input | How a release caused by blur, hiding, `stop*()`, or `touchcancel` is marked in the data (B3, B5), and whether keyboard and gamepad releases on blur use the same marker |
| Callback data | Pointer callbacks get per-event objects; gamepad passes the live pad object. B7 proposes one pointer data shape |
| Auto-start | Reads and handler registration start tracking, but not after an explicit stop; the same question as gamepad |
| Return shapes and allocation | `inmouse()` and `inpress()` return new objects each call; gamepad A7 proposes live objects (B13) |
| Settings names | `setEnableContextMenu( isEnabled )` against `setPinchZoom( isEnabled )`, one screen command and one global |
| Error codes | Pointer throws `Error` with `INVALID_MODE`, `INVALID_FUNCTION`, `INVALID_HITBOX`, and `TypeError` with `OFFSCREEN_INPUT_UNSUPPORTED`; gamepad throws `TypeError` with `INVALID_PARAMETERS` |
| Global handlers and `clearEvents` | Pointer handlers are per screen; `clearEvents( "press" )` also clears clicks |

## 9. Review Decisions

The maintainer marks each item accepted, rejected, or deferred (plan §5.6). Decisions
recorded 2026-09-25.

| ID | Summary | Decision | Notes |
| --- | --- | --- | --- |
| PTR-001 | Removing a handler can disable all handlers of that type | Accepted | P1. Reachable through the on-screen keyboard. Fixed by B1 |
| PTR-002 | Touch end reports the touches still down | Accepted | Fixed by B3 |
| PTR-003 | Press and click follow the first touch | Accepted | Fixed by B4 |
| PTR-004 | Release outside the canvas lost | Accepted | Confirmed with trusted input and in Chrome 153. Fixed by B5/B6 |
| PTR-005 | Click listeners stay armed; cancelled touches click | Accepted | Confirmed with trusted input and in Chrome 153 (mouse part). Fixed by B3/B4 |
| PTR-006 | A throwing handler breaks the rest of the event | Accepted | Fixed by B2 |
| PTR-007 | Blur resets polling without telling handlers | Accepted | Confirmed in Chrome 153, where the button was still held at blur. Fixed by B5 |
| PTR-008 | `onclick` fires for right and middle buttons | Accepted | Confirmed with trusted input and in Chrome 153. Fixed by B4 |
| PTR-009 | `once` removes other registrations; removed handlers run | Accepted | Fixed by B1 |
| PTR-010 | Stop commands keep held state | Accepted | Fixed by B5 |
| PTR-011 | Border and padding points map outside the screen | Accepted | Confirmed in Chrome 153 (x -4 to 203, y -5 to 153). Fixed by B8 |
| PTR-012 | Settings and hit boxes not validated consistently | Accepted | Fixed by B8/B9 |
| PTR-013 | Press, touch, and click data disagree | Accepted | Fixed by B7 (breaking) |
| PTR-014 | Pinch zoom page-wide; context menu suppressed late | Accepted | Fixed by B10 (breaking) |
| PTR-015 | Metadata, declarations, `API.md` gaps | Accepted | Metadata and declarations in the roadmap; `API.md` in R.2 |
| PTR-016 | Manual pointer pages do not load cleanly | Accepted | Roadmap Phase 1 |
| PTR-017 | Missing automated tests | Accepted | Roadmap Phase 1, Section 5.2 |
| B1–B5, B8, B9, B12 | Fixes | Accepted | Roadmap Phase 1. B8: presses that start on the border or padding are ignored |
| B6 | Pointer Events path | Accepted | Observable changes listed in the compatibility summary |
| B7 | One data shape | Accepted | Breaking |
| B10 | Per-screen gesture settings | Accepted | Breaking |
| B11 | Wheel input | Accepted | Additive, in 2.3.0; handler shape follows §6 |
| B13 | Allocation and live objects | Accepted | Decided in §6 |
