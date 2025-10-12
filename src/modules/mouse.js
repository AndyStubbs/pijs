/**
 * Pi.js - Mouse Input Module
 * 
 * Handles mouse events, position tracking, button states, and event listeners.
 * 
 * @module modules/mouse
 */

export function init( pi ) {
	const piData = pi._.data;

	// STARTMOUSE - Start mouse event tracking
	pi._.addCommand( "startMouse", startMouse, false, true, [] );

	function startMouse( screenData ) {
		if( !screenData.mouseStarted ) {
			screenData.canvas.addEventListener( "mousemove", mouseMove );
			screenData.canvas.addEventListener( "mousedown", mouseDown );
			screenData.canvas.addEventListener( "mouseup", mouseUp );
			screenData.canvas.addEventListener( "contextmenu", onContextMenu );
			screenData.mouseStarted = true;
		}
	}

	// STOPMOUSE - Stop mouse event tracking
	pi._.addCommand( "stopMouse", stopMouse, false, true, [] );

	function stopMouse( screenData ) {
		if( screenData.mouseStarted ) {
			screenData.canvas.removeEventListener( "mousemove", mouseMove );
			screenData.canvas.removeEventListener( "mousedown", mouseDown );
			screenData.canvas.removeEventListener( "mouseup", mouseUp );
			screenData.canvas.removeEventListener( "contextmenu", onContextMenu );
			screenData.mouseStarted = false;
		}
	}

	function mouseMove( e ) {
		const screenData = piData.screens[ e.target.dataset.screenId ];
		if( !screenData ) return;

		updateMouse( screenData, e, "move" );

		if( screenData.mouseEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "move", getMouse( screenData ),
				screenData.onMouseEventListeners
			);
		}

		if( screenData.pressEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "move", getMouse( screenData ),
				screenData.onPressEventListeners
			);
		}
	}

	function mouseDown( e ) {
		const screenData = piData.screens[ e.target.dataset.screenId ];
		if( !screenData ) return;

		updateMouse( screenData, e, "down" );

		if( screenData.mouseEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "down", getMouse( screenData ),
				screenData.onMouseEventListeners
			);
		}

		if( screenData.pressEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "down", getMouse( screenData ),
				screenData.onPressEventListeners
			);
		}

		if( screenData.clickEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "click", getMouse( screenData ),
				screenData.onClickEventListeners, "down"
			);
		}
	}

	function mouseUp( e ) {
		const screenData = piData.screens[ e.target.dataset.screenId ];
		if( !screenData ) return;

		updateMouse( screenData, e, "up" );

		if( screenData.mouseEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "up", getMouse( screenData ),
				screenData.onMouseEventListeners
			);
		}

		if( screenData.pressEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "up", getMouse( screenData ),
				screenData.onPressEventListeners
			);
		}

		if( screenData.clickEventListenersActive > 0 ) {
			piData.commands.triggerEventListeners( "click", getMouse( screenData ),
				screenData.onClickEventListeners, "up"
			);
		}
	}

	function onContextMenu( e ) {
		e.preventDefault();
		return false;
	}

	function updateMouse( screenData, e, eventType ) {
		const rect = screenData.canvas.getBoundingClientRect();
		const scaleX = screenData.width / rect.width;
		const scaleY = screenData.height / rect.height;

		screenData.mouse.x = Math.floor( ( e.clientX - rect.left ) * scaleX );
		screenData.mouse.y = Math.floor( ( e.clientY - rect.top ) * scaleY );
		screenData.mouse.offsetX = e.offsetX;
		screenData.mouse.offsetY = e.offsetY;
		screenData.mouse.button = e.button;
		screenData.mouse.buttons = e.buttons;
		screenData.mouse.eventType = eventType;
	}

	function getMouse( screenData ) {
		return {
			"x": screenData.mouse.x,
			"y": screenData.mouse.y,
			"offsetX": screenData.mouse.offsetX,
			"offsetY": screenData.mouse.offsetY,
			"button": screenData.mouse.button,
			"buttons": screenData.mouse.buttons,
			"eventType": screenData.mouse.eventType
		};
	}

	// INMOUSE - Get mouse state
	pi._.addCommand( "inmouse", inmouse, false, true, [] );

	function inmouse( screenData ) {
		piData.commands.startMouse( screenData );
		return getMouse( screenData );
	}

	// ONMOUSE - Register mouse event listener
	pi._.addCommand( "onmouse", onmouse, false, true, [ "mode", "fn", "once" ] );

	function onmouse( screenData, args ) {
		const mode = args[ 0 ] || "down";
		const fn = args[ 1 ];
		const once = !!args[ 2 ];

		piData.commands.startMouse( screenData );

		if( !pi.util.isFunction( fn ) ) {
			const error = new TypeError( "onmouse: fn must be a function" );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		if( !screenData.onMouseEventListeners ) {
			screenData.onMouseEventListeners = {};
			screenData.mouseEventListenersActive = 0;
		}

		if( !screenData.onMouseEventListeners[ mode ] ) {
			screenData.onMouseEventListeners[ mode ] = [];
		}

		screenData.onMouseEventListeners[ mode ].push( { "fn": fn, "once": once } );
		screenData.mouseEventListenersActive++;
	}

	// OFFMOUSE - Remove mouse event listener
	pi._.addCommand( "offmouse", offmouse, false, true, [ "mode", "fn" ] );

	function offmouse( screenData, args ) {
		const mode = args[ 0 ] || "down";
		const fn = args[ 1 ];

		if( screenData.onMouseEventListeners && screenData.onMouseEventListeners[ mode ] ) {
			if( fn ) {
				const beforeLen = screenData.onMouseEventListeners[ mode ].length;
				screenData.onMouseEventListeners[ mode ] = 
					screenData.onMouseEventListeners[ mode ].filter(
						listener => listener.fn !== fn
					);
				screenData.mouseEventListenersActive -= 
					beforeLen - screenData.onMouseEventListeners[ mode ].length;
			} else {
				screenData.mouseEventListenersActive -= 
					screenData.onMouseEventListeners[ mode ].length;
				screenData.onMouseEventListeners[ mode ] = [];
			}
		}
	}

	// TRIGGEREVENTI STENERS - Helper to trigger event listeners
	pi._.addCommand( "triggerEventListeners", triggerEventListeners, true, false );

	function triggerEventListeners( mode, data, listeners, extraMode ) {
		if( !listeners || !listeners[ mode ] ) {
			return;
		}

		for( let i = listeners[ mode ].length - 1; i >= 0; i-- ) {
			const listener = listeners[ mode ][ i ];
			listener.fn( data, extraMode );
			if( listener.once ) {
				listeners[ mode ].splice( i, 1 );
			}
		}
	}

	// GETMOUSE - Get mouse state (internal helper)
	pi._.addCommand( "getMouse", getMouse, true, true, [] );

	function getMouse( screenData ) {
		return {
			"x": screenData.mouse.x,
			"y": screenData.mouse.y,
			"lastX": screenData.mouse.lastX,
			"lastY": screenData.mouse.lastY,
			"buttons": screenData.mouse.buttons,
			"action": screenData.mouse.eventType,
			"type": "mouse"
		};
	}

	// INPRESS - Get press state (mouse or touch)
	pi._.addCommand( "inpress", inpress, false, true, [] );

	function inpress( screenData ) {
		// Activate the mouse and touch event listeners
		piData.commands.startMouse( screenData );
		piData.commands.startTouch( screenData );

		if( screenData.lastEvent === "touch" ) {
			return piData.commands.getTouchPress( screenData );
		}

		return piData.commands.getMouse( screenData );
	}

	// ONPRESS - Register press event listener
	pi._.addCommand( "onpress", onpress, false, true,
		[ "mode", "fn", "once", "hitBox", "customData" ]
	);

	function onpress( screenData, args ) {
		const mode = args[ 0 ];
		const fn = args[ 1 ];
		const once = args[ 2 ];
		const hitBox = args[ 3 ];
		const customData = args[ 4 ];

		const isValid = piData.commands.onevent(
			mode, fn, once, hitBox, [ "down", "up", "move" ], "onpress",
			screenData.onPressEventListeners, null, null, customData
		);

		// Activate the mouse and touch event listeners
		if( isValid ) {
			piData.commands.startMouse( screenData );
			piData.commands.startTouch( screenData );
			screenData.pressEventListenersActive += 1;
		}
	}

	// OFFPRESS - Remove press event listener
	pi._.addCommand( "offpress", offpress, false, true, [ "mode", "fn" ] );

	function offpress( screenData, args ) {
		const mode = args[ 0 ];
		const fn = args[ 1 ];

		const isValid = piData.commands.offevent(
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

	// ONCLICK - Register click event listener
	pi._.addCommand( "onclick", onclick, false, true,
		[ "fn", "once", "hitBox", "customData" ]
	);

	function onclick( screenData, args ) {
		const fn = args[ 0 ];
		const once = args[ 1 ];
		let hitBox = args[ 2 ];
		const customData = args[ 3 ];

		if( hitBox == null ) {
			hitBox = {
				"x": 0,
				"y": 0,
				"width": piData.commands.width( screenData ),
				"height": piData.commands.height( screenData )
			};
		}

		const isValid = piData.commands.onevent(
			"click", fn, once, hitBox, [ "click" ], "onclick",
			screenData.onClickEventListeners, null, null, customData
		);

		// Activate the mouse and touch event listeners
		if( isValid ) {
			piData.commands.startMouse( screenData );
			piData.commands.startTouch( screenData );
			screenData.clickEventListenersActive += 1;
		}
	}

	// OFFCLICK - Remove click event listener
	pi._.addCommand( "offclick", offclick, false, true, [ "fn" ] );

	function offclick( screenData, args ) {
		const fn = args[ 0 ];

		const isValid = piData.commands.offevent(
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
}

