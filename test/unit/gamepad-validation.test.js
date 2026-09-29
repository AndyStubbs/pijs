/**
 * Gamepad regressions against the real plugin module with scripted pads and frames. Owned by
 * the gamepad workstream.
 *
 * The harness loads `plugins/gamepad/index.js` with the shared `vm` loader. Commands are mapped
 * with core's real parseOptions, so the positional and object forms behave as in the bundles.
 * `navigator.getGamepads()` returns the scripted pads, animation frames run only when a test
 * calls `frame()`, in the order they were requested, and connection and `visibilitychange`
 * events are dispatched through the listeners the plugin adds to a fake `window` and
 * `document`. The `clearEvents` handler the plugin registers is kept for tests to call.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;

// Core's option mapping. It shares this realm's Object, so the object literals tests pass are
// recognized as the object form; its color checker only needs a canvas stub at load.
const m_utils = g_harness.loadModule( "src/core/utils.js", {
	"Object": Object,
	"document": { "createElement": () => ( { "getContext": () => ( {} ) } ) }
} );

/**
 * The real gamepad plugin with scripted pads.
 *
 * @param {Object} [options] - Harness options.
 * @param {Object} [options.navigator] - A navigator in place of one whose `getGamepads()`
 *   returns the scripted pads.
 * @returns {Object} `{ $, commands, setPad, removePad, connect, disconnect, frame,
 *   requestAnimationFrame, hide, clearEvents, frames, errors, padStates }`. `$` maps arguments
 *   as the bundles do; `commands` holds the plugin's functions, which take an options object;
 *   `padStates` is the plugin's internal per-pad state.
 */
function createHarness( options = {} ) {
	const commands = {};
	const api = {};
	const clearHandlers = {};
	const frames = new Map();
	const pads = [];
	const errors = [];
	let nextFrame = 0;
	const window = g_harness.createEventTarget();
	const document = g_harness.createEventTarget( { "visibilityState": "visible" } );
	function requestAnimationFrame( fn ) {
		nextFrame += 1;
		frames.set( nextFrame, fn );
		return nextFrame;
	}
	const plugin = g_harness.loadModule( "plugins/gamepad/index.js", {
		"console": { "error": ( ...args ) => errors.push( args ) },
		"window": window,
		"document": document,
		"navigator": options.navigator || { "getGamepads": () => pads.slice() },
		"requestAnimationFrame": requestAnimationFrame,
		"cancelAnimationFrame": id => frames.delete( id )
	}, { "expose": [ "m_padStates" ] } );
	plugin.gamepadPlugin( {
		"addCommand": ( name, fn, isScreen, params ) => {
			commands[ name ] = fn;
			api[ name ] = ( ...args ) => fn( m_utils.parseOptions( args, params ) );
		},
		"registerClearEvents": ( name, fn ) => { clearHandlers[ name ] = fn; }
	} );

	/**
	 * Set a pad's state as the browser reports it. Omitted fields keep their values; a new pad
	 * has four released buttons and four centered axes.
	 *
	 * @param {number} index - Pad index.
	 * @param {Object} [state] - `buttons` as booleans, `axes` as numbers.
	 * @returns {void}
	 */
	function setPad( index, state = {} ) {
		let pad = pads[ index ];
		if( !pad ) {
			pad = {
				"index": index, "id": `pad ${index}`, "connected": true, "mapping": "standard",
				"timestamp": 0, "vibrationActuator": null,
				"buttons": [ false, false, false, false ].map( pressed => {
					return { "pressed": pressed, "value": 0 };
				} ),
				"axes": [ 0, 0, 0, 0 ]
			};
		}
		let buttons = pad.buttons;
		if( state.buttons ) {
			buttons = state.buttons.map( pressed => {
				let value = 0;
				if( pressed ) {
					value = 1;
				}
				return { "pressed": pressed, "value": value };
			} );
		}
		let axes = pad.axes;
		if( state.axes ) {
			axes = state.axes.slice();
		}
		pads[ index ] = { ...pad, "buttons": buttons, "axes": axes,
			"timestamp": pad.timestamp + 1 };
	}

	/**
	 * Run the animation frames requested so far, in request order. Frames requested while they
	 * run wait for the next call.
	 *
	 * @param {number} [count] - Number of frames to run.
	 * @returns {void}
	 */
	function frame( count = 1 ) {
		for( let i = 0; i < count; i += 1 ) {
			const due = Array.from( frames );
			frames.clear();
			for( const [ , fn ] of due ) {
				fn();
			}
		}
	}

	return {
		"$": api,
		"commands": commands,
		"setPad": setPad,
		"removePad": index => { pads[ index ] = null; },
		"connect": index => {
			window.dispatchEvent( { "type": "gamepadconnected", "gamepad": pads[ index ] } );
		},
		"disconnect": index => {
			const pad = pads[ index ];
			pads[ index ] = null;
			window.dispatchEvent( {
				"type": "gamepaddisconnected", "gamepad": { ...pad, "connected": false }
			} );
		},
		"frame": frame,
		"requestAnimationFrame": requestAnimationFrame,
		"hide": ( isHidden = true ) => {
			if( isHidden ) {
				document.visibilityState = "hidden";
			} else {
				document.visibilityState = "visible";
			}
			document.dispatchEvent( { "type": "visibilitychange" } );
		},
		"clearEvents": ( screenData = null ) => clearHandlers.gamepad( screenData ),
		"frames": frames,
		"window": window,
		"document": document,
		"errors": errors,
		"padStates": plugin.m_padStates
	};
}

