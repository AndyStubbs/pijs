/**
 * Unit tests for the pure parts of the sound-advanced plugin: pulse wave tables, the LFSR
 * sequence, synth option validation and voice specs, preset and instrument snapshots, effect
 * options, level measurement, the music sync queue and dispatch rules on a fake clock, sample
 * source types and their playback-rate schedule on a fake context, and sample instruments. The
 * modules are imported directly; nothing here creates an AudioContext or invokes an insert
 * factory.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_assertNear from "./assert-near.js";
import * as g_analyser from "../../plugins/sound-advanced/analyser.js";
import * as g_effects from "../../plugins/sound-advanced/effects.js";
import * as g_instruments from "../../plugins/sound-advanced/instruments.js";
import * as g_periodicNoise from "../../plugins/sound-advanced/periodic-noise.js";
import * as g_presets from "../../plugins/sound-advanced/presets.js";
import * as g_sampleSource from "../../plugins/sound-advanced/sample-source.js";
import * as g_synth from "../../plugins/sound-advanced/synth.js";
import * as g_sync from "../../plugins/sound-advanced/sync.js";
const assert = g_assert;
const test = g_test.test;
const near = g_assertNear.near;

/**
 * Evaluate a Fourier series at a phase in [0, 1).
 *
 * @param {Array<Array<number>>} tables - [ real, imag ]
 * @param {number} phase - Fraction of the period
 * @returns {number} Value
 */
function synthesize( tables, phase ) {
	let value = 0;
	for( let n = 1; n < tables[ 0 ].length; n++ ) {
		const angle = 2 * Math.PI * n * phase;
		value += tables[ 0 ][ n ] * Math.cos( angle ) + tables[ 1 ][ n ] * Math.sin( angle );
	}
	return value;
}

test( "pulse tables describe a pulse of the requested duty without DC", () => {
	for( const duty of [ 0.125, 0.25, 0.3, 0.5, 0.75 ] ) {
		const tables = g_synth.pulseWaveTables( duty );
		assert.equal( tables[ 0 ][ 0 ], 0 );
		assert.equal( tables[ 1 ][ 0 ], 0 );

		// A ±1 pulse minus its DC of 2d − 1, sampled mid-way through each half
		near( synthesize( tables, duty / 2 ), 2 - 2 * duty, 0.05 );
		near( synthesize( tables, ( 1 + duty ) / 2 ), -2 * duty, 0.05 );
	}
	const square = g_synth.pulseWaveTables( 0.5 );
	for( let n = 1; n < 8; n++ ) {
		near( square[ 0 ][ n ], 0, 1e-12 );
		if( n % 2 === 0 ) {
			near( square[ 1 ][ n ], 0, 1e-12 );
		} else {
			near( square[ 1 ][ n ], 4 / ( Math.PI * n ) );
		}
	}
	assert.equal( g_synth.pulseWaveTables( 0.5 ), square );
	assert.ok( Object.isFrozen( square ) && Object.isFrozen( square[ 0 ] ) );
} );

test( "the LFSR repeats every 93 steps in short mode and 32,767 in long mode", () => {
	const short = g_periodicNoise.lfsrSequence( true );
	const long = g_periodicNoise.lfsrSequence( false );
	assert.equal( short.length, 93 );
	assert.equal( long.length, 32767 );
	assert.ok( short.every( value => value === 1 || value === -1 ) );
	assert.deepEqual( g_periodicNoise.lfsrSequence( true ), short );
	assert.equal( g_periodicNoise.PERIODIC_TYPE, "periodic" );
} );

