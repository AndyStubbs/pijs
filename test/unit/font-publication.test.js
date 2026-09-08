/**
 * SYS-022 publication and readiness regressions against the actual font source module.
 */
"use strict";

const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function createHarness() {
	const images = [];
	const counts = { "wait": 0, "done": 0, "errors": [] };
	const failures = { "error": new Error( "setup failed" ) };
	class Element {
		constructor() { this.width = 16; this.height = 8; }
	}
	class ImageElement extends Element {}
	class Canvas extends Element {}
	class Offscreen extends Element {}
	class ControlledImage extends ImageElement {
		constructor() {
			super();
			if( failures.construct ) { throw failures.error; }
			images.push( this );
			this.saved = {};
			for( const name of [ "onload", "onerror" ] ) {
				let handler = null;
				Object.defineProperty( this, name, {
					"get": () => handler,
					"set": value => {
						if( value ) { this.saved[ name ] = value; }
						if( failures[ name ] && value ) { throw failures.error; }
						if( failures.detach && !value ) { throw new Error( "detach failed" ); }
						handler = value;
					}
				} );
			}
		}
		set src( value ) {
			this.url = value;
			if( failures.syncLoad ) { this.onload(); }
			if( failures.syncError ) { this.onerror(); }
			if( failures.src ) { throw failures.error; }
		}
		removeAttribute( name ) {
			if( failures.cancel ) { throw new Error( "cancel failed" ); }
			if( name === "src" ) { this.url = ""; }
		}
	}
	const utilsContext = vm.createContext( {
		"document": { "createElement": () => ( { "getContext": () => ( {} ) } ) }
	} );
	vm.runInContext( fs.readFileSync( path.join( __dirname, "../../src/core/utils.js" ), "utf8" )
		.replace( /export /g, "" ), utilsContext );
	const context = vm.createContext( {
		"console": { "error": message => counts.errors.push( message ) },
		"g_utils": utilsContext,
		"g_commands": { "wait": () => counts.wait++, "done": () => counts.done++ },
		"g_renderer": { "getWebGL2Texture": () => {} },
		"g_print": { "updatePrintCursorDimensions": () => {} },
		"HTMLImageElement": ImageElement, "HTMLCanvasElement": Canvas, "OffscreenCanvas": Offscreen,
		"Image": ControlledImage
	} );
	const source = fs.readFileSync( path.join( __dirname, "../../src/text/fonts.js" ), "utf8" )
		.replace( /^import .*;\r?\n/gm, "" ).replace( /export /g, "" );
	vm.runInContext( source, context, { "filename": "text/fonts.js" } );
	return { "api": context, "images": images, "counts": counts, "failures": failures,
		"Element": ImageElement, "Canvas": Canvas, "Offscreen": Offscreen };
}

function load( h, src, options = {} ) {
	return h.api.loadFont( { "src": src, "width": 8, "height": 8, ...options } );
}

function available( h ) {
	return JSON.parse( JSON.stringify( h.api.getAvailableFonts() ) );
}

function selected( h, id ) {
	const screen = {};
	h.api.setFont( screen, { "fontId": id } );
	return screen.font;
}

test( "SYS-022 repeated invalid sources preserve registry, IDs and validation errors", () => {
	const h = createHarness();
	assert.equal( load( h, new h.Canvas() ), 0 );
	const before = available( h );
	for( const src of [ {}, null, undefined, 1, false, [], Symbol( "font" ) ] ) {
		assert.throws( () => load( h, src ), {
			"name": "TypeError", "code": "INVALID_FONT_SRC",
			"message": "loadFont: fontSrc must be a string or Image element."
		} );
		assert.deepEqual( available( h ), before );
	}
	assert.throws( () => load( h, {}, { "width": null, "charset": {} } ),
		{ "code": "INVALID_DIMENSIONS" } );
	assert.throws( () => load( h, {}, { "charset": {} } ), { "code": "INVALID_CHARSET" } );
	assert.throws( () => h.api.setDefaultFont( { "fontId": 1 } ), { "code": "INVALID_FONT_ID" } );
	assert.throws( () => selected( h, 1 ), { "code": "INVALID_FONT_ID" } );
	assert.equal( load( h, new h.Canvas() ), 1 );
	assert.equal( h.counts.wait, 0 );
	assert.equal( h.counts.done, 0 );
} );

for( const step of [ "construct", "onload", "onerror", "src" ] ) {
	test( `SYS-022 synchronous ${step} failure publishes nothing and releases its wait`, () => {
		const h = createHarness();
		load( h, new h.Canvas() );
		const before = available( h );
		h.failures[ step ] = true;
		assert.throws( () => load( h, "failed.png" ), error => error === h.failures.error );
		assert.deepEqual( available( h ), before );
		assert.equal( h.counts.wait, h.counts.done );
		for( const img of h.images ) {
			assert.equal( img.onload, null );
			assert.equal( img.onerror, null );
			assert.equal( img.url, "" );
		}
		h.failures[ step ] = false;
		assert.equal( load( h, "valid.png" ), 1 );
		const font = selected( h, 1 );
		for( const img of h.images.slice( 0, -1 ) ) {
			img.saved.onload?.(); img.saved.onerror?.();
		}
		assert.equal( font.image, null );
		assert.equal( h.counts.wait - h.counts.done, 1 );
		h.images.at( -1 ).onload();
		assert.equal( font.image, h.images.at( -1 ) );
		assert.equal( h.counts.wait, h.counts.done );
		assert.deepEqual( h.counts.errors, [] );
	} );
}

