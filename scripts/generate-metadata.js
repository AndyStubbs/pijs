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
const REFERENCE_FILE = path.join( OUTPUT_DIR, "reference.json" );
const MONACO_FILE = path.join( OUTPUT_DIR, "monaco.json" );

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

function buildSignature( name, parameters ) {
	if( parameters.length === 0 ) {
		return `${name}()`;
	}

	const parts = parameters.map( ( parameter ) => {
		return parameter.optional ? `[${parameter.name}]` : parameter.name;
	} );

	return `${name}( ${parts.join( ", " )} )`;
}

function buildSnippet( name, parameters ) {
	if( parameters.length === 0 ) {
		return `${name}()`;
	}

	const parts = parameters.map( ( parameter, index ) => {
		const placeholder = parameter.optional ? `[${parameter.name}]` : parameter.name;
		return `\${${index + 1}:${placeholder}}`;
	} );

	return `${name}( ${parts.join( ", " )} )`;
}

function buildDocumentation( summary, description, example ) {
	const sections = [];

	if( summary ) {
		sections.push( summary.trim() );
	}

	if( description ) {
		sections.push( description.trim() );
	}

	if( example ) {
		sections.push( `Example:\n${example.trim()}` );
	}

	return sections.join( "\n\n" );
}

function parseMetadataFile( filePath ) {
	const raw = fs.readFileSync( filePath, "utf8" );
	return toml.parse( raw );
}

function buildReferenceEntry( methodName, fileName, metadata ) {
	const parameters = formatParameters( metadata.parameters );
	const returns = formatReturns( metadata.returns );

	return {
		"name": methodName,
		"category": metadata.category || "",
		"isScreen": Boolean( metadata.isScreen ),
		"summary": metadata.summary || "",
		"description": normalizeMultiline( metadata.description ),
		"parameters": parameters,
		"returns": returns,
		"example": normalizeMultiline( metadata.example ),
		"source": `metadata/methods/${fileName}`
	};
}

function buildMonacoEntry( methodName, metadata ) {
	const parameters = formatParameters( metadata.parameters );
	const snippet = buildSnippet( methodName, parameters );
	const signature = buildSignature( methodName, parameters );
	const documentation = buildDocumentation(
		metadata.summary,
		metadata.description,
		metadata.example
	);

	return {
		"name": methodName,
		"label": methodName,
		"kind": "function",
		"category": metadata.category || "",
		"insertText": snippet,
		"signature": signature,
		"detail": metadata.summary || signature,
		"documentation": documentation,
		"parameters": parameters
	};
}

function writeOutput( filePath, data ) {
	const payload = {
		"generatedAt": new Date().toISOString(),
		...data
	};

	fs.writeFileSync(
		filePath,
		`${JSON.stringify( payload, null, "\t" )}\n`,
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
	const monacoCompletions = [];

	for( const fileName of files ) {
		const methodPath = path.join( METADATA_DIR, fileName );
		const metadata = parseMetadataFile( methodPath );
		const methodName = metadata.title || path.basename( fileName, ".toml" );

		referenceMethods.push( buildReferenceEntry( methodName, fileName, metadata ) );
		monacoCompletions.push( buildMonacoEntry( methodName, metadata ) );
	}

	writeOutput( REFERENCE_FILE, { "methods": referenceMethods } );
	writeOutput( MONACO_FILE, { "completions": monacoCompletions } );

	console.log( "✓ Generated reference metadata:", REFERENCE_FILE );
	console.log( "✓ Generated Monaco metadata:", MONACO_FILE );
}

generateMetadata();


