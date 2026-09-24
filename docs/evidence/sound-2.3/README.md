# Sound 2.3 Evidence

Measurements recorded at sound roadmap phase exits
([SOUND-V2.3-ROADMAP.md](../../plans/SOUND-V2.3-ROADMAP.md)). Size reports come from
`npm run size`, which builds the minified IIFE bundles in memory with the release options and
compresses them with gzip level 9. Sizes are in bytes.

## Size reports

| File | Source tree | Notes |
| --- | --- | --- |
| `size-phase0-baseline-2.2.json` | 2.2 sound code after the 2.3 version stage (task 0.1) | Baseline; the `version` field reads 2.3.0 because the stage precedes it |
| `size-phase0-split.json` | After the plugin service API (0.4) and the sound module split (0.9) | No sound behavior change |
| `size-phase1.json` | Phase 1 exit: buses, limiter, envelope, voice caps, scheduler, unlock | `sound` 2.0.0 |
| `size-phase2.json` | Phase 2 exit: white and pink noise, pan level | `sound` 2.0.0 |
| `size-phase3.json` | Phase 3 exit: decoded and streamed samples, instances, shared caps | `sound` 2.0.0 |
| `size-phase4.json` | Phase 4 exit: PLAY scheduler, tokenizer, extensions, voice inserts | `sound` 2.0.0; M2 |
| `size-phase5.json` | Phase 5 exit: service v1 completed and frozen, `sound-advanced` plugin | `sound` 2.0.0, `sound-advanced` 1.0.0; M3 |
| `size-phase6.json` | Phase 6 exit: `setBusVolume()` promoted to core | `sound` 2.0.0, `sound-advanced` 1.0.0; M4 |
| `size-phase7.json` | Phase 7 exit: core output stage, recording in `sound-advanced` | `sound` 2.0.0, `sound-advanced` 1.0.0 |
| `size-phase8.json` | Phase 8 exit: bus effects, chains, and in-place updates in `sound-advanced` | `sound` 2.0.0, `sound-advanced` 1.0.0 |
| `size-phase9.json` | Phase 9, tasks 9.1, 9.2, and 9.4: core `observePlay`, `generateSfx()` in `sound-advanced` | `sound` 2.0.0, `sound-advanced` 1.0.0; task 9.3 not started |

Phase 0 deltas, gzipped:

| Bundle | Baseline | Phase 0 exit | Delta | Cause |
| --- | --- | --- | --- | --- |
| `sound` plugin | 6,283 | 6,391 | +108 | Module split |
| `pi.lite.min.js` | 48,275 | 48,586 | +311 | `provideService()` / `getService()` in core |
| `pi.min.js` | 62,928 | 63,321 | +393 | Both of the above; the split's share is about 82 |

The split stays within the Phase 0 limit of 0.3 KB gzipped. Lite does not include the sound
plugin, so its growth is the plugin service API alone.

Phase 1 deltas, gzipped:

| Bundle | Phase 0 exit | Phase 1 exit | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 6,391 | 10,349 | +3,958 | +4,066 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 63,321 | 67,361 | +4,040 | +4,433 |

Minified bytes by module in the `sound` bundle (esbuild metafile, Phase 0 → Phase 1):
`context.js` 248 → 3,438, `envelope.js` new 1,494, `scheduler.js` new 893, `voices.js`
3,312 → 6,824, `play.js` 7,871 → 8,311, `samples.js` 4,196 → 4,211, `index.js` 462 → 1,083.

Phase 1 exceeded the original plan 9.1 soft targets (8 KB for the core plugin, 3 KB of
full-build growth), so they were raised to 14 KB gzipped for the plugin and 8 KB gzipped of
full-build growth over the 2.2 baseline. Phase 1 uses 10,349 and 4,433 bytes of them. The
remaining headroom covers noise, decoded samples, and the PLAY scheduler in Phases 2–4; the
targets are checked at M2 (Phase 4 exit).

Phase 2 deltas, gzipped:

| Bundle | Phase 1 exit | Phase 2 exit | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 10,349 | 10,907 | +558 | +4,624 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 67,361 | 67,954 | +593 | +5,026 |

Minified bytes by module in the `sound` bundle (Phase 1 → Phase 2): `noise.js` new 997,
`voices.js` 6,824 → 7,104. The other modules have no source changes. Phase 2 uses 10,907 of the
14 KB plugin target and 5,026 of the 8 KB full-build growth target.

