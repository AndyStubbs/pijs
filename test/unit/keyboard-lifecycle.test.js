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
 * A fake event target that records listeners and dispatches to them as the DOM does: capture
 * listeners first, each registration once, and listeners removed during a dispatch skipped.
 *
 * @param {Object} [properties] - Extra properties of the target.
 * @returns {Object} Event target with a `listeners` list.
 */
function createEventTarget( properties = {} ) {
	const listeners = [];
	function isCapture( options ) {
		return options === true || Boolean( options && options.capture );
	}
	function find( type, fn, options ) {
		const capture = isCapture( options );
		return listeners.find( listener => {
			return listener.type === type && listener.fn === fn && listener.capture === capture;
		} );
	}
	return {
		...properties,
		"listeners": listeners,
		"addEventListener": ( type, fn, options ) => {
			if( !find( type, fn, options ) ) {
				listeners.push( { "type": type, "fn": fn, "capture": isCapture( options ) } );
			}
		},
		"removeEventListener": ( type, fn, options ) => {
			const listener = find( type, fn, options );
			if( listener ) {
				listeners.splice( listeners.indexOf( listener ), 1 );
			}
		},
		"dispatchEvent": event => {
			const matching = listeners.filter( listener => listener.type === event.type );
			const ordered = [
				...matching.filter( listener => listener.capture ),
				...matching.filter( listener => !listener.capture )
			];
			for( const listener of ordered ) {
				if( listeners.includes( listener ) ) {
					listener.fn( event );
				}
			}
			return !event.defaultPrevented;
		}
	};
}

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
	const window = createEventTarget();
	const document = createEventTarget( { "body": body, "activeElement": body } );
	const globals = {
		"console": console,
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
	return { api, keyboard, input, commands, timers, images, microtasks, first, screen,
		start, dispose, key, clearEvents, window, document, body, clock };
}

function empty( h ) {
	const plugin = [ h.keyboard.onKeyDown, h.keyboard.onKeyUp, h.keyboard.clearInKeys ];
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
			h.api.onkey( binding, "down", () => {
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
				assert.equal( h.microtasks.length, 1 );
				assert.throws( h.microtasks.shift(), value => value === error );
			}
		} );
	}
}

test( "SYS-011 keyup errors preserve combinations, release and default prevention", () => {
	const h = harness();
	const errors = [ new Error( "first" ), new Error( "second" ) ];
	const seen = [];
	h.api.setActionKeys( [ "a" ] );
	h.api.onkey( "a", "up", () => { throw errors[ 0 ]; } );
	h.api.onkey( [ "a", "b" ], "up", data => seen.push( data.length ) );
	h.api.onkey( "any", "up", () => { throw errors[ 1 ]; } );
	h.api.onkey( "any", "up", data => seen.push( data.key ) );
	h.key( "a" ); h.key( "b" );
	let event;
	assert.doesNotThrow( () => { event = h.key( "a", "up" ); } );
	assert.deepEqual( seen, [ 2, "a" ] );
	assert.equal( h.api.inkey( "a" ), null );
	assert.equal( event.defaultPrevented, true );
	assert.equal( h.microtasks.length, 2 );
	for( const error of errors ) { assert.throws( h.microtasks.shift(), value => value === error ); }
} );

test( "SYS-011 nested keydown survives outer keyup cleanup", () => {
	const h = harness();
	h.api.onkey( "a", "up", () => h.key( "a" ), true );
	h.key( "a" );
	const original = h.api.inkey( "a" );
	h.key( "a", "up" );
	assert.notEqual( h.api.inkey( "a" ), null );
	assert.notEqual( h.api.inkey( "a" ), original );
	h.key( "a", "up" );
	assert.equal( h.api.inkey( "a" ), null );
} );

test( "SYS-011 dispatch skips removed handlers and preserves repeat filtering", () => {
	const h = harness();
	let calls = 0;
	const removed = () => { calls++; };
	h.api.onkey( "a", "down", () => h.api.offkey( "a", "down", removed ), true );
	h.api.onkey( "a", "down", removed );
	h.key( "a" );
	assert.equal( calls, 0 );
	h.api.onkey( "a", "down", removed, true );
	h.key( "a", "down", { "repeat": true } );
	assert.equal( calls, 0 );
	h.key( "a" );
	assert.equal( calls, 1 );
} );

