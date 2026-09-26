/**
 * Pi.js Release Snapshot Script
 *
 * Copies releases/pi-latest/dist to the versioned snapshot releases/pi-<version>, named from
 * releases/pi-latest/package.json. An existing snapshot is never overwritten. The copy is
 * assembled in a staging directory and renamed into place, so a failed copy leaves no partial
 * snapshot.
 *
 * Usage: npm run snapshot
 *
 * @module snapshot
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const RELEASES_DIR = g_path.join( DIRNAME, "..", "releases" );

// A release version such as 2.3.0 or 2.3.0-beta.1; anything else could leave releases/
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * Counts the files in a directory tree.
 *
 * @param {string} dirPath - Directory
 * @returns {number} File count
 */
function countFiles( dirPath ) {
	let count = 0;
	for( const entry of g_fs.readdirSync( dirPath, { "withFileTypes": true } ) ) {
		if( entry.isDirectory() ) {
			count += countFiles( g_path.join( dirPath, entry.name ) );
		} else {
			count++;
		}
	}
	return count;
}

/**
 * Reads the release version from releases/pi-latest/package.json.
 *
 * @param {string} releasesDir - Releases directory
 * @returns {string} Version
 */
function readReleaseVersion( releasesDir ) {
	const packagePath = g_path.join( releasesDir, "pi-latest", "package.json" );
	let pkg;
	try {
		pkg = JSON.parse( g_fs.readFileSync( packagePath, "utf8" ) );
	} catch( error ) {
		throw new Error(
			`Cannot read releases/pi-latest/package.json: ${error.message}`, { "cause": error }
		);
	}
	if( typeof pkg.version !== "string" || !VERSION_PATTERN.test( pkg.version ) ) {
		throw new Error(
			`releases/pi-latest/package.json has no valid version: ${JSON.stringify( pkg.version )}.`
		);
	}
	return pkg.version;
}

/**
 * Copies releases/pi-latest/dist to releases/pi-<version>.
 *
 * @param {Object} [options] - Optional paths and dependencies for testing
 * @param {string} [options.releasesDir] - Releases directory
 * @param {Object} [options.logger] - Console-compatible logger
 * @returns {{ version: string, destination: string, files: number }} Snapshot
 */
function createSnapshot( options = {} ) {
	const releasesDir = options.releasesDir || RELEASES_DIR;
	const logger = options.logger || console;
	const version = readReleaseVersion( releasesDir );
	const distDir = g_path.join( releasesDir, "pi-latest", "dist" );
	const destination = g_path.join( releasesDir, `pi-${version}` );

	let distExists = false;
	try {
		distExists = g_fs.statSync( distDir ).isDirectory();
	} catch( error ) {
		distExists = false;
	}
	if( !distExists || countFiles( distDir ) === 0 ) {
		throw new Error( "releases/pi-latest/dist is missing or empty. Run `npm run build` first." );
	}
	if( g_fs.existsSync( destination ) ) {
		throw new Error(
			`releases/pi-${version} already exists; a snapshot is never overwritten.`
		);
	}

	const stagingDir = g_fs.mkdtempSync( g_path.join( releasesDir, `.pi-${version}-stage-` ) );
	try {
		g_fs.cpSync( distDir, stagingDir, { "recursive": true, "errorOnExist": true } );
		if( g_fs.existsSync( destination ) ) {
			throw new Error(
				`releases/pi-${version} was created during the copy; it was not overwritten.`
			);
		}
		g_fs.renameSync( stagingDir, destination );
	} catch( error ) {
		g_fs.rmSync( stagingDir, { "recursive": true, "force": true } );
		throw error;
	}

	const files = countFiles( destination );
	logger.log( `✓ Copied releases/pi-latest/dist to releases/pi-${version} (${files} files)` );
	return { "version": version, "destination": destination, "files": files };
}

/**
 * Whether this file is the process entry point. Both paths are resolved through symlinks:
 * import.meta.url is already resolved, and a script started through a symlinked directory,
 * such as macOS's /var/folders, would otherwise never run.
 *
 * @returns {boolean} True when run as a command
 */
function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	try {
		return g_fs.realpathSync( entry ) === g_fs.realpathSync( g_url.fileURLToPath( import.meta.url ) );
	} catch( error ) {
		return false;
	}
}

if( isMainModule() ) {
	try {
		createSnapshot();
	} catch( error ) {
		console.error( `✗ ${error.message}` );
		process.exitCode = 1;
	}
}

export { createSnapshot };