test( "synth options take sound() defaults and validate every parameter", () => {
	const resolved = g_synth.resolveSynthOptions( "synth", {} );
	assert.equal( resolved.frequency, 440 );
	assert.equal( resolved.duration, 1 );
	assert.equal( resolved.oType, "triangle" );
	assert.equal( resolved.releaseTime, 0.1 );
	assert.equal( resolved.filterType, null );
	assert.equal( resolved.duty, 0.5 );
	assert.equal( resolved.arpeggio, null );

	const cases = [
		[ { "volume": 2 }, "INVALID_VOLUME" ],
		[ { "duration": -1 }, "INVALID_DURATION" ],
		[ { "pan": 3 }, "INVALID_PAN" ],
		[ { "frequency": 0, "frequencyEnd": 100 }, "INVALID_FREQUENCY" ],
		[ { "oType": 5 }, "INVALID_OTYPE" ],
		[ { "filterType": "comb" }, "INVALID_FILTER_TYPE" ],
		[ { "filterCutoff": 0 }, "INVALID_FILTER_CUTOFF" ],
		[ { "filterQ": -1 }, "INVALID_FILTER_Q" ],
		[ { "filterAttackTime": -1 }, "INVALID_FILTER_ATTACK_TIME" ],
		[ { "filterSustainLevel": 2 }, "INVALID_FILTER_SUSTAIN_LEVEL" ],
		[ { "filterAmount": 11 }, "INVALID_FILTER_AMOUNT" ],
		[ { "vibratoRate": 0 }, "INVALID_VIBRATO_RATE" ],
		[ { "vibratoDepth": 2000 }, "INVALID_VIBRATO_DEPTH" ],
		[ { "tremoloDepth": 1.5 }, "INVALID_TREMOLO_DEPTH" ],
		[ { "duty": 1 }, "INVALID_DUTY" ],
		[ { "arpeggio": [] }, "INVALID_ARPEGGIO" ],
		[ { "arpeggio": [ 0, 60 ] }, "INVALID_ARPEGGIO" ],
		[ { "arpeggioRate": 0 }, "INVALID_ARPEGGIO_RATE" ]
	];
	for( const [ options, code ] of cases ) {
		assert.throws( () => g_synth.resolveSynthOptions( "synth", options ), { "code": code } );
	}
	assert.throws(
		() => g_synth.resolveSynthOptions( "sfx", null ),
		{ "code": "INVALID_OPTIONS", "message": /^sfx: / }
	);
} );

test( "synth specs turn features into insert descriptors and pulse into wave tables", () => {
	const plain = g_synth.resolveSynthSpec( "synth", { "oType": "square" } );
	assert.equal( plain.oType, "square" );
	assert.deepEqual( plain.inserts, [] );

	const arpeggio = [ 0, 4, 7 ];
	const spec = g_synth.resolveSynthSpec( "synth", {
		"oType": "pulse", "duty": 0.25, "releaseTime": 0.2,
		"filterType": "lowpass", "filterCutoff": 800, "filterAmount": 2,
		"filterDecayTime": 0.3, "tremoloDepth": 0.5, "vibratoDepth": 20,
		"arpeggio": arpeggio, "arpeggioRate": 16
	} );
	assert.equal( spec.oType, g_synth.pulseWaveTables( 0.25 ) );
	assert.deepEqual(
		spec.inserts.map( insert => Object.keys( insert.params ) ),
		[
			[ "type", "cutoff", "q", "amount", "envelope" ],
			[ "rate", "depth" ],
			[ "rate", "depth" ],
			[ "steps", "rate", "releaseTime" ]
		]
	);
	assert.deepEqual( spec.inserts[ 0 ].params.envelope, {
		"attackTime": 0, "decayTime": 0.3, "sustainLevel": 1, "releaseTime": 0.1
	} );
	assert.deepEqual( spec.inserts[ 3 ].params.steps, [ 0, 400, 700 ] );
	assert.equal( spec.inserts[ 3 ].params.releaseTime, 0.2 );

	// The pattern is copied
	arpeggio.push( 12 );
	assert.equal( spec.inserts[ 3 ].params.steps.length, 3 );
	for( const insert of spec.inserts ) {
		assert.equal( typeof insert.factory, "function" );
	}
} );

test( "presets are validated, frozen, and varied within the jitter limits", () => {
	const params = { "frequency": 300, "frequencyEnd": 600, "duration": 0.2 };
	g_presets.storePreset( "unit", params );
	params.frequency = 1;
	const preset = g_presets.getPreset( "unit" );
	assert.equal( preset.frequency, 300 );
	assert.ok( Object.isFrozen( preset ) );
	assert.equal( g_presets.varyPreset( preset, 0, () => 0.9 ), preset );

	const up = g_presets.varyPreset( preset, 1, () => 1 );
	near( up.frequency, 300 * Math.pow( 2, 3 / 12 ) );
	near( up.frequencyEnd, 600 * Math.pow( 2, 3 / 12 ) );
	near( up.duration, 0.22 );
	const down = g_presets.varyPreset( preset, 0.5, () => 0 );
	near( down.frequency, 300 * Math.pow( 2, -1.5 / 12 ) );
	near( down.duration, 0.19 );

	assert.throws(
		() => g_presets.storePreset( "", {} ), { "code": "INVALID_PRESET_NAME" }
	);
	assert.throws(
		() => g_presets.storePreset( "bad", [] ), { "code": "INVALID_PRESET" }
	);
	assert.throws(
		() => g_presets.storePreset( "bad", { "duty": 0 } ),
		{ "code": "INVALID_DUTY", "message": /^definePreset: / }
	);
	for( const name of Object.keys( g_presets.BUILT_IN_PRESETS ) ) {
		g_presets.storePreset( name, g_presets.BUILT_IN_PRESETS[ name ] );
	}
} );

