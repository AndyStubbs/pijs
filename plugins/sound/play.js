/**
 * Pi.js - Play Module (Plugin)
 * 
 * BASIC-style music notation playback (inspired by QBasic PLAY command).
 * 
 * @module plugins/sound/play
 */

"use strict";

import { createSound, stopSoundById } from "./sound.js";

const m_tracks = {};
const m_allTracks = [];
let m_lastTrackId = 0;
let m_playData = [];
let m_utils = null;

// Note frequency data (in Hz) by note name and octave
const m_notesData = {
	"A": [ 27.50, 55.00, 110, 220, 440, 880, 1760, 3520, 7040, 14080 ],
	"A#": [ 29.14, 58.27, 116.541, 233.082, 466.164, 932.328, 1864.655, 3729.31, 7458.62, 14917.24 ],
	"B": [ 30.87, 61.74, 123.471, 246.942, 493.883, 987.767, 1975.533, 3951.066, 7902.132, 15804.264 ],
	"C": [ 16.35, 32.70, 65.41, 130.813, 261.626, 523.251, 1046.502, 2093.005, 4186.009, 8372.018 ],
	"C#": [ 17.32, 34.65, 69.296, 138.591, 277.183, 554.365, 1108.731, 2217.461, 4434.922, 8869.844 ],
	"D": [ 18.35, 36.71, 73.416, 146.832, 293.665, 587.33, 1174.659, 2349.318, 4698.636, 9397.272 ],
	"D#": [ 19.45, 38.89, 77.782, 155.563, 311.127, 622.254, 1244.508, 2489.016, 4978.032, 9956.064 ],
	"E": [ 20.60, 41.20, 82.407, 164.814, 329.628, 659.255, 1318.51, 2637.021, 5274.042, 10548.084 ],
	"F": [ 21.83, 43.65, 87.307, 174.614, 349.228, 698.456, 1396.913, 2793.826, 5587.652, 11175.304 ],
	"F#": [ 23.12, 46.25, 92.499, 184.997, 369.994, 739.989, 1479.978, 2959.955, 5919.91, 11839.82 ],
	"G": [ 24.50, 49.00, 97.999, 195.998, 391.995, 783.991, 1567.982, 3135.964, 6271.928, 12543.856 ],
	"G#": [ 25.96, 51.91, 103.826, 207.652, 415.305, 830.609, 1661.219, 3322.438, 6644.876, 13289.752 ]
};

// All notes by number (for N command)
const m_allNotes = [
	0, 16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87, 32.70,
	34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00, 51.91, 55.00, 58.27, 61.74, 65.406, 69.296,
	73.416, 77.782, 82.407, 87.307, 92.499, 97.999, 103.826, 110, 116.541, 123.471, 130.813,
	138.591, 146.832, 155.563, 164.814, 174.614, 184.997, 195.998, 207.652, 220, 233.082, 246.942,
	261.626, 277.183, 293.665, 311.127, 329.628, 349.228, 369.994, 391.995, 415.305, 440, 466.164,
	493.883, 523.251, 554.365, 587.33, 622.254, 659.255, 698.456, 739.989, 783.991, 830.609, 880,
	932.328, 987.767, 1046.502, 1108.731, 1174.659, 1244.508, 1318.51, 1396.913, 1479.978, 1567.982,
	1661.219, 1760, 1864.655, 1975.533, 2093.005, 2217.461, 2349.318, 2489.016, 2637.021, 2793.826,
	2959.955, 3135.964, 3322.438, 3520, 3729.31, 3951.066, 4186.009, 4434.922, 4698.636, 4978.032,
	5274.042, 5587.652, 5919.91, 6271.928, 6644.876, 7040, 7458.62, 7902.132, 8372.018, 8869.844,
	9397.272, 9956.064, 10548.084, 11175.304, 11839.82, 13289.752, 14080, 14917.24, 15804.264
];


/***************************************************************************************************
 * Internal Functions
 **************************************************************************************************/


