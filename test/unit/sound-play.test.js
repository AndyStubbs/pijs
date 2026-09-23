/**
 * Unit tests for the PLAY tokenizer, event generation, and PLAY extensions in
 * plugins/sound/play.js. Parsing creates no audio nodes, so no AudioContext is needed.
 *
 * Tests that register extensions run last, because registrations last for the module's
 * lifetime.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_envelope from "../../plugins/sound/envelope.js";
import * as g_play from "../../plugins/sound/play.js";
import * as g_voices from "../../plugins/sound/voices.js";
const assert = g_assert;
const test = g_test.test;

// The 2.2 note table for N1-N115; the formula replaces it
const TABLE_2_2 = [
	0, 16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87, 32.70,
	34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00, 51.91, 55.00, 58.27, 61.74, 65.406, 69.296,
	73.416, 77.782, 82.407, 87.307, 92.499, 97.999, 103.826, 110, 116.541, 123.471, 130.813,
	138.591, 146.832, 155.563, 164.814, 174.614, 184.997, 195.998, 207.652, 220, 233.082, 246.942,
	261.626, 277.183, 293.665, 311.127, 329.628, 349.228, 369.994, 391.995, 415.305, 440, 466.164,
	493.883, 523.251, 554.365, 587.33, 622.254, 659.255, 698.456, 739.989, 783.991, 830.609, 880,
	932.328, 987.767, 1046.502, 1108.731, 1174.659, 1244.508, 1318.51, 1396.913, 1479.978, 1567.982,
	1661.219, 1760, 1864.655, 1975.533, 2093.005, 2217.461, 2349.318, 2489.016, 2637.021, 2793.826,
	2959.955, 3135.964, 3322.438, 3520, 3729.31, 3951.066, 4186.009, 4434.922, 4698.636, 4978.032,
	5274.042, 5587.652, 5919.91, 6271.928, 6644.876, 7040, 7458.62, 7902.132, 8372.018, 8869.844,
	9397.272, 9956.064, 10548.084, 11175.304, 11839.82
];

function names( text ) {
	return g_play.tokenize( text ).map( token => {
		if( token.name === "?" ) {
			return "?" + token.text;
		}
		if( token.value === null || token.value === undefined ) {
			return token.name;
		}
		return token.name + token.value;
	} );
}

function events( playString ) {
	return g_play.parsePlayString( playString ).events;
}

function near( actual, expected, tolerance = 1e-9 ) {
	assert.ok(
		Math.abs( actual - expected ) <= tolerance,
		`${actual} is not within ${tolerance} of ${expected}`
	);
}

function envelopeEnd( event ) {
	return event.time + g_envelope.getEnvelopeLength( event.env );
}

test( "tokenizes the envelope, pan, waveform, and instrument commands", () => {
	assert.deepEqual(
		names( "MA10MD-5MH50MR30MP-50MO-1WNWPWSWQWWWTW2@3MSMNMLMWMBMF" ),
		[
			"MA10", "MD-5", "MH50", "MR30", "MP-50", "MO-1", "WN", "WP", "WS", "WQ", "WW", "WT",
			"W2", "@3", "MS", "MN", "ML", "MW", "MB", "MF"
		]
	);
	assert.deepEqual(
		names( "SINESQUARESAWTOOTHTRIANGLENOISEPINK" ), [ "WS", "WQ", "WW", "WT", "WN", "WP" ]
	);
} );

test( "matches the longest command first", () => {
	assert.deepEqual( names( "PINKP4N12NOISE" ), [ "WP", "P4", "N12", "WN" ] );
	assert.deepEqual( names( "T120O4<>L8V50" ), [ "T120", "O4", "<", ">", "L8", "V50" ] );
} );

test( "reads notes with accidentals, lengths, and dots", () => {
	const tokens = g_play.tokenize( "C#8..B-E+G4." );
	assert.deepEqual( tokens.map( token => token.name ), [ "NOTE", "NOTE", "NOTE", "NOTE" ] );
	assert.deepEqual( tokens.map( token => token.semitone ), [ 1, 10, 5, 7 ] );
	assert.deepEqual( tokens.map( token => token.length ), [ 8, null, null, 4 ] );
	assert.deepEqual( tokens.map( token => token.dots ), [ 2, 0, 0, 1 ] );
} );

test( "reads a removed or unknown M command as one unknown token", () => {
	assert.deepEqual( names( "MT50C" ), [ "?MT50", "NOTE" ] );
	assert.deepEqual( names( "MX-2XC" ), [ "?MX-2", "?X", "NOTE" ] );
	const parsed = g_play.parsePlayString( "T120 MT50 C MU1 D" );
	assert.equal( parsed.warnings.unknown, "MT50" );
	assert.equal( parsed.events.length, 2 );

	// MT50 leaves the tempo at 120, so the second note follows a 0.5 s slot
	near( parsed.events[ 1 ].time, 0.5 );
	near( parsed.events[ 1 ].frequency, 293.665, 0.01 );
} );

test( "warns once for an instrument command without an extension", () => {
	const parsed = g_play.parsePlayString( "@1 C @2 D" );
	assert.equal( parsed.warnings.instrument, true );
	assert.equal( parsed.warnings.unknown, null );
	assert.equal( parsed.events.length, 2 );
	assert.equal( g_play.parsePlayString( "C D" ).warnings.instrument, false );
} );

test( "note numbers follow equal temperament from A4 = 440 Hz", () => {
	for( let n = 1; n < TABLE_2_2.length; n++ ) {
		const frequency = events( "N" + n )[ 0 ].frequency;
		assert.ok(
			Math.abs( frequency / TABLE_2_2[ n ] - 1 ) < 0.0003, `N${n}: ${frequency}`
		);
	}

	// N116-N119 are G#9 to B9; the 2.2 table skipped G9 and played them a semitone high
	near( events( "N116" )[ 0 ].frequency, 12543.854, 0.01 );
	near( events( "N119" )[ 0 ].frequency, 14917.240, 0.01 );
	assert.equal( events( "N0 N120" ).length, 0 );
	near( events( "N0 C" )[ 0 ].time, 0.5 );
} );

test( "note letters, octaves, and accidentals use semitone arithmetic", () => {
	near( events( "O4 A" )[ 0 ].frequency, 440 );
	near( events( "O4 C" )[ 0 ].frequency, 261.626, 0.001 );
	near( events( "O0 C" )[ 0 ].frequency, 16.352, 0.001 );
	near( events( "O9 B" )[ 0 ].frequency, 15804.266, 0.01 );
	near( events( "O4 C-" )[ 0 ].frequency, 246.942, 0.001 );
	near( events( "O4 B#" )[ 0 ].frequency, 523.251, 0.001 );
	near( events( "O4 F+" )[ 0 ].frequency, events( "O4 F#" )[ 0 ].frequency );
	near( events( "O4 MO1 A" )[ 0 ].frequency, 880 );
	near( events( "O4 > A < < A" )[ 1 ].frequency, 220 );

	// An octave outside 0-9 rests, and time still advances
	const parsed = events( "O9 MO1 C MO0 C" );
	assert.equal( parsed.length, 1 );
	near( parsed[ 0 ].time, 0.5 );
} );

test( "each note advances by its slot and sounds for slot × pace", () => {
	const [ note ] = events( "T60 L4 C" );

	// 1 s slot, 0.875 s sounding at the default pace: attack 15%, decay 20%, release 20%
	near( note.env.attack, 0.875 * 0.15 );
	near( note.env.decay, 0.875 * 0.2 );
	near( note.env.release, 0.875 * 0.2 );
	near( note.env.gate, 0.875 * 0.8 );
	near( note.env.sustain, 0.65 );
	near( envelopeEnd( note ), 0.875 );

	const legato = events( "T60 L4 ML MA0 MD0 MH100 MR0 C D" );
	near( legato[ 1 ].time, 1 );
	near( legato[ 0 ].env.release, g_envelope.MIN_RAMP );
	near( envelopeEnd( legato[ 0 ] ), 1 );

	const custom = events( "T60 L4 MS MA10 MD30 MH40 MR50 C" )[ 0 ];
	near( custom.env.attack, 0.075 );
	near( custom.env.decay, 0.225 );
	near( custom.env.sustain, 0.4 );
	near( custom.env.release, 0.375 );
	near( custom.env.gate, 0.375 );
} );

test( "staccato and legato keep the beat and every release ends within its slot", () => {
	const song = "T150 L8 C D E F G4 P8 A B > C2";
	const staccato = events( "MS " + song );
	const legato = events( "ML " + song );
	assert.equal( staccato.length, legato.length );
	for( let i = 0; i < staccato.length; i++ ) {
		near( staccato[ i ].time, legato[ i ].time );
	}
	for( const list of [ staccato, legato ] ) {
		for( let i = 0; i < list.length - 1; i++ ) {
			assert.ok( envelopeEnd( list[ i ] ) <= list[ i + 1 ].time + 1e-9 );
		}
	}
	near( legato[ legato.length - 1 ].time, 7 * 0.2 + 0.4 );
	near( envelopeEnd( legato[ legato.length - 1 ] ), 1.8 + 0.8 );
	near( envelopeEnd( staccato[ staccato.length - 1 ] ), 1.8 + 0.8 * 0.75 );
} );

test( "envelope percentages above 100 in total leave no hold", () => {
	const [ note ] = events( "T60 L4 ML MA60 MD60 MR20 C" );
	near( note.env.gate, 0.8 );
	near( note.env.attack, 0.6 );
	near( note.env.decay, 0.6 );
	near( envelopeEnd( note ), 1 );
} );

test( "dotted notes lengthen explicit and default lengths", () => {
	const list = events( "T60 L4 C4. C4 C4.. C. C" );
	assert.deepEqual( list.map( event => event.time ), [ 0, 1.5, 2.5, 4.25, 5.75 ] );
} );

test( "rests, volume, pan, and waveforms", () => {
	const list = events( "T60 L4 P2 V50 MP-150 WN C MP25 PINK D WQ E [[0,1],[0,0]] F" );
	near( list[ 0 ].time, 2 );
	near( list[ 0 ].peak, 0.5 );
	near( list[ 0 ].pan, -1 );
	assert.equal( list[ 0 ].oType, "white" );
	assert.equal( list[ 1 ].oType, "pink" );
	near( list[ 1 ].pan, 0.25 );
	assert.equal( list[ 2 ].oType, "square" );
	assert.equal( list[ 3 ].oType, "custom" );
	assert.deepEqual( Array.from( list[ 3 ].waveTables[ 0 ] ), [ 0, 1 ] );
	assert.equal( events( "P C" )[ 0 ].time, 0 );
} );

test( "a comma track starts at the previous track's last command with its settings", () => {
	const list = events( "T60 L4 O5 C D E, F G" );
	const times = list.map( event => [ event.time, Math.round( event.frequency ) ] );
	assert.deepEqual( times, [ [ 0, 523 ], [ 1, 587 ], [ 2, 659 ], [ 2, 698 ], [ 3, 784 ] ] );

	// A trailing setting applies to the next track
	const chord = events( "C2, O5 E2, G2" );
	assert.deepEqual( chord.map( event => event.time ), [ 0, 0, 0 ] );
	near( chord[ 2 ].frequency, 783.991, 0.001 );
	assert.equal( g_play.parsePlayString( "C2, E2, G2" ).trackCount, 3 );
	assert.equal( events( "C D,, E" )[ 2 ].time, 0.5 );
} );

test( "events are immutable snapshots", () => {
	const [ note ] = events( "[[0,1],[0,0]] C" );
	assert.ok( Object.isFrozen( note ) );
	assert.ok( Object.isFrozen( note.env ) );
	assert.ok( Object.isFrozen( note.waveTables ) );
	assert.throws( () => {
		"use strict";
		note.env.gate = 5;
	}, TypeError );
} );

test( "extension registration validates its input", () => {
	const valid = () => ( {
		"tokens": {},
		"initState": () => ( {} ),
		"copyState": state => state,
		"resolveNote": () => null
	} );
	assert.throws(
		() => g_play.registerPlayExtension( "", valid() ), { "code": "INVALID_PLAY_EXTENSION" }
	);
	assert.throws(
		() => g_play.registerPlayExtension( "x", { ...valid(), "resolveNote": null } ),
		{ "code": "INVALID_PLAY_EXTENSION" }
	);
	const withToken = prefix => ( { ...valid(), "tokens": { [ prefix ]: () => {} } } );
	for( const prefix of [ "X1", "Y Z", "Q-", "" ] ) {
		assert.throws(
			() => g_play.registerPlayExtension( "x", withToken( prefix ) ),
			{ "code": "INVALID_PLAY_EXTENSION" }, prefix
		);
	}
	for( const prefix of [ "MA", "sine", "C", "W", "N" ] ) {
		assert.throws(
			() => g_play.registerPlayExtension( "x", withToken( prefix ) ),
			{ "code": "DUPLICATE_PLAY_TOKEN" }, prefix
		);
	}
} );

test( "extension tokens, state, and note overrides", () => {
	let copies = 0;
	let factoryCalls = 0;
	const params = { "cutoff": 800, "curve": [ 1, 2 ] };
	const factory = () => {
		factoryCalls += 1;
		return null;
	};
	g_play.registerPlayExtension( "instruments", {
		"tokens": {
			"@": ( state, value ) => {
				state.instrument = value;
			}
		},
		"initState": () => ( { "instrument": 0 } ),
		"copyState": state => {
			copies += 1;
			return { ...state };
		},
		"resolveNote": ( state, note ) => {
			assert.ok( Object.isFrozen( note ) );
			if( state.instrument === 0 ) {
				return null;
			}
			return {
				"oType": "square",
				"volume": note.volume / 2,
				"envelope": { "releaseTime": 0.01 },
				"inserts": [ { "factory": factory, "params": params } ]
			};
		}
	} );

	const parsed = g_play.parsePlayString( "T60 L4 C @2 D E, F" );
	assert.equal( parsed.warnings.instrument, false );
	assert.equal( copies, 1 );
	const [ plain, second, third, simultaneous ] = parsed.events;
	assert.equal( plain.oType, "triangle" );
	assert.equal( plain.inserts, null );
	for( const event of [ second, third, simultaneous ] ) {
		assert.equal( event.oType, "square" );
		near( event.peak, 0.5 );
		near( event.env.release, 0.01 );
		near( event.env.attack, 0.875 * 0.15 );
		assert.equal( event.inserts[ 0 ].factory, factory );
	}
	near( simultaneous.time, 2 );

	// Parsing never invokes factories, and later changes do not reach the snapshot
	assert.equal( factoryCalls, 0 );
	params.cutoff = 100;
	params.curve.push( 3 );
	assert.equal( second.inserts[ 0 ].params.cutoff, 800 );
	assert.deepEqual( second.inserts[ 0 ].params.curve, [ 1, 2 ] );
	assert.ok( Object.isFrozen( second.inserts[ 0 ].params ) );
	assert.notEqual( second.inserts[ 0 ].params, third.inserts[ 0 ].params );
} );

test( "duplicate names and prefixes reject the whole registration", () => {
	const extension = tokens => ( {
		"tokens": tokens,
		"initState": () => ( {} ),
		"copyState": state => state,
		"resolveNote": () => null
	} );
	assert.throws(
		() => g_play.registerPlayExtension( "instruments", extension( {} ) ),
		{ "code": "DUPLICATE_PLAY_TOKEN" }
	);
	assert.throws(
		() => g_play.registerPlayExtension(
			"other", extension( { "Q": () => {}, "@": () => {} } )
		),
		{ "code": "DUPLICATE_PLAY_TOKEN" }
	);
	assert.deepEqual( names( "Q" ), [ "?Q" ] );

	g_play.registerPlayExtension( "other", extension( { "q": () => {} } ) );
	assert.deepEqual( names( "Q5" ), [ "Q5" ] );
} );

test( "extension oType overrides must name a built-in or registered source", () => {
	g_voices.registerSource( "stub-noise", () => null );
	g_play.registerPlayExtension( "source-check", {
		"tokens": {
			"!": ( state, value ) => {
				state.source = value;
			}
		},
		"initState": () => ( { "source": 0 } ),
		"copyState": state => ( { ...state } ),
		"resolveNote": state => {
			if( state.source === 1 ) {
				return { "oType": "nope" };
			}
			if( state.source === 2 ) {
				return { "oType": "stub-noise" };
			}
			return null;
		}
	} );
	assert.throws( () => g_play.parsePlayString( "!1 C" ), { "code": "INVALID_OTYPE" } );
	assert.equal( g_play.parsePlayString( "!2 C" ).events[ 0 ].oType, "stub-noise" );
	assert.equal( g_play.parsePlayString( "WN !0 C" ).events[ 0 ].oType, "white" );
} );
