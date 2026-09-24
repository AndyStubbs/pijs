/**
 * Pointer 2.3 audit probes: reproductions for the findings in
 * docs/plans/POINTER-V2.3-AUDIT.md, run against fresh in-memory bundles of the current source
 * in Chromium, Firefox, and WebKit.
 *
 * Each probe creates a 100x100 screen, dispatches synthetic mouse and touch events on its
 * canvas, runs one scenario, and records what it observed next to what a correct plugin would
 * do. The script changes no library code or tests.
 *
 * Run with `node docs/evidence/pointer-2.3/probes.js`; it writes `probes-output.json` next to
 * this file. No server is required.
 */
import * as g_fs from "node:fs/promises";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_childProcess from "node:child_process";
import * as g_playwright from "@playwright/test";
import * as g_harness from "../../../test/unit/browser-source-harness.js";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const OUTPUT_FILE = g_path.join( DIRNAME, "probes-output.json" );
const EMPTY_PAGE = "<!doctype html><html><body style='margin:0'></body></html>";
const ENGINES = [ "chromium", "firefox", "webkit" ];
const MANUAL_PAGES = [
	"contextmenu_01.html", "ontouch_01.html", "ontouch_02.html", "ontouch_03.html",
	"clearevents_01.html", "clearevents_02.html", "events_comprehensive.html"
];


/*************************************************************************************************
 * Page Helpers
 ************************************************************************************************/


/**
 * Install event helpers. Runs in the page after the bundle loads.
 *
 * `window.__p` exposes:
 * - `setup( aspect )`: create a screen and remember its canvas.
 * - `mouse( type, x, y, init, target )`: dispatch a `MouseEvent` at the center of logical pixel
 *   (x, y); returns the event so a probe can read `defaultPrevented`.
 * - `touch( type, touches, changed )`: dispatch a touch event. Touch lists are plain objects
 *   with `identifier`, `clientX`, `clientY`, and `target`, which is all the plugin reads, so
 *   the same events work in every engine (desktop Firefox and WebKit have no `Touch`
 *   constructor).
 * - `sum( data )`: a short summary of callback or polling data.
 * - `errors`: messages of uncaught errors, including those thrown by event listeners.
 */
function installHelpers() {
	const p = { "errors": [] };
	window.addEventListener( "error", event => {
		p.errors.push( event.message );
	} );

	p.setup = ( aspect = "100x100" ) => {
		const screen = $.screen( aspect );
		p.screen = screen;
		p.canvas = screen.canvas();
		p.width = screen.width();
		p.height = screen.height();
		return screen;
	};

	p.client = ( x, y ) => {
		const rect = p.canvas.getBoundingClientRect();
		return {
			"clientX": rect.left + ( x + 0.5 ) * rect.width / p.width,
			"clientY": rect.top + ( y + 0.5 ) * rect.height / p.height
		};
	};

	p.mouse = ( type, x, y, init = {}, target = p.canvas ) => {
		const event = new MouseEvent( type, {
			"bubbles": true, "cancelable": true, "button": 0, "buttons": 0,
			...p.client( x, y ), ...init
		} );
		target.dispatchEvent( event );
		return event;
	};

	p.touch = ( type, touches, changed = touches ) => {
		const make = t => ( { "identifier": t.id, "target": p.canvas, ...p.client( t.x, t.y ) } );
		const event = new Event( type, { "bubbles": true, "cancelable": true } );
		Object.defineProperty( event, "touches", { "value": touches.map( make ) } );
		Object.defineProperty( event, "targetTouches", { "value": touches.map( make ) } );
		Object.defineProperty( event, "changedTouches", { "value": changed.map( make ) } );
		p.canvas.dispatchEvent( event );
		return event;
	};

	p.sum = data => {
		const one = d => {
			const out = { "x": d.x, "y": d.y, "action": d.action };
			if( d.id !== undefined ) { out.id = d.id; }
			if( d.buttons !== undefined ) { out.buttons = d.buttons; }
			return out;
		};
		if( Array.isArray( data ) ) {
			return data.map( one );
		}
		return one( data );
	};

	window.__p = p;
}


/*************************************************************************************************
 * Probes
 *
 * Each probe is a page function returning `{ observed, expected, confirmed }`, where
 * `confirmed` is true when the observed behavior differs from the expected contract.
 ************************************************************************************************/


const PROBES = {};

