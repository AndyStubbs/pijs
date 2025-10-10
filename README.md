# Pi.js - A JavaScript Library for Retro-Style Games and Demos

Welcome to **Pi.js**, a JavaScript library designed to simplify the creation of retro-style games and demos. Inspired by the programming language **QBasic**, Pi.js offers a beginner-friendly approach to building 2D games on modern web browsers.

**Official Website:** https://pijs.org

---

## Overview

Pi.js is named after the mathematical constant **π (pi)**, which plays a key role in many graphics and game development functions. It provides an all-in-one solution for handling graphics, sound, and user input, making it an excellent choice for creating interactive and nostalgic game experiences.

**Quick Tip:** The library is accessible via `$` (preferred, for brevity) or `pi` (for clarity). Examples use `$`.

Built on top of the **HTML5 Canvas API**, Pi.js features:

- **Pixel-Perfect Graphics** - Retro-style graphics without anti-aliasing
- **Primitive Drawing** - Lines, circles, rectangles - old-school style
- **Print Command** - A modern library with classic BASIC print functionality
- **Beginner-Friendly** - Simple, intuitive API inspired by QBasic
- **Modern 2D Games** - Capable of both retro and contemporary game development

---

## Features

### Graphics
- 2D shape drawing (lines, circles, rectangles, ellipses, bezier curves)
- Pixel-perfect rendering mode (manual pixel manipulation)
- Anti-aliased mode for smooth graphics
- Sprite and image support with transformations
- Custom fonts and text rendering
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

## 🚧 Project Status: v2.0 Refactor in Progress

Pi.js is currently undergoing a major modernization refactor. See `REFACTOR-PLAN.md` for details.

### Current Version
- **Stable:** v1.2.4 (available on `v1.2.x` branch)
- **In Development:** v2.0.0 (main branch)

### What's New in v2.0

#### Completed ✅
- Modern build system using esbuild (100x faster builds)
- ES2020+ JavaScript support (const/let, arrow functions, etc.)
- Minimal dependencies (reduced from 6 to 4 packages)
- Modular architecture with clean separation of concerns
- Improved code quality with comprehensive JSDoc
- Multiple output formats (ESM, CJS, IIFE)

#### In Progress 🔄
- Porting all 265+ API methods to new architecture
- Maintaining 100% API compatibility
- Pixel-mode implementation for retro graphics
- Full test coverage

#### Legacy Code
The v1.2.4 codebase is preserved in `.legacy/src/` for reference during refactor.

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
# Build all formats (ESM, CJS, IIFE)
npm run build
```

Output files in `build/dist/`:
- `pi.js` - IIFE format, unminified (for debugging)
- `pi.min.js` - IIFE format, minified (for <script> tags)
- `pi.esm.min.js` - ES Module format (for import statements)
- `pi.cjs.min.js` - CommonJS format (for Node.js)

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

## Project Structure

```
pijs/
├── .cursorrules              # Coding conventions
├── .legacy/                  # v1.2.4 legacy code (reference only)
│   └── src/                  # Original source files
├── src/                      # v2.0 refactored source
│   ├── core/                 # Core systems
│   │   ├── pi-data.js        # Global data storage
│   │   ├── command-system.js # Command registration
│   │   ├── errors.js         # Error handling
│   │   └── ...
│   ├── modules/              # Feature modules
│   │   ├── utils.js          # Utilities ✅
│   │   ├── screen.js         # Screen management
│   │   ├── graphics-pixel.js # Pixel-mode drawing
│   │   ├── graphics-aa.js    # Anti-aliased drawing
│   │   ├── input.js          # Input handling
│   │   └── ...
│   └── index.js              # Main entry point
├── scripts/
│   └── build.js              # esbuild build script
├── build/
│   └── dist/                 # Build outputs
├── test/                     # Test files
├── docs/                     # Documentation
├── package.json              # Dependencies and scripts
├── README.md                 # This file
└── REFACTOR-PLAN.md          # Detailed refactor plan
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
- **No ternary operators** - use explicit if/else
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

### Pixel Mode vs Anti-Aliased

```javascript
// Pixel-perfect mode (default) - no anti-aliasing
$.set( { "pixelMode": true } );
$.circle( 400, 300, 50 ); // Pixel-perfect circle

// Anti-aliased mode - smooth graphics
$.set( { "pixelMode": false } );
$.circle( 400, 300, 50 ); // Smooth circle
```

### Plugin Support

Pi.js v2.0 exposes an internal API (`$._` or `pi._`) for creating plugins and extensions:

```javascript
// Example: Creating a particle system plugin
( function() {
  "use strict";
  
  // Register a new command using pi._ (both $ and pi reference same object)
  pi._.addCommand( "particle", function( screenData, args ) {
    const x = args[ 0 ];
    const y = args[ 1 ];
    const color = args[ 2 ];
    // Your particle logic here...
  }, false, true, [ "x", "y", "color" ] );
  
  // Now users can call with preferred $ alias:
  $.particle( 100, 100, "#FF0000" );
} )();
```

**Plugin API:**
- `pi._.addCommand()` - Register single-implementation commands
- `pi._.addCommands()` - Register dual pixel/anti-aliased implementations
- `pi._.addSetting()` - Register settings
- `pi._.addPen()` - Add custom pen modes
- `pi._.addBlendCommand()` - Add blend operations
- `pi._.data` - Access internal data store

**Alias Note:** 
- `$` and `pi` both reference the same object
- Use `$` for brevity (preferred) or `pi` for clarity
- `$` is only set if not already defined (won't conflict with jQuery)
- If `$` is already taken, use `pi` instead

**v2.0 Change:** In v1.x, `pi._` was deleted after initialization to hide internal APIs. In v2.0, we're **keeping it exposed** to enable extensibility and community plugins.

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

See `REFACTOR-PLAN.md` for the current refactor progress. Major areas:

- Porting legacy modules to new architecture
- Writing unit tests
- Migrating visual tests to Playwright
- Documentation and examples

---

## Dependencies

### Production
None! Pi.js has zero runtime dependencies.

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

The new build system using esbuild provides:

- **~100x faster** than uglify-js
- **Multiple formats** in one build (ESM, CJS, IIFE)
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

### Unit Tests (Coming Soon)

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

---

**Note:** This project is actively being refactored. See `REFACTOR-PLAN.md` for detailed refactor progress and plans.