/**
 * Create a track from a play string
 * 
 * @param {string} playString - Music notation string
 * @returns {number} First track ID
 */
function createTrack( playString ) {
	let firstTrackId;

	// Convert to uppercase and remove spaces
	playString = playString.split( /\s+/ ).join( "" ).toUpperCase();

	// Find and extract wavetables
	const waveTables = [];
	let start = 0;
	while( start > -1 ) {
		start = playString.indexOf( "[[" );
		if( start > -1 ) {
			const end = playString.indexOf( "]]", start );
			waveTables.push( playString.substring( start, end + 2 ) );
			const i = waveTables.length - 1;
			playString = playString.replace( waveTables[ i ], "W" + i );
		}
	}

	// Convert wavetables to arrays
	for( let i = 0; i < waveTables.length; i++ ) {
		waveTables[ i ] = JSON.parse( waveTables[ i ] );

		// Validate wavetable
		if(
			waveTables[ i ].length !== 2 ||
			waveTables[ i ][ 0 ].length !== waveTables[ i ][ 1 ].length
		) {
			console.error(
				"play: Wavetables must have 2 arrays of same length. Defaulting to triangle wave."
			);
			waveTables[ i ] = "triangle";
			continue;
		}

		// Validate all values are numbers
		for( let j = 0; j < 2; j++ ) {
			for( let k = 0; k < waveTables[ i ][ j ].length; k++ ) {
				waveTables[ i ][ j ][ k ] = parseFloat( waveTables[ i ][ j ][ k ] );
				if( isNaN( waveTables[ i ][ j ][ k ] ) ) {
					waveTables[ i ][ j ][ k ] = 0;
				}
			}
			waveTables[ i ][ j ] = new Float32Array( waveTables[ i ][ j ] );
		}
	}

	// Split tracks by commas
	const trackStrings = playString.split( "," );
	const trackIds = [];

	// Regular expression for parsing play commands
	const regString =
		"(?=WS|WQ|WW|WT|W\\d[\\d]?|V\\d|Q\\d|O\\d|\\<|\\>|N\\d\\d?|" +
		"L\\d\\d?|MS|MN|ML|MU\\d|MU\\-\\d|MK\\d[\\d]?[\\d]?|" +
		"MZ\\d[\\d]?[\\d]?|MX\\d[\\d]?[\\d]?|MY\\d[\\d]?[\\d]?|" +
		"MW|P[\\d]?|T\\d|" +
		"[[A|B|C|D|E|F|G][\\d]?[\\+|\\-|\\#|\\.\\.?]?)";
	const reg = new RegExp( regString );

	let lastNote;

	for( let i = 0; i < trackStrings.length; i++ ) {

		// Replace complex keywords with short symbols
		trackStrings[ i ] = trackStrings[ i ].replace( /SINE/g, "WS" );
		trackStrings[ i ] = trackStrings[ i ].replace( /SQUARE/g, "WQ" );
		trackStrings[ i ] = trackStrings[ i ].replace( /SAWTOOTH/g, "WW" );
		trackStrings[ i ] = trackStrings[ i ].replace( /TRIANGLE/g, "WT" );

		// Replace conflicting symbols
		trackStrings[ i ] = trackStrings[ i ].replace( /MD/g, "MZ" );
		trackStrings[ i ] = trackStrings[ i ].replace( /MA/g, "MY" );
		trackStrings[ i ] = trackStrings[ i ].replace( /MT/g, "MX" );
		trackStrings[ i ] = trackStrings[ i ].replace( /MO/g, "MU" );

		// Remove deprecated symbols
		trackStrings[ i ] = trackStrings[ i ].replace( /MB/g, "" );
		trackStrings[ i ] = trackStrings[ i ].replace( /MF/g, "" );

		// Create track
		const trackId = m_lastTrackId;
		if( firstTrackId === undefined ) {
			firstTrackId = trackId;
		}
		m_lastTrackId += 1;

		m_tracks[ trackId ] = {
			"id": trackId,
			"notes": [],
			"noteId": 0,
			"decayRate": 0.20,
			"attackRate": 0.15,
			"sustainRate": 0.65,
			"fullNote": false,
			"extra": 1,
			"space": "normal",
			"interval": 0,
			"time": 0,
			"simultaneousPlay": i > 0,
			"tempo": 60 / 120,
			"noteLength": 0.25,
			"pace": 0.875,
			"octave": 4,
			"octaveExtra": 0,
			"volume": 1,
			"trackIds": trackIds,
			"type": "triangle",
			"waveTables": waveTables,
			"sounds": []
		};
		m_allTracks.push( trackId );
		trackIds.push( trackId );

		// Mark previous note for simultaneous play
		if( i > 0 ) {
			lastNote.simultaneousPlay = trackId;
		}

		// Split track into command parts
		const trackParts = trackStrings[ i ].split( reg );

		for( let j = 0; j < trackParts.length; j++ ) {
			const index = trackParts[ j ].indexOf( "-" );

			// Split minus symbol (only if not a music note)
			if( index > -1 && "ABCDEFG".indexOf( trackParts[ j ][ 0 ] ) === -1 ) {
				const noteData = {
					"name": trackParts[ j ].substring( 0, index ),
					"val": trackParts[ j ].substring( index )
				};
				m_tracks[ trackId ].notes.push( noteData );
				lastNote = noteData;
			} else {
				const noteParts = trackParts[ j ].split( /(\d+)/ );
				const noteData = {
					"name": noteParts[ 0 ]
				};
				if( noteParts.length > 1 ) {
					noteData.val = noteParts[ 1 ];
				}
				m_tracks[ trackId ].notes.push( noteData );
				lastNote = noteData;
			}
		}
	}

	return firstTrackId;
}

