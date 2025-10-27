# Pi.js Alpha 2 - WebGL Migration Plan

## Overview

Migrate Pi.js from 2D Canvas ImageData rendering to WebGL2 for improved performance, while 
simplifying the architecture by removing non-pixel mode and canvas font support. Implement 
incrementally, starting with a minimal shell and building up feature by feature.

## Goals

- Migrate from 2D Canvas `putImageData` to WebGL2 rendering
- Remove `render()` command - automatic rendering only
- Remove non-pixel mode support (pixel mode only)
- Remove canvas font support (bitmap fonts only)
- Optimize command system for better JIT performance (per STRUCTURE-UPGRADE.md)
- Implement features incrementally (shell → screen → pset → line → etc.)
- WebGL2 with fallback to 2D Canvas (no WebGL1)
- Prepare for future Web Worker integration (TODO comments)

## Phase 1: Setup and Minimal Shell

### Step 1.1: Copy Alpha 1 to src/
- Copy all files from `src-pi-2.0.0-alpha.1/` to `src/`
- This becomes the working directory for Alpha 2

### Step 1.2: Create REFACTOR-PLAN-ALPHA-2.md
- Document the Alpha 2 goals and architecture
- Reference WEBGL-UPGRADE.md and STRUCTURE-UPGRADE.md
- Outline WebGL2 rendering approach
- Document removed features (non-pixel mode, canvas fonts, render())
- Include incremental implementation strategy

### Step 1.3: Strip Down to Minimal Shell
Remove all feature modules, keeping only core infrastructure:

**Keep:**
- `src/index.js` (minimal - only core imports)
- `src/core/commands.js` (command registration system)
- `src/core/screen-manager.js` (screen creation only)
- `src/core/utils.js` (utility functions)

**Remove/Gut (will rebuild incrementally):**
- `src/core/renderer.js` - will rebuild for WebGL
- `src/core/colors.js` - will rebuild
- `src/core/events.js` - keep for plugins
- `src/core/plugins.js` - keep
- All `src/modules/*` files - remove temporarily
- `src/assets/font-data.js` - remove temporarily

**Update `src/index.js`:**
```javascript
import * as commands from "./core/commands.js";
import * as screenManager from "./core/screen-manager.js";
import * as events from "./core/events.js";
import * as plugins from "./core/plugins.js";

const VERSION = __VERSION__;
const api = { "version": VERSION };

commands.init( api, screenManager );
screenManager.init();
events.init();
plugins.init();

commands.processApi();

if( typeof window !== "undefined" ) {
    window.pi = api;
    if( window.$ === undefined ) {
        window.$ = api;
    }
}

export default api;
export { api as pi };
```

### Step 1.4: Test Minimal Build
- Run `npm run build`
- Verify it builds without errors
- Create simple test HTML that loads Pi.js (should do nothing yet)

## Phase 2: WebGL2 Core Architecture

### Step 2.1: Split Renderer into Three Files
Replace `src/core/renderer.js` with three specialized renderers:

**Create `src/modules/renderer.js`:**

**Key responsibilities:**
- Manage shared screenData between the two renderers
- Create the external API commands related to rendering for (cls, setPen, and setBlend)

**Create `src/core/renderer-webgl2.js`:**

**Key responsibilities:**
- WebGL2 context creation and management
- Framebuffer Object (FBO) for offscreen rendering
- Shader compilation and program management
- Batch rendering system (point batch, line batch, triangle batch)
- Automatic render queue (microtask-based)

**Create `src/core/renderer-canvas2d.js`:**

**Key responsibilities:**
- 2D Canvas context creation and management
- ImageData manipulation for pixel-perfect rendering
- Fallback rendering when WebGL2 is not available
- Compatible API with renderer-webgl2 for seamless switching

