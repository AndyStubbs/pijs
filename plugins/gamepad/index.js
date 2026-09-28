/**
 * Gamepad Plugin for Pi.js
 *
 * Provides gamepad input handling including button state tracking, axis handling,
 * and connect/disconnect event management.
 *
 * @module plugins/gamepad
 * @version 1.0.0
 */

"use strict";


/*************************************************************************************************
 * Module State
 ************************************************************************************************/


const m_gamepads = {};

// Per pad: the state the loop last saw, and the edges it accumulated since the last read
const m_padStates = {};
const m_onConnectHandlers = [];
const m_onDisconnectHandlers = [];

let m_isInitialized = false;
let m_isStopped = false;
let m_isLooping = false;
let m_gamepadLoopId = null;
let m_axesSensitivity = 0.2;
let m_tick = 0;
let m_lastReadTick = -1;
let m_isHidden = false;
let m_isReturning = false;


/*************************************************************************************************
 * Plugin Initialization
 ************************************************************************************************/


/**
 * Register gamepad commands and the page visibility handler.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @returns {void}
 */
export default function gamepadPlugin( pluginApi ) {

	// Release pads when the page is hidden. Blur changes nothing: browsers keep delivering
	// gamepad input to a visible page without focus
	document.addEventListener( "visibilitychange", onVisibilityChange );

	// Register global commands
	pluginApi.addCommand( "startGamepad", startGamepad, false, [] );
	pluginApi.addCommand( "stopGamepad", stopGamepad, false, [] );
	pluginApi.addCommand( "ingamepad", ingamepad, false, [ "gamepadIndex" ] );
	pluginApi.addCommand(
		"setGamepadSensitivity", setGamepadSensitivity, false, [ "sensitivity" ]
	);
	pluginApi.addCommand( "onGamepadConnected", onGamepadConnected, false, [ "fn" ] );
	pluginApi.addCommand( "onGamepadDisconnected", onGamepadDisconnected, false, [ "fn" ] );

	// Register clearEvents handler
	pluginApi.registerClearEvents( "gamepad", clearGamepadEvents );
}


/*************************************************************************************************
 * External API Commands
 ************************************************************************************************/


/**
 * Start gamepad polling and initialize connection listeners when needed.
 *
 * @returns {void}
 */
function startGamepad() {
	if( !m_isInitialized ) {
		window.addEventListener( "gamepadconnected", gamepadConnected );
		window.addEventListener( "gamepaddisconnected", gamepadDisconnected );
		m_isInitialized = true;

		// Scan for already-connected gamepads
		scanForGamepads();
	}

	// Remove explicit stops
	m_isStopped = false;

	if( !m_isLooping ) {
		m_isLooping = true;
		m_gamepadLoopId = requestAnimationFrame( gamepadLoop );
	}
}

/**
 * Stop gamepad polling and prevent reads from restarting it automatically.
 *
 * @returns {void}
 */
function stopGamepad() {

	// Explicitly stop gamepad to prevent autostart when ingamepad is called
	m_isStopped = true;
	if( m_isLooping ) {
		m_isLooping = false;
		if( m_gamepadLoopId ) {
			cancelAnimationFrame( m_gamepadLoopId );
			m_gamepadLoopId = null;
		}
	}
}

/**
 * Read one gamepad or all connected gamepads, unless polling was explicitly stopped. The first
 * read starts polling and records the current state without edges.
 *
 * @param {Object} options - Command options.
 * @returns {Object|Array<Object>|null|undefined}
 */
