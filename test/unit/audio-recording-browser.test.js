/**
 * Offline render tests for sound-advanced recording: a recording of "output" equals the
 * rendered destination with the limiter on and off, 16-bit files are within one quantization
 * step, a bus recording holds that bus only, the last partial block is kept, maxDuration
 * stops capture, and every error code, including a worklet that cannot load.
 *
 * Each recording starts before the render, so its first frame is the destination's first
 * frame, and stops after the render, so the processor flushes a partial block.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./audio-render-harness.js";
import * as g_suite from "./audio-browser-suite.js";
const test = g_test.test;
const assert = g_assert;
const frame = g_suite.frame;

const RATE = g_harness.SAMPLE_RATE;

// Loud enough that the limiter changes the signal
const LOUD_CHORD = `
	$.setVolume( 1 );
	for( const frequency of [ 220, 330, 440 ] ) {
		$.sound( { "frequency": frequency, "duration": 0.4, "volume": 1, "oType": "square" } );
	}
`;

function channel( result, index = 0 ) {
	return g_harness.decodeRender( result ).channels[ index ];
}

/**
 * Amplitude of one frequency component over a range, by a single-bin DFT.
 *
 * @param {Float32Array} samples - Samples
 * @param {number} frequency - Frequency in Hz
 * @param {number} from - First frame
 * @param {number} to - End frame (exclusive)
 * @returns {number} Peak amplitude of the component
 */
function toneAmplitude( samples, frequency, from, to ) {
	let re = 0;
	let im = 0;
	for( let i = from; i < to; i++ ) {
		const angle = 2 * Math.PI * frequency * i / RATE;
		re += samples[ i ] * Math.cos( angle );
		im -= samples[ i ] * Math.sin( angle );
	}
	return 2 * Math.hypot( re, im ) / ( to - from );
}

/**
 * Decode a WAV file written by the recorder
 *
 * @param {string} base64 - WAV bytes
 * @returns {Object} { format, bitDepth, sampleRate, channels: [ Float32Array or Int16Array ] }
 */
function decodeWav( base64 ) {
	const bytes = Buffer.from( base64, "base64" );
	const buffer = bytes.buffer.slice( bytes.byteOffset, bytes.byteOffset + bytes.length );
	const view = new DataView( buffer );
	const format = view.getUint16( 20, true );
	const channelCount = view.getUint16( 22, true );
	const bitDepth = view.getUint16( 34, true );
	const dataBytes = view.getUint32( 40, true );
	assert.equal( buffer.byteLength, 44 + dataBytes );
	let interleaved;
	if( bitDepth === 32 ) {
		interleaved = new Float32Array( buffer, 44 );
	} else {
		interleaved = new Int16Array( buffer, 44 );
	}
	const frames = interleaved.length / channelCount;
	const channels = [];
	for( let c = 0; c < channelCount; c++ ) {
		const data = new interleaved.constructor( frames );
		for( let i = 0; i < frames; i++ ) {
			data[ i ] = interleaved[ i * channelCount + c ];
		}
		channels.push( data );
	}
	return {
		"format": format,
		"bitDepth": bitDepth,
		"sampleRate": view.getUint32( 24, true ),
		"channels": channels
	};
}

/**
 * Page-side helper: wait for the recording state, since processor messages arrive as tasks
 * after the render that produced them
 */
const WAIT_FOR_STATE = `
window.__waitForState = async state => {
	for( let i = 0; i < 200 && $.getRecordingState().state !== state; i++ ) {
		await __audioHarness.settle( null, 1 );
	}
};
`;

/**
 * Page function: start a recording, render actions given as source strings, then stop the
 * recording and return the render with the WAV bytes.
 *
 * @param {Object} arg - { setup, start: [ bus, maxDuration, bitDepth ], actions, waitFor }
 * @returns {Promise<Object>} Render with `values` and base64 `wav`
 */
async function recordRender( arg ) {
	const values = {};
	eval( arg.helpers );
	new Function( "values", arg.setup || "" )( values );
	const started = $.startRecording( ...( arg.start || [] ) );
	values.starting = $.getRecordingState();
	await started;
	values.started = $.getRecordingState();
	const actions = ( arg.actions || [] ).map( action => ( {
		"time": action.time,
		"run": new Function( "values", action.code ).bind( null, values )
	} ) );
	const render = await __audioHarness.render( { "actions": actions } );
	if( arg.waitFor ) {
		await __waitForState( arg.waitFor );
	}
	values.rendered = $.getRecordingState();
	const blob = await $.stopRecording();
	values.stopped = $.getRecordingState();
	values.type = blob.type;
	const bytes = new Uint8Array( await blob.arrayBuffer() );
	let text = "";
	for( let i = 0; i < bytes.length; i += 0x8000 ) {
		text += String.fromCharCode.apply( null, bytes.subarray( i, i + 0x8000 ) );
	}
	return { ...render, "values": values, "wav": btoa( text ) };
}

g_suite.describeAudioEngines( "sound recording", suite => {

	for( const limiter of [ true, false ] ) {
		test( `a float output recording equals the destination with the limiter ${
			limiter ? "on" : "off"
		}`, async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.5 }
			}, recordRender, {
				"setup": `$.setSoundLimiter( ${limiter} );`,
				"start": [ "output", 60, 32 ],
				"actions": [ { "time": 0, "code": LOUD_CHORD } ]
			} );
			if( !result ) {
				return;
			}
			const wav = decodeWav( result.wav );
			assert.equal( wav.format, 3 );
			assert.equal( wav.sampleRate, RATE );
			assert.equal( wav.channels.length, 2 );
			assert.equal( result.values.type, "audio/wav" );
			assert.equal( result.values.starting.state, "starting" );
			assert.equal( result.values.started.state, "recording" );
			assert.equal( result.values.stopped.state, "idle" );

			// The render is not a whole number of 4096-frame blocks, so the flush kept the
			// partial last block
			assert.notEqual( result.length % 4096, 0 );
			assert.equal( wav.channels[ 0 ].length, result.length );
			for( let c = 0; c < 2; c++ ) {
				const rendered = channel( result, c );
				for( let i = 0; i < rendered.length; i++ ) {
					if( wav.channels[ c ][ i ] !== rendered[ i ] ) {
						assert.fail( `channel ${c} frame ${i}: ${wav.channels[ c ][ i ]} ` +
							`recorded, ${rendered[ i ]} rendered` );
					}
				}
			}
			const peak = Math.max( ...channel( result ).map( Math.abs ) );
			if( limiter ) {
				assert.ok( peak <= 1 && peak > 0.5, `limited peak ${peak}` );
			} else {
				assert.ok( peak > 1, `unlimited peak ${peak}` );
			}
		} );
	}

	test( "a default recording is 16-bit output within one quantization step", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 0.5 }
		}, recordRender, {
			"actions": [ { "time": 0, "code": LOUD_CHORD } ]
		} );
		if( !result ) {
			return;
		}
		const wav = decodeWav( result.wav );
		assert.equal( wav.format, 1 );
		assert.equal( wav.bitDepth, 16 );
		assert.equal( wav.channels[ 0 ].length, result.length );
		for( let c = 0; c < 2; c++ ) {
			const rendered = channel( result, c );
			let worst = 0;
			for( let i = 0; i < rendered.length; i++ ) {
				const expected = Math.max( -1, Math.min( 1, rendered[ i ] ) );
				worst = Math.max( worst, Math.abs( wav.channels[ c ][ i ] / 32767 - expected ) );
			}
			assert.ok( worst <= 1 / 32767, `channel ${c} differs by ${worst}` );
		}
	} );

	test( "a bus recording holds that bus only", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 0.6 }
		}, recordRender, {
			"setup": "$.setSoundLimiter( false );",
			"start": [ "music", 60, 32 ],
			"actions": [ { "time": 0, "code": `
				$.sound( { "frequency": 1000, "duration": 0.5, "volume": 0.4, "oType": "sine" } );
				$.play( "@0 T120 O4 L2 A" );
			` } ]
		} );
		if( !result ) {
			return;
		}
		const recorded = decodeWav( result.wav ).channels[ 0 ];
		const rendered = channel( result );
		const from = frame( 0.1 );
		const to = frame( 0.4 );

		// Both tones reach the destination; only the music note is in the recording
		assert.ok( toneAmplitude( rendered, 1000, from, to ) > 0.1 );
		assert.ok( toneAmplitude( rendered, 440, from, to ) > 0.05 );
		assert.ok( toneAmplitude( recorded, 440, from, to ) > 0.05 );
		assert.ok( toneAmplitude( recorded, 1000, from, to ) < 1e-4 );
	} );

	test( "maxDuration stops capture and keeps the samples until stopped", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.5 }
		}, recordRender, {
			"helpers": WAIT_FOR_STATE,
			"start": [ "output", 1, 32 ],
			"waitFor": "full",
			"actions": [ { "time": 0, "code": `
				$.sound( { "frequency": 440, "duration": 1.4, "volume": 0.5 } );
			` } ]
		} );
		if( !result ) {
			return;
		}
		const wav = decodeWav( result.wav );
		assert.equal( result.values.rendered.state, "full" );
		assert.equal( result.values.rendered.duration, 1 );
		assert.equal( wav.channels[ 0 ].length, RATE );
		const rendered = channel( result );
		for( let i = 0; i < RATE; i++ ) {
			if( wav.channels[ 0 ][ i ] !== rendered[ i ] ) {
				assert.fail( `frame ${i} differs` );
			}
		}
		assert.equal( result.values.stopped.state, "idle" );
	} );

	test( "recording commands report every error code", async t => {
		const result = await suite.inHarness( t, {}, async () => {
			function codeOf( fn ) {
				try {
					fn();
				} catch( error ) {
					return error.code || error.message;
				}
				return null;
			}
			const codes = {
				"bus": codeOf( () => $.startRecording( "drums" ) ),
				"durationLow": codeOf( () => $.startRecording( "output", 0.5 ) ),
				"durationHigh": codeOf( () => $.startRecording( "output", 601 ) ),
				"durationType": codeOf( () => $.startRecording( "output", "10" ) ),
				"durationNaN": codeOf( () => $.startRecording( "output", NaN ) ),
				"bitDepth": codeOf( () => $.startRecording( "output", 10, 24 ) ),
				"notRecording": codeOf( () => $.stopRecording() ),
				"blob": codeOf( () => $.saveRecording( "data" ) ),
				"filename": codeOf( () => $.saveRecording( new Blob( [] ), 42 ) ),
				"emptyFilename": codeOf( () => $.saveRecording( new Blob( [] ), "" ) ),
				"idle": $.getRecordingState()
			};
			const started = $.startRecording( { "maxDuration": 1 } );
			codes.whileStarting = codeOf( () => $.startRecording() );
			await started;
			codes.whileRecording = codeOf( () => $.startRecording() );

			// Stopping twice returns the same promise
			const stop = $.stopRecording();
			codes.samePromise = stop === $.stopRecording();
			codes.whileStopping = codeOf( () => $.startRecording() );
			const blob = await stop;
			codes.emptySize = blob.size;
			codes.after = $.getRecordingState();
			return codes;
		} );
		if( !result ) {
			return;
		}
		assert.equal( result.bus, "INVALID_BUS" );
		assert.equal( result.durationLow, "INVALID_DURATION" );
		assert.equal( result.durationHigh, "INVALID_DURATION" );
		assert.equal( result.durationType, "INVALID_DURATION" );
		assert.equal( result.durationNaN, "INVALID_DURATION" );
		assert.equal( result.bitDepth, "INVALID_BIT_DEPTH" );
		assert.equal( result.notRecording, "NOT_RECORDING" );
		assert.equal( result.blob, "INVALID_BLOB" );
		assert.equal( result.filename, "INVALID_FILENAME" );
		assert.equal( result.emptyFilename, "INVALID_FILENAME" );
		assert.deepEqual( result.idle, { "state": "idle", "duration": 0 } );
		assert.equal( result.whileStarting, "RECORDING_ACTIVE" );
		assert.equal( result.whileRecording, "RECORDING_ACTIVE" );
		assert.equal( result.whileStopping, "RECORDING_ACTIVE" );
		assert.equal( result.samePromise, true );

		// Nothing rendered, so the file is a header only
		assert.equal( result.emptySize, 44 );
		assert.deepEqual( result.after, { "state": "idle", "duration": 0 } );
	} );

	test( "a full recording rejects a new start until it is stopped", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }
		}, async helpers => {
			eval( helpers );
			await $.startRecording( "output", 1 );
			await __audioHarness.render();
			await __waitForState( "full" );
			let code = null;
			try {
				$.startRecording();
			} catch( error ) {
				code = error.code;
			}
			const state = $.getRecordingState().state;
			await $.stopRecording();
			return { "code": code, "state": state, "after": $.getRecordingState().state };
		}, WAIT_FOR_STATE );
		if( !result ) {
			return;
		}
		assert.equal( result.state, "full" );
		assert.equal( result.code, "RECORDING_ACTIVE" );
		assert.equal( result.after, "idle" );
	} );

	test( "stopping while starting waits for the start", async t => {
		const result = await suite.inHarness( t, {}, async () => {
			$.startRecording();
			const blob = await $.stopRecording();
			return { "size": blob.size, "state": $.getRecordingState().state };
		} );
		if( !result ) {
			return;
		}
		assert.equal( result.size, 44 );
		assert.equal( result.state, "idle" );
	} );

	test( "a worklet that cannot load rejects and returns to idle", async t => {
		const result = await suite.inHarness( t, {}, async () => {
			const addModule = AudioWorklet.prototype.addModule;
			AudioWorklet.prototype.addModule = () => Promise.reject( new Error( "blocked" ) );
			const values = {};
			const started = $.startRecording();
			const stopped = $.stopRecording();
			for( const [ name, promise ] of [ [ "start", started ], [ "stop", stopped ] ] ) {
				try {
					await promise;
					values[ name ] = null;
				} catch( error ) {
					values[ name ] = error.code;
					values[ name + "Cause" ] = error.cause && error.cause.message;
				}
			}
			values.state = $.getRecordingState().state;

			// A later start loads the module again
			AudioWorklet.prototype.addModule = addModule;
			await $.startRecording();
			values.retry = $.getRecordingState().state;
			await $.stopRecording();
			return values;
		} );
		if( !result ) {
			return;
		}
		assert.equal( result.start, "RECORDING_UNAVAILABLE" );
		assert.equal( result.startCause, "blocked" );
		assert.equal( result.stop, "RECORDING_UNAVAILABLE" );
		assert.equal( result.state, "idle" );
		assert.equal( result.retry, "recording" );
	} );
}, { "plugins": [ "sound-advanced" ] } );
