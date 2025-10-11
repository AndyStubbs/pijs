# Pi.js API Inventory

Generated: 2025-10-10T17:53:50.281Z

Total API Methods: 153

## Summary by Category

- **Core**: 17 methods
- **Font/Text**: 10 methods
- **Graphics - Bezier**: 1 methods
- **Graphics - Draw**: 1 methods
- **Graphics - Paint**: 1 methods
- **Graphics - Shapes**: 18 methods
- **Images**: 7 methods
- **Input - Gamepad**: 3 methods
- **Input - Keyboard**: 13 methods
- **Input - Mouse**: 13 methods
- **Input - Touch**: 8 methods
- **Screen Commands**: 20 methods
- **Screen Helpers**: 11 methods
- **Screen Management**: 1 methods
- **Sound**: 9 methods
- **Sound - Play**: 3 methods
- **Tables**: 1 methods
- **Text/Print**: 16 methods

## Detailed API Listing

### Core

Count: 17

- `defaultColor (setting)` (pi.js)
- `defaultInputFocus (setting)` (pi.js)
- `defaultPal (setting)` (pi.js)
- `errorMode (setting)` (pi.js)
- `getDefaultPal` (pi.js)
- `getScreen` (pi.js)
- `getScreenData` (pi.js)
- `parseOptions` (pi.js)
- `ready` (pi.js)
- `removeAllScreens` (pi.js)
- `screen (setting)` (pi.js)
- `set` (pi.js)
- `setDefaultColor` (pi.js)
- `setDefaultInputFocus` (pi.js)
- `setDefaultPal` (pi.js)
- `setErrorMode` (pi.js)
- `setScreen` (pi.js)

### Font/Text

Count: 10

- `char (setting)` (pi-font.js)
- `defaultFont (setting)` (pi-font.js)
- `font (setting)` (pi-font.js)
- `fontSize (setting)` (pi-font.js)
- `getAvailableFonts` (pi-font.js)
- `loadFont` (pi-font.js)
- `setChar` (pi-font.js)
- `setDefaultFont` (pi-font.js)
- `setFont` (pi-font.js)
- `setFontSize` (pi-font.js)

### Graphics - Bezier

Count: 1

- `bezier` (pi-screen-bezier.js)

### Graphics - Draw

Count: 1

- `draw` (pi-screen-draw.js)

### Graphics - Paint

Count: 1

- `paint` (pi-screen-paint.js)

### Graphics - Shapes

Count: 18

- `arc` (pi-screen-graphics.js)
- `circle` (pi-screen-graphics.js)
- `cls` (pi-screen-graphics.js)
- `color (setting)` (pi-screen-graphics.js)
- `ellipse` (pi-screen-graphics.js)
- `filterImg` (pi-screen-graphics.js)
- `get` (pi-screen-graphics.js)
- `getPal` (pi-screen-graphics.js)
- `getPixel` (pi-screen-graphics.js)
- `line` (pi-screen-graphics.js)
- `palColor (setting)` (pi-screen-graphics.js)
- `pset` (pi-screen-graphics.js)
- `put` (pi-screen-graphics.js)
- `rect` (pi-screen-graphics.js)
- `render` (pi-screen-graphics.js)
- `setColor` (pi-screen-graphics.js)
- `setPalColor` (pi-screen-graphics.js)
- `swapColor` (pi-screen-graphics.js)

### Images

Count: 7

- `drawImage` (pi-screen-images.js)
- `drawSprite` (pi-screen-images.js)
- `getImage` (pi-screen-images.js)
- `getSpritesheetData` (pi-screen-images.js)
- `loadImage` (pi-screen-images.js)
- `loadSpritesheet` (pi-screen-images.js)
- `removeImage` (pi-screen-images.js)

### Input - Gamepad

Count: 3

- `ingamepads` (pi-gamepad.js)
- `offgamepad` (pi-gamepad.js)
- `ongamepad` (pi-gamepad.js)

### Input - Keyboard

Count: 13

- `actionKey (setting)` (pi-keyboard.js)
- `cancelInput` (pi-keyboard.js)
- `clearKeys` (pi-keyboard.js)
- `inkey` (pi-keyboard.js)
- `input` (pi-keyboard.js)
- `inputCursor (setting)` (pi-keyboard.js)
- `offkey` (pi-keyboard.js)
- `onkey` (pi-keyboard.js)
- `reinitKeyboard` (pi-keyboard.js)
- `setActionKey` (pi-keyboard.js)
- `setInputCursor` (pi-keyboard.js)
- `startKeyboard` (pi-keyboard.js)
- `stopKeyboard` (pi-keyboard.js)

### Input - Mouse

Count: 13

