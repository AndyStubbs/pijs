/**
 * Offline render tests for the sound-advanced plugin: synth() filter and filter envelope,
 * vibrato, tremolo, pulse duty, and arpeggio; held sounds with releaseSound() and setSynth();
 * periodic noise; bus reverb and delay and their
 * interaction with bus volume; getSoundLevels(); the built-in presets; and PLAY instruments,
 * synthesized and sampled. Each page loads the full bundle followed by the plugin's source
 * bundle.
 *
 * Tone levels are measured with a single-bin DFT written here, independent of the plugin.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./audio-render-harness.js";
import * as g_metrics from "./audio-metrics.js";
import * as g_suite from "./audio-browser-suite.js";
import * as g_fixtures from "./audio-sample-fixtures.js";
const test = g_test.test;
const assert = g_assert;
const frame = g_suite.frame;

const RATE = g_harness.SAMPLE_RATE;
const LEAD = g_suite.LEAD;

// Sample fixture: 2 s of a C4 sine, the default root frequency of a sample source
const C4 = 261.63;
const SAMPLE_DATA = Int16Array.from( { "length": 2 * RATE }, ( value, i ) => {
	return Math.round( 0.5 * Math.sin( 2 * Math.PI * C4 * i / RATE ) * 32767 );
} );
const SAMPLE_WAV = g_fixtures.wavBase64( [ SAMPLE_DATA ] );

const PRESETS = [ "coin", "laser", "jump", "hit", "explosion", "powerup", "blip", "select" ];

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
 * Amplitude of one frequency component over a range, by a single-bin DFT.
 *
 * @param {Float32Array} samples - Samples
 * @param {number} frequency - Frequency in Hz
 * @param {number} from - First frame
 * @param {number} to - End frame (exclusive)
 * @returns {number} Peak amplitude of the component
 */
function toneAmplitude( samples, frequency, from, to ) {
	let re = 0;
	let im = 0;
	for( let i = from; i < to; i++ ) {
		const angle = 2 * Math.PI * frequency * i / RATE;
		re += samples[ i ] * Math.cos( angle );
		im -= samples[ i ] * Math.sin( angle );
	}
	return 2 * Math.hypot( re, im ) / ( to - from );
}

/**
 * Zero-crossing frequencies over consecutive short windows.
 *
 * @param {Float32Array} samples - Samples
 * @param {number} from - Start in seconds
 * @param {number} to - End in seconds
 * @param {number} window - Window length in seconds
 * @returns {number[]} Frequencies in Hz
 */
function frequencyTrack( samples, from, to, window ) {
	const track = [];
	for( let t = from; t + window <= to; t += window / 2 ) {
		track.push(
			g_metrics.zeroCrossingFrequency( samples, RATE, frame( t ), frame( t + window ) )
		);
	}
	return track;
}

/**
 * Page function: render actions given as source strings, then return the render.
 *
 * @param {Object} arg - { actions: [ { time, code } ] }, where code runs as a function body
 * @returns {Promise<Object>} Render with a `values` map filled by the actions
 */
function renderActions( arg ) {
	const values = {};
	window.__values = values;
	const actions = arg.actions.map( action => ( {
		"time": action.time,
		"run": new Function( "values", action.code ).bind( null, values )
	} ) );
	return __audioHarness.render( { "actions": actions } ).then(
		render => ( { ...render, "values": values } )
	);
}

const SETUP = "$.setSoundLimiter( false ); $.setVolume( 1 );";

