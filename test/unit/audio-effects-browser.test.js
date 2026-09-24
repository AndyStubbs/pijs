/**
 * Offline render tests for sound-advanced bus effects: the filter against the biquad
 * magnitude response, distortion harmonics against drive, bitcrusher quantization levels and
 * held frames, chorus pitch modulation depth and phase, chain order, and in-place updates that
 * ramp without clicks and keep reverb tails.
 *
 * Renders whose actions all run at time 0 work on every engine; timed actions need offline
 * suspend(). Tone levels are measured with a single-bin DFT written here.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./audio-render-harness.js";
import * as g_metrics from "./audio-metrics.js";
import * as g_suite from "./audio-browser-suite.js";
import * as g_tolerances from "./audio-tolerances.js";
const test = g_test.test;
const assert = g_assert;
const frame = g_suite.frame;

const RATE = g_harness.SAMPLE_RATE;
const LEAD = g_suite.LEAD;

const SETUP = "$.setSoundLimiter( false ); $.setVolume( 1 );";

function assertNear( actual, expected, tolerance, label ) {
	assert.ok(
		Math.abs( actual - expected ) <= tolerance,
		`${label}: ${actual} is not within ${tolerance} of ${expected}`
	);
}

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
 * Magnitude response of a Web Audio lowpass or highpass biquad, whose Q is in decibels.
 *
 * @param {string} type - "lowpass" or "highpass"
 * @param {number} cutoff - Cutoff in Hz
 * @param {number} q - Q in dB
 * @param {number} frequency - Frequency in Hz
 * @returns {number} Gain
 */
function biquadMagnitude( type, cutoff, q, frequency ) {
	const w0 = 2 * Math.PI * cutoff / RATE;
	const alpha = Math.sin( w0 ) / ( 2 * Math.pow( 10, q / 20 ) );
	const cos = Math.cos( w0 );
	let b = [ ( 1 - cos ) / 2, 1 - cos, ( 1 - cos ) / 2 ];
	if( type === "highpass" ) {
		b = [ ( 1 + cos ) / 2, -( 1 + cos ), ( 1 + cos ) / 2 ];
	}
	const a = [ 1 + alpha, -2 * cos, 1 - alpha ];
	const w = 2 * Math.PI * frequency / RATE;
	const response = coefficients => {
		let re = 0;
		let im = 0;
		coefficients.forEach( ( c, k ) => {
			re += c * Math.cos( k * w );
			im -= c * Math.sin( k * w );
		} );
		return Math.hypot( re, im );
	};
	return response( b ) / response( a );
}

/**
 * Zero-crossing frequencies over consecutive short windows.
 *
 * @param {Float32Array} samples - Samples
 * @param {number} from - Start in seconds
 * @param {number} to - End in seconds
 * @param {number} window - Window length in seconds
 * @returns {number[]} Frequencies in Hz
 */
function frequencyTrack( samples, from, to, window ) {
	const track = [];
	for( let t = from; t + window <= to; t += window / 4 ) {
		track.push(
			g_metrics.zeroCrossingFrequency( samples, RATE, frame( t ), frame( t + window ) )
		);
	}
	return track;
}

/**
 * Page function: run setup code, optionally wait for the bitcrusher's worklet node, render
 * actions given as source strings, and return the render.
 *
 * @param {Object} arg - { setup, waitForCrusher, actions: [ { time, code } ] }; code runs
 *   as a function body with a `values` map
 * @returns {Promise<Object>} Render with `values`
 */
async function renderEffects( arg ) {
	const values = {};
	let created = null;
	const crusherReady = new Promise( resolve => {
		created = resolve;
	} );
	const NativeNode = window.AudioWorkletNode;
	window.AudioWorkletNode = class extends NativeNode {
		constructor( ...args ) {
			super( ...args );
			created();
		}
	};
	new Function( "values", arg.setup || "" )( values );
	if( arg.waitForCrusher ) {
		await __audioHarness.settle( crusherReady );
	}
	const actions = ( arg.actions || [] ).map( action => ( {
		"time": action.time,
		"run": new Function( "values", action.code ).bind( null, values )
	} ) );
	const render = await __audioHarness.render( { "actions": actions } );
	if( arg.carrier ) {
		values.carrier = await __audioHarness.renderCarrier( arg.carrier );
	}
	return { ...render, "values": values };
}

