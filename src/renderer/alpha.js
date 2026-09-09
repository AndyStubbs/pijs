/**
 * Pi.js - Alpha Conversion Helpers
 *
 * GPU buffers use premultiplied RGBA8; JavaScript colors use straight RGBA8.
 * @module renderer/alpha
 */

"use strict";

/**
 * Copy straight RGBA8 bytes into a premultiplied upload buffer.
 * @param {Uint8Array|Uint8ClampedArray} pixels - Straight RGBA bytes
 * @returns {Uint8Array} Premultiplied copy; the input is unchanged
 */
export function premultiplyPixels( pixels ) {
	const result = new Uint8Array( pixels.length );
	for( let i = 0; i < pixels.length; i += 4 ) {
		const alpha = pixels[ i + 3 ];
		for( let channel = 0; channel < 3; channel += 1 ) {
			result[ i + channel ] = Math.round( pixels[ i + channel ] * alpha / 255 );
		}
		result[ i + 3 ] = alpha;
	}
	return result;
}

/**
 * Convert a readback buffer to straight RGBA8 in place.
 * Fully transparent pixels have zero RGB. Low-alpha RGB is quantized by RGBA8 storage.
 * @param {Uint8Array|Uint8ClampedArray} pixels - Premultiplied RGBA bytes
 * @returns {Uint8Array|Uint8ClampedArray} The converted input buffer
 */
export function unpremultiplyPixels( pixels ) {
	for( let i = 0; i < pixels.length; i += 4 ) {
		const alpha = pixels[ i + 3 ];
		for( let channel = 0; channel < 3; channel += 1 ) {
			if( alpha === 0 ) {
				pixels[ i + channel ] = 0;
			} else {
				pixels[ i + channel ] = Math.min(
					255, Math.round( pixels[ i + channel ] * 255 / alpha )
				);
			}
		}
	}
	return pixels;
}
