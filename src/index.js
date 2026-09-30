/**
 * Pi.js - Main Entry Point
 *
 * Graphics library for retro-style games and demos.
 *
 * @module pi.js
 * @author Andy Stubbs
 * @license Apache-2.0
 */

"use strict";

// This is the lite version entry point (core only, no plugins).
// The full version with plugins is in index-full.js.

// Core Modules
import * as g_commands from "./core/commands.js";
import * as g_screenManager from "./core/screen-manager.js";
import * as g_plugins from "./core/plugins.js";

// Renderer
import * as g_renderer from "./renderer/renderer.js";

// API
import * as g_colors from "./api/colors.js";
import * as g_graphicsApi from "./api/graphics.js";
import * as g_images from "./api/images.js";
import * as g_pixels from "./api/pixels.js";
import * as g_paint from "./api/paint.js";
import * as g_blends from "./api/blends.js";
import * as g_draw from "./api/draw.js";
import * as g_postfx from "./api/postfx.js";
import * as g_view from "./api/view.js";

// Text
import * as g_fonts from "./text/fonts.js";
import * as g_print from "./text/print.js";

// Version injected during build from package.json
const VERSION = __VERSION__;

// Create the main api for all external commands later assinged to globals pi or $
const m_api = {
	"version": VERSION
};

// Initialize the modules in dependency order.
g_commands.init( m_api );
g_screenManager.init( m_api );
g_plugins.init( m_api );
g_renderer.init( m_api );
g_colors.init( m_api );
g_graphicsApi.init( m_api );
g_images.init( m_api );
g_blends.init( m_api );
g_pixels.init( m_api );
g_paint.init( m_api );
g_draw.init( m_api );
g_postfx.init( m_api );
g_fonts.init( m_api );
g_print.init( m_api );
g_view.init( m_api );

// Process API commands
g_commands.processCommands( m_api );

// Set window.pi for browser environments
if( typeof window !== "undefined" ) {
	window.pi = m_api;

	// Set $ alias only if not already defined (avoid jQuery conflicts)
	if( window.$ === undefined ) {
		window.$ = m_api;
	}
}

// Export for different module systems
export default m_api;
export { m_api as pi, m_api as $ };