/**
 * P1: removing handlers changes a per-type counter that gates all dispatch of that type.
 * `off*( mode )` sets it to 0 while handlers remain in other modes, and `off*( mode, fn )`
 * decrements it even when `fn` was never registered.
 */
PROBES.P1 = async () => {
	const p = window.__p;
	p.setup();
	const log = [];
	const other = () => {};

	// Clear one mode; handlers in another mode remain.
	$.onmouse( "down", () => log.push( "mouse down" ) );
	$.onmouse( "move", other );
	$.offmouse( "move" );
	$.ontouch( "start", () => log.push( "touch start" ) );
	$.ontouch( "move", other );
	$.offtouch( "move" );
	$.onpress( "down", () => log.push( "press down" ) );
	$.onpress( "up", other );
	$.offpress( "up" );
	p.mouse( "mousedown", 10, 10, { "buttons": 1 } );
	p.mouse( "mouseup", 10, 10 );
	p.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	p.touch( "touchend", [], [ { "id": 1, "x": 10, "y": 10 } ] );
	const clearMode = log.slice();

	// Remove a handler that was never registered.
	$.clearEvents();
	log.length = 0;
	$.onmouse( "down", () => log.push( "mouse down" ) );
	$.offmouse( "down", other );
	$.onclick( () => log.push( "click" ) );
	$.offclick( other );
	p.mouse( "mousedown", 20, 20, { "buttons": 1 } );
	p.mouse( "mouseup", 20, 20 );
	const removeUnknown = log.slice();

	return {
		"observed": { "afterClearingOtherMode": clearMode, "afterRemovingUnknownFn": removeUnknown },
		"expected": {
			"afterClearingOtherMode": [ "mouse down", "press down", "touch start", "press down" ],
			"afterRemovingUnknownFn": [ "mouse down", "click" ]
		},
		"confirmed": clearMode.length < 4 || removeUnknown.length < 2
	};
};

/**
 * P2: touch data is built from `event.touches`, the touches still down, so the touch that
 * ended is never reported and every remaining touch takes the event's action.
 */
PROBES.P2 = async () => {
	const p = window.__p;
	p.setup();
	const box = { "x": 0, "y": 0, "width": 20, "height": 20 };
	const endAll = [];
	let endHit = 0;
	$.ontouch( "end", data => endAll.push( p.sum( data ) ) );
	$.ontouch( "end", () => { endHit += 1; }, false, box );

	// One finger lifts inside the hit box.
	p.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	p.touch( "touchend", [], [ { "id": 1, "x": 10, "y": 10 } ] );
	const hitOnLiftInside = endHit;

	// Two fingers; the second lifts outside the hit box while the first stays down inside it.
	const f1 = { "id": 1, "x": 10, "y": 10 };
	const f2 = { "id": 2, "x": 80, "y": 80 };
	p.touch( "touchstart", [ f1 ] );
	p.touch( "touchstart", [ f1, f2 ], [ f2 ] );
	p.touch( "touchend", [ f1 ], [ f2 ] );
	const hitOnLiftOutside = endHit - hitOnLiftInside;
	const pollAfterSecondLift = p.sum( $.intouch() );

	return {
		"observed": {
			"endHandlerData": endAll, hitOnLiftInside, hitOnLiftOutside, pollAfterSecondLift
		},
		"expected": {
			"endHandlerData": "[ touch 1 at 10,10 ended ], then [ touch 2 at 80,80 ended ]",
			"hitOnLiftInside": 1,
			"hitOnLiftOutside": 0,
			"pollAfterSecondLift": "touch 1 still down with action start"
		},
		"confirmed": hitOnLiftInside !== 1 || hitOnLiftOutside !== 0 ||
			endAll[ 0 ].length === 0 || pollAfterSecondLift[ 0 ].action === "end"
	};
};

/**
 * P3: with two touches, press and click report the first touch in the list, not the one that
 * changed, and lifting one finger sends press `up` with `action: "end"` and `buttons: 1`.
 */
