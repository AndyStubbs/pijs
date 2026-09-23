/**
 * Pi.js - Sound Samples Module (Plugin)
 *
 * Audio files as decoded buffers or, opt-in, streamed media elements: loadAudio, playAudio,
 * stopAudio, pauseAudio, resumeAudio, setAudio, and removeAudio.
 *
 * Each playAudio call creates an instance with a numeric ID. An instance plays through
 * source → fade gain → volume gain → stereo panner → audio bus, and its voice shares the slot
 * and live-voice caps, admission, and stop path in voices.js. Looping instances are protected
 * from automatic stealing.
 *
 * Position model: `startTime` and `duration` are file content time. Each instance keeps rate
 * segments { time, rate } in context time, and the content consumed is the sum of
 * rate × segment length. Rate changes are steps on render-quantum boundaries at or after the
 * scheduling lead, so the model matches the rendered position in decode mode.
 *
 * @module plugins/sound/samples
 */

"use strict";

import * as g_context from "./context.js";
import * as g_envelope from "./envelope.js";
import * as g_scheduler from "./scheduler.js";
import * as g_voices from "./voices.js";

// Playback rate bounds per mode; Gecko mutes media elements outside the stream range
export const DECODE_RATES = [ 0.0625, 16 ];
export const STREAM_RATES = [ 0.25, 4 ];

// Network failures retry this many times, this many milliseconds apart
const RETRY_COUNT = 3;
const RETRY_DELAY = 100;

// Volume and pan changes ramp over this many seconds
const CONTROL_RAMP = 0.01;

// Media element error code for network failures, the only retried element error
const MEDIA_ERR_NETWORK = 2;

// Audio records by audio ID, and live instances by instance ID
const m_audio = {};
const m_instances = new Map();
let m_nextAudioId = 0;
let m_nextInstanceId = 1;


/*************************************************************************************************
 * Position Model
 ************************************************************************************************/


/**
 * Resolve the content budget of an instance from the public duration
 *
 * A positive duration is a finite budget; zero means unbounded for loops, or the file after
 * startTime otherwise. Non-loop budgets are capped by the content available.
 *
 * @param {number} fileLength - File length in seconds
 * @param {number} startTime - Content offset in seconds
 * @param {number} duration - Public duration; 0 is the default sentinel
 * @param {boolean} loop - Whether the instance loops
 * @returns {number} Content budget in seconds; Infinity when unbounded
 */
export function resolveBudget( fileLength, startTime, duration, loop ) {
	if( loop ) {
		if( duration > 0 ) {
			return duration;
		}
		return Infinity;
	}
	const available = Math.max( fileLength - startTime, 0 );
	if( duration > 0 ) {
		return Math.min( duration, available );
	}
	return available;
}

/**
 * Content consumed from the first segment's start up to a context time
 *
 * @param {Array<Object>} segments - Rate segments { time, rate } in time order
 * @param {number} time - Context time
 * @returns {number} Content seconds
 */
export function consumedAt( segments, time ) {
	let total = 0;
	for( let i = 0; i < segments.length; i++ ) {
		const segmentStart = segments[ i ].time;
		if( time <= segmentStart ) {
			break;
		}
		let segmentEnd = time;
		if( i + 1 < segments.length && segments[ i + 1 ].time < time ) {
			segmentEnd = segments[ i + 1 ].time;
		}
		total += segments[ i ].rate * ( segmentEnd - segmentStart );
	}
	return total;
}

/**
 * Playback rate in effect at a context time
 *
 * @param {Array<Object>} segments - Rate segments { time, rate } in time order
 * @param {number} time - Context time
 * @returns {number} Playback rate
 */
export function rateAt( segments, time ) {
	let rate = segments[ 0 ].rate;
	for( const segment of segments ) {
		if( segment.time <= time ) {
			rate = segment.rate;
		}
	}
	return rate;
}

/**
 * Context time at which the segments will have consumed an amount of content
 *
 * @param {Array<Object>} segments - Rate segments { time, rate } in time order
 * @param {number} content - Content seconds from the first segment's start
 * @returns {number} Context time; Infinity for unbounded content
 */
export function timeForContent( segments, content ) {
	if( content === Infinity ) {
		return Infinity;
	}
	let consumed = 0;
	for( let i = 0; i < segments.length - 1; i++ ) {
		const span = segments[ i ].rate * ( segments[ i + 1 ].time - segments[ i ].time );
		if( consumed + span >= content ) {
			return segments[ i ].time + ( content - consumed ) / segments[ i ].rate;
		}
		consumed += span;
	}
	const last = segments[ segments.length - 1 ];
	return last.time + ( content - consumed ) / last.rate;
}

/**
 * Record a rate change
 *
 * A change at or before the first segment's start replaces the initial rate. A later change
 * replaces any segment that starts at or after it.
 *
 * @param {Array<Object>} segments - Rate segments { time, rate }, modified in place
 * @param {number} time - Context time at which the new rate applies
 * @param {number} rate - New playback rate
 * @returns {void}
 */
export function addRateSegment( segments, time, rate ) {
	while( segments.length > 1 && segments[ segments.length - 1 ].time >= time ) {
		segments.pop();
	}
	if( time <= segments[ 0 ].time ) {
		segments[ 0 ].rate = rate;
		return;
	}
	segments.push( { "time": time, "rate": rate } );
}

/**
 * File position after consuming content from startTime
 *
 * @param {number} startTime - Content offset in seconds
 * @param {number} consumed - Content consumed in seconds
 * @param {number} fileLength - File length in seconds
 * @param {boolean} loop - Whether the position wraps at the file end
 * @returns {number} Position in seconds
 */
export function wrapPosition( startTime, consumed, fileLength, loop ) {
	const position = startTime + consumed;
	if( loop && fileLength > 0 ) {
		return position % fileLength;
	}
	return position;
}

/**
 * Whether a playback rate is within the bounds of a loading mode
 *
 * @param {number} rate - Playback rate
 * @param {boolean} stream - True for stream mode
 * @returns {boolean} True if the rate is allowed
 */
