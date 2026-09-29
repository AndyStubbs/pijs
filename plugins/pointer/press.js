/**
 * Press and Click registration for Pointer plugin.
 */

"use strict";

import * as g_target from "./target.js";
import * as g_mouse from "./mouse.js";
import * as g_touch from "./touch.js";

/**
 * Register combined mouse/touch press and click commands.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @param {Object} helpers - Shared pointer event helpers.
 * @returns {Object}
 */
export function registerPress( pluginApi, helpers ) {
	const onevent = helpers.onevent;
	const offevent = helpers.offevent;
	const removeAllListeners = helpers.removeAllListeners;

	// Expose the triggers for other modules via module-level bindings
	m_triggerEventListeners = helpers.triggerEventListeners;
	m_triggerClickListeners = helpers.triggerClickListeners;


	// The latest press data, or null before the first event and while its input is stopped
	pluginApi.addScreenDataItem( "press", null );
	pluginApi.addScreenDataItem( "onPressEventListeners", {} );
	pluginApi.addScreenDataItem( "onClickEventListeners", {} );

	pluginApi.addScreenInitFunction( initPressData );

	pluginApi.addCommand( "inPress", inPress, true, [] );
	pluginApi.addCommand(
		"onPress", onPress, true, [ "mode", "fn", "once", "hitBox", "customData" ]
	);
	pluginApi.addCommand( "offPress", offPress, true, [ "mode", "fn" ] );
	pluginApi.addCommand( "onClick", onClick, true, [ "fn", "once", "hitBox", "customData" ] );
	pluginApi.addCommand( "offClick", offClick, true, [ "fn" ] );

	function initPressData( screenData ) {
		screenData.onPressEventListeners = {
			"down": [],
			"up": [],
			"move": []
		};
		screenData.onClickEventListeners = {
			"click": []
		};
	}

	/**
	 * Read the latest press data, from the mouse or the touches: the frozen object of the last
	 * event, or null before the first event and while the input it came from is stopped.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {Object|null}
	 */
	function inPress( screenData ) {
		g_target.validatePointerTarget( screenData, "inPress" );
		g_mouse.startMouseInternal( screenData );
		g_touch.startTouchInternal( screenData );
		return screenData.press;
	}

	/**
	 * Register a combined mouse/touch press listener.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function onPress( screenData, options ) {
		g_target.validatePointerTarget( screenData, "onPress" );
		const mode = options.mode;
		const fn = options.fn;
		const once = options.once;
		const hitBox = options.hitBox;
		const customData = options.customData;

		onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onPress",
			screenData.onPressEventListeners, customData
		);
		g_mouse.startMouseInternal( screenData );
		g_touch.startTouchInternal( screenData );
	}

	/**
	 * Remove matching combined press listeners: by mode and function, every handler of a mode, or
	 * a function from every mode.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function offPress( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;

		offevent(
			mode, fn, [ "down", "up", "move" ], "offPress",
			screenData.onPressEventListeners, "press"
		);
	}

	/**
	 * Register a click listener with optional hit-box filtering.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function onClick( screenData, options ) {
		g_target.validatePointerTarget( screenData, "onClick" );
		const fn = options.fn;
		const once = options.once;
		let hitBox = options.hitBox;
		const customData = options.customData;

		if( hitBox == null ) {
			hitBox = {
				"x": 0,
				"y": 0,
				"width": screenData.width,
				"height": screenData.height
			};
		}

		onevent(
			"click", fn, once, hitBox, [ "click" ], "onClick",
			screenData.onClickEventListeners, customData
		);
		g_mouse.startMouseInternal( screenData );
		g_touch.startTouchInternal( screenData );
	}

	/**
	 * Remove matching click listeners. Click has one mode, so without a function every click
	 * handler of the screen is removed.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function offClick( screenData, options ) {
		const fn = options.fn;
		offevent(
			"click", fn, [ "click" ], "offClick",
			screenData.onClickEventListeners, "press"
		);
	}

	function clearPressEvents( screenData ) {
		removeAllListeners( screenData.onPressEventListeners );
		screenData.onPressEventListeners = {};
	}

	function clearClickEvents( screenData ) {
		removeAllListeners( screenData.onClickEventListeners );
		screenData.onClickEventListeners = {};
	}

	return {
		"clearPressEvents": clearPressEvents,
		"clearClickEvents": clearClickEvents
	};
}

// Module-level references to the event trigger helpers
let m_triggerEventListeners = null;
let m_triggerClickListeners = null;

/**
 * Dispatch a press event to active listeners on the screen.
 *
 * @param {Object} screenData - Screen state.
 * @param {string} mode - Pointer event mode.
 * @param {Object} data - Pointer event data.
 * @returns {void}
 */
export function triggerPressListeners( screenData, mode, data ) {
	if( m_triggerEventListeners ) {
		m_triggerEventListeners( mode, data, screenData.onPressEventListeners );
	}
}

/**
 * Update the screen's click listeners for one pointer: a primary-button down arms, its release
 * fires inside the hit box, and any other release or a cancel disarms. Click data is the
 * release's pointer data with `action: "click"`.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} data - Pointer data of the down or release.
 * @param {string} action - `"down"`, `"up"`, or `"cancel"`.
 * @param {string|number} pointerId - `"mouse"`, or the touch identifier.
 * @returns {void}
 */
export function triggerClickListeners( screenData, data, action, pointerId ) {
	if( m_triggerClickListeners ) {
		if( action === "up" ) {
			data = g_target.createPointerData( { ...data, "action": "click" } );
		}
		m_triggerClickListeners( data, screenData.onClickEventListeners, action, pointerId );
	}
}

// Mouse press data has no touches
const NO_TOUCHES = Object.freeze( [] );

/**
 * Build frozen mouse press data: the mouse data with an empty `touches`.
 *
 * @param {Object} mouseData - Mouse data.
 * @returns {Object}
 */
export function getMousePress( mouseData ) {
	return Object.freeze( { ...mouseData, "touches": NO_TOUCHES } );
}

/**
 * Build frozen touch press data: the primary touch while it is down, then its release.
 * `touches` is the screen's frozen list of the touches still down, as separate objects, so the
 * data serializes.
 *
 * @param {Object} screenData - Screen state, with a touch press.
 * @returns {Object}
 */
export function getTouchPress( screenData ) {
	return Object.freeze( { ...screenData.touchPress, "touches": screenData.touchList } );
}


