# Pi.js SFX Lab

A browser-based retro sound effects generator built on [Pi.js](https://pijs.org) and its
`sound-advanced` plugin. Generate a sound from a category, tweak every synth parameter, run it
through a bus effect chain, then export it as a WAV file or as ready-to-paste Pi.js code.

Pi.js does all of it: the whole interface (buttons, sliders, text, graphs) is drawn on one Pi.js
WebGL screen with its bitmap fonts, input comes through Pi.js pointer and keyboard commands, and
every sound is made with Pi.js `synth()`. The HTML page only loads the scripts.

## Features

- **Generator**: one click per category (coin, laser, jump, hit, explosion, powerup, blip,
  select, random) using `generateSfx()`. Every sound has a seed, so you can get it back later.
- **Two more pages of sounds**: compound sounds the lab builds itself from layers, each with
  its own bus effects. Page 2 has engine, beam, alarm, UFO, charge, warp, wind, fire, and
  thunder; page 3 has heartbeat, footstep, robot, bubbles, servo, airlock, level up, chime, and
  countdown. The page buttons under the generators, or the `0` key, switch pages.
- **Engine**: layers of noise and tone that burn up, burn, and burn down. Each click makes the
  next of four styles: rocket, jet, retro, and hum.
- **Layers**: a sound is up to four layers that play together. Each layer has its own full set
  of parameters, including a delay before it starts, and the burn sliders set the rise and
  fade times of every layer at once.
- **Held sounds**: a held sound plays for as long as PLAY or Space is down and then releases,
  using `synth()` with `hold` and `releaseSound()`. Its volume and cutoff sliders change it
  while it plays, through `setSynth()`.
- **Mutate**: nudges the current sound's numbers by a small random amount to get variations.
- **Full parameter editor**: every `synth()` option, grouped into oscillator, pitch, envelope,
  filter (with its own envelope), vibrato, tremolo, and arpeggio. Vibrato and tremolo can be
  steady or random.
- **Bus effects**: reverb, delay, chorus, distortion, bitcrush, and filter on the `sfx` bus,
  applied with `setBusEffect()` (a chain of up to four at once).
- **Live display**: volume envelope and pitch curve, oscilloscope,
  spectrum, and a peak meter from `getSoundLevels()`.
- **Export**:
  - WAV, recorded with `startRecording()` / `stopRecording()`, with leading and trailing
    silence trimmed.
  - JSON of the synth options.
  - JavaScript: `$.synth( {...} )` calls or `$.definePreset( "name", {...} )` calls, one for
    each layer. For a held sound the code keeps the sound IDs and shows the release.
- **Library**: save sounds in the browser (localStorage), plus a history of recent sounds.

## Running

Audio in Pi.js needs a page served over HTTP(S), so opening `index.html` from disk won't work.
The page loads Pi.js and the `sound-advanced` plugin from the repository's `build/` folder, so
build the library and start the repository server from the repository root:

```bash
npm run build
```

```bash
npm run server
```

Then open <http://localhost:8080/test/demos/sound-board/>.

Browsers keep audio locked until the first click or key press, so the first sound plays after you
interact with the page.

## Controls

| Key         | Action                           |
| ----------- | -------------------------------- |
| `Space`     | Play the current sound (hold it down for a held sound) |
| `1`–`9`     | Generate a sound from the page   |
| `0`         | Next page of sounds              |
| `M`         | Mutate                           |
| `S`         | Stop all sounds                  |

Mouse controls: drag a slider, use the wheel over it for fine steps, and right-click it to reset
it to its default. Click the seed to type one in (Enter to accept, Escape to cancel).

## Using an exported sound in a game

Load Pi.js and the `sound-advanced` plugin, then paste the exported code:

```html
<script src="pi.js"></script>
<script src="plugins/sound-advanced/sound-advanced.js"></script>
<script>
	$.definePreset( "pickup", { "frequency": 988, "frequencyEnd": 1319, "duration": 0.08 } );
	$.sfx( "pickup", 0.2 );
</script>
```

Bus effects are not part of a preset. If a sound depends on reverb or delay, set the same effect
on the game's `sfx` bus with `setBusEffect()`, or export the sound as WAV instead.

## Project layout

```
index.html          Loads Pi.js, the sound-advanced plugin, and the app
js/main.js          Entry point: screen, layout, state, actions, frame loop
js/gui.js           Small immediate-mode widget kit drawn and driven by Pi.js
js/theme.js         Colors and layout constants
js/params.js        Parameter schema, defaults, sanitizing, mutation
js/engine.js        Engine sound generator
js/recipes.js       Generators for the other compound sounds
js/display.js       Envelope plot, oscilloscope, spectrum, and meter
js/effects.js       Bus effect schema and chain building
js/exporter.js      WAV recording and code/JSON export
js/wav.js           WAV parsing, silence trimming, encoding
js/library.js       Saved sounds and history in localStorage
```

Pi.js and its plugins are loaded from `build/` at the repository root.

## License

The app code is yours to use as you like. Pi.js and its plugins are Apache-2.0, by Andy Stubbs.
