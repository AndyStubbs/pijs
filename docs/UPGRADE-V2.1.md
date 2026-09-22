# Pi.js 2.1 Update

Pi.js 2.1 expands the WebGL 2 rendering and composition APIs from 2.0. This guide covers
features, behavior changes, performance, and fixes when moving from any 2.0.x release to 2.1.0.

The main additions are custom fragment shaders, nested drawing views, and shared-context
offscreen screens. Version 2.1 also tightens GPU resource validation and cleanup. No documented
2.0 commands were removed, so most 2.0 applications can upgrade without code changes.

Applications moving directly from v1.2.4 should read the [v2 guide](UPGRADE-V2.md) first. The
2.0 architectural and API changes still apply.

## Upgrade at a glance

### Existing 2.0 applications

- Drawing, image, text, input, sound, and plugin code stays compatible.
- No documented 2.0 commands were removed or renamed.
- Custom shaders, views, and parented offscreen screens are opt-in.
- Applications that skip the new APIs should behave as they did in 2.0.

### New capabilities

- Create custom GLSL ES 3.00 fragment shaders.
- Apply a shader pass at a point in draw order.
- Replace the final presentation shader for scaling and display effects.
- Use nested local coordinates with automatic clipping.
- Convert points between view-local and screen coordinates.
- Share a parent's WebGL context with an offscreen screen.
- Inspect and release custom shader resources.

### Behavior to review

- `width()` and `height()` return the active view's requested size inside a view.
- Display shaders can change the canvas backing-store size without changing logical size.
- Input coordinates stay screen-relative while a view is active.
- Shader passes process the full logical framebuffer, not only the active view.

## Additions

### Custom fragment shaders

`createShader()` creates a screen-independent shader and returns a numeric handle. The
application supplies GLSL ES 3.00 fragment source. Pi.js supplies the vertex shader.

- Source must include `#version 300 es`.
- The shader must declare `uniform sampler2D u_texture` before it can be applied.
- Programs are compiled, linked, validated, and cached per WebGL screen.
- Compilation is synchronous the first time the shader is used on a screen.

```javascript
const invert = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;

void main() {
	vec4 color = texture( u_texture, v_texCoord );
	fragColor = vec4( 1.0 - color.rgb, color.a );
}` );

$.screen( "320x200" );
$.circle( 160, 100, 40, "red" );
$.applyShader( invert );
```

### Draw-order framebuffer shaders

`applyShader( shaderHandle, uniforms )` queues a shader at the current draw position.

- Drawing before the call is processed by the shader.
- Drawing after the call appears on top of the processed result.
- The pass uses the logical framebuffer at logical screen resolution.
- `u_sourceSize` and `u_outputSize` both contain the logical screen size.
- Framebuffer shaders work on onscreen and offscreen screens.
- The pass breaks the current batch and runs when pending batches flush.
- The active view does not limit the pass. The complete framebuffer is processed.

```javascript
$.rect( 10, 10, 40, 40, "red" );
$.applyShader( invert );
$.line( 0, 0, 80, 80, "white" );
```

In this example the rectangle is inverted. The line is drawn afterward and is not processed by
that invocation.

### Display shaders

`setDisplayShader()` replaces the shader that presents the logical framebuffer.

- Display shaders do not modify pixels stored in the logical framebuffer.
- They fit CRT simulation, color grading, scanlines, and custom upscaling.
- `setDisplayShader( null )` restores the default presentation path.
- `setDisplayShaderUniforms()` updates persistent uniform overrides and presents again.
- A display shader is stored per screen.
- Display shaders do not run for offscreen screens, although their state can be stored.

```javascript
const tint = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_gain;
out vec4 fragColor;

void main() {
	vec4 color = texture( u_texture, v_texCoord );
	fragColor = vec4( color.rgb * u_gain, color.a );
}`, {
	"u_gain": 1
} );

$.screen( "320x200" );
$.setDisplayShader( tint );
$.setDisplayShaderUniforms( { "u_gain": 0.6 } );

// Restore normal presentation later.
$.setDisplayShader( null );
```

