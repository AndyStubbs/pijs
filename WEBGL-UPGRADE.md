# WebGL Retro Graphics Library Conversion Plan

## Goal
Convert an existing 2D pixel-based graphics library to use WebGL2 to improve performance and enable
advanced effects. This plan targets optimal performance on low-end budget PCs by balancing CPU, GPU,
and Web Worker responsibilities, with controlled pixel-level access.

## Core Architectural Decisions

1.  **WebGL2 First, WebGL1 Fallback, 2D Canvas Fallback:**
    *   **Priority:** Implement rendering using WebGL2 for modern features and peak performance.
    *   **Fallback 1:** If WebGL2 is unavailable, attempt WebGL1.
    *   **Fallback 2:** As a last resort, revert to existing CPU-driven 2D Canvas / `putImageData`.
    *   **Compatibility:** This ensures max reach for low-end PCs where WebGL support varies.

2.  **Implicit Immediate Mode Rendering to WebGL Framebuffer Object (FBO):**
    *   All drawing implicitly targets a single **offscreen WebGL FBO (`screenFBO`)**.
        This FBO acts as your persistent "video memory" in GPU memory.
    *   **Pixel-Perfect Output:** `screenFBO`'s texture will display with `gl.NEAREST`
        filtering, ensuring sharp, retro pixel-perfect look without anti-aliasing.
    *   **Automatic Display Update:** Any drawing command (or first in a batch)
        triggers a microtask (or `requestAnimationFrame`) to:
        *   Execute `flushFboBatches()` (render accumulated WebGL batches to `screenFBO`).
        *   Execute `displayFboToCanvas()` (draw `screenFBO` to visible HTML `<canvas>`).
    *   **No Explicit `render()` Function:** The `$.render()` function is **removed**.
        Rendering is automatic, simplifying animation loops and removing bottlenecks.

3.  **On-Demand Blocking Synchronous `get`/`getPixel`:**
    *   **No Persistent CPU Buffer:** The main thread will **NOT** maintain a
        `Uint8Array` buffer for `get`/`getPixel` that updates with every draw.
        This dramatically simplifies the pipeline and removes CPU overhead.
    *   **`get()` / `getPixel()` Behavior:** When called:
        *   It will **synchronously perform `gl.readPixels()` from the `screenFBO`**.
        *   This operation will **block the main thread** (5-20ms+ depending on hardware).
        *   **Intended Use:** For one-off tasks (eyedropper, debugging), *not* animation loops.
        *   **Warnings & Documentation:** Library warns via `console.warn()` if called frequently.
            Documentation explicitly highlights blocking, slow nature.

4.  **Asynchronous `getAsync`/`getPixelAsync` (Recommended for Performance):**
    *   New methods (`$.getPixelAsync`, `$.getAsync`) returning `Promises`.
    *   These perform `gl.readPixels()` asynchronously, preventing main thread blocking.
    *   **Preferred Use:** For animation loops or frequent pixel data reads where responsiveness is 
	key.

5.  **Strategic Web Worker Offloading for CPU-Intensive Tasks:**
    *   A Web Worker offloads truly CPU-intensive, blocking tasks from the main thread.
    *   Worker maintains its *own copy* of a `workerScreenBuffer` (`Uint8Array`) for its
        internal calculations (e.g., for `paint` or custom procedural generation) if needed.

6.  **Exclusive Bitmap Font Support:**
    *   The library will **not** include native browser Rich Text rendering.
    *   **`print` Method:** Renders text using pre-rendered bitmap fonts (character atlases)
        as `gl.TRIANGLES` (textured quads) to the `screenFBO`.
    *   **Rationale:** Aligns with "pixel-perfect retro" aesthetic, simplifies architecture
        by removing all `CanvasRenderingContext2D` dependencies, and provides performant
        text rendering for retro games in WebGL. Rich Text can be a separate plugin.

7.  **No "Non-Pixel Mode" (Native 2D Context Support):**
    *   The library will **not** support switching to a native 2D Canvas Context rendering mode.
        Entire library focuses on its WebGL pixel-mode capabilities.
        Simplifies architecture, removes complexity, aligns with core retro goal.

## Detailed Command Implementation & Division of Labor

### A. Main Thread Operations

