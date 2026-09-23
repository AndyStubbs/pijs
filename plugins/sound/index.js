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

	pluginApi.provideService( {
		"version": SERVICE_VERSION,
		"getContext": g_context.getAudioContext,
		"setBusVolume": setBusVolume,
		"stopVoice": ( soundId, when ) => {
			g_voices.stopSoundById( soundId, when ?? null );
		},
		"scheduleEnvelope": g_envelope.scheduleEnvelope
	} );
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
 * Set a bus output volume (extension service method). "master" is equivalent to setVolume.
 *
 * @param {string} bus - "sfx", "music", "audio", or "master"
 * @param {number} volume - Volume (0-1)
 * @returns {void}
 */
function setBusVolume( bus, volume ) {
	if( bus !== "master" && g_context.BUS_NAMES.indexOf( bus ) === -1 ) {
		const error = new Error(
			"setBusVolume: Parameter bus must be one of: sfx, music, audio, master."
		);
		error.code = "INVALID_BUS";
		throw error;
	}
	validateVolume( "setBusVolume", volume );
	if( bus === "master" ) {
		g_context.setMasterVolume( volume );
	} else {
		g_context.setBusOutputVolume( bus, volume );
	}
}

/**
 * Register the master volume and limiter commands
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
