/**
 * Pi Vision Plugin for Pi.js
 * 
 * Provides retro, character-cell-based windows under the $.vis namespace.
 * 
 * @module plugins/pi-vision
 * @version 1.0.0
 */

"use strict";

import g_Window from "./window.js";
import g_Compositor from "./compositor.js";

let g_pluginApi = null;

/**
 * Initialize the Pi Vision plugin
 * 
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 * @returns {void}
 */
export default function piVisionPlugin( pluginApi ) {
	g_pluginApi = pluginApi;

	// Initialize Components
	g_Window.init( g_pluginApi );
	g_Compositor.init( g_pluginApi );

	// Setup API's
	const api = g_pluginApi.getApi();
	g_pluginApi.addScreenDataItem( "vis", {
		"elements": [],
		"element": null
	} );
	for( const screenData of g_pluginApi.getAllScreensData() ) {
		if( !screenData.vis ) {
			screenData.vis = {
				"elements": [],
				"element": null
			};
		}
	}

	g_pluginApi.addScreenCleanupFunction( cleanupScreen );

	const vis = api.vis || {};
	vis.window = g_Window.createWindow;
	vis.render = g_Compositor.render;
	api.vis = vis;
}

// Auto-register in IIFE mode
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "pi-vision",
		"version": "1.0.0",
		"description": "Retro character-cell windowing and controls for Pi.js",
		"init": piVisionPlugin
	} );
}

/**
 * Remove a deleted window from its parent's registry
 * 
 * @param {Object} screenData - Screen being removed
 * @returns {void}
 */
function cleanupScreen( screenData ) {
	if( !screenData.vis ) {
		return;
	}

	const record = screenData.vis.element;
	if( !record ) {
		return;
	}

	const screens = g_pluginApi.getAllScreensData();
	const parentData = screens.find( ( item ) => item.id === record.parentScreenId );
	if( !parentData ) {
		return;
	}

	parentData.vis.elements = parentData.vis.elements.filter( ( item ) => item !== record );
}
