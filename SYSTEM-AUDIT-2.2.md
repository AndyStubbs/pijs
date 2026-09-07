# Pi.js whole-system correctness audit

Audit date: 2026-09-07. Repository: `C:\Docs\src\pijs`.
Source revision: `694d02aa230226fc1295adc1c72956d0ac512f10`.
Package baseline: **2.2.0, in development and not release-ready**.

## 1. Executive assessment

This audit records 23 confirmed actionable findings, including four P1 findings, outside the
already audited 2.2 changes.
The most urgent failures concern global drawing after screen disposal, abandoned readiness
promises, text-input disposal, and audio completion accounting. Rendering probes also demonstrate
incorrect transparent-layer composition and a stack overflow when flood-filling a Full HD screen.
The declarations and package entrypoints disagree in ways that existing metadata checks miss.

This is a whole-system audit, not a second PATCH-001–009 implementation review. Those records in
`UPGRADE-2.2.md` and `docs/upgrade-2.2.md` are preserved. Their regressions were rerun as a baseline;
historical deferred candidates were independently tested rather than accepted as findings.

Verification included source tracing across core, rendering, API, text, input/audio, optional plugins,
build/distribution, metadata, declarations, and the test harness; a clean locked dependency install;
a fresh build; all existing Chromium suites; 26 targeted diagnostic scenarios; all eight library
bundle variants; and the ten plugin ESM outputs. Runtime inventory found 125 global functions and
80 screen functions in the full build. AST inspection inventoried 120 `addCommand` registrations,
including examples and optional plugins; hot-path wrappers were also checked through runtime
inventory. This is not a claim that every parameter combination or every source line is correct.

Fresh-build validation results:

| Check | Result |
| --- | --- |
| Metadata unit tests | 5 passed |
| Metadata-output and declaration-string validators | Passed |
| Existing lifecycle/browser regressions | 26 passed |
| Full visual suite | 35 passed, 1 failed: `intouch 01`, 0.47% pixel difference |
| Lite visual suite | 22 passed |
| Plugin visual suite | 7 passed, 2 skipped for missing baselines |
| Eight library format smoke checks | All produced the expected opaque red pixel |
| Standalone generated declaration compilation | Passed with TypeScript 5.9.3, strict mode |
| Representative supported ESM/type consumer | Failed with three declaration mismatches |
| Invalid-export/lite consumer | Incorrectly accepted by TypeScript |

An earlier full visual run passed 36/36, and five isolated touch-fixture repetitions passed.
The touch mismatch is investigated separately below;
it is not presented as a confirmed library touch-state defect. Passing visual results do not
establish lifecycle, error-handling, package-type, or release correctness.

### Evidence conventions and limits

- **P1:** blocks a supported workflow or corrupts shared readiness/input state.
- **P2:** incorrect rendering, lifecycle, interface, or tooling behavior under a specific trigger.
- **P3:** lower-impact but reproducible contract/state defect.
- All SYS findings below are confirmed. Unverified areas and coverage work are kept separate.
- Browser evidence uses headless Chromium **141.0.7390.37** on Windows, Node **22.19.0**.
  Audio retry tests replace `Audio` with a controlled EventTarget; gamepad tests replace
  `navigator.getGamepads`. These execute real library code but do not establish physical-device,
  codec, audible-playback, autoplay-policy, or hardware-GPU behavior.
- No Firefox/WebKit runtime results are claimed. No long-duration memory plateau, mobile-device,
  worker, or complete browser/GPU portability campaign was performed.
- Diagnostic collectors intentionally record observed failures without aborting; exit 0 for those
  collectors means observations were collected, **not** that the product passed their scenarios.

Evidence files and scripts are retained under
[build/system-audit](C:/Docs/src/pijs/build/system-audit), an ignored generated-output directory.
`probes.cjs` contains self-contained page functions named exactly as quoted in the findings;
`probe-results.json` records their results and uncaught browser errors. Each page starts with
the fresh library loaded and `await $.ready()`. The short snippets below assume that setup.

## 2. Prioritized confirmed findings

### SYS-001 — P1 — Active-screen removal leaves global drawing bound to disposed data

**Locations:** [screen-manager.js:769](C:/Docs/src/pijs/src/core/screen-manager.js:769),
[screen-manager.js:808](C:/Docs/src/pijs/src/core/screen-manager.js:808),
[graphics.js:48](C:/Docs/src/pijs/src/api/graphics.js:48).

**Trigger/reproduction:**

```javascript
const a = $.screen("16x16");
const b = $.screen("8x8");
b.removeScreen();
$.width();       // 16: a is active
$.pset(1, 1);    // throws: Cannot read properties of null (reading '0')
$.setScreen(a);
$.pset(1, 1);    // still throws
```

**Expected:** all global commands target the surviving active screen; with no remaining screen,
drawing reports the normal no-active-screen error. **Actual:** generic commands consult the new
active record, but graphics wrappers retain `b`. `setScreen(a)` does not rebuild them because
the manager already considers `a` active. Bound `a.pset()` still works.

**Impact:** normal scene/screen teardown breaks global rendering until a real screen transition
or new screen creation rebuilds the wrappers. **Evidence:** `active removal global drawing`.
**Fix:** centralize active-screen transitions and rebuild graphics bindings after removal,
including transition to null; make explicit selection repair stale bindings.

### SYS-002 — P1 — One throwing ready callback permanently abandons unrelated waiters

**Location:** [commands.js:179](C:/Docs/src/pijs/src/core/commands.js:179).

**Trigger:** queue a throwing `$.ready(callback)` and another `$.ready()` in the same turn.
**Expected:** the failure is surfaced and other registered callbacks/promises still settle.
**Actual:** `checkReady` detaches the entire queue, calls the first callback before resolving its
promise, then exits on the exception. Neither that promise nor later items can be reached again.

**Evidence:** `ready callback exception`: both promises remained `pending`, the second callback
never ran, and a subsequently registered `ready()` resolved. The source establishes abandonment;
the 100 ms observation alone is not treated as proof of indefinite waiting.

**Impact:** unrelated initialization chains hang after one callback fails. **Fix:** give each
ready item independent completion/error handling and define rejection semantics for the throwing
callback. Preserve asynchronous timing and settle every detached item.

