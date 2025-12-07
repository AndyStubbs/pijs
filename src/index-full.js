/**
 * Pi.js - Full Version Entry Point
 * 
 * Includes core Pi.js functionality plus key plugins:
 * - gamepad: Gamepad input handling
 * - keyboard: Keyboard input handling
 * - sound: Music playback and sound effects
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
import "../plugins/gamepad/index.js";
import "../plugins/keyboard/index.js";
import "../plugins/sound/index.js";
import "../plugins/pointer/index.js";

// Export the same API (now with plugins)
export default api;
export { api as pi };

