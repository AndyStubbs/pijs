/**
 * Pointer dispatch regressions against the real plugin modules. Owned by the pointer workstream.
 *
 * The harness loads `mouse.js`, `touch.js`, `press.js`, and the plugin entry into `vm` contexts
 * and maps command arguments with core's real parseOptions, so the positional and object forms
 * behave as in the bundles. Mouse and touch events are dispatched through the listeners the
 * plugin adds to fake canvases, so they reach the plugin only while tracking is started; mouse
 * events then bubble to the fake window. Each canvas maps client coordinates one to one onto its
 * screen.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;

// Core's option mapping and hit-box test. It shares this realm's Object, so the object literals
// tests pass are recognized as the object form; its color checker only needs a canvas stub.
const m_utils = g_harness.loadModule( "src/core/utils.js", {
	"Object": Object,
	"document": { "createElement": () => ( { "getContext": () => ( {} ) } ) }
} );

/**
 * The real pointer plugin on fake screens.
 *
 * @returns {Object} `{ $, screen, removeScreen, clearEvents, mouse, mouseOutside, touch,
 *   click, tap, hide, window, document, errors }`. `$` runs global commands on the first screen;
 *   `screen()` adds a screen whose `api` holds the screen commands; `errors` holds the
 *   arguments of each `console.error()` call.
 */