### Built-in shader uniforms

- `u_texture` (`sampler2D`) is the framebuffer being processed.
- `u_sourceSize` (`vec2`) is the source framebuffer size.
- `u_outputSize` (`vec2`) is the shader output size.
- `u_time` (`float`) is the rendering time for animated effects.
- `u_frame` (`int`) is the presentation frame counter.
- A shader may declare only the built-in uniforms it uses.
- Pi.js owns built-in values. Custom uniform maps cannot override them.
- Texture unit 0 is reserved for `u_texture`.

### Custom shader uniforms

- Default values may be the second argument to `createShader()`.
- Values passed to `applyShader()` override defaults for that pass only.
- Values passed to `setDisplayShader()` replace prior persistent display overrides.
- `setDisplayShaderUniforms()` merges values into the current persistent overrides.
- Unknown uniform names are ignored.
- Known uniforms with invalid types or component counts throw synchronously.

Supported values:

- Scalar `float`, `int`, `uint`, and `bool`
- Float, integer, unsigned integer, and boolean vectors
- Square and non-square GLSL ES 3.00 matrices
- Uniform arrays
- `sampler2D` images and sampler arrays
- Flat JavaScript arrays, `Float32Array`, `Int32Array`, and `Uint32Array`

Matrices use WebGL column-major order. Vectors, matrices, and arrays must contain exactly the
component count reported by shader reflection.

### Image sampler uniforms

`sampler2D` accepts a registered Pi.js image name or a browser image source supported by
`drawImage()`.

- Sources include image, video, canvas, bitmap, image-data, and offscreen-canvas objects.
- A Pi.js screen can be a sampler source.
- Sampler arrays take one image source per element.
- A shader cannot sample the screen it is currently presenting into.
- Queued `applyShader()` passes snapshot sampler textures when queued.
- Display shaders keep sampler sources and refresh dynamic canvas or screen content when the
  destination screen is presented.

### Shader diagnostics and cleanup

`getShaderInfo( shaderHandle )` returns a copied diagnostic snapshot. It does not compile the
shader or allocate GPU resources.

- Global information includes source, default uniforms, compiled-screen count, queued-pass
  count, and active-display-screen count.
- With an active screen, the result also reports that screen's compilation state, queued
  passes, display use, and reflected uniforms.
- Reflected uniform information includes name, GLSL type, array size, and reserved status.

`removeShader( shaderHandle )` completes queued passes, clears the shader from screens using it
for presentation, deletes cached WebGL programs, and invalidates the handle. Removing an
unknown or already removed numeric handle does nothing.

```javascript
const info = $.getShaderInfo( invert );
console.log( info.compiledScreenCount );
console.log( info.queuedPassCount );

$.removeShader( invert );
```

### Nested drawing views

`pushView( x, y, width, height )` creates a local drawing region.

- The child origin is relative to the current view's local origin.
- Coordinates inside the child start at `(0, 0)`.
- Child drawing is clipped to the intersection of the child and all parent clips.
- Views can nest as panels, windows, HUD regions, or component layouts.
- A requested width or height of zero is valid and creates an empty region.
- Changing the view flushes pending drawing so operations keep their view state.

```javascript
$.screen( "320x200" );
$.print( "Main screen" );

$.pushView( 20, 20, 100, 60 );
$.cls( 1 );
$.print( "Local panel" );

$.pushView( 8, 16, 60, 30 );
$.rect( 0, 0, 80, 40, "red" );
$.popView();

$.popView();
$.print( "Back on the main screen" );
```

### View stack and print cursor

- Each `pushView()` saves the parent view's print cursor.
- A new child view starts its print cursor at `(0, 0)`.
- `popView()` restores the parent view and its saved print cursor.
- Popping the last view returns to implicit full-screen drawing.
- `popView()` on an empty stack throws `VIEW_STACK_EMPTY`.
- `resetView()` clears the stack and resets the cursor to `(0, 0)`.
- `resetView()` is safe when no view is active.
- `resetView()` does not restore cursors saved by discarded nested views.
- Text wrapping and scrolling use the active view's requested size and effective clip.

