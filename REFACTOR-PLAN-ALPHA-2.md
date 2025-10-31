# Pi.js Alpha 2 - WebGL Migration Plan

## Overview

Migrate Pi.js from 2D Canvas ImageData rendering to WebGL2 for improved performance, while 
simplifying the architecture by removing non-pixel mode and canvas font support. Implement 
incrementally, starting with a minimal shell and building up feature by feature.

**Note:** This refactor uses a functional folder layout (see `REFACTOR-FOLDER-LAYOUT.md`) 
instead of the previous `modules/` approach, organizing code by functionality rather than 
by feature type.

## Goals

- Migrate from 2D Canvas `putImageData` to WebGL2 rendering
- Remove `render()` command - automatic rendering only
- Remove non-pixel mode support (pixel mode only)
- Remove canvas font support (bitmap fonts only)
- Optimize command system for better JIT performance
- Implement features incrementally (shell → screen → pset → line → etc.)
- WebGL2 with fallback to 2D Canvas (no WebGL1)

## Phase 1: Setup and Minimal Shell ✅ COMPLETE

### Step 1.1: Copy Alpha 1 to src/ ✅ COMPLETE
- Copied all files from `src-pi-2.0.0-alpha.1/` to `src/`
- This became the working directory for Alpha 2

### Step 1.2: Create REFACTOR-PLAN-ALPHA-2.md ✅ COMPLETE
- Documented the Alpha 2 goals and architecture
- Outlined WebGL2 rendering approach
- Documented removed features (non-pixel mode, canvas fonts, render())
- Included incremental implementation strategy

### Step 1.3: Strip Down to Minimal Shell ✅ COMPLETE
Removed all feature modules, keeping only core infrastructure:

**Kept:**
- `src/index.js` (minimal - only core imports)
- `src/core/screen-manager.js` (screen creation only)
- `src/core/utils.js` (utility functions)
- `src/core/state-settings.js` (state management)
- `src/core/plugins.js` (plugin system)

**Removed/Gutted (will rebuild incrementally):**
- All `src/modules/*` files - removed (replaced with functional layout)
- `src/assets/font-data.js` - removed temporarily (will be `src/text/font-data.js`)

**Updated `src/index.js`:**
```javascript
// Core Modules
import * as g_utils from "./core/utils";
import * as g_state from "./core/state-settings.js";
import * as g_screenManager from "./core/screen-manager.js";
import * as g_plugins from "./core/plugins.js";

// Graphics
import * as g_webgl2Renderer from "./graphics/renderer-webgl2.js";
import * as g_canvas2dRenderer from "./graphics/renderer-canvas2d.js";
import * as g_pens from "./graphics/pens.js";
import * as g_colors from "./graphics/colors.js";
import * as g_basic from "./graphics/basic.js";

// Inputs
import * as g_events from "./inputs/events.js";

const VERSION = __VERSION__;
const api = { "version": VERSION };

// Create the main api for all external commands later assinged to globals pi or $
const api = {
	"version": VERSION
};

// Store modules in array for orderered initialization
const mods = [
	g_utils, g_state, g_screenManager, g_plugins, g_webgl2Renderer, g_canvas2dRenderer, g_pens,
	g_colors, g_basic, g_events
];

if( typeof window !== "undefined" ) {
	window.pi = api;
	if( window.$ === undefined ) {
		window.$ = api;
	}
}

export default api;
export { api as pi };
```

### Step 1.4: Test Minimal Build ✅ COMPLETE
- Built successfully with `npm run build`
- Verified it builds without errors
- Created simple test HTML that loads Pi.js

## Phase 2: WebGL2 Core Architecture ✅ COMPLETE

### Step 2.1: Split Renderer into Three Files ✅ COMPLETE
Created specialized renderers in the graphics directory:

**Created `src/graphics/renderer-webgl2.js`:**

