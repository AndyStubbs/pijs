/**
 * Deterministic SYS-010 regressions against the actual image source module.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_vm from "node:vm";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;

function createHarness() {
	const images = [];
	const counts = { "wait": 0, "done": 0, "deleted": [] };
	const failures = {};
	const screens = [];
	const context = g_harness.loadModule( "src/api/images.js", {
		"g_utils": {
			"isFunction": v => typeof v === "function",
			"getInt": ( value, fallback ) => value ?? fallback,
			"clamp": ( value, min, max ) => Math.min( Math.max( value, min ), max )
		},
		"g_alpha": { "unpremultiplyPixels": () => {} },
		"g_commands": { "wait": () => counts.wait++, "done": () => counts.done++ },
		"g_screenManager": { "getAllScreensData": () => screens },
		"g_renderer": {
			"deleteWebGL2Texture": ( screen, img ) => {
				counts.deleted.push( [ screen, img ] );
			},
			"readPixelsRaw": ( screen, x, y, width, height ) => {
				return new Uint8Array( width * height * 4 );
			}
		},
		"document": { "createElement": () => ( {
			"getContext": () => ( {
				"createImageData": ( width, height ) => ( {
					"data": new Uint8ClampedArray( width * height * 4 )
				} ),
				"putImageData": () => {}
			} )
		} ) },
		"Image": class {
			constructor() {
				if( failures.construct ) { throw failures.error; }
				this.width = 2;
				this.height = 2;
				images.push( this );
				for( const name of [ "onload", "onerror" ] ) {
					let handler = null;
					Object.defineProperty( this, name, {
						"get": () => handler,
						"set": value => {
							if( failures[ name ] && value ) { throw failures.error; }
							handler = value;
						}
					} );
				}
			}
			set src( value ) {
				if( failures.src ) { throw failures.error; }
				this.url = value;
				if( failures.syncLoad ) { this.onload(); }
			}
			removeAttribute( name ) { if( name === "src" ) { this.url = ""; } }
		}
	} );
	return { "api": context, "images": images, "counts": counts, "failures": failures,
		"screens": screens };
}

function missing( h, name ) {
	assert.throws( () => h.api.getImage( { "name": name } ), { "code": "IMAGE_NOT_FOUND" } );
}

test( "SYS-010 pending removal settles once and stale events cannot touch replacement", () => {
	const h = createHarness();
	let callbacks = 0;
	h.api.loadImage( { "src": "old.png", "name": "reuse",
		"onLoad": () => callbacks++, "onError": () => callbacks++ } );
	const old = h.images[ 0 ];
	const ready = old.onload;
	const error = old.onerror;
	h.api.removeImage( { "name": "reuse" } );
	h.api.removeImage( { "name": "reuse" } );
	missing( h, "reuse" );
	assert.equal( old.onload, null );
	assert.equal( old.onerror, null );
	assert.equal( old.url, "" );
	assert.equal( h.counts.done, 1 );
	h.api.loadImage( { "src": "new.png", "name": "reuse" } );
	ready(); error( new Error( "late" ) );
	assert.equal( h.api.getStoredImage( "reuse" ).status, "loading" );
	assert.equal( h.counts.done, 1 );
	h.images[ 1 ].onload();
	assert.equal( h.api.getImage( { "name": "reuse" } ), h.images[ 1 ] );
	assert.equal( h.counts.done, h.counts.wait );
	assert.equal( callbacks, 0 );
} );

test( "SYS-010 duplicate terminal events cannot release another resource wait", () => {
	const h = createHarness();
	let calls = 0;
	h.api.loadImage( { "src": "controlled-a", "onLoad": () => {
		calls++; throw new Error( "expected" );
	} } );
	h.api.loadImage( { "src": "controlled-b", "onError": () => { calls++; } } );
	const onLoad = h.images[ 0 ].onload;
	const onError = h.images[ 0 ].onerror;
	assert.throws( () => onLoad(), { "message": "expected" } );
	assert.equal( h.images[ 0 ].onload, null );
	assert.equal( h.images[ 0 ].onerror, null );
	assert.equal( h.counts.done, 1 );
	onLoad(); onError( new Error( "duplicate" ) );
	assert.equal( h.counts.done, 1 );
	assert.equal( calls, 1 );
	h.images[ 1 ].onerror( new Error( "controlled" ) );
	assert.equal( h.counts.wait, 2 );
	assert.equal( h.counts.done, 2 );
	assert.equal( calls, 2 );
} );

for( const terminal of [ "onload", "onerror" ] ) {
	test( `SYS-010 ${terminal} detaches handlers and permits removal and reuse`, () => {
		const h = createHarness();
		let callbacks = 0;
		h.api.loadImage( { "src": "one.png", "name": "one",
			"onLoad": () => callbacks++, "onError": () => callbacks++ } );
		const img = h.images[ 0 ];
		const ready = img.onload;
		const error = img.onerror;
		img[ terminal ]( new Error( "failed" ) );
		if( terminal === "onerror" ) {
			assert.throws( () => h.api.getImage( { "name": "one" } ),
				{ "code": "IMAGE_LOAD_FAILED" } );
		}
		assert.equal( img.onload, null );
		assert.equal( img.onerror, null );
		h.api.removeImage( { "name": "one" } );
		missing( h, "one" );
		h.api.loadImage( { "src": "new.png", "name": "one" } );
		ready(); error();
		assert.equal( h.counts.done, 1 );
		assert.equal( callbacks, 1 );
		assert.equal( h.api.getStoredImage( "one" ).status, "loading" );
	} );

	test( `SYS-010 throwing reentrant ${terminal} callback preserves replacement and wait`, () => {
		const h = createHarness();
		const failure = new Error( "callback" );
		const callback = () => {
			h.api.removeImage( { "name": "one" } );
			h.api.loadImage( { "src": "new.png", "name": "one" } );
			throw failure;
		};
		h.api.loadImage( { "src": "one.png", "name": "one",
			"onLoad": callback, "onError": callback } );
		assert.throws( () => h.images[ 0 ][ terminal ](), error => error === failure );
		assert.equal( h.counts.done, 1 );
		assert.equal( h.counts.wait, 2 );
		assert.equal( h.api.getStoredImage( "one" ).status, "loading" );
		h.images[ 1 ].onload();
		assert.equal( h.counts.done, 2 );
	} );
}

for( const step of [ "construct", "onload", "onerror", "src" ] ) {
	test( `SYS-010 synchronous ${step} failure rolls back and permits reuse`, () => {
		const h = createHarness();
		h.failures[ step ] = true;
		h.failures.error = new Error( step );
		assert.throws( () => h.api.loadImage( { "src": "one.png", "name": "one" } ),
			error => error === h.failures.error );
		missing( h, "one" );
		assert.equal( h.counts.wait, h.counts.done );
		for( const img of h.images ) {
			assert.equal( img.onload, null );
			assert.equal( img.onerror, null );
		}
		h.failures[ step ] = false;
		h.api.loadImage( { "src": "two.png", "name": "one" } );
		h.images.at( -1 ).onload();
		assert.equal( h.counts.wait, h.counts.done );
	} );
}

test( "SYS-010 synchronous callback errors do not roll back successful registration", () => {
	const h = createHarness();
	const failure = new Error( "callback" );
	h.failures.syncLoad = true;
	assert.throws( () => h.api.loadImage( { "src": "one.png", "name": "one",
		"onLoad": () => { throw failure; } } ), error => error === failure );
	assert.equal( h.api.getStoredImage( "one" ).status, "ready" );
	assert.equal( h.counts.wait, h.counts.done );
} );

test( "SYS-010 synchronous callback replacement survives source assignment errors", () => {
	const h = createHarness();
	const failure = new Error( "callback" );
	h.failures.syncLoad = true;
	assert.throws( () => h.api.loadImage( { "src": "old.png", "name": "reuse",
		"onLoad": () => {
			h.api.removeImage( { "name": "reuse" } );
			h.failures.syncLoad = false;
			h.api.loadImage( { "src": "new.png", "name": "reuse" } );
			throw failure;
		} } ), error => error === failure );
	assert.equal( h.api.getStoredImage( "reuse" ).status, "loading" );
	assert.equal( h.counts.wait, 2 );
	assert.equal( h.counts.done, 1 );
	h.images[ 1 ].onload();
	assert.equal( h.api.getImage( { "name": "reuse" } ), h.images[ 1 ] );
	assert.equal( h.counts.done, 2 );
} );

test( "2.2 direct canvas loading preserves the source without pixel processing", () => {
	const h = createHarness();
	const canvas = { "tagName": "CANVAS", "width": 1, "height": 1,
		"getContext": () => { throw new Error( "unexpected pixel processing" ); } };
	h.api.loadImage( { "src": canvas, "name": "source" } );
	assert.equal( h.api.getImage( { "name": "source" } ), canvas );
	assert.equal( h.counts.wait, 0 );
} );

test( "SYS-010 direct element callback errors preserve a reentrant replacement", () => {
	const h = createHarness();
	const failure = new Error( "callback" );
	const canvas = { "tagName": "CANVAS", "width": 1, "height": 1 };
	assert.throws( () => h.api.loadImage( { "src": canvas, "name": "reuse",
		"onLoad": () => {
			h.api.removeImage( { "name": "reuse" } );
			h.api.loadImage( { "src": "new.png", "name": "reuse" } );
			throw failure;
		} } ), error => error === failure );
	assert.equal( h.api.getStoredImage( "reuse" ).status, "loading" );
	assert.equal( h.counts.wait, 1 );
	assert.equal( h.counts.done, 0 );
	h.images[ 0 ].onload();
	assert.equal( h.counts.done, 1 );
} );

test( "SYS-010 ready removal cleans textures without modifying caller canvas", () => {
	const h = createHarness();
	const canvas = { "tagName": "CANVAS", "width": 2, "height": 2 };
	h.screens.push( {}, {} );
	let callbackName;
	assert.equal( h.api.loadImage( { "src": canvas, "name": "canvas",
		"onLoad": name => { callbackName = name; } } ), "canvas" );
	assert.equal( callbackName, "canvas" );
	h.api.removeImage( { "name": "canvas" } );
	assert.equal( h.counts.deleted.length, 2 );
	assert.ok( h.counts.deleted.every( entry => entry[ 1 ] === canvas ) );
	assert.deepEqual( canvas, { "tagName": "CANVAS", "width": 2, "height": 2 } );
	assert.equal( h.counts.wait, 0 );
	missing( h, "canvas" );
} );

test( "SYS-010 pending removal preserves an unrelated ready registration", () => {
	const h = createHarness();
	const canvas = { "tagName": "CANVAS", "width": 1, "height": 1 };
	h.api.loadImage( { "src": canvas, "name": "kept" } );
	h.api.loadImage( { "src": "pending.png", "name": "pending" } );
	h.api.removeImage( { "name": "pending" } );
	missing( h, "pending" );
	assert.equal( h.api.getImage( { "name": "kept" } ), canvas );
	assert.equal( h.counts.done, 1 );
	h.api.removeImage( { "name": "kept" } );
	missing( h, "kept" );
} );

/** A 2x2 screen whose view has no offset or clip, for createImageFromScreen(). */
function createCaptureScreen() {
	return { "view": { "width": 2, "height": 2, "originX": 0, "originY": 0,
		"clipX": 0, "clipY": 0, "clipWidth": 2, "clipHeight": 2 } };
}

