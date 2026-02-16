# Custom Shaders Plan

A detailed plan for creating and applying custom post-processing shaders in Pi.js. The system supports two distinct application modes: **display shaders** (post-render, canvas-only) and **FBO shaders** (in-pipeline, order-dependent, offscreen-compatible).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Summary](#architecture-summary)
3. [Shader Application Modes](#shader-application-modes)
4. [API Design](#api-design)
5. [Implementation Plan](#implementation-plan)
6. [Shader Requirements](#shader-requirements)
7. [Integration Points](#integration-points)
8. [Edge Cases & Considerations](#edge-cases--considerations)

---

## Overview

The Pi.js renderer uses a WebGL2 FBO (Framebuffer Object) as the primary render target. All drawing operations (points, images, geometry) render into the FBO. The FBO texture is then blitted to the canvas via `displayToCanvas()`, which uses a fullscreen quad and the display shader.

Custom shaders will allow users to apply post-processing effects in two ways:

| Mode | When Applied | Affects FBO? | Offscreen Support |
|------|--------------|--------------|-------------------|
| **Display Shader** | During `displayToCanvas`, before final canvas render | No | No (display path only) |
| **FBO Shader** | As a **batch operation** in draw order (runs when `flushBatches` processes it) | Yes | Yes |

**Key:** The FBO shader is a custom batch — it is queued in the draw order when `applyShader` is called. If you draw a line after calling `applyShader`, the shader runs before the line; the line draws on top of the shader result. The shader does not run again after the line.

---

## Architecture Summary

### Current Render Pipeline

```
[flushBatches] → FBO (fboTexture)
                      ↓
[displayToCanvas] → Default Framebuffer (canvas)
```

**Key components:**
- **renderer.js**: Creates FBO, buffer FBO (ping-pong), orchestrates modules
- **batches.js**: `flushBatches()` renders to FBO; `displayToCanvas()` blits FBO → canvas
- **effects.js**: Operates on FBO (e.g., `shiftImageUp` uses ping-pong blit)
- **shaders.js**: `setupDisplayShader()` creates the display pass program
- **screen-manager.js**: Manages screen lifecycle, screenData, offscreen vs onscreen

### FBO Resources (per screen)

- `screenData.FBO` / `screenData.fboTexture` — primary render target
- `screenData.bufferFBO` / `screenData.bufferFboTexture` — secondary for ping-pong operations

---

## Shader Application Modes

### Mode 1: Display Shader (Post-Canvas)

**Purpose:** Apply effects at the final display stage, after all FBO content is finalized. The effect is purely visual and does not modify the underlying FBO. Useful for:

- Color grading / LUT
- CRT/scanline effects
- Screen shake (viewport offset)
- Final gamma/contrast adjustments

**Characteristics:**
- Runs during `displayToCanvas()` before drawing the fullscreen quad
- Input: `fboTexture` (unchanged)
- Output: Default framebuffer (canvas)
- **Enforced: skipped for offscreen screens** — the system explicitly checks `isOffscreen` and does not run the display shader when true
- Order: Always last in the visual pipeline

### Mode 2: FBO Shader (Batch Operation)

**Purpose:** Apply effects that modify the FBO content. The shader is a **custom batch operation** that runs in strict draw order with other batches (points, images, geometry). Useful for:

- Blur, bloom, glow
- Distortion effects
- Palette dithering
- Effects that must be composited with later draws
- **Offscreen canvas workflows** — since the FBO is the source of truth for offscreen rendering

**Characteristics:**
- **Runs as a shader item** — when `applyShader` is called, it adds a shader item to the draw order; it does NOT flush or run immediately
- When `flushBatches` runs, it processes draw order items in sequence: draw geometry → run shader item → draw more geometry → run another shader item → …
- **Order is call order:** If you call `drawPixel`, `applyShader`, `drawLine`, the shader runs after the pixel and before the line. The line draws on top of the shader result.
- Input: Current FBO texture (at that point in the draw order)
- Output: FBO (using ping-pong with `bufferFBO` / `bufferFboTexture`)
- **Enforced: runs for offscreen screens** — no restriction; FBO is the render target regardless of display

---

## API Design

### 1. Create Custom Shader

```javascript
// Create a custom shader from fragment source only (vertex shader is built-in, not customizable)
$.createShader( fragmentSource ) → ShaderHandle

// With custom uniforms: specify names and default values for uniforms the shader expects
$.createShader( fragmentSource, { uniforms: { u_strength: 1.0, u_color: [1, 0, 0, 1] } } ) → ShaderHandle
```

**Returns:** A handle (object or number) that identifies the shader. The handle is screen-agnostic; the actual WebGL program is compiled per-screen when the shader is first applied.

**Custom uniforms (optional second parameter):**
- `uniforms` — Object mapping uniform names to default values. These are the custom variables the shader expects beyond the built-ins (`u_texture`, `u_sourceSize`, `u_outputSize`).
- When `applyShader` is called, passed values override these defaults.
- Supported value types: `number` (float), `[x, y]` (vec2), `[x, y, z]` (vec3), `[x, y, z, w]` (vec4), `[r, g, b, a]` for colors.

**Requirements (enforced at compile time on first use):**
- Fragment shader source must be valid GLSL ES 3.00
- Fragment shader must output `vec4` to `fragColor` (or `out vec4 fragColor`)

**`u_texture` requirement (documented, not validated at create time):** The shader should declare `uniform sampler2D u_texture` for the input texture. No parsing or validation at `createShader` time. The "missing" error triggers only when the shader is **about to draw**: display shader on first present, or FBO shader item on execution. Do **not** throw during `setDisplayShader` if the shader is never displayed (e.g., offscreen screen).

**Custom uniforms:** If a uniform doesn't exist in the compiled shader, it is ignored. If a provided uniform exists but the value shape is unsupported (e.g., array length 5 for vec4), ignore and warn in debug mode. In debug mode (`?webgl-debug`), warn about unknown uniforms (both defaults from `createShader` and per-call overrides in `applyShader`).

**Note:** The vertex shader is fixed and not exposed to users. It provides a fullscreen quad with `v_texCoord` passed to the fragment shader.

### 2. Apply Display Shader (Post-Canvas)

```javascript
// Set the display shader for the active screen (replaces default passthrough)
$.setDisplayShader( shaderHandle )

// Set display shader with initial uniform values (persist until updated)
$.setDisplayShader( shaderHandle, { u_strength: 0.5 } )

// Update display shader uniforms (persist across displayToCanvas calls until next update)
$.setDisplayShaderUniforms( { u_strength: 0.8 } )

// Clear back to default (clears shader AND displayShaderUniforms)
$.setDisplayShader( null )
```

**Behavior:**
- When set, `displayToCanvas()` uses this shader instead of the default display shader
- Shader receives `u_texture` bound to `fboTexture`, plus `u_sourceSize` (FBO pixel dimensions) and `u_outputSize` (canvas drawingbuffer pixel dimensions, not CSS)
- Automatically applied on every `displayToCanvas` call
- **Uniform persistence:** Custom uniforms passed to `setDisplayShader` or `setDisplayShaderUniforms` are stored and reused on every display pass until updated. No need to set them each frame.
- **Enforced offscreen rule:** Display shader is explicitly skipped for offscreen screens. The system checks `screenData.isOffscreen` and does not run the custom display shader path when true.

### 3. Apply FBO Shader (Batch Operation)

```javascript
// Queue shader to run at current point in draw order (does NOT flush)
$.applyShader( shaderHandle )

// Pass custom uniform values for this invocation (overrides defaults from createShader)
$.applyShader( shaderHandle, { u_strength: 0.5, u_color: [1, 0, 0, 1] } )
```

**Behavior:**
- **Batch-break:** `applyShader` explicitly causes a batch break. The current batch is closed (endIndex set) before the shader item is added, same as when switching batch types. Any pending geometry is finalized before the shader runs.
- **Adds a shader item to the draw order** — does NOT flush or run immediately
- When `flushBatches` eventually runs, it processes items in order: geometry batches are drawn, then when a shader item is encountered, the shader pass runs (render to bufferFBO, blit bufferFBO → FBO), then subsequent geometry batches draw on top
- Order is determined by call order: `pset` → `applyShader` → `line` means pixel, then shader, then line. The shader does NOT run again after the line.
- User can call `applyShader` multiple times; each call adds one shader item at that position in the draw order
- **Custom uniforms:** Values passed in the second argument are merged with defaults from `createShader`. If a uniform doesn't exist in the compiled shader, it is ignored. Pi.js sets `u_time` if that uniform exist in the program. Pi.js uses `u_time` for noise defined in the setNoise method.
- **Enforced offscreen support:** FBO shader runs for offscreen screens. The system does not skip or restrict `applyShader` based on screen type.

---

## Implementation Plan

### Phase 1: Shader Creation & Storage

| Task | Module | Description |
|------|--------|-------------|
| 1.1 | `shaders.js` | Add `createShader(fragSrc, options?)` — No GLSL parsing at create time; unknown uniform warnings occur after first compile for that screen; options.uniforms = default values. On first draw (display or FBO shader item): if `u_texture` location missing, throw `"Missing required uniform u_texture"`. In webgl-debug: warn on unknown uniforms and unsupported value shapes. |
| 1.2 | `screen-manager.js` | Add `customShaders` (Map) to screenData via `addScreenDataItem` |
| 1.3 | `shaders.js` | Shader handle format: `{ id, fragSrc, uniforms }` — programs created lazily per screen; `uniforms` stores default values for custom variables |
| 1.4 | `renderer.js` | Export `createShader` from renderer |

**Lazy compilation:** When a shader is first applied to a screen, compile it for that screen's GL context. Store in `screenData.customShaders[handle.id] = { program, locations }`.

### Phase 2: Display Shader Integration

| Task | Module | Description |
| 2.1 | `shaders.js` | Add `setDisplayShader(screenData, handle, uniforms?)` — stores handle in `screenData.displayShaderOverride`; when `handle` is `null`, clear both `displayShaderOverride` and `displayShaderUniforms`. Add `setDisplayShaderUniforms(screenData, uniforms)` for persistent uniform updates |
| 2.2 | `batches.js` | In `displayToCanvas()`, check `screenData.displayShaderOverride`; if set, use that program instead of `displayProgram` |
| 2.3 | `batches.js` | Ensure display shader uses same vertex layout (a_position, fullscreen quad). Set built-ins: `u_texture`, `u_sourceSize` (FBO), `u_outputSize` (canvas drawingbuffer, not CSS), `u_time` via uniform1f, `u_frame` via uniform1i if present. Throw `u_texture` missing error only when display shader is about to draw (first present), not during `setDisplayShader`. Skip entirely for offscreen. |
| 2.4 | `renderer.js` | Export `setDisplayShader`; wire to API |
| 2.5 | `renderer.js` | Cleanup: delete custom display program in `cleanup()` if set |
| 2.6 | `screen-manager.js` | Add `displayShaderUniforms` to screenData — stores persistent uniform values for display shader |

**Display shader:** Uses the same built-in vertex shader as FBO shaders (fullscreen quad, `v_texCoord`). Display uniforms persist in `screenData.displayShaderUniforms` until updated.

### Phase 3: FBO Shader as Batch Operation

| Task | Module | Description |
|------|--------|-------------|
| 3.1 | `batches.js` | Add `prepareShaderBatch(screenData, handle, uniforms)` — inserts a shader item into drawOrder (does NOT flush) |
| 3.2 | `batches.js` | Extend `drawOrder` to support shader items: `{ type: "shader", shaderHandle, uniforms }` alongside existing batch items. `uniforms` = merge of createShader defaults + applyShader overrides |
| 3.3 | `batches.js` | In `flushBatches`, when iterating drawOrder: if item is a shader item, run shader pass. Before drawing: set built-in uniforms (`u_texture`, `u_sourceSize`, `u_outputSize`, `u_time` via uniform1f, `u_frame` via uniform1i if present), then set custom uniforms from the merged object. Throw `u_texture` missing error only when executing the shader item, not earlier. Shader pass: 1. Bind `bufferFBO` as DRAW 2. Set all uniforms 3. Draw fullscreen quad 4. Blit bufferFBO (READ) → FBO (DRAW) |
| 3.4 | `batches.js` | `prepareShaderBatch` is an explicit batch-break: close current batch (set endIndex on last drawOrderItem) before adding shader item, same pattern as `prepareBatch` when batch type changes |
| 3.5 | `effects.js` | Ensure `shiftImageUp` and similar effects remain compatible — they already use buffer FBO for ping-pong; coordinate so shader item uses the same pattern |
| 3.6 | `renderer.js` | Export `prepareShaderBatch`; wire to API as `applyShader` |
| 3.7 | Resize | In `resizeScreen`, buffer FBO is already resized; no extra work |

**Draw order flow:** When `flushBatches` runs:
1. Bind FBO, set viewport
2. For each item in `drawOrder`:
   - **If batch item:** Draw that batch's geometry to FBO (as today)
   - **If shader item:** Run shader pass — render FBO texture to bufferFBO with shader, then blit bufferFBO (READ) → FBO (DRAW). FBO now contains shader result; subsequent items draw on top.
3. Reset batches and drawOrder

**Ping-pong:** Use `gl.blitFramebuffer` with READ from bufferFBO, DRAW to FBO after the shader renders to bufferFBO. Shader items currently use render-to-buffer + blit back. Future optimization: swap FBO roles instead of blitting.

### Phase 4: API Wiring & Public Exports

| Task | Module | Description |
| 4.1 | `api/postfx.js` | Add `createShader`, `setDisplayShader`, `setDisplayShaderUniforms`, `applyShader` to screen API |
| 4.2 | `index.js` | Import and expose postfx API |
| 4.3 | `docs/API.md` | Document new commands |

### Phase 5: Cleanup & Lifecycle

| Task | Module | Description |
| 5.1 | `renderer.js` `cleanup()` | Delete custom shader programs stored in screenData |
| 5.2 | `batches.js` `cleanup()` | Clear `displayShaderOverride` and `displayShaderUniforms` |
| 5.3 | `resizeScreen` | Verify FBO/bufferFBO resize preserves shader behavior (no changes needed if using existing buffers) |

---

## Shader Requirements

### Fragment Shader Only (Vertex Not Customizable)

Users provide **only** a fragment shader. The vertex shader is built-in and not exposed.

**Fragment shader (user-provided):**
- Should declare `uniform sampler2D u_texture` (input texture). If missing at first use, throws `"Missing required uniform u_texture"`.
- Receives `in vec2 v_texCoord` from the built-in vertex shader. **Coordinate convention:** Verify at implementation to match existing display behavior. See Built-in Vertex Shader section.
- Optional: `uniform vec2 u_sourceSize`, `uniform vec2 u_outputSize` — auto-provided (pixel dimensions as floats)
- **Custom uniforms:** Declare any additional uniforms in the shader. Specify defaults in `createShader`, pass values in `applyShader`. Unknown uniforms are ignored; debug mode warns.
- Do not attempt to validate output naming; just rely on shader compile errors if they omit an output (e.g., `out vec4 fragColor`).

### Built-in Vertex Shader (Internal, Not Customizable)

The system uses a fixed vertex shader for all custom shaders (display and FBO). It matches `display.vert`:

```glsl
#version 300 es
in vec2 a_position;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = (a_position + 1.0) * 0.5;
}
```

**Coordinate convention (verify at implementation):** The vertex math yields `v_texCoord` (0,0) at bottom-left, (1,1) at top-right in clip space. **Verify** the existing `display.frag` does not flip Y in the fragment shader. If the default display shader already flips Y, document (0,0) as top-left instead and implement custom shaders to match the existing behavior. Both display and FBO shader paths must use the same convention.

### Uniforms

**Built-in (auto-provided by system):**

| Uniform | Type | Description |
|---------|------|-------------|
| `u_texture` | sampler2D | Input texture (FBO or display source) |
| `u_sourceSize` | vec2 | Pixel dimensions of the input texture, as floats. **FBO shader:** `(screenData.width, screenData.height)`. **Display shader:** FBO dimensions. |
| `u_outputSize` | vec2 | Pixel dimensions of the render target, as floats. **FBO shader:** same as `u_sourceSize`. **Display shader:** canvas drawingbuffer `(width, height)`, not CSS size. |
| `u_time` | float | `performance.now() / 1000` — set if the uniform exists in the program |
| `u_frame` | int | Frame count — set via `uniform1i` if the uniform exists in the program |

**Custom (specified in createShader, passed at apply/set time):**

| How | Description |
|-----|-------------|
| `createShader(frag, { uniforms: { u_strength: 1.0 } })` | Declare uniform name and default value |
| `applyShader(handle, { u_strength: 0.5 })` | Override with value for this FBO shader invocation |
| `setDisplayShader(handle, { u_strength: 0.5 })` | Initial uniforms for display shader (persist) |
| `setDisplayShaderUniforms({ u_strength: 0.8 })` | Update display shader uniforms (persist until next update) |

Supported custom uniform types: `float`, `vec2`, `vec3`, `vec4`. Values: number, `[x,y]`, `[x,y,z]`, `[x,y,z,w]`.

---

## Integration Points

### Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/shaders.js` | `createShader(fragSrc)`, `setDisplayShader`, lazy program compilation with built-in vertex |
| `src/renderer/batches.js` | `displayToCanvas` branch for custom display shader; `prepareShaderBatch` + draw order handling for shader items |
| `src/renderer/renderer.js` | Export new functions, cleanup custom programs |
| `src/renderer/effects.js` | No changes; shader item uses bufferFBO same as `shiftImageUp` |
| `src/core/screen-manager.js` | Add `displayShaderOverride`, `customShaders` to screenData |
| `src/api/postfx.js` | Expose `createShader`, `setDisplayShader`, `setDisplayShaderUniforms`, `applyShader` |
| `src/index.js` | Import postfx module |
| `docs/API.md` | Document new API |

### Execution Order (FBO Shader as Batch)

User code might look like:

```javascript
$.screen( "320x200" );
const blurShader = $.createShader( blurFragShader, { uniforms: { u_radius: 3, u_strength: 1.0 } } );
$.pset( 10, 10 );
$.applyShader( blurShader, { u_radius: 5 } );   // queues shader item, u_strength uses default 1.0
$.line( 0, 0, 50, 50 );
// ... automatic render triggers flushBatches
```

When `flushBatches` runs, the draw order is processed in sequence:
1. Draw pixel (10, 10) to FBO
2. Run shader item — FBO content (the pixel) is processed by shader, result written back to FBO
3. Draw line on top of shader result

**The shader does NOT run after the line.** It runs exactly once, at its position in the draw order.

---

## Edge Cases & Considerations

### Offscreen Screens (Enforced Behavior)

- **Display shader:** The system **enforces** that display shaders are skipped for offscreen screens. When `screenData.isOffscreen` is true, the custom display shader path is not run; the default passthrough or no display occurs. `setDisplayShader` and `setDisplayShaderUniforms` have no effect on offscreen screens — this is explicit behavior, not an assumption.
- **FBO shader:** The system **enforces** that FBO shaders run for offscreen screens. `applyShader` operates on the FBO regardless of `isOffscreen`; no special handling or restriction.

### Multiple Shaders

- User can register multiple shaders via `createShader`. Each returns a unique handle.
- `applyShader` can be called multiple times; each call adds a shader item at that position in the draw order.
- `setDisplayShader` replaces any previous display shader; only one active at a time.

### Performance

- Lazy compilation: shaders compile on first use per screen.
- Cache compiled programs per screen / WebGL context (not necessarily by screen id — offscreen screens may share a context).
- FBO shader adds one fullscreen pass per shader item in the draw order (same as one per `applyShader` call).

### Context Loss

- On `webglcontextlost`, custom shader programs are invalid.
- On `webglcontextrestored`, recompile custom shaders when they are next used (lazy recompile).

### Resize

- FBO and bufferFBO are resized in `resizeScreen`. No extra work for custom shaders.

### Cleanup

- When screen is removed, delete all custom shader programs for that screen.
- Global shader handles (from `createShader`) can persist; they are just descriptors. The actual WebGL programs are per-screen.

---

## Summary

| API | Purpose |
|-----|---------|
| `createShader(frag, { uniforms? })` | Create shader from fragment source; optionally declare custom uniforms with defaults |
| `setDisplayShader(handle, uniforms?)` | Use custom shader during displayToCanvas; optional initial uniforms (persist) |
| `setDisplayShaderUniforms(uniforms)` | Update display shader uniforms; values persist across displayToCanvas calls |
| `applyShader(handle, uniforms?)` | **Batch-break** + queue shader; pass custom uniform values (merged with createShader defaults) |

The two modes serve different use cases: display shaders for final-screen effects that don't affect the FBO; FBO shaders are **batch operations** that run in call order with other draws — if you draw a line after applying a shader, the line appears on top of the shader result.
