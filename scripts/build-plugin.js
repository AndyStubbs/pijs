/**
 * Pi.js Plugin Build Script
 * 
 * Builds a plugin in ESM and IIFE formats using esbuild.
 * Can be used as a module or run standalone.
 * 
 * Usage (standalone): node scripts/build-plugin.js <plugin-name>
 * Example: node scripts/build-plugin.js my-plugin
 * 
 * Usage (as module): const { buildPlugin } = require( "./build-plugin.js" );
 */

const esbuild = require( "esbuild" );
const fs = require( "fs" );
const path = require( "path" );

/**
 * Builds a plugin in ESM and IIFE formats
 * 
 * @param {string} pluginName - The name of the plugin to build
 * @param {Object} options - Optional configuration
 * @param {string} options.pluginDir - Custom plugin directory path (defaults to plugins/pluginName)
 * @param {Array} options.plugins - Array of esbuild plugins to use (defaults to [])
 * @param {boolean} options.verbose - Whether to output detailed information (defaults to true)
 * @returns {Promise<boolean>} Returns true if build succeeded, false otherwise
 */
async function buildPlugin( pluginName, options = {} ) {
	const {
		pluginDir: providedPluginDir,
		plugins = [],
		verbose = true
	} = options;

	// Determine plugin directory
	let pluginDir;
	if( providedPluginDir ) {
		pluginDir = providedPluginDir;
	} else {
		pluginDir = path.join( __dirname, "..", "plugins", pluginName );
	}

	const entryPoint = path.join( pluginDir, "index.js" );

	// Check if plugin directory exists
	if( !fs.existsSync( pluginDir ) ) {
		if( verbose ) {
			console.error( `✗ Plugin directory not found: ${pluginDir}` );
			console.error( `  Make sure the plugin exists in plugins/${pluginName}/` );
		}
		if( options.standalone ) {
			process.exit( 1 );
		}
		return false;
	}

	// Check if entry point exists
	if( !fs.existsSync( entryPoint ) ) {
		if( verbose ) {
			console.error( `✗ Entry point not found: ${entryPoint}` );
			console.error( `  Plugin must have an index.js file` );
		}
		if( options.standalone ) {
			process.exit( 1 );
		}
		return false;
	}

	// Create build/plugins/plugin-name directory
	const buildDir = path.join( __dirname, "..", "build", "plugins", pluginName );
	if( !fs.existsSync( buildDir ) ) {
		fs.mkdirSync( buildDir, { "recursive": true } );
	}

	if( verbose ) {
		console.log( `Building plugin: ${pluginName}...` );
	} else {
		console.log( `  Building plugin: ${pluginName}...` );
	}

	const buildOptions = {
		"entryPoints": [ entryPoint ],
		"bundle": true,
		"sourcemap": true,
		"target": "es2020",
		"platform": "browser",
		"loader": { ".vert": "text", ".frag": "text" },
		"plugins": plugins,
		"legalComments": "inline"
	};

	try {
		// Build ESM (unminified)
		if( verbose ) {
			console.log( "  Building ESM..." );
		}
		await esbuild.build( {
			...buildOptions,
			"format": "esm",
			"minify": false,
			"outfile": path.join( buildDir, `${pluginName}.esm.js` )
		} );

		// Build ESM (minified)
		if( verbose ) {
			console.log( "  Building ESM (minified)..." );
		}
		await esbuild.build( {
			...buildOptions,
			"format": "esm",
			"minify": true,
			"outfile": path.join( buildDir, `${pluginName}.esm.min.js` )
		} );

		// Build IIFE (unminified)
		if( verbose ) {
			console.log( "  Building IIFE..." );
		}
		await esbuild.build( {
			...buildOptions,
			"format": "iife",
			"minify": false,
			"outfile": path.join( buildDir, `${pluginName}.js` )
		} );

		// Build IIFE (minified)
		if( verbose ) {
			console.log( "  Building IIFE (minified)..." );
		}
		await esbuild.build( {
			...buildOptions,
			"format": "iife",
			"minify": true,
			"outfile": path.join( buildDir, `${pluginName}.min.js` )
		} );

		if( verbose ) {
			console.log( `✓ Successfully built plugin: ${pluginName}` );
			console.log( "" );
			console.log( "Output files:" );
			console.log( `  - build/plugins/${pluginName}/${pluginName}.esm.js (ESM)` );
			console.log( `  - build/plugins/${pluginName}/${pluginName}.esm.min.js (ESM, minified)` );
			console.log( `  - build/plugins/${pluginName}/${pluginName}.js (IIFE)` );
			console.log( `  - build/plugins/${pluginName}/${pluginName}.min.js (IIFE, minified)` );

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
				const filePath = path.join( buildDir, file.name );
				if( fs.existsSync( filePath ) ) {
					const stats = fs.statSync( filePath );
					const sizeKB = ( stats.size / 1024 ).toFixed( 2 );
					console.log( `  ${file.label}: ${sizeKB} KB` );
				}
			} );
		} else {
			// Calculate sizes for non-verbose mode (used by build.js)
			const files = [
				`${pluginName}.esm.js`,
				`${pluginName}.esm.min.js`,
				`${pluginName}.js`,
				`${pluginName}.min.js`
			];

			let minifiedSize = 0;
			files.forEach( file => {
				const filePath = path.join( buildDir, file );
				if( fs.existsSync( filePath ) && file.includes( ".min." ) ) {
					const size = fs.statSync( filePath ).size;
					minifiedSize += size;
				}
			} );

			const minSizeKB = ( minifiedSize / 1024 ).toFixed( 2 );
			console.log( `    ✓ ${pluginName} (${minSizeKB} KB minified)` );
		}

		return true;

	} catch( error ) {
		if( verbose ) {
			console.error( "✗ Build failed:", error );
		} else {
			console.error( `    ✗ Failed to build ${pluginName}:`, error.message );
		}
		if( options.standalone ) {
			process.exit( 1 );
		}
		return false;
	}
}

// Export for use as module
module.exports = { buildPlugin };

// If run directly, execute as standalone script
if( require.main === module ) {
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

	buildPlugin( pluginName, { "standalone": true } );
}