function harness() {
	const screenDataItems = {};
	const initFunctions = [];
	const cleanupFunctions = [];
	const screenCommands = [];
	const clearHandlers = {};
	const screens = {};
	const api = {};
	let nextScreenId = 1;
	let activeScreen = null;
	const pluginApi = {
		"utils": m_utils,
		"addScreenDataItem": ( name, value ) => { screenDataItems[ name ] = value; },
		"addScreenInitFunction": fn => initFunctions.push( fn ),
		"addScreenCleanupFunction": fn => cleanupFunctions.push( fn ),
		"addCommand": ( name, fn, isScreen, params ) => {
			if( isScreen ) {
				screenCommands.push( { "name": name, "fn": fn, "params": params } );
				api[ name ] = ( ...args ) => {
					return fn( activeScreen, m_utils.parseOptions( args, params ) );
				};
			} else {
				api[ name ] = ( ...args ) => fn( m_utils.parseOptions( args, params ) );
			}
		},
		"registerClearEvents": ( name, fn ) => { clearHandlers[ name ] = fn; },
		"getScreenData": ( fnName, screenId ) => screens[ screenId ],
		"getAllScreensData": () => Object.values( screens )
	};
	const errors = [];
	const globals = {
		"console": { "error": ( ...args ) => errors.push( args ) },
		"window": g_harness.createEventTarget(),
		"document": g_harness.createEventTarget( {
			"body": { "style": {} }, "visibilityState": "visible"
		} )
	};

	// The modules import each other, so each namespace is read when a function runs
	const modules = {};
	const lazy = name => new Proxy( {}, { "get": ( target, key ) => modules[ name ][ key ] } );
	function load( file, extra ) {
		return g_harness.loadModule( file, { ...globals, ...extra } );
	}
	modules.target = load( "plugins/pointer/target.js", {
		"g_canvasLayout": {
			"getCanvasContentRect": canvas => {
				return { "left": 0, "top": 0, "width": canvas.width, "height": canvas.height };
			}
		}
	} );
	modules.mouse = load( "plugins/pointer/mouse.js", {
		"g_target": modules.target, "g_press": lazy( "press" )
	} );
	modules.touch = load( "plugins/pointer/touch.js", {
		"g_target": modules.target, "g_press": lazy( "press" )
	} );
	modules.press = load( "plugins/pointer/press.js", {
		"g_target": modules.target, "g_mouse": modules.mouse, "g_touch": modules.touch
	} );
	const plugin = load( "plugins/pointer/index.js", {
		"g_sharedEvents": load( "plugins/pointer/shared-events.js" ),
		"g_mouse": modules.mouse,
		"g_touch": modules.touch,
		"g_press": modules.press
	} );
	plugin.pointerPlugin( pluginApi );

	function screen( width = 100, height = 100 ) {
		const id = nextScreenId++;
		const canvas = g_harness.createEventTarget( {
			"width": width, "height": height, "dataset": { "screenId": String( id ) }
		} );
		const data = {
			...structuredClone( screenDataItems ),
			"id": id, "width": width, "height": height, "canvas": canvas, "isOffscreen": false,
			"api": {}
		};
		for( const command of screenCommands ) {
			data.api[ command.name ] = ( ...args ) => {
				return command.fn( data, m_utils.parseOptions( args, command.params ) );
			};
		}
		screens[ id ] = data;
		for( const fn of initFunctions ) {
			fn( data );
		}
		if( activeScreen === null ) {
			activeScreen = data;
		}
		return data;
	}
	screen();

	/**
	 * Remove a screen as core does: its cleanup functions run, then it is gone.
	 *
	 * @param {Object} screenData - Screen to remove.
	 * @returns {void}
	 */
	function removeScreen( screenData ) {
		for( const fn of cleanupFunctions ) {
			fn( screenData );
		}
		delete screens[ screenData.id ];
	}

	/**
	 * Clear handlers as `clearEvents()` does: `$.clearEvents()` passes no screen, and a screen's
	 * `clearEvents()` passes that screen.
	 *
	 * @param {string} [type] - Handler type; all pointer types when omitted.
	 * @param {Object|null} [screenData] - Screen to clear; every screen when `null`.
	 * @returns {void}
	 */
	function clearEvents( type, screenData = null ) {
		let types = [ type ];
		if( type === undefined ) {
			types = Object.keys( clearHandlers );
		}
		for( const name of types ) {
			clearHandlers[ name ]( screenData );
		}
	}

	/**
	 * Dispatch a mouse event through the canvas listeners, then the window listeners.
	 *
	 * @param {string} type - Event type, such as `"mousedown"`.
	 * @param {number} x - Screen x.
	 * @param {number} y - Screen y.
	 * @param {number} [buttons] - Buttons held after the event.
	 * @param {number} [button] - The button that changed; 0 is the primary button.
	 * @param {Object} [screenData] - Target screen.
	 * @returns {Object} The dispatched event.
	 */
	function mouse( type, x, y, buttons = 0, button = 0, screenData = activeScreen ) {
		const event = {
			"type": type, "target": screenData.canvas, "clientX": x + 0.5, "clientY": y + 0.5,
			"buttons": buttons, "button": button, "defaultPrevented": false,
			"preventDefault": () => { event.defaultPrevented = true; }
		};
		screenData.canvas.dispatchEvent( event );
		globals.window.dispatchEvent( event );
		return event;
	}

	/**
	 * Dispatch a mouse event outside every canvas, through the window listeners only.
	 *
	 * @param {string} type - Event type, such as `"mouseup"`.
	 * @param {number} x - Client x, in the first screen's coordinates.
	 * @param {number} y - Client y, in the first screen's coordinates.
	 * @param {number} [buttons] - Buttons held after the event.
	 * @param {number} [button] - The button that changed; 0 is the primary button.
	 * @returns {Object} The dispatched event.
	 */
	function mouseOutside( type, x, y, buttons = 0, button = 0 ) {
		const event = {
			"type": type, "target": globals.document.body, "clientX": x + 0.5,
			"clientY": y + 0.5, "buttons": buttons, "button": button
		};
		globals.window.dispatchEvent( event );
		return event;
	}

	/**
	 * Hide the page, or show it again.
	 *
	 * @param {boolean} [isHidden] - Whether the page becomes hidden.
	 * @returns {void}
	 */
	function hide( isHidden = true ) {
		if( isHidden ) {
			globals.document.visibilityState = "hidden";
		} else {
			globals.document.visibilityState = "visible";
		}
		globals.document.dispatchEvent( { "type": "visibilitychange" } );
	}

	/**
	 * Dispatch a touch event through the canvas listeners.
	 *
	 * @param {string} type - Event type, such as `"touchstart"`.
	 * @param {Array<Object>} touches - Touches down after the event, as `{ id, x, y }`.
	 * @param {Array<Object>} [changed] - Touches the event changed.
	 * @param {Object} [screenData] - Target screen.
	 * @returns {Object} The dispatched event.
	 */
	function touch( type, touches, changed = touches, screenData = activeScreen ) {
		const make = item => {
			return {
				"identifier": item.id, "target": screenData.canvas,
				"clientX": item.x + 0.5, "clientY": item.y + 0.5
			};
		};
		const event = {
			"type": type, "target": screenData.canvas, "touches": touches.map( make ),
			"changedTouches": changed.map( make ), "defaultPrevented": false,
			"preventDefault": () => { event.defaultPrevented = true; }
		};
		screenData.canvas.dispatchEvent( event );
		return event;
	}

	/**
	 * A mouse press and release at one point.
	 *
	 * @param {number} x - Screen x.
	 * @param {number} y - Screen y.
	 * @returns {void}
	 */
	function click( x, y ) {
		mouse( "mousedown", x, y, 1 );
		mouse( "mouseup", x, y );
	}

	/**
	 * A one-finger tap at one point.
	 *
	 * @param {number} x - Screen x.
	 * @param {number} y - Screen y.
	 * @returns {void}
	 */
	function tap( x, y ) {
		const item = { "id": 1, "x": x, "y": y };
		touch( "touchstart", [ item ] );
		touch( "touchend", [], [ item ] );
	}

	return {
		"$": api, "screen": screen, "removeScreen": removeScreen, "clearEvents": clearEvents,
		"mouse": mouse,
		"mouseOutside": mouseOutside, "touch": touch, "click": click, "tap": tap, "hide": hide,
		"window": globals.window, "document": globals.document, "errors": errors
	};
}

