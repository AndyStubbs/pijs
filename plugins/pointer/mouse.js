/**
 * Mouse registration for Pointer plugin.
 */

"use strict";

import * as g_target from "./target.js";
import * as g_press from "./press.js";

// Module-level reference to startMouseInternal function
let m_startMouseInternal = null;

// The `buttons` bit of each `MouseEvent.button` value
const BUTTON_BITS = [ 1, 4, 2, 8, 16 ];

/**
 * Start mouse tracking through the registered mouse implementation.
 *
 * @param {Object} screenData - Screen state.
 * @returns {void}
 */
export function startMouseInternal( screenData ) {
	if( m_startMouseInternal ) {
		m_startMouseInternal( screenData );
	}
}

/**
 * Register mouse commands, screen state, and focus handling.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @param {Object} helpers - Shared pointer event helpers.
 * @returns {Object}
 */
export function registerMouse( pluginApi, helpers ) {
	const m_onevent = helpers.onevent;
	const m_offevent = helpers.offevent;
	const m_removeAllListeners = helpers.removeAllListeners;
	const m_triggerEventListeners = helpers.triggerEventListeners;

	// Screens with a mouse button held. While any is held, a window listener receives the
	// release, wherever it happens
	const m_heldScreens = new Set();
	let m_isWindowListening = false;

	pluginApi.addScreenDataItem( "mouseStopped", false );
	pluginApi.addScreenDataItem( "mouseStarted", false );
	pluginApi.addScreenDataItem( "mouse", null );
	pluginApi.addScreenDataItem( "lastEvent", null );
	pluginApi.addScreenDataItem( "isContextMenuEnabled", false );
	pluginApi.addScreenDataItem( "onMouseEventListeners", {
		"down": [],
		"up": [],
		"move": []
	} );

	pluginApi.addScreenInitFunction( initMouseData );
	document.addEventListener( "visibilitychange", onVisibilityChangeMouse );

	pluginApi.addCommand( "startMouse", startMouse, true, [] );
	pluginApi.addCommand( "stopMouse", stopMouse, true, [] );
	pluginApi.addCommand( "inmouse", inmouse, true, [] );
	pluginApi.addCommand( "setEnableContextMenu", setEnableContextMenu, true, [ "isEnabled" ] );
	pluginApi.addCommand(
		"onmouse", onmouse, true, [ "mode", "fn", "once", "hitBox", "customData" ]
	);
	pluginApi.addCommand( "offmouse", offmouse, true, [ "mode", "fn" ] );

	function initMouseData( screenData ) {
		screenData.mouse = {
			"x": Math.floor( screenData.width / 2 ),
			"y": Math.floor( screenData.height / 2 ),
			"lastX": Math.floor( screenData.width / 2 ),
			"lastY": Math.floor( screenData.height / 2 ),
			"buttons": 0,
			"action": "none",
			"cancelled": false
		};
	}

	function startMouseInternal( screenData ) {

		// Do not start mouse if explicitly stopped
		if( screenData.mouseStopped === false ) {
			startMouse( screenData );
		}
	}

	// Store reference for module-level export
	m_startMouseInternal = startMouseInternal;

	/**
	 * Start tracking mouse events on the screen.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function startMouse( screenData ) {
		g_target.validatePointerTarget( screenData, "startMouse" );

		//Clear explicit mouseStopped
		screenData.mouseStopped = false;

		if( !screenData.mouseStarted ) {
			screenData.canvas.addEventListener( "mousemove", mouseMove );
			screenData.canvas.addEventListener( "mousedown", mouseDown );
			screenData.canvas.addEventListener( "contextmenu", onContextMenu );
			screenData.mouseStarted = true;
		}
	}

	/**
	 * Stop tracking mouse events on the screen. Held buttons are released first, through the
	 * `"up"` handlers with `cancelled: true`.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function stopMouse( screenData ) {
		releaseHeldMouse( screenData );

		// Explicitly set mouse to stoppedto prevent mouse commands from starting mouse when
		// use explicitly sets it to true
		screenData.mouseStopped = true;

		if( screenData.mouseStarted ) {
			screenData.canvas.removeEventListener( "mousemove", mouseMove );
			screenData.canvas.removeEventListener( "mousedown", mouseDown );
			screenData.canvas.removeEventListener( "contextmenu", onContextMenu );
			screenData.mouseStarted = false;
		}
	}

	function getMouse( screenData ) {
		const mouse = {};
		mouse.x = screenData.mouse.x;
		mouse.y = screenData.mouse.y;
		mouse.lastX = screenData.mouse.lastX;
		mouse.lastY = screenData.mouse.lastY;
		mouse.buttons = screenData.mouse.buttons;
		mouse.action = screenData.mouse.action;
		mouse.cancelled = screenData.mouse.cancelled;
		mouse.type = "mouse";
		return mouse;
	}

	/**
	 * Read the current mouse position, buttons, and action.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {Object}
	 */
	function inmouse( screenData ) {
		g_target.validatePointerTarget( screenData, "inmouse" );
		startMouseInternal( screenData );
		return getMouse( screenData );
	}

	/**
	 * Enable or suppress the browser context menu for the screen.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function setEnableContextMenu( screenData, options ) {
		g_target.validatePointerTarget( screenData, "setEnableContextMenu" );
		screenData.isContextMenuEnabled = !!( options.isEnabled );
		startMouseInternal( screenData );
	}

	/**
	 * Register a mouse listener with optional hit-box filtering.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function onmouse( screenData, options ) {
		g_target.validatePointerTarget( screenData, "onmouse" );
		const mode = options.mode;
		const fn = options.fn;
		const once = options.once;
		const hitBox = options.hitBox;
		const customData = options.customData;

		m_onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onmouse",
			screenData.onMouseEventListeners, null, null, customData
		);
		startMouseInternal( screenData );
	}

	/**
	 * Remove matching mouse listeners.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function offmouse( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;

		m_offevent(
			mode, fn, [ "down", "up", "move" ], "offmouse",
			screenData.onMouseEventListeners
		);
	}

	function clearMouseEvents( screenData ) {
		m_removeAllListeners( screenData.onMouseEventListeners );
		screenData.onMouseEventListeners = {
			"down": [],
			"up": [],
			"move": []
		};
	}

	function mouseMove( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( !screenData ) {
			return;
		}

		// Buttons pressed off the screen are not held, so a drag from outside reports none
		updateMouse( screenData, e, "move", screenData.mouse.buttons & e.buttons );
		updateHeld( screenData );
		const mouseData = getMouse( screenData );
		m_triggerEventListeners( "move", mouseData, screenData.onMouseEventListeners );
		g_press.triggerPressListeners( screenData, "move", mouseData );
	}

	function mouseDown( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( !screenData ) {
			return;
		}

		// A press that starts on the canvas border or padding is ignored
		if( !g_target.isOnScreen( screenData, g_target.pointerPosition( screenData, e ) ) ) {
			return;
		}
		let bit = BUTTON_BITS[ e.button ];
		if( bit === undefined ) {
			bit = 0;
		}
		updateMouse( screenData, e, "down", ( screenData.mouse.buttons & e.buttons ) | bit );
		updateHeld( screenData );
		const mouseData = getMouse( screenData );
		m_triggerEventListeners( "down", mouseData, screenData.onMouseEventListeners );
		g_press.triggerPressListeners( screenData, "down", mouseData );
		if( e.button === 0 ) {
			g_press.triggerClickListeners( screenData, mouseData, "down", "mouse" );
		}
	}

	/**
	 * Release a button on every screen that holds it. The listener is on `window`, so a release
	 * outside the canvas arrives; a release for a button that is not held, such as a late
	 * release after a hidden page released it, is ignored.
	 *
	 * @param {MouseEvent} e - The `mouseup` event.
	 * @returns {void}
	 */
	function mouseUp( e ) {
		const bit = BUTTON_BITS[ e.button ];
		if( bit === undefined ) {
			return;
		}
		for( const screenData of Array.from( m_heldScreens ) ) {
			if( ( screenData.mouse.buttons & bit ) === 0 ) {
				continue;
			}
			updateMouse( screenData, e, "up", screenData.mouse.buttons & e.buttons & ~bit );
			updateHeld( screenData );

			// Only the primary button clicks; any other release disarms
			if( e.button === 0 ) {
				dispatchRelease( screenData, "up" );
			} else {
				dispatchRelease( screenData, "cancel" );
			}
		}
	}

	/**
	 * Release every held button of a screen that the player did not release: the page was
	 * hidden or tracking stopped. The release never clicks.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function releaseHeldMouse( screenData ) {
		if( !screenData.mouse || screenData.mouse.buttons === 0 ) {
			return;
		}
		const mouse = screenData.mouse;
		screenData.mouse = {
			"x": mouse.x,
			"y": mouse.y,
			"lastX": mouse.x,
			"lastY": mouse.y,
			"buttons": 0,
			"action": "up",
			"cancelled": true
		};
		updateHeld( screenData );
		dispatchRelease( screenData, "cancel" );
	}

	function dispatchRelease( screenData, clickAction ) {
		const mouseData = getMouse( screenData );
		m_triggerEventListeners( "up", mouseData, screenData.onMouseEventListeners );
		g_press.triggerPressListeners( screenData, "up", mouseData );
		g_press.triggerClickListeners( screenData, mouseData, clickAction, "mouse" );
	}

	/**
	 * Track whether the screen holds a button, and keep the window release listener attached
	 * only while some screen does.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function updateHeld( screenData ) {
		if( screenData.mouse.buttons !== 0 ) {
			m_heldScreens.add( screenData );
		} else {
			m_heldScreens.delete( screenData );
		}
		if( m_heldScreens.size > 0 && !m_isWindowListening ) {
			window.addEventListener( "mouseup", mouseUp, true );
			m_isWindowListening = true;
		} else if( m_heldScreens.size === 0 && m_isWindowListening ) {
			window.removeEventListener( "mouseup", mouseUp, true );
			m_isWindowListening = false;
		}
	}

	function onContextMenu( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( !screenData ) {
			return;
		}
		if( !screenData.isContextMenuEnabled ) {
			e.preventDefault();
			return false;
		}
	}

	/**
	 * Record a mouse event at its true position, which is outside the screen for a move or
	 * release over the border, the padding, or beyond the canvas.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {MouseEvent} e - Mouse event.
	 * @param {string} action - `"down"`, `"move"`, or `"up"`.
	 * @param {number} buttons - Buttons held on the screen after the event.
	 * @returns {void}
	 */
	function updateMouse( screenData, e, action, buttons ) {

		// A canvas with an empty content box keeps the last position
		let position = g_target.pointerPosition( screenData, e );
		if( !position ) {
			position = screenData.mouse;
		}
		const { "x": x, "y": y } = position;

		let lastX = x;
		let lastY = y;

		if( screenData.mouse ) {
			if( screenData.mouse.x !== undefined ) {
				lastX = screenData.mouse.x;
			}
			if( screenData.mouse.y !== undefined ) {
				lastY = screenData.mouse.y;
			}
		}

		screenData.mouse = {
			"x": x,
			"y": y,
			"lastX": lastX,
			"lastY": lastY,
			"buttons": buttons,
			"action": action,
			"cancelled": false
		};
		screenData.lastEvent = "mouse";
	}

	function getScreenDataFromEvent( e ) {
		const screenId = e.target.dataset?.screenId;
		if( screenId === undefined ) {
			return null;
		}
		return pluginApi.getScreenData( "mouse-event", screenId );
	}

	/**
	 * Release held buttons when the page is hidden. Blur changes nothing: browsers keep
	 * delivering input, including the release, to an unfocused page.
	 *
	 * @returns {void}
	 */
	function onVisibilityChangeMouse() {
		if( document.visibilityState !== "hidden" ) {
			return;
		}
		for( const screenData of Array.from( m_heldScreens ) ) {
			releaseHeldMouse( screenData );
		}
	}

	return {
		"stopMouse": stopMouse,
		"clearMouseEvents": clearMouseEvents
	};
}


