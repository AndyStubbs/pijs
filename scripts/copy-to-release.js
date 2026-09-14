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
	"pi.lite.d.ts",
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
 * @param {Object} fileSystem - Filesystem implementation
 * @returns {void}
 */
function ensureDir( dirPath, fileSystem = fs ) {
	if( !fileSystem.existsSync( dirPath ) ) {
		fileSystem.mkdirSync( dirPath, { "recursive": true } );
	}
}

/**
 * Copies a single file, creating parent directories as needed.
 *
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 * @param {Object} fileSystem - Filesystem implementation
 * @returns {void}
 */
function copyFile( srcPath, destPath, fileSystem = fs ) {
	ensureDir( path.dirname( destPath ), fileSystem );
	fileSystem.copyFileSync( srcPath, destPath );
}

/**
 * Removes a directory tree if it exists.
 *
 * @param {string} dirPath - Directory to remove
 * @param {Object} fileSystem - Filesystem implementation
 * @returns {void}
 */
function removeDir( dirPath, fileSystem = fs ) {
	if( fileSystem.existsSync( dirPath ) ) {
		fileSystem.rmSync( dirPath, { "recursive": true, "force": true } );
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
 * @param {Object} fileSystem - Filesystem implementation
 * @returns {number} Number of files copied
 */
function copyDirFiles( srcDir, destDir, fileSystem = fs ) {
	ensureDir( destDir, fileSystem );

	const entries = fileSystem.readdirSync( srcDir, { "withFileTypes": true } );
	let count = 0;

	for( const entry of entries ) {
		const srcPath = path.join( srcDir, entry.name );
		const destPath = path.join( destDir, entry.name );

		if( entry.isDirectory() ) {
			count += copyDirFiles( srcPath, destPath, fileSystem );
		} else {
			copyFile( srcPath, destPath, fileSystem );
			count++;
		}
	}

	return count;
}

/**
 * Writes releases/pi-latest/package.json from the base template.
 *
 * @param {Object} basePackage - Parsed base package.json
 * @param {Object} options - Release metadata and filesystem dependency
 * @returns {void}
 */
function writeReleasePackageJson( basePackage, options = {} ) {
	const fileSystem = options.fileSystem || fs;
	const packageVersion = options.version || version;
	const packageMajorVersion = options.majorVersion || majorVersion;
	const packageReleaseDir = options.releaseDir || releaseDir;
	const releasePackage = JSON.parse( JSON.stringify( basePackage ) );
	releasePackage.version = packageVersion;
	releasePackage.majorVersion = packageMajorVersion;

	const packagePath = path.join( packageReleaseDir, "package.json" );
	const contents = JSON.stringify( releasePackage, null, "\t" ) + "\n";
	fileSystem.writeFileSync( packagePath, contents, "utf8" );
}

/**
 * Validates all files and directories required by the release package.
 *
 * @param {Object} options - Release paths and filesystem dependency
 * @param {string} options.buildDir - Build output directory
 * @param {Object} options.fileSystem - Filesystem implementation
 * @param {string[]} options.releasePlugins - Plugins included in the release
 * @returns {void}
 */
function validateReleaseInputs( options ) {
	const missingInputs = [];

	for( const fileName of libraryFiles ) {
		const filePath = path.join( options.buildDir, fileName );
		try {
			if( !options.fileSystem.statSync( filePath ).isFile() ) {
				missingInputs.push( fileName );
			}
		} catch( error ) {
			missingInputs.push( fileName );
		}
	}

	for( const pluginName of options.releasePlugins ) {
		const pluginPath = path.join( options.buildDir, "plugins", pluginName );
		try {
			if( !options.fileSystem.statSync( pluginPath ).isDirectory() ) {
				missingInputs.push( `plugins/${pluginName}` );
			}
		} catch( error ) {
			missingInputs.push( `plugins/${pluginName}` );
		}
	}

	if( missingInputs.length > 0 ) {
		throw new Error(
			`Missing required release inputs:\n${missingInputs.map( input => `  - ${input}` ).join( "\n" )}`
		);
	}
}

/**
 * Replaces a release distribution while preserving the prior directory on failure.
 *
 * @param {string} stagedDir - Completely assembled distribution directory
 * @param {string} destinationDir - Release distribution destination
 * @param {Object} fileSystem - Filesystem implementation
 * @returns {void}
 */
function replaceDist( stagedDir, destinationDir, fileSystem ) {
	const backupDir = `${stagedDir}-backup`;
	let previousMoved = false;

	try {
		try {
			if( fileSystem.existsSync( destinationDir ) ) {
				fileSystem.renameSync( destinationDir, backupDir );
				previousMoved = true;
			}

			fileSystem.renameSync( stagedDir, destinationDir );
		} catch( error ) {
			if( previousMoved ) {
				try {
					removeDir( destinationDir, fileSystem );
					fileSystem.renameSync( backupDir, destinationDir );
					previousMoved = false;
				} catch( rollbackError ) {
					throw new Error(
						`Failed to replace release dist and restore its backup at ${backupDir}: ` +
						rollbackError.message,
						{ "cause": error }
					);
				}
			}

			throw error;
		}
	} finally {
		removeDir( stagedDir, fileSystem );
	}

	if( previousMoved ) {
		removeDir( backupDir, fileSystem );
	}
}

/**
 * Copies build artifacts into releases/pi-latest.
 *
 * @param {Object} options - Optional paths and dependencies for testing
 * @param {string} options.basePackagePath - Base package template path
 * @param {string} options.buildDir - Build output directory
 * @param {string} options.distDir - Release distribution destination
 * @param {Object} options.fileSystem - Filesystem implementation
 * @param {Object} options.logger - Console-compatible logger
 * @param {string} options.majorVersion - Release major version
 * @param {string} options.releaseDir - Release package directory
 * @param {string} options.version - Release version
 * @returns {void}
 */
function copyToRelease( options = {} ) {
	const fileSystem = options.fileSystem || fs;
	const logger = options.logger || console;
	const sourceBuildDir = options.buildDir || buildDir;
	const destinationReleaseDir = options.releaseDir || releaseDir;
	const destinationDistDir = options.distDir || path.join( destinationReleaseDir, "dist" );
	const packageTemplatePath = options.basePackagePath || basePackagePath;
	const releaseVersion = options.version || version;
	const releaseMajorVersion = options.majorVersion || majorVersion;

	logger.log( `Copying Pi.js v${releaseVersion} build to releases/pi-latest...` );

	if( !fileSystem.existsSync( sourceBuildDir ) ) {
		throw new Error( "Build directory not found. Run `npm run build` first." );
	}

	if( !fileSystem.existsSync( packageTemplatePath ) ) {
		throw new Error( "releases/base-package.json not found." );
	}

	const basePackage = JSON.parse( fileSystem.readFileSync( packageTemplatePath, "utf8" ) );
	const releasePlugins = getReleasePlugins( basePackage );
	validateReleaseInputs( {
		"buildDir": sourceBuildDir,
		fileSystem,
		releasePlugins
	} );

	ensureDir( destinationReleaseDir, fileSystem );
	const stagedDistDir = fileSystem.mkdtempSync(
		path.join( destinationReleaseDir, ".dist-stage-" )
	);

	logger.log( "" );
	logger.log( "Copying library files..." );

	let libraryCount = 0;
	let pluginFileCount = 0;
	try {
		for( const fileName of libraryFiles ) {
			const srcPath = path.join( sourceBuildDir, fileName );
			copyFile( srcPath, path.join( stagedDistDir, fileName ), fileSystem );
			libraryCount++;
		}

		logger.log( `  ✓ Copied ${libraryCount} library file(s)` );

		logger.log( "" );
		logger.log( "Copying release plugins..." );

		for( const pluginName of releasePlugins ) {
			const srcPluginDir = path.join( sourceBuildDir, "plugins", pluginName );
			const destPluginDir = path.join( stagedDistDir, "plugins", pluginName );
			const copied = copyDirFiles( srcPluginDir, destPluginDir, fileSystem );
			pluginFileCount += copied;
			logger.log( `  ✓ ${pluginName} (${copied} file(s))` );
		}

		replaceDist( stagedDistDir, destinationDistDir, fileSystem );
	} catch( error ) {
		removeDir( stagedDistDir, fileSystem );
		throw error;
	}

	logger.log( "" );
	logger.log( "Updating package.json from base-package.json..." );
	writeReleasePackageJson( basePackage, {
		fileSystem,
		"majorVersion": releaseMajorVersion,
		"releaseDir": destinationReleaseDir,
		"version": releaseVersion
	} );
	logger.log( `  ✓ package.json set to v${releaseVersion}` );

	logger.log( "" );
	logger.log( "✓ Copy to release completed successfully!" );
	logger.log( `  Destination: releases/pi-latest/dist` );
	logger.log(
		`  Files: ${libraryCount} library + ${pluginFileCount} plugin` +
		` (${releasePlugins.length} plugin(s))`
	);
}

if( require.main === module ) {
	try {
		copyToRelease();
	} catch( error ) {
		console.error( `✗ ${error.message}` );
		process.exitCode = 1;
	}
}

module.exports = { copyToRelease };
