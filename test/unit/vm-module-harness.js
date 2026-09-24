/**
 * Load real source modules into Node `vm` contexts with their imports replaced by stubs, so
 * module logic can be tested deterministically without a browser. Also provides the pixel,
 * ready and plugin-registry harnesses shared by the Node suites.
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_vm from "node:vm";
import * as g_url from "node:url";

const ROOT = g_path.resolve( g_path.dirname( g_url.fileURLToPath( import.meta.url ) ), "../.." );

/**
 * Read a repository source file as a classic script: imports are removed and exports become
 * plain declarations.
 *
 * @param {string} file - Repository-relative source path.
 * @param {Object} [options] - Transform options.
 * @param {boolean} [options.exposeConsts] - Turn exported `const` declarations into `var`, so
 *   they become properties of the context.
 * @returns {string} Script source.
 */
function readModuleSource( file, options = {} ) {
	let source = g_fs.readFileSync( g_path.join( ROOT, file ), "utf8" )
		.replace( /^import .*;\r?\n/gm, "" )
		.replace( /^export \{.*\};\r?\n/gm, "" )
		.replace( /export default /g, "" );
	if( options.exposeConsts ) {
		source = source.replace( /export const /g, "var " );
	}
	return source.replace( /export /g, "" );
}

/**
 * Run a source module in a new `vm` context.
 *
 * @param {string} file - Repository-relative source path, such as `src/api/pixels.js`.
 * @param {Object} [globals] - Stubs for the module's imports and browser globals.
 * @param {Object} [options] - Load options.
 * @param {boolean} [options.contextState] - Install the real `src/renderer/context-state.js`
 *   functions as `g_contextState`.
 * @param {boolean} [options.exposeConsts] - See `readModuleSource`.
 * @param {string[]} [options.expose] - Top-level bindings to copy onto the context afterward.
 * @returns {Object} The context, whose properties are the module's top-level functions.
 */
function loadModule( file, globals = {}, options = {} ) {
	const context = g_vm.createContext( { "console": console, ...globals } );
	if( options.contextState ) {
		g_vm.runInContext( readModuleSource( "src/renderer/context-state.js" ), context );
		context.g_contextState = {
			"isContextUnavailable": context.isContextUnavailable,
			"getContextGeneration": context.getContextGeneration,
			"probeContextLoss": context.probeContextLoss
		};
	}
	g_vm.runInContext( readModuleSource( file, options ), context, { "filename": file } );
	for( const name of options.expose || [] ) {
		context[ name ] = g_vm.runInContext( name, context );
	}
	return context;
}

/**
 * Real pixel readback and filter modules over a 2x2 stub screen. Microtasks are queued for the
 * test to run, and `calls` counts reads, uploads, dirty marks and palette conversions.
 *
 * @returns {Object} `{ microtasks, calls, screen, readback, pixels, dispose }`.
 */
function createPixelHarness() {
	const microtasks = [];
	const load = ( file, globals ) => loadModule( file, globals, { "contextState": true } );
	const alpha = load( "src/renderer/alpha.js" );
	const calls = { "read": 0, "upload": 0, "dirty": 0, "convert": 0 };
	const manager = load( "src/core/screen-manager.js" );
	const view = load( "src/api/view.js" );
	const screen = {
		"id": 42, "isRemoved": false, "width": 2, "height": 2,
		"view": { "originX": 0, "originY": 0, "width": 2, "height": 2,
			"clipX": 0, "clipY": 0, "clipWidth": 2, "clipHeight": 2 },
		"gl": {
			"bindFramebuffer": () => {},
			"readPixels": ( ...args ) => {
				calls.read++;
				for( let i = 0; i < args[ 6 ].length; i += 4 ) {
					args[ 6 ].set( [ 255, 0, 0, 255 ], i );
				}
			}
		}
	};
	const utils = {
		"queueMicrotask": fn => microtasks.push( fn ),
		"getInt": ( value, fallback ) => value ?? fallback,
		"getFloat": ( value, fallback ) => value ?? fallback,
		"isFunction": value => typeof value === "function",
		"rgbToColor": ( r, g, b, a ) => ( { "r": r, "g": g, "b": b, "a": a } )
	};
	const readback = load( "src/renderer/readback.js", {
		"g_alpha": alpha,
		"g_utils": utils, "g_screenManager": manager,
		"g_batches": { "flushBatches": () => {} }
	} );
	const pixels = load( "src/api/pixels.js", {
		"g_alpha": alpha,
		"g_utils": utils, "g_screenManager": manager, "g_view": view,
		"g_commands": { "addCommand": () => {} },
		"g_renderer": {
			"readPixelAsync": readback.readPixelAsync,
			"readPixelsAsync": readback.readPixelsAsync,
			"readPixelsRaw": readback.readPixelsRaw,
			"flushBatches": () => {}, "setImageDirty": () => calls.dirty++
		},
		"g_textures": { "updateWebGL2TextureSubImage": () => calls.upload++ },
		"g_colors": { "findColorIndexByColorValue": () => { calls.convert++; return 4; } }
	} );
	pixels.init( {} );
	const cleanupHooks = g_vm.runInContext( "m_screenDataPreCleanupFunctions", manager );
	const dispose = () => {
		screen.isRemoved = true;
		for( const hook of cleanupHooks ) {
			hook( screen );
		}
		screen.gl = null;
	};
	return { "microtasks": microtasks, "calls": calls, "screen": screen,
		"readback": readback, "pixels": pixels, "dispose": dispose };
}

/**
 * The real ready queue with a controllable document and timers.
 *
 * @param {string} [readyState] - Initial `document.readyState`.
 * @returns {Object} `{ commands, listeners, flush }`; `flush` runs the timers queued so far.
 */
function createReadyHarness( readyState = "complete" ) {
	const timers = new Map();
	const listeners = {};
	let nextTimer = 0;
	const commands = loadModule( "src/core/commands.js", {
		"g_utils": { "isFunction": value => typeof value === "function" },
		"g_screenManager": { "addScreenInitFunction": () => {} },
		"document": {
			"readyState": readyState,
			"addEventListener": ( name, fn ) => { listeners[ name ] = fn; }
		},
		"setTimeout": fn => { timers.set( ++nextTimer, fn ); return nextTimer; },
		"clearTimeout": id => timers.delete( id )
	}, { "contextState": true } );
	commands.init( {} );
	return {
		"commands": commands,
		"listeners": listeners,
		"flush": () => {

			// Timers scheduled during dispatch belong to a subsequent turn.
			const callbacks = Array.from( timers.values() );
			timers.clear();
			for( const callback of callbacks ) {
				callback();
			}
		}
	};
}

/**
 * The real plugin registry with stubbed command and screen dependencies.
 *
 * @param {Function} [queueMicrotask] - Microtask scheduler; queued work is dropped by default.
 * @returns {Object} The registered commands, such as `registerPlugin` and `getPlugins`.
 */
function createPluginRegistry( queueMicrotask = () => {} ) {
	const commands = {};
	const module = loadModule( "src/core/plugins.js", {
		"g_commands": {
			"addCommand": ( name, fn ) => { commands[ name ] = fn; },
			"processCommands": () => {}
		},
		"g_screenManager": {
			"getAllScreensData": () => [],
			"installScreenExtensions": () => {}
		},
		"g_utils": {},
		"queueMicrotask": queueMicrotask
	} );
	module.init( {} );
	return commands;
}

export {
	ROOT, readModuleSource, loadModule, createPixelHarness, createReadyHarness,
	createPluginRegistry
};
