/**
 * SYS-009 late plugin installation and CORE-002 failed-installation rollback regressions against
 * fresh full and lite bundles.
 * Run with node --test test/unit/plugin-installation-browser.test.js.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_chromiumLaunch from "./chromium-launch.js";
import * as g_browserSourceHarness from "./browser-source-harness.js";
const { test, before, after } = g_test;
const assert = g_assert;
const { createSourceContext } = g_browserSourceHarness;

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

async function probe( bundle, fn ) {
	const page = await context.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.goto( "http://localhost:8080/" );
		await page.addScriptTag( { "url": `/build/${bundle}` } );
		await page.evaluate( () => $.ready() );
		const result = await page.evaluate( fn );
		assert.deepEqual( errors, [] );
		return result;
	} finally {
		await page.close();
	}
}

for( const bundle of [ "pi.js", "pi.lite.js" ] ) {
	test( `late custom plugins initialize existing screens once in ${bundle}`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			$.registerPlugin( {
				"name": "early-install-test",
				"init": pluginApi => {
					pluginApi.addScreenDataItem( "earlyInitCount", 0 );
					pluginApi.addScreenInitFunction( screenData => {
						screenData.earlyInitCount++;
					} );
				}
			} );

			const first = $.screen( "8x8" );
			const second = $.screen( "6x6" );
			let getterCalls = 0;
			let initCalls = 0;

			$.registerPlugin( {
				"name": "late-install-test",
				"init": pluginApi => {
					pluginApi.addScreenDataItem( "lateState", { "values": [] } );
					pluginApi.addScreenDataItemGetter( "lateDynamic", () => ( {
						"id": ++getterCalls
					} ) );
					pluginApi.addScreenInitFunction( screenData => {
						screenData.lateState.initialized = ++initCalls;
					} );
					pluginApi.addCommand( "lateInspect", screenData => ( {
						"earlyInitCount": screenData.earlyInitCount,
						"dynamicId": screenData.lateDynamic.id,
						"initialized": screenData.lateState.initialized,
						"values": screenData.lateState.values.slice()
					} ), true, [] );
					pluginApi.addCommand( "latePush", ( screenData, options ) => {
						screenData.lateState.values.push( options.value );
						return screenData.lateState.values.length;
					}, true, [ "value" ] );
				}
			} );

			first.latePush( "first" );
			$.setScreen( second );
			$.latePush( "second" );
			const third = $.screen( "4x4" );

			return {
				"commandTypes": [ typeof first.lateInspect, typeof second.lateInspect,
					typeof third.lateInspect, typeof $.lateInspect ],
				"first": first.lateInspect(),
				"second": second.lateInspect(),
				"third": third.lateInspect(),
				"getterCalls": getterCalls,
				"initCalls": initCalls
			};
		} ), {
			"commandTypes": [ "function", "function", "function", "function" ],
			"first": { "earlyInitCount": 1, "dynamicId": 1, "initialized": 1,
				"values": [ "first" ] },
			"second": { "earlyInitCount": 1, "dynamicId": 2, "initialized": 2,
				"values": [ "second" ] },
			"third": { "earlyInitCount": 1, "dynamicId": 3, "initialized": 3,
				"values": [] },
			"getterCalls": 3,
			"initCalls": 3
		} );
	} );

	test( `a failed plugin installs nothing and can be registered again in ${bundle}`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			$.registerPlugin( { "name": "inspector", "init": pluginApi => {
				pluginApi.addCommand( "hasData", ( screenData, options ) => {
					return Object.prototype.hasOwnProperty.call( screenData, options.name );
				}, true, [ "name" ] );
			} } );
			const existing = $.screen( "8x8" );
			const calls = { "setBad": 0, "screenInit": 0, "clear": 0 };
			let registerError = null;
			try {
				$.registerPlugin( { "name": "bad", "init": pluginApi => {
					pluginApi.addCommand( "badCmd", () => "bad", true, [] );
					pluginApi.addCommand( "setBad", () => calls.setBad++, false, [ "value" ] );
					pluginApi.addScreenDataItem( "badData", 1 );
					pluginApi.addScreenInitFunction( () => calls.screenInit++ );
					pluginApi.registerClearEvents( "bad", () => calls.clear++ );
					throw new Error( "init failed" );
				} } );
			} catch( error ) {
				registerError = error.code;
			}
			const created = $.screen( "8x8" );
			$.set( { "bad": 7 } );
			$.clearEvents();
			const failed = {
				"registerError": registerError,
				"commandTypes": [ typeof $.badCmd, typeof existing.badCmd, typeof created.badCmd ],
				"hasData": [ existing.hasData( "badData" ), created.hasData( "badData" ) ],
				"calls": { ...calls },
				"state": $.getPlugins().find( item => item.name === "bad" ).state
			};

			$.registerPlugin( { "name": "bad", "init": pluginApi => {
				pluginApi.addCommand( "badCmd", () => "retried", true, [] );
			} } );
			return {
				"failed": failed,
				"retried": [ $.badCmd(), existing.badCmd(), created.badCmd() ],
				"state": $.getPlugins().find( item => item.name === "bad" ).state
			};
		} ), {
			"failed": {
				"registerError": "PLUGIN_INIT_FAILED",
				"commandTypes": [ "undefined", "undefined", "undefined" ],
				"hasData": [ false, false ],
				"calls": { "setBad": 0, "screenInit": 0, "clear": 0 },
				"state": "failed"
			},
			"retried": [ "retried", "retried", "retried" ],
			"state": "initialized"
		} );
	} );

	test( `a failure installing on existing screens is rolled back in ${bundle}`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			$.registerPlugin( { "name": "inspector", "init": pluginApi => {
				pluginApi.addCommand( "hasData", ( screenData, options ) => {
					return Object.prototype.hasOwnProperty.call( screenData, options.name );
				}, true, [ "name" ] );
			} } );
			const first = $.screen( "8x8" );
			const second = $.screen( "8x8" );
			let initCalls = 0;
			let registerError = null;
			try {
				$.registerPlugin( { "name": "late", "init": pluginApi => {
					pluginApi.addScreenDataItem( "lateData", 1 );
					pluginApi.addCommand( "lateCmd", () => 1, true, [] );
					pluginApi.addScreenInitFunction( screenData => {
						initCalls++;
						if( screenData.id === second.id ) {
							throw new Error( "second screen failed" );
						}
					} );
				} } );
			} catch( error ) {
				registerError = error.code;
			}
			const third = $.screen( "8x8" );
			const screens = [ first, second, third ];
			return {
				"registerError": registerError,
				"commandTypes": [ typeof $.lateCmd, ...screens.map( item => typeof item.lateCmd ) ],
				"hasData": screens.map( item => item.hasData( "lateData" ) ),
				"initCalls": initCalls
			};
		} ), {
			"registerError": "PLUGIN_INIT_FAILED",
			"commandTypes": [ "undefined", "undefined", "undefined", "undefined" ],
			"hasData": [ false, false, false ],
			"initCalls": 2
		} );
	} );
}

test( "late Pointer installation initializes existing lite screens", async () => {
	const page = await context.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.goto( "http://localhost:8080/" );
		await page.addScriptTag( { "url": "/build/pi.lite.js" } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => {
			window.first = $.screen( "8x6" );
			window.second = $.screen( "10x4" );
			$.setScreen( first );
		} );
		await page.addScriptTag( { "url": "/build/plugins/pointer/pointer.js" } );
		assert.deepEqual( await page.evaluate( () => ( {
			"commands": [ typeof first.inmouse, typeof second.inmouse, typeof $.inmouse ],
			"first": first.inmouse(),
			"second": second.inmouse(),
			"global": $.inmouse(),
			"initialized": $.getPlugins().find( plugin => plugin.name === "pointer" ).initialized
		} ) ), {
			"commands": [ "function", "function", "function" ],
			"first": { "x": 4, "y": 3, "lastX": 4, "lastY": 3, "buttons": 0,
				"action": "none", "cancelled": false, "type": "mouse" },
			"second": { "x": 5, "y": 2, "lastX": 5, "lastY": 2, "buttons": 0,
				"action": "none", "cancelled": false, "type": "mouse" },
			"global": { "x": 4, "y": 3, "lastX": 4, "lastY": 3, "buttons": 0,
				"action": "none", "cancelled": false, "type": "mouse" },
			"initialized": true
		} );
		assert.deepEqual( errors, [] );
	} finally {
		await page.close();
	}
} );

test( "dependency-delayed plugins install on screens that already exist", async () => {
	assert.deepEqual( await probe( "pi.lite.js", () => {
		$.registerPlugin( {
			"name": "late-dependent",
			"dependencies": [ "late-dependency" ],
			"init": pluginApi => {
				pluginApi.addScreenDataItem( "dependentState", { "ready": false } );
				pluginApi.addScreenInitFunction( screenData => {
					screenData.dependentState.ready = true;
				} );
				pluginApi.addCommand( "dependentReady", screenData => {
					return screenData.dependentState.ready;
				}, true, [] );
			}
		} );
		const screen = $.screen( "5x5" );
		const before = typeof screen.dependentReady;
		$.registerPlugin( { "name": "late-dependency", "init": () => {} } );
		return {
			"before": before,
			"after": typeof screen.dependentReady,
			"ready": screen.dependentReady(),
			"plugins": $.getPlugins().map( plugin => [ plugin.name, plugin.initialized ] )
		};
	} ), {
		"before": "undefined",
		"after": "function",
		"ready": true,
		"plugins": [ [ "late-dependent", true ], [ "late-dependency", true ] ]
	} );
} );

test( "lite plugins initialize when their real dependencies arrive later", async () => {
	const page = await context.newPage();
	try {
		await page.goto( "http://localhost:8080/" );
		await page.setContent( "<html><body></body></html>" );
		await page.addScriptTag( { "url": "/build/pi.lite.js" } );
		await page.evaluate( () => $.ready() );
		const pluginStates = () => page.evaluate(
			() => $.getPlugins().map( plugin => [ plugin.name, plugin.initialized ] )
		);

		// sound-advanced depends on sound, which Lite does not bundle: it waits until sound loads
		await page.addScriptTag( { "url": "/build/plugins/sound-advanced/sound-advanced.js" } );
		assert.deepEqual( await pluginStates(), [ [ "sound-advanced", false ] ] );
		await page.addScriptTag( { "url": "/build/plugins/sound/sound.js" } );
		assert.deepEqual( await pluginStates(), [ [ "sound-advanced", true ], [ "sound", true ] ] );
	} finally { await page.close(); }
} );