/**
 * The harness with one pad whose axes exercise the dead zone, read once to start polling.
 *
 * @returns {Object} The harness, plus `poll()`, which runs one frame and returns pad 0's axes.
 */
function createSensitivityHarness() {
	const h = createHarness();
	h.setPad( 0, { "buttons": [], "axes": [ 0.5, -0.5, 0.1, -0.1, 0, 1, -1 ] } );
	h.poll = () => {
		assert.equal( h.frames.size, 1 );
		h.frame();
		return Array.from( h.commands.inGamepad( { "gamepadIndex": 0 } ).axes );
	};
	h.commands.inGamepad( { "gamepadIndex": 0 } );
	return h;
}

function checkAxes( actual, expected ) {
	assert.equal( actual.length, expected.length );
	for( let i = 0; i < expected.length; i++ ) {
		assert.ok( Number.isFinite( actual[ i ] ) );
		assert.ok( Math.abs( actual[ i ] - expected[ i ] ) < 1e-10,
			`Axis ${i}: expected ${expected[ i ]}, received ${actual[ i ]}` );
	}
}

const invalidValues = [ NaN, Infinity, -Infinity, -0.01, 1.01, "0.2", null, undefined,
	true, false, {}, [], [ 0.2 ], new Number( 0.2 ), 0n, Symbol( "sensitivity" ) ];

for( const [ index, value ] of invalidValues.entries() ) {
	test( `SYS-021 invalid sensitivity ${index} (${String( value )}) preserves polling`, () => {
		const h = createSensitivityHarness();
		h.commands.setGamepadSensitivity( { "sensitivity": 0.25 } );
		checkAxes( h.poll(), [ 1 / 3, -1 / 3, 0, 0, 0, 1, -1 ] );
		assert.throws( () => h.commands.setGamepadSensitivity( { "sensitivity": value } ), {
			"name": "TypeError", "code": "INVALID_PARAMETERS",
			"message": "setGamepadSensitivity: sensitivity must be a number between 0 and 1."
		} );
		h.setPad( 0, { "axes": [ 0.625, -0.625, 0.2, -0.2, 0, 1, -1 ] } );
		checkAxes( h.poll(), [ 0.5, -0.5, 0, 0, 0, 1, -1 ] );
	} );
}

test( "gamepad registers inGamepad, and not the old name (I1, I16)", () => {
	const h = createHarness();
	assert.equal( typeof h.$.inGamepad, "function" );
	assert.equal( h.$.ingamepad, undefined );
	assert.equal( h.commands.ingamepad, undefined );
} );

test( "gamepad onGamepad and offGamepad identify handlers by mode and function (A5, I4, P8)",
	() => {
		const h = createHarness();
		const log = [];
		const onConnect = pad => log.push( "connect " + pad.index );
		const onDisconnect = data => log.push( "disconnect " + data.index );
		const both = data => log.push( "both " + data.index );
		assert.equal( h.$.onGamepadConnected, undefined );
		assert.equal( h.$.onGamepadDisconnected, undefined );

		// A second registration of the function for the mode does nothing, whatever its once
		h.setPad( 0 );
		h.$.onGamepad( "connect", onConnect );
		h.$.onGamepad( "connect", onConnect, true );
		h.$.onGamepad( { "mode": "disconnect", "fn": onDisconnect } );
		h.$.onGamepad( "connect", both );
		h.$.onGamepad( "disconnect", both );
		assert.deepEqual( log, [ "connect 0", "both 0" ] );

		// offGamepad( null, fn ) removes a function from both modes, and a mode and a function
		// remove that handler
		log.length = 0;
		h.$.offGamepad( null, both );
		h.$.offGamepad( "connect", onConnect );
		h.disconnect( 0 );
		h.setPad( 0 );
		h.connect( 0 );
		assert.deepEqual( log, [ "disconnect 0" ] );

		// offGamepad( mode ) and the object form without fn remove every handler of the mode
		h.$.offGamepad( { "mode": "disconnect" } );
		h.disconnect( 0 );
		assert.deepEqual( log, [ "disconnect 0" ] );

		// A once handler runs for one pad, the replay of connected pads included
		log.length = 0;
		h.setPad( 0 );
		h.connect( 0 );
		h.setPad( 1 );
		h.connect( 1 );
		h.$.onGamepad( "connect", onConnect, true );
		h.setPad( 2 );
		h.connect( 2 );
		h.$.onGamepad( "disconnect", onDisconnect, true );
		h.disconnect( 1 );
		h.disconnect( 2 );
		assert.deepEqual( log, [ "connect 0", "disconnect 1" ] );

		// Once spent, the function can be registered again, and receives the connected pads
		h.$.onGamepad( "connect", onConnect );
		assert.deepEqual( log, [ "connect 0", "disconnect 1", "connect 0" ] );
	}
);

