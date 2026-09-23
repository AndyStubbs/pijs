/**
 * Pi.js - Sound Voices Module (Plugin)
 *
 * Oscillator voices, the voice limit, and the sound() and stopSound() commands.
 *
 * @module plugins/sound/voices
 */

"use strict";

import * as g_context from "./context.js";

const m_soundPool = {};
let m_nextSoundId = 0;

// Cap concurrent oscillators to avoid renderer overload / tab crashes
const MAX_VOICES = 64;


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


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
	const audioContext = g_context.getAudioContext();
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


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


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

	master.gain.value = g_context.getVolume();
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
	master.connect( g_context.getMasterGain() );

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

/**
 * Ramp every active sound's master gain to a new global volume
 *
 * @param {number} volume - Volume (0-1)
 * @returns {void}
 */
export function rampVoiceVolumes( volume ) {
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
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register voice commands
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
export function registerVoices( pluginApi ) {
	const utils = pluginApi.utils;


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
			g_context.getAudioContext(), frequency, volume, attack, duration,
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
}
