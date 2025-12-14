# Pi.js

A JavaScript library for retro-style 2D games and demos. Inspired by QBasic, Pi.js provides a beginner-friendly API for graphics, sound, and input handling on modern web browsers.

**Official Website:** https://pijs.org

---

## Installation

```bash
npm install pijs
```

---

## Quick Start

### ES Modules (Recommended)

```javascript
import $ from "pijs";

// Create a screen
const screen = $.screen( "myCanvas", 800, 600 );

// Draw a line
$.line( 0, 0, 100, 100 );

// Draw a circle
$.circle( 400, 300, 50 );
```

### Browser (Script Tag)

```html
<script src="node_modules/pijs/dist/pi.js"></script>
<script>
  const screen = $.screen( "myCanvas", 800, 600 );
  $.line( 0, 0, 100, 100 );
</script>
```

---

## What's New in v2.0.0

- **WebGL2 Rendering** - GPU-accelerated graphics for significantly better performance
- **Modern Build System** - Multiple output formats (ESM, IIFE) with esbuild
- **Plugin System** - Official plugin API for extending functionality
- **Zero Runtime Dependencies** - Lightweight and fast
- **TypeScript Support** - Full type definitions included
- **ES2020+ JavaScript** - Modern syntax support

---

## Package Exports

This package provides multiple entry points:

### Main Library
- **Default:** `import $ from "pijs"` - Full library with all features
- **Lite Version:** `import $ from "pijs/lite"` - Smaller bundle without some features

### Plugins
- `pijs/plugins/gamepad` - Gamepad/controller support
- `pijs/plugins/keyboard` - Keyboard input handling
- `pijs/plugins/pointer` - Mouse and touch input
- `pijs/plugins/sound` - Sound and audio functionality

---

## Usage Examples

### Dual Parameter Styles

Pi.js supports both positional and object-based parameters:

```javascript
// Positional parameters
$.line( 0, 0, 100, 100 );

// Object parameters
$.line( { "x1": 0, "y1": 0, "x2": 100, "y2": 100 } );
```

---

## Aliases

Pi.js is accessible via two aliases:
- **`$`** (preferred, for brevity)
- **`pi`** (for clarity)

Both reference the same object. The `$` alias is only set if not already defined (won't conflict with jQuery).

---

## Documentation

For complete documentation, tutorials, and examples:
- **Website:** https://pijs.org
- **Repository:** https://github.com/AndyStubbs/pijs

---

## License

Apache License 2.0 - See `LICENSE` file for details.

---

## Browser Support

Requires WebGL2 support (available in all modern browsers):
- Chrome/Edge 56+
- Firefox 51+
- Safari 15+
- Opera 43+
