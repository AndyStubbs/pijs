/**
 * Contract tests for the sound extension service v1 (plan 4.3.4), using stub extensions:
 * source and insert lifecycles with exactly-once disposal, factory and start failures, early
 * and repeated stops, a stop advancing a future steal deadline, insert detune links, bus
 * insert replacement and removal, bus volume with effects in either order, taps, the
 * createVoice request paths, and observePlay reports of admitted notes and song ends. The
 * advanced plugin's own modules are covered in audio-advanced-browser.test.js.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./audio-render-harness.js";
import * as g_metrics from "./audio-metrics.js";
import * as g_suite from "./audio-browser-suite.js";
import * as g_fixtures from "./audio-sample-fixtures.js";
import * as g_play from "../../plugins/sound/play.js";
const test = g_test.test;
const assert = g_assert;
const frame = g_suite.frame;

const RATE = g_harness.SAMPLE_RATE;
const LEAD = g_suite.LEAD;
const STOP_FADE = g_suite.STOP_FADE;

const SERVICE_MEMBERS = [
	"createVoice", "getContext", "observePlay", "registerPlayExtension", "registerSource",
	"scheduleEnvelope", "setBusInsert", "setBusVolume", "stopVoice", "tapBus", "version"
];

/**
 * Page-side stub library, evaluated at the start of each page function. It registers a
 * plugin that depends on "sound" and builds logging sources and inserts.
 */
const STUBS = `
window.__stubs = ( () => {
	const log = [];
	let service = null;
	pi.registerPlugin( {
		"name": "service-stub",
		"dependencies": [ "sound" ],
		"init": api => {
			service = api.getService( "sound" );
		}
	} );
	function makeSource( label, options ) {
		options = options || {};
		return ( context, spec ) => {
			log.push( [ label, "factory", spec.frequency ] );
			if( options.throwFactory ) {
				throw new Error( "stub source factory failed" );
			}
			const osc = context.createOscillator();
			return {
				"output": osc,
				"frequency": osc.frequency,
				"detune": osc.detune,
				"start": when => {
					log.push( [ label, "start", when ] );
					if( options.throwStart ) {
						throw new Error( "stub source start failed" );
					}
					osc.start( when );
				},
				"stop": when => {
					log.push( [ label, "stop", when ] );
					osc.stop( when );
				},
				"onEnded": callback => {
					osc.onended = () => {
						log.push( [ label, "ended" ] );
						callback();
					};
				},
				"dispose": () => {
					log.push( [ label, "dispose" ] );
					osc.disconnect();
				}
			};
		};
	}
	function makeInsert( label, options ) {
		options = options || {};
		return {
			"factory": ( context, params ) => {
				log.push( [ label, "factory" ] );
				if( options.throwFactory ) {
					throw new Error( "stub insert factory failed" );
				}
				const node = context.createGain();
				node.gain.value = params.gain ?? 1;
				let detune = null;
				if( params.cents ) {
					detune = context.createConstantSource();
					detune.offset.value = params.cents;
				}
				return {
					"input": node,
					"output": node,
					"detune": detune,
					"start": ( when, gateEnd ) => {
						log.push( [ label, "start", when, gateEnd ] );
						if( detune ) {
							detune.start( when );
						}
					},
					"stop": when => {
						log.push( [ label, "stop", when ] );
						if( detune ) {
							detune.stop( when );
						}
					},
					"dispose": () => {
						log.push( [ label, "dispose" ] );
						node.disconnect();
						if( detune ) {
							detune.disconnect();
						}
					}
				};
			},
			"params": options.params || {}
		};
	}
	function makeBusInsert( label, context, gain ) {
		const node = context.createGain();
		node.gain.value = gain;
		return {
			"input": node,
			"output": node,
			"dispose": () => {
				log.push( [ label, "dispose" ] );
				node.disconnect();
			}
		};
	}
	function events( label ) {
		return log.filter( entry => entry[ 0 ] === label ).map( entry => entry[ 1 ] );
	}
	function times( label, event ) {
		return log.filter( entry => entry[ 0 ] === label && entry[ 1 ] === event )
			.map( entry => entry[ 2 ] );
	}
	// Source ended events are tasks that can follow a single-pass render's promise; timers
	// are virtual in the harness, so a message channel yields real task turns
	async function afterEvents( value ) {
		for( let i = 0; i < 5; i++ ) {
			await new Promise( resolve => {
				const channel = new MessageChannel();
				channel.port1.onmessage = resolve;
				channel.port2.postMessage( 0 );
			} );
		}
		return value;
	}
	function codeOf( fn ) {
		try {
			fn();
		} catch( error ) {
			return error.code || error.message;
		}
		return null;
	}
	return {
		"log": log,
		"service": () => service,
		"makeSource": makeSource,
		"makeInsert": makeInsert,
		"makeBusInsert": makeBusInsert,
		"events": events,
		"times": times,
		"afterEvents": afterEvents,
		"codeOf": codeOf
	};
} )();
`;

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
 * PLAY voices recorded by the harness: oscillators started after time zero, in start order
 *
 * @param {Array<Object>} sources - Harness source entries
 * @returns {Array<Object>} Entries
 */
