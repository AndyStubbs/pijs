/**
 * Pi.js package type-consumer fixtures.
 *
 * These files are compiled with tsc --strict against a local pijs-web package
 * layout to verify published declarations match runtime contracts.
 */
import * as g_assert from "node:assert/strict";
import * as g_cp from "node:child_process";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_test from "node:test";
import * as g_generateMetadata from "../../scripts/generate-metadata.js";
import * as g_url from "node:url";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const assert = g_assert;
const { spawnSync } = g_cp;
const fs = g_fs;
const os = g_os;
const path = g_path;
const test = g_test.test;
const { generateMetadata } = g_generateMetadata;

const ROOT = path.join( DIRNAME, "..", ".." );
const BASE_PACKAGE_PATH = path.join( ROOT, "releases", "base-package.json" );
const TSC_PATH = path.join( ROOT, "node_modules", "typescript", "bin", "tsc" );

/**
 * Creates a temporary pijs-web package with generated declaration files.
 *
 * @returns {{ packageRoot: string, consumersDir: string, cleanup: Function }}
 */
function createConsumerPackage() {
	generateMetadata();

	const fixtureDir = fs.mkdtempSync( path.join( os.tmpdir(), "pijs-types-consumer-" ) );
	const packageRoot = path.join( fixtureDir, "pijs-web" );
	const distDir = path.join( packageRoot, "dist" );
	const consumersDir = path.join( fixtureDir, "consumers" );
	const nodeModulesDir = path.join( fixtureDir, "node_modules" );

	fs.mkdirSync( distDir, { "recursive": true } );
	fs.mkdirSync( consumersDir, { "recursive": true } );
	fs.mkdirSync( nodeModulesDir, { "recursive": true } );

	const pkg = JSON.parse( fs.readFileSync( BASE_PACKAGE_PATH, "utf8" ) );
	const rootPkg = JSON.parse(
		fs.readFileSync( path.join( ROOT, "package.json" ), "utf8" )
	);
	pkg.version = rootPkg.version;
	pkg.majorVersion = rootPkg.majorVersion;
	fs.writeFileSync(
		path.join( packageRoot, "package.json" ),
		`${JSON.stringify( pkg, null, "\t" )}\n`,
		"utf8"
	);

	fs.copyFileSync(
		path.join( ROOT, "build", "pi.d.ts" ),
		path.join( distDir, "pi.d.ts" )
	);
	fs.copyFileSync(
		path.join( ROOT, "build", "pi.lite.d.ts" ),
		path.join( distDir, "pi.lite.d.ts" )
	);

	// Node16 resolution requires the "import" targets to exist beside types.
	const stubModule = [
		"const api = { version: \"0.0.0\", screen() { return this; },",
		"\tsetColor() {}, pset() {}, registerPlugin() {} };",
		"export default api;",
		"export { api as pi, api as $ };",
		""
	].join( "\n" );
	fs.writeFileSync( path.join( distDir, "pi.esm.js" ), stubModule, "utf8" );
	fs.writeFileSync( path.join( distDir, "pi.lite.esm.js" ), stubModule, "utf8" );

	const pluginNames = Object.keys( pkg.exports || {} )
		.filter( ( exportPath ) => exportPath.startsWith( "./plugins/" ) )
		.map( ( exportPath ) => exportPath.slice( "./plugins/".length ) );

	for( const pluginName of pluginNames ) {
		const src = path.join(
			ROOT, "build", "plugins", pluginName, `${pluginName}.d.ts`
		);
		const destDir = path.join( distDir, "plugins", pluginName );
		fs.mkdirSync( destDir, { "recursive": true } );
		fs.copyFileSync( src, path.join( destDir, `${pluginName}.d.ts` ) );
		fs.writeFileSync(
			path.join( destDir, `${pluginName}.esm.js` ),
			"export default function() {}\n",
			"utf8"
		);
	}

	fs.symlinkSync( packageRoot, path.join( nodeModulesDir, "pijs-web" ), "junction" );

	fs.writeFileSync(
		path.join( consumersDir, "valid-runtime.mts" ),
		[
			`import pi, { pi as named, $ } from "pijs-web";`,
			`import pointer from "pijs-web/plugins/pointer";`,
			`pi.registerPlugin( { name: "pointer-consumer", init: pointer } );`,
			`const version: "${rootPkg.version}" = pi.version;`,
			`named.screen( "8x8" );`,
			`$.screen( "8x8" );`,
			`void version;`,
			""
		].join( "\n" ),
		"utf8"
	);

	fs.writeFileSync(
		path.join( consumersDir, "valid-lite.mts" ),
		[
			`import lite, { pi as namedLite, $ as liteDollar } from "pijs-web/lite";`,
			`const screen = lite.screen( "8x8" );`,
			`screen.setColor( "red" );`,
			`screen.pset( 1, 1 );`,
			`namedLite.screen( "4x4" );`,
			`liteDollar.screen( "2x2" );`,
			""
		].join( "\n" ),
		"utf8"
	);

	fs.writeFileSync(
		path.join( consumersDir, "valid-plugins.mts" ),
		[
			`import pi from "pijs-web";`,
			`import gamepad from "pijs-web/plugins/gamepad";`,
			`import keyboard from "pijs-web/plugins/keyboard";`,
			`import pointer from "pijs-web/plugins/pointer";`,
			`import sound from "pijs-web/plugins/sound";`,
			`pi.registerPlugin( { name: "gamepad-consumer", init: gamepad } );`,
			`pi.registerPlugin( { name: "keyboard-consumer", init: keyboard } );`,
			`pi.registerPlugin( { name: "pointer-consumer", init: pointer } );`,
			`pi.registerPlugin( { name: "sound-consumer", init: sound } );`,
			""
		].join( "\n" ),
		"utf8"
	);

	fs.writeFileSync(
		path.join( consumersDir, "false-positive.mts" ),
		[
			`import { Pi } from "pijs-web";`,
			`import lite from "pijs-web/lite";`,
			`import pointer from "pijs-web/plugins/pointer";`,
			`Pi.screen( "8x8" );`,
			`lite.inmouse();`,
			`pointer.screen( "8x8" );`,
			""
		].join( "\n" ),
		"utf8"
	);

	fs.writeFileSync(
		path.join( consumersDir, "false-positive-lite-named.mts" ),
		[
			`import { Pi } from "pijs-web/lite";`,
			`Pi.screen( "8x8" );`,
			""
		].join( "\n" ),
		"utf8"
	);

	fs.writeFileSync(
		path.join( consumersDir, "control.mts" ),
		[
			`import pi from "pijs-web";`,
			`const s = pi.screen( "8x8" );`,
			`s.setColor( "red" );`,
			`s.pset( 1, 1 );`,
			""
		].join( "\n" ),
		"utf8"
	);

	fs.writeFileSync(
		path.join( consumersDir, "tsconfig.json" ),
		`${JSON.stringify( {
			"compilerOptions": {
				"strict": true,
				"module": "ESNext",
				"moduleResolution": "node16",
				"target": "ES2020",
				"lib": [ "ES2020", "DOM" ],
				"noEmit": true,
				"skipLibCheck": false,
				"types": []
			},
			"include": [ "./*.mts" ]
		}, null, "\t" )}\n`,
		"utf8"
	);

	return {
		"packageRoot": packageRoot,
		"consumersDir": consumersDir,
		"cleanup": () => fs.rmSync( fixtureDir, { "force": true, "recursive": true } )
	};
}

