/**
 * docs/API.md against the metadata: it names every command of the Full bundle and of the
 * sound-advanced plugin, no command that the current version removed, and the package version.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_docChecks from "./doc-checks.js";
const assert = g_assert;
const test = g_test.test;

const API = g_docChecks.readDoc( "docs/API.md" );

/**
 * The names the reference uses as commands: a name before "(", or a whole code span.
 *
 * @returns {Set<string>} Names
 */
function namedCommands() {
	const names = new Set( API.match( /[A-Za-z]+(?=\()/g ) );
	for( const span of API.match( /`[A-Za-z]+`/g ) ) {
		names.add( span.slice( 1, -1 ) );
	}
	return names;
}

test( "the API reference names every command", () => {
	const commands = [ ...g_docChecks.currentCommands() ];
	assert.ok( commands.length > 100 );
	const named = namedCommands();
	const missing = commands.filter( name => !named.has( name ) );
	assert.deepEqual( missing, [], `docs/API.md does not name ${missing.join( ", " )}` );
} );

test( "the API reference names no removed command", () => {
	const named = namedCommands();
	const present = g_docChecks.removedCommands().filter( name => named.has( name ) );
	assert.deepEqual( present, [], `docs/API.md still names ${present.join( ", " )}` );
} );

test( "the API reference is for the package version", () => {
	const version = g_docChecks.VERSION.replaceAll( ".", "\\." );
	assert.match( API, new RegExp( `^# Pi\\.js ${version} API Reference` ) );
} );
