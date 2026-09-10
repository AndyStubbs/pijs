/**
 * Pi.js - Pointer Plugin
 *
 * Mouse, touch, and press handling ported from alpha.1 as a plugin.
 *
 * @module plugins/pointer
 * @version 1.0.0
 */

"use strict";

import * as g_sharedEvents from "./shared-events.js";
import * as g_mouse from "./mouse.js";
import * as g_touch from "./touch.js";
import * as g_press from "./press.js";


/*************************************************************************************************
 * Plugin Initialization
 ************************************************************************************************/


/**
 * Register mouse, touch, press, and click commands with shared cleanup hooks.
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

	// Register clearEvents handlers for mouse, touch, and press
	pluginApi.registerClearEvents( "mouse", ( screenData ) => {
		if( screenData !== null ) {

			// Clear mouse events for specific screen
			mouseApi.clearMouseEvents( screenData );
		} else {

			// Clear mouse events for all screens
			const allScreensData = pluginApi.getAllScreensData();
			for( const sd of allScreensData ) {
				mouseApi.clearMouseEvents( sd );
			}
		}
	} );

	pluginApi.registerClearEvents( "touch", ( screenData ) => {
		if( screenData !== null ) {

			// Clear touch events for specific screen
			touchApi.clearTouchEvents( screenData );
		} else {

			// Clear touch events for all screens
			const allScreensData = pluginApi.getAllScreensData();
			for( const sd of allScreensData ) {
				touchApi.clearTouchEvents( sd );
			}
		}
	} );

	pluginApi.registerClearEvents( "press", ( screenData ) => {
		if( screenData !== null ) {

			// Clear press and click events for specific screen
			pressApi.clearPressEvents( screenData );
			pressApi.clearClickEvents( screenData );
		} else {

			// Clear press and click events for all screens
			const allScreensData = pluginApi.getAllScreensData();
			for( const sd of allScreensData ) {
				pressApi.clearPressEvents( sd );
				pressApi.clearClickEvents( sd );
			}
		}
	} );

	// Screen cleanup
	pluginApi.addScreenCleanupFunction( ( screenData ) => {
		if( screenData.mouseStarted ) {
			mouseApi.stopMouse( screenData );
		}
		if( screenData.touchStarted ) {
			touchApi.stopTouch( screenData );
		}
		mouseApi.clearMouseEvents( screenData );
		touchApi.clearTouchEvents( screenData );
		pressApi.clearPressEvents( screenData );
		pressApi.clearClickEvents( screenData );
	} );
}


// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "pointer",
		"version": "1.0.0",
		"description": "Mouse and touch input handling for Pi.js",
		"init": pointerPlugin
	} );
}