/**
 * Play a track recursively
 * 
 * @param {number} trackId - Track ID to play
 */
function playTrack( trackId ) {
	const track = m_tracks[ trackId ];
	if( track.noteId >= track.notes.length ) {
		return;
	}

	const cmd = track.notes[ track.noteId ];
	let frequency = 0;
	let val;
	let wait = false;
	track.extra = 0;

	switch( cmd.name.charAt( 0 ) ) {
		case "A":
		case "B":
		case "C":
		case "D":
		case "E":
		case "F":
		case "G":
			frequency = processNote( track, cmd );
			wait = true;
			break;
		case "N":
			if( !isNaN( Number( cmd.val ) ) ) {
				val = m_utils.getInt( cmd.val, 0 );
				if( val >= 0 && val < m_allNotes.length ) {
					frequency = m_allNotes[ val ];
				}
				wait = true;
			}
			break;
		case "O":
			if( !isNaN( Number( cmd.val ) ) ) {
				val = m_utils.getInt( cmd.val, 4 );
				if( val >= 0 && val < m_notesData[ "A" ].length ) {
					track.octave = val;
				}
			}
			break;
		case ">":
			track.octave += 1;
			if( track.octave >= m_notesData[ "A" ].length ) {
				track.octave = m_notesData[ "A" ].length - 1;
			}
			break;
		case "<":
			track.octave -= 1;
			if( track.octave < 0 ) {
				track.octave = 0;
			}
			break;
		case "L":
			if( !isNaN( Number( cmd.val ) ) ) {
				val = m_utils.getInt( cmd.val, 1 );
				track.noteLength = getNoteLength( val );
			}
			break;
		case "T":
			if( !isNaN( Number( cmd.val ) ) ) {
				val = m_utils.getInt( cmd.val, 120 );
				if( val >= 32 && val < 256 ) {
					track.tempo = 60 / val;
				}
			}
			break;
		case "M":
			processMusic( track, cmd );
			break;
		case "P":
			if( !isNaN( Number( cmd.val ) ) ) {
				wait = true;
				val = m_utils.getInt( cmd.val, 1 );
				track.extra = getNoteLength( val );
			}
			break;
		case "V":
			if( !isNaN( Number( cmd.val ) ) ) {
				val = m_utils.getInt( cmd.val, 50 );
				if( val < 0 ) {
					val = 0;
				} else if( val > 100 ) {
					val = 100;
				}
				track.volume = val / 100;
			}
			break;
		case "W":
			processWaveform( track, cmd );
			break;
	}

	// Calculate interval for next note
	if( track.extra > 0 ) {
		track.interval = track.tempo * track.extra * track.pace * 4;
	} else {
		track.interval = track.tempo * track.noteLength * track.pace * 4;
	}

	// Play simultaneous track
	if( m_tracks[ cmd.simultaneousPlay ] ) {
		m_tracks[ cmd.simultaneousPlay ].time = track.time;
		copyTrackData( m_tracks[ cmd.simultaneousPlay ].id, trackId );
		playTrack( m_tracks[ cmd.simultaneousPlay ].id );
	}

	// Play note if frequency > 0
	if( frequency > 0 ) {
		playNote( track, frequency );
	}

	// Move to next instruction
	track.noteId += 1;

	// Continue playing track
	if( track.noteId < track.notes.length ) {
		if( wait ) {
			track.time += track.interval;
		}
		playTrack( trackId );
	} else {

		// Schedule track removal after completion
		setTimeout( () => {
			if( m_tracks[ trackId ] ) {
				removeTrack( trackId );
			}
		}, ( track.time + track.interval ) * 1000 );
	}
}

