/**
 * Pi Vision Plugin for Pi.js
 *
 * Provides retro, character-cell-based windows under the $.vis namespace.
 *
 * @module plugins/pi-vision
 * @version 1.0.0
 */

"use strict";

import * as g_window from "./window.js";
import * as g_compositor from "./compositor.js";

let m_pluginApi = null;

/**
 * Initialize the Pi Vision plugin
 *
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 * @returns {void}
 */
export default function piVisionPlugin( pluginApi ) {
	m_pluginApi = pluginApi;

	// Setup API's
	const api = m_pluginApi.getApi();
	m_pluginApi.addScreenDataItem( "vis", {
		"elements": [],
		"element": null,
		"interaction": null,
		"onRender": null
	} );
	for( const screenData of m_pluginApi.getAllScreensData() ) {
		if( !screenData.vis ) {
			screenData.vis = {
				"elements": [],
				"element": null,
				"interaction": null,
				"onRender": null
			};
		}
	}

	// Initialize components after existing screens have Pi Vision state.
	g_window.default.init( m_pluginApi );
	g_compositor.default.init( m_pluginApi );

	m_pluginApi.addScreenCleanupFunction( cleanupScreen );

	const vis = api.vis || {};
	vis.window = g_window.default.createWindow;
	vis.render = g_compositor.default.render;
	vis.onRender = g_compositor.default.onRender;
	api.vis = vis;
}

// Auto-register in IIFE mode
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "pi-vision",
		"version": "1.0.0",
		"description": "Retro character-cell windowing and controls for Pi.js",
		"dependencies": [ "pointer" ],
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
	if(
		screenData.vis.interaction && screenData.vis.interaction.renderRequestId !== null
	) {
		cancelAnimationFrame( screenData.vis.interaction.renderRequestId );
		screenData.vis.interaction.renderRequestId = null;
	}
	for( const element of [ ...screenData.vis.elements ].reverse() ) {
		if( element.type === "window" ) {
			element.beforeClose = null;
			element.screen.removeScreen();
		}
	}

	const record = screenData.vis.element;
	if( !record ) {
		return;
	}

	const screens = m_pluginApi.getAllScreensData();
	const parentData = screens.find( ( item ) => item.id === record.parentScreenId );
	if( !parentData ) {
		return;
	}

	parentData.vis.elements = parentData.vis.elements.filter( ( item ) => item !== record );
}