### SYS-003 — P1 — Disposing a screen with active text input strands the global input session

**Locations:** [keyboard/index.js:40](C:/Docs/src/pijs/plugins/keyboard/index.js:40),
[keyboard/input.js:154](C:/Docs/src/pijs/plugins/keyboard/input.js:154),
[keyboard/input.js:315](C:/Docs/src/pijs/plugins/keyboard/input.js:315).

**Trigger:** `const p = s.input("Name?"); s.removeScreen();`, then request input on another screen.
**Expected:** cancel the old prompt, settle `p`, and remove its timer, key handler, background image,
and screen references; a new prompt should work. **Actual:** the cleanup hook is a no-op. The
100 ms blink interval keeps calling removed screen methods, `p` stays pending, and starting the
next prompt throws from `blitImage()` while trying to finish the dead prompt.

**Evidence:** `input screen disposal`: repeated `DELETED_METHOD` browser errors, pending promise,
and failed replacement prompt. **Impact:** screen navigation can disable text input for the page.
**Fix:** add disposal-specific cancellation that does not redraw, settles before releasing state,
clears the interval/listener/image, and remains safe when a callback throws or reenters input.

### SYS-004 — P1 — Audio load completion can release an unrelated resource wait

**Location:** [sound.js:36](C:/Docs/src/pijs/plugins/sound/sound.js:36).

**Trigger:** a pooled audio element fires `canplay`, later fires `error`, and its retry becomes ready
while another resource is pending. **Expected:** one wait is released per original load, and
post-readiness media errors cannot consume someone else's wait. **Actual:** `audioReady` removes
only its `canplay` listener; the error listener schedules another load whose success calls `done()`
again. There is no terminal-state guard shared by success, error, and retry paths.

**Evidence:** controlled `audio late error double settlement`: after a successful load, a diagnostic
plugin held an independent `wait()`. A late error followed by retry `canplay` made its `ready()`
resolve before the corresponding `done()`. Two Audio instances were created.

**Impact:** initialization can proceed before unrelated assets exist. **Fix:** track settlement per
load, detach both terminal listeners, and make retries share the original accounting token.
This is independent of the previously fixed playback-duration timer.

### SYS-005 — P2 — Deferred pixel reads and filters execute after screen disposal

**Locations:** [readback.js:65](C:/Docs/src/pijs/src/renderer/readback.js:65),
[readback.js:153](C:/Docs/src/pijs/src/renderer/readback.js:153),
[pixels.js:260](C:/Docs/src/pijs/src/api/pixels.js:260).

**Trigger:** call `s.getPixelAsync(0,0)` or `s.getAsync(0,0,2,2)` and immediately remove `s`.
**Expected:** each promise settles with defined cancellation/rejection behavior. **Actual:** the
microtask reads cleared `batchInfo`, throws outside the Promise executor, and never resolves or
rejects the returned promise. `filterImg()` similarly leaves an uncaught deferred exception.

**Evidence:** `disposed async reads`: a live-screen control returned red, but both disposed-screen
promises stayed pending with `Cannot read properties of null (reading 'drawOrder')` errors.
`queued filter disposed` reproduced the related filter exception.

**Impact:** hanging awaited reads and post-teardown exceptions. **Fix:** check screen lifetime in
deferred work, reject read promises through a caught error path, and cancel queued filters on
disposal. Preserve the documented deferred timing for valid reads.

### SYS-006 — P2 — Transparent offscreen composition applies alpha twice

**Locations:** [batches.js:613](C:/Docs/src/pijs/src/renderer/batches.js:613),
[batches.js:625](C:/Docs/src/pijs/src/renderer/batches.js:625),
[image.frag:16](C:/Docs/src/pijs/src/renderer/shaders/image.frag:16),
[display.frag:11](C:/Docs/src/pijs/src/renderer/shaders/display.frag:11).

**Trigger:** draw a half-transparent red canvas directly onto opaque blue, versus draw it onto a
transparent offscreen screen first and then composite that screen onto the same blue.
**Expected:** equivalent composition paths produce the same result. **Actual:** the layer stores
alpha-weighted RGB, then the image path multiplies that RGB by source alpha again, although the
display shader describes the framebuffer as straight alpha.

**Evidence:** `transparent layer composition` measured exact RGBA:

| Path | RGBA |
| --- | --- |
| Direct canvas onto blue | `128,0,127,255` |
| Through parent-affiliated offscreen layer | `64,0,127,255` |
| Through separate-context offscreen layer | `64,0,127,255` |
| Intermediate transparent layer | `128,0,0,128` |

**Impact:** translucent sprites, UI layers, and compositors become too dark; the mismatch is far
beyond screenshot/color-conversion tolerance. **Fix:** establish one explicit framebuffer alpha
representation and make blending, image/screen sampling, replace writes, shader passes, readback,
and presentation agree. Add direct-versus-layered equivalence tests before implementing it.

### SYS-007 — P2 — A single oversized batch request recurses forever; Full HD paint fails

**Locations:** [batches.js:394](C:/Docs/src/pijs/src/renderer/batches.js:394),
[paint.js:159](C:/Docs/src/pijs/src/api/paint.js:159).

**Minimal reproduction:** `$.screen("1920x1080").paint(0, 0, "red");`.
**Expected:** fill the supported-size screen. **Actual:** `RangeError: Maximum call stack size
exceeded`. Paint reserves 2,073,600 points, greater than the 1,920,000 point limit. `prepareBatch`
flushes, then recursively retries the unchanged oversized request even when the batch is empty.

**Evidence:** `full HD paint batch`; `oversized arc batch` reproduced the same root cause with
`s.arc(0,0,500000,0,270)`. A separate 10,000-point growth control rendered all points correctly.
**Impact:** ordinary high-resolution flood fill fails; large individual geometry requests can
also exhaust the stack. **Fix:** split operations into bounded chunks or support an explicitly
bounded larger allocation; never retry an impossible reservation recursively. Paint should not
reserve the entire screen when it can stream filled spans/points.

### SYS-008 — P2 — Context restoration resumes rendering with invalid GPU objects

