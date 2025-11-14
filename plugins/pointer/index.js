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
	
	// Combined clear command (keeps legacy name for compatibility)
	pluginApi.addCommand( "clearEventsAlpha1", ( maybeScreenData, options ) => {
		const type = options.type;
		const types = Array.isArray( type ) ? type : ( type ? [ type ] : null );
		const screenData = maybeScreenData || null;
		
		if( !types ) {
			if( screenData ) {
				mouseApi.clearMouseEvents( screenData );
				touchApi.clearTouchEvents( screenData );
				pressApi.clearPressEvents( screenData );
				pressApi.clearClickEvents( screenData );
			}
			return;
		}
		
		for( const t of types ) {
			const lowerType = String( t ).toLowerCase();
			if( lowerType === "mouse" ) {
				if( !screenData ) {
					const error = new Error( "clearEventsAlpha1: No screen available to clear mouse events." );
					error.code = "NO_SCREEN";
					throw error;
				}
				mouseApi.clearMouseEvents( screenData );
			} else if( lowerType === "touch" ) {
				if( !screenData ) {
					const error = new Error( "clearEventsAlpha1: No screen available to clear touch events." );
					error.code = "NO_SCREEN";
					throw error;
				}
				touchApi.clearTouchEvents( screenData );
			} else if( lowerType === "press" ) {
				if( !screenData ) {
					const error = new Error( "clearEventsAlpha1: No screen available to clear press events." );
					error.code = "NO_SCREEN";
					throw error;
				}
				pressApi.clearPressEvents( screenData );
			} else if( lowerType === "click" ) {
				if( !screenData ) {
					const error = new Error( "clearEventsAlpha1: No screen available to clear click events." );
					error.code = "NO_SCREEN";
					throw error;
				}
				pressApi.clearClickEvents( screenData );
			} else {
				continue;
			}
		}
	}, [ "type" ] );
	
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
		"description": "Mouse, touch, and press handling ported from alpha.1.",
		"init": pointerPlugin
	} );
}


