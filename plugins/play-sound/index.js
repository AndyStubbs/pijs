/**
 * @preserve
 * Pi.js - Play-Sound Plugin
 * 
 * Music playback and sound effects using Web Audio API.
 * Combines play.js (BASIC-style music notation) and sound.js (sound effects).
 * 
 * @module plugins/play-sound
 * @version 1.0.0
 */

"use strict";

import { registerSound } from "./sound.js";
import { registerPlay } from "./play.js";


/***************************************************************************************************
 * Plugin Initialization
 **************************************************************************************************/


/**
 * Play-sound plugin initialization
 * 
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 */
export default function playSoundPlugin( pluginApi ) {

	// Register sound module commands
	registerSound( pluginApi );

	// Register play module commands
	registerPlay( pluginApi );
}


// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "play-sound",
		"version": "1.0.0",
		"description": "Music playback and sound effects using Web Audio API",
		"init": playSoundPlugin
	} );
}

