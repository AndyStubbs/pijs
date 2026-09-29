/**
 * The references in docs/llms/ against the metadata: their calls name current commands of the
 * Full bundle or the sound-advanced plugin, they name no removed command, they state the package
 * version, and every JavaScript example parses.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_docChecks from "./doc-checks.js";
const assert = g_assert;
const test = g_test.test;

const TEXTS = [ "llms.txt", "llms-full.txt", "examples.txt" ].map( file => [
	file, g_docChecks.readDoc( `docs/llms/${file}` )
] );

test( "every call names a current command", () => {
	for( const [ file, text ] of TEXTS ) {
		const unknown = g_docChecks.unknownCalls( text );
		assert.deepEqual( unknown, [], `${file} calls ${unknown.join( ", " )}` );
	}
} );

test( "no reference names a removed command", () => {
	for( const [ file, text ] of TEXTS ) {
		const present = g_docChecks.removedIn( text );
		assert.deepEqual( present, [], `${file} names ${present.join( ", " )}` );
	}
} );

test( "every reference states the package version", () => {
	const version = g_docChecks.VERSION.replaceAll( ".", "\\." );
	for( const [ file, text ] of TEXTS ) {
		assert.match( text, new RegExp( `^# Pi\\.js ${version} ` ), file );
	}
} );

test( "every JavaScript example parses", () => {
	for( const [ file, text ] of TEXTS ) {
		const blocks = g_docChecks.codeBlocks( text );
		assert.ok( blocks.length > 0, `${file} has no examples` );
		for( const [ index, block ] of blocks.entries() ) {
			assert.doesNotThrow(
				() => g_docChecks.parseExample( block ),
				`${file} example ${index + 1} does not parse`
			);
		}
	}
} );
