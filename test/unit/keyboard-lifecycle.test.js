/**
 * SYS-003 and SYS-011 regressions using real keyboard modules and controlled resources.
 *
 * The harness maps command arguments with core's real parseOptions, so the positional and object
 * forms behave as in the bundles. Key events are dispatched through the listeners the plugin adds
 * to the fake window and document, so they reach the plugin only while those listeners are
 * attached, and carry a target, composedPath(), and getModifierState() as browser events do.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_vm from "node:vm";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;
const vm = g_vm;

// Core's option mapping. It shares this realm's Object, so the object literals tests pass are
// recognized as the object form; its color checker only needs a canvas stub at load.
const m_utils = g_harness.loadModule( "src/core/utils.js", {
	"Object": Object,
	"document": { "createElement": () => ( { "getContext": () => ( {} ) } ) }
} );

/**
 * A fake element for event targets.
 *
 * @param {string} tagName - Upper-case tag name.
 * @param {Object} [properties] - Extra properties, such as `isContentEditable`.
 * @returns {Object} Element.
 */
function createElement( tagName, properties = {} ) {
	const element = {
		"tagName": tagName,
		"isContentEditable": false,
		"blurs": 0,
		"getAttribute": () => null,
		...properties
	};
	element.blur = () => { element.blurs += 1; };
	return element;
}

function harness() {
	const timers = new Map();
	const images = new Map();
	const microtasks = [];
	const errors = [];
	const hooks = [];
	const commands = {};
	const screenCommands = [];
	const clearHandlers = {};
	const api = {};
	const clock = { "now": 1000 };
	let nextTimer = 0;
	const pluginApi = {
		"getApi": () => api,
		"utils": { "queueMicrotask": fn => microtasks.push( fn ) },
		"addCommand": ( name, fn, isScreen, params ) => {
			commands[ name ] = fn;
			if( isScreen ) {
				screenCommands.push( { "name": name, "fn": fn, "params": params } );
			} else {
				api[ name ] = ( ...args ) => fn( m_utils.parseOptions( args, params ) );
			}
		},
		"addScreenCleanupFunction": () => {},
		"addScreenPreCleanupFunction": fn => hooks.push( fn ),
		"registerClearEvents": ( name, fn ) => { clearHandlers[ name ] = fn; }
	};
	api.getImage = name => images.get( name );
	api.removeImage = name => images.delete( name );
	const body = createElement( "BODY" );
	const window = g_harness.createEventTarget();
	const document = g_harness.createEventTarget( { "body": body, "activeElement": body } );
	const globals = {
		"console": { "error": ( ...args ) => errors.push( args ) },
		"setInterval": fn => { timers.set( ++nextTimer, fn ); return nextTimer; },
		"clearInterval": id => timers.delete( id ),
		"Date": { "now": () => clock.now },
		"window": window,
		"document": document,
		"$": api
	};
	function load( file, extra = {} ) {
		return g_harness.loadModule( file, { ...globals, ...extra } );
	}
	const input = load( "plugins/keyboard/input.js" );
	const keyboard = load( "plugins/keyboard/index.js", {
		"g_input": input
	} );
	keyboard.keyboardPlugin( pluginApi );
	function screen() {
		const data = { "isRemoved": false, "width": 100, "font": { "height": 8 },
			"printCursor": { "x": 3, "y": 8, "width": 6, "height": 8 }, "draws": 0,
			"prints": [], "captures": [], "api": {} };
		for( const command of screenCommands ) {
			data.api[ command.name ] = ( ...args ) => {
				return command.fn( data, m_utils.parseOptions( args, command.params ) );
			};
		}
		data.api.getPos = () => ( { "col": 0, "row": 1 } );
		data.api.getRows = () => 10;
		data.api.getPosPx = () => ( { "x": data.printCursor.x, "y": data.printCursor.y } );
		data.api.setPosPx = ( x, y ) => {
			if( typeof x === "object" ) {
				data.printCursor.x = x.x;
				data.printCursor.y = x.y;
			} else {
				data.printCursor.x = x;
				data.printCursor.y = y;
			}
		};
		data.api.createImageFromScreen = options => {
			data.captures.push( options );
			images.set( options.name, {} );
		};
		data.api.blitImage = () => {
			assert.equal( data.isRemoved, false, "must not redraw during disposal" );
			data.draws++;
		};
		data.api.print = msg => {
			assert.equal( data.isRemoved, false, "must not redraw during disposal" );
			data.draws++;
			data.prints.push( msg );
		};
		return data;
	}
	const first = screen();
	api.getPosPx = first.api.getPosPx;
	api.setPosPx = first.api.setPosPx;
	function start( owner = first, fn = null, options = {} ) {
		return owner.api.input( { "prompt": "Name?", "fn": fn, ...options } );
	}
	function dispose( owner = first ) {
		owner.isRemoved = true;
		for( const hook of hooks ) { hook( owner ); }
	}

	/**
	 * Dispatch a key event through the window listeners.
	 *
	 * @param {string} [name] - Key value; also the code unless `init.code` is given.
	 * @param {string} [mode] - "down" or "up".
	 * @param {Object} [init] - Event fields: `code`, `repeat`, `altKey`, `ctrlKey`, `metaKey`,
	 *   `shiftKey`, `target`, `path` for composedPath(), and `modifiers` for extra states.
	 * @returns {Object} The dispatched event.
	 */
	function key( name = "a", mode = "down", init = {} ) {
		const target = init.target || body;
		let type = "keydown";
		if( mode === "up" ) {
			type = "keyup";
		}
		const event = {
			"type": type,
			"key": name,
			"code": init.code ?? name,
			"location": 0,
			"repeat": Boolean( init.repeat ),
			"altKey": Boolean( init.altKey ),
			"ctrlKey": Boolean( init.ctrlKey ),
			"metaKey": Boolean( init.metaKey ),
			"shiftKey": Boolean( init.shiftKey ),
			"target": target,
			"defaultPrevented": false,
			"composedPath": () => init.path || [ target, body, document, window ],
			"getModifierState": state => {
				const states = {
					"Alt": event.altKey, "Control": event.ctrlKey, "Meta": event.metaKey,
					"Shift": event.shiftKey, ...init.modifiers
				};
				return Boolean( states[ state ] );
			},
			"preventDefault": () => { event.defaultPrevented = true; }
		};
		window.dispatchEvent( event );
		return event;
	}

	/**
	 * Run a registered clearEvents handler as core does.
	 *
	 * @param {string} type - clearEvents type, such as "keyboard".
	 * @param {Object|null} [screenData] - Calling screen, or null for no screen.
	 * @returns {void}
	 */
	function clearEvents( type, screenData = null ) {
		clearHandlers[ type ]( screenData );
	}
	return { api, keyboard, input, commands, timers, images, microtasks, errors, first, screen,
		start, dispose, key, clearEvents, window, document, body, clock };
}

function empty( h ) {
	const plugin = [ h.keyboard.onKeyDown, h.keyboard.onKeyUp, h.keyboard.releaseHeldKeys ];
	const promptListeners = h.window.listeners.filter( listener => {
		return !plugin.includes( listener.fn );
	} );
	assert.equal( promptListeners.length, 0, "the prompt removes its listeners" );
	assert.equal( h.timers.size, 0 );
	assert.equal( h.images.size, 0 );
	assert.equal( vm.runInContext( "m_inputData", h.input ), null );
	assert.equal( vm.runInContext( "m_onKeyHandlers.any?.length ?? 0", h.keyboard ), 0 );
}

