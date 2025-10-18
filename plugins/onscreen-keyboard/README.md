# Onscreen Keyboard Plugin

Virtual keyboard plugin for Pi.js providing touch-friendly input for mobile devices and accessibility.

## Overview

The Onscreen Keyboard plugin provides `showKeyboard()` and `hideKeyboard()` commands to display a virtual keyboard on screen. The keyboard simulates actual keystrokes that work with the `input()` command and keyboard event handlers.

## Installation

### Browser (IIFE)

```html
<script src="../../build/pi.min.js"></script>
<script src="plugins/print-table/dist/print-table.min.js"></script>
<script src="plugins/onscreen-keyboard/dist/onscreen-keyboard.min.js"></script>
```

**Note:** This plugin requires the `print-table` plugin to be loaded first.

### ES Modules

```javascript
import pi from "../../build/pi.esm.min.js";
import printTablePlugin from "./plugins/print-table/dist/print-table.esm.min.js";
import onscreenKeyboardPlugin from "./plugins/onscreen-keyboard/dist/onscreen-keyboard.esm.min.js";

// Register print-table first (dependency)
pi.registerPlugin( {
	"name": "print-table",
	"init": printTablePlugin
} );

// Then register onscreen-keyboard
pi.registerPlugin( {
	"name": "onscreen-keyboard",
	"init": onscreenKeyboardPlugin
} );
```

## Commands

### `showKeyboard( mode )`

Display the onscreen keyboard.

**Parameters:**
- `mode` (string, optional): Keyboard mode - `"text"` (default) or `"number"`

**Example:**
```javascript
pi.showKeyboard( "text" );  // Show full keyboard
pi.showKeyboard( "number" ); // Show number pad
```

### `hideKeyboard()`

Hide the onscreen keyboard and restore the background.

**Example:**
```javascript
pi.hideKeyboard();
```

## Usage Examples

### Basic Text Input with Keyboard

```javascript
pi.ready( () => {
	pi.screen( { "aspect": "16:9" } );
	
	pi.print( "Enter your name:" );
	
	// Show keyboard for touch devices
	pi.showKeyboard( "text" );
	
	// Get input
	pi.input( "> ", ( name ) => {
		pi.hideKeyboard();
		pi.print( `Hello, ${name}!` );
	} );
} );
```

### Number Input with Number Pad

```javascript
pi.screen( { "aspect": "16:9" } );
pi.print( "Enter your age:" );

// Show number keyboard
pi.showKeyboard( "number" );

pi.input( "> ", ( age ) => {
	pi.hideKeyboard();
	pi.print( `You are ${age} years old.` );
}, null, true ); // true = number input
```

### Conditional Keyboard (Touch Detection)

```javascript
pi.ready( () => {
	pi.screen( { "aspect": "16:9" } );
	
	// Detect touch device
	const isTouchDevice = ( 'ontouchstart' in window ) || 
		( navigator.maxTouchPoints > 0 );
	
	if( isTouchDevice ) {
		pi.showKeyboard( "text" );
	}
	
	pi.input( "Name: ", ( name ) => {
		if( isTouchDevice ) {
			pi.hideKeyboard();
		}
		pi.print( `Welcome, ${name}!` );
	} );
} );
```

### Manual Keyboard Toggle

```javascript
let keyboardVisible = false;

pi.screen( { "aspect": "16:9" } );
pi.print( "Press K to toggle keyboard" );

pi.onkey( "k", "down", () => {
	if( keyboardVisible ) {
		pi.hideKeyboard();
		keyboardVisible = false;
	} else {
		pi.showKeyboard( "text" );
		keyboardVisible = true;
	}
} );
```

## Keyboard Layouts

### Text Mode
- Full QWERTY keyboard
- Number row
- Symbols via toggle
- Caps lock toggle
- Space, Enter, Backspace

### Number Mode
- Number pad (0-9)
- Decimal point
- Plus/minus toggle
- Enter, Backspace

## Features

- ✅ Touch-friendly virtual keyboard
- ✅ Full QWERTY layout
- ✅ Number pad mode
- ✅ Symbol keyboard
- ✅ Caps lock support
- ✅ Visual feedback on key press
- ✅ Simulates real keyboard events
- ✅ Works with `input()` command
- ✅ Automatic background save/restore
- ✅ Per-screen keyboard support

## Technical Details

### Key Simulation

The keyboard dispatches real `KeyboardEvent` objects that:
- Trigger `onkey()` handlers
- Work with `inkey()` checks
- Support `input()` command
- Bubble through the event system

### Background Management

The keyboard:
- Automatically saves the screen area before drawing
- Restores the background when hidden
- Redraws on key highlight
- Cleans up on screen removal

## Dependencies

**Requires:** `print-table` plugin

The onscreen keyboard uses `printTable()` to render the keyboard layout, so the print-table plugin must be loaded before this plugin.

## Building

This plugin is built automatically when you run:

```bash
node scripts/build.js
```

Or build just this plugin:

```bash
node scripts/build-plugin.js onscreen-keyboard
```

## Breaking Changes from Core Module

**Before (as core module):**
```javascript
pi.input( "Name: ", callback, null, false, false, false, "always" );
```

**After (as plugin):**
```javascript
// User manually shows keyboard if needed
pi.showKeyboard( "text" );
pi.input( "Name: ", callback );

// Or conditionally:
if( isTouchDevice ) {
	pi.showKeyboard( "text" );
}
pi.input( "Name: ", callback );
```

The `onscreenKeyboard` parameter has been removed from `input()`. Users now have full control over when to show/hide the keyboard.

## License

Apache-2.0

