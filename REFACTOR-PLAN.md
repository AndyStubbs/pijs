# Pi.js v2.0 Refactor Plan

## Goal

Complete refactor to modern, modular architecture while maintaining **100% API compatibility** with v1.2.4 and full **pixel-mode support** for retro graphics.

---

## Success Criteria

- ✅ **API Compatibility**: All `pi.*` functions work exactly like v1.2.4
- ✅ **Pixel Mode**: Manual pixel drawing to avoid anti-aliasing
- ✅ **Modern Code**: ES2020+, modular, well-documented
- ✅ **All Tests Pass**: Existing visual regression tests work
- ✅ **Build System**: esbuild with multiple formats (ESM/CJS/IIFE)
- ✅ **Performance**: Equal or better than legacy

---

## Architecture Overview

### Core Principles

1. **Global `$` Alias (Preferred) and `pi` Object** - Maintains v1 compatibility, `$` is preferred for brevity
2. **Internal API (`pi._`)** - Exposed for plugin support and extensibility (restored in v2.0)
3. **Modular Internals** - Clean separation of concerns
4. **Dual Implementations** - Pixel-perfect vs anti-aliased for each drawing command
5. **Command System** - Automatic API generation from command registration
6. **Parameter Flexibility** - Support both `func(a, b, c)` and `func({ a, b, c })`

### Key Systems

**Command Registration**
- `addCommand(name, fn)` - Single implementation
- `addCommands(name, pxFn, aaFn)` - Dual pixel/AA implementations
- `addSetting(name, fn)` - Settings that affect behavior
- `addPen(name, fn)` - Pen drawing modes
- `addBlendCommand(name, fn)` - Blend operations

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

**Plugin Support via `pi._`**
- The internal API (`pi._`) is intentionally exposed for extensibility
- **Change from v1.x:** Previously, `_` was deleted after initialization to hide internals. In v2.0, **keeping it exposed** for plugin support
- Allows third-party plugins to:
  - Register custom commands via `pi._.addCommand()`
  - Register dual implementations via `pi._.addCommands()`
  - Add custom pens via `pi._.addPen()`
  - Add blend modes via `pi._.addBlendCommand()`
  - Access internal data store via `pi._.data`
- Plugin authors can extend Pi.js without modifying core
- Example: A physics plugin could add `pi.physics()` commands

---

## Progress Tracking

### Phase 0: Foundation ✅ COMPLETE

**Status:** Complete  
**Files Created:**
- `src/core/pi-data.js` - Central data storage
- `src/core/command-system.js` - Command registration (uses native errors)
- `src/modules/utils.js` - All utility functions (546 lines, fully ported)
- `scripts/build.js` - esbuild build script with version injection
- `package.json` - Updated dependencies (4 minimal deps)
- `server.js` - Simple development server
- `.cursorrules` - Project coding conventions

**What Works:**
- Build system compiles successfully
- Utils module fully ported (colors, math, strings, type checking)
- Core architecture in place
- Development server functional
- Version managed from single source (package.json)
- `$` alias with jQuery conflict protection
- Plugin API exposed via `pi._`

**Design Decisions:**
- Using native JavaScript errors (TypeError, RangeError, Error with .code)
- No custom error modes - keeping it simple
- Using console.warn() for deprecations
- Merged init logic into index.js (no separate init file)

---

### Phase 1: Core System 🔄 IN PROGRESS

**Legacy Files:**
- `.legacy/src/pi.js` (504 lines) - Core command system, ready/wait
- `.legacy/src/pi-init.js` (26 lines) - Final initialization

**New Files:**
- `src/index.js` - Main entry point (update needed)
- No separate files - merge init logic into index.js

**Tasks:**

1. **Add ready/wait/resume system to index.js**
   - [ ] Create ready callback queue
   - [ ] Implement wait counter (delays ready callbacks)
   - [ ] Implement resume function (decrements counter)
   - [ ] Implement startReadyList function
   - [ ] Hook to document.readyState
   - [ ] Register `$.ready(fn)` command
   - [ ] Expose `wait()` and `resume()` in `pi._` for modules