test( "gamepad handlers removed during a dispatch do not run later in it, and offGamepad " +
	"validates its arguments (I4, I8)", () => {
	const h = createHarness();
	const log = [];
	const removed = () => log.push( "removed" );
	h.$.onGamepad( "disconnect", () => {
		log.push( "first" );
		h.$.offGamepad( "disconnect", removed );
	} );
	h.$.onGamepad( "disconnect", removed );
	h.setPad( 0 );
	h.connect( 0 );
	h.disconnect( 0 );
	assert.deepEqual( log, [ "first" ] );

	const check = ( call, type, code, message ) => {
		assert.throws( call, error => {
			assert.deepEqual( [ error.name, error.code ], [ type, code ] );
			if( message ) {
				assert.equal( error.message, message );
			}
			return true;
		} );
	};
	const fn = () => {};
	check( () => h.$.onGamepad( "press", fn ), "RangeError", "INVALID_MODE",
		"onGamepad: mode must be \"connect\" or \"disconnect\"." );
	check( () => h.$.onGamepad( 5, fn ), "TypeError", "INVALID_MODE" );
	check( () => h.$.onGamepad( "connect", "fn" ), "TypeError", "INVALID_FUNCTION",
		"onGamepad: fn must be a function." );
	check( () => h.$.offGamepad(), "TypeError", "INVALID_MODE",
		"offGamepad: mode or fn is required. To remove every handler, call " +
		"clearEvents( \"gamepad\" )." );
	check( () => h.$.offGamepad( "press" ), "RangeError", "INVALID_MODE" );
	check( () => h.$.offGamepad( "connect", 5 ), "TypeError", "INVALID_FUNCTION" );
} );

test( "SYS-021 rejected NaN cannot contaminate a subsequent axis update", () => {
	const h = createSensitivityHarness();
	h.commands.setGamepadSensitivity( { "sensitivity": 0.25 } );

	// Check state preservation independently of whether validation throws.
	try { h.commands.setGamepadSensitivity( { "sensitivity": NaN } ); } catch {}
	checkAxes( h.poll(), [ 1 / 3, -1 / 3, 0, 0, 0, 1, -1 ] );
} );

test( "SYS-021 default, fractional and boundary sensitivities retain finite axis output", () => {
	const h = createSensitivityHarness();
	checkAxes( h.poll(), [ 0.375, -0.375, 0, 0, 0, 1, -1 ] );
	for( const value of [ 0, -0 ] ) {
		h.commands.setGamepadSensitivity( { "sensitivity": value } );
		checkAxes( h.poll(), [ 0.5, -0.5, 0.1, -0.1, 0, 1, -1 ] );
	}
	h.commands.setGamepadSensitivity( { "sensitivity": 0.5 } );
	checkAxes( h.poll(), [ 0, 0, 0, 0, 0, 1, -1 ] );
	h.commands.setGamepadSensitivity( { "sensitivity": 1 } );
	h.setPad( 0, { "axes": [ 0.999995, -0.999995, 0.5, -0.5, 0, 1, -1 ] } );
	checkAxes( h.poll(), [ 0.5, -0.5, 0, 0, 0, 1, -1 ] );
} );

/**
 * Count the edges a consumer sees while pad 0 runs P1's script: button 0 held for three
 * frames while axis 0 moves out and back.
 *
 * @param {string} mode - When the consumer reads: `"every-frame"` (after the plugin loop),
 *   `"every-frame-before-loop"`, `"every-other-frame"`, `"timer-every-frame"`, or
 *   `"timer-every-other-frame"` (between frames).
 * @returns {Object} `{ pressed, released, axisChanged }`.
 */