**Location:** [renderer.js:191](C:/Docs/src/pijs/src/renderer/renderer.js:191).

**Trigger:** lose and restore an onscreen context using `WEBGL_lose_context`, then draw again.
**Expected:** rebuild resources before resuming, or keep the screen explicitly unusable with a
clear lifecycle result. **Actual:** the restoration handler only clears `contextLost`; FBOs,
textures, programs, buffers, VAOs, and uniform locations still belong to the lost generation.

**Evidence:** `context restoration`: red readback before loss; after a confirmed restoration event,
drawing blue returned transparent black and `gl.getError()` returned 1282 (`INVALID_OPERATION`).
Browser logs identified stale framebuffer/program/uniform/buffer objects.

**Impact:** rendering does not recover after real GPU/context loss despite the handler resuming it.
**Fix:** rebuild resources per shared context generation and invalidate dependent caches. If full
recovery is deferred, expose a deterministic failure instead of silently resuming stale state.
Preserving pre-loss pixels was not assumed or tested.

### SYS-009 — P2 — Late plugins do not initialize existing screen state or screen APIs

**Locations:** [plugins.js:310](C:/Docs/src/pijs/src/core/plugins.js:310),
[commands.js:100](C:/Docs/src/pijs/src/core/commands.js:100),
[screen-manager.js:163](C:/Docs/src/pijs/src/core/screen-manager.js:163).

**Trigger:** create a screen with the lite bundle, then load the pointer plugin.
**Expected:** a successfully registered screen plugin works on existing eligible screens, or
registration explicitly rejects unsupported timing before publishing commands. **Actual:** global
commands appear, but earlier screens receive neither new defaults/init hooks nor bound methods.

**Evidence:** `late pointer plugin`: `old.inmouse` was undefined; global `$.inmouse()` threw
`Cannot read properties of undefined (reading 'x')`; a newly created screen polled normally.
**Impact:** lazy plugin loading produces a partially usable API. **Fix:** provide a deliberate
existing-screen installation phase that initializes only the new plugin's data/hooks and binds
its commands. Do not rerun every core screen initializer. Pi Vision already backfills some of its
own data; this does not repair the general command/state installation problem.

### SYS-010 — P2 — Loading and failed images cannot be removed or replaced by name

**Location:** [images.js:282](C:/Docs/src/pijs/src/api/images.js:282).

**Trigger:** remove an image before decoding, or remove it after an error, then load another image
with the same name. **Expected:** removal releases the registry entry and prevents late ownership
changes. **Actual:** removal is conditional on a truthy `imageObj.image`, so loading/error records
survive and the name remains reserved. A pending image still becomes available after removal.

**Evidence:** `failed and pending image removal`: both replacement attempts raised `INVALID_NAME`;
the pending image appeared after `ready()`. Removing/reloading an already-ready image succeeded.
**Impact:** applications cannot retry failed named assets or reliably discard pending loads.
**Fix:** support every record state, cancel/settle outstanding work once, and use record identity
or a generation token so late events cannot publish into a replacement record.

### SYS-011 — P2 — Keyboard callbacks can repeat once-handlers and leave released keys held

**Locations:** [keyboard/index.js:287](C:/Docs/src/pijs/plugins/keyboard/index.js:287),
[keyboard/index.js:309](C:/Docs/src/pijs/plugins/keyboard/index.js:309).

**Triggers:** a once-handler dispatches a nested key event or throws; a keyup callback throws.
**Expected:** once-handlers execute at most once, and key state is released despite callback errors.
**Actual:** once-removal occurs after invoking user code, and keyup deletes held state only after
dispatch. Reentrancy sees the live once-handler; exceptions skip removal/state cleanup.

**Evidence:** `keyboard once reentrancy` and `keyboard throwing once` each recorded two callbacks.
`keyboard release exception state` reported `stillHeld: true` after dispatching keyup.
**Impact:** duplicate actions, stuck movement keys, and repeat callback errors. **Fix:** mark/remove
once-handlers before invoking them, finalize device state independently of callback success, and
isolate handler failures so unrelated subscribers can run under a documented dispatch policy.

### SYS-012 — P2 — Generated declarations disagree with runtime exports and capabilities

**Locations:** [generate-metadata.js:611](C:/Docs/src/pijs/scripts/generate-metadata.js:611),
[generate-metadata.js:620](C:/Docs/src/pijs/scripts/generate-metadata.js:620),
[base-package.json:12](C:/Docs/src/pijs/releases/base-package.json:12),
[index.js:75](C:/Docs/src/pijs/src/index.js:75).

**Trigger:** consume published-style root, lite, or plugin entrypoints from TypeScript.
**Expected:** declarations match each module's exports and supported commands.
**Actual/evidence:**

- Library ESM exports are `default` and lowercase `pi`; declarations export `Pi` and `$`.
  TypeScript rejects the real named export (TS2724) and accepts nonexistent named exports.
- Runtime exposes `window.pi`, not `window.Pi`; the generated global declaration advertises `Pi`.
- Runtime version is `"2.2.0"`; the declared literal is `"pi-2.2"` (TS2322 in a version check).
- Plugin subpaths point to the full API declaration although their default export is an initializer
  function. Using that value as `registerPlugin`'s initializer fails TS2322.
- Lite uses the same full API type and therefore accepts `lite.inmouse()` without the pointer plugin.
- Runtime inventory also found `getDefaultColor` and `createColor` absent from the core metadata
  and declarations; `getDefaultPal(include0)` is registered but only the zero-argument signature
  is described. Other inventoried documented full-build methods were present at runtime.

**Evidence:** `variants.cjs`, `contracts.cjs`, and the three consumer files. Bare declaration
compilation and existing validators pass, demonstrating their limits rather than contract validity.
**Impact:** valid integrations fail compilation and invalid integrations compile successfully.
**Fix:** emit declarations for actual module/global names and package version, distinct plugin
initializers and lite capabilities, and fill the metadata omissions. Validate against real
package consumers in addition to generated-string checks.

### SYS-013 — P2 — ESM plugins auto-register despite documented explicit registration

