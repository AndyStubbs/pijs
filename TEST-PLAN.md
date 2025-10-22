# Pi.js Test Coverage Plan

This document outlines the current test coverage status for Pi.js and provides a roadmap for improving test coverage across all API commands.

## Overview

**Current Status:**
- Total API commands: ~100
- Commands with visual regression tests: ~60
- Commands with no tests: ~40
- Commands with limited tests: ~20
- **Overall coverage: ~60%**

**Test Infrastructure:**
- Framework: Playwright
- Test type: Visual regression (screenshot comparison)
- Total tests: 94 visual regression tests
- Location: `test/tests/html/`

## Test Coverage by Category

### ✅ Core & Screen Management

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `screen()` | ✅ Tested | Many | Well covered |
| `setScreen()` | ✅ Tested | 5 | Good coverage |
| `removeScreen()` | ❌ **Missing** | 0 | **Needs tests** |
| `getScreen()` | ✅ Tested | 4 | Good coverage |
| `width()` | ✅ Tested | Many | Used throughout |
| `height()` | ✅ Tested | Many | Used throughout |
| `canvas()` | ✅ Tested | Many | Used throughout |
| `setPixelMode()` | ⚠️ Limited | 12 | Could add edge cases |

### ⚠️ Rendering

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `render()` | ✅ Tested | Many | Well covered |
| `cls()` | ✅ Tested | Many | Well covered |
| `setAutoRender()` | ⚠️ Limited | 1 | **Needs more tests** |
| `setPen()` | ✅ Tested | ~15 | Good coverage |
| `setBlend()` | ✅ Tested | ~5 | Adequate |

### ❌ Colors & Palettes

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `setDefaultPal()` | ❌ **Missing** | 0 | **Needs tests** |
| `setDefaultColor()` | ❌ **Missing** | 0 | **Needs tests** |
| `setColor()` | ✅ Tested | Many | Well covered |
| `setPalColor()` | ✅ Tested | Several | Good coverage |
| `getPal()` | ⚠️ Limited | Few | **Needs more tests** |
| `setPal()` | ⚠️ Limited | Few | **Needs more tests** |
| `findColor()` | ⚠️ Limited | Few | **Needs more tests** |
| `setBgColor()` | ⚠️ Limited | Few | **Needs more tests** |
| `setContainerBgColor()` | ⚠️ Limited | Few | **Needs more tests** |
| `swapColor()` | ⚠️ Limited | Few | **Needs more tests** |

### ✅ Basic Graphics

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `pset()` | ✅ Tested | Several | Good coverage |
| `line()` | ✅ Tested | Several | Good coverage |
| `rect()` | ✅ Tested | Several | Good coverage |
| `circle()` | ✅ Tested | Several | Good coverage |
| `put()` | ✅ Tested | Several | Good coverage |
| `get()` | ✅ Tested | Several | Good coverage |
| `getPixel()` | ✅ Tested | Several | Good coverage |

### ⚠️ Advanced Graphics

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `arc()` | ✅ Tested | 3 | Good coverage |
| `ellipse()` | ✅ Tested | 3 | Good coverage |
| `bezier()` | ✅ Tested | 1 | Adequate |
| `filterImg()` | ⚠️ Limited | 1 | **Needs more tests** |

### ⚠️ Drawing (BASIC-style)

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `draw()` | ⚠️ Limited | 2 | **Needs comprehensive command coverage** (U, D, L, R, E, F, G, H, M, C, P, T, A) |

### ✅ Paint & Fill

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `paint()` | ✅ Tested | 3 | Good coverage |

### ✅ Images & Sprites

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `loadImage()` | ✅ Tested | Comprehensive | Full coverage in `images_comprehensive.html` |
| `loadSpritesheet()` | ✅ Tested | Comprehensive | Full coverage in `images_comprehensive.html` |
| `removeImage()` | ✅ Tested | Comprehensive | Full coverage in `images_comprehensive.html` |
| `getImage()` | ✅ Tested | Comprehensive | Full coverage in `images_comprehensive.html` |
| `getSpritesheetData()` | ✅ Tested | Comprehensive | Full coverage in `images_comprehensive.html` |
| `drawImage()` | ✅ Tested | Comprehensive | Full coverage in `images_comprehensive.html` |
| `drawSprite()` | ✅ Tested | Comprehensive | Full coverage in `images_comprehensive.html` |

### ❌ Fonts

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `loadFont()` | ✅ Tested | 2 | Good coverage |
| `setDefaultFont()` | ❌ **Missing** | 0 | **Needs tests** |
| `setFont()` | ✅ Tested | Several | Good coverage |
| `setFontSize()` | ⚠️ Limited | 1 | **Needs more tests** |
| `getAvailableFonts()` | ❌ **Missing** | 0 | **Needs tests** |
| `setChar()` | ❌ **Missing** | 0 | **Needs tests** |

