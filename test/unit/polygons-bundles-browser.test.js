/**
 * Full bundle availability, standalone Lite installation, explicit registration of an ESM
 * plugin imported before Pi.js (SYS-013), and benchmark polygon isolation.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_chromiumLaunch from "./chromium-launch.js";
import * as g_source from "./browser-source-harness.js";
import * as g_artifacts from "../performance/benchmark/artifacts.js";
import * as g_run from "../performance/benchmark/run.js";

let m_browser;

g_test.before( async () => {
	m_browser = await g_chromiumLaunch.launchChromium();
} );

g_test.after( async () => { await m_browser?.close(); } );

for( const format of [ "iife", "esm" ] ) {
	for( const minify of [ false, true ] ) {
		for( const variant of [ "full", "lite" ] ) {
			g_test.test( `polygons in ${variant} ${format}, minify=${minify}`, async () => {
				let entry = "src/index-full.js";
				if( variant === "lite" ) { entry = "src/index.js"; }
				const [ core, plugin ] = await Promise.all( [
					g_source.buildSource( entry, format, minify ),
					g_source.buildSource( "plugins/polygons/index.js", format, minify )
				] );
				const page = await m_browser.newPage();
				const errors = [];
				page.on( "pageerror", error => errors.push( error ) );
				try {
					await page.route( "http://polygons.test/**", route => {
						const url = route.request().url();
						if( url.endsWith( ".js" ) ) {
							let body = core;
							if( url.endsWith( "/plugin.js" ) ) { body = plugin; }
							return route.fulfill( {
								"contentType": "application/javascript", "body": body
							} );
						}
						return route.fulfill( {
							"contentType": "text/html", "body": "<!doctype html><body>"
						} );
					} );
					await page.goto( "http://polygons.test/" );
					await loadBundle( page, format, "core" );
					await page.evaluate( async () => {
						await pi.ready();
						window.first = pi.screen( "16x16" );
					} );
					if( variant === "lite" ) {
						g_assert.deepEqual( await page.evaluate( () => ( {
							"global": typeof pi.polygon, "screen": typeof first.polygon,
							"plugins": pi.getPlugins()
						} ) ), { "global": "undefined", "screen": "undefined", "plugins": [] } );
						await loadBundle( page, format, "plugin" );
					}
					g_assert.deepEqual( await page.evaluate( () => {
						const second = pi.screen( "16x16" );
						pi.polygon( [ 1, 1, 12, 1, 6, 12 ], 4 );
						$.polygon( { "points": new Int16Array( [ 1, 1, 12, 1, 6, 12 ] ) } );
						first.polygon( [ { "x": 1, "y": 1 }, { "x": 12, "y": 1 },
							{ "x": 6, "y": 12 } ], "red" );
						return {
							"commands": [ typeof pi.polygon, typeof $.polygon,
								typeof first.polygon, typeof second.polygon ],
							"plugins": pi.getPlugins().filter( item => item.name === "polygons" )
								.map( item => item.initialized )
						};
					} ), { "commands": [ "function", "function", "function", "function" ],
						"plugins": [ true ] } );
					g_assert.deepEqual( errors, [] );
					if( variant === "full" ) {
						await page.evaluate( () => {
							window.duplicateCode = null;
							window.addEventListener( "error", event => {
								window.duplicateCode = event.error?.code;
							} );
						} );
						if( format === "esm" ) {
							await page.evaluate( async () => {
								try { await import( "/plugin.js" ); } catch( error ) {
									window.duplicateCode = error.code;
								}
							} );
						} else {
							await loadBundle( page, format, "plugin" );
						}
						g_assert.equal( await page.evaluate( () => window.duplicateCode ),
							"DUPLICATE_PLUGIN" );
					}
				} finally {
					await page.close();
				}
			} );
		}
	}
}

// SYS-013: a plugin imported before Pi.js cannot see window.pi, so it does not register
// itself, and its default export is registered explicitly, as plugins/README.md describes
g_test.test( "SYS-013 an ESM plugin imported before Pi.js is registered explicitly", async () => {
	const [ core, plugin ] = await Promise.all( [
		g_source.buildSource( "src/index.js", "esm", true ),
		g_source.buildSource( "plugins/polygons/index.js", "esm", true )
	] );
	const page = await m_browser.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error ) );
	try {
		await page.route( "http://polygons.test/**", route => {
			const url = route.request().url();
			if( url.endsWith( ".js" ) ) {
				let body = core;
				if( url.endsWith( "/plugin.js" ) ) { body = plugin; }
				return route.fulfill( { "contentType": "application/javascript", "body": body } );
			}
			return route.fulfill( {
				"contentType": "text/html", "body": "<!doctype html><body>"
			} );
		} );
		await page.goto( "http://polygons.test/" );
		g_assert.deepEqual( await page.evaluate( async () => {
			const pluginModule = await import( "/plugin.js" );
			const piBeforeCore = typeof window.pi;
			const pi = ( await import( "/core.js" ) ).default;
			const before = pi.getPlugins().length;
			pi.registerPlugin( { "name": "polygons", "init": pluginModule.default } );
			await pi.ready();
			const screen = pi.screen( "16x16" );
			pi.polygon( [ 1, 1, 12, 1, 6, 12 ], 4 );
			const pixel = screen.getPixel( 6, 4 );
			return {
				"piBeforeCore": piBeforeCore,
				"pluginsBefore": before,
				"plugins": pi.getPlugins().map( item => [ item.name, item.state ] ),
				"filled": pixel.a === 255 && pixel.r > 100
			};
		} ), {
			"piBeforeCore": "undefined", "pluginsBefore": 0,
			"plugins": [ [ "polygons", "initialized" ] ], "filled": true
		} );
		g_assert.deepEqual( errors, [] );
	} finally {
		await page.close();
	}
} );

/** Load a classic bundle or verify the ESM core exports share the browser API. */
async function loadBundle( page, format, name ) {
	if( format === "esm" ) {
		g_assert.equal( await page.evaluate( async name => {
			const module = await import( `/${name}.js` );
			return name !== "core" || (
				module.default === window.pi && module.pi === window.pi && module.$ === window.$
			);
		}, name ), true );
	} else {
		await page.addScriptTag( { "url": `/${name}.js` } );
	}
}

g_test.test( "benchmark full artifacts install only the selected polygon plugin", async () => {
	const config = g_run.parseArgs( [ `--source=current=${g_artifacts.ROOT}`, "--smoke" ] );
	const prepared = await g_artifacts.prepare( config );
	const page = await m_browser.newPage();
	try {
		await page.setContent( "<!doctype html><body>" );
		await page.addScriptTag( {
			"content": Buffer.from( prepared.files[ "artifacts/core-current.js" ] ).toString()
		} );
		g_assert.equal( await page.evaluate( () => typeof pi.polygon ), "undefined" );
		await page.addScriptTag( {
			"content": Buffer.from( prepared.files[ "artifacts/polygons.js" ] ).toString()
		} );
		g_assert.deepEqual( await page.evaluate( () => ( {
			"command": typeof pi.polygon,
			"plugins": pi.getPlugins().filter( item => item.name === "polygons" )
				.map( item => item.initialized )
		} ) ), { "command": "function", "plugins": [ true ] } );
	} finally {
		await page.close();
	}
} );
