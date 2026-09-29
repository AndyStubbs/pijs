# Pointer 2.3 Evidence

This folder holds measurements and reproductions for the 2.3 pointer audit
([AUDIT-POINTER.md](../../plans/v2.3/AUDIT-POINTER.md)). It records:
- **Revision:** `cfc32a9`, measured 2026-09-24. The audit changed no library code or tests.
- **Machine:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0.
- **Browsers:** Playwright 1.56.0 with Chromium 141.0.7390.37, Firefox 142.0.1 and WebKit 26.0.
- **Units:** sizes are bytes of the minified IIFE bundle and its gzip level 9 compression.

## Files

| File | Contents |
| --- | --- |
| `size-baseline.json` | `npm run size -- --out=docs/evidence/pointer-2.3/size-baseline.json` at the revision |
| `size-phase1.json` | The same command at the exit of pointer Phase 1 (tasks 1.1–1.9), 2026-09-27 |
| `size-phase2.json` | The same command at the exit of pointer Phase 2 (tasks 2.1–2.8), 2026-09-28 |
| `size-final.json` | The same command on `main` at `603ef3f`, after Phase 3 task 3.1, 2026-09-28 |
| `probes.js` | Reproductions P1–P17 and T1, run in Chromium, Firefox and WebKit against fresh in-memory bundles of the current source, plus a load check of the manual pointer pages |
| `probes-output.json` | Observed and expected results per engine and probe, with page errors |
| `device-check.html` | A page for the manual device passes: Pi.js state next to the browser's own pointer events for the mouse, pens, and touches, with cancelled releases, the wheel, the context menu, and pinch zoom (mouse events before Pointer 2.2) |

## Size baseline

| Bundle | Bytes | Gzip |
| --- | --- | --- |
| `pointer` plugin 1.0.0 (standalone IIFE) | 12,738 | 3,951 |
| `pi.min.js` (Full, includes pointer) | 208,078 | 72,604 |
| `pi.lite.min.js` (no pointer) | 137,458 | 48,585 |

The standalone plugin is about 5.4% of `pi.min.js` by gzip size. It carries its own copy of
`src/core/canvas-layout.js`, which the Full bundle shares with core, so the standalone figure
is an upper bound on the plugin's marginal cost inside Full.

## Size at Phase 1 exit

`size-phase1.json`, measured after pointer tasks 1.1–1.9. The standalone plugin is still 1.0.0;
Phase 1 changed no API.

| Bundle | Bytes | Gzip | Gzip change |
| --- | --- | --- | --- |
| `pointer` plugin 1.0.0 (standalone IIFE) | 14,240 | 4,773 | +822 |
| `pi.min.js` (Full, includes pointer) | 212,018 | 74,174 | +1,570 |
| `pi.lite.min.js` (no pointer) | 138,765 | 48,947 | +362 |

The pointer growth is per-touch tracking and the primary touch's press record, per-pointer
click arming, the window release listener and held-button tracking, the releases for a hidden
page and the stop commands, dispatch isolation, and the checks for presses on the border. The
Full change also includes keyboard Phase 1 and core changes since the baseline; Lite has not
changed since keyboard Phase 1 exit (48,947), so pointer Phase 1 added 856 bytes to Full
(73,318 to 74,174).

## Size at Phase 2 exit

`size-phase2.json`, measured on the `pointer-2` branch after pointer tasks 2.1–2.8. The
standalone plugin is 2.0.0.

| Bundle | Bytes | Gzip | Gzip change from Phase 1 |
| --- | --- | --- | --- |
| `pointer` plugin 2.0.0 (standalone IIFE) | 14,573 | 5,056 | +283 |
| `pi.min.js` (Full, includes pointer) | 218,422 | 76,528 | +2,354 |
| `pi.lite.min.js` (no pointer) | 141,180 | 49,675 | +728 |

The pointer growth is the Pointer Events listeners with pointer capture, the frozen per-event
data and press records, the removal forms and duplicate check, the per-screen gesture settings,
and validation with per-parameter codes; the touch-event and window-release code they replace
is gone. The Full change also includes keyboard Phase 2 (+716 standalone), gamepad Phase 1
(+594), and the core tasks merged since the Phase 1 measurement, which Lite's +728 reflects.

## Final size

`size-final.json`, measured on `main` at `603ef3f`, after the Phase 2 set landed and Phase 3
task 3.1 added wheel input. The standalone plugin is 2.0.0.

| Bundle | Bytes | Gzip | Gzip change from Phase 2 |
| --- | --- | --- | --- |
| `pointer` plugin 2.0.0 (standalone IIFE) | 15,984 | 5,440 | +384 |
| `pi.min.js` (Full, includes pointer) | 219,833 | 76,928 | +400 |
| `pi.lite.min.js` (no pointer) | 141,180 | 49,675 | 0 |

