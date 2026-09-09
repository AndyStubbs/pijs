/**
 * Deterministic regressions for lifecycle and system audit fixes using actual source modules.
 */
const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function loadModule( file, globals = {} ) {
	const source = fs.readFileSync( path.join( __dirname, "../..", file ), "utf8" )
		.replace( /^import .*;\r?\n/gm, "" )
		.replace( /^export \{.*\};\r?\n/gm, "" ).replace( /export /g, "" );
	const context = vm.createContext( { "console": console, ...globals } );
	vm.runInContext( fs.readFileSync(
		path.join( __dirname, "../../src/renderer/context-state.js" ), "utf8"
	).replace( /export /g, "" ), context );
	vm.runInContext( source, context, { "filename": file } );
	return context;
}

function createPixelHarness() {
	const microtasks = [];
	const alpha = loadModule( "src/renderer/alpha.js" );
	const calls = { "read": 0, "upload": 0, "dirty": 0, "convert": 0 };
	const manager = loadModule( "src/core/screen-manager.js" );
	const view = loadModule( "src/api/view.js" );
	const screen = {
		"id": 42, "isRemoved": false, "width": 2, "height": 2,
		"view": { "originX": 0, "originY": 0, "width": 2, "height": 2,
			"clipX": 0, "clipY": 0, "clipWidth": 2, "clipHeight": 2 },
		"gl": {
			"bindFramebuffer": () => {},
			"readPixels": ( ...args ) => {
				calls.read++;
				for( let i = 0; i < args[ 6 ].length; i += 4 ) {
					args[ 6 ].set( [ 255, 0, 0, 255 ], i );
				}
			}
		}
	};
	const utils = {
		"queueMicrotask": fn => microtasks.push( fn ),
		"getInt": ( value, fallback ) => value ?? fallback,
		"getFloat": ( value, fallback ) => value ?? fallback,
		"isFunction": value => typeof value === "function",
		"rgbToColor": ( r, g, b, a ) => ( { "r": r, "g": g, "b": b, "a": a } )
	};
	const readback = loadModule( "src/renderer/readback.js", {
		"unpremultiplyPixels": alpha.unpremultiplyPixels,
		"g_utils": utils, "g_screenManager": manager,
		"g_batches": { "flushBatches": () => {} }
	} );
	const pixels = loadModule( "src/api/pixels.js", {
		"unpremultiplyPixels": alpha.unpremultiplyPixels,
		"g_utils": utils, "g_screenManager": manager, "g_view": view,
		"g_commands": { "addCommand": () => {} },
		"g_renderer": {
			"readPixelAsync": readback.readPixelAsync,
			"readPixelsAsync": readback.readPixelsAsync,
			"readPixelsRaw": readback.readPixelsRaw,
			"flushBatches": () => {}, "setImageDirty": () => calls.dirty++
		},
		"g_textures": { "updateWebGL2TextureSubImage": () => calls.upload++ },
		"g_colors": { "findColorIndexByColorValue": () => { calls.convert++; return 4; } }
	} );
	pixels.init( {} );
	const cleanupHooks = vm.runInContext( "m_screenDataPreCleanupFunctions", manager );
	const dispose = () => {
		screen.isRemoved = true;
		for( const hook of cleanupHooks ) {
			hook( screen );
		}
		screen.gl = null;
	};
	return { "microtasks": microtasks, "calls": calls, "screen": screen,
		"readback": readback, "pixels": pixels, "dispose": dispose };
}