test( "generated image names skip every registered name", () => {
	const h = createHarness();
	const screen = createCaptureScreen();
	const canvas = name => ( { "tagName": "CANVAS", "width": 16, "height": 16, "name": name } );

	// Explicit numeric names cover the next counter values: ready, loading, and failed
	h.api.loadImage( { "src": canvas( "1" ), "name": "1" } );
	h.api.loadImage( { "src": "two.png", "name": "2" } );
	h.api.loadImage( { "src": "three.png", "name": "3" } );
	h.images[ 1 ].onerror( new Error( "failed" ) );
	h.api.loadImage( { "src": canvas( "5" ), "name": "5" } );

	const captured = h.api.createImageFromScreen( screen, {} );
	const loaded = h.api.loadImage( { "src": canvas( "loaded" ) } );
	const sheet = h.api.loadSpritesheet( { "src": canvas( "sheet" ), "width": 8, "height": 8,
		"margin": 0 } );
	const next = h.api.createImageFromScreen( screen, {} );
	assert.deepEqual( [ captured, loaded, sheet, next ], [ "4", "6", "7", "8" ] );

	assert.equal( h.api.getImage( { "name": "1" } ).name, "1" );
	assert.equal( h.api.getStoredImage( "2" ).status, "loading" );
	assert.equal( h.api.getStoredImage( "3" ).status, "error" );
	assert.equal( h.api.getImage( { "name": "5" } ).name, "5" );
	assert.equal( h.api.getImage( { "name": "6" } ).name, "loaded" );
	assert.equal( h.api.getStoredImage( "7" ).frames.length, 4 );

	// Explicit duplicates are still rejected, and removed names can be registered again
	assert.throws( () => h.api.createImageFromScreen( screen, { "name": "4" } ),
		{ "code": "DUPLICATE_NAME" } );
	assert.throws( () => h.api.loadImage( { "src": canvas( "x" ), "name": "6" } ),
		{ "code": "INVALID_NAME" } );
	assert.throws( () => h.api.loadSpritesheet( { "src": canvas( "x" ), "name": "7",
		"width": 8, "height": 8, "margin": 0 } ), { "code": "INVALID_NAME" } );
	h.api.removeImage( { "name": "4" } );
	assert.equal( h.api.createImageFromScreen( screen, { "name": "4" } ), "4" );
	assert.equal( h.api.loadImage( { "src": canvas( "after" ) } ), "9" );
} );

