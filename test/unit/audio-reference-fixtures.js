/**
 * Calibration fixtures for the reference-residual click checks.
 *
 * Each fixture renders the same source twice in the same engine with raw Web Audio: once with
 * gain automation and once as an unmodulated carrier. The Node side multiplies the carrier by
 * an independent oracle envelope and measures the residual. Valid fades must pass; abrupt
 * onsets and stops at nonzero carrier amplitude must fail.
 */
import * as g_metrics from "./audio-metrics.js";

/** Fade length used by valid stop fixtures, matching the planned 10 ms stop fade. */
const FADE = 0.01;

/** Onset ramp used by onset fixtures, matching the planned 3 ms de-click floor. */
const ONSET = 0.003;

const WAVEFORMS = [ "sine", "square", "triangle", "sawtooth" ];
const FREQUENCIES = [ 100, 440, 1250 ];
const PHASES = [ 0, 0.25, 0.6 ];
const NOISE_SEEDS = [ 1, 2, 3 ];

/** Phase within the period where each waveform is near full amplitude. */
const LOUD_PHASE = { "sine": 0.25, "square": 0.25, "triangle": 0.25, "sawtooth": 0.45 };

/**
 * Returns the event time: the first whole period after 0.1 s plus a phase fraction.
 *
 * @param {number} frequency - Carrier frequency
 * @param {number} phase - Fraction of a period
 * @returns {number} Time in seconds
 */
function eventTime( frequency, phase ) {
	return Math.ceil( 0.1 * frequency ) / frequency + phase / frequency;
}

function stopEvents( shape, start ) {
	if( shape === "linear" ) {
		return [
			{ "type": "set", "time": start, "value": 1 },
			{ "type": "linear", "time": start + FADE, "value": 0 }
		];
	}
	if( shape === "exponential" ) {
		return [
			{ "type": "target", "time": start, "target": 0,
				"timeConstant": FADE / Math.log( 10000 ) },
			{ "type": "set", "time": start + FADE, "value": 0 }
		];
	}
	return [ { "type": "set", "time": start, "value": 0 } ];
}

function onsetEvents( shape, start ) {
	if( shape === "linear" ) {
		return [
			{ "type": "set", "time": 0, "value": 0 },
			{ "type": "set", "time": start, "value": 0 },
			{ "type": "linear", "time": start + ONSET, "value": 1 }
		];
	}
	return [
		{ "type": "set", "time": 0, "value": 0 },
		{ "type": "set", "time": start, "value": 1 }
	];
}

/**
 * Builds the fixture list.
 *
 * Every fixture has a render spec for the page and an expected oracle envelope. A fixture's
 * "valid" flag says whether the rendered automation matches the expectation.
 *
 * @returns {Object[]} Fixtures
 */
function buildFixtures() {
	const fixtures = [];
	const sources = [];
	for( const waveform of WAVEFORMS ) {
		for( const frequency of FREQUENCIES ) {
			sources.push( { "type": waveform, "frequency": frequency } );
		}
	}
	for( const seed of NOISE_SEEDS ) {
		sources.push( { "type": "noise", "seed": seed, "frequency": 100 } );
	}

	for( const source of sources ) {
		let label = `${source.type} ${source.frequency} Hz`;
		if( source.type === "noise" ) {
			label = `noise seed ${source.seed}`;
		}
		for( const phase of PHASES ) {
			const time = eventTime( source.frequency, phase );
			for( const shape of [ "linear", "exponential" ] ) {
				fixtures.push( {
					"name": `${label} ${shape} stop, phase ${phase}`,
					"kind": "stop", "valid": true, "source": source,
					"automation": stopEvents( shape, time ), "initialValue": 1,
					"expected": stopEvents( shape, time ), "time": time
				} );
			}
			fixtures.push( {
				"name": `${label} onset, phase ${phase}`,
				"kind": "onset", "valid": true, "source": source,
				"automation": onsetEvents( "linear", time ), "initialValue": 0,
				"expected": onsetEvents( "linear", time ), "time": time
			} );
		}

		// Abrupt fixtures land where the carrier is loud, so the discontinuity is audible
		const loudTime = eventTime( source.frequency, LOUD_PHASE[ source.type ] ?? 0.3 );
		fixtures.push( {
			"name": `${label} abrupt stop`,
			"kind": "stop", "valid": false, "source": source,
			"automation": stopEvents( "abrupt", loudTime ), "initialValue": 1,
			"expected": stopEvents( "linear", loudTime ), "time": loudTime
		} );
		fixtures.push( {
			"name": `${label} abrupt onset`,
			"kind": "onset", "valid": false, "source": source,
			"automation": onsetEvents( "abrupt", loudTime ), "initialValue": 0,
			"expected": onsetEvents( "linear", loudTime ), "time": loudTime
		} );
	}
	return fixtures;
}

