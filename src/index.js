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
import * as renderer from "./modules/renderer.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the pi object with _ (internal API for plugins) and util namespaces
const api = {
	"version": VERSION
};

// Initialize the core modules
commands.init( api, screenManager );
screenManager.init();
webglRenderer.init();
canvas2dRenderer.init();
events.init();
plugins.init();
renderer.init();

// Append all the commands to the api
commands.processApi();

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
