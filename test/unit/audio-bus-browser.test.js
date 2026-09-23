/**
 * Offline render tests for the core audio graph: the two-stage limiter, master volume, and
 * the bus-volume service method.
 *
 * Stress renders run with the limiter on and assert the absolute ceiling plus the limiter
 * quality metric (share of samples above the soft clipper knee). Focused level checks bypass
 * the limiter so output is exactly carrier × gain.
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

// Deliberate overloads far beyond normal use (plan 10.2)
const STRESS_CASES = {
	"64-voice chord": () => {
		const types = [ "square", "sawtooth", "triangle", "sine" ];
		for( let i = 0; i < 64; i++ ) {
			$.sound( 110 * Math.pow( 2, ( i % 24 ) / 12 ), 1, 1, types[ i % 4 ] );
		}
	},
	"bass drop": () => {
		for( let i = 0; i < 6; i++ ) {
			$.sound( {
				"frequency": 220 + i, "frequencyEnd": 40, "duration": 1, "oType": "sawtooth",
				"releaseTime": 0.3
			} );
		}
	},
	"SFX burst": () => {
		for( let i = 0; i < 20; i++ ) {
			$.sound( {
				"frequency": 300 + ( i * 37 ) % 900, "duration": 0.05, "volume": 0.6,
				"oType": "square", "delay": i * 0.01, "attackTime": 0.002, "releaseTime": 0.05
			} );
		}
	}
};


g_suite.describeAudioEngines( "sound buses and limiter", suite => {
	const engine = suite.engine;

	for( const name in STRESS_CASES ) {
		test( `the limiter keeps the ${name} within ±1.0`, async t => {
			const result = await suite.inHarness( t, { "config": { "duration": 1.5 } }, code => {
				( new Function( "return " + code ) )()();
				return __audioHarness.render( { "singlePass": true } );
			}, STRESS_CASES[ name ].toString() );
			if( !result ) {
				return;
			}
			const channels = g_harness.decodeRender( result ).channels;
			const knee = g_tolerances.getTolerance( "limiterKneeShare", engine );
			for( const channel of channels ) {
				assert.ok( g_metrics.peak( channel ) <= 1, `peak ${g_metrics.peak( channel )}` );
				const share = g_metrics.kneeShare( channel );
				assert.ok( share <= knee, `knee share ${share} > ${knee}` );
			}
		} );
	}

	test( "the limiter leaves levels below its threshold unchanged", async t => {
		const peaks = {};
		for( const limiter of [ true, false ] ) {
			for( const volume of [ 0.3, 1 ] ) {
				const result = await suite.inHarness( t, { "config": { "duration": 1 } }, arg => {
					$.setSoundLimiter( arg.limiter );
					$.sound( 440, 0.8, arg.volume, "square" );
					return __audioHarness.render( { "singlePass": true } );
				}, { "limiter": limiter, "volume": volume } );
				if( !result ) {
					return;
				}
				const left = g_harness.decodeRender( result ).channels[ 0 ];
				const key = `${limiter}-${volume}`;
				peaks[ key ] = g_metrics.peak( left, frame( 0.3 ), frame( 0.7 ) );
			}
		}

		// A quiet voice passes unchanged; a full-level square loses at most 1.5 dB
		assert.ok( Math.abs( peaks[ "true-0.3" ] / peaks[ "false-0.3" ] - 1 ) < 0.01 );
		const loss = 20 * Math.log10( peaks[ "false-1" ] / peaks[ "true-1" ] );
		assert.ok( loss >= -0.01 && loss <= 1.5, `full-level loss ${loss} dB` );
	} );

	test( "setSoundLimiter( false ) bypasses both stages", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 0.5 } }, () => {
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			$.sound( 440, 0.3, 0.8, "sine" );
			$.sound( 440, 0.3, 0.8, "sine" );
			return __audioHarness.render( { "singlePass": true } );
		} );
		if( !result ) {
			return;
		}
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const peak = g_metrics.peak( left );
		assert.ok( Math.abs( peak - 1.6 ) < 0.01, `peak ${peak}` );
	} );

	for( const kind of [ "sound", "play" ] ) {
		test( `setVolume() sets the master gain for ${kind}() voices`, async t => {
			const result = await suite.inHarness( t, { "config": { "duration": 0.5 } }, kind => {
				$.setSoundLimiter( false );
				$.setVolume( 0.5 );
				if( kind === "sound" ) {
					$.sound( 440, 0.3, 1, "sine" );
				} else {
					$.play( "T120 L8 O5 SINE A" );
				}
				return __audioHarness.render( { "singlePass": true } );
			}, kind );
			if( !result ) {
				return;
			}
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const peak = g_metrics.peak( left );
			assert.ok( Math.abs( peak - 0.5 ) < 0.015, `peak ${peak}` );
		} );
	}

	test( "the limiter does not attenuate the first sound after the context starts",
		async t => {
			const result = await suite.inHarness( t, { "config": { "duration": 0.5 } }, () => {
				$.sound( 440, 0.4, 0.3, "sine" );
				return __audioHarness.render( { "singlePass": true } );
			} );
			if( !result ) {
				return;
			}
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const early = g_metrics.peak( left, frame( LEAD + 0.005 ), frame( 0.03 ) );
			const settled = g_metrics.peak( left, frame( 0.2 ), frame( 0.3 ) );
			const ratio = early / settled;
			assert.ok( Math.abs( ratio - 1 ) < 0.02, `early ${early}, settled ${settled}` );
			assert.ok( Math.abs( settled - 0.225 ) < 0.005, `settled ${settled}` );
		}
	);

	test( "setVolume( 0 ) silences sound and play() voices", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, () => {
			let calledAt = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.sound( 440, 1, 1, "square" );
					$.play( "T60 L1 O4 C" );
				} },
				{ "time": 0.3, "run": () => {
					calledAt = new AudioContext().currentTime;
					$.setVolume( 0 );
				} }
			] } ).then( render => ( { ...render, "calledAt": calledAt } ) );
		} );
		if( !result ) {
			return;
		}
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		assert.ok( g_metrics.peak( left, frame( 0.1 ), frame( 0.3 ) ) > 0.3 );

		// The ~15 ms time constant reaches -80 dB within 0.15 s; the compressor's release
		// lifts its gain as the level falls, so allow 0.25 s with the limiter on
		assert.ok( g_metrics.isSilent( left, frame( result.calledAt + 0.25 ), left.length ) );
	} );

	test( "the bus-volume service ramps one bus over 10 ms from the lead", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, () => {
			let service = null;
			pi.registerPlugin( {
				"name": "sound-service-probe",
				"dependencies": [ "sound" ],
				"init": api => {
					service = api.getService( "sound" );
				}
			} );
			let calledAt = null;
			const errors = [];
			for( const call of [ [ "voices", 1 ], [ "sfx", 2 ] ] ) {
				try {
					service.setBusVolume( ...call );
				} catch( error ) {
					errors.push( error.code );
				}
			}
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					$.sound( { "frequency": 440, "duration": 2, "oType": "sine", "volume": 0.5 } );
				} },
				{ "time": 0.5, "run": () => {
					calledAt = new AudioContext().currentTime;
					service.setBusVolume( "sfx", 0 );
				} }
			] } ).then( async render => ( {
				...render,
				"busErrors": errors,
				"calledAt": calledAt,
				"carrier": await __audioHarness.renderCarrier( {
					"type": "sine", "frequency": 440, "start": 256 / 48000
				} )
			} ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.busErrors, [ "INVALID_BUS", "INVALID_VOLUME" ] );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];
		const rampStart = result.calledAt + LEAD;
		const residual = g_metrics.stopResidual(
			left, carrier, t => 0.5 * g_metrics.linearFade( rampStart, 0.01 )( t ), {
				"sampleRate": RATE, "from": frame( result.calledAt ), "stopEnd": rampStart + 0.01,
				"tail": 0.3
			}
		);
		assert.ok( residual.silentAfter );
		assert.ok( residual.max <= g_tolerances.getTolerance( "stopResidualMax", engine ) );
	} );

	test( "muting the sfx bus leaves music playing", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, () => {
			let service = null;
			pi.registerPlugin( {
				"name": "sound-service-probe",
				"dependencies": [ "sound" ],
				"init": api => {
					service = api.getService( "sound" );
				}
			} );
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.sound( { "frequency": 440, "duration": 2, "oType": "sine", "pan": -1 } );
					$.play( "T60 L1 ML O4 C" );
				} },
				{ "time": 0.3, "run": () => {
					service.setBusVolume( "sfx", 0 );
				} }
			] } );
		} );
		if( !result ) {
			return;
		}
		const [ left, right ] = g_harness.decodeRender( result ).channels;

		// Before muting the panned sfx voice makes the channels differ; afterwards only the
		// unpanned music voice remains, identical on both channels
		let before = 0;
		let after = 0;
		for( let i = frame( 0.1 ); i < frame( 0.25 ); i++ ) {
			before = Math.max( before, Math.abs( left[ i ] - right[ i ] ) );
		}
		for( let i = frame( 0.4 ); i < frame( 0.9 ); i++ ) {
			after = Math.max( after, Math.abs( left[ i ] - right[ i ] ) );
		}
		assert.ok( before > 0.3 );
		assert.ok( after < 1e-6, `channel difference ${after}` );
		assert.ok( g_metrics.peak( right, frame( 0.4 ), frame( 0.9 ) ) > 0.2 );
	} );

	test( "setBusVolume( \"master\" ) matches setVolume()", async t => {
		const renders = [];
		for( const useService of [ true, false ] ) {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.6 }, "needsSuspend": true
			}, useService => {
				let service = null;
				if( useService ) {
					pi.registerPlugin( {
						"name": "sound-service-probe",
						"dependencies": [ "sound" ],
						"init": api => {
							service = api.getService( "sound" );
						}
					} );
				}
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.sound( 440, 1, 1, "sine" );
					} },
					{ "time": 0.2, "run": () => {
						if( useService ) {
							service.setBusVolume( "master", 0.2 );
						} else {
							$.setVolume( 0.2 );
						}
					} }
				] } );
			}, useService );
			if( !result ) {
				return;
			}
			renders.push( g_harness.decodeRender( result ).channels[ 0 ] );
		}
		assert.deepEqual( renders[ 0 ], renders[ 1 ] );
		assert.ok( g_metrics.peak( renders[ 0 ], frame( 0.45 ), frame( 0.55 ) ) < 0.21 );
	} );
} );
