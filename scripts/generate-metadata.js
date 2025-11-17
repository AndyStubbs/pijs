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
const METADATA_DIR = path.join( __dirname, "..", "metadata" );
const OUTPUT_DIR = path.join( __dirname, "..", "build", "metadata" );
const REFERENCE_FILE = path.join( OUTPUT_DIR, `reference-{VERSION}.json` );
const TYPE_DEFINITION_FILE = path.join( OUTPUT_DIR, "pi-{VERSION}.d.ts" );

// Generate metadata
generateMetadata();

function getVersionFolders() {
	if( !fs.existsSync( METADATA_DIR ) ) {
		return [];
	}
	const entries = fs.readdirSync( METADATA_DIR, { "withFileTypes": true } );
	return entries
		.filter( ( d ) => d.isDirectory() && /^pi-\d+\.\d+$/.test( d.name ) )
		.map( ( d ) => d.name );
}

function ensureDirectories() {
	if( !fs.existsSync( METADATA_DIR ) ) {
		console.error( `✗ Metadata directory not found: ${METADATA_DIR}` );
		process.exit( 1 );
	}

	if( !fs.existsSync( OUTPUT_DIR ) ) {
		fs.mkdirSync( OUTPUT_DIR, { "recursive": true } );
	}
}

function listTomlFilesInDir( dir ) {
	if( !fs.existsSync( dir ) ) return [];
	return fs.readdirSync( dir )
		.filter( ( file ) => file.endsWith( ".toml" ) )
		.sort();
}

function normalizeMultiline( value ) {
	return typeof value === "string" ? value.trim() : "";
}

function formatParameters( parameters = [] ) {
	if( !Array.isArray( parameters ) ) {
		return [];
	}
	return parameters.map( ( parameter ) => ( {
		"name": parameter.name,
		"type": parameter.type || "",
		"description": parameter.description ? parameter.description.trim() : "",
		"optional": Boolean( parameter.optional )
	} ) );
}

function formatReturns( returns = [] ) {
	if( !Array.isArray( returns ) ) {
		return [];
	}
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

function buildTypeDefinitions( version, screenMethods, apiMethods ) {
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
	lines.push( `\t\treadonly version: "pi-${version}";` );
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

function generateMetadata() {
	ensureDirectories();

	const versionFolders = getVersionFolders();

	// Early exit if no folders found
	if( versionFolders.length === 0 ) {
		console.log( "No metadata folders found" );
		return;
	}

	const methodNameToMetadata = new Map();

	// Layer versions from oldest to target
	for( const folderName of versionFolders ) {
		const dirPath = path.join( METADATA_DIR, folderName );

		// Handle removals first
		const removedPath = path.join( dirPath, "_removed.toml" );
		if( fs.existsSync( removedPath ) ) {
			const removedData = parseMetadataFile( removedPath );
			const removedMethods = removedData.methods;
			for( const method of removedMethods ) {
				methodNameToMetadata.delete( method );
			}
		}

		// Apply overrides and additions
		const tomlFiles = listTomlFilesInDir( dirPath ).filter(
			( f ) => f.toLowerCase() !== "_removed.toml"
		);
		for( const fileName of tomlFiles ) {
			const filePath = path.join( dirPath, fileName );
			const metadata = parseMetadataFile( filePath );
			const methodName = metadata.title || path.basename( fileName, ".toml" );
			methodNameToMetadata.set( methodName, buildReferenceEntry( methodName, metadata ) );
		}

		// Write output for current version
		const version = folderName.substring( folderName.indexOf( "-" ) + 1 );
		writeOutputFiles( version, methodNameToMetadata );
	}
}

function writeOutputFiles( version, methodNameToMetadata ) {
	const referenceMethods = Array.from( methodNameToMetadata.values() ).sort(
		( a, b ) => a.name.localeCompare( b.name )
	);
	const screenMethods = referenceMethods.filter( ( m ) => m.isScreen );
	const apiMethods = referenceMethods.filter( ( m ) => !m.isScreen );

	writeReferenceOutput( version, { "methods": referenceMethods } );
	writeTypeDefinitions( version, buildTypeDefinitions( version, screenMethods, apiMethods ) );
}

function writeReferenceOutput( version, data ) {
	const filePath = REFERENCE_FILE.replace( "{VERSION}", version );
	const payload = {
		"version": version,
		"generatedAt": new Date().toISOString(),
		...data
	};

	fs.writeFileSync(
		filePath,
		`${JSON.stringify( payload, null, "\t" )}\n`,
		"utf8"
	);
	console.log( "✓ Generated reference metadata:", filePath );
}

function writeTypeDefinitions( version, lines ) {
	const filePath = TYPE_DEFINITION_FILE.replace( "{VERSION}", version );
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
	console.log( "✓ Generated type definitions:", filePath );
}
