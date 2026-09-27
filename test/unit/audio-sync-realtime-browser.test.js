/**
 * Realtime browser tests for sound-advanced music sync in Chromium, launched so that audio may
 * start without a gesture. onPlay() handlers run within two animation frames of each note's
 * audible start, taken as the context time minus the output latency the engine reports. Notes
 * whose frame comes more than 250 ms late are dropped while the song's end is still delivered;
 * a main-thread stall delays the frames, as a hidden tab does, because a headless tab is never
 * hidden. clearEvents( "play" ) reaches the handlers. Set PI_AUDIO_REALTIME=0 to skip the suite
 * on machines without an audio device.
 *
 * The queue and dispatch rules are covered on a fake clock in sound-advanced.test.js.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs/promises";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_audioEngines from "./audio-engines.js";
import * as g_sourceHarness from "./browser-source-harness.js";
import * as g_testServer from "../scripts/test-server.js";
const { test, describe, before, after } = g_test;
const assert = g_assert;

/** Page hooks installed before the bundles: the audio context and a wall-clock wait. */
const INIT_SCRIPT = `( () => {
	const NativeContext = window.AudioContext;
	window.AudioContext = class extends NativeContext {
		constructor( ...args ) {
			super( ...args );
			window.__context = this;
		}
	};
	window.__wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );
} )();`;

let root = null;
let server = null;

before( async () => {
	if( g_audioEngines.REALTIME_SKIP ) {
		return;
	}
	root = await g_fs.mkdtemp( g_path.join( g_os.tmpdir(), "pi-audio-sync-" ) );
	const bundle = await g_sourceHarness.buildSource( "src/index-full.js" );
	const plugin = await g_sourceHarness.buildSource( "plugins/sound-advanced/index.js" );
	await g_fs.writeFile( g_path.join( root, "pi.js" ), bundle );
	await g_fs.writeFile( g_path.join( root, "sound-advanced.js" ), plugin );
	await g_fs.writeFile(
		g_path.join( root, "index.html" ),
		"<!doctype html><html><body><script src=\"pi.js\"></script>" +
		"<script src=\"sound-advanced.js\"></script></body></html>"
	);
	server = await g_testServer.startTestServer( root );
} );

after( async () => {
	await server?.close();
	if( root ) {
		await g_fs.rm( root, { "recursive": true, "force": true } );
	}
} );

