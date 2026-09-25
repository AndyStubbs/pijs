/**
 * Core 2.3 audit probes: reproductions for the findings in docs/plans/CORE-V2.3-AUDIT.md.
 *
 * Browser probes run in Chromium, Firefox, and WebKit against fresh in-memory bundles of the
 * current source and use only the public API. Declaration probes compile small consumers with
 * the repository's TypeScript against a package assembled in a temporary folder from `build/`
 * and `releases/pi-latest/package.json`, so run `npm run build` first if `build/` is stale.
 * The script changes no library code, tests, or build output.
 *
 * Run with `node docs/evidence/core-2.3/probes.js`; it writes `probes-output.json` next to this
 * file. No server is required.
 */
import * as g_fs from "node:fs/promises";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_childProcess from "node:child_process";
import * as g_playwright from "@playwright/test";
import * as g_harness from "../../../test/unit/browser-source-harness.js";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const ROOT = g_path.resolve( DIRNAME, "../../.." );
const OUTPUT_FILE = g_path.join( DIRNAME, "probes-output.json" );
const EMPTY_PAGE = "<!doctype html><html><body></body></html>";
const ENGINES = [ "chromium", "firefox", "webkit" ];
const ORIGIN = "http://localhost:8080";


/*************************************************************************************************
 * Browser Probes
 ************************************************************************************************/

// Each probe names the bundle it loads and a page function that returns
// `{ observed, expected, confirmed }`. `confirmed` is true when the observed behavior differs
// from the expected contract.

const PROBES = {};

/** CORE-001: the shared offscreen context after its last member is removed. */
PROBES.C01 = {
	"bundle": "full",
	"fn": async () => {
		const wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );
		const read = s => {
			const p = s.getPixel( 1, 1 );
			return [ p.r, p.g, p.b, p.a ];
		};
		async function scenario( keepMember ) {
			const a = $.screen( { "aspect": "4x4", "isOffscreen": true } );
			const gl = a.canvas().getContext( "webgl2" );
			const ext = gl.getExtension( "WEBGL_lose_context" );
			if( !keepMember ) {
				a.removeScreen();
			}
			ext.loseContext();
			await wait( 100 );
			let restoreError = null;
			try {
				ext.restoreContext();
			} catch( error ) {
				restoreError = error.name;
			}
			await wait( 300 );
			const b = $.screen( { "aspect": "4x4", "isOffscreen": true } );
			b.setColor( "#ff0000" );
			b.pset( 1, 1 );
			const result = {
				"sameContext": b.canvas().getContext( "webgl2" ) === gl,
				"isContextLost": gl.isContextLost(),
				restoreError,
				"pixel": read( b )
			};
			b.removeScreen();
			if( keepMember ) {
				a.removeScreen();
			}
			return result;
		}
		const control = await scenario( true );
		const removed = await scenario( false );
		return {
			"observed": { control, removed },
			"expected": "both scenarios draw red [255,0,0,255] on a restored context",
			"confirmed": removed.pixel[ 0 ] !== 255 && control.pixel[ 0 ] === 255
		};
	}
};

/** CORE-002: a plugin whose init throws keeps its commands, settings, and hooks. */
PROBES.C02 = {
	"bundle": "lite",
	"fn": () => {
		const calls = { "screenInit": 0, "setBad": 0, "clear": 0 };
		let registerError = null;
		try {
			$.registerPlugin( {
				"name": "bad",
				"init": api => {
					api.addCommand( "badCmd", () => "bad", true, [] );
					api.addCommand( "setBad", () => calls.setBad++, false, [ "value" ] );
					api.addScreenInitFunction( () => calls.screenInit++ );
					api.registerClearEvents( "bad", () => calls.clear++ );
					throw new Error( "init failed" );
				}
			} );
		} catch( error ) {
			registerError = error.code;
		}
		const s = $.screen( "8x8" );
		$.set( { "bad": 7 } );
		$.clearEvents();
		let reregister = null;
		try {
			$.registerPlugin( { "name": "bad", "init": () => {} } );
			reregister = "ok";
		} catch( error ) {
			reregister = error.code;
		}
		const observed = {
			registerError,
			"globalBadCmd": typeof $.badCmd,
			"newScreenBadCmd": typeof s.badCmd,
			...calls,
			reregister
		};
		return {
			observed,
			"expected": "PLUGIN_INIT_FAILED; no badCmd anywhere; no calls; the name can be reused",
			"confirmed": observed.newScreenBadCmd === "function" || calls.screenInit > 0 ||
				calls.setBad > 0 || calls.clear > 0 || reregister !== "ok"
		};
	}
};