function runEdgeConsumer( mode ) {
	const h = createHarness();
	const script = [
		{},
		{ "buttons": [ true, false, false, false ], "axes": [ 0.8, 0, 0, 0 ] },
		{},
		{},
		{ "buttons": [ false, false, false, false ], "axes": [ 0, 0, 0, 0 ] },
		{}, {}, {}
	];
	const counts = { "pressed": 0, "released": 0, "axisChanged": 0 };
	let frameIndex = 0;
	function read() {
		const pad = h.$.inGamepad( 0 );
		if( pad.getButtonJustPressed( 0 ) ) {
			counts.pressed += 1;
		}
		if( pad.getButtonJustReleased( 0 ) ) {
			counts.released += 1;
		}
		if( pad.getAxisChanged( 0 ) ) {
			counts.axisChanged += 1;
		}
	}
	function userLoop() {
		if( mode !== "every-other-frame" || frameIndex % 2 === 0 ) {
			read();
		}
		h.requestAnimationFrame( userLoop );
	}
	h.setPad( 0 );
	if( mode === "every-frame-before-loop" ) {
		h.requestAnimationFrame( userLoop );
	}
	h.$.startGamepad();
	if( mode === "every-frame" || mode === "every-other-frame" ) {
		h.requestAnimationFrame( userLoop );
	}
	for( frameIndex = 0; frameIndex < script.length; frameIndex += 1 ) {
		h.setPad( 0, script[ frameIndex ] );
		h.frame();
		if( mode === "timer-every-frame" ) {
			read();
		} else if( mode === "timer-every-other-frame" && frameIndex % 2 === 0 ) {
			read();
		}
	}
	return counts;
}

test( "PAD-001 every consumer sees each press, release, and axis change once (P1)", () => {
	for( const mode of [ "every-frame", "every-frame-before-loop", "every-other-frame",
		"timer-every-frame", "timer-every-other-frame" ] ) {
		assert.deepEqual( runEdgeConsumer( mode ),
			{ "pressed": 1, "released": 1, "axisChanged": 2 }, mode );
	}
} );

test( "PAD-001 a press and release between two reads are both reported", () => {
	const h = createHarness();
	h.setPad( 0 );
	const pad = h.$.inGamepad( 0 );
	h.setPad( 0, { "buttons": [ true, false, false, false ], "axes": [ 0.8, 0, 0, 0 ] } );
	h.frame();
	h.setPad( 0, { "buttons": [ false, false, false, false ], "axes": [ 0, 0, 0, 0 ] } );
	h.frame();
	h.$.inGamepad( 0 );
	assert.deepEqual( [ pad.getButtonJustPressed( 0 ), pad.getButtonJustReleased( 0 ),
		pad.getButtonPressed( 0 ) ], [ true, true, false ] );

	// The axis moved and came back, so it did not change since the previous read
	assert.equal( pad.getAxisChanged( 0 ), false );
	h.frame();
	assert.deepEqual( [ pad.getButtonJustPressed( 0 ), pad.getButtonJustReleased( 0 ) ],
		[ false, false ] );
} );

test( "PAD-001 every read in a frame sees the same edges, from any code", () => {
	const h = createHarness();
	h.setPad( 0 );
	const kept = h.$.inGamepad( 0 );
	h.setPad( 0, { "buttons": [ true, false, false, false ] } );
	h.frame();

	// A helper on a kept pad is a read; a later read in the same frame sees the same result
	assert.equal( kept.getButtonJustPressed( 0 ), true );
	assert.equal( h.$.inGamepad( 0 ).getButtonJustPressed( 0 ), true );
	assert.equal( h.$.inGamepad()[ 0 ].buttons[ 0 ].pressStarted, true );
	assert.equal( kept, h.$.inGamepad( 0 ) );
	h.frame();
	assert.equal( kept.getButtonJustPressed( 0 ), false );
	assert.equal( kept.getButtonPressed( 0 ), true );
} );

test( "PAD-001 the first read starts polling without reporting buttons already held", () => {
	const h = createHarness();
	h.setPad( 0, { "buttons": [ true, false, false, false ], "axes": [ 1, 0, 0, 0 ] } );
	assert.equal( h.frames.size, 0 );
	const pad = h.$.inGamepad( 0 );
	assert.equal( h.frames.size, 1 );
	assert.deepEqual( [ pad.getButtonPressed( 0 ), pad.getButtonJustPressed( 0 ),
		pad.getAxis( 0 ), pad.getAxisChanged( 0 ) ], [ true, false, 1, false ] );
} );

test( "PAD-017 the press that exposes a pad is reported once (P3b)", () => {
	const h = createHarness();
	let presses = 0;
	const seen = [];
	h.$.onGamepad( "connect", pad => {
		seen.push( [ pad.index, pad.buttons[ 0 ].pressed ] );
	} );
	function userLoop() {
		const pad = h.$.inGamepad( 0 );
		if( pad && pad.getButtonJustPressed( 0 ) ) {
			presses += 1;
		}
		h.requestAnimationFrame( userLoop );
	}
	h.requestAnimationFrame( userLoop );
	h.frame( 2 );

	// The pad appears with button 0 held, and the event arrives between frames
	h.setPad( 0, { "buttons": [ true, false, false, false ] } );
	h.connect( 0 );
	assert.deepEqual( seen, [ [ 0, false ] ] );
	h.frame( 2 );
	h.setPad( 0, { "buttons": [ false, false, false, false ] } );
	h.frame();

	// A second, ordinary press for comparison
	h.setPad( 0, { "buttons": [ true, false, false, false ] } );
	h.frame();
	h.setPad( 0, { "buttons": [ false, false, false, false ] } );
	h.frame();
	assert.equal( presses, 2 );
} );

