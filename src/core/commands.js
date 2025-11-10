/**
 * Pi.js - Command System Module
 * 
 * Command registration and processing for Pi.js.
 * Handles ready command and set command.
 * 
 * @module core/commands
 */

"use strict";

import * as g_utils from "./utils.js";
import * as g_screenManager from "./screen-manager.js";

const m_settings = {};
const m_commands = [];
let m_api = null;
let m_readyCallbacks = [];
let m_isDocumentReady = false;
let m_waitCount = 0;
let m_checkReadyTimeout = null;


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


export function init( api ) {
	m_api = api;

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

	registerCommands();
	g_screenManager.addScreenInitFunction( processScreenCommands );
}

function registerCommands() {

	// Register non screen commands
	addCommand( "ready", ready, false, [ "callback" ] );
	addCommand( "set", set, true, [ "options" ], true );
}


/***************************************************************************************************
 * Command processing
 ***************************************************************************************************/


export function addCommand( name, fn, isScreen, parameterNames, isScreenOptional ) {
	m_commands.push( { name, fn, isScreen, parameterNames, isScreenOptional } );
	
	// Auto-register set commands as settings
	if( name.startsWith( "set" ) && name !== "set" ) {
		const settingName = name.substring( 3, 4 ).toLowerCase() + name.substring( 4 );
		m_settings[ settingName ] = {
			fn, isScreen, "parameterNames": parameterNames, isProcessed: false
		};
	}
}

export function processCommands( api ) {
	for( const command of m_commands ) {
		if( !command.isProcessed ) {
			processCommand( api, command );
		}
	}
}

function processCommand( api, command ) {
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
 * Resource Loader - Ready Command
 ***************************************************************************************************/

/**
 * ready command - waits for document ready and all pending resources
 * 
 * Supports both callback and promise patterns:
 *   - $.ready( callback )        // Callback style
 *   - await $.ready()            // Promise style
 *   - $.ready().then( ... )      // Promise .then() style
 */
function ready( options ) {

	const callback = options.callback;
	
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

export function wait() {
	m_waitCount++;
}

export function done() {
	m_waitCount--;
	if( m_waitCount < 0 ) {
		m_waitCount = 0;
	}

	// Check if ready to trigger callbacks
	scheduleReadyCheck();
}

function onDocumentReady() {
	m_isDocumentReady = true;
	scheduleReadyCheck();
}

function scheduleReadyCheck() {

	// Clear any existing timeout
	if( m_checkReadyTimeout !== null ) {
		clearTimeout( m_checkReadyTimeout );
	}

	// Schedule check for next tick
	m_checkReadyTimeout = setTimeout( checkReady, 0 );
}

function checkReady() {

	// TODO: [Violation] 'setTimeout' handler took 381ms
	// Long running tasks in callback should be handled - maybe we should track callback times?

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
	const callbacks = m_readyCallbacks.slice();
	m_readyCallbacks = [];

	for( const item of callbacks ) {

		// Skip if already triggered
		if( item.triggered ) {
			continue;
		}

		// Mark as triggered
		item.triggered = true;

		// Execute callback and resolve promise
		if( item.callback ) {
			item.callback();
		}
		item.resolve();
	}
}


/***************************************************************************************************
 * Settings and set command
 ***************************************************************************************************/

/**
 * Global settings command
 * 
 * This can get called from either the global api or directly from a screenData.api.
 * screenData can be null if no screen is available
 */
export function set( screenData, options ) {

	// Unpack options
	options = options.options;

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
			const argsArray = [ optionValues ];
			const parsedOptions = g_utils.parseOptions( argsArray, setting.parameterNames );

			// Call the setting function
			if( setting.isScreen ) {
				setting.fn( screenData, parsedOptions );
			} else {
				setting.fn( parsedOptions );
			}

			// If we just set the screen then update the screenData to the new active screen
			if( optionName === "screen" ) {
				screenData = g_screenManager.getActiveScreen();
			}
		}
	}
}

export function addSetting( name, fn, isScreen ) {
	m_settings[ name ] = { fn, isScreen };
}

