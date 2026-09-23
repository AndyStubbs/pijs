/**
 * Unit tests for the lookahead scheduler in plugins/sound/scheduler.js: pending records and
 * streams share one start-ordered window, streams do not count toward the pending cap,
 * finished streams are removed, and hiding the page fills the larger window at once.
 *
 * The page globals the scheduler touches are replaced before it loads: a stub AudioContext
 * whose clock the tests set, virtual interval timers, and a document with controllable
 * visibility.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
const assert = g_assert;
const test = g_test.test;

// Any member of a stub is another stub, so the context's node graph can be built
function stub() {
	const target = function() {};
	return new Proxy( target, {
		"get": ( object, key ) => {
			if( key === "then" ) {
				return undefined;
			}
			if( !( key in object ) ) {
				object[ key ] = stub();
			}
			return object[ key ];
		},
		"apply": () => stub(),
		"construct": () => stub()
	} );
}

const m_context = stub();
m_context.currentTime = 0;
m_context.sampleRate = 48000;
m_context.baseLatency = 0;
m_context.state = "running";
globalThis.AudioContext = function() {
	return m_context;
};

const m_intervals = new Set();
globalThis.setInterval = callback => {
	const handle = { "callback": callback };
	m_intervals.add( handle );
	return handle;
};
globalThis.clearInterval = handle => {
	m_intervals.delete( handle );
};

const m_visibilityListeners = [];
globalThis.document = {
	"hidden": false,
	"addEventListener": ( type, listener ) => {
		if( type === "visibilitychange" ) {
			m_visibilityListeners.push( listener );
		}
	},
	"removeEventListener": () => {}
};

const g_scheduler = await import( "../../plugins/sound/scheduler.js" );

function createStream( id, starts, log ) {
	const stream = {
		"id": id,
		"kind": "test",
		"index": 0,
		"doneCalls": 0,
		"peek": () => {
			if( stream.index < starts.length ) {
				return starts[ stream.index ];
			}
			return Infinity;
		},
		"take": () => {
			log.push( id + "@" + starts[ stream.index ] );
			stream.index += 1;
		},
		"isDone": () => stream.index >= starts.length,
		"onDone": () => {
			stream.doneCalls += 1;
		}
	};
	return stream;
}

function addRecord( id, start, log ) {
	g_scheduler.addPending( {
		"id": id,
		"kind": "test",
		"start": start,
		"run": () => {
			log.push( id + "@" + start );
		}
	}, "test" );
}

function tickAll() {
	for( const handle of Array.from( m_intervals ) ) {
		handle.callback();
	}
}

test( "pending records and stream items run in start order within the window", () => {
	const log = [];
	m_context.currentTime = 10;
	addRecord( "a", 11, log );
	addRecord( "b", 11.1, log );
	const stream = createStream( "s", [ 11.05, 11.14, 11.5 ], log );
	g_scheduler.addStream( stream );
	assert.deepEqual( log, [] );

	m_context.currentTime = 10.95;
	tickAll();
	assert.deepEqual( log, [ "a@11", "s@11.05", "b@11.1", "s@11.14" ] );
	assert.equal( stream.doneCalls, 0 );

	m_context.currentTime = 11.4;
	tickAll();
	assert.deepEqual( log.slice( 4 ), [ "s@11.5" ] );
	assert.equal( stream.doneCalls, 1 );
	assert.equal( g_scheduler.removeStream( "s" ), false );
	assert.equal( m_intervals.size, 0 );
} );

test( "a stream's first items are created synchronously when it is added", () => {
	const log = [];
	m_context.currentTime = 20;
	const stream = createStream( "first", [ 20.01, 20.1, 20.5 ], log );
	g_scheduler.addStream( stream );
	assert.deepEqual( log, [ "first@20.01", "first@20.1" ] );
	g_scheduler.removeStream( "first" );
	tickAll();
	assert.deepEqual( log, [ "first@20.01", "first@20.1" ] );
	assert.equal( stream.doneCalls, 0 );
	assert.equal( m_intervals.size, 0 );
} );

test( "stream items do not count toward the pending cap", () => {
	m_context.currentTime = 30;
	const starts = [];
	for( let i = 0; i < 2000; i++ ) {
		starts.push( 40 + i );
	}
	g_scheduler.addStream( createStream( "long", starts, [] ) );
	for( let i = 0; i < g_scheduler.MAX_PENDING_SOUNDS; i++ ) {
		addRecord( "p" + i, 50, [] );
	}
	assert.throws( () => addRecord( "over", 50, [] ), { "code": "TOO_MANY_PENDING_SOUNDS" } );
	g_scheduler.clearPending( "test" );
	g_scheduler.removeStream( "long" );
	tickAll();
	assert.equal( m_intervals.size, 0 );
} );

test( "hiding the page fills the larger window at once, limited by fill capacity", () => {
	const log = [];
	let canFill = true;
	g_scheduler.setFillProbe( () => canFill );
	m_context.currentTime = 60;
	const stream = createStream( "h", [ 60.1, 60.5, 61, 61.5, 62.5 ], log );
	g_scheduler.addStream( stream );
	assert.deepEqual( log, [ "h@60.1" ] );
	assert.equal( m_visibilityListeners.length, 1 );

	globalThis.document.hidden = true;
	m_visibilityListeners[ 0 ]();
	assert.deepEqual( log, [ "h@60.1", "h@60.5", "h@61", "h@61.5" ] );

	// Without fill capacity only items within the base horizon are created
	canFill = false;
	m_context.currentTime = 61.5;
	tickAll();
	assert.equal( log.length, 4 );
	m_context.currentTime = 62.35;
	tickAll();
	assert.deepEqual( log.slice( 4 ), [ "h@62.5" ] );
	assert.equal( stream.doneCalls, 1 );

	globalThis.document.hidden = false;
	g_scheduler.setFillProbe( () => true );
} );

test( "a failing item is logged and does not stop later items", () => {
	const log = [];
	const errors = [];
	const originalError = console.error;
	console.error = ( ...args ) => {
		errors.push( args );
	};
	try {
		m_context.currentTime = 70;
		const stream = createStream( "f", [ 70.01, 70.02 ], log );
		const take = stream.take;
		stream.take = () => {
			if( stream.index === 0 ) {
				stream.index += 1;
				throw new Error( "boom" );
			}
			take();
		};
		g_scheduler.addStream( stream );
	} finally {
		console.error = originalError;
	}
	assert.equal( errors.length, 1 );
	assert.deepEqual( log, [ "f@70.02" ] );
} );
