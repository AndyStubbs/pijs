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

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the pi object with _ (internal API for plugins) and util namespaces
const pi = {
	"version": VERSION,
	"_": {}
};

// Set window.pi for browser environments
if( typeof window !== "undefined" ) {
	window.pi = pi;

	// Set $ alias only if not already defined (avoid jQuery conflicts)
	if( window.$ === undefined ) {
		window.$ = pi;
	}
}

// Export for different module systems
export default pi;
export { pi };