function ingamepad( options ) {
	const gamepadIndex = options.gamepadIndex;

	// If stopped explicitly then return without auto starting
	if( m_isStopped ) {
		return null;
	}
	if( !m_isLooping ) {
		startGamepad();
		updateGamepads( false );
	}
	readGamepads();

	// If no index specified, return all gamepads
	if( gamepadIndex === null || gamepadIndex === undefined ) {
		return Object.values( m_gamepads ).sort( ( a, b ) => a.index - b.index );
	}

	// Validate gamepadIndex
	if( !Number.isInteger( gamepadIndex ) || gamepadIndex < 0 ) {
		const error = new TypeError(
			"ingamepad: gamepadIndex must be a non-negative integer or null."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Return specific gamepad or undefined if not found
	return m_gamepads[ gamepadIndex ];
}

/**
 * Set the dead zone used when reporting gamepad axes.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setGamepadSensitivity( options ) {
	const sensitivity = options.sensitivity;

	if( !Number.isFinite( sensitivity ) || sensitivity < 0 || sensitivity > 1 ) {
		const error = new TypeError(
			"setGamepadSensitivity: sensitivity must be a number between 0 and 1."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( sensitivity === 1 ) {
		m_axesSensitivity = 0.99999;
	} else {
		m_axesSensitivity = sensitivity;
	}
}

/**
 * Register a callback for gamepad connections.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function onGamepadConnected( options ) {
	const fn = options.fn;

	if( typeof fn !== "function" ) {
		const error = new TypeError( "onGamepadConnected: fn must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	m_onConnectHandlers.push( fn );
	startGamepad();
}

/**
 * Register a callback for gamepad disconnections.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function onGamepadDisconnected( options ) {
	const fn = options.fn;

	if( typeof fn !== "function" ) {
		const error = new TypeError( "onGamepadDisconnected: fn must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	m_onDisconnectHandlers.push( fn );
	startGamepad();
}


/*************************************************************************************************
 * Internal Helper Functions
 ************************************************************************************************/


function gamepadConnected( e ) {

	// Record a new pad without consuming edges; the loop reports the press that exposed it
	recordGamepad( e.gamepad );

	// Trigger connect handlers
	const gamepadData = m_gamepads[ e.gamepad.index ];
	for( const handler of m_onConnectHandlers ) {
		handler( gamepadData );
	}
}

function gamepadDisconnected( e ) {

	// Trigger disconnect handlers
	const data = {
		"index": e.gamepad.index,
		"id": e.gamepad.id,
		"mapping": e.gamepad.mapping,
		"connected": e.gamepad.connected
	};

	for( const handler of m_onDisconnectHandlers ) {
		handler( data );
	}

	delete m_gamepads[ e.gamepad.index ];
	delete m_padStates[ e.gamepad.index ];
}

function gamepadLoop() {
	if( !m_isLooping ) {
		return;
	}

	// While the page is hidden, pads keep their released state; the first update after it is
	// visible again records the current state without edges
	if( !m_isHidden ) {
		updateGamepads( !m_isReturning );
		m_isReturning = false;
	}

	m_tick += 1;
	m_gamepadLoopId = requestAnimationFrame( gamepadLoop );
}

function scanForGamepads() {
	let gamepads;

	if( "getGamepads" in navigator ) {
		gamepads = navigator.getGamepads();
	} else if( "webkitGetGamepads" in navigator ) {
		gamepads = navigator.webkitGetGamepads();
	} else {
		gamepads = [];
	}

	// Add any gamepads that are already connected but not in our list
	for( let i = 0; i < gamepads.length; i++ ) {
		if( gamepads[ i ] && !( gamepads[ i ].index in m_gamepads ) ) {
			recordGamepad( gamepads[ i ] );

			// Trigger connect handlers for pre-connected gamepads
			const gamepadData = m_gamepads[ gamepads[ i ].index ];
			for( const handler of m_onConnectHandlers ) {
				handler( gamepadData );
			}
		}
	}
}

/**
 * Update every connected pad from the browser. Only the polling loop and the first read call
 * this; reads never update.
 *
 * @param {boolean} isEdges - Whether changes are accumulated as edges for the next read.
 * @returns {void}
 */
function updateGamepads( isEdges ) {
	let gamepads;

	if( "getGamepads" in navigator ) {
		gamepads = navigator.getGamepads();
	} else if( "webkitGetGamepads" in navigator ) {
		gamepads = navigator.webkitGetGamepads();
	} else {
		gamepads = [];
	}

	for( const gamepad of gamepads ) {
		if( !gamepad || !gamepad.connected ) {
			continue;
		}
		recordGamepad( gamepad );
		updateGamepad( gamepad, isEdges );
	}
}

/**
 * Publish the loop's state to the pad objects on the first read in each frame: the edges
 * accumulated since the last frame with a read, and the axes at the previous read. Every other
 * read in the frame, from any code, sees the same result.
 *
 * @returns {void}
 */
function readGamepads() {
	if( m_lastReadTick === m_tick ) {
		return;
	}
	m_lastReadTick = m_tick;
	for( const index in m_gamepads ) {
		const gamepadData = m_gamepads[ index ];
		const state = m_padStates[ index ];
		const buttons = [];
		for( let i = 0; i < state.buttons.length; i += 1 ) {
			buttons.push( {
				"pressed": state.buttons[ i ].pressed,
				"value": state.buttons[ i ].value,
				"pressStarted": state.pressStarted[ i ] === true,
				"pressReleased": state.pressReleased[ i ] === true
			} );
		}
		gamepadData.buttons = buttons;
		gamepadData.lastAxes = gamepadData.axes;
		gamepadData.axes = state.axes.slice();
		gamepadData.timestamp = state.timestamp;
		gamepadData.connected = state.connected;
		gamepadData.vibrationActuator = state.vibrationActuator;
		state.pressStarted = [];
		state.pressReleased = [];
	}
}

function createNewGamepadData( gamepadDataRaw ) {

	// Create the new gamepad data object
	const newGamepadData = {
		"index": gamepadDataRaw.index,
		"id": gamepadDataRaw.id,
		"connected": gamepadDataRaw.connected,
		"mapping": gamepadDataRaw.mapping,
		"timestamp": gamepadDataRaw.timestamp,
		"vibrationActuator": gamepadDataRaw.vibrationActuator,
		"axes": [],
		"lastAxes": [],
		"buttons": []
	};

	// Helper methods; each is a read, so it publishes the frame's state first
	newGamepadData.getButton = function( buttonIndex ) {
		readGamepads();
		if( buttonIndex < 0 || buttonIndex >= this.buttons.length ) {
			return null;
		}
		return this.buttons[ buttonIndex ];
	};
	newGamepadData.getButtonPressed = function( buttonIndex ) {
		readGamepads();
		if( buttonIndex < 0 || buttonIndex >= this.buttons.length ) {
			return null;
		}
		return this.buttons[ buttonIndex ].pressed;
	};
	newGamepadData.getButtonJustPressed = function( buttonIndex ) {
		readGamepads();
		if( buttonIndex < 0 || buttonIndex >= this.buttons.length ) {
			return false;
		}
		return this.buttons[ buttonIndex ].pressStarted;
	};
	newGamepadData.getButtonJustReleased = function( buttonIndex ) {
		readGamepads();
		if( buttonIndex < 0 || buttonIndex >= this.buttons.length ) {
			return false;
		}
		return this.buttons[ buttonIndex ].pressReleased;
	};
	newGamepadData.getAxis = function( axisIndex ) {
		readGamepads();
		if( axisIndex < 0 || axisIndex >= this.axes.length ) {
			return 0;
		}
		return this.axes[ axisIndex ];
	};
	newGamepadData.getAxisChanged = function( axisIndex ) {
		readGamepads();
		if( axisIndex < 0 || axisIndex >= this.axes.length ) {
			return false;
		}
		const current = this.axes[ axisIndex ];
		const last = this.lastAxes[ axisIndex ] || 0;
		return current !== last;
	};

	return newGamepadData;
}

/**
 * Record a pad that is not tracked yet. It starts with every button released, so a button
 * held when it appears, such as the press that exposed it, is reported by the next update.
 *
 * @param {Gamepad} gamepadRawData - The browser's pad.
 * @returns {void}
 */
function recordGamepad( gamepadRawData ) {
	const index = gamepadRawData.index;
	if( m_gamepads[ index ] ) {
		return;
	}
	const gamepadData = createNewGamepadData( gamepadRawData );
	const state = {
		"buttons": [],
		"axes": [],
		"pressStarted": [],
		"pressReleased": [],
		"timestamp": gamepadRawData.timestamp,
		"connected": gamepadRawData.connected,
		"vibrationActuator": gamepadRawData.vibrationActuator
	};
	for( let i = 0; i < gamepadRawData.buttons.length; i += 1 ) {
		state.buttons.push( { "pressed": false, "value": 0 } );
		gamepadData.buttons.push( {
			"pressed": false, "value": 0, "pressStarted": false, "pressReleased": false
		} );
	}
	for( let i = 0; i < gamepadRawData.axes.length; i += 1 ) {
		state.axes.push( smoothAxis( gamepadRawData.axes[ i ] ) );
	}
	gamepadData.axes = state.axes.slice();
	gamepadData.lastAxes = state.axes.slice();
	m_gamepads[ index ] = gamepadData;
	m_padStates[ index ] = state;
}

/**
 * Update a tracked pad's state from the browser, accumulating presses and releases until the
 * next read. A press and a release between two reads are both kept.
 *
 * @param {Gamepad} gamepadRawData - The browser's pad.
 * @param {boolean} isEdges - Whether changes are accumulated as edges.
 * @returns {void}
 */
function updateGamepad( gamepadRawData, isEdges ) {
	const state = m_padStates[ gamepadRawData.index ];
	for( let i = 0; i < gamepadRawData.buttons.length; i += 1 ) {
		const buttonNew = gamepadRawData.buttons[ i ];
		let wasPressed = false;
		if( state.buttons[ i ] ) {
			wasPressed = state.buttons[ i ].pressed;
		}
		if( isEdges ) {
			if( !wasPressed && buttonNew.pressed ) {
				state.pressStarted[ i ] = true;
			} else if( wasPressed && !buttonNew.pressed ) {
				state.pressReleased[ i ] = true;
			}
		}
		state.buttons[ i ] = { "pressed": buttonNew.pressed, "value": buttonNew.value };
	}
	state.axes = [];
	for( let i = 0; i < gamepadRawData.axes.length; i += 1 ) {
		state.axes.push( smoothAxis( gamepadRawData.axes[ i ] ) );
	}
	state.timestamp = gamepadRawData.timestamp;
	state.connected = gamepadRawData.connected;
	state.vibrationActuator = gamepadRawData.vibrationActuator;
}

function smoothAxis( axis ) {
	if( Math.abs( axis ) < m_axesSensitivity ) {
		return 0;
	}
	axis = axis - Math.sign( axis ) * m_axesSensitivity;
	axis = axis / ( 1 - m_axesSensitivity );
	return axis;
}

/**
 * Release every button, zero the axes, and clear pending edges when the page is hidden, so a
 * button held then is not reported as held or as just released. Updates wait until the page is
 * visible again.
 *
 * @returns {void}
 */
function onVisibilityChange() {
	if( document.visibilityState === "hidden" ) {
		m_isHidden = true;
		for( const index in m_padStates ) {
			const state = m_padStates[ index ];
			for( let i = 0; i < state.buttons.length; i += 1 ) {
				state.buttons[ i ] = { "pressed": false, "value": 0 };
			}
			state.axes = state.axes.map( () => 0 );
			state.pressStarted = [];
			state.pressReleased = [];
		}

		// The next read publishes the released state, even within a frame already read
		m_lastReadTick = -1;
	} else if( m_isHidden ) {
		m_isHidden = false;
		m_isReturning = true;
	}
}

/**
 * Clear all gamepad event handlers
 * Called by clearEvents command
 *
 * @param {Object} [screenData] - Screen data (not used for gamepad events)
 * @returns {void}
 */
function clearGamepadEvents( screenData ) {
	m_onConnectHandlers.length = 0;
	m_onDisconnectHandlers.length = 0;
}

// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "gamepad",
		"version": "1.0.0",
		"description": "Gamepad input handling for Pi.js",
		"init": gamepadPlugin
	} );
}