*   **API Call Handling:** All user API calls (e.g., `$.pset`, `$.line`) initiated on main thread.
*   **WebGL Batch Data Preparation:** For primitives below, CPU work (pixel coords, vertices, UVs)
    and adding to WebGL batches (`lineBatch`, `solidShapeBatch`, `texturedQuadBatch`) happens
    directly on the **main thread**. This leverages existing optimized JS code, avoiding 
	`postMessage` overhead for common operations.
    *   `pset` (setPixel): Bresenham's (single pixel) to `lineBatch` (`gl.POINTS`).
    *   `line`: Bresenham's for all pixels to `lineBatch` (`gl.POINTS`).
    *   `rect` (filled/stroked): Geometric calculations to `solidShapeBatch` (`gl.TRIANGLES`)
        or `lineBatch` (`gl.POINTS`).
    *   `circle` (filled/stroked): Tessellation to `solidShapeBatch` (`gl.TRIANGLES`)
        or `lineBatch` (`gl.POINTS`).
    *   `ellipse` (filled/stroked): Tessellation to `solidShapeBatch` (`gl.TRIANGLES`)
        or `lineBatch` (`gl.POINTS`).
    *   `drawImage`: Vertex and UV data to `texturedQuadBatch` (`gl.TRIANGLES`).
        Image pixel data (`imageObject.cpuPixels`, if cached from loading) can be passed
        to Worker for `paint` operations if needed.
    *   `drawSprite`: Vertex and UV data to `texturedQuadBatch` (`gl.TRIANGLES`).
    *   `bezier` (tessellation for WebGL batch): Generate `gl.TRIANGLES` for WebGL batch.
    *   `print`: (Bitmap Fonts Only) Generates textured character quads, adds to 
	`texturedQuadBatch`.
*   **Automatic Render Trigger:** After adding data to any WebGL batch,
    `_queueAutomaticRender()` ensures `flushFboBatches()` and `displayFboToCanvas()`
    run efficiently at end of current event loop cycle.
*   **`get` / `getPixel` (Synchronous - Blocking):**
    *   Directly calls `gl.readPixels()` from `screenFBO` into a temporary `Uint8Array`.
    *   Returns pixel data immediately. **Critical Note:** This operation blocks the main thread.
*   **`getAsync` / `getPixelAsync` (Asynchronous - Non-Blocking):**
    *   Returns a `Promise`. Internally queues `gl.readPixels()` to run asynchronously.
*   **`filterImg`:** Pure GPU post-processing effect. Main thread dispatches filter shader.
    `get`/`getPixel` will reflect its output (via `gl.readPixels()`).

### B. Web Worker Operations

*   **`paint` (Flood Fill) - MANDATORY Offload:**
    *   **Main Thread:** Sends `paint` command and copy of screen data (from `get()` or `getAsync()`
	result) to the Worker.
    *   **Worker:** Performs flood fill on its `workerScreenBuffer`. Sends back modified pixel data
        (as `gl.POINTS` data) to main thread.
    *   **Main Thread:** Receives data, adds `gl.POINTS` to `lineBatch` for WebGL rendering.
*   **`bezier` (CPU-Side Rasterization for `workerScreenBuffer`):** If CPU-side pixel generation
    for Bezier curves (for internal Worker uses like `paint`) is complex, Worker handles this.
*   **Complex Procedural Generation:** Any future computationally heavy pixel-level effects
    not GPU-centric offloaded here.

## Performance Considerations & Trade-offs

*   **Peak WebGL Rendering Performance:** Removing `gl.readPixels()` from the automatic
    rendering loop ensures maximum FPS for animation on all hardware. GPU renders primitives 
	extremely fast.
*   **Main Thread Responsiveness:** Main thread remains free during heavy drawing,
    ensuring smooth user experience even on low-end CPUs.
*   **`get`/`getPixel` Latency:** Synchronous `get`/`getPixel` will block (5-20ms+),
    but on-demand nature means hit occurs only when explicitly requested.
    Asynchronous versions (`getAsync`/`getPixelAsync`) are for high-performance contexts.
*   **Low-End PC Optimization:** Architecture maximizes parallelism (CPU cores + GPU) and
    leverages iGPU for graphics. Worker is critical for offloading CPU-bound tasks,
    preventing budget CPU from being swamped.

This plan provides a robust, high-performance, and API-compliant solution, thoughtfully designed to
meet challenges of retro emulation on modern web platforms and low-end hardware, while focusing
sharply on the core "pixel-perfect retro" aesthetic.