Phase 3 deltas, gzipped:

| Bundle | Phase 2 exit | Phase 3 exit | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 10,907 | 14,300 | +3,393 | +8,017 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 67,954 | 71,307 | +3,353 | +8,379 |

Minified bytes by module in the `sound` bundle (Phase 2 → Phase 3): `samples.js` 4,211 →
13,564, `voices.js` 7,104 → 7,593, `envelope.js` 1,494 → 1,593, `context.js` 3,438 → 3,489,
`index.js` 1,083 → 1,058. The sample engine replaces the `<audio>` pools with fetch and decode,
stream mode, instance records, the position model, pause and resume, `setAudio`, and the late
rule for samples, and its error messages are a large share of the minified text.

**Variance.** The plugin is 36 bytes under the 14 KB (14,336 bytes) target, and full-build
growth is 8,379 bytes, 187 bytes over the 8 KB (8,192 bytes) target, before the Phase 4 PLAY
scheduler. The targets are checked at M2 (Phase 4 exit), so Phase 4 either offsets its own
growth and this overrun, or records a variance for the release size review (roadmap 6.1).

Phase 4 deltas, gzipped:

| Bundle | Phase 3 exit | Phase 4 exit | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 14,300 | 14,108 | −192 | +7,825 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 71,307 | 71,160 | −147 | +8,232 |

Minified bytes by module in the `sound` bundle (Phase 3 → Phase 4): `play.js` 8,311 → 7,826,
`scheduler.js` 893 → 1,498, `voices.js` 7,593 → 7,726, `index.js` 1,058 → 1,083. The other
modules have no source changes. Replacing the two note-frequency tables with an
equal-temperament formula and the regex tokenizer with a longest-match table paid for the
scheduler streams, PLAY extensions, event snapshots, and voice inserts.

**M2 size check.** The core `sound` plugin is 14,108 bytes, 228 under the 14 KB (14,336 byte)
target. Full-build growth over the 2.2 baseline is 8,232 bytes, **40 bytes over** the 8 KB
(8,192 byte) target, down from 187 over at Phase 3. This variance is recorded for the release
size review (roadmap 6.1). The core API is complete, so later growth comes only from Phase 6
promotions, which that review decides.

Phase 5 deltas, gzipped:

| Bundle | Phase 4 exit | Phase 5 exit | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 14,108 | 15,284 | +1,176 | +9,001 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 71,160 | 72,331 | +1,171 | +9,403 |
| `sound-advanced` plugin | — | 6,002 | new | — |

Minified bytes by module in the `sound` bundle (Phase 4 → Phase 5): `voices.js` 7,726 → 10,582,
`context.js` 3,489 → 4,113, `index.js` 1,083 → 1,583, `play.js` 7,826 → 7,684. The other
modules have no source changes. The growth is the rest of the extension service, which plan
4.3 places in core: `createVoice` (with the `sound()` validation shared through one request
path), `registerSource` and registered-source voices, insert validation and `detune` links,
`setBusInsert`, and `tapBus`. Its contract checks and error messages are most of the
minified text; consolidating the shape checks saved 162 minified bytes and no gzip bytes.

**Size variance for the release review.** The core `sound` plugin is 15,284 bytes, **948 over**
the 14 KB (14,336 byte) target. Full-build growth over the 2.2 baseline is 9,403 bytes,
**1,211 over** the 8 KB (8,192 byte) target. The targets were set before the service's Phase 5
members were measured; roadmap 6.1 decides whether they are raised or code moves.

Minified bytes by module in the `sound-advanced` bundle: `synth.js` 6,560, `instruments.js`
2,609, `presets.js` 2,389, `effects.js` 2,053, `analyser.js` 1,208, `periodic-noise.js` 979,
`index.js` 464, `buses.js` 176.

Phase 5 differentials, gzipped (`size-phase5.json`). Marginal costs compare the all-modules
variant (5,481 bytes; the plugin bundle adds its index and banner for 6,002) with a variant
without the module. Promotion costs compare the `sound` plugin (15,284) with the plugin plus
the module in one bundle. Removing `synth` also removes presets and instruments, its
dependents; their own marginal costs keep `synth`, and their promotions include it.

