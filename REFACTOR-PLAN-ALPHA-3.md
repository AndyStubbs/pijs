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
├── core/                              # Core system modules (unchanged, good generic name)
│   ├── utils.js                      # Utility functions
│   ├── commands.js                   # Command system (renamed from state-settings.js)
│   ├── screen-manager.js             # Screen creation and management (WebGL2 only)
│   └── plugins.js                    # Plugin system
│
├── renderer/                          # All rendering-specific modules
│   ├── renderer.js                   # Main orchestrator + WebGL context creation
│   ├── fbo.js                        # Framebuffer Object management
│   ├── shaders.js                    # Shader compilation and program creation (internal shader program mgmt)
│   ├── batches.js                    # Batch system + rendering (COMBINED)
│   ├── textures.js                   # Texture management (getWebGL2Texture, etc.)
│   ├── draw/                         # Internal drawing primitives and shapes
│   │   ├── primitives.js             # Core: drawPixel
│   │   ├── geometry.js               # Geometry utilities and helpers
│   │   ├── batch-helpers.js          # Batch management helper functions
│   │   ├── lines.js                  # Lines: drawLine
│   │   ├── rects.js                  # Rectangles: drawRect, drawRectFilled
│   │   ├── circles.js                # Circles: drawCircle, drawCircleFilled
│   │   ├── ellipses.js               # Ellipses: drawEllipse, drawEllipseFilled
│   │   ├── arcs.js                   # Arcs: drawArc
│   │   ├── bezier.js                 # Bezier: drawBezier
│   │   └── images.js                 # Images: drawImage
│   ├── readback.js                   # readPixel, readPixels (sync/async) (internal WebGL readback)
│   └── shaders/                      # Shader source files (actual GLSL files)
│       ├── point.vert
│       ├── point.frag
│       ├── image.vert
│       ├── image.frag
│       ├── display.vert
│       └── display.frag
│
├── api/                               # User-facing API commands (formerly mix of internal/API in 'graphics')
│   ├── graphics.js                   # High-level graphics commands (formerly graphics-api.js)
│   ├── colors.js                     # Color palette management (from old graphics folder)
│   ├── images.js                     # Image loading/drawing commands (from old graphics folder)
│   └── pixels.js                     # Pixel readback commands (user-facing, distinct from internal renderer readback)
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
- `graphics/graphics-primitives.js` - Moved to renderer/draw/ modules
- `graphics/graphics-shapes.js` - Moved to renderer/draw/ modules
- `graphics/graphics-api.js` - Moved to `api/graphics.js`
- `graphics/pens.js` - Removed (pen system removed)
- `graphics/colors.js` - Moved to `api/colors.js`
- `graphics/images.js` - Moved to `api/images.js`
- `graphics/pixels.js` - Moved to `api/pixels.js`
- `core/state-settings.js` - Renamed to `core/commands.js`
- `input/events.js` - Removed (will be available as plugin)
- All audio modules - Removed (will be available as plugins)

**Notes:**
- Alpha 3 is graphics-only - audio and input will be available as plugins
- Core library focuses solely on graphics rendering

### Module Responsibilities

**Renderer Layer (`renderer/`):**
- `renderer.js`: WebGL2 context creation, module orchestration, public API exports
- `fbo.js`: Framebuffer Object creation and management
- `shaders.js`: Shader compilation, program creation, display shader setup (internal shader program mgmt)
- `batches.js`: Batch creation, management, flushing, rendering to FBO/canvas
- `textures.js`: Texture cache management (nested Map), get/delete operations
- `readback.js`: Pixel readback operations (`readPixel`, `readPixels`) (internal WebGL readback)

**Drawing Layer (`renderer/draw/`):**
- `primitives.js`: Core drawing (`drawPixel`)
- `geometry.js`: Geometry utilities and helper functions
- `batch-helpers.js`: Batch management helper functions
- `lines.js`: Line drawing (`drawLine`)
- `rects.js`: Rectangle drawing (`drawRect`, `drawRectFilled`)
- `circles.js`: Circle drawing (`drawCircle`, `drawCircleFilled`)
- `ellipses.js`: Ellipse drawing (`drawEllipse`, `drawEllipseFilled`)
- `arcs.js`: Arc drawing (`drawArc`)
- `bezier.js`: Bezier curve drawing (`drawBezier`)
- `images.js`: Image drawing (`drawImage` with textured quads)

