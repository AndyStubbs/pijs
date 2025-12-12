# Pi.js v1.2.4

A JavaScript library for retro-style 2D games and demos. Inspired by QBasic, Pi.js provides a beginner-friendly API for graphics, sound, and input handling on modern web browsers.

**Official Website:** https://pijs.org

---

## Installation

```bash
npm install pijs
```

---

## Quick Start

### Browser (Script Tag)

```html
<script src="node_modules/pijs/dist/pi.js"></script>
<script>
	const screen = $.screen( "myCanvas", 800, 600 );
	$.line( 0, 0, 100, 100 );
</script>
```

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
