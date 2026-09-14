/**
 * SYS-014 executable plugin-authoring documentation regressions.
 * Run with node --test test/unit/plugin-docs-browser.test.js.
 */
"use strict";

const { test, before, after } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const { chromium } = require( "@playwright/test" );
const { createSourceContext } = require( "./browser-source-harness.js" );

const ROOT = path.resolve( __dirname, "../.." );
const GUIDE_FILES = [
	"plugins/PLUGIN-QUICKSTART.md",
	"plugins/PLUGIN-SYSTEM.md",
	"plugins/PLUGIN-SYSTEM-SUMMARY.md"
];
const MISSING_METHODS = [
	"addScreenCommand", "addPixelCommand", "addAACommand", "addScreenInternalCommands"
];
const EXAMPLES = [
	{ "file": GUIDE_FILES[ 0 ], "fnName": "myFirstPlugin", "action": "first" },
	{ "file": GUIDE_FILES[ 0 ], "fnName": "counterPlugin", "action": "counter" },
	{ "file": GUIDE_FILES[ 0 ], "fnName": "setupPlugin", "action": "lifecycle" },
	{ "file": GUIDE_FILES[ 0 ], "fnName": "infoPlugin", "action": "info" },
	{ "file": GUIDE_FILES[ 0 ], "fnName": "mathPlugin", "action": "math" },
	{ "file": GUIDE_FILES[ 1 ], "fnName": "myPlugin", "action": "system" }
];

let m_browser;
let m_context;

before( async () => {
	m_browser = await chromium.launch( { "headless": true } );
	m_context = await createSourceContext( m_browser );
} );

after( async () => {
	await m_context?.close();
	await m_browser?.close();
} );

function readGuide( file ) {
	return fs.readFileSync( path.join( ROOT, file ), "utf8" );
}

function extractInitializer( file, fnName ) {
	const blocks = Array.from(
		readGuide( file ).matchAll( /```javascript\r?\n([\s\S]*?)\r?\n```/g ),
		match => match[ 1 ]
	);
	const source = blocks.find( block => block.includes( `function ${fnName}( pluginApi )` ) );
	assert.ok( source, `${file} contains the ${fnName} initializer` );
	return source.split( "// Auto-register" )[ 0 ].replace( "export default ", "" ).trim();
}

async function runExample( bundle, example ) {
	const page = await m_context.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.goto( "http://localhost:8080/" );
		await page.addScriptTag( { "url": `/build/${bundle}` } );
		await page.evaluate( () => $.ready() );
		const result = await page.evaluate( ( { source, fnName, action } ) => {
			const initializer = Function( `${source}\nreturn ${fnName};` )();
			const messages = [];
			window.alert = message => messages.push( message );
			console.log = message => messages.push( String( message ) );
			const first = $.screen( "16x16" );
			$.registerPlugin( {
				"name": `docs-${action}`,
				"init": initializer
			} );

			let value;
			if( action === "first" ) {
				$.greet( "Codex" );
				$.drawStar( 8, 8, 3 );
				value = [ messages[ 0 ], typeof $.greet, typeof first.drawStar ];
			} else if( action === "counter" ) {
				const second = $.screen( "12x12" );
				value = [ first.increment(), second.increment(), first.getCounter() ];
			} else if( action === "lifecycle" ) {
				const second = $.screen( "12x12" );
				first.removeScreen();
				second.removeScreen();
				value = [
					messages.filter( message => message.endsWith( "created!" ) ).length,
					messages.filter( message => message.endsWith( "removed!" ) ).length
				];
			} else if( action === "info" ) {
				$.showInfo();
				value = [ typeof $.showInfo, messages.some( message => {
					return message.startsWith( "Pi.js version: " );
				} ) ];
			} else if( action === "math" ) {
				const color = $.randomColor();
				value = [ typeof $.randomColor, color.r, color.g, color.b, color.a ];
			} else {
				const second = $.screen( "12x12" );
				value = [ first.increment(), second.increment(), first.increment() ];
			}

			return {
				"initialized": $.getPlugins().find( plugin => {
					return plugin.name === `docs-${action}`;
				} ).initialized,
				"value": value
			};
		}, {
			"source": extractInitializer( example.file, example.fnName ),
			"fnName": example.fnName,
			"action": example.action
		} );
		assert.deepEqual( errors, [] );
		return result;
	} finally {
		await page.close();
	}
}

test( "plugin authoring guides only advertise real registration methods", () => {
	for( const file of GUIDE_FILES ) {
		const guide = readGuide( file );
		for( const method of MISSING_METHODS ) {
			assert.doesNotMatch( guide, new RegExp( `pluginApi\\.${method}\\b` ) );
		}
	}
} );

for( const bundle of [ "pi.js", "pi.lite.js" ] ) {
	test( `plugin guide initializers execute in ${bundle}`, async () => {
		const results = {};
		for( const example of EXAMPLES ) {
			results[ example.action ] = await runExample( bundle, example );
		}

		assert.deepEqual( results.first, {
			"initialized": true, "value": [ "Hello, Codex!", "function", "function" ]
		} );
		assert.deepEqual( results.counter, {
			"initialized": true, "value": [ 1, 1, 1 ]
		} );
		assert.deepEqual( results.lifecycle, {
			"initialized": true, "value": [ 2, 2 ]
		} );
		assert.deepEqual( results.info, {
			"initialized": true, "value": [ "function", true ]
		} );
		assert.equal( results.math.initialized, true );
		assert.equal( results.math.value[ 0 ], "function" );
		for( const channel of results.math.value.slice( 1 ) ) {
			assert.equal( Number.isFinite( channel ), true );
		}
		assert.deepEqual( results.system, {
			"initialized": true, "value": [ 1, 1, 2 ]
		} );
	} );
}
