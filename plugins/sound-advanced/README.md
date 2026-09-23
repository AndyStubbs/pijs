# Sound Advanced Plugin

Synthesis, bus effects, level analysis, sound-effect presets, and PLAY instruments for Pi.js.

## Overview

The Sound Advanced plugin extends the `sound` plugin, which `pi.js` includes. It adds:

- `synth()`: `sound()` with a filter and filter envelope, vibrato, tremolo, pulse waves, and
  arpeggios.
- A `"periodic"` oType: NES-style looping noise for `sound()`, `synth()`, and instruments.
- `setBusVolume()` and `setBusEffect()`: per-bus volume, reverb, and delay.
- `getSoundLevels()`: peak, RMS, spectrum, and waveform data for meters and visualizers.
- `sfx()` and `definePreset()`: named retro sound effects.
- `defineInstrument()` and `@n` in `play()` strings: instruments for music.

It shares the core audio context, master volume, limiter, and voice limits, so its sounds mix
with `sound()`, `play()`, and `playAudio()` and stop with `stopSound()`.

## Installation

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

### `setBusVolume( bus, volume )`

Sets a bus volume from 0 to 1 over 10 ms. It applies after the bus effect, so it also fades
effect tails. `setBusVolume( "master", v )` is the same as `setVolume( v )`.

### `setBusEffect( bus, effect, options )`

Places `"reverb"` or `"delay"` on a bus, replacing its current effect; `null` removes it. The
bus volume is kept.

- Reverb: `time` (tail length, 0.1-10 s, default 2), `decay` (0.1-20, default 3), `mix`
  (0-1, default 0.3).
- Delay: `time` (0.01-2 s, default 0.25), `feedback` (0-0.95, default 0.4), `mix` (0-1,
  default 0.3).

```javascript
$.setBusEffect( "music", "reverb", { "time": 2.5, "mix": 0.4 } );
```

### `getSoundLevels( bus, spectrum, waveform )`

Returns `{ peak, rms, spectrum, waveform }` for the latest 2048 samples of a bus (default
`"master"`). `spectrum` (1024 values in dB) and `waveform` (2048 samples) are `Float32Array`s
when requested, otherwise `null`. The first call on a bus starts measuring it and returns
silence, so call it every frame.

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

### `defineInstrument( instrument, params )`

Stores `synth()` options as instrument 1-255 for `play()`. In a play string, `@n` selects an
instrument for the following notes and `@0` returns to the default sound; a comma track keeps
the instrument of the track before it. An instrument replaces only what it sets: the
waveform, envelope stages (in seconds), pan, and a fixed `frequency` or `frequencyEnd` for
drums; `volume` scales the note volume. Filter, vibrato, tremolo, and arpeggio apply to each
note. `null` removes an instrument.

`play()` reads instruments when it is called, so redefining one changes later songs only.

Built-in instruments: `@1` square lead, `@2` pluck bass, `@3` pad, `@4` noise snare, `@5`
hi-hat, `@6` kick drum.

```javascript
$.play( "@1 T140 O4 L8 C E G O5 C4, @2 O2 L4 C G, @6 L4 C C" );
```

## Demo

`test/demos/sound_advanced_01.html` plays every feature with controls and a level meter. Build
first with `npm run build`, then serve the repository with `npm run server`.
