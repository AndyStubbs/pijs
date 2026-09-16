/** Run-level summaries and deterministic whole-run bootstrap comparisons. */

/** Interpolated percentile of a nonempty finite sample. */
function percentile( values, fraction ) {
	if( !values.length || values.some( value => !Number.isFinite( value ) ) ) {
		throw new Error( "Expected nonempty finite samples" );
	}
	const sorted = [ ...values ].sort( ( a, b ) => a - b );
	const at = ( sorted.length - 1 ) * fraction;
	return sorted[ Math.floor( at ) ] + ( at % 1 ) *
		( sorted[ Math.ceil( at ) ] - sorted[ Math.floor( at ) ] );
}

/** Median absolute deviation as a percentage; unresolved zero medians return null. */
function variability( values ) {
	const median = percentile( values, 0.5 );
	if( median === 0 ) {
		return null;
	}
	return percentile( values.map( value => Math.abs( value - median ) ), 0.5 ) / median * 100;
}

/** Summarize each workload using runs as the independent observations. */
function summarize( runs ) {
	if( !runs.length ) {
		return [];
	}
	return runs[ 0 ].tests.map( test => {
		const matches = runs.map( run => run.tests.find( item => item.name === test.name ) );
		if( matches.some( match => !match || match.supported !== test.supported ) ) {
			throw new Error( `Inconsistent support for ${test.name}` );
		}
		if( !test.supported ) {
			return { "name": test.name, "supported": false, "reason": test.reason };
		}
		const metric = ( key, fraction ) => matches.map( item => percentile(
			item.samples.map( sample => sample[ key ] ).filter( value => value !== null ), fraction
		) );
		const values = metric( "submitMs", 0.5 );
		const mad = variability( values );
		return {
			"name": test.name, "supported": true, "count": test.count, "runs": runs.length,
			"submitMs": percentile( values, 0.5 ), "runValues": values,
			"queueMs": percentile( metric( "queueMs", 0.5 ), 0.5 ),
			"p95SubmitMs": percentile( metric( "submitMs", 0.95 ), 0.5 ),
			"frameMs": percentile( metric( "frameMs", 0.5 ), 0.5 ),
			"p95FrameMs": percentile( metric( "frameMs", 0.95 ), 0.5 ),
			"runMadPercent": mad, "stable": runs.length >= 7 && mad !== null && mad <= 5
		};
	} );
}

/** Bootstrap whole runs with 5,000 deterministic resamples; return percentage change bounds. */
function ratioInterval( before, after ) {
	let state = 0x51A7;
	const random = () => {
		state = ( Math.imul( state, 1664525 ) + 1013904223 ) >>> 0;
		return state / 4294967296;
	};
	if( before.some( value => value <= 0 ) ) {
		return null;
	}
	const ratios = [];
	for( let i = 0; i < 5000; i++ ) {
		const a = before.map( () => before[ Math.floor( random() * before.length ) ] );
		const b = after.map( () => after[ Math.floor( random() * after.length ) ] );
		ratios.push( ( percentile( b, 0.5 ) / percentile( a, 0.5 ) - 1 ) * 100 );
	}
	return [ percentile( ratios, 0.025 ), percentile( ratios, 0.975 ) ];
}

/** Choose the capped campaign length after seven complete rounds. */
function roundLimit( runs, labels, smoke ) {
	if( smoke ) {
		return 1;
	}
	if( labels.some( label => runs.filter( run => run.artifact === label ).length < 7 ) ) {
		return 7;
	}
	for( const label of labels ) {
		const rows = summarize( runs.filter( run => run.artifact === label ).slice( 0, 7 ) );
		if( rows.some( row => row.supported && !row.stable ) ) {
			return 14;
		}
	}
	return 7;
}

/** Summarize only the current campaign, comparing each candidate with the first source. */
function campaignSummary( runs, labels, smoke, complete ) {
	const artifacts = {};
	for( const label of labels ) {
		artifacts[ label ] = summarize( runs.filter( run => run.artifact === label ) );
	}
	const comparisons = [];
	if( complete && !smoke ) {
		for( const label of labels.slice( 1 ) ) {
			for( const before of artifacts[ labels[ 0 ] ].filter( row => row.supported ) ) {
				const after = artifacts[ label ].find( row => row.name === before.name );
				if( !after?.supported ) {
					continue;
				}
				const interval = ratioInterval( before.runValues, after.runValues );
				let change = null;
				if( before.submitMs > 0 ) {
					change = ( after.submitMs / before.submitMs - 1 ) * 100;
				}
				comparisons.push( {
					"before": labels[ 0 ], "after": label, "name": before.name,
					"changePercent": change, "change95": interval,
					"stable": before.stable && after.stable,
					"excludesNoChange": !!interval &&
						( interval[ 0 ] > 0 || interval[ 1 ] < 0 )
				} );
			}
		}
	}
	return {
		"complete": complete, "smoke": smoke, "metric": "CPU submission milliseconds",
		"artifacts": artifacts, "comparisons": comparisons
	};
}

export {
	percentile, variability, summarize, ratioInterval, roundLimit, campaignSummary
};
