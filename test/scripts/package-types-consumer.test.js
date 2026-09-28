/**
 * Pi.js package type-consumer fixtures.
 *
 * These files are compiled with tsc --strict, under both bundler and nodenext module
 * resolution, against a local pijs-web package layout to verify published declarations match
 * runtime contracts.
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
const { test, before, after } = g_test;
const { generateMetadata } = g_generateMetadata;

const ROOT = path.join( DIRNAME, "..", ".." );
const BASE_PACKAGE_PATH = path.join( ROOT, "releases", "base-package.json" );
const TSC_PATH = path.join( ROOT, "node_modules", "typescript", "bin", "tsc" );
const RESOLUTIONS = [ "bundler", "nodenext" ];

// Lite with each exported plugin: the plugin's commands and settings, and a command of another
// plugin that stays undeclared. Full already bundles every plugin except sound-advanced.
const LITE_PLUGIN_CONSUMERS = {
	"gamepad": [
		`const pads = lite.ingamepad();`,
		`if( Array.isArray( pads ) && pads.length > 0 ) {`,
		`\tconst pressed: boolean = pads[ 0 ].getButtonJustPressed( 0 );`,
		`\tvoid pressed;`,
		`}`,
		`lite.onGamepadConnected( ( pad ) => { const id: string = pad.id; void id; } );`,
		`lite.onGamepadDisconnected( ( data ) => {`,
		`\tconst index: number = data.index;`,
		`\tvoid index;`,
		`} );`,
		`lite.set( { gamepadSensitivity: 0.5 } );`,
		`// @ts-expect-error Keyboard commands need the keyboard plugin.`,
		`lite.inKey();`
	],
	"keyboard": [
		`lite.onKey( "KeyA", "down", () => {} );`,
		`const age: Promise<string | number | null> = lite.screen( "8x8" ).input(`,
		`	"Age?", ( value: string | number | null ) => { void value; }, "_", true, true,`,
		`	false, null );`,
		`void age;`,
		`lite.set( { actionKeys: [ "ArrowUp" ] } );`,
		`// @ts-expect-error onkey is renamed onKey.`,
		`lite.onkey( "KeyA", "down", () => {} );`,
		`// @ts-expect-error Gamepad commands need the gamepad plugin.`,
		`lite.ingamepad();`
	],
	"pointer": [
		`const screen = lite.screen( "8x8" );`,
		`const x: number = screen.inmouse().x;`,
		`lite.onclick( ( click ) => { void click.buttons; }, false,`,
		`\t{ x: 0, y: 0, width: 4, height: 4 } );`,
		`lite.ontouch( "end", ( touches ) => {`,
		`\tconst lastX: number | null = touches[ 0 ].lastX;`,
		`\tconst cancelled: boolean = touches[ 0 ].cancelled;`,
		`\tvoid lastX;`,
		`\tvoid cancelled;`,
		`} );`,
		`lite.set( { pinchZoom: true, enableContextMenu: false } );`,
		`void x;`,
		`// @ts-expect-error The plugin initializer is not the API.`,
		`pointer.screen( "8x8" );`,
		`// @ts-expect-error Sound commands need the sound plugin.`,
		`lite.sound( 440 );`
	],
	"sound": [
		`const id: string = lite.sound( 440, 0.25 );`,
		`lite.setBusVolume( "music", 0.5 );`,
		`lite.set( { volume: 0.5, soundLimiter: true } );`,
		`void id;`,
		`// @ts-expect-error Polygon commands need the polygons plugin.`,
		`lite.polygon( [ 0, 0, 6, 0, 3, 6 ] );`
	],
	"polygons": [
		`lite.screen( "8x8" ).polygon( [ 0, 0, 6, 0, 3, 6 ], "red" );`,
		`lite.polygon( { points: [ { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 3, y: 6 } ] } );`,
		`// @ts-expect-error Pointer commands need the pointer plugin.`,
		`lite.inmouse();`
	],
	"sound-advanced": [
		`const id: string = lite.synth( { frequency: 220 } );`,
		`lite.stopSound( id );`,
		`lite.set( { busEffect: { bus: "sfx", effect: "delay" } } );`,
		`lite.onPlay( "end", ( data ) => { void data.delay; } );`,
		`// @ts-expect-error Keyboard commands need the keyboard plugin.`,
		`lite.inKey();`
	]
};

/**
 * Creates a temporary pijs-web package with generated declaration files.
 *
 * @returns {{ packageRoot: string, consumersDir: string, cleanup: Function }}
 */
