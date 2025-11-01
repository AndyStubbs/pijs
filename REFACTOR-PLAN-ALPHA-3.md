# Pi.js Alpha 3 - WebGL2 Only Refactor Plan

## Overview

Complete refactor of Pi.js renderer architecture. Migrate from dual-renderer system (WebGL2 + Canvas2D fallback) to WebGL2-only renderer. Remove all Canvas2D support and simplify architecture by consolidating rendering logic into a well-organized renderer module system.

**Key Architectural Changes:**
- Single renderer: WebGL2 only (no fallback)
- Renderer handles both low-level and high-level drawing operations
- Modular renderer structure to replace monolithic `renderer-webgl2.js`
- Move all graphics primitives/shapes into renderer modules
- Thin API layer that only handles input parsing

Use Alpha 2: /src-pi-2.0.0-alpha.2 as a reference but carefully plan and rebuild step-by-step rather than copying files directly.

**Important:** When starting Alpha 3, do NOT copy these files from Alpha 2:
- `graphics/renderer-webgl2.js` - Will be split into renderer/ modules
- `graphics/renderer-canvas2d.js` - Removed (WebGL2 only)
- `graphics/graphics-primitives.js` - Moved to renderer/primitives.js
- `graphics/graphics-shapes.js` - Moved to renderer/shapes.js

## Goals

- Fully remove Canvas2D support (no fallback renderer)
- Remove all dual renderer support, eliminate duplicate code
- Simplify screen-manager with single renderer path
- Break up monolithic `renderer-webgl2.js` (1291 lines) into focused modules
- Move graphics primitives/shapes into renderer (Option 2 architecture)
- GPU-first rendering approach (use vertices/shapes when possible)
- Maintain clean separation of concerns
- Preserve lazy initialization pattern to avoid circular dependencies

## Module Structure

### Full Project Structure

```
src/
├── index.js                           # Main library entry point
│
├── core/                              # Core system modules
│   ├── utils.js                      # Utility functions
│   ├── commands.js                   # Command system (renamed from state-settings.js)
│   ├── screen-manager.js             # Screen creation and management (WebGL2 only)
│   └── plugins.js                    # Plugin system
│
├── graphics/                          # Graphics rendering modules
│   ├── renderer/                     # Complete rendering system
│   │   ├── renderer.js               # Main orchestrator + WebGL context creation
│   │   ├── fbo.js                    # Framebuffer Object management
│   │   ├── shaders.js                # Shader compilation and program creation
│   │   ├── batches.js                # Batch system + rendering (COMBINED)
│   │   ├── textures.js               # Texture management (getWebGL2Texture, etc.)
│   │   ├── draw.js                   # Low-level: drawPixelUnsafe, drawImage
│   │   ├── primitives.js             # High-level: drawLine, drawArc, drawBezier
│   │   ├── shapes.js                 # High-level: drawRect, drawCircle, drawEllipse
│   │   ├── readback.js               # readPixel, readPixels (sync/async)
│   │   └── shaders/                  # Shader source files
│   │       ├── point.vert
│   │       ├── point.frag
│   │       ├── image.vert
│   │       ├── image.frag
│   │       ├── display.vert
│   │       └── display.frag
│   │
│   ├── graphics-api.js               # Thin wrapper - input parsing only
│   ├── pens.js                       # Pen/blend system
│   ├── colors.js                     # Color palette management
│   ├── images.js                     # Image loading/drawing commands
│   └── pixels.js                     # Pixel readback commands
│
└── text/                              # Text rendering modules (planned for future phases)
    ├── (font-data.js)                # Font data and bitmaps (planned)
    ├── (font.js)                     # Font management (planned)
    └── (print.js)                    # Text printing commands (planned)
```

**Note:** Files in parentheses `()` are planned modules not yet implemented in Alpha 3.