### View-aware drawing and reading

Shapes, lines, images, sprites, pixels, paint, clearing, and text use local coordinates.

- Pixel output is limited to the effective view clip.
- `paint()` cannot flood outside the active clip.
- Screen reads are reduced to the portion inside the active clip.
- `getPixel()` rejects positions outside the clip, even inside the framebuffer.
- `cls()` with no rectangle clears the active view.
- A full-view clear resets that view's print cursor to `(0, 0)`.
- The logical framebuffer size does not change when views are pushed or popped.

### View coordinate conversion

Input events stay relative to the logical screen, not the active view.

- `viewToScreen( x, y )` converts a local view point to screen/framebuffer coordinates.
- `screenToView( x, y )` converts a screen/framebuffer point to local view coordinates.
- Both return a new object with `x` and `y` properties.
- Conversions use the requested logical origin, not the clipped origin.

```javascript
$.pushView( 40, 20, 100, 80 );

const localMouse = $.screenToView( mouseX, mouseY );
const screenOrigin = $.viewToScreen( 0, 0 );

console.log( localMouse.x, localMouse.y );
console.log( screenOrigin.x, screenOrigin.y );

$.popView();
```

### Shared-context offscreen screens

`screen()` accepts an optional `parent`.

- `parent` may be an existing screen API object or screen ID.
- It is valid only when `isOffscreen` is `true`.
- The offscreen screen uses its parent's WebGL context.
- `drawImage()` can then draw that framebuffer directly in the parent context.
- Parent selection controls rendering-context affinity only.
- Removing a parent does not remove its offscreen children.

```javascript
const main = $.screen( { "aspect": "320x200" } );
const layer = $.screen( {
	"aspect": "160x100",
	"isOffscreen": true,
	"parent": main
} );

layer.cls( 0 );
layer.circle( 80, 50, 30, "red" );

main.drawImage( layer, 80, 50 );
```

## Behavioral changes

### `width()` and `height()` follow the active view

With no active view, they return the logical framebuffer size. With an active view, they return
the requested local width and height, not the smaller effective clip when a view extends
outside its parent.

Code that needs the full-screen size should store it before `pushView()`, or read it after the
view stack is reset.

### Display shaders change presentation size

Without a display shader, the canvas backing store uses the logical screen size. With a display
shader, the backing store tracks the CSS presentation size, subject to renderer limits. The
logical framebuffer and drawing coordinates stay the same.

- `u_sourceSize` reports the logical size.
- `u_outputSize` reports the canvas backing-store size.
- Clearing the display shader restores the default logical backing store.

Keep using `width()` and `height()` outside a view for logical drawing size while a display
shader is active.

### Input stays screen-relative

Activating a view does not transform keyboard, mouse, pointer, touch, or gamepad input. Mouse
and touch positions stay in logical screen coordinates. Use `screenToView()` when comparing
input with local view content.

### View resizing

View definitions keep their requested local rectangles. When a screen resizes, Pi.js recomputes
origins and clips from those rectangles. An area clipped by the old screen size can become
visible after the screen grows. Stored print cursors may be normalized to the resized local
view.

### Shader validation

Invalid source, a missing `u_texture`, compilation errors, and link errors throw synchronously
when the shader is first applied to a screen. Invalid uniform shapes and types throw before a
pass or display-state change is committed. A failed shader does not leave rendering blocked.
Applications can catch shader errors and continue drawing.

## Fixes and resource management

### Offscreen image orientation

Drawing an offscreen screen as an image no longer reverses its Y axis when the source and
destination share a WebGL context. Remove manual flips that existed only to correct that case.

### Image removal

`removeImage( name )` finishes queued draws that reference the image, then releases associated
WebGL textures on every screen. Drawing the removed name afterward throws `IMAGE_NOT_FOUND`.

### Shader resource cleanup