test( "instruments override only what they set and snapshot at resolution", () => {
	const note = Object.freeze( {
		"frequency": 262, "frequencyEnd": null, "time": 0, "gate": 0.3, "volume": 0.8,
		"envelope": Object.freeze( {
			"attackTime": 0.05, "decayTime": 0.07, "sustainLevel": 0.65, "releaseTime": 0.09
		} ),
		"pan": 0, "oType": "triangle", "waveTables": null, "inserts": null
	} );
	assert.equal( g_instruments.resolveNote( { "instrument": 0 }, note ), null );

	g_instruments.storeInstrument( 20, { "oType": "sawtooth", "releaseTime": 0.3 } );
	const first = g_instruments.resolveNote( { "instrument": 20 }, note );
	assert.deepEqual( first, { "oType": "sawtooth", "envelope": { "releaseTime": 0.3 } } );

	g_instruments.storeInstrument( 20, {
		"oType": "pulse", "duty": 0.25, "volume": 0.5, "frequency": 150, "frequencyEnd": 45,
		"arpeggio": [ 0, 12 ]
	} );
	const second = g_instruments.resolveNote( { "instrument": 20 }, note );
	assert.equal( second.oType, g_synth.pulseWaveTables( 0.25 ) );
	near( second.volume, 0.4 );
	assert.equal( second.frequency, 150 );
	assert.equal( second.frequencyEnd, 45 );
	assert.equal( second.envelope, undefined );
	assert.equal( second.inserts.length, 1 );

	// The arpeggio runs through the note's own release
	assert.equal( second.inserts[ 0 ].params.releaseTime, 0.09 );

	// Earlier resolutions are unaffected
	assert.equal( first.oType, "sawtooth" );

	g_instruments.storeInstrument( 20, null );
	assert.equal( g_instruments.resolveNote( { "instrument": 20 }, note ), null );
	assert.throws(
		() => g_instruments.storeInstrument( 0, {} ), { "code": "INVALID_INSTRUMENT" }
	);
	assert.throws(
		() => g_instruments.storeInstrument( 256, {} ), { "code": "INVALID_INSTRUMENT" }
	);
	assert.throws(
		() => g_instruments.storeInstrument( 1.5, {} ), { "code": "INVALID_INSTRUMENT" }
	);
	assert.throws(
		() => g_instruments.storeInstrument( 5, "square" ),
		{ "code": "INVALID_INSTRUMENT_PARAMS" }
	);
	for( const key of Object.keys( g_instruments.BUILT_IN_INSTRUMENTS ) ) {
		g_instruments.storeInstrument( Number( key ), g_instruments.BUILT_IN_INSTRUMENTS[ key ] );
	}
} );

test( "effect options take defaults and reject values outside their ranges", () => {
	assert.deepEqual(
		g_effects.resolveEffectOptions( "reverb", null ),
		{ "time": 2, "decay": 3, "mix": 0.3 }
	);
	assert.deepEqual(
		g_effects.resolveEffectOptions( "delay", { "time": 0.5 } ),
		{ "time": 0.5, "feedback": 0.4, "mix": 0.3 }
	);
	assert.throws(
		() => g_effects.resolveEffectOptions( "delay", { "feedback": 1 } ),
		{ "code": "INVALID_EFFECT_OPTION" }
	);
	assert.throws(
		() => g_effects.resolveEffectOptions( "reverb", { "time": "long" } ),
		{ "code": "INVALID_EFFECT_OPTION" }
	);
	assert.throws(
		() => g_effects.resolveEffectOptions( "reverb", 2 ), { "code": "INVALID_OPTIONS" }
	);
	assert.deepEqual(
		g_effects.resolveEffectOptions( "filter", { "type": "highpass" } ),
		{ "type": "highpass", "cutoff": 1000, "q": 1 }
	);
	assert.deepEqual(
		g_effects.resolveEffectOptions( "distortion", null ),
		{ "drive": 0.5, "tone": 4000, "mix": 1 }
	);
	assert.deepEqual(
		g_effects.resolveEffectOptions( "bitcrush", { "bits": "4" } ),
		{ "bits": 4, "rate": 1, "mix": 1 }
	);
	assert.deepEqual(
		g_effects.resolveEffectOptions( "chorus", null ),
		{ "rate": 1.5, "depth": 3, "mix": 0.5 }
	);
	for( const [ effect, options ] of [
		[ "filter", { "type": "notch" } ], [ "filter", { "cutoff": 10 } ],
		[ "filter", { "q": 0 } ], [ "distortion", { "tone": 100 } ],
		[ "bitcrush", { "bits": 0 } ], [ "bitcrush", { "rate": 65 } ],
		[ "chorus", { "depth": 11 } ], [ "chorus", { "rate": 0 } ]
	] ) {
		assert.throws(
			() => g_effects.resolveEffectOptions( effect, options ),
			{ "code": "INVALID_EFFECT_OPTION" },
			`${effect} ${JSON.stringify( options )}`
		);
	}
} );

