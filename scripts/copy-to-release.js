/**
 * Pi.js Copy to Release Script
 *
 * Copies build output into releases/pi-latest/dist for npm publish.
 * Regenerates package.json from releases/base-package.json using the
 * version from the root package.json.
 *
 * @module copy-to-release
 */

const fs = require( "fs" );
const path = require( "path" );

const rootDir = path.join( __dirname, ".." );
const buildDir = path.join( rootDir, "build" );
const releaseDir = path.join( rootDir, "releases", "pi-latest" );
const distDir = path.join( releaseDir, "dist" );
const basePackagePath = path.join( rootDir, "releases", "base-package.json" );

const pkg = require( path.join( rootDir, "package.json" ) );
const version = pkg.version;
const majorVersion = pkg.majorVersion;

/**
 * Library files copied from build/ into dist/.
 * Excludes reference-*.json and other non-publish artifacts.
 */
const libraryFiles = [
	"pi.d.ts",
	"pi.js",
	"pi.js.map",
	"pi.min.js",
	"pi.min.js.map",
	"pi.esm.js",
	"pi.esm.js.map",
	"pi.esm.min.js",
	"pi.esm.min.js.map",
	"pi.lite.js",
	"pi.lite.js.map",
	"pi.lite.min.js",
	"pi.lite.min.js.map",
	"pi.lite.esm.js",
	"pi.lite.esm.js.map",
	"pi.lite.esm.min.js",
	"pi.lite.esm.min.js.map"
];

/**
 * Ensures a directory exists.
 *
 * @param {string} dirPath - Directory to create
 * @returns {void}
 */
function ensureDir( dirPath ) {
	if( !fs.existsSync( dirPath ) ) {
		fs.mkdirSync( dirPath, { "recursive": true } );
	}
}

/**
 * Copies a single file, creating parent directories as needed.
 *
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 * @returns {void}
 */
function copyFile( srcPath, destPath ) {
	ensureDir( path.dirname( destPath ) );
	fs.copyFileSync( srcPath, destPath );
}

/**
 * Removes a directory tree if it exists.
 *
 * @param {string} dirPath - Directory to remove
 * @returns {void}
 */
function removeDir( dirPath ) {
	if( fs.existsSync( dirPath ) ) {
		fs.rmSync( dirPath, { "recursive": true, "force": true } );
	}
}

/**
 * Reads plugin names from base-package.json exports keys like "./plugins/sound".
 *
 * @param {Object} basePackage - Parsed base package.json
 * @returns {string[]} Plugin directory names
 */
function getReleasePlugins( basePackage ) {
	const plugins = [];
	const exportsMap = basePackage.exports || {};

	for( const exportPath of Object.keys( exportsMap ) ) {
		if( exportPath.startsWith( "./plugins/" ) ) {
			plugins.push( exportPath.slice( "./plugins/".length ) );
		}
	}

	return plugins;
}

/**
 * Copies all files from a source directory into a destination directory.
 *
 * @param {string} srcDir - Source directory
 * @param {string} destDir - Destination directory
 * @returns {number} Number of files copied
 */
function copyDirFiles( srcDir, destDir ) {
	ensureDir( destDir );

	const entries = fs.readdirSync( srcDir, { "withFileTypes": true } );
	let count = 0;

	for( const entry of entries ) {
		const srcPath = path.join( srcDir, entry.name );
		const destPath = path.join( destDir, entry.name );

		if( entry.isDirectory() ) {
			count += copyDirFiles( srcPath, destPath );
		} else {
			copyFile( srcPath, destPath );
			count++;
		}
	}

	return count;
}

/**
 * Writes releases/pi-latest/package.json from the base template.
 *
 * @param {Object} basePackage - Parsed base package.json
 * @returns {void}
 */
function writeReleasePackageJson( basePackage ) {
	const releasePackage = JSON.parse( JSON.stringify( basePackage ) );
	releasePackage.version = version;
	releasePackage.majorVersion = majorVersion;

	const packagePath = path.join( releaseDir, "package.json" );
	const contents = JSON.stringify( releasePackage, null, "\t" ) + "\n";
	fs.writeFileSync( packagePath, contents, "utf8" );
}

/**
 * Copies build artifacts into releases/pi-latest.
 *
 * @returns {void}
 */
function copyToRelease() {
	console.log( `Copying Pi.js v${version} build to releases/pi-latest...` );

	if( !fs.existsSync( buildDir ) ) {
		console.error( "✗ Build directory not found. Run `npm run build` first." );
		process.exit( 1 );
	}

	if( !fs.existsSync( basePackagePath ) ) {
		console.error( "✗ releases/base-package.json not found." );
		process.exit( 1 );
	}

	const basePackage = JSON.parse( fs.readFileSync( basePackagePath, "utf8" ) );
	const releasePlugins = getReleasePlugins( basePackage );

	// Fresh dist so removed/renamed artifacts do not linger
	removeDir( distDir );
	ensureDir( distDir );

	console.log( "" );
	console.log( "Copying library files..." );

	let libraryCount = 0;
	for( const fileName of libraryFiles ) {
		const srcPath = path.join( buildDir, fileName );

		if( !fs.existsSync( srcPath ) ) {
			console.error( `✗ Missing build file: ${fileName}` );
			process.exit( 1 );
		}

		copyFile( srcPath, path.join( distDir, fileName ) );
		libraryCount++;
	}

	console.log( `  ✓ Copied ${libraryCount} library file(s)` );

	console.log( "" );
	console.log( "Copying release plugins..." );

	let pluginFileCount = 0;
	for( const pluginName of releasePlugins ) {
		const srcPluginDir = path.join( buildDir, "plugins", pluginName );

		if( !fs.existsSync( srcPluginDir ) ) {
			console.error( `✗ Missing plugin build: plugins/${pluginName}` );
			process.exit( 1 );
		}

		const destPluginDir = path.join( distDir, "plugins", pluginName );
		const copied = copyDirFiles( srcPluginDir, destPluginDir );
		pluginFileCount += copied;
		console.log( `  ✓ ${pluginName} (${copied} file(s))` );
	}

	console.log( "" );
	console.log( "Updating package.json from base-package.json..." );
	writeReleasePackageJson( basePackage );
	console.log( `  ✓ package.json set to v${version}` );

	console.log( "" );
	console.log( "✓ Copy to release completed successfully!" );
	console.log( `  Destination: releases/pi-latest/dist` );
	console.log(
		`  Files: ${libraryCount} library + ${pluginFileCount} plugin` +
		` (${releasePlugins.length} plugin(s))`
	);
}

copyToRelease();
