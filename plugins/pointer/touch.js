/**
 * Touch registration for Pointer plugin. Touch commands observe touch pointers through the shared
 * Pointer Events listeners; each pointer is one touch, identified by its `pointerId`.
 */

"use strict";

import * as g_target from "./target.js";
import * as g_press from "./press.js";
import * as g_listeners from "./listeners.js";

// Module-level reference to startTouchInternal function
let m_startTouchInternal = null;

// The touch list with no touch down
const NO_TOUCHES = Object.freeze( [] );

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

	// The page-visibility listener is added when tracking first starts, not at plugin load
	let m_isVisibilityListening = false;

	// The canvas `touch-action` before touch tracking set it, restored when tracking stops
	// unless setPinchZoom() set it since
	const m_touchActions = new WeakMap();

	pluginApi.addScreenDataItem( "touchStopped", false );
	pluginApi.addScreenDataItem( "touchStarted", false );
	pluginApi.addScreenDataItem( "touches", {} );

	// The frozen list inTouch() returns, replaced when a touch changes; set at screen init,
	// since screen data items are copied without their freeze
	pluginApi.addScreenDataItem( "touchList", null );
	pluginApi.addScreenDataItem( "primaryTouchId", null );

	// The setPinchZoom() setting, or null while the screen has none
	pluginApi.addScreenDataItem( "isPinchZoomEnabled", null );
	pluginApi.addScreenDataItem( "touchPress", null );
	pluginApi.addScreenDataItem( "onTouchEventListeners", {} );

	pluginApi.addScreenInitFunction( initTouchData );

	pluginApi.addCommand( "startTouch", startTouch, true, [] );
	pluginApi.addCommand( "stopTouch", stopTouch, true, [] );
	pluginApi.addCommand( "inTouch", inTouch, true, [] );
	pluginApi.addCommand(
		"onTouch", onTouch, true, [ "mode", "fn", "once", "hitBox", "customData" ]
	);
	pluginApi.addCommand( "offTouch", offTouch, true, [ "mode", "fn" ] );
	pluginApi.addCommand( "setPinchZoom", setPinchZoom, true, [ "isEnabled" ] );

	function initTouchData( screenData ) {
		screenData.touchList = NO_TOUCHES;
		screenData.onTouchEventListeners = {
			"down": [],
			"up": [],
			"move": []
		};
	}

	g_listeners.setHandlers( "touch", {
		"pointerdown": touchStart,
		"pointermove": touchMove,
		"pointerup": ( screenData, e ) => endTouches( screenData, e, false ),
		"pointercancel": ( screenData, e ) => endTouches( screenData, e, true )
	}, getScreenDataFromEvent );

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

		if( !m_isVisibilityListening ) {
			document.addEventListener( "visibilitychange", onVisibilityChangeTouch );
			m_isVisibilityListening = true;
		}
		if( !screenData.touchStarted ) {

			// The browser keeps touches on the canvas for the page instead of scrolling or
			// zooming with them, unless setPinchZoom() already set the canvas
			if( screenData.isPinchZoomEnabled === null ) {
				m_touchActions.set( screenData, screenData.canvas.style.touchAction );
				screenData.canvas.style.touchAction = "none";
			}
			g_listeners.track( screenData, "touch" );
			screenData.touchStarted = true;
		}
	}

	/**
	 * Stop tracking touch events. Held touches are released first, through the `"up"`
	 * handlers with `cancelled: true`; then a press read that came from touch returns null.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function stopTouch( screenData ) {
		releaseHeldTouches( screenData );
		screenData.touchPress = null;
		if( screenData.press !== null && screenData.press.type === "touch" ) {
			screenData.press = null;
		}

		//Clear explicit touchStopped
		screenData.touchStopped = true;

		if( screenData.touchStarted ) {
			g_listeners.untrack( screenData, "touch" );
			if( m_touchActions.has( screenData ) ) {
				screenData.canvas.style.touchAction = m_touchActions.get( screenData );
				m_touchActions.delete( screenData );
			}
			screenData.touchStarted = false;
		}
	}

	/**
	 * Read the touches down: a frozen array, the same one until a touch changes, whose objects
	 * are the ones the touch handlers received.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {Array<Object>}
	 */
	function inTouch( screenData ) {
		g_target.validatePointerTarget( screenData, "inTouch" );
		startTouchInternal( screenData );
		return screenData.touchList;
	}

	/**
	 * Register a touch listener with optional hit-box filtering.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function onTouch( screenData, options ) {
		g_target.validatePointerTarget( screenData, "onTouch" );
		const mode = options.mode;
		const fn = options.fn;
		const once = options.once;
		const hitBox = options.hitBox;
		const customData = options.customData;

		checkRenamedMode( mode, "onTouch" );
		m_onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onTouch",
			screenData.onTouchEventListeners, customData
		);
		startTouchInternal( screenData );
	}

	/**
	 * Remove matching touch listeners: by mode and function, every handler of a mode, or a
	 * function from every mode.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function offTouch( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;

		checkRenamedMode( mode, "offTouch" );
		m_offevent(
			mode, fn, [ "down", "up", "move" ], "offTouch",
			screenData.onTouchEventListeners, "touch"
		);
	}

	/**
	 * Name the new mode for a touch mode that was renamed (I3).
	 *
	 * @param {*} mode - Requested mode.
	 * @param {string} command - Command name for the message.
	 * @returns {void}
	 */
	function checkRenamedMode( mode, command ) {
		const renamed = { "start": "down", "end": "up" };
		if( mode === "start" || mode === "end" ) {
			const error = new Error(
				`${command}: mode "${mode}" is now "${renamed[ mode ]}"; touch modes are ` +
				"down, up, and move."
			);
			error.code = "INVALID_MODE";
			throw error;
		}
	}

	/**
	 * Enable or suppress browser pinch zoom on the screen's canvas, at any time, through its
	 * `touch-action`: `"pinch-zoom"` lets a pinch that starts on the canvas zoom the page, and
	 * `"none"` keeps every touch on the canvas for the screen. The setting replaces the value
	 * touch tracking sets and restores, and does not start tracking.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function setPinchZoom( screenData, options ) {
		g_target.validatePointerTarget( screenData, "setPinchZoom" );
		const isEnabled = !!( options.isEnabled );
		screenData.isPinchZoomEnabled = isEnabled;
		m_touchActions.delete( screenData );
		if( isEnabled ) {
			screenData.canvas.style.touchAction = "pinch-zoom";
		} else {
			screenData.canvas.style.touchAction = "none";
		}
	}

	/**
	 * A touch starts. A touch that starts on the canvas border or padding is ignored.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {PointerEvent} e - The `pointerdown` event.
	 * @returns {boolean} Whether the touch was accepted, so its pointer is captured.
	 */
	function touchStart( screenData, e ) {
		let isIdle = true;
		for( const id in screenData.touches ) {
			isIdle = false;
			break;
		}
		const changed = updateTouch( screenData, e, "down", false );

		// A touch is primary when it starts with no other touch down, as in Pointer Events
		if( isIdle && changed.length > 0 ) {
			screenData.primaryTouchId = changed[ 0 ].id;
		}
		if( changed.length === 0 ) {
			return false;
		}
		const primary = findTouch( changed, screenData.primaryTouchId );
		if( primary ) {
			setTouchPress( screenData, primary, primary.action, 1 );
		}
		updatePress( screenData );
		m_triggerEventListeners( "down", changed, screenData.onTouchEventListeners );
		if( primary ) {
			g_press.triggerPressListeners( screenData, "down", screenData.press );
		}
		for( const touch of changed ) {
			g_press.triggerClickListeners( screenData, touch, "down", touch.id );
		}
		return true;
	}

	function touchMove( screenData, e ) {
		const changed = updateTouch( screenData, e, "move", false );
		if( changed.length === 0 ) {
			return;
		}
		const primary = findTouch( changed, screenData.primaryTouchId );
		if( primary ) {
			setTouchPress( screenData, primary, primary.action, 1 );
		}
		updatePress( screenData );
		m_triggerEventListeners( "move", changed, screenData.onTouchEventListeners );
		if( primary ) {
			g_press.triggerPressListeners( screenData, "move", screenData.press );
		}
	}

	/**
	 * Release the touch an event ended. The primary touch releases the press. A cancelled
	 * touch, one the browser took over, is released with `cancelled: true` and never clicks.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {PointerEvent} e - The `pointerup` or `pointercancel` event.
	 * @param {boolean} isCancelled - Whether the browser cancelled the touch.
	 * @returns {void}
	 */
	function endTouches( screenData, e, isCancelled ) {
		const changed = updateTouch( screenData, e, "up", isCancelled );
		dispatchTouchRelease( screenData, changed, isCancelled );
	}

	/**
	 * Release every held touch of a screen that the player did not release: the page was
	 * hidden or tracking stopped. Each touch ends where it was last seen, with
	 * `cancelled: true`, and never clicks.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function releaseHeldTouches( screenData ) {
		const changed = [];
		for( const id in screenData.touches ) {
			const touch = screenData.touches[ id ];
			changed.push( g_target.createPointerData( {
				...touch, "lastX": touch.x, "lastY": touch.y, "buttons": 0, "action": "up",
				"cancelled": true
			} ) );
		}
		if( changed.length === 0 ) {
			return;
		}
		screenData.touches = {};
		screenData.touchList = NO_TOUCHES;
		dispatchTouchRelease( screenData, Object.freeze( changed ), true );
	}

	/**
	 * Dispatch the release of ended touches, whose state is already removed: the `"up"`
	 * handlers, the press release if the primary touch ended, and the clicks.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Array<Object>} changed - The ended touches.
	 * @param {boolean} isCancelled - Whether the release was cancelled.
	 * @returns {void}
	 */
	function dispatchTouchRelease( screenData, changed, isCancelled ) {
		if( changed.length === 0 ) {
			return;
		}
		const primary = findTouch( changed, screenData.primaryTouchId );
		if( primary ) {
			setTouchPress( screenData, primary, "up", 0 );
			screenData.primaryTouchId = null;
		}
		updatePress( screenData );
		m_triggerEventListeners( "up", changed, screenData.onTouchEventListeners );
		if( primary ) {
			g_press.triggerPressListeners( screenData, "up", screenData.press );
		}
		for( const touch of changed ) {
			if( isCancelled ) {
				g_press.triggerClickListeners( screenData, touch, "cancel", touch.id );
			} else {
				g_press.triggerClickListeners( screenData, touch, "up", touch.id );
			}
		}
	}

	function findTouch( touches, id ) {
		for( const touch of touches ) {
			if( touch.id === id ) {
				return touch;
			}
		}
		return null;
	}

	/**
	 * Record the press of the primary touch.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} touch - The primary touch's data.
	 * @param {string} action - Press action.
	 * @param {number} buttons - 1 while the touch is down, 0 after its release.
	 * @returns {void}
	 */
	function setTouchPress( screenData, touch, action, buttons ) {
		screenData.touchPress = g_target.createPointerData( {
			...touch, "action": action, "buttons": buttons
		} );
	}

	/**
	 * After a touch event, make the touch press the screen's press data, built once for the
	 * event. Its `touches` changes with every touch, so every touch event rebuilds it.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function updatePress( screenData ) {
		if( screenData.touchPress !== null ) {
			screenData.press = g_press.getTouchPress( screenData );
		}
	}

	/**
	 * Apply the touch a pointer event changed. Other touches keep their state and action, and an
	 * ended touch is reported at the position where it lifted, then removed. A touch that starts
	 * off the screen is ignored, and so are moves and ends of touches that are not held; moves
	 * and ends report their true position, which can be outside the screen.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {PointerEvent} e - Touch pointer event.
	 * @param {string} action - `"down"`, `"move"`, or `"up"`.
	 * @param {boolean} isCancelled - Whether the browser cancelled the touch.
	 * @returns {Array<Object>} A frozen array of the changed touch's data, or an empty array.
	 */
	function updateTouch( screenData, e, action, isCancelled ) {
		const previous = screenData.touches[ e.pointerId ];
		let position = g_target.pointerPosition( screenData, e );
		if( action === "down" ) {

			// A touch that starts on the canvas border or padding is ignored
			if( !g_target.isOnScreen( screenData, position ) ) {
				return [];
			}
		} else if( !previous ) {

			// Only touches that started on the screen are tracked: a touch that started on the
			// border, or one a hidden page released, has nothing to move or end
			return [];
		} else if( !position ) {
			position = previous;
		}


		// A touch's first event reports its own position as the last one; contact is button 1
		let buttons = 1;
		if( action === "up" ) {
			buttons = 0;
		}
		let lastX = position.x;
		let lastY = position.y;
		if( previous ) {
			lastX = previous.x;
			lastY = previous.y;
		}
		const touchData = g_target.createPointerData( {
			"x": position.x,
			"y": position.y,
			"lastX": lastX,
			"lastY": lastY,
			"buttons": buttons,
			"action": action,
			"type": "touch",
			"id": e.pointerId,
			"cancelled": isCancelled
		} );
		const newTouches = {};
		for( const id in screenData.touches ) {
			newTouches[ id ] = screenData.touches[ id ];
		}
		if( action === "up" ) {
			delete newTouches[ touchData.id ];
		} else {
			newTouches[ touchData.id ] = touchData;
		}
		screenData.touches = newTouches;
		const touchList = [];
		for( const id in newTouches ) {
			touchList.push( newTouches[ id ] );
		}
		screenData.touchList = Object.freeze( touchList );
		return Object.freeze( [ touchData ] );
	}

	function getScreenDataFromEvent( e ) {
		const screenId = e.target.dataset?.screenId;
		if( screenId === undefined ) {
			return null;
		}
		return pluginApi.getScreenData( "pointer-event", screenId );
	}

	/**
	 * Release held touches when the page is hidden.
	 *
	 * @returns {void}
	 */
	function onVisibilityChangeTouch() {
		if( document.visibilityState !== "hidden" ) {
			return;
		}
		for( const screenData of pluginApi.getAllScreensData() ) {
			if( screenData.touches ) {
				releaseHeldTouches( screenData );
			}
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


