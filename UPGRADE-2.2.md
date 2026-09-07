# Pi.js 2.2 minor upgrade guide

Audit date: 2026-09-06. Source baseline: this workspace, package version 2.1.0.
Status: PATCH-001 through PATCH-009 implemented in this workspace. Validation and compatibility
notes are recorded in `docs/upgrade-2.2.md`. Package version 2.2.0 is in development and is not
release-ready.

These changes are now assigned to the 2.2 minor upgrade rather than the originally planned
2.1.1 patch because the screen command gains the optional noCss parameter in both overloads.
Existing positional arguments keep their order; noCss is appended after parent and defaults to
false. PATCH-001 through PATCH-009 remain stable finding IDs for implementation traceability.
Updated metadata is in `metadata/pi-2.2`; `metadata/pi-2.1` retains the original 2.1 documentation.
Package versions are set to 2.2.0 for development; release preparation is still pending.

## Objective and recommendations

Fix reproducible correctness and lifecycle problems while preserving the 2.x API. Include the
requested opt-out from automatic screen CSS. This guide incorporates `docs/no-css-screens.txt`
and `docs/uv-flip-todo.txt`, but treats their proposals separately from verified behavior.

P1 means a failure can block application initialization or leave unusable global state. P2 means
incorrect output or behavior in a specific supported workflow. Priorities are implementation
recommendations, not claims about how often users encounter a problem.

| ID | Priority | Finding | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| PATCH-001 | P2 | Custom samplers disagree with framebuffer orientation | Chromium pixels | Fix and document compatibility |
| PATCH-002 | Addition | Optional no-CSS screen creation | Existing request; source trace | Add `noCss: false` default |
| PATCH-003 | P1 | Throwing image callbacks strand `ready()` | Chromium and source | Fix completion accounting |
| PATCH-004 | P1 | Failed screen creation leaves published partial state | Chromium and source | Make creation transactional |
| PATCH-005 | P2 | Reused audio inherits an old duration timer | Controlled source execution | Clear timer on every playback |
| PATCH-006 | P2 | Pointer subscriptions survive immediate unsubscription | Controlled source execution | Register synchronously |
| PATCH-007 | P1 | Deferred plugin dependencies never initialize reliably | Controlled source execution | Replace one-shot resolver |
| PATCH-008 | P2 | Video textures retain the first frame | Chromium video probe | Refresh video uploads |
| PATCH-009 | P2 | Offscreen pointer input throws an opaque DOM-method error | Controlled source execution | Reject with a command-specific diagnostic |

Implement lifecycle fixes independently; implement PATCH-001 and PATCH-008 together or test each
against the other's texture changes. PATCH-002 needs the sizing and input tests described below.
Do not treat the unconfirmed/deferred list as additional approved fixes.

## PATCH-001: align custom sampler images with u_texture

**Locations:** `src/api/postfx.js`, `getSamplerTextureMap` and display texture resolver;
`src/renderer/textures.js:146`, `getWebGL2Texture`, `copyImageToTexture`, and
`getTextureDrawInfo`; `src/renderer/shaders/display.vert`;
`src/renderer/batches.js:865`, `displayToCanvas`.

**Trigger and evidence:** Create an 8x8 image with an opaque red top half and blue bottom half.
Draw it with `drawImage`, then apply this shader with the same image as `u_map`:

```glsl
#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_map;
out vec4 fragColor;
void main() {
	fragColor = mix( texture( u_map, v_texCoord ), texture( u_texture, v_texCoord ), 0.5 );
}
```

The top pixel should remain red if the sources align. The observed RGB values were:

| Source supplied to drawImage and sampler | drawImage | applyShader | Display after applyShader |
| --- | --- | --- | --- |
| HTMLCanvasElement | 255,0,0 | 128,0,128 | 64,0,192 |
| OffscreenCanvas | 255,0,0 | 128,0,128 | 64,0,192 |
| ImageData | 255,0,0 | 128,0,128 | 64,0,192 |
| ImageBitmap from the canvas | 255,0,0 | 128,0,128 | 64,0,192 |
| Decoded HTMLImageElement | 255,0,0 | 128,0,128 | 64,0,192 |
| Registered canvas name | 255,0,0 | 128,0,128 | 64,0,192 |
| Separate onscreen Screen | 255,0,0 | 128,0,128 | 64,0,192 |
| Offscreen Screen sharing the destination context | 255,0,0 | 128,0,128 | 64,0,192 |
| Offscreen Screen using the separate offscreen context | 255,0,0 | 128,0,128 | 64,0,192 |

