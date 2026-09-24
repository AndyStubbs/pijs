# Pointer 2.3 Evidence

This folder holds measurements and reproductions for the 2.3 pointer audit
([POINTER-V2.3-AUDIT.md](../../plans/POINTER-V2.3-AUDIT.md)). It records:
- **Revision:** `cfc32a9`, measured 2026-09-24. The audit changed no library code or tests.
- **Machine:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0.
- **Browsers:** Playwright 1.56.0 with Chromium 141.0.7390.37, Firefox 142.0.1 and WebKit 26.0.
- **Units:** sizes are bytes of the minified IIFE bundle and its gzip level 9 compression.

## Files

| File | Contents |
| --- | --- |
| `size-baseline.json` | `npm run size -- --out=docs/evidence/pointer-2.3/size-baseline.json` at the revision |
| `probes.js` | Reproductions P1–P17 and T1, run in Chromium, Firefox and WebKit against fresh in-memory bundles of the current source, plus a load check of the manual pointer pages |
| `probes-output.json` | Observed and expected results per engine and probe, with page errors |
| `device-check.html` | A page for the manual mouse pass: Pi.js state next to the browser's own mouse events |

## Size baseline

| Bundle | Bytes | Gzip |
| --- | --- | --- |
| `pointer` plugin 1.0.0 (standalone IIFE) | 12,738 | 3,951 |
| `pi.min.js` (Full, includes pointer) | 208,078 | 72,604 |
| `pi.lite.min.js` (no pointer) | 137,458 | 48,585 |

The standalone plugin is about 5.4% of `pi.min.js` by gzip size. It carries its own copy of
`src/core/canvas-layout.js`, which the Full bundle shares with core, so the standalone figure
is an upper bound on the plugin's marginal cost inside Full.

## Probes

Run `node docs/evidence/pointer-2.3/probes.js`. It needs no server and rewrites
`probes-output.json`.

Each probe opens a fresh page, loads the Full bundle (P16: Lite, then a screen, then the
standalone plugin; P17: Full plus `print-table` and `onscreen-keyboard`), creates a 100x100
screen, and dispatches events on its canvas:
- Mouse events are `MouseEvent` objects aimed at the center of a logical pixel.
- Touch events are `Event` objects with `touches`, `targetTouches` and `changedTouches` lists of
  plain `{ identifier, clientX, clientY, target }` objects. That is everything the plugin
  reads, and it works in every engine; desktop Firefox and WebKit have no `Touch` constructor.
- T1 repeats the mouse scenarios of P4, P5 and P8 with Playwright's trusted mouse input, so the
  browser itself chooses the event targets, including a release outside the canvas and its
  own `contextmenu` event.

A probe's `confirmed` flag is true when the observed behavior differs from the expected
contract. P15 records behavior for the inventory and is never flagged. P16 is a control and is
expected to be false.

**Results:** all three engines give the same observations for every probe, trusted input
included. The manual pages `contextmenu_01`, `clearevents_01` and `events_comprehensive` report
`registerPlugin: Plugin '…' is already registered` in every engine, and `ontouch_03` reports
that `$.render` is not a function.

## Device check

Synthetic events cannot show everything a browser does with a real mouse, such as focus
changes and the wheel. The user runs this pass with a mouse; no touch hardware was available
for the audit, so the touch checks are listed as open for the release pass (R.7).

1. Run `npm run build` (if `build/` is stale), then `npm run server`.
2. Open `http://localhost:8080/docs/evidence/pointer-2.3/device-check.html` in each browser
   available. The canvas has an 8 px border; the green rectangle is the click box.
3. Press the left button inside the canvas, drag off the canvas and off the page area, and
   release there. Compare the "Up" row with the browser's count, and the Pi.js buttons with
   the browser's. Press **2** to record the step.
4. Click **Reset counters**. Right-click once inside the green box, then middle-click once
   inside it. Note whether Pi clicks increased and whether the context menu appeared. Press
   **3**.
5. Click **Reset counters**. Press inside the green box, drag out of it (staying on the
   canvas), and release. Then press outside the box, drag into it, and release. Note the Pi
   click count (0 is correct). Press **4**.
6. Hold the left button over the canvas, switch windows with Alt+Tab (or click another
   window), release the button there, wait two seconds, and click back into the page title
   bar. The log records Pi.js and browser state at each focus change. Press **5**.
7. Scroll the wheel over the canvas a few notches. Note whether the page scrolls. Press **6**.
8. Right-click on the canvas. Click **Enable context menu** and right-click again. Press **7**.
9. Click **Reset counters**, then move the mouse slowly across all four edges of the canvas,
   over the border. Note the "Move range" row (0..199 / 0..149 is in range). Press **8**.
10. Click **Copy results** and paste the JSON into the conversation.

**Results (2026-09-24),** Windows 11, Chrome 153, mouse. The 200x150 screen is shown at
400x300 CSS pixels, so the 8 px border is 4 logical pixels. Firefox was not run.

| Step | Chrome 153 |
| --- | --- |
| 3 | Browser: 1 up, outside the canvas, buttons 0. Pi.js: 0 mouse ups, 0 press ups, buttons 1 |
| 4 | Right and middle click in the box: 2 Pi.js clicks at the same point, `buttons: 0` (from the log; not recorded with key 3) |
| 5 | Down in, up out, then down out, up in: 1 Pi.js click, for the second press |
| 6 | At blur: page visible, browser buttons 1, Pi.js buttons 0 with no up dispatched. Pi.js up handlers ran later, when the browser delivered the release to the canvas, before focus returned |
| 7 | 7 wheel events over the canvas; Pi.js has no wheel input |
| 8 | Context menu prevented by default (1), shown after enabling (1) |
| 9 | Border moves: x -4 to 203, y -5 to 153, against 0–199 and 0–149 |

An earlier blur without a held button hid the page 25 ms later; Pi.js and the browser agreed.
