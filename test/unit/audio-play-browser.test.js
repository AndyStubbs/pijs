/**
 * Offline render tests for play() on the lookahead scheduler: note timing and pitch for
 * existing play strings, voice creation only inside the lookahead window, hidden-tab window
 * fill, the late-start rule after a stall, stopPlay() for scheduled, active, and retiring
 * voices, bounded node counts for long songs, and PLAY extensions with voice inserts.
 *
 * Expected note times and envelopes come from parsePlayString() in plugins/sound/play.js,
 * which Node imports directly; timing and envelopes are checked against the rendered audio
 * and the harness source log. Every test here is clock-driven.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./audio-render-harness.js";
import * as g_metrics from "./audio-metrics.js";
import * as g_suite from "./audio-browser-suite.js";
import * as g_tolerances from "./audio-tolerances.js";
import * as g_play from "../../plugins/sound/play.js";
const test = g_test.test;
const assert = g_assert;
const frame = g_suite.frame;

const RATE = g_harness.SAMPLE_RATE;
const LEAD = g_suite.LEAD;
const STOP_FADE = g_suite.STOP_FADE;
const MIN_RAMP = g_suite.MIN_RAMP;
const LN_10000 = Math.log( 10000 );

// Scheduler constants from plan 8.1
const BASE_WINDOW = 0.2;
const LATE_GRACE = 0.025;
const MAX_LIVE_VOICES = 128;
const FILL_HEADROOM = 16;

/**
 * Page function: play songs at time 0 and log when each source was created.
 *
 * @param {Object} options - songs; optional hidden, holdTimers with releaseAt, wallAt, and
 * carrier (a renderCarrier spec)
 * @returns {Promise<Object>} Render with the source log and per-step live voice counts
 */
function renderSongs( options ) {
	const created = [];
	const live = [];
	let seen = 0;
	const isVoice = source => source.type === "OscillatorNode" && source.startTime > 0;
	const log = () => {
		const sources = __audioHarness.sources();
		for( let i = seen; i < sources.length; i++ ) {
			created.push( { "id": sources[ i ].id, "at": new AudioContext().currentTime } );
		}
		seen = sources.length;
		return sources;
	};
	const actions = [ { "time": 0, "run": () => {
		if( options.hidden ) {
			__audioHarness.setHidden( true );
		}
		$.setSoundLimiter( false );
		$.setVolume( 1 );
		for( const song of options.songs ) {
			$.play( song );
		}
		if( options.holdTimers ) {
			__audioHarness.holdTimers( true );
		}
	} } ];
	if( options.releaseAt ) {
		actions.push( { "time": options.releaseAt, "run": () => {
			__audioHarness.holdTimers( false );
			__audioHarness.advance( 0 );
		} } );
	}
	if( options.wallAt ) {
		actions.push( { "time": options.wallAt, "run": () => {
			__audioHarness.advanceWall( 1 );
		} } );
	}
	return __audioHarness.render( {
		"actions": actions,
		"onStep": () => {
			const sources = log();
			live.push( sources.filter(
				source => isVoice( source ) && source.disconnectedAt === null
			).length );
		}
	} ).then( async render => {
		const sources = __audioHarness.sources();
		let carrier = null;
		if( options.carrier ) {
			carrier = await __audioHarness.renderCarrier( options.carrier );
		}
		return {
			...render,
			"created": created,
			"live": live,
			"sources": sources,
			"carrier": carrier
		};
	} );
}

function voiceSources( sources ) {
	return sources.filter(
		source => source.type === "OscillatorNode" && source.startTime !== null &&
			source.startTime > 0
	).sort( ( a, b ) => a.startTime - b.startTime || a.id - b.id );
}

function createdAt( result, source ) {
	return result.created.find( entry => entry.id === source.id ).at;
}

function eventEnd( event ) {
	return event.time + event.env.gate + event.env.release;
}

/**
 * Expected ADSR gain from resolved stage times, written from plan 6.2 rather than from
 * envelope.js.
 *
 * @param {Object} env - attack, decay, sustain, gate, release in seconds
 * @param {number} start - Envelope start in seconds
 * @param {number} peak - Peak gain
 * @returns {Function} gain( t )
 */
function expectedAdsr( env, start, peak ) {
	function held( u ) {
		if( u < env.attack ) {
			return peak * u / env.attack;
		}
		const sustain = peak * env.sustain;
		const decayed = Math.exp( -( u - env.attack ) * LN_10000 / env.decay );
		return sustain + ( peak - sustain ) * decayed;
	}
	return t => {
		const u = t - start;
		if( u <= 0 || u >= env.gate + env.release ) {
			return 0;
		}
		if( u <= env.gate ) {
			return held( u );
		}
		return held( env.gate ) * Math.exp( -( u - env.gate ) * LN_10000 / env.release );
	};
}