| Module | Marginal | Promotion |
| --- | --- | --- |
| `synth` (group: `presets`, `instruments`) | 3,394 | 1,842 (alone) |
| `instruments` | 703 | 2,541 (with `synth`) |
| `presets` | 659 | 2,453 (with `synth`) |
| `effects` | 602 | 732 |
| `analyser` | 411 | 444 |
| `periodic-noise` | 358 | 411 |
| `buses` | 42 | 75 |

Full merge: `pi.min.js` with all of `sound-advanced` is 77,595 bytes, 5,264 over the current
`pi.min.js`, above the plan 9.1 guide of about 4 KB for merging the whole plugin. Per-bus
volume costs 75 bytes to promote.

## Phase 6 size review

The release size review (roadmap 6.1) decided where each `sound-advanced` module belongs from
the Phase 5 differentials above, and task 6.2 applied the result.

- **`buses` promoted (D4).** Per-bus volume is common in games (separate music and effects
  settings), only extends the existing volume concept, and its service method was already
  core. Its measured promotion cost was 75 bytes. The command now registers in the core plugin
  beside `setVolume()`, and `buses.js` is removed.
- **Other modules stay in `sound-advanced`.** Each adds an API concept that typical games do
  not need, and each would widen the core overrun: `periodic-noise` 411, `analyser` 444,
  `effects` 732, and `synth` 1,842 (2,453 with `presets`, 2,541 with `instruments`).
- **No full merge.** Merging all of `sound-advanced` into `pi.min.js` costs 5,198 bytes after
  the promotion, above the plan 9.1 guide of about 4 KB. The plugin stays a standalone bundle.

Phase 6 deltas, gzipped:

| Bundle | Phase 5 exit | Phase 6 exit | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 15,284 | 15,337 | +53 | +9,054 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 72,331 | 72,380 | +49 | +9,452 |
| `sound-advanced` plugin | 6,002 | 5,949 | −53 | — |

The promotion measured 53 bytes in the plugin, below the 75-byte estimate, because the core
handler calls the validating function directly instead of going through the service. The
minified `sound` bundle grew from 41,835 to 41,947 bytes, and `sound-advanced` shrank from
16,792 to 16,611.

**Size targets raised.** At Phase 5 the core plugin was 948 bytes over the 14 KB target, and
full-build growth was 1,211 bytes over the 8 KB target. The targets were set after Phase 1,
before the extension service's Phase 5 members (`createVoice`, registered sources, inserts,
`setBusInsert`, `tapBus`) were measured, and plan 4.3 places those members in core. Moving
them out would reopen the frozen service v1. The targets were therefore raised to the next
0.5 KB above the Phase 6 measurement: **15.5 KB (15,872 bytes)** for the core plugin, with 535
bytes of headroom, and **9.5 KB (9,728 bytes)** of full-build growth over the 2.2 baseline,
with 276 bytes of headroom. No variance remains.

## Phase 7: recording

Phase 7 of the expansion plan
([SOUND-ADVANCED-V2.3-PLAN.md](../../plans/SOUND-ADVANCED-V2.3-PLAN.md)) added the core output
stage behind `tapBus( "output" )` and the `recorder` module, with its `wav` and `worklet`
helpers, to `sound-advanced`.

Phase 7 deltas, gzipped:

| Bundle | Phase 6 exit | Phase 7 exit | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 15,337 | 15,390 | +53 | +9,107 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 72,380 | 72,435 | +55 | +9,507 |
| `sound-advanced` plugin | 5,949 | 7,783 | +1,834 | — |

- **Core output stage (task 7.1).** It costs 53 bytes in the `sound` plugin and 55 in
  `pi.min.js`, which covers the stage node, its routing, and `tapBus` accepting "output".
  The core plugin is 15,390 bytes, 482 under the 15,872-byte target. Full-build growth over
  the 2.2 baseline is 9,507 bytes, 221 under the 9,728-byte target.
- **Recorder.** Its marginal cost is 1,787 bytes, and 1,795 bytes to promote into core. That
  is about 250 bytes over the plan 8 estimate of 1.5 KB, which is a guide, not a limit. The
  processor is written as a function and published as its source text, so the minifier
  compacts it. As an inline template string it measured 1,912 bytes. The minified
  `sound-advanced` bundle grew from 16,611 to 21,295 bytes. The rest of the plugin growth is
  the analyser accepting "output".
