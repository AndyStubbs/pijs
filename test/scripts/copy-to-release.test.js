/**
 * Pi.js Release Copy Tests
 *
 * Verifies that release distribution replacement is transactional.
 */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_copyToRelease from "../../scripts/copy-to-release.js";
const assert = g_assert;
const fs = g_fs;
const os = g_os;
const path = g_path;
const test = g_test.test;
const { copyToRelease } = g_copyToRelease;

const LIBRARY_FILES = [
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

const silentLogger = { "log": () => {} };
const PREVIOUS_PACKAGE = "{\"version\":\"previous\"}\n";
const RETRY_DELAYS = [ 100, 200, 300, 400, 500 ];

function createFixture( t ) {
	const fixtureDir = fs.mkdtempSync( path.join( os.tmpdir(), "pijs-release-copy-" ) );
	const buildDir = path.join( fixtureDir, "build" );
	const releaseDir = path.join( fixtureDir, "release" );
	const distDir = path.join( releaseDir, "dist" );
	const basePackagePath = path.join( fixtureDir, "base-package.json" );

	t.after( () => fs.rmSync( fixtureDir, { "force": true, "recursive": true } ) );
	fs.mkdirSync( path.join( buildDir, "plugins", "sound", "nested" ), {
		"recursive": true
	} );
	fs.mkdirSync( distDir, { "recursive": true } );

	for( const fileName of LIBRARY_FILES ) {
		fs.writeFileSync( path.join( buildDir, fileName ), `new ${fileName}\n`, "utf8" );
	}

	fs.writeFileSync(
		path.join( buildDir, "plugins", "sound", "sound.js" ),
		"new sound\n",
		"utf8"
	);
	fs.writeFileSync(
		path.join( buildDir, "plugins", "sound", "nested", "sound.js.map" ),
		"new sound map\n",
		"utf8"
	);
	fs.writeFileSync( path.join( distDir, "previous.txt" ), "previous dist\n", "utf8" );
	fs.writeFileSync( path.join( releaseDir, "package.json" ), PREVIOUS_PACKAGE, "utf8" );
	fs.writeFileSync(
		basePackagePath,
		JSON.stringify( {
			"name": "pijs-web",
			"version": "[VERSION]",
			"majorVersion": "[MAJOR-VERSION]",
			"exports": {
				".": { "default": "./dist/pi.esm.js" },
				"./plugins/sound": {
					"default": "./dist/plugins/sound/sound.js"
				}
			}
		}, null, "\t" ) + "\n",
		"utf8"
	);

	return {
		basePackagePath,
		buildDir,
		distDir,
		"logger": silentLogger,
		"majorVersion": "9.8",
		releaseDir,
		"version": "9.8.7"
	};
}

function readTree( dirPath ) {
	const tree = {};

	for( const entry of fs.readdirSync( dirPath, { "withFileTypes": true } ) ) {
		const entryPath = path.join( dirPath, entry.name );
		if( entry.isDirectory() ) {
			tree[entry.name] = readTree( entryPath );
		} else {
			tree[entry.name] = fs.readFileSync( entryPath, "utf8" );
		}
	}

	return tree;
}

function assertNoTransactionDirectories( releaseDir ) {
	const names = fs.readdirSync( releaseDir );
	assert.equal( names.some( name => name.startsWith( ".dist-stage-" ) ), false );
}

/** Verify that a failed transaction has not changed release metadata. */
function assertPreviousPackage( fixture ) {
	assert.equal(
		fs.readFileSync( path.join( fixture.releaseDir, "package.json" ), "utf8" ),
		PREVIOUS_PACKAGE
	);
}

/** Classify directory moves so injected installation errors do not affect rollback. */
function getMove( srcPath, destPath, fixture ) {
	if( srcPath === fixture.distDir ) {
		return "backup";
	}
	if( srcPath.endsWith( "-backup" ) && destPath === fixture.distDir ) {
		return "restore";
	}
	return "install";
}

/** Create a filesystem error carrying the same code as a real rename failure. */
function createError( code ) {
	return Object.assign( new Error( `injected ${code}` ), { "code": code } );
}

test( "missing library input leaves the previous dist intact", t => {
	const fixture = createFixture( t );
	const previousTree = readTree( fixture.distDir );
	fs.rmSync( path.join( fixture.buildDir, "pi.esm.min.js" ) );

	assert.throws(
		() => copyToRelease( fixture ),
		{ "message": /Missing required release inputs:\n  - pi\.esm\.min\.js/ }
	);

	assert.deepEqual( readTree( fixture.distDir ), previousTree );
	assertNoTransactionDirectories( fixture.releaseDir );
} );

test( "missing plugin input leaves the previous dist intact", t => {
	const fixture = createFixture( t );
	const previousTree = readTree( fixture.distDir );
	fs.rmSync(
		path.join( fixture.buildDir, "plugins", "sound" ),
		{ "recursive": true }
	);

	assert.throws(
		() => copyToRelease( fixture ),
		{ "message": /Missing required release inputs:\n  - plugins\/sound/ }
	);

	assert.deepEqual( readTree( fixture.distDir ), previousTree );
	assertNoTransactionDirectories( fixture.releaseDir );
} );

test( "staging failure cleans up and leaves the previous dist intact", t => {
	const fixture = createFixture( t );
	const previousTree = readTree( fixture.distDir );
	const fileSystem = Object.create( fs );

	fileSystem.copyFileSync = ( srcPath, destPath ) => {
		if( srcPath === path.join( fixture.buildDir, "pi.esm.min.js" ) ) {
			throw new Error( "injected staging failure" );
		}
		fs.copyFileSync( srcPath, destPath );
	};

	assert.throws(
		() => copyToRelease( { ...fixture, fileSystem } ),
		{ "message": "injected staging failure" }
	);

	assert.deepEqual( readTree( fixture.distDir ), previousTree );
	assertNoTransactionDirectories( fixture.releaseDir );
} );

test( "replacement failure restores the previous dist and cleans up", t => {
	const fixture = createFixture( t );
	const previousTree = readTree( fixture.distDir );
	const fileSystem = Object.create( fs );
	let replacementFailed = false;

	fileSystem.renameSync = ( srcPath, destPath ) => {
		if(
			!replacementFailed &&
			path.basename( srcPath ).startsWith( ".dist-stage-" ) &&
			destPath === fixture.distDir
		) {
			replacementFailed = true;
			throw new Error( "injected replacement failure" );
		}
		fs.renameSync( srcPath, destPath );
	};

	assert.throws(
		() => copyToRelease( { ...fixture, fileSystem } ),
		{ "message": "injected replacement failure" }
	);

	assert.deepEqual( readTree( fixture.distDir ), previousTree );
	assertNoTransactionDirectories( fixture.releaseDir );
} );

test( "successful copy replaces stale files and regenerates package metadata", t => {
	const fixture = createFixture( t );

	copyToRelease( fixture );

	assert.equal( fs.existsSync( path.join( fixture.distDir, "previous.txt" ) ), false );
	for( const fileName of LIBRARY_FILES ) {
		assert.equal(
			fs.readFileSync( path.join( fixture.distDir, fileName ), "utf8" ),
			`new ${fileName}\n`
		);
	}
	assert.equal(
		fs.readFileSync(
			path.join( fixture.distDir, "plugins", "sound", "nested", "sound.js.map" ),
			"utf8"
		),
		"new sound map\n"
	);

	const releasePackage = JSON.parse(
		fs.readFileSync( path.join( fixture.releaseDir, "package.json" ), "utf8" )
	);
	assert.equal( releasePackage.version, fixture.version );
	assert.equal( releasePackage.majorVersion, fixture.majorVersion );
	assertNoTransactionDirectories( fixture.releaseDir );
} );

for( const move of [ "backup", "install" ] ) {
	for( const code of [ "EPERM", "EACCES", "EBUSY" ] ) {
		test( `transient ${code} during ${move} succeeds after bounded retries`, t => {
			const fixture = createFixture( t );
			const fileSystem = Object.create( fs );
			const delays = [];
			let attempts = 0;
			fileSystem.renameSync = ( srcPath, destPath ) => {
				if( getMove( srcPath, destPath, fixture ) === move ) {
					attempts++;
					if( attempts <= RETRY_DELAYS.length ) {
						throw createError( code );
					}
				}
				fs.renameSync( srcPath, destPath );
			};

			copyToRelease( { ...fixture, fileSystem, "waitSync": delay => delays.push( delay ) } );

			assert.equal( attempts, 6 );
			assert.deepEqual( delays, RETRY_DELAYS );
			assert.equal( fs.existsSync( path.join( fixture.distDir, "previous.txt" ) ), false );
			assert.equal(
				fs.readFileSync( path.join( fixture.distDir, "pi.js" ), "utf8" ), "new pi.js\n"
			);
			const metadata = JSON.parse(
				fs.readFileSync( path.join( fixture.releaseDir, "package.json" ), "utf8" )
			);
			assert.equal( metadata.version, fixture.version );
			assertNoTransactionDirectories( fixture.releaseDir );
		} );
	}

	for( const code of [ "EPERM", "ENOENT", "EXDEV" ] ) {
		test( `persistent ${code} during ${move} preserves the previous release`, t => {
			const fixture = createFixture( t );
			const previousTree = readTree( fixture.distDir );
			const fileSystem = Object.create( fs );
			const delays = [];
			const failure = createError( code );
			let attempts = 0;
			fileSystem.renameSync = ( srcPath, destPath ) => {
				if( getMove( srcPath, destPath, fixture ) === move ) {
					attempts++;
					throw failure;
				}
				fs.renameSync( srcPath, destPath );
			};

			assert.throws(
				() => copyToRelease( {
					...fixture, fileSystem, "waitSync": delay => delays.push( delay )
				} ),
				error => error === failure
			);

			if( code === "EPERM" ) {
				assert.equal( attempts, 6 );
				assert.deepEqual( delays, RETRY_DELAYS );
			} else {
				assert.equal( attempts, 1 );
				assert.deepEqual( delays, [] );
			}
			assert.deepEqual( readTree( fixture.distDir ), previousTree );
			assertPreviousPackage( fixture );
			assertNoTransactionDirectories( fixture.releaseDir );
		} );
	}
}

for( const restoreSucceeds of [ true, false ] ) {
	test( `rollback retries temporary locks; restoration succeeds: ${restoreSucceeds}`, t => {
		const fixture = createFixture( t );
		const previousTree = readTree( fixture.distDir );
		const fileSystem = Object.create( fs );
		const delays = [];
		const failure = createError( "EPERM" );
		let restoreAttempts = 0;
		let backupDir;
		fileSystem.renameSync = ( srcPath, destPath ) => {
			const move = getMove( srcPath, destPath, fixture );
			if( move === "install" ) {
				throw failure;
			}
			if( move === "restore" ) {
				backupDir = srcPath;
				restoreAttempts++;
				if( !restoreSucceeds || restoreAttempts <= 5 ) {
					throw createError( "EBUSY" );
				}
			}
			fs.renameSync( srcPath, destPath );
		};

		assert.throws(
			() => copyToRelease( {
				...fixture, fileSystem, "waitSync": delay => delays.push( delay )
			} ),
			error => {
				if( restoreSucceeds ) {
					assert.equal( error, failure );
				} else {
					assert.equal( error.cause, failure );
					assert.ok( error.message.includes( backupDir ) );
					assert.match( error.message, /injected EPERM.*injected EBUSY/ );
				}
				return true;
			}
		);

		assert.equal( restoreAttempts, 6 );
		assert.deepEqual( delays, [ ...RETRY_DELAYS, ...RETRY_DELAYS ] );
		assertPreviousPackage( fixture );
		if( restoreSucceeds ) {
			assert.deepEqual( readTree( fixture.distDir ), previousTree );
			assertNoTransactionDirectories( fixture.releaseDir );
		} else {
			assert.equal( fs.existsSync( fixture.distDir ), false );
			assert.deepEqual( readTree( backupDir ), previousTree );
			assert.deepEqual( fs.readdirSync( fixture.releaseDir ).sort(), [
				path.basename( backupDir ), "package.json"
			] );
		}
	} );
}

test( "transaction cleanup enables native recursive removal retries", t => {
	const fixture = createFixture( t );
	const fileSystem = Object.create( fs );
	const removals = [];
	fileSystem.rmSync = ( dirPath, options ) => {
		removals.push( { "path": dirPath, "options": options } );
		fs.rmSync( dirPath, options );
	};

	copyToRelease( { ...fixture, fileSystem } );

	assert.equal( removals.length, 1 );
	assert.ok( removals[ 0 ].path.endsWith( "-backup" ) );
	assert.deepEqual( removals[ 0 ].options, {
		"recursive": true, "force": true, "maxRetries": 5, "retryDelay": 100
	} );
	assertNoTransactionDirectories( fixture.releaseDir );
} );

for( const failingPhase of [ "staging", "install", "restore" ] ) {
	test( `staging cleanup failure preserves the ${failingPhase} error and paths`, t => {
		const fixture = createFixture( t );
		const previousTree = readTree( fixture.distDir );
		const fileSystem = Object.create( fs );
		const failure = new Error( "injected primary failure" );
		let stagedDir;
		let backupDir;
		fileSystem.copyFileSync = ( srcPath, destPath ) => {
			if( failingPhase === "staging" ) {
				throw failure;
			}
			fs.copyFileSync( srcPath, destPath );
		};
		fileSystem.renameSync = ( srcPath, destPath ) => {
			const move = getMove( srcPath, destPath, fixture );
			if( move === "install" ) {
				throw failure;
			}
			if( move === "restore" && failingPhase === "restore" ) {
				backupDir = srcPath;
				throw new Error( "injected rollback failure" );
			}
			fs.renameSync( srcPath, destPath );
		};
		fileSystem.rmSync = ( dirPath, options ) => {
			stagedDir = dirPath;
			assert.deepEqual( options, {
				"recursive": true, "force": true, "maxRetries": 5, "retryDelay": 100
			} );
			throw createError( "EPERM" );
		};

		assert.throws( () => copyToRelease( { ...fixture, fileSystem } ), error => {
			assert.match( error.message, /injected primary failure/ );
			assert.match( error.message, /failed to remove staging directory/ );
			assert.ok( error.message.includes( stagedDir ) );
			if( failingPhase === "restore" ) {
				assert.equal( error.cause.cause, failure );
				assert.match( error.message, /injected rollback failure/ );
				assert.ok( error.message.includes( backupDir ) );
			} else {
				assert.equal( error.cause, failure );
			}
			return true;
		} );

		assert.ok( fs.existsSync( stagedDir ) );
		assertPreviousPackage( fixture );
		if( failingPhase === "restore" ) {
			assert.deepEqual( readTree( backupDir ), previousTree );
		} else {
			assert.deepEqual( readTree( fixture.distDir ), previousTree );
		}
	} );
}

test( "backup cleanup failure retains both distributions and previous metadata", t => {
	const fixture = createFixture( t );
	const previousTree = readTree( fixture.distDir );
	const fileSystem = Object.create( fs );
	const failure = createError( "EPERM" );
	let backupDir;
	fileSystem.rmSync = dirPath => {
		backupDir = dirPath;
		throw failure;
	};

	assert.throws( () => copyToRelease( { ...fixture, fileSystem } ), error => {
		assert.equal( error.cause, failure );
		assert.match( error.message, /Replaced release dist but failed to remove its backup/ );
		assert.ok( error.message.includes( backupDir ) );
		return true;
	} );

	assert.deepEqual( readTree( backupDir ), previousTree );
	assert.equal( fs.readFileSync( path.join( fixture.distDir, "pi.js" ), "utf8" ), "new pi.js\n" );
	assertPreviousPackage( fixture );
	assert.equal( fs.existsSync( backupDir.slice( 0, -"-backup".length ) ), false );
} );
