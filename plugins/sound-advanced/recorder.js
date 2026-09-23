/**
 * Pi.js - Sound Advanced Recorder Module (Plugin)
 *
 * startRecording(), stopRecording(), getRecordingState(), and saveRecording(): real-time
 * capture of the final output after the limiter, or of one bus, to a WAV Blob. A recorder
 * AudioWorkletNode receives the signal through the sound service's read-only bus tap; the tap
 * is removed when capture ends, so a finished recorder costs no processing.
 *
 * @module plugins/sound-advanced/recorder
 */

"use strict";

import * as g_wav from "./wav.js";
import * as g_worklet from "./worklet.js";

export const RECORDING_BUSES = [ "output", "master", "sfx", "music", "audio" ];

// Recording length limits in seconds
const DEFAULT_MAX_DURATION = 60;
const MIN_DURATION = 1;
const MAX_DURATION = 600;

// "idle", "starting", "recording", or "full", and the active recording
let m_state = "idle";
let m_recording = null;


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
 * Store samples posted by the recorder processor and handle the end of capture
 *
 * @param {Object} recording - Active recording
 * @param {Object} data - { samples: Float32Array[], end: null | "full" | "done" }
 * @returns {void}
 */
function receive( recording, data ) {
	let samples = data.samples;
	if( samples[ 0 ].length > 0 ) {

		// 16-bit recordings convert as chunks arrive, which halves their memory
		if( recording.bitDepth === 16 ) {
			samples = samples.map( g_wav.toPcm16 );
		}
		recording.chunks.push( samples );
		recording.frames += samples[ 0 ].length;
	}
	if( data.end ) {
		recording.untap();
	}
	if( data.end === "full" ) {
		m_state = "full";
	} else if( data.end === "done" ) {
		recording.node.port.close();
		const wav = g_wav.encodeWav(
			recording.chunks, 2, recording.sampleRate, recording.bitDepth
		);
		recording.chunks = null;
		m_state = "idle";
		m_recording = null;
		recording.finish( new Blob( [ wav ], { "type": "audio/wav" } ) );
	}
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the recording commands
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} service - Sound extension service
 * @returns {void}
 */
