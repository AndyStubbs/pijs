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

Phase 0 deltas, gzipped:

| Bundle | Baseline | Phase 0 exit | Delta | Cause |
| --- | --- | --- | --- | --- |
| `sound` plugin | 6,283 | 6,391 | +108 | Module split |
| `pi.lite.min.js` | 48,275 | 48,586 | +311 | `provideService()` / `getService()` in core |
| `pi.min.js` | 62,928 | 63,321 | +393 | Both of the above; the split's share is about 82 |

The split stays within the Phase 0 limit of 0.3 KB gzipped. Lite does not include the sound
plugin, so its growth is the plugin service API alone.

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
