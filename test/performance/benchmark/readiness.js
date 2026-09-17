/** Conservative release decisions; smoke results never establish performance acceptance. */

/** Evaluate one complete primary comparison without using stability as a veto. */
function assessPerformance( summary, primary = false ) {
	if( !summary?.complete || summary.smoke || !summary.comparisons?.length ) {
		return { "status": "inconclusive", "reason": "No complete qualification intervals" };
	}
	const regressions = summary.comparisons.filter( row =>
		row.changePercent > 5 && row.change95?.[ 0 ] > 0 );
	if( regressions.length ) {
		return { "status": "failed", "reason": "Established regression", regressions };
	}
	const targets = { "images": 10, "sprites": 10, "line": 10, "circle-filled": 5 };
	const benefits = [];
	if( primary ) {
		for( const [ name, reduction ] of Object.entries( targets ) ) {
			const row = summary.comparisons.find( item => item.name === name );
			let status = "inconclusive";
			if( Number.isFinite( row?.changePercent ) && row.change95?.every( Number.isFinite ) ) {
				status = "failed";
				if( row.changePercent <= -reduction && row.change95[ 1 ] < 0 ) {
					status = "passed";
				}
			}
			benefits.push( { name, reduction, status, "comparison": row ?? null } );
		}
	}
	if( benefits.some( item => item.status === "failed" ) ) {
		return { "status": "failed", "reason": "Primary benefit target not met", benefits };
	}
	if( benefits.some( item => item.status === "inconclusive" ) ||
		summary.comparisons.some( row => !Number.isFinite( row.changePercent ) ||
			row.change95?.length !== 2 || !row.change95.every( Number.isFinite ) ) ) {
		return { "status": "inconclusive", "reason": "Missing comparison evidence", benefits };
	}
	return { "status": "passed", benefits, regressions };
}

/** Unavailable secondary targets do not prevent completion of a local readiness pass. */
function assessReadiness( checks, primary, secondary ) {
	const all = [ ...checks, primary, ...secondary ];
	if( all.some( check => check.status === "failed" || check.performance?.status === "failed" ) ) {
		return { "local": "failed", "broad": "failed" };
	}
	let local = "inconclusive";
	if( checks.length && checks.every( check => check.status === "passed" ) &&
		primary.status === "passed" ) {
		local = "passed";
	}
	let broad = "inconclusive";
	if( secondary.some( check => check.status === "pending" ) ) { broad = "pending"; }
	return { local, broad };
}

export { assessPerformance, assessReadiness };
