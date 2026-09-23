# Pi.js 2.3 Sound Advanced Expansion Plan

Status: Proposed; Phases 7–10 not started
Revision 2: the sound-effect generator is `generateSfx()`, repeatable by default, with seed 0
as the built-in preset and a `variation` parameter (6.1, D17).
Target release: Pi.js 2.3.0
Parent documents: [SOUND-V2.3-PLAN.md](SOUND-V2.3-PLAN.md) (design, referred to below as "the
sound plan"), [SOUND-V2.3-ROADMAP.md](SOUND-V2.3-ROADMAP.md) (Phases 0–6), and
[UPGRADE-V2.3-PLAN.md](UPGRADE-V2.3-PLAN.md) (release)

## 1. Purpose

`sound-advanced` 1.0.0 (sound roadmap Phase 5) covers synthesis, two bus effects, a level
analyser, presets, and PLAY instruments. It is about 6 KB gzipped, and most of that is
`synth()`. This plan expands the plugin before 2.3.0 ships so that it covers what games
commonly ask of an audio library beyond playback:

1. **Recording:** capture what Pi.js plays, or a single bus, and save it as a WAV file.
2. **More bus effects:** filter, distortion, bitcrusher, and chorus; effect chains; and smooth
   parameter changes.
3. **Game features:** a seeded retro sound-effect generator and music sync callbacks for
   `play()`.
4. **Sample instruments:** loaded audio used as a pitched `play()` instrument.

The work continues the sound workstream as Phases 7–10, so tasks are tracked as `Sound 7.1`
and onward. The rules of the sound roadmap and the general plan (Section 10) apply.

## 2. Scope Decisions

| Topic | Decision |
| --- | --- |
| Location | Every new command lives in `sound-advanced`. Core `sound` changes only where a feature cannot reach what it needs through service v1 (Section 3) |
| Recording source | Pi.js output only: the final signal after the limiter, or one bus. No microphone input |
| Recording format | 16-bit PCM WAV by default, 32-bit float WAV as an option (D9) |
| Recording time | Real time only. Faster-than-real-time export is out of scope (Section 10) |
| Worklets | AudioWorklet is used for capture and the bitcrusher, not for synthesis. Both share one loader |
| Versions | `sound` stays 2.0.0 and `sound-advanced` stays 1.0.0: neither has been released, so these additions are part of their first release (D8) |
| Service | Additions go into service v1 before 2.3.0 ships (D8). After release, any change to the service follows the sound plan's versioning rule |
| Order | Phases in priority order; the scope-cut order (Section 9) removes them from the end |

## 3. Core Changes

The core `sound` plugin needs three small additions. Each is measured on its own (Section 8).

| Change | Phase | Needed by |
| --- | --- | --- |
| `tapBus` accepts `"output"` | 7 | Recording and `getSoundLevels( "output" )` |
| `observePlay( listener )` service member | 9 | Music sync callbacks |
| `getAudioBuffer( name )` service member | 10 | Sample instruments |

### 3.1 Output tap

Today `tapBus( "master", node )` connects after the master gain and before the limiter
(sound plan 4.3.2). A recording from that point would miss the limiter, and a loud mix would
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
- **Validation codes:** `INVALID_BUS`, `INVALID_DURATION`, `INVALID_BIT_DEPTH`, and
  `INVALID_BLOB` for `saveRecording`. When the worklet cannot load, for example because a
  Content Security Policy blocks `blob:` modules, the promise rejects with
  `RECORDING_UNAVAILABLE` and the state returns to `"idle"`.

`getSoundLevels()` also accepts `"output"`, so a meter can show the level after the limiter.

### 4.2 Design

```
plugins/sound-advanced/
├── worklet.js      # Loads the plugin's AudioWorklet module once per context
├── recorder.js     # startRecording, stopRecording, getRecordingState, saveRecording
└── wav.js          # Pure WAV encoder, no audio context
```

- **Worklet loader (`worklet.js`).** The processors are an inline source string turned into a
  `blob:` URL and passed to `context.audioWorklet.addModule()` once per context. Callers
  receive a shared promise. The bitcrusher (Phase 8) registers its processor in the same
  module. `file://` pages are already unsupported for audio (sound plan Section 2), and
  `http://localhost` and HTTPS are secure contexts, so AudioWorklet is available wherever Pi.js
  audio runs.
- **Capture.** A recorder `AudioWorkletNode` with two input channels (`channelCountMode:
  "explicit"`, so mono buses upmix) is connected with `tapBus`. It copies each 128-frame
  quantum into per-channel buffers and posts them every 4096 frames as transferred
  `Float32Array`s. Stopping posts a flush message; the processor sends its partial buffer and
  a done message, and `stopRecording` resolves after that, so the last quantum is kept. The
  tap is removed on stop, so a finished recorder costs no processing.
- **Processing without an output.** The node has no outputs. Task 7.2 confirms that every
  engine processes a connected node with no outputs. If one does not, the node gets one
  output routed through a zero-gain node to the destination.
- **Storage.** In 16-bit mode, chunks are converted to `Int16Array` as they arrive, which
  halves memory. Stereo 16-bit audio at 48 kHz is about 11.5 MB per minute, so the 600-second
  maximum is about 115 MB.
- **Encoding (`wav.js`).** `encodeWav( channels, sampleRate, bitDepth )` writes a RIFF header
  (format 1 for PCM, format 3 for float) and interleaved samples. It clamps to ±1 before
  conversion, scales by 32767, and does not dither. The sample rate is the context's.
- **Download.** `saveRecording` creates an object URL and a detached `<a download>`, clicks
  it, and revokes the URL on the next task.

### 4.3 Tasks

| # | Task | § |
| --- | --- | --- |
| 7.1 | Core output stage; `tapBus( "output" )`; contract test across `setSoundLimiter()` toggles; size entry | 3.1 |
| 7.2 | `worklet.js` shared loader; confirm processing without outputs in Chromium and Firefox, offline and realtime | 4.2 |
| 7.3 | `wav.js` encoder with Node tests: header fields, PCM clamping, float mode, odd lengths | 4.2 |
| 7.4 | `recorder.js`: start, stop, flush, state, `maxDuration`, errors, and `RECORDING_UNAVAILABLE` | 4.1, 4.2 |
| 7.5 | `saveRecording()` with a Playwright download test | 4.1 |
| 7.6 | `getSoundLevels( "output" )` | 4.1 |
| 7.7 | Metadata in `metadata/plugin-sound-advanced/`, generated types, and record and save controls in `sound_advanced_01.html` | — |

### 4.4 Exit criteria

- In an offline render, a float recording of `"output"` equals the rendered destination
  buffer sample for sample, with the limiter on and off. A 16-bit recording is within one
  quantization step.
- A per-bus recording contains that bus only.
- Recordings keep their last quantum, stop at `maxDuration`, and capture nothing while the
  context is suspended.
- A realtime test in Chromium and Firefox records a known tone, decodes the Blob with
  `decodeAudioData`, and checks its length, sample rate, and peak.
- Every error code has a test, and a failed worklet load returns the state to `"idle"`.
- The listening check covers recording and saving in `sound_advanced_01.html` on all three
  engines (Safari for WebKit).

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
object with a `type` and that effect's options. The effects run in array order.

```javascript
$.setBusEffect( "music", [
	{ "type": "filter", "cutoff": 800 },
	{ "type": "reverb", "time": 2.5, "mix": 0.4 }
] );
```

Service v1 has one insert slot per bus, and the sound plan (4.3.2) already says that chains
are composed inside a single insert. A chain holds at most 4 effects (`INVALID_EFFECT`
otherwise). An empty array removes the effect, like `null`.

### 5.3 Smooth parameter changes

Today every `setBusEffect` call builds a new insert, which cuts any reverb or delay tail. With
this change, a call whose effect types and order match the current insert updates it in place
instead (D12):

- Options that map to an `AudioParam`, such as `cutoff`, `q`, `mix`, `feedback`, `drive`,
  `rate`, and `depth`, ramp to their new values over 20 ms.
- Options that need a rebuild, such as reverb `time` and `decay` and the filter `type`,
  replace the insert as before.

This makes transitions like the following click-free and keeps the reverb tail:

```javascript
$.setBusEffect( "music", [ { "type": "filter", "cutoff": 20000 }, { "type": "reverb" } ] );
$.setBusEffect( "music", [ { "type": "filter", "cutoff": 600 }, { "type": "reverb" } ] );
```

### 5.4 Tasks

| # | Task | § |
| --- | --- | --- |
| 8.1 | Refactor `effects.js` so each effect is a stage builder with a declared list of rampable options | 5.3 |
| 8.2 | Effect chains in one insert; validation and chain limit | 5.2 |
| 8.3 | In-place updates for matching chains; rebuild for other options | 5.3 |
| 8.4 | `"filter"` and `"distortion"` | 5.1 |
| 8.5 | `"chorus"` | 5.1 |
| 8.6 | `"bitcrush"` processor in the shared worklet module | 5.1 |
| 8.7 | Metadata, types, and demo controls for chains and new effects | — |

### 5.5 Exit criteria

- Offline renders check each effect against analytic expectations: filter attenuation at one
  octave past the cutoff, distortion harmonics that rise with `drive`, bitcrusher
  quantization levels and held frames, and chorus modulation depth.
- An in-place update produces no discontinuity above the de-click reference threshold (sound
  plan 10.2), and a reverb tail continues through it.
- Chains apply effects in order. Bus volume and effects still work in either call order.
- Every new error path has a test. `effects.js` has a size entry.

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
  sibling dependency like `synth.js`. The size report lists them as a group (sound plan 9.1).

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

`onPlayEvent( event, callback )` and `offPlayEvent( event, callback )` let games react to
music. `event` is `"note"` or `"end"`. Callbacks receive the objects defined in Section 3.2,
plus `delay`, the seconds between the note's audible start and the dispatch.

- **Delivery.** The plugin queues events from `observePlay` and dispatches them from its own
  `requestAnimationFrame` loop, which runs only while events are queued. A note is dispatched
  on the first frame at or after its audible start: context time mapped to page time with
  `getOutputTimestamp()`, including `outputLatency` where the browser reports it.
- **Late notes.** Note events more than 250 ms late, for example after a hidden tab becomes
  visible, are dropped rather than delivered in a burst (D13). `"end"` is always delivered.
- **Stopping.** `stopPlay()` drops the song's queued note events and delivers its `"end"`
  with `stopped: true`.
- **Naming.** The input conventions review (general plan Section 6) decides handler naming
  and signatures. These commands follow its decisions (items I1, I2, …) before task 9.3
  starts.

Cue markers in PLAY strings, for events at arbitrary song positions, are deferred (D14).

### 6.3 Tasks

| # | Task | § |
| --- | --- | --- |
| 9.1 | `generator.js`: `generateSfx()`, seed 0 presets, category tables, seeded PRNG, variation, Node tests | 6.1 |
| 9.2 | Core `observePlay` service member, admission and end reporting, contract tests, size entry | 3.2 |
| 9.3 | `sync.js`: `onPlayEvent()`/`offPlayEvent()`, dispatch loop, latency mapping, late drop | 6.2 |
| 9.4 | Metadata, types, and demo: a generator panel with seed entry and a beat-synced visual | — |

### 6.4 Exit criteria

- Node tests for `generateSfx`:
  - Seed 0 equals the built-in preset for each of the eight preset categories.
  - Each category's ranges contain its built-in preset.
  - A fixed list of seeds per category matches recorded options, so a PRNG or table change
    fails the test.
  - 10,000 seeds per category, each with variation 0 and 1, all pass `synth()` validation.
  - With variation 0 every call is identical; with variation above 0, every parameter stays
    in its category range.
- In a clock-driven offline render, `observePlay` reports every admitted note once, with the
  context time the render shows it starting, and never reports rejected or skipped notes.
- Events reach listeners in time order. `stopPlay()` suppresses queued notes and sends
  `"end"` once.
- A realtime Chromium test checks that dispatch happens within two frames of the audible start
  (with the latency reported by the engine), and that notes delayed by a hidden tab are dropped.

## 7. Phase 10: Sample Instruments

`defineInstrument()` accepts an `audio` option, the name of a file loaded with `loadAudio()`,
plus `rootFrequency` (default 261.63, the C4 frequency of the recording) and `loop` (default
`false`). PLAY notes then play that sample, pitched by playback rate.

```javascript
$.loadAudio( "piano.ogg", "piano" );
$.defineInstrument( 7, { "audio": "piano", "rootFrequency": 261.63, "releaseTime": 0.3 } );
$.play( "@7 T100 O4 L4 C E G O5 C" );
```

- **Source.** The plugin registers a source type per audio name on first use
  (`"sample:piano"`). Its factory gets the buffer from `getAudioBuffer` (Section 3.3) and sets
  `playbackRate` to `frequency / rootFrequency`, scheduling `frequencyEnd` sweeps on it. The
  source returns `frequency: null` and the buffer source's `detune` parameter, so vibrato and
  arpeggios still work (sound plan 4.3.1).
- **Envelope.** The instrument's envelope and filter apply as for synthesized notes. A
  non-looping sample ends at the earlier of its buffer end and the note's release.
- **Not ready.** A note whose file is still loading, streamed, or removed plays silence, and
  the plugin warns once per instrument and `play()` call. `play()` reads instruments when it is
  called, so a song started before the file loads stays silent for those notes (D15).
- **Validation.** `audio` must be a string, `rootFrequency` a positive finite number, and
  `loop` a boolean. Setting `audio` together with a waveform `oType` throws
  `INVALID_INSTRUMENT`.

| # | Task | § |
| --- | --- | --- |
| 10.1 | Core `getAudioBuffer` service member, contract test, size entry | 3.3 |
| 10.2 | Sample source factory, per-name registration, pitch and detune | 7 |
| 10.3 | `defineInstrument` options, validation, not-ready behavior | 7 |
| 10.4 | Metadata, types, and a sample instrument in the demo | 7 |

Exit criteria:

- An offline render of a sine sample shows the expected pitch for notes across three octaves,
  and the envelope and loop behavior match the synthesized case.
- Vibrato on a sample instrument modulates its pitch.
- Not-ready files play silence with one warning, never an error.

## 8. Size

`sound-advanced` has no fixed size cap (sound plan 9.1), but every new module and core change
gets a size entry at its phase exit in `docs/evidence/sound-2.3/README.md`, with its marginal
cost. `npm run size` gains the new modules.

The core targets are tight. At Phase 6, core `sound` had 535 bytes of headroom under 15.5 KB,
and full-build growth had 276 bytes under 9.5 KB. The core changes in Section 3 must fit in
that space. The output stage is a few dozen bytes and `getAudioBuffer` is one accessor.
`observePlay` is the largest. If a change does not fit, the options are, in order:

1. Make it smaller.
2. Cut the phase that needs it (Section 9).
3. Raise the target, with the reason recorded, as the Phase 1 and Phase 6 reviews did.

The expected plugin growth is roughly 1.5 KB for Phase 7, 1.5 KB for Phase 8, 1.5 KB for
Phase 9, and 0.5 KB for Phase 10, taking `sound-advanced` from about 6 KB to about 11 KB
gzipped. These are estimates to check against, not limits.

## 9. Scope-Cut Order

These phases are cut before any item in the sound roadmap's scope-cut order. Earlier items go
first:

1. **Phase 10, sample instruments.** The `getAudioBuffer` service member is not added.
2. **Music sync (tasks 9.2–9.4).** `observePlay` is not added. The generator still ships.
3. **Chorus and bitcrusher (tasks 8.5–8.6).** Chains, in-place updates, filter, and
   distortion still ship.
4. **The rest of Phase 8.**
5. **Phase 7, recording.** Cut last. If recording slips, it ships in a 2.3.x plugin release,
   and its core output stage ships in 2.3.0 so the plugin needs no core update.

A cut phase moves to a 2.3.x release of `sound-advanced`. Its core service members are then
additive changes to a released service, and the service's versioning rule applies.

## 10. Out of Scope for 2.3

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

## 11. Compatibility Summary (input to `UPGRADE-V2.3.md`)

All changes are additive. `sound-advanced` has not been released, so its release notes list
these commands as part of 1.0.0:

- New commands: `startRecording()`, `stopRecording()`, `getRecordingState()`,
  `saveRecording()`, `generateSfx()`, `onPlayEvent()`, and `offPlayEvent()`.
- `setBusEffect()`: new effects `"filter"`, `"distortion"`, `"bitcrush"`, and `"chorus"`;
  arrays for chains; in-place updates for matching chains.
- `getSoundLevels()`: bus `"output"`.
- `defineInstrument()`: `audio`, `rootFrequency`, and `loop` options.
- Plugin API (sound service v1): `tapBus` accepts `"output"`; `observePlay` and
  `getAudioBuffer` are added.

## 12. Open Decisions

Numbered after the sound plan's D1–D6.

| ID | Decision | Recommendation | Resolve by |
| --- | --- | --- | --- |
| D7 | How extensions reach the post-limiter signal | `tapBus( "output" )` with a fixed output stage in core. It adds no service member, and `setBusInsert` and `setBusVolume` reject `"output"` | Task 7.1 |
| D8 | Whether additions reopen the frozen service v1 | Yes, until 2.3.0 ships. Nothing outside this repository consumes v1 yet, and `sound` 2.0.0 and `sound-advanced` 1.0.0 ship together. Update the member pin test in each task. After release, the versioning rule applies | Task 7.1 |
| D9 | Recording formats | WAV only: 16-bit PCM by default, 32-bit float as an option. `MediaRecorder` output differs by browser and cannot be tested sample for sample | Task 7.4 |
| D10 | Concurrent recordings | One at a time. Several recorders multiply memory, and no common game use needs them | Task 7.4 |
| D11 | Recording duration limits | 60 s default, 600 s maximum (about 115 MB at 48 kHz, 16-bit stereo) | Task 7.4 |
| D12 | Changing effect options without a rebuild | Ramp `AudioParam` options in place when the chain's types and order match. Rebuild otherwise, which cuts tails as today | Task 8.3 |
| D13 | Music sync delivery | Dispatch on animation frames from the audible time; drop notes more than 250 ms late; always deliver `"end"` | Task 9.3 |
| D14 | PLAY cue markers | Defer to 2.3.x. A cue needs a timed event without a voice, which changes the PLAY extension contract | Task 9.3 |
| D15 | Songs started before a sample instrument's file loads | Those notes play silence with one warning. Waiting for the file would hold up the whole song, and `ready()` already covers waiting | Task 10.3 |
| D16 | How the bitcrusher reduces the sample rate | Worklet processor with `bits` and `rate`. A `WaveShaperNode` can reduce bit depth but cannot hold samples, and the worklet loader already exists for recording | Task 8.6 |
| D17 | Whether generated sounds are repeatable by default | **Resolved (revision 2 of this plan): yes.** The command is `generateSfx( category, seed, variation )`. `seed` defaults to 0, which returns the category's built-in preset, and other seeds are fixed variants, so the generator and the presets are one system. Unseeded random output (sfxr style) was rejected: it suits a design tool but not a game, which wants the same sound each time. Randomness comes only from `variation`, which nudges every parameter, unlike `sfx()`'s pitch and length jitter | Resolved |

## 13. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| An engine does not process a worklet node with no outputs | Recording captures nothing there | Task 7.2 checks each engine; fallback output through a zero-gain node |
| A Content Security Policy blocks `blob:` worklet modules | No recording or bitcrusher on that page | `RECORDING_UNAVAILABLE`; the bitcrusher stays dry and warns once; documented in the README |
| Long recordings use a lot of memory | Mobile tabs crash | 60 s default, 600 s cap, `Int16` storage |
| Core size headroom is small | Core targets exceeded | Size entry per core change; the Section 8 order; the scope-cut order |
| Sync timing differs by engine and device | Visuals drift from music | Map times with `getOutputTimestamp()` and `outputLatency`; realtime test; listening and watching check on each engine |
| The plan adds work after the sound workstream closed | Release waits on sound again | Phases can be cut independently; recording is cut last and its core stage ships even if the plugin part slips |

## 14. Tracking

- Phases 7–10 are GitHub milestones, and each task is an issue titled like
  `Sound 7.4: Recorder module`.
- Closing a decision updates Section 12 of this plan in the same commit. When a decision
  changes the service, Section 4.3 of the sound plan is updated in the same commit.
- `API.md`, the plugin README, and the llms references are updated in the release phase
  (general plan R.2 and R.3), not in these phases. Metadata and generated types are committed
  with each API change.
