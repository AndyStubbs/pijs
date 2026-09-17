/** Release compatibility assertions against built full/lite bundles in Firefox. */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_crypto from "node:crypto";
import * as g_playwright from "@playwright/test";
import * as g_server from "./test-server.js";
import * as g_browser from "../performance/benchmark/browser.js";

const ROOT = g_url.fileURLToPath( new URL( "../../", import.meta.url ) );
const OUTPUT = g_path.join( ROOT, "test/test-results/firefox" );

/** Assert sprite frame selection, asymmetric shader sampling, and basic drawing. */
async function rendering( page ) {
	return page.evaluate( async () => {
		await $.ready();
		const screen = $.screen( "64x64" );
		const source = document.createElement( "canvas" );
		source.width = source.height = 8;
		const ctx = source.getContext( "2d" );
		ctx.fillStyle = "#ff0000";
		ctx.fillRect( 0, 0, 8, 4 );
		ctx.fillStyle = "#0000ff";
		ctx.fillRect( 0, 4, 8, 4 );
		$.loadSpritesheet( source, "frames", 8, 4 );
		const pixel = ( x, y ) => {
			const c = screen.getPixel( x, y );
			return [ c.r, c.g, c.b, c.a ];
		};
		screen.drawSprite( "frames", 1, 0, 0 );
		const sprite = pixel( 1, 1 );
		screen.cls();
		screen.drawImage( source, 0, 0 );
		const shader = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_map;
out vec4 fragColor;
void main() {
	fragColor = 0.5 * (texture(u_texture, v_texCoord) + texture(u_map, v_texCoord));
}` );
		// Match source and framebuffer dimensions so both samples address the same pixels.
		const small = $.screen( "8x8" );
		small.drawImage( source, 0, 0 );
		small.applyShader( shader, { "u_map": source } );
		const top = small.getPixel( 1, 1 );
		const bottom = small.getPixel( 1, 6 );
		screen.setColor( "#00ff00" );
		screen.line( 0, 20, 63, 20 );
		return { "sprite": sprite, "line": pixel( 20, 20 ),
			"top": [ top.r, top.g, top.b, top.a ],
			"bottom": [ bottom.r, bottom.g, bottom.b, bottom.a ] };
	} );
}

/** Verify shared recovery discards old pixels and permits drawing again. */
async function recovery( page ) {
	return page.evaluate( async () => {
		await $.ready();
		const parent = $.screen( "16x16" );
		const child = $.screen( { "aspect": "8x8", "isOffscreen": true, "parent": parent } );
		const gl = parent.canvas().getContext( "webgl2" );
		const extension = gl.getExtension( "WEBGL_lose_context" );
		if( !extension ) { throw new Error( "WEBGL_lose_context unavailable" ); }
		const event = name => new Promise( ( resolve, reject ) => {
			const timer = setTimeout( () => reject( new Error( name + " timeout" ) ), 10000 );
			gl.canvas.addEventListener( name, () => {
				clearTimeout( timer );
				resolve();
			}, { "once": true } );
		} );
		parent.setColor( "#ff0000" );
		parent.pset( 0, 0 );
		parent.getPixel( 0, 0 );
		const lost = event( "webglcontextlost" );
		extension.loseContext();
		await lost;
		const during = parent.getPixel( 0, 0 ).a;
		await new Promise( resolve => setTimeout( resolve, 50 ) );
		const restored = event( "webglcontextrestored" );
		extension.restoreContext();
		await restored;
		await new Promise( resolve => requestAnimationFrame( resolve ) );
		const after = parent.getPixel( 0, 0 ).a;
		child.setColor( "#00ff00" );
		child.pset( 0, 0 );
		parent.drawImage( child, 0, 0 );
		const color = parent.getPixel( 0, 0 );
		return { "during": during, "after": after, "pixel": [ color.r, color.g, color.b, color.a ],
			"glError": gl.getError() };
	} );
}

/** Exercise host sizing, display presentation, and native keyboard/mouse dispatch. */
async function inputAndSizing( page ) {
	await page.evaluate( async () => {
		await $.ready();
		const host = document.createElement( "div" );
		host.style.cssText = "width:320px;height:200px;margin:20px";
		document.body.appendChild( host );
		const screen = $.screen( { "aspect": "160x100", "container": host, "noCss": true } );
		const canvas = screen.canvas();
		if( canvas.getAttribute( "style" ) !== null ) {
			throw new Error( "Automatic canvas style in noCss mode" );
		}
		canvas.style.cssText = "display:block;width:320px;height:200px";
		window.smoke = { "screen": screen, "canvas": canvas, "keys": 0, "mouse": null };
		screen.onmouse( "down", data => { smoke.mouse = { "x": data.x, "y": data.y }; } );
		$.onkey( "a", "down", () => { smoke.keys++; } );
		const shader = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;
void main() { fragColor = texture(u_texture, v_texCoord); }` );
		screen.setDisplayShader( shader );
	} );
	await page.waitForFunction( () => smoke.canvas.width === 320 && smoke.canvas.height === 200 );
	let bounds = await page.locator( "canvas" ).boundingBox();
	await page.mouse.click( bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 );
	await page.keyboard.press( "a" );
	g_assert.deepEqual( await page.evaluate( () => ( {
		"keys": smoke.keys, "mouse": smoke.mouse
	} ) ), { "keys": 1, "mouse": { "x": 80, "y": 50 } } );
	await page.evaluate( () => {
		smoke.canvas.style.width = "480px";
		smoke.canvas.style.height = "300px";
	} );
	await page.waitForFunction( () => smoke.canvas.width === 480 && smoke.canvas.height === 300 );
	bounds = await page.locator( "canvas" ).boundingBox();
	await page.mouse.click( bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 );
	g_assert.deepEqual( await page.evaluate( () => smoke.mouse ), { "x": 80, "y": 50 } );
}

