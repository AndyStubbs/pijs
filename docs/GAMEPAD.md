# Pi.js Gamepad Plugin

The gamepad plugin reads game controllers through the browser's Gamepad API. It polls every
connected pad once per animation frame, reports what happened since the previous frame, and calls
handlers when pads connect or disconnect. Its commands are global: they do not depend on a screen.
The plugin is 2.0.0.

## Contents

- [Loading](#loading)
- [Reading Pads](#reading-pads)
- [Buttons and Axes](#buttons-and-axes)
- [Connections](#connections)
- [Dead Zone](#dead-zone)
- [Vibration](#vibration)
- [Starting, Stopping, and Hidden Pages](#starting-stopping-and-hidden-pages)
- [Commands](#commands)
- [Examples](#examples)

## Loading

Pi.js Full includes the gamepad plugin in both its IIFE and ESM builds; loading the standalone
plugin as well throws `DUPLICATE_PLUGIN`. The standalone plugin is for Pi.js Lite:

```html
<script src="./vendor/pi.lite.js"></script>
<script src="./vendor/gamepad.min.js"></script>
```

With npm, the Lite plugin is `pijs-web/plugins/gamepad`. In the Pi.js repository, build it with
`node scripts/build-plugin.js gamepad`, which writes `build/plugins/gamepad/`.

Browsers expose a pad only after the player presses one of its buttons on the page.

## Reading Pads

```javascript
function update() {
	const pad = $.inGamepad( 0 );
	if( pad ) {
		if( pad.getButtonJustPressed( "south" ) ) {
			player.jump();
		}
		player.x += pad.getAxis( "leftX" ) * 3;
	}
	requestAnimationFrame( update );
}
update();
```

- `inGamepad( index )` returns the pad with that index, or `null` when no pad has it.
- `inGamepad()` returns an array of every connected pad in index order, empty when none is
  connected. It is one live array, refilled on each call. The list is compact, so a pad's position
  in it is not always its index; use its `index` property.
- The first read starts polling, unless `stopGamepad()` was called.

A pad is a live object: every read returns the same object, updated in place, including its
`buttons` array, each button, `axes`, and `lastAxes`. Copy values to keep a snapshot.

The first read in each animation frame updates every pad with what happened since the previous
frame that had a read, so a press and a release between two reads are both reported. Every other
read in the same frame sees the same values, whether it is an `inGamepad()` call or a pad method,
on the same pad object or one kept from earlier.

A pad has `index`, `id`, `connected`, `mapping` (`"standard"` or empty), `timestamp`,
`vibrationActuator`, `buttons`, `axes`, and `lastAxes`, the axis values at the previous read.

## Buttons and Axes

| Method | Returns |
| --- | --- |
| `getButton( button )` | The button object: `pressed`, `value` (0 to 1), `pressStarted`, and `pressReleased` |
| `getButtonPressed( button )` | Whether the button is held |
| `getButtonJustPressed( button )` | Whether it was pressed since the previous read |
| `getButtonJustReleased( button )` | Whether it was released since the previous read |
| `getAxis( axis )` | The axis value, from -1 to 1, after the dead zone |
| `getAxisChanged( axis )` | Whether the value differs from the previous read |

The methods take a non-negative integer index or a name from the standard mapping, which reads
the button or axis at that position on any pad:

| Index | Button name | Usual label |
| --- | --- | --- |
| 0 | `south` | A (Xbox), Cross (PlayStation) |
| 1 | `east` | B, Circle |
| 2 | `west` | X, Square |
| 3 | `north` | Y, Triangle |
| 4 | `leftShoulder` | LB, L1 |
| 5 | `rightShoulder` | RB, R1 |
| 6 | `leftTrigger` | LT, L2 |
| 7 | `rightTrigger` | RT, R2 |
| 8 | `select` | View, Share |
| 9 | `start` | Menu, Options |
| 10 | `leftStick` | Left stick press |
| 11 | `rightStick` | Right stick press |
| 12 | `dpadUp` | D-pad up |
| 13 | `dpadDown` | D-pad down |
| 14 | `dpadLeft` | D-pad left |
| 15 | `dpadRight` | D-pad right |
| 16 | `home` | Xbox, PS button |

| Index | Axis name | Direction |
| --- | --- | --- |
| 0 | `leftX` | Left stick, -1 left to 1 right |
| 1 | `leftY` | Left stick, -1 up to 1 down |
| 2 | `rightX` | Right stick, -1 left to 1 right |
| 3 | `rightY` | Right stick, -1 up to 1 down |

Names are exact, and a button method does not take an axis name. An index past the pad's buttons
or axes reads as empty: `null` from `getButton()`, 0 from `getAxis()`, and `false` from the others.
A value that is neither an integer nor a string throws a `TypeError`, and a negative index or an
unknown name, including `"0"`, a `RangeError`, both with code `INVALID_INDEX`.

A pad starts with every button released, so a button held when the pad appears, such as the press
that makes the browser expose it, is reported as just pressed on a later read.

## Connections

```javascript
function addPlayer( pad ) {
	players[ pad.index ] = createPlayer( pad.index );
}
function removePlayer( pad ) {
	delete players[ pad.index ];
}

$.onGamepad( "connect", addPlayer );
$.onGamepad( "disconnect", removePlayer );

// Later
$.offGamepad( "connect", addPlayer );
```

- A `"connect"` handler receives the pad. It also receives each pad already connected when it is
  registered, in index order, and each connection once.
- A `"disconnect"` handler receives the pad's `index`, `id`, and `mapping`, with `connected: false`.
  The pad has already left the `inGamepad()` list.
- A handler is identified by its mode and function: registering the same one again does nothing.
  `once` removes it before its first call, so a `once` connect handler receives one pad.
- `offGamepad( mode, fn )` removes that handler, `offGamepad( mode )` every handler of the mode,
  and `offGamepad( null, fn )` the function from both modes. `clearEvents( "gamepad" )` removes
  every handler.
- Handlers run from a copy of the list: one registered during a dispatch first runs for the next
  one, one removed during it does not run later in it, and one that throws is reported with
  `console.error()` while the others still run.

## Dead Zone

`setGamepadDeadZone( deadZone )`, or `set( { "gamepadDeadZone": value } )`, sets the dead zone that
hides stick drift. The default is 0.2, and the value is from 0 to under 1. Inside it an axis reads
0; outside it the value is rescaled to start from 0 at its edge and still reach 1 at full tilt.

On pads with the standard mapping, the two sticks use a radial dead zone: the stick's distance
from the center is compared with the dead zone, and the stick keeps its direction, so diagonal and
near-axis movement is not lost or snapped to an axis, and a full diagonal reads a distance of 1.
Other axes, and every axis of a pad without the standard mapping, use the dead zone on their own.

## Vibration

```javascript
$.vibrateGamepad( 0, 200, 1, 0.3 );
```

`vibrateGamepad( gamepadIndex, duration, strong, weak )` plays the pad's dual-rumble effect for
`duration` milliseconds, with the strong (low-frequency) and weak (high-frequency) motors at
magnitudes from 0 to 1, each 1 when omitted. It returns `true` when the pad supports the effect,
and `false` when it does not, such as in Firefox and iOS Safari, or when no pad has the index. A
new effect replaces one still playing, and a duration of 0 stops the rumble. Vibration does not
start polling.

## Starting, Stopping, and Hidden Pages

Polling starts on first use: the first `inGamepad()` call or `onGamepad()` registration. Before
then the plugin adds no listeners. `startGamepad()` starts it explicitly, and is needed only after
`stopGamepad()`.

`stopGamepad()` holds until `startGamepad()`: reads and registrations do not restart it. While
stopped, `inGamepad()` returns an empty array and `inGamepad( index )` returns `null`, every button
is released and the axes read 0, and connection handlers are not called. `startGamepad()` catches
up: pads that disconnected are removed through the `"disconnect"` handlers, and the `"connect"`
handlers receive the pads that connected. A button pressed while stopped reads as held, not as
just pressed.

Polling continues when the window loses focus but the page stays visible. When the page is hidden,
every button is released and the axes read 0, without reporting a release; a button still held
when the page returns reads as pressed, not as just pressed.

## Commands

| Command | Purpose |
| --- | --- |
| `inGamepad( gamepadIndex )` | One pad or `null`; without an index, the array of connected pads |
| `onGamepad( mode, fn, once )` | Registers a `"connect"` or `"disconnect"` handler |
| `offGamepad( mode, fn )` | Removes handlers |
| `setGamepadDeadZone( deadZone )` | Sets the dead zone, 0 to under 1 (default 0.2) |
| `vibrateGamepad( gamepadIndex, duration, strong, weak )` | Plays a rumble; returns whether it can |
| `startGamepad()`, `stopGamepad()` | Start or stop polling |

Every command also takes one options object. Invalid arguments throw a `TypeError` for a wrong
type or a `RangeError` for a value out of range, with a code for the parameter: `INVALID_INDEX`,
`INVALID_MODE`, `INVALID_FUNCTION`, `INVALID_ONCE`, `INVALID_DEAD_ZONE`, `INVALID_DURATION`,
`INVALID_STRONG`, or `INVALID_WEAK`.

## Examples

### Movement and Jumping

```javascript
$.screen( "320x200" );
const player = { "x": 160, "y": 100 };

function update() {
	const pad = $.inGamepad( 0 );
	if( pad ) {
		player.x += pad.getAxis( "leftX" ) * 2;
		player.y += pad.getAxis( "leftY" ) * 2;
		if( pad.getButtonJustPressed( "south" ) ) {
			$.vibrateGamepad( pad.index, 80, 0.5, 0.5 );
		}
	}
	$.cls();
	$.circle( player.x, player.y, 6, 15 );
	requestAnimationFrame( update );
}
update();
```

### Menu Navigation with the D-Pad

```javascript
let selected = 0;

function update() {
	for( const pad of $.inGamepad() ) {
		if( pad.getButtonJustPressed( "dpadDown" ) ) {
			selected = ( selected + 1 ) % items.length;
		}
		if( pad.getButtonJustPressed( "dpadUp" ) ) {
			selected = ( selected + items.length - 1 ) % items.length;
		}
		if( pad.getButtonJustPressed( "south" ) ) {
			choose( items[ selected ] );
		}
	}
	requestAnimationFrame( update );
}
update();
```

### Holding a Button

```javascript
function update() {
	const pad = $.inGamepad( 0 );
	if( pad && pad.getButtonPressed( "rightTrigger" ) ) {
		const pressure = pad.getButton( "rightTrigger" ).value;
		accelerate( pressure );
	}
	requestAnimationFrame( update );
}
update();
```

### One Player per Pad

```javascript
const players = {};

$.onGamepad( "connect", function( pad ) {
	players[ pad.index ] = { "x": 40 + pad.index * 60, "y": 100 };
} );
$.onGamepad( "disconnect", function( pad ) {
	delete players[ pad.index ];
} );

function update() {
	for( const pad of $.inGamepad() ) {
		const player = players[ pad.index ];
		if( player ) {
			player.x += pad.getAxis( "leftX" ) * 2;
		}
	}
	requestAnimationFrame( update );
}
update();
```
