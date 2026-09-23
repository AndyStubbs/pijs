/**
 * Records Pi.js 2.2 reference renders for A/B listening in the sound lab.
 *
 * Loads the frozen releases/pi-2.2.0/pi.js bundle into the offline render harness in Chromium,
 * renders each preset, and writes 16-bit mono 48 kHz WAV files plus manifest.json to
 * test/media/sound-2.2/. Re-running it reproduces the same files, because the 2.2 bundle and
 * the harness are both deterministic.
 *
 * Usage: npm run sound:references
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_playwright from "@playwright/test";
import * as g_harness from "../unit/audio-render-harness.js";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const ROOT_DIR = g_path.join( DIRNAME, "..", ".." );
const BUNDLE_FILE = g_path.join( ROOT_DIR, "releases", "pi-2.2.0", "pi.js" );
const OUTPUT_DIR = g_path.join( ROOT_DIR, "test", "media", "sound-2.2" );
const ENGINE = "chromium";

/**
 * Presets rendered from the 2.2 bundle. code runs in the page as written, so it doubles as
 * the call shown in the sound lab.
 */
const PRESETS = [
	{
		"name": "default-triangle",
		"label": "Default triangle",
		"duration": 1.25,
		"code": "$.sound( 440 );"
	},
	{
		"name": "square-attack-decay",
		"label": "Square with attack and decay",
		"duration": 0.8,
		"code": "$.sound( { \"frequency\": 330, \"duration\": 0.4, \"oType\": \"square\", " +
			"\"attack\": 0.05, \"decay\": 0.3 } );"
	},
	{
		"name": "sawtooth-bass",
		"label": "Sawtooth bass",
		"duration": 0.9,
		"code": "$.sound( 110, 0.6, 0.8, \"sawtooth\", 0, 0.01, 0.2 );"
	},
	{
		"name": "sine-blip",
		"label": "Sine blip",
		"duration": 0.25,
		"code": "$.sound( { \"frequency\": 1320, \"duration\": 0.05, \"oType\": \"sine\", " +
			"\"decay\": 0.05 } );"
	},
	{
		"name": "wave-table",
		"label": "Wave table",
		"duration": 0.75,
		"code": "$.sound( 262, 0.5, 0.8, [ " +
			"[ 0, 0.4, 0.4, 1, 1, 1, 0.3, 0.7, 0.6, 0.5, 0.9, 0.8 ], " +
			"[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ], 0, 0, 0.1 );"
	},
	{
		"name": "play-phrase",
		"label": "PLAY phrase",
		"duration": 1.5,
		"code": "$.play( \"T176 L16 SQUARE O5 C E G C6 O5 G8 O6 C4\" );"
	},
	{
		"name": "galaga-shoot",
		"label": "Galaga shoot",
		"duration": 0.3,
		"code": [
			"$.sound( { \"frequency\": 980, \"duration\": 0.045, \"volume\": 0.16, " +
				"\"oType\": \"square\", \"attack\": 0.002, \"decay\": 0.042 } );",
			"$.sound( { \"frequency\": 1560, \"duration\": 0.03, \"volume\": 0.1, " +
				"\"oType\": \"triangle\", \"attack\": 0.001, \"decay\": 0.028 } );",
			"$.sound( { \"frequency\": 420, \"duration\": 0.07, \"volume\": 0.08, " +
				"\"oType\": \"square\", \"delay\": 0.03, \"attack\": 0.001, \"decay\": 0.065 } );"
		].join( "\n" )
	},
	{
		"name": "galaga-explosion",
		"label": "Galaga explosion",
		"duration": 1,
		"code": [
			"$.sound( { \"frequency\": 210, \"duration\": 0.12, \"volume\": 0.28, " +
				"\"oType\": \"sawtooth\", \"attack\": 0.004, \"decay\": 0.11 } );",
			"$.sound( { \"frequency\": 92, \"duration\": 0.22, \"volume\": 0.3, " +
				"\"oType\": \"square\", \"delay\": 0.03, \"attack\": 0.008, \"decay\": 0.2 } );",
			"$.sound( { \"frequency\": 48, \"duration\": 0.32, \"volume\": 0.22, " +
				"\"oType\": \"sawtooth\", \"delay\": 0.07, \"attack\": 0.015, \"decay\": 0.3 } );",
			"$.sound( { \"frequency\": 36, \"duration\": 0.28, \"volume\": 0.14, " +
				"\"oType\": \"triangle\", \"delay\": 0.1, \"attack\": 0.02, \"decay\": 0.26 } );"
		].join( "\n" )
	}
];

/**
 * Encodes mono float samples as a 16-bit PCM WAV file.
 *
 * @param {Float32Array} samples - Samples in -1..1
 * @param {number} sampleRate - Sample rate
 * @returns {Buffer} WAV file contents
 */
