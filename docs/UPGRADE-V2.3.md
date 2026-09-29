# Pi.js 2.3 Update

Pi.js 2.3 rewrites the sound plugin on a mixed bus graph, adds the `sound-advanced` plugin, and
gives the keyboard, pointer, and gamepad plugins one set of input conventions. The `sound`,
`keyboard`, `pointer`, and `gamepad` plugins are now 2.0.0. Core adds stricter validation and
fixes screen, font, and plugin lifecycle behavior. Four unreleased plugins were removed.

Most applications need the changes in [Renamed commands](#renamed-commands) and
[Compatibility changes](#compatibility-changes). Renamed commands have no aliases: an old name is
not registered, so code that uses it fails at its first call.

## Renamed commands

| Plugin | Pi.js 2.2 | Pi.js 2.3 |
| --- | --- | --- |
| `keyboard` | `inkey`, `onkey`, `offkey` | `inKey`, `onKey`, `offKey` |
| `pointer` | `inmouse`, `onmouse`, `offmouse` | `inMouse`, `onMouse`, `offMouse` |
| `pointer` | `intouch`, `ontouch`, `offtouch` | `inTouch`, `onTouch`, `offTouch` |
| `pointer` | `inpress`, `onpress`, `offpress` | `inPress`, `onPress`, `offPress` |
| `pointer` | `onclick`, `offclick` | `onClick`, `offClick` |
| `pointer` | `setEnableContextMenu`, `set( { enableContextMenu } )` | `setContextMenu`, `set( { contextMenu } )` |
| `gamepad` | `ingamepad` | `inGamepad` |
| `gamepad` | `onGamepadConnected( fn )`, `onGamepadDisconnected( fn )` | `onGamepad( "connect", fn )`, `onGamepad( "disconnect", fn )`, with `offGamepad()` |
| `gamepad` | `setGamepadSensitivity`, `set( { gamepadSensitivity } )` | `setGamepadDeadZone`, `set( { gamepadDeadZone } )` |

## Additions

### Sound

- `pauseAudio()`, `resumeAudio()`, and `setAudio()` control a playing sample by the instance ID
  that `playAudio()` now returns.
- `setBusVolume()` sets the volume of the `sfx`, `music`, `audio`, or `master` bus.
- `setSoundLimiter()` turns the output limiter on or off. It is on by default.
- PLAY adds `MH` (sustain level) and `MR` (release) to the envelope, `MP` for pan, the white
  and pink noise waveforms `WN` and `WP`, and `@n` for instruments.

### The `sound-advanced` plugin

`sound-advanced` 1.0.0 is a new plugin for the Full bundle, or for Lite with the `sound` plugin.
It is not part of either bundle; load `pijs-web/plugins/sound-advanced` after them.

- `synth()` plays a synthesized voice with pulse waves, a filter and its envelope, vibrato,
  arpeggio, tremolo, and periodic noise.
- `sfx()` plays a preset, `definePreset()` adds one, and `generateSfx( category, seed,
  variation )` builds a repeatable sound effect.
- `defineInstrument()` defines a PLAY instrument, synthesized or from a loaded file
  (`audio`, `rootFrequency`, and `loop`).
- `setBusEffect()` adds reverb, delay, `"filter"`, `"distortion"`, `"bitcrush"`, or `"chorus"`
  to a bus, alone or as a chain of `{ effect, ...options }` items. Changing a chain's options
  ramps them in place.
- `getSoundLevels()` reports the levels, spectrum, and waveform of a bus or of the output.
- `startRecording()`, `stopRecording()`, `getRecordingState()`, and `saveRecording()` record a
  bus or the output to a WAV file.
- `onPlay()` and `offPlay()` run handlers at each note's audible time, for visuals synced to
  music.

### Input

- `onWheel( fn, once, hitBox, customData )` and `offWheel( fn )` receive mouse-wheel input as
  `{ x, y, deltaX, deltaY }`, in CSS pixels. While a screen has wheel handlers, the wheel does
  not scroll the page over its canvas. `clearEvents( "wheel" )` removes them.
- The gamepad helpers accept standard-mapping names as well as indices: buttons `south`, `east`,
  `west`, `north`, `leftShoulder`, `rightShoulder`, `leftTrigger`, `rightTrigger`, `select`,
  `start`, `leftStick`, `rightStick`, `dpadUp`, `dpadDown`, `dpadLeft`, `dpadRight`, and `home`,
  and axes `leftX`, `leftY`, `rightX`, and `rightY`.
- `vibrateGamepad( gamepadIndex, duration, strong, weak )` plays a dual-rumble effect. It
  returns `false` where the browser or pad cannot vibrate.
- Key, mouse, touch, press, and click data have a `cancelled` field, set when a release comes
  from blur, a hidden page, a stop command, or the browser cancelling the input rather than from
  the user.

### Plugins

- `provideService()` and `getService()` let one plugin offer an API to another. The `sound`
  plugin provides sound service v1, which `sound-advanced` uses.
- `getPlugins()` reports each plugin's `state`.

## Compatibility changes

### Core

- `set()` throws `INVALID_OPTION` for an option it does not recognize, including options from
  plugins that are not loaded. Remove the option, fix its spelling, or load the plugin that
  provides it. Every name is checked first, so a call that throws applies no setting. Options
  that are not an object throw `INVALID_OPTIONS`, and a screen setting with no active screen
  throws `NO_ACTIVE_SCREEN`.
- `$.clearEvents()` clears mouse, touch, press, and click handlers on every screen, not only the
  active one, and cancels an `input()` prompt on any screen. Call `clearEvents()` on a screen to
  clear only that screen.
- Input that used to be accepted now throws: `arc()` angles must be finite; `loadFont()` sizes
  must be integers of at least 1 and its margin an integer of 0 or more; `setPrintSize()` scales
  must be finite and its padding an integer of 0 or more; and `$.removeScreen()` throws
  `INVALID_SCREEN_ID` for a missing, unknown, or already removed screen.
- An argument passed as `undefined` counts as omitted, so it takes the default.
- The standalone plugin entry points (`pijs-web/plugins/…`) are for Lite. Loading one that the
  Full bundle already includes throws `DUPLICATE_PLUGIN`.
- A plugin whose initialization fails leaves nothing installed, and its name can be registered
  again. Registering a plugin after initialization throws `REGISTRATION_CLOSED`.

### TypeScript

- Projects using `nodenext` module resolution get the package's types.
- Lite projects that load a plugin get that plugin's command, screen command, and setting
  types. The standalone declarations of the plugins that Full bundles type them for Lite only.
- The global `pi` and `$` are declared by the Full declarations only; Lite projects use the
  module's exports.

### Sound

#### `sound()`

`attack` and `decay` are replaced by an ADSR envelope: `attackTime`, `decayTime`,
`sustainLevel`, and `releaseTime`. The positional order is `frequency`, `duration`, `volume`,
`oType`, `delay`, `attackTime`, `decayTime`, `sustainLevel`, `releaseTime`, `pan`, and
`frequencyEnd`.

The seventh argument changes meaning. In 2.2, `$.sound( 440, 1, 1, "square", 0, 0.01, 0.5 )`
gave a 0.5 s tail; in 2.3 that argument is `decayTime`, and the tail is the 0.1 s default
release. Write it with the object form, or pass `releaseTime` as the ninth argument:

```javascript
$.sound( {
	"frequency": 440, "duration": 1, "oType": "square",
	"attackTime": 0.01, "releaseTime": 0.5
} );
```

Frequency is no longer rounded. The default envelope and a short de-click ramp change the
sound slightly. A sweep with an endpoint at or below 0 throws `INVALID_FREQUENCY`.

#### Audio files

- `loadAudio()` no longer takes `poolSize`; its third argument is `stream`, a boolean that
  plays the file through a media element instead of decoding it. Each `loadAudio()` holds one
  `ready()` wait.
- `playAudio()` returns an instance ID. There is no per-file limit, only the shared voice
  limits. `duration` is time in the file, unchanged at rate 1 and scaled by `playbackRate`.
- `stopAudio()` accepts instance IDs and fades out. Its object form takes `id` instead of
  `audioId`.
- `playbackRate` is limited to 0.25–4 for streamed audio and 0.0625–16 for decoded audio, and
  values outside the range throw `INVALID_PLAYBACK_RATE`.
- Default audio IDs are `audio_N` instead of `audioPool_N`.
- Audio needs a page served over HTTP or HTTPS; `file://` pages throw `UNSUPPORTED_PROTOCOL`.

#### Voices, timing, and output

- Samples, synthesized sounds, and PLAY notes share one voice budget. Looping samples count
  toward it but are never stolen automatically; when no voice can be replaced, a new one is
  rejected. A rejected call still returns an ID, already completed, and operations on it do
  nothing. Replacing a stream instance reuses its slot.
- Delayed `sound()` and `playAudio()` requests are limited to 1024 pending; beyond that, the call
  throws `TOO_MANY_PENDING_SOUNDS`.
- `stopSound()`, `stopPlay()`, and `stopAudio()` finish about 15 ms after the call, with a
  10 ms fade, instead of at once.
- `setVolume()` sets one master gain for samples and synthesized sound alike, before the
  limiter.
- With the limiter on, output above 0.9 is soft-clipped, so mixes that clipped hard now
  saturate smoothly.
- After the main thread stalls, a sound late by up to 25 ms starts at its place in the timeline
  with a short fade in; later PLAY notes and delayed one-shots are skipped; a looping sample
  moves to where it would be. Suspending the audio context keeps a song's position.
- On iOS, the mute switch silences audio files as well as synthesized sound, and game audio
  mixes with audio from other apps.

#### PLAY

- The envelope is ADSR: `MA` and `MD` set the attack and decay times, `MH` the sustain level,
  and `MR` the release, each as a percentage. `MT` and the undocumented `MU`, `MX`, `MY`, `MZ`,
  and `MK` are ignored with a warning. Rewrite `MAa MTt MDd` as `MAa MDd MHh MRr` with new
  percentages.
- `MS`, `MN`, and `ML` shorten the sounding part of each note and keep the beat, so songs that
  used `MS` or `MN` play at their written tempo, slower than in 2.2.
- `C4.` is a dotted quarter; 2.2 ignored a dot after a length. `C-` and `B#` cross the octave
  boundary. `N116`–`N119` play G#9–B9, a semitone lower than before.

#### Error codes

| Pi.js 2.2 | Pi.js 2.3 |
| --- | --- |
| `AUDIO_POOL_NOT_FOUND` | `AUDIO_NOT_FOUND` |
| `EMPTY_POOL` | `AUDIO_NOT_LOADED` |
| `INVALID_POOL_SIZE` | Removed with `poolSize` |

New codes: `INVALID_STREAM`, `INVALID_PLAYBACK_RATE`, `UNSUPPORTED_PROTOCOL`, `INVALID_LOOP`,
`INVALID_PAN`, `INVALID_DELAY`, `INVALID_AUDIO_ID`, and `TOO_MANY_PENDING_SOUNDS`.

### Input conventions

The keyboard, pointer, and gamepad plugins now follow the same rules:

- **Handler identity:** a handler is identified by its mode and function. Registering the same
  function for the same mode again does nothing, so code that registered twice now runs once.
  `once` removes a handler before its first call.
- **Dispatch:** state is updated before handlers run. A handler that throws is reported with
  `console.error`, and the other handlers still run; `window` error listeners no longer see it.
  A handler registered during an event first runs for the next one, and one removed during an
  event does not run later in it.
- **Live data:** data objects and lists are frozen or updated in place, so writing to them fails
  silently, or throws in strict mode. Copy a value to keep it.
- **Errors:** validation throws `TypeError` or `RangeError` with a code per parameter instead of
  `INVALID_PARAMETERS` or a plain `Error`. Non-boolean flags such as `once` throw instead of
  being coerced.

### Keyboard

- The plugin starts on first use, with `inKey()`, `onKey()`, or action keys, not when it loads,
  so keys pressed earlier are not tracked. Call `startKeyboard()` to track from an earlier
  point. `stopKeyboard()` holds until `startKeyboard()`.
- `offKey()` matches on key, mode, and function; `once` and `allowRepeat` are ignored.
  `offKey( key, mode )` removes every handler of that mode, `offKey( key, null, fn )` removes the
  function from both modes, and `offKey( key )` throws.
- Blur, a hidden page, `stopKeyboard()`, typing into a text field, and an `input()` prompt
  release held keys through `"up"` handlers, with `cancelled: true`.
- `inKey()` inside an `"up"` handler no longer reports the released key. A combination that
  lists both a key's code and its value runs once per event, and its callback receives the key
  data in the order given. The caller's key array is no longer sorted.
- Keys typed into an `input()` prompt, including the Enter that ends it, no longer reach
  `onKey()` handlers or `inKey()`. Handle the prompt's result instead of watching for Enter.
- `setActionKeys()` and `set( { "actionKeys": … } )` replace the action keys instead of adding to
  them. Pass every key in one call, or use `removeActionKeys()` to remove some.
- `inKey( "" )` and `inKey( 0 )` throw instead of returning the list. Modes other than `"up"`
  and `"down"`, empty keys, `"any"` in a combination, non-boolean `once`, `allowRepeat`, and
  `input()` flags, and `maxLength: 0` throw.

### Mouse, touch, press, and click

- Mouse, touch, press, and click data share one shape: `x`, `y`, `lastX`, `lastY`, `buttons`,
  `action`, `type`, `id`, and `cancelled`. `lastX` and `lastY` start at the current position
  instead of `null`; touch data has `buttons` (1 while down); mouse data has `id`; click data
  has `action: "click"`; pen input has `type: "pen"`.
- Touch handlers use the modes `"down"`, `"move"`, and `"up"` instead of `"start"`, `"move"`,
  and `"end"`. `onTouch( "start" )` and `onTouch( "end" )` throw `INVALID_MODE`, naming the new
  mode.
- Touch handlers run once per touch, with the touch that changed, so touches that start
  together arrive in separate calls and an `"up"` handler receives the touch that lifted.
- `inPress().touches` holds copies of the touches down, empty for the mouse.
- `inMouse()` and `inPress()` return `null` before the first event and after their input stops,
  instead of a centered record with action `"none"`. `inTouch()` returns an empty array after
  `stopTouch()`. A read returns the object the handlers received until the next event.
- `offX( null, fn )` removes a function from every mode, and `offX()` with neither argument
  throws `INVALID_MODE`.
- `clearEvents( "press" )` no longer clears click handlers; use `"click"`.
- `setPinchZoom()` is a screen command. It sets `touch-action` on that screen's canvas, to
  `pinch-zoom` or `none`, and no longer changes `<body>`; `set( { pinchZoom } )` needs a
  screen. While touch tracking runs, the canvas has `touch-action: none` instead of Pi.js
  preventing `touchstart`.
- The context menu is suppressed from screen creation, and `setContextMenu()` no longer starts
  mouse tracking.
- A drag that leaves the canvas keeps reporting moves and reports its release. A pointer the
  browser cancels releases a held button with `cancelled: true`, and a cancelled touch never
  clicks.
- A click needs the same pointer's press and release inside its hit box, and each finger clicks
  on its own. Right and middle buttons no longer click. Press follows only the primary touch.
- A hit box that is not an object, such as `false`, throws instead of being ignored, and a
  negative hit-box size throws.

### Gamepad

- `inGamepad()` always returns an array, empty while polling is stopped, and `inGamepad( i )`
  returns `null` for a missing pad and while stopped. Replace `if( pads )` checks with a length
  check, and `=== undefined` with `=== null`.
- On pads with the standard mapping, the two sticks use a radial dead zone, so diagonal movement
  near the center is no longer lost, near-axis movement no longer snaps to the axis, and a full
  diagonal reads a distance of 1 instead of about 0.9. Other axes keep a per-axis dead zone. The
  dead zone must be under 1: `setGamepadDeadZone( 1 )` throws.
- "Just pressed", "just released", and "axis changed" report what happened since the previous
  read, shared by every reader in the same frame, so timer-driven and slower loops see every
  press.
- `stopGamepad()` holds even with handlers registered, releases every button, and stops
  connection handlers until `startGamepad()`, which reports the connections made or lost while
  stopped.
- Input keeps updating when the window loses focus but the page stays visible. Hiding the page
  releases every button and centers the axes.
- A connect handler registered later receives the pads already connected. Code that also loops
  over `inGamepad()` to set up players can set one up twice.
- Pads, their `buttons` and `axes`, and the pad list are live objects updated in place.
- A helper index must be an integer or a standard name: `getButton( "0" )` used to read button 0
  and now throws `RangeError`, and `getButton( 1.5 )` throws `TypeError`.
  `getButtonPressed()` past the last button returns `false` instead of `null`.

### Removed plugins

These plugins were never part of the release package, so projects that use its builds are not
affected. Their source remains at the `v2.2.0` tag.

| Plugin | What it provided | Replacement |
| --- | --- | --- |
| `onscreen-keyboard` | `showKeyboard()` and `hideKeyboard()`: a virtual keyboard for touch devices | None; the 2.2 source needs the 2.2 `keyboard` and `pointer` APIs |
| `pi-vision` | Character-cell windows and controls under `$.vis` | None; the 2.2 source needs the 2.2 `pointer` API |
| `print-table` | `printTable()`: text tables with borders | None; build it from the 2.2 source |
| `pens` | Nothing: an incomplete stub that registered no commands | None needed |

## Fixes

### Core

- `getPal( false )` and `getDefaultPal( false )` exclude index 0, as the default does.
- `getImage()` of an offscreen screen returns a canvas copy of its pixels.
- `polygon()` fills shapes with coordinates far off the screen correctly.
- `blitImage()` and `blitSprite()` accept every color form `drawImage()` accepts, and their
  object forms apply the documented defaults, where an omitted scale drew nothing.
- `setChar()` works on every font, including the default font, and changes the character on
  every screen that uses the font. It edits the font's own copy of its image, so an image or
  canvas passed to `loadFont()` is left unchanged.
- Offscreen screens draw again after a WebGL context loss that happens while no offscreen
  screen exists, where every later offscreen screen used to draw nothing.
- The circle geometry cache is bounded.

### Keyboard

- A key is released by its code, whatever value its keyup reports, so a letter pressed with
  Shift no longer stays held.
- `input()` reads its own keys, so it works after `stopKeyboard()`. It prevents the default
  action of the keys it handles, so Space no longer scrolls and Tab no longer moves focus; Ctrl
  and Meta shortcuts are left to the browser, and pasted text is inserted.
- Keys typed into an input inside a shadow root are ignored.
- The prompt keeps to one line, and printing continues on the line below it. Numeric prompts
  resolve with a number, and a value with no digits resolves to 0.
- `"up"` handlers receive the keyup's data, and a keyup whose press was not seen still reaches
  single-key and `"any"` handlers.
- `startKeyboard()` no longer blurs the focused element.

### Mouse, touch, press, and click

- Removing a handler no longer disables the other handlers of its mode.
- Each touch in `inTouch()` keeps its own action.
- A release for a button or touch that is not held is ignored.
- Blur no longer resets polled state; hiding the page or a stop command releases through the
  `"up"` handlers with `cancelled: true`.
- A press that starts on the canvas border or padding is ignored, and hit boxes accept
  fractional values.

### Gamepad

- A throwing connection handler no longer stops the others or leaves a pad tracked after it
  disconnects.
- A button press that happens between reads is no longer lost.