for( const phase of [ "before", "after" ] ) {
	test( `SYS-003 disposal ${phase} blinking settles once without drawing and releases resources`,
		async () => {
			const h = harness();
			const values = [];
			const promise = h.start( h.first, value => values.push( value ) );
			const queuedTick = [ ...h.timers.values() ][ 0 ];
			if( phase === "after" ) {
				h.clock.now += 600;
				queuedTick();
				assert.ok( h.first.draws > 0, "the blink redraws the prompt" );
			}
			const draws = h.first.draws;
			const y = h.first.printCursor.y;
			h.dispose();
			h.dispose();
			assert.equal( h.first.draws, draws );
			assert.equal( h.first.printCursor.y, y );
			empty( h );
			assert.doesNotThrow( queuedTick );
			assert.equal( await promise, null );
			assert.deepEqual( values, [ null ] );
			assert.throws( () => h.start(), { "code": "SCREEN_REMOVED" } );
			for( let i = 0; i < 3; i++ ) {
				const next = h.screen();
				const replacement = h.start( next );
				h.key( "x" );
				h.key( "Enter" );
				assert.equal( await replacement, "x" );
				empty( h );
			}
		} );
}

test( "SYS-003 disposal only cancels its own prompt", async () => {
	const h = harness();
	const promise = h.start();
	h.dispose( h.screen() );
	assert.equal( h.timers.size, 1 );
	h.commands.cancelInput( h.first );
	assert.equal( await promise, null );
	empty( h );
} );

test( "SYS-003 throwing disposal callback cannot interrupt cleanup or replacement", async () => {
	const h = harness();
	const error = new Error( "input callback" );
	const next = h.screen();
	let replacement;
	let removedCode = null;
	const promise = h.start( h.first, () => {
		try {
			h.start( h.first );
		} catch( removed ) {
			removedCode = removed.code;
		}
		replacement = h.start( next );
		throw error;
	} );
	assert.doesNotThrow( () => h.dispose() );
	assert.equal( await promise, null );
	assert.equal( removedCode, "SCREEN_REMOVED", "the removed owner rejects a new prompt" );
	assert.equal( h.microtasks.length, 1 );
	assert.throws( h.microtasks.shift(), value => value === error );
	assert.equal( h.timers.size, 1 );
	h.key( "b" );
	h.key( "Enter" );
	assert.equal( await replacement, "b" );
	empty( h );
} );

test( "SYS-003 newest reentrant input wins over an outer replacement", async () => {
	const h = harness();
	let newest;
	const old = h.start( h.first, () => { newest = h.start(); } );
	const supersededValues = [];
	const superseded = h.start( h.first, value => supersededValues.push( value ) );
	assert.equal( h.timers.size, 1 );
	assert.equal( h.images.size, 1 );
	h.key( "z" );
	h.key( "Enter" );
	assert.equal( await old, null );
	assert.equal( await superseded, null );
	assert.equal( await newest, "z" );
	assert.deepEqual( supersededValues, [ null ] );
	empty( h );
} );

test( "SYS-003 prompt rendering uses only its owning screen cursor", async () => {
	const h = harness();
	h.api.getPosPx = h.api.setPosPx = () => assert.fail( "global cursor API used" );
	const promise = h.start();
	const cursor = { ...h.first.printCursor };
	[ ...h.timers.values() ][ 0 ]();
	assert.deepEqual( h.first.printCursor, cursor );
	h.key( "Escape" );
	assert.equal( await promise, null );
	empty( h );
} );

test( "SYS-003 failed background initialization rejects and permits a clean retry", async () => {
	const h = harness();
	const error = new Error( "capture failed" );
	const capture = h.first.api.createImageFromScreen;
	h.first.api.createImageFromScreen = options => { capture( options ); throw error; };
	await assert.rejects( h.start(), value => value === error );
	empty( h );
	h.first.api.createImageFromScreen = capture;
	const pending = h.start();
	h.key( "Enter" );
	assert.equal( await pending, "" );
	empty( h );
} );

test( "SYS-003 drawing failure still settles and releases the session", async () => {
	const h = harness();
	const error = new Error( "print failed" );
	const values = [];
	const pending = h.start( h.first, value => values.push( value ) );
	h.first.api.print = () => { throw error; };
	h.commands.cancelInput( h.first );
	assert.equal( await pending, null );
	assert.deepEqual( values, [ null ] );
	empty( h );
	assert.equal( h.microtasks.length, 1 );
	assert.throws( h.microtasks.shift(), value => value === error );
} );

for( const mode of [ "cancel", "enter", "clear" ] ) {
	test( `SYS-003 ${mode} settles despite a throwing callback`, async () => {
		const h = harness();
		const error = new Error( mode );
		const promise = h.start( h.first, () => { throw error; }, { "isNumber": true } );
		h.key( "2" );
		assert.doesNotThrow( () => {
			if( mode === "enter" ) { h.key( "Enter" ); }
			else if( mode === "clear" ) { h.keyboard.clearKeyboardEvents(); }
			else { h.commands.cancelInput( h.first ); }
		} );
		let expected = null;
		if( mode === "enter" ) { expected = 2; }
		assert.equal( await promise, expected );
		empty( h );
		assert.equal( h.microtasks.length, 1 );
		assert.throws( h.microtasks.shift(), value => value === error );
	} );
}

for( const binding of [ "a", "any", [ "a", "b" ] ] ) {
	for( const behavior of [ "nested", "throw" ] ) {
		test( `SYS-011 once ${binding} with ${behavior} runs once and releases all buckets`, () => {
			const h = harness();
			let calls = 0;
			const error = new Error( "key callback" );
			h.api.onKey( binding, "down", () => {
				calls++;
				if( behavior === "throw" ) { throw error; }
				if( calls === 1 ) { h.key( "a" ); }
			}, true );
			h.key( "b" );
			assert.doesNotThrow( () => h.key( "a" ) );
			h.key( "a" );
			assert.equal( calls, 1 );
			assert.equal( vm.runInContext( "Object.keys( m_onKeyHandlers ).length", h.keyboard ), 0 );
			if( behavior === "throw" ) {
				assert.equal( h.errors.length, 1 );
				assert.equal( h.errors[ 0 ][ 1 ], error );
			}
		} );
	}
}

test( "SYS-011 keyup errors preserve combinations, release and default prevention", () => {
	const h = harness();
	const errors = [ new Error( "first" ), new Error( "second" ) ];
	const seen = [];
	h.api.setActionKeys( [ "a" ] );
	h.api.onKey( "a", "up", () => { throw errors[ 0 ]; } );
	h.api.onKey( [ "a", "b" ], "up", data => {
		seen.push( data.length, h.api.inKey( "a" ) === null );
	} );
	h.api.onKey( "any", "up", () => { throw errors[ 1 ]; } );
	h.api.onKey( "any", "up", data => seen.push( data.key ) );
	h.key( "a" ); h.key( "b" );
	let event;
	assert.doesNotThrow( () => { event = h.key( "a", "up" ); } );
	assert.deepEqual( seen, [ 2, true, "a" ], "the combination runs with the key released" );
	assert.equal( h.api.inKey( "a" ), null );
	assert.equal( event.defaultPrevented, true );
	assert.deepEqual( h.errors.map( args => [ args[ 0 ], args[ 1 ] ] ), [
		[ "onKey: Handler for \"up\" failed:", errors[ 0 ] ],
		[ "onKey: Handler for \"up\" failed:", errors[ 1 ] ]
	] );
	assert.equal( h.microtasks.length, 0, "handler errors are not rethrown" );
} );

test( "SYS-011 nested keydown survives outer keyup cleanup", () => {
	const h = harness();
	h.api.onKey( "a", "up", () => h.key( "a" ), true );
	h.key( "a" );
	const original = h.api.inKey( "a" );
	h.key( "a", "up" );
	assert.notEqual( h.api.inKey( "a" ), null );
	assert.notEqual( h.api.inKey( "a" ), original );
	h.key( "a", "up" );
	assert.equal( h.api.inKey( "a" ), null );
} );

test( "SYS-011 dispatch skips removed handlers and preserves repeat filtering", () => {
	const h = harness();
	let calls = 0;
	const removed = () => { calls++; };
	h.api.onKey( "a", "down", () => h.api.offKey( "a", "down", removed ), true );
	h.api.onKey( "a", "down", removed );
	h.key( "a" );
	assert.equal( calls, 0 );
	h.api.onKey( "a", "down", removed, true );
	h.key( "a", "down", { "repeat": true } );
	assert.equal( calls, 0 );
	h.key( "a" );
	assert.equal( calls, 1 );
} );

