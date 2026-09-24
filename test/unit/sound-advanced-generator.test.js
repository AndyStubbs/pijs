/**
 * Unit tests for the sound-effect generator in plugins/sound-advanced/generator.js. The
 * generator returns synth() options and creates no audio nodes, so no AudioContext is needed.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_generator from "../../plugins/sound-advanced/generator.js";
import * as g_presets from "../../plugins/sound-advanced/presets.js";
import * as g_synth from "../../plugins/sound-advanced/synth.js";
const assert = g_assert;
const test = g_test.test;

const CATEGORIES = [
	"coin", "laser", "jump", "hit", "explosion", "powerup", "blip", "select", "random"
];
const PRESET_CATEGORIES = CATEGORIES.filter( category => category !== "random" );

// Waveforms synth() plays; resolveSynthOptions does not check oType names
const WAVEFORMS = [ "triangle", "sine", "square", "sawtooth", "pulse", "white", "pink" ];

// Frequencies and times vary on a logarithmic scale, so their ranges must start above zero
const LOG_PATTERN = /^(frequency|frequencyEnd|filterCutoff|duration)$|Time$/;

const CHOICES = [ "oType", "filterType", "arpeggio" ];
const SEEDS_PER_CATEGORY = 10000;

// Recorded options for fixed seeds. A change to the PRNG or a category table fails this test;
// tables are fixed once released, so a new sound needs a new category name.
const RECORDED_SEEDS = [ 1, 42, 4294967295 ];
const RECORDED = {
	"coin": [
		{
			"oType": "pulse", "frequency": 934.151, "duration": 0.124, "volume": 0.594,
			"releaseTime": 0.057, "duty": 0.372, "arpeggioRate": 12.204, "arpeggio": [ 0, 5 ]
		},
		{
			"oType": "square", "frequency": 835.722, "duration": 0.124, "volume": 0.508,
			"releaseTime": 0.186, "arpeggioRate": 14.654, "arpeggio": [ 0, 5 ]
		},
		{
			"oType": "square", "frequency": 656.364, "duration": 0.166, "volume": 0.48,
			"releaseTime": 0.094, "arpeggioRate": 23.193, "arpeggio": [ 0, 5 ]
		}
	],
	"laser": [
		{
			"oType": "square", "frequency": 802.604, "frequencyEnd": 437.892, "duration": 0.081,
			"volume": 0.506, "releaseTime": 0.023, "filterCutoff": 1617.516,
			"filterType": "lowpass"
		},
		{
			"oType": "sawtooth", "frequency": 2001.828, "frequencyEnd": 300.668,
			"duration": 0.153, "volume": 0.363, "releaseTime": 0.066, "filterCutoff": 4000.903,
			"filterType": "lowpass"
		},
		{
			"oType": "pulse", "frequency": 1282.865, "frequencyEnd": 111.783, "duration": 0.14,
			"volume": 0.404, "releaseTime": 0.02, "duty": 0.5, "filterCutoff": 1542.044,
			"filterType": "lowpass"
		}
	],
	"jump": [
		{
			"oType": "square", "frequency": 425.898, "frequencyEnd": 450.726, "duration": 0.196,
			"volume": 0.401, "releaseTime": 0.035
		},
		{
			"oType": "pulse", "frequency": 248.529, "frequencyEnd": 644.413, "duration": 0.185,
			"volume": 0.467, "releaseTime": 0.141, "duty": 0.403
		},
		{
			"oType": "pulse", "frequency": 419.356, "frequencyEnd": 438.485, "duration": 0.131,
			"volume": 0.581, "releaseTime": 0.057, "duty": 0.343
		}
	],
	"hit": [
		{
			"oType": "pink", "duration": 0.025, "volume": 0.736, "releaseTime": 0.123,
			"filterCutoff": 4752.339, "filterType": "lowpass"
		},
		{
			"oType": "pink", "duration": 0.032, "volume": 0.55, "releaseTime": 0.188,
			"filterCutoff": 844.634, "filterType": "lowpass"
		},
		{
			"oType": "white", "duration": 0.02, "volume": 0.687, "releaseTime": 0.068,
			"filterCutoff": 679.26, "filterType": "lowpass"
		}
	],
	"explosion": [
		{
			"oType": "white", "duration": 0.383, "volume": 0.686, "decayTime": 0.678,
			"sustainLevel": 0.105, "releaseTime": 0.773, "filterCutoff": 150.116,
			"filterAmount": 1.418, "filterDecayTime": 0.905, "filterSustainLevel": 0.051,
			"filterType": "lowpass"
		},
		{
			"oType": "pink", "duration": 0.302, "volume": 0.755, "decayTime": 0.272,
			"sustainLevel": 0.141, "releaseTime": 0.365, "filterCutoff": 311.2,
			"filterAmount": 2.105, "filterDecayTime": 0.338, "filterSustainLevel": 0.106,
			"filterType": "lowpass"
		},
		{
			"oType": "white", "duration": 0.691, "volume": 0.662, "decayTime": 0.202,
			"sustainLevel": 0.145, "releaseTime": 0.327, "filterCutoff": 244.276,
			"filterAmount": 2.113, "filterDecayTime": 0.74, "filterSustainLevel": 0.256,
			"filterType": "lowpass"
		}
	],
	"powerup": [
		{
			"oType": "pulse", "frequency": 237.264, "frequencyEnd": 849.756, "duration": 0.524,
			"volume": 0.369, "releaseTime": 0.074, "duty": 0.256, "arpeggioRate": 20.597,
			"arpeggio": [ 0, 7, 12 ]
		},
		{
			"oType": "pulse", "frequency": 222.631, "frequencyEnd": 1056.08, "duration": 0.601,
			"volume": 0.393, "releaseTime": 0.07, "duty": 0.309, "arpeggioRate": 15.678,
			"arpeggio": [ 0, 5, 7, 12 ]
		},
		{
			"oType": "triangle", "frequency": 220.147, "frequencyEnd": 1108.257,
			"duration": 0.355, "volume": 0.43, "releaseTime": 0.183, "arpeggioRate": 16.016,
			"arpeggio": [ 0, 5, 7, 12 ]
		}
	],
	"blip": [
		{
			"oType": "pulse", "frequency": 945.243, "duration": 0.023, "volume": 0.327,
			"releaseTime": 0.016, "duty": 0.439
		},
		{
			"oType": "square", "frequency": 1975.754, "duration": 0.02, "volume": 0.43,
			"releaseTime": 0.036
		},
		{
			"oType": "square", "frequency": 650.737, "duration": 0.044, "volume": 0.38,
			"releaseTime": 0.045
		}
	],
	"select": [
		{
			"oType": "pulse", "frequency": 975.328, "duration": 0.102, "volume": 0.515,
			"releaseTime": 0.03, "duty": 0.28, "arpeggioRate": 20.195, "arpeggio": [ 0, 4 ]
		},
		{
			"oType": "sine", "frequency": 621.323, "duration": 0.105, "volume": 0.473,
			"releaseTime": 0.031, "arpeggioRate": 16.702, "arpeggio": [ 0, 4 ]
		},
		{
			"oType": "pulse", "frequency": 448.737, "duration": 0.071, "volume": 0.505,
			"releaseTime": 0.117, "duty": 0.267, "arpeggioRate": 23.992, "arpeggio": [ 0, 7 ]
		}
	],
	"random": [
		{
			"oType": "pink", "frequency": 1097.953, "frequencyEnd": 75.206, "duration": 0.493,
			"volume": 0.365, "attackTime": 0.005, "releaseTime": 0.294, "arpeggioRate": 7.508,
			"arpeggio": [ 0, 12 ]
		},
		{
			"oType": "pulse", "frequency": 921.742, "frequencyEnd": 246.832, "duration": 0.07,
			"volume": 0.698, "attackTime": 0.031, "releaseTime": 0.193, "duty": 0.15,
			"filterCutoff": 5864.169, "filterType": "highpass"
		},
		{
			"oType": "square", "frequency": 996.868, "duration": 0.272, "volume": 0.466,
			"attackTime": 0.003, "releaseTime": 0.493
		}
	]
};

function generate( category, seed, variation, random ) {
	return g_generator.generateSfxOptions( category, seed, variation, random || Math.random );
}

function rangeOf( category, name ) {
	return g_generator.SFX_CATEGORIES[ category ].numbers.find( entry => entry[ 0 ] === name );
}

function assertInRanges( category, options, label ) {
	for( const name of Object.keys( options ) ) {
		if( typeof options[ name ] !== "number" ) {
			continue;
		}
		const range = rangeOf( category, name );
		assert.ok( range, `${label}: ${name} has a range` );
		assert.ok(
			options[ name ] >= range[ 1 ] && options[ name ] <= range[ 2 ],
			`${label}: ${name} ${options[ name ]} is within ${range[ 1 ]}-${range[ 2 ]}`
		);
	}
}

function assertPlayable( options, label ) {
	g_synth.resolveSynthOptions( "generateSfx", options );
	assert.ok( WAVEFORMS.includes( options.oType ), `${label}: oType ${options.oType}` );
}

function choicesOf( options ) {
	return CHOICES.map( name => options[ name ] );
}

test( "seed 0 returns a frozen copy of the built-in preset", () => {
	for( const category of PRESET_CATEGORIES ) {
		const options = generate( category );
		assert.deepEqual( options, g_presets.BUILT_IN_PRESETS[ category ], category );
		assert.equal( Object.isFrozen( options ), true, category );
		if( options.arpeggio ) {
			assert.equal( Object.isFrozen( options.arpeggio ), true, category );
			assert.notEqual( options.arpeggio, g_presets.BUILT_IN_PRESETS[ category ].arpeggio );
		}
		assert.deepEqual( generate( category, 0, 0 ), options, category );
	}

	// Replacing a built-in preset does not change seed 0
	g_presets.storePreset( "laser", { "frequency": 200 } );
	assert.deepEqual( generate( "laser" ), g_presets.BUILT_IN_PRESETS.laser );
	g_presets.storePreset( "laser", g_presets.BUILT_IN_PRESETS.laser );

	// The random category has no preset; its seed 0 is an ordinary generated sound
	assertPlayable( generate( "random" ), "random 0" );
	assert.deepEqual( generate( "random" ), generate( "random", 0 ) );
} );

test( "category ranges contain each built-in preset", () => {
	for( const category of PRESET_CATEGORIES ) {
		const preset = g_presets.BUILT_IN_PRESETS[ category ];
		const table = g_generator.SFX_CATEGORIES[ category ];
		assertInRanges( category, preset, category );
		assert.ok( table.oType.some( choice => choice[ 0 ] === preset.oType ), category );
		if( preset.filterType ) {
			assert.ok(
				table.filterType.some( choice => choice[ 0 ] === preset.filterType ), category
			);
		}
		if( preset.arpeggio ) {
			assert.ok(
				table.arpeggio.some( choice => {
					return JSON.stringify( choice[ 0 ] ) === JSON.stringify( preset.arpeggio );
				} ),
				category
			);
		}
	}
} );

test( "category tables are frozen and their ranges are valid", () => {
	assert.deepEqual( Object.keys( g_generator.SFX_CATEGORIES ), CATEGORIES );
	for( const category of CATEGORIES ) {
		const table = g_generator.SFX_CATEGORIES[ category ];
		assert.equal( Object.isFrozen( table ), true, category );
		assert.equal( Object.isFrozen( table.numbers[ 0 ] ), true, category );
		for( const entry of table.numbers ) {
			const label = `${category} ${entry[ 0 ]}`;
			assert.ok( g_synth.SYNTH_PARAMETERS.includes( entry[ 0 ] ), label );
			assert.ok( entry[ 1 ] < entry[ 2 ], label );
			if( LOG_PATTERN.test( entry[ 0 ] ) ) {
				assert.ok( entry[ 1 ] > 0, `${label} starts above zero` );
			}
		}
		for( const choice of table.oType ) {
			assert.ok( WAVEFORMS.includes( choice[ 0 ] ), `${category} ${choice[ 0 ]}` );
		}
	}
} );

test( "fixed seeds return the recorded options", () => {
	assert.deepEqual( Object.keys( RECORDED ), CATEGORIES );
	for( const category of CATEGORIES ) {
		RECORDED_SEEDS.forEach( ( seed, index ) => {
			const options = generate( category, seed );
			assert.deepEqual( options, RECORDED[ category ][ index ], `${category} ${seed}` );
			assert.equal( Object.isFrozen( options ), true );
		} );
	}
} );

test( "every seed plays, with and without variation, and stays in its ranges", () => {
	const random = g_generator.createRandom( 12345 );
	for( const category of CATEGORIES ) {
		for( let seed = 0; seed < SEEDS_PER_CATEGORY; seed++ ) {
			const label = `${category} ${seed}`;
			const options = generate( category, seed );
			assertPlayable( options, label );
			assertInRanges( category, options, label );

			const varied = generate( category, seed, 1, random );
			assertPlayable( varied, `${label} varied` );
			assertInRanges( category, varied, `${label} varied` );
			assert.deepEqual( choicesOf( varied ), choicesOf( options ), label );
			assert.deepEqual( Object.keys( varied ).sort(), Object.keys( options ).sort(), label );
		}
	}
} );

test( "variation 0 is repeatable and variation moves parameters within their ranges", () => {
	for( const category of CATEGORIES ) {
		for( const seed of [ 0, 7, 42 ] ) {
			const options = generate( category, seed );
			assert.deepEqual( generate( category, seed, 0 ), options );
			assert.deepEqual( generate( category, seed, null ), options );

			// The extremes of the random source clamp to the category ranges
			const low = generate( category, seed, 1, () => 0 );
			const high = generate( category, seed, 1, () => 0.9999999 );
			assertInRanges( category, low, `${category} ${seed} low` );
			assertInRanges( category, high, `${category} ${seed} high` );
			assert.deepEqual( choicesOf( low ), choicesOf( options ) );
			assert.deepEqual( choicesOf( high ), choicesOf( options ) );
		}
	}

	// A small variation moves each parameter by at most its share of the range
	const base = generate( "laser" );
	const varied = generate( "laser", 0, 0.2, () => 0.9999999 );
	assert.ok( varied.frequency > base.frequency );
	assert.ok( varied.frequency < base.frequency * Math.pow( 2400 / 800, 0.2 * 0.25 ) + 1e-9 );
	assert.ok( varied.volume <= base.volume + 0.2 * 0.25 * 0.2 + 1e-12 );
	assert.equal( varied.oType, base.oType );
	assert.equal( varied.filterType, base.filterType );
	assert.notDeepEqual( generate( "laser", 0, 0.2, Math.random ), base );
} );

test( "seeds draw different streams per category and differ from each other", () => {
	assert.notDeepEqual( generate( "coin", 1 ), generate( "coin", 2 ) );

	// Every category has a volume range, so equal volumes would mean a shared stream
	const volumes = new Set( CATEGORIES.map( category => generate( category, 1 ).volume ) );
	assert.ok( volumes.size > 1 );
} );

test( "createRandom is a repeatable source of numbers in [0, 1)", () => {
	const a = g_generator.createRandom( 99 );
	const b = g_generator.createRandom( 99 );
	for( let i = 0; i < 1000; i++ ) {
		const value = a();
		assert.equal( value, b() );
		assert.ok( value >= 0 && value < 1 );
	}
	assert.notEqual( g_generator.createRandom( 1 )(), g_generator.createRandom( 2 )() );
} );

test( "generateSfx validates its arguments", () => {
	const cases = [
		[ [ "zap" ], "INVALID_CATEGORY" ],
		[ [ null ], "INVALID_CATEGORY" ],
		[ [ "toString" ], "INVALID_CATEGORY" ],
		[ [ "coin", -1 ], "INVALID_SEED" ],
		[ [ "coin", 1.5 ], "INVALID_SEED" ],
		[ [ "coin", 4294967296 ], "INVALID_SEED" ],
		[ [ "coin", "42" ], "INVALID_SEED" ],
		[ [ "coin", NaN ], "INVALID_SEED" ],
		[ [ "coin", 1, -0.1 ], "INVALID_VARIATION" ],
		[ [ "coin", 1, 1.1 ], "INVALID_VARIATION" ],
		[ [ "coin", 1, "a" ], "INVALID_VARIATION" ],
		[ [ "coin", 1, NaN ], "INVALID_VARIATION" ]
	];
	for( const [ args, code ] of cases ) {
		assert.throws(
			() => generate( args[ 0 ], args[ 1 ], args[ 2 ] ),
			{ "code": code, "message": /^generateSfx: / },
			JSON.stringify( args )
		);
	}
	assertPlayable( generate( "coin", 4294967295, 1 ), "maximum seed" );
	assertPlayable( generate( "coin", null, null ), "null defaults" );
} );
