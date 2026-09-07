/**
 * Browser assertions for 2.1.1. Requires a fresh build and the repository server.
 * Run with node --test test/unit/patch-browser.test.js.
 */
const { test, before, after } = require( "node:test" );
const assert = require( "node:assert/strict" );
const { chromium } = require( "@playwright/test" );
let browser;
before( async () => { browser = await chromium.launch( { "headless": true } ); } );
after( async () => { await browser?.close(); } );

test( "all supported shader source kinds preserve asymmetric corners in independent passes", async () => {
	const page = await browser.newPage();
	try {
		await page.goto( "http://localhost:8080/test/tests/html-core/shader_orientation_01.html" );
		assert.equal( await page.evaluate( () => window.patchResult ), 132 );
	} finally {
		await page.close();
	}
} );

for( const mode of [ "rounding", "no requestFrame", "wrong corner" ] ) {
	test( "shader orientation browser compatibility: " + mode, async () => {
		const page = await browser.newPage();
		try {
			await page.addInitScript( mode => {
				if( mode === "no requestFrame" ) {
					const capture = HTMLCanvasElement.prototype.captureStream;
					HTMLCanvasElement.prototype.captureStream = function( ...args ) {
						const stream = capture.apply( this, args );
						for( const track of stream.getVideoTracks() ) {
							Object.defineProperty( track, "requestFrame", { "value": undefined } );
						}
						return stream;
					};
					return;
				}
				function perturb( pixel ) {
					if( mode === "wrong corner" ) {
						pixel[ 0 ] = 0; pixel[ 1 ] = 0; pixel[ 2 ] = 255;
					} else {
						for( let i = 0; i < 3; i++ ) {
							pixel[ i ] = Math.min( 254, pixel[ i ] + 1 );
						}
					}
				}
				const read = WebGL2RenderingContext.prototype.readPixels;
				WebGL2RenderingContext.prototype.readPixels = function( ...args ) {
					const result = read.apply( this, args );
					if( args[ 2 ] === 1 && args[ 3 ] === 1 ) { perturb( args[ 6 ] ); }
					return result;
				};
				const get = CanvasRenderingContext2D.prototype.getImageData;
				CanvasRenderingContext2D.prototype.getImageData = function( ...args ) {
					const result = get.apply( this, args );
					if( args[ 2 ] === 1 && args[ 3 ] === 1 ) { perturb( result.data ); }
					return result;
				};
			}, mode );
			await page.goto( "http://localhost:8080/test/tests/html-core/shader_orientation_01.html" );
			if( mode === "wrong corner" ) {
				await assert.rejects( page.evaluate( () => window.patchResult ), /draw 0: corner 0/ );
			} else {
				assert.equal( await page.evaluate( () => window.patchResult ), 132 );
			}
		} finally { await page.close(); }
	} );
}

test( "pointer lifecycle fixture clears subscriptions before disposal", async () => {
	const page = await browser.newPage();
	try {
		await page.goto( "http://localhost:8080/test/tests/html-plugins/pointer_lifecycle_01.html" );
		assert.equal( await page.evaluate( () => window.patchResult ), true );
	} finally { await page.close(); }
} );

