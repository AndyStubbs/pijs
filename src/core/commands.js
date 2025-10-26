/**
 * Pi.js - Command System Core Module
 * 
 * Command registration and processing.
 * 
 * @module core/commands
 */

"use strict";

import * as utils from "./utils";

const m_commandList = [];
const m_settings = {};
let m_api;
let m_screenManager;
let m_readyCallbacks = [];
let m_isDocumentReady = false;
let m_waitCount = 0;
let m_checkReadyTimeout = null;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api, screenManager ) {
	m_api = api;
	m_screenManager = screenManager;

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

	// External API commands
	addCommand( "ready", ready, [ "callback" ] );
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

/**
 * Add a command to the system
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 * @param {Array<string>} parameterNames - Parameter names
 * @param {boolean} isScreen - If true, command requires screen
 * @param {boolean} screenOptional - If true, screen is optional (only valid if isScreen is true)
 */
export function addCommand( name, fn, parameterNames, isScreen = false, screenOptional = false ) {
	const cmd = {
		"name": name,
		"fn": fn,
		"parameterNames": parameterNames,
		"isScreen": isScreen,
		"screenOptional": screenOptional
	};
	m_commandList.push( cmd );

	// Add to settings item if starts with set
	if( name.startsWith( "set" ) && name !== "set" ) {

		const settingName = cmd.name.substring( 3, 4 ).toLowerCase() + cmd.name.substring( 4 );
		m_settings[ settingName ] = cmd;
	}
}

/**
 * Sorts then sets commands on the api
 */
export function processApi() {

	// Get the settings list
	const setList = []
	for( const cmd of m_commandList ) {
		if( cmd.name.startsWith( "set" ) ) {
			const settingName = cmd.name.substring( 3, 4 ).toLowerCase() + cmd.name.substring( 4 );
			setList.push( settingName );
		}
	}

	// Sort the settings list
	setList.sort( ( settingNameA, settingNameB ) => {

		// Screen should always go first
		if( settingNameA === "screen" ) {
			return -1;
		} else if( settingNameB === "screen" ) {
			return 1;
		}
		return settingNameA.localeCompare( settingNameB );
	} );
	
	// Add the set commands -- not all set commands are screen commands but some are so use
	// screenManager to add command. Set is screen-optional since it handles both screen and
	// non-screen settings.
	m_screenManager.addCommand( "set", set, setList, true );

	// Sort global command list
	m_commandList.sort( ( a, b ) => a.name.localeCompare( b.name ) );

	// Sort screen commands
	m_screenManager.sortScreenCommands();

	// Add all commands to API
	for( const command of m_commandList ) {
		processApiCommand( command );
	}
}

// Process an api command
export function processApiCommand( command ) {
	if( command.isScreen ) {
		m_api[ command.name ] = ( ...args ) => {
			const options = utils.parseOptions( args, command.parameterNames );
			const screenData = m_screenManager.getActiveScreen();
			if( !screenData && !command.screenOptional ) {
				const error = new Error( `${command.name}: No screens available for command.` );
				error.code = "NO_SCREEN";
				throw error;
			}
			return command.fn( screenData, options );
		};
	} else {
		m_api[ command.name ] = ( ...args ) => {
			const options = utils.parseOptions( args, command.parameterNames );
			return command.fn( options );
		};
	}
}


export function getApi() {
	return m_api;
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
function ready( options ) {
	const callback = options.callback;

	// Validate callback if provided
	if( callback != null && !utils.isFunction( callback ) ) {
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
// -- (Command added in processApi) after all settings have been added as commands
// -- Note: screenData will be null if the setting is not a screen setting
function set( screenData, options ) {

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
			const parsedOptions = utils.parseOptions( argsArray, setting.parameterNames );

			// Call the setting function
			if( setting.isScreen ) {
				setting.fn( screenData, parsedOptions );
			} else {
				setting.fn( parsedOptions );
			}

			// If we just set the screen then refresh the active screen
			if( optionName === "screen" ) {
				screenData = m_screenManager.getActiveScreen();
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
