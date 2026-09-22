# Pi.js 2.0 Update

Pi.js 2.0 is a major modernization of the library: a modular architecture, WebGL 2-only rendering,
and a faster build. This guide covers the new features and breaking changes from v1.2.4 to
v2.0.0.

## Architectural changes

### WebGL 2 rendering

Rendering moved from Canvas2D `ImageData` to WebGL 2.

- Drawing is GPU-accelerated.
- Draw operations are batched automatically.
- Offscreen rendering uses framebuffer objects.
- There is no Canvas2D fallback. WebGL 2 is required.

### Modular architecture

The monolithic codebase was replaced with ES modules.

- Features live in dedicated modules.
- The renderer is separate from the public API.
- Source is organized under `core/`, `renderer/`, `api/`, and `text/`.

### Build system

Builds use esbuild.

- Outputs are ESM and IIFE, each minified and unminified, with source maps.
- ESM builds can be tree-shaken.
- The runtime has no dependencies.

### Modern JavaScript

The source uses ES2020 features, JSDoc, and consistent error handling.

## Additions

### Plugin system

`registerPlugin()` registers an extension. The initializer receives a `pluginApi` object:

- `pluginApi.addCommand()` registers a command.
- `pluginApi.addScreenDataItem()` adds a screen data property.
- `pluginApi.addScreenDataItemGetter()` adds a computed screen data property.
- `pluginApi.addScreenInitFunction()` runs when a screen is created.
- `pluginApi.addScreenCleanupFunction()` runs when a screen is destroyed.
- `pluginApi.getScreenData()` reads one screen.
- `pluginApi.getAllScreensData()` reads every screen.
- `pluginApi.getApi()` returns the main API.
- `pluginApi.utils` exposes utility functions.
- `pluginApi.wait()` waits for an async operation.
- `pluginApi.done()` signals that an async operation finished.
- `pluginApi.registerClearEvents()` registers an event-clearing handler.

Plugins can declare dependencies. `getPlugins()` lists registered plugins. `clearEvents()`
clears plugin events.

### Output formats

- ESM: `pi.esm.min.js` for `import`.
- IIFE: `pi.js` and `pi.min.js` for a `<script>` tag.

### Batch rendering

Draw operations are grouped into point, image, geometry, and line batches, then flushed to the
GPU.

### Texture management

Textures are cached and released automatically. Sources can be image elements, canvas elements,
or URL strings.

## Performance

- Drawing runs on WebGL 2.
- Multiple operations can share one GPU submission.
- Commands close over screen data so hot paths stay monomorphic.
- esbuild builds are about 100 times faster than the v1.2.4 toolchain.

## Compatibility changes

These v1.2.4 features are gone:

- Canvas2D rendering. WebGL 2 is the only backend.
- `render()` and `setAutoRender()`. Presentation is automatic.
- `setPixelMode()`. Drawing is always pixel-perfect.
- Canvas font rendering. Text uses bitmap fonts.
- The pen system. Drawing writes pixels directly.
- Some blend modes. Blending is GPU-based.

Plugins register through `registerPlugin()` and receive `pluginApi` instead of reaching into
internal APIs. Dependencies initialize in order.

## API compatibility

Most v1.2.4 commands keep the same role:

- Graphics: `pset()`, `line()`, `rect()`, `circle()`, `ellipse()`, `arc()`, `bezier()`
- Images: `loadImage()`, `drawImage()`
- Color: `setPalColor()`, `findColor()`, and related commands
- Screen: `screen()`, `cls()`, and related commands
- Text: `print()`, `setFont()`, and related commands
- Input: `key()`, `mouse()`, `touch()`, `gamepad()`, and related commands

Remove `render()`, `setPixelMode()`, and `setAutoRender()`. Some command parameters changed;
see the [API reference](API.md) for current signatures.

## Migration

1. Remove `render()`, `setPixelMode()`, and `setAutoRender()` calls.
2. Run the existing graphics paths and compare the result. Most programs need no other edits.

## Technical details

### Build

- Tool: esbuild, replacing the legacy minifier.
- Formats: ESM and IIFE, with source maps.
- Tree-shaking: ESM only.
- Runtime dependencies: none.
- v2.0 development dependencies: esbuild, Playwright, a TOML parser, and pngjs.

### Modules

- `core/` holds commands, the screen manager, utilities, and plugins.
- `renderer/` holds the WebGL 2 renderer, batches, shaders, textures, and draw code.
- `api/` holds graphics, images, colors, pixels, paint, and blends.
- `text/` holds fonts and printing.

### Rendering

Pi.js creates a WebGL 2 context and an offscreen framebuffer, draws with GLSL shaders, batches
GPU work, and presents the framebuffer to the canvas.

## Summary

Pi.js 2.0 brings WebGL 2 rendering, ESM and IIFE builds, a modular source layout, a plugin
system, and no runtime dependencies. The public API stays close to v1.2.4. Migration is mainly
removing the commands listed above.

API documentation: https://pijs.org
