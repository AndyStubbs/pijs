/**
 * Pi.js Build Script
 * 
 * Builds Pi.js using esbuild for ESM and IIFE formats.
 */

const esbuild = require( "esbuild" );
const fs = require( "fs" );
const path = require( "path" );
const zlib = require( "zlib" );
const { buildPlugin } = require( "./build-plugin.js" );

// Read version from package.json (single source of truth)
const pkg = require( "../package.json" );
const version = pkg.version;
const majorVersion = pkg.majorVersion;

// Determine source directory and version from command line args
const args = process.argv.slice( 2 );
const buildType = args[ 0 ] || "default";
let sourceDir = "src";
let buildVersion = version;

if( buildType === "alpha-0" ) {
	sourceDir = "src-pi-2.0.0-alpha.0";
	buildVersion = "2.0.0-alpha.0";
} else if( buildType === "alpha-1" ) {
	sourceDir = "src-pi-2.0.0-alpha.1";
	buildVersion = "2.0.0-alpha.1";
}

// Generate banner for full version (includes core + plugins)
function getFullBanner( version ) {
	return `/**
 * Pi.js Graphics Library - Full Version
 * 
 * A powerful, lightweight JavaScript graphics library for web applications.
 * This version includes the complete core functionality plus additional
 * plugins for extended features.
 * 
 * @version ${version}
 * @author Andy Stubbs
 * @license Apache-2.0
 * 
 * Features:
 * - Core graphics rendering engine
 * - Screen management and canvas operations
 * - Shape drawing and transformations
 * - Image loading and manipulation
 * - Plugin system with bundled plugins:
 *		gamepad: Gamepad input handling
 *		keyboard: Keyboard input handling
 *		sound: Music playback and sound effects
 *		pointer: Mouse, touch, and press handling
 * 
 * For the core-only version, use pi.lite.js
 */`;
}

// Generate banner for lite version (core only, no plugins)
function getLiteBanner( version ) {
	return `/**
 * Pi.js Graphics Library - Lite Version
 * 
 * A powerful, lightweight JavaScript graphics library for web applications.
 * This is the core-only version without plugins for minimal bundle size.
 * 
 * @version ${version}
 * @author Andy Stubbs
 * @license Apache-2.0
 * 
 * Features:
 * - Core graphics rendering engine
 * - Screen management and canvas operations
 * - Shape drawing and transformations
 * - Image loading and manipulation
 * 
 * For the full version with plugins, use pi.js
 */`;
}

// Ensure build directory exists
const buildDir = path.join( __dirname, "../build" );
if( !fs.existsSync( buildDir ) ) {
	fs.mkdirSync( buildDir, { "recursive": true } );
}

// Plugin to inject version
const injectVersionPlugin = {
	"name": "inject-version",
	"setup"( build ) {
		build.onLoad( { "filter": /index(-full)?\.js$/ }, async ( args ) => {
			const contents = await fs.promises.readFile( args.path, "utf8" );

			// Replace __VERSION__ with actual version
			const transformed = contents.replace( /__VERSION__/g, `"${buildVersion}"` );
			return { "contents": transformed, "loader": "js" };
		} );
	}
};

// Plugin to import .webp files as BASE64 encoded strings
const webpBase64Plugin = {
	"name": "webp-base64",
	"setup"( build ) {

		// This loader handles modules in our custom namespace
		build.onLoad( { "filter": /\.webp$/ }, async ( args ) => {
			try {

				// Read the file as a buffer
				const fileBuffer = await fs.promises.readFile( args.path );
				
				// Convert to base64
				const base64String = fileBuffer.toString( "base64" );
				
				// Return as a data URL string
				const contents = `export default { "data": "data:image/webp;base64,${base64String}" };`;
				
				return {
					"contents": contents,
					"loader": "js"
				};
			} catch( error ) {
				return {
					"errors": [ {
						"text": `Failed to load .webp file: ${error.message}`,
						"location": {
							"file": args.path,
							"line": 1,
							"column": 0
						}
					} ]
				};
			}
		} );
	}
};

function getBuildOptions( entryFile, banner ) {
	return {
		"entryPoints": [ path.join( __dirname, "..", sourceDir, entryFile ) ],
		"bundle": true,
		"sourcemap": true,
		"banner": { "js": banner },
		"target": "es2020",
		"platform": "browser",
		"plugins": [ injectVersionPlugin, webpBase64Plugin ],
		"loader": { ".vert": "text", ".frag": "text" },
		"sourceRoot": `../${sourceDir}/`,
		"legalComments": "none"
	};
}


