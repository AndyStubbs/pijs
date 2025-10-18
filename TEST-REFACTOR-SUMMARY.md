# Test Refactor Summary

## Overview

Refactored the test system to support separate plugin tests without code duplication.

## Solution

**Single configurable test runner** instead of duplicate files.

### Test Runner Configuration

The test runner (`test/run-visual-tests.js`) now accepts a `PI_TEST_TYPE` environment variable:

```javascript
const TEST_TYPE = process.env.PI_TEST_TYPE || "core";
const TEST_CONFIG = {
	"core": {
		"testsDir": "tests/html",
		"screenshotsDir": "tests/screenshots",
		"urlPrefix": "/test/tests/html",
		"description": "Pi.js Visual Regression Tests"
	},
	"plugins": {
		"testsDir": "tests-plugins/html",
		"screenshotsDir": "tests-plugins/screenshots",
		"urlPrefix": "/test/tests-plugins/html",
		"description": "Pi.js Plugin Visual Regression Tests"
	}
};
```

## npm Scripts

```json
{
  "test": "playwright test run-visual-tests.js",          // Core tests (default)
  "test:grep": "playwright test run-visual-tests.js --grep",
  "test:plugins": "set PI_TEST_TYPE=plugins&& playwright test run-visual-tests.js",  // Plugin tests
  "test:plugins:grep": "set PI_TEST_TYPE=plugins&& playwright test run-visual-tests.js --grep",
  "test:all": "playwright test run-visual-tests.js"      // Core tests (same as test)
}
```

## Usage

### Run Core Tests
```bash
npm run test
npm run test:grep "screen"
```

### Run Plugin Tests
```bash
npm run test:plugins
npm run test:plugins:grep "table"
npm run test:plugins:grep "onscreen"
```

### Run Both
```bash
npm run test && npm run test:plugins
```

## Directory Structure

```
test/
├── tests/                      # Core Pi.js tests
│   ├── html/                   # Core test files
│   └── screenshots/            # Core screenshots
├── tests-plugins/              # Plugin tests
│   ├── html/                   # Plugin test files (8 tests)
│   │   ├── table_*.html (3)
│   │   ├── onscreen_keyboard_*.html (5)
│   │   ├── images/
│   │   └── libs/
│   ├── screenshots/            # Plugin reference screenshots
│   │   └── new/                # Generated screenshots
│   └── README.md
└── run-visual-tests.js         # Single configurable test runner
```

## Benefits

✅ **No code duplication** - Single test runner
✅ **Easy to maintain** - Changes apply to both test types
✅ **Simple configuration** - Just set environment variable
✅ **Separate test results** - Plugin tests don't affect core tests
✅ **Flexible execution** - Run core, plugins, or both

## Test Results

**Plugin Tests:**
```
Found 8 plugins tests
Running plugins tests...

Total:    8
Passed:   3  (table tests)
Skipped:  5  (onscreen keyboard tests - new)
```

**File Comparison:**
- Before: 2 test runner files (~800 lines each)
- After: 1 test runner file (~820 lines)
- **Eliminated: ~800 lines of duplicate code!**

## Implementation Details

**Environment Variable:** `PI_TEST_TYPE`
- Default: `"core"`
- For plugins: `"plugins"`

**Configured Paths:**
- Tests directory
- Screenshots directory
- New screenshots directory
- URL prefix
- Test suite description

All paths are dynamically set based on the test type, making the runner completely reusable.

Perfect refactor with zero duplication! 🎉

