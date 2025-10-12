/**
 * Pi.js Build Script
 * 
 * Builds Pi.js using esbuild for ESM, CJS, and IIFE formats.
 */

const esbuild = require( "esbuild" );
const fs = require( "fs" );
const path = require( "path" );

// Read version from package.json (single source of truth)
const pkg = require( "../package.json" );
const version = pkg.version;

const banner = `/**
 * Pi.js - Graphics and Sound Library
 * @version ${version}
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */`;

// Ensure build directory exists
const buildDir = path.join( __dirname, "../build" );
if( !fs.existsSync( buildDir ) ) {
	fs.mkdirSync( buildDir, { "recursive": true } );
}

// Plugin to inject version
const injectVersionPlugin = {
	"name": "inject-version",
	"setup"( build ) {
		build.onLoad( { "filter": /index\.js$/ }, async ( args ) => {
			const contents = await fs.promises.readFile( args.path, "utf8" );
			// Replace __VERSION__ with actual version
			const transformed = contents.replace( /__VERSION__/g, `"${version}"` );
			return { "contents": transformed, "loader": "js" };
		} );
	}
};

const buildOptions = {
	"entryPoints": [ path.join( __dirname, "../src/index.js" ) ],
	"bundle": true,
	"minify": true,
	"sourcemap": true,
	"banner": { "js": banner },
	"target": "es2020",
	"platform": "browser",
	"plugins": [ injectVersionPlugin ],
	"keepNames": true
};

async function build() {
	console.log( `Building Pi.js v${version}...` );

	try {
		// Build ESM version
		console.log( "Building ESM..." );
		await esbuild.build( {
			...buildOptions,
			"format": "esm",
			"outfile": path.join( buildDir, "pi.esm.min.js" )
		} );

		// Build CJS version
		console.log( "Building CJS..." );
		await esbuild.build( {
			...buildOptions,
			"format": "cjs",
			"outfile": path.join( buildDir, "pi.cjs.min.js" )
		} );

	// Build IIFE version (for <script> tags)
	// Note: No globalName - we set window.pi manually in index.js
	console.log( "Building IIFE..." );
	await esbuild.build( {
		...buildOptions,
		"format": "iife",
		"outfile": path.join( buildDir, "pi.min.js" )
	} );

	// Build unminified IIFE version for debugging
	console.log( "Building IIFE (unminified)..." );
	await esbuild.build( {
		...buildOptions,
		"format": "iife",
		"minify": false,
		"sourcemap": true,
		"outfile": path.join( buildDir, "pi.js" )
	} );

		console.log( "✓ Build completed successfully!" );
		console.log( "" );
		console.log( "Output files:" );
		console.log( "  - build/pi.js (IIFE, unminified with sourcemaps)" );
		console.log( "  - build/pi.min.js (IIFE, minified)" );
		console.log( "  - build/pi.esm.min.js (ESM)" );
		console.log( "  - build/pi.cjs.min.js (CJS)" );

		// Print file sizes
		const files = [
			"pi.js",
			"pi.min.js",
			"pi.esm.min.js",
			"pi.cjs.min.js"
		];

		console.log( "" );
		console.log( "File sizes:" );
		files.forEach( file => {
			const filePath = path.join( buildDir, file );
			if( fs.existsSync( filePath ) ) {
				const stats = fs.statSync( filePath );
				const sizeKB = ( stats.size / 1024 ).toFixed( 2 );
				console.log( `  ${file}: ${sizeKB} KB` );
			}
		} );

	} catch( error ) {
		console.error( "✗ Build failed:", error );
		process.exit( 1 );
	}
}

build();