for( const command of [ "getPixelAsync", "getAsync" ] ) {
	for( const asIndex of [ false, true ] ) {
		test( `SYS-005 ${command} rejects disposal with asIndex=${asIndex}`, async () => {
			const { pixels, screen, microtasks, calls } = createPixelHarness();
			const promise = pixels[ command ]( screen, {
				"x": 0, "y": 0, "width": 2, "height": 2, "asIndex": asIndex
			} );
			let settlements = 0;
			const observed = promise.then( () => { settlements++; }, error => {
				settlements++;
				return error.code;
			} );
			screen.isRemoved = true;
			screen.gl = null;
			assert.doesNotThrow( () => microtasks.shift()() );
			assert.equal( await observed, "SCREEN_REMOVED" );
			assert.equal( settlements, 1 );
			assert.equal( calls.read, 0 );
			assert.equal( calls.convert, 0 );
		} );
	}

	test( `SYS-005 ${command} checks disposal before palette conversion`, async () => {
		const { pixels, screen, microtasks, calls } = createPixelHarness();
		const promise = pixels[ command ]( screen, {
			"x": 0, "y": 0, "width": 2, "height": 2, "asIndex": true
		} );
		const rejected = assert.rejects( promise, { "code": "SCREEN_REMOVED" } );
		microtasks.shift()();
		screen.isRemoved = true;
		await rejected;
		assert.equal( calls.read, 1 );
		assert.equal( calls.convert, 0 );
	} );

	test( `SYS-005 ${command} propagates the original read failure`, async () => {
		const { pixels, screen, microtasks } = createPixelHarness();
		const failure = new Error( "read failed" );
		screen.gl.readPixels = () => { throw failure; };
		const promise = pixels[ command ]( screen, {
			"x": 0, "y": 0, "width": 2, "height": 2
		} );
		const rejected = assert.rejects( promise, error => error === failure );
		assert.doesNotThrow( () => microtasks.shift()() );
		await rejected;
	} );
}

for( const command of [ "getPixelAsync", "getAsync" ] ) {
	for( const afterRead of [ false, true ] ) {
		test( `SYS-008 ${command} discards old-generation reads afterRead=${afterRead}`, async () => {
			const { pixels, screen, microtasks, calls } = createPixelHarness();
			const promise = pixels[ command ]( screen, {
				"x": 0, "y": 0, "width": 2, "height": 2, "asIndex": false
			} );
			if( afterRead ) {
				microtasks.shift()();
			}
			// Simulate restoration before queued work or its conversion continuation executes.
			screen.contextGeneration = 1;
			while( microtasks.length ) { microtasks.shift()(); }
			const result = await promise;
			let colors = [ result ];
			if( command === "getAsync" ) { colors = result.flat(); }
			assert.ok( colors.every( color => color.r === 0 && color.a === 0 ) );
			assert.equal( calls.read, Number( afterRead ) );
		} );
	}
}

test( "SYS-008 filters queued before restoration never touch the new generation", () => {
	const { pixels, screen, microtasks, calls } = createPixelHarness();
	let callbacks = 0;
	pixels.filterImg( screen, { "filter": () => { callbacks++; return true; } } );
	microtasks.shift()();
	screen.contextGeneration = 1;
	while( microtasks.length ) { microtasks.shift()(); }
	assert.equal( callbacks, 0 );
	assert.equal( calls.read, 0 );
	assert.equal( calls.upload, 0 );
} );

for( const timing of [ "immediate", "between microtasks", "inside callback", "live" ] ) {
	test( "SYS-005 filter lifetime: " + timing, () => {
		const { pixels, screen, microtasks, calls, dispose } = createPixelHarness();
		let callbacks = 0;
		pixels.filterImg( screen, { "filter": () => {
			callbacks++;
			if( timing === "inside callback" ) {
				dispose();
			}
			return true;
		} } );
		if( timing === "between microtasks" ) {
			microtasks.shift()();
		}
		if( timing === "immediate" || timing === "between microtasks" ) {
			dispose();
		}
		while( microtasks.length ) {
			microtasks.shift()();
		}
		assert.equal( vm.runInContext( "m_activeFilters", pixels ).has( screen ), false );
		if( timing === "live" ) {
			assert.equal( callbacks, 4 );
			assert.equal( calls.upload, 1 );
			assert.equal( calls.dirty, 1 );
		} else {
			let expectedCallbacks = 0;
			if( timing === "inside callback" ) {
				expectedCallbacks = 1;
			}
			assert.equal( callbacks, expectedCallbacks );
			assert.equal( calls.upload, 0 );
			assert.equal( calls.dirty, 0 );
		}
	} );
}

