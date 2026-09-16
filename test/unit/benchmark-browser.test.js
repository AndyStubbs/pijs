/** Browser checks for deterministic work, timing boundaries, and real asset failures. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_os from "node:os";
import * as g_esbuild from "esbuild";
import * as g_playwright from "@playwright/test";
import * as g_artifacts from "../performance/benchmark/artifacts.js";
import * as g_browser from "../performance/benchmark/browser.js";
import * as g_run from "../performance/benchmark/run.js";

const g_specs = JSON.parse( g_fs.readFileSync(
	g_path.join( g_artifacts.ROOT, "test/performance/benchmark/cases.json" ), "utf8"
) );

let m_browser;
let m_bundle;
let m_generators;
let m_seed;

g_test.before( async () => {
	const entry = g_path.join( g_artifacts.ROOT, "test/performance/benchmark/page.js" );
	const bundle = await g_esbuild.build( {
		"entryPoints": [ entry ], "bundle": true, "write": false,
		"format": "iife", "globalName": "benchmark", "target": "es2020"
	} );
	m_bundle = bundle.outputFiles[ 0 ].text;
	const generators = await g_esbuild.build( {
		"stdin": {
			"contents": `export * as graphics from "./graphics.js";
				export * as poly from "./poly.js";
				export * as images from "./images2.js";
				export * as loader from "../image-loader.js";`,
			"resolveDir": g_path.join( g_artifacts.ROOT, "test/performance/src/tests" )
		}, "bundle": true, "write": false, "format": "iife", "globalName": "generators"
	} );
	m_generators = generators.outputFiles[ 0 ].text;
	m_seed = await g_artifacts.bundleSeedrandom();
	m_browser = await g_playwright.chromium.launch( { "headless": true } );
} );

g_test.after( async () => { await m_browser?.close(); } );

async function mockPage() {
	const page = await m_browser.newPage();
	await page.setContent( "<!doctype html><html><body></body></html>" );
	await page.addScriptTag( { "content": m_seed } );
	await page.addScriptTag( { "content": m_bundle } );
	await page.addScriptTag( { "content": m_generators } );
	await page.evaluate( () => {
		window.trace = [];
		window.clock = 0;
		window.frames = 0;
		window.originalSeedrandom = Math.seedrandom;
		const trace = ( name, args ) => window.trace.push( [ name, JSON.stringify( args ) ] );
		const screen = {
			"width": () => 800, "height": () => 600,
			"canvas": () => ( { "getContext": () => ( {
				"getError": () => 0, "isContextLost": () => false
			} ) } ),
			"cls": () => {
				trace( "cls", [] );
				window.clock += 1;
				queueMicrotask( () => { window.clock += 3; } );
			},
			"getImage": name => ( { "name": name } ),
			"getSpritesheetData": () => ( { "frameCount": 16 } )
		};
		for( const name of [ "line", "rect", "circle", "ellipse", "arc", "bezier", "put",
			"pset", "setColor", "polygon", "drawImage", "drawSprite", "print", "setPosPx",
			"pushView", "popView" ] ) {
			screen[ name ] = ( ...args ) => trace( name, args );
		}
		window.$ = {
			...screen, "version": "2.2.0", "screen": () => screen, "getScreen": () => screen,
			"ready": async () => {}, "setFont": () => {}, "setScreen": () => {},
			"loadImage": () => {}, "loadSpritesheet": () => {},
			"getPal": () => Array.from( { "length": 16 }, ( unused, index ) => index )
		};
		Object.defineProperty( performance, "now", { "value": () => window.clock } );
		window.requestAnimationFrame = callback => {
			window.frames++;
			queueMicrotask( () => callback( window.frames * 16 ) );
		};
	} );
	return page;
}

g_test.test( "generators repeat streams across initialization and fresh pages", async () => {
	const streams = [];
	for( let pageIndex = 0; pageIndex < 2; pageIndex++ ) {
		const page = await mockPage();
		try {
			streams.push( await page.evaluate( async () => {
				generators.loader.init();
				const output = [];
				for( const [ kind, options ] of [ [ "graphics", undefined ],
					[ "poly", undefined ], [ "images", [ "draw-images" ] ],
					[ "images", [ "draw-sprites" ] ] ] ) {
					const attempts = [];
					for( let i = 0; i < 2; i++ ) {
						const config = generators[ kind ].getConfig( options );
						config.seedOptions = { "entropy": false };
						await config.init( config );
						window.trace = [];
						config.run( 1100 );
						config.run( 1100 );
						attempts.push( JSON.stringify( window.trace ) );
						config.cleanUp();
					}
					if( attempts[ 0 ] !== attempts[ 1 ] ) {
						throw new Error( `Nonrepeatable ${kind}` );
					}
					output.push( attempts[ 0 ] );
				}
				return output;
			} ) );
		} finally {
			await page.close();
		}
	}
	g_assert.deepEqual( streams[ 0 ].map( g_artifacts.hash ), streams[ 1 ].map( g_artifacts.hash ) );
} );

g_test.test( "fixed counts and timing boundaries exclude status rendering", async () => {
	const page = await mockPage();
	try {
		const proof = await page.evaluate( () => benchmark.init() );
		g_assert.deepEqual( proof, g_run.expectedProof() );
		g_assert.equal( await page.evaluate( () => Math.seedrandom === originalSeedrandom ), true );
		for( const spec of g_specs ) {
			const output = await page.evaluate( async name => {
				window.trace = [];
				window.frames = 0;
				const result = await benchmark.runCase( name );
				return {
					result, "frames": window.frames,
					"clears": trace.filter( item => item[ 0 ] === "cls" ).length,
					"prints": trace.filter( item => item[ 0 ] === "print" ).length,
					"draws": trace.filter( item => ![ "cls", "setColor", "setPosPx",
						"pushView", "popView" ].includes( item[ 0 ] ) ).length
				};
			}, spec.name );
			g_assert.equal( output.result.count, spec.count );
			g_assert.equal( output.result.warmupFrames, 16 );
			g_assert.equal( output.result.samples.length, 32 );
			g_assert.equal( output.frames, 50 );
			g_assert.equal( output.clears, 48 );
			let count = spec.count;
			if( spec.type === "graphics" || spec.type === "poly" ) {
				count--;
			} else if( spec.name === "shared-screen" ) {
				count *= 2;
			}
			g_assert.equal( output.draws, count * 48 );
			if( spec.name !== "text" ) {
				g_assert.equal( output.prints, 0 );
			} else {
				g_assert.equal( output.prints, spec.count * 48 );
			}
			g_assert.ok( output.result.samples.every( sample =>
				sample.queueMs === 1 && sample.submitMs === 4 ) );
			g_assert.equal( output.result.samples[ 0 ].frameMs, null );
			g_assert.equal( output.result.samples[ 1 ].frameMs, 16 );
		}
	} finally {
		await page.close();
	}
} );

g_test.test( "extra warm-up preserves every measured operation and timing boundary", async () => {
	for( const spec of g_specs ) {
		const streams = [];
		for( const warmupFrames of [ 16, 120 ] ) {
			const page = await mockPage();
			try {
				const output = await page.evaluate( async ( { name, warmupFrames } ) => {
					await benchmark.init();
					window.trace = [];
					const result = await benchmark.runCase( name, { warmupFrames } );
					const starts = trace.flatMap( ( item, index ) => {
						if( item[ 0 ] === "cls" ) {
							return [ index ];
						}
						return [];
					} );
					return { result, "frames": window.frames,
						"measured": JSON.stringify( trace.slice( starts.at( -32 ) ) ) };
				}, { "name": spec.name, warmupFrames } );
				streams.push( g_artifacts.hash( output.measured ) );
				g_assert.equal( output.result.samples.length, 32 );
				g_assert.equal( output.result.warmupFrames, warmupFrames );
				g_assert.equal( output.frames, warmupFrames + 34 + Number( warmupFrames === 120 ) );
				g_assert.ok( output.result.samples.every( sample =>
					sample.queueMs === 1 && sample.submitMs === 4 ) );
			} finally {
				await page.close();
			}
		}
		g_assert.equal( streams[ 0 ], streams[ 1 ], spec.name );
	}
} );

g_test.test( "precomputed lines reproduce representative colors and endpoints", async () => {
	for( const warmupFrames of [ 16, 120 ] ) {
		const streams = [];
		for( const precomputed of [ false, true ] ) {
			const page = await mockPage();
			try {
				const stream = await page.evaluate( async options => {
					await benchmark.init();
					window.trace = [];
					await benchmark.runCase( "line", options );
					return JSON.stringify( trace );
				}, { warmupFrames, "diagnostic": { precomputed } } );
				streams.push( g_artifacts.hash( stream ) );
			} finally {
				await page.close();
			}
		}
		g_assert.equal( streams[ 0 ], streams[ 1 ] );
	}
} );

g_test.test( "older cores report unsupported view cases explicitly", async () => {
	const page = await mockPage();
	try {
		await page.evaluate( async () => {
			delete $.getScreen( 0 ).pushView;
			await benchmark.init();
		} );
		for( const name of [ "nested-view", "shared-screen" ] ) {
			const result = await page.evaluate( name => benchmark.runCase( name ), name );
			g_assert.equal( result.supported, false );
			g_assert.match( result.reason, /before 2.1/ );
		}
	} finally {
		await page.close();
	}
} );

g_test.test( "browser failures retain their stage and asset diagnostics", async () => {
	const temp = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pi-benchmark-browser-" ) );
	let server;
	try {
		const config = g_run.parseArgs( [ `--source=current=${g_artifacts.ROOT}`, "--cases=line" ] );
		const prepared = await g_artifacts.prepare( config );
		for( const [ name, bytes ] of Object.entries( prepared.files ) ) {
			const file = g_path.join( temp, name );
			g_fs.mkdirSync( g_path.dirname( file ), { "recursive": true } );
			g_fs.writeFileSync( file, bytes );
		}
		const served = await g_browser.serve( temp, prepared.identity.files );
		server = served.server;
		const artifact = prepared.identity.artifacts[ 0 ];
		await g_assert.rejects( g_browser.measure( m_browser, served.url, artifact, [ "line" ], {
			"allowSoftware": true,
			"beforeNavigate": async page => {
				await page.route( "**/cherry_image.png", route => route.abort( "failed" ) );
			}
		} ), error => {
			g_assert.equal( error.interruption.stage, "initialization" );
			g_assert.ok( error.interruption.failedRequests.some( item =>
				item.url.endsWith( "/cherry_image.png" ) ) );
			return true;
		} );
		await g_assert.rejects( g_browser.measure( m_browser, served.url, artifact, [ "line" ], {
			"allowSoftware": true, "timeoutMs": 1000,
			"beforeNavigate": async page => {
				await page.route( "**/harness.js", async route => {
					await route.fulfill( { "contentType": "text/javascript",
						"body": "window.benchmark = { init: () => new Promise( () => {} ) };" } );
				} );
			}
		} ), error => {
			g_assert.equal( error.interruption.stage, "initialization" );
			g_assert.match( error.message, /Timed out/ );
			return true;
		} );
		await g_assert.rejects( g_browser.measure( m_browser, served.url, artifact, [ "line" ], {
			"allowSoftware": true, "timeoutMs": 1000,
			"beforeNavigate": async page => {
				await page.route( "**/harness.js", async route => {
					const body = Buffer.from( prepared.files[ "harness.js" ] ).toString( "utf8" ) +
						"\nbenchmark = { ...benchmark, runCase: () => new Promise( () => {} ) };";
					await route.fulfill( { "contentType": "text/javascript", "body": body } );
				} );
			}
		} ), error => {
			g_assert.equal( error.interruption.stage, "case:line" );
			g_assert.match( error.message, /Timed out/ );
			return true;
		} );
		await g_assert.rejects( g_browser.measure( m_browser, served.url, artifact, [ "line" ], {
			"allowSoftware": true, "expectedEnvironment": { "browser": "changed" }
		} ), /environment changed/ );
		const good = await g_browser.measure( m_browser, served.url, artifact, [ "line", "images" ], {
			"allowSoftware": true
		} );
		g_assert.equal( good.tests.length, 2 );
		g_assert.equal( good.tests[ 0 ].samples.length, 32 );
		g_assert.deepEqual( good.seedProof, g_run.expectedProof() );
	} finally {
		if( server ) {
			await new Promise( resolve => server.close( resolve ) );
		}
		g_assert.ok( g_path.resolve( temp ).startsWith( g_path.resolve( g_os.tmpdir() ) + g_path.sep ) );
		g_fs.rmSync( temp, { "recursive": true, "force": true } );
	}
} );
