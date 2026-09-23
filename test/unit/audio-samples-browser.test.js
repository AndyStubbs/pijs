/**
 * Offline render tests for decoded sample instances: the position model (offset, content
 * duration at rates other than 1, loop wrap, rate changes), pause and resume, setAudio in
 * every state, stop fades, the late-start rule, shared voice caps with protected loops, and
 * the locked-context policy.
 *
 * Fixtures are generated chirp WAV files (audio-sample-fixtures.js). References integrate the
 * content position per frame from the rate schedule and apply the expected fades, so rendered
 * output is compared with content × gain. Focused checks bypass the limiter and set the
 * master volume to 1.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./audio-render-harness.js";
import * as g_metrics from "./audio-metrics.js";
import * as g_suite from "./audio-browser-suite.js";
import * as g_tolerances from "./audio-tolerances.js";
import * as g_fixtures from "./audio-sample-fixtures.js";
const test = g_test.test;
const assert = g_assert;
const frame = g_suite.frame;

const RATE = g_harness.SAMPLE_RATE;
const LEAD = g_suite.LEAD;
const STOP_FADE = g_suite.STOP_FADE;
const MIN_RAMP = g_suite.MIN_RAMP;

// Mono and stereo chirp fixtures, 0.5 s long
const MONO = g_fixtures.chirp( 0.5, 1 );
const STEREO = g_fixtures.chirp( 0.5, 2 );
const MONO_WAV = g_fixtures.wavBase64( MONO );
const STEREO_WAV = g_fixtures.wavBase64( STEREO );
const MONO_DATA = g_fixtures.toFloat( MONO[ 0 ] );
const STEREO_DATA = STEREO.map( g_fixtures.toFloat );
const LOADER = g_fixtures.PAGE_LOADER;

/**
 * Onset and optional end fade for an instance: 0 → 1 over MIN_RAMP from begin, then a
 * STOP_FADE ramp to 0 ending at end
 *
 * @param {number} begin - Audible start
 * @param {number} [end] - Content end, or Infinity
 * @param {number} [volume=1] - Instance volume
 * @returns {Function} gain( t )
 */
function instanceGain( begin, end = Infinity, volume = 1 ) {
	const points = [ [ begin, 0 ], [ begin + MIN_RAMP, volume ] ];
	if( end !== Infinity ) {
		points.push( [ end - STOP_FADE, volume ], [ end, 0 ] );
	}
	return g_fixtures.gainPoints( points );
}

function assertPosition( rendered, content, gain, engine, label, from, to ) {
	const residual = g_metrics.referenceResidual( rendered, content, gain, {
		"sampleRate": RATE, "from": from, "to": to
	} );
	const tolerance = g_tolerances.getTolerance( "samplePosition", engine );
	assert.ok(
		residual.max <= tolerance, `${label}: max residual ${residual.max} > ${tolerance}`
	);
}

/**
 * Sample sources recorded by the harness: buffer sources started after time zero
 *
 * @param {Array<Object>} sources - Harness source entries
 * @returns {Array<Object>} Entries
 */
function sampleSources( sources ) {
	return sources.filter(
		source => source.type === "AudioBufferSourceNode" && source.startTime !== null &&
			source.startTime > 0
	);
}

