/**
 * The sound-advanced plugin as a standalone IIFE and ESM bundle: beside the full bundle, which
 * includes the sound plugin, and beside the lite bundle with the sound plugin loaded
 * separately, after the advanced plugin, so its dependency resolves late.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_playwright from "@playwright/test";
import * as g_source from "./browser-source-harness.js";

const COMMANDS = [
	"defineInstrument", "definePreset", "getRecordingState", "getSoundLevels", "saveRecording",
	"setBusEffect", "sfx", "startRecording", "stopRecording", "synth"
];

let m_browser;

g_test.before( async () => {
	m_browser = await g_playwright.chromium.launch( { "headless": true } );
} );

g_test.after( async () => { await m_browser?.close(); } );

for( const format of [ "iife", "esm" ] ) {
	for( const minify of [ false, true ] ) {
		for( const variant of [ "full", "lite" ] ) {
			g_test.test( `sound-advanced with ${variant} ${format}, minify=${minify}`, async () => {
				let entry = "src/index-full.js";
				if( variant === "lite" ) {
					entry = "src/index.js";
				}
				const [ core, sound, advanced ] = await Promise.all( [
					g_source.buildSource( entry, format, minify ),
					g_source.buildSource( "plugins/sound/index.js", format, minify ),
					g_source.buildSource( "plugins/sound-advanced/index.js", format, minify )
				] );
				const bodies = { "core": core, "sound": sound, "advanced": advanced };
				const page = await m_browser.newPage();
				const errors = [];
				page.on( "pageerror", error => errors.push( error ) );
				try {

					// Localhost is a secure context, which the recorder's AudioWorklet requires
					await page.route( "http://localhost:47110/**", route => {
						const name = new URL( route.request().url() ).pathname.slice( 1 );
						if( name.endsWith( ".js" ) ) {
							return route.fulfill( {
								"contentType": "application/javascript",
								"body": bodies[ name.slice( 0, -3 ) ]
							} );
						}
						return route.fulfill( {
							"contentType": "text/html", "body": "<!doctype html><body>"
						} );
					} );
					await page.goto( "http://localhost:47110/" );
					await loadBundle( page, format, "core" );
					await loadBundle( page, format, "advanced" );
					if( variant === "lite" ) {
						g_assert.deepEqual( await page.evaluate( () => ( {
							"synth": typeof pi.synth,
							"state": pi.getPlugins().map( item => [ item.name, item.initialized ] )
						} ) ), { "synth": "undefined", "state": [ [ "sound-advanced", false ] ] } );
						await loadBundle( page, format, "sound" );
					}
					const result = await page.evaluate( async commands => {
						await pi.ready();
						const levels = $.getSoundLevels();

						// The recorder's worklet source survives minification
						await $.startRecording();
						const wav = await $.stopRecording();
						return {
							"commands": commands.map( name => typeof pi[ name ] ),
							"initialized": pi.getPlugins()
								.filter( item => item.name === "sound-advanced" )
								.map( item => item.initialized ),
							"id": $.synth( { "duration": 0.01, "volume": 0, "oType": "pulse" } ),
							"sfx": $.sfx( "blip" ),
							"periodic": $.sound( { "duration": 0.01, "oType": "periodic" } ),
							"peak": levels.peak,
							"wav": [ wav.type, wav.size ]
						};
					}, COMMANDS );
					g_assert.deepEqual( result.commands, COMMANDS.map( () => "function" ) );
					g_assert.deepEqual( result.initialized, [ true ] );
					g_assert.match( result.id, /^sound_\d+$/ );
					g_assert.match( result.sfx, /^sound_\d+$/ );
					g_assert.match( result.periodic, /^sound_\d+$/ );
					g_assert.equal( result.peak, 0 );
					g_assert.equal( result.wav[ 0 ], "audio/wav" );
					g_assert.ok( result.wav[ 1 ] >= 44 );
					g_assert.deepEqual( errors, [] );
				} finally {
					await page.close();
				}
			} );
		}
	}
}

/**
 * Load a bundle as a classic script or an ES module; ESM plugins register themselves on the
 * shared window.pi.
 *
 * @param {Object} page - Playwright page
 * @param {string} format - "iife" or "esm"
 * @param {string} name - "core", "sound", or "advanced"
 * @returns {Promise<void>}
 */
async function loadBundle( page, format, name ) {
	if( format === "esm" ) {
		await page.evaluate( async name => {
			await import( `/${name}.js` );
		}, name );
	} else {
		await page.addScriptTag( { "url": `/${name}.js` } );
	}
}
