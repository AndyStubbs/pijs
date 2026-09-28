/**
 * Pointer regressions against a fresh in-memory full bundle: offscreen command validation, noCss
 * pointer bounds, and a release outside the canvas with trusted input. Owned by the pointer
 * workstream.
 * Run with node --test test/unit/pointer-browser.test.js; no server is required.
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

async function probe( fn ) {
	const page = await context.newPage();
	try {
		await page.goto( "http://localhost:8080/" );
		await page.setContent( "<html><body><div id='host'></div></body></html>" );
		await page.evaluate( () => {
			window.observedTargets = new Set();
			const Original = window.ResizeObserver;
			window.ResizeObserver = class extends Original {
				observe( element, options ) {
					window.observedTargets.add( element );
					super.observe( element, options );
				}
				unobserve( element ) {
					window.observedTargets.delete( element );
					super.unobserve( element );
				}
			};
		} );
		await page.addScriptTag( { "url": "/build/pi.js" } );
		await page.evaluate( () => $.ready() );
		return await page.evaluate( fn );
	} finally {
		await page.close();
	}
}

test( "noCss pointer bounds follow host layout, margins, and transforms", async () => {
	assert.equal( await probe( async () => {
		const host = document.getElementById( "host" );
		host.style.cssText = "width:120px;height:90px;position:relative";
		const style = document.createElement( "style" );
		style.textContent = "#host canvas {width:80px;height:40px;padding:5px;border:3px solid;}";
		document.head.appendChild( style );
		const screen = $.screen( { "aspect": "8x8", "container": host, "noCss": true } );
		const canvas = screen.canvas();
		const identity = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;
void main() { fragColor = texture(u_texture, v_texCoord); }` );
		const settle = () => new Promise( resolve => setTimeout( resolve, 80 ) );
		screen.setDisplayShader( identity );
		await settle();
		style.textContent += "#host canvas {width:60px;height:30px;margin-left:17px}";
		await settle();
		if( canvas.width !== 60 || canvas.height !== 30 ) { throw new Error( "canvas observer" ); }
		screen.inmouse();
		const rect = canvas.getBoundingClientRect();
		canvas.dispatchEvent( new MouseEvent( "mousemove", {
			"clientX": rect.left + 8 + 30, "clientY": rect.top + 8 + 15
		} ) );
		if( screen.inmouse().x !== 4 || screen.inmouse().y !== 4 ) {
			throw new Error( "content coordinates" );
		}
		screen.intouch();
		style.textContent += "#host canvas {margin-left:27px;transform:scale(1.5)}";
		const moved = canvas.getBoundingClientRect();
		const touch = new Touch( { "identifier": 7, "target": canvas,
			"clientX": moved.left + ( 8 + 30 ) * 1.5,
			"clientY": moved.top + ( 8 + 15 ) * 1.5 } );
		canvas.dispatchEvent( new TouchEvent( "touchstart", {
			"touches": [ touch ], "changedTouches": [ touch ]
		} ) );
		const touches = screen.intouch();
		if( touches[ 0 ].x !== 4 || touches[ 0 ].y !== 4 ) {
			throw new Error( "fresh touch position after movement and scaling" );
		}
		screen.removeScreen();
		return true;
	} ), true );
} );

test( "offscreen pointer validation precedes all state changes and subscriptions", async () => {
	assert.equal( await probe( async () => {
		const visible = $.screen( "8x8" );
		let getData;
		$.registerPlugin( { "name": "inspect", "init": api => {
			getData = id => api.getScreenData( "test", id );
		} } );
		for( const parent of [ null, visible ] ) {
			const buffer = $.screen( { "aspect": "8x8", "isOffscreen": true, "parent": parent } );
			buffer.stopMouse(); buffer.stopTouch();
			const data = getData( buffer.id );
			const state = () => JSON.stringify( [ data.mouseStopped, data.touchStopped,
				data.mouseStarted, data.touchStarted, data.onMouseEventListeners,
				data.onTouchEventListeners, data.onPressEventListeners, data.onClickEventListeners,
				data.isContextMenuEnabled ] );
			const before = state();
			for( const command of [ "inmouse", "intouch", "inpress", "startMouse", "startTouch",
				"onmouse", "ontouch", "onpress", "onclick", "setEnableContextMenu" ] ) {
				for( const target of [ $, buffer ] ) {
					let rejected = false;
					try { target[ command ]( { "mode": "down", "fn": () => {} } ); }
					catch( error ) {
						rejected = error instanceof TypeError &&
							error.code === "OFFSCREEN_INPUT_UNSUPPORTED" &&
							error.message.startsWith( command + ": Screen " + buffer.id + " " );
					}
					if( !rejected || state() !== before ) { throw new Error( command ); }
				}
			}
			visible.inmouse(); visible.intouch(); visible.inpress();
			$.setScreen( visible ); $.inmouse(); $.intouch(); $.inpress();
			buffer.clearEvents(); buffer.removeScreen();
			await new Promise( resolve => setTimeout( resolve, 10 ) );
		}
		return true;
	} ), true );
} );

test( "a trusted mouse release outside the canvas is released once (T1)", async () => {
	const page = await context.newPage();
	try {
		await page.goto( "http://localhost:8080/" );
		await page.setContent( "<html><body style='margin:0'>" +
			"<div id='host' style='width:200px;height:200px'></div></body></html>" );
		await page.addScriptTag( { "url": "/build/pi.js" } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => {
			$.screen( { "aspect": "100x100", "container": "host" } );
			window.log = [];
			$.onmouse( "up", data => window.log.push( [ "mouse up", data.buttons ] ) );
			$.onpress( "up", data => window.log.push( [ "press up", data.buttons ] ) );
		} );
		const box = await page.locator( "canvas" ).boundingBox();
		await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2 );
		await page.mouse.down();
		await page.mouse.move( box.x + box.width + 150, box.y + 50, { "steps": 4 } );
		await page.mouse.up();

		// A second press and release outside the canvas is not the canvas's
		await page.mouse.down();
		await page.mouse.up();
		assert.deepEqual( await page.evaluate( () => ( {
			"log": window.log, "buttons": $.inmouse().buttons, "press": $.inpress().buttons
		} ) ), {
			"log": [ [ "mouse up", 0 ], [ "press up", 0 ] ], "buttons": 0, "press": 0
		} );
	} finally {
		await page.close();
	}
} );
