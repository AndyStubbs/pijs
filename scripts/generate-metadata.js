/**
 * Pi.js Metadata Generation Script
 *
 * Parses TOML metadata files and generates two JSON outputs:
 * 1. Reference data for documentation tooling.
 * 2. Monaco completion data for the online editor.
 */

"use strict";

const fs = require( "fs" );
const path = require( "path" );
const toml = require( "@iarna/toml" );
const pkg = require( "../package.json" );

const METADATA_DIR = path.join( __dirname, "..", "metadata" );
const OUTPUT_DIR = path.join( __dirname, "..", "build", "metadata" );
const REFERENCE_FILE = path.join( OUTPUT_DIR, "reference.json" );
const TYPE_DEFINITION_FILE = path.join( OUTPUT_DIR, "pi.d.ts" );
const PI_VERSION = pkg.version;

function ensureDirectories() {
	if( !fs.existsSync( METADATA_DIR ) ) {
		console.error( `✗ Metadata directory not found: ${METADATA_DIR}` );
		process.exit( 1 );
	}

	if( !fs.existsSync( OUTPUT_DIR ) ) {
		fs.mkdirSync( OUTPUT_DIR, { "recursive": true } );
	}
}

function loadMethodFiles() {
	return fs.readdirSync( METADATA_DIR )
		.filter( ( file ) => file.endsWith( ".toml" ) )
		.sort();
}

function normalizeMultiline( value ) {
	return typeof value === "string" ? value.trim() : "";
}

function formatParameters( parameters = [] ) {
	return parameters.map( ( parameter ) => ( {
		"name": parameter.name,
		"type": parameter.type || "",
		"description": parameter.description ? parameter.description.trim() : "",
		"optional": Boolean( parameter.optional )
	} ) );
}

function formatReturns( returns = [] ) {
	return returns.map( ( returnValue ) => ( {
		"type": returnValue.type || "",
		"description": returnValue.description ? returnValue.description.trim() : ""
	} ) );
}

function extractExample( metadata ) {
	if( typeof metadata.example === "string" ) {
		return metadata.example;
	}

	if( Array.isArray( metadata.returns ) ) {
		for( const returnValue of metadata.returns ) {
			if( typeof returnValue.example === "string" ) {
				return returnValue.example;
			}
		}
	}

	return "";
}

function parseMetadataFile( filePath ) {
	const raw = fs.readFileSync( filePath, "utf8" );
	return toml.parse( raw );
}

function buildReferenceEntry( methodName, metadata ) {
	const parameters = formatParameters( metadata.parameters );
	const returns = formatReturns( metadata.returns );
	const example = normalizeMultiline( extractExample( metadata ) );

	return {
		"name": methodName,
		"category": metadata.category || "",
		"isScreen": Boolean( metadata.isScreen ),
		"summary": metadata.summary || "",
		"description": normalizeMultiline( metadata.description ),
		"parameters": parameters,
		"returns": returns,
		"example": example
	};
}

function formatTypeScriptType( rawType, fallback = "any" ) {
	if( !rawType ) {
		return fallback;
	}

	const parts = rawType.split( "|" ).map( part => part.trim() ).filter( Boolean );
	if( parts.length === 0 ) {
		return fallback;
	}

	const normalized = parts.map( ( part ) => {
		switch( part.toLowerCase() ) {
			case "number":
			case "string":
			case "boolean":
			case "void":
			case "any":
				return part.toLowerCase();
			case "string[]":
			case "number[]":
			case "boolean[]":
			case "array":
				return "any[]";
			default:
				return part;
		}
	} );

	return normalized.join( " | " );
}

function buildMethodSignature( method ) {
	const params = ( method.parameters || [] ).map( ( parameter ) => {
		const optionalFlag = parameter.optional ? "?" : "";
		const paramType = formatTypeScriptType( parameter.type, "any" );
		return `${parameter.name}${optionalFlag}: ${paramType}`;
	} );

	const returnType = formatTypeScriptType(
		method.returns?.[ 0 ]?.type || "void",
		"void"
	);

	if( params.length === 0 ) {
		return `${method.name}(): ${returnType};`;
	}

	return `${method.name}( ${params.join( ", " )} ): ${returnType};`;
}

