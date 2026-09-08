# Upgrading to Pi.js 2.2

Pi.js 2.2.0 is in development and is not release-ready.

The changes originally planned for 2.1.1 are planned for the 2.2 minor upgrade because
the screen command gains an optional noCss parameter. Both overloads support it:

```javascript
$.screen( aspect, container, isOffscreen, resizeCallback, parent, noCss );
$.screen( { "aspect": "320x200", "container": "game", "noCss": true } );
```

Existing screen positional arguments retain their order. Omitting noCss, or passing false or null,
preserves automatic CSS behavior. The finding IDs PATCH-001 through PATCH-009 are retained in
the [implementation guide](../UPGRADE-2.2.md).

Custom shader maps now align with `u_texture`. **Remove existing `1.0 - uv.y` workarounds
on custom samplers.** Shader UVs remain bottom-left/y-up; drawing coordinates remain top-left/y-down.
Convert UVs to logical screen coordinates with `vec2( uv.x, 1.0 - uv.y ) * u_sourceSize`.
Video textures refresh when drawn or presented, using the most recent decoded frame.

Use `noCss: true` to embed a screen in an existing CSS layout:

```html
<style>
  #game { width: 640px; height: 400px; }
  #game canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
</style>
<div id="game"></div>
<script>
  $.ready( () => {
    const screen = $.screen( { "aspect": "320x200", "container": "game", "noCss": true } );
    screen.circle( 160, 100, 40, "red" );
  } );
</script>
```

The host supplies sizing and positioning. Pi.js still manages logical dimensions, canvas backing
dimensions, and WebGL resources. Presentation backing uses CSS content dimensions before transforms. Explicit background commands still write CSS. Hidden hosts retain
their allocations until a positive layout is available. Mouse and touch use current canvas content
bounds, including borders, padding, scaling, and scrolling; rotated/skewed transforms are excluded.

Pointer subscriptions now register synchronously. A listener added during a callback is available
to nested or later dispatch, but does not join the current dispatch snapshot. Immediate removal,
event clearing, and screen disposal leave no pending registration timer.

Pointer polling, starting, and subscription commands require an onscreen target. Offscreen calls
throw `TypeError` with `OFFSCREEN_INPUT_UNSUPPORTED`, identifying the command and screen. Creating
an offscreen screen makes it active: read input with `visible.inmouse()` or select the visible
screen with `$.setScreen( visible )`. Stop/off/clear operations remain safe on offscreen screens.

Other fixes release image resource waits when callbacks throw, roll back failed screen creation,
cancel old audio duration timers on replay, and initialize plugins when their dependencies become
successfully initialized. Missing/cyclic dependencies remain pending; failed initializers are not
retried and do not release dependent plugins.

The package version is 2.2.0 for development; release preparation is still pending. Updated metadata
is in `metadata/pi-2.2`; `metadata/pi-2.1` retains the original 2.1 documentation.

Video drawImage currently requires explicit video.width and video.height attributes; this upgrade
does not add natural-dimension fallback for unspecified-size videos.

## Image palette swapping removed

Pi.js 2.2 removes usePalette and paletteKeys from loadImage and loadSpritesheet, in both
object and positional forms. This is an intentional breaking API change. Images and sprites
retain their source colors when a screen palette changes; screen palettes remain supported
for drawing colors.

Remove the two palette arguments, including false/null placeholders, before positional callbacks:

```javascript
// Before 2.2
$.loadImage( src, name, false, null, onLoad, onError );
$.loadSpritesheet( src, name, width, height, margin, false, null, onLoad, onError );

// Pi.js 2.2
$.loadImage( src, name, onLoad, onError );
$.loadSpritesheet( src, name, width, height, margin, onLoad, onError );
```

For object calls, remove the usePalette and paletteKeys properties; callback names stay the same.
No compatibility shim is provided. Unknown object properties follow the existing option parsing
behavior and are ignored.

Use the existing createShader/applyShader API for recoloring. See the
[shader API reference](API.md#custom-shaders). No automatic replacement effect is applied.

## Validation

Image palette removal was validated on 2026-09-08:

- `node --test test/unit/image-lifecycle.test.js test/unit/image-lifecycle-browser.test.js`:
  39 passed, including both loader overloads, callback failures, source preservation, and
  palette-independent image/sprite rendering in fresh in-memory full and lite bundles.
- `node --test test/scripts/generate-metadata.test.js test/unit/patch-lifecycle.test.js`:
  28 passed.
- Isolated metadata generation and both metadata/type validators passed. Generated 2.0/2.1
  references retain the palette arguments; 2.2 references and declarations use the new signatures.
  Only the current documentation declarations were copied back; release artifacts were not updated.
- Existing image and shader-orientation fixtures passed 47 and 132 assertions respectively
  in each of the full and lite builds, served from fresh in-memory bundles. No screenshot
  baselines were changed or compared during these assertion checks.
- The existing shader lifecycle fixture stops with `Missing required uniform u_texture`
  at the oriented sampler check. The same failure was reproduced using the unchanged existing
  build, so that fixture could not provide a complete lifecycle result for this change.

On 2026-09-06, all 23 upgrade regression tests and five metadata tests passed. The shader fixture
checks eleven source forms on onscreen and offscreen destinations with asymmetric corners,
identity, consecutive passes, arrays, and display presentation. Browser tests also check resource
accounting, failure injection, CSS/observer ownership, pointer state, and video uploads.

The shader orientation fixture allows an RGB difference of up to 3 on the 0–255 scale, while
requiring opaque alpha. Manual runs reported red as `254,0,1,255` in Brave and `255,1,0,255`
for the video source in Chrome/Edge. These small differences do not indicate flipped corners.
Video color conversion is a possible source; Brave also documents
[canvas readback randomization](https://brave.com/privacy-updates/4-fingerprinting-defenses-2.0/).
The fixture uses timed canvas capture and waits for a decoded video frame instead of requiring
`track.requestFrame()`, which was unavailable in the reported Firefox run. Its temporary repaint
timer stops after decoding or failure; library rendering behavior is unchanged. See the
[canvas capture specification](https://www.w3.org/TR/mediacapture-fromelement/#html-canvas-element-media-capture-extensions).

Controlled Chromium tests reproduced the strict-color and missing-requestFrame failures before
the fixture correction, then passed with it. A deliberately incorrect corner still fails, and
all 132 shader checks pass. These checks do not constitute a rerun of the installed Brave,
Chrome, Edge, or Firefox browsers. Screenshot pixels can still differ with browser color
conversion or privacy settings; the tolerance applies only to this fixture's corner assertions.

Visual results: full 34 passed / 2 skipped; lite 20 passed / 2 skipped; plugins 7 passed / 2 skipped.
No visual comparisons failed. The three new fixtures and existing pi_vision_01 fixture have no
approved baselines. Their candidate images were visually reviewed without changing baselines.

The npm launcher on this machine points to a missing npm-cli.js, so validation invoked the same
repository scripts directly with Node. Chromium required execution outside the sandbox.

To repeat: build with `npm run build`, start `npm run server`, then run `npm run test:patch`,
`npm test`, `npm run test:lite`, `npm run test:plugins`, and `npm run test:types`.
The existing test:patch command name is retained for these regression tests.
