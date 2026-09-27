/**
 * Plugin registry tests against the real registry module with stubbed command and screen
 * dependencies: dependency order, cycles, failures, reentrant registration, validation,
 * services through pluginApi.provideService() and pluginApi.getService(), transactional
 * installation, and which call reports a failure.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_harness from "./vm-module-harness.js";
const assert = g_assert;
const test = g_test.test;

function plugin( name, dependencies, init ) {
	return { "name": name, "dependencies": dependencies, "init": init };
}

// getPlugins() returns an array from the module's realm; copy it for strict comparison
function states( commands, filter = () => true ) {
	return Array.from( commands.getPlugins() ).filter( filter )
		.map( item => [ item.name, item.state ] );
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
	assert.deepEqual(
		states( commands, item => !item.initialized ),
		[
			[ "cycle-a", "pending" ], [ "cycle-b", "pending" ], [ "missing", "pending" ],
			[ "blocked", "pending" ], [ "failed", "failed" ]
		]
	);
} );

test( "a failed plugin commits nothing and its name can be registered again", () => {
	const registrations = [];
	const commands = g_harness.createPluginRegistry( undefined, {
		"registrations": registrations
	} );
	const cleared = [];
	assert.throws( () => commands.registerPlugin( plugin( "bad", [], api => {
		api.addCommand( "badCmd", () => 1, true, [] );
		api.addCommand( "setBad", () => {}, false, [ "value" ] );
		api.addScreenDataItem( "badData", 1 );
		api.addScreenDataItemGetter( "badGetter", () => 1 );
		api.addScreenInitFunction( function badInit() {} );
		api.addScreenPreCleanupFunction( function badPreCleanup() {} );
		api.addScreenCleanupFunction( function badCleanup() {} );
		api.registerClearEvents( "bad", () => cleared.push( "bad" ) );
		throw new Error( "expected" );
	} ) ), { "code": "PLUGIN_INIT_FAILED" } );
	assert.deepEqual( registrations, [] );
	commands.clearEvents( null, {} );
	assert.deepEqual( cleared, [] );
	assert.deepEqual( states( commands ), [ [ "bad", "failed" ] ] );

	// The retry replaces the failed record and releases the plugin that waits on it
	const initialized = [];
	commands.registerPlugin( plugin( "dependent", [ "bad" ], () => {
		initialized.push( "dependent" );
	} ) );
	commands.registerPlugin( plugin( "bad", [], api => {
		api.addCommand( "goodCmd", () => 1, true, [] );
		api.registerClearEvents( "bad", () => cleared.push( "bad" ) );
		initialized.push( "bad" );
	} ) );
	assert.deepEqual( initialized, [ "bad", "dependent" ] );
	assert.deepEqual( registrations, [ [ "command", "goodCmd" ] ] );
	commands.clearEvents( null, {} );
	assert.deepEqual( cleared, [ "bad" ] );
	assert.deepEqual( states( commands ), [
		[ "dependent", "initialized" ], [ "bad", "initialized" ]
	] );
} );

test( "a failure installing on existing screens commits nothing", () => {
	const registrations = [];
	const commands = g_harness.createPluginRegistry( undefined, {
		"registrations": registrations,
		"installScreenExtensions": () => {
			throw new Error( "screen failed" );
		}
	} );
	assert.throws( () => commands.registerPlugin( plugin( "late", [], api => {
		api.addCommand( "lateCmd", () => 1, true, [] );
		api.addScreenInitFunction( function lateInit() {} );
	} ) ), { "code": "PLUGIN_INIT_FAILED", "message": /'late': screen failed/ } );
	assert.deepEqual( registrations, [] );
	assert.equal( commands.getPlugins()[ 0 ].state, "failed" );
} );

test( "each registerPlugin call throws only its own plugin's failure", () => {
	const logged = [];
	const commands = g_harness.createPluginRegistry( undefined, {
		"console": { "error": message => logged.push( message ) }
	} );
	const register = commands.registerPlugin;
	const fail = message => () => {
		throw new Error( message );
	};
	const failure = ( name, message ) => {
		return `registerPlugin: Failed to initialize plugin '${name}': ${message}`;
	};

	// Nested: inner is resolved after outer's init, so the outer call logs it
	let innerOutcome = "threw";
	register( plugin( "outer", [], () => {
		register( plugin( "inner", [], fail( "inner failed" ) ) );
		innerOutcome = "returned";
	} ) );
	assert.equal( innerOutcome, "returned" );
	assert.deepEqual( logged, [ failure( "inner", "inner failed" ) ] );

	// Pending: b fails while a's call resolves it
	logged.length = 0;
	register( plugin( "b", [ "a" ], fail( "b failed" ) ) );
	register( plugin( "c", [ "a" ], () => {} ) );
	register( plugin( "a", [], () => {} ) );
	assert.deepEqual( logged, [ failure( "b", "b failed" ) ] );

	// Own failure: thrown to its call, while another failure in the same pass is logged
	logged.length = 0;
	assert.throws( () => register( plugin( "h", [], () => {
		register( plugin( "k", [], fail( "k failed" ) ) );
		throw new Error( "h failed" );
	} ) ), { "code": "PLUGIN_INIT_FAILED", "message": /'h': h failed/ } );
	assert.deepEqual( logged, [ failure( "k", "k failed" ) ] );

	assert.deepEqual( states( commands ), [
		[ "outer", "initialized" ], [ "inner", "failed" ], [ "b", "failed" ],
		[ "c", "initialized" ], [ "a", "initialized" ], [ "h", "failed" ], [ "k", "failed" ]
	] );
} );

test( "registration methods throw REGISTRATION_CLOSED after init", () => {
	const registrations = [];
	const commands = g_harness.createPluginRegistry( undefined, {
		"registrations": registrations
	} );
	const apis = [];
	commands.registerPlugin( plugin( "succeeded", [], api => apis.push( api ) ) );
	assert.throws( () => commands.registerPlugin( plugin( "failed", [], api => {
		apis.push( api );
		throw new Error( "expected" );
	} ) ), { "code": "PLUGIN_INIT_FAILED" } );
	const calls = [
		[ "addCommand", [ "lateCmd", () => {}, false, [] ] ],
		[ "addScreenDataItem", [ "late", 1 ] ],
		[ "addScreenDataItemGetter", [ "late", () => 1 ] ],
		[ "addScreenInitFunction", [ () => {} ] ],
		[ "addScreenPreCleanupFunction", [ () => {} ] ],
		[ "addScreenCleanupFunction", [ () => {} ] ],
		[ "registerClearEvents", [ "late", () => {} ] ]
	];
	for( const api of apis ) {
		for( const [ method, args ] of calls ) {
			assert.throws( () => api[ method ]( ...args ), {
				"code": "REGISTRATION_CLOSED", "message": new RegExp( `^${method}: ` )
			} );
		}
	}
	assert.deepEqual( registrations, [] );
} );

test( "registerClearEvents rejects names committed earlier or pending in the same plugin", () => {
	const commands = g_harness.createPluginRegistry();
	commands.registerPlugin( plugin( "first", [], api => {
		api.registerClearEvents( "Shared", () => {} );
	} ) );
	const errors = [];
	commands.registerPlugin( plugin( "second", [], api => {
		for( const name of [ "shared", "own", "OWN" ] ) {
			try {
				api.registerClearEvents( name, () => {} );
			} catch( error ) {
				errors.push( [ name, error.code ] );
			}
		}
	} ) );
	assert.deepEqual( errors, [
		[ "shared", "DUPLICATE_HANDLER" ], [ "OWN", "DUPLICATE_HANDLER" ]
	] );
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
