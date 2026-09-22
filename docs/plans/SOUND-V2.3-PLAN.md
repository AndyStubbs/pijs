# Pi.js 2.3 Sound Upgrade Plan

Status: Approved for planning, not yet implemented
Target release: Pi.js 2.3.0
Companion document: [SOUND-V2.3-ROADMAP.md](SOUND-V2.3-ROADMAP.md)
Revision 6: adds a scheduling lead for immediate automation, defines the PLAY slot, sounding
length, gate, and release placement so pace no longer changes the beat, masks context state in
the offline harness, gives stream mode a realtime test path and gesture rule, records the
resolves D2 (ADSR positional order), validates sweep endpoints, defines duplicate PLAY token
prefixes, and renames the live-voice cap.

## 1. Purpose

Pi.js 2.3 rebuilds the sound subsystem on a single Web Audio graph. The release has two goals:

1. Make the core `sound` plugin clean, click-free, and safe from clipping while keeping it small.
2. Add a separate `sound-advanced` plugin for synthesis, effects, presets, and instruments that
   most applications do not need.

Every advanced feature is built as a separately measurable module. After the release, the
maintainer can move individual modules into core, or merge the entire plugin, based on measured
bundle size. Section 9 defines what that decision requires.

## 2. Scope Decisions

These decisions were made during scoping and are treated as fixed for this plan.

| Topic | Decision |
| --- | --- |
| Compatibility | Breaking sound API changes are allowed in 2.3 |
| Envelope naming | New, unambiguous names; legacy `attack` / `decay` are removed |
| `poolSize` | Removed from `loadAudio()` |
| Sample loading | Decode to memory by default; opt-in streaming for long files |
| `file://` pages | Not supported for audio; no fallback path |
| Audio instances | `playAudio()` returns an instance ID; loop, rate, pan, pause, resume |
| Voice budget | Synth and samples share limits; slots are counted by occupancy interval from admission; looping samples are protected from stealing |
| Bus volume | Dedicated core service method; gain follows effects; public command ships in `sound-advanced` 1.0, and moving it to core is decided at release (D4) |
| Late recovery | Expiration first; 25 ms grace and timeline catch-up as specified in 8.1 |
| Presets | Not in core; provided by `sound-advanced` |
| Noise | White and pink noise |
| Instruments | `sound-advanced` extends `play()`; not in core |
| Limiter | Compressor plus soft clipper with an absolute ±1.0 ceiling; on by default, can be disabled |
| Autoplay | Core unlocks the audio context on the first user gesture |
| Verification | Deterministic `OfflineAudioContext` tests, one realtime browser test for stream mode and the scheduling lead, and manual listening demos |
| Plan location | `docs/plans/`; user-facing `UPGRADE-V2.3.md` is written at release |
| Versions | `sound` plugin 2.0.0; `sound-advanced` plugin 1.0.0 |

## 3. Current State (Pi.js 2.2)

The baseline being replaced lives in `plugins/sound/`:

- `sound.js` (872 lines): audio pools built from `<audio>` elements, oscillator voices, and
  global volume.
- `play.js` (727 lines): BASIC-style `PLAY` parser and note emitter.
- Minified size: `sound.min.js` is 16.1 KB, about 6.2 KB gzipped. The full `pi.min.js` bundle is
  180.6 KB, about 62.4 KB gzipped.

Known defects and limits that motivate this upgrade:

- **Envelope naming mismatch.** In `createSound()`, the stage named `sustainTime` ramps down to
  0.8 × volume, and the stage named `decay` fades to silence. `decay` actually behaves as a
  release, and there is no real sustain level.
- **Clicks.** Every envelope ramp is linear. `stopSound()`, `stopPlay()`, and voice-limit
  enforcement call `oscillator.stop()` immediately, which clicks when the waveform is not near
  zero. A zero-length attack clicks when the sound starts.
- **Volume split across paths.** The shared master gain is fixed at 1. `setVolume()` ramps a
  per-voice gain on every live sound, and it sets `audio.volume` on every pool element
  separately.
- **No clipping protection.** Many voices together can sum above 0 dBFS.
- **Samples bypass Web Audio.** `<audio>` elements are routed outside the graph and pre-allocated
  as fixed-size round-robin pools. The `duration` argument is timed with `setTimeout`.
- **`play()` creates every note up front.** It builds oscillator and gain nodes for the whole
  song when called, so node count grows with song length.
- **Frequency rounding.** `sound()` rounds frequency to an integer, which prevents fine pitch
  control.
- **Pace changes the beat.** `MS`, `MN`, and `ML` multiply the note interval itself, and the
  track advances by that interval, so staccato speeds the song up instead of adding rests
  between notes of the same length.
- **Dead fallback.** `webkitAudioContext` is still referenced, but Pi.js already requires
  WebGL 2, which implies Safari 15+, where `AudioContext` is always available.

## 4. Package Layout

### 4.1 Core `sound` plugin (2.0.0)

`sound.js` is split into focused modules, so each piece can be tested and sized separately:

```
plugins/sound/
├── index.js        # Plugin registration; provides the extension service
├── context.js      # AudioContext lifecycle, autoplay unlock, buses, limiter, master volume
├── envelope.js     # Pure envelope math and AudioParam scheduling helpers
├── voices.js       # Voice creation, voice stealing, de-click stop, sound()/stopSound()
├── noise.js        # Lazy white and pink noise buffers
├── samples.js      # loadAudio, playAudio, stop/pause/resume/set/removeAudio
├── scheduler.js    # Lookahead scheduler: play() events and delayed sound/audio requests
└── play.js         # PLAY parser and event generation; emits through scheduler.js
```

`envelope.js` stays free of any AudioContext dependency, so Node unit tests can import it.

### 4.2 `sound-advanced` plugin (1.0.0)

```
plugins/sound-advanced/
├── index.js        # Registration; declares dependency on "sound"
├── synth.js        # synth() command: filter, filter envelope, LFO, pulse duty, arpeggio
├── periodic-noise.js
├── buses.js        # Per-bus volume
├── effects.js      # Bus reverb and delay
├── analyser.js     # Level and spectrum data for visualizers
├── presets.js      # Sound-effect presets and sfx()
└── instruments.js  # defineInstrument() and the PLAY @n instrument hook
```

Each module registers its own commands, and no module imports a sibling unless the dependency is
documented. This makes every module a candidate for moving into core on its own.

The advanced plugin ships as a standalone plugin bundle (`build/plugins/sound-advanced/`). It is
not included in `pi.js`/`pi.min.js` until the size decision in Section 9.

### 4.3 Cross-plugin extension service

Plugins are built as separate bundles. If `sound-advanced` imported `../sound/*.js` directly, it
would get its own copy of the module state and a second AudioContext. The advanced plugin must
therefore reach core through a runtime interface.

**Core change (`src/core/plugins.js`):** two new plugin API members.

- `pluginApi.provide( service )`: during `init`, stores one service object for the calling
  plugin.
- `pluginApi.getService( pluginName )`: returns the service of a plugin named in this plugin's
  `dependencies`. It throws `SERVICE_NOT_AVAILABLE` for undeclared or uninitialized
  dependencies.

The existing dependency resolver already initializes dependencies first, so no other ordering
change is needed. This mechanism is general and also available to third-party plugins.

**Sound extension service (versioned):**

| Member | Purpose |
| --- | --- |
| `version` | Integer interface version; starts at `1` |
| `getContext()` | Shared AudioContext (created lazily) |
| `createVoice( spec )` | Builds a voice from a source and optional inserts; returns a sound ID |
| `registerSource( oType, factory )` | Adds a source type (e.g. `"pulse"`, `"periodic"`) |
| `scheduleEnvelope( param, env, start, gateEnd, peak )` | Shared envelope scheduling |
| `stopVoice( soundId, when )` | De-clicked stop used by all callers |
| `setBusVolume( bus, volume )` | Ramps the bus output gain independently of its effects insert |
| `setBusInsert( bus, insert )` | Places one insert on a bus; `null` removes it |
| `tapBus( bus, node )` | Connects a bus output in parallel to `node`; returns an untap function |
| `registerPlayExtension( name, extension )` | Adds PLAY tokens, per-track state, and note resolution |

Buses are named `"sfx"`, `"music"`, `"audio"`, and `"master"`. Extensions never receive a
bus's `GainNode` and never rewire core nodes themselves. Core owns every connection between
nodes it created and nodes an extension created.

The interface is internal. It is documented in the plugin authoring docs but not in `API.md`.
It is frozen at the end of Phase 5 (see the roadmap), after the contract tests in 4.3.4 pass.
Later changes that break it require bumping `version`.

#### 4.3.1 Source contract

`registerSource( oType, factory )` registers `factory( context, spec )`, which must return a
source object:

| Member | Contract |
| --- | --- |
| `output` | `AudioNode` that core connects into the voice chain |
| `frequency` | `AudioParam` for pitch automation, or `null` if the source is unpitched |
| `start( when )` | Starts all internal nodes at context time `when` |
| `stop( when )` | Sets or advances the stop deadline; repeated calls may stop earlier |
| `onEnded( callback )` | Registers the single callback fired when the source has fully stopped |
| `dispose()` | Disconnects and releases every internal node; core calls it exactly once |

Ownership rules:

