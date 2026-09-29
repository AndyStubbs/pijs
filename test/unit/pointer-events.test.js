/**
 * Pointer dispatch regressions against the real plugin modules. Owned by the pointer workstream.
 *
 * The harness loads `listeners.js`, `mouse.js`, `touch.js`, `press.js`, and the plugin entry into
 * `vm` contexts and maps command arguments with core's real parseOptions, so the positional and
 * object forms behave as in the bundles. Its mouse and touch helpers dispatch the pointer events a
 * browser sends, through the listeners the plugin adds to fake canvases, so they reach the plugin
 * only while tracking is started. A fake canvas captures pointers, so a captured pointer's events
 * reach it from outside. Each canvas maps client coordinates one to one onto its screen.
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
// The `buttons` bit of each `button` value
const BUTTON_BITS = [ 1, 4, 2, 8, 16 ];

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
	modules.listeners = load( "plugins/pointer/listeners.js" );
	modules.mouse = load( "plugins/pointer/mouse.js", {
		"g_target": modules.target, "g_press": lazy( "press" ),
		"g_listeners": modules.listeners
	} );
	modules.touch = load( "plugins/pointer/touch.js", {
		"g_target": modules.target, "g_press": lazy( "press" ),
		"g_listeners": modules.listeners
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

		// A canvas captures pointers as browsers do: the captured pointer's events go to it
		const canvas = g_harness.createEventTarget( {
			"width": width, "height": height, "dataset": { "screenId": String( id ) },
			"style": {}, "captures": new Set(),
			"setPointerCapture": pointerId => canvas.captures.add( pointerId )
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
	 * The pointer event a browser sends for a mouse action. A press or release while another
	 * button stays held is a chorded `pointermove` naming the button; `"contextmenu"` passes
	 * through.
	 *
	 * @param {string} type - `"mousedown"`, `"mousemove"`, `"mouseup"`, or `"contextmenu"`.
	 * @param {number} buttons - Buttons held after the event.
	 * @param {number} button - The button that changed.
	 * @returns {Object} `{ type, button }` of the pointer event.
	 */
	function mouseEvent( type, buttons, button ) {
		const bit = BUTTON_BITS[ button ] || 0;
		if( type === "mousedown" && ( buttons & ~bit ) === 0 ) {
			return { "type": "pointerdown", "button": button };
		}
		if( type === "mouseup" && buttons === 0 ) {
			return { "type": "pointerup", "button": button };
		}
		if( type === "mousedown" || type === "mouseup" ) {
			return { "type": "pointermove", "button": button };
		}
		if( type === "mousemove" ) {
			return { "type": "pointermove", "button": -1 };
		}
		return { "type": type, "button": button };
	}

	/**
	 * Dispatch a pointer event to the canvas that captured its pointer, or else to a target.
	 * A release or cancel ends the capture.
	 *
	 * @param {Object} event - Pointer event.
	 * @param {Object|null} target - Canvas under the pointer, or null outside every canvas.
	 * @returns {Object} The dispatched event.
	 */
	function dispatchPointer( event, target ) {
		for( const data of Object.values( screens ) ) {
			if( data.canvas.captures.has( event.pointerId ) ) {
				target = data.canvas;
			}
		}
		if( target ) {
			event.target = target;
			target.dispatchEvent( event );
			if( event.type === "pointerup" || event.type === "pointercancel" ) {
				target.captures.delete( event.pointerId );
			}
		}
		return event;
	}

	/**
	 * Dispatch the pointer events of a mouse action on a screen's canvas.
	 *
	 * @param {string} type - Mouse action, such as `"mousedown"`.
	 * @param {number} x - Screen x.
	 * @param {number} y - Screen y.
	 * @param {number} [buttons] - Buttons held after the event.
	 * @param {number} [button] - The button that changed; 0 is the primary button.
	 * @param {Object} [screenData] - Target screen.
	 * @returns {Object} The dispatched event.
	 */
	function mouse( type, x, y, buttons = 0, button = 0, screenData = activeScreen ) {
		const pointer = mouseEvent( type, buttons, button );
		const event = {
			"type": pointer.type, "pointerId": 1, "pointerType": "mouse", "isPrimary": true,
			"clientX": x + 0.5, "clientY": y + 0.5, "buttons": buttons,
			"button": pointer.button, "defaultPrevented": false,
			"preventDefault": () => { event.defaultPrevented = true; }
		};
		return dispatchPointer( event, screenData.canvas );
	}

	/**
	 * Dispatch a mouse action outside every canvas: only a canvas that captured the mouse
	 * receives it.
	 *
	 * @param {string} type - Mouse action, such as `"mouseup"`.
	 * @param {number} x - Client x, in the first screen's coordinates.
	 * @param {number} y - Client y, in the first screen's coordinates.
	 * @param {number} [buttons] - Buttons held after the event.
	 * @param {number} [button] - The button that changed; 0 is the primary button.
	 * @returns {Object} The dispatched event.
	 */
	function mouseOutside( type, x, y, buttons = 0, button = 0 ) {
		const pointer = mouseEvent( type, buttons, button );
		const event = {
			"type": pointer.type, "pointerId": 1, "pointerType": "mouse", "isPrimary": true,
			"clientX": x + 0.5, "clientY": y + 0.5, "buttons": buttons, "button": pointer.button
		};
		return dispatchPointer( event, null );
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
	 * Dispatch the pointer events of a touch action: one per changed touch, as browsers send.
	 *
	 * @param {string} type - Touch action, such as `"touchstart"`.
	 * @param {Array<Object>} touches - Touches down after the event, as `{ id, x, y }`.
	 * @param {Array<Object>} [changed] - Touches the event changed.
	 * @param {Object} [screenData] - Target screen.
	 * @returns {Array<Object>} The dispatched events.
	 */
	function touch( type, touches, changed = touches, screenData = activeScreen ) {
		const types = {
			"touchstart": [ "pointerdown", 0, 1 ], "touchmove": [ "pointermove", -1, 1 ],
			"touchend": [ "pointerup", 0, 0 ], "touchcancel": [ "pointercancel", 0, 0 ]
		};
		const [ pointerType, button, buttons ] = types[ type ];
		return changed.map( item => dispatchPointer( {
			"type": pointerType, "pointerId": item.id, "pointerType": "touch",
			"isPrimary": false, "clientX": item.x + 0.5, "clientY": item.y + 0.5,
			"button": button, "buttons": buttons
		}, screenData.canvas ) );
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
		[ "move" ], "onMouse", listeners, "custom"
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
	helpers.offevent( "move", null, [ "move" ], "offMouse", listeners, "mouse" );
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
	$.onTouch( "down", () => log.push( "touch start" ) );
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
	$.onTouch( { "mode": "down", "fn": () => log.push( "touch start" ) } );
	$.offTouch( { "mode": "down", "fn": other } );
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

test( "pointer once removes its registration; a second registration is ignored (P7, I4)", () => {
	const h = harness();
	const $ = h.$;
	let calls = 0;
	const fn = () => { calls += 1; };

	// The second registration of the function for the mode does nothing, whatever its once
	$.onMouse( "down", fn, true );
	$.onMouse( "down", fn );
	h.click( 10, 10 );
	h.click( 10, 10 );
	assert.equal( calls, 1 );

	// Once the once registration is spent, the function can be registered again
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

test( "pointer handlers are identified by mode and function (I4)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	const fn = data => log.push( data.action );
	const box = { "x": 0, "y": 0, "width": 5, "height": 5 };

	// A second registration with other flags, a hit box, or custom data does nothing
	$.onMouse( "down", fn );
	$.onMouse( "down", fn, true, box, "custom" );
	$.onPress( { "mode": "down", "fn": fn, "hitBox": box } );
	$.onPress( "down", fn );
	$.onClick( fn );
	$.onClick( fn, true, box );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "down", "click" ] );

	// The same function in another mode is its own handler
	log.length = 0;
	$.offPress( "down", fn );
	$.onMouse( "up", fn );
	h.click( 10, 10 );
	assert.deepEqual( log, [ "down", "up", "click" ] );

	// Without a mode, the function is removed from every mode
	log.length = 0;
	const other = () => log.push( "other" );
	$.onMouse( "move", other );
	$.offMouse( null, fn );
	h.click( 10, 10 );
	$.offClick( fn );
	h.mouse( "mousemove", 11, 11 );
	assert.deepEqual( log, [ "click", "other" ] );
	log.length = 0;
	$.onTouch( "down", fn );
	$.onTouch( "up", fn );
	$.onTouch( "move", other );
	$.offTouch( { "fn": fn } );
	$.onPress( "down", fn );
	$.onPress( "up", fn );
	$.offPress( null, fn );
	h.tap( 10, 10 );
	h.touch( "touchstart", [ { "id": 3, "x": 10, "y": 10 } ] );
	h.touch( "touchmove", [ { "id": 3, "x": 11, "y": 11 } ] );
	assert.deepEqual( log, [ "other" ] );

	// Omitting both the mode and the function throws, naming the clear that removes every handler
	const commands = [ [ "offMouse", "mouse" ], [ "offTouch", "touch" ], [ "offPress", "press" ] ];
	for( const [ name, type ] of commands ) {
		for( const args of [ [], [ null, null ], [ { "mode": null, "fn": null } ] ] ) {
			assert.throws( () => $[ name ]( ...args ), error => {
				assert.equal( error.name, "TypeError" );
				assert.equal( error.code, "INVALID_MODE" );
				assert.equal(
					error.message,
					`${name}: mode or fn is required. To remove every handler, call ` +
					`clearEvents( "${type}" ).`
				);
				return true;
			} );
		}
	}
	assert.equal( log.length, 1 );

	// Click has one mode, so offClick() without a function removes every click handler
	$.onClick( () => log.push( "a" ) );
	$.onClick( () => log.push( "b" ) );
	$.offClick();
	h.click( 10, 10 );
	assert.deepEqual( log, [ "other" ] );
} );

test( "pointer clearEvents types each clear their own handlers, on one or every screen (I10)",
	() => {
		const h = harness();
		const $ = h.$;
		const other = h.screen();
		const log = [];
		const register = ( api, name ) => {
			api.onMouse( "down", () => log.push( name + " mouse" ) );
			api.onTouch( "down", () => log.push( name + " touch" ) );
			api.onPress( "down", () => log.push( name + " press" ) );
			api.onClick( () => log.push( name + " click" ) );
		};
		const input = () => {
			log.length = 0;
			h.click( 5, 5 );
			h.tap( 5, 5 );
			h.mouse( "mousedown", 5, 5, 1, 0, other );
			h.mouse( "mouseup", 5, 5, 0, 0, other );
			return log.slice().sort();
		};
		register( $, "main" );
		register( other.api, "other" );

		// "press" keeps click handlers, and "click" clears only clicks
		h.clearEvents( "press" );
		assert.deepEqual( input(), [
			"main click", "main click", "main mouse", "main touch", "other click", "other mouse"
		] );
		h.clearEvents( "click", other );
		assert.deepEqual( input(), [ "main click", "main click", "main mouse", "main touch",
			"other mouse" ] );
		h.clearEvents( "click" );
		assert.deepEqual( input(), [ "main mouse", "main touch", "other mouse" ] );
	}
);

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

	// The canvas's touch-action keeps the touch from the browser, so a throw cannot lose it
	log.length = 0;
	$.onTouch( "down", () => { throw new Error( "touch" ); } );
	$.onTouch( "down", () => log.push( "touch start" ) );
	const [ event ] = h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	assert.equal( event.target.style.touchAction, "none" );
	assert.deepEqual( log, [ "touch start", "press down" ] );
	assert.deepEqual( h.errors.map( args => [ args[ 0 ], args[ 1 ].message ] ), [
		[ "onMouse: Handler for \"down\" failed:", "mouse" ],
		[ "onPress: Handler for \"down\" failed:", "press" ],
		[ "onClick: Handler for \"click\" failed:", "click" ],
		[ "onTouch: Handler for \"down\" failed:", "touch" ],
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
	$.onTouch( "up", data => ends.push( touchSummary( data ) ) );
	$.onTouch( "up", () => { hits += 1; }, false, { "x": 0, "y": 0, "width": 20, "height": 20 } );

	// One finger lifts inside the hit box, where it moved last
	h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	h.touch( "touchmove", [ { "id": 1, "x": 12, "y": 12 } ] );
	h.touch( "touchend", [], [ { "id": 1, "x": 12, "y": 12 } ] );
	assert.deepEqual( ends, [ [ {
		"id": 1, "x": 12, "y": 12, "lastX": 12, "lastY": 12, "action": "up", "cancelled": false
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
		"id": 2, "x": 80, "y": 80, "lastX": 80, "lastY": 80, "action": "up", "cancelled": false
	} ] );
	assert.equal( hits, 1 );
	assert.deepEqual( touchSummary( $.inTouch() ), [ {
		"id": 1, "x": 10, "y": 10, "lastX": 10, "lastY": 10, "action": "down",
		"cancelled": false
	} ] );
} );

test( "pointer touches keep their own actions and handlers get the changed touches (P2)", () => {
	const h = harness();
	const $ = h.$;
	const starts = [];
	const moves = [];
	$.onTouch( "down", data => starts.push( Array.from( data, touch => touch.id ) ) );
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
		[ 1, "down" ], [ 2, "move" ]
	] );

	// Polled and handler data are frozen, so neither can change the tracked state
	assert.throws( () => {
		$.inTouch()[ 0 ].x = 99;
	}, TypeError );
	assert.equal( $.inTouch()[ 0 ].x, 10 );
} );

