/**
 * Mouse registration for Pointer plugin.
 */

"use strict";

import * as g_target from "./target.js";
import * as g_press from "./press.js";

// Module-level reference to startMouseInternal function
let m_startMouseInternal = null;

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
	const m_triggerEventListeners = helpers.triggerEventListeners;

	pluginApi.addScreenDataItem( "mouseStopped", false );
	pluginApi.addScreenDataItem( "mouseStarted", false );
	pluginApi.addScreenDataItem( "mouse", null );
	pluginApi.addScreenDataItem( "lastEvent", null );
	pluginApi.addScreenDataItem( "isContextMenuEnabled", false );
	pluginApi.addScreenDataItem( "mouseEventListenersActive", 0 );
	pluginApi.addScreenDataItem( "onMouseEventListeners", {
		"down": [],
		"up": [],
		"move": []
	} );

	pluginApi.addScreenInitFunction( initMouseData );
	window.addEventListener( "blur", onWindowBlurMouse );

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
			"action": "none"
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
			screenData.canvas.addEventListener( "mouseup", mouseUp );
			screenData.canvas.addEventListener( "contextmenu", onContextMenu );
			screenData.mouseStarted = true;
		}
	}

	/**
	 * Stop tracking mouse events on the screen.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function stopMouse( screenData ) {

		// Explicitly set mouse to stoppedto prevent mouse commands from starting mouse when
		// use explicitly sets it to true
		screenData.mouseStopped = true;

		if( screenData.mouseStarted ) {
			screenData.canvas.removeEventListener( "mousemove", mouseMove );
			screenData.canvas.removeEventListener( "mousedown", mouseDown );
			screenData.canvas.removeEventListener( "mouseup", mouseUp );
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

		const isValid = m_onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onmouse",
			screenData.onMouseEventListeners, null, null, customData
		);

		if( isValid ) {
			startMouseInternal( screenData );
			screenData.mouseEventListenersActive += 1;
		}
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

		const isValid = m_offevent(
			mode, fn, [ "down", "up", "move" ], "offmouse",
			screenData.onMouseEventListeners
		);

		if( isValid ) {
			if( fn == null ) {
				screenData.mouseEventListenersActive = 0;
			} else {
				screenData.mouseEventListenersActive -= 1;
				if( screenData.mouseEventListenersActive < 0 ) {
					screenData.mouseEventListenersActive = 0;
				}
			}
		}
	}

	function clearMouseEvents( screenData ) {
		screenData.onMouseEventListeners = {
			"down": [],
			"up": [],
			"move": []
		};
		screenData.mouseEventListenersActive = 0;
	}

	function mouseMove( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( !screenData ) {
			return;
		}
		updateMouse( screenData, e, "move" );
		const mouseData = getMouse( screenData );
		if( screenData.mouseEventListenersActive > 0 ) {
			m_triggerEventListeners( "move", mouseData, screenData.onMouseEventListeners );
		}
		g_press.triggerPressListeners( screenData, "move", mouseData );
	}

	function mouseDown( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( !screenData ) {
			return;
		}
		updateMouse( screenData, e, "down" );
		const mouseData = getMouse( screenData );
		if( screenData.mouseEventListenersActive > 0 ) {
			m_triggerEventListeners( "down", mouseData, screenData.onMouseEventListeners );
		}
		g_press.triggerPressListeners( screenData, "down", mouseData );
		g_press.triggerClickListeners( screenData, mouseData, "down" );
	}

	function mouseUp( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( !screenData ) {
			return;
		}
		updateMouse( screenData, e, "up" );
		const mouseData = getMouse( screenData );
		if( screenData.mouseEventListenersActive > 0 ) {
			m_triggerEventListeners( "up", mouseData, screenData.onMouseEventListeners );
		}
		g_press.triggerPressListeners( screenData, "up", mouseData );
		g_press.triggerClickListeners( screenData, mouseData, "up" );
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

	function updateMouse( screenData, e, action ) {
		const position = g_target.pointerPosition( screenData, e );
		if( !position ) {
			return;
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
			"buttons": e.buttons,
			"action": action
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

	function onWindowBlurMouse() {
		const allScreensData = pluginApi.getAllScreensData();
		for( const screenData of allScreensData ) {
			screenData.mouse.buttons = 0;
			screenData.mouse.action = "up";
		}
	}

	return {
		"stopMouse": stopMouse,
		"clearMouseEvents": clearMouseEvents
	};
}


