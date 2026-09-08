/**
 * Deterministic SYS-004/SYS-018 regressions against the actual sound source module.
 */
const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function createHarness() {
	const audio = [];
	const commands = {};
	const timers = new Map();
	const errors = [];
	const counts = { "wait": 0, "done": 0, "construct": 0 };
	const failures = {};
	let nextTimer = 0;
	const context = vm.createContext( {
		"console": { "error": ( ...args ) => errors.push( args ), "warn": () => {} },
		"setTimeout": ( fn, delay ) => {
			timers.set( ++nextTimer, { "fn": fn, "delay": delay } );
			return nextTimer;
		},
		"clearTimeout": id => timers.delete( id ),
		"Audio": class {
			constructor( src ) {
				counts.construct++;
				if( failures.constructAt === counts.construct ) { throw failures.error; }
				this.src = src;
				this.error = { "code": 2 };
				this.listeners = new Map();
				this.pauses = 0;
				this.loads = 0;
				this.plays = 0;
				audio.push( this );
			}
			addEventListener( name, fn ) {
				if( failures.listener === name ) { throw failures.error; }
				this.listeners.set( name, fn );
			}
			removeEventListener( name, fn ) {
				if( this.listeners.get( name ) === fn ) { this.listeners.delete( name ); }
			}
			emit( name ) { this.listeners.get( name )?.(); }
			pause() { this.pauses++; }
			play() { this.plays++; }
			removeAttribute( name ) { if( name === "src" ) { this.src = ""; } }
			load() { this.loads++; }
		}
	} );
	const source = fs.readFileSync( path.join( __dirname, "../../plugins/sound/sound.js" ),
		"utf8" ).replace( /export /g, "" );
	vm.runInContext( source, context, { "filename": "plugins/sound/sound.js" } );
	context.registerSound( {
		"addCommand": ( name, fn ) => { commands[ name ] = fn; },
		"utils": { "getInt": ( v, d ) => v ?? d, "getFloat": ( v, d ) => v ?? d },
		"wait": () => { counts.wait++; }, "done": () => { counts.done++; }
	} );
	function retry() {
		assert.equal( timers.size, 1 );
		const [ id, timer ] = timers.entries().next().value;
		assert.equal( timer.delay, 100 );
		timers.delete( id );
		timer.fn();
		return timer.fn;
	}
	function released( elements = audio ) {
		for( const item of elements ) {
			assert.equal( item.listeners.size, 0 );
			assert.ok( item.pauses > 0 );
			assert.equal( item.src, "" );
			assert.ok( item.loads > 0 );
		}
	}
	return { "audio": audio, "commands": commands, "timers": timers, "counts": counts,
		"errors": errors, "failures": failures, "retry": retry, "released": released };
}

test( "SYS-004 success ignores duplicate readiness and late errors", () => {
	const h = createHarness();
	const id = h.commands.loadAudio( { "src": "one.wav" } );
	const ready = h.audio[ 0 ].listeners.get( "canplay" );
	const error = h.audio[ 0 ].listeners.get( "error" );
	ready();
	h.commands.loadAudio( { "src": "unrelated.wav" } );
	ready(); error();
	assert.equal( h.counts.wait, 2 );
	assert.equal( h.counts.done, 1 );
	assert.equal( h.audio[ 0 ].listeners.size, 0 );
	assert.equal( h.timers.size, 0 );
	h.commands.playAudio( { "audioId": id } );
	assert.equal( h.audio[ 0 ].plays, 1 );
} );

test( "SYS-004 retries own one wait and reject events from previous attempts", () => {
	const h = createHarness();
	h.commands.loadAudio( { "src": "one.wav" } );
	const ready = h.audio[ 0 ].listeners.get( "canplay" );
	const error = h.audio[ 0 ].listeners.get( "error" );
	error(); error(); ready();
	assert.equal( h.counts.done, 0 );
	h.released();
	const staleRetry = h.retry();
	staleRetry();
	assert.equal( h.audio.length, 2 );
	assert.equal( h.audio[ 1 ].src, "one.wav" );
	h.audio[ 1 ].emit( "canplay" );
	ready(); error();
	assert.equal( h.counts.wait, 1 );
	assert.equal( h.counts.done, 1 );
	assert.equal( h.timers.size, 0 );
} );