test( "PAD-001 connection events do not consume edges", () => {
	const h = createHarness();
	h.setPad( 0 );
	const pad = h.$.inGamepad( 0 );
	h.setPad( 0, { "buttons": [ true, false, false, false ] } );
	h.frame( 2 );

	// A second event for the tracked pad, as after the start-up scan, keeps the press
	h.connect( 0 );
	assert.equal( pad.getButtonJustPressed( 0 ), true );
} );

test( "PAD-002 blur and focus leave polling running (P4)", () => {
	const h = createHarness();
	const frames = [];
	let label = "";
	function userLoop() {
		const pad = h.$.inGamepad( 0 );
		frames.push( [ label, pad.getButtonJustPressed( 0 ), pad.getButtonPressed( 0 ) ] );
		h.requestAnimationFrame( userLoop );
	}
	h.setPad( 0 );
	h.$.startGamepad();
	h.requestAnimationFrame( userLoop );
	label = "idle";
	h.frame();
	label = "press";
	h.setPad( 0, { "buttons": [ true, false, false, false ] } );
	h.frame();
	h.window.dispatchEvent( { "type": "blur" } );
	label = "blurred, held";
	h.frame();
	label = "blurred, released";
	h.setPad( 0, { "buttons": [ false, false, false, false ] } );
	h.frame();
	h.window.dispatchEvent( { "type": "focus" } );
	label = "focused";
	h.frame();
	assert.deepEqual( frames, [
		[ "idle", false, false ], [ "press", true, true ], [ "blurred, held", false, true ],
		[ "blurred, released", false, false ], [ "focused", false, false ]
	] );
	assert.deepEqual( h.window.listeners.filter( listener => {
		return listener.type === "blur" || listener.type === "focus";
	} ), [] );
} );

test( "PAD-002 a hidden page releases the pads until it is visible again", () => {
	const h = createHarness();
	h.setPad( 0 );
	const pad = h.$.inGamepad( 0 );
	h.setPad( 0, { "buttons": [ true, false, false, false ], "axes": [ 1, 0, 0, 0 ] } );
	h.frame();

	// Hidden before the press was read: the button reads as released, with no edges
	h.hide();
	const state = () => [ pad.getButtonPressed( 0 ), pad.getButtonJustPressed( 0 ),
		pad.getButtonJustReleased( 0 ), pad.getAxis( 0 ) ];
	assert.deepEqual( state(), [ false, false, false, 0 ] );
	h.frame( 2 );
	assert.deepEqual( state(), [ false, false, false, 0 ] );

	// On return, a button still held reads as pressed but not just pressed
	h.hide( false );
	h.frame();
	assert.deepEqual( state(), [ true, false, false, 1 ] );
	h.setPad( 0, { "buttons": [ false, false, false, false ] } );
	h.frame();
	assert.deepEqual( state(), [ false, false, true, 1 ] );
} );

test( "PAD-003 a throwing handler is reported and leaves no ghost pad (P5)", () => {
	const h = createHarness();
	h.setPad( 0 );
	h.setPad( 1 );
	h.$.startGamepad();
	h.frame();
	const later = [];
	h.$.onGamepad( "disconnect", () => { throw new Error( "disconnect handler" ); } );
	h.$.onGamepad( "disconnect", data => {
		later.push( [ data.index, Array.from( h.$.inGamepad(), pad => pad.index ) ] );
	} );
	h.disconnect( 1 );
	h.frame();
	assert.deepEqual( later, [ [ 1, [ 0 ] ] ] );
	assert.deepEqual( Array.from( h.$.inGamepad(), pad => pad.index ), [ 0 ] );

	// The connect path
	h.clearEvents();
	const laterConnect = [];
	h.$.onGamepad( "connect", () => { throw new Error( "connect handler" ); } );
	h.$.onGamepad( "connect", pad => { laterConnect.push( pad.index ); } );
	h.setPad( 2 );
	h.connect( 2 );

	// Both handlers also received pad 0, which was already connected
	assert.deepEqual( laterConnect, [ 0, 2 ] );
	assert.deepEqual( h.errors.map( args => [ args[ 0 ], args[ 1 ].message ] ), [
		[ "onGamepad: Handler for \"disconnect\" failed:", "disconnect handler" ],
		[ "onGamepad: Handler for \"connect\" failed:", "connect handler" ],
		[ "onGamepad: Handler for \"connect\" failed:", "connect handler" ]
	] );
} );