test( "pointer touchcancel releases with cancelled and never clicks (P4)", () => {
	const h = harness();
	const $ = h.$;
	const ends = [];
	const pressUps = [];
	let clicks = 0;
	$.onTouch( "up", data => ends.push( touchSummary( data ) ) );
	$.onPress( "up", data => pressUps.push( touchSummary( data ) ) );
	$.onClick( () => { clicks += 1; }, false, { "x": 0, "y": 0, "width": 20, "height": 20 } );
	const item = { "id": 1, "x": 10, "y": 10 };
	h.touch( "touchstart", [ item ] );
	h.touch( "touchcancel", [], [ item ] );
	assert.deepEqual( ends, [ [ {
		"id": 1, "x": 10, "y": 10, "lastX": 10, "lastY": 10, "action": "up", "cancelled": true
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
	h.mouse( "mousemove", 50, 50 );
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
	assert.deepEqual( clicks, [ [ 2, 82, "click", 0 ] ] );
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

test( "pointer a mouse release outside the canvas is released once (P8)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "up", data => log.push( [ "mouse up", data.x, data.buttons, data.cancelled ] ) );
	$.onPress( "up", data => log.push( [ "press up", data.x, data.buttons ] ) );

	// The press captures the mouse, so its release arrives from outside the canvas
	const canvas = h.mouse( "mousedown", 50, 50, 1 ).target;
	assert.equal( canvas.captures.has( 1 ), true );
	h.mouse( "mousemove", 99, 50, 1 );
	h.mouseOutside( "mouseup", 150, 50 );
	assert.deepEqual( log, [ [ "mouse up", 150, 0, false ], [ "press up", 150, 0 ] ] );
	assert.equal( $.inMouse().buttons, 0 );
	assert.equal( canvas.captures.has( 1 ), false );

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
	$.onTouch( "up", () => log.push( "touch end" ) );
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
	$.onTouch( "up", data => log.push( [ "touch end", data[ 0 ].id, data[ 0 ].cancelled ] ) );
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
	$.onTouch( "up", data => log.push( [ "touch end", data[ 0 ].cancelled ] ) );
	h.mouse( "mousedown", 50, 50, 1 );
	$.stopMouse();
	assert.deepEqual( log, [ [ "mouse up", true ] ] );
	assert.equal( $.inMouse(), null );
	h.touch( "touchstart", [ { "id": 4, "x": 40, "y": 40 } ] );
	$.stopTouch();
	assert.deepEqual( log[ 1 ], [ "touch end", true ] );
	assert.equal( $.inTouch().length, 0 );
	assert.equal( $.inPress(), null );

	// Stopping again finds nothing held, and registration does not restart tracking
	$.stopMouse();
	$.stopTouch();
	$.onMouse( "down", () => log.push( "down" ) );
	$.onTouch( "down", () => log.push( "start" ) );
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
	other.api.onTouch( "up", () => log.push( "touch end" ) );
	h.mouse( "mousedown", 5, 5, 1, 0, other );
	h.touch( "touchstart", [ { "id": 1, "x": 5, "y": 5 } ], undefined, other );
	h.removeScreen( other );
	assert.deepEqual( log, [] );
	assert.deepEqual( other.canvas.listeners, [] );
	assert.equal( $.inMouse(), null );
} );

test( "pointer presses on the border are ignored, and moves report true positions (P11)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "down", data => log.push( [ "mouse down", data.x, data.y ] ) );
	$.onMouse( "move", data => log.push( [ "mouse move", data.x, data.y, data.buttons ] ) );
	$.onMouse( "up", data => log.push( [ "mouse up", data.x, data.y ] ) );
	$.onTouch( "down", data => log.push( [ "touch start", data[ 0 ].x ] ) );
	$.onTouch( "move", data => log.push( [ "touch move", data[ 0 ].x ] ) );
	$.onTouch( "up", data => log.push( [ "touch end", data[ 0 ].x ] ) );
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
	$.onTouch( "down", first );
	$.onTouch( "down", second );
	$.onTouch( "move", moved );
	$.offTouch( "down", first );
	h.touch( "touchstart", [ { "id": 1, "x": 10, "y": 10 } ] );
	h.touch( "touchmove", [ { "id": 1, "x": 11, "y": 10 } ] );
	assert.deepEqual( log, [ "second", "moved" ] );

	// Without a function, the mode is cleared in both forms; other modes stay
	log.length = 0;
	$.offTouch( { "mode": "down" } );
	$.offTouch( "up", null );
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

test( "pointer setContextMenu controls the menu from screen creation (B10, I12, P14)", () => {
	const h = harness();
	const $ = h.$;
	const menu = () => h.mouse( "contextmenu", 10, 10 ).defaultPrevented;
	const canvas = h.mouse( "contextmenu", 1, 1 ).target;
	const types = () => canvas.listeners.map( listener => listener.type );

	// The menu is suppressed before any tracking, and the setting starts none
	assert.equal( menu(), true );
	$.setContextMenu( true );
	assert.equal( menu(), false );
	$.setContextMenu( false );
	assert.equal( menu(), true );
	assert.deepEqual( types(), [ "contextmenu" ] );
	assert.equal( $.setEnableContextMenu, undefined );

	// Stopping mouse tracking keeps the setting
	$.startMouse();
	$.stopMouse();
	assert.equal( menu(), true );
	$.setContextMenu( true );
	assert.equal( menu(), false );

	// The setting is per screen, and a removed screen keeps no listener
	const other = h.screen();
	assert.equal( h.mouse( "contextmenu", 1, 1, 0, 0, other ).defaultPrevented, true );
	h.removeScreen( other );
	assert.deepEqual( other.canvas.listeners, [] );
} );

test( "pointer setPinchZoom sets the canvas touch-action at any time, never body (B10, P14)",
	() => {
		const h = harness();
		const $ = h.$;
		const canvas = h.mouse( "contextmenu", 1, 1 ).target;
		const other = h.screen();
		canvas.style.touchAction = "pan-y";
		other.canvas.style.touchAction = "pan-y";
		h.document.body.style.touchAction = "pan-x";

		// The setting applies before tracking, does not start it, and touches only its canvas
		$.setPinchZoom( true );
		assert.equal( canvas.style.touchAction, "pinch-zoom" );
		assert.deepEqual( canvas.listeners.map( listener => listener.type ), [ "contextmenu" ] );
		assert.equal( other.canvas.style.touchAction, "pan-y" );

		// Tracking keeps the setting, and a stop does not restore the page's value over it
		$.startTouch();
		assert.equal( canvas.style.touchAction, "pinch-zoom" );
		$.setPinchZoom( false );
		assert.equal( canvas.style.touchAction, "none" );
		$.stopTouch();
		assert.equal( canvas.style.touchAction, "none" );

		// Without the setting, tracking sets none and a stop restores the page's value
		other.api.startTouch();
		assert.equal( other.canvas.style.touchAction, "none" );
		other.api.stopTouch();
		assert.equal( other.canvas.style.touchAction, "pan-y" );
		assert.equal( h.document.body.style.touchAction, "pan-x" );
	}
);

test( "pointer chorded buttons arrive as moves and press and release each button (B6)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "down", data => log.push( [ "down", data.buttons ] ) );
	$.onMouse( "up", data => log.push( [ "up", data.buttons ] ) );
	let clicks = 0;
	$.onClick( () => { clicks += 1; } );
	h.mouse( "mousedown", 10, 10, 1 );
	h.mouse( "mousedown", 10, 10, 3, 2 );
	h.mouse( "mouseup", 10, 10, 1, 2 );
	h.mouse( "mouseup", 10, 10, 0 );
	assert.deepEqual( log, [ [ "down", 1 ], [ "down", 3 ], [ "up", 1 ], [ "up", 0 ] ] );

	// The right button's release disarmed the click, as a mouseup of it did
	assert.equal( clicks, 0 );
	h.click( 10, 10 );
	assert.equal( clicks, 1 );
} );

test( "pointer pointercancel and pens: a cancelled mouse release, and pen data (B6, I6)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onMouse( "up", data => log.push( [ data.action, data.cancelled, data.type ] ) );
	let clicks = 0;
	$.onClick( () => { clicks += 1; } );
	h.mouse( "mousedown", 10, 10, 1 );
	h.mouse( "pointercancel", 10, 10 );
	assert.deepEqual( log, [ [ "up", true, "mouse" ] ] );
	assert.equal( clicks, 0 );
	assert.equal( $.inMouse().buttons, 0 );

	// Mouse commands observe pens, reported as such
	const canvas = h.mouse( "mousemove", 1, 1 ).target;
	canvas.dispatchEvent( {
		"type": "pointerdown", "pointerId": 5, "pointerType": "pen", "target": canvas,
		"clientX": 20.5, "clientY": 20.5, "button": 0, "buttons": 1
	} );
	assert.deepEqual( [ $.inMouse().type, $.inMouse().x, $.inMouse().buttons ], [ "pen", 20, 1 ] );
	assert.equal( canvas.captures.has( 5 ), true );
} );

test( "pointer a refused capture still tracks the press over the canvas (B6)", () => {
	const h = harness();
	const $ = h.$;
	const log = [];
	$.onPress( "up", data => log.push( data.buttons ) );
	const canvas = h.mouse( "mousemove", 1, 1 ).target;
	canvas.setPointerCapture = () => {
		throw new Error( "NotFoundError" );
	};
	h.mouse( "mousedown", 10, 10, 1 );
	h.mouse( "mouseup", 12, 10 );
	assert.deepEqual( log, [ 0 ] );
} );

test( "pointer mouse and touch share one set of canvas listeners and touch-action (B6)", () => {
	const h = harness();
	const $ = h.$;
	const canvas = h.mouse( "mousemove", 1, 1 ).target;
	const types = () => canvas.listeners.map( listener => listener.type ).sort();
	canvas.style.touchAction = "pan-y";
	$.startMouse();
	$.startTouch();
	assert.deepEqual( types(), [
		"contextmenu", "pointercancel", "pointerdown", "pointermove", "pointerup"
	] );
	assert.equal( canvas.style.touchAction, "none" );

	// Each stops its own pointers; the pointer listeners go with the last, and the context
	// menu stays suppressed
	$.stopTouch();
	assert.equal( canvas.style.touchAction, "pan-y" );
	const starts = [];
	$.onTouch( "down", () => starts.push( "touch" ) );
	$.stopTouch();
	h.touch( "touchstart", [ { "id": 1, "x": 5, "y": 5 } ] );
	assert.deepEqual( starts, [] );
	assert.equal( types().length, 5 );
	$.stopMouse();
	assert.deepEqual( types(), [ "contextmenu" ] );
} );

test( "pointer reads return the frozen data of the last event, or null (I5, I7, I9, P15)", () => {
	const h = harness();
	const $ = h.$;
	const seen = {};
	$.onMouse( "move", data => { seen.mouse = data; } );
	$.onPress( "move", data => { seen.press = data; } );
	$.onTouch( "down", data => { seen.touches = data; } );
	$.onClick( data => { seen.click = data; } );

	// Nothing to report before the first event; the empty touch list is frozen too
	assert.equal( $.inMouse(), null );
	assert.equal( $.inPress(), null );
	assert.equal( $.inTouch(), $.inTouch() );
	assert.ok( Object.isFrozen( $.inTouch() ) && $.inTouch().length === 0 );

	// A read returns the object its handlers received, the same one until the next event
	h.mouse( "mousemove", 10, 10 );
	const mouse = $.inMouse();
	assert.equal( mouse, seen.mouse );
	assert.equal( $.inMouse(), mouse );
	assert.equal( $.inPress(), seen.press );
	assert.equal( $.inPress(), $.inPress() );
	assert.ok( Object.isFrozen( mouse ) && Object.isFrozen( seen.press ) );
	assert.ok( Object.isFrozen( seen.press.touches ) );
	h.mouse( "mousemove", 11, 10 );
	assert.notEqual( $.inMouse(), mouse );
	assert.equal( $.inMouse(), seen.mouse );
	h.click( 11, 10 );
	assert.ok( Object.isFrozen( seen.click ) );

	// The touch list is replaced when a touch changes, and holds the handlers' objects
	h.touch( "touchstart", [ { "id": 1, "x": 20, "y": 20 } ] );
	const touches = $.inTouch();
	assert.equal( $.inTouch(), touches );
	assert.equal( touches[ 0 ], seen.touches[ 0 ] );
	assert.ok( Object.isFrozen( touches ) && Object.isFrozen( seen.touches ) );
	assert.ok( Object.isFrozen( touches[ 0 ] ) );
	assert.equal( $.inPress().touches, touches );
	assert.equal( $.inPress(), $.inPress() );
	h.touch( "touchmove", [ { "id": 1, "x": 21, "y": 20 } ] );
	assert.notEqual( $.inTouch(), touches );
	assert.equal( $.inTouch()[ 0 ].x, 21 );

	// A stop empties the reads of its input; the press follows the input it came from
	$.stopMouse();
	assert.equal( $.inMouse(), null );
	assert.equal( $.inPress().type, "touch" );
	$.stopTouch();
	assert.equal( $.inPress(), null );
	assert.equal( $.inTouch().length, 0 );

	// A restart reports nothing until the next event
	$.startMouse();
	assert.equal( $.inMouse(), null );
	h.mouse( "mousemove", 12, 10 );
	assert.equal( $.inMouse().x, 12 );
	assert.equal( $.inPress().type, "mouse" );
} );

test( "pointer mouse, touch, press, and click data share one shape (B7, I3, P12)", () => {
	const h = harness();
	const $ = h.$;
	const keys = [ "x", "y", "lastX", "lastY", "buttons", "action", "type", "id", "cancelled" ];
	const seen = {};
	$.onMouse( "down", data => { seen.mouse = data; } );
	$.onTouch( "down", data => { seen.touch = data[ 0 ]; } );
	$.onTouch( "up", data => { seen.touchUp = data[ 0 ]; } );
	$.onPress( "down", data => { seen.press = data; } );
	$.onClick( data => { seen.click = data; } );

	// A mouse's first event reports its own position as the last one
	h.click( 10, 12 );
	assert.deepEqual( Object.keys( seen.mouse ), keys );
	assert.deepEqual( [ seen.mouse.lastX, seen.mouse.lastY ], [ 10, 12 ] );
	assert.deepEqual( Object.keys( seen.press ), [ ...keys, "touches" ] );
	assert.equal( seen.press.touches.length, 0 );
	assert.deepEqual( Object.keys( seen.click ), keys );
	assert.deepEqual( [ seen.click.action, seen.click.type ], [ "click", "mouse" ] );
	assert.deepEqual( Object.keys( $.inPress() ), [ ...keys, "touches" ] );

	// Touches: modes and actions down, move, up; contact is button 1; lastX starts at x
	h.touch( "touchstart", [ { "id": 3, "x": 20, "y": 20 } ] );
	h.touch( "touchstart", [ { "id": 3, "x": 20, "y": 20 }, { "id": 4, "x": 30, "y": 30 } ], [
		{ "id": 4, "x": 30, "y": 30 }
	] );
	assert.deepEqual( Object.keys( seen.touch ), keys );
	assert.deepEqual(
		[ seen.touch.action, seen.touch.buttons, seen.touch.lastX, seen.touch.type ],
		[ "down", 1, 30, "touch" ]
	);

	// Press data holds separate frozen copies of the touches down, so it serializes
	const press = $.inPress();
	assert.deepEqual( Object.keys( press ), [ ...keys, "touches" ] );
	assert.deepEqual( [ press.action, press.id ], [ "down", 3 ] );
	assert.deepEqual( Array.from( press.touches, touch => [ touch.id, touch.action ] ), [
		[ 3, "down" ], [ 4, "down" ]
	] );
	assert.ok( Object.isFrozen( press.touches ) && Object.isFrozen( press.touches[ 0 ] ) );
	assert.equal( JSON.parse( JSON.stringify( press ) ).touches.length, 2 );
	h.touch( "touchend", [ { "id": 3, "x": 20, "y": 20 } ], [ { "id": 4, "x": 30, "y": 30 } ] );
	assert.deepEqual( [ seen.touchUp.action, seen.touchUp.buttons ], [ "up", 0 ] );
	assert.deepEqual(
		[ seen.click.type, seen.click.id, seen.click.action ], [ "touch", 4, "click" ]
	);

	// The old touch modes name their replacements
	for( const [ command, mode, renamed ] of [
		[ "onTouch", "start", "down" ], [ "offTouch", "end", "up" ]
	] ) {
		assert.throws( () => $[ command ]( mode, () => {} ), error => {
			return error.code === "INVALID_MODE" &&
				error.message.startsWith( `${command}: mode "${mode}" is now "${renamed}"` );
		} );
	}
} );
