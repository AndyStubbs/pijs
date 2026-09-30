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

	// The latest mouse data, or null before the first event and while stopped
	pluginApi.addScreenDataItem( "mouse", null );
	pluginApi.addScreenDataItem( "isContextMenuEnabled", false );
	pluginApi.addScreenInitFunction( initContextMenu );
	pluginApi.addScreenDataItem( "onMouseEventListeners", {
		"down": [],
		"up": [],
		"move": []
	} );

	pluginApi.addCommand( "startMouse", startMouse, true, [] );
	pluginApi.addCommand( "stopMouse", stopMouse, true, [] );
	pluginApi.addCommand( "inMouse", inMouse, true, [] );
	pluginApi.addCommand( "setContextMenu", setContextMenu, true, [ "isEnabled" ] );
	pluginApi.addCommand(
		"onMouse", onMouse, true, [ "mode", "fn", "once", "hitBox", "customData" ]
	);
	pluginApi.addCommand( "offMouse", offMouse, true, [ "mode", "fn" ] );

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
			screenData.mouseStarted = true;
		}
	}

	/**
	 * Stop tracking mouse events on the screen. Held buttons are released first, through the
	 * `"up"` handlers with `cancelled: true`; then the mouse reads, and a press read that came
	 * from the mouse, return null.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function stopMouse( screenData ) {
		releaseHeldMouse( screenData );
		screenData.mouse = null;
		if( screenData.press !== null && screenData.press.type !== "touch" ) {
			screenData.press = null;
		}

		// Explicitly set mouse to stoppedto prevent mouse commands from starting mouse when
		// use explicitly sets it to true
		screenData.mouseStopped = true;

		if( screenData.mouseStarted ) {
			g_listeners.untrack( screenData, "mouse" );
			screenData.mouseStarted = false;
		}
	}

	/**
	 * Read the latest mouse data: the frozen object of the last event, the same one its handlers
	 * received, or null before the first event and while stopped.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {Object|null}
	 */
	function inMouse( screenData ) {
		g_target.validatePointerTarget( screenData, "inMouse" );
		startMouseInternal( screenData );
		return screenData.mouse;
	}

	/**
	 * Suppress the browser context menu on a new onscreen canvas. The menu tracks no input, so
	 * it is suppressed from screen creation, whether or not mouse tracking runs.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function initContextMenu( screenData ) {
		if( screenData.isOffscreen || !screenData.canvas ) {
			return;
		}
		screenData.canvas.addEventListener( "contextmenu", onContextMenu );
	}

	/**
	 * Remove the context-menu listener of a screen being removed.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function cleanupContextMenu( screenData ) {
		if( screenData.isOffscreen || !screenData.canvas ) {
			return;
		}
		screenData.canvas.removeEventListener( "contextmenu", onContextMenu );
	}

	/**
	 * Enable or suppress the browser context menu for the screen. The setting does not start
	 * mouse tracking.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} options - Command options.
	 * @returns {void}
	 */
	function setContextMenu( screenData, options ) {
		g_target.validatePointerTarget( screenData, "setContextMenu" );
		screenData.isContextMenuEnabled = g_target.readIsEnabled(
			"setContextMenu", options.isEnabled
		);
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
		if( !updateMouse( screenData, e, "move", getHeldButtons( screenData ) & e.buttons ) ) {
			return;
		}
		updateHeld( screenData );
		const pressData = screenData.press;
		m_triggerEventListeners( "move", screenData.mouse, screenData.onMouseEventListeners );
		if( isTracking( screenData ) ) {
			g_press.triggerPressListeners( screenData, "move", pressData );
		}
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
		updateMouse( screenData, e, "down", ( getHeldButtons( screenData ) & e.buttons ) | bit );
		updateHeld( screenData );
		const mouseData = screenData.mouse;
		const pressData = screenData.press;
		m_triggerEventListeners( "down", mouseData, screenData.onMouseEventListeners );
		if( !isTracking( screenData ) ) {
			return false;
		}
		g_press.triggerPressListeners( screenData, "down", pressData );
		if( !isTracking( screenData ) ) {
			return false;
		}
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
		if( bit === undefined || ( getHeldButtons( screenData ) & bit ) === 0 ) {
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
		if( getHeldButtons( screenData ) === 0 ) {
			return;
		}
		const mouse = screenData.mouse;
		setMouse( screenData, {
			"x": mouse.x,
			"y": mouse.y,
			"lastX": mouse.x,
			"lastY": mouse.y,
			"buttons": 0,
			"action": "up",
			"type": mouse.type,
			"id": mouse.id,
			"cancelled": true
		} );
		updateHeld( screenData );
		dispatchRelease( screenData, "cancel" );
	}

	/**
	 * Dispatch a release: the `"up"` handlers, the press release, then the clicks. A handler
	 * that stops tracking ends the release, which then disarms the clicks without firing them;
	 * one that removes the screen ends it at once.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {string} clickAction - `"up"` for a primary-button release, or `"cancel"`.
	 * @returns {void}
	 */
	function dispatchRelease( screenData, clickAction ) {
		const mouseData = screenData.mouse;
		const pressData = screenData.press;
		m_triggerEventListeners( "up", mouseData, screenData.onMouseEventListeners );
		if( isTracking( screenData ) ) {
			g_press.triggerPressListeners( screenData, "up", pressData );
		}
		if( screenData.isRemoved ) {
			return;
		}
		if( !isTracking( screenData ) ) {
			clickAction = "cancel";
		}
		g_press.triggerClickListeners( screenData, mouseData, clickAction, "mouse" );
	}

	/**
	 * Whether an event's dispatch goes on after its handlers ran. A handler may remove the
	 * screen or stop mouse tracking, which ends the dispatch.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {boolean}
	 */
	function isTracking( screenData ) {
		return !screenData.isRemoved && screenData.mouseStarted === true;
	}

	/**
	 * The buttons the screen holds.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {number}
	 */
	function getHeldButtons( screenData ) {
		if( screenData.mouse === null ) {
			return 0;
		}
		return screenData.mouse.buttons;
	}

	/**
	 * Track whether the screen holds a button.
	 *
	 * @param {Object} screenData - Screen state.
	 * @returns {void}
	 */
	function updateHeld( screenData ) {
		if( getHeldButtons( screenData ) !== 0 ) {
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
	 * @returns {boolean} False for a move with no position to report.
	 */
	function updateMouse( screenData, e, action, buttons ) {

		// A canvas with an empty content box keeps the last position, and has none to report
		// before the first event
		let position = g_target.pointerPosition( screenData, e );
		if( !position ) {
			position = screenData.mouse;
		}
		if( !position ) {
			return false;
		}
		const { "x": x, "y": y } = position;

		// The first event of the mouse reports its own position as the last one
		let lastX = x;
		let lastY = y;
		if( screenData.mouse !== null ) {
			lastX = screenData.mouse.x;
			lastY = screenData.mouse.y;
		}

		setMouse( screenData, {
			"x": x,
			"y": y,
			"lastX": lastX,
			"lastY": lastY,
			"buttons": buttons,
			"action": action,
			"type": getPointerType( e ),
			"id": e.pointerId,
			"cancelled": false
		} );
		return true;
	}

	/**
	 * Store the data of a mouse event, and the press data built from it, once per event.
	 *
	 * @param {Object} screenData - Screen state.
	 * @param {Object} record - The event's pointer fields.
	 * @returns {void}
	 */
	function setMouse( screenData, record ) {
		screenData.mouse = g_target.createPointerData( record );
		screenData.press = g_press.getMousePress( screenData.mouse );
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
		"clearMouseEvents": clearMouseEvents,
		"cleanupContextMenu": cleanupContextMenu
	};
}


