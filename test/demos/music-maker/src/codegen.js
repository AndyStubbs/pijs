// Turns a song into Pi.js code (defineInstrument, setBusEffect and play() strings) and
// back again. The same plan and play strings drive in-app playback, so what you hear is
// exactly what the exported code plays.

import { STEPS_PER_BAR, NOTE_NAMES, LENGTH_TOKENS, SCALES, snapLength, nearestLength } from "./music.js";
import { toSynth, fromSynth, STYLE_MML, DRUM_NAMES, DRUM_COUNT, getPreset, getKit } from "./instruments.js";
import { normalizeSong, totalSteps, VELOCITIES, MAX_TRACKS, MAX_BARS } from "./song.js";

// ---------------------------------------------------------------------------------------------
// Plan: instrument numbers and monophonic lanes (one play() string each)

// Splits notes into voices that never overlap, so each voice can be one PLAY string.
export function splitVoices( notes ) {
	const sorted = notes.slice().sort( ( a, b ) => a.s - b.s || b.p - a.p );
	const voices = [];
	for( const n of sorted ) {
		let voice = voices.find( v => v.end <= n.s );
		if( !voice ) {
			voice = { "end": 0, "notes": [] };
			voices.push( voice );
		}
		voice.notes.push( n );
		voice.end = n.s + n.l;
	}
	return voices.map( v => v.notes );
}

export function trackLabel( track ) {
	if( track.type === "drums" ) {
		return getKit( track.preset ).name;
	}
	return getPreset( track.preset ).name;
}

export function buildPlan( song ) {
	const instruments = [];
	const lanes = [];
	const anySolo = song.tracks.some( t => t.solo );
	let n = 1;
	song.tracks.forEach( ( t, ti ) => {
		const audible = !t.mute && ( !anySolo || t.solo );
		const common = { "track": ti, "vol": t.vol, "pan": t.pan, audible };
		if( t.type === "drums" ) {
			const base = n;
			t.drums.forEach( ( params, di ) => {
				instruments.push( { "n": n++, params, "track": ti, "drum": di, "label": `${t.name} ${DRUM_NAMES[ di ]}` } );
			} );
			for( let di = 0; di < DRUM_COUNT; di++ ) {
				const byStep = new Map();
				for( const note of t.notes ) {
					if( note.p === di ) {
						const prev = byStep.get( note.s );
						if( !prev || prev.v < note.v ) {
							byStep.set( note.s, note );
						}
					}
				}
				const notes = [ ...byStep.values() ].sort( ( a, b ) => a.s - b.s );
				if( notes.length ) {
					lanes.push( {
						...common, "drum": di, "inst": base + di, notes,
						"ring": t.drums[ di ].ring, "style": t.drums[ di ].style
					} );
				}
			}
		} else {
			const inst = n++;
			instruments.push( { "n": inst, "params": t.inst, "track": ti, "drum": null, "label": `${t.name} (${trackLabel( t )})` } );
			for( const notes of splitVoices( t.notes ) ) {
				lanes.push( { ...common, "drum": null, inst, notes, "ring": 0, "style": t.inst.style } );
			}
		}
	} );
	return { instruments, lanes, "fx": fxChain( song ), "tempo": song.tempo, "total": totalSteps( song ) };
}

// Song effect amounts -> a setBusEffect() chain for the music bus (or null).
export function fxChain( song ) {
	const fx = song.fx;
	const chain = [];
	const r = n => Math.round( n * 1000 ) / 1000;
	if( fx.crush > 0 ) {
		chain.push( { "effect": "bitcrush", "bits": Math.round( 12 - fx.crush * 8 ), "rate": 1 + Math.round( fx.crush * 5 ), "mix": r( 0.3 + fx.crush * 0.7 ) } );
	}
	if( fx.chorus > 0 ) {
		chain.push( { "effect": "chorus", "rate": 1.2, "depth": 3, "mix": r( fx.chorus * 0.7 ) } );
	}
	if( fx.echo > 0 ) {
		const dottedEighth = Math.min( 2, 60 / song.tempo * 0.75 );
		chain.push( { "effect": "delay", "time": r( dottedEighth ), "feedback": r( 0.2 + fx.echo * 0.4 ), "mix": r( fx.echo * 0.5 ) } );
	}
	if( fx.reverb > 0 ) {
		chain.push( { "effect": "reverb", "time": 2.5, "decay": 3, "mix": r( fx.reverb * 0.6 ) } );
	}
	return chain.length ? chain : null;
}

