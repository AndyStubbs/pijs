/**
 * Wheel registration for Pointer plugin. A screen's canvas has a wheel listener only while the
 * screen has wheel handlers, and the listener keeps the page from scrolling with the wheel over
 * the canvas.
 *
 * @module plugins/pointer/wheel
 */

"use strict";

import * as g_target from "./target.js";

// `WheelEvent.deltaMode` values
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

// Pixels per line for wheel events that report lines
const LINE_HEIGHT = 16;

/**
 * Register wheel commands and screen state.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @param {Object} helpers - Shared pointer event helpers.
 * @returns {Object}
 */
export function registerWheel( pluginApi, helpers ) {
	const m_onevent = helpers.onevent;
	const m_offevent = helpers.offevent;
	const m_removeAllListeners = helpers.removeAllListeners;
	const m_triggerEventListeners = helpers.triggerEventListeners;

	pluginApi.addScreenDataItem( "onWheelEventListeners", {} );
	pluginApi.addScreenDataItem( "isWheelListening", false );

	pluginApi.addCommand( "onWheel", onWheel, true, [ "fn", "once", "hitBox", "customData" ] );
	pluginApi.addCommand( "offWheel", offWheel, true, [ "fn" ] );

	/**
	 * Register a wheel handler with optional hit-box filtering.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function onWheel( screenData, options ) {
		g_target.validatePointerTarget( screenData, "onWheel" );
		m_onevent(
			"wheel", options.fn, options.once, options.hitBox, [ "wheel" ], "onWheel",
			screenData.onWheelEventListeners, options.customData
		);
		updateListener( screenData );
	}

	/**
	 * Remove a wheel handler, or every wheel handler of the screen without a function.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function offWheel( screenData, options ) {
		m_offevent(
			"wheel", options.fn, [ "wheel" ], "offWheel", screenData.onWheelEventListeners,
			"wheel"
		);
		updateListener( screenData );
	}

	/**
	 * Clear the wheel handlers of a screen, for clearEvents( "wheel" ) and screen removal.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function clearWheelEvents( screenData ) {
		m_removeAllListeners( screenData.onWheelEventListeners );
		screenData.onWheelEventListeners = {};
		updateListener( screenData );
	}

	/**
	 * Add the canvas wheel listener while the screen has wheel handlers, and remove it when it
	 * has none, so the page scrolls again. The listener is not passive, so it can prevent the
	 * scroll.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function updateListener( screenData ) {
		const hasHandlers = screenData.onWheelEventListeners.wheel !== undefined;
		if( hasHandlers && !screenData.isWheelListening ) {
			screenData.canvas.addEventListener( "wheel", onWheelEvent, { "passive": false } );
			screenData.isWheelListening = true;
		} else if( !hasHandlers && screenData.isWheelListening ) {
			screenData.canvas.removeEventListener( "wheel", onWheelEvent, { "passive": false } );
			screenData.isWheelListening = false;
		}
	}

	/**
	 * Dispatch a wheel event over a canvas with handlers, and keep the page from scrolling. A
	 * `once` handler removes itself, so the listener is updated after the dispatch, unless a
	 * handler removed the screen, whose cleanup already removed the listener.
	 *
	 * @param {WheelEvent} e - The wheel event.
	 * @returns {void}
	 */
	function onWheelEvent( e ) {
		const screenId = e.target.dataset?.screenId;
		if( screenId === undefined ) {
			return;
		}
		const screenData = pluginApi.getScreenData( "pointer-event", screenId );
		if( !screenData ) {
			return;
		}
		if( screenData.onWheelEventListeners.wheel === undefined ) {
			updateListener( screenData );
			return;
		}
		e.preventDefault();
		const position = g_target.pointerPosition( screenData, e );
		if( position === null ) {
			return;
		}
		const scale = getDeltaScale( e.deltaMode );
		const data = Object.freeze( {
			"x": position.x,
			"y": position.y,
			"deltaX": e.deltaX * scale.x,
			"deltaY": e.deltaY * scale.y
		} );
		m_triggerEventListeners( "wheel", data, screenData.onWheelEventListeners );
		if( !screenData.isRemoved ) {
			updateListener( screenData );
		}
	}

	return {
		"clearWheelEvents": clearWheelEvents
	};
}

/**
 * The factors that turn wheel deltas into CSS pixels: 1 for pixels, the line height for lines,
 * and the window size for pages.
 *
 * @param {number} deltaMode - `WheelEvent.deltaMode`.
 * @returns {{x: number, y: number}}
 */
function getDeltaScale( deltaMode ) {
	if( deltaMode === DOM_DELTA_LINE ) {
		return { "x": LINE_HEIGHT, "y": LINE_HEIGHT };
	}
	if( deltaMode === DOM_DELTA_PAGE ) {
		return { "x": window.innerWidth, "y": window.innerHeight };
	}
	return { "x": 1, "y": 1 };
}
