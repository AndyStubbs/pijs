/**
 * Browser regressions for the performance results menu and comparison graph.
 */
const { test, before, after } = require( "node:test" );
const assert = require( "node:assert/strict" );
const path = require( "node:path" );
const esbuild = require( "esbuild" );
const { chromium } = require( "@playwright/test" );

let browser;
let reportBundle;

before( async () => {
	const result = await esbuild.build( {
		"entryPoints": [ path.join( __dirname, "../performance/src/report-manager.js" ) ],
		"bundle": true,
		"write": false,
		"format": "iife",
		"globalName": "reportManager",
		"target": "es2020"
	} );
	reportBundle = result.outputFiles[ 0 ].text;
	browser = await chromium.launch( { "headless": true } );
} );

after( async () => { await browser?.close(); } );

async function createPage( fileCount = 12 ) {
	const page = await browser.newPage();
	await page.setContent( "<!doctype html><html><body></body></html>" );
	await page.addScriptTag( { "content": reportBundle } );
	await page.evaluate( count => {
		window.calls = [];
		window.output = [];
		window.pixelPosition = null;
		window.prints = [];
		window.rectangles = [];
		window.$ = {
			"cls": () => {},
			"setColor": () => {},
			"setPos": () => {},
			"setPosPx": ( x, y ) => { window.pixelPosition = { x, y }; },
			"print": value => {
				const text = value === undefined ? "" : String( value );
				window.output.push( text );
				window.prints.push( { "text": text, "position": window.pixelPosition } );
			},
			"calcWidth": value => String( value ).length * 8,
			"getCols": () => 100,
			"getRows": () => 60,
			"width": () => 800,
			"height": () => 600,
			"line": () => {},
			"rect": ( ...args ) => window.rectangles.push( args )
		};
		const files = Array.from( { "length": count }, ( unused, index ) => ( {
			"name": `run-${index + 1}.json`,
			"date": new Date( 2026, 0, index + 1 ).toISOString(),
			"version": index % 2 === 0 ? "2.1.0" : "2.2.0",
			"score": 100 + index,
			"targetFps": 60
		} ) );
		window.fetch = async url => {
			window.calls.push( url );
			if( url.endsWith( "/api/list-results" ) ) {
				return { "ok": true, "json": async () => ( { "success": true, files } ) };
			}
			const index = Number( /run-(\d+)\.json/.exec( url )[ 1 ] );
			return { "ok": true, "json": async () => ( {
				"success": true,
				"data": {
					"version": index % 2 === 1 ? "2.1.0" : "2.2.0",
					"date": new Date( 2026, 0, index ).toISOString(),
					"score": 100 + index,
					"posted": true,
					"tests": [ {
						"name": "Line",
						"score": 10,
						"medianFps": 60,
						"itemCount": 20,
						"itemCountPerSecond": 1000 + index,
						"p95FrameMs": 17,
						"variabilityPercent": 1
					} ]
				}
			} ) };
		};
	}, fileCount );
	return page;
}

test( "second-page number keys open the page-local result", async () => {
	const page = await createPage();
	await page.evaluate( () => reportManager.showPreviousResults() );
	await page.keyboard.press( "0" );
	await page.keyboard.press( "1" );
	await page.waitForFunction( () => calls.some( url => url.includes( "run-10.json" ) ) );
	const calls = await page.evaluate( () => window.calls );
	assert.ok( calls.some( url => url.endsWith( "/api/get-result/run-10.json" ) ) );
	await page.close();
} );

test( "exact page multiples report the correct page count", async () => {
	const page = await createPage( 18 );
	await page.evaluate( () => reportManager.showPreviousResults() );
	await page.keyboard.press( "0" );
	const output = await page.evaluate( () => window.output.join( " " ) );
	assert.match( output, /Page \(2 of 2\)/ );
	await page.close();
} );

test( "next page wraps back to the first page", async () => {
	const page = await createPage();
	await page.evaluate( () => reportManager.showPreviousResults() );
	await page.keyboard.press( "0" );
	await page.keyboard.press( "0" );
	await page.keyboard.press( "1" );
	await page.waitForFunction( () => calls.filter(
		url => url.endsWith( "/api/get-result/run-1.json" )
	).length === 1 );
	await page.close();
} );

test( "comparison renders version bars and changes metric", async () => {
	const page = await createPage();
	await page.evaluate( () => reportManager.showPreviousResults() );
	await page.keyboard.press( "c" );
	await page.waitForFunction( () => rectangles.length === 2 );
	await page.keyboard.press( "ArrowDown" );
	await page.waitForFunction( () => rectangles.length === 4 );
	const output = await page.evaluate( () => window.output.join( " " ) );
	assert.match( output, /Overall Score/ );
	assert.match( output, /Line/ );
	await page.close();
} );

test( "comparison centers values and places versions directly below the graph", async () => {
	const page = await createPage();
	await page.evaluate( () => { delete window.$.calcWidth; } );
	await page.evaluate( () => reportManager.showPreviousResults() );
	await page.keyboard.press( "c" );
	await page.waitForFunction( () => rectangles.length === 2 );
	const layout = await page.evaluate( () => ( {
		"bar": rectangles[ 0 ],
		"score": prints.find( entry => entry.text === "10" ),
		"version": prints.find( entry => entry.text === "2.1.0 (6)" )
	} ) );
	const [ x, y, width, height ] = layout.bar;
	assert.equal( layout.score.position.x, x + ( width - 2 * 8 ) / 2 );
	assert.equal( layout.score.position.y, y + ( height - 10 ) / 2 );
	assert.equal( layout.version.position.x, x + ( width - 9 * 8 ) / 2 );
	assert.equal( layout.version.position.y, 497 );
	await page.close();
} );
