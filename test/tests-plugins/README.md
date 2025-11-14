# Plugin Visual Tests

This directory contains visual regression tests for Pi.js plugins.

## Structure

```
tests-plugins/
├── html/                  # Plugin test HTML files
│   ├── onscreen_keyboard_*.html
│   ├── table_*.html
│   ├── images/            # Test images
│   └── libs/              # Test libraries
├── screenshots/           # Reference screenshots
│   └── new/              # Generated screenshots (gitignored)
└── README.md
```

## Running Tests

The test runner is configured via the `PI_TEST_TYPE` environment variable:
- `PI_TEST_TYPE=core` (default) - Run core tests
- `PI_TEST_TYPE=plugins` - Run plugin tests

### Run All Plugin Tests

```bash
npm run test:plugins
```

This sets `PI_TEST_TYPE=plugins` and runs the test runner against `test/tests-plugins/`.

### Run Specific Plugin Tests

```bash
npm run test:plugins:grep "table"
npm run test:plugins:grep "onscreen"
```

### Run Core Tests (Default)

```bash
npm run test
```

### Run All Tests Sequentially

```bash
npm run test && npm run test:plugins
```

Or use the combined command:
```bash
npm run test:all
```

## Available Plugins

### Print Table Plugin
- `table_01.html` - Basic table rendering with various border styles
- `table_02.html` - Table with different border styles
- `table_03.html` - Table with box rendering

### Onscreen Keyboard Plugin
- `onscreen_keyboard_01.html` - Text keyboard with clicks
- `onscreen_keyboard_02.html` - Number keyboard with touch
- `onscreen_keyboard_03.html` - Input with keyboard
- `onscreen_keyboard_04.html` - Layout switching
- `onscreen_keyboard_05.html` - Number input mixed

## Plugin Dependencies

**Important:** Plugin tests require the plugins to be loaded in the correct order:

1. **print-table** must load first
2. **onscreen-keyboard** requires print-table

Example HTML header:
```html
<script src="../../../build/pi.js"></script>
<script src="../../../build/plugins/print-table/print-table.min.js"></script>
<script src="../../../build/plugins/onscreen-keyboard/onscreen-keyboard.min.js"></script>
```

## Creating New Plugin Tests

1. Create HTML file in `tests-plugins/html/`
2. Add TOML metadata with test configuration
3. Load required plugins in correct order
4. Run `npm run test:plugins` to generate reference screenshot
5. Approve reference screenshot if correct

## Test Format

All plugin tests follow the same format as core tests:

```html
<script type="text/toml">
	[[TOML_START]]
	file = "my_test_01"
	name = "My Plugin Test 01"
	width = 400
	height = 280
	test = "screenshot.js"
	delay = 0
	[[TOML_END]]
</script>
<script src="../../../build/pi.js"></script>
<script src="../../../build/plugins/my-plugin/my-plugin.min.js"></script>
```

## Test Commands

Plugin tests support the same command syntax as core tests:
- `KD "key"` - Key down
- `MC` - Mouse click  
- `TS x,y` - Touch start
- `DL ms` - Delay
- And more (see main test README)

## Notes

- Plugin tests are separate from core tests
- Allows testing plugin-specific functionality
- Each plugin can have its own test suite
- Screenshots stored separately in `tests-plugins/screenshots/`