2. **Simplify error handling**
   - [x] Remove custom error modes (log/throw/none)
   - [ ] Use native JavaScript errors for invariants:
     - `TypeError` for wrong types
     - `RangeError` for out-of-bounds values
     - `Error` with `.code` property for Pi.js-specific errors
   - [ ] Use `console.warn()` for deprecations and non-fatal issues
   - [ ] Remove `src/core/errors.js` (use native errors instead)
   - [ ] Remove custom logging system (too complex)

3. **Complete API generation**
   - [x] `processCommands(api)` function exists in command-system.js
   - [ ] Call `processCommands(pi)` in index.js after modules load
   - [ ] Verify commands create `pi.*` and `$.*` methods
   - [ ] Test both positional and object parameters work

4. **Add core utility commands**
   - [ ] `setScreen(screen)` - set active screen
   - [ ] `getScreen(id)` - get screen by ID
   - [ ] `removeAllScreens()` - cleanup all screens
   - [ ] `setDefaultColor(color)` - set default drawing color
   - [ ] `setDefaultPal(palette)` - set default palette
   - [ ] `getDefaultPal()` - get default palette
   - [ ] `setDefaultInputFocus(element)` - set input focus element
   - [ ] `set(options)` - global settings command

5. **Module initialization pattern**
   - [ ] Each feature module exports `init(pi)` function
   - [ ] Modules call `pi._.addCommand()` to register
   - [ ] index.js imports and calls all init functions
   - [ ] Proper load order matters

**Acceptance Criteria:**
- [ ] `$.ready(fn)` executes callbacks correctly
- [ ] `$.ready()` waits for document.ready
- [ ] Wait/resume system works for async operations
- [ ] Commands auto-generate `$.*` methods
- [ ] Both `$.func(a, b)` and `$.func({a, b})` work
- [ ] Native errors thrown for invalid input
- [ ] Console warnings for non-fatal issues
- [ ] All Phase 1 commands work (setScreen, getScreen, etc.)

**Implementation Notes:**

- **Merge pi-init.js into index.js**: No need for separate file
- **Keep ready system in index.js**: Simple, all in one place
- **No complex error system**: Use native JavaScript errors
- **Module pattern**: Each module calls `pi._.addCommand()` during init

---

### Phase 2: Screen Management

**Legacy Files:**
- `.legacy/src/pi-screen.js` (584 lines)
- `.legacy/src/pi-screen-commands.js` (518 lines)

**New Files:**
- `src/modules/screen.js`
- `src/modules/screen-commands.js`

**Tasks:**

1. Screen creation and management
   - [ ] `pi.screen(id, width, height, options)` - create screen
   - [ ] Canvas creation and DOM injection
   - [ ] Screen data structure initialization
   - [ ] Screen ID management

2. Active screen system
   - [ ] `pi.setScreen(screen)` - set active screen
   - [ ] `pi.getScreen(id)` - get screen by ID
   - [ ] Active screen tracking
   - [ ] Screen-based command routing

3. Screen commands
   - [ ] `pi.cls()` - clear screen
   - [ ] `pi.set(options)` - set screen options
   - [ ] `pi.get(option)` - get screen option
   - [ ] Screen removal and cleanup

4. ImageData management
   - [ ] `getImageData()` helper - lazy-load image data
   - [ ] `setImageDirty()` helper - mark for re-render
   - [ ] Buffer management for pixel operations

**Acceptance Criteria:**
- [ ] Can create multiple screens
- [ ] Screen switching works
- [ ] `cls()` clears the screen
- [ ] ImageData properly managed

---

### Phase 3: Helper Functions

**Legacy Files:**
- `.legacy/src/pi-screen-helper.js` (267 lines)

**New Files:**
- `src/modules/screen-helper.js`

**Tasks:**

