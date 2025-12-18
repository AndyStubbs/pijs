# Pi.js - A JavaScript Library for Retro-Style Games and Demos

Welcome to **Pi.js**, a JavaScript library designed to simplify the creation of retro-style games and demos. Inspired by the programming language **QBasic**, Pi.js offers a beginner-friendly approach to building 2D games on modern web browsers.

**Official Website:** https://pijs.org

---

## Overview

Pi.js is named after the mathematical constant **π (pi)**, which plays a key role in many graphics and game development functions. It provides an all-in-one solution for handling graphics, sound, and user input, making it an excellent choice for creating interactive and nostalgic game experiences.

**Quick Tip:** The library is accessible via `$` (preferred, for brevity) or `pi` (for clarity). Examples use `$`.

Built on top of **WebGL 2**, Pi.js features:

- **Pixel-Perfect Graphics** - Retro-style graphics with GPU acceleration
- **Primitive Drawing** - Lines, circles, rectangles - old-school style
- **Print Command** - A modern library with classic BASIC print functionality
- **Beginner-Friendly** - Simple, intuitive API inspired by QBasic
- **Modern 2D Games** - Capable of both retro and contemporary game development

---

## Features

### Graphics
- 2D shape drawing (lines, circles, rectangles, ellipses, bezier curves)
- Pixel-perfect rendering with WebGL 2 acceleration
- Sprite and image support with transformations
- Bitmap fonts and text rendering
- Paint/fill operations
- Path drawing

### Sound
- WebAudio-based sound system
- Load and play sound effects
- Generate sounds programmatically
- PLAY command (QBasic-style music notation)
- Volume control

### Input Handling
- Keyboard input with key state tracking
- Mouse input with position and button states
- Touch screen support (multi-touch)
- Gamepad/controller support

### Advanced Features
- Multiple screen/canvas support
- Palette system with color management
- Table formatting
- Blend modes and pen effects

---

## Version Information

### Current Version
- **Latest:** v2.0.0 (WebGL 2 only, browser-only library)
- **Legacy:** v1.2.4 (Canvas2D support, available on `v1.2.x` branch)

### Version 2.0.0 Highlights

Version 2.0.0 is a major release featuring:

- **WebGL 2 Only** - GPU-accelerated rendering for significantly better performance
- **Modern Architecture** - Complete refactor with modular ES6 structure
- **Plugin System** - New official plugin registration system
- **Zero Dependencies** - No runtime dependencies required
- **Faster Builds** - Modern build system using esbuild

### Important Notes for Upgrading

