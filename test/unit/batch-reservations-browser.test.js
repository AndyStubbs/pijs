/**
 * SYS-007 WebGL regressions using fresh in-memory full and lite bundles.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles( {
	"expose": "batchTest",
	"setup": () => {
		window.inspect = screen => batchTest.manager.getScreenData( "test", screen.id );
		window.rawPixels = screen => {
			const data = inspect( screen );
			const pixels = batchTest.renderer.readPixelsRaw( data, 0, 0, data.width, data.height );
			if( data.gl.getError() !== data.gl.NO_ERROR ) {
				throw new Error( "WebGL error after readback" );
			}
			return pixels;
		};
		window.checkSolid = ( pixels, rgba ) => {
			for( let i = 0; i < pixels.length; i++ ) {
				if( pixels[ i ] !== rgba[ i % 4 ] ) {
					throw new Error( `Unexpected channel ${i}: ${pixels[ i ]}` );
				}
			}
		};
		window.track = screen => {
			const data = inspect( screen );
			const gl = data.gl;
			const drawArrays = gl.drawArrays.bind( gl );
			const stats = { "pointDraws": 0, "points": 0, "maxPoints": 0 };
			gl.drawArrays = ( mode, start, count ) => {
				for( const batch of Object.values( data.batches ) ) {
					if( batch.type === batchTest.renderer.SHADER_BATCH ) { continue; }
					if( batch.count > batch.capacity || batch.capacity > batch.maxCapacity ) {
						throw new Error( "Batch exceeded capacity" );
					}
				}
				if( mode === gl.POINTS ) {
					stats.pointDraws++;
					stats.points += count;
					stats.maxPoints = Math.max( stats.maxPoints, count );
				}
				drawArrays( mode, start, count );
			};
			return stats;
		};
		window.reduceLimits = screen => {
			const data = inspect( screen );
			for( const batch of Object.values( data.batches ) ) {
				if( batch.type === batchTest.renderer.SHADER_BATCH ) { continue; }
				batch.minCapacity = 8;
				batch.capacity = 8;
				batch.maxCapacity = 19;
				batch.vertices = new Float32Array( 8 * batch.vertexComps );
				batch.colors = new Uint8Array( 8 * batch.colorComps );
				if( batch.useTexture ) {
					batch.texCoords = new Float32Array( 8 * batch.texCoordComps );
				}
				batch.capacityChanged = true;
			}
		};
	}
} );

for( const bundle of g_harness.BUNDLES ) {
	test( `P2 ${bundle}: reserved and chunked lines match individual pixels in mixed views`,
		async () => {
			const results = await probe( bundle, () => {
				const results = [];
				const paths = [
					[ [ 0, 0 ] ],
					Array.from( { "length": 61 }, ( _, x ) => [ x - 10, 9 ] ),
					[ [ 0, 0 ], [ 1, 0 ], [ 2, 1 ], [ 3, 1 ],
						[ 4, 2 ], [ 5, 2 ], [ 6, 3 ], [ 7, 3 ] ]
				];
				const texture = document.createElement( "canvas" );
				texture.width = 5;
				texture.height = 5;
				const context = texture.getContext( "2d" );
				context.fillStyle = "#00FF0080";
				context.fillRect( 0, 0, 5, 5 );
				for( const mode of [ "reserved", "chunked", "pixels" ] ) {
					const screen = $.screen( "48x32" );
					if( mode === "chunked" ) { reduceLimits( screen ); }
					track( screen );
					screen.setBlend( "alpha" );
					for( const view of [ "default", "translated", "nested" ] ) {
						if( view === "translated" ) { screen.pushView( 3, 2, 40, 28 ); }
						if( view === "nested" ) { screen.pushView( 4, 3, 28, 20 ); }
						for( const alpha of [ "00", "80", "FF" ] ) {
							for( const points of paths ) {
								for( const swap of [ false, true ] ) {
									for( const sx of [ -1, 1 ] ) {
										for( const sy of [ -1, 1 ] ) {
											for( const reverse of [ false, true ] ) {
												const path = points.map( ( [ x, y ] ) => {
													if( swap ) {
														return [ 13 + y * sx, 10 + x * sy ];
													}
													return [ 13 + x * sx, 10 + y * sy ];
												} );
												if( reverse ) { path.reverse(); }
												screen.rect( 8, 6, 12, 10, "#0000FF40" );
												screen.setColor( "#FF0000" + alpha );
												if( mode === "pixels" ) {
													for( const [ x, y ] of path ) {
														screen.pset( x, y );
													}
												} else {
													screen.line( ...path[ 0 ], ...path.at( -1 ) );
												}
												screen.drawImage( texture, 10, 8 );
											}
										}
									}
								}
							}
						}
						results.push( Array.from( rawPixels( screen ) ) );
					}
					screen.resetView();
					screen.removeScreen();
				}
				return results;
			} );
			for( let view = 0; view < 3; view++ ) {
				assert.deepEqual( results[ view ], results[ view + 6 ] );
				assert.deepEqual( results[ view + 3 ], results[ view + 6 ] );
			}
		}
	);

	test( `SYS-007 ${bundle}: Full HD paint and put fill every pixel within batch limits`,
		async t => {
			const result = await probe( bundle, () => {
				const painted = $.screen( "1920x1080" );
				const paint = track( painted );
				const start = performance.now();
				painted.paint( 0, 0, "red" );
				checkSolid( rawPixels( painted ), [ 255, 0, 0, 255 ] );
				const ms = Math.round( performance.now() - start );
				painted.removeScreen();

				// Put replaces opaque pixels, skips transparent ones, and replaces them on request.
				const screen = $.screen( "1920x1080" );
				const put = track( screen );
				screen.setPal( [ "#FF0000" ] );
				const rows = Array( 1080 ).fill( Array( 1920 ).fill( 1 ) );
				screen.put( rows, 0, 0 );
				checkSolid( rawPixels( screen ), [ 255, 0, 0, 255 ] );
				rows.fill( Array( 1920 ).fill( 0 ) );
				screen.put( rows, 0, 0 );
				checkSolid( rawPixels( screen ), [ 255, 0, 0, 255 ] );
				screen.put( rows, 0, 0, true );
				checkSolid( rawPixels( screen ), [ 0, 0, 0, 0 ] );
				return { "paint": paint, "put": put, "ms": ms };
			} );
			assert.equal( result.paint.points, 1920 * 1080 );
			assert.ok( result.paint.pointDraws >= 2 );
			assert.ok( result.paint.maxPoints <= 1920000 );
			assert.equal( result.put.points, 2 * 1920 * 1080 );
			assert.ok( result.put.pointDraws >= 4 );
			assert.ok( result.put.maxPoints <= 1920000 );
			t.diagnostic( `Full HD paint and complete readback: ${result.ms} ms` );
		} );

	test( `SYS-007 ${bundle}: oversized arc completes and drawing continues`, async () => {
		const result = await probe( bundle, () => {
			const screen = $.screen( "32x32" );
			const stats = track( screen );
			screen.arc( 0, 0, 500000, 0, 270 );
			screen.setColor( "red" );
			screen.pset( 1, 1 );
			rawPixels( screen );
			return { ...stats, "red": screen.getPixel( 1, 1 ).r };
		} );
		assert.equal( result.red, 255 );
		assert.ok( result.points > 1920000 );
		assert.ok( result.pointDraws >= 2 );
		assert.ok( result.maxPoints <= 1920000 );
	} );

	test( `SYS-007 ${bundle}: clipped paint modes match across forced flushes`, async () => {
		const byMode = await probe( bundle, modes => {
			const byMode = [];
			for( const mode of modes ) {
				const results = [];
				for( const reduced of [ false, true ] ) {
					const screen = $.screen( "48x32" );
					if( reduced ) { reduceLimits( screen ); }
					track( screen );
					screen.paint( 0, 0, "blue" );
					screen.pushView( 5, 4, 32, 24 );
					screen.setColor( "white" );
					screen.rect( 2, 2, 27, 19 );
					screen.setColor( "#0000FE" );
					screen.line( 4, 6, 25, 6 );
					let tolerance = 0;
					let boundary = null;
					if( mode === "tolerance" ) { tolerance = 0.01; }
					if( mode === "boundary" ) { boundary = "white"; }
					screen.setBlend( "alpha" );
					screen.paint( 4, 4, "#FF000080", tolerance, boundary );
					screen.resetView();
					const inside = screen.getPixel( 9, 8 );
					if( inside.r !== 128 || inside.b !== 127 || inside.a !== 255 ) {
						throw new Error( mode + ": paint did not alpha-blend the seed pixel exactly once" );
					}
					const outside = screen.getPixel( 0, 0 );
					if( outside.r !== 0 || outside.b !== 255 ) {
						throw new Error( mode + ": paint escaped the view" );
					}
					results.push( Array.from( rawPixels( screen ) ) );
					screen.removeScreen();
				}
				byMode.push( results );
			}
			return byMode;
		}, [ "exact", "tolerance", "boundary" ] );
		assert.equal( byMode.length, 3 );
		for( const results of byMode ) {
			assert.deepEqual( results[ 1 ], results[ 0 ] );
		}
	} );

	test( `SYS-007 ${bundle}: mixed geometry, points, replacement and textures retain order`,
		async () => {
			const result = await probe( bundle, () => {
				const results = [];
				const textures = [ "#00FF0080", "#0000FF80" ].map( color => {
					const canvas = document.createElement( "canvas" );
					canvas.width = 12; canvas.height = 12;
					const ctx = canvas.getContext( "2d" );
					ctx.fillStyle = color; ctx.fillRect( 0, 0, 12, 12 );
					return canvas;
				} );
				for( const reduced of [ false, true ] ) {
					const screen = $.screen( "48x32" );
					if( reduced ) { reduceLimits( screen ); }
					track( screen );
					screen.setPal( [ "#FF0000" ] );
					screen.paint( 0, 0, "black" );
					screen.pushView( 3, 2, 40, 28 );
					for( let i = 0; i < 4; i++ ) {
						screen.setBlend( "alpha" );
						screen.setColor( "#FF000080" );
						screen.line( 0, i + 5, 39, i + 5 );
						screen.drawImage( textures[ i % 2 ], i + 5, 5 );
						screen.circle( 20, 14, 9, "#FFFF0080" );
						screen.ellipse( 20, 14, 15, 10, "#00FFFF80" );
						screen.put( [ Array( 40 ).fill( 1 ), Array( 40 ).fill( 0 ) ], 0, i, true );
						screen.bezier( 0, 0, 39, 3, 0, 24, 39, 27 );
						screen.setBlend( "replace" );
						screen.arc( 20, 14, 12, 0, 270 );
					}
					screen.resetView();
					results.push( Array.from( rawPixels( screen ) ) );
					screen.removeScreen();
				}
				return results;
			} );
			assert.deepEqual( result[ 1 ], result[ 0 ] );
		}
	);
}
