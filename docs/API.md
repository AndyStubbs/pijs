# Pi.js 2.3.0 API Reference

This document summarizes the public browser API in Pi.js 2.3.0.
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

### WebGL Context Recovery

When a WebGL context is lost, all screens sharing it suspend rendering. Drawing and pending shader
passes are discarded, and pixel reads return transparent pixels in their normal result shapes.
Asynchronous reads settle normally; a read spanning context loss returns transparent pixels even if
restoration completes before the read finishes. Removing a screen still rejects its pending reads.
Deferred pixel filters from the lost context generation are canceled.

On restoration, Pi.js rebuilds GPU resources for every surviving screen sharing the context before
resuming rendering. Framebuffers start transparent. Screen settings, views, image sources, font
selection, and shader handles remain available; persistent display shaders retain their settings.
Images and font atlases upload again when needed. Framebuffer pixels and GPU-only edits, including
custom glyph pixels, are not preserved. Applications should redraw their scene after restoration.

Screen settings can change during loss. GPU-dependent validation of display-shader settings is
deferred until restoration. Screens created in a lost shared context join its recovery; removed
screens do not return. If resource rebuilding fails, the entire group remains suspended and Pi.js
reports `WEBGL_CONTEXT_RESTORE_FAILED` to the console with the underlying cause.

### Screen Management

- `setScreen( screen )`: Makes a screen object or ID active.
- `getScreen( screenId )`: Returns the screen with that numeric ID.
- `getAllScreens()`: Returns all current screen API objects.
- `removeScreen( screen )`: Removes a screen given as an object or ID, also as
  `{ "screen": screen }`. A missing, unknown, or already removed screen throws
  `INVALID_SCREEN_ID`. Call `removeScreen()` on a screen object to remove that screen.
