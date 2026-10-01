// Music theory helpers: note names, scales, chords, progressions and note lengths.
// Pitches are MIDI numbers (60 = middle C = PLAY "O4 C"). Time is counted in steps,
// where one step is a sixteenth note and a bar is 16 steps.

export const STEPS_PER_BAR = 16;
export const MIN_PITCH = 12;   // C0, the lowest PLAY note
export const MAX_PITCH = 119;  // B8

export const NOTE_NAMES = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];

export const SCALES = {
	"major":      { "name": "MAJOR",        "steps": [ 0, 2, 4, 5, 7, 9, 11 ] },
	"minor":      { "name": "MINOR",        "steps": [ 0, 2, 3, 5, 7, 8, 10 ] },
	"dorian":     { "name": "DORIAN",       "steps": [ 0, 2, 3, 5, 7, 9, 10 ] },
	"mixolydian": { "name": "MIXOLYDIAN",   "steps": [ 0, 2, 4, 5, 7, 9, 10 ] },
	"harmonic":   { "name": "HARMONIC MIN", "steps": [ 0, 2, 3, 5, 7, 8, 11 ] },
	"pentMajor":  { "name": "PENTATONIC",   "steps": [ 0, 2, 4, 7, 9 ], "harmony": "major" },
	"pentMinor":  { "name": "MINOR PENTA",  "steps": [ 0, 3, 5, 7, 10 ], "harmony": "minor" },
	"blues":      { "name": "BLUES",        "steps": [ 0, 3, 5, 6, 7, 10 ], "harmony": "minor" },
	"chromatic":  { "name": "CHROMATIC",    "steps": [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ], "harmony": "major" }
};
export const SCALE_IDS = Object.keys( SCALES );

// Note lengths PLAY can express as a single note: 1/16, 1/8, dotted 1/8, 1/4, dotted 1/4,
// 1/2, dotted 1/2 and a whole note.
export const LENGTHS = [ 1, 2, 3, 4, 6, 8, 12, 16 ];
export const LENGTH_TOKENS = {
	1: "16", 2: "8", 3: "8.", 4: "4", 6: "4.", 8: "2", 12: "2.", 16: "1"
};
export const LENGTH_NAMES = {
	1: "1/16", 2: "1/8", 3: "1/8.", 4: "1/4", 6: "1/4.", 8: "1/2", 12: "1/2.", 16: "1"
};

// Largest expressible length that is not longer than steps (at least 1).
export function snapLength( steps ) {
	let best = 1;
	for( const len of LENGTHS ) {
		if( len <= steps ) {
			best = len;
		}
	}
	return best;
}

// Expressible length closest to steps.
export function nearestLength( steps ) {
	let best = 1;
	for( const len of LENGTHS ) {
		if( Math.abs( len - steps ) < Math.abs( best - steps ) ) {
			best = len;
		}
	}
	return best;
}

export function pitchName( pitch ) {
	return NOTE_NAMES[ pitch % 12 ] + ( Math.floor( pitch / 12 ) - 1 );
}

export function clampPitch( pitch ) {
	return Math.max( MIN_PITCH, Math.min( MAX_PITCH, pitch ) );
}

export function scaleSteps( scaleId ) {
	return ( SCALES[ scaleId ] || SCALES.major ).steps;
}

export function harmonySteps( scaleId ) {
	const scale = SCALES[ scaleId ] || SCALES.major;
	return SCALES[ scale.harmony || scaleId ].steps;
}

export function inScale( pitch, key, scaleId ) {
	const pc = ( ( pitch - key ) % 12 + 12 ) % 12;
	return scaleSteps( scaleId ).includes( pc );
}

// Every in-scale pitch from low to high, inclusive, highest first (grid order).
export function scalePitches( key, scaleId, low, high ) {
	const out = [];
	for( let p = high; p >= low; p-- ) {
		if( inScale( p, key, scaleId ) ) {
			out.push( p );
		}
	}
	return out;
}

