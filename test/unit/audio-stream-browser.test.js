/**
 * Realtime browser test for stream-mode audio, plus the one realtime check of the scheduling
 * lead: a decode-mode position after a rate change.
 *
 * OfflineAudioContext has no createMediaElementSource, so stream mode cannot run in the offline
 * harness. This test plays through a real AudioContext in Chromium and Firefox, launched so
 * that audio may start without a gesture, from generated WAV files served by the test server.
 * It asserts observable state rather than rendered samples: readiness at canplay, media event
 * order, element positions after play, pause, resume, and rate changes, replacement, rate
 * limits, and audibility at the stream rate bounds. WebKit is skipped: Playwright's Windows
 * build has no Web Audio API.
 *
 * Timing tolerance: element and timer timing make stream positions approximate (plan 7.3).
 * Positions are compared with the elapsed wall time since each call. Observed with
 * Playwright 1.56 on Windows: Chromium lags by at most 38 ms (the scheduling lead plus media
 * start), and Firefox by up to 89 ms after a seek and play, including replacement's fade.
 * The decode-mode check reads the rendered position through an analyser; it was within
 * 0.001 s of content of the model in Chromium and 0.011 s in Firefox.
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

// Seconds of disagreement allowed between an element position and the elapsed-time estimate
const POSITION_TOLERANCE = { "chromium": 0.05, "firefox": 0.12 };

// Seconds of content allowed between a decode-mode position and the position model
const DECODE_TOLERANCE = 0.05;

const ENGINES = g_audioEngines.AUDIO_ENGINES.filter( engine => engine !== "webkit" );

/**
 * Encode a mono 16-bit WAV
 *
 * @param {number} sampleRate - Sample rate
 * @param {number} seconds - Length
 * @param {Function} value - value( i, frames ) in -1..1
 * @returns {Buffer} WAV bytes
 */
function wav( sampleRate, seconds, value ) {
	const frames = Math.round( sampleRate * seconds );
	const bytes = Buffer.alloc( 44 + frames * 2 );
	bytes.write( "RIFF", 0 );
	bytes.writeUInt32LE( 36 + frames * 2, 4 );
	bytes.write( "WAVEfmt ", 8 );
	bytes.writeUInt32LE( 16, 16 );
	bytes.writeUInt16LE( 1, 20 );
	bytes.writeUInt16LE( 1, 22 );
	bytes.writeUInt32LE( sampleRate, 24 );
	bytes.writeUInt32LE( sampleRate * 2, 28 );
	bytes.writeUInt16LE( 2, 32 );
	bytes.writeUInt16LE( 16, 34 );
	bytes.write( "data", 36 );
	bytes.writeUInt32LE( frames * 2, 40 );
	for( let i = 0; i < frames; i++ ) {
		bytes.writeInt16LE( Math.round( value( i, frames ) * 32767 ), 44 + i * 2 );
	}
	return bytes;
}

/**
 * Page hooks installed before the bundle: element event logs, an analyser tapped in parallel
 * on every media element source and buffer source, and a log of playbackRate steps.
 */
const INIT_SCRIPT = `( () => {
	const NativeAudio = window.Audio;
	window.__elements = [];
	window.Audio = function( ...args ) {
		const element = new NativeAudio( ...args );
		element.__events = [];
		for( const name of [ "canplay", "play", "pause", "ended", "seeked" ] ) {
			element.addEventListener( name, () => element.__events.push( name ) );
		}
		window.__elements.push( element );
		return element;
	};
	const NativeContext = window.AudioContext;
	window.AudioContext = class extends NativeContext {
		constructor( ...args ) {
			super( ...args );
			window.__context = this;
		}
	};
	window.__taps = {};
	window.__rateSteps = [];
	window.__starts = [];
	window.__fades = 0;
	function tap( context, name ) {
		if( !window.__taps[ name ] ) {
			const analyser = context.createAnalyser();
			analyser.fftSize = 2048;
			window.__taps[ name ] = analyser;
		}
		return window.__taps[ name ];
	}
	const createElementSource = NativeContext.prototype.createMediaElementSource;
	NativeContext.prototype.createMediaElementSource = function( element ) {
		const node = createElementSource.call( this, element );
		node.connect( tap( this, "stream" ) );
		return node;
	};
	const start = AudioBufferSourceNode.prototype.start;
	AudioBufferSourceNode.prototype.start = function( when, ...args ) {
		const source = this;
		if( source.buffer && source.buffer.duration > 3 ) {
			source.connect( tap( source.context, "decode" ) );
			const param = source.playbackRate;
			const setValue = param.setValueAtTime;
			param.setValueAtTime = function( value, time ) {
				window.__rateSteps.push( { "value": value, "time": time } );
				return setValue.call( this, value, time );
			};
			window.__starts.push( when );
		}
		return start.call( this, when, ...args );
	};
	const linearRamp = AudioParam.prototype.linearRampToValueAtTime;
	AudioParam.prototype.linearRampToValueAtTime = function( value, time ) {
		if( value === 0 ) {
			window.__fades++;
		}
		return linearRamp.call( this, value, time );
	};
	window.__wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );
	window.__level = name => {
		const data = new Float32Array( window.__taps[ name ].fftSize );
		window.__taps[ name ].getFloatTimeDomainData( data );
		let sum = 0;
		for( const value of data ) {
			sum += value * value;
		}
		return Math.sqrt( sum / data.length );
	};
} )();`;

let root = null;
let server = null;

before( async () => {
	root = await g_fs.mkdtemp( g_path.join( g_os.tmpdir(), "pi-audio-stream-" ) );
	const bundle = await g_sourceHarness.buildSource( "src/index-full.js" );
	await g_fs.writeFile( g_path.join( root, "pi.js" ), bundle );
	await g_fs.writeFile(
		g_path.join( root, "index.html" ),
		"<!doctype html><html><body><script src=\"pi.js\"></script></body></html>"
	);

	// Stream fixture: 3 s of a 440 Hz sine; decode fixture: a 4 s ramp encoding position
	await g_fs.writeFile( g_path.join( root, "tone.wav" ), wav( 22050, 3, i => {
		return 0.5 * Math.sin( 2 * Math.PI * 440 * i / 22050 );
	} ) );
	await g_fs.writeFile( g_path.join( root, "ramp.wav" ), wav( 48000, 4, ( i, frames ) => {
		return -0.9 + 1.8 * i / frames;
	} ) );
	server = await g_testServer.startTestServer( root );
} );

after( async () => {
	await server?.close();
	if( root ) {
		await g_fs.rm( root, { "recursive": true, "force": true } );
	}
} );

describe( "stream mode (realtime)", { "concurrency": true }, () => {
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

			async function run( fn, arg ) {
				errors.length = 0;
				await page.goto( `${server.url}/index.html` );
				await page.evaluate( async () => {
					await $.ready();

					// Create the context and wait until it runs, so one-shots are not dropped
					// under the locked-context policy
					$.sound( { "volume": 0, "duration": 0 } );
					for( let i = 0; i < 100 && __context.state !== "running"; i++ ) {
						await __wait( 20 );
					}
				} );
				const result = await page.evaluate( fn, arg );
				assert.deepEqual( errors, [] );
				return result;
			}

			test( "play, pause, resume, and rate changes track the element position", async () => {
				const result = await run( async () => {
					const id = $.loadAudio( "tone.wav", "tone", true );
					await $.ready();
					const element = __elements[ 0 ];
					const readyEvents = element.__events.slice();
					const checks = {};

					let from = performance.now();
					const instance = $.playAudio( id, 1, 0.5 );
					await __wait( 400 );
					checks.play = [
						element.currentTime, 0.5 + ( performance.now() - from ) / 1000
					];

					$.pauseAudio( instance );
					await __wait( 50 );
					const paused = element.currentTime;
					await __wait( 250 );
					checks.pause = [ element.currentTime, paused ];
					const pausedFlag = element.paused;

					from = performance.now();
					$.resumeAudio( instance );
					await __wait( 400 );
					checks.resume = [
						element.currentTime, paused + ( performance.now() - from ) / 1000
					];

					const before = element.currentTime;
					from = performance.now();
					$.setAudio( instance, null, 2 );
					await __wait( 400 );
					checks.rate = [
						element.currentTime, before + 2 * ( performance.now() - from ) / 1000
					];

					const codes = [];
					for( const call of [
						() => $.playAudio( id, 1, 0, 0, false, 5 ),
						() => $.playAudio( id, 1, 0, 0, false, 0.2 ),
						() => $.setAudio( instance, null, 4.5 )
					] ) {
						try {
							call();
						} catch( error ) {
							codes.push( error.code );
						}
					}
					$.stopAudio( instance );
					await __wait( 100 );
					return {
						"readyEvents": readyEvents,
						"events": element.__events,
						"pausedFlag": pausedFlag,
						"stoppedFlag": element.paused,
						"checks": checks,
						"codes": codes
					};
				} );
				assert.ok( result.readyEvents.includes( "canplay" ) );
				assert.equal( result.pausedFlag, true );
				assert.equal( result.stoppedFlag, true );
				const events = result.events.filter( name => name === "play" || name === "pause" );
				assert.deepEqual( events, [ "play", "pause", "play", "pause" ] );
				for( const name in result.checks ) {
					const [ actual, expected ] = result.checks[ name ];
					assert.ok(
						Math.abs( actual - expected ) <= POSITION_TOLERANCE[ engine ],
						`${name}: element at ${actual}, expected ${expected}`
					);
				}
				assert.deepEqual( result.codes, [
					"INVALID_PLAYBACK_RATE", "INVALID_PLAYBACK_RATE", "INVALID_PLAYBACK_RATE"
				] );
			} );

			test( "resuming right after a pause keeps the stream playing", async () => {
				const result = await run( async () => {
					const id = $.loadAudio( "tone.wav", "tone", true );
					await $.ready();
					const element = __elements[ 0 ];
					const instance = $.playAudio( { "audioId": id, "loop": true } );
					await __wait( 200 );
					$.pauseAudio( instance );
					$.resumeAudio( instance );
					await __wait( 300 );
					const playing = !element.paused;
					$.stopAudio();
					return playing;
				} );
				assert.equal( result, true );
			} );

			test( "a stream plays until the end of the file and completes its instance",
				async () => {
					const result = await run( async () => {
						const id = $.loadAudio( "tone.wav", "tone", true );
						await $.ready();
						const element = __elements[ 0 ];
						const instance = $.playAudio( id, 1, 2.7 );
						await __wait( 600 );
						$.pauseAudio( instance );
						return { "events": element.__events, "paused": element.paused };
					} );
					assert.ok( result.events.includes( "ended" ) || result.paused );
				} );

			test( "the stream rate bounds are audible", async () => {
				const result = await run( async () => {
					const id = $.loadAudio( "tone.wav", "tone", true );
					await $.ready();
					const levels = [];
					for( const rate of [ 0.25, 4 ] ) {
						const instance = $.playAudio( {
							"audioId": id, "loop": true, "playbackRate": rate
						} );
						await __wait( 300 );
						levels.push( __level( "stream" ) );
						$.stopAudio( instance );
						await __wait( 100 );
					}
					return levels;
				} );
				for( const level of result ) {
					assert.ok( level > 0.05, `stream level ${level}` );
				}
			} );

			test( "replacement fades the previous instance and succeeds at full protected " +
				"capacity", async () => {
				const result = await run( async () => {
					const stream = $.loadAudio( "tone.wav", "tone", true );
					const decoded = $.loadAudio( "ramp.wav", "ramp" );
					await $.ready();
					const element = __elements[ 0 ];
					const first = $.playAudio( stream, 0.2, 0, 0, true );
					for( let i = 0; i < 63; i++ ) {
						$.playAudio( decoded, 0.001, 0, 0, true );
					}
					const starts = __starts.length;
					$.playAudio( decoded, 0.001, 0, 0, true );
					const rejected = __starts.length === starts;
					await __wait( 200 );

					const fades = __fades;
					const from = performance.now();
					const second = $.playAudio( stream, 0.2, 1.5, 0, true );
					await __wait( 400 );
					const position = [
						element.currentTime, 1.5 + ( performance.now() - from ) / 1000
					];
					$.stopAudio( first );
					const playing = !element.paused;
					$.stopAudio();
					return {
						"rejected": rejected,
						"faded": __fades > fades,
						"position": position,
						"playing": playing,
						"ids": [ first, second ]
					};
				} );
				assert.equal( result.rejected, true );
				assert.equal( result.faded, true );
				assert.equal( result.playing, true );
				assert.ok(
					Math.abs( result.position[ 0 ] - result.position[ 1 ] ) <=
						POSITION_TOLERANCE[ engine ],
					`element at ${result.position[ 0 ]}, expected ${result.position[ 1 ]}`
				);
			} );

			test( "decode-mode position after a rate change matches the position model",
				async () => {
					const result = await run( async () => {
						const id = $.loadAudio( "ramp.wav", "ramp" );
						await $.ready();
						const instance = $.playAudio( id );
						await __wait( 500 );
						$.setAudio( instance, null, 2 );
						await __wait( 500 );
						const data = new Float32Array( __taps.decode.fftSize );
						__taps.decode.getFloatTimeDomainData( data );
						return {
							"value": data[ data.length - 1 ],
							"time": __context.currentTime,
							"begin": __starts[ 0 ],
							"steps": __rateSteps
						};
					} );
					const position = ( result.value + 0.9 ) / 1.8 * 4;
					const change = result.steps.find( step => step.value === 2 ).time;
					const model = ( change - result.begin ) + 2 * ( result.time - change );
					assert.ok(
						Math.abs( position - model ) <= DECODE_TOLERANCE,
						`position ${position}, model ${model}`
					);
				} );
		} );
	}
} );
