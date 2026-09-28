/**
 * Pi.js - Sound Advanced Instruments Module (Plugin)
 *
 * PLAY instruments: defineInstrument() stores synth() options under a number, and a PLAY
 * extension claims the `@n` token to select one per track. Each note resolves its instrument
 * while play() builds the song, so redefining an instrument affects later play() calls only.
 * Instruments build their inserts through synth.js and play loaded audio files through
 * sample-source.js (documented dependencies).
 *
 * @module plugins/sound-advanced/instruments
 */

"use strict";

import * as g_sampleSource from "./sample-source.js";
import * as g_synth from "./synth.js";

export const EXTENSION_NAME = "instruments";
export const MAX_INSTRUMENT = 255;

// Envelope fields an instrument may override, in seconds
const ENVELOPE_FIELDS = [ "attackTime", "decayTime", "sustainLevel", "releaseTime" ];

// Built-in instruments, as synth() options
export const BUILT_IN_INSTRUMENTS = {
	"1": {
		"oType": "pulse", "duty": 0.5, "vibratoRate": 5.5, "vibratoDepth": 12
	},
	"2": {
		"oType": "pulse", "duty": 0.25, "attackTime": 0.003, "decayTime": 0.15,
		"sustainLevel": 0.3, "filterType": "lowpass", "filterCutoff": 700, "filterAmount": 2,
		"filterDecayTime": 0.12, "filterSustainLevel": 0
	},
	"3": {
		"oType": "sawtooth", "volume": 0.7, "attackTime": 0.2, "sustainLevel": 0.8,
		"releaseTime": 0.4, "filterType": "lowpass", "filterCutoff": 1200, "filterQ": 0.7,
		"tremoloRate": 4, "tremoloDepth": 0.15
	},
	"4": {
		"oType": "white", "attackTime": 0, "decayTime": 0.12, "sustainLevel": 0,
		"releaseTime": 0.05, "filterType": "bandpass", "filterCutoff": 2000, "filterQ": 0.8
	},
	"5": {
		"oType": "white", "volume": 0.6, "attackTime": 0, "decayTime": 0.04, "sustainLevel": 0,
		"releaseTime": 0.02, "filterType": "highpass", "filterCutoff": 7000
	},
	"6": {
		"oType": "sine", "frequency": 150, "frequencyEnd": 45, "attackTime": 0,
		"decayTime": 0.25, "sustainLevel": 0, "releaseTime": 0.05
	}
};

// Instruments by number: resolved note overrides
const m_instruments = new Map();


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
 * Validate a sample instrument's audio, rootFrequency, and loop options
 *
 * @param {Object} params - defineInstrument params
 * @returns {Object|null} { audio, rootFrequency, loop }, or null without audio
 */
function readSampleOptions( params ) {
	const audio = params.audio;
	if( audio == null ) {
		if( params.rootFrequency != null || params.loop != null ) {
			throwCode(
				Error, "defineInstrument: Parameters rootFrequency and loop require audio.",
				"INVALID_INSTRUMENT"
			);
		}
		return null;
	}
	if( typeof audio !== "string" ) {
		throwCode(
			TypeError, "defineInstrument: Parameter audio must be a string.", "INVALID_AUDIO"
		);
	}
	if( audio === "" ) {
		throwCode(
			RangeError, "defineInstrument: Parameter audio must not be empty.", "INVALID_AUDIO"
		);
	}
	if( params.oType != null ) {
		throwCode(
			Error, "defineInstrument: Parameters audio and oType cannot be used together.",
			"INVALID_INSTRUMENT"
		);
	}
	let rootFrequency = g_sampleSource.DEFAULT_ROOT_FREQUENCY;
	if( params.rootFrequency != null ) {
		rootFrequency = params.rootFrequency;
		if( typeof rootFrequency !== "number" ) {
			throwCode(
				TypeError, "defineInstrument: Parameter rootFrequency must be a number.",
				"INVALID_ROOT_FREQUENCY"
			);
		}
		if( !( rootFrequency > 0 && rootFrequency < Infinity ) ) {
			throwCode(
				RangeError,
				"defineInstrument: Parameter rootFrequency must be a finite number greater " +
				"than 0.",
				"INVALID_ROOT_FREQUENCY"
			);
		}
	}
	let loop = false;
	if( params.loop != null ) {
		loop = params.loop;
		if( typeof loop !== "boolean" ) {
			throwCode(
				TypeError, "defineInstrument: Parameter loop must be a boolean.", "INVALID_LOOP"
			);
		}
	}
	return { "audio": audio, "rootFrequency": rootFrequency, "loop": loop };
}

/**
 * Whether a sample instrument's file has a decoded buffer
 *
 * @param {Object} instrument - Stored instrument with audio and service
 * @returns {boolean} True when the file is loaded in decode mode
 */
function isSampleReady( instrument ) {
	return instrument.service.getAudioBuffer( instrument.audio ) !== null;
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Validate an instrument and store its note overrides; null params remove it
 *
 * Only the options an instrument sets replace the PLAY values: oType, envelope times,
 * pan, and a fixed frequency or sweep target. volume scales the note volume. Filter, LFO,
 * and arpeggio options become voice inserts. With audio, notes play that loaded file through
 * a sample source type, pitched from rootFrequency.
 *
 * @param {number} instrument - Instrument number, 1-255
 * @param {Object|null} params - synth() options plus audio, rootFrequency, and loop, or null
 * to remove the instrument
 * @param {Object} [service] - Sound extension service; required with audio
 * @returns {void}
 */
export function storeInstrument( instrument, params, service ) {
	if( !Number.isInteger( instrument ) || instrument < 1 || instrument > MAX_INSTRUMENT ) {
		throwCode(
			RangeError,
			"defineInstrument: Parameter instrument must be an integer from 1 to " +
			`${MAX_INSTRUMENT}.`,
			"INVALID_INSTRUMENT"
		);
	}
	if( params === null || params === undefined ) {
		m_instruments.delete( instrument );
		return;
	}
	if( typeof params !== "object" || Array.isArray( params ) ) {
		throwCode(
			TypeError, "defineInstrument: Parameter params must be an object or null.",
			"INVALID_INSTRUMENT_PARAMS"
		);
	}
	const resolved = g_synth.resolveSynthOptions( "defineInstrument", params );
	const sample = readSampleOptions( params );
	const envelope = {};
	let hasEnvelope = false;
	for( const field of ENVELOPE_FIELDS ) {
		if( params[ field ] != null ) {
			envelope[ field ] = resolved[ field ];
			hasEnvelope = true;
		}
	}
	const record = {
		"resolved": Object.freeze( resolved ),
		"oType": null,
		"envelope": null,
		"volume": null,
		"pan": null,
		"frequency": null,
		"frequencyEnd": resolved.frequencyEnd,
		"audio": null,
		"service": null
	};
	if( params.oType != null ) {
		record.oType = g_synth.resolveOType( resolved );
	}
	if( sample !== null ) {
		record.oType = g_sampleSource.getSampleType(
			service, sample.audio, sample.rootFrequency, sample.loop
		);
		record.audio = sample.audio;
		record.service = service;
	}
	if( hasEnvelope ) {
		record.envelope = Object.freeze( envelope );
	}
	if( params.volume != null ) {
		record.volume = resolved.volume;
	}
	if( params.pan != null ) {
		record.pan = resolved.pan;
	}
	if( params.frequency != null ) {
		record.frequency = resolved.frequency;
	}
	m_instruments.set( instrument, Object.freeze( record ) );
}

/**
 * Voice overrides for one PLAY note under the track's instrument
 *
 * A sample instrument whose file is not loaded when play() is called, or is streamed, plays
 * that call's notes silently, with one warning per instrument and play() call (D15).
 *
 * @param {Object} state - Track state { instrument, warned }; warned is shared by the tracks
 * of one play() call
 * @param {Object} note - Frozen note from the PLAY parser
 * @returns {Object|null} Overrides, or null for the default sound
 */
export function resolveNote( state, note ) {
	const instrument = m_instruments.get( state.instrument );
	if( !instrument ) {
		return null;
	}
	const overrides = {};
	if( instrument.audio !== null && !isSampleReady( instrument ) ) {
		if( !state.warned.has( state.instrument ) ) {
			state.warned.add( state.instrument );
			console.warn(
				`play: Audio "${instrument.audio}" of instrument ${state.instrument} is not ` +
				"loaded, or is streamed; its notes are silent."
			);
		}
		overrides.volume = 0;
	}
	if( instrument.oType !== null ) {
		overrides.oType = instrument.oType;
	}
	if( instrument.envelope !== null ) {
		overrides.envelope = instrument.envelope;
	}
	if( instrument.volume !== null && overrides.volume !== 0 ) {
		overrides.volume = note.volume * instrument.volume;
	}
	if( instrument.pan !== null ) {
		overrides.pan = instrument.pan;
	}
	if( instrument.frequency !== null ) {
		overrides.frequency = instrument.frequency;
	}
	if( instrument.frequencyEnd !== null ) {
		overrides.frequencyEnd = instrument.frequencyEnd;
	}
	let releaseTime = note.envelope.releaseTime;
	if( instrument.envelope !== null && instrument.envelope.releaseTime !== undefined ) {
		releaseTime = instrument.envelope.releaseTime;
	}
	const inserts = g_synth.buildSynthInserts( instrument.resolved, releaseTime );
	if( inserts.length > 0 ) {
		overrides.inserts = ( note.inserts || [] ).concat( inserts );
	}
	return overrides;
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the instrument command, the built-in instruments, and the PLAY extension
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} service - Sound extension service
 * @returns {void}
 */
export function register( pluginApi, service ) {
	for( const key of Object.keys( BUILT_IN_INSTRUMENTS ) ) {
		storeInstrument( Number( key ), BUILT_IN_INSTRUMENTS[ key ], service );
	}

	service.registerPlayExtension( EXTENSION_NAME, {
		"tokens": {
			"@": ( state, value ) => {
				state.instrument = value ?? 0;
			}
		},
		"initState": () => ( { "instrument": 0, "warned": new Set() } ),
		"copyState": ( state ) => ( { "instrument": state.instrument, "warned": state.warned } ),
		"resolveNote": resolveNote
	} );


	pluginApi.addCommand(
		"defineInstrument", defineInstrument, false, [ "instrument", "params" ]
	);

	/**
	 * Define PLAY instrument n, selected in a play string with @n; @0 is the default sound
	 *
	 * Built-in instruments: 1 square lead, 2 pluck bass, 3 pad, 4 noise snare, 5 hat, and
	 * 6 kick. Redefining one affects later play() calls only. With audio, the instrument plays
	 * a file loaded with loadAudio(), pitched from rootFrequency, looping if loop is true.
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.instrument - Instrument number, 1-255
	 * @param {Object|null} options.params - synth() options plus audio, rootFrequency, and
	 * loop, or null to remove it
	 * @returns {void}
	 */
	function defineInstrument( options ) {
		storeInstrument( options.instrument, options.params, service );
	}
}
