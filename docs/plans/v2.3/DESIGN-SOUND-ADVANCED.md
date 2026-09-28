# Pi.js 2.3 Sound Advanced Expansion Design

Design for the Phases 7–10 expansion of `sound-advanced`: revision 2, approved. Implementation
and status: [ROADMAP §4](ROADMAP.md#4-sound), with the completed tasks in
[ROADMAP §13.4](ROADMAP.md#134-sound). The base design is
[DESIGN-SOUND.md](DESIGN-SOUND.md), referred to below as "the sound design".

## 1. Purpose

`sound-advanced` 1.0.0 (Sound Phase 5) covers synthesis, two bus effects, a level
analyser, presets, and PLAY instruments. It is about 6 KB gzipped, and most of that is
`synth()`. This design expands the plugin before 2.3.0 ships so that it covers what games
commonly ask of an audio library beyond playback:

1. **Recording:** capture what Pi.js plays, or a single bus, and save it as a WAV file.
2. **More bus effects:** filter, distortion, bitcrusher, and chorus; effect chains; and smooth
   parameter changes.
3. **Game features:** a seeded retro sound-effect generator and music sync callbacks for
   `play()`.
4. **Sample instruments:** loaded audio used as a pitched `play()` instrument.

The work continues the sound workstream as Phases 7–10, tracked in the ROADMAP as `Sound 7.1`
and onward.

## 2. Scope Decisions

| Topic | Decision |
| --- | --- |
| Location | Every new command lives in `sound-advanced`. Core `sound` changes only where a feature cannot reach what it needs through service v1 (Section 3) |
| Recording source | Pi.js output only: the final signal after the limiter, or one bus. No microphone input |
| Recording format | 16-bit PCM WAV by default, 32-bit float WAV as an option (D9) |
| Recording time | Real time only. Faster-than-real-time export is out of scope (Section 9) |
| Worklets | AudioWorklet is used for capture and the bitcrusher, not for synthesis. Both share one loader |
| Versions | `sound` stays 2.0.0 and `sound-advanced` stays 1.0.0: neither has been released, so these additions are part of their first release (D8) |
| Service | Additions go into service v1 before 2.3.0 ships (D8). After release, any change to the service follows the sound design's versioning rule |
| Order | Phases in priority order; the scope-cut order (ROADMAP §10) removes them from the end |

## 3. Core Changes

The core `sound` plugin needs three small additions. Each is measured on its own (Section 8).

| Change | Phase | Needed by |
| --- | --- | --- |
| `tapBus` accepts `"output"` | 7 | Recording and `getSoundLevels( "output" )` |
| `observePlay( listener )` service member | 9 | Music sync callbacks |
| `getAudioBuffer( name )` service member | 10 | Sample instruments |

### 3.1 Output tap

Today `tapBus( "master", node )` connects after the master gain and before the limiter
(sound design 4.3.2). A recording from that point would miss the limiter, and a loud mix would
hard-clip when it is converted to 16-bit samples. Taps cannot connect after the limiter,
because the limiter's route changes when `setSoundLimiter()` turns it on or off.

Core adds a fixed output stage: a unity `GainNode` between the last limiter stage (or the
master gain, when the limiter is off) and `context.destination`. `routeMaster()` connects to
the output stage instead of the destination, and the soft clipper connects to it too. Taps on
`"output"` connect to this node, so they receive exactly what the speakers receive and survive
limiter changes.

- `tapBus( "output", node )` is valid (D7). `setBusInsert` and `setBusVolume` still reject
  `"output"` with `INVALID_BUS`, so the output stage never holds effects or a separate volume.
- The service member list does not change, so the pin test in `audio-service-browser.test.js`
  stays as it is. A new contract test checks that an output tap follows `setSoundLimiter()`
  in both directions and matches the destination signal sample for sample.
- The limiter probe's offline context is unaffected.

### 3.2 `observePlay( listener )`

Music sync needs to know when each note starts. The PLAY extension contract cannot provide
this, because `resolveNote` runs at parse time, before `play()` assigns the song ID or knows
when the song starts. Core therefore adds one service member:

- `observePlay( listener )` registers a listener and returns a function that removes it.
- When the scheduler admits a PLAY note, core calls
  `listener( { "type": "note", "trackId", "track", "time", "duration", "frequency", "volume" } )`.
  `trackId` is the ID `play()` returned, `track` is the index of the comma-separated track,
  `time` is the note's start in context time, and `duration` runs to the end of its release.
- When a song finishes or is stopped, core calls `listener( { "type": "end", "trackId",
  "stopped" } )`.
- Admission happens up to the lookahead window before the note sounds, so listeners hear about
  notes early and must schedule their own dispatch. Rejected and skipped notes are not
  reported. A throwing listener is logged and does not affect playback.
- `time` is the audible start. A note admitted late within the scheduler's grace starts at the
  scheduling lead, so its `time` is later than its place in the song and its `duration` is
  shorter.
- Events are frozen, and every listener receives the same object. A song with no notes ends
  during the `play()` call, before the caller has its ID. Adding the same function twice
  registers it once, and a listener that is not a function throws `INVALID_LISTENER`.

### 3.3 `getAudioBuffer( name )`

Sample instruments need the decoded buffer of an audio file loaded with `loadAudio()`.
`getAudioBuffer( name )` returns the decoded `AudioBuffer` for a loaded decode-mode file.
It returns `null` while the file is loading, and for streamed files and unknown names. The
buffer is shared and must not be modified; this rule goes in the plugin authoring docs.

## 4. Phase 7: Recording

### 4.1 API

| Command | Returns | Behavior |
| --- | --- | --- |
| `startRecording( bus, maxDuration, bitDepth )` | Promise | Starts capturing. Resolves when capture is running, after the worklet module loads on first use |
| `stopRecording()` | Promise → `Blob` | Stops capturing, flushes the last samples, and resolves with an `audio/wav` Blob |
| `getRecordingState()` | Object | `{ state, duration }`: `"idle"`, `"starting"`, `"recording"`, or `"full"`; seconds captured so far |
| `saveRecording( blob, filename )` | void | Downloads a Blob through a temporary object URL. `filename` defaults to `"recording.wav"` |

Parameters of `startRecording`:

| Parameter | Default | Range |
| --- | --- | --- |
| `bus` | `"output"` | `"output"`, `"master"`, `"sfx"`, `"music"`, or `"audio"` |
| `maxDuration` | 60 | 1–600 seconds (D11) |
| `bitDepth` | 16 | 16 (PCM) or 32 (float) |

```javascript
await $.startRecording();
$.play( "@1 T140 O4 L8 C E G O5 C4" );

// Later, from a button handler
const wav = await $.stopRecording();
$.saveRecording( wav, "song.wav" );
```

Rules:

- **One recording at a time (D10).** `startRecording` while a recording is starting, running,
  or full throws `RECORDING_ACTIVE`. `stopRecording` with no recording throws
  `NOT_RECORDING`.
- **Full recordings.** At `maxDuration` capture stops and the state becomes `"full"`. The
  samples are kept until `stopRecording` collects them.
- **Suspended contexts.** A recording captures context time, not wall time. While the context
  is locked before the first user gesture, or suspended by the browser, nothing is captured
  and the duration does not advance.
- **Stopping early.** `stopRecording` while the recording is starting waits for it to start.
  Calling it again before it resolves returns the same promise.
- **Validation codes:** `INVALID_BUS`, `INVALID_DURATION`, and `INVALID_BIT_DEPTH` for
  `startRecording`; `INVALID_BLOB` and `INVALID_FILENAME` (not a non-empty string) for
  `saveRecording`. When the worklet cannot load, for example because a Content Security
  Policy blocks `blob:` modules, the promise rejects with `RECORDING_UNAVAILABLE` and the
  state returns to `"idle"`. A `stopRecording` waiting on that start rejects the same way, and
  a later start loads the module again.

`getSoundLevels()` also accepts `"output"`, so a meter can show the level after the limiter.

### 4.2 Design

```
plugins/sound-advanced/
├── worklet.js      # Loads the plugin's AudioWorklet module once per context
├── recorder.js     # startRecording, stopRecording, getRecordingState, saveRecording
└── wav.js          # Pure WAV encoder, no audio context
```

- **Worklet loader (`worklet.js`).** The processors are written as a self-contained function
  whose source text, which the minifier still compacts, is turned into a `blob:` URL and
  passed to `context.audioWorklet.addModule()` once per context. Callers receive a shared
  promise; a failed load is forgotten, so a later call retries. The bitcrusher (Phase 8) registers its processor in the same
  module. `file://` pages are already unsupported for audio (sound design Section 2), and
  `http://localhost` and HTTPS are secure contexts, so AudioWorklet is available wherever Pi.js
  audio runs.
- **Capture.** A recorder `AudioWorkletNode` with two input channels (`channelCountMode:
  "explicit"`, so mono buses upmix) is connected with `tapBus`. It copies each 128-frame
  quantum into per-channel buffers and posts them every 4096 frames as transferred
  `Float32Array`s. Stopping posts a flush message; the processor sends its partial buffer and
  a done message, and `stopRecording` resolves after that, so the last quantum is kept. The
  tap is removed on stop, so a finished recorder costs no processing.
- **Processing without an output.** The node has no outputs. Task 7.2 confirmed that Chromium
  and Firefox process a connected node with no outputs, offline and realtime, so the fallback
  (one output routed through a zero-gain node to the destination) is not used. The findings
  are in `docs/evidence/sound-2.3/README.md`.
- **Storage.** In 16-bit mode, chunks are converted to `Int16Array` as they arrive, which
  halves memory. Stereo 16-bit audio at 48 kHz is about 11.5 MB per minute, so the 600-second
  maximum is about 115 MB.
- **Encoding (`wav.js`).** `toPcm16( samples )` clamps to ±1, scales by 32767, and does not
  dither; the recorder applies it to each chunk as it arrives. `encodeWav( chunks,
  channelCount, sampleRate, bitDepth )` writes a RIFF header (format 1 for PCM, format 3 for
  float) and interleaves the chunks straight into the file buffer, without concatenating
  them first. The sample rate is the context's.
- **Download.** `saveRecording` creates an object URL and a detached `<a download>`, clicks
  it, and revokes the URL on the next task.

### 4.3 Implementation notes

- **Tests:** offline in `audio-recording-browser.test.js`, realtime and download in
  `audio-recording-realtime-browser.test.js`, the encoder in `sound-advanced-wav.test.js`, and
  the output-stage contracts in `audio-service-browser.test.js`.
- The recorder costs about 250 bytes more than the Section 8 estimate, and the core output
  stage fits in the headroom.

## 5. Phase 8: Bus Effects

### 5.1 New effect types

| Effect | Options (default, range) | Built from |
| --- | --- | --- |
| `"filter"` | `type` (`"lowpass"`; `"lowpass"`, `"highpass"`, `"bandpass"`), `cutoff` (1000, 20–20000 Hz), `q` (1, 0.0001–100) | `BiquadFilterNode` |
| `"distortion"` | `drive` (0.5, 0–1), `tone` (4000, 200–20000 Hz), `mix` (1, 0–1) | `WaveShaperNode` with 2× oversampling and a lowpass |
| `"bitcrush"` | `bits` (8, 1–16), `rate` (1, 1–64: hold each sample this many frames), `mix` (1, 0–1) | Worklet processor with k-rate parameters (D16) |
| `"chorus"` | `rate` (1.5, 0.1–10 Hz), `depth` (3, 0–10 ms), `mix` (0.5, 0–1) | Two delays modulated by opposite-phase LFOs, panned left and right |

The filter is the common "muffled music" effect for pause menus and underwater scenes. The
bitcrusher and distortion suit the plugin's retro presets.

The bitcrusher's worklet loads on first use. Until it is ready, its insert passes the dry
signal, so the effect starts within a few milliseconds.

### 5.2 Effect chains

`setBusEffect( bus, effect, options )` also accepts an array for `effect`. Each item is an
object with an `effect`, named like the parameter, and that effect's options. The effects run
in array order. Items use `effect` rather than `type`, so the filter keeps `type` as its own
option.

```javascript
$.setBusEffect( "music", [
	{ "effect": "filter", "type": "highpass", "cutoff": 800 },
	{ "effect": "reverb", "time": 2.5, "mix": 0.4 }
] );
```

Service v1 has one insert slot per bus, and the sound design (4.3.2) already says that chains
are composed inside a single insert. A chain holds at most 4 effects (`INVALID_EFFECT`
otherwise). An empty array removes the effect, like `null`. An item that is not an object or
names an unknown effect throws `INVALID_EFFECT`. With a chain, the `options` parameter must be
omitted (`INVALID_OPTIONS`), since each item holds its own options.

### 5.3 Smooth parameter changes

Today every `setBusEffect` call builds a new insert, which cuts any reverb or delay tail. With
this change, a call whose effect types and order match the current insert updates it in place
instead (D12):

- Options that map to an `AudioParam` ramp linearly to their new values over 20 ms. These are
  every option except the three below: `cutoff`, `q`, `mix`, `feedback`, delay `time`,
  `drive`, `tone`, `bits`, `rate`, and `depth`. Distortion `drive` sets a pre-gain into a
  fixed curve and a make-up gain, so it ramps too.
- Options that need a rebuild, which are reverb `time` and `decay` and the filter `type`,
  replace the insert as before.
- A single effect given by name is a chain of one, so repeated calls with the same name also
  update in place.

This makes transitions like the following click-free and keeps the reverb tail:

```javascript
$.setBusEffect( "music", [ { "effect": "filter", "cutoff": 20000 }, { "effect": "reverb" } ] );
$.setBusEffect( "music", [ { "effect": "filter", "cutoff": 600 }, { "effect": "reverb" } ] );
```

### 5.4 Implementation notes

- **Tests:** effect renders in `audio-effects-browser.test.js`; option and chain validation in
  `sound-advanced.test.js`. The measured results are in `docs/evidence/sound-2.3/README.md`.
- **Filter.** The biquad takes `q` as the Web Audio `Q`, which is in decibels for lowpass and
  highpass.
- **Distortion.** A `tanh` curve, shared by every distortion stage, sits between a pre-gain
  and a make-up gain. Drive 0 is nearly linear, and drive 1 saturates heavily.
- **Chorus.** Two delays around 15 ms read the downmixed bus. One LFO modulates them in
  opposite phase, and they are panned hard left and right.
- **Bitcrush.** The processor holds each sample for `round( rate )` frames and quantizes to
  steps of 1 / 2^( `bits` − 1 ). A `"stop"` message ends it when the effect is removed.
  - Until the worklet loads, the stage passes the dry signal, then ramps to its mix.
  - When the module cannot load, the stage stays dry and the plugin warns once.
- **Ramps.** Ramps start at the context's current time. They continue any ramp in progress
  from its recorded value and do not use `cancelAndHoldAtTime`.
- **Engine coverage.** The in-place update tests need offline `suspend()`, so Firefox skips
  them.

## 6. Phase 9: Game Features

### 6.1 Sound-effect generator

`generateSfx( category, seed, variation )` returns a frozen object of `synth()` options, in the
style of sfxr. It does not play anything, so the result can go to `synth()`, `definePreset()`,
or a recording. The output is repeatable by default: a seed is a compact name for a whole
sound, so a game can give each enemy type or level its own sound without defining any
parameters (D17).

| Parameter | Default | Meaning |
| --- | --- | --- |
| `category` | required | `"coin"`, `"laser"`, `"jump"`, `"hit"`, `"explosion"`, `"powerup"`, `"blip"`, `"select"`, or `"random"` |
| `seed` | 0 | Integer from 0 to 4294967295. Seed 0 is the category's built-in preset; every other seed is a generated variant |
| `variation` | 0 | 0–1. Nudges every parameter around the seeded sound; the only part that is not repeatable |

- **Seed 0.** For the eight preset categories, seed 0 returns the options of the built-in
  preset with that name, so `generateSfx( "laser" )` sounds like `sfx( "laser" )`. It reads
  the built-in table, so `definePreset()` replacing a built-in name does not change it.
  `"random"` has no preset; its seed 0 is an ordinary generated sound.
- **Other seeds.** Each category is a table of parameter ranges and waveform weights, using the
  `synth()` parameters. A small built-in PRNG (32-bit state) seeded with `seed` draws from the
  table, so the same category and seed always return the same options on every engine and
  release. Changing a category table changes its sounds, so the tables are fixed once 2.3.0
  ships; a later change needs a new category name.
- **Variation.** Each numeric parameter moves by up to ±`variation` × 25% of its category
  range, using `Math.random`, and is clamped to the range. Frequencies and times move on a
  logarithmic scale. The waveform and filter type never change, so the result stays the same
  kind of sound. This differs from `sfx( name, variation )`, which shifts only pitch and
  length. Small values give repeated sounds such as footsteps and pickups some life.
- **Ranges hold the presets.** Every category's ranges contain its built-in preset, so
  variation around seed 0 never clamps a preset value away from where it started.
- **Validation codes:** `INVALID_CATEGORY`, `INVALID_SEED` (not an integer in range), and
  `INVALID_VARIATION`.
- **Dependencies.** `generator.js` imports `BUILT_IN_PRESETS` from `presets.js`, a documented
  sibling dependency like `synth.js`. The size report lists them as a group (sound design 9.1).

```javascript
// The built-in laser, then a repeatable variant of it
$.synth( $.generateSfx( "laser" ) );
$.synth( $.generateSfx( "laser", 42 ) );

// One hit sound per enemy type, slightly different each time
$.synth( $.generateSfx( "hit", enemy.typeId, 0.15 ) );

// Keep a generated sound under a name
$.definePreset( "zap", $.generateSfx( "laser", 42 ) );
$.sfx( "zap" );
```

### 6.2 Music sync callbacks

`onPlay( mode, fn, once )` and `offPlay( mode, fn )` let games react to music. `mode` is
`"note"` or `"end"`. Callbacks receive the objects defined in Section 3.2, plus `delay`, the
seconds between the note's audible start and the dispatch.

- **Delivery.** The plugin queues events from `observePlay` and dispatches them from its own
  `requestAnimationFrame` loop, which runs only while events are queued. A note is dispatched
  on the first frame at or after its audible start: context time mapped to page time with
  `getOutputTimestamp()`, including `outputLatency` where the browser reports it.
- **Late notes.** Note events more than 250 ms late, for example after a hidden tab becomes
  visible, are dropped rather than delivered in a burst (D13). `"end"` is always delivered.
- **Stopping.** `stopPlay()` drops the song's queued note events and delivers its `"end"`
  with `stopped: true`.
- **Conventions.** The commands follow the input conventions
  ([ROADMAP §2](ROADMAP.md#2-input-conventions)):
  camelCase names and the `onX( mode, fn, once )` signature (I1, I2); removal by mode and
  function, with `offPlay( mode )` removing every handler of that mode (I4); frozen callback
  objects (I7); the shared dispatch rules (I8); and a `"play"` type for `clearEvents()`
  that clears every play handler, whichever screen calls (I10).

Cue markers in PLAY strings, for events at arbitrary song positions, are deferred (D14).

### 6.3 Implementation notes

- **Tests:** the generator in `sound-advanced-generator.test.js`, the `observePlay` contracts in
  `audio-service-browser.test.js`, and the PLAY track index in `sound-play.test.js`.
- **Repeatable draws.** The PRNG is mulberry32, seeded with the seed XOR a hash of the
  category name, so a seed gives unrelated sounds in different categories.
  - Seeded draws use only integer operations, multiplication, and addition, never `Math.log`,
    `Math.exp`, or `Math.pow`, whose results may differ between engines. The bundle test
    checks that each engine's minified bundle returns the options the Node module returns.
  - Frequencies and times are drawn as `min + ( max − min ) · r²`, which favors the low end.
    Other numbers are drawn linearly. Each drawn value is rounded to three decimals.
  - Every table entry takes one draw in order, even when its condition leaves it out, so an
    optional parameter never shifts the draws after it.
- **Tables.** Each category lists weighted choices for `oType`, and where it has them for
  `filterType`, the arpeggio pattern, and whether `"random"` sweeps. Numeric ranges can depend
  on a choice: `duty` needs the pulse waveform, filter options a filter, `arpeggioRate` an
  arpeggio, and `frequencyEnd` in `"random"` a sweep.
- **Variation.** It applies only to numeric options the sound already has, using the ranges of
  its category. Seed 0 keeps the preset's options and moves them within those ranges.
- **Size.** `observePlay` fits in the Section 8 headroom, 50 bytes under the full-build
  target.

## 7. Phase 10: Sample Instruments

`defineInstrument()` accepts an `audio` option, the name of a file loaded with `loadAudio()`,
plus `rootFrequency` (default 261.63, the C4 frequency of the recording) and `loop` (default
`false`). PLAY notes then play that sample, pitched by playback rate.

```javascript
$.loadAudio( "piano.ogg", "piano" );
$.defineInstrument( 7, { "audio": "piano", "rootFrequency": 261.63, "releaseTime": 0.3 } );
$.play( "@7 T100 O4 L4 C E G O5 C" );
```

- **Source (`sample-source.js`, task 10.2).** The plugin registers a source type on first use
  for each audio name, root frequency, and loop setting: `sample:"piano"`, with `@392` for
  another root frequency and `:loop` for a looping sample. A source factory receives only the
  voice spec, and the note's frequency must stay the musical pitch that PLAY observers report,
  so the root frequency and loop setting are part of the type. The factory gets the buffer
  from `getAudioBuffer` (Section 3.3) when each voice is built and sets `playbackRate` to
  `frequency / rootFrequency`, scheduling `frequencyEnd` sweeps on it as core schedules an
  oscillator's. The source returns `frequency: null` and the buffer source's `detune`
  parameter, so vibrato and arpeggios still work (sound design 4.3.1). A note plays the file
  from its start, so a late note keeps the sample's attack.
- **Envelope.** The instrument's envelope and filter apply as for synthesized notes. A
  non-looping sample ends at the earlier of its buffer end and the note's release.
- **Not ready (task 10.3).** `play()` resolves each note when it is called. A note whose
  file is still loading or is streamed then has volume 0, and the plugin warns once per
  instrument and `play()` call, so a song started before the file loads stays silent for those
  notes even if the file loads while it plays (D15). The notes keep their timing, and PLAY
  observers still receive them, with volume 0. A file removed after `play()` leaves its source
  without a buffer, so its remaining notes are silent too.
- **Validation (task 10.3).** `audio` must be a non-empty string (`INVALID_AUDIO`: `TypeError`
  for another type, `RangeError` when empty), `rootFrequency` a finite number greater than 0
  (`INVALID_ROOT_FREQUENCY`), and `loop` a boolean (`INVALID_LOOP`). Setting `audio` together
  with any `oType`, or `rootFrequency` or `loop` without `audio`, throws `INVALID_INSTRUMENT`.
  The file does not need to be loaded, or even requested, when the instrument is defined.

## 8. Size

`sound-advanced` has no fixed size cap (sound design 9.1), but every new module and core change
gets a size entry at its phase exit in `docs/evidence/sound-2.3/README.md`, with its marginal
cost. `npm run size` gains the new modules.

The core targets are tight. At Phase 6, core `sound` had 535 bytes of headroom under 15.5 KB,
and full-build growth had 276 bytes under 9.5 KB. The core changes in Section 3 must fit in
that space. The output stage is a few dozen bytes and `getAudioBuffer` is one accessor.
`observePlay` is the largest. If a change does not fit, the options are, in order:

1. Make it smaller.
2. Cut the phase that needs it (ROADMAP §10).
3. Raise the target, with the reason recorded, as the Phase 1 and Phase 6 reviews did.

The expected plugin growth is roughly 1.5 KB for Phase 7, 1.5 KB for Phase 8, 1.5 KB for
Phase 9, and 0.5 KB for Phase 10, taking `sound-advanced` from about 6 KB to about 11 KB
gzipped. These are estimates to check against, not limits.

## 9. Out of Scope for 2.3

- **Faster-than-real-time export**, such as rendering a `play()` string to WAV through an
  `OfflineAudioContext`. Core voices, buses, and the scheduler are bound to one realtime
  context. The test harness replaces the page's `AudioContext` to render offline, which is not
  suitable as a public API. Recording in real time covers the same use cases more slowly.
- **Compressed recording formats** (WebM/Opus, MP4/AAC) through `MediaRecorder`, which vary by
  browser (D9).
- **Microphone input**, including recording it and `getSoundLevels( "mic" )`. It needs a
  permission prompt and a different privacy review.
- **PLAY cue markers** (D14).
- **Several recordings at once** (D10).

## 10. Compatibility Summary

Input to the 2.3 upgrade guide (ROADMAP R.4).

All changes are additive. `sound-advanced` has not been released, so its release notes list
these commands as part of 1.0.0:

- New commands: `startRecording()`, `stopRecording()`, `getRecordingState()`,
  `saveRecording()`, `generateSfx()`, `onPlay()`, and `offPlay()`.
- `setBusEffect()`: new effects `"filter"`, `"distortion"`, `"bitcrush"`, and `"chorus"`;
  arrays of `{ effect, ...options }` items for chains; in-place updates for matching chains.
- `getSoundLevels()`: bus `"output"`.
- `defineInstrument()`: `audio`, `rootFrequency`, and `loop` options.
- Plugin API (sound service v1): `tapBus` accepts `"output"`; `observePlay` and
  `getAudioBuffer` are added.

## 11. Decisions

Numbered after the sound design's D1–D6.

| ID | Decision | Recommendation | Resolve by |
| --- | --- | --- | --- |
| D7 | How extensions reach the post-limiter signal | **Resolved (task 7.1):** `tapBus( "output" )` with a fixed output stage in core. It adds no service member, and `setBusInsert` and `setBusVolume` reject `"output"` | Resolved |
| D8 | Whether additions reopen the frozen service v1 | **Resolved (task 7.1): yes**, until 2.3.0 ships. Nothing outside this repository consumes v1 yet, and `sound` 2.0.0 and `sound-advanced` 1.0.0 ship together. Tasks that add a member (9.2, 10.1) update the member pin test. After release, the versioning rule applies | Resolved |
| D9 | Recording formats | **Resolved (task 7.4):** WAV only: 16-bit PCM by default, 32-bit float as an option. `MediaRecorder` output differs by browser and cannot be tested sample for sample | Resolved |
| D10 | Concurrent recordings | **Resolved (task 7.4):** one at a time. Several recorders multiply memory, and no common game use needs them | Resolved |
| D11 | Recording duration limits | **Resolved (task 7.4):** 60 s default, 600 s maximum (about 115 MB at 48 kHz, 16-bit stereo) | Resolved |
| D12 | Changing effect options without a rebuild | **Resolved (task 8.3):** options that map to an `AudioParam` ramp in place over 20 ms when the chain's effects and order match; reverb `time` and `decay` and the filter `type` rebuild, which cuts tails. Chain items name their effect with `effect`, not `type`, so the filter keeps its `type` option | Resolved |
| D13 | Music sync delivery | **Resolved (task 9.3):** dispatch on animation frames at the audible time, and drop notes more than 250 ms late; `"end"` is always delivered. The audible time comes from `getOutputTimestamp()`, which already includes the output latency; before output starts, or where it is missing, the render time plus `outputLatency` (or `baseLatency`) stands in | Resolved |
| D14 | PLAY cue markers | **Resolved (task 9.3):** deferred to 2.3.x. A cue needs a timed event without a voice, which changes the PLAY extension contract | Resolved |
| D15 | Songs started before a sample instrument's file loads | **Resolved (task 10.3):** notes resolved while the file is not loaded play at volume 0, with one warning per instrument and `play()` call, and stay silent if the file loads during the song. Waiting for the file would hold up the whole song, and `ready()` already covers waiting | Resolved |
| D16 | How the bitcrusher reduces the sample rate | **Resolved (task 8.6):** a worklet processor with k-rate `bits` and `rate`, registered in the recorder's module. A `WaveShaperNode` can reduce bit depth but cannot hold samples. The stage stays dry until the module loads, and dry with one warning if it cannot load | Resolved |
| D17 | Whether generated sounds are repeatable by default | **Resolved (revision 2 of this design): yes.** The command is `generateSfx( category, seed, variation )`. `seed` defaults to 0, which returns the category's built-in preset, and other seeds are fixed variants, so the generator and the presets are one system. Unseeded random output (sfxr style) was rejected: it suits a design tool but not a game, which wants the same sound each time. Randomness comes only from `variation`, which nudges every parameter, unlike `sfx()`'s pitch and length jitter | Resolved |

## 12. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| An engine does not process a worklet node with no outputs | Recording captures nothing there | Task 7.2 checks each engine; fallback output through a zero-gain node |
| A Content Security Policy blocks `blob:` worklet modules | No recording or bitcrusher on that page | `RECORDING_UNAVAILABLE`; the bitcrusher stays dry and warns once; documented in the README |
| Long recordings use a lot of memory | Mobile tabs crash | 60 s default, 600 s cap, `Int16` storage |
| Core size headroom is small | Core targets exceeded | Size entry per core change; the Section 8 order; the scope-cut order |
| Sync timing differs by engine and device | Visuals drift from music | Map times with `getOutputTimestamp()` and `outputLatency`; realtime test; listening and watching check on each engine |
| The expansion adds work after the sound workstream closed | Release waits on sound again | Phases can be cut independently; recording is cut last and its core stage ships even if the plugin part slips |