async function buildAllPlugins() {
	const pluginsDir = path.join( __dirname, "..", "plugins" );

	// Check if plugins directory exists
	if( !fs.existsSync( pluginsDir ) ) {
		return;
	}

	// Get all directories in plugins folder
	const entries = fs.readdirSync( pluginsDir, { "withFileTypes": true } );
	const pluginDirs = entries
		.filter( entry => entry.isDirectory() )
		.map( entry => entry.name );

	if( pluginDirs.length === 0 ) {
		return;
	}

	console.log( "" );
	console.log( `Building plugins...` );

	let builtCount = 0;
	for( const pluginName of pluginDirs ) {
		const pluginDir = path.join( pluginsDir, pluginName );
		const success = await buildPlugin( pluginName, {
			"pluginDir": pluginDir,
			"plugins": [ webpBase64Plugin ],
			"verbose": false,
			"majorVersion": majorVersion
		} );
		if( success ) {
			builtCount++;
		}
	}

	if( builtCount > 0 ) {
		console.log( `  ✓ Built ${builtCount} plugin(s)` );
	} else {
		console.log( `  No buildable plugins found (plugins need an index.js file)` );
	}
}

async function buildPiVersion( versionName, entryFile, outputPrefix ) {
	// Determine which banner to use based on entry file
	let banner;
	if( entryFile === "index-full.js" ) {
		banner = getFullBanner( buildVersion );
	} else {
		banner = getLiteBanner( buildVersion );
	}
	
	const buildOptions = getBuildOptions( entryFile, banner );

	console.log( `  Building ${versionName} ESM...` );
	await esbuild.build( {
		...buildOptions,
		"format": "esm",
		"minify": true,
		"outfile": path.join( buildDir, `${outputPrefix}.esm.min.js` )
	} );

	console.log( `  Building ${versionName} ESM (unminified)...` );
	await esbuild.build( {
		...buildOptions,
		"format": "esm",
		"minify": false,
		"outfile": path.join( buildDir, `${outputPrefix}.esm.js` )
	} );

	console.log( `  Building ${versionName} IIFE...` );
	await esbuild.build( {
		...buildOptions,
		"format": "iife",
		"minify": true,
		"outfile": path.join( buildDir, `${outputPrefix}.min.js` )
	} );

	console.log( `  Building ${versionName} IIFE (unminified)...` );
	await esbuild.build( {
		...buildOptions,
		"format": "iife",
		"minify": false,
		"outfile": path.join( buildDir, `${outputPrefix}.js` )
	} );
}

async function build() {
	console.log( `Building Pi.js v${buildVersion} from ${sourceDir}...` );

	try {
		// Build all plugins first
		await buildAllPlugins();

		// Build LITE version (core only, no plugins)
		console.log( "" );
		console.log( "Building Pi.js Lite (core only)..." );
		await buildPiVersion( "lite", "index.js", "pi.lite" );

		// Build FULL version (core + plugins)
		console.log( "" );
		console.log( "Building Pi.js Full (with plugins)..." );
		await buildPiVersion( "full", "index-full.js", "pi" );

		console.log( "" );
		console.log( "✓ Build completed successfully!" );
		console.log( "" );
		console.log( "Output files:" );
		console.log( "  Full version (with plugins):" );
		console.log( `    - build/pi.js (IIFE, unminified with sourcemaps)` );
		console.log( `    - build/pi.min.js (IIFE, minified)` );
		console.log( `    - build/pi.esm.js (ESM, unminified with sourcemaps)` );
		console.log( `    - build/pi.esm.min.js (ESM, minified)` );
		console.log( "  Lite version (core only):" );
		console.log( `    - build/pi.lite.js (IIFE, unminified with sourcemaps)` );
		console.log( `    - build/pi.lite.min.js (IIFE, minified)` );
		console.log( `    - build/pi.lite.esm.js (ESM, unminified with sourcemaps)` );
		console.log( `    - build/pi.lite.esm.min.js (ESM, minified)` );

		// Print file sizes
		const files = [
			{ "name": "pi.js", "label": "Full (unminified)" },
			{ "name": "pi.min.js", "label": "Full (minified)" },
			{ "name": "pi.esm.js", "label": "Full (ESM unminified)" },
			{ "name": "pi.esm.min.js", "label": "Full (ESM minified)" },
			{ "name": "pi.lite.js", "label": "Lite (unminified)" },
			{ "name": "pi.lite.min.js", "label": "Lite (minified)" },
			{ "name": "pi.lite.esm.js", "label": "Lite (ESM unminified)" },
			{ "name": "pi.lite.esm.min.js", "label": "Lite (ESM minified)" }
		];

		console.log( "" );
		console.log( "File sizes:" );
		files.forEach( file => {
			const filePath = path.join( buildDir, file.name );
			if( fs.existsSync( filePath ) ) {
				const buffer = fs.readFileSync( filePath );
				const sizeKB = ( buffer.length / 1024 ).toFixed( 2 );
				let gzipKB = "n/a";
				try {
					const gzipBuffer = zlib.gzipSync(
						buffer, { "level": zlib.constants.Z_BEST_COMPRESSION }
					);
					gzipKB = ( gzipBuffer.length / 1024 ).toFixed( 2 );
				} catch( gzipError ) {
					console.warn( `  ⚠️ Unable to gzip ${file.name}: ${gzipError.message}` );
				}
				console.log( `  ${file.label} (${file.name}): ${sizeKB} KB (gzip ≈ ${gzipKB} KB)` );
			}
		} );

	} catch( error ) {
		console.error( "✗ Build failed:", error );
		process.exit( 1 );
	}
}

build();

