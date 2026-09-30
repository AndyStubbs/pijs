# Sound Advanced Plugin

Synthesis, bus effects, level analysis, sound-effect presets, and PLAY instruments for Pi.js.

## Overview

The Sound Advanced plugin 1.0.0 extends the `sound` plugin. It adds:

- `synth()`: `sound()` with a filter and filter envelope, vibrato, tremolo, pulse waves, and
  arpeggios.
- A `"periodic"` oType: NES-style looping noise for `sound()`, `synth()`, and instruments.
- `setBusEffect()`: reverb, delay, filter, distortion, bitcrusher, and chorus on a bus, alone or
  in chains of up to four.
- `getSoundLevels()`: peak, RMS, spectrum, and waveform data for meters and visualizers.
- `sfx()`, `definePreset()`, and `generateSfx()`: named and generated retro sound effects.
- `defineInstrument()` and `@n` in `play()` strings: synthesized and sample instruments for music.
- `startRecording()`, `stopRecording()`, `getRecordingState()`, and `saveRecording()`: WAV
  recordings of the output or a bus.
- `onPlay()` and `offPlay()`: handlers timed to the notes of a song, for visuals synced to music.

It shares the core audio context, master volume, limiter, and voice limits, so its sounds mix
with `sound()`, `play()`, and `playAudio()` and stop with `stopSound()`. `setBusVolume()` is part
of the `sound` plugin.

## Installation

The plugin is in neither Pi.js bundle, so it is loaded separately with Full or with Lite.

### Browser (IIFE)

Load the plugin after `pi.js` (or after `pi.lite.js` and the `sound` plugin):

```html
<script src="build/pi.min.js"></script>
<script src="build/plugins/sound-advanced/sound-advanced.min.js"></script>
```

### ES Modules

```javascript
import pi from "pijs-web";
import soundAdvancedPlugin from "pijs-web/plugins/sound-advanced";

pi.registerPlugin( {
	"name": "sound-advanced",
	"dependencies": [ "sound" ],
	"init": soundAdvancedPlugin
} );
```

Importing the plugin also adds its command declarations to the Pi.js TypeScript types.

## Buses

Sound is mixed on three buses before the master volume:

| Bus | Carries |
| --- | --- |
| `"sfx"` | `sound()`, `synth()`, and `sfx()` |
| `"music"` | `play()` |
| `"audio"` | `playAudio()` |

`"master"` is the mix of all three, after `setVolume()`.

## Commands

### `synth( options )`

Plays a synthesized sound and returns a sound ID for `stopSound()`. It takes every `sound()`
parameter plus:

| Option | Default | Meaning |
| --- | --- | --- |
| `oType` | `"triangle"` | Any `sound()` type, or `"pulse"` |
| `duty` | 0.5 | Pulse width for `"pulse"`, between 0 and 1 |
| `filterType` | none | `"lowpass"`, `"highpass"`, `"bandpass"`, or `"notch"`; the filter runs only when set |
| `filterCutoff` | 1000 | Cutoff in Hz |
| `filterQ` | 1 | Resonance, 0-100 |
| `filterAttackTime`, `filterDecayTime`, `filterSustainLevel`, `filterReleaseTime` | 0, 0, 1, 0.1 | Filter envelope, timed like the volume envelope |
| `filterAmount` | 0 | Octaves the filter envelope moves the cutoff at its peak, -10 to 10 |
| `vibratoRate`, `vibratoDepth` | 5, 0 | Vibrato in cycles per second and cents; off at depth 0 |
| `tremoloRate`, `tremoloDepth` | 5, 0 | Tremolo in cycles per second and share of volume (0-1); off at depth 0 |
| `arpeggio`, `arpeggioRate` | none, 12 | Semitone offsets to cycle through, and steps per second |

```javascript
$.synth( {
	"frequency": 110, "duration": 0.5, "oType": "sawtooth",
	"filterType": "lowpass", "filterCutoff": 200, "filterAmount": 4,
	"filterDecayTime": 0.3, "filterSustainLevel": 0
} );
```

### Periodic noise

