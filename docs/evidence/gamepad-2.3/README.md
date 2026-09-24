# Gamepad 2.3 Evidence

This folder holds measurements and reproductions for the 2.3 gamepad audit
([GAMEPAD-V2.3-AUDIT.md](../../plans/GAMEPAD-V2.3-AUDIT.md)). It records:
- **Revision:** `b37e9b8`, measured 2026-09-24. The audit changed no library code or tests.
- **Machine:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0.
- **Browsers:** Playwright 1.56.0 with Chromium 141.0.7390.37, Firefox 142.0.1 and WebKit 26.0.
- **Units:** sizes are bytes of the minified IIFE bundle and its gzip level 9 compression.

## Files

| File | Contents |
| --- | --- |
| `size-baseline.json` | `npm run size -- --out=docs/evidence/gamepad-2.3/size-baseline.json` at the revision |
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