**Removed from Alpha 2:**
- `graphics/renderer-webgl2.js` - Split into renderer/ modules
- `graphics/renderer-canvas2d.js` - Removed (WebGL2 only)
- `graphics/graphics-primitives.js` - Moved to renderer/primitives.js
- `graphics/graphics-shapes.js` - Moved to renderer/shapes.js
- `core/state-settings.js` - Renamed to `core/commands.js`
- `input/events.js` - Removed (will be available as plugin)
- All audio modules - Removed (will be available as plugins)

**Notes:**
- Alpha 3 is graphics-only - audio and input will be available as plugins
- Core library focuses solely on graphics rendering

### Module Responsibilities

**Renderer Layer (`graphics/renderer/`):**
- `renderer.js`: WebGL2 context creation, module orchestration, public API exports
- `fbo.js`: Framebuffer Object creation and management
- `shaders.js`: Shader compilation, program creation, display shader setup
- `batches.js`: Batch creation, management, flushing, rendering to FBO/canvas
- `textures.js`: Texture cache management (nested Map), get/delete operations
- `draw.js`: Low-level drawing (`drawPixelUnsafe`, `drawImage` with textured quads)
- `primitives.js`: High-level primitives (`drawLine`, `drawArc`, `drawBezier`)
- `shapes.js`: High-level shapes (`drawRect`, `drawCircle`, `drawEllipse`)
- `readback.js`: Pixel readback operations (`readPixel`, `readPixels`)

**API Layer:**
- `graphics-api.js`: Input parsing, validation, object literal handling, calls renderer functions

**Support Modules:**
- `pens.js`: Pen types, blend modes, builds optimized `penFn`
- `colors.js`: Palette management, color conversion

**Feature Modules:**
- `images.js`: Image loading, `drawImage()` command
- `pixels.js`: `getPixel()`, `get()`, `put()` commands

### Dependency Graph

All modules use lazy initialization - no code executes until `init()` is called from `renderer.js`. This allows circular imports (function references only) without circular dependency issues.

```
src/index.js
  └─ imports: graphics/graphics-api.js
     └─ imports: graphics/renderer/renderer.js
        └─ orchestrates: all renderer/* modules

renderer/renderer.js
  ├─ imports: fbo.js, shaders.js, batches.js, textures.js
  ├─ imports: draw.js, primitives.js, shapes.js, readback.js
  └─ exports: unified public API

batches.js
  └─ imports: shaders.js, pens.js (external)

draw.js
  ├─ imports: batches.js, textures.js
  └─ exports: drawPixelUnsafe, drawImage

primitives.js
  ├─ imports: batches.js (for prepareBatch, drawPixelUnsafe via renderer)
  └─ exports: drawLine, drawArc, drawBezier

shapes.js
  ├─ imports: batches.js (for prepareBatch, drawPixelUnsafe via renderer)
  └─ exports: drawRect, drawCircle, drawEllipse

readback.js
  ├─ imports: batches.js (for flushBatches)
  └─ exports: readPixel, readPixels
```

## Phase 1: Setup and Minimal Shell

### Step 1.1: Create Starting Shell Files ✅ COMPLETE
Create minimal core infrastructure in `src/`:

**Files to create:**
- `src/core/plugins.js`
- `src/core/screen-manager.js` (simplified - WebGL2 only)
- `src/core/commands.js` (rename from state-settings.js)
- `src/core/utils.js`
- `src/index.js` (minimal imports)

**Key changes:**
- Remove all Canvas2D renderer references
- Remove `useCanvas2d` option from screen manager
- Remove render mode checks
- Simplify screen creation flow

### Step 1.2: Create Renderer Module Structure ✅ COMPLETE
Create the renderer directory structure:

```
src/graphics/renderer/
├── renderer.js (empty shell)
├── fbo.js (empty shell)
├── shaders.js (empty shell)
├── batches.js (empty shell)
├── textures.js (empty shell)
├── draw.js (empty shell)
├── primitives.js (empty shell)
├── shapes.js (empty shell)
├── readback.js (empty shell)
└── shaders/ (directory created)
```

Each file should have basic JSDoc header and `export function init() {}` stub.

### Step 1.3: Move Shader Files ✅ COMPLETE
Move shader source files to renderer directory structure:

**Files to move:**
```
graphics/shaders/* → graphics/renderer/shaders/*
```

**Shader files:**
- `point.vert` / `point.frag`
- `image.vert` / `image.frag`
- `display.vert` / `display.frag`

**Note:** Shaders will be imported by `renderer/shaders.js` using paths like `./shaders/point.vert`. Ensure build system can handle these paths.

### Step 1.4: Update Main Index ✅ COMPLETE
Update `src/index.js` to import renderer from new location:

```javascript
import * as g_webgl2Renderer from "./graphics/renderer/renderer.js";
```

Remove Canvas2D renderer import. Update module initialization array.

### Step 1.5: Test Minimal Build ✅ COMPLETE
- Run `npm run build`
- Verify it builds without errors
- Create simple test HTML that loads Pi.js

## Phase 2: Renderer Core - Context and FBO

### Step 2.1: Implement renderer.js - Context Creation ✅ COMPLETE
Move WebGL2 context creation from `renderer-webgl2.js` to `renderer.js`:

**Responsibilities:**
- `testWebGL2Capability()` - Do not implement, no longer needed as we can check if createContext fails
- `createContext(screenData)` - Create WebGL2 context, set viewport
- Context lost/restored event handlers
- Module orchestration and initialization
- Public API exports

**Key functions:**
- `export function init( api )` - Initialize all renderer modules
- `export function createContext( screenData )` - Create context for screen
- `export function cleanup( screenData )` - Cleanup resources

**Module initialization order:**
1. fbo.init()
2. shaders.init()
3. batches.init()
4. textures.init()
5. draw.init()
6. primitives.init()
7. shapes.init()
8. readback.init()

### Step 2.2: Implement fbo.js ✅ COMPLETE
Move FBO creation logic from `renderer-webgl2.js` to `fbo.js`:

**Responsibilities:**
- `createFBO( screenData )` - Create framebuffer and texture
- `resizeFBO( screenData )` - Resize FBO when screen resizes (if needed)
- FBO validation and cleanup

**Key functions:**
- `export function init( api )` - Initialize module
- `export function createFBO( screenData )` - Create FBO and texture
- `export function cleanup( screenData )` - Cleanup FBO resources

### Step 2.3: Test Context and FBO ✅ COMPLETE
- Create a test screen
- Verify WebGL2 context is created
- Verify FBO is created successfully
- Display blank screen

### Step 2.4: Implement colors.js ✅ COMPLETE
Implement color palette management module (renderer-agnostic, can be done early):

**Responsibilities:**
- Palette management (256 colors)
- Color cache for fast lookups
- RGB/Hex conversion utilities
- Color parsing and validation

**Key functions:**
- `export function init( api )` - Initialize module
- `export function getColorValueByRawInput( screenData, colorInput )` - Parse color input
- Color utilities: `rgbToColor()`, `colorToRgb()`, etc.

**Implementation notes:**
- No renderer dependencies - can be implemented early
- Will be used by all graphics commands
- Initialize default palette

## Phase 3: Shaders and Batch System

### Step 3.1: Implement shaders.js ✅ COMPLETE
Move shader compilation logic from `renderer-webgl2.js` to `shaders.js`:

**Note:** Shader files are already in `renderer/shaders/` (moved in Phase 1, Step 1.3).

**Responsibilities:**
- `compileShader()` - Compile vertex/fragment shaders
- `createShaderProgram()` - Create linked shader program
- `setupDisplayShader()` - Setup display shader for FBO-to-canvas rendering
- Shader source imports from `./shaders/point.vert`, `./shaders/point.frag`, etc.

