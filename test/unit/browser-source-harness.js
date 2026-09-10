/**
 * Serve fresh in-memory Pi.js bundles and repository fixtures through a browser context.
 */
"use strict";

const fs = require( "node:fs/promises" );
const path = require( "node:path" );
const esbuild = require( "esbuild" );
const root = path.resolve( __dirname, "../.." );
const version = require( "../../package.json" ).version;

/**
 * Bundle a source entry without generating build or release artifacts.
 *
 * @param {string} entry - Repository-relative JavaScript entry point.
 * @param {string} format - esbuild output format.
 * @returns {Promise<string>} Bundled JavaScript.
 */
async function buildSource( entry, format = "iife" ) {
	const result = await esbuild.build( {
		"entryPoints": [ path.join( root, entry ) ],
		"bundle": true,
		"write": false,
		"format": format,
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
			if( !bundles.has( entry ) ) {
				bundles.set( entry, buildSource( entry ) );
			}
			await route.fulfill( {
				"contentType": "application/javascript", "body": await bundles.get( entry )
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

module.exports = { "buildSource": buildSource, "createSourceContext": createSourceContext };
