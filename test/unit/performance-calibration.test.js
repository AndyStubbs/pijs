/** Adaptive performance calibration must tolerate stalls without understating fixed capacity. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_esbuild from "esbuild";
import * as g_vm from "node:vm";

let m_bundle;

g_test.before( async () => {
	const result = await g_esbuild.build( {
		"entryPoints": [ "test/performance/src/test-manager.js" ],
		"bundle": true, "write": false, "format": "iife", "globalName": "manager",
		"plugins": [ {
			"name": "controlled-workload",
			"setup": build => {
				build.onLoad( { "filter": /src[\\/]tests[\\/].*\.js$/ }, args => ( {
					"contents": `export function getConfig( options ) {
						let excluded = [ "probe" ];
						if( ${/poly\.js$/.test( args.path )} && options?.[ 0 ] === "polygon" ) {
							excluded = [];
						}
						return {
							"name": "controlled", "exludeVersions": excluded,
							"itemCountStart": 200, "init": () => {},
							"warmUp": () => { globalThis.prepared++; },
							"run": count => { globalThis.work = count; },
							"cleanUp": () => {}
						};
					}`, "loader": "js"
				} ) );
				build.onLoad( { "filter": /report-manager\.js$/ }, () => ( {
					"contents": "export function showResults(r){globalThis.results=r;}",
					"loader": "js"
				} ) );
				build.onLoad( { "filter": /image-loader\.js$/ }, () => ( {
					"contents": "export function init(){}", "loader": "js"
				} ) );
			}
		} ]
	} );
	m_bundle = result.outputFiles[ 0 ].text;
} );

/** Feed real calibration logic a controlled 100 Hz clock and known workload capacity. */
async function simulate( capacity, stallFrames = 0 ) {
	const queue = [];
	let time = 10;
	let stalled = false;
	let remainingStalls = 0;
	const noop = () => {};
	const context = {
		"prepared": 0,
		"localStorage": { "getItem": () => null },
		"requestAnimationFrame": callback => queue.push( callback ),
		"$": {
			"version": "probe", "canvas": () => ( { "style": {} } ),
			"setColor": noop, "rect": noop, "setPos": noop, "print": noop
		}
	};
	g_vm.runInNewContext( m_bundle, context );
	const initialized = context.manager.init( {} );
	while( queue.length ) {
		time += 10;
		await queue.shift()( time );
	}
	await initialized;
	await context.manager.startTests();
	g_assert.equal( context.prepared, 1 );
	for( let i = 0; queue.length && !context.results && i < 2000; i++ ) {
		let duration = 10 * Math.max( 1, Math.ceil( ( context.work || 0 ) / capacity ) );
		if( !stalled && context.work >= 3200 ) {
			stalled = true;
			remainingStalls = stallFrames;
		}
		if( remainingStalls > 0 ) {
			duration = 30;
			remainingStalls--;
		}
		time += duration;
		await queue.shift()( time );
	}
	g_assert.ok( context.results, "Calibration must finish within a bounded number of frames" );
	return context.results.tests[ 0 ];
}

g_test.test( "one slow frame or one slow window does not permanently cap capacity", async () => {
	const normal = await simulate( 10000 );
	for( const stallFrames of [ 1, 8 ] ) {
		const stalled = await simulate( 10000, stallFrames );
		g_assert.ok( stalled.score >= normal.score * 0.95 );
		g_assert.ok( stalled.itemCount <= 10000 );
		g_assert.equal( stalled.medianFps, 100 );
	}
} );

g_test.test( "sustained overload converges to a passing count within five percent", async () => {
	for( const capacity of [ 200, 2200, 10000 ] ) {
		const result = await simulate( capacity );
		g_assert.ok( result.itemCount <= capacity );
		g_assert.ok( result.itemCount >= capacity * 0.95 );
		g_assert.ok( result.testTime <= 7600 );
	}
} );

g_test.test( "calibration has a time limit when no failing upper bound is found", async () => {
	const result = await simulate( Number.MAX_SAFE_INTEGER );
	g_assert.ok( result.testTime <= 7600 );
	g_assert.ok( result.itemCount >= 200 );
} );
