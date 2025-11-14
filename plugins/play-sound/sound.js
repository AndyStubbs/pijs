/**
 * Pi.js - Sound Module (Plugin)
 * 
 * Sound effects, audio pools, and volume control using Web Audio API.
 * 
 * @module plugins/play-sound/sound
 */

// TODO: Rename "audio pool" command names, it's overly complicated. Maybe just make it loadAudio,
// playAudio or something like that.

"use strict";

let m_audioContext = null;
let m_audioPools = {};
let m_nextAudioId = 0;
let m_soundPool = {};
let m_nextSoundId = 0;
let m_volume = 0.75;


/***************************************************************************************************
 * Internal Functions
 **************************************************************************************************/


/**
 * Load an audio element and add to pool when ready
 * 
 * @param {Object} pluginApi - Plugin API
 * @param {Object} audioItem - Audio pool item
 * @param {HTMLAudioElement} audio - Audio element
 * @param {number} retryCount - Number of retries remaining
 */
function loadAudio( pluginApi, audioItem, audio, retryCount = 3 ) {

	// Audio ready callback
	function audioReady() {
		audioItem.pool.push( {
			"audio": audio,
			"timeout": 0,
			"volume": 1
		} );
		audio.removeEventListener( "canplay", audioReady );
		pluginApi.done();
	}

	// Audio error callback
	function audioError() {
		const errors = [
			"MEDIA_ERR_ABORTED - fetching process aborted by user",
			"MEDIA_ERR_NETWORK - error occurred when downloading",
			"MEDIA_ERR_DECODE - error occurred when decoding",
			"MEDIA_ERR_SRC_NOT_SUPPORTED - audio/video not supported"
		];

		const errorCode = audio.error.code;
		const index = errorCode - 1;

		if( index >= 0 && index < errors.length ) {
			console.error( "createAudioPool: " + errors[ index ] );

			// Retry loading if retries remain
			if( retryCount > 0 ) {
				setTimeout( () => {
					audio.removeEventListener( "canplay", audioReady );
					audio.removeEventListener( "error", audioError );
					const newAudio = new Audio( audio.src );
					loadAudio( pluginApi, audioItem, newAudio, retryCount - 1 );
				}, 100 );
			} else {
				console.error( "createAudioPool: Max retries exceeded for " + audio.src );
				pluginApi.done();
			}
		} else {
			console.error( "createAudioPool: Unknown error - " + errorCode );
			pluginApi.done();
		}
	}

	// Wait for audio to load (only on first attempt)
	if( retryCount === 3 ) {
		pluginApi.wait();
	}

	// Set up event listeners
	audio.addEventListener( "canplay", audioReady );
	audio.addEventListener( "error", audioError );
}


/***************************************************************************************************
 * Exported Functions (for play.js)
 **************************************************************************************************/


/**
 * Stop a sound by ID (internal function for play module)
 * 
 * @param {string} soundId - Sound ID to stop
 */
export function stopSoundById( soundId ) {
	if( m_soundPool[ soundId ] ) {
		m_soundPool[ soundId ].oscillator.stop( 0 );
	}
}

/**
 * Create a sound using Web Audio API (internal function exported for play module)
 * 
 * @param {AudioContext} audioContext - Audio context
 * @param {number} frequency - Frequency in Hz
 * @param {number} volume - Volume (0-1)
 * @param {number} attackTime - Attack time in seconds
 * @param {number} sustainTime - Sustain time in seconds
 * @param {number} decayTime - Decay time in seconds
 * @param {number} stopTime - Total sound duration
 * @param {string} oType - Oscillator type
 * @param {Array} waveTables - Custom wave tables (if oType is "custom")
 * @param {number} delay - Delay before playing
 * @returns {string} Sound ID
 */
