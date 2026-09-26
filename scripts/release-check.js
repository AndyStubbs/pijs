/**
 * Pi.js Release Version Check
 *
 * Verifies that a built release agrees on its versions (upgrade plan R.6): the tag, the root
 * package.json, releases/pi-latest/package.json, the @version banners of the library bundles,
 * the Version headers of the library declarations, and each plugin bundle's @version against
 * its plugins/<name>/banner.json. Every mismatch is reported, not only the first.
 *
 * Run after `npm run build`, which fills releases/pi-latest/dist.
 *
 * Usage: npm run release:check [-- --tag=v2.3.0]
 *
 * @module release-check
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const ROOT_DIR = g_path.join( DIRNAME, ".." );

// Banner text is read from the start of each file; banners are the first comment
const HEADER_LENGTH = 1024;

const VERSION_PATTERN = /^(\d+)\.(\d+)\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function readJson( filePath, problems, label ) {
	try {
		return JSON.parse( g_fs.readFileSync( filePath, "utf8" ) );
	} catch( error ) {
		problems.push( `${label}: cannot read (${error.message})` );
		return null;
	}
}

function readHeader( filePath ) {
	const handle = g_fs.openSync( filePath, "r" );
	try {
		const buffer = Buffer.alloc( HEADER_LENGTH );
		const length = g_fs.readSync( handle, buffer, 0, HEADER_LENGTH, 0 );
		return buffer.toString( "utf8", 0, length );
	} finally {
		g_fs.closeSync( handle );
	}
}

/**
 * Lists the bundle files of a directory: .js files, without source maps or declarations.
 *
 * @param {string} dirPath - Directory
 * @returns {string[]} File names
 */
function listBundles( dirPath ) {
	return g_fs.readdirSync( dirPath ).filter( name => name.endsWith( ".js" ) ).sort();
}

/**
 * Checks that a file's banner declares a version.
 *
 * @param {string} filePath - File
 * @param {string} label - Name for messages
 * @param {RegExp} pattern - Banner pattern whose first group is the version
 * @param {string} expected - Expected version
 * @param {string[]} problems - Collected problems
 * @returns {void}
 */
function checkBanner( filePath, label, pattern, expected, problems ) {
	const match = readHeader( filePath ).match( pattern );
	if( !match ) {
		problems.push( `${label}: no version banner` );
	} else if( match[ 1 ] !== expected ) {
		problems.push( `${label}: banner says ${match[ 1 ]}, expected ${expected}` );
	}
}

/**
 * Checks a built release's versions.
 *
 * @param {Object} [options] - Options
 * @param {string} [options.rootDir] - Repository root
 * @param {string} [options.tag] - Release tag, such as "v2.3.0"; omitted when there is none
 * @returns {{ version: string|null, problems: string[] }} The root version and every mismatch
 */
function checkRelease( options = {} ) {
	const rootDir = options.rootDir || ROOT_DIR;
	const problems = [];
	const pkg = readJson( g_path.join( rootDir, "package.json" ), problems, "package.json" );
	if( !pkg ) {
		return { "version": null, "problems": problems };
	}
	const version = pkg.version;
	const match = typeof version === "string" && version.match( VERSION_PATTERN );
	if( !match ) {
		problems.push( `package.json: invalid version ${JSON.stringify( version )}` );
		return { "version": null, "problems": problems };
	}
	const majorVersion = `${match[ 1 ]}.${match[ 2 ]}`;
	if( pkg.majorVersion !== majorVersion ) {
		problems.push(
			`package.json: majorVersion is ${pkg.majorVersion}, expected ${majorVersion}`
		);
	}
	if( options.tag !== undefined && options.tag !== `v${version}` ) {
		problems.push( `tag ${options.tag} does not match package.json version ${version}` );
	}

	const releaseDir = g_path.join( rootDir, "releases", "pi-latest" );
	const release = readJson(
		g_path.join( releaseDir, "package.json" ), problems, "releases/pi-latest/package.json"
	);
	if( release ) {
		for( const key of [ "version", "majorVersion" ] ) {
			if( release[ key ] !== pkg[ key ] ) {
				problems.push( `releases/pi-latest/package.json: ${key} is ${release[ key ]}, ` +
					`expected ${pkg[ key ]}` );
			}
		}
	}

	const distDir = g_path.join( releaseDir, "dist" );
	if( !g_fs.existsSync( distDir ) ) {
		problems.push( "releases/pi-latest/dist is missing. Run `npm run build` first." );
		return { "version": version, "problems": problems };
	}

	// Library bundles carry @version, and declarations the major version
	for( const name of listBundles( distDir ) ) {
		checkBanner( g_path.join( distDir, name ), `dist/${name}`, /@version (\S+)/, version,
			problems );
	}
	for( const name of [ "pi.d.ts", "pi.lite.d.ts" ] ) {
		const filePath = g_path.join( distDir, name );
		if( !g_fs.existsSync( filePath ) ) {
			problems.push( `dist/${name}: missing` );
			continue;
		}
		checkBanner( filePath, `dist/${name}`, /Version: pi-(\S+)/, majorVersion, problems );
	}

	// Each plugin's bundles carry the version in its banner.json
	const pluginsDir = g_path.join( distDir, "plugins" );
	let plugins = [];
	if( g_fs.existsSync( pluginsDir ) ) {
		plugins = g_fs.readdirSync( pluginsDir ).sort();
	}
	for( const name of plugins ) {
		const banner = readJson( g_path.join( rootDir, "plugins", name, "banner.json" ), problems,
			`plugins/${name}/banner.json` );
		if( !banner ) {
			continue;
		}
		const bundles = listBundles( g_path.join( pluginsDir, name ) );
		if( bundles.length === 0 ) {
			problems.push( `dist/plugins/${name}: no bundles` );
		}
		for( const bundle of bundles ) {
			checkBanner( g_path.join( pluginsDir, name, bundle ), `dist/plugins/${name}/${bundle}`,
				/@version (\S+)/, banner.version, problems );
		}
	}
	return { "version": version, "problems": problems };
}

function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	try {
		return g_fs.realpathSync( entry ) ===
			g_fs.realpathSync( g_url.fileURLToPath( import.meta.url ) );
	} catch( error ) {
		return false;
	}
}

if( isMainModule() ) {
	const tagArg = process.argv.find( arg => arg.startsWith( "--tag=" ) );
	let tag;
	if( tagArg ) {
		tag = tagArg.slice( 6 );
	}
	const result = checkRelease( { "tag": tag } );
	if( result.problems.length > 0 ) {
		console.error( "✗ Release versions disagree:" );
		for( const problem of result.problems ) {
			console.error( `  - ${problem}` );
		}
		process.exitCode = 1;
	} else {
		let tagText = "";
		if( tag !== undefined ) {
			tagText = `, tag ${tag}`;
		}
		console.log( `✓ Release versions agree: ${result.version}${tagText}` );
	}
}

export { checkRelease };
