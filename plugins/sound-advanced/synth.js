/**
 * Pi.js - Sound Advanced Synth Module (Plugin)
 *
 * synth(): a sound() superset with a filter and filter envelope, vibrato and tremolo LFOs,
 * pulse waves with a duty cycle, and arpeggios. Each feature is a voice insert that the sound
 * service builds only after admission. presets.js and instruments.js reuse the option parsing
 * and insert builders exported here.
 *
 * @module plugins/sound-advanced/synth
 */

"use strict";

export const FILTER_TYPES = [ "lowpass", "highpass", "bandpass", "notch" ];

// Parameter order for the positional form: the sound() parameters, then the synth additions
export const SYNTH_PARAMETERS = [
	"frequency", "duration", "volume", "oType", "delay", "attackTime", "decayTime",
	"sustainLevel", "releaseTime", "pan", "frequencyEnd", "filterType", "filterCutoff",
	"filterQ", "filterAttackTime", "filterDecayTime", "filterSustainLevel", "filterReleaseTime",
	"filterAmount", "vibratoRate", "vibratoDepth", "tremoloRate", "tremoloDepth", "duty",
	"arpeggio", "arpeggioRate"
];

// Harmonics in a pulse wave table, and the number of cached duty values
const PULSE_HARMONICS = 64;
const MAX_PULSE_TABLES = 64;

// Arpeggio limits: steps in a pattern, semitone range, and scheduled steps per voice
const MAX_ARPEGGIO_STEPS = 32;
const MAX_ARPEGGIO_SEMITONES = 48;
const MAX_ARPEGGIO_EVENTS = 4096;

// Core de-click floor on every envelope stage, in seconds
const MIN_RAMP = 0.003;

const m_pulseTables = new Map();
let m_service = null;


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Throw an error with an error code
 *
 * @param {Function} ErrorType - Error constructor
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {never}
 */
function throwCode( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}

/**
 * Read a numeric option; missing and non-numeric values use the default, as in sound()
 *
 * @param {*} value - Option value
 * @param {number} def - Default value
 * @returns {number} Number
 */
function readNumber( value, def ) {
	if( value === null || value === undefined ) {
		return def;
	}
	const parsed = Number( value );
	if( !Number.isFinite( parsed ) ) {
		return def;
	}
	return parsed;
}

/**
 * Throw a RangeError unless a value lies within a closed range
 *
 * @param {string} name - Command name
 * @param {Object} resolved - Resolved options
 * @param {string} param - Parameter name
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @param {string} code - Error code
 * @returns {void}
 */
function checkRange( name, resolved, param, min, max, code ) {
	const value = resolved[ param ];
	if( !( value >= min && value <= max ) ) {
		throwCode(
			RangeError,
			`${name}: Parameter ${param} must be a number between ${min} and ${max}.`,
			code
		);
	}
}

/**
 * Throw a RangeError unless a value is at least zero
 *
 * @param {string} name - Command name
 * @param {Object} resolved - Resolved options
 * @param {string} param - Parameter name
 * @param {string} code - Error code
 * @returns {void}
 */
function checkNonNegative( name, resolved, param, code ) {
	if( !( resolved[ param ] >= 0 ) ) {
		throwCode(
			RangeError,
			`${name}: Parameter ${param} must be a number greater than or equal to 0.`,
			code
		);
	}
}

/**
 * Throw a RangeError unless a value is above zero and at most a maximum
 *
 * @param {string} name - Command name
 * @param {Object} resolved - Resolved options
 * @param {string} param - Parameter name
 * @param {number} max - Maximum
 * @param {string} code - Error code
 * @returns {void}
 */
function checkPositive( name, resolved, param, max, code ) {
	const value = resolved[ param ];
	if( !( value > 0 && value <= max ) ) {
		throwCode(
			RangeError,
			`${name}: Parameter ${param} must be a number greater than 0 and at most ${max}.`,
			code
		);
	}
}

/**
 * Validate and copy an arpeggio pattern
 *
 * @param {string} name - Command name
 * @param {*} arpeggio - Semitone offsets
 * @returns {Array<number>|null} Copied offsets, or null for none
 */