- `removeAllScreens()`: Removes every screen.
- `canvas()`: Returns the active screen's `HTMLCanvasElement`.
- `ready( callback )`: Waits for document readiness and pending resources; also returns a promise.
- `set( options )`: Applies settings named after the `setX` commands, including those of loaded
  plugins: `{ "color": 4 }` calls `setColor( 4 )`. See [Settings](#settings).
- `clearEvents( type )`: Clears one event type, or every type when omitted. `$.clearEvents()`
  clears handlers on every screen, and a screen's `clearEvents()` clears that screen's only. The
  [input](#input) section lists the types.

After removal, calls through a retained screen object throw a `TypeError` with code
`DELETED_METHOD`.

### Settings

`set()` checks every option name before it applies any setting. A name that is not a setting,
including a setting of a plugin that is not loaded, throws a `RangeError` with code
`INVALID_OPTION`, and the call applies nothing. Options that are not an object throw a
`TypeError` with code `INVALID_OPTIONS`. Options set to `null` are skipped. Screen settings apply
to the active screen, and a `"screen"` option makes its screen active for the settings after it;
a screen setting with no active screen throws `NO_ACTIVE_SCREEN`. Global settings can be set
before a screen exists.

An argument passed as `undefined` counts as omitted, in `set()` and in every command, so it takes
its default.

## Views

Views provide nested local coordinates and clipping without changing the
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

// inMouse() is null until the first mouse event
const mouse = $.inMouse();
if( mouse && ( mouse.buttons & 1 ) ) {
	const local = $.screenToView( mouse.x, mouse.y );
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

### `polygon( points, fillColor )`

Available in Full through the bundled polygons plugin; Lite requires the standalone plugin.
Draws a closed outline in the current color, with an optional nonzero-winding fill. Accepts flat
coordinate arrays, typed arrays, or arrays of `{ x, y }` points, including concave and
self-intersecting paths. Coordinates are rounded; at least three distinct points are required.
Null or omitted `fillColor` draws only the outline. Equal fill and outline colors skip the outline
pass. Cached points must be treated as immutable; replace the collection to change coordinates.

```javascript
$.polygon( [ 10, 10, 90, 20, 70, 80 ], 4 );
main.polygon( { "points": new Int16Array( [ 10, 10, 90, 20, 70, 80 ] ) } );
```

See the [polygons reference](../plugins/polygons/README.md) for fill coverage and cache details.

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

Palette indices must be numbers that are finite integers from 0 through the last palette entry.
`setColor()` and `setDefaultColor()` throw `TypeError` with code `INVALID_PARAMETER` for invalid
numeric indices and preserve the previous color. Strings use color-string conversion; they are
not coerced to palette indices. `getPalColor()` returns `null` for invalid or nonnumeric indices.

### Color and Palette Commands

- `setColor( color )`: Sets the current drawing color.
- `getColor( asIndex )`: Returns the current `PiColor`, or its index when requested.
- `setDefaultColor( color )`: Sets the initial color for subsequently created screens.
- `getDefaultColor( asIndex )`: Returns that color, or its index when requested.
- `createColor( color )`: Converts a CSS color string, array, or color-like object into a
  `PiColor`, without changing the drawing color or needing a screen.
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

- `loadImage( src, name, onLoad, onError )`: Registers an image URL,
  image element, or canvas and returns its name.
- `loadSpritesheet( src, name, width, height, margin, onLoad, onError )`:
  Registers a spritesheet and returns its name.
- `getImage( name )`: Returns the registered `HTMLImageElement` or `HTMLCanvasElement`.
- `getSpritesheetData( name )`: Returns spritesheet frame metadata.
- `removeImage( name )`: Finishes queued users, removes the name, and releases cached textures.
  Loading and failed images can also be removed, and the name is immediately reusable. Removing
  a pending URL load silently cancels it and releases its readiness wait without calling `onLoad`
  or `onError`. Late events cannot publish the removed image or affect a replacement. This also
  applies to pending spritesheets. Removing an unknown name is a no-op.

Images and sprites retain their source colors when screen palettes change.
Use the [shader API](#custom-shaders) for recoloring.

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

GPU framebuffers, image samplers, and custom shader outputs use **premultiplied RGBA**: RGB
is multiplied by alpha. Keep RGB between zero and alpha, and use zero RGB when alpha is zero.
Multiply all four channels to change opacity. To perform straight-color math, divide RGB by
alpha only when alpha is nonzero, then multiply the resulting RGB by the output alpha.

JavaScript colors, pixel read results, palette matching, filter callbacks, and captured canvas
images use straight RGBA. Readback returns zero RGB for fully transparent pixels; low-alpha
RGB is quantized by the internal RGBA8 storage.

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
	fragColor = vec4( color.a - color.rgb, color.a );
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

Pi.js supports bitmap fonts only.

Font 1, the default 6x8 font, is created synchronously and can render immediately without
calling `$.ready()`, even while the other built-in font images are still loading.

- `loadFont( src, width, height, margin, charset )`: Loads a bitmap font and returns its ID.
- `setDefaultFont( fontId )`: Sets the font used by new screens.
- `setFont( fontId )`: Selects a loaded font for the active screen.
- `getAvailableFonts()`: Returns registered font metadata, including pending or failed URL loads.
- `setChar( charCode, data )`: Replaces one character bitmap in the active screen's font. The
  change applies on every screen that uses the font; the font keeps its own copy of its image,
  so the image or canvas it was loaded from is unchanged.
- `setPrintSize( scaleWidth, scaleHeight, padX, padY )`: Sets font scale and spacing. Scales must
  be finite numbers greater than 0, and padding an integer of 0 or more.
- `print( msg, isInline, isCentered )`: Prints and advances the active view's cursor.
- `setPos( col, row )`, `getPos()`: Set or read the character-cell cursor.
- `setPosPx( x, y )`, `getPosPx()`: Set or read the pixel cursor.
- `getCols()`, `getRows()`: Return the cells that fit in the active view.
- `setWordBreak( isEnabled )`: Selects space-aware or character-level wrapping.
- `calcWidth( msg )`: Returns bitmap text width in pixels.

`loadFont` accepts a URL string, `HTMLImageElement`, `HTMLCanvasElement`, or `OffscreenCanvas`.
Synchronous validation or setup failure throws without registering a font, consuming a font ID,
or leaving a readiness wait pending. A URL load returns its ID and registers the pending font
immediately after setup succeeds. Use `await $.ready()` to wait for pending loads to settle.
If a URL image fails asynchronously, Pi.js logs an error and releases its readiness wait; the
font remains registered and selectable without an image. Readiness does not guarantee load success.
Image and canvas elements are used directly; callers supply their usable image data.

`loadFont` widths and heights must be integers of at least 1, and its margin an integer of 0 or
more.

Views save and restore print cursors. Wrapping, scrolling, rows, and columns use the requested
active-view size and effective clip.

### Characters

Every UTF-16 code unit of a string takes one cell, so `print()` and `calcWidth()` count a character
outside the Basic Multilingual Plane, such as an emoji, as two. Each unit is drawn with the glyph
at its code in the font's charset. A code with no glyph, such as `"日"`, draws nothing but still
takes its cell. With a font whose image is still loading or failed to load, `print()` warns once,
draws nothing, and still advances the cursor.

The five built-in fonts are 6x6 (font 0), 6x8 (font 1, the default), 8x8 (font 2), 8x14 (font 3),
and 8x16 (font 4). Each holds codes 0–255 in the IBM PC code page 437 layout: 32–126 are ASCII,
and 128–255 are code page 437's accented letters, box drawing, shading, and Greek and math
symbols. Some codes below 32 are blank in some fonts. Codes 128–255 are not Latin-1: `"é"`
(U+00E9, code 233) draws code page 437's Θ, and its é is code 130, `String.fromCharCode( 130 )`.

## Input

The keyboard, pointer, and gamepad plugins are part of the Full bundle. With Lite, load
`pijs-web/plugins/keyboard`, `pointer`, or `gamepad`. They follow the same rules:

- **Start on first use.** The first read or handler registration starts tracking. A plugin adds
  no listeners before then, so input from earlier is not seen. After a stop command, only the
  matching start command resumes; reads and registrations do not. Handlers stay registered
  while input is stopped, but are not called.
- **Handler identity.** A handler is identified by its mode and function, and for the keyboard
  by its key. Registering the same function for the same mode again does nothing, whatever its
  `once` and other options. `once` removes the registration before the handler runs.
- **Removal.** `offX( mode, fn )` removes that handler, `offX( mode )` every handler of the
  mode, and `offX( null, fn )` the function from every mode. Omitting both throws
  `INVALID_MODE`.
- **Dispatch.** State is updated before handlers run, so a read inside a handler sees the event.
  A handler registered during an event first runs for the next one, and a handler removed during
  an event does not run later in it. A handler that throws is reported with `console.error()`,
  and the other handlers still run.
- **Cancelled releases.** Keys, mouse buttons, and touches the player did not release are
  released through the `"up"` handlers with `cancelled: true`: when the page is hidden, a stop
  command runs, or the browser cancels a pointer. The keyboard also does this when the window loses
  focus, a key comes from an editable element, or an `input()` prompt starts.
- **Frozen data.** Key, mouse, touch, press, click, and wheel data are frozen and created once
  per event; a read returns the object the handlers received. Gamepads are live objects updated
  in place.
- **Errors.** An argument of the wrong type throws a `TypeError`, and one out of range a
  `RangeError`, each with a code for the parameter, such as `INVALID_MODE`, `INVALID_FUNCTION`,
  or `INVALID_ONCE`. Boolean flags must be booleans or omitted.

`clearEvents()` takes the types `"keyboard"`, `"mouse"`, `"touch"`, `"press"`, `"click"`,
`"wheel"`, and `"gamepad"`. Each removes only the handlers of its commands; clearing does not
stop tracking.

### Keyboard

- `startKeyboard()`, `stopKeyboard()`: Start or stop keyboard tracking.
- `inKey( key )`: Returns the key data of a held key, or `null`. Without a key, returns a frozen
  array of every held key, ordered by its latest keydown; the same array is returned until a key
  changes.
- `onKey( key, mode, fn, once, allowRepeat )`: Registers an `"up"` or `"down"` handler for a key,
  an array of keys held together, or `"any"`.
- `offKey( key, mode, fn )`: Removes key handlers; `offKey( key )` alone throws.
- `setActionKeys( keys )`: Replaces the keys whose browser default is prevented, such as page
  scrolling. `removeActionKeys( keys )` removes some of them.
- `input( prompt, fn, cursor, isNumber, isInteger, allowNegative, maxLength )`: Displays a text or
  numeric prompt and returns a promise.
- `cancelInput()`: Cancels the active prompt.

A key is named by its code, such as `"KeyA"` or `"Space"`, which names a physical key whatever
the layout, or by its value, such as `"a"`, which names the character it types. Codes suit game
controls. A value is held while any key that produced it is held. Key data has `code`, `key`,
`location`, `altKey`, `ctrlKey`, `metaKey`, `shiftKey`, `repeat`, and `cancelled`.

A `"down"` handler receives the keydown's data, and an `"up"` handler the keyup's. A release runs
the handlers of the key's code, of the value it reports, and of the value it was pressed with.
A combination's callback receives an array with each key's data in the order given; its array is
copied, and a key listed twice counts once. Repeats reach `"down"` handlers only with
`allowRepeat`. Keys typed into an editable element, such as an input field, are ignored.

Only one input prompt is active at a time. Enter completes it and Escape cancels it. The prompt
keeps to one line at the print cursor, and printing continues on the line below it. It reads its
own keys, so it works after `stopKeyboard()`, and its keys, including the Enter that ends it, do
not reach `onKey()` handlers or `inKey()`. It prevents the default action of the keys it handles;
Ctrl and Meta shortcuts are left to the browser, and pasted text is inserted. With `isNumber` or
`isInteger`, the value is a number, and a value with no digits is 0.

`cancelInput()`, Escape, another `input()`, `clearEvents( "keyboard" )` from no screen or from the
owning screen, and removal of the owning screen cancel the prompt: its promise resolves with
`null`, and its callback is called once with `null`. Screen removal releases the prompt's timer,
key handler, and background image without redrawing. Removing another screen leaves the prompt
active. Prompt rendering uses the owning screen even when a different screen is selected.

Input promises settle and session resources are released before completion callbacks run. Callbacks
can start another prompt; the most recent input request wins, including requests made while an
earlier replacement is cancelling a prompt. Starting input on a screen undergoing removal throws
`SCREEN_REMOVED`; methods on an already removed screen retain the usual `DELETED_METHOD` error.

### Mouse, Touch, Press, Click, and Wheel

These are screen commands: each screen tracks its own canvas, and an offscreen screen cannot
receive pointer input.

- `startMouse()`, `stopMouse()`, `inMouse()`
- `startTouch()`, `stopTouch()`, `inTouch()`
- `inPress()`: Returns the press of the primary pointer, the mouse or the primary touch.
- `onMouse( mode, fn, once, hitBox, customData )`, `offMouse( mode, fn )`
- `onTouch( mode, fn, once, hitBox, customData )`, `offTouch( mode, fn )`
- `onPress( mode, fn, once, hitBox, customData )`, `offPress( mode, fn )`
- `onClick( fn, once, hitBox, customData )`, `offClick( fn )`
- `onWheel( fn, once, hitBox, customData )`, `offWheel( fn )`
- `setContextMenu( isEnabled )`, `setPinchZoom( isEnabled )`

The modes are `"down"`, `"move"`, and `"up"`. Mouse, touch, press, and click data share one shape:
`x`, `y`, `lastX`, `lastY`, `buttons`, `action`, `type`, `id`, and `cancelled`. Positions are
screen pixels, and remain screen-relative inside views. `buttons` is a bitmask for the mouse (1
left, 2 right, 4 middle) and 1 while a touch is down. `type` is `"mouse"`, `"pen"`, or `"touch"`;
mouse commands also report pens. `lastX` and `lastY` start at the current position.

- **Touch** handlers receive an array with the one touch the event changed: touches that start
  together arrive in separate calls, and an `"up"` handler receives the touch that lifted.
  `inTouch()` returns the touches still down, and is empty after `stopTouch()`.
- **Press** follows the primary pointer: the mouse, or the touch that started with no other
  touch down. Its data adds `touches`, a copy of the touches down. `inMouse()` and `inPress()`
  return `null` before the first event and while their input is stopped.
- **Click** fires when the same pointer is pressed and released inside the hit box: the left
  mouse button or a touch. Each finger clicks on its own, and a cancelled touch never clicks.
  Click data has `action: "click"`.
- **Wheel** data is `{ x, y, deltaX, deltaY }`, with deltas in CSS pixels. While a screen has
  wheel handlers, the page does not scroll with the wheel over its canvas. Wheel handlers need
  no tracking.

A hit box is `{ x, y, width, height }` in screen pixels. With one, a handler runs only for events
inside it; a click without one uses the screen's size when the handler is registered. The
optional `customData` is passed to the handler as its second argument.

A press that starts on the canvas border or padding is ignored. A press on the canvas keeps
reporting moves after it leaves the canvas, and its release is reported wherever it happens,
at its true position.

While touch tracking runs, the canvas has `touch-action: none`, so the browser does not scroll
or zoom with touches on it. `setPinchZoom( true )` sets it to `pinch-zoom` for that screen. The
browser's context menu is suppressed on the canvas from screen creation; `setContextMenu( true )`
lets it open. Neither setting starts tracking.

### Gamepad

- `startGamepad()`, `stopGamepad()`: Start or stop polling, once per animation frame.
- `inGamepad( gamepadIndex )`: Returns the pad with that index, or `null`. Without an index,
  returns an array of every connected pad, in index order; it is empty when no pad is connected
  and while polling is stopped.
- `onGamepad( mode, fn, once )`, `offGamepad( mode, fn )`: Register or remove `"connect"` and
  `"disconnect"` callbacks.
- `setGamepadDeadZone( deadZone )`: Sets the dead zone, from 0 to under 1; the default is 0.2.
- `vibrateGamepad( gamepadIndex, duration, strong, weak )`: Plays a dual-rumble effect for
  `duration` milliseconds and returns `true`, or returns `false` where the pad or browser cannot
  vibrate.

A pad is a live object: the same object is returned on every read and updated in place,
including its `buttons`, `axes`, and `lastAxes`. Copy values to keep a snapshot. The first read in
each animation frame reports what happened since the previous frame that had a read, and every
other read in the frame sees the same values, so a press and release between two reads are both
reported.

A pad's methods take a button or axis index, or a standard-mapping name, which reads the same
position on any pad: `getButton()`, `getButtonPressed()`, `getButtonJustPressed()`,
`getButtonJustReleased()`, `getAxis()`, and `getAxisChanged()`. The buttons are `south`, `east`,
`west`, `north`, `leftShoulder`, `rightShoulder`, `leftTrigger`, `rightTrigger`, `select`, `start`,
`leftStick`, `rightStick`, `dpadUp`, `dpadDown`, `dpadLeft`, `dpadRight`, and `home`, and the axes
`leftX`, `leftY`, `rightX`, and `rightY`. An index past the pad's buttons or axes reads as empty:
`null`, 0, or `false`.

On pads with the standard mapping, the two sticks use a radial dead zone: the stick keeps its
direction, and a full diagonal reads a distance of 1. Other axes use the dead zone on their own.

A `"connect"` callback also receives the pads already connected when it is registered, and each
connection once. A pad starts with every button released, so a button held when it appears is
reported as just pressed on a later read. Hiding the page, or `stopGamepad()`, releases every
button and centers the axes without reporting a release. Polling continues while the window loses
focus but the page stays visible. `startGamepad()` after a stop reports the connections made or
lost while stopped.

## Sound and Music

The `sound` plugin is part of the Full bundle. With Lite, load `pijs-web/plugins/sound`.

### Output and Voices

Sounds play on three buses: `"sfx"` for `sound()`, `"music"` for `play()`, and `"audio"` for
`playAudio()`. The buses mix into the master volume and then an output limiter.

- `setVolume( volume )`: Sets the master volume from 0 to 1; the default is 0.75.
- `setBusVolume( bus, volume )`: Sets the volume of `"sfx"`, `"music"`, `"audio"`, or `"master"`,
  which is the same as `setVolume()`. Changes ramp over 10 ms.
- `setSoundLimiter( enabled )`: Turns the limiter on or off. It is on by default and keeps the
  output within ±1.0: levels below its threshold pass unchanged, and above it the mix saturates
  smoothly instead of clipping.

Sounds, notes, and audio instances share 64 voices. When they are all in use, the oldest sound
that overlaps the new one fades out to make room. Looping audio instances are never stopped to
make room; when no voice can be freed, the new sound is rejected, and its ID is returned already
finished, so operations on it do nothing. At most 1024 delayed requests can be pending; beyond
that, the call throws `TOO_MANY_PENDING_SOUNDS`.

Sounds are scheduled slightly ahead of the audio clock. Every start and stop ramps over a few
milliseconds, so nothing clicks: `stopSound()`, `stopPlay()`, and `stopAudio()` fade over 10 ms and
are silent about 15 ms after the call. If the page stalls, a sound late by up to 25 ms starts at
its place in the timeline, later ones are skipped, and future ones keep their times.

Until the page receives its first user gesture, the browser keeps audio locked. One-shot sounds
requested while locked return an ID but play nothing; looping audio and songs start when audio
unlocks. Sounds requested in the handlers of the unlocking gesture play, including the first
sound of a page, whose call creates the audio context. Audio requires a page served over HTTP or
HTTPS.

### Synthesized Sound

- `sound( frequency, duration, volume, oType, delay, attackTime, decayTime, sustainLevel,
  releaseTime, pan, frequencyEnd )`: Plays a sound and returns its ID.
- `stopSound( soundId )`: Stops one sound, or all sounds when omitted.

`oType` is `"triangle"` (the default), `"sine"`, `"square"`, `"sawtooth"`, `"white"` or `"pink"`
noise, a custom wave table, or a source type a plugin adds. The volume follows an ADSR envelope:
the attack rises to `volume` over `attackTime`, the decay falls to `sustainLevel × volume` over
`decayTime`, the sustain holds until `duration` ends, and the release fades out over
`releaseTime` (default 0.1 s). `frequencyEnd` sweeps the pitch exponentially over `duration`.
`pan` runs from -1 (left) to 1 (right), and the louder channel stays at `volume`. Frequency is
not rounded.

### PLAY

- `play( playString )`: Plays music written in BASIC-style notation and returns a track ID.
- `stopPlay( trackId )`: Stops one track, or all tracks when omitted.

Notes are `A`–`G` with `#`, `+`, or `-`, a length, and dots; `N` plays a note by number. `O`, `<`,
and `>` set the octave, `L` the default length, `T` the tempo, `P` a rest, `V` the volume, and `MP`
the pan. `WS`, `WQ`, `WW`, `WT`, `WN`, and `WP` select sine, square, sawtooth, triangle, white
noise, and pink noise. `MS`, `MN`, and `ML` set how much of each note's slot sounds, without
changing the beat, and `MA`, `MD`, `MH`, and `MR` set the envelope. `@n` selects an instrument
that a plugin provides. A comma starts another track at the time of the previous track's last
command. Notes are scheduled as the song plays, so long songs use few resources. Unknown
commands are ignored with one warning per call.

### Audio Files

- `loadAudio( src, name, stream )`: Loads an audio file and returns its audio ID.
- `playAudio( audioId, volume, startTime, duration, loop, playbackRate, pan, delay )`: Plays an
  instance and returns its instance ID.
- `stopAudio( id )`, `pauseAudio( id )`, `resumeAudio( id )`: Stop, pause, or resume one
  instance, every instance of an audio ID, or all audio when omitted.
- `setAudio( instanceId, volume, playbackRate, pan )`: Changes a playing, delayed, or paused
  instance.
- `removeAudio( audioId )`: Removes a file and releases its resources.

By default a file is decoded into memory, so any number of instances can play it with
sample-accurate timing. With `stream` set to `true`, the file plays through a media element, one
instance at a time; a new `playAudio()` fades out the current instance and takes its voice.
`playbackRate` changes speed and pitch together, from 0.0625 to 16 for decoded audio and from 0.25
to 4 for streamed audio. `startTime` and `duration` are times in the file, so `duration` scales
with the rate. A paused instance keeps its position and holds no voice.

Each `loadAudio()` holds `ready()` until the file loads, fails, or is removed. Network failures
are retried three times, 100 ms apart; a file that fails logs an error, and `playAudio()` then
throws `AUDIO_NOT_LOADED`. Loaded files stay playable when others fail or are still loading.

`removeAudio()` cancels a load in progress, fades out playing instances, ends paused and delayed
ones, and releases the file. Its readiness wait is released, and its name can be reused at once;
late results from the removed load cannot affect a replacement. If synchronous setup throws,
nothing is registered and the name stays available.

### Sound Advanced Plugin

`sound-advanced` adds `synth()`, `releaseSound()`, `setSynth()`, `sfx()`, `definePreset()`,
`generateSfx()`, `defineInstrument()`, `setBusEffect()`, `getSoundLevels()`, `startRecording()`,
`stopRecording()`, `getRecordingState()`, `saveRecording()`, `onPlay()`, and `offPlay()`. It is in neither bundle:
load `pijs-web/plugins/sound-advanced` after the Full bundle, or after Lite and the `sound`
plugin. See its [README](../plugins/sound-advanced/README.md).

## Plugins

- `registerPlugin( name, init, version, description, dependencies )`: Registers a plugin.
- `getPlugins()`: Returns each plugin's `name`, `version`, `description`, `initialized`, and
  `state`: `"pending"` while it waits for its dependencies, `"initialized"`, or `"failed"`.

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

When a plugin initializes after screens already exist, Pi.js clones that plugin's static and
dynamic screen data onto each live screen, binds its screen commands, and runs its screen
initialization hooks once. Earlier core and plugin initialization hooks are not replayed. Screens
created afterward receive the same registrations through normal screen creation.

Installation is all or nothing. A plugin's commands, settings, screen data, hooks, and
`clearEvents` handlers take effect only after its `init` and its installation on existing
screens both succeed. If either throws, none of them remain, its state is `"failed"`, and its
name can be registered again. The `registerPlugin()` call that registered it throws
`PLUGIN_INIT_FAILED`; a plugin that fails while another call resolves it, such as one waiting on
a dependency that call registers, is reported with `console.error()` instead. The
`pluginApi` registration methods throw `REGISTRATION_CLOSED` after `init` returns. Missing and
cyclic dependencies stay `"pending"`, and a plugin initializes only after its dependencies have.

A plugin can offer an API to the plugins that depend on it: `pluginApi.provideService( service )`
publishes one object during `init`, and `pluginApi.getService( pluginName )` returns the service of
a plugin listed in `dependencies`. The `sound` plugin provides the service that `sound-advanced`
uses.

Plugin scripts register themselves when loaded after Pi.js. The standalone scripts of the
plugins that the Full bundle includes, `gamepad`, `keyboard`, `pointer`, `polygons`, and `sound`,
are for Lite: loading one after the Full bundle throws `DUPLICATE_PLUGIN`.

`clearEvents()` removes every handler of its type, including handlers that a plugin registered
through the public input commands, such as `onPress()`. They are not restored, so a plugin that
needs its handlers must register them again, or read input by polling, such as with `inPress()`.

## Screen Layout and Resource Behavior

With `noCss: true` (default false), Pi.js does not write automatic canvas, container, html, or body
styles. Supply usable canvas layout in host CSS. The canvas is still appended and its intrinsic
size and WebGL resources are managed. Explicit background commands still apply requested styles.
Logical x/e/m dimensions follow the container; display shader backing size follows the rendered
canvas CSS content size before transforms. Canvas and container changes are observed. Hidden hosts retain their last
valid allocation and recover when visible. Offscreen screens accept noCss as a no-op.
Pointer input requires an onscreen target: screen creation changes the active screen, so use
visible.inMouse() or setScreen(visible) after creating an offscreen buffer.

v_texCoord uses bottom-left/y-up UVs. Custom sampler2D images are normalized to the same
orientation as u_texture.
Drawing coordinates remain top-left/y-down; convert UVs to screen pixels with
vec2(uv.x, 1.0 - uv.y) * u_sourceSize. Video sources refresh when decoded data is available on
resolution; first use without a decoded frame throws IMAGE_NOT_READY, otherwise the last valid
upload is retained. No video rendering loop is created.

Image onLoad/onError exceptions remain visible and release their resource wait exactly once.
Failed screen creation rolls back its DOM, observers, commands, and GPU resources.