function buildDocCommentLines( method ) {
	const lines = [ "/**" ];
	const summary = ( method.summary || "" ).trim();
	const description = ( method.description || "" ).trim();
	const parameters = method.parameters || [];

	if( summary ) {
		summary.split( /\r?\n/ ).forEach( ( line ) => lines.push( ` * ${line}`.trimEnd() ) );
	}

	if( summary && description ) {
		lines.push( " *" );
	}

	if( description ) {
		description.split( /\r?\n/ ).forEach( ( line ) => lines.push( ` * ${line}`.trimEnd() ) );
	}

	parameters.forEach( ( parameter ) => {
		if( parameter.description ) {
			lines.push( ` * @param ${parameter.name} ${parameter.description}`.trimEnd() );
		}
	} );

	const returnInfo = method.returns?.[ 0 ] || {};
	const returnDescription = returnInfo.description ? returnInfo.description.trim() : "";
	const returnTypeName = ( returnInfo.type || "void" ).trim();
	const shouldDocumentReturn = Boolean( returnDescription ) ||
		( returnTypeName.toLowerCase() !== "void" );

	if( shouldDocumentReturn ) {
		const fallback = returnTypeName
			? `Returns ${returnTypeName}.`
			: "Returns a value.";
		lines.push( ` * @returns ${returnDescription || fallback}`.trimEnd() );
	}

	lines.push( " */" );
	return lines;
}

function buildInterfaceMethods( lines, methods ) {
	methods.forEach( ( method, index ) => {
		if( index > 0 ) {
			lines.push( "" );
		}

		const docLines = buildDocCommentLines( method );
		docLines.forEach( ( line ) => lines.push( `\t\t${line}` ) );
		lines.push( `\t\t${buildMethodSignature( method )}` );
	} );
}

function buildTypeDefinitions( screenMethods, apiMethods ) {
	const lines = [];

	lines.push( "declare namespace Pi {" );
	lines.push( "\tinterface Screen {" );
	buildInterfaceMethods( lines, screenMethods );
	lines.push( "\t}" );
	lines.push( "" );
	lines.push( "\tinterface API extends Screen {" );
	buildInterfaceMethods( lines, apiMethods );
	if( apiMethods.length > 0 ) {
		lines.push( "" );
	}
	lines.push( "\t\t/**" );
	lines.push( "\t\t * Current Pi.js version string." );
	lines.push( "\t\t */" );
	lines.push( `\t\treadonly version: "${PI_VERSION}";` );
	lines.push( "\t}" );
	lines.push( "}" );
	lines.push( "" );
	lines.push( "declare const Pi: Pi.API;" );
	lines.push( "declare const $: Pi.API;" );
	lines.push( "" );
	lines.push( "export { Pi, $ };" );
	lines.push( "export default Pi;" );

	return lines;
}

function writeOutput( filePath, data ) {
	const payload = {
		"version": PI_VERSION,
		"generatedAt": new Date().toISOString(),
		...data
	};

	fs.writeFileSync(
		filePath,
		`${JSON.stringify( payload, null, "\t" )}\n`,
		"utf8"
	);
}

function writeTypeDefinitions( filePath, lines ) {
	const header = [
		"/**",
		" * Pi.js Type Definitions",
		` * Generated on ${new Date().toISOString()}`,
		" */",
		""
	].join( "\n" );

	fs.writeFileSync(
		filePath,
		`${header}${lines.join( "\n" )}\n`,
		"utf8"
	);
}

function generateMetadata() {
	ensureDirectories();

	const files = loadMethodFiles();
	if( files.length === 0 ) {
		console.warn( "⚠️ No method metadata files found." );
		return;
	}

	const referenceMethods = [];
	const screenMethods = [];
	const apiMethods = [];

	for( const fileName of files ) {
		const methodPath = path.join( METADATA_DIR, fileName );
		const metadata = parseMetadataFile( methodPath );
		const methodName = metadata.title || path.basename( fileName, ".toml" );

		const methodEntry = buildReferenceEntry( methodName, metadata );
		referenceMethods.push( methodEntry );

		if( methodEntry.isScreen ) {
			screenMethods.push( methodEntry );
		} else {
			apiMethods.push( methodEntry );
		}
	}

	writeOutput( REFERENCE_FILE, { "methods": referenceMethods } );
	writeTypeDefinitions(
		TYPE_DEFINITION_FILE,
		buildTypeDefinitions( screenMethods, apiMethods )
	);

	console.log( "✓ Generated reference metadata:", REFERENCE_FILE );
	console.log( "✓ Generated type definitions:", TYPE_DEFINITION_FILE );
}

generateMetadata();
