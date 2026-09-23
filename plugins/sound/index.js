/**
 * Pi.js - Play-Sound Plugin
 *
 * Music playback and sound effects using Web Audio API.
 * Combines samples.js (audio files), voices.js (sound effects), and play.js (BASIC-style
 * music notation), which share the audio context and volume in context.js.
 *
 * @module plugins/sound
 * @version 1.0.0
 */

"use strict";

import * as g_context from "./context.js";
import * as g_play from "./play.js";
import * as g_samples from "./samples.js";
import * as g_voices from "./voices.js";


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
}

/**
 * Register the global volume command, which spans voices and audio pools
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
function registerVolume( pluginApi ) {
	const utils = pluginApi.utils;


	pluginApi.addCommand( "setVolume", setVolume, false, [ "volume" ] );

	/**
	 * Set global volume for all sounds
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.volume - Volume (0-1)
	 * @returns {void}
	 */
	function setVolume( options ) {
		const volume = utils.getFloat( options.volume, 0.75 );

		// Validate volume
		if( volume < 0 || volume > 1 ) {
			const error = new RangeError(
				"setVolume: Parameter volume must be a number between 0 and 1."
			);
			error.code = "INVALID_VOLUME";
			throw error;
		}

		g_context.setVolumeValue( volume );

		// Update all active sounds, then all audio pools
		g_voices.rampVoiceVolumes( volume );
		g_samples.applyVolumeToPools( volume );
	}
}


// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "sound",
		"version": "1.0.0",
		"description": "Music playback and sound effects using Web Audio API",
		"init": playSoundPlugin
	} );
}