PROBES.P3 = async () => {
	const p = window.__p;
	p.setup();
	const downs = [];
	const ups = [];
	let clicks = 0;
	$.onpress( "down", data => downs.push( p.sum( data ) ) );
	$.onpress( "up", data => ups.push( p.sum( data ) ) );
	$.onclick( () => { clicks += 1; }, false, { "x": 70, "y": 70, "width": 20, "height": 20 } );

	const f1 = { "id": 1, "x": 10, "y": 10 };
	const f2 = { "id": 2, "x": 80, "y": 80 };
	p.touch( "touchstart", [ f1 ] );
	p.touch( "touchstart", [ f1, f2 ], [ f2 ] );
	p.touch( "touchend", [ f1 ], [ f2 ] );
	p.touch( "touchend", [], [ f1 ] );

	return {
		"observed": { "pressDown": downs, "pressUp": ups, "clicksInSecondFingerBox": clicks },
		"expected": {
			"pressDown": "10,10 then 80,80",
			"pressUp": "80,80 then 10,10, each with action up",
			"clicksInSecondFingerBox": 1
		},
		"confirmed": clicks === 0 || downs[ 1 ].x !== 80 || ups[ 0 ].action !== "up"
	};
};

/**
 * P4: a click listener stays armed after a press that started in its hit box and ended
 * outside it, so a later press that starts outside and ends inside fires a click. A
 * `touchcancel` is treated as a release and fires a click.
 */
PROBES.P4 = async () => {
	const p = window.__p;
	p.setup();
	const box = { "x": 0, "y": 0, "width": 20, "height": 20 };
	let clicks = 0;
	$.onclick( () => { clicks += 1; }, false, box );
	const counts = {};

	// Down inside, up outside: no click.
	p.mouse( "mousedown", 10, 10, { "buttons": 1 } );
	p.mouse( "mousemove", 50, 50, { "buttons": 1 } );
	p.mouse( "mouseup", 50, 50 );
	counts.downInUpOut = clicks;

	// Down outside, up inside: no click expected.
	p.mouse( "mousedown", 50, 50, { "buttons": 1 } );
	p.mouse( "mousemove", 10, 10, { "buttons": 1 } );
	p.mouse( "mouseup", 10, 10 );
	counts.downOutUpIn = clicks - counts.downInUpOut;

	// Touch cancelled by the browser.
	p.touch( "touchstart", [ { "id": 5, "x": 10, "y": 10 } ] );
	p.touch( "touchcancel", [], [ { "id": 5, "x": 10, "y": 10 } ] );
	counts.touchCancel = clicks - counts.downInUpOut - counts.downOutUpIn;

	return {
		"observed": counts,
		"expected": { "downInUpOut": 0, "downOutUpIn": 0, "touchCancel": 0 },
		"confirmed": counts.downOutUpIn > 0 || counts.touchCancel > 0
	};
};

/** P5: `onclick` fires for the right and middle buttons. */
PROBES.P5 = async () => {
	const p = window.__p;
	p.setup();
	const clicks = [];
	$.onclick( data => clicks.push( data.buttons ) );
	const result = {};
	for( const [ name, button, buttons ] of [ [ "right", 2, 2 ], [ "middle", 1, 4 ] ] ) {
		const before = clicks.length;
		p.mouse( "mousedown", 30, 30, { button, buttons } );
		p.mouse( "mouseup", 30, 30, { button, "buttons": 0 } );
		result[ name ] = clicks.length - before;
	}
	return {
		"observed": { "clicks": result, "buttonsInClickData": clicks },
		"expected": { "clicks": { "right": 0, "middle": 0 } },
		"confirmed": result.right > 0 || result.middle > 0
	};
};

/**
 * P6: a throwing handler stops the rest of the dispatch: later handlers of the same type, and
 * the press and click dispatch of the same event. For touch it also skips `preventDefault()`.
 */
PROBES.P6 = async () => {
	const p = window.__p;
	p.setup();
	const ran = { "laterMouse": false, "press": false, "click": false, "laterTouch": false };
	$.onmouse( "down", () => { throw new Error( "probe mouse" ); } );
	$.onmouse( "down", () => { ran.laterMouse = true; } );
	$.onpress( "down", () => { ran.press = true; } );
	$.onclick( () => { ran.click = true; } );
	p.mouse( "mousedown", 10, 10, { "buttons": 1 } );
	p.mouse( "mouseup", 10, 10 );

	$.ontouch( "start", () => { throw new Error( "probe touch" ); } );
	$.ontouch( "start", () => { ran.laterTouch = true; } );
	const event = p.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	p.touch( "touchend", [], [ { "id": 1, "x": 10, "y": 10 } ] );

	return {
		"observed": {
			...ran, "touchDefaultPrevented": event.defaultPrevented,
			"reportedErrors": p.errors.length
		},
		"expected": {
			"laterMouse": true, "press": true, "click": true, "laterTouch": true,
			"touchDefaultPrevented": true, "reportedErrors": 2
		},
		"confirmed": !ran.laterMouse || !ran.press || !ran.click || !event.defaultPrevented
	};
};

