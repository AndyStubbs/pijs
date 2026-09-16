# Phase 3 line reservation validation

**Current status:** original helper-based P2 is integrated, as recorded in Phase 4.
The decisions below describe the original Phase 3 qualification.

**Evidence location:** the campaign is archived outside the repository. Consult the
[evidence index and restore instructions](evidence/performance/README.md) before using the
reproduction commands below. Archived manifests and historical decisions are unchanged.

At the original Phase 3 decision, P2 was correctness-tested as a separate candidate,
but **integration was deferred**.
The fresh campaign measured 13.7% lower median line submission time, with a 95% reduction interval
of 4.8–29.1%. Candidate line variability was 11.0%, exceeding the required 5% maximum. The stability
gate therefore failed despite meeting the 10% median benefit target and excluding no change.

Production renderer code and tests remained unchanged at that stage. The independently applicable
[P2 patch](patches/upgrade-2.2-phase3-p2.patch) contains the renderer change and its regression tests.
The patch was retained for the subsequent Phase 4 qualification.

## Candidate and reproducibility

The baseline snapshots the current source tree including the integrated Phase 2 P1/P3 changes.
P2 changes only the line renderer in that production source: ordinary Bresenham lines reserve
`max(dx, dy) + 1` points once, return if reservation detects context loss, then emit through the
existing vertex helper. Lines exceeding the batch maximum retain the original bounded writer.
Public APIs, types, validation, views, clipping, alpha representation, and batch limits are unchanged.

The archived campaign originally lived under
[`test/performance/campaigns/phase3-20260916/`](evidence/performance/README.md),
an ignored output directory. Its archive contains baseline/P2 source snapshots, the fixed polygon-plugin
source, the patch, source inventories, test logs, build/visual validation helpers, and the campaign.
Only the renderer and three regression-test files differ in the inventoried candidate inputs.

The patch SHA-256 is
`20d9f871943d79b09703980bf2ee7e99fc32518d949712ab43735f0065426666`.
Its hunks were applied in memory against the baseline and verified to reproduce the candidate files.
Source inventories and executable/run hashes were checked, and the summary was recomputed from
all raw runs. Production source/test bytes and approved PNGs were checked against the baseline.

To reproduce against the retained snapshots, use a fresh output directory:

```powershell
$phaseRoot = "test/performance/campaigns/phase3-20260916"
node test/performance/benchmark/run.js `
    "--source=baseline=$phaseRoot/sources/baseline" `
    "--source=p2=$phaseRoot/sources/p2" `
    "--plugin-source=$phaseRoot/plugin" `
    "--out=$phaseRoot/repeat-p2"
```

This validation used exactly one fresh campaign, independent of the historical prototype results.
It was not repeated to seek a passing result. Historical scores and investigation data were not
pooled into its measurements.

## Correctness

| Validation | Result |
| --- | --- |
| Candidate batch reservation unit tests | 35 passed |
| Candidate batch and context-recovery browser tests, full/lite | 70 passed |
| Candidate `npm run test:patch` | 469 passed |
| Maintained `npm run test:benchmark` | 11 passed |
| Isolated full/lite IIFE/ESM, unminified/minified and plugin builds | Passed |
| Core full visual suite | 36 passed |
| Core lite visual suite | 22 passed |
| Plugin visual suite | 9 passed |

The new unit tests compare exact positions, colors, and order for zero-length, horizontal, vertical,
diagonal, shallow, steep, and reversed lines across all octants. They exercise default/translated
origins, alpha 0/128/255, partial occupancy, exact capacity, growth, exact maximum, accumulated
overflow, and oversized emission across multiple flushes. They assert one reservation for ordinary
lines, bounded reservations for oversized lines, and unchanged queued data after context loss.

Browser coverage compares reserved and chunked lines with individual reference pixels in default,
translated, and nested clipped views, interleaved with rectangles and translucent textures. Real
WebGL context-loss/restoration tests cover both reserved and oversized lines in full and lite builds.

