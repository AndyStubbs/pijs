/**
 * Pi.js - Gamepad Module
 * 
 * Global gamepad input handling independent of screens.
 * 
 * @module modules/gamepad
 */

"use strict";

import * as commands from "../core/commands";


/***************************************************************************************************
 * Module State
 **************************************************************************************************/


const m_gamepads = {};
const m_onConnectHandlers = [];
const m_onDisconnectHandlers = [];

let m_isInitialized = false;
let m_isLooping = false;
let m_gamepadLoopId = null;
let m_axesSensitivity = 0.2;
let m_tick = 0;
let m_lastGamepadUpdateTick = -1;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {

	// Add window blur/focus handlers
	window.addEventListener( "blur", onWindowBlur );
	window.addEventListener( "focus", onWindowFocus );
}

/**
 * Clear all gamepad event handlers
 * Called by clearEvents command
 */
export function clearGamepadEvents() {
	m_onConnectHandlers.length = 0;
	m_onDisconnectHandlers.length = 0;
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


commands.addCommand( "startGamepad", startGamepad, [] );
function startGamepad() {
	if( !m_isInitialized ) {
		window.addEventListener( "gamepadconnected", gamepadConnected );
		window.addEventListener( "gamepaddisconnected", gamepadDisconnected );
		m_isInitialized = true;
	}

	if( !m_isLooping ) {
		m_isLooping = true;
		m_gamepadLoopId = requestAnimationFrame( gamepadLoop );
	}
}

commands.addCommand( "stopGamepad", stopGamepad, [] );
function stopGamepad() {
	if( m_isLooping ) {
		m_isLooping = false;
		if( m_gamepadLoopId ) {
			cancelAnimationFrame( m_gamepadLoopId );
			m_gamepadLoopId = null;
		}
	}
}

commands.addCommand( "ingamepad", ingamepad, [ "gamepadIndex" ] );
function ingamepad( options ) {
	const gamepadIndex = options.gamepadIndex;

	startGamepad();
	updateGamepads();

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

commands.addCommand( "setGamepadSensitivity", setGamepadSensitivity, [ "sensitivity" ] );
function setGamepadSensitivity( options ) {
	const sensitivity = options.sensitivity;

	if( typeof sensitivity !== "number" || sensitivity < 0 || sensitivity > 1 ) {
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

commands.addCommand( "onGamepadConnected", onGamepadConnected, [ "fn" ] );
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

commands.addCommand( "onGamepadDisconnected", onGamepadDisconnected, [ "fn" ] );
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


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


function gamepadConnected( e ) {

	updateGamepad( e.gamepad );

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
}

function gamepadLoop() {
	if( !m_isLooping ) {
		return;
	}

	updateGamepads();

	m_tick += 1;
	m_gamepadLoopId = requestAnimationFrame( gamepadLoop );
}

function updateGamepads() {
	let gamepads;

	// Prevent updateGamepads from triggering multiple times in the same loop
	if( m_lastGamepadUpdateTick === m_tick ) {
		return;
	}
	m_lastGamepadUpdateTick = m_tick;

	if( "getGamepads" in navigator ) {
		gamepads = navigator.getGamepads();
	} else if( "webkitGetGamepads" in navigator ) {
		gamepads = navigator.webkitGetGamepads();
	} else {
		gamepads = [];
	}

	for( let i = 0; i < gamepads.length; i++ ) {
		if( gamepads[ i ] && gamepads[ i ].index in m_gamepads ) {
			updateGamepad( gamepads[ i ] );
		}
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

	// Attach event listeners with helper functions
	newGamepadData.getButton = function( buttonIndex ) {
		if( buttonIndex < 0 || buttonIndex >= this.buttons.length ) {
			return null;
		}
		return this.buttons[ buttonIndex ];
	};
	newGamepadData.getButtonPressed = function ( buttonIndex ) {
		if( buttonIndex < 0 || buttonIndex >= this.buttons.length ) {
			return null;
		}
		return this.buttons[ buttonIndex ].pressed;
	}
	newGamepadData.getButtonJustPressed = function( buttonIndex ) {
		if( buttonIndex < 0 || buttonIndex >= this.buttons.length ) {
			return false;
		}
		return this.buttons[ buttonIndex ].pressStarted;
	};
	newGamepadData.getButtonJustReleased = function( buttonIndex ) {
		if( buttonIndex < 0 || buttonIndex >= this.buttons.length ) {
			return false;
		}
		return this.buttons[ buttonIndex ].pressReleased;
	};
	newGamepadData.getAxis = function( axisIndex ) {
		if( axisIndex < 0 || axisIndex >= this.axes.length ) {
			return 0;
		}
		return this.axes[ axisIndex ];
	};
	newGamepadData.getAxisChanged = function( axisIndex ) {
		if( axisIndex < 0 || axisIndex >= this.axes.length ) {
			return false;
		}
		const current = this.axes[ axisIndex ];
		const last = this.lastAxes[ axisIndex ] || 0;
		return current !== last;
	};

	return newGamepadData;
}

function updateGamepad( gamepadRawData ) {
	let gamepadData = m_gamepads[ gamepadRawData.index ];
	if( !gamepadData ) {
		gamepadData = createNewGamepadData( gamepadRawData );
		m_gamepads[ gamepadRawData.index ] = gamepadData;
	}

	// Update buttons
	const newButtons = [];
	for( let i = 0; i < gamepadRawData.buttons.length; i += 1 ) {
		const buttonNew = gamepadRawData.buttons[ i ];
		const buttonOld = gamepadData.buttons[ i ] || { "pressed": false };
		newButtons.push( {
			"pressed": buttonNew.pressed,
			"value": buttonNew.value,
			"pressStarted": !buttonOld.pressed && buttonNew.pressed,
			"pressReleased": buttonOld.pressed && !buttonNew.pressed
		} );
	}
	gamepadData.buttons = newButtons;

	// Update Axes
	gamepadData.lastAxes = gamepadData.axes.slice();
	gamepadData.axes = [];
	for( let i = 0; i < gamepadRawData.axes.length; i++ ) {
		gamepadData.axes.push( smoothAxis( gamepadRawData.axes[ i ] ) );
	}

	// Update Raw Data
	gamepadData.timestamp = gamepadRawData.timestamp;
	gamepadData.connected = gamepadRawData.connected;
	gamepadData.vibrationActuator = gamepadRawData.vibrationActuator;

}

function smoothAxis( axis ) {
	if( Math.abs( axis ) < m_axesSensitivity ) {
		return 0;
	}
	axis = axis - Math.sign( axis ) * m_axesSensitivity;
	axis = axis / ( 1 - m_axesSensitivity );
	return axis;
}

function onWindowBlur() {

	// Pause gamepad loop when window loses focus
	if( m_isLooping ) {
		if( m_gamepadLoopId ) {
			cancelAnimationFrame( m_gamepadLoopId );
			m_gamepadLoopId = null;
		}
	}
}

function onWindowFocus() {

	// Resume gamepad loop when window regains focus
	if( m_isLooping && !m_gamepadLoopId ) {
		m_gamepadLoopId = requestAnimationFrame( gamepadLoop );
	}
}