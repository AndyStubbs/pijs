/**
 * Pi.js - PLAY Module
 * 
 * QBasic-style PLAY command for music notation.
 * Parses PLAY strings and generates notes using WebAudio.
 * 
 * @module modules/play
 */

"use strict";

export function init( pi ) {
	const piData = pi._.data;

	// Note frequencies (A0-G#9)
	const m_notesData = {
		"A": [ 27.50, 55.00, 110, 220, 440, 880, 1760, 3520, 7040, 14080 ],
		"A#": [ 29.14, 58.27, 116.541, 233.082, 466.164, 932.328, 1864.655, 
			3729.31, 7458.62, 14917.24 ],
		"B": [ 30.87, 61.74, 123.471, 246.942, 493.883, 987.767, 1975.533, 
			3951.066, 7902.132, 15804.264 ],
		"C": [ 16.35, 32.70, 65.41, 130.813, 261.626, 523.251, 1046.502, 
			2093.005, 4186.009, 8372.018 ],
		"C#": [ 17.32, 34.65, 69.296, 138.591, 277.183, 554.365, 1108.731, 
			2217.461, 4434.922, 8869.844 ],
		"D": [ 18.35, 36.71, 73.416, 146.832, 293.665, 587.33, 1174.659, 
			2349.318, 4698.636, 9397.272 ],
		"D#": [ 19.45, 38.89, 77.782, 155.563, 311.127, 622.254, 1244.508, 
			2489.016, 4978.032, 9956.064 ],
		"E": [ 20.60, 41.20, 82.407, 164.814, 329.628, 659.255, 1318.51, 
			2637.021, 5274.042, 10548.084 ],
		"F": [ 21.83, 43.65, 87.307, 174.614, 349.228, 698.456, 1396.913, 
			2793.826, 5587.652, 11175.304 ],
		"F#": [ 23.12, 46.25, 92.499, 184.997, 369.994, 739.989, 1479.978, 
			2959.955, 5919.91, 11839.82 ],
		"G": [ 24.50, 49.00, 97.999, 195.998, 391.995, 783.991, 1567.982, 
			3135.964, 6271.928, 12543.856 ],
		"G#": [ 25.96, 51.91, 103.826, 207.652, 415.305, 830.609, 1661.219, 
			3322.438, 6644.876, 13289.752 ]
	};

	// Tracks storage
	let m_tracks = {};
	let m_allTracks = [];
	let m_lastTrackId = 0;
	let m_playData = [];

	// PLAY - Parse and play PLAY string
	pi._.addCommand( "play", play, false, false, [ "playString" ] );

	function play( args ) {
		let playString = args[ 0 ];

		if( typeof playString !== "string" ) {
			const error = new TypeError( "play: playString needs to be a string" );
			error.code = "INVALID_PLAY_STRING";
			throw error;
		}

		const trackId = createTrack( playString );
		if( !trackId ) {
			return null;
		}

		m_playData = [];
		playTrack( trackId );

		m_playData.sort( ( a, b ) => a.time - b.time );

		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		const audioContext = new AudioContextClass();
		
		for( let i = 0; i < m_playData.length; i++ ) {
			const playData = m_playData[ i ];
			playData.track.sounds.push(
				piData.commands.createSound(
					"play", audioContext, playData.frequency, playData.volume,
					playData.attackTime, playData.sustainTime, playData.decayTime,
					playData.stopTime, playData.oType, playData.waveTables, playData.time
				)
			);
		}
	}

	function createTrack( playString ) {

		// Convert to uppercase and remove spaces
		playString = playString.split( /\s+/ ).join( "" ).toUpperCase();

		const trackId = "track_" + m_lastTrackId;
		m_lastTrackId += 1;

		// Initialize track
		const track = {
			"id": trackId,
			"notes": [],
			"noteId": 0,
			"attackRate": 0.1,
			"decayRate": 0.2,
			"sustainRate": 0.65,
			"fullNote": false,
			"tempo": 60 / 120,
			"noteLength": 0.25,
			"pace": 0.875,
			"octave": 4,
			"volume": 1,
			"type": "triangle",
			"waveTables": null,
			"sounds": []
		};

		m_tracks[ trackId ] = track;
		m_allTracks.push( { "id": trackId } );

		// Parse the play string and create notes in one pass
		let i = 0;

		while( i < playString.length ) {
			const char = playString.charAt( i );

			// Notes (A-G with optional sharp/flat and length and dots)
			if( "ABCDEFG".indexOf( char ) !== -1 ) {
				let note = char;
				let length = null;
				let dots = 0;
				i++;

				// Check for sharp or flat
				if( i < playString.length && "#+- ".indexOf( playString.charAt( i ) ) !== -1 ) {
					if( playString.charAt( i ) !== " " ) {
						note += playString.charAt( i );
					}
					i++;
				}

				// Check for length number
				let lengthStr = "";
				while( i < playString.length && /\d/.test( playString.charAt( i ) ) ) {
					lengthStr += playString.charAt( i );
					i++;
				}
				if( lengthStr ) {
					length = parseFloat( lengthStr );
				}

				// Check for dots (dotted notes)
				while( i < playString.length && playString.charAt( i ) === "." ) {
					dots++;
					i++;
				}

				track.notes.push( {
					"type": "note",
					"note": note,
					"length": length,
					"dots": dots
				} );
				continue;
			}

			// Pause or Note by number
			if( "PN".indexOf( char ) !== -1 ) {
				const cmd = char;
				i++;

				let value = "";
				while( i < playString.length && /\d/.test( playString.charAt( i ) ) ) {
					value += playString.charAt( i );
					i++;
				}

				if( value ) {
					track.notes.push( {
						"type": cmd === "P" ? "pause" : "noteNum",
						"value": parseInt( value )
					} );
				}
				continue;
			}

			// Music commands (M + subcommand)
			if( char === "M" ) {
				i++;

				if( i < playString.length ) {
					const subCmd = playString.charAt( i );

					// ML, MN, MS, MF
					if( "LNSF".indexOf( subCmd ) !== -1 ) {
						i++;

						if( subCmd === "L" || subCmd === "N" || subCmd === "S" ) {

							// Music style
							track.notes.push( {
								"type": "musicStyle",
								"value": subCmd
							} );

						} else if( subCmd === "F" ) {

							// Full note mode
							track.notes.push( {
								"type": "fullNote"
							} );
						}
						continue;
					}

					// MA, MT, MD with number
					if( "ATD".indexOf( subCmd ) !== -1 ) {
						i++;

						let value = "";
						while( i < playString.length && /\d/.test( playString.charAt( i ) ) ) {
							value += playString.charAt( i );
							i++;
						}

						if( value ) {
							const numValue = parseInt( value );
							if( numValue >= 0 && numValue <= 100 ) {

								let noteType;
								if( subCmd === "A" ) {
									noteType = "attackRate";
								} else if( subCmd === "T" ) {
									noteType = "sustainRate";
								} else if( subCmd === "D" ) {
									noteType = "decayRate";
								}

								track.notes.push( {
									"type": noteType,
									"value": numValue / 100
								} );
							}
						}
						continue;
					}
				}

				continue;
			}

			// Octave, Length, Tempo (with numbers)
			if( "OLT".indexOf( char ) !== -1 ) {
				const cmd = char;
				i++;

				let value = "";
				while( i < playString.length && /\d/.test( playString.charAt( i ) ) ) {
					value += playString.charAt( i );
					i++;
				}

				if( value ) {
					const numValue = parseFloat( value );

					if( cmd === "O" && numValue >= 0 && numValue <= 7 ) {
						track.notes.push( {
							"type": "octave",
							"value": parseInt( numValue )
						} );
					} else if( cmd === "L" && numValue > 0 ) {
						track.notes.push( {
							"type": "length",
							"value": numValue
						} );
					} else if( cmd === "T" && numValue >= 32 && numValue <= 255 ) {
						track.notes.push( {
							"type": "tempo",
							"value": parseInt( numValue )
						} );
					}
				}
				continue;
			}

			// Volume
			if( char === "V" ) {
				i++;

				let value = "";
				while( i < playString.length && /\d/.test( playString.charAt( i ) ) ) {
					value += playString.charAt( i );
					i++;
				}

				if( value ) {
					const numValue = parseInt( value );
					if( numValue >= 0 && numValue <= 100 ) {
						track.notes.push( {
							"type": "volume",
							"value": numValue / 100
						} );
					}
				}
				continue;
			}

			// Octave shortcuts
			if( char === "<" ) {
				track.notes.push( { "type": "octaveDown" } );
				i++;
				continue;
			}

			if( char === ">" ) {
				track.notes.push( { "type": "octaveUp" } );
				i++;
				continue;
			}

			// Waveform types
			if( i + 6 <= playString.length && playString.substring( i, i + 6 ) === "SQUARE" ) {
				track.notes.push( {
					"type": "waveform",
					"value": "square"
				} );
				i += 6;
				continue;
			}
			if( i + 4 <= playString.length && playString.substring( i, i + 4 ) === "SINE" ) {
				track.notes.push( {
					"type": "waveform",
					"value": "sine"
				} );
				i += 4;
				continue;
			}
			if( i + 8 <= playString.length && playString.substring( i, i + 8 ) === "TRIANGLE" ) {
				track.notes.push( {
					"type": "waveform",
					"value": "triangle"
				} );
				i += 8;
				continue;
			}
			if( i + 8 <= playString.length && playString.substring( i, i + 8 ) === "SAWTOOTH" ) {
				track.notes.push( {
					"type": "waveform",
					"value": "sawtooth"
				} );
				i += 8;
				continue;
			}

			// Custom wavetables [[n,n],[n,n]]
			if( char === "[" ) {
				let token = "";
				let depth = 0;

				while( i < playString.length ) {
					token += playString.charAt( i );
					if( playString.charAt( i ) === "[" ) {
						depth++;
					} else if( playString.charAt( i ) === "]" ) {
						depth--;
						if( depth === 0 ) {
							i++;
							break;
						}
					}
					i++;
				}

				// Parse wavetable
				try {
					const waveData = JSON.parse( token );
					if( pi.util.isArray( waveData ) && waveData.length === 2 ) {
						track.notes.push( {
							"type": "wavetable",
							"value": waveData
						} );
					}
				} catch( e ) {
					console.warn( `play: Invalid wavetable format: ${token}` );
				}
				continue;
			}

			// Skip spaces and unknown characters
			i++;
		}

		return trackId;
	}

	function playTrack( trackId ) {
		const track = m_tracks[ trackId ];
		if( !track || track.noteId >= track.notes.length ) {
			return;
		}

		let time = 0;

		while( track.noteId < track.notes.length ) {
			const cmd = track.notes[ track.noteId ];

			switch( cmd.type ) {
				case "note":
					const frequency = getNoteFrequency( track, cmd.note );
					if( frequency > 0 ) {
						const duration = getNoteDuration( track, cmd.length, cmd.dots );
						playNote( track, frequency, time );
						time += duration;
					}
					break;

				case "noteNum":

					// Note by number (N0-N84)
					if( cmd.value > 0 && cmd.value < 85 ) {
						const freq = m_allNotes[ cmd.value ];
						const duration = getNoteDuration( track, null, 0 );
						playNote( track, freq, time );
						time += duration;
					}
					break;

				case "pause":

					// Pause (P1-P64)
					const pauseDuration = ( 4 / cmd.value ) * track.tempo;
					time += pauseDuration;
					break;

				case "octave":
					track.octave = cmd.value;
					break;

				case "octaveUp":
					if( track.octave < 7 ) {
						track.octave++;
					}
					break;

				case "octaveDown":
					if( track.octave > 0 ) {
						track.octave--;
					}
					break;

				case "length":
					track.noteLength = 4 / cmd.value;
					break;

				case "tempo":
					track.tempo = 60 / cmd.value;
					break;

				case "volume":
					track.volume = cmd.value;
					break;

				case "attackRate":
					track.attackRate = cmd.value;
					break;

				case "sustainRate":
					track.sustainRate = cmd.value;
					break;

				case "decayRate":
					track.decayRate = cmd.value;
					break;

				case "fullNote":
					track.fullNote = true;
					track.pace = 1;
					break;

				case "waveform":
					track.type = cmd.value;
					break;

				case "wavetable":

					// Custom wavetable [[real],[imag]]
					track.waveTables = [
						new Float32Array( cmd.value[ 0 ] ),
						new Float32Array( cmd.value[ 1 ] )
					];
					track.type = "custom";
					break;

				case "musicStyle":

					// ML = legato (full note), MN = normal, MS = staccato (3/4 note)
					if( cmd.value === "L" ) {
						track.pace = 1;
						track.fullNote = true;
					} else if( cmd.value === "N" ) {
						track.pace = 0.875;
						track.fullNote = false;
					} else if( cmd.value === "S" ) {
						track.pace = 0.75;
						track.fullNote = false;
					}
					break;
			}

			track.noteId++;
		}
	}

	function getNoteFrequency( track, note ) {

		// Handle sharp/flat
		note = note.replace( /\+/g, "#" );
		note = note.replace( "C-", "B" );
		note = note.replace( "D-", "C#" );
		note = note.replace( "E-", "D#" );
		note = note.replace( "F-", "E" );
		note = note.replace( "G-", "F#" );
		note = note.replace( "A-", "G#" );
		note = note.replace( "B-", "A#" );

		const noteData = m_notesData[ note ];
		if( !noteData ) {
			return 0;
		}

		const octave = track.octave;
		if( octave < 0 || octave >= noteData.length ) {
			return 0;
		}

		return noteData[ octave ];
	}

	function getNoteDuration( track, length, dots ) {
		if( length == null ) {
			length = track.noteLength;
		} else {
			length = 4 / length;
		}

		let duration = length * track.tempo * track.pace;

		// Apply dotted note multipliers
		if( dots === 1 ) {

			// Single dot = 1.5x duration
			duration = duration * 1.5;
		} else if( dots === 2 ) {

			// Double dot = 1.75x duration
			duration = duration * 1.75;
		} else if( dots > 2 ) {

			// Multiple dots (each adds half of previous addition)
			let multiplier = 1;
			let addition = 0.5;
			for( let i = 0; i < dots; i++ ) {
				multiplier += addition;
				addition = addition / 2;
			}
			duration = duration * multiplier;
		}

		return duration;
	}

	function playNote( track, frequency, time ) {
		const volume = track.volume;
		const interval = getNoteDuration( track, null, 0 );
		const attackTime = interval * track.attackRate;
		const sustainTime = interval * track.sustainRate;
		const decayTime = interval * track.decayRate;

		let stopTime;
		if( track.fullNote && attackTime + sustainTime + decayTime > interval ) {
			stopTime = interval;
		} else {
			stopTime = attackTime + sustainTime + decayTime;
		}

		const soundData = {
			"frequency": frequency,
			"volume": volume,
			"attackTime": attackTime,
			"sustainTime": sustainTime,
			"decayTime": decayTime,
			"stopTime": stopTime,
			"oType": track.type,
			"waveTables": track.waveTables,
			"time": time,
			"track": track
		};

		m_playData.push( soundData );
	}

	// All note frequencies (N0-N84)
	const m_allNotes = [
		0, 16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50,
		29.14, 30.87, 32.70, 34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00,
		51.91, 55.00, 58.27, 61.74,
		65.406, 69.296, 73.416, 77.782, 82.407, 87.307, 92.499, 97.999,
		103.826, 110, 116.541, 123.471, 130.813, 138.591, 146.832, 155.563,
		164.814, 174.614, 184.997, 195.998, 207.652, 220, 233.082, 246.942,
		261.626, 277.183, 293.665, 311.127, 329.628, 349.228, 369.994, 391.995,
		415.305, 440, 466.164, 493.883, 523.251, 554.365, 587.33, 622.254,
		659.255, 698.456, 739.989, 783.991, 830.609, 880, 932.328, 987.767,
		1046.502, 1108.731, 1174.659, 1244.508, 1318.51, 1396.913, 1479.978,
		1567.982, 1661.219, 1760, 1864.655, 1975.533, 2093.005, 2217.461,
		2349.318, 2489.016, 2637.021, 2793.826, 2959.955, 3135.964, 3322.438,
		3520, 3729.31, 3951.066, 4186.009, 4434.922, 4698.636, 4978.032,
		5274.042, 5587.652, 5919.91, 6271.928, 6644.876, 7040, 7458.62,
		7902.132, 8372.018, 8869.844, 9397.272, 9956.064, 10548.084, 11175.304,
		11839.82, 13289.752, 14080, 14917.24, 15804.264
	];

	// STOPPLAY - Stop playing music
	pi._.addCommand( "stopPlay", stopPlay, false, false, [ "trackId" ] );

	function stopPlay( args ) {
		const trackId = args[ 0 ];

		// Stop all tracks
		if( trackId === null || trackId === undefined ) {
			for( let i = 0; i < m_allTracks.length; i++ ) {
				const track = m_tracks[ m_allTracks[ i ].id ];
				if( track ) {
					for( let j = 0; j < track.sounds.length; j++ ) {
						const sound = track.sounds[ j ];
						piData.commands.stopSound( [ sound ] );
					}
					delete m_tracks[ m_allTracks[ i ].id ];
				}
			}
			m_allTracks = [];
			return;
		}

		// Stop specific track
		if( m_tracks[ trackId ] ) {
			const track = m_tracks[ trackId ];
			for( let j = 0; j < track.sounds.length; j++ ) {
				const sound = track.sounds[ j ];
				piData.commands.stopSound( [ sound ] );
			}
			removeTrack( trackId );
		}
	}

	function removeTrack( trackId ) {
		for( let i = 0; i < m_allTracks.length; i++ ) {
			if( m_allTracks[ i ].id === trackId ) {
				m_allTracks.splice( i, 1 );
				break;
			}
		}
		delete m_tracks[ trackId ];
	}
}

