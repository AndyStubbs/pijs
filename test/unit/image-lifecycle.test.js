/**
 * Deterministic SYS-010 regressions against the actual image source module.
 */
const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function createHarness() {
	const images = [];
	const counts = { "wait": 0, "done": 0, "deleted": [] };
	const failures = {};
	const screens = [];
	const color = { "r": 0, "g": 0, "b": 0, "a": 0, "key": 0 };
	const context = vm.createContext( {
		"console": console,
		"g_utils": { "isFunction": v => typeof v === "function",
			"convertToColor": () => color, "rgbToColor": () => color },
		"g_commands": { "wait": () => counts.wait++, "done": () => counts.done++ },
		"g_screenManager": { "getAllScreensData": () => screens },
		"g_renderer": { "deleteWebGL2Texture": ( screen, img ) => {
			counts.deleted.push( [ screen, img ] );
		} },
		"g_colors": { "findColorIndexByColorValue": () => 0 },
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
	const source = fs.readFileSync( path.join( __dirname, "../../src/api/images.js" ), "utf8" )
		.replace( /^import .*;\r?\n/gm, "" ).replace( /export /g, "" );
	vm.runInContext( source, context, { "filename": "src/api/images.js" } );
	return { "api": context, "images": images, "counts": counts, "failures": failures,
		"screens": screens, "palette": () => vm.runInContext( "m_paletteImages.slice()", context ) };
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

test( "SYS-010 synchronous palette setup failure rolls back partial registration", () => {
	const h = createHarness();
	const failure = new Error( "canvas setup" );
	const canvas = { "tagName": "CANVAS", "width": 1, "height": 1,
		"getContext": () => { throw failure; } };
	assert.throws( () => h.api.loadImage( { "src": canvas, "name": "reuse",
		"usePalette": true, "paletteKeys": [ "black" ] } ), error => error === failure );
	missing( h, "reuse" );
	assert.equal( h.palette().length, 0 );
	h.api.loadImage( { "src": canvas, "name": "reuse" } );
	assert.equal( h.api.getImage( { "name": "reuse" } ), canvas );
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

test( "SYS-010 pending palette removal does not remove another palette registration", () => {
	const h = createHarness();
	const canvas = { "tagName": "CANVAS", "width": 1, "height": 1,
		"getContext": () => ( { "getImageData": () => ( {
			"data": new Uint8ClampedArray( 4 ) } ), "putImageData": () => {} } ) };
	h.api.loadImage( { "src": canvas, "name": "kept", "usePalette": true,
		"paletteKeys": [ "black" ] } );
	h.api.loadImage( { "src": "pending.png", "name": "pending", "usePalette": true,
		"paletteKeys": [ "black" ] } );
	h.api.removeImage( { "name": "pending" } );
	missing( h, "pending" );
	assert.deepEqual( Array.from( h.palette() ), [ "kept" ] );
	h.api.removeImage( { "name": "kept" } );
	assert.equal( h.palette().length, 0 );
} );
