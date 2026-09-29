/**
 * The release package's documents against its manifest: the package README names every plugin
 * export, the changelog starts with the package version, and the README and the publishing
 * guide link the upgrade guide for that version, which exists.
 */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_test from "node:test";
const assert = g_assert;
const test = g_test.test;

const ROOT_DIR = g_path.join( import.meta.dirname, "..", ".." );
const PACKAGE_DIR = g_path.join( ROOT_DIR, "releases", "pi-latest" );
const MANIFEST = JSON.parse(
	g_fs.readFileSync( g_path.join( PACKAGE_DIR, "package.json" ), "utf8" )
);

/**
 * Reads a document from the repository.
 *
 * @param {...string} parts - Path parts from the repository root
 * @returns {string} File contents
 */
function read( ...parts ) {
	return g_fs.readFileSync( g_path.join( ROOT_DIR, ...parts ), "utf8" );
}

test( "the package README names every plugin export", () => {
	const readme = read( "releases", "pi-latest", "README.md" );
	const plugins = Object.keys( MANIFEST.exports )
		.filter( key => key.startsWith( "./plugins/" ) );
	assert.ok( plugins.length > 0 );
	for( const key of plugins ) {
		const entry = `${MANIFEST.name}/${key.slice( 2 )}`;
		assert.ok( readme.includes( `\`${entry}\`` ), `the README does not name ${entry}` );
	}
} );

test( "the changelog starts with the package version", () => {
	const changelog = read( "releases", "pi-latest", "CHANGELOG.md" );
	const first = changelog.match( /^## \[([^\]]+)\]/m );
	assert.ok( first, "the changelog has no version heading" );
	assert.equal( first[ 1 ], MANIFEST.version );
} );

test( "the README and the publishing guide link the version's upgrade guide", () => {
	const minor = MANIFEST.version.split( "." ).slice( 0, 2 ).join( "." );
	const guide = `UPGRADE-V${minor}.md`;
	assert.ok(
		g_fs.existsSync( g_path.join( ROOT_DIR, "docs", guide ) ), `docs/${guide} is missing`
	);
	assert.ok(
		read( "releases", "pi-latest", "README.md" ).includes( `/docs/${guide})` ),
		`the package README does not link ${guide}`
	);
	assert.ok(
		read( "releases", "PUBLISH.md" ).includes( `(../docs/${guide})` ),
		`PUBLISH.md does not link ${guide}`
	);
} );
