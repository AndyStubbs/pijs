/**
 * docs/API.md against the metadata: it names every command of the Full bundle and of the
 * sound-advanced plugin, no command that the current version removed, and the package version.
 */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_generateMetadata from "../../scripts/generate-metadata.js";
const assert = g_assert;
const test = g_test.test;

const ROOT_DIR = g_path.join( import.meta.dirname, "..", ".." );
const API = g_fs.readFileSync( g_path.join( ROOT_DIR, "docs", "API.md" ), "utf8" );
const VERSION = JSON.parse(
	g_fs.readFileSync( g_path.join( ROOT_DIR, "package.json" ), "utf8" )
).version;

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
	const commands = [ ...g_generateMetadata.layerMetadata().methods.keys() ].concat(
		g_generateMetadata.readPluginMethods( "sound-advanced" ).map( method => method.name )
	);
	assert.ok( commands.length > 100 );
	const named = namedCommands();
	const missing = commands.filter( name => !named.has( name ) );
	assert.deepEqual( missing, [], `docs/API.md does not name ${missing.join( ", " )}` );
} );

test( "the API reference names no removed command", () => {
	const minor = VERSION.split( "." ).slice( 0, 2 ).join( "." );
	const removedFile = g_fs.readFileSync(
		g_path.join( ROOT_DIR, "metadata", `pi-${minor}`, "_removed.toml" ), "utf8"
	);
	const removed = removedFile.match( /methods = \[([^\]]*)\]/ )[ 1 ].match( /"[^"]+"/g )
		.map( name => name.slice( 1, -1 ) );
	const named = namedCommands();
	const present = removed.filter( name => named.has( name ) );
	assert.deepEqual( present, [], `docs/API.md still names ${present.join( ", " )}` );
} );

test( "the API reference is for the package version", () => {
	const version = VERSION.replaceAll( ".", "\\." );
	assert.match( API, new RegExp( `^# Pi\\.js ${version} API Reference` ) );
} );
