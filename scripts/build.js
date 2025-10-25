/**
 * Pi.js Build Script
 * 
 * Builds Pi.js using esbuild for ESM and IIFE formats.
 */

const esbuild = require( "esbuild" );
const fs = require( "fs" );
const path = require( "path" );

// Read version from package.json (single source of truth)
const pkg = require( "../package.json" );
const version = pkg.version;

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

const banner = `/**
 * Pi.js - Graphics and Sound Library
 * @version ${buildVersion}
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
			const transformed = contents.replace( /__VERSION__/g, `"${buildVersion}"` );
			return { "contents": transformed, "loader": "js" };
		} );
	}
};

const buildOptions = {
	"entryPoints": [ path.join( __dirname, "..", sourceDir, "index.js" ) ],
	"bundle": true,
	"sourcemap": true,
	"banner": { "js": banner },
	"target": "es2020",
	"platform": "browser",
	"plugins": [ injectVersionPlugin ],
	"sourceRoot": `../${sourceDir}/`
};

async function buildPlugin( pluginName, pluginDir ) {
	const entryPoint = path.join( pluginDir, "index.js" );

	// Skip if no index.js exists
	if( !fs.existsSync( entryPoint ) ) {
		return false;
	}

	console.log( `  Building plugin: ${pluginName}...` );

	// Create dist directory
	const distDir = path.join( pluginDir, "dist" );
	if( !fs.existsSync( distDir ) ) {
		fs.mkdirSync( distDir, { "recursive": true } );
	}

	const pluginBuildOptions = {
		"entryPoints": [ entryPoint ],
		"bundle": true,
		"sourcemap": true,
		"target": "es2020",
		"platform": "browser"
	};

	try {
		// Build ESM (unminified)
		await esbuild.build( {
			...pluginBuildOptions,
			"format": "esm",
			"minify": false,
			"outfile": path.join( distDir, `${pluginName}.esm.js` )
		} );

		// Build ESM (minified)
		await esbuild.build( {
			...pluginBuildOptions,
			"format": "esm",
			"minify": true,
			"outfile": path.join( distDir, `${pluginName}.esm.min.js` )
		} );

		// Build IIFE (unminified)
		await esbuild.build( {
			...pluginBuildOptions,
			"format": "iife",
			"minify": false,
			"outfile": path.join( distDir, `${pluginName}.js` )
		} );

		// Build IIFE (minified)
		await esbuild.build( {
			...pluginBuildOptions,
			"format": "iife",
			"minify": true,
			"outfile": path.join( distDir, `${pluginName}.min.js` )
		} );

		// Calculate sizes
		const files = [
			`${pluginName}.esm.js`,
			`${pluginName}.esm.min.js`,
			`${pluginName}.js`,
			`${pluginName}.min.js`
		];

		let totalSize = 0;
		let minifiedSize = 0;
		files.forEach( file => {
			const filePath = path.join( distDir, file );
			if( fs.existsSync( filePath ) ) {
				const size = fs.statSync( filePath ).size;
				totalSize += size;
				if( file.includes( ".min." ) ) {
					minifiedSize += size;
				}
			}
		} );

		const minSizeKB = ( minifiedSize / 1024 ).toFixed( 2 );
		console.log( `    ✓ ${pluginName} (${minSizeKB} KB minified)` );

		return true;
	} catch( error ) {
		console.error( `    ✗ Failed to build ${pluginName}:`, error.message );
		return false;
	}
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
		const success = await buildPlugin( pluginName, pluginDir );
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

async function build() {
	console.log( `Building Pi.js v${buildVersion} from ${sourceDir}...` );

	try {
		// Build all plugins first
		await buildAllPlugins();

		// Build ESM version
		console.log( "" );
		console.log( "Building Pi.js..." );
		console.log( "Building ESM..." );
		await esbuild.build( {
			...buildOptions,
			"format": "esm",
			"minify": true,
			"outfile": path.join( buildDir, "pi.esm.min.js" )
		} );

		// Build IIFE version (for <script> tags)
		// Note: No globalName - we set window.pi manually in index.js
		console.log( "Building IIFE..." );
		await esbuild.build( {
			...buildOptions,
			"format": "iife",
			"minify": true,
			"outfile": path.join( buildDir, "pi.min.js" )
		} );

		// Build unminified IIFE version for debugging
		console.log( "Building IIFE (unminified)..." );
		const unminifiedOptions = {
			...buildOptions,
			"format": "iife",
			"minify": false,
			"outfile": path.join( buildDir, "pi.js" ),
		};
		await esbuild.build( unminifiedOptions );
		//console.log( unminifiedOptions );

		console.log( "✓ Build completed successfully!" );
		console.log( "" );
		console.log( "Output files:" );
		console.log( "  - build/pi.js (IIFE, unminified with sourcemaps)" );
		console.log( "  - build/pi.min.js (IIFE, minified)" );
		console.log( "  - build/pi.esm.min.js (ESM)" );

		// Print file sizes
		const files = [
			"pi.js",
			"pi.min.js",
			"pi.esm.min.js"
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

