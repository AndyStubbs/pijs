/**
 * Gamepad Plugin for Pi.js
 *
 * Provides gamepad input handling including button state tracking, axis handling,
 * and connect/disconnect event management.
 *
 * @module plugins/gamepad
 * @version 2.0.0
 */

"use strict";


/*************************************************************************************************
 * Module State
 ************************************************************************************************/


const m_gamepads = {};

// Per pad: the state the loop last saw, and the edges it accumulated since the last read
const m_padStates = {};

// The list form of inGamepad(): one live array, refilled in place
const m_padList = [];

// The modes of onGamepad() and offGamepad()
const MODES = [ "connect", "disconnect" ];

// Handler registrations by mode: { fn, once, isRemoved }, and for connect handlers `delivered`,
// the pads the handler has received. A registration removed during a dispatch is skipped for the
// rest of it
let m_handlers = { "connect": [], "disconnect": [] };

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
	pluginApi.addCommand( "inGamepad", inGamepad, false, [ "gamepadIndex" ] );
	pluginApi.addCommand(
		"setGamepadSensitivity", setGamepadSensitivity, false, [ "sensitivity" ]
	);
	pluginApi.addCommand( "onGamepad", onGamepad, false, [ "mode", "fn", "once" ] );
	pluginApi.addCommand( "offGamepad", offGamepad, false, [ "mode", "fn" ] );

	// Register clearEvents handler
	pluginApi.registerClearEvents( "gamepad", clearGamepadEvents );
}


/*************************************************************************************************
 * External API Commands
 ************************************************************************************************/


/**
 * Start gamepad polling, adding the connection listeners on the first start. Calling it while
 * polling does nothing. A start after stopGamepad() catches up with the connections made and
 * lost while stopped, and its first update reports no edges.
 *
 * @returns {void}
 */
function startGamepad() {

	// Remove explicit stops
	m_isStopped = false;
	if( m_isLooping ) {
		return;
	}

	// Schedule the loop before the connection handlers run, so a failing one cannot leave it off
	m_isLooping = true;
	m_gamepadLoopId = requestAnimationFrame( gamepadLoop );

	if( !m_isInitialized ) {
		window.addEventListener( "gamepadconnected", gamepadConnected );
		window.addEventListener( "gamepaddisconnected", gamepadDisconnected );

		// Release pads when the page is hidden. Blur changes nothing: browsers keep delivering
		// gamepad input to a visible page without focus
		document.addEventListener( "visibilitychange", onVisibilityChange );
		m_isInitialized = true;
	} else {

		// Buttons held through the stop read as pressed, not as just pressed
		m_isReturning = true;
	}
	syncConnections();
}

/**
 * Start polling on first use: a read or a handler registration. After stopGamepad(), only
 * startGamepad() starts it again.
 *
 * @returns {void}
 */
function startGamepadInternal() {
	if( !m_isStopped ) {
		startGamepad();
	}
}

/**
 * Stop gamepad polling until startGamepad(). Every button is released and the axes read 0,
 * without reporting a release, as when the page is hidden; connection handlers are not called
 * while stopped.
 *
 * @returns {void}
 */
function stopGamepad() {
	m_isStopped = true;
	if( m_isLooping ) {
		m_isLooping = false;
		if( m_gamepadLoopId ) {
			cancelAnimationFrame( m_gamepadLoopId );
			m_gamepadLoopId = null;
		}
	}
	releasePads();
}

/**
 * Read one gamepad, or every connected gamepad. The list form always returns the same live
 * array, refilled in index order, and empty while polling is stopped; the index form returns
 * the pad, or null when no pad has the index or polling is stopped. The first read starts
 * polling, unless it was stopped, and records the current state without edges.
 *
 * @param {Object} options - Command options.
 * @returns {Object|Array<Object>|null}
 */