- `enableContextMenu (setting)` (pi-screen-mouse.js)
- `getMouse` (pi-screen-mouse.js)
- `inmouse` (pi-screen-mouse.js)
- `inpress` (pi-screen-mouse.js)
- `offclick` (pi-screen-mouse.js)
- `offmouse` (pi-screen-mouse.js)
- `offpress` (pi-screen-mouse.js)
- `onclick` (pi-screen-mouse.js)
- `onmouse` (pi-screen-mouse.js)
- `onpress` (pi-screen-mouse.js)
- `setEnableContextMenu` (pi-screen-mouse.js)
- `startMouse` (pi-screen-mouse.js)
- `stopMouse` (pi-screen-mouse.js)

### Input - Touch

Count: 8

- `getTouchPress` (pi-screen-touch.js)
- `intouch` (pi-screen-touch.js)
- `offtouch` (pi-screen-touch.js)
- `ontouch` (pi-screen-touch.js)
- `pinchZoom (setting)` (pi-screen-touch.js)
- `setPinchZoom` (pi-screen-touch.js)
- `startTouch` (pi-screen-touch.js)
- `stopTouch` (pi-screen-touch.js)

### Screen Commands

Count: 20

- `bgColor (setting)` (pi-screen-commands.js)
- `blendMode (setting)` (pi-screen-commands.js)
- `canvas` (pi-screen-commands.js)
- `clearEvents` (pi-screen-commands.js)
- `containerBgColor (setting)` (pi-screen-commands.js)
- `findColor` (pi-screen-commands.js)
- `height` (pi-screen-commands.js)
- `offevent` (pi-screen-commands.js)
- `onevent` (pi-screen-commands.js)
- `pen (setting)` (pi-screen-commands.js)
- `pixelMode (setting)` (pi-screen-commands.js)
- `removeScreen` (pi-screen-commands.js)
- `setAutoRender` (pi-screen-commands.js)
- `setBgColor` (pi-screen-commands.js)
- `setBlendMode` (pi-screen-commands.js)
- `setContainerBgColor` (pi-screen-commands.js)
- `setPen` (pi-screen-commands.js)
- `setPixelMode` (pi-screen-commands.js)
- `triggerEventListeners` (pi-screen-commands.js)
- `width` (pi-screen-commands.js)

### Screen Helpers

Count: 11

- `drawCirclePen` (pi-screen-helper.js)
- `drawSquarePen` (pi-screen-helper.js)
- `findColorValue` (pi-screen-helper.js)
- `getImageData` (pi-screen-helper.js)
- `getPixelColor` (pi-screen-helper.js)
- `getPixelInternal` (pi-screen-helper.js)
- `getPixelSafe` (pi-screen-helper.js)
- `resetImageData` (pi-screen-helper.js)
- `setImageDirty` (pi-screen-helper.js)
- `setPixel` (pi-screen-helper.js)
- `setPixelSafe` (pi-screen-helper.js)

### Screen Management

Count: 1

- `screen` (pi-screen.js)

### Sound

Count: 9

- `createAudioPool` (pi-sound.js)
- `createSound` (pi-sound.js)
- `deleteAudioPool` (pi-sound.js)
- `playAudioPool` (pi-sound.js)
- `setVolume` (pi-sound.js)
- `sound` (pi-sound.js)
- `stopAudioPool` (pi-sound.js)
- `stopSound` (pi-sound.js)
- `volume (setting)` (pi-sound.js)

### Sound - Play

Count: 3

- `createTrack` (pi-play.js)
- `play` (pi-play.js)
- `stopPlay` (pi-play.js)

### Tables

Count: 1

- `printTable` (pi-screen-table.js)

### Text/Print

Count: 16

- `bitmapPrint` (pi-screen-print.js)
- `canvasCalcWidth` (pi-screen-print.js)
- `canvasPrint` (pi-screen-print.js)
- `getCols` (pi-screen-print.js)
- `getPos` (pi-screen-print.js)
- `getPosPx` (pi-screen-print.js)
- `getRows` (pi-screen-print.js)
- `piCalcWidth` (pi-screen-print.js)
- `piPrint` (pi-screen-print.js)
- `pos (setting)` (pi-screen-print.js)
- `posPx (setting)` (pi-screen-print.js)
- `print` (pi-screen-print.js)
- `setPos` (pi-screen-print.js)
- `setPosPx` (pi-screen-print.js)
- `setWordBreak` (pi-screen-print.js)
- `wordBreak (setting)` (pi-screen-print.js)

## Analysis

### Candidates for Extended Library

Based on specialization, these might move to pi-extended.js:
- Table formatting (pi-screen-table.js)

### Core Library (Recommended)

These should remain in pi-core.js:
- Screen management
- Basic shapes (line, circle, rect, pixel)
- Basic text/print
- Input handling (keyboard, mouse, touch, gamepad)
- Image loading and basic operations
- Sound loading and playback
- Palette management
