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


const m_controllers = {};
const m_controllerArr = [];
const m_onGamepadHandlers = {};

let m_isInitialized = false;
let m_isLooping = false;
let m_gamepadLoopId = null;
let m_axesSensitivity = 0.2;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {

	// Add window blur/focus handlers
	window.addEventListener( "blur", onWindowBlur );
	window.addEventListener( "focus", onWindowFocus );
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
	updateControllers();

	// If no index specified, return all gamepads
	if( gamepadIndex === null || gamepadIndex === undefined ) {
		return m_controllerArr;
	}

	// Validate gamepadIndex
	if( !Number.isInteger( gamepadIndex ) || gamepadIndex < 0 ) {
		const error = new TypeError(
			"ingamepad: gamepadIndex must be a non-negative integer or null."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Return specific gamepad or empty object if not found
	const gamepad = m_controllerArr.find( gp => gp.index === gamepadIndex );
	return gamepad || null;
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

	m_axesSensitivity = sensitivity;
}

commands.addCommand(
	"ongamepad", ongamepad,[ "gamepadIndex", "mode", "item", "fn", "once", "allowRepeat" ]
);
function ongamepad( options ) {
	const gamepadIndex = options.gamepadIndex !== undefined ? options.gamepadIndex : 0;
	const mode = options.mode;
	const item = options.item;
	const fn = options.fn;
	const once = !!options.once;
	const allowRepeat = !!options.allowRepeat;

	// Validate gamepadIndex
	if( !Number.isInteger( gamepadIndex ) || gamepadIndex < 0 ) {
		const error = new TypeError( "ongamepad: gamepadIndex must be a non-negative integer." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Validate mode
	const validModes = [ "down", "up", "pressed", "axis", "connect", "disconnect" ];
	if( !validModes.includes( mode ) ) {
		const error = new Error(
			`ongamepad: mode must be one of: ${validModes.join( ", " )}.`
		);
		error.code = "INVALID_MODE";
		throw error;
	}

	// Validate function
	if( typeof fn !== "function" ) {
		const error = new TypeError( "ongamepad: fn must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Process item (button/axis index)
	let items = null;
	if( mode === "connect" || mode === "disconnect" ) {
		items = null;
	} else if( mode === "axis" ) {
		if( item === null || item === undefined ) {
			items = "all";
		} else if( !Number.isInteger( item ) || item < 0 ) {
			const error = new TypeError(
				"ongamepad: item must be a non-negative integer or null for axis mode."
			);
			error.code = "INVALID_PARAMETERS";
			throw error;
		} else {
			items = [ item ];
		}
	} else {

		// Handle button modes (down, up, pressed)
		if( item === "any" || item === undefined ) {
			items = "any";
		} else if( Number.isInteger( item ) && item >= 0 ) {
			items = [ item ];
		} else if( Array.isArray( item ) ) {
			items = item;
			for( const i of items ) {
				if( !Number.isInteger( i ) || i < 0 ) {
					const error = new TypeError(
						"ongamepad: item array must contain non-negative integers."
					);
					error.code = "INVALID_PARAMETERS";
					throw error;
				}
			}
		} else {
			const error = new TypeError( "ongamepad: item must be a number, array, or 'any'." );
			error.code = "INVALID_PARAMETERS";
			throw error;
		}
	}

	const itemKey = ( items === "any" || items === "all" ) ? items : items?.join( "_" ) || "none";
	const handlerKey = `${gamepadIndex}_${mode}_${itemKey}`;

	const handler = {
		"gamepadIndex": gamepadIndex,
		"mode": mode,
		"items": items,
		"fn": fn,
		"once": once,
		"allowRepeat": allowRepeat,
		"handlerKey": handlerKey
	};

	if( !m_onGamepadHandlers[ handlerKey ] ) {
		m_onGamepadHandlers[ handlerKey ] = [];
	}

	m_onGamepadHandlers[ handlerKey ].push( handler );

	// Start gamepad
	startGamepad();
}

commands.addCommand( "offgamepad", offgamepad, [ "gamepadIndex", "mode", "item", "fn" ] );
function offgamepad( options ) {
	const gamepadIndex = options.gamepadIndex !== undefined ? options.gamepadIndex : 0;
	const mode = options.mode;
	const item = options.item;
	const fn = options.fn;

	// Validate function
	if( typeof fn !== "function" ) {
		const error = new TypeError( "offgamepad: fn must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Process item
	let items = null;
	if( mode === "connect" || mode === "disconnect" ) {
		items = null;
	} else if( mode === "axis" ) {
		if( item === null || item === undefined ) {
			items = "all";
		} else {
			items = [ item ];
		}
	} else {
		if( item === "any" || item === undefined ) {
			items = "any";
		} else if( Number.isInteger( item ) ) {
			items = [ item ];
		} else if( Array.isArray( item ) ) {
			items = item;
		}
	}

	const itemKey = ( items === "any" || items === "all" ) ? items : items?.join( "_" ) || "none";
	const handlerKey = `${gamepadIndex}_${mode}_${itemKey}`;

	if( !m_onGamepadHandlers[ handlerKey ] ) {
		return;
	}

	// Remove specific handler
	const handlers = m_onGamepadHandlers[ handlerKey ];
	for( let i = handlers.length - 1; i >= 0; i-- ) {
		if( handlers[ i ].fn === fn ) {
			handlers.splice( i, 1 );
		}
	}

	// Clean up empty array
	if( handlers.length === 0 ) {
		delete m_onGamepadHandlers[ handlerKey ];
	}
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


function gamepadConnected( e ) {
	m_controllers[ e.gamepad.index ] = e.gamepad;
	e.gamepad.controllerIndex = m_controllerArr.length;
	m_controllerArr.push( e.gamepad );
	updateController( e.gamepad );

	// Trigger connect handlers
	triggerConnectionHandlers( "connect", e.gamepad.index );
}

function gamepadDisconnected( e ) {
	const controllerIndex = m_controllers[ e.gamepad.index ].controllerIndex;
	m_controllerArr.splice( controllerIndex, 1 );

	// Update controller indices
	for( let i = controllerIndex; i < m_controllerArr.length; i++ ) {
		m_controllerArr[ i ].controllerIndex = i;
	}

	// Trigger disconnect handlers
	triggerConnectionHandlers( "disconnect", e.gamepad.index );

	delete m_controllers[ e.gamepad.index ];
}

function gamepadLoop() {
	if( !m_isLooping ) {
		return;
	}

	updateControllers();
	triggerGamepadHandlers();

	m_gamepadLoopId = requestAnimationFrame( gamepadLoop );
}

function updateControllers() {
	let gamepads;

	if( "getGamepads" in navigator ) {
		gamepads = navigator.getGamepads();
	} else if( "webkitGetGamepads" in navigator ) {
		gamepads = navigator.webkitGetGamepads();
	} else {
		gamepads = [];
	}

	for( let i = 0; i < gamepads.length; i++ ) {
		if( gamepads[ i ] && gamepads[ i ].index in m_controllers ) {
			updateController( gamepads[ i ] );
		}
	}
}

function updateController( gamepad ) {
	const controller = m_controllers[ gamepad.index ];
	const controllerIndex = controller.controllerIndex;
	gamepad.controllerIndex = controllerIndex;

	// Update button states (pressed/released)
	const buttons = controller.buttons;
	for( let i = 0; i < buttons.length; i++ ) {
		const button1 = buttons[ i ];
		const button2 = gamepad.buttons[ i ];

		if( button1.pressed && !button2.pressed ) {
			button2.pressReleased = true;
		} else {
			button2.pressReleased = false;
		}

		if( !button1.pressed && button2.pressed ) {
			button2.pressStarted = true;
		} else {
			button2.pressStarted = false;
		}
	}

	// Save previous calibrated axes
	gamepad.lastAxes2 = controller.axes2 || [];

	// Calibrate axis sensitivity
	gamepad.axes2 = [];
	for( let i = 0; i < gamepad.axes.length; i++ ) {
		gamepad.axes2.push( smoothAxis( gamepad.axes[ i ] ) );
	}

	// Update controller storage
	m_controllers[ gamepad.index ] = gamepad;
	m_controllerArr[ controllerIndex ] = gamepad;
}

function smoothAxis( axis ) {
	if( Math.abs( axis ) < m_axesSensitivity ) {
		return 0;
	}
	axis = axis - Math.sign( axis ) * m_axesSensitivity;
	axis = axis / ( 1 - m_axesSensitivity );
	return axis;
}

function triggerConnectionHandlers( mode, gamepadIndex ) {
	const handlerKey = `${gamepadIndex}_${mode}_none`;
	const handlers = m_onGamepadHandlers[ handlerKey ];

	if( !handlers ) {
		return;
	}

	const handlersCopy = handlers.slice();
	const toRemove = [];

	for( let i = 0; i < handlersCopy.length; i++ ) {
		const handler = handlersCopy[ i ];

		// TODO: Optimization this is O(N^2)
		// Check if handler was already removed
		if( !handlers.includes( handler ) ) {
			continue;
		}

		const data = {
			"index": gamepadIndex,
			"type": "gamepad"
		};

		handler.fn( data );

		if( handler.once ) {
			toRemove.push( handler );
		}
	}

	// Remove one-time handlers
	if( toRemove.length > 0 ) {
		for( const handler of toRemove ) {
			const index = handlers.indexOf( handler );
			if( index !== -1 ) {
				handlers.splice( index, 1 );
			}
		}

		if( handlers.length === 0 ) {
			delete m_onGamepadHandlers[ handlerKey ];
		}
	}
}

function triggerGamepadHandlers() {

	// Loop through all handler groups
	for( const handlerKey in m_onGamepadHandlers ) {
		const handlers = m_onGamepadHandlers[ handlerKey ];
		if( !handlers || handlers.length === 0 ) {
			continue;
		}

		const firstHandler = handlers[ 0 ];
		const mode = firstHandler.mode;
		const gamepadIndex = firstHandler.gamepadIndex;
		const items = firstHandler.items;

		// Skip connection events (handled separately)
		if( mode === "connect" || mode === "disconnect" ) {
			continue;
		}

		// Skip if gamepad doesn't exist
		if( gamepadIndex >= m_controllerArr.length ) {
			continue;
		}

		const gamepad = m_controllerArr[ gamepadIndex ];

		if( mode === "axis" ) {
			triggerAxisHandlers( gamepad, items, handlers );
		} else {
			triggerButtonHandlers( gamepad, items, mode, handlers );
		}
	}
}

function triggerAxisHandlers( gamepad, items, handlers ) {
	if( !gamepad.axes2 ) {
		return;
	}

	const handlersCopy = handlers.slice();
	const toRemove = [];

	// Determine which axes to check
	let axesToCheck = [];
	if( items === "all" ) {

		// Check all axes
		for( let i = 0; i < gamepad.axes2.length; i++ ) {
			axesToCheck.push( i );
		}
	} else {

		// Check specific axis
		axesToCheck = items;
	}

	// Check for changed axes
	const changedAxes = [];
	for( const axisIndex of axesToCheck ) {
		if( axisIndex >= gamepad.axes2.length ) {
			continue;
		}

		const currentValue = gamepad.axes2[ axisIndex ];
		const lastValue = gamepad.lastAxes2[ axisIndex ] || 0;

		if( currentValue !== lastValue ) {
			changedAxes.push( {
				"index": axisIndex,
				"value": currentValue,
				"lastValue": lastValue
			} );
		}
	}

	// Trigger handlers for changed axes
	if( changedAxes.length > 0 ) {
		for( let i = 0; i < handlersCopy.length; i++ ) {
			const handler = handlersCopy[ i ];

			// TODO: Optimization this is O(N^2)
			// Check if handler was already removed
			if( !handlers.includes( handler ) ) {
				continue;
			}

			// For "all" mode, pass array of all changed axes
			if( items === "all" ) {
				handler.fn( changedAxes );
			} else {

				// For single axis, pass just the value
				handler.fn( changedAxes[ 0 ].value );
			}

			if( handler.once ) {
				toRemove.push( handler );
			}
		}

		// Remove one-time handlers
		if( toRemove.length > 0 ) {
			for( const handler of toRemove ) {
				const index = handlers.indexOf( handler );
				if( index !== -1 ) {
					handlers.splice( index, 1 );
				}
			}

			if( handlers.length === 0 && handlersCopy.length > 0 ) {
				delete m_onGamepadHandlers[ handlersCopy[ 0 ].handlerKey ];
			}
		}
	}
}

function triggerButtonHandlers( gamepad, items, mode, handlers ) {
	if( !gamepad.buttons ) {
		return;
	}

	const handlersCopy = handlers.slice();
	const toRemove = [];

	// Check each handler
	for( let i = 0; i < handlersCopy.length; i++ ) {
		const handler = handlersCopy[ i ];

		// TODO: Optimization this is O(N^2)
		// Check if handler was already removed
		if( !handlers.includes( handler ) ) {
			continue;
		}

		// Determine which buttons to check
		let buttonsToCheck = [];
		if( items === "any" ) {
			for( let j = 0; j < gamepad.buttons.length; j++ ) {
				buttonsToCheck.push( j );
			}
		} else {
			buttonsToCheck = items;
		}

		// Check each button
		for( const buttonIndex of buttonsToCheck ) {
			if( buttonIndex >= gamepad.buttons.length ) {
				continue;
			}

			const button = gamepad.buttons[ buttonIndex ];
			let shouldTrigger = false;

			if( mode === "down" && button.pressStarted ) {
				shouldTrigger = true;
			} else if( mode === "up" && button.pressReleased ) {
				shouldTrigger = true;
			} else if( mode === "pressed" ) {
				if( button.pressed ) {
					if( handler.allowRepeat || button.pressStarted ) {
						shouldTrigger = true;
					}
				}
			}

			if( shouldTrigger ) {
				const data = {
					"index": buttonIndex,
					"pressed": button.pressed,
					"value": button.value,
					"gamepadIndex": gamepad.index
				};

				handler.fn( data );

				if( handler.once ) {
					toRemove.push( handler );
				}

				break;
			}
		}
	}

	// Remove one-time handlers
	if( toRemove.length > 0 ) {
		for( const handler of toRemove ) {
			const index = handlers.indexOf( handler );
			if( index !== -1 ) {
				handlers.splice( index, 1 );
			}
		}

		if( handlers.length === 0 && handlersCopy.length > 0 ) {
			delete m_onGamepadHandlers[ handlersCopy[ 0 ].handlerKey ];
		}
	}
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