test( "SYS-005 throwing filters release cancellation state and allow subsequent filtering", () => {
	const { pixels, screen, microtasks, calls } = createPixelHarness();
	const failure = new Error( "filter failed" );
	pixels.filterImg( screen, { "filter": () => { throw failure; } } );
	microtasks.shift()();
	assert.throws( () => microtasks.shift()(), error => error === failure );
	assert.equal( vm.runInContext( "m_activeFilters", pixels ).has( screen ), false );
	assert.equal( calls.upload, 0 );
	assert.equal( calls.dirty, 0 );
	let callbacks = 0;
	pixels.filterImg( screen, { "filter": () => { callbacks++; return true; } } );
	while( microtasks.length ) {
		microtasks.shift()();
	}
	assert.equal( callbacks, 4 );
	assert.equal( calls.upload, 1 );
	assert.equal( calls.dirty, 1 );
} );

function createReadyHarness( readyState = "complete" ) {
	const timers = new Map();
	const listeners = {};
	let nextTimer = 0;
	const commands = loadModule( "src/core/commands.js", {
		"g_utils": { "isFunction": value => typeof value === "function" },
		"g_screenManager": { "addScreenInitFunction": () => {} },
		"document": {
			"readyState": readyState,
			"addEventListener": ( name, fn ) => { listeners[ name ] = fn; }
		},
		"setTimeout": fn => { timers.set( ++nextTimer, fn ); return nextTimer; },
		"clearTimeout": id => timers.delete( id )
	} );
	commands.init( {} );
	return {
		"commands": commands,
		"listeners": listeners,
		"flush": () => {

			// Timers scheduled during dispatch belong to a subsequent turn.
			const callbacks = Array.from( timers.values() );
			timers.clear();
			for( const callback of callbacks ) {
				callback();
			}
		}
	};
}

test( "SYS-002 ready failures reject independently and preserve unrelated waiters", async () => {
	const { commands, flush } = createReadyHarness();
	const error = new Error( "expected ready failure" );
	const order = [];
	const outcomes = [];
	const callbacks = [
		() => { order.push( "first" ); throw error; },
		() => { order.push( "second" ); return 42; },
		null,
		() => { order.push( "third" ); throw null; },
		() => { order.push( "fourth" ); }
	];
	for( const [ index, callback ] of callbacks.entries() ) {
		commands.ready( { "callback": callback } ).then(
			value => { outcomes[ index ] = { "status": "fulfilled", "value": value }; },
			reason => { outcomes[ index ] = { "status": "rejected", "reason": reason }; }
		);
	}
	assert.deepEqual( order, [] );
	assert.doesNotThrow( flush );
	assert.deepEqual( order, [ "first", "second", "third", "fourth" ] );
	await Promise.resolve();
	assert.deepEqual( outcomes, [
		{ "status": "rejected", "reason": error },
		{ "status": "fulfilled", "value": undefined },
		{ "status": "fulfilled", "value": undefined },
		{ "status": "rejected", "reason": null },
		{ "status": "fulfilled", "value": undefined }
	] );
	assert.equal( outcomes[ 0 ].reason, error );
	let laterResolved = false;
	commands.ready( {} ).then( () => { laterResolved = true; } );
	flush();
	await Promise.resolve();
	assert.equal( laterResolved, true );
	flush();
	assert.deepEqual( order, [ "first", "second", "third", "fourth" ] );
} );

test( "SYS-002 reentrant ready callbacks run on a subsequent check", async () => {
	const { commands, flush } = createReadyHarness();
	const order = [];
	let nestedResolved = false;
	commands.ready( { "callback": () => {
		order.push( "outer" );
		commands.ready( { "callback": () => order.push( "nested" ) } ).then( () => {
			nestedResolved = true;
		} );
	} } );
	commands.ready( { "callback": () => order.push( "sibling" ) } );
	assert.deepEqual( order, [] );
	flush();
	await Promise.resolve();
	assert.deepEqual( order, [ "outer", "sibling" ] );
	assert.equal( nestedResolved, false );
	flush();
	await Promise.resolve();
	assert.deepEqual( order, [ "outer", "sibling", "nested" ] );
	assert.equal( nestedResolved, true );
	flush();
	assert.equal( order.length, 3 );
} );

