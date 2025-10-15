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
- ✅ **commands.js** - Command registration, API generation, ready system
- ✅ **screen-manager.js** - Screen creation, management, multiple screens, aspect ratio handling
- ✅ **utils.js** - Math, color conversion, type checking, string utilities
- ✅ **colors.js** - Complete palette and color management
- ✅ **renderer.js** - Image data rendering, pen system, blend modes

**Core Commands:**
- ✅ `ready` - Document ready with callback/promise support and resource loading
- ✅ `set` - Global settings command
- ✅ `wait` / `done` - Module-level resource loading tracking (exported for modules)

#### Graphics Commands (100% Complete - 19/19 from legacy)
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
- ✅ `draw` - BASIC-style drawing with string commands (U/D/L/R/E/F/G/H/M/C/T/A/B/N/P/S)

**Module: paint.js**
- ✅ `paint` - Flood fill with tolerance (optimized BFS implementation)

#### Image Commands (100% Complete - 7/7 from legacy)
**Module: images.js**
- ✅ `loadImage` - Load from URL/Image/Canvas (with ready() integration)
- ✅ `loadSpritesheet` - Load spritesheet with auto-detection or fixed grid
- ✅ `removeImage` - Remove loaded image from memory
- ✅ `getImage` - Capture screen region as image
- ✅ `drawImage` - Draw image with rotation, anchors, alpha, scaling
- ✅ `drawSprite` - Draw sprite frame with rotation, anchors, alpha, scaling
- ✅ `getSpritesheetData` - Get spritesheet frame data

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

#### Screen Management Commands (100% Complete)
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
- ✅ `setAutoRender` - Enable/disable automatic rendering

---

### 🔨 Remaining Features (56 APIs from legacy)

#### Priority 1: Text & Printing (26 APIs)
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

#### Priority 2: Input System (37 APIs)
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

#### Priority 3: Sound (12 APIs)
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

#### Priority 4: Event System (4 APIs)
**Recommended: core/events.js or integrate into screen-manager.js**
- ⬜ `onevent` - Register custom event handler
- ⬜ `offevent` - Unregister custom event handler
- ⬜ `triggerEventListeners` - Trigger custom events
- ⬜ `clearEvents` - Clear all event handlers

#### Priority 5: Additional Core Features (0 APIs - DEPRECATED)
- ⬜ `setErrorMode` - FEATURE DEPRECATED - Do not implement

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

### Media System (2 files)
```
src/modules/
  ├── sound.js        - Sound effects, audio pools, volume control
  └── play.js         - Musical note playback, track creation
```

### Core Extensions (1 file)
```
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
8. **Flood Fill Algorithm** - BFS with Uint8Array visited tracking, single-pass pixel setting
9. **Ready/Loading System** - Tracks document ready + resource loading, supports callbacks & promises, triggers once

### Remaining Decisions

1. **Font System** - Use bitmap fonts, canvas fonts, or both?
2. **Event System** - Separate module or integrate into screen-manager?

---

## Next Steps (Recommended Order)

1. **Implement font.js + print.js** - Core text functionality
2. **Implement keyboard.js** - Basic keyboard input
3. **Implement mouse.js** - Mouse input and events
4. **Implement sound.js** - Basic sound effects
5. **Implement touch.js** - Touch support for mobile
6. **Implement gamepad.js** - Gamepad support
7. **Implement play.js** - Musical playback
8. **Implement table.js** - Table formatting
9. **Complete remaining core features** - Event system (onevent, offevent, etc.)

---

**Last Updated:** October 15, 2025
