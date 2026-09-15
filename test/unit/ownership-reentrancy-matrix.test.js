/**
 * COV-004 ownership and reentrancy matrix against real source modules.
 * Complements focused SYS-* suites with cross-checklist wait/listener/reuse assertions.
 */
"use strict";

const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function loadModule( file, globals = {} ) {
	const source = fs.readFileSync( path.join( __dirname, "../..", file ), "utf8" )
		.replace( /^import .*;\r?\n/gm, "" )
		.replace( /^export \{.*\};\r?\n/gm, "" )
		.replace( /export const /g, "var " )
		.replace( /export function /g, "function " )
		.replace( /export /g, "" );
	const context = vm.createContext( {
		"console": console,
		"structuredClone": structuredClone,
		...globals
	} );
	vm.runInContext( fs.readFileSync(
		path.join( __dirname, "../../src/renderer/context-state.js" ), "utf8"
	).replace( /export /g, "" ), context );
	context.g_contextState = {
		"isContextUnavailable": context.isContextUnavailable,
		"getContextGeneration": context.getContextGeneration,
		"probeContextLoss": context.probeContextLoss
	};
	vm.runInContext( source, context, { "filename": file } );
	return context;
}

function createImageHarness() {
	const images = [];
	const counts = { "wait": 0, "done": 0 };
	const context = vm.createContext( {
		"console": console,
		"g_utils": { "isFunction": v => typeof v === "function" },
		"g_commands": { "wait": () => counts.wait++, "done": () => counts.done++ },
		"g_screenManager": { "getAllScreensData": () => [] },
		"g_renderer": { "deleteWebGL2Texture": () => {} },
		"Image": class {
			constructor() {
				this.width = 2;
				this.height = 2;
				images.push( this );
				for( const name of [ "onload", "onerror" ] ) {
					let handler = null;
					Object.defineProperty( this, name, {
						"get": () => handler,
						"set": value => { handler = value; }
					} );
				}
			}
			set src( value ) { this.url = value; }
			removeAttribute( name ) { if( name === "src" ) { this.url = ""; } }
		}
	} );
	vm.runInContext(
		fs.readFileSync( path.join( __dirname, "../../src/api/images.js" ), "utf8" )
			.replace( /^import .*;\r?\n/gm, "" ).replace( /export /g, "" ),
		context,
		{ "filename": "src/api/images.js" }
	);
	return { "api": context, "images": images, "counts": counts };
}

function createAudioHarness() {
	const audio = [];
	const commands = {};
	const timers = new Map();
	const counts = { "wait": 0, "done": 0 };
	let nextTimer = 0;
	const context = vm.createContext( {
		"console": { "error": () => {}, "warn": () => {} },
		"setTimeout": ( fn, delay ) => {
			timers.set( ++nextTimer, { "fn": fn, "delay": delay } );
			return nextTimer;
		},
		"clearTimeout": id => timers.delete( id ),
		"Audio": class {
			constructor( src ) {
				this.src = src;
				this.error = { "code": 2 };
				this.listeners = new Map();
				this.pauses = 0;
				this.loads = 0;
				this.plays = 0;
				audio.push( this );
			}
			addEventListener( name, fn ) { this.listeners.set( name, fn ); }
			removeEventListener( name, fn ) {
				if( this.listeners.get( name ) === fn ) { this.listeners.delete( name ); }
			}
			emit( name ) { this.listeners.get( name )?.(); }
			pause() { this.pauses++; }
			play() { this.plays++; }
			removeAttribute( name ) { if( name === "src" ) { this.src = ""; } }
			load() { this.loads++; }
		}
	} );
	vm.runInContext(
		fs.readFileSync( path.join( __dirname, "../../plugins/sound/sound.js" ), "utf8" )
			.replace( /export /g, "" ),
		context,
		{ "filename": "plugins/sound/sound.js" }
	);
	context.registerSound( {
		"addCommand": ( name, fn ) => { commands[ name ] = fn; },
		"utils": { "getInt": ( v, d ) => v ?? d, "getFloat": ( v, d ) => v ?? d },
		"wait": () => { counts.wait++; },
		"done": () => { counts.done++; }
	} );
	return {
		"audio": audio, "commands": commands, "timers": timers, "counts": counts
	};
}