`oType: "periodic"` plays a 93-step pseudo-random sequence that repeats, like the metallic
noise mode of the NES. `frequency` sets how many steps play per second, so the sequence
repeats `frequency / 93` times per second, and `frequencyEnd` sweeps it.

```javascript
$.sound( { "frequency": 40000, "frequencyEnd": 8000, "duration": 0.3, "oType": "periodic" } );
```

### `setBusEffect( bus, effect, options )`

Places an effect, or a chain of up to four, on the `"sfx"`, `"music"`, `"audio"`, or `"master"`
bus, replacing what it held; `null` or an empty array removes it. The bus volume, set with the
`sound` plugin's `setBusVolume()`, applies after the effect, so it also fades effect tails.

| Effect | Options (range, default) |
| --- | --- |
| `"reverb"` | `time` (0.1-10 s, 2), `decay` (0.1-20, 3), `mix` (0-1, 0.3) |
| `"delay"` | `time` (0.01-2 s, 0.25), `feedback` (0-0.95, 0.4), `mix` (0-1, 0.3) |
| `"filter"` | `type` (`"lowpass"`, `"highpass"`, or `"bandpass"`), `cutoff` (20-20000 Hz, 1000), `q` (0.0001-100, 1) |
| `"distortion"` | `drive` (0-1, 0.5), `tone` (200-20000 Hz, 4000), `mix` (0-1, 1) |
| `"bitcrush"` | `bits` (1-16, 8), `rate` (1-64 frames held, 1), `mix` (0-1, 1) |
| `"chorus"` | `rate` (0.1-10 Hz, 1.5), `depth` (0-10 ms, 3), `mix` (0-1, 0.5) |

For a chain, pass an array of `{ effect, ...options }` objects and omit `options`; the effects
run in array order. When the effects and their order match the bus's current ones, the call
updates them in place: changed options move over 20 ms without clicks, and tails continue.
Changing a reverb's `time` or `decay` or a filter's `type` rebuilds that effect, which cuts its
tail. The bitcrusher loads an audio worklet on first use and passes the dry sound, with one
warning, where the worklet cannot load.

```javascript
$.setBusEffect( "music", "reverb", { "time": 2.5, "mix": 0.4 } );

// A muffled, echoing chain, then open the filter without a click
$.setBusEffect( "sfx", [
	{ "effect": "filter", "cutoff": 600 },
	{ "effect": "delay", "time": 0.3, "mix": 0.4 }
] );
$.setBusEffect( "sfx", [
	{ "effect": "filter", "cutoff": 8000 },
	{ "effect": "delay", "time": 0.3, "mix": 0.4 }
] );
```

### `getSoundLevels( bus, spectrum, waveform )`

Returns `{ peak, rms, spectrum, waveform }` for the latest 2048 samples of a bus (default
`"master"`), after its effect and volume. `"master"` is measured before the output limiter, and
`"output"` after it, as the speakers receive it. `spectrum` (1024 values in dB) and `waveform`
(2048 samples) are `Float32Array`s when requested, otherwise `null`. The first call on a bus starts
measuring it and returns silence, so call it every frame.

### `sfx( name, variation )` and `definePreset( name, params )`

`sfx()` plays a preset and returns its sound ID. `variation` (0-1) adds random pitch and
length changes. Built-in presets: `coin`, `laser`, `jump`, `hit`, `explosion`, `powerup`,
`blip`, and `select`. `definePreset()` stores `synth()` options under a name; they are
validated and copied when defined.

```javascript
$.definePreset( "zap", { "frequency": 1800, "frequencyEnd": 300, "duration": 0.12,
	"oType": "pulse", "duty": 0.125 } );
$.sfx( "zap", 0.3 );
```

### `generateSfx( category, seed, variation )`

Returns a frozen object of `synth()` options and plays nothing, so the result can go to `synth()`,
`definePreset()`, or a recording. The categories are `coin`, `laser`, `jump`, `hit`,
`explosion`, `powerup`, `blip`, `select`, and `random`. The same category and seed always return
the same options: seed 0 is the built-in preset of that name, and every other seed up to
4294967295 is a different variant, such as one laser per enemy type. `variation` (0-1) moves every
numeric option by a random amount, up to a quarter of its range, and is the only part that is not
repeatable.