describe( "sound music sync (realtime)", { "skip": g_audioEngines.REALTIME_SKIP }, () => {
	let browser = null;
	let page = null;
	const errors = [];

	before( async () => {
		browser = await g_audioEngines.launchEngine( "chromium", { "realtimeAudio": true } );
		page = await browser.newPage();
		page.on( "pageerror", error => errors.push( error.message ) );
		await page.addInitScript( INIT_SCRIPT );
	} );

	after( async () => {
		await browser?.close();
	} );

	async function load() {
		errors.length = 0;
		await page.goto( `${server.url}/index.html` );
		await page.evaluate( async () => {
			await $.ready();

			// Create the context and wait until it runs
			$.sound( { "volume": 0, "duration": 0 } );
			for( let i = 0; i < 100 && __context.state !== "running"; i++ ) {
				await __wait( 20 );
			}
			await __wait( 200 );
		} );
	}

	test( "note handlers run within two frames of each note's audible start", async () => {
		await load();
		const result = await page.evaluate( async () => {
			const frames = [];
			let last = null;
			const measure = time => {
				if( last !== null ) {
					frames.push( time - last );
				}
				last = time;
				if( frames.length < 60 ) {
					requestAnimationFrame( measure );
				}
			};
			requestAnimationFrame( measure );
			const notes = [];
			const ends = [];
			$.onPlay( "note", data => {
				notes.push( {
					"time": data.time,
					"delay": data.delay,
					"frozen": Object.isFrozen( data ),
					"audible": __context.currentTime - ( __context.outputLatency || 0 )
				} );
			} );
			$.onPlay( { "mode": "end", "fn": data => ends.push( data.stopped ) } );
			const trackId = $.play( "T240 L16 CDEFGABCDEFG" );
			await __wait( 1500 );
			frames.sort( ( a, b ) => a - b );
			return {
				"notes": notes,
				"ends": ends,
				"trackId": trackId,
				"frame": frames[ Math.floor( frames.length / 2 ) ] / 1000,
				"quantum": __context.baseLatency || 128 / __context.sampleRate
			};
		} );
		assert.deepEqual( errors, [] );
		assert.equal( result.notes.length, 12 );
		assert.deepEqual( result.ends, [ false ] );
		const limit = 2 * result.frame;
		result.notes.forEach( ( note, i ) => {
			assert.ok( note.frozen );
			const lag = note.audible - note.time;
			assert.ok(
				lag >= -result.quantum && lag <= limit + result.quantum,
				`note ${i} handler ran ${lag.toFixed( 4 )} s after its audible start ` +
					`(limit ${limit.toFixed( 4 )} s)`
			);
			assert.ok( note.delay >= 0 && note.delay <= limit, `note ${i} delay ${note.delay}` );
			if( i > 0 ) {
				assert.ok( note.time > result.notes[ i - 1 ].time, "notes arrive in time order" );
			}
		} );
	} );

	test( "notes whose frame comes more than 250 ms late are dropped", async () => {
		await load();
		const result = await page.evaluate( async () => {

			// Raw admitted notes from the sound service, to tell dropped notes from notes the
			// scheduler never admitted
			let service = null;
			pi.registerPlugin( {
				"name": "sync-probe",
				"dependencies": [ "sound" ],
				"init": api => {
					service = api.getService( "sound" );
				}
			} );
			const admitted = [];
			service.observePlay( event => {
				if( event.type === "note" ) {
					admitted.push( event.time );
				}
			} );
			const dispatched = [];
			const ends = [];
			$.onPlay( "note", data => {
				dispatched.push( { "time": data.time, "delay": data.delay } );
			} );
			$.onPlay( "end", data => ends.push( data.stopped ) );
			$.play( "T240 L32 " + "CDEFGAB".repeat( 12 ) );
			await __wait( 150 );

			// Hold the main thread for a second, as a hidden tab holds animation frames
			const until = performance.now() + 1000;
			while( performance.now() < until ) {
				// Busy wait
			}
			const resumed = __context.currentTime;
			await __wait( 2500 );
			return {
				"admitted": admitted,
				"dispatched": dispatched,
				"ends": ends,
				"resumed": resumed
			};
		} );
		assert.deepEqual( errors, [] );
		const heard = new Set( result.dispatched.map( note => note.time ) );
		const dropped = result.admitted.filter( time => !heard.has( time ) );
		assert.ok( dropped.length > 0, "notes admitted before the stall are dropped" );
		for( const time of dropped ) {
			assert.ok(
				time < result.resumed - 0.25, `dropped note at ${time} was not 250 ms late`
			);
		}
		for( const note of result.dispatched ) {
			assert.ok( note.delay <= 0.25, `note at ${note.time} dispatched ${note.delay} s late` );
		}
		assert.ok(
			result.dispatched.some( note => note.time > result.resumed ),
			"notes after the stall are dispatched"
		);
		assert.deepEqual( result.ends, [ false ] );
	} );

	test( "clearEvents( \"play\" ) and offPlay() remove handlers before their notes", async () => {
		await load();
		const result = await page.evaluate( async () => {
			const calls = [];
			const kept = () => calls.push( "kept" );
			$.onPlay( "note", () => calls.push( "cleared" ) );
			$.onPlay( "end", () => calls.push( "cleared end" ) );
			$.clearEvents( "play" );
			$.onPlay( "note", kept );
			$.onPlay( "note", () => calls.push( "removed" ) );
			$.offPlay( "note" );
			$.onPlay( "note", kept );
			$.play( "T240 L16 CDE" );
			await __wait( 800 );
			let message = null;
			try {
				$.clearEvents( "unknown" );
			} catch( error ) {
				message = error.message;
			}
			return { "calls": calls, "message": message };
		} );
		assert.deepEqual( errors, [] );
		assert.deepEqual( result.calls, [ "kept", "kept", "kept" ] );
		assert.match( result.message, /\bplay\b/ );
	} );
} );
