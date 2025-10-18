/**
 * Pi.js - Event Management Module
 * 
 * Centralized event listener management for input events (mouse, touch, keyboard, etc.)
 * 
 * @module core/events
 */

"use strict";

import * as utils from "./utils";


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
		console.warn(
			`${name}: mode needs to be one of the following: ${modes.join( ", " )}.`
		);
		return false;
	}

	// Validate once parameter
	once = !!( once );

	// Validate callback function
	if( !utils.isFunction( fn ) ) {
		console.warn( `${name}: fn is not a valid function.` );
		return false;
	}

	// Validate hitBox
	if( hitBox ) {
		if(
			!utils.isInteger( hitBox.x ) ||
			!utils.isInteger( hitBox.y ) ||
			!utils.isInteger( hitBox.width ) ||
			!utils.isInteger( hitBox.height )
		) {
			console.warn(
				`${name}: hitBox must have properties x, y, width, and height ` +
				`whose values are integers.`
			);
			return false;
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
		console.warn(
			`${name}: mode needs to be one of the following: ${modes.join( ", " )}.`
		);
		return false;
	}

	// Add extraId to mode if provided
	if( typeof extraId === "string" ) {
		mode += extraId;
	}

	// Determine if clearing all listeners or specific function
	const isClear = fn == null;

	if( !isClear && !utils.isFunction( fn ) ) {
		console.warn( `${name}: fn is not a valid function.` );
		return false;
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
			if( utils.isArray( data ) ) {
				newData = [];
				for( let j = 0; j < data.length; j++ ) {
					const pos = data[ j ];
					if( utils.inRange( pos, listener.hitBox ) ) {
						newData.push( pos );
					}
				}
				if( newData.length > 0 ) {
					isHit = true;
				}
			} else {

				// Handle single data point (mouse)
				newData = data;
				if( utils.inRange( data, listener.hitBox ) ) {
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