1. Color resolution system
   - [ ] `findColorValue()` - resolve color from various formats
   - [ ] Palette index resolution
   - [ ] Hex color resolution
   - [ ] RGB/RGBA resolution
   - [ ] Named color resolution

2. ImageData helpers
   - [ ] Efficient imageData getter
   - [ ] Dirty flag management
   - [ ] Pixel bounds checking

3. Pen system foundation
   - [ ] Default pen modes (copy, xor, and, or, etc.)
   - [ ] Pen size management
   - [ ] Pen drawing interface

4. Blend modes
   - [ ] Blend command registration
   - [ ] Default blend operations
   - [ ] Custom blend support

**Acceptance Criteria:**
- [ ] Colors resolve from all formats
- [ ] Palette system works
- [ ] ImageData helpers functional
- [ ] Pen system initialized

---

### Phase 4: Pixel-Mode Drawing

**Legacy Files:**
- `.legacy/src/pi-screen-graphics.js` (1218 lines) - pixel implementations
- `.legacy/src/pi-screen-draw.js` (221 lines)

**New Files:**
- `src/modules/graphics-pixel.js`
- `src/modules/draw-pixel.js`

**Tasks:**

1. Basic pixel operations
   - [ ] `pset(x, y, color)` - set pixel
   - [ ] `pget(x, y)` - get pixel
   - [ ] Pen-based pixel drawing
   - [ ] Blend mode support

2. Line drawing (Bresenham)
   - [ ] `pxLine(x1, y1, x2, y2)` - pixel-perfect line
   - [ ] Thick line support
   - [ ] Pen effects on lines

3. Circle drawing (Midpoint)
   - [ ] `pxCircle(x, y, radius)` - pixel-perfect circle
   - [ ] Filled circle support
   - [ ] Circle outline with pen

4. Rectangle drawing
   - [ ] `pxRect(x, y, w, h)` - pixel-perfect rectangle
   - [ ] Filled rectangle
   - [ ] Rectangle outline

5. Ellipse drawing
   - [ ] `pxEllipse(x, y, rx, ry)` - pixel-perfect ellipse
   - [ ] Filled ellipse
   - [ ] Ellipse outline

6. Arc drawing
   - [ ] `pxArc(x, y, radius, start, end)` - pixel-perfect arc
   - [ ] Pie/wedge support

**Acceptance Criteria:**
- [ ] All pixel-mode drawing commands work
- [ ] No anti-aliasing artifacts
- [ ] Pen modes apply correctly
- [ ] Filled shapes render properly

---

### Phase 5: Anti-Aliased Drawing

**Legacy Files:**
- `.legacy/src/pi-screen-graphics.js` (1218 lines) - AA implementations

**New Files:**
- `src/modules/graphics-aa.js`

**Tasks:**

1. Canvas-native line
   - [ ] `aaLine()` - uses canvas lineTo
   - [ ] Line caps and joins
   - [ ] Line width

2. Canvas-native circle/arc
   - [ ] `aaCircle()` - uses canvas arc
   - [ ] Filled vs stroke
   - [ ] Arc angles

3. Canvas-native rectangle
   - [ ] `aaRect()` - uses canvas rect
   - [ ] Filled vs stroke

4. Canvas-native ellipse
   - [ ] `aaEllipse()` - uses canvas ellipse
   - [ ] Filled vs stroke

5. Mode switching
   - [ ] `pixelMode` flag properly switches implementations
   - [ ] Consistent API regardless of mode

**Acceptance Criteria:**
- [ ] AA versions use native canvas
- [ ] Smooth, anti-aliased output
- [ ] Mode switching works correctly
- [ ] Performance good in both modes

---

### Phase 6: Paint & Fill

**Legacy Files:**
- `.legacy/src/pi-screen-paint.js` (164 lines)

**New Files:**
- `src/modules/paint.js`

**Tasks:**

1. Flood fill algorithm
   - [ ] `paint(x, y, color)` - fill enclosed area
   - [ ] Boundary detection
   - [ ] Efficient queue-based fill

