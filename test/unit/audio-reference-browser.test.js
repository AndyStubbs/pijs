/**
 * Calibration of the reference-residual click checks in each engine.
 *
 * Valid analytic fades must pass across waveforms, frequencies, phases, and noise seeds.
 * Deliberately abrupt onsets and stops at nonzero carrier amplitude must fail by a recorded
 * margin. Tolerances live in audio-tolerances.js; set PI_AUDIO_CALIBRATE=1 to print the
 * observed extremes when recalibrating. An engine without Web Audio is skipped as a whole.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_audioEngines from "./audio-engines.js";
import * as g_fixtures from "./audio-reference-fixtures.js";
import * as g_harness from "./audio-render-harness.js";
import * as g_metrics from "./audio-metrics.js";
import * as g_tolerances from "./audio-tolerances.js";
const { test, describe, before, after } = g_test;
const assert = g_assert;

const NO_WEB_AUDIO = "this engine build has no Web Audio API (Playwright WebKit on Windows)";
const FIXTURES = g_fixtures.buildFixtures();

// Read before any test is defined, since a skipped engine is decided at definition
const SUPPORT = await g_audioEngines.loadSupport();

/**
 * Renders every fixture in one document and measures it.
 *
 * @param {Object} browser - Playwright browser for the engine
 * @returns {Promise<Object[]>} Measurements
 */
async function measureAll( browser ) {
	const session = await g_harness.createHarnessSession( browser );
	const harness = await session.open();
	const specs = FIXTURES.map( fixture => ( {
		"source": fixture.source,
		"automation": fixture.automation,
		"initialValue": fixture.initialValue
	} ) );
	const renders = await harness.page.evaluate( g_fixtures.renderFixturesInPage, specs );
	return FIXTURES.map( ( fixture, i ) => {
		const [ rendered, carrier ] = g_harness.decodeChannels( [
			renders[ i ].rendered, renders[ i ].carrier
		] );
		return {
			"fixture": fixture,
			"rendered": rendered,
			"carrier": carrier,
			"measure": g_fixtures.measureFixture( fixture, rendered, carrier )
		};
	} );
}

function residualPrefix( fixture ) {
	if( fixture.kind === "stop" ) {
		return "stopResidual";
	}
	return "onsetResidual";
}

function report( engine, results ) {
	if( process.env.PI_AUDIO_CALIBRATE !== "1" ) {
		return;
	}
	for( const kind of [ "stop", "onset" ] ) {
		for( const valid of [ true, false ] ) {
			const group = results.filter( item => item.fixture.kind === kind &&
				item.fixture.valid === valid );
			const max = group.map( item => item.measure.max );
			const rms = group.map( item => item.measure.rms );
			let label = "abrupt";
			if( valid ) {
				label = "valid";
			}
			console.log( `${engine} ${kind} ${label}: max ${Math.min( ...max )}..` +
				`${Math.max( ...max )}, rms ${Math.min( ...rms )}..${Math.max( ...rms )}` );
		}
	}
}

// Engines run in parallel; each engine renders its fixtures once before its tests
describe( "audio engines", { "concurrency": true }, () => {
	for( const engine of g_audioEngines.AUDIO_ENGINES ) {
		let skip = false;
		if( !SUPPORT[ engine ].webAudio ) {
			skip = NO_WEB_AUDIO;
		}
		describe( engine, { "concurrency": 1, "skip": skip }, () => {
			let browser = null;
			let results = null;

			before( async () => {
				browser = await g_audioEngines.launchEngine( engine );
				results = await measureAll( browser );
				report( engine, results );
			} );

			after( async () => {
				await browser?.close();
			} );

			test( "valid fades pass the reference residual checks", () => {
				for( const { fixture, measure } of results.filter( item => item.fixture.valid ) ) {
					const prefix = residualPrefix( fixture );
					const maxTolerance = g_tolerances.getTolerance( `${prefix}Max`, engine );
					const rmsTolerance = g_tolerances.getTolerance( `${prefix}Rms`, engine );
					assert.ok( measure.max <= maxTolerance, `${fixture.name}: max ${measure.max}` );
					assert.ok( measure.rms <= rmsTolerance, `${fixture.name}: rms ${measure.rms}` );
					if( fixture.kind === "stop" ) {
						assert.ok( measure.silentAfter, `${fixture.name}: sound after the fade` );
					} else {
						assert.ok( measure.silentBefore, `${fixture.name}: sound before onset` );
					}
				}
			} );

			test( "abrupt onsets and stops fail by the recorded margin", () => {
				const separation = g_tolerances.getTolerance( "abruptSeparation", engine );
				const abrupt = results.filter( item => !item.fixture.valid );
				assert.ok( abrupt.length >= 30 );
				for( const { fixture, measure } of abrupt ) {
					const prefix = residualPrefix( fixture );
					const maxTolerance = g_tolerances.getTolerance( `${prefix}Max`, engine );
					const rmsTolerance = g_tolerances.getTolerance( `${prefix}Rms`, engine );
					assert.ok( measure.carrierAtEvent > 0.5, `${fixture.name}: carrier too quiet` );
					assert.ok( measure.max > maxTolerance * separation,
						`${fixture.name}: max ${measure.max}` );
					assert.ok( measure.rms > rmsTolerance * separation,
						`${fixture.name}: rms ${measure.rms}` );
				}
			} );

			test( "a correct 100 Hz sawtooth fade passes although its 1 ms RMS rises", () => {
				const item = results.find( entry => entry.fixture.valid &&
					entry.fixture.name === "sawtooth 100 Hz linear stop, phase 0" );
				const start = Math.floor( item.fixture.time * g_harness.SAMPLE_RATE );
				const windows = g_metrics.rmsWindows(
					item.rendered, 48, start, start + Math.round( g_fixtures.FADE * 48000 )
				);
				const rises = windows.some( ( value, i ) => i > 0 && value > windows[ i - 1 ] );
				assert.ok( rises, "a monotonic-RMS check would have accepted this fixture anyway" );
				assert.ok(
					item.measure.max <= g_tolerances.getTolerance( "stopResidualMax", engine )
				);
			} );
		} );
	}
} );