test( "SYS-002 ready still waits for document readiness and every resource", async () => {
	const { commands, listeners, flush } = createReadyHarness( "loading" );
	let calls = 0;
	let resolved = false;
	commands.ready( { "callback": () => { calls++; } } ).then( () => { resolved = true; } );
	flush();
	await Promise.resolve();
	assert.equal( calls, 0 );
	assert.equal( resolved, false );
	commands.wait();
	commands.wait();
	listeners.DOMContentLoaded();
	flush();
	await Promise.resolve();
	assert.equal( calls, 0 );
	assert.equal( resolved, false );
	commands.done();
	flush();
	await Promise.resolve();
	assert.equal( calls, 0 );
	assert.equal( resolved, false );
	commands.done();
	assert.equal( calls, 0 );
	flush();
	await Promise.resolve();
	assert.equal( calls, 1 );
	assert.equal( resolved, true );
} );

test( "SYS-002 ready ignores async callback completion", async () => {
	const { commands, flush } = createReadyHarness();
	let completeCallback;
	const pending = new Promise( resolve => { completeCallback = resolve; } );
	let callbackCompleted = false;
	const outcomes = [];
	commands.ready( { "callback": async () => {
		await pending;
		callbackCompleted = true;
		return 42;
	} } ).then( value => outcomes.push( value ) );
	flush();
	await Promise.resolve();
	assert.deepEqual( outcomes, [ undefined ] );
	assert.equal( callbackCompleted, false );
	completeCallback();
	await Promise.resolve();
	assert.equal( callbackCompleted, true );
	assert.deepEqual( outcomes, [ undefined ] );
} );

test( "SYS-002 invalid ready callbacks still throw synchronously", () => {
	const { commands, flush } = createReadyHarness();
	for( const callback of [ false, 0, "callback", {}, [] ] ) {
		assert.throws( () => commands.ready( { "callback": callback } ), {
			"name": "TypeError", "code": "INVALID_CALLBACK"
		} );
	}
	assert.doesNotThrow( flush );
} );

test( "plugin cycles, failure, reentrant registration, and validation remain deterministic", () => {
	const commands = {};
	const module = loadModule( "src/core/plugins.js", {
		"g_commands": { "addCommand": ( name, fn ) => { commands[ name ] = fn; },
			"processCommands": () => {} },
		"g_screenManager": {}, "g_utils": {}, "queueMicrotask": () => {}
	} );
	module.init( {} );
	const register = commands.registerPlugin;
	const order = [];
	const config = ( name, dependencies, init = () => order.push( name ) ) => ( {
		"name": name, "dependencies": dependencies, "init": init
	} );
	register( config( "cycle-a", [ "cycle-b" ] ) );
	register( config( "cycle-b", [ "cycle-a" ] ) );
	register( config( "missing", [ "absent" ] ) );
	register( config( "blocked", [ "failed" ] ) );
	let attempts = 0;
	assert.throws( () => register( config( "failed", [], () => {
		attempts++;
		register( config( "independent", [] ) );
		throw new Error( "expected" );
	} ) ), { "code": "PLUGIN_INIT_FAILED" } );
	assert.deepEqual( order, [ "independent" ] );
	register( config( "outer", [], () => {
		register( config( "inner", [ "outer" ] ) );
		order.push( "outer" );
	} ) );
	assert.deepEqual( order, [ "independent", "outer", "inner" ] );
	assert.equal( attempts, 1 );
	assert.throws( () => register( config( "outer", [] ) ), { "code": "DUPLICATE_PLUGIN" } );
	for( const dependencies of [ "outer", [ "" ], [ " " ], [ 1 ], {} ] ) {
		assert.throws( () => register( config( "invalid", dependencies ) ), {
			"code": "INVALID_PLUGIN_DEPENDENCIES"
		} );
	}
	register( config( "default-dependencies", undefined ) );
	assert.equal( commands.getPlugins().filter( item => !item.initialized ).length, 5 );
} );