2. Pattern fills
   - [ ] Solid color fills
   - [ ] Pattern-based fills

3. Border mode
   - [ ] Fill to border color
   - [ ] Fill with tolerance

**Acceptance Criteria:**
- [ ] Paint fills enclosed areas
- [ ] Respects boundaries
- [ ] Works in both pixel/AA modes

---

### Phase 7: Bezier & Advanced Drawing

**Legacy Files:**
- `.legacy/src/pi-screen-bezier.js` (152 lines)

**New Files:**
- `src/modules/bezier.js`

**Tasks:**

1. Bezier curves
   - [ ] Quadratic bezier
   - [ ] Cubic bezier
   - [ ] Pixel-perfect implementations
   - [ ] Canvas-native implementations

2. Path drawing
   - [ ] Complex paths
   - [ ] Path segments

**Acceptance Criteria:**
- [ ] Bezier curves render correctly
- [ ] Works in both modes

---

### Phase 8: Image Operations

**Legacy Files:**
- `.legacy/src/pi-screen-images.js` (530 lines)

**New Files:**
- `src/modules/images.js`

**Tasks:**

1. Image loading
   - [ ] `loadImage(url)` - load from URL
   - [ ] Image caching
   - [ ] Async loading with callbacks
   - [ ] Error handling

2. Image drawing
   - [ ] `drawImage()` - draw full image
   - [ ] `drawSprite()` - draw sprite from sheet
   - [ ] Position and scaling
   - [ ] Rotation and flipping

3. Image manipulation
   - [ ] `getImage()` - get image data from screen
   - [ ] `putImage()` - put image data to screen
   - [ ] `filterImg()` - apply filters

4. Sprite sheets
   - [ ] Define sprite regions
   - [ ] Animated sprites
   - [ ] Sprite management

**Acceptance Criteria:**
- [ ] Load images from URLs
- [ ] Draw images to screen
- [ ] Sprite animation works
- [ ] Image filters functional

---

### Phase 9: Text & Fonts

**Legacy Files:**
- `.legacy/src/pi-font.js` (446 lines)
- `.legacy/src/pi-screen-print.js` (343 lines)
- `.legacy/src/fonts/font-data.js`

**New Files:**
- `src/modules/font.js`
- `src/modules/print.js`
- `src/assets/font-data.js`

**Tasks:**

1. Font system
   - [ ] Load built-in fonts
   - [ ] Load custom fonts
   - [ ] Font data format
   - [ ] Font caching

2. Text rendering
   - [ ] `print(text)` - print text at cursor
   - [ ] `printAt(x, y, text)` - print at position
   - [ ] Character-by-character rendering
   - [ ] Pixel-perfect text

3. Cursor management
   - [ ] `locate(row, col)` - set cursor position
   - [ ] `pos()` - get cursor position
   - [ ] Auto-advance cursor
   - [ ] Newline handling

4. Text formatting
   - [ ] Color codes in text
   - [ ] Font switching
   - [ ] Size control

**Acceptance Criteria:**
- [ ] Built-in fonts render
- [ ] Custom fonts load
- [ ] Text prints correctly
- [ ] Locate/pos work

---

### Phase 10: Table Formatting

**Legacy Files:**
- `.legacy/src/pi-screen-table.js` (527 lines)

**New Files:**
- `src/modules/table.js`

**Tasks:**

1. Table rendering
   - [ ] `formatTable()` - render table
   - [ ] Row and column support
   - [ ] Cell alignment
   - [ ] Borders and padding

**Acceptance Criteria:**
- [ ] Tables render correctly
- [ ] Formatting options work

---

### Phase 11: Keyboard Input

**Legacy Files:**
- `.legacy/src/pi-keyboard.js` (1399 lines)

**New Files:**
- `src/modules/keyboard.js`

**Tasks:**

1. Event handling
   - [ ] Keyboard event listeners
   - [ ] Key state tracking
   - [ ] Key repeat handling
   - [ ] Focus management

