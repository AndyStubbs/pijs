// Song model, validation, editing helpers, pattern generators and demo songs.
//
// A song is plain JSON:
// {
//   version, title, tempo, key (0-11), scale, bars, prog, chords: [ degree per bar ],
//   fx: { reverb, echo, chorus, crush } (0-1 each),
//   tracks: [ { name, type: "melody" | "drums", preset, inst | drums, vol, pan, mute, solo,
//               view, notes: [ { s: step, p: pitch or drum row, l: length in steps, v: velocity } ] } ]
// }

import {
	STEPS_PER_BAR, SCALES, LENGTHS, PROGRESSIONS, MIN_PITCH, MAX_PITCH,
	snapLength, chordOffsets, voiceChord, scaleSteps, snapToScale, scaleStep,
	inScale, makeRng, clampPitch
} from "./music.js";
import {
	DEFAULT_PARAMS, WAVES, FILTERS, ARP_IDS, STYLES, DRUM_COUNT, getPreset, getKit
} from "./instruments.js";

export const MAX_TRACKS = 8;
export const MAX_BARS = 32;
export const VELOCITIES = [ 1, 0.6, 0.3 ];

export function cloneSong( song ) {
	return JSON.parse( JSON.stringify( song ) );
}

export function totalSteps( song ) {
	return song.bars * STEPS_PER_BAR;
}

// ---------------------------------------------------------------------------------------------
// Construction

export function melodyTrack( name, presetId, extra = {} ) {
	const preset = getPreset( presetId );
	return {
		name,
		"type": "melody",
		"preset": preset.id,
		"inst": { ...preset.params },
		"vol": 80,
		"pan": 0,
		"mute": false,
		"solo": false,
		"view": preset.cat === "BASS" ? 60 : 84,
		"notes": [],
		...extra
	};
}

export function drumTrack( name, kitId, extra = {} ) {
	const kit = getKit( kitId );
	return {
		name,
		"type": "drums",
		"preset": kit.id,
		"drums": kit.drums.map( d => ( { ...d } ) ),
		"vol": 80,
		"pan": 0,
		"mute": false,
		"solo": false,
		"view": 0,
		"notes": [],
		...extra
	};
}

function baseSong( opts ) {
	const song = {
		"version": 1,
		"title": "NEW SONG",
		"tempo": 120,
		"key": 0,
		"scale": "major",
		"bars": 4,
		"prog": 0,
		"chords": [],
		"fx": { "reverb": 0.2, "echo": 0, "chorus": 0, "crush": 0 },
		"tracks": [],
		...opts
	};
	song.chords = progressionChords( song.prog, song.bars );
	return song;
}

export function progressionChords( progIndex, bars ) {
	const prog = PROGRESSIONS[ progIndex ] || PROGRESSIONS[ 0 ];
	const out = [];
	for( let b = 0; b < bars; b++ ) {
		out.push( prog[ b % prog.length ] );
	}
	return out;
}

// ---------------------------------------------------------------------------------------------
// Validation (for loading saved or imported songs)

function num( v, def, lo, hi ) {
	const n = typeof v === "number" && isFinite( v ) ? v : def;
	return Math.max( lo, Math.min( hi, n ) );
}

function int( v, def, lo, hi ) {
	return Math.round( num( v, def, lo, hi ) );
}

function nearestOf( list, v, def ) {
	if( typeof v !== "number" || !isFinite( v ) ) {
		return def;
	}
	return list.reduce( ( best, x ) => Math.abs( x - v ) < Math.abs( best - v ) ? x : best, list[ 0 ] );
}

