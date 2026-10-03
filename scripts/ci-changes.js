/**
 * Pi.js CI Changes
 *
 * Decides whether a change needs the CI test and size jobs. A change skips them only when every
 * changed file is one that no test, build, or size report reads: documentation, editor or
 * tooling files, and manual demos. The ci.yml `changes` job pipes `git diff --name-only` into
 * this script.
 *
 * Usage: git diff --name-only <base> <head> | node scripts/ci-changes.js
 * Prints "true" when the tests must run and "false" when they can be skipped.
 */
import * as g_path from "node:path";
import * as g_url from "node:url";

// Files outside docs/ that no test reads
const SKIPPABLE_FILES = [
	"LICENSE", "TODO.txt", "AGENTS.md", ".cursorrules", ".gitignore", ".github/dependabot.yml"
];

// Directories whose files no test reads. test/demos/ holds manual demos; a demo's own tests,
// such as test/demos/music-maker/tests/, are not part of npm test
const SKIPPABLE_DIRECTORIES = [ "docs/", "tools/", ".vscode/", "test/demos/" ];

// Files inside skippable areas that tests do read: validate-type-definitions.js compares
// docs/llms/pi.d.ts with the build; api-reference.test.js and llms-references.test.js check
// docs/API.md and the other docs/llms/ references against the metadata; plugin-guides.test.js
// checks docs/GAMEPAD.md with the plugin READMEs; upgrade-guide.test.js checks the 2.3 upgrade
// guide's renames; release-docs.test.js checks the release package's documents against its
// manifest; plugin-docs-browser.test.js runs the plugin guides; and
// alpha-composition-browser.test.js compiles the shaders of the numbered shader demos
const TESTED_FILES = [
	"docs/llms/pi.d.ts", "docs/llms/llms.txt", "docs/llms/llms-full.txt",
	"docs/llms/examples.txt", "docs/API.md", "docs/GAMEPAD.md", "docs/UPGRADE-V2.3.md",
	"releases/pi-latest/README.md", "releases/pi-latest/CHANGELOG.md", "releases/PUBLISH.md"
];
const TESTED_MARKDOWN_DIRECTORIES = [ "plugins/" ];
const TESTED_PATTERNS = [ /^test\/demos\/shader_demo_\d+\.html$/ ];

/**
 * Tells whether a changed file cannot affect the test or size results.
 *
 * @param {string} file - Repository-relative path, with / or \ separators
 * @returns {boolean} True when the file is documentation, tooling, or a demo no test reads
 */
function isSkippable( file ) {
	const path = file.trim().replaceAll( "\\", "/" );
	if( path === "" || TESTED_FILES.includes( path ) ) {
		return false;
	}
	if( TESTED_PATTERNS.some( pattern => pattern.test( path ) ) ) {
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
