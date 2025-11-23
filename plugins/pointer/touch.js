/**
 * Touch registration for Pointer plugin.
 */

"use strict";

import { triggerPressListeners, triggerClickListeners, getTouchPress } from "./press.js";

// Module-level reference to startTouchInternal function
let m_startTouchInternal = null;

export function startTouchInternal( screenData ) {
	if( m_startTouchInternal ) {
		m_startTouchInternal( screenData );
	}
}

export function registerTouch( pluginApi, helpers ) {
	
	const m_onevent = helpers.onevent;
	const m_offevent = helpers.offevent;
	const m_triggerEventListeners = helpers.triggerEventListeners;
	
	pluginApi.addScreenDataItem( "touchStopped", false );
	pluginApi.addScreenDataItem( "touchStarted", false );
	pluginApi.addScreenDataItem( "touches", {} );
	pluginApi.addScreenDataItem( "lastTouches", {} );
	pluginApi.addScreenDataItem( "touchEventListenersActive", 0 );
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

	function startTouch( screenData ) {

		// Clear explicit touch stopped
		screenData.touchStopped = false;

		if( !screenData.touchStarted ) {
			const options = { "passive": false };
			screenData.canvas.addEventListener( "touchstart", touchStart, options );
			screenData.canvas.addEventListener( "touchmove", touchMove, options );
			screenData.canvas.addEventListener( "touchend", touchEnd, options );
			screenData.canvas.addEventListener( "touchcancel", touchEnd, options );
			screenData.touchStarted = true;
		}
	}
	
	function stopTouch( screenData ) {
		
		//Clear explicit touchStopped
		screenData.touchStopped = true;

		if( screenData.touchStarted ) {
			screenData.canvas.removeEventListener( "touchstart", touchStart );
			screenData.canvas.removeEventListener( "touchmove", touchMove );
			screenData.canvas.removeEventListener( "touchend", touchEnd );
			screenData.canvas.removeEventListener( "touchcancel", touchEnd );
			screenData.touchStarted = false;
		}
	}
	
	function intouch( screenData ) {
		startTouchInternal( screenData );
		return getTouch( screenData );
	}
	
	function ontouch( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;
		const once = options.once;
		const hitBox = options.hitBox;
		const customData = options.customData;
		
		const isValid = m_onevent(
			mode, fn, once, hitBox, [ "start", "end", "move" ], "ontouch",
			screenData.onTouchEventListeners, null, null, customData
		);
		
		if( isValid ) {
			startTouchInternal( screenData );
			screenData.touchEventListenersActive += 1;
		}
	}
	
	function offtouch( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;
		
		const isValid = m_offevent(
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
		updateTouch( screenData, e, "start" );
		const touchData = getTouch( screenData );
		if( screenData.touchEventListenersActive > 0 ) {
			m_triggerEventListeners( "start", touchData, screenData.onTouchEventListeners );
		}
		triggerPressListeners( screenData, "down", getTouchPress( screenData ) );
		e.preventDefault();
		triggerClickListeners( screenData, getTouchPress( screenData ), "down" );
	}
	
	function touchMove( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( screenData == null ) {
			return;
		}
		updateTouch( screenData, e, "move" );
		const touchData = getTouch( screenData );
		if( screenData.touchEventListenersActive > 0 ) {
			m_triggerEventListeners( "move", touchData, screenData.onTouchEventListeners );
		}
		triggerPressListeners( screenData, "move", getTouchPress( screenData ) );
	}
	
	function touchEnd( e ) {
		const screenData = getScreenDataFromEvent( e );
		if( screenData == null ) {
			return;
		}
		updateTouch( screenData, e, "end" );
		const touchData = getTouch( screenData );
		if( screenData.touchEventListenersActive > 0 ) {
			m_triggerEventListeners( "end", touchData, screenData.onTouchEventListeners );
		}
		triggerPressListeners( screenData, "up", getTouchPress( screenData ) );
		triggerClickListeners( screenData, getTouchPress( screenData ), "up" );
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
		screenData.onTouchEventListeners = {};
		screenData.touchEventListenersActive = 0;
	}
	
	return {
		"stopTouch": stopTouch,
		"clearTouchEvents": clearTouchEvents
	};
}


