# Gamepad 2.3 Evidence

This folder holds measurements and reproductions for the 2.3 gamepad audit
([AUDIT-GAMEPAD.md](../../plans/v2.3/AUDIT-GAMEPAD.md)). It records:
- **Revision:** `b37e9b8`, measured 2026-09-24. The audit changed no library code or tests.
- **Machine:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0.
- **Browsers:** Playwright 1.56.0 with Chromium 141.0.7390.37, Firefox 142.0.1 and WebKit 26.0.
- **Units:** sizes are bytes of the minified IIFE bundle and its gzip level 9 compression.

## Files

| File | Contents |
| --- | --- |
| `size-baseline.json` | `npm run size -- --out=docs/evidence/gamepad-2.3/size-baseline.json` at the revision |
| `size-phase1.json` | The same command at the exit of gamepad Phase 1 (tasks 1.1–1.7), 2026-09-28 |
| `size-phase2.json` | The same command at the exit of gamepad Phase 2 (tasks 2.1–2.6), 2026-09-28 |
| `size-final.json` | The same command on `main` at `9ba0a7b`, after Phase 3 tasks 3.1–3.2, 2026-09-29 |
| `probes.js` | Reproductions P1–P14b (including P3b and P5b), run in Chromium, Firefox and WebKit against fresh in-memory bundles of the current source, plus a load check of the manual gamepad pages |
| `probes-output.json` | Observed and expected results per engine and probe, with page errors |
| `device-check.html` | A page for the physical-controller pass: Pi.js state next to the browser's own Gamepad API |

## Size baseline

| Bundle | Bytes | Gzip |
| --- | --- | --- |
| `gamepad` plugin 1.0.0 (standalone IIFE) | 4,006 | 1,428 |
| `pi.min.js` (Full, includes gamepad) | 208,078 | 72,604 |
| `pi.lite.min.js` (no gamepad) | 137,458 | 48,585 |

The standalone plugin is about 2.0% of `pi.min.js` by gzip size. `npm run size` has no
differential for the plugin's marginal cost inside the Full bundle; the standalone figure is
the upper bound.

## Size at Phase 1 exit

`size-phase1.json`, measured after gamepad tasks 1.1–1.7. The standalone plugin is still 1.0.0;
Phase 1 changed no API.

| Bundle | Bytes | Gzip | Gzip change |
| --- | --- | --- | --- |
| `gamepad` plugin 1.0.0 (standalone IIFE) | 5,590 | 2,022 | +594 |
| `pi.min.js` (Full, includes gamepad) | 213,654 | 74,713 | +2,109 |
| `pi.lite.min.js` (no gamepad) | 138,765 | 48,947 | +362 |

The gamepad growth is the separate per-pad state with accumulated edges, the in-place updates
of live pads and the list, the page-visibility release, isolated dispatch with once-per-pad
connect delivery and replay, and the listeners added on the first start. The Full change also
includes keyboard and pointer Phase 1 and core changes since the baseline; Lite has not changed
since pointer Phase 1 exit (48,947), so gamepad Phase 1 added 539 bytes to Full (74,174 to
74,713).

## Size at Phase 2 exit

`size-phase2.json`, measured on the `gamepad-2` branch after gamepad tasks 2.1–2.6. The
standalone plugin is 2.0.0.

| Bundle | Bytes | Gzip | Gzip change from Phase 1 |
| --- | --- | --- | --- |
| `gamepad` plugin 2.0.0 (standalone IIFE) | 6,871 | 2,576 | +554 |
| `pi.min.js` (Full, includes gamepad) | 221,163 | 77,401 | +2,688 |
| `pi.lite.min.js` (no gamepad) | 141,180 | 49,675 | +728 |

The gamepad growth is `onGamepad` and `offGamepad` with per-mode registrations, `once`, and
the removal forms; the stop that releases pads and the restart that catches up with
connections; the return shapes; validation with per-parameter codes; and the radial stick dead
zone. The Full change also includes keyboard Phase 2, pointer Phases 2 and 3, and the core tasks
merged since the Phase 1 measurement, which Lite's +728 reflects. Against the pointer's final
measurement (76,928), where Lite was already 49,675, gamepad Phase 2 added 473 bytes to Full.