test( "SYS-011 clear during dispatch invalidates copied handlers", () => {
	const h = harness();
	h.api.onKey( "a", "down", () => h.keyboard.clearKeyboardEvents() );
	h.api.onKey( "a", "down", () => assert.fail( "removed callback invoked" ) );
	assert.doesNotThrow( () => h.key( "a" ) );
	assert.deepEqual( h.errors, [] );
} );

test( "SYS-011 object-form handlers register and remove like the positional form", () => {
	const h = harness();
	const seen = [];
	const fn = data => seen.push( data.code );
	h.api.onKey( { "key": "KeyA", "mode": "down", "fn": fn } );
	h.key( "a", "down", { "code": "KeyA" } );
	h.api.offKey( { "key": "KeyA", "mode": "down", "fn": fn } );
	h.key( "a", "down", { "code": "KeyA" } );
	assert.deepEqual( seen, [ "KeyA" ] );
	assert.equal( h.api.inKey( { "key": "KeyA" } ).key, "a" );
} );

/**
 * Press or release Shift with the given side.
 *
 * @param {Object} h - Harness.
 * @param {string} mode - "down" or "up".
 * @param {string} [code] - "ShiftLeft" or "ShiftRight".
 * @returns {Object} The dispatched event.
 */
function shift( h, mode, code = "ShiftLeft" ) {
	return h.key( "Shift", mode, { "code": code, "shiftKey": mode === "down" } );
}

test( "KEY-001 a key released with a different value is no longer held (K1)", () => {
	const h = harness();
	let combos = 0;
	h.api.onKey( [ "A", "Enter" ], "down", () => { combos++; } );

	// Shift released before the letter: pressed as "A", released as "a"
	shift( h, "down" );
	h.key( "A", "down", { "code": "KeyA", "shiftKey": true } );
	assert.equal( h.api.inKey( "A" ).code, "KeyA" );
	assert.equal( h.api.inKey( "a" ), null );
	shift( h, "up" );
	assert.equal( h.api.inKey( "A" ).code, "KeyA", "the letter is still held" );
	h.key( "a", "up", { "code": "KeyA" } );
	assert.equal( h.api.inKey( "A" ), null );
	assert.equal( h.api.inKey( "KeyA" ), null );
	assert.equal( h.api.inKey().length, 0 );
	h.key( "Enter" );
	h.key( "Enter", "up" );
	assert.equal( combos, 0, "a released value never completes a combination" );

	// Shift pressed during the hold: pressed as "w", released as "W"
	h.key( "w", "down", { "code": "KeyW" } );
	shift( h, "down" );
	h.key( "W", "up", { "code": "KeyW", "shiftKey": true } );
	shift( h, "up" );
	assert.equal( h.api.inKey( "w" ), null );
	assert.equal( h.api.inKey( "W" ), null );
	assert.equal( h.api.inKey().length, 0 );

	// A held value still completes a combination
	shift( h, "down" );
	h.key( "A", "down", { "code": "KeyA", "shiftKey": true } );
	h.key( "Enter", "down", { "shiftKey": true } );
	assert.equal( combos, 1 );
} );

test( "KEY-001 a value stays held until every key producing it is released (K1b)", () => {
	const h = harness();

	// The first read starts tracking (I5)
	h.api.inKey();
	shift( h, "down", "ShiftLeft" );
	shift( h, "down", "ShiftRight" );
	assert.equal( h.api.inKey( "Shift" ).code, "ShiftRight", "the latest press answers" );
	shift( h, "up", "ShiftRight" );
	assert.equal( h.api.inKey( "Shift" ).code, "ShiftLeft" );
	assert.equal( h.api.inKey( "ShiftRight" ), null );
	shift( h, "up", "ShiftLeft" );
	assert.equal( h.api.inKey( "Shift" ), null );

	h.key( "1", "down", { "code": "Digit1" } );
	h.key( "1", "down", { "code": "Numpad1" } );
	h.key( "1", "up", { "code": "Numpad1" } );
	assert.equal( h.api.inKey( "1" ).code, "Digit1" );
	h.key( "1", "up", { "code": "Digit1" } );
	assert.equal( h.api.inKey( "1" ), null );
	assert.equal( h.api.inKey().length, 0 );
} );

test( "KEY-001 a composing keydown does not stay held as Process (K14)", () => {
	const h = harness();
	h.api.inKey();
	h.key( "Process", "down", { "code": "KeyN" } );
	assert.equal( h.api.inKey( "Process" ).code, "KeyN" );
	h.key( "n", "up", { "code": "KeyN" } );
	assert.equal( h.api.inKey( "Process" ), null );
	assert.equal( h.api.inKey( "KeyN" ), null );
	assert.equal( h.api.inKey().length, 0 );
} );

test( "KEY-002 clearEvents( \"keyboard\" ) cancels only the owner's prompt (K2)", async () => {
	const h = harness();
	const other = h.screen();

	// From another screen: the prompt keeps working
	const kept = h.start();
	h.clearEvents( "keyboard", other );
	h.key( "x" );
	h.key( "Enter" );
	assert.equal( await kept, "x" );
	empty( h );

	// From the owning screen, or with no screen: the prompt is cancelled
	for( const caller of [ h.first, null ] ) {
		const values = [];
		const cancelled = h.start( h.first, value => values.push( value ) );
		h.clearEvents( "keyboard", caller );
		h.key( "y" );
		assert.equal( await cancelled, null );
		assert.deepEqual( values, [ null ] );
		empty( h );
	}
} );

test( "KEY-016 clearEvents( \"keyboard\" ) clears every key handler from any screen (I10)",
	async () => {
		const h = harness();
		const second = h.screen();
		function type( key, code ) {
			h.key( key, "down", { "code": code } );
			h.key( key, "up", { "code": code } );
		}
		function register( calls ) {
			h.api.onKey( "KeyA", "down", () => calls.push( "single" ) );
			h.api.onKey( [ "KeyA", "KeyB" ], "down", () => calls.push( "combination" ) );
			h.api.onKey( "any", "up", data => calls.push( data.code ) );
		}

		// Without clearing, the handlers run
		const control = [];
		register( control );
		h.key( "b", "down", { "code": "KeyB" } );
		type( "a", "KeyA" );
		h.key( "b", "up", { "code": "KeyB" } );
		assert.deepEqual( control, [ "single", "combination", "KeyA", "KeyB" ] );
		h.clearEvents( "keyboard" );

		// A prompt on either screen: clearing from the other screen keeps it, and clearing from
		// its own screen or with no screen cancels it; the handlers go in every case
		const results = [];
		for( const [ owner, other ] of [ [ h.first, second ], [ second, h.first ] ] ) {
			for( const caller of [ other, owner, null ] ) {
				const calls = [];
				register( calls );
				const prompt = h.start( owner );
				h.clearEvents( "keyboard", caller );
				h.key( "b", "down", { "code": "KeyB" } );
				h.key( "a", "down", { "code": "KeyA" } );
				const held = h.api.inKey().length;
				h.key( "a", "up", { "code": "KeyA" } );
				h.key( "b", "up", { "code": "KeyB" } );
				type( "Enter", "Enter" );
				results.push( [ calls.length, held, await prompt ] );
				empty( h );
			}
		}

		// Tracking continues after clearing; a prompt that is kept takes its keys (A11)
		assert.deepEqual( results, [
			[ 0, 0, "ba" ], [ 0, 2, null ], [ 0, 2, null ],
			[ 0, 0, "ba" ], [ 0, 2, null ], [ 0, 2, null ]
		] );
	} );