function inGamepad( options ) {
	const gamepadIndex = options.gamepadIndex;
	const isList = gamepadIndex === null || gamepadIndex === undefined;
	if( !isList && ( !Number.isInteger( gamepadIndex ) || gamepadIndex < 0 ) ) {
		const error = new TypeError(
			"inGamepad: gamepadIndex must be a non-negative integer or null."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// While stopped, reads return empty state and do not restart polling
	if( m_isStopped ) {
		if( isList ) {
			m_padList.length = 0;
			return m_padList;
		}
		return null;
	}
	if( !m_isLooping ) {
		startGamepad();
		updateGamepads( false );
	}
	readGamepads();

	if( isList ) {
		m_padList.length = 0;
		for( const index in m_gamepads ) {
			m_padList.push( m_gamepads[ index ] );
		}
		return m_padList;
	}
	const gamepadData = m_gamepads[ gamepadIndex ];
	if( gamepadData === undefined ) {
		return null;
	}
	return gamepadData;
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
 * Register a callback for gamepad connections or disconnections. A connect callback also
 * receives the pads that are already connected, once each. A handler is identified by its mode
 * and function, so registering the same function for the same mode again does nothing.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function onGamepad( options ) {
	const mode = options.mode;
	const fn = options.fn;
	checkMode( "onGamepad", mode );
	checkFunction( "onGamepad", fn );

	let handler = null;
	for( const registered of m_handlers[ mode ] ) {
		if( registered.fn === fn ) {
			handler = registered;
		}
	}
	if( handler === null ) {
		handler = { "fn": fn, "once": !!( options.once ), "isRemoved": false };
		if( mode === "connect" ) {
			handler.delivered = new WeakSet();
		}
		m_handlers[ mode ].push( handler );
	}

	// While stopped, a connect handler receives the connected pads when polling starts again
	startGamepadInternal();
	if( m_isStopped ) {
		return;
	}
	if( mode === "connect" ) {
		if( m_dispatchDepth > 0 ) {
			m_pendingReplays.push( handler );
		} else {
			replayConnected( handler );
		}
	}
}

/**
 * Remove gamepad callbacks by mode and function. Without a function, every callback of the mode
 * is removed; without a mode, the function is removed from both modes. Omitting both throws.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function offGamepad( options ) {
	const mode = options.mode;
	const fn = options.fn;
	if( mode == null && fn == null ) {
		throwCode(
			TypeError,
			"offGamepad: mode or fn is required. To remove every handler, call " +
			"clearEvents( \"gamepad\" ).",
			"INVALID_MODE"
		);
	}
	let modes = MODES;
	if( mode != null ) {
		checkMode( "offGamepad", mode );
		modes = [ mode ];
	}
	if( fn != null ) {
		checkFunction( "offGamepad", fn );
	}
	for( const eachMode of modes ) {
		for( const handler of m_handlers[ eachMode ].slice() ) {
			if( fn == null || handler.fn === fn ) {
				removeHandler( eachMode, handler );
			}
		}
	}
}


/*************************************************************************************************
 * Internal Helper Functions
 ************************************************************************************************/


/**
 * Throw a validation error with an error code.
 *
 * @param {Function} ErrorType - `TypeError` or `RangeError`.
 * @param {string} message - Error message, starting with the command name.
 * @param {string} code - Error code.
 * @returns {never}
 */
function throwCode( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}

/**
 * Check a handler mode: `TypeError` for a mode that is not a string, `RangeError` for another
 * string, both with code `INVALID_MODE`.
 *
 * @param {string} command - Command name for error messages.
 * @param {*} mode - Requested mode.
 * @returns {void}
 */
function checkMode( command, mode ) {
	const message = `${command}: mode must be "connect" or "disconnect".`;
	if( typeof mode !== "string" ) {
		throwCode( TypeError, message, "INVALID_MODE" );
	}
	if( !MODES.includes( mode ) ) {
		throwCode( RangeError, message, "INVALID_MODE" );
	}
}

/**
 * Check a handler function.
 *
 * @param {string} command - Command name for error messages.
 * @param {*} fn - Requested handler.
 * @returns {void}
 */
function checkFunction( command, fn ) {
	if( typeof fn !== "function" ) {
		throwCode( TypeError, `${command}: fn must be a function.`, "INVALID_FUNCTION" );
	}
}

/**
 * Remove one registration. It is marked removed so a dispatch already in progress skips it.
 *
 * @param {string} mode - Mode of the registration.
 * @param {Object} handler - The registration.
 * @returns {void}
 */
function removeHandler( mode, handler ) {
	handler.isRemoved = true;
	const index = m_handlers[ mode ].indexOf( handler );
	if( index !== -1 ) {
		m_handlers[ mode ].splice( index, 1 );
	}
}


function gamepadConnected( e ) {

	// While stopped, the next start catches up with the connection
	if( m_isStopped ) {
		return;
	}

	// Record a new pad without consuming edges; the loop reports the press that exposed it
	recordGamepad( e.gamepad );

	// Trigger connect handlers. A handler that already received this pad, from the scan, a
	// replay, or an earlier event for the same connection, is not called again
	dispatch( m_handlers.connect, "connect", m_gamepads[ e.gamepad.index ] );
}

function gamepadDisconnected( e ) {

	// While stopped, the next start catches up with the disconnection
	if( m_isStopped ) {
		return;
	}
	removeGamepad( e.gamepad );
}

/**
 * Remove a pad from the list and call the disconnect handlers. The pad leaves the list before
 * the handlers run, so a failing handler cannot keep it.
 *
 * @param {Object} gamepad - The browser's pad, or the tracked pad data.
 * @returns {void}
 */
function removeGamepad( gamepad ) {
	const data = {
		"index": gamepad.index,
		"id": gamepad.id,
		"mapping": gamepad.mapping,
		"connected": false
	};
	delete m_gamepads[ gamepad.index ];
	delete m_padStates[ gamepad.index ];
	dispatch( m_handlers.disconnect, "disconnect", data );
}

/**
 * Call each handler with the data. Handlers added during the dispatch first run in the next
 * one, and a handler removed during it does not run later in it. A connect handler receives
 * each pad once. A `once` handler is removed before it runs. A handler that throws is reported
 * with `console.error`, and the others still run.
 *
 * @param {Array<Object>} handlers - Handler registrations.
 * @param {string} mode - `"connect"` or `"disconnect"`.
 * @param {Object} data - Data passed to each handler.
 * @returns {void}
 */
function dispatch( handlers, mode, data ) {
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
		if( handler.once ) {
			removeHandler( mode, handler );
		}
		try {
			handler.fn( data );
		} catch( error ) {
			console.error( `onGamepad: Handler for "${mode}" failed:`, error );
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
		dispatch( [ handler ], "connect", gamepadData );
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

/**
 * Bring the pad list in line with the browser when polling starts: pads that are gone are
 * removed through the disconnect handlers, new pads are recorded, and every connect handler
 * receives each connected pad it has not received yet, in index order.
 *
 * @returns {void}
 */
function syncConnections() {
	const present = {};
	for( const gamepad of getBrowserGamepads() ) {
		if( gamepad && gamepad.connected ) {
			present[ gamepad.index ] = true;
			recordGamepad( gamepad );
		}
	}
	for( const gamepadData of Object.values( m_gamepads ) ) {
		if( !present[ gamepadData.index ] ) {
			removeGamepad( gamepadData );
		}
	}
	for( const gamepadData of Object.values( m_gamepads ) ) {
		dispatch( m_handlers.connect, "connect", gamepadData );
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
		releasePads();
	} else if( m_isHidden ) {
		m_isHidden = false;
		m_isReturning = true;
	}
}

/**
 * Release every button, zero the axes, and clear pending edges, for a hidden page or a stop.
 * The next read publishes the released state, even within a frame already read.
 *
 * @returns {void}
 */
function releasePads() {
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
	m_lastReadTick = -1;
}

/**
 * Clear all gamepad event handlers
 * Called by clearEvents command
 *
 * @param {Object} [screenData] - Screen data (not used for gamepad events)
 * @returns {void}
 */
function clearGamepadEvents( screenData ) {
	for( const handler of m_handlers.connect.concat( m_handlers.disconnect ) ) {
		handler.isRemoved = true;
	}
	m_handlers = { "connect": [], "disconnect": [] };
}

// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "gamepad",
		"version": "2.0.0",
		"description": "Gamepad input handling for Pi.js",
		"init": gamepadPlugin
	} );
}