g_suite.describeAudioEngines( "sound effects", suite => {

	for( const type of [ "lowpass", "highpass" ] ) {
		test( `a ${type} filter matches the biquad response an octave past the cutoff`,
			async t => {
				const result = await suite.inHarness( t, {
					"config": { "duration": 0.6 }
				}, renderEffects, {
					"setup": SETUP + `
						$.setBusEffect( "sfx", "filter", { "type": "${type}", "cutoff": 1000 } );`,
					"actions": [ { "time": 0, "code": `
						$.sound( { "frequency": 2000, "duration": 0.5, "volume": 0.5,
							"oType": "sine" } );` } ]
				} );
				if( !result ) {
					return;
				}
				const level = toneAmplitude( channel( result ), 2000, frame( 0.1 ), frame( 0.4 ) );
				const expected = 0.5 * biquadMagnitude( type, 1000, 1, 2000 );
				assertNear( level, expected, expected * 0.02, type );
				if( type === "lowpass" ) {
					assert.ok( level < 0.5 / 3, `lowpass level ${level}` );
				}
			}
		);
	}

	test( "distortion harmonics rise with drive", async t => {
		const ratios = [];
		for( const drive of [ 0, 0.3, 0.8 ] ) {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.6 }
			}, renderEffects, {
				"setup": SETUP + `
					$.setBusEffect( "sfx", "distortion", { "drive": ${drive}, "tone": 20000 } );`,
				"actions": [ { "time": 0, "code": `
					$.sound( { "frequency": 440, "duration": 0.5, "volume": 0.8,
						"oType": "sine" } );` } ]
			} );
			if( !result ) {
				return;
			}
			const left = channel( result );
			const fundamental = toneAmplitude( left, 440, frame( 0.1 ), frame( 0.4 ) );
			assert.ok( fundamental > 0.4, `drive ${drive} fundamental ${fundamental}` );
			ratios.push( toneAmplitude( left, 1320, frame( 0.1 ), frame( 0.4 ) ) / fundamental );
		}
		assert.ok( ratios[ 0 ] < 0.005, `drive 0 third harmonic ${ratios[ 0 ]}` );
		assert.ok( ratios[ 1 ] > ratios[ 0 ] * 4, `drive 0.3 ${ratios[ 1 ]}` );
		assert.ok( ratios[ 2 ] > ratios[ 1 ] * 1.5, `drive 0.8 ${ratios[ 2 ]}` );
	} );

	test( "the bitcrusher quantizes to its bit depth and holds samples for its rate",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.5 }
			}, renderEffects, {
				"setup": SETUP + `
					$.setBusEffect( "sfx", "bitcrush", { "bits": 3, "rate": 4 } );`,
				"waitForCrusher": true,
				"actions": [ { "time": 0, "code": `
					$.sound( { "frequency": 50, "duration": 0.4, "volume": 0.9,
						"oType": "sine" } );` } ]
			} );
			if( !result ) {
				return;
			}
			for( const index of [ 0, 1 ] ) {
				const samples = channel( result, index );
				const levels = new Set();
				for( let i = frame( 0.05 ); i < frame( 0.35 ); i++ ) {
					const steps = samples[ i ] * 4;
					assertNear( steps, Math.round( steps ), 1e-6, `frame ${i} level` );
					levels.add( Math.round( steps ) );
					if( samples[ i ] !== samples[ i - 1 ] ) {
						assert.equal( i % 4, 0, `frame ${i} changes inside a hold` );
					}
				}

				// 3 bits: -4/4 to 4/4 in quarter steps; the sine reaches past +-0.875
				assert.deepEqual(
					[ ...levels ].sort( ( a, b ) => a - b ), [ -4, -3, -2, -1, 0, 1, 2, 3, 4 ]
				);
			}
		}
	);

	test( "a bitcrusher whose worklet cannot load passes the dry signal and warns once",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.4 }
			}, async () => {
				const addModule = AudioWorklet.prototype.addModule;
				AudioWorklet.prototype.addModule = () => Promise.reject( new Error( "blocked" ) );
				const warnings = [];
				const warn = console.warn;
				console.warn = message => {
					warnings.push( String( message ) );
				};
				$.setSoundLimiter( false );
				$.setVolume( 1 );
				$.setBusEffect( "sfx", "bitcrush", { "bits": 1 } );
				$.setBusEffect( "music", "bitcrush", { "bits": 1 } );
				await __audioHarness.settle( null, 20 );
				AudioWorklet.prototype.addModule = addModule;
				console.warn = warn;
				const render = await __audioHarness.render( { "actions": [ { "time": 0, "run":
					() => {
						$.sound( { "frequency": 440, "duration": 0.3, "volume": 0.5,
							"oType": "sine" } );
					}
				} ] } );
				return { ...render, "warnings": warnings };
			} );
			if( !result ) {
				return;
			}
			assert.equal( result.warnings.length, 1 );
			assert.match( result.warnings[ 0 ], /bitcrush effect is unavailable/ );
			const left = channel( result );
			assertNear( toneAmplitude( left, 440, frame( 0.05 ), frame( 0.25 ) ), 0.5, 0.005,
				"dry" );
		}
	);

	test( "the chorus modulates pitch by its depth and rate, in opposite phase", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.4 }
		}, renderEffects, {
			"setup": SETUP + `
				$.setBusEffect( "sfx", "chorus", { "rate": 2, "depth": 10, "mix": 1 } );`,
			"actions": [ { "time": 0, "code": `
				$.sound( { "frequency": 440, "duration": 1.3, "volume": 0.5,
					"oType": "sine" } );` } ]
		} );
		if( !result ) {
			return;
		}

		// A delay of CHORUS_DELAY + depth * sin( 2 pi rate t ) scales the frequency by
		// 1 - 2 pi rate depth cos( 2 pi rate t )
		const expected = 2 * Math.PI * 2 * 0.01 * 440;
		const tracks = [ 0, 1 ].map( index => frequencyTrack(
			channel( result, index ), 0.2, 1.2, 0.02
		) );
		for( const track of tracks ) {
			const swing = ( Math.max( ...track ) - Math.min( ...track ) ) / 2;
			assertNear( swing, expected, expected * 0.15, "pitch swing" );
			const mean = track.reduce( ( sum, value ) => sum + value, 0 ) / track.length;
			assertNear( mean, 440, 3, "center" );
		}
		const correlation = g_metrics.correlation(
			Float32Array.from( tracks[ 0 ] ), Float32Array.from( tracks[ 1 ] ), 0,
			tracks[ 0 ].length
		);
		assert.ok( correlation < -0.9, `left/right correlation ${correlation}` );
	} );

	test( "a chain applies its effects in order; an empty chain keeps the bus volume",
		async t => {
			const ratios = [];
			for( const order of [ [ "filter", "distortion" ], [ "distortion", "filter" ] ] ) {
				const chain = order.map( effect => {
					if( effect === "filter" ) {
						return { "effect": "filter", "cutoff": 400 };
					}
					return { "effect": "distortion", "drive": 0.8 };
				} );
				const result = await suite.inHarness( t, {
					"config": { "duration": 0.6 }
				}, renderEffects, {
					"setup": SETUP + `
						$.setBusEffect( "sfx", ${JSON.stringify( chain )} );`,
					"actions": [ { "time": 0, "code": `
						$.sound( { "frequency": 220, "duration": 0.5, "volume": 0.8,
							"oType": "sine" } );` } ]
				} );
				if( !result ) {
					return;
				}
				const left = channel( result );
				ratios.push(
					toneAmplitude( left, 660, frame( 0.1 ), frame( 0.4 ) ) /
					toneAmplitude( left, 220, frame( 0.1 ), frame( 0.4 ) )
				);
			}

			// Filtering after the distortion attenuates the harmonic it adds, relative to the
			// fundamental, by the filter's response
			const attenuation = biquadMagnitude( "lowpass", 400, 1, 660 ) /
				biquadMagnitude( "lowpass", 400, 1, 220 );
			assert.ok( attenuation < 0.5 );
			assert.ok( ratios[ 1 ] < ratios[ 0 ] * ( attenuation + 0.1 ), `ratios ${ratios}` );

			const result = await suite.inHarness( t, {
				"config": { "duration": 0.4 }
			}, renderEffects, {
				"setup": SETUP + `
					$.setBusEffect( "sfx", [ { "effect": "distortion", "drive": 1 } ] );
					$.setBusVolume( "sfx", 0.5 );
					$.setBusEffect( "sfx", [] );`,
				"actions": [ { "time": 0, "code": `
					$.sound( { "frequency": 440, "duration": 0.3, "volume": 0.8,
						"oType": "sine" } );` } ]
			} );
			if( !result ) {
				return;
			}
			const left = channel( result );
			assertNear( toneAmplitude( left, 440, frame( 0.05 ), frame( 0.25 ) ), 0.4, 0.004,
				"volume" );
			assert.ok( toneAmplitude( left, 1320, frame( 0.05 ), frame( 0.25 ) ) < 1e-4 );
		}
	);

	test( "an in-place update ramps the mix without a click", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 0.8 }, "needsSuspend": true
		}, renderEffects, {
			"setup": SETUP + `
				$.setBusEffect( "sfx", "delay", { "time": 0.5, "feedback": 0, "mix": 0 } );`,
			"actions": [
				{ "time": 0, "code": `
					$.sound( { "frequency": 440, "duration": 0.7, "volume": 0.5,
						"oType": "sine" } );` },
				{ "time": 0.3, "code": `
					values.at = new AudioContext().currentTime;
					$.setBusEffect( "sfx", "delay", { "time": 0.5, "feedback": 0, "mix": 0.5 } );` }
			],
			"carrier": { "type": "sine", "frequency": 440, "start": 256 / 48000 }
		} );
		if( !result ) {
			return;
		}
		const left = channel( result );
		const carrier = g_harness.decodeChannels( [ result.values.carrier ] )[ 0 ];
		const at = result.values.at;

		// The dry share falls from 1 to 0.5 over 20 ms; the echo arrives only after 0.5 s
		const fade = g_metrics.linearFade( at, 0.02 );
		const residual = g_metrics.referenceResidual(
			left, carrier, time => 0.5 * ( 0.5 + 0.5 * fade( time ) ), {
				"sampleRate": RATE, "from": frame( at - 0.05 ), "to": frame( at + 0.1 )
			}
		);
		assert.ok(
			residual.max <= g_tolerances.getTolerance( "stopResidualMax", suite.engine ),
			`max residual ${residual.max}`
		);
		assert.ok(
			residual.rms <= g_tolerances.getTolerance( "stopResidualRms", suite.engine ),
			`rms residual ${residual.rms}`
		);
		assert.equal( result.nodeCounts.createDelay, 1 );
	} );

	test( "an in-place update keeps the reverb tail; a rebuild option cuts it", async t => {
		const tails = [];
		for( const update of [
			[ { "effect": "filter", "cutoff": 8000 }, { "effect": "reverb", "mix": 1 } ],
			[ { "effect": "filter", "cutoff": 20000 }, { "effect": "reverb", "mix": 1,
				"time": 1.5 } ]
		] ) {
			const result = await suite.inHarness( t, {
				"config": { "duration": 1 }, "needsSuspend": true
			}, renderEffects, {
				"setup": SETUP + `
					$.setBusEffect( "sfx", [
						{ "effect": "filter", "cutoff": 20000 }, { "effect": "reverb", "mix": 1 }
					] );`,
				"actions": [
					{ "time": 0, "code": `
						$.sound( { "frequency": 440, "duration": 0.1, "volume": 0.5,
							"oType": "sine" } );` },
					{ "time": 0.4, "code": `
						values.at = new AudioContext().currentTime;
						$.setBusEffect( "sfx", ${JSON.stringify( update )} );` }
				]
			} );
			if( !result ) {
				return;
			}
			const left = channel( result );
			const at = result.values.at;
			tails.push( {
				"before": g_metrics.peak( left, frame( at - 0.1 ), frame( at ) ),
				"after": g_metrics.peak( left, frame( at + 0.05 ), frame( at + 0.25 ) ),
				"convolvers": result.nodeCounts.createConvolver
			} );
		}
		assert.ok( tails[ 0 ].before > 0.001, `tail before ${tails[ 0 ].before}` );
		assert.ok( tails[ 0 ].after > tails[ 0 ].before * 0.1, `kept ${tails[ 0 ].after}` );
		assert.equal( tails[ 0 ].convolvers, 1 );
		assert.ok( tails[ 1 ].before > 0.001, `tail before ${tails[ 1 ].before}` );
		assert.ok( tails[ 1 ].after < g_metrics.SILENCE, `cut ${tails[ 1 ].after}` );
		assert.equal( tails[ 1 ].convolvers, 2 );
	} );

	test( "setBusEffect validates chains and the new effects", async t => {
		const result = await suite.inHarness( t, {}, () => {
			const codeOf = fn => {
				try {
					fn();
				} catch( error ) {
					return error.code;
				}
				return null;
			};
			const filter = { "effect": "filter" };
			return [
				codeOf( () => $.setBusEffect( "sfx", [ filter, filter, filter, filter, filter ] ) ),
				codeOf( () => $.setBusEffect( "sfx", [ "filter" ] ) ),
				codeOf( () => $.setBusEffect( "sfx", [ { "effect": "flanger" } ] ) ),
				codeOf( () => $.setBusEffect( "sfx", [ filter ], { "cutoff": 500 } ) ),
				codeOf( () => $.setBusEffect( "sfx", "filter", { "type": "notch" } ) ),
				codeOf( () => $.setBusEffect( "sfx", "chorus", { "depth": 11 } ) ),
				codeOf( () => $.setBusEffect( "output", [ filter ] ) ),
				codeOf( () => $.setBusEffect( "sfx", [ filter, filter, filter, filter ] ) ),
				codeOf( () => $.setBusEffect( { "bus": "sfx", "effect": [] } ) )
			];
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result, [
			"INVALID_EFFECT", "INVALID_EFFECT", "INVALID_EFFECT", "INVALID_OPTIONS",
			"INVALID_EFFECT_OPTION", "INVALID_EFFECT_OPTION", "INVALID_BUS", null, null
		] );
	} );
}, { "plugins": [ "sound-advanced" ] } );
