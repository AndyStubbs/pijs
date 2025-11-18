/**
 * Reorganize TOML Files - Move example field after description
 * 
 * This script moves the `example` field to be immediately after the `description`
 * field in all TOML metadata files.
 */

"use strict";

const fs = require( "fs" );
const path = require( "path" );

const METADATA_DIRS = [
	path.join( __dirname, "..", "metadata", "pi-1.2" ),
	path.join( __dirname, "..", "metadata", "pi-2.0" )
];

function findMultilineString( content, startPos, key ) {
	// Look for key = """ or key = " or key = '
	// For triple quotes, match until closing """ (can span multiple lines)
	// For single/double quotes, match until closing quote on same line
	const searchContent = content.substring( startPos );
	
	// Try triple quotes first
	const tripleQuotePattern = new RegExp( `^${key}\\s*=\\s*"""([\\s\\S]*?)"""`, "m" );
	let match = searchContent.match( tripleQuotePattern );
	
	if( match ) {
		return {
			"fullMatch": match[0],
			"start": startPos + match.index,
			"end": startPos + match.index + match[0].length,
			"quote": "\"\"\"",
			"content": match[1]
		};
	}
	
	// Try single or double quotes (single line)
	const singleQuotePattern = new RegExp( `^${key}\\s*=\\s*("|')([^\\n]*?)\\1`, "m" );
	match = searchContent.match( singleQuotePattern );
	
	if( match ) {
		return {
			"fullMatch": match[0],
			"start": startPos + match.index,
			"end": startPos + match.index + match[0].length,
			"quote": match[1],
			"content": match[2]
		};
	}
	
	return null;
}

function processTomlFile( filePath ) {
	let content = fs.readFileSync( filePath, "utf8" );
	const originalContent = content;
	
	// Check if file has an example field
	if( !content.includes( "example = " ) ) {
		return false;
	}
	
	// Find description field
	const descriptionMatch = findMultilineString( content, 0, "description" );
	if( !descriptionMatch ) {
		return false;
	}
	
	const descriptionEnd = descriptionMatch.end;
	const afterDescription = content.substring( descriptionEnd );
	
	// Check if example is already right after description (with optional blank lines)
	const nextNonWhitespace = afterDescription.match( /^\s*\n\s*example\s*=/m );
	if( nextNonWhitespace ) {
		return false; // Already in correct position
	}
	
	// Find the example field (search from beginning)
	const exampleMatch = findMultilineString( content, 0, "example" );
	if( !exampleMatch ) {
		return false;
	}
	
	// Extract the example field with any trailing whitespace/newlines
	const exampleStart = exampleMatch.start;
	const exampleEnd = exampleMatch.end;
	
	// Get the example field content
	const exampleField = content.substring( exampleStart, exampleEnd );
	
	// Get content before and after example
	const beforeExample = content.substring( 0, exampleStart );
	const afterExample = content.substring( exampleEnd );
	
	// Remove trailing whitespace from beforeExample
	const beforeExampleTrimmed = beforeExample.replace( /\s+$/, "" );
	
	// Remove leading whitespace/newlines from afterExample
	const afterExampleTrimmed = afterExample.replace( /^\s+/, "" );
	
	// Reconstruct content without example
	content = beforeExampleTrimmed + ( afterExampleTrimmed ? "\n" + afterExampleTrimmed : "" );
	
	// Find description again after removal
	const newDescriptionMatch = findMultilineString( content, 0, "description" );
	if( !newDescriptionMatch ) {
		return false;
	}
	
	const newDescriptionEnd = newDescriptionMatch.end;
	const afterNewDescription = content.substring( newDescriptionEnd );
	
	// Insert example right after description
	const before = content.substring( 0, newDescriptionEnd );
	const after = afterNewDescription;
	
	// Add example with proper spacing (one blank line)
	const newContent = before + "\n" + exampleField + ( after.trim() ? "\n" + after : "" );
	
	// Only write if content changed
	if( newContent !== originalContent ) {
		fs.writeFileSync( filePath, newContent, "utf8" );
		return true;
	}
	
	return false;
}

function processDirectory( dir ) {
	if( !fs.existsSync( dir ) ) {
		console.log( `Directory not found: ${dir}` );
		return;
	}
	
	const files = fs.readdirSync( dir )
		.filter( ( file ) => file.endsWith( ".toml" ) && file !== "_objects.toml" && file !== "_removed.toml" )
		.sort();
	
	let processed = 0;
	let skipped = 0;
	
	for( const file of files ) {
		const filePath = path.join( dir, file );
		if( processTomlFile( filePath ) ) {
			processed++;
			console.log( `✓ Processed: ${file}` );
		} else {
			skipped++;
		}
	}
	
	console.log( `\n${dir}: Processed ${processed}, Skipped ${skipped}` );
}

// Process all directories
console.log( "Reorganizing TOML files...\n" );

for( const dir of METADATA_DIRS ) {
	processDirectory( dir );
}

console.log( "\nDone!" );

