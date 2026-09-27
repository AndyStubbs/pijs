/**
 * Pi.js - Sound Advanced Music Sync Module (Plugin)
 *
 * onPlay() and offPlay(): handlers for PLAY notes and song ends, called when the music is
 * heard. Events come from the sound service's observePlay, up to the scheduler's lookahead
 * before they sound, and wait in a queue until their audible time. An animation-frame loop
 * dispatches them and runs only while events are queued. Notes more than 250 ms late, for
 * example after a hidden tab becomes visible again, are dropped; song ends are always delivered.
 *
 * @module plugins/sound-advanced/sync
 */

"use strict";

export const PLAY_MODES = [ "note", "end" ];

// Note events dispatched later than this, in milliseconds, are dropped
export const LATE_LIMIT_MS = 250;


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Throw an error with an error code
 *
 * @param {Function} ErrorType - Error constructor
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {never}
 */
function throwCode( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}

/**
 * Check a handler mode
 *
 * @param {string} command - Command name for the error message
 * @param {*} mode - Mode to check
 * @returns {void}
 */
function validateMode( command, mode ) {
	if( typeof mode !== "string" ) {
		throwCode(
			TypeError, `${command}: Parameter mode must be a string.`, "INVALID_MODE"
		);
	}
	if( PLAY_MODES.indexOf( mode ) === -1 ) {
		throwCode(
			RangeError, `${command}: Parameter mode must be "note" or "end".`, "INVALID_MODE"
		);
	}
}

/**
 * Check a handler function
 *
 * @param {string} command - Command name for the error message
 * @param {*} fn - Function to check
 * @returns {void}
 */
function validateFunction( command, fn ) {
	if( typeof fn !== "function" ) {
		throwCode(
			TypeError, `${command}: Parameter fn must be a function.`, "INVALID_FUNCTION"
		);
	}
}

/**
 * Map context time to page time from the audio output position
 *
 * getOutputTimestamp() pairs the context time being heard with its performance.now() time,
 * so it includes the output latency. Before output starts it reports zero, and some engines
 * lack it; then the current render time plus outputLatency, or baseLatency, stands in.
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {number} now - Current performance.now() time in milliseconds
 * @returns {number} Offset in milliseconds: page time = context time × 1000 + offset
 */