```javascript
const laser = $.generateSfx( "laser", 42 );
$.definePreset( "enemyLaser", laser );
$.sfx( "enemyLaser" );
```

### `defineInstrument( instrument, params )`

Stores `synth()` options as instrument 1-255 for `play()`. In a play string, `@n` selects an
instrument for the following notes and `@0` returns to the default sound; a comma track keeps
the instrument of the track before it. An instrument replaces only what it sets: the
waveform, envelope stages (in seconds), pan, and a fixed `frequency` or `frequencyEnd` for
drums; `volume` scales the note volume. Filter, vibrato, tremolo, and arpeggio apply to each
note. `null` removes an instrument.

A sample instrument plays an audio file loaded with `loadAudio()` instead of a waveform: `audio`
is the file's name, `rootFrequency` (default 261.63, C4) the pitch at which it plays at its own
speed, and `loop` (default `false`) repeats it until the note's release ends. Each note changes
the playback rate, so pitch and length change together. Notes of a song started while the file is
loading, or of a streamed file, are silent, with one warning per instrument and `play()` call;
wait with `ready()` first.

`play()` reads instruments when it is called, so redefining one changes later songs only.

Built-in instruments: `@1` square lead, `@2` pluck bass, `@3` pad, `@4` noise snare, `@5`
hi-hat, `@6` kick drum.

```javascript
$.play( "@1 T140 O4 L8 C E G O5 C4, @2 O2 L4 C G, @6 L4 C C" );

$.loadAudio( "piano-c4.wav", "piano" );
await $.ready();
$.defineInstrument( 7, { "audio": "piano", "releaseTime": 0.3 } );
$.play( "@7 T100 L4 C E G >C" );
```

### Recording

```javascript
await $.startRecording( "output", 30 );
$.play( "T140 L8 C D E F G" );

// Later
const wav = await $.stopRecording();
$.saveRecording( wav, "song.wav" );
```

- `startRecording( bus, maxDuration, bitDepth )` captures `"output"` (the default: the final
  signal after the limiter), `"master"` (before the limiter), or one bus after its effect and
  volume. `maxDuration` is 1-600 seconds (default 60), and `bitDepth` 16 for PCM (the default) or
  32 for float. It returns a promise that resolves when capture is running; await it before
  playing anything that must be in the recording.
- `stopRecording()` resolves with a stereo `audio/wav` Blob at the audio context's sample rate.
- `getRecordingState()` returns `{ state, duration }`: `"idle"`, `"starting"`, `"recording"`, or
  `"full"` once `maxDuration` is reached, and the seconds captured so far.
- `saveRecording( blob, filename )` starts a browser download of the Blob.

One recording runs at a time; another `startRecording()` throws `RECORDING_ACTIVE`. Recording
follows the audio clock, so nothing is captured while audio is locked or suspended. Where the
recorder's audio worklet cannot load, such as under a Content Security Policy that blocks `blob:`
scripts, the promise rejects with `RECORDING_UNAVAILABLE`. A 16-bit recording uses about 11.5 MB
per minute.

### `onPlay( mode, fn, once )` and `offPlay( mode, fn )`

`onPlay( "note", fn )` calls `fn` for each note of a `play()` song as it starts to sound, and
`onPlay( "end", fn )` once when a song finishes or is stopped. Handlers run on animation frames, on
the first frame at or after the note reaches the speakers, including the output latency the
browser reports. While audio is suspended, queued notes wait until it resumes and they sound.
Notes more than 250 ms late, such as while the tab is hidden, are skipped rather than delivered
in a burst; song ends are always delivered.

A note's frozen data is `{ type, trackId, track, time, duration, frequency, volume, delay }`, and
an end's is `{ type, trackId, stopped, delay }`. A handler is identified by its mode and function;
`offPlay()` removes handlers as the input plugins' `off` commands do, and `clearEvents( "play" )`
removes every one.

```javascript
$.onPlay( "note", function( note ) {
	flash( note.frequency, note.volume );
} );
$.play( "T120 L8 C E G E C" );
```

## Demo

`test/demos/sound_advanced_01.html` plays every feature with controls and a level meter. Build
first with `npm run build`, then serve the repository with `npm run server`.
