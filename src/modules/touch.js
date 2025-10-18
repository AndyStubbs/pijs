/**
 * Pi.js - Touch Module
 * 
 * Touch input handling for screens including multi-touch support.
 * 
 * @module modules/touch
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as commands from "../core/commands";
import * as events from "../core/events";
import * as utils from "../core/utils";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


let m_isTouchScreen = false;

export function init() {

	// Add screen data items
	screenManager.addScreenDataItem( "touchStarted", false );
	screenManager.addScreenDataItem( "touches", {} );
	screenManager.addScreenDataItem( "lastTouches", {} );

	// Event listener tracking
	screenManager.addScreenDataItem( "touchEventListenersActive", 0 );
	screenManager.addScreenDataItem( "onTouchEventListeners", {} );

	// Add screen initialization
	screenManager.addScreenInitFunction( initTouchData );
}

function initTouchData( screenData ) {

	// Initialize touch event listeners
	screenData.onTouchEventListeners = {
		"start": [],
		"end": [],
		"move": []
	};
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


screenManager.addCommand( "startTouch", startTouch, [] );
function startTouch( screenData ) {
	if( !screenData.touchStarted ) {
		screenData.canvas.addEventListener( "touchstart", touchStart );
		screenData.canvas.addEventListener( "touchmove", touchMove );
		screenData.canvas.addEventListener( "touchend", touchEnd );
		screenData.canvas.addEventListener( "touchcancel", touchEnd );
		screenData.touchStarted = true;
	}
}

screenManager.addCommand( "stopTouch", stopTouch, [] );
function stopTouch( screenData ) {
	if( screenData.touchStarted ) {
		screenData.canvas.removeEventListener( "touchstart", touchStart );
		screenData.canvas.removeEventListener( "touchmove", touchMove );
		screenData.canvas.removeEventListener( "touchend", touchEnd );
		screenData.canvas.removeEventListener( "touchcancel", touchEnd );
		screenData.touchStarted = false;
	}
}

screenManager.addCommand( "intouch", intouch, [] );
function intouch( screenData ) {
	startTouch( screenData );
	return getTouch( screenData );
}

screenManager.addCommand( "ontouch", ontouch, [ "mode", "fn", "once", "hitBox", "customData" ] );
function ontouch( screenData, options ) {
	const mode = options.mode;
	const fn = options.fn;
	const once = options.once;
	const hitBox = options.hitBox;
	const customData = options.customData;

	const isValid = events.onevent(
		mode, fn, once, hitBox, [ "start", "end", "move" ], "ontouch",
		screenData.onTouchEventListeners, null, null, customData
	);

	if( isValid ) {
		startTouch( screenData );
		screenData.touchEventListenersActive += 1;
	}
}

screenManager.addCommand( "offtouch", offtouch, [ "mode", "fn" ] );
function offtouch( screenData, options ) {
	const mode = options.mode;
	const fn = options.fn;

	const isValid = events.offevent(
		mode, fn, [ "start", "end", "move" ], "offtouch",
		screenData.onTouchEventListeners
	);

	if( isValid ) {
		if( fn == null ) {
			screenData.touchEventListenersActive = 0;
		} else {
			screenData.touchEventListenersActive -= 1;
			if( screenData.touchEventListenersActive < 0 ) {
				screenData.touchEventListenersActive = 0;
			}
		}
	}
}

commands.addCommand( "setPinchZoom", setPinchZoom, [ "isEnabled" ] );
function setPinchZoom( options ) {
	const isEnabled = !!( options.isEnabled );

	if( isEnabled ) {
		document.body.style.touchAction = "";
	} else {
		document.body.style.touchAction = "none";
	}
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


function touchStart( e ) {
	m_isTouchScreen = true;

	const screenData = getScreenDataFromEvent( e );
	if( screenData == null ) {
		return;
	}

	updateTouch( screenData, e, "start" );

	const touchData = getTouch( screenData );

	if( screenData.touchEventListenersActive > 0 ) {
		events.triggerEventListeners( "start", touchData, screenData.onTouchEventListeners );
	}

	if( screenData.triggerPressListeners && screenData.getTouchPress ) {
		screenData.triggerPressListeners( screenData, "down", screenData.getTouchPress( screenData ) );

		// Prevent mouse down event from firing
		e.preventDefault();
	}

	if( screenData.triggerClickListeners && screenData.getTouchPress ) {
		screenData.triggerClickListeners(
			screenData, screenData.getTouchPress( screenData ), "down"
		);
	}
}

function touchMove( e ) {
	const screenData = getScreenDataFromEvent( e );
	if( screenData == null ) {
		return;
	}

	updateTouch( screenData, e, "move" );

	const touchData = getTouch( screenData );

	if( screenData.touchEventListenersActive > 0 ) {
		events.triggerEventListeners( "move", touchData, screenData.onTouchEventListeners );
	}

	if( screenData.triggerPressListeners && screenData.getTouchPress ) {
		screenData.triggerPressListeners( screenData, "move", screenData.getTouchPress( screenData ) );
	}
}

function touchEnd( e ) {
	const screenData = getScreenDataFromEvent( e );
	if( screenData == null ) {
		return;
	}

	updateTouch( screenData, e, "end" );

	const touchData = getTouch( screenData );

	if( screenData.touchEventListenersActive > 0 ) {
		events.triggerEventListeners( "end", touchData, screenData.onTouchEventListeners );
	}

	if( screenData.triggerPressListeners && screenData.getTouchPress ) {
		screenData.triggerPressListeners( screenData, "up", screenData.getTouchPress( screenData ) );
	}

	if( screenData.triggerClickListeners && screenData.getTouchPress ) {
		screenData.triggerClickListeners(
			screenData, screenData.getTouchPress( screenData ), "up"
		);
	}
}

function updateTouch( screenData, e, action ) {
	if( !screenData.clientRect ) {
		return;
	}

	const newTouches = {};
	const rect = screenData.clientRect;

	for( let j = 0; j < e.touches.length; j++ ) {
		const touch = e.touches[ j ];
		const touchData = {};

		touchData.x = Math.floor(
			( touch.clientX - rect.left ) / rect.width * screenData.width
		);
		touchData.y = Math.floor(
			( touch.clientY - rect.top ) / rect.height * screenData.height
		);
		touchData.id = touch.identifier;

		if( screenData.touches[ touchData.id ] ) {
			touchData.lastX = screenData.touches[ touchData.id ].x;
			touchData.lastY = screenData.touches[ touchData.id ].y;
		} else {
			touchData.lastX = null;
			touchData.lastY = null;
		}

		touchData.action = action;
		newTouches[ touchData.id ] = touchData;
	}

	screenData.lastTouches = screenData.touches;
	screenData.touches = newTouches;
	screenData.lastEvent = "touch";
}

function getTouch( screenData ) {
	const touchArr = [];

	// Make a local copy of touch Object
	for( const i in screenData.touches ) {
		const touch = screenData.touches[ i ];
		const touchData = {
			"x": touch.x,
			"y": touch.y,
			"id": touch.id,
			"lastX": touch.lastX,
			"lastY": touch.lastY,
			"action": touch.action,
			"type": "touch"
		};
		touchArr.push( touchData );
	}

	return touchArr;
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

