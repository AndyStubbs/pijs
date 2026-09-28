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

	function onevent(
		mode, fn, once, hitBox, modes, name, listenerArr, extraId, extraData, customData
	) {
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
				!Number.isInteger( hitBox.x ) ||
				!Number.isInteger( hitBox.y ) ||
				!Number.isInteger( hitBox.width ) ||
				!Number.isInteger( hitBox.height )
			) {
				const error = new Error(
					`${name}: hitBox must have properties x, y, width, and height whose values ` +
					"are integers."
				);
				error.code = "INVALID_HITBOX";
				throw error;
			}
		}

		let newMode = mode;

		if( typeof extraId === "string" ) {
			newMode = mode + extraId;
		}

		if( !listenerArr[ newMode ] ) {
			listenerArr[ newMode ] = [];
		}

		listenerArr[ newMode ].push( {
			"fn": fn,
			"once": once,
			"hitBox": hitBox,
			"extraData": extraData,
			"clickDown": false,
			"isRemoved": false,
			"customData": customData
		} );
	}

	function offevent( mode, fn, modes, name, listenerArr, extraId ) {
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

		if( typeof extraId === "string" ) {
			mode += extraId;
		}

		const isClear = fn == null;

		if( !isClear && typeof fn !== "function" ) {
			const error = new Error( `${name}: fn is not a valid function.` );
			error.code = "INVALID_FUNCTION";
			throw error;
		}

		const listeners = listenerArr[ mode ];
		if( !listeners ) {
			return;
		}
		for( let i = listeners.length - 1; i >= 0; i-- ) {
			if( isClear || listeners[ i ].fn === fn ) {
				removeListener( listenerArr, mode, listeners[ i ] );
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
	 * started inside the handler does not call it again.
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
		listener.fn( data, listener.customData );
	}

	function triggerEventListeners( mode, data, listenerArr, clickStatus ) {
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

			if( clickStatus === "up" && !listener.clickDown ) {
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
				} else {
					newData = data;
					if( utils.inRange( data, listener.hitBox ) ) {
						isHit = true;
					}
				}

				if( isHit ) {
					if( clickStatus === "down" ) {
						listener.clickDown = true;
					} else {
						listener.clickDown = false;
						runListener( listenerArr, mode, listener, newData );
					}
				}
			} else {
				runListener( listenerArr, mode, listener, data );
			}
		}
	}

	return {
		"onevent": onevent,
		"offevent": offevent,
		"removeAllListeners": removeAllListeners,
		"triggerEventListeners": triggerEventListeners
	};
}