The display column is a second application of the mix shader, using the already-purple FBO;
it is not an independent pass over the original red FBO. All samples had alpha 255.
An offscreen destination with a canvas sampler also produced purple. A u_texture-only identity
pass preserved red. Video orientation and non-default ImageBitmap creation options remain untested.

**Root cause:** The display vertex stage maps v_texCoord.y=0 to screen-bottom. Ordinary image
uploads use the source top row at texture Y=0. Screen-copy paths deliberately convert to that
image convention too. Image drawing uses its own coordinate mapping, including `invertedY` for
direct same-context FBO draws. Custom samplers receive ordinary image textures without an
equivalent correction. The tested custom input kinds agree with one another; they disagree with
u_texture. The note's suspected inconsistency between Screen and canvas inputs was not reproduced.

**Correction:** Keep v_texCoord bottom-left/y-up and keep u_texture identity behavior. Normalize
custom sampler textures to the framebuffer orientation without changing ordinary drawImage
textures. Use a separate sampler-oriented cached texture derived by a vertically reversed GPU
copy of the ordinary source texture. Key this cache by source and destination context, and keep
its ownership separate from the ordinary draw cache. This avoids a global upload flag that would
change sprites and fonts, and handles ImageData/ImageBitmap through the existing upload path.

Refresh sampler copies when dynamic sources are resolved; flush earlier queued users before
overwriting a cached texture. Include sampler copies in image/screen deletion, resize invalidation,
and partial-allocation cleanup. Restore framebuffer bindings and rendering state after copies.
Do not rewrite user GLSL or add coordinate-space options in this upgrade.

**Compatibility and documentation:** Shaders that currently apply `1.0 - uv.y` to custom maps
must remove that workaround. Call this out explicitly in upgrade notes and shader examples.
Document the distinction between y-up UVs and y-down drawing coordinates, including
`vec2( uv.x, 1.0 - uv.y ) * u_sourceSize` for conversion to screen pixels. Update shader metadata,
API documentation, and generated LLM/type descriptions from their maintained sources. Do not copy
the note's proposed text saying custom samplers remain mirrored after implementing the correction.

**Acceptance:** Add numbered fixtures with asymmetric corner markers for every documented input
kind, including decoded video, registered/direct forms, and shared/separate-context screens.
Test applyShader on onscreen and offscreen destinations, and display shaders on onscreen
destinations. Offscreen display shaders are documented as inactive; assert that behavior rather
than requiring a visible display pass. Test identity, two consecutive passes, sampler arrays,
dynamic updates, earlier queued draws, deletion, and use of one source by both rendering paths.
Validate pixel positions independently in each pass rather than relying only on the mix probe.

## PATCH-002: opt out of automatic screen CSS

**Locations:** `src/core/screen-manager.js:282`, `screen`; `setDefaultCanvasOptions` at 497;
`applyScreenSizing` and `setCanvasSize` at 976; `metadata/pi-2.2/screen.toml`.
This is a requested addition, not a demonstrated violation of the current screen contract.

**Current writes:** Creation sets canvas outline, backgroundColor, position, and imageRendering.
For a body container it also sets canvas left/top and html/body height, margin, and padding.
It sets container overflow and supplies a 200px container height when its height is zero.
Every sizing pass writes canvas width, height, marginLeft, and marginTop styles. Merely skipping
setDefaultCanvasOptions is insufficient: resize and display-shader changes would still write CSS.

**Public interface:** Add optional boolean `noCss`, default false, to the screen options object
and append it after `parent` in the positional signature. Validate non-null supplied values as
booleans, using a TypeError with `INVALID_PARAMETER`. Store the normalized flag per screen.

```javascript
const screen = $.screen( {
	"aspect": "320x200",
	"container": "game",
	"noCss": true
} );
```

