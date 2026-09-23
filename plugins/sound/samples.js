/**
 * Pi.js - Sound Samples Module (Plugin)
 *
 * Audio file pools built from media elements: loadAudio, playAudio, stopAudio, and
 * removeAudio.
 *
 * @module plugins/sound/samples
 */

"use strict";

import * as g_context from "./context.js";

const m_audioPools = {};
let m_nextAudioId = 0;


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Release media without allowing a cleanup failure to strand other owned resources.
 *
 * @param {HTMLAudioElement} audio - Audio element to release
 */
function releaseAudioElement( audio ) {
	try {
		audio.pause();
	} catch( caughtError ) {

		// Continue releasing the source even if playback could not be paused.
	}
	try {
		audio.removeAttribute( "src" );
		audio.load();
	} catch( caughtError ) {

		// Listener removal and readiness settlement must still complete.
	}
}

/**
 * Settle one original slot's readiness wait, including all its retry attempts.
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audioItem - Owning audio pool
 * @param {Object} load - Pending load record
 */
function settleAudioLoad( pluginApi, audioItem, load ) {
	if( load.settled ) {
		return;
	}
	load.settled = true;
	clearTimeout( load.retryTimer );
	load.retryTimer = null;
	if( load.detach ) {
		load.detach();
	}
	if( load.audio ) {
		const audio = load.audio;
		load.audio = null;
		releaseAudioElement( audio );
	}
	audioItem.loads.delete( load );
	pluginApi.done();
}

/**
 * Start an attempt belonging to an existing load; retries never acquire another wait.
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audioItem - Owning audio pool
 * @param {Object} load - Pending load record
 * @param {number} retryCount - Number of retries remaining
 */
function loadAudioItem( pluginApi, audioItem, load, retryCount = 3 ) {
	const audio = new Audio( load.src );
	load.audio = audio;
	let active = true;

	function detach() {
		active = false;
		audio.removeEventListener( "canplay", audioReady );
		audio.removeEventListener( "error", audioError );
		load.detach = null;
	}
	load.detach = detach;

	// Audio ready callback
	function audioReady() {
		if( !active || load.settled || audioItem.removed ) {
			return;
		}
		detach();
		audioItem.pool.push( {
			"audio": audio,
			"timeout": 0,
			"volume": 1
		} );

		// Transfer ownership to the playable pool before settling the pending load.
		load.audio = null;
		settleAudioLoad( pluginApi, audioItem, load );
	}

	// Audio error callback
	function audioError() {
		if( !active || load.settled || audioItem.removed ) {
			return;
		}
		detach();
		const errors = [
			"MEDIA_ERR_ABORTED - fetching process aborted by user",
			"MEDIA_ERR_NETWORK - error occurred when downloading",
			"MEDIA_ERR_DECODE - error occurred when decoding",
			"MEDIA_ERR_SRC_NOT_SUPPORTED - audio/video not supported"
		];

		const errorCode = audio.error?.code;
		const index = errorCode - 1;
		load.audio = null;
		releaseAudioElement( audio );

		if( Number.isInteger( errorCode ) && index >= 0 && index < errors.length ) {
			console.error( "loadAudio: " + errors[ index ] );

			// Retry loading if retries remain
			if( retryCount > 0 ) {
				const timer = setTimeout( () => {
					if( load.settled || audioItem.removed || load.retryTimer !== timer ) {
						return;
					}
					load.retryTimer = null;
					try {
						loadAudioItem( pluginApi, audioItem, load, retryCount - 1 );
					} catch( error ) {
						settleAudioLoad( pluginApi, audioItem, load );
						console.error( "loadAudio: Retry initialization failed:", error );
					}
				}, 100 );
				load.retryTimer = timer;
			} else {
				console.error( "loadAudio: Max retries exceeded for " + load.src );
				settleAudioLoad( pluginApi, audioItem, load );
			}
		} else {
			console.error( "loadAudio: Unknown error - " + errorCode );
			settleAudioLoad( pluginApi, audioItem, load );
		}
	}

	// Set up event listeners
	audio.addEventListener( "canplay", audioReady );
	audio.addEventListener( "error", audioError );
}

