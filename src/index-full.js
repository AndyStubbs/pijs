/**
 * Pi.js - Full Version Entry Point
 * 
 * Includes core Pi.js functionality plus key plugins:
 * - gamepad: Gamepad input handling
 * - keyboard: Keyboard input handling
 * - play-sound: Music playback and sound effects
 * - pointer: Mouse, touch, and press handling
 * 
 * This is the official Pi.js library with essential plugins included.
 * 
 * @module pi.js-full
 * @author Andy Stubbs
 * @license Apache-2.0
 */

"use strict";

// Import the core API (this initializes everything)
import api from "./index.js";

// Import plugins
import gamepadPlugin from "../plugins/gamepad/index.js";
import keyboardPlugin from "../plugins/keyboard/index.js";
import playSoundPlugin from "../plugins/play-sound/index.js";
import pointerPlugin from "../plugins/pointer/index.js";

// Register all plugins
api.registerPlugin( {
	"name": "gamepad",
	"version": "1.0.0",
	"description": "Gamepad input handling including button state tracking, axis handling, and connect/disconnect event management",
	"init": gamepadPlugin
} );

api.registerPlugin( {
	"name": "keyboard",
	"version": "1.0.0",
	"description": "Keyboard input handling including key state tracking, event handlers, and action key management",
	"init": keyboardPlugin
} );

api.registerPlugin( {
	"name": "play-sound",
	"version": "1.0.0",
	"description": "Music playback and sound effects using Web Audio API",
	"init": playSoundPlugin
} );

api.registerPlugin( {
	"name": "pointer",
	"version": "1.0.0",
	"description": "Mouse, touch, and press handling",
	"init": pointerPlugin
} );

// Export the same API (now with plugins)
export default api;
export { api as pi };

