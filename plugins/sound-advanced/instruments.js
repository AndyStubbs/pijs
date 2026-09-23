/**
 * Pi.js - Sound Advanced Instruments Module (Plugin)
 *
 * PLAY instruments: defineInstrument() stores synth() options under a number, and a PLAY
 * extension claims the `@n` token to select one per track. Each note resolves its instrument
 * while play() builds the song, so redefining an instrument affects later play() calls only.
 * Instruments build their inserts through synth.js (documented dependency).
 *
 * @module plugins/sound-advanced/instruments
 */

"use strict";

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


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Validate an instrument and store its note overrides; null params remove it
 *
 * Only the options an instrument sets replace the PLAY values: oType, envelope times,
 * pan, and a fixed frequency or sweep target. volume scales the note volume. Filter, LFO,
 * and arpeggio options become voice inserts.
 *
 * @param {number} instrument - Instrument number, 1-255
 * @param {Object|null} params - synth() options, or null to remove the instrument
 * @returns {void}
 */
export function storeInstrument( instrument, params ) {
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
		"frequencyEnd": resolved.frequencyEnd
	};
	if( params.oType != null ) {
		record.oType = g_synth.resolveOType( resolved );
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
 * @param {Object} state - Track state { instrument }
 * @param {Object} note - Frozen note from the PLAY parser
 * @returns {Object|null} Overrides, or null for the default sound
 */
export function resolveNote( state, note ) {
	const instrument = m_instruments.get( state.instrument );
	if( !instrument ) {
		return null;
	}
	const overrides = {};
	if( instrument.oType !== null ) {
		overrides.oType = instrument.oType;
	}
	if( instrument.envelope !== null ) {
		overrides.envelope = instrument.envelope;
	}
	if( instrument.volume !== null ) {
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
		storeInstrument( Number( key ), BUILT_IN_INSTRUMENTS[ key ] );
	}

	service.registerPlayExtension( EXTENSION_NAME, {
		"tokens": {
			"@": ( state, value ) => {
				state.instrument = value ?? 0;
			}
		},
		"initState": () => ( { "instrument": 0 } ),
		"copyState": ( state ) => ( { "instrument": state.instrument } ),
		"resolveNote": resolveNote
	} );


	pluginApi.addCommand(
		"defineInstrument", defineInstrument, false, [ "instrument", "params" ]
	);

	/**
	 * Define PLAY instrument n, selected in a play string with @n; @0 is the default sound
	 *
	 * Built-in instruments: 1 square lead, 2 pluck bass, 3 pad, 4 noise snare, 5 hat, and
	 * 6 kick. Redefining one affects later play() calls only.
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.instrument - Instrument number, 1-255
	 * @param {Object|null} options.params - synth() options, or null to remove it
	 * @returns {void}
	 */
	function defineInstrument( options ) {
		storeInstrument( options.instrument, options.params );
	}
}
