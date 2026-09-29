# Keyboard Plugin

Keyboard input for Pi.js 2.3: key state polling, key handlers and combinations, action keys that
keep the browser from scrolling, and a text or numeric `input()` prompt. The plugin is 2.0.0.

## Loading

Pi.js Full includes the keyboard plugin in both its IIFE and ESM builds; loading the standalone
plugin as well throws `DUPLICATE_PLUGIN`. The standalone plugin is for Pi.js Lite:

```html
<script src="./vendor/pi.lite.js"></script>
<script src="./vendor/keyboard.min.js"></script>
```

```javascript
import pi from "./vendor/pi.lite.esm.min.js";
import "./vendor/keyboard.esm.min.js";
```

With npm, the Lite plugin is `pijs-web/plugins/keyboard`. In the Pi.js repository, build it with
`node scripts/build-plugin.js keyboard`, which writes `build/plugins/keyboard/`.

## Commands

| Command | Purpose |
| --- | --- |
| `inKey( key )` | The key data of a held key, or `null`; without a key, every held key |
| `onKey( key, mode, fn, once, allowRepeat )` | Registers a `"down"` or `"up"` handler |
| `offKey( key, mode, fn )` | Removes key handlers |
| `setActionKeys( keys )` | Replaces the keys whose browser default is prevented |
| `removeActionKeys( keys )` | Removes some action keys |
| `startKeyboard()`, `stopKeyboard()` | Start or stop keyboard tracking |
| `input( prompt, fn, cursor, isNumber, isInteger, allowNegative, maxLength )` | Prompts for text or a number |
| `cancelInput()` | Cancels the active prompt |

Every command also takes one options object, such as `$.onKey( { "key": "Space", "mode": "down",
"fn": jump } )`.

## Keys

Name a key by its code, such as `"KeyA"`, `"Space"`, `"ArrowLeft"`, or `"ShiftLeft"`, which names
a physical key whatever the keyboard layout and modifiers, or by its value, such as `"a"`, `" "`,
or `"Shift"`, which names the character it types. Codes suit game controls. A value is held while
any key that produced it is held.

Key data is frozen and has `code`, `key`, `location`, `altKey`, `ctrlKey`, `metaKey`, `shiftKey`,
`repeat`, and `cancelled`.

```javascript
function update() {
	if( $.inKey( "ArrowLeft" ) ) {
		playerX -= 2;
	}

	// Every held key, ordered by its latest keydown
	for( const keyData of $.inKey() ) {
		$.print( keyData.code );
	}
	requestAnimationFrame( update );
}
```

`inKey()` without a key returns the same frozen array until a key is pressed or released, so
reading it every frame does not allocate.

## Handlers

```javascript
function jump( keyData ) {
	player.jump();
}
$.onKey( "Space", "down", jump );

// Every key
$.onKey( "any", "down", function( keyData ) {
	console.log( keyData.key );
} );

// A combination runs when all its keys are held, with their data in the order given
$.onKey( [ "ControlLeft", "KeyS" ], "down", function( keys ) {
	save();
} );

// Once, then removed
$.onKey( "Enter", "down", start, true );

$.offKey( "Space", "down", jump );
```

- A handler is identified by its key or combination, its mode, and its function. Registering the
  same one again does nothing, whatever its `once` and `allowRepeat`.
- `offKey( key, mode, fn )` removes that handler, `offKey( key, mode )` every handler of the mode,
  and `offKey( key, null, fn )` the function from both modes. `offKey( key )` alone throws.
- `"down"` handlers receive the keydown's data and run for key repeats only with `allowRepeat`.
  `"up"` handlers receive the keyup's data.
- Key state is updated before handlers run: in an `"up"` handler, `inKey()` no longer reports the
  released key. A handler registered during a key event first runs for the next one.
- A handler that throws is reported with `console.error()`, and the other handlers still run.
- A combination's array is copied, and a key listed twice counts once; `"any"` cannot be part of
  one.

## Cancelled Releases

Keys the player did not release are released through the `"up"` handlers, with
`cancelled: true`: when the window loses focus, the page is hidden, `stopKeyboard()` is called, a
key comes from an editable element, or an `input()` prompt starts. Each held key is released once.

Keys typed into an editable element on the page, such as an input field, are ignored.

## Starting and Stopping

The keyboard starts on first use: the first `inKey()` call, `onKey()` registration, or
`setActionKeys()` call. Before then the plugin adds no listeners, so earlier key presses are not
tracked; call `startKeyboard()` to track from an earlier point. `stopKeyboard()` releases held
keys and holds until `startKeyboard()`: reads and registrations do not restart it, and handlers
stay registered but are not called.

## Action Keys

```javascript
// Arrow keys and Space no longer scroll the page
$.setActionKeys( [ "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space" ] );

$.removeActionKeys( [ "Space" ] );
```

`setActionKeys()` and `set( { "actionKeys": [ ... ] } )` replace the action keys, so pass every
key in one call; an empty array clears them.

## Input Prompt

```javascript
const name = await $.input( "Name: " );
const age = await $.input( { "prompt": "Age: ", "isInteger": true, "maxLength": 3 } );
```

`input()` shows a prompt at the print cursor and returns a promise. Enter completes it and Escape
cancels it, which resolves `null`. Only one prompt is active at a time.

- The prompt reads its own keys, so it works after `stopKeyboard()`, and its keys, including the
  Enter that ends it, do not reach `onKey()` handlers or `inKey()`.
- It prevents the default action of the keys it handles; Ctrl and Meta shortcuts are left to the
  browser, and pasted text is inserted.
- The prompt keeps to one line, and printing continues on the line below it.
- With `isNumber` or `isInteger`, the value is a number, and a value with no digits is 0.
- `cancelInput()`, another `input()`, `clearEvents( "keyboard" )`, or removing the prompt's screen
  cancels it.

## Clearing and Errors

`clearEvents( "keyboard" )` removes every key handler. `$.clearEvents()` also cancels every
prompt, and a screen's `clearEvents()` cancels only that screen's prompt. Clearing does not stop
tracking.

Invalid arguments throw a `TypeError` for a wrong type or a `RangeError` for a value out of range,
with a code for the parameter: `INVALID_KEY`, `INVALID_MODE`, `INVALID_FUNCTION`, `INVALID_ONCE`,
`INVALID_ALLOW_REPEAT`, `INVALID_KEYS`, and the `input()` codes.

## License

Apache-2.0
