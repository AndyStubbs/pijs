/**
 * Pi.js Type Definition Validation Script
 *
 * Checks release-critical Pi.js declarations and ensures the build and
 * documentation copies remain identical.
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	return g_url.pathToFileURL( g_path.resolve( entry ) ).href === import.meta.url;
}
const fs = g_fs;
const path = g_path;

const packageJson = JSON.parse( g_fs.readFileSync( path.join( DIRNAME, "..", "package.json"  ), "utf8" ) );

const BUILD_TYPE_FILE = path.join( DIRNAME, "..", "build", "pi.d.ts" );
const DOCS_TYPE_FILE = path.join( DIRNAME, "..", "docs", "llms", "pi.d.ts" );
const SOUND_ADVANCED_TYPE_FILE = path.join(
	DIRNAME, "..", "build", "plugins", "sound-advanced", "sound-advanced.d.ts"
);

// Commands of a standalone plugin, declared in its own file rather than pi.d.ts
const SOUND_ADVANCED_DECLARATIONS = [
	"declare module \"pijs-web\" {",
	"interface PluginCommands {",
	"synth( params: {",
	"sfx( name: string, variation?: number ): string;",
	"definePreset( name: string, params: object ): void;",
	"defineInstrument( instrument: number, params: object | null ): void;",
	"setBusVolume( bus: string, volume: number ): void;",
	"setBusEffect( bus: string, effect: string | null, options?: object ): void;",
	"getSoundLevels( bus?: string, spectrum?: boolean, waveform?: boolean ): {",
	"declare function sound_advancedPlugin( pluginApi: PluginAPI ): void;"
];

const REQUIRED_DECLARATIONS = [
	{
		"name": "loadImage object overload without palette options",
		"text": "loadImage( params: { \"src\": string | HTMLImageElement | HTMLCanvasElement; " +
			"\"name\"?: string; \"onLoad\"?: ( name: string ) => void; " +
			"\"onError\"?: ( error: Error ) => void } ): string;"
	},
	{
		"name": "loadImage positional callbacks",
		"text": "loadImage( src: string | HTMLImageElement | HTMLCanvasElement, name?: string, " +
			"onLoad?: ( name: string ) => void, onError?: ( error: Error ) => void ): string;"
	},
	{
		"name": "loadSpritesheet object overload without palette options",
		"text": "loadSpritesheet( params: { \"src\": string | HTMLImageElement | HTMLCanvasElement; " +
			"\"name\"?: string; \"width\"?: number; \"height\"?: number; \"margin\"?: number; " +
			"\"onLoad\"?: ( name: string ) => void; \"onError\"?: ( error: Error ) => void } ): string;"
	},
	{
		"name": "loadSpritesheet positional callbacks",
		"text": "loadSpritesheet( src: string | HTMLImageElement | HTMLCanvasElement, " +
			"name?: string, width?: number, height?: number, margin?: number, " +
			"onLoad?: ( name: string ) => void, onError?: ( error: Error ) => void ): string;"
	},
	{
		"name": "shader uniform map type",
		"text": "type ShaderUniforms = Record<string, ShaderUniformValue>;"
	},
	{
		"name": "createShader object overload return type",
		"text": "createShader( params: { \"fragmentSource\": string; " +
			"\"uniforms\"?: ShaderUniforms } ): number;"
	},
	{
		"name": "createShader positional overload return type",
		"text": "createShader( fragmentSource: string, uniforms?: ShaderUniforms ): number;"
	},
	{
		"name": "shader diagnostic type",
		"text": "interface ShaderInfo {"
	},
	{
		"name": "getShaderInfo return type",
		"text": "getShaderInfo( shaderHandle: number ): ShaderInfo;"
	},
	{
		"name": "removeShader signature",
		"text": "removeShader( shaderHandle: number ): void;"
	},
	{
		"name": "viewToScreen return type",
		"text": "viewToScreen( x: number, y: number ): PositionPx;"
	},
	{
		"name": "screenToView return type",
		"text": "screenToView( x: number, y: number ): PositionPx;"
	},
	{
		"name": "width return type",
		"text": "width(): number;"
	},
	{
		"name": "height return type",
		"text": "height(): number;"
	},
	{
		"name": "screen object overload parent, noCss, and return type",
		"text": "screen( params: { \"aspect\": string; " +
			"\"container\"?: string | HTMLElement; \"isOffscreen\"?: boolean; " +
			"\"resizeCallback\"?: ( screenApi: Screen, fromSize: Size, " +
			"toSize: Size ) => void; \"parent\"?: number | Screen; \"noCss\"?: boolean } ): Screen;"
	},
	{
		"name": "screen positional overload parent, noCss, and return type",
		"text": "screen( aspect: string, container?: string | HTMLElement, " +
			"isOffscreen?: boolean, resizeCallback?: ( screenApi: Screen, " +
			"fromSize: Size, toSize: Size ) => void, parent?: number | Screen, " +
			"noCss?: boolean ): Screen;"
	},
	{
		"name": "plugin service provider",
		"text": "provideService: ( service: object ) => void;"
	},
	{
		"name": "plugin service lookup",
		"text": "getService: ( pluginName: string ) => any;"
	},
	{
		"name": "sound positional overload with ADSR, pan, and sweep",
		"text": "sound( frequency?: number, duration?: number, volume?: number, " +
			"oType?: string | any[], delay?: number, attackTime?: number, " +
			"decayTime?: number, sustainLevel?: number, releaseTime?: number, pan?: number, " +
			"frequencyEnd?: number ): string;"
	},
	{
		"name": "sound limiter switch",
		"text": "setSoundLimiter( enabled: boolean ): void;"
	},
	{
		"name": "decoded or streamed audio loading",
		"text": "loadAudio( src: string, name?: string, stream?: boolean ): string;"
	},
	{
		"name": "audio instance playback",
		"text": "playAudio( audioId: string, volume?: number, startTime?: number, " +
			"duration?: number, loop?: boolean, playbackRate?: number, pan?: number, " +
			"delay?: number ): number;"
	},
	{
		"name": "audio instance controls",
		"text": "setAudio( instanceId: number, volume?: number, playbackRate?: number, " +
			"pan?: number ): void;"
	},
	{
		"name": "audio pause by instance or audio ID",
		"text": "pauseAudio( id?: number | string ): void;"
	}
];

/**
 * Reads a required declaration file.
 *
 * @param {string} filePath - Declaration file path.
 * @returns {string} Declaration file contents.
 */
