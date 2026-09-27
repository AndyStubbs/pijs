/**
 * Pi.js CI Changes
 *
 * Decides whether a change needs the CI test and size jobs. A change skips them only when every
 * changed file is one that no test, build, or size report reads: documentation and editor or
 * tooling files. The ci.yml `changes` job pipes `git diff --name-only` into this script.
 *
 * Usage: git diff --name-only <base> <head> | node scripts/ci-changes.js
 * Prints "true" when the tests must run and "false" when they can be skipped.
 */
import * as g_path from "node:path";
import * as g_url from "node:url";

// Files outside docs/ that no test reads
const SKIPPABLE_FILES = [
	"LICENSE", "TODO.txt", "AGENTS.md", ".cursorrules", ".github/dependabot.yml"
];

// Directories whose files no test reads
const SKIPPABLE_DIRECTORIES = [ "docs/", "tools/", ".vscode/" ];

// Files inside skippable areas that tests do read: validate-type-definitions.js compares
// docs/llms/pi.d.ts with the build, and plugin-docs-browser.test.js runs the plugin guides
const TESTED_FILES = [ "docs/llms/pi.d.ts" ];
const TESTED_MARKDOWN_DIRECTORIES = [ "plugins/" ];

/**
 * Tells whether a changed file cannot affect the test or size results.
 *
 * @param {string} file - Repository-relative path, with / or \ separators
 * @returns {boolean} True when the file is documentation or tooling no test reads
 */
function isSkippable( file ) {
	const path = file.trim().replaceAll( "\\", "/" );
	if( path === "" || TESTED_FILES.includes( path ) ) {
		return false;
	}
	if( SKIPPABLE_FILES.includes( path ) ) {
		return true;
	}
	if( SKIPPABLE_DIRECTORIES.some( directory => path.startsWith( directory ) ) ) {
		return true;
	}
	if( path.toLowerCase().endsWith( ".md" ) ) {
		return !TESTED_MARKDOWN_DIRECTORIES.some( directory => path.startsWith( directory ) );
	}
	return false;
}

/**
 * Tells whether a change needs the CI test and size jobs.
 *
 * An empty list runs them, so a failed or empty diff never skips the tests.
 *
 * @param {string[]} files - Changed repository-relative paths; blank entries are ignored
 * @returns {boolean} True unless every changed file is skippable
 */
function needsTests( files ) {
	const changed = files.filter( file => file.trim() !== "" );
	if( changed.length === 0 ) {
		return true;
	}
	return !changed.every( isSkippable );
}

function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	return g_url.pathToFileURL( g_path.resolve( entry ) ).href === import.meta.url;
}

if( isMainModule() ) {
	let input = "";
	process.stdin.setEncoding( "utf8" );
	process.stdin.on( "data", chunk => {
		input += chunk;
	} );
	process.stdin.on( "end", () => {
		process.stdout.write( `${needsTests( input.split( /\r?\n/ ) )}\n` );
	} );
}

export { isSkippable, needsTests };