The growth is wheel input (B11): `onWheel` and `offWheel`, delta normalization, and the canvas
listener that is added and removed with the screen's wheel handlers. It is above the 200–300
byte estimate. The standalone plugin is 1,489 bytes more than the 3,951-byte baseline, of which
Phase 1 added 822, Phase 2 283, and Phase 3 384.

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

### Release pass

The pointer's manual release check, from
[ROADMAP §8.3](../../plans/v2.3/ROADMAP.md#83-manual-release-checks), run after the Phase 2 set
landed, on `device-check.html` as it is now. Run steps 1–8 with a mouse in Chrome, Firefox, and
Safari; steps 9–12 on a phone or tablet in Chrome and Safari; and step 13 with a pen, if one is
available. After each step, press its number key, or set **Step** and click **Record step** on
a touch device. Then click **Copy results** and record the results here.

1. Open the page. Before any other input, right-click the canvas.
2. Click **Reset counters**. Press the left button inside the canvas, drag off the canvas and
   off the page area, and release there.
3. Click **Reset counters**. Right-click, then middle-click, inside the green box. Press inside
   the box, drag out of it, and release; press outside it, drag in, and release.
4. Hold the left button over the canvas, switch windows with Alt+Tab, release the button there,
   and click back into the page title bar.
5. Hold the left button over the canvas, switch tabs with Ctrl+Tab while holding it, release,
   and return to the tab.
6. Click **Reset counters**. Turn the wheel over the canvas a few notches, and scroll with two
   fingers on a trackpad, if one is available. Click **Remove wheel handler** and do the same
   again.
7. Click **Enable context menu** and right-click the canvas.
8. Click **Reset counters**, then move the mouse slowly across all four edges of the canvas,
   over the border.
9. Click **Reset counters**. Tap inside the green box with one finger. Then put one finger
   down in the box, a second finger down in the box, and lift the second before the first.
10. Touch the canvas, drag the finger off the canvas and off the page area, and lift it there.
11. Touch the canvas and, with the finger still down, start a system gesture: swipe from the
    screen edge to go back or to switch apps. Return to the page.
12. Pinch on the canvas. Click **Enable pinch zoom** and pinch again. Long-press the canvas,
    and double-tap it.
13. Draw on the canvas with the pen.

Expected results:
- **Step 1:** "Context menu on canvas" is 1 / 1: the menu is suppressed from screen creation,
  before any mouse tracking (B10, PTR-014).
- **Step 2:** the browser counts 1 up outside the canvas, and Pi.js 1 mouse up and 1 press up;
  both report buttons 0 afterward (PTR-004).
- **Step 3:** 0 Pi.js clicks: right and middle buttons do not click, and a click needs its
  press and release inside the box (PTR-005, PTR-008).
- **Step 4:** at the blur the Pi.js buttons stay 1, as the browser's do, and the up handlers run
  when the release arrives, with no cancelled release (PTR-007).
- **Step 5:** "Cancelled releases" counts 1 mouse and 1 press, dispatched when the tab was
  hidden, and no click (I6).
- **Step 6:** with the handler, the Pi.js wheel count follows the browser's, the delta sum is in
  pixels, and "Page scrollY" does not change; without it, the Pi.js count stays and the page
  scrolls (B11).
- **Step 7:** the context menu opens, and the prevented count does not grow.
- **Step 8:** the move range reaches past 0..199 / 0..149 over the border: true positions, as
  in the audit results above.
- **Step 9:** the Pi.js touch downs and ups match the browser's, and each finger clicks on its
  own: "by" lists each touch (PTR-002, PTR-003).
- **Step 10:** the page does not scroll, Pi.js counts one touch up, and no touch stays held.
- **Step 11:** if the browser cancels the touch, its cancel count and the Pi.js touch
  cancelled count match, and no click fires (PTR-005). Some systems end the touch instead;
  record which.
- **Step 12:** "Canvas touch-action" reads none, then pinch-zoom; the first pinch does not zoom
  the page and the second does (PTR-014). The long press opens no menu. Record whether the
  double-tap zooms, especially on iOS.
- **Step 13:** "Pi inMouse" reports type pen while the pen draws.

### Release pass results

The maintainer ran the pass on 2026-09-29 on Windows 11 and reported the results in the conversation; browser versions and the pages' copied JSON were not recorded. Steps 9–12 ran on an Android phone in Chrome, from an HTTPS test site.

| Steps | Chrome (Windows) | Firefox (Windows) | Chrome (Android) |
| --- | --- | --- | --- |
| 1–8: mouse, including the context menu from creation, a release outside the canvas, a hidden tab, and the wheel | Pass | Pass | — |
| 9–12: taps and two-finger clicks, a drag off the canvas, a system gesture, pinch zoom off and on, long press, double-tap | — | — | Pass |

Not available: Safari (no macOS hardware), iOS touch and double-tap zoom (no iOS device), and
a pen (step 13).