test( "PAD-004 a throwing handler in the start-up scan leaves polling running (P5b)", () => {
	const h = createHarness();
	h.setPad( 0 );
	h.setPad( 1 );
	const seen = [];
	h.$.onGamepad( "connect", pad => {
		seen.push( pad.index );
		throw new Error( "scan handler" );
	} );
	assert.deepEqual( seen, [ 0, 1 ] );
	assert.equal( h.frames.size, 1 );
	assert.equal( h.errors.length, 2 );
	h.setPad( 0, { "buttons": [ true, false, false, false ] } );
	h.frame();
	assert.equal( h.$.inGamepad( 0 ).getButtonJustPressed( 0 ), true );
} );

test( "PAD-007 handlers added or cleared during a dispatch wait for the next event (P6)", () => {
	const h = createHarness();
	const calls = [];
	h.$.startGamepad();
	h.$.onGamepad( "connect", pad => {
		calls.push( "first " + pad.index );
		if( calls.length === 1 ) {
			h.$.onGamepad( "connect", added => { calls.push( "added " + added.index ); } );
			calls.push( "registered" );
		}
	} );
	h.setPad( 0 );
	h.connect( 0 );

	// The new handler receives the connected pad after the dispatch, not within it
	assert.deepEqual( calls, [ "first 0", "registered", "added 0" ] );
	h.setPad( 1 );
	h.connect( 1 );
	assert.deepEqual( calls.slice( 3 ), [ "first 1", "added 1" ] );

	// A clear during a dispatch stops the rest of it
	calls.length = 0;
	h.clearEvents();
	h.$.onGamepad( "disconnect", () => {
		calls.push( "clearing" );
		h.clearEvents();
	} );
	h.$.onGamepad( "disconnect", () => { calls.push( "cleared" ); } );
	h.disconnect( 0 );
	h.disconnect( 1 );
	assert.deepEqual( calls, [ "clearing" ] );
} );

test( "PAD-005 new connect handlers receive the pads already connected, once (P7)", () => {
	const h = createHarness();
	h.setPad( 0 );
	h.setPad( 2 );
	const first = [];
	const second = [];
	const third = [];

	// The start-up scan delivers to the first handler; the replay does not repeat it
	h.$.onGamepad( "connect", pad => { first.push( pad.index ); } );
	h.$.onGamepad( "connect", pad => { second.push( pad.index ); } );
	assert.deepEqual( [ first, second ], [ [ 0, 2 ], [ 0, 2 ] ] );

	// A pad the loop recorded before its event reaches every handler once, whenever it
	// registered
	h.setPad( 1 );
	h.frame();
	h.$.onGamepad( "connect", pad => { third.push( pad.index ); } );
	h.connect( 1 );
	assert.deepEqual( [ first, second, third ], [ [ 0, 2, 1 ], [ 0, 2, 1 ], [ 0, 1, 2 ] ] );

	// Polling first, then registering, also replays
	const h2 = createHarness();
	h2.setPad( 0 );
	h2.$.inGamepad();
	const late = [];
	h2.$.onGamepad( "connect", pad => { late.push( pad.index ); } );
	assert.deepEqual( late, [ 0 ] );
} );

test( "PAD-006 a connection event for a tracked pad is not dispatched again (P3)", () => {
	const h = createHarness();
	h.setPad( 0 );
	const calls = [];
	h.$.onGamepad( "connect", pad => { calls.push( pad.index ); } );
	h.connect( 0 );
	h.connect( 0 );
	assert.deepEqual( calls, [ 0 ] );

	// A reconnect is a new connection
	h.disconnect( 0 );
	h.setPad( 0 );
	h.connect( 0 );
	h.connect( 0 );
	assert.deepEqual( calls, [ 0, 0 ] );
} );

test( "PAD-009 pads and the pad list are live objects updated in place (P12)", () => {
	const h = createHarness();
	h.setPad( 0 );
	h.setPad( 1 );
	const pad = h.$.inGamepad( 0 );
	const list = h.$.inGamepad();
	const current = () => {
		return {
			"buttons": pad.buttons, "button": pad.buttons[ 0 ], "axes": pad.axes,
			"lastAxes": pad.lastAxes, "state": h.padStates[ 0 ].buttons[ 0 ],
			"stateAxes": h.padStates[ 0 ].axes, "stateButtons": h.padStates[ 0 ].buttons
		};
	};
	const kept = current();
	h.setPad( 0, { "buttons": [ true, false, false, false ], "axes": [ 1, 0, 0, 0 ] } );
	h.frame();
	assert.equal( h.$.inGamepad( 0 ), pad );
	assert.equal( h.$.inGamepad(), list );
	assert.deepEqual( Array.from( list, item => item.index ), [ 0, 1 ] );
	const now = current();
	for( const key in kept ) {
		assert.equal( now[ key ], kept[ key ], key );
	}
	assert.deepEqual( [ kept.button.pressed, kept.button.pressStarted, kept.axes[ 0 ],
		kept.lastAxes[ 0 ] ], [ true, true, 1, 0 ] );

	// A hidden page and a disconnect keep the same objects too
	h.hide();
	assert.deepEqual( [ pad.getButtonPressed( 0 ), kept.button.pressed, kept.axes[ 0 ] ],
		[ false, false, 0 ] );
	h.disconnect( 1 );
	assert.equal( h.$.inGamepad(), list );
	assert.deepEqual( Array.from( list, item => item.index ), [ 0 ] );
} );