/** CORE-002: a late plugin whose screen init fails on the second existing screen. */
PROBES.C02b = {
	"bundle": "lite",
	"fn": () => {
		const first = $.screen( "8x8" );
		const second = $.screen( "8x8" );
		let registerError = null;
		try {
			$.registerPlugin( {
				"name": "late",
				"init": api => {
					api.addCommand( "lateCmd", () => 1, true, [] );
					api.addScreenInitFunction( screenData => {
						if( screenData.id === second.id ) {
							throw new Error( "second screen failed" );
						}
					} );
				}
			} );
		} catch( error ) {
			registerError = error.code;
		}
		const third = $.screen( "8x8" );
		const observed = {
			registerError,
			"global": typeof $.lateCmd,
			"first": typeof first.lateCmd,
			"second": typeof second.lateCmd,
			"third": typeof third.lateCmd
		};
		return {
			observed,
			"expected": "PLUGIN_INIT_FAILED and lateCmd on no screen",
			"confirmed": [ observed.first, observed.second, observed.third ].includes( "function" )
		};
	}
};

/** CORE-003: initialization errors reach callers whose own plugin succeeded. */
PROBES.C03 = {
	"bundle": "lite",
	"fn": () => {
		const outcome = fn => {
			try {
				fn();
				return "returned";
			} catch( error ) {
				return error.message;
			}
		};
		const nested = {};
		nested.outer = outcome( () => $.registerPlugin( {
			"name": "outer",
			"init": () => {
				nested.inner = outcome( () => $.registerPlugin( {
					"name": "inner",
					"init": () => {
						throw new Error( "inner failed" );
					}
				} ) );
			}
		} ) );
		nested.outerInitialized = $.getPlugins().find( p => p.name === "outer" ).initialized;
		$.registerPlugin( { "name": "b", "dependencies": [ "a" ], "init": () => {
			throw new Error( "b failed" );
		} } );
		$.registerPlugin( { "name": "c", "dependencies": [ "a" ], "init": () => {} } );
		const pending = {};
		pending.registerA = outcome( () => $.registerPlugin( { "name": "a", "init": () => {} } ) );
		pending.states = $.getPlugins().filter( p => [ "a", "b", "c" ].includes( p.name ) )
			.map( p => p.name + ":" + p.initialized );
		return {
			"observed": { nested, pending },
			"expected": "each registerPlugin call reports only its own plugin's failure",
			"confirmed": nested.outer !== "returned" || pending.registerA !== "returned"
		};
	}
};

/** CORE-006: an explicit undefined is not treated as an omitted argument. */
PROBES.C06 = {
	"bundle": "full",
	"fn": () => {
		const outcome = fn => {
			try {
				fn();
				return "ok";
			} catch( error ) {
				return error.code || error.name;
			}
		};
		$.screen( "32x32" );
		const canvas = document.createElement( "canvas" );
		canvas.width = 16;
		canvas.height = 16;
		const observed = {
			"setPos(undefined, 2)": outcome( () => $.setPos( undefined, 2 ) ),
			"setPos(null, 2)": outcome( () => $.setPos( null, 2 ) ),
			"paint(5, 5, 2, 0, undefined)": outcome( () => $.paint( 5, 5, 2, 0, undefined ) ),
			"paint(5, 5, 2, 0)": outcome( () => $.paint( 5, 5, 2, 0 ) ),
			"loadSpritesheet(c, 'a', undefined, undefined)": outcome(
				() => $.loadSpritesheet( canvas, "a", undefined, undefined )
			),
			"loadSpritesheet(c, 'b', 8, 8, undefined)": outcome(
				() => $.loadSpritesheet( canvas, "b", 8, 8, undefined )
			),
			"set({ color: undefined })": outcome( () => $.set( { "color": undefined } ) ),
			"set({ color: null })": outcome( () => $.set( { "color": null } ) )
		};
		const undefinedCases = Object.keys( observed ).filter( k => k.includes( "undefined" ) );
		return {
			observed,
			"expected": "every undefined case behaves like its omitted or null form: ok",
			"confirmed": undefinedCases.some( k => observed[ k ] !== "ok" )
		};
	}
};

