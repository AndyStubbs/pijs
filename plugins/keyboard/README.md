# Keyboard Plugin

Keyboard input handling plugin for Pi.js. Provides key state tracking, event handlers, and action key management.

## Features

- **Key State Tracking**: Track which keys are currently pressed
- **Event Handlers**: Register callbacks for key press/release events
- **Key Combinations**: Support for multi-key combinations
- **Action Keys**: Prevent default browser behavior for specific keys
- **Auto-initialization**: Keyboard starts automatically when plugin loads

## Commands

### `startKeyboard()`

Starts keyboard event listening. Called automatically when the plugin loads.

**Returns:** void

**Example:**
```javascript
pi.startKeyboard();
```

### `stopKeyboard()`

Stops keyboard event listening and clears all key states.

**Returns:** void

**Example:**
```javascript
pi.stopKeyboard();
```

### `inkey( key )`

Gets the current state of a key or all keys.

**Parameters:**
- `key` (string, optional): Key code or key name to check. If omitted, returns array of all pressed keys.

**Returns:** Key data object if key specified and pressed, `null` if not pressed, or array of all pressed key data objects if no key specified.

**Key Data Object:**
```javascript
{
	code: "KeyA",        // Physical key code
	key: "a",           // Character key value
	location: 0,        // Key location (0=standard, 1=left, 2=right)
	altKey: false,      // Alt key modifier
	ctrlKey: false,     // Ctrl key modifier
	metaKey: false,     // Meta key modifier
	shiftKey: false,    // Shift key modifier
	repeat: false       // Key repeat flag
}
```

**Example:**
```javascript
// Check if 'a' key is pressed
const keyData = pi.inkey( "KeyA" );
if( keyData ) {
	console.log( "A key is pressed!" );
}

// Get all currently pressed keys
const allKeys = pi.inkey();
console.log( allKeys.length + " keys pressed" );
```

### `setActionKeys( keys )`

Sets keys that should prevent default browser behavior (e.g., prevent scrolling with arrow keys).

**Parameters:**
- `keys` (Array<string>): Array of key codes or key names to treat as action keys.

**Returns:** void

**Example:**
```javascript
// Prevent arrow keys from scrolling
pi.setActionKeys( [ "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" ] );
```

### `removeActionKeys( keys )`

Removes keys from the action keys set.

**Parameters:**
- `keys` (Array<string>): Array of key codes or key names to remove from action keys.

**Returns:** void

**Example:**
```javascript
pi.removeActionKeys( [ "ArrowUp", "ArrowDown" ] );
```

### `onkey( key, mode, fn, once, allowRepeat )`

Registers a callback function for key events.

**Parameters:**
- `key` (string|Array<string>): Key code, key name, or array of keys for combinations. Use `"any"` to listen to all keys.
- `mode` (string): Event mode - `"down"` for key press, `"up"` for key release.
- `fn` (Function): Callback function that receives key data.
- `once` (boolean, optional): If `true`, handler is removed after first trigger. Defaults to `false`.
- `allowRepeat` (boolean, optional): If `true`, handler fires on key repeat. Defaults to `false`.

**Returns:** void

**Example:**
```javascript
// Listen for single key press
pi.onkey( "KeyA", "down", ( keyData ) => {
	console.log( "A key pressed!" );
} );

// Listen for key combination (Ctrl+S)
pi.onkey( [ "ControlLeft", "KeyS" ], "down", ( comboData ) => {
	console.log( "Save shortcut pressed!" );
} );

// Listen for any key
pi.onkey( "any", "down", ( keyData ) => {
	console.log( "Key pressed:", keyData.key );
} );

// One-time handler
pi.onkey( "Enter", "down", ( keyData ) => {
	console.log( "Enter pressed once" );
}, true );
```

### `offkey( key, mode, fn, once, allowRepeat )`

Removes a previously registered key event handler.

**Parameters:**
- `key` (string|Array<string>): Key code, key name, or array of keys that was used in `onkey()`.
- `mode` (string): Event mode - `"down"` or `"up"`.
- `fn` (Function): The callback function that was registered.
- `once` (boolean, optional): Must match the `once` value used in `onkey()`.
- `allowRepeat` (boolean, optional): Must match the `allowRepeat` value used in `onkey()`.

**Returns:** void

**Example:**
```javascript
function handleKey( keyData ) {
	console.log( "Key:", keyData.key );
}

// Register handler
pi.onkey( "KeyA", "down", handleKey );

// Later, remove handler
pi.offkey( "KeyA", "down", handleKey );
```

## Usage

### Browser (IIFE)

```html
<script src="../../build/pi.min.js"></script>
<script src="dist/keyboard.min.js"></script>

<script>
	pi.ready( () => {
		pi.screen( { "aspect": "16:9" } );
		
		// Keyboard is automatically started
		pi.onkey( "KeyA", "down", ( keyData ) => {
			console.log( "A key pressed!" );
		} );
	} );
</script>
```

### ES Modules

```javascript
import pi from "../../build/pi.esm.min.js";
import keyboardPlugin from "./plugins/keyboard/dist/keyboard.esm.min.js";

pi.registerPlugin( {
	"name": "keyboard",
	"init": keyboardPlugin
} );

pi.ready( () => {
	pi.screen( { "aspect": "16:9" } );
	
	// Keyboard is automatically started
	pi.onkey( "KeyA", "down", ( keyData ) => {
		console.log( "A key pressed!" );
	} );
} );
```

## Key Codes and Names

Common key codes and names:

- **Letters**: `KeyA`, `KeyB`, `KeyC`, etc. (or `"a"`, `"b"`, `"c"` as key names)
- **Numbers**: `Digit1`, `Digit2`, etc. (or `"1"`, `"2"` as key names)
- **Arrow Keys**: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- **Modifiers**: `ControlLeft`, `ControlRight`, `ShiftLeft`, `ShiftRight`, `AltLeft`, `AltRight`
- **Special**: `Enter`, `Space`, `Backspace`, `Escape`, `Tab`, `Delete`
- **Function Keys**: `F1`, `F2`, etc.

## Key Combinations

You can listen for key combinations by passing an array of keys:

```javascript
// Ctrl+Shift+S
pi.onkey( [ "ControlLeft", "ShiftLeft", "KeyS" ], "down", ( comboData ) => {
	console.log( "Save with shift!" );
} );
```

The callback receives an array of key data objects when multiple keys are specified, or a single key data object for single keys.

## Action Keys

Action keys prevent default browser behavior. This is useful for game controls where you don't want the page to scroll when arrow keys are pressed:

```javascript
// Prevent arrow keys from scrolling
pi.setActionKeys( [ "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" ] );

// Prevent spacebar from scrolling
pi.setActionKeys( [ "Space" ] );
```

## Building

This plugin is **built automatically** when you run:

```bash
node scripts/build.js
```

Or build just this plugin:

```bash
node scripts/build-plugin.js keyboard
```

This creates (in the `dist/` directory):
- `keyboard.esm.js` (ES Module)
- `keyboard.esm.min.js` (ES Module, minified)
- `keyboard.js` (IIFE for browsers)
- `keyboard.min.js` (IIFE, minified)

## Notes

- Keyboard automatically starts when the plugin loads
- Keyboard events are ignored when focus is inside editable elements (input, textarea, etc.)
- All key states are cleared when the window loses focus
- The `"any"` key handler receives the current key data as a parameter
- Key combinations require all keys in the array to be pressed simultaneously

## License

Apache-2.0

