/**
 * Deterministic loading and ownership regressions (SYS-004, SYS-018) for decoded and streamed
 * audio, plus instance ID and validation rules, against the actual samples module source.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_sandbox from "./audio-sample-sandbox.js";
const test = g_test.test;
const assert = g_assert;
const flush = g_sandbox.flush;

test( "SYS-004 decode success holds one wait and ignores late results", async () => {
	const h = g_sandbox.createSampleSandbox();
	const id = h.commands.loadAudio( { "src": "one.wav" } );
	assert.equal( id, "audio_0" );
	assert.equal( h.counts.wait, 1 );
	assert.equal( h.fetches.length, 1 );
	assert.equal( h.fetches[ 0 ].src, "one.wav" );
	assert.throws(
		() => h.commands.playAudio( { "audioId": id } ), { "code": "AUDIO_NOT_LOADED" }
	);
	await h.finishDecode();
	assert.equal( h.counts.done, 1 );
	h.decodes[ 0 ].reject( new Error( "late" ) );
	await flush();
	assert.equal( h.counts.done, 1 );
	assert.equal( h.timers.size, 0 );
	const instance = h.commands.playAudio( { "audioId": id } );
	assert.equal( instance, 1 );
	assert.equal( h.admitted.length, 1 );
} );

test( "SYS-004 network failures retry three times 100 ms apart, then fail", async () => {
	const h = g_sandbox.createSampleSandbox();
	const id = h.commands.loadAudio( { "src": "bad.wav" } );
	for( let i = 0; i < 4; i++ ) {
		h.fetches[ i ].reject( new TypeError( "network" ) );
		await flush();
		if( i < 3 ) {
			h.retry();
		}
	}
	assert.equal( h.fetches.length, 4 );
	assert.equal( h.counts.wait, 1 );
	assert.equal( h.counts.done, 1 );
	assert.equal( h.timers.size, 0 );
	assert.throws(
		() => h.commands.playAudio( { "audioId": id } ), { "code": "AUDIO_NOT_LOADED" }
	);
	h.commands.removeAudio( { "audioId": id } );
	assert.equal( h.counts.done, 1 );
} );

test( "SYS-004 5xx statuses retry; 4xx statuses and decode errors fail at once", async () => {
	const h = g_sandbox.createSampleSandbox();
	h.commands.loadAudio( { "src": "busy.wav" } );
	h.respond( h.fetches[ 0 ], 503 );
	await flush();
	h.retry();
	await h.finishDecode();
	assert.equal( h.counts.done, 1 );

	h.commands.loadAudio( { "src": "missing.wav" } );
	h.respond( h.fetches.at( -1 ), 404 );
	await flush();
	assert.equal( h.timers.size, 0 );
	assert.equal( h.counts.done, 2 );

	h.commands.loadAudio( { "src": "corrupt.wav" } );
	h.respond( h.fetches.at( -1 ) );
	await flush();
	h.decodes.at( -1 ).reject( new Error( "EncodingError" ) );
	await flush();
	assert.equal( h.timers.size, 0 );
	assert.equal( h.counts.done, 3 );
	assert.equal( h.counts.wait, 3 );
} );

for( const timing of [ "fetching", "retry", "decoding", "ready", "playing" ] ) {
	test( `SYS-018 decode removal while ${timing} releases ownership and permits name reuse`,
		async () => {
			const h = g_sandbox.createSampleSandbox();
			const id = h.commands.loadAudio( { "src": "old.wav", "name": "reuse" } );
			const oldFetch = h.fetches[ 0 ];
			let staleRetry = null;
			if( timing === "retry" ) {
				oldFetch.reject( new TypeError( "network" ) );
				await flush();
				staleRetry = h.timers.values().next().value.fn;
			}
			if( timing === "decoding" ) {
				h.respond( oldFetch );
				await flush();
			}
			if( timing === "ready" || timing === "playing" ) {
				await h.finishDecode();
			}
			if( timing === "playing" ) {
				h.commands.playAudio( { "audioId": id, "loop": true } );
			}
			h.commands.removeAudio( { "audioId": id } );
			assert.equal( h.counts.done, 1 );
			assert.equal( h.timers.size, 0 );
			assert.equal( oldFetch.signal.aborted, timing === "fetching" || timing === "decoding" );
			if( timing === "playing" ) {
				assert.equal( h.stopped.length, 1 );
				assert.equal( h.stopped[ 0 ].kind, "stop" );
			}
			assert.throws(
				() => h.commands.removeAudio( { "audioId": id } ), { "code": "AUDIO_NOT_FOUND" }
			);

			// Late results from the removed audio cannot affect a replacement
			h.commands.loadAudio( { "src": "new.wav", "name": "reuse" } );
			const fetchCount = h.fetches.length;
			if( staleRetry ) {
				staleRetry();
			}
			if( timing === "decoding" ) {
				h.decodes[ 0 ].resolve( { "duration": 1, "numberOfChannels": 1 } );
			}
			await flush();
			assert.equal( h.fetches.length, fetchCount );
			assert.equal( h.counts.done, 1 );
			assert.throws(
				() => h.commands.playAudio( { "audioId": "reuse" } ), { "code": "AUDIO_NOT_LOADED" }
			);
			await h.finishDecode();
			h.commands.playAudio( { "audioId": "reuse" } );
			h.commands.removeAudio( { "audioId": "reuse" } );
			assert.equal( h.counts.wait, h.counts.done );
		} );
}

test( "SYS-004 stream mode is ready at canplay and retries only network errors", () => {
	const h = g_sandbox.createSampleSandbox();
	h.commands.loadAudio( { "src": "music.wav", "stream": true } );
	const first = h.elements[ 0 ];
	assert.equal( first.crossOrigin, "anonymous" );
	assert.equal( first.preservesPitch, false );
	assert.equal( first.src, "music.wav" );
	first.fail( 2 );
	first.fail( 2 );
	assert.equal( first.listenerCount( "canplay" ), 0 );
	assert.equal( first.src, "" );
	h.retry();
	h.elements[ 1 ].emit( "canplay" );
	h.elements[ 1 ].emit( "canplay" );
	assert.equal( h.counts.wait, 1 );
	assert.equal( h.counts.done, 1 );

	h.commands.loadAudio( { "src": "unsupported.wav", "stream": true } );
	h.elements[ 2 ].fail( 4 );
	assert.equal( h.timers.size, 0 );
	assert.equal( h.counts.done, 2 );

	for( const errorValue of [ null, {}, { "code": 99 } ] ) {
		h.commands.loadAudio( { "src": "odd.wav", "stream": true } );
		const element = h.elements.at( -1 );
		element.error = errorValue;
		element.emit( "error" );
		assert.equal( h.timers.size, 0 );
	}
	assert.equal( h.counts.wait, h.counts.done );
} );

test( "SYS-018 stream removal releases the element and ignores late events", () => {
	const h = g_sandbox.createSampleSandbox();
	const id = h.commands.loadAudio( { "src": "old.wav", "name": "reuse", "stream": true } );
	const old = h.elements[ 0 ];
	old.fail( 2 );
	const staleRetry = h.timers.values().next().value.fn;
	h.commands.removeAudio( { "audioId": id } );
	assert.equal( h.counts.done, 1 );
	h.commands.loadAudio( { "src": "new.wav", "name": "reuse", "stream": true } );
	staleRetry();
	old.emit( "canplay" );
	assert.equal( h.elements.length, 2 );
	assert.equal( h.counts.done, 1 );
	h.elements[ 1 ].emit( "canplay" );
	assert.equal( h.counts.wait, h.counts.done );
} );

for( const kind of [ "constructor", "listener" ] ) {
	test( `SYS-018 synchronous ${kind} failure rolls back the wait and the name`, () => {
		const h = g_sandbox.createSampleSandbox();
		const failure = new Error( "initialization failed" );
		h.failures.error = failure;
		if( kind === "constructor" ) {
			h.failures.constructAt = 1;
		} else {
			h.failures.listener = "error";
		}
		assert.throws( () => h.commands.loadAudio( {
			"src": "one.wav", "name": "reuse", "stream": true
		} ), error => error === failure );
		assert.equal( h.counts.wait, h.counts.done );
		assert.equal( h.timers.size, 0 );
		delete h.failures.constructAt;
		delete h.failures.listener;
		h.commands.loadAudio( { "src": "new.wav", "name": "reuse", "stream": true } );
		h.elements.at( -1 ).emit( "canplay" );
		assert.equal( h.counts.wait, h.counts.done );
	} );

	test( `SYS-004 retry ${kind} failure is logged and settles without throwing`, () => {
		const h = g_sandbox.createSampleSandbox();
		const id = h.commands.loadAudio( { "src": "one.wav", "stream": true } );
		h.elements[ 0 ].fail( 2 );
		h.failures.error = new Error( "retry initialization failed" );
		if( kind === "constructor" ) {
			h.failures.constructAt = 2;
		} else {
			h.failures.listener = "error";
		}
		assert.doesNotThrow( h.retry );
		assert.equal( h.counts.wait, 1 );
		assert.equal( h.counts.done, 1 );
		assert.equal( h.timers.size, 0 );
		assert.ok( h.errors.some( args => args.includes( h.failures.error ) ) );
		h.commands.removeAudio( { "audioId": id } );
		assert.equal( h.counts.done, 1 );
	} );
}

test( "loadAudio validates stream, protocol, source, and names", () => {
	const h = g_sandbox.createSampleSandbox();
	assert.throws(
		() => h.commands.loadAudio( { "src": "a.wav", "stream": 4 } ), { "code": "INVALID_STREAM" }
	);
	assert.throws( () => h.commands.loadAudio( { "src": "" } ), { "code": "INVALID_SRC" } );
	h.commands.loadAudio( { "src": "a.wav", "name": "a" } );
	assert.throws(
		() => h.commands.loadAudio( { "src": "b.wav", "name": "a" } ),
		{ "code": "DUPLICATE_AUDIO_NAME" }
	);
	for( const stream of [ false, true ] ) {
		assert.throws(
			() => h.commands.loadAudio( { "src": "file:///c:/game/a.wav", "stream": stream } ),
			{ "code": "UNSUPPORTED_PROTOCOL" }
		);
	}
	const local = g_sandbox.createSampleSandbox( { "baseURI": "file:///c:/game/index.html" } );
	assert.throws(
		() => local.commands.loadAudio( { "src": "a.wav" } ), { "code": "UNSUPPORTED_PROTOCOL" }
	);
	assert.equal( h.counts.wait, 1 );
	assert.equal( local.counts.wait, 0 );
} );

test( "playAudio validates its parameters and the rate range of each mode", async () => {
	const h = g_sandbox.createSampleSandbox();
	const decoded = h.commands.loadAudio( { "src": "a.wav" } );
	await h.finishDecode();
	const streamed = h.commands.loadAudio( { "src": "b.wav", "stream": true } );
	h.elements[ 0 ].emit( "canplay" );
	const cases = [
		[ { "audioId": "missing" }, "AUDIO_NOT_FOUND" ],
		[ { "audioId": decoded, "volume": 2 }, "INVALID_VOLUME" ],
		[ { "audioId": decoded, "startTime": -1 }, "INVALID_START_TIME" ],
		[ { "audioId": decoded, "duration": -1 }, "INVALID_DURATION" ],
		[ { "audioId": decoded, "loop": 1 }, "INVALID_LOOP" ],
		[ { "audioId": decoded, "pan": 1.5 }, "INVALID_PAN" ],
		[ { "audioId": decoded, "delay": -1 }, "INVALID_DELAY" ],
		[ { "audioId": decoded, "playbackRate": 0.05 }, "INVALID_PLAYBACK_RATE" ],
		[ { "audioId": decoded, "playbackRate": 17 }, "INVALID_PLAYBACK_RATE" ],
		[ { "audioId": streamed, "playbackRate": 0.2 }, "INVALID_PLAYBACK_RATE" ],
		[ { "audioId": streamed, "playbackRate": 5 }, "INVALID_PLAYBACK_RATE" ]
	];
	for( const [ options, code ] of cases ) {
		assert.throws( () => h.commands.playAudio( options ), { "code": code } );
	}
	h.commands.playAudio( { "audioId": decoded, "playbackRate": 0.0625 } );
	h.commands.playAudio( { "audioId": decoded, "playbackRate": 16 } );
	h.commands.playAudio( { "audioId": streamed, "playbackRate": 0.25 } );
	h.commands.playAudio( { "audioId": streamed, "playbackRate": 4 } );
	assert.equal( h.admitted.length, 4 );
} );

test( "instance IDs increase; completed IDs are no-ops and never-issued IDs throw", async () => {
	const h = g_sandbox.createSampleSandbox();
	const id = h.commands.loadAudio( { "src": "a.wav" } );
	await h.finishDecode();
	const first = h.commands.playAudio( { "audioId": id } );
	const second = h.commands.playAudio( { "audioId": id } );
	assert.deepEqual( [ first, second ], [ 1, 2 ] );
	h.commands.stopAudio( { "id": first } );
	assert.equal( h.stopped.length, 1 );
	for( const command of [ "stopAudio", "pauseAudio", "resumeAudio" ] ) {
		h.commands[ command ]( { "id": first } );
		assert.throws( () => h.commands[ command ]( { "id": 99 } ), { "code": "AUDIO_NOT_FOUND" } );
		assert.throws( () => h.commands[ command ]( { "id": 0 } ), { "code": "AUDIO_NOT_FOUND" } );
		assert.throws(
			() => h.commands[ command ]( { "id": "missing" } ), { "code": "AUDIO_NOT_FOUND" }
		);
		assert.throws(
			() => h.commands[ command ]( { "id": {} } ), { "code": "INVALID_AUDIO_ID" }
		);
	}
	h.commands.setAudio( { "instanceId": first, "volume": 0.5 } );
	assert.throws(
		() => h.commands.setAudio( { "instanceId": 99, "volume": 0.5 } ),
		{ "code": "AUDIO_NOT_FOUND" }
	);
	assert.throws(
		() => h.commands.setAudio( { "instanceId": id, "volume": 0.5 } ),
		{ "code": "INVALID_AUDIO_ID" }
	);
	assert.equal( h.stopped.length, 1 );

	// A rejected request still returns an ID in the completed state
	h.failures.reject = true;
	const rejected = h.commands.playAudio( { "audioId": id } );
	assert.equal( rejected, 3 );
	h.commands.stopAudio( { "id": rejected } );
	h.commands.stopAudio( { "id": id } );
	assert.equal( h.stopped.length, 2 );
} );

test( "exhausted budgets complete without admission", async () => {
	const h = g_sandbox.createSampleSandbox();
	const id = h.commands.loadAudio( { "src": "a.wav" } );
	await h.finishDecode( { "duration": 2 } );
	const late = h.commands.playAudio( { "audioId": id, "startTime": 2 } );
	h.commands.playAudio( { "audioId": id, "startTime": 5, "duration": 1 } );
	assert.equal( h.admitted.length, 0 );
	h.commands.pauseAudio( { "id": late } );
	h.commands.playAudio( { "audioId": id, "startTime": 5, "loop": true } );
	assert.equal( h.admitted.length, 1 );
} );

test( "a locked context drops one-shots and defers loops until unlock", async () => {
	const h = g_sandbox.createSampleSandbox( { "locked": true } );
	const id = h.commands.loadAudio( { "src": "a.wav" } );
	await h.finishDecode();
	h.commands.playAudio( { "audioId": id } );
	const loop = h.commands.playAudio( { "audioId": id, "loop": true } );
	const cancelled = h.commands.playAudio( { "audioId": id, "loop": true } );
	assert.equal( h.admitted.length, 0 );
	assert.equal( h.unlocks.length, 2 );
	h.commands.stopAudio( { "id": cancelled } );
	assert.equal( h.unlocks.length, 1 );
	h.setLocked( false );
	h.unlocks.shift()();
	assert.equal( h.admitted.length, 1 );
	assert.equal( h.admitted[ 0 ].request.protected, true );
	h.commands.stopAudio( { "id": loop } );
	assert.equal( h.stopped.length, 1 );
} );

test( "delayed requests keep pending records that stop and pause remove", async () => {
	const h = g_sandbox.createSampleSandbox();
	const id = h.commands.loadAudio( { "src": "a.wav" } );
	await h.finishDecode();
	const stopped = h.commands.playAudio( { "audioId": id, "delay": 1 } );
	const paused = h.commands.playAudio( { "audioId": id, "delay": 1, "loop": true } );
	assert.equal( h.pending.length, 2 );
	assert.equal( h.admitted.length, 0 );
	h.commands.stopAudio( { "id": stopped } );
	h.commands.pauseAudio( { "id": paused } );
	assert.equal( h.pending.length, 0 );
	h.commands.resumeAudio( { "id": paused } );
	assert.equal( h.admitted.length, 1 );
	assert.equal( h.admitted[ 0 ].request.begin, 256 / 48000 );
} );

test( "stream playAudio replaces the current instance and inherits its slot", () => {
	const h = g_sandbox.createSampleSandbox();
	const id = h.commands.loadAudio( { "src": "music.wav", "stream": true } );
	h.elements[ 0 ].emit( "canplay" );
	const first = h.commands.playAudio( { "audioId": id, "loop": true } );
	h.commands.playAudio( { "audioId": id, "loop": true } );
	assert.equal( h.stopped.length, 1 );
	assert.equal( h.stopped[ 0 ].voice, h.admitted[ 0 ] );
	assert.equal( h.admitted[ 0 ].request.inherit, false );
	assert.equal( h.admitted[ 1 ].request.inherit, true );
	h.commands.stopAudio( { "id": first } );
	assert.equal( h.stopped.length, 1 );
} );