/** CORE-007: set() with unknown, inherited, and plugin-only names, and with no screen. */
PROBES.C07 = {
	"bundle": "lite",
	"fn": () => {
		const outcome = fn => {
			try {
				fn();
				return "ok";
			} catch( error ) {
				return ( error.code || error.name ) + ": " + error.message;
			}
		};
		const noScreen = outcome( () => $.set( { "color": 1 } ) );
		$.screen( "8x8" );
		const observed = {
			"noScreen": noScreen,
			"unknown": outcome( () => $.set( { "notARealOption": 1 } ) ),
			"nonObject": outcome( () => $.set( 5 ) ),
			"inherited": outcome( () => $.set( { "toString": 1 } ) ),
			"liteVolume": outcome( () => $.set( { "volume": 0.5 } ) ),
			"litePinchZoom": outcome( () => $.set( { "pinchZoom": true } ) )
		};
		return {
			observed,
			"expected": "unknown, inherited, and unavailable names and a missing screen throw " +
				"coded errors",
			"confirmed": observed.unknown === "ok" || observed.liteVolume === "ok" ||
				!observed.noScreen.startsWith( "NO_" ) ||
				observed.inherited.startsWith( "TypeError" )
		};
	}
};

/** CORE-008: getPal( false ) includes index 0. */
PROBES.C08 = {
	"bundle": "full",
	"fn": () => {
		$.screen( "8x8" );
		const observed = {
			"getPal()": $.getPal().length,
			"getPal(false)": $.getPal( false ).length,
			"getPal(true)": $.getPal( true ).length,
			"getDefaultPal()": $.getDefaultPal().length,
			"getDefaultPal(false)": $.getDefaultPal( false ).length
		};
		return {
			observed,
			"expected": "false matches the default and excludes index 0",
			"confirmed": observed[ "getPal(false)" ] !== observed[ "getPal()" ]
		};
	}
};

/** CORE-009: setChar on the default font, and texture uploads while printing. */
PROBES.C09 = {
	"bundle": "full",
	"fn": () => {
		const s = $.screen( "32x16" );
		const lit = () => $.get( 0, 0, 32, 16 ).flat().filter( index => index !== 0 ).length;
		const results = {};
		for( const font of [ 1, 2 ] ) {
			$.cls();
			$.setFont( font );
			$.setPos( 0, 0 );
			$.print( "A", true );
			const before = lit();
			const size = font === 1 ? [ 6, 8 ] : [ 8, 8 ];
			const solid = Array.from( { "length": size[ 1 ] }, () => Array( size[ 0 ] ).fill( 1 ) );
			$.setChar( "A", solid );
			$.cls();
			$.setPos( 0, 0 );
			$.print( "A", true );
			results[ "font" + font ] = {
				before, "afterSolidGlyph": lit(), "expected": size[ 0 ] * size[ 1 ]
			};
		}
		const gl = s.canvas().getContext( "webgl2" );
		const uploads = {};
		for( const font of [ 1, 2 ] ) {
			$.setFont( font );
			$.print( "X", true );
			$.getPixel( 0, 0 );
			let count = 0;
			const original = gl.texImage2D;
			gl.texImage2D = function( ...args ) {
				count++;
				return original.apply( this, args );
			};
			$.print( "HELLO", true );
			$.getPixel( 0, 0 );
			gl.texImage2D = original;
			uploads[ "font" + font ] = count;
		}
		return {
			"observed": { results, "texImage2DPerHELLO": uploads },
			"expected": "setChar changes the drawn glyph on both fonts; printing uploads nothing",
			"confirmed": results.font1.afterSolidGlyph !== results.font1.expected
		};
	}
};