**API Layer (`api/`):**
- `graphics.js`: High-level graphics commands - input parsing, validation, object literal handling, calls renderer functions (formerly graphics-api.js)
- `colors.js`: Palette management, color conversion
- `images.js`: Image loading, `drawImage()` command (user-facing)
- `pixels.js`: `getPixel()`, `get()`, `put()` commands (user-facing, distinct from internal renderer readback)

### Dependency Graph

All modules use lazy initialization - no code executes until `init()` is called from `renderer.js`. This allows circular imports (function references only) without circular dependency issues.

```
src/index.js
  └─ imports: api/graphics.js
	 └─ imports: renderer/renderer.js
		└─ orchestrates: all renderer/* modules

renderer/renderer.js
  ├─ imports: fbo.js, shaders.js, batches.js, textures.js
  ├─ imports: draw/primitives.js, draw/geometry.js, draw/batch-helpers.js
  ├─ imports: draw/lines.js, draw/rects.js, draw/circles.js
  ├─ imports: draw/ellipses.js, draw/arcs.js, draw/bezier.js
  ├─ imports: draw/images.js, readback.js
  └─ exports: unified public API

batches.js
  └─ imports: shaders.js

draw/primitives.js
  ├─ imports: batches.js
  └─ exports: drawPixel

draw/geometry.js
  ├─ imports: batches.js
  └─ exports: geometry utility functions

draw/batch-helpers.js
  ├─ imports: batches.js
  └─ exports: batch helper functions

draw/lines.js
  ├─ imports: batches.js, draw/primitives.js
  └─ exports: drawLine

draw/rects.js
  ├─ imports: batches.js, draw/primitives.js
  └─ exports: drawRect, drawRectFilled

draw/circles.js
  ├─ imports: batches.js, draw/primitives.js
  └─ exports: drawCircle, drawCircleFilled

draw/ellipses.js
  ├─ imports: batches.js, draw/primitives.js
  └─ exports: drawEllipse, drawEllipseFilled

draw/arcs.js
  ├─ imports: batches.js, draw/primitives.js
  └─ exports: drawArc

draw/bezier.js
  ├─ imports: batches.js, draw/primitives.js
  └─ exports: drawBezier

draw/images.js
  ├─ imports: batches.js, textures.js
  └─ exports: drawImage

readback.js
  ├─ imports: batches.js (for flushBatches)
  └─ exports: readPixel, readPixels

api/graphics.js
  ├─ imports: renderer/renderer.js, api/colors.js
  └─ exports: graphics API functions

api/colors.js
  └─ exports: palette management, color conversion

api/images.js
  ├─ imports: renderer/renderer.js
  └─ exports: loadImage, drawImage commands

api/pixels.js
  ├─ imports: renderer/renderer.js, api/colors.js
  └─ exports: getPixel, get, put commands
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
src/renderer/
├── renderer.js (empty shell)
├── fbo.js (empty shell)
├── shaders.js (empty shell)
├── batches.js (empty shell)
├── textures.js (empty shell)
├── draw/ (directory created)
│   ├── primitives.js (empty shell)
│   ├── geometry.js (empty shell)
│   ├── batch-helpers.js (empty shell)
│   ├── lines.js (empty shell)
│   ├── rects.js (empty shell)
│   ├── circles.js (empty shell)
│   ├── ellipses.js (empty shell)
│   ├── arcs.js (empty shell)
│   ├── bezier.js (empty shell)
│   └── images.js (empty shell)
├── readback.js (empty shell)
└── shaders/ (directory created)
```

Each file should have basic JSDoc header and `export function init() {}` stub.

### Step 1.3: Move Shader Files ✅ COMPLETE
Move shader source files to renderer directory structure:

**Files to move:**
```
graphics/shaders/* → renderer/shaders/*
```

**Shader files:**
- `point.vert` / `point.frag`
- `image.vert` / `image.frag`
- `display.vert` / `display.frag`

**Note:** Shaders will be imported by `renderer/shaders.js` using paths like `./shaders/point.vert`. Ensure build system can handle these paths.

### Step 1.4: Update Main Index ✅ COMPLETE
Update `src/index.js` to import renderer from new location:

```javascript
import * as g_webgl2Renderer from "./renderer/renderer.js";
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
5. readback.init()
6. draw/geometry.init()

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

### Step 2.4: Implement api/colors.js ✅ COMPLETE
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

### Step 4.1: Implement draw/primitives.js - Core Drawing ✅ COMPLETE
Move core drawing functions from `renderer-webgl2.js`:

**Responsibilities:**
- `drawPixel()` - Fast path for single pixel writes

**Key functions:**
- `export function init( api )` - Initialize module
- `export function drawPixel( screenData, x, y, color )`

**Note:** `drawImage()` will be implemented in `draw/images.js` when implementing image support.

### Step 4.2: Implement api/graphics.js - Basic Commands ✅ COMPLETE
Implement basic graphics API wrapper for input parsing and validation:

**Responsibilities:**
- Input parsing and validation
- Object literal handling
- Parameter extraction
- Build optimized drawing functions that close over screen data

**Commands to implement:**
- `pset` - Calls `renderer.drawPixel()` to draw a single pixel

**Key changes:**
- Removed screenData.render, this is no longer needed since there is only one render and we can
  acess it directly.
- No longer rasterizing graphics on the CPU calling renderer commands will generate the geometry
- No longer bounds checking. Instead relying on GPU clipping
- Removing objectLiteral option for parameter passing (primitives only)
- Thin wrapper layer that calls renderer functions
- Build optimized closures that close over screen data
- Handle object literal syntax: `pset({ x: 10, y: 20 })`

### Step 4.4: Test Basic Drawing ✅ COMPLETE
- Test `drawPixel()` - draw single pixels
- Test color system - verify palette and color parsing works
- Test `pset()` command - verify it draws single pixels correctly
- Verify renderer exports unified API through `renderer.js`

## Phase 4A: Complete pset - Geometry Batch System

### Step 4A.1: Add Geometry Batch Type to batches.js ✅ COMPLETE
Add new batch type for drawing filled geometry (rectangles, circles):

**Changes to `batches.js`:**
- Add `GEOMETRY_BATCH = 2` constant
- Update `BATCH_TYPES` array to include "GEOMETRY"
- Create geometry batch in `createBatch()` with appropriate shader setup
- Geometry batch uses `gl.TRIANGLES` mode instead of `gl.POINTS`
- Add vertex/index buffer setup for triangles
- Implement `drawRectFilled()` and `drawCircleFilled()` batch appending functions

**Key functions:**
- `export const GEOMETRY_BATCH = 2`
- Modify `createBatch()` to handle `GEOMETRY_BATCH` type
- Add geometry batch to `createContext()` in renderer.js
- Create geometry vertex/index buffers for triangle rendering

**Implementation notes:**
- Geometry batch uses triangle primitives for filled shapes
- Each filled rectangle = 2 triangles (6 vertices)
- Each filled circle = tessellated triangles (adaptive based on radius)
- Shares point shader or creates dedicated geometry shader

### Step 4A.2: Implement drawRectFilled in draw/rects.js ✅ COMPLETE
Implement `drawRectFilled()` function in `draw/rects.js`:

**Responsibilities:**
- Generate triangle vertices for filled rectangle
- Append vertices to `GEOMETRY_BATCH`
- Handle color per-vertex

**Key functions:**
- `export function drawRectFilled( screenData, x, y, width, height, color )`
  - Generates 6 vertices (2 triangles) for rectangle
  - Adds vertices to geometry batch with uniform color
  - No bounds checking (GPU clipping)

**Implementation notes:**
- Rectangle: [(x,y), (x+width,y), (x,y+height)], [(x+width,y), (x+width,y+height), (x,y+height)]
- Each vertex has 2D position and 4D color
- Uses `prepareBatch()` to ensure capacity

### Step 4A.3: Implement drawCircleFilled in draw/circles.js ✅ COMPLETE
Implement `drawCircleFilled()` function in `draw/circles.js`:

**Responsibilities:**
- Generate triangle vertices for filled circle
- Tessellate circle into triangles
- Append vertices to `GEOMETRY_BATCH`

**Key functions:**
- `export function drawCircleFilled( screenData, cx, cy, radius, color )`
  - Center vertex + ring vertices
  - Adaptive tessellation (more segments for larger radius)
  - Triangle fan or triangle strip

**Implementation notes:**
- Use center vertex + ring of vertices around circumference
- Calculate vertex count based on radius
- Generate triangle indices for circle tessellation
- Reuse center vertex for all triangles

### Step 4A.4: Export Functions from renderer.js ✅ COMPLETE
Add exports to `renderer.js` for new functions:

**Functions to export:**
- `drawRectFilled` from `draw/rects.js`
- `drawCircleFilled` from `draw/circles.js`
- `GEOMETRY_BATCH` constant from `batches.js`

**Implementation notes:**
- Add `export { drawRectFilled }` from draw/rects.js
- Add `export { drawCircleFilled }` from draw/circles.js
- Add `export { GEOMETRY_BATCH }` from batches.js
- Ensure lazy initialization doesn't break circular imports

### Step 4A.5: Wire Up api/graphics.js ✅ COMPLETE
Update `api/graphics.js` to use new renderer functions:

**Changes:**
- Replace stub `s_drawRectFilled` with actual `g_renderer.drawRectFilled`
- Replace stub `s_drawCircleFilled` with actual `g_renderer.drawCircleFilled`
- Remove TODOs and placeholder implementations

**Note:** `drawRectFilled` and `drawCircleFilled` are available for use by other commands if needed, but `pset` only draws single pixels.

### Step 4A.6: Test Complete pset Implementation ✅ COMPLETE
Test full `pset` functionality:

**Test Cases:**
- `pset()` - verify single pixel renders correctly
- Test with different colors
- Verify batch capacity management works correctly
- Test rendering with GPU clipping (draw off-screen)

## Phase 5: Textures and Images

### Step 5.1: Implement textures.js ✅ COMPLETE
Move texture management from `renderer-webgl2.js` to `textures.js`:

**Responsibilities:**
- Texture cache (nested Map: Image → GL context → Texture)
- `getWebGL2Texture()` - Get or create texture for image
- `deleteWebGL2Texture()` - Delete texture and free memory

**Key functions:**
- `export function init( api )` - Initialize module
- `export function getWebGL2Texture( screenData, img )`
- `export function deleteWebGL2Texture( img )`

### Step 5.2: Implement draw/images.js - Image Drawing ✅ COMPLETE
Add image drawing functionality to `draw/images.js`:

**Responsibilities:**
- `drawImage()` - Draw image as textured quad (rotation, scaling, anchor)

**Key functions:**
- `export function init( api )` - Initialize module
- `export function drawImage( screenData, img, x, y, angleRad, anchorX, anchorY, alpha, scaleX, scaleY )`

**Note:** The renderer's `drawImage()` is the low-level function called by `api/images.js`'s `drawImage()` command.

### Step 5.3: Implement api/images.js ✅ COMPLETE
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

### Step 5.4: Implement readback.js ✅ COMPLETE
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

### Step 5.5: Implement api/pixels.js ✅ COMPLETE
Move pixel reading/writing commands from `graphics-pixels.js` to `api/pixels.js`:

**Responsibilities:**
- `getPixel()` / `getPixelAsync()` - Read single pixel (synchronous/async)
- `get()` - Read pixel rectangle
- `put()` - Write pixel data from 2D array

**Key functions:**
- `export function init( api )` - Initialize module, register commands
- Wrapper functions for read/write operations
- Handles `asIndex` option for palette index vs color value
- `put()` accepts 2D array of palette indices and draws pixels

**Implementation notes:**
- Read operations call `screenData.renderer.readPixel()` / `readPixels()`
- `put()` calls `screenData.renderer.drawPixel()` for each pixel
- Uses `g_colors.getColorValueByIndex()` to convert palette indices to colors
- Uses `g_colors.findColorIndexByColorValue()` to convert colors to palette indices
- `put()` supports `include0` option to skip transparent pixels
- Writes directly to `m_api.put` (stable API, no command routing)

### Step 5.6: Test Images and Readback ✅ COMPLETE
- Test image loading (`loadImage()` command)
- Test `drawImage()` command - draw images with transformations
- Test renderer's low-level `drawImage()` function
- Test `readPixel()` / `readPixels()` - verify readback works

## Phase 6: High-Level Primitives

### Step 6.1: Implement draw/lines.js - Line Drawing ✅ COMPLETE
Implement line drawing in `renderer/draw/lines.js`:

**Responsibilities:**
- `drawLine()` - Draw line using WebGL2 `gl.LINES`

**Key functions:**
- `export function init( api )` - Initialize module
- `export function drawLine( screenData, x1, y1, x2, y2, color )`

**Implementation notes:**
- Use `LINES_BATCH` batch, add 2 vertices for line segment
- Draws single-pixel width lines

### Step 6.2: Implement draw/arcs.js - Arc Drawing ✅ COMPLETE
Move arc drawing from `graphics-primitives.js`:

**Responsibilities:**
- `drawArc()` - Arc outline using pixel drawing
- Handle angle ranges, winding

**Key functions:**
- `export function drawArc( screenData, cx, cy, radius, angle1, angle2, color )`

**Implementation notes:**
- Move `m_arcOutline()` function from `graphics-primitives.js`
- Draws pixels using `drawPixel()`
- Filter pixels by angle range
- Estimate batch size based on arc circumference

### Step 6.3: Implement draw/bezier.js - Bezier Drawing ✅ COMPLETE
Move bezier drawing from `graphics-primitives.js`:

**Responsibilities:**
- `drawBezier()` - Cubic bezier curve with pixel drawing

**Key functions:**
- `export function drawBezier( screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color )`

**Implementation notes:**
- Move `m_bezierOutline()` function from `graphics-primitives.js`
- Draws pixels using `drawPixel()`
- Adaptive tessellation based on curve length
- Estimate batch size based on control polygon length

### Step 6.4: Test Primitives ✅ COMPLETE
- Test `drawLine()` - various angles and lengths
- Test `drawArc()` - different angles and radii
- Test `drawBezier()` - various curve shapes
- Verify all primitives render correctly

## Phase 7: High-Level Shapes

### Step 7.1: Implement draw/rects.js - Rectangle Drawing ✅ COMPLETE
Move rectangle drawing from `graphics-shapes.js` to `renderer/draw/rects.js`:

**Responsibilities:**
- `drawRect()` - Rectangle outline with pixel drawing
- `drawRectFilled()` - Already implemented in Phase 4A (geometry batch)
- Handle fill color, blending

**Key functions:**
- `export function drawRect( screenData, x, y, width, height, color, fillColor )`
- `export function drawRectFilled( screenData, x, y, width, height, color )` - Already implemented

**Implementation notes:**
- Move `m_rectOutline()` from `graphics-shapes.js`
- Handle both outline and filled modes (filled uses `drawRectFilled()` in same module)
- Draws pixels using `drawPixel()` for outline
- All blending handled on GPU via batches.js

### Step 7.2: Implement draw/circles.js - Circle Drawing ✅ COMPLETE
Move circle drawing from `graphics-shapes.js`:

**Responsibilities:**
- `drawCircle()` - Circle outline with pixel drawing
- `drawCircleFilled()` - Already implemented in Phase 4A (geometry batch)
- Handle fill color, blending

**Key functions:**
- `export function drawCircle( screenData, cx, cy, radius, color, fillColor )`
- `export function drawCircleFilled( screenData, cx, cy, radius, color )` - Already implemented

**Implementation notes:**
- Move `m_circleOutline()` from `graphics-shapes.js`
- Filled mode uses `drawCircleFilled()` in same module
- Draws pixels using `drawPixel()` for outline
- Use midpoint circle algorithm
- Estimate batch size based on circumference (outline) or area (filled)

### Step 7.3: Implement draw/ellipses.js - Ellipse Drawing
Move ellipse drawing from `graphics-shapes.js`:

**Responsibilities:**
- `drawEllipse()` - Ellipse outline with pixel drawing
- `drawEllipseFilled()` - Filled ellipse using geometry batch
- Handle fill color, blending

**Key functions:**
- `export function drawEllipse( screenData, cx, cy, rx, ry, color, fillColor )`
- `export function drawEllipseFilled( screenData, cx, cy, rx, ry, color )`

**Implementation notes:**
- Move `m_ellipseOutline()` from `graphics-shapes.js`
- Implement `drawEllipseFilled()` using `GEOMETRY_BATCH` (similar to `drawCircleFilled()`)
- Filled mode uses `drawEllipseFilled()` in same module
- Draws pixels using `drawPixel()` for outline
- Use midpoint ellipse algorithm for outline
- Use tessellated triangles for filled mode
- Estimate batch size based on perimeter (outline) or area (filled)

### Step 7.4: Test Shapes
- Test `drawRect()` - outline and filled modes
- Test `drawCircle()` - outline and filled modes
- Test `drawEllipse()` - outline and filled modes
- Verify all shapes render correctly

## Phase 8: Complete Graphics API

### Step 8.1: Add Build API Function to api/graphics.js ✅ COMPLETE
Implement `buildApi()` function:

**Key functions:**
- `export function buildApi( screenData )` - Build all graphics API functions
- Called from `screen-manager.js` after screen creation via `buildApiOnScreenInit()`

**Implementation notes:**
- Creates optimized drawing functions that close over screen data
- Avoids branching in hot paths by pre-specializing at initialization time
- No blend handling in api/graphics.js - all blending handled on GPU

### Step 8.2: Extend api/graphics.js - Add Remaining Commands
Add remaining graphics commands to the API layer:

**Commands to implement:**
- `line` - calls `renderer.drawLine()`
- `arc` - calls `renderer.drawArc()`
- `bezier` - calls `renderer.drawBezier()`
- `rect` - calls `renderer.drawRect()`
- `circle` - calls `renderer.drawCircle()`
- `ellipse` - calls `renderer.drawEllipse()`

### Step 8.3: Update Renderer Exports
Ensure `renderer/renderer.js` exports all necessary functions:

**Exports needed:**
- `POINTS_BATCH`, `IMAGE_BATCH`, `GEOMETRY_BATCH`, `LINES_BATCH` (from batches)
- `prepareBatch()` (from batches)
- `drawPixel()` (from draw/primitives)
- `drawLine()` (from draw/lines)
- `drawRect()`, `drawRectFilled()` (from draw/rects)
- `drawCircle()`, `drawCircleFilled()` (from draw/circles)
- `drawEllipse()`, `drawEllipseFilled()` (from draw/ellipses)
- `drawArc()` (from draw/arcs)
- `drawBezier()` (from draw/bezier)
- `drawImage()` (from draw/images)
- `readPixel()`, `readPixels()` (from readback)
- `getWebGL2Texture()`, `deleteWebGL2Texture()` (from textures)
- `setImageDirty()`, `cls()`, `blendModeChanged()` (from renderer)

### Step 8.4: Test Complete Graphics API
- Test all graphics commands (`pset`, `line`, `rect`, `circle`, etc.)
- Verify object literal syntax works
- Test error handling for invalid parameters
- Verify all commands render correctly

## Phase 9: Screen Manager Simplification

### Step 9.1: Remove Canvas2D Support from Screen Manager ✅ COMPLETE
Update `core/screen-manager.js`:

**Changes:**
- Remove `useCanvas2d` option
- Remove `CANVAS2D_RENDER_MODE` constant
- Remove `WEBGL2_RENDER_MODE` constant (always WebGL2 now)
- Remove `setupScreenRenderer()` fallback logic
- Simplify to only call `renderer.createContext()`
- Remove render mode checks throughout

### Step 9.2: Update Screen Data ✅ COMPLETE
Remove Canvas2D-specific screen data items:
- Remove `renderMode` (always WebGL2)
- Remove `useCanvas2d` flag
- Keep `renderer` reference (points to WebGL2 renderer)
- Remove all Canvas2D path checks

### Step 9.3: Update Other Modules ✅ COMPLETE
Remove Canvas2D render mode checks from:
- `api/graphics.js` - Remove `CANVAS2D_RENDER_MODE` checks
- Any other modules that check render mode
- All blend modes handled on GPU via batches.js

### Step 9.4: Test Screen Manager
- Test screen creation (should always use WebGL2)
- Test screen removal/cleanup
- Test multiple screens
- Verify no Canvas2D code paths remain

## Phase 10: Update Supporting Modules

**Note:** `api/colors.js` was implemented earlier (Phase 2) and is already WebGL2-only.

### Step 10.1: Update api/pixels.js ✅ COMPLETE
Update pixel module for WebGL2 only:
- Use only `renderer.readPixel()` / `renderer.readPixels()`
- Remove Canvas2D readback path
- Remove render mode checks

### Step 10.2: Test Supporting Modules
- Test pixel readback commands
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