function readArpeggio( name, arpeggio ) {
	if( arpeggio === null || arpeggio === undefined ) {
		return null;
	}
	if(
		!Array.isArray( arpeggio ) ||
		arpeggio.length === 0 ||
		arpeggio.length > MAX_ARPEGGIO_STEPS ||
		arpeggio.some(
			step => !Number.isFinite( step ) || Math.abs( step ) > MAX_ARPEGGIO_SEMITONES
		)
	) {
		throwCode(
			TypeError,
			`${name}: Parameter arpeggio must be an array of 1 to ${MAX_ARPEGGIO_STEPS} ` +
			`semitone offsets between -${MAX_ARPEGGIO_SEMITONES} and ${MAX_ARPEGGIO_SEMITONES}.`,
			"INVALID_ARPEGGIO"
		);
	}
	return arpeggio.slice();
}

/**
 * Wrap insert nodes in the voice-insert contract
 *
 * Scheduled nodes start with the voice. Stop deadlines only move earlier, and dispose runs
 * once. Core connects input, output, and detune; the insert owns its internal connections.
 *
 * @param {Object} parts - Insert parts
 * @param {AudioNode} parts.input - Node core connects into
 * @param {AudioNode} parts.output - Node core connects onward
 * @param {AudioNode} [parts.detune] - Pitch modulation output in cents
 * @param {Array<AudioScheduledSourceNode>} parts.sources - LFOs and constant sources
 * @param {Array<AudioNode>} parts.nodes - Every node to disconnect on dispose
 * @param {Function} [parts.onStart] - onStart( when, gateEnd ) schedules automation
 * @returns {Object} Voice insert
 */
function createInsert( parts ) {
	let stopAt = Infinity;
	let disposed = false;
	return {
		"input": parts.input,
		"output": parts.output,
		"detune": parts.detune || null,
		"start": ( when, gateEnd ) => {
			for( const source of parts.sources ) {
				source.start( when );
			}
			if( parts.onStart ) {
				parts.onStart( when, gateEnd );
			}
		},
		"stop": ( when ) => {
			if( when >= stopAt ) {
				return;
			}
			stopAt = when;
			for( const source of parts.sources ) {
				source.stop( when );
			}
		},
		"dispose": () => {
			if( disposed ) {
				return;
			}
			disposed = true;
			for( const node of parts.nodes ) {
				node.disconnect();
			}
		}
	};
}

/**
 * Filter insert: a biquad filter whose envelope moves its cutoff in octaves through detune
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} params - type, cutoff, q, amount (octaves), and envelope
 * @returns {Object} Voice insert
 */
function createFilterInsert( context, params ) {
	const filter = context.createBiquadFilter();
	filter.type = params.type;
	filter.frequency.value = params.cutoff;
	filter.Q.value = params.q;
	return createInsert( {
		"input": filter,
		"output": filter,
		"sources": [],
		"nodes": [ filter ],
		"onStart": ( when, gateEnd ) => {
			if( params.amount !== 0 ) {
				m_service.scheduleEnvelope(
					filter.detune, params.envelope, when, gateEnd, params.amount * 1200
				);
			}
		}
	} );
}

/**
 * Tremolo insert: an LFO swings the chain gain between 1 − depth and 1
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} params - rate (Hz) and depth (0-1)
 * @returns {Object} Voice insert
 */
function createTremoloInsert( context, params ) {
	const amp = context.createGain();
	amp.gain.value = 1 - params.depth / 2;
	const lfo = context.createOscillator();
	lfo.frequency.value = params.rate;
	const depth = context.createGain();
	depth.gain.value = params.depth / 2;
	lfo.connect( depth );
	depth.connect( amp.gain );
	return createInsert( {
		"input": amp,
		"output": amp,
		"sources": [ lfo ],
		"nodes": [ lfo, depth, amp ]
	} );
}

/**
 * Vibrato insert: an LFO in cents on the detune output; audio passes through unchanged
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} params - rate (Hz) and depth (cents)
 * @returns {Object} Voice insert
 */
function createVibratoInsert( context, params ) {
	const pass = context.createGain();
	const lfo = context.createOscillator();
	lfo.frequency.value = params.rate;
	const depth = context.createGain();
	depth.gain.value = params.depth;
	lfo.connect( depth );
	return createInsert( {
		"input": pass,
		"output": pass,
		"detune": depth,
		"sources": [ lfo ],
		"nodes": [ lfo, depth, pass ]
	} );
}