test( "pointer dispatch snapshots exclude new listeners and once survives nested dispatch", () => {
	const module = loadModule( "plugins/pointer/shared-events.js" );
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
	const module = loadModule( "plugins/pointer/shared-events.js", {
		"setTimeout": fn => timers.push( fn )
	} );
	const helpers = module.createEventHelpers( { "utils": {} } );
	const listeners = {};
	const fn = () => {};
	helpers.onevent( "move", fn, false, null, [ "move" ], "onmouse", listeners );
	assert.equal( helpers.offevent( "move", fn, [ "move" ], "offmouse", listeners ), true );
	for( const timer of timers ) {
		timer();
	}
	assert.equal( listeners.move, undefined );
} );

test( "plugin dependencies resolve in initialization order after late registration", () => {
	const commands = {};
	const microtasks = [];
	const module = loadModule( "src/core/plugins.js", {
		"g_commands": {
			"addCommand": ( name, fn ) => { commands[ name ] = fn; },
			"processCommands": () => {}
		},
		"g_screenManager": {}, "g_utils": {},
		"queueMicrotask": fn => microtasks.push( fn )
	} );
	module.init( {} );
	for( const fn of microtasks ) {
		fn();
	}
	const order = [];
	for( const [ name, dependencies ] of [ [ "A", [ "B" ] ], [ "B", [ "C" ] ], [ "C", [] ] ] ) {
		commands.registerPlugin( { "name": name, "dependencies": dependencies,
			"init": () => order.push( name ) } );
	}
	assert.deepEqual( order, [ "C", "B", "A" ] );
	assert.ok( commands.getPlugins().every( plugin => plugin.initialized ) );
} );

test( "replaying an audio slot without duration cancels its previous timer", () => {
	const timers = new Map();
	let nextTimer = 0;
	const commands = {};
	const audio = [];
	const module = loadModule( "plugins/sound/sound.js", {
		"setTimeout": fn => { timers.set( ++nextTimer, fn ); return nextTimer; },
		"clearTimeout": id => timers.delete( id ),
		"Audio": class {
			constructor() { this.listeners = {}; audio.push( this ); }
			addEventListener( name, fn ) { this.listeners[ name ] = fn; }
			removeEventListener( name ) { delete this.listeners[ name ]; }
			pause() {}
			play() {}
			removeAttribute() {}
			load() {}
		}
	} );
	module.registerSound( {
		"addCommand": ( name, fn ) => { commands[ name ] = fn; },
		"wait": () => {}, "done": () => {},
		"utils": { "getInt": ( v, d ) => v ?? d, "getFloat": ( v, d ) => v ?? d }
	} );
	const audioId = commands.loadAudio( { "src": "local.wav", "poolSize": 1 } );
	audio[ 0 ].listeners.canplay();
	commands.playAudio( { "audioId": audioId, "duration": 10 } );
	assert.equal( timers.size, 1 );
	commands.playAudio( { "audioId": audioId, "duration": 0 } );
	assert.equal( timers.size, 0 );
	commands.playAudio( { "audioId": audioId, "duration": 10 } );
	commands.playAudio( { "audioId": audioId, "duration": 5 } );
	assert.equal( timers.size, 1 );
	commands.stopAudio( { "audioId": audioId } );
	assert.equal( timers.size, 0 );
	commands.playAudio( { "audioId": audioId, "duration": 5 } );
	commands.removeAudio( { "audioId": audioId } );
	assert.equal( timers.size, 0 );
	const multiId = commands.loadAudio( { "src": "local.wav", "poolSize": 2 } );
	audio[ 1 ].listeners.canplay(); audio[ 2 ].listeners.canplay();
	commands.playAudio( { "audioId": multiId, "duration": 5 } );
	commands.playAudio( { "audioId": multiId, "duration": 10 } );
	assert.equal( timers.size, 2 );
	commands.playAudio( { "audioId": multiId, "duration": 0 } );
	assert.equal( timers.size, 1 );
	const [ handle, fire ] = timers.entries().next().value;
	timers.delete( handle ); fire();
	assert.equal( vm.runInContext( "m_audioPools.audioPool_1.pool[1].timeout", module ), 0 );
	commands.stopAudio( {} );
	assert.equal( timers.size, 0 );
} );
