/**
 * Pi.js - Main Entry Point
 * 
 * Graphics and sound library for retro-style games and demos.
 * Modernized architecture with legacy API compatibility.
 * 
 * @module pi.js
 * @author Andy Stubbs
 * @license Apache-2.0
 */

import { piData } from "./core/pi-data.js";
import { 
	addCommand, 
	addCommands, 
	addSetting, 
	addPen, 
	addBlendCommand, 
	processCommands 
} from "./core/command-system.js";
import * as utils from "./modules/utils.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the pi object with _ (internal API for plugins) and util namespaces
const pi = {
	"version": VERSION,
	"_": {
		"data": piData,
		"addCommand": addCommand,
		"addCommands": addCommands,
		"addSetting": addSetting,
		"addPen": addPen,
		"addBlendCommand": addBlendCommand
	},
	"util": utils
};

// Export for different module systems
if( typeof window !== "undefined" ) {
	window.pi = pi;
	
	// Set $ alias only if not already defined (avoid jQuery conflicts)
	if( window.$ === undefined ) {
		window.$ = pi;
	}
}

export default pi;
export { pi };