**Initial structure:**
```javascript
// WebGL2 context and FBO
let m_gl = null;
let m_screenFBO = null;
let m_screenTexture = null;

// Batch systems
const m_pointBatch = { vertices: [], colors: [], count: 0 };
const m_lineBatch = { vertices: [], colors: [], count: 0 };
const m_triangleBatch = { vertices: [], colors: [], uvs: [], count: 0 };

// Shader programs
let m_pointShader = null;
let m_lineShader = null;
let m_triangleShader = null;

export function init() {
    // Initialize WebGL2 or fallback
    // Create FBO for offscreen rendering
    // Compile shaders
    // Setup batch buffers
}

export function initWebGL( canvas, width, height ) {
    // Try WebGL2 first
    m_gl = canvas.getContext( "webgl2", { 
        alpha: false, 
        premultipliedAlpha: false 
    } );
    
    if( !m_gl ) {
        // Return null to indicate fallback needed
        return null;
    }
    
    // Create FBO and texture
    // Compile shaders
    // Return WebGL renderer interface
}

export function addPoint( x, y, color ) {
    // Add to point batch
    // Queue automatic render if needed
}

export function flushBatches() {
    // Render all batches to FBO
}

export function displayToCanvas() {
    // Draw FBO texture to visible canvas
}
```

### Step 2.2: Create Simple Shaders inside renderer-webgl2.js

**Point shader (for pixel-perfect rendering):**
```glsl
// Vertex shader
attribute vec2 a_position;
attribute vec4 a_color;
varying vec4 v_color;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    gl_PointSize = 1.0;
    v_color = a_color;
}

// Fragment shader
precision mediump float;
varying vec4 v_color;

void main() {
    gl_FragColor = v_color;
}
```

**Similar shaders for lines and triangles**

### Step 2.3: Update Screen Manager for Renderer Delegation
Modify `src/core/screen-manager.js`:

**Key changes:**
- Remove direct `getContext( "2d" )` calls
- Add renderer initialization logic that tries WebGL2 first, falls back to Canvas2D
- Delegate context creation to the appropriate renderer

**New screen creation flow:**
```javascript
function screen( options ) {
    // ... existing screen setup ...
    
	// Try WebGL2 first, fall back to Canvas2D
	const webgl2Status = g_webgl2Renderer.initWebGL( screenData );
	if( webgl2Status ) {
		screenData.renderMode = "webgl";
		screenData.renderer = g_webgl2Renderer;
	} else {

		// Canvas2D renderer (fallback)
		const canvas2dStatus = g_canvas2dRenderer.initCanvas2D( screenData );
		if( !canvas2dStatus ) {
			const error = new Error( "screen: Failed to create rendering context." );
			error.code = "NO_RENDERING_CONTEXT";
			throw error;
		}

		screenData.renderMode = "canvas2d";
		screenData.renderer = canvas2dStatus;
	}

    // ... rest of screen setup ...
}
```

**Remove these screenData items:**
- Direct context creation
- `imageData` and `imageData2` (moved to canvas2d-renderer)
- `isDirty` (handled by renderers)
- `isAutoRender` (always auto-render now)
- `autoRenderMicrotaskScheduled` (handled by renderers)
- `pixelMode` (always pixel mode now)

**Add these screenData items:**
- `renderer` - The active renderer instance
- `renderMode` - "webgl2" or "canvas2d"


### Step 2.4: Implement Blank Screen
Goal: Create a screen that displays a solid color (black/transparent by default)

**Update screen creation:**
- Try WebGL2 renderer first
- If WebGL2 fails, fall back to Canvas2D renderer
- Clear to black using appropriate renderer
- Display to canvas using renderer's display method
- Verify screen appears

**Test:**
```javascript
$.ready(() => {
    $.screen({ width: 320, height: 240 });
    // Should show black screen (WebGL2 or Canvas2D)
});
```

### Step 2.5: Create Canvas2D Renderer
Create `src/core/renderer-canvas2d.js`:

**Key responsibilities:**
- 2D Canvas context creation and management
- ImageData manipulation for pixel-perfect rendering
- Compatible API with webgl-renderer
- Fallback rendering when WebGL2 is not available

**Initial structure:**
```javascript
export function initCanvas2D( canvas, width, height ) {
    const context = canvas.getContext( "2d", {
        alpha: false,
        desynchronized: true
    } );
    
    if( !context ) {
        return null;
    }
    
    // Setup canvas for pixel-perfect rendering
    context.imageSmoothingEnabled = false;
    
    // Create ImageData for pixel manipulation
    const imageData = context.createImageData( width, height );
    
    return {
        getContext: () => context,
        getImageData: () => imageData,
        clear: () => clearToBlack( context, width, height ),
        display: () => context.putImageData( imageData, 0, 0 ),
        drawPixel: ( x, y, r, g, b, a ) => setPixel( imageData, x, y, r, g, b, a )
    };
}
```