Failed compilation cleans up shader-stage resources. Screen cleanup releases cached shader
programs and display-shader references. `removeShader()` disposes a shader explicitly.

### Framebuffer and texture cleanup

Temporary framebuffers used for texture copies are reused. They are deleted when their screen
is removed. Texture updates and deletions account for queued batches.

## API compatibility

Pi.js 2.1 does not remove or rename any documented 2.0 API.

New commands:

- `createShader( fragmentSource, uniforms )`
- `applyShader( shaderHandle, uniforms )`
- `setDisplayShader( shaderHandle, uniforms )`
- `setDisplayShaderUniforms( uniforms )`
- `getShaderInfo( shaderHandle )`
- `removeShader( shaderHandle )`
- `pushView( x, y, width, height )`
- `popView()`
- `resetView()`
- `viewToScreen( x, y )`
- `screenToView( x, y )`

Extended commands:

- `screen()` accepts `parent` as the fifth positional argument or as an options property.
- `width()` returns the requested active-view width when a view is active.
- `height()` returns the requested active-view height when a view is active.
- `removeImage()` flushes queued users and releases GPU textures.

New data:

- `ShaderUniforms` maps GLSL uniform names to scalars, arrays, typed arrays, or images.
- `ShaderInfo` describes source, defaults, lifecycle counts, and per-screen reflection.
- Coordinate conversion functions return objects with `x` and `y` properties.

## Migration

### Update the library

Replace 2.0 bundles with the matching 2.1 bundles. Keep full, lite, ESM, and IIFE variants
consistent with the variant already in use. Update separately loaded plugin bundles at the same
time. Do not mix 2.0 core with 2.1 type definitions.

### Verify existing code first

Run the application before adopting new features. Check drawing order, offscreen composition,
image removal, and screen resizing. Remove any Y-axis flip used only for same-context offscreen
drawing. Confirm the application does not depend on textures remaining after `removeImage()`.

### Use views for local layouts

Replace manual coordinate offsets with `pushView()` and `popView()`. Balance each `pushView()`
with `popView()` when the parent cursor must be restored. Use `resetView()` for a deliberate
return to full-screen coordinates. Convert pointer positions with `screenToView()`. Review
`width()` and `height()` calls inside local drawing helpers.

```javascript
const panelX = 20;
const panelY = 20;
$.rect( panelX + 5, panelY + 5, 40, 20, "red" );
$.setPosPx( panelX + 8, panelY + 8 );
$.print( "Status" );
```

```javascript
$.pushView( 20, 20, 100, 60 );
$.rect( 5, 5, 40, 20, "red" );
$.setPosPx( 8, 8 );
$.print( "Status" );
$.popView();
```

### Choose the shader path

Use `applyShader()` when an effect must run between drawing operations or become part of later
framebuffer contents. Use `setDisplayShader()` when an effect should change only final
presentation, including output-resolution effects and non-destructive color treatment.

### Manage shader handles

Store the number returned by `createShader()`. Reuse it across screens; compiled programs are
per screen. Use `getShaderInfo()` for diagnostics without forcing compilation. Call
`removeShader()` when the application retires a shader, and do not use the handle afterward.

### Validate custom uniforms

Match JavaScript values to the linked GLSL declarations. Supply flattened vectors, matrices,
and arrays with exact component counts. Use booleans for `bool` uniforms. Keep auxiliary
sampler counts within the device texture-unit limit. Catch initialization errors when shader
source comes from the user.

### Adopt parented offscreen screens

Create the onscreen parent first, then pass it when creating offscreen layers drawn into it.
Remove parent and child screens according to application ownership. Do not pass `parent` to an
onscreen screen.

```javascript
const layer = $.screen( {
	"aspect": "160x100",
	"isOffscreen": true
} );
```

```javascript
const layer = $.screen( {
	"aspect": "160x100",
	"isOffscreen": true,
	"parent": main
} );
```

### Test presentation and cleanup

Test display shaders at more than one CSS canvas size. Confirm custom upscalers use
`u_sourceSize` and `u_outputSize`. Test nested clips that extend outside their parents, screen
resize while views are active, and removal of images and shaders after queued rendering.

