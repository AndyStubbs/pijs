# Pi.js v2.0 Refactor Plan

## Goal

Complete refactor to modern, modular architecture while maintaining **Reasonable API compatibility**
with v1.2.4 and full **pixel-mode support** for retro graphics.

---

## Success Criteria

- ✅ **API Compatibility**: All `pi.*` functions work mostly like v1.2.4
- ✅ **Minor API Improvements**: Some changes to the API are acceptible if it's a net benefit
- ✅ **Pixel Mode**: Manual pixel drawing to avoid anti-aliasing
- ✅ **Modern Code**: ES2020+, modular, well-documented
- ✅ **All Tests Pass**: Existing visual regression tests work
- ✅ **Build System**: esbuild with multiple formats (ESM/CJS/IIFE)
- ✅ **Performance**: Equal or better than legacy

---

---

## Legacy Code

- There are two legacy code bases to use for the refactor (./legacy and ./src-v2-refactor-1)
- ./legacy is the primary legacy source code
- ./src-v2-refactor-1 is a first attempt at refactor but I didn't like the architecture so I started
	over. But there are still some good things in there so it might be good to keep as a reference.
---

## Architecture Overview

### Core Principles

1. **Global `$` Alias (Preferred) and `pi` Object** - Maintains v1 compatibility, `$` is preferred
2. **Modular Internals** - Clean separation of concerns
3. **Dual Implementations** - Pixel-perfect vs anti-aliased for each drawing command
4. **Command System** - Automatic API generation from command registration
5. **Parameter Flexibility** - Support both `func(a, b, c)` and `func({ a, b, c })`

### Key Systems

**Pixel Mode**
- When `pixelMode: true` (default), uses manual pixel algorithms
- Bresenham line algorithm, midpoint circle, etc.
- Direct imageData manipulation
- No canvas anti-aliasing

**Screen Management**
- Multiple independent screens/canvases
- Active screen concept
- Per-screen state (colors, palette, position, etc.)
- ImageData caching for performance

---

## Progress Tracking

### ✅ Completed Features (October 15, 2025)

#### Core System (100% Complete)
- ✅ **commands.js** - Command registration and API generation system
- ✅ **screen-manager.js** - Screen creation, management, multiple screens, aspect ratio handling
- ✅ **utils.js** - Math, color conversion, type checking, string utilities
- ✅ **colors.js** - Complete palette and color management
- ✅ **renderer.js** - Image data rendering, pen system, blend modes

#### Graphics Commands (100% Complete - 18/18 from legacy)
**Module: graphics.js**
- ✅ `pset` - Set pixel (pixel & AA modes)
- ✅ `line` - Draw line (Bresenham algorithm)
- ✅ `rect` - Draw rectangle with optional fill
- ✅ `circle` - Draw circle with scanline fill (Midpoint circle algorithm)
- ✅ `get` - Capture screen region as palette data
- ✅ `put` - Draw palette data to screen
- ✅ `getPixel` - Get color at specific pixel

**Module: graphics-advanced.js**
- ✅ `arc` - Draw partial circle/arc
- ✅ `ellipse` - Draw ellipse with scanline fill (Midpoint ellipse algorithm)
- ✅ `bezier` - Draw cubic Bézier curves with adaptive stepping
- ✅ `filterImg` - Apply filter function to all pixels

**Module: draw.js**
- ✅ `draw` - BASIC-style drawing with string commands (U/D/L/R/E/F/G/H/M/C/T/A/B/N)

#### Color/Palette Commands (100% Complete - 10/10)
**Module: colors.js**
- ✅ `setColor` - Set drawing color
- ✅ `setDefaultColor` - Set default color for new screens
- ✅ `setDefaultPal` - Set default palette for new screens
- ✅ `setBgColor` - Set canvas background color
- ✅ `setContainerBgColor` - Set container background color
- ✅ `setPalColor` - Change individual palette entry
- ✅ `getPal` - Get entire palette as array
- ✅ `setPal` - Replace entire palette
- ✅ `swapColor` - Swap palette color throughout screen
- ✅ `findColor` - Find/add color in palette

