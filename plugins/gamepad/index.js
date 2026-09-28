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

// The list form of ingamepad(): one live array, refilled in place
const m_padList = [];

// Handler registrations: { fn, isRemoved }, and for connect handlers `delivered`, the pads the
// handler has received. A registration removed during a dispatch is skipped for the rest of it
let m_onConnectHandlers = [];
let m_onDisconnectHandlers = [];

// Connect handlers registered during a dispatch receive the connected pads after it ends
let m_dispatchDepth = 0;
const m_pendingReplays = [];

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
 * Register gamepad commands. Listeners are added when polling first starts, so a page that
 * never uses a gamepad attaches none.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @returns {void}
 */
export default function gamepadPlugin( pluginApi ) {

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

	// Remove explicit stops
	m_isStopped = false;

	// Schedule the loop before the scan, so a failing connect handler cannot leave it off
	if( !m_isLooping ) {
		m_isLooping = true;
		m_gamepadLoopId = requestAnimationFrame( gamepadLoop );
	}

	if( !m_isInitialized ) {
		window.addEventListener( "gamepadconnected", gamepadConnected );
		window.addEventListener( "gamepaddisconnected", gamepadDisconnected );

		// Release pads when the page is hidden. Blur changes nothing: browsers keep delivering
		// gamepad input to a visible page without focus
		document.addEventListener( "visibilitychange", onVisibilityChange );
		m_isInitialized = true;

		// Scan for already-connected gamepads
		scanForGamepads();
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

	// If no index specified, return all gamepads in index order, in the same live array
	if( gamepadIndex === null || gamepadIndex === undefined ) {
		m_padList.length = 0;
		for( const index in m_gamepads ) {
			m_padList.push( m_gamepads[ index ] );
		}
		return m_padList;
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
 * Register a callback for gamepad connections. The callback also receives the pads that are
 * already connected, once each.
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

	const handler = { "fn": fn, "isRemoved": false, "delivered": new WeakSet() };
	m_onConnectHandlers.push( handler );
	startGamepad();
	if( m_dispatchDepth > 0 ) {
		m_pendingReplays.push( handler );
	} else {
		replayConnected( handler );
	}
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

	m_onDisconnectHandlers.push( { "fn": fn, "isRemoved": false } );
	startGamepad();
}


/*************************************************************************************************
 * Internal Helper Functions
 ************************************************************************************************/


function gamepadConnected( e ) {

	// Record a new pad without consuming edges; the loop reports the press that exposed it
	recordGamepad( e.gamepad );

	// Trigger connect handlers. A handler that already received this pad, from the scan, a
	// replay, or an earlier event for the same connection, is not called again
	dispatch( m_onConnectHandlers, m_gamepads[ e.gamepad.index ], "onGamepadConnected" );
}

function gamepadDisconnected( e ) {
	const data = {
		"index": e.gamepad.index,
		"id": e.gamepad.id,
		"mapping": e.gamepad.mapping,
		"connected": e.gamepad.connected
	};

	// The pad leaves the list before the handlers run, so a failing handler cannot keep it
	delete m_gamepads[ e.gamepad.index ];
	delete m_padStates[ e.gamepad.index ];

	// Trigger disconnect handlers
	dispatch( m_onDisconnectHandlers, data, "onGamepadDisconnected" );
}

/**
 * Call each handler with the data. Handlers added during the dispatch first run in the next
 * one, and a handler removed during it does not run later in it. A connect handler receives
 * each pad once. A handler that throws is reported with `console.error`, and the others still
 * run.
 *
 * @param {Array<Object>} handlers - Handler registrations.
 * @param {Object} data - Data passed to each handler.
 * @param {string} command - Command that registered the handlers, for error messages.
 * @returns {void}
 */
function dispatch( handlers, data, command ) {
	m_dispatchDepth += 1;
	for( const handler of handlers.slice() ) {
		if( handler.isRemoved ) {
			continue;
		}
		if( handler.delivered ) {
			if( handler.delivered.has( data ) ) {
				continue;
			}
			handler.delivered.add( data );
		}
		try {
			handler.fn( data );
		} catch( error ) {
			console.error( `${command}: Handler failed:`, error );
		}
	}
	m_dispatchDepth -= 1;
	if( m_dispatchDepth === 0 ) {
		while( m_pendingReplays.length > 0 ) {
			replayConnected( m_pendingReplays.shift() );
		}
	}
}

/**
 * Deliver the pads already connected to a new connect handler, in index order. A pad the
 * handler already received, such as from the start-up scan, is skipped.
 *
 * @param {Object} handler - Connect handler registration.
 * @returns {void}
 */
function replayConnected( handler ) {
	for( const gamepadData of Object.values( m_gamepads ) ) {
		dispatch( [ handler ], gamepadData, "onGamepadConnected" );
	}
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

/**
 * The browser's pad list, with `null` for empty slots, or an empty list without the Gamepad API.
 *
 * @returns {Array<Gamepad|null>}
 */
function getBrowserGamepads() {
	if( "getGamepads" in navigator ) {
		return navigator.getGamepads();
	}
	return [];
}

function scanForGamepads() {
	const gamepads = getBrowserGamepads();

	// Add any gamepads that are already connected but not in our list, then tell the handlers
	const found = [];
	for( let i = 0; i < gamepads.length; i++ ) {
		if( gamepads[ i ] && !( gamepads[ i ].index in m_gamepads ) ) {
			recordGamepad( gamepads[ i ] );
			found.push( m_gamepads[ gamepads[ i ].index ] );
		}
	}
	for( const gamepadData of found ) {
		dispatch( m_onConnectHandlers, gamepadData, "onGamepadConnected" );
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
	const gamepads = getBrowserGamepads();

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
 * read in the frame, from any code, sees the same result. Pads are live: their `buttons`, each
 * button, `axes`, and `lastAxes` are updated in place.
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
		const buttons = gamepadData.buttons;
		for( let i = 0; i < state.buttons.length; i += 1 ) {
			if( !buttons[ i ] ) {
				buttons[ i ] = {
					"pressed": false, "value": 0, "pressStarted": false, "pressReleased": false
				};
			}
			buttons[ i ].pressed = state.buttons[ i ].pressed;
			buttons[ i ].value = state.buttons[ i ].value;
			buttons[ i ].pressStarted = state.pressStarted[ i ] === true;
			buttons[ i ].pressReleased = state.pressReleased[ i ] === true;
		}
		buttons.length = state.buttons.length;
		copyArray( gamepadData.axes, gamepadData.lastAxes );
		copyArray( state.axes, gamepadData.axes );
		gamepadData.timestamp = state.timestamp;
		gamepadData.connected = state.connected;
		gamepadData.vibrationActuator = state.vibrationActuator;
		state.pressStarted.length = 0;
		state.pressReleased.length = 0;
	}
}

/**
 * Copy one array into another in place.
 *
 * @param {Array<number>} source - Values to copy.
 * @param {Array<number>} target - Array that receives them and takes their length.
 * @returns {void}
 */
function copyArray( source, target ) {
	for( let i = 0; i < source.length; i += 1 ) {
		target[ i ] = source[ i ];
	}
	target.length = source.length;
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
 * Update a tracked pad's state from the browser, in place, accumulating presses and releases
 * until the next read. A press and a release between two reads are both kept.
 *
 * @param {Gamepad} gamepadRawData - The browser's pad.
 * @param {boolean} isEdges - Whether changes are accumulated as edges.
 * @returns {void}
 */
function updateGamepad( gamepadRawData, isEdges ) {
	const state = m_padStates[ gamepadRawData.index ];
	for( let i = 0; i < gamepadRawData.buttons.length; i += 1 ) {
		const buttonNew = gamepadRawData.buttons[ i ];
		if( !state.buttons[ i ] ) {
			state.buttons[ i ] = { "pressed": false, "value": 0 };
		}
		const button = state.buttons[ i ];
		if( isEdges ) {
			if( !button.pressed && buttonNew.pressed ) {
				state.pressStarted[ i ] = true;
			} else if( button.pressed && !buttonNew.pressed ) {
				state.pressReleased[ i ] = true;
			}
		}
		button.pressed = buttonNew.pressed;
		button.value = buttonNew.value;
	}
	state.buttons.length = gamepadRawData.buttons.length;
	for( let i = 0; i < gamepadRawData.axes.length; i += 1 ) {
		state.axes[ i ] = smoothAxis( gamepadRawData.axes[ i ] );
	}
	state.axes.length = gamepadRawData.axes.length;
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
			for( const button of state.buttons ) {
				button.pressed = false;
				button.value = 0;
			}
			state.axes.fill( 0 );
			state.pressStarted.length = 0;
			state.pressReleased.length = 0;
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
	for( const handler of m_onConnectHandlers.concat( m_onDisconnectHandlers ) ) {
		handler.isRemoved = true;
	}
	m_onConnectHandlers = [];
	m_onDisconnectHandlers = [];
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
