/**
 * Realtime browser tests for sound-advanced recording in Chromium and Firefox, launched so
 * that audio may start without a gesture. A recorded tone decodes with decodeAudioData at
 * the context's sample rate with the expected length and level, a suspended context captures
 * nothing, and saveRecording() downloads the Blob under its file name. WebKit is skipped:
 * Playwright's Windows build has no Web Audio API.
 *
 * Offline recording accuracy is covered in audio-recording-browser.test.js.
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

const ENGINES = g_audioEngines.AUDIO_ENGINES.filter( engine => engine !== "webkit" );

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
	window.__base64 = async blob => {
		const bytes = new Uint8Array( await blob.arrayBuffer() );
		let text = "";
		for( let i = 0; i < bytes.length; i += 0x8000 ) {
			text += String.fromCharCode.apply( null, bytes.subarray( i, i + 0x8000 ) );
		}
		return btoa( text );
	};
} )();`;

let root = null;
let server = null;

before( async () => {
	root = await g_fs.mkdtemp( g_path.join( g_os.tmpdir(), "pi-audio-recording-" ) );
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

describe( "sound recording (realtime)", { "concurrency": true }, () => {
	for( const engine of ENGINES ) {
		describe( engine, { "concurrency": 1 }, () => {
			let browser = null;
			let page = null;
			const errors = [];

			before( async () => {
				browser = await g_audioEngines.launchEngine( engine, { "realtimeAudio": true } );
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
				} );
			}

			for( const bitDepth of [ 16, 32 ] ) {
				test( `a ${bitDepth}-bit recording of a tone decodes at the context rate`,
					async () => {
						await load();
						const result = await page.evaluate( async depth => {
							await $.startRecording( "output", 10, depth );
							const from = __context.currentTime;
							$.sound( {
								"frequency": 440, "duration": 0.6, "volume": 1, "oType": "sine"
							} );
							await __wait( 500 );
							const blob = await $.stopRecording();
							const elapsed = __context.currentTime - from;
							const bytes = await blob.arrayBuffer();
							const header = new DataView( bytes );
							const decoded = await __context.decodeAudioData( bytes.slice( 0 ) );
							let peak = 0;
							for( const value of decoded.getChannelData( 0 ) ) {
								peak = Math.max( peak, Math.abs( value ) );
							}
							return {
								"contextRate": __context.sampleRate,
								"headerRate": header.getUint32( 24, true ),
								"headerBits": header.getUint16( 34, true ),
								"decodedRate": decoded.sampleRate,
								"length": decoded.length,
								"channels": decoded.numberOfChannels,
								"peak": peak,
								"elapsed": elapsed
							};
						}, bitDepth );
						assert.deepEqual( errors, [] );
						assert.equal( result.headerRate, result.contextRate );
						assert.equal( result.headerBits, bitDepth );
						assert.equal( result.decodedRate, result.contextRate );
						assert.equal( result.channels, 2 );

						// Capture follows context time, not wall time, from the start until the
						// stop; the stop's round trip adds or drops a few quanta
						const seconds = result.length / result.contextRate;
						assert.ok( result.elapsed >= 0.2, `context advanced ${result.elapsed} s` );
						assert.ok(
							Math.abs( seconds - result.elapsed ) <= 0.1,
							`recorded ${seconds} s in ${result.elapsed} s of context time`
						);

						// A full-scale sine at the default volume 0.75, below the limiter
						assert.ok(
							result.peak > 0.5 && result.peak <= 1, `peak ${result.peak}`
						);
					}
				);
			}

			test( "a suspended context captures nothing", async () => {
				await load();
				const result = await page.evaluate( async () => {
					await $.startRecording();
					await __wait( 300 );
					await __context.suspend();
					await __wait( 100 );
					const suspended = $.getRecordingState();
					await __wait( 400 );
					const later = $.getRecordingState();
					await __context.resume();
					await __wait( 400 );
					const resumed = $.getRecordingState();
					await $.stopRecording();
					return { "suspended": suspended, "later": later, "resumed": resumed };
				} );
				assert.deepEqual( errors, [] );
				assert.equal( result.suspended.state, "recording" );
				assert.ok( result.suspended.duration > 0, `${result.suspended.duration} s` );
				assert.equal( result.later.duration, result.suspended.duration );
				assert.ok( result.resumed.duration > result.later.duration );
			} );

			test( "saveRecording downloads the Blob under its file name", async () => {
				await load();
				await page.evaluate( async () => {
					await $.startRecording();
					await __wait( 200 );
					window.__blob = await $.stopRecording();
				} );
				const expected = Buffer.from(
					await page.evaluate( () => __base64( __blob ) ), "base64"
				);
				for( const name of [ null, "song.wav" ] ) {
					const [ download ] = await Promise.all( [
						page.waitForEvent( "download" ),
						page.evaluate( filename => {
							if( filename ) {
								$.saveRecording( __blob, filename );
							} else {
								$.saveRecording( __blob );
							}
						}, name )
					] );
					assert.equal( download.suggestedFilename(), name || "recording.wav" );
					const saved = await g_fs.readFile( await download.path() );
					assert.ok( saved.equals( expected ), `${name}: saved bytes differ` );
				}
				assert.deepEqual( errors, [] );
			} );
		} );
	}
} );