// Nearest in-scale pitch; ties go up.
export function snapToScale( pitch, key, scaleId ) {
	for( let d = 0; d < 12; d++ ) {
		if( inScale( pitch + d, key, scaleId ) ) {
			return pitch + d;
		}
		if( inScale( pitch - d, key, scaleId ) ) {
			return pitch - d;
		}
	}
	return pitch;
}

// Moves a pitch by a number of scale steps (the pitch is snapped into the scale first).
export function scaleStep( pitch, steps, key, scaleId ) {
	let p = snapToScale( pitch, key, scaleId );
	const dir = steps < 0 ? -1 : 1;
	for( let i = 0; i < Math.abs( steps ); i++ ) {
		do {
			p += dir;
		} while( !inScale( p, key, scaleId ) );
	}
	return p;
}

// Chord built by stacking thirds on a scale degree (0-based). Returns pitch classes
// relative to C as increasing semitone offsets, e.g. C major in C = [ 0, 4, 7 ].
export function chordOffsets( key, scaleId, degree, size = 3 ) {
	const h = harmonySteps( scaleId );
	const out = [];
	for( let i = 0; i < size; i++ ) {
		const d = degree + i * 2;
		out.push( key + h[ d % h.length ] + 12 * Math.floor( d / h.length ) );
	}
	return out;
}

export function chordQuality( key, scaleId, degree ) {
	const c = chordOffsets( key, scaleId, degree, 3 );
	const third = c[ 1 ] - c[ 0 ];
	const fifth = c[ 2 ] - c[ 0 ];
	if( third === 3 && fifth === 6 ) {
		return "dim";
	}
	if( third === 4 && fifth === 8 ) {
		return "aug";
	}
	return third === 3 ? "min" : "maj";
}

export function chordName( key, scaleId, degree ) {
	const root = chordOffsets( key, scaleId, degree, 1 )[ 0 ];
	const suffix = { "maj": "", "min": "m", "dim": "dim", "aug": "+" }[ chordQuality( key, scaleId, degree ) ];
	return NOTE_NAMES[ root % 12 ] + suffix;
}

const NUMERALS = [ "I", "II", "III", "IV", "V", "VI", "VII" ];

export function chordNumeral( scaleId, degree ) {
	const q = chordQuality( 0, scaleId, degree );
	const n = NUMERALS[ degree % 7 ];
	if( q === "min" ) {
		return n.toLowerCase();
	}
	if( q === "dim" ) {
		return n.toLowerCase() + "o";
	}
	return q === "aug" ? n + "+" : n;
}

// Chord progressions as scale degrees, one chord per bar.
export const PROGRESSIONS = [
	[ 0, 4, 5, 3 ],
	[ 5, 3, 0, 4 ],
	[ 0, 5, 3, 4 ],
	[ 0, 3, 4, 3 ],
	[ 0, 3, 0, 4 ],
	[ 1, 4, 0, 0 ],
	[ 0, 5, 2, 6 ],
	[ 0, 6, 5, 4 ],
	[ 0, 3, 4, 0 ],
	[ 0, 2, 3, 4 ],
	[ 0, 0, 0, 0 ]
];

export function progressionLabel( scaleId, prog ) {
	return prog.map( d => chordNumeral( scaleId, d ) ).join( "-" );
}

// Picks the octave of each chord tone closest to center, giving a close voicing.
export function voiceChord( offsets, center ) {
	const out = offsets.map( off => {
		const pc = ( ( off % 12 ) + 12 ) % 12;
		let p = center - 6 + ( ( pc - ( center - 6 ) ) % 12 + 12 ) % 12;
		return p;
	} );
	return [ ...new Set( out ) ].sort( ( a, b ) => a - b );
}

// Deterministic random numbers (mulberry32).
export function makeRng( seed ) {
	let a = seed >>> 0;
	return function() {
		a = ( a + 0x6D2B79F5 ) >>> 0;
		let t = a;
		t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
	};
}