function readTypeFile( filePath ) {
	if( !fs.existsSync( filePath ) ) {
		throw new Error( `Missing type definition file: ${filePath}` );
	}
	return fs.readFileSync( filePath, "utf8" );
}

/**
 * Validates generated declaration parity and release-critical Pi.js signatures.
 *
 * @returns {void}
 */
function validateTypeDefinitions() {
	const buildTypes = readTypeFile( BUILD_TYPE_FILE );
	const docsTypes = readTypeFile( DOCS_TYPE_FILE );

	if( buildTypes !== docsTypes ) {
		throw new Error( "build/pi.d.ts and docs/llms/pi.d.ts are not identical." );
	}

	const expectedVersion = `Version: pi-${packageJson.majorVersion}`;
	if( !buildTypes.includes( expectedVersion ) ) {
		throw new Error( `Type definitions do not contain ${expectedVersion}.` );
	}

	const expectedVersionLiteral = `readonly version: "${packageJson.version}";`;
	if( !buildTypes.includes( expectedVersionLiteral ) ) {
		throw new Error(
			`Type definitions do not contain version literal ${expectedVersionLiteral}.`
		);
	}

	const requiredExports = [
		{ "name": "plugin command interface", "text": "export interface PluginCommands {}" },
		{
			"name": "API extension by plugin commands",
			"text": "interface API extends Screen, PluginCommands {"
		},
		{ "name": "named pi and $ exports", "text": "export { pi, $ };" },
		{ "name": "default pi export", "text": "export default pi;" },
		{ "name": "module pi declaration", "text": "declare const pi: Pi.API;" },
		{ "name": "module $ declaration", "text": "declare const $: Pi.API;" }
	];
	for( const declaration of requiredExports ) {
		if( !buildTypes.includes( declaration.text ) ) {
			throw new Error( `Missing or incorrect ${declaration.name}.` );
		}
	}

	if(
		buildTypes.includes( "export { Pi," ) ||
		buildTypes.includes( "declare var Pi:" ) ||
		buildTypes.includes( "declare const Pi:" )
	) {
		throw new Error(
			"Type definitions still export or declare capital Pi instead of pi."
		);
	}

	for( const declaration of REQUIRED_DECLARATIONS ) {
		if( !buildTypes.includes( declaration.text ) ) {
			throw new Error( `Missing or incorrect ${declaration.name}.` );
		}
	}
	if( /\b(usePalette|paletteKeys)\b/.test( buildTypes ) ) {
		throw new Error( "Type definitions still expose removed image palette options." );
	}

	const liteTypes = readTypeFile(
		path.join( DIRNAME, "..", "build", "pi.lite.d.ts" )
	);
	if( /^\t\tinmouse\(/m.test( liteTypes ) ) {
		throw new Error( "Lite type definitions incorrectly include plugin command inmouse." );
	}
	if( !/^\t\tinmouse\(/m.test( buildTypes ) ) {
		throw new Error( "Full type definitions are missing plugin command inmouse." );
	}

	// Standalone plugin commands stay out of pi.d.ts and augment it from the plugin file
	if( /^\t\tsynth\(/m.test( buildTypes ) ) {
		throw new Error( "Full type definitions incorrectly include plugin command synth." );
	}
	const advancedTypes = readTypeFile( SOUND_ADVANCED_TYPE_FILE );
	for( const text of SOUND_ADVANCED_DECLARATIONS ) {
		if( !advancedTypes.includes( text ) ) {
			throw new Error( `sound-advanced type definitions are missing: ${text}` );
		}
	}

	console.log(
		"✓ Type definitions are current and contain the required " +
		`Pi.js ${packageJson.majorVersion} APIs.`
	);
}

if( isMainModule() ) {
	try {
		validateTypeDefinitions();
	} catch( error ) {
		console.error( `✗ Type definition validation failed: ${error.message}` );
		process.exit( 1 );
	}
}

export { validateTypeDefinitions };
