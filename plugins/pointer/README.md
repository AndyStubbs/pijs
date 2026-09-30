# Pointer Plugin

Mouse, pen, touch, and wheel input for Pi.js 2.3: polling, per-mode handlers with hit boxes, a
press that follows the mouse or the primary touch, clicks, and per-screen gesture settings. The
plugin is 2.0.0.

## Loading

Pi.js Full includes the pointer plugin in both its IIFE and ESM builds; loading the standalone
plugin as well throws `DUPLICATE_PLUGIN`. The standalone plugin is for Pi.js Lite:

```html
<script src="./vendor/pi.lite.js"></script>
<script src="./vendor/pointer.min.js"></script>
```

```javascript
import pi from "./vendor/pi.lite.esm.min.js";
import "./vendor/pointer.esm.min.js";
```

With npm, the Lite plugin is `pijs-web/plugins/pointer`. In the Pi.js repository, build it with
`node scripts/build-plugin.js pointer`, which writes `build/plugins/pointer/`.

## Commands

Every command is a screen command: `$.onMouse()` uses the active screen, and `screen.onMouse()`
a given one. Each screen tracks its own canvas; an offscreen screen has no pointer input.

| Command | Purpose |
| --- | --- |
| `inMouse()`, `inTouch()`, `inPress()` | Poll the mouse, the touches down, or the press |
| `onMouse( mode, fn, once, hitBox, customData )`, `offMouse( mode, fn )` | Mouse and pen handlers |
| `onTouch( mode, fn, once, hitBox, customData )`, `offTouch( mode, fn )` | Touch handlers |
| `onPress( mode, fn, once, hitBox, customData )`, `offPress( mode, fn )` | Mouse or primary-touch handlers |
| `onClick( fn, once, hitBox, customData )`, `offClick( fn )` | Click handlers |
| `onWheel( fn, once, hitBox, customData )`, `offWheel( fn )` | Wheel handlers |
| `startMouse()`, `stopMouse()`, `startTouch()`, `stopTouch()` | Start or stop tracking |
| `setContextMenu( isEnabled )` | Lets the browser's context menu open on the canvas |
| `setPinchZoom( isEnabled )` | Lets a pinch on the canvas zoom the page |

The modes are `"down"`, `"move"`, and `"up"`.

## Data

Mouse, touch, press, and click data share one shape, frozen and created once per event:

| Field | Meaning |
| --- | --- |
| `x`, `y` | Position in screen pixels; screen-relative inside views |
| `lastX`, `lastY` | Position before this event; the current position on a pointer's first event |
| `buttons` | Mouse: bitmask, 1 left, 2 right, 4 middle. Touch: 1 while down, 0 after |
| `action` | `"down"`, `"move"`, or `"up"`; `"click"` for click data |
| `type` | `"mouse"`, `"pen"`, or `"touch"` |
| `id` | The pointer or touch identifier |
| `cancelled` | `true` for a release the player did not make |

Press data adds `touches`, a copy of the touches down, empty for the mouse. Wheel data is
`{ x, y, deltaX, deltaY }`, with deltas in CSS pixels: a line is 16 pixels and a page the window
size.

```javascript
$.screen( "320x200" );

$.onMouse( "move", function( mouse ) {
	if( mouse.buttons & 1 ) {
		$.pset( mouse.x, mouse.y );
	}
} );

function update() {

	// null until the first mouse event
	const mouse = $.inMouse();
	if( mouse ) {
		$.circle( mouse.x, mouse.y, 2 );
	}
	requestAnimationFrame( update );
}
```

## Mouse and Pen

Mouse commands also report pens, with `type: "pen"`. A press that starts on the canvas border or
padding is ignored. A press on the canvas keeps reporting moves after it leaves the canvas, and its
release is reported wherever it happens, at its true position. `inMouse()` returns the data of the
latest mouse event, and `null` before the first event and while mouse tracking is stopped.

## Touch