**Semantics:** With noCss true, automatic creation, resizing, and display-shader setup/teardown
must not write canvas, container, html, or body styles. Still append the canvas, set its tabIndex
and dataset, and manage its intrinsic width/height and WebGL resources. Explicit calls such as
setBgColor and setContainerBgColor continue to apply the CSS the caller requests. Offscreen
screens accept the option as a no-op because they have no displayed layout.

Keep logical x/e/m aspect sizing based on the container, preserving existing logical sizing rules.
The host controls rendered canvas size and positioning through CSS; Pi.js performs no fit or
centering CSS when opted out. For display shaders, derive presentation backing size from the
actual rendered canvas dimensions instead of the hypothetical auto-fit dimensions. Observe the
canvas as well as its container for host CSS size changes, with change checks to prevent resize
feedback loops. Preserve the last valid allocation while the host is zero-sized, and resume when
it has positive dimensions. The host must provide a usable layout; no 200px fallback is injected.

**Input:** Mouse/touch currently consume cached clientRect; mouse uses offsetX/Y while touch
subtracts rect.left/top from client coordinates. Refresh bounds at input handling and use
consistent client-coordinate-to-content-box conversion for ordinary scaling, borders, padding,
and scrolling. Rotated/skewed CSS transforms are outside this upgrade. Callback fromSize/toSize
continue to describe actual CSS dimensions. Test canvas-only CSS changes and movement without
container resizing; observing the container alone cannot establish fresh touch positions.

**Acceptance:** Snapshot style attributes of html/body/container/canvas after creation and after
resize, shader toggles, and canvas CSS changes. No automatic style mutations are allowed when
true. Verify default/false behavior against existing fixtures. Cover custom and body containers,
zero-sized/hidden hosts becoming visible, all aspect modes, offscreen screens, explicit background
commands, pointer hit positions, and disposal of the extra observer subscription. Update source
JSDoc, metadata, both screen overloads, generated references, and an embedding example.

## PATCH-003: settle image loading even when callbacks throw

**Locations:** `src/api/images.js:223` and 231, loadImage handlers;
`src/core/commands.js:179`, checkReady and wait/done accounting.

**Reproduction:** After initial `await $.ready()`, load a data-URL image with an onLoad callback
that throws. Register another `$.ready()` promise. Chromium delivered the callback exception, but
the ready promise did not settle within 200ms after successful image decoding.

**Root cause:** onload calls updateImageFn, which invokes the user callback, before done(). An
exception skips the decrement. onerror has the same ordering around its user callback. The source
proves the wait count is left outstanding; the timed probe alone is not the proof of permanence.

**Correction:** Put completion accounting in a finally block for each terminal image event and
guard it against double settlement. Preserve the original callback error's visibility. Do not
convert a user onLoad exception into a network failure or mark the decoded image unusable.

**Acceptance:** Success and error paths, throwing and nonthrowing callbacks, multiple concurrent
loads, spritesheet callbacks routed through loadImage, and subsequent ready calls. Each resource
must release exactly one wait. An error from one callback must not strand unrelated resource waits.

**Related open issue:** checkReady itself invokes each callback before resolving its promise and
has no per-callback exception isolation. This can abandon the detached callback batch. Reproduce
separately before expanding this fix; define promise rejection semantics explicitly if addressed.
No public signature change is required for the confirmed image-accounting fix.

## PATCH-004: roll back failed screen creation

**Locations:** `src/core/screen-manager.js:282`, screen; `src/renderer/renderer.js`, createContext
and createTextureAndFBO; screen cleanup hooks and active-screen command binding.

**Reproduction:** Create a working screen. Temporarily make canvas.getContext("webgl2") return
null, then request another screen. Restore getContext after the call. Chromium threw the expected
WebGL creation error, but the document contained one extra canvas.

**Root cause:** Canvas insertion, observation, and canvas-map publication precede renderer setup.
The screen is also assigned to m_activeScreenData and m_screens before createContext can throw.
There is no rollback. Source inspection establishes registry/active-state pollution in addition
to the measured DOM leak. Later allocation failures can similarly leave partial GPU resources.