export function isPlaybackRateValid( rate, stream ) {
	let range = DECODE_RATES;
	if( stream ) {
		range = STREAM_RATES;
	}
	return rate >= range[ 0 ] && rate <= range[ 1 ];
}


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Throw an error with a code
 *
 * @param {Function} ErrorType - Error constructor
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {never}
 */
function throwError( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}

/**
 * Whether a source URL resolves to a file: URL, which audio does not support
 *
 * @param {string} src - Source URL
 * @returns {boolean} True for file: URLs
 */
function isFileUrl( src ) {
	let base;
	if( typeof document !== "undefined" ) {
		base = document.baseURI;
	}
	try {
		return new URL( src, base ).protocol === "file:";
	} catch( error ) {
		return false;
	}
}

/**
 * Release a media element without letting a cleanup failure strand other resources
 *
 * @param {HTMLAudioElement} element - Media element
 * @returns {void}
 */
function releaseElement( element ) {
	try {
		element.pause();
	} catch( caughtError ) {

		// Continue releasing the source even if playback could not be paused
	}
	try {
		element.removeAttribute( "src" );
		element.load();
	} catch( caughtError ) {

		// Listener removal and readiness settlement must still complete
	}
}

/**
 * Release an audio record's readiness wait once
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audio - Audio record
 * @returns {void}
 */
function settleLoad( pluginApi, audio ) {
	if( audio.settled ) {
		return;
	}
	audio.settled = true;
	clearTimeout( audio.retryTimer );
	audio.retryTimer = null;
	pluginApi.done();
}

/**
 * Retry a failed load attempt, or settle the load as failed
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audio - Audio record
 * @param {string} message - Failure description
 * @param {boolean} retryable - True for network failures
 * @param {number} retryCount - Retries remaining
 * @param {Function} retry - Starts the next attempt
 * @returns {void}
 */
function failLoad( pluginApi, audio, message, retryable, retryCount, retry ) {
	console.error( "loadAudio: " + message + " - " + audio.src );
	if( retryable && retryCount > 0 ) {
		const timer = setTimeout( () => {
			if( audio.removed || audio.retryTimer !== timer ) {
				return;
			}
			audio.retryTimer = null;
			try {
				retry();
			} catch( error ) {
				audio.status = "failed";
				settleLoad( pluginApi, audio );
				console.error( "loadAudio: Retry initialization failed:", error );
			}
		}, RETRY_DELAY );
		audio.retryTimer = timer;
		return;
	}
	if( retryable ) {
		console.error( "loadAudio: Max retries exceeded for " + audio.src );
	}
	audio.status = "failed";
	settleLoad( pluginApi, audio );
}

/**
 * Fetch and decode a file into an AudioBuffer
 *
 * Rejected fetches and 5xx statuses retry; 4xx statuses and decode errors fail at once.
 * Every result is ignored once the record is removed or a newer attempt has started.
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audio - Audio record
 * @param {number} retryCount - Retries remaining
 * @returns {void}
 */
function loadDecoded( pluginApi, audio, retryCount ) {
	const controller = new AbortController();
	audio.controller = controller;
	let retryable = true;

	function isCurrent() {
		return !audio.removed && audio.controller === controller;
	}

	fetch( audio.src, { "signal": controller.signal } ).then( response => {
		if( !response.ok ) {
			retryable = response.status >= 500;
			throw new Error( "HTTP status " + response.status );
		}
		return response.arrayBuffer();
	} ).then( data => {
		if( !isCurrent() ) {
			return null;
		}
		retryable = false;
		return g_context.getAudioContext().decodeAudioData( data );
	} ).then( buffer => {
		if( !isCurrent() || !buffer ) {
			return;
		}
		audio.controller = null;
		audio.buffer = buffer;
		audio.length = buffer.duration;
		audio.status = "ready";
		settleLoad( pluginApi, audio );
	} ).catch( error => {
		if( !isCurrent() ) {
			return;
		}
		audio.controller = null;
		let message = "Failed to load audio";
		if( error && error.message ) {
			message += ": " + error.message;
		}
		failLoad( pluginApi, audio, message, retryable, retryCount, () => {
			loadDecoded( pluginApi, audio, retryCount - 1 );
		} );
	} );
}

/**
 * Load a file into a media element for stream mode; ready at canplay
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audio - Audio record
 * @param {number} retryCount - Retries remaining
 * @returns {void}
 */
function loadStream( pluginApi, audio, retryCount ) {
	const element = new Audio();
	audio.element = element;
	let active = true;

	function detach() {
		active = false;
		element.removeEventListener( "canplay", ready );
		element.removeEventListener( "error", fail );
		audio.detach = null;
	}
	audio.detach = detach;

	function ready() {
		if( !active || audio.removed ) {
			return;
		}
		detach();
		audio.length = element.duration;
		audio.status = "ready";
		audio.ended = () => {
			streamEnded( audio );
		};
		element.addEventListener( "ended", audio.ended );
		settleLoad( pluginApi, audio );
	}

	function fail() {
		if( !active || audio.removed ) {
			return;
		}
		detach();
		const code = element.error?.code;
		audio.element = null;
		releaseElement( element );
		failLoad(
			pluginApi, audio, "Media error " + code, code === MEDIA_ERR_NETWORK, retryCount,
			() => {
				loadStream( pluginApi, audio, retryCount - 1 );
			}
		);
	}

	element.addEventListener( "canplay", ready );
	element.addEventListener( "error", fail );
	element.crossOrigin = "anonymous";
	element.preload = "auto";

	// Both modes change pitch together with speed
	element.preservesPitch = false;
	element.mozPreservesPitch = false;
	element.webkitPreservesPitch = false;
	element.src = audio.src;
}

/**
 * Invalidate an audio record, cancel its load, and stop its instances with a fade
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audio - Audio record
 * @returns {void}
 */
