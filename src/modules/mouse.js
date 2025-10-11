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
}

