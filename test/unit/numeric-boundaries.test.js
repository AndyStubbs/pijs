/**
 * COV-003 finite/integer/range tables for views, blends, paint, fonts, and geometry.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_vm from "node:vm";
import * as g_url from "node:url";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const { test } = g_test;
const assert = g_assert;
const fs = g_fs;
const path = g_path;
const vm = g_vm;

const nonFinite = [ NaN, Infinity, -Infinity, null, undefined, "x", {} ];
const outOfRangeTolerance = [ -0.01, 1.01, -1, 2 ];

function loadUtils() {
	const context = vm.createContext( {
		"document": {
			"createElement": () => ( {
				"getContext": () => ( {
					"clearRect": () => {},
					"fillRect": () => {},
					"getImageData": () => ( { "data": [ 0, 0, 0, 0 ] } ),
					"putImageData": () => {},
					"drawImage": () => {},
					"canvas": { "width": 1, "height": 1 }
				} ),
				"width": 1,
				"height": 1
			} )
		}
	} );
	vm.runInContext(
		fs.readFileSync( path.join( DIRNAME, "../../src/core/utils.js" ), "utf8" )
			.replace( /export const /g, "var " )
			.replace( /export function /g, "function " )
			.replace( /export /g, "" ),
		context,
		{ "filename": "core/utils.js" }
	);
	return context;
}

function loadModule( file, globals = {} ) {
	const source = fs.readFileSync( path.join( DIRNAME, "../../src", file ), "utf8" )
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
	vm.runInContext( source, context, { "filename": file } );
	return context;
}

function createViewHarness() {
	const utils = loadUtils();
	const flushes = [];
	const view = loadModule( "api/view.js", {
		"g_utils": utils,
		"g_commands": { "addCommand": () => {} },
		"g_screenManager": {
			"addScreenDataItem": () => {},
			"addScreenInitFunction": () => {}
		},
		"g_renderer": {
			"flushBatches": ( screen ) => flushes.push( screen ),
			"setImageDirty": () => {}
		},
		"g_print": { "updatePrintCursorDimensions": () => {} }
	} );
	view.init( {} );
	const screen = {
		"view": {
			"stack": [],
			"originX": 0,
			"originY": 0,
			"width": 32,
			"height": 24,
			"clipX": 0,
			"clipY": 0,
			"clipWidth": 32,
			"clipHeight": 24
		},
		"printCursor": { "x": 3, "y": 4 },
		"width": 32,
		"height": 24
	};
	return { "api": view, "screen": screen, "flushes": flushes };
}

function createBlendHarness() {
	const utils = loadUtils();
	const changes = [];
	const blends = loadModule( "api/blends.js", {
		"g_utils": utils,
		"g_commands": { "addCommand": () => {} },
		"g_screenManager": {
			"addScreenDataItem": () => {},
			"addScreenInitFunction": () => {}
		},
		"g_renderer": {
			"blendModeChanged": ( screen, previous ) => changes.push( [ screen, previous ] )
		}
	} );
	blends.init( {} );
	const screen = {
		"blends": {
			"blend": blends.BLEND_REPLACE,
			"noise": null,
			"noiseSeed": null,
			"noiseData": []
		}
	};
	return { "api": blends, "screen": screen, "changes": changes };
}

function createPaintHarness() {
	const utils = loadUtils();
	const colors = loadModule( "api/colors.js", {
		"g_utils": utils,
		"g_commands": { "addCommand": () => {} },
		"g_screenManager": { "addScreenDataItemGetter": () => {} }
	} );
	colors.init();
	colors.setDefaultPal( { "pal": [ "#FF0000", "#00FF00" ] } );
	const paints = [];
	const paint = loadModule( "api/paint.js", {
		"g_utils": utils,
		"g_colors": colors,
		"g_commands": { "addCommand": () => {} },
		"g_view": {
			"toScreen": ( _screen, x, y ) => ( { "x": x, "y": y } ),
			"isInsideClip": () => true
		},
		"g_contextState": { "isContextUnavailable": () => false },
		"g_renderer": {
			"readPixels": () => [ [ { "key": "bg" } ] ],
			"drawRectFilled": () => paints.push( "fill" ),
			"drawPixel": () => paints.push( "pixel" ),
			"setImageDirty": () => paints.push( "dirty" )
		}
	} );
	paint.init( {} );
	const screen = {
		"color": colors.getColorValueByIndex(
			{ "pal": [ utils.rgbToColor( 255, 0, 0, 255 ), utils.rgbToColor( 0, 255, 0, 255 ) ] },
			1
		),
		"pal": [
			utils.rgbToColor( 255, 0, 0, 255 ),
			utils.rgbToColor( 0, 255, 0, 255 )
		],
		"view": {
			"originX": 0,
			"originY": 0,
			"width": 8,
			"height": 8,
			"clipX": 0,
			"clipY": 0,
			"clipWidth": 8,
			"clipHeight": 8
		}
	};
	return { "api": paint, "screen": screen, "paints": paints, "colors": colors };
}

function createFontHarness() {
	const utils = loadUtils();
	class Canvas {
		constructor() {
			this.width = 16;
			this.height = 8;
		}
	}
	const fonts = loadModule( "text/fonts.js", {
		"g_utils": utils,
		"g_commands": { "addCommand": () => {}, "wait": () => {}, "done": () => {} },
		"g_screenManager": {
			"addScreenDataItem": () => {},
			"addScreenInitFunction": () => {}
		},
		"g_renderer": { "getWebGL2Texture": () => {} },
		"g_print": { "updatePrintCursorDimensions": () => {} },
		"HTMLImageElement": class {},
		"HTMLCanvasElement": Canvas,
		"OffscreenCanvas": class {},
		"Image": class {
			constructor() {
				this.width = 16;
				this.height = 8;
			}
			set src( _value ) {}
			removeAttribute() {}
		}
	} );
	return { "api": fonts, "Canvas": Canvas };
}

function createGeometryHarness() {
	const utils = loadUtils();
	const colors = loadModule( "api/colors.js", {
		"g_utils": utils,
		"g_commands": { "addCommand": () => {} },
		"g_screenManager": { "addScreenDataItemGetter": () => {} }
	} );
	colors.init();
	const draws = [];
	const api = {};
	const screen = {
		"api": {},
		"color": utils.rgbToColor( 255, 0, 0, 255 ),
		"pal": [ utils.rgbToColor( 255, 0, 0, 255 ) ],
		"batches": {},
		"batchInfo": { "drawOrder": [], "currentBatch": null }
	};
	const graphics = loadModule( "api/graphics.js", {
		"g_utils": utils,
		"g_colors": colors,
		"g_commands": { "addCommand": () => {} },
		"g_screenManager": { "addScreenInitFunction": () => {} },
		"g_images": {
			"getImageFromRawInput": () => null,
			"getStoredImage": () => null
		},
		"g_view": {},
		"g_renderer": {
			"POINTS_BATCH": 0,
			"IMAGE_REPLACE_BATCH": 1,
			"drawArc": ( ...args ) => draws.push( [ "arc", ...args ] ),
			"drawBezier": ( ...args ) => draws.push( [ "bezier", ...args ] ),
			"drawCircle": ( ...args ) => draws.push( [ "circle", ...args ] ),
			"drawCircleFilled": ( ...args ) => draws.push( [ "circleFilled", ...args ] ),
			"drawEllipse": ( ...args ) => draws.push( [ "ellipse", ...args ] ),
			"drawLine": ( ...args ) => draws.push( [ "line", ...args ] ),
			"drawPixel": ( ...args ) => draws.push( [ "pixel", ...args ] ),
			"drawRect": ( ...args ) => draws.push( [ "rect", ...args ] ),
			"drawRectFilled": ( ...args ) => draws.push( [ "rectFilled", ...args ] ),
			"drawImage": () => {},
			"drawSprite": () => {},
			"setImageDirty": () => draws.push( [ "dirty" ] )
		}
	} );
	graphics.init( api );
	graphics.buildApi( screen );
	return { "api": screen.api, "draws": draws, "screen": screen };
}

for( const value of nonFinite ) {
	test( `COV-003 pushView rejects non-finite ${String( value )}`, () => {
		const h = createViewHarness();
		assert.throws(
			() => h.api.pushViewCmd( h.screen, {
				"x": value, "y": 0, "width": 8, "height": 8
			} ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.equal( h.screen.view.stack.length, 0 );
		assert.deepEqual( h.flushes, [] );
	} );
}

test( "COV-003 pushView rejects negative width and height", () => {
	const h = createViewHarness();
	for( const rect of [
		{ "x": 0, "y": 0, "width": -1, "height": 8 },
		{ "x": 0, "y": 0, "width": 8, "height": -1 }
	] ) {
		assert.throws(
			() => h.api.pushViewCmd( h.screen, rect ),
			{ "name": "RangeError", "code": "INVALID_PARAMETER" }
		);
	}
	assert.equal( h.screen.view.stack.length, 0 );
} );

test( "COV-003 pushView accepts zero-size and rounded finite integers", () => {
	const h = createViewHarness();
	h.api.pushViewCmd( h.screen, { "x": 1.4, "y": 2.6, "width": 0, "height": 0 } );
	assert.equal( h.screen.view.stack.length, 1 );
	const frame = h.screen.view.stack[ 0 ];
	assert.equal( frame.localX, 1 );
	assert.equal( frame.localY, 3 );
	assert.equal( frame.width, 0 );
	assert.equal( frame.height, 0 );
	assert.equal( frame.savedCursorX, 3 );
	assert.equal( frame.savedCursorY, 4 );
} );

for( const blend of [ "Blend", "multiply", "", 1, {}, [] ] ) {
	test( `COV-003 setBlend rejects ${String( blend )} and preserves prior mode`, () => {
		const h = createBlendHarness();
		h.api.setBlend( h.screen, { "blend": "alpha" } );
		assert.equal( h.screen.blends.blend, "alpha" );
		assert.throws(
			() => h.api.setBlend( h.screen, { "blend": blend } ),
			{ "name": "TypeError", "code": "INVALID_BLEND_MODE" }
		);
		assert.equal( h.screen.blends.blend, "alpha" );
	} );
}

test( "COV-003 setBlend accepts replace and alpha", () => {
	const h = createBlendHarness();
	h.api.setBlend( h.screen, { "blend": "alpha" } );
	h.api.setBlend( h.screen, { "blend": "replace" } );
	assert.equal( h.screen.blends.blend, "replace" );
	assert.equal( h.changes.length, 2 );
} );

for( const value of nonFinite ) {
	test( `COV-003 paint rejects non-finite coordinate ${String( value )}`, () => {
		const h = createPaintHarness();
		assert.throws(
			() => h.api.paint( h.screen, { "x": value, "y": 1, "fillColor": 1 } ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.throws(
			() => h.api.paint( h.screen, { "x": 1, "y": value, "fillColor": 1 } ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.deepEqual( h.paints, [] );
	} );
}

for( const tolerance of outOfRangeTolerance ) {
	test( `COV-003 paint rejects tolerance ${tolerance}`, () => {
		const h = createPaintHarness();
		assert.throws(
			() => h.api.paint( h.screen, {
				"x": 1, "y": 1, "fillColor": 1, "tolerance": tolerance
			} ),
			{ "name": "RangeError", "code": "INVALID_PARAMETER" }
		);
		assert.deepEqual( h.paints, [] );
	} );
}

test( "COV-003 paint rejects invalid fillColor without drawing", () => {
	const h = createPaintHarness();
	assert.throws(
		() => h.api.paint( h.screen, { "x": 1, "y": 1, "fillColor": 99 } ),
		{ "name": "RangeError", "code": "INVALID_PARAMETER" }
	);
	assert.deepEqual( h.paints, [] );
} );

for( const value of nonFinite ) {
	test( `COV-003 loadFont rejects non-finite dimensions ${String( value )}`, () => {
		const h = createFontHarness();
		const canvas = new h.Canvas();
		assert.throws(
			() => h.api.loadFont( {
				"src": canvas, "width": value, "height": 8
			} ),
			{ "name": "TypeError", "code": "INVALID_DIMENSIONS" }
		);
		assert.throws(
			() => h.api.loadFont( {
				"src": canvas, "width": 8, "height": value
			} ),
			{ "name": "TypeError", "code": "INVALID_DIMENSIONS" }
		);
		assert.equal( h.api.getAvailableFonts().length, 0 );
	} );
}

for( const fontId of [ -1, 1, NaN, Infinity, null, undefined ] ) {
	test( `COV-003 setFont rejects invalid fontId ${String( fontId )}`, () => {
		const h = createFontHarness();
		const id = h.api.loadFont( { "src": new h.Canvas(), "width": 8, "height": 8 } );
		assert.equal( id, 0 );
		assert.throws(
			() => h.api.setFont( {}, { "fontId": fontId } ),
			{ "name": "RangeError", "code": "INVALID_FONT_ID" }
		);
		assert.throws(
			() => h.api.setDefaultFont( { "fontId": fontId } ),
			{ "name": "RangeError", "code": "INVALID_FONT_ID" }
		);
	} );
}

for( const value of [ NaN, Infinity, -Infinity, null, undefined ] ) {
	test( `COV-003 geometry rejects non-finite ${String( value )} coords and radius`, () => {
		const h = createGeometryHarness();
		assert.throws(
			() => h.api.circle( value, 4, 2 ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.throws(
			() => h.api.circle( 4, value, 2 ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.throws(
			() => h.api.circle( 4, 4, value ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.deepEqual( h.draws, [] );
	} );
}

for( const value of [ NaN, "90", null, undefined, {}, [] ] ) {
	test( `COV-003 geometry rejects invalid arc angle ${String( value )}`, () => {
		const h = createGeometryHarness();
		assert.throws(
			() => h.api.arc( 4, 4, 2, value, 90 ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.throws(
			() => h.api.arc( 4, 4, 2, 0, value ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.deepEqual( h.draws, [] );
	} );
}

test( "COV-003 geometry rejects non-finite rect and line coordinates", () => {
	const h = createGeometryHarness();
	for( const value of [ NaN, Infinity, -Infinity ] ) {
		assert.throws(
			() => h.api.rect( value, 0, 4, 4 ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.throws(
			() => h.api.line( 0, 0, value, 4 ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
		assert.throws(
			() => h.api.pset( value, 1 ),
			{ "name": "TypeError", "code": "INVALID_PARAMETER" }
		);
	}
	assert.deepEqual( h.draws, [] );
} );

test( "COV-003 geometry accepts rounded finite coordinates", () => {
	const h = createGeometryHarness();
	h.api.circle( 1.4, 2.6, 3.2 );
	assert.equal( h.draws[ 0 ][ 0 ], "circle" );
	assert.equal( h.draws[ 0 ][ 2 ], 1 );
	assert.equal( h.draws[ 0 ][ 3 ], 3 );
	assert.equal( h.draws[ 0 ][ 4 ], 3 );
} );