export function normalizeParams( p ) {
	const src = p && typeof p === "object" ? p : {};
	const d = DEFAULT_PARAMS;
	return {
		"wave": WAVES.includes( src.wave ) ? src.wave : d.wave,
		"volume": num( src.volume, d.volume, 0, 1 ),
		"attack": num( src.attack, d.attack, 0, 4 ),
		"decay": num( src.decay, d.decay, 0, 4 ),
		"sustain": num( src.sustain, d.sustain, 0, 1 ),
		"release": num( src.release, d.release, 0, 4 ),
		"filter": FILTERS.includes( src.filter ) ? src.filter : d.filter,
		"cutoff": num( src.cutoff, d.cutoff, 20, 20000 ),
		"resonance": num( src.resonance, d.resonance, 0.1, 30 ),
		"envAmount": num( src.envAmount, d.envAmount, -6, 6 ),
		"envDecay": num( src.envDecay, d.envDecay, 0, 4 ),
		"vibrato": num( src.vibrato, d.vibrato, 0, 100 ),
		"vibratoRate": num( src.vibratoRate, d.vibratoRate, 0.1, 20 ),
		"tremolo": num( src.tremolo, d.tremolo, 0, 1 ),
		"tremoloRate": num( src.tremoloRate, d.tremoloRate, 0.1, 60 ),
		"vibratoRandom": src.vibratoRandom === true,
		"tremoloRandom": src.tremoloRandom === true,
		"arp": ARP_IDS.includes( src.arp ) ? src.arp : d.arp,
		"arpRate": num( src.arpRate, d.arpRate, 1, 60 ),
		"pitch": num( src.pitch, d.pitch, 0, 8000 ),
		"pitchEnd": num( src.pitchEnd, d.pitchEnd, 0, 8000 ),
		"ring": int( src.ring, d.ring, 1, 8 ),
		"style": STYLES.includes( src.style ) ? src.style : d.style
	};
}

export function normalizeSong( data ) {
	if( !data || typeof data !== "object" ) {
		throw new Error( "Not a song" );
	}
	const song = baseSong( {} );
	song.title = String( data.title || "UNTITLED" ).toUpperCase().slice( 0, 24 );
	song.tempo = int( data.tempo, 120, 32, 255 );
	song.key = int( data.key, 0, 0, 11 );
	song.scale = SCALES[ data.scale ] ? data.scale : "major";
	song.bars = int( data.bars, 4, 1, MAX_BARS );
	song.prog = int( data.prog, 0, 0, PROGRESSIONS.length - 1 );
	const chords = Array.isArray( data.chords ) ? data.chords : [];
	song.chords = progressionChords( song.prog, song.bars ).map(
		( def, b ) => int( chords[ b ], def, 0, 6 )
	);
	const fx = data.fx || {};
	song.fx = {
		"reverb": num( fx.reverb, 0.2, 0, 1 ),
		"echo": num( fx.echo, 0, 0, 1 ),
		"chorus": num( fx.chorus, 0, 0, 1 ),
		"crush": num( fx.crush, 0, 0, 1 )
	};
	const total = totalSteps( song );
	const tracks = Array.isArray( data.tracks ) ?
		data.tracks.filter( t => t && typeof t === "object" ).slice( 0, MAX_TRACKS ) : [];
	song.tracks = tracks.map( t => {
		const isDrums = t && t.type === "drums";
		const track = isDrums ? drumTrack( "DRUMS", t.preset ) : melodyTrack( "TRACK", t && t.preset );
		track.name = String( t.name || track.name ).toUpperCase().slice( 0, 10 );
		if( isDrums ) {
			const drums = Array.isArray( t.drums ) ? t.drums : [];
			track.drums = track.drums.map( ( d, i ) => normalizeParams( drums[ i ] || d ) );
		} else {
			track.inst = normalizeParams( t.inst || track.inst );
		}
		track.vol = int( t.vol, 80, 0, 100 );
		track.pan = int( t.pan, 0, -100, 100 );
		track.mute = t.mute === true;
		track.solo = t.solo === true;
		track.view = int( t.view, track.view, 0, 127 );
		const notes = Array.isArray( t.notes ) ? t.notes : [];
		track.notes = notes.map( n => {
			const note = Array.isArray( n ) ? { "s": n[ 0 ], "p": n[ 1 ], "l": n[ 2 ], "v": n[ 3 ] } : n || {};
			return {
				"s": int( note.s, -1, -1, total ),
				"p": isDrums ? int( note.p, -1, -1, DRUM_COUNT ) : int( note.p, 60, MIN_PITCH, MAX_PITCH ),
				"l": nearestOf( LENGTHS, note.l, 1 ),
				"v": nearestOf( VELOCITIES, note.v, 1 )
			};
		} ).filter( n => n.s >= 0 && n.s < total && n.p >= 0 && n.p < ( isDrums ? DRUM_COUNT : 128 ) );
		return track;
	} );
	return song;
}

// ---------------------------------------------------------------------------------------------
// Song-wide edits

