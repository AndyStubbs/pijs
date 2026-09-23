/**
 * Pi.js Plugin Build Script
 * 
 * Builds a plugin in ESM and IIFE formats using esbuild.
 * Can be used as a module or run standalone.
 * 
 * Usage (standalone): node scripts/build-plugin.js <plugin-name>
 * Example: node scripts/build-plugin.js my-plugin
 * 
 * Usage (as module): import { buildPlugin } from "./build-plugin.js";
 */
import * as g_esbuild from "esbuild";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	return g_url.pathToFileURL( g_path.resolve( entry ) ).href === import.meta.url;
}
const esbuild = g_esbuild;
const fs = g_fs;
const path = g_path;

/**
 * Reads a plugin's banner.json.
 *
 * @param {string} pluginDir - Plugin source directory
 * @returns {Object|null} Parsed banner data, or null when the plugin has no banner.json
 */
function readBannerData( pluginDir ) {
	const bannerPath = path.join( pluginDir, "banner.json" );
	if( !fs.existsSync( bannerPath ) ) {
		return null;
	}
	return JSON.parse( fs.readFileSync( bannerPath, "utf8" ) );
}

/**
 * Formats the license banner placed at the top of every plugin bundle.
 *
 * @param {Object} bannerData - Parsed banner.json contents
 * @returns {string} Banner comment
 */
function formatPluginBanner( bannerData ) {
	return `/**
 * ${bannerData.name} - ${bannerData.description}
 * @version ${bannerData.version}
 * @author ${bannerData.author}
 * @license ${bannerData.license}
 * @preserve
 */`;
}

/**
 * Returns the esbuild options shared by every plugin bundle format.
 *
 * @param {string} entryPoint - Plugin index.js path
 * @param {Array} plugins - esbuild plugins
 * @param {string|null} banner - Banner comment, or null for none
 * @returns {Object} esbuild options without format, minify, or outfile
 */
function getPluginBuildOptions( entryPoint, plugins, banner ) {
	const buildOptions = {
		"entryPoints": [ entryPoint ],
		"bundle": true,
		"sourcemap": true,
		"target": "es2020",
		"platform": "browser",
		"loader": { ".vert": "text", ".frag": "text" },
		"plugins": plugins,
		"legalComments": "none"
	};

	if( banner ) {
		buildOptions.banner = { "js": banner };
	}
	return buildOptions;
}

/**
 * Builds a plugin in ESM and IIFE formats
 * 
 * @param {string} pluginName - The name of the plugin to build
 * @param {Object} options - Optional configuration
 * @param {string} options.pluginDir - Custom plugin directory path (defaults to plugins/pluginName)
 * @param {Array} options.plugins - Array of esbuild plugins to use (defaults to [])
 * @param {boolean} options.verbose - Whether to output detailed information (defaults to true)
 * @param {string} options.majorVersion - Major version for output directory (defaults to reading from package.json)
 * @returns {Promise<boolean>} Returns true if build succeeded, false otherwise
 */
async function buildPlugin( pluginName, options = {} ) {
	const {
		pluginDir: providedPluginDir,
		plugins = [],
		verbose = true,
		majorVersion: providedMajorVersion
	} = options;

	// Get major version from options or package.json
	let majorVersion = providedMajorVersion;
	if( !majorVersion ) {
		const pkg = JSON.parse( g_fs.readFileSync( path.join( DIRNAME, "..", "package.json"  ), "utf8" ) );
		majorVersion = pkg.majorVersion;
	}

	// Determine plugin directory
	let pluginDir;
	if( providedPluginDir ) {
		pluginDir = providedPluginDir;
	} else {
		pluginDir = path.join( DIRNAME, "..", "plugins", pluginName );
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
	const buildDir = path.join( DIRNAME, "..", "build", "plugins", pluginName );
	if( !fs.existsSync( buildDir ) ) {
		fs.mkdirSync( buildDir, { "recursive": true } );
	}

	if( verbose ) {
		console.log( `Building plugin: ${pluginName}...` );
	} else {
		console.log( `  Building plugin: ${pluginName}...` );
	}

	// Read banner.json if it exists
	let banner = null;
	try {
		const bannerData = readBannerData( pluginDir );
		if( bannerData ) {
			banner = formatPluginBanner( bannerData );
		}
	} catch( error ) {
		if( verbose ) {
			console.warn( `  ⚠️  Failed to read banner.json: ${error.message}` );
		}
	}

	const buildOptions = getPluginBuildOptions( entryPoint, plugins, banner );

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
export { buildPlugin, formatPluginBanner, getPluginBuildOptions, readBannerData };

// If run directly, execute as standalone script
if( isMainModule() ) {
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

	// Read majorVersion from package.json for standalone mode
	const pkg = JSON.parse( g_fs.readFileSync( path.join( DIRNAME, "..", "package.json"  ), "utf8" ) );
	buildPlugin( pluginName, { 
		"standalone": true,
		"majorVersion": pkg.majorVersion
	} );
}