**Key responsibilities:**
- WebGL2 context creation and management
- Framebuffer Object (FBO) for offscreen rendering
- Shader compilation and program management
- Batch rendering system (point batch, line batch, triangle batch)
- Automatic render queue (microtask-based)

**Created `src/graphics/renderer-canvas2d.js`:**

**Key responsibilities:**
- 2D Canvas context creation and management
- ImageData manipulation for pixel-perfect rendering
- Fallback rendering when WebGL2 is not available
- Compatible API with renderer-webgl2 for seamless switching

**Note:** The external API commands (cls, setPen, setBlend) are handled by individual modules rather than a central renderer module.

### Step 2.2: Create Simple Shaders inside src/graphics/shaders ✅ COMPLETE

**Point shader (for pixel-perfect rendering):**
```glsl
#version 300 es
in vec2 a_position;
in vec4 a_color;
uniform vec2 u_resolution;
out vec4 v_color;

void main() {

	// Convert screen coords to NDC with pixel center adjustment
	// Add 0.5 to center the pixel, then convert to NDC
	vec2 pixelCenter = a_position + 0.5;
	vec2 ndc = ((pixelCenter / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);
	gl_Position = vec4(ndc, 0.0, 1.0);
	gl_PointSize = 1.0;
	v_color = a_color;
}
```

**Similar shaders for rendering from FBO to canvas implemented**

### Step 2.3: Update Screen Manager for Renderer Delegation ✅ COMPLETE
Modified `src/core/screen-manager.js`:

**Key changes:**
- Removed direct `getContext( "2d" )` calls
- Added renderer initialization logic that tries WebGL2 first, falls back to Canvas2D
- Delegated context creation to the appropriate renderer

**Screen creation flow implemented:**
- Try WebGL2 first, fall back to Canvas2D
- Set `screenData.renderMode` to "webgl2" or "canvas2d"
- Set `screenData.renderer` to the active renderer instance

**Removed screenData items:**
- Direct context creation
- `imageData` (moved to canvas2d-renderer)
- `isDirty` (handled by renderers)
- `isAutoRender` (always auto-render now)
- `autoRenderMicrotaskScheduled` (handled by renderers)
- `pixelMode` (always pixel mode now)

**Added screenData items:**
- `renderer` - The active renderer instance
- `renderMode` - "webgl2" or "canvas2d"

### Step 2.4: Implement Blank Screen ✅ COMPLETE
Goal: Create a screen that displays a solid color (black/transparent by default)

**Screen creation implemented:**
- Try WebGL2 renderer first
- If WebGL2 fails, fall back to Canvas2D renderer
- Clear to black using appropriate renderer
- Display to canvas using renderer's display method
- Screen appears correctly

**Test working:**
```javascript
$.ready(() => {
    $.screen("320x240");
    // Shows black screen (WebGL2 or Canvas2D)
});
```

### Step 2.5: Create Canvas2D Renderer ✅ COMPLETE
Created `src/graphics/renderer-canvas2d.js`:

**Key responsibilities:**
- 2D Canvas context creation and management
- ImageData manipulation for pixel-perfect rendering
- Compatible API with webgl-renderer
- Fallback rendering when WebGL2 is not available

**Structure implemented:**
- `initCanvas2D()` function for context creation
- ImageData manipulation for pixel-perfect rendering
- Compatible API with WebGL2 renderer
- Proper fallback handling

## Phase 3: Command System Optimization ✅ COMPLETE

### Step 3.1: Implement Fast Path Architecture ✅ COMPLETE

**Added to both renderers:**

**`src/graphics/renderer-webgl2.js`:**
- Implemented fast path for direct pixel writes (no bounds check, no blending)
- Added `drawPixelUnsafe()` functions
- Batch system for efficient rendering
- Automatic render queue management

**`src/graphics/renderer-canvas2d.js`:**
- Implemented fast path for direct pixel writes (no bounds check, no blending)
- Added `drawPixelUnsafe()` functions
- ImageData manipulation for pixel-perfect rendering
- Dirty flag management for efficient updates

