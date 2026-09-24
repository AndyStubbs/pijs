/**
 * Source-module point capture for arc and circle rasterization regressions.
 */
import * as g_harness from "./vm-module-harness.js";

function createHarness() {
	const points = [];
	const screen = { "color": { "r": 255, "g": 0, "b": 0, "a": 128 } };
	const createPointWriter = () => ( x, y, color ) => {
		points.push( [ x, y, color.r, color.g, color.b, color.a ] );
	};
	const globals = {
		"g_batches": { "POINTS_BATCH": 0 },
		"g_batchHelpers": { "createPointWriter": createPointWriter }
	};
	function load( name ) {
		return g_harness.loadModule( `src/renderer/draw/${name}.js`, { ...globals }, {
			"contextState": true
		} );
	}
	const circles = load( "circles" );
	globals.g_circles = { "drawCircle": circles.drawCircle };
	const arcs = load( "arcs" );
	return {
		"circle": radius => {
			points.length = 0;
			circles.drawCircle( screen, 0, 0, radius );
			return points.slice();
		},
		"arc": ( radius, start, end ) => {
			points.length = 0;
			arcs.drawArc( screen, 0, 0, radius, start, end );
			return points.slice();
		}
	};
}

export { createHarness };