test( "pointer registers camelCase commands, and not the old names (I1, I16)", () => {
	const h = harness();
	const renames = {
		"inmouse": "inMouse", "onmouse": "onMouse", "offmouse": "offMouse",
		"intouch": "inTouch", "ontouch": "onTouch", "offtouch": "offTouch",
		"inpress": "inPress", "onpress": "onPress", "offpress": "offPress",
		"onclick": "onClick", "offclick": "offClick"
	};
	h.screen();
	for( const [ oldName, newName ] of Object.entries( renames ) ) {
		assert.equal( typeof h.$[ newName ], "function", newName );
		assert.equal( h.$[ oldName ], undefined, oldName );
		assert.throws( () => h.$[ oldName ]( "down", () => {} ), TypeError );
	}
} );

test( "pointer dispatch snapshots exclude new listeners and once survives nested dispatch", () => {
	const module = g_harness.loadModule( "plugins/pointer/shared-events.js" );
	const helpers = module.createEventHelpers( { "utils": { "inRange": () => true } } );
	const listeners = {};
	const order = [];
	const on = ( fn, once = false ) => helpers.onevent(
		"move", fn, once, { "x": 0, "y": 0, "width": 8, "height": 8 },
		[ "move" ], "onMouse", listeners, null, null, "custom"
	);
	const dispatch = () => helpers.triggerEventListeners( "move", { "x": 1, "y": 1 }, listeners );
	on( ( data, custom ) => {
		assert.equal( custom, "custom" );
		order.push( "once" );
		on( () => order.push( "new" ) );
		dispatch();
	}, true );
	dispatch();
	assert.deepEqual( order, [ "once", "new" ] );
	helpers.offevent( "move", null, [ "move" ], "offMouse", listeners );
	dispatch();
	assert.equal( order.length, 2 );
} );

test( "pointer clearing one mode keeps the handlers of the other modes (P1)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const other = () => {};
	$.onMouse( "down", () => log.push( "mouse down" ) );
	$.onMouse( "move", other );
	$.offMouse( "move" );
	$.onTouch( "start", () => log.push( "touch start" ) );
	$.onTouch( "move", other );
	$.offTouch( "move" );
	$.onPress( "down", () => log.push( "press down" ) );
	$.onPress( "up", other );
	$.offPress( "up" );
	h.click( 10, 10 );
	h.tap( 10, 10 );
	assert.deepEqual( log, [ "mouse down", "press down", "touch start", "press down" ] );
} );

test( "pointer removing a function that was never added keeps registered handlers (P1)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const other = () => {};
	$.onMouse( "down", () => log.push( "mouse down" ) );
	$.offMouse( "down", other );
	$.onTouch( { "mode": "start", "fn": () => log.push( "touch start" ) } );
	$.offTouch( { "mode": "start", "fn": other } );
	$.onPress( "up", () => log.push( "press up" ) );
	$.offPress( "up", other );
	$.onClick( () => log.push( "click" ) );
	$.offClick( other );
	h.click( 20, 20 );
	h.tap( 20, 20 );
	assert.deepEqual( log, [
		"mouse down", "press up", "click", "touch start", "press up", "click"
	] );

	// Removing every registration of each type still stops only that type
	log.length = 0;
	$.offMouse( "down" );
	$.offClick();
	h.click( 20, 20 );
	assert.deepEqual( log, [ "press up" ] );
} );

test( "pointer handlers removed during a dispatch do not run later in it (P7)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const removed = () => log.push( "removed" );
	$.onMouse( "down", () => {
		log.push( "first" );
		$.offMouse( "down", removed );
	} );
	$.onMouse( "down", removed );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "first" ] );

	// A clear during a dispatch skips the rest of the dispatch, and handlers added in it wait
	log.length = 0;
	$.onPress( "down", () => {
		log.push( "press" );
		h.clearEvents( "press" );
		$.onPress( "down", () => log.push( "added" ) );
	} );
	$.onPress( "down", () => log.push( "cleared" ) );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "first", "press" ] );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "first", "press", "first", "added" ] );
} );

test( "pointer once removes only its own registration (P7)", () => {
	const h = harness();
	const $ = h.$;
	let calls = 0;
	const fn = () => { calls += 1; };

	// Registering a function twice registers it twice until Pointer 2.4 (I4)
	$.onMouse( "down", fn, true );
	$.onMouse( "down", fn );
	h.click( 10, 10 );
	h.click( 10, 10 );
	assert.equal( calls, 3 );

	// A once click is spent by the click it fires for, not by the press that arms it
	let clicks = 0;
	const box = { "x": 0, "y": 0, "width": 20, "height": 20 };
	$.onClick( () => { clicks += 1; }, true, box );
	h.click( 10, 10 );
	h.click( 10, 10 );
	assert.equal( clicks, 1 );

	// A once touch handler that starts a nested dispatch is not called again by it
	let touches = 0;
	h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	$.onTouch( "move", () => {
		touches += 1;
		h.touch( "touchmove", [ { "id": 1, "x": 12, "y": 12 } ] );
	}, true );
	h.touch( "touchmove", [ { "id": 1, "x": 11, "y": 11 } ] );
	assert.equal( touches, 1 );
} );