test( "effect chains resolve in order, and an empty chain removes the effect", () => {
	assert.equal( g_effects.resolveChain( null ), null );
	assert.equal( g_effects.resolveChain( [] ), null );
	assert.deepEqual( g_effects.resolveChain( "filter", { "cutoff": 500 } ), [
		{ "effect": "filter", "opts": { "type": "lowpass", "cutoff": 500, "q": 1 } }
	] );
	assert.deepEqual( g_effects.resolveChain( [
		{ "effect": "filter", "type": "bandpass" },
		{ "effect": "reverb", "time": 1 }
	] ), [
		{ "effect": "filter", "opts": { "type": "bandpass", "cutoff": 1000, "q": 1 } },
		{ "effect": "reverb", "opts": { "time": 1, "decay": 3, "mix": 0.3 } }
	] );
	const item = { "effect": "delay" };
	assert.equal( g_effects.resolveChain( [ item, item, item, item ] ).length, 4 );
	for( const [ effect, options, code ] of [
		[ "flanger", undefined, "INVALID_EFFECT" ],
		[ 3, undefined, "INVALID_EFFECT" ],
		[ [ item, item, item, item, item ], undefined, "INVALID_EFFECT" ],
		[ [ null ], undefined, "INVALID_EFFECT" ],
		[ [ "delay" ], undefined, "INVALID_EFFECT" ],
		[ [ { "effect": "toString" } ], undefined, "INVALID_EFFECT" ],
		[ [ item ], { "time": 1 }, "INVALID_OPTIONS" ],
		[ [ { "effect": "delay", "feedback": 1 } ], undefined, "INVALID_EFFECT_OPTION" ]
	] ) {
		assert.throws(
			() => g_effects.resolveChain( effect, options ), { "code": code },
			JSON.stringify( effect )
		);
	}
} );

test( "levels are the peak magnitude and RMS of the block", () => {
	assert.deepEqual( g_analyser.measureLevels( new Float32Array( 0 ) ), { "peak": 0, "rms": 0 } );
	const levels = g_analyser.measureLevels( Float32Array.from( [ 0.5, -1, 0.5, 0 ] ) );
	assert.equal( levels.peak, 1 );
	near( levels.rms, Math.sqrt( 1.5 / 4 ) );
} );

/**
 * A music sync instance on a fake clock. Page time is context time × 1000 plus the offset,
 * and frames run only when the test calls frame( now ).
 *
 * @returns {Object} { sync, host, frames, emit, frame }
 */
function createSyncHarness() {
	const frames = [];
	const host = {
		"listener": null,
		"observeCount": 0,
		"offset": 0,
		"contextNow": 0,
		"pageNow": 0,
		"observePlay": listener => {
			host.listener = listener;
			host.observeCount += 1;
			return () => {
				host.listener = null;
			};
		},
		"now": () => host.pageNow,
		"contextTime": () => host.contextNow,
		"pageOffset": () => host.offset,
		"requestFrame": fn => {
			frames.push( fn );
		}
	};
	return {
		"sync": g_sync.createPlaySync( host ),
		"host": host,
		"frames": frames,
		"emit": event => host.listener( Object.freeze( event ) ),
		"frame": now => {
			host.pageNow = now;
			for( const fn of frames.splice( 0 ) ) {
				fn();
			}
		}
	};
}

/**
 * An observePlay note event
 *
 * @param {number} trackId - Song ID
 * @param {number} time - Audible start in context time
 * @returns {Object} Note event
 */
function playNote( trackId, time ) {
	return {
		"type": "note", "trackId": trackId, "track": 0, "time": time, "duration": 0.1,
		"frequency": 440, "volume": 0.5
	};
}

