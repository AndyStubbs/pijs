/**
 * Pi.js Generated Metadata Validation Script
 *
 * Verifies that generated reference JSON is valid and contains no carriage returns.
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	return g_url.pathToFileURL( g_path.resolve( entry ) ).href === import.meta.url;
}
const fs = g_fs;
const path = g_path;

const BUILD_DIR = path.join( DIRNAME, "..", "build" );

/**
 * Finds a carriage return in any string nested in a metadata value.
 *
 * @param {*} value - Metadata value to inspect.
 * @param {string} location - JSON-style location of the value.
 * @returns {string} Location of the first carriage return, or an empty string.
 */
function findCarriageReturn( value, location = "$" ) {
	if( typeof value === "string" ) {
		return value.includes( "\r" ) ? location : "";
	}

	if( Array.isArray( value ) ) {
		for( let index = 0; index < value.length; index += 1 ) {
			const result = findCarriageReturn( value[ index ], `${location}[${index}]` );
			if( result ) return result;
		}
		return "";
	}

	if( value && typeof value === "object" ) {
		for( const [ key, item ] of Object.entries( value ) ) {
			const result = findCarriageReturn( item, `${location}.${key}` );
			if( result ) return result;
		}
	}

	return "";
}

/**
 * Validates all generated reference JSON files.
 *
 * @returns {void}
 */
function validateMetadataOutput() {
	const files = fs.readdirSync( BUILD_DIR )
		.filter( ( file ) => /^reference-\d+\.\d+\.json$/.test( file ) )
		.sort();

	if( files.length === 0 ) {
		throw new Error( `No generated reference JSON files found in ${BUILD_DIR}.` );
	}

	for( const file of files ) {
		const filePath = path.join( BUILD_DIR, file );
		const raw = fs.readFileSync( filePath, "utf8" );
		const data = JSON.parse( raw );
		const carriageReturnLocation = findCarriageReturn( data );

		if( raw.includes( "\r" ) ) {
			throw new Error( `${file} contains a physical carriage return.` );
		}
		if( raw.includes( "\\r" ) ) {
			throw new Error( `${file} contains a serialized carriage return escape.` );
		}
		if( carriageReturnLocation ) {
			throw new Error(
				`${file} contains a carriage return at ${carriageReturnLocation}.`
			);
		}
	}

	console.log( `✓ Validated ${files.length} reference metadata files without carriage returns.` );
}

if( isMainModule() ) {
	try {
		validateMetadataOutput();
	} catch( error ) {
		console.error( `✗ Metadata validation failed: ${error.message}` );
		process.exit( 1 );
	}
}

export { findCarriageReturn, validateMetadataOutput };
