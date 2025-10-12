/**
 * HTML Results Page Generator
 * 
 * Generates the custom visual regression test results HTML page
 */

// Generate HTML results page
function generateResultsPage( results ) {
	const passed = results.tests.filter( t => t.status === "passed" );
	const failed = results.tests.filter( t => t.status === "failed" );
	const skipped = results.tests.filter( t => t.status === "skipped" );

	const passRate = results.total > 0 
		? ( ( results.passed / results.total ) * 100 ).toFixed( 1 )
		: 0;

	let html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Pi.js Test Results</title>
	<style>
		body {
			font-family: monospace;
			background: #222;
			color: #fff;
			padding: 20px;
			margin: 0;
		}
		h1 {
			color: #4CAF50;
		}
		.summary {
			background: #333;
			padding: 20px;
			border-radius: 5px;
			margin: 20px 0;
		}
		.summary h2 {
			margin-top: 0;
			color: #FFC107;
		}
		.stats {
			display: flex;
			gap: 20px;
			margin: 20px 0;
		}
		.stat {
			background: #1a1a1a;
			padding: 15px 25px;
			border-radius: 5px;
			text-align: center;
		}
		.stat-value {
			font-size: 32px;
			font-weight: bold;
		}
		.stat-passed { color: #4CAF50; }
		.stat-failed { color: #f44336; }
		.stat-skipped { color: #FFC107; }
		.test-list {
			background: #1a1a1a;
			padding: 15px;
			border-radius: 5px;
		}
		.test-list.collapsed {
			display: none;
		}
		.section-header {
			cursor: pointer;
			user-select: none;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.section-header:hover {
			opacity: 0.8;
		}
		.toggle-icon {
			font-size: 20px;
			transition: transform 0.3s;
		}
		.toggle-icon.collapsed {
			transform: rotate(-90deg);
		}
		.test-item {
			padding: 10px;
			margin: 5px 0;
			background: #333;
			border-radius: 3px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.test-item.passed {
			border-left: 4px solid #4CAF50;
		}
		.test-item.failed {
			border-left: 4px solid #f44336;
		}
		.test-item.skipped {
			border-left: 4px solid #FFC107;
		}
		.test-name {
			flex: 1;
		}
		.test-status {
			padding: 4px 12px;
			border-radius: 3px;
			font-weight: bold;
		}
		.status-passed {
			background: #4CAF50;
			color: #000;
		}
		.status-failed {
			background: #f44336;
			color: #fff;
		}
		.status-skipped {
			background: #FFC107;
			color: #000;
		}
		.test-details {
			font-size: 0.9em;
			color: #888;
			margin-top: 5px;
		}
		.error-msg {
			color: #f44336;
			margin-top: 5px;
			font-size: 0.9em;
		}
		a {
			color: #4CAF50;
			text-decoration: none;
		}
		a:hover {
			text-decoration: underline;
		}
	</style>
</head>
<body>
	<h1>Pi.js v2.0 Visual Regression Test Results</h1>
	
	<div class="summary">
		<h2>Test Summary</h2>
		<div class="stats">
			<div class="stat">
				<div class="stat-value">${results.total}</div>
				<div>Total Tests</div>
			</div>
			<div class="stat">
				<div class="stat-value stat-passed">${results.passed}</div>
				<div>Passed</div>
			</div>
			<div class="stat">
				<div class="stat-value stat-failed">${results.failed}</div>
				<div>Failed</div>
			</div>
			<div class="stat">
				<div class="stat-value stat-skipped">${results.skipped}</div>
				<div>Skipped</div>
			</div>
			<div class="stat">
				<div class="stat-value" style="color: ${passRate >= 90 ? '#4CAF50' : passRate >= 70 ? '#FFC107' : '#f44336'}">${passRate}%</div>
				<div>Pass Rate</div>
			</div>
		</div>
	</div>`;

	// Failed tests
	if( failed.length > 0 ) {
		html += `
	<div class="summary">
		<div class="section-header" onclick="toggleSection('failed')">
			<h2 style="color: #f44336;">Failed Tests (${failed.length})</h2>
			<span class="toggle-icon" id="toggle-failed">▼</span>
		</div>
		<div class="test-list" id="list-failed">`;

		for( const test of failed ) {
			html += `
			<div class="test-item failed">
				<div class="test-name">
					<a href="${test.url}" target="_blank">${test.name}</a>
					<div class="test-details">${test.file}</div>
					${test.error ? `<div class="error-msg">${test.error}</div>` : ""}
				</div>
				<div class="test-status status-failed">FAILED</div>
			</div>`;
		}

		html += `
		</div>
	</div>`;
	}

	// Passed tests
	if( passed.length > 0 ) {
		html += `
	<div class="summary">
		<div class="section-header" onclick="toggleSection('passed')">
			<h2 style="color: #4CAF50;">Passed Tests (${passed.length})</h2>
			<span class="toggle-icon collapsed" id="toggle-passed">▼</span>
		</div>
		<div class="test-list collapsed" id="list-passed">`;

		for( const test of passed ) {
			html += `
			<div class="test-item passed">
				<div class="test-name">
					<a href="${test.url}" target="_blank">${test.name}</a>
					<div class="test-details">${test.file}</div>
				</div>
				<div class="test-status status-passed">PASSED</div>
			</div>`;
		}

		html += `
		</div>
	</div>`;
	}

	// Skipped tests
	if( skipped.length > 0 ) {
		html += `
	<div class="summary">
		<div class="section-header" onclick="toggleSection('skipped')">
			<h2 style="color: #FFC107;">Skipped Tests (${skipped.length})</h2>
			<span class="toggle-icon collapsed" id="toggle-skipped">▼</span>
		</div>
		<div class="test-list collapsed" id="list-skipped">`;

		for( const test of skipped ) {
			html += `
			<div class="test-item skipped">
				<div class="test-name">
					<a href="${test.url}" target="_blank">${test.name}</a>
					<div class="test-details">${test.file}</div>
					${test.error ? `<div class="error-msg">${test.error}</div>` : ""}
				</div>
				<div class="test-status status-skipped">SKIPPED</div>
			</div>`;
		}

		html += `
		</div>
	</div>`;
	}

	html += `
	<script>
		function toggleSection(section) {
			const list = document.getElementById('list-' + section);
			const icon = document.getElementById('toggle-' + section);
			
			list.classList.toggle('collapsed');
			icon.classList.toggle('collapsed');
		}
	</script>
</body>
</html>`;

	return html;
}

module.exports = { generateResultsPage };

