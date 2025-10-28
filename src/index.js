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
import * as g_commands from "./core/commands.js";
import * as g_screenManager from "./core/screen-manager.js";
import * as g_events from "./core/events.js";
import * as g_plugins from "./core/plugins.js";
import * as g_webglRenderer from "./core/renderer-webgl2.js";
import * as g_canvas2dRenderer from "./core/renderer-canvas2d.js";
import * as g_renderer from "./core/pens.js";

// Feature Modules
import * as g_colors from "./modules/colors.js";
import * as g_graphics from "./modules/graphics.js";
import * as g_pens from "./core/pens.js";



// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the main api for all external commands later assinged to globals pi or $
const api = {
	"version": VERSION
};

// Initialize the core modules
g_commands.init( api, g_screenManager );
g_screenManager.init();
g_webglRenderer.init();
g_canvas2dRenderer.init();
g_events.init();
g_plugins.init();
g_renderer.init();

// Initialize feature modules
g_colors.init();
g_graphics.init();

// Append all the commands to the api
g_commands.processApi();

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