**Correction:** Treat construction as a transaction. Retain the previous active screen, track
completed setup stages, and undo them on failure. Delete any created textures/FBOs/buffers/programs,
remove the canvas/map/registry entries, and unobserve a container only when no other screen uses
it. Restore prior active commands. Use null-safe partial cleanup rather than assuming normal
removeScreen can handle an uninitialized renderer. Restore automatic style values changed by this
attempt where still owned by it; never undo another screen's styles. Do not reuse failed IDs.

**Acceptance:** Inject getContext, texture/FBO allocation, and module-init failures. Assert DOM,
registries, observer membership, active commands, and GPU allocation counts return to their prior
state; existing screens remain drawable; a later successful screen can be created and removed.
For shared contexts, do not destroy the parent context or its resources. Preserve error codes.

## PATCH-005: clear a pooled audio player's previous stop timer

**Location:** `plugins/sound/sound.js:429`, playAudio; timer branch at 489.

**Reproduction:** Load a pool of size one, play with duration 10, then replay the same pool with
duration 0 before ten seconds elapse. Controlled execution of the actual module with fake Audio
and timers left one old timer; firing it paused the second playback once unexpectedly.

**Root cause:** clearTimeout is inside the duration > 0 branch. A full-length replay skips that
branch and inherits the previous playback's scheduled pause/reset.

**Correction:** Clear and reset the selected pool item's timeout on every playAudio call before
optionally creating a new duration timer. Reset the stored handle when the timer fires. Keep the
existing round-robin behavior and API unchanged.

**Acceptance:** Finite-duration to full-length replay, finite to finite, multiple pool slots,
stopAudio, and removeAudio. Use fake timers for exact assertions; no audible/manual test is needed
to prove cancellation. Ensure cancelling one slot's timer does not affect another slot.

## PATCH-006: make pointer registration and removal deterministic

**Location:** `plugins/pointer/shared-events.js:11`, onevent; offevent and caller cleanup paths
in mouse, touch, and press modules.

**Reproduction:** Register a move listener, then immediately remove that function in the same
turn. Controlled execution returned false from offevent; advancing the registration timer left
one active listener. This uses the shared helper consumed by public pointer commands.

**Root cause:** onevent schedules insertion with setTimeout(..., 1), while offevent only sees
listeners already inserted. Immediate cleanup cannot cancel the pending insertion.

**Correction:** Insert validated subscriptions synchronously. triggerEventListeners already
iterates a snapshot, so callbacks registered during a dispatch need not run in that dispatch.
Preserve once/customData/hitbox behavior and removal by original callback identity. Audit callers
that relied on deferred insertion, especially onscreen-keyboard show/hide and screen cleanup.

**Compatibility:** A listener becomes available immediately, consistent with synchronous removal.
Test nested dispatch explicitly; document this small timing correction if observable to clients.

**Acceptance:** on/off in one turn; on/clearEvents in one turn; screen removal before the next
timer turn; registration inside callbacks; once listeners; mouse/touch/press and hitbox listeners.
No callback may reappear after cleanup, and current dispatch must not visit newly inserted entries.

## PATCH-007: resolve plugin dependencies after registration

**Location:** `src/core/plugins.js:43`, deferred dependency pass, registerPlugin, initializePlugin.
The generated registerPlugin contract promises waiting until dependencies are registered.

**Reproduction and evidence:** Execute the module with command registration stubbed and capture
its scheduled microtask. Register dependent A requiring B, then B. Running the microtask throws
`pluginInfo.dependencies is not iterable`; only B initializes. If the initial microtask runs
before A/B registration, no exception occurs but A remains uninitialized forever. Both outcomes
were reproduced with the actual source in Node VM, not a reimplementation of the resolver.

**Root causes:** Dependencies live on pluginInfo.config.dependencies, not pluginInfo.dependencies.
The only deferred scan is scheduled during core init, rather than when new plugins arrive.
Registration checks presence rather than successful initialization, which can also misorder chains.

**Correction:** Normalize/validate dependencies as an array of nonempty strings before publishing
a record. After every registration, run a guarded resolution pass: initialize pending plugins
whose dependencies are initialized; repeat while progress is made. Each plugin initializes at
most once. Support plugins registered by another initializer without recursive duplicate work.
Missing/cyclic dependencies remain pending and visible as initialized:false through getPlugins;
do not spin or report them as initialized. Retain PLUGIN_INIT_FAILED for initializer exceptions
and do not release dependents of failed plugins. No new public API is needed.