g_suite.describeAudioEngines( "sound samples", suite => {
	const engine = suite.engine;

	test( "offset and default duration play to the end of the file", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 0.8 } }, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			const instance = $.playAudio( id, 0.5, 0.1 );
			return __audioHarness.render( { "singlePass": true } ).then( render => ( {
				...render, "instance": instance, "sources": __audioHarness.sources()
			} ) );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.equal( result.instance, 1 );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const end = LEAD + 0.4;
		const content = g_fixtures.playedContent( MONO_DATA, {
			"start": LEAD, "offset": 0.1, "rates": [ { "time": 0, "rate": 1 } ],
			"budget": 0.4, "frames": left.length
		} );
		assertPosition(
			left, content, instanceGain( LEAD, end, 0.5 ), engine, "rate 1", 0, left.length
		);
		assert.ok( g_metrics.isSilent( left, frame( end ) + 1, left.length ) );
		const sources = sampleSources( result.sources );
		assert.equal( sources.length, 1 );
		assert.ok( Math.abs( sources[ 0 ].offset - 0.1 ) < 1e-9 );
		assert.ok( Math.abs( sources[ 0 ].stopTime - end ) < 1e-9 );
	} );

	for( const rate of [ 0.5, 2 ] ) {
		test( `content duration at rate ${rate} matches the position model`, async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 1.2 }
			}, async arg => {
				eval( arg.loader );
				$.setSoundLimiter( false );
				$.setVolume( 1 );
				const id = await __loadWav( arg.wav );
				$.playAudio( {
					"audioId": id, "startTime": 0.05, "duration": 0.3, "playbackRate": arg.rate
				} );
				return __audioHarness.render( { "singlePass": true } );
			}, { "loader": LOADER, "wav": MONO_WAV, "rate": rate } );
			if( !result ) {
				return;
			}
			const left = g_harness.decodeRender( result ).channels[ 0 ];
			const end = LEAD + 0.3 / rate;
			const content = g_fixtures.playedContent( MONO_DATA, {
				"start": LEAD, "offset": 0.05, "rates": [ { "time": 0, "rate": rate } ],
				"budget": 0.3, "frames": left.length
			} );
			assertPosition(
				left, content, instanceGain( LEAD, end ), engine, `rate ${rate}`, 0, left.length
			);
			assert.ok( g_metrics.isSilent( left, frame( end ) + 1, left.length ) );
		} );
	}

	test( "a finite loop wraps at the file end and stops after its budget", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 1.4 } }, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			$.playAudio( {
				"audioId": id, "startTime": 0.3, "duration": 0.9, "loop": true,
				"playbackRate": 1.5
			} );
			return __audioHarness.render( { "singlePass": true } );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const end = LEAD + 0.9 / 1.5;
		const content = g_fixtures.playedContent( MONO_DATA, {
			"start": LEAD, "offset": 0.3, "rates": [ { "time": 0, "rate": 1.5 } ],
			"budget": 0.9, "loop": true, "frames": left.length
		} );
		assertPosition( left, content, instanceGain( LEAD, end ), engine, "loop", 0, left.length );
		assert.ok( g_metrics.isSilent( left, frame( end ) + 1, left.length ) );
	} );

	test( "stereo buffers keep both channels and their level at center pan", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 0.7 } }, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			$.playAudio( id );
			return __audioHarness.render( { "singlePass": true } );
		}, { "loader": LOADER, "wav": STEREO_WAV } );
		if( !result ) {
			return;
		}
		const channels = g_harness.decodeRender( result ).channels;
		for( let c = 0; c < 2; c++ ) {
			const content = g_fixtures.playedContent( STEREO_DATA[ c ], {
				"start": LEAD, "offset": 0, "rates": [ { "time": 0, "rate": 1 } ],
				"frames": channels[ c ].length
			} );
			assertPosition(
				channels[ c ], content, instanceGain( LEAD, LEAD + 0.5 ), engine,
				`channel ${c}`, 0, channels[ c ].length
			);
		}
	} );

	test( "a mono buffer's louder channel stays at its volume when panned", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 0.7 } }, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			$.playAudio( { "audioId": id, "volume": 0.8, "pan": 0.5 } );
			return __audioHarness.render( { "singlePass": true } );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		const [ left, right ] = g_harness.decodeRender( result ).channels;
		const angle = 1.5 * Math.PI / 4;
		const content = g_fixtures.playedContent( MONO_DATA, {
			"start": LEAD, "offset": 0, "rates": [ { "time": 0, "rate": 1 } ],
			"frames": right.length
		} );
		assertPosition(
			right, content, instanceGain( LEAD, LEAD + 0.5, 0.8 ), engine, "right", 0,
			right.length
		);
		assertPosition(
			left, content, instanceGain( LEAD, LEAD + 0.5, 0.8 / Math.tan( angle ) ), engine,
			"left", 0, left.length
		);
	} );

	test( "position after rate changes matches the model to the sample", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			const times = [];
			let instance = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					instance = $.playAudio( { "audioId": id, "loop": true } );
				} },
				{ "time": 0.2, "run": () => {
					times.push( new AudioContext().currentTime );
					$.setAudio( instance, null, 2 );
				} },
				{ "time": 0.45, "run": () => {
					times.push( new AudioContext().currentTime );
					$.setAudio( { "instanceId": instance, "playbackRate": 0.75 } );
				} }
			] } ).then( render => ( { ...render, "times": times } ) );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const content = g_fixtures.playedContent( MONO_DATA, {
			"start": LEAD, "offset": 0, "loop": true, "frames": left.length,
			"rates": [
				{ "time": 0, "rate": 1 },
				{ "time": result.times[ 0 ] + LEAD, "rate": 2 },
				{ "time": result.times[ 1 ] + LEAD, "rate": 0.75 }
			]
		} );
		assertPosition(
			left, content, instanceGain( LEAD ), engine, "rate changes", 0, left.length
		);
	} );

	test( "pause and resume honor the saved position and remaining content", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			const times = [];
			let instance = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					instance = $.playAudio( { "audioId": id, "duration": 0.4 } );
				} },
				{ "time": 0.2, "run": () => {
					times.push( new AudioContext().currentTime );
					$.pauseAudio( instance );
					$.pauseAudio( instance );
					$.setAudio( instance, 0.5 );
				} },
				{ "time": 0.5, "run": () => {
					times.push( new AudioContext().currentTime );
					$.resumeAudio( id );
					$.resumeAudio( instance );
				} }
			] } ).then( render => ( {
				...render, "times": times, "sources": __audioHarness.sources()
			} ) );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const pause = result.times[ 0 ] + LEAD;
		const resume = result.times[ 1 ] + LEAD;
		const saved = pause - LEAD;
		const end = resume + 0.4 - saved;

		// Before the pause: the first source, faded out from the pause point
		const first = g_fixtures.playedContent( MONO_DATA, {
			"start": LEAD, "offset": 0, "rates": [ { "time": 0, "rate": 1 } ],
			"frames": left.length
		} );
		const firstGain = g_fixtures.gainPoints( [
			[ LEAD, 0 ], [ LEAD + MIN_RAMP, 1 ], [ pause, 1 ], [ pause + STOP_FADE, 0 ]
		] );
		assertPosition( left, first, firstGain, engine, "before pause", 0, frame( resume ) );

		// After the resume: the saved position with the remaining budget at the new volume
		const second = g_fixtures.playedContent( MONO_DATA, {
			"start": resume, "offset": saved, "rates": [ { "time": 0, "rate": 1 } ],
			"budget": 0.4 - saved, "frames": left.length
		} );
		assertPosition(
			left, second, instanceGain( resume, end, 0.5 ), engine, "after resume",
			frame( resume ), left.length
		);

		// Audible within the lead and the onset floor of the resume call
		const audible = g_metrics.firstNonSilent( left.subarray( frame( result.times[ 1 ] ) ) );
		assert.ok( audible / RATE <= LEAD + MIN_RAMP );
		assert.equal( sampleSources( result.sources ).length, 2 );
	} );

	test( "setAudio applies to pending, scheduled, and paused instances", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.6 }, "needsSuspend": true
		}, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			const ids = {};
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {

					// Pending: beyond the window, changed before its start
					ids.pending = $.playAudio( {
						"audioId": id, "duration": 0.2, "delay": 0.6, "volume": 0.2
					} );
					$.setAudio( ids.pending, 0.4, 2 );

					// Scheduled: inside the window, changed before its start
					ids.scheduled = $.playAudio( {
						"audioId": id, "duration": 0.1, "delay": 0.1, "volume": 0.2
					} );
					$.setAudio( ids.scheduled, null, 0.5 );

					// Paused before its start: resumes from startTime with the full duration
					ids.paused = $.playAudio( {
						"audioId": id, "duration": 0.1, "delay": 0.5, "startTime": 0.2
					} );
					$.pauseAudio( ids.paused );
					$.setAudio( ids.paused, 0.3, 0.5 );
				} },
				{ "time": 1, "run": () => {
					ids.resumedAt = new AudioContext().currentTime;
					$.resumeAudio( ids.paused );
				} }
			] } ).then( render => ( {
				...render, "resumedAt": ids.resumedAt, "sources": __audioHarness.sources()
			} ) );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const sources = sampleSources( result.sources );
		assert.equal( sources.length, 3 );
		const [ scheduled, pending, paused ] = sources;

		// Each ends after its content at the changed rate
		assert.ok( Math.abs( scheduled.startTime - 0.1 ) < 1e-9 );
		assert.ok( Math.abs( scheduled.stopTime - ( scheduled.startTime + 0.2 ) ) < 1e-6 );
		assert.ok( Math.abs( pending.startTime - 0.6 ) < 1e-9 );
		assert.ok( Math.abs( pending.stopTime - ( pending.startTime + 0.1 ) ) < 1e-6 );
		assert.ok( Math.abs( paused.startTime - ( result.resumedAt + LEAD ) ) < 1e-9 );
		assert.ok( Math.abs( paused.offset - 0.2 ) < 1e-9 );
		assert.ok( Math.abs( paused.stopTime - ( paused.startTime + 0.2 ) ) < 1e-6 );

		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const pendingContent = g_fixtures.playedContent( MONO_DATA, {
			"start": pending.startTime, "offset": 0, "rates": [ { "time": 0, "rate": 2 } ],
			"budget": 0.2, "frames": left.length
		} );
		assertPosition(
			left, pendingContent, instanceGain( pending.startTime, pending.stopTime, 0.4 ),
			engine, "pending", frame( pending.startTime - 0.01 ), frame( pending.stopTime + 0.01 )
		);

		// The scheduled instance keeps its full onset ramp after its end fade moved
		const scheduledContent = g_fixtures.playedContent( MONO_DATA, {
			"start": scheduled.startTime, "offset": 0, "rates": [ { "time": 0, "rate": 0.5 } ],
			"budget": 0.1, "frames": left.length
		} );
		assertPosition(
			left, scheduledContent,
			instanceGain( scheduled.startTime, scheduled.stopTime, 0.2 ), engine, "scheduled",
			frame( scheduled.startTime - 0.01 ), frame( scheduled.stopTime + 0.01 )
		);
	} );

	test( "stopAudio fades samples; stopSound and stopAudio stay separate", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 0.8 }, "needsSuspend": true
		}, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			let calledAt = null;
			let instance = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					instance = $.playAudio( { "audioId": id, "loop": true } );
					$.sound( { "frequency": 300, "duration": 0.6, "volume": 0.01 } );
				} },
				{ "time": 0.2, "run": () => {
					$.stopSound();
				} },
				{ "time": 0.3, "run": () => {
					calledAt = new AudioContext().currentTime;
					$.stopAudio( id );
					$.stopAudio( instance );
					$.pauseAudio( instance );
					$.setAudio( instance, 1 );
				} }
			] } ).then( render => ( {
				...render, "calledAt": calledAt, "sources": __audioHarness.sources()
			} ) );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const sources = sampleSources( result.sources );
		assert.equal( sources.length, 1 );
		const deadline = result.calledAt + LEAD + STOP_FADE;
		assert.ok( Math.abs( sources[ 0 ].stopTime - deadline ) < 1e-9 );
		const left = g_harness.decodeRender( result ).channels[ 0 ];
		const fadeStart = result.calledAt + LEAD;
		const content = g_fixtures.playedContent( MONO_DATA, {
			"start": LEAD, "offset": 0, "rates": [ { "time": 0, "rate": 1 } ], "loop": true,
			"frames": left.length
		} );

		// The synth voice was stopped at 0.2 s, so only the sample remains at the stop
		const residual = g_metrics.stopResidual( left, content, g_fixtures.gainPoints( [
			[ fadeStart, 1 ], [ fadeStart + STOP_FADE, 0 ]
		] ), {
			"sampleRate": RATE, "from": frame( fadeStart - 0.05 ), "stopEnd": fadeStart + STOP_FADE
		} );
		assert.ok( residual.silentAfter );
		const tolerance = g_tolerances.getTolerance( "samplePosition", engine );
		assert.ok( residual.max <= tolerance, `stop residual ${residual.max} > ${tolerance}` );
	} );

	test( "late samples expire, start within grace, or are skipped; loops catch up", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.4 }, "needsSuspend": true
		}, async arg => {
			eval( arg.loader );
			const id = await __loadWav( arg.wav );
			const release = 0.64;
			const ids = {};
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					ids.grace = $.playAudio( {
						"audioId": id, "duration": 0.3, "delay": release - 0.015,
						"playbackRate": 2
					} );
					ids.skipped = $.playAudio( { "audioId": id, "delay": release - 0.05 } );
					ids.expired = $.playAudio( {
						"audioId": id, "duration": 0.02, "delay": release - 0.1
					} );
					ids.loop = $.playAudio( {
						"audioId": id, "loop": true, "delay": release - 0.3, "duration": 2
					} );
					ids.future = $.playAudio( { "audioId": id, "delay": release + 0.3 } );
					__audioHarness.holdTimers( true );
				} },
				{ "time": 0.4, "run": () => {

					// A rate change while the loop is pending counts toward its late offset
					$.setAudio( ids.loop, null, 2 );
				} },
				{ "time": release, "run": () => {
					__audioHarness.holdTimers( false );
					__audioHarness.advance( 0 );
				} },
				{ "time": release + 0.1, "run": () => {
					$.stopAudio( ids.skipped );
					$.pauseAudio( ids.expired );
					$.resumeAudio( ids.expired );
					$.setAudio( ids.skipped, 1 );
				} }
			] } ).then( render => ( {
				...render, "sources": __audioHarness.sources(), "ids": ids
			} ) );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const release = 0.64;
		const sources = sampleSources( result.sources );
		assert.equal( sources.length, 3 );
		const [ loop, grace, future ] = sources;
		const begin = release + LEAD;

		// The loop was due at release - 0.3 at rate 1, changed to rate 2 while pending
		const loopStart = release - 0.3;
		const skipped = ( 0.4 + LEAD - loopStart ) + 2 * ( begin - ( 0.4 + LEAD ) );
		assert.ok( Math.abs( loop.startTime - begin ) < 1e-9 );
		assert.ok(
			Math.abs( loop.offset - ( skipped % 0.5 ) ) < 1e-6, `loop offset ${loop.offset}`
		);

		// The grace instance keeps its original end: 0.3 s of content at rate 2
		const graceStart = release - 0.015;
		assert.ok( Math.abs( grace.startTime - begin ) < 1e-9 );
		assert.ok( Math.abs( grace.offset - 2 * ( begin - graceStart ) ) < 1e-6 );
		assert.ok( Math.abs( grace.stopTime - ( graceStart + 0.15 ) ) < 1e-6 );
		assert.ok( Math.abs( future.startTime - ( release + 0.3 ) ) < 1e-9 );
	} );

	test( "SFX floods preserve loops, and protected-only capacity rejects new voices",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.8 }, "needsSuspend": true
			}, async arg => {
				eval( arg.loader );
				const id = await __loadWav( arg.wav );
				const ids = [];
				const counts = {};
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						for( let i = 0; i < 8; i++ ) {
							ids.push( $.playAudio( {
								"audioId": id, "loop": true, "volume": 0.01
							} ) );
						}
						for( let i = 0; i < 200; i++ ) {
							$.sound( { "frequency": 200 + i, "duration": 0.5, "volume": 0.001 } );
						}
					} },
					{ "time": 0.2, "run": () => {
						$.stopSound();
						for( let i = 8; i < 64; i++ ) {
							ids.push( $.playAudio( {
								"audioId": id, "loop": true, "volume": 0.01
							} ) );
						}
						counts.before = __audioHarness.sources().length;
						$.playAudio( { "audioId": id, "loop": true } );
						$.playAudio( id );
						$.sound( { "frequency": 300, "volume": 0.01 } );
						counts.rejected = __audioHarness.sources().length - counts.before;

						// A paused loop frees its slot; a new loop takes it; the resume is rejected
						$.pauseAudio( ids[ 0 ] );
						ids.push( $.playAudio( { "audioId": id, "loop": true, "volume": 0.01 } ) );
						$.resumeAudio( ids[ 0 ] );
						counts.afterResume = __audioHarness.sources().length - counts.before;
					} },
					{ "time": 0.3, "run": () => {

						// Stopping a loop frees a slot, so the paused loop can resume
						$.stopAudio( ids[ 1 ] );
						$.resumeAudio( ids[ 0 ] );
						counts.afterStop = __audioHarness.sources().length - counts.before;
					} }
				] } ).then( render => ( {
					...render, "counts": counts, "sources": __audioHarness.sources()
				} ) );
			}, { "loader": LOADER, "wav": MONO_WAV } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			const loops = sampleSources( result.sources );

			// The first 8 loops survived 200 synth requests
			for( let i = 0; i < 8; i++ ) {
				assert.ok( loops[ i ].stopTime === null || loops[ i ].stopTime > 0.2 );
			}
			assert.ok( loops[ 2 ].stopTime === null );
			assert.equal( result.counts.rejected, 0 );
			assert.equal( result.counts.afterResume, 1 );
			assert.equal( result.counts.afterStop, 2 );
		} );

	test( "delayed loops hold a slot only from admission", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, async arg => {
			eval( arg.loader );
			const id = await __loadWav( arg.wav );
			const counts = {};
			let delayed = null;
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					for( let i = 0; i < 63; i++ ) {
						$.playAudio( { "audioId": id, "loop": true, "volume": 0.01 } );
					}
					delayed = $.playAudio( {
						"audioId": id, "loop": true, "volume": 0.01, "delay": 0.6
					} );

					// The pending loop holds no slot yet
					$.sound( { "frequency": 300, "duration": 2, "volume": 0.01 } );
					counts.before = __audioHarness.sources().length;
				} },
				{ "time": 0.8, "run": () => {

					// Admitted at its window, the loop stole the synth voice
					counts.admitted = __audioHarness.sources().length;
					$.sound( { "frequency": 400, "volume": 0.01 } );
					counts.full = __audioHarness.sources().length;
					$.pauseAudio( delayed );
					$.sound( { "frequency": 500, "volume": 0.01 } );
					counts.paused = __audioHarness.sources().length;
				} }
			] } ).then( render => ( {
				...render, "counts": counts, "sources": __audioHarness.sources()
			} ) );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const counts = result.counts;
		assert.equal( counts.admitted, counts.before + 1 );
		assert.equal( counts.full, counts.admitted );
		assert.equal( counts.paused, counts.full + 1 );
		const synth = result.sources.filter( source => source.type === "OscillatorNode" );
		const first = synth.find( source => source.startTime > 0 );
		assert.ok( first.stopTime < 1, "the synth voice was stolen for the admitted loop" );
	} );

	test( "a 200-request sample flood stays within the shared caps", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, async arg => {
			eval( arg.loader );
			const id = await __loadWav( arg.wav );
			let maxLive = 0;
			const ids = [];
			return __audioHarness.render( {
				"actions": [ { "time": 0, "run": () => {
					for( let i = 0; i < 200; i++ ) {
						ids.push( $.playAudio( {
							"audioId": id, "volume": 0.005, "delay": ( i % 50 ) * 0.002
						} ) );
					}
				} } ],
				"onStep": () => {
					maxLive = Math.max( maxLive, __audioHarness.liveSources() );
				}
			} ).then( render => ( {
				...render, "maxLive": maxLive, "ids": ids, "sources": __audioHarness.sources()
			} ) );
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		assert.equal( new Set( result.ids ).size, 200 );
		assert.ok( result.maxLive <= 128, `live voices peaked at ${result.maxLive}` );
		const sources = sampleSources( result.sources );
		assert.equal( sources.length, 200 );
		let peak = 0;
		for( const source of sources ) {
			let count = 0;
			for( const other of sources ) {
				let end = other.stopTime;
				if( other.stopCalls > 1 ) {
					end -= STOP_FADE;
				}
				if( other.startTime <= source.startTime && source.startTime < end ) {
					count += 1;
				}
			}
			peak = Math.max( peak, count );
		}
		assert.equal( peak, 64 );
	} );

	test( "a locked context drops sample one-shots and defers loops", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 0.5, "locked": true }
		}, async arg => {
			eval( arg.loader );
			const id = await __loadWav( arg.wav );
			const oneShot = $.playAudio( id );
			const loop = $.playAudio( { "audioId": id, "loop": true } );
			$.stopAudio( oneShot );
			const before = __audioHarness.sources().length;
			__audioHarness.simulateGesture();
			return {
				"before": before,
				"after": __audioHarness.sources().length,
				"ids": [ oneShot, loop ]
			};
		}, { "loader": LOADER, "wav": MONO_WAV } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.ids, [ 1, 2 ] );
		assert.equal( result.after - result.before, 1 );
	} );
} );
