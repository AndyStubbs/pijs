/**
 * Pi.js Release Copy Tests
 *
 * Verifies that release distribution replacement is transactional.
 */

"use strict";

const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const os = require( "node:os" );
const path = require( "node:path" );
const test = require( "node:test" );
const { copyToRelease } = require( "../../scripts/copy-to-release.js" );

const LIBRARY_FILES = [
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

const silentLogger = { "log": () => {} };

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
