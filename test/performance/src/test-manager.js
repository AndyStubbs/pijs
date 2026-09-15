/**
 * Test Manager Module
 * 
 * Handles test registration, execution, and result management for performance tests.
 * 
 * @module test-manager
 */

const TARGET_FPS_SAMPLE_TIME = 1000;
const WARM_UP_TIME = 500;
const CALIBRATION_TIME = 1500;
const MEASUREMENT_TIME = 2000;
const CALIBRATION_WINDOW_SIZE = 8;

export { init, startTests, getTargetFps, calculateTargetFPS };

"use strict";

import * as g_imageLoader from "./image-loader.js";

// Import all available tests
import * as g_psetTest from "./tests/pset.js";
import * as g_polyTest from "./tests/poly.js";
import * as g_lineTest from "./tests/line.js";
import * as g_graphicsTest from "./tests/graphics.js";
import * as g_imagesTest from "./tests/images.js";
import * as g_imagesTest2 from "./tests/images2.js";
import * as g_bezierTest from "./tests/bezier.js";
import * as g_reportManager from "./report-manager.js";


const REDUCED_FLASHING_OPACITY = "0.2";

// Get all test config data
let m_tests = [];
//m_tests.push( g_psetTest.getConfig() );
//m_tests.push( g_lineTest.getConfig() );

m_tests.push( g_polyTest.getConfig( [ "polygon" ] ) );
m_tests.push( g_polyTest.getConfig( [ "polygon-filled" ] ) );
m_tests.push( g_graphicsTest.getConfig( [ "line" ] ) );
m_tests.push( g_graphicsTest.getConfig( [ "rect-filled" ] ) );
m_tests.push( g_graphicsTest.getConfig( [ "circle-filled" ] ) );
m_tests.push( g_graphicsTest.getConfig( [ "ellipse-filled" ] ) );
m_tests.push( g_graphicsTest.getConfig() );
// m_tests.push( g_graphicsTest.getConfig( [ "arc" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "bezier" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "circle" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "circle-filled" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "ellipse" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "ellipse-filled" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "put" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "pset" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "pset2" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "rect" ] ) );
// m_tests.push( g_graphicsTest.getConfig( [ "rect-filled" ] ) );


// m_tests.push( g_imagesTest.getConfig( false, false ) );
// m_tests.push( g_imagesTest.getConfig( true, false ) );
// m_tests.push( g_imagesTest.getConfig( false, true ) );
// m_tests.push( g_imagesTest.getConfig( true, true ) );

// Images Advanced Test - All 8 combinations
const allImageTestOptions = [
	//"blit-images",
	"blit-images-colors",
	//"blit-sprites",
	"blit-sprites-colors",
	"draw-images",
	"draw-images-colors",
	"draw-sprites",
	"draw-sprites-colors"
];

//m_tests.push( g_imagesTest2.getConfig( [ "draw-images" ] ) );
// Generate separate test for each combination
for( let i = 0; i < allImageTestOptions.length; i++ ) {
	m_tests.push( g_imagesTest2.getConfig( [ allImageTestOptions[ i ] ] ) );
}

//m_tests.push( g_imagesTest2.getConfig( [ "draw-images" ] ) );
//m_tests.push( g_imagesTest2.getConfig( [ "draw-sprites" ] ) );

// Global state for the test manager
let m_results = [];
let m_testIndex = -1;
let m_targetFps = 60;
let m_api = null;

/*
 * Initializes the test manager
 * 
 * @param {Object} api - API object with showMainMenu and other functions
 * @returns {void}
 */
async function init( api ) {
	m_api = api;
	await calculateTargetFPS();
	g_imageLoader.init();
}

/**
 * Starts the test suite from the beginning
 * 
 * @returns {Promise<void>}
 */
async function startTests() {

	// Update screen opacity based on setting
	if( localStorage.getItem( "reducedFlashing" ) === "true" ) {
		$.canvas().style.opacity = REDUCED_FLASHING_OPACITY;
	} else {
		$.canvas().style.opacity = "";
	}
	
	m_testIndex = -1;
	m_results = [];
	await runNextTest();
}

/**
 * Gets the current target FPS
 * 
 * @returns {number} The target FPS value
 */
function getTargetFps() {
	return m_targetFps;
}


/**
 * Calculates the target FPS for the current system
 * 
 * @returns {Promise<number>} The calculated target FPS
 */
async function calculateTargetFPS() {
	let lt = 0;
	
	return new Promise( ( resolve ) => {
		requestAnimationFrame( loop );
		
		let duration = 0;
		let samples = [];
		function loop( t ) {
			if( lt > 0 ) {
				let dt = t - lt;
				samples.push( dt );
				duration += dt;
			}
			lt = t;
			if( duration < TARGET_FPS_SAMPLE_TIME ) {
				requestAnimationFrame( loop );
			} else {
				if( samples.length === 0 ) {
					m_targetFps = 60;
					resolve( m_targetFps );
					return;
				}

				const rawFps = calcFpsFromMs( calcPercentile( samples, 0.5 ) );
				const fps = Math.round( rawFps * 100 ) / 100;
				m_targetFps = fps;
				resolve( fps );
			}
		}
	} );
}

/**
 * Runs the next test in the queue
 * 
 * @returns {Promise<void>}
 */
async function runNextTest() {
	m_testIndex += 1;
	if( m_testIndex >= m_tests.length ) {
		if( m_results.length === 0 ) {
			throw new Error( "Error, no results found after tests completed." );
		}
		const resultsObject = {
			"schemaVersion": 2,
			"version": $.version || "Unknown",
			"date": new Date().toISOString(),
			"targetFps": m_targetFps,
			"method": {
				"warmUpMs": WARM_UP_TIME,
				"calibrationMs": CALIBRATION_TIME,
				"measurementMs": MEASUREMENT_TIME,
				"statistic": "median animation-frame throughput"
			},
			"tests": m_results,
			"score": Math.round(
				m_results.filter( result => result.supported ).reduce(
					( score, result ) => score + Math.round( result.score ), 0
				) / m_results.filter( result => result.supported ).length
			)
		};
		$.canvas().style.opacity = "";
		g_reportManager.showResults( resultsObject );
		return;
	}

	let test = m_tests[ m_testIndex ];

	if( test.exludeVersions.includes( $.version ) ) {
		m_results.push( {
			"name": test.name,
			"supported": false,
			"medianFps": 0,
			"itemCount": 0,
			"itemCountPerSecond": 0,
			"medianFrameMs": 0,
			"p95FrameMs": 0,
			"variabilityPercent": 0,
			"sampleCount": 0,
			"droppedFrames": 0,
			"testTime": 0,
			"score": 0
		} );
		return await runNextTest();
	}

	let itemCount = test.itemCountStart;
	if( $.version === "1.2.5" && test.legacyItemCountStart ) {
		itemCount = test.legacyItemCountStart;
	}
	let startTime = 0;
	let previousFrameTime = 0;
	let phase = "warm-up";
	let phaseStartTime = 0;
	let lowerPassingCount = 0;
	let upperFailingCount = null;
	let calibrationFrames = [];
	let measurementFrames = [];
	let droppedFrames = 0;

	// Initialize the test
	await test.init( test );

	// Start the test loop
	requestAnimationFrame( loop );

	// Test Loop Function
	async function loop( t ) {
		if( !startTime ) {
			startTime = t;
			phaseStartTime = t;
			previousFrameTime = t;
		}

		const elapsed = t - startTime;
		const phaseElapsed = t - phaseStartTime;
		const frameDuration = t - previousFrameTime;
		previousFrameTime = t;

		if(
			phase === "measurement" && phaseElapsed >= MEASUREMENT_TIME &&
			measurementFrames.length > 0
		) {
			const medianFrameMs = calcPercentile( measurementFrames, 0.5 );
			const p95FrameMs = calcPercentile( measurementFrames, 0.95 );
			const medianFps = calcFpsFromMs( medianFrameMs );
			const throughput = itemCount * medianFps;
			const deviations = measurementFrames.map(
				value => Math.abs( value - medianFrameMs )
			);
			const variability = medianFrameMs > 0 ?
				calcPercentile( deviations, 0.5 ) / medianFrameMs * 100 : 0;
			const score = Math.round( throughput / 100 );
			m_results.push( {
				"name": test.name,
				"supported": true,
				"medianFps": Number( medianFps.toFixed( 2 ) ),
				"itemCount": itemCount,
				"itemCountPerSecond": Math.round( throughput ),
				"medianFrameMs": Number( medianFrameMs.toFixed( 3 ) ),
				"p95FrameMs": Number( p95FrameMs.toFixed( 3 ) ),
				"variabilityPercent": Number( variability.toFixed( 2 ) ),
				"sampleCount": measurementFrames.length,
				"droppedFrames": droppedFrames,
				"testTime": elapsed,
				"score": score
			} );
			
			// Call the test cleanup
			test.cleanUp();

			// Run the next test
			return await runNextTest();
		}

		const targetFrameMs = 1000 / m_targetFps;
		if( phase === "warm-up" ) {
			if( frameDuration > targetFrameMs * 2 && itemCount > 1 ) {
				itemCount = Math.max( 1, Math.floor( itemCount / 2 ) );
			}
			if( phaseElapsed >= WARM_UP_TIME ) {
				phase = "calibration";
				phaseStartTime = t;
			}
		} else if( phase === "calibration" ) {
			if( frameDuration > targetFrameMs * 2 ) {
				adjustItemCount( false );
				calibrationFrames = [];
			} else {
				calibrationFrames.push( frameDuration );
			}
			if( calibrationFrames.length >= CALIBRATION_WINDOW_SIZE ) {
				const medianFrameMs = calcPercentile( calibrationFrames, 0.5 );
				const p90FrameMs = calcPercentile( calibrationFrames, 0.9 );
				const passes = medianFrameMs <= targetFrameMs * 1.05 &&
					p90FrameMs <= targetFrameMs * 1.2;
				adjustItemCount( passes );
				calibrationFrames = [];
			}
			if( phaseElapsed >= CALIBRATION_TIME && lowerPassingCount > 0 ) {
				itemCount = lowerPassingCount;
				phase = "measurement";
				phaseStartTime = t;
			}
		} else {
			measurementFrames.push( frameDuration );
			if( frameDuration > targetFrameMs * 4 ) {
				droppedFrames += 1;
			}
		}

		test.run( itemCount, test.data );
		const currentFps = calcFpsFromMs( frameDuration );

		//$.cls( 0, 0, 155, 65 );
		$.setColor( "black" );
		$.rect( 0, 0, 210, 82, "black" );
		$.setColor( 14 );
		$.setPos( 0, 0 );
		$.print( test.name );
		$.setColor( 15 );
		$.print( "Item Count:" + itemCount.toFixed( 0 ).padStart( 13, " " ) );
		$.print( "Target FPS:" + m_targetFps.toFixed( 0 ).padStart( 13, " " ) );
		$.print( "Frame FPS:" + currentFps.toFixed( 0 ).padStart( 14, " " ) );
		$.print( "Phase:" + phase.padStart( 18, " " ) );
		requestAnimationFrame( loop );
	};

	/**
	 * Updates the workload search bounds after a calibration sample.
	 *
	 * @param {boolean} passes - Whether the current workload met the frame budget
	 * @returns {void}
	 */
	function adjustItemCount( passes ) {
		if( passes ) {
			lowerPassingCount = itemCount;
			if( upperFailingCount === null ) {
				itemCount *= 2;
			} else {
				itemCount = Math.floor( ( itemCount + upperFailingCount ) / 2 );
			}
			return;
		}

		upperFailingCount = itemCount;
		if( lowerPassingCount === 0 ) {
			itemCount = Math.max( 1, Math.floor( itemCount / 2 ) );
			if( itemCount === 1 ) {
				lowerPassingCount = 1;
			}
		} else {
			itemCount = Math.floor( ( itemCount + lowerPassingCount ) / 2 );
		}
	}
}

/**
 * Calculates a percentile using linear interpolation between sorted samples.
 *
 * @param {Array<number>} data - Numeric samples
 * @param {number} percentile - Value from zero through one
 * @returns {number} Percentile value
 */
function calcPercentile( data, percentile ) {
	if( data.length === 0 ) {
		return 0;
	}
	const sorted = [ ...data ].sort( ( a, b ) => a - b );
	const index = ( sorted.length - 1 ) * percentile;
	const lowerIndex = Math.floor( index );
	const fraction = index - lowerIndex;
	if( lowerIndex >= sorted.length - 1 ) {
		return sorted[ sorted.length - 1 ];
	}
	return sorted[ lowerIndex ] + ( sorted[ lowerIndex + 1 ] - sorted[ lowerIndex ] ) * fraction;
}

/**
 * Calculates FPS from milliseconds
 * 
 * @param {number} ms - Milliseconds per frame
 * @returns {number} FPS value
 */
function calcFpsFromMs( ms ) {
	if( ms <= 0 ) return 0;
	return 1000 / ms;
}

/**
 * Calculates slope from a queue of data points
 * 
 * @param {Array<number>} dataPoints - Array of data points
 * @returns {number|null} The calculated slope or null if insufficient data
 */
function calcSlope( dataPoints ) {
	const n = dataPoints.length;

	// Need at least 2 points to calculate a slope
	if( n < 2 ) {
		return null;
	}

	let sum_x = 0;     // Sum of x-coordinates (indices)
	let sum_y = 0;     // Sum of y-coordinates (data values)
	let sum_xy = 0;    // Sum of (x * y)
	let sum_xx = 0;    // Sum of (x * x)

	for( let i = 0; i < n; i++ ) {
		const x = i;          		// x-coordinate is the index
		const y = dataPoints[ i ]; 	// y-coordinate is the data point value

		sum_x += x;
		sum_y += y;
		sum_xy += ( x * y );
		sum_xx += ( x * x );
	}

	// Calculate the numerator and denominator for the slope formula:
	// m = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
	const numerator = n * sum_xy - sum_x * sum_y;
	const denominator = n * sum_xx - sum_x * sum_x;

	return numerator / denominator;
}


