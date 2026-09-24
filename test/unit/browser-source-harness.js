/**
 * Fresh in-memory Pi.js bundles for browser tests: a source-serving browser context, and a
 * shared full and lite page probe that checks page errors the same way in every suite.
 */
import * as g_fsPromises from "node:fs/promises";
import * as g_path from "node:path";
import * as g_esbuild from "esbuild";
import * as g_fs from "node:fs";
import * as g_url from "node:url";
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_playwright from "@playwright/test";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const fs = g_fsPromises;
const path = g_path;
const esbuild = g_esbuild;

const root = path.resolve( DIRNAME, "../.." );
const version = JSON.parse( g_fs.readFileSync( new URL( "../../package.json", import.meta.url ), "utf8" ) ).version;

/** Core bundle names and their source entries. */
const BUNDLES = [ "full", "lite" ];
const BUNDLE_ENTRIES = { "full": "src/index-full.js", "lite": "src/index.js" };
const EMPTY_PAGE = "<!doctype html><html><body></body></html>";

/**
 * Bundle a source entry without generating build or release artifacts.
 *
 * @param {string} entry - Repository-relative JavaScript entry point.
 * @param {string} format - esbuild output format.
 * @param {boolean} minify - Whether to produce genuinely minified JavaScript.
 * @param {Object} [options] - Build options.
 * @param {string} [options.expose] - Global name that receives the screen manager and renderer
 *   modules as `{ manager, renderer }`, for tests that inspect renderer internals.
 * @returns {Promise<string>} Bundled JavaScript.
 */
async function buildSource( entry, format = "iife", minify = false, options = {} ) {
	let input = { "entryPoints": [ path.join( root, entry ) ] };
	if( options.expose ) {
		input = { "stdin": {
			"contents": `import "./${entry}";
				import * as manager from "./src/core/screen-manager.js";
				import * as renderer from "./src/renderer/renderer.js";
				window.${options.expose} = { manager, renderer };`,
			"resolveDir": root
		} };
	}
	const result = await esbuild.build( {
		...input,
		"bundle": true,
		"write": false,
		"format": format,
		"minify": minify,
		"target": "es2020",
		"define": { "__VERSION__": JSON.stringify( version ) },
		"loader": { ".vert": "text", ".frag": "text" },
		"plugins": [ {
			"name": "test-font-data",
			"setup": build => {
				build.onLoad( { "filter": /\.webp$/ }, async args => {
					const data = await fs.readFile( args.path );
					return {
						"contents": "export default " + JSON.stringify( {
							"data": "data:image/webp;base64," + data.toString( "base64" )
						} ),
						"loader": "js"
					};
				} );
			}
		} ]
	} );
	return result.outputFiles[ 0 ].text;
}

/**
 * Create an isolated context whose localhost requests use current source and local fixtures.
 *
 * @param {Object} browser - Playwright browser.
 * @returns {Promise<Object>} Browser context; the caller closes it after its tests.
 */
async function createSourceContext( browser ) {
	const context = await browser.newContext();
	const bundles = new Map();
	const types = {
		".html": "text/html", ".js": "application/javascript", ".json": "application/json",
		".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
		".svg": "image/svg+xml", ".css": "text/css", ".wav": "audio/wav"
	};
	await context.route( "http://localhost:8080/**", async route => {
		const pathname = decodeURIComponent( new URL( route.request().url() ).pathname );
		let entry;
		if( /^\/build\/pi(?:\.lite)?(?:\.min)?\.js$/.test( pathname ) ) {
			entry = "src/index-full.js";
			if( pathname.includes( ".lite" ) ) {
				entry = "src/index.js";
			}
		} else {
			const plugin = pathname.match( /^\/build\/plugins\/([\w-]+)\/\1(?:\.min)?\.js$/ );
			if( plugin ) {
				entry = "plugins/" + plugin[ 1 ] + "/index.js";
			}
		}
		if( entry ) {
			const minify = pathname.endsWith( ".min.js" );
			const key = `${entry}:${minify}`;
			if( !bundles.has( key ) ) {
				bundles.set( key, buildSource( entry, "iife", minify ) );
			}
			await route.fulfill( {
				"contentType": "application/javascript", "body": await bundles.get( key )
			} );
			return;
		}
		if( pathname === "/" ) {
			await route.fulfill( { "contentType": "text/html", "body": "<!doctype html><body>" } );
			return;
		}
		const file = path.resolve( root, "." + pathname );
		if( !file.startsWith( root + path.sep ) ) {
			await route.fulfill( { "status": 403, "body": "Forbidden" } );
			return;
		}
		try {
			await route.fulfill( {
				"contentType": types[ path.extname( file ) ] || "application/octet-stream",
				"body": await fs.readFile( file )
			} );
		} catch( error ) {
			if( error.code !== "ENOENT" ) {
				throw error;
			}
			await route.fulfill( { "status": 404, "body": "Not found" } );
		}
	} );
	return context;
}