function disposeAudio( pluginApi, audio ) {
	audio.removed = true;
	if( audio.controller ) {
		audio.controller.abort();
		audio.controller = null;
	}
	if( audio.detach ) {
		audio.detach();
	}
	settleLoad( pluginApi, audio );
	for( const inst of Array.from( audio.instances ) ) {
		stopInstance( inst );
	}
	audio.buffer = null;

	// Release the element once the instances' fades have ended
	const element = audio.element;
	const sourceNode = audio.sourceNode;
	audio.element = null;
	audio.sourceNode = null;
	if( element && audio.ended ) {
		element.removeEventListener( "ended", audio.ended );
	}
	if( element && !sourceNode ) {
		releaseElement( element );
	} else if( element ) {
		const context = g_context.getAudioContext();
		const delay = g_context.getScheduleLead() - context.currentTime + g_envelope.STOP_FADE;
		setTimeout( () => {
			sourceNode.disconnect();
			releaseElement( element );
		}, delay * 1000 );
	}
}

/**
 * Whether a numeric instance ID has been issued
 *
 * @param {number} id - Instance ID
 * @returns {boolean} True for issued IDs
 */
function isIssued( id ) {
	return Number.isInteger( id ) && id >= 1 && id < m_nextInstanceId;
}

/**
 * Resolve an ID argument to live instances
 *
 * @param {number|string|null|undefined} id - Instance ID, audio ID, or omitted for all
 * @param {string} name - Command name for error messages
 * @returns {Array<Object>} Live instances; empty for completed instance IDs
 */
function resolveInstances( id, name ) {
	if( id === null || id === undefined ) {
		return Array.from( m_instances.values() );
	}
	if( typeof id === "string" ) {
		if( !m_audio[ id ] ) {
			throwError( Error, `${name}: Audio "${id}" not found.`, "AUDIO_NOT_FOUND" );
		}
		return Array.from( m_audio[ id ].instances );
	}
	if( typeof id === "number" ) {
		if( !isIssued( id ) ) {
			throwError( Error, `${name}: Audio instance ${id} not found.`, "AUDIO_NOT_FOUND" );
		}
		const inst = m_instances.get( id );
		if( inst ) {
			return [ inst ];
		}
		return [];
	}
	throwError(
		TypeError, `${name}: Parameter id must be an instance ID or an audio ID.`,
		"INVALID_AUDIO_ID"
	);
}

/**
 * Remove an instance from every table; its ID is completed from now on
 *
 * @param {Object} inst - Instance record
 * @returns {void}
 */
function completeInstance( inst ) {
	inst.state = "done";
	inst.voice = null;
	m_instances.delete( inst.id );
	inst.audio.instances.delete( inst );
	if( inst.audio.current === inst ) {
		inst.audio.current = null;
	}
	if( inst.pending ) {
		g_scheduler.removePending( inst.id );
		inst.pending = false;
	}
	if( inst.deferred ) {
		g_context.cancelUnlock( inst.deferred );
		inst.deferred = null;
	}
}

/**
 * Stop an instance explicitly: pending and paused instances end now, voiced ones fade
 *
 * @param {Object} inst - Instance record
 * @returns {void}
 */
function stopInstance( inst ) {
	const voice = inst.voice;
	completeInstance( inst );
	if( voice ) {
		g_voices.stopVoice( voice, null, "stop" );
	}
}

/**
 * Content consumed by an instance at a context time
 *
 * @param {Object} inst - Instance record with segments
 * @param {number} time - Context time
 * @returns {number} Content seconds since startTime
 */
function contentAt( inst, time ) {
	return inst.consumed + consumedAt( inst.segments, time );
}

/**
 * Instance gain: volume, and the pan level factor for mono buffers
 *
 * A StereoPannerNode lowers a centered mono input by 3 dB and passes stereo input through
 * unchanged at center, so only mono buffers need the factor.
 *
 * @param {Object} inst - Instance record
 * @returns {number} Gain
 */
function instanceGain( inst ) {
	if( inst.mono ) {
		return inst.volume * g_voices.panGain( inst.pan );
	}
	return inst.volume;
}

/**
 * Ramp an AudioParam linearly to a target over CONTROL_RAMP, continuing any ramp in progress
 *
 * @param {AudioParam} param - Parameter
 * @param {Object} ramp - Current ramp record { from, to, t0, t1 }
 * @param {number} target - Target value
 * @param {number} time - Context time at which the ramp begins
 * @returns {Object} New ramp record
 */
function rampControl( param, ramp, target, time ) {
	const current = g_envelope.rampValueAt( ramp, time );
	param.cancelScheduledValues( time );
	if( time > ramp.t0 && time <= ramp.t1 ) {
		param.linearRampToValueAtTime( current, time );
	} else {
		param.setValueAtTime( current, time );
	}
	param.linearRampToValueAtTime( target, time + CONTROL_RAMP );
	return { "from": current, "to": target, "t0": time, "t1": time + CONTROL_RAMP };
}

/**
 * Value of the fade gain's recorded events at a context time
 *
 * @param {Array<Object>} events - "set" and "linear" events in time order
 * @param {number} time - Context time
 * @returns {number} Gain value
 */
function fadeValueAt( events, time ) {
	let value = 0;
	let previous = -Infinity;
	for( const event of events ) {
		if( event.time <= time ) {
			value = event.value;
			previous = event.time;
		} else {
			if( event.type === "linear" && previous > -Infinity ) {
				return value + ( event.value - value ) * ( time - previous ) /
					( event.time - previous );
			}
			return value;
		}
	}
	return value;
}

/**
 * Add an event to a voice's fade gain and to its record
 *
 * @param {Object} voice - Sample voice
 * @param {Object} event - "set" or "linear" event
 * @returns {void}
 */
function pushFade( voice, event ) {
	voice.fadeEvents.push( event );
	g_envelope.applySchedule( voice.gain.gain, [ event ] );
}

/**
 * Cancel fade events from a time and pin the analytic value there
 *
 * Cancelling also removes a ramp still in progress or ending at the time, so the value is
 * re-created there with a linear event.
 *
 * @param {Object} voice - Sample voice
 * @param {number} time - Context time
 * @returns {void}
 */