/** CORE-010: getImage with an offscreen screen. */
PROBES.C10 = {
	"bundle": "full",
	"fn": () => {
		$.screen( "8x8" );
		const off = $.screen( { "aspect": "8x8", "isOffscreen": true } );
		let observed;
		try {
			const image = $.getImage( off );
			observed = "returned " + typeof image;
		} catch( error ) {
			observed = error.name + " (code " + error.code + "): " + error.message;
		}
		return {
			observed,
			"expected": "an image, or a coded error",
			"confirmed": observed.startsWith( "TypeError (code undefined)" )
		};
	}
};

/** CORE-011: polygon coordinates past 2^31. */
PROBES.C11 = {
	"bundle": "full",
	"fn": () => {
		$.screen( "20x12" );
		const rowCounts = points => {
			$.cls();
			$.polygon( points, 4 );
			return $.get( 0, 0, 20, 12 ).map( row => row.filter( index => index !== 0 ).length );
		};
		const small = rowCounts( [ 0, 0, 2000000000, 0, 0, 10 ] );
		const large = rowCounts( [ 0, 0, 3000000000, 0, 0, 10 ] );
		return {
			"observed": { "x2e9": small.slice( 0, 5 ), "x3e9": large.slice( 0, 5 ) },
			"expected": "rows 0-4 fully lit (20 pixels) in both",
			"confirmed": large.slice( 0, 3 ).some( count => count < 20 )
		};
	}
};

/** CORE-012: numeric validation gaps. */
PROBES.C12 = {
	"bundle": "full",
	"fn": () => {
		const outcome = fn => {
			try {
				const value = fn();
				return value === undefined ? "ok" : value;
			} catch( error ) {
				return error.code || error.name;
			}
		};
		$.screen( "32x32" );
		const lit = () => $.get( 0, 0, 32, 32 ).flat().filter( index => index !== 0 ).length;
		const arcPixels = ( a1, a2 ) => {
			$.cls();
			$.arc( 16, 16, 8, a1, a2 );
			return lit();
		};
		const observed = {
			"arc(0, 360) pixels": arcPixels( 0, 360 ),
			"arc(0, Infinity) pixels": outcome( () => arcPixels( 0, Infinity ) ),
			"arc(Infinity, Infinity) pixels": outcome( () => arcPixels( Infinity, Infinity ) ),
			"loadFont(width 0)": outcome(
				() => $.loadFont( document.createElement( "canvas" ), 0, 8 )
			),
			"loadFont(width 6.4)": outcome(
				() => typeof $.loadFont( document.createElement( "canvas" ), 6.4, 8 )
			),
			"loadFont(margin -1)": outcome(
				() => typeof $.loadFont( document.createElement( "canvas" ), 6, 8, -1 )
			),
			"setPrintSize(1, 1, -6) then getPos().col": outcome( () => {
				$.setFont( 1 );
				$.setPrintSize( 1, 1, -6 );
				$.setPosPx( 12, 0 );
				return String( $.getPos().col );
			} )
		};
		return {
			observed,
			"expected": "non-finite angles, zero or fractional sizes, and negative margins or " +
				"padding throw coded errors",
			"confirmed": observed[ "arc(0, Infinity) pixels" ] !== "INVALID_PARAMETER"
		};
	}
};

/** CORE-013: characters outside the font's table. */
PROBES.C13 = {
	"bundle": "full",
	"fn": () => {
		$.screen( "48x8" );
		const cells = () => $.get( 0, 0, 48, 8 ).map( row => row.join( "," ) ).join( ";" );
		const litIn = text => {
			$.cls();
			$.setPos( 0, 0 );
			$.print( text, true );
			return {
				"lit": $.get( 0, 0, 48, 8 ).flat().filter( index => index !== 0 ).length,
				"cursorX": $.getPosPx().x
			};
		};
		const drawn = text => {
			$.cls();
			$.setPos( 0, 0 );
			$.print( text, true );
			return cells();
		};
		const observed = {
			"日": litIn( "日" ),
			"😀": litIn( "😀" ),
			"é": litIn( "é" ),
			"é draws cell 233": drawn( "é" ) === drawn( String.fromCharCode( 233 ) ),
			"é matches CP437 é (cell 130)": drawn( "é" ) === drawn( String.fromCharCode( 130 ) ),
			"calcWidth(😀)": $.calcWidth( "😀" )
		};
		return {
			observed,
			"expected": "documented handling; é drawn as é; one cell per character",
			"confirmed": observed[ "日" ].lit === 0 && !observed[ "é matches CP437 é (cell 130)" ]
		};
	}
};