function playVoices( sources ) {
	return sources.filter(
		source => source.type === "OscillatorNode" && source.startTime !== null &&
			source.startTime > 0
	).sort( ( a, b ) => a.startTime - b.startTime || a.id - b.id );
}

/**
 * Page function: observe PLAY events while running timed actions. Each action's run is
 * function source called with the song IDs array and the loop audio ID; events are logged
 * with the context time they arrived.
 *
 * @param {Object} arg - stubs, actions [ { time, run } ], optional loader and wav for loops
 * @returns {Promise<Object>} Render with events, song IDs, and harness sources
 */
async function observeSongs( arg ) {
	eval( arg.stubs );
	const service = __stubs.service();
	const events = [];
	const ids = [];
	let loopId = null;
	if( arg.loader ) {
		eval( arg.loader );
		loopId = await __loadWav( arg.wav );
	}
	service.observePlay( event => {
		events.push( {
			...event, "frozen": Object.isFrozen( event ), "at": new AudioContext().currentTime
		} );
	} );
	const actions = arg.actions.map( action => ( {
		"time": action.time,
		"run": () => {
			$.setSoundLimiter( false );
			( 0, eval )( action.run )( ids, loopId );
		}
	} ) );
	return __audioHarness.render( { "actions": actions } ).then( render => ( {
		...render, "events": events, "ids": ids, "sources": __audioHarness.sources()
	} ) );
}

function notesOf( result ) {
	return result.events.filter( event => event.type === "note" );
}

function endsOf( result ) {
	return result.events.filter( event => event.type === "end" );
}

