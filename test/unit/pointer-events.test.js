/**
 * Pointer dispatch regressions against the real plugin modules. Owned by the pointer workstream.
 *
 * The harness loads `mouse.js`, `touch.js`, `press.js`, and the plugin entry into `vm` contexts
 * and maps command arguments with core's real parseOptions, so the positional and object forms
 * behave as in the bundles. Mouse and touch events are dispatched through the listeners the
 * plugin adds to fake canvases, so they reach the plugin only while tracking is started. Each
 * canvas maps client coordinates one to one onto its screen.
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
 * @returns {Object} `{ $, screen, clearEvents, mouse, touch, click, tap, errors }`. `$` runs
 *   global commands on the first screen; `screen()` adds a screen whose `api` holds the screen
 *   commands; `errors` holds the arguments of each `console.error()` call.
 */
function harness() {
	const screenDataItems = {};
	const initFunctions = [];
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
		"addScreenCleanupFunction": () => {},
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
		"document": { "body": { "style": {} } }
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
	 * Clear handlers as `clearEvents()` does.
	 *
	 * @param {string} [type] - Handler type; all pointer types when omitted.
	 * @param {Object|null} [screenData] - Screen to clear; every screen when `null`.
	 * @returns {void}
	 */
	function clearEvents( type, screenData = activeScreen ) {
		let types = [ type ];
		if( type === undefined ) {
			types = Object.keys( clearHandlers );
		}
		for( const name of types ) {
			clearHandlers[ name ]( screenData );
		}
	}

	/**
	 * Dispatch a mouse event through the canvas listeners.
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
		return event;
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
		"$": api, "screen": screen, "clearEvents": clearEvents, "mouse": mouse, "touch": touch,
		"click": click, "tap": tap, "errors": errors
	};
}

test( "pointer dispatch snapshots exclude new listeners and once survives nested dispatch", () => {
	const module = g_harness.loadModule( "plugins/pointer/shared-events.js" );
	const helpers = module.createEventHelpers( { "utils": { "inRange": () => true } } );
	const listeners = {};
	const order = [];
	const on = ( fn, once = false ) => helpers.onevent(
		"move", fn, once, { "x": 0, "y": 0, "width": 8, "height": 8 },
		[ "move" ], "onmouse", listeners, null, null, "custom"
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
	helpers.offevent( "move", null, [ "move" ], "offmouse", listeners );
	dispatch();
	assert.equal( order.length, 2 );
} );

test( "pointer registration can be removed in the same turn", () => {
	const timers = [];
	const module = g_harness.loadModule( "plugins/pointer/shared-events.js", {
		"setTimeout": fn => timers.push( fn )
	} );
	const helpers = module.createEventHelpers( { "utils": {} } );
	const listeners = {};
	const fn = () => {};
	helpers.onevent( "move", fn, false, null, [ "move" ], "onmouse", listeners );
	helpers.offevent( "move", fn, [ "move" ], "offmouse", listeners );
	for( const timer of timers ) {
		timer();
	}
	assert.equal( listeners.move, undefined );
} );

test( "pointer clearing one mode keeps the handlers of the other modes (P1)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const other = () => {};
	$.onmouse( "down", () => log.push( "mouse down" ) );
	$.onmouse( "move", other );
	$.offmouse( "move" );
	$.ontouch( "start", () => log.push( "touch start" ) );
	$.ontouch( "move", other );
	$.offtouch( "move" );
	$.onpress( "down", () => log.push( "press down" ) );
	$.onpress( "up", other );
	$.offpress( "up" );
	h.click( 10, 10 );
	h.tap( 10, 10 );
	assert.deepEqual( log, [ "mouse down", "press down", "touch start", "press down" ] );
} );

test( "pointer removing a function that was never added keeps registered handlers (P1)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const other = () => {};
	$.onmouse( "down", () => log.push( "mouse down" ) );
	$.offmouse( "down", other );
	$.ontouch( { "mode": "start", "fn": () => log.push( "touch start" ) } );
	$.offtouch( { "mode": "start", "fn": other } );
	$.onpress( "up", () => log.push( "press up" ) );
	$.offpress( "up", other );
	$.onclick( () => log.push( "click" ) );
	$.offclick( other );
	h.click( 20, 20 );
	h.tap( 20, 20 );
	assert.deepEqual( log, [
		"mouse down", "press up", "click", "touch start", "press up", "click"
	] );

	// Removing every registration of each type still stops only that type
	log.length = 0;
	$.offmouse( "down" );
	$.offclick();
	h.click( 20, 20 );
	assert.deepEqual( log, [ "press up" ] );
} );

test( "pointer handlers removed during a dispatch do not run later in it (P7)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const removed = () => log.push( "removed" );
	$.onmouse( "down", () => {
		log.push( "first" );
		$.offmouse( "down", removed );
	} );
	$.onmouse( "down", removed );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "first" ] );

	// A clear during a dispatch skips the rest of the dispatch, and handlers added in it wait
	log.length = 0;
	$.onpress( "down", () => {
		log.push( "press" );
		h.clearEvents( "press" );
		$.onpress( "down", () => log.push( "added" ) );
	} );
	$.onpress( "down", () => log.push( "cleared" ) );
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
	$.onmouse( "down", fn, true );
	$.onmouse( "down", fn );
	h.click( 10, 10 );
	h.click( 10, 10 );
	assert.equal( calls, 3 );

	// A once click is spent by the click it fires for, not by the press that arms it
	let clicks = 0;
	const box = { "x": 0, "y": 0, "width": 20, "height": 20 };
	$.onclick( () => { clicks += 1; }, true, box );
	h.click( 10, 10 );
	h.click( 10, 10 );
	assert.equal( clicks, 1 );

	// A once touch handler that starts a nested dispatch is not called again by it
	let touches = 0;
	$.ontouch( "move", () => {
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
	$.onmouse( "down", () => { throw new Error( "mouse" ); } );
	$.onmouse( "down", () => log.push( "mouse down" ) );
	$.onpress( "down", () => { throw new Error( "press" ); } );
	$.onpress( "down", () => log.push( "press down" ) );
	$.onclick( () => { throw new Error( "click" ); } );
	$.onclick( () => log.push( "click" ) );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "mouse down", "press down", "click" ] );

	// The touch start is prevented before its handlers run, so a throw cannot skip it
	log.length = 0;
	$.ontouch( "start", () => { throw new Error( "touch" ); } );
	$.ontouch( "start", () => log.push( "touch start" ) );
	const event = h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	assert.equal( event.defaultPrevented, true );
	assert.deepEqual( log, [ "touch start", "press down" ] );
	assert.deepEqual( h.errors.map( args => [ args[ 0 ], args[ 1 ].message ] ), [
		[ "onmouse: Handler for \"down\" failed:", "mouse" ],
		[ "onpress: Handler for \"down\" failed:", "press" ],
		[ "onclick: Handler for \"click\" failed:", "click" ],
		[ "ontouch: Handler for \"start\" failed:", "touch" ],
		[ "onpress: Handler for \"down\" failed:", "press" ]
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
	$.ontouch( "end", data => ends.push( touchSummary( data ) ) );
	$.ontouch( "end", () => { hits += 1; }, false, { "x": 0, "y": 0, "width": 20, "height": 20 } );

	// One finger lifts inside the hit box, where it moved last
	h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	h.touch( "touchmove", [ { "id": 1, "x": 12, "y": 12 } ] );
	h.touch( "touchend", [], [ { "id": 1, "x": 12, "y": 12 } ] );
	assert.deepEqual( ends, [ [ {
		"id": 1, "x": 12, "y": 12, "lastX": 12, "lastY": 12, "action": "end", "cancelled": false
	} ] ] );
	assert.equal( hits, 1 );
	assert.equal( $.intouch().length, 0 );

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
	assert.deepEqual( touchSummary( $.intouch() ), [ {
		"id": 1, "x": 10, "y": 10, "lastX": null, "lastY": null, "action": "start",
		"cancelled": false
	} ] );
} );

test( "pointer touches keep their own actions and handlers get the changed touches (P2)", () => {
	const h = harness();
	const $ = h.$;
	const starts = [];
	const moves = [];
	$.ontouch( "start", data => starts.push( Array.from( data, touch => touch.id ) ) );
	$.ontouch( "move", data => moves.push( touchSummary( data ) ) );
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
	assert.deepEqual( Array.from( $.intouch(), touch => [ touch.id, touch.action ] ), [
		[ 1, "start" ], [ 2, "move" ]
	] );

	// Polled and handler data are copies of the tracked state
	$.intouch()[ 0 ].x = 99;
	assert.equal( $.intouch()[ 0 ].x, 10 );
} );

test( "pointer touchcancel releases with cancelled and never clicks (P4)", () => {
	const h = harness();
	const $ = h.$;
	const ends = [];
	const pressUps = [];
	let clicks = 0;
	$.ontouch( "end", data => ends.push( touchSummary( data ) ) );
	$.onpress( "up", data => pressUps.push( touchSummary( data ) ) );
	$.onclick( () => { clicks += 1; }, false, { "x": 0, "y": 0, "width": 20, "height": 20 } );
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
	assert.equal( $.intouch().length, 0 );

	// A touch that starts outside the box and ends inside it does not click
	const outside = { "id": 2, "x": 50, "y": 50 };
	h.touch( "touchstart", [ outside ] );
	h.touch( "touchend", [], [ { "id": 2, "x": 10, "y": 10 } ] );
	assert.equal( clicks, 0 );
	assert.equal( pressUps[ 1 ].cancelled, false );

	// A tap still clicks, and mouse data carries the field as well
	h.tap( 10, 10 );
	assert.equal( clicks, 1 );
	assert.equal( $.inmouse().cancelled, false );
} );

test( "pointer press follows the primary touch, and each touch clicks on its own (P3)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const clicks = [];
	$.onpress( "down", data => log.push( [ "down", data.id, data.x, data.buttons ] ) );
	$.onpress( "move", data => log.push( [ "move", data.id, data.x, data.buttons ] ) );
	$.onpress( "up", data => log.push( [ "up", data.id, data.x, data.buttons, data.action ] ) );
	$.onclick( data => clicks.push( [ data.id, data.x, data.action, data.buttons ] ), false,
		{ "x": 70, "y": 70, "width": 20, "height": 20 } );
	const first = { "id": 1, "x": 10, "y": 10 };
	const second = { "id": 2, "x": 80, "y": 80 };
	const moved = { "id": 2, "x": 82, "y": 80 };
	h.touch( "touchstart", [ first ], [ first ] );
	h.touch( "touchstart", [ first, second ], [ second ] );
	h.touch( "touchmove", [ first, moved ], [ moved ] );
	const held = $.inpress();
	assert.deepEqual( [ held.id, held.x, held.buttons ], [ 1, 10, 1 ] );
	assert.deepEqual( Array.from( held.touches, touch => touch.id ), [ 1, 2 ] );
	h.touch( "touchend", [ first ], [ moved ] );
	assert.deepEqual( log, [ [ "down", 1, 10, 1 ] ] );
	assert.deepEqual( clicks, [ [ 2, 82, "up", 0 ] ] );
	h.touch( "touchend", [], [ first ] );
	assert.deepEqual( log, [ [ "down", 1, 10, 1 ], [ "up", 1, 10, 0, "up" ] ] );
	assert.equal( $.inpress().buttons, 0 );

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
	$.onclick( () => { clicks += 1; } );
	$.onpress( "down", data => presses.push( data.buttons ) );
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
	$.onclick( () => { clicks += 1; }, false, { "x": 0, "y": 0, "width": 20, "height": 20 } );

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
