/**
 * Offline render tests for synthesized voices: the ADSR envelope, the de-click floor, the
 * single stop path, voice stealing, the slot and live-voice caps, pending requests, the
 * late-start rule, the interim PLAY exemption, and the locked-context policy. Pan, sweep,
 * and noise spectra are covered in audio-sound-design-browser.test.js.
 *
 * Focused residual checks bypass the limiter and set the master volume to 1, so output is
 * carrier × envelope. Carriers come from a separate offline render in the same engine, and
 * the expected envelopes are built here, independently of plugins/sound/envelope.js.
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
const STOP_FADE = g_suite.STOP_FADE;
const MIN_RAMP = g_suite.MIN_RAMP;
const QUANTUM = 128 / RATE;
const LN_10000 = Math.log( 10000 );

/**
 * Expected ADSR gain, written from the plan (6.1, 6.2) rather than from envelope.js.
 *
 * @param {Object} spec - start, duration, attackTime, decayTime, sustainLevel, releaseTime,
 * peak
 * @returns {Function} gain( t )
 */
function expectedAdsr( spec ) {
	const attack = Math.max( spec.attackTime || 0, MIN_RAMP );
	const decay = Math.max( spec.decayTime || 0, MIN_RAMP );
	const release = Math.max( spec.releaseTime ?? 0.1, MIN_RAMP );
	const sustain = spec.peak * ( spec.sustainLevel ?? 1 );
	function held( u ) {
		if( u < attack ) {
			return spec.peak * u / attack;
		}
		return sustain + ( spec.peak - sustain ) * Math.exp( -( u - attack ) * LN_10000 / decay );
	}
	return t => {
		const u = t - spec.start;
		if( u <= 0 || u >= spec.duration + release ) {
			return 0;
		}
		if( u <= spec.duration ) {
			return held( u );
		}
		return held( spec.duration ) * Math.exp( -( u - spec.duration ) * LN_10000 / release );
	};
}

/**
 * Envelope cut by a stop fade: the envelope value at the fade start, falling linearly to 0.
 *
 * @param {Function} envelope - gain( t ) before the stop
 * @param {number} fadeStart - Fade start in seconds
 * @returns {Function} gain( t )
 */
function withStop( envelope, fadeStart ) {
	const held = envelope( fadeStart );
	return t => {
		if( t < fadeStart ) {
			return envelope( t );
		}
		return held * Math.max( 0, 1 - ( t - fadeStart ) / STOP_FADE );
	};
}

/**
 * Sum of carrier × envelope references for several voices.
 *
 * @param {Array<[Float32Array, Function]>} parts - Carrier and envelope per voice
 * @param {number} length - Frames
 * @returns {Float32Array} Expected samples
 */
function mixReference( parts, length ) {
	const reference = new Float32Array( length );
	for( const [ carrier, envelope ] of parts ) {
		for( let i = 0; i < length; i++ ) {
			reference[ i ] += carrier[ i ] * envelope( i / RATE );
		}
	}
	return reference;
}

function assertResidual( residual, engine, kind, label ) {
	const max = g_tolerances.getTolerance( kind + "ResidualMax", engine );
	const rms = g_tolerances.getTolerance( kind + "ResidualRms", engine );
	assert.ok( residual.max <= max, `${label}: max residual ${residual.max} > ${max}` );
	assert.ok( residual.rms <= rms, `${label}: rms residual ${residual.rms} > ${rms}` );
}

/**
 * Largest number of oscillator sources sounding at once. An early-stopped source's interval
 * ends where its stop fade begins, since the slot is released at the steal or stop time.
 *
 * @param {Array<Object>} sources - Harness source entries
 * @returns {number} Peak overlap
 */
function peakSlotOverlap( sources ) {
	const edges = [];
	for( const source of sources ) {
		let end = source.stopTime;
		if( source.stopCalls > 1 ) {
			end -= STOP_FADE;
		}
		if( end > source.startTime ) {
			edges.push( [ source.startTime, 1 ], [ end, -1 ] );
		}
	}
	edges.sort( ( a, b ) => a[ 0 ] - b[ 0 ] || a[ 1 ] - b[ 1 ] );
	let count = 0;
	let peak = 0;
	for( const edge of edges ) {
		count += edge[ 1 ];
		peak = Math.max( peak, count );
	}
	return peak;
}

