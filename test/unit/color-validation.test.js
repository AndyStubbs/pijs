/**
 * SYS-017 palette validation regressions against the actual color and utility modules.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;

function createHarness() {
	const getters = {};
	const utilsContext = g_harness.loadModule( "src/core/utils.js", {
		"document": { "createElement": () => ( { "getContext": () => ( {} ) } ) }
	} );
	const context = g_harness.loadModule( "src/api/colors.js", {
		"g_utils": utilsContext,
		"g_commands": { "addCommand": () => {} },
		"g_screenManager": { "addScreenDataItemGetter": ( name, getter ) => {
			getters[ name ] = getter;
		} }
	} );
	context.init();
	context.setDefaultPal( { "pal": [ "#FF0000", "#00FF00" ] } );
	context.setDefaultColor( { "color": 1 } );
	const screen = {};
	for( const [ name, getter ] of Object.entries( getters ) ) {
		screen[ name ] = getter();
	}
	return { "api": context, "screen": screen, "getters": getters };
}

const invalidIndices = [ -1, -0.5, 0.5, NaN, Infinity, -Infinity, 3 ];

for( const value of invalidIndices ) {
	test( `SYS-017 setters reject ${value} and preserve color state`, () => {
		const { api, screen, getters } = createHarness();
		const current = screen.color;
		const defaultColor = getters.color();
		assert.throws( () => api.setColor( screen, { "color": value } ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" } );
		assert.equal( screen.color, current );
		assert.throws( () => api.setDefaultColor( { "color": value } ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" } );
		assert.equal( getters.color(), defaultColor );
	} );

	test( `SYS-017 numeric lookups return null for ${value}`, () => {
		const { api, screen } = createHarness();
		assert.equal( api.getColorValueByIndex( screen, value ), null );
		assert.equal( api.getColorValueByRawInput( screen, value ), null );
		assert.equal( api.getPalColor( screen, { "index": value } ), null );
	} );
}

test( "SYS-017 index-only lookups reject nonnumeric array properties", () => {
	const { api, screen } = createHarness();
	for( const index of [ "1", "length", "map", "__proto__", null, undefined, true, [ 1 ] ] ) {
		assert.equal( api.getColorValueByIndex( screen, index ), null );
		assert.equal( api.getPalColor( screen, { "index": index } ), null );
	}
} );

test( "SYS-017 valid boundary indices include transparent zero", () => {
	const { api, screen, getters } = createHarness();
	for( const index of [ 0, -0, 1, 2 ] ) {
		const expected = screen.pal[ index ];
		api.setColor( screen, { "color": index } );
		api.setDefaultColor( { "color": index } );
		assert.equal( screen.color, expected );
		assert.equal( getters.color(), expected );
		assert.equal( api.getColorValueByIndex( screen, index ), expected );
		assert.equal( api.getColorValueByRawInput( screen, index ), expected );
		assert.deepEqual( Array.from( api.getPalColor( screen, { "index": index } ).array ),
			Array.from( expected.array ) );
	}
} );

test( "SYS-017 setters preserve supported color values and reject null without mutation", () => {
	const { api, screen, getters } = createHarness();
	for( const input of [ "#123456", [ 18, 52, 86, 255 ],
		{ "r": 18, "g": 52, "b": 86, "a": 255 }, api.g_utils.rgbToColor( 18, 52, 86, 255 ) ] ) {
		api.setColor( screen, { "color": input } );
		api.setDefaultColor( { "color": input } );
		assert.deepEqual( Array.from( screen.color.array ), [ 18, 52, 86, 255 ] );
		assert.deepEqual( Array.from( getters.color().array ), [ 18, 52, 86, 255 ] );
	}
	const previous = getters.color();
	assert.throws( () => api.setDefaultColor( { "color": null } ),
		{ "name": "TypeError", "code": "INVALID_PARAMETER" } );
	assert.equal( getters.color(), previous );
} );
