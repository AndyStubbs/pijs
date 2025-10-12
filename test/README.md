# Pi.js Visual Regression Tests

This directory contains visual regression tests for Pi.js v2.0.

## Test Structure

```
test/
├── tests/                  # Test files directory
│   ├── html/              # 94 HTML test files
│   │   ├── *.html         # Individual test files
│   │   ├── images/        # Test assets
│   │   └── libs/          # JavaScript libraries (seedrandom.js)
│   └── screenshots/       # Reference PNG images
│       └── new/           # Generated screenshots (gitignored)
├── run-visual-tests.js    # Playwright test runner
├── test-api.html          # API comparison tool
└── README.md              # This file
```

## Running Tests

### Prerequisites

**Start the development server first:**

```bash
npm run server
# Server must be running on http://localhost:8080
```

### Automated Visual Regression Tests

**In a separate terminal:**

```bash
# Run all tests (minimal output, custom summary)
npm test

# Run tests with verbose Playwright output
npm run test:verbose

# Run tests with browser visible
npm run test:headed

# Run tests with Playwright UI (interactive)
npm run test:ui
```

### Manual Testing

Start the dev server and browse test files:

```bash
npm run server
```

Then navigate to:
- `http://localhost:8080/test/tests/html/` - All test files
- `http://localhost:8080/test/test-api.html` - API comparison tool

## Test Results

After running tests, results are available at:
- `test/test-results/results.html` - Custom summary page with visual diffs
- `test/test-results/` - Playwright test artifacts (screenshots, traces)
- `test/playwright-report/` - Playwright's detailed HTML report

To view the Playwright HTML report:
```bash
npx playwright show-report test/playwright-report
```

## Test Format

Each test file contains:

1. **TOML Metadata Block:**
```html
<script type="text/toml">
	[[TOML_START]]
	test = "screenshot.js"
	file = "circle_01"
	name = "Circle Test 01"
	width = 320
	height = 200
	delay = 0
	[[TOML_END]]
</script>
```

2. **Test Code:**
```javascript
$.ready(function () {
	$.screen( "320x200" );
	$.circle( 160, 100, 50 );
	$.render();
});
```

3. **Reference Screenshot:**
- Located in `tests/screenshots/circle_01.png`
- New screenshots saved in `tests/screenshots/new/circle_01.png`

## Screenshot Comparison

The test runner:
1. Loads each test page
2. Waits for specified delay
3. Takes a screenshot
4. Compares with reference image using pixel-by-pixel comparison
5. Allows up to 1% pixel difference (configurable threshold)
6. Reports pass/fail based on comparison

## Adding New Tests

1. Create HTML file in `test/tests/html/`
2. Add TOML metadata block
3. Write test code using `$.ready()`
4. Run test once to generate screenshot in `tests/screenshots/new/`
5. Review output and copy to `tests/screenshots/` if correct

## Test Coverage

Current tests cover:
- Screen management (11 tests)
- Drawing primitives (14 tests)
- Paint/fill (3 tests)
- Text/fonts (14 tests)
- Images (10 tests)
- Input systems (14 tests)
- Palettes (5 tests)
- Tables (3 tests)
- Special features (10 tests)

**Total:** 94 visual regression tests

## Troubleshooting

**Tests timing out:**
- Increase timeout in `playwright.config.js`
- Check if server is running

**Screenshot mismatches:**
- Check console for errors
- Compare images in `screenshots/new/` with `screenshots/` manually
- Verify test logic is correct
- Font rendering may vary by OS/browser

**Reference images missing:**
- Tests will be skipped if no reference image exists
- Generate reference by running test and copying from `screenshots/new/` to `screenshots/`