test( "music sync dispatches events at their audible time, in order, with their delay", () => {
	const harness = createSyncHarness();
	const received = [];
	const other = [];
	harness.sync.onPlay( { "mode": "note", "fn": data => received.push( data ) } );
	harness.sync.onPlay( { "mode": "note", "fn": data => other.push( data ) } );
	assert.equal( harness.host.observeCount, 1, "observing starts once, with the first handler" );
	assert.equal( harness.frames.length, 0, "no frame runs while nothing is queued" );

	harness.host.offset = 100;
	harness.emit( playNote( 1, 1.0 ) );
	harness.emit( playNote( 1, 0.5 ) );
	assert.equal( harness.frames.length, 1, "queued events share one pending frame" );
	harness.frame( 590 );
	assert.equal( received.length, 0, "nothing is due before its audible time" );
	harness.frame( 620 );
	assert.deepEqual( received.map( data => data.time ), [ 0.5 ] );
	near( received[ 0 ].delay, 0.02 );
	assert.ok( Object.isFrozen( received[ 0 ] ) );
	assert.equal( other[ 0 ], received[ 0 ], "handlers share one callback object" );
	assert.equal( received[ 0 ].frequency, 440 );
	harness.frame( 1100 );
	assert.deepEqual( received.map( data => data.time ), [ 0.5, 1.0 ] );
	assert.equal( received[ 1 ].delay, 0 );
	assert.equal( harness.frames.length, 0, "the loop stops when the queue is empty" );
} );

test( "music sync drops late notes but always delivers song ends", () => {
	const harness = createSyncHarness();
	const notes = [];
	const ends = [];
	harness.sync.onPlay( { "mode": "note", "fn": data => notes.push( data ) } );
	harness.sync.onPlay( { "mode": "end", "fn": data => ends.push( data ) } );
	harness.emit( playNote( 1, 0.1 ) );
	harness.emit( playNote( 1, 1.0 ) );
	harness.host.contextNow = 0.4;
	harness.emit( { "type": "end", "trackId": 1, "stopped": false } );

	// 250 ms late is still delivered; later than that is dropped
	harness.frame( 350 );
	assert.deepEqual( notes.map( data => data.time ), [ 0.1 ] );
	near( notes[ 0 ].delay, 0.25 );
	harness.frame( 5000 );
	assert.deepEqual( notes.map( data => data.time ), [ 0.1 ] );
	assert.equal( ends.length, 1 );
	assert.equal( ends[ 0 ].stopped, false );
	near( ends[ 0 ].delay, 4.6 );
} );

test( "a stopped song's queued notes are dropped and its end is delivered once", () => {
	const harness = createSyncHarness();
	const events = [];
	harness.sync.onPlay( { "mode": "note", "fn": data => events.push( data ) } );
	harness.sync.onPlay( { "mode": "end", "fn": data => events.push( data ) } );
	harness.emit( playNote( 1, 0.2 ) );
	harness.emit( playNote( 2, 0.2 ) );
	harness.emit( playNote( 1, 0.3 ) );
	harness.host.contextNow = 0.1;
	harness.emit( { "type": "end", "trackId": 1, "stopped": true } );
	harness.frame( 400 );
	assert.deepEqual(
		events.map( data => `${data.type}:${data.trackId}` ), [ "end:1", "note:2" ],
		"the end is heard at the context time it was reported, before track 2's note"
	);
	assert.equal( events[ 0 ].stopped, true );
} );

test( "music sync handlers follow the input conventions for removal and dispatch", t => {
	const errors = [];
	t.mock.method( console, "error", ( ...args ) => errors.push( args ) );
	const harness = createSyncHarness();
	const calls = [];
	const counted = () => calls.push( "counted" );
	const once = () => calls.push( "once" );
	const throwing = () => {
		calls.push( "throwing" );
		throw new Error( "handler failure" );
	};
	const late = () => calls.push( "late" );
	const removed = () => calls.push( "removed" );
	const adding = () => {
		calls.push( "adding" );
		harness.sync.onPlay( { "mode": "note", "fn": late } );
		harness.sync.offPlay( { "mode": "note", "fn": removed } );
	};
	harness.sync.onPlay( { "mode": "note", "fn": counted } );
	harness.sync.onPlay( { "mode": "note", "fn": counted, "once": true } );
	harness.sync.onPlay( { "mode": "note", "fn": once, "once": true } );
	harness.sync.onPlay( { "mode": "note", "fn": throwing } );
	harness.sync.onPlay( { "mode": "note", "fn": adding } );
	harness.sync.onPlay( { "mode": "note", "fn": removed } );
	harness.emit( playNote( 1, 0.1 ) );
	harness.emit( playNote( 1, 0.2 ) );
	harness.frame( 150 );
	assert.deepEqual( calls, [ "counted", "once", "throwing", "adding" ] );
	assert.equal( errors.length, 1 );
	assert.match( errors[ 0 ][ 0 ], /^onPlay: / );
	calls.length = 0;
	harness.frame( 250 );
	assert.deepEqual( calls, [ "counted", "throwing", "adding", "late" ] );

	// A function without a mode leaves every mode; a mode without a function empties it
	harness.sync.onPlay( { "mode": "end", "fn": counted } );
	harness.sync.offPlay( { "fn": counted } );
	harness.sync.offPlay( { "mode": "note", "fn": null } );
	assert.equal( harness.host.listener, null, "observing stops with the last handler" );
	harness.sync.onPlay( { "mode": "note", "fn": late } );
	harness.emit( playNote( 1, 0.3 ) );
	harness.sync.clear();
	assert.equal( harness.host.listener, null );
	calls.length = 0;
	harness.frame( 400 );
	assert.deepEqual( calls, [], "clearing drops the queue" );
} );