function encodeWav( samples, sampleRate ) {
	const dataBytes = samples.length * 2;
	const buffer = Buffer.alloc( 44 + dataBytes );
	buffer.write( "RIFF", 0, "ascii" );
	buffer.writeUInt32LE( 36 + dataBytes, 4 );
	buffer.write( "WAVE", 8, "ascii" );
	buffer.write( "fmt ", 12, "ascii" );
	buffer.writeUInt32LE( 16, 16 );
	buffer.writeUInt16LE( 1, 20 );
	buffer.writeUInt16LE( 1, 22 );
	buffer.writeUInt32LE( sampleRate, 24 );
	buffer.writeUInt32LE( sampleRate * 2, 28 );
	buffer.writeUInt16LE( 2, 32 );
	buffer.writeUInt16LE( 16, 34 );
	buffer.write( "data", 36, "ascii" );
	buffer.writeUInt32LE( dataBytes, 40 );
	for( let i = 0; i < samples.length; i++ ) {
		const value = Math.max( -1, Math.min( 1, samples[ i ] ) );
		buffer.writeInt16LE( Math.round( value * 32767 ), 44 + i * 2 );
	}
	return buffer;
}

/**
 * Decodes a 16-bit mono PCM WAV written by encodeWav().
 *
 * @param {Buffer} buffer - WAV file contents
 * @returns {{ sampleRate: number, samples: Float32Array }} Decoded audio
 */
function decodeWav( buffer ) {
	if( buffer.toString( "ascii", 0, 4 ) !== "RIFF" || buffer.readUInt16LE( 22 ) !== 1 ) {
		throw new Error( "decodeWav: expected a mono RIFF WAV file." );
	}
	const dataBytes = buffer.readUInt32LE( 40 );
	const samples = new Float32Array( dataBytes / 2 );
	for( let i = 0; i < samples.length; i++ ) {
		samples[ i ] = buffer.readInt16LE( 44 + i * 2 ) / 32767;
	}
	return { "sampleRate": buffer.readUInt32LE( 24 ), "samples": samples };
}

/**
 * Renders one preset with a bundle in a fresh harness document.
 *
 * @param {Object} session - Harness session from createHarnessSession()
 * @param {string} bundle - Pi.js bundle source
 * @param {Object} preset - Preset definition
 * @returns {Promise<Float32Array>} Left channel
 */
async function renderPreset( session, bundle, preset ) {
	const harness = await session.open( {
		"scripts": [ bundle ],
		"config": { "duration": preset.duration }
	} );
	const result = await harness.page.evaluate( code => {
		new Function( code )();
		return window.__audioHarness.render( { "singlePass": true } );
	}, preset.code );
	if( result.errors.length > 0 || harness.errors.length > 0 ) {
		const errors = [ ...result.errors, ...harness.errors ];
		throw new Error( `${preset.name}: ${errors.join( "; " )}` );
	}
	return g_harness.decodeRender( result ).channels[ 0 ];
}

async function recordReferences() {
	const bundle = g_fs.readFileSync( BUNDLE_FILE, "utf8" );
	const browser = await g_playwright[ ENGINE ].launch( { "headless": true } );
	const manifest = {
		"source": "releases/pi-2.2.0/pi.js",
		"engine": ENGINE,
		"sampleRate": g_harness.SAMPLE_RATE,
		"format": "16-bit PCM mono WAV, left channel of the offline render",
		"presets": []
	};
	try {
		const session = await g_harness.createHarnessSession( browser );
		g_fs.mkdirSync( OUTPUT_DIR, { "recursive": true } );
		for( const preset of PRESETS ) {
			const samples = await renderPreset( session, bundle, preset );
			const file = `${preset.name}.wav`;
			const wav = encodeWav( samples, g_harness.SAMPLE_RATE );
			g_fs.writeFileSync( g_path.join( OUTPUT_DIR, file ), wav );
			manifest.presets.push( {
				"name": preset.name,
				"label": preset.label,
				"file": file,
				"duration": samples.length / g_harness.SAMPLE_RATE,
				"code": preset.code
			} );
			const seconds = samples.length / g_harness.SAMPLE_RATE;
			console.log( `  ✓ ${file} (${seconds.toFixed( 3 )} s)` );
		}
	} finally {
		await browser.close();
	}
	g_fs.writeFileSync(
		g_path.join( OUTPUT_DIR, "manifest.json" ), `${JSON.stringify( manifest, null, "\t" )}\n`
	);
	console.log( `✓ Wrote ${manifest.presets.length} references to test/media/sound-2.2/` );
}

function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	return g_url.pathToFileURL( g_path.resolve( entry ) ).href === import.meta.url;
}

if( isMainModule() ) {
	try {
		await recordReferences();
	} catch( error ) {
		console.error( "✗ Recording failed:", error );
		process.exit( 1 );
	}
}

export { PRESETS, decodeWav, encodeWav, renderPreset };