#### Screen Management Commands (90% Complete)
**Module: screen-manager.js**
- ✅ `screen` - Create new screen with aspect ratio support
- ✅ `removeScreen` - Remove screen from page
- ✅ `setScreen` - Set active screen
- ✅ `setDefaultInputFocus` - Set default input focus element
- ✅ `width` - Get screen width
- ✅ `height` - Get screen height
- ✅ `canvas` - Get canvas element
- ✅ `setPixelMode` - Toggle pixel/AA mode

**Module: renderer.js**
- ✅ `render` - Render image data to canvas
- ✅ `cls` - Clear screen (full or partial)
- ✅ `setPen` - Set pen type and size
- ✅ `setBlendMode` - Set blend mode with noise support

---

### 🔨 Remaining Features (66 APIs from legacy)

#### Priority 1: Core Drawing Features (2 APIs)
**Recommended: modules/paint.js**
- ⬜ `paint` - Flood fill with tolerance (pi-screen-paint.js)

**Note**: Paint command is referenced in `draw` command but currently stubbed out

#### Priority 2: Text & Printing (26 APIs)
**Recommended: modules/font.js**
- ⬜ `setFont` - Set font family
- ⬜ `setFontSize` - Set font size
- ⬜ `setDefaultFont` - Set default font
- ⬜ `getAvailableFonts` - List available fonts
- ⬜ `loadFont` - Load custom font
- ⬜ `setChar` - Set character bitmap data

**Recommended: modules/print.js**
- ⬜ `print` - Print text to screen
- ⬜ `piPrint` - Pi.js bitmap print
- ⬜ `canvasPrint` - Canvas text print
- ⬜ `bitmapPrint` - Bitmap font print
- ⬜ `setPos` - Set cursor position (row/col)
- ⬜ `setPosPx` - Set cursor position (pixels)
- ⬜ `getPos` - Get cursor position (row/col)
- ⬜ `getPosPx` - Get cursor position (pixels)
- ⬜ `getCols` - Get columns count
- ⬜ `getRows` - Get rows count
- ⬜ `piCalcWidth` - Calculate text width
- ⬜ `canvasCalcWidth` - Calculate canvas text width
- ⬜ `setWordBreak` - Set word breaking behavior

**Recommended: modules/table.js**
- ⬜ `printTable` - Print formatted tables

#### Priority 3: Input System (37 APIs)
**Recommended: modules/keyboard.js**
- ⬜ `startKeyboard` - Initialize keyboard input
- ⬜ `stopKeyboard` - Stop keyboard input
- ⬜ `reinitKeyboard` - Reinitialize keyboard
- ⬜ `onkey` - Register key event handler
- ⬜ `offkey` - Unregister key event handler
- ⬜ `inkey` - Check if key is pressed
- ⬜ `clearKeys` - Clear all key states
- ⬜ `input` - Get text input from user
- ⬜ `cancelInput` - Cancel text input
- ⬜ `setActionKey` - Set action key
- ⬜ `setInputCursor` - Set input cursor character

**Recommended: modules/mouse.js**
- ⬜ `startMouse` - Initialize mouse input
- ⬜ `stopMouse` - Stop mouse input
- ⬜ `onmouse` - Register mouse move handler
- ⬜ `offmouse` - Unregister mouse move handler
- ⬜ `onclick` - Register click handler
- ⬜ `offclick` - Unregister click handler
- ⬜ `onpress` - Register press handler
- ⬜ `offpress` - Unregister press handler
- ⬜ `inmouse` - Check mouse position
- ⬜ `inpress` - Check if mouse pressed
- ⬜ `getMouse` - Get mouse state
- ⬜ `setEnableContextMenu` - Enable/disable context menu

**Recommended: modules/touch.js**
- ⬜ `startTouch` - Initialize touch input
- ⬜ `stopTouch` - Stop touch input
- ⬜ `ontouch` - Register touch handler
- ⬜ `offtouch` - Unregister touch handler
- ⬜ `intouch` - Check touch state
- ⬜ `getTouchPress` - Get touch press data
- ⬜ `setPinchZoom` - Enable/disable pinch zoom

**Recommended: modules/gamepad.js**
- ⬜ `ongamepad` - Register gamepad handler
- ⬜ `offgamepad` - Unregister gamepad handler
- ⬜ `ingamepads` - Check gamepad state

