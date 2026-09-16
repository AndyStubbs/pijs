/**
 * SYS-009 late plugin installation regressions against fresh full and lite bundles.
 * Run with node --test test/unit/plugin-installation-browser.test.js.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_playwright from "@playwright/test";
import * as g_browserSourceHarness from "./browser-source-harness.js";
const { test, before, after } = g_test;
const assert = g_assert;
const { chromium } = g_playwright;
const { createSourceContext } = g_browserSourceHarness;

let browser;
let context;

before( async () => {
	browser = await chromium.launch( { "headless": true } );
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
				"action": "none", "type": "mouse" },
			"second": { "x": 5, "y": 2, "lastX": 5, "lastY": 2, "buttons": 0,
				"action": "none", "type": "mouse" },
			"global": { "x": 4, "y": 3, "lastX": 4, "lastY": 3, "buttons": 0,
				"action": "none", "type": "mouse" },
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
