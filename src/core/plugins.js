/**
 * Pi.js - Plugin System Core Module
 *
 * Plugin registration and management for extending Pi.js functionality.
 *
 * @module core/plugins
 */

"use strict";

import * as g_commands from "./commands.js";
import * as g_screenManager from "./screen-manager.js";
import * as g_utils from "./utils.js";

const m_plugins = [];
let m_isResolving = false;
const m_clearEventsHandlers = {};
let m_api = null;


/*************************************************************************************************
 * Module Commands
 ************************************************************************************************/


/**
 * Initialize the module and register its commands and lifecycle hooks.
 *
 * @param {Object} api - Public Pi.js API.
 * @returns {void}
 */
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
}


/*************************************************************************************************
 * External API Commands
 ************************************************************************************************/


/**
 * Register a plugin with Pi.js
 *
 * @param {Object} options - Plugin configuration
 * @param {string} options.name - Unique name for the plugin
 * @param {Function} options.init - Initialization function that receives pluginApi
 * @param {string} [options.version] - Optional version string
 * @param {string} [options.description] - Optional description
 * @param {string[]} [options.dependencies] - Optional list of dependencies
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

	const dependencies = options.dependencies ?? [];
	if(
		!Array.isArray( dependencies ) ||
		dependencies.some( name => typeof name !== "string" || name.trim() === "" )
	) {
		const error = new TypeError(
			"registerPlugin: dependencies must be an array of nonempty strings."
		);
		error.code = "INVALID_PLUGIN_DEPENDENCIES";
		throw error;
	}
	options = { ...options, "dependencies": dependencies.slice() };

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
		"initialized": false,
		"state": "pending"
	};

	m_plugins.push( pluginInfo );

	resolveDependencies();
}

/** Resolve registrations, including those made by initializers, without recursive entry. */
function resolveDependencies() {
	if( m_isResolving ) {
		return;
	}
	m_isResolving = true;
	let firstError = null;
	try {
		let progress = true;
		while( progress ) {
			progress = false;
			for( const plugin of m_plugins ) {
				if(
					plugin.state !== "pending" || !plugin.config.dependencies.every(
					name => m_plugins.some( item => item.name === name && item.initialized )
				)
				) {
					continue;
				}
				plugin.state = "initializing";
				try {
					initializePlugin( plugin );
					plugin.state = "initialized";
				} catch( error ) {
					plugin.state = "failed";
					if( !firstError ) {
						firstError = error;
					}
				}
				progress = true;
			}
		}
	} finally {
		m_isResolving = false;
	}
	if( firstError ) {
		throw firstError;
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
 * @param {string} [options.type] - Optional type to clear (e.g., "keyboard", "mouse", "touch",
 * "press")
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


/*************************************************************************************************
 * Internal Commands
 ************************************************************************************************/


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
	const existingScreens = g_screenManager.getAllScreensData();
	const extensions = {
		"commands": [],
		"dataItems": [],
		"dataItemGetters": [],
		"initFunctions": []
	};

	// The service is published only after init succeeds, so a failed plugin exposes nothing
	const serviceState = { "isOpen": false, "hasService": false, "service": null };

	// Create plugin API
	const pluginApi = {
		"addCommand": ( ...args ) => {
			extensions.commands.push( g_commands.addCommand( ...args ) );
		},
		"addScreenDataItem": ( name, value ) => {
			g_screenManager.addScreenDataItem( name, value );
			extensions.dataItems.push( { "name": name, "value": value } );
		},
		"addScreenDataItemGetter": ( name, fn ) => {
			g_screenManager.addScreenDataItemGetter( name, fn );
			extensions.dataItemGetters.push( { "name": name, "fn": fn } );
		},
		"addScreenInitFunction": fn => {
			g_screenManager.addScreenInitFunction( fn );
			extensions.initFunctions.push( fn );
		},
		"addScreenPreCleanupFunction": g_screenManager.addScreenPreCleanupFunction,
		"addScreenCleanupFunction": g_screenManager.addScreenCleanupFunction,
		"getActiveScreen": g_screenManager.getActiveScreen,
		"getScreenData": g_screenManager.getScreenData,
		"getAllScreensData": g_screenManager.getAllScreensData,
		"resizeOffscreenScreen": g_screenManager.resizeOffscreenScreen,
		"getApi": () => m_api,
		"utils": g_utils,
		"wait": g_commands.wait,
		"done": g_commands.done,
		"registerClearEvents": registerClearEvents,
		"provideService": service => provideService( serviceState, service ),
		"getService": pluginName => getService( pluginInfo, pluginName )
	};

	// Initialize plugin
	try {
		serviceState.isOpen = true;
		try {
			pluginInfo.config.init( pluginApi );
		} finally {
			serviceState.isOpen = false;
		}
		g_screenManager.installScreenExtensions( existingScreens, extensions );
		g_commands.processCommands( m_api, extensions.commands );
		if( serviceState.hasService ) {
			pluginInfo.service = serviceState.service;
		}
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

/**
 * Stores the service object a plugin exposes to plugins that depend on it.
 *
 * @param {Object} serviceState - Per-plugin service state from initializePlugin
 * @param {Object} service - Service object
 * @returns {void}
 */
function provideService( serviceState, service ) {
	if( !serviceState.isOpen ) {
		const error = new Error( "provideService: Services can only be provided during init." );
		error.code = "SERVICE_PROVIDE_CLOSED";
		throw error;
	}
	if( service === null || typeof service !== "object" ) {
		const error = new TypeError( "provideService: service must be an object." );
		error.code = "INVALID_SERVICE";
		throw error;
	}
	if( serviceState.hasService ) {
		const error = new Error( "provideService: This plugin has already provided a service." );
		error.code = "DUPLICATE_SERVICE";
		throw error;
	}
	serviceState.hasService = true;
	serviceState.service = service;
}

/**
 * Returns the service of an initialized plugin that the caller declared as a dependency.
 *
 * @param {Object} pluginInfo - Calling plugin's registration record
 * @param {string} pluginName - Name of the dependency whose service is requested
 * @returns {Object} The dependency's service object
 */
function getService( pluginInfo, pluginName ) {
	const provider = m_plugins.find( item => item.name === pluginName );
	let reason = null;
	if( !pluginInfo.config.dependencies.includes( pluginName ) ) {
		reason = "is not a declared dependency";
	} else if( !provider || !provider.initialized ) {
		reason = "is not initialized";
	} else if( !Object.prototype.hasOwnProperty.call( provider, "service" ) ) {
		reason = "does not provide a service";
	}
	if( reason ) {
		const error = new Error(
			`getService: Plugin '${pluginName}' ${reason} for plugin '${pluginInfo.name}'.`
		);
		error.code = "SERVICE_NOT_AVAILABLE";
		throw error;
	}
	return provider.service;
}