/**
 * Process a note command (A-G)
 * 
 * @param {Object} track - Track object
 * @param {Object} cmd - Command object
 * @returns {number} Frequency in Hz
 */
function processNote( track, cmd ) {
	let note = cmd.name;

	// Convert + to sharp
	note = note.replace( /\+/g, "#" );

	// Convert flats to equivalent sharps
	note = note.replace( "C-", "B" );
	note = note.replace( "D-", "C#" );
	note = note.replace( "E-", "D#" );
	note = note.replace( "G-", "F#" );
	note = note.replace( "A-", "G#" );
	note = note.replace( "B-", "A#" );

	// Convert enharmonic equivalents
	note = note.replace( "E#", "F" );
	note = note.replace( "B#", "C" );

	// Check for extra note length (dotted notes)
	if( cmd.name.indexOf( ".." ) > 0 ) {
		track.extra = 1.75 * track.noteLength;
	} else if( cmd.name.indexOf( "." ) > 0 ) {
		track.extra = 1.5 * track.noteLength;
	}

	// Remove dots from note
	note = note.replace( /\./g, "" );

	// Get note frequency
	let frequency = 0;
	if( m_notesData[ note ] ) {
		const octave = track.octave + track.octaveExtra;
		if( octave < m_notesData[ note ].length ) {
			frequency = m_notesData[ note ][ octave ];
		}
	}

	// Check if note length included
	if( !isNaN( Number( cmd.val ) ) ) {
		const val = m_utils.getInt( cmd.val, 1 );
		track.extra = getNoteLength( val );
	}

	return frequency;
}

/**
 * Process music style commands (M...)
 * 
 * @param {Object} track - Track object
 * @param {Object} cmd - Command object
 */
function processMusic( track, cmd ) {
	switch( cmd.name ) {
		case "MS":

			// Staccato
			track.pace = 0.75;
			break;
		case "MN":

			// Normal
			track.pace = 0.875;
			break;
		case "ML":

			// Legato
			track.pace = 1;
			break;
		case "MU":
			if( !isNaN( Number( cmd.val ) ) ) {

				// Modify octave
				const val = m_utils.getInt( cmd.val, 0 );
				track.octaveExtra = val;
			}
			break;
		case "MY":
			if( !isNaN( Number( cmd.val ) ) ) {

				// Modify attack rate
				const val = m_utils.getInt( cmd.val, 25 );
				track.attackRate = val / 100;
			}
			break;
		case "MX":
			if( !isNaN( Number( cmd.val ) ) ) {

				// Modify sustain rate
				const val = m_utils.getInt( cmd.val, 25 );
				track.sustainRate = val / 100;
			}
			break;
		case "MZ":
			if( !isNaN( Number( cmd.val ) ) ) {

				// Modify decay rate
				const val = m_utils.getInt( cmd.val, 25 );
				track.decayRate = val / 100;
			}
			break;
		case "MW":

			// Toggle full note
			track.fullNote = !track.fullNote;
			break;
	}
}

