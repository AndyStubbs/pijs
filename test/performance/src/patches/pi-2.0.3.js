/**
 * Pi.js 2.0.3 Performance Patch
 *
 * Gives each screen the view data that the polygons plugin reads to bound its fill spans.
 * Pi.js 2.0.3 has no view origin or clip, so the view always covers the whole screen.
 *
 * Loaded as a classic script after the Pi.js 2.0.3 core and before the polygons plugin.
 */

"use strict";

( function () {

	window.pi.registerPlugin( {
		"name": "performance-patch",
		"version": "1.0.0",
		"description": "Screen view data for the polygons plugin",
		"init": function ( pluginApi ) {
			pluginApi.addScreenInitFunction( addView );
		}
	} );

	/**
	 * Adds a full-screen view to a screen
	 *
	 * @param {Object} screenData - Screen data object
	 * @returns {void}
	 */
	function addView( screenData ) {
		if( screenData.view ) {
			return;
		}

		// The clip size reads the screen size on every use, so it follows a resized screen
		screenData.view = {
			"originX": 0,
			"originY": 0,
			"clipX": 0,
			"clipY": 0,
			get "clipWidth"() {
				return screenData.width;
			},
			get "clipHeight"() {
				return screenData.height;
			}
		};
	}

} )();
