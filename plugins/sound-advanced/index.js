/**
 * Pi.js - Sound Advanced Plugin
 *
 * Synthesis, periodic noise, bus effects, level analysis, sound-effect presets, and PLAY
 * instruments. Every module reaches the core sound plugin only through its extension service,
 * so the plugin shares the core audio context, buses, and voice caps.
 * Each module registers its own commands and can move into core on its own.
 *
 * @module plugins/sound-advanced
 * @version 1.0.0
 */

"use strict";

import * as g_analyser from "./analyser.js";
import * as g_effects from "./effects.js";
import * as g_instruments from "./instruments.js";
import * as g_periodicNoise from "./periodic-noise.js";
import * as g_presets from "./presets.js";
import * as g_synth from "./synth.js";

// Sound extension service version this plugin is built against
const SOUND_SERVICE_VERSION = 1;

// Modules in registration order; periodic noise registers its source type first
const MODULES = [
	g_periodicNoise, g_synth, g_effects, g_analyser, g_presets, g_instruments
];


/*************************************************************************************************
 * Plugin Initialization
 ************************************************************************************************/


/**
 * Sound-advanced plugin initialization
 *
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 * @returns {void}
 */
export default function soundAdvancedPlugin( pluginApi ) {
	const service = pluginApi.getService( "sound" );
	if( service.version !== SOUND_SERVICE_VERSION ) {
		const error = new Error(
			`sound-advanced: Requires sound service version ${SOUND_SERVICE_VERSION}; ` +
			`found ${service.version}.`
		);
		error.code = "INCOMPATIBLE_SOUND_SERVICE";
		throw error;
	}
	for( const module of MODULES ) {
		module.register( pluginApi, service );
	}
}


// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "sound-advanced",
		"version": "1.0.0",
		"description": "Synthesis, bus effects, analyser, presets, and PLAY instruments",
		"dependencies": [ "sound" ],
		"init": soundAdvancedPlugin
	} );
}