export function register( pluginApi, service ) {

	pluginApi.addCommand(
		"startRecording", startRecording, false, [ "bus", "maxDuration", "bitDepth" ]
	);

	/**
	 * Start capturing a bus to memory
	 *
	 * Capture follows context time: nothing is captured while the audio context is locked or
	 * suspended. At maxDuration capture stops and the state becomes "full"; the samples are
	 * kept until stopRecording() collects them. Only one recording runs at a time.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.bus - "output" (after the limiter), "master", "sfx", "music",
	 *   or "audio" (default: "output")
	 * @param {number} options.maxDuration - Seconds, 1 to 600 (default: 60)
	 * @param {number} options.bitDepth - 16 (PCM) or 32 (float) (default: 16)
	 * @returns {Promise} Resolves when capture is running; rejects with RECORDING_UNAVAILABLE
	 *   when the audio worklet cannot load
	 */
	function startRecording( options ) {
		let bus = "output";
		if( options.bus != null ) {
			bus = options.bus;
		}
		if( RECORDING_BUSES.indexOf( bus ) === -1 ) {
			throwCode(
				Error,
				"startRecording: Parameter bus must be one of: output, master, sfx, music, audio.",
				"INVALID_BUS"
			);
		}
		let maxDuration = DEFAULT_MAX_DURATION;
		if( options.maxDuration != null ) {
			maxDuration = options.maxDuration;
		}
		if(
			typeof maxDuration !== "number" ||
			!( maxDuration >= MIN_DURATION && maxDuration <= MAX_DURATION )
		) {
			throwCode(
				RangeError,
				`startRecording: Parameter maxDuration must be a number between ${MIN_DURATION} ` +
				`and ${MAX_DURATION}.`,
				"INVALID_DURATION"
			);
		}
		let bitDepth = 16;
		if( options.bitDepth != null ) {
			bitDepth = options.bitDepth;
		}
		if( bitDepth !== 16 && bitDepth !== 32 ) {
			throwCode(
				RangeError, "startRecording: Parameter bitDepth must be 16 or 32.",
				"INVALID_BIT_DEPTH"
			);
		}
		if( m_recording ) {
			throwCode(
				Error,
				"startRecording: A recording is already active; call stopRecording() first.",
				"RECORDING_ACTIVE"
			);
		}

		const context = service.getContext();
		const recording = {
			"bitDepth": bitDepth,
			"sampleRate": context.sampleRate,
			"chunks": [],
			"frames": 0,
			"node": null,
			"untap": null,
			"started": null,
			"stopping": null,
			"finish": null
		};
		m_state = "starting";
		m_recording = recording;
		recording.started = g_worklet.loadWorklet( context ).then( () => {
			const node = new AudioWorkletNode( context, g_worklet.RECORDER_PROCESSOR, {
				"numberOfInputs": 1,
				"numberOfOutputs": 0,
				"channelCount": 2,
				"channelCountMode": "explicit",
				"processorOptions": { "maxFrames": Math.round( maxDuration * context.sampleRate ) }
			} );
			node.port.onmessage = event => receive( recording, event.data );
			recording.node = node;
			recording.untap = service.tapBus( bus, node );
			m_state = "recording";
		} ).catch( error => {
			m_state = "idle";
			m_recording = null;
			const failure = new Error(
				"startRecording: Recording is unavailable; the audio worklet could not load.",
				{ "cause": error }
			);
			failure.code = "RECORDING_UNAVAILABLE";
			throw failure;
		} );
		return recording.started;
	}


	pluginApi.addCommand( "stopRecording", stopRecording, false, [] );

	/**
	 * Stop capturing and collect the recording as a WAV file
	 *
	 * The processor flushes its last samples before the promise resolves. Stopping while the
	 * recording is still starting waits for it to start; calling again returns the same
	 * promise.
	 *
	 * @returns {Promise<Blob>} Resolves with an audio/wav Blob
	 */
	function stopRecording() {
		const recording = m_recording;
		if( !recording ) {
			throwCode( Error, "stopRecording: No recording is active.", "NOT_RECORDING" );
		}
		if( !recording.stopping ) {
			recording.stopping = recording.started.then( () => new Promise( resolve => {
				recording.finish = resolve;
				recording.node.port.postMessage( "stop" );
			} ) );
		}
		return recording.stopping;
	}


	pluginApi.addCommand( "getRecordingState", getRecordingState, false, [] );

	/**
	 * Get the recording state and the seconds captured so far
	 *
	 * The duration counts captured frames, which arrive in blocks of 4096, so it advances in
	 * steps of about 85 ms and stays still while the audio context is suspended.
	 *
	 * @returns {Object} { state, duration }; state is "idle", "starting", "recording", or
	 *   "full"
	 */
	function getRecordingState() {
		let duration = 0;
		if( m_recording ) {
			duration = m_recording.frames / m_recording.sampleRate;
		}
		return { "state": m_state, "duration": duration };
	}


	pluginApi.addCommand( "saveRecording", saveRecording, false, [ "blob", "filename" ] );

	/**
	 * Download a Blob as a file through a temporary object URL
	 *
	 * @param {Object} options - Command options
	 * @param {Blob} options.blob - Recording from stopRecording(), or any Blob
	 * @param {string} options.filename - File name (default: "recording.wav")
	 * @returns {void}
	 */
	function saveRecording( options ) {
		if( !( options.blob instanceof Blob ) ) {
			throwCode(
				TypeError, "saveRecording: Parameter blob must be a Blob.", "INVALID_BLOB"
			);
		}
		let filename = "recording.wav";
		if( options.filename != null ) {
			filename = options.filename;
		}
		if( typeof filename !== "string" || filename === "" ) {
			throwCode(
				TypeError, "saveRecording: Parameter filename must be a non-empty string.",
				"INVALID_FILENAME"
			);
		}
		const url = URL.createObjectURL( options.blob );
		const link = document.createElement( "a" );
		link.href = url;
		link.download = filename;
		link.click();
		setTimeout( () => {
			URL.revokeObjectURL( url );
		}, 0 );
	}
}