// ---------------------------------------------------------------------------------------------
// PLAY strings

// The notes of a lane with the lengths they really sound for, cut so they never overlap.
function laneEvents( lane, total ) {
	const out = [];
	const ns = lane.notes;
	for( let i = 0; i < ns.length; i++ ) {
		const n = ns[ i ];
		const next = i + 1 < ns.length ? ns[ i + 1 ].s : total;
		let len = lane.drum !== null ? Math.min( lane.ring, next - n.s ) : Math.min( n.l, next - n.s );
		len = Math.min( len, total - n.s );
		if( len > 0 ) {
			out.push( { "s": n.s, "l": snapLength( len ), "p": lane.drum !== null ? 60 : n.p, "v": n.v } );
		}
	}
	return out;
}

// Most common plain (undotted) length, used as the lane's L default.
function defaultLength( events ) {
	const counts = new Map();
	for( const e of events ) {
		if( [ 1, 2, 4, 8, 16 ].includes( e.l ) ) {
			counts.set( e.l, ( counts.get( e.l ) || 0 ) + 1 );
		}
	}
	let best = 4;
	let bestCount = 0;
	for( const [ len, count ] of counts ) {
		if( count > bestCount ) {
			best = len;
			bestCount = count;
		}
	}
	return best;
}

class Writer {
	constructor( vol, defLen ) {
		this.vol = vol;
		this.defLen = defLen;
		this.oct = null;
		this.vel = 1;
	}

	note( e ) {
		let t = "";
		if( e.v !== this.vel ) {
			t += `V${Math.round( this.vol * e.v )} `;
			this.vel = e.v;
		}
		const oct = Math.floor( e.p / 12 ) - 1;
		if( oct !== this.oct ) {
			t += `O${oct} `;
			this.oct = oct;
		}
		return t + NOTE_NAMES[ e.p % 12 ] + ( e.l === this.defLen ? "" : LENGTH_TOKENS[ e.l ] );
	}
}

// Tokens for events in [from, to), grouped by bar.
function writeRange( events, from, to, writer ) {
	const bars = [];
	const push = ( step, tok ) => {
		const b = Math.floor( step / STEPS_PER_BAR ) - Math.floor( from / STEPS_PER_BAR );
		( bars[ b ] = bars[ b ] || [] ).push( tok );
	};
	let cursor = from;
	const restTo = target => {
		while( cursor < target ) {
			const barEnd = ( Math.floor( cursor / STEPS_PER_BAR ) + 1 ) * STEPS_PER_BAR;
			let len = Math.min( target, barEnd ) - cursor;
			for( const l of [ 16, 8, 4, 2, 1 ] ) {
				while( len >= l ) {
					push( cursor, `P${16 / l}` );
					cursor += l;
					len -= l;
				}
			}
		}
	};
	for( const e of events ) {
		if( e.s < from ) {
			continue;
		}
		restTo( e.s );
		push( e.s, writer.note( e ) );
		cursor = e.s + e.l;
	}
	restTo( to );
	const out = [];
	for( let i = 0; i < bars.length; i++ ) {
		out.push( ( bars[ i ] || [] ).join( " " ) );
	}
	return out;
}

function laneParts( plan, lane, from = 0, repeats = 0 ) {
	const events = laneEvents( lane, plan.total );
	const defLen = defaultLength( events );
	const header = `T${plan.tempo} @${lane.inst} V${lane.vol} MP${lane.pan} ${STYLE_MML[ lane.style ] || "MN"} MR0 L${16 / defLen}`;
	const writer = new Writer( lane.vol, defLen );
	let bars = writeRange( events, from, plan.total, writer );
	for( let r = 0; r < repeats; r++ ) {
		bars = bars.concat( writeRange( events, 0, plan.total, writer ) );
	}
	return { header, bars, events };
}

// The PLAY string for a lane, starting at step `from` and followed by `repeats` full loops.
export function laneString( plan, lane, from = 0, repeats = 0 ) {
	const parts = laneParts( plan, lane, from, repeats );
	return [ parts.header ].concat( parts.bars ).filter( s => s ).join( " " );
}