**Acceptance:** Immediate A-after-B, A-before-B in one turn and different turns, A->B->C chains,
unrelated plugins, duplicates, missing dependencies, cycles, initializer failure, and registration
inside an initializer. Verify both lite plus separately loaded plugins and the full bundle. Include
pi-vision and onscreen-keyboard dependency combinations. Update tests around documented readiness.

## PATCH-008: refresh video textures after the first frame

**Locations:** `src/renderer/textures.js:146`, getWebGL2Texture cached-source branch;
`src/api/images.js:776`, accepted image kinds; custom sampler resolution in postfx.

**Reproduction:** Capture an 8x8 canvas into a muted video using captureStream(0), setting video
width/height to eight. Request a red frame and wait for requestVideoFrameCallback. drawImage(video)
reads red. Request a green frame and wait for its callback, then draw the same video again.
Chromium Canvas2D read the video's current pixel as [0,255,0,255]; Pi.js still read [255,0,0,255].

**Root cause:** Cached textures refresh HTMLCanvasElement, OffscreenCanvas, and mock canvases only.
HTMLVideoElement is accepted by image resolution but falls through to returning the old texture.
The same cache is used for custom sampler inputs. The live probe exercised drawImage; sampler
staleness is established by the shared code path, not a separate video-sampler measurement.

**Correction:** Treat a video with decoded frame data as dynamic, refreshing on each texture
resolution. Flush prior queued users before replacing the upload, as for canvases. Do not upload
an undecoded video frame: retain the previous valid texture, or report IMAGE_NOT_READY on first
use. Include sampler-oriented copies from PATCH-001 in refresh and cleanup. Do not introduce a
per-video rendering loop; a new frame becomes visible when the application draws/presents.

**Acceptance:** Two distinct decoded frames, paused video, no decoded frame yet, video sampler
updates on applyShader and display presentation, shared source across screens, and queued earlier
draw preservation. Use a generated local stream or deterministic local media; no network URLs.
Also check natural video dimensions separately: the existing sprite path reads img.width/height,
and the probe deliberately specified them. Do not claim unspecified-size video rendering passed.

## PATCH-009: explain unsupported pointer input on offscreen screens

**Locations:** `plugins/pointer/mouse.js:69`, startMouse and inmouse at 110;
`plugins/pointer/touch.js:60`, startTouch and intouch at 89; `plugins/pointer/press.js`, inpress
and subscription commands; `src/core/screen-manager.js`, offscreen mock canvas construction;
`src/core/commands.js:84`, processCommand and processScreenCommands.

**Trigger:** Creating a screen makes it active, including an offscreen screen. Consequently this
sequence directs the global input call to the offscreen screen:

```javascript
const visible = $.screen( "320x200" );
const buffer = $.screen( { "aspect": "320x200", "isOffscreen": true } );
$.inmouse();
```

**Evidence:** Bundled the current pointer plugin in memory and executed its registered commands
with its real default state and initialization hooks, supplying the offscreen mock-canvas shape
used by screen-manager. inmouse, intouch, and inpress each threw a TypeError with this message:

```text
screenData.canvas.addEventListener is not a function
```

The error had no code property; its first stack frame named internal startMouse or startTouch,
not the public polling command. startMouse, startTouch, onmouse, ontouch, onpress, onclick, and
setEnableContextMenu produced the same error. The corresponding three polling calls succeeded
with an event-capable onscreen canvas stub. These are controlled source reproductions, not a new
Chromium integration run; source tracing verifies that both global and screen-bound APIs route
to these same handlers.

**Root cause:** Offscreen screenData.canvas is a plain mock object with dimensions and rendering
references, not a DOM event target. Polling automatically starts the relevant device listeners
without checking isOffscreen. A parent only supplies WebGL context affinity and does not turn the
offscreen screen into an input target. This affects parent-affiliated offscreen screens as well.
Keyboard inkey and gamepad ingamepad are registered globally, so this is not a blanket restriction
on all input APIs.

There are two related consequences. Calling stopMouse first lets offscreen inmouse return a
synthetic centered mouse state, making behavior depend on a previous stop call. Also, the four
subscription calls queued registration timers before failing in the probe. Validation must precede
both listener registration and device-state changes; PATCH-006 alone does not fix this error.

