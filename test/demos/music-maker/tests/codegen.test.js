import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, laneString, songToCode, codeToSong, parseMML, extractPlayStrings, splitVoices } from "../src/codegen.js";
import { TEMPLATES, buildTemplate, normalizeSong, setKey, setScale, doubleSong } from "../src/song.js";
import { chordName, progressionLabel, PROGRESSIONS, voiceChord, chordOffsets } from "../src/music.js";

// Sum of note/rest lengths in a PLAY string, in sixteenth steps (single track).
function mmlSteps( str ) {
	const parts = parseMML( str );
	let end = 0;
	for( const n of parts[ 0 ].notes ) {
		end = Math.max( end, n.t + n.dur );
	}
	return end;
}

test( "every template lane fills exactly the song length", () => {
	for( const t of TEMPLATES ) {
		const song = t.build();
		const plan = buildPlan( song );
		for( const lane of plan.lanes ) {
			const str = laneString( plan, lane );
			// Total time = notes + rests; rests are not notes, so check via a rest-inclusive parse
			const parsed = parseMML( str + " C16" );
			const last = parsed[ 0 ].notes[ parsed[ 0 ].notes.length - 1 ];
			assert.equal( last.t, plan.total, `${t.id} lane ${lane.track}/${lane.drum}: ${str}` );
		}
	}
} );

test( "looped lane strings repeat the song", () => {
	const song = buildTemplate( "chip" );
	const plan = buildPlan( song );
	const lane = plan.lanes[ 0 ];
	const parsed = parseMML( laneString( plan, lane, 16, 2 ) + " C16" );
	const last = parsed[ 0 ].notes[ parsed[ 0 ].notes.length - 1 ];
	assert.equal( last.t, plan.total - 16 + plan.total * 2 );
} );

test( "parsed play strings give back the original notes", () => {
	const song = buildTemplate( "neon" );
	const plan = buildPlan( song );
	for( const lane of plan.lanes.filter( l => l.drum === null ) ) {
		const parsed = parseMML( laneString( plan, lane ) )[ 0 ];
		assert.equal( parsed.notes.length, lane.notes.length );
		parsed.notes.forEach( ( n, i ) => {
			assert.equal( Math.round( n.t ), lane.notes[ i ].s );
			assert.equal( n.pitch, lane.notes[ i ].p );
		} );
	}
} );

test( "code round-trips through project data", () => {
	for( const t of TEMPLATES ) {
		const song = t.build();
		const code = songToCode( song );
		const back = codeToSong( code );
		assert.equal( back.source, "data" );
		assert.deepEqual( back.song, normalizeSong( song ) );
	}
} );

test( "hand-edited play strings are picked up", () => {
	const song = buildTemplate( "blank" );
	song.tracks[ 0 ].notes = [ { "s": 0, "p": 60, "l": 4, "v": 1 }, { "s": 4, "p": 64, "l": 4, "v": 1 } ];
	const code = songToCode( song ).replace( "O4 C E", "O4 C G" );
	const back = codeToSong( code );
	assert.equal( back.source, "edited" );
	assert.deepEqual( back.song.tracks[ 0 ].notes.map( n => n.p ), [ 60, 67 ] );
} );

test( "plain play() code imports as tracks", () => {
	const code = `$.play( "T140 L8 O4 C E G >C" );\n$.play( 'O2 L2 C ' + "G" );`;
	assert.deepEqual( extractPlayStrings( code ), [ "T140 L8 O4 C E G >C", "O2 L2 C G" ] );
	const { song, source } = codeToSong( code );
	assert.equal( source, "play" );
	assert.equal( song.tempo, 140 );
	assert.equal( song.key, 0 );
	assert.equal( song.scale, "major" );
	assert.equal( song.tracks.length, 2 );
	assert.deepEqual( song.tracks[ 0 ].notes.map( n => [ n.s, n.p, n.l ] ), [ [ 0, 60, 2 ], [ 2, 64, 2 ], [ 4, 67, 2 ], [ 6, 72, 2 ] ] );
	assert.deepEqual( song.tracks[ 1 ].notes.map( n => [ n.s, n.p ] ), [ [ 0, 36 ], [ 8, 43 ] ] );
} );

test( "comma tracks start at the previous track's last command", () => {
	const parts = parseMML( "C4 D4 E4, F4" );
	assert.equal( parts[ 1 ].notes[ 0 ].t, 8 );
} );

test( "chords split into separate voices", () => {
	const voices = splitVoices( [ { "s": 0, "p": 60, "l": 16 }, { "s": 0, "p": 64, "l": 16 }, { "s": 0, "p": 67, "l": 16 } ] );
	assert.equal( voices.length, 3 );
} );

test( "music theory helpers", () => {
	assert.equal( chordName( 0, "major", 5 ), "Am" );
	assert.equal( chordName( 9, "minor", 0 ), "Am" );
	assert.equal( chordName( 0, "major", 6 ), "Bdim" );
	assert.equal( progressionLabel( "major", PROGRESSIONS[ 0 ] ), "I-V-vi-IV" );
	assert.deepEqual( voiceChord( chordOffsets( 0, "major", 0 ), 64 ), [ 60, 64, 67 ] );
} );

test( "key and scale changes move notes", () => {
	const song = buildTemplate( "blank" );
	song.tracks[ 0 ].notes = [ { "s": 0, "p": 64, "l": 4, "v": 1 } ];
	setScale( song, "minor" );
	assert.equal( song.tracks[ 0 ].notes[ 0 ].p, 63 );
	setKey( song, 2 );
	assert.equal( song.tracks[ 0 ].notes[ 0 ].p, 65 );
	assert.ok( doubleSong( song ) );
	assert.equal( song.tracks[ 0 ].notes.length, 2 );
} );