// Stream positions (steps since the string starts) of a lane's notes, in play order,
// for the string laneString() returns with the same from and repeats.
export function laneOnsets( plan, lane, from = 0, repeats = 0 ) {
	const events = laneEvents( lane, plan.total );
	const out = events.filter( e => e.s >= from ).map( e => e.s - from );
	for( let r = 0; r < repeats; r++ ) {
		const offset = plan.total - from + r * plan.total;
		for( const e of events ) {
			out.push( offset + e.s );
		}
	}
	return out;
}

// ---------------------------------------------------------------------------------------------
// Code export

function fmtValue( v ) {
	if( Array.isArray( v ) ) {
		return v.length ? `[ ${v.map( fmtValue ).join( ", " )} ]` : "[]";
	}
	if( v && typeof v === "object" ) {
		const entries = Object.entries( v ).map( ( [ k, x ] ) => `"${k}": ${fmtValue( x )}` );
		return entries.length ? `{ ${entries.join( ", " )} }` : "{}";
	}
	return JSON.stringify( v );
}

export const DATA_TAG = "@pixeltracks";

export function songToCode( song ) {
	const plan = buildPlan( song );
	const lanes = plan.lanes.filter( l => l.audible );
	const used = new Set( lanes.map( l => l.inst ) );
	const scaleName = ( SCALES[ song.scale ] || SCALES.major ).name.toLowerCase();
	const L = [];
	L.push( `// ${song.title}` );
	L.push( `// Made with Pi.js Tracks, a retro music maker.` );
	L.push( `// Key: ${NOTE_NAMES[ song.key ]} ${scaleName} | Tempo: ${song.tempo} BPM | ${song.bars} bars` );
	L.push( "//" );
	L.push( "// Needs Pi.js and the sound-advanced plugin:" );
	L.push( "//   <script src=\"pi.js\"></script>" );
	L.push( "//   <script src=\"plugins/sound-advanced/sound-advanced.js\"></script>" );
	L.push( "// Browsers only play sound after a click or key press, so start the" );
	L.push( "// song from an input handler, for example:" );
	L.push( "//   $.onKey( \"any\", \"down\", playSong, true );" );
	L.push( "" );
	L.push( "function playSong() {" );
	L.push( "\t// Instruments: synth settings that @n selects in the play strings" );
	for( const inst of plan.instruments ) {
		if( used.has( inst.n ) ) {
			L.push( `\t$.defineInstrument( ${inst.n}, ${fmtValue( toSynth( inst.params ) )} ); // ${inst.label}` );
		}
	}
	L.push( "" );
	L.push( "\t// Effects on the music bus" );
	L.push( `\t$.setBusEffect( "music", ${plan.fx ? fmtValue( plan.fx ) : "null"} );` );
	L.push( "" );
	L.push( "\t// One play() per voice; they all start together. Each string holds the" );
	L.push( "\t// whole song for that voice, two bars per line." );
	L.push( "\treturn [" );
	let lastTrack = -1;
	let voice = 0;
	for( const lane of lanes ) {
		const track = song.tracks[ lane.track ];
		if( lane.track !== lastTrack ) {
			voice = 0;
			lastTrack = lane.track;
			L.push( `\t\t// ${track.name} - ${trackLabel( track )}` );
		}
		voice += 1;
		const parts = laneParts( plan, lane );
		const label = lane.drum !== null ? DRUM_NAMES[ lane.drum ] : `voice ${voice}`;
		const lines = [ parts.header ];
		for( let i = 0; i < parts.bars.length; i += 2 ) {
			lines.push( parts.bars.slice( i, i + 2 ).filter( s => s ).join( " " ) );
		}
		const body = lines.filter( s => s );
		L.push( `\t\t$.play( // ${label}` );
		body.forEach( ( line, i ) => {
			const last = i === body.length - 1;
			L.push( `\t\t\t"${line}${last ? "" : " "}"${last ? "" : " +"}` );
		} );
		L.push( "\t\t)," );
	}
	L.push( "\t];" );
	L.push( "}" );
	L.push( "" );
	L.push( "// Stops a song started with playSong()" );
	L.push( "function stopSong( trackIds ) {" );
	L.push( "\tfor( const id of trackIds ) {" );
	L.push( "\t\t$.stopPlay( id );" );
	L.push( "\t}" );
	L.push( "}" );
	L.push( "" );
	const data = {
		"song": compactSong( song ),
		"lanes": lanes.map( l => [ l.track, l.drum === null ? -1 : l.drum ] )
	};
	L.push( "// Pi.js Tracks project data, so the song can be loaded back into the editor." );
	L.push( `/* ${DATA_TAG} ${JSON.stringify( data )} */` );
	L.push( "" );
	return L.join( "\n" );
}