test( "KEY-003 a prompt's keys do not reach key handlers or inKey() (A11)", async () => {
	const h = harness();
	const log = [];
	h.api.onKey( "any", "down", data => log.push( `down ${data.code}` ) );
	h.api.onKey( "any", "up", data => log.push( `up ${data.code} ${data.cancelled}` ) );
	h.api.onKey( "Enter", "down", () => log.push( "Enter handler" ) );

	// A key held across the prompt's start is released once, as cancelled
	h.key( "w", "down", { "code": "KeyW" } );
	const pending = h.start();
	assert.deepEqual( log, [ "down KeyW", "up KeyW true" ] );
	assert.equal( h.api.inKey().length, 0 );

	// Typed keys, and releases while the prompt is active, are the prompt's
	h.key( "a", "down", { "code": "KeyA" } );
	const whileTyping = [ h.api.inKey( "KeyA" ), h.api.inKey().length ];
	h.key( "a", "up", { "code": "KeyA" } );
	h.key( "w", "up", { "code": "KeyW" } );
	h.key( "b", "down", { "code": "KeyB" } );

	// So is the Enter that ends it, and releases after it ends of keys pressed during it
	h.key( "Enter", "down", { "code": "Enter" } );
	assert.equal( await pending, "ab" );
	h.key( "Enter", "up", { "code": "Enter" } );
	h.key( "b", "up", { "code": "KeyB" } );
	assert.deepEqual( whileTyping, [ null, 0 ] );
	assert.deepEqual( log, [ "down KeyW", "up KeyW true" ] );

	// After the prompt, keys reach the handlers again, including a key the prompt withheld
	h.key( "b", "down", { "code": "KeyB" } );
	h.key( "b", "up", { "code": "KeyB" } );
	assert.deepEqual( log.slice( 2 ), [ "down KeyB", "up KeyB false" ] );
} );

test( "KEY-003 the key that ends a prompt is withheld whichever listener runs first (A11)",
	async () => {
		const h = harness();
		const calls = [];

		// The prompt's listener is added first, so it reads Enter and ends before the plugin's
		const pending = h.start();
		h.api.onKey( "Enter", "down", () => calls.push( "down" ) );
		h.api.onKey( "Enter", "up", () => calls.push( "up" ) );
		h.api.setActionKeys( [ "Enter" ] );
		h.key( "x" );
		const down = h.key( "Enter" );
		assert.equal( await pending, "x" );
		const up = h.key( "Enter", "up" );
		assert.deepEqual( calls, [] );
		assert.equal( h.api.inKey( "Enter" ), null );
		assert.deepEqual( [ down.defaultPrevented, up.defaultPrevented ], [ true, true ],
			"an action key keeps its default prevented" );
		empty( h );
		h.key( "Enter" );
		assert.deepEqual( calls, [ "down" ] );
	} );

test( "KEY-006 a prompt reads keys while the keyboard is stopped", async () => {
	const h = harness();
	h.api.stopKeyboard();
	const started = h.start();
	h.key( "a" );
	h.key( "Enter" );
	assert.equal( await started, "a" );
	assert.equal( h.api.inKey( "a" ), null, "the stopped keyboard tracks nothing" );
	empty( h );

	// Stopping during a prompt does not strand it
	h.api.startKeyboard();
	const running = h.start();
	h.key( "b" );
	h.api.stopKeyboard();
	h.key( "c" );
	h.key( "Enter" );
	assert.equal( await running, "bc" );
	empty( h );
} );

test( "SYS-003 the prompt ignores keys typed into editable elements", async () => {
	const h = harness();
	const pending = h.start();
	h.key( "x", "down", { "target": createElement( "INPUT" ) } );
	h.key( "y" );
	h.key( "Enter" );
	assert.equal( await pending, "y" );
	empty( h );
} );

/**
 * Dispatch a paste event through the window listeners.
 *
 * @param {Object} h - Harness.
 * @param {string} text - Clipboard text.
 * @param {Object} [target] - Event target.
 * @returns {Object} The dispatched event.
 */
function paste( h, text, target = h.body ) {
	const event = {
		"type": "paste",
		"target": target,
		"defaultPrevented": false,
		"clipboardData": { "getData": format => {
			assert.equal( format, "text" );
			return text;
		} },
		"composedPath": () => [ target, h.body, h.document, h.window ],
		"preventDefault": () => { event.defaultPrevented = true; }
	};
	h.window.dispatchEvent( event );
	return event;
}

test( "KEY-003 the prompt prevents the default action of the keys it handles (K9)", async () => {
	const h = harness();
	const pending = h.start();
	const handled = [ h.key( " " ), h.key( "Tab" ), h.key( "a" ), h.key( "Backspace" ),
		h.key( "ArrowDown" ), h.key( "b", "down", { "repeat": true } ) ];
	assert.deepEqual( handled.map( event => event.defaultPrevented ),
		[ true, true, true, true, true, true ] );
	const enter = h.key( "Enter" );
	assert.equal( enter.defaultPrevented, true );
	assert.equal( await pending, " b" );
	empty( h );
	assert.equal( h.key( " " ).defaultPrevented, false, "keys are the page's again" );
} );

test( "KEY-003 Ctrl and Meta shortcuts are left to the browser, AltGr types (K9)", async () => {
	const h = harness();
	const pending = h.start();
	const shortcuts = [
		h.key( "v", "down", { "code": "KeyV", "ctrlKey": true } ),
		h.key( "c", "down", { "code": "KeyC", "metaKey": true } ),
		h.key( "a", "down", { "code": "KeyA", "ctrlKey": true, "shiftKey": true } )
	];
	assert.deepEqual( shortcuts.map( event => event.defaultPrevented ), [ false, false, false ] );
	const altGraph = h.key( "@", "down", {
		"code": "KeyQ", "ctrlKey": true, "altKey": true, "modifiers": { "AltGraph": true }
	} );
	assert.equal( altGraph.defaultPrevented, true );
	h.key( "Enter" );
	assert.equal( await pending, "@" );
	empty( h );
} );

test( "KEY-003 pasted text is inserted by the prompt's rules (K9)", async () => {
	const h = harness();
	const text = h.start();
	const event = paste( h, "hi\nthere\t!" );
	assert.equal( event.defaultPrevented, true );
	assert.equal( paste( h, "ignored", createElement( "TEXTAREA" ) ).defaultPrevented, false );
	h.key( "Enter" );
	assert.equal( await text, "hithere!" );
	empty( h );

	const number = h.start( h.first, null, {
		"isNumber": true, "isInteger": true, "allowNegative": true, "maxLength": 4
	} );
	paste( h, "-12a.34567" );
	h.key( "Enter" );
	assert.equal( await number, -123 );
	empty( h );
	assert.equal( paste( h, "after" ).defaultPrevented, false, "no listener after the prompt" );
} );

test( "KEY-004 keys typed into an input inside a shadow root are ignored (K12)", async () => {
	const h = harness();
	const calls = [];
	h.api.onKey( "KeyA", "down", data => calls.push( data.code ) );
	const host = createElement( "DIV" );
	const shadowInput = createElement( "INPUT" );
	const path = [ shadowInput, host, h.body, h.document, h.window ];

	// A window listener sees the shadow host as the target
	h.key( "a", "down", { "code": "KeyA", "target": host, "path": path } );
	assert.deepEqual( calls, [] );
	assert.equal( h.api.inKey( "KeyA" ), null );
	h.key( "a", "up", { "code": "KeyA", "target": host, "path": path } );

	// A key on the host itself is game input
	h.key( "a", "down", { "code": "KeyA", "target": host, "path": [ host, h.body ] } );
	assert.deepEqual( calls, [ "KeyA" ] );
	h.key( "a", "up", { "code": "KeyA", "target": host, "path": [ host, h.body ] } );

	// The prompt follows the same rule
	const pending = h.start();
	h.key( "x", "down", { "target": host, "path": path } );
	h.key( "y" );
	h.key( "Enter" );
	assert.equal( await pending, "y" );
	empty( h );
} );

