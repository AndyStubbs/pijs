/** Reproducible polygon performance workloads and complete pre-calibration cache warming. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import "../libs/seedrandom.js";
import * as g_poly from "../performance/src/tests/poly.js";

/** Capture a run with the same palette and dimensions as the performance page. */
function capture( operationType ) {
	const draws = [];
	let color;
	globalThis.$ = {
		"width": () => 800, "height": () => 600,
		"getPal": () => Array.from( { "length": 16 }, ( value, index ) => index ),
		"cls": () => {}, "setColor": value => { color = value; },
		"polygon": ( points, fill ) => draws.push( { "points": points, "fill": fill, "color": color } )
	};
	const config = g_poly.getConfig( [ operationType ] );
	try {
		config.init( config );
		config.warmUp();
		const warmed = new Set( draws.map( draw => draw.points ) );
		g_assert.equal( warmed.size, 1000 );
		draws.length = 0;
		config.run( 2001 );
		g_assert.equal( draws.length, 2000 );
		g_assert.ok( draws.every( draw => warmed.has( draw.points ) ) );
		return JSON.stringify( draws );
	} finally {
		config.cleanUp();
		delete globalThis.$;
	}
}

for( const operationType of [ "polygon", "polygon-filled" ] ) {
	g_test.test( `${operationType} repeats its default workload and warms every cached shape`, () => {
		g_assert.equal( capture( operationType ), capture( operationType ) );
	} );
}
