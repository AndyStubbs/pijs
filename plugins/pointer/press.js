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
	const triggerEventListenersLocal = helpers.triggerEventListeners;

	// Expose trigger for other modules via module-level binding
	m_triggerEventListeners = triggerEventListenersLocal;

	pluginApi.addScreenDataItem( "onPressEventListeners", {} );
	pluginApi.addScreenDataItem( "onClickEventListeners", {} );

	pluginApi.addScreenInitFunction( initPressData );

	pluginApi.addCommand( "inpress", inpress, true, [] );
	pluginApi.addCommand(
		"onpress", onpress, true, [ "mode", "fn", "once", "hitBox", "customData" ]
	);
	pluginApi.addCommand( "offpress", offpress, true, [ "mode", "fn" ] );
	pluginApi.addCommand( "onclick", onclick, true, [ "fn", "once", "hitBox", "customData" ] );
	pluginApi.addCommand( "offclick", offclick, true, [ "fn" ] );

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
	function inpress( screenData ) {
		g_target.validatePointerTarget( screenData, "inpress" );
		g_mouse.startMouseInternal( screenData );
		g_touch.startTouchInternal( screenData );
		if( screenData.lastEvent === "touch" ) {
			return getTouchPress( screenData );
		} else {
			return screenData.api.inmouse();
		}
	}

	/**
	 * Register a combined mouse/touch press listener.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function onpress( screenData, options ) {
		g_target.validatePointerTarget( screenData, "onpress" );
		const mode = options.mode;
		const fn = options.fn;
		const once = options.once;
		const hitBox = options.hitBox;
		const customData = options.customData;

		onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onpress",
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
	function offpress( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;

		offevent(
			mode, fn, [ "down", "up", "move" ], "offpress",
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
	function onclick( screenData, options ) {
		g_target.validatePointerTarget( screenData, "onclick" );
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
			"click", fn, once, hitBox, [ "click" ], "onclick",
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
	function offclick( screenData, options ) {
		const fn = options.fn;
		offevent(
			"click", fn, [ "click" ], "offclick",
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

// Module-level reference to event trigger helper
let m_triggerEventListeners = null;

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
 * Dispatch a click event to active listeners on the screen.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} data - Pointer event data.
 * @param {string} clickStatus - Click status used to filter listeners.
 * @returns {void}
 */
export function triggerClickListeners( screenData, data, clickStatus ) {
	if( m_triggerEventListeners ) {
		m_triggerEventListeners( "click", data, screenData.onClickEventListeners, clickStatus );
	}
}

/**
 * Disarm every click listener on the screen, so a press the browser cancelled never clicks.
 *
 * @param {Object} screenData - Screen state.
 * @returns {void}
 */
export function cancelClickListeners( screenData ) {
	const listeners = screenData.onClickEventListeners.click;
	if( !listeners ) {
		return;
	}
	for( const listener of listeners ) {
		listener.clickDown = false;
	}
}

/**
 * Convert active or recently released touches into a press-state snapshot.
 *
 * @param {Object} screenData - Screen state.
 * @returns {Object}
 */
export function getTouchPress( screenData ) {
	function copyTouches( touches, touchArr, action ) {
		for( const i in touches ) {
			const touch = touches[ i ];
			const touchData = {
				"x": touch.x,
				"y": touch.y,
				"id": touch.id,
				"lastX": touch.lastX,
				"lastY": touch.lastY,
				"action": touch.action,
				"cancelled": touch.cancelled,
				"type": "touch"
			};
			if( action !== undefined ) {
				touchData.action = action;
			}
			touchArr.push( touchData );
		}
	}

	const touchArr = [];
	copyTouches( screenData.touches, touchArr );
	if( touchArr.length === 0 ) {
		copyTouches( screenData.lastTouches, touchArr, "up" );
	}
	if( touchArr.length > 0 ) {
		const touchData = touchArr[ 0 ];
		if( touchData.action === "up" ) {
			touchData.buttons = 0;
		} else {
			touchData.buttons = 1;
		}
		touchData.touches = touchArr;
		return touchData;
	} else {
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
}