/**
 * Process waveform commands (W...)
 * 
 * @param {Object} track - Track object
 * @param {Object} cmd - Command object
 */
function processWaveform( track, cmd ) {
	if( cmd.name === "WS" ) {
		track.type = "sine";
	} else if( cmd.name === "WQ" ) {
		track.type = "square";
	} else if( cmd.name === "WW" ) {
		track.type = "sawtooth";
	} else if( cmd.name === "WT" ) {
		track.type = "triangle";
	} else if( !isNaN( Number( cmd.val ) ) ) {

		// Custom wavetable
		const val = m_utils.getInt( cmd.val, -1 );
		if( track.waveTables[ val ] ) {
			track.type = val;
		}
	}
}

/**
 * Play a single note
 * 
 * @param {Object} track - Track object
 * @param {number} frequency - Frequency in Hz
 */
function playNote( track, frequency ) {
	const volume = track.volume;
	const attackTime = track.interval * track.attackRate;
	const sustainTime = track.interval * track.sustainRate;
	const decayTime = track.interval * track.decayRate;

	let stopTime;
	if( track.fullNote && attackTime + sustainTime + decayTime > track.interval ) {
		stopTime = track.interval;
	} else {
		stopTime = attackTime + sustainTime + decayTime;
	}

	let oType;
	let waveTables = null;
	if( typeof track.type === "string" ) {
		oType = track.type;
	} else {
		waveTables = track.waveTables[ track.type ];
		if( Array.isArray( waveTables ) ) {
			oType = "custom";
		} else {
			oType = waveTables;
			waveTables = null;
		}
	}

	const soundData = {
		"frequency": frequency,
		"volume": volume,
		"attackTime": attackTime,
		"sustainTime": sustainTime,
		"decayTime": decayTime,
		"stopTime": stopTime,
		"oType": oType,
		"waveTables": waveTables,
		"time": track.time,
		"track": track
	};

	m_playData.push( soundData );
}

/**
 * Copy track data from source to destination
 * 
 * @param {number} trackDestId - Destination track ID
 * @param {number} trackSourceId - Source track ID
 */
function copyTrackData( trackDestId, trackSourceId ) {
	const trackDest = m_tracks[ trackDestId ];
	const trackSource = m_tracks[ trackSourceId ];

	trackDest.decayRate = trackSource.decayRate;
	trackDest.attackRate = trackSource.attackRate;
	trackDest.sustainRate = trackSource.sustainRate;
	trackDest.fullNote = trackSource.fullNote;
	trackDest.extra = trackSource.extra;
	trackDest.space = trackSource.space;
	trackDest.interval = trackSource.interval;
	trackDest.tempo = trackSource.tempo;
	trackDest.noteLength = trackSource.noteLength;
	trackDest.pace = trackSource.pace;
	trackDest.octave = trackSource.octave;
	trackDest.octaveExtra = trackSource.octaveExtra;
	trackDest.volume = trackSource.volume;
	trackDest.type = trackSource.type;
}

/**
 * Remove a track and all its sub-tracks
 * 
 * @param {number} trackId - Track ID to remove
 */
function removeTrack( trackId ) {

	// Delete all sub-tracks as well as main track
	const trackIds = m_tracks[ trackId ].trackIds;
	for( let i = trackIds.length; i >= 0; i-- ) {
		delete m_tracks[ trackIds[ i ] ];
	}

	// Remove track from all tracks array
	for( let i = m_allTracks.length - 1; i >= 0; i-- ) {
		if( !m_tracks[ m_allTracks[ i ] ] ) {
			m_allTracks.splice( i, 1 );
		}
	}
}