**Key functions:**
- `export function init( api )` - Initialize module
- `export function createShaderProgram( screenData, vertexSrc, fragSrc )`
- `export function setupDisplayShader( screenData )`

### Step 3.2: Implement batches.js (Part 1 - Batches) ✅ COMPLETE
Move batch creation and management from `renderer-webgl2.js`:

**Batch creation:**
- `createBatch()` - Create batch system (points, images)
- `resizeBatch()` - Resize batch capacity
- `prepareBatch()` - Ensure batch has capacity
- Batch prototype and constants (`POINTS_BATCH`, `IMAGE_BATCH`)

**Key functions:**
- `export const POINTS_BATCH = 0`
- `export const IMAGE_BATCH = 1`
- `export function init( api )` - Initialize module
- `export function createBatch( screenData, type, vertSrc, fragSrc )`
- `export function prepareBatch( screenData, batchType, itemCount )`

### Step 3.3: Implement batches.js (Part 2 - Rendering) ✅ COMPLETE
Move rendering logic from `renderer-webgl2.js`:

**Rendering:**
- `flushBatches()` - Flush all batches to FBO
- `uploadBatch()` - Upload batch data to GPU
- `drawBatch()` - Draw batch to FBO
- `displayToCanvas()` - Display FBO texture to canvas
- `resetBatch()` - Reset batch after flush
- Blend mode handling

**Key functions:**
- `export function flushBatches( screenData, blend = null )`
- `export function displayToCanvas( screenData )`
- `function uploadBatch( gl, batch, width, height )`
- `function drawBatch( gl, batch, startIndex, endIndex, texture )`

### Step 3.4: Test Batch System ✅ COMPLETE
- Test point batch creation
- Test batch rendering to FBO
- Test display to canvas
- Verify batches render correctly

## Phase 4: Low-Level Drawing and Core APIs

### Step 4.1: Implement draw.js - Low-Level Drawing
Move low-level drawing functions from `renderer-webgl2.js`:

**Responsibilities:**
- `drawPixelUnsafe()` - Fast path for single pixel writes
- `drawImage()` - Draw image as textured quad (rotation, scaling, anchor)

**Key functions:**
- `export function init( api )` - Initialize module
- `export function drawPixelUnsafe( screenData, x, y, color )`

**Note:** `drawImage()` will be added later when implementing image support.

### Step 4.2: Implement pens.js
Implement pen and blend mode system (essential for all primitives):

**Responsibilities:**
- Pen types: pixel, square, circle
- Blend modes: replace, alpha
- Build optimized `penFn` that calls `renderer.drawPixelUnsafe()`
- Handle pen size and noise

**Key functions:**
- `export function init( api )` - Initialize module, register commands
- `function buildPenFn( screenData )` - Build optimized pen function
- `function setPen( screenData, options )` - SetPen command
- Constants: `PEN_PIXEL`, `PEN_SQUARE`, `PEN_CIRCLE`, `BLEND_REPLACE`, `BLEND_ALPHA`

**Implementation notes:**
- Requires `renderer.drawPixelUnsafe()` (from draw.js)
- Builds optimized closures that close over screen data
- WebGL2 only - no Canvas2D blend paths
- `penFn` is used by all primitive drawing operations

### Step 4.3: Implement graphics-api.js - Basic Commands
Implement basic graphics API wrapper for input parsing and validation:

**Responsibilities:**
- Input parsing and validation
- Object literal handling
- Parameter extraction
- Call renderer low-level functions

**Commands to implement:**
- `pset` - calls `renderer.drawPixelUnsafe()` via `penFn`

**Key changes:**
- Thin wrapper layer that calls renderer functions
- Build optimized closures that close over screen data
- Handle object literal syntax: `pset({ x: 10, y: 20, c: 1 })`