## Final size

`size-final.json`, measured on `main` at `9ba0a7b`, after the Phase 2 set landed and Phase 3
added standard names (3.1) and vibration (3.2). The standalone plugin is 2.0.0.

| Bundle | Bytes | Gzip | Gzip change from Phase 2 |
| --- | --- | --- | --- |
| `gamepad` plugin 2.0.0 (standalone IIFE) | 8,478 | 3,090 | +514 |
| `pi.min.js` (Full, includes gamepad) | 222,779 | 77,905 | +504 |
| `pi.lite.min.js` (no gamepad) | 141,180 | 49,675 | 0 |

The growth is the standard-mapping names (+192) and `vibrateGamepad()` with its validation
(+322), above the task estimate of under 150 bytes. The standalone plugin is 1,662 bytes more
than the 1,428-byte baseline, of which Phase 1 added 594, Phase 2 554, and Phase 3 514.

## Probes

Run `node docs/evidence/gamepad-2.3/probes.js`. It needs no server and rewrites
`probes-output.json`.

Each probe opens a fresh page and installs the mocks before loading the bundle:
- `navigator.getGamepads()` returns fresh snapshots of scripted pads, as browsers do.
- `requestAnimationFrame` queues callbacks; `__gp.frame()` runs the queue once, in
  registration order, which is how browsers order callbacks within a frame.
- `gamepadconnected` and `gamepaddisconnected` are `Event` objects with a `gamepad` property,
  dispatched on `window`.

A probe's `confirmed` flag is true when the observed behavior differs from the expected
contract. P8 and P11 record behavior for the inventory; their flag marks behavior the audit
reports as an API finding, not a defect. P14b is a control and is expected to be false.

**Results:** all three engines give the same observations for every probe. The only
difference is the text of uncaught listener errors in P5 (WebKit reports `Script error.` for
errors thrown inside inline page functions). Every manual gamepad page reports
`DUPLICATE_PLUGIN` in every engine.

## Device check

Synthetic events cannot show what a browser does with a real controller. The user runs this
pass with a physical controller; results are recorded below and in the audit report,
Section 6.

1. Run `npm run build` (if `build/` is stale), then `npm run server`.
2. Open `http://localhost:8080/docs/evidence/gamepad-2.3/device-check.html` in each browser
   available, with the controller already plugged in and **before touching it**. Note whether
   "Pads (browser)" shows a pad (the privacy gate).
3. Press button 0 (the bottom face button) once. Compare the "Pi connect" and "Browser
   gamepadconnected" log lines: one each is correct.
4. Click **Reset counters**, then press button 0 exactly 20 times at a steady pace, some fast
   taps included. Compare the three press counters with 20.
5. Hold button 0, click another window (or DevTools) so the page loses focus, release the
   button, wait two seconds, and click back into the page. The log records Pi.js and browser
   state at each step.
6. Move the left stick slowly around a small circle near the center, then along the
   diagonals. The "outside 0.2 radius / Pi.js centered" counter shows frames where the stick
   is past a 0.2 radial dead zone but Pi.js reports it centered.
7. Unplug or switch off the controller, then reconnect it. Note the indices in the log. With a
   second controller, connect both, disconnect the first, and reconnect it.
8. Click **Rumble pad 0** and note whether the controller vibrates.
9. Click **Copy results** and paste the JSON into the conversation.

**Results (2026-09-24),** Windows 11, 100 Hz display, Xbox One controllers (standard
mapping). Chrome 153 used two controllers and ran every step. Firefox 156 used one controller
and ran every step except step 5 without a held button.

