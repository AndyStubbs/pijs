/**
 * docs/UPGRADE-V2.3.md against the metadata: the guide's renamed-command table lists every
 * command that Pi.js 2.3 removes, since removed names have no aliases (G3).
 */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_test from "node:test";
const assert = g_assert;
const test = g_test.test;

const ROOT_DIR = g_path.join( import.meta.dirname, "..", ".." );
const GUIDE = g_fs.readFileSync( g_path.join( ROOT_DIR, "docs", "UPGRADE-V2.3.md" ), "utf8" );
const REMOVED = g_fs.readFileSync(
	g_path.join( ROOT_DIR, "metadata", "pi-2.3", "_removed.toml" ), "utf8"
);

/**
 * Returns the body of a level-2 section of the guide.
 *
 * @param {string} title - Section title
 * @returns {string} The section's text, up to the next level-2 heading
 */
function section( title ) {
	const start = GUIDE.indexOf( `\n## ${title}\n` );
	assert.notEqual( start, -1, `the guide has no "${title}" section` );
	const end = GUIDE.indexOf( "\n## ", start + 1 );
	if( end === -1 ) {
		return GUIDE.slice( start );
	}
	return GUIDE.slice( start, end );
}

test( "the renamed-command table lists every command that 2.3 removes", () => {
	const methods = REMOVED.match( /methods = \[([^\]]*)\]/ )[ 1 ].match( /"[^"]+"/g )
		.map( name => name.slice( 1, -1 ) );
	assert.ok( methods.length > 0 );

	// The first column holds the 2.2 names, each in its own code span
	const renamed = section( "Renamed commands" ).split( "\n" )
		.filter( line => line.startsWith( "| `" ) )
		.map( line => line.split( "|" )[ 2 ] );
	const listed = renamed.join( " " ).match( /`[A-Za-z]+/g ).map( name => name.slice( 1 ) );
	for( const name of methods ) {
		assert.ok( listed.includes( name ), `${name} is not in the renamed-command table` );
	}
} );