export function getPageOffset( context, now ) {
	if( typeof context.getOutputTimestamp === "function" ) {
		const stamp = context.getOutputTimestamp();
		if( stamp && stamp.performanceTime > 0 ) {
			return stamp.performanceTime - stamp.contextTime * 1000;
		}
	}
	const latency = context.outputLatency || context.baseLatency || 0;
	return now - ( context.currentTime - latency ) * 1000;
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Create the music sync handlers and dispatch queue
 *
 * The host supplies the event source and clock, so the queue and dispatch rules run the same
 * in a page and in Node tests.
 *
 * @param {Object} host - Environment
 * @param {Function} host.observePlay - Registers an event listener; returns its remover
 * @param {Function} host.now - Current page time in milliseconds
 * @param {Function} host.contextTime - Current context time in seconds
 * @param {Function} host.pageOffset - Offset from context time to page time (getPageOffset)
 * @param {Function} host.requestFrame - Calls a function on the next animation frame
 * @returns {Object} { onPlay, offPlay, clear }
 */
export function createPlaySync( host ) {

	// Handlers by mode, in registration order: { fn, once }
	const handlers = { "note": [], "end": [] };

	// Events waiting for their audible time, in time order: { event, time }
	let queue = [];
	let removeObserver = null;
	let isFramePending = false;

	/**
	 * Queue an event from observePlay
	 *
	 * A stopped song's queued notes are dropped. A song end has no time of its own; it is
	 * heard when the context time at which it is reported reaches the output.
	 *
	 * @param {Object} event - Note or end event
	 * @returns {void}
	 */
	function receive( event ) {
		let time = event.time;
		if( event.type === "end" ) {
			time = host.contextTime();
			if( event.stopped ) {
				queue = queue.filter( entry => entry.event.trackId !== event.trackId );
			}
		}
		let index = queue.length;
		while( index > 0 && queue[ index - 1 ].time > time ) {
			index -= 1;
		}
		queue.splice( index, 0, { "event": event, "time": time } );
		requestDispatch();
	}

	/**
	 * Run the dispatch loop on the next frame unless it is already waiting
	 *
	 * @returns {void}
	 */
	function requestDispatch() {
		if( !isFramePending && queue.length > 0 ) {
			isFramePending = true;
			host.requestFrame( dispatchDue );
		}
	}

	/**
	 * Dispatch every queued event whose audible time has come, in time order
	 *
	 * @returns {void}
	 */
	function dispatchDue() {
		isFramePending = false;
		const now = host.now();
		const offset = host.pageOffset( now );
		while( queue.length > 0 ) {
			const entry = queue[ 0 ];
			const late = now - ( entry.time * 1000 + offset );
			if( late < 0 ) {
				break;
			}
			queue.shift();
			if( entry.event.type === "note" && late > LATE_LIMIT_MS ) {
				continue;
			}
			dispatch( entry.event, late / 1000 );
		}
		requestDispatch();
	}

	/**
	 * Call the handlers of an event's mode with one frozen callback object
	 *
	 * Handlers added during the dispatch first run for the next event, and handlers removed
	 * during it do not run. A once handler is removed before it runs, and a throwing handler
	 * is reported without stopping the others.
	 *
	 * @param {Object} event - Note or end event
	 * @param {number} delay - Seconds between the audible time and the dispatch
	 * @returns {void}
	 */
	function dispatch( event, delay ) {
		const data = Object.freeze( { ...event, "delay": delay } );
		const list = handlers[ event.type ];
		for( const handler of list.slice() ) {
			if( list.indexOf( handler ) === -1 ) {
				continue;
			}
			if( handler.once ) {
				removeHandlers( event.type, handler.fn );
			}
			try {
				handler.fn( data );
			} catch( error ) {
				console.error( `onPlay: Handler for "${event.type}" failed:`, error );
			}
		}
	}

	/**
	 * Remove handlers of one mode, and stop observing when none are left
	 *
	 * @param {string} mode - Handler mode
	 * @param {Function|null} fn - Handler function, or null for every handler of the mode
	 * @returns {void}
	 */
	function removeHandlers( mode, fn ) {
		const list = handlers[ mode ];
		for( let i = list.length - 1; i >= 0; i-- ) {
			if( fn === null || list[ i ].fn === fn ) {
				list.splice( i, 1 );
			}
		}
		if( removeObserver && handlers.note.length === 0 && handlers.end.length === 0 ) {
			removeObserver();
			removeObserver = null;
			queue = [];
		}
	}

	/**
	 * Register a music sync handler
	 *
	 * Observing starts with the first handler. Registering the same function for the same
	 * mode again does nothing.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.mode - "note" or "end"
	 * @param {Function} options.fn - Called with the event and its delay
	 * @param {boolean} [options.once] - Remove the handler after its first call
	 * @returns {void}
	 */
	function onPlay( options ) {
		validateMode( "onPlay", options.mode );
		validateFunction( "onPlay", options.fn );
		if( options.once != null && typeof options.once !== "boolean" ) {
			throwCode( TypeError, "onPlay: Parameter once must be a boolean.", "INVALID_ONCE" );
		}
		const list = handlers[ options.mode ];
		if( list.some( handler => handler.fn === options.fn ) ) {
			return;
		}
		list.push( { "fn": options.fn, "once": options.once === true } );
		if( !removeObserver ) {
			removeObserver = host.observePlay( receive );
		}
	}

	/**
	 * Remove music sync handlers
	 *
	 * A mode without a function removes every handler of that mode; a function without a mode
	 * removes it from every mode. clearEvents( "play" ) removes all of them.
	 *
	 * @param {Object} options - Command options
	 * @param {string} [options.mode] - "note" or "end"
	 * @param {Function} [options.fn] - Handler function
	 * @returns {void}
	 */
	function offPlay( options ) {
		const mode = options.mode ?? null;
		const fn = options.fn ?? null;
		if( mode === null && fn === null ) {
			throwCode(
				TypeError,
				"offPlay: Parameter mode or fn is required; use clearEvents( \"play\" ) to " +
					"remove every handler.",
				"INVALID_MODE"
			);
		}
		if( mode !== null ) {
			validateMode( "offPlay", mode );
		}
		if( fn !== null ) {
			validateFunction( "offPlay", fn );
		}
		for( const each of PLAY_MODES ) {
			if( mode === null || mode === each ) {
				removeHandlers( each, fn );
			}
		}
	}

	/**
	 * Remove every handler and queued event
	 *
	 * @returns {void}
	 */
	function clear() {
		for( const mode of PLAY_MODES ) {
			removeHandlers( mode, null );
		}
	}

	return { "onPlay": onPlay, "offPlay": offPlay, "clear": clear };
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the music sync commands and the "play" type of clearEvents()
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} service - Sound extension service
 * @returns {void}
 */
export function register( pluginApi, service ) {
	const sync = createPlaySync( {
		"observePlay": service.observePlay,
		"now": () => performance.now(),
		"contextTime": () => service.getContext().currentTime,
		"pageOffset": now => getPageOffset( service.getContext(), now ),
		"requestFrame": fn => requestAnimationFrame( fn )
	} );
	pluginApi.addCommand( "onPlay", sync.onPlay, false, [ "mode", "fn", "once" ] );
	pluginApi.addCommand( "offPlay", sync.offPlay, false, [ "mode", "fn" ] );
	pluginApi.registerClearEvents( "play", sync.clear );
}