test( "loadSpritesheet rejects negative margins before registering or loading", () => {
	const h = createHarness();
	const canvas = { "tagName": "CANVAS", "width": 16, "height": 16 };

	// The load runs inside the context with a time limit, so an unbounded slice fails fast
	h.api.testCanvas = canvas;
	const load = ( src, width, height, margin ) => {
		h.api.testArgs = { "src": src, "width": width, "height": height, "margin": margin };
		return g_vm.runInContext( "loadSpritesheet( testArgs )", h.api, { "timeout": 1000 } );
	};
	for( const [ width, height, margin ] of [
		[ 8, 8, -1 ], [ 8, 8, -8 ], [ 8, 8, -9 ], [ 8, 4, -4 ], [ 4, 8, -4 ], [ 8, 8, -0.6 ]
	] ) {
		for( const src of [ canvas, "sheet.png" ] ) {
			assert.throws( () => load( src, width, height, margin ),
				{ "name": "RangeError", "code": "INVALID_MARGIN" },
				`${width}x${height} margin ${margin}` );
		}
	}
	assert.equal( h.images.length, 0 );
	assert.equal( h.counts.wait, 0 );
	assert.equal( h.api.getStoredImage( "1" ), null );

	// Rounding to zero is accepted, and zero and positive margins keep their frame counts
	for( const [ margin, frames ] of [ [ -0.4, 4 ], [ 0, 4 ], [ 1, 4 ], [ 2, 1 ], [ 6, 0 ] ] ) {
		const name = load( canvas, 6, 6, margin );
		assert.equal( h.api.getStoredImage( name ).frames.length, frames, `margin ${margin}` );
	}
} );
