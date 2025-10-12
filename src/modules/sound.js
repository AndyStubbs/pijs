/**
 * Pi.js - Sound Module
 * 
 * WebAudio-based sound system for loading/playing sound files and generating tones.
 * 
 * @module modules/sound
 */

export function init( pi ) {
	const piData = pi._.data;
	const m_piWait = pi._.wait;
	const m_piResume = pi._.resume;

	// Sound state
	let m_audioPools = {};
	let m_nextAudioId = 0;
	let m_audioContext = null;
	let m_soundPool = {};
	let m_nextSoundId = 0;

	// CREATEAUDIOPOOL - Create pool of HTML5 Audio elements for sound playback
	pi._.addCommand( "createAudioPool", createAudioPool, false, false,
		[ "src", "poolSize" ]
	);

	function createAudioPool( args ) {
		const src = args[ 0 ];
		let poolSize = args[ 1 ];

		// Validate parameters
		if( !src ) {
			const error = new TypeError( "createAudioPool: No sound source provided" );
			error.code = "NO_SOURCE";
			throw error;
		}

		if( poolSize == null ) {
			poolSize = 1;
		}

		poolSize = Math.round( poolSize );
		if( isNaN( poolSize ) || poolSize < 1 ) {
			const error = new RangeError(
				"createAudioPool: parameter poolSize must be an integer greater than 0"
			);
			error.code = "INVALID_POOL_SIZE";
			throw error;
		}

		// Create the audio item
		const audioItem = {
			"pool": [],
			"index": 0
		};

		// Create the audio pool
		for( let i = 0; i < poolSize; i++ ) {

			// Create the audio item
			const audio = new Audio( src );

			loadAudio( audioItem, audio );
		}

		// Add the audio item to the global object
		const audioId = "audioPool_" + m_nextAudioId;
		m_audioPools[ audioId ] = audioItem;

		// Increment the last audio id
		m_nextAudioId += 1;

		// Return the id
		return audioId;
	}

	function loadAudio( audioItem, audio, retryCount ) {
		if( retryCount == null ) {
			retryCount = 3;
		}

		function audioReady() {
			audioItem.pool.push( {
				"audio": audio,
				"timeout": 0,
				"volume": 1
			} );
			audio.removeEventListener( "canplay", audioReady );
			m_piResume();
		}

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
				console.warn( `createAudioPool: ${errors[ index ]}` );

				// Retry loading the audio if allowed
				if( retryCount > 0 ) {
					setTimeout( () => {
						audio.removeEventListener( "canplay", audioReady );
						audio.removeEventListener( "error", audioError );
						const newAudio = new Audio( audio.src );
						loadAudio( audioItem, newAudio, retryCount - 1 );
					}, 100 );
				} else {
					console.warn( `createAudioPool: Max retries exceeded for ${audio.src}` );
					m_piResume();
				}
			} else {
				console.warn( `createAudioPool: unknown error - ${errorCode}` );
				m_piResume();
			}
		}

		// Wait until audio item is loaded
		if( retryCount === 3 ) {
			m_piWait();
		}

		// Wait until audio can play
		audio.addEventListener( "canplay", audioReady );

		// If audio has an error
		audio.addEventListener( "error", audioError );
	}

	// DELETEAUDIOPOOL - Delete audio pool and free resources
	pi._.addCommand( "deleteAudioPool", deleteAudioPool, false, false, [ "audioId" ] );

	function deleteAudioPool( args ) {
		const audioId = args[ 0 ];

		if( !m_audioPools[ audioId ] ) {
			console.warn( `deleteAudioPool: audio ID ${audioId} not found.` );
			return;
		}

		// Stop and cleanup all audio in pool
		for( let i = 0; i < m_audioPools[ audioId ].pool.length; i++ ) {
			const poolItem = m_audioPools[ audioId ].pool[ i ];
			poolItem.audio.pause();
			poolItem.audio.src = "";
			clearTimeout( poolItem.timeout );
		}

		delete m_audioPools[ audioId ];
	}

	// PLAYAUDIOPOOL - Play sound from audio pool
	pi._.addCommand( "playAudioPool", playAudioPool, false, false,
		[ "audioId", "volume", "startTime", "duration" ]
	);

	function playAudioPool( args ) {
		const audioId = args[ 0 ];
		let volume = args[ 1 ];
		let startTime = args[ 2 ];
		let duration = args[ 3 ];

		// Validate audioId
		if( !m_audioPools[ audioId ] ) {
			console.warn( `playAudioPool: audio ID ${audioId} not found.` );
			return;
		}

		const audioItem = m_audioPools[ audioId ];

		// Validate volume
		if( volume == null ) {
			volume = 1;
		}

		if( isNaN( volume ) || volume < 0 || volume > 1 ) {
			const error = new RangeError(
				"playAudioPool: volume needs to be a number between 0 and 1"
			);
			error.code = "INVALID_VOLUME";
			throw error;
		}

		// Validate startTime
		if( startTime == null ) {
			startTime = 0;
		}

		if( isNaN( startTime ) || startTime < 0 ) {
			const error = new RangeError(
				"playAudioPool: startTime needs to be a number equal to or greater than 0"
			);
			error.code = "INVALID_START_TIME";
			throw error;
		}

		// Validate duration
		if( duration == null ) {
			duration = 0;
		}

		if( isNaN( duration ) || duration < 0 ) {
			const error = new RangeError(
				"playAudioPool: duration needs to be a number equal to or greater than 0"
			);
			error.code = "INVALID_DURATION";
			throw error;
		}

		// Get the audio player
		const poolItem = audioItem.pool[ audioItem.index ];
		const audio = poolItem.audio;

		// Set the volume
		audio.volume = piData.volume * volume;
		poolItem.volume = volume;

		// Set the start time of the audio
		audio.currentTime = startTime;

		// Stop the audio if duration specified
		if( duration > 0 ) {
			clearTimeout( poolItem.timeout );
			poolItem.timeout = setTimeout( () => {
				audio.pause();
				audio.currentTime = 0;
			}, duration * 1000 );
		}

		// Play the sound
		audio.play();

		// Increment to next sound in the pool
		audioItem.index += 1;
		if( audioItem.index >= audioItem.pool.length ) {
			audioItem.index = 0;
		}
	}

	// STOPAUDIOPOOL - Stop audio pool playback
	pi._.addCommand( "stopAudioPool", stopAudioPool, false, false, [ "audioId" ] );

	function stopAudioPool( args ) {
		const audioId = args[ 0 ];

		// If audioId not provided then stop all audio pools
		if( audioId == null ) {
			for( const i in m_audioPools ) {
				for( let j = 0; j < m_audioPools[ i ].pool.length; j++ ) {
					m_audioPools[ i ].pool[ j ].audio.pause();
				}
			}
			return;
		}

		// Validate audioId
		if( !m_audioPools[ audioId ] ) {
			console.warn( `stopAudioPool: audio ID ${audioId} not found.` );
			return;
		}

		// Stop current audio pool
		for( let i = 0; i < m_audioPools[ audioId ].pool.length; i++ ) {
			m_audioPools[ audioId ].pool[ i ].audio.pause();
		}
	}

	// SOUND - Play tone by frequency using WebAudio
	pi._.addCommand( "sound", sound, false, false, [
		"frequency", "duration", "volume", "oType", "delay", "attack", "decay"
	] );

	function sound( args ) {
		let frequency = Math.round( args[ 0 ] );
		let duration = args[ 1 ];
		let volume = args[ 2 ];
		let oType = args[ 3 ];
		let delay = args[ 4 ];
		let attack = args[ 5 ];
		let decay = args[ 6 ];

		// Validate frequency
		if( isNaN( frequency ) ) {
			const error = new TypeError( "sound: frequency needs to be an integer" );
			error.code = "INVALID_FREQUENCY";
			throw error;
		}

		// Validate duration
		if( duration == null ) {
			duration = 1;
		}

		if( isNaN( duration ) || duration < 0 ) {
			const error = new RangeError(
				"sound: duration needs to be a number equal to or greater than 0"
			);
			error.code = "INVALID_DURATION";
			throw error;
		}

		// Validate volume
		if( volume == null ) {
			volume = 1;
		}

		if( isNaN( volume ) || volume < 0 || volume > 1 ) {
			const error = new RangeError( "sound: volume needs to be a number between 0 and 1" );
			error.code = "INVALID_VOLUME";
			throw error;
		}

		// Validate attack
		if( attack == null ) {
			attack = 0;
		}

		if( isNaN( attack ) || attack < 0 ) {
			const error = new RangeError(
				"sound: attack needs to be a number equal to or greater than 0"
			);
			error.code = "INVALID_ATTACK";
			throw error;
		}

		// Validate delay
		if( delay == null ) {
			delay = 0;
		}

		if( isNaN( delay ) || delay < 0 ) {
			const error = new RangeError(
				"sound: delay needs to be a number equal to or greater than 0"
			);
			error.code = "INVALID_DELAY";
			throw error;
		}

		// Validate decay
		if( decay == null ) {
			decay = 0.1;
		}

		if( isNaN( decay ) ) {
			const error = new TypeError( "sound: decay needs to be a number" );
			error.code = "INVALID_DECAY";
			throw error;
		}

		// Validate oType
		if( oType == null ) {
			oType = "triangle";
		}

		let waveTables = null;

		// Check for custom oType
		if( pi.util.isArray( oType ) ) {
			if(
				oType.length !== 2 ||
				oType[ 0 ].length === 0 ||
				oType[ 1 ].length === 0 ||
				oType[ 0 ].length !== oType[ 1 ].length
			) {
				const error = new TypeError(
					"sound: oType array must be an array with two non empty " +
					"arrays of equal length"
				);
				error.code = "INVALID_WAVE_TABLE";
				throw error;
			}

			waveTables = [];

			// Look for invalid waveTable values
			for( let i = 0; i < oType.length; i++ ) {
				for( let j = 0; j < oType[ i ].length; j++ ) {
					if( isNaN( oType[ i ][ j ] ) ) {
						const error = new TypeError( "sound: oType array must only contain numbers" );
						error.code = "INVALID_WAVE_VALUE";
						throw error;
					}
				}
				waveTables.push( new Float32Array( oType[ i ] ) );
			}

			oType = "custom";
		} else {

			if( typeof oType !== "string" ) {
				const error = new TypeError( "sound: oType needs to be a string or an array" );
				error.code = "INVALID_TYPE";
				throw error;
			}

			// Non-custom types
			const types = [ "triangle", "sine", "square", "sawtooth" ];

			if( types.indexOf( oType ) === -1 ) {
				const error = new TypeError(
					"sound: oType is not a valid type. oType must be " +
					"one of the following: triangle, sine, square, sawtooth"
				);
				error.code = "INVALID_OSCILLATOR_TYPE";
				throw error;
			}
		}

		// Create an audio context if none exist
		if( !m_audioContext ) {
			const context = window.AudioContext || window.webkitAudioContext;
			m_audioContext = new context();
		}

		// Calculate the stopTime
		const stopTime = attack + duration + decay;

		return piData.commands.createSound(
			"sound", m_audioContext, frequency, volume, attack, duration,
			decay, stopTime, oType, waveTables, delay
		);
	}

	// CREATESOUND - Internal command to create WebAudio oscillator
	pi._.addCommand( "createSound", createSound, true, false, [] );

	function createSound(
		cmdName, audioContext, frequency, volume, attackTime, sustainTime,
		decayTime, stopTime, oType, waveTables, delay
	) {
		const oscillator = audioContext.createOscillator();
		const envelope = audioContext.createGain();
		const master = audioContext.createGain();

		master.gain.value = piData.volume;

		oscillator.frequency.value = frequency;
		if( oType === "custom" ) {
			const real = waveTables[ 0 ];
			const imag = waveTables[ 1 ];
			const wave = audioContext.createPeriodicWave( real, imag );
			oscillator.setPeriodicWave( wave );
		} else {
			oscillator.type = oType;
		}

		if( attackTime === 0 ) {
			envelope.gain.value = volume;
		} else {
			envelope.gain.value = 0;
		}

		oscillator.connect( envelope );
		envelope.connect( master );
		master.connect( audioContext.destination );

		const currentTime = audioContext.currentTime + delay;

		// Set the attack
		if( attackTime > 0 ) {
			envelope.gain.setValueCurveAtTime(
				new Float32Array( [ 0, volume ] ),
				currentTime,
				attackTime
			);
		}

		// Set the sustain
		if( sustainTime > 0 ) {
			envelope.gain.setValueCurveAtTime(
				new Float32Array( [ volume, 0.8 * volume ] ),
				currentTime + attackTime,
				sustainTime
			);
		}

		// Set the decay
		if( decayTime > 0 ) {
			envelope.gain.setValueCurveAtTime(
				new Float32Array( [ 0.8 * volume, 0.1 * volume, 0 ] ),
				currentTime + attackTime + sustainTime,
				decayTime
			);
		}

		oscillator.start( currentTime );
		oscillator.stop( currentTime + stopTime );

		const soundId = "sound_" + m_nextSoundId;
		m_nextSoundId += 1;
		m_soundPool[ soundId ] = {
			"oscillator": oscillator,
			"master": master,
			"audioContext": audioContext
		};

		// Delete sound when done
		setTimeout( () => {
			delete m_soundPool[ soundId ];
		}, ( currentTime + stopTime ) * 1000 );

		return soundId;
	}

	// STOPSOUND - Stop WebAudio oscillator sound
	pi._.addCommand( "stopSound", stopSound, false, false, [ "soundId" ] );

	function stopSound( args ) {
		const soundId = args[ 0 ];

		// If soundId not provided then stop all sounds
		if( soundId == null ) {
			for( const i in m_soundPool ) {
				m_soundPool[ i ].oscillator.stop( 0 );
			}
			return;
		}

		// Validate soundId
		if( !m_soundPool[ soundId ] ) {
			return;
		}

		// Stop current sound
		m_soundPool[ soundId ].oscillator.stop( 0 );
	}

	// SETVOLUME - Set global volume
	pi._.addCommand( "setVolume", setVolume, false, false, [ "volume" ] );
	pi._.addSetting( "volume", setVolume, false, [ "volume" ] );

	function setVolume( args ) {
		const volume = args[ 0 ];

		if( isNaN( volume ) || volume < 0 || volume > 1 ) {
			const error = new RangeError(
				"setVolume: volume needs to be a number between 0 and 1"
			);
			error.code = "INVALID_VOLUME";
			throw error;
		}

		piData.volume = volume;

		// Update all active sounds
		for( const i in m_soundPool ) {
			if( volume === 0 ) {

				// Set to near zero exponentially
				m_soundPool[ i ].master.gain.exponentialRampToValueAtTime(
					0.01, m_soundPool[ i ].audioContext.currentTime + 0.1
				);

				// Set to zero one millisecond later
				m_soundPool[ i ].master.gain.setValueAtTime(
					0, m_soundPool[ i ].audioContext.currentTime + 0.11
				);
			} else {
				m_soundPool[ i ].master.gain.exponentialRampToValueAtTime(
					volume, m_soundPool[ i ].audioContext.currentTime + 0.1
				);
			}
		}

		// Update all audio pools
		for( const i in m_audioPools ) {
			for( const j in m_audioPools[ i ].pool ) {
				const poolItem = m_audioPools[ i ].pool[ j ];
				poolItem.audio.volume = piData.volume * poolItem.volume;
			}
		}
	}
}

