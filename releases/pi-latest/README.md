# Pi.js

A JavaScript library for retro-style 2D games and demos. Inspired by QBasic, Pi.js provides a beginner-friendly API for graphics, sound, and input handling on modern web browsers.

**Official Website:** https://pijs.org

---

## Installation

```bash
npm install pijs-web
```

---

## Quick Start

### ES Modules (Recommended)

```javascript
import $ from "pijs-web";

// Create a screen
const screen = $.screen( "800x600" );

// Draw a line
$.line( 0, 0, 100, 100 );

// Draw a circle
$.circle( 400, 300, 50 );
```

### Browser (Script Tag)

```html
<script src="node_modules/pijs-web/dist/pi.js"></script>
<script>
	const screen = $.screen( "800x600" );
	$.line( 0, 0, 100, 100 );
</script>
```

---

## What's New in v2.1.0

- **Custom Shaders** - Create GLSL ES 3.00 fragment shaders, apply effects in draw order, and
  customize final presentation with display shaders
- **Nested Drawing Views** - Use local coordinates and clipping with push, pop, reset, and
  coordinate-conversion commands
- **Shared-Context Offscreen Screens** - Give an offscreen screen a parent for faster image draws
  within the parent's WebGL context
- **Rendering Lifecycle Fixes** - Corrected offscreen Y orientation and improved GPU texture
  cleanup, reuse, and removal

---

## Package Exports

This package provides multiple entry points:

### Main Library
- **Default:** `import $ from "pijs-web"` - Full library with all features
- **Lite Version:** `import $ from "pijs-web/lite"` - Smaller bundle without some features

### Plugins
- `pijs-web/plugins/gamepad` - Gamepad/controller support
- `pijs-web/plugins/keyboard` - Keyboard input handling
- `pijs-web/plugins/pointer` - Mouse and touch input
- `pijs-web/plugins/sound` - Sound and audio functionality

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
