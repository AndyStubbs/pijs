/**
 * SYS-007 reservation and emission regressions against actual source modules.
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

function loadModule( file, globals = {}, constants = [] ) {
	const source = fs.readFileSync( path.join( DIRNAME, "../../src", file ), "utf8" )
		.replace( /^import .*;\r?\n/gm, "" )
		.replace( /^export \{.*\};\r?\n/gm, "" ).replace( /export /g, "" );
	const context = vm.createContext( { "console": console, ...globals } );
	vm.runInContext( fs.readFileSync(
		path.join( DIRNAME, "../../src/renderer/context-state.js" ), "utf8"
	).replace( /export /g, "" ), context );
	context.g_contextState = {
		"isContextUnavailable": context.isContextUnavailable,
		"getContextGeneration": context.getContextGeneration,
		"probeContextLoss": context.probeContextLoss
	};
	vm.runInContext( source, context, { "filename": file } );
	for( const name of constants ) {
		context[ name ] = vm.runInContext( name, context );
	}
	return context;
}

function createHarness( min = 8, max = 19 ) {
	const batches = loadModule( "renderer/batches.js", {
		"window": { "location": { "search": "" } }, "g_blends": { "BLEND_REPLACE": 0 }
	}, [ "POINTS_BATCH", "GEOMETRY_BATCH", "POINTS_REPLACE_BATCH" ] );
	const helpers = loadModule( "renderer/draw/batch-helpers.js", { "g_batches": batches } );
	const emitted = [];
	const submissions = [];
	let boundBatch;
	const gl = new Proxy( {
		"bindVertexArray": vao => { boundBatch = vao; },
		"drawArrays": ( mode, start, count ) => {
			const batch = boundBatch;
			assert.ok( batch.count <= batch.capacity && batch.capacity <= batch.maxCapacity );
			assert.ok( start + count <= batch.count );
			if( batch.type === batches.GEOMETRY_BATCH ) {
				assert.equal( count % 3, 0 );
			}
			submissions.push( { "type": batch.type, "count": count } );
			for( let i = start; i < start + count; i++ ) {
				emitted.push( [ batch.type, ...batch.vertices.slice( i * 2, i * 2 + 2 ),
					...batch.colors.slice( i * 4, i * 4 + 4 ) ] );
			}
		}
	}, { "get": ( target, key ) => target[ key ] ?? ( () => {} ) } );
	const screen = {
		"width": 32, "height": 24, "color": { "r": 200, "g": 100, "b": 50, "a": 128 },
		"view": { "originX": 3, "originY": 5, "clipX": 3, "clipY": 5,
			"clipWidth": 20, "clipHeight": 16, "width": 20, "height": 16 },
		"gl": gl, "blends": { "blend": 0 }, "batches": {}, "isFirstRender": true,
		"batchInfo": { "drawOrder": [], "currentBatch": null, "textureBatchSet": new Set() }
	};
	for( const type of [ 0, 1, 2, 3, 4 ] ) {
		const batch = {
			"type": type, "count": 0, "capacity": min, "minCapacity": min, "maxCapacity": max,
			"vertices": new Float32Array( min * 2 ), "colors": new Uint8Array( min * 4 ),
			"vertexComps": 2, "colorComps": 4, "texCoordComps": 2, "locations": {},
			"capacityChanged": false, "capacityLocalMax": 0, "capacityShrinkCheckTime": Infinity,
			"useTexture": false, "overrideGlobalBlend": null
		};
		batch.vao = batch;
		screen.batches[ type ] = batch;
	}
	const globals = { "g_batches": batches, "g_batchHelpers": helpers };
	const geometry = loadModule( "renderer/draw/geometry.js", globals,
		[ "FILLED_CIRCLE", "m_geometryCache" ] );
	const shapes = {};
	for( const name of [ "lines", "circles", "arcs", "ellipses", "bezier" ] ) {
		shapes[ name ] = loadModule( `renderer/draw/${name}.js`, {
			...globals, "g_geometry": geometry, "g_circles": shapes.circles
		} );
	}
	const utils = loadModule( "core/utils.js", {
		"document": { "createElement": () => ( { "getContext": () => ( {} ) } ) }
	}, [ "isObjectLiteral" ] );
	const view = loadModule( "api/view.js" );
	const renderer = {
		...batches, "createPointWriter": helpers.createPointWriter, "setImageDirty": () => {},
		"readPixels": () => Array.from( { "length": 16 }, () => Array( 20 ).fill( {
			"r": 0, "g": 0, "b": 0, "a": 0, "key": "empty", "array": [ 0, 0, 0, 0 ]
		} ) )
	};
	const apiGlobals = {
		"g_renderer": renderer, "g_utils": utils, "g_view": view,
		"g_colors": { "getColorValueByRawInput": ( data, color ) => color,
			"getColorValueByIndex": ( data, index ) => ( {
				"r": index, "g": 10, "b": 20, "a": 255
			} ) }
	};
	const paint = loadModule( "api/paint.js", apiGlobals );
	const pixels = loadModule( "api/pixels.js", apiGlobals );
	return { "batches": batches, "helpers": helpers, "screen": screen, "shapes": shapes,
		"geometry": geometry, "paint": paint, "pixels": pixels, "emitted": emitted,
		"submissions": submissions };
}

const linePaths = [
	[ [ 0, 0 ] ],
	Array.from( { "length": 8 }, ( _, x ) => [ x, 0 ] ),
	Array.from( { "length": 8 }, ( _, x ) => [ x, x ] ),
	[ [ 0, 0 ], [ 1, 0 ], [ 2, 1 ], [ 3, 1 ], [ 4, 2 ], [ 5, 2 ], [ 6, 3 ], [ 7, 3 ] ]
];

test( "P2 all octants and reversed lines preserve exact points, colors and origins", () => {
	for( const [ min, max ] of [ [ 8, 19 ], [ 3, 3 ] ] ) {
		for( const alpha of [ 0, 128, 255 ] ) {
			for( const translated of [ false, true ] ) {
				const h = createHarness( min, max );
				h.screen.color.a = alpha;
				if( !translated ) {
					h.screen.view = null;
				}
				const expected = [];
				for( const points of linePaths ) {
					for( const swap of [ false, true ] ) {
						for( const sx of [ -1, 1 ] ) {
							for( const sy of [ -1, 1 ] ) {
								for( const reverse of [ false, true ] ) {
									const path = points.map( ( [ x, y ] ) => {
										if( swap ) { return [ y * sx - 2, x * sy - 3 ]; }
										return [ x * sx - 2, y * sy - 3 ];
									} );
									if( reverse ) { path.reverse(); }
									h.shapes.lines.drawLine(
										h.screen, ...path[ 0 ], ...path.at( -1 )
									);
									for( const [ x, y ] of path ) {
										expected.push( [ h.batches.POINTS_BATCH,
											x + ( h.screen.view?.originX || 0 ),
											y + ( h.screen.view?.originY || 0 ),
											200, 100, 50, alpha ] );
									}
								}
							}
						}
					}
				}
				h.batches.flushBatches( h.screen );
				assert.deepEqual( h.emitted, expected );
			}
		}
	}
} );

for( const [ occupied, points ] of [ [ 0, 1 ], [ 0, 8 ], [ 3, 5 ], [ 3, 6 ],
	[ 0, 19 ], [ 3, 19 ], [ 19, 1 ], [ 0, 20 ], [ 3, 60 ] ] ) {
	test( `P2 reservations preserve ${points} points after ${occupied} queued points`, () => {
		const h = createHarness();
		const type = h.batches.POINTS_BATCH;
		const batch = h.screen.batches[ type ];
		if( occupied ) {
			h.batches.prepareBatch( h.screen, type, occupied );
			for( let i = 0; i < occupied; i++ ) {
				h.helpers.addVertexToBatch( batch, i, -1, h.screen.color );
			}
		}
		const reservations = [];
		let writers = 0;
		const reserve = h.batches.prepareBatch;
		const writer = h.helpers.createPointWriter;
		h.batches.prepareBatch = ( ...args ) => {
			reservations.push( args[ 2 ] );
			return reserve( ...args );
		};
		h.helpers.createPointWriter = ( ...args ) => {
			writers++;
			return writer( ...args );
		};
		h.shapes.lines.drawLine( h.screen, 0, 0, points - 1, 0 );
		if( points <= batch.maxCapacity ) {
			assert.deepEqual( reservations, [ points ] );
			assert.equal( writers, 0 );
		} else {
			assert.equal( writers, 1 );
			assert.ok( reservations.length > 1 );
			assert.ok( reservations.every( count => count <= batch.maxCapacity ) );
		}
		h.batches.flushBatches( h.screen );
		const expected = [];
		for( let i = 0; i < occupied; i++ ) {
			expected.push( [ type, i + 3, 4, 200, 100, 50, 128 ] );
		}
		for( let i = 0; i < points; i++ ) {
			expected.push( [ type, i + 3, 5, 200, 100, 50, 128 ] );
		}
		assert.deepEqual( h.emitted, expected );
	} );
}

for( const points of [ 7, 60 ] ) {
	test( `P2 suspended ${points}-point lines leave queued data untouched`, () => {
		const h = createHarness();
		const batch = h.screen.batches[ h.batches.POINTS_BATCH ];
		h.batches.prepareBatch( h.screen, h.batches.POINTS_BATCH, 1 );
		h.helpers.addVertexToBatch( batch, 1, 2, h.screen.color );
		const vertices = batch.vertices.slice();
		const colors = batch.colors.slice();
		const order = h.screen.batchInfo.drawOrder;
		h.screen.contextLost = true;
		h.batches.prepareBatch = () => assert.fail( "Suspended line reserved points" );
		h.shapes.lines.drawLine( h.screen, 0, 0, points - 1, 0 );
		assert.equal( batch.count, 1 );
		assert.deepEqual( batch.vertices, vertices );
		assert.deepEqual( batch.colors, colors );
		assert.equal( h.screen.batchInfo.drawOrder, order );
	} );
}

for( const points of [ 7, 60 ] ) {
	test( `P2 ${points}-point line stops emitting after forced-flush loss`, () => {
		const h = createHarness( 8, 19 );
		const batch = h.screen.batches[ h.batches.POINTS_BATCH ];
		let probes = 0;
		let countAtLoss;
		let verticesAtLoss;
		let colorsAtLoss;
		if( points === 7 ) {
			h.batches.prepareBatch( h.screen, h.batches.POINTS_BATCH, 19 );
			for( let i = 0; i < 19; i++ ) {
				h.helpers.addVertexToBatch( batch, i, -1, h.screen.color );
			}
		}
		h.screen.gl.isContextLost = () => {
			probes++;
			countAtLoss = batch.count;
			verticesAtLoss = batch.vertices.slice();
			colorsAtLoss = batch.colors.slice();
			return true;
		};
		h.screen.contextState = { "suspend": () => { h.screen.batchInfo.drawOrder = []; } };
		h.shapes.lines.drawLine( h.screen, 0, 0, points - 1, 0 );
		assert.equal( probes, 1 );
		assert.equal( h.screen.contextLost, true );
		assert.ok( countAtLoss > 0 );
		assert.equal( batch.count, countAtLoss );
		assert.deepEqual( batch.vertices, verticesAtLoss );
		assert.deepEqual( batch.colors, colorsAtLoss );
		assert.equal( h.emitted.length, 0 );
		assert.deepEqual( h.screen.batchInfo.drawOrder, [] );
	} );
}

test( "SYS-007 zero, exact capacity, growth and exact maximum reservations", () => {
	const { batches, screen } = createHarness();
	const batch = screen.batches[ 0 ];
	batches.prepareBatch( screen, 0, 0 );
	assert.equal( screen.batchInfo.drawOrder.length, 0 );
	const vertices = batch.vertices;
	batches.prepareBatch( screen, 0, 8 );
	assert.equal( batch.vertices, vertices );
	batch.count = 8;
	batch.vertices[ 0 ] = 42;
	batches.prepareBatch( screen, 0, 1 );
	assert.equal( batch.capacity, 16 );
	assert.equal( batch.vertices[ 0 ], 42 );
	batches.prepareBatch( screen, 0, 11 );
	assert.equal( batch.capacity, 19 );
	assert.equal( screen.batchInfo.drawOrder.length, 1 );
} );

test( "SYS-007 invalid reservations leave queued work, origins and textures untouched", () => {
	const { batches, helpers, screen } = createHarness();
	batches.prepareBatch( screen, 0, 1 );
	helpers.addVertexToBatch( screen.batches[ 0 ], 1, 2, screen.color );
	const order = screen.batchInfo.drawOrder;
	const current = screen.batchInfo.currentBatch;
	for( const count of [ -1, 1.5, NaN, Infinity, -Infinity, 20, "1", null, undefined ] ) {
		assert.throws( () => batches.prepareBatch( screen, 1, count, {} ), {
			"name": "RangeError"
		} );
		assert.equal( screen.batchInfo.drawOrder, order );
		assert.equal( order.length, 1 );
		assert.equal( order[ 0 ].endIndex, null );
		assert.equal( screen.batchInfo.currentBatch, current );
		assert.equal( current.count, 1 );
		assert.equal( screen.batches[ 1 ].originX, undefined );
		assert.equal( screen.batchInfo.textureBatchSet.size, 0 );
	}
} );

test( "SYS-007 accumulated overflow flushes once and restores ordered texture segments", () => {
	const { batches, helpers, screen, emitted } = createHarness();
	const batch = screen.batches[ 1 ];
	batch.useTexture = true;
	batch.texCoords = new Float32Array( 16 );
	const first = {};
	const second = {};
	batches.prepareBatch( screen, 1, 18, first );
	for( let i = 0; i < 18; i++ ) {
		helpers.addVertexToBatch( batch, i, 0, screen.color );
	}
	batches.prepareBatch( screen, 1, 6, second );
	assert.equal( screen.frameCount, 1 );
	assert.equal( emitted.length, 18 );
	assert.equal( batch.count, 0 );
	assert.equal( screen.batchInfo.drawOrder.length, 1 );
	assert.equal( screen.batchInfo.drawOrder[ 0 ].startIndex, 0 );
	assert.equal( screen.batchInfo.drawOrder[ 0 ].texture, second );
	assert.equal( screen.batchInfo.textureBatchSet.has( first ), false );
} );

test( "SYS-008 suspended reservations neither throw nor change queued state", () => {
	const { batches, screen } = createHarness();
	batches.prepareBatch( screen, 0, 19 );
	screen.batches[ 0 ].count = 19;
	screen.contextLost = true;
	const order = screen.batchInfo.drawOrder;
	assert.doesNotThrow( () => batches.prepareBatch( screen, 0, 1 ) );
	assert.equal( batches.prepareBatchChunk( screen, 0, 1 ), 0 );
	assert.equal( screen.batches[ 0 ].count, 19 );
	assert.equal( screen.batchInfo.drawOrder, order );
	assert.equal( order.length, 1 );
	assert.equal( order[ 0 ].endIndex, null );
} );

test( "SYS-007 chunks align primitives and shorten the final reservation", () => {
	const { batches, screen } = createHarness( 8, 19 );
	assert.equal( batches.prepareBatchChunk( screen, 2, undefined, 3 ), 6 );
	assert.equal( batches.prepareBatchChunk( screen, 2, 3, 3 ), 3 );
	assert.equal( batches.prepareBatchChunk( screen, 2, 0, 3 ), 0 );
	for( const [ remaining, size ] of [ [ 1, 3 ], [ -3, 3 ], [ Infinity, 3 ], [ 3, 0 ],
		[ 3, 1.5 ], [ 12, 12 ], [ 3, NaN ] ] ) {
		assert.throws( () => batches.prepareBatchChunk( screen, 2, remaining, size ), {
			"name": "RangeError"
		} );
	}
} );

test( "SYS-007 point chunks consume spare capacity before growing", () => {
	const { batches, helpers, screen } = createHarness();
	const batch = screen.batches[ 0 ];
	const vertices = batch.vertices;
	batches.prepareBatch( screen, 0, 1 );
	helpers.addVertexToBatch( batch, 1, 2, screen.color );
	assert.equal( batches.prepareBatchChunk( screen, 0 ), 7 );
	assert.equal( batch.vertices, vertices );
} );

const callers = {
	"line": h => h.shapes.lines.drawLine( h.screen, -5, -3, 85, 40 ),
	"arc": h => h.shapes.arcs.drawArc( h.screen, 10, 10, 40, 0, Math.PI * 1.5 ),
	"circle": h => h.shapes.circles.drawCircle( h.screen, 10, 10, 40 ),
	"ellipse outline and fill": h => h.shapes.ellipses.drawEllipse(
		h.screen, 10, 10, 40, 20, h.screen.color
	),
	"bezier": h => h.shapes.bezier.drawBezier( h.screen, 0, 0, 90, 30, 20, 70, 100, 100 ),
	"cached geometry": h => h.geometry.drawCachedGeometry(
		h.screen, h.geometry.FILLED_CIRCLE, 40, 10, 10, h.screen.color
	),
	"paint": h => h.paint.paint( h.screen, {
		"x": 0, "y": 0, "fillColor": h.screen.color, "tolerance": 0, "boundaryColor": null
	} ),
	"put with skipped pixels and rows": h => h.pixels.putWrapper( h.screen,
		[ Array( 20 ).fill( 2 ), undefined, Array( 20 ).fill( 0 ), Array( 20 ).fill( 3 ) ],
		0, 0, false
	)
};

for( const [ name, draw ] of Object.entries( callers ) ) {
	test( `SYS-007 ${name}: forced chunks preserve every vertex and color in order`, () => {
		const large = createHarness( 10000, 20000 );
		const small = createHarness();
		for( const h of [ large, small ] ) {
			draw( h );
			h.batches.flushBatches( h.screen );
		}
		assert.ok( small.emitted.length > 19 );
		assert.ok( small.screen.frameCount > 1 );
		assert.deepEqual( small.emitted, large.emitted );
	} );
}

test( "SYS-007 skipped paint and put pixels allocate no point chunks", () => {
	const h = createHarness();
	h.paint.paint( h.screen, { "x": 0, "y": 0, "fillColor": h.screen.color,
		"tolerance": 0, "boundaryColor": { "array": [ 0, 0, 0, 0 ] } } );
	h.pixels.putWrapper( h.screen, [ Array( 20 ).fill( 0 ) ], 0, 0, false );
	assert.equal( h.screen.batchInfo.drawOrder.length, 0 );
	assert.equal( h.screen.batches[ 0 ].capacity, 8 );
	assert.equal( h.screen.batches[ 3 ].capacity, 8 );
} );

for( const [ min, max ] of [ [ 3, 3 ], [ 4, 7 ], [ 8, 19 ], [ 12, 25 ] ] ) {
	test( `P3 cached geometry preserves exact emission with capacities ${min}/${max}`, () => {
		const large = createHarness( 10000, 20000 );
		const small = createHarness( min, max );
		const reservations = [];
		const reserve = small.batches.prepareBatchChunk;
		small.batches.prepareBatchChunk = ( ...args ) => {
			const count = reserve( ...args );
			reservations.push( { "count": count, "remaining": args[ 2 ] } );
			assert.equal( count % 3, 0 );
			assert.ok( count <= args[ 2 ] );
			return count;
		};
		for( const h of [ large, small ] ) {
			const type = h.batches.GEOMETRY_BATCH;
			const batch = h.screen.batches[ type ];

			// Start partially occupied, and preserve order across a different primitive batch.
			h.batches.prepareBatch( h.screen, type, 3 );
			h.helpers.addTriangleToBatch( batch, -2, -1, 1, 3, 4, 2, h.screen.color );
			for( const alpha of [ 0, 128, 255 ] ) {
				const color = { "r": 41, "g": 93, "b": 157, "a": alpha };
				h.geometry.drawCachedGeometry( h.screen, h.geometry.FILLED_CIRCLE,
					40, 0.25, -1.5, color );
				h.batches.prepareBatch( h.screen, h.batches.POINTS_BATCH, 1 );
				h.helpers.addVertexToBatch( h.screen.batches[ h.batches.POINTS_BATCH ],
					5, 7, color );
			}
			h.batches.flushBatches( h.screen );
		}
		assert.deepEqual( small.emitted, large.emitted );
		assert.ok( reservations.length > 1 );
		assert.equal( reservations.at( -1 ).count, reservations.at( -1 ).remaining );
	} );
}

test( "P3 final short chunk copies only remaining complete triangles", () => {
	const h = createHarness( 12, 25 );
	const vertices = new Float32Array( Array.from( { "length": 30 }, ( _, i ) => i / 4 ) );
	h.geometry.m_geometryCache.set( "0:123", { "vertices": vertices, "vertexCount": 15 } );
	const reservations = [];
	const reserve = h.batches.prepareBatchChunk;
	h.batches.prepareBatchChunk = ( ...args ) => {
		const count = reserve( ...args );
		reservations.push( count );
		return count;
	};
	h.geometry.drawCachedGeometry( h.screen, 0, 123, 2, 4, h.screen.color );
	h.batches.flushBatches( h.screen );
	assert.deepEqual( reservations, [ 12, 3 ] );
	assert.equal( h.emitted.length, 15 );
	for( let i = 0; i < 15; i++ ) {
		assert.deepEqual( h.emitted[ i ], [ h.batches.GEOMETRY_BATCH,
			vertices[ i * 2 ] + 5, vertices[ i * 2 + 1 ] + 9, 200, 100, 50, 128 ] );
	}
} );

test( "P3 cached geometry stops when a later chunk flush detects context loss", () => {
	const h = createHarness( 3, 3 );
	const batch = h.screen.batches[ h.batches.GEOMETRY_BATCH ];
	let probes = 0;
	h.screen.gl.isContextLost = () => { probes++; return true; };
	h.screen.contextState = { "suspend": () => { h.screen.batchInfo.drawOrder = []; } };
	h.geometry.drawCachedGeometry( h.screen, h.geometry.FILLED_CIRCLE,
		40, 0, 0, h.screen.color );
	assert.equal( probes, 1 );
	assert.equal( h.screen.contextLost, true );
	assert.equal( batch.count, 3 );
	assert.equal( h.emitted.length, 0 );
	assert.deepEqual( h.screen.batchInfo.drawOrder, [] );
} );
