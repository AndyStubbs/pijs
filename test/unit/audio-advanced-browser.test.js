/**
 * Offline render tests for the sound-advanced plugin: synth() filter and filter envelope,
 * vibrato, tremolo, pulse duty, and arpeggio; periodic noise; bus reverb and delay and their
 * interaction with bus volume; getSoundLevels(); the built-in presets; and PLAY instruments.
 * Each page loads the full bundle followed by the plugin's source bundle.
 *
 * Tone levels are measured with a single-bin DFT written here, independent of the plugin.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./audio-render-harness.js";
import * as g_metrics from "./audio-metrics.js";
import * as g_suite from "./audio-browser-suite.js";
const test = g_test.test;
const assert = g_assert;
const frame = g_suite.frame;

const RATE = g_harness.SAMPLE_RATE;
const LEAD = g_suite.LEAD;

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

	test( "the lowpass filter and its envelope shape the harmonics", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 2 }, "needsSuspend": true
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
		if( !result ) {
			return;
		}
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

	test( "vibrato, arpeggio, and tremolo modulate pitch and level", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 2.4 }, "needsSuspend": true
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
		if( !result ) {
			return;
		}
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
	test( "synth pulse, vibrato, and periodic voices render in one pass", async t => {
		const result = await suite.inHarness( t, {
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
		if( !result ) {
			return;
		}
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

	test( "pulse duty sets the harmonic content", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 1.2 }, "needsSuspend": true
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				$.synth( { "frequency": 200, "duration": 0.4, "volume": 0.5, "oType": "pulse",
					"duty": 0.5 } );` },
			{ "time": 0.6, "code": `
				$.synth( { "frequency": 200, "duration": 0.4, "volume": 0.5, "oType": "pulse",
					"duty": 0.25 } );` }
		] } );
		if( !result ) {
			return;
		}
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

	test( "periodic noise repeats every 93 clock steps and follows its clock sweep",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 1.2 }, "needsSuspend": true
			}, renderActions, { "actions": [
				{ "time": 0, "code": SETUP + `
					values.id = $.sound( { "frequency": 9300, "duration": 0.4, "volume": 0.5,
						"oType": "periodic" } );` },
				{ "time": 0.6, "code": `
					$.synth( { "frequency": 9300, "frequencyEnd": 4650, "duration": 0.4,
						"volume": 0.5, "oType": "periodic" } );` }
			] } );
			if( !result ) {
				return;
			}
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

	test( "setBusVolume and setBusEffect work in either order; effects validate", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 3.2 }, "needsSuspend": true
		}, renderActions, { "actions": [
			{ "time": 0, "code": SETUP + `
				const codeOf = fn => {
					try {
						fn();
					} catch( error ) {
						return error.code;
					}
					return null;
				};
				values.codes = [
					codeOf( () => $.setBusEffect( "sfx", "chorus" ) ),
					codeOf( () => $.setBusEffect( "drums", "delay" ) ),
					codeOf( () => $.setBusEffect( "sfx", "delay", { "feedback": 1 } ) ),
					codeOf( () => $.setBusEffect( "sfx", "reverb", 3 ) )
				];
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
		if( !result ) {
			return;
		}
		assert.deepEqual( result.values.codes, [
			"INVALID_EFFECT", "INVALID_BUS", "INVALID_EFFECT_OPTION", "INVALID_OPTIONS"
		] );
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

	test( "getSoundLevels reports levels, spectrum, and waveform after the bus volume",
		async t => {
			const result = await suite.inHarness( t, {
				"config": { "duration": 0.8 }, "needsSuspend": true
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
			if( !result ) {
				return;
			}
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

	test( "getSoundLevels measures the output after the limiter", async t => {
		const result = await suite.inHarness( t, {
			"config": { "duration": 0.6 }, "needsSuspend": true
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
		if( !result ) {
			return;
		}

		// The master tap is before the limiter, so it is over full scale; the output is not
		assert.ok( result.values.master > 1, `master ${result.values.master}` );
		assert.ok(
			result.values.output <= 1 && result.values.output > 0.5,
			`output ${result.values.output}`
		);
	} );

	test( "built-in presets play within the limiter ceiling; custom presets validate",
		async t => {
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
					codeOf( () => $.definePreset( "", {} ) ),
					codeOf( () => $.definePreset( "bad", { "filterType": "comb" } ) ),
					codeOf( () => $.definePreset( "bad", { "volume": 3 } ) )
				];
				const params = { "frequency": 330, "duration": 0.1, "oType": "square" };
				$.definePreset( "mine", params );
				params.frequency = 20;
				values.ids.push( $.sfx( { "name": "mine" } ) );
				values.mineAt = new AudioContext().currentTime;` } );
			const result = await suite.inHarness( t, {
				"config": { "duration": PRESETS.length * 0.8 + 0.4 }, "needsSuspend": true
			}, renderActions, { "actions": actions } );
			if( !result ) {
				return;
			}
			assert.deepEqual( result.values.codes, [
				"PRESET_NOT_FOUND", "INVALID_VARIATION", "INVALID_PRESET_NAME",
				"INVALID_FILTER_TYPE", "INVALID_VOLUME"
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

	test( "PLAY instruments resolve at play() time and build inserts only for admitted notes",
		async t => {
			const song = "@2 T120 L8 " + "C".repeat( 40 );
			const result = await suite.inHarness( t, {
				"config": { "duration": 4 }, "needsSuspend": true
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
			if( !result ) {
				return;
			}
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
}, { "plugins": [ "sound-advanced" ] } );
