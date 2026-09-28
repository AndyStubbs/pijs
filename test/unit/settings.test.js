/**
 * CORE-008 set() regressions against the real command and utility modules: option names are
 * checked before any setting applies, and a screen setting with no screen throws the core
 * no-screen error. Bundle-level cases (Full-only settings in Lite) are in
 * plugin-installation-browser.test.js.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_vm from "node:vm";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;

/**
 * The real command module with a stub screen manager and four settings: `color` (screen),
 * `defaultPal` (global), `screen` (switches the active screen), and `hint` (screen, optional).
 *
 * @param {boolean} [hasScreen] - Whether a screen is active at the start.
 * @returns {Object} `{ set, calls }`; `set` takes a plain value and
 *   passes a copy made in the modules' realm, as a page's object literal would be.
 */
function createSettingsHarness( hasScreen = false ) {
	const calls = [];
	let activeScreen = null;
	if( hasScreen ) {
		activeScreen = { "id": 1 };
	}

	// utils.js creates a canvas at load for color parsing, which these settings do not use
	const context = g_harness.loadModule( "src/core/utils.js", {
		"window": {},
		"document": {
			"readyState": "complete",
			"createElement": () => ( { "getContext": () => null } ),
			"addEventListener": () => {}
		}
	}, { "exposeConsts": true } );
	context.g_utils = {
		"parseOptions": context.parseOptions,
		"isObjectLiteral": context.isObjectLiteral,
		"isFunction": context.isFunction
	};
	context.g_screenManager = {
		"addScreenInitFunction": () => {},
		"getActiveScreen": ( fnName, isScreenOptional ) => {
			if( activeScreen === null && !isScreenOptional ) {
				const error = new Error( fnName + ": no active screen" );
				error.code = "NO_ACTIVE_SCREEN";
				throw error;
			}
			return activeScreen;
		}
	};
	g_vm.runInContext(
		g_harness.readModuleSource( "src/core/commands.js" ), context,
		{ "filename": "src/core/commands.js" }
	);
	const record = name => ( screenData, options ) => {
		let screenId = null;
		if( screenData !== null ) {
			screenId = screenData.id;
		}
		calls.push( [ name, screenId, JSON.parse( JSON.stringify( options ) ) ] );
	};
	context.addCommand( "setColor", record( "color" ), true, [ "color" ] );
	context.addCommand( "setHint", record( "hint" ), true, [ "text" ], true );
	context.addCommand( "setDefaultPal", options => {
		calls.push( [ "defaultPal", null, JSON.parse( JSON.stringify( options ) ) ] );
	}, false, [ "pal" ] );
	context.addCommand( "setScreen", options => {
		activeScreen = { "id": options.screen };
		calls.push( [ "screen", null, JSON.parse( JSON.stringify( options ) ) ] );
	}, false, [ "screen" ] );
	context.init( {} );
	const api = {};
	const realmJson = g_vm.runInContext( "JSON", context );
	context.processCommands( api );
	return {
		"set": value => {
			if( value === undefined ) {
				return api.set();
			}
			return api.set( realmJson.parse( JSON.stringify( value ) ) );
		},
		"calls": calls
	};
}

test( "CORE-008 set() applies settings in order, skips null, and follows a screen option", () => {
	const h = createSettingsHarness();
	h.set( { "defaultPal": [ 1 ], "hint": "a", "screen": 7, "color": 2 } );
	h.set( { "color": null, "hint": null } );
	h.set( { "options": { "color": 3 } } );
	assert.deepEqual( h.calls, [
		[ "defaultPal", null, { "pal": [ 1 ] } ],
		[ "hint", null, { "text": "a" } ],
		[ "screen", null, { "screen": 7 } ],
		[ "color", 7, { "color": 2 } ],
		[ "color", 7, { "color": 3 } ]
	] );
} );

test( "CORE-008 set() throws INVALID_OPTION for unknown and inherited names", () => {
	const h = createSettingsHarness( true );
	for( const name of [
		"notARealOption", "toString", "hasOwnProperty", "__proto__", "constructor", "set", "Color"
	] ) {
		assert.throws( () => h.set( { "color": 1, [ name ]: 1 } ), {
			"name": "RangeError",
			"code": "INVALID_OPTION",
			"message": `set: Option "${name}" is not a setting. Check its spelling, or load the ` +
				"plugin that provides it."
		}, name );
	}

	// A null value does not excuse an unknown name, and nothing applies before the throw
	assert.throws( () => h.set( { "color": 1, "notARealOption": null } ), {
		"code": "INVALID_OPTION"
	} );
	assert.deepEqual( h.calls, [] );
} );

test( "CORE-008 set() throws INVALID_OPTIONS when options is not an object", () => {
	const h = createSettingsHarness( true );
	for( const value of [ undefined, null, 5, "color", [ { "color": 1 } ], true ] ) {
		assert.throws( () => h.set( value ), {
			"name": "TypeError",
			"code": "INVALID_OPTIONS",
			"message": "set: Parameter options must be an object."
		}, String( value ) );
	}
	assert.throws( () => h.set( { "options": 5 } ), { "code": "INVALID_OPTIONS" } );
	assert.deepEqual( h.calls, [] );
} );

test( "CORE-008 a screen setting with no screen throws before any setting applies", () => {
	const h = createSettingsHarness();
	assert.throws( () => h.set( { "defaultPal": [ 1 ], "color": 1 } ), {
		"code": "NO_ACTIVE_SCREEN", "message": "set: no active screen"
	} );
	assert.throws( () => h.set( { "color": 1, "screen": 3 } ), { "code": "NO_ACTIVE_SCREEN" } );
	assert.deepEqual( h.calls, [] );

	// Null screen settings, optional screen settings, and settings after a screen option apply
	h.set( { "color": null, "hint": "b", "defaultPal": [ 2 ] } );
	h.set( { "screen": 4, "color": 5 } );
	assert.deepEqual( h.calls, [
		[ "hint", null, { "text": "b" } ],
		[ "defaultPal", null, { "pal": [ 2 ] } ],
		[ "screen", null, { "screen": 4 } ],
		[ "color", 4, { "color": 5 } ]
	] );
} );
