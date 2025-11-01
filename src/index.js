/**
 * Pi.js - Main Entry Point
 * 
 * Graphics library for retro-style games and demos.
 * WebGL2 only renderer - no Canvas2D fallback.
 * 
 * @module pi.js
 * @author Andy Stubbs
 * @license Apache-2.0
 */

"use strict";

// Core Modules
import * as g_utils from "./core/utils.js";
import * as g_commands from "./core/commands.js";
import * as g_screenManager from "./core/screen-manager.js";
import * as g_plugins from "./core/plugins.js";

// Graphics (will be added in later phases)
// TODO: Import renderer modules when implemented

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the main api for all external commands later assinged to globals pi or $
const api = {
	"version": VERSION
};

// Store modules in array for ordered initialization
const mods = [
	g_utils, g_commands, g_screenManager, g_plugins
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

