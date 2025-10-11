/**
 * Pi.js - Gamepad Input Module
 * 
 * Handles gamepad/controller input using the Gamepad API.
 * 
 * @module modules/gamepad
 */

export function init( pi ) {
	const piData = pi._.data;

	// Gamepad state
	let m_controllers = {};
	let m_controllerArr = [];
	let m_events = {};
	let m_gamepadLoopId = null;
	const m_Modes = [
		"connect",
		"disconnect",
		"axis",
		"pressed",
		"touched",
		"pressReleased",
		"touchReleased"
	];
	let m_isLooping = false;
	const m_loopInterval = 8;
	let m_axesSensitivity = 0.2;
	let m_init = false;

	function initGamepads() {
		window.addEventListener( "gamepadconnected", gamepadConnected );
		window.addEventListener( "gamepaddisconnected", gamepadDisconnected );
		m_init = true;
	}

	function gamepadConnected( e ) {
		m_controllers[ e.gamepad.index ] = e.gamepad;
		e.gamepad.controllerIndex = m_controllerArr.length;
		m_controllerArr.push( e.gamepad );
		updateController( e.gamepad );

		// Trigger connect event
		triggerGamepadEvent( "connect", e.gamepad.index );
	}

	function gamepadDisconnected( e ) {
		// Trigger disconnect event
		triggerGamepadEvent( "disconnect", e.gamepad.index );

		m_controllerArr.splice(
			m_controllers[ e.gamepad.index ].controllerIndex, 1
		);
		delete m_controllers[ e.gamepad.index ];
	}

	function updateControllers() {
		const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

		for( let i = 0; i < gamepads.length; i++ ) {
			if( gamepads[ i ] && m_controllers[ i ] ) {
				updateController( gamepads[ i ] );
			}
		}
	}

	function updateController( gamepad ) {
		const oldGamepad = m_controllers[ gamepad.index ];

		// Track button states
		if( !oldGamepad.buttons ) {
			oldGamepad.buttons = [];
		}
		if( !oldGamepad.axes ) {
			oldGamepad.axes = [];
		}

		// Check buttons
		for( let i = 0; i < gamepad.buttons.length; i++ ) {
			const button = gamepad.buttons[ i ];
			const oldButton = oldGamepad.buttons[ i ] || { "pressed": false, "touched": false };

			if( button.pressed && !oldButton.pressed ) {
				triggerGamepadEvent( "pressed", gamepad.index, i );
			}
			if( !button.pressed && oldButton.pressed ) {
				triggerGamepadEvent( "pressReleased", gamepad.index, i );
			}
			if( button.touched && !oldButton.touched ) {
				triggerGamepadEvent( "touched", gamepad.index, i );
			}
			if( !button.touched && oldButton.touched ) {
				triggerGamepadEvent( "touchReleased", gamepad.index, i );
			}

			oldGamepad.buttons[ i ] = {
				"pressed": button.pressed,
				"touched": button.touched,
				"value": button.value
			};
		}

		// Check axes
		for( let i = 0; i < gamepad.axes.length; i++ ) {
			const axisValue = gamepad.axes[ i ];
			const oldValue = oldGamepad.axes[ i ] || 0;

			if( Math.abs( axisValue - oldValue ) > m_axesSensitivity ) {
				triggerGamepadEvent( "axis", gamepad.index, i, axisValue );
			}

			oldGamepad.axes[ i ] = axisValue;
		}

		m_controllers[ gamepad.index ] = oldGamepad;
	}

	function triggerGamepadEvent( mode, gamepadIndex, item, value ) {
		if( !m_events[ gamepadIndex ] ) {
			return;
		}

		const modeEvents = m_events[ gamepadIndex ][ mode ];
		if( !modeEvents ) {
			return;
		}

		// Trigger item-specific listeners
		if( item !== undefined && modeEvents[ item ] ) {
			for( let i = modeEvents[ item ].length - 1; i >= 0; i-- ) {
				const listener = modeEvents[ item ][ i ];
				listener.fn( {
					"gamepadIndex": gamepadIndex,
					"mode": mode,
					"item": item,
					"value": value,
					"customData": listener.customData
				} );
				if( listener.once ) {
					modeEvents[ item ].splice( i, 1 );
				}
			}
		}

		// Trigger "any item" listeners (*)
		if( modeEvents[ "*" ] ) {
			for( let i = modeEvents[ "*" ].length - 1; i >= 0; i-- ) {
				const listener = modeEvents[ "*" ][ i ];
				listener.fn( {
					"gamepadIndex": gamepadIndex,
					"mode": mode,
					"item": item,
					"value": value,
					"customData": listener.customData
				} );
				if( listener.once ) {
					modeEvents[ "*" ].splice( i, 1 );
				}
			}
		}
	}

	// INGAMEPADS - Get all connected gamepads
	pi._.addCommand( "ingamepads", ingamepads, false, false, [] );

	function ingamepads() {
		if( !m_init ) {
			initGamepads();
		}
		if( m_controllers ) {
			updateControllers();
		}
		return m_controllerArr;
	}

	// ONGAMEPAD - Register gamepad event listener
	pi._.addCommand( "ongamepad", ongamepad, false, false,
		[ "gamepadIndex", "mode", "item", "fn", "once", "customData" ]
	);

	function ongamepad( args ) {
		if( !m_init ) {
			initGamepads();
		}

		const gamepadIndex = args[ 0 ];
		const mode = args[ 1 ];
		const item = args[ 2 ];
		const fn = args[ 3 ];
		const once = !!args[ 4 ];
		const customData = args[ 5 ];

		if( !pi.util.isFunction( fn ) ) {
			const error = new TypeError( "ongamepad: fn must be a function" );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		if( gamepadIndex == null ) {
			const error = new TypeError( "ongamepad: gamepadIndex is required" );
			error.code = "MISSING_GAMEPAD_INDEX";
			throw error;
		}

		if( !m_events[ gamepadIndex ] ) {
			m_events[ gamepadIndex ] = {};
		}
		if( !m_events[ gamepadIndex ][ mode ] ) {
			m_events[ gamepadIndex ][ mode ] = {};
		}

		const itemKey = item !== undefined ? item : "*";

		if( !m_events[ gamepadIndex ][ mode ][ itemKey ] ) {
			m_events[ gamepadIndex ][ mode ][ itemKey ] = [];
		}

		m_events[ gamepadIndex ][ mode ][ itemKey ].push( {
			"fn": fn,
			"once": once,
			"customData": customData
		} );

		// Start polling if not already
		if( !m_isLooping ) {
			startGamepadLoop();
		}
	}

	// OFFGAMEPAD - Remove gamepad event listener
	pi._.addCommand( "offgamepad", offgamepad, false, false,
		[ "gamepadIndex", "mode", "item", "fn" ]
	);

	function offgamepad( args ) {
		const gamepadIndex = args[ 0 ];
		const mode = args[ 1 ];
		const item = args[ 2 ];
		const fn = args[ 3 ];

		if( !m_events[ gamepadIndex ] || !m_events[ gamepadIndex ][ mode ] ) {
			return;
		}

		const itemKey = item !== undefined ? item : "*";

		if( m_events[ gamepadIndex ][ mode ][ itemKey ] ) {
			if( fn ) {
				m_events[ gamepadIndex ][ mode ][ itemKey ] = 
					m_events[ gamepadIndex ][ mode ][ itemKey ].filter(
						listener => listener.fn !== fn
					);
			} else {
				m_events[ gamepadIndex ][ mode ][ itemKey ] = [];
			}
		}
	}

	function startGamepadLoop() {
		if( m_isLooping ) {
			return;
		}

		m_isLooping = true;

		function loop() {
			if( !m_isLooping ) {
				return;
			}

			updateControllers();
			m_gamepadLoopId = setTimeout( loop, m_loopInterval );
		}

		loop();
	}

	function stopGamepadLoop() {
		m_isLooping = false;
		if( m_gamepadLoopId ) {
			clearTimeout( m_gamepadLoopId );
			m_gamepadLoopId = null;
		}
	}

	// SETGAMEPADSENSITIVITY - Set axes sensitivity threshold
	pi._.addCommand( "setGamepadSensitivity", setGamepadSensitivity, false, false,
		[ "sensitivity" ]
	);

	function setGamepadSensitivity( args ) {
		const sensitivity = args[ 0 ];

		if( isNaN( sensitivity ) || sensitivity < 0 || sensitivity > 1 ) {
			const error = new RangeError(
				"setGamepadSensitivity: sensitivity must be between 0 and 1"
			);
			error.code = "INVALID_SENSITIVITY";
			throw error;
		}

		m_axesSensitivity = sensitivity;
	}
}

