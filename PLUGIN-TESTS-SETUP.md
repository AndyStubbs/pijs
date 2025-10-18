# Plugin Tests Setup - Summary

## Overview

Successfully created a separate test suite for plugin tests with dedicated npm scripts and test infrastructure.

## Changes Made

### 1. **New Test Directory Structure**

```
test/
├── tests/                           # Core Pi.js tests
│   ├── html/
│   └── screenshots/
├── tests-plugins/                   # Plugin tests (NEW)
│   ├── html/
│   │   ├── onscreen_keyboard_*.html (5 tests)
│   │   ├── table_*.html (3 tests)
│   │   ├── images/
│   │   └── libs/
│   ├── screenshots/
│   │   ├── table_*.png (3 reference screenshots)
│   │   └── new/ (generated screenshots)
│   └── README.md
└── run-visual-tests-plugins.js      # Plugin test runner (NEW)
```

### 2. **Moved Test Files**

#### Print Table Plugin Tests:
- ✅ `table_01.html` - Basic table rendering
- ✅ `table_02.html` - Multiple border styles
- ✅ `table_03.html` - Box rendering

#### Onscreen Keyboard Plugin Tests:
- ✅ `onscreen_keyboard_01.html` - Text keyboard clicks
- ✅ `onscreen_keyboard_02.html` - Number keyboard touch
- ✅ `onscreen_keyboard_03.html` - Input with keyboard
- ✅ `onscreen_keyboard_04.html` - Layout switching
- ✅ `onscreen_keyboard_05.html` - Number input mixed

### 3. **Updated npm Scripts in package.json**

```json
{
  "scripts": {
    "test": "playwright test run-visual-tests.js",           // Core tests only
    "test:grep": "playwright test run-visual-tests.js --grep",
    "test:plugins": "playwright test run-visual-tests-plugins.js",  // Plugin tests only (NEW)
    "test:plugins:grep": "playwright test run-visual-tests-plugins.js --grep",  // (NEW)
    "test:all": "playwright test",                           // All tests (NEW)
    "server": "node server.js"
  }
}
```

### 4. **Updated All Plugin Test Files**

All test files now load the required plugins:

```html
<script src="../../../build/pi.js"></script>
<script src="../../../plugins/print-table/dist/print-table.min.js"></script>
<script src="../../../plugins/onscreen-keyboard/dist/onscreen-keyboard.min.js"></script>
```

**Note:** Load order matters - print-table must load before onscreen-keyboard.

### 5. **Updated Tests for New API**

**Removed `onscreenKeyboard` parameter from `input()`:**

Before:
```javascript
$.input( { "prompt": "Name: ", "onscreenKeyboard": "always" } );
```

After:
```javascript
$.showKeyboard( "text" );
$.input( "Name: " );
```

### 6. **Updated `.gitignore`**

Added plugin test screenshots to gitignore:
```
test/tests-plugins/screenshots/new/
```

### 7. **Updated Playwright Config**

Changed testMatch to support both test runners:
```javascript
"testMatch": "run-visual-tests*.js"  // Matches both runners
```

## Usage

### Run Core Tests Only

```bash
npm run test                  # All core tests
npm run test:grep "screen"    # Filtered core tests
```

### Run Plugin Tests Only

```bash
npm run test:plugins                 # All plugin tests
npm run test:plugins:grep "table"    # Filtered plugin tests
npm run test:plugins:grep "onscreen" # Keyboard tests
```

### Run All Tests (Core + Plugins)

```bash
npm run test:all
```

## Test Results

**First plugin test run:**
```
Found 8 plugin visual regression tests
Running plugin tests...

Total:    8
Passed:   3 (table tests with existing screenshots)
Failed:   0
Skipped:  5 (onscreen keyboard tests - new screenshots generated)
```

### Next Steps

1. **Approve onscreen keyboard screenshots:**
   - Review `test/tests-plugins/screenshots/new/onscreen_keyboard_*.png`
   - If correct, copy them to `test/tests-plugins/screenshots/`
   - Re-run tests to verify they pass

2. **Run tests:**
   ```bash
   npm run test:plugins
   ```

## File Changes Summary

### Created Files
```
test/tests-plugins/                           (NEW directory)
test/tests-plugins/html/                      (NEW, tests moved here)
test/tests-plugins/screenshots/               (NEW)
test/tests-plugins/README.md                  (NEW documentation)
test/run-visual-tests-plugins.js              (NEW test runner)
PLUGIN-TESTS-SETUP.md                         (This file)
```

### Modified Files
```
package.json                                  (Added test:plugins scripts)
playwright.config.js                          (Updated testMatch pattern)
.gitignore                                    (Added plugin test screenshots)
test/tests/html/table_*.html                  (Moved to tests-plugins)
test/tests/html/onscreen_keyboard_*.html      (Moved to tests-plugins)
```

### Updated Test Files
```
test/tests-plugins/html/table_01.html         (Added plugin scripts)
test/tests-plugins/html/table_02.html         (Added plugin scripts)
test/tests-plugins/html/table_03.html         (Added plugin scripts)
test/tests-plugins/html/onscreen_keyboard_*.html (Added plugins + updated API)
test/test-onscreen-keyboard.html              (Added plugin scripts)
```

## Benefits

1. **Separation of Concerns**
   - Core tests separate from plugin tests
   - Easier to run just plugin tests
   - Easier to maintain

2. **Faster Test Cycles**
   - Run `test:plugins` for quick plugin verification
   - Don't need to run all core tests when working on plugins

3. **Clear Organization**
   - Plugin tests in dedicated directory
   - Clear which tests require which plugins
   - Each plugin can have its own test suite

4. **Flexible Testing**
   - Test core separately: `npm run test`
   - Test plugins separately: `npm run test:plugins`
   - Test everything: `npm run test:all`

## Test Coverage

### Core Pi.js Tests
- 100+ tests for core functionality
- Graphics, drawing, images, fonts, etc.
- No plugin dependencies

### Plugin Tests (8 tests)
- **Print Table:** 3 tests
  - Auto-formatted tables
  - Custom border styles  
  - Box positioning
- **Onscreen Keyboard:** 5 tests
  - Text keyboard interaction
  - Number keyboard
  - Input integration
  - Layout switching
  - Mixed input modes

## Example Test Commands

```bash
# Run only table tests
npm run test:plugins:grep "table"

# Run only onscreen keyboard tests
npm run test:plugins:grep "onscreen"

# Run specific test
npm run test:plugins:grep "table 01"

# Run all plugin tests
npm run test:plugins

# Run everything (core + plugins)
npm run test:all
```

## Success!

✅ Plugin test infrastructure complete
✅ 8 plugin tests running successfully
✅ Separate npm scripts for flexibility
✅ Clean organization and separation
✅ All tests passing or generating references

The plugin test system is fully operational! 🎉

