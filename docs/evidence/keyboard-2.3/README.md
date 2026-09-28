# Keyboard 2.3 Evidence

This folder holds measurements and reproductions for the 2.3 keyboard audit
([AUDIT-KEYBOARD.md](../../plans/v2.3/AUDIT-KEYBOARD.md)). It records:
- **Revision:** `cfc32a9`, measured 2026-09-24. The audit changed no library code or tests.
- **Machine:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0.
- **Browsers:** Playwright 1.56.0 with Chromium 141.0.7390.37, Firefox 142.0.1 and WebKit 26.0.
- **Units:** sizes are bytes of the minified IIFE bundle and its gzip level 9 compression.

## Files

| File | Contents |
| --- | --- |
| `size-baseline.json` | `npm run size -- --out=docs/evidence/keyboard-2.3/size-baseline.json` at the revision |
| `size-phase1.json` | The same command at the exit of keyboard Phase 1 (tasks 1.1–1.13), 2026-09-27 |
| `size-phase2.json` | The same command at the exit of keyboard Phase 2 (tasks 2.1–2.9), 2026-09-28 |
| `probes.js` | Reproductions K1–K20, run in Chromium, Firefox and WebKit against fresh in-memory bundles of the current source, plus a load check of the manual pages that load the keyboard plugin |
| `probes-output.json` | Observed and expected results per engine and probe, with page errors |
| `device-check.html` | A page for the physical-keyboard pass: Pi.js key state next to the browser's own key events, cancelled releases, and key handler calls during a prompt |

## Size baseline

| Bundle | Bytes | Gzip |
| --- | --- | --- |
| `keyboard` plugin 1.0.0 (standalone IIFE, includes `input()`) | 8,436 | 3,110 |
| `onscreen-keyboard` plugin 1.0.0 (standalone IIFE) | 6,876 | 2,606 |
| `pi.min.js` (Full, includes keyboard) | 208,078 | 72,604 |
| `pi.lite.min.js` (no keyboard) | 137,458 | 48,585 |

The standalone plugin is about 4.3% of `pi.min.js` by gzip size. `npm run size` has no
differential for the plugin's marginal cost inside the Full bundle; the standalone figure is
the upper bound.

## Size at Phase 1 exit

`size-phase1.json`, measured after keyboard tasks 1.1–1.13. The standalone plugin is still
1.0.0; Phase 1 changed no API.

| Bundle | Bytes | Gzip | Gzip change |
| --- | --- | --- | --- |
| `keyboard` plugin 1.0.0 (standalone IIFE) | 9,492 | 3,490 | +380 |
| `pi.min.js` (Full, includes keyboard) | 210,435 | 73,318 | +714 |
| `pi.lite.min.js` (no keyboard) | 138,765 | 48,947 | +362 |

The keyboard growth is the prompt's own key and paste listeners, its layout and numeric
patterns, held state by code, and release data. The Full change also includes core changes
since the baseline, which Lite shares (+362), so the keyboard's share of it is about 350 bytes.

## Size at Phase 2 exit

`size-phase2.json`, measured on the `keyboard-2` branch after keyboard tasks 2.1–2.9. The
standalone plugin is 2.0.0.

| Bundle | Bytes | Gzip | Gzip change from Phase 1 |
| --- | --- | --- | --- |
| `keyboard` plugin 2.0.0 (standalone IIFE) | 10,955 | 4,206 | +716 |
| `pi.min.js` (Full, includes keyboard) | 215,154 | 75,360 | +2,042 |
| `pi.lite.min.js` (no keyboard) | 138,765 | 48,947 | 0 |

The keyboard growth is cancelled releases and their listeners, the frozen list and one-snapshot
dispatch, validation with per-parameter codes, and the prompt's withheld keys. The Full change
also includes the pointer (+822 standalone) and gamepad (+594) Phase 1 work merged since the
Phase 1 measurement; Lite has no plugins and core did not change.

## Final size

The keyboard's final 2.3 size is the Phase 2 exit size above. Measured again on `main` at
`44d1fb1`, after the Phase 2 set landed and A16 was dropped, with the same command: every
figure in `size-phase2.json` matched, so no new file was recorded. The standalone plugin 2.0.0
is 10,955 bytes, 4,206 gzipped: 1,096 bytes more than the 3,110-byte baseline, of which Phase
1 added 380 and Phase 2 716.

## Probes

Run `node docs/evidence/keyboard-2.3/probes.js`. It needs no server and rewrites
`probes-output.json`.

Most probes open a fresh page, install the helpers in `installHelpers()`, load the bundle, and
dispatch `KeyboardEvent`s on `window` or on an element. Script-dispatched events reach the
plugin's capture listener exactly as browser input does, apart from `isTrusted`, which the
plugin does not read. Three probes use native input instead:
- **K1n and K9n** repeat K1 and K9 with Playwright's keyboard, which the browser treats as
  trusted input. K9n reads the scroll position after smooth scrolling settles.
- **K15** loads Full, `print-table` and `onscreen-keyboard`, and clicks the on-screen keys with
  Playwright's mouse at fixed positions of the `"text"` layout on a 400×280 `noCss` screen.

K19 runs on Lite alone and K19b on Lite with the standalone plugin (the K18 scenario).

A probe's `confirmed` flag is true when the observed behavior differs from the expected
contract. K18 and K19b are controls and are expected to be false; K19 records behavior only.

**Results:** all three engines give the same observations for every probe except K9n's scroll
distance (576 to 686 px; every engine scrolled) and the text of the error messages in K15.
Every manual page loaded by the check reports `DUPLICATE_PLUGIN` for keyboard in every engine.

## Device check

Synthetic events cannot show what a browser does with a real keyboard, layout switching, or an
input method editor. The user runs this pass on a physical keyboard; results are recorded below
and in the audit report, Section 6.3.

1. Run `npm run build` (if `build/` is stale), then `npm run server`.
2. Open `http://localhost:8080/docs/evidence/keyboard-2.3/device-check.html` in each browser
   available. Click the page background once so it has focus.
3. **Shift release order.** Hold Shift, press and hold A, release Shift, then release A. Then
   hold W, press Shift, release W, release Shift. Watch "Stuck key values".
4. **Focus change.** Hold D, press Alt+Tab to another window, release D there, wait two seconds,
   and return. Then hold D, Alt+Tab away and back while still holding D, and release it.
5. **Auto-repeat.** Hold F for two seconds. Compare the three repeat counters.
6. **Layouts.** Switch Windows to a French (AZERTY) or German (QWERTZ) layout. Press A, Q, Z, W,
   Y and the key right of L. With German, also press AltGr+Q (it types "@"). Switch back.
7. **Windows key.** Hold the Windows key, press and release E, then release the Windows key.
   Close the Explorer window that opens and return to the page. (This is the closest Windows
   check of the macOS problem where keyup is not sent for keys released while Meta is held.)
8. **Prompt keys.** Click **Start text input()**. Type `a b`, press Ctrl+V, press Tab, type `c`,
   press Enter. If Enter does nothing, click the page background, press Enter again, and note
   it. Note whether the page scrolled when Space was pressed.
9. **IME** (if a Japanese or Chinese input method is installed). Switch to it, click
   **Start text input()**, type `nihon`, choose a conversion, press Enter to commit, then press
   Enter again. Note what the prompt shows.
10. **Hidden tab.** Hold D, press Ctrl+Tab to another tab, release both keys there, and return.
11. Click **Copy results** and paste the JSON into the conversation.

**Results (2026-09-24),** Chrome 153 on Windows 11 with a US keyboard layout. Steps 6 and 9
were not run: no other layout or input method was available.

| Step | Chrome 153 |
| --- | --- |
| 3 | Stuck after release: `"A"` (Shift released first) at 15.5 s and `"w"` (Shift pressed during the hold) at 27.9 s |
| 4 | Pi.js held nothing 100 ms after each blur and nothing at each focus, including when D was held through the return |
| 5 | 202 browser repeats; `allowRepeat` handler 202; default handler 15 (the session's non-repeat presses) |
| 7 | Windows opened Explorer for Win+E; the page saw the Meta keydown only, then lost focus. No `metaKey` keydowns were recorded |
| 8 | Enter activated the "Start number input()" button that Tab had focused: a "Number:" prompt appeared (confirmed by the user) and the text prompt resolved `null`. After a click on the page, Enter resolved the number prompt with `0`. `scrollAfter` was 0 because focusing the button scrolled it into view |

The page's "Browser held" record learns releases only from keyup events, so it is stale after
a blur: its `rawHeld` samples at later blurs and focuses still list D and Alt.

### Release pass

The keyboard's manual release check, from
[ROADMAP §8.3](../../plans/v2.3/ROADMAP.md#83-manual-release-checks), run after the Phase 2 set
landed. Run steps 3–5, 8, and 10 in Chrome, Firefox, and Safari;
step 6 with any non-US layout available; and step 9 if an input method is installed. On macOS,
replace step 7 with: hold Cmd, press and release A, then release Cmd, in Chrome and Safari.
Record the results here.

Expected results:
- **Step 3:** no stuck key values (A1).
- **Step 4:** Pi.js holds nothing after each blur, and "Cancelled releases" lists the keys held
  at each blur (I6).
- **Step 5:** the `allowRepeat` counter follows the browser's repeats; the default counter does
  not.
- **Step 6:** codes name physical positions and values follow the layout; AltGr+Q types "@" in
  the prompt (A3).
- **Step 7 on macOS:** a key released while Cmd is held may stay held until the window loses
  focus. This is the audit's open macOS Meta item, a platform limit, so record the result
  rather than fail it.
- **Step 8:** Space does not scroll, Tab does not move focus, Ctrl+V pastes, Enter resolves the
  text, and "Key handler calls during input()" stays 0 (A3, A11).
- **Step 9:** no key stays held. Composed text is not supported (A16 was dropped), so the
  prompt may not show it.
- **Step 10:** "Cancelled releases" lists D and Ctrl, the keys held when the tab was hidden
  (I6).
