/**
 * Unit tests for the pure parts of the sound-advanced plugin: pulse wave tables, the LFSR
 * sequence, synth option validation and voice specs, preset and instrument snapshots, effect
 * options, and level measurement. The modules are imported directly; nothing here creates an
 * AudioContext or invokes an insert factory.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_analyser from "../../plugins/sound-advanced/analyser.js";
import * as g_effects from "../../plugins/sound-advanced/effects.js";
import * as g_instruments from "../../plugins/sound-advanced/instruments.js";
import * as g_periodicNoise from "../../plugins/sound-advanced/periodic-noise.js";
import * as g_presets from "../../plugins/sound-advanced/presets.js";
import * as g_synth from "../../plugins/sound-advanced/synth.js";
const assert = g_assert;
const test = g_test.test;

function near( actual, expected, tolerance = 1e-9 ) {
	assert.ok(
		Math.abs( actual - expected ) <= tolerance,
		`${actual} is not within ${tolerance} of ${expected}`
	);
}

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
