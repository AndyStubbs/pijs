/**
 * Source-module point capture for arc and circle rasterization regressions.
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_vm from "node:vm";
import * as g_url from "node:url";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const fs = g_fs;
const path = g_path;
const vm = g_vm;

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
		const source = fs.readFileSync(
			path.join( DIRNAME, "../../src/renderer/draw", name + ".js" ), "utf8"
		).replace( /^import .*;\r?\n/gm, "" ).replace( /export /g, "" );
		const context = vm.createContext( { ...globals } );
		vm.runInContext( fs.readFileSync(
			path.join( DIRNAME, "../../src/renderer/context-state.js" ), "utf8"
		).replace( /export /g, "" ), context );
		context.g_contextState = {
			"isContextUnavailable": context.isContextUnavailable,
			"getContextGeneration": context.getContextGeneration,
			"probeContextLoss": context.probeContextLoss
		};
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

export { createHarness };
