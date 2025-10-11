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
import * as cmd from "./core/command-system.js";
import * as utils from "./modules/utils.js";
import * as core from "./modules/core-commands.js";
import * as helper from "./modules/screen-helper.js";
import * as screen from "./modules/screen.js";
import * as screenCmd from "./modules/screen-commands.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Ready system variables
let waitCount = 0;
let waiting = false;
const readyList = [];
let startReadyListTimeout = 0;

// Ready/Wait/Resume system functions

function wait() {
	waitCount++;
	waiting = true;
}

function resume() {
	waitCount--;
	if( waitCount === 0 ) {
		startReadyList();
	}
}

function startReadyList() {
	if( document.readyState !== "loading" && waitCount === 0 ) {
		waiting = false;
		const temp = readyList.slice();
		readyList.length = 0;

		for( const fn of temp ) {
			fn();
		}
	} else {
		clearTimeout( startReadyListTimeout );
		startReadyListTimeout = setTimeout( startReadyList, 10 );
	}
}

// Create the pi object with _ (internal API for plugins) and util namespaces
const pi = {
	"version": VERSION,
	"_": {
		"data": piData,
		"addCommand": cmd.addCommand,
		"addCommands": cmd.addCommands,
		"addSetting": cmd.addSetting,
		"addPen": cmd.addPen,
		"addBlendCommand": cmd.addBlendCommand,
		"parseOptions": cmd.parseOptions,
		"wait": wait,
		"resume": resume
	},
	"util": utils
};

// Register the ready command
cmd.addCommand( "ready", ready, false, false, [ "fn" ] );

function ready( args ) {
	const fn = args[ 0 ];

	if( utils.isFunction( fn ) ) {
		if( waiting ) {
			readyList.push( fn );
		} else if( document.readyState === "loading" ) {
			readyList.push( fn );
			clearTimeout( startReadyListTimeout );
			startReadyListTimeout = setTimeout( startReadyList, 10 );
		} else {
			fn();
		}
	}
}

// Initialize modules
helper.init( pi );
screen.init( pi );
screenCmd.init( pi );
core.init( pi );

// Process all commands and create API methods
cmd.processCommands( pi );

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
