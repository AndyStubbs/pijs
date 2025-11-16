/**
 * Pi.js TOML Metadata Migrator
 *
 * Converts legacy TOML files in a version folder (e.g., metadata/pi-1.2)
 * into the new standardized schema used by the docs generator.
 *
 * Heuristics:
 * - Detects "legacy" files by absence of "title".
 * - Maps:
 *   - title = name
 *   - summary = description (legacy single-line)
 *   - description = "" (no extra copy; source is often short)
 *   - category, isScreen preserved when present
 *   - parameters from legacy parameters[] + pdata[]; marks optional if text contains "[OPTIONAL]"
 *   - parameter type = "any" (cannot infer safely)
 *   - returns:
 *     - if legacy "returns" is a string → returns[0].description = that string, type = "void"
 *     - otherwise defaults to void with standard description
 *   - example preserved when present
 *
 * Usage:
 *   node scripts/migrate-version.js pi-1.2
 */

"use strict";

const fs = require( "fs" );
const path = require( "path" );
const toml = require( "@iarna/toml" );

const METADATA_ROOT = path.join( __dirname, "..", "metadata" );

function isLegacyToml( obj ) {
	return obj && typeof obj === "object" && !Object.prototype.hasOwnProperty.call( obj, "title" );
}

function toNewSchema( legacy ) {
	const out = {};

	out.title = legacy.name || "";
	if( legacy.category != null ) {
		out.category = String( legacy.category );
	}
	if( legacy.isScreen != null ) {
		out.isScreen = Boolean( legacy.isScreen );
	}

	const legacyDesc = typeof legacy.description === "string" ? legacy.description.trim() : "";
	out.summary = legacyDesc || "";
	out.description = "";

	// Parameters
	out.parameters = [];
	const legacyParams = Array.isArray( legacy.parameters ) ? legacy.parameters : [];
	const legacyPdata = Array.isArray( legacy.pdata ) ? legacy.pdata : [];

	for( let i = 0; i < legacyParams.length; i++ ) {
		const name = String( legacyParams[ i ] );
		const desc = typeof legacyPdata[ i ] === "string" ? legacyPdata[ i ].trim() : "";
		const optional = /\[optional\]/i.test( desc );
		out.parameters.push( {
			"name": name,
			"type": "any",
			"description": desc.replace( /\[optional\]\s*/i, "" ),
			...( optional ? { "optional": true } : {} )
		} );
	}

	// Returns
	const returns = [];
	if( typeof legacy.returns === "string" && legacy.returns.trim().length > 0 ) {
		returns.push( {
			"type": "void",
			"description": legacy.returns.trim()
		} );
	} else {
		returns.push( {
			"type": "void",
			"description": "This function does not return a value."
		} );
	}
	out.returns = returns;

	// Example
	if( typeof legacy.example === "string" ) {
		out.example = legacy.example;
	}

	return out;
}

function migrateFolder( versionFolder ) {
	const dir = path.isAbsolute( versionFolder )
		? versionFolder
		: path.join( METADATA_ROOT, versionFolder );

	if( !fs.existsSync( dir ) ) {
		console.error( `✗ Version metadata folder not found: ${dir}` );
		process.exit( 1 );
	}

	const files = fs.readdirSync( dir ).filter( ( f ) => f.endsWith( ".toml" ) );
	let migratedCount = 0;
	for( const file of files ) {
		const fullPath = path.join( dir, file );
		const raw = fs.readFileSync( fullPath, "utf8" );
		let obj;
		try {
			obj = toml.parse( raw );
		} catch( e ) {
			console.warn( `  ⚠️ Skipping (parse error): ${file}: ${e.message}` );
			continue;
		}

		if( !isLegacyToml( obj ) ) {
			continue;
		}

		const migrated = toNewSchema( obj );
		// Preserve newline ending
		const serialized = toml.stringify( migrated );
		fs.writeFileSync( fullPath, serialized, "utf8" );
		migratedCount++;
	}

	console.log( `✓ Migrated ${migratedCount} file(s) in ${versionFolder}` );
}

function main() {
	const folderArg = process.argv[ 2 ];
	if( !folderArg ) {
		console.error( "Usage: node scripts/migrate-version.js <pi-<major.minor>>" );
		process.exit( 1 );
	}
	migrateFolder( folderArg );
}

main();