**Correction:** Add a shared pointer-target validator and call it at the public entry points for
inmouse, intouch, inpress, startMouse, startTouch, onmouse, ontouch, onpress, onclick, and
setEnableContextMenu. For isOffscreen, throw a TypeError with code `OFFSCREEN_INPUT_UNSUPPORTED`
before any mutation, regardless of stopped flags. Include the invoked command and screen ID:

```text
inmouse: Screen 1 is offscreen and cannot receive pointer input. Call inmouse() on an onscreen
screen, or select an onscreen screen with setScreen() first.
```

Preserve the outer command name: inpress must report inpress rather than an internal startMouse
failure. Keep stop/off/clear/disposal operations safe on offscreen screens; they must not activate
listeners. Do not add fake DOM listener methods or silently redirect input to a parent/last visible
screen. Preserve global keyboard/gamepad behavior and ordinary screen-bound input routing.

**Workaround and documentation:** Read input from the visible screen explicitly while rendering
into an offscreen buffer, or restore the active visible screen first:

```javascript
const mouse = visible.inmouse();
// Alternatively:
$.setScreen( visible );
const currentMouse = $.inmouse();
```

Document the onscreen-only target requirement and error in the affected pointer metadata and
generated references, and note in screen documentation that creation changes the active screen.
No signature change is needed. The intentional compatibility change is a deterministic diagnostic
instead of the raw error or synthetic stopped-device result.

**Acceptance:** Test fresh offscreen screens with and without parent contexts; global calls while
offscreen is active and explicit buffer-bound calls; each affected command's message, code, and
screen ID; polling after stop calls; and no state/timer/listener changes on failure. Verify
visible.inmouse/intouch/inpress still work while an offscreen screen remains active, and that
setScreen(visible) restores global polling. Test stop/off/clear/removal on offscreen screens,
including advancing timers after a rejected subscription. Check global keyboard/gamepad routing
separately. Use direct error/state assertions, not screenshot-only comparisons.

## Unconfirmed, deferred, and rejected candidates

- **Pending/failed image removal:** removeImage only deletes a record with a truthy image field.
  A loading or errored record therefore survives. The documented removal contract is broader.
  Follow up with delayed network completion and remove/reload of the same name; specify cancellation
  and late-callback ownership before adding a separate fix. Do not fold it silently into PATCH-003.
- **Context restoration:** renderer context-restored listeners clear contextLost without rebuilding
  resources; shared-context ownership makes recovery a larger change. Reproduce with context-loss
  injection and scope separately. No restoration guarantee was validated by this audit.
- **Readback after disposal:** async readback runs in a later microtask. Removal between request and
  execution may access cleared screen data. Reproduce and define rejection semantics before fixing;
  do not change the documented timing of otherwise-valid async reads incidentally.
- **Gamepad validation:** setGamepadSensitivity accepts NaN through its comparisons and can propagate
  NaN to axes. This is a source-level candidate, not a hardware-tested finding. A mocked gamepad test
  should establish it before adding a finite-number check to upgrade scope.
- **Additional geometry edge cases:** full-turn arc normalization, negative/degenerate dimensions,
  and large geometry batches warrant targeted boundary fixtures. No additional geometry defect is
  claimed from the selective review alone.
- **Shader enhancements:** defer v_screenCoord, u_texelSize, coordSpace, and a y-down v_texCoord default.
  They are not necessary to correct sampler alignment in 2.2.
- **Not bugs under current contracts:** offscreen display shaders do not execute; parent establishes
  context affinity, not child lifetime ownership; polygon point collections are documented immutable.
  Preserve these behaviors. Pens is explicitly marked incomplete; completing it is outside this upgrade.

## Validation checklist for the future implementation

Add deterministic numbered HTML fixtures with the required TOML block under html-core or
html-plugins. Reuse the existing comprehensive shader/lifecycle fixtures where appropriate, but
use asymmetric images: the inspected screen-sampler checks use solid colors and cannot detect Y
orientation. Add direct assertions for callback completion, registry ownership, timers, and event
counts; screenshot equality alone cannot establish these properties.

