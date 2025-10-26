/**
 * Pi.js - Event Management Core Module
 * 
 * Centralized event listener management for input events (mouse, touch, keyboard, etc.)
 * 
 * @module core/events
 */

"use strict";

import * as g_utils from "./utils";
import * as g_screenManager from "./screen-manager";

// Import clear functions from input modules (TODO: Re-enable when input modules are reimplemented)
// import { clearKeyboardEvents } from "../modules/keyboard";
// import { clearMouseEvents } from "../modules/mouse";
// import { clearTouchEvents } from "../modules/touch";
// import { clearPressEvents, clearClickEvents } from "../modules/press";
// import { clearGamepadEvents } from "../modules/gamepad";

// Placeholder functions until modules are reimplemented
function clearKeyboardEvents() {
	// TODO: Implement when keyboard module is reimplemented
}

function clearMouseEvents( screenData ) {
	// TODO: Implement when mouse module is reimplemented
}

function clearTouchEvents( screenData ) {
	// TODO: Implement when touch module is reimplemented
}

function clearPressEvents( screenData ) {
	// TODO: Implement when press module is reimplemented
}

function clearClickEvents( screenData ) {
	// TODO: Implement when press module is reimplemented
}

function clearGamepadEvents() {
	// TODO: Implement when gamepad module is reimplemented
}


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {

	// Register clearEvents command
	// Screen is optional since keyboard and gamepad don't require a screen
	g_screenManager.addCommand( "clearEvents", clearEvents, [ "type" ], true );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/

/**
 * Clear event handlers for specified input types
 * 
 * @param {Object|null} screenData - Screen data object (null if no screen available)
 * @param {Object} options - Command options
 * @param {string|Array<string>} options.type - Type(s) to clear (keyboard, mouse, touch, press, click, gamepad)
 */
function clearEvents( screenData, options ) {
	const type = options.type;
	const types = Array.isArray( type ) ? type : ( type ? [ type ] : null );

	// If no type specified, clear all
	if( !types ) {
		clearKeyboardEvents();
		clearGamepadEvents();
		if( screenData ) {
			clearMouseEvents( screenData );
			clearTouchEvents( screenData );
			clearPressEvents( screenData );
			clearClickEvents( screenData );
		}
		return;
	}

	// Clear specific types
	for( const t of types ) {
		const lowerType = t.toLowerCase();
		if( lowerType === "keyboard" ) {
			clearKeyboardEvents();
		} else if( lowerType === "gamepad" ) {
			clearGamepadEvents();
		} else if( lowerType === "mouse" ) {
			if( !screenData ) {
				const error = new Error( "clearEvents: No screen available to clear mouse events." );
				error.code = "NO_SCREEN";
				throw error;
			}
			clearMouseEvents( screenData );
		} else if( lowerType === "touch" ) {
			if( !screenData ) {
				const error = new Error( "clearEvents: No screen available to clear touch events." );
				error.code = "NO_SCREEN";
				throw error;
			}
			clearTouchEvents( screenData );
		} else if( lowerType === "press" ) {
			if( !screenData ) {
				const error = new Error( "clearEvents: No screen available to clear press events." );
				error.code = "NO_SCREEN";
				throw error;
			}
			clearPressEvents( screenData );
		} else if( lowerType === "click" ) {
			if( !screenData ) {
				const error = new Error( "clearEvents: No screen available to clear click events." );
				error.code = "NO_SCREEN";
				throw error;
			}
			clearClickEvents( screenData );
		} else {
			const error = new Error(
				`clearEvents: Invalid type "${t}". ` +
				`Valid types: keyboard, mouse, touch, press, click, gamepad.`
			);
			error.code = "INVALID_TYPE";
			throw error;
		}
	}
}


/***************************************************************************************************
 * Event Management Functions
 **************************************************************************************************/


/**
 * Register an event listener
 * 
 * @param {string} mode - Event mode (e.g., "down", "up", "move")
 * @param {Function} fn - Callback function
 * @param {boolean} once - If true, listener is removed after first trigger
 * @param {Object} hitBox - Optional hit box with x, y, width, height properties
 * @param {Array<string>} modes - Valid modes for this event type
 * @param {string} name - Command name for error messages
 * @param {Object} listenerArr - Object containing listener arrays by mode
 * @param {string} extraId - Optional extra ID to append to mode
 * @param {*} extraData - Optional extra data to store with listener
 * @param {*} customData - Optional custom data passed to callback
 * @returns {boolean} True if listener was successfully registered
 */
export function onevent(
	mode, fn, once, hitBox, modes, name, listenerArr, extraId, extraData, customData
) {
	let modeFound = false;

	// Validate mode
	for( let i = 0; i < modes.length; i++ ) {
		if( mode === modes[ i ] ) {
			modeFound = true;
			break;
		}
	}

	if( !modeFound ) {
		const error = new Error(
			`${name}: mode needs to be one of the following: ${modes.join( ", " )}.`
		);
		error.code = "INVALID_MODE";
		throw error;
	}

	// Validate once parameter
	once = !!( once );

	// Validate callback function
	if( !g_utils.isFunction( fn ) ) {
		const error = new Error( `${name}: fn is not a valid function.` );
		error.code = "INVALID_FUNCTION";
		throw error;
	}

	// Validate hitBox
	if( hitBox ) {
		if(
			!Number.isInteger( hitBox.x ) ||
			!Number.isInteger( hitBox.y ) ||
			!Number.isInteger( hitBox.width ) ||
			!Number.isInteger( hitBox.height )
		) {
			const error = new Error(
				`${name}: hitBox must have properties x, y, width, and height ` +
				`whose values are integers.`
			);
			error.code = "INVALID_HITBOX";
			throw error;
		}
	}

	// Use setTimeout to prevent event from being triggered if called within an event
	setTimeout( () => {
		const originalFn = fn;
		let newMode = mode;

		// Add extraId to mode if provided
		if( typeof extraId === "string" ) {
			newMode = mode + extraId;
		}

		// Wrap function if it should only run once
		let wrappedFn = fn;
		if( once ) {
			wrappedFn = ( data, customData ) => {
				offevent( mode, originalFn, modes, name, listenerArr, extraId );
				originalFn( data, customData );
			};
		}

		// Initialize listener array for this mode if needed
		if( !listenerArr[ newMode ] ) {
			listenerArr[ newMode ] = [];
		}

		// Add listener
		listenerArr[ newMode ].push( {
			"fn": wrappedFn,
			"hitBox": hitBox,
			"extraData": extraData,
			"clickDown": false,
			"originalFn": originalFn,
			"customData": customData
		} );
	}, 1 );

	return true;
}

/**
 * Unregister an event listener
 * 
 * @param {string} mode - Event mode
 * @param {Function} fn - Callback function to remove, or null to remove all
 * @param {Array<string>} modes - Valid modes for this event type
 * @param {string} name - Command name for error messages
 * @param {Object} listenerArr - Object containing listener arrays by mode
 * @param {string} extraId - Optional extra ID appended to mode
 * @returns {boolean} True if listener(s) were successfully removed
 */
export function offevent( mode, fn, modes, name, listenerArr, extraId ) {
	let modeFound = false;

	// Validate mode
	for( let i = 0; i < modes.length; i++ ) {
		if( mode === modes[ i ] ) {
			modeFound = true;
			break;
		}
	}

	if( !modeFound ) {
		const error = new Error(
			`${name}: mode needs to be one of the following: ${modes.join( ", " )}.`
		);
		error.code = "INVALID_MODE";
		throw error;
	}

	// Add extraId to mode if provided
	if( typeof extraId === "string" ) {
		mode += extraId;
	}

	// Determine if clearing all listeners or specific function
	const isClear = fn == null;

	if( !isClear && !g_utils.isFunction( fn ) ) {
		const error = new Error( `${name}: fn is not a valid function.` );
		error.code = "INVALID_FUNCTION";
		throw error;
	}

	// Remove listeners
	if( listenerArr[ mode ] ) {
		if( isClear ) {

			// Remove all listeners for this mode
			delete listenerArr[ mode ];
		} else {

			// Remove specific function
			for( let i = listenerArr[ mode ].length - 1; i >= 0; i-- ) {
				if( listenerArr[ mode ][ i ].originalFn === fn ) {
					listenerArr[ mode ].splice( i, 1 );
				}
			}

			// Clean up empty array
			if( listenerArr[ mode ].length === 0 ) {
				delete listenerArr[ mode ];
			}
		}
		return true;
	}

	return false;
}

/**
 * Trigger all event listeners for a specific mode
 * 
 * @param {string} mode - Event mode to trigger
 * @param {*} data - Event data to pass to listeners
 * @param {Object} listenerArr - Object containing listener arrays by mode
 * @param {string} clickStatus - Optional "down" or "up" for click tracking
 */
export function triggerEventListeners( mode, data, listenerArr, clickStatus ) {
	if( !listenerArr[ mode ] ) {
		return;
	}

	// Make a copy to prevent infinite loops if listener adds new listeners
	const temp = listenerArr[ mode ].slice();

	// Loop through all event listeners
	for( let i = 0; i < temp.length; i++ ) {
		const listener = temp[ i ];

		// Handle click up without click down
		if( clickStatus === "up" && !listener.clickDown ) {
			continue;
		}

		// Check hitBox if present
		if( listener.hitBox ) {
			let isHit = false;
			let newData;

			// Handle array data (touches)
			if( Array.isArray( data ) ) {
				newData = [];
				for( let j = 0; j < data.length; j++ ) {
					const pos = data[ j ];
					if( g_utils.inRange( pos, listener.hitBox ) ) {
						newData.push( pos );
					}
				}
				if( newData.length > 0 ) {
					isHit = true;
				}
			} else {

				// Handle single data point (mouse)
				newData = data;
				if( g_utils.inRange( data, listener.hitBox ) ) {
					isHit = true;
				}
			}

			if( isHit ) {

				// For click events, track down state
				if( clickStatus === "down" ) {
					listener.clickDown = true;
				} else {
					listener.clickDown = false;
					listener.fn( newData, listener.customData );
				}
			}
		} else {

			// No hitBox, trigger for all events
			listener.fn( data, listener.customData );
		}
	}
}

