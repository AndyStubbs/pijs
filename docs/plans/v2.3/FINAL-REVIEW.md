# Pi.js 2.3 Final Release Review

## Overall summary

Reviewed release **2.3.0**, commit `ff99936f2e4c3c8aa8b17bc85576441fab635fdd`, on
2026-09-29, including unchanged shipping code and changes since `v2.2.0`. The complete
correctness workflow, supplementary checks, production build, and packaged release smoke tests
passed. Five reproducible defects remain; I recommend correcting them before release. Two concern
input lifecycle handling, two concern image registration/slicing, and one concerns music callback
timing during audio suspension. Verification was performed on Windows; fresh Linux/macOS,
Safari/iOS, physical-device, and manual listening coverage is outside this review's results.

## Suggested fixes

1. **[P2] Stop pointer dispatch safely when a handler stops tracking or removes its screen.**
   Current dispatch can deliver `null` or throw after valid mouse, touch, and wheel callbacks.
   [Details](#fix-1).
2. **[P2] Preserve the active input prompt when releasing held keys starts another prompt.**
   The outer request throws and clears the replacement prompt's active state.
   [Details](#fix-2).
3. **[P2] Reject negative spritesheet margins before loading or slicing.**
   A zero or negative grid step creates a nonterminating loop.
   [Details](#fix-3).
4. **[P2] Allocate unused names for automatically named images.**
   An unnamed screen capture can silently replace an explicitly named image.
   [Details](#fix-4).
5. **[P2] Keep music callbacks queued while the audio clock is suspended.**
   Chromium dispatches future notes using an output timestamp that stopped advancing.
   [Details](#fix-5).

P2 denotes a confirmed, scenario-dependent correctness defect requiring a normal-priority fix.
The numbers above identify the corresponding detailed items below.

## Fix 1

**Stop pointer dispatch safely after lifecycle changes in callbacks.**

**Impact and evidence.** Removing a screen from its mouse or touch `"down"` handler produces an
uncaught `TypeError` reading `down` from `null`. Removing it from a wheel handler produces an
uncaught error reading `wheel` from `null`. Calling `stopMouse()` or `stopTouch()` instead causes
the subsequent press `"down"` callback to receive `null`, contrary to the pointer-data contract.
With a press hit box, the mouse case throws while reading `null.x` before invoking the handler.
These are ordinary event-driven screen transitions and tracking controls, not invalid arguments.

Real Playwright mouse clicks reproduced all three mouse variants in the fresh production Full
and Lite bundles, both minified and unminified; Lite loaded the standalone pointer plugin.
Playwright touch taps and wheel input reproduced the touch and wheel variants against the packed
Full release. The existing correctness suite passes despite these failures.

**Reproduction.** In a fresh Full page, create an onscreen `320x200` screen as `s` and run:

```javascript
s.onMouse( "down", () => s.stopMouse() );
s.onPress( "down", data => console.log( data ) );
```

Click the canvas. The press callback logs `null`. Add a hit box as the fourth `onPress()` argument,
`{ "x": 0, "y": 0, "width": 320, "height": 200 }`, with `false` as the third argument:
the same click instead raises `Cannot read properties of null (reading 'x')`.

In separate fresh pages, `s.onMouse( "down", () => s.removeScreen() )` raises the `down` error,
and `s.onWheel( () => s.removeScreen() )` raises the `wheel` error. The equivalent touch handler
using `onTouch( "down", ... )` reproduces the stop/removal failures with a tap.

**Cause and references.**
[mouse.js:286-290](../../../plugins/pointer/mouse.js#L286) invokes user mouse handlers and then
reads mutable screen state for the press/click phases. `stopMouse()` clears `screenData.press`;
screen removal clears the listener collections and canvas. The resumed dispatch checks neither
condition. The same sequence occurs in
[touch.js:280-285](../../../plugins/pointer/touch.js#L280).
[wheel.js:133-134](../../../plugins/pointer/wheel.js#L133) calls `updateListener()` after the
user handler; [its line 90](../../../plugins/pointer/wheel.js#L90) dereferences the collection that
screen removal has cleared. This item consolidates these manifestations of the same lifecycle
problem.

**Recommended correction.** Recheck screen lifetime and the relevant tracking state after each
user-callback phase. End an invalidated dispatch before reading cleared collections, dispatching
press/click data, or capturing the pointer. Preserve the event's immutable data where dispatch
continues; do not read a replacement or cleared event from mutable screen state. Wheel listener
updates must tolerate screen removal.

**Regression verification.** Exercise stop/removal from mouse, touch, press, and wheel handlers
in Full and Lite. Assert no page errors, no null callback data, no post-removal callbacks, and no
click after cancellation. Cover hit-box and once handlers as well as normal callbacks.

## Fix 2

**Do not let an input request invalidate a newer prompt started during keyboard takeover.**

**Impact and evidence.** Starting `input()` while a key is held releases that key with
`cancelled: true`. If the release handler starts another prompt, the outer `input()` call throws
`inputData.reject is not a function`. The replacement promise then fails to complete when text
and Enter are entered. An asynchronous error, `Cannot read properties of null (reading 'isMock')`,
also occurs while finishing the partially initialized outer prompt. Minified builds report the
same missing `reject` function under their shortened variable names.

The failure was reproduced with real keyboard events against all four packed Full/Lite IIFE
variants; Lite loaded the keyboard plugin. This path was introduced by the 2.3 keyboard takeover
logic. The documented behavior is that a newer reentrant prompt supersedes the earlier request.

**Reproduction.** In a fresh Full page, after readiness, create a `320x200` screen as `s`:

```javascript
let nested;
$.onKey( "KeyA", "up", () => {
	nested = s.input( "Nested: " );
}, true );
```

Hold A using `page.keyboard.down( "a" )`, then call `s.input( "Outer: " )` through page
evaluation while A remains held. The call throws synchronously. Release A, type `hello`, and
press Enter: `nested` remains unsettled. The probe observed neither a value nor rejection after
these events, and the source trace explains why further typing cannot finish it.

**Cause and references.**
[input.js:169-176](../../../plugins/keyboard/input.js#L169) publishes the outer session and calls
`startInput()`. At [line 202](../../../plugins/keyboard/input.js#L202), `m_takeKeyboard()` runs
user key-release handlers. The nested `input()` cancels and releases the outer session;
[releaseInput():493-517](../../../plugins/keyboard/input.js#L493) nulls its screen and settlement
functions. The outer `startInput()` nevertheless resumes and tries to capture its background.
Its catch then unconditionally clears `m_inputData`, which now belongs to the nested prompt,
and calls the outer session's already-cleared `reject` function. The nested listeners remain,
but their active-session checks reject subsequent input. Cancellation also tries to redraw the
outer prompt before its background exists, explaining the asynchronous image error.

**Recommended correction.** Recheck session identity and disposal immediately after keyboard
takeover. A superseded request must stop initialization without touching the newer session.
Make partial-initialization cancellation safe before background capture, and have the catch path
clear/reject only a session it still owns, with settlement and cleanup performed once.

**Regression verification.** Hold a key, then start a prompt whose cancelled key-release handler
starts another prompt. The outer promise must resolve `null`, the newest prompt must accept text
and resolve on Enter, and no synchronous/page errors or abandoned timers/listeners may remain.
Also cover a release handler that cancels the prompt or removes its screen.

## Fix 3

**Reject negative spritesheet margins before fixed-grid processing.**

**Impact and evidence.** A negative margin equal to or larger in magnitude than a sprite
dimension makes a slicing loop stop advancing or move backwards. The synchronous loop keeps
appending frames, blocking the page and growing memory instead of reporting invalid input.
This defect also exists in `v2.2.0`; it remains in scope because it ships in 2.3.

**Reproduction.** The following call on a fresh page enters the nonterminating loop:

```javascript
const atlas = document.createElement( "canvas" );
atlas.width = atlas.height = 16;
$.loadSpritesheet( atlas, "bad-margin", 8, 8, -8 );
```

For safe verification, the review executed the current `src/api/images.js` module's
`loadSpritesheet()` path inside the repository's Node VM harness, with a canvas-shaped source
and a 100 ms execution limit. It failed with `ERR_SCRIPT_EXECUTION_TIMEOUT`, not `INVALID_MARGIN`.
No approved baseline or library source was modified to run the probe.

**Cause and references.**
[images.js:347-371](../../../src/api/images.js#L347) rounds the margin and checks only whether it
is an integer. In [processSpriteSheetFixed():799-823](../../../src/api/images.js#L799), the
horizontal step is `spriteWidth + margin`, and the vertical step is `spriteHeight + margin`.
For the example, `x1 = -8`, `x2 = 0`, and the inner condition is `0 <= 24`; adding the horizontal
step adds zero forever. The URL-loading path reaches the same loop when its image finishes loading.

**Recommended correction.** Reject negative fixed-grid margins with a range error carrying
`INVALID_MARGIN` before allocating a name or beginning an image load. Ensure the normalized
horizontal and vertical steps are positive before slicing. Describe the supported margin range
in the current metadata.

**Regression verification.** Check negative margins that produce zero and negative steps on
either axis, with direct canvas and URL sources. Rejection must occur promptly without leaving
an image registration or readiness wait. Keep positive-margin and zero-margin frame counts
unchanged. Use a bounded harness for the failing version rather than hanging a browser test.

## Fix 4

**Choose an unused registry name when callers omit an image name.**

**Impact and evidence.** Automatically naming a screen capture can silently replace a previously
registered image. Callers retaining its name then draw the capture instead of the original asset.
The metadata promises an optional unique name and describes capture as creating a new image.
This defect is inherited from `v2.2.0` and remains present in 2.3.

**Reproduction.** On a fresh Full or Lite page, after readiness:

```javascript
const s = $.screen( "32x20" );
const original = document.createElement( "canvas" );
original.width = original.height = 2;
$.loadImage( original, "1" );
const captured = s.createImageFromScreen();
console.log( captured, $.getImage( "1" ) === original );
```

The current Full and Lite bundles both produce `"1", false`: the generated name collides with
the existing registration and replaces it without throwing. Expected: a distinct capture name
and the original object still available as `"1"`.

**Cause and references.** The shared counter only advances when names are omitted.
[images.js:517-534](../../../src/api/images.js#L517) generates the next numeric name, but its
duplicate-name check is in the explicit-name `else if` branch. The subsequent registry assignment
at [line 537](../../../src/api/images.js#L537) therefore overwrites the existing record.
The other allocators at [lines 114-123](../../../src/api/images.js#L114) and
[373-389](../../../src/api/images.js#L373) use the same counter without searching for an unused
name; those paths throw on a collision rather than overwriting it.

**Recommended correction.** Use a shared allocator that advances until it finds an unused own
registry key. Apply it to `loadImage()`, `loadSpritesheet()`, and `createImageFromScreen()`.
Keep the existing rejection behavior for explicitly duplicated names. An omitted name must
never replace a live, loading, or failed registration.

**Regression verification.** Pre-register numeric names, including the next several counter
values, then alternate unnamed loads, spritesheets, and captures. Assert unique returned names,
preserved original image identities, unchanged explicit-duplicate errors, and normal removal
and reuse behavior.

## Fix 5

**Keep `onPlay()` synchronized with the audio clock across suspension and resumption.**

**Impact and evidence.** After a running audio context is suspended, Chromium delivers queued
`onPlay( "note", ... )` callbacks for notes whose audio start time has not arrived. Those events
are removed from the queue, so they are not delivered again when the notes actually play after
resumption. Visuals or game actions synchronized to music therefore run early. This contradicts
the documented promise that handlers run when the notes reach the speakers in
[the advanced-sound guide](../../../plugins/sound-advanced/README.md#L233).

A realtime probe against the extracted production package reproduced this in all four Full/Lite,
minified/unminified IIFE combinations in Chromium. Lite loaded sound and sound-advanced. The probe
used the sound service's documented `getContext()` method without replacing native browser APIs.
In the Full run, `currentTime` remained at `0.3413333333` seconds during a 500 ms suspension, but
a note scheduled for `0.437` seconds was dispatched with `state === "suspended"`. Its start was
still about 96 ms ahead of the frozen audio clock. Both values in `getOutputTimestamp()` remained
unchanged during that suspension. Firefox's Full comparison kept future notes queued and
delivered them after resumption. All eight song notes eventually produced callbacks in each run;
the Chromium failure is incorrect timing, not missing scheduled audio.

**Reproduction.** Use an activated Chromium page with Full and sound-advanced loaded, or Lite
with sound and sound-advanced, and run this asynchronous sequence after readiness:

```javascript
let context;
pi.registerPlugin( {
	"name": "suspension-probe",
	"dependencies": [ "sound" ],
	"init": api => {
		context = api.getService( "sound" ).getContext();
	}
} );
const wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );
await context.resume();
await wait( 300 );
const notes = [];
$.onPlay( "note", data => notes.push( {
	"time": data.time,
	"clock": context.currentTime,
	"state": context.state
} ) );
$.play( "T120 L16 CDEFGABC" );
await wait( 30 );
await context.suspend();
await wait( 500 );
console.log( notes.filter( note =>
	note.state === "suspended" && note.time > note.clock
) );
await context.resume();
```

Expected: the filtered list is empty; future note callbacks wait for the audio clock to reach
their audible starts. Actual: Chromium logs a future note while the clock is stopped. Suspension
is controlled here to make the transition repeatable; a browser/device interruption itself was
not induced or verified.

**Cause and references.** [sync.js:86-94](../../../plugins/sound-advanced/sync.js#L86) accepts any
nonzero output timestamp and converts it to a fixed page/audio offset. Chromium retains the last
timestamp during suspension, so the offset also stays fixed while `performance.now()` advances.
[sync.js:169-185](../../../plugins/sound-advanced/sync.js#L169) then treats queued notes as due
using wall time alone and removes them before dispatch. It checks neither context state nor
whether the audio clock has reached the note. Core explicitly handles suspended/interrupted
states at [context.js:399-407](../../../plugins/sound/context.js#L399), but the sync queue does
not follow that lifecycle. This module is new since `v2.2.0`.

**Recommended correction.** Gate future-note dispatch on audio-clock progress. Preserve queued
notes while the context is suspended/interrupted and refresh the page/audio mapping on resume,
including the interval before a fresh output timestamp becomes available. Keep stopped-song
cancellation and the documented late-note/end-event rules intact.

**Regression verification.** Suspend a previously running context with notes admitted inside the
lookahead window. Assert that future notes remain queued throughout suspension, then dispatch
once at their audible starts after resume, without being dropped as wall-clock-late. Cover a
frozen nonzero output timestamp, the zero/missing-timestamp fallback, stop/clear during suspension,
and resumption in Chromium and Firefox. Preserve the existing running-context latency checks.

## Validation record and coverage limits

Review combined source inspection with fresh execution. Areas examined included core command
and plugin registration, screen/resource lifecycle, rendering/batching/textures/shaders, views,
pixels/paint, images/fonts/text, all six shipping plugins, metadata/declarations/documentation,
build/package tooling, and CI/release workflows. Earlier 2.3 audit and manual-release records
provided context; their historical results were not counted as fresh passes.

| Check | Fresh result |
| --- | --- |
| `node scripts/test.js all` | Exit 0; 571 Node tests passed; browser summary: 462 passed, 2 individual tests skipped; 2 package type-consumer tests passed |
| Strict visual suites within `all` | Full 30/30, Lite 20/20, plugins 2/2; no pixel mismatches, retries, missing baselines, or recaptures |
| `node scripts/test.js firefox` | Full/Lite rendering, context recovery, and sizing/input: all six scenarios passed |
| `node scripts/test.js benchmark` | 25/25 passed; validates the harness, not a new performance measurement campaign |
| `node scripts/test.js performance-ui` | 5/5 passed |
| Production build in an archived copy of the reviewed commit | Passed; regenerated checked-in declarations and release manifest matched the originals |
| `node scripts/release-check.js --tag=v2.3.0` in that copy | Passed |
| `npm pack --dry-run --json` and `npm pack --json` | Passed using the installed npm CLI directly and a writable local cache; 76 package entries |
| Extracted tarball inspection and browser smoke tests | All eight library variants passed; all six shipping plugins initialized; exported paths, README, license, and changelog present |
| Extracted package TypeScript consumers | Full plus advanced sound, and Lite plus all plugins, passed strict `nodenext` and `bundler` compilation |
| Focused defect probes | Reproduced items 1-5 as described above; audio suspension compared Chromium and Firefox |

Runtime: Node 22.19.0 on Windows, Chromium 141.0.7390.37 and Firefox 142.0.1. Chromium regression
tests use the repository's SwiftShader launcher. The Firefox smoke run reported an ANGLE/NVIDIA
WebGL2 renderer. The browser test summary's two skipped individual tests do not represent all
unavailable coverage: whole WebKit audio suites/groups are also skipped because this Windows
WebKit build has no Web Audio, and Firefox skips clock-driven offline groups because it lacks
`OfflineAudioContext.suspend()`.

No fresh Linux/macOS CI runs, Safari/iOS runs, physical gamepad/pen/multitouch checks, or listening
pass were performed. Recorded maintainer device/listening checks were read, not repeated.
CI/release workflow review was static; no tag, publication, or remote release action was performed.
These limits are not evidence of additional defects.

The sandbox initially prevented Firefox from launching; rerunning with browser subprocess access
completed successfully. The default npm launcher and cache also required local invocation/cache
adjustments. Neither environment issue is reported as a Pi.js fix.

Detailed logs and disposable reproduction scripts are under
`test/test-results/final-review/` in this checkout. The reproductions and source traces above make
the findings reviewable without those ignored artifacts. This document is the only tracked
addition; library code, tests, generated release snapshots, and approved PNG baselines are unchanged.
