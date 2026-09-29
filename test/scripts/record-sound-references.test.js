/**
 * The Pi.js 2.2 sound references in test/media/sound-2.2/ against the script that records them
 * (test/scripts/record-sound-references.js) and the demos that play them for the release
 * listening pass.
 */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_references from "./record-sound-references.js";
const assert = g_assert;
const test = g_test.test;

const ROOT_DIR = g_path.join( import.meta.dirname, "..", ".." );
const REFERENCE_DIR = g_path.join( ROOT_DIR, "test", "media", "sound-2.2" );
const MANIFEST = JSON.parse(
	g_fs.readFileSync( g_path.join( REFERENCE_DIR, "manifest.json" ), "utf8" )
);

test( "the manifest lists the script's presets, in order, with their files", () => {
	assert.equal( MANIFEST.source, "releases/pi-2.2.0/pi.js" );
	assert.equal( MANIFEST.sampleRate, 48000 );
	assert.deepEqual(
		MANIFEST.presets.map( preset => [ preset.name, preset.label, preset.code, preset.file ] ),
		g_references.PRESETS.map( preset => [
			preset.name, preset.label, preset.code, `${preset.name}.wav`
		] )
	);
	const files = g_fs.readdirSync( REFERENCE_DIR ).sort();
	const listed = MANIFEST.presets.map( preset => preset.file ).concat( "manifest.json" );
	assert.deepEqual( files, listed.sort() );
} );

test( "each reference is an audible 48 kHz mono WAV of its manifest duration", () => {
	for( const preset of MANIFEST.presets ) {
		const wav = g_references.decodeWav(
			g_fs.readFileSync( g_path.join( REFERENCE_DIR, preset.file ) )
		);
		assert.equal( wav.sampleRate, 48000, preset.file );
		assert.equal( wav.samples.length / wav.sampleRate, preset.duration, preset.file );
		const peak = wav.samples.reduce( ( max, value ) => Math.max( max, Math.abs( value ) ), 0 );
		assert.ok( peak > 0.05, `${preset.file}: peak ${peak}` );
	}
} );

test( "the demos load references that the manifest lists", () => {
	const listed = MANIFEST.presets.map( preset => preset.file );
	for( const demo of [ "sound_lab_01.html", "sound_play_01.html" ] ) {
		const html = g_fs.readFileSync( g_path.join( ROOT_DIR, "test", "demos", demo ), "utf8" );
		const paths = html.match( /\.\.\/media\/sound-2\.2\/[\w.-]*/g ) || [];
		assert.ok( paths.length > 0, `${demo} loads no references` );

		// The sound lab names the folder and reads the rest from the manifest
		for( const path of paths ) {
			const file = path.slice( "../media/sound-2.2/".length );
			if( file !== "" ) {
				assert.ok( listed.includes( file ), `${demo}: ${file} is not in the manifest` );
			}
		}
	}
} );

test( "encodeWav() and decodeWav() round-trip within one quantization step", () => {
	const samples = Float32Array.from( [ 0, 0.5, -0.5, 1, -1, 0.123456, 2, -2 ] );
	const wav = g_references.decodeWav( g_references.encodeWav( samples, 48000 ) );
	assert.equal( wav.sampleRate, 48000 );
	assert.equal( wav.samples.length, samples.length );
	for( let i = 0; i < samples.length; i++ ) {
		const expected = Math.max( -1, Math.min( 1, samples[ i ] ) );
		assert.ok( Math.abs( wav.samples[ i ] - expected ) <= 1 / 32767, `sample ${i}` );
	}
} );