**Locations:** [pointer/index.js:92](C:/Docs/src/pijs/plugins/pointer/index.js:92),
[plugins/README.md:65](C:/Docs/src/pijs/plugins/README.md:65).

**Trigger:** load lite ESM, import pointer ESM, then call
`pi.registerPlugin({name:"pointer", init:pointerPlugin})` as the ESM usage pattern documents.
**Expected:** explicit registration succeeds once. **Actual:** importing the plugin already
registers it because its supposedly IIFE-only guard checks only `window.pi`; the explicit call
throws `DUPLICATE_PLUGIN`.

**Evidence:** `ESM documented manual plugin registration`; the imported default is a function
and `getPlugins()` already lists initialized pointer before the manual call.
**Impact:** documented ESM setup fails and import order determines registration side effects.
**Fix:** separate IIFE auto-registration from ESM initializer exports and align bundled full-entry
registration accordingly, or explicitly adopt/document side-effect imports consistently. Test
both supported module-loading patterns; avoid silently allowing duplicate initializers.

### SYS-014 — P2 — Plugin quickstart documents nonexistent registration methods

**Locations:** [PLUGIN-QUICKSTART.md:66](C:/Docs/src/pijs/plugins/PLUGIN-QUICKSTART.md:66),
[PLUGIN-QUICKSTART.md:74](C:/Docs/src/pijs/plugins/PLUGIN-QUICKSTART.md:74),
[PLUGIN-SYSTEM.md:25](C:/Docs/src/pijs/plugins/PLUGIN-SYSTEM.md:25).

**Trigger:** follow the quickstart's `pluginApi.addScreenCommand(...)` example or three-argument
`addCommand(name, fn, params)` signature. **Expected:** the tutorial creates usable commands.
**Actual:** `addScreenCommand` is absent; `addCommand` requires an `isScreen` boolean before the
parameter-name array. Several companion methods advertised in the system guide are also absent.

**Evidence:** `plugin quickstart contract` raised `PLUGIN_INIT_FAILED` with
`p.addScreenCommand is not a function`. `plugins/README.md` contains the actual four-argument
signature, so the maintained guides contradict each other.
**Impact:** extension authors cannot run the supplied tutorial. **Fix:** update the quickstart and
system guide from the real PluginAPI and execute their examples in a smoke test.

### SYS-015 — P2 — A 360-degree arc collapses to two pixels

**Location:** [arcs.js:34](C:/Docs/src/pijs/src/renderer/draw/arcs.js:34).

**Trigger:** `s.arc(16,16,10,0,360)` on a blank 32×32 screen.
**Expected:** a complete circular outline matching the corresponding circle.
**Actual:** normalizing both endpoints first loses the full revolution; the computed span is zero.
**Evidence:** `full turn arc`: 2 nontransparent pixels, versus 52 for `circle(16,16,10)`.
Angles are documented in degrees; the public wrapper converts them before calling this code.

**Impact:** complete arcs disappear into a degenerate segment. **Fix:** retain the original angular
span before endpoint normalization and define equal-angle/full-revolution behavior explicitly;
test full turns, wrapping, and positive/negative multiples.

### SYS-016 — P2 — Circle outlines emit duplicate pixels under alpha blending

**Location:** [circles.js:69](C:/Docs/src/pijs/src/renderer/draw/circles.js:69).

**Trigger:** draw an unfilled circle with `setBlend("alpha")` and
`setColor("rgba(255,0,0,0.5)")` on a transparent screen.
**Expected:** each rasterized outline pixel receives one contribution. **Actual:** the midpoint
loop advances before plotting and can emit reflected coordinates already emitted in the previous
iteration after crossing the diagonal.

**Evidence:** `circle alpha duplicates`: radii 3, 4, 10, and 20 produced alpha values 128 **and 192**;
radii 2 and 5 produced only 128. **Impact:** nonuniform bright/opaque outline segments; opaque
screenshots conceal the duplicate writes. **Fix:** stop at the symmetry crossing and ensure each
coordinate is emitted once. Assert coordinate uniqueness and translucent output, not only shape.

### SYS-017 — P2 — Invalid palette indices poison current and default drawing colors

**Locations:** [colors.js:182](C:/Docs/src/pijs/src/api/colors.js:182),
[colors.js:227](C:/Docs/src/pijs/src/api/colors.js:227).

**Trigger:** `s.setColor(-1)` or `$.setDefaultColor(-1)`.
**Expected:** reject an out-of-range index before altering valid color state.
**Actual:** only the upper bound is checked; the lookup yields undefined and publishes it.
Subsequent drawing throws while reading `color.r`. A bad default also affects newly created screens.

**Evidence:** `invalid palette indices corrupt color`: both setters returned normally, then drawing
failed; explicitly restoring red on the existing screen made drawing work again.
**Impact:** an invalid argument becomes a delayed rendering failure instead of a recoverable
validation error. **Fix:** require a finite integer in the allowed range and resolve the color
completely before assignment; apply the same rule to numeric color lookup helpers.

### SYS-018 — P2 — Removing pending audio leaves its loading work and retries alive

**Locations:** [sound.js:36](C:/Docs/src/pijs/plugins/sound/sound.js:36),
[sound.js:396](C:/Docs/src/pijs/plugins/sound/sound.js:396).

**Trigger:** load an audio pool and remove it before its first `canplay`.
**Expected:** cancel owned pending requests/retries/listeners and settle the outstanding load wait
once. **Actual:** pending elements are not in `audioItem.pool`, so removal visits none of them.
Their closures and error handlers remain active after the registry entry is deleted.

**Evidence:** controlled `pending audio removal retry`: removing the only pool paused zero
elements; firing its retained error listener created a second Audio instance 100 ms later;
`ready()` was still pending. This establishes uncancelled work, not an indefinite network hang.
**Impact:** discarded assets continue allocating/loading and can delay initialization.
**Fix:** track pending elements and retry handles as owned pool resources and invalidate them
on removal. Coordinate cancellation accounting with SYS-004's once-only settlement.

### SYS-019 — P2 — Build success ignores a failed optional-plugin build

**Locations:** [build.js:173](C:/Docs/src/pijs/scripts/build.js:173),
[build-plugin.js:220](C:/Docs/src/pijs/scripts/build-plugin.js:220).