function holdFade( voice, time ) {
	const events = voice.fadeEvents;
	const value = fadeValueAt( events, time );
	let type = "set";
	for( const event of events ) {
		if( event.time >= time ) {
			if( event.type === "linear" ) {
				type = "linear";
			}
			break;
		}
	}
	voice.gain.gain.cancelScheduledValues( time );
	while( events.length > 0 && events[ events.length - 1 ].time >= time ) {
		events.pop();
	}
	pushFade( voice, { "type": type, "time": time, "value": value } );
}

/**
 * Schedule the fade that ends a finite budget, from the predicted end time
 *
 * @param {Object} voice - Sample voice
 * @param {Object} inst - Instance record
 * @param {number} from - Earliest context time at which the fade may start
 * @returns {void}
 */
function scheduleEndFade( voice, inst, from ) {
	voice.endFadeStart = null;
	const end = timeForContent( inst.segments, inst.budget - inst.consumed );
	if( end === Infinity ) {
		voice.end = Infinity;
		return;
	}
	const fadeEnd = Math.max( end, from + g_envelope.MIN_RAMP );
	const fadeStart = Math.max( from, fadeEnd - g_envelope.STOP_FADE );
	pushFade( voice, { "type": "set", "time": fadeStart, "value": 1 } );
	pushFade( voice, { "type": "linear", "time": fadeEnd, "value": 0 } );
	voice.endFadeStart = fadeStart;
	voice.end = fadeEnd;
	voice.source.stop( fadeEnd );
}

/**
 * Move the end fade after a rate change; a fade already under way or a stop is kept
 *
 * @param {Object} inst - Instance record
 * @param {Object} voice - Sample voice
 * @returns {void}
 */
function updateEndFade( inst, voice ) {
	if( voice.stopKind !== null || !voice.started ) {
		return;
	}
	const from = Math.max( g_context.getScheduleLead(), voice.begin + g_envelope.MIN_RAMP );
	if( voice.endFadeStart !== null && voice.endFadeStart < from ) {
		return;
	}
	if( voice.end === Infinity && voice.endFadeStart === null && inst.budget === Infinity ) {
		return;
	}
	holdFade( voice, from );
	scheduleEndFade( voice, inst, from );
}

/**
 * The voice of an instance has been disposed: a natural end, steal, or cleanup completes it
 *
 * @param {Object} inst - Instance record
 * @param {Object} voice - Disposed voice
 * @returns {void}
 */
function voiceEnded( inst, voice ) {
	clearTimeout( voice.startTimer );
	clearTimeout( voice.stopTimer );
	if( voice.streamSource ) {
		try {
			voice.streamSource.disconnect( voice.gain );
		} catch( caughtError ) {

			// Already disconnected
		}
	}
	if( inst.voice === voice ) {
		completeInstance( inst );
	}
}

/**
 * Create a sample voice record with its gain chain connected to the audio bus
 *
 * @param {Object} inst - Instance record
 * @param {number} begin - Audible start in context time
 * @returns {Object} Voice record whose `fade` and `onDispose` hooks are set
 */
function createSampleVoice( inst, begin ) {
	const context = g_context.getAudioContext();
	const voice = g_voices.createVoiceRecord( {
		"id": "instance_" + inst.id,
		"kind": "sample",
		"start": begin,
		"begin": begin,
		"end": Infinity,
		"fadeEvents": [],
		"endFadeStart": null,
		"started": false,
		"startTimer": null,
		"stopTimer": null,
		"streamSource": null
	} );
	const fade = context.createGain();
	const volume = context.createGain();
	const panner = context.createStereoPanner();
	voice.nodes.push( fade, volume, panner );
	voice.gain = fade;
	fade.gain.value = 0;
	volume.gain.value = instanceGain( inst );
	panner.pan.value = inst.pan;
	fade.connect( volume );
	volume.connect( panner );
	panner.connect( g_context.getBusInput( "audio" ) );
	inst.volumeNode = volume;
	inst.panner = panner;
	inst.volumeRamp = { "from": volume.gain.value, "to": volume.gain.value, "t0": 0, "t1": 0 };
	inst.panRamp = { "from": inst.pan, "to": inst.pan, "t0": 0, "t1": 0 };
	pushFade( voice, { "type": "set", "time": begin, "value": 0 } );

	voice.fade = ( fadeStart, deadline ) => {
		holdFade( voice, fadeStart );
		pushFade( voice, { "type": "linear", "time": deadline, "value": 0 } );
		voice.source.stop( deadline );
	};
	voice.onDispose = () => {
		voiceEnded( inst, voice );
	};
	return voice;
}

/**
 * Disconnect a partially built voice after a construction failure
 *
 * @param {Object} voice - Voice record
 * @returns {void}
 */
function abandonVoice( voice ) {
	voice.disposed = true;
	clearTimeout( voice.startTimer );
	for( const node of voice.nodes ) {
		try {
			node.disconnect();
		} catch( caughtError ) {

			// Already disconnected
		}
	}
	if( voice.streamSource ) {
		try {
			voice.streamSource.disconnect( voice.gain );
		} catch( caughtError ) {

			// Already disconnected
		}
	}
}

/**
 * Build a decode-mode voice and start its buffer source
 *
 * @param {Object} inst - Instance record
 * @param {number} begin - Audible start in context time
 * @param {number} content - Content consumed at begin, including skipped content
 * @returns {Object} Voice record
 */