- **Full merge.** Merging all of `sound-advanced` into `pi.min.js` now costs 7,002 bytes.

### Worklet processing without outputs (task 7.2)

The recorder `AudioWorkletNode` has no outputs and is reached only through a bus tap. The
checks below record whether each engine still runs its `process()`. Measured with
Playwright's builds on Windows:

| Engine | Offline (harness) | Realtime |
| --- | --- | --- |
| Chromium | Processed; a float recording equals the destination sample for sample | Processed; the captured length equals the context time elapsed |
| Firefox | Processed; a float recording equals the destination sample for sample | Processed; within 30 ms of the context time elapsed |
| WebKit | Not run: Playwright's Windows build has no Web Audio API | Not run |

No engine needed the fallback output through a zero-gain node.

Other findings:

- **Flush after the render.** A `"stop"` message posted after an offline render has finished
  is still handled by the processor. The flush runs in its message handler, not in
  `process()`, so recordings keep their last partial block.
- **Firefox message timing.** Firefox can deliver the processor's last messages, including
  `"full"`, a few tasks after `startRendering()` resolves. The tests wait for the state
  instead of reading it right after the render.
- **Test origin.** `AudioWorklet` needs a secure context, so the harness pages moved from
  `http://audio-test.local` to a routed `http://localhost` origin. The route still answers
  every request, so nothing reaches the network. The harness also swaps its proxy for the real
  context in the `AudioWorkletNode` constructor.

## Phase 8: bus effects

Phase 8 of the expansion plan made four changes in `sound-advanced`; core `sound` did not
change:

- The `effects` module was rewritten as stage builders with declared rampable options.
- The filter, distortion, bitcrush, and chorus effects were added.
- A bus insert can hold a chain of up to four effects, and a matching chain updates in place.
- The bitcrusher's processor joined the recorder in the shared `worklet` module.

Phase 8 deltas, gzipped:

| Bundle | Phase 7 exit | Phase 8 exit | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 15,390 | 15,390 | 0 | +9,107 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 72,435 | 72,435 | 0 | +9,507 |
| `sound-advanced` plugin | 7,783 | 9,736 | +1,953 | — |

- **Effects.** Its marginal cost rose from 595 to 2,286 bytes, and it costs 3,158 bytes to
  promote into core. The growth of 1,691 bytes is about 190 bytes over the plan 8 estimate of
  1.5 KB, which is a guide, not a limit. Most of it is error messages and the six option
  tables. The minified `sound-advanced` bundle grew from 21,295 to 26,835 bytes.
- **Shared worklet.** The recorder's marginal cost fell from 1,787 to 1,232 bytes. Removing
  the recorder no longer removes the worklet loader, which the bitcrusher also uses. The
  bitcrusher processor adds its source text to the same module, so one `addModule()` call
  loads both processors.
- **Full merge.** Merging all of `sound-advanced` into `pi.min.js` now costs 8,898 bytes.

### Effect measurements

Offline renders in `audio-effects-browser.test.js` check each effect against analytic
expectations:

- Renders that set their effect before the first action run in Chromium and Firefox.
- The in-place update renders use timed actions, which need offline `suspend()`, so they run
  in Chromium only.

| Check | Expectation | Result |
| --- | --- | --- |
| Lowpass and highpass filter, 1 kHz cutoff, q 1 | Level of a 2 kHz sine within 2% of the biquad magnitude response | Pass on both engines |
| Distortion, drive 0, 0.3, 0.8 | Third harmonic below 0.5% of the fundamental at drive 0, rising with drive | Pass on both engines |
| Bitcrush, bits 3, rate 4 | Every sample on a quarter step, all nine levels used, changes only every fourth frame | Pass on both engines. A realtime Chromium recording at 2 bits held only the five half steps |
| Chorus, rate 2 Hz, depth 10 ms | Pitch swing of a 440 Hz sine within 15% of 2π · rate · depth · frequency (55 Hz); left and right tracks correlated below −0.9 | Pass on both engines |
| Chain order | A lowpass after distortion attenuates the added harmonic by the filter response | Pass on both engines |
| In-place mix ramp | Residual against the carrier times a 20 ms linear ramp within the stop tolerances | Pass in Chromium |
| In-place chain update | The reverb tail continues and no new convolver is created. Changing reverb `time` rebuilds the chain and cuts the tail | Pass in Chromium |

