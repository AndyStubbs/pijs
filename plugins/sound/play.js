/**
 * Pi.js - Play Module (Plugin)
 *
 * BASIC-style music notation playback (inspired by QBasic PLAY command). A play string is
 * parsed into immutable note events when play() is called; the lookahead scheduler creates
 * each note's voice only when it enters the window. PLAY extensions add tokens, per-track
 * state, and per-note voice overrides, and observePlay listeners hear about admitted notes
 * and song ends.
 *
 * @module plugins/sound/play
 */

"use strict";

import * as g_context from "./context.js";
import * as g_envelope from "./envelope.js";
import * as g_scheduler from "./scheduler.js";
import * as g_voices from "./voices.js";

// Semitones above C for each note letter
const NOTE_SEMITONES = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };

// N plays notes 1-119 by number; N1 is C0 and N58 is A4 at 440 Hz
const MAX_NOTE_NUMBER = 119;
const A4_NUMBER = 58;
const OCTAVES = 10;

// Built-in commands other than notes. "@" is reserved for an instrument extension.
const COMMANDS = [
	"N", "O", "L", "T", "V", "P", "<", ">", "MS", "MN", "ML", "MW", "MO", "MA", "MD", "MH",
	"MR", "MP", "MB", "MF", "WS", "WQ", "WW", "WT", "WN", "WP", "W"
];

// Waveform words and the commands they stand for
const WORDS = {
	"SINE": "WS",
	"SQUARE": "WQ",
	"SAWTOOTH": "WW",
	"TRIANGLE": "WT",
	"NOISE": "WN",
	"PINK": "WP"
};

const WAVEFORMS = {
	"WS": "sine",
	"WQ": "square",
	"WW": "sawtooth",
	"WT": "triangle",
	"WN": "white",
	"WP": "pink"
};

// Articulation: the fraction of each note's slot that sounds
const PACES = { "MS": 0.75, "MN": 0.875, "ML": 1 };

// Envelope percentages of the sounding length (MA, MD, MR) and sustain level (MH)
const ENVELOPE_COMMANDS = { "MA": "attack", "MD": "decay", "MH": "sustain", "MR": "release" };