#### Priority 4: Images (7 APIs)
**Recommended: modules/images.js**
- ⬜ `loadImage` - Load image from URL
- ⬜ `removeImage` - Remove loaded image
- ⬜ `getImage` - Get loaded image
- ⬜ `drawImage` - Draw image to screen
- ⬜ `drawSprite` - Draw sprite from sheet
- ⬜ `loadSpritesheet` - Load spritesheet
- ⬜ `getSpritesheetData` - Get spritesheet data

#### Priority 5: Sound (12 APIs)
**Recommended: modules/sound.js**
- ⬜ `sound` - Play simple sound
- ⬜ `createSound` - Create sound object
- ⬜ `stopSound` - Stop playing sound
- ⬜ `setVolume` - Set volume
- ⬜ `createAudioPool` - Create audio pool for multiple instances
- ⬜ `deleteAudioPool` - Delete audio pool
- ⬜ `playAudioPool` - Play from audio pool
- ⬜ `stopAudioPool` - Stop audio pool

**Recommended: modules/play.js**
- ⬜ `play` - Play musical notes/sequence
- ⬜ `createTrack` - Create music track
- ⬜ `stopPlay` - Stop playing track

#### Priority 6: Event System (4 APIs)
**Recommended: core/events.js or integrate into screen-manager.js**
- ⬜ `onevent` - Register custom event handler
- ⬜ `offevent` - Unregister custom event handler
- ⬜ `triggerEventListeners` - Trigger custom events
- ⬜ `clearEvents` - Clear all event handlers

#### Priority 7: Additional Core Features (2 APIs)
**Recommended: core/screen-manager.js or commands.js**
- ⬜ `setAutoRender` - Enable/disable auto-rendering
- ⬜ `ready` - Document ready callback
- ⬜ `setErrorMode` - Set error handling mode

---

## Recommended Module Structure for Remaining Work

### Text System (3 files)
```
src/modules/
  ├── font.js         - Font loading, character data, font management
  ├── print.js        - Text printing, cursor positioning, word breaking
  └── table.js        - Table formatting and printing
```

### Input System (4 files)
```
src/modules/
  ├── keyboard.js     - Keyboard events, key checking, text input
  ├── mouse.js        - Mouse events, position tracking, click detection
  ├── touch.js        - Touch events, multi-touch support, pinch zoom
  └── gamepad.js      - Gamepad support and button mapping
```

### Media System (3 files)
```
src/modules/
  ├── images.js       - Image loading, sprites, spritesheet management
  ├── sound.js        - Sound effects, audio pools, volume control
  └── play.js         - Musical note playback, track creation
```

### Core Extensions (2 files)
```
src/modules/
  └── paint.js        - Flood fill with tolerance support

src/core/
  └── events.js       - Custom event system (or integrate into screen-manager)
```

### Asset Data (1 file)
```
src/assets/
  └── font-data.js    - Default bitmap font character data
```

---

## Implementation Notes

### Completed Architecture Decisions

1. **Dual Mode System** - All graphics commands have both pixel and AA implementations
2. **Options Parsing** - Flexible parameter system supports both `func(a,b,c)` and `func({a,b,c})`
3. **Error Handling** - Modern typed errors with error codes (TypeError, RangeError, etc.)
4. **Color Cache** - Prepopulated cache for fast palette lookups, always synchronized
5. **Module Pattern** - Each module has `init()`, External API, and Internal sections
6. **Screen Data** - All screen state stored in screenData object
7. **Command Registration** - Automatic API generation via screenManager.addCommand()

### Remaining Decisions

1. **Font System** - Use bitmap fonts, canvas fonts, or both?
2. **Event System** - Separate module or integrate into screen-manager?
3. **setAutoRender** - Add to renderer.js or screen-manager.js?
4. **Asset Loading** - How to handle async loading (Promises? Callbacks? Both?)

---

## Next Steps (Recommended Order)

1. **Implement paint.js** - Required by draw command for P/S commands
2. **Implement font.js + print.js** - Core text functionality
3. **Implement images.js** - Image loading and drawing
4. **Implement keyboard.js** - Basic keyboard input
5. **Implement mouse.js** - Mouse input and events
6. **Implement sound.js** - Basic sound effects
7. **Implement touch.js** - Touch support for mobile
8. **Implement gamepad.js** - Gamepad support
9. **Implement play.js** - Musical playback
10. **Implement table.js** - Table formatting
11. **Complete remaining core features** - setAutoRender, event system, error modes

---

**Last Updated:** October 15, 2025
