/**
 * Pi.js - Pointer Plugin
 *
 * Mouse, touch, press, click, and wheel handling ported from alpha.1 as a plugin.
 *
 * @module plugins/pointer
 * @version 2.0.0
 */

"use strict";

import * as g_sharedEvents from "./shared-events.js";
import * as g_mouse from "./mouse.js";
import * as g_touch from "./touch.js";
import * as g_press from "./press.js";
import * as g_wheel from "./wheel.js";


/*************************************************************************************************
 * Plugin Initialization
 ************************************************************************************************/


/**
 * Register mouse, touch, press, click, and wheel commands with shared cleanup hooks.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @returns {void}
 */
export default function pointerPlugin( pluginApi ) {

	// Create shared helpers (onevent/offevent/triggerEventListeners)
	const helpers = g_sharedEvents.createEventHelpers( pluginApi );

	// Register feature modules
	const mouseApi = g_mouse.registerMouse( pluginApi, helpers );
	const touchApi = g_touch.registerTouch( pluginApi, helpers );
	const pressApi = g_press.registerPress( pluginApi, helpers );
	const wheelApi = g_wheel.registerWheel( pluginApi, helpers );

	// Register one clearEvents type per handler command; each clears only its own handlers
	registerScreenClear( pluginApi, "mouse", mouseApi.clearMouseEvents );
	registerScreenClear( pluginApi, "touch", touchApi.clearTouchEvents );
	registerScreenClear( pluginApi, "press", pressApi.clearPressEvents );
	registerScreenClear( pluginApi, "click", pressApi.clearClickEvents );
	registerScreenClear( pluginApi, "wheel", wheelApi.clearWheelEvents );

	// Screen cleanup. Handlers are cleared before tracking stops, so the release of held input
	// reaches no handler of a screen being removed
	pluginApi.addScreenCleanupFunction( ( screenData ) => {
		mouseApi.clearMouseEvents( screenData );
		touchApi.clearTouchEvents( screenData );
		pressApi.clearPressEvents( screenData );
		pressApi.clearClickEvents( screenData );
		wheelApi.clearWheelEvents( screenData );
		if( screenData.mouseStarted ) {
			mouseApi.stopMouse( screenData );
		}
		if( screenData.touchStarted ) {
			touchApi.stopTouch( screenData );
		}
		mouseApi.cleanupContextMenu( screenData );
	} );
}


/**
 * Register a clearEvents type for per-screen handlers: a screen's clearEvents() clears that
 * screen's handlers, and $.clearEvents(), which passes no screen, clears every screen's.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @param {string} type - clearEvents type.
 * @param {Function} clear - Clears the handlers of one screen.
 * @returns {void}
 */
function registerScreenClear( pluginApi, type, clear ) {
	pluginApi.registerClearEvents( type, ( screenData ) => {
		if( screenData !== null ) {
			clear( screenData );
		} else {
			for( const eachScreenData of pluginApi.getAllScreensData() ) {
				clear( eachScreenData );
			}
		}
	} );
}


// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "pointer",
		"version": "2.0.0",
		"description": "Mouse and touch input handling for Pi.js",
		"init": pointerPlugin
	} );
}


