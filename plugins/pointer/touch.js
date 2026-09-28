/**
 * Touch registration for Pointer plugin.
 */

"use strict";

import * as g_target from "./target.js";
import * as g_press from "./press.js";

// Module-level reference to startTouchInternal function
let m_startTouchInternal = null;

/**
 * Start touch tracking through the registered touch implementation.
 *
 * @param {Object} screenData - Screen state.
 * @returns {void}
 */
export function startTouchInternal( screenData ) {
	if( m_startTouchInternal ) {
		m_startTouchInternal( screenData );
	}
}

/**
 * Register touch commands, screen state, and focus handling.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @param {Object} helpers - Shared pointer event helpers.
 * @returns {Object}
 */
export function registerTouch( pluginApi, helpers ) {

	const m_onevent = helpers.onevent;
	const m_offevent = helpers.offevent;
	const m_removeAllListeners = helpers.removeAllListeners;
	const m_triggerEventListeners = helpers.triggerEventListeners;

	pluginApi.addScreenDataItem( "touchStopped", false );
	pluginApi.addScreenDataItem( "touchStarted", false );
	pluginApi.addScreenDataItem( "touches", {} );
	pluginApi.addScreenDataItem( "lastTouches", {} );
	pluginApi.addScreenDataItem( "onTouchEventListeners", {} );

	pluginApi.addScreenInitFunction( initTouchData );
	window.addEventListener( "blur", onWindowBlurTouch );

	pluginApi.addCommand( "startTouch", startTouch, true, [] );
	pluginApi.addCommand( "stopTouch", stopTouch, true, [] );
	pluginApi.addCommand( "intouch", intouch, true, [] );
	pluginApi.addCommand(
		"ontouch", ontouch, true, [ "mode", "fn", "once", "hitBox", "customData" ]
	);
	pluginApi.addCommand( "offtouch", offtouch, true, [ "mode", "fn" ] );
	pluginApi.addCommand( "setPinchZoom", setPinchZoom, false, [ "isEnabled" ] );

	function initTouchData( screenData ) {
		screenData.onTouchEventListeners = {
			"start": [],
			"end": [],
			"move": []
		};
	}

	function startTouchInternal( screenData ) {
		if( !screenData.touchStopped ) {
			startTouch( screenData );
		}
	}

	// Store reference for module-level export
	m_startTouchInternal = startTouchInternal;

	/**
	 * Start tracking touch events on the screen.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function startTouch( screenData ) {
		g_target.validatePointerTarget( screenData, "startTouch" );

		// Clear explicit touch stopped
		screenData.touchStopped = false;

		if( !screenData.touchStarted ) {
			const options = { "passive": false };
			screenData.canvas.addEventListener( "touchstart", touchStart, options );
			screenData.canvas.addEventListener( "touchmove", touchMove, options );
			screenData.canvas.addEventListener( "touchend", touchEnd, options );
			screenData.canvas.addEventListener( "touchcancel", touchCancel, options );
			screenData.touchStarted = true;
		}
	}

	/**
	 * Stop tracking touch events and reset the screen touch state.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function stopTouch( screenData ) {

		//Clear explicit touchStopped
		screenData.touchStopped = true;

		if( screenData.touchStarted ) {
			screenData.canvas.removeEventListener( "touchstart", touchStart );
			screenData.canvas.removeEventListener( "touchmove", touchMove );
			screenData.canvas.removeEventListener( "touchend", touchEnd );
			screenData.canvas.removeEventListener( "touchcancel", touchCancel );
			screenData.touchStarted = false;
		}
	}

	/**
	 * Read the screen touch state.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {Array<Object>}
	 */
	function intouch( screenData ) {
		g_target.validatePointerTarget( screenData, "intouch" );
		startTouchInternal( screenData );
		return getTouch( screenData );
	}

	/**
	 * Register a touch listener with optional hit-box filtering.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function ontouch( screenData, options ) {
		g_target.validatePointerTarget( screenData, "ontouch" );
		const mode = options.mode;
		const fn = options.fn;
		const once = options.once;
		const hitBox = options.hitBox;
		const customData = options.customData;

		m_onevent(
			mode, fn, once, hitBox, [ "start", "end", "move" ], "ontouch",
			screenData.onTouchEventListeners, null, null, customData
		);
		startTouchInternal( screenData );
	}

	/**
	 * Remove matching touch listeners.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function offtouch( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;

		m_offevent(
			mode, fn, [ "start", "end", "move" ], "offtouch",
			screenData.onTouchEventListeners
		);
	}

	/**
	 * Enable or suppress browser pinch zoom.
	 *
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function setPinchZoom( options ) {
		const isEnabled = !!( options.isEnabled );
		if( isEnabled ) {
			document.body.style.touchAction = "";
		} else {
			document.body.style.touchAction = "none";
		}
	}

	function touchStart( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( screenData == null ) {
			return;
		}
		const changed = updateTouch( screenData, e, "start", false );

		// Suppress browser gestures and compatibility mouse events before any handler runs
		e.preventDefault();
		m_triggerEventListeners( "start", changed, screenData.onTouchEventListeners );
		g_press.triggerPressListeners( screenData, "down", g_press.getTouchPress( screenData ) );
		g_press.triggerClickListeners( screenData, g_press.getTouchPress( screenData ), "down" );
	}

	function touchMove( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( screenData == null ) {
			return;
		}
		const changed = updateTouch( screenData, e, "move", false );
		m_triggerEventListeners( "move", changed, screenData.onTouchEventListeners );
		g_press.triggerPressListeners( screenData, "move", g_press.getTouchPress( screenData ) );
	}

	function touchEnd( e ) {
		endTouches( e, false );
	}

	function touchCancel( e ) {
		endTouches( e, true );
	}

	/**
	 * Release the touches an event ended. A cancelled touch, one the browser took over, is
	 * released with `cancelled: true` and never clicks.
	 *
	 * @param {TouchEvent} e - The `touchend` or `touchcancel` event.
	 * @param {boolean} isCancelled - Whether the browser cancelled the touches.
	 * @returns {void}
	 */
	function endTouches( e, isCancelled ) {
		const screenData = getScreenDataFromEvent( e );
		if( screenData == null ) {
			return;
		}
		const changed = updateTouch( screenData, e, "end", isCancelled );
		m_triggerEventListeners( "end", changed, screenData.onTouchEventListeners );
		const pressData = g_press.getTouchPress( screenData );
		if( isCancelled ) {
			pressData.cancelled = true;
			g_press.triggerPressListeners( screenData, "up", pressData );
			g_press.cancelClickListeners( screenData );
		} else {
			g_press.triggerPressListeners( screenData, "up", pressData );
			g_press.triggerClickListeners( screenData, g_press.getTouchPress( screenData ), "up" );
		}
	}

	/**
	 * Apply the touches an event changed. Other touches keep their state and action, and an
	 * ended touch is reported at the position where it lifted, then removed. `lastTouches`
	 * keeps every touch of the event, including ended ones, for the press that follows the last
	 * touch's release.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {TouchEvent} e - Touch event.
	 * @param {string} action - `"start"`, `"move"`, or `"end"`.
	 * @param {boolean} isCancelled - Whether the browser cancelled the touches.
	 * @returns {Array<Object>} Copies of the changed touches, in event order.
	 */
	function updateTouch( screenData, e, action, isCancelled ) {
		const eventTouches = {};
		for( const id in screenData.touches ) {
			eventTouches[ id ] = screenData.touches[ id ];
		}
		const newTouches = {};
		const changed = [];
		for( let j = 0; j < e.changedTouches.length; j++ ) {
			const touch = e.changedTouches[ j ];
			const previous = screenData.touches[ touch.identifier ];
			let position = g_target.pointerPosition( screenData, touch );
			if( !position ) {
				if( !previous ) {
					continue;
				}
				position = previous;
			}
			const touchData = {
				"x": position.x,
				"y": position.y,
				"id": touch.identifier,
				"lastX": null,
				"lastY": null,
				"action": action,
				"cancelled": isCancelled
			};
			if( previous ) {
				touchData.lastX = previous.x;
				touchData.lastY = previous.y;
			}
			eventTouches[ touchData.id ] = touchData;
			changed.push( copyTouch( touchData ) );
		}
		for( const id in eventTouches ) {
			if( eventTouches[ id ].action !== "end" ) {
				newTouches[ id ] = eventTouches[ id ];
			}
		}

		screenData.lastTouches = eventTouches;
		screenData.touches = newTouches;
		screenData.lastEvent = "touch";
		return changed;
	}

	function copyTouch( touch ) {
		return {
			"x": touch.x,
			"y": touch.y,
			"id": touch.id,
			"lastX": touch.lastX,
			"lastY": touch.lastY,
			"action": touch.action,
			"cancelled": touch.cancelled,
			"type": "touch"
		};
	}

	function getTouch( screenData ) {
		const touchArr = [];
		for( const i in screenData.touches ) {
			touchArr.push( copyTouch( screenData.touches[ i ] ) );
		}
		return touchArr;
	}

	function getScreenDataFromEvent( e ) {
		const screenId = e.target.dataset?.screenId;
		if( screenId === undefined ) {
			return null;
		}
		return pluginApi.getScreenData( "touch-event", screenId );
	}

	function onWindowBlurTouch() {
		const allScreensData = pluginApi.getAllScreensData();
		for( const screenData of allScreensData ) {
			screenData.lastTouches = screenData.touches;
			screenData.touches = {};
		}
	}

	function clearTouchEvents( screenData ) {
		m_removeAllListeners( screenData.onTouchEventListeners );
		screenData.onTouchEventListeners = {};
	}

	return {
		"stopTouch": stopTouch,
		"clearTouchEvents": clearTouchEvents
	};
}