The visual suites used the standard runner with four workers against isolated candidate bundles,
served on a separate loopback port because port 8080 was already occupied. All approved baselines
were preserved. Build helpers generated test artifacts without publishing release snapshots or
rewriting production metadata. The initial sandboxed Chromium launch failed; the browser tests
passed outside the sandbox. This launch failure is retained separately from correctness results.

## Performance qualification

The campaign completed fourteen rounds per source, 28 complete runs, with no interruptions.
It used all fourteen maintained workloads, deterministic fixed work, 16 warm-up frames,
32 measured frames, and alternating baseline/candidate order. The protocol automatically extended
the campaign from seven to fourteen rounds because workload variability exceeded 5%.
Correctness jobs finished before measurement began.

Environment: visible Chromium 141.0.7390.37 on Windows 10.0.26200, Intel i5-13400F, NVIDIA RTX 4060
through ANGLE/Direct3D 11, Balanced power plan. Measurements describe CPU submission time,
including forced flushes, rather than GPU completion time or application FPS.

Negative changes below mean lower submission time. Intervals use 5,000 whole-run bootstrap
resamples. MAD is run-level median absolute deviation; both sources must be at or below 5%.

| Workload | Baseline ms | P2 ms | Change | 95% change interval | Baseline / P2 MAD |
| --- | --- | --- | --- | --- | --- |
| Line | 4.750 | 4.100 | -13.7% | -29.1 to -4.8% | 3.7 / 11.0% |
| Filled rectangle | 2.725 | 3.175 | +16.5% | -10.6 to +41.8% | 20.2 / 5.5% |
| Filled circle | 4.900 | 4.900 | 0.0% | -1.0 to +2.0% | 0.0 / 1.0% |
| Filled ellipse | 6.500 | 6.500 | 0.0% | -0.8 to 0.0% | 0.0 / 0.0% |
| Mixed | 4.500 | 4.400 | -2.2% | -3.3 to +1.1% | 2.2 / 1.7% |
| Polygon | 3.500 | 2.975 | -15.0% | -26.8 to -0.8% | 7.1 / 12.6% |
| Filled polygon | 5.900 | 5.600 | -5.1% | -6.8 to -3.4% | 1.7 / 0.4% |
| Images | 2.300 | 2.225 | -3.3% | -4.3 to +4.5% | 4.3 / 1.1% |
| Sprites | 2.800 | 2.900 | +3.6% | -0.9 to +4.5% | 3.6 / 0.9% |
| Text | 3.275 | 3.175 | -3.1% | -9.0 to +10.2% | 3.8 / 7.9% |
| Short lines | 2.975 | 2.450 | -17.6% | -25.4 to +5.7% | 8.4 / 21.4% |
| Batch boundary | 4.850 | 3.925 | -19.1% | -23.5 to -17.1% | 1.0 / 3.2% |
| Nested view | 3.100 | 2.775 | -10.5% | -21.8 to +3.6% | 9.7 / 10.8% |
| Shared screen | 6.350 | 6.300 | -0.8% | -3.8 to +4.8% | 2.0 / 1.6% |

The line comparison passed the benefit and interval gates but failed stability. No regression above
5% satisfied both the interval and stability requirements elsewhere. The filled-rectangle median
was 16.5% slower, but its interval included no change and both sources were unstable; this does not
establish a regression or rule one out. Benefits in other workloads do not override the line gate.

The [complete summary](evidence/performance/README.md) and
[verification record](evidence/performance/README.md) retain the
unrounded results and the failed integration decision. P2 remains a candidate requiring independent
stable qualification through
[Phase 4](upgrade-2.2-performance-action-plan.md#phase-4--stabilize-line-performance-while-preserving-the-gain).
Additional GPUs/backends, browser engines, applications, and broader release qualification remain
[Phase 6 work](upgrade-2.2-performance-action-plan.md#phase-6--qualify-and-release).