test( "SYS-004 exhausts exactly three retries and releases all failed media", () => {
	const h = createHarness();
	const id = h.commands.loadAudio( { "src": "bad.wav" } );
	for( let i = 0; i < 4; i++ ) {
		const error = h.audio[ i ].listeners.get( "error" );
		error(); error();
		if( i < 3 ) { h.retry(); }
	}
	assert.equal( h.audio.length, 4 );
	assert.equal( h.counts.wait, 1 );
	assert.equal( h.counts.done, 1 );
	assert.equal( h.timers.size, 0 );
	h.released();
	assert.throws( () => h.commands.playAudio( { "audioId": id } ), { "code": "EMPTY_POOL" } );
	h.commands.removeAudio( { "audioId": id } );
	assert.equal( h.counts.done, 1 );
} );

for( const errorValue of [ null, {}, { "code": 0 }, { "code": 99 } ] ) {
	test( `SYS-004 unknown media error ${JSON.stringify( errorValue )} settles once`, () => {
		const h = createHarness();
		h.commands.loadAudio( { "src": "bad.wav" } );
		h.audio[ 0 ].error = errorValue;
		const error = h.audio[ 0 ].listeners.get( "error" );
		assert.doesNotThrow( error );
		error();
		assert.equal( h.counts.done, 1 );
		assert.equal( h.timers.size, 0 );
		assert.equal( h.errors.length, 1 );
		h.released();
	} );
}

for( const timing of [ "pending", "retry", "partial", "ready" ] ) {
	test( `SYS-018 removal while ${timing} releases ownership and permits name reuse`, () => {
		const h = createHarness();
		const id = h.commands.loadAudio( { "src": "old.wav", "name": "reuse", "poolSize": 2 } );
		const old = h.audio.slice();
		const callbacks = old.flatMap( item => Array.from( item.listeners.values() ) );
		if( timing === "retry" ) {
			old[ 0 ].emit( "error" );
			callbacks.push( h.timers.values().next().value.fn );
		}
		if( timing === "partial" || timing === "ready" ) {
			old[ 0 ].emit( "canplay" );
			h.commands.playAudio( { "audioId": id, "duration": 1 } );
		}
		if( timing === "ready" ) { old[ 1 ].emit( "canplay" ); }
		h.commands.removeAudio( { "audioId": id } );
		assert.equal( h.counts.done, 2 );
		assert.equal( h.timers.size, 0 );
		h.released( old );
		assert.throws( () => h.commands.removeAudio( { "audioId": id } ),
			{ "code": "AUDIO_POOL_NOT_FOUND" } );
		h.commands.loadAudio( { "src": "new.wav", "name": "reuse" } );
		for( const callback of callbacks ) { callback(); }
		assert.equal( h.audio.length, 3 );
		assert.equal( h.counts.done, 2 );
		assert.equal( h.timers.size, 0 );
		h.audio[ 2 ].emit( "canplay" );
		h.commands.playAudio( { "audioId": "reuse" } );
		assert.equal( h.audio[ 2 ].plays, 1 );
		h.commands.removeAudio( { "audioId": "reuse" } );
		assert.equal( h.counts.wait, h.counts.done );
		h.released();
	} );
}

for( const kind of [ "constructor", "listener" ] ) {
	test( `SYS-018 synchronous ${kind} failure rolls back all acquired resources`, () => {
		const h = createHarness();
		const failure = new Error( "initialization failed" );
		h.failures.error = failure;
		if( kind === "constructor" ) { h.failures.constructAt = 2; }
		else { h.failures.listener = "error"; }
		assert.throws( () => h.commands.loadAudio( {
			"src": "one.wav", "name": "reuse", "poolSize": 2
		} ), error => error === failure );
		assert.equal( h.counts.wait, h.counts.done );
		assert.equal( h.timers.size, 0 );
		h.released();
		delete h.failures.constructAt;
		delete h.failures.listener;
		h.commands.loadAudio( { "src": "new.wav", "name": "reuse" } );
		h.audio.at( -1 ).emit( "canplay" );
		assert.equal( h.counts.wait, h.counts.done );
	} );

	test( `SYS-004 retry ${kind} failure is logged and settles without throwing`, () => {
		const h = createHarness();
		const id = h.commands.loadAudio( { "src": "one.wav" } );
		h.audio[ 0 ].emit( "error" );
		h.failures.error = new Error( "retry initialization failed" );
		if( kind === "constructor" ) { h.failures.constructAt = 2; }
		else { h.failures.listener = "error"; }
		assert.doesNotThrow( h.retry );
		assert.equal( h.counts.wait, 1 );
		assert.equal( h.counts.done, 1 );
		assert.equal( h.timers.size, 0 );
		assert.ok( h.errors.some( args => args.includes( h.failures.error ) ) );
		h.released();
		h.commands.removeAudio( { "audioId": id } );
		assert.equal( h.counts.done, 1 );
	} );
}