/**
 * P7: a handler removed by an earlier handler in the same dispatch still runs, and a `once`
 * handler removes every registration of the same function, including a permanent one.
 */
PROBES.P7 = async () => {
	const p = window.__p;
	p.setup();
	let removedRan = false;
	const removed = () => { removedRan = true; };
	$.onmouse( "down", () => $.offmouse( "down", removed ) );
	$.onmouse( "down", removed );
	p.mouse( "mousedown", 10, 10, { "buttons": 1 } );
	p.mouse( "mouseup", 10, 10 );

	$.clearEvents();
	let calls = 0;
	const fn = () => { calls += 1; };
	$.onmouse( "down", fn, true );
	$.onmouse( "down", fn );
	p.mouse( "mousedown", 10, 10, { "buttons": 1 } );
	p.mouse( "mouseup", 10, 10 );
	p.mouse( "mousedown", 10, 10, { "buttons": 1 } );
	p.mouse( "mouseup", 10, 10 );

	return {
		"observed": { "removedHandlerRan": removedRan, "callsOverTwoPresses": calls },
		"expected": { "removedHandlerRan": false, "callsOverTwoPresses": 3 },
		"confirmed": calls !== 3
	};
};

/**
 * P8: a release outside the canvas is never seen, so the button stays down and no `up` is
 * dispatched. Moves outside the canvas are not reported either.
 */
PROBES.P8 = async () => {
	const p = window.__p;
	p.setup();
	document.body.style.minHeight = "400px";
	const log = [];
	$.onmouse( "up", () => log.push( "mouse up" ) );
	$.onpress( "up", () => log.push( "press up" ) );
	$.onpress( "move", data => log.push( "press move " + data.x ) );
	p.mouse( "mousedown", 50, 50, { "buttons": 1 } );
	p.mouse( "mousemove", 99, 50, { "buttons": 1 } );
	p.mouse( "mousemove", 150, 50, { "buttons": 1 }, document.body );
	p.mouse( "mouseup", 150, 50, { "buttons": 0 }, document.body );
	const mouse = $.inmouse();
	const press = $.inpress();
	return {
		"observed": {
			log, "inmouseButtons": mouse.buttons, "inmouseAction": mouse.action,
			"inpressButtons": press.buttons
		},
		"expected": "press up and mouse up dispatched; buttons 0",
		"confirmed": mouse.buttons !== 0 || !log.includes( "press up" )
	};
};

/**
 * P9: window blur resets polled state without dispatching a release, so handlers and polling
 * disagree. Page hiding does nothing.
 */
PROBES.P9 = async () => {
	const p = window.__p;
	p.setup();
	const log = [];
	$.onmouse( "up", () => log.push( "mouse up" ) );
	$.onpress( "up", () => log.push( "press up" ) );
	$.ontouch( "end", () => log.push( "touch end" ) );

	p.mouse( "mousedown", 50, 50, { "buttons": 1 } );
	window.dispatchEvent( new Event( "blur" ) );
	const mouse = p.sum( $.inmouse() );
	const mouseLog = log.slice();

	log.length = 0;
	p.touch( "touchstart", [ { "id": 3, "x": 40, "y": 40 } ] );
	window.dispatchEvent( new Event( "blur" ) );
	const touches = $.intouch().length;
	const press = p.sum( $.inpress() );
	const touchLog = log.slice();

	// Hidden page with a button held.
	log.length = 0;
	p.mouse( "mousedown", 50, 50, { "buttons": 1 } );
	Object.defineProperty( document, "visibilityState", {
		"configurable": true, "get": () => "hidden"
	} );
	Object.defineProperty( document, "hidden", { "configurable": true, "get": () => true } );
	document.dispatchEvent( new Event( "visibilitychange" ) );
	const hiddenButtons = $.inmouse().buttons;

	return {
		"observed": {
			"mouseAfterBlur": mouse, "mouseHandlersAfterBlur": mouseLog,
			"touchesAfterBlur": touches, "pressAfterTouchBlur": press,
			"touchHandlersAfterBlur": touchLog, "buttonsAfterHidden": hiddenButtons
		},
		"expected": "polling and handlers agree: a release reaches the up/end handlers " +
			"whenever polled state is reset",
		"confirmed": mouse.buttons === 0 && mouseLog.length === 0
	};
};

/**
 * P10: `stopMouse()` and `stopTouch()` keep the held state, which polling then reports for
 * as long as input stays stopped.
 */
