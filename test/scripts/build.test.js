/**
 * Pi.js Aggregate Build Tests
 *
 * Verifies that optional-plugin failures reject the requested aggregate build.
 */

"use strict";

const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const os = require( "node:os" );
const path = require( "node:path" );
const test = require( "node:test" );
const { buildAllPlugins } = require( "../../scripts/build.js" );

function createPluginFixture( t, pluginNames, directoryNames = [] ) {
	const pluginsDir = fs.mkdtempSync( path.join( os.tmpdir(), "pijs-build-plugins-" ) );
	t.after( () => fs.rmSync( pluginsDir, { "force": true, "recursive": true } ) );

	for( const directoryName of [ ...pluginNames, ...directoryNames ] ) {
		fs.mkdirSync( path.join( pluginsDir, directoryName ) );
	}

	for( const pluginName of pluginNames ) {
		fs.writeFileSync(
			path.join( pluginsDir, pluginName, "index.js" ),
			`export default function ${pluginName.replace( /-/g, "_" )}() {}\n`,
			"utf8"
		);
	}

	return pluginsDir;
}

test( "buildAllPlugins skips directories without an entry point", async t => {
	const pluginsDir = createPluginFixture( t, [ "buildable" ], [ "notes" ] );
	const attempted = [];

	const count = await buildAllPlugins( {
		"buildPlugin": async pluginName => {
			attempted.push( pluginName );
			return true;
		},
		"pluginsDir": pluginsDir
	} );

	assert.equal( count, 1 );
	assert.deepEqual( attempted, [ "buildable" ] );
} );

test( "buildAllPlugins reports one failed plugin after attempting the full set", async t => {
	const pluginsDir = createPluginFixture( t, [ "alpha", "broken", "omega" ] );
	const attempted = [];

	await assert.rejects(
		buildAllPlugins( {
			"buildPlugin": async pluginName => {
				attempted.push( pluginName );
				return pluginName !== "broken";
			},
			"pluginsDir": pluginsDir
		} ),
		{ "message": "Failed to build 1 plugin: broken" }
	);

	assert.deepEqual( attempted, [ "alpha", "broken", "omega" ] );
} );

test( "buildAllPlugins reports every failed plugin", async t => {
	const pluginsDir = createPluginFixture(
		t,
		[ "alpha-broken", "middle", "omega-broken" ]
	);

	await assert.rejects(
		buildAllPlugins( {
			"buildPlugin": async pluginName => !pluginName.endsWith( "-broken" ),
			"pluginsDir": pluginsDir
		} ),
		{
			"message": "Failed to build 2 plugins: alpha-broken, omega-broken"
		}
	);
} );

test( "buildAllPlugins returns zero when no plugins are buildable", async t => {
	const pluginsDir = createPluginFixture( t, [], [ "documentation" ] );
	let attempted = false;

	const count = await buildAllPlugins( {
		"buildPlugin": async () => {
			attempted = true;
			return true;
		},
		"pluginsDir": pluginsDir
	} );

	assert.equal( count, 0 );
	assert.equal( attempted, false );
} );
