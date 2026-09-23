/**
 * Plugin Service Tests
 *
 * Verifies pluginApi.provideService() and pluginApi.getService() against the real plugin
 * registry module with stubbed command and screen dependencies.
 */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_url from "node:url";
import * as g_vm from "node:vm";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const assert = g_assert;
const test = g_test.test;

function createRegistry() {
	const source = g_fs.readFileSync(
		g_path.join( DIRNAME, "../../src/core/plugins.js" ), "utf8"
	)
		.replace( /^import .*;\r?\n/gm, "" )
		.replace( /^export \{.*\};\r?\n/gm, "" )
		.replace( /export /g, "" );
	const commands = {};
	const context = g_vm.createContext( {
		"console": console,
		"g_commands": {
			"addCommand": ( name, fn ) => { commands[ name ] = fn; },
			"processCommands": () => {}
		},
		"g_screenManager": {
			"getAllScreensData": () => [],
			"installScreenExtensions": () => {}
		},
		"g_utils": {},
		"queueMicrotask": () => {}
	} );
	g_vm.runInContext( source, context, { "filename": "src/core/plugins.js" } );
	context.init( {} );
	return commands;
}

function plugin( name, dependencies, init ) {
	return { "name": name, "dependencies": dependencies, "init": init };
}

test( "a dependency's service is available during and after the consumer's init", () => {
	const commands = createRegistry();
	const service = { "version": 1 };
	let consumerApi = null;
	let seenDuringInit = null;
	commands.registerPlugin( plugin( "consumer", [ "provider" ], api => {
		consumerApi = api;
		seenDuringInit = api.getService( "provider" );
	} ) );
	assert.equal( seenDuringInit, null );
	commands.registerPlugin( plugin( "provider", [], api => api.provideService( service ) ) );
	assert.equal( seenDuringInit, service );
	assert.equal( consumerApi.getService( "provider" ), service );
} );

test( "getService rejects undeclared and service-less plugins", () => {
	const commands = createRegistry();
	commands.registerPlugin( plugin( "provider", [], api => api.provideService( {} ) ) );
	commands.registerPlugin( plugin( "plain", [], () => {} ) );
	let api = null;
	commands.registerPlugin( plugin( "consumer", [ "plain" ], pluginApi => {
		api = pluginApi;
	} ) );
	assert.throws( () => api.getService( "provider" ), {
		"code": "SERVICE_NOT_AVAILABLE", "message": /not a declared dependency/
	} );
	assert.throws( () => api.getService( "absent" ), {
		"code": "SERVICE_NOT_AVAILABLE", "message": /not a declared dependency/
	} );
	assert.throws( () => api.getService( "plain" ), {
		"code": "SERVICE_NOT_AVAILABLE", "message": /does not provide a service/
	} );
} );

test( "provideService validates its argument and accepts one service during init", () => {
	const commands = createRegistry();
	const errors = [];
	let api = null;
	commands.registerPlugin( plugin( "provider", [], pluginApi => {
		api = pluginApi;
		for( const value of [ null, undefined, 1, "service", true ] ) {
			try {
				pluginApi.provideService( value );
			} catch( error ) {
				errors.push( [ error.name, error.code ] );
			}
		}
		pluginApi.provideService( { "id": "first" } );
		try {
			pluginApi.provideService( { "id": "second" } );
		} catch( error ) {
			errors.push( [ error.name, error.code ] );
		}
	} ) );
	assert.deepEqual( errors, [
		...Array( 5 ).fill( [ "TypeError", "INVALID_SERVICE" ] ),
		[ "Error", "DUPLICATE_SERVICE" ]
	] );
	assert.throws( () => api.provideService( {} ), { "code": "SERVICE_PROVIDE_CLOSED" } );

	let consumerApi = null;
	commands.registerPlugin( plugin( "consumer", [ "provider" ], pluginApi => {
		consumerApi = pluginApi;
	} ) );
	assert.equal( consumerApi.getService( "provider" ).id, "first" );
} );

test( "a plugin whose init fails exposes no service and blocks its dependents", () => {
	const commands = createRegistry();
	assert.throws( () => commands.registerPlugin( plugin( "broken", [], api => {
		api.provideService( { "id": "broken" } );
		throw new Error( "expected" );
	} ) ), { "code": "PLUGIN_INIT_FAILED" } );

	const initialized = [];
	commands.registerPlugin( plugin( "dependent", [ "broken" ], () => {
		initialized.push( "dependent" );
	} ) );
	assert.deepEqual( initialized, [] );
	assert.equal(
		commands.getPlugins().find( item => item.name === "dependent" ).initialized, false
	);
} );
