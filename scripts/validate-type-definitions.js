/**
 * Pi.js Type Definition Validation Script
 *
 * Checks release-critical Pi.js 2.1 declarations and ensures the build and
 * documentation copies remain identical.
 */

"use strict";

const fs = require( "fs" );
const path = require( "path" );
const packageJson = require( path.join( __dirname, "..", "package.json" ) );

const BUILD_TYPE_FILE = path.join( __dirname, "..", "build", "pi.d.ts" );
const DOCS_TYPE_FILE = path.join( __dirname, "..", "docs", "llms", "pi.d.ts" );

const REQUIRED_DECLARATIONS = [
	{
		"name": "shader uniform map type",
		"text": "type ShaderUniforms = Record<string, ShaderUniformValue>;"
	},
	{
		"name": "createShader object overload return type",
		"text": "createShader( params: { \"fragmentSource\": string; " +
			"\"uniforms\"?: ShaderUniforms } ): number;"
	},
	{
		"name": "createShader positional overload return type",
		"text": "createShader( fragmentSource: string, uniforms?: ShaderUniforms ): number;"
	},
	{
		"name": "viewToScreen return type",
		"text": "viewToScreen( x: number, y: number ): PositionPx;"
	},
	{
		"name": "screenToView return type",
		"text": "screenToView( x: number, y: number ): PositionPx;"
	},
	{
		"name": "width return type",
		"text": "width(): number;"
	},
	{
		"name": "height return type",
		"text": "height(): number;"
	},
	{
		"name": "screen object overload parent and return type",
		"text": "screen( params: { \"aspect\": string; " +
			"\"container\"?: string | HTMLElement; \"isOffscreen\"?: boolean; " +
			"\"resizeCallback\"?: ( screenApi: Screen, fromSize: Size, " +
			"toSize: Size ) => void; \"parent\"?: number | Screen } ): Screen;"
	},
	{
		"name": "screen positional overload parent and return type",
		"text": "screen( aspect: string, container?: string | HTMLElement, " +
			"isOffscreen?: boolean, resizeCallback?: ( screenApi: Screen, " +
			"fromSize: Size, toSize: Size ) => void, parent?: number | Screen ): Screen;"
	}
];

/**
 * Reads a required declaration file.
 *
 * @param {string} filePath - Declaration file path.
 * @returns {string} Declaration file contents.
 */
function readTypeFile( filePath ) {
	if( !fs.existsSync( filePath ) ) {
		throw new Error( `Missing type definition file: ${filePath}` );
	}
	return fs.readFileSync( filePath, "utf8" );
}

/**
 * Validates generated declaration parity and release-critical Pi.js 2.1 signatures.
 *
 * @returns {void}
 */
function validateTypeDefinitions() {
	const buildTypes = readTypeFile( BUILD_TYPE_FILE );
	const docsTypes = readTypeFile( DOCS_TYPE_FILE );

	if( buildTypes !== docsTypes ) {
		throw new Error( "build/pi.d.ts and docs/llms/pi.d.ts are not identical." );
	}

	const expectedVersion = `Version: pi-${packageJson.majorVersion}`;
	if( !buildTypes.includes( expectedVersion ) ) {
		throw new Error( `Type definitions do not contain ${expectedVersion}.` );
	}

	for( const declaration of REQUIRED_DECLARATIONS ) {
		if( !buildTypes.includes( declaration.text ) ) {
			throw new Error( `Missing or incorrect ${declaration.name}.` );
		}
	}

	console.log( "✓ Type definitions are current and contain the required Pi.js 2.1 APIs." );
}

if( require.main === module ) {
	try {
		validateTypeDefinitions();
	} catch( error ) {
		console.error( `✗ Type definition validation failed: ${error.message}` );
		process.exit( 1 );
	}
}

module.exports = { validateTypeDefinitions };
