/**
 * Deterministic regressions for the 2.1.1 lifecycle fixes using actual source modules.
 */
const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function loadModule( file, globals = {} ) {
	const source = fs.readFileSync( path.join( __dirname, "../..", file ), "utf8" )
		.replace( /^import .*;\r?\n/gm, "" ).replace( /export /g, "" );
	const context = vm.createContext( { "console": console, ...globals } );
	vm.runInContext( source, context, { "filename": file } );
	return context;
}

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
