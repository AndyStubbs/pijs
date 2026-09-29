/**
 * Pointer regressions against a fresh in-memory full bundle: offscreen command validation, noCss
 * pointer bounds, gesture settings on the canvas, a release outside the canvas and a wheel with
 * trusted input, and the screens that each form of clearEvents() clears. Owned by the pointer
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
		screen.inMouse();
		const rect = canvas.getBoundingClientRect();
		canvas.dispatchEvent( new PointerEvent( "pointermove", {
			"pointerId": 1, "pointerType": "mouse", "button": -1,
			"clientX": rect.left + 8 + 30, "clientY": rect.top + 8 + 15
		} ) );
		if( screen.inMouse().x !== 4 || screen.inMouse().y !== 4 ) {
			throw new Error( "content coordinates" );
		}
		screen.inTouch();
		style.textContent += "#host canvas {margin-left:27px;transform:scale(1.5)}";
		const moved = canvas.getBoundingClientRect();
		canvas.dispatchEvent( new PointerEvent( "pointerdown", {
			"pointerId": 7, "pointerType": "touch", "button": 0, "buttons": 1,
			"clientX": moved.left + ( 8 + 30 ) * 1.5,
			"clientY": moved.top + ( 8 + 15 ) * 1.5
		} ) );
		const touches = screen.inTouch();
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
				data.isContextMenuEnabled, data.isPinchZoomEnabled ] );
			const before = state();
			for( const command of [ "inMouse", "inTouch", "inPress", "startMouse", "startTouch",
				"onMouse", "onTouch", "onPress", "onClick", "setContextMenu", "setPinchZoom" ] ) {
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
			visible.inMouse(); visible.inTouch(); visible.inPress();
			$.setScreen( visible ); $.inMouse(); $.inTouch(); $.inPress();
			buffer.clearEvents(); buffer.removeScreen();
			await new Promise( resolve => setTimeout( resolve, 10 ) );
		}
		return true;
	} ), true );
} );

test( "gesture settings act on the canvas from screen creation, never body (B10, I12)",
	async () => {
		assert.deepEqual( await probe( () => {
			document.body.style.touchAction = "pan-y";
			const screen = $.screen( { "aspect": "8x8", "container": "host", "noCss": true } );
			const canvas = screen.canvas();
			const menu = () => {
				return !canvas.dispatchEvent( new MouseEvent( "contextmenu", {
					"bubbles": true, "cancelable": true
				} ) );
			};
			const created = [ menu(), canvas.style.touchAction ];
			screen.onTouch( "down", () => {} );
			const tracked = canvas.style.touchAction;
			$.set( { "contextMenu": true, "pinchZoom": true } );
			const set = [ menu(), canvas.style.touchAction, document.body.style.touchAction ];
			let oldOption = "ok";
			try {
				$.set( { "enableContextMenu": false } );
			} catch( error ) {
				oldOption = error.code;
			}
			screen.removeScreen();
			return {
				"created": created, "tracked": tracked, "set": set, "oldOption": oldOption,
				"oldCommand": typeof $.setEnableContextMenu
			};
		} ), {
			"created": [ true, "" ], "tracked": "none", "set": [ false, "pinch-zoom", "pan-y" ],
			"oldOption": "INVALID_OPTION", "oldCommand": "undefined"
		} );
	}
);

test( "a trusted wheel over the canvas reaches onWheel and scrolls the page only without " +
	"handlers (B11)", async () => {
	const page = await context.newPage();
	try {
		await page.goto( "http://localhost:8080/" );
		await page.setContent( "<html><body style='margin:0;height:3000px'>" +
			"<div id='host' style='width:200px;height:200px'></div></body></html>" );
		await page.addScriptTag( { "url": "/build/pi.js" } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => {
			$.screen( { "aspect": "100x100", "container": "host" } );
			window.log = [];
			window.handler = data => window.log.push( [ data.x, data.y, data.deltaY ] );
			$.onWheel( window.handler );
		} );
		const box = await page.locator( "canvas" ).boundingBox();
		await page.mouse.move( box.x + box.width / 4, box.y + box.height / 2 );
		await page.mouse.wheel( 0, 120 );
		await page.waitForFunction( () => window.log.length === 1 );
		const handled = await page.evaluate( () => ( {
			"log": window.log, "scrollY": window.scrollY
		} ) );
		assert.deepEqual( handled, { "log": [ [ 25, 50, 120 ] ], "scrollY": 0 } );

		// Without a handler, the same wheel scrolls the page
		await page.evaluate( () => $.offWheel( window.handler ) );
		await page.mouse.wheel( 0, 120 );
		await page.waitForFunction( () => window.scrollY > 0 );
		assert.equal( await page.evaluate( () => window.log.length ), 1 );
	} finally {
		await page.close();
	}
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
			$.onMouse( "up", data => window.log.push( [ "mouse up", data.buttons ] ) );
			$.onPress( "up", data => window.log.push( [ "press up", data.buttons ] ) );
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
			"log": window.log, "buttons": $.inMouse().buttons, "press": $.inPress().buttons
		} ) ), {
			"log": [ [ "mouse up", 0 ], [ "press up", 0 ] ], "buttons": 0, "press": 0
		} );
	} finally {
		await page.close();
	}
} );

test( "a trusted touch drag that leaves the canvas ends once, with touch-action none (B6)",
	async () => {
		const page = await context.newPage();
		try {
			await page.goto( "http://localhost:8080/" );
			await page.setContent( "<html><body style='margin:0'>" +
				"<div id='host' style='width:200px;height:200px'></div></body></html>" );
			await page.addScriptTag( { "url": "/build/pi.js" } );
			await page.evaluate( () => $.ready() );
			await page.evaluate( () => {
				window.screen1 = $.screen( { "aspect": "100x100", "container": "host" } );
				window.log = [];
				$.onTouch( "down", data => window.log.push( [ "start", data.length ] ) );
				$.onTouch( "up", data => window.log.push( [ "end", data[ 0 ].x > 100,
					data[ 0 ].cancelled ] ) );
				$.onPress( "up", data => window.log.push( [ "press up", data.buttons ] ) );
			} );
			const box = await page.locator( "canvas" ).boundingBox();
			const cdp = await page.context().newCDPSession( page );
			const point = ( x, y ) => [ { "x": x, "y": y, "id": 1 } ];
			const x = box.x + box.width / 2;
			const y = box.y + box.height / 2;
			await cdp.send( "Input.dispatchTouchEvent", {
				"type": "touchStart", "touchPoints": point( x, y )
			} );
			for( let step = 1; step <= 4; step++ ) {
				await cdp.send( "Input.dispatchTouchEvent", {
					"type": "touchMove", "touchPoints": point( x + step * 60, y )
				} );
			}
			await cdp.send( "Input.dispatchTouchEvent", {
				"type": "touchEnd", "touchPoints": []
			} );
			assert.deepEqual( await page.evaluate( () => ( {
				"log": window.log, "touches": $.inTouch().length,
				"touchAction": getComputedStyle( screen1.canvas() ).touchAction
			} ) ), {
				"log": [ [ "start", 1 ], [ "end", true, false ], [ "press up", 0 ] ],
				"touches": 0, "touchAction": "none"
			} );
		} finally {
			await page.close();
		}
	}
);

test( "Core 13: a screen's clearEvents() clears its own pointer handlers, $.clearEvents() every " +
	"screen's, and click is its own type (I10)", async () => {
	assert.deepEqual( await probe( () => {
		const first = $.screen( { "aspect": "8x8", "container": "host" } );
		const second = $.screen( { "aspect": "8x8", "container": "host" } );
		const screens = [ [ "first", first ], [ "second", second ] ];

		// A mouse press and a touch on one canvas, each released
		function input( screen ) {
			const canvas = screen.canvas();
			const rect = canvas.getBoundingClientRect();
			const pointer = ( type, pointerType, pointerId, buttons ) => {
				canvas.dispatchEvent( new PointerEvent( type, {
					"bubbles": true, "pointerId": pointerId, "pointerType": pointerType,
					"button": 0, "buttons": buttons,
					"clientX": rect.left + 1, "clientY": rect.top + 1
				} ) );
			};
			pointer( "pointerdown", "mouse", 1, 1 );
			pointer( "pointerup", "mouse", 1, 0 );
			pointer( "pointerdown", "touch", 2, 1 );
			pointer( "pointerup", "touch", 2, 0 );
		}

		// The second screen is the active one
		const cases = [
			() => first.clearEvents(),
			() => second.clearEvents( "mouse" ),
			() => $.clearEvents(),
			() => $.clearEvents( "touch" ),
			() => $.clearEvents( "press" ),
			() => first.clearEvents( "click" ),
			() => $.clearEvents( "click" )
		];
		return cases.map( clear => {
			const log = new Set();
			for( const [ name, screen ] of screens ) {
				screen.onMouse( "down", () => log.add( name + " mouse" ) );
				screen.onTouch( "down", () => log.add( name + " touch" ) );
				screen.onPress( "down", () => log.add( name + " press" ) );
				screen.onClick( () => log.add( name + " click" ) );
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
		[ "first click", "first mouse", "first touch", "second click", "second mouse",
			"second touch" ],
		[ "first mouse", "first press", "first touch", "second click", "second mouse",
			"second press", "second touch" ],
		[ "first mouse", "first press", "first touch", "second mouse", "second press",
			"second touch" ]
	] );
} );
