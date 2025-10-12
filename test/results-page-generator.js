/**
 * HTML Results Page Generator
 * 
 * Generates the custom visual regression test results HTML page
 */

const fs = require( "fs" );
const path = require( "path" );

// Generate HTML results page
function generateResultsPage( results ) {
	const passed = results.tests.filter( t => t.status === "passed" );
	const failed = results.tests.filter( t => t.status === "failed" );
	const skipped = results.tests.filter( t => t.status === "skipped" );

	const passRate = results.total > 0 
		? ( ( results.passed / results.total ) * 100 ).toFixed( 1 )
		: 0;

	// Determine pass rate color
	const passRateColor = passRate >= 90 ? "#4CAF50" : passRate >= 70 ? "#FFC107" : "#f44336";

	// Read template
	const templatePath = path.join( __dirname, "results-template.html" );
	let html = fs.readFileSync( templatePath, "utf8" );

	// Replace summary stats
	html = html.replace( "{{TOTAL}}", results.total );
	html = html.replace( "{{PASSED}}", results.passed );
	html = html.replace( "{{FAILED}}", results.failed );
	html = html.replace( "{{SKIPPED}}", results.skipped );
	html = html.replace( "{{PASS_RATE}}", passRate );
	html = html.replace( "{{PASS_RATE_COLOR}}", passRateColor );

	// Build failed tests HTML
	let failedHTML = "";
	if( failed.length > 0 ) {
		// Sort failed tests alphabetically by name
		const sortedFailed = [...failed].sort( ( a, b ) => a.name.localeCompare( b.name ) );
		
		failedHTML += `
	<div class="summary">
		<div class="section-header" onclick="toggleSection('failed')">
			<h2 style="color: #f44336;">Failed Tests (${failed.length})</h2>
			<span class="toggle-icon" id="toggle-failed">▼</span>
		</div>
		<div class="test-list" id="list-failed">`;

		for( const test of sortedFailed ) {
			// Use screenshotName from test record (preserves camelCase like "loadFont_01")
			const baseName = test.screenshotName || test.file.replace( ".html", "" );
			const refPath = `/test/tests/screenshots/${baseName}.png`;
			const newPath = `/test/tests/screenshots/${baseName}_new.png`;
			
			failedHTML += `
			<div class="test-item failed">
				<div class="test-content">
					<div class="test-info">
						<div class="test-name">
							<a href="${test.url}" target="_blank">${test.name}</a>
						</div>
						<div class="test-details">${test.file}</div>
						${test.error ? `<div class="error-msg">${test.error}</div>` : ""}
					</div>
					<div class="test-actions">
						<button class="view-diff-btn" onclick="showDiffModal('${test.name}', '${baseName}', '${refPath}', '${newPath}')">View Comparison</button>
						<div class="test-status status-failed">FAILED</div>
					</div>
				</div>
			</div>`;
		}

		failedHTML += `
		</div>
	</div>`;
	}

	// Build passed tests HTML
	let passedHTML = "";
	if( passed.length > 0 ) {
		// Sort passed tests alphabetically by name
		const sortedPassed = [...passed].sort( ( a, b ) => a.name.localeCompare( b.name ) );
		
		passedHTML += `
	<div class="summary">
		<div class="section-header" onclick="toggleSection('passed')">
			<h2 style="color: #4CAF50;">Passed Tests (${passed.length})</h2>
			<span class="toggle-icon collapsed" id="toggle-passed">▼</span>
		</div>
		<div class="test-list collapsed" id="list-passed">`;

		for( const test of sortedPassed ) {
			passedHTML += `
			<div class="test-item passed">
				<div class="test-content">
					<div class="test-info">
						<div class="test-name">
							<a href="${test.url}" target="_blank">${test.name}</a>
						</div>
						<div class="test-details">${test.file}</div>
					</div>
					<div class="test-actions">
						<div class="test-status status-passed">PASSED</div>
					</div>
				</div>
			</div>`;
		}

		passedHTML += `
		</div>
	</div>`;
	}

	// Build skipped tests HTML
	let skippedHTML = "";
	if( skipped.length > 0 ) {
		// Sort skipped tests alphabetically by name
		const sortedSkipped = [...skipped].sort( ( a, b ) => a.name.localeCompare( b.name ) );
		
		skippedHTML += `
	<div class="summary">
		<div class="section-header" onclick="toggleSection('skipped')">
			<h2 style="color: #FFC107;">Skipped Tests (${skipped.length})</h2>
			<span class="toggle-icon collapsed" id="toggle-skipped">▼</span>
		</div>
		<div class="test-list collapsed" id="list-skipped">`;

		for( const test of sortedSkipped ) {
			skippedHTML += `
			<div class="test-item skipped">
				<div class="test-content">
					<div class="test-info">
						<div class="test-name">
							<a href="${test.url}" target="_blank">${test.name}</a>
						</div>
						<div class="test-details">${test.file}</div>
						${test.error ? `<div class="error-msg">${test.error}</div>` : ""}
					</div>
					<div class="test-actions">
						<div class="test-status status-skipped">SKIPPED</div>
					</div>
				</div>
			</div>`;
		}

		skippedHTML += `
		</div>
	</div>`;
	}

	// Replace placeholders in template
	html = html.replace( "{{FAILED_TESTS}}", failedHTML );
	html = html.replace( "{{PASSED_TESTS}}", passedHTML );
	html = html.replace( "{{SKIPPED_TESTS}}", skippedHTML );

	return html;
}

module.exports = { generateResultsPage };