function buildDecodeVoice( inst, begin, content ) {
	const context = g_context.getAudioContext();
	const audio = inst.audio;
	const voice = createSampleVoice( inst, begin );
	try {
		const source = context.createBufferSource();
		voice.source = source;
		voice.nodes.unshift( source );
		source.buffer = audio.buffer;
		source.loop = inst.loop;

		// Rate steps follow the segments from the audible start
		const rate = source.playbackRate;
		rate.value = rateAt( inst.segments, begin );
		rate.setValueAtTime( rate.value, begin );
		for( const segment of inst.segments ) {
			if( segment.time > begin ) {
				rate.setValueAtTime( segment.rate, segment.time );
			}
		}

		source.connect( voice.gain );
		source.onended = () => {
			g_voices.releaseVoice( voice );
		};
		const offset = wrapPosition( inst.startTime, content, audio.length, inst.loop );
		const remaining = inst.budget - content;
		if( remaining === Infinity ) {
			source.start( begin, offset );
		} else {
			source.start( begin, offset, remaining );
		}
		voice.started = true;
		pushFade( voice, {
			"type": "linear", "time": begin + g_envelope.MIN_RAMP, "value": 1
		} );
		scheduleEndFade( voice, inst, begin + g_envelope.MIN_RAMP );
	} catch( error ) {
		abandonVoice( voice );
		throw error;
	}
	g_voices.registerVoice( voice );
	return voice;
}

/**
 * Build a stream-mode voice on the audio's media element source
 *
 * Playback starts now when the start is at the scheduling lead, which keeps a start inside a
 * gesture listener under its user activation, or from a timer otherwise.
 *
 * @param {Object} inst - Instance record
 * @param {number} begin - Audible start in context time
 * @param {number} content - Content consumed at begin
 * @returns {Object} Voice record
 */
function buildStreamVoice( inst, begin, content ) {
	const context = g_context.getAudioContext();
	const audio = inst.audio;
	const voice = createSampleVoice( inst, begin );
	try {
		if( !audio.sourceNode ) {
			audio.sourceNode = context.createMediaElementSource( audio.element );
		}
		voice.streamSource = audio.sourceNode;
		audio.sourceNode.connect( voice.gain );
		voice.source = {
			"stop": when => {
				stopStream( inst, voice, when );
			}
		};
	} catch( error ) {
		abandonVoice( voice );
		throw error;
	}
	g_voices.registerVoice( voice );
	inst.voice = voice;

	let position = inst.resumePosition;
	if( position === null ) {
		position = wrapPosition( inst.startTime, content, audio.length, inst.loop );
	}
	if( begin <= g_context.getScheduleLead() ) {
		startStream( inst, voice, position );
	} else {
		voice.startTimer = setTimeout( () => {
			voice.startTimer = null;
			startStream( inst, voice, position );
		}, ( begin - context.currentTime ) * 1000 );
	}
	return voice;
}

/**
 * Seek and play a stream instance's element, then fade its voice in
 *
 * @param {Object} inst - Instance record
 * @param {Object} voice - Stream voice
 * @param {number} position - File position in seconds
 * @returns {void}
 */
function startStream( inst, voice, position ) {
	if( voice.disposed || inst.voice !== voice || voice.stopKind !== null ) {
		return;
	}
	const audio = inst.audio;
	const element = audio.element;
	audio.playing = voice;
	element.loop = inst.loop;
	element.playbackRate = inst.rate;
	element.currentTime = position;
	const played = element.play();
	if( played && typeof played.catch === "function" ) {
		played.catch( error => {
			console.warn( "playAudio: Audio playback failed:", error.message );
		} );
	}
	const lead = g_context.getScheduleLead();
	holdFade( voice, lead );
	pushFade( voice, { "type": "linear", "time": lead + g_envelope.MIN_RAMP, "value": 1 } );
	voice.started = true;
	scheduleEndFade( voice, inst, lead + g_envelope.MIN_RAMP );
}

/**
 * Stop a stream voice at a context time: pause its element if this voice still plays it,
 * then dispose of the voice. Each call replaces the previous deadline.
 *
 * @param {Object} inst - Instance record
 * @param {Object} voice - Stream voice
 * @param {number} [when] - Context time; omitted stops now
 * @returns {void}
 */
function stopStream( inst, voice, when ) {
	clearTimeout( voice.stopTimer );
	voice.stopTimer = null;
	const audio = inst.audio;

	function finish() {
		voice.stopTimer = null;
		if( audio.playing === voice ) {
			audio.playing = null;
			if( audio.element ) {
				audio.element.pause();
			}
		}
		g_voices.releaseVoice( voice );
	}

	let delay = 0;
	if( when !== undefined ) {
		delay = when - g_context.getAudioContext().currentTime;
	}
	if( delay <= 0 ) {
		finish();
	} else {
		voice.stopTimer = setTimeout( finish, delay * 1000 );
	}
}

/**
 * A stream element reached the end of the file
 *
 * @param {Object} audio - Audio record
 * @returns {void}
 */
function streamEnded( audio ) {
	const voice = audio.playing;
	audio.playing = null;
	if( voice ) {
		g_voices.releaseVoice( voice );
	}
}

/**
 * Admit and build an instance's voice
 *
 * @param {Object} inst - Instance record with segments
 * @param {number} begin - Audible start in context time
 * @param {number} content - Content consumed at begin
 * @returns {boolean} True when admitted
 */
function admitInstance( inst, begin, content ) {
	const inherit = inst.inherit;
	inst.inherit = false;
	const voice = g_voices.admitVoice( {
		"begin": begin,
		"end": Infinity,
		"protected": inst.loop,
		"inherit": inherit,
		"build": () => {
			if( inst.stream ) {
				return buildStreamVoice( inst, begin, content );
			}
			return buildDecodeVoice( inst, begin, content );
		}
	} );
	if( voice === null ) {
		return false;
	}
	inst.voice = voice;
	inst.state = "voiced";
	inst.resumePosition = null;
	return true;
}

/**
 * Start a scheduled instance, applying the late-start rule
 *
 * An instance is late when its start is before the scheduling lead. Expiration is checked
 * first; a one-shot beyond the grace interval completes silently; otherwise the instance
 * starts at the lead with its offset advanced and its remaining content reduced by the
 * content skipped. Rejected and expired instances complete.
 *
 * @param {Object} inst - Instance record
 * @returns {void}
 */