**Trigger:** an optional plugin fails compilation. **Expected:** the requested aggregate build
fails and identifies missing outputs. **Actual:** `buildPlugin` returns false, but its caller only
increments a success counter and continues. Non-exported optional plugins are not checked by the
release copier, so the aggregate reports success.

**Evidence:** `build-probes.cjs` removed only the temporary generated print-table output from the
active output path, injected invalid syntax into its temporary source copy, and ran the unchanged
build script: exit **0**, explicit plugin failure in the log, `Build completed successfully`, and
no `print-table.js`. The temporary source was restored in `finally` and a clean rebuild passed.

**Impact:** CI or developers accept an incomplete build, potentially retaining stale plugin files.
**Fix:** propagate any required plugin failure to a nonzero aggregate result and prevent success
or release copying until the requested output set is complete.

### SYS-020 — P2 — Release copying destroys the prior dist before checking required inputs

**Location:** [copy-to-release.js:169](C:/Docs/src/pijs/scripts/copy-to-release.js:169).

**Trigger:** run the copier with an existing complete dist and a missing required build artifact.
**Expected:** preflight failure leaves the previous package intact. **Actual:** it recursively deletes
dist first, then notices missing files partway through copying and exits with a partial package.

**Evidence:** `build-probes.cjs` temporarily withheld generated `pi.esm.min.js`: copier exit **1**,
dist top-level entries dropped from **18 to 7**, and the missing input was reported. The input was
restored and the temporary release package regenerated successfully. No maintained release was
changed or published.

**Impact:** an incomplete build invocation can replace a usable local release package with partial
contents. **Fix:** validate all inputs first, assemble in a temporary directory, then replace the
destination only after complete success.

### SYS-021 — P2 — NaN sensitivity propagates NaN through gamepad axes

**Locations:** [gamepad/index.js:126](C:/Docs/src/pijs/plugins/gamepad/index.js:126),
[gamepad/index.js:354](C:/Docs/src/pijs/plugins/gamepad/index.js:354).

**Trigger:** call `$.setGamepadSensitivity(NaN)` while polling a connected gamepad.
**Expected:** reject a non-finite threshold. **Actual:** typeof/range comparisons accept NaN, which
then contaminates smoothing arithmetic on the next update tick.

**Evidence:** `gamepad sensitivity NaN`, using a mocked pad with axis 0.5: initial output was
approximately 0.375; the setter did not throw; after advancing animation frames, the axis was NaN.
An initial same-tick probe did not change the axis because the poller intentionally coalesces updates;
the corrected next-tick probe establishes the defect.

**Impact:** movement calculations using the documented numeric axis output become NaN.
**Fix:** validate with `Number.isFinite` before range checking and preserve prior sensitivity on error.

### SYS-022 — P3 — Invalid font sources publish permanent incomplete font records

**Location:** [fonts.js:207](C:/Docs/src/pijs/src/text/fonts.js:207).

**Trigger:** `$.loadFont({}, 8, 8)`.
**Expected:** source validation rejects the call without publishing a font.
**Actual:** the font is inserted into `m_fontMap` and its ID advanced before the source is validated.
**Evidence:** `invalid font publication`: `INVALID_FONT_SRC` was thrown, yet `getAvailableFonts()`
grew from five entries to six and exposed the failed ID. No font removal command exists to undo it.

**Impact:** repeated rejected calls retain records and advertise unusable fonts.
**Fix:** validate before publication and roll back synchronous setup failures; separately define the
state exposed for asynchronous font-load failure. That asynchronous policy was not fully verified.

### SYS-023 — P2 — Visual tests can pass despite uncaught JavaScript errors

**Location:** [run-visual-tests.js:782](C:/Docs/src/pijs/test/scripts/run-visual-tests.js:782).

**Trigger:** a fixture throws without changing its final screenshot.
**Expected:** unexpected runtime errors fail correctness tests independently of pixels.
**Actual:** the runner attaches console/pageerror logging after navigation and initial assertions,
and even subsequently observed page errors are only logged.

**Evidence:** `harness-probe.cjs` temporarily appended a 50 ms delayed
`throw new Error("audit-unhandled-page-error")` to the copied `set_01.html`. A separate browser
observer confirmed that error. The unchanged visual runner with `--grep 'set 01'` returned **0**,
reporting **1 passed**. The copied fixture was restored in `finally`; the original was never edited.

**Impact:** exceptions in nonvisual or partially executed code can remain invisible to a green suite.
**Fix:** capture errors before navigation and fail on unexpected page errors/unhandled rejections,
with explicit expectations for fixtures intentionally testing errors. Keep screenshot comparison
as an additional assertion, not the only correctness signal.

## 3. Subsystem coverage map

| Subsystem | Inspected and executed | Remaining limits / highest-value tests |
| --- | --- | --- |
| Public API/contracts | Registration, hot wrappers, full runtime inventory, version-layered metadata, declarations, plugin guides; AST parameter-name comparison and strict compiler consumers | Exhaustive runtime return/error/default/optional-argument matrix is incomplete. Add package-consumer tests and documented-example execution first. Optional-plugin APIs need their own declaration/reference coverage. |
| Core/readiness/plugins | Commands, wait accounting, resolver, screen defaults/hooks and binding; existing resolver regressions plus throwing-ready and late-plugin probes | Failed initializer rollback of commands/hooks is not comprehensively tested. Add transactional registration and callback reentrancy matrices. |
| Screens/lifecycle | Construction/rollback, selection, resize, observers, normal teardown, shared-context ownership; existing regressions plus active removal and parent-removal control | No exhaustive cleanup-hook exception/reentrant-removal matrix or repeated-create/remove memory plateau. Test removal with outstanding work before expanding stress coverage. |
| Batching/blending/geometry | Ordering/reservation/flush/shrink code, blend transitions, primitives and cached geometry; visual suites, 10,000-point growth, Full HD paint, full-turn arcs, translucent circles | Shrink timing, every primitive at capacity boundaries, giant-coordinate clipping, degenerate ellipse/bezier cases and sustained workloads remain incomplete. Add unique-pixel and bounded-allocation tests. |
| Views/coordinates/effects | View stack/clip snapshots, clear/scroll paths, input mapping; nested view colors, clip exclusion, paint/text scroll control, existing view/CSS suites | Exhaustive resize during nested views/filter callbacks is unverified. Add state-transition sequences with independently calculated expected pixels. |
| Images/textures/shaders | Loading/removal, palette linkage, source resolution, caches, sampling, shader lifecycle/uniforms, readback; existing shader/video regressions and cross-context transparency/removal probes | No exhaustive HTMLImageElement partial-decode, changing media dimensions, every uniform type/limit, or shader compile-failure allocation matrix beyond existing checks. Explicitly test alpha representation across all source forms. |
| Fonts/text/palettes/draw strings | Font registration/loading, cursor sizing, printing/wrapping/scrolling, palette setters and BASIC draw parsing; visual suites, invalid font/color probes, clipped scroll control | No exhaustive custom charset/margin/scale or font-network-failure tests; no complete draw-string grammar campaign. Test source failure and zero/negative dimensions without invalid publication. |
| Keyboard/text input | State tracking, dispatch, once/removal, input prompt/timer/background ownership; real DOM key-event reentrancy/throw/disposal probes and existing visual tests | Editable targets, IME/layout behavior, blur during prompt, and complex simultaneous-key sequences are not fully exercised. Prioritize teardown and handler-failure isolation. |
| Pointer/touch/press | Listener helpers, target/layout mapping and cleanup; existing regressions and visual suites, late-loading probe | Real touch hardware and multi-touch/pinch/browser cancellation remain unverified. Fix touch fixture synchronization before using it as a deterministic regression gate. |
| Gamepad/audio/music | Poll loop, smoothing, button state, connect/disconnect, sound pools/voices, load/retry/play/stop and music track scheduling; controlled gamepad/audio probes and historical timer regression rerun | No physical controller, haptics, audible result, codec/autoplay matrix, or complete music grammar/timer campaign. Add deterministic once-settlement/removal tests, then browser media tests. |
| Optional plugins | All ten plugin entries/build outputs; polygon validation/raster spans/cache contract, print-table formatting, onscreen-keyboard ownership and synthetic input, Pi Vision creation/composition/close, example hooks, pens status; plugin suite and ESM import checks | Pi Vision smoke assertions execute but its visual baseline is absent. Cross-screen onscreen-keyboard switching, nested Pi Vision callback removal, and full polygon boundary coverage remain unverified. Pens is explicitly incomplete; implementing it is not an audit finding. |
| Build/distribution | Clean install, real build/generation/copy, all library variants and plugin ESM exports, package entry targets, declaration consumers, repeat-output hashes, build/copy failure injection | No Node 18 execution, POSIX shell run, registry publication, or external installed-package project. Node server-side library execution is not required by this browser-only contract. |
| Test infrastructure | Fixture discovery/lite routing, assertions, screenshot tolerances, skip policy, logging/reporting; complete suites and uncaught-error injection | A green screenshot does not establish device/resource state. Add explicit error expectations, assertion-only tests for lifecycle, and deterministic scheduling controls. |

### Actionable coverage gaps and investigated concerns

- **COV-001 — Touch fixture timing:** `intouch_01.html` samples touch state every 15 ms but its
  scripted end/start gap requests only 10 ms. The failed candidate has an extra horizontal line
  connecting the two strokes; the approved image has only the two diagonals. Logged end/start
  events were 13 ms apart, allowing the polling loop to miss the no-touch interval. This explains
  a concrete fixture race; it does not prove that Pi.js reported incorrect event state. Synchronize
  the driver with observed stroke completion or reset drawing state by touch identity/events.
- **COV-002 — Missing baselines:** `Pi Vision Window Smoke Test` (`pi_vision_01.html`) and
  `Pointer lifecycle 2.1.1` (`pointer_lifecycle_01.html`) have no approved images. Their pages and
  explicit assertions run before the runner skips comparison. Approve baselines only after a
  separate deliberate visual review; no approvals were performed here.
- **COV-003 — Numerical boundary coverage:** add finite/integer/range tables for colors, fonts,
  gamepad values, geometry, and batch reservations. Existing happy-path rendering tests miss state
  poisoning and oversized requests.
- **COV-004 — Ownership and reentrancy:** add unit/browser checks covering removal during pending
  reads, input, images/audio and callbacks; failed initialization; shared resources; listener and
  timer counts; and subsequent successful reuse. GC or a screenshot alone is insufficient.
- **COV-005 — Package contracts:** declarations compiling by themselves does not prove that they
  describe runtime. Add positive and negative import/capability consumers for every exported path.

Historical candidates confirmed afresh include pending/failed image removal, context restoration,
readback after disposal, NaN gamepad sensitivity, and full-turn arcs. Unspecified-size video drawing
remains the documented limitation in the upgrade notes; this audit did not reclassify it as a new
defect. Parent context affinity does not imply child lifetime ownership: a bound child remained
drawable after parent removal. Polygon point collections remain documented immutable; mutation of
cached collections was not used as a bug reproduction. No speculative shader enhancements are
included in the findings.

## 4. Validation commands, results, and environment

### Reproduction setup

The starting tracked tree was clean. `AGENTS.md`, `.editorconfig`, `.cursorrules`, both upgrade
records, TODO notes, plugin guides, package/build scripts, and test infrastructure were read.
The user's explicit audit authorization governed read-only Git inspection and isolated generated
outputs; no staging, commits, publishing, deployment, or global Git configuration occurred.

`git status` initially failed with dubious ownership. Subsequent read-only Git commands used:

```powershell
git -c safe.directory=C:/docs/src/pijs status --short
git -c safe.directory=C:/docs/src/pijs rev-parse HEAD
```

The audit workspace is `C:\Docs\src\pijs\build\system-audit`; its `snapshot` contains copies of
773 tracked files as they existed at the audit start. SHA-256 values for every copied maintained
file were captured in `initial-hashes.json`. It did not inherit the checkout's ignored build output
or node_modules. The setup and port-adaptation commands were:

```powershell
# Run from C:\Docs\src\pijs
node build/system-audit/setup.cjs
node build/system-audit/port.cjs
```

