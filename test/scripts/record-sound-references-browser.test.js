/**
 * The Pi.js 2.2 sound references still reproduce: each preset in
 * test/scripts/record-sound-references.js, rendered from the frozen releases/pi-2.2.0/pi.js
 * bundle in Chromium, matches its file in test/media/sound-2.2/ to within one 16-bit step.
 * Presets that mix several voices can differ by that step between runs, because Chromium sums a
 * node's inputs in an address-dependent order.
 */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_audioEngines from "../unit/audio-engines.js";
import * as g_harness from "../unit/audio-render-harness.js";
import * as g_references from "./record-sound-references.js";
const assert = g_assert;
const { test, before, after } = g_test;

const ROOT_DIR = g_path.join( import.meta.dirname, "..", ".." );
const REFERENCE_DIR = g_path.join( ROOT_DIR, "test", "media", "sound-2.2" );
const BUNDLE = g_fs.readFileSync(
	g_path.join( ROOT_DIR, "releases", "pi-2.2.0", "pi.js" ), "utf8"
);

let browser = null;
let session = null;

before( async () => {
	browser = await g_audioEngines.launchEngine( "chromium" );
	session = await g_harness.createHarnessSession( browser );
} );

after( async () => {
	await browser?.close();
} );

test( "each 2.2 reference re-renders to within one 16-bit step", async () => {
	for( const preset of g_references.PRESETS ) {
		const rendered = g_references.decodeWav(
			g_references.encodeWav(
				await g_references.renderPreset( session, BUNDLE, preset ), g_harness.SAMPLE_RATE
			)
		).samples;
		const recorded = g_references.decodeWav(
			g_fs.readFileSync( g_path.join( REFERENCE_DIR, `${preset.name}.wav` ) )
		).samples;
		assert.equal( rendered.length, recorded.length, preset.name );
		let steps = 0;
		let differing = 0;
		for( let i = 0; i < recorded.length; i++ ) {
			const step = Math.round( Math.abs( rendered[ i ] - recorded[ i ] ) * 32767 );
			steps = Math.max( steps, step );
			if( step > 0 ) {
				differing++;
			}
		}
		assert.ok( steps <= 1, `${preset.name}: differs by ${steps} steps` );
		assert.ok( differing <= recorded.length / 1000, `${preset.name}: ${differing} samples` );
	}
} );