function startInstance( inst ) {
	const context = g_context.getAudioContext();
	const now = context.currentTime;
	const lead = g_context.getScheduleLead();
	let begin = inst.start;
	let content = inst.consumed;
	if( begin < lead ) {
		content = contentAt( inst, lead );
		const remaining = inst.budget - content;
		if( remaining < g_envelope.MIN_RAMP * rateAt( inst.segments, lead ) ) {
			completeInstance( inst );
			return;
		}
		if( !inst.loop && now - inst.start > g_scheduler.LATE_GRACE ) {
			completeInstance( inst );
			return;
		}
		begin = lead;
	}
	let admitted = false;
	try {
		admitted = admitInstance( inst, begin, content );
	} finally {
		if( !admitted ) {
			completeInstance( inst );
		}
	}
}

/**
 * Schedule an instance from now: start inside the window or keep a pending record
 *
 * @param {Object} inst - Instance record
 * @returns {void}
 */
function scheduleInstance( inst ) {
	const context = g_context.getAudioContext();
	const now = context.currentTime;
	inst.start = Math.max( now + inst.delay, g_context.getScheduleLead(), inst.after );
	inst.segments = [ { "time": inst.start, "rate": inst.rate } ];
	if( g_scheduler.shouldCreate( inst.start, now ) ) {
		startInstance( inst );
		return;
	}
	g_scheduler.addPending( {
		"id": inst.id,
		"kind": "audio",
		"start": inst.start,
		"run": () => {
			inst.pending = false;
			startInstance( inst );
		}
	}, "playAudio" );
	inst.pending = true;
}

/**
 * Pause an instance at the scheduling lead and save its position
 *
 * An instance that has not started yet has its start cancelled, and resumes from startTime
 * with its full budget.
 *
 * @param {Object} inst - Instance record
 * @returns {void}
 */
function pauseInstance( inst ) {
	if( inst.deferred ) {
		g_context.cancelUnlock( inst.deferred );
		inst.deferred = null;
	}
	if( inst.state === "paused" ) {
		return;
	}
	if( inst.pending ) {
		g_scheduler.removePending( inst.id );
		inst.pending = false;
	}
	const voice = inst.voice;
	inst.voice = null;
	inst.state = "paused";
	if( !voice ) {
		return;
	}
	const lead = g_context.getScheduleLead();
	if( voice.begin >= lead || !voice.started ) {
		inst.consumed = 0;
	} else {
		inst.consumed = Math.min( contentAt( inst, lead ), inst.budget );
		if( inst.stream && inst.audio.element ) {
			inst.resumePosition = inst.audio.element.currentTime;
		}
	}
	inst.segments = null;
	g_voices.stopVoice( voice, null, "stop" );
}

/**
 * Resume a paused instance from its saved position; a rejected resume stays paused
 *
 * @param {Object} inst - Instance record
 * @returns {void}
 */
function resumeInstance( inst ) {
	if( inst.state !== "paused" ) {
		return;
	}
	if( inst.budget - inst.consumed < g_envelope.MIN_RAMP * inst.rate ) {
		completeInstance( inst );
		return;
	}
	if( g_context.isLocked() ) {
		if( inst.loop && !inst.deferred ) {
			inst.deferred = () => {
				inst.deferred = null;
				resumeInstance( inst );
			};
			g_context.onUnlock( inst.deferred );
		}
		return;
	}
	const lead = g_context.getScheduleLead();
	inst.start = lead;
	inst.segments = [ { "time": lead, "rate": inst.rate } ];
	let admitted = false;
	try {
		admitted = admitInstance( inst, lead, inst.consumed );
	} finally {
		if( !admitted ) {
			inst.segments = null;
		}
	}
}

/**
 * Apply setAudio changes to an instance in any state
 *
 * @param {Object} inst - Instance record
 * @param {number|null} volume - New volume, or null
 * @param {number|null} rate - New playback rate, or null
 * @param {number|null} pan - New pan, or null
 * @returns {void}
 */
function changeInstance( inst, volume, rate, pan ) {
	if( volume !== null ) {
		inst.volume = volume;
	}
	if( pan !== null ) {
		inst.pan = pan;
	}
	if( rate !== null ) {
		inst.rate = rate;
	}
	const voice = inst.voice;
	if( !voice ) {

		// Pending and deferred instances record the rate as their initial segment; paused
		// instances apply stored values on resume
		if( rate !== null && inst.segments && inst.state === "pending" ) {
			addRateSegment( inst.segments, g_context.getScheduleLead(), rate );
		}
		return;
	}

	const lead = g_context.getScheduleLead();
	const time = Math.max( lead, voice.begin );
	if( volume !== null || pan !== null ) {
		inst.volumeRamp = rampControl(
			inst.volumeNode.gain, inst.volumeRamp, instanceGain( inst ), time
		);
	}
	if( pan !== null ) {
		inst.panRamp = rampControl( inst.panner.pan, inst.panRamp, pan, time );
	}
	if( rate === null ) {
		return;
	}
	if( inst.stream ) {
		addRateSegment( inst.segments, lead, rate );
		if( inst.audio.playing === voice && inst.audio.element ) {
			inst.audio.element.playbackRate = rate;
		}
	} else {
		addRateSegment( inst.segments, time, rate );

		// playbackRate is evaluated once per render quantum, so a change before an unaligned
		// start steps at the lead, which is on a quantum boundary, to cover the first quantum
		let step = time;
		if( time <= voice.begin ) {
			step = lead;
		}
		const param = voice.source.playbackRate;
		param.cancelScheduledValues( step );
		param.setValueAtTime( rate, step );
	}
	updateEndFade( inst, voice );
}

/**
 * Validate a number within a range
 *
 * @param {string} name - Command name
 * @param {string} param - Parameter name
 * @param {number} value - Value
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @param {string} code - Error code
 * @returns {void}
 */
function validateRange( name, param, value, min, max, code ) {
	if( !( value >= min && value <= max ) ) {
		let message = `${name}: Parameter ${param} must be a number `;
		if( max === Infinity ) {
			message += `greater than or equal to ${min}.`;
		} else {
			message += `between ${min} and ${max}.`;
		}
		throwError( RangeError, message, code );
	}
}