- The factory creates nodes but connects nothing outside itself. Core connects `output`.
- **Lifecycle:** core calls `start` once, may call `stop` repeatedly to advance the deadline,
  and calls `dispose` exactly once. A scheduled `start( futureTime )` counts as a start call
  even before it produces sound. Cancelling that source calls `stop( now )` before immediate
  disposal. A constructed source whose `start` was never called is disposed without `stop`.
  Normal completion disposes after `onEnded`; a later callback after cancellation is ignored.
- **Stop deadlines:** repeated calls must never postpone an earlier stop. Sources and inserts
  support bringing a scheduled stop forward, including immediate hard-cap cleanup. Core keeps
  the earliest committed end time and does not extend a source beyond its natural end.
- **Factory failure:** a factory that throws before returning cleans up its own allocations.
  Core disposes of previously returned sources and inserts; a returned source whose `start`
  throws must support disposal after partial startup. No partially connected voice remains.
- **References:** the source must not keep references to core nodes after `dispose`.

#### 4.3.2 Insert contract

`createVoice( spec )` accepts `spec.inserts` as an ordered array of descriptors containing
`factory` and an immutable `params` snapshot. Only after admission does core invoke each
`factory( context, params )` to construct a fresh voice insert. Pending records and PLAY events
hold descriptors, never audio nodes. Factories must not capture live nodes or mutable preset
state. Realized voice inserts and bus inserts share one shape:

| Member | Contract |
| --- | --- |
| `input`, `output` | Nodes core connects before and after the insert (may be the same node) |
| `start( when, gateEnd )` | Voice inserts only: schedule automation such as a filter envelope |
| `stop( when )` | Voice inserts only: stop automation/LFOs at a deadline that may move earlier |
| `dispose()` | Disconnects and releases internal nodes; core calls it exactly once |

- **Voice inserts** are chained in array order between the source and the envelope gain.
  `stopVoice` calls `stop` on every insert with the same `when` it uses for the source, so an
  early stop cuts a filter envelope or LFO cleanly. Future stop scheduling preserves automation
  before that deadline. Repeated earlier stops preserve continuity and dispose exactly once.
  Insert factories have the same failure-cleanup obligations as source factories.
- **Bus inserts:** `setBusInsert( bus, insert )` disconnects the bus from its next stage and
  routes it through the insert. Replacing or removing an insert restores the direct connection
  first, then disposes of the old insert. Each bus has one insert slot in v1. Effects that need
  a chain compose it inside their insert.
- **Bus volume:** the route is bus input → optional effects insert → output gain → next stage.
  `setBusVolume` changes only the output gain, with a volume range of 0–1. For `"sfx"`,
  `"music"`, and `"audio"` it uses a 10 ms linear ramp.
  It never occupies or replaces the effects slot. Removing an effect preserves bus volume;
  changing volume preserves the effect. A zero target silences the bus, including effect tails,
  once the ramp completes. For `"master"`, the output gain is the existing master gain and
  shares its setting and ramp with `setVolume()`: `setTargetAtTime` with a ~15 ms time constant
  (Section 5.1), not the 10 ms linear ramp. `setBusVolume( "master", v )` and `setVolume( v )`
  are equivalent.
  The public `setBusVolume()` command remains in `sound-advanced`; core exposes only the
  extension-service method until a promotion decision is made.
- **Taps:** `tapBus` taps are parallel, read-only connections, used by the analyser. Removing a
  tap disconnects only that tap. A bus tap follows its effects and output gain.

#### 4.3.3 PLAY extension contract

`registerPlayExtension( name, extension )` lets instruments change how later notes sound:

| Member | Contract |
| --- | --- |
| `tokens` | Map of token prefix to `handler( state, value )`, e.g. `{ "@": selectInstrument }` |
| `initState()` | Returns a new per-track state object, stored as `track.ext[ name ]` |
| `copyState( state )` | Returns a copy for a simultaneous (comma-separated) track |
| `resolveNote( state, note )` | Returns voice-spec overrides for one note, or `null` for default |

Behavior:

- **Tokenizer:** core builds its tokenizer from the built-in commands plus registered token
  prefixes. `@n` is always reserved. With no extension registered, core ignores it and logs a
  warning once per `play()` call.
- **Duplicate prefixes:** registering a prefix that a built-in command or another extension
  already owns throws `DUPLICATE_PLAY_TOKEN`, and the registration is rejected as a whole.
  Registering the same extension `name` twice throws the same error. There is no replacement
  or chaining of handlers in v1.
- **Token handlers** run during event generation, in string order, and may only change their
  own `state`.
