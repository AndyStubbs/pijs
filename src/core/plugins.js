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

	// Check for duplicate; a failed plugin's record is replaced so its name can be retried
	const existingIndex = m_plugins.findIndex( p => p.name === options.name );
	if( existingIndex !== -1 ) {
		if( m_plugins[ existingIndex ].state !== "failed" ) {
			const error = new Error(
				`registerPlugin: Plugin '${options.name}' is already registered.`
			);
			error.code = "DUPLICATE_PLUGIN";
			throw error;
		}
		m_plugins.splice( existingIndex, 1 );
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

	// Only this plugin's failure is thrown to this call; other plugins resolved here are logged
	let ownError = null;
	for( const failure of resolveDependencies() ) {
		if( failure.plugin === pluginInfo ) {
			ownError = failure.error;
		} else {
			console.error( failure.error.message );
		}
	}
	if( ownError ) {
		throw ownError;
	}
}

/**
 * Resolve registrations, including those made by initializers, without recursive entry.
 *
 * @returns {Array<Object>} Plugins that failed during this pass, as `{ plugin, error }`.
 */
function resolveDependencies() {
	if( m_isResolving ) {
		return [];
	}
	m_isResolving = true;
	const failures = [];
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
					failures.push( { "plugin": plugin, "error": error } );
				}
				progress = true;
			}
		}
	} finally {
		m_isResolving = false;
	}
	return failures;
}

/**
 * Get list of registered plugins
 *
 * @returns {Array<Object>} Plugin info objects with name, version, description, initialized,
 * and state ("pending", "initialized", or "failed")
 *
 * @example
 * const plugins = pi.getPlugins();
 * console.log( plugins ); // [{ name: "my-plugin", version: "1.0.0", ... }]
 */