2. Input methods
   - [ ] `inkey()` - get key press
   - [ ] `onkey(callback)` - key press callback
   - [ ] `offkey()` - remove key callback
   - [ ] Key state queries

3. Input buffer
   - [ ] Input queue
   - [ ] `input(prompt)` - get user input
   - [ ] Input history

4. Key mapping
   - [ ] Standard key codes
   - [ ] Special keys
   - [ ] Modifier keys

**Acceptance Criteria:**
- [ ] Keyboard events captured
- [ ] inkey returns presses
- [ ] Callbacks work
- [ ] Input function works

---

### Phase 12: Mouse Input

**Legacy Files:**
- `.legacy/src/pi-screen-mouse.js` (368 lines)

**New Files:**
- `src/modules/mouse.js`

**Tasks:**

1. Event handling
   - [ ] Mouse event listeners
   - [ ] Position tracking
   - [ ] Button state tracking
   - [ ] Wheel support

2. Input methods
   - [ ] `inmouse()` - get mouse state
   - [ ] `onmouse(callback)` - mouse callback
   - [ ] Click detection
   - [ ] Drag detection

**Acceptance Criteria:**
- [ ] Mouse events work
- [ ] Position accurate
- [ ] Buttons tracked
- [ ] Callbacks fire

---

### Phase 13: Touch Input

**Legacy Files:**
- `.legacy/src/pi-screen-touch.js` (313 lines)

**New Files:**
- `src/modules/touch.js`

**Tasks:**

1. Event handling
   - [ ] Touch event listeners
   - [ ] Multi-touch support
   - [ ] Touch position tracking
   - [ ] Gesture detection

2. Input methods
   - [ ] `intouch()` - get touch state
   - [ ] `ontouch(callback)` - touch callback
   - [ ] Touch count
   - [ ] Touch coordinates

**Acceptance Criteria:**
- [ ] Touch events work
- [ ] Multi-touch supported
- [ ] Callbacks fire
- [ ] Positions accurate

---

### Phase 14: Gamepad Input

**Legacy Files:**
- `.legacy/src/pi-gamepad.js` (349 lines)

**New Files:**
- `src/modules/gamepad.js`

**Tasks:**

1. Gamepad API integration
   - [ ] Gamepad detection
   - [ ] Connection events
   - [ ] Poll gamepad state

2. Input methods
   - [ ] `ingamepad()` - get gamepad state
   - [ ] `ongamepad(callback)` - gamepad callback
   - [ ] Button mapping
   - [ ] Axis values

3. Multiple gamepads
   - [ ] Support 4+ gamepads
   - [ ] Player assignment

**Acceptance Criteria:**
- [ ] Gamepads detected
- [ ] Button states work
- [ ] Axis values correct
- [ ] Multiple pads work

---

### Phase 15: Sound System

**Legacy Files:**
- `.legacy/src/pi-sound.js` (582 lines)

**New Files:**
- `src/modules/sound.js`

**Tasks:**

1. WebAudio setup
   - [ ] Audio context creation
   - [ ] Gain node for volume
   - [ ] Audio routing

2. Sound loading
   - [ ] `loadSound(url)` - load sound file
   - [ ] Sound caching
   - [ ] Async loading
   - [ ] Error handling

3. Sound playback
   - [ ] `playSound(name)` - play loaded sound
   - [ ] Loop support
   - [ ] Volume control
   - [ ] Stop/pause functions

4. Sound generation
   - [ ] `beep(freq, duration)` - generate tone
   - [ ] Waveform selection
   - [ ] ADSR envelope

**Acceptance Criteria:**
- [ ] Load sound files
- [ ] Play sounds
- [ ] Volume control works
- [ ] Multiple sounds play
- [ ] Generation works

---

### Phase 16: PLAY Command

**Legacy Files:**
- `.legacy/src/pi-play.js` (645 lines)

**New Files:**
- `src/modules/play.js`

**Tasks:**

1. PLAY string parser
   - [ ] Note parsing (C, D, E, etc.)
   - [ ] Octave parsing (O1-O7)
   - [ ] Length parsing (L1-L64)
   - [ ] Tempo parsing (T32-T255)

