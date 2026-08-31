/**
 * Pi.js Metadata Generation Tests
 *
 * Verifies newline normalization and formatting across platform newline styles.
 */

"use strict";

const assert = require( "node:assert/strict" );
const test = require( "node:test" );
const {
	formatDescription,
	normalizeNewlines,
	normalizeParsedStrings,
	parseMetadata
} = require( "../../scripts/generate-metadata.js" );

test( "normalizeNewlines converts supported newline sequences to LF", () => {
	assert.equal( normalizeNewlines( "one\ntwo" ), "one\ntwo" );
	assert.equal( normalizeNewlines( "one\r\ntwo" ), "one\ntwo" );
	assert.equal( normalizeNewlines( "one\rtwo" ), "one\ntwo" );
	assert.equal( normalizeNewlines( "one\r\r\ntwo" ), "one\ntwo" );
} );

test( "parseMetadata produces equivalent values for physical newline styles", () => {
	const newlineStyles = [ "\n", "\r\n", "\r", "\r\r\n" ];
	const expected = {
		"title": "example",
		"summary": "Line one\nLine two\n",
		"example": "first();\nsecond();\n"
	};

	for( const newline of newlineStyles ) {
		const source = [
			'title = "example"',
			'summary = """',
			"Line one",
			"Line two",
			'"""',
			'example = """',
			"first();",
			"second();",
			'"""',
			""
		].join( newline );
		assert.deepEqual( parseMetadata( source ), expected );
	}
} );

test( "parseMetadata collapses escaped carriage returns at physical line endings", () => {
	const source = 'example = """\r\nfirst();\\r\r\nsecond();\\r\r\n"""\r\n';
	assert.equal( parseMetadata( source ).example, "first();\nsecond();\n" );
} );

test( "normalizeParsedStrings recursively normalizes every string field", () => {
	const metadata = {
		"summary": "Summary\rline",
		"example": "first();\r\nsecond();",
		"parameters": [ {
			"name": "callback",
			"description": "Parameter\r\r\ndescription",
			"signature": "()\r=> void"
		} ],
		"returns": [ { "description": "Return\rdescription" } ],
		"object": {
			"description": "Object\r\ndescription",
			"properties": [ "one\rtwo" ]
		}
	};

	assert.deepEqual( normalizeParsedStrings( metadata ), {
		"summary": "Summary\nline",
		"example": "first();\nsecond();",
		"parameters": [ {
			"name": "callback",
			"description": "Parameter\ndescription",
			"signature": "()\n=> void"
		} ],
		"returns": [ { "description": "Return\ndescription" } ],
		"object": {
			"description": "Object\ndescription",
			"properties": [ "one\ntwo" ]
		}
	} );
} );

test( "formatDescription preserves paragraphs and Markdown lists", () => {
	const description = "Intro line\r\ncontinued.\r\n\r\n" +
		"- First item\r\n- Second item\r\n1. Ordered item\r\n2. Final item";
	const expected = "Intro line continued.\n\n" +
		"- First item\n- Second item\n1. Ordered item\n2. Final item";

	assert.equal( formatDescription( description ), expected );
} );
