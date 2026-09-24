/**
 * Screen lifecycle regressions against fresh in-memory full and lite bundles: removal and
 * active-screen rebinding (SYS-001), allocation and initializer rollback, shared-context
 * ownership, noCss host layout, and errors for missing screens and invalid draw strings.
 * Run with node --test test/unit/screen-lifecycle-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles( {
	"html": "<!doctype html><html><body><div id='host'></div></body></html>",
	"beforeLoad": () => {

		// Record observed elements so tests can check observer membership after cleanup.
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
	}
} );

const NO_ACTIVE_SCREEN_MESSAGE = "draw: You are attempting to call a method that requires a " +
	"screen but there is currently no active screen. Call $.screen() before calling any " +
	"graphics commands.";

for( const bundle of g_harness.BUNDLES ) {
	test( `SYS-001 ${bundle}: active removal rebinds drawing to the first survivor`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const first = $.screen( "16x16" );
			const second = $.screen( "12x12" );
			const removed = $.screen( "8x8" );
			removed.removeScreen();
			const dimensions = [ $.width(), $.height() ];
			$.setColor( "red" );
			$.pset( 1, 1 );
			$.setScreen( first );
			$.setColor( "blue" );
			$.pset( 2, 2 );
			first.setColor( "white" );
			first.pset( 3, 3 );
			const pixels = [ 1, 2, 3 ].map( position => {
				const { r, g, b, a } = first.getPixel( position, position );
				return [ r, g, b, a ];
			} );
			let removedCode;
			try { removed.pset( 1, 1 ); } catch( error ) { removedCode = error.code; }
			return [ dimensions, $.canvas() === first.canvas(), pixels, removedCode,
				second.getPixel( 1, 1 ).r ];
		} ), [ [ 16, 16 ], true, [ [ 255, 0, 0, 255 ], [ 0, 0, 255, 255 ],
			[ 255, 255, 255, 255 ] ], "DELETED_METHOD", 0 ] );
	} );

	test( `SYS-001 ${bundle}: nonactive removal keeps drawing; reselection repairs bindings`,
		async () => {
			assert.deepEqual( await probe( bundle, () => {
				const removed = $.screen( "16x16" );
				const active = $.screen( "8x8" );
				const stalePset = removed.pset;
				$.removeScreen( removed );
				$.setColor( "red" );
				$.pset( 1, 1 );
				// Simulate a stale global binding and reselect the already-active screen.
				$.pset = stalePset;
				$.setScreen( active.id );
				$.setColor( "blue" );
				$.pset( 2, 2 );
				const pixels = [ 1, 2 ].map( position => {
					const { r, g, b, a } = active.getPixel( position, position );
					return [ r, g, b, a ];
				} );
				return [ $.width(), $.height(), $.canvas() === active.canvas(), pixels ];
			} ), [ 8, 8, true, [ [ 255, 0, 0, 255 ], [ 0, 0, 255, 255 ] ] ] );
		}
	);

	test( `SYS-001 ${bundle}: last removal restores no-screen errors and later drawing`, async () => {
		const commands = [ "arc", "bezier", "circle", "ellipse", "line", "pset", "rect",
			"drawImage", "drawSprite" ];
		assert.deepEqual( await probe( bundle, () => {
			const screen = $.screen( "8x8" );
			$.removeScreen( screen.id );
			const codes = [ "arc", "bezier", "circle", "ellipse", "line", "pset", "rect",
				"drawImage", "drawSprite", "width" ].map( command => {
				try { $[ command ](); } catch( error ) { return error.code; }
			} );
			const replacement = $.screen( "10x10" );
			$.setColor( "red" );
			$.pset( 1, 1 );
			const { r, g, b, a } = replacement.getPixel( 1, 1 );
			return [ codes, $.width(), $.height(), [ r, g, b, a ] ];
		} ), [ [ ...commands.map( () => "NO_SCREEN" ), "NO_ACTIVE_SCREEN" ],
			10, 10, [ 255, 0, 0, 255 ] ] );
	} );

	test( `${bundle}: allocation and initializer failures roll back cleanly`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const parent = $.screen( "8x8" );
			const screens = [];
			let shouldFail = false;
			$.registerPlugin( { "name": "injection", "init": api => {
				api.addScreenInitFunction( data => {
					screens.push( data );
					if( shouldFail ) { throw new Error( "injected initializer" ); }
				} );
			} } );
			const proto = WebGL2RenderingContext.prototype;
			const live = new Set();
			let invalidDelete = 0;
			let failKind = null;
			let failAt = 0;
			let calls = 0;
			for( const kind of [ "Texture", "Framebuffer", "Buffer", "VertexArray", "Program",
				"Shader" ] ) {
				const create = proto[ "create" + kind ];
				const destroy = proto[ "delete" + kind ];
				proto[ "create" + kind ] = function( ...args ) {
					if( kind === failKind && ++calls === failAt ) { return null; }
					const item = create.apply( this, args );
					if( item ) { live.add( item ); }
					return item;
				};
				proto[ "delete" + kind ] = function( item ) {
					if( item && !live.delete( item ) ) { invalidDelete++; }
					return destroy.call( this, item );
				};
			}
			const errors = [];
			for( const kind of [ "Texture", "Framebuffer", "Buffer", "VertexArray", "Program",
				"Shader", "initializer" ] ) {
				for( const occurrence of [ 1, 2 ] ) {
					failKind = kind; failAt = occurrence; calls = 0;
					shouldFail = kind === "initializer";
					try { $.screen( { "aspect": "8x8", "isOffscreen": true, "parent": parent } ); }
					catch( error ) { errors.push( error.message ); }
					if( live.size || $.getAllScreens().length !== 1 || $.canvas() !== parent.canvas() ) {
						throw new Error( kind + ": rollback left " + live.size + " resources" );
					}
					parent.setColor( "red" );
					parent.pset( 1, 1 );
					$.pset( 2, 2 );
					const pixel = parent.getPixel( 1, 1 );
					if( pixel.r !== 255 ) {
						throw new Error( kind + " " + occurrence + ": parent damaged " + pixel.r );
					}
				}
			}
			shouldFail = false; failKind = null;
			const next = $.screen( { "aspect": "8x8", "isOffscreen": true, "parent": parent } );
			next.removeScreen();
			return [ errors.length, live.size, invalidDelete, $.getAllScreens().length,
				window.observedTargets.size ];
		} ), [ 14, 0, 0, 1, 1 ] );
	} );

	test( `${bundle}: noCss follows host layout, shader toggles, and visibility`, async () => {
		assert.equal( await probe( bundle, async () => {
			const host = document.getElementById( "host" );
			host.style.cssText = "width:120px;height:90px;position:relative";
			const style = document.createElement( "style" );
			style.textContent = "#host canvas {width:80px;height:40px;padding:5px;border:3px solid;}";
			document.head.appendChild( style );
			const snapshot = () => [ document.documentElement, document.body, host ]
				.map( item => item.getAttribute( "style" ) );
			const original = JSON.stringify( snapshot() );
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
			if( canvas.width !== 80 || canvas.height !== 40 ) { throw new Error( "backing size" ); }
			style.textContent += "#host canvas {width:60px;height:30px;margin-left:17px}";
			await settle();
			if( canvas.width !== 60 || canvas.height !== 30 ) { throw new Error( "canvas observer" ); }
			style.textContent += "#host {display:none}";
			await settle();
			if( canvas.width !== 60 || canvas.height !== 30 ) { throw new Error( "hidden allocation" ); }
			style.textContent += "#host {display:block} #host canvas {width:90px;height:45px}";
			await settle();
			if( canvas.width !== 90 || canvas.height !== 45 ) { throw new Error( "visible allocation" ); }
			screen.setDisplayShader( null );
			if( canvas.width !== 8 || canvas.height !== 8 ) { throw new Error( "logical backing" ); }
			const untouched = canvas.getAttribute( "style" ) === null &&
				JSON.stringify( snapshot() ) === original;
			screen.removeScreen();
			style.textContent = "#host canvas {transform:scale(1.5)}";
			const scaled = $.screen( { "aspect": "8x8", "container": host, "noCss": true } );
			scaled.setDisplayShader( identity );
			await settle();
			if( scaled.canvas().width !== 8 || scaled.canvas().height !== 8 ) {
				throw new Error( "transform caused intrinsic resize feedback" );
			}
			scaled.removeScreen();
			return untouched && window.observedTargets.size === 0;
		} ), true );
	} );

	test( `${bundle}: rollback restores owned styles and observer membership`, async () => {
		assert.equal( await probe( bundle, () => {
			const host = document.getElementById( "host" );
			host.style.cssText = "margin-left:7px;overflow:visible";
			document.body.style.cssText = "padding-top:3px;margin-left:5px";
			const elements = [ document.documentElement, document.body, host ];
			const snapshot = () => JSON.stringify( elements.map( item => item.getAttribute( "style" ) ) );
			const before = snapshot();
			const getContext = HTMLCanvasElement.prototype.getContext;
			HTMLCanvasElement.prototype.getContext = () => null;
			try {
				for( const container of [ document.body, host ] ) {
					try { $.screen( { "aspect": "8x8", "container": container } ); }
					catch( error ) {
						if( error.code !== "WEBGL_ERROR" ) { throw error; }
					}
				}
			} finally { HTMLCanvasElement.prototype.getContext = getContext; }
			if( snapshot() !== before || window.observedTargets.size || $.getAllScreens().length ) {
				throw new Error( "failed screen ownership " + snapshot() );
			}
			const success = $.screen( { "aspect": "8x8", "container": host, "noCss": true } );
			return success.id === 2;
		} ), true );
	} );

	test( `${bundle}: failed context creation rolls back canvas and active screen`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const screen = $.screen( "8x8" );
			const count = document.querySelectorAll( "canvas" ).length;
			const getContext = HTMLCanvasElement.prototype.getContext;
			HTMLCanvasElement.prototype.getContext = () => null;
			let code;
			try { $.screen( "8x8" ); } catch( error ) { code = error.code; }
			finally { HTMLCanvasElement.prototype.getContext = getContext; }
			return [ code, document.querySelectorAll( "canvas" ).length - count,
				$.canvas() === screen.canvas(), $.getAllScreens().length ];
		} ), [ "WEBGL_ERROR", 0, true, 1 ] );
	} );

	test( `${bundle}: noCss validates both overloads and preserves logical aspect rules`, async () => {
		assert.equal( await probe( bundle, async () => {
			const host = document.getElementById( "host" );
			host.style.cssText = "width:85px;height:55px";
			for( const value of [ "true", 1, {}, [] ] ) {
				let code;
				try { $.screen( { "aspect": "8x8", "noCss": value } ); }
				catch( error ) { code = error.code; }
				if( code !== "INVALID_PARAMETER" ) { throw new Error( "noCss validation" ); }
			}
			for( const [ aspect, width, height ] of [ [ "8x8", 8, 8 ], [ "8m8", 8, 8 ],
				[ "8e8", 14, 9 ] ] ) {
				const screen = $.screen( aspect, host, false, null, null, true );
				if( screen.width() !== width || screen.height() !== height ) {
					throw new Error( "aspect " + aspect + " " + screen.width() + "x" + screen.height() );
				}
				screen.setBgColor( "red" ); screen.setContainerBgColor( "blue" );
				if( getComputedStyle( screen.canvas() ).backgroundColor !== "rgb(255, 0, 0)" ) {
					throw new Error( "explicit CSS" );
				}
				screen.removeScreen();
			}
			host.style.display = "none";
			const screen = $.screen( { "aspect": "8e8", "container": host, "noCss": true } );
			if( screen.width() !== 8 ) { throw new Error( "hidden initial allocation" ); }
			host.style.display = "block";
			await new Promise( resolve => setTimeout( resolve, 100 ) );
			if( screen.width() !== 14 ) { throw new Error( "initial visibility recovery" ); }
			screen.removeScreen();
			const bodyStyle = document.body.getAttribute( "style" );
			const body = $.screen( { "aspect": "8x8", "noCss": true } );
			if( document.body.getAttribute( "style" ) !== bodyStyle ) { throw new Error( "body CSS" ); }
			body.removeScreen();
			return window.observedTargets.size === 0;
		} ), true );
	} );

	test( `COV-004 ${bundle}: shared-context child survives parent removal then cleans up`,
		async () => {
			assert.deepEqual( await probe( bundle, async () => {
				const parent = $.screen( "8x8" );
				const child = $.screen( {
					"aspect": "4x4",
					"isOffscreen": true,
					"parent": parent
				} );
				child.setColor( "red" );
				child.pset( 1, 1 );
				parent.removeScreen();
				const afterParent = Array.from( child.getPixel( 1, 1 ).array );
				child.setColor( "blue" );
				child.pset( 2, 2 );
				const afterDraw = Array.from( child.getPixel( 2, 2 ).array );
				child.removeScreen();
				return [ afterParent, afterDraw, $.getAllScreens().length ];
			} ), [ [ 255, 0, 0, 255 ], [ 0, 0, 255, 255 ], 0 ] );
		} );

	test( `${bundle}: missing screens and invalid draw strings report their errors`,
		async () => {
			assert.deepEqual( await probe( bundle, () => {
				const errors = [];
				for( const run of [ () => $.draw( "R10U10" ), () => {
					$.screen( "8x8" );
					$.draw( 75 );
				} ] ) {
					try { run(); } catch( error ) {
						errors.push( [ error.name, error.code, error.message ] );
					}
				}
				return errors;
			} ), [
				[ "Error", "NO_ACTIVE_SCREEN", NO_ACTIVE_SCREEN_MESSAGE ],
				[ "TypeError", "INVALID_PARAMETER", "draw: Parameter drawString must be a string." ]
			] );
		} );
}