2. Music generation
   - [ ] Note to frequency conversion
   - [ ] Duration calculation
   - [ ] Sequence playback

3. QBasic compatibility
   - [ ] PLAY command syntax
   - [ ] ML (music legato) support
   - [ ] MN (music normal) support
   - [ ] MS (music staccato) support

**Acceptance Criteria:**
- [ ] PLAY strings parse
- [ ] Music plays correctly
- [ ] QBasic syntax compatible

---

### Phase 17: Palette System

**Legacy Files:**
- `.legacy/src/pi-pal.js` (51 lines)

**New Files:**
- `src/modules/palette.js`

**Tasks:**

1. Palette management
   - [ ] `setDefaultPal(colors)` - set default palette
   - [ ] `getDefaultPal()` - get palette
   - [ ] `setDefaultColor(index)` - set default color
   - [ ] Color index resolution

**Acceptance Criteria:**
- [ ] Palette commands work
- [ ] Color mapping correct

---

### Phase 18: Testing & Bug Fixing

**Tasks:**

1. Visual regression tests
   - [ ] Run all existing tests
   - [ ] Fix failing tests
   - [ ] Document test results

2. Manual testing
   - [ ] Test all commands
   - [ ] Test edge cases
   - [ ] Cross-browser testing

3. Performance testing
   - [ ] Benchmark drawing operations
   - [ ] Memory leak testing
   - [ ] Optimize hot paths

4. Bug fixing
   - [ ] Fix reported issues
   - [ ] Edge case handling
   - [ ] Error message improvements

**Acceptance Criteria:**
- [ ] All visual tests pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Major browsers work

---

### Phase 19: Documentation

**Tasks:**

1. Code documentation
   - [ ] Complete JSDoc for all files
   - [ ] Document internal APIs
   - [ ] Add usage examples

2. User documentation
   - [ ] Update README.md
   - [ ] API reference
   - [ ] Migration guide

3. Examples
   - [ ] Create example projects
   - [ ] Tutorial code
   - [ ] Demo applications

**Acceptance Criteria:**
- [ ] All code documented
- [ ] User docs complete
- [ ] Examples work

---

### Phase 20: Release Preparation

**Tasks:**

1. Version management
   - [ ] Bump version to 2.0.0
   - [ ] Update changelog
   - [ ] Tag release

2. Build artifacts
   - [ ] Build all formats
   - [ ] Test builds
   - [ ] Verify source maps

3. Publication
   - [ ] npm publish (if applicable)
   - [ ] GitHub release
   - [ ] Website update

**Acceptance Criteria:**
- [ ] Version bumped
- [ ] Changelog complete
- [ ] Builds working
- [ ] Release published

---

## Development Workflow

### Daily Workflow

For each module:
1. **Read** legacy file to understand implementation
2. **Plan** new structure in modern format
3. **Port** code with modernization (const/let, JSDoc, etc.)
4. **Test** manually with test HTML
5. **Fix** issues
6. **Commit** with clear message

### Testing Strategy

- Create `test-progress.html` for quick manual testing
- Run visual regression tests after each phase
- Don't move forward if current phase is broken
- Keep test cases for each new feature

### Build Loop

```bash
# Terminal 1: Build
npm run build

# Terminal 2: Server
npm run server

# Terminal 3: Tests
npm test
```

---

## Key Implementation Notes

### Command Registration Pattern

```javascript
// Single implementation
pi._.addCommand( "commandName", function( screenData, args ) {
  // implementation
}, isInternal, isScreen, parameterNames );

// Dual implementation (pixel + AA)
pi._.addCommands( "commandName", pxFunction, aaFunction, parameterNames );
```

### Parameter Parsing

The `parseOptions` function automatically converts:
- Object params: `{x: 10, y: 20}` → `[10, 20]`
- Array params: `[10, 20]` → `[10, 20]` (pass through)