function getPlugins() {
	return m_plugins.map( p => {
		let state = p.state;
		if( state === "initializing" ) {
			state = "pending";
		}
		return {
			"name": p.name,
			"version": p.version,
			"description": p.description,
			"initialized": p.initialized,
			"state": state
		};
	} );
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
 * Register a clearEvents handler function with a name. The handler is recorded in the plugin's
 * extensions and takes effect only if the plugin initializes.
 *
 * @param {Object} extensions - Calling plugin's pending registrations from initializePlugin
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
function registerClearEvents( extensions, name, handler ) {
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

	const isDuplicate = m_clearEventsHandlers[ lowerName ] ||
		extensions.clearEvents.some( item => item.name === lowerName );
	if( isDuplicate ) {
		const error = new Error(
			`registerClearEvents: Handler with name "${name}" is already registered.`
		);
		error.code = "DUPLICATE_HANDLER";
		throw error;
	}

	extensions.clearEvents.push( { "name": lowerName, "handler": handler } );
}

/**
 * Initialize a plugin transactionally. Its registrations are collected during init, installed
 * on existing screens, and committed globally only when both succeed, so a failed plugin leaves
 * no commands, settings, screen hooks, or clear handlers behind.
 *
 * @param {Object} pluginInfo - Registration record of the plugin to initialize
 * @returns {void}
 */
function initializePlugin( pluginInfo ) {
	if( pluginInfo.initialized ) {
		return;
	}
	const extensions = {
		"commands": [],
		"dataItems": [],
		"dataItemGetters": [],
		"initFunctions": [],
		"preCleanupFunctions": [],
		"cleanupFunctions": [],
		"clearEvents": []
	};

	// Registrations and the service are accepted only while init runs
	const session = { "isOpen": false, "hasService": false, "service": null };
	const register = ( method, fn ) => ( ...args ) => {
		if( !session.isOpen ) {
			const error = new Error(
				`${method}: Plugin '${pluginInfo.name}' can register only during init.`
			);
			error.code = "REGISTRATION_CLOSED";
			throw error;
		}
		fn( ...args );
	};

	// Create plugin API
	const pluginApi = {
		"addCommand": register(
			"addCommand", ( name, fn, isScreen, parameterNames, isScreenOptional ) => {
				extensions.commands.push( {
					"name": name, "fn": fn, "isScreen": isScreen,
					"parameterNames": parameterNames, "isScreenOptional": isScreenOptional
				} );
			}
		),
		"addScreenDataItem": register( "addScreenDataItem", ( name, value ) => {
			extensions.dataItems.push( { "name": name, "value": value } );
		} ),
		"addScreenDataItemGetter": register( "addScreenDataItemGetter", ( name, fn ) => {
			extensions.dataItemGetters.push( { "name": name, "fn": fn } );
		} ),
		"addScreenInitFunction": register( "addScreenInitFunction", fn => {
			extensions.initFunctions.push( fn );
		} ),
		"addScreenPreCleanupFunction": register( "addScreenPreCleanupFunction", fn => {
			extensions.preCleanupFunctions.push( fn );
		} ),
		"addScreenCleanupFunction": register( "addScreenCleanupFunction", fn => {
			extensions.cleanupFunctions.push( fn );
		} ),
		"getActiveScreen": g_screenManager.getActiveScreen,
		"getScreenData": g_screenManager.getScreenData,
		"getAllScreensData": g_screenManager.getAllScreensData,
		"resizeOffscreenScreen": g_screenManager.resizeOffscreenScreen,
		"getApi": () => m_api,
		"utils": g_utils,
		"wait": g_commands.wait,
		"done": g_commands.done,
		"registerClearEvents": register( "registerClearEvents", ( name, handler ) => {
			registerClearEvents( extensions, name, handler );
		} ),
		"provideService": service => provideService( session, service ),
		"getService": pluginName => getService( pluginInfo, pluginName )
	};

	// Initialize plugin, then install it on every screen, including screens created during init
	try {
		session.isOpen = true;
		try {
			pluginInfo.config.init( pluginApi );
		} finally {
			session.isOpen = false;
		}
		g_screenManager.installScreenExtensions(
			g_screenManager.getAllScreensData(), extensions
		);
	} catch( error ) {
		const pluginError = new Error(
			`registerPlugin: Failed to initialize plugin '${pluginInfo.name}': ${error.message}`
		);
		pluginError.code = "PLUGIN_INIT_FAILED";
		pluginError.originalError = error;
		throw pluginError;
	}

	commitExtensions( extensions );
	if( session.hasService ) {
		pluginInfo.service = session.service;
	}
	pluginInfo.initialized = true;
}

/**
 * Apply an initialized plugin's registrations to the global registries and the public API.
 *
 * @param {Object} extensions - Registrations collected by initializePlugin
 * @returns {void}
 */
function commitExtensions( extensions ) {
	const commands = extensions.commands.map( command => g_commands.addCommand(
		command.name, command.fn, command.isScreen, command.parameterNames,
		command.isScreenOptional
	) );
	for( const item of extensions.dataItems ) {
		g_screenManager.addScreenDataItem( item.name, item.value );
	}
	for( const item of extensions.dataItemGetters ) {
		g_screenManager.addScreenDataItemGetter( item.name, item.fn );
	}
	for( const fn of extensions.initFunctions ) {
		g_screenManager.addScreenInitFunction( fn );
	}
	for( const fn of extensions.preCleanupFunctions ) {
		g_screenManager.addScreenPreCleanupFunction( fn );
	}
	for( const fn of extensions.cleanupFunctions ) {
		g_screenManager.addScreenCleanupFunction( fn );
	}
	for( const item of extensions.clearEvents ) {
		m_clearEventsHandlers[ item.name ] = item.handler;
	}
	g_commands.processCommands( m_api, commands );
}

/**
 * Stores the service object a plugin exposes to plugins that depend on it.
 *
 * @param {Object} session - Per-plugin init session from initializePlugin
 * @param {Object} service - Service object
 * @returns {void}
 */
function provideService( session, service ) {
	if( !session.isOpen ) {
		const error = new Error( "provideService: Services can only be provided during init." );
		error.code = "SERVICE_PROVIDE_CLOSED";
		throw error;
	}
	if( service === null || typeof service !== "object" ) {
		const error = new TypeError( "provideService: service must be an object." );
		error.code = "INVALID_SERVICE";
		throw error;
	}
	if( session.hasService ) {
		const error = new Error( "provideService: This plugin has already provided a service." );
		error.code = "DUPLICATE_SERVICE";
		throw error;
	}
	session.hasService = true;
	session.service = service;
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
