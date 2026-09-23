/**
 * Pi.js - Sound Advanced Presets Module (Plugin)
 *
 * Sound-effect presets: sfx() plays a named table of synth() options with optional random
 * variation, and definePreset() adds or replaces a preset. Presets are data only; they play
 * through synth.js (documented dependency).
 *
 * @module plugins/sound-advanced/presets
 */

"use strict";

import * as g_synth from "./synth.js";

// Largest pitch jitter at variation 1, in semitones, and duration jitter as a fraction
const MAX_PITCH_JITTER = 3;
const MAX_DURATION_JITTER = 0.1;

// Built-in retro set, as synth() options
export const BUILT_IN_PRESETS = {
	"coin": {
		"frequency": 988, "duration": 0.2, "volume": 0.5, "oType": "pulse", "duty": 0.5,
		"releaseTime": 0.15, "arpeggio": [ 0, 5 ], "arpeggioRate": 14
	},
	"laser": {
		"frequency": 1400, "frequencyEnd": 180, "duration": 0.16, "volume": 0.45,
		"oType": "sawtooth", "releaseTime": 0.05, "filterType": "lowpass", "filterCutoff": 3500
	},
	"jump": {
		"frequency": 280, "frequencyEnd": 640, "duration": 0.16, "volume": 0.5,
		"oType": "pulse", "duty": 0.25, "releaseTime": 0.06
	},
	"hit": {
		"duration": 0.04, "volume": 0.7, "oType": "white", "releaseTime": 0.12,
		"filterType": "lowpass", "filterCutoff": 1800
	},
	"explosion": {
		"duration": 0.5, "volume": 0.8, "oType": "pink", "decayTime": 0.45, "sustainLevel": 0.3,
		"releaseTime": 0.5, "filterType": "lowpass", "filterCutoff": 300, "filterAmount": 2.5,
		"filterDecayTime": 0.5, "filterSustainLevel": 0
	},
	"powerup": {
		"frequency": 440, "frequencyEnd": 880, "duration": 0.45, "volume": 0.45,
		"oType": "square", "releaseTime": 0.1, "arpeggio": [ 0, 4, 7, 12 ], "arpeggioRate": 20
	},
	"blip": {
		"frequency": 1320, "duration": 0.03, "volume": 0.4, "oType": "pulse", "duty": 0.125,
		"releaseTime": 0.03
	},
	"select": {
		"frequency": 660, "duration": 0.08, "volume": 0.45, "oType": "triangle",
		"releaseTime": 0.06, "arpeggio": [ 0, 7 ], "arpeggioRate": 25
	}
};

// Presets by name: frozen synth() options
const m_presets = new Map();


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
 * Deep copy plain data into a frozen snapshot
 *
 * @param {*} value - Value to copy
 * @returns {*} Snapshot
 */
function freezeCopy( value ) {
	if( Array.isArray( value ) ) {
		return Object.freeze( value.map( freezeCopy ) );
	}
	if( value !== null && typeof value === "object" ) {
		const copy = {};
		for( const key of Object.keys( value ) ) {
			copy[ key ] = freezeCopy( value[ key ] );
		}
		return Object.freeze( copy );
	}
	return value;
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Validate a preset and store a frozen copy of its options
 *
 * @param {string} name - Preset name
 * @param {Object} params - synth() options
 * @returns {void}
 */
export function storePreset( name, params ) {
	if( typeof name !== "string" || name === "" ) {
		throwCode(
			TypeError, "definePreset: Parameter name must be a non-empty string.",
			"INVALID_PRESET_NAME"
		);
	}
	if( params === null || typeof params !== "object" || Array.isArray( params ) ) {
		throwCode(
			TypeError, "definePreset: Parameter params must be an object.", "INVALID_PRESET"
		);
	}
	g_synth.resolveSynthOptions( "definePreset", params );
	m_presets.set( name, freezeCopy( params ) );
}

/**
 * Get a stored preset's options
 *
 * @param {string} name - Preset name
 * @returns {Object|undefined} Frozen synth() options
 */
export function getPreset( name ) {
	return m_presets.get( name );
}

/**
 * Apply random pitch and duration jitter to preset options
 *
 * @param {Object} preset - synth() options
 * @param {number} variation - 0 for none to 1 for the most jitter
 * @param {Function} random - Random source returning [0, 1)
 * @returns {Object} Options to play
 */
export function varyPreset( preset, variation, random ) {
	if( variation === 0 ) {
		return preset;
	}
	const pitch = Math.pow(
		2, ( random() * 2 - 1 ) * variation * MAX_PITCH_JITTER / 12
	);
	const stretch = 1 + ( random() * 2 - 1 ) * variation * MAX_DURATION_JITTER;
	const base = g_synth.resolveSynthOptions( "sfx", preset );
	const varied = Object.assign( {}, preset );
	varied.frequency = base.frequency * pitch;
	if( base.frequencyEnd !== null ) {
		varied.frequencyEnd = base.frequencyEnd * pitch;
	}
	varied.duration = base.duration * stretch;
	return varied;
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the preset commands and the built-in presets
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
export function register( pluginApi ) {
	const utils = pluginApi.utils;
	for( const name of Object.keys( BUILT_IN_PRESETS ) ) {
		storePreset( name, BUILT_IN_PRESETS[ name ] );
	}


	pluginApi.addCommand( "sfx", sfx, false, [ "name", "variation" ] );

	/**
	 * Play a sound-effect preset
	 *
	 * Built-in presets: coin, laser, jump, hit, explosion, powerup, blip, and select.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.name - Preset name
	 * @param {number} options.variation - Random pitch and duration jitter, 0-1 (default: 0)
	 * @returns {string} Sound ID for use with stopSound
	 */
	function sfx( options ) {
		const preset = m_presets.get( options.name );
		if( !preset ) {
			throwCode(
				Error, `sfx: Preset "${options.name}" is not defined.`, "PRESET_NOT_FOUND"
			);
		}
		const variation = utils.getFloat( options.variation, 0 );
		if( !( variation >= 0 && variation <= 1 ) ) {
			throwCode(
				RangeError, "sfx: Parameter variation must be a number between 0 and 1.",
				"INVALID_VARIATION"
			);
		}
		return g_synth.playSynth( "sfx", varyPreset( preset, variation, Math.random ) );
	}


	pluginApi.addCommand( "definePreset", definePreset, false, [ "name", "params" ] );

	/**
	 * Add or replace a sound-effect preset
	 *
	 * The options are validated and copied, so later changes to the object have no effect.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.name - Preset name
	 * @param {Object} options.params - synth() options
	 * @returns {void}
	 */
	function definePreset( options ) {
		storePreset( options.name, options.params );
	}
}