export function setBars( song, bars ) {
	bars = Math.max( 1, Math.min( MAX_BARS, bars ) );
	const prog = PROGRESSIONS[ song.prog ] || PROGRESSIONS[ 0 ];
	while( song.chords.length < bars ) {
		song.chords.push( prog[ song.chords.length % prog.length ] );
	}
	song.chords.length = bars;
	song.bars = bars;
	const total = totalSteps( song );
	for( const t of song.tracks ) {
		t.notes = t.notes.filter( n => n.s < total );
	}
}

// Copies every bar so the song doubles in length.
export function doubleSong( song ) {
	const oldBars = song.bars;
	if( oldBars * 2 > MAX_BARS ) {
		return false;
	}
	const offset = totalSteps( song );
	song.bars = oldBars * 2;
	song.chords = song.chords.concat( song.chords );
	for( const t of song.tracks ) {
		t.notes = t.notes.concat( t.notes.map( n => ( { ...n, "s": n.s + offset } ) ) );
	}
	return true;
}

export function setProgression( song, progIndex ) {
	song.prog = ( progIndex + PROGRESSIONS.length ) % PROGRESSIONS.length;
	song.chords = progressionChords( song.prog, song.bars );
}

// Changing key moves every melody note by the smallest interval to the new key.
export function setKey( song, key ) {
	key = ( key % 12 + 12 ) % 12;
	const delta = ( ( key - song.key ) % 12 + 18 ) % 12 - 6;
	song.key = key;
	for( const t of song.tracks ) {
		if( t.type === "melody" ) {
			for( const n of t.notes ) {
				n.p = clampPitch( n.p + delta );
			}
			t.view = Math.max( 0, Math.min( 127, t.view + delta ) );
		}
	}
}

// Changing scale keeps each note on the same scale degree, so a major tune becomes minor.
export function setScale( song, scaleId ) {
	const oldSteps = scaleSteps( song.scale );
	const newSteps = scaleSteps( scaleId );
	for( const t of song.tracks ) {
		if( t.type !== "melody" ) {
			continue;
		}
		for( const n of t.notes ) {
			const rel = n.p - song.key;
			const oct = Math.floor( rel / 12 );
			const pc = ( ( rel % 12 ) + 12 ) % 12;
			const idx = oldSteps.indexOf( pc );
			if( idx >= 0 && oldSteps.length === newSteps.length ) {
				n.p = clampPitch( song.key + oct * 12 + newSteps[ idx ] );
			} else if( !inScale( n.p, song.key, scaleId ) ) {
				n.p = clampPitch( snapToScale( n.p, song.key, scaleId ) );
			}
		}
	}
	song.scale = scaleId;
}

// ---------------------------------------------------------------------------------------------
// Generators ("magic"). Each replaces the notes of one track, following the song's chords.

function chordFor( song, bar, size = 3 ) {
	return chordOffsets( song.key, song.scale, song.chords[ bar ] || 0, size );
}

function note( s, p, l, v = 1 ) {
	return { s, p, "l": snapLength( l ), v };
}

const CHORD_RHYTHMS = {
	"pad": [ [ 0, 16 ] ],
	"stabs": [ [ 0, 2 ], [ 3, 2 ], [ 6, 2 ], [ 8, 2 ], [ 11, 2 ], [ 14, 2 ] ],
	"offbeat": [ [ 2, 2 ], [ 6, 2 ], [ 10, 2 ], [ 14, 2 ] ],
	"sevenths": [ [ 0, 6 ], [ 6, 3 ], [ 10, 6 ] ]
};

export function genChords( song, track, style = "pad" ) {
	const rhythm = CHORD_RHYTHMS[ style ] || CHORD_RHYTHMS.pad;
	const size = style === "sevenths" ? 4 : 3;
	const notes = [];
	for( let bar = 0; bar < song.bars; bar++ ) {
		const pitches = voiceChord( chordFor( song, bar, size ), 64 );
		for( const [ step, len ] of rhythm ) {
			for( const p of pitches ) {
				notes.push( note( bar * 16 + step, p, len ) );
			}
		}
	}
	track.notes = notes;
	track.view = 76;
}

function bassRoot( song, bar ) {
	const pc = ( chordFor( song, bar )[ 0 ] % 12 + 12 ) % 12;
	let p = 36 + pc;
	if( p > 42 ) {
		p -= 12;
	}
	return p;
}

