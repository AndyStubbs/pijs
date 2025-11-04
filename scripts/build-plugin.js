/**
 * Pi.js Plugin Build Script
 * 
 * Builds a plugin in ESM and IIFE formats using esbuild.
 * 
 * Usage: node scripts/build-plugin.js <plugin-name>
 * Example: node scripts/build-plugin.js my-plugin
 * 
 * TODO: Main build script also builds plugins but keeping this to easily build plugins individually
 * However, it would probably be better to not have to maintain two build scripts so I need to
 * make this a module and let the main script import this as an export and have a separate launcher
 * for build plugins.
 */

const esbuild = require( "esbuild" );
const fs = require( "fs" );
const path = require( "path" );

async function buildPlugin( pluginName ) {
	const pluginDir = path.join( __dirname, "..", "plugins", pluginName );
	const entryPoint = path.join( pluginDir, "index.js" );

	// Check if plugin directory exists
	if( !fs.existsSync( pluginDir ) ) {
		console.error( `✗ Plugin directory not found: ${pluginDir}` );
		console.error( `  Make sure the plugin exists in plugins/${pluginName}/` );
		process.exit( 1 );
	}

	// Check if entry point exists
	if( !fs.existsSync( entryPoint ) ) {
		console.error( `✗ Entry point not found: ${entryPoint}` );
		console.error( `  Plugin must have an index.js file` );
		process.exit( 1 );
	}

	console.log( `Building plugin: ${pluginName}...` );

	// Create dist directory
	const distDir = path.join( pluginDir, "dist" );
	if( !fs.existsSync( distDir ) ) {
		fs.mkdirSync( distDir, { "recursive": true } );
	}

	const buildOptions = {
		"entryPoints": [ entryPoint ],
		"bundle": true,
		"sourcemap": true,
		"target": "es2020",
	"platform": "browser",
	"loader": { ".vert": "text", ".frag": "text" }
	};

	try {
		// Build ESM (unminified)
		console.log( "  Building ESM..." );
		await esbuild.build( {
			...buildOptions,
			"format": "esm",
			"minify": false,
			"outfile": path.join( distDir, `${pluginName}.esm.js` )
		} );

		// Build ESM (minified)
		console.log( "  Building ESM (minified)..." );
		await esbuild.build( {
			...buildOptions,
			"format": "esm",
			"minify": true,
			"outfile": path.join( distDir, `${pluginName}.esm.min.js` )
		} );

		// Build IIFE (unminified)
		console.log( "  Building IIFE..." );
		await esbuild.build( {
			...buildOptions,
			"format": "iife",
			"minify": false,
			"outfile": path.join( distDir, `${pluginName}.js` )
		} );

		// Build IIFE (minified)
		console.log( "  Building IIFE (minified)..." );
		await esbuild.build( {
			...buildOptions,
			"format": "iife",
			"minify": true,
			"outfile": path.join( distDir, `${pluginName}.min.js` )
		} );

		console.log( `✓ Successfully built plugin: ${pluginName}` );
		console.log( "" );
		console.log( "Output files:" );
		console.log( `  - plugins/${pluginName}/dist/${pluginName}.esm.js (ESM)` );
		console.log( `  - plugins/${pluginName}/dist/${pluginName}.esm.min.js (ESM, minified)` );
		console.log( `  - plugins/${pluginName}/dist/${pluginName}.js (IIFE)` );
		console.log( `  - plugins/${pluginName}/dist/${pluginName}.min.js (IIFE, minified)` );

		// Print file sizes
		const files = [
			{ "name": `${pluginName}.esm.js`, "label": "ESM" },
			{ "name": `${pluginName}.esm.min.js`, "label": "ESM (min)" },
			{ "name": `${pluginName}.js`, "label": "IIFE" },
			{ "name": `${pluginName}.min.js`, "label": "IIFE (min)" }
		];

		console.log( "" );
		console.log( "File sizes:" );
		files.forEach( file => {
			const filePath = path.join( distDir, file.name );
			if( fs.existsSync( filePath ) ) {
				const stats = fs.statSync( filePath );
				const sizeKB = ( stats.size / 1024 ).toFixed( 2 );
				console.log( `  ${file.label}: ${sizeKB} KB` );
			}
		} );

	} catch( error ) {
		console.error( "✗ Build failed:", error );
		process.exit( 1 );
	}
}

// Get plugin name from command line
const pluginName = process.argv[ 2 ];

if( !pluginName ) {
	console.error( "✗ No plugin name provided" );
	console.error( "" );
	console.error( "Usage: node scripts/build-plugin.js <plugin-name>" );
	console.error( "" );
	console.error( "Example:" );
	console.error( "  node scripts/build-plugin.js my-plugin" );
	console.error( "" );
	process.exit( 1 );
}

buildPlugin( pluginName );