/**
 * Runs tsc against a consumer file.
 *
 * @param {string} consumersDir - Consumer directory with tsconfig.json.
 * @param {string} fileName - Consumer file name.
 * @returns {{ status: number, stdout: string, stderr: string }}
 */
function runTsc( consumersDir, fileName ) {
	assert.ok( fs.existsSync( TSC_PATH ), `Missing TypeScript compiler: ${TSC_PATH}` );
	const result = spawnSync(
		process.execPath,
		[
			TSC_PATH,
			"--noEmit",
			"--strict",
			"--module", "esnext",
			"--moduleResolution", "bundler",
			"--target", "ES2020",
			"--lib", "es2020,dom",
			path.join( consumersDir, fileName )
		],
		{
			"cwd": consumersDir,
			"encoding": "utf8",
			"env": process.env
		}
	);
	return {
		"status": result.status,
		"stdout": result.stdout || "",
		"stderr": result.stderr || ""
	};
}

test( "positive package consumers typecheck against published declarations", () => {
	const fixture = createConsumerPackage();
	try {
		for( const fileName of [
			"control.mts", "valid-runtime.mts", "valid-lite.mts", "valid-plugins.mts"
		] ) {
			const result = runTsc( fixture.consumersDir, fileName );
			assert.equal(
				result.status,
				0,
				`${fileName} should typecheck:\n${result.stdout}${result.stderr}`
			);
		}
	} finally {
		fixture.cleanup();
	}
} );

test( "negative package consumers are rejected by published declarations", () => {
	const fixture = createConsumerPackage();
	try {
		const falsePositive = runTsc( fixture.consumersDir, "false-positive.mts" );
		assert.notEqual( falsePositive.status, 0, "false-positive.mts should fail tsc" );
		const output = `${falsePositive.stdout}${falsePositive.stderr}`;
		assert.match( output, /Pi/, "should reject named Pi export" );
		assert.match( output, /inmouse/, "should reject lite.inmouse()" );
		assert.match( output, /screen/, "should reject plugin.screen()" );

		const liteNamed = runTsc( fixture.consumersDir, "false-positive-lite-named.mts" );
		assert.notEqual(
			liteNamed.status,
			0,
			"false-positive-lite-named.mts should fail tsc"
		);
		assert.match(
			`${liteNamed.stdout}${liteNamed.stderr}`,
			/Pi/,
			"should reject named Pi export from lite"
		);
	} finally {
		fixture.cleanup();
	}
} );
