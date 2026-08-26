# Pi Vision (`$.vis`) - Retro GUI Plugin for Pi.js

**Pi Vision** is an official plugin for Pi.js that brings the robust, nostalgic architecture of classic retro GUI frameworks like **TurboVision (Turbo Pascal 7.0)** and **Visual Basic for DOS (VBDOS)** into modern canvas-based web development. 

Scoped neatly under the `$.vis` namespace, Pi Vision provides a powerful windowing and control system designed to feel completely at home with Pi.js's clean, functional, and explicit philosophy.

---

## Core Concepts

1. **Namespace (`$.vis`)**: All GUI commands and window managers are cleanly organized under `$.vis` to prevent core API pollution.
2. **Windows as Screens**: Under the hood, each window is a specialized offscreen Pi.js screen object. This means windows are fully compatible with standard Pi.js functions like `$.setScreen()`, `$.cls()`, `$.line()`, `$.print()`, and more.
3. **Windows Are Not Required**: You do not need to create a window to use Pi Vision controls. Standalone widgets can be added directly, automatically attaching to a default desktop root container.
4. **Protected Client View & Borders**: Bordered and interactive windows calculate their chrome
   insets using Pi.js's native `pushView`. A static borderless window exposes its entire surface as
   client space. Advanced users can use `$.popView()` to escape an inset client area.
5. **Explicit Manual Rendering & Recursion**: True to Pi.js's immediate-mode DNA, Pi Vision avoids hidden magic. Elements are composited when you explicitly call `$.vis.render()` or trigger an individual window render function. Windows are containers, so their child elements can be rendered recursively.
6. **Pointer Input**: Pi Vision requires the `pointer` plugin, but only interactive windows register
   Pi Vision pointer handlers. Mouse and touch presses share the same title-bar, resize-grip, and
   close-button behavior.

---

## Retro Tools & Widgets

Inspired by VBDOS and TurboVision, Pi Vision offers a classic suite of controls:
- **Windows**: Static containers by default, with optional interactive title bars, close buttons,
  borders, and drop shadows.
- **Buttons**: Clickable retro push buttons with pressed/focused states.
- **Labels**: Static text displays.
- **Text Areas**: Multi-line or single-line text input fields with full cursor controls.
- **Main Menus**: Vertically stacked menus that get highlighted as an option select.
- **Drop Down Menus**: Menus that when selected show more menus.
- **Scrollable Content**: Windows content can have configurable scrollbars.
- **Checkboxes**: Check many options from a group.
- **Radio buttons**: Check one out of a group of options.
- **Tree View**: Collapsible tree view area.

Interactive tools support mouse, keyboard, touch, and gamepads where applicable.
---

## Getting Started

### Basic Usage Example

```javascript
import $ from "./build/pi.esm.min.js";
import visPlugin from "./plugins/pi-vision/dist/pi-vision.esm.min.js";

$.registerPlugin( {
	"name": "pi-vision",
	"init": visPlugin
} );

$.ready( () => {
	const mainScreen = $.screen( { "aspect": "640x480" } );

	// Create a retro window
	const win = $.vis.window( {
		"mode": "interactive",
		"title": "System Console",
		"x": 50,
		"y": 40,
		"width": 320,
		"height": 200,
		"border": "double",
		"shadow": true,
		"onRender": ( screen ) => {
			screen.setColor( "lightgreen" );
			screen.print( "Initializing Pi Vision...\nReady." );
		}
	} );

	$.vis.onRender( ( screen ) => {
		screen.setColor( 8 );
		screen.setPosPx( 8, 8 );
		screen.print( "Desktop" );
	} );

	// Main application loop
	function frame() {
		// Render all Pi Vision windows and GUI controls on top (recursive by default)
		$.vis.render();
		
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
  - `mode` (String): `"static"` or `"interactive"`. Default is `"static"`.
  - `border` (String): Border style (`"double"`, `"single"`, `"thick"`, or `"none"`). Default is `"none"`.
  - `shadow` (Boolean): Enables a classic retro 2-pixel drop shadow. Default is `false`.
  - `beforeClose` (Function): Optional callback receiving the window screen. Returning exactly
    `false` cancels a close request.
  - `onRender` (Function): Optional callback receiving the window screen. Pi Vision clears the
    client area and invokes this callback before rendering child elements.

Static windows do not respond to pointer-driven move, resize, close, or raise actions. Their
`move()`, `resize()`, and `close()` methods remain available to scripts. A static borderless window
has no title or close chrome, and its client view occupies the full requested width and height. A
static bordered window can display its border and title, but does not display `[X]`.

Interactive windows reserve one character row for their title bar and `[X]` close button. Press and
drag the title bar to move the window, drag its bottom-right character cell to resize it, or release
`[X]` to close it. Interacting with an interactive window raises it above its siblings. Geometry
remains integer-pixel based and is clamped so the window and optional shadow stay inside the parent
client area. Bordered window dimensions snap to complete font cells. Requested sizes use
nearest-cell rounding; containment limits round downward. Borderless windows retain exact
integer-pixel dimensions.

```javascript
const win = $.vis.window( {
	"mode": "interactive",
	"title": "Settings",
	"x": 100, "y": 80,
	"width": 280, "height": 160,
	"border": "single",
	"onRender": ( screen ) => {
		screen.setColor( 2 );
		screen.rect( 0, 0, screen.width(), screen.height(), 2 );
	}
} );
```

#### `win.move( x, y )`

Moves a window within its parent client area and returns the window screen for chaining. Coordinates
are clamped when necessary.

#### `win.resize( width, height )`

Resizes a window from its top-left corner and returns the window screen for chaining. Bordered
dimensions snap to complete font cells so the visible bottom-right corner remains the resize grip.
The client view and nested windows are adjusted to the new bounds, then the render callback rebuilds
the cleared client area.

#### `win.close()`

Requests closure of the window and all descendant windows. It returns `false` when `beforeClose`
vetoes the request and `true` after successful removal. For interactive windows, programmatic and
`[X]` close requests use the same callback and cleanup behavior.

#### `$.vis.render( recursive )`
Clears the active base screen, invokes its `onRender` callback, then renders all root elements in
creation order. Each window rebuilds its chrome, clears its client, invokes its own callback, renders
its children, and composites onto its parent. Windows are the only container element.
- **recursive** (Boolean): Defaults to `true`. When enabled, each window renders its descendant elements before it is composited. When `false`, root elements render without their descendants.

```javascript
// Render all windows recursively for the active screen
$.vis.render();

// Or render a single specific window manually
win.render();
```

`win.render( recursive )` renders the window onto the parent it was created on, independent of the
currently active screen. It uses the same recursion behavior and defaults to `true`.

Client rendering is immediate-mode. One-time drawing is cleared by the next render, so persistent
content belongs in `onRender`. Callbacks must draw through the screen argument they receive. Callback
errors propagate and stop descendant rendering.

#### `$.vis.onRender( fn )`

Sets the render callback for the active base screen. Pass `null` to remove it. Pi Vision invokes the
callback as `fn( screen )` after clearing the base screen and before drawing root elements.

```javascript
$.vis.onRender( ( screen ) => {
	screen.setColor( 1 );
	screen.setPosPx( 8, 8 );
	screen.print( "Desktop" );
} );
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

When you draw inside a window using `$.setScreen(win)`, Pi Vision automatically applies `pushView`
to keep drawings inside the calculated client area. For the default static borderless window, that
view is the full window surface. Interactive and bordered windows protect their chrome insets.

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