### Step 3.2: Optimize Command Wrappers ✅ COMPLETE

**Graphics commands optimized:**
- Implemented in `src/graphics/basic.js`
- Avoid spread operators in hot paths
- Skip `parseOptions` for simple commands
- Use fixed parameter lists for better JIT performance
- Monomorphic call sites for optimization

### Step 3.3: Remove Pen/Blend Function Pointers ✅ COMPLETE
Since we're removing non-pixel mode and simplifying:

**Implemented in `src/graphics/pens.js`:**
- Kept pen/blend system but simplified
- Merged setBlend into setPen and removed setBlend
- All drawing uses direct pixel writes to renderer batches
- Pen system now focuses on pixel mode only
- Blend modes simplified to replace and alpha

## Phase 4: Color System ✅ COMPLETE

### Step 4.1: Rebuild Color Module ✅ COMPLETE
Created simplified `src/graphics/colors.js`:

**Focus on:**
- Palette management (256 colors)
- Color cache for fast lookups
- RGB/Hex conversion utilities
- No AA mode, no canvas context colors

**Removed:**
- Canvas context color setting
- AA mode color handling
- Non-pixel mode support

### Step 4.2: Add Color to Screen Data ✅ COMPLETE
```javascript
screenManager.addScreenDataItem( "color", { r: 255, g: 255, b: 255, a: 255 } );
screenManager.addScreenDataItem( "palette", defaultPalette );
screenManager.addScreenDataItem( "colorCache", {} );
```

### Step 4.3: Implement setColor Command ✅ COMPLETE
```javascript
function setColor( screenData, options ) {
	const color = parseColor( options.color );
	screenData.color = color;
}
```

## Phase 5: First Drawing Command - pset ✅ COMPLETE

### Step 5.1: Create Graphics Module ✅ COMPLETE
Created `src/graphics/basic.js`:

```javascript
import * as screenManager from "../core/screen-manager.js";
import * as webglRenderer from "./renderer-webgl2.js";
import * as canvas2dRenderer from "./renderer-canvas2d.js";

export function init() {

	// Graphics commands are built dynamically based on screen data
	buildGraphicsApi( null );
}

// ... inside buildGraphicsApi
const psetFn = ( x, y ) => {
	let px, py;

	// Parse object if needed
	if( s_isObjectLiteral( x ) ) {
		px = s_getInt( x.x1, null );
		py = s_getInt( x.y1, null );
	} else {
		px = s_getInt( x, null );
		py = s_getInt( y, null );
	}

	// Make sure x and y are integers
	if( px === null || py === null ) {
		const error = new TypeError( "pset: Parameters x and y must be integers." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}
	preprocessPset( s_screenData );
	s_penFn( s_screenData, px, py, s_color );
	s_setImageDirty( s_screenData );
};
```

### Step 5.2: Test pset ✅ COMPLETE
```javascript
$.ready( () => {
	$.screen( "320x240" );
	$.setColor( 15 ); // White
	$.pset( 160, 120 ); // Center pixel
	// Should see white pixel in center
} );
```

## Phase 6: Line Drawing ✅ COMPLETE

### Step 6.1: Implement line Command ✅ COMPLETE
Added to `src/graphics/basic.js`:

```javascript
// ... inside buildGraphicsApi
const lineFn = ( x1, y1, x2, y2 ) => {
	let px1, py1, px2, py2;

	if( s_isObjectLiteral( x1 ) ) {
		px1 = s_getInt( x1.x1, null );
		py1 = s_getInt( x1.y1, null );
		px2 = s_getInt( x1.x2, null );
		py2 = s_getInt( x1.y2, null );
	} else {
		px1 = s_getInt( x1, null );
		py1 = s_getInt( y1, null );
		px2 = s_getInt( x2, null );
		py2 = s_getInt( y2, null );
	}

	// Make sure x and y are integers
	if( px1 === null || py1 === null || px2 === null || py2 === null ) {
		const error = new TypeError( "line: Parameters x1, y1, x2, and y2 must be integers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	preprocessLine( s_screenData, px1, py1, px2, py2 );
	line( s_screenData, px1, py1, px2, py2, s_color, s_penFn );
	s_setImageDirty( s_screenData );
};
```

### Step 6.2: Test line ✅ COMPLETE
```javascript
$.ready(() => {
	$.screen( "320x240" );
	$.setColor( 255 );
	$.line( 0, 0, 319, 239 ); // Diagonal line
});
```

## Phase 7: Additional Graphics Primitives

Implement incrementally, one at a time:
In this stage we are going to do everything use CPU rasterization. In a later refactor version we
may look into using shapes and triangles on the GPU but it may be performant enough for now.
May consider this for an updated version of pi.js, but for now it would add a lot of complications
due to drawing order of the batches and requiring multiple shaders.

### Step 7.1: rect (filled and outlined)
- Use points and CPU rasterization event with webgl2

### Step 7.2: circle (filled and outlined)
- Use points and CPU rasterization event with webgl2

### Step 7.3: ellipse
- Use points and CPU rasterization event with webgl2
- Midpoint ellipse algorithm

### Step 7.4: arc
- Use points and CPU rasterization event with webgl2
- Partial circle rendering

### Step 7.5: bezier
- Use points and CPU rasterization event with webgl2
- Tessellation to line segments
- Add to line batch

### Step 7.6: get/getAsync
- Use gl.readPixels to capture an area of pixels and convert them to pal colors
- Will require a flush before readPixels this is a blocking operation, will not recommend for use
- in an animation frame
- getAsync can be used in animation from and will call readPixels after frame completes and flush is
- called

### Step 7.6: put
- Use points and CPU rasterization event with webgl2
- Uses palette indices instead of raw color values.
- Required for canvas2d piPrint mode.

## Phase 8: Image Support

### Step 8.1: Rebuild Images Module
Create new `src/graphics/images.js`:

- Don't use points for images but will flushbatch before drawing images to the FBO.
- Load images as WebGL textures
- Use textured quad batch for drawing
- Sprite sheet support with texture atlases

### Step 8.2: Implement drawImage
- Add to textured triangle batch
- Support rotation, scaling, anchors

## Phase 9: Text Rendering (Bitmap Fonts Only)

### Step 9.1: Convert Default Fonts to Bitmaps
- Take existing base32-encoded fonts
- Keep existing print using put command
- For testing also convert to bitmap texture atlas/canvas2d image at init time.
- Compare results and may consider using bitmap. It may be faster but I'm not sure because images
- require flush before being able to render an image.
- Create `src/text/font-data.js`

### Step 9.2: Rebuild Font Module
- Load bitmap fonts as textures
- Character atlas mapping
- Create `src/text/font.js`

### Step 9.3: Rebuild Print Module
- Render text as textured quads for bitmap mode.
- Add to textured triangle batch
- Use put command for non-bitmap mode.
- Canvas print mode is no longer supported.
- Cursor positioning, word wrap
- Create `src/text/print.js`

## Phase 10: Advanced Features

### Step 10.1: getPixel/getPixelAsync
- `gl.readPixels()`
- Synchrounous - blocking is fine
- Asynchronous - will run after flush at end of frame
- Return Promises

### Step 10.2: getPixelColor/getPixelColorAsync

### Step 10.3: paint (Flood Fill)
- Initial CPU implementation
- Not going to use a Worker here, I think blocking is ok because
- worker would be difficult because future draw operations would conflict it's probably not worth
- the worker overhead.  Maybe in a future version I could add a worker but would still have to
- prevent any draw operations until the worker is finished but at least it would be a cleaner
- wait then a sync block.  But not this version.

### Step 10.4: filterImg
- GPU post-processing shader
- Apply to FBO texture

## Phase 11: Input Systems

Rebuild incrementally in `src/inputs/`:
- `keyboard.js`
- `mouse.js`
- `touch.js`
- `gamepad.js`
- `press.js`