| Step | Chrome 153 | Firefox 156 |
| --- | --- | --- |
| 2–3 | Both pads appeared on the first press, 4.7 s after load; one Pi.js call per browser event | The pad appeared on the first press, 5.0 s after load; one Pi.js call per browser event |
| 4 | Browser 26 presses. Pi.js every frame: 25 presses, 26 releases. 30 Hz timer: 1 press, 4 releases | Browser 22 presses. Pi.js every frame: 21 presses, 22 releases. 30 Hz timer: 8 presses, 6 releases |
| 5 | Held at blur: 70 ms later, page still visible, the browser reported released and Pi.js pressed; Pi.js stayed pressed through focus. The page went hidden 120 ms after each blur | Held at blur: the page stayed visible; the browser reported held at 0.7 s and released at 1.7 s; Pi.js stayed pressed through focus |
| 6 | Past a 0.2 radius on 444 frames; Pi.js centered on 1 | Past a 0.2 radius on 231 frames; Pi.js centered on 4 |
| 7 | With pad 1 connected, pad 0 reconnected as index 0, with no press needed | Pad 0 reconnected as index 0 |
| 8 | `vibrationActuator` with `effects: [ "dual-rumble" ]`; `playEffect` returned `"complete"` and the controller vibrated | Neither `vibrationActuator` nor `hapticActuators`; nothing vibrated |

The `id` of the same controller was `"Xbox One Game Controller (STANDARD GAMEPAD)"` in Chrome
and `"xinput"` in Firefox. The every-frame loop's missing press matches probe P3b: the press
that exposes a pad is never reported as just pressed. Safari was not checked.

### Release pass

The gamepad's manual release check, from
[ROADMAP §8.3](../../plans/v2.3/ROADMAP.md#83-manual-release-checks), run after the Phase 2 set
landed, on `device-check.html` as it is now. Run every step in Chrome and Firefox with a
standard-mapping controller, and in Safari if macOS hardware is available; step 6's second
part needs two controllers. Then click **Copy results** and record the results here.

1. Open the page with the controller plugged in and before touching it, then press the south
   (bottom face) button once.
2. Click **Reset counters**, then press south exactly 20 times at a steady pace, some fast taps
   included.
3. Hold south, click another window so the page loses focus, release the button, wait two
   seconds, and click back into the page.
4. Hold south, switch tabs with Ctrl+Tab while holding it, and return to the tab still holding
   it; then release.
5. Click **Reset counters**. Move the left stick slowly around a small circle near the center,
   then along the diagonals, then push it fully into each diagonal.
6. Unplug or switch off the controller, then reconnect it. With a second controller, connect
   both, disconnect the first, and reconnect it.
7. Click **Stop polling**. Press south, then unplug the controller and plug it back in, and
   press south again. Click **Start polling**.
8. Hold south and move the left stick; read the "By name" row.
9. Click **vibrateGamepad pad 0**.

Expected results:
- **Step 1:** one "Pi connect" line for each "Browser gamepadconnected" line, and "Pads (Pi.js)"
  matches "Pads (browser)" (A4, PAD-005, PAD-006).
- **Step 2:** the browser and the Pi.js every-frame counter both count 20 presses (A1,
  PAD-001). The 30 Hz timer reads in the same frames as the every-frame loop, and every read in
  a frame sees the same result, so it counts only the presses of the frames it reads; a game
  with one loop, at any rate, sees every press.
- **Step 3:** the Pi.js pressed state follows the browser's while the page is visible, with no
  release reported at the blur (A2, PAD-002).
- **Step 4:** the visibility sample taken when the tab is hidden shows Pi.js released; after the
  return, south reads pressed but not just pressed (A2, I6).
- **Step 5:** "Stick frames outside 0.2 radius / Pi.js centered" keeps its second number at 0,
  and "Left stick distance" reaches about 1 in a full diagonal (A9, PAD-011).
- **Step 6:** each browser connection and disconnection has one matching Pi.js line, and a
  reconnected pad keeps its index.
- **Step 7:** while stopped, "Pads (Pi.js)" is empty and no Pi.js connect or disconnect line
  appears; **Start polling** logs the disconnect and connect that happened while stopped, and
  the presses made while stopped are not counted (I5, I6).
- **Step 8:** "south pressed" is true while held, and `leftX` and `leftY` match the "Left
  stick: Pi.js" row (A10, I13).
- **Step 9:** Chrome and Safari vibrate and log `true`; Firefox logs `false` and nothing
  vibrates (A11).