## Phase 9: game features (tasks 9.1, 9.2, and 9.4)

Phase 9 so far made two changes. Task 9.3, music sync callbacks, waits for the input
conventions review, so these numbers do not include `sync.js`.

- Core `sound` gained the `observePlay` service member, and PLAY events record their track
  index (task 9.2).
- `sound-advanced` gained the `generator` module and `generateSfx()` (task 9.1).

Phase 9 deltas, gzipped:

| Bundle | Phase 8 exit | Phase 9 | Delta | Since 2.2 baseline |
| --- | --- | --- | --- | --- |
| `sound` plugin | 15,390 | 15,559 | +169 | +9,276 |
| `pi.lite.min.js` | 48,586 | 48,586 | 0 | +311 |
| `pi.min.js` | 72,435 | 72,606 | +171 | +9,678 |
| `sound-advanced` plugin | 9,736 | 11,163 | +1,427 | — |

- **`observePlay` (task 9.2).** It costs 169 bytes in the `sound` plugin and 171 in
  `pi.min.js`, including the `track` field on PLAY events and the listener check. The core
  plugin is 15,559 bytes, 313 under the 15,872-byte target. Full-build growth over the 2.2
  baseline is 9,678 bytes, 50 under the 9,728-byte target, which leaves little room for the
  `getAudioBuffer` member of task 10.1.
- **Generator (task 9.1).** Its marginal cost is 1,356 bytes, within the plan 8 estimate of
  1.5 KB for Phase 9, which also covered `sync.js`. Most of it is the nine category tables.
  It imports `presets.js`, so the report groups it with its helpers: removing `presets` now
  removes the generator too (2,010 bytes), and removing `synth` removes presets, the
  generator, and instruments (4,664 bytes). Promoting the generator into core, with `synth`
  and `presets`, costs 3,855 bytes.
- **Full merge.** Merging all of `sound-advanced` into `pi.min.js` now costs 10,343 bytes.

## Sample measurements (Phase 3)

Decoded instances are compared with the fixture content at the modeled position times the
expected fades (`audio-samples-browser.test.js`). Normalized maximum residual on 16-bit chirp
fixtures, where a one-frame position error measures 1.3e-2:

| Case | Chromium | Firefox |
| --- | --- | --- |
| Rate 1: offset, default duration, stereo, pan | 3.1e-5 | 3.1e-5 |
| Rates 0.5, 1.5 (loop), and 2 | 3.1e-5 | ≤ 1.9e-3 |
| Rate changes, pause and resume, setAudio before start | 3.1e-5 | Clock-driven; skipped |

3.1e-5 is half a 16-bit step. Chromium interpolates linearly between samples, as the reference
does, so its position matches the model to the sample at every rate. Firefox resamples at
rates other than 1; its residual there reflects filtering, not position.

Mono buffers apply the pan level factor (plan 5); stereo buffers do not, because a
`StereoPannerNode` passes stereo input through unchanged at center. Both were within the
position tolerance at their expected levels.

Limiter stress with 64 looping stereo sample instances at full volume: every sample within
±1.0; share above the knee 0.34% in Chromium and 31.6% in Firefox (clipper only).

Realtime stream mode (`audio-stream-browser.test.js`), elapsed-time estimate versus
`element.currentTime`: Chromium within 38 ms after play, resume, rate change, and
replacement; Firefox up to 89 ms, from media start latency after a seek. A decoded instance's
rendered position after a rate change, read through an analyser, was within 0.001 s of content
of the model in Chromium and 0.011 s in Firefox.

## Noise and pan measurements (Phase 2)

Octave-band power-density slopes from 125 Hz to 8 kHz (`spectrumSlope()` in
`test/unit/audio-metrics.js`), on seeded 1.75 s `sound()` renders at 48 kHz:

| Type | Target | Chromium | Firefox | Largest band deviation from the fit |
| --- | --- | --- | --- | --- |
| White | 0 dB/octave | −0.002 | −0.002 | 0.18 dB |
| Pink | −3 dB/octave | −2.967 | −2.967 | 0.20 dB |

Both engines render the buffers identically, because the plugin generates them and plays them at
rate 1. On the generated buffers alone (Node, `sound-noise.test.js`), white measures −0.035 and
pink −3.014 dB/octave.