### ⚠️ Text Printing

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `print()` | ✅ Tested | Many | Well covered |
| `setPos()` | ✅ Tested | Several | Good coverage |
| `setPosPx()` | ⚠️ Limited | 1 | **Needs more tests** |
| `getPos()` | ✅ Tested | Several | Good coverage |
| `getPosPx()` | ⚠️ Limited | 1 | **Needs more tests** |
| `getCols()` | ❌ **Missing** | 0 | **Needs tests** |
| `getRows()` | ❌ **Missing** | 0 | **Needs tests** |
| `setWordBreak()` | ⚠️ Limited | 5 | Could add more edge cases |
| `piCalcWidth()` | ⚠️ Limited | Few | **Needs more tests** |
| `canvasCalcWidth()` | ⚠️ Limited | Few | **Needs more tests** |

### ⚠️ Keyboard Input

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `startKeyboard()` | ✅ Tested | Several | Good coverage |
| `stopKeyboard()` | ⚠️ Limited | Few | **Needs more tests** |
| `inkey()` | ✅ Tested | Several | Good coverage |
| `setActionKeys()` | ⚠️ Limited | 3 | **Needs more tests** |
| `removeActionKeys()` | ❌ **Missing** | 0 | **Needs tests** |
| `onkey()` | ✅ Tested | Several | Good coverage |
| `offkey()` | ✅ Tested | Several | Good coverage |
| `input()` | ✅ Tested | Several | Good coverage |
| `cancelInput()` | ⚠️ Limited | Few | **Needs more tests** |

### ❌ Mouse Input

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `startMouse()` | ✅ Tested | Several | Good coverage |
| `stopMouse()` | ❌ **Missing** | 0 | **Needs tests** |
| `getMouse()` | ❌ **Missing** | 0 | **Needs tests** |
| `inmouse()` | ✅ Tested | Several | Good coverage |
| `setEnableContextMenu()` | ❌ **Missing** | 0 | **Needs tests** |
| `onmouse()` | ✅ Tested | Several | Good coverage |
| `offmouse()` | ❌ **Missing** | 0 | **Needs tests** |

### ❌ Touch Input

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `startTouch()` | ⚠️ Limited | 4 | **Needs more tests** |
| `stopTouch()` | ❌ **Missing** | 0 | **Needs tests** |
| `intouch()` | ⚠️ Limited | 4 | **Needs more tests** |
| `ontouch()` | ⚠️ Limited | 4 | **Needs more tests** |
| `offtouch()` | ❌ **Missing** | 0 | **Needs tests** |
| `setPinchZoom()` | ❌ **Missing** | 0 | **Needs tests** |

### ⚠️ Press Input (Unified)

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `inpress()` | ✅ Tested | Several | Good coverage |
| `onpress()` | ✅ Tested | Several | Good coverage |
| `offpress()` | ⚠️ Limited | 2 | **Needs more tests** |
| `onclick()` | ✅ Tested | Several | Good coverage |
| `offclick()` | ⚠️ Limited | 2 | **Needs more tests** |

### ❌ Gamepad Input

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `startGamepad()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `stopGamepad()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `ingamepad()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `setGamepadSensitivity()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `onGamepadConnected()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `onGamepadDisconnected()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |

### ❌ Sound & Audio

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `createAudioPool()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `deleteAudioPool()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `playAudioPool()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `stopAudioPool()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `sound()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `stopSound()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `setVolume()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |

### ❌ Music (BASIC-style)

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `play()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |
| `stopPlay()` | ❌ **Missing** | 0 | **CRITICAL: Entire subsystem untested** |

### ❌ Events

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `clearEvents()` | ❌ **Missing** | 0 | **Needs tests** |

### ❌ Plugins

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `registerPlugin()` | ⚠️ Limited | 0 | Plugin tests exist separately in `tests-plugins/` |
| `getPlugins()` | ❌ **Missing** | 0 | **Needs tests** |

### ✅ Utilities

| Command | Status | Test Count | Notes |
|---------|--------|------------|-------|
| `ready()` | ✅ Tested | Many | Well covered |
| `set()` | ✅ Tested | Several | Good coverage |

---

## Priority Plan for Test Coverage Improvement

### 🔴 Priority 1: Critical Gaps (Entire Subsystems)

**Estimated Time: 2-3 weeks**

These are complete API subsystems with zero test coverage:

1. **Gamepad Input (6 commands)**
   - Challenge: Requires gamepad simulation in Playwright
   - Tests needed: Connection/disconnection, button presses, analog sticks, sensitivity
   - Files to create: `gamepad_01.html` through `gamepad_06.html`

2. **Sound & Audio (7 commands)**
   - Challenge: Audio testing in headless browser
   - Tests needed: Audio pool creation, playback, stopping, volume control, synthesized sounds
   - Files to create: `sound_01.html` through `sound_07.html`
   - May require non-visual tests (API validation rather than screenshot)

3. **Music BASIC-style (2 commands)**
   - Challenge: Audio testing in headless browser
   - Tests needed: Music notation parsing, multi-track playback
   - Files to create: `play_01.html`, `play_02.html`
   - May require non-visual tests (API validation rather than screenshot)

### 🟠 Priority 2: High-Value Missing Commands

**Estimated Time: 1-2 weeks**

Core functionality with no tests:

4. **Screen Management**
   - `removeScreen()` - Test screen removal and cleanup
   - File: `removeScreen_01.html`

5. **Color Palette System**
   - `setDefaultPal()` - Test default palette setting
   - `setDefaultColor()` - Test default color setting
   - `getPal()` - Expand tests for palette retrieval
   - `swapColor()` - Test color swapping functionality
   - Files: `palette_02.html` through `palette_05.html`

6. **Font System**
   - `setDefaultFont()` - Test default font setting
   - `getAvailableFonts()` - Test font enumeration
   - `setChar()` - Test custom character definition
   - `setFontSize()` - Expand tests (currently only 1)
   - Files: `loadFont_03.html` through `loadFont_06.html`

7. **Text System**
   - `getCols()` - Test column count retrieval
   - `getRows()` - Test row count retrieval
   - `getPosPx()` - Expand pixel position tests
   - `setPosPx()` - Expand pixel position tests
   - Files: `pos_02.html` through `pos_05.html`

8. **Mouse Input Gaps**
   - `getMouse()` - Test mouse state retrieval
   - `stopMouse()` - Test mouse stopping
   - `setEnableContextMenu()` - Test context menu control
   - `offmouse()` - Test event handler removal
   - Files: `inmouse_02.html` through `inmouse_05.html`

9. **Touch Input Gaps**
   - `stopTouch()` - Test touch stopping
   - `offtouch()` - Test event handler removal
   - `setPinchZoom()` - Test pinch zoom control
   - Files: `intouch_02.html` through `intouch_05.html`

10. **Image Management**
    - `removeImage()` - Test image removal from memory
    - `getImage()` - Test screen region capture to image
    - `getSpritesheetData()` - Expand tests
    - Files: `images_01.html` through `images_03.html`

11. **Events**
    - `clearEvents()` - Test event handler clearing
    - File: `clearEvents_01.html`

### 🟡 Priority 3: Expand Limited Coverage

**Estimated Time: 1-2 weeks**

Commands with minimal tests that need more comprehensive coverage:

12. **Rendering**
    - `setAutoRender()` - Currently 1 test, add edge cases
    - Files: `autoRender_01.html` through `autoRender_03.html`

13. **Advanced Graphics**
    - `filterImg()` - Currently 1 test, add more filter types
    - Files: `filterImg_02.html` through `filterImg_05.html`

14. **Drawing Commands**
    - `draw()` - Currently 2 tests, need comprehensive coverage of:
      - Direction commands: U, D, L, R, E, F, G, H
      - M (move), C (color), P (paint), T (turn), A (arc)
    - Files: `draw_03.html` through `draw_10.html`

15. **Keyboard Input**
    - `setActionKeys()` - Expand tests (currently 3)
    - `removeActionKeys()` - Add tests
    - `cancelInput()` - Expand tests
    - Files: `keyboard_01.html` through `keyboard_03.html`

16. **Press Input**
    - `offpress()` - Expand tests (currently 2)
    - `offclick()` - Expand tests (currently 2)
    - Files: `press_01.html`, `press_02.html`

17. **Text Width Calculations**
    - `piCalcWidth()` - Expand tests
    - `canvasCalcWidth()` - Expand tests
    - Files: `calcWidth_01.html`, `calcWidth_02.html`

### 🟢 Priority 4: Edge Cases and Robustness

**Estimated Time: 2-3 weeks**

Improve existing tests with edge cases:

18. **Parameter Validation**
    - Test null/undefined parameters
    - Test out-of-bounds values
    - Test type mismatches
    - Files: `parameters_02.html` through `parameters_10.html`

19. **Error Handling**
    - Expand `errors_01.html` and `errors_02.html`
    - Test error conditions for all major APIs
    - Files: `errors_03.html` through `errors_10.html`

20. **Performance Tests**
    - Large screen sizes
    - Many sprites/images
    - Complex filters
    - Files: `performance_01.html` through `performance_05.html`

