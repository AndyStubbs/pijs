/**
 * Pi.js - Pointer Plugin
 * 
 * Mouse, touch, and press handling ported from alpha.1 as a plugin.
 * 
 * @module plugins/pointer
 * @version 1.0.0
 */

"use strict";

import { createEventHelpers } from "./shared-events.js";
import { registerMouse } from "./mouse.js";
import { registerTouch } from "./touch.js";
import { registerPress } from "./press.js";


/***************************************************************************************************
 * Plugin Initialization
 **************************************************************************************************/


export default function pointerPlugin( pluginApi ) {
	
	// Create shared helpers (onevent/offevent/triggerEventListeners)
	const helpers = createEventHelpers( pluginApi );
	
	// Register feature modules
	const mouseApi = registerMouse( pluginApi, helpers );
	const touchApi = registerTouch( pluginApi, helpers );
	const pressApi = registerPress( pluginApi, helpers );
	
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


