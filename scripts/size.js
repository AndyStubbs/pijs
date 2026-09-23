/**
 * Pi.js Size Report
 *
 * Builds the release bundles in memory and writes build/size-report.json with minified and
 * gzipped sizes for the main bundles, every plugin, and differential variants.
 *
 * Gzip savings depend on shared context, so a module's compressed cost is not additive and
 * cannot be read from esbuild metafile byte counts. Differential measurements build a variant
 * bundle and compare its gzipped size with a base bundle instead.
 *
 * Usage: npm run size [-- --out=path/to/report.json]
 */
import * as g_esbuild from "esbuild";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_build from "./build.js";
import * as g_buildPlugin from "./build-plugin.js";
import * as g_sizeUtils from "./size-utils.js";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const ROOT_DIR = g_path.join( DIRNAME, ".." );
const BUILD_DIR = g_path.join( ROOT_DIR, "build" );
const PLUGINS_DIR = g_path.join( ROOT_DIR, "plugins" );
const DEFAULT_REPORT_FILE = g_path.join( BUILD_DIR, "size-report.json" );
const ADVANCED_PLUGIN = "sound-advanced";

const MAIN_BUNDLES = [
	{ "name": "pi.min.js", "entry": "index-full.js", "getBanner": g_build.getFullBanner },
	{ "name": "pi.lite.min.js", "entry": "index.js", "getBanner": g_build.getLiteBanner }
];

const REPORT_NOTES = [
	"Sizes are bytes of the minified IIFE bundle and its gzip level 9 compression.",
	"Marginal costs are not additive: gzip shares context across modules. Compare them with " +
		"the plugin total and the full-merge cost."
];

/**
 * Differential measurements. Each entry compares a variant with a base bundle.
 *
 * - kind "marginal": base minus variant, where the variant omits one module or group.
 *   Groups list their dependent modules in "members".
 * - kind "promotion": variant minus base, where the variant merges a module into core.
 * - kind "fullMerge": variant minus base, where the variant merges a whole plugin into pi.js.
 *
 * base is "bundle:<name>", "plugin:<name>", or a variant spec. A variant spec is
 * { "label", "contents", "banner" }, where contents is an ES module entry resolved from the
 * repository root.
 */
const DIFFERENTIALS = [];

/**
 * Returns the differential entries that apply to the current source tree.
 *
 * @returns {Object[]} Differential entries
 */
function getDifferentials() {
	const differentials = [ ...DIFFERENTIALS ];
	if( g_fs.existsSync( g_path.join( PLUGINS_DIR, ADVANCED_PLUGIN, "index.js" ) ) ) {
		differentials.push( {
			"name": `${ADVANCED_PLUGIN} full merge`,
			"kind": "fullMerge",
			"base": "bundle:pi.min.js",
			"variant": {
				"label": `pi.min.js + ${ADVANCED_PLUGIN}`,
				"contents": `import "./src/index-full.js";\n` +
					`import "./plugins/${ADVANCED_PLUGIN}/index.js";\n`,
				"banner": g_build.getFullBanner( readPackageVersion() )
			}
		} );
	}
	return differentials;
}

function readPackageVersion() {
	const pkg = JSON.parse( g_fs.readFileSync( g_path.join( ROOT_DIR, "package.json" ), "utf8" ) );
	return pkg.version;
}

/**
 * Builds a minified IIFE bundle in memory with release options and returns its JavaScript.
 *
 * The output keeps the source map comment so sizes match the files npm run build writes.
 *
 * @param {Object} options - esbuild options without format, minify, or output settings
 * @param {string} outName - Output file name used for the source map comment
 * @returns {Promise<string>} Bundle text
 */
async function bundleInMemory( options, outName ) {
	const result = await g_esbuild.build( {
		...options,
		"format": "iife",
		"minify": true,
		"write": false,
		"outfile": g_path.join( BUILD_DIR, outName )
	} );
	const output = result.outputFiles.find( file => file.path.endsWith( ".js" ) );
	return output.text;
}

/**
 * Measures a main bundle.
 *
 * @param {Object} bundle - Entry from MAIN_BUNDLES
 * @returns {Promise<{ bytes: number, gzip: number }>} Sizes
 */
async function measureMainBundle( bundle ) {
	const banner = bundle.getBanner( readPackageVersion() );
	const text = await bundleInMemory(
		g_build.getBuildOptions( bundle.entry, banner ), bundle.name
	);
	return g_sizeUtils.measureContents( text );
}

/**
 * Measures a plugin's minified IIFE bundle.
 *
 * @param {string} pluginName - Plugin directory name
 * @returns {Promise<{ version: string|null, bytes: number, gzip: number }>} Sizes
 */
async function measurePlugin( pluginName ) {
	const pluginDir = g_path.join( PLUGINS_DIR, pluginName );
	const bannerData = g_buildPlugin.readBannerData( pluginDir );
	let banner = null;
	let version = null;
	if( bannerData ) {
		banner = g_buildPlugin.formatPluginBanner( bannerData );
		version = bannerData.version;
	}
	const options = g_buildPlugin.getPluginBuildOptions(
		g_path.join( pluginDir, "index.js" ), [ g_build.webpBase64Plugin ], banner
	);
	const text = await bundleInMemory( options, `${pluginName}.min.js` );
	return { "version": version, ...g_sizeUtils.measureContents( text ) };
}

/**
 * Measures a variant bundle built from an in-memory entry module.
 *
 * @param {{ label: string, contents: string, banner?: string }} spec - Variant spec
 * @returns {Promise<{ label: string, bytes: number, gzip: number }>} Sizes
 */