PROBES.P10 = async () => {
	const p = window.__p;
	p.setup();
	$.startMouse();
	$.startTouch();
	p.mouse( "mousedown", 50, 50, { "buttons": 1 } );
	$.stopMouse();
	const mouse = $.inmouse();
	p.touch( "touchstart", [ { "id": 4, "x": 40, "y": 40 } ] );
	$.stopTouch();
	const touches = $.intouch();
	let onmouseRestarts = false;
	$.onmouse( "down", () => { onmouseRestarts = true; } );
	p.mouse( "mousedown", 50, 50, { "buttons": 1 } );
	return {
		"observed": {
			"inmouseButtonsAfterStop": mouse.buttons, "intouchLengthAfterStop": touches.length,
			"handlerRegistrationRestartsMouse": onmouseRestarts
		},
		"expected": {
			"inmouseButtonsAfterStop": 0, "intouchLengthAfterStop": 0,
			"handlerRegistrationRestartsMouse": false
		},
		"confirmed": mouse.buttons !== 0 || touches.length !== 0
	};
};

/**
 * P11: points on the canvas border or padding still reach the plugin and map outside the
 * screen, and handlers receive the out-of-range position.
 */
PROBES.P11 = async () => {
	const p = window.__p;
	p.setup();
	p.canvas.style.padding = "10px";
	p.canvas.style.border = "5px solid red";
	p.canvas.style.boxSizing = "content-box";
	await new Promise( resolve => setTimeout( resolve, 50 ) );
	const moves = [];
	$.onmouse( "move", data => moves.push( [ data.x, data.y ] ) );
	const rect = p.canvas.getBoundingClientRect();
	const corners = [
		[ rect.left + 1, rect.top + 1 ],
		[ rect.right - 1, rect.bottom - 1 ]
	];
	for( const [ clientX, clientY ] of corners ) {
		p.canvas.dispatchEvent( new MouseEvent( "mousemove", {
			"bubbles": true, clientX, clientY
		} ) );
	}
	const outside = moves.filter(
		m => m[ 0 ] < 0 || m[ 1 ] < 0 || m[ 0 ] >= p.width || m[ 1 ] >= p.height
	);
	return {
		"observed": { moves },
		"expected": "no position outside 0..99, or no event for the border and padding",
		"confirmed": outside.length > 0
	};
};

/**
 * P12: data shapes. The touch `inpress()` result contains itself, so it cannot be serialized;
 * touch press actions use the touch names; click data carries the release action.
 */
PROBES.P12 = async () => {
	const p = window.__p;
	p.setup();
	const shapes = {};
	let clickAction = null;
	$.onclick( data => { clickAction = data.action; } );
	p.mouse( "mousedown", 10, 10, { "buttons": 1 } );
	shapes.mousePress = Object.keys( $.inpress() ).sort();
	shapes.mouseLastX = $.inmouse().lastX;
	p.mouse( "mouseup", 10, 10 );

	const pressActions = [];
	$.onpress( "down", data => pressActions.push( data.action ) );
	p.touch( "touchstart", [ { "id": 9, "x": 20, "y": 20 } ] );
	const touchPress = $.inpress();
	shapes.touchPress = Object.keys( touchPress ).sort();
	shapes.touchLastX = $.intouch()[ 0 ].lastX;
	shapes.pressIncludesItself = Array.isArray( touchPress.touches ) &&
		touchPress.touches[ 0 ] === touchPress;
	try {
		JSON.stringify( touchPress );
		shapes.serializes = true;
	} catch( error ) {
		shapes.serializes = false;
	}
	p.touch( "touchend", [], [ { "id": 9, "x": 20, "y": 20 } ] );
	shapes.touchPressDownAction = pressActions[ 0 ];
	shapes.mouseClickAction = clickAction;

	return {
		"observed": shapes,
		"expected": {
			"serializes": true, "touchPressDownAction": "down (PressData.action)",
			"mouseClickAction": "click (ClickData.action)"
		},
		"confirmed": !shapes.serializes || shapes.touchPressDownAction !== "down"
	};
};

/**
 * P13: validation. Boolean settings coerce any value, so the string "false" enables them;
 * handler errors are plain `Error`s; hit boxes reject fractions but accept negative sizes.
 */
