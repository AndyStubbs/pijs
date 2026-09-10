/**
 * SYS-003 and SYS-011 regressions using real keyboard modules and controlled resources.
 */
const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function harness() {
	const timers = new Map();
	const images = new Map();
	const microtasks = [];
	const hooks = [];
	const commands = {};
	const api = {};
	let nextTimer = 0;
	const pluginApi = {
		"getApi": () => api,
		"utils": { "queueMicrotask": fn => microtasks.push( fn ) },
		"addCommand": ( name, fn, screen, params ) => {
			commands[ name ] = fn;
			if( !screen ) {
				api[ name ] = ( ...args ) => fn( Object.fromEntries(
					params.map( ( param, i ) => [ param, args[ i ] ?? null ] )
				) );
			}
		},
		"addScreenCleanupFunction": () => {},
		"addScreenPreCleanupFunction": fn => hooks.push( fn ),
		"registerClearEvents": () => {}
	};
	api.getImage = name => images.get( name );
	api.removeImage = name => images.delete( name );
	const globals = {
		"console": console,
		"setInterval": fn => { timers.set( ++nextTimer, fn ); return nextTimer; },
		"clearInterval": id => timers.delete( id ),
		"window": { "addEventListener": () => {}, "removeEventListener": () => {} },
		"document": {}, "$": api
	};
	function load( file, extra = {} ) {
		const source = fs.readFileSync( path.join( __dirname, "../..", file ), "utf8" )
			.replace( /^import .*;\r?\n/gm, "" ).replace( /export default /g, "" )
			.replace( /export /g, "" );
		const context = vm.createContext( { ...globals, ...extra } );
		vm.runInContext( source, context, { "filename": file } );
		return context;
	}
	const input = load( "plugins/keyboard/input.js" );
	const keyboard = load( "plugins/keyboard/index.js", {
		"g_input": input
	} );
	keyboard.keyboardPlugin( pluginApi );
	function screen() {
		const data = { "isRemoved": false, "width": 100, "font": { "height": 8 },
			"printCursor": { "x": 3, "y": 8 }, "draws": 0, "api": {} };
		data.api.getPos = () => ( { "col": 0, "row": 1 } );
		data.api.getRows = () => 10;
		data.api.getPosPx = () => ( { ...data.printCursor } );
		data.api.setPosPx = ( x, y ) => {
			if( typeof x === "object" ) { data.printCursor = { ...x }; }
			else { data.printCursor = { "x": x, "y": y }; }
		};
		data.api.createImageFromScreen = options => images.set( options.name, {} );
		data.api.blitImage = data.api.print = () => {
			assert.equal( data.isRemoved, false, "must not redraw during disposal" );
			data.draws++;
		};
		return data;
	}
	const first = screen();
	api.getPosPx = first.api.getPosPx;
	api.setPosPx = first.api.setPosPx;
	function start( owner = first, fn = null, options = {} ) {
		return commands.input( owner, { "prompt": "Name?", "fn": fn, "cursor": null,
			"maxLength": null, ...options } );
	}
	function dispose( owner = first ) {
		owner.isRemoved = true;
		for( const hook of hooks ) { hook( owner ); }
	}
	function key( name = "a", mode = "down", repeat = false ) {
		const event = { "key": name, "code": name, "repeat": repeat,
			"preventDefault": () => { event.prevented = true; } };
		if( mode === "up" ) { keyboard.onKeyUp( event ); }
		else { keyboard.onKeyDown( event ); }
		return event;
	}
	return { api, keyboard, input, commands, timers, images, microtasks, first, screen,
		start, dispose, key };
}

function empty( h ) {
	assert.equal( h.timers.size, 0 );
	assert.equal( h.images.size, 0 );
	assert.equal( vm.runInContext( "m_inputData", h.input ), null );
	assert.equal( vm.runInContext( "m_onKeyHandlers.any?.length ?? 0", h.keyboard ), 0 );
}

test( "SYS-003 disposal settles once without drawing and releases resources", async () => {
	const h = harness();
	const values = [];
	const promise = h.start( h.first, value => values.push( value ) );
	const queuedTick = [ ...h.timers.values() ][ 0 ];
	const y = h.first.printCursor.y;
	h.dispose();
	h.dispose();
	assert.equal( h.first.draws, 0 );
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
	const promise = h.start( h.first, () => { replacement = h.start( next ); throw error; } );
	assert.doesNotThrow( () => h.dispose() );
	assert.equal( await promise, null );
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
	assert.equal( event.prevented, true );
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
	h.key( "a", "down", true );
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