g_suite.describeAudioEngines( "sound extension service", suite => {

	test( "service v1 exposes the frozen member list", async t => {
		const result = await suite.inHarness( t, {}, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			return { "keys": Object.keys( service ).sort(), "version": service.version };
		}, { "stubs": STUBS } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.keys, SERVICE_MEMBERS );
		assert.equal( result.version, 1 );
	} );

	test( "registerSource and createVoice validate their arguments", async t => {
		const result = await suite.inHarness( t, {}, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			const source = __stubs.makeSource( "a" );
			service.registerSource( "stub-a", source );
			const codeOf = __stubs.codeOf;
			return {
				"builtIn": codeOf( () => service.registerSource( "sine", source ) ),
				"custom": codeOf( () => service.registerSource( "custom", source ) ),
				"twice": codeOf( () => service.registerSource( "stub-a", source ) ),
				"badName": codeOf( () => service.registerSource( "", source ) ),
				"badFactory": codeOf( () => service.registerSource( "stub-b", null ) ),
				"spec": codeOf( () => service.createVoice( null ) ),
				"bus": codeOf( () => service.createVoice( { "bus": "audio" } ) ),
				"inserts": codeOf( () => service.createVoice( { "inserts": [ {} ] } ) ),
				"oType": codeOf( () => service.createVoice( { "oType": "stub-b" } ) ),
				"label": ( () => {
					try {
						service.createVoice( { "volume": 2 }, "synth" );
					} catch( error ) {
						return error.message;
					}
					return null;
				} )(),
				"soundAccepts": typeof $.sound( { "oType": "stub-a", "duration": 0.01 } ),
				"setBusInsert": codeOf( () => service.setBusInsert( "sfx", {} ) ),
				"insertBus": codeOf( () => service.setBusInsert( "drums", null ) ),
				"tap": codeOf( () => service.tapBus( "sfx", {} ) ),
				"playOType": ( () => {
					service.registerPlayExtension( "bad-otype", {
						"tokens": {},
						"initState": () => ( {} ),
						"copyState": state => state,
						"resolveNote": () => ( { "oType": "nope" } )
					} );
					return codeOf( () => $.play( "C" ) );
				} )()
			};
		}, { "stubs": STUBS } );
		if( !result ) {
			return;
		}
		assert.equal( result.builtIn, "DUPLICATE_SOURCE" );
		assert.equal( result.custom, "DUPLICATE_SOURCE" );
		assert.equal( result.twice, "DUPLICATE_SOURCE" );
		assert.equal( result.badName, "INVALID_SOURCE" );
		assert.equal( result.badFactory, "INVALID_SOURCE" );
		assert.equal( result.spec, "INVALID_SPEC" );
		assert.equal( result.bus, "INVALID_BUS" );
		assert.equal( result.inserts, "INVALID_INSERT" );
		assert.equal( result.oType, "INVALID_OTYPE" );
		assert.match( result.label, /^synth: Parameter volume/ );
		assert.equal( result.soundAccepts, "string" );
		assert.equal( result.setBusInsert, "INVALID_INSERT" );
		assert.equal( result.insertBus, "INVALID_BUS" );
		assert.equal( result.tap, "INVALID_TAP" );
		assert.equal( result.playOType, "INVALID_OTYPE" );
	} );

	test( "a registered source and its insert follow the lifecycle order and dispose once",
		async t => {
			const result = await suite.inHarness( t, { "config": { "duration": 1 } }, arg => {
				eval( arg.stubs );
				const service = __stubs.service();
				service.registerSource( "stub", __stubs.makeSource( "source" ) );
				return __audioHarness.render( { "actions": [ { "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					service.createVoice( {
						"frequency": 440, "duration": 0.3, "volume": 0.5, "oType": "stub",
						"attackTime": 0.01, "releaseTime": 0.05,
						"inserts": [ __stubs.makeInsert( "insert" ) ]
					} );
				} } ] } ).then( __stubs.afterEvents ).then( render => ( {
					...render,
					"source": __stubs.events( "source" ),
					"insert": __stubs.events( "insert" ),
					"sourceStops": __stubs.times( "source", "stop" ),
					"insertStart": __stubs.log.find(
						entry => entry[ 0 ] === "insert" && entry[ 1 ] === "start"
					)
				} ) );
			}, { "stubs": STUBS } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			assert.deepEqual( result.source, [ "factory", "start", "stop", "ended", "dispose" ] );
			assert.deepEqual( result.insert, [ "factory", "start", "stop", "dispose" ] );
			assertNear( result.sourceStops[ 0 ], LEAD + 0.35, 1e-9, "natural end" );
			assertNear( result.insertStart[ 2 ], LEAD, 1e-9, "insert start" );
			assertNear( result.insertStart[ 3 ], LEAD + 0.3, 1e-9, "gate end" );

			// Core scheduled pitch on the source's frequency parameter
			const left = channel( result );
			const measured = g_metrics.zeroCrossingFrequency(
				left, RATE, frame( LEAD + 0.05 ), frame( LEAD + 0.25 )
			);
			assertNear( measured, 440, 440 * 0.005, "pitch" );
			assert.ok( g_metrics.isSilent( left, frame( LEAD + 0.36 ), left.length ) );
		}
	);

	test( "explicit and repeated earlier stops move source and insert deadlines forward",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 1.5 }, "needsSuspend": true
			}, arg => {
				eval( arg.stubs );
				const service = __stubs.service();
				service.registerSource( "stub", __stubs.makeSource( "source" ) );
				let id = null;
				let stoppedAt = null;
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.setVolume( 1 );
						id = service.createVoice( {
							"duration": 1, "volume": 0.5, "oType": "stub",
							"inserts": [ __stubs.makeInsert( "insert" ) ]
						} );
					} },
					{ "time": 0.3, "run": () => {
						stoppedAt = new AudioContext().currentTime;
						service.stopVoice( id );
					} },
					{ "time": 0.32, "run": () => {
						service.stopVoice( id );
					} }
				] } ).then( render => ( {
					...render,
					"stoppedAt": stoppedAt,
					"sourceStops": __stubs.times( "source", "stop" ),
					"insertStops": __stubs.times( "insert", "stop" ),
					"source": __stubs.events( "source" ),
					"insert": __stubs.events( "insert" )
				} ) );
			}, { "stubs": STUBS } );
			if( !result ) {
				return;
			}
			const deadline = result.stoppedAt + LEAD + STOP_FADE;
			assert.equal( result.sourceStops.length, 2 );
			assertNear( result.sourceStops[ 1 ], deadline, 1e-9, "source stop" );
			assert.deepEqual( result.insertStops.slice( 1 ), result.sourceStops.slice( 1 ) );
			assert.equal( result.source.filter( event => event === "dispose" ).length, 1 );
			assert.equal( result.insert.filter( event => event === "dispose" ).length, 1 );
			const left = channel( result );
			assert.ok( g_metrics.isSilent( left, frame( deadline ) + 1, left.length ) );
		}
	);

	test( "a scheduled source cancelled before it sounds is stopped and disposed at once",
		async t => {
			const result = await suite.inHarness( t, { "config": { "duration": 0.6 } }, arg => {
				eval( arg.stubs );
				const service = __stubs.service();
				service.registerSource( "stub", __stubs.makeSource( "source" ) );
				return __audioHarness.render( { "actions": [ { "time": 0, "run": () => {
					const id = service.createVoice( {
						"duration": 0.2, "delay": 0.15, "oType": "stub",
						"inserts": [ __stubs.makeInsert( "insert" ) ]
					} );
					service.stopVoice( id );
				} } ] } ).then( render => ( {
					...render,
					"source": __stubs.events( "source" ),
					"insert": __stubs.events( "insert" )
				} ) );
			}, { "stubs": STUBS } );
			if( !result ) {
				return;
			}
			// An ended callback that arrives after cancellation is ignored by core
			assert.deepEqual(
				result.source.filter( event => event !== "ended" ),
				[ "factory", "start", "stop", "stop", "dispose" ]
			);
			assert.deepEqual( result.insert, [ "factory", "start", "stop", "stop", "dispose" ] );
			assert.ok( g_metrics.isSilent( channel( result ), 0, frame( 0.6 ) ) );
		}
	);

	test( "throwing factories and starts leave no partial voice", async t => {
		const result = await suite.inHarness( t, { "config": { "duration": 0.5 } }, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			const makeSource = __stubs.makeSource;
			service.registerSource( "throws", makeSource( "a", { "throwFactory": true } ) );
			service.registerSource( "ok", makeSource( "b" ) );
			service.registerSource( "bad-start", makeSource( "c", { "throwStart": true } ) );
			const outcomes = [];
			function attempt( spec ) {
				try {
					service.createVoice( spec );
					outcomes.push( null );
				} catch( error ) {
					outcomes.push( error.message );
				}
			}
			return __audioHarness.render( { "actions": [ { "time": 0, "run": () => {
				attempt( { "oType": "throws", "duration": 0.1 } );
				attempt( {
					"oType": "ok", "duration": 0.1,
					"inserts": [
						__stubs.makeInsert( "first" ),
						__stubs.makeInsert( "second", { "throwFactory": true } )
					]
				} );
				attempt( { "oType": "bad-start", "duration": 0.1 } );
			} } ] } ).then( render => ( {
				...render,
				"outcomes": outcomes,
				"a": __stubs.events( "a" ),
				"b": __stubs.events( "b" ),
				"c": __stubs.events( "c" ),
				"first": __stubs.events( "first" ),
				"second": __stubs.events( "second" ),
				"live": __audioHarness.liveSources()
			} ) );
		}, { "stubs": STUBS } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.outcomes, [
			"stub source factory failed", "stub insert factory failed", "stub source start failed"
		] );
		assert.deepEqual( result.a, [ "factory" ] );

		// Constructed but never started: disposed without a stop
		assert.deepEqual( result.b, [ "factory", "dispose" ] );
		assert.deepEqual( result.first, [ "factory", "start", "stop", "dispose" ] );
		assert.deepEqual( result.second, [ "factory" ] );

		// Start threw after partial startup: stopped, then disposed once
		assert.deepEqual( result.c, [ "factory", "start", "stop", "dispose" ] );
		assert.ok( g_metrics.isSilent( channel( result ), 0, frame( 0.5 ) ) );
	} );

	test( "an explicit stop advances a future steal deadline before its fade begins",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.8 }, "needsSuspend": true
			}, arg => {
				eval( arg.stubs );
				const service = __stubs.service();
				const ids = [];
				let stealAt = null;
				let stoppedAt = null;
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.setVolume( 0.01 );
						for( let i = 0; i < 64; i++ ) {
							ids.push( service.createVoice( {
								"duration": 2, "oType": "sine",
								"inserts": [ __stubs.makeInsert( "insert" + i ) ]
							} ) );
						}
						stealAt = new AudioContext().currentTime + 0.15;
						service.createVoice( { "duration": 0.2, "delay": 0.15 } );
					} },
					{ "time": 0.03, "run": () => {
						stoppedAt = new AudioContext().currentTime;
						service.stopVoice( ids[ 0 ] );
					} }
				] } ).then( render => ( {
					...render,
					"stealAt": stealAt,
					"stoppedAt": stoppedAt,
					"victim": __stubs.times( "insert0", "stop" ),
					"victimEvents": __stubs.events( "insert0" ),
					"other": __stubs.times( "insert1", "stop" )
				} ) );
			}, { "stubs": STUBS } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );

			// Natural end, then the steal deadline at the conflict time, then the explicit stop
			assert.equal( result.victim.length, 3 );
			assertNear( result.victim[ 1 ], result.stealAt, 1e-6, "steal deadline" );
			assertNear(
				result.victim[ 2 ], result.stoppedAt + LEAD + STOP_FADE, 1e-9, "explicit stop"
			);
			assert.ok( result.victim[ 2 ] < result.victim[ 1 ] );
			assert.equal(
				result.victimEvents.filter( event => event === "dispose" ).length, 1
			);
			assert.equal( result.other.length, 1 );
		}
	);

	test( "insert detune outputs modulate the source pitch and are unlinked on dispose",
		async t => {
			const result = await suite.inHarness( t, { "config": { "duration": 1 } }, arg => {
				eval( arg.stubs );
				const service = __stubs.service();
				service.registerSource( "stub", __stubs.makeSource( "source" ) );
				return __audioHarness.render( { "actions": [ { "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					// Panned apart, so each channel carries one voice
					service.createVoice( {
						"frequency": 220, "duration": 0.3, "volume": 0.5, "oType": "sine",
						"pan": -1,
						"inserts": [ __stubs.makeInsert( "octave", {
							"params": { "cents": 1200 }
						} ) ]
					} );
					service.createVoice( {
						"frequency": 220, "duration": 0.3, "volume": 0.5, "oType": "stub",
						"pan": 1,
						"inserts": [ __stubs.makeInsert( "fifth", {
							"params": { "cents": 700 }
						} ) ]
					} );

					// Unpitched noise ignores the detune output; it ends before the windows
					service.createVoice( {
						"duration": 0.02, "volume": 0.01, "oType": "white", "releaseTime": 0.01,
						"inserts": [ __stubs.makeInsert( "noise", {
							"params": { "cents": 1200 }
						} ) ]
					} );
				} } ] } ).then( __stubs.afterEvents ).then( render => ( {
					...render,
					"events": [ "octave", "fifth", "noise" ].map( __stubs.events )
				} ) );
			}, { "stubs": STUBS } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			for( const events of result.events ) {
				assert.equal( events.filter( event => event === "dispose" ).length, 1 );
			}
			const left = channel( result );
			const right = channel( result, 1 );
			const octave = g_metrics.zeroCrossingFrequency(
				left, RATE, frame( LEAD + 0.12 ), frame( LEAD + 0.28 )
			);
			assertNear( octave, 440, 440 * 0.005, "oscillator detune" );
			const fifth = g_metrics.zeroCrossingFrequency(
				right, RATE, frame( LEAD + 0.12 ), frame( LEAD + 0.28 )
			);
			const expected = 220 * Math.pow( 2, 7 / 12 );
			assertNear( fifth, expected, expected * 0.005, "registered source detune" );
		}
	);

	test( "bus inserts replace and remove cleanly, and bus volume is independent of them",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 2.4 }, "needsSuspend": true
			}, arg => {
				eval( arg.stubs );
				const service = __stubs.service();
				function tone() {
					$.sound( {
						"frequency": 440, "duration": 0.2, "volume": 0.8, "oType": "sine"
					} );
				}
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.setVolume( 1 );
						const context = service.getContext();
						service.setBusInsert(
							"sfx", __stubs.makeBusInsert( "half", context, 0.5 )
						);
						tone();
					} },
					{ "time": 0.4, "run": () => {
						const context = service.getContext();
						service.setBusInsert(
							"sfx", __stubs.makeBusInsert( "quarter", context, 0.25 )
						);
						tone();
					} },
					{ "time": 0.8, "run": () => {
						service.setBusInsert( "sfx", null );
						service.setBusInsert( "sfx", null );
						tone();
					} },

					// Volume first, then an insert; removing the insert keeps the volume
					{ "time": 1.2, "run": () => {
						service.setBusVolume( "sfx", 0.5 );
						const context = service.getContext();
						service.setBusInsert(
							"sfx", __stubs.makeBusInsert( "late", context, 0.5 )
						);
					} },
					{ "time": 1.25, "run": tone },
					{ "time": 1.6, "run": () => {
						service.setBusInsert( "sfx", null );
						tone();
					} },

					// Master insert
					{ "time": 2.0, "run": () => {
						service.setBusVolume( "sfx", 1 );
						const context = service.getContext();
						service.setBusInsert(
							"master", __stubs.makeBusInsert( "master", context, 0.5 )
						);
						tone();
					} }
				] } ).then( render => ( {
					...render,
					"disposed": [ "half", "quarter", "late", "master" ].map(
						label => __stubs.events( label ).length
					)
				} ) );
			}, { "stubs": STUBS } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			assert.deepEqual( result.disposed, [ 1, 1, 1, 0 ] );
			const left = channel( result );
			function peakAt( start ) {
				return g_metrics.peak( left, frame( start + 0.05 ), frame( start + 0.18 ) );
			}
			assertNear( peakAt( 0 ), 0.4, 0.01, "half insert" );
			assertNear( peakAt( 0.4 ), 0.2, 0.01, "quarter insert" );
			assertNear( peakAt( 0.8 ), 0.8, 0.01, "direct route" );
			assertNear( peakAt( 1.25 ), 0.2, 0.01, "volume and insert" );
			assertNear( peakAt( 1.6 ), 0.4, 0.01, "volume kept after removal" );
			assertNear( peakAt( 2.0 ), 0.4, 0.01, "master insert" );
		}
	);

	test( "muting a bus silences an effect tail without disposing of the effect",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 1.5 }, "needsSuspend": true
			}, arg => {
				eval( arg.stubs );
				const service = __stubs.service();
				let disposed = 0;
				let mutedAt = null;
				return __audioHarness.render( { "actions": [
					{ "time": 0, "run": () => {
						$.setSoundLimiter( false );
						$.setVolume( 1 );
						const context = service.getContext();
						const input = context.createGain();
						const delay = context.createDelay( 1 );
						delay.delayTime.value = 0.2;
						const feedback = context.createGain();
						feedback.gain.value = 0.8;
						input.connect( delay );
						delay.connect( feedback );
						feedback.connect( delay );
						service.setBusInsert( "sfx", {
							"input": input,
							"output": delay,
							"dispose": () => {
								disposed += 1;
							}
						} );
						$.sound( { "duration": 0.05, "volume": 0.8, "oType": "sine" } );
					} },
					{ "time": 0.7, "run": () => {
						mutedAt = new AudioContext().currentTime;
						service.setBusVolume( "sfx", 0 );
					} }
				] } ).then( render => ( { ...render, "disposed": disposed, "mutedAt": mutedAt } ) );
			}, { "stubs": STUBS } );
			if( !result ) {
				return;
			}
			assert.equal( result.disposed, 0 );
			const left = channel( result );
			assert.ok( g_metrics.peak( left, frame( 0.4 ), frame( 0.7 ) ) > 0.1, "echoes" );
			const silentFrom = frame( result.mutedAt + LEAD + STOP_FADE ) + 1;
			assert.ok( g_metrics.isSilent( left, silentFrom, left.length ) );
		}
	);

	test( "taps read a bus in parallel and untap only their own connection", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			const reads = {};
			let sfxTap = null;
			let masterAnalyser = null;
			let sfxAnalyser = null;
			let other = null;
			function level( analyser ) {
				const data = new Float32Array( analyser.fftSize );
				analyser.getFloatTimeDomainData( data );
				return Math.max( ...data.map( Math.abs ) );
			}
			function head( analyser ) {
				const data = new Float32Array( analyser.fftSize );
				analyser.getFloatTimeDomainData( data );
				return Array.from( data.subarray( 0, 64 ) );
			}
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					const context = service.getContext();
					sfxAnalyser = context.createAnalyser();
					other = context.createAnalyser();
					masterAnalyser = context.createAnalyser();
					sfxTap = service.tapBus( "sfx", sfxAnalyser );
					service.tapBus( "sfx", other );
					service.tapBus( "master", masterAnalyser );
					$.sound( { "duration": 1, "volume": 0.5, "oType": "sine" } );
				} },
				{ "time": 0.3, "run": () => {
					reads.before = level( sfxAnalyser );
					sfxTap();
					sfxTap();
					$.setSoundLimiter( true );
				} },
				{ "time": 0.6, "run": () => {
					reads.after = head( sfxAnalyser );
					reads.other = head( other );
					reads.master = level( masterAnalyser );
				} },
				{ "time": 0.7, "run": () => {
					reads.afterLater = head( sfxAnalyser );
					reads.otherLater = head( other );
				} }
			] } ).then( render => ( { ...render, "reads": reads } ) );
		}, { "stubs": STUBS } );
		if( !result ) {
			return;
		}
		assert.ok( result.reads.before > 0.4, `before ${result.reads.before}` );

		// The untapped analyser no longer follows the tone; the other tap still does
		assert.deepEqual( result.reads.afterLater, result.reads.after );
		assert.notDeepEqual( result.reads.otherLater, result.reads.other );

		// A master tap survives limiter re-routing
		assert.ok( result.reads.master > 0.4, `master ${result.reads.master}` );
		const left = channel( result );
		assert.ok( g_metrics.peak( left, frame( 0.6 ), frame( 0.9 ) ) > 0.4 );
	} );

	test( "only tapBus accepts the output stage", async t => {
		const result = await suite.inHarness( t, {}, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			const codeOf = __stubs.codeOf;
			const context = service.getContext();
			const analyser = context.createAnalyser();
			let untap = null;
			const tap = codeOf( () => {
				untap = service.tapBus( "output", analyser );
			} );
			untap();
			untap();
			let message = null;
			try {
				service.tapBus( "drums", analyser );
			} catch( error ) {
				message = error.message;
			}
			return {
				"tap": tap,
				"untapType": typeof untap,
				"message": message,
				"insert": codeOf( () => service.setBusInsert( "output", null ) ),
				"volume": codeOf( () => service.setBusVolume( "output", 0.5 ) ),
				"command": codeOf( () => $.setBusVolume( "output", 0.5 ) )
			};
		}, { "stubs": STUBS } );
		if( !result ) {
			return;
		}
		assert.equal( result.tap, null );
		assert.equal( result.untapType, "function" );
		assert.match( result.message, /master, output\.$/ );
		assert.equal( result.insert, "INVALID_BUS" );
		assert.equal( result.volume, "INVALID_BUS" );
		assert.equal( result.command, "INVALID_BUS" );
	} );

	test( "an output tap matches the destination as the limiter turns off and on", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			const reads = [];
			let analyser = null;
			function read( limiter ) {
				const data = new Float32Array( analyser.fftSize );
				analyser.getFloatTimeDomainData( data );
				reads.push( {
					"limiter": limiter,
					"time": service.getContext().currentTime,
					"data": Array.from( data )
				} );
			}
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setVolume( 1 );
					analyser = service.getContext().createAnalyser();
					service.tapBus( "output", analyser );

					// Loud enough that the limiter visibly changes the signal
					for( const frequency of [ 220, 330 ] ) {
						$.sound( {
							"frequency": frequency, "duration": 1.1, "volume": 1, "oType": "square"
						} );
					}
				} },
				{ "time": 0.3, "run": () => {
					read( true );
					$.setSoundLimiter( false );
				} },
				{ "time": 0.6, "run": () => {
					read( false );
					$.setSoundLimiter( true );
				} },
				{ "time": 0.9, "run": () => read( true ) }
			] } ).then( render => ( { ...render, "reads": reads } ) );
		}, { "stubs": STUBS } );
		if( !result ) {
			return;
		}
		const left = channel( result );
		const right = channel( result, 1 );
		const peaks = {};
		for( const entry of result.reads ) {

			// The analyser holds the most recent frames before the read; find that window in
			// the destination near the read time and require an exact match
			const size = entry.data.length;
			const end = Math.round( entry.time * RATE );
			let best = Infinity;
			for( let start = end - size - 4096; start <= end - size + 256; start++ ) {
				if( start < 0 ) {
					continue;
				}
				let worst = 0;
				for( let i = 0; i < size && worst <= best; i++ ) {
					worst = Math.max( worst, Math.abs( left[ start + i ] - entry.data[ i ] ) );
				}
				best = Math.min( best, worst );
			}
			assert.ok( best <= 1e-7, `limiter ${entry.limiter}: window differs by ${best}` );
			const key = String( entry.limiter );
			const peak = Math.max( ...entry.data.map( Math.abs ) );
			peaks[ key ] = Math.max( peaks[ key ] ?? 0, peak );
		}

		// Both channels carry the centered tones, and the limiter changed the level
		assert.deepEqual(
			Array.from( left.subarray( 0, 4096 ) ), Array.from( right.subarray( 0, 4096 ) )
		);
		assert.ok( peaks.true <= 1, `limited peak ${peaks.true}` );
		assert.ok( peaks.false > peaks.true, `unlimited ${peaks.false}, limited ${peaks.true}` );
	} );

	test( "createVoice requests follow the pending, bus, and locked-context rules", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.6 }, "needsSuspend": true
		}, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			const created = {};
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.setVolume( 1 );
					service.setBusVolume( "music", 0.5 );
					service.createVoice( {
						"duration": 0.2, "volume": 0.8, "oType": "sine", "delay": 1,
						"inserts": [ __stubs.makeInsert( "pending" ) ]
					} );
					service.createVoice( {
						"duration": 0.2, "volume": 0.8, "oType": "sine", "bus": "music"
					} );
					created.initial = __stubs.events( "pending" ).length;
				} },
				{ "time": 0.5, "run": () => {
					created.beforeWindow = __stubs.events( "pending" ).length;
				} }
			] } ).then( render => ( {
				...render,
				"created": created,
				"pending": __stubs.events( "pending" )
			} ) );
		}, { "stubs": STUBS } );
		if( !result ) {
			return;
		}

		// The pending request holds its descriptor and builds its insert inside the window
		assert.equal( result.created.initial, 0 );
		assert.equal( result.created.beforeWindow, 0 );
		assert.deepEqual( result.pending, [ "factory", "start", "stop", "dispose" ] );
		const left = channel( result );
		assertNear(
			g_metrics.peak( left, frame( 0.05 ), frame( 0.18 ) ), 0.4, 0.01, "music bus"
		);
		const onset = g_metrics.firstNonSilent( left.subarray( frame( 0.5 ) ) ) + frame( 0.5 );
		assertNear( onset / RATE, 1, 0.002, "pending start" );

		const locked = await suite.inHarness( t, {
			"config": { "duration": 0.5, "locked": true }
		}, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			const id = service.createVoice( {
				"duration": 0.1, "inserts": [ __stubs.makeInsert( "locked" ) ]
			} );
			service.stopVoice( id );
			return { "id": id, "events": __stubs.events( "locked" ) };
		}, { "stubs": STUBS } );
		assert.match( locked.id, /^sound_\d+$/ );
		assert.deepEqual( locked.events, [] );
	} );

	test( "observePlay reports each admitted note once, in time order, and the song's end",
		async t => {
			const song = "T120 L4 V40 O3 C, L8 V80 O4 MP50 C D E F";
			const parsed = g_play.parsePlayString( song ).events;
			const result = await suite.inHarness( t, {
				"config": { "duration": 1.6 }, "needsSuspend": true
			}, observeSongs, {
				"stubs": STUBS,
				"actions": [ { "time": 0, "run": `ids => { ids.push( $.play( "${song}" ) ); }` } ]
			} );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.errors, [] );
			const trackId = result.ids[ 0 ];
			const notes = notesOf( result );
			const voices = playVoices( result.sources );
			assert.equal( notes.length, parsed.length );
			assert.equal( voices.length, parsed.length );
			notes.forEach( ( note, i ) => {
				const event = parsed[ i ];
				assert.equal( note.trackId, trackId );
				assert.equal( note.track, event.track );
				assertNear( note.time, LEAD + event.time, 1e-9, `note ${i} time` );
				assertNear( note.time, voices[ i ].startTime, 1e-9, `note ${i} source` );
				assertNear(
					note.duration, event.env.gate + event.env.release, 1e-9, `note ${i} length`
				);
				assert.equal( note.frequency, event.frequency );
				assert.equal( note.volume, event.peak );
				assert.equal( note.frozen, true );

				// Notes are reported ahead of their audible start
				assert.ok( note.at <= note.time, `note ${i} reported early` );
			} );
			assert.deepEqual( notes.map( note => note.track ), [ 0, 1, 1, 1, 1 ] );
			for( let i = 1; i < notes.length; i++ ) {
				assert.ok( notes[ i ].time >= notes[ i - 1 ].time );
			}

			// The end follows the last note's release, once
			const ends = endsOf( result );
			assert.equal( ends.length, 1 );
			assert.equal( ends[ 0 ].trackId, trackId );
			assert.equal( ends[ 0 ].stopped, false );
			assert.equal( ends[ 0 ].frozen, true );
			assert.equal( result.events[ result.events.length - 1 ].type, "end" );
			const last = notes[ notes.length - 1 ];
			assert.ok( ends[ 0 ].at >= last.time + last.duration );
		}
	);

	test( "stopPlay() reports a stopped end once and no later notes", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1 }, "needsSuspend": true
		}, observeSongs, {
			"stubs": STUBS,
			"actions": [
				{ "time": 0, "run": "ids => { ids.push( $.play( 'T120 L8 CDEFGAB>CDEFGAB' ) ); }" },
				{ "time": 0.3, "run": "ids => { ids.push( $.play( 'T120 L8 O3 CDEFGAB' ) ); }" },
				{ "time": 0.4, "run": "ids => { $.stopPlay( ids[ 0 ] ); }" },
				{ "time": 0.5, "run": "ids => { $.stopPlay( ids[ 0 ] ); $.stopPlay(); }" },
				{ "time": 0.6, "run": "ids => { $.stopPlay(); $.stopPlay( ids[ 1 ] ); }" }
			]
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const [ first, second ] = result.ids;
		const ends = endsOf( result );
		assert.deepEqual( ends.map( end => [ end.trackId, end.stopped ] ), [
			[ first, true ], [ second, true ]
		] );
		assertNear( ends[ 0 ].at, 0.4, 0.03, "first stop" );
		assertNear( ends[ 1 ].at, 0.5, 0.03, "stop all" );

		// Each song's notes were all reported before its end, and every voice was reported
		for( const end of ends ) {
			const notes = notesOf( result ).filter( note => note.trackId === end.trackId );
			assert.ok( notes.length > 0 );
			assert.ok( notes.every( note => note.at <= end.at ) );
		}
		assert.equal( notesOf( result ).length, playVoices( result.sources ).length );
	} );

	test( "observePlay listeners are isolated, removable, and validated", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.4 }, "needsSuspend": true
		}, arg => {
			eval( arg.stubs );
			const service = __stubs.service();
			const logged = [];
			const error = console.error;
			console.error = ( ...args ) => {
				logged.push( String( args[ 0 ] ) );
			};
			const counts = { "throwing": 0, "kept": 0, "removed": 0 };
			service.observePlay( () => {
				counts.throwing += 1;
				throw new Error( "listener failed" );
			} );
			const kept = () => {
				counts.kept += 1;
			};
			service.observePlay( kept );
			service.observePlay( kept );
			const remove = service.observePlay( () => {
				counts.removed += 1;
			} );
			const codes = [ __stubs.codeOf( () => service.observePlay( 5 ) ) ];
			return __audioHarness.render( { "actions": [
				{ "time": 0, "run": () => {
					$.setSoundLimiter( false );
					$.play( "T120 L8 C D E F" );
				} },
				{ "time": 0.3, "run": () => {
					remove();
					remove();
				} }
			] } ).then( render => {
				console.error = error;
				return {
					...render,
					"counts": counts,
					"logged": logged,
					"codes": codes,
					"sources": __audioHarness.sources()
				};
			} );
		}, { "stubs": STUBS } );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		assert.deepEqual( result.codes, [ "INVALID_LISTENER" ] );

		// Four notes and one end; a duplicate registration counts once
		assert.equal( playVoices( result.sources ).length, 4 );
		assert.equal( result.counts.throwing, 5 );
		assert.equal( result.counts.kept, 5 );
		assert.ok( result.counts.removed > 0 && result.counts.removed < 5 );
		assert.equal( result.logged.length, 5 );
		assert.ok( result.logged.every( line => line.startsWith( "sound: Play observer" ) ) );
	} );

	test( "observePlay does not report expired or skipped notes after a stall", async t => {
		const release = 0.32;
		const grace = "T100 L8 SINE O5 P8 A";
		const songs = [
			"T255 L64 MS " + "CDEFGAB".repeat( 5 ), "T120 L8 ML O3 C D E F", grace
		];
		const total = songs.reduce( ( sum, song ) => {
			return sum + g_play.parsePlayString( song ).events.length;
		}, 0 );
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, observeSongs, {
			"stubs": STUBS,
			"actions": [
				{ "time": 0, "run": `ids => {
					ids.push( $.play( "${songs[ 0 ]}" ), $.play( "${songs[ 1 ]}" ) );
					ids.push( $.play( "${songs[ 2 ]}" ) );
					__audioHarness.holdTimers( true );
				}` },
				{ "time": release, "run": `() => {
					__audioHarness.holdTimers( false );
					__audioHarness.advance( 0 );
				}` }
			]
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		const notes = notesOf( result ).slice().sort( ( a, b ) => a.time - b.time );
		const voices = playVoices( result.sources );
		assert.ok( voices.length < total, `${voices.length} of ${total} notes admitted` );
		assert.equal( notes.length, voices.length );
		notes.forEach( ( note, i ) => {
			assertNear( note.time, voices[ i ].startTime, 1e-9, `note ${i}` );
		} );

		// A note admitted late within grace reports its delayed audible start and the rest of
		// its length
		const [ event ] = g_play.parsePlayString( grace ).events;
		const late = notesOf( result ).filter( note => note.trackId === result.ids[ 2 ] );
		assert.equal( late.length, 1 );
		assertNear( late[ 0 ].time, release + LEAD, 1e-9, "grace start" );
		const end = LEAD + event.time + event.env.gate + event.env.release;
		assertNear( late[ 0 ].duration, end - late[ 0 ].time, 1e-9, "grace length" );
		assert.deepEqual( endsOf( result ).map( end => end.stopped ), [ false, false, false ] );
	} );

	test( "observePlay does not report notes rejected by the voice cap", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 0.8 }, "needsSuspend": true
		}, observeSongs, {
			"stubs": STUBS,
			"loader": g_fixtures.PAGE_LOADER,
			"wav": g_fixtures.wavBase64( g_fixtures.chirp( 0.5, 1 ) ),
			"actions": [ { "time": 0, "run": `( ids, loopId ) => {
				for( let i = 0; i < 64; i++ ) {
					$.playAudio( { "audioId": loopId, "loop": true, "volume": 0.01 } );
				}
				ids.push( $.play( "T120 L16 C D E" ) );
			}` } ]
		} );
		if( !result ) {
			return;
		}
		assert.deepEqual( result.errors, [] );
		assert.equal( playVoices( result.sources ).length, 0 );
		assert.deepEqual( notesOf( result ), [] );
		assert.deepEqual( endsOf( result ).map( end => [ end.trackId, end.stopped ] ), [
			[ result.ids[ 0 ], false ]
		] );
	} );
} );