PROBES.P13 = async () => {
	const p = window.__p;
	p.setup();
	const outcomes = {};
	function attempt( name, fn ) {
		try {
			fn();
			outcomes[ name ] = "accepted";
		} catch( error ) {
			outcomes[ name ] = `${error.name} ${error.code}`;
		}
	}
	attempt( "setEnableContextMenu('false')", () => $.setEnableContextMenu( "false" ) );
	outcomes.contextMenuShownAfterStringFalse = !p.mouse( "contextmenu", 10, 10, {
		"button": 2
	} ).defaultPrevented;
	$.setEnableContextMenu( false );
	attempt( "setPinchZoom('false')", () => $.setPinchZoom( "false" ) );
	outcomes.bodyTouchActionAfterStringFalse = document.body.style.touchAction;
	attempt( "onmouse bad mode", () => $.onmouse( "click", () => {} ) );
	attempt( "onmouse fn not function", () => $.onmouse( "down", 5 ) );
	attempt( "hitBox with fractions", () => $.onmouse( "down", () => {}, false, {
		"x": 0.5, "y": 0, "width": 10, "height": 10
	} ) );
	attempt( "hitBox with negative width", () => $.onmouse( "down", () => {}, false, {
		"x": 0, "y": 0, "width": -10, "height": 10
	} ) );
	attempt( "offmouse without mode", () => $.offmouse() );
	return {
		"observed": outcomes,
		"expected": "non-boolean settings rejected; invalid hit boxes rejected",
		"confirmed": outcomes.contextMenuShownAfterStringFalse === true
	};
};

/**
 * P14: context menu and pinch zoom. The menu is suppressed only once mouse tracking has
 * started. `setPinchZoom( true )` does not stop the plugin's `preventDefault()` on touchstart,
 * and the setting replaces the page's own `touch-action` on `<body>`.
 */
PROBES.P14 = async () => {
	const p = window.__p;
	p.setup();
	const observed = {};
	observed.menuPreventedBeforeAnyPointerCommand = p.mouse( "contextmenu", 10, 10, {
		"button": 2
	} ).defaultPrevented;
	$.inmouse();
	observed.menuPreventedAfterInmouse = p.mouse( "contextmenu", 10, 10, {
		"button": 2
	} ).defaultPrevented;

	document.body.style.touchAction = "pan-y";
	$.setPinchZoom( true );
	observed.bodyTouchActionAfterEnable = document.body.style.touchAction;
	$.intouch();
	const two = [ { "id": 1, "x": 10, "y": 10 }, { "id": 2, "x": 60, "y": 60 } ];
	observed.twoFingerStartPreventedWithPinchEnabled = p.touch(
		"touchstart", two
	).defaultPrevented;
	p.touch( "touchend", [], two );
	$.setPinchZoom( false );
	observed.bodyTouchActionAfterDisable = document.body.style.touchAction;
	return {
		"observed": observed,
		"expected": {
			"menuPreventedBeforeAnyPointerCommand": "true (documented default: disabled)",
			"twoFingerStartPreventedWithPinchEnabled": false,
			"bodyTouchActionAfterEnable": "pan-y (the page's own value kept)"
		},
		"confirmed": observed.twoFingerStartPreventedWithPinchEnabled ||
			observed.bodyTouchActionAfterEnable !== "pan-y"
	};
};

/** P15: polling and callbacks allocate new objects on every call and event (inventory). */
PROBES.P15 = async () => {
	const p = window.__p;
	p.setup();
	const seen = [];
	$.onmouse( "move", data => seen.push( data ) );
	$.startTouch();
	p.mouse( "mousemove", 10, 10 );
	p.mouse( "mousemove", 11, 10 );
	p.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	const observed = {
		"inmouseSameObject": $.inmouse() === $.inmouse(),
		"intouchSameArray": $.intouch() === $.intouch(),
		"inpressSameObject": $.inpress() === $.inpress(),
		"callbackSameObject": seen[ 0 ] === seen[ 1 ]
	};
	p.touch( "touchend", [], [ { "id": 1, "x": 10, "y": 10 } ] );
	return {
		"observed": observed,
		"expected": "inventory only",
		"confirmed": false
	};
};

/**
 * P16 (control): Lite with the standalone plugin loaded after a screen exists; the commands
 * work and a window blur does not throw.
 */
PROBES.P16 = async () => {
	const p = window.__p;
	const log = [];
	$.onpress( "down", data => log.push( p.sum( data ) ) );
	p.mouse( "mousedown", 10, 10, { "buttons": 1 } );
	window.dispatchEvent( new Event( "blur" ) );
	return {
		"observed": { log, "errors": p.errors },
		"expected": "one press at 10,10; no errors",
		"confirmed": log.length !== 1 || p.errors.length > 0
	};
};


