# Pi Vision (`$.vis`) - Retro GUI Plugin for Pi.js

**Pi Vision** is an official plugin for Pi.js that brings the robust, nostalgic architecture of classic retro GUI frameworks like **TurboVision (Turbo Pascal 7.0)** and **Visual Basic for DOS (VBDOS)** into modern canvas-based web development. 

Scoped neatly under the `$.vis` namespace, Pi Vision provides a powerful windowing and control system designed to feel completely at home with Pi.js's clean, functional, and explicit philosophy.

---

## Core Concepts

1. **Namespace (`$.vis`)**: All GUI commands and window managers are cleanly organized under `$.vis` to prevent core API pollution.
2. **Windows as Screens**: Under the hood, each window is a specialized offscreen Pi.js screen object. This means windows are fully compatible with standard Pi.js functions like `$.setScreen()`, `$.cls()`, `$.line()`, `$.print()`, and more.
3. **Windows Are Not Required**: You do not need to create a window to use Pi Vision controls. Standalone widgets can be added directly, automatically attaching to a default desktop root container.
4. **Protected Client View & Borders**: Windows automatically calculate insets based on their border style, using Pi.js's native `pushView` to protect the inner client area. Advanced users can use `$.popView()` to escape the client area and draw directly onto the window frames or borders.
5. **Explicit Manual Rendering & Recursion**: True to Pi.js's immediate-mode DNA, Pi Vision avoids hidden magic. Windows and controls are composited when you explicitly call `$.vis.render()` or trigger individual window render functions.

---

## Retro Tools & Widgets

Inspired by VBDOS and TurboVision, Pi Vision offers a classic suite of controls:
- **Windows**: Draggable/managed containers with title bars, close buttons, and drop shadows.
- **Buttons**: Clickable retro push buttons with pressed/focused states.
- **Labels**: Static text displays.
- **Text Areas**: Multi-line or single-line text input fields with full cursor controls.
- **Main Menus**: Vertically stacked menus that get highlighted as an option select.
- **Drop Down Menus**: Menus that when selected show more menus.
- **Scrollable Content**: Windows content can have configurable scrollbars.
- **Checkboxes**: Check many options from a group.
- **Radio buttons**: Check one out of a group of options.
- **Tree View**: Collapsible tree view area.

By default all tools should work with Mouse, Keyboard, Touch, and Gamepads. But this can be configured.
---

## Getting Started

### Basic Usage Example

```javascript
import pi from "./build/pi.esm.min.js";
import visPlugin from "./plugins/pi-vision/dist/pi-vision.esm.min.js";

pi.registerPlugin( {
	"name": "pi-vision",
	"init": visPlugin
} );

pi.ready( () => {
	const mainScreen = pi.screen( { "aspect": "640x480" } );

	// Create a retro window
	const win = pi.vis.window( {
		"title": "System Console",
		"x": 50,
		"y": 40,
		"width": 320,
		"height": 200,
		"border": "double",
		"shadow": true
	} );

	// Target the window for custom drawing using standard Pi.js commands
	pi.setScreen( win );
	pi.cls();
	pi.color( "lightgreen" );
	pi.print( "Initializing Pi Vision...\nReady." );

	// Switch back to main screen
	pi.setScreen( mainScreen );

	// Main application loop
	function frame() {
		pi.cls();
		
		// Draw background graphics...
		
		// Render all Pi Vision windows and GUI controls on top (recursive by default)
		pi.vis.render();
		
		requestAnimationFrame( frame );
	}
	
	requestAnimationFrame( frame );
} );
```

---

## API Reference

### Window Management

#### `$.vis.window( options )`
Creates a new GUI window. Returns a specialized Pi.js screen object that can be targeted with `$.setScreen()`.

- **options** (Object):
  - `title` (String): Window title text displayed in the header bar.
  - `x` (Number): X position on screen.
  - `y` (Number): Y position on screen.
  - `width` (Number): Total window width (including borders).
  - `height` (Number): Total window height (including title bar and borders).
  - `border` (String): Border style (`"double"`, `"single"`, `"thick"`, or `"none"`). Default is `"double"`.
  - `shadow` (Boolean): Enables a classic retro 2-pixel drop shadow. Default is `true`.

```javascript
const win = $.vis.window( {
	"title": "Settings",
	"x": 100, "y": 80,
	"width": 280, "height": 160,
	"border": "single"
} );
```

#### `$.vis.render( recursive )`
Composites and renders active windows, frames, title bars, and top-layer UI controls onto the current active screen, processing only the windows and root elements that belong to that specific screen.
- **recursive** (Boolean): Defaults to `true` (renders all windows and root controls). If set to `false`, it skips automatic bulk rendering, allowing you to manually control the render sequence per window.

```javascript
// Render all windows recursively for the active screen
$.vis.render();

// Or render a single specific window manually
win.render();
```

#### `$.vis.moveElement( element, targetScreenOrContainer )`
Moves any visual GUI element (such as a standalone button, label, or an entire window) from its current container to a new screen or target window container while preserving its internal state and handlers.

- **element** (Object): The GUI element or window handle to move.
- **targetScreenOrContainer** (Screen|Object): The target screen or parent window container.

```javascript
// Create a button on Screen A
const btn = pi.vis.button( "Click Me", 10, 10, 80, 24, () => {} );

// Move that button over to Screen B or into a specific window
pi.vis.moveElement( btn, screenB );
```

## Advanced: Border Customization & The View Stack

When you draw inside a window using `$.setScreen(win)`, Pi Vision automatically applies `pushView` to keep your drawings neatly constrained inside the client area (below the title bar and inside the borders).

If you are an advanced user who wants to customize the outer frame or draw custom title bar elements manually:

```javascript
$.setScreen( win );

// Currently inside the client view. Pop out to access full window bounds:
$.popView();

// Now drawing on the raw outer surface of the window (borders/title bar)
$.color( "red" );
$.rect( 0, 0, 10, 10, true ); // Custom icon in the corner
```

---

## License

Apache License 2.0 - See `LICENSE` file for details.