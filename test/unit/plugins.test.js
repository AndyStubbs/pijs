/**
 * Plugin registry tests against the real registry module with stubbed command and screen
 * dependencies: dependency order, cycles, failures, reentrant registration, validation, and
 * services through pluginApi.provideService() and pluginApi.getService().
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_harness from "./vm-module-harness.js";
const assert = g_assert;
const test = g_test.test;

function plugin( name, dependencies, init ) {
	return { "name": name, "dependencies": dependencies, "init": init };
}

test( "a dependency's service is available during and after the consumer's init", () => {
	const commands = g_harness.createPluginRegistry();
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
	const commands = g_harness.createPluginRegistry();
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
	const commands = g_harness.createPluginRegistry();
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
	const commands = g_harness.createPluginRegistry();
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

test( "plugin cycles, failure, reentrant registration, and validation remain deterministic", () => {
	const commands = g_harness.createPluginRegistry();
	const register = commands.registerPlugin;
	const order = [];
	const config = ( name, dependencies, init = () => order.push( name ) ) => ( {
		"name": name, "dependencies": dependencies, "init": init
	} );
	register( config( "cycle-a", [ "cycle-b" ] ) );
	register( config( "cycle-b", [ "cycle-a" ] ) );
	register( config( "missing", [ "absent" ] ) );
	register( config( "blocked", [ "failed" ] ) );
	let attempts = 0;
	assert.throws( () => register( config( "failed", [], () => {
		attempts++;
		register( config( "independent", [] ) );
		throw new Error( "expected" );
	} ) ), { "code": "PLUGIN_INIT_FAILED" } );
	assert.deepEqual( order, [ "independent" ] );
	register( config( "outer", [], () => {
		register( config( "inner", [ "outer" ] ) );
		order.push( "outer" );
	} ) );
	assert.deepEqual( order, [ "independent", "outer", "inner" ] );
	assert.equal( attempts, 1 );
	assert.throws( () => register( config( "outer", [] ) ), { "code": "DUPLICATE_PLUGIN" } );
	for( const dependencies of [ "outer", [ "" ], [ " " ], [ 1 ], {} ] ) {
		assert.throws( () => register( config( "invalid", dependencies ) ), {
			"code": "INVALID_PLUGIN_DEPENDENCIES"
		} );
	}
	register( config( "default-dependencies", undefined ) );
	assert.equal( commands.getPlugins().filter( item => !item.initialized ).length, 5 );
} );

test( "plugin dependencies resolve in initialization order after late registration", () => {
	const microtasks = [];
	const commands = g_harness.createPluginRegistry( fn => microtasks.push( fn ) );
	for( const fn of microtasks ) {
		fn();
	}
	const order = [];
	for( const [ name, dependencies ] of [ [ "A", [ "B" ] ], [ "B", [ "C" ] ], [ "C", [] ] ] ) {
		commands.registerPlugin( { "name": name, "dependencies": dependencies,
			"init": () => order.push( name ) } );
	}
	assert.deepEqual( order, [ "C", "B", "A" ] );
	assert.ok( commands.getPlugins().every( plugin => plugin.initialized ) );
} );
