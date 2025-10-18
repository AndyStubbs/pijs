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
import * as colors from "./core/colors.js";
import * as renderer from "./core/renderer.js";

// Other Modules
import * as graphics from "./modules/graphics.js";
import * as graphicsAdvanced from "./modules/graphics-advanced.js";
import * as draw from "./modules/draw.js";
import * as paint from "./modules/paint.js";
import * as images from "./modules/images.js";
import * as font from "./modules/font.js";
import * as print from "./modules/print.js";
import * as table from "./modules/table.js";
import * as keyboard from "./modules/keyboard.js";
import * as onscreenKeyboard from "./modules/onscreen-keyboard.js";
import * as mouse from "./modules/mouse.js";
import * as touch from "./modules/touch.js";
import * as press from "./modules/press.js";
import * as plugins from "./core/plugins.js";

// Assets
import * as fontData from "./assets/font-data.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the pi object with _ (internal API for plugins) and util namespaces
const api = {
	"version": VERSION
};

// Initialize the modules
commands.init( api, screenManager );
screenManager.init();
renderer.init();
colors.init();
graphics.init();
graphicsAdvanced.init();
draw.init();
paint.init();
images.init();
font.init();
print.init();
table.init();
keyboard.init();
onscreenKeyboard.init();
mouse.init();
touch.init();
press.init();
plugins.init();

// Append all the commands to the api
commands.processApi();

// Load built-in fonts
fontData.loadBuiltInFonts( api );

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