test( "pointer handlers that throw are reported and do not stop the event (P6)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "down", () => { throw new Error( "mouse" ); } );
	$.onMouse( "down", () => log.push( "mouse down" ) );
	$.onPress( "down", () => { throw new Error( "press" ); } );
	$.onPress( "down", () => log.push( "press down" ) );
	$.onClick( () => { throw new Error( "click" ); } );
	$.onClick( () => log.push( "click" ) );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "mouse down", "press down", "click" ] );

	// The touch start is prevented before its handlers run, so a throw cannot skip it
	log.length = 0;
	$.onTouch( "start", () => { throw new Error( "touch" ); } );
	$.onTouch( "start", () => log.push( "touch start" ) );
	const event = h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	assert.equal( event.defaultPrevented, true );
	assert.deepEqual( log, [ "touch start", "press down" ] );
	assert.deepEqual( h.errors.map( args => [ args[ 0 ], args[ 1 ].message ] ), [
		[ "onMouse: Handler for \"down\" failed:", "mouse" ],
		[ "onPress: Handler for \"down\" failed:", "press" ],
		[ "onClick: Handler for \"click\" failed:", "click" ],
		[ "onTouch: Handler for \"start\" failed:", "touch" ],
		[ "onPress: Handler for \"down\" failed:", "press" ]
	] );
} );

/**
 * The fields of touch data that the tracking sets.
 *
 * @param {Object|Array<Object>} data - Touch or press data.
 * @returns {Object|Array<Object>} `{ id, x, y, lastX, lastY, action, cancelled }` per touch.
 */
function touchSummary( data ) {
	if( Array.isArray( data ) ) {
		return Array.from( data, touchSummary );
	}
	return {
		"id": data.id, "x": data.x, "y": data.y, "lastX": data.lastX, "lastY": data.lastY,
		"action": data.action, "cancelled": data.cancelled
	};
}

test( "pointer touch end reports the touch that lifted, and hit boxes test it (P2)", () => {
	const h = harness();
	const $ = h.$;
	const ends = [];
	let hits = 0;
	$.onTouch( "end", data => ends.push( touchSummary( data ) ) );
	$.onTouch( "end", () => { hits += 1; }, false, { "x": 0, "y": 0, "width": 20, "height": 20 } );

	// One finger lifts inside the hit box, where it moved last
	h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	h.touch( "touchmove", [ { "id": 1, "x": 12, "y": 12 } ] );
	h.touch( "touchend", [], [ { "id": 1, "x": 12, "y": 12 } ] );
	assert.deepEqual( ends, [ [ {
		"id": 1, "x": 12, "y": 12, "lastX": 12, "lastY": 12, "action": "end", "cancelled": false
	} ] ] );
	assert.equal( hits, 1 );
	assert.equal( $.inTouch().length, 0 );

	// A second finger lifts outside the box while the first stays down inside it
	const first = { "id": 1, "x": 10, "y": 10 };
	const second = { "id": 2, "x": 80, "y": 80 };
	h.touch( "touchstart", [ first ], [ first ] );
	h.touch( "touchstart", [ first, second ], [ second ] );
	h.touch( "touchend", [ first ], [ second ] );
	assert.deepEqual( ends[ 1 ], [ {
		"id": 2, "x": 80, "y": 80, "lastX": 80, "lastY": 80, "action": "end", "cancelled": false
	} ] );
	assert.equal( hits, 1 );
	assert.deepEqual( touchSummary( $.inTouch() ), [ {
		"id": 1, "x": 10, "y": 10, "lastX": null, "lastY": null, "action": "start",
		"cancelled": false
	} ] );
} );

test( "pointer touches keep their own actions and handlers get the changed touches (P2)", () => {
	const h = harness();
	const $ = h.$;
	const starts = [];
	const moves = [];
	$.onTouch( "start", data => starts.push( Array.from( data, touch => touch.id ) ) );
	$.onTouch( "move", data => moves.push( touchSummary( data ) ) );
	const first = { "id": 1, "x": 10, "y": 10 };
	const second = { "id": 2, "x": 50, "y": 50 };
	h.touch( "touchstart", [ first ], [ first ] );
	h.touch( "touchstart", [ first, second ], [ second ] );
	h.touch( "touchmove", [ first, { "id": 2, "x": 55, "y": 54 } ], [
		{ "id": 2, "x": 55, "y": 54 }
	] );
	assert.deepEqual( starts, [ [ 1 ], [ 2 ] ] );
	assert.deepEqual( moves, [ [ {
		"id": 2, "x": 55, "y": 54, "lastX": 50, "lastY": 50, "action": "move", "cancelled": false
	} ] ] );
	assert.deepEqual( Array.from( $.inTouch(), touch => [ touch.id, touch.action ] ), [
		[ 1, "start" ], [ 2, "move" ]
	] );

	// Polled and handler data are copies of the tracked state
	$.inTouch()[ 0 ].x = 99;
	assert.equal( $.inTouch()[ 0 ].x, 10 );
} );