test( "KEY-005 the prompt captures and advances one print line at the print size (K11)",
	async () => {
		const h = harness();
		h.first.printCursor.height = 16;
		h.first.printCursor.width = 12;
		const pending = h.start( h.first, null, { "prompt": "?" } );
		const capture = h.first.captures[ 0 ];
		assert.deepEqual( [ capture.x1, capture.y1, capture.x2, capture.y2 ], [ 3, 8, 99, 23 ] );
		h.key( "a" );
		h.key( "Enter" );
		assert.equal( await pending, "a" );
		assert.deepEqual( h.api.getPosPx(), { "x": 0, "y": 24 },
			"the next print starts at column 0 below the prompt" );
		empty( h );
	} );

test( "KEY-005 a long value scrolls within one line (K11)", async () => {
	const h = harness();

	// 97 pixels from x 3 hold 16 six-pixel characters: "?", 14 of the value, and the cursor
	const pending = h.start( h.first, null, { "prompt": "?", "cursor": "_" } );
	const typed = "abcdefghijklmnopqrstuvwxyz0123";
	for( const char of typed ) {
		h.key( char );
	}
	const shown = h.first.prints[ h.first.prints.length - 1 ];
	assert.equal( shown, "?" + typed.slice( -14 ) + "_" );
	h.key( "Enter" );
	assert.equal( await pending, typed, "the whole value is returned" );
	assert.equal( h.first.prints[ h.first.prints.length - 1 ], "?" + typed.slice( -14 ) );
	empty( h );
} );

test( "KEY-008 numeric prompts keep to their patterns (K10)", async () => {
	const cases = [
		[ "maxLength counts the sign", { "isNumber": true, "allowNegative": true,
			"maxLength": 2 }, [ "1", "2", "-" ], 12 ],
		[ "a sign within maxLength", { "isNumber": true, "allowNegative": true,
			"maxLength": 2 }, [ "-", "1", "2" ], -1 ],
		[ "a leading decimal point", { "isNumber": true }, [ ".", "5" ], 0.5 ],
		[ "one decimal point", { "isNumber": true }, [ "1", ".", "2", ".", "3" ], 1.23 ],
		[ "no decimal point in integers", { "isNumber": true, "isInteger": true },
			[ "1", [ ".", "NumpadDecimal" ], "0" ], 10 ],
		[ "no spaces", { "isNumber": true }, [ " ", "4", " " ], 4 ],
		[ "isInteger alone returns a number", { "isInteger": true }, [ "1", "2", "a" ], 12 ],
		[ "no sign without allowNegative", { "isNumber": true }, [ "-", "3" ], 3 ],
		[ "+ removes the sign", { "isNumber": true, "allowNegative": true },
			[ "5", "-", "+" ], 5 ],
		[ "the Equal key is not +", { "isNumber": true, "allowNegative": true },
			[ "-", "5", [ "=", "Equal" ] ], -5 ],
		[ "no digits is 0", { "isNumber": true, "allowNegative": true }, [ "-", "." ], 0 ],
		[ "negative zero is 0", { "isInteger": true, "allowNegative": true }, [ "-", "0" ], 0 ],
		[ "text prompts take any character", {}, [ "-", " ", "." ], "- ." ]
	];
	for( const [ name, options, keys, expected ] of cases ) {
		const h = harness();
		const pending = h.start( h.first, null, options );
		for( const key of keys ) {
			if( Array.isArray( key ) ) {
				h.key( key[ 0 ], "down", { "code": key[ 1 ] } );
			} else {
				h.key( key );
			}
		}
		h.key( "Enter" );
		const value = await pending;
		assert.ok( Object.is( value, expected ), `${name}: ${value}` );
		empty( h );
	}
} );

test( "KEY-011 up handlers receive the keyup's data (K13)", () => {
	const h = harness();
	const any = [];
	const single = [];
	h.api.onKey( "any", "up", data => any.push( data ) );
	h.api.onKey( "KeyA", "up", data => single.push( data ) );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "a", "up", { "code": "KeyA", "shiftKey": true } );
	assert.deepEqual( any.map( data => [ data.code, data.shiftKey ] ), [ [ "KeyA", true ] ] );
	assert.equal( single[ 0 ], any[ 0 ], "handlers share the release data" );
	assert.equal( h.api.inKey( "KeyA" ), null );
} );

test( "KEY-011 a release whose press was not seen still reaches up handlers (K13)", () => {
	const h = harness();
	const calls = [];
	h.api.onKey( "KeyB", "up", data => calls.push( `KeyB ${data.key}` ) );
	h.api.onKey( "any", "up", data => calls.push( `any ${data.code}` ) );
	h.api.onKey( [ "KeyA", "KeyB" ], "up", () => calls.push( "combination" ) );
	h.api.stopKeyboard();
	h.key( "b", "down", { "code": "KeyB" } );
	h.api.startKeyboard();
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "b", "up", { "code": "KeyB" } );
	assert.deepEqual( calls, [ "KeyB b", "any KeyB" ],
		"a combination still needs every key held" );
} );

test( "KEY-011 a release runs the handlers of the value the key was pressed with", () => {
	const h = harness();
	const calls = [];
	for( const name of [ "A", "a", "KeyA" ] ) {
		h.api.onKey( name, "up", data => calls.push( `${name} ${data.key}` ) );
	}
	h.key( "Shift", "down", { "code": "ShiftLeft", "shiftKey": true } );
	h.key( "A", "down", { "code": "KeyA", "shiftKey": true } );
	h.key( "Shift", "up", { "code": "ShiftLeft" } );
	h.key( "a", "up", { "code": "KeyA" } );
	assert.deepEqual( calls, [ "KeyA a", "a a", "A a" ] );
} );

test( "KEY-011 a combination's up handler gets the release data for the released key", () => {
	const h = harness();
	const seen = [];
	h.api.onKey( [ "KeyA", "KeyB" ], "up", data => seen.push( data ) );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "b", "down", { "code": "KeyB" } );
	const heldA = h.api.inKey( "KeyA" );
	h.key( "b", "up", { "code": "KeyB", "altKey": true } );
	assert.equal( seen.length, 1 );
	assert.equal( seen[ 0 ][ 0 ], heldA );
	assert.deepEqual( [ seen[ 0 ][ 1 ].code, seen[ 0 ][ 1 ].altKey ], [ "KeyB", true ] );
} );

test( "KEY-012 starting the keyboard keeps focus, and start and stop are idempotent (K8)",
	() => {
		const h = harness();
		const listeners = type => h.window.listeners.filter( listener => {
			return listener.type === type && listener.capture;
		} ).length;
		assert.equal( h.body.blurs, 0, "plugin load leaves focus alone" );

		// Plugin load attaches nothing; the first read starts tracking (I5)
		assert.deepEqual( h.window.listeners, [] );
		h.api.inKey();
		h.api.inKey();
		assert.deepEqual( [ listeners( "keydown" ), listeners( "keyup" ) ], [ 1, 1 ] );

		// Stop removes the listeners and the held keys, and holds until startKeyboard()
		const calls = [];
		h.key( "a", "down", { "code": "KeyA" } );
		h.api.stopKeyboard();
		h.api.stopKeyboard();
		assert.deepEqual( [ listeners( "keydown" ), listeners( "keyup" ) ], [ 0, 0 ] );
		assert.equal( h.api.inKey( "KeyA" ), null );
		h.api.onKey( "KeyB", "down", data => calls.push( data.code ) );
		h.key( "b", "down", { "code": "KeyB" } );
		assert.equal( h.api.inKey( "KeyB" ), null );
		assert.deepEqual( calls, [], "registration and reads do not restart the keyboard" );

		// Start attaches the listeners once and keeps the focused element
		const field = createElement( "INPUT" );
		h.document.activeElement = field;
		h.api.startKeyboard();
		h.api.startKeyboard();
		assert.equal( field.blurs, 0 );
		assert.deepEqual( [ listeners( "keydown" ), listeners( "keyup" ) ], [ 1, 1 ] );
		h.key( "b", "down", { "code": "KeyB" } );
		assert.deepEqual( calls, [ "KeyB" ] );
		assert.equal( h.api.inKey( "KeyB" ).code, "KeyB" );
	} );