g_suite.describeAudioEngines( "sound advanced", suite => {
	const clockTest = suite.clockTest;

	clockTest( "the lowpass filter and its envelope shape the harmonics", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 2 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				$.synth( { "frequency": 220, "duration": 0.4, "volume": 0.5,
					"oType": "sawtooth" } );` },
			{ "time": 0.6, "code": `
				$.synth( { "frequency": 220, "duration": 0.4, "volume": 0.5,
					"oType": "sawtooth", "filterType": "lowpass", "filterCutoff": 500 } );` },
			{ "time": 1.2, "code": `
				$.synth( { "frequency": 220, "duration": 0.7, "volume": 0.5,
					"oType": "sawtooth", "filterType": "lowpass", "filterCutoff": 200,
					"filterAmount": 4, "filterAttackTime": 0, "filterDecayTime": 0.6,
					"filterSustainLevel": 0 } );` }
		] } );
		const left = channel( result );
		const dry = toneAmplitude( left, 2200, frame( 0.1 ), frame( 0.3 ) );
		const filtered = toneAmplitude( left, 2200, frame( 0.7 ), frame( 0.9 ) );
		const dryBase = toneAmplitude( left, 220, frame( 0.1 ), frame( 0.3 ) );
		const filteredBase = toneAmplitude( left, 220, frame( 0.7 ), frame( 0.9 ) );
		assert.ok( filtered < dry * 0.1, `harmonic ${filtered} vs ${dry}` );
		assert.ok( filteredBase > dryBase * 0.7, `fundamental ${filteredBase} vs ${dryBase}` );

		// The envelope opens the cutoff four octaves, then decays to the base cutoff
		const open = toneAmplitude( left, 2200, frame( 1.21 ), frame( 1.26 ) );
		const closed = toneAmplitude( left, 2200, frame( 1.7 ), frame( 1.85 ) );
		assert.ok( closed < open * 0.1, `envelope ${closed} vs ${open}` );
	} );

	clockTest( "vibrato, arpeggio, and tremolo modulate pitch and level", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 2.4 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				$.synth( { "frequency": 440, "duration": 0.6, "volume": 0.5, "oType": "sine",
					"vibratoRate": 4, "vibratoDepth": 100 } );` },
			{ "time": 0.8, "code": `
				$.synth( { "frequency": 440, "duration": 0.6, "volume": 0.5, "oType": "sine",
					"arpeggio": [ 0, 12 ], "arpeggioRate": 10 } );
				values.arpeggioAt = new AudioContext().currentTime;` },
			{ "time": 1.6, "code": `
				$.synth( { "frequency": 440, "duration": 0.6, "volume": 0.5, "oType": "sine",
					"tremoloRate": 5, "tremoloDepth": 0.8 } );` }
		] } );
		const left = channel( result );
		const vibrato = frequencyTrack( left, 0.05, 0.6, 0.025 );
		const high = 440 * Math.pow( 2, 1 / 12 );
		const low = 440 / Math.pow( 2, 1 / 12 );
		assert.ok( Math.max( ...vibrato ) > high - 8, `vibrato max ${Math.max( ...vibrato )}` );
		assert.ok( Math.min( ...vibrato ) < low + 8, `vibrato min ${Math.min( ...vibrato )}` );
		assert.ok( Math.max( ...vibrato ) < high + 3 );

		const start = result.values.arpeggioAt + LEAD;
		const first = g_metrics.zeroCrossingFrequency(
			left, RATE, frame( start + 0.02 ), frame( start + 0.08 )
		);
		const second = g_metrics.zeroCrossingFrequency(
			left, RATE, frame( start + 0.12 ), frame( start + 0.18 )
		);
		const third = g_metrics.zeroCrossingFrequency(
			left, RATE, frame( start + 0.22 ), frame( start + 0.28 )
		);
		assertNear( first, 440, 440 * 0.005, "arpeggio step 1" );
		assertNear( second, 880, 880 * 0.005, "arpeggio step 2" );
		assertNear( third, 440, 440 * 0.005, "arpeggio step 3" );

		const levels = g_metrics.rmsWindows( left, frame( 0.02 ), frame( 1.65 ), frame( 2.15 ) );
		const ratio = Math.max( ...levels ) / Math.min( ...levels );
		assert.ok( ratio > 3.5 && ratio < 6.5, `tremolo ratio ${ratio}` );
	} );

	// Single-pass render, so engines without offline suspend() also cover synth voices
	test( "synth pulse, vibrato, and periodic voices render in one pass", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 0.8 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				$.synth( { "frequency": 200, "duration": 0.6, "volume": 0.5, "oType": "pulse",
					"duty": 0.25, "pan": -1 } );
				$.synth( { "frequency": 440, "duration": 0.6, "volume": 0.5, "oType": "sine",
					"vibratoRate": 4, "vibratoDepth": 100, "pan": 1 } );
				values.periodic = $.sound( { "duration": 0.1, "volume": 0,
					"oType": "periodic" } );` }
		] } );
		assert.match( result.values.periodic, /^sound_\d+$/ );
		const left = channel( result );
		const right = channel( result, 1 );
		const fundamental = toneAmplitude( left, 200, frame( 0.05 ), frame( 0.35 ) );
		const second = toneAmplitude( left, 400, frame( 0.05 ), frame( 0.35 ) );
		assertNear( second / fundamental, 1 / Math.SQRT2, 0.05, "25% second harmonic" );
		const vibrato = frequencyTrack( right, 0.05, 0.6, 0.025 );
		const high = 440 * Math.pow( 2, 1 / 12 );
		assert.ok( Math.max( ...vibrato ) > high - 8, `vibrato max ${Math.max( ...vibrato )}` );
		assert.ok( Math.max( ...vibrato ) < high + 3 );
	} );

	clockTest( "pulse duty sets the harmonic content", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 1.2 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				$.synth( { "frequency": 200, "duration": 0.4, "volume": 0.5, "oType": "pulse",
					"duty": 0.5 } );` },
			{ "time": 0.6, "code": `
				$.synth( { "frequency": 200, "duration": 0.4, "volume": 0.5, "oType": "pulse",
					"duty": 0.25 } );` }
		] } );
		const left = channel( result );
		function ratio( from ) {
			const fundamental = toneAmplitude( left, 200, frame( from ), frame( from + 0.3 ) );
			return toneAmplitude( left, 400, frame( from ), frame( from + 0.3 ) ) / fundamental;
		}

		// A 50% pulse is a square with no even harmonics; a 25% pulse has a strong second
		assert.ok( ratio( 0.05 ) < 0.02, `square second harmonic ${ratio( 0.05 )}` );
		assertNear( ratio( 0.65 ), 1 / Math.SQRT2, 0.05, "25% second harmonic" );
		const peak = g_metrics.peak( left, frame( 0.05 ), frame( 0.35 ) );
		assert.ok( peak > 0.4 && peak <= 0.55, `pulse peak ${peak}` );
	} );

	test( "random tremolo and vibrato wobble unevenly within their depth", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 2.2 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				$.synth( { "frequency": 1000, "duration": 2, "volume": 0.5, "oType": "sine",
					"tremoloRate": 20, "tremoloDepth": 0.6, "tremoloShape": "random",
					"pan": -1 } );
				$.synth( { "frequency": 440, "duration": 2, "volume": 0.5, "oType": "sine",
					"vibratoRate": 10, "vibratoDepth": 200, "vibratoShape": "random",
					"pan": 1 } );` }
		] } );

		// Tremolo: the level of each 5 ms window stays between volume × ( 1 − depth ) and volume
		const left = channel( result );
		const levels = [];
		for( let t = 0.1; t < 1.9; t += 0.005 ) {
			levels.push( g_metrics.peak( left, frame( t ), frame( t + 0.005 ) ) );
		}
		const lowest = Math.min( ...levels );
		const highest = Math.max( ...levels );
		assert.ok( highest <= 0.505, `tremolo ceiling ${highest}` );
		assert.ok( lowest >= 0.19, `tremolo floor ${lowest}` );
		assert.ok( highest - lowest > 0.15, `tremolo range ${lowest} to ${highest}` );

		// A steady 20 Hz tremolo would repeat every 10 windows; the random one does not
		const mean = levels.reduce( ( sum, level ) => sum + level, 0 ) / levels.length;
		let same = 0;
		let shifted = 0;
		for( let i = 10; i < levels.length; i++ ) {
			same += ( levels[ i ] - mean ) * ( levels[ i ] - mean );
			shifted += ( levels[ i ] - mean ) * ( levels[ i - 10 ] - mean );
		}
		assert.ok( shifted / same < 0.6, `tremolo repeats: correlation ${shifted / same}` );

		// Vibrato: the pitch moves, and stays within 200 cents of 440 Hz
		const right = channel( result, 1 );
		const pitch = frequencyTrack( right, 0.1, 1.9, 0.025 );
		const limit = Math.pow( 2, 200 / 1200 );
		assert.ok( Math.max( ...pitch ) < 440 * limit + 4, `highest pitch ${Math.max( ...pitch )}` );
		assert.ok( Math.min( ...pitch ) > 440 / limit - 4, `lowest pitch ${Math.min( ...pitch )}` );
		assert.ok(
			Math.max( ...pitch ) - Math.min( ...pitch ) > 40,
			`pitch range ${Math.min( ...pitch )} to ${Math.max( ...pitch )}`
		);
	} );

	test( "synth() plays on the music bus when bus is music", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 0.8 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				$.setBusVolume( "music", 0.5 );
				$.synth( { "frequency": 440, "duration": 0.6, "volume": 0.4, "oType": "sine" } );
				$.synth( { "frequency": 1000, "duration": 0.6, "volume": 0.4, "oType": "sine",
					"bus": "music" } );
				$.synth( { "frequency": 2000, "volume": 0.4, "oType": "sine", "bus": "music",
					"hold": true } );` }
		] } );
		const left = channel( result );
		const level = frequency => toneAmplitude( left, frequency, frame( 0.1 ), frame( 0.5 ) );
		assertNear( level( 440 ), 0.4, 0.01, "sfx bus" );
		assertNear( level( 1000 ), 0.2, 0.01, "music bus" );
		assertNear( level( 2000 ), 0.2, 0.01, "held on the music bus" );
	} );

	clockTest( "a held sound sustains until releaseSound() and then fades over its release",
		async () => {
			const result = await suite.inHarness( {
				"config": { "duration": 1.6 }
			}, renderActions, { "actions": [
				{ "time": 0, "code": SETUP + `
					values.id = $.synth( { "frequency": 440, "duration": 0.1, "volume": 0.5,
						"oType": "sine", "attackTime": 0.05, "decayTime": 0.1,
						"sustainLevel": 0.5, "releaseTime": 0.2, "hold": true } );` },
				{ "time": 1, "code": `
					$.releaseSound( values.id );
					$.releaseSound( values.id );` }
			] } );
			assert.match( result.values.id, /^sound_\d+$/ );
			const left = channel( result );

			// duration is ignored: the sound holds volume × sustainLevel long after 0.1 s
			const sustained = toneAmplitude( left, 440, frame( 0.5 ), frame( 0.9 ) );
			assertNear( sustained, 0.25, 0.01, "sustain level" );

			// The release is the core's exponential, which falls to a tenth every quarter of
			// releaseTime
			const early = g_metrics.peak( left, frame( LEAD + 1.03 ), frame( LEAD + 1.04 ) );
			const later = g_metrics.peak( left, frame( LEAD + 1.08 ), frame( LEAD + 1.09 ) );
			assert.ok( early > 0.02 && early < 0.2, `release level ${early}` );
			assertNear( later / early, 0.1, 0.02, "release shape" );
			const after = g_metrics.peak( left, frame( LEAD + 1.25 ), frame( 1.6 ) );
			assert.ok( after < 1e-4, `silence after the release ${after}` );
		} );

	clockTest( "setSynth() moves a held sound's volume, pitch, and filter cutoff", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 2.2 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				values.id = $.synth( { "frequency": 220, "volume": 0.4, "oType": "sawtooth",
					"filterType": "lowpass", "filterCutoff": 300, "hold": true } );` },
			{ "time": 0.5, "code": `$.setSynth( values.id, 0.2 );` },
			{ "time": 1, "code": `$.setSynth( { "soundId": values.id, "detune": 1200 } );` },
			{ "time": 1.5, "code": `
				$.setSynth( { "soundId": values.id, "filterCutoff": 8000 } );` },
			{ "time": 2, "code": `$.stopSound( values.id );` }
		] } );
		const left = channel( result );
		const loud = toneAmplitude( left, 220, frame( 0.2 ), frame( 0.45 ) );
		const quiet = toneAmplitude( left, 220, frame( 0.7 ), frame( 0.95 ) );
		assert.ok( loud > 0.1, `fundamental ${loud}` );
		assertNear( quiet / loud, 0.5, 0.02, "volume halves" );

		// 1200 cents up is one octave: the fundamental moves from 220 Hz to 440 Hz
		const low = toneAmplitude( left, 220, frame( 1.2 ), frame( 1.45 ) );
		const high = toneAmplitude( left, 440, frame( 1.2 ), frame( 1.45 ) );
		assert.ok( high > 0.05 && low < high / 20, `octave up: 220 Hz ${low}, 440 Hz ${high}` );

		// Opening the filter lets the third harmonic through
		const closed = toneAmplitude( left, 1320, frame( 1.2 ), frame( 1.45 ) );
		const open = toneAmplitude( left, 1320, frame( 1.7 ), frame( 1.95 ) );
		assert.ok( open > closed * 5, `third harmonic ${closed} then ${open}` );
		const after = g_metrics.peak( left, frame( LEAD + 2.05 ), frame( 2.2 ) );
		assert.ok( after < 1e-4, `silence after stopSound ${after}` );
	} );

	clockTest( "releaseSound() releases every held sound, from the level each has reached",
		async () => {
			const result = await suite.inHarness( {
				"config": { "duration": 1.4 }
			}, renderActions, { "actions": [
				{ "time": 0, "code": SETUP + `
					values.attacking = $.synth( { "frequency": 440, "volume": 0.5,
						"oType": "sine", "attackTime": 1, "releaseTime": 0.1, "hold": true } );
					values.delayed = $.synth( { "frequency": 660, "volume": 0.5,
						"oType": "sine", "delay": 0.6, "hold": true } );
					values.plain = $.synth( { "frequency": 880, "duration": 0.3, "volume": 0.3,
						"oType": "sine" } );

					// Sounds that are not held, and unknown IDs, are left alone
					$.setSynth( values.plain, 0 );
					$.releaseSound( values.plain );
					$.releaseSound( "sound_none" );
					$.setSynth( "sound_none", 0.5 );` },
				{ "time": 0.25, "code": `$.releaseSound();` }
			] } );
			const left = channel( result );
			const plain = toneAmplitude( left, 880, frame( 0.05 ), frame( 0.25 ) );
			assertNear( plain, 0.3, 0.01, "the plain sound is unchanged" );

			// A quarter of the way through its attack, the held sound is at a quarter of 0.5
			const reached = toneAmplitude( left, 440, frame( 0.23 ), frame( 0.25 ) );
			assert.ok( reached > 0.1 && reached < 0.13, `attack level ${reached}` );

			// It fades from there, and the delayed sound is cancelled before it starts
			const after = g_metrics.peak( left, frame( LEAD + 0.5 ), frame( 1.4 ) );
			assert.ok( after < 1e-4, `silence after releasing all ${after}` );
		} );

	clockTest( "periodic noise repeats every 93 clock steps and follows its clock sweep",
		async () => {
			const result = await suite.inHarness( {
				"config": { "duration": 1.2 }
			}, renderActions, { "actions": [
				{ "time": 0, "code": SETUP + `
					values.id = $.sound( { "frequency": 9300, "duration": 0.4, "volume": 0.5,
						"oType": "periodic" } );` },
				{ "time": 0.6, "code": `
					$.synth( { "frequency": 9300, "frequencyEnd": 4650, "duration": 0.4,
						"volume": 0.5, "oType": "periodic" } );` }
			] } );
			const left = channel( result );

			// One period is 93 / 9300 s = 480 frames
			const shifted = left.subarray( 480 );
			const from = frame( 0.05 );
			const to = frame( 0.3 );
			assert.ok( g_metrics.correlation( left, shifted, from, to ) > 0.95 );
			assert.ok(
				Math.abs( g_metrics.correlation( left, left.subarray( 240 ), from, to ) ) < 0.5
			);
			assert.match( result.values.id, /^sound_\d+$/ );

			// The clock sweep halves the rate of sign changes over the gate
			const start = 0.6 + LEAD;
			const early = g_metrics.risingZeroCrossings(
				left, frame( start + 0.01 ), frame( start + 0.06 )
			).length;
			const late = g_metrics.risingZeroCrossings(
				left, frame( start + 0.34 ), frame( start + 0.39 )
			).length;
			const ratio = early / late;
			assert.ok( ratio > 1.5 && ratio < 2.1, `sweep ratio ${ratio}` );
		}
	);

	clockTest( "setBusVolume and setBusEffect work in either order", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 3.2 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				$.setBusVolume( "sfx", 0.5 );
				$.sound( { "duration": 0.2, "volume": 0.8, "oType": "sine" } );` },

			// Delay after volume: an echo 0.2 s later through the same volume
			{ "time": 0.4, "code": `
				$.setBusEffect( "sfx", "delay", { "time": 0.2, "feedback": 0, "mix": 0.5 } );
				$.sound( { "duration": 0.05, "volume": 0.8, "oType": "sine" } );
				values.delayAt = new AudioContext().currentTime;` },

			// Removing the effect keeps the volume
			{ "time": 1.0, "code": `
				$.setBusEffect( "sfx", null );
				$.sound( { "duration": 0.2, "volume": 0.8, "oType": "sine" } );` },

			// Reverb before volume on the music bus, then a mute silences the tail
			{ "time": 1.4, "code": `
				$.setBusEffect( "music", "reverb", { "time": 1, "mix": 1 } );
				$.setBusVolume( "music", 0.5 );
				$.play( "T240 L16 C" );` },
			{ "time": 2.2, "code": `
				values.mutedAt = new AudioContext().currentTime;
				$.setBusVolume( "music", 0 );` },
			{ "time": 2.6, "code": `
				$.setBusVolume( "master", 0.5 );
				$.sound( { "duration": 0.2, "volume": 0.8, "oType": "sine" } );` }
		] } );
		const left = channel( result );
		assertNear( g_metrics.peak( left, frame( 0.05 ), frame( 0.18 ) ), 0.4, 0.01, "volume" );

		// Dry at half mix, then the echo; nothing in between
		const at = result.values.delayAt + LEAD;
		assertNear( g_metrics.peak( left, frame( at ), frame( at + 0.05 ) ), 0.2, 0.01, "dry" );
		assert.ok( g_metrics.isSilent( left, frame( at + 0.16 ), frame( at + 0.2 ) - 5 ) );
		assertNear(
			g_metrics.peak( left, frame( at + 0.2 ), frame( at + 0.25 ) ), 0.2, 0.01, "echo"
		);
		assertNear(
			g_metrics.peak( left, frame( 1.05 ), frame( 1.18 ) ), 0.4, 0.01, "effect removed"
		);

		// The reverb tail outlasts the note, until the mute
		assert.ok( g_metrics.peak( left, frame( 1.8 ), frame( 2.2 ) ) > 0.001, "reverb tail" );
		const muted = frame( result.values.mutedAt + LEAD + 0.01 ) + 1;
		assert.ok( g_metrics.isSilent( left, muted, frame( 2.6 ) ) );

		// "master" matches setVolume
		assertNear( g_metrics.peak( left, frame( 2.7 ), frame( 2.78 ) ), 0.2, 0.01, "master" );
	} );

	clockTest( "getSoundLevels reports levels, spectrum, and waveform after the bus volume",
		async () => {
			const result = await suite.inHarness( {
				"config": { "duration": 0.8 }
			}, renderActions, { "actions": [
				{ "time": 0, "code": SETUP + `
					values.silent = $.getSoundLevels();

					// The first call on a bus starts its analyser
					$.getSoundLevels( "sfx" );
					$.getSoundLevels( "music" );
					$.setBusVolume( "sfx", 0.5 );
					$.sound( { "frequency": 468.75, "duration": 1, "volume": 0.8,
						"oType": "sine" } );` },
				{ "time": 0.4, "code": `
					const levels = $.getSoundLevels( "sfx", true, true );
					values.sfx = {
						"peak": levels.peak,
						"rms": levels.rms,
						"bins": levels.spectrum.length,
						"loudest": levels.spectrum.indexOf( Math.max( ...levels.spectrum ) ),
						"samples": levels.waveform.length
					};
					values.music = $.getSoundLevels( "music" );
					values.master = $.getSoundLevels( { "bus": "master" } ).peak;
					try {
						$.getSoundLevels( "sfx", "yes" );
					} catch( error ) {
						values.flagCode = error.code;
					}
					try {
						$.getSoundLevels( "drums" );
					} catch( error ) {
						values.busCode = error.code;
					}` }
			] } );
			const values = result.values;
			assert.equal( values.silent.peak, 0 );
			assert.equal( values.silent.spectrum, null );
			assertNear( values.sfx.peak, 0.4, 0.005, "peak" );
			assertNear( values.sfx.rms, 0.4 / Math.SQRT2, 0.01, "rms" );
			assert.equal( values.sfx.bins, 1024 );

			// 468.75 Hz is bin 20 of a 2048-point analysis at 48 kHz
			assert.equal( values.sfx.loudest, 20 );
			assert.equal( values.sfx.samples, 2048 );
			assert.equal( values.music.peak, 0 );
			assert.equal( values.music.waveform, null );
			assertNear( values.master, 0.4, 0.005, "master" );
			assert.equal( values.flagCode, "INVALID_SPECTRUM" );
			assert.equal( values.busCode, "INVALID_BUS" );
		}
	);

	clockTest( "getSoundLevels measures the output after the limiter", async () => {
		const result = await suite.inHarness( {
			"config": { "duration": 0.6 }
		}, renderActions, { "actions": [
			{ "time": 0, "code": `
				$.setVolume( 1 );
				$.getSoundLevels( "master" );
				$.getSoundLevels( "output" );
				for( const frequency of [ 220, 330, 440 ] ) {
					$.sound( { "frequency": frequency, "duration": 0.5, "volume": 1,
						"oType": "square" } );
				}` },
			{ "time": 0.3, "code": `
				values.master = $.getSoundLevels( "master" ).peak;
				values.output = $.getSoundLevels( "output" ).peak;` }
		] } );

		// The master tap is before the limiter, so it is over full scale; the output is not
		assert.ok( result.values.master > 1, `master ${result.values.master}` );
		assert.ok(
			result.values.output <= 1 && result.values.output > 0.5,
			`output ${result.values.output}`
		);
	} );

	clockTest( "built-in presets play within the limiter ceiling; custom presets validate",
		async () => {
			const actions = PRESETS.map( ( name, index ) => ( {
				"time": index * 0.8,
				"code": `values.ids = values.ids || []; values.ids.push( $.sfx( "${name}", 0.5 ) );`
			} ) );
			actions.push( { "time": PRESETS.length * 0.8, "code": `
				const codeOf = fn => {
					try {
						fn();
					} catch( error ) {
						return error.code;
					}
					return null;
				};
				values.codes = [
					codeOf( () => $.sfx( "missing" ) ),
					codeOf( () => $.sfx( "coin", 2 ) ),
					codeOf( () => $.definePreset( "", {} ) )
				];
				const params = { "frequency": 330, "duration": 0.1, "oType": "square" };
				$.definePreset( "mine", params );
				params.frequency = 20;
				values.ids.push( $.sfx( { "name": "mine" } ) );
				values.mineAt = new AudioContext().currentTime;` } );
			const result = await suite.inHarness( {
				"config": { "duration": PRESETS.length * 0.8 + 0.4 }
			}, renderActions, { "actions": actions } );
			assert.deepEqual( result.values.codes, [
				"PRESET_NOT_FOUND", "INVALID_VARIATION", "INVALID_PRESET_NAME"
			] );
			assert.equal( result.values.ids.length, PRESETS.length + 1 );
			for( const channelData of g_harness.decodeRender( result ).channels ) {
				assert.ok( g_metrics.peak( channelData ) <= 1 );
			}
			const left = channel( result );
			PRESETS.forEach( ( name, index ) => {
				const from = frame( index * 0.8 );
				const level = g_metrics.peak( left, from, from + frame( 0.7 ) );
				assert.ok( level > 0.05, `${name} peak ${level}` );
			} );

			// The stored preset kept its frequency after the caller changed the object
			const at = result.values.mineAt + LEAD;
			assertNear(
				g_metrics.zeroCrossingFrequency(
					left, RATE, frame( at + 0.02 ), frame( at + 0.09 )
				),
				330, 330 * 0.01, "custom preset"
			);
		}
	);

	clockTest( "PLAY instruments resolve at play() time and build inserts only for admitted notes",
		async () => {
			const song = "@2 T120 L8 " + "C".repeat( 40 );
			const result = await suite.inHarness( {
				"config": { "duration": 4 }
			}, renderActions, { "actions": [
				{ "time": 0, "code": SETUP + `
					$.defineInstrument( 10, { "oType": "sine", "sustainLevel": 1,
						"attackTime": 0.01, "releaseTime": 0.05 } );
					$.play( "@10 T120 L4 A A A" );
					$.defineInstrument( 10, { "oType": "sine", "volume": 0.2 } );
					try {
						$.defineInstrument( 0, {} );
					} catch( error ) {
						values.code = error.code;
					}
					$.defineInstrument( 11, { "oType": "square" } );
					$.defineInstrument( 11, null );` },
				{ "time": 1.6, "code": `
					const before = __audioHarness.nodeCounts().createBiquadFilter || 0;
					$.play( ${JSON.stringify( song )} );
					values.filtersAtPlay = __audioHarness.nodeCounts().createBiquadFilter - before;
					values.filtersBefore = before;` },
				{ "time": 3.0, "code": `
					values.filtersLater = __audioHarness.nodeCounts().createBiquadFilter -
						values.filtersBefore;
					$.stopPlay();
					values.snareAt = new AudioContext().currentTime;
					$.play( "@4 T120 L4 P4 C, C" );` },
				{ "time": 3.9, "code": `
					values.sources = __audioHarness.sources().map(
						source => [ source.type, source.startTime ]
					);` }
			] } );
			const values = result.values;
			assert.equal( values.code, "INVALID_INSTRUMENT" );

			// The queued @10 song kept the definition it was parsed with: equal note peaks
			const left = channel( result );
			const first = g_metrics.peak( left, frame( LEAD + 0.1 ), frame( LEAD + 0.3 ) );
			const third = g_metrics.peak( left, frame( LEAD + 1.1 ), frame( LEAD + 1.3 ) );
			assert.ok( first > 0.5, `first ${first}` );
			assertNear( third, first, 0.01, "third note" );

			// Parsing created no filters; the window built one per admitted note so far
			assert.ok( values.filtersAtPlay <= 1, `at play ${values.filtersAtPlay}` );
			assert.ok(
				values.filtersLater >= 5 && values.filtersLater <= 8,
				`later ${values.filtersLater}`
			);

			// The snare runs on both comma tracks: two noise sources at the rest's end
			const noise = values.sources.filter(
				source => source[ 0 ] === "AudioBufferSourceNode" &&
					Math.abs( source[ 1 ] - ( values.snareAt + LEAD + 0.5 ) ) < 1e-6
			);
			assert.equal( noise.length, 2 );
		}
	);

	// Single-pass render, so engines without offline suspend() also cover sample instruments
	test( "sample instruments render in one pass at their playback rates", async () => {
		const result = await suite.inHarness( { "config": { "duration": 0.6 } }, async arg => {
			eval( arg.loader );
			$.setSoundLimiter( false );
			$.setVolume( 1 );
			const id = await __loadWav( arg.wav );
			$.defineInstrument( 20, { "audio": id, "volume": 0.5 } );
			$.defineInstrument( 21, { "audio": id, "rootFrequency": 392, "loop": true,
				"volume": 0.5 } );
			$.play( "T120 L4 @20 O5 C, @21 O4 G" );
			return __audioHarness.render( { "singlePass": true } );
		}, { "loader": g_fixtures.PAGE_LOADER, "wav": SAMPLE_WAV } );

		// C5 plays the C4 file at rate 2; G4 with a G4 root plays it at rate 1
		const left = channel( result );
		const from = frame( LEAD + 0.05 );
		const to = frame( LEAD + 0.3 );
		for( const frequency of [ C4 * 2, C4 ] ) {
			const amplitude = toneAmplitude( left, frequency, from, to );
			assert.ok( amplitude > 0.1, `${frequency} Hz amplitude ${amplitude}` );
		}
		assert.ok( toneAmplitude( left, C4 / 2, from, to ) < 0.01 );
	} );

	clockTest(
		"sample instruments play a loaded file across octaves, with sweeps, vibrato, and loops",
		async () => {
			const result = await suite.inHarness( {
				"config": { "duration": 9.4 }
			}, async arg => {
				eval( arg.loader );
				$.setSoundLimiter( false );
				$.setVolume( 1 );
				const id = await __loadWav( arg.wav );
				const envelope = { "attackTime": 0.005, "decayTime": 0, "sustainLevel": 1,
					"releaseTime": 0.02, "volume": 0.5 };
				const shaped = { "attackTime": 0.1, "decayTime": 0.1, "sustainLevel": 0.5,
					"releaseTime": 0.1, "volume": 0.5 };
				$.defineInstrument( 20, { "audio": id, ...envelope } );
				$.defineInstrument( 21, { "audio": id, "rootFrequency": 392, ...envelope } );
				$.defineInstrument( 22, { "audio": id, "frequencyEnd": arg.c4 * 2, ...envelope } );
				$.defineInstrument( 23, { "audio": id, "vibratoRate": 4, "vibratoDepth": 100,
					...envelope } );
				$.defineInstrument( 24, { "audio": id, "loop": true, ...envelope } );
				$.defineInstrument( 25, { "audio": "missing", ...envelope } );
				$.defineInstrument( 26, { "oType": "sine", ...shaped } );
				$.defineInstrument( 27, { "audio": id, ...shaped } );
				const warnings = [];
				const warn = console.warn;
				console.warn = message => warnings.push( String( message ) );
				const at = ( time, song ) => ( { "time": time, "run": () => $.play( song ) } );
				return __audioHarness.render( { "actions": [

					// Three octaves from C3, then G4 on a G4 root
					at( 0, "@20 T120 L4 O3 C" ),
					at( 0.5, "@20 T120 L4 O4 C" ),
					at( 1, "@20 T120 L4 O5 C" ),
					at( 1.5, "@20 T120 L4 O6 C" ),
					at( 2, "@21 T120 L4 O4 G" ),

					// A sweep up an octave, and vibrato through the source's detune
					at( 2.5, "@22 T120 L2 O4 C" ),
					at( 3.5, "@23 T120 L2 O4 C" ),

					// C6 plays the 2 s file at rate 4, so it lasts 0.5 s unless it loops
					at( 4.5, "@24 T120 L2 O6 C" ),
					at( 5.5, "@20 T120 L2 O6 C" ),

					// A file that is not loaded: silence, one warning per instrument and call
					at( 6.5, "@25 T120 L8 C D, C" ),

					// The same envelope on a sine oscillator and on the sine file
					at( 7, "@26 T120 L2 O4 C" ),
					at( 8, "@27 T120 L2 O4 C" )
				] } ).then( render => {
					console.warn = warn;
					return { ...render, "warnings": warnings };
				} );
			}, { "loader": g_fixtures.PAGE_LOADER, "wav": SAMPLE_WAV, "c4": C4 } );
			const left = channel( result );
			const pitch = ( from, to ) => g_metrics.zeroCrossingFrequency(
				left, RATE, frame( LEAD + from ), frame( LEAD + to )
			);
			[ 0.5, 1, 2, 4 ].forEach( ( ratio, index ) => {
				const expected = C4 * ratio;
				assertNear(
					pitch( 0.5 * index + 0.05, 0.5 * index + 0.3 ), expected, expected * 0.005,
					`ratio ${ratio}`
				);
			} );
			assertNear( pitch( 2.05, 2.3 ), C4, C4 * 0.005, "root frequency" );

			// The sweep rises from C4 toward C5 over the gate
			const early = pitch( 2.51, 2.56 );
			const late = pitch( 3.1, 3.15 );
			assert.ok( early < C4 * 1.1, `sweep start ${early}` );
			assert.ok( late > C4 * 1.7 && late < C4 * 2.01, `sweep end ${late}` );

			const vibrato = frequencyTrack( left, LEAD + 3.55, LEAD + 4.25, 0.025 );
			const high = C4 * Math.pow( 2, 1 / 12 );
			const low = C4 / Math.pow( 2, 1 / 12 );
			const top = Math.max( ...vibrato );
			const bottom = Math.min( ...vibrato );
			assert.ok( top > high - 8, `vibrato max ${top}` );
			assert.ok( bottom < low + 8, `vibrato min ${bottom}` );

			// The loop sounds through the note; the one-shot stops when its file ends. Actions
			// run at render steps, so notes start up to a step after their action time
			assertNear( pitch( 4.6, 5.15 ), C4 * 4, C4 * 4 * 0.005, "loop" );
			const looped = g_metrics.rms( left, frame( LEAD + 5.05 ), frame( LEAD + 5.15 ) );
			assert.ok( looped > 0.1, `loop level after the file's length ${looped}` );
			assertNear( pitch( 5.55, 5.95 ), C4 * 4, C4 * 4 * 0.005, "one-shot" );
			assert.ok( g_metrics.isSilent( left, frame( LEAD + 6.1 ), frame( LEAD + 6.4 ) ) );
			assert.ok( g_metrics.isSilent( left, frame( LEAD + 6.5 ), frame( LEAD + 7 ) ) );
			assert.deepEqual( result.warnings, [
				"play: Audio \"missing\" of instrument 25 is not loaded, or is streamed; its " +
				"notes are silent."
			] );

			// The sampled note's envelope matches the oscillator's. Windows start at each note's
			// first sound and hold ten cycles, so phase does not matter; the file's peak is half
			// the oscillator's
			const onset = time => {
				let index = frame( time );
				while( Math.abs( left[ index ] ) < 1e-6 ) {
					index++;
				}
				return index;
			};
			const cycles = frame( 10 / C4 );
			const synthesized = g_metrics.rmsWindows(
				left, cycles, onset( 7 ), onset( 7 ) + frame( 0.8 )
			);
			const sampled = g_metrics.rmsWindows(
				left, cycles, onset( 8 ), onset( 8 ) + frame( 0.8 )
			);
			assert.equal( sampled.length, synthesized.length );
			synthesized.forEach( ( level, index ) => {
				if( level > 0.02 ) {
					assertNear( sampled[ index ] / level, 0.5, 0.02, `envelope window ${index}` );
				}
			} );
		} );
}, { "plugins": [ "sound-advanced" ] } );