const BASS_RHYTHMS = {
	"pulse": [ [ 0, 2, "r" ], [ 2, 2, "r" ], [ 4, 2, "r" ], [ 6, 2, "r" ], [ 8, 2, "r" ], [ 10, 2, "r" ], [ 12, 2, "r" ], [ 14, 2, "r" ] ],
	"octave": [ [ 0, 2, "r" ], [ 2, 2, "o" ], [ 4, 2, "r" ], [ 6, 2, "o" ], [ 8, 2, "r" ], [ 10, 2, "o" ], [ 12, 2, "r" ], [ 14, 2, "o" ] ],
	"groove": [ [ 0, 3, "r" ], [ 3, 3, "r" ], [ 6, 2, "f" ], [ 8, 3, "r" ], [ 11, 3, "o" ], [ 14, 2, "f" ] ],
	"roots": [ [ 0, 6, "r" ], [ 6, 4, "r" ], [ 10, 6, "f" ] ],
	"walk": [ [ 0, 4, "r" ], [ 4, 4, "t" ], [ 8, 4, "f" ], [ 12, 4, "a" ] ]
};

export function genBass( song, track, style = "groove" ) {
	const rhythm = BASS_RHYTHMS[ style ] || BASS_RHYTHMS.groove;
	const notes = [];
	for( let bar = 0; bar < song.bars; bar++ ) {
		const chord = chordFor( song, bar );
		const r = bassRoot( song, bar );
		const next = bassRoot( song, ( bar + 1 ) % song.bars );
		const tones = {
			"r": r,
			"t": r + chord[ 1 ] - chord[ 0 ],
			"f": r + chord[ 2 ] - chord[ 0 ],
			"o": r + 12,
			"a": next >= r ? next - 1 : next + 1
		};
		for( const [ step, len, which ] of rhythm ) {
			notes.push( note( bar * 16 + step, tones[ which ], len ) );
		}
	}
	track.notes = notes;
	track.view = 60;
}

export function genArp( song, track, style = "up" ) {
	const notes = [];
	for( let bar = 0; bar < song.bars; bar++ ) {
		const base = voiceChord( chordFor( song, bar ), 67 );
		const tones = base.concat( base.map( p => p + 12 ) );
		let seq;
		let stepLen;
		if( style === "updown" ) {
			seq = tones.concat( tones.slice( 1, -1 ).reverse() );
			stepLen = 2;
		} else if( style === "broken" ) {
			seq = [ 0, 2, 1, 3, 2, 4, 3, 5 ].map( i => tones[ i % tones.length ] );
			stepLen = 2;
		} else {
			seq = tones.slice( 0, 4 );
			stepLen = 1;
		}
		for( let i = 0; i < 16 / stepLen; i++ ) {
			notes.push( note( bar * 16 + i * stepLen, seq[ i % seq.length ], stepLen, i % 4 === 0 ? 1 : 0.6 ) );
		}
	}
	track.notes = notes;
	track.view = 88;
}

const MELODY_RHYTHMS = [
	[ 0, 4, 8, 12 ],
	[ 0, 2, 4, 8, 12 ],
	[ 0, 3, 6, 8, 12 ],
	[ 0, 2, 4, 6, 8, 10, 12 ],
	[ 0, 4, 6, 8, 12, 14 ],
	[ 0, 6, 8, 10, 12 ],
	[ 0, 3, 6, 10, 12 ],
	[ 0, 2, 6, 8, 12 ],
	[ 0, 3, 6, 8, 11, 14 ]
];

