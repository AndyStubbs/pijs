# Pi.js 2.2 Update

Pi.js 2.2 adds host-controlled canvas layout and context recovery, improves rendering performance,
and fixes resource, input, and plugin lifecycle behavior. The image-loading signature changes below
require updates to applications using the old palette arguments.

## Additions

### Host-controlled canvas layout

`screen()` accepts `noCss`, defaulting to `false`. It is the last positional argument, after
`parent`, and is also available in the options object:

```javascript
const screen = $.screen( {
	"aspect": "320x200",
	"container": "game",
	"noCss": true
} );
```

With `noCss: true`, provide the canvas layout in your own CSS. Pi.js still appends the canvas and
manages its intrinsic dimensions and WebGL resources, but does not automatically style the canvas,
container, or document. Explicit background-color commands still apply their requested styles.
Display shaders follow the rendered canvas content size. Hidden hosts retain the last valid
allocation and resume sizing when visible. The option is a no-op for offscreen screens.

### WebGL context recovery

Screens sharing a lost context suspend drawing together. Pending drawing and shader passes are
discarded, and pixel reads return transparent pixels. On restoration, surviving screens rebuild
GPU resources and resume with transparent framebuffers. Screen settings, views, image sources,
font selection, and shader handles remain available.

Applications must redraw their scenes after restoration. Framebuffer contents and GPU-only edits,
including custom glyph pixels, are not preserved. Removing a screen still cancels its pending
reads. See [context recovery](API.md#webgl-context-recovery) for the complete contract.

## Compatibility changes

### Image palette arguments removed

`loadImage()` and `loadSpritesheet()` no longer accept `usePalette` or `paletteKeys`.
Images and sprites retain their source colors when screen palettes change. Drawing colors still
support palettes. No compatibility shim is provided.

Remove both positional arguments, including `false`/`null` placeholders before callbacks:

```javascript
// Previous signatures
$.loadImage( src, name, false, null, onLoad, onError );
$.loadSpritesheet( src, name, width, height, margin, false, null, onLoad, onError );

// Pi.js 2.2
$.loadImage( src, name, onLoad, onError );
$.loadSpritesheet( src, name, width, height, margin, onLoad, onError );
```

For object calls, remove `usePalette` and `paletteKeys`; callback property names stay the same.
Use [custom shaders](API.md#custom-shaders) when recoloring is required.

### Custom sampler orientation

Custom `sampler2D` inputs now align with `u_texture`. Remove any `1.0 - uv.y` workaround previously
applied only to custom image maps. Shader UVs remain bottom-left/y-up, while drawing coordinates
remain top-left/y-down. Convert UVs to screen pixels with
`vec2( uv.x, 1.0 - uv.y ) * u_sourceSize`.

### Consistent alpha and callback behavior

Transparent composition is consistent across drawing, layers, source types, and contexts.
Pixel reads expose straight RGBA colors; shader framebuffer samples use premultiplied alpha.
Custom shader output must follow the [shader alpha contract](API.md#custom-shaders).

`ready()` callbacks run asynchronously. A synchronous callback exception rejects that call's
promise without blocking unrelated waiters. Callback return values are not awaited.
Input cancellation resolves with `null`; completion resources are released before callbacks run.
Pointer subscriptions take effect synchronously, and additions during dispatch enter subsequent
dispatch snapshots. Code depending on deferred subscription timing should account for this.

## Fixes

### Screens and rendering

- Removing or selecting screens keeps global commands bound to the active surviving screen.
- Failed screen creation rolls back DOM insertion, observers, commands, and GPU allocations.
- Mouse and touch coordinates account for CSS scaling, borders, padding, scrolling, and movement.
  Pointer commands on offscreen targets report a command-specific error. Creating a screen changes
  the active screen; explicitly target the visible screen when using offscreen drawing buffers.
- Large drawing operations use bounded batches, including full-screen paint. Full-turn arcs match
  circles, and circle/arc outlines avoid repeated translucent pixels.
- Deferred pixel work settles safely during screen removal or context loss.
- Video textures refresh when decoded frames are available. First use without a decoded frame
  throws `IMAGE_NOT_READY`; otherwise the last valid upload remains available.

### Images, fonts, and colors

- Throwing image callbacks release their resource wait exactly once without hiding the exception.
- Removing loading or failed images releases owned resources and permits immediate name reuse.
  Late events cannot publish a removed image or affect its replacement.
- Synchronous font-loading failures publish no partial font and leave no readiness wait.
  Asynchronous URL failures release readiness but leave the font registered without image data.
- Invalid palette indices preserve the previous drawing color. Gamepad sensitivity rejects
  non-finite values instead of corrupting input state.

### Input and audio

- Text-input cancellation, replacement, and screen disposal settle promises and release timers,
  keyboard handlers, and background resources. Prompts retain their owning screen.
- Keyboard dispatch handles throwing and reentrant callbacks without retaining held keys or
  repeating once-handlers.
- Immediate pointer unsubscription and event clearing prevent listeners from reappearing later.
- Replaying pooled audio clears the previous duration timer, including full-length playback.
- Audio removal cancels owned loads, retries, listeners, and playback. Late events cannot release
  another resource's readiness wait or affect a replacement pool.

### Plugins and distribution

- Plugin dependencies resolve after successful initialization, including late registration.
  Existing screens receive newly initialized plugin state and commands. Failed initializers do
  not release dependents or retry automatically.
- Browser ESM plugin imports register with the browser API; importing a plugin does not require
  registering the same initializer a second time.
- Package declarations describe full, lite, and plugin exports consistently with runtime behavior.
- Required plugin build failures fail the build. Release copying checks inputs and stages a
  complete distribution before replacing the previous one.
- Visual testing excludes copied benchmark runners, reports final outcomes separately from retries,
  and fails on unexpected page errors independently of screenshot differences.

## Performance improvements

- Cached static images and sprites avoid unnecessary WebGL state queries on repeated draws.
- Triangle geometry reserves and copies bounded chunks instead of reserving every vertex.
- Ordinary lines reserve their points together; oversized lines retain bounded writes.

These changes reduce CPU submission work. Benefits depend on workload, browser, GPU, and build;
they do not imply a universal frame-rate improvement.
