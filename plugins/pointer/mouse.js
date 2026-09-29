/**
 * Mouse registration for Pointer plugin. Mouse commands observe mouse and pen pointers through
 * the shared Pointer Events listeners.
 */

"use strict";

import * as g_target from "./target.js";
import * as g_press from "./press.js";
import * as g_listeners from "./listeners.js";

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

	// Screens with a mouse button held, released when the page is hidden
	const m_heldScreens = new Set();

	// The page-visibility listener is added when tracking first starts, not at plugin load
	let m_isVisibilityListening = false;

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

	pluginApi.addCommand( "startMouse", startMouse, true, [] );
	pluginApi.addCommand( "stopMouse", stopMouse, true, [] );
	pluginApi.addCommand( "inMouse", inMouse, true, [] );
	pluginApi.addCommand( "setEnableContextMenu", setEnableContextMenu, true, [ "isEnabled" ] );
	pluginApi.addCommand(
		"onMouse", onMouse, true, [ "mode", "fn", "once", "hitBox", "customData" ]
	);
	pluginApi.addCommand( "offMouse", offMouse, true, [ "mode", "fn" ] );

	function initMouseData( screenData ) {
		screenData.mouse = {
			"x": Math.floor( screenData.width / 2 ),
			"y": Math.floor( screenData.height / 2 ),
			"lastX": Math.floor( screenData.width / 2 ),
			"lastY": Math.floor( screenData.height / 2 ),
			"buttons": 0,
			"action": "none",
			"type": "mouse",
			"id": -1,
			"cancelled": false
		};
	}

	g_listeners.setHandlers( "mouse", {
		"pointerdown": mouseDown,
		"pointermove": mouseMove,
		"pointerup": mouseUp,
		"pointercancel": releaseHeldMouse
	}, getScreenDataFromEvent );

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

		if( !m_isVisibilityListening ) {
			document.addEventListener( "visibilitychange", onVisibilityChangeMouse );
			m_isVisibilityListening = true;
		}
		if( !screenData.mouseStarted ) {
			g_listeners.track( screenData, "mouse" );
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
			g_listeners.untrack( screenData, "mouse" );
			screenData.canvas.removeEventListener( "contextmenu", onContextMenu );
			screenData.mouseStarted = false;
		}
	}

	function getMouse( screenData ) {
		return g_target.createPointerData( screenData.mouse );
	}

	/**
	 * Read the current mouse position, buttons, and action.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {Object}
	 */
	function inMouse( screenData ) {
		g_target.validatePointerTarget( screenData, "inMouse" );
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
	function onMouse( screenData, options ) {
		g_target.validatePointerTarget( screenData, "onMouse" );
		const mode = options.mode;
		const fn = options.fn;
		const once = options.once;
		const hitBox = options.hitBox;
		const customData = options.customData;

		m_onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onMouse",
			screenData.onMouseEventListeners, customData
		);
		startMouseInternal( screenData );
	}

	/**
	 * Remove matching mouse listeners: by mode and function, every handler of a mode, or a
	 * function from every mode.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function offMouse( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;

		m_offevent(
			mode, fn, [ "down", "up", "move" ], "offMouse",
			screenData.onMouseEventListeners, "mouse"
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

	/**
	 * A mouse or pen move. A button pressed or released while another is held arrives as a
	 * move whose `button` names it, as Pointer Events report chorded buttons.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {PointerEvent} e - The `pointermove` event.
	 * @returns {void}
	 */
	function mouseMove( screenData, e ) {
		if( e.button >= 0 ) {
			const bit = BUTTON_BITS[ e.button ];
			if( bit !== undefined && ( e.buttons & bit ) !== 0 ) {
				mouseDown( screenData, e );
			} else {
				mouseUp( screenData, e );
			}
			return;
		}

		// Buttons pressed off the screen are not held, so a drag from outside reports none
		updateMouse( screenData, e, "move", screenData.mouse.buttons & e.buttons );
		updateHeld( screenData );
		const mouseData = getMouse( screenData );
		m_triggerEventListeners( "move", mouseData, screenData.onMouseEventListeners );
		g_press.triggerPressListeners( screenData, "move", g_press.getMousePress( mouseData ) );
	}

	/**
	 * A button press. A press that starts on the canvas border or padding is ignored.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {PointerEvent} e - The `pointerdown` event, or a chorded `pointermove`.
	 * @returns {boolean} Whether the press was accepted, so its pointer is captured.
	 */
	function mouseDown( screenData, e ) {
		if( !g_target.isOnScreen( screenData, g_target.pointerPosition( screenData, e ) ) ) {
			return false;
		}
		let bit = BUTTON_BITS[ e.button ];
		if( bit === undefined ) {
			bit = 0;
		}
		updateMouse( screenData, e, "down", ( screenData.mouse.buttons & e.buttons ) | bit );
		updateHeld( screenData );
		const mouseData = getMouse( screenData );
		m_triggerEventListeners( "down", mouseData, screenData.onMouseEventListeners );
		g_press.triggerPressListeners( screenData, "down", g_press.getMousePress( mouseData ) );
		if( e.button === 0 ) {
			g_press.triggerClickListeners( screenData, mouseData, "down", "mouse" );
		}
		return true;
	}

	/**
	 * A button release. The pressed pointer is captured, so a release outside the canvas
	 * arrives here; a release for a button that is not held, such as a late release after a
	 * hidden page released it, is ignored.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {PointerEvent} e - The `pointerup` event, or a chorded `pointermove`.
	 * @returns {void}
	 */
	function mouseUp( screenData, e ) {
		const bit = BUTTON_BITS[ e.button ];
		if( bit === undefined || ( screenData.mouse.buttons & bit ) === 0 ) {
			return;
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

	/**
	 * Release every held button of a screen that the player did not release: the page was
	 * hidden, tracking stopped, or the browser cancelled the pointer. The release never clicks.
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
			"type": mouse.type,
			"id": mouse.id,
			"cancelled": true
		};
		updateHeld( screenData );
		dispatchRelease( screenData, "cancel" );
	}

	function dispatchRelease( screenData, clickAction ) {
		const mouseData = getMouse( screenData );
		m_triggerEventListeners( "up", mouseData, screenData.onMouseEventListeners );
		g_press.triggerPressListeners( screenData, "up", g_press.getMousePress( mouseData ) );
		g_press.triggerClickListeners( screenData, mouseData, clickAction, "mouse" );
	}

	/**
	 * Track whether the screen holds a button.
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
	 * @param {PointerEvent} e - Mouse or pen pointer event.
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

		// The first event of the mouse reports its own position as the last one
		let lastX = x;
		let lastY = y;
		if( screenData.mouse.action !== "none" ) {
			lastX = screenData.mouse.x;
			lastY = screenData.mouse.y;
		}

		screenData.mouse = {
			"x": x,
			"y": y,
			"lastX": lastX,
			"lastY": lastY,
			"buttons": buttons,
			"action": action,
			"type": getPointerType( e ),
			"id": e.pointerId,
			"cancelled": false
		};
		screenData.lastEvent = "mouse";
	}

	/**
	 * The `type` of mouse data: `"pen"` for a pen, `"mouse"` otherwise.
	 *
	 * @param {PointerEvent} e - Mouse or pen pointer event.
	 * @returns {string}
	 */
	function getPointerType( e ) {
		if( e.pointerType === "pen" ) {
			return "pen";
		}
		return "mouse";
	}

	function getScreenDataFromEvent( e ) {
		const screenId = e.target.dataset?.screenId;
		if( screenId === undefined ) {
			return null;
		}
		return pluginApi.getScreenData( "pointer-event", screenId );
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