test( "SYS-011 clear during dispatch invalidates copied handlers", () => {
	const h = harness();
	h.api.onkey( "a", "down", () => h.keyboard.clearKeyboardEvents() );
	h.api.onkey( "a", "down", () => assert.fail( "removed callback invoked" ) );
	assert.doesNotThrow( () => h.key( "a" ) );
	assert.equal( h.microtasks.length, 0 );
} );

test( "SYS-011 object-form handlers register and remove like the positional form", () => {
	const h = harness();
	const seen = [];
	const fn = data => seen.push( data.code );
	h.api.onkey( { "key": "KeyA", "mode": "down", "fn": fn } );
	h.key( "a", "down", { "code": "KeyA" } );
	h.api.offkey( { "key": "KeyA", "mode": "down", "fn": fn } );
	h.key( "a", "down", { "code": "KeyA" } );
	assert.deepEqual( seen, [ "KeyA" ] );
	assert.equal( h.api.inkey( { "key": "KeyA" } ).key, "a" );
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
	h.api.onkey( [ "A", "Enter" ], "down", () => { combos++; } );

	// Shift released before the letter: pressed as "A", released as "a"
	shift( h, "down" );
	h.key( "A", "down", { "code": "KeyA", "shiftKey": true } );
	assert.equal( h.api.inkey( "A" ).code, "KeyA" );
	assert.equal( h.api.inkey( "a" ), null );
	shift( h, "up" );
	assert.equal( h.api.inkey( "A" ).code, "KeyA", "the letter is still held" );
	h.key( "a", "up", { "code": "KeyA" } );
	assert.equal( h.api.inkey( "A" ), null );
	assert.equal( h.api.inkey( "KeyA" ), null );
	assert.equal( h.api.inkey().length, 0 );
	h.key( "Enter" );
	h.key( "Enter", "up" );
	assert.equal( combos, 0, "a released value never completes a combination" );

	// Shift pressed during the hold: pressed as "w", released as "W"
	h.key( "w", "down", { "code": "KeyW" } );
	shift( h, "down" );
	h.key( "W", "up", { "code": "KeyW", "shiftKey": true } );
	shift( h, "up" );
	assert.equal( h.api.inkey( "w" ), null );
	assert.equal( h.api.inkey( "W" ), null );
	assert.equal( h.api.inkey().length, 0 );

	// A held value still completes a combination
	shift( h, "down" );
	h.key( "A", "down", { "code": "KeyA", "shiftKey": true } );
	h.key( "Enter", "down", { "shiftKey": true } );
	assert.equal( combos, 1 );
} );

test( "KEY-001 a value stays held until every key producing it is released (K1b)", () => {
	const h = harness();
	shift( h, "down", "ShiftLeft" );
	shift( h, "down", "ShiftRight" );
	assert.equal( h.api.inkey( "Shift" ).code, "ShiftRight", "the latest press answers" );
	shift( h, "up", "ShiftRight" );
	assert.equal( h.api.inkey( "Shift" ).code, "ShiftLeft" );
	assert.equal( h.api.inkey( "ShiftRight" ), null );
	shift( h, "up", "ShiftLeft" );
	assert.equal( h.api.inkey( "Shift" ), null );

	h.key( "1", "down", { "code": "Digit1" } );
	h.key( "1", "down", { "code": "Numpad1" } );
	h.key( "1", "up", { "code": "Numpad1" } );
	assert.equal( h.api.inkey( "1" ).code, "Digit1" );
	h.key( "1", "up", { "code": "Digit1" } );
	assert.equal( h.api.inkey( "1" ), null );
	assert.equal( h.api.inkey().length, 0 );
} );

