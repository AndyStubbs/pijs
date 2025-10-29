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
import * as g_settings from "./core/settings.js";
import * as g_screenManager from "./core/screen-manager.js";
import * as g_events from "./core/events.js";
import * as g_plugins from "./core/plugins.js";
import * as g_webgl2Renderer from "./core/renderer-webgl2.js";
import * as g_canvas2dRenderer from "./core/renderer-canvas2d.js";
import * as g_pens from "./core/pens.js";
import * as g_utils from "./core/utils";

// Feature Modules
import * as g_colors from "./modules/colors.js";
import * as g_graphics from "./modules/graphics.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the main api for all external commands later assinged to globals pi or $
const api = {
	"version": VERSION
};

// Store modules in object so that we can pass them into other modules and avoid circular references
const mods = {
	g_settings, g_screenManager, g_events, g_plugins, g_webgl2Renderer, g_canvas2dRenderer, g_pens,
	g_colors, g_graphics, g_utils
};

// Initialize the core modules
for( const mod in mods ) {
	if( mods[ mod ].init ) {
		mods[ mod ].init( api );
	}
}

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
