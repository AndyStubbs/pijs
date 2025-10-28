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
import * as commands from "./core/commands.js";
import * as screenManager from "./core/screen-manager.js";
import * as events from "./core/events.js";
import * as plugins from "./core/plugins.js";
import * as webglRenderer from "./core/renderer-webgl2.js";
import * as canvas2dRenderer from "./core/renderer-canvas2d.js";
import * as pens from "./core/pens.js";

// Feature Modules
import * as colors from "./modules/colors.js";
import * as graphics from "./modules/graphics.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the main api for all external commands later assinged to globals pi or $
const api = {
	"version": VERSION
};

// Store modules in object so that we can pass them into other modules and avoid circular references
const mods = {
	commands, screenManager, events, plugins, webglRenderer, canvas2dRenderer, pens, colors,
	graphics
};

// Initialize the core modules
for( const mod in mods ) {
	mods[ mod ].init( api, mods );
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
