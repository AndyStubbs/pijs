# Pi.js API Reference

This document lists all external API commands available in Pi.js.

## Table of Contents

- [Core & Screen Management](#core--screen-management)
- [View](#view)
- [Rendering](#rendering)
- [Custom Shaders](#custom-shaders)
- [Colors & Palettes](#colors--palettes)
- [Basic Graphics](#basic-graphics)
- [Advanced Graphics](#advanced-graphics)
- [Drawing (BASIC-style)](#drawing-basic-style)
- [Paint & Fill](#paint--fill)
- [Images & Sprites](#images--sprites)
- [Fonts](#fonts)
- [Text Printing](#text-printing)
- [Keyboard Input](#keyboard-input)
- [Mouse Input](#mouse-input)
- [Touch Input](#touch-input)
- [Press Input (Unified)](#press-input-unified)
- [Gamepad Input](#gamepad-input)
- [Sound & Audio](#sound--audio)
- [Music (BASIC-style)](#music-basic-style)
- [Events](#events)
- [Plugins](#plugins)
- [Utilities](#utilities)

---



## Core & Screen Management



### `screen( aspect, container, isOffscreen, resizeCallback, parent )`

Creates a new screen/canvas with specified properties.

```javascript
const parent = $.screen( { "aspect": "320x200" } );
const child = $.screen( {
	"aspect": "160x100",
	"isOffscreen": true,
	"parent": parent
} );
```

**Parameters:**

- **aspect**: Aspect ratio string (e.g., `"4:3"`, `"320x200"`, `"80m60"`, `"80e60"`)
- **container**: DOM element or ID to contain the canvas
- **isOffscreen**: Boolean - create an offscreen canvas for rendering
- **resizeCallback**: Function - called when screen is resized: `function( screen, fromSize, toSize )`
  - `screen`: The screen object that was resized
  - `fromSize`: Object with `width` and `height` before resize
  - `toSize`: Object with `width` and `height` after resize
  - **Note**: Screens automatically resize when their container element resizes (using ResizeObserver)
  - Drawing in the callback is supported. The logical framebuffer is already
  resized; callback drawing is flushed and presented as part of that resize.
- **parent**: Existing screen object whose WebGL context an offscreen screen should use
  - Only valid when `isOffscreen` is `true`.
  - If omitted, the screen uses the shared offscreen WebGL context.
  - This controls rendering-context affinity only and does not establish lifecycle ownership.



### `setScreen( screen )`

Sets the active screen for drawing operations.

### `removeScreen()`

Removes the current screen from the page and memory.

**Note:** After removal, calling any methods on the removed screen object will throw a `TypeError` with code `"DELETED_METHOD"`.

### `getScreen( screenId )`

Gets a screen object by its ID.

### `width()`

Returns the requested local view width in pixels. With no view this is the
logical framebuffer width, not the effective clip size.

### `height()`

Returns the requested local view height in pixels. With no view this is the
logical framebuffer height, not the effective clip size.

### `canvas()`

Returns the HTMLCanvasElement for the current screen.

### `setPixelMode( isEnabled )`

Enables or disables pixel-perfect rendering mode.

---



## View

A view gives the active screen a local drawing coordinate system and clips
pixels to an effective rectangle. `screenData` framebuffer size does not
change. Empty stack means full-screen behavior identical to no view.

Internal clips are half-open: `[x, x+width) × [y, y+height)`. Inclusive
APIs such as `createImageFromScreen` convert at the boundary (`x2 + 1`,
`y2 + 1`) before intersecting the clip.

- Coordinates are local; pixels are scissored to the effective clip
(requested rectangle ∩ parent clip).
- `width()` / `height()` are the requested local size, not the clip size.
- Zero-size views are valid; print is a no-op and must not hang.
- Text wraps and scrolls using local size; scroll pixels only in the clip.
- Direct `setPos` / `setPosPx` keep current semantics. View-layout
changes may normalize the stored cursor into `[0, width] × [0, height]`.
- `pushView` / `popView` save and restore the print cursor.
- `resetView` sets the print cursor to `(0, 0)` and does not rely on
normalization.
- Reads clamp-and-shrink to the effective clip. `getPixel` rejects
framebuffer-valid pixels that sit outside the current clip.
- `filterImg` snapshots complete VIEW state at call time. Callback `x, y`
are that view’s local coordinates.
- `paint` cannot cross the effective clip.
- Input stays screen-relative. `viewToScreen` / `screenToView` use the
logical origin, not the clip origin.
- `cls()` always resets the cursor to `(0, 0)`. Rectangular `cls` resets
only for the full requested view `0, 0, width(), height()`.
- `popView` on an empty stack throws `VIEW_STACK_EMPTY`.
- Multiple views in one render cycle flush into the same framebuffer.
- Child clips intersect the parent. Resize recomputes from requested
local rects.
- `applyShader` and display shaders are full-framebuffer. View scissor is
restored after an FBO shader pass.



### `pushView( x, y, width, height )`

Pushes a child view relative to the current local origin. Saves the parent
cursor and starts the child cursor at `(0, 0)`.

### `popView()`

Pops the current child view and restores the parent cursor. Nested pop
returns to the parent view. Popping the last view returns to implicit
full screen. Throws `VIEW_STACK_EMPTY` when the stack is empty.

### `resetView()`

Clears the entire view stack, restores implicit full-screen origin and
clip, and sets the print cursor to `(0, 0)`. Safe when the stack is
already empty. Does not restore saved nested cursors.

### `viewToScreen( x, y )`

Converts a local point to screen / FBO coordinates using the logical
origin. Returns `{ x, y }`.

### `screenToView( x, y )`

Converts a screen / FBO point to local view coordinates using the logical
origin. Returns `{ x, y }`.

---



## Rendering



### `render()`

Renders pending pixel operations to the canvas.

### `cls( x, y, width, height )`

Clears the active view or a rectangular local region, clipped to the
effective view. `cls()` always resets the print cursor to `(0, 0)`.
Rectangular `cls` resets the cursor only for the full requested view.

### `setAutoRender( isAutoRender )`

Enables or disables automatic rendering after draw operations.

### `setPen( pen, size )`

Sets the pen style and size for drawing operations.

- **pen**: `"pixel"`, `"square"`, or `"circle"`



### `setBlend( mode, noise )`

Sets the blend mode for drawing operations.

- **mode**: `"replace"` or `"alpha"`

---



## Custom Shaders

Users supply fragment source only. The vertex stage is a built-in fullscreen
quad (`in vec2 v_texCoord`, `out vec4 fragColor`). Source must include
`#version 300 es`. When first applied to a screen, the shader is compiled synchronously and must
declare
`uniform sampler2D u_texture`.

**Built-in uniforms:** `u_texture` (`sampler2D`), `u_sourceSize` (`vec2`),
`u_outputSize` (`vec2`), `u_time` (`float`), `u_frame` (`int`).

**Resolution:**

- FBO shaders: `u_sourceSize` = `u_outputSize` = logical screen size
- Display shaders: `u_sourceSize` = logical FBO; `u_outputSize` =
`canvas.width` × `canvas.height` (backing store, not CSS)

Custom uniform values are interpreted from the active GLSL declaration:

- `float`, `int`, `uint`, and `bool` accept scalar values; boolean uniforms require booleans.
- Vector, matrix, and uniform-array values use flat JavaScript arrays or compatible
  `Float32Array`, `Int32Array`, and `Uint32Array` values.
- Arrays must contain exactly the reflected component count. Matrices use WebGL column-major
  order and support square and non-square GLSL ES 3.00 matrix types.
- `sampler2D` accepts the same registered image names, direct image inputs, canvases, and Pi
  screens as `drawImage()`. Sampler arrays accept one image input per element.

Texture unit 0 is reserved for `u_texture`; auxiliary samplers use consecutive texture units.
Queued FBO passes snapshot their sampler textures. Display samplers retain their image sources and
refresh dynamic canvas or screen content whenever the screen is presented. A shader cannot sample
its own destination screen. Removing a registered image name does not clear a source already
retained by a display shader; replace or clear that uniform to release the reference.

Unknown names and attempts to override built-in uniforms are ignored. Known values with the wrong
shape or type throw `INVALID_UNIFORM_VALUE` synchronously. Unsupported GLSL types throw
`UNSUPPORTED_UNIFORM_TYPE`, and exceeding the context texture-unit limit throws
`TOO_MANY_TEXTURE_UNIFORMS`. Programs and reflection data are cached per screen after validation.

### `createShader( fragmentSource, uniforms )`

Creates a screen-independent shader. Returns a numeric handle.

- **fragmentSource**: GLSL ES 3.00 fragment source
- **uniforms**: Optional reflected default values (`ShaderUniforms`)

```javascript
const invert = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;
void main() {
	vec4 c = texture(u_texture, v_texCoord);
	fragColor = vec4(1.0 - c.rgb, c.a);
}` );
```


### `getShaderInfo( shaderHandle )`

Returns a copied diagnostic snapshot without compiling the shader. Global fields include the full
fragment source, copied default uniforms, and counts for compiled screens, queued passes, and
active display screens. When a current screen is available, `screen` also reports that screen's
compilation state, queued-pass count, display use, and reflected uniform names, GLSL types, array
sizes, and reserved status.

- **shaderHandle**: Handle from `createShader`

```javascript
const info = $.getShaderInfo( invert );
$.print( info.compiledScreenCount );
```


### `removeShader( shaderHandle )`

Completes queued passes using the shader, restores the default presentation path on screens using
it as a display shader, deletes every cached WebGL program, and invalidates the handle. Removing an
unknown or previously removed numeric handle is a no-op. Malformed handles throw
`INVALID_SHADER_HANDLE`.

- **shaderHandle**: Handle from `createShader`

```javascript
$.applyShader( invert );
$.removeShader( invert );
```



### `applyShader( shaderHandle, uniforms )`

Queues an FBO (logical → logical) shader at the current draw position.
Creates a batch break; does not run immediately. Later draws sit on top.
Works on offscreen screens.

- **shaderHandle**: Handle from `createShader`
- **uniforms**: Optional per-call `ShaderUniforms` overrides

```javascript
$.rect( 10, 10, 40, 40, "red" );
$.applyShader( invert );
$.line( 0, 0, 50, 50 );
```



### `setDisplayShader( shaderHandle, uniforms )`

Sets the final presentation shader. Does not modify the logical FBO.
When active, canvas backing tracks CSS presentation size (clamped).
`null` restores the default display path and logical backing.

Does not run on offscreen screens (state may still be stored). Replaces
the shader and resets persistent display overrides to the uniforms from
this call.

- **shaderHandle**: Handle from `createShader`, or `null` to clear
- **uniforms**: Optional initial display `ShaderUniforms` overrides

```javascript
$.setDisplayShader( invert );
$.setDisplayShader( null );
```



### `setDisplayShaderUniforms( uniforms )`

Merges persistent display-shader overrides and re-presents the current
logical FBO if the screen is eligible. Does not resize.

- **uniforms**: `ShaderUniforms` values to merge into the active display overrides

```javascript
$.setDisplayShader( tint, { "u_gain": 1 } );
$.setDisplayShaderUniforms( { "u_gain": 0.5 } );
```

---



## Colors & Palettes



### `setDefaultPal( pal )`

Sets the default color palette for new screens.

### `setDefaultColor( color )`

Sets the default drawing color.

### `setColor( color, isAddToPalette )`

Sets the current drawing color.

### `setPalColor( index, color )`

Changes a specific color in the palette.

### `getPal()`

Returns a copy of the current color palette.

### `setPal( pal )`

Replaces the entire color palette.

### `findColor( color, tolerance, isAddToPalette )`

Finds the palette index of a color.

### `setBgColor( color )`

Sets the canvas background color.

### `setContainerBgColor( color )`

Sets the container background color.

### `swapColor( oldColor, newColor )`

Replaces all instances of one color with another on screen.

---



## Basic Graphics



### `pset( x, y )`

Draws a single pixel at the specified coordinates.

### `line( x1, y1, x2, y2 )`

Draws a line between two points.

### `rect( x, y, width, height, fillColor )`

Draws a rectangle (optionally filled).

### `circle( x, y, radius, fillColor )`

Draws a circle (optionally filled).

### `put( data, x, y, includeZero )`

Draws pixel data array to the screen.

### `get( x, y, width, height, tolerance, asIndex )`

Captures a rectangular region as pixel data. Coordinates are view-local.
The result is clamp-and-shrunk to the effective clip (no padding).

### `getPixel( x, y )`

Returns the color of a single local pixel. Pixels outside the effective
clip return transparent black, even if they exist in the framebuffer.

---



## Advanced Graphics



### `arc( x, y, radius, angle1, angle2 )`

Draws an arc segment of a circle.

### `ellipse( x, y, radiusX, radiusY, fillColor )`

Draws an ellipse (optionally filled).

### `bezier( xStart, yStart, x1, y1, x2, y2, xEnd, yEnd )`

Draws a cubic Bézier curve.

### `filterImg( filter, x1, y1, x2, y2 )`

Applies a filter to a local inclusive rectangle. Snapshots the complete
VIEW state at call time. Callback `x, y` are that view’s local coordinates.

---



## Drawing (BASIC-style)



### `draw( drawString )`

Executes BASIC-style drawing commands from a string.

- Supports: `U`, `D`, `L`, `R`, `E`, `F`, `G`, `H` (directions)
- Also: `M` (move), `C` (color), `P` (paint), `T` (turn angle), `A` (arc)

---



## Paint & Fill



### `paint( x, y, fillColor, tolerance )`

Flood fills a region starting from a local point. The fill cannot cross
the effective clip.

---



## Images & Sprites



### `loadImage( src, name, onLoad, onError )`

Loads an image from a URL or element.

### `loadSpritesheet( src, name, width, height, margin )`

Loads a spritesheet and divides it into frames.

### `removeImage( name )`

Removes a loaded image from memory. Draws already queued with the image complete before its GPU
textures are freed; subsequent draws by name fail with `IMAGE_NOT_FOUND`.

### `getImage( name, x1, y1, x2, y2 )`

Captures a screen region as an image.

### `getSpritesheetData( name )`

Returns frame data for a spritesheet.

### `drawImage( name, x, y, rotation, anchorX, anchorY, alpha, scaleX, scaleY )`

Draws a loaded image to the screen.

### `drawSprite( name, frame, x, y, rotation, anchorX, anchorY, alpha, scaleX, scaleY )`

Draws a sprite frame from a loaded spritesheet.

---



## Fonts



### `loadFont( fontSrc, width, height, charSet, isEncoded )`

Loads a custom bitmap font.

### `setDefaultFont( fontId )`

Sets the default font for new screens.

### `setFont( font )`

Sets the current font (font ID or CSS font string).

### `setFontSize( width, height )`

Changes the size of the current bitmap font.

### `getAvailableFonts()`

Returns a list of loaded fonts.

### `setChar( charCode, data )`

Defines custom character bitmap data.

---



## Text Printing



### `print( msg, isInline, isCentered )`

Prints text in the active view. Wrap, columns, rows, and scroll use the
requested local size. Scroll only moves pixels inside the effective clip.
Zero-size views are a no-op.

### `setPos( col, row )`

Sets the text cursor position in character cells. Clamps only when the
position is past the local view bound.

### `setPosPx( x, y )`

Sets the text cursor position in pixels. Does not clamp. View-layout
changes may normalize the stored cursor into the current local range.

### `getPos()`

Returns the current text cursor position (col, row).

### `getPosPx()`

Returns the current text cursor position (x, y).

### `getCols()`

Returns the number of text columns.

### `getRows()`

Returns the number of text rows.

### `setWordBreak( isEnabled )`

Enables or disables word wrapping.

### `piCalcWidth( msg )`

Calculates text width for pixel fonts.

### `canvasCalcWidth( msg )`

Calculates text width for canvas fonts.

---



## Keyboard Input



### `startKeyboard()`

Starts listening for keyboard events.

### `stopKeyboard()`

Stops listening for keyboard events.

### `inkey( key )`

Returns the current state of a key or all pressed keys.

### `setActionKeys( keys )`

Marks keys as action keys (preventDefault).

### `removeActionKeys( keys )`

Removes keys from the action keys list.

### `onkey( key, mode, fn, once, allowRepeat )`

Registers a keyboard event handler.

- **mode**: `"up"` or `"down"`



### `offkey( key, mode, fn, once, allowRepeat )`

Removes a keyboard event handler.

### `input( prompt, fn, cursor, isNumber, isInteger, allowNegative )`

Displays an input prompt for user text/number entry.

### `cancelInput()`

Cancels the current input operation.

---



## Mouse Input



### `startMouse()`

Starts listening for mouse events.

### `stopMouse()`

Stops listening for mouse events.

### `getMouse()`

Returns the current mouse state.

### `inmouse()`

Returns the current mouse state (auto-starts mouse).

### `setEnableContextMenu( isEnabled )`

Enables or disables the right-click context menu.

### `onmouse( mode, fn, once, hitBox, customData )`

Registers a mouse event handler.

- **mode**: `"down"`, `"up"`, or `"move"`



### `offmouse( mode, fn )`

Removes a mouse event handler.

---



## Touch Input



### `startTouch()`

Starts listening for touch events.

### `stopTouch()`

Stops listening for touch events.

### `intouch()`

Returns the current touch state (auto-starts touch).

### `ontouch( mode, fn, once, hitBox, customData )`

Registers a touch event handler.

- **mode**: `"start"`, `"end"`, or `"move"`



### `offtouch( mode, fn )`

Removes a touch event handler.

### `setPinchZoom( isEnabled )`

Enables or disables pinch-to-zoom gestures.

---



## Press Input (Unified)



### `inpress()`

Returns current input state (mouse or touch).

### `onpress( mode, fn, once, hitBox, customData )`

Registers a unified press event handler (works with mouse or touch).

- **mode**: `"down"`, `"up"`, or `"move"`



### `offpress( mode, fn )`

Removes a press event handler.

### `onclick( fn, once, hitBox, customData )`

Registers a click event handler (works with mouse or touch).

### `offclick( fn )`

Removes a click event handler.

---



## Gamepad Input



### `startGamepad()`

Starts polling for gamepad input.

### `stopGamepad()`

Stops polling for gamepad input.

### `ingamepad( gamepadIndex )`

Returns the state of a gamepad (or all gamepads if index is null).

### `setGamepadSensitivity( sensitivity )`

Sets the analog stick dead zone (0-1).

### `onGamepadConnected( fn )`

Registers a callback for when a gamepad connects.

### `onGamepadDisconnected( fn )`

Registers a callback for when a gamepad disconnects.

---



## Sound & Audio



### `createAudioPool( src, poolSize )`

Creates a pool of audio elements for playing the same sound multiple times.

### `deleteAudioPool( audioId )`

Deletes an audio pool.

### `playAudioPool( audioId, volume, startTime, duration )`

Plays a sound from an audio pool.

### `stopAudioPool( audioId )`

Stops all sounds in an audio pool (or all pools if audioId is null).

### `sound( frequency, duration, volume, oType, delay, attack, decay )`

Plays a synthesized sound using Web Audio API.

- **oType**: `"sine"`, `"square"`, `"triangle"`, `"sawtooth"`, or custom wave table



### `stopSound( soundId )`

Stops a playing sound (or all sounds if soundId is null).

### `setVolume( volume )`

Sets the global volume (0-1).

---



## Music (BASIC-style)



### `play( playString )`

Plays music using BASIC-style notation.

Supports:

- **Notes**: A-G with sharps (#/+) and flats (-)
- **Commands**: O (octave), L (length), T (tempo), V (volume), P (pause)
- **Waveforms**: W (SINE, SQUARE, TRIANGLE, SAWTOOTH)
- **Styles**: MS (staccato), MN (normal), ML (legato)
- **Multiple tracks**: Separated by commas



### `stopPlay( trackId )`

Stops playing music (or all tracks if trackId is null).

---



## Events



### `clearEvents( type )`

Clears event handlers for specified input types.

- **type**: `"keyboard"`, `"mouse"`, `"touch"`, `"press"`, `"click"`, `"gamepad"`, or array of types
- If type is omitted, clears all event handlers

---



## Plugins



### `registerPlugin( name, version, description, init )`

Registers a plugin with Pi.js.

### `getPlugins()`

Returns a list of registered plugins.

---



## Utilities



### `ready( callback )`

Waits for document ready and all pending resources to load.

- Returns a Promise
- Supports both callback and async/await patterns



### `set( options )`

Sets multiple settings at once using an object.

- Can set any "set" command as a property (e.g., `{ "color": 1, "pen": "circle" }`)

---