**Usage Examples:**
```javascript
// Both work identically ($ is preferred)
$.line( 0, 0, 100, 100 );
$.line( { "x1": 0, "y1": 0, "x2": 100, "y2": 100 } );
```

### Pixel Mode Implementation

```javascript
function pxCircle( screenData, args ) {
  // 1. Get/create imageData
  // 2. Use algorithm (e.g., midpoint circle)
  // 3. Call screenData.pen.draw() for each pixel
  // 4. Mark dirty
}

function aaCircle( screenData, args ) {
  // 1. Use canvas context
  // 2. ctx.arc() for smooth circle
}

// User calls ($ preferred):
$.circle( 400, 300, 50 );  // Uses pxCircle or aaCircle based on pixelMode
```

### Screen Data Structure

```javascript
screenData = {
  canvas, ctx, bufferCanvas, bufferContext,
  width, height, id,
  imageData, imageDirty,
  fColor, bColor, palette,
  pen, penSize, pixelMode,
  cursorX, cursorY,
  // ... more properties
}
```

### Plugin Pattern (using `pi._`)

Third-party plugins can extend Pi.js by using the internal API:

```javascript
// Example: Creating a particle system plugin
( function() {
  "use strict";

  // Access internal API (use pi._ not $._ for clarity in plugin code)
  const piData = pi._.data;

  // Register a new command
  pi._.addCommand( "particle", function( screenData, args ) {
    const x = args[ 0 ];
    const y = args[ 1 ];
    const color = args[ 2 ];
    // Particle logic here...
  }, false, true, [ "x", "y", "color" ] );

  // After registration, users can call with $ alias (preferred):
  // $.particle( 100, 100, "#FF0000" );
  // Or with pi: pi.particle( 100, 100, "#FF0000" );
} )();
```

**Why `pi._` is Important:**
- **v1.x behavior:** Internal API was deleted after init to hide from end users
- **v2.0 change:** Keeping `pi._` exposed permanently for plugin ecosystem
- Enables community-created plugins without forking Pi.js
- Maintains clean public API while allowing power users to extend
- Balances simplicity for beginners with extensibility for advanced users

**Alias Note:** 
- While `$` is the preferred alias for user code, use `pi._` (not `$._`) in plugin registration for clarity
- `$` is only set if `window.$` is undefined (won't conflict with jQuery or other libraries)
- If `$` is already taken, users must use `pi` instead

---

## Risk Mitigation

### If a Module is Complex
1. Port it "as-is" first (working but not fully modernized)
2. Modernize in a second pass
3. Don't let perfect block done

### Quality Gates
- Each module must work before moving on
- Visual tests must pass for drawing
- Input must be manually verified
- Document any known issues

### Simplification Options
- Tables module can be deferred (least critical)
- PLAY command can be simplified (basic notes only)
- Some blend modes can be deferred

---

## Progress Indicators

### Completion Metrics
- [ ] Phase 0: Foundation ✅ **COMPLETE**
- [ ] Phase 1: Core System 🔄 **IN PROGRESS**
- [ ] Phase 2-20: Remaining phases

### Code Statistics
- **Legacy:** ~200KB, 10,000+ lines, 265+ commands
- **Ported:** TBD
- **Target:** 100% feature parity

### Test Status
- **Visual Tests:** 0 / ~200
- **Unit Tests:** TBD
- **Manual Testing:** Ongoing

---

## Success Definition

The refactor is complete when:
1. All 265+ API methods work identically to v1.2.4
2. All visual regression tests pass
3. Pixel mode produces identical output
4. Build system generates all required formats
5. Documentation is complete
6. No known critical bugs

---

## Next Steps

**Current Focus:** Complete Phase 1 (Core System)

1. Finish command registration
2. Implement ready/wait/resume
3. Test basic API structure
4. Move to Phase 2 (Screen Management)

**Quick Wins:**
- Get core + screen working → can create screens
- Get pixel drawing working → can see output
- Get one input method working → can interact

---

**Last Updated:** October 10, 2025