test( "pointer touchcancel releases with cancelled and never clicks (P4)", () => {
	const h = harness();
	const $ = h.$;
	const ends = [];
	const pressUps = [];
	let clicks = 0;
	$.onTouch( "end", data => ends.push( touchSummary( data ) ) );
	$.onPress( "up", data => pressUps.push( touchSummary( data ) ) );
	$.onClick( () => { clicks += 1; }, false, { "x": 0, "y": 0, "width": 20, "height": 20 } );
	const item = { "id": 1, "x": 10, "y": 10 };
	h.touch( "touchstart", [ item ] );
	h.touch( "touchcancel", [], [ item ] );
	assert.deepEqual( ends, [ [ {
		"id": 1, "x": 10, "y": 10, "lastX": 10, "lastY": 10, "action": "end", "cancelled": true
	} ] ] );
	assert.deepEqual( pressUps, [ {
		"id": 1, "x": 10, "y": 10, "lastX": 10, "lastY": 10, "action": "up", "cancelled": true
	} ] );
	assert.equal( clicks, 0 );
	assert.equal( $.inTouch().length, 0 );

	// A touch that starts outside the box and ends inside it does not click
	const outside = { "id": 2, "x": 50, "y": 50 };
	h.touch( "touchstart", [ outside ] );
	h.touch( "touchend", [], [ { "id": 2, "x": 10, "y": 10 } ] );
	assert.equal( clicks, 0 );
	assert.equal( pressUps[ 1 ].cancelled, false );

	// A tap still clicks, and mouse data carries the field as well
	h.tap( 10, 10 );
	assert.equal( clicks, 1 );
	assert.equal( $.inMouse().cancelled, false );
} );

test( "pointer press follows the primary touch, and each touch clicks on its own (P3)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const clicks = [];
	$.onPress( "down", data => log.push( [ "down", data.id, data.x, data.buttons ] ) );
	$.onPress( "move", data => log.push( [ "move", data.id, data.x, data.buttons ] ) );
	$.onPress( "up", data => log.push( [ "up", data.id, data.x, data.buttons, data.action ] ) );
	$.onClick( data => clicks.push( [ data.id, data.x, data.action, data.buttons ] ), false,
		{ "x": 70, "y": 70, "width": 20, "height": 20 } );
	const first = { "id": 1, "x": 10, "y": 10 };
	const second = { "id": 2, "x": 80, "y": 80 };
	const moved = { "id": 2, "x": 82, "y": 80 };
	h.touch( "touchstart", [ first ], [ first ] );
	h.touch( "touchstart", [ first, second ], [ second ] );
	h.touch( "touchmove", [ first, moved ], [ moved ] );
	const held = $.inPress();
	assert.deepEqual( [ held.id, held.x, held.buttons ], [ 1, 10, 1 ] );
	assert.deepEqual( Array.from( held.touches, touch => touch.id ), [ 1, 2 ] );
	h.touch( "touchend", [ first ], [ moved ] );
	assert.deepEqual( log, [ [ "down", 1, 10, 1 ] ] );
	assert.deepEqual( clicks, [ [ 2, 82, "up", 0 ] ] );
	h.touch( "touchend", [], [ first ] );
	assert.deepEqual( log, [ [ "down", 1, 10, 1 ], [ "up", 1, 10, 0, "up" ] ] );
	assert.equal( $.inPress().buttons, 0 );

	// After the primary touch lifts, no touch is primary until every touch is up
	log.length = 0;
	const third = { "id": 3, "x": 30, "y": 30 };
	h.touch( "touchstart", [ first ], [ first ] );
	h.touch( "touchstart", [ first, second ], [ second ] );
	h.touch( "touchend", [ second ], [ first ] );
	h.touch( "touchstart", [ second, third ], [ third ] );
	h.touch( "touchmove", [ second, third ], [ second, third ] );
	h.touch( "touchend", [], [ second, third ] );
	h.touch( "touchstart", [ third ], [ third ] );
	assert.deepEqual( log, [
		[ "down", 1, 10, 1 ], [ "up", 1, 10, 0, "up" ], [ "down", 3, 30, 1 ]
	] );
} );

