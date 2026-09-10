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
	const triggerEventListenersLocal = helpers.triggerEventListeners;

	// Expose trigger for other modules via module-level binding
	m_triggerEventListeners = triggerEventListenersLocal;

	pluginApi.addScreenDataItem( "pressEventListenersActive", 0 );
	pluginApi.addScreenDataItem( "onPressEventListeners", {} );
	pluginApi.addScreenDataItem( "clickEventListenersActive", 0 );
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

		const isValid = onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onpress",
			screenData.onPressEventListeners, null, null, customData
		);

		if( isValid ) {
			g_mouse.startMouseInternal( screenData );
			g_touch.startTouchInternal( screenData );
			screenData.pressEventListenersActive += 1;
		}
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

		const isValid = offevent(
			mode, fn, [ "down", "up", "move" ], "offpress",
			screenData.onPressEventListeners
		);

		if( isValid ) {
			if( fn == null ) {
				screenData.pressEventListenersActive = 0;
			} else {
				screenData.pressEventListenersActive -= 1;
				if( screenData.pressEventListenersActive < 0 ) {
					screenData.pressEventListenersActive = 0;
				}
			}
		}
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

		const isValid = onevent(
			"click", fn, once, hitBox, [ "click" ], "onclick",
			screenData.onClickEventListeners, null, null, customData
		);

		if( isValid ) {
			g_mouse.startMouseInternal( screenData );
			g_touch.startTouchInternal( screenData );
			screenData.clickEventListenersActive += 1;
		}
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
		const isValid = offevent(
			"click", fn, [ "click" ], "offclick",
			screenData.onClickEventListeners
		);

		if( isValid ) {
			if( fn == null ) {
				screenData.clickEventListenersActive = 0;
			} else {
				screenData.clickEventListenersActive -= 1;
				if( screenData.clickEventListenersActive < 0 ) {
					screenData.clickEventListenersActive = 0;
				}
			}
		}
	}

	function clearPressEvents( screenData ) {
		screenData.onPressEventListeners = {};
		screenData.pressEventListenersActive = 0;
	}

	function clearClickEvents( screenData ) {
		screenData.onClickEventListeners = {};
		screenData.clickEventListenersActive = 0;
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
	if( screenData.pressEventListenersActive > 0 && m_triggerEventListeners ) {
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
	if( screenData.clickEventListenersActive > 0 && m_triggerEventListeners ) {
		m_triggerEventListeners( "click", data, screenData.onClickEventListeners, clickStatus );
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
			"type": "touch"
		};
	}
}