test( "music sync validates handler modes, functions, and flags", () => {
	const harness = createSyncHarness();
	const fn = () => {};
	const cases = [
		[ "onPlay", { "mode": 5, "fn": fn }, TypeError, "INVALID_MODE" ],
		[ "onPlay", { "mode": "start", "fn": fn }, RangeError, "INVALID_MODE" ],
		[ "onPlay", { "mode": "note", "fn": "fn" }, TypeError, "INVALID_FUNCTION" ],
		[ "onPlay", { "mode": "note", "fn": fn, "once": 1 }, TypeError, "INVALID_ONCE" ],
		[ "offPlay", {}, TypeError, "INVALID_MODE" ],
		[ "offPlay", { "mode": "beat" }, RangeError, "INVALID_MODE" ],
		[ "offPlay", { "mode": "note", "fn": 5 }, TypeError, "INVALID_FUNCTION" ]
	];
	for( const [ command, options, ErrorType, code ] of cases ) {
		assert.throws(
			() => harness.sync[ command ]( options ),
			error => error instanceof ErrorType && error.code === code &&
				error.message.startsWith( `${command}: ` ),
			`${command} ${JSON.stringify( options )}`
		);
	}
	assert.equal( harness.host.observeCount, 0, "rejected handlers do not start observing" );
} );

test( "context time maps to page time from the output timestamp or the reported latency", () => {
	const stamped = {
		"currentTime": 2,
		"outputLatency": 0.05,
		"getOutputTimestamp": () => ( { "contextTime": 1.9, "performanceTime": 5000 } )
	};
	assert.equal( g_sync.getPageOffset( stamped, 9999 ), 5000 - 1900 );

	// Before output starts the timestamp is zero, and the render time plus latency stands in
	const starting = {
		"currentTime": 2,
		"outputLatency": 0.05,
		"baseLatency": 0.01,
		"getOutputTimestamp": () => ( { "contextTime": 0, "performanceTime": 0 } )
	};
	near( g_sync.getPageOffset( starting, 6000 ), 6000 - 1950 );
	near( g_sync.getPageOffset( { "currentTime": 2, "baseLatency": 0.01 }, 6000 ), 6000 - 1990 );
	assert.equal( g_sync.getPageOffset( { "currentTime": 2 }, 6000 ), 4000 );
} );

/**
 * A fake playback-rate or detune parameter that records its automation.
 *
 * @returns {Object} Parameter with `value` and an `events` log
 */
function fakeParam() {
	const param = {
		"value": 1,
		"events": [],
		"setValueAtTime": ( value, time ) => param.events.push( [ "set", value, time ] ),
		"exponentialRampToValueAtTime": ( value, time ) => {
			param.events.push( [ "ramp", value, time ] );
		}
	};
	return param;
}

/**
 * A fake audio context whose buffer sources record their calls, and a fake sound service
 * whose buffers can change between notes.
 *
 * @returns {Object} `{ context, service, nodes, buffers, registered }`
 */
function fakeSampleHarness() {
	const nodes = [];
	const buffers = new Map();
	const registered = [];
	const context = {
		"createBufferSource": () => {
			const node = {
				"buffer": null,
				"loop": false,
				"onended": null,
				"playbackRate": fakeParam(),
				"detune": fakeParam(),
				"calls": [],
				"start": when => node.calls.push( [ "start", when ] ),
				"stop": when => node.calls.push( [ "stop", when ] ),
				"disconnect": () => node.calls.push( [ "disconnect" ] )
			};
			nodes.push( node );
			return node;
		}
	};
	const service = {
		"getAudioBuffer": name => buffers.get( name ) ?? null,
		"registerSource": ( type, factory ) => registered.push( [ type, factory ] )
	};
	return { context, service, nodes, buffers, registered };
}