test( "pointer clicks need the primary mouse button (P5)", () => {
	const h = harness();
	const $ = h.$;
	let clicks = 0;
	const presses = [];
	$.onClick( () => { clicks += 1; } );
	$.onPress( "down", data => presses.push( data.buttons ) );
	for( const [ button, buttons ] of [ [ 2, 2 ], [ 1, 4 ] ] ) {
		h.mouse( "mousedown", 30, 30, buttons, button );
		h.mouse( "mouseup", 30, 30, 0, button );
	}
	assert.equal( clicks, 0 );
	assert.deepEqual( presses, [ 2, 4 ] );
	h.click( 30, 30 );
	assert.equal( clicks, 1 );
} );

test( "pointer a click needs the down and the release inside its box (P4)", () => {
	const h = harness();
	const $ = h.$;
	let clicks = 0;
	$.onClick( () => { clicks += 1; }, false, { "x": 0, "y": 0, "width": 20, "height": 20 } );

	// Down inside and up outside, then down outside and up inside
	h.mouse( "mousedown", 10, 10, 1 );
	h.mouse( "mousemove", 50, 50, 1 );
	h.mouse( "mouseup", 50, 50 );
	h.mouse( "mousedown", 50, 50, 1 );
	h.mouse( "mousemove", 10, 10, 1 );
	h.mouse( "mouseup", 10, 10 );
	assert.equal( clicks, 0 );

	// The same with a touch, which is released where it lifts
	h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	h.touch( "touchend", [], [ { "id": 1, "x": 50, "y": 50 } ] );
	h.touch( "touchstart", [ { "id": 2, "x": 50, "y": 50 } ] );
	h.touch( "touchend", [], [ { "id": 2, "x": 10, "y": 10 } ] );
	assert.equal( clicks, 0 );

	h.click( 10, 10 );
	h.tap( 10, 10 );
	assert.equal( clicks, 2 );
} );

/**
 * Whether the plugin listens for `mouseup` on the window.
 *
 * @param {Object} h - Harness.
 * @returns {boolean}
 */
function hasWindowMouseUp( h ) {
	return h.window.listeners.some( listener => listener.type === "mouseup" );
}

test( "pointer a mouse release outside the canvas is released once (P8)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "up", data => log.push( [ "mouse up", data.x, data.buttons, data.cancelled ] ) );
	$.onPress( "up", data => log.push( [ "press up", data.x, data.buttons ] ) );
	assert.equal( hasWindowMouseUp( h ), false );
	h.mouse( "mousedown", 50, 50, 1 );
	assert.equal( hasWindowMouseUp( h ), true );
	h.mouse( "mousemove", 99, 50, 1 );
	h.mouseOutside( "mouseup", 150, 50 );
	assert.deepEqual( log, [ [ "mouse up", 150, 0, false ], [ "press up", 150, 0 ] ] );
	assert.equal( $.inMouse().buttons, 0 );
	assert.equal( hasWindowMouseUp( h ), false );

	// A release for a button that is not held is ignored, on the canvas or outside it
	h.mouseOutside( "mouseup", 150, 50 );
	h.mouse( "mouseup", 50, 50 );
	h.mouse( "mousedown", 50, 50, 1 );
	h.mouse( "mouseup", 50, 50, 1, 2 );
	assert.equal( log.length, 2 );
	assert.equal( $.inMouse().buttons, 1 );
} );

test( "pointer blur leaves held input alone (P9)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "up", () => log.push( "mouse up" ) );
	$.onTouch( "end", () => log.push( "touch end" ) );
	h.mouse( "mousedown", 50, 50, 1 );
	h.touch( "touchstart", [ { "id": 3, "x": 40, "y": 40 } ] );
	h.window.dispatchEvent( { "type": "blur" } );
	assert.deepEqual( log, [] );
	assert.equal( $.inMouse().buttons, 1 );
	assert.equal( $.inTouch().length, 1 );
	assert.equal( $.inPress().buttons, 1 );
	assert.equal( h.window.listeners.some( listener => listener.type === "blur" ), false );
} );

test( "pointer a hidden page releases held input with cancelled (P9)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	let clicks = 0;
	$.onMouse( "up", data => log.push( [ "mouse up", data.buttons, data.cancelled ] ) );
	$.onTouch( "end", data => log.push( [ "touch end", data[ 0 ].id, data[ 0 ].cancelled ] ) );
	$.onPress( "up", data => log.push( [ "press up", data.type, data.cancelled ] ) );
	$.onClick( () => { clicks += 1; } );
	h.mouse( "mousedown", 50, 50, 1 );
	h.touch( "touchstart", [ { "id": 3, "x": 40, "y": 40 } ] );
	h.hide();
	assert.deepEqual( log, [
		[ "mouse up", 0, true ], [ "press up", "mouse", true ],
		[ "touch end", 3, true ], [ "press up", "touch", true ]
	] );
	assert.deepEqual( [ $.inMouse().buttons, $.inMouse().cancelled ], [ 0, true ] );
	assert.equal( $.inTouch().length, 0 );
	assert.equal( hasWindowMouseUp( h ), false );

	// The late real releases, a second hide, and showing the page release nothing again
	h.mouseOutside( "mouseup", 50, 50 );
	h.touch( "touchend", [], [ { "id": 3, "x": 40, "y": 40 } ] );
	h.hide();
	h.hide( false );
	assert.equal( log.length, 4 );
	assert.equal( clicks, 0 );
	assert.deepEqual( h.errors, [] );
} );