/** CORE-014: removeScreen forms that the declarations allow. */
PROBES.C14 = {
	"bundle": "full",
	"fn": () => {
		const outcome = fn => {
			try {
				fn();
				return "ok";
			} catch( error ) {
				return error.name + " (code " + error.code + "): " + error.message;
			}
		};
		const s = $.screen( "8x8" );
		const observed = {
			"removeScreen()": outcome( () => $.removeScreen() ),
			"removeScreen(null)": outcome( () => $.removeScreen( null ) ),
			"removeScreen({ screen })": outcome( () => $.removeScreen( { "screen": s } ) ),
			"screensAfterObjectForm": $.getAllScreens().length
		};
		return {
			observed,
			"expected": "coded errors for missing screens; the object form removes the screen",
			"confirmed": observed.screensAfterObjectForm === 1
		};
	}
};


/*************************************************************************************************
 * Page-Level Probes
 ************************************************************************************************/


/**
 * CORE-004: a standalone plugin loaded after the Full bundle, as IIFE and as ESM.
 *
 * @param {Object} browser - Playwright browser.
 * @param {Object} code - Bundles keyed by name.
 * @returns {Promise<Object>} Probe result.
 */
async function probeDuplicatePlugin( browser, code ) {
	const context = await browser.newContext();
	await context.route( ORIGIN + "/**", route => {
		const name = new URL( route.request().url() ).pathname.slice( 1 );
		if( code[ name ] ) {
			return route.fulfill( {
				"contentType": "application/javascript", "body": code[ name ]
			} );
		}
		return route.fulfill( {
			"contentType": "text/html",
			"body": name === "esm.html" ?
				"<!doctype html><script type=\"module\">import pi from \"/pi.esm.js\";" +
				"import \"/keyboard.esm.js\";window.appRan = typeof pi.screen;</script>" :
				"<!doctype html><script src=\"/pi.js\"></script>" +
				"<script src=\"/keyboard.js\"></script>" +
				"<script>window.appRan = typeof pi.inkey;</script>"
		} );
	} );
	const results = {};
	for( const form of [ "iife", "esm" ] ) {
		const page = await context.newPage();
		const pageErrors = [];
		page.on( "pageerror", error => pageErrors.push( error.message ) );
		await page.goto( ORIGIN + "/" + form + ".html" );
		await page.waitForTimeout( 200 );
		const appRan = await page.evaluate( () => window.appRan || null );
		results[ form ] = { appRan, pageErrors };
		await page.close();
	}
	await context.close();
	return {
		"observed": results,
		"expected": "the already bundled plugin is skipped and the application runs",
		"confirmed": results.esm.appRan === null ||
			results.iife.pageErrors.some( message => message.includes( "already registered" ) )
	};
}

/**
 * CORE-005: user clearEvents() removes the on-screen keyboard's press subscriptions.
 *
 * @param {Object} browser - Playwright browser.
 * @param {Object} code - Bundles keyed by name.
 * @returns {Promise<Object>} Probe result.
 */
