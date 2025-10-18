# Onscreen Keyboard Visual Tests

This directory contains 5 visual regression tests for the onscreen keyboard module.

## Test Files

### onscreen_keyboard_01.html - Text Keyboard Clicks
**Purpose:** Test clicking on text keyboard keys with mouse

**Commands:**
- Shows text keyboard
- Clicks on keys: q, w, e, r, t (first 5 keys on second row)
- Uses mouse clicks (MC) with move (MV) commands

**What it tests:**
- Text keyboard rendering
- Mouse click interaction with keyboard keys
- Keystroke simulation from onscreen keyboard

---

### onscreen_keyboard_02.html - Number Keyboard Touch
**Purpose:** Test touching number keyboard keys with touch events

**Commands:**
- Shows number keyboard
- Touches keys: 1, 2, 3, 4, 5 (first 5 number keys)
- Uses touch start (TS) and touch end (TE) commands

**What it tests:**
- Number keyboard rendering
- Touch interaction with keyboard keys
- Touch event handling

---

### onscreen_keyboard_03.html - Input with Clicks
**Purpose:** Test input command integration with keyboard clicks

**Commands:**
- Starts input with onscreen keyboard in "always" mode
- Clicks on keyboard keys to type: q, w
- Clicks on space key
- Tests input prompt with keyboard shown

**What it tests:**
- Input command with onscreenKeyboard: "always"
- Typing into input via keyboard clicks
- Input cursor and prompt rendering
- Keyboard integration with input system

---

### onscreen_keyboard_04.html - Layout Switching
**Purpose:** Test switching between keyboard layouts (caps, symbols)

**Commands:**
- Shows text keyboard
- Touches CAPS key to switch to uppercase
- Types uppercase letters: Q, W, E
- Touches SYMBOLS key to switch to symbol layout
- Tests layout switching functionality

**What it tests:**
- CAPS lock toggle (lowercase ↔ uppercase)
- SYMBOLS toggle (text ↔ symbols)
- Layout rendering after switch
- Special key handling

---

### onscreen_keyboard_05.html - Number Input Mixed
**Purpose:** Test number input with mixed mouse, touch, and keyboard events

**Commands:**
- Starts number input with onscreen keyboard
- Uses mouse click on key 1
- Uses mouse click on key 2
- Uses keyboard press for key 3
- Uses touch event on key 4
- Uses mouse click on key 5
- Tests mixed input methods

**What it tests:**
- Number input mode
- Mixed input methods (mouse + touch + keyboard)
- All input methods work together
- Input validation for numbers

---

## Command Reference

The tests use the following Playwright test commands:

### Mouse Commands
- `MV x,y` - Move mouse to position
- `MC` - Mouse click at current position

### Touch Commands
- `TS x,y` - Touch start at position
- `TE` - Touch end
- `TM x,y` - Touch move to position

### Keyboard Commands
- `KP "key"` - Key press
- `KT "text"` - Type text

### Utility Commands
- `DL ms` - Delay in milliseconds

## Key Positions

Based on font size 2 (8x8 pixels) and keyboard layout:

### Text Keyboard (starting at y=120 after 2 lines of text + prompt)
- Row 1 (numbers): y=120, x starts at 40, spacing 16px
- Row 2 (qwerty): y=136, x starts at 40, spacing 16px
- Row 3 (asdfgh): y=152, x starts at 40, spacing 16px
- Row 4 (zxcvbn): y=168, x starts at 40, spacing 16px

### Number Keyboard
- Similar positioning but with different layout
- Wider keys for some buttons (Enter, +/-)

## Running the Tests

```bash
# Run all visual tests
npm test

# Run specific test
npx playwright test --grep "onscreen keyboard 01"

# Update snapshots
npm test -- --update-snapshots
```

## Expected Behavior

Each test should:
1. Render the keyboard correctly
2. Respond to mouse/touch events on keys
3. Simulate keystrokes to the input system
4. Highlight pressed keys briefly
5. Match the reference screenshot

## Notes

- Tests use deterministic positioning for repeatability
- Delays ensure keyboard renders before interaction
- Mixed input methods verify all event paths work
- Visual comparison catches rendering regressions

