/**
 * Pi.js GLSL Compaction Tests
 *
 * Verifies that build-time shader compaction removes only comments and whitespace, keeps
 * preprocessor line boundaries, and never joins adjacent tokens.
 */
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_url from "node:url";
import * as g_glslCompact from "../../scripts/glsl-compact.js";
const assert = g_assert;
const test = g_test.test;
const compactGlsl = g_glslCompact.compactGlsl;

const SHADERS_DIR = g_path.join(
	g_path.dirname( g_url.fileURLToPath( import.meta.url ) ), "../../src/renderer/shaders"
);

test( "compactGlsl removes comments, indentation, and blank lines", () => {
	const source = [
		"#version 300 es",
		"precision mediump float;",
		"",
		"// A line comment",
		"void main() {",
		"\t/* A block",
		"\t   comment */",
		"\tvec4  color\t=  vec4(1.0);  // trailing",
		"}",
		""
	].join( "\n" );

	assert.equal( compactGlsl( source ), [
		"#version 300 es",
		"precision mediump float;",
		"void main() {",
		"vec4 color = vec4(1.0);",
		"}"
	].join( "\n" ) );
} );

test( "compactGlsl keeps tokens separated by comments apart", () => {
	assert.equal( compactGlsl( "float/**/x = a/**/-/**/-b;" ), "float x = a - -b;" );
	assert.equal( compactGlsl( "float x = a;//c\nfloat y = b;" ), "float x = a;\nfloat y = b;" );
} );

test( "compactGlsl keeps preprocessor directives on their own lines", () => {
	const source = "#version 300 es\n#define SCALE /* one */ 2.0\n\n#ifdef SCALE\nx;\n#endif\n";
	assert.equal(
		compactGlsl( source ), "#version 300 es\n#define SCALE 2.0\n#ifdef SCALE\nx;\n#endif"
	);
} );

test( "compactGlsl follows comment start order", () => {
	assert.equal( compactGlsl( "a; // not /* a block\nb;" ), "a;\nb;" );
	assert.equal( compactGlsl( "a; /* not // a line */ b;" ), "a; b;" );
} );

test( "compactGlsl normalizes line endings and splices continuations first", () => {
	assert.equal( compactGlsl( "a;\r\nb;\rc;" ), "a;\nb;\nc;" );
	assert.equal( compactGlsl( "// comment \\\ncontinued\nb;" ), "b;" );
	assert.equal( compactGlsl( "#define X \\\n\t1.0\nX;" ), "#define X 1.0\nX;" );
} );

test( "compactGlsl keeps every library shader's version directive first", () => {
	for( const name of g_fs.readdirSync( SHADERS_DIR ) ) {
		const source = g_fs.readFileSync( g_path.join( SHADERS_DIR, name ), "utf8" );
		const compacted = compactGlsl( source );
		assert.ok( compacted.startsWith( "#version 300 es\n" ), name );
		assert.ok( !compacted.includes( "//" ) && !compacted.includes( "/*" ), name );
		assert.ok( compacted.length < source.length, name );
	}
} );
