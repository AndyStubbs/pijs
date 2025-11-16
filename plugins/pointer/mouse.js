/**
 * Mouse registration for Pointer plugin.
 */

"use strict";

import { triggerPressListeners, triggerClickListeners, getTouchPress } from "./press.js";

export function registerMouse( pluginApi, helpers ) {
	
	const m_api = pluginApi.getApi();
	const m_onevent = helpers.onevent;
	const m_offevent = helpers.offevent;
	const m_triggerEventListeners = helpers.triggerEventListeners;
	
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
	pluginApi.addCommand( "onmouse", onmouse, true, [ "mode", "fn", "once", "hitBox", "customData" ] );
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
	
	function startMouse( screenData ) {
		if( !screenData.mouseStarted ) {
			screenData.canvas.addEventListener( "mousemove", mouseMove );
			screenData.canvas.addEventListener( "mousedown", mouseDown );
			screenData.canvas.addEventListener( "mouseup", mouseUp );
			screenData.canvas.addEventListener( "contextmenu", onContextMenu );
			screenData.mouseStarted = true;
		}
	}
	
	function stopMouse( screenData ) {
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
	
	function inmouse( screenData ) {
		startMouse( screenData );
		return getMouse( screenData );
	}
	
	function setEnableContextMenu( screenData, options ) {
		screenData.isContextMenuEnabled = !!( options.isEnabled );
		startMouse( screenData );
	}
	
	function onmouse( screenData, options ) {
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
			startMouse( screenData );
			screenData.mouseEventListenersActive += 1;
		}
	}
	
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
		triggerPressListeners( screenData, "move", mouseData );
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
		triggerPressListeners( screenData, "down", mouseData );
		triggerClickListeners( screenData, mouseData, "down" );
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
		triggerPressListeners( screenData, "up", mouseData );
		triggerClickListeners( screenData, mouseData, "up" );
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