function voiceSources( sources ) {
	return sources.filter(
		source => source.type === "OscillatorNode" && source.startTime !== null &&
			source.startTime > 0
	);
}

g_suite.describeAudioEngines( "sound voices", suite => {
	const engine = suite.engine;

	test( "sound() validates its parameters", async t => {
		const codes = await suite.inHarness( t, { "needsWebAudio": false }, () => {
			const calls = [
				{ "duration": -1 },
				{ "volume": 2 },
				{ "delay": -1 },
				{ "attackTime": -1 },
				{ "decayTime": -1 },
				{ "sustainLevel": 1.5 },
				{ "releaseTime": -1 },
				{ "pan": 2 },
				{ "frequencyEnd": 0 },
				{ "frequency": 0, "frequencyEnd": 100 },
				{ "frequency": 440, "frequencyEnd": "x" },
				{ "oType": "noise" }
			];
			const result = calls.map( call => {
				try {
					$.sound( { "frequency": 440, ...call } );
					return "none";
				} catch( error ) {
					return error.code;
				}
			} );
			for( const call of [ () => $.setVolume( -0.5 ), () => $.setSoundLimiter( "on" ) ] ) {
				try {
					call();
					result.push( "none" );
				} catch( error ) {
					result.push( error.code );
				}
			}
			return result;
		} );
		assert.deepEqual( codes, [
			"INVALID_DURATION", "INVALID_VOLUME", "INVALID_DELAY", "INVALID_ATTACK_TIME",
			"INVALID_DECAY_TIME", "INVALID_SUSTAIN_LEVEL", "INVALID_RELEASE_TIME", "INVALID_PAN",
			"INVALID_FREQUENCY", "INVALID_FREQUENCY", "INVALID_FREQUENCY", "INVALID_OTYPE",
			"INVALID_VOLUME", "INVALID_ENABLED"
		] );
	} );

	test( "envelope stages follow the analytic ADSR timing", async t => {
		const spec = {
			"frequency": 1000, "duration": 0.4, "volume": 1, "oType": "sine",
			"attackTime": 0.05, "decayTime": 0.1, "sustainLevel": 0.5, "releaseTime": 0.2
		};
		const result = await suite.inHarness( t, { "config": { "duration": 1 } }, spec => {
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			$.sound( spec );
			return __audioHarness.render( { "singlePass": true } ).then( async render => ( {
				...render,
				"carrier": await __audioHarness.renderCarrier( {
					"type": "sine", "frequency": 1000, "start": 256 / 48000
				} )
			} ) );
		}, spec );
		if( !result ) {
			return;
		}
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];

		// Gain estimate from samples where the carrier is far from zero
		function crossing( from, level, falling ) {
			for( let i = frame( from ); i < left.length; i++ ) {
				if( Math.abs( carrier[ i ] ) < 0.5 ) {
					continue;
				}
				const gain = left[ i ] / carrier[ i ];
				if( ( falling && gain <= level ) || ( !falling && gain >= level ) ) {
					return i / RATE;
				}
			}
			return Infinity;
		}
		const gateValue = 0.5 + 0.5 * Math.exp( -0.35 * LN_10000 / 0.1 );
		const expected = {
			"attack": LEAD + 0.025,
			"decay": LEAD + 0.05 + 0.1 * Math.log( 2 ) / LN_10000,
			"release": LEAD + 0.4 + 0.2 * Math.log( gateValue / 0.1 ) / LN_10000
		};
		const measured = {
			"attack": crossing( 0, 0.5, false ),
			"decay": crossing( LEAD + 0.05, 0.75, true ),
			"release": crossing( LEAD + 0.4, 0.1, true )
		};
		const tolerance = g_tolerances.getTolerance( "envelopeTiming", engine );
		for( const stage in expected ) {
			const error = Math.abs( measured[ stage ] - expected[ stage ] );
			assert.ok( error <= tolerance, `${stage}: off by ${error} s` );
		}
		assert.ok( g_metrics.isSilent( left, frame( LEAD + 0.6 ) + 1, left.length ) );
	} );

	for( const oType of [ "sine", "square", "sawtooth" ] ) {
		test( `a zero-attack ${oType} onset uses the 3 ms floor`, async t => {
			const result = await suite.inHarness( t, { "config": { "duration": 0.5 } }, oType => {
				$.setSoundLimiter( false );
				$.setVolume( 1 );
				$.sound( { "frequency": 440, "duration": 0.3, "oType": oType, "volume": 0.8 } );
				return __audioHarness.render( { "singlePass": true } ).then( async render => ( {
					...render,
					"carrier": await __audioHarness.renderCarrier( {
						"type": oType, "frequency": 440, "start": 256 / 48000
					} )
				} ) );
			}, oType );
			if( !result ) {
				return;
			}
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];
			const onset = g_metrics.linearOnset( LEAD, MIN_RAMP );
			const residual = g_metrics.onsetResidual( left, carrier, t => 0.8 * onset( t ), {
				"sampleRate": RATE, "onset": LEAD, "to": frame( LEAD + 0.05 ), "lead": 0.005
			} );
			assert.ok( residual.silentBefore );
			assertResidual( residual, engine, "onset", oType );
		} );
	}

	for( const oType of [ "sine", "square", "sawtooth" ] ) {
		test( `stopSound() fades a ${oType} voice from the scheduling lead`, async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 1 }, "needsSuspend": true
			}, oType => {
				let id = null;
				let stoppedAt = null;
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.setVolume( 1 );
						id = $.sound( { "frequency": 440, "duration": 2, "oType": oType } );
					} },
					{ "time": 0.5, "run": () => {
						stoppedAt = new AudioContext().currentTime;
						$.stopSound( id );
					} }
				] } ).then( async render => ( {
					...render,
					"stoppedAt": stoppedAt,
					"sources": __audioHarness.sources(),
					"carrier": await __audioHarness.renderCarrier( {
						"type": oType, "frequency": 440, "start": 256 / 48000
					} )
				} ) );
			}, oType );
			if( !result ) {
				return;
			}
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];
			const fadeStart = result.stoppedAt + LEAD;
			const residual = g_metrics.stopResidual(
				left, carrier, g_metrics.linearFade( fadeStart, STOP_FADE ), {
					"sampleRate": RATE, "from": frame( result.stoppedAt ),
					"stopEnd": fadeStart + STOP_FADE, "tail": 0.05
				}
			);
			assert.ok( residual.silentAfter );
			assertResidual( residual, engine, "stop", oType );
			const voice = voiceSources( result.sources )[ 0 ];
			assert.equal( voice.disconnectCalls, 1 );
		} );
	}

	// Noise carriers replay the voice's own recorded buffer source: same buffer, loop, start
	// time, and random offset
	for( const oType of [ "white", "pink" ] ) {
		test( `${oType} noise onset and release match the reference envelope`, async t => {
			const spec = {
				"duration": 0.3, "oType": oType, "volume": 0.8, "releaseTime": 0.1
			};
			const result = await suite.inHarness( t, { "config": { "duration": 0.6 } }, spec => {
				$.setSoundLimiter( false );
				$.setVolume( 1 );
				$.sound( spec );
				return __audioHarness.render( { "singlePass": true } ).then( async render => {
					const source = __audioHarness.sources().find(
						entry => entry.type === "AudioBufferSourceNode"
					);
					return {
						...render,
						"source": source,
						"carrier": await __audioHarness.renderCarrier( { "sourceId": source.id } )
					};
				} );
			}, spec );
			if( !result ) {
				return;
			}
			assert.ok( result.source.offset >= 0 && result.source.offset < 2 );
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];
			const onset = g_metrics.linearOnset( LEAD, MIN_RAMP );
			const onsetCheck = g_metrics.onsetResidual( left, carrier, t => 0.8 * onset( t ), {
				"sampleRate": RATE, "onset": LEAD, "to": frame( LEAD + 0.05 ), "lead": 0.005
			} );
			assert.ok( onsetCheck.silentBefore );
			assertResidual( onsetCheck, engine, "onset", oType + " onset" );
			// The release ends with gain set to exactly 0 from 80 dB down; the comparison stops
			// just before that sample, and the silence check covers what follows
			const envelope = expectedAdsr( { ...spec, "start": LEAD, "peak": 0.8 } );
			const release = g_metrics.referenceResidual( left, carrier, envelope, {
				"sampleRate": RATE, "from": frame( LEAD + 0.25 ), "to": frame( LEAD + 0.399 )
			} );
			assertResidual( release, engine, "stop", oType + " release" );
			assert.ok( g_metrics.isSilent( left, frame( LEAD + 0.4 ) + 1, left.length ) );
		} );

		test( `stopSound() fades ${oType} noise from the scheduling lead`, async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 1 }, "needsSuspend": true
			}, oType => {
				let id = null;
				let stoppedAt = null;
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.setVolume( 1 );
						id = $.sound( { "duration": 2, "oType": oType } );
					} },
					{ "time": 0.5, "run": () => {
						stoppedAt = new AudioContext().currentTime;
						$.stopSound( id );
					} }
				] } ).then( async render => {
					const source = __audioHarness.sources().find(
						entry => entry.type === "AudioBufferSourceNode"
					);
					return {
						...render,
						"stoppedAt": stoppedAt,
						"source": source,
						"carrier": await __audioHarness.renderCarrier( { "sourceId": source.id } )
					};
				} );
			}, oType );
			if( !result ) {
				return;
			}
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];
			const fadeStart = result.stoppedAt + LEAD;
			const residual = g_metrics.stopResidual(
				left, carrier, g_metrics.linearFade( fadeStart, STOP_FADE ), {
					"sampleRate": RATE, "from": frame( result.stoppedAt ),
					"stopEnd": fadeStart + STOP_FADE, "tail": 0.05
				}
			);
			assert.ok( residual.silentAfter );
			assertResidual( residual, engine, "stop", oType );
			assert.equal( result.source.disconnectCalls, 1 );
		} );
	}

	test( "stopPlay() fades a sounding note from its current envelope value", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.5 }, "needsSuspend": true
		}, () => {
			let trackId = null;
			let stoppedAt = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					trackId = $.play( "T60 L1 ML O4 A" );
				} },
				{ "time": 1, "run": () => {
					stoppedAt = new AudioContext().currentTime;
					$.stopPlay( trackId );
				} }
			] } ).then( async render => ( {
				...render,
				"stoppedAt": stoppedAt,
				"carrier": await __audioHarness.renderCarrier( {
					"type": "triangle", "frequency": 440, "start": 256 / 48000
				} )
			} ) );
		} );
		if( !result ) {
			return;
		}
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];

		// T60 L1 ML: a 4 s note interval; the 2.2 rates map to attack 0.6 s, a 2.6 s decay to
		// 0.8, and a 0.8 s release
		const envelope = expectedAdsr( {
			"start": LEAD, "duration": 3.2, "attackTime": 0.6, "decayTime": 2.6,
			"sustainLevel": 0.8, "releaseTime": 0.8, "peak": 1
		} );
		const fadeStart = result.stoppedAt + LEAD;
		const residual = g_metrics.stopResidual( left, carrier, withStop( envelope, fadeStart ), {
			"sampleRate": RATE, "from": frame( 0.8 ), "stopEnd": fadeStart + STOP_FADE,
			"tail": 0.2
		} );
		assert.ok( residual.silentAfter );
		assertResidual( residual, engine, "stop", "stopPlay" );
	} );

	for( const delay of [ 0, 0.1 ] ) {
		const label = delay === 0 ? "an immediate" : "a future";
		test( `${label} steal fades the oldest voice while the new voice starts`, async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 1 }, "needsSuspend": true
			}, delay => {
				let requestedAt = null;
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.setVolume( 1 );
						$.sound( {
							"frequency": 440, "duration": 3, "oType": "sine", "volume": 0.5
						} );

						// Silent slot holders fill the remaining 63 slots
						for( let i = 0; i < 63; i++ ) {
							$.sound( { "frequency": 100 + i, "duration": 3, "volume": 0 } );
						}
					} },
					{ "time": 0.5, "run": () => {
						requestedAt = new AudioContext().currentTime;
						$.sound( {
							"frequency": 660, "duration": 1, "oType": "sine", "volume": 0.5,
							"delay": delay
						} );
					} }
				] } ).then( async render => ( {
					...render,
					"requestedAt": requestedAt,
					"sources": __audioHarness.sources(),
					"victim": await __audioHarness.renderCarrier( {
						"type": "sine", "frequency": 440, "start": 256 / 48000
					} ),
					"incoming": await __audioHarness.renderCarrier( {
						"type": "sine", "frequency": 660,
						"start": Math.max( requestedAt + delay, requestedAt + 256 / 48000 )
					} )
				} ) );
			}, delay );
			if( !result ) {
				return;
			}
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const [ victim, incoming ] = g_harness.decodeChannels(
				[ result.victim, result.incoming ]
			);
			const incomingStart = Math.max( result.requestedAt + delay, result.requestedAt + LEAD );

			// The conflict time is the incoming start; the fade ends there when it can
			const fadeStart = Math.max( result.requestedAt + LEAD, incomingStart - STOP_FADE );
			const reference = mixReference( [
				[ victim, t => 0.5 * withStop( () => 1, fadeStart )( t ) ],
				[ incoming, t => 0.5 * g_metrics.linearOnset( incomingStart, MIN_RAMP )( t ) ]
			], left.length );
			const residual = g_metrics.referenceResidual( left, reference, () => 1, {
				"sampleRate": RATE, "from": frame( result.requestedAt ),
				"to": frame( incomingStart + 0.2 )
			} );
			assertResidual( residual, engine, "stop", `${label} steal` );
			const victimSource = voiceSources( result.sources )[ 0 ];
			assert.ok( Math.abs( victimSource.stopTime - ( fadeStart + STOP_FADE ) ) < 1e-9 );
			assert.equal( victimSource.disconnectCalls, 1 );
		} );
	}

	test( "an explicit stop during a future-steal wait brings the fade forward", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, () => {
			let victimId = null;
			let requestedAt = null;
			let stoppedAt = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					victimId = $.sound( {
						"frequency": 440, "duration": 3, "oType": "sine", "volume": 0.5
					} );
					for( let i = 0; i < 63; i++ ) {
						$.sound( { "frequency": 100 + i, "duration": 3, "volume": 0 } );
					}
				} },
				{ "time": 0.5, "run": () => {
					requestedAt = new AudioContext().currentTime;
					$.sound( {
						"frequency": 660, "duration": 1, "oType": "sine", "volume": 0.5,
						"delay": 0.15
					} );
				} },
				{ "time": 0.55, "run": () => {
					stoppedAt = new AudioContext().currentTime;
					$.stopSound( victimId );
				} }
			] } ).then( async render => ( {
				...render,
				"requestedAt": requestedAt,
				"stoppedAt": stoppedAt,
				"sources": __audioHarness.sources(),
				"victim": await __audioHarness.renderCarrier( {
					"type": "sine", "frequency": 440, "start": 256 / 48000
				} ),
				"incoming": await __audioHarness.renderCarrier( {
					"type": "sine", "frequency": 660, "start": requestedAt + 0.15
				} )
			} ) );
		} );
		if( !result ) {
			return;
		}
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const [ victim, incoming ] = g_harness.decodeChannels( [ result.victim, result.incoming ] );
		const incomingStart = result.requestedAt + 0.15;
		const fadeStart = result.stoppedAt + LEAD;
		assert.ok( fadeStart + STOP_FADE < incomingStart - STOP_FADE );
		const reference = mixReference( [
			[ victim, t => 0.5 * withStop( () => 1, fadeStart )( t ) ],
			[ incoming, t => 0.5 * g_metrics.linearOnset( incomingStart, MIN_RAMP )( t ) ]
		], left.length );
		const residual = g_metrics.referenceResidual( left, reference, () => 1, {
			"sampleRate": RATE, "from": frame( result.requestedAt ),
			"to": frame( incomingStart + 0.1 )
		} );
		assertResidual( residual, engine, "stop", "explicit stop while retiring" );
		assert.ok( g_metrics.isSilent(
			left, frame( fadeStart + STOP_FADE ) + 1, frame( incomingStart ) - 1
		) );
		const victimSource = voiceSources( result.sources )[ 0 ];
		assert.equal( victimSource.stopCalls, 3 );
		assert.equal( victimSource.disconnectCalls, 1 );
	} );

	test( "repeated earlier stops keep continuity and dispose once", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, () => {
			let service = null;
			pi.registerPlugin( {
				"name": "sound-service-probe",
				"dependencies": [ "sound" ],
				"init": api => {
					service = api.getService( "sound" );
				}
			} );
			let id = null;
			let stoppedAt = null;
			const now = () => new AudioContext().currentTime;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					id = $.sound( { "frequency": 440, "duration": 3, "oType": "square" } );
				} },
				{ "time": 0.3, "run": () => {
					service.stopVoice( id, now() + 0.6 );
				} },
				{ "time": 0.4, "run": () => {
					service.stopVoice( id, now() + 0.4 );
				} },
				{ "time": 0.5, "run": () => {
					stoppedAt = now();
					$.stopSound( id );
				} },
				{ "time": 0.6, "run": () => {
					$.stopSound( id );
					service.stopVoice( id, now() + 0.5 );
				} }
			] } ).then( async render => ( {
				...render,
				"version": service.version,
				"stoppedAt": stoppedAt,
				"sources": __audioHarness.sources(),
				"carrier": await __audioHarness.renderCarrier( {
					"type": "square", "frequency": 440, "start": 256 / 48000
				} )
			} ) );
		} );
		if( !result ) {
			return;
		}
		assert.equal( result.version, 1 );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];
		const fadeStart = result.stoppedAt + LEAD;
		const residual = g_metrics.stopResidual(
			left, carrier, g_metrics.linearFade( fadeStart, STOP_FADE ), {
				"sampleRate": RATE, "from": frame( 0.2 ), "stopEnd": fadeStart + STOP_FADE,
				"tail": 0.3
			}
		);
		assert.ok( residual.silentAfter );
		assertResidual( residual, engine, "stop", "repeated stops" );
		const voice = voiceSources( result.sources )[ 0 ];
		assert.equal( voice.stopCalls, 4 );
		assert.equal( voice.disconnectCalls, 1 );
	} );

	test( "immediate automation lands at least two render quanta ahead", async t => {
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
			let probes = null;
			let ids = [];
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					ids = [ $.sound( 440, 2 ), $.sound( 550, 2 ) ];
					$.play( "T60 L1 ML O4 C" );
				} },
				{ "time": 0.5, "run": () => {
					calledAt = new AudioContext().currentTime;
					__audioHarness.clearProbes();
					$.stopSound( ids[ 0 ] );
					$.setVolume( 0.5 );
					service.setBusVolume( "sfx", 0.5 );
					service.setBusVolume( "sfx", 0.25 );
					service.setBusVolume( "music", 0.5 );
					service.setBusVolume( "master", 0.4 );
					$.stopPlay( null );
					$.stopSound( null );
					probes = __audioHarness.probes();
				} }
			] } ).then( render => ( { ...render, "calledAt": calledAt, "probes": probes } ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const methods = new Set( result.probes.map( probe => probe.method ) );
		for( const method of [
			"cancelScheduledValues", "setValueAtTime", "linearRampToValueAtTime",
			"setTargetAtTime", "stop"
		] ) {
			assert.ok( methods.has( method ), `no ${method} call recorded` );
		}
		for( const probe of result.probes ) {
			assert.equal( probe.contextTime, result.calledAt );
			assert.ok(
				probe.time >= probe.contextTime + 2 * QUANTUM - 1e-9,
				`${probe.method} at ${probe.time} for context time ${probe.contextTime}`
			);
		}
	} );

	test( "a flood of delayed sound() calls stays within the voice caps", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 3 }, "needsSuspend": true
		}, () => {
			let maxLive = 0;
			let overflowCode = null;
			const ids = [];
			return __audioHarness.render( {
				"actions": [ { "time": 0, "run": () => {
					for( let i = 0; i < 1024; i++ ) {
						ids.push( $.sound( {
							"frequency": 200 + ( i % 500 ), "duration": 0.3, "volume": 0.01,
							"oType": "sine", "delay": 0.25 + ( i % 200 ) * 0.01
						} ) );
					}
					try {
						$.sound( { "frequency": 300, "delay": 1 } );
					} catch( error ) {
						overflowCode = error.code;
					}
				} } ],
				"onStep": () => {
					maxLive = Math.max( maxLive, __audioHarness.liveSources() );
				}
			} ).then( render => ( {
				...render,
				"maxLive": maxLive,
				"overflowCode": overflowCode,
				"ids": new Set( ids ).size,
				"sources": __audioHarness.sources()
			} ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		assert.equal( result.overflowCode, "TOO_MANY_PENDING_SOUNDS" );
		assert.equal( result.ids, 1024 );
		assert.ok( result.maxLive <= 128, `live voices peaked at ${result.maxLive}` );
		const voices = voiceSources( result.sources );
		assert.ok( voices.length > 128, `only ${voices.length} voices admitted` );
		const overlap = peakSlotOverlap( voices );
		assert.ok( overlap <= 64, `slot holders peaked at ${overlap}` );
		assert.equal( overlap, 64 );
	} );

	test( "the live-voice cap frees the oldest audible retiring voice first", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, () => {
			let liveAfter = [];
			let calledAt = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					for( let i = 0; i < 64; i++ ) {
						$.sound( { "frequency": 200 + i, "duration": 3, "volume": 0.01 } );
					}
				} },
				{ "time": 0.5, "run": () => {
					calledAt = new AudioContext().currentTime;

					// Future voices steal every active voice, which retire until the start
					for( let i = 0; i < 64; i++ ) {
						$.sound( {
							"frequency": 400 + i, "duration": 1, "volume": 0.01, "delay": 0.15
						} );
					}
					liveAfter.push( __audioHarness.liveSources() );
					$.sound( { "frequency": 900, "duration": 1, "volume": 0.01 } );
					liveAfter.push( __audioHarness.liveSources() );
				} }
			] } ).then( render => ( {
				...render,
				"calledAt": calledAt,
				"liveAfter": liveAfter,
				"sources": __audioHarness.sources()
			} ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		assert.deepEqual( result.liveAfter, [ 128, 127 ] );
		const voices = voiceSources( result.sources );

		// The first voice was hard-stopped at the call; the other 63 fade at the conflict time
		assert.equal( voices[ 0 ].disconnectedAt, result.calledAt );
		assert.equal( voices[ 0 ].stopTime, result.calledAt );
		const conflict = result.calledAt + 0.15;
		for( let i = 1; i < 64; i++ ) {
			assert.ok( Math.abs( voices[ i ].stopTime - conflict ) < 1e-9 );
		}

		// The first future voice was cancelled without sounding to admit the immediate one
		assert.ok( voices[ 64 ].stopTime < voices[ 64 ].startTime );
		assert.ok( peakSlotOverlap( voices ) <= 64 );
	} );

	test( "a long voice is not stolen for voices it does not overlap", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, () => {
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.sound( { "frequency": 220, "duration": 3, "volume": 0.01 } );
					for( let i = 0; i < 63; i++ ) {
						$.sound( {
							"frequency": 300 + i, "duration": 0.05, "volume": 0.01,
							"releaseTime": 0.01
						} );
					}
				} },
				{ "time": 0.5, "run": () => {
					$.sound( { "frequency": 500, "duration": 0.2, "volume": 0.01 } );
				} }
			] } ).then( render => ( { ...render, "sources": __audioHarness.sources() } ) );
		} );
		if( !result ) {
			return;
		}
		const voices = voiceSources( result.sources );
		assert.equal( voices.length, 65 );
		assert.equal( voices[ 0 ].stopCalls, 1 );
	} );

	test( "late requests expire, start within grace, or are skipped", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, () => {
			const release = 0.32;
			const ids = {};
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					ids.grace = $.sound( {
						"frequency": 1000, "duration": 0.5, "oType": "sine", "volume": 0.5,
						"attackTime": 0.05, "delay": release - 0.015
					} );
					ids.skipped = $.sound( {
						"frequency": 700, "duration": 0.5, "delay": release - 0.05
					} );
					ids.expired = $.sound( {
						"frequency": 800, "duration": 0, "releaseTime": 0, "delay": release - 0.02
					} );
					ids.future = $.sound( {
						"frequency": 500, "duration": 0.1, "volume": 0.5, "delay": release + 0.5
					} );
					__audioHarness.holdTimers( true );
				} },
				{ "time": release, "run": () => {
					__audioHarness.holdTimers( false );
					__audioHarness.advance( 0 );
				} },
				{ "time": release + 0.1, "run": () => {
					$.stopSound( ids.skipped );
					$.stopSound( ids.expired );
				} }
			] } ).then( async render => ( {
				...render,
				"sources": __audioHarness.sources(),
				"carrier": await __audioHarness.renderCarrier( {
					"type": "sine", "frequency": 1000, "start": release + 256 / 48000
				} )
			} ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const release = 0.32;
		const voices = voiceSources( result.sources );
		assert.deepEqual(
			voices.map( voice => voice.startTime.toFixed( 6 ) ),
			[ ( release + LEAD ).toFixed( 6 ), ( release + 0.5 ).toFixed( 6 ) ]
		);

		// The grace voice resumes its envelope at its timeline position under an onset fade
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];
		const begin = release + LEAD;
		const envelope = expectedAdsr( {
			"start": release - 0.015, "duration": 0.5, "attackTime": 0.05, "peak": 0.5
		} );
		const onset = g_metrics.linearOnset( begin, MIN_RAMP );
		const residual = g_metrics.onsetResidual( left, carrier, t => onset( t ) * envelope( t ), {
			"sampleRate": RATE, "onset": begin, "to": frame( begin + 0.1 ), "lead": 0.005
		} );
		assert.ok( residual.silentBefore );
		assertResidual( residual, engine, "onset", "late start" );
	} );

	test( "wall time passing while the audio clock is frozen skips nothing", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, () => {
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.sound( { "frequency": 300, "duration": 0.1, "delay": 0.5 } );
				} },
				{ "time": 0.1, "run": () => {
					__audioHarness.advanceWall( 1 );
				} }
			] } ).then( render => ( { ...render, "sources": __audioHarness.sources() } ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const voices = voiceSources( result.sources );
		assert.equal( voices.length, 1 );
		assert.ok( Math.abs( voices[ 0 ].startTime - 0.5 ) < 1e-9 );
	} );

	test( "a play() string over 128 notes plays every note (interim PLAY exemption, " +
		"deleted by task 4.2)", async t => {
		const notes = 154;
		const result = await suite.inHarness( t, { "config": { "duration": 2 } }, notes => {
			$.setSoundLimiter( false );
			$.play( "T255 L64 MS " + "CDEFGAB".repeat( notes / 7 ) );
			const live = __audioHarness.liveSources();
			return __audioHarness.render( { "singlePass": true } ).then( render => ( {
				...render, "live": live, "sources": __audioHarness.sources()
			} ) );
		}, notes );
		if( !result ) {
			return;
		}
		assert.equal( result.nodeCounts.createOscillator, notes );
		assert.equal( result.live, notes );
		const voices = voiceSources( result.sources );
		assert.equal( voices.length, notes );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		for( const voice of voices ) {
			assert.equal( voice.stopCalls, 1 );
			const start = frame( voice.startTime );
			assert.ok( g_metrics.peak( left, start, start + frame( 0.008 ) ) > 0.05 );
		}
	} );

	test( "frequency is not rounded", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 2 } }, () => {
			$.setSoundLimiter( false );
			$.sound( { "frequency": 60.5, "duration": 1.8, "oType": "sine" } );
			return __audioHarness.render( { "singlePass": true } );
		} );
		if( !result ) {
			return;
		}
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const pitch = g_metrics.zeroCrossingFrequency( left, RATE, frame( 0.1 ), frame( 1.7 ) );
		assert.ok( Math.abs( pitch - 60.5 ) < 0.1, `pitch ${pitch}` );
	} );

	test( "a locked context drops one-shots, defers songs, and re-arms on interruption",
		async t => {
			const result = await suite.inHarness( t, { "config": { "locked": true } }, () => {
				const oscillators = () => __audioHarness.nodeCounts().createOscillator || 0;
				const gesture = type => document.dispatchEvent( new Event( type ) );
				const log = {};
				log.droppedId = $.sound( 440 );
				log.afterDrop = oscillators();
				$.play( "L8 C D E" );
				const cancelled = $.play( "L8 F G" );
				$.stopPlay( cancelled );
				log.afterPlay = oscillators();
				gesture( "pointerdown" );
				log.resumeCalls = __audioHarness.resumeCalls();
				log.afterGesture = oscillators();

				// The gesture requested resume, so a sound in the same gesture is kept
				$.sound( 440, 0.1 );
				log.sameGesture = oscillators();
				__audioHarness.simulateGesture();
				gesture( "keydown" );
				log.resumeAfterRunning = __audioHarness.resumeCalls();
				__audioHarness.simulateInterruption();
				$.sound( 440, 0.1 );
				log.afterInterruption = oscillators();
				gesture( "touchend" );
				log.resumeAfterInterruption = __audioHarness.resumeCalls();
				$.sound( 440, 0.1 );
				log.afterRearm = oscillators();
				$.stopSound( log.droppedId );
				return log;
			} );
			if( !result ) {
				return;
			}
			assert.equal( typeof result.droppedId, "string" );
			assert.deepEqual( { ...result, "droppedId": null }, {
				"droppedId": null,
				"afterDrop": 0,
				"afterPlay": 0,
				"resumeCalls": 1,
				"afterGesture": 3,
				"sameGesture": 4,
				"resumeAfterRunning": 1,
				"afterInterruption": 4,
				"resumeAfterInterruption": 2,
				"afterRearm": 5
			} );
		}
	);
} );