/**
 * Get note length from note value
 * 
 * @param {number} val - Note value (1-64)
 * @returns {number} Note length
 */
function getNoteLength( val ) {
	if( val >= 1 && val < 65 ) {
		return 1 / val;
	}
	return 0.875;
}


/***************************************************************************************************
 * Plugin Registration
 **************************************************************************************************/


/**
 * Register play module commands
 * 
 * @param {Object} pluginApi - Plugin API
 */
export function registerPlay( pluginApi ) {
	m_utils = pluginApi.utils;

	/**
	 * Play music using BASIC-style notation
	 * 
	 * Format: "NOTE[length][.][#|+|-] ..."
	 * - Notes: A-G (can include sharps # or +, flats -)
	 * - Length: 1-64 (1=whole, 4=quarter, etc.)
	 * - Dot modifiers: . (1.5x), .. (1.75x)
	 * - Multiple tracks: separated by commas
	 * 
	 * Commands:
	 * - O[n]: Set octave (0-9)
	 * - L[n]: Set default note length
	 * - T[n]: Set tempo (32-255 BPM)
	 * - V[n]: Set volume (0-100)
	 * - P[n]: Pause for note length
	 * - N[n]: Play note by number (0-127)
	 * - W[type]: Set waveform (SINE, SQUARE, SAWTOOTH, TRIANGLE)
	 * - MS: Staccato (75% of note length)
	 * - MN: Normal (87.5% of note length)
	 * - ML: Legato (100% of note length)
	 * - MW: Toggle full note mode
	 * - MO[n]: Modify octave offset
	 * - MA[n]: Modify attack rate (0-100)
	 * - MT[n]: Modify sustain rate (0-100)
	 * - MD[n]: Modify decay rate (0-100)
	 * - <: Decrease octave
	 * - >: Increase octave
	 * 
	 * @param {Object} options - Command options
	 * @param {string} options.playString - Music notation string
	 */
	pluginApi.addCommand( "play", play, false, [ "playString" ] );
	function play( options ) {
		let playString = options.playString;

		// Validate playString
		if( typeof playString !== "string" ) {
			const error = new TypeError( "play: Parameter playString must be a string." );
			error.code = "INVALID_PLAY_STRING";
			throw error;
		}

		// Create track from play string
		const trackId = createTrack( playString );

		// Generate all play data
		m_playData = [];
		playTrack( trackId );

		// Sort by time
		m_playData.sort( ( a, b ) => a.time - b.time );

		// Create audio context
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		const audioContext = new AudioContextClass();

		// Create all sounds
		for( let i = 0; i < m_playData.length; i++ ) {
			const playData = m_playData[ i ];
			playData.track.sounds.push(
				createSound(
					audioContext, playData.frequency, playData.volume, playData.attackTime,
					playData.sustainTime, playData.decayTime, playData.stopTime, playData.oType,
					playData.waveTables, playData.time
				)
			);
		}
	}

	/**
	 * Stop playing music
	 * 
	 * @param {Object} options - Command options
	 * @param {number} options.trackId - Track ID to stop (null to stop all tracks)
	 */
	pluginApi.addCommand( "stopPlay", stopPlay, false, [ "trackId" ] );
	function stopPlay( options ) {
		const trackId = options.trackId;

		// Stop all tracks
		if( trackId === null ) {
			for( let i = 0; i < m_allTracks.length; i++ ) {
				const track = m_tracks[ m_allTracks[ i ] ];
				if( track ) {
					for( let j = 0; j < track.sounds.length; j++ ) {
						stopSoundById( track.sounds[ j ] );
					}
					delete m_tracks[ m_allTracks[ i ] ];
				}
			}
			m_allTracks.length = 0;
			return;
		}

		// Stop specific track
		if( m_tracks[ trackId ] ) {
			const track = m_tracks[ trackId ];
			for( let j = 0; j < track.sounds.length; j++ ) {
				stopSoundById( track.sounds[ j ] );
			}
			removeTrack( trackId );
		}
	}
}

