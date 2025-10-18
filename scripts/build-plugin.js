/**
 * Pi.js Plugin Build Script
 * 
 * Builds a plugin in ESM, CJS, and IIFE formats using esbuild.
 * 
 * Usage: node scripts/build-plugin.js <plugin-name>
 * Example: node scripts/build-plugin.js my-plugin
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

	const buildOptions = {
		"entryPoints": [ entryPoint ],
		"bundle": true,
		"sourcemap": true,
		"target": "es2020",
		"platform": "browser"
	};

	try {
		// Build ESM version
		console.log( "  Building ESM..." );
		await esbuild.build( {
			...buildOptions,
			"format": "esm",
			"outfile": path.join( pluginDir, `${pluginName}.esm.js` )
		} );

		// Build CJS version
		console.log( "  Building CJS..." );
		await esbuild.build( {
			...buildOptions,
			"format": "cjs",
			"outfile": path.join( pluginDir, `${pluginName}.cjs.js` )
		} );

		// Build IIFE version
		console.log( "  Building IIFE..." );
		await esbuild.build( {
			...buildOptions,
			"format": "iife",
			"outfile": path.join( pluginDir, `${pluginName}.js` )
		} );

		console.log( `✓ Successfully built plugin: ${pluginName}` );
		console.log( "" );
		console.log( "Output files:" );
		console.log( `  - plugins/${pluginName}/${pluginName}.esm.js (ESM)` );
		console.log( `  - plugins/${pluginName}/${pluginName}.cjs.js (CJS)` );
		console.log( `  - plugins/${pluginName}/${pluginName}.js (IIFE)` );

		// Print file sizes
		const files = [
			`${pluginName}.esm.js`,
			`${pluginName}.cjs.js`,
			`${pluginName}.js`
		];

		console.log( "" );
		console.log( "File sizes:" );
		files.forEach( file => {
			const filePath = path.join( pluginDir, file );
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


