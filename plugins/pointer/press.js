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
	 * Read the most recent mouse or touch press state.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {Object}
	 */
	function inPress( screenData ) {
		g_target.validatePointerTarget( screenData, "inPress" );
		g_mouse.startMouseInternal( screenData );
		g_touch.startTouchInternal( screenData );
		if( screenData.lastEvent === "touch" ) {
			return getTouchPress( screenData );
		} else {
			return screenData.api.inMouse();
		}
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
			screenData.onPressEventListeners, null, null, customData
		);
		g_mouse.startMouseInternal( screenData );
		g_touch.startTouchInternal( screenData );
	}

	/**
	 * Remove matching combined press listeners.
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
			screenData.onPressEventListeners
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
			screenData.onClickEventListeners, null, null, customData
		);
		g_mouse.startMouseInternal( screenData );
		g_touch.startTouchInternal( screenData );
	}

	/**
	 * Remove matching click listeners.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function offClick( screenData, options ) {
		const fn = options.fn;
		offevent(
			"click", fn, [ "click" ], "offClick",
			screenData.onClickEventListeners
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
 * fires inside the hit box, and any other release or a cancel disarms.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} data - Pointer data; for `"up"`, the click data.
 * @param {string} action - `"down"`, `"up"`, or `"cancel"`.
 * @param {string|number} pointerId - `"mouse"`, or the touch identifier.
 * @returns {void}
 */
export function triggerClickListeners( screenData, data, action, pointerId ) {
	if( m_triggerClickListeners ) {
		m_triggerClickListeners( data, screenData.onClickEventListeners, action, pointerId );
	}
}

/**
 * Build touch press data: the primary touch while it is down, then its release. `touches` holds
 * the press itself followed by the other touches still down.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} [record] - Touch fields and `buttons`; the screen's touch press by default.
 *   Click data passes the released touch.
 * @returns {Object}
 */
export function getTouchPress( screenData, record = screenData.touchPress ) {
	if( record === null ) {
		return {
			"x": -1,
			"y": -1,
			"id": -1,
			"lastX": -1,
			"lastY": -1,
			"action": "none",
			"buttons": 0,
			"cancelled": false,
			"type": "touch"
		};
	}
	const press = {
		"x": record.x,
		"y": record.y,
		"id": record.id,
		"lastX": record.lastX,
		"lastY": record.lastY,
		"action": record.action,
		"cancelled": record.cancelled,
		"type": "touch",
		"buttons": record.buttons
	};
	const touches = [ press ];
	for( const id in screenData.touches ) {
		const touch = screenData.touches[ id ];
		if( touch.id !== record.id ) {
			touches.push( {
				"x": touch.x,
				"y": touch.y,
				"id": touch.id,
				"lastX": touch.lastX,
				"lastY": touch.lastY,
				"action": touch.action,
				"cancelled": touch.cancelled,
				"type": "touch"
			} );
		}
	}
	press.touches = touches;
	return press;
}