// Writes a melody with a simple phrase shape: A, B, A (moved to the new chord), cadence.
export function genMelody( song, track, seed = 1 ) {
	const rng = makeRng( seed );
	const pick = list => list[ Math.floor( rng() * list.length ) ];
	const key = song.key;
	const scale = song.scale;
	const tonic = 60 + ( key > 6 ? key - 12 : key );
	const low = snapToScale( tonic + 2, key, scale );
	const high = snapToScale( tonic + 21, key, scale );
	// A step that would leave the range turns around instead of jumping an octave
	const stepWithin = ( p, n ) => {
		const q = scaleStep( p, n, key, scale );
		return q > high || q < low ? scaleStep( p, -n, key, scale ) : q;
	};
	const clampRange = p => {
		while( p > high ) {
			p -= 12;
		}
		while( p < low ) {
			p += 12;
		}
		return p;
	};
	const chordTonesNear = ( bar, target ) => {
		const offs = chordFor( song, bar );
		const candidates = [];
		for( let oct = 3; oct <= 7; oct++ ) {
			for( const off of offs ) {
				const p = ( off % 12 ) + oct * 12;
				if( p >= low && p <= high ) {
					candidates.push( p );
				}
			}
		}
		candidates.sort( ( a, b ) => Math.abs( a - target ) - Math.abs( b - target ) );
		return candidates;
	};

	const notes = [];
	let prev = clampRange( tonic + 12 );
	let motif = null;
	let rhythmA = pick( MELODY_RHYTHMS );
	for( let bar = 0; bar < song.bars; bar++ ) {
		const phrasePos = bar % 4;
		const isLast = bar === song.bars - 1;
		if( phrasePos === 0 && bar > 0 ) {
			rhythmA = pick( MELODY_RHYTHMS );
		}
		let onsets;
		let pitches = [];
		if( phrasePos === 3 || isLast ) {
			// Cadence: a few notes settling on a long chord tone
			onsets = pick( [ [ 0, 4, 8 ], [ 0, 2, 4, 8 ], [ 0, 6, 8 ] ] );
			for( let i = 0; i < onsets.length; i++ ) {
				if( i === onsets.length - 1 ) {
					const root = chordTonesNear( bar, prev ).find(
						p => ( ( p - chordFor( song, bar )[ 0 ] ) % 12 + 12 ) % 12 === 0
					);
					pitches.push( root || chordTonesNear( bar, prev )[ 0 ] );
				} else {
					prev = clampRange( stepWithin( prev, pick( [ -1, 1, -2 ] ) ) );
					pitches.push( prev );
				}
				prev = pitches[ pitches.length - 1 ];
			}
		} else if( phrasePos === 2 && motif ) {
			// Repeat the opening motif, moved to fit this bar's chord
			onsets = motif.onsets;
			const shift = chordTonesNear( bar, motif.pitches[ 0 ] )[ 0 ] - motif.pitches[ 0 ];
			pitches = motif.pitches.map( ( p, i ) => {
				let q = clampRange( p + shift );
				if( onsets[ i ] % 8 === 0 ) {
					q = chordTonesNear( bar, q )[ 0 ];
				} else {
					q = clampRange( snapToScale( q, key, scale ) );
				}
				return q;
			} );
			prev = pitches[ pitches.length - 1 ];
		} else {
			onsets = phrasePos === 0 ? rhythmA : pick( MELODY_RHYTHMS );
			for( const onset of onsets ) {
				let p;
				if( onset % 8 === 0 ) {
					const near = chordTonesNear( bar, prev + ( rng() < 0.5 ? 2 : -2 ) );
					p = near[ Math.floor( rng() * Math.min( 2, near.length ) ) ];
				} else {
					const dir = rng() < 0.5 ? -1 : 1;
					p = clampRange( stepWithin( prev, dir * ( rng() < 0.7 ? 1 : 2 ) ) );
				}
				pitches.push( p );
				prev = p;
			}
			if( phrasePos === 0 ) {
				motif = { onsets, pitches };
			}
		}
		for( let i = 0; i < onsets.length; i++ ) {
			const end = i + 1 < onsets.length ? onsets[ i + 1 ] : 16;
			const len = Math.min( end - onsets[ i ], 8 );
			// Leave an occasional gap on weak beats for breathing room
			if( onsets[ i ] % 4 !== 0 && rng() < 0.12 ) {
				continue;
			}
			notes.push( note( bar * 16 + onsets[ i ], pitches[ i ], len, onsets[ i ] % 4 === 0 ? 1 : 0.6 ) );
		}
	}
	track.notes = notes;
	track.view = high + 4;
}

