/**
 * Pointer regressions against a fresh in-memory full bundle: offscreen command validation, noCss
 * pointer bounds, a release outside the canvas with trusted input, and the screens that each
 * form of clearEvents() clears. Owned by the pointer workstream.
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

		// A resize arrives through a ResizeObserver, whose timing varies by runner
		const waitForSize = async ( width, height, message ) => {
			const start = performance.now();
			while( canvas.width !== width || canvas.height !== height ) {
				if( performance.now() - start > 2000 ) { throw new Error( message ); }
				await new Promise( resolve => setTimeout( resolve, 10 ) );
			}
		};
		screen.setDisplayShader( identity );
		await waitForSize( 80, 40, "backing size" );
		style.textContent += "#host canvas {width:60px;height:30px;margin-left:17px}";
		await waitForSize( 60, 30, "canvas observer" );
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

test( "Core 13: a screen's clearEvents() clears its own pointer handlers, $.clearEvents() every " +
	"screen's (I10)", async () => {
	assert.deepEqual( await probe( () => {
		const first = $.screen( { "aspect": "8x8", "container": "host" } );
		const second = $.screen( { "aspect": "8x8", "container": "host" } );
		const screens = [ [ "first", first ], [ "second", second ] ];

		// A mouse press and a touch on one canvas, each released
		function input( screen ) {
			const canvas = screen.canvas();
			const rect = canvas.getBoundingClientRect();
			const at = { "clientX": rect.left + 1, "clientY": rect.top + 1 };
			canvas.dispatchEvent( new MouseEvent( "mousedown", {
				"bubbles": true, "button": 0, "buttons": 1, ...at
			} ) );
			window.dispatchEvent( new MouseEvent( "mouseup", {
				"bubbles": true, "button": 0, "buttons": 0, ...at
			} ) );
			const touch = new Touch( { "identifier": 1, "target": canvas, ...at } );
			canvas.dispatchEvent( new TouchEvent( "touchstart", {
				"bubbles": true, "cancelable": true, "touches": [ touch ],
				"changedTouches": [ touch ]
			} ) );
			canvas.dispatchEvent( new TouchEvent( "touchend", {
				"bubbles": true, "cancelable": true, "touches": [], "changedTouches": [ touch ]
			} ) );
		}

		// The second screen is the active one
		const cases = [
			() => first.clearEvents(),
			() => second.clearEvents( "mouse" ),
			() => $.clearEvents(),
			() => $.clearEvents( "touch" ),
			() => $.clearEvents( "press" )
		];
		return cases.map( clear => {
			const log = new Set();
			for( const [ name, screen ] of screens ) {
				screen.onmouse( "down", () => log.add( name + " mouse" ) );
				screen.ontouch( "start", () => log.add( name + " touch" ) );
				screen.onpress( "down", () => log.add( name + " press" ) );
				screen.onclick( () => log.add( name + " click" ) );
			}
			clear();
			input( first );
			input( second );
			first.clearEvents();
			second.clearEvents();
			return Array.from( log ).sort();
		} );
	} ), [
		[ "second click", "second mouse", "second press", "second touch" ],
		[ "first click", "first mouse", "first press", "first touch", "second click",
			"second press", "second touch" ],
		[],
		[ "first click", "first mouse", "first press", "second click", "second mouse",
			"second press" ],
		[ "first mouse", "first touch", "second mouse", "second touch" ]
	] );
} );
