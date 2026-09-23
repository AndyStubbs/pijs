/**
 * Offline render tests for the core sound palette: white and pink noise, the pan law, and
 * the frequencyEnd sweep (sound roadmap Phase 2).
 *
 * Renders bypass the limiter and set the master volume to 1, so output is source × envelope.
 * The pan and sweep expectations are written here from the plan (5, 6.1, 10.2), not from the
 * plugin code.
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

/**
 * Cycles of an exponential sweep between two times: the integral of its frequency.
 *
 * @param {Object} sweep - start, gate, from, and to frequencies
 * @param {number} a - Start time in seconds
 * @param {number} b - End time in seconds
 * @returns {number} Cycles
 */
function sweepCycles( sweep, a, b ) {
	const ratio = sweep.to / sweep.from;
	const gateEnd = sweep.start + sweep.gate;
	function phase( t ) {
		const inGate = Math.min( t, gateEnd ) - sweep.start;
		let cycles = sweep.from * sweep.gate / Math.log( ratio ) *
			Math.pow( ratio, inGate / sweep.gate );
		if( t > gateEnd ) {
			cycles += sweep.to * ( t - gateEnd );
		}
		return cycles;
	}
	return phase( b ) - phase( a );
}

/**
 * Relative error between measured and expected sweep cycles over a window: whole periods
 * between the first and last rising zero crossings against the analytic integral.
 *
 * @returns {number} Relative error
 */
function sweepError( samples, sweep, from, to ) {
	const crossings = g_metrics.risingZeroCrossings( samples, frame( from ), frame( to ) );
	const periods = crossings.length - 1;
	const expected = sweepCycles(
		sweep, crossings[ 0 ] / RATE, crossings[ crossings.length - 1 ] / RATE
	);
	return Math.abs( periods - expected ) / expected;
}

function toDb( ratio ) {
	return 20 * Math.log10( ratio );
}

