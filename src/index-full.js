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

// Initialize the core before plugins register against its browser API.
import * as g_core from "./index.js";
import "../plugins/gamepad/index.js";
import "../plugins/keyboard/index.js";
import "../plugins/sound/index.js";
import "../plugins/pointer/index.js";

export default g_core.default;
export { default as pi } from "./index.js";