async function probeClearEvents( browser, code ) {
	const page = await browser.newPage( { "viewport": { "width": 400, "height": 280 } } );
	const pageErrors = [];
	page.on( "pageerror", error => pageErrors.push( error.message ) );
	try {
		await page.setContent( EMPTY_PAGE );
		for( const name of [ "pi.js", "print-table.js", "onscreen-keyboard.js" ] ) {
			await page.addScriptTag( { "content": code[ name ] } );
		}
		await page.evaluate( async () => {
			$.screen( { "aspect": "400x280" } );
			$.setFont( 2 );
			await $.ready();
			$.showKeyboard( "number" );
			window.keys = [];
			setInterval( () => {
				for( const key of $.inkey() || [] ) {
					window.keys.push( key.key );
				}
			}, 5 );
		} );
		const box = await page.evaluate( () => {
			const rect = $.canvas().getBoundingClientRect();
			return { "x": rect.left, "y": rect.top, "scale": rect.width / 400 };
		} );
		const tap = async () => {
			await page.mouse.move( box.x + 10 * box.scale, box.y + 35 * box.scale );
			await page.mouse.down();
			await page.waitForTimeout( 60 );
			await page.mouse.up();
			await page.waitForTimeout( 60 );
			return page.evaluate( () => window.keys.splice( 0 ) );
		};
		const before = await tap();
		await page.evaluate( () => $.clearEvents( "press" ) );
		const afterPress = await tap();
		const observed = { "beforeClear": before, "afterClearPress": afterPress };
		return {
			observed,
			"expected": "the key registers before and after the user clears press events",
			"confirmed": before.length > 0 && afterPress.length === 0,
			pageErrors
		};
	} finally {
		await page.close();
	}
}


/*************************************************************************************************
 * Declaration Probes
 ************************************************************************************************/

const CONSUMERS = {
	"screen-remove.mts": "import pi from \"pijs-web\";\npi.screen( \"8x8\" ).removeScreen();\n",
	"lite-keyboard.mts": "import lite from \"pijs-web/lite\";\n" +
		"import \"pijs-web/plugins/keyboard\";\nlite.inkey();\n",
	"lite-sound-advanced.mts": "import lite from \"pijs-web/lite\";\n" +
		"import \"pijs-web/plugins/sound-advanced\";\nlite.synth( { \"frequency\": 220 } );\n",
	"plugin-addcommand.mts": "import type { PluginAPI } from \"pijs-web\";\n" +
		"export function plugin( api: PluginAPI ): void {\n" +
		"\tapi.addCommand( \"hello\", () => 1, false, [] );\n}\n",
	"lite-options.mts": "import lite from \"pijs-web/lite\";\n" +
		"lite.set( { \"volume\": 0.5, \"pinchZoom\": true } );\n",
	"default-import.mts": "import pi from \"pijs-web\";\npi.screen( \"8x8\" );\n"
};

// Expected TypeScript result per consumer when the declarations match runtime behavior
const CONSUMER_EXPECTED = {
	"screen-remove.mts": "compiles",
	"lite-keyboard.mts": "compiles",
	"lite-sound-advanced.mts": "compiles",
	"plugin-addcommand.mts": "compiles",
	"lite-options.mts": "error",
	"default-import.mts": "compiles"
};

/**
 * Assemble the release package from build/ in a temporary folder and compile each consumer
 * under bundler and nodenext resolution.
 *
 * @returns {Promise<Object>} Probe result.
 */