export function createSound(
	audioContext, frequency, volume, attackTime, sustainTime,
	decayTime, stopTime, oType, waveTables, delay
) {
	const oscillator = audioContext.createOscillator();
	const envelope = audioContext.createGain();
	const master = audioContext.createGain();

	master.gain.value = m_volume;
	oscillator.frequency.value = frequency;

	// Set oscillator type
	if( oType === "custom" ) {
		const real = waveTables[ 0 ];
		const imag = waveTables[ 1 ];
		const wave = audioContext.createPeriodicWave( real, imag );
		oscillator.setPeriodicWave( wave );
	} else {
		oscillator.type = oType;
	}

	// Set initial envelope gain
	if( attackTime === 0 ) {
		envelope.gain.value = volume;
	} else {
		envelope.gain.value = 0;
	}

	// Connect audio nodes
	oscillator.connect( envelope );
	envelope.connect( master );
	master.connect( audioContext.destination );

	const currentTime = audioContext.currentTime + delay;

	// Set attack envelope
	if( attackTime > 0 ) {
		envelope.gain.setValueCurveAtTime(
			new Float32Array( [ 0, volume ] ),
			currentTime,
			attackTime
		);
	}

	// Set sustain envelope
	if( sustainTime > 0 ) {
		envelope.gain.setValueCurveAtTime(
			new Float32Array( [ volume, 0.8 * volume ] ),
			currentTime + attackTime,
			sustainTime
		);
	}

	// Set decay envelope
	if( decayTime > 0 ) {
		envelope.gain.setValueCurveAtTime(
			new Float32Array( [ 0.8 * volume, 0.1 * volume, 0 ] ),
			currentTime + attackTime + sustainTime,
			decayTime
		);
	}

	// Start and stop oscillator
	oscillator.start( currentTime );
	oscillator.stop( currentTime + stopTime );

	// Add to sound pool
	const soundId = "sound_" + m_nextSoundId;
	m_nextSoundId += 1;
	m_soundPool[ soundId ] = {
		"oscillator": oscillator,
		"master": master,
		"audioContext": audioContext
	};

	// Auto-cleanup when done
	setTimeout( () => {
		delete m_soundPool[ soundId ];
	}, ( currentTime + stopTime ) * 1000 );

	return soundId;
}


/***************************************************************************************************
 * Plugin Registration
 **************************************************************************************************/


/**
 * Register sound module commands
 * 
 * @param {Object} pluginApi - Plugin API
 */
