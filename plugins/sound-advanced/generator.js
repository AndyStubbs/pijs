/**
 * Pi.js - Sound Advanced Generator Module (Plugin)
 *
 * generateSfx(): seeded retro sound effects as synth() options, in the style of sfxr. Seed 0
 * is a category's built-in preset and every other seed is a fixed variant drawn from the
 * category's table, so the same category and seed give the same options on every engine.
 * Uses presets.js for the built-in presets (documented dependency).
 *
 * @module plugins/sound-advanced/generator
 */

"use strict";

import * as g_presets from "./presets.js";

const MAX_SEED = 4294967295;

// Largest variation step at variation 1, as a fraction of the category range
const VARIATION_SPAN = 0.25;

// Parameters drawn and varied on a curve that favors low values: frequencies and times
const LOG_PARAMETERS = [
	"frequency", "frequencyEnd", "filterCutoff", "duration", "attackTime", "decayTime",
	"releaseTime", "filterDecayTime"
];

// Choices drawn before the numbers, in this order, when a category lists them
const CHOICES = [ "oType", "filterType", "arpeggio", "sweep" ];

/**
 * Category tables. These are fixed once released: a change alters every seed's sound.
 *
 * - Choices are [ value, weight ] lists. filterType and arpeggio may choose null (none).
 * - numbers are [ name, min, max, condition ]. The condition "pulse", "filter", "arpeggio",
 *   or "sweep" includes the parameter only with the pulse waveform, a filter, an arpeggio, or
 *   a pitch sweep. Every range contains the category's built-in preset value.
 */
export const SFX_CATEGORIES = g_presets.freezeCopy( {
	"coin": {
		"oType": [ [ "pulse", 3 ], [ "square", 1 ], [ "triangle", 1 ] ],
		"arpeggio": [ [ [ 0, 5 ], 2 ], [ [ 0, 7 ], 1 ], [ [ 0, 12 ], 1 ], [ [ 0, 4, 7 ], 1 ] ],
		"numbers": [
			[ "frequency", 600, 1800 ], [ "duration", 0.08, 0.3 ], [ "volume", 0.4, 0.6 ],
			[ "releaseTime", 0.05, 0.3 ], [ "duty", 0.125, 0.5, "pulse" ],
			[ "arpeggioRate", 8, 24, "arpeggio" ]
		]
	},
	"laser": {
		"oType": [ [ "sawtooth", 3 ], [ "square", 1 ], [ "pulse", 1 ] ],
		"filterType": [ [ "lowpass", 1 ] ],
		"numbers": [
			[ "frequency", 800, 2400 ], [ "frequencyEnd", 80, 500 ], [ "duration", 0.08, 0.3 ],
			[ "volume", 0.35, 0.55 ], [ "releaseTime", 0.02, 0.12 ],
			[ "duty", 0.125, 0.5, "pulse" ], [ "filterCutoff", 1500, 8000, "filter" ]
		]
	},
	"jump": {
		"oType": [ [ "pulse", 2 ], [ "square", 1 ], [ "triangle", 1 ] ],
		"numbers": [
			[ "frequency", 150, 450 ], [ "frequencyEnd", 400, 1200 ], [ "duration", 0.1, 0.3 ],
			[ "volume", 0.4, 0.6 ], [ "releaseTime", 0.03, 0.15 ],
			[ "duty", 0.125, 0.5, "pulse" ]
		]
	},
	"hit": {
		"oType": [ [ "white", 3 ], [ "pink", 1 ] ],
		"filterType": [ [ "lowpass", 3 ], [ "bandpass", 1 ] ],
		"numbers": [
			[ "duration", 0.02, 0.1 ], [ "volume", 0.5, 0.8 ], [ "releaseTime", 0.05, 0.25 ],
			[ "filterCutoff", 600, 5000, "filter" ]
		]
	},
	"explosion": {
		"oType": [ [ "pink", 2 ], [ "white", 1 ] ],
		"filterType": [ [ "lowpass", 1 ] ],
		"numbers": [
			[ "duration", 0.3, 1 ], [ "volume", 0.6, 0.9 ], [ "decayTime", 0.2, 0.8 ],
			[ "sustainLevel", 0.1, 0.5 ], [ "releaseTime", 0.3, 1 ],
			[ "filterCutoff", 150, 800, "filter" ], [ "filterAmount", 1, 4, "filter" ],
			[ "filterDecayTime", 0.2, 1, "filter" ], [ "filterSustainLevel", 0, 0.3, "filter" ]
		]
	},
	"powerup": {
		"oType": [ [ "square", 2 ], [ "pulse", 1 ], [ "triangle", 1 ] ],
		"arpeggio": [
			[ [ 0, 4, 7, 12 ], 2 ], [ [ 0, 4, 7 ], 1 ], [ [ 0, 5, 7, 12 ], 1 ], [ [ 0, 7, 12 ], 1 ]
		],
		"numbers": [
			[ "frequency", 220, 660 ], [ "frequencyEnd", 440, 1760 ], [ "duration", 0.25, 0.7 ],
			[ "volume", 0.35, 0.55 ], [ "releaseTime", 0.05, 0.2 ],
			[ "duty", 0.125, 0.5, "pulse" ], [ "arpeggioRate", 12, 30, "arpeggio" ]
		]
	},
	"blip": {
		"oType": [ [ "pulse", 2 ], [ "square", 1 ], [ "sine", 1 ] ],
		"numbers": [
			[ "frequency", 600, 2000 ], [ "duration", 0.015, 0.06 ], [ "volume", 0.3, 0.5 ],
			[ "releaseTime", 0.015, 0.06 ], [ "duty", 0.125, 0.5, "pulse" ]
		]
	},
	"select": {
		"oType": [ [ "triangle", 2 ], [ "sine", 1 ], [ "pulse", 1 ] ],
		"arpeggio": [ [ [ 0, 7 ], 2 ], [ [ 0, 5 ], 1 ], [ [ 0, 12 ], 1 ], [ [ 0, 4 ], 1 ] ],
		"numbers": [
			[ "frequency", 440, 990 ], [ "duration", 0.05, 0.14 ], [ "volume", 0.35, 0.55 ],
			[ "releaseTime", 0.03, 0.12 ], [ "duty", 0.125, 0.5, "pulse" ],
			[ "arpeggioRate", 15, 35, "arpeggio" ]
		]
	},
	"random": {
		"oType": [
			[ "square", 1 ], [ "sawtooth", 1 ], [ "triangle", 1 ], [ "sine", 1 ], [ "pulse", 1 ],
			[ "white", 1 ], [ "pink", 1 ]
		],
		"filterType": [ [ null, 2 ], [ "lowpass", 1 ], [ "highpass", 1 ] ],
		"arpeggio": [ [ null, 3 ], [ [ 0, 4, 7 ], 1 ], [ [ 0, 5 ], 1 ], [ [ 0, 12 ], 1 ] ],
		"sweep": [ [ false, 1 ], [ true, 1 ] ],
		"numbers": [
			[ "frequency", 80, 2400 ], [ "frequencyEnd", 60, 2400, "sweep" ],
			[ "duration", 0.03, 0.8 ], [ "volume", 0.3, 0.7 ], [ "attackTime", 0.001, 0.05 ],
			[ "releaseTime", 0.02, 0.5 ], [ "duty", 0.125, 0.5, "pulse" ],
			[ "filterCutoff", 300, 8000, "filter" ], [ "arpeggioRate", 6, 30, "arpeggio" ]
		]
	}
} );


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
 * Pick a value from a weighted list
 *
 * @param {Array<Array>} choices - [ value, weight ] pairs
 * @param {number} r - Random number in [0, 1)
 * @returns {*} Chosen value
 */
