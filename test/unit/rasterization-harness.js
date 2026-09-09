/**
 * Source-module point capture for arc and circle rasterization regressions.
 */
"use strict";

const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function createHarness() {
	const points = [];
	const screen = { "color": { "r": 255, "g": 0, "b": 0, "a": 128 } };
	const createPointWriter = () => ( x, y, color ) => {
		points.push( [ x, y, color.r, color.g, color.b, color.a ] );
	};
	const globals = {
		"g_batches": { "POINTS_BATCH": 0 },
		"g_batchHelpers": { "createPointWriter": createPointWriter },
		"createPointWriter": createPointWriter
	};
	function load( name ) {
		const source = fs.readFileSync(
			path.join( __dirname, "../../src/renderer/draw", name + ".js" ), "utf8"
		).replace( /^import .*;\r?\n/gm, "" ).replace( /export /g, "" );
		const context = vm.createContext( { ...globals } );
		vm.runInContext( fs.readFileSync(
			path.join( __dirname, "../../src/renderer/context-state.js" ), "utf8"
		).replace( /export /g, "" ), context );
		vm.runInContext( source, context );
		return context;
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

module.exports = { "createHarness": createHarness };
