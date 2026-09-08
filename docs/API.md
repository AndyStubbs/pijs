# Pi.js 2.2.0 API Reference (In Development)

This document summarizes the public browser API in Pi.js 2.2.0, which is in development.
Commands generally accept either the positional signature shown here or a single options object.
The generated declarations in
`docs/llms/pi.d.ts` are the authoritative type reference.

## Contents

- [Core and screens](#core-and-screens)
- [Views](#views)
- [Drawing and pixels](#drawing-and-pixels)
- [Colors and blending](#colors-and-blending)
- [Images and sprites](#images-and-sprites)
- [Custom shaders](#custom-shaders)
- [Bitmap text](#bitmap-text)
- [Input](#input)
- [Sound and music](#sound-and-music)
- [Plugins](#plugins)

## Core and Screens

### `screen( aspect, container, isOffscreen, resizeCallback, parent, noCss )`

Creates a WebGL 2 screen, makes it active, and returns its `Screen` API object.

- `aspect`: `(width)(x|m|e)(height)`. `x` is exact, `m` uses integer-multiple scaling, and `e`
  extends the logical area to fill the container.
- `container`: Optional element or element ID. Defaults to `document.body`.
- `isOffscreen`: Creates an undisplayed screen. Offscreen screens require exact `x` dimensions.
- `resizeCallback`: Receives `( screen, fromSize, toSize )` after the logical framebuffer resizes.
- `parent`: Existing screen object or ID whose WebGL context an offscreen screen should share.
  This is valid only with `isOffscreen: true` and does not establish lifecycle ownership.

```javascript
const main = $.screen( "320x200" );
const layer = $.screen( {
	"aspect": "160x100",
	"isOffscreen": true,
	"parent": main
} );

layer.circle( 80, 50, 30, "red" );
main.drawImage( layer, 80, 50 );

layer.removeScreen();
main.removeScreen();
```

Parented offscreen screens share context affinity only. Removing either screen does not remove the
other. An invalid, deleted, or onscreen parent configuration throws `INVALID_SCREEN_PARENT`.

### Screen Management

- `setScreen( screen )`: Makes a screen object or ID active.
- `getScreen( screenId )`: Returns the screen with that numeric ID.
- `getAllScreens()`: Returns all current screen API objects.
- `removeScreen( screen )`: Removes a supplied screen, or the active screen when omitted.
- `removeAllScreens()`: Removes every screen.
- `canvas()`: Returns the active screen's `HTMLCanvasElement`.
- `ready( callback )`: Waits for document readiness and pending resources; also returns a promise.
- `set( options )`: Applies settings whose keys correspond to current `setX` commands.
- `clearEvents( type )`: Clears one registered event type, or all types when omitted.

After removal, calls through a retained screen object throw a `TypeError` with code
`DELETED_METHOD`.

## Views

Views, introduced in 2.1, provide nested local coordinates and clipping without changing the
logical framebuffer size.

- `pushView( x, y, width, height )`: Pushes a child relative to the current local origin. It saves
  the parent print cursor and starts the child cursor at `(0, 0)`.
- `popView()`: Restores the parent view and cursor. An empty stack throws `VIEW_STACK_EMPTY`.
- `resetView()`: Discards the stack, returns to full-screen coordinates, and resets the cursor.
- `viewToScreen( x, y )`: Converts a local point to screen/FBO coordinates.
- `screenToView( x, y )`: Converts a screen/FBO point to local coordinates.
- `width()`, `height()`: Return logical screen dimensions without a view, or the requested active
  view dimensions inside a view.

Child clips intersect their parent clips. Zero-size views are valid. Input coordinates remain
screen-relative, and shader passes always process the complete logical framebuffer.

```javascript
$.screen( "320x200" );
$.pushView( 20, 20, 120, 80 );
$.cls();

const mouse = $.inmouse();
const local = $.screenToView( mouse.x, mouse.y );
if( mouse.buttons & 1 ) {
	$.circle( local.x, local.y, 3, "white" );
}

$.popView();
```

## Drawing and Pixels

### Clearing and Primitives

- `cls( x, y, width, height )`: Clears the active view or an optional local rectangle.
- `pset( x, y )`: Draws one pixel in the current color.
- `line( x1, y1, x2, y2 )`: Draws a line.
- `rect( x, y, width, height, fillColor )`: Draws a rectangle with optional fill.
- `circle( x, y, radius, fillColor )`: Draws a circle with optional fill.
- `ellipse( x, y, radiusX, radiusY, fillColor )`: Draws an ellipse with optional fill.
- `arc( x, y, radius, angle1, angle2 )`: Draws an arc using degrees.
- `bezier( x1, y1, x2, y2, x3, y3, x4, y4 )`: Draws a cubic Bézier curve.
- `paint( x, y, fillColor, tolerance, boundaryColor )`: Flood fills inside the active clip.
- `draw( drawString )`: Executes BASIC-style drawing commands.

`rect()`, `circle()`, and `ellipse()` use the current color for their outline. The optional
`fillColor` controls the interior.

### Pixel Reads and Writes

- `get( x, y, width, height, tolerance, asIndex )`: Returns a `[row][column]` region. It returns
  palette indices by default or `PiColor` values when `asIndex` is false.
- `getAsync( x, y, width, height, tolerance, asIndex )`: Promise-based form of `get()`.
- `getPixel( x, y, asIndex )`: Returns one `PiColor`, or its palette index when requested.
- `getPixelAsync( x, y, asIndex )`: Promise-based form of `getPixel()`.
- `put( data, x, y, include0 )`: Writes a two-dimensional palette-index array. Index 0 is skipped
  unless `include0` is true.
- `filterImg( filter, x1, y1, x2, y2 )`: Queues a CPU pixel filter for an optional inclusive
  rectangle. The callback receives `( color, x, y )` and must return truthy to keep its result.

Reads and writes use view-local coordinates and are restricted to the effective view clip.

```javascript
$.filterImg( function( color ) {
	color.r = 255 - color.r;
	color.g = 255 - color.g;
	color.b = 255 - color.b;
	return true;
} );
```

## Colors and Blending

Colors may be palette indices, CSS/hex strings, RGB/RGBA arrays, or `PiColor`-shaped objects.
Palette index 0 is reserved for transparent black. Colors supplied to `setPal()` and
`setDefaultPal()` therefore begin at index 1.

### Color and Palette Commands

- `setColor( color )`: Sets the current drawing color.
- `getColor( asIndex )`: Returns the current `PiColor`, or its index when requested.
- `setDefaultColor( color )`: Sets the initial color for subsequently created screens.
- `setPal( pal )`: Replaces the active screen's palette.
- `getPal( include0 )`: Returns a copied palette, excluding index 0 by default.
- `getPalColor( index )`: Returns a `PiColor` or `null` for an invalid index.
- `getPalIndex( color, tolerance )`: Returns the closest matching index within tolerance or
  `null`. Tolerance ranges from exact (`0`) to unrestricted (`1`).
- `setPalColors( indices, colors )`: Updates several nonzero palette entries.
- `addPalColors( colors )`: Adds colors not already present and returns their indices.
- `setDefaultPal( pal )`, `getDefaultPal()`: Set or copy the palette used for new screens.
- `setBgColor( color )`: Sets the canvas element background.
- `setContainerBgColor( color )`: Sets the containing element background.

Palette edits affect future drawing; they do not recolor existing framebuffer pixels.

### Blend Commands

- `setBlend( blend )`: Selects `"replace"` or `"alpha"`.
- `setNoise( noise, seed )`: Sets symmetric or per-channel color noise and an optional seed.

```javascript
$.set( {
	"color": 2,
	"blend": "alpha",
	"noise": [ 8, 4, 0, 0 ],
	"bgColor": "#101020"
} );
```

Valid `set()` properties are derived from current `setX` commands; unsupported properties are not
accepted.

## Images and Sprites

### Loading and Lookup

- `loadImage( src, name, usePalette, paletteKeys, onLoad, onError )`: Registers an image URL,
  image element, or canvas and returns its name.
- `loadSpritesheet( src, name, width, height, margin, usePalette, paletteKeys, onLoad, onError )`:
  Registers a spritesheet and returns its name.
- `getImage( name )`: Returns the registered `HTMLImageElement` or `HTMLCanvasElement`.
- `getSpritesheetData( name )`: Returns spritesheet frame metadata.
- `removeImage( name )`: Finishes queued users, removes the name, and releases cached textures.

Drawing a removed registered name throws `IMAGE_NOT_FOUND`.

### Drawing and Capture

- `drawImage( image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle )`
- `drawSprite( name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle )`
- `blitImage( img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad )`
- `blitSprite( name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad )`
- `setDefaultAnchor( x, y )`: Sets the active screen's default image/sprite anchor.
- `createImageFromScreen( name, x1, y1, x2, y2 )`: Copies an inclusive screen region into a
  registered canvas-backed image and returns its name.

`drawImage()` and `drawSprite()` angles are degrees. The lower-level, replace-mode `blit` commands
use radians.

```javascript
const player = $.loadImage( "player.png", "player" );
await $.ready();
$.screen( "320x200" );
$.drawImage( player, 160, 100, null, 0.5, 0.5, 2, 2, 45 );

const capture = $.createImageFromScreen( "capture", 0, 0, 63, 63 );
$.drawImage( capture, 100, 20 );
$.removeImage( capture );
```

## Custom Shaders

Pi.js 2.1 accepts GLSL ES 3.00 fragment source and supplies a fullscreen-quad vertex stage. A
usable shader must declare `uniform sampler2D u_texture`. Compilation, linking, reflection, and
validation occur synchronously on first use for each screen.

Built-in uniforms are `u_texture`, `u_sourceSize`, `u_outputSize`, `u_time`, and `u_frame`.
Application uniform maps cannot override them. Custom values may include scalars, vectors,
matrices, arrays, registered/direct image sources, and Pi.js screens; their type and exact
component count must match GLSL reflection.

### Shader Commands

- `createShader( fragmentSource, uniforms )`: Returns a screen-independent numeric handle.
- `applyShader( shaderHandle, uniforms )`: Queues a logical-framebuffer pass at the current point
  in draw order. Later drawing appears above the processed result.
- `setDisplayShader( shaderHandle, uniforms )`: Selects a final presentation shader. Passing
  `null` restores default presentation.
- `setDisplayShaderUniforms( uniforms )`: Merges persistent display overrides and re-presents.
- `getShaderInfo( shaderHandle )`: Returns copied source, lifecycle counts, per-screen compilation
  state, and reflected uniform information without compiling the shader.
- `removeShader( shaderHandle )`: Completes queued passes, clears display use, deletes cached
  programs, and invalidates the handle.

Framebuffer shaders process the complete logical framebuffer, even inside a view. Display shaders
do not modify logical pixels and may change canvas backing-store size to match CSS presentation;
logical dimensions remain available from `width()` and `height()` outside a view.

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
$.rect( 10, 10, 40, 40, "red" );
$.applyShader( invert );
$.line( 0, 0, 80, 80 );

console.log( $.getShaderInfo( invert ) );
$.removeShader( invert );
```

Invalid source, handles, uniforms, unsupported types, or excess texture samplers throw
synchronously with the documented shader error code.

## Bitmap Text

Pi.js 2 supports bitmap fonts only.

- `loadFont( src, width, height, margin, charset )`: Loads a bitmap font and returns its ID.
- `setDefaultFont( fontId )`: Sets the font used by new screens.
- `setFont( fontId )`: Selects a loaded font for the active screen.
- `getAvailableFonts()`: Returns loaded font metadata.
- `setChar( charCode, data )`: Replaces one character bitmap in the active font.
- `setPrintSize( scaleWidth, scaleHeight, padX, padY )`: Sets font scale and spacing.
- `print( msg, isInline, isCentered )`: Prints and advances the active view's cursor.
- `setPos( col, row )`, `getPos()`: Set or read the character-cell cursor.
- `setPosPx( x, y )`, `getPosPx()`: Set or read the pixel cursor.
- `getCols()`, `getRows()`: Return the cells that fit in the active view.
- `setWordBreak( isEnabled )`: Selects space-aware or character-level wrapping.
- `calcWidth( msg )`: Returns bitmap text width in pixels.

Views save and restore print cursors. Wrapping, scrolling, rows, and columns use the requested
active-view size and effective clip.

## Input

Polling and handler registration automatically start the corresponding tracker. Explicit start
commands are primarily useful after a stop command.

### Keyboard

- `startKeyboard()`, `stopKeyboard()`: Start or stop keyboard tracking.
- `inkey( key )`: Returns one pressed-key object, all pressed keys, or `null`.
- `setActionKeys( keys )`, `removeActionKeys( keys )`: Manage keys whose browser defaults are
  prevented.
- `onkey( key, mode, fn, once, allowRepeat )`: Registers an `"up"` or `"down"` handler.
- `offkey( key, mode, fn, once, allowRepeat )`: Removes the matching handler.
- `input( prompt, fn, cursor, isNumber, isInteger, allowNegative, maxLength )`: Displays a text or
  numeric prompt and returns a promise.
- `cancelInput()`: Cancels the active prompt.

Only one input prompt is active at a time. Cancellation by `cancelInput()`, Escape, replacement,
event clearing, or removal of the owning screen resolves its promise with `null` and calls its
callback once with `null`. Screen removal releases the prompt's timer, key handler, and background
image without redrawing. Removing another screen leaves the prompt active. Prompt rendering uses
the owning screen even when a different screen is selected.

Input promises settle and session resources are released before completion callbacks run. Callbacks
can start another prompt; the most recent input request wins, including requests made while an
earlier replacement is cancelling a prompt. Starting input on a screen undergoing removal throws
`SCREEN_REMOVED`; methods on an already removed screen retain the usual `DELETED_METHOD` error.

Keyboard once-handlers are removed before invocation, including all entries for a combination.
Handlers removed during dispatch are skipped. Keyup callbacks can still inspect the releasing key
and match combinations; release cleanup preserves any new press dispatched by a callback.
Synchronous exceptions from input callbacks and keyboard handlers are reported asynchronously as
browser errors. Each error is reported separately; other handlers, key release, browser-default
prevention for action keys, and screen cleanup continue. Callback return values are not awaited.

### Mouse, Touch, and Press

- `startMouse()`, `stopMouse()`, `inmouse()`
- `startTouch()`, `stopTouch()`, `intouch()`
- `inpress()`: Polls the unified mouse/touch press state.
- `onmouse( mode, fn, once, hitBox, customData )`, `offmouse( mode, fn )`
- `ontouch( mode, fn, once, hitBox, customData )`, `offtouch( mode, fn )`
- `onpress( mode, fn, once, hitBox, customData )`, `offpress( mode, fn )`
- `onclick( fn, once, hitBox, customData )`, `offclick( fn )`
- `setEnableContextMenu( isEnabled )`, `setPinchZoom( isEnabled )`

Mouse and press callbacks receive one data object. Their `buttons` field is a bitmask: 1 is left,
2 is right, and 4 is middle. Touch callbacks receive an array of touch objects. Pointer positions
remain screen-relative inside views.

### Gamepad

- `startGamepad()`, `stopGamepad()`: Start or stop the polling loop.
- `ingamepad( gamepadIndex )`: Returns one gamepad or all gamepads.
- `setGamepadSensitivity( sensitivity )`: Sets the analog dead zone from 0 to 1.
- `onGamepadConnected( fn )`, `onGamepadDisconnected( fn )`: Register lifecycle callbacks.

## Sound and Music

### Audio Pools

- `loadAudio( src, name, poolSize )`: Creates an audio pool and returns its ID.
- `playAudio( audioId, volume, startTime, duration )`: Plays one pool instance.
- `stopAudio( audioId )`: Stops one pool, or all pools when omitted.
- `removeAudio( audioId )`: Removes a pool and releases its resources.

Each audio slot holds `ready()` until it loads, reaches a terminal failure, or is removed.
Recognized media errors retry up to three times, 100 ms apart; terminal failures are logged.
Loaded slots remain playable when other slots fail or are still loading.

`removeAudio()` also cancels pending loads and retries, detaches load listeners, stops playback,
and releases the media sources. It releases only that pool's outstanding readiness waits, and its
name can be reused immediately. Late events from removed audio cannot affect a replacement pool.
If synchronous initialization throws, the partially created pool is cleaned up and its name
remains available; the original error is rethrown.

### Synthesized Sound and PLAY

- `sound( frequency, duration, volume, oType, delay, attack, decay )`: Plays a synthesized sound
  and returns its string ID. It also accepts an options object.
- `stopSound( soundId )`: Stops one sound, or all sounds when omitted.
- `setVolume( volume )`: Sets global sound and audio-pool volume from 0 to 1.
- `play( playString )`: Plays BASIC-style music and returns a numeric track ID.
- `stopPlay( trackId )`: Stops one track, or all tracks when omitted.

## Plugins

- `registerPlugin( name, init, version, description, dependencies )`: Registers a plugin.
- `getPlugins()`: Returns registered plugin status objects.

The options form makes plugin metadata clearer:

```javascript
$.registerPlugin( {
	"name": "stars",
	"version": "1.0.0",
	"description": "Adds a star command",
	"dependencies": [],
	"init": function( pluginApi ) {
		pluginApi.addCommand(
			"star",
			function( screenData, options ) {
				const x = options.x;
				const y = options.y;
				const radius = options.radius;
				for( let i = 0; i < 5; i++ ) {
					const angle = ( i / 5 ) * Math.PI * 2;
					screenData.api.line(
						x,
						y,
						x + Math.cos( angle ) * radius,
						y + Math.sin( angle ) * radius
					);
				}
			},
			true,
			[ "x", "y", "radius" ]
		);
	}
} );
```

The initialization API supports command registration, per-screen data, screen initialization and
cleanup hooks, access to screen data and the main API, readiness counters, dependency handling,
event cleanup hooks, and utility functions.

## Upcoming 2.2 minor upgrade behavior

These changes target 2.2 because screen gains the optional noCss parameter after parent.
See [Upgrading to Pi.js 2.2](upgrade-2.2.md) for compatibility notes.

With `noCss: true` (default false), Pi.js does not write automatic canvas, container, html, or body
styles. Supply usable canvas layout in host CSS. The canvas is still appended and its intrinsic
size and WebGL resources are managed. Explicit background commands still apply requested styles.
Logical x/e/m dimensions follow the container; display shader backing size follows the rendered
canvas CSS content size before transforms. Canvas and container changes are observed. Hidden hosts retain their last
valid allocation and recover when visible. Offscreen screens accept noCss as a no-op.
Pointer input requires an onscreen target: screen creation changes the active screen, so use
visible.inmouse() or setScreen(visible) after creating an offscreen buffer.

v_texCoord uses bottom-left/y-up UVs. Custom sampler2D images are normalized to the same
orientation as u_texture. Remove any custom-map 1.0 - uv.y workaround used before the 2.2 upgrade.
Drawing coordinates remain top-left/y-down; convert UVs to screen pixels with
vec2(uv.x, 1.0 - uv.y) * u_sourceSize. Video sources refresh when decoded data is available on
resolution; first use without a decoded frame throws IMAGE_NOT_READY, otherwise the last valid
upload is retained. No video rendering loop is created.

Image onLoad/onError exceptions remain visible and release their resource wait exactly once.
Pointer subscriptions register synchronously; additions during dispatch enter later snapshots.
Replaying pooled audio clears that slot's old duration timer, including full-length playback.
Plugin dependencies resolve after successful initialization, including late registrations;
missing, cyclic, and failed dependencies remain initialized:false. Initializers run at most once.
Failed screen creation rolls back its DOM, observers, commands, and GPU resources.