function pick( choices, r ) {
	let total = 0;
	for( const choice of choices ) {
		total += choice[ 1 ];
	}
	let position = r * total;
	for( const choice of choices ) {
		position -= choice[ 1 ];
		if( position < 0 ) {
			return choice[ 0 ];
		}
	}
	return choices[ choices.length - 1 ][ 0 ];
}

/**
 * Check whether a numeric entry's condition holds for the chosen values
 *
 * @param {string|undefined} condition - "pulse", "filter", "arpeggio", "sweep", or none
 * @param {Object} chosen - Chosen oType, filterType, arpeggio, and sweep
 * @returns {boolean} True to include the parameter
 */
function isIncluded( condition, chosen ) {
	if( condition === "pulse" ) {
		return chosen.oType === "pulse";
	}
	if( condition === "filter" ) {
		return chosen.filterType !== null;
	}
	if( condition === "arpeggio" ) {
		return chosen.arpeggio !== null;
	}
	if( condition === "sweep" ) {
		return chosen.sweep === true;
	}
	return true;
}

/**
 * Hash a category name (FNV-1a), so each category draws a different stream for a seed
 *
 * @param {string} name - Category name
 * @returns {number} Unsigned 32-bit hash
 */
function hashName( name ) {
	let hash = 2166136261;
	for( let i = 0; i < name.length; i++ ) {
		hash = Math.imul( hash ^ name.charCodeAt( i ), 16777619 );
	}
	return hash >>> 0;
}

/**
 * Draw a seeded sound from a category table
 *
 * Every choice and number takes one draw in table order, even when its condition leaves it
 * out, so optional parameters never shift the draws after them. Only exact arithmetic is
 * used, so every engine produces the same values.
 *
 * @param {string} category - Category name
 * @param {number} seed - Seed
 * @returns {Object} synth() options
 */