test( "pointer stop commands release held input with cancelled (P10)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "up", data => log.push( [ "mouse up", data.cancelled ] ) );
	$.onTouch( "end", data => log.push( [ "touch end", data[ 0 ].cancelled ] ) );
	h.mouse( "mousedown", 50, 50, 1 );
	$.stopMouse();
	assert.deepEqual( log, [ [ "mouse up", true ] ] );
	assert.equal( $.inMouse().buttons, 0 );
	assert.equal( hasWindowMouseUp( h ), false );
	h.touch( "touchstart", [ { "id": 4, "x": 40, "y": 40 } ] );
	$.stopTouch();
	assert.deepEqual( log[ 1 ], [ "touch end", true ] );
	assert.equal( $.inTouch().length, 0 );

	// Stopping again finds nothing held, and registration does not restart tracking
	$.stopMouse();
	$.stopTouch();
	$.onMouse( "down", () => log.push( "down" ) );
	$.onTouch( "start", () => log.push( "start" ) );
	h.mouse( "mousedown", 50, 50, 1 );
	h.touch( "touchstart", [ { "id": 5, "x": 40, "y": 40 } ] );
	assert.equal( log.length, 2 );

	// Only the start commands resume tracking
	$.startMouse();
	$.startTouch();
	h.mouse( "mousedown", 50, 50, 1 );
	h.touch( "touchstart", [ { "id": 6, "x": 40, "y": 40 } ] );
	assert.deepEqual( log.slice( 2 ), [ "down", "start" ] );
} );

test( "pointer removing a screen with input held calls none of its handlers", () => {
	const h = harness();
	const $ = h.$;
	const other = h.screen();
	const log = [];
	other.api.onMouse( "up", () => log.push( "mouse up" ) );
	other.api.onTouch( "end", () => log.push( "touch end" ) );
	h.mouse( "mousedown", 5, 5, 1, 0, other );
	h.touch( "touchstart", [ { "id": 1, "x": 5, "y": 5 } ], undefined, other );
	h.removeScreen( other );
	assert.deepEqual( log, [] );
	assert.equal( hasWindowMouseUp( h ), false );
	assert.equal( $.inMouse().buttons, 0 );
} );

test( "pointer presses on the border are ignored, and moves report true positions (P11)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "down", data => log.push( [ "mouse down", data.x, data.y ] ) );
	$.onMouse( "move", data => log.push( [ "mouse move", data.x, data.y, data.buttons ] ) );
	$.onMouse( "up", data => log.push( [ "mouse up", data.x, data.y ] ) );
	$.onTouch( "start", data => log.push( [ "touch start", data[ 0 ].x ] ) );
	$.onTouch( "move", data => log.push( [ "touch move", data[ 0 ].x ] ) );
	$.onTouch( "end", data => log.push( [ "touch end", data[ 0 ].x ] ) );
	$.onPress( "down", data => log.push( [ "press down", data.x ] ) );

	// A mouse press on the border, dragged onto the screen, is never held
	h.mouse( "mousedown", -2, -2, 1 );
	h.mouse( "mousemove", 10, 10, 1 );
	h.mouse( "mouseup", 10, 10 );
	assert.deepEqual( log, [ [ "mouse move", 10, 10, 0 ] ] );
	assert.equal( $.inMouse().buttons, 0 );

	// A press on the screen reports its moves and release over the border where they happen
	log.length = 0;
	h.mouse( "mousedown", 99, 99, 1 );
	h.mouse( "mousemove", 101, 101, 1 );
	h.mouse( "mouseup", 101, 101 );
	assert.deepEqual( log, [
		[ "mouse down", 99, 99 ], [ "press down", 99 ], [ "mouse move", 101, 101, 1 ],
		[ "mouse up", 101, 101 ]
	] );

	// The same for touch: a touch that starts on the border is not tracked
	log.length = 0;
	h.touch( "touchstart", [ { "id": 1, "x": 100, "y": 50 } ] );
	h.touch( "touchmove", [ { "id": 1, "x": 90, "y": 50 } ] );
	h.touch( "touchend", [], [ { "id": 1, "x": 90, "y": 50 } ] );
	assert.deepEqual( log, [] );
	assert.equal( $.inTouch().length, 0 );
	h.touch( "touchstart", [ { "id": 2, "x": 99, "y": 50 } ] );
	h.touch( "touchmove", [ { "id": 2, "x": 103, "y": 50 } ] );
	h.touch( "touchend", [], [ { "id": 2, "x": 104, "y": 50 } ] );
	assert.deepEqual( log, [
		[ "touch start", 99 ], [ "press down", 99 ], [ "touch move", 103 ], [ "touch end", 104 ]
	] );
} );

