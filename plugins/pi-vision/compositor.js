/**
 * Pi Vision Element Compositor for Pi.js
 *
 * Traverses the ordered elements owned by a screen. Element records provide their own render
 * implementation so future non-window elements can use the same compositor.
 *
 * @module plugins/pi-vision/compositor
 */

"use strict";

let g_pluginApi = null;

export default { init, onRender, render };

/**
 * Initialize the element compositor
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
function init( pluginApi ) {
	g_pluginApi = pluginApi;
}

/**
 * Set or remove the render callback for the active base screen.
 *
 * @param {Function|null} fn - Callback receiving the active screen API
 * @returns {void}
 */
function onRender( fn ) {
	const screenData = g_pluginApi.getActiveScreen( "vis.onRender" );
	if( screenData.isOffscreen ) {
		const error = new TypeError( "vis.onRender: Active screen must be a base screen." );
		error.code = "INVALID_VIS_RENDER_TARGET";
		throw error;
	}
	if( fn !== null && typeof fn !== "function" ) {
		const error = new TypeError( "vis.onRender: Parameter fn must be a function or null." );
		error.code = "INVALID_VIS_RENDER_CALLBACK";
		throw error;
	}
	screenData.vis.onRender = fn;
}

/**
 * Render every element owned by the active screen
 *
 * @param {boolean} [recursive=true] - Whether container elements render their descendants
 * @returns {void}
 */
function render( recursive = true ) {
	if( typeof recursive !== "boolean" ) {
		const error = new TypeError( "vis.render: Parameter recursive must be a boolean." );
		error.code = "INVALID_VIS_RECURSIVE";
		throw error;
	}

	const screenData = g_pluginApi.getActiveScreen( "vis.render" );
	const interaction = screenData.vis.interaction;
	if( interaction && interaction.renderRequestId !== null ) {
		cancelAnimationFrame( interaction.renderRequestId );
		interaction.renderRequestId = null;
	}
	const activeId = screenData.id;
	try {
		screenData.api.cls();
		if( screenData.vis.onRender ) {
			screenData.vis.onRender( screenData.api );
		}
		renderElements( screenData.vis.elements, recursive );
	} finally {
		const activeData = g_pluginApi.getAllScreensData().find( ( item ) => item.id === activeId );
		if( activeData ) {
			g_pluginApi.getApi().setScreen( activeId );
		}
	}
}

/**
 * Render an ordered collection of element records
 *
 * @param {Array<Object>} elements - Element records
 * @param {boolean} recursive - Whether container elements render their descendants
 * @returns {void}
 */
function renderElements( elements, recursive ) {
	for( const element of [ ...elements ] ) {
		if( typeof element.render === "function" ) {
			element.render( recursive );
		}
	}
}
