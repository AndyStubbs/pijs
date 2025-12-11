# Pi.js API Reference

This document lists all external API commands available in Pi.js.

## Table of Contents

- [Core & Screen Management](#core--screen-management)
- [Rendering](#rendering)
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

### `screen( aspect, container, isOffscreen, willReadFrequently, noStyles, resizeCallback )`
Creates a new screen/canvas with specified properties.

**Parameters:**
- **aspect**: Aspect ratio string (e.g., `"4:3"`, `"320x200"`, `"80m60"`, `"80e60"`)
- **container**: DOM element or ID to contain the canvas
- **isOffscreen**: Boolean - create an offscreen canvas for rendering
- **willReadFrequently**: Boolean - optimize canvas for frequent pixel reading
- **noStyles**: Boolean - create canvas without default styling
- **resizeCallback**: Function - called when screen is resized: `function( screen, fromSize, toSize )`
  - `screen`: The screen object that was resized
  - `fromSize`: Object with `width` and `height` before resize
  - `toSize`: Object with `width` and `height` after resize
  - **Note**: Screens automatically resize when their container element resizes (using ResizeObserver)

### `setScreen( screen )`
Sets the active screen for drawing operations.

### `removeScreen()`
Removes the current screen from the page and memory.

**Note:** After removal, calling any methods on the removed screen object will throw a `TypeError` with code `"DELETED_METHOD"`.

### `getScreen( screenId )`
Gets a screen object by its ID.

### `width()`
Returns the width of the current screen in pixels.

### `height()`
Returns the height of the current screen in pixels.

### `canvas()`
Returns the HTMLCanvasElement for the current screen.

### `setPixelMode( isEnabled )`
Enables or disables pixel-perfect rendering mode.

---

## Rendering

### `render()`
Renders pending pixel operations to the canvas.

### `cls( x, y, width, height )`
Clears the screen or a rectangular region.

### `setAutoRender( isAutoRender )`
Enables or disables automatic rendering after draw operations.

### `setPen( pen, size )`
Sets the pen style and size for drawing operations.
- **pen**: `"pixel"`, `"square"`, or `"circle"`

### `setBlend( mode, noise )`
Sets the blend mode for drawing operations.
- **mode**: `"replace"` or `"alpha"`

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

### `get( x1, y1, x2, y2, tolerance, isAddToPalette )`
Captures a rectangular region as pixel data array.

### `getPixel( x, y )`
Returns the color of a single pixel.

---

## Advanced Graphics

### `arc( x, y, radius, angle1, angle2 )`
Draws an arc segment of a circle.

### `ellipse( x, y, radiusX, radiusY, fillColor )`
Draws an ellipse (optionally filled).

### `bezier( xStart, yStart, x1, y1, x2, y2, xEnd, yEnd )`
Draws a cubic Bézier curve.

### `filterImg( filter )`
Applies a filter function to all pixels on screen.

---

## Drawing (BASIC-style)

### `draw( drawString )`
Executes BASIC-style drawing commands from a string.
- Supports: `U`, `D`, `L`, `R`, `E`, `F`, `G`, `H` (directions)
- Also: `M` (move), `C` (color), `P` (paint), `T` (turn angle), `A` (arc)

---

## Paint & Fill

### `paint( x, y, fillColor, tolerance )`
Flood fills a region starting from the specified point.

---

## Images & Sprites

### `loadImage( src, name, onLoad, onError )`
Loads an image from a URL or element.

### `loadSpritesheet( src, name, width, height, margin )`
Loads a spritesheet and divides it into frames.

### `removeImage( name )`
Removes a loaded image from memory.

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
Prints text to the screen.

### `setPos( col, row )`
Sets the text cursor position (in character cells).

### `setPosPx( x, y )`
Sets the text cursor position (in pixels).

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

## Notes

- **Screen commands**: Most drawing and rendering commands require an active screen created with `screen()`.
- **Color formats**: Colors can be specified as:
  - Palette index (integer)
  - Hex string (`"#RRGGBB"` or `"#RRGGBBAA"`)
  - RGB array (`[r, g, b]` or `[r, g, b, a]`)
  - Color object (`{ r, g, b, a }`)
- **Coordinates**: All coordinate systems use top-left as (0, 0).
- **Parameters**: Optional parameters can be omitted or passed as `null`.