Pan: a raw `StereoPannerNode` puts a mono voice 3 dB lower on each channel at center than an
unpanned voice, which bypasses the panner. Phase 2 scales a panned voice's peak by
`1 / max( cos θ, sin θ )`. In both engines the louder channel is within 0.5% of the unpanned
level at every tested pan, and the channel ratio is within 0.1 dB of `tan θ`.

## Limiter findings (Phase 1)

Measured with one-off tuning renders through the sound plugin (the stress cases in
`test/unit/audio-bus-browser.test.js` are a subset) and renders of a bare `DynamicsCompressorNode`:

- **Firefox compressor.** Gecko's compressor reacts to high-frequency content, likely because its
  Blink-derived detector pre-emphasizes the signal (not verified in the Gecko source).
  With the plan's starting settings it cut a single square or sawtooth at 0.75 by 13.9 dB
  (Chromium: 3.7 dB) and still cut a square at 0.25 by 5.7 dB, far below the threshold. Sine
  and triangle behave like Chromium. The sound plugin therefore probes the compressor once at
  initialization (a 1 s offline render of a square 6 dB below the threshold) and uses the soft
  clipper alone on engines that cut it by more than 1 dB. Chromium passes the probe; Firefox
  does not.
- **Makeup gain.** The specification's automatic makeup gain, ( 1 / fullRangeGain ) ^ 0.6,
  would raise every level below the threshold (5.7 dB at a −10 dB threshold). A fixed trim after
  the compressor removes it, so levels below the threshold pass unchanged and match the
  clipper-only path and the limiter-off path.
- **Startup.** Chromium's and Firefox's compressors start at full gain reduction and recover
  at the release rate, which attenuated the first ~0.3 s after context creation. The live
  compressor uses a 1 ms release until context time 0.05 s, then the tuned release.
- **Latency.** Chromium's compressor delays its output by about 6 ms (lookahead). Timing
  tests bypass the limiter.

Final settings: threshold −4 dB, knee 0, ratio 20, attack 1 ms, release 0.2 s, plus the makeup
trim and a soft clipper with its knee at 0.9. Share of samples above the knee on the stress
renders (target below 1%):

| Stress render | Chromium (compressor + clipper) | Firefox (clipper only) |
| --- | --- | --- |
| 64-voice chord at full volume, mixed waveforms | 0.155% | 59.7% |
| 64 sines at volume 0.5 | 0 | 7.8% |
| Bass drop, 6 sawtooth sweeps | 0 | 10.3% |
| SFX burst, 120 square blips 10 ms apart | 0 | 5.4% |

Every render stays within ±1.0 on both engines. A single full-level square loses 1.2 dB in
Chromium and nothing in Firefox; a square at volume 0.3 is unchanged on both.

Candidate settings measured in Chromium with the trim in place (peak knee share, single
full-level square peak): −3 dB / 1 ms / 0.1 s: 1.86%, 0.719; −4 dB / 1 ms / 0.1 s: 0.66%,
0.651; −4 dB / 1 ms / 0.2 s: 0.155%, 0.647; −5 dB / 1 ms / 0.1 s: 0.09%, 0.586; −10 dB /
1 ms / 0.25 s: 0, 0.339.

## Audio test calibration

Reference-residual tolerances are recorded in `test/unit/audio-tolerances.js`, with the
observed maxima for valid fades and minima for abrupt fixtures beside each value. Summary of
the Phase 0 calibration (normalized maximum residual):

| Check | Chromium valid | Firefox valid | Abrupt, both engines |
| --- | --- | --- | --- |
| Stop (10 ms linear and exponential) | ≤ 2.8e-7 | ≤ 7.6e-3 | ≥ 0.88 |
| Onset (3 ms linear) | ≤ 3.4e-7 | ≤ 3.2e-3 | ≥ 0.85 |

Engine support observed with Playwright 1.56 on Windows:

| Engine | Offline render | Offline `suspend()` | Notes |
| --- | --- | --- | --- |
| Chromium 141 | Yes | Yes | Multi-voice mixes differ across page loads by up to 4.8e-7 (input mix order) |
| Firefox 142 | Yes | No | Clock-driven tests skip; renders are bit-identical |
| WebKit 26 | No | No | No Web Audio API in the Windows build |
