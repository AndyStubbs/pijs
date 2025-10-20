/**
 * Pi.js - Press Module
 * 
 * Unified press/click events that work with both mouse and touch.
 * 
 * @module modules/press
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as events from "../core/events";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {

	// Add screen data items for press events
	screenManager.addScreenDataItem( "pressEventListenersActive", 0 );
	screenManager.addScreenDataItem( "onPressEventListeners", {} );

	// Add screen data items for click events
	screenManager.addScreenDataItem( "clickEventListenersActive", 0 );
	screenManager.addScreenDataItem( "onClickEventListeners", {} );

	// Add screen initialization
	screenManager.addScreenInitFunction( initPressData );
}

/**
 * Clear all press event handlers for a screen
 * Called by clearEvents command
 * 
 * @param {Object} screenData - Screen data object
 */
export function clearPressEvents( screenData ) {
	screenData.onPressEventListeners = {};
	screenData.pressEventListenersActive = 0;
}

/**
 * Clear all click event handlers for a screen
 * Called by clearEvents command
 * 
 * @param {Object} screenData - Screen data object
 */
export function clearClickEvents( screenData ) {
	screenData.onClickEventListeners = {};
	screenData.clickEventListenersActive = 0;
}

function initPressData( screenData ) {

	// Initialize press event listeners
	screenData.onPressEventListeners = {
		"down": [],
		"up": [],
		"move": []
	};

	// Initialize click event listeners
	screenData.onClickEventListeners = {
		"click": []
	};
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


screenManager.addCommand( "inpress", inpress, [] );
function inpress( screenData ) {

	// Start both mouse and touch
	screenData.api.startMouse();
	screenData.api.startTouch();

	// Return the appropriate input based on last event
	if( screenData.lastEvent === "touch" ) {
		return getTouchPress( screenData );
	} else {
		return screenData.api.getMouse();
	}
}

screenManager.addCommand( "onpress", onpress, [ "mode", "fn", "once", "hitBox", "customData" ] );
function onpress( screenData, options ) {
	const mode = options.mode;
	const fn = options.fn;
	const once = options.once;
	const hitBox = options.hitBox;
	const customData = options.customData;

	const isValid = events.onevent(
		mode, fn, once, hitBox, [ "down", "up", "move" ], "onpress",
		screenData.onPressEventListeners, null, null, customData
	);

	// Activate both mouse and touch event listeners
	if( isValid ) {
		screenData.api.startMouse();
		screenData.api.startTouch();
		screenData.pressEventListenersActive += 1;
	}
}

screenManager.addCommand( "offpress", offpress, [ "mode", "fn" ] );
function offpress( screenData, options ) {
	const mode = options.mode;
	const fn = options.fn;

	const isValid = events.offevent(
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

screenManager.addCommand( "onclick", onclick, [ "fn", "once", "hitBox", "customData" ] );
function onclick( screenData, options ) {
	const fn = options.fn;
	const once = options.once;
	let hitBox = options.hitBox;
	const customData = options.customData;

	// Default hitbox to entire screen
	if( hitBox == null ) {
		hitBox = {
			"x": 0,
			"y": 0,
			"width": screenData.width,
			"height": screenData.height
		};
	}

	const isValid = events.onevent(
		"click", fn, once, hitBox, [ "click" ], "onclick",
		screenData.onClickEventListeners, null, null, customData
	);

	// Activate both mouse and touch event listeners
	if( isValid ) {
		screenData.api.startMouse();
		screenData.api.startTouch();
		screenData.clickEventListenersActive += 1;
	}
}

screenManager.addCommand( "offclick", offclick, [ "fn" ] );
function offclick( screenData, options ) {
	const fn = options.fn;

	const isValid = events.offevent(
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


/***************************************************************************************************
 * Internal Commands - Exposed for mouse/touch modules to call
 **************************************************************************************************/


screenManager.addScreenInternalCommands( "triggerPressListeners", triggerPressListeners );
function triggerPressListeners( screenData, mode, data ) {
	if( screenData.pressEventListenersActive > 0 ) {
		events.triggerEventListeners( mode, data, screenData.onPressEventListeners );
	}
}

screenManager.addScreenInternalCommands( "triggerClickListeners", triggerClickListeners );
function triggerClickListeners( screenData, data, clickStatus ) {
	if( screenData.clickEventListenersActive > 0 ) {
		events.triggerEventListeners( "click", data, screenData.onClickEventListeners, clickStatus );
	}
}

screenManager.addScreenInternalCommands( "getTouchPress", getTouchPress );
function getTouchPress( screenData ) {

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

