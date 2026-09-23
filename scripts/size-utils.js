/**
 * Pi.js Size Measurement Helpers
 *
 * Shared by the build report and the size report so both use the release gzip settings.
 */
import * as g_zlib from "node:zlib";

/** Gzip level used for every reported size. */
const GZIP_LEVEL = g_zlib.constants.Z_BEST_COMPRESSION;

/**
 * Returns the gzipped byte count of a buffer or string.
 *
 * @param {Buffer|Uint8Array|string} contents - Bundle contents
 * @returns {number} Gzipped size in bytes
 */
function gzipSize( contents ) {
	return g_zlib.gzipSync( contents, { "level": GZIP_LEVEL } ).length;
}

/**
 * Measures a bundle's minified and gzipped byte counts.
 *
 * @param {Buffer|Uint8Array|string} contents - Bundle contents
 * @returns {{ bytes: number, gzip: number }} Sizes in bytes
 */
function measureContents( contents ) {
	return {
		"bytes": Buffer.byteLength( contents ),
		"gzip": gzipSize( contents )
	};
}

/**
 * Formats a byte count as kilobytes with two decimals.
 *
 * @param {number} bytes - Byte count
 * @returns {string} Size such as "6.14 KB"
 */
function formatSize( bytes ) {
	return `${( bytes / 1024 ).toFixed( 2 )} KB`;
}

export { GZIP_LEVEL, formatSize, gzipSize, measureContents };