async function probe( fn ) {
	const page = await browser.newPage();
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

test( "throwing image callbacks release ready waits", async () => {
	assert.equal( await probe( async () => {
		const canvas = document.createElement( "canvas" );
		$.loadImage( { "src": canvas.toDataURL(), "name": "throwing",
			"onLoad": () => { throw new Error( "callback" ); } } );
		return Promise.race( [ $.ready().then( () => true ),
			new Promise( resolve => setTimeout( () => resolve( false ), 500 ) ) ] );
	} ), true );
} );

test( "allocation and initializer failures release resources and preserve shared contexts", async () => {
	assert.deepEqual( await probe( () => {
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

test( "noCss follows host layout, shader toggles, visibility, and fresh pointer bounds", async () => {
	assert.equal( await probe( async () => {
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
		canvas.dispatchEvent( new TouchEvent( "touchstart", { "touches": [ touch ] } ) );
		const touches = screen.intouch();
		if( touches[ 0 ].x !== 4 || touches[ 0 ].y !== 4 ) {
			throw new Error( "fresh touch position after movement and scaling" );
		}
		style.textContent += "#host canvas {transform:none}";
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

test( "screen rollback restores owned automatic styles and observer membership", async () => {
	assert.equal( await probe( () => {
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

test( "duplicate image terminal events cannot release another resource wait", async () => {
	assert.equal( await probe( async () => {
		const images = [];
		window.Image = class {
			constructor() { this.width = this.height = 8; images.push( this ); }
		};
		let calls = 0;
		$.loadImage( { "src": "controlled-a", "onLoad": () => {
			calls++; throw new Error( "expected" );
		} } );
		$.loadImage( { "src": "controlled-b", "onError": () => { calls++; } } );
		try { images[ 0 ].onload(); } catch( error ) {}
		images[ 0 ].onload(); images[ 0 ].onerror( new Error( "duplicate" ) );
		let ready = false;
		const settled = $.ready().then( () => { ready = true; } );
		await new Promise( resolve => setTimeout( resolve, 20 ) );
		if( ready || calls !== 1 ) { throw new Error( "released pending load" ); }
		images[ 1 ].onerror( new Error( "controlled" ) );
		await settled;
		return calls === 2;
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
				data.mouseEventListenersActive, data.isContextMenuEnabled ] );
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

test( "failed context creation rolls back canvas and active screen", async () => {
	assert.deepEqual( await probe( () => {
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

test( "noCss creation preserves host styles", async () => {
	assert.equal( await probe( () => {
		const host = document.getElementById( "host" );
		host.style.cssText = "width:80px;height:80px;";
		const elements = [ document.documentElement, document.body, host ];
		const before = elements.map( element => element.getAttribute( "style" ) );
		const screen = $.screen( { "aspect": "8x8", "container": host, "noCss": true } );
		return JSON.stringify( before ) === JSON.stringify(
			elements.map( element => element.getAttribute( "style" ) )
		) && screen.canvas().getAttribute( "style" ) === null;
	} ), true );
} );

test( "custom samplers align with the framebuffer", async () => {
	assert.deepEqual( await probe( () => {
		const source = document.createElement( "canvas" );
		source.width = source.height = 8;
		const ctx = source.getContext( "2d" );
		ctx.fillStyle = "red"; ctx.fillRect( 0, 0, 8, 4 );
		ctx.fillStyle = "blue"; ctx.fillRect( 0, 4, 8, 4 );
		const screen = $.screen( "8x8" );
		screen.drawImage( source, 0, 0 );
		const shader = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_map;
out vec4 fragColor;
void main() {
	fragColor = mix(texture(u_texture, v_texCoord), texture(u_map, v_texCoord), 0.5);
}` );
		screen.applyShader( shader, { "u_map": source } );
		const { r, g, b, a } = screen.getPixel( 1, 1 );
		return { "r": r, "g": g, "b": b, "a": a };
	} ), { "r": 255, "g": 0, "b": 0, "a": 255 } );
} );

test( "offscreen pointer commands report the invoked command", async () => {
	assert.deepEqual( await probe( () => {
		const screen = $.screen( { "aspect": "8x8", "isOffscreen": true } );
		try { screen.inpress(); } catch( error ) {
			return [ error.name, error.code, error.message.startsWith( "inpress: Screen " ) ];
		}
	} ), [ "TypeError", "OFFSCREEN_INPUT_UNSUPPORTED", true ] );
} );

test( "video drawing refreshes decoded frames", async () => {
	assert.deepEqual( await probe( async () => {
		const source = document.createElement( "canvas" );
		source.width = source.height = 8;
		const context = source.getContext( "2d" );
		const video = document.createElement( "video" );
		video.width = video.height = 8;
		video.muted = true;
		video.srcObject = source.captureStream( 0 );
		const track = video.srcObject.getVideoTracks()[ 0 ];
		async function frame( color ) {
			context.fillStyle = color; context.fillRect( 0, 0, 8, 8 );
			const decoded = new Promise( resolve => video.requestVideoFrameCallback( resolve ) );
			track.requestFrame();
			await decoded;
		}
		const playing = video.play();
		await frame( "red" );
		await playing;
		const screen = $.screen( "8x8" );
		const undecoded = document.createElement( "video" );
		undecoded.width = undecoded.height = 8;
		let notReady;
		try { screen.drawImage( undecoded, 0, 0 ); } catch( error ) { notReady = error.code; }
		if( notReady !== "IMAGE_NOT_READY" ) { throw new Error( "video readiness" ); }
		screen.drawImage( video, 0, 0 );
		screen.getPixel( 1, 1 );
		const shader = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_map;
out vec4 fragColor;
void main() { fragColor = 0.5 * (texture(u_texture,v_texCoord) + texture(u_map,v_texCoord)); }` );
		screen.applyShader( shader, { "u_map": video } );
		if( screen.getPixel( 1, 1 ).r !== 255 ) { throw new Error( "first video sampler" ); }
		await frame( "lime" );
		screen.drawImage( video, 0, 0 );
		screen.applyShader( shader, { "u_map": video } );
		screen.setDisplayShader( shader, { "u_map": video } );
		await new Promise( resolve => requestAnimationFrame( resolve ) );
		const copy = document.createElement( "canvas" );
		copy.width = copy.height = 8;
		copy.getContext( "2d" ).drawImage( screen.canvas(), 0, 0, 8, 8 );
		if( copy.getContext( "2d" ).getImageData( 1, 1, 1, 1 ).data[ 1 ] !== 255 ) {
			throw new Error( "display video sampler" );
		}
		video.pause();
		Object.defineProperty( video, "readyState", { "value": 0, "configurable": true } );
		screen.drawImage( video, 0, 0 );
		screen.applyShader( shader, { "u_map": video } );
		const { r, g, b, a } = screen.getPixel( 1, 1 );
		delete video.readyState;
		video.width = video.height = 0;
		if( video.videoWidth !== 8 ) { throw new Error( "natural video dimensions" ); }
		const natural = $.screen( { "aspect": "8x8", "isOffscreen": true } );
		natural.drawImage( video, 0, 0 );
		if( natural.getPixel( 1, 1 ).a !== 0 ) {
			throw new Error( "Review unspecified-size video behavior before changing this contract" );
		}
		track.stop();
		return { "r": r, "g": g, "b": b, "a": a };
	} ), { "r": 0, "g": 255, "b": 0, "a": 255 } );
} );

test( "sampler caches invalidate on resize/removal and failed allocations do not leak", async () => {
	assert.equal( await probe( () => {
		let getData, resize;
		$.registerPlugin( { "name": "inspect", "init": api => {
			getData = id => api.getScreenData( "test", id );
			resize = api.resizeOffscreenScreen;
		} } );
		const dest = $.screen( "8x8" );
		const source = $.screen( { "aspect": "8x8", "isOffscreen": true, "parent": dest } );
		const shader = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_map;
out vec4 fragColor;
void main() { fragColor = 0.5 * (texture(u_texture,v_texCoord) + texture(u_map,v_texCoord)); }` );
		dest.applyShader( shader, { "u_map": source } ); dest.getPixel( 1, 1 );
		const data = getData( dest.id );
		const gl = data.gl;
		const entry = data.samplerContextMap.get( getData( source.id ).canvas ).get( gl );
		if( entry.texture === data.imageContextMap.get( getData( source.id ).canvas ).get( gl ) ) {
			throw new Error( "cache ownership" );
		}
		resize( getData( source.id ), 16, 8 );
		if( gl.isTexture( entry.texture ) || gl.isFramebuffer( entry.readFbo ) ) {
			throw new Error( "resize leak" );
		}
		dest.applyShader( shader, { "u_map": source } ); dest.getPixel( 1, 1 );
		const entry2 = data.samplerContextMap.get( getData( source.id ).canvas ).get( gl );
		source.removeScreen();
		if( gl.isTexture( entry2.texture ) || data.samplerContextMap.size ) {
			throw new Error( "source removal leak" );
		}
		const image = document.createElement( "canvas" ); image.width = image.height = 8;
		const name = $.loadImage( image, "cache-test" );
		dest.drawImage( image, 0, 0 ); dest.getPixel( 1, 1 );
		const create = gl.createFramebuffer.bind( gl );
		const destroy = gl.deleteFramebuffer.bind( gl );
		const pending = new Set();
		let count = 0;
		gl.createFramebuffer = () => {
			if( ++count === 2 ) { return null; }
			const fbo = create(); pending.add( fbo ); return fbo;
		};
		gl.deleteFramebuffer = fbo => { pending.delete( fbo ); destroy( fbo ); };
		let failed = false;
		try { dest.applyShader( shader, { "u_map": name } ); }
		catch( error ) { failed = error.code === "WEBGL2_ERROR"; }
		gl.createFramebuffer = create; gl.deleteFramebuffer = destroy;
		if( !failed || pending.size || data.samplerContextMap.size ) {
			throw new Error( "partial sampler allocation" );
		}
		dest.applyShader( shader, { "u_map": name } ); dest.getPixel( 1, 1 );
		const entry3 = data.samplerContextMap.get( image ).get( gl );
		dest.setDisplayShader( shader, { "u_map": name } );
		gl.bindFramebuffer( gl.READ_FRAMEBUFFER, data.FBO );
		gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, data.bufferFBO );
		gl.activeTexture( gl.TEXTURE3 );
		gl.bindTexture( gl.TEXTURE_2D, data.fboTexture );
		gl.enable( gl.SCISSOR_TEST );
		gl.scissor( 0, 0, 1, 1 );
		data.displayShaderTextureResolver( image );
		if( gl.getParameter( gl.READ_FRAMEBUFFER_BINDING ) !== data.FBO ||
			gl.getParameter( gl.DRAW_FRAMEBUFFER_BINDING ) !== data.bufferFBO ||
			gl.getParameter( gl.ACTIVE_TEXTURE ) !== gl.TEXTURE3 ||
			gl.getParameter( gl.TEXTURE_BINDING_2D ) !== data.fboTexture ||
			!gl.isEnabled( gl.SCISSOR_TEST )
		) { throw new Error( "copy state restoration" ); }
		gl.disable( gl.SCISSOR_TEST );
		dest.setDisplayShader( null );
		$.removeImage( name );
		return !gl.isTexture( entry3.texture ) && !gl.isFramebuffer( entry3.drawFbo ) &&
			data.samplerContextMap.size === 0;
	} ), true );
} );

test( "image success/error callbacks settle once across concurrent loads and spritesheets", async () => {
	assert.deepEqual( await probe( async () => {
		let calls = 0;
		const canvas = document.createElement( "canvas" );
		canvas.width = canvas.height = 8;
		const src = canvas.toDataURL();
		for( const fail of [ false, true ] ) {
			for( const throws of [ false, true ] ) {
				const callback = () => { calls++; if( throws ) { throw new Error( "expected" ); } };
				$.loadImage( { "src": fail ? "data:image/png,invalid" : src,
					"onLoad": callback, "onError": callback } );
			}
		}
		$.loadSpritesheet( { "src": src, "width": 4, "height": 4,
			"onLoad": () => { calls++; throw new Error( "sheet callback" ); } } );
		await $.ready();
		await $.ready();
		return [ calls, true ];
	} ), [ 5, true ] );
} );

test( "queued image and sampler draws retain earlier dynamic content", async () => {
	assert.deepEqual( await probe( () => {
		const source = document.createElement( "canvas" );
		source.width = source.height = 8;
		const ctx = source.getContext( "2d" );
		const fill = color => { ctx.fillStyle = color; ctx.fillRect( 0, 0, 8, 8 ); };
		const screen = $.screen( "16x8" );
		fill( "red" ); screen.drawImage( source, 0, 0 );
		fill( "blue" ); screen.drawImage( source, 8, 0 );
		const earlier = screen.getPixel( 1, 1 );
		const later = screen.getPixel( 9, 1 );
		const shader = $.createShader( `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_map;
out vec4 fragColor;
void main() { fragColor = 0.5 * (texture(u_texture,v_texCoord) + texture(u_map,v_texCoord)); }` );
		fill( "red" ); screen.drawImage( source, 0, 0 );
		screen.applyShader( shader, { "u_map": source } );
		fill( "blue" ); screen.applyShader( shader, { "u_map": source } );
		const mixed = screen.getPixel( 1, 1 );
		return [ earlier.r, earlier.b, later.r, later.b, mixed.r, mixed.b ];
	} ), [ 255, 0, 0, 255, 128, 128 ] );
} );

test( "noCss validates both overloads and preserves logical aspect rules", async () => {
	assert.equal( await probe( async () => {
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
			if( getComputedStyle( screen.canvas() ).backgroundColor !== "rgb(255, 0, 0)" ) { throw new Error( "explicit CSS" ); }
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

test( "lite plugins initialize when their real dependencies arrive later", async () => {
	const page = await browser.newPage();
	try {
		await page.goto( "http://localhost:8080/" );
		await page.setContent( "<html><body></body></html>" );
		await page.addScriptTag( { "url": "/build/pi.lite.js" } );
		await page.evaluate( () => $.ready() );
		for( const name of [ "onscreen-keyboard", "pi-vision", "print-table", "keyboard", "pointer" ] ) {
			await page.addScriptTag( { "url": "/build/plugins/" + name + "/" + name + ".js" } );
		}
		assert.equal( await page.evaluate( () => $.getPlugins().every( p => p.initialized ) ), true );
	} finally { await page.close(); }
} );
