/**
 * Pi.js - Sound Advanced Buses Module (Plugin)
 *
 * Public per-bus volume. The gain node and routing belong to the core sound plugin; this
 * module only registers setBusVolume() over the dedicated service method, so moving it into
 * core changes command registration only.
 *
 * @module plugins/sound-advanced/buses
 */

"use strict";


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the bus volume command
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} service - Sound extension service
 * @returns {void}
 */
export function register( pluginApi, service ) {
	const utils = pluginApi.utils;


	pluginApi.addCommand( "setBusVolume", setBusVolume, false, [ "bus", "volume" ] );

	/**
	 * Set a bus volume after its effects, so it also controls effect tails
	 *
	 * "sfx" carries sound() and synth(), "music" carries play(), and "audio" carries
	 * playAudio(). The change ramps over 10 ms. "master" is the same as setVolume().
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.bus - "sfx", "music", "audio", or "master"
	 * @param {number} options.volume - Volume (0-1)
	 * @returns {void}
	 */
	function setBusVolume( options ) {
		service.setBusVolume( options.bus, utils.getFloat( options.volume, NaN ) );
	}
}