/**
 * P17: the PTR-001 counter drift reached through a dependent. `showKeyboard()` removes its
 * own press handlers before adding them, which decrements the counter for handlers it never
 * added; `hideKeyboard()` then drops the counter to 0 while the game's handler remains.
 */
PROBES.P17 = async () => {
	const p = window.__p;
	p.setup( "300x200" );
	let gameDowns = 0;
	$.onpress( "down", () => { gameDowns += 1; } );
	p.mouse( "mousedown", 150, 20, { "buttons": 1 } );
	p.mouse( "mouseup", 150, 20 );
	const before = gameDowns;
	$.showKeyboard( "text" );
	$.hideKeyboard();
	p.mouse( "mousedown", 150, 20, { "buttons": 1 } );
	p.mouse( "mouseup", 150, 20 );
	return {
		"observed": { "gamePressDownsBeforeKeyboard": before,
			"gamePressDownsAfterShowAndHide": gameDowns - before },
		"expected": { "gamePressDownsBeforeKeyboard": 1, "gamePressDownsAfterShowAndHide": 1 },
		"confirmed": gameDowns - before !== 1
	};
};

/**
 * T1: the mouse scenarios of P4, P5, and P8 repeated with Playwright's trusted input, which
 * the browser routes and targets itself (including a release outside the canvas and the
 * browser's own `contextmenu` event).
 *
 * @param {Object} browser - Playwright browser.
 * @param {string} full - Full bundle.
 * @returns {Promise<Object>} Probe result plus page errors.
 */
async function runTrustedProbe( browser, full ) {
	const page = await browser.newPage( { "viewport": { "width": 800, "height": 600 } } );
	const pageErrors = [];
	page.on( "pageerror", error => pageErrors.push( error.message ) );
	try {
		await page.setContent( EMPTY_PAGE );
		await page.addScriptTag( { "content": full } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => {
			const host = document.createElement( "div" );
			host.style.cssText = "width:200px;height:200px";
			document.body.appendChild( host );
			$.screen( { "aspect": "100x100", "container": host } );
			window.__t = { "up": 0, "pressUp": 0, "clicks": 0, "menus": 0, "menusPrevented": 0 };
			$.onmouse( "up", () => { window.__t.up += 1; } );
			$.onpress( "up", () => { window.__t.pressUp += 1; } );
			$.onclick( () => { window.__t.clicks += 1; }, false,
				{ "x": 0, "y": 0, "width": 20, "height": 20 } );
			window.addEventListener( "contextmenu", e => {
				window.__t.menus += 1;
				if( e.defaultPrevented ) {
					window.__t.menusPrevented += 1;
				}
			} );
		} );
		const box = await page.locator( "canvas" ).boundingBox();
		const at = ( x, y ) => [ box.x + ( x + 0.5 ) * box.width / 100,
			box.y + ( y + 0.5 ) * box.height / 100 ];
		const read = () => page.evaluate( () => ( {
			...window.__t, "buttons": $.inmouse().buttons, "pressButtons": $.inpress().buttons
		} ) );
		const observed = {};

		// Release outside the canvas.
		await page.mouse.move( ...at( 50, 50 ) );
		await page.mouse.down();
		await page.mouse.move( box.x + box.width + 150, box.y + 50, { "steps": 4 } );
		await page.mouse.up();
		observed.releaseOutside = await read();

		// Right and middle clicks in the click box.
		await page.mouse.click( ...at( 10, 10 ), { "button": "right" } );
		observed.afterRightClick = await read();
		await page.mouse.click( ...at( 10, 10 ), { "button": "middle" } );
		observed.afterMiddleClick = await read();

		// Down in, up out; then down out, up in.
		await page.mouse.move( ...at( 10, 10 ) );
		await page.mouse.down();
		await page.mouse.move( ...at( 60, 60 ), { "steps": 4 } );
		await page.mouse.up();
		await page.mouse.down();
		await page.mouse.move( ...at( 10, 10 ), { "steps": 4 } );
		await page.mouse.up();
		observed.afterStaleClick = await read();

		const clicksFromButtons = observed.afterMiddleClick.clicks;
		const staleClicks = observed.afterStaleClick.clicks - clicksFromButtons;
		return {
			"observed": observed,
			"expected": {
				"releaseOutside": "up 1, pressUp 1, buttons 0",
				"rightAndMiddleClicks": 0,
				"staleClicks": 0
			},
			"confirmed": observed.releaseOutside.up === 0 ||
				observed.releaseOutside.buttons !== 0 || clicksFromButtons > 0 || staleClicks > 0,
			pageErrors
		};
	} catch( error ) {
		return { "error": error.message, pageErrors };
	} finally {
		await page.close();
	}
}


