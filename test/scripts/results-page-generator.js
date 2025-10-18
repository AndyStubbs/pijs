/**
 * HTML Results Page Generator
 * 
 * Generates the custom visual regression test results HTML page
 */

const fs = require( "fs" );
const path = require( "path" );

// Determine test type and paths
const TEST_TYPE = process.env.PI_TEST_TYPE || "core";
const SCREENSHOT_BASE = TEST_TYPE === "plugins" 
	? "/test/tests-plugins/screenshots" 
	: "/test/tests/screenshots";

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
	html = html.replace( "var(--pass-rate-color)", passRateColor );

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
			const refPath = `${SCREENSHOT_BASE}/${baseName}.png`;
			const newPath = `${SCREENSHOT_BASE}/new/${baseName}.png`;
			
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
			// Use screenshotName from test record (preserves camelCase like "loadFont_01")
			const baseName = test.screenshotName || test.file.replace( ".html", "" );
			const refPath = `${SCREENSHOT_BASE}/${baseName}.png`;
			const newPath = `${SCREENSHOT_BASE}/new/${baseName}.png`;
			
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
						<button class="view-diff-btn" onclick="showDiffModal('${test.name}', '${baseName}', '${refPath}', '${newPath}')">View Comparison</button>
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
			// Use screenshotName from test record
			const baseName = test.screenshotName || test.file.replace( ".html", "" );
			const newPath = `${SCREENSHOT_BASE}/new/${baseName}.png`;
			
			// Check if this is a new test (no reference screenshot)
			const isNewTest = test.error && test.error.includes( "No reference screenshot" );
			const viewButton = isNewTest ? 
				`<button class="view-diff-btn" onclick="showNewTestModal('${test.name}', '${baseName}', '${newPath}')">View & Approve</button>` : 
				"";
			
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
						${viewButton}
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
	html = html.replace( "{{TEST_TYPE}}", TEST_TYPE );

	return html;
}

module.exports = { generateResultsPage };