test( "PAD-016 gamepad adds its listeners and loop only when polling starts", () => {
	const h = createHarness();
	const types = target => Array.from( target.listeners, listener => listener.type ).sort();
	assert.deepEqual( [ types( h.window ), types( h.document ), h.frames.size ], [ [], [], 0 ] );
	h.$.startGamepad();
	h.$.startGamepad();
	const started = [ [ "gamepadconnected", "gamepaddisconnected" ], [ "visibilitychange" ], 1 ];
	assert.deepEqual( [ types( h.window ), types( h.document ), h.frames.size ], started );

	// Stopping cancels the loop; starting again adds nothing twice
	h.$.stopGamepad();
	assert.equal( h.frames.size, 0 );
	h.$.startGamepad();
	h.$.startGamepad();
	assert.deepEqual( [ types( h.window ), types( h.document ), h.frames.size ], started );
} );

test( "PAD-016 stopGamepad() holds until startGamepad() and releases the pads (I5, I6, P8)",
	() => {
		const h = createHarness();
		h.setPad( 0, { "buttons": [ true, false, false, false ], "axes": [ 0.9, 0, 0, 0 ] } );
		h.$.startGamepad();
		h.frame();
		const pad = h.$.inGamepad( 0 );
		assert.equal( pad.getButtonPressed( 0 ), true );
		h.$.stopGamepad();

		// While stopped, reads return empty state and do not restart polling, and a kept pad
		// reads released, without a release edge, as on a hidden page
		assert.equal( h.$.inGamepad( 0 ), null );
		assert.equal( h.$.inGamepad().length, 0 );
		assert.equal( h.frames.size, 0 );
		assert.deepEqual(
			[ pad.getButtonPressed( 0 ), pad.getButtonJustReleased( 0 ), pad.getAxis( 0 ) ],
			[ false, false, 0 ]
		);

		// Registering handlers does not restart polling, and connection events call no handler
		const connected = [];
		const disconnected = [];
		h.$.onGamepad( "connect", item => { connected.push( item.index ); } );
		h.$.onGamepad( "disconnect", data => {
			disconnected.push( [ data.index, data.connected ] );
		} );
		assert.equal( h.frames.size, 0 );
		assert.equal( h.$.inGamepad().length, 0 );
		h.setPad( 1 );
		h.connect( 1 );
		h.disconnect( 0 );
		assert.deepEqual( [ connected, disconnected ], [ [], [] ] );

		// startGamepad() catches up with the pad that left and the pad that arrived
		h.$.startGamepad();
		assert.deepEqual( [ connected, disconnected ], [ [ 1 ], [ [ 0, false ] ] ] );
		assert.equal( h.frames.size, 1 );
		h.frame();
		assert.deepEqual( Array.from( h.$.inGamepad(), item => item.index ), [ 1 ] );

		// A start while polling does nothing
		h.$.startGamepad();
		assert.deepEqual( [ connected, disconnected ], [ [ 1 ], [ [ 0, false ] ] ] );
	}
);

test( "PAD-010 inGamepad() always returns an array, and inGamepad( index ) the pad or null " +
	"(A6, I9, P11)", () => {
	const h = createHarness();

	// No pad: an empty array, and null for any index
	const list = h.$.inGamepad();
	assert.ok( Array.isArray( list ) );
	assert.equal( list.length, 0 );
	assert.equal( h.$.inGamepad( 0 ), null );

	// Pads at 0 and 2: the list is compact and in index order, and the gap reads null
	h.setPad( 0 );
	h.setPad( 2 );
	h.connect( 0 );
	h.connect( 2 );
	assert.equal( h.$.inGamepad(), list );
	assert.deepEqual( Array.from( list, pad => pad.index ), [ 0, 2 ] );
	assert.equal( h.$.inGamepad( 1 ), null );
	assert.equal( h.$.inGamepad( { "gamepadIndex": 2 } ).index, 2 );
	assert.equal( h.$.inGamepad( null ), list );

	// A disconnected pad reads null
	h.disconnect( 0 );
	assert.equal( h.$.inGamepad( 0 ), null );
	assert.deepEqual( Array.from( h.$.inGamepad(), pad => pad.index ), [ 2 ] );

	// While stopped, the same array is empty and every index reads null
	h.$.stopGamepad();
	assert.equal( h.$.inGamepad(), list );
	assert.equal( list.length, 0 );
	assert.equal( h.$.inGamepad( 2 ), null );
	h.$.startGamepad();
	assert.deepEqual( Array.from( h.$.inGamepad(), pad => pad.index ), [ 2 ] );
} );