```javascript
// Each touch arrives in its own call, in an array of one
$.onTouch( "down", function( touches ) {
	const touch = touches[ 0 ];
	$.circle( touch.x, touch.y, 8 );
} );

// Every touch still down
for( const touch of $.inTouch() ) {
	$.pset( touch.x, touch.y );
}
```

`onTouch()` handlers receive the touch the event changed: `"down"` the touch that started, `"move"`
the touch that moved, and `"up"` the touch that ended. `inTouch()` returns the touches still down,
ordered by identifier, and is empty after `stopTouch()`. While touch tracking runs, the canvas has
`touch-action: none`, so the browser does not scroll or zoom with touches on it.

## Press

`onPress()` and `inPress()` follow the primary pointer: the mouse, or the touch that started with
no other touch down, until it lifts. Other touches reach `onTouch()` and `inTouch()` only. After
the primary touch lifts, `inPress()` keeps its release until the next press.

## Click

```javascript
$.onClick( function( click, label ) {
	console.log( label, click.x, click.y );
}, false, { "x": 10, "y": 10, "width": 80, "height": 24 }, "Start" );
```

A click fires when the same pointer is pressed and released inside the hit box: the left mouse
button, or a touch. Each finger clicks on its own. A release outside the box, another mouse
button, or a cancelled touch never clicks. Without a hit box, the screen's size when the handler
is registered is used.

## Wheel

`onWheel()` handlers run when the wheel turns or a trackpad scrolls over the canvas. While the
screen has wheel handlers, the page does not scroll with the wheel over the canvas; it scrolls
again when the last one is removed. Wheel handlers need no tracking, so the mouse start and stop
commands do not affect them.

## Handlers

- A hit box is `{ x, y, width, height }` in screen pixels, with fractional values allowed. With
  one, a handler runs only for events inside it. `customData` is passed to the handler as its
  second argument.
- A handler is identified by its mode and function (click and wheel have one mode). Registering
  the same function again does nothing, whatever its `once`, hit box, and custom data. `once`
  removes the registration before the handler runs.
- `offX( mode, fn )` removes that handler, `offX( mode )` every handler of the mode, and
  `offX( null, fn )` the function from every mode. `offMouse()`, `offTouch()`, and `offPress()` with
  neither throw `INVALID_MODE`; `offClick()` and `offWheel()` without a function remove every
  handler.
- State is updated before handlers run. A handler registered during an event first runs for the
  next one, and one removed during an event does not run later in it. A handler that throws is
  reported with `console.error()`, and the other handlers still run.
- A handler that stops the event's tracking or removes its screen ends the event: no press,
  click, or pointer capture follows it.

## Cancelled Releases

Held buttons and touches are released through the `"up"` handlers with `cancelled: true` when the
browser cancels the pointer, the page is hidden, or `stopMouse()` or `stopTouch()` is called. No
click fires for them. Blur does not release anything.

## Starting and Stopping

Tracking starts on first use: the first read or handler registration. After `stopMouse()` or
`stopTouch()`, only the matching start command resumes it; handlers stay registered but are not
called.

## Gestures and the Context Menu

The browser's context menu is suppressed on the canvas from screen creation, so right-clicks reach
the mouse handlers; `setContextMenu( true )` lets it open. `setPinchZoom( true )` sets the canvas's
`touch-action` to `pinch-zoom`, so a pinch that starts on it zooms the page; `false` sets `none`.
Neither changes the rest of the page or starts tracking. `set( { "contextMenu": true,
"pinchZoom": false } )` sets both.

## Clearing and Errors

`clearEvents()` takes `"mouse"`, `"touch"`, `"press"`, `"click"`, and `"wheel"`, each clearing only
its own handlers. `$.clearEvents()` clears them on every screen, and a screen's `clearEvents()` on
that screen only. Clearing does not stop tracking.

Invalid arguments throw a `TypeError` for a wrong type or a `RangeError` for an unknown mode or a
negative hit-box size, with code `INVALID_MODE`, `INVALID_FUNCTION`, `INVALID_ONCE`,
`INVALID_HITBOX`, or `INVALID_IS_ENABLED`.

## License

Apache-2.0
