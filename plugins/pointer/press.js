/**
 * Press and Click registration for Pointer plugin.
 */

"use strict";

export function registerPress( pluginApi, helpers ) {
	
	const onevent = helpers.onevent;
	const offevent = helpers.offevent;
	const triggerEventListenersLocal = helpers.triggerEventListeners;
	
	// Expose trigger for other modules via module-level binding
	m_triggerEventListeners = triggerEventListenersLocal;
	
	pluginApi.addScreenDataItem( "pressEventListenersActive", 0 );
	pluginApi.addScreenDataItem( "onPressEventListeners", {} );
	pluginApi.addScreenDataItem( "clickEventListenersActive", 0 );
	pluginApi.addScreenDataItem( "onClickEventListeners", {} );
	
	pluginApi.addScreenInitFunction( initPressData );
	
	pluginApi.addCommand( "inpress", inpress, true, [] );
	pluginApi.addCommand( "onpress", onpress, true, [ "mode", "fn", "once", "hitBox", "customData" ] );
	pluginApi.addCommand( "offpress", offpress, true, [ "mode", "fn" ] );
	pluginApi.addCommand( "onclick", onclick, true, [ "fn", "once", "hitBox", "customData" ] );
	pluginApi.addCommand( "offclick", offclick, true, [ "fn" ] );
	
	function initPressData( screenData ) {
		screenData.onPressEventListeners = {
			"down": [],
			"up": [],
			"move": []
		};
		screenData.onClickEventListeners = {
			"click": []
		};
	}
	
	function inpress( screenData ) {
		screenData.api.startMouse();
		screenData.api.startTouch();
		if( screenData.lastEvent === "touch" ) {
			return getTouchPress( screenData );
		} else {
			return screenData.api.inmouse();
		}
	}
	
	function onpress( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;
		const once = options.once;
		const hitBox = options.hitBox;
		const customData = options.customData;
		
		const isValid = onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onpress",
			screenData.onPressEventListeners, null, null, customData
		);
		
		if( isValid ) {
			screenData.api.startMouse();
			screenData.api.startTouch();
			screenData.pressEventListenersActive += 1;
		}
	}
	
	function offpress( screenData, options ) {
		const mode = options.mode;
		const fn = options.fn;
		
		const isValid = offevent(
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
	
	function onclick( screenData, options ) {
		const fn = options.fn;
		const once = options.once;
		let hitBox = options.hitBox;
		const customData = options.customData;
		
		if( hitBox == null ) {
			hitBox = {
				"x": 0,
				"y": 0,
				"width": screenData.width,
				"height": screenData.height
			};
		}
		
		const isValid = onevent(
			"click", fn, once, hitBox, [ "click" ], "onclick",
			screenData.onClickEventListeners, null, null, customData
		);
		
		if( isValid ) {
			screenData.api.startMouse();
			screenData.api.startTouch();
			screenData.clickEventListenersActive += 1;
		}
	}
	
	function offclick( screenData, options ) {
		const fn = options.fn;
		const isValid = offevent(
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
	
	function clearPressEvents( screenData ) {
		screenData.onPressEventListeners = {};
		screenData.pressEventListenersActive = 0;
	}
	
	function clearClickEvents( screenData ) {
		screenData.onClickEventListeners = {};
		screenData.clickEventListenersActive = 0;
	}
	
	return {
		"clearPressEvents": clearPressEvents,
		"clearClickEvents": clearClickEvents
	};
}

// Module-level reference to event trigger helper
let m_triggerEventListeners = null;

export function triggerPressListeners( screenData, mode, data ) {
	if( screenData.pressEventListenersActive > 0 && m_triggerEventListeners ) {
		m_triggerEventListeners( mode, data, screenData.onPressEventListeners );
	}
}

export function triggerClickListeners( screenData, data, clickStatus ) {
	if( screenData.clickEventListenersActive > 0 && m_triggerEventListeners ) {
		m_triggerEventListeners( "click", data, screenData.onClickEventListeners, clickStatus );
	}
}

export function getTouchPress( screenData ) {
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