test( "KEY-001 a composing keydown does not stay held as Process (K14)", () => {
	const h = harness();
	h.key( "Process", "down", { "code": "KeyN" } );
	assert.equal( h.api.inkey( "Process" ).code, "KeyN" );
	h.key( "n", "up", { "code": "KeyN" } );
	assert.equal( h.api.inkey( "Process" ), null );
	assert.equal( h.api.inkey( "KeyN" ), null );
	assert.equal( h.api.inkey().length, 0 );
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

test( "KEY-006 a prompt reads keys while the keyboard is stopped", async () => {
	const h = harness();
	h.api.stopKeyboard();
	const started = h.start();
	h.key( "a" );
	h.key( "Enter" );
	assert.equal( await started, "a" );
	assert.equal( h.api.inkey( "a" ), null, "the stopped keyboard tracks nothing" );
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
	h.api.onkey( "KeyA", "down", data => calls.push( data.code ) );
	const host = createElement( "DIV" );
	const shadowInput = createElement( "INPUT" );
	const path = [ shadowInput, host, h.body, h.document, h.window ];

	// A window listener sees the shadow host as the target
	h.key( "a", "down", { "code": "KeyA", "target": host, "path": path } );
	assert.deepEqual( calls, [] );
	assert.equal( h.api.inkey( "KeyA" ), null );
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
	h.api.onkey( "any", "up", data => any.push( data ) );
	h.api.onkey( "KeyA", "up", data => single.push( data ) );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "a", "up", { "code": "KeyA", "shiftKey": true } );
	assert.deepEqual( any.map( data => [ data.code, data.shiftKey ] ), [ [ "KeyA", true ] ] );
	assert.equal( single[ 0 ], any[ 0 ], "handlers share the release data" );
	assert.equal( h.api.inkey( "KeyA" ), null );
} );

test( "KEY-011 a release whose press was not seen still reaches up handlers (K13)", () => {
	const h = harness();
	const calls = [];
	h.api.onkey( "KeyB", "up", data => calls.push( `KeyB ${data.key}` ) );
	h.api.onkey( "any", "up", data => calls.push( `any ${data.code}` ) );
	h.api.onkey( [ "KeyA", "KeyB" ], "up", () => calls.push( "combination" ) );
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
		h.api.onkey( name, "up", data => calls.push( `${name} ${data.key}` ) );
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
	h.api.onkey( [ "KeyA", "KeyB" ], "up", data => seen.push( data ) );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "b", "down", { "code": "KeyB" } );
	const heldA = h.api.inkey( "KeyA" );
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
		assert.deepEqual( [ listeners( "keydown" ), listeners( "keyup" ) ], [ 1, 1 ] );

		// Stop removes the listeners and the held keys, and holds until startKeyboard()
		const calls = [];
		h.key( "a", "down", { "code": "KeyA" } );
		h.api.stopKeyboard();
		h.api.stopKeyboard();
		assert.deepEqual( [ listeners( "keydown" ), listeners( "keyup" ) ], [ 0, 0 ] );
		assert.equal( h.api.inkey( "KeyA" ), null );
		h.api.onkey( "KeyB", "down", data => calls.push( data.code ) );
		h.key( "b", "down", { "code": "KeyB" } );
		assert.equal( h.api.inkey( "KeyB" ), null );
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
		assert.equal( h.api.inkey( "KeyB" ).code, "KeyB" );
	} );

test( "KEY-013 key data cannot be changed through inkey() or handlers (K7)", () => {
	const h = harness();
	const received = [];
	h.api.onkey( "KeyA", "down", data => received.push( data ) );
	h.api.onkey( [ "KeyA", "KeyB" ], "up", data => received.push( data ) );
	h.api.onkey( "any", "up", data => received.push( data ) );
	h.key( "a", "down", { "code": "KeyA" } );
	h.key( "b", "down", { "code": "KeyB" } );
	const polled = h.api.inkey( "KeyA" );
	assert.throws( () => { polled.code = "Mutated"; }, TypeError );
	assert.throws( () => { received[ 0 ].key = "Mutated"; }, TypeError );
	assert.equal( h.api.inkey( "KeyA" ).code, "KeyA" );
	assert.notEqual( h.api.inkey(), h.api.inkey(), "each list read is a new array" );
	h.key( "b", "up", { "code": "KeyB" } );
	const [ , combination, release ] = received;
	assert.ok( combination.every( data => Object.isFrozen( data ) ) );
	assert.ok( Object.isFrozen( release ) );
} );

test( "KEY-017 setActionKeys() adds keys and removeActionKeys() removes them (K20)", () => {
	const h = harness();
	const prevented = code => {
		const down = h.key( "x", "down", { "code": code } ).defaultPrevented;
		const up = h.key( "x", "up", { "code": code } ).defaultPrevented;
		return [ down, up ];
	};
	h.api.setActionKeys( [ "Space" ] );
	h.api.setActionKeys( [ "KeyA" ] );
	assert.deepEqual( [ prevented( "Space" ), prevented( "KeyA" ) ],
		[ [ true, true ], [ true, true ] ], "a second call adds to the set" );
	h.api.removeActionKeys( [ "Space" ] );
	assert.deepEqual( [ prevented( "Space" ), prevented( "KeyA" ) ],
		[ [ false, false ], [ true, true ] ] );
	assert.deepEqual( prevented( "KeyB" ), [ false, false ] );
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