export function registerSound( pluginApi ) {
	const utils = pluginApi.utils;

	/**
	 * Create an audio pool for playing multiple instances of the same sound file
	 * 
	 * @param {Object} options - Command options
	 * @param {string} options.src - Audio file URL
	 * @param {number} options.poolSize - Number of audio instances (default: 1)
	 * @returns {string} Audio pool ID for use with playAudioPool
	 */
	pluginApi.addCommand( "createAudioPool", createAudioPool, false, [ "src", "poolSize" ] );
	function createAudioPool( options ) {
		const src = options.src;
		let poolSize = utils.getInt( options.poolSize, 1 );

		// Validate src
		if( !src || typeof src !== "string" ) {
			const error = new TypeError( "createAudioPool: Parameter src must be a non-empty string." );
			error.code = "INVALID_SRC";
			throw error;
		}

		// Validate poolSize
		if( poolSize < 1 ) {
			const error = new RangeError(
				"createAudioPool: Parameter poolSize must be an integer greater than 0."
			);
			error.code = "INVALID_POOL_SIZE";
			throw error;
		}

		// Create the audio pool item
		const audioItem = {
			"pool": [],
			"index": 0
		};

		// Create each audio instance in the pool
		for( let i = 0; i < poolSize; i++ ) {
			const audio = new Audio( src );
			loadAudio( pluginApi, audioItem, audio );
		}

		// Generate unique ID for this pool
		const audioId = "audioPool_" + m_nextAudioId;
		m_audioPools[ audioId ] = audioItem;
		m_nextAudioId += 1;

		return audioId;
	}

	/**
	 * Delete an audio pool and free its resources
	 * 
	 * @param {Object} options - Command options
	 * @param {string} options.audioId - Audio pool ID returned from createAudioPool
	 */
	pluginApi.addCommand( "deleteAudioPool", deleteAudioPool, false, [ "audioId" ] );
	function deleteAudioPool( options ) {
		const audioId = options.audioId;

		// Validate audioId
		if( !m_audioPools[ audioId ] ) {
			const error = new Error( `deleteAudioPool: Audio pool "${audioId}" not found.` );
			error.code = "AUDIO_POOL_NOT_FOUND";
			throw error;
		}

		// Stop all audio and clear timeouts in the pool
		for( let i = 0; i < m_audioPools[ audioId ].pool.length; i++ ) {
			const poolItem = m_audioPools[ audioId ].pool[ i ];
			poolItem.audio.pause();
			clearTimeout( poolItem.timeout );
		}

		// Delete the pool
		delete m_audioPools[ audioId ];
	}

	/**
	 * Play audio from an audio pool
	 * 
	 * @param {Object} options - Command options
	 * @param {string} options.audioId - Audio pool ID
	 * @param {number} options.volume - Volume (0-1, default: 1)
	 * @param {number} options.startTime - Start time in seconds (default: 0)
	 * @param {number} options.duration - Play duration in seconds (default: 0 = play full)
	 */
	pluginApi.addCommand(
		"playAudioPool", playAudioPool, false, [ "audioId", "volume", "startTime", "duration" ]
	);
	function playAudioPool( options ) {
		const audioId = options.audioId;
		const volume = utils.getFloat( options.volume, 1 );
		const startTime = utils.getFloat( options.startTime, 0 );
		const duration = utils.getFloat( options.duration, 0 );

		// Validate audioId
		if( !m_audioPools[ audioId ] ) {
			const error = new Error( `playAudioPool: Audio pool "${audioId}" not found.` );
			error.code = "AUDIO_POOL_NOT_FOUND";
			throw error;
		}

		// Validate volume
		if( volume < 0 || volume > 1 ) {
			const error = new RangeError(
				"playAudioPool: Parameter volume must be a number between 0 and 1."
			);
			error.code = "INVALID_VOLUME";
			throw error;
		}

		// Validate startTime
		if( startTime < 0 ) {
			const error = new RangeError(
				"playAudioPool: Parameter startTime must be a number greater than or equal to 0."
			);
			error.code = "INVALID_START_TIME";
			throw error;
		}

		// Validate duration
		if( duration < 0 ) {
			const error = new RangeError(
				"playAudioPool: Parameter duration must be a number greater than or equal to 0."
			);
			error.code = "INVALID_DURATION";
			throw error;
		}

		// Get the audio pool
		const audioItem = m_audioPools[ audioId ];

		// Make sure pool has sounds loaded
		if( audioItem.pool.length === 0 ) {
			const error = new Error( "playAudioPool: Audio pool has no sounds loaded." );
			error.code = "EMPTY_POOL";
			throw error;
		}

		// Get the next audio player from the pool
		const poolItem = audioItem.pool[ audioItem.index ];
		const audio = poolItem.audio;

		// Set volume and start time
		audio.volume = m_volume * volume;
		poolItem.volume = volume;
		audio.currentTime = startTime;

		// Set duration if specified
		if( duration > 0 ) {
			clearTimeout( poolItem.timeout );
			poolItem.timeout = setTimeout( () => {
				audio.pause();
				audio.currentTime = 0;
			}, duration * 1000 );
		}

		// Play the sound
		// Note: audio.play() returns a promise that may be rejected due to browser autoplay policies
		const playPromise = audio.play();
		if( playPromise !== undefined ) {
			playPromise.catch( ( error ) => {
				console.warn( "playAudioPool: Audio playback failed:", error.message );
			} );
		}

		// Move to next sound in pool (round-robin)
		audioItem.index += 1;
		if( audioItem.index >= audioItem.pool.length ) {
			audioItem.index = 0;
		}
	}

	/**
	 * Stop audio from an audio pool or all audio pools
	 * 
	 * @param {Object} options - Command options
	 * @param {string} options.audioId - Audio pool ID (null to stop all pools)
	 */
	pluginApi.addCommand( "stopAudioPool", stopAudioPool, false, [ "audioId" ] );
	function stopAudioPool( options ) {
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
			const error = new Error( `stopAudioPool: Audio pool "${audioId}" not found.` );
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

	/**
	 * Play a sound by frequency using Web Audio API
	 * 
	 * @param {Object} options - Command options
	 * @param {number} options.frequency - Frequency in Hz
	 * @param {number} options.duration - Duration in seconds (default: 1)
	 * @param {number} options.volume - Volume 0-1 (default: 1)
	 * @param {string|Array} options.oType - Oscillator type or custom wave table (default: "triangle")
	 * @param {number} options.delay - Delay before playing in seconds (default: 0)
	 * @param {number} options.attack - Attack time in seconds (default: 0)
	 * @param {number} options.decay - Decay time in seconds (default: 0.1)
	 * @returns {string} Sound ID for use with stopSound
	 */
	pluginApi.addCommand( "sound", sound, false, [
		"frequency", "duration", "volume", "oType", "delay", "attack", "decay"
	] );
	function sound( options ) {
		const frequency = Math.round( utils.getFloat( options.frequency, 440 ) );
		const duration = utils.getFloat( options.duration, 1 );
		const volume = utils.getFloat( options.volume, 1 );
		let oType = options.oType != null ? options.oType : "triangle";
		const delay = utils.getFloat( options.delay, 0 );
		const attack = utils.getFloat( options.attack, 0 );
		const decay = utils.getFloat( options.decay, 0.1 );

		// Validate duration
		if( duration < 0 ) {
			const error = new RangeError(
				"sound: Parameter duration must be a number greater than or equal to 0."
			);
			error.code = "INVALID_DURATION";
			throw error;
		}

		// Validate volume
		if( volume < 0 || volume > 1 ) {
			const error = new RangeError( "sound: Parameter volume must be a number between 0 and 1." );
			error.code = "INVALID_VOLUME";
			throw error;
		}

		// Validate attack
		if( attack < 0 ) {
			const error = new RangeError(
				"sound: Parameter attack must be a number greater than or equal to 0."
			);
			error.code = "INVALID_ATTACK";
			throw error;
		}

		// Validate delay
		if( delay < 0 ) {
			const error = new RangeError(
				"sound: Parameter delay must be a number greater than or equal to 0."
			);
			error.code = "INVALID_DELAY";
			throw error;
		}

		let waveTables = null;

		// Check for custom waveform (array)
		if( Array.isArray( oType ) ) {
			if(
				oType.length !== 2 ||
				oType[ 0 ].length === 0 ||
				oType[ 1 ].length === 0 ||
				oType[ 0 ].length !== oType[ 1 ].length
			) {
				const error = new TypeError(
					"sound: Parameter oType array must contain two non-empty arrays of equal length."
				);
				error.code = "INVALID_WAVE_TABLE";
				throw error;
			}

			waveTables = [];

			// Validate all values are numbers
			for( let i = 0; i < oType.length; i++ ) {
				for( let j = 0; j < oType[ i ].length; j++ ) {
					if( isNaN( oType[ i ][ j ] ) ) {
						const error = new TypeError(
							"sound: Parameter oType array must only contain numbers."
						);
						error.code = "INVALID_WAVE_TABLE_VALUE";
						throw error;
					}
				}
				waveTables.push( new Float32Array( oType[ i ] ) );
			}

			oType = "custom";
		} else if( typeof oType !== "string" ) {
			const error = new TypeError( "sound: Parameter oType must be a string or an array." );
			error.code = "INVALID_OTYPE";
			throw error;
		} else {

			// Validate oType string
			const validTypes = [ "triangle", "sine", "square", "sawtooth" ];
			if( validTypes.indexOf( oType ) === -1 ) {
				const error = new Error(
					"sound: Parameter oType must be one of: triangle, sine, square, sawtooth."
				);
				error.code = "INVALID_OTYPE";
				throw error;
			}
		}

		// Create audio context if needed
		if( !m_audioContext ) {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext;
			m_audioContext = new AudioContextClass();
		}

		// Calculate stop time
		const stopTime = attack + duration + decay;

		return createSound(
			m_audioContext, frequency, volume, attack, duration,
			decay, stopTime, oType, waveTables, delay
		);
	}

	/**
	 * Stop a playing sound or all sounds
	 * 
	 * @param {Object} options - Command options
	 * @param {string} options.soundId - Sound ID (null to stop all sounds)
	 */
	pluginApi.addCommand( "stopSound", stopSound, false, [ "soundId" ] );
	function stopSound( options ) {
		const soundId = options.soundId;

		// If no soundId, stop all sounds
		if( soundId == null ) {
			for( const id in m_soundPool ) {
				m_soundPool[ id ].oscillator.stop( 0 );
			}
			return;
		}

		// Validate soundId exists
		if( !m_soundPool[ soundId ] ) {
			return;
		}

		// Stop the sound
		m_soundPool[ soundId ].oscillator.stop( 0 );
	}

	/**
	 * Set global volume for all sounds
	 * 
	 * @param {Object} options - Command options
	 * @param {number} options.volume - Volume (0-1)
	 */
	pluginApi.addCommand( "setVolume", setVolume, false, [ "volume" ] );
	function setVolume( options ) {
		const volume = utils.getFloat( options.volume, 0.75 );

		// Validate volume
		if( volume < 0 || volume > 1 ) {
			const error = new RangeError(
				"setVolume: Parameter volume must be a number between 0 and 1."
			);
			error.code = "INVALID_VOLUME";
			throw error;
		}

		m_volume = volume;

		// Update all active sounds
		for( const soundId in m_soundPool ) {
			const sound = m_soundPool[ soundId ];
			if( volume === 0 ) {

				// Use exponential ramp to near-zero, then set to zero
				sound.master.gain.exponentialRampToValueAtTime(
					0.01, sound.audioContext.currentTime + 0.1
				);
				sound.master.gain.setValueAtTime(
					0, sound.audioContext.currentTime + 0.11
				);
			} else {
				sound.master.gain.exponentialRampToValueAtTime(
					volume, sound.audioContext.currentTime + 0.1
				);
			}
		}

		// Update all audio pools
		for( const poolId in m_audioPools ) {
			for( let j = 0; j < m_audioPools[ poolId ].pool.length; j++ ) {
				const poolItem = m_audioPools[ poolId ].pool[ j ];
				poolItem.audio.volume = m_volume * poolItem.volume;
			}
		}
	}
}