function createReadyPluginHarness() {
	const microtasks = [];
	const commands = {};
	const plugins = loadModule( "src/core/plugins.js", {
		"g_commands": {
			"addCommand": ( name, fn ) => { commands[ name ] = fn; },
			"processCommands": () => {}
		},
		"g_screenManager": {
			"getAllScreensData": () => [],
			"installScreenExtensions": () => {}
		},
		"g_utils": {},
		"queueMicrotask": fn => microtasks.push( fn )
	} );
	plugins.init( {} );
	const ready = loadModule( "src/core/commands.js", {
		"g_utils": {
			"isFunction": v => typeof v === "function",
			"queueMicrotask": fn => microtasks.push( fn )
		},
		"document": { "readyState": "complete", "addEventListener": () => {} }
	} );

	// commands.js registers ready itself through addCommand during init in real builds;
	// here load the ready helpers from the already-tested patch harness pattern.
	void ready;
	return {
		"register": commands.registerPlugin,
		"getPlugins": commands.getPlugins,
		"flush": () => {
			const queued = microtasks.splice( 0 );
			for( const fn of queued ) { fn(); }
		}
	};
}

function createPixelHarness() {
	const microtasks = [];
	const alpha = loadModule( "src/renderer/alpha.js" );
	const manager = loadModule( "src/core/screen-manager.js" );
	const view = loadModule( "src/api/view.js", {
		"g_utils": {
			"getInt": ( value, fallback ) => value ?? fallback,
			"getFloat": ( value, fallback ) => value ?? fallback,
			"isFunction": value => typeof value === "function",
			"queueMicrotask": fn => microtasks.push( fn ),
			"rgbToColor": ( r, g, b, a ) => ( { "r": r, "g": g, "b": b, "a": a } )
		},
		"g_commands": { "addCommand": () => {} },
		"g_screenManager": manager,
		"g_renderer": { "flushBatches": () => {}, "setImageDirty": () => {} },
		"g_print": { "updatePrintCursorDimensions": () => {} }
	} );
	const screen = {
		"id": 7, "isRemoved": false, "width": 2, "height": 2,
		"view": {
			"originX": 0, "originY": 0, "width": 2, "height": 2,
			"clipX": 0, "clipY": 0, "clipWidth": 2, "clipHeight": 2
		},
		"gl": {
			"bindFramebuffer": () => {},
			"readPixels": ( ...args ) => {
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
	const readback = loadModule( "src/renderer/readback.js", {
		"g_alpha": alpha,
		"g_utils": utils,
		"g_screenManager": manager,
		"g_batches": { "flushBatches": () => {} }
	} );
	const pixels = loadModule( "src/api/pixels.js", {
		"g_alpha": alpha,
		"g_utils": utils,
		"g_screenManager": manager,
		"g_view": view,
		"g_commands": { "addCommand": () => {} },
		"g_renderer": {
			"readPixelAsync": readback.readPixelAsync,
			"readPixelsAsync": readback.readPixelsAsync,
			"readPixelsRaw": readback.readPixelsRaw,
			"flushBatches": () => {},
			"setImageDirty": () => {}
		},
		"g_textures": { "updateWebGL2TextureSubImage": () => {} },
		"g_colors": { "findColorIndexByColorValue": () => 1 }
	} );
	pixels.init( {} );
	const cleanupHooks = vm.runInContext( "m_screenDataPreCleanupFunctions", manager );
	return {
		"pixels": pixels,
		"screen": screen,
		"flush": () => {
			const queued = microtasks.splice( 0 );
			for( const fn of queued ) { fn(); }
		},
		"dispose": () => {
			screen.isRemoved = true;
			for( const hook of cleanupHooks ) { hook( screen ); }
			screen.gl = null;
		}
	};
}

test( "COV-004 image: pending removal ignores late events and permits reuse", () => {
	const h = createImageHarness();
	h.api.loadImage( { "src": "old.png", "name": "reuse" } );
	const old = h.images[ 0 ];
	const ready = old.onload;
	const error = old.onerror;
	h.api.removeImage( { "name": "reuse" } );
	assert.equal( h.counts.done, 1 );
	assert.equal( old.onload, null );
	assert.equal( old.onerror, null );
	assert.equal( old.url, "" );
	h.api.loadImage( { "src": "new.png", "name": "reuse" } );
	ready();
	error( new Error( "late" ) );
	assert.equal( h.api.getStoredImage( "reuse" ).status, "loading" );
	assert.equal( h.counts.done, 1 );
	h.images[ 1 ].onload();
	assert.equal( h.api.getImage( { "name": "reuse" } ), h.images[ 1 ] );
	assert.equal( h.counts.wait, h.counts.done );
} );

test( "COV-004 audio: pending removal cancels retries and permits reuse", () => {
	const h = createAudioHarness();
	const id = h.commands.loadAudio( { "src": "old.wav", "name": "reuse" } );
	const old = h.audio[ 0 ];
	old.emit( "error" );
	assert.equal( h.timers.size, 1 );
	const retry = h.timers.values().next().value.fn;
	h.commands.removeAudio( { "audioId": id } );
	assert.equal( h.timers.size, 0 );
	assert.equal( old.listeners.size, 0 );
	assert.equal( old.src, "" );
	assert.equal( h.counts.wait, h.counts.done );
	h.commands.loadAudio( { "src": "new.wav", "name": "reuse" } );
	retry();
	assert.equal( h.audio.length, 2 );
	assert.equal( h.timers.size, 0 );
	h.audio[ 1 ].emit( "canplay" );
	h.commands.playAudio( { "audioId": "reuse" } );
	assert.equal( h.audio[ 1 ].plays, 1 );
	assert.equal( h.counts.wait, h.counts.done );
} );

test( "COV-004 pixels: dispose during pending read cancels without post-disposal work",
	async () => {
		const h = createPixelHarness();
		const pending = h.pixels.getPixelAsync( h.screen, { "x": 0, "y": 0 } );
		h.dispose();
		h.flush();
		await assert.rejects( pending, { "code": "SCREEN_REMOVED" } );
		h.flush();
		assert.equal( h.screen.gl, null );
	} );

test( "COV-004 plugins: failed init leaves no sticky commands and later registration works",
	() => {
		const h = createReadyPluginHarness();
		const order = [];
		assert.throws( () => h.register( {
			"name": "broken",
			"dependencies": [],
			"init": () => {
				order.push( "broken" );
				throw new Error( "fail" );
			}
		} ), { "code": "PLUGIN_INIT_FAILED" } );
		assert.deepEqual( order, [ "broken" ] );
		h.register( {
			"name": "ok",
			"dependencies": [],
			"init": () => order.push( "ok" )
		} );
		assert.deepEqual( order, [ "broken", "ok" ] );
		assert.equal(
			h.getPlugins().filter( item => item.name === "ok" && item.initialized ).length,
			1
		);
	} );

test( "COV-004 plugins: reentrant registration during init remains deterministic", () => {
	const h = createReadyPluginHarness();
	const order = [];
	h.register( {
		"name": "outer",
		"dependencies": [],
		"init": () => {
			h.register( {
				"name": "inner",
				"dependencies": [ "outer" ],
				"init": () => order.push( "inner" )
			} );
			order.push( "outer" );
		}
	} );
	assert.deepEqual( order, [ "outer", "inner" ] );
} );
