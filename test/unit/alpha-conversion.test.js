/**
 * SYS-006 RGBA8 boundary conversion tests, including irreversible low-alpha quantization.
 */
const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );
const context = vm.createContext( { "Uint8Array": Uint8Array } );
vm.runInContext( fs.readFileSync( path.join( __dirname, "../../src/renderer/alpha.js" ), "utf8" )
	.replace( /export /g, "" ), context );

test( "SYS-006 premultiplication rounds bytes and preserves the caller buffer", () => {
	const input = new Uint8Array( [ 255, 127, 64, 128, 255, 127, 64, 0, 255, 127, 64, 255 ] );
	const saved = input.slice();
	assert.deepEqual( Array.from( context.premultiplyPixels( input ) ),
		[ 128, 64, 32, 128, 0, 0, 0, 0, 255, 127, 64, 255 ] );
	assert.deepEqual( input, saved );
} );

test( "SYS-006 readback rounds, clamps, and canonicalizes transparent RGB", () => {
	const input = new Uint8Array( [ 64, 32, 255, 128, 255, 127, 64, 0, 1, 0, 1, 1 ] );
	assert.equal( context.unpremultiplyPixels( input ), input );
	assert.deepEqual( Array.from( input ),
		[ 128, 64, 255, 128, 0, 0, 0, 0, 255, 0, 255, 1 ] );
} );

test( "SYS-006 straight readback can be reuploaded without changing valid stored bytes", () => {
	for( let alpha = 0; alpha <= 255; alpha += 1 ) {
		for( let value = 0; value <= alpha; value += 1 ) {
			const stored = new Uint8Array( [ value, value, value, alpha ] );
			const straight = context.unpremultiplyPixels( stored.slice() );
			assert.deepEqual( context.premultiplyPixels( straight ), stored );
		}
	}
} );