(These should need minimal changes since they don't interact with rendering)

## Phase 12: Sound System

Rebuild in `src/audio/`:
- `sound.js`
- `play.js`

(Should need minimal changes)

## Phase 13: Testing and Optimization

### Step 13.1: Run Visual Regression Tests
- Update tests for removed features
- Fix any rendering differences

### Step 13.2: Performance Benchmarking
- Compare against Alpha 1
- Measure FPS improvements
- Profile hot paths

### Step 13.3: Optimize Batch Sizes
- Tune batch buffer sizes
- Implement batch flushing strategies

## Phase 14: Documentation

### Step 14.1: Update API Documentation
- Document removed features
- Document automatic rendering
- Document WebGL2 requirements

### Step 14.2: Migration Guide
- Alpha 1 to Alpha 2 migration
- Breaking changes list
- Performance tips

## Target Folder Structure (from REFACTOR-FOLDER-LAYOUT.md)

```
src/
├── index.js                    # Main entry point
├── core/                       # Core system modules
│   ├── utils.js               # Utility functions
│   ├── state-settings.js      # State and settings management
│   ├── screen-manager.js      # Screen creation and management
│   └── plugins.js             # Plugin system
├── graphics/                   # Graphics rendering modules
│   ├── renderer-webgl2.js     # WebGL2 primary renderer
│   ├── renderer-canvas2d.js   # Canvas2D fallback renderer
│   ├── pens.js                # Pen and blend mode system
│   ├── colors.js              # Color palette and management
│   ├── basic.js               # Basic graphics commands (pset, line, etc.)
│   ├── (images.js)            # Image loading and drawing (planned)
│   ├── (paint.js)             # Paint/flood fill operations (planned)
│   └── (draw.js)              # Advanced drawing primitives (planned)
├── text/                       # Text rendering modules
│   ├── (font-data.js)         # Font data and bitmaps (planned)
│   ├── (font.js)              # Font management (planned)
│   └── (print.js)             # Text printing commands (planned)
├── inputs/                     # Input handling modules
│   ├── events.js              # Event management system
│   ├── (keyboard.js)          # Keyboard input (planned)
│   ├── (mouse.js)             # Mouse input (planned)
│   ├── (touch.js)             # Touch input (planned)
│   ├── (gamepad.js)           # Gamepad input (planned)
│   └── (press.js)             # Press/click detection (planned)
└── audio/                      # Audio modules
    ├── (sound.js)             # Sound management (planned)
    └── (play.js)              # Audio playback (planned)
```

**Note:** Files in parentheses `()` are planned modules not yet implemented.

## Key Architectural Changes

### Removed Features
1. `render()` command - automatic rendering only
2. Non-pixel mode - pixel mode only
3. Canvas fonts - bitmap/put fonts only
4. `setPixelMode()` - always pixel mode
5. `setAutoRender()` - always auto-render
6. Pen system - simplified to direct pixel writes
7. Blend modes - simplified

### New Features
1. WebGL2 rendering with FBO
2. Automatic batch rendering
3. Optimized command wrappers
4. Fast path for hot operations
5. `getAsync()`/`getPixelAsync()` for non-blocking reads (planned)

### Performance Improvements
1. GPU-accelerated rendering
2. Batch rendering system
3. Optimized command invocation
4. Direct pixel writes (no function pointers)
5. Monomorphic call sites for JIT optimization

## Implementation Strategy

- Work incrementally - one feature at a time
- Test after each feature
- Keep commits small and focused
- Build complexity gradually
- Don't skip ahead to complex features

## Success Criteria

- WebGL2 rendering working with fallback
- pset and line working correctly
- Performance better than Alpha 1
- Clean, maintainable code
- Ready for incremental feature additions

## To-dos

### Phase 1: Setup and Minimal Shell ✅ COMPLETE
- [x] Step 1.1-1.4: Setup minimal shell - copy alpha.1 to src/, create REFACTOR-PLAN-ALPHA-2.md, strip down to core only

### Phase 2: WebGL2 Core Architecture ✅ COMPLETE
- [x] Step 2.1: Create WebGL Renderer Core (renderer-webgl2.js) and Canvas2D Renderer (renderer-canvas2d.js)
- [x] Step 2.2: Create Simple Shaders - Integrated into renderer-webgl2.js
- [x] Step 2.3: Update Screen Manager for Renderer Delegation
- [x] Step 2.4: Implement Blank Screen
- [x] Step 2.5: Create Canvas2D Renderer

### Phase 3: Command System Optimization ✅ COMPLETE
- [x] Step 3.1: Implement Fast Path Architecture
- [x] Step 3.2: Optimize Command Wrappers
- [x] Step 3.3: Remove Pen/Blend Function Pointers

### Phase 4: Color System ✅ COMPLETE
- [x] Step 4.1: Rebuild Color Module
- [x] Step 4.2: Add Color to Screen Data
- [x] Step 4.3: Implement setColor Command

### Phase 5: First Drawing Command - pset ✅ COMPLETE
- [x] Step 5.1: Create Graphics Module
- [x] Step 5.2: Test pset

### Phase 6: Line Drawing ✅ COMPLETE
- [x] Step 6.1: Implement line Command
- [x] Step 6.2: Test line

### Phase 7: Additional Graphics Primitives
- [x] Step 7.1: Implement rect (filled and outlined)
- [x] Step 7.2: Implement circle (filled and outlined)
- [x] Step 7.3: Implement ellipse
- [x] Step 7.4: Implement arc
- [x] Step 7.5: Implement bezier
- [x] Step 7.6: Implement getPixel (Synchronous)/getPixelAsync
- [x] Step 7.7: Implement getPixelColor (Synchronous)/getPixelColorAsync
- [x] Step 7.8: Implement get/getAsync
- [x] Step 7.9: Implement put Command
- [x] Step 7.10: Implement getColor (new) - should return the active color on the activeScreen
- [x] Step 7.11: Implement getPalColor (new) - Given an index return the pal color value

### Phase 8: Image Support
- [ ] Step 8.1: Rebuild Images Module
- [ ] Step 8.2: Implement loadImage
- [ ] Step 8.3: Implement drawImage
- [ ] Step 8.4: Implement loadSprite
- [ ] Step 8.5: Implement drawSprite
- [ ] Step 8.6: Implement getSpritesheetData
- [ ] Step 8.7: Implement getImage

### Phase 9: Text Rendering (Bitmap/Put Fonts Only)
- [ ] Step 9.1: Convert Default Fonts to Bitmaps and Put Arrays
- [ ] Step 9.2: Rebuild Font Module
- [ ] Step 9.3: Rebuild Print Module

### Phase 10: Advanced Features
- [ ] Step 10.1: Implement paint (Flood Fill)
- [ ] Step 10.2: Implement filterImg
- [ ] Step 10.3: Implement replaceColors
- [ ] Step 10.4: Implement *replacePalColors
- *: replacePalColors should be simplified, it should replace the pal then call replaceColors
	 reduce the amount of code required

### Phase 11: Input Systems
- [ ] Rebuild `src/inputs/keyboard.js`
- [ ] Rebuild `src/inputs/mouse.js`
- [ ] Rebuild `src/inputs/touch.js`
- [ ] Rebuild `src/inputs/gamepad.js`
- [ ] Rebuild `src/inputs/press.js`

### Phase 12: Sound System
- [ ] Rebuild `src/audio/sound.js`
- [ ] Rebuild `src/audio/play.js`

### Phase 13: Testing and Optimization
- [ ] Step 13.1: Run Visual Regression Tests
- [ ] Step 13.2: Performance Benchmarking
- [ ] Step 13.3: Optimize Batch Sizes

### Phase 14: Documentation
- [ ] Step 14.1: Update API Documentation
- [ ] Step 14.2: Create Migration Guide
