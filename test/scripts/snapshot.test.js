/**
 * Pi.js Release Snapshot Tests
 *
 * Verifies that the snapshot copies the release distribution to its versioned directory,
 * never overwrites an existing snapshot, and leaves nothing behind when it fails.
 */
import * as g_assert from "node:assert/strict";
import * as g_childProcess from "node:child_process";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_url from "node:url";
import * as g_snapshot from "../../scripts/snapshot.js";
const assert = g_assert;
const test = g_test.test;

const SCRIPT = g_url.fileURLToPath( new URL( "../../scripts/snapshot.js", import.meta.url ) );
const silentLogger = { "log": () => {} };

// Distribution files, including a nested plugin directory, by path relative to dist
const DIST_FILES = {
	"pi.js": "full bundle\n",
	"pi.d.ts": "declarations\n",
	"plugins/sound/sound.js": "sound plugin\n",
	"plugins/sound/nested/sound.js.map": "sound map\n"
};

/**
 * Creates a releases directory with pi-latest/package.json and a distribution.
 *
 * @param {Object} t - Test context
 * @param {string} [version] - Version in pi-latest/package.json
 * @returns {string} Releases directory
 */
function createReleases( t, version = "2.3.0" ) {
	const root = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pijs-snapshot-" ) );
	t.after( () => g_fs.rmSync( root, { "recursive": true, "force": true } ) );
	const releasesDir = g_path.join( root, "releases" );
	const distDir = g_path.join( releasesDir, "pi-latest", "dist" );
	for( const [ name, contents ] of Object.entries( DIST_FILES ) ) {
		const filePath = g_path.join( distDir, name );
		g_fs.mkdirSync( g_path.dirname( filePath ), { "recursive": true } );
		g_fs.writeFileSync( filePath, contents );
	}
	g_fs.writeFileSync(
		g_path.join( releasesDir, "pi-latest", "package.json" ),
		JSON.stringify( { "name": "pijs-web", "version": version } )
	);
	return releasesDir;
}

function readTree( dirPath, prefix = "" ) {
	const files = {};
	for( const entry of g_fs.readdirSync( dirPath, { "withFileTypes": true } ) ) {
		const relative = prefix + entry.name;
		const entryPath = g_path.join( dirPath, entry.name );
		if( entry.isDirectory() ) {
			Object.assign( files, readTree( entryPath, relative + "/" ) );
		} else {
			files[ relative ] = g_fs.readFileSync( entryPath, "utf8" );
		}
	}
	return files;
}

test( "the snapshot copies the distribution to its versioned directory", t => {
	const releasesDir = createReleases( t );
	const result = g_snapshot.createSnapshot( {
		"releasesDir": releasesDir, "logger": silentLogger
	} );
	const destination = g_path.join( releasesDir, "pi-2.3.0" );
	assert.deepEqual( result, { "version": "2.3.0", "destination": destination, "files": 4 } );
	assert.deepEqual( readTree( destination ), DIST_FILES );

	// The distribution is unchanged, and no staging directory is left behind
	assert.deepEqual( readTree( g_path.join( releasesDir, "pi-latest", "dist" ) ), DIST_FILES );
	assert.deepEqual( g_fs.readdirSync( releasesDir ).sort(), [ "pi-2.3.0", "pi-latest" ] );
} );

test( "an existing snapshot is never overwritten", t => {
	const releasesDir = createReleases( t );
	const destination = g_path.join( releasesDir, "pi-2.3.0" );
	g_fs.mkdirSync( destination );
	g_fs.writeFileSync( g_path.join( destination, "pi.js" ), "published bundle\n" );
	assert.throws(
		() => g_snapshot.createSnapshot( { "releasesDir": releasesDir, "logger": silentLogger } ),
		/releases\/pi-2\.3\.0 already exists; a snapshot is never overwritten/
	);
	assert.deepEqual( readTree( destination ), { "pi.js": "published bundle\n" } );
	assert.deepEqual( g_fs.readdirSync( releasesDir ).sort(), [ "pi-2.3.0", "pi-latest" ] );
} );

test( "a missing distribution or version is reported without creating anything", t => {
	const noDist = createReleases( t );
	g_fs.rmSync( g_path.join( noDist, "pi-latest", "dist" ), { "recursive": true } );
	assert.throws(
		() => g_snapshot.createSnapshot( { "releasesDir": noDist, "logger": silentLogger } ),
		/releases\/pi-latest\/dist is missing or empty\. Run `npm run build` first/
	);
	assert.deepEqual( g_fs.readdirSync( noDist ), [ "pi-latest" ] );

	for( const version of [ null, "latest", "../2.3.0", "2.3" ] ) {
		const releasesDir = createReleases( t, version );
		assert.throws(
			() => g_snapshot.createSnapshot( { "releasesDir": releasesDir, "logger": silentLogger } ),
			/releases\/pi-latest\/package\.json has no valid version/,
			String( version )
		);
		assert.deepEqual( g_fs.readdirSync( releasesDir ), [ "pi-latest" ] );
	}

	const noPackage = createReleases( t );
	g_fs.rmSync( g_path.join( noPackage, "pi-latest", "package.json" ) );
	assert.throws(
		() => g_snapshot.createSnapshot( { "releasesDir": noPackage, "logger": silentLogger } ),
		/Cannot read releases\/pi-latest\/package\.json/
	);
} );

test( "the command creates the snapshot, then refuses a second run", t => {

	// Run a copy of the script from a temporary repository layout, so the real releases/
	// directory is untouched
	const releasesDir = createReleases( t, "9.8.7" );
	const scriptsDir = g_path.join( releasesDir, "..", "scripts" );
	g_fs.mkdirSync( scriptsDir );
	g_fs.copyFileSync( SCRIPT, g_path.join( scriptsDir, "snapshot.js" ) );
	g_fs.writeFileSync(
		g_path.join( releasesDir, "..", "package.json" ), JSON.stringify( { "type": "module" } )
	);
	const run = () => g_childProcess.spawnSync(
		process.execPath, [ g_path.join( scriptsDir, "snapshot.js" ) ],
		{ "encoding": "utf8", "timeout": 30000 }
	);

	const first = run();
	assert.equal( first.status, 0, first.stderr );
	assert.match( first.stdout, /releases\/pi-9\.8\.7 \(4 files\)/ );
	assert.deepEqual( readTree( g_path.join( releasesDir, "pi-9.8.7" ) ), DIST_FILES );

	const second = run();
	assert.equal( second.status, 1 );
	assert.match( second.stderr, /already exists; a snapshot is never overwritten/ );
} );