21. **Integration Tests**
    - Multiple screens active
    - Screen switching
    - Resource cleanup
    - Files: `integration_01.html` through `integration_05.html`

---

## Testing Strategy

### Visual Regression Tests

**When to Use:**
- Graphics commands (shapes, lines, pixels)
- Text rendering
- Image/sprite drawing
- Color operations
- Layout and positioning

**Format:**
```html
<!DOCTYPE html>
<html>
<head>
	<title>Test Name</title>
	<script type="text/toml">
		[[TOML_START]]
		test = "screenshot.js"
		file = "test_name"
		name = "Test Description"
		width = 320
		height = 200
		delay = 0
		[[TOML_END]]
	</script>
	<script src="../../../build/pi.js"></script>
</head>
<body>
<script>
	$.ready( function () {
		$.screen( "320x200" );
		// Test code here
		$.render();
	} );
</script>
</body>
</html>
```

### API Validation Tests

**When to Use:**
- Audio/sound commands (can't screenshot)
- State retrieval commands (getters)
- Cleanup/removal commands
- Event handler registration/removal

**Approach:**
- Use Playwright's `page.evaluate()` to run JavaScript
- Assert return values and state changes
- Verify no errors are thrown
- Check internal state consistency

### Interactive Tests

**When to Use:**
- Input commands (keyboard, mouse, touch, gamepad)
- User interaction flows

**Approach:**
- Use TOML `commands` block for automated interaction:
  ```toml
  commands = """
  	DL 100
  	KT "Hello World"
  	KP "Enter"
  """
  ```
- Simulate mouse movements and clicks with Playwright
- For gamepad: May need browser API mocking

### Test Guidelines

1. **Keep tests focused**: One API command or feature per test
2. **Use descriptive names**: `circle_filled_01.html`, `palette_swap_colors_01.html`
3. **Document test purpose**: Add comments explaining what's being tested
4. **Test edge cases**: Boundaries, null values, invalid inputs
5. **Use consistent screen sizes**: 320x200, 640x480 for most tests
6. **Ensure deterministic output**: Set seeds for random operations
7. **Clean up resources**: Test cleanup functions (removeImage, deleteAudioPool, etc.)

---

## Test Organization

### Directory Structure

```
test/
├── tests/
│   ├── html/
│   │   ├── core/           # Core & screen management
│   │   ├── graphics/       # Basic & advanced graphics
│   │   ├── text/           # Text & font tests
│   │   ├── input/          # Keyboard, mouse, touch, gamepad
│   │   ├── audio/          # Sound & music tests
│   │   ├── images/         # Image & sprite tests
│   │   └── integration/    # Multi-feature tests
│   └── screenshots/
└── scripts/
```

**Note:** This is a proposed reorganization. Current structure has all tests in `html/` root.

---

## Success Metrics

### Short-term Goals (3 months)
- [ ] 80% API command coverage
- [ ] All critical subsystems tested (gamepad, audio, music)
- [ ] All "missing" commands have at least 1 test

### Medium-term Goals (6 months)
- [ ] 90% API command coverage
- [ ] All commands have edge case tests
- [ ] Comprehensive error handling tests
- [ ] Performance benchmarks established

### Long-term Goals (12 months)
- [ ] 95%+ API command coverage
- [ ] Integration test suite for common usage patterns
- [ ] Automated performance regression detection
- [ ] Cross-browser compatibility tests

---

## Test Execution

### Running Tests

```bash
# Start development server
npm run server

# Run all visual regression tests
npm test

# Run with verbose output
npm run test:verbose

# Run with browser visible
npm run test:headed

# Interactive test UI
npm run test:ui
```

### Viewing Results

- `test/results.html` - Custom summary with visual diffs
- `test/playwright-report/` - Detailed Playwright report
- `test/test-results/` - Test artifacts and screenshots

---

## Notes

- **Audio tests** may require special handling since headless browsers have limitations
- **Gamepad tests** will need browser API simulation/mocking
- **Performance tests** should be run separately with specific configuration
- **Cross-browser testing** is not currently configured but should be considered
- Some tests require user interaction simulation via Playwright commands

---

## Contributing

When adding new tests:

1. Follow the Pi.js coding conventions (tabs, double quotes, spacing)
2. Add TOML metadata block with descriptive name
3. Include comments explaining test purpose
4. Run test locally and verify screenshot
5. Commit reference screenshot with test file
6. Update this document if adding new test categories

---

## Maintenance

This document should be updated:
- When new API commands are added
- After each test sprint/milestone
- When coverage metrics change significantly
- When testing strategy evolves

**Last Updated:** October 20, 2025  
**Version:** 1.0