// Drum patterns: one 16-step string per drum row. x = loud, o = medium, - = soft.
export const DRUM_STYLES = {
	"rock": { "name": "ROCK", "rows": { 0: "x.......x.x.....", 1: "....x.......x...", 3: "x.x.x.x.x.x.x.x." } },
	"four": { "name": "FOUR ON FLOOR", "rows": { 0: "x...x...x...x...", 2: "....x.......x...", 3: "xo.oxo.oxo.oxo.o", 4: "..x...x...x...x." } },
	"half": { "name": "HALF-TIME", "rows": { 0: "x.........x.....", 1: "........x.......", 3: "x.x.x.x.x.x.x.x." } },
	"break": { "name": "BREAKBEAT", "rows": { 0: "x.x.......x..x..", 1: "....x..o.o..x..o", 3: "x.x.x.x.x.x.x.x." } },
	"chip": { "name": "CHIPTUNE", "rows": { 0: "x.......x.x.....", 1: "....x.......x...", 3: "xoxoxoxoxoxoxoxo" } },
	"boombap": { "name": "BOOM BAP", "rows": { 0: "x......x..x.....", 1: "....x.......x...", 3: "x.o.x.o.x.o.x.o-" } },
	"trap": { "name": "TRAP", "rows": { 0: "x.......x.....x.", 2: "........x.......", 3: "x.x.x.x.x.xxx.x." } }
};

const DRUM_VELS = { "x": 1, "o": 0.6, "-": 0.3 };

export function genDrums( song, track, style = "rock", fills = true ) {
	const pattern = DRUM_STYLES[ style ] || DRUM_STYLES.rock;
	const notes = [];
	for( let bar = 0; bar < song.bars; bar++ ) {
		const fillBar = fills && song.bars >= 2 && ( bar % 4 === 3 || bar === song.bars - 1 );
		for( const [ row, str ] of Object.entries( pattern.rows ) ) {
			for( let i = 0; i < 16; i++ ) {
				const vel = DRUM_VELS[ str[ i ] ];
				if( vel && !( fillBar && i >= 12 && Number( row ) !== 0 ) ) {
					notes.push( { "s": bar * 16 + i, "p": Number( row ), "l": 1, "v": vel } );
				}
			}
		}
		if( fillBar ) {
			const fill = bar % 8 === 7 ?
				[ [ 12, 6, 1 ], [ 13, 6, 0.6 ], [ 14, 5, 1 ], [ 15, 5, 0.6 ] ] :
				[ [ 12, 1, 0.6 ], [ 13, 1, 0.6 ], [ 14, 1, 1 ], [ 15, 1, 1 ] ];
			for( const [ step, row, v ] of fill ) {
				notes.push( { "s": bar * 16 + step, "p": row, "l": 1, v } );
			}
		}
	}
	track.notes = notes;
}

// ---------------------------------------------------------------------------------------------
// Demo songs