test( "PAD-008 indices must be integers, and an index past the pad reads empty (A8, I11, P10)",
	() => {
		const h = createHarness();
		h.setPad( 0 );
		const pad = h.$.inGamepad( 0 );
		const check = ( call, type, message ) => {
			assert.throws( call, error => {
				assert.deepEqual(
					[ error.name, error.code, error.message ], [ type, "INVALID_INDEX", message ]
				);
				return true;
			} );
		};

		// inGamepad() takes null or omitted for the list, or a non-negative integer
		for( const index of [ 1.5, NaN, "0", Infinity, true ] ) {
			check( () => h.$.inGamepad( index ), "TypeError",
				"inGamepad: gamepadIndex must be an integer." );
		}
		check( () => h.$.inGamepad( -1 ), "RangeError",
			"inGamepad: gamepadIndex must not be negative." );

		// Every helper checks its index the same way, before it reads
		const helpers = [
			[ "getButton", "buttonIndex", null ],
			[ "getButtonPressed", "buttonIndex", false ],
			[ "getButtonJustPressed", "buttonIndex", false ],
			[ "getButtonJustReleased", "buttonIndex", false ],
			[ "getAxis", "axisIndex", 0 ],
			[ "getAxisChanged", "axisIndex", false ]
		];
		for( const [ name, parameter, empty ] of helpers ) {
			for( const index of [ 1.5, NaN, "0", undefined ] ) {
				check( () => pad[ name ]( index ), "TypeError",
					`${name}: ${parameter} must be an integer.` );
			}
			check( () => pad[ name ]( -1 ), "RangeError",
				`${name}: ${parameter} must not be negative.` );

			// Past the pad's four buttons and four axes: the empty value
			assert.equal( pad[ name ]( 20 ), empty, name );
		}
		assert.equal( pad.getButton( 0 ).pressed, false );
		assert.equal( pad.getButtonPressed( 3 ), false );
		assert.equal( pad.getAxis( 3 ), 0 );

		// onGamepad takes a boolean once, or none
		assert.throws( () => h.$.onGamepad( "connect", () => {}, "true" ), error => {
			return error.name === "TypeError" && error.code === "INVALID_ONCE" &&
				error.message === "onGamepad: once must be a boolean.";
		} );
		h.$.onGamepad( "connect", () => {}, null );
		h.$.onGamepad( "disconnect", () => {}, false );
	}
);

test( "PAD-016 the first update after startGamepad() reports no edges (I6)", () => {
	const h = createHarness();
	h.setPad( 0 );
	h.$.inGamepad();
	h.frame();
	h.$.stopGamepad();

	// A button pressed while stopped reads as held, not as just pressed
	h.setPad( 0, { "buttons": [ true, false, false, false ] } );
	h.$.startGamepad();
	h.frame();
	const pad = h.$.inGamepad( 0 );
	assert.deepEqual(
		[ pad.getButtonPressed( 0 ), pad.getButtonJustPressed( 0 ) ], [ true, false ]
	);

	// Later updates report edges again
	h.setPad( 0, { "buttons": [ false, false, false, false ] } );
	h.frame();
	assert.equal( h.$.inGamepad( 0 ).getButtonJustReleased( 0 ), true );
} );

test( "PAD-012 clearEvents( \"gamepad\" ) from any screen clears every handler (I10, P9)", () => {
	const h = createHarness();
	const log = [];
	h.$.onGamepad( "connect", item => log.push( "connect " + item.index ) );
	h.$.onGamepad( "disconnect", data => log.push( "disconnect " + data.index ) );

	// A screen's clearEvents() passes that screen; the gamepad handlers are global
	h.clearEvents( { "id": 2 } );
	h.setPad( 0 );
	h.connect( 0 );
	h.disconnect( 0 );
	assert.deepEqual( log, [] );

	// Handlers registered afterward run
	h.$.onGamepad( "connect", item => log.push( "after " + item.index ) );
	h.setPad( 1 );
	h.connect( 1 );
	assert.deepEqual( log, [ "after 1" ] );
} );

test( "PAD-016 gamepad reads only navigator.getGamepads()", () => {
	const pad = { "index": 0, "id": "pad 0", "connected": true, "mapping": "standard",
		"timestamp": 0, "buttons": [], "axes": [] };
	const h = createHarness( { "navigator": { "webkitGetGamepads": () => [ pad ] } } );
	assert.equal( h.$.inGamepad().length, 0 );
	h.frame();
	assert.equal( h.$.inGamepad().length, 0 );
} );
