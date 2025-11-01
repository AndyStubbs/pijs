/**
 * Pi.js - Main Entry Point
 * 
 * Graphics and sound library for retro-style games and demos.
 * 
 * @module pi.js
 * @author Andy Stubbs
 * @license Apache-2.0
 */

"use strict";

// Core Modules
import * as g_utils from "./core/utils.js";
import * as g_state from "./core/state-settings.js";
import * as g_screenManager from "./core/screen-manager.js";
import * as g_plugins from "./core/plugins.js";

// Graphics
import * as g_webgl2Renderer from "./graphics/renderer-webgl2.js";
import * as g_canvas2dRenderer from "./graphics/renderer-canvas2d.js";
import * as g_pens from "./graphics/pens.js";
import * as g_colors from "./graphics/colors.js";
import * as g_graphicsApi from "./graphics/graphics-api.js";
import * as g_pixels from "./graphics/pixels.js";
import * as g_images from "./graphics/images.js";

// Text
// TODO: Import text modules

// Inputs
import * as g_events from "./input/events.js";

// Audio
// TODO: Import audio modules

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the main api for all external commands later assinged to globals pi or $
const api = {
	"version": VERSION
};

// Store modules in array for orderered initialization
const mods = [
	g_utils, g_state, g_screenManager, g_plugins, g_webgl2Renderer, g_canvas2dRenderer, g_pens,
	g_colors, g_graphicsApi, g_pixels, g_images, g_events
];

// Initialize the modules
for( const mod of mods ) {
	if( mod.init ) {
		mod.init( api );
	}
}

// Process API commands
g_state.processCommands( api );

// Set window.pi for browser environments
if( typeof window !== "undefined" ) {
	window.pi = api;

	// Set $ alias only if not already defined (avoid jQuery conflicts)
	if( window.$ === undefined ) {
		window.$ = api;
	}
}

// Export for different module systems
export default api;
export { api as pi };
