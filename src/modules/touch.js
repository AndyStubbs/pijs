/**
 * Pi.js - Touch Input Module
 * 
 * Handles touch events, multi-touch support, and event listeners.
 * 
 * @module modules/touch
 */

"use strict";

export function init( pi ) {
	const piData = pi._.data;

	// STARTTOUCH - Start touch event tracking
	pi._.addCommand( "startTouch", startTouch, false, true, [] );

	function startTouch( screenData ) {
		if( !screenData.touchStarted ) {
			screenData.canvas.addEventListener( "touchstart", touchStart );
			screenData.canvas.addEventListener( "touchmove", touchMove );
			screenData.canvas.addEventListener( "touchend", touchEnd );
			screenData.canvas.addEventListener( "touchcancel", touchEnd );
			screenData.touchStarted = true;
		}
	}

	// STOPTOUCH - Stop touch event tracking
	pi._.addCommand( "stopTouch", stopTouch, false, true, [] );

	function stopTouch( screenData ) {
		if( screenData.touchStarted ) {
			screenData.canvas.removeEventListener( "touchstart", touchStart );
			screenData.canvas.removeEventListener( "touchmove", touchMove );
			screenData.canvas.removeEventListener( "touchend", touchEnd );
			screenData.canvas.removeEventListener( "touchcancel", touchEnd );
			screenData.touchStarted = false;
		}
	}

	function touchStart( e ) {
		piData.isTouchScreen = true;

		const screenData = piData.screens[ e.target.dataset.screenId ];
		if( !screenData ) {
			return;
		}

		updateTouch( screenData, e, "start" );

		if( screenData.touchEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "start",
				getTouch( screenData ), screenData.onTouchEventListeners
			);
		}

		if( screenData.pressEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "down",
				getTouchPress( screenData ), screenData.onPressEventListeners
			);

			// This will prevent mouse down event from firing
			e.preventDefault();
		}

		if( screenData.clickEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "click",
				getTouchPress( screenData ),
				screenData.onClickEventListeners, "down"
			);
		}
	}

	function touchMove( e ) {
		const screenData = piData.screens[ e.target.dataset.screenId ];
		if( !screenData ) {
			return;
		}

		updateTouch( screenData, e, "move" );

		if( screenData.touchEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "move",
				getTouch( screenData ), screenData.onTouchEventListeners
			);
		}

		if( screenData.pressEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "move",
				getTouchPress( screenData ), screenData.onPressEventListeners
			);
			e.preventDefault();
		}
	}

	function touchEnd( e ) {
		const screenData = piData.screens[ e.target.dataset.screenId ];
		if( !screenData ) {
			return;
		}

		updateTouch( screenData, e, "end" );

		if( screenData.touchEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "end",
				getTouch( screenData ), screenData.onTouchEventListeners
			);
		}

		if( screenData.pressEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "up",
				getTouchPress( screenData ), screenData.onPressEventListeners
			);
		}

		if( screenData.clickEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "click",
				getTouchPress( screenData ),
				screenData.onClickEventListeners, "up"
			);
		}
	}

	function updateTouch( screenData, e, eventType ) {
		const rect = screenData.canvas.getBoundingClientRect();
		const scaleX = screenData.width / rect.width;
		const scaleY = screenData.height / rect.height;

		screenData.touch.eventType = eventType;
		screenData.touch.count = e.touches.length;
		screenData.touch.touches = [];

		for( let i = 0; i < e.touches.length; i++ ) {
			const touch = e.touches[ i ];
			screenData.touch.touches.push( {
				"x": Math.floor( ( touch.clientX - rect.left ) * scaleX ),
				"y": Math.floor( ( touch.clientY - rect.top ) * scaleY ),
				"identifier": touch.identifier
			} );
		}

		// Update primary touch (first touch)
		if( screenData.touch.touches.length > 0 ) {
			screenData.touch.x = screenData.touch.touches[ 0 ].x;
			screenData.touch.y = screenData.touch.touches[ 0 ].y;
		}
	}

	function getTouch( screenData ) {
		return {
			"x": screenData.touch.x,
			"y": screenData.touch.y,
			"count": screenData.touch.count,
			"touches": screenData.touch.touches.slice(),
			"eventType": screenData.touch.eventType
		};
	}

	function getTouchPress( screenData ) {
		return {
			"x": screenData.touch.x,
			"y": screenData.touch.y,
			"eventType": screenData.touch.eventType,
			"inputType": "touch"
		};
	}

	// INTOUCH - Get touch state
	pi._.addCommand( "intouch", intouch, false, true, [] );

	function intouch( screenData ) {
		piData.commands.startTouch( screenData );
		return getTouch( screenData );
	}

	// ONTOUCH - Register touch event listener
	pi._.addCommand( "ontouch", ontouch, false, true, [ "mode", "fn", "once" ] );

	function ontouch( screenData, args ) {
		const mode = args[ 0 ] || "start";
		const fn = args[ 1 ];
		const once = !!args[ 2 ];

		piData.commands.startTouch( screenData );

		if( !pi.util.isFunction( fn ) ) {
			const error = new TypeError( "ontouch: fn must be a function" );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		if( !screenData.onTouchEventListeners ) {
			screenData.onTouchEventListeners = {};
			screenData.touchEventListenersActive = 0;
		}

		if( !screenData.onTouchEventListeners[ mode ] ) {
			screenData.onTouchEventListeners[ mode ] = [];
		}

		screenData.onTouchEventListeners[ mode ].push( { "fn": fn, "once": once } );
		screenData.touchEventListenersActive++;
	}

	// OFFTOUCH - Remove touch event listener
	pi._.addCommand( "offtouch", offtouch, false, true, [ "mode", "fn" ] );

	function offtouch( screenData, args ) {
		const mode = args[ 0 ] || "start";
		const fn = args[ 1 ];

		if( screenData.onTouchEventListeners && screenData.onTouchEventListeners[ mode ] ) {
			if( fn ) {
				const beforeLen = screenData.onTouchEventListeners[ mode ].length;
				screenData.onTouchEventListeners[ mode ] = 
					screenData.onTouchEventListeners[ mode ].filter(
						listener => listener.fn !== fn
					);
				screenData.touchEventListenersActive -= 
					beforeLen - screenData.onTouchEventListeners[ mode ].length;
			} else {
				screenData.touchEventListenersActive -= 
					screenData.onTouchEventListeners[ mode ].length;
				screenData.onTouchEventListeners[ mode ] = [];
			}
		}
	}

	// GETTOUCHPRESS - Get touch press state (internal helper)
	pi._.addCommand( "getTouchPress", getTouchPress, true, true, [] );

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
					touch.action = action;
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
		}

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

	// SETPINCHZOOM - Enable/disable pinch zoom
	pi._.addCommand( "setPinchZoom", setPinchZoom, false, false, [ "isEnabled" ] );
	pi._.addSetting( "pinchZoom", setPinchZoom, false, [ "isEnabled" ] );

	function setPinchZoom( args ) {
		const isEnabled = !!args[ 0 ];

		if( isEnabled ) {
			document.body.style.touchAction = "";
		} else {
			document.body.style.touchAction = "none";
		}
	}
}

