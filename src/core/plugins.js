/**
 * Pi.js - Plugin System Core Module
 * 
 * Plugin registration and management for extending Pi.js functionality.
 * 
 * @module core/plugins
 */

"use strict";

// Import modules directly
import * as g_commands from "./commands.js";
import * as g_screenManager from "./screen-manager.js";
import * as g_utils from "./utils.js";

const m_plugins = [];
const m_waitingForDependencies = [];
const m_clearEventsHandlers = {};
let m_api = null;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {
	m_api = api;

	// Register external API commands
	g_commands.addCommand(
		"registerPlugin", registerPlugin, false,
		[ "name", "init", "version", "description", "dependencies" ]
	);
	g_commands.addCommand(
		"getPlugins", getPlugins, false, []
	);
	g_commands.addCommand(
		"clearEvents", clearEvents, true, [ "type" ], true
	);

	// Resolve plugins waiting on dependencies at end of frame
	queueMicrotask( () => {
		for( const pluginInfo of m_waitingForDependencies ) {
			let missingDependencies = [];
			for( const dependency of pluginInfo.dependencies ) {
				if( !m_plugins.some( pi => pi.name === dependency ) ) {
					missingDependencies.push( dependency );
				}
			}
			if( missingDependencies.length > 0 ) {
				console.error(
					`Unable to initialize plugin "${pluginInfo.name}". Missing the following ` +
					`dependencies: ` + missingDependencies.join( ", " ) + "."
				);
			} else {
				initializePlugin( pluginInfo );
			}
		}
	} );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


/**
 * Register a plugin with Pi.js
 * 
 * @param {Object} options - Plugin configuration
 * @param {string} options.name - Unique name for the plugin
 * @param {Function} options.init - Initialization function that receives pluginApi
 * @param {string} [options.version] - Optional version string
 * @param {string} [options.description] - Optional description
 * @param {string} [options.dependencies] - Optional list of dependencies
 * @returns {void}
 * 
 * @example
 * pi.registerPlugin( {
 *   "name": "my-plugin",
 *   "version": "1.0.0",
 *   "description": "My custom plugin",
 *   "init": ( pluginApi ) => {
 *     pluginApi.addCommand( "myCommand", myFn, [ "param1" ] );
 *   }
 * } );
 */
function registerPlugin( options ) {

	// Validate required parameters
	if( !options.name || typeof options.name !== "string" ) {
		const error = new TypeError( "registerPlugin: Plugin must have a 'name' property." );
		error.code = "INVALID_PLUGIN_NAME";
		throw error;
	}

	if( !options.init || typeof options.init !== "function" ) {
		const error = new TypeError(
			`registerPlugin: Plugin '${options.name}' must have an 'init' function.`
		);
		error.code = "INVALID_PLUGIN_INIT";
		throw error;
	}

	// If dependencies is not defined then create empty array
	if( options.dependencies === null ) {
		options.dependencies = [];
	}

	// Check for duplicate
	if( m_plugins.some( p => p.name === options.name ) ) {
		const error = new Error(
			`registerPlugin: Plugin '${options.name}' is already registered.`
		);
		error.code = "DUPLICATE_PLUGIN";
		throw error;
	}

	// Store plugin info
	const pluginInfo = {
		"name": options.name,
		"version": options.version || "unknown",
		"description": options.description || "",
		"config": options,
		"initialized": false
	};

	m_plugins.push( pluginInfo );

	// If all dependencies loaded then process immediately
	let isWaitingForDependencies = false;
	for( const dependency of pluginInfo.config.dependencies ) {
		if( !m_plugins.some( pi => pi.name === dependency ) ) {
			isWaitingForDependencies = true;
		}
	}
	if( isWaitingForDependencies ) {
		m_waitingForDependencies.push( pluginInfo );
	} else {
		initializePlugin( pluginInfo );
	}
}

/**
 * Get list of registered plugins
 * 
 * @returns {Array<Object>} Array of plugin info objects with name, version, description
 * 
 * @example
 * const plugins = pi.getPlugins();
 * console.log( plugins ); // [{ name: "my-plugin", version: "1.0.0", ... }]
 */
function getPlugins() {
	return m_plugins.map( p => ( {
		"name": p.name,
		"version": p.version,
		"description": p.description,
		"initialized": p.initialized
	} ) );
}

/**
 * Clear all events from all plugins or a specific plugin type
 * 
 * @param {Object} screenData - Screen data object (may be null)
 * @param {Object} options - Options object
 * @param {string} [options.type] - Optional type to clear (e.g., "keyboard", "mouse", "touch", "press")
 * @returns {void}
 * 
 * @example
 * $.clearEvents(); // Clear all events from all plugins
 * $.clearEvents( { "type": "keyboard" } ); // Clear only keyboard events
 */
function clearEvents( screenData, options ) {
	const type = options?.type;
	
	if( type ) {

		// Clear events for specific type
		const lowerType = String( type ).toLowerCase();
		const handler = m_clearEventsHandlers[ lowerType ];
		
		if( !handler ) {
			const validTypes = Object.keys( m_clearEventsHandlers );
			let errorMessage = `clearEvents: Invalid type "${type}".`;
			if( validTypes.length > 0 ) {
				errorMessage += ` Valid types are: ${validTypes.join( ", " )}.`;
			} else {
				errorMessage += " No event handlers are registered.";
			}
			const error = new Error( errorMessage );
			error.code = "INVALID_TYPE";
			throw error;
		}
		
		try {
			handler( screenData );
		} catch( error ) {
			console.error(
				`clearEvents: Error calling clearEvents handler for type "${type}": ` +
				`${error.message}`
			);
		}
	} else {

		// Clear events for all registered types
		for( const handlerName in m_clearEventsHandlers ) {
			const handler = m_clearEventsHandlers[ handlerName ];
			try {
				handler( screenData );
			} catch( error ) {
				console.error(
					`clearEvents: Error calling clearEvents handler for type "${handlerName}": ` +
					`${error.message}`
				);
			}
		}
	}
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


/**
 * Register a clearEvents handler function with a name
 * 
 * @param {string} name - Name of the event type (e.g., "keyboard", "mouse", "touch", "press")
 * @param {Function} handler - Function to call when clearEvents is invoked for this type
 * @param {Object} [handler.screenData] - Screen data passed from clearEvents (may be null)
 * @returns {void}
 * 
 * @example
 * pluginApi.registerClearEvents( "keyboard", ( screenData ) => {
 *   // Clear keyboard events for this plugin
 * } );
 */
function registerClearEvents( name, handler ) {
	if( !name || typeof name !== "string" ) {
		const error = new TypeError( "registerClearEvents: name must be a non-empty string." );
		error.code = "INVALID_NAME";
		throw error;
	}
	
	if( typeof handler !== "function" ) {
		const error = new TypeError( "registerClearEvents: handler must be a function." );
		error.code = "INVALID_HANDLER";
		throw error;
	}
	
	const lowerName = name.toLowerCase();
	
	if( m_clearEventsHandlers[ lowerName ] ) {
		const error = new Error(
			`registerClearEvents: Handler with name "${name}" is already registered.`
		);
		error.code = "DUPLICATE_HANDLER";
		throw error;
	}
	
	m_clearEventsHandlers[ lowerName ] = handler;
}

// Initialize a plugin
function initializePlugin( pluginInfo ) {
	if( pluginInfo.initialized ) {
		return;
	}

	// Create plugin API
	const pluginApi = {
		"addCommand": g_commands.addCommand,
		"addScreenDataItem": g_screenManager.addScreenDataItem,
		"addScreenDataItemGetter": g_screenManager.addScreenDataItemGetter,
		"addScreenInitFunction": g_screenManager.addScreenInitFunction,
		"addScreenCleanupFunction": g_screenManager.addScreenCleanupFunction,
		"getScreenData": g_screenManager.getScreenData,
		"getAllScreensData": g_screenManager.getAllScreensData,
		"getApi": () => m_api,
		"utils": g_utils,
		"wait": g_commands.wait,
		"done": g_commands.done,
		"registerClearEvents": registerClearEvents
	};

	// Initialize plugin
	try {
		pluginInfo.config.init( pluginApi );
		g_commands.processCommands( m_api );
		pluginInfo.initialized = true;
	} catch( error ) {
		const pluginError = new Error(
			`registerPlugin: Failed to initialize plugin '${pluginInfo.name}': ${error.message}`
		);
		pluginError.code = "PLUGIN_INIT_FAILED";
		pluginError.originalError = error;
		throw pluginError;
	}
}

