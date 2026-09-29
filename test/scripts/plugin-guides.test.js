/**
 * The plugin guides against the metadata: the keyboard, pointer, and sound-advanced READMEs and
 * docs/GAMEPAD.md call only current commands, name no removed command, and have JavaScript
 * examples that parse; the guides of plugins that the Full bundle includes say that their
 * standalone plugins are for Lite.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_docChecks from "./doc-checks.js";
const assert = g_assert;
const test = g_test.test;

// The guides of plugins that the Full bundle includes, and the sound-advanced guide
const BUNDLED = [
	"plugins/keyboard/README.md", "plugins/pointer/README.md", "docs/GAMEPAD.md",
	"plugins/polygons/README.md"
];
const GUIDES = BUNDLED.concat( "plugins/sound-advanced/README.md" ).map( file => [
	file, g_docChecks.readDoc( file )
] );

test( "every guide calls only current commands and names no removed one", () => {
	for( const [ file, text ] of GUIDES ) {
		const unknown = g_docChecks.unknownCalls( text );
		assert.deepEqual( unknown, [], `${file} calls ${unknown.join( ", " )}` );
		const present = g_docChecks.removedIn( text );
		assert.deepEqual( present, [], `${file} names ${present.join( ", " )}` );
	}
} );

test( "every JavaScript example in the guides parses", () => {
	for( const [ file, text ] of GUIDES ) {
		for( const [ index, block ] of g_docChecks.codeBlocks( text ).entries() ) {
			assert.doesNotThrow(
				() => g_docChecks.parseExample( block ),
				`${file} example ${index + 1} does not parse`
			);
		}
	}
} );

test( "the guides of bundled plugins say the standalone plugin is for Lite", () => {
	for( const [ file, text ] of GUIDES.filter( ( [ file ] ) => BUNDLED.includes( file ) ) ) {
		assert.match( text, /DUPLICATE_PLUGIN/, `${file} does not name DUPLICATE_PLUGIN` );
		assert.match( text, /\bLite\b/, `${file} does not mention Lite` );
	}
} );
