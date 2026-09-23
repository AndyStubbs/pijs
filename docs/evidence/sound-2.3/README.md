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