test( "pointer hit boxes take finite positions and reject negative sizes (P13)", () => {
	const h = harness();
	const $ = h.$;
	let clicks = 0;
	$.onClick( () => { clicks += 1; }, false, { "x": 9.5, "y": 9.5, "width": 1.5, "height": 1 } );
	h.click( 10, 10 );
	h.click( 11, 10 );
	assert.equal( clicks, 1 );
	for( const [ box, type ] of [
		[ { "x": 0, "y": 0, "width": -1, "height": 5 }, RangeError ],
		[ { "x": 0, "y": 0, "width": 5, "height": -0.5 }, RangeError ],
		[ { "x": NaN, "y": 0, "width": 5, "height": 5 }, Error ],
		[ { "x": 0, "y": 0, "width": Infinity, "height": 5 }, Error ],
		[ { "x": "0", "y": 0, "width": 5, "height": 5 }, Error ]
	] ) {
		assert.throws( () => $.onMouse( "down", () => {}, false, box ), error => {
			return error.name === type.name && error.code === "INVALID_HITBOX" &&
				error.message.startsWith( "onMouse: hitBox" );
		} );
	}
	$.onPress( "down", () => {}, false, { "x": -5, "y": -5, "width": 0, "height": 0 } );
} );

test( "pointer adds its window and document listeners only when tracking starts (B12)", () => {
	const h = harness();
	const $ = h.$;
	const types = target => Array.from( target.listeners, listener => listener.type ).sort();
	assert.deepEqual( types( h.window ), [] );
	assert.deepEqual( types( h.document ), [] );
	$.inMouse();
	h.screen().api.startMouse();
	assert.deepEqual( types( h.document ), [ "visibilitychange" ] );
	$.inTouch();
	$.stopTouch();
	$.startTouch();
	assert.deepEqual( types( h.document ), [ "visibilitychange", "visibilitychange" ] );
	assert.deepEqual( types( h.window ), [] );
} );

test( "pointer offTouch removes the given function, or every handler of the mode", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const first = () => log.push( "first" );
	const second = () => log.push( "second" );
	const moved = () => log.push( "moved" );
	$.onTouch( "start", first );
	$.onTouch( "start", second );
	$.onTouch( "move", moved );
	$.offTouch( "start", first );
	h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	h.touch( "touchmove", [ { "id": 1, "x": 11, "y": 10 } ] );
	assert.deepEqual( log, [ "second", "moved" ] );

	// Without a function, the mode is cleared in both forms; other modes stay
	log.length = 0;
	$.offTouch( { "mode": "start" } );
	$.offTouch( "end", null );
	h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 }, { "id": 2, "x": 20, "y": 20 } ], [
		{ "id": 2, "x": 20, "y": 20 }
	] );
	h.touch( "touchmove", [ { "id": 2, "x": 21, "y": 20 } ] );
	assert.deepEqual( log, [ "moved" ] );
} );

test( "pointer offPress and offClick remove only the given function", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const pressA = () => log.push( "press a" );
	const pressB = () => log.push( "press b" );
	const clickA = () => log.push( "click a" );
	const clickB = () => log.push( "click b" );
	$.onPress( "down", pressA );
	$.onPress( "down", pressB );
	$.onClick( clickA );
	$.onClick( clickB );
	$.offPress( "down", pressA );
	$.offClick( clickA );
	h.click( 10, 10 );
	h.tap( 10, 10 );
	assert.deepEqual( log, [ "press b", "click b", "press b", "click b" ] );

	// offClick() removes every click handler; new ones work afterward
	log.length = 0;
	$.offClick();
	h.click( 10, 10 );
	$.onClick( clickA );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "press b", "press b", "click a" ] );
} );

test( "pointer setEnableContextMenu controls the menu while mouse tracking runs", () => {
	const h = harness();
	const $ = h.$;
	const menu = () => h.mouse( "contextmenu", 10, 10 ).defaultPrevented;

	// The menu opens until tracking starts; the setting starts tracking
	assert.equal( menu(), false );
	$.setEnableContextMenu( false );
	assert.equal( menu(), true );
	$.setEnableContextMenu( true );
	assert.equal( menu(), false );
	$.setEnableContextMenu( false );
	assert.equal( menu(), true );

	// After stopMouse(), the menu opens, and the setting does not restart tracking
	$.stopMouse();
	assert.equal( menu(), false );
	$.setEnableContextMenu( false );
	assert.equal( menu(), false );
	$.startMouse();
	assert.equal( menu(), true );
} );