test( "sample source types are named per audio name, root frequency, and loop", () => {
	const name = g_sampleSource.sampleTypeName;
	assert.equal( g_sampleSource.DEFAULT_ROOT_FREQUENCY, 261.63 );
	assert.equal( name( "piano", 261.63, false ), "sample:\"piano\"" );
	assert.equal( name( "piano", 392, false ), "sample:\"piano\"@392" );
	assert.equal( name( "piano", 261.63, true ), "sample:\"piano\":loop" );
	assert.equal( name( "piano", 392, true ), "sample:\"piano\"@392:loop" );

	// Quoting keeps names that look like settings apart
	const types = [
		name( "a", 261.63, true ), name( "a\":loop", 261.63, false ), name( "a@1", 261.63, false ),
		name( "a", 1, false ), name( "a\"@1", 261.63, false )
	];
	assert.equal( new Set( types ).size, types.length );

	// Each setting registers once, and the name is returned every time
	const h = fakeSampleHarness();
	const first = g_sampleSource.getSampleType( h.service, "once", 261.63, false );
	assert.equal( g_sampleSource.getSampleType( h.service, "once", 261.63, false ), first );
	g_sampleSource.getSampleType( h.service, "once", 261.63, true );
	g_sampleSource.getSampleType( h.service, "once", 440, false );
	assert.deepEqual( h.registered.map( item => item[ 0 ] ), [
		"sample:\"once\"", "sample:\"once\":loop", "sample:\"once\"@440"
	] );
} );

test( "a sample source reads the buffer per note and follows the source contract", () => {
	const h = fakeSampleHarness();
	g_sampleSource.getSampleType( h.service, "later", 261.63, false );
	g_sampleSource.getSampleType( h.service, "later", 440, true );
	const [ once, looped ] = h.registered.map( item => item[ 1 ] );
	const spec = Object.freeze( {
		"oType": "sample", "frequency": 523.26, "frequencyEnd": null, "start": 1, "gate": 0.5,
		"end": 1.6, "offset": 0
	} );

	// Not loaded yet: no buffer, so the note is silent
	const silent = once( h.context, spec );
	assert.equal( h.nodes[ 0 ].buffer, null );
	assert.equal( silent.output, h.nodes[ 0 ] );

	const buffer = { "duration": 2 };
	h.buffers.set( "later", buffer );
	const source = looped( h.context, spec );
	const node = h.nodes[ 1 ];
	assert.equal( node.buffer, buffer );
	assert.equal( node.loop, true );
	assert.equal( h.nodes[ 0 ].loop, false );
	near( h.nodes[ 0 ].playbackRate.value, 2 );
	near( node.playbackRate.value, 523.26 / 440 );
	assert.equal( source.frequency, null );
	assert.equal( source.detune, node.detune );

	// Stops only move earlier, the end callback is the node's, and dispose runs once
	const ended = () => {};
	source.onEnded( ended );
	assert.equal( node.onended, ended );
	source.start( 1 );
	source.stop( 1.6 );
	source.stop( 1.7 );
	source.stop( 1.2 );
	source.dispose();
	source.dispose();
	assert.equal( node.onended, null );
	assert.deepEqual( node.calls, [
		[ "start", 1 ], [ "stop", 1.6 ], [ "stop", 1.2 ], [ "disconnect" ]
	] );
} );

test( "a sample's playback rate follows the note's sweep, from its progress when late", () => {
	const schedule = spec => {
		const param = fakeParam();
		g_sampleSource.scheduleRate( param, {
			"frequency": 400, "frequencyEnd": null, "start": 1, "gate": 0.5, "offset": 0,
			...spec
		}, 200 );
		return param;
	};
	const fixed = schedule( {} );
	near( fixed.value, 2 );
	assert.deepEqual( fixed.events, [] );
	assert.deepEqual( schedule( { "frequencyEnd": 100 } ).events, [
		[ "set", 2, 1 ], [ "ramp", 0.5, 1.5 ]
	] );

	// A quarter of the way through the gate, the rate is a quarter of the way down in octaves
	const late = schedule( { "frequencyEnd": 100, "offset": 0.125 } ).events;
	assert.equal( late.length, 2 );
	near( late[ 0 ][ 1 ], 2 * Math.pow( 0.25, 0.25 ) );
	near( late[ 0 ][ 2 ], 1.125 );
	assert.deepEqual( late[ 1 ], [ "ramp", 0.5, 1.5 ] );

	// Past the gate, the rate holds the sweep's end
	assert.deepEqual( schedule( { "frequencyEnd": 100, "offset": 0.6 } ).events, [
		[ "set", 0.5, 1.6 ]
	] );
} );