function drawSound( category, seed ) {
	const table = SFX_CATEGORIES[ category ];
	const random = createRandom( seed ^ hashName( category ) );
	const chosen = { "oType": null, "filterType": null, "arpeggio": null, "sweep": false };
	for( const name of CHOICES ) {
		if( table[ name ] ) {
			chosen[ name ] = pick( table[ name ], random() );
		}
	}

	const options = { "oType": chosen.oType };
	for( const entry of table.numbers ) {
		let r = random();
		if( !isIncluded( entry[ 3 ], chosen ) ) {
			continue;
		}
		if( LOG_PARAMETERS.indexOf( entry[ 0 ] ) !== -1 ) {
			r = r * r;
		}
		const value = entry[ 1 ] + ( entry[ 2 ] - entry[ 1 ] ) * r;
		options[ entry[ 0 ] ] = Math.round( value * 1000 ) / 1000;
	}
	if( chosen.filterType !== null ) {
		options.filterType = chosen.filterType;
	}
	if( chosen.arpeggio !== null ) {
		options.arpeggio = chosen.arpeggio;
	}
	return options;
}

/**
 * Nudge every numeric parameter within its category range
 *
 * Frequencies and times move on a logarithmic scale and the rest linearly. Choices such as
 * the waveform and filter type never change.
 *
 * @param {Object} options - synth() options
 * @param {Object} table - Category table
 * @param {number} variation - 0 for none to 1 for the most
 * @param {Function} random - Random source returning [0, 1)
 * @returns {Object} Varied options
 */
function varySound( options, table, variation, random ) {
	const varied = Object.assign( {}, options );
	for( const entry of table.numbers ) {
		const name = entry[ 0 ];
		if( typeof options[ name ] !== "number" ) {
			continue;
		}
		const min = entry[ 1 ];
		const max = entry[ 2 ];
		const step = ( random() * 2 - 1 ) * variation * VARIATION_SPAN;
		let value = options[ name ];
		if( LOG_PARAMETERS.indexOf( name ) !== -1 ) {
			value = Math.exp( Math.log( value ) + step * Math.log( max / min ) );
		} else {
			value += step * ( max - min );
		}
		varied[ name ] = Math.min( max, Math.max( min, value ) );
	}
	return varied;
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Create a seeded random source (mulberry32, 32-bit state)
 *
 * @param {number} seed - Integer seed
 * @returns {Function} Random source returning [0, 1)
 */
export function createRandom( seed ) {
	let state = seed >>> 0;
	return () => {
		state = ( state + 0x6D2B79F5 ) >>> 0;
		let t = Math.imul( state ^ ( state >>> 15 ), state | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
	};
}

/**
 * Validate generateSfx arguments and build the sound's synth() options
 *
 * @param {string} category - Category name
 * @param {number|null} seed - Integer from 0 to 4294967295 (null for 0)
 * @param {number|null} variation - 0-1 (null for 0)
 * @param {Function} random - Random source for variation, returning [0, 1)
 * @returns {Object} Frozen synth() options
 */
export function generateSfxOptions( category, seed, variation, random ) {
	if(
		typeof category !== "string" ||
		!Object.prototype.hasOwnProperty.call( SFX_CATEGORIES, category )
	) {
		throwCode(
			Error,
			"generateSfx: Parameter category must be one of: " +
			Object.keys( SFX_CATEGORIES ).join( ", " ) + ".",
			"INVALID_CATEGORY"
		);
	}
	if( seed === null || seed === undefined ) {
		seed = 0;
	}
	if( !Number.isInteger( seed ) || seed < 0 || seed > MAX_SEED ) {
		throwCode(
			RangeError,
			`generateSfx: Parameter seed must be an integer from 0 to ${MAX_SEED}.`,
			"INVALID_SEED"
		);
	}
	if( variation === null || variation === undefined ) {
		variation = 0;
	}
	if( typeof variation !== "number" || !( variation >= 0 && variation <= 1 ) ) {
		throwCode(
			RangeError, "generateSfx: Parameter variation must be a number between 0 and 1.",
			"INVALID_VARIATION"
		);
	}

	const table = SFX_CATEGORIES[ category ];
	let options = null;
	if( seed === 0 && g_presets.BUILT_IN_PRESETS[ category ] ) {
		options = g_presets.BUILT_IN_PRESETS[ category ];
	} else {
		options = drawSound( category, seed );
	}
	if( variation > 0 ) {
		options = varySound( options, table, variation, random );
	}
	return g_presets.freezeCopy( options );
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the generator command
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
export function register( pluginApi ) {


	pluginApi.addCommand(
		"generateSfx", generateSfx, false, [ "category", "seed", "variation" ]
	);

	/**
	 * Generate a retro sound effect as synth() options
	 *
	 * Categories: coin, laser, jump, hit, explosion, powerup, blip, select, and random. Seed 0
	 * is the category's built-in preset; other seeds are fixed variants.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.category - Category name
	 * @param {number} options.seed - Integer from 0 to 4294967295 (default: 0)
	 * @param {number} options.variation - Random nudge of every parameter, 0-1 (default: 0)
	 * @returns {Object} Frozen synth() options
	 */
	function generateSfx( options ) {
		return generateSfxOptions(
			options.category, options.seed, options.variation, Math.random
		);
	}
}