function createConsumerPackage() {
	generateMetadata( { "testOnly": true } );

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
			`const version: "${rootPkg.version}" = pi.version;`,
			`named.screen( "8x8" );`,
			`$.screen( "8x8" );`,
			`pi.polygon( [ 0, 0, 6, 0, 3, 6 ], 4 );`,
			`named.polygon( { points: [ { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 3, y: 6 } ] } );`,
			`const polygonScreen = $.screen( "8x8" );`,
			`for( const Points of [ Int8Array, Uint8Array, Uint8ClampedArray, Int16Array,`,
			`    Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array ] ) {`,
			`    polygonScreen.polygon( new Points( [ 0, 0, 6, 0, 3, 6 ] ), "red" );`,
			`}`,
			`polygonScreen.polygon( { points: new BigInt64Array( [ 0n, 0n, 6n, 0n, 3n, 6n ] ) } );`,
			`polygonScreen.polygon( new BigUint64Array( [ 0n, 0n, 6n, 0n, 3n, 6n ] ), null );`,
			`// @ts-expect-error Points are required.`,
			`pi.polygon();`,
			`// @ts-expect-error DataView is not a polygon point collection.`,
			`pi.polygon( new DataView( new ArrayBuffer( 24 ) ) );`,
			`// @ts-expect-error Point objects need both coordinates.`,
			`polygonScreen.polygon( [ { x: 1 } ] );`,
			`pi.setBusVolume( "music", 0.5 );`,
			`polygonScreen.removeScreen();`,
			`pi.registerPlugin( { name: "commands-consumer", init: ( api ) => {`,
			`\tapi.addCommand( "hello", () => 1, false, [] );`,
			`\tapi.addCommand( "helloScreen", () => 1, true, [ "x" ], true );`,
			`} } );`,
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
			`// @ts-expect-error Lite does not bundle polygons.`,
			`lite.polygon( [ 0, 0, 6, 0, 3, 6 ] );`,
			`// @ts-expect-error Lite screens do not include polygon declarations.`,
			`screen.polygon( { points: [ 0, 0, 6, 0, 3, 6 ] } );`,
			`// @ts-expect-error Lite does not bundle sound.`,
			`lite.setBusVolume( "music", 0.5 );`,
			`// @ts-expect-error Lite has no sound settings.`,
			`lite.set( { volume: 0.5 } );`,
			`// @ts-expect-error Lite has no pointer settings.`,
			`lite.set( { pinchZoom: true } );`,
			`lite.set( { color: "red", font: 1 } );`,
			`screen.removeScreen();`,
			""
		].join( "\n" ),
		"utf8"
	);

	assert.deepEqual(
		Object.keys( LITE_PLUGIN_CONSUMERS ).sort(), [ ...pluginNames ].sort(),
		"every exported plugin needs a Lite consumer"
	);
	for( const [ pluginName, body ] of Object.entries( LITE_PLUGIN_CONSUMERS ) ) {
		const initName = pluginName.replace( /-(\w)/g, ( match, letter ) => letter.toUpperCase() );
		const lines = [ `import lite from "pijs-web/lite";` ];
		if( pluginName === "sound-advanced" ) {
			lines.push(
				`import sound from "pijs-web/plugins/sound";`,
				`import ${initName} from "pijs-web/plugins/${pluginName}";`,
				`lite.registerPlugin( { name: "sound", init: sound } );`,
				`lite.registerPlugin( {`,
				`\tname: "${pluginName}", dependencies: [ "sound" ], init: ${initName}`,
				`} );`
			);
		} else {
			lines.push(
				`import ${initName} from "pijs-web/plugins/${pluginName}";`,
				`lite.registerPlugin( { name: "${pluginName}", init: ${initName} } );`
			);
		}
		fs.writeFileSync(
			path.join( consumersDir, `lite-${pluginName}.mts` ),
			[ ...lines, ...body, "" ].join( "\n" ),
			"utf8"
		);
	}

	fs.writeFileSync(
		path.join( consumersDir, "valid-sound-advanced.mts" ),
		[
			`import pi from "pijs-web";`,
			`import soundAdvanced from "pijs-web/plugins/sound-advanced";`,
			`pi.registerPlugin( {`,
			`\tname: "sound-advanced", dependencies: [ "sound" ], init: soundAdvanced`,
			`} );`,
			`const id: string = pi.synth( { frequency: 220, oType: "pulse", duty: 0.25,`,
			`\tfilterType: "lowpass", filterAmount: 2, arpeggio: [ 0, 4, 7 ] } );`,
			`pi.stopSound( id );`,
			`const coin: string = pi.sfx( "coin", 0.5 );`,
			`void coin;`,
			`pi.definePreset( "zap", { frequency: 1800, frequencyEnd: 300 } );`,
			`const generated: object = pi.generateSfx( "laser", 42, 0.1 );`,
			`pi.definePreset( "zap", generated );`,
			`pi.synth( pi.generateSfx( "coin" ) );`,
			`pi.defineInstrument( 7, { oType: "square" } );`,
			`pi.defineInstrument( 7, null );`,
			`pi.setBusEffect( "sfx", "delay", { time: 0.3 } );`,
			`pi.setBusEffect( "sfx", null );`,
			`pi.setBusEffect( "music", [`,
			`\t{ effect: "filter", cutoff: 600 }, { effect: "reverb" }`,
			`] );`,
			`const levels = pi.getSoundLevels( "master", true );`,
			`const peak: number = levels.peak;`,
			`const bins: number | undefined = levels.spectrum?.length;`,
			`void peak;`,
			`void bins;`,
			`const outputPeak: number = pi.getSoundLevels( "output" ).peak;`,
			`void outputPeak;`,
			`const started: Promise<void> = pi.startRecording( "output", 30, 32 );`,
			`void started.then( () => pi.stopRecording() ).then( ( wav: Blob ) => {`,
			`	pi.saveRecording( wav, "song.wav" );`,
			`} );`,
			`const recording = pi.getRecordingState();`,
			`const recordingState: "idle" | "starting" | "recording" | "full" = recording.state;`,
			`const recorded: number = recording.duration;`,
			`void recordingState;`,
			`void recorded;`,
			`// @ts-expect-error saveRecording needs a Blob.`,
			`pi.saveRecording( "song.wav" );`,
			`// @ts-expect-error Preset names are strings.`,
			`pi.sfx( 5 );`,
			`// @ts-expect-error Categories are strings.`,
			`pi.generateSfx( 5 );`,
			`pi.onPlay( "note", ( data ) => {`,
			`	if( data.type === "note" ) {`,
			`		const pitch: number = data.frequency + data.volume + data.track;`,
			`		void pitch;`,
			`	}`,
			`	const late: number = data.delay;`,
			`	void late;`,
			`}, true );`,
			`const onEnd = ( data: { type: "note" | "end"; trackId: number } ) => {`,
			`	void data.trackId;`,
			`};`,
			`pi.onPlay( { mode: "end", fn: onEnd } );`,
			`pi.offPlay( "end", onEnd );`,
			`pi.offPlay( null, onEnd );`,
			`pi.offPlay( "note" );`,
			`// @ts-expect-error Modes are "note" and "end".`,
			`pi.onPlay( "beat", () => {} );`,
			`pi.onPlay( "note", ( data ) => {`,
			`	// @ts-expect-error Only note data has a frequency.`,
			`	void data.frequency;`,
			`} );`,
			""
		].join( "\n" ),
		"utf8"
	);

	fs.writeFileSync(
		path.join( consumersDir, "false-positive-sound-advanced.mts" ),
		[
			`import pi from "pijs-web";`,
			`pi.synth( { frequency: 440 } );`,
			""
		].join( "\n" ),
		"utf8"
	);

	fs.writeFileSync(
		path.join( consumersDir, "false-positive.mts" ),
		[
			`import { Pi } from "pijs-web";`,
			`import lite from "pijs-web/lite";`,
			`Pi.screen( "8x8" );`,
			`lite.inmouse();`,
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

	return {
		"packageRoot": packageRoot,
		"consumersDir": consumersDir,
		"cleanup": () => fs.rmSync( fixtureDir, { "force": true, "recursive": true } )
	};
}

/**
 * Runs tsc against a consumer file. Naming the file on the command line leaves skipLibCheck
 * off, so conflicts between the package's declaration files are reported.
 *
 * @param {string} consumersDir - Consumer directory.
 * @param {string} fileName - Consumer file name.
 * @param {string} resolution - Module resolution: "bundler" or "nodenext".
 * @returns {{ status: number, stdout: string, stderr: string }}
 */
function runTsc( consumersDir, fileName, resolution ) {
	assert.ok( fs.existsSync( TSC_PATH ), `Missing TypeScript compiler: ${TSC_PATH}` );
	let moduleKind = "esnext";
	if( resolution === "nodenext" ) {
		moduleKind = "nodenext";
	}
	const result = spawnSync(
		process.execPath,
		[
			TSC_PATH,
			"--noEmit",
			"--strict",
			"--module", moduleKind,
			"--moduleResolution", resolution,
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

// Both tests compile consumers of one generated package.
let fixture;
before( () => { fixture = createConsumerPackage(); } );
after( () => { fixture?.cleanup(); } );

test( "positive package consumers typecheck against published declarations", () => {
	const fileNames = [
		"control.mts", "valid-runtime.mts", "valid-lite.mts", "valid-sound-advanced.mts",
		...Object.keys( LITE_PLUGIN_CONSUMERS ).map( ( name ) => `lite-${name}.mts` )
	];
	for( const resolution of RESOLUTIONS ) {
		for( const fileName of fileNames ) {
			const result = runTsc( fixture.consumersDir, fileName, resolution );
			assert.equal(
				result.status,
				0,
				`${fileName} should typecheck under ${resolution}:\n` +
					`${result.stdout}${result.stderr}`
			);
		}
	}
} );

test( "negative package consumers are rejected by published declarations", () => {
	for( const resolution of RESOLUTIONS ) {
		const falsePositive = runTsc( fixture.consumersDir, "false-positive.mts", resolution );
		assert.notEqual(
			falsePositive.status, 0, `false-positive.mts should fail under ${resolution}`
		);
		const output = `${falsePositive.stdout}${falsePositive.stderr}`;
		assert.match( output, /Pi/, "should reject named Pi export" );
		assert.match( output, /inmouse/, "should reject lite.inmouse() without pointer" );

		const liteNamed = runTsc(
			fixture.consumersDir, "false-positive-lite-named.mts", resolution
		);
		assert.notEqual(
			liteNamed.status,
			0,
			`false-positive-lite-named.mts should fail under ${resolution}`
		);
		assert.match(
			`${liteNamed.stdout}${liteNamed.stderr}`,
			/Pi/,
			"should reject named Pi export from lite"
		);

		// sound-advanced commands exist only when the plugin's declarations are imported
		const withoutPlugin = runTsc(
			fixture.consumersDir, "false-positive-sound-advanced.mts", resolution
		);
		assert.notEqual(
			withoutPlugin.status,
			0,
			`false-positive-sound-advanced.mts should fail under ${resolution}`
		);
		assert.match(
			`${withoutPlugin.stdout}${withoutPlugin.stderr}`,
			/synth/,
			"should reject synth() without the sound-advanced plugin"
		);
	}
} );