async function measureVariant( spec ) {
	const options = {
		"stdin": {
			"contents": spec.contents,
			"resolveDir": ROOT_DIR,
			"sourcefile": `${spec.label}.js`,
			"loader": "js"
		},
		"bundle": true,
		"sourcemap": true,
		"target": "es2020",
		"platform": "browser",
		"plugins": [ g_build.injectVersionPlugin, g_build.webpBase64Plugin ],
		"loader": { ".vert": "text", ".frag": "text" },
		"legalComments": "none"
	};
	if( spec.banner ) {
		options.banner = { "js": spec.banner };
	}
	const text = await bundleInMemory( options, "variant.min.js" );
	return { "label": spec.label, ...g_sizeUtils.measureContents( text ) };
}

/**
 * Computes one differential cost from measured base and variant sizes.
 *
 * @param {string} kind - "marginal", "promotion", or "fullMerge"
 * @param {number} baseGzip - Gzipped base size
 * @param {number} variantGzip - Gzipped variant size
 * @returns {number} Cost in gzipped bytes
 */
function computeDifferentialCost( kind, baseGzip, variantGzip ) {
	if( kind === "marginal" ) {
		return baseGzip - variantGzip;
	}
	if( kind === "promotion" || kind === "fullMerge" ) {
		return variantGzip - baseGzip;
	}
	throw new TypeError( `computeDifferentialCost: unknown kind "${kind}".` );
}

async function resolveBase( base, report ) {
	if( typeof base === "string" && base.startsWith( "bundle:" ) ) {
		return { "label": base, ...report.bundles[ base.slice( 7 ) ] };
	}
	if( typeof base === "string" && base.startsWith( "plugin:" ) ) {
		return { "label": base, ...report.plugins[ base.slice( 7 ) ] };
	}
	return measureVariant( base );
}

function listPlugins() {
	return g_fs.readdirSync( PLUGINS_DIR, { "withFileTypes": true } )
		.filter( entry => entry.isDirectory() )
		.filter( entry => g_fs.existsSync( g_path.join( PLUGINS_DIR, entry.name, "index.js" ) ) )
		.map( entry => entry.name )
		.sort();
}

/**
 * Builds the complete size report.
 *
 * @param {Object} [options] - Report options
 * @param {Object[]} [options.differentials] - Differential entries; defaults to the tree's own
 * @param {string[]} [options.plugins] - Plugin names; defaults to every buildable plugin
 * @returns {Promise<Object>} Size report
 */
async function createSizeReport( options = {} ) {
	const differentials = options.differentials || getDifferentials();
	const pluginNames = options.plugins || listPlugins();
	const report = {
		"version": readPackageVersion(),
		"generatedAt": new Date().toISOString(),
		"gzipLevel": g_sizeUtils.GZIP_LEVEL,
		"bundles": {},
		"plugins": {},
		"differentials": [],
		"notes": REPORT_NOTES
	};

	for( const bundle of MAIN_BUNDLES ) {
		report.bundles[ bundle.name ] = await measureMainBundle( bundle );
	}
	for( const pluginName of pluginNames ) {
		report.plugins[ pluginName ] = await measurePlugin( pluginName );
	}
	for( const differential of differentials ) {
		const base = await resolveBase( differential.base, report );
		const variant = await measureVariant( differential.variant );
		const entry = {
			"name": differential.name,
			"kind": differential.kind,
			"base": base.label,
			"baseGzip": base.gzip,
			"variant": variant.label,
			"variantGzip": variant.gzip,
			"cost": computeDifferentialCost( differential.kind, base.gzip, variant.gzip )
		};
		if( differential.members ) {
			entry.members = [ ...differential.members ];
		}
		report.differentials.push( entry );
	}
	return report;
}

function printReport( report ) {
	const format = g_sizeUtils.formatSize;
	console.log( `Pi.js ${report.version} size report` );
	console.log( "" );
	console.log( "Bundles:" );
	for( const [ name, size ] of Object.entries( report.bundles ) ) {
		console.log( `  ${name}: ${format( size.bytes )} (gzip ${format( size.gzip )})` );
	}
	console.log( "" );
	console.log( "Plugins:" );
	for( const [ name, size ] of Object.entries( report.plugins ) ) {
		let label = name;
		if( size.version ) {
			label = `${name} ${size.version}`;
		}
		console.log( `  ${label}: ${format( size.bytes )} (gzip ${format( size.gzip )})` );
	}
	console.log( "" );
	console.log( "Differentials:" );
	if( report.differentials.length === 0 ) {
		console.log( "  none defined" );
	}
	for( const entry of report.differentials ) {
		console.log( `  ${entry.kind} ${entry.name}: ${format( entry.cost )} gzip` );
	}
	console.log( "" );
	for( const note of report.notes ) {
		console.log( `Note: ${note}` );
	}
}

function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	return g_url.pathToFileURL( g_path.resolve( entry ) ).href === import.meta.url;
}

if( isMainModule() ) {
	const outArg = process.argv.find( arg => arg.startsWith( "--out=" ) );
	let outFile = DEFAULT_REPORT_FILE;
	if( outArg ) {
		outFile = g_path.resolve( outArg.slice( 6 ) );
	}
	try {
		const report = await createSizeReport();
		g_fs.mkdirSync( g_path.dirname( outFile ), { "recursive": true } );
		g_fs.writeFileSync( outFile, `${JSON.stringify( report, null, "\t" )}\n`, "utf8" );
		printReport( report );
		console.log( "" );
		console.log( `✓ Wrote ${g_path.relative( ROOT_DIR, outFile )}` );
	} catch( error ) {
		console.error( "✗ Size report failed:", error );
		process.exit( 1 );
	}
}

export { computeDifferentialCost, createSizeReport, measurePlugin, measureVariant };