## Phase 3: Command System Optimization

### Step 3.1: Implement Fast Path Architecture
Following STRUCTURE-UPGRADE.md recommendations:

**Add to both renderers:**

**`src/core/webgl-renderer.js`:**
```javascript
// Fast path for direct pixel writes (no bounds check, no blending)
export function drawPixelUnsafe( screenData, x, y, r, g, b, a ) {
    // Add directly to point batch
    const batch = m_pointBatch;
    const idx = batch.count * 2;
    const cidx = batch.count * 4;
    
    batch.vertices[idx] = x;
    batch.vertices[idx + 1] = y;
    batch.colors[cidx] = r / 255;
    batch.colors[cidx + 1] = g / 255;
    batch.colors[cidx + 2] = b / 255;
    batch.colors[cidx + 3] = a / 255;
    
    batch.count++;
    
    queueAutoRender( screenData );
}

// Fast path with bounds checking
export function drawPixelDirect( screenData, x, y, r, g, b, a ) {
    if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
        return;
    }
    drawPixelUnsafe( screenData, x, y, r, g, b, a );
}
```

**`src/core/canvas2d-renderer.js`:**
```javascript
// Fast path for direct pixel writes (no bounds check, no blending)
export function drawPixelUnsafe( screenData, x, y, color ) {
	const imageData = screenData.imageData;
	const data = imageData.data;
	const idx = ( ( screenData.width * y ) + x ) * 4;
	
	data[ idx ] = color.r;
	data[ idx + 1 ] = color.g;
	data[ idx + 2 ] = color.b;
	data[ idx + 3 ] = color.a;
	
	setImageDirty( screenData );
}

// Fast path with bounds checking
export function drawPixelDirect( screenData, x, y, color ) {
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}
	drawPixelUnsafe( screenData, x, y, color );
}
```

### Step 3.2: Optimize Command Wrappers
Following STRUCTURE-UPGRADE.md Section 2.1:

**Update `src/core/commands.js`:**
- Implement `generateOptimizedWrapper()` function
- Avoid spread operators
- Skip `parseOptions` for 0-1 parameter commands
- Use fixed parameter lists instead of `...args`

### Step 3.3: Remove Pen/Blend Function Pointers
Since we're removing non-pixel mode and simplifying:

- Remove `screenData.pen` function pointer
- Remove `screenData.blend` function pointer
- Remove `m_pens` and `m_blends` registries
- All drawing uses direct pixel writes to WebGL batches

## Phase 4: Color System

### Step 4.1: Rebuild Color Module
Create simplified `src/core/colors.js`:

**Focus on:**
- Palette management (256 colors)
- Color cache for fast lookups
- RGB/Hex conversion utilities
- No AA mode, no canvas context colors

**Remove:**
- Canvas context color setting
- AA mode color handling
- Non-pixel mode support

### Step 4.2: Add Color to Screen Data
```javascript
screenManager.addScreenDataItem( "color", { r: 255, g: 255, b: 255, a: 255 } );
screenManager.addScreenDataItem( "palette", defaultPalette );
screenManager.addScreenDataItem( "colorCache", {} );
```

### Step 4.3: Implement setColor Command
```javascript
function setColor( screenData, options ) {
    const color = parseColor( options.color );
    screenData.color = color;
}
```

## Phase 5: First Drawing Command - pset

### Step 5.1: Create Graphics Module
Create new `src/modules/graphics.js`:

```javascript
import * as screenManager from "../core/screen-manager.js";
import * as webglRenderer from "../core/webgl-renderer.js";
import * as canvas2dRenderer from "../core/canvas2d-renderer.js";

export function init() {
    screenManager.addCommand( "pset", pset, [ "x", "y", "color" ] );
}

function pset( screenData, options ) {
    const x = Math.floor( options.x );
    const y = Math.floor( options.y );
    
    // Use current color if not specified
    let color = screenData.color;
    if( options.color !== null ) {
        color = parseColor( options.color );
    }
    
    // Use appropriate renderer based on screen mode
    if( screenData.renderMode === "webgl2" ) {
        webglRenderer.drawPixelDirect( 
            screenData, x, y, 
            color.r, color.g, color.b, color.a 
        );
    } else {
        canvas2dRenderer.drawPixelDirect( 
            screenData, x, y, 
            color.r, color.g, color.b, color.a 
        );
    }
}
```

### Step 5.2: Test pset
```javascript
$.ready(() => {
    $.screen({ width: 320, height: 240 });
    $.setColor( 255 ); // White
    $.pset( 160, 120 ); // Center pixel
    // Should see white pixel in center
});
```

## Phase 6: Line Drawing

### Step 6.1: Implement line Command
Add to `src/modules/graphics.js`:

```javascript
function line( screenData, options ) {
    const x1 = Math.floor( options.x1 );
    const y1 = Math.floor( options.y1 );
    const x2 = Math.floor( options.x2 );
    const y2 = Math.floor( options.y2 );
    
    const color = screenData.color;
    
    // Bresenham's line algorithm with fast path
    drawLineFast( screenData, x1, y1, x2, y2, color );
}

function drawLineFast( screenData, x1, y1, x2, y2, color ) {
    const dx = Math.abs( x2 - x1 );
    const dy = Math.abs( y2 - y1 );
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1;
    let y = y1;
    
    while( true ) {
        // Use appropriate renderer based on screen mode
        if( screenData.renderMode === "webgl2" ) {
            webglRenderer.drawPixelDirect( 
                screenData, x, y, 
                color.r, color.g, color.b, color.a 
            );
        } else {
            canvas2dRenderer.drawPixelDirect( 
                screenData, x, y, 
                color.r, color.g, color.b, color.a 
            );
        }
        
        if( x === x2 && y === y2 ) break;
        
        const e2 = 2 * err;
        if( e2 > -dy ) {
            err -= dy;
            x += sx;
        }
        if( e2 < dx ) {
            err += dx;
            y += sy;
        }
    }
}
```

### Step 6.2: Test line
```javascript
$.ready(() => {
    $.screen({ width: 320, height: 240 });
    $.setColor( 255 );
    $.line( 0, 0, 319, 239 ); // Diagonal line
});
```

## Phase 7: Additional Graphics Primitives

Implement incrementally, one at a time:

### Step 7.1: rect (filled and outlined)
- Use triangle batch for filled rectangles
- Use line batch for outlined rectangles

### Step 7.2: circle (filled and outlined)
- Midpoint circle algorithm
- Use point batch for pixels
- Use triangle batch for filled circles

### Step 7.3: ellipse
- Midpoint ellipse algorithm

### Step 7.4: arc
- Partial circle rendering

### Step 7.5: bezier
- Tessellation to line segments
- Add to line batch

## Phase 8: Image Support

### Step 8.1: Rebuild Images Module
Create new `src/modules/images.js`:

- Load images as WebGL textures
- Use textured quad batch for drawing
- Sprite sheet support with texture atlases

### Step 8.2: Implement drawImage
- Add to textured triangle batch
- Support rotation, scaling, anchors

## Phase 9: Text Rendering (Bitmap Fonts Only)

### Step 9.1: Convert Default Fonts to Bitmaps
- Take existing base32-encoded fonts
- Convert to bitmap texture atlas at init time
- Store as WebGL texture

### Step 9.2: Rebuild Font Module
- Load bitmap fonts as textures
- Character atlas mapping

### Step 9.3: Rebuild Print Module
- Render text as textured quads
- Add to textured triangle batch
- Cursor positioning, word wrap

## Phase 10: Advanced Features

### Step 10.1: get/getPixel (Synchronous)
- Implement `gl.readPixels()` from FBO
- Add console warning about blocking
- Document as slow operation

### Step 10.2: getAsync/getPixelAsync
- Asynchronous `gl.readPixels()`
- Return Promises

### Step 10.3: put Command
- Upload pixel data to texture
- Render textured quad

