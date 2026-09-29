/**
 * Shared event helper utilities for the Pointer plugin.
 */

"use strict";

/**
 * Create shared pointer listener registration, removal, and dispatch helpers.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @returns {Object}
 */
export function createEventHelpers( pluginApi ) {

	const utils = pluginApi.utils;

	/**
	 * Register a handler. A handler is identified by its mode and function, so registering the
	 * same function for the same mode again does nothing, whatever its `once`, hit box, and
	 * custom data.
	 *
	 * @param {string} mode - Event mode.
	 * @param {Function} fn - Handler.
	 * @param {boolean} once - Remove the registration before its first run.
	 * @param {Object|null} hitBox - Area the event must be inside.
	 * @param {Array<string>} modes - Modes of the command.
	 * @param {string} name - Command name for error messages.
	 * @param {Object} listenerArr - Registrations by mode.
	 * @param {*} customData - Data passed to the handler.
	 * @returns {void}
	 */
	function onevent( mode, fn, once, hitBox, modes, name, listenerArr, customData ) {
		let modeFound = false;

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

		once = !!( once );

		if( typeof fn !== "function" ) {
			const error = new Error( `${name}: fn is not a valid function.` );
			error.code = "INVALID_FUNCTION";
			throw error;
		}

		if( hitBox ) {
			if(
				!Number.isFinite( hitBox.x ) ||
				!Number.isFinite( hitBox.y ) ||
				!Number.isFinite( hitBox.width ) ||
				!Number.isFinite( hitBox.height )
			) {
				const error = new Error(
					`${name}: hitBox must have properties x, y, width, and height whose values ` +
					"are finite numbers."
				);
				error.code = "INVALID_HITBOX";
				throw error;
			}
			if( hitBox.width < 0 || hitBox.height < 0 ) {
				const error = new RangeError(
					`${name}: hitBox width and height must not be negative.`
				);
				error.code = "INVALID_HITBOX";
				throw error;
			}
		}

		if( !listenerArr[ mode ] ) {
			listenerArr[ mode ] = [];
		}

		for( const listener of listenerArr[ mode ] ) {
			if( listener.fn === fn ) {
				return;
			}
		}

		listenerArr[ mode ].push( {
			"fn": fn,
			"once": once,
			"hitBox": hitBox,
			"armedPointers": null,
			"isRemoved": false,
			"customData": customData,
			"name": name
		} );
	}

	/**
	 * Remove handlers by mode and function. Without a function, every handler of the mode is
	 * removed; without a mode, the function is removed from every mode. Omitting both throws.
	 *
	 * @param {string|null} mode - Event mode, or null for every mode.
	 * @param {Function|null} fn - Handler, or null for every handler of the mode.
	 * @param {Array<string>} modes - Modes of the command.
	 * @param {string} name - Command name for error messages.
	 * @param {Object} listenerArr - Registrations by mode.
	 * @param {string} clearType - `clearEvents()` type that removes every handler.
	 * @returns {void}
	 */
	function offevent( mode, fn, modes, name, listenerArr, clearType ) {
		if( mode == null && fn == null ) {
			const error = new TypeError(
				`${name}: mode or fn is required. To remove every handler, call ` +
				`clearEvents( "${clearType}" ).`
			);
			error.code = "INVALID_MODE";
			throw error;
		}

		let offModes = modes;
		if( mode != null ) {
			if( !modes.includes( mode ) ) {
				const error = new Error(
					`${name}: mode needs to be one of the following: ${modes.join( ", " )}.`
				);
				error.code = "INVALID_MODE";
				throw error;
			}
			offModes = [ mode ];
		}

		if( fn != null && typeof fn !== "function" ) {
			const error = new Error( `${name}: fn is not a valid function.` );
			error.code = "INVALID_FUNCTION";
			throw error;
		}

		for( const offMode of offModes ) {
			const listeners = listenerArr[ offMode ];
			if( !listeners ) {
				continue;
			}
			for( let i = listeners.length - 1; i >= 0; i-- ) {
				if( fn == null || listeners[ i ].fn === fn ) {
					removeListener( listenerArr, offMode, listeners[ i ] );
				}
			}
		}
	}

	/**
	 * Remove one registration. It is marked removed so a dispatch already in progress skips it.
	 *
	 * @param {Object} listenerArr - Registrations by mode.
	 * @param {string} mode - Mode key of the registration.
	 * @param {Object} listener - The registration.
	 * @returns {void}
	 */
	function removeListener( listenerArr, mode, listener ) {
		listener.isRemoved = true;
		const listeners = listenerArr[ mode ];
		if( !listeners ) {
			return;
		}
		const index = listeners.indexOf( listener );
		if( index !== -1 ) {
			listeners.splice( index, 1 );
		}
		if( listeners.length === 0 ) {
			delete listenerArr[ mode ];
		}
	}

	/**
	 * Mark every registration removed, for a clear that replaces the registration object.
	 *
	 * @param {Object} listenerArr - Registrations by mode.
	 * @returns {void}
	 */
	function removeAllListeners( listenerArr ) {
		for( const mode in listenerArr ) {
			for( const listener of listenerArr[ mode ] ) {
				listener.isRemoved = true;
			}
		}
	}

	/**
	 * Call a registration's handler. A `once` registration is removed first, so a dispatch
	 * started inside the handler does not call it again. A handler that throws is reported with
	 * `console.error`, so the other handlers and dispatches of the event still run.
	 *
	 * @param {Object} listenerArr - Registrations by mode.
	 * @param {string} mode - Mode key of the registration.
	 * @param {Object} listener - The registration.
	 * @param {*} data - Event data for the handler.
	 * @returns {void}
	 */
	function runListener( listenerArr, mode, listener, data ) {
		if( listener.once ) {
			removeListener( listenerArr, mode, listener );
		}
		try {
			listener.fn( data, listener.customData );
		} catch( error ) {
			console.error( `${listener.name}: Handler for "${mode}" failed:`, error );
		}
	}

	function triggerEventListeners( mode, data, listenerArr ) {
		if( !listenerArr[ mode ] ) {
			return;
		}

		// Handlers added during this dispatch wait for the next one; handlers removed during it
		// are skipped
		const temp = listenerArr[ mode ].slice();

		for( let i = 0; i < temp.length; i++ ) {
			const listener = temp[ i ];

			if( listener.isRemoved ) {
				continue;
			}

			if( listener.hitBox ) {
				let isHit = false;
				let newData;

				if( Array.isArray( data ) ) {
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
					Object.freeze( newData );
				} else {
					newData = data;
					if( utils.inRange( data, listener.hitBox ) ) {
						isHit = true;
					}
				}

				if( isHit ) {
					runListener( listenerArr, mode, listener, newData );
				}
			} else {
				runListener( listenerArr, mode, listener, data );
			}
		}
	}

	/**
	 * Update click listeners for one pointer. A primary-button down inside a listener's hit box
	 * arms it for that pointer; that pointer's release inside the box fires it; any other
	 * release, or a cancel, disarms it.
	 *
	 * @param {Object} data - Pointer data; for `"up"`, the click data.
	 * @param {Object} listenerArr - Click registrations by mode.
	 * @param {string} action - `"down"` for a primary-button down, `"up"` for its release, or
	 *   `"cancel"` for any other release or a cancel.
	 * @param {string|number} pointerId - `"mouse"`, or the touch identifier.
	 * @returns {void}
	 */
	function triggerClickListeners( data, listenerArr, action, pointerId ) {
		if( !listenerArr.click ) {
			return;
		}
		const temp = listenerArr.click.slice();
		for( const listener of temp ) {
			if( listener.isRemoved ) {
				continue;
			}
			const isHit = utils.inRange( data, listener.hitBox );
			if( action === "down" ) {
				if( isHit ) {
					if( listener.armedPointers === null ) {
						listener.armedPointers = new Set();
					}
					listener.armedPointers.add( pointerId );
				}
			} else if( listener.armedPointers !== null ) {
				const wasArmed = listener.armedPointers.delete( pointerId );
				if( wasArmed && isHit && action === "up" ) {
					runListener( listenerArr, "click", listener, data );
				}
			}
		}
	}

	return {
		"onevent": onevent,
		"offevent": offevent,
		"removeAllListeners": removeAllListeners,
		"triggerEventListeners": triggerEventListeners,
		"triggerClickListeners": triggerClickListeners
	};
}