g_suite.describeAudioEngines( "sound design", suite => {
	const engine = suite.engine;

	for( const oType of [ "white", "pink" ] ) {
		test( `${oType} noise has its spectrum and peak (seeded)`, async t => {
			const result = await suite.inHarness( t, { "config": { "duration": 2 } }, oType => {
				$.setSoundLimiter( false );
				$.setVolume( 1 );
				$.sound( { "duration": 1.8, "volume": 0.6, "oType": oType } );
				return __audioHarness.render( { "singlePass": true } );
			}, oType );
			if( !result ) {
				return;
			}
			const [ left, right ] = g_harness.decodeRender( result ).channels;
			const spectrum = g_metrics.spectrumSlope( left, RATE, frame( 0.05 ), frame( 1.8 ) );
			let expectedSlope = 0;
			if( oType === "pink" ) {
				expectedSlope = -3;
			}
			const slopeError = Math.abs( spectrum.slope - expectedSlope );
			assert.ok(
				slopeError <= g_tolerances.getTolerance( "noiseSlope", engine ),
				`${oType} slope ${spectrum.slope} dB/octave`
			);
			assert.ok(
				spectrum.deviation <= g_tolerances.getTolerance( "noiseBandDeviation", engine ),
				`${oType} band deviation ${spectrum.deviation} dB`
			);
			const peak = g_metrics.peak( left );
			assert.ok( peak <= 0.6 + 1e-6 && peak > 0.3, `${oType} peak ${peak}` );
			assert.deepEqual( left, right );
		} );
	}

	test( "noise buffers are created lazily, once per type", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 0.5 } }, () => {
			$.setSoundLimiter( false );
			$.sound( { "duration": 0.1, "volume": 0.1 } );
			const before = __audioHarness.nodeCounts();
			for( const oType of [ "white", "pink", "white", "pink", "white" ] ) {
				$.sound( { "duration": 0.1, "volume": 0.1, "oType": oType } );
			}
			return __audioHarness.render( { "singlePass": true } ).then( render => ( {
				...render, "before": before
			} ) );
		} );
		if( !result ) {
			return;
		}
		assert.equal( result.before.createBuffer, undefined );
		assert.equal( result.before.createBufferSource, undefined );
		assert.equal( result.nodeCounts.createBuffer, 2 );
		assert.equal( result.nodeCounts.createBufferSource, 5 );
		assert.equal( result.nodeCounts.createOscillator, 1 );
	} );

	test( "noise voices start at random offsets and loop without dropouts", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 3.5 } }, () => {
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			$.sound( { "duration": 3, "oType": "white", "pan": -1 } );
			$.sound( { "duration": 3, "oType": "white", "pan": 1 } );
			return __audioHarness.render( { "singlePass": true } ).then( render => ( {
				...render, "sources": __audioHarness.sources()
			} ) );
		} );
		if( !result ) {
			return;
		}
		const offsets = result.sources.filter(
			source => source.type === "AudioBufferSourceNode"
		).map( source => source.offset );
		assert.equal( offsets.length, 2 );
		assert.ok( offsets.every( offset => offset >= 0 && offset < 2 ), `offsets ${offsets}` );
		assert.notEqual( offsets[ 0 ], offsets[ 1 ] );
		const [ left, right ] = g_harness.decodeRender( result ).channels;
		const correlation = g_metrics.correlation( left, right, frame( 0.1 ), frame( 2.9 ) );
		assert.ok( Math.abs( correlation ) < 0.1, `correlation ${correlation}` );

		// Each voice wraps its 2 s buffer mid-sound; 10 ms windows stay near the mean level
		for( const channel of [ left, right ] ) {
			const windows = g_metrics.rmsWindows( channel, frame( 0.01 ), frame( 0.1 ),
				frame( 2.9 ) );
			const mean = windows.reduce( ( a, b ) => a + b, 0 ) / windows.length;
			const low = Math.min( ...windows );
			const high = Math.max( ...windows );
			assert.ok( low > mean * 0.8 && high < mean * 1.2, `window range ${low}-${high}` );
		}
	} );

	test( "noise ignores frequency and frequencyEnd (D1)", async t => {
		const renders = [];
		for( const call of [
			{ "frequency": 100 },
			{ "frequency": 2000, "frequencyEnd": 50 }
		] ) {
			const result = await suite.inHarness( t, { "config": { "duration": 0.5 } }, call => {
				$.setSoundLimiter( false );
				$.sound( { ...call, "duration": 0.3, "oType": "white" } );
				return __audioHarness.render( { "singlePass": true } );
			}, call );
			if( !result ) {
				return;
			}
			renders.push( g_harness.decodeRender( result ).channels[ 0 ] );
		}
		assert.ok( g_metrics.peak( renders[ 0 ] ) > 0.1 );
		assert.deepEqual( renders[ 0 ], renders[ 1 ] );
	} );

	test( "panned voices follow the equal-power ratio with the louder channel at volume",
		async t => {
			const measured = [];
			for( const pan of [ -1, -0.5, -0.25, 0, 0.25, 0.5, 1 ] ) {
				const result = await suite.inHarness( t, { "config": { "duration": 0.4 } },
					pan => {
						$.setSoundLimiter( false );
						$.setVolume( 1 );
						$.sound( {
							"frequency": 440, "duration": 0.3, "volume": 0.5, "oType": "sine",
							"pan": pan
						} );
						return __audioHarness.render( { "singlePass": true } );
					}, pan );
				if( !result ) {
					return;
				}
				const [ left, right ] = g_harness.decodeRender( result ).channels;
				measured.push( {
					"pan": pan,
					"panners": result.nodeCounts.createStereoPanner || 0,
					"left": left,
					"right": right,
					"leftRms": g_metrics.rms( left, frame( 0.05 ), frame( 0.25 ) ),
					"rightRms": g_metrics.rms( right, frame( 0.05 ), frame( 0.25 ) )
				} );
			}
			const center = measured.find( entry => entry.pan === 0 );
			assert.equal( center.panners, 0 );
			assert.deepEqual( center.left, center.right );
			const level = center.leftRms;
			assert.ok( Math.abs( level - 0.5 / Math.SQRT2 ) < 1e-3, `center level ${level}` );
			for( const entry of measured ) {
				const louder = Math.max( entry.leftRms, entry.rightRms );
				assert.ok(
					Math.abs( louder - level ) / level < 0.005,
					`pan ${entry.pan}: louder channel ${louder} vs ${level}`
				);
				if( entry.pan === 0 ) {
					continue;
				}
				assert.equal( entry.panners, 1 );
				const angle = ( entry.pan + 1 ) * Math.PI / 4;
				if( entry.pan === -1 ) {
					assert.ok( g_metrics.isSilent( entry.right ) );
				} else if( entry.pan === 1 ) {
					assert.ok( g_metrics.isSilent( entry.left ) );
				} else {
					const error = Math.abs(
						toDb( entry.rightRms / entry.leftRms ) - toDb( Math.tan( angle ) )
					);
					assert.ok( error < 0.1, `pan ${entry.pan}: ratio off by ${error} dB` );
				}
			}
		}
	);

	for( const [ from, to ] of [ [ 200, 800 ], [ 800, 200 ] ] ) {
		test( `a ${from} to ${to} Hz sweep follows the exponential curve`, async t => {
			const call = {
				"frequency": from, "frequencyEnd": to, "duration": 0.6, "oType": "sine",
				"releaseTime": 0.3
			};
			const result = await suite.inHarness( t, { "config": { "duration": 1 } }, call => {
				$.setSoundLimiter( false );
				$.setVolume( 1 );
				$.sound( call );
				return __audioHarness.render( { "singlePass": true } );
			}, call );
			if( !result ) {
				return;
			}
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const sweep = { "start": LEAD, "gate": 0.6, "from": from, "to": to };
			const windows = {
				"start": [ LEAD + 0.005, LEAD + 0.045 ],
				"middle": [ LEAD + 0.28, LEAD + 0.32 ],
				"end": [ LEAD + 0.555, LEAD + 0.595 ],
				"release": [ LEAD + 0.61, LEAD + 0.68 ]
			};
			for( const name in windows ) {
				const [ begin, end ] = windows[ name ];
				const error = sweepError( left, sweep, begin, end );
				assert.ok( error < 0.005, `${name}: ${( error * 100 ).toFixed( 3 )}%` );
			}
		} );
	}

	test( "a late-started sweep begins at its timeline frequency", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, () => {
			const release = 0.32;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					$.sound( {
						"frequency": 200, "frequencyEnd": 800, "duration": 0.5, "oType": "sine",
						"delay": release - 0.015
					} );
					__audioHarness.holdTimers( true );
				} },
				{ "time": release, "run": () => {
					__audioHarness.holdTimers( false );
					__audioHarness.advance( 0 );
				} }
			] } ).then( render => ( { ...render, "sources": __audioHarness.sources() } ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const voice = result.sources.find( source => source.type === "OscillatorNode" &&
			source.startTime > 0 );
		const start = 0.32 - 0.015;
		assert.ok( voice.startTime > start + 0.01, `start ${voice.startTime}` );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const sweep = { "start": start, "gate": 0.5, "from": 200, "to": 800 };
		const error = sweepError( left, sweep, voice.startTime + 0.004, voice.startTime + 0.044 );
		assert.ok( error < 0.005, `late start: ${( error * 100 ).toFixed( 3 )}%` );
	} );
} );