/**
 * Validate a playback rate against a loading mode
 *
 * @param {string} name - Command name
 * @param {number} rate - Playback rate
 * @param {boolean} stream - True for stream mode
 * @returns {void}
 */
function validatePlaybackRate( name, rate, stream ) {
	if( !isPlaybackRateValid( rate, stream ) ) {
		let range = DECODE_RATES;
		let mode = "decoded";
		if( stream ) {
			range = STREAM_RATES;
			mode = "streamed";
		}
		throwError(
			RangeError,
			`${name}: Parameter playbackRate must be between ${range[ 0 ]} and ${range[ 1 ]} ` +
			`for ${mode} audio.`,
			"INVALID_PLAYBACK_RATE"
		);
	}
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register audio sample commands
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
export function registerSamples( pluginApi ) {
	const utils = pluginApi.utils;


	pluginApi.addCommand( "loadAudio", loadAudio, false, [ "src", "name", "stream" ] );

	/**
	 * Load an audio file for playAudio; holds one readiness wait until it loads or fails
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.src - Audio file URL; requires an HTTP(S) page
	 * @param {string} options.name - Optional unique audio ID
	 * @param {boolean} options.stream - True to stream through a media element instead of
	 * decoding into memory (default: false)
	 * @returns {string} Audio ID for use with playAudio
	 */
	function loadAudio( options ) {
		const src = options.src;
		const audioName = options.name;
		let stream = false;
		if( options.stream !== null && options.stream !== undefined ) {
			stream = options.stream;
		}

		// Validate src
		if( !src || typeof src !== "string" ) {
			throwError(
				TypeError, "loadAudio: Parameter src must be a non-empty string.", "INVALID_SRC"
			);
		}

		// Validate stream
		if( typeof stream !== "boolean" ) {
			throwError(
				TypeError, "loadAudio: Parameter stream must be a boolean.", "INVALID_STREAM"
			);
		}

		// Audio requires an HTTP(S) server
		if( isFileUrl( src ) ) {
			throwError(
				Error, "loadAudio: Audio requires an HTTP(S) server; file: URLs are not supported.",
				"UNSUPPORTED_PROTOCOL"
			);
		}

		let audioId;
		if( audioName ) {

			// Name must be unique
			if( m_audio[ audioName ] ) {
				throwError(
					Error, `loadAudio: Audio name "${audioName}" is already in use.`,
					"DUPLICATE_AUDIO_NAME"
				);
			}
			audioId = audioName;
		} else {
			do {
				audioId = "audio_" + m_nextAudioId;
				m_nextAudioId += 1;
			} while( m_audio[ audioId ] );
		}

		const audio = {
			"id": audioId,
			"src": src,
			"stream": stream,
			"status": "loading",
			"removed": false,
			"settled": false,
			"controller": null,
			"retryTimer": null,
			"detach": null,
			"ended": null,
			"buffer": null,
			"element": null,
			"sourceNode": null,
			"length": 0,
			"instances": new Set(),
			"current": null,
			"playing": null
		};

		pluginApi.wait();
		try {
			if( stream ) {
				loadStream( pluginApi, audio, RETRY_COUNT );
			} else {
				loadDecoded( pluginApi, audio, RETRY_COUNT );
			}
		} catch( error ) {
			disposeAudio( pluginApi, audio );
			throw error;
		}

		m_audio[ audioId ] = audio;
		return audioId;
	}


	pluginApi.addCommand( "removeAudio", removeAudio, false, [ "audioId" ] );

	/**
	 * Remove loaded audio: cancels its load, stops its instances with a fade, and frees the name
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.audioId - Audio ID returned from loadAudio
	 * @returns {void}
	 */
	function removeAudio( options ) {
		const audioId = options.audioId;
		if( typeof audioId !== "string" || !m_audio[ audioId ] ) {
			throwError( Error, `removeAudio: Audio "${audioId}" not found.`, "AUDIO_NOT_FOUND" );
		}
		const audio = m_audio[ audioId ];
		delete m_audio[ audioId ];
		disposeAudio( pluginApi, audio );
	}


	pluginApi.addCommand( "playAudio", playAudio, false, [
		"audioId", "volume", "startTime", "duration", "loop", "playbackRate", "pan", "delay"
	] );

	/**
	 * Play loaded audio as a new instance
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.audioId - Audio ID
	 * @param {number} options.volume - Instance volume 0-1 (default: 1)
	 * @param {number} options.startTime - Offset into the file in seconds (default: 0)
	 * @param {number} options.duration - Seconds of file content to play, including every loop
	 * pass; 0 plays to the end, or forever when looping (default: 0)
	 * @param {boolean} options.loop - Loop the whole file (default: false)
	 * @param {number} options.playbackRate - Speed and pitch; 0.0625-16 decoded, 0.25-4
	 * streamed (default: 1)
	 * @param {number} options.pan - Stereo position from -1 to 1 (default: 0)
	 * @param {number} options.delay - Seconds before playback starts (default: 0)
	 * @returns {number} Instance ID
	 */
	function playAudio( options ) {
		const audioId = options.audioId;
		const volume = utils.getFloat( options.volume, 1 );
		const startTime = utils.getFloat( options.startTime, 0 );
		const duration = utils.getFloat( options.duration, 0 );
		const playbackRate = utils.getFloat( options.playbackRate, 1 );
		const pan = utils.getFloat( options.pan, 0 );
		const delay = utils.getFloat( options.delay, 0 );
		let loop = false;
		if( options.loop !== null && options.loop !== undefined ) {
			loop = options.loop;
		}

		// Validate audioId
		if( typeof audioId !== "string" || !m_audio[ audioId ] ) {
			throwError( Error, `playAudio: Audio "${audioId}" not found.`, "AUDIO_NOT_FOUND" );
		}
		const audio = m_audio[ audioId ];

		validateRange( "playAudio", "volume", volume, 0, 1, "INVALID_VOLUME" );
		validateRange( "playAudio", "startTime", startTime, 0, Infinity, "INVALID_START_TIME" );
		validateRange( "playAudio", "duration", duration, 0, Infinity, "INVALID_DURATION" );
		if( typeof loop !== "boolean" ) {
			throwError( TypeError, "playAudio: Parameter loop must be a boolean.", "INVALID_LOOP" );
		}
		validatePlaybackRate( "playAudio", playbackRate, audio.stream );
		validateRange( "playAudio", "pan", pan, -1, 1, "INVALID_PAN" );
		validateRange( "playAudio", "delay", delay, 0, Infinity, "INVALID_DELAY" );

		// Audio must be loaded
		if( audio.status !== "ready" ) {
			throwError(
				Error, `playAudio: Audio "${audioId}" is not loaded.`, "AUDIO_NOT_LOADED"
			);
		}

		const id = m_nextInstanceId;
		m_nextInstanceId += 1;

		// An exhausted budget completes without constructing a source
		const budget = resolveBudget( audio.length, startTime, duration, loop );
		if( !( budget > 0 ) ) {
			return id;
		}

		// A locked context drops one-shots; the ID is returned in the completed state
		const locked = g_context.isLocked();
		if( locked && !loop ) {
			return id;
		}

		const inst = {
			"id": id,
			"audio": audio,
			"stream": audio.stream,
			"mono": !audio.stream && audio.buffer.numberOfChannels === 1,
			"volume": volume,
			"rate": playbackRate,
			"pan": pan,
			"loop": loop,
			"startTime": startTime,
			"delay": delay,
			"budget": budget,
			"consumed": 0,
			"segments": null,
			"start": 0,
			"after": 0,
			"state": "pending",
			"voice": null,
			"pending": false,
			"deferred": null,
			"inherit": false,
			"resumePosition": null,
			"volumeNode": null,
			"panner": null,
			"volumeRamp": null,
			"panRamp": null
		};

		// Stream mode has one element: a new instance fades out and replaces the current one,
		// inheriting its voice slot, and starts when that fade ends
		if( audio.stream && audio.current ) {
			const outgoing = audio.current;
			const outgoingVoice = outgoing.voice;
			if( outgoingVoice && outgoingVoice.slotEnd !== null ) {
				inst.inherit = true;
			}
			stopInstance( outgoing );
			if( outgoingVoice && !outgoingVoice.disposed ) {
				inst.after = outgoingVoice.end;
			}
		}

		m_instances.set( id, inst );
		audio.instances.add( inst );
		if( audio.stream ) {
			audio.current = inst;
		}

		// A locked context defers loops until the unlocking gesture
		if( locked ) {
			inst.deferred = () => {
				inst.deferred = null;
				try {
					scheduleInstance( inst );
				} catch( error ) {
					completeInstance( inst );
					throw error;
				}
			};
			g_context.onUnlock( inst.deferred );
			return id;
		}

		try {
			scheduleInstance( inst );
		} catch( error ) {
			completeInstance( inst );
			throw error;
		}
		return id;
	}


	pluginApi.addCommand( "stopAudio", stopAudio, false, [ "id" ] );

	/**
	 * Stop instances with a short fade
	 *
	 * @param {Object} options - Command options
	 * @param {number|string} options.id - Instance ID, audio ID, or omitted for all instances
	 * @returns {void}
	 */
	function stopAudio( options ) {
		for( const inst of resolveInstances( options.id, "stopAudio" ) ) {
			stopInstance( inst );
		}
	}


	pluginApi.addCommand( "pauseAudio", pauseAudio, false, [ "id" ] );

	/**
	 * Pause instances, saving their positions
	 *
	 * @param {Object} options - Command options
	 * @param {number|string} options.id - Instance ID, audio ID, or omitted for all instances
	 * @returns {void}
	 */
	function pauseAudio( options ) {
		for( const inst of resolveInstances( options.id, "pauseAudio" ) ) {
			pauseInstance( inst );
		}
	}


	pluginApi.addCommand( "resumeAudio", resumeAudio, false, [ "id" ] );

	/**
	 * Resume paused instances from their saved positions
	 *
	 * @param {Object} options - Command options
	 * @param {number|string} options.id - Instance ID, audio ID, or omitted for all instances
	 * @returns {void}
	 */
	function resumeAudio( options ) {
		for( const inst of resolveInstances( options.id, "resumeAudio" ) ) {
			resumeInstance( inst );
		}
	}


	pluginApi.addCommand(
		"setAudio", setAudio, false, [ "instanceId", "volume", "playbackRate", "pan" ]
	);

	/**
	 * Change an instance's volume, playback rate, or pan; omitted values are unchanged
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.instanceId - Instance ID
	 * @param {number} options.volume - Volume 0-1
	 * @param {number} options.playbackRate - Playback rate within the instance's mode range
	 * @param {number} options.pan - Stereo position from -1 to 1
	 * @returns {void}
	 */
	function setAudio( options ) {
		const instanceId = options.instanceId;
		const volume = utils.getFloat( options.volume, null );
		const playbackRate = utils.getFloat( options.playbackRate, null );
		const pan = utils.getFloat( options.pan, null );

		if( typeof instanceId !== "number" ) {
			throwError(
				TypeError, "setAudio: Parameter instanceId must be an instance ID.",
				"INVALID_AUDIO_ID"
			);
		}
		if( volume !== null ) {
			validateRange( "setAudio", "volume", volume, 0, 1, "INVALID_VOLUME" );
		}
		if( pan !== null ) {
			validateRange( "setAudio", "pan", pan, -1, 1, "INVALID_PAN" );
		}
		const instances = resolveInstances( instanceId, "setAudio" );
		if( playbackRate !== null ) {
			let stream = false;
			if( instances.length > 0 ) {
				stream = instances[ 0 ].stream;
			}
			validatePlaybackRate( "setAudio", playbackRate, stream );
		}
		for( const inst of instances ) {
			changeInstance( inst, volume, playbackRate, pan );
		}
	}
}
