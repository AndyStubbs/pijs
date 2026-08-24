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

export default { init, render };

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
	renderElements( screenData.vis.elements, recursive );
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
