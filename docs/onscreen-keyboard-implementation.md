# Onscreen Keyboard Implementation Summary

## Overview

The onscreen keyboard has been implemented as a separate module (`src/modules/onscreen-keyboard.js`) that integrates with the keyboard module by simulating actual keystrokes. This approach provides a clean separation of concerns and ensures consistent behavior between physical and virtual keyboards.

## Architecture

### Module Structure

```
src/modules/
├── keyboard.js           # Core keyboard handling
└── onscreen-keyboard.js  # Virtual keyboard UI and simulation
```

### Key Design Decisions

1. **Separate Module**: The onscreen keyboard is a standalone module rather than being embedded in the keyboard module. This keeps code organized and maintainable.

2. **Keystroke Simulation**: Instead of directly manipulating input values, the onscreen keyboard creates synthetic `KeyboardEvent` objects and dispatches them to the window. This ensures:
   - Consistent behavior with physical keyboards
   - All keyboard event handlers work correctly
   - No duplicate input handling logic

3. **Screen-Based**: The keyboard is rendered on a Pi.js screen using the existing `printTable()` function, maintaining visual consistency with the rest of the library.

4. **Event-Driven**: Uses the press module (`onpress`/`offpress`) for touch and mouse interaction with virtual keys.

## Implementation Details

### Data Structures

```javascript
const KEYBOARD_LAYOUTS = {
	"lowercase": [...],  // Lowercase letter layout
	"uppercase": [...],  // Uppercase letter layout
	"symbol": [...],     // Symbol layout
	"numbers": [...]     // Number-only layout
};

const KEYBOARD_FORMATS = [
	[...],  // Format for text layouts (4 rows)
	[...]   // Format for number layout (2 rows)
];

const KEY_LOOKUP = {
	// Maps special keys to display text and key codes
};

let m_keyboardState = {
	// Maintains current keyboard state
};
```

### Core Functions

#### `showKeyboard( mode )`
1. Stores keyboard state
2. Determines layout based on mode ("text" or "number")
3. Calls `renderKeyboard()` to display

#### `renderKeyboard()`
1. Calculates keyboard position below current cursor
2. Saves background behind keyboard
3. Builds display keys from layout
4. Uses `printTable()` to render keyboard
5. Sets up touch/mouse event handlers

#### `onKeyboardPress( data, customData )`
1. Identifies which key was pressed
2. Handles special keys (CAPS, SYMBOLS, +/-)
3. Creates synthetic keyboard event
4. Dispatches event to window
5. Highlights pressed key visually

#### `simulateKeystroke( keyEvent )`
1. Creates `KeyboardEvent` with proper properties
2. Dispatches to window using `window.dispatchEvent()`
3. Keyboard module captures and processes event

### Integration Points

#### With Keyboard Module

The keyboard module was enhanced with:

```javascript
// Added onscreenKeyboard parameter to input()
screenManager.addCommand(
	"input",
	input,
	[ "prompt", "fn", "cursor", "isNumber", "isInteger", 
	  "allowNegative", "onscreenKeyboard" ]
);
```

In `startInput()`:
```javascript
// Show onscreen keyboard if requested
if( m_inputData.onscreenKeyboard === "always" ) {
	const mode = m_inputData.isNumber ? "number" : "text";
	screenData.api.showKeyboard( mode );
}
```

In `finishInput()`:
```javascript
// Hide onscreen keyboard if it was shown
if( m_inputData.onscreenKeyboard !== "none" ) {
	screenData.api.hideKeyboard();
}
```

#### With Press Module

Uses existing press module for interaction:
```javascript
screenData.api.onpress( "down", onKeyboardPress, false, 
	hitBoxes[ i ].pixels, { "index": i } );
```

#### With Print/Table Module

Uses `printTable()` for layout:
```javascript
const hitBoxes = screenData.api.printTable( displayKeys, format );
```

## Differences from Legacy Implementation

### Legacy (`pi-keyboard.js`)
- Embedded within keyboard module (~1400 lines)
- Direct manipulation of input values
- Tightly coupled with input system
- Complex state management across multiple functions
- Uses internal `m_piData` structure

### New Implementation (`onscreen-keyboard.js`)
- Separate module (~400 lines)
- Simulates actual keystrokes
- Loosely coupled through events
- Clean state in single object
- Uses standard Pi.js API

## Advantages of New Approach

1. **Modularity**: Clear separation allows easier testing and maintenance
2. **Consistency**: Physical and virtual keyboards behave identically
3. **Compatibility**: Works with all keyboard event handlers (`onkey`, `inkey`, combos)
4. **Simplicity**: Less code duplication, clearer logic flow
5. **Extensibility**: Easy to add new keyboard layouts or features
6. **Standards**: Uses standard `KeyboardEvent` API

## Testing

Test files created:
- `test/test-onscreen-keyboard.html` - Basic functionality tests
- `test/test-keyboard-features.html` - Comprehensive feature demo

Test coverage includes:
- Text input with onscreen keyboard
- Number input with onscreen keyboard
- Manual keyboard show/hide
- Event simulation
- Layout switching
- Special key handling

## Known Limitations

1. **Single Keyboard Per Screen**: Only one onscreen keyboard per screen at a time
2. **Fixed Layouts**: Cannot customize keyboard layout at runtime
3. **Position**: Keyboard appears below current cursor position
4. **Background Saving**: Requires sufficient screen space below cursor

## Future Enhancements

Potential improvements:
1. Custom keyboard layouts via configuration
2. Positioning options (top, bottom, custom)
3. Animation effects for key presses
4. Multiple simultaneous keyboards
5. Haptic feedback on touch devices
6. Sound effects for key presses
7. Themes and color schemes
8. Auto-hide when clicking outside
9. Multi-language support
10. Accessibility improvements (ARIA labels, screen reader support)

## Performance Considerations

- **Background Caching**: Background is saved once and reused
- **Event Batching**: Uses single event listener for all keys
- **Minimal Redraws**: Only redraws when layout changes
- **Cleanup**: Properly removes event handlers when hidden

## Conclusion

The new onscreen keyboard implementation provides a clean, modular solution that integrates seamlessly with Pi.js's existing keyboard system. By simulating actual keystrokes rather than duplicating input logic, it ensures consistency and maintainability while adding minimal complexity to the codebase.

