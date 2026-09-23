/**
 * Pi.js Size Report Tests
 *
 * Verifies the size report shape, gzip helpers, and differential cost arithmetic.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_zlib from "node:zlib";
import * as g_size from "../../scripts/size.js";
import * as g_sizeUtils from "../../scripts/size-utils.js";
const assert = g_assert;
const test = g_test.test;

test( "gzipSize uses the release gzip level", () => {
	const contents = "function pi() { return 3.14159; }\n".repeat( 50 );
	const expected = g_zlib.gzipSync( contents, { "level": 9 } ).length;
	assert.equal( g_sizeUtils.GZIP_LEVEL, 9 );
	assert.equal( g_sizeUtils.gzipSize( contents ), expected );
	assert.deepEqual( g_sizeUtils.measureContents( contents ), {
		"bytes": Buffer.byteLength( contents ),
		"gzip": expected
	} );
	assert.equal( g_sizeUtils.formatSize( 1536 ), "1.50 KB" );
} );

test( "computeDifferentialCost follows each measurement direction", () => {
	assert.equal( g_size.computeDifferentialCost( "marginal", 1000, 800 ), 200 );
	assert.equal( g_size.computeDifferentialCost( "promotion", 1000, 1300 ), 300 );
	assert.equal( g_size.computeDifferentialCost( "fullMerge", 1000, 1500 ), 500 );
	assert.throws(
		() => g_size.computeDifferentialCost( "sum", 1, 2 ),
		{ "name": "TypeError" }
	);
} );

test( "createSizeReport measures bundles, plugins, and differentials", async () => {
	const report = await g_size.createSizeReport( {
		"plugins": [ "pens" ],
		"differentials": [ {
			"name": "pens merged into lite",
			"kind": "promotion",
			"base": "bundle:pi.lite.min.js",
			"variant": {
				"label": "lite + pens",
				"contents": 'import "./src/index.js";\nimport "./plugins/pens/index.js";\n'
			}
		} ]
	} );

	assert.equal( report.gzipLevel, 9 );
	assert.equal( typeof report.version, "string" );
	assert.ok( !Number.isNaN( Date.parse( report.generatedAt ) ) );
	for( const name of [ "pi.min.js", "pi.lite.min.js" ] ) {
		assert.ok( report.bundles[ name ].bytes > report.bundles[ name ].gzip );
		assert.ok( report.bundles[ name ].gzip > 0 );
	}
	assert.ok( report.bundles[ "pi.min.js" ].bytes > report.bundles[ "pi.lite.min.js" ].bytes );
	assert.deepEqual( Object.keys( report.plugins ), [ "pens" ] );
	assert.ok( report.plugins.pens.gzip > 0 );
	assert.equal( report.differentials.length, 1 );

	const differential = report.differentials[ 0 ];
	assert.equal( differential.base, "bundle:pi.lite.min.js" );
	assert.equal( differential.baseGzip, report.bundles[ "pi.lite.min.js" ].gzip );
	assert.equal( differential.cost, differential.variantGzip - differential.baseGzip );
	assert.ok( report.notes.some( note => note.includes( "not additive" ) ) );
} );
