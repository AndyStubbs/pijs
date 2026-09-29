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

## Rendering features

- **Custom Shaders** - Create GLSL ES 3.00 fragment shaders, apply effects in draw order, and
  customize final presentation with display shaders
- **Nested Drawing Views** - Use local coordinates and clipping with push, pop, reset, and
  coordinate-conversion commands
- **Shared-Context Offscreen Screens** - Give an offscreen screen a parent for faster image draws
  within the parent's WebGL context
- **Resource Management** - Image and shader removal release their cached GPU resources
- **Host Layout** - Use `noCss` to manage canvas styling in host CSS
- **Context Recovery** - Surviving screens rebuild GPU resources after context restoration

---

## Sound and input

- **Sound** - Synthesized voices with ADSR envelopes, sweeps, noise, and pan; PLAY music
  strings; decoded and streamed audio files with pause, resume, and playback rate; `sfx`,
  `music`, and `audio` buses with their own volumes and an output limiter
- **Sound Advanced plugin** - Synth features, presets and generated sound effects, PLAY
  instruments, bus effects and effect chains, level meters, WAV recording, and handlers timed
  to the music
- **Input** - Keyboard, mouse, touch, pen, and wheel input, and gamepads with standard button
  names and vibration. Every input plugin registers handlers by mode and function, removes
  them the same way, and reports releases it cancels on blur or a hidden page

---

## Package Exports

This package provides multiple entry points:

### Main Library
- **Default:** `import $ from "pijs-web"` - Full library with all features
- **Lite Version:** `import $ from "pijs-web/lite"` - Smaller bundle without some features

### Plugins

The Full library includes the gamepad, keyboard, pointer, polygons, and sound plugins. Their
standalone entry points are for Lite; loading one with the Full library throws
`DUPLICATE_PLUGIN`.

- `pijs-web/plugins/gamepad` - Gamepad/controller support
- `pijs-web/plugins/keyboard` - Keyboard input handling
- `pijs-web/plugins/pointer` - Mouse, touch, pen, and wheel input
- `pijs-web/plugins/polygons` - Polygon drawing
- `pijs-web/plugins/sound` - Sound and audio functionality

`pijs-web/plugins/sound-advanced` is in neither library. Load it after the Full library, or
after Lite and the sound plugin.

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

Requires a browser with WebGL2 enabled.


## Release validation

Chromium is the primary correctness and visual-test target, on Linux, Windows, and macOS.
Firefox receives targeted compatibility checks for rendering, sprites, shaders, context
recovery, sizing, and input, and runs the audio tests. Playwright's WebKit build runs the audio
tests on Linux and macOS. Safari itself has no automated tests, and iOS audio behavior needs a
device. WebGL2 availability alone does not establish tested compatibility for a browser
version.

See the [v2.3 update guide](https://github.com/AndyStubbs/pijs/blob/main/docs/UPGRADE-V2.3.md)
for additions, fixes, and compatibility changes, including the renamed input commands.