/**
 * Page function: renders each fixture with automation and as a plain carrier.
 *
 * @param {Object[]} specs - { source, automation, initialValue } per fixture
 * @returns {Promise<Object[]>} Base64 Float32 { rendered, carrier } per fixture
 */
async function renderFixturesInPage( specs ) {
	const sampleRate = 48000;
	const length = Math.round( 0.2 * sampleRate );

	function noiseData( seed ) {
		let state = seed >>> 0;
		const data = new Float32Array( length );
		for( let i = 0; i < length; i++ ) {
			state = ( state + 0x6d2b79f5 ) >>> 0;
			let value = state;
			value = Math.imul( value ^ ( value >>> 15 ), value | 1 );
			value ^= value + Math.imul( value ^ ( value >>> 7 ), value | 61 );
			data[ i ] = ( ( ( value ^ ( value >>> 14 ) ) >>> 0 ) / 4294967296 ) * 2 - 1;
		}
		return data;
	}

	function encode( data ) {
		const bytes = new Uint8Array( data.buffer, data.byteOffset, data.byteLength );
		let binary = "";
		for( let i = 0; i < bytes.length; i += 0x8000 ) {
			binary += String.fromCharCode.apply( null, bytes.subarray( i, i + 0x8000 ) );
		}
		return btoa( binary );
	}

	async function renderOne( source, automation, initialValue ) {
		const context = new OfflineAudioContext( 1, length, sampleRate );
		let node;
		if( source.type === "noise" ) {
			const buffer = context.createBuffer( 1, length, sampleRate );
			buffer.copyToChannel( noiseData( source.seed ), 0 );
			node = context.createBufferSource();
			node.buffer = buffer;
		} else {
			node = context.createOscillator();
			node.type = source.type;
			node.frequency.value = source.frequency;
		}
		const gain = context.createGain();
		gain.gain.value = initialValue;
		for( const event of automation ) {
			if( event.type === "set" ) {
				gain.gain.setValueAtTime( event.value, event.time );
			} else if( event.type === "linear" ) {
				gain.gain.linearRampToValueAtTime( event.value, event.time );
			} else if( event.type === "target" ) {
				gain.gain.setTargetAtTime( event.target, event.time, event.timeConstant );
			}
		}
		node.connect( gain );
		gain.connect( context.destination );
		node.start( 0 );
		const buffer = await context.startRendering();
		return encode( buffer.getChannelData( 0 ) );
	}

	const results = [];
	for( const spec of specs ) {
		results.push( {
			"rendered": await renderOne( spec.source, spec.automation, spec.initialValue ),
			"carrier": await renderOne( spec.source, [], 1 )
		} );
	}
	return results;
}

/**
 * Measures one rendered fixture against its oracle.
 *
 * @param {Object} fixture - Fixture from buildFixtures()
 * @param {Float32Array} rendered - Automated render
 * @param {Float32Array} carrier - Plain carrier render
 * @returns {Object} Residual measurements
 */
function measureFixture( fixture, rendered, carrier ) {
	const sampleRate = 48000;
	const envelope = g_metrics.automationEnvelope( fixture.expected, fixture.initialValue );
	const eventFrame = Math.floor( fixture.time * sampleRate );
	const carrierAtEvent = g_metrics.peak( carrier, eventFrame - 2, eventFrame + 3 );
	if( fixture.kind === "stop" ) {
		return {
			...g_metrics.stopResidual( rendered, carrier, envelope, {
				"sampleRate": sampleRate,
				"from": eventFrame - Math.round( 0.005 * sampleRate ),
				"stopEnd": fixture.time + FADE
			} ),
			"carrierAtEvent": carrierAtEvent
		};
	}
	return {
		...g_metrics.onsetResidual( rendered, carrier, envelope, {
			"sampleRate": sampleRate,
			"onset": fixture.time,
			"to": eventFrame + Math.round( 0.01 * sampleRate )
		} ),
		"carrierAtEvent": carrierAtEvent
	};
}

export { FADE, ONSET, buildFixtures, measureFixture, renderFixturesInPage };