### Step 10.4: paint (Flood Fill)
- Add TODO comments for Web Worker integration
- Initial CPU implementation
- Plan for Worker offload in future

### Step 10.5: filterImg
- GPU post-processing shader
- Apply to FBO texture

## Phase 11: Input Systems

Rebuild incrementally:
- keyboard.js
- mouse.js
- touch.js
- gamepad.js
- press.js

(These should need minimal changes since they don't interact with rendering)

## Phase 12: Sound System

Rebuild:
- sound.js
- play.js

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

## Key Architectural Changes

### Removed Features
1. `render()` command - automatic rendering only
2. Non-pixel mode - pixel mode only
3. Canvas fonts - bitmap fonts only
4. `setPixelMode()` - always pixel mode
5. `setAutoRender()` - always auto-render
6. Pen system - simplified to direct pixel writes
7. Blend modes - simplified (may add back later)

### New Features
1. WebGL2 rendering with FBO
2. Automatic batch rendering
3. Optimized command wrappers
4. Fast path for hot operations
5. `getAsync()`/`getPixelAsync()` for non-blocking reads

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

### Phase 1: Setup and Minimal Shell
- [x] Step 1.1-1.4: Setup minimal shell - copy alpha.1 to src/, create REFACTOR-PLAN-ALPHA-2.md, strip down to core only

### Phase 2: WebGL2 Core Architecture
- [x] Step 2.1: Create WebGL Renderer Core (webgl-renderer.js) and Canvas2D Renderer (canvas2d-renderer.js)
- [x] Step 2.2: Create Simple Shaders (shaders.js) - Integrated into webgl-renderer.js
- [x] Step 2.3: Update Screen Manager for Renderer Delegation
- [x] Step 2.4: Implement Blank Screen
- [x] Step 2.5: Create Canvas2D Renderer

### Phase 3: Command System Optimization
- [x] Step 3.1: Implement Fast Path Architecture
- [x] Step 3.2: Optimize Command Wrappers
- [x] Step 3.3: Remove Pen/Blend Function Pointers

### Phase 4: Color System
- [x] Step 4.1: Rebuild Color Module
- [x] Step 4.2: Add Color to Screen Data
- [x] Step 4.3: Implement setColor Command

### Phase 5: First Drawing Command - pset ✅ COMPLETE
- [x] Step 5.1: Create Graphics Module
- [x] Step 5.2: Test pset

### Phase 6: Line Drawing
- [ ] Step 6.1: Implement line Command
- [ ] Step 6.2: Test line

### Phase 7: Additional Graphics Primitives
- [ ] Step 7.1: Implement rect (filled and outlined)
- [ ] Step 7.2: Implement circle (filled and outlined)
- [ ] Step 7.3: Implement ellipse
- [ ] Step 7.4: Implement arc
- [ ] Step 7.5: Implement bezier

### Phase 8: Image Support
- [ ] Step 8.1: Rebuild Images Module
- [ ] Step 8.2: Implement drawImage

### Phase 9: Text Rendering (Bitmap Fonts Only)
- [ ] Step 9.1: Convert Default Fonts to Bitmaps
- [ ] Step 9.2: Rebuild Font Module
- [ ] Step 9.3: Rebuild Print Module

### Phase 10: Advanced Features
- [ ] Step 10.1: Implement get/getPixel (Synchronous)
- [ ] Step 10.2: Implement getAsync/getPixelAsync
- [ ] Step 10.3: Implement put Command
- [ ] Step 10.4: Implement paint (Flood Fill)
- [ ] Step 10.5: Implement filterImg

### Phase 11: Input Systems
- [ ] Rebuild keyboard.js
- [ ] Rebuild mouse.js
- [ ] Rebuild touch.js
- [ ] Rebuild gamepad.js
- [ ] Rebuild press.js

### Phase 12: Sound System
- [ ] Rebuild sound.js
- [ ] Rebuild play.js

### Phase 13: Testing and Optimization
- [ ] Step 13.1: Run Visual Regression Tests
- [ ] Step 13.2: Performance Benchmarking
- [ ] Step 13.3: Optimize Batch Sizes

### Phase 14: Documentation
- [ ] Step 14.1: Update API Documentation
- [ ] Step 14.2: Create Migration Guide
