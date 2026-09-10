/**
 * Pi.js - Sound Module (Plugin)
 *
 * Sound effects, audio files, and volume control using Web Audio API.
 *
 * @module plugins/sound/sound
 */

"use strict";

let m_audioContext = null;
let m_masterGain = null;
const m_audioPools = {};
let m_nextAudioId = 0;
const m_soundPool = {};
let m_nextSoundId = 0;
let m_volume = 0.75;

// Cap concurrent oscillators to avoid renderer overload / tab crashes
const MAX_VOICES = 64;


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
 * Exported Functions (for play.js)
 ************************************************************************************************/


/**
 * Get the shared AudioContext, creating it if needed
 *
 * @returns {AudioContext} Shared audio context
 */
export function getAudioContext() {
	if( !m_audioContext ) {
		const audioContextClass = window.AudioContext || window.webkitAudioContext;
		m_audioContext = new audioContextClass();
	}

	return m_audioContext;
}

/**
 * Get the shared master gain node connected to the destination
 *
 * @returns {GainNode} Shared master gain
 */
function getMasterGain() {
	const audioContext = getAudioContext();

	if( !m_masterGain ) {
		m_masterGain = audioContext.createGain();
		m_masterGain.gain.value = 1;
		m_masterGain.connect( audioContext.destination );
	}

	return m_masterGain;
}

/**
 * Disconnect nodes and remove a sound from the pool
 *
 * @param {string} soundId - Sound ID to clean up
 * @returns {void}
 */
function cleanupSound( soundId ) {
	const sound = m_soundPool[ soundId ];
	if( !sound ) {
		return;
	}

	try {
		sound.oscillator.disconnect();
	} catch( caughtError ) {

		// Already disconnected
	}

	try {
		sound.envelope.disconnect();
	} catch( caughtError ) {

		// Already disconnected
	}

	try {
		sound.master.disconnect();
	} catch( caughtError ) {

		// Already disconnected
	}

	delete m_soundPool[ soundId ];
}

/**
 * Stop oldest voices that have already started when the active voice
 * limit is exceeded. Future-scheduled notes from $.play() are left alone
 * so long melodies are not cut off while being queued.
 *
 * @returns {void}
 */
function enforceVoiceLimit() {
	const audioContext = getAudioContext();
	const now = audioContext.currentTime;
	const activeIds = [];

	for( const soundId in m_soundPool ) {
		const sound = m_soundPool[ soundId ];
		if( sound.startTime <= now ) {
			activeIds.push( soundId );
		}
	}

	if( activeIds.length < MAX_VOICES ) {
		return;
	}

	const removeCount = activeIds.length - MAX_VOICES + 1;
	for( let i = 0; i < removeCount; i++ ) {
		stopSoundById( activeIds[ i ] );
	}
}

/**
 * Stop a sound by ID (internal function for play module)
 *
 * @param {string} soundId - Sound ID to stop
 * @returns {void}
 */
export function stopSoundById( soundId ) {
	const sound = m_soundPool[ soundId ];
	if( !sound ) {
		return;
	}

	try {
		sound.oscillator.stop();
	} catch( caughtError ) {

		// Already stopped; clean up immediately
		cleanupSound( soundId );
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
	enforceVoiceLimit();

	const oscillator = audioContext.createOscillator();
	const envelope = audioContext.createGain();
	const master = audioContext.createGain();
	const startTime = audioContext.currentTime + delay;

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

	// Connect through shared master to limit destination fan-out
	oscillator.connect( envelope );
	envelope.connect( master );
	master.connect( getMasterGain() );

	const soundId = "sound_" + m_nextSoundId;
	m_nextSoundId += 1;
	m_soundPool[ soundId ] = {
		"oscillator": oscillator,
		"envelope": envelope,
		"master": master,
		"audioContext": audioContext,
		"startTime": startTime
	};

	// Disconnect nodes and remove from pool when playback ends
	oscillator.onended = function() {
		cleanupSound( soundId );
	};

	try {
		const attackEnd = startTime + attackTime;
		const sustainEnd = attackEnd + sustainTime;
		const decayEnd = sustainEnd + decayTime;
		let endTime = startTime + stopTime;

		if( endTime < decayEnd ) {
			endTime = decayEnd;
		}

		// Use linear ramps instead of setValueCurveAtTime. Abutting curves on a
		// long-lived shared context often throw InvalidStateError; callers that
		// swallow errors then leak connected nodes until the tab crashes.
		if( attackTime > 0 ) {
			envelope.gain.setValueAtTime( 0, startTime );
			envelope.gain.linearRampToValueAtTime( volume, attackEnd );
		} else {
			envelope.gain.setValueAtTime( volume, startTime );
		}

		if( sustainTime > 0 ) {
			envelope.gain.linearRampToValueAtTime( 0.8 * volume, sustainEnd );
		}

		if( decayTime > 0 ) {
			envelope.gain.linearRampToValueAtTime( 0.1 * volume, sustainEnd + decayTime * 0.5 );
			envelope.gain.linearRampToValueAtTime( 0, decayEnd );
		} else {
			envelope.gain.linearRampToValueAtTime( 0, endTime );
		}

		oscillator.start( startTime );
		oscillator.stop( endTime );
	} catch( err ) {
		cleanupSound( soundId );
		throw err;
	}

	return soundId;
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register sound module commands
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
export function registerSound( pluginApi ) {
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
		audio.volume = m_volume * volume;
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


	pluginApi.addCommand( "sound", sound, false, [
		"frequency", "duration", "volume", "oType", "delay", "attack", "decay"
	] );

	/**
	 * Play a sound by frequency using Web Audio API
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.frequency - Frequency in Hz
	 * @param {number} options.duration - Duration in seconds (default: 1)
	 * @param {number} options.volume - Volume 0-1 (default: 1)
	 * @param {string|Array} options.oType - Oscillator type or custom wave table (default:
	 * "triangle")
	 * @param {number} options.delay - Delay before playing in seconds (default: 0)
	 * @param {number} options.attack - Attack time in seconds (default: 0)
	 * @param {number} options.decay - Decay time in seconds (default: 0.1)
	 * @returns {string} Sound ID for use with stopSound
	 */
	function sound( options ) {
		const frequency = Math.round( utils.getFloat( options.frequency, 440 ) );
		const duration = utils.getFloat( options.duration, 1 );
		const volume = utils.getFloat( options.volume, 1 );
		let oType;
		if( options.oType != null ) {
			oType = options.oType;
		} else {
			oType = "triangle";
		}
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

		// Calculate stop time
		const stopTime = attack + duration + decay;

		return createSound(
			getAudioContext(), frequency, volume, attack, duration,
			decay, stopTime, oType, waveTables, delay
		);
	}


	pluginApi.addCommand( "stopSound", stopSound, false, [ "soundId" ] );

	/**
	 * Stop a playing sound or all sounds
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.soundId - Sound ID (null to stop all sounds)
	 * @returns {void}
	 */
	function stopSound( options ) {
		const soundId = options.soundId;

		// If no soundId, stop all sounds
		if( soundId == null ) {
			const soundIds = Object.keys( m_soundPool );
			for( let i = 0; i < soundIds.length; i++ ) {
				stopSoundById( soundIds[ i ] );
			}
			return;
		}

		stopSoundById( soundId );
	}


	pluginApi.addCommand( "setVolume", setVolume, false, [ "volume" ] );

	/**
	 * Set global volume for all sounds
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.volume - Volume (0-1)
	 * @returns {void}
	 */
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