test( "KEY-013 key data cannot be changed through inKey() or handlers (K7)", () => {
	const h = harness();
	const received = [];
	h.api.onKey( "KeyA", "down", data => received.push( data ) );
	h.api.onKey( [ "KeyA", "KeyB" ], "up", data => received.push( data ) );
	h.api.onKey( "any", "up", data => received.push( data ) );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "b", "down", { "code": "KeyB" } );
	const polled = h.api.inKey( "KeyA" );
	assert.throws( () => { polled.code = "Mutated"; }, TypeError );
	assert.throws( () => { received[ 0 ].key = "Mutated"; }, TypeError );
	assert.equal( h.api.inKey( "KeyA" ).code, "KeyA" );
	assert.throws( () => { h.api.inKey().pop(); }, { "name": "TypeError" } );
	h.key( "b", "up", { "code": "KeyB" } );
	const [ , combination, release ] = received;
	assert.ok( combination.every( data => Object.isFrozen( data ) ) );
	assert.ok( Object.isFrozen( release ) );
} );

test( "KEY-013 inKey() returns one frozen array until the held keys change (I7, I9)", () => {
	const h = harness();
	const empty = h.api.inKey();
	assert.equal( empty.length, 0 );
	assert.ok( Object.isFrozen( empty ) );
	assert.equal( h.api.inKey(), empty, "reads do not allocate" );
	h.key( "a", "down", { "code": "KeyA" } );
	const held = h.api.inKey();
	assert.notEqual( held, empty, "a press replaces the array" );
	assert.ok( Object.isFrozen( held ) );
	assert.equal( h.api.inKey(), held );
	assert.equal( held[ 0 ], h.api.inKey( "KeyA" ) );
	h.key( "a", "down", { "code": "KeyA", "repeat": true } );
	assert.notEqual( h.api.inKey(), held, "a repeat replaces the key data" );
	const repeated = h.api.inKey();
	h.key( "a", "up", { "code": "KeyA" } );
	assert.notEqual( h.api.inKey(), repeated, "a release replaces the array" );
	assert.equal( h.api.inKey().length, 0 );
	assert.equal( repeated.length, 1, "an earlier array keeps its keys" );
	assert.strictEqual( h.api.inKey( "KeyA" ), null );
	assert.strictEqual( h.api.inKey( "b" ), null );
} );

test( "KEY-013 state is updated before handlers run, and each runs once per event (I8)", () => {
	const h = harness();
	const log = [];
	h.api.onKey( "KeyA", "down", data => {
		log.push( [ "down", h.api.inKey( "KeyA" ) === data, h.api.inKey().length ] );

		// Handlers added during a dispatch first run in the next one
		h.api.onKey( "any", "down", () => log.push( "added" ), true );
	} );
	h.api.onKey( "KeyA", "up", data => {
		log.push( [ "up", h.api.inKey( "KeyA" ), h.api.inKey( "a" ), h.api.inKey().length,
			data.code ] );
	} );

	// A combination registered under the key's code and value runs once
	h.api.onKey( [ "KeyA", "a" ], "down", data => log.push( [ "both", data.length ] ) );
	h.key( "a", "down", { "code": "KeyA" } );
	assert.deepEqual( log, [ [ "down", true, 1 ], [ "both", 2 ] ] );
	h.key( "a", "up", { "code": "KeyA" } );
	assert.deepEqual( log.slice( 2 ), [ [ "up", null, null, 0, "KeyA" ] ] );
	h.key( "b", "down", { "code": "KeyB" } );
	assert.deepEqual( log.slice( 3 ), [ "added" ] );
} );

test( "KEY-013 a throwing handler is reported and the others still run (I8)", () => {
	const h = harness();
	const error = new Error( "down" );
	const log = [];
	h.api.onKey( "KeyA", "down", () => { throw error; } );
	h.api.onKey( "a", "down", () => log.push( "value" ) );
	h.api.onKey( "any", "down", () => log.push( "any" ) );
	assert.doesNotThrow( () => h.key( "a", "down", { "code": "KeyA" } ) );
	assert.deepEqual( log, [ "value", "any" ] );
	assert.deepEqual( h.errors.map( args => [ args[ 0 ], args[ 1 ] ] ),
		[ [ "onKey: Handler for \"down\" failed:", error ] ] );
	assert.equal( h.microtasks.length, 0 );
} );

test( "KEY-014 setActionKeys() replaces the set and removeActionKeys() removes (K20, A12)",
	() => {
		const h = harness();
		const prevented = code => {
			const down = h.key( "x", "down", { "code": code } ).defaultPrevented;
			const up = h.key( "x", "up", { "code": code } ).defaultPrevented;
			return [ down, up ];
		};
		h.api.setActionKeys( [ "Space", "KeyW" ] );
		h.api.setActionKeys( [ "KeyA", "KeyW" ] );
		assert.deepEqual( [ prevented( "Space" ), prevented( "KeyA" ), prevented( "KeyW" ) ],
			[ [ false, false ], [ true, true ], [ true, true ] ],
			"a second call replaces the set" );

		// An invalid call leaves the set as it was
		assert.throws( () => h.api.setActionKeys( [ "KeyB", 1 ] ), { "name": "TypeError" } );
		assert.deepEqual( [ prevented( "KeyA" ), prevented( "KeyB" ) ],
			[ [ true, true ], [ false, false ] ] );

		// removeActionKeys() removes only the keys given, and an empty set clears every key
		h.api.removeActionKeys( [ "KeyW" ] );
		assert.deepEqual( [ prevented( "KeyA" ), prevented( "KeyW" ) ],
			[ [ true, true ], [ false, false ] ] );
		h.api.setActionKeys( [] );
		assert.deepEqual( prevented( "KeyA" ), [ false, false ] );
	} );

test( "SYS-003 a custom cursor is drawn after the value and hidden when the prompt ends",
	async () => {
		const h = harness();
		const pending = h.start( h.first, null, {
			"prompt": "Age? ", "cursor": "$", "isNumber": true
		} );
		h.key( "4" );
		h.key( "2" );
		assert.equal( h.first.prints[ h.first.prints.length - 1 ], "Age? 42$" );
		h.key( "Enter" );
		assert.equal( await pending, 42 );
		assert.equal( h.first.prints[ h.first.prints.length - 1 ], "Age? 42" );
		empty( h );
	} );

/**
 * Assert that a call throws an I11 validation error.
 *
 * @param {Function} fn - The call.
 * @param {string} name - "TypeError" or "RangeError"; errors come from the module's realm.
 * @param {string} code - Error code.
 * @param {string} command - Command that starts the message.
 * @returns {void}
 */
function assertInvalid( fn, name, code, command ) {
	assert.throws( fn, error => {
		assert.deepEqual( [ error.name, error.code ], [ name, code ], error.message );
		assert.ok( error.message.startsWith( `${command}: ` ), error.message );
		return true;
	} );
}