for( const dimension of [ "width", "height" ] ) {
	test( `SYS-022 direct source ${dimension} getter failure does not consume an ID`, () => {
		const h = createHarness();
		const src = new h.Canvas();
		Object.defineProperty( src, dimension, { "get": () => { throw h.failures.error; } } );
		assert.throws( () => load( h, src ), error => error === h.failures.error );
		assert.deepEqual( available( h ), [] );
		assert.equal( load( h, new h.Canvas() ), 0 );
		assert.equal( h.counts.wait, 0 );
		assert.equal( h.counts.done, 0 );
	} );
}

test( "SYS-022 cleanup failures preserve original exception and invalidate callbacks", () => {
	const h = createHarness();
	Object.assign( h.failures, { "src": true, "detach": true, "cancel": true } );
	assert.throws( () => load( h, "failed.png" ), error => error === h.failures.error );
	h.images[ 0 ].saved.onload(); h.images[ 0 ].saved.onerror();
	assert.equal( h.counts.wait, 1 );
	assert.equal( h.counts.done, 1 );
	assert.deepEqual( available( h ), [] );
	assert.deepEqual( h.counts.errors, [] );
} );

test( "SYS-022 direct image, canvas and offscreen sources retain font data", () => {
	const h = createHarness();
	for( const Type of [ h.Element, h.Canvas, h.Offscreen ] ) {
		const src = new Type();
		const id = load( h, src, { "charset": "AB", "margin": 1 } );
		const font = selected( h, id );
		assert.equal( font.image, src );
		assert.equal( font.atlasWidth, 16 );
		assert.equal( font.atlasHeight, 8 );
		assert.equal( font.cellWidth, 10 );
		assert.equal( font.cellHeight, 10 );
		assert.deepEqual( Array.from( font.charset ), [ 65, 66 ] );
		assert.equal( font.chars[ 66 ], 1 );
	}
	delete h.api.OffscreenCanvas;
	const id = load( h, new h.Canvas() );
	assert.equal( selected( h, id ).charset.length, 256 );
	assert.equal( h.counts.wait, 0 );
} );

for( const terminal of [ "onload", "onerror" ] ) {
	for( const synchronous of [ false, true ] ) {
		test( `SYS-022 ${terminal}, synchronous=${synchronous}, settles once`, () => {
			const h = createHarness();
			if( synchronous ) {
				if( terminal === "onload" ) { h.failures.syncLoad = true; }
				else { h.failures.syncError = true; }
			}
			assert.equal( load( h, "font.png" ), 0 );
			assert.deepEqual( available( h ), [ { "id": 0, "width": 8, "height": 8 } ] );
			const font = selected( h, 0 );
			const img = h.images[ 0 ];
			if( !synchronous ) {
				assert.equal( font.image, null );
				assert.equal( h.counts.done, 0 );
				img[ terminal ]();
			}
			img.saved.onload(); img.saved.onerror();
			assert.equal( img.onload, null );
			assert.equal( img.onerror, null );
			assert.equal( h.counts.wait, 1 );
			assert.equal( h.counts.done, 1 );
			if( terminal === "onload" ) {
				assert.equal( font.image, img );
				assert.equal( font.atlasWidth, 16 );
				assert.equal( font.atlasHeight, 8 );
				assert.deepEqual( h.counts.errors, [] );
			} else {
				assert.equal( font.image, null );
				assert.equal( selected( h, 0 ), font );
				h.api.setDefaultFont( { "fontId": 0 } );
				assert.deepEqual( h.counts.errors, [ "loadFont: Unable to load image for font." ] );
			}
		} );
	}
}

test( "SYS-022 source assignment throwing after synchronous completion still rejects publication",
	() => {
		const h = createHarness();
		Object.assign( h.failures, { "syncLoad": true, "src": true } );
		assert.throws( () => load( h, "failed.png" ), error => error === h.failures.error );
		assert.deepEqual( available( h ), [] );
		assert.equal( h.counts.wait, h.counts.done );
		assert.equal( load( h, new h.Canvas() ), 0 );
	} );

test( "SYS-022 nested direct-source setup keeps successfully published IDs unique", () => {
	const h = createHarness();
	const src = new h.Canvas();
	Object.defineProperty( src, "width", { "get": () => {
		assert.equal( load( h, new h.Canvas() ), 0 );
		return 16;
	} } );
	assert.equal( load( h, src ), 1 );
	assert.deepEqual( available( h ).map( font => font.id ), [ 0, 1 ] );
} );