## Errors

### Views

- `VIEW_STACK_EMPTY`: `popView()` was called with nothing to pop.
- `INVALID_PARAMETER`: coordinate conversion received invalid coordinates.
- Invalid view rectangles throw before the view stack changes.

### Shaders

- `INVALID_FRAGMENT_SOURCE`: source is missing, empty, or not GLSL ES 3.00.
- `INVALID_SHADER_HANDLE`: the handle is malformed or unknown.
- `INVALID_UNIFORMS`: the uniforms argument is not an object map.
- `INVALID_UNIFORM_VALUE`: a known uniform has the wrong type, size, or sampler input.
- `UNSUPPORTED_UNIFORM_TYPE`: the linked shader uses an unsupported custom uniform type.
- `TOO_MANY_TEXTURE_UNIFORMS`: the shader needs more texture units than the context allows.
- WebGL compilation and linking errors include the browser diagnostic text.

### Screen parent

`INVALID_SCREEN_PARENT`: `parent` is invalid, deleted, or used with an onscreen screen. Create
the parent first and pass a current screen object or ID.

## Technical details

### Shader pipeline

Custom shaders use a built-in fullscreen-quad vertex stage. `applyShader()` inserts a
logical-framebuffer pass. Display shaders run only while presenting an onscreen canvas.
Compilation and uniform reflection are cached per WebGL context and screen. Framebuffer shader
samplers are snapshotted to preserve queued draw order. Display shader samplers refresh when
the destination is presented.

### View model

An empty view stack is the complete logical framebuffer. Each view stores a requested local
rectangle, a logical origin, and an effective clip. The effective clip is the intersection of
the child rectangle and its parent clip. Pixel clipping uses half-open bounds from the left and
top edges up to, but not including, the right and bottom edges. Views change coordinates and
clipping, not framebuffer allocation. Resizing recomputes the view cache from the requested
rectangles.

### Offscreen context sharing

A parented offscreen screen reuses the parent's WebGL 2 context. Its framebuffer stays a
separate drawing target. Same-context drawing can sample that framebuffer texture directly.
Parent selection is a rendering optimization, not an ownership or removal relationship.

### Resource lifecycle

Images keep texture caches for the screens that use them. Removing an image flushes queued
texture users before releasing those caches. Shader handles own per-screen program caches.
Removing a shader finishes queued passes, clears display use, and deletes those caches.
Removing a screen cleans up textures, shader programs, and temporary framebuffer resources.

## Upgrade checklist

- [ ] Replace 2.0 bundles and type definitions with 2.1 versions.
- [ ] Run existing behavior before adopting new APIs.
- [ ] Remove obsolete same-context offscreen Y-flip workarounds.
- [ ] Review `width()` and `height()` calls that can run inside views.
- [ ] Convert screen-relative input before using it in a view.
- [ ] Balance `pushView()` calls, or call `resetView()` on purpose.
- [ ] Confirm shader source includes `#version 300 es` and declares `u_texture`.
- [ ] Match custom uniform values to their GLSL declarations.
- [ ] Test display shaders at different CSS output sizes.
- [ ] Remove retired images, shaders, and screens explicitly.
- [ ] Test parented offscreen composition and independent child cleanup.

## Summary

Pi.js 2.1 adds rendering and composition features while keeping the 2.0 API:

- Custom GLSL ES 3.00 framebuffer and display shaders
- Scalar, vector, matrix, array, and image-sampler uniforms
- Shader diagnostics and explicit GPU resource disposal
- Nested local-coordinate views with clipping and cursor restoration
- View and screen coordinate conversion
- Shared-context offscreen screens
- Correct same-context offscreen image orientation
- Safer image, texture, shader, and framebuffer cleanup

Most 2.0 applications need only a bundle update. When adopting the new features, review
view-sensitive dimensions, canvas backing size under display shaders, and offscreen Y-axis
workarounds.

API documentation: https://pijs.org
