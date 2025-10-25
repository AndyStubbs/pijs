/**
 * Pi.js - Mouse Module
 * 
 * Mouse input handling for screens including events and position tracking.
 * 
 * @module modules/mouse
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as events from "../core/events";
import * as utils from "../core/utils";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {

	// Add screen data items
	screenManager.addScreenDataItem( "mouseStarted", false );
	screenManager.addScreenDataItem( "mouse", null );
	screenManager.addScreenDataItem( "lastEvent", null );
	screenManager.addScreenDataItem( "isContextMenuEnabled", false );

	// Event listener tracking
	screenManager.addScreenDataItem( "mouseEventListenersActive", 0 );
	screenManager.addScreenDataItem( "onMouseEventListeners", {
		"down": [],
		"up": [],
		"move": []
	} );

	// Add screen initialization
	screenManager.addScreenInitFunction( initMouseData );

	// Add window blur handler
	window.addEventListener( "blur", onWindowBlur );
}

/**
 * Clear all mouse event handlers for a screen
 * Called by clearEvents command
 * 
 * @param {Object} screenData - Screen data object
 */
export function clearMouseEvents( screenData ) {
	screenData.onMouseEventListeners = {
		"down": [],
		"up": [],
		"move": []
	};
	screenData.mouseEventListenersActive = 0;
}

function initMouseData( screenData ) {

	// Initialize mouse position to center of screen
	screenData.mouse = {
		"x": Math.floor( screenData.width / 2 ),
		"y": Math.floor( screenData.height / 2 ),
		"lastX": Math.floor( screenData.width / 2 ),
		"lastY": Math.floor( screenData.height / 2 ),
		"buttons": 0,
		"action": "none"
	};
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


screenManager.addCommand( "startMouse", startMouse, [] );
function startMouse( screenData ) {
	if( !screenData.mouseStarted ) {
		screenData.canvas.addEventListener( "mousemove", mouseMove );
		screenData.canvas.addEventListener( "mousedown", mouseDown );
		screenData.canvas.addEventListener( "mouseup", mouseUp );
		screenData.canvas.addEventListener( "contextmenu", onContextMenu );
		screenData.mouseStarted = true;
	}
}

screenManager.addCommand( "stopMouse", stopMouse, [] );
function stopMouse( screenData ) {
	if( screenData.mouseStarted ) {
		screenData.canvas.removeEventListener( "mousemove", mouseMove );
		screenData.canvas.removeEventListener( "mousedown", mouseDown );
		screenData.canvas.removeEventListener( "mouseup", mouseUp );
		screenData.canvas.removeEventListener( "contextmenu", onContextMenu );
		screenData.mouseStarted = false;
	}
}

screenManager.addCommand( "getMouse", getMouse, [] );
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

screenManager.addCommand( "inmouse", inmouse, [] );
function inmouse( screenData ) {

	// Activate the mouse event listeners
	startMouse( screenData );

	return getMouse( screenData );
}

screenManager.addCommand( "setEnableContextMenu", setEnableContextMenu, [ "isEnabled" ] );
function setEnableContextMenu( screenData, options ) {
	screenData.isContextMenuEnabled = !!( options.isEnabled );

	// Activate the mouse event listeners
	startMouse( screenData );
}

screenManager.addCommand( "onmouse", onmouse, [ "mode", "fn", "once", "hitBox", "customData" ] );
function onmouse( screenData, options ) {
	const mode = options.mode;
	const fn = options.fn;
	const once = options.once;
	const hitBox = options.hitBox;
	const customData = options.customData;

	const isValid = events.onevent(
		mode, fn, once, hitBox, [ "down", "up", "move" ], "onmouse",
		screenData.onMouseEventListeners, null, null, customData
	);

	// Activate the mouse event listeners
	if( isValid ) {
		startMouse( screenData );
		screenData.mouseEventListenersActive += 1;
	}
}

screenManager.addCommand( "offmouse", offmouse, [ "mode", "fn" ] );
function offmouse( screenData, options ) {
	const mode = options.mode;
	const fn = options.fn;

	const isValid = events.offevent(
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


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


function mouseMove( e ) {
	const screenData = getScreenDataFromEvent( e );
	if( !screenData ) {
		return;
	}

	updateMouse( screenData, e, "move" );

	const mouseData = getMouse( screenData );

	if( screenData.mouseEventListenersActive > 0 ) {
		events.triggerEventListeners( "move", mouseData, screenData.onMouseEventListeners );
	}

	if( screenData.triggerPressListeners ) {
		screenData.triggerPressListeners( screenData, "move", mouseData );
	}
}

function mouseDown( e ) {
	const screenData = getScreenDataFromEvent( e );
	if( !screenData ) {
		return;
	}

	updateMouse( screenData, e, "down" );

	const mouseData = getMouse( screenData );

	if( screenData.mouseEventListenersActive > 0 ) {
		events.triggerEventListeners( "down", mouseData, screenData.onMouseEventListeners );
	}

	if( screenData.triggerPressListeners ) {
		screenData.triggerPressListeners( screenData, "down", mouseData );
	}

	if( screenData.triggerClickListeners ) {
		screenData.triggerClickListeners( screenData, mouseData, "down" );
	}
}

function mouseUp( e ) {
	const screenData = getScreenDataFromEvent( e );
	if( !screenData ) {
		return;
	}

	updateMouse( screenData, e, "up" );

	const mouseData = getMouse( screenData );

	if( screenData.mouseEventListenersActive > 0 ) {
		events.triggerEventListeners( "up", mouseData, screenData.onMouseEventListeners );
	}

	if( screenData.triggerPressListeners ) {
		screenData.triggerPressListeners( screenData, "up", mouseData );
	}

	if( screenData.triggerClickListeners ) {
		screenData.triggerClickListeners( screenData, mouseData, "up" );
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

function updateMouse( screenData, e, action ) {
	const rect = screenData.clientRect;
	const x = Math.floor(
		e.offsetX / rect.width * screenData.width
	);
	const y = Math.floor(
		e.offsetY / rect.height * screenData.height
	);

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

	// Get screen from screenManager
	const activeScreen = screenManager.getActiveScreen();
	if( activeScreen && activeScreen.id === parseInt( screenId ) ) {
		return activeScreen;
	}

	return null;
}

function onWindowBlur() {

	// Reset mouse button state when window loses focus
	const activeScreen = screenManager.getActiveScreen();
	if( activeScreen && activeScreen.mouse ) {
		activeScreen.mouse.buttons = 0;
		activeScreen.mouse.action = "up";
	}
}

