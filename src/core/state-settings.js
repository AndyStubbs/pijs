/**
 * Pi.js - State/Settings Module - Handles set and ready command
 * 
 * @module core/state-settings
 */

"use strict";

// Import modules directly
import * as g_utils from "./utils.js";
import * as g_screenManager from "./screen-manager.js";

const m_settings = {};
let m_readyCallbacks = [];
let m_isDocumentReady = false;
let m_waitCount = 0;
let m_checkReadyTimeout = null;
let m_commands = [];


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {

	// Set up document ready detection
	if( typeof document !== "undefined" ) {
		if( document.readyState === "loading" ) {
			document.addEventListener( "DOMContentLoaded", onDocumentReady );
		} else {

			// Document already ready
			m_isDocumentReady = true;
		}
	} else {

		// Not in browser environment, mark as ready immediately
		m_isDocumentReady = true;
	}

	registerCommands( api );
	g_screenManager.addScreenInitFunction( processScreenCommands );
}

function registerCommands( api ) {

	// Register non screen commands
	addCommand( "ready", ready, false, [ "callback" ] );
	addCommand( "set", set, true, [ "options" ], true );
}

/**
 * Increment wait count - called by modules when starting async operations
 */
export function wait() {
	m_waitCount++;
}

/**
 * Decrement wait count - called by modules when async operations complete
 */
export function done() {
	m_waitCount--;
	if( m_waitCount < 0 ) {
		m_waitCount = 0;
	}

	// Check if ready to trigger callbacks
	scheduleReadyCheck();
}

export function addSetting( name, fn, isScreen ) {
	m_settings[ name ] = { fn, isScreen };
}

export function addCommand( name, fn, isScreen, parameterNames, isScreenOptional ) {
	m_commands.push( { name, fn, isScreen, parameterNames, isScreenOptional } );
	if( name.startsWith( "set" ) && name !== "set" ) {
		const settingName = name.substring( 3, 4 ).toLowerCase() + name.substring( 4 );
		m_settings[ settingName ] = { fn, isScreen, "parameterNames": parameterNames };
	}
}

export function processCommands( api ) {
	for( const command of m_commands ) {
		const { name, fn, isScreen, parameterNames, isScreenOptional } = command;
		if( isScreen ) {
			api[ name ] = ( ...args ) => {
				const options = g_utils.parseOptions( args, parameterNames );
				const screenData = g_screenManager.getActiveScreen( name, isScreenOptional );
				return fn( screenData, options );
			};
		} else {
			api[ name ] = ( ...args ) => {
				const options = g_utils.parseOptions( args, parameterNames );
				return fn( options );
			};
		}
	}
}

function processScreenCommands( screenData ) {
	for( const command of m_commands ) {
		const { name, fn, isScreen, parameterNames } = command;
		if( isScreen ) {
			screenData.api[ name ] = ( ...args ) => {
				const options = g_utils.parseOptions( args, parameterNames );
				return fn( screenData, options );
			};
		}
	}
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/

/**
 * ready command - waits for document ready and all pending resources
 * 
 * Supports both callback and promise patterns:
 *   - $.ready( callback )        // Callback style
 *   - await $.ready()            // Promise style
 *   - $.ready().then( ... )      // Promise .then() style
 * 
 * Behavior:
 *   - Never executes immediately (always defers to next tick)
 *   - Waits for document ready AND all resources with pending wait count
 *   - All ready() calls before resources are loaded trigger together
 *   - Each callback/promise only triggers once
 * 
 * Example:
 *   $.loadImage( "a.png", "a" );
 *   $.loadImage( "b.png", "b" );
 *   $.ready( () => console.log( "Both loaded" ) );
 *   // Waits for both a and b, triggers once
 */
function ready( callback ) {

	// Validate callback if provided
	if( callback != null && !g_utils.isFunction( callback ) ) {
		const error = new TypeError( "ready: Parameter callback must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	// Never execute immediately - always defer to next tick
	return new Promise( ( resolve ) => {
		m_readyCallbacks.push( {
			"callback": callback,
			"resolve": resolve,
			"triggered": false
		} );

		// Schedule a check for next tick (allows more resources to be added in same thread)
		scheduleReadyCheck();
	} );
}


// Global settings command
// This can get called from either the global api or directly from a screenData.api.
// screenData can be null if no screen is available
export function set( screenData, options ) {

	// Loop through all the options
	for( const optionName in options ) {

		// Skip blanks
		if( options[ optionName ] === null ) {
			continue;
		}

		// If the option is a valid setting
		if( m_settings[ optionName ] ) {

			// Get the setting data
			const setting = m_settings[ optionName ];
			const optionValues = options[ optionName ];

			// Parse the options from the setting
			// Wrap optionValues in array if not already an array
			//const argsArray = Array.isArray( optionValues ) ? optionValues : [ optionValues ];
			const argsArray = [ optionValues ];
			const parsedOptions = g_utils.parseOptions( argsArray, setting.parameterNames );

			// TODO: Need to handle when setting multiple commands that trigger api rebuilds so that
			// we can defer the api rebuilds until after settings are done. This will allow the 
			// user to do things like set both a pen and a blend and the api will only rebuild one
			// time. But since the rebuild will have to be completed before any new graphics 
			// commands get called this will be tricky. It would be nice to implement in the
			// build functions themselves but probably best to handle it here.

			// Call the setting function
			if( setting.isScreen ) {
				setting.fn( screenData, parsedOptions );
			} else {
				setting.fn( parsedOptions );
			}

			// If we just set the screen then refresh the active screen
			// This allows for setting of multiple different screens in one call
			if( optionName === "screen" ) {
				screenData = g_screenManager.getActiveScreen();
			}
		}
	}
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Called when document is ready
function onDocumentReady() {
	m_isDocumentReady = true;

	// Check if we can trigger ready callbacks
	scheduleReadyCheck();
}

// Schedule a ready check on next tick (allows more load calls in same thread)
function scheduleReadyCheck() {

	// Clear any existing timeout
	if( m_checkReadyTimeout !== null ) {
		clearTimeout( m_checkReadyTimeout );
	}

	// Schedule check for next tick
	m_checkReadyTimeout = setTimeout( checkReady, 0 );
}

// Check if all conditions are met to trigger ready callbacks
function checkReady() {
	m_checkReadyTimeout = null;

	// Don't check if document not ready
	if( !m_isDocumentReady ) {
		return;
	}

	// Don't trigger if resources are still loading
	if( m_waitCount !== 0 ) {
		return;
	}

	// Trigger all pending ready callbacks together
	// Note: All ready() calls registered before this point will trigger at once
	// This allows loads in the same thread to be captured before triggering
	const callbacks = m_readyCallbacks.slice();
	m_readyCallbacks = [];

	for( const item of callbacks ) {

		// Skip if already triggered (shouldn't happen, but safety check)
		if( item.triggered ) {
			continue;
		}

		// Mark as triggered (ensures each callback only runs once)
		item.triggered = true;

		// Execute callback and resolve promise
		if( item.callback ) {
			item.callback();
		}
		item.resolve();
	}
}
