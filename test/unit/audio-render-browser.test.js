/**
 * Offline render harness tests against the in-memory full bundle.
 *
 * Covers the harness itself: a rendered sound() call, a clock-driven play() with a mid-song
 * stopPlay(), the state-masking probe, seeded determinism, the virtual timer and visibility
 * controls, and the locked-context factory. Runs in every engine from audio-engines.js;
 * engines without Web Audio or offline suspend() skip the tests that need them, with the
 * reason reported.
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

g_suite.describeAudioEngines( "audio render harness", suite => {
	const engine = suite.engine;

	test( "renders a sound() call with the expected peak and length", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 1 } }, () => {
			$.setSoundLimiter( false );
			$.sound( 440, 0.5, 1, "sine" );
			return __audioHarness.render( { "singlePass": true } );
		} );
		if( !result ) {
			return;
		}
		const rendered = g_harness.decodeRender( result );
		const left = rendered.channels[ 0 ];
		assert.equal( rendered.sampleRate, g_harness.SAMPLE_RATE );
		assert.equal( rendered.length % g_harness.STEP_FRAMES, 0 );
		assert.ok( rendered.length >= frame( 1 ) );
		assert.deepEqual( rendered.errors, [] );

		// Defaults: master volume 0.75, sustain level 1, a 0.5 s gate, then a 0.1 s release.
		// The voice starts at the scheduling lead.
		const peak = g_metrics.peak( left );
		assert.ok( Math.abs( peak - 0.75 ) < 0.01, `peak ${peak}` );
		const first = g_metrics.firstNonSilent( left );
		assert.ok(
			first >= frame( g_suite.LEAD ) && first < frame( g_suite.LEAD + g_suite.MIN_RAMP ),
			`first audible frame ${first}`
		);
		const last = g_metrics.lastNonSilent( left );
		const end = frame( g_suite.LEAD + 0.6 );
		assert.ok( Math.abs( last - end ) < 256, `last audible frame ${last}` );
		assert.ok( g_metrics.isSilent( left, end + 1, left.length ) );
		const frequency = g_metrics.zeroCrossingFrequency(
			left, g_harness.SAMPLE_RATE, frame( 0.05 ), frame( 0.45 )
		);
		assert.ok( Math.abs( frequency - 440 ) / 440 < 0.005, `frequency ${frequency}` );
		assert.equal( rendered.nodeCounts.createOscillator, 1 );
	} );

	test( "clock-driven play() stops mid-song through stopPlay()", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 2 }, "needsSuspend": true
		}, () => {
			let trackId = null;
			let stoppedAt = null;
			return __audioHarness.render( {
				"actions": [
					{ "time": 0, "run": () => {

						// Chromium's compressor adds lookahead latency; timing checks bypass it
						$.setSoundLimiter( false );
						trackId = $.play( "T120 L4 O4 C D E F G A B > C" );
					} },
					{ "time": 1, "run": () => {
						stoppedAt = new AudioContext().currentTime;
						$.stopPlay( trackId );
					} }
				]
			} ).then( render => ( { ...render, "stoppedAt": stoppedAt } ) );
		} );
		if( !result ) {
			return;
		}
		const rendered = g_harness.decodeRender( result );
		const left = rendered.channels[ 0 ];
		assert.equal( rendered.clockDriven, true );
		assert.deepEqual( rendered.errors, [] );
		assert.ok( rendered.stoppedAt >= 1 && rendered.stoppedAt < 1 + 0.03 );
		for( let note = 0; note < 2; note++ ) {
			const start = frame( note * 0.5 + 0.05 );
			assert.ok( g_metrics.peak( left, start, start + frame( 0.3 ) ) > 0.1 );
		}
		// Silent once the fade that starts at the scheduling lead has finished
		const silentFrom = frame( rendered.stoppedAt + g_suite.LEAD + g_suite.STOP_FADE ) + 1;
		assert.ok( g_metrics.isSilent( left, silentFrom, left.length ) );
		assert.ok( rendered.nodeCounts.createOscillator >= 8 );
	} );

	test( "state masking yields one voice per sound() call at every step", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 3 }, "needsSuspend": true
		}, () => {
			const context = new AudioContext();
			const seen = { "handler": 0, "listener": 0, "notRunning": 0, "calls": 0 };
			context.onstatechange = () => { seen.handler++; };
			context.addEventListener( "statechange", () => { seen.listener++; } );
			const ids = new Set();
			const actions = [];
			for( let time = 0; time < 3; time += __audioHarness.stepSeconds ) {
				actions.push( { "time": time, "run": () => {
					seen.calls++;
					ids.add( $.sound( {
						"frequency": 300 + seen.calls, "duration": 0.005,
						"volume": 0.2, "releaseTime": 0.005
					} ) );
				} } );
			}
			return __audioHarness.render( {
				"actions": actions,
				"onStep": () => {
					if( new AudioContext().state !== "running" ) {
						seen.notRunning++;
					}
				}
			} ).then( render => ( { ...render, "seen": seen, "ids": ids.size } ) );
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		assert.ok( result.seen.calls >= 100, `calls ${result.seen.calls}` );
		assert.equal( result.nodeCounts.createOscillator, result.seen.calls );
		assert.equal( result.ids, result.seen.calls );
		assert.equal( result.seen.notRunning, 0 );
		assert.equal( result.seen.handler, 0 );
		assert.equal( result.seen.listener, 0 );
		assert.equal( result.statechanges.delivered, 0 );

		// The real context changed state at every step; the wrapper hid all of it.
		assert.ok( result.statechanges.native >= result.steps );
	} );

	test( "seeded renders are identical across page loads", async t => {
		const renders = [];
		for( let run = 0; run < 2; run++ ) {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.5, "seed": 1234 }
			}, () => {
				const context = new AudioContext();
				const rate = context.sampleRate;
				const noise = context.createBuffer( 1, rate / 4, rate );
				const data = noise.getChannelData( 0 );
				for( let i = 0; i < data.length; i++ ) {
					data[ i ] = Math.random() * 2 - 1;
				}
				const source = context.createBufferSource();
				source.buffer = noise;
				source.connect( context.destination );
				source.start( Math.random() * 0.1 );
				const single = __audioHarness.render( { "singlePass": true } );
				return single.then( render => ( { ...render, "next": Math.random() } ) );
			} );
			if( !result ) {
				return;
			}
			renders.push( result );
		}
		assert.equal( renders[ 0 ].next, renders[ 1 ].next );
		assert.deepEqual( renders[ 0 ].channels, renders[ 1 ].channels );
		const left = g_harness.decodeChannels( renders[ 0 ].channels )[ 0 ];
		assert.ok( g_metrics.peak( left ) > 0.5 );
	} );

	test( "seeded multi-voice mixes match within the engine mix tolerance", async t => {
		const renders = [];
		for( let run = 0; run < 2; run++ ) {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.5, "seed": 1234 }
			}, () => {
				const frequencies = [];
				for( let i = 0; i < 4; i++ ) {
					const frequency = 200 + Math.random() * 600;
					frequencies.push( frequency );
					$.sound( frequency, 0.2, 0.25, "sawtooth", Math.random() * 0.1 );
				}
				return __audioHarness.render( { "singlePass": true } )
					.then( render => ( { ...render, "frequencies": frequencies } ) );
			} );
			if( !result ) {
				return;
			}
			renders.push( g_harness.decodeRender( result ) );
		}
		assert.deepEqual( renders[ 0 ].frequencies, renders[ 1 ].frequencies );
		const tolerance = g_tolerances.getTolerance( "mixDeterminism", engine );
		const [ first, second ] = renders.map( render => render.channels[ 0 ] );
		let difference = 0;
		for( let i = 0; i < first.length; i++ ) {
			difference = Math.max( difference, Math.abs( first[ i ] - second[ i ] ) );
		}
		assert.ok( difference <= tolerance, `mix difference ${difference} > ${tolerance}` );
		assert.ok( g_metrics.peak( first ) > 0.1 );
	} );

	test( "virtual timers, clock, and visibility follow the harness", async t => {
		const result = await suite.inHarness( t, { "needsWebAudio": false }, () => {
			const order = [];
			const start = performance.now();
			const dateStart = Date.now();
			setTimeout( () => order.push( "b" ), 20 );
			setTimeout( () => order.push( "a" ), 10 );
			const cancelled = setTimeout( () => order.push( "cancelled" ), 5 );
			clearTimeout( cancelled );
			let ticks = 0;
			const interval = setInterval( () => {
				ticks++;
				if( ticks === 3 ) {
					clearInterval( interval );
				}
			}, 25 );
			const beforeAdvance = order.length;
			__audioHarness.advance( 0.1 );
			const visibility = [];
			document.addEventListener( "visibilitychange", () => {
				visibility.push( [ document.hidden, document.visibilityState ] );
			} );
			__audioHarness.setHidden( true );
			__audioHarness.setHidden( false );
			return {
				"beforeAdvance": beforeAdvance,
				"order": order,
				"ticks": ticks,
				"elapsed": performance.now() - start,
				"dateElapsed": Date.now() - dateStart,
				"pending": __audioHarness.pendingTimers(),
				"visibility": visibility
			};
		} );
		assert.deepEqual( result, {
			"beforeAdvance": 0,
			"order": [ "a", "b" ],
			"ticks": 3,
			"elapsed": 100,
			"dateElapsed": 100,
			"pending": 0,
			"visibility": [ [ true, "hidden" ], [ false, "visible" ] ]
		} );
	} );

	test( "a locked context reports suspended until a simulated gesture", async t => {
		const result = await suite.inHarness( t, { "config": { "locked": true } }, () => {
			const context = new AudioContext();
			const states = [ context.state ];
			let events = 0;
			context.addEventListener( "statechange", () => {
				events++;
				states.push( context.state );
			} );
			__audioHarness.simulateGesture();
			__audioHarness.simulateGesture();
			return { "states": states, "events": events };
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result, { "states": [ "suspended", "running" ], "events": 1 } );
	} );
} );
