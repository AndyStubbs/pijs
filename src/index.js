/**
 * Pi.js - Main Entry Point
 * 
 * Graphics library for retro-style games and demos.
 * 
 * @module pi.js
 * @author Andy Stubbs
 * @license Apache-2.0
 */

"use strict";

// This is the lite version entry point (core only, no plugins).
// The full version with plugins is in index-full.js.

// Core Modules
import * as g_utils from "./core/utils.js";
import * as g_commands from "./core/commands.js";
import * as g_screenManager from "./core/screen-manager.js";
import * as g_plugins from "./core/plugins.js";

// Renderer
import * as g_renderer from "./renderer/renderer.js";

// API
import * as g_colors from "./api/colors.js";
import * as g_graphicsApi from "./api/graphics.js";
import * as g_images from "./api/images.js";
import * as g_pixels from "./api/pixels.js";
import * as g_paint from "./api/paint.js";
import * as g_blends from "./api/blends.js";
import * as g_draw from "./api/draw.js";

// Text
import * as g_fonts from "./text/fonts.js";
import * as g_print from "./text/print.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the main api for all external commands later assinged to globals pi or $
const api = {
	"version": VERSION
};

// Store modules in array for ordered initialization
const mods = [
	g_utils, g_commands, g_screenManager, g_plugins, g_renderer, g_colors, g_graphicsApi, g_images,
	g_blends, g_pixels, g_paint, g_draw, g_fonts, g_print
];

// Initialize the modules
for( const mod of mods ) {
	if( mod.init ) {
		mod.init( api );
	}
}

// Process API commands
g_commands.processCommands( api );

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
