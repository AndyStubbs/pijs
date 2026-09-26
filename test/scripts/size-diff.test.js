/**
 * Pi.js Size Diff Tests
 *
 * Verifies the size diff rows, the Markdown table, report validation, and the command line.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_childProcess from "node:child_process";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_sizeDiff from "../../scripts/size-diff.js";
const assert = g_assert;
const test = g_test.test;

const SCRIPT = g_url.fileURLToPath( new URL( "../../scripts/size-diff.js", import.meta.url ) );

const BASE = {
	"version": "2.3.0",
	"bundles": {
		"pi.min.js": { "bytes": 208248, "gzip": 62000 },
		"pi.lite.min.js": { "bytes": 150000, "gzip": 45000 }
	},
	"plugins": {
		"sound": { "version": "2.3.0", "bytes": 20000, "gzip": 7000 },
		"old": { "version": "1.0.0", "bytes": 1000, "gzip": 500 }
	}
};

const HEAD = {
	"version": "2.3.0",
	"bundles": {
		"pi.min.js": { "bytes": 207944, "gzip": 61990 },
		"pi.lite.min.js": { "bytes": 150000, "gzip": 45000 }
	},
	"plugins": {
		"sound": { "version": "2.3.0", "bytes": 20512, "gzip": 7100 },
		"added": { "version": "1.0.0", "bytes": 2048, "gzip": 900 }
	}
};

test( "rows keep the head order, then names only the base has", () => {
	const rows = g_sizeDiff.diffSizeReports( BASE, HEAD );
	assert.deepEqual( rows.map( row => row.name ), [
		"pi.min.js", "pi.lite.min.js", "plugins/sound", "plugins/added", "plugins/old"
	] );
	assert.equal( rows[ 3 ].base, null );
	assert.equal( rows[ 4 ].head, null );
	assert.equal( rows[ 2 ].head.bytes, 20512 );
} );

test( "the table shows sizes and signed changes for every file", () => {
	const markdown = g_sizeDiff.formatSizeDiff( BASE, HEAD );
	const lines = markdown.split( "\n" );
	assert.equal( lines[ 0 ], "### Size diff" );
	assert.ok( lines.includes( "4 of 5 files changed." ) );
	assert.ok( lines.includes( "| File | Bytes | Change | Gzip | Change |" ) );
	assert.ok( lines.includes( "| pi.min.js | 207,944 | -304 (-0.15%) | 61,990 | -10 (-0.02%) |" ) );
	assert.ok( lines.includes( "| pi.lite.min.js | 150,000 | 0 | 45,000 | 0 |" ) );
	assert.ok( lines.includes(
		"| plugins/sound | 20,512 | +512 (+2.56%) | 7,100 | +100 (+1.43%) |"
	) );
	assert.ok( lines.includes( "| plugins/added | 2,048 | new | 900 | new |" ) );
	assert.ok( lines.includes( "| plugins/old | removed | -1,000 | removed | -500 |" ) );
	assert.ok( markdown.endsWith( "|\n" ) );
} );

test( "identical reports say there are no changes", () => {
	const markdown = g_sizeDiff.formatSizeDiff( BASE, BASE );
	assert.ok( markdown.includes( "\nNo size changes.\n" ) );
	assert.doesNotMatch( markdown, /[+-]\d/ );
} );

test( "a report without bundle and plugin sizes is rejected", () => {
	for( const report of [ null, {}, { "bundles": {} }, { "bundles": {}, "plugins": [] } ] ) {
		assert.throws( () => g_sizeDiff.formatSizeDiff( report, HEAD ), {
			"name": "TypeError", "message": /base report is not a size report/
		} );
	}
	const broken = { "bundles": { "pi.min.js": { "bytes": 1 } }, "plugins": {} };
	assert.throws( () => g_sizeDiff.formatSizeDiff( BASE, broken ), {
		"name": "TypeError", "message": /head report bundles\.pi\.min\.js has no byte sizes/
	} );
} );

test( "the command prints the table and reports bad arguments", t => {
	const directory = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pijs-size-diff-" ) );
	t.after( () => g_fs.rmSync( directory, { "recursive": true, "force": true } ) );
	const baseFile = g_path.join( directory, "base report.json" );
	const headFile = g_path.join( directory, "head report.json" );
	g_fs.writeFileSync( baseFile, JSON.stringify( BASE ) );
	g_fs.writeFileSync( headFile, JSON.stringify( HEAD ) );
	const run = args => g_childProcess.spawnSync( process.execPath, [ SCRIPT, ...args ], {
		"encoding": "utf8", "timeout": 30000
	} );

	const result = run( [ baseFile, headFile ] );
	assert.equal( result.status, 0, result.stderr );
	assert.equal( result.stdout, g_sizeDiff.formatSizeDiff( BASE, HEAD ) );

	const usage = run( [ baseFile ] );
	assert.equal( usage.status, 1 );
	assert.match( usage.stderr, /Usage: npm run size:diff/ );

	const missing = run( [ g_path.join( directory, "missing.json" ), headFile ] );
	assert.equal( missing.status, 1 );
	assert.match( missing.stderr, /cannot read base report/ );
} );