/**
 * Invalidate a pool before releasing pending loads and playable media.
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audioItem - Audio pool to dispose
 */
function disposeAudioPool( pluginApi, audioItem ) {
	audioItem.removed = true;
	for( const load of audioItem.loads ) {
		settleAudioLoad( pluginApi, audioItem, load );
	}
	for( const poolItem of audioItem.pool ) {
		clearTimeout( poolItem.timeout );
		poolItem.timeout = 0;
		releaseAudioElement( poolItem.audio );
	}
	audioItem.pool.length = 0;
	audioItem.index = 0;
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Apply a new global volume to every loaded audio pool element
 *
 * @param {number} volume - Volume (0-1)
 * @returns {void}
 */
export function applyVolumeToPools( volume ) {
	for( const poolId in m_audioPools ) {
		for( let j = 0; j < m_audioPools[ poolId ].pool.length; j++ ) {
			const poolItem = m_audioPools[ poolId ].pool[ j ];
			poolItem.audio.volume = volume * poolItem.volume;
		}
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


	pluginApi.addCommand( "loadAudio", loadAudio, false, [ "src", "name", "poolSize" ] );

	/**
	 * Create an audio pool for playing multiple instances of the same sound file
	 * Each slot holds readiness until it loads, fails after retries, or is removed.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.src - Audio file URL
	 * @param {number} options.poolSize - Number of audio instances (default: 1)
	 * @returns {string} Audio ID for use with playAudio
	 */
	function loadAudio( options ) {
		const src = options.src;
		const poolSize = utils.getInt( options.poolSize, 1 );
		const audioName = options.name;

		// Validate src
		if( !src || typeof src !== "string" ) {
			const error = new TypeError( "loadAudio: Parameter src must be a non-empty string." );
			error.code = "INVALID_SRC";
			throw error;
		}

		let audioId = "audioPool_" + m_nextAudioId;
		if( audioName ) {

			// Name must be unique
			if( m_audioPools[ audioName ] ) {
				const error = new Error(
					`loadAudio: Audio pool name "${audioName}" is already in use.`
				);
				error.code = "DUPLICATE_AUDIO_NAME";
				throw error;
			}
			audioId = audioName;
		} else {
			m_nextAudioId += 1;
		}

		// Validate poolSize
		if( poolSize < 1 ) {
			const error = new RangeError(
				"loadAudio: Parameter poolSize must be an integer greater than 0."
			);
			error.code = "INVALID_POOL_SIZE";
			throw error;
		}

		// Create the audio pool item
		const audioItem = {
			"pool": [],
			"index": 0,
			"loads": new Set(),
			"removed": false
		};

		// Create each audio instance in the pool
		try {
			for( let i = 0; i < poolSize; i++ ) {
				const load = {
					"src": src, "audio": null, "detach": null,
					"retryTimer": null, "settled": false
				};
				audioItem.loads.add( load );
				pluginApi.wait();
				loadAudioItem( pluginApi, audioItem, load );
			}
		} catch( error ) {
			disposeAudioPool( pluginApi, audioItem );
			throw error;
		}

		// Save audioId to global array
		m_audioPools[ audioId ] = audioItem;

		return audioId;
	}


	pluginApi.addCommand( "removeAudio", removeAudio, false, [ "audioId" ] );

	/**
	 * Delete an audio pool and free its resources
	 * Cancels pending loads and retries, releases their readiness waits, and permits name reuse.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.audioId - Audio pool ID returned from loadAudio
	 * @returns {void}
	 */
	function removeAudio( options ) {
		const audioId = options.audioId;

		// Validate audioId
		if( !m_audioPools[ audioId ] ) {
			const error = new Error( `removeAudio: Audio pool "${audioId}" not found.` );
			error.code = "AUDIO_POOL_NOT_FOUND";
			throw error;
		}

		const audioItem = m_audioPools[ audioId ];
		delete m_audioPools[ audioId ];
		disposeAudioPool( pluginApi, audioItem );
	}


	pluginApi.addCommand(
		"playAudio", playAudio, false, [ "audioId", "volume", "startTime", "duration" ]
	);

	/**
	 * Play audio from an audio pool
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.audioId - Audio pool ID
	 * @param {number} options.volume - Volume (0-1, default: 1)
	 * @param {number} options.startTime - Start time in seconds (default: 0)
	 * @param {number} options.duration - Play duration in seconds (default: 0 = play full)
	 * @returns {void}
	 */
	function playAudio( options ) {
		const audioId = options.audioId;
		const volume = utils.getFloat( options.volume, 1 );
		const startTime = utils.getFloat( options.startTime, 0 );
		const duration = utils.getFloat( options.duration, 0 );

		// Validate audioId
		if( !m_audioPools[ audioId ] ) {
			const error = new Error( `playAudio: Audio pool "${audioId}" not found.` );
			error.code = "AUDIO_POOL_NOT_FOUND";
			throw error;
		}

		// Validate volume
		if( volume < 0 || volume > 1 ) {
			const error = new RangeError(
				"playAudio: Parameter volume must be a number between 0 and 1."
			);
			error.code = "INVALID_VOLUME";
			throw error;
		}

		// Validate startTime
		if( startTime < 0 ) {
			const error = new RangeError(
				"playAudio: Parameter startTime must be a number greater than or equal to 0."
			);
			error.code = "INVALID_START_TIME";
			throw error;
		}

		// Validate duration
		if( duration < 0 ) {
			const error = new RangeError(
				"playAudio: Parameter duration must be a number greater than or equal to 0."
			);
			error.code = "INVALID_DURATION";
			throw error;
		}

		// Get the audio pool
		const audioItem = m_audioPools[ audioId ];

		// Make sure pool has sounds loaded
		if( audioItem.pool.length === 0 ) {
			const error = new Error( "playAudio: Audio pool has no sounds loaded." );
			error.code = "EMPTY_POOL";
			throw error;
		}

		// Get the next audio player from the pool
		const poolItem = audioItem.pool[ audioItem.index ];
		const audio = poolItem.audio;
		clearTimeout( poolItem.timeout );
		poolItem.timeout = 0;

		// Set volume and start time
		audio.volume = g_context.getVolume() * volume;
		poolItem.volume = volume;
		audio.currentTime = startTime;

		// Set duration if specified
		if( duration > 0 ) {
			poolItem.timeout = setTimeout( () => {
				poolItem.timeout = 0;
				audio.pause();
				audio.currentTime = 0;
			}, duration * 1000 );
		}

		// Play the sound
		// Note: audio.play() returns a promise that may be rejected due to browser autoplay policies
		const playPromise = audio.play();
		if( playPromise !== undefined ) {
			playPromise.catch( ( error ) => {
				console.warn( "playAudio: Audio playback failed:", error.message );
			} );
		}

		// Move to next sound in pool (round-robin)
		audioItem.index += 1;
		if( audioItem.index >= audioItem.pool.length ) {
			audioItem.index = 0;
		}
	}


	pluginApi.addCommand( "stopAudio", stopAudio, false, [ "audioId" ] );

	/**
	 * Stop audio from an audio pool or all audio pools
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.audioId - Audio pool ID (null to stop all pools)
	 * @returns {void}
	 */
	function stopAudio( options ) {
		const audioId = options.audioId;

		// If no audioId, stop all audio pools
		if( audioId == null ) {
			for( const poolId in m_audioPools ) {
				for( let j = 0; j < m_audioPools[ poolId ].pool.length; j++ ) {
					const poolItem = m_audioPools[ poolId ].pool[ j ];
					poolItem.audio.pause();
					clearTimeout( poolItem.timeout );
				}
			}
			return;
		}

		// Validate audioId
		if( !m_audioPools[ audioId ] ) {
			const error = new Error( `stopAudio: Audio pool "${audioId}" not found.` );
			error.code = "AUDIO_POOL_NOT_FOUND";
			throw error;
		}

		// Stop all audio and clear timeouts in the specified pool
		for( let i = 0; i < m_audioPools[ audioId ].pool.length; i++ ) {
			const poolItem = m_audioPools[ audioId ].pool[ i ];
			poolItem.audio.pause();
			clearTimeout( poolItem.timeout );
		}
	}
}
