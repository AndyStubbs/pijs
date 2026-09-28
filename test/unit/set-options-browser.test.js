/**
 * CORE-008 strict set() regressions (probe C07) against fresh full and lite bundles: unknown,
 * inherited, and unavailable option names, non-object options, and screen settings without a
 * screen.
 * Run with node --test test/unit/set-options-browser.test.js.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_chromiumLaunch from "./chromium-launch.js";
import * as g_browserSourceHarness from "./browser-source-harness.js";
const { test, before, after } = g_test;
const assert = g_assert;
const { createSourceContext } = g_browserSourceHarness;

// Settings the full bundle gets from its plugins; lite has none of them
const PLUGIN_OPTIONS = [ "actionKeys", "pinchZoom", "volume" ];

let browser;
let context;

before( async () => {
	browser = await g_chromiumLaunch.launchChromium();
	context = await createSourceContext( browser );
} );

after( async () => {
	await context?.close();
	await browser?.close();
} );

async function probe( bundle, fn, arg ) {
	const page = await context.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.goto( "http://localhost:8080/" );
		await page.addScriptTag( { "url": `/build/${bundle}` } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => {
			window.outcome = fn => {
				try {
					fn();
					return "ok";
				} catch( error ) {
					return `${error.name} ${error.code}: ${error.message}`;
				}
			};
		} );
		const result = await page.evaluate( fn, arg );
		assert.deepEqual( errors, [] );
		return result;
	} finally {
		await page.close();
	}
}

for( const bundle of [ "pi.js", "pi.lite.js" ] ) {
	test( `set() rejects unknown and inherited names in ${bundle}`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const screen = $.screen( "8x8" );
			return {
				"unknown": outcome( () => $.set( { "notARealOption": 1 } ) ),
				"inherited": [ "toString", "constructor", "hasOwnProperty" ].map(
					name => outcome( () => $.set( { [ name ]: 1 } ) )
				),
				"blankUnknown": outcome( () => $.set( { "notARealOption": null } ) ),
				"screenForm": outcome( () => screen.set( { "notARealOption": 1 } ) )
			};
		} ), {
			"unknown": "TypeError INVALID_OPTION: set: Unknown option \"notARealOption\". " +
				"Check its spelling, or load the plugin that provides it.",
			"inherited": [ "toString", "constructor", "hasOwnProperty" ].map(
				name => `TypeError INVALID_OPTION: set: Unknown option "${name}". ` +
					"Check its spelling, or load the plugin that provides it."
			),
			"blankUnknown": "TypeError INVALID_OPTION: set: Unknown option \"notARealOption\". " +
				"Check its spelling, or load the plugin that provides it.",
			"screenForm": "TypeError INVALID_OPTION: set: Unknown option \"notARealOption\". " +
				"Check its spelling, or load the plugin that provides it."
		} );
	} );

	test( `set() rejects options that are not an object in ${bundle}`, async () => {
		const expected = "TypeError INVALID_OPTIONS: set: Parameter options must be an object.";
		assert.deepEqual( await probe( bundle, () => {
			$.screen( "8x8" );
			return [
				outcome( () => $.set() ),
				outcome( () => $.set( null ) ),
				outcome( () => $.set( 5 ) ),
				outcome( () => $.set( "color" ) ),
				outcome( () => $.set( [ 1 ] ) )
			];
		} ), [ expected, expected, expected, expected, expected ] );
	} );

	test( `set() needs a screen for screen settings in ${bundle}`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const noScreen = outcome( () => $.set( { "color": 1 } ) );
			const blank = outcome( () => $.set( { "color": null } ) );
			$.screen( "8x8" );
			return { "noScreen": noScreen, "blank": blank };
		} ), {
			"noScreen": "Error NO_ACTIVE_SCREEN: set: Option \"color\" requires a screen but " +
				"there is currently no active screen. Call $.screen() before setting it.",
			"blank": "ok"
		} );
	} );

	test( `a rejected set() applies none of its options in ${bundle}`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const before = $.getDefaultPal().length;
			const results = [
				outcome( () => $.set( { "defaultPal": [ "#FF0000" ], "color": 1 } ) )
			];
			const screen = $.screen( "8x8" );
			$.setColor( 2 );
			results.push( outcome( () => $.set( { "color": 3, "notARealOption": 1 } ) ) );
			return {
				"codes": results.map( result => result.split( ":" )[ 0 ] ),
				"defaultPal": $.getDefaultPal().length === before,
				"color": screen.getColor( true )
			};
		} ), {
			"codes": [ "Error NO_ACTIVE_SCREEN", "TypeError INVALID_OPTION" ],
			"defaultPal": true,
			"color": 2
		} );
	} );

	test( `set() applies settings in order after a screen option in ${bundle}`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const first = $.screen( "8x8" );
			const second = $.screen( "8x8" );
			$.set( { "screen": first, "color": 4 } );
			second.setColor( 6 );
			$.set( { "screen": second.id, "color": 5 } );
			return [ first.getColor( true ), second.getColor( true ) ];
		} ), [ 4, 5 ] );
	} );

	test( `set() accepts settings a plugin registers in ${bundle}`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			let widget = null;
			$.registerPlugin( { "name": "widget", "init": pluginApi => {
				pluginApi.addCommand( "setWidget", options => {
					widget = options.value;
				}, false, [ "value" ] );
			} } );
			return [ outcome( () => $.set( { "widget": 3 } ) ), widget ];
		} ), [ "ok", 3 ] );
	} );

	test( `set() plugin options match the bundle's plugins in ${bundle}`, async () => {
		const results = await probe( bundle, names => {
			$.screen( "8x8" );
			return names.map( name => outcome( () => $.set( { [ name ]: null } ) ) );
		}, PLUGIN_OPTIONS );
		let expected = PLUGIN_OPTIONS.map( () => "ok" );
		if( bundle === "pi.lite.js" ) {
			expected = PLUGIN_OPTIONS.map(
				name => `TypeError INVALID_OPTION: set: Unknown option "${name}". ` +
					"Check its spelling, or load the plugin that provides it."
			);
		}
		assert.deepEqual( results, expected );
	} );
}
