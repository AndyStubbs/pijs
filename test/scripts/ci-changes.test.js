/**
 * Pi.js CI Changes Tests
 *
 * Verifies which changed files let CI skip the test and size jobs, and the command line.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_childProcess from "node:child_process";
import * as g_url from "node:url";
import * as g_ciChanges from "../../scripts/ci-changes.js";
const assert = g_assert;
const test = g_test.test;

const SCRIPT = g_url.fileURLToPath( new URL( "../../scripts/ci-changes.js", import.meta.url ) );

test( "documentation and tooling files are skippable", () => {
	for( const file of [
		"README.md", "test/README.md", "docs/plans/v2.3/ROADMAP.md",
		"docs/llms/llms.txt", "docs/evidence/ci-2.3/runners.json", "docs/pijs-logo2.webp",
		"tools/fonts/gen-fonts.js", ".vscode/settings.json", "LICENSE", "TODO.txt",
		"AGENTS.md", ".cursorrules", ".github/dependabot.yml"
	] ) {
		assert.equal( g_ciChanges.isSkippable( file ), true, file );
	}
} );

test( "files that tests, builds, or size reports read are not skippable", () => {
	for( const file of [
		"docs/llms/pi.d.ts", "plugins/PLUGIN-QUICKSTART.md", "plugins/README.md",
		"src/api/graphics.js", "plugins/sound/index.js", "metadata/pi-2.3/circle.json",
		"test/demos/shader_demo_01.html", "test/tests/html-core/circle_01.html",
		"releases/pi-2.2.0/pi.js", "scripts/build.js", "package.json", "package-lock.json",
		"playwright.config.js", ".github/workflows/ci.yml", ".editorconfig", ""
	] ) {
		assert.equal( g_ciChanges.isSkippable( file ), false, file );
	}
} );

test( "Windows separators are normalized", () => {
	assert.equal( g_ciChanges.isSkippable( "docs\\plans\\A.md" ), true );
	assert.equal( g_ciChanges.isSkippable( "docs\\llms\\pi.d.ts" ), false );
	assert.equal( g_ciChanges.isSkippable( "plugins\\PLUGIN-SYSTEM.md" ), false );
} );

test( "a change needs tests unless every file is skippable", () => {
	assert.equal( g_ciChanges.needsTests( [ "README.md", "docs/API.md", "" ] ), false );
	assert.equal( g_ciChanges.needsTests( [ "README.md", "src/core/state.js" ] ), true );
	assert.equal( g_ciChanges.needsTests( [] ), true );
	assert.equal( g_ciChanges.needsTests( [ "", "  " ] ), true );
} );

test( "the command line reads paths from stdin", () => {
	const run = input => {
		return g_childProcess.execFileSync( process.execPath, [ SCRIPT ], {
			"input": input, "encoding": "utf8"
		} );
	};
	assert.equal( run( "README.md\r\ndocs/API.md\n" ), "false\n" );
	assert.equal( run( "README.md\nsrc/core/state.js\n" ), "true\n" );
	assert.equal( run( "" ), "true\n" );
} );