**Breaking Changes:** Version 2.0.0 includes significant breaking changes. If you're upgrading from v1.2.4, please:
- Review the [Upgrade Guide](https://pijs.org/pi-js-v2-upgrade/) for detailed migration information
- Check [pijs.org/docs/api](https://pijs.org/docs/api) for API differences
- Note that Canvas2D mode has been removed - WebGL 2 is now required

**Canvas2D Support:** If you need Canvas2D rendering, continue using v1.2.4, which is available in the [Canvas2d](https://github.com/AndyStubbs/pijs-canvas2d) repo and remains functional for Canvas2D use cases.

---

## Getting Started

### For Users

Visit https://pijs.org for complete documentation, tutorials, and examples of using Pi.js in your projects.

### For Contributors

The following instructions are for working on the Pi.js library itself.

---

## Development Setup

### Prerequisites

- **Node.js** v18 or later
- **npm** (Node Package Manager)
- Code editor (Visual Studio Code or Cursor recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/AndyStubbs/pijs.git
cd pijs

# Install dependencies
npm install
```

### Build

```bash
# Build all formats (ESM, IIFE)
npm run build
```

Output files in `build/dist/`:
- `pi.js` - IIFE format, unminified (for debugging)
- `pi.min.js` - IIFE format, minified (for <script> tags)
- `pi.esm.min.js` - ES Module format (for import statements)

**Note:** Pi.js is a browser-only library. CommonJS format is not supported in v2.0.0.

### Development Server

```bash
# Start local dev server
npm run server
```

Opens server at `http://localhost:8080/`

### Testing

```bash
# Run tests (to be implemented)
npm test
```

---

## Coding Conventions

This project follows strict coding conventions to maintain consistency. Key rules:

- **Tabs** for indentation (not spaces)
- **Double quotes** for strings
- **Backticks** only for template literals
- **Spaces inside parentheses**: `func( arg )` not `func(arg)`
- **No space before control parens**: `if(` not `if (`
- **Quote all object properties**: `{ "key": "value" }`
- **Prefer explicit if/else over ternary operators** - use explicit if/else for readability
- **JSDoc comments** required for all files
- **Line limit** of 100 characters

See `.cursorrules` for complete details.

---

## API Usage (v2.0)

### Basic Example (Browser with script tag)

```html
<script src="build/dist/pi.min.js"></script>
<script>

	// Create a screen (using $ alias - preferred)
	const screen = $.screen( "myCanvas", 800, 600 );

	// Draw a line
	$.line( 0, 0, 100, 100 );

	// Draw a circle
	$.circle( 400, 300, 50 );

	// Or use pi if you prefer
	pi.line( 100, 100, 200, 200 );
</script>
```

### Using ES Modules

```javascript
import $ from "./build/dist/pi.esm.min.js";

const screen = $.screen( "myCanvas", 800, 600 );
$.line( 0, 0, 100, 100 );
```

### Dual Parameter Styles

Pi.js supports both positional and object-based parameters:

```javascript
// Positional parameters
$.line( 0, 0, 100, 100 );

// Object parameters
$.line( { "x1": 0, "y1": 0, "x2": 100, "y2": 100 } );
```

### Plugin Support

Pi.js v2.0 features a new official plugin system for extending functionality:

```javascript
// Example: Creating a particle system plugin
pi.registerPlugin( "particleSystem", function( pluginApi ) {
	// Register a new command
	pluginApi.addCommand( "particle", function( screenData, args ) {
		const x = args[ 0 ];
		const y = args[ 1 ];
		const color = args[ 2 ];

		// Your particle logic here...
	}, [ "x", "y", "color" ] );

	// Now users can call with preferred $ alias:
	$.particle( 100, 100, "#FF0000" );
} );
```

**Plugin API Methods:**
- `pluginApi.addCommand()` - Register new commands
- `pluginApi.addScreenDataItem()` - Add custom screen data properties
- `pluginApi.addScreenDataItemGetter()` - Add computed screen data properties
- `pluginApi.addScreenInitFunction()` - Run code when screens are created
- `pluginApi.addScreenCleanupFunction()` - Run code when screens are destroyed
- `pluginApi.getScreenData()` - Access screen data
- `pluginApi.getAllScreensData()` - Access all screens data
- `pluginApi.getApi()` - Access the main Pi.js API
- `pluginApi.utils` - Access utility functions

**Alias Note:** 
- `$` and `pi` both reference the same object
- Use `$` for brevity (preferred) or `pi` for clarity
- `$` is only set if not already defined (won't conflict with jQuery)
- If `$` is already taken, use `pi` instead

For detailed plugin documentation, see [pijs.org/docs/api](https://pijs.org/docs/api).

---

## Contributing

We welcome contributions! To contribute:

1. **Read** `.cursorrules` for coding standards
2. **Fork** the repository
3. **Create** a feature branch
4. **Follow** the coding conventions
5. **Test** your changes
6. **Submit** a pull request

### Areas Needing Help

See `TODO.txt` for the current know issues.  Or search code base for "TODO" comments.

---

## Dependencies

### Production
None! Pi.js has zero runtime dependencies, just a modern web browser.

### Development

Minimal dev dependencies:
- `esbuild` - Fast bundler and minifier (zero transitive deps!)
- `@playwright/test` - Modern testing framework
- `@iarna/toml` - TOML config parser
- `pngjs` - PNG image comparison for tests

**Total:** 4 dev dependencies (down from 6 in v1.2.4)

---

## Build System

### Modern Build with esbuild

The build system using esbuild provides:

- **faster** than legacy build tools
- **Multiple formats** in one build (ESM, IIFE)
- **Source maps** for debugging
- **Tree-shaking** for smaller bundles
- **Modern JS** support (ES2020+)

### Build Configuration

Build is configured via `scripts/build.js`. Customization options:

- Output formats
- Minification settings
- Source map generation
- Banner text
- Target JavaScript version

---

## Testing

### Visual Regression Tests

Located in `test/tests/`, these tests use screenshot comparison to ensure pixel-perfect rendering.

### Unit Tests (Maybe someday...)

Will be located in `test/unit/` for testing individual modules.

### Running Tests

```bash
npm test
```

---

## License

Apache License 2.0 - See `LICENSE` file for details.

Copyright Andy Stubbs

---

## Links

- **Website:** https://pijs.org
- **Repository:** https://github.com/AndyStubbs/pijs
- **Issues:** https://github.com/AndyStubbs/pijs/issues

---

## Acknowledgments

Inspired by QBasic and the retro programming community. Built with modern web technologies to bring classic programming experiences to the browser.