test( "KEY-009 key commands reject invalid arguments with the I11 codes (K3, K4, K20)", () => {
	const h = harness();
	const fn = () => {};
	const $ = h.api;
	const cases = [

		// Modes are "up" or "down"; a mode from another API or in capitals fails
		[ () => $.onKey( "KeyA", "press", fn ), "RangeError", "INVALID_MODE", "onKey" ],
		[ () => $.onKey( "KeyA", "DOWN", fn ), "RangeError", "INVALID_MODE", "onKey" ],
		[ () => $.onKey( "KeyA", "keydown", fn ), "RangeError", "INVALID_MODE", "onKey" ],
		[ () => $.onKey( "KeyA", 1, fn ), "TypeError", "INVALID_MODE", "onKey" ],
		[ () => $.onKey( "KeyA", null, fn ), "TypeError", "INVALID_MODE", "onKey" ],
		[ () => $.offKey( "KeyA", "press", fn ), "RangeError", "INVALID_MODE", "offKey" ],
		[ () => $.offKey( "KeyA", 1 ), "TypeError", "INVALID_MODE", "offKey" ],

		// Keys are a non-empty string or a non-empty array of them
		[ () => $.onKey( [], "down", fn ), "RangeError", "INVALID_KEY", "onKey" ],
		[ () => $.onKey( "", "down", fn ), "RangeError", "INVALID_KEY", "onKey" ],
		[ () => $.onKey( [ "KeyA", "" ], "down", fn ), "RangeError", "INVALID_KEY", "onKey" ],
		[ () => $.onKey( [ "any", "KeyA" ], "down", fn ), "RangeError", "INVALID_KEY", "onKey" ],
		[ () => $.onKey( [ "KeyA", 1 ], "down", fn ), "TypeError", "INVALID_KEY", "onKey" ],
		[ () => $.onKey( 5, "down", fn ), "TypeError", "INVALID_KEY", "onKey" ],
		[ () => $.onKey( null, "down", fn ), "TypeError", "INVALID_KEY", "onKey" ],
		[ () => $.offKey( [], "down" ), "RangeError", "INVALID_KEY", "offKey" ],
		[ () => $.offKey( 5, "down" ), "TypeError", "INVALID_KEY", "offKey" ],
		[ () => $.inKey( "" ), "RangeError", "INVALID_KEY", "inKey" ],
		[ () => $.inKey( 0 ), "TypeError", "INVALID_KEY", "inKey" ],
		[ () => $.inKey( false ), "TypeError", "INVALID_KEY", "inKey" ],
		[ () => $.inKey( [ "KeyA" ] ), "TypeError", "INVALID_KEY", "inKey" ],

		// Functions and flags
		[ () => $.onKey( "KeyA", "down", "fn" ), "TypeError", "INVALID_FUNCTION", "onKey" ],
		[ () => $.offKey( "KeyA", "down", "fn" ), "TypeError", "INVALID_FUNCTION", "offKey" ],
		[ () => $.onKey( "KeyA", "down", fn, 1 ), "TypeError", "INVALID_ONCE", "onKey" ],
		[ () => $.onKey( "KeyA", "down", fn, "true" ), "TypeError", "INVALID_ONCE", "onKey" ],
		[
			() => $.onKey( "KeyA", "down", fn, false, 0 ),
			"TypeError", "INVALID_ALLOW_REPEAT", "onKey"
		],

		// Action keys are arrays of non-empty strings
		[ () => $.setActionKeys( [ 1, null ] ), "TypeError", "INVALID_KEYS", "setActionKeys" ],
		[ () => $.setActionKeys( "Space" ), "TypeError", "INVALID_KEYS", "setActionKeys" ],
		[ () => $.setActionKeys( [ "" ] ), "RangeError", "INVALID_KEYS", "setActionKeys" ],
		[ () => $.removeActionKeys( [ 1 ] ), "TypeError", "INVALID_KEYS", "removeActionKeys" ],
		[ () => $.removeActionKeys( [ "" ] ), "RangeError", "INVALID_KEYS", "removeActionKeys" ]
	];
	for( const [ call, name, code, command ] of cases ) {
		assertInvalid( call, name, code, command );
	}
	assert.equal( vm.runInContext( "Object.keys( m_onKeyHandlers ).length", h.keyboard ), 0,
		"failed calls register nothing" );
	assert.equal( vm.runInContext( "m_actionKeys.size", h.keyboard ), 0 );

	// Omitted values take their defaults
	assert.equal( $.inKey( null ).length, 0 );
	assert.equal( $.inKey( undefined ).length, 0 );
	$.onKey( "KeyA", "down", fn, null, undefined );
	$.onKey( { "key": "KeyB", "mode": "up", "fn": fn } );
	$.setActionKeys( [] );
	$.offKey( "KeyA", null, fn );
	$.offKey( "KeyB", "up" );
	assert.equal( vm.runInContext( "Object.keys( m_onKeyHandlers ).length", h.keyboard ), 0 );
} );

test( "KEY-009 input() rejects invalid options with the I11 codes (K3)", async () => {
	const h = harness();
	const input = ( ...args ) => h.first.api.input( ...args );
	const cases = [
		[ { "prompt": 5 }, "TypeError", "INVALID_PROMPT" ],
		[ { "prompt": "?", "fn": "done" }, "TypeError", "INVALID_FUNCTION" ],
		[ { "prompt": "?", "cursor": 5 }, "TypeError", "INVALID_CURSOR" ],
		[ { "prompt": "?", "isNumber": 1 }, "TypeError", "INVALID_IS_NUMBER" ],
		[ { "prompt": "?", "isInteger": "yes" }, "TypeError", "INVALID_IS_INTEGER" ],
		[ { "prompt": "?", "allowNegative": 0 }, "TypeError", "INVALID_ALLOW_NEGATIVE" ],
		[ { "prompt": "?", "maxLength": 1.5 }, "TypeError", "INVALID_MAX_LENGTH" ],
		[ { "prompt": "?", "maxLength": "5" }, "TypeError", "INVALID_MAX_LENGTH" ],
		[ { "prompt": "?", "maxLength": 0 }, "RangeError", "INVALID_MAX_LENGTH" ],
		[ { "prompt": "?", "maxLength": -1 }, "RangeError", "INVALID_MAX_LENGTH" ]
	];
	for( const [ options, name, code ] of cases ) {
		assertInvalid( () => input( options ), name, code, "input" );
		empty( h );
	}

	// An omitted maxLength means no limit, in the object and positional forms
	const forms = [
		[ { "prompt": "?", "maxLength": undefined } ],
		[ { "prompt": "?", "maxLength": null } ],
		[ "?", null, null, false, false, false, undefined ]
	];
	for( const args of forms ) {
		const pending = input( ...args );
		for( const key of "abcdefghijklmnopqrstuvwxyz" ) {
			h.key( key );
		}
		h.key( "Enter" );
		assert.equal( await pending, "abcdefghijklmnopqrstuvwxyz" );
		empty( h );
	}
} );

test( "KEY-010 a combination array is copied, kept in order, and de-duplicated (K6)", () => {
	const h = harness();
	const calls = [];
	const combo = [ "KeyS", "ControlLeft" ];
	const save = data => calls.push( Array.from( data, item => item.code ).join( "+" ) );
	h.api.onKey( combo, "down", save );
	assert.deepEqual( combo, [ "KeyS", "ControlLeft" ], "the caller's array is not sorted" );

	// Changing the caller's array does not change the registration
	combo[ 0 ] = "KeyQ";
	combo.push( "KeyX" );

	// The same keys in another order, or with a duplicate, are the same handler
	h.api.onKey( [ "ControlLeft", "KeyS", "KeyS" ], "down", save );
	h.api.onKey( [ "KeyD", "KeyD" ], "down", data => calls.push( data.code ) );
	h.key( "Control", "down", { "code": "ControlLeft", "ctrlKey": true } );
	h.key( "s", "down", { "code": "KeyS", "ctrlKey": true } );
	h.key( "d", "down", { "code": "KeyD", "ctrlKey": true } );
	assert.deepEqual( calls, [ "KeyS+ControlLeft", "KeyD" ],
		"data follows the order given, and a key listed twice counts once" );

	// offKey matches the key set whatever the order and duplicates
	h.api.offKey( [ "ControlLeft", "ControlLeft", "KeyS" ], "down", save );
	h.key( "s", "down", { "code": "KeyS", "ctrlKey": true } );
	assert.equal( calls.length, 2 );
} );

test( "keyboard registers inKey, onKey, and offKey, and not the old names (I1, I16)", () => {
	const h = harness();
	for( const name of [ "inKey", "onKey", "offKey" ] ) {
		assert.equal( typeof h.commands[ name ], "function", name );
	}
	for( const name of [ "inkey", "onkey", "offkey" ] ) {
		assert.equal( h.commands[ name ], undefined, name );
		assert.throws( () => h.api[ name ]( "KeyA" ), TypeError );
	}
} );