/** Run all checks and retain failures as well as passing evidence. */
async function main() {
	g_fs.mkdirSync( OUTPUT, { "recursive": true } );
	const report = { "date": new Date().toISOString(), "browser": "firefox", "tests": [] };
	let browser;
	try {
		browser = await g_playwright.firefox.launch( { "headless": true, "timeout": 30000 } );
		report.version = browser.version();
		await g_server.withTestServer( ROOT, async url => {
			for( const mode of [ "full", "lite" ] ) {
				let files = [ "pi.js" ];
				if( mode === "lite" ) {
					files = [ "pi.lite.js", "plugins/keyboard/keyboard.js", "plugins/pointer/pointer.js" ];
				}
				for( const name of [ "rendering", "context-recovery", "sizing-input" ] ) {
					const entry = { "mode": mode, "name": name,
						"status": "failed", "pageErrors": [], "failedRequests": [] };
					report.tests.push( entry );
					const page = await browser.newPage( { "viewport": { "width": 800, "height": 600 } } );
					page.setDefaultTimeout( 15000 );
					page.on( "pageerror", error => entry.pageErrors.push( error.message ) );
					page.on( "requestfailed", request => entry.failedRequests.push( request.url() ) );
					page.on( "response", response => {
						if( response.status() >= 400 ) { entry.failedRequests.push( response.url() ); }
					} );
					try {
						entry.artifacts = files.map( file => ( { "file": file,
							"sha256": g_crypto.createHash( "sha256" ).update(
								g_fs.readFileSync( g_path.join( ROOT, "build", file ) )
							).digest( "hex" )
						} ) );
						await page.route( "**/firefox-smoke.html", route => route.fulfill( {
							"contentType": "text/html",
							"body": '<!doctype html><link rel="icon" href="data:,"><body>' +
								files.map( file => `<script src="/build/${file}"></script>` ).join( "" )
						} ) );
						await page.goto( url + "/firefox-smoke.html" );
						await g_browser.bounded( ( async () => {
							if( name === "rendering" ) {
								g_assert.deepEqual( await rendering( page ), {
									"sprite": [ 0, 0, 255, 255 ], "line": [ 0, 255, 0, 255 ],
									"top": [ 255, 0, 0, 255 ], "bottom": [ 0, 0, 255, 255 ]
								} );
							} else if( name === "context-recovery" ) {
								g_assert.deepEqual( await recovery( page ), {
									"during": 0, "after": 0, "pixel": [ 0, 255, 0, 255 ], "glError": 0
								} );
							} else {
								await inputAndSizing( page );
							}
						} )(), 30000, name );
						g_assert.deepEqual( entry.pageErrors, [] );
						g_assert.deepEqual( entry.failedRequests, [] );
						await page.screenshot( { "path": g_path.join( OUTPUT, `${mode}-${name}.png` ) } );
						entry.status = "passed";
					} catch( error ) {
						entry.error = String( error );
					} finally {
						await page.close();
					}
					console.log( `${mode} ${name}: ${entry.status}${entry.error || ""}` );
				}
			}
		} );
	} catch( error ) {
		report.error = String( error );
	} finally {
		await browser?.close();
		report.status = "failed";
		if( !report.error && report.tests.length === 6 &&
			report.tests.every( item => item.status === "passed" ) ) {
			report.status = "passed";
		}
		g_fs.writeFileSync( g_path.join( OUTPUT, "summary.json" ),
			JSON.stringify( report, null, "\t" ) + "\n" );
		if( report.status !== "passed" ) {
			console.error( report.error || "Firefox compatibility assertions failed" );
			process.exitCode = 1;
		}
	}
}

await main();
