# CI/CD 2.3 Evidence

This folder holds measurements for the CI/CD and cross-platform exploration
([CI-V2.3-EXPLORATION.md](../../plans/CI-V2.3-EXPLORATION.md)).

- **Revision:** `48bb54f`, measured 2026-09-25.
- **Machine:** Windows 11, 16 logical CPUs, NVIDIA GeForce GTX 980, Node 22.19.0.
- **Browsers:** Playwright 1.56.0 with Chromium 141, Firefox 142, and WebKit 26.

The `linux-*` files come from step E1: Ubuntu 24.04.1 under WSL 2 on the same machine, with
Node 22.23.3, a fresh clone, and Playwright's system libraries. `runners.json` summarizes step
E2 on GitHub-hosted runners (run 36212469703, 2026-09-26). The workflow committed the raw
logs, probe output, and captures to the temporary `ci-exploration-results` branch. That branch
is deleted after review, so `runners.json` is the record.

## Files

| File | Contents |
| --- | --- |
| `probes.js` | The probe script. Run `node docs/evidence/ci-2.3/probes.js <probe>` from the repository root, with `renderer`, `pixels`, or `paths` |
| `windows-renderer.json` | WebGL renderer, browser version, and Web Audio availability for each engine, and for Chromium with and without ANGLE flags |
| `windows-pixels.json` | Exact per-capture differences between the latest `npm test` visual captures and the approved baselines |
| `windows-npm-test.json` | Stage counts and times from one `npm test` run |
| `linux-renderer.json` | The `renderer` probe on Linux |
| `linux-pixels.json` | The `pixels` probe on Linux, after `npm run test:visual` |
| `linux-npm-test.json` | Linux stage results: `npm test` up to its failing browser stage, then `test:types`, `test:visual` with and without `CI=1`, and `test:firefox`. It includes the grouped WebKit tolerance failures and the Linux and Windows capture comparison |
| `linux-webkit-audio.json` | Step E6: the WebKit audio render suites with borrowed Chromium and Firefox tolerances, and calibration ranges for WebKit, Chromium, and Firefox |
| `linux-renderer-flags.json` | Step E4 run locally: the full visual suite under eight Chromium flag sets, compared byte for byte with the default launch |
| `runners.json` | Step E2 on `ubuntu-24.04`, `windows-2025`, and `macos-15`: stage times and results, renderers, audio devices, failures by cause, pixel and capture comparisons, flag variants, the WebKit trials, realtime audio with a PulseAudio null sink, and size reports |
| `runners-e7.json` | Step E7: Firefox WebGL on the three runners under eight preference sets, with Mesa's EGL packages and Xvfb on Linux, and the Firefox check with the working set |
| `baseline-rerecord.json` | CI roadmap task 1.4: each baseline that changed when every baseline was re-recorded, with its pixel differences and cause, and the lite, run-to-run, and Linux checks |
| `paths.json` | Tracked files whose name case differs from the working tree, and file references whose case differs from the tracked name. It does not depend on the platform |

## Measurement notes

- `pixels` reads `test/test-results/<mode>/screenshots/`, so run `npm test` or
  `npm run test:visual` first. It uses the visual runner's per-pixel tolerance: a pixel
  counts as different when its RGB channel differences sum to more than 6.
- Run-to-run determinism was checked by copying the captures of one `npm run test:visual`,
  running it again, and comparing the files byte for byte. 69 of 70 were identical, and
  `keyboard_commands.png` differed in 142 channel values. The comparison used a scratch script
  and is not in the repository.
- `renderer` launches each engine headless with Playwright's defaults, as the tests do.