- **Simultaneous tracks:** wherever core copies built-in track settings to a simultaneous track
  (today's `copyTrackData`), it also calls `copyState` for each extension. Instrument selection
  therefore carries across comma-separated tracks the same way octave and tempo do.
- **`resolveNote`** is called once per note during event generation with `{ frequency, time,
  gate, volume, envelope, pan, oType }`. The overrides it returns (synth parameters, a source
  type, insert descriptors) are copied into immutable event snapshots. Parameter arrays and
  nested objects are copied too; factory functions are retained without invoking them.
  Parsing allocates no source or insert nodes. The scheduler invokes factories only after
  the event passes expiration, lateness, and capacity checks. Rejected or skipped events never
  invoke them. `createVoice` applies the same rule to delayed `synth()` requests.
- **Redefining an instrument** therefore affects later `play()` calls only, never a song that
  is already queued.

#### 4.3.4 Contract tests

Before v1 is frozen, stub extensions verify:

- Lifecycle call order and exactly-once `dispose` for sources and inserts.
- Cleanup when a factory throws.
- Early stop of voices that have inserts.
- An explicit stop advancing a future steal deadline, including before its fade begins.
- Scheduled-source cancellation and repeated earlier stops, with exactly-once disposal.
- Bus insert replacement and removal restoring the direct route.
- Bus volume and effects working together in either call order; removing effects preserves
  volume, and muting silences effect tails without disposing of the effect.
- Tap removal.
- PLAY extension state carrying across simultaneous tracks.
- Queued songs being unaffected by later instrument changes.
- A long instrumented song allocating no inserts during parsing, with fresh inserts created
  only for admitted voices in the lookahead window.

## 5. Core Audio Graph

```
 Voices (sound)          Voices (play)             Sample instances
 source → [inserts]      source → [inserts]        buffer/stream source
   → envelope gain         → envelope gain           → instance gain
   → [panner]              → [panner]                → [panner]
        │                        │                          │
        ▼                        ▼                          ▼
   ┌─────────┐             ┌──────────┐              ┌──────────┐
   │ sfx bus │             │ music bus│              │ audio bus│
   └────┬────┘             └────┬─────┘              └────┬─────┘
        ▼                        ▼                          ▼
   [bus effects]            [bus effects]              [bus effects]
        ▼                        ▼                          ▼
   output gain             output gain                output gain
        └──────────────┬────────┴─────────────────────────┘
                       ▼
                 master input (effects insert point)
                       ▼
                 master gain  ← setVolume()
                       ▼
                 compressor (DynamicsCompressorNode)  ┐
                       ▼                              ├ limiter, bypassable as a unit
                 soft clipper (WaveShaperNode)        ┘
                       ▼
                 destination
```

- **Buses** have an input `GainNode` fixed at 1 and a separate output gain initially at 1.
  Core owns the routing, effects insert point, and output gain. The dedicated service method
  controls volume after effects, so it also controls their tails. Public per-bus volume is
  provided by `sound-advanced` (and is a strong candidate for moving into core).
- **Panner** (`StereoPannerNode`) is created only when a voice or instance has a non-zero pan,
  or when its pan can change later (sample instances with pan set). This keeps the node count
  down for the common unpanned case.
- **Voice removal:** after `onended`, all voice nodes are disconnected and removed from the
  voice table, as today.

### 5.1 Master volume

- `setVolume( volume )` sets only the master gain, using `setTargetAtTime` with a ~15 ms time
  constant. Zero is a valid target; the `0.01` workaround is removed.
- The default stays `0.75`. Per-voice gain nodes no longer carry global volume.

### 5.2 Limiter

A compressor alone cannot guarantee a ceiling:

- It has a finite ratio and attack time, so sudden peaks pass through before it reacts.
- The Web Audio specification applies automatic makeup gain, so heavily overdriven input can
  come out above 1.0.
- Dense mixes of sample instances and synth voices can still produce large overloads.

The limiter therefore has two stages. On/off applies to both stages together.

1. **Compressor** (`DynamicsCompressorNode`) reduces sustained overload so the clipper rarely
   engages. Starting settings are threshold `-6` dB, knee `0`, ratio `20`, attack `0.003` s,
   and release `0.1` s. The threshold accounts for the makeup gain. Phase 1 tunes these values
   against the quality metric in Section 10.2.
2. **Soft clipper** (`WaveShaperNode`, `oversample: "none"`) sets the absolute ceiling:
   - **Shape:** a gain of `1 / H` (headroom `H = 4`) feeds a runtime-generated curve spanning
     input `±H`. The curve is exact identity up to the knee (`0.9`) and rises smoothly (tanh)
     toward ±1.0 above it. The Web Audio specification maps input beyond the curve's range to
     its endpoints, so no output sample can exceed ±1.0.
   - **Clean region:** linear interpolation over the identity region reproduces input exactly,
     so signals below the knee pass unchanged. That holds only if the knee itself is a curve
     sample: the curve covers `±H` with `N` points, so `N − 1` must be a multiple of 80 for
     input `±0.9` to land on sample points (`N = 8001` at startup). A knee that falls between
     samples would bend the identity region slightly below it.
   - **No oversampling:** oversampling is off because its filters can overshoot the ceiling.
   - **Size:** the curve is generated at startup and adds no bundle data.

Guarantee and switch:

- **Guarantee:** with the limiter on, output samples never exceed ±1.0.
- **Quality:** the compressor keeps the clipper's engagement low, measured by the Section 10.2
  quality metric.
- `setSoundLimiter( enabled )`: when disabled, the master gain connects straight to the
  destination, bypassing both stages. Switching reconnects immediately with no crossfade. It can
  cause a brief discontinuity, so the docs recommend setting it before playback starts.
- The limiter is on by default. It is a safety net, not a mastering stage, and the docs say so.

### 5.3 Autoplay unlock

- The context is created lazily on the first sound command, as today.
- While the context is `suspended`, core adds capture-phase, passive listeners for
  `pointerdown`, `keydown`, and `touchend` on `document`, and calls `context.resume()` on the
  first one. Listeners are removed once the context is running.
- If the state later changes to `suspended` or `interrupted` (iOS audio session interruptions),
  core re-arms the listeners.
- Core adds no dependency on the keyboard or pointer plugins.
- **Media elements have their own gate.** Resuming the context does not authorize
  `HTMLMediaElement.play()`. Stream-mode instances deferred under D3 are therefore started
  synchronously inside the gesture listener, in the same call stack that invokes
  `context.resume()`, so they run under the same user activation. Starting them when the
  resume promise settles loses the activation on engines that do not carry it across the
  promise boundary.
- **Requests made while locked:** see Section 12, Decision D3.

## 6. Synthesized Sound (core)

### 6.1 `sound()` signature

```javascript
$.sound( frequency, duration, volume, oType, delay,
	attackTime, decayTime, sustainLevel, releaseTime, pan, frequencyEnd );

$.sound( {
	"frequency": 220, "duration": 0.3, "volume": 0.8, "oType": "square",
	"attackTime": 0.01, "decayTime": 0.1, "sustainLevel": 0.4, "releaseTime": 0.2,
	"pan": -0.5, "frequencyEnd": 110
} );
```

| Parameter | Default | Meaning |
| --- | --- | --- |
| `frequency` | 440 | Hz; no longer rounded |
| `duration` | 1 | Gate length in seconds: how long the note is held before release begins |
| `volume` | 1 | Peak gain, 0–1 |
| `oType` | `"triangle"` | `sine`, `square`, `triangle`, `sawtooth`, `white`, `pink`, or wave table |
| `delay` | 0 | Seconds before the voice starts (context-clocked) |
| `attackTime` | 0 | Seconds from silence to peak |
| `decayTime` | 0 | Seconds from peak to `sustainLevel` |
| `sustainLevel` | 1 | Fraction of peak held until the gate ends, 0–1 |
| `releaseTime` | 0.1 | Seconds from the gate-end level to silence |
| `pan` | 0 | -1 (left) to 1 (right) |
| `frequencyEnd` | none | If set, frequency sweeps exponentially to this value over `duration` |

The total voice length includes the release floor: `duration + max( releaseTime, MIN_RAMP )`.
`attack` and `decay` are no longer recognized. The upgrade guide documents the positional shift.

- **Sweep validation:** an exponential ramp cannot cross or reach zero. When `frequencyEnd` is
  set, both `frequency` and `frequencyEnd` must be greater than 0, or the call throws
  `INVALID_FREQUENCY`. Without a sweep, `frequency` is only coerced to a number, as in 2.2,
  where no range is enforced and a non-positive value plays silence.
- **Positional argument 7.** In 2.2 the 7th argument, `decay`, fades the voice to silence and
  defaults to 0.1 s, so it behaves as a release. Under the ADSR order above, position 7 is
  `decayTime`, which with the default `sustainLevel` of 1 is a no-op. A 2.2 call passing a long
  tail there therefore gets the 0.1 s default release instead, with no error. Decision D2
  (Section 12) accepts this to keep the positional and object forms in the same ADSR order;
  the upgrade guide calls it out with the example in Section 11.

### 6.2 Envelope behavior

- **Attack** is a linear ramp, which sounds even and reaches peak on time.
- **Decay and release** use `setTargetAtTime` with the time constant
  `stageTime / ln( 10000 )` (about `stageTime / 9.2`). At that rate the remaining distance to the
  target falls by 80 dB over the stage. At the end of release, gain is set to exactly 0 before
  the source stops.
- **De-click floor:** every onset and every stop uses a ramp of at least `MIN_RAMP` (3 ms), even
  when `attackTime` or `releaseTime` is 0. This is a documented guarantee, not a parameter.
- **Early gate end:** if `duration` ends before attack and decay finish, release starts from the
  envelope's value at gate end. `envelope.js` computes that value analytically. The
  implementation does not use `cancelAndHoldAtTime`, because Firefox lacks it.
- `envelope.js` exports pure functions (`envelopeValueAt`, `buildEnvelopeSchedule`). The Web
  Audio scheduler and the unit tests use the same math.

### 6.3 Voice lifecycle, stopping, and caps

**States.** A sound uses these lifecycle states:

| State | Meaning | Holds audio nodes |
| --- | --- | --- |
| `pending` | Delayed request whose nodes have not been created (beyond the window, or deferred by window fill) | No |
| `scheduled` | Nodes created and started for a future time inside the window | Yes |
| `active` | Currently sounding | Yes |
| `retiring` | Occupancy truncated to a steal deadline; the fade has not begun | Yes |
| `stopping` | Fading out after a stop or steal | Yes |

**Deferred node creation.**

- `sound()` with a `delay` beyond the lookahead window (0.2 s, Section 8.1), and `playAudio()`
  with such a `delay`, return an ID immediately but only record the request.
- The shared scheduler creates nodes when the start time enters the window.
- A pending request costs a small record, not audio nodes. Nodes therefore exist only for
  sounds that start within the window or are already sounding.

**Stopping.** `stopSound()`, `stopPlay()`, `stopAudio()`, voice stealing, and `removeAudio()`
all go through one `stopVoice()` path. Explicit stops use these rules; automatic steals use
the future-deadline rules below:

- **`pending`:** the record is removed. No nodes exist.
- **Not yet audible:** a `scheduled` source, or a `retiring` source whose start is at or after
  the scheduling lead (below), is stopped and disposed immediately. No fade is needed. A voice
  whose start falls between `now` and the lead may already be sounding by the time a stop
  lands, so it is treated as audible and faded.
- **Audible `active` or `retiring`:** an explicit stop replaces any later steal deadline with a
  fade starting at the scheduling lead (below). Scheduled gain events are cancelled from that
  time, the analytic value at that time is written with `setValueAtTime`, and gain ramps to 0
  over `STOP_FADE` (10 ms). An earlier committed end, including natural completion, is
  preserved. The voice becomes `stopping` and holds no slot.
- **`stopping`:** a repeated explicit stop never prolongs the fade. Keep the earlier deadline;
  hard-cap cleanup may still stop the source immediately.

**Scheduling lead.** `context.currentTime` on the main thread lags the render thread, so an
automation event placed at `now` can land in the past and be applied a quantum or more late.
Every "immediate" change in this plan is therefore scheduled at
`lead = now + SCHEDULE_LEAD`, rounded up to the next render-quantum boundary, where
`SCHEDULE_LEAD` is the greater of two render quanta and `context.baseLatency`. That covers
explicit-stop fades, `setAudio()` ramps and rate steps, pause bookkeeping, and the value
preserved when scheduled events are cancelled. Analytic values are evaluated at `lead`, not at
the stale `now`. In the offline harness `baseLatency` is 0 and the lead is two quanta, so
tests exercise the same code path. The user-visible effect is that an explicit stop is silent
within `SCHEDULE_LEAD + STOP_FADE`, about 15 ms on desktop engines, which the docs state.
Wherever this plan says a voice is "not yet audible", "still in the future", or "cancelled
without sounding", the comparison is against `lead`, not `now`.

`stopVoice( soundId, when )` treats `when` as the requested silence deadline. For an automatic
steal at conflict time `c` (defined under admission below), the fade starts at
`max( lead, c − STOP_FADE )` and ends 10 ms later, unless an earlier committed end applies.
Omitting `when` requests `lead + STOP_FADE`.
Core tracks stop deadlines separately from whether the fade has begun, and reschedules source
and insert stops whenever the deadline moves earlier. Track and instance controls include
`retiring` voices, so an explicit stop cannot leave a future-steal victim playing until its
old deadline.

**Caps.** Three limits bound memory and node counts:

| Cap | Counts | When exceeded |
| --- | --- | --- |
| `MAX_VOICES` (64) | Slot holders whose occupancy intervals overlap at any instant | Admission rules below |
| `MAX_LIVE_VOICES` (128) | Voices in any node-holding state, including `retiring`. It counts voices, not audio nodes; each voice owns two to four nodes plus inserts | See below |
| `MAX_PENDING_SOUNDS` (1024) | `pending` records from `sound()`/`playAudio()` | Call throws `TOO_MANY_PENDING_SOUNDS` |

The limits are shared by `sound()`, PLAY voices, and decoded or streamed sample instances.
64 slots is the initial budget; listening and performance checks validate it before
release. There is no separate sample budget or public priority API in 2.3.

**Slots and admission:**

- **When slots are checked.** Admission happens on the main thread when nodes are created. A
  voice's start time can be up to one lookahead window later, 2 s in hidden tabs. If admission
  counted only sounding voices, voices already scheduled ahead would be invisible to it, and more
  than 64 voices could start together. If it counted every `scheduled` and `active` voice
  regardless of timing, it would steal long notes to make room for short notes that end before
  the incoming voice starts. Admission therefore counts slots by **occupancy interval**.
- **Occupancy intervals.** Every slot holder has an interval `[start, occupancyEnd)`:
  - **Synth and PLAY voices:** `occupancyEnd` is the committed end: gate plus effective
    release, or an earlier stop deadline. It can only move earlier.
  - **Sample instances:** open-ended until they end or begin `stopping`. Rate changes can move
    a sample's predicted end later, so a predicted end is never used for occupancy.
  - **Stealing:** a steal deadline truncates the victim's interval to that deadline. The
    victim is `retiring` until its fade begins.
  - **Explicit stops, pauses, and natural ends** close the interval at that moment. Fades in
    progress (`stopping`) hold no slot.
  - **`pending` records** hold no slot.
- **Protected loops.** Sample instances with `loop: true` are protected from automatic
  stealing, including loops with a finite content duration. Protection does not exempt them
  from the shared limits.
- **Admission check.** For an incoming voice with interval `[s, e)`, core finds the peak
  number of holder intervals overlapping any instant in `[s, e)`. It is enough to evaluate the
  peak at `s` and at each holder start inside `(s, e)`, which is cheap with at most 128 voices.
  If the peak is below `MAX_VOICES`, the voice is admitted with no steal. This guarantees that
  at most 64 slot holders overlap at any instant, including when an immediate long voice arrives
  while short voices are scheduled ahead.
- **Admission when full.** Let the **conflict time** `c` be the earliest instant in `[s, e)` at
  which the incoming voice would make 65 overlapping holders.
  - The victim is the oldest unprotected holder, by admission order, whose interval contains
    `c`. Holders that end before `c` are never victims, so long notes are not cut for voices
    that don't actually overlap them.
  - The victim's interval is truncated to `c`, and core recomputes. Rarely, a later conflict
    time needs another victim. Victims are chosen tentatively and committed only if every
    conflict resolves; otherwise the incoming voice is rejected and no victim is touched.
  - When `c − STOP_FADE` is at or after the scheduling lead, `stopVoice( victim, c )`
    schedules a fade ending at `c`. Until the fade begins, the victim is `retiring`. This
    avoids cutting the victim short merely because the incoming voice entered the lookahead
    window.
  - Otherwise the victim fades from the scheduling lead for the full 10 ms. The incoming voice
    starts on time, including immediately; their brief overlap is allowed under the live-voice
    cap.
  - A scheduled victim that would start at or after the chosen fade start is cancelled without
    sounding. An earlier scheduled victim may sound, then fade on that schedule.
  - `retiring` and `stopping` victims retain their nodes and may still sound. They count toward
    `MAX_LIVE_VOICES`; repeated admission cannot exceed the 128-voice hard cap.
- **Rejection.** If every holder overlapping a conflict time is protected, the incoming voice is
  rejected instead of stopping an existing loop.
- **Loop slots.** A scheduled loop is an open-ended holder from its start, so admitting future
  loops cannot promise more than `MAX_VOICES` protected slots. Resuming a paused loop must pass
  admission again.
- **Stream replacement.** A new `playAudio` on a stream audio ID replaces the current instance
  and inherits its slot at admission. It never needs a free slot, so music can be restarted or
  switched even when protected loops fill the budget. The outgoing instance's fade holds no
  slot.
- **Explicit controls still apply.** Explicit stop, pause, removal, finite-duration completion,
  and stream replacement all apply to protected loops.

**Rejected requests:**

- **No sound, no retry.** Rejected requests create no source. A capacity warning is logged at
  most once per second. There is no automatic retry queue, and callers cannot detect rejection
  (there is no priority API in 2.3).
- **IDs complete.** Every rejection, immediate or at scheduler admission, returns or keeps a
  normal ID in the completed state. The same holds for PLAY notes and late requests skipped by
  the late-start rule (Section 8.1).
- **Paused instances.** A rejected resume leaves the instance paused.

**Operations on completed IDs** are no-ops. That includes `stopSound`, `stopAudio`,
`pauseAudio`, `resumeAudio`, and `setAudio`.

- Instance IDs are allocated in increasing order. Any issued numeric ID that is no longer live
  is treated as completed, so core keeps no record of finished instances.
- A numeric ID that was never issued throws `AUDIO_NOT_FOUND`.
- `stopSound` keeps its 2.2 behavior of ignoring unknown IDs.

When creating a voice would exceed `MAX_LIVE_VOICES`, core frees room in this order:

1. A `retiring` voice that is not yet audible (its start is at or after the scheduling lead)
   is cancelled silently.
2. A `stopping` voice is stopped without finishing its fade, choosing the one furthest into its
   fade (quietest) first.
3. An audible `retiring` voice is stopped without a fade, oldest first.
4. The oldest unprotected `active` voice is stopped without a fade.
5. If only protected active voices or `scheduled` voices remain, reject the incoming voice
   using the rejection behavior above. Existing protected loops are never hard-stopped to
   admit another voice.

This order spends silent and nearly silent voices before any voice playing at full level.

A stream replacement inherits the outgoing instance's slot, but its new nodes still count
against `MAX_LIVE_VOICES` until the outgoing fade ends. Freeing nodes for it follows the same
order.

These overflow paths are the only ones that can click. They only occur under floods far beyond
normal use.

`play()` events are not `pending` records. They are held in their track, bounded by the length
of the play string. The scheduler creates their voices subject to `MAX_LIVE_VOICES` and the
window-fill rule in Section 8.1.

### 6.4 Noise

- `oType: "white"` and `oType: "pink"` use shared, lazily generated, 2-second mono noise buffers
  at the context sample rate. Pink noise uses the Paul Kellet filter method.
- Each voice loops its buffer and starts at a random offset, so repeated hits do not phase
  against each other.
- `frequency` and `frequencyEnd` for noise: see Section 12, Decision D1.

## 7. Sample Playback (core)

`<audio>` pools are replaced by decoded `AudioBuffer`s and on-demand `AudioBufferSourceNode`
instances. An opt-in streaming mode handles long files.

### 7.1 API

```javascript
$.loadAudio( src, name, stream );                      // returns audio ID (string)
$.playAudio( audioId, volume, startTime, duration,
	loop, playbackRate, pan, delay );                  // returns instance ID (number)
$.stopAudio( id );          // instance ID, audio ID, or omitted for all
$.pauseAudio( id );         // instance ID, audio ID, or omitted for all
$.resumeAudio( id );        // instance ID, audio ID, or omitted for all
$.setAudio( instanceId, volume, playbackRate, pan );   // omitted values are unchanged
$.removeAudio( audioId );
```

| Parameter | Default | Meaning |
| --- | --- | --- |
| `stream` | `false` | `true` streams through a media element instead of decoding into memory |
| `volume` | 1 | Instance gain, 0–1 |
| `startTime` | 0 | Offset into the file, in seconds |
| `duration` | 0 | Seconds of file content to play (see 7.3); 0 plays to the end, or forever when looping |
| `loop` | `false` | Loop the whole file |
| `playbackRate` | 1 | Decode mode 0.0625–16, stream mode 0.25–4; changes pitch and speed together |
| `pan` | 0 | -1 to 1 |
| `delay` | 0 | Seconds before playback starts (context-clocked) |

- **ID types:** audio IDs are strings (a user-given name or `audio_N`), and instance IDs are
  numbers. `stopAudio`, `pauseAudio`, and `resumeAudio` decide what an ID refers to from its type.
- **`stream` validation:** `loadAudio` requires `stream` to be a boolean. An old call such as
  `loadAudio( src, name, 4 )` fails loudly with `INVALID_STREAM` instead of silently switching
  modes.
- **Rate range per mode:**
  - Decode mode has no engine limit. The 0.0625–16 range is a Pi.js bound.
  - Stream mode is limited to 0.25–4, because Gecko mutes media-element audio outside that
    range.
  - `playAudio` and `setAudio` validate the rate against the instance's mode, and throw
    `INVALID_PLAYBACK_RATE` instead of silently muting.
- **Error codes:** they are renamed from pool terminology, for example `AUDIO_POOL_NOT_FOUND`
  becomes `AUDIO_NOT_FOUND` and `EMPTY_POOL` becomes `AUDIO_NOT_LOADED`. Section 11 lists the
  full set.
- **No "pool" terminology:** it is removed from the API, the documentation, and the error
  codes.

### 7.2 Loading

- **Decode mode:** `fetch( src )`, then `arrayBuffer()`, then `decodeAudioData()`. Each
  `loadAudio` call holds a single `ready()` wait, where 2.2 held one wait per pool slot.
- **Retries:** network failures (a rejected fetch or a 5xx status) retry up to three times,
  100 ms apart, as today. HTTP 4xx and decode errors fail immediately. Terminal failures are
  logged and release the wait.
- **Stream mode:** creates one `<audio>` element with `crossOrigin = "anonymous"` and routes
  it through `createMediaElementSource`. It is ready at `canplay`, with the same retry policy.
  Without the `crossOrigin` attribute, a CORS-enabled cross-origin file would still play
  silence through the graph.
- **Unsupported pages:** `file://` pages and cross-origin files without CORS headers are not
  supported. Decode mode fails at `fetch`. In stream mode, a media element source from those
  origins plays silence, so stream mode detects `file:` pages up front and fails with a clear
  error. The docs state that audio requires an HTTP(S) server.
- **`removeAudio`:** keeps its 2.2 guarantees. It cancels pending fetches through
  `AbortController`, releases waits, stops instances with a fade, and frees the name
  immediately. Late results from removed audio cannot affect a replacement.

### 7.3 Playback

#### Definitions

- **Content time** is a position in the file, in seconds. **Context time** is elapsed audio
  clock time.
- **`startTime` and `duration`** are measured in content time in both modes. This matches
  `AudioBufferSourceNode.start( when, offset, duration )`. At `playbackRate` 0.5, `duration: 5`
  plays 5 seconds of the file over 10 seconds of context time.
- **Looping:** `duration` counts all content played, including every loop pass.
- **Consumed content** is the content played since the instance started, including every loop
  pass, plus any content skipped to catch up after a late start. At instance creation, resolve
  **content budget** from the public duration: a positive value is a finite budget; zero means
  unbounded for loops, or file length minus `startTime` for non-loops. For non-loops a finite
  budget is also capped by available file content. **Remaining** is that budget minus consumed
  content, with a distinct internal unbounded value rather than the numeric zero sentinel.
- **Position** is the current place in the file: `startTime` plus consumed content, wrapped by
  the file length when looping.

#### Rate changes and position tracking

- `setAudio( id, …, playbackRate )` applies the new rate as a step with `setValueAtTime`, at the
  first render-quantum boundary (a multiple of 128 frames on the context clock) at or after the
  scheduling lead defined in Section 6.3.
- **Why a step:** `playbackRate` is evaluated once per render quantum, so a step aligned to a
  quantum boundary is exactly what the engine renders. A rate step changes speed, not the
  waveform, so it cannot click. No ramp is needed.
- **Position model:** each instance keeps a list of `( contextTime, rate )` segments, and
  consumed content is the sum of `rate × segment length` over them. Because every change lands
  on a quantum boundary that is still in the future when the event is committed, the analytic
  position matches the rendered position to the sample. Without the lead, an event that lands
  in the past is applied a quantum late and the model drifts; offline renders would not show
  that drift, so the realtime stream-mode test in 10.3 also checks decode-mode position after a
  rate change against a generous tolerance.

#### Decode mode

- **Starting:** each `playAudio` creates a source, an instance gain, and an optional panner, and
  uses the resolved content budget. Public `duration: 0` omits the native third argument:
  `source.start( when, startTime )`. A positive finite remaining budget is passed as the third
  argument. Never pass the public zero sentinel as native duration; native zero plays no
  content. An exhausted finite budget completes without constructing a source.
- **Early end:** when `duration` ends before the file does, core predicts the context time at
  which `duration` of content will have been consumed, using the position model. It schedules a
  `STOP_FADE` ramp to end at that time. If a rate change moves the predicted end, the fade is
  rescheduled.
- **Instances:** instance count is limited only by the caps in Section 6.3. Each instance ends
  and cleans itself up. Looping instances receive the protection and admission rules there.

#### Pause and resume

- **Pause:** `pauseAudio` records the pause at the first render-quantum boundary at or after
  the scheduling lead and saves position and remaining from the position model at that time.
  The source then fades out over `STOP_FADE` and stops.
- **Fade overlap:** content that plays during the fade is **not** counted. Resume restarts from
  the saved position, so up to `STOP_FADE × rate` of content (at most 10 ms × rate) is heard
  twice: faded out, then faded back in.
- **Resume:** creates a new source at the saved position with the saved remaining as its
  duration when finite and positive, or omits the native duration argument when unbounded.
  Exhausted finite instances complete without restarting. Loop settings are unchanged. It
  fades in over `MIN_RAMP`.
- **Before start:** pausing a `pending` or `scheduled` instance cancels its start. Resuming it
  starts playback immediately from `startTime` with the full duration. The unused delay is not
  restored.
- **Idempotence:** pausing a paused instance, or resuming a playing one, does nothing.

#### Stream mode

- **One instance:** there is one element per audio ID, so at most one instance is active. A
  new `playAudio` fades out and replaces the current instance, taking over its voice slot
  (Section 6.3).
- **Same definitions:** position comes from `element.currentTime`, and `duration` is content
  time. The end timer is armed for `remaining / rate` of context time and re-armed on every
  rate change.
- **Approximate timing:** timers and media-element timing make `duration`, `delay`, and pause
  positions approximate, and the docs say so.
- **Pitch:** `playbackRate` sets `preservesPitch = false`, so both modes change pitch together
  with speed. The stream-mode rate range is 0.25–4 (Section 7.1).

#### Instance changes before and after start

`setAudio()` behavior depends on the instance's state:

| State | Volume and pan | Playback rate |
| --- | --- | --- |
| `active` / `retiring` | Linear 10 ms ramp from the first quantum boundary at or after the scheduling lead | Quantum-aligned step (above) |
| `scheduled` | Set at `max( lead, start )`; ramps begin there | Step at `max( lead, start )`, recorded as the first segment |
| `pending` | Stored in the record | Stored, and recorded as a segment |
| paused | Stored; applied on resume | Stored; applied on resume |

- **Segments for unstarted instances.** A `pending` or `scheduled` instance's rate segments
  are measured from its intended start time.
  - The rate at creation defines the segment beginning at the intended start.
  - A later `setAudio` rate change adds a segment at the first quantum boundary at or after
    the scheduling lead.
  - If the call happens before the intended start, the new rate replaces the initial rate
    instead.
- **Late starts.** The late-start calculation (Section 8.1) sums these segments over the late
  interval. A rate changed while a delayed loop was waiting, or during a stall, therefore
  produces the same position the loop would have reached had it been playing.

### 7.4 Memory guidance

The docs state approximate costs. Decoded audio uses about 21 MB per stereo minute at 44.1 kHz
(float32). Stream mode is recommended for music longer than about 30 seconds.

## 8. Music: `play()` (core)

### 8.1 Lookahead scheduler

- Parsing stays as it is. `createTrack()` and `playTrack()` still build a timed event list.
- `scheduler.js` then turns events into voices only when they fall within a lookahead window of
  0.2 s, checked every 25 ms. A song no longer creates all of its nodes up front.
- **Hidden tabs:** when `document.hidden`, the window grows to 2 s, because browsers throttle
  timers in background tabs. It shrinks back when the page becomes visible.
- **Window fill is capacity-limited:**
  - **Order:** each tick creates voices for window items in start-time order.
  - **Due items:** an item whose start is within the base 0.2 s horizon is always processed.
    It goes through expiration, the late-start rule, admission, and the node cap, and it may be
    rejected.
  - **Items beyond the base horizon** are created only while node-holding voices stay below
    `MAX_LIVE_VOICES − FILL_HEADROOM` (16). Once the limit is reached, the tick stops filling.
    Remaining items stay queued (PLAY events in their track, delayed requests as `pending`
    records) and are revisited on later ticks.
  - **Result:** the extended hidden-tab window is best-effort and never causes a rejection.
    Dense songs in background tabs keep playing through due-item scheduling instead of
    exhausting nodes on voices seconds ahead. Deferred items remain subject to the late-start
    rule.
- **Late-start rule:** the audio context clock defines every timeline. On each tick, the
  scheduler compares each unscheduled item's start time with `context.currentTime`. Items
  include PLAY notes and `pending` `sound()`/`playAudio()` records. An item is late when
  `lateness = context.currentTime − start` is greater than 0.
  - **Expiration first:** before allocating nodes or stealing a slot, complete an item whose
    original audible end has passed. For synth/PLAY this includes the effective release floor;
    for samples use the resolved content budget and position model. This check applies even
    within grace. A late item with less than `MIN_RAMP` of audible time left also completes
    without playback, so recovery never requires an instantaneous onset.
  - **Within grace** (`lateness ≤ LATE_GRACE`, 25 ms, one scheduler interval): a surviving item
    starts immediately. Synth/PLAY keeps the original gate end, release end, and sweep timeline.
    Evaluate its envelope at the original timeline position, with a `MIN_RAMP` fade-in from
    silence multiplying the remaining envelope. Do not replay a completed attack or gate.
    Samples advance their offset by skipped content and reduce remaining content by the same
    amount, including one-shots and loops within grace. They fade in over `MIN_RAMP` without
    extending their original end.
  - **Beyond grace, PLAY notes and one-shot requests:** skipped, even if the gate or release
    would still be sounding. The returned or track-internal ID completes without playback
    (Section 6.3). The scheduler continues with the next on-time item at its original
    timestamp; it does not replay missed attacks or shift later items forward.
  - **Beyond grace, looping `playAudio()` requests:** surviving loops start subject to
    admission. Apply the same offset advancement and onset fade as within grace. Compute
    skipped content using the Section 7.3 rate segments over the late interval
    (`lateness × playbackRate` when rate is constant). Add it to `startTime`, wrap loops by
    file length, and subtract it from finite remaining content. Never turn an exhausted finite
    loop into an unbounded one. This preserves the loop's position on its original timeline.
  - **Stream mode** applies the same offset through `element.currentTime`, within its
    documented approximate timing.
  - Initial scheduling runs synchronously when a track or request begins, so the first item is
    not deferred to the first timer tick. Already-scheduled voices continue normally.
- **Suspension:** when the audio context is suspended or interrupted and its clock is frozen,
  wall-clock time does not advance the song. On resumption the scheduler uses context time;
  it does not skip notes merely because time passed outside the audio context.
- **Recovery scope:** the larger hidden-tab window reduces underruns but cannot prevent every
  stall. After an underrun, skipped notes may leave a gap, but preserving the original timeline
  keeps simultaneous PLAY tracks aligned. This is scheduler recovery, not a public pause API.
- **Stopping:** `stopPlay( trackId )` handles every stage a note can be in:
  - It drops the track's events that have no voice yet.
  - It stops and disposes of voices already created inside the lookahead window but not yet
    audible (`scheduled` or `retiring` with a start at or after the scheduling lead), without
    a fade.
  - It fades the track's audible `active` and `retiring` voices through `stopVoice()`, advancing
    any later steal deadline. Existing earlier fades are never prolonged.

  No note of a stopped track can sound after the call, apart from the scheduling lead and the
  10 ms fade.
- **Shared scheduler:** the same scheduler creates nodes for delayed `sound()` and
  `playAudio()` requests (Section 6.3), so all node creation happens in one place and obeys
  the same caps.
- **Cleanup:** track removal is driven by the scheduler, replacing the per-track `setTimeout`.
- **Routing:** all music voices go to the music bus.

### 8.2 PLAY string changes

| Command | Meaning |
| --- | --- |
| `MA n` | Attack time, % of the note's sounding length |
| `MD n` | Decay time, % of the note's sounding length |
| `MH n` | Sustain (hold) level, % of note volume |
| `MR n` | Release time, % of the note's sounding length |
| `MP n` | Pan, -100 to 100 |
| `WN` / `NOISE` | White noise waveform |
| `WP` / `PINK` | Pink noise waveform |
| `@n` | Select instrument `n` (handled by an extension; ignored in core) |

- **Removed:** `MT` is removed (the old sustain-rate command). The internal
  `MY`/`MX`/`MZ`/`MU` rewrite aliases are removed, and the tokenizer handles the new commands
  directly.
- **Beat, sounding length, and pace.** Each note occupies a **slot** of
  `tempo × noteLength × 4` seconds, and the track advances by the full slot. Pace no longer
  shortens the slot (the Section 3 defect). Instead the note's **sounding length** is
  `slot × pace`, so `MS` (0.75), `MN` (0.875), and `ML` (1) leave a rest at the end of the
  slot while the beat stays fixed. Simultaneous tracks therefore stay aligned regardless of
  each track's pace.
- **Gate and release placement.** All four envelope percentages are fractions of the
  sounding length. The release runs inside it, not after it: the gate ends at
  `soundingLength × ( 1 − MR / 100 )`, and the hold segment is whatever remains after attack,
  decay, and release. With the defaults, attack, decay, and release use 55% of the sounding
  length and the hold uses 45%. A note's envelope therefore always fits its own slot. If
  `MA + MD + MR` exceeds 100, the hold is zero, decay is cut short at the gate end, and
  release starts from the value reached there. `MW` keeps its 2.2 meaning of cutting a voice
  that would overrun the slot; under this rule only an extension that lengthens the release
  can overrun, so core treats `MW` as a no-op and still parses it.
- **Defaults** reproduce a musical shape close to 2.2: attack 15%, decay 20%, sustain level
  65%, release 20%. In 2.2 the 65 was a stage duration and the note fell to 80% during it;
  here it is a level, so the shape is similar but not identical. Final values are set in
  Phase 4 using the listening demo.
- **`@n` without an extension:** core always parses the token. It is handled by a registered
  PLAY extension (Section 4.3.3). With no extension, the token is ignored and a warning is
  logged once per `play()` call.

## 9. Advanced Plugin: `sound-advanced`

Depends on `sound`. All features use the extension service.

| Module | Public API (proposed) | Notes |
| --- | --- | --- |
| `synth.js` | `synth( options )` → sound ID | `sound()` superset: `filterType`, `filterCutoff`, `filterQ`, filter envelope (`filterAttackTime`, `filterDecayTime`, `filterSustainLevel`, `filterReleaseTime`, `filterAmount`), `vibratoRate`, `vibratoDepth`, `tremoloRate`, `tremoloDepth`, `duty` (pulse), `arpeggio`, `arpeggioRate` |
| `periodic-noise.js` | `oType: "periodic"` via `registerSource` | NES-style LFSR noise; `frequency` sets the clock rate |
| `buses.js` | `setBusVolume( bus, volume )` | `"sfx"`, `"music"`, `"audio"`; core-promotion candidate |
| `effects.js` | `setBusEffect( bus, effect, options )` | `"reverb"` (generated impulse) and `"delay"` (feedback); `null` clears |
| `analyser.js` | `getSoundLevels( bus )` | Peak/RMS plus optional spectrum and waveform arrays |
| `presets.js` | `sfx( name, variation )`, `definePreset( name, params )` | Built-in retro set: coin, laser, jump, hit, explosion, powerup, blip, select |
| `instruments.js` | `defineInstrument( n, params )` + PLAY `@n` | Built-in instruments: square lead, pluck bass, pad, noise snare/hat/kick |

- **Service usage:** each module uses only the contracts in Section 4.3:
  - `synth.js`: `createVoice` with the filter and LFOs as voice inserts.
  - `periodic-noise.js`: `registerSource`.
  - `effects.js`: `setBusInsert`.
  - `analyser.js`: `tapBus`.
  - `instruments.js`: `registerPlayExtension`.
  - `buses.js`: the dedicated `setBusVolume` service method. It registers the public command
    without consuming an effects slot. Promotion moves command registration into core; the
    gain node and routing already belong to core.
- **Pulse waves:** they use `PeriodicWave` Fourier tables, cached per duty value (12.5%, 25%,
  50%, 75%, plus arbitrary values).
- **Presets and instruments:** these are data tables of `synth()` parameters. They add no new
  synthesis code, so their size cost is data only.
- **Full build:** `sound-advanced` is excluded from `pi.js` in 2.3.0 unless the size decision
  says otherwise.

### 9.1 Size budget and the core-merge decision

The maintainer makes the final call. The plan gives that decision the data it needs:

- **Build report:** `npm run build` is extended to report the minified and gzipped size of
  every plugin bundle, alongside the existing main-bundle report.
- **Why differential builds:** gzip savings depend on shared context, so a module's compressed
  cost is not additive. esbuild metafile byte counts are uncompressed contributions and cannot
  measure it.
- **`npm run size`:** a new script runs the differential builds in memory and writes
  `build/size-report.json`. It uses the same minification and gzip settings as the release
  build. It is kept separate from `npm run build` so normal builds stay fast.

Differential measurements:

| Measurement | Method |
| --- | --- |
| Plugin total | Gzipped size of the full `sound-advanced` bundle |
| Module marginal cost | Plugin total minus the gzipped size of a variant built without that module's registration |
| Shared dependency groups | A helper used by several modules (e.g. `synth.js` under presets and instruments) is reported as a group: removing the helper removes its dependents. The report lists the group's marginal cost and its members. Dependent modules' marginal costs exclude the helper. |
| Promotion cost | Gzipped size of core `sound` built with the module merged in, minus core alone. This is the number the promotion decision uses, because code shared with core compresses differently than it does in the plugin. |
| Full-merge cost | Gzipped `pi.min.js` with all of `sound-advanced` merged, minus the current `pi.min.js` |

The report states that marginal costs are not additive, and it always shows the plugin total
and full-merge cost next to them.

- **Soft targets:**
  - Core `sound` plugin: at most 8 KB gzipped, compared with 6.2 KB today.
  - Full build growth from sound work: at most 3 KB gzipped.
- **Advanced plugin:** there is no fixed cap. Each module's marginal and promotion costs are
  reported so they can be judged against its value.
- **Promotion checklist, for each module:**
  1. Promotion cost (differential, above).
  2. How many typical games would use it.
  3. Whether it adds an API concept or only extends an existing one.
  4. Whether moving it removes a service-interface dependency.
- **Candidates:** per-bus volume and the filter are the most likely candidates for promotion.
- **Merging the whole plugin into core:** reasonable if the full-merge cost stays under about
  4 KB gzipped. The modules and the service boundary are designed so a merge is a
  change to the build and registration code, not a rewrite.

## 10. Verification Strategy

Pi.js visual tests compare screenshots, which can't check audio. Audio is instead verified by
analyzing rendered samples.

### 10.1 Offline render harness

The harness is a browser test next to `test/unit/audio-lifecycle-browser.test.js`. It loads a
freshly built bundle. Everything it needs is installed before the bundle loads (Playwright
`addInitScript`) by replacing page globals, so production code gets no test hooks.

#### Page globals the harness replaces

| Global | Replacement |
| --- | --- |
| `window.AudioContext` | Factory returning one wrapped `OfflineAudioContext` (48 kHz, fixed length) whose `state` reports `"running"` and which emits no `statechange` events (see below) |
| `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval` | Virtual timers driven by the harness clock |
| `performance.now`, `Date.now` | Derived from the virtual clock |
| `Math.random` | Seeded PRNG (fixed seed per test, logged on failure) |
| `document.hidden` / `visibilitychange` | Controllable for hidden-tab lookahead tests |

- **State masking is mandatory, not cosmetic.** In the clock loop below, every timer callback
  and every test action runs while the real offline context is paused by `suspend( t )`, so
  its native `state` is `"suspended"` exactly when production code is running, and the native
  context fires `statechange` on every suspend and resume. Without masking, the Section 5.3
  re-arm logic would attach unlock listeners on every step, and the D3 policy would drop every
  one-shot issued from a test action. The wrapper therefore overrides `state` to `"running"`,
  swallows `statechange` (both `onstatechange` and `addEventListener`), and exposes its own
  `suspend`/`resume` only to the harness. A Phase 0 probe verifies that a page calling
  `sound()` from a test action at every step of a multi-second render produces one voice per
  call with no listener churn.
- **Locked-context tests:** the D3 policy is tested separately, with a factory whose `state`
  reports `"suspended"` and which delivers a synthetic `statechange` to `"running"` when the
  test simulates the gesture.
- **Not renderable offline:** `OfflineAudioContext` has no `createMediaElementSource`, so
  stream mode never runs in this harness. Its coverage is the realtime browser test in 10.3.
- **Deterministic noise:** the seeded PRNG makes noise buffers and random start offsets
  identical across runs and across engines.

#### Clock control

The offline render advances in steps of 1280 frames, 10 render quanta (26.7 ms at 48 kHz). Each
step lands on a quantum boundary, as `OfflineAudioContext.suspend()` requires, and is close to
the 25 ms scheduler interval. For each step:

1. Before rendering starts, the harness calls `suspend( t )` for the first step boundary.
2. When rendering suspends at `t`:
   - Virtual time advances to `t`, and due timer callbacks fire in order, including scheduler
     ticks.
   - Test actions scheduled for `t` run next, such as `stopAudio()` at 1.2 s, `pauseAudio()`,
     `setAudio()`, or a visibility change.
   - The harness registers `suspend( t + step )` and calls `resume()`.
3. When rendering completes, the buffer goes back to Node for analysis.

Because of this loop:

- **One clock:** the scheduler sees the virtual clock and context time agree, so long songs,
  mid-playback operations, and hidden-tab lookahead are exercised through the real scheduler
  code.
- **Timer lateness:** timer callbacks fire at most one step late. That is well inside the
  0.2 s lookahead, and it matches real timer jitter.
- **Stall recovery tests:** deliberately withhold scheduler timer callbacks while offline audio
  advances beyond the lookahead window, then run the overdue tick at the current context time.
  Assert each branch of the late-start rule (Section 8.1):
  - Expired items, including a short note wholly inside the 25 ms grace interval, create no
    nodes and steal no slot. Late items with less than `MIN_RAMP` left also complete silently.
  - Surviving items late by at most `LATE_GRACE` retain their original end. Synth envelopes
    resume at timeline position with the onset fade; samples advance offset and reduce remaining
    content at rates other than 1 as well as at rate 1.
  - Later PLAY notes and one-shot requests are absent, and their IDs are completed.
  - Late loops start at the advanced offset, with reduced remaining duration.
  - Future items retain their original timestamps.

  Separately, advance wall time with the context clock frozen, then resume. No items are
  skipped solely because of that suspension.
- **Single-pass mode:** tests with no timed actions or scheduler dependency may render in one
  pass without suspension.
- **Engine support:** if an engine lacks offline `suspend()`, its clock-driven tests are marked
  unsupported with a documented reason. Single-pass tests still run there.

### 10.2 Metrics and assertions

| Check | Assertion |
| --- | --- |
| Ceiling | Every output sample ≤ 1.0 in magnitude with limiter on; see stress cases below |
| Limiter quality | On the same renders, the share of samples above the clipper knee (0.9) stays below a target set in Phase 1 (starting point: 1%) |
| Click-free stop | Reference residual checks below pass for all supported waveforms |
| Onset | Onset reference checks below pass, including zero attack and late starts |
| Envelope timing | Measured stage boundaries within 1 ms of `envelopeValueAt` predictions |
| Pitch | Zero-crossing frequency within 0.5% of requested; sweep endpoints correct |
| Pan | L/R RMS ratio matches equal-power pan law within tolerance |
| Noise | White spectrum flat; pink slope ~-3 dB/octave within tolerance (seeded) |
| Sample timing | Offset, content `duration` at rates ≠ 1, loop wrap, and position after rate changes match the position model to the sample (decode mode) |
| Pause/resume | Resume position equals the saved position; remaining duration honored; from the resume call, audible output returns within `SCHEDULE_LEAD` + `MIN_RAMP` |
| Node bounds | A flood of delayed `sound()` calls never raises node-holding voices above `MAX_LIVE_VOICES`; the 1025th pending request throws `TOO_MANY_PENDING_SOUNDS` |
| Scheduler | On-time notes retain timestamps; stalls and suspension follow the late-start rule (Section 8.1) |
| Admission | Overlapping slot holders ≤ 64 at every instant; all node-holding voices ≤ 128; stop timing as below |
| Window fill | Hidden-tab dense-song renders never exceed `MAX_LIVE_VOICES − FILL_HEADROOM` from items beyond the base horizon, and never reject or drop due notes |
| Hard-cap order | Forced cleanup takes silent `retiring`, then `stopping`, then audible `retiring`, then unprotected `active` voices |
| Rate limits | Stream-mode rates outside 0.25–4 and decode-mode rates outside 0.0625–16 throw `INVALID_PLAYBACK_RATE` |
| Unstarted changes | `setAudio()` on `pending`, `scheduled`, and paused instances applies as specified in 7.3; late-loop offsets include rate changes made while pending |
| Loop protection | SFX floods preserve loops; protected-only capacity rejects new voices; stream replacement succeeds at full protected capacity |
| Completed IDs | Rejected and skipped IDs accept stop/pause/resume/set as no-ops; never-issued instance IDs throw `AUDIO_NOT_FOUND` |
| Bus controls | Volume and effects coexist; mute also silences effect tails |

Ceiling stress cases include a 64-voice chord, bass drop, SFX burst, and 64 simultaneous sample
instances. A separate 200-request flood exercises stealing and rejection under the shared
caps; it must assert the admitted source count, not assume 200 sources render together.
Loop-protection tests cover decode and stream modes, delayed loops holding slots from
admission, rejected resumes, explicit stops, and replacing a stream loop while protected loops
fill the budget. Occupancy tests show that a long sustained note is not stolen when the
counted holders end before the incoming voice starts. They also cover an immediate long voice
arriving while short voices are scheduled ahead, and a tentative multi-victim admission that is
rejected leaving every victim untouched. Admission tests cover immediate, sub-10 ms, and future
starts. Future steals
with sufficient lead end their fades at the conflict time; immediate and near starts allow
overlap while the victim completes a full fade. An explicit stop during a future-steal wait
advances that deadline and silences the voice within `SCHEDULE_LEAD + STOP_FADE`. Count
`retiring` voices in every hard-cap assertion, including repeated admissions and forced cleanup.
Scheduler tests also assert the lookahead node boundary and that `stopPlay()` leaves no sound
after its fade, including from previously `scheduled` voices.

Click checks compare against an expected waveform rather than require raw RMS to be monotonic:

- **Reference construction:** render a continuous carrier with the same source, phase, seed,
  start offset, and rate schedule in the same engine. Apply the expected envelope in Node using
  an independent test oracle, not the production envelope helper. For these focused checks,
  bypass the limiter and effects and use known constant bus/master gains. Limiter-on stress
  renders and manual listening remain separate checks.
- **Stop residual:** compare rendered samples with carrier × expected stop envelope. Measure
  maximum absolute residual and RMS residual, normalized by the fixture's nonzero reference
  peak; never divide by individual samples near zero. Check timing and final silence as well.
  Square, sawtooth, and noise fluctuations are part of the reference, so legitimate waveform
  transitions do not count as clicks. Steal fixtures compare the sum of victim and incoming
  references, including allowed overlap and revised deadlines.
- **Onset residual:** independently construct the expected rising envelope, including the
  3 ms floor for zero attack. For late starts multiply the original remaining envelope by the
  onset fade. Check residuals, onset timing, and zero output before onset; do not apply a
  falling-envelope assertion to an attack.
- **Calibration:** Phase 0 records numeric tolerances per metric and engine. Valid analytic
  fades must pass across several frequencies, phases, and noise seeds. Deliberately abrupt
  onsets and stops at nonzero carrier amplitude must fail; include the 100 Hz sawtooth case
  whose 1 ms RMS rises during a correct fade. Phase 1 uses these recorded thresholds.

### 10.3 Other coverage

- **Node unit tests:**
  - `envelope.js` math.
  - PLAY tokenizer and new commands.
  - Scheduler windowing, using the same virtual timers as the render harness.
  - The sample position model: segment sums, predicted end times, and pause bookkeeping.
  - Parameter validation and error codes.
  - The plugin service API.
- **Lifecycle tests:** the existing audio lifecycle tests are rewritten to cover the new loading
  model (a single wait, abort on remove, name reuse).
- **Stream-mode realtime test:** a browser test against a real `AudioContext`, served from the
  test server with a short generated WAV. It cannot analyze rendered samples, so it asserts
  observable state: `ready()` settles at `canplay`, `play`/`pause`/`ended` events fire in
  order, `element.currentTime` after `playAudio`, `pauseAudio`, `resumeAudio`, and a rate
  change is within a documented tolerance (starting point 50 ms), replacement fades the
  previous element, and out-of-range rates throw. The same test plays a decode-mode instance
  and checks its reported position after a rate change against the position model with the
  same tolerance, which is the only realtime check on the scheduling lead. It runs in
  Chromium and Firefox; Firefox is the engine with the 0.25–4 rate limit.
- **Type checks:** `pi.d.ts` is regenerated through metadata, and `npm run test:types` covers
  the new signatures.
- **Browser matrix:** Chromium, Firefox, and WebKit through Playwright. Today the repository
  runs only a Chromium project plus a separate Firefox smoke script, and WebKit is neither
  installed nor referenced. Phase 0 adds Firefox and WebKit projects for the audio browser
  tests and documents `npx playwright install firefox webkit` in `test/README.md`. Playwright's
  WebKit build is not Safari; iOS-specific behavior (D5, autoplay) is still checked on a
  device. Any engine-specific tolerance must be documented in the test.
- **Manual listening demos** in `test/demos/`:
  - `sound_lab_01.html`: interactive envelope, noise, pan, and sweep controls, with A/B
    comparison against a recorded 2.2 render.
  - `sound_samples_01.html`: loop, rate, pan, pause/resume, streaming.
  - `sound_play_01.html`: PLAY envelopes, noise percussion, instruments.
  - `sound_advanced_01.html`: synth, effects, presets, analyser visualizer.

## 11. Compatibility Summary (input to `UPGRADE-V2.3.md`)

- `sound()`: `attack`/`decay` removed; new envelope parameters and positional order.
  Frequency is no longer rounded. The default envelope and de-click floor change the sound
  slightly.
- `sound()` positional argument 7 changes meaning. A 2.2 call
  `$.sound( 440, 1, 1, "square", 0, 0.01, 0.5 )` gave a 0.5 s tail; in 2.3 that argument is
  `decayTime` and the tail becomes the 0.1 s default release. Write it as
  `$.sound( { "frequency": 440, "duration": 1, "oType": "square", "attackTime": 0.01,
  "releaseTime": 0.5 } )` or pass `releaseTime` positionally as argument 9.
- `loadAudio()`: `poolSize` removed; the third argument is now `stream` (boolean).
  `loadAudio()` holds one `ready()` wait.
- `playAudio()`: returns an instance ID. There is no per-file concurrency cap, only the global
  voice caps. `duration` is file content time, so it is unchanged at rate 1 and scales with
  `playbackRate`.
- Looping samples count toward the shared voice budget but are protected from automatic
  stealing. When no eligible voice can be replaced, new voices are rejected (Section 6.3).
  Rejected calls still return an ID, in the completed state; operations on it are no-ops.
- Replacing a stream instance reuses its voice slot, so it is never rejected for capacity.
- `stopAudio()`: accepts instance IDs and fades out.
- `playbackRate` is limited to 0.25–4 for streamed audio and 0.0625–16 for decoded audio.
  Values outside the range throw `INVALID_PLAYBACK_RATE`.
- Delayed `sound()` and `playAudio()` requests are limited to 1024 pending. Beyond that, the call
  throws `TOO_MANY_PENDING_SOUNDS`.
- With the limiter on, output is soft-clipped above 0.9. Mixes that previously clipped hard now
  saturate smoothly.
- New: `pauseAudio()`, `resumeAudio()`, `setAudio()`, `setSoundLimiter()`.
- Error codes renamed from pool terminology: `AUDIO_POOL_NOT_FOUND` → `AUDIO_NOT_FOUND`,
  `EMPTY_POOL` → `AUDIO_NOT_LOADED`, `INVALID_POOL_SIZE` removed, `INVALID_STREAM`,
  `INVALID_PLAYBACK_RATE`, and `TOO_MANY_PENDING_SOUNDS` added.
- `setVolume()` now affects a single master gain. It applies to samples and synth equally and
  is limited before output.
- PLAY: `MT` removed. `MA`/`MD` meanings change to ADSR stage times. `MH`, `MR`, `MP`, `WN`,
  `WP`, and `@n` are added.
- PLAY: `MS`, `MN`, and `ML` now shorten the sounding part of each note and leave the beat
  unchanged. Songs that used `MS` or `MN` play at their written tempo instead of faster, so
  they take longer than in 2.2.
- After a scheduler stall, unexpired items late by up to 25 ms start at their timeline position
  with an onset fade; items with insufficient remaining time complete silently. Later PLAY
  notes and delayed one-shots are skipped; surviving late loops advance to their timeline
  position. Future timestamps are preserved. Context suspension preserves song position.
- `stopSound()`, `stopPlay()`, and `stopAudio()` complete about 15 ms after the call instead of
  immediately (a short scheduling lead plus a 10 ms fade).
- `sound()` throws `INVALID_FREQUENCY` when a sweep has a non-positive endpoint.
- Audio requires HTTP(S). `file://` pages are unsupported.
- Plugin API: `provide()` and `getService()` are added.

## 12. Open Decisions

Each item has a recommendation and a phase by which it must be resolved.

| ID | Decision | Recommendation | Resolve by |
| --- | --- | --- | --- |
| D1 | What `frequency` does for `white`/`pink` noise | Core ignores `frequency`/`frequencyEnd` for white/pink noise (keeps spectra honest); pitched retro noise is `"periodic"` in `sound-advanced`. Prototype a `playbackRate` mapping in the sound lab before closing. | Phase 2 |
| D2 | `sound()` positional order, and what position 7 means | **Resolved (revision 6): ADSR order as written in 6.1.** Position 7 is `decayTime`. The alternative, placing `releaseTime` at position 7 so that 2.2 tails keep their length, was rejected because it would make the positional form permanently disagree with the object form and with every other ADSR description in the docs. 2.2 positional callers past argument 5 are rare, and the command layer cannot tell an old positional call from a new one, so no runtime warning is possible. The upgrade guide shows the positional example in Section 11. | Resolved |
| D3 | Requests while the context is locked | Drop one-shot `sound()`/`playAudio()` requests, returning completed IDs as in 6.3; defer looping instances and `play()` tracks until unlock, starting deferred stream instances inside the gesture listener (5.3) | Phase 1 |
| D4 | Whether the public `setBusVolume()` command moves to core | Ships in `sound-advanced` 1.0 (the service method is already core); promote if its promotion cost is small | Release gate |
| D5 | iOS mute switch silences Web Audio (media elements were not) | Set `navigator.audioSession.type = "playback"` where available; document the behavior | Phase 3 |
| D6 | Service API names | `provide`/`getService`; confirm conventions | Before task 0.3 |

## 13. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Breadth of breaking changes | Existing games need edits | Thorough upgrade guide; loud validation errors instead of silent reinterpretation where possible |
| Limiter changes loudness/character | Existing mixes sound different | Compressor keeps clipper engagement low (quality metric); off switch |
| Soft clipper distortion on heavy overload | Audible saturation in very dense mixes | Identity below the knee; knee-engagement metric on stress renders; documented as a safety net |
| Decoded-audio memory | Large files exhaust memory on mobile | Stream mode, documented costs |
| Background timer throttling | Missing PLAY notes | Lookahead and recovery rules in Section 8.1 |
| Voice pressure | New sounds rejected | Occupancy-interval slots; capacity-limited window fill; steal one-shots first; protect loops; stream replacement reuses its slot |
| iOS mute switch / audio session | Silent audio on iPhones | D5 mitigation, documentation |
| Engine differences (Firefox lacks `cancelAndHoldAtTime`, WebKit quirks) | Clicks or timing drift on one engine | Analytic envelope values; three-engine test matrix |
| Offline harness diverges from realtime behavior | Tests pass but audio clicks or drifts live | Scheduling lead for every immediate change (6.3); realtime stream-mode test with a decode-mode position check (10.3); manual listening demos at every phase gate |
| Offline harness state leaks into production paths | Unlock re-arm and D3 drop fire on every suspend step, hiding real behavior | Mandatory `state`/`statechange` masking with a Phase 0 probe (10.1) |
| Stream mode untestable offline | Regressions in stream loading, replacement, or rate limits go unnoticed | Realtime browser test in Chromium and Firefox (10.3); manual samples demo |
| Interim `play()` between Phase 1 and Phase 4 | Long songs hit the new live-voice cap because notes are still created up front | PLAY voices are exempt from `MAX_LIVE_VOICES` and slot admission until the Phase 4 scheduler lands (roadmap Phase 1) |
| Offline `suspend()` unsupported on an engine | Clock-driven tests cannot run there | Single-pass tests still run; the gap is documented per engine |
| Service interface churn | Advanced plugin breaks on core changes | Versioned service; ownership contracts and contract tests before freeze at Phase 5 |

## 14. Out of Scope for 2.3

- 3D/HRTF spatial audio.
- MIDI input or output.
- Recording or exporting audio.
- AudioWorklet-based synthesis or a true lookahead brickwall limiter.
- Tracker module formats.
- Microphone input.
- Per-screen audio routing.
- Global pause of synth sounds and `play()` (sample instances support pause).