/*************************************************************************************************
 * Runner
 ************************************************************************************************/


const FULL_PROBES = [
	"P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13", "P14",
	"P15"
];

/**
 * Run one probe in a fresh page.
 *
 * @param {Object} browser - Playwright browser.
 * @param {string[]} scripts - Bundles to inject, in order.
 * @param {Function} fn - Probe page function.
 * @param {Function} [beforePlugins] - Page function run after the first script only.
 * @returns {Promise<Object>} Probe result plus page errors.
 */
async function runProbe( browser, scripts, fn, beforePlugins ) {
	const page = await browser.newPage();
	const pageErrors = [];
	page.on( "pageerror", error => pageErrors.push( error.message ) );
	try {
		await page.setContent( EMPTY_PAGE );
		for( let i = 0; i < scripts.length; i++ ) {
			await page.addScriptTag( { "content": scripts[ i ] } );
			if( i === 0 ) {
				await page.evaluate( () => $.ready() );
				await page.evaluate( installHelpers );
				if( beforePlugins ) {
					await page.evaluate( beforePlugins );
				}
			}
		}
		await page.evaluate( () => $.ready() );
		const result = await page.evaluate( fn );
		result.pageErrors = pageErrors;
		return result;
	} catch( error ) {
		return { "error": error.message, pageErrors };
	} finally {
		await page.close();
	}
}

/**
 * Load each manual pointer page through the source-serving context and record page errors.
 *
 * @param {Object} browser - Playwright browser.
 * @returns {Promise<Object>} Page errors keyed by page name.
 */
async function runManualPages( browser ) {
	const context = await g_harness.createSourceContext( browser );
	const results = {};
	try {
		for( const name of MANUAL_PAGES ) {
			const page = await context.newPage();
			const errors = [];
			page.on( "pageerror", error => errors.push( error.message ) );
			try {
				await page.goto( "http://localhost:8080/test/tests/html-manual/" + name );
				await page.waitForTimeout( 250 );
				results[ name ] = { "pageErrors": errors };
			} catch( error ) {
				results[ name ] = { "error": error.message, "pageErrors": errors };
			}
			await page.close();
		}
	} finally {
		await context.close();
	}
	return results;
}

async function main() {
	const full = await g_harness.buildSource( "src/index-full.js" );
	const lite = await g_harness.buildSource( "src/index.js" );
	const plugin = await g_harness.buildSource( "plugins/pointer/index.js" );
	const printTable = await g_harness.buildSource( "plugins/print-table/index.js" );
	const onscreenKeyboard = await g_harness.buildSource( "plugins/onscreen-keyboard/index.js" );
	const revision = g_childProcess.execFileSync( "git", [ "rev-parse", "--short", "HEAD" ], {
		"encoding": "utf8"
	} ).trim();
	const output = { revision, "engines": {} };

	for( const engine of ENGINES ) {
		const browser = await g_playwright[ engine ].launch( { "headless": true } );
		const results = { "version": browser.version(), "probes": {} };
		for( const id of FULL_PROBES ) {
			results.probes[ id ] = await runProbe( browser, [ full ], PROBES[ id ] );
		}
		results.probes.P16 = await runProbe(
			browser, [ lite, plugin ], PROBES.P16, () => window.__p.setup()
		);
		results.probes.P17 = await runProbe(
			browser, [ full, printTable, onscreenKeyboard ], PROBES.P17
		);
		results.probes.T1 = await runTrustedProbe( browser, full );
		results.manualPages = await runManualPages( browser );
		await browser.close();
		output.engines[ engine ] = results;
		const confirmed = Object.keys( results.probes ).filter(
			id => results.probes[ id ].confirmed
		);
		const failed = Object.keys( results.probes ).filter( id => results.probes[ id ].error );
		console.log( `${engine} ${results.version}: confirmed ${confirmed.join( ", " )}` +
			( failed.length ? `; errors ${failed.join( ", " )}` : "" ) );
	}

	await g_fs.writeFile( OUTPUT_FILE, JSON.stringify( output, null, "\t" ) + "\n" );
	console.log( "Wrote " + g_path.relative( process.cwd(), OUTPUT_FILE ) );
}

await main();
