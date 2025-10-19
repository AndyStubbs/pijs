# Pi.js Gamepad Module

The Gamepad module provides global gamepad/controller input support, independent of screens. It works similarly to the keyboard module, providing a simple event-driven API for detecting button presses, releases, and analog stick movements.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Commands](#commands)
- [Events](#events)
- [Examples](#examples)

## Basic Usage

### Starting the Gamepad

```javascript
// Start gamepad polling (automatically starts when using ongamepad)
pi.startGamepad();

// Stop gamepad polling
pi.stopGamepad();
```

### Getting Gamepad Data

```javascript
// Get all connected gamepads
const gamepads = pi.ingamepad();

// Get specific gamepad
const gamepad0 = pi.ingamepad( 0 );

gamepads.forEach( ( gp ) => {
	console.log( "Gamepad", gp.index );
	console.log( "Buttons:", gp.buttons.length );
	console.log( "Axes:", gp.axes.length );
} );
```

### Listening for Events

```javascript
// Listen for button press
pi.ongamepad( 0, "down", 0, ( data ) => {
	console.log( "Button 0 pressed!" );
} );

// Listen for axis movement
pi.ongamepad( 0, "axis", 0, ( value ) => {
	console.log( "Left stick X:", value );
} );
```

## Commands

### `startGamepad()`

Starts gamepad polling and enables gamepad event detection. This is automatically called when you use `ongamepad()` or `ingamepad()`.

```javascript
pi.startGamepad();
```

### `stopGamepad()`

Stops gamepad polling.

```javascript
pi.stopGamepad();
```

### `ingamepad( gamepadIndex )`

Returns gamepad(s) with their current state. Automatically starts gamepad polling.

**Parameters:**
- `gamepadIndex` (Number|null): Optional gamepad index (0-3). If null or omitted, returns array of all gamepads.

**Returns:**
- If `gamepadIndex` is null/omitted: Array of all connected gamepads
- If `gamepadIndex` is specified: The specific gamepad object or null if not connected

```javascript
// Get all gamepads
const gamepads = pi.ingamepad();

if( gamepads.length > 0 ) {
	const gp = gamepads[ 0 ];
	console.log( "Gamepad index:", gp.index );
	console.log( "Number of buttons:", gp.buttons.length );
	console.log( "Number of axes:", gp.axes.length );
	
	// Check button states
	if( gp.buttons[ 0 ].pressed ) {
		console.log( "Button 0 is pressed" );
	}
	
	// Check axis values
	console.log( "Left stick X:", gp.axes[ 0 ] );
	console.log( "Left stick Y:", gp.axes[ 1 ] );
}

// Get specific gamepad
const gp0 = pi.ingamepad( 0 );
if( gp0 ) {
	console.log( "First gamepad connected" );
	console.log( "Button 0 pressed:", gp0.buttons[ 0 ].pressed );
}
```

**Gamepad Properties:**
- `index` - Gamepad index number
- `buttons` - Array of button objects with `pressed` and `value` properties
- `axes` - Array of axis values (-1 to 1)
- `axes2` - Array of calibrated axis values with deadzone applied

### `setGamepadSensitivity( sensitivity )`

Sets the axis deadzone/sensitivity. Values closer to 0 make the sticks more sensitive, values closer to 1 create a larger deadzone.

```javascript
// More sensitive (smaller deadzone)
pi.setGamepadSensitivity( 0.1 );

// Less sensitive (larger deadzone)
pi.setGamepadSensitivity( 0.3 );
```

**Parameters:**
- `sensitivity` (Number): Value between 0 and 1 (default: 0.2)

## Events

### `ongamepad( gamepadIndex, mode, item, fn, once, allowRepeat )`

Register a gamepad event listener.

**Parameters:**
- `gamepadIndex` (Number): Gamepad index (0 = first gamepad, 1 = second, etc.)
- `mode` (String): Event mode - "connect", "disconnect", "down", "up", "pressed", "axis"
- `item` (Number|Array|String|null): Button/axis index, array of indices, "any", or null
  - For axis mode: specific index or null for all axes
  - For button modes: specific index, array of indices, or "any"
- `fn` (Function): Callback function
- `once` (Boolean): If true, listener fires only once (default: false)
- `allowRepeat` (Boolean): For "pressed" mode, allow continuous firing (default: false)

**Modes:**

| Mode | Description | Callback Data |
|------|-------------|---------------|
| `"connect"` | Gamepad connected | `{ index, type }` |
| `"disconnect"` | Gamepad disconnected | `{ index, type }` |
| `"down"` | Button pressed (fires once) | `{ index, pressed, value, gamepadIndex }` |
| `"up"` | Button released | `{ index, pressed, value, gamepadIndex }` |
| `"pressed"` | Button held (fires once or continuously) | `{ index, pressed, value, gamepadIndex }` |
| `"axis"` | Axis changed (specific index) | `axisValue` (Number) |
| `"axis"` | Any axis changed (item: null) | Array of `{ index, value, lastValue }` |

**Examples:**

```javascript
// Listen for gamepad connection
pi.ongamepad( 0, "connect", null, ( data ) => {
	console.log( "Gamepad connected:", data.index );
} );

// Listen for A button (button 0) press
pi.ongamepad( 0, "down", 0, ( data ) => {
	console.log( "A button pressed!" );
	console.log( "Button index:", data.index );
	console.log( "Gamepad index:", data.gamepadIndex );
} );

// Listen for A button release
pi.ongamepad( 0, "up", 0, ( data ) => {
	console.log( "A button released!" );
} );

// Listen for button held (fires once)
pi.ongamepad( 0, "pressed", 0, ( data ) => {
	console.log( "Button is being held" );
} );

// Listen for button held (continuous)
pi.ongamepad( 0, "pressed", 0, ( data ) => {
	console.log( "Button is being held (continuous)" );
}, false, true );

// Listen for any button press
pi.ongamepad( 0, "down", "any", ( data ) => {
	console.log( `Button ${data.index} pressed` );
} );

// Listen for multiple buttons
pi.ongamepad( 0, "down", [ 0, 1, 2, 3 ], ( data ) => {
	console.log( "Face button pressed:", data.index );
} );

// Listen for left stick horizontal axis
pi.ongamepad( 0, "axis", 0, ( value ) => {
	console.log( "Left stick X:", value );
} );

// Listen for all axis changes
pi.ongamepad( 0, "axis", null, ( changedAxes ) => {
	for( const axis of changedAxes ) {
		console.log( `Axis ${axis.index}: ${axis.value} (was ${axis.lastValue})` );
	}
} );

// One-time listener
pi.ongamepad( 0, "down", 0, ( data ) => {
	console.log( "This fires only once" );
}, true );
```

### `offgamepad( gamepadIndex, mode, item, fn )`

Remove a gamepad event listener.

**Parameters:**
- `gamepadIndex` (Number): Gamepad index
- `mode` (String): Event mode
- `item` (Number|Array|String): Button/axis index
- `fn` (Function): Callback function to remove

**Example:**

```javascript
function buttonHandler( data ) {
	console.log( "Button pressed" );
}

// Add listener
pi.ongamepad( 0, "down", 0, buttonHandler );

// Remove listener
pi.offgamepad( 0, "down", 0, buttonHandler );
```

## Examples

### Example 1: Simple Button Detection

```javascript
pi.screen( "320x200" );

pi.ongamepad( 0, "down", 0, () => {
	pi.print( "A button pressed!" );
} );
```

### Example 2: Reading Gamepad State

```javascript
pi.screen( "320x200" );

function draw() {
	pi.cls( 0 );
	
	const gamepads = pi.ingamepad();
	if( gamepads.length > 0 ) {
		const gp = gamepads[ 0 ];
		
		// Display button states
		for( let i = 0; i < gp.buttons.length; i++ ) {
			if( gp.buttons[ i ].pressed ) {
				pi.print( `Button ${i} pressed` );
			}
		}
		
		// Display axis values
		pi.print( `Left X: ${gp.axes[ 0 ].toFixed( 2 )}` );
		pi.print( `Left Y: ${gp.axes[ 1 ].toFixed( 2 )}` );
	}
	
	requestAnimationFrame( draw );
}

draw();
```

### Example 3: Connection Detection

```javascript
let gamepadConnected = false;

pi.ongamepad( 0, "connect", null, ( data ) => {
	gamepadConnected = true;
	console.log( `Gamepad ${data.index} connected!` );
} );

pi.ongamepad( 0, "disconnect", null, ( data ) => {
	gamepadConnected = false;
	console.log( `Gamepad ${data.index} disconnected!` );
} );
```

### Example 4: Movement with Analog Stick

```javascript
pi.screen( "320x200" );

let x = 160;
let y = 100;

function update() {
	const gamepads = pi.ingamepad();
	if( gamepads.length > 0 ) {
		const gp = gamepads[ 0 ];
		
		// Use calibrated axes (with deadzone)
		x += gp.axes2[ 0 ] * 5;
		y += gp.axes2[ 1 ] * 5;
		
		// Clamp to screen
		x = Math.max( 0, Math.min( 319, x ) );
		y = Math.max( 0, Math.min( 199, y ) );
	}
	
	pi.cls( 0 );
	pi.circle( x, y, 5 );
	
	requestAnimationFrame( update );
}

update();
```

### Example 5: Multiple Buttons

```javascript
// Listen for face buttons (A, B, X, Y)
pi.ongamepad( 0, "down", [ 0, 1, 2, 3 ], ( data ) => {
	console.log( `Face button ${data.index} pressed` );
} );

// Listen for shoulder buttons
pi.ongamepad( 0, "down", [ 4, 5 ], ( data ) => {
	console.log( `Shoulder button ${data.index} pressed` );
} );
```

### Example 6: D-Pad Navigation

```javascript
// D-Pad buttons are typically 12-15
pi.ongamepad( 0, "down", 12, () => {
	console.log( "D-Pad Up" );
} );

pi.ongamepad( 0, "down", 13, () => {
	console.log( "D-Pad Down" );
} );

pi.ongamepad( 0, "down", 14, () => {
	console.log( "D-Pad Left" );
} );

pi.ongamepad( 0, "down", 15, () => {
	console.log( "D-Pad Right" );
} );
```

### Example 7: Continuous Button Hold

```javascript
let speed = 0;

// Without allowRepeat - fires once when pressed
pi.ongamepad( 0, "pressed", 0, ( data ) => {
	console.log( "Button pressed (fires once)" );
} );

// With allowRepeat - fires continuously while held
pi.ongamepad( 0, "pressed", 1, ( data ) => {
	speed += 0.1;
	console.log( "Accelerating:", speed );
}, false, true );

pi.ongamepad( 0, "up", 1, () => {
	speed = 0;
} );
```

### Example 8: Listen for All Axis Changes

```javascript
// Listen for any axis change on any stick
pi.ongamepad( 0, "axis", null, ( changedAxes ) => {
	for( const axis of changedAxes ) {
		console.log( `Axis ${axis.index} changed:` );
		console.log( `  Current: ${axis.value}` );
		console.log( `  Previous: ${axis.lastValue}` );
		console.log( `  Delta: ${axis.value - axis.lastValue}` );
	}
} );
```

## Standard Gamepad Button Mapping

Most gamepads follow this standard button mapping:

| Button Index | Common Label | Xbox | PlayStation |
|--------------|--------------|------|-------------|
| 0 | A / Cross | A | ✕ |
| 1 | B / Circle | B | ○ |
| 2 | X / Square | X | □ |
| 3 | Y / Triangle | Y | △ |
| 4 | Left Bumper | LB | L1 |
| 5 | Right Bumper | RB | R1 |
| 6 | Left Trigger | LT | L2 |
| 7 | Right Trigger | RT | R2 |
| 8 | Select / Share | Back | Share |
| 9 | Start / Options | Start | Options |
| 10 | Left Stick Press | LS | L3 |
| 11 | Right Stick Press | RS | R3 |
| 12 | D-Pad Up | D-Up | D-Up |
| 13 | D-Pad Down | D-Down | D-Down |
| 14 | D-Pad Left | D-Left | D-Left |
| 15 | D-Pad Right | D-Right | D-Right |
| 16 | Home / Guide | Xbox | PS |

## Standard Gamepad Axis Mapping

| Axis Index | Description |
|------------|-------------|
| 0 | Left Stick Horizontal (-1 = left, +1 = right) |
| 1 | Left Stick Vertical (-1 = up, +1 = down) |
| 2 | Right Stick Horizontal (-1 = left, +1 = right) |
| 3 | Right Stick Vertical (-1 = up, +1 = down) |

## Window Blur Handling

When the browser window loses focus, gamepad polling is automatically paused to prevent stuck buttons and wasted CPU cycles. When the window regains focus, polling automatically resumes. This happens automatically and requires no special handling.

## Notes

- Gamepad support requires user interaction (button press) to activate in most browsers
- The gamepad module is global and works independently of screens
- The `axes2` property contains calibrated axis values with deadzone applied
- Use `axes2` instead of `axes` for smoother, more responsive controls
- Multiple gamepads are supported, each identified by its `gamepadIndex`
- The "pressed" mode with `allowRepeat: true` is useful for continuous actions like movement
- Connection/disconnection events fire automatically when gamepads are plugged in or removed
- Axis events only fire when the axis value **changes**, not just when non-zero (saves CPU and provides cleaner events)
- Use `item: null` in axis mode to listen for all axis changes at once
- Each gamepad tracks `lastAxes2` to detect axis changes between frames