### Step 4.4: Test Basic Drawing
- Test `drawPixelUnsafe()` - draw single pixels
- Test color system - verify palette and color parsing works
- Test pen system - verify `setPen()` builds correct `penFn`
- Test `pset()` command - verify it works with various inputs
- Verify renderer exports unified API through `renderer.js`

## Phase 5: Textures and Images

### Step 5.1: Implement textures.js
Move texture management from `renderer-webgl2.js` to `textures.js`:

**Responsibilities:**
- Texture cache (nested Map: Image → GL context → Texture)
- `getWebGL2Texture()` - Get or create texture for image
- `deleteWebGL2Texture()` - Delete texture and free memory

**Key functions:**
- `export function init( api )` - Initialize module
- `export function getWebGL2Texture( screenData, img )`
- `export function deleteWebGL2Texture( img )`

### Step 5.2: Extend draw.js - Add drawImage()
Add image drawing functionality to `draw.js`:

**Responsibilities:**
- `drawImage()` - Draw image as textured quad (rotation, scaling, anchor)

**Key functions:**
- `export function drawImage( screenData, img, x, y, angleRad, anchorX, anchorY, alpha, scaleX, scaleY )`

**Note:** The renderer's `drawImage()` is the low-level function called by `images.js`'s `drawImage()` command.

### Step 5.3: Implement images.js
Implement image loading and management module:

**Responsibilities:**
- Image loading from URL or provided Image/Canvas element
- Image storage and name management
- `loadImage()` command - Load images
- `drawImage()` command - User-facing drawImage command

**Key functions:**
- `export function init( api )` - Initialize module, register commands
- `function loadImage( options )` - Load image from URL or element
- `function drawImage( options )` - User-facing drawImage command

**Implementation notes:**
- Use `renderer.getWebGL2Texture()` for texture management
- Use `renderer.drawImage()` for actual drawing
- Store images in internal map by name
- Support Image elements, Canvas elements, and URL strings
- Handle onLoad and onError callbacks

### Step 5.4: Implement readback.js
Move pixel readback from `renderer-webgl2.js` to `readback.js`:

**Responsibilities:**
- `readPixel()` - Read single pixel (synchronous)
- `readPixelAsync()` - Read single pixel (async)
- `readPixels()` - Read pixel rectangle (synchronous)
- `readPixelsAsync()` - Read pixel rectangle (async)

**Key functions:**
- `export function init( api )` - Initialize module
- `export function readPixel( screenData, x, y )`
- `export function readPixelAsync( screenData, x, y )`
- `export function readPixels( screenData, x, y, width, height )`
- `export function readPixelsAsync( screenData, x, y, width, height )`

**Note:** `readback.js` imports `flushBatches` from `batches.js` - this works because of lazy initialization pattern.

### Step 5.5: Test Images and Readback
- Test image loading (`loadImage()` command)
- Test `drawImage()` command - draw images with transformations
- Test renderer's low-level `drawImage()` function
- Test `readPixel()` / `readPixels()` - verify readback works

## Phase 6: High-Level Primitives

**Note:** Primitives use `penFn` from `pens.js` (implemented in Phase 4, Step 4.2).

### Step 6.1: Implement primitives.js - Line Drawing
Move line drawing from `graphics-primitives.js` to `renderer/primitives.js`:

**Responsibilities:**
- `drawLine()` - Bresenham line algorithm
- Handle pen size, batch preparation

**Key functions:**
- `export function init( api )` - Initialize module
- `export function drawLine( screenData, x1, y1, x2, y2, color, penFn )`

**Implementation notes:**
- Uses `penFn` from `screenData.pens.penFn` (built by pens.js)
- Move `m_line()` function from `graphics-primitives.js`
- Call `penFn` for each pixel (which calls `drawPixelUnsafe`)
- Estimate batch size based on line length

### Step 6.2: Implement primitives.js - Arc Drawing
Move arc drawing from `graphics-primitives.js`:

**Responsibilities:**
- `drawArc()` - Arc outline using midpoint circle algorithm
- Handle angle ranges, winding

**Key functions:**
- `export function drawArc( screenData, cx, cy, radius, angle1, angle2, color, penFn )`

**Implementation notes:**
- Move `m_arcOutline()` function from `graphics-primitives.js`
- Filter pixels by angle range
- Estimate batch size based on arc circumference

### Step 6.3: Implement primitives.js - Bezier Drawing
Move bezier drawing from `graphics-primitives.js`:

**Responsibilities:**
- `drawBezier()` - Cubic bezier curve with adaptive tessellation

**Key functions:**
- `export function drawBezier( screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penFn )`

**Implementation notes:**
- Move `m_bezierOutline()` function from `graphics-primitives.js`
- Adaptive tessellation based on curve length
- Estimate batch size based on control polygon length

### Step 6.4: Test Primitives
- Test `drawLine()` - various angles and lengths
- Test `drawArc()` - different angles and radii
- Test `drawBezier()` - various curve shapes
- Verify all primitives render correctly

## Phase 7: High-Level Shapes

### Step 7.1: Implement shapes.js - Rectangle Drawing
Move rectangle drawing from `graphics-shapes.js` to `renderer/shapes.js`:

**Responsibilities:**
- `drawRect()` - Rectangle outline and filled
- Handle pen size, fill color, blending

**Key functions:**
- `export function init( api )` - Initialize module
- `export function drawRect( screenData, x, y, width, height, color, fillColor, penFn, blendFn )`

**Implementation notes:**
- Move `m_rectOutline()` and `m_rectFilled()` from `graphics-shapes.js`
- Handle both outline and filled modes
- Use `blendFn` for filled areas, `penFn` for outline

### Step 7.2: Implement shapes.js - Circle Drawing
Move circle drawing from `graphics-shapes.js`:

**Responsibilities:**
- `drawCircle()` - Circle outline and filled
- Handle pen size, fill color, blending

**Key functions:**
- `export function drawCircle( screenData, cx, cy, radius, color, fillColor, penFn, blendFn )`

**Implementation notes:**
- Move `m_circleOutline()` and `m_circleFilled()` from `graphics-shapes.js`
- Use midpoint circle algorithm
- Estimate batch size based on circumference (outline) or area (filled)

### Step 7.3: Implement shapes.js - Ellipse Drawing
Move ellipse drawing from `graphics-shapes.js`:

**Responsibilities:**
- `drawEllipse()` - Ellipse outline and filled
- Handle pen size, fill color, blending

**Key functions:**
- `export function drawEllipse( screenData, cx, cy, rx, ry, color, fillColor, penFn, blendFn )`

**Implementation notes:**
- Move `m_ellipseOutline()` and `m_ellipseFilled()` from `graphics-shapes.js`
- Use midpoint ellipse algorithm
- Estimate batch size based on perimeter (outline) or area (filled)

### Step 7.4: Test Shapes
- Test `drawRect()` - outline and filled modes
- Test `drawCircle()` - outline and filled modes
- Test `drawEllipse()` - outline and filled modes
- Verify all shapes render correctly with different pen sizes

## Phase 8: Complete Graphics API

### Step 8.1: Extend graphics-api.js
Add remaining graphics commands to the API layer:

**Commands to implement:**
- `line` - calls `renderer.drawLine()`
- `arc` - calls `renderer.drawArc()`
- `bezier` - calls `renderer.drawBezier()`
- `rect` - calls `renderer.drawRect()`
- `circle` - calls `renderer.drawCircle()`
- `ellipse` - calls `renderer.drawEllipse()`

### Step 8.2: Update Renderer Exports
Ensure `renderer/renderer.js` exports all necessary functions:

**Exports needed:**
- `POINTS_BATCH`, `IMAGE_BATCH` (from batches)
- `prepareBatch()` (from batches)
- `drawPixelUnsafe()` (from draw)
- `drawImage()` (from draw)
- `drawLine()`, `drawArc()`, `drawBezier()` (from primitives)
- `drawRect()`, `drawCircle()`, `drawEllipse()` (from shapes)
- `readPixel()`, `readPixels()` (from readback)
- `getWebGL2Texture()`, `deleteWebGL2Texture()` (from textures)
- `setImageDirty()`, `cls()`, `blendModeChanged()` (from renderer)

### Step 8.3: Test Complete Graphics API
- Test all graphics commands (`pset`, `line`, `rect`, `circle`, etc.)
- Verify object literal syntax works
- Test error handling for invalid parameters
- Verify all commands render correctly

## Phase 9: Screen Manager Simplification

### Step 9.1: Remove Canvas2D Support from Screen Manager
Update `core/screen-manager.js`:

**Changes:**
- Remove `useCanvas2d` option
- Remove `CANVAS2D_RENDER_MODE` constant
- Remove `WEBGL2_RENDER_MODE` constant (always WebGL2 now)
- Remove `setupScreenRenderer()` fallback logic
- Simplify to only call `renderer.createContext()`
- Remove render mode checks throughout

### Step 9.2: Update Screen Data
Remove Canvas2D-specific screen data items:
- Remove `renderMode` (always WebGL2)
- Remove `useCanvas2d` flag
- Keep `renderer` reference (points to WebGL2 renderer)
- Remove all Canvas2D path checks

### Step 9.3: Update Other Modules
Remove Canvas2D render mode checks from:
- `graphics-api.js` - Remove `CANVAS2D_RENDER_MODE` checks
- `pens.js` - Remove Canvas2D blend path (if any)
- Any other modules that check render mode

### Step 9.4: Test Screen Manager
- Test screen creation (should always use WebGL2)
- Test screen removal/cleanup
- Test multiple screens
- Verify no Canvas2D code paths remain

## Phase 10: Update Supporting Modules

**Note:** `pens.js` and `colors.js` were implemented earlier (Phase 2 and Phase 4) and are already WebGL2-only.

### Step 10.1: Update pixels.js
Update pixel module for WebGL2 only:
- Use only `renderer.readPixel()` / `renderer.readPixels()`
- Remove Canvas2D readback path
- Remove render mode checks

### Step 10.2: Test Supporting Modules
- Test pixel readback commands
- Verify pen/blend system still works correctly
- Verify color system still works correctly
- Verify image loading/drawing still works correctly

## Phase 11: Testing and Validation

### Step 11.1: Visual Regression Tests
- Run all visual regression tests
- Compare against Alpha 2 output
- Fix any rendering differences

### Step 11.2: Performance Testing
- Compare performance against Alpha 2
- Profile hot paths (pset, line, etc.)
- Verify batch system is working efficiently

### Step 11.3: Memory Testing
- Verify no memory leaks
- Test batch capacity management
- Verify texture cleanup works correctly

### Step 11.4: Edge Case Testing
- Test with various screen sizes
- Test multiple screens
- Test context lost/restored
- Test rapid drawing operations

## Phase 12: Code Cleanup and Documentation

### Step 12.1: Code Cleanup
- Remove all TODO comments that are addressed
- Remove commented-out Canvas2D code
- Ensure consistent code style
- Verify JSDoc comments are complete

### Step 12.2: Update Documentation
- Update API documentation
- Document new module structure
- Document removed features (Canvas2D)
- Update migration guide from Alpha 2

## Success Criteria

- [ ] All renderer code moved from monolithic file to modular structure
- [ ] No Canvas2D code remains
- [ ] All graphics commands working (pset, line, rect, circle, etc.)
- [ ] Performance equal or better than Alpha 2
- [ ] Clean, maintainable code structure
- [ ] All tests passing
- [ ] No memory leaks
- [ ] Documentation updated