test( "KEY-007 offKey matches key set, mode, and function, in every removal form (K5)", () => {
	const h = harness();
	const $ = h.api;
	const calls = [];
	const tap = ( name, code ) => {
		h.key( name, "down", { "code": code } );
		h.key( name, "up", { "code": code } );
	};
	const log = label => () => calls.push( label );

	// once and allowRepeat do not take part in removal; the old arguments are ignored
	const onceFn = log( "once" );
	const repeatFn = log( "repeat" );
	$.onKey( "KeyA", "down", onceFn, true );
	$.onKey( "KeyB", "down", repeatFn, false, true );
	$.offKey( "KeyA", "down", onceFn );
	$.offKey( "KeyB", "down", repeatFn, true, false );
	tap( "a", "KeyA" );
	tap( "b", "KeyB" );
	assert.deepEqual( calls, [] );

	// Without a mode, the function leaves both modes, in the object and positional forms
	const both = log( "both" );
	$.onKey( "KeyC", "down", both );
	$.onKey( "KeyC", "up", both );
	$.offKey( { "key": "KeyC", "fn": both } );
	$.onKey( [ "Control", "KeyD" ], "down", both );
	$.onKey( [ "KeyD", "Control" ], "up", both );
	$.offKey( [ "KeyD", "Control" ], null, both );
	tap( "c", "KeyC" );
	h.key( "Control", "down", { "code": "Control" } );
	tap( "d", "KeyD" );
	h.key( "Control", "up", { "code": "Control" } );
	assert.deepEqual( calls, [] );

	// Without a function, every handler of the mode leaves; the other mode stays
	$.onKey( "KeyE", "down", log( "e down 1" ) );
	$.onKey( "KeyE", "down", log( "e down 2" ) );
	$.onKey( "KeyE", "up", log( "e up" ) );
	$.offKey( "KeyE", "down" );
	tap( "e", "KeyE" );
	assert.deepEqual( calls, [ "e up" ] );

	// Neither a mode nor a function throws
	for( const args of [ [ "KeyE" ], [ { "key": "KeyE" } ], [ "KeyE", null, null ] ] ) {
		assert.throws( () => $.offKey( ...args ), error => {
			return error.name === "TypeError" && error.code === "INVALID_MODE" &&
				error.message.startsWith( "offKey: " ) &&
				error.message.includes( "clearEvents( \"keyboard\" )" );
		} );
	}
} );

test( "KEY-007 registering the same function for the same keys and mode does nothing", () => {
	const h = harness();
	const $ = h.api;
	let calls = 0;
	const fn = () => { calls += 1; };
	$.onKey( "KeyA", "down", fn );
	$.onKey( "KeyA", "down", fn, true, true );
	$.onKey( [ "Shift", "KeyA" ], "down", fn );
	$.onKey( [ "KeyA", "Shift" ], "down", fn );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "a", "up", { "code": "KeyA" } );
	assert.equal( calls, 1 );

	// The first registration stands: it is not once, so it runs again
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "a", "up", { "code": "KeyA" } );
	assert.equal( calls, 2 );
	h.key( "Shift", "down", { "code": "Shift" } );
	h.key( "a", "down", { "code": "KeyA" } );
	assert.equal( calls, 4 );

	// One offKey removes it
	$.offKey( "KeyA", "down", fn );
	h.key( "a", "up", { "code": "KeyA" } );
	h.key( "a", "down", { "code": "KeyA" } );
	assert.equal( calls, 5 );
} );

test( "KEY-006 tracking starts on first use and stays stopped until startKeyboard() (I5)", () => {
	const types = h => Array.from( h.window.listeners, listener => listener.type ).sort();
	const tracked = [ "blur", "keydown", "keyup" ];

	// Before any use, keys are not tracked
	const idle = harness();
	idle.key( "a", "down", { "code": "KeyA" } );
	assert.deepEqual( types( idle ), [] );
	assert.equal( idle.api.inKey( "KeyA" ), null );

	// Each first use starts tracking, once
	for( const use of [
		h => h.api.inKey( "KeyA" ),
		h => h.api.onKey( "KeyA", "down", () => {} ),
		h => h.api.setActionKeys( [ "Space" ] )
	] ) {
		const h = harness();
		use( h );
		use( h );
		assert.deepEqual( types( h ), tracked );
		h.key( "a", "down", { "code": "KeyA" } );
		assert.equal( h.api.inKey( "KeyA" ).code, "KeyA" );
	}

	// A prompt uses its own listener and does not start tracking
	const prompting = harness();
	prompting.start();
	assert.equal( types( prompting ).filter( type => type === "keyup" ).length, 0 );

	// After a stop, handlers stay registered but are not called, and reads report nothing,
	// whatever is used, until startKeyboard()
	const h = harness();
	const calls = [];
	h.api.onKey( "KeyA", "down", () => calls.push( "a" ) );
	h.api.stopKeyboard();
	h.api.onKey( "KeyB", "down", () => calls.push( "b" ) );
	h.api.setActionKeys( [ "KeyA" ] );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "b", "down", { "code": "KeyB" } );
	assert.deepEqual( [ calls, h.api.inKey().length, types( h ) ], [ [], 0, [ "blur" ] ] );
	h.api.startKeyboard();
	h.key( "a", "up", { "code": "KeyA" } );
	h.key( "a", "down", { "code": "KeyA" } );
	assert.deepEqual( calls, [ "a" ] );
} );

test( "KEY-011 cancelled input releases held keys once through the up handlers (I6)", () => {
	const triggers = {
		"blur": h => h.window.dispatchEvent( { "type": "blur" } ),
		"hidden page": h => {
			h.document.visibilityState = "hidden";
			h.document.dispatchEvent( { "type": "visibilitychange" } );
		},
		"stop": h => h.api.stopKeyboard(),
		"editable target": h => {
			h.key( "x", "down", { "code": "KeyX", "target": createElement( "INPUT" ) } );
		},
		"prompt": h => { h.start(); }
	};
	for( const [ name, trigger ] of Object.entries( triggers ) ) {
		const h = harness();
		const log = [];
		h.api.onKey( "KeyA", "up", data => {
			log.push( [ "KeyA", data.key, data.shiftKey, data.repeat, data.cancelled ] );
		} );
		h.api.onKey( "A", "up", data => log.push( [ "A", data.cancelled ] ) );
		h.api.onKey( [ "ShiftLeft", "KeyA" ], "up", data => {
			const items = Array.from( data, item => item.code + " " + item.cancelled );
			log.push( [ "combo", ...items ] );
		} );
		h.api.onKey( "any", "up", data => log.push( [ "any", data.code, data.cancelled ] ) );
		h.key( "Shift", "down", { "code": "ShiftLeft", "shiftKey": true } );
		h.key( "A", "down", { "code": "KeyA", "shiftKey": true } );
		h.key( "A", "down", { "code": "KeyA", "shiftKey": true, "repeat": true } );
		trigger( h );
		assert.deepEqual( log, [
			[ "combo", "ShiftLeft true", "KeyA false" ],
			[ "any", "ShiftLeft", true ],
			[ "KeyA", "A", true, false, true ],
			[ "A", true ],
			[ "any", "KeyA", true ]
		], name );
		assert.equal( h.api.inKey().length, 0, name );

		// A later trigger finds nothing held
		h.window.dispatchEvent( { "type": "blur" } );
		assert.equal( log.length, 5, name );
	}

	// Key data that is not cancelled says so
	const h = harness();
	const seen = [];
	h.api.onKey( "any", "down", data => seen.push( data.cancelled ) );
	h.api.onKey( "any", "up", data => seen.push( data.cancelled ) );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "a", "up", { "code": "KeyA" } );
	assert.deepEqual( seen, [ false, false ] );
} );
