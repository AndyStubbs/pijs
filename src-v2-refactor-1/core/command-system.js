/**
 * Pi.js - Command System Module
 * 
 * Command registration and processing, matching legacy API pattern.
 * 
 * @module core/command-system
 */

"use strict";

import { piData, commandList } from "./pi-data.js";
import * as utils from "../modules/utils.js";

/**
 * Add a command to the system
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 * @param {boolean} isInternal - If true, not exposed in API
 * @param {boolean} isScreen - If true, requires screen context
 * @param {Array} parameters - Parameter names
 * @param {boolean} isSet - If true, this is a setting
 */
export function addCommand( name, fn, isInternal, isScreen, parameters, isSet ) {
	piData.commands[ name ] = fn;

	if( !isInternal ) {
		commandList.push( {
			"name": name,
			"fn": fn,
			"isScreen": isScreen,
			"parameters": parameters || [],
			"isSet": isSet,
			"noParse": isSet
		} );
	}
}

/**
 * Add a command with dual pixel/anti-aliased implementations
 * 
 * @param {string} name - Command name
 * @param {Function} fnPx - Pixel mode implementation
 * @param {Function} fnAa - Anti-aliased mode implementation
 * @param {Array} parameters - Parameter names
 */
export function addCommands( name, fnPx, fnAa, parameters ) {
	addCommand( name, function( screenData, args ) {
		if( screenData.pixelMode ) {
			fnPx( screenData, args );
		} else {
			fnAa( screenData, args );
		}
	}, false, true, parameters );
}

/**
 * Add a setting
 * 
 * @param {string} name - Setting name
 * @param {Function} fn - Setting function
 * @param {boolean} isScreen - If true, requires screen context
 * @param {Array} parameters - Parameter names
 */
export function addSetting( name, fn, isScreen, parameters ) {
	piData.settings[ name ] = {
		"name": name,
		"fn": fn,
		"isScreen": isScreen,
		"parameters": parameters || []
	};
	piData.settingsList.push( name );
}

/**
 * Parse options - converts object notation to array or passes through array
 * 
 * @param {Object} cmd - Command definition
 * @param {Array} args - Arguments passed to command
 * @returns {Array} Parsed arguments
 */
export function parseOptions( cmd, args ) {
	if( cmd.noParse ) {
		return args;
	}

	// If first argument is an object, convert to array based on parameter names
	if(
		args.length > 0 &&
		typeof args[ 0 ] === "object" &&
		args[ 0 ] !== null &&
		!args[ 0 ].hasOwnProperty( "screen" ) &&
		!utils.isArray( args[ 0 ] ) &&
		!utils.isDomElement( args[ 0 ] )
	) {
		const options = args[ 0 ];
		const args2 = [];
		let foundParameter = false;

		for( let i = 0; i < cmd.parameters.length; i++ ) {
			if( options.hasOwnProperty( cmd.parameters[ i ] ) ) {
				args2.push( options[ cmd.parameters[ i ] ] );
				foundParameter = true;
			} else {
				args2.push( null );
			}
		}

		if( foundParameter ) {
			return args2;
		}
	}

	return args;
}

/**
 * Add a pen drawing mode
 * 
 * @param {string} name - Pen name
 * @param {Function} fn - Pen function
 * @param {string} cap - Line cap style
 */
export function addPen( name, fn, cap ) {
	piData.penList.push( name );
	piData.pens[ name ] = {
		"cmd": fn,
		"cap": cap
	};
}

/**
 * Add a blend command
 * 
 * @param {string} name - Blend mode name
 * @param {Function} fn - Blend function
 */
export function addBlendCommand( name, fn ) {
	piData.blendCommandsList.push( name );
	piData.blendCommands[ name ] = fn;
}

/**
 * Process commands and create API methods
 * 
 * @param {Object} api - API object to add methods to
 */
export function processCommands( api ) {
	
	// Alphabetize commands
	commandList.sort( ( a, b ) => {
		const nameA = a.name.toUpperCase();
		const nameB = b.name.toUpperCase();
		if( nameA < nameB ) {
			return -1;
		}
		if( nameA > nameB ) {
			return 1;
		}
		return 0;
	} );

	for( const cmd of commandList ) {
		processCommand( api, cmd );
	}
}

/**
 * Process a single command and add to API
 * 
 * @param {Object} api - API object
 * @param {Object} cmd - Command definition
 */
function processCommand( api, cmd ) {
	if( cmd.isSet ) {
		piData.screenCommands[ cmd.name ] = cmd;
		api[ cmd.name ] = function( ...args ) {
			const parsedArgs = parseOptions( cmd, args );
			return piData.commands[ cmd.name ]( null, parsedArgs );
		};
		return;
	}

	if( cmd.isScreen ) {
		piData.screenCommands[ cmd.name ] = cmd;
		api[ cmd.name ] = function( ...args ) {
			const parsedArgs = parseOptions( cmd, args );
			const screenData = getScreenData( undefined, cmd.name );
			if( screenData !== false ) {
				return piData.commands[ cmd.name ]( screenData, parsedArgs );
			}
		};
	} else {
		api[ cmd.name ] = function( ...args ) {
			const parsedArgs = parseOptions( cmd, args );
			return piData.commands[ cmd.name ]( parsedArgs );
		};
	}
}

/**
 * Get screen data for command execution
 * 
 * @param {number|undefined} screenId - Screen ID or undefined for active screen
 * @param {string} commandName - Command name for error messages
 * @returns {Object|boolean} Screen data or false
 */
export function getScreenData( screenId, commandName ) {
	if( piData.activeScreen === null ) {
		if( commandName === "set" ) {
			return false;
		}

		// Use native Error for missing screen
		const error = new Error( `${commandName}: No screens available for command.` );
		error.code = "NO_SCREEN";
		throw error;
	}

	if( screenId === undefined || screenId === null ) {
		screenId = piData.activeScreen.id;
	}

	if( utils.isInteger( screenId ) && !piData.screens[ screenId ] ) {
		// Use native Error for invalid screen ID
		const error = new Error( `${commandName}: Invalid screen id.` );
		error.code = "INVALID_SCREEN_ID";
		throw error;
	}

	return piData.screens[ screenId ];
}