function compactSong( song ) {
	const copy = JSON.parse( JSON.stringify( song ) );
	for( const t of copy.tracks ) {
		t.notes = t.notes.map( n => [ n.s, n.p, n.l, n.v ] );
	}
	return copy;
}

// ---------------------------------------------------------------------------------------------
// Code import

function skipSpace( code, i ) {
	for( ;; ) {
		while( i < code.length && /\s/.test( code[ i ] ) ) {
			i++;
		}
		if( code.startsWith( "//", i ) ) {
			const end = code.indexOf( "\n", i );
			i = end === -1 ? code.length : end + 1;
		} else if( code.startsWith( "/*", i ) ) {
			const end = code.indexOf( "*/", i + 2 );
			i = end === -1 ? code.length : end + 2;
		} else {
			return i;
		}
	}
}

function readLiteral( code, i ) {
	const quote = code[ i ];
	let out = "";
	i++;
	while( i < code.length && code[ i ] !== quote ) {
		if( code[ i ] === "\\" ) {
			i++;
			const c = code[ i ];
			out += c === "n" ? "\n" : c === "t" ? "\t" : c;
		} else {
			out += code[ i ];
		}
		i++;
	}
	return { "text": out, "index": i + 1 };
}

// Every play() argument made of string literals joined with +.
export function extractPlayStrings( code ) {
	const out = [];
	const re = /\bplay\s*\(/g;
	let m;
	while( ( m = re.exec( code ) ) ) {
		let i = re.lastIndex;
		let str = "";
		let found = false;
		for( ;; ) {
			i = skipSpace( code, i );
			const c = code[ i ];
			if( c === "\"" || c === "'" || c === "`" ) {
				const lit = readLiteral( code, i );
				str += lit.text;
				found = true;
				i = skipSpace( code, lit.index );
				if( code[ i ] === "+" ) {
					i++;
					continue;
				}
			}
			break;
		}
		if( found ) {
			out.push( str );
		}
	}
	return out;
}

export function extractInstruments( code ) {
	const out = {};
	const re = /defineInstrument\s*\(\s*(\d+)\s*,\s*(\{[^;]*?\})\s*\)/g;
	let m;
	while( ( m = re.exec( code ) ) ) {
		try {
			out[ Number( m[ 1 ] ) ] = JSON.parse( m[ 2 ] );
		} catch( e ) {
			// Not plain JSON; that instrument keeps the default sound
		}
	}
	return out;
}

const SEMITONES = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
const WORD_WAVES = {
	"SINE": "sine", "SQUARE": "square", "SAWTOOTH": "sawtooth", "TRIANGLE": "triangle",
	"NOISE": "noise", "PINK": "pink"
};
const W_WAVES = { "S": "sine", "Q": "square", "W": "sawtooth", "T": "triangle", "N": "noise", "P": "pink" };

// Parses a PLAY string into tracks of notes. Times are in sixteenth-note steps.
export function parseMML( text ) {
	const s = text.toUpperCase();
	const tracks = [];
	const newTrack = ( state, start ) => {
		const t = { "notes": [], "state": { ...state }, "time": start, "last": start, "firstV": null };
		tracks.push( t );
		return t;
	};
	let cur = newTrack( {
		"oct": 4, "octOff": 0, "len": 4, "vol": 100, "pan": 0, "inst": 0, "tempo": 120,
		"style": "normal", "wave": "triangle"
	}, 0 );
	const readInt = () => {
		const m = /^-?\d+/.exec( s.slice( i ) );
		if( !m ) {
			return null;
		}
		i += m[ 0 ].length;
		return parseInt( m[ 0 ], 10 );
	};
	const readDots = () => {
		let d = 0;
		while( s[ i ] === "." && d < 2 ) {
			d++;
			i++;
		}
		return [ 1, 1.5, 1.75 ][ d ];
	};
	const steps = len => 16 / ( len >= 1 && len <= 64 ? len : 4 );
	let i = 0;
	while( i < s.length ) {
		const st = cur.state;
		const c = s[ i ];
		const word = Object.keys( WORD_WAVES ).find( w => s.startsWith( w, i ) );
		if( word ) {
			st.wave = WORD_WAVES[ word ];
			i += word.length;
			continue;
		}
		if( c >= "A" && c <= "G" ) {
			i++;
			let semi = SEMITONES[ c ];
			if( s[ i ] === "#" || s[ i ] === "+" ) {
				semi++;
				i++;
			} else if( s[ i ] === "-" ) {
				semi--;
				i++;
			}
			const len = readInt();
			const dur = steps( len === null ? st.len : len ) * readDots();
			const pitch = ( st.oct + st.octOff + 1 ) * 12 + semi;
			cur.notes.push( { "t": cur.time, dur, pitch, "vol": st.vol } );
			cur.last = cur.time;
			cur.time += dur;
			continue;
		}
		i++;
		switch( c ) {
			case "N": {
				const n = readInt();
				const dur = steps( st.len ) * readDots();
				if( n !== null && n > 0 ) {
					cur.notes.push( { "t": cur.time, dur, "pitch": n + 11, "vol": st.vol } );
				}
				cur.last = cur.time;
				cur.time += dur;
				break;
			}
			case "O": {
				const n = readInt();
				if( n !== null ) {
					st.oct = Math.max( 0, Math.min( 9, n ) );
				}
				break;
			}
			case "<":
				st.oct = Math.max( 0, st.oct - 1 );
				break;
			case ">":
				st.oct = Math.min( 9, st.oct + 1 );
				break;
			case "L": {
				const n = readInt();
				if( n !== null ) {
					st.len = n;
				}
				break;
			}
			case "T": {
				const n = readInt();
				if( n !== null && n >= 32 && n <= 255 ) {
					st.tempo = n;
				}
				break;
			}
			case "P": {
				const n = readInt();
				cur.last = cur.time;
				cur.time += steps( n === null ? st.len : n );
				break;
			}
			case "V": {
				const n = readInt();
				if( n !== null ) {
					st.vol = Math.max( 0, Math.min( 100, n ) );
					if( cur.firstV === null ) {
						cur.firstV = st.vol;
					}
				}
				break;
			}
			case "@": {
				const n = readInt();
				if( n !== null ) {
					st.inst = n;
				}
				break;
			}
			case "W": {
				const w = s[ i ];
				if( W_WAVES[ w ] ) {
					st.wave = W_WAVES[ w ];
					i++;
				}
				break;
			}
			case "M": {
				const m = s[ i ];
				i++;
				if( m === "P" ) {
					const n = readInt();
					if( n !== null ) {
						st.pan = Math.max( -100, Math.min( 100, n ) );
					}
				} else if( m === "S" || m === "N" || m === "L" ) {
					st.style = { "S": "staccato", "N": "normal", "L": "legato" }[ m ];
				} else if( m === "O" ) {
					const n = readInt();
					if( n !== null ) {
						st.octOff = n;
					}
				} else {
					readInt();
				}
				break;
			}
			case "[": {
				let depth = 1;
				while( i < s.length && depth > 0 ) {
					if( s[ i ] === "[" ) {
						depth++;
					} else if( s[ i ] === "]" ) {
						depth--;
					}
					i++;
				}
				break;
			}
			case ",":
				cur = newTrack( st, cur.last );
				break;
			default:
				break;
		}
	}
	return tracks.map( t => ( {
		"notes": t.notes,
		"tempo": t.state.tempo,
		"inst": t.state.inst,
		"vol": t.firstV === null ? 100 : t.firstV,
		"pan": t.state.pan,
		"style": t.state.style,
		"wave": t.state.wave
	} ) );
}

function nearestVel( v ) {
	return VELOCITIES.reduce( ( best, x ) => Math.abs( x - v ) < Math.abs( best - v ) ? x : best, 1 );
}

function toSteps( parsedNote, trackVol ) {
	return {
		"s": Math.round( parsedNote.t ),
		"p": parsedNote.pitch,
		"l": nearestLength( Math.max( 1, Math.round( parsedNote.dur ) ) ),
		"v": nearestVel( trackVol > 0 ? parsedNote.vol / trackVol : 1 )
	};
}

// The major key that fits the most notes; chromatic unless every note fits it.
export function detectKey( pitches ) {
	if( !pitches.length ) {
		return { "key": 0, "scale": "chromatic" };
	}
	const major = SCALES.major.steps;
	let best = { "key": 0, "fit": -1 };
	for( let key = 0; key < 12; key++ ) {
		let fit = 0;
		for( const p of pitches ) {
			if( major.includes( ( ( p - key ) % 12 + 12 ) % 12 ) ) {
				fit++;
			}
		}
		// Ties go to the key whose home note is used most, and starts the tune
		const tonics = pitches.filter( p => p % 12 === key ).length;
		const home = Math.min( 0.9, tonics / pitches.length * 0.6 + ( pitches[ 0 ] % 12 === key ? 0.3 : 0 ) );
		if( fit + home > best.fit ) {
			best = { key, "fit": fit + home };
		}
	}
	const all = Math.floor( best.fit ) === pitches.length;
	return { "key": best.key, "scale": all ? "major" : "chromatic" };
}

const normalizeMML = str => str.replace( /\s+/g, "" ).toUpperCase();

// Code -> { song, source } where source says how the song was read:
// "data" (project data), "edited" (project data plus hand-edited play strings) or "play"
// (plain Pi.js code with play() calls).
export function codeToSong( code ) {
	const plays = extractPlayStrings( code );
	const meta = new RegExp( "/\\*\\s*" + DATA_TAG + "\\s+([\\s\\S]*?)\\s*\\*/" ).exec( code );
	if( meta ) {
		const data = JSON.parse( meta[ 1 ] );
		const song = normalizeSong( data.song || data );
		const plan = buildPlan( song );
		const expected = plan.lanes.filter( l => l.audible ).map( l => normalizeMML( laneString( plan, l ) ) );
		const same = expected.length === plays.length && plays.every( ( p, i ) => normalizeMML( p ) === expected[ i ] );
		const laneMap = Array.isArray( data.lanes ) ? data.lanes : [];
		if( same || plays.length === 0 || laneMap.length !== plays.length ) {
			return { song, "source": "data" };
		}
		// The play strings were edited by hand: rebuild those tracks' notes from them.
		const touched = new Set( laneMap.map( l => l[ 0 ] ) );
		for( const ti of touched ) {
			if( song.tracks[ ti ] ) {
				song.tracks[ ti ].notes = [];
			}
		}
		plays.forEach( ( str, i ) => {
			const [ ti, di ] = laneMap[ i ];
			const track = song.tracks[ ti ];
			if( !track ) {
				return;
			}
			for( const part of parseMML( str ) ) {
				song.tempo = part.tempo;
				track.vol = part.vol;
				for( const n of part.notes ) {
					const note = toSteps( n, part.vol );
					if( di >= 0 ) {
						note.p = di;
						note.l = 1;
					}
					track.notes.push( note );
				}
			}
		} );
		return { "song": normalizeSong( song ), "source": "edited" };
	}
	if( !plays.length ) {
		throw new Error( "No play() calls found" );
	}
	// Plain Pi.js code: every play() string (and every comma track) becomes a track.
	const insts = extractInstruments( code );
	const parts = plays.flatMap( parseMML ).filter( p => p.notes.length ).slice( 0, MAX_TRACKS );
	let end = 0;
	const tracks = parts.map( ( part, i ) => {
		const notes = part.notes.map( n => toSteps( n, part.vol ) );
		for( const n of notes ) {
			end = Math.max( end, n.s + 1 );
		}
		const inst = insts[ part.inst ] ? fromSynth( insts[ part.inst ] ) : { ...getPreset( "chiplead" ).params, "wave": part.wave, "volume": 0.6 };
		inst.style = part.style;
		const top = notes.reduce( ( m, n ) => Math.max( m, n.p ), 60 );
		return {
			"name": `TRACK ${i + 1}`, "type": "melody", "preset": "chiplead", inst,
			"vol": part.vol, "pan": part.pan, "view": Math.min( 127, top + 2 ), notes
		};
	} );
	const bars = Math.max( 1, Math.min( MAX_BARS, Math.ceil( end / STEPS_PER_BAR ) ) );
	const { key, scale } = detectKey( tracks.flatMap( t => t.notes.map( n => n.p ) ) );
	const song = normalizeSong( {
		"title": "IMPORTED SONG", "tempo": parts.length ? parts[ 0 ].tempo : 120, key,
		scale, bars, "prog": 10, tracks, "fx": { "reverb": 0.15 }
	} );
	return { song, "source": "play" };
}

