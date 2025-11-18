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
	return parameters.map( ( parameter ) => {
		return {
			"name": parameter.name,
			"type": parameter.type || "",
			"typeDesc": getTypeDesc( parameter.type ),
			"signature": parameter.signature || "",
			"description": parameter.description ? parameter.description.trim() : "",
			"optional": Boolean( parameter.optional )
		};
	} );
}

function getTypeDesc( type ) {
	let typeDesc = type;
	if( type.includes( "Promise" ) ) {
		typeDesc = "*Promise";
	} else if( type.includes( "Array" ) ) {
		typeDesc = "*Array";
	}
	if( type.includes( "|" ) ) {
		const parts = type.split( "|" );
		let startsWithArray = true;
		let startsWithPromise = true;
		let startsWithHTML = true;
		for( const part of parts ) {
			if( part !== "" ) {
				if( startsWithArray ) {
					startsWithArray = part.startsWith( "Array" );
				}
				if( startsWithPromise ) {
					startsWithPromise = part.startsWith( "Promise" );
				}
				if( startsWithHTML ) {
					startsWithHTML = part.startsWith( "HTML" );
				}
			}
		}
		if( startsWithArray ) {
			typeDesc = "*Array";
		} else if( startsWithPromise ) {
			typeDesc = "*Promise";
		} else if( startsWithHTML ) {
			typeDesc = "*HTMLElement";
		} else if( type.length > 20 ) {
			typeDesc = "*Many";
		}
	}
	return typeDesc;
}

function formatReturns( returns = [] ) {
	if( !Array.isArray( returns ) ) {
		return [];
	}
	return returns.map( ( returnValue ) => {
		return {
			"type": returnValue.type || "",
			"typeDesc": getTypeDesc( returnValue.type ),
			"description": returnValue.description ? returnValue.description.trim() : ""
		};
	} );
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

function buildMethodReferenceEntry( name, metadata ) {
	const parameters = formatParameters( metadata.parameters );
	const returns = formatReturns( metadata.returns );
	const example = normalizeMultiline( extractExample( metadata ) );

	return {
		"name": name,
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
	const returnType = formatTypeScriptType(
		method.returns?.[ 0 ]?.type || "void",
		"void"
	);

	const parameters = method.parameters || [];
	const signatures = [];

	// Generate object literal overload if there are parameters
	if( parameters.length > 0 ) {

		// Build object literal type with all parameters as optional properties
		const objectProperties = parameters.map( ( parameter ) => {

			// Use signature if available for function types
			let paramType;
			if( parameter.type === "function" && parameter.signature ) {
				paramType = parameter.signature;
			} else {
				paramType = formatTypeScriptType( parameter.type, "any" );
			}
			if( parameter.optional ) {
				return `"${parameter.name}"?: ${paramType}`;
			} else {
				return `"${parameter.name}": ${paramType}`;
			}
		} );
		const objectType = `{ ${objectProperties.join( "; " )} }`;
		signatures.push( `${method.name}( params: ${objectType} ): ${returnType};` );
	}

	// Generate positional parameters signature
	// Make sure that optional parameters never come before a non-optional parameter
	let isNonOptionalAfter = false;
	for( let i = parameters.length - 1; i >= 0; i -= 1 ) {
		if( !parameters[ i ].optional ) {
			isNonOptionalAfter = true;
		}
		parameters[ i ].isNonOptionalAfter = isNonOptionalAfter;
	}
	const params = parameters.map( ( parameter ) => {
		// Use signature if available for function types
		let paramType;
		if( parameter.type === "function" && parameter.signature ) {
			paramType = parameter.signature;
		} else {
			paramType = formatTypeScriptType( parameter.type, "any" );
		}
		
		if( parameter.optional ) {
			if( parameter.isNonOptionalAfter ) {
				return `${parameter.name}: ${paramType} | undefined`;
			}
			return `${parameter.name}?: ${paramType}`;
		}
		return `${parameter.name}: ${paramType}`;
	} );

	if( params.length === 0 ) {
		signatures.push( `${method.name}(): ${returnType};` );
	} else {
		signatures.push( `${method.name}( ${params.join( ", " )} ): ${returnType};` );
	}

	return signatures;
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
		
		const signatures = buildMethodSignature( method );
		signatures.forEach( ( signature ) => {
			lines.push( `\t\t${signature}` );
		} );
	} );
}

