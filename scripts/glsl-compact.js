/**
 * Pi.js GLSL Compaction
 *
 * Compacts the library's bundled .vert and .frag shader sources at build time. JavaScript
 * minification leaves imported shader strings untouched, so comments, indentation, and blank
 * lines would otherwise ship in every bundle. The readable sources stay unchanged on disk.
 *
 * Compaction follows the GLSL ES 3.00 lexical rules: line continuations are spliced first,
 * each comment becomes a single space, and line boundaries are kept so preprocessor directives
 * still end where they did. Only whitespace is removed; tokens are never joined or reordered.
 * Compiler line numbers refer to the compacted text.
 */
import * as g_fs from "node:fs";

/**
 * Removes comments and redundant whitespace from GLSL source.
 *
 * @param {string} source - GLSL source text
 * @returns {string} Equivalent GLSL with one statement line per non-empty source line
 */
function compactGlsl( source ) {
	const code = source
		.replace( /\r\n?/g, "\n" )
		.replace( /\\\n/g, "" )
		.replace( /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " " );

	return code
		.split( "\n" )
		.map( line => line.trim().replace( /[ \t\f\v]+/g, " " ) )
		.filter( line => line !== "" )
		.join( "\n" );
}

/**
 * esbuild plugin that imports .vert and .frag files as compacted text strings.
 */
const glslCompactPlugin = {
	"name": "glsl-compact",
	"setup"( build ) {
		build.onLoad( { "filter": /\.(vert|frag)$/ }, async ( args ) => {
			const source = await g_fs.promises.readFile( args.path, "utf8" );
			return { "contents": compactGlsl( source ), "loader": "text" };
		} );
	}
};

export { compactGlsl, glslCompactPlugin };