/**
 * Arpeggio insert: steps the detune output through the pattern until the release ends
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} params - steps (cents), rate (steps per second), and releaseTime
 * @returns {Object} Voice insert
 */
function createArpeggioInsert( context, params ) {
	const pass = context.createGain();
	const steps = context.createConstantSource();
	steps.offset.value = params.steps[ 0 ];
	return createInsert( {
		"input": pass,
		"output": pass,
		"detune": steps,
		"sources": [ steps ],
		"nodes": [ steps, pass ],
		"onStart": ( when, gateEnd ) => {
			const end = gateEnd + Math.max( params.releaseTime, MIN_RAMP );
			const interval = 1 / params.rate;
			steps.offset.setValueAtTime( params.steps[ 0 ], when );
			for( let count = 1; count < MAX_ARPEGGIO_EVENTS; count++ ) {
				const time = when + count * interval;
				if( time >= end ) {
					break;
				}
				steps.offset.setValueAtTime( params.steps[ count % params.steps.length ], time );
			}
		}
	} );
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Fourier tables for a pulse wave, cached per duty value
 *
 * The pulse is high for `duty` of each period. Index 0 (DC) is zero, as PeriodicWave ignores
 * it. At a duty of 0.5 the even harmonics vanish and the tables describe a square wave.
 *
 * @param {number} duty - Fraction of the period the pulse is high, between 0 and 1
 * @returns {Array<Array<number>>} Frozen [ real, imag ] coefficient arrays
 */
export function pulseWaveTables( duty ) {
	let tables = m_pulseTables.get( duty );
	if( tables ) {
		return tables;
	}
	const real = [ 0 ];
	const imag = [ 0 ];
	for( let n = 1; n <= PULSE_HARMONICS; n++ ) {
		const angle = 2 * Math.PI * n * duty;
		real.push( 2 * Math.sin( angle ) / ( Math.PI * n ) );
		imag.push( 2 * ( 1 - Math.cos( angle ) ) / ( Math.PI * n ) );
	}
	tables = Object.freeze( [ Object.freeze( real ), Object.freeze( imag ) ] );
	if( m_pulseTables.size >= MAX_PULSE_TABLES ) {
		m_pulseTables.delete( m_pulseTables.keys().next().value );
	}
	m_pulseTables.set( duty, tables );
	return tables;
}

/**
 * Parse and validate synth options, applying defaults
 *
 * The sound() parameters are checked here too, so presets and instruments fail when they are
 * defined rather than when they first play. The sound service validates them again, including
 * oType names, when a voice is created.
 *
 * @param {string} name - Command name for error messages
 * @param {Object} options - synth() options
 * @returns {Object} Resolved options
 */
export function resolveSynthOptions( name, options ) {
	if( options === null || typeof options !== "object" ) {
		throwCode( TypeError, `${name}: Parameter options must be an object.`, "INVALID_OPTIONS" );
	}
	let frequencyEnd = null;
	if( options.frequencyEnd != null ) {
		frequencyEnd = readNumber( options.frequencyEnd, NaN );
	}
	let oType = "triangle";
	if( options.oType != null ) {
		oType = options.oType;
	}
	let filterType = null;
	if( options.filterType != null ) {
		filterType = options.filterType;
	}
	const resolved = {
		"frequency": readNumber( options.frequency, 440 ),
		"frequencyEnd": frequencyEnd,
		"duration": readNumber( options.duration, 1 ),
		"volume": readNumber( options.volume, 1 ),
		"oType": oType,
		"delay": readNumber( options.delay, 0 ),
		"attackTime": readNumber( options.attackTime, 0 ),
		"decayTime": readNumber( options.decayTime, 0 ),
		"sustainLevel": readNumber( options.sustainLevel, 1 ),
		"releaseTime": readNumber( options.releaseTime, 0.1 ),
		"pan": readNumber( options.pan, 0 ),
		"filterType": filterType,
		"filterCutoff": readNumber( options.filterCutoff, 1000 ),
		"filterQ": readNumber( options.filterQ, 1 ),
		"filterAttackTime": readNumber( options.filterAttackTime, 0 ),
		"filterDecayTime": readNumber( options.filterDecayTime, 0 ),
		"filterSustainLevel": readNumber( options.filterSustainLevel, 1 ),
		"filterReleaseTime": readNumber( options.filterReleaseTime, 0.1 ),
		"filterAmount": readNumber( options.filterAmount, 0 ),
		"vibratoRate": readNumber( options.vibratoRate, 5 ),
		"vibratoDepth": readNumber( options.vibratoDepth, 0 ),
		"tremoloRate": readNumber( options.tremoloRate, 5 ),
		"tremoloDepth": readNumber( options.tremoloDepth, 0 ),
		"duty": readNumber( options.duty, 0.5 ),
		"arpeggio": readArpeggio( name, options.arpeggio ),
		"arpeggioRate": readNumber( options.arpeggioRate, 12 )
	};

	// sound() parameters
	checkNonNegative( name, resolved, "duration", "INVALID_DURATION" );
	checkRange( name, resolved, "volume", 0, 1, "INVALID_VOLUME" );
	checkNonNegative( name, resolved, "delay", "INVALID_DELAY" );
	checkNonNegative( name, resolved, "attackTime", "INVALID_ATTACK_TIME" );
	checkNonNegative( name, resolved, "decayTime", "INVALID_DECAY_TIME" );
	checkRange( name, resolved, "sustainLevel", 0, 1, "INVALID_SUSTAIN_LEVEL" );
	checkNonNegative( name, resolved, "releaseTime", "INVALID_RELEASE_TIME" );
	checkRange( name, resolved, "pan", -1, 1, "INVALID_PAN" );
	if( frequencyEnd !== null && !( resolved.frequency > 0 && frequencyEnd > 0 ) ) {
		throwCode(
			RangeError,
			`${name}: Parameters frequency and frequencyEnd must be greater than 0 for a sweep.`,
			"INVALID_FREQUENCY"
		);
	}
	if( typeof oType !== "string" && !Array.isArray( oType ) ) {
		throwCode(
			TypeError, `${name}: Parameter oType must be a string or an array.`, "INVALID_OTYPE"
		);
	}

	// Filter and filter envelope
	if( filterType !== null && FILTER_TYPES.indexOf( filterType ) === -1 ) {
		throwCode(
			Error,
			`${name}: Parameter filterType must be one of: ${FILTER_TYPES.join( ", " )}.`,
			"INVALID_FILTER_TYPE"
		);
	}
	checkPositive( name, resolved, "filterCutoff", 24000, "INVALID_FILTER_CUTOFF" );
	checkRange( name, resolved, "filterQ", 0, 100, "INVALID_FILTER_Q" );
	checkNonNegative( name, resolved, "filterAttackTime", "INVALID_FILTER_ATTACK_TIME" );
	checkNonNegative( name, resolved, "filterDecayTime", "INVALID_FILTER_DECAY_TIME" );
	checkRange( name, resolved, "filterSustainLevel", 0, 1, "INVALID_FILTER_SUSTAIN_LEVEL" );
	checkNonNegative( name, resolved, "filterReleaseTime", "INVALID_FILTER_RELEASE_TIME" );
	checkRange( name, resolved, "filterAmount", -10, 10, "INVALID_FILTER_AMOUNT" );

	// LFOs, pulse duty, and arpeggio
	checkPositive( name, resolved, "vibratoRate", 100, "INVALID_VIBRATO_RATE" );
	checkRange( name, resolved, "vibratoDepth", 0, 1200, "INVALID_VIBRATO_DEPTH" );
	checkPositive( name, resolved, "tremoloRate", 100, "INVALID_TREMOLO_RATE" );
	checkRange( name, resolved, "tremoloDepth", 0, 1, "INVALID_TREMOLO_DEPTH" );
	if( !( resolved.duty > 0 && resolved.duty < 1 ) ) {
		throwCode(
			RangeError,
			`${name}: Parameter duty must be a number between 0 and 1, exclusive.`,
			"INVALID_DUTY"
		);
	}
	checkPositive( name, resolved, "arpeggioRate", 100, "INVALID_ARPEGGIO_RATE" );

	return resolved;
}

/**
 * Build insert descriptors for the features resolved options enable
 *
 * Descriptors hold a factory and a params snapshot; the sound service invokes factories only
 * after a voice is admitted.
 *
 * @param {Object} resolved - Options from resolveSynthOptions
 * @param {number} releaseTime - Voice release in seconds, which bounds the arpeggio steps
 * @returns {Array<Object>} Insert descriptors: { factory, params }
 */
export function buildSynthInserts( resolved, releaseTime ) {
	const inserts = [];
	if( resolved.filterType !== null ) {
		inserts.push( {
			"factory": createFilterInsert,
			"params": {
				"type": resolved.filterType,
				"cutoff": resolved.filterCutoff,
				"q": resolved.filterQ,
				"amount": resolved.filterAmount,
				"envelope": {
					"attackTime": resolved.filterAttackTime,
					"decayTime": resolved.filterDecayTime,
					"sustainLevel": resolved.filterSustainLevel,
					"releaseTime": resolved.filterReleaseTime
				}
			}
		} );
	}
	if( resolved.tremoloDepth > 0 ) {
		inserts.push( {
			"factory": createTremoloInsert,
			"params": { "rate": resolved.tremoloRate, "depth": resolved.tremoloDepth }
		} );
	}
	if( resolved.vibratoDepth > 0 ) {
		inserts.push( {
			"factory": createVibratoInsert,
			"params": { "rate": resolved.vibratoRate, "depth": resolved.vibratoDepth }
		} );
	}
	if( resolved.arpeggio !== null ) {
		inserts.push( {
			"factory": createArpeggioInsert,
			"params": {
				"steps": resolved.arpeggio.map( step => step * 100 ),
				"rate": resolved.arpeggioRate,
				"releaseTime": releaseTime
			}
		} );
	}
	return inserts;
}

/**
 * Resolve an oType for the sound service, turning "pulse" into wave tables
 *
 * @param {Object} resolved - Options from resolveSynthOptions
 * @returns {string|Array} oType or [ real, imag ] tables
 */
export function resolveOType( resolved ) {
	if( resolved.oType === "pulse" ) {
		return pulseWaveTables( resolved.duty );
	}
	return resolved.oType;
}

/**
 * Turn synth options into a sound service voice spec
 *
 * @param {string} name - Command name for error messages
 * @param {Object} options - synth() options
 * @returns {Object} Voice spec for createVoice
 */
export function resolveSynthSpec( name, options ) {
	const resolved = resolveSynthOptions( name, options );
	return {
		"frequency": resolved.frequency,
		"frequencyEnd": resolved.frequencyEnd,
		"duration": resolved.duration,
		"volume": resolved.volume,
		"oType": resolveOType( resolved ),
		"delay": resolved.delay,
		"attackTime": resolved.attackTime,
		"decayTime": resolved.decayTime,
		"sustainLevel": resolved.sustainLevel,
		"releaseTime": resolved.releaseTime,
		"pan": resolved.pan,
		"inserts": buildSynthInserts( resolved, resolved.releaseTime )
	};
}

/**
 * Play synth options through the sound service
 *
 * @param {string} name - Command name for error messages
 * @param {Object} options - synth() options
 * @returns {string} Sound ID for use with stopSound
 */
export function playSynth( name, options ) {
	return m_service.createVoice( resolveSynthSpec( name, options ), name );
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the synth command
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} service - Sound extension service
 * @returns {void}
 */
export function register( pluginApi, service ) {
	m_service = service;


	pluginApi.addCommand( "synth", synth, false, SYNTH_PARAMETERS );

	/**
	 * Play a synthesized sound with a filter, LFOs, pulse duty, and arpeggio
	 *
	 * Takes every sound() parameter, plus oType "pulse" with duty. The filter runs when
	 * filterType is set; its envelope moves the cutoff by filterAmount octaves at the peak.
	 * Vibrato and tremolo run when their depth is above 0, and the arpeggio cycles semitone
	 * offsets at arpeggioRate steps per second.
	 *
	 * @param {Object} options - Command options
	 * @returns {string} Sound ID for use with stopSound
	 */
	function synth( options ) {
		return playSynth( "synth", options );
	}
}