function formatObjectPropertyType( property ) {
	if( property.type === "function" && property.signature ) {
		return property.signature;
	}
	return formatTypeScriptType( property.type, "any" );
}

function buildOptionsObject( setMethods ) {
	const properties = [];
	
	for( const method of setMethods ) {
		const methodName = method.name;
		if( methodName === "set" ) {
			continue;
		}
		
		// Remove "set" prefix and lowercase first letter
		const optionName = methodName.substring( 3 );
		const lowercasedName = optionName.charAt( 0 ).toLowerCase() + optionName.slice( 1 );
		
		const parameters = method.parameters || [];
		
		// Determine the property type
		// For Options, we use the first parameter's type, or create an object type
		// if there are multiple required parameters
		let propType;
		if( parameters.length === 0 ) {
			// No parameters, use any
			propType = "any";
		} else if( parameters.length === 1 ) {
			// Single parameter - use its type directly
			const param = parameters[ 0 ];
			if( param.type === "function" && param.signature ) {
				propType = param.signature;
			} else {
				propType = formatTypeScriptType( param.type, "any" );
			}
		} else {
			// Multiple parameters - check if first is required and others are optional
			const firstParam = parameters[ 0 ];
			const allOthersOptional = parameters.slice( 1 ).every( ( p ) => p.optional );
			
			if( !firstParam.optional && allOthersOptional ) {
				// First parameter is required, others are optional - use first parameter's type
				if( firstParam.type === "function" && firstParam.signature ) {
					propType = firstParam.signature;
				} else {
					propType = formatTypeScriptType( firstParam.type, "any" );
				}
			} else {
				// Multiple required parameters or all optional - create object type
				const objectProperties = parameters.map( ( param ) => {
					let paramType;
					if( param.type === "function" && param.signature ) {
						paramType = param.signature;
					} else {
						paramType = formatTypeScriptType( param.type, "any" );
					}
					if( param.optional ) {
						return `"${param.name}"?: ${paramType}`;
					} else {
						return `"${param.name}": ${paramType}`;
					}
				} );
				propType = `{ ${objectProperties.join( "; " )} }`;
			}
		}
		
		// All options properties are optional
		properties.push( {
			"name": lowercasedName,
			"type": propType,
			"description": method.summary || method.description || `Option for ${methodName} command.`,
			"optional": true
		} );
	}
	
	// Sort properties by name
	properties.sort( ( a, b ) => a.name.localeCompare( b.name ) );
	
	return {
		"title": "Options",
		"summary": "Settings object for the set() command.",
		"description": `Options object used with the set() command to apply multiple settings in a single call. Any command registered as a "setX" command is available as an option with the lowercased name (e.g., setColor => { "color": ... }).`,
		"properties": properties
	};
}

function buildObjectInterface( objectData ) {
	const lines = [];
	const title = objectData.title || "";
	const summary = ( objectData.summary || "" ).trim();
	const description = ( objectData.description || "" ).trim();
	const properties = objectData.properties || [];

	// JSDoc comment
	lines.push( "\t/**" );
	if( summary ) {
		summary.split( /\r?\n/ ).forEach( ( line ) => {
			lines.push( `\t * ${line}`.trimEnd() );
		} );
	}
	if( summary && description ) {
		lines.push( "\t *" );
	}
	if( description ) {
		description.split( /\r?\n/ ).forEach( ( line ) => {
			lines.push( `\t * ${line}`.trimEnd() );
		} );
	}
	lines.push( "\t */" );

	// Interface declaration
	lines.push( `\tinterface ${title} {` );

	// Properties
	properties.forEach( ( property, index ) => {
		if( index > 0 ) {
			lines.push( "" );
		}

		const propName = property.name || "";
		const propType = formatObjectPropertyType( property );
		const propDescription = ( property.description || "" ).trim();
		const isOptional = Boolean( property.optional );
		const isReadonly = property.type === "object" && property.name === "utils";

		// Property JSDoc
		if( propDescription ) {
			lines.push( "\t\t/**" );
			propDescription.split( /\r?\n/ ).forEach( ( line ) => {
				lines.push( `\t\t * ${line}`.trimEnd() );
			} );
			lines.push( "\t\t */" );
		}

		// Property declaration
		const readonlyPrefix = isReadonly ? "readonly " : "";
		const optionalSuffix = isOptional ? "?" : "";
		lines.push( `\t\t${readonlyPrefix}${propName}${optionalSuffix}: ${propType};` );
	} );

	lines.push( "\t}" );
	return lines;
}

