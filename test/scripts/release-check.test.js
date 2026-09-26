/**
 * Pi.js Release Version Check Tests
 *
 * Verifies that the release check accepts a release whose versions agree and reports every
 * disagreement between the tag, the package files, and the bundle and declaration banners.
 */
import * as g_assert from "node:assert/strict";
import * as g_childProcess from "node:child_process";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_url from "node:url";
import * as g_releaseCheck from "../../scripts/release-check.js";
const assert = g_assert;
const test = g_test.test;

const SCRIPT = g_url.fileURLToPath( new URL( "../../scripts/release-check.js", import.meta.url ) );

function write( root, name, contents ) {
	const filePath = g_path.join( root, name );
	g_fs.mkdirSync( g_path.dirname( filePath ), { "recursive": true } );
	g_fs.writeFileSync( filePath, contents );
}

function banner( version ) {
	return `/**\n * Pi.js\n * @version ${version}\n */\nvar pi = 1;\n`;
}

/**
 * Creates a repository layout whose release versions agree: 2.3.0, with a sound plugin 2.0.0.
 *
 * @param {Object} t - Test context
 * @returns {string} Repository root
 */
function createRelease( t ) {
	const root = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pijs-release-check-" ) );
	t.after( () => g_fs.rmSync( root, { "recursive": true, "force": true } ) );
	write( root, "package.json",
		JSON.stringify( { "type": "module", "version": "2.3.0", "majorVersion": "2.3" } ) );
	write( root, "releases/pi-latest/package.json",
		JSON.stringify( { "version": "2.3.0", "majorVersion": "2.3" } ) );
	for( const name of [ "pi.js", "pi.min.js", "pi.lite.esm.js" ] ) {
		write( root, `releases/pi-latest/dist/${name}`, banner( "2.3.0" ) );
	}
	write( root, "releases/pi-latest/dist/pi.js.map", "{}" );
	for( const name of [ "pi.d.ts", "pi.lite.d.ts" ] ) {
		write( root, `releases/pi-latest/dist/${name}`, "/**\n * Version: pi-2.3\n */\n" );
	}
	write( root, "plugins/sound/banner.json", JSON.stringify( { "version": "2.0.0" } ) );
	for( const name of [ "sound.js", "sound.esm.min.js" ] ) {
		write( root, `releases/pi-latest/dist/plugins/sound/${name}`, banner( "2.0.0" ) );
	}
	write( root, "releases/pi-latest/dist/plugins/sound/sound.d.ts", "declare const x: 1;\n" );
	return root;
}

test( "a release whose versions agree has no problems", t => {
	const root = createRelease( t );
	assert.deepEqual( g_releaseCheck.checkRelease( { "rootDir": root } ),
		{ "version": "2.3.0", "problems": [] } );
	assert.deepEqual( g_releaseCheck.checkRelease( { "rootDir": root, "tag": "v2.3.0" } ),
		{ "version": "2.3.0", "problems": [] } );
} );

test( "every disagreement is reported", t => {
	const root = createRelease( t );
	write( root, "releases/pi-latest/package.json",
		JSON.stringify( { "version": "2.2.0", "majorVersion": "2.3" } ) );
	write( root, "releases/pi-latest/dist/pi.min.js", banner( "2.2.0" ) );
	write( root, "releases/pi-latest/dist/pi.lite.esm.js", "var pi = 1;\n" );
	write( root, "releases/pi-latest/dist/pi.lite.d.ts", "/**\n * Version: pi-2.2\n */\n" );
	write( root, "releases/pi-latest/dist/plugins/sound/sound.esm.min.js", banner( "1.0.0" ) );
	const result = g_releaseCheck.checkRelease( { "rootDir": root, "tag": "v2.3.1" } );
	assert.deepEqual( result.problems, [
		"tag v2.3.1 does not match package.json version 2.3.0",
		"releases/pi-latest/package.json: version is 2.2.0, expected 2.3.0",
		"dist/pi.lite.esm.js: no version banner",
		"dist/pi.min.js: banner says 2.2.0, expected 2.3.0",
		"dist/pi.lite.d.ts: banner says 2.2, expected 2.3",
		"dist/plugins/sound/sound.esm.min.js: banner says 1.0.0, expected 2.0.0"
	] );
} );

test( "package problems and a missing build are reported", t => {
	const root = createRelease( t );
	write( root, "package.json", JSON.stringify( { "version": "2.3.0", "majorVersion": "2.2" } ) );
	g_fs.rmSync( g_path.join( root, "releases/pi-latest/dist" ), { "recursive": true } );
	assert.deepEqual( g_releaseCheck.checkRelease( { "rootDir": root } ).problems, [
		"package.json: majorVersion is 2.2, expected 2.3",
		"releases/pi-latest/package.json: majorVersion is 2.3, expected 2.2",
		"releases/pi-latest/dist is missing. Run `npm run build` first."
	] );

	write( root, "package.json", JSON.stringify( { "version": "latest" } ) );
	assert.deepEqual( g_releaseCheck.checkRelease( { "rootDir": root } ),
		{ "version": null, "problems": [ "package.json: invalid version \"latest\"" ] } );
} );

test( "the command exits 1 on a disagreement and names it", t => {

	// Run a copy of the script from a temporary repository layout
	const root = createRelease( t );
	write( root, "scripts/release-check.js", g_fs.readFileSync( SCRIPT ) );
	const run = args => g_childProcess.spawnSync( process.execPath,
		[ g_path.join( root, "scripts/release-check.js" ), ...args ],
		{ "encoding": "utf8", "timeout": 30000 } );

	const agree = run( [ "--tag=v2.3.0" ] );
	assert.equal( agree.status, 0, agree.stderr );
	assert.match( agree.stdout, /Release versions agree: 2\.3\.0, tag v2\.3\.0/ );

	const wrongTag = run( [ "--tag=v2.4.0" ] );
	assert.equal( wrongTag.status, 1 );
	assert.match( wrongTag.stderr, /tag v2\.4\.0 does not match package\.json version 2\.3\.0/ );
} );
