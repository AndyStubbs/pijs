/**
 * Shared checks for the documentation tests: the current command names from the metadata, the
 * names the current version removed, and the calls and JavaScript examples in a document.
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_vm from "node:vm";
import * as g_generateMetadata from "../../scripts/generate-metadata.js";

const ROOT_DIR = g_path.join( import.meta.dirname, "..", ".." );
const VERSION = JSON.parse(
	g_fs.readFileSync( g_path.join( ROOT_DIR, "package.json" ), "utf8" )
).version;

/**
 * Reads a file from the repository.
 *
 * @param {string} file - Path from the repository root, with / separators
 * @returns {string} File contents
 */
function readDoc( file ) {
	return g_fs.readFileSync( g_path.join( ROOT_DIR, ...file.split( "/" ) ), "utf8" );
}

/**
 * The commands of the Full bundle and of the sound-advanced plugin.
 *
 * @returns {Set<string>} Command names
 */
function currentCommands() {
	return new Set( [ ...g_generateMetadata.layerMetadata().methods.keys() ].concat(
		g_generateMetadata.readPluginMethods( "sound-advanced" ).map( method => method.name )
	) );
}

/**
 * The commands the current minor version removed, from its `_removed.toml`.
 *
 * @returns {string[]} Command names
 */
function removedCommands() {
	const minor = VERSION.split( "." ).slice( 0, 2 ).join( "." );
	const removedFile = readDoc( `metadata/pi-${minor}/_removed.toml` );
	return removedFile.match( /methods = \[([^\]]*)\]/ )[ 1 ].match( /"[^"]+"/g )
		.map( name => name.slice( 1, -1 ) );
}

/**
 * The removed commands a document names as whole words.
 *
 * @param {string} text - Document text
 * @returns {string[]} Removed names found
 */
function removedIn( text ) {
	return removedCommands().filter( name => new RegExp( `\\b${name}\\b` ).test( text ) );
}

/**
 * The commands a document calls through `$.` or `pi.` that are neither current nor registered by
 * the document's own plugin examples with addCommand().
 *
 * @param {string} text - Document text
 * @returns {string[]} Unknown command names, each once
 */
function unknownCalls( text ) {
	const commands = currentCommands();
	const own = Array.from(
		text.matchAll( /addCommand\(\s*"([A-Za-z]+)"/g ), match => match[ 1 ]
	);
	const called = Array.from(
		text.matchAll( /(?:\$|\bpi)\.([A-Za-z]+)\s*\(/g ), match => match[ 1 ]
	);
	return [ ...new Set( called.filter(
		name => !commands.has( name ) && !own.includes( name )
	) ) ];
}

/**
 * The fenced JavaScript examples of a document.
 *
 * @param {string} text - Document text
 * @returns {string[]} Example sources
 */
function codeBlocks( text ) {
	return Array.from( text.matchAll( /```javascript\n([\s\S]*?)```/g ), match => match[ 1 ] );
}

/**
 * Parses a JavaScript example, throwing its SyntaxError when it does not parse. Examples may load
 * modules and use top-level await, so its import lines are dropped and the rest is parsed as an
 * async function body.
 *
 * @param {string} block - Example source
 * @returns {void}
 */
function parseExample( block ) {
	const body = block.split( "\n" ).filter( line => !/^import\s/.test( line ) ).join( "\n" );
	new g_vm.Script( `( async function() {\n${body}\n} );` );
}

export {
	VERSION, codeBlocks, currentCommands, parseExample, readDoc, removedCommands, removedIn,
	unknownCalls
};