function buildObjectInterfaces( objects ) {
	const lines = [];
	objects.forEach( ( objectData, index ) => {
		if( index > 0 ) {
			lines.push( "" );
		}
		const interfaceLines = buildObjectInterface( objectData );
		interfaceLines.forEach( ( line ) => lines.push( line ) );
	} );
	return lines;
}

function buildTypeDefinitions( version, screenMethods, apiMethods, objects ) {
	const lines = [];

	lines.push( "declare namespace Pi {" );

	// Add object interfaces
	if( objects && objects.length > 0 ) {
		const objectInterfaces = buildObjectInterfaces( objects );
		objectInterfaces.forEach( ( line ) => lines.push( line ) );
		lines.push( "" );
	}

	// Screen interface
	lines.push( "\tinterface Screen {" );
	buildInterfaceMethods( lines, screenMethods );
	lines.push( "\t}" );
	lines.push( "" );

	// API interface
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
	const objectNameToMetadata = new Map();

	// Layer versions from oldest to target
	for( const folderName of versionFolders ) {
		const dirPath = path.join( METADATA_DIR, folderName );

		// Handle removals first
		const removedPath = path.join( dirPath, "_removed.toml" );
		if( fs.existsSync( removedPath ) ) {
			const removedData = parseMetadataFile( removedPath );

			// Remove methods
			const removedMethods = removedData.methods || [];
			for( const methodName of removedMethods ) {
				methodNameToMetadata.delete( methodName );
			}

			// Remove objects
			const removedObjects = removedData.objects || [];
			for( const objectName of removedObjects ) {
				objectNameToMetadata.delete( objectName );
			}
		}

		// Handle objects - layer/override from previous versions
		const objectsFilePath = path.join( dirPath, "_objects.toml" );
		if( fs.existsSync( objectsFilePath ) ) {
			const objectsData = parseMetadataFile( objectsFilePath );
			const objects = objectsData.objects || [];
			for( const objectData of objects ) {
				const objectName = objectData.title;
				if( objectName ) {
					objectNameToMetadata.set( objectName, objectData );
				}
			}
		}

		// Apply overrides and additions
		const tomlFiles = listTomlFilesInDir( dirPath ).filter( ( f ) => {
			const fileName = f.toLowerCase();
			return fileName !== "_removed.toml" && fileName !== "_objects.toml"
		} );
		for( const fileName of tomlFiles ) {
			const filePath = path.join( dirPath, fileName );
			const metadata = parseMetadataFile( filePath );
			const methodName = metadata.title || path.basename( fileName, ".toml" );
			methodNameToMetadata.set( methodName, buildMethodReferenceEntry( methodName, metadata ) );
		}

		// Create Options object from all set commands
		const setMethods = Array.from( methodNameToMetadata.values() )
			.filter( ( method ) => method.name.startsWith( "set" ) && method.name !== "set" );
		
		if( setMethods.length > 0 ) {
			const optionsObject = buildOptionsObject( setMethods );
			objectNameToMetadata.set( "Options", optionsObject );
		}

		// Write output for current version
		const version = folderName.substring( folderName.indexOf( "-" ) + 1 );
		writeOutputFiles( version, methodNameToMetadata, objectNameToMetadata );
	}
}

function writeOutputFiles( version, methodNameToMetadata, objectNameToMetadata ) {
	const referenceMethods = Array.from( methodNameToMetadata.values() ).sort(
		( a, b ) => a.name.localeCompare( b.name )
	);
	const screenMethods = referenceMethods.filter( ( m ) => m.isScreen );
	const apiMethods = referenceMethods.filter( ( m ) => !m.isScreen );

	const objects = Array.from( objectNameToMetadata.values() ).sort(
		( a, b ) => ( a.title || "" ).localeCompare( b.title || "" )
	);

	writeReferenceOutput( version, { "methods": referenceMethods, "objects": objects } );
	writeTypeDefinitions( version, buildTypeDefinitions( version, screenMethods, apiMethods, objects ) );
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