test( "sample instruments validate audio, rootFrequency, and loop", () => {
	const h = fakeSampleHarness();
	const store = params => g_instruments.storeInstrument( 30, params, h.service );
	const cases = [
		[ { "audio": 5 }, "TypeError", "INVALID_AUDIO" ],
		[ { "audio": "" }, "RangeError", "INVALID_AUDIO" ],
		[ { "audio": "drum", "oType": "sine" }, "Error", "INVALID_INSTRUMENT" ],
		[ { "audio": "drum", "oType": "pulse" }, "Error", "INVALID_INSTRUMENT" ],
		[ { "rootFrequency": 440 }, "Error", "INVALID_INSTRUMENT" ],
		[ { "oType": "sine", "loop": true }, "Error", "INVALID_INSTRUMENT" ],
		[ { "audio": "drum", "rootFrequency": "440" }, "TypeError", "INVALID_ROOT_FREQUENCY" ],
		[ { "audio": "drum", "rootFrequency": 0 }, "RangeError", "INVALID_ROOT_FREQUENCY" ],
		[ { "audio": "drum", "rootFrequency": -1 }, "RangeError", "INVALID_ROOT_FREQUENCY" ],
		[ { "audio": "drum", "rootFrequency": NaN }, "RangeError", "INVALID_ROOT_FREQUENCY" ],
		[
			{ "audio": "drum", "rootFrequency": Infinity }, "RangeError",
			"INVALID_ROOT_FREQUENCY"
		],
		[ { "audio": "drum", "loop": 1 }, "TypeError", "INVALID_LOOP" ]
	];
	for( const [ params, name, code ] of cases ) {
		assert.throws( () => store( params ), { "name": name, "code": code }, code );
	}
	assert.deepEqual( h.registered, [] );

	// Omitted and null options take their defaults
	store( { "audio": "drum", "rootFrequency": null, "loop": null } );
	store( { "audio": "drum", "rootFrequency": 110, "loop": true } );
	store( null );
	assert.deepEqual( h.registered.map( item => item[ 0 ] ), [
		"sample:\"drum\"", "sample:\"drum\"@110:loop"
	] );
} );

test( "sample instruments play their file, or silence with one warning per play() call", t => {
	const h = fakeSampleHarness();
	const warnings = [];
	t.mock.method( console, "warn", message => warnings.push( message ) );
	g_instruments.storeInstrument( 31, {
		"audio": "keys", "rootFrequency": 440, "volume": 0.5, "releaseTime": 0.2
	}, h.service );
	g_instruments.storeInstrument( 32, { "audio": "pads" }, h.service );
	const note = Object.freeze( {
		"frequency": 262, "frequencyEnd": null, "time": 0, "gate": 0.3, "volume": 0.8,
		"envelope": Object.freeze( {
			"attackTime": 0.05, "decayTime": 0.07, "sustainLevel": 0.65, "releaseTime": 0.09
		} ),
		"pan": 0, "oType": "triangle", "waveTables": null, "inserts": null
	} );

	// Not loaded: silent, and one warning per instrument for the tracks of one play() call
	const first = { "instrument": 31, "warned": new Set() };
	const comma = { "instrument": 31, "warned": first.warned };
	const other = { "instrument": 32, "warned": first.warned };
	const silent = g_instruments.resolveNote( first, note );
	assert.deepEqual( silent, {
		"oType": "sample:\"keys\"@440", "envelope": { "releaseTime": 0.2 }, "volume": 0
	} );
	assert.equal( g_instruments.resolveNote( comma, note ).volume, 0 );
	assert.equal( g_instruments.resolveNote( other, note ).volume, 0 );
	assert.deepEqual( warnings, [
		"play: Audio \"keys\" of instrument 31 is not loaded, or is streamed; its notes are " +
		"silent.",
		"play: Audio \"pads\" of instrument 32 is not loaded, or is streamed; its notes are " +
		"silent."
	] );

	// Loaded by a later play() call: the instrument's own volume, and no warning
	h.buffers.set( "keys", { "duration": 1 } );
	const loaded = g_instruments.resolveNote( { "instrument": 31, "warned": new Set() }, note );
	near( loaded.volume, 0.4 );
	assert.equal( loaded.oType, "sample:\"keys\"@440" );
	g_instruments.resolveNote( { "instrument": 32, "warned": new Set() }, note );
	assert.equal( warnings.length, 3 );
	g_instruments.storeInstrument( 31, null );
	g_instruments.storeInstrument( 32, null );
} );