async function probeDeclarations() {
	const temp = await g_fs.mkdtemp( g_path.join( g_os.tmpdir(), "pijs-core-probe-" ) );
	try {
		const packageDir = g_path.join( temp, "node_modules", "pijs-web" );
		const manifest = JSON.parse( await g_fs.readFile(
			g_path.join( ROOT, "releases", "pi-latest", "package.json" ), "utf8"
		) );
		await g_fs.mkdir( packageDir, { "recursive": true } );
		await g_fs.writeFile(
			g_path.join( packageDir, "package.json" ), JSON.stringify( manifest, null, "\t" )
		);
		for( const target of Object.values( manifest.exports ) ) {
			for( const file of [ target.types, target.import ] ) {
				const relative = file.replace( /^\.\/dist\//, "" );
				const destination = g_path.join( packageDir, "dist", relative );
				await g_fs.mkdir( g_path.dirname( destination ), { "recursive": true } );
				await g_fs.copyFile( g_path.join( ROOT, "build", relative ), destination );
			}
		}
		const results = {};
		const tsc = g_path.join( ROOT, "node_modules", "typescript", "bin", "tsc" );
		for( const [ name, source ] of Object.entries( CONSUMERS ) ) {
			await g_fs.writeFile( g_path.join( temp, name ), source );
			results[ name ] = {};
			for( const resolution of [ "bundler", "nodenext" ] ) {
				const module = resolution === "bundler" ? "esnext" : "nodenext";
				const args = [
					tsc, "--noEmit", "--strict", "--target", "es2020", "--lib", "es2020,dom",
					"--module", module, "--moduleResolution", resolution, name
				];
				const run = g_childProcess.spawnSync( process.execPath, args, {
					"cwd": temp, "encoding": "utf8"
				} );
				const errors = ( run.stdout.match( /error TS\d+: [^\r\n]+/g ) || [] ).map(
					line => line.replace( /'[^']*node_modules[^']*'/g, "'<package>'" )
				);
				results[ name ][ resolution ] = errors.length ? errors : "compiles";
			}
		}
		const mismatches = Object.keys( results ).filter( name => {
			const expected = CONSUMER_EXPECTED[ name ];
			return Object.values( results[ name ] ).some(
				result => ( result === "compiles" ) !== ( expected === "compiles" )
			);
		} );
		return {
			"observed": results,
			"expected": CONSUMER_EXPECTED,
			"confirmed": mismatches.length > 0,
			mismatches
		};
	} finally {
		await g_fs.rm( temp, { "recursive": true, "force": true } );
	}
}


/*************************************************************************************************
 * Runner
 ************************************************************************************************/


/**
 * Run one page-function probe in a fresh page.
 *
 * @param {Object} browser - Playwright browser.
 * @param {string[]} scripts - Bundles to inject, in order.
 * @param {Function} fn - Probe page function.
 * @returns {Promise<Object>} Probe result plus page errors.
 */
async function runProbe( browser, scripts, fn ) {
	const page = await browser.newPage();
	const pageErrors = [];
	page.on( "pageerror", error => pageErrors.push( error.message ) );
	try {
		await page.setContent( EMPTY_PAGE );
		for( const content of scripts ) {
			await page.addScriptTag( { "content": content } );
		}
		await page.evaluate( () => $.ready() );
		const result = await page.evaluate( fn );
		result.pageErrors = pageErrors;
		return result;
	} catch( error ) {
		return { "error": error.message.split( "\n" )[ 0 ], pageErrors };
	} finally {
		await page.close();
	}
}

async function main() {
	const code = {
		"full": await g_harness.buildSource( "src/index-full.js" ),
		"lite": await g_harness.buildSource( "src/index.js" ),
		"pi.esm.js": await g_harness.buildSource( "src/index-full.js", "esm" ),
		"keyboard.esm.js": await g_harness.buildSource( "plugins/keyboard/index.js", "esm" ),
		"keyboard.js": await g_harness.buildSource( "plugins/keyboard/index.js" ),
		"print-table.js": await g_harness.buildSource( "plugins/print-table/index.js" ),
		"onscreen-keyboard.js": await g_harness.buildSource( "plugins/onscreen-keyboard/index.js" )
	};
	code[ "pi.js" ] = code.full;
	const revision = g_childProcess.execFileSync( "git", [ "rev-parse", "--short", "HEAD" ], {
		"encoding": "utf8"
	} ).trim();
	const output = { revision, "engines": {}, "declarations": null };

	for( const engine of ENGINES ) {
		const browser = await g_playwright[ engine ].launch( { "headless": true } );
		const results = { "version": browser.version(), "probes": {} };
		for( const [ id, probe ] of Object.entries( PROBES ) ) {
			results.probes[ id ] = await runProbe( browser, [ code[ probe.bundle ] ], probe.fn );
		}
		results.probes.C04 = await probeDuplicatePlugin( browser, code );
		results.probes.C05 = await probeClearEvents( browser, code );
		await browser.close();
		output.engines[ engine ] = results;
		const confirmed = Object.keys( results.probes ).filter(
			id => results.probes[ id ].confirmed
		).sort();
		console.log( `${engine} ${results.version}: confirmed ${confirmed.join( ", " )}` );
	}

	output.declarations = await probeDeclarations();
	console.log( "declarations: mismatches " + output.declarations.mismatches.join( ", " ) );

	await g_fs.writeFile( OUTPUT_FILE, JSON.stringify( output, null, "\t" ) + "\n" );
	console.log( "Wrote " + g_path.relative( process.cwd(), OUTPUT_FILE ) );
}

await main();
