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

import * as cmd from "./core/commands.js";
import * as screen from "./core/screen-manager.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the pi object with _ (internal API for plugins) and util namespaces
const piApi = {
	"version": VERSION
};

// Append all the commands to the api
cmd.processApi( piApi );

// Processs screen commands
screen.sortScreenCommands();

// Set window.pi for browser environments
if( typeof window !== "undefined" ) {
	window.pi = piApi;

	// Set $ alias only if not already defined (avoid jQuery conflicts)
	if( window.$ === undefined ) {
		window.$ = piApi;
	}
}

// Export for different module systems
export default piApi;
export { piApi as pi };