During implementation, update maintained metadata in metadata/pi-2.2 and relevant plugin metadata,
then regenerate declarations/reference output through the existing scripts. Review docs/API.md,
docs/llms/llms.txt, docs/llms/llms-full.txt, and docs/llms/pi.d.ts for matching behavior and signatures.
Generated build files must not be hand-edited or committed incidentally.

Run these commands from the repository root in the implementation session:

```powershell
npm run build
npm run server
```

With the server running in a separate terminal:

```powershell
npm test
npm run test:lite
npm run test:plugins
npm run test:types
```

For focused work, `npm run test:grep -- "Shader"` selects by fixture test name; inspect the
new fixture's TOML name before choosing a pattern. Review candidate PNGs in
test/tests/screenshots/new visually. Never approve new baselines solely because they differ.
Run applicable suites again after combined texture/sizing changes, and review the full/lite and
plugin exports. The type checks are string/metadata validation, not a complete TypeScript compiler
or behavioral compatibility test. Version bump, release copy, and publishing belong to later work.

## Audit coverage and actual checks

This was a whole-library risk scan with deeper tracing and probes around findings, not exhaustive
line-by-line verification or a clean bill of health for every module.

| Area | Inspection performed | Limits |
| --- | --- | --- |
| Screens and views | Creation, CSS, resize, removal, nested origin/clip/cursor state | No full resize/view regression suite |
| Renderer | Texture paths, batching/state boundaries, effects, readback, shader UVs, resource setup | Selected geometry paths; no GPU stress test |
| Images, colors, text | Loading/callbacks, palette changes, draw inputs, font loading, print wrap/scroll | No exhaustive font/palette visual comparisons |
| Core API/plugins | Entry points, command readiness, plugin registration and dependency resolution | No full package-consumer matrix |
| Input and sound | Pointer helpers/conversion, keyboard handlers, gamepad polling, audio lifecycle | No physical gamepad or audible playback testing |
| Optional plugins | Polygon validation/cache contract, print-table entry path, onscreen-keyboard cleanup, pi-vision composition/cleanup, pens status | Selective inspection; no plugin visual suite |
| Docs and tooling | Existing notes, 2.1 upgrade guide, shader/screen metadata, declarations, build and test scripts | Did not regenerate documentation or bundles |

Executed checks:

- Built src/index-full.js in memory with esbuild write:false, matching shader text/font data loaders
  and injecting the package's 2.1.0 version. Browser probes used this current source bundle rather
  than assuming build/pi.js was current. Node version: 22.19.0.
- Headless Chromium 141.0.7390.37 on Windows: nine-source shader pixel comparisons, one offscreen
  apply destination, identity shader, failed-context creation, throwing onLoad, and live video frame
  refresh. Canvas display readback used preserveDrawingBuffer output. Initial shader probe omitted
  required u_texture and was rejected; the corrected probe produced the results reported above.
- Node VM execution of actual sound, pointer-helper, and plugin-registry sources with controlled
  browser/timer/service stubs reproduced PATCH-005, PATCH-006, and PATCH-007. These are focused
  logic reproductions, not browser integration or physical-device tests.
- Follow-up for PATCH-009: in-memory esbuild bundle of the actual pointer plugin, executed in
  Node VM with real plugin defaults/init hooks and mock event targets. Reproduced ten opaque
  command failures, three successful onscreen polling controls, stopped-offscreen synthetic mouse
  data, and four queued subscriptions from failed calls. No source or fixture changes were made.
- `node --test test/scripts/generate-metadata.test.js`: 5/5 passed.
- `node scripts/validate-metadata-output.js`: passed, three reference files checked.
- `node scripts/validate-type-definitions.js`: passed for existing required 2.1 declarations.

Browser launch initially failed with sandbox EPERM; approved execution outside the sandbox then
succeeded. Temporary probes were stored outside the repository. No approved screenshots, source,
fixtures, metadata, versions, or generated bundles were modified for this audit. The full visual,
lite, and plugin suites were not run. Standard build and test:types commands were deliberately
not used because they regenerate files; the read-only validators were run directly instead.

Only this guide is the intended persistent repository change. Before implementation, reproduce
each selected issue against that session's source and retain the evidence boundaries above.