`port.cjs` changes only the temporary copies of server.js, playwright.config.js,
test/scripts/global-setup.js, and test/unit/patch-browser.test.js from port 8080 to 8081.
The original server on 8080 was left alone. An attempted snapshot server launch on 8080 failed
with EADDRINUSE. A subsequent launch from the repository root exposed the server's cwd-relative
static-file behavior; it was stopped and restarted **from the snapshot directory**. All final
browser diagnostics and suites were repeated after correcting this.

The served `/build/pi.js`, freshly generated snapshot bundle, and pre-existing checkout bundle
were independently found to have the same SHA-256:

```text
692d799c6915d2a90203d802ebddad090422a9a3630ab040dd4935c84626d751
```

Thus earlier observations were not evidence of a different source bundle, but only the final
verified runs are used for isolated-run results. `validation-results.json` records the served/local
hash equality. The early error-injection attempt was invalid because of the server cwd and an
over-anchored grep pattern: it saw no injected error and selected zero tests (exit 1). The corrected
attempt selected one test and confirmed SYS-023.

### Tooling and clean build

`node --version` returned v22.19.0. The default `npm --version` launcher failed with MODULE_NOT_FOUND
for `C:\Users\curti\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js`. The installed CLI
at `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` worked when called directly.

```powershell
# Working directory: C:\Docs\src\pijs\build\system-audit\snapshot
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' ci --no-audit --no-fund
node scripts/build.js
node server.js
```

- First `ci` failed with EPERM reading the user npm cache in the sandbox. Approved execution
  outside the sandbox succeeded: seven packages installed. This establishes a clean installation
  from the checked-in lockfile on this Windows/Node environment, not an offline or cache-free fetch.
- The fresh build succeeded, including metadata, ten plugin builds, eight library variants,
  declarations, and the temporary release package (17 library files plus four exported plugins).
- A second build produced identical SHA-256 values for all 17 top-level library JS/map/type files.
  Timestamped reference JSON was excluded from byte-determinism claims.
- Compiler tooling was isolated and pinned:

```powershell
# Working directory: C:\Docs\src\pijs
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' install typescript@5.9.3 --prefix build/system-audit/tooling --no-save --package-lock=false --no-audit --no-fund
```

Chromium initially failed to launch with sandbox `spawn EPERM`; approved outside-sandbox execution
succeeded. Browser commands below used that execution permission. No browser installation or
maintained dependency changes were made. Automatic software-WebGL fallback and readback-stall
warnings appeared; results are not hardware-GPU certification.

### Existing suites and validators

Run from the snapshot with its server listening on 8081:

```powershell
node --test test/scripts/generate-metadata.test.js
node scripts/validate-metadata-output.js
node scripts/validate-type-definitions.js
node --test test/unit/patch-lifecycle.test.js test/unit/patch-browser.test.js

$env:PI_TEST_TYPE='core'
$env:PI_TEST_LITE='false'
node node_modules/@playwright/test/cli.js test test/scripts/run-visual-tests.js

$env:PI_TEST_LITE='true'
node node_modules/@playwright/test/cli.js test test/scripts/run-visual-tests.js

$env:PI_TEST_LITE='false'
$env:PI_TEST_TYPE='plugins'
node node_modules/@playwright/test/cli.js test test/scripts/run-visual-tests.js
```

`node build/system-audit/validate.cjs`, run from the original repository root, orchestrates these
exact checks, isolates environment flags per process, verifies the server hash, and saves logs.

| Log under build/system-audit | Final result |
| --- | --- |
| metadata.log | 5/5 passed; exit 0 |
| metadata-output.log | Four generated reference files checked; exit 0 |
| type-validator.log | Required 2.2 declarations and generated-copy consistency passed; exit 0 |
| patch-final.log | 26 passed, 0 failed/skipped; exit 0 |
| visual-full-final.log | 35 passed, 1 failed (`intouch 01`, 0.47%); exit 1 |
| visual-lite-final.log | 22 passed, 0 failed/skipped; exit 0 |
| visual-plugins-final.log | 7 passed, 0 failed, 2 skipped; exit 0 |

The previous checkout-serving runs returned 26/26 regressions, 36/36 full, 22/22 lite, and 7/9
plugins with the same two skips. Those logs are retained rather than replacing the failed final
full-run record. The screenshot comparator defaults to **0.1%** differing pixels, with a per-pixel
sum-of-RGBA-differences threshold of 6; `test/README.md`'s 1% description is stale.

The touch follow-up uses the snapshot, core mode, lite false:

```powershell
node node_modules/@playwright/test/cli.js test test/scripts/run-visual-tests.js --grep 'intouch 01' --repeat-each=5 --workers=1
```

The original failed candidate is preserved as `build/system-audit/intouch-failure.png`; its extra
connecting line was visually compared with the approved image. The follow-up passed **5/5** with
exit 0; results in `intouch-repeat.log` do not erase the observed full-suite failure. The failing
full run overlapped other Chromium diagnostic work, while this follow-up ran serially. The
fixture's timer gap makes its result sensitive to scheduling; no product touch-state defect is
claimed from this mismatch.

### Diagnostic and package checks

Run from the original repository root, with the snapshot server active:

```powershell
node build/system-audit/probes.cjs
node build/system-audit/variants.cjs
node build/system-audit/contracts.cjs
node build/system-audit/build-probes.cjs
node build/system-audit/harness-probe.cjs
```

- `probes.cjs`: 26 scenarios collected with no probe-setup exceptions. Product errors, pending
  promises, incorrect pixels, and controlled audio/gamepad observations are recorded per scenario.
  Passing controls include live async reads, ready-image name reuse, new-screen pointer state,
  nested clip/origin pixels, 10,000-point batch growth, child drawing after parent removal, and
  clipped paint/text scrolling with zero GL error. The mixed-alpha numerical observation is not
  called a successful alpha correctness test; SYS-006 establishes that representation problem.
- `variants.cjs`: all eight full/lite and minified/unminified ESM/IIFE variants returned opaque red.
  Nine plugin ESM outputs exported initializer functions; the explicitly incomplete pens output
  exported nothing. Imports initialized available plugins; this is not complete plugin behavior
  coverage. Consumer package files were copied into temporary `consumer/node_modules/pijs-web`.
