# Onscreen Keyboard Module

The onscreen keyboard module provides a virtual keyboard interface for Pi.js applications. This is particularly useful for touch devices, accessibility features, and retro-style game interfaces.

## Features

- **Multiple Layouts**: Text (lowercase/uppercase), symbols, and numbers
- **Keyboard Simulation**: Simulates actual keystrokes through the keyboard module
- **Integration with Input**: Automatically shows/hides with the `input()` command
- **Manual Control**: Can be shown/hidden programmatically
- **Customizable**: Different modes for text and number entry

## API Commands

### `showKeyboard( mode )`

Shows the onscreen keyboard.

**Parameters:**
- `mode` (string) - The keyboard mode: `"text"` or `"number"`

**Example:**
```javascript
// Show text keyboard
$.showKeyboard( "text" );

// Show number keyboard
$.showKeyboard( "number" );
```

### `hideKeyboard()`

Hides the onscreen keyboard.

**Example:**
```javascript
$.hideKeyboard();
```

### `input( prompt, fn, cursor, isNumber, isInteger, allowNegative, onscreenKeyboard )`

Prompts for user input with optional onscreen keyboard.

**Parameters:**
- `prompt` (string) - The prompt text to display
- `fn` (function, optional) - Callback function when input completes
- `cursor` (string, optional) - The cursor character (default: █)
- `isNumber` (boolean, optional) - Accept only numbers
- `isInteger` (boolean, optional) - Accept only integers
- `allowNegative` (boolean, optional) - Allow negative numbers
- `onscreenKeyboard` (string, optional) - Keyboard mode: `"none"`, `"auto"`, or `"always"`
  - `"none"` - Never show onscreen keyboard (default)
  - `"auto"` - Show on touch devices only
  - `"always"` - Always show onscreen keyboard

**Returns:** Promise that resolves with the input value

**Examples:**
```javascript
// Text input with always-on keyboard
const name = await $.input( "Name: ", null, null, false, false, false, "always" );

// Number input with always-on keyboard
const age = await $.input( "Age: ", null, null, true, true, false, "always" );

// Auto mode (detects touch devices)
const email = await $.input( "Email: ", null, null, false, false, false, "auto" );

// With callback instead of await
$.input( "Score: ", function( value ) {
	$.print( "You entered: " + value );
}, null, true, true, false, "always" );
```

## Keyboard Layouts

### Text Layout (Lowercase)
```
1 2 3 4 5 6 7 8 9 0 [BACK]
q w e r t y u i o p [CAPS]
a s d f g h j k l   [SYMBOLS]
z x c   [SPACE]   v b n m [ENTER]
```

### Text Layout (Uppercase)
```
1 2 3 4 5 6 7 8 9 0 [BACK]
Q W E R T Y U I O P [CAPS]
A S D F G H J K L   [SYMBOLS]
Z X C   [SPACE]   V B N M [ENTER]
```

### Symbol Layout
```
~ ! @ # $ % ^ & * | [BACK]
( ) { } [ ] < > \ / [CAPS]
` " ' , . ; : ? _   [SYMBOLS]
+ -                 [ENTER]
```

### Number Layout
```
1 2 3 4 5 6 7 8 9 0 [BACK]
[+/-] [.] [ENTER]
```

## Special Keys

- **BACK** - Backspace key (deletes last character)
- **CAPS** - Toggles between lowercase and uppercase
- **SYMBOLS** - Toggles symbol layout
- **SPACE** - Space character
- **ENTER** - Completes input
- **+/-** - Toggles positive/negative for numbers

## Integration with Keyboard Module

The onscreen keyboard works by simulating actual keyboard events. When a virtual key is pressed:

1. The onscreen keyboard module creates a synthetic `KeyboardEvent`
2. The event is dispatched to the window
3. The keyboard module captures and processes the event
4. Any registered `onkey()` handlers are triggered
5. The `inkey()` function reflects the key state

This means all keyboard functionality (combos, action keys, etc.) works seamlessly with the onscreen keyboard.

## Usage Examples

### Basic Text Input
```javascript
$.screen( "4:3" );
$.setFont( "8x8" );

async function askName() {
	$.print( "Welcome!" );
	const name = await $.input( "Enter your name: ", null, null, false, false, false, "always" );
	$.print( "Hello, " + name + "!" );
}

$.ready( askName );
```

### Number Input
```javascript
async function askAge() {
	$.print( "How old are you?" );
	const age = await $.input( "Age: ", null, null, true, true, false, "always" );
	
	if( age < 18 ) {
		$.print( "You are young!" );
	} else {
		$.print( "You are an adult!" );
	}
}
```

### Manual Keyboard Control
```javascript
// Show keyboard for custom interaction
$.showKeyboard( "text" );

// Monitor key presses
$.onkey( "any", "down", function( keyData ) {
	$.print( "Key pressed: " + keyData.key );
} );

// Hide after 5 seconds
setTimeout( function() {
	$.hideKeyboard();
}, 5000 );
```

### Touch Device Detection
```javascript
// Automatically show keyboard on touch devices
async function getUserInput() {
	const input = await $.input( "Enter text: ", null, null, false, false, false, "auto" );
	$.print( "You entered: " + input );
}
```

## Styling and Appearance

The onscreen keyboard uses the current screen's font and color settings. To customize:

```javascript
// Set font before showing keyboard
$.setFont( "8x8" );
$.setColor( 15 );

// Show keyboard with custom appearance
$.showKeyboard( "text" );
```

## Performance Considerations

- The keyboard saves and restores the background behind it
- Background is saved once and reused for performance
- Keyboard rendering uses the `printTable()` function for layout
- Event handlers are cleaned up when the keyboard is hidden

## Browser Compatibility

The onscreen keyboard works in all modern browsers that support:
- Canvas API
- Keyboard Events
- Touch Events (for touch interaction)

## Limitations

- The keyboard appears in the screen's coordinate space
- Only one keyboard can be shown per screen at a time
- Keyboard layout is fixed (not customizable in this version)
- Requires the press module for touch/mouse interaction

## Future Enhancements

Potential improvements for future versions:
- Custom keyboard layouts
- Themeable appearance
- Animation effects
- Haptic feedback support
- Multi-language support
- Custom key mapping

