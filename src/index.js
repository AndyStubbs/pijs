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

"use strict";

import { piData, defaultPaletteHex } from "./core/pi-data.js";
import * as cmd from "./core/command-system.js";
import * as utils from "./modules/utils.js";
import * as core from "./modules/core-commands.js";
import * as helper from "./modules/screen-helper.js";
import * as screen from "./modules/screen.js";
import * as screenCmd from "./modules/screen-commands.js";
import * as graphics from "./modules/graphics-pixel.js";
import * as paint from "./modules/paint.js";
import * as bezier from "./modules/bezier.js";
import * as images from "./modules/images.js";
import * as font from "./modules/font.js";
import * as print from "./modules/print.js";
import * as table from "./modules/table.js";
import * as keyboard from "./modules/keyboard.js";
import * as mouse from "./modules/mouse.js";
import * as touch from "./modules/touch.js";
import * as gamepad from "./modules/gamepad.js";
import * as sound from "./modules/sound.js";
import * as play from "./modules/play.js";
import * as draw from "./modules/draw.js";
import { loadBuiltInFonts } from "./assets/font-data.js";

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
graphics.init( pi );
paint.init( pi );
bezier.init( pi );
images.init( pi );
font.init( pi );
print.init( pi );
table.init( pi );
keyboard.init( pi );
mouse.init( pi );
touch.init( pi );
gamepad.init( pi );
sound.init( pi );
play.init( pi );
draw.init( pi );
core.init( pi );

// Initialize default palette (must be after core.init which registers setDefaultPal)
piData.commands.setDefaultPal( [ defaultPaletteHex ] );
piData.commands.setDefaultColor( [ 7 ] );

// Process all commands and create API methods
cmd.processCommands( pi );

// Set window.pi for browser environments
if( typeof window !== "undefined" ) {
	window.pi = pi;

	// Set $ alias only if not already defined (avoid jQuery conflicts)
	if( window.$ === undefined ) {
		window.$ = pi;
	}
}

// Load built-in fonts after API is ready
if( typeof window !== "undefined" ) {
	loadBuiltInFonts( pi );
}

// Export for different module systems
export default pi;
export { pi };