/**
 * Build the full and lite core bundles, each followed by the plugins it needs.
 *
 * @param {Object} [options] - Bundle options.
 * @param {string} [options.expose] - See `buildSource`.
 * @param {string[]} [options.litePlugins] - Plugin names loaded after the lite bundle.
 * @returns {Promise<Object>} Script lists keyed by bundle name.
 */
async function buildBundles( options = {} ) {
	const scripts = {};
	const plugins = await Promise.all( ( options.litePlugins || [] ).map(
		name => buildSource( `plugins/${name}/index.js` )
	) );
	for( const bundle of BUNDLES ) {
		scripts[ bundle ] = [ await buildSource( BUNDLE_ENTRIES[ bundle ], "iife", false, {
			"expose": options.expose
		} ) ];
		if( bundle === "lite" ) {
			scripts[ bundle ].push( ...plugins );
		}
	}
	return scripts;
}

/**
 * Register hooks that build fresh bundles and launch Chromium for the calling test file, and
 * return a probe that runs page code against a chosen bundle.
 *
 * A probe opens an empty page, loads the bundle, awaits `$.ready()`, evaluates `options.setup`
 * and then the scenario, lets queued work settle, and asserts the collected page errors.
 *
 * @param {Object} [options] - Suite options; `expose` and `litePlugins` as in `buildBundles`.
 * @param {string} [options.html] - Page content; an empty page by default.
 * @param {Function} [options.beforeLoad] - Page function evaluated before the bundle loads.
 * @param {Function} [options.setup] - Page function that installs helpers; receives the probe arg.
 * @param {string} [options.settle] - "task" (default) or "frame": what to wait after the scenario.
 * @param {Function} [options.finish] - Page function evaluated after settling.
 * @param {Function} [options.console] - Predicate selecting console messages to collect.
 * @param {number} [options.timeout] - Milliseconds before a scenario is reported as hung.
 * @returns {Object} `{ probe, open, scripts, browser }`; `scripts` and `browser` are set once
 *   the `before` hook has run.
 */
function useBrowserBundles( options = {} ) {
	const suite = { "browser": null, "scripts": null };

	g_test.before( async () => {
		suite.scripts = await buildBundles( options );
		suite.browser = await g_playwright.chromium.launch( { "headless": true } );
	} );
	g_test.after( async () => { await suite.browser?.close(); } );

	/**
	 * Open an empty page with the bundle loaded, collecting page errors and selected console
	 * messages. The caller closes the page.
	 */
	suite.open = async ( bundle, openOptions = {} ) => {
		const page = await suite.browser.newPage();
		const errors = [];
		const messages = [];
		page.on( "pageerror", error => errors.push( error.message ) );
		if( options.console ) {
			page.on( "console", message => {
				if( options.console( message ) ) { messages.push( message.text() ); }
			} );
		}
		await page.setContent( openOptions.html || options.html || EMPTY_PAGE );
		if( options.beforeLoad ) {
			await page.evaluate( options.beforeLoad );
		}
		if( openOptions.load !== false ) {
			for( const content of suite.scripts[ bundle ] ) {
				await page.addScriptTag( { "content": content } );
			}
		}
		return { page, errors, messages };
	};

	/**
	 * Run a scenario in a fresh page and return its result.
	 *
	 * @param {string} bundle - "full" or "lite".
	 * @param {Function} fn - Page function; receives `arg`.
	 * @param {*} [arg] - Serializable argument for `fn` and `options.setup`.
	 * @param {Object} [expected] - Expected `errors` (page errors) and `console` messages.
	 */
	suite.probe = async ( bundle, fn, arg, expected = {} ) => {
		const { page, errors, messages } = await suite.open( bundle );
		let timer;
		try {
			await page.evaluate( () => $.ready() );
			if( options.setup ) {
				await page.evaluate( options.setup, arg );
			}
			let run = page.evaluate( fn, arg );
			if( options.timeout ) {
				run = Promise.race( [ run, new Promise( ( resolve, reject ) => {
					timer = setTimeout(
						() => reject( new Error( "Browser scenario timed out" ) ), options.timeout
					);
				} ) ] );
			}
			const result = await run;
			if( options.settle === "frame" ) {
				await page.evaluate( () => new Promise( resolve => requestAnimationFrame( resolve ) ) );
			} else {
				// Cross a task boundary to observe errors from all queued microtasks.
				await page.evaluate( () => new Promise( resolve => setTimeout( resolve, 0 ) ) );
			}
			if( options.finish ) {
				await page.evaluate( options.finish );
			}
			g_assert.deepEqual( errors, expected.errors || [] );
			g_assert.deepEqual( messages, expected.console || [] );
			return result;
		} finally {
			clearTimeout( timer );
			await page.close();
		}
	};

	return suite;
}

export { BUNDLES, buildSource, buildBundles, createSourceContext, useBrowserBundles };