const NOTE_PATTERN = /([A-G])([#+-]?)(\d*)(\.{0,2})/y;
const VALUE_PATTERN = /-?\d+/y;
const INVALID_PREFIX_PATTERN = /[\d\s,[\]#+.-]/;

const m_songs = new Map();
let m_lastTrackId = 0;

// observePlay listeners
const m_playObservers = new Set();

// Registered PLAY extensions in registration order, and extension tokens by prefix
const m_extensions = [];
const m_extensionTokens = new Map();

// Token names matched longest first: commands, words, "@", and extension prefixes
let m_tokenNames = [];
rebuildTokenNames();


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Rebuild the token table, longest names first
 *
 * @returns {void}
 */
function rebuildTokenNames() {
	m_tokenNames = COMMANDS.concat( Object.keys( WORDS ), "@", [ ...m_extensionTokens.keys() ] );
	m_tokenNames.sort( ( a, b ) => b.length - a.length );
}

/**
 * Throw an error with a code
 *
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {never}
 */
function throwCode( message, code ) {
	const error = new Error( message );
	error.code = code;
	throw error;
}

/**
 * Frequency of a note number
 *
 * @param {number} number - Note number; 1 is C0 and 58 is A4
 * @returns {number} Frequency in Hz
 */
function noteFrequency( number ) {
	return 440 * Math.pow( 2, ( number - A4_NUMBER ) / 12 );
}

/**
 * Note length from a note value, as a fraction of a whole note
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

/**
 * Clamp a value to a range
 *
 * @param {number} value - Value
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number} Clamped value
 */
function clamp( value, min, max ) {
	return Math.min( Math.max( value, min ), max );
}

/**
 * Extract [[real],[imag]] wave tables, replacing each with a W<index> command
 *
 * @param {string} playString - Uppercase play string without whitespace
 * @returns {Object} { playString, waveTables }; invalid tables become "triangle"
 */
function extractWaveTables( playString ) {
	const waveTables = [];
	let start = playString.indexOf( "[[" );
	while( start > -1 ) {
		const end = playString.indexOf( "]]", start );
		if( end === -1 ) {
			break;
		}
		const text = playString.substring( start, end + 2 );
		playString = playString.replace( text, "W" + waveTables.length );
		let table = JSON.parse( text );
		if( table.length !== 2 || table[ 0 ].length !== table[ 1 ].length ) {
			console.error(
				"play: Wavetables must have 2 arrays of same length. Defaulting to triangle wave."
			);
			table = "triangle";
		} else {
			for( let j = 0; j < 2; j++ ) {
				table[ j ] = new Float32Array( table[ j ].map( value => {
					const number = parseFloat( value );
					if( isNaN( number ) ) {
						return 0;
					}
					return number;
				} ) );
			}
		}
		waveTables.push( table );
		start = playString.indexOf( "[[" );
	}
	return { "playString": playString, "waveTables": waveTables };
}

/**
 * Read an optional signed integer at a position
 *
 * @param {string} text - Track text
 * @param {number} index - Position
 * @returns {Object} { value, index }; value is null when no digits follow
 */
function readValue( text, index ) {
	VALUE_PATTERN.lastIndex = index;
	const match = VALUE_PATTERN.exec( text );
	if( match === null ) {
		return { "value": null, "index": index };
	}
	return { "value": parseInt( match[ 0 ], 10 ), "index": VALUE_PATTERN.lastIndex };
}

/**
 * Create the default settings of a track
 *
 * @returns {Object} Track settings
 */
function createTrackState() {
	const state = {
		"tempo": 60 / 120,
		"noteLength": 0.25,
		"pace": PACES.MN,
		"octave": 4,
		"octaveOffset": 0,
		"volume": 1,
		"pan": 0,
		"attack": 15,
		"decay": 20,
		"sustain": 65,
		"release": 20,
		"oType": "triangle",
		"waveTables": null,
		"ext": {}
	};
	for( const extension of m_extensions ) {
		state.ext[ extension.name ] = extension.initState();
	}
	return state;
}

/**
 * Copy track settings for a simultaneous (comma-separated) track, including extension state
 *
 * @param {Object} state - Track settings
 * @returns {Object} Copy
 */
function copyTrackState( state ) {
	const copy = Object.assign( {}, state, { "ext": {} } );
	for( const extension of m_extensions ) {
		copy.ext[ extension.name ] = extension.copyState( state.ext[ extension.name ] );
	}
	return copy;
}

/**
 * Build a note's immutable event, applying extension overrides
 *
 * The slot is split into a sounding length (slot × pace) and a rest. Attack, decay, and
 * release are percentages of the sounding length, and the release runs inside it, so the
 * envelope always ends within the note's own slot.
 *
 * @param {Object} state - Track settings
 * @param {number} frequency - Frequency in Hz
 * @param {number} time - Song time of the note in seconds
 * @param {number} slot - Slot length in seconds
 * @param {number} track - Index of the note's comma-separated track
 * @returns {Object} Frozen event
 */
function createNoteEvent( state, frequency, time, slot, track ) {
	const sounding = slot * state.pace;
	const releaseTime = Math.max( sounding * state.release / 100, g_envelope.MIN_RAMP );
	let note = {
		"frequency": frequency,
		"frequencyEnd": null,
		"time": time,
		"gate": Math.max( sounding - releaseTime, 0 ),
		"volume": state.volume,
		"envelope": {
			"attackTime": sounding * state.attack / 100,
			"decayTime": sounding * state.decay / 100,
			"sustainLevel": state.sustain / 100,
			"releaseTime": releaseTime
		},
		"pan": state.pan,
		"oType": state.oType,
		"waveTables": state.waveTables,
		"inserts": null
	};

	// Extension overrides are copied into the snapshot; factories are kept, not invoked
	for( const extension of m_extensions ) {
		const overrides = extension.resolveNote(
			state.ext[ extension.name ], g_voices.snapshot( note )
		);
		if( overrides ) {
			note = Object.assign( {}, note, overrides, {
				"time": time,
				"envelope": Object.assign( {}, note.envelope, overrides.envelope )
			} );
		}
	}
	let oType = note.oType;
	let waveTables = note.waveTables;
	if( Array.isArray( oType ) ) {
		waveTables = [ new Float32Array( oType[ 0 ] ), new Float32Array( oType[ 1 ] ) ];
		oType = "custom";
	} else if( oType !== "custom" && !g_voices.isSourceType( oType ) ) {
		throwCode( `play: Unknown oType "${oType}" from a PLAY extension.`, "INVALID_OTYPE" );
	}

	return g_voices.snapshot( {
		"time": time,
		"track": track,
		"frequency": note.frequency,
		"frequencyEnd": note.frequencyEnd,
		"peak": note.volume,
		"pan": note.pan,
		"oType": oType,
		"waveTables": waveTables,
		"env": g_envelope.resolveEnvelope( {
			"duration": note.gate,
			"attackTime": note.envelope.attackTime,
			"decayTime": note.envelope.decayTime,
			"sustainLevel": note.envelope.sustainLevel,
			"releaseTime": note.envelope.releaseTime
		} ),
		"inserts": note.inserts
	} );
}

/**
 * Apply one token to a track, adding a note event if it plays one
 *
 * @param {Object} token - Token from tokenize
 * @param {Object} state - Track settings
 * @param {number} time - Song time of the token in seconds
 * @param {Object} song - Generation context: events, waveTables, warnings, track
 * @returns {number} Song time of the next token
 */
function applyToken( token, state, time, song ) {
	const value = token.value;
	let frequency = 0;
	let length = 0;

	if( token.handler ) {
		token.handler( state.ext[ token.extension ], value );
		return time;
	}

	switch( token.name ) {
		case "NOTE": {
			const octave = state.octave + state.octaveOffset;
			if( octave >= 0 && octave < OCTAVES ) {
				frequency = noteFrequency( octave * 12 + token.semitone + 1 );
			}
			length = state.noteLength;
			if( token.length !== null ) {
				length = getNoteLength( token.length );
			}
			length *= [ 1, 1.5, 1.75 ][ token.dots ];
			break;
		}
		case "N":
			if( value !== null ) {
				if( value > 0 && value <= MAX_NOTE_NUMBER ) {
					frequency = noteFrequency( value );
				}
				length = state.noteLength;
			}
			break;
		case "O":
			if( value !== null && value >= 0 && value < OCTAVES ) {
				state.octave = value;
			}
			break;
		case ">":
			state.octave = Math.min( state.octave + 1, OCTAVES - 1 );
			break;
		case "<":
			state.octave = Math.max( state.octave - 1, 0 );
			break;
		case "L":
			if( value !== null ) {
				state.noteLength = getNoteLength( value );
			}
			break;
		case "T":
			if( value !== null && value >= 32 && value < 256 ) {
				state.tempo = 60 / value;
			}
			break;
		case "V":
			if( value !== null ) {
				state.volume = clamp( value, 0, 100 ) / 100;
			}
			break;
		case "P":
			if( value !== null ) {
				length = getNoteLength( value );
			}
			break;
		case "MS":
		case "MN":
		case "ML":
			state.pace = PACES[ token.name ];
			break;
		case "MO":
			if( value !== null ) {
				state.octaveOffset = value;
			}
			break;
		case "MA":
		case "MD":
		case "MH":
		case "MR":
			if( value !== null ) {
				state[ ENVELOPE_COMMANDS[ token.name ] ] = clamp( value, 0, 100 );
			}
			break;
		case "MP":
			if( value !== null ) {
				state.pan = clamp( value, -100, 100 ) / 100;
			}
			break;
		case "W": {
			const table = song.waveTables[ value ];
			if( Array.isArray( table ) ) {
				state.oType = "custom";
				state.waveTables = table;
			} else if( table ) {
				state.oType = table;
				state.waveTables = null;
			}
			break;
		}
		case "@":
			song.warnings.instrument = true;
			break;
		case "?":
			if( song.warnings.unknown === null ) {
				song.warnings.unknown = token.text;
			}
			break;
		default:
			if( WAVEFORMS[ token.name ] ) {
				state.oType = WAVEFORMS[ token.name ];
				state.waveTables = null;
			}

			// MW, MB, and MF are parsed and have no effect
			break;
	}

	if( length === 0 ) {
		return time;
	}
	const slot = state.tempo * length * 4;
	if( frequency > 0 ) {
		song.events.push( createNoteEvent( state, frequency, time, slot, song.track ) );
	}
	return time + slot;
}

/**
 * Report a PLAY event to every observePlay listener
 *
 * A throwing listener is logged and never affects playback or the other listeners.
 *
 * @param {Object} event - Note or end event
 * @returns {void}
 */
function notifyPlay( event ) {
	Object.freeze( event );
	for( const listener of Array.from( m_playObservers ) ) {
		try {
			listener( event );
		} catch( error ) {
			console.error( "sound: Play observer failed:", error );
		}
	}
}

/**
 * Remove a song's track IDs from the song table
 *
 * @param {Object} song - Song record
 * @returns {void}
 */
function removeSong( song ) {
	for( const trackId of song.trackIds ) {
		if( m_songs.get( trackId ) === song ) {
			m_songs.delete( trackId );
		}
	}
}

/**
 * Create the voice of a song's next event on the music bus
 *
 * The event index advances first, so a failed start never repeats. startVoice applies the
 * late-start rule, admission, and the caps.
 *
 * @param {Object} song - Song record
 * @returns {void}
 */
function playNextEvent( song ) {
	const event = song.events[ song.index ];
	song.index += 1;
	const soundId = g_voices.nextSoundId();
	const voice = g_voices.startVoice( {
		"frequency": event.frequency,
		"frequencyEnd": event.frequencyEnd,
		"oType": event.oType,
		"waveTables": event.waveTables,
		"peak": event.peak,
		"pan": event.pan,
		"bus": "music",
		"env": event.env,
		"start": song.base + event.time,
		"inserts": event.inserts,
		"onDispose": () => {
			song.voices.delete( soundId );
		}
	}, soundId );
	if( voice ) {
		song.voices.set( soundId, voice );
		notifyPlay( {
			"type": "note",
			"trackId": song.id,
			"track": event.track,
			"time": voice.begin,
			"duration": voice.end - voice.begin,
			"frequency": event.frequency,
			"volume": event.peak
		} );
	}
}

/**
 * Start a song's timeline at the scheduling lead and hand its events to the scheduler
 *
 * @param {Object} song - Song record
 * @returns {void}
 */
function startSong( song ) {
	song.deferred = null;
	song.base = g_context.getScheduleLead();
	g_scheduler.addStream( {
		"id": song.id,
		"kind": "play",
		"peek": () => {
			if( song.index < song.events.length ) {
				return song.base + song.events[ song.index ].time;
			}
			return Infinity;
		},
		"take": () => {
			playNextEvent( song );
		},
		"isDone": () => song.index >= song.events.length && song.voices.size === 0,
		"onDone": () => {
			removeSong( song );
			notifyPlay( { "type": "end", "trackId": song.id, "stopped": false } );
		}
	} );
}

/**
 * Stop a song: cancel its deferred start, drop its unscheduled events, and stop its voices
 *
 * Voices not yet audible are stopped without sound; audible voices fade from the scheduling
 * lead, and earlier fades are kept.
 *
 * @param {Object} song - Song record
 * @returns {void}
 */
function stopSong( song ) {
	if( song.deferred ) {
		g_context.cancelUnlock( song.deferred );
		song.deferred = null;
	}
	g_scheduler.removeStream( song.id );
	song.index = song.events.length;
	for( const voice of Array.from( song.voices.values() ) ) {
		g_voices.stopVoice( voice, null, "stop" );
	}
	removeSong( song );
	notifyPlay( { "type": "end", "trackId": song.id, "stopped": true } );
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Split one track of a play string into tokens
 *
 * Commands are matched longest first. A note is a letter A-G with an optional accidental
 * (#, +, or -), length, and one or two dots. Other commands take an optional signed integer.
 * "M" followed by any other letter is one unknown command, and any other unrecognized
 * character is skipped; both produce "?" tokens.
 *
 * @param {string} text - Uppercase track text without whitespace
 * @returns {Array<Object>} Tokens { name, value } and notes { name: "NOTE", semitone, length,
 * dots }
 */
export function tokenize( text ) {
	const tokens = [];
	let index = 0;
	while( index < text.length ) {
		const name = m_tokenNames.find( tokenName => text.startsWith( tokenName, index ) );
		if( name !== undefined ) {
			const read = readValue( text, index + name.length );
			const token = { "name": WORDS[ name ] || name, "value": read.value };
			const owner = m_extensionTokens.get( name );
			if( owner ) {
				token.handler = owner.handler;
				token.extension = owner.extension;
			}
			tokens.push( token );
			index = read.index;
			continue;
		}

		NOTE_PATTERN.lastIndex = index;
		const note = NOTE_PATTERN.exec( text );
		if( note !== null ) {
			let semitone = NOTE_SEMITONES[ note[ 1 ] ];
			if( note[ 2 ] === "-" ) {
				semitone -= 1;
			} else if( note[ 2 ] !== "" ) {
				semitone += 1;
			}
			let length = null;
			if( note[ 3 ] !== "" ) {
				length = parseInt( note[ 3 ], 10 );
			}
			tokens.push( {
				"name": "NOTE",
				"semitone": semitone,
				"length": length,
				"dots": note[ 4 ].length
			} );
			index = NOTE_PATTERN.lastIndex;
			continue;
		}

		// Unknown input: "M" plus a letter is one command with its value, so a removed
		// command such as MT50 is never read as T50
		let end = index + 1;
		if( text[ index ] === "M" && /[A-Z]/.test( text[ index + 1 ] ) ) {
			end = readValue( text, index + 2 ).index;
		}
		tokens.push( { "name": "?", "value": null, "text": text.substring( index, end ) } );
		index = end;
	}
	return tokens;
}

/**
 * Parse a play string into immutable note events
 *
 * Each comma-separated track starts at the song time of the previous track's last command,
 * with a copy of that track's settings at that point, so "CDE, F" plays F with E. Extension
 * token handlers run in string order and resolveNote runs once per note.
 *
 * @param {string} playString - Music notation string
 * @returns {Object} { events (sorted by time, frozen), trackCount, warnings: { unknown,
 * instrument } }
 */
export function parsePlayString( playString ) {
	const extracted = extractWaveTables( playString.split( /\s+/ ).join( "" ).toUpperCase() );
	const trackTexts = extracted.playString.split( "," );
	const song = {
		"events": [],
		"waveTables": extracted.waveTables,
		"warnings": { "unknown": null, "instrument": false }
	};

	let state = createTrackState();
	let time = 0;
	for( let i = 0; i < trackTexts.length; i++ ) {
		const tokens = tokenize( trackTexts[ i ] );
		song.track = i;
		let nextTime = time;
		for( const token of tokens ) {
			nextTime = time;
			time = applyToken( token, state, time, song );
		}

		// The next track starts at this track's last command, after its settings apply
		if( i < trackTexts.length - 1 ) {
			state = copyTrackState( state );
			time = nextTime;
		}
	}

	song.events.sort( ( a, b ) => a.time - b.time );
	return {
		"events": Object.freeze( song.events ),
		"trackCount": trackTexts.length,
		"warnings": song.warnings
	};
}

/**
 * Observe admitted PLAY notes and song ends (extension service method)
 *
 * Notes are reported when the scheduler admits them, up to the lookahead window before they
 * sound: { type: "note", trackId, track, time, duration, frequency, volume }, where time is
 * the audible start in context time and duration runs to the end of the release. Rejected
 * and skipped notes are not reported. A finished or stopped song reports { type: "end",
 * trackId, stopped } once. trackId is the ID play() returned.
 *
 * @param {Function} listener - Called with each event
 * @returns {Function} Removes the listener
 */
export function observePlay( listener ) {
	if( typeof listener !== "function" ) {
		throwCode( "observePlay: Parameter listener must be a function.", "INVALID_LISTENER" );
	}
	m_playObservers.add( listener );
	return () => {
		m_playObservers.delete( listener );
	};
}

/**
 * Register a PLAY extension (extension service method)
 *
 * The registration is rejected as a whole when any check fails.
 *
 * @param {string} name - Extension name; its per-track state is track.ext[ name ]
 * @param {Object} extension - Extension
 * @param {Object<string, Function>} extension.tokens - Token prefix to handler( state, value );
 * value is the integer after the prefix, or null
 * @param {Function} extension.initState - Returns a new per-track state
 * @param {Function} extension.copyState - Returns a copy of a state for a simultaneous track
 * @param {Function} extension.resolveNote - ( state, note ) => voice-spec overrides or null
 * @returns {void}
 */
export function registerPlayExtension( name, extension ) {
	if( typeof name !== "string" || name === "" ) {
		throwCode(
			"registerPlayExtension: Parameter name must be a non-empty string.",
			"INVALID_PLAY_EXTENSION"
		);
	}
	if(
		!extension || typeof extension.tokens !== "object" || extension.tokens === null ||
		typeof extension.initState !== "function" || typeof extension.copyState !== "function" ||
		typeof extension.resolveNote !== "function"
	) {
		throwCode(
			"registerPlayExtension: Parameter extension must have tokens, initState, copyState, " +
			"and resolveNote.",
			"INVALID_PLAY_EXTENSION"
		);
	}
	if( m_extensions.some( registered => registered.name === name ) ) {
		throwCode(
			`registerPlayExtension: A PLAY extension named "${name}" is already registered.`,
			"DUPLICATE_PLAY_TOKEN"
		);
	}

	const tokens = new Map();
	for( const prefix of Object.keys( extension.tokens ) ) {
		const upper = prefix.toUpperCase();
		const handler = extension.tokens[ prefix ];
		if(
			upper === "" || INVALID_PREFIX_PATTERN.test( upper ) || typeof handler !== "function"
		) {
			throwCode(
				`registerPlayExtension: Token "${prefix}" must be a prefix without digits, ` +
				"spaces, or , [ ] # + - . and must map to a function.",
				"INVALID_PLAY_EXTENSION"
			);
		}
		if(
			COMMANDS.includes( upper ) || WORDS[ upper ] || NOTE_SEMITONES[ upper ] !== undefined ||
			m_extensionTokens.has( upper ) || tokens.has( upper )
		) {
			throwCode(
				`registerPlayExtension: PLAY token "${upper}" is already registered.`,
				"DUPLICATE_PLAY_TOKEN"
			);
		}
		tokens.set( upper, { "handler": handler, "extension": name } );
	}

	m_extensions.push( {
		"name": name,
		"initState": extension.initState,
		"copyState": extension.copyState,
		"resolveNote": extension.resolveNote
	} );
	for( const [ prefix, owner ] of tokens ) {
		m_extensionTokens.set( prefix, owner );
	}
	rebuildTokenNames();
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register play module commands
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
export function registerPlay( pluginApi ) {


	pluginApi.addCommand( "play", play, false, [ "playString" ] );

	/**
	 * Play music using BASIC-style notation
	 *
	 * Format: "NOTE[#|+|-][length][.|..] ..."
	 * - Notes: A-G, with sharps (# or +) or flats (-)
	 * - Length: 1-64 (1=whole, 4=quarter, etc.); dots add 1.5x or 1.75x
	 * - Comma: starts a simultaneous track at the previous track's last command
	 *
	 * Commands:
	 * - O[n]: Set octave (0-9); < and > step it
	 * - L[n]: Set default note length
	 * - T[n]: Set tempo (32-255 BPM)
	 * - V[n]: Set volume (0-100)
	 * - P[n]: Rest for a note length
	 * - N[n]: Play note by number (1-119; 0 rests)
	 * - WS/SINE, WQ/SQUARE, WW/SAWTOOTH, WT/TRIANGLE, WN/NOISE, WP/PINK: Waveform
	 * - [[real],[imag]]: Custom wave table
	 * - MS, MN, ML: Staccato (75%), normal (87.5%), legato (100%) of each note's slot sounds
	 * - MA[n], MD[n], MR[n]: Attack, decay, release as % of the sounding length
	 * - MH[n]: Sustain level as % of note volume
	 * - MP[n]: Pan (-100 to 100)
	 * - MO[n]: Octave offset (can be negative)
	 * - @[n]: Select instrument (needs a PLAY extension)
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.playString - Music notation string
	 * @returns {number} Track ID for use with stopPlay.
	 */
	function play( options ) {
		const playString = options.playString;

		// Validate playString
		if( typeof playString !== "string" ) {
			const error = new TypeError( "play: Parameter playString must be a string." );
			error.code = "INVALID_PLAY_STRING";
			throw error;
		}

		// Events are generated now, so later extension changes never affect this song
		const parsed = parsePlayString( playString );
		if( parsed.warnings.unknown !== null ) {
			console.warn( `play: Unknown command "${parsed.warnings.unknown}" ignored.` );
		}
		if( parsed.warnings.instrument ) {
			console.warn( "play: Instrument command @n needs a PLAY extension; ignored." );
		}

		const song = {
			"id": m_lastTrackId,
			"trackIds": [],
			"events": parsed.events,
			"index": 0,
			"base": 0,
			"voices": new Map(),
			"deferred": null
		};
		for( let i = 0; i < parsed.trackCount; i++ ) {
			song.trackIds.push( m_lastTrackId );
			m_songs.set( m_lastTrackId, song );
			m_lastTrackId += 1;
		}

		// A locked context defers the song until the unlocking gesture
		if( g_context.isLocked() ) {
			song.deferred = () => {
				startSong( song );
			};
			g_context.onUnlock( song.deferred );
			return song.id;
		}

		startSong( song );
		return song.id;
	}


	pluginApi.addCommand( "stopPlay", stopPlay, false, [ "trackId" ] );

	/**
	 * Stop playing music
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.trackId - Track ID to stop (null to stop all tracks)
	 * @returns {void}
	 */
	function stopPlay( options ) {
		const trackId = options.trackId;

		// Stop all songs
		if( trackId === null ) {
			for( const song of new Set( m_songs.values() ) ) {
				stopSong( song );
			}
			return;
		}

		// Stop the song containing the track, including its simultaneous tracks
		const song = m_songs.get( trackId );
		if( song ) {
			stopSong( song );
		}
	}
}
