/**
 * Shared event helper utilities for the Pointer plugin.
 */

"use strict";

export function createEventHelpers( pluginApi ) {
	
	const utils = pluginApi.utils;
	
	function onevent( mode, fn, once, hitBox, modes, name, listenerArr, extraId, extraData, customData ) {
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
					`${name}: hitBox must have properties x, y, width, and height whose values are integers.`
				);
				error.code = "INVALID_HITBOX";
				throw error;
			}
		}
		
		setTimeout( () => {
			const originalFn = fn;
			let newMode = mode;
			
			if( typeof extraId === "string" ) {
				newMode = mode + extraId;
			}
			
			let wrappedFn = fn;
			if( once ) {
				wrappedFn = ( data, customData ) => {
					offevent( mode, originalFn, modes, name, listenerArr, extraId );
					originalFn( data, customData );
				};
			}
			
			if( !listenerArr[ newMode ] ) {
				listenerArr[ newMode ] = [];
			}
			
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
		
		if( listenerArr[ mode ] ) {
			if( isClear ) {
				delete listenerArr[ mode ];
			} else {
				for( let i = listenerArr[ mode ].length - 1; i >= 0; i-- ) {
					if( listenerArr[ mode ][ i ].originalFn === fn ) {
						listenerArr[ mode ].splice( i, 1 );
					}
				}
				if( listenerArr[ mode ].length === 0 ) {
					delete listenerArr[ mode ];
				}
			}
			return true;
		}
		return false;
	}
	
	function triggerEventListeners( mode, data, listenerArr, clickStatus ) {
		if( !listenerArr[ mode ] ) {
			return;
		}
		
		const temp = listenerArr[ mode ].slice();
		
		for( let i = 0; i < temp.length; i++ ) {
			const listener = temp[ i ];
			
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
						listener.fn( newData, listener.customData );
					}
				}
			} else {
				listener.fn( data, listener.customData );
			}
		}
	}
	
	return {
		"onevent": onevent,
		"offevent": offevent,
		"triggerEventListeners": triggerEventListeners
	};
}


