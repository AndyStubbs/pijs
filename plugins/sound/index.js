/**
 * Pi.js - Play-Sound Plugin
 *
 * Music playback and sound effects using Web Audio API.
 * Combines samples.js (decoded and streamed audio files), voices.js (sound effects), and
 * play.js (BASIC-style music notation), which share the audio context, buses, master volume,
 * and voice caps.
 * Provides the sound extension service to plugins that declare "sound" as a dependency.
 *
 * @module plugins/sound
 * @version 2.0.0
 */

"use strict";

import * as g_context from "./context.js";
import * as g_envelope from "./envelope.js";
import * as g_play from "./play.js";
import * as g_samples from "./samples.js";
import * as g_voices from "./voices.js";

// Extension service interface version
const SERVICE_VERSION = 1;


/*************************************************************************************************
 * Plugin Initialization
 ************************************************************************************************/


/**
 * Play-sound plugin initialization
 *
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 * @returns {void}
 */
export default function playSoundPlugin( pluginApi ) {

	// Register audio file, sound effect, and volume commands
	g_samples.registerSamples( pluginApi );
	g_voices.registerVoices( pluginApi );
	registerVolume( pluginApi );

	// Register play module commands
	g_play.registerPlay( pluginApi );

	// Decide whether this engine's compressor can serve as the first limiter stage
	g_context.startLimiterProbe();

	// Service v1 is frozen: a breaking change to any member requires a new version
	pluginApi.provideService( {
		"version": SERVICE_VERSION,
		"getContext": g_context.getAudioContext,
		"createVoice": g_voices.createVoice,
		"registerSource": g_voices.registerSource,
		"scheduleEnvelope": g_envelope.scheduleEnvelope,
		"stopVoice": ( soundId, when ) => {
			g_voices.stopSoundById( soundId, when ?? null );
		},
		"setBusVolume": setBusVolume,
		"setBusInsert": setBusInsert,
		"tapBus": tapBus,
		"registerPlayExtension": g_play.registerPlayExtension
	} );
}

/**
 * Validate a bus name
 *
 * @param {string} name - Service method name for the error message
 * @param {string} bus - Bus name
 * @param {boolean} [allowOutput] - Accept "output", the read-only stage after the limiter
 * @returns {void}
 */
function validateBus( name, bus, allowOutput ) {
	let names = "sfx, music, audio, master";
	if( allowOutput ) {
		if( bus === "output" ) {
			return;
		}
		names += ", output";
	}
	if( bus !== "master" && g_context.BUS_NAMES.indexOf( bus ) === -1 ) {
		const error = new Error( `${name}: Parameter bus must be one of: ${names}.` );
		error.code = "INVALID_BUS";
		throw error;
	}
}

/**
 * Validate a volume value
 *
 * @param {string} name - Command name for the error message
 * @param {number} volume - Volume (0-1)
 * @returns {void}
 */
function validateVolume( name, volume ) {
	if( !( volume >= 0 && volume <= 1 ) ) {
		const error = new RangeError(
			`${name}: Parameter volume must be a number between 0 and 1.`
		);
		error.code = "INVALID_VOLUME";
		throw error;
	}
}

/**
 * Set a bus output volume (setBusVolume command and extension service method). "master" is
 * equivalent to setVolume.
 *
 * @param {string} bus - "sfx", "music", "audio", or "master"
 * @param {number} volume - Volume (0-1)
 * @returns {void}
 */
function setBusVolume( bus, volume ) {
	validateBus( "setBusVolume", bus );
	validateVolume( "setBusVolume", volume );
	if( bus === "master" ) {
		g_context.setMasterVolume( volume );
	} else {
		g_context.setBusOutputVolume( bus, volume );
	}
}

/**
 * Place one effects insert on a bus (extension service method); null removes it
 *
 * @param {string} bus - "sfx", "music", "audio", or "master"
 * @param {Object|null} insert - { input, output, dispose } or null
 * @returns {void}
 */
function setBusInsert( bus, insert ) {
	validateBus( "setBusInsert", bus );
	if( insert !== null && !g_voices.hasMembers( insert, [ "input", "output" ], [ "dispose" ] ) ) {
		const error = new TypeError(
			"setBusInsert: Parameter insert must be null or provide input, output, and dispose."
		);
		error.code = "INVALID_INSERT";
		throw error;
	}
	g_context.setBusInsert( bus, insert );
}

/**
 * Connect a bus output in parallel to a node (extension service method)
 *
 * @param {string} bus - "sfx", "music", "audio", "master", or "output"
 * @param {AudioNode} node - Node that receives the bus signal
 * @returns {Function} Untap function
 */
function tapBus( bus, node ) {
	validateBus( "tapBus", bus, true );
	if( !( node instanceof AudioNode ) ) {
		const error = new TypeError( "tapBus: Parameter node must be an AudioNode." );
		error.code = "INVALID_TAP";
		throw error;
	}
	return g_context.tapBus( bus, node );
}

/**
 * Register the master volume, bus volume, and limiter commands
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
function registerVolume( pluginApi ) {
	const utils = pluginApi.utils;


	pluginApi.addCommand( "setVolume", setVolume, false, [ "volume" ] );

	/**
	 * Set the master volume for all sounds, music, and audio
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.volume - Volume (0-1)
	 * @returns {void}
	 */
	function setVolume( options ) {
		const volume = utils.getFloat( options.volume, 0.75 );
		validateVolume( "setVolume", volume );
		g_context.setMasterVolume( volume );
	}


	pluginApi.addCommand( "setBusVolume", setBusVolumeCommand, false, [ "bus", "volume" ] );

	/**
	 * Set a bus volume after its effects, so it also controls effect tails
	 *
	 * "sfx" carries sound(), "music" carries play(), and "audio" carries playAudio(). The
	 * change ramps over 10 ms. "master" is the same as setVolume().
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.bus - "sfx", "music", "audio", or "master"
	 * @param {number} options.volume - Volume (0-1)
	 * @returns {void}
	 */
	function setBusVolumeCommand( options ) {
		setBusVolume( options.bus, utils.getFloat( options.volume, NaN ) );
	}


	pluginApi.addCommand( "setSoundLimiter", setSoundLimiter, false, [ "enabled" ] );

	/**
	 * Enable or bypass the output limiter (compressor and soft clipper)
	 *
	 * @param {Object} options - Command options
	 * @param {boolean} options.enabled - True to limit output to ±1.0
	 * @returns {void}
	 */
	function setSoundLimiter( options ) {
		if( typeof options.enabled !== "boolean" ) {
			const error = new TypeError( "setSoundLimiter: Parameter enabled must be a boolean." );
			error.code = "INVALID_ENABLED";
			throw error;
		}
		g_context.setLimiterEnabled( options.enabled );
	}
}


// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "sound",
		"version": "2.0.0",
		"description": "Music playback and sound effects using Web Audio API",
		"init": playSoundPlugin
	} );
}