export const TEMPLATES = [
	{
		"id": "chip", "name": "CHIP QUEST", "desc": "Bouncy 8-bit adventure in C major",
		build() {
			const s = baseSong( { "title": "CHIP QUEST", "tempo": 150, "key": 0, "scale": "major", "bars": 8, "prog": 0,
				"fx": { "reverb": 0.15, "echo": 0.2, "chorus": 0, "crush": 0 } } );
			const lead = melodyTrack( "LEAD", "chiplead" );
			genMelody( s, lead, 11 );
			const arp = melodyTrack( "ARP", "chippiano", { "vol": 50 } );
			genArp( s, arp, "up" );
			const bass = melodyTrack( "BASS", "chipbass" );
			genBass( s, bass, "octave" );
			const drums = drumTrack( "DRUMS", "chip" );
			genDrums( s, drums, "chip" );
			s.tracks = [ lead, arp, bass, drums ];
			return s;
		}
	},
	{
		"id": "neon", "name": "NEON DRIVE", "desc": "Synthwave cruise in A minor",
		build() {
			const s = baseSong( { "title": "NEON DRIVE", "tempo": 104, "key": 9, "scale": "minor", "bars": 8, "prog": 6,
				"fx": { "reverb": 0.35, "echo": 0.3, "chorus": 0.4, "crush": 0 } } );
			const lead = melodyTrack( "LEAD", "sawlead", { "vol": 75 } );
			genMelody( s, lead, 5 );
			const pad = melodyTrack( "PAD", "warmpad", { "vol": 70 } );
			genChords( s, pad, "pad" );
			const arp = melodyTrack( "ARP", "pluck", { "vol": 45, "pan": 30 } );
			genArp( s, arp, "up" );
			const bass = melodyTrack( "BASS", "pluckbass" );
			genBass( s, bass, "pulse" );
			const drums = drumTrack( "DRUMS", "electro" );
			genDrums( s, drums, "four" );
			s.tracks = [ lead, pad, arp, bass, drums ];
			return s;
		}
	},
	{
		"id": "lofi", "name": "RAINY LOFI", "desc": "Chill beats with jazzy 7th chords",
		build() {
			const s = baseSong( { "title": "RAINY LOFI", "tempo": 82, "key": 5, "scale": "major", "bars": 8, "prog": 5,
				"fx": { "reverb": 0.3, "echo": 0, "chorus": 0.3, "crush": 0.35 } } );
			const keys = melodyTrack( "KEYS", "epiano", { "vol": 70 } );
			genChords( s, keys, "sevenths" );
			const melody = melodyTrack( "MELODY", "flute", { "vol": 55 } );
			genMelody( s, melody, 3 );
			const bass = melodyTrack( "BASS", "subbass", { "vol": 75 } );
			genBass( s, bass, "roots" );
			const drums = drumTrack( "DRUMS", "boom" );
			genDrums( s, drums, "boombap" );
			s.tracks = [ keys, melody, bass, drums ];
			return s;
		}
	},
	{
		"id": "dungeon", "name": "DUNGEON CRAWL", "desc": "Dark fantasy in D harmonic minor",
		build() {
			const s = baseSong( { "title": "DUNGEON CRAWL", "tempo": 96, "key": 2, "scale": "harmonic", "bars": 8, "prog": 8,
				"fx": { "reverb": 0.5, "echo": 0.2, "chorus": 0, "crush": 0 } } );
			const bells = melodyTrack( "BELLS", "bells", { "vol": 70 } );
			genMelody( s, bells, 21 );
			const harp = melodyTrack( "HARP", "harp", { "vol": 55, "pan": -30 } );
			genArp( s, harp, "updown" );
			const strings = melodyTrack( "STRINGS", "strings", { "vol": 60 } );
			genChords( s, strings, "pad" );
			const bass = melodyTrack( "BASS", "subbass", { "vol": 70 } );
			genBass( s, bass, "roots" );
			const drums = drumTrack( "DRUMS", "electro", { "vol": 70 } );
			genDrums( s, drums, "half" );
			s.tracks = [ bells, harp, strings, bass, drums ];
			return s;
		}
	},
	{
		"id": "blank", "name": "BLANK SONG", "desc": "Empty tracks, ready for your ideas",
		build() {
			const s = baseSong( { "title": "MY SONG", "tempo": 120, "bars": 4 } );
			s.tracks = [
				melodyTrack( "LEAD", "chiplead" ),
				melodyTrack( "CHORDS", "warmpad" ),
				melodyTrack( "BASS", "chipbass" ),
				drumTrack( "DRUMS", "electro" )
			];
			return s;
		}
	}
];

export function buildTemplate( id ) {
	const t = TEMPLATES.find( x => x.id === id ) || TEMPLATES[ 0 ];
	return t.build();
}

// Magic menu entries for each track type.
export const MAGIC = {
	"melody": [
		{ "name": "NEW MELODY", "fn": ( s, t, seed ) => genMelody( s, t, seed ) },
		{ "name": "CHORD PADS", "fn": ( s, t ) => genChords( s, t, "pad" ) },
		{ "name": "CHORD STABS", "fn": ( s, t ) => genChords( s, t, "stabs" ) },
		{ "name": "OFFBEAT CHORDS", "fn": ( s, t ) => genChords( s, t, "offbeat" ) },
		{ "name": "JAZZY 7THS", "fn": ( s, t ) => genChords( s, t, "sevenths" ) },
		{ "name": "ARPEGGIO UP", "fn": ( s, t ) => genArp( s, t, "up" ) },
		{ "name": "ARPEGGIO WAVE", "fn": ( s, t ) => genArp( s, t, "updown" ) },
		{ "name": "BROKEN CHORDS", "fn": ( s, t ) => genArp( s, t, "broken" ) },
		{ "name": "BASS GROOVE", "fn": ( s, t ) => genBass( s, t, "groove" ) },
		{ "name": "BASS PULSE", "fn": ( s, t ) => genBass( s, t, "pulse" ) },
		{ "name": "OCTAVE BASS", "fn": ( s, t ) => genBass( s, t, "octave" ) },
		{ "name": "WALKING BASS", "fn": ( s, t ) => genBass( s, t, "walk" ) }
	],
	"drums": Object.keys( DRUM_STYLES ).map( id => ( {
		"name": DRUM_STYLES[ id ].name,
		"fn": ( s, t ) => genDrums( s, t, id )
	} ) )
};