- `contracts.cjs`: AST registration inventory and parameter comparison; one core parameter-list
  mismatch (`getDefaultPal`) and two missing core method records. Optional/example methods absent
  from the core reference were inventoried separately rather than automatically called defects.
- `build-probes.cjs`: repeat build exit 0 with 17 identical outputs; intentionally broken optional
  plugin build incorrectly exit 0; missing release input correctly exit 1 but damaged dist;
  restored build and copier both exit 0. Injection touched only temporary source/generated files.
- `harness-probe.cjs`: independently observed injected page error; visual runner still exit 0,
  one pass. Temporary fixture restored. See `harness-results.json` and injection log.

TypeScript commands, also from the original root:

```powershell
node build/system-audit/tooling/node_modules/typescript/bin/tsc --noEmit --strict --lib es2020,dom build/system-audit/snapshot/build/pi.d.ts
node build/system-audit/tooling/node_modules/typescript/bin/tsc --noEmit --strict --lib es2020,dom --module esnext --moduleResolution bundler build/system-audit/consumer/valid-runtime.mts
node build/system-audit/tooling/node_modules/typescript/bin/tsc --noEmit --strict --lib es2020,dom --module esnext --moduleResolution bundler build/system-audit/consumer/false-positive.mts build/system-audit/consumer/control.mts
```

Results: declaration-only exit 0; supported export/type checks exit 2 with TS2724 and two TS2322
diagnostics; false-positive and ordinary default-import control exit 0. The plugin initializer
check establishes its exported function type; actual manual registration is separately affected
by SYS-013's automatic registration side effect.

### Workspace preservation

The only intended maintained-file addition is this report. Original source, docs, metadata,
configuration, tests, release snapshots, lockfile and approved PNG baselines were not edited.
Historical audit files were preserved. All other new files are under ignored `build/system-audit`:
snapshot copies and dependencies, generated bundles/reference files/release dist, test reports,
candidate screenshots/logs, temporary consumers/compiler, diagnostic scripts/results, hashes,
and held generated plugin output from failure injection. No generated baseline was approved.

The final SHA-256 preservation check verified **773 original tracked files, zero changed, zero
missing**; see `preservation-results.json`. Git status showed only `?? SYSTEM-AUDIT-2.2.md`.
The audit-owned 8081 server is stopped at completion; the pre-existing 8080 server is not stopped.
No changes were staged, committed, published, or deployed.

## 5. Manageable follow-up sequence

Each fix task should add a focused failing test first and keep broader coverage work separate.
Do not bundle all findings into another sweeping release patch.

| Order | Bug-fix task | Acceptance |
| --- | --- | --- |
| 1 | Repair active-screen transitions (SYS-001) | Removing current/last/noncurrent screens keeps every global command aligned; explicit selection repairs bindings; survivors draw normally. |
| 2 | Isolate ready callbacks and deferred read completion (SYS-002, SYS-005) | Every promise settles exactly once, unrelated callbacks continue, and disposal causes defined cancellation without uncaught internal errors. |
| 3 | Make text-input disposal and keyboard dispatch exception-safe (SYS-003, SYS-011) | No timer/listener/background remains after disposal; replacement input works; once/reentrant/throwing callbacks cannot retain held keys. |
| 4 | Give audio loads owned cancellation and single settlement (SYS-004, SYS-018) | Late errors/retries never release another load's wait; removal cancels pending elements/retries and allows clean reuse. |
| 5 | Fix image/font failure publication and numeric state validation (SYS-010, SYS-017, SYS-021, SYS-022) | Failed/removed records can be reused; invalid values leave previous state intact; font rejection publishes nothing. Split image cancellation from small validator fixes. |
| 6 | Bound batch reservations and fix arc/circle rasterization (SYS-007, SYS-015, SYS-016) | Full HD paint completes; oversized work is chunked; full turns match circles; outlines contain no repeated translucent pixels. Use separate commits/tasks for batching and rasterization. |
| 7 | Specify and implement consistent alpha storage (SYS-006) | Direct and layered composition agree across source types, contexts, replace/alpha modes, readback, shader and presentation paths. |
| 8 | Implement context-generation recovery (SYS-008) | Restore invalidates/rebuilds all owned resources; shared users recover together or receive a defined unusable-state error. |
| 9 | Define plugin installation across existing screens and module formats (SYS-009, SYS-013, SYS-014) | Late loading is coherent, ESM/IIFE registration follows one documented contract, and tutorial examples execute. |
| 10 | Correct package declarations and build/copy failure handling (SYS-012, SYS-019, SYS-020) | Positive/negative consumers match runtime; any required plugin failure fails the build; incomplete copy never destroys prior dist. Split types from tooling transactions. |
| 11 | Strengthen the existing visual runner (SYS-023, COV-001) | Unexpected page errors fail tests; intentional errors are declared; touch strokes no longer depend on an unsampled timer gap. |

Broader coverage work, after or alongside focused fix tests:

1. Add a small unit harness for command routing, lifecycle tokens, input dispatch, fake timers,
   gamepad snapshots, and numeric boundaries. Exercise real modules rather than reproducing logic.
2. Add assertion-driven browser lifecycle suites for resource ownership, failure injection,
   reentrant callbacks, disposal during asynchronous work, and repeated reuse.
3. Add rendering equivalence/property checks: direct versus layered images, view translations,
   clipping/scroll isolation, unique primitive pixels, and behavior across batch boundaries.
4. Add clean-package CI consumers for each export and representative documented examples, with a
   real TypeScript compiler. Run supported Node/platform build environments independently.
5. Expand targeted browser/GPU/media coverage after deterministic Chromium tests exist. Review
   missing visual baselines separately; do not approve screenshots to make the suite green.

**Recommended next concrete task:** fix SYS-001 with a focused active-screen removal regression.
It is small, reproducible through the public API, affects ordinary screen navigation, and restores
a core invariant needed by later lifecycle tests. Then address readiness and text-input teardown
before undertaking the larger alpha-representation and context-recovery changes.