function assertNear( actual, expected, tolerance, label ) {
	assert.ok(
		Math.abs( actual - expected ) <= tolerance,
		`${label}: ${actual} is not within ${tolerance} of ${expected}`
	);
}

g_suite.describeAudioEngines( "sound play", suite => {
	const engine = suite.engine;

	// Existing play strings: notes start at their timeline positions with the right pitch
	const regressionSongs = [
		"T168 L16 SQUARE O4 C E G O5 C8 P16 O4 G8 O5 E8 C4 P8 O4 E8 G8 O5 C8",
		"C4. C4 C4.. C4 O3 C O4 C O5 C",
		"T240 O4 C D E F G A, O2 C1 G1",
		"T180 V100 C V50 D MS E ML F WS G MP-50 A",
		"T60 C D E F T120 C D E F T180 C D E F"
	];
	for( const song of regressionSongs ) {
		test( `renders the notes and timing of "${song}"`, async t => {
			const events = g_play.parsePlayString( song ).events;
			const duration = eventEnd( events[ events.length - 1 ] ) + 0.2;
			const result = await suite.inHarness( t, {
				"config": { "duration": duration }, "needsSuspend": true
			}, renderSongs, { "songs": [ song ] } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			const voices = voiceSources( result.sources );
			assert.equal( voices.length, events.length );
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			for( let i = 0; i < events.length; i++ ) {
				const event = events[ i ];
				const start = LEAD + event.time;
				assertNear( voices[ i ].startTime, start, 1e-9, `note ${i} start` );
				assert.equal( voices[ i ].stopCalls, 1 );

				// Created within the base window
				assert.ok( start - createdAt( result, voices[ i ] ) <= BASE_WINDOW + 1e-9 );

				// Pitch where the note sounds alone
				const overlaps = events.some(
					( other, j ) => j !== i && other.time < eventEnd( event ) &&
						event.time < eventEnd( other )
				);
				if( !overlaps ) {
					const from = frame( start + event.env.attack + 0.004 );
					const to = frame( start + event.env.gate - 0.004 );
					const pitch = g_metrics.zeroCrossingFrequency( left, RATE, from, to );
					assert.ok(
						Math.abs( pitch / event.frequency - 1 ) < 0.005,
						`note ${i}: pitch ${pitch}, expected ${event.frequency}`
					);
				}
			}
		} );
	}

	test( "a hidden-tab dense song fills the larger window within the fill headroom",
		async t => {
			const line = "T255 L32 " + "CDEFGABC".repeat( 8 );
			const songs = [ "O3 " + line, "O4 " + line, "O5 " + line, "WQ V30 O2 " + line ];
			const result = await suite.inHarness( t, {
				"config": { "duration": 2.2 }, "needsSuspend": true
			}, renderSongs, { "songs": songs, "hidden": true } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			const voices = voiceSources( result.sources );
			assert.equal( voices.length, 4 * 64 );

			// No due note was dropped, stolen, or rejected
			for( const voice of voices ) {
				assert.equal( voice.stopCalls, 1 );
			}

			// Voices were created beyond the base horizon, each only while fewer than
			// MAX_LIVE_VOICES − FILL_HEADROOM voices held nodes. Voices whose ended event
			// disposed them at the creating step no longer held nodes when the tick ran.
			let beyond = 0;
			for( const voice of voices ) {
				const at = createdAt( result, voice );
				const ahead = voice.startTime - at;
				assert.ok( ahead <= 2 + 1e-9 );
				if( ahead <= BASE_WINDOW + 1e-9 ) {
					continue;
				}
				beyond += 1;
				const live = voices.filter( other => other.id < voice.id && (
					other.disconnectedAt === null || other.disconnectedAt > at
				) ).length;
				assert.ok( live < MAX_LIVE_VOICES - FILL_HEADROOM, `live ${live} at ${at}` );
			}
			assert.ok( beyond > 100 );
			assert.ok( Math.max( ...result.live ) <= MAX_LIVE_VOICES );
		}
	);

	test( "a long song keeps its live voices bounded", async t => {
		const song = "T255 L64 MS " + "CDEFGAB".repeat( 22 );
		const events = g_play.parsePlayString( song ).events;
		const result = await suite.inHarness( t, {
			"config": { "duration": 2.5 }, "needsSuspend": true
		}, renderSongs, { "songs": [ song ] } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const voices = voiceSources( result.sources );
		assert.equal( events.length, 154 );
		assert.equal( voices.length, events.length );
		for( let i = 0; i < events.length; i++ ) {
			assertNear( voices[ i ].startTime, LEAD + events[ i ].time, 1e-9, `note ${i}` );
			assert.equal( voices[ i ].stopCalls, 1 );
		}
		assert.ok( result.live[ 0 ] <= 15, `live after play() ${result.live[ 0 ]}` );
		assert.ok( Math.max( ...result.live ) <= 20 );
		assert.equal( result.live[ result.live.length - 1 ], 0 );
	} );

	test( "after a stall, late notes expire or are skipped and future notes keep their time",
		async t => {
			const release = 0.32;

			// Short notes expire even within grace; the longer notes are skipped beyond it
			const songs = [ "T255 L64 MS " + "CDEFGAB".repeat( 5 ), "T120 L8 ML O3 C D E F" ];
			const events = songs.flatMap( song => g_play.parsePlayString( song ).events );
			const result = await suite.inHarness( t, {
				"config": { "duration": 1.2 }, "needsSuspend": true
			}, renderSongs, { "songs": songs, "holdTimers": true, "releaseAt": release } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );

			// Expected starts under the late-start rule at the overdue tick
			const lead = release + LEAD;
			const expected = [];
			let expiredInGrace = 0;
			let skipped = 0;
			for( const event of events ) {
				const start = LEAD + event.time;
				const end = LEAD + eventEnd( event );
				if( start <= BASE_WINDOW || start >= lead ) {
					expected.push( start );
				} else if( end - lead < MIN_RAMP ) {
					if( release - start <= LATE_GRACE ) {
						expiredInGrace += 1;
					}
				} else if( release - start > LATE_GRACE ) {
					skipped += 1;
				} else {
					expected.push( lead );
				}
			}
			assert.ok( expiredInGrace > 0 && skipped > 0 );
			expected.sort( ( a, b ) => a - b );
			const voices = voiceSources( result.sources );
			assert.deepEqual(
				voices.map( voice => voice.startTime.toFixed( 6 ) ),
				expected.map( start => start.toFixed( 6 ) )
			);
		}
	);

	test( "a note late within grace starts at its timeline position with an onset fade",
		async t => {
			const release = 0.32;
			const song = "T100 L8 SINE O5 P8 A";
			const [ event ] = g_play.parsePlayString( song ).events;
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.8 }, "needsSuspend": true
			}, renderSongs, {
				"songs": [ song ],
				"holdTimers": true,
				"releaseAt": release,
				"carrier": { "type": "sine", "frequency": 880, "start": release + LEAD }
			} );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			const voices = voiceSources( result.sources );
			const begin = release + LEAD;
			assert.equal( voices.length, 1 );
			assertNear( voices[ 0 ].startTime, begin, 1e-9, "grace start" );

			// The attack resumes at its original position, multiplied by the onset fade
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const carrier = g_harness.decodeChannels( [ result.carrier ] )[ 0 ];
			const start = LEAD + event.time;
			const envelope = expectedAdsr( event.env, start, 1 );
			const onset = g_metrics.linearOnset( begin, MIN_RAMP );
			const expected = t => onset( t ) * envelope( t );
			const residual = g_metrics.onsetResidual( left, carrier, expected, {
				"sampleRate": RATE,
				"onset": begin,
				"to": frame( start + event.env.attack ),
				"lead": 0.005
			} );
			assert.ok( residual.silentBefore );
			const max = g_tolerances.getTolerance( "onsetResidualMax", engine );
			const rms = g_tolerances.getTolerance( "onsetResidualRms", engine );
			assert.ok( residual.max <= max, `max residual ${residual.max} > ${max}` );
			assert.ok( residual.rms <= rms, `rms residual ${residual.rms} > ${rms}` );
		}
	);

	test( "wall time passing while the audio clock is frozen keeps the song position",
		async t => {
			const song = "T120 L8 C D E F";
			const events = g_play.parsePlayString( song ).events;
			const result = await suite.inHarness( t, {
				"config": { "duration": 1.2 }, "needsSuspend": true
			}, renderSongs, { "songs": [ song ], "wallAt": 0.1 } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			const voices = voiceSources( result.sources );
			assert.deepEqual(
				voices.map( voice => voice.startTime.toFixed( 6 ) ),
				events.map( event => ( LEAD + event.time ).toFixed( 6 ) )
			);
		}
	);

	test( "stopPlay() cancels scheduled notes and fades the sounding one", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, () => {
			let trackId = null;
			let stoppedAt = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					trackId = $.play( "T120 L8 C D E F G A B > C" );
				} },
				{ "time": 0.4, "run": () => {
					stoppedAt = new AudioContext().currentTime;
					$.stopPlay( trackId );
				} }
			] } ).then( render => ( {
				...render, "stoppedAt": stoppedAt, "sources": __audioHarness.sources()
			} ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const voices = voiceSources( result.sources );

		// The third note was created inside the window and cancelled before it started
		assert.equal( voices.length, 3 );
		assertNear( voices[ 2 ].startTime, LEAD + 0.5, 1e-9, "scheduled start" );
		assertNear( voices[ 2 ].disconnectedAt, result.stoppedAt, 1e-6, "cancelled" );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		assert.ok( g_metrics.peak( left, frame( 0.3 ), frame( 0.39 ) ) > 0.1 );
		const silentFrom = frame( result.stoppedAt + LEAD + STOP_FADE ) + 1;
		assert.ok( g_metrics.isSilent( left, silentFrom, left.length ) );
	} );

	test( "stopPlay() advances a retiring note's steal deadline", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, () => {
			let trackId = null;
			let stoppedAt = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					trackId = $.play( "T60 L1 ML O4 A" );

					// Silent voices fill the other slots; the delayed one steals the note at 0.5
					for( let i = 0; i < 63; i++ ) {
						$.sound( { "frequency": 300, "duration": 5, "volume": 0 } );
					}
					$.sound( { "frequency": 300, "duration": 1, "volume": 0, "delay": 0.5 } );
				} },
				{ "time": 0.4, "run": () => {
					stoppedAt = new AudioContext().currentTime;
					$.stopPlay( trackId );
				} }
			] } ).then( render => ( {
				...render, "stoppedAt": stoppedAt, "sources": __audioHarness.sources()
			} ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const note = voiceSources( result.sources )[ 0 ];
		assertNear( note.startTime, LEAD, 1e-9, "note start" );
		assert.ok( note.stopCalls >= 3 );
		assertNear( note.stopTime, result.stoppedAt + LEAD + STOP_FADE, 1e-6, "stop deadline" );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		assert.ok( g_metrics.peak( left, frame( 0.3 ), frame( 0.39 ) ) > 0.1 );
		const silentFrom = frame( result.stoppedAt + LEAD + STOP_FADE ) + 1;
		assert.ok( g_metrics.isSilent( left, silentFrom, left.length ) );
	} );

	test( "PLAY extension state, snapshots, and inserts created only for admitted notes",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 2 }, "needsSuspend": true
			}, () => {
				const log = { "gains": [], "starts": 0, "disposed": 0, "afterPlay": null };
				const preset = { "gain": 0.5 };
				pi.registerPlugin( {
					"name": "play-extension-stub",
					"dependencies": [ "sound" ],
					"init": api => {
						api.getService( "sound" ).registerPlayExtension( "stub", {
							"tokens": {
								"@": ( state, value ) => {
									state.instrument = value;
								}
							},
							"initState": () => ( { "instrument": 0 } ),
							"copyState": state => ( { ...state } ),
							"resolveNote": state => {
								if( state.instrument === 0 ) {
									return null;
								}
								return { "inserts": [ {
									"factory": ( context, params ) => {
										const node = context.createGain();
										node.gain.value = params.gain;
										log.gains.push( params.gain );
										return {
											"input": node,
											"output": node,
											"start": () => {
												log.starts += 1;
											},
											"stop": () => {},
											"dispose": () => {
												log.disposed += 1;
												node.disconnect();
											}
										};
									},
									"params": preset
								} ] };
							}
						} );
					}
				} );
				let third = null;
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.setVolume( 1 );
						$.play( "@1 T120 L8 C D E F, G" );
						log.afterPlay = log.gains.length;

						// The queued song keeps the preset it was parsed with
						preset.gain = 0.1;
					} },
					{ "time": 1.2, "run": () => {
						$.play( "@1 T120 L8 A" );
					} },
					{ "time": 1.5, "run": () => {
						third = $.play( "@1 T120 L8 C D E" );
					} },
					{ "time": 1.6, "run": () => {
						$.stopPlay( third );
					} }
				] } ).then( render => ( {
					...render, "log": log, "sources": __audioHarness.sources()
				} ) );
			} );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );

			// Parsing invoked no factory; each admitted note got a fresh insert, disposed once
			assert.equal( result.log.afterPlay, 1 );
			assert.deepEqual(
				result.log.gains, [ 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.1, 0.1 ]
			);
			assert.equal( result.log.starts, 8 );
			assert.equal( result.log.disposed, 8 );
			const voices = voiceSources( result.sources );
			assert.equal( voices.length, 8 );

			// The comma track carried the instrument selection: G sounds with F
			assertNear( voices[ 3 ].startTime, LEAD + 0.75, 1e-9, "F" );
			assertNear( voices[ 4 ].startTime, LEAD + 0.75, 1e-9, "G" );

			// The insert gain applies to the voice
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const first = g_metrics.peak( left, frame( LEAD ), frame( LEAD + 0.2 ) );
			const later = g_metrics.peak( left, frame( 1.2 + LEAD ), frame( 1.4 ) );
			assert.ok( first > 0.4 && first < 0.55, `first peak ${first}` );
			assert.ok( later > 0.05 && later < 0.12, `later peak ${later}` );
		}
	);
} );
