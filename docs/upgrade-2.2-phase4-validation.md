# Phase 4 line performance investigation and qualification

**Current status:** P1, P3, and original helper-based P2 are integrated.

**Evidence location:** the campaign is archived outside the repository. Consult the
[evidence index and restore instructions](evidence/performance/README.md) before using the
reproduction commands below. Archived manifests and historical decisions are unchanged.

**Original P2 is integrated.** The single qualification campaign measured 17.0% lower median line
submission time, with a 95% change interval of -23.2 to -11.9% and candidate MAD of 8.2%.
Integration was initially deferred under a strict 5% MAD gate. The revised acceptance policy treats
5% as a soft diagnostic target and accepts this measured benefit with its disclosed variability.
The production renderer and regression tests now include the original helper-based P2 patch;
the direct-write variant remains experimental.

Phase 4 compares unchanged P2 with the production bounded writer, tests warm-up sensitivity,
profiles execution and allocation separately, and evaluates a direct-write variant independently.
The selected qualification candidate is **original P2 with 16 warm-up frames**. Longer warm-up and
the direct-write variant did not satisfy their predeclared selection rules.

## Reproducibility and protocol

The archived campaign originally lived under
[`test/performance/campaigns/phase4-20260916/`](evidence/performance/README.md).
Its archive contains fresh baseline/P2 source snapshots, a fixed polygon plugin,
the original and experimental candidates, test logs, diagnostic runs and profiles, executable
hashes, source inventories, analysis, and the independently frozen qualification selection.

The independently applicable [selected P2 patch](patches/upgrade-2.2-phase4-p2.patch) retains SHA-256
`20d9f871943d79b09703980bf2ee7e99fc32518d949712ab43735f0065426666`, identical to the original
Phase 3 patch. The [unselected direct-write patch](patches/upgrade-2.2-phase4-p2-direct.patch)
has SHA-256 `0f9a533e5fefab655f277333679a3db9c4856e07bc65354447672f3a04ac9cee`.
Both patches include the renderer and three regression-test files. Hunk contexts and candidate
reproduction were verified; source inventories, all diagnostic executable/evidence hashes, and
qualification results were checked. Raw results were used to recompute the saved summaries.

Reproduce an independent qualification against the retained snapshots using a fresh output path:

```powershell
$phaseRoot = "test/performance/campaigns/phase4-20260916"
node test/performance/benchmark/run.js `
  "--source=baseline=$phaseRoot/sources/baseline" "--source=p2=$phaseRoot/sources/p2" `
  "--plugin-source=$phaseRoot/plugin" --warmup-frames=16 "--out=$phaseRoot/independent-run"
```

The saved `measurement-tooling/` directory retains the exact benchmark and generator source used.

The maintained CLI accepts `--warmup-frames=16|120`, defaulting to 16. Both settings retain
32 measured frames and the representative generator. The 120-frame setting performs 104
preliminary frames, drains rendering, reinitializes the generator, then performs the canonical
16-frame warm-up. Renderer resources remain warm. This preserves the measured random sequence
and mutable image/sprite motion; it also means the diagnostic includes generator reinitialization,
not simply a longer uninterrupted generator stream. Campaign identity and resume validation include
the warm-up setting and workload protocol. Existing campaigns require their original tooling.

All fourteen measured operation sequences were compared exactly between settings in browser tests.
The synchronous queue and scheduled-rendering microtask remain within their original timing
boundaries. Initialization, input precomputation, status rendering, and readbacks remain outside.

The separate diagnostic runner executes seven rounds per source and setting, alternating source
order and reversing setting order each round. Each run starts a fresh browser context. Four passes
use representative inputs, execution profiling, allocation sampling, and precomputed inputs,
respectively. The precomputed workload preserves line coordinates and colors while removing
generator work from timing; its dispatch/allocation pattern is different and it cannot qualify P2.
Execution and allocation passes instrument only isolated bundles, with fail-closed matching of
buffer-resize and reservation-forced-flush sites. Profiles and counters are retained for every run,
including the identified fastest and slowest runs. Instrumented results cannot qualify a candidate.

## Diagnosis

The unchanged-P2 representative diagnostic completed seven rounds for each warm-up setting:

| Warm-up | P2 line change | 95% change interval | Baseline / P2 MAD |
| --- | --- | --- | --- |
| 16 frames | -25.0% | -29.3 to -18.6% | 2.3 / 4.5% |
| 120 frames | -15.4% | -28.3 to -8.1% | 3.3 / 7.8% |

The longer setting failed the stability selection rule. These diagnostic observations are separate
from qualification and do not establish that startup compilation caused the Phase 3 variability.

In execution profiles, `addVertexToBatch` was the largest named JavaScript self-time contributor
in both fast and slow runs. For the 16-frame P2 extremes, median queue time rose from 3.0 to
4.55 ms, while sampled helper self-time rose from approximately 71.7 to 88.1 ms across the measured
interval. CPU sampling and tracing perturb execution; these totals are diagnostic observations,
not independent speedup estimates.

The profiled line runs resized buffers during warm-up, with no measured-phase resize or
reservation-forced-flush events. For the same P2 extremes, three measured minor GCs totaled
approximately 0.86 and 0.77 ms, respectively. Optimization activity appeared in both fast and slow
runs. These observations do not support assigning the difference solely to buffer growth, GC,
or compilation. Allocation profiles sample the entire run, including startup and warm-up; their
retained sampled-byte totals must not be interpreted as exact measured-frame allocation counts.

Precomputed-input diagnostics retained a P2 benefit: -22.1% at 16 frames and -16.7% at 120 frames.
P2 MAD was 4.5% and 4.3%, respectively. Removing generator work did not eliminate run variation
or consistently lower submission medians. Parameter generation and allocation are measurable
costs, but these experiments do not establish them as the sole source of variability.

### Independent direct-write variant

The profiles justified a separate experiment caching reserved vertex/color arrays, strides, offsets,
view origin, and color components. References are captured after successful reservation, because
reservation can resize storage. The variant writes directly inside Bresenham's loop and publishes
the final count after emission. Oversized lines retain the bounded writer and context-loss behavior.

The variant passed all 469 regression tests. Its independent seven-round comparison against
original P2 produced:

| Warm-up | Direct-write change vs P2 | 95% change interval | P2 / direct MAD |
| --- | --- | --- | --- |
| 16 frames | -12.0% | -18.4 to +7.8% | 4.0 / 6.1% |
| 120 frames | +2.7% | -15.0 to +13.9% | 5.4 / 7.9% |

The variant failed selection. It remains a separate experimental patch; the selected candidate
retains the original P2 helper-based emission loop. No additional variant campaign was run to seek
a passing result.

## Correctness and measurement reliability

| Validation | Result |
| --- | --- |
| Maintained benchmark protocol/browser/diagnostic tests | 17 passed |
| Original P2 complete patch regression suite | 469 passed |
| Direct-write reservation unit tests | 35 passed |
| Direct-write complete patch regression suite | 469 passed |
| Original P2 isolated full/lite IIFE/ESM, minified/unminified and plugin builds | Passed |
| Original P2 full / lite / plugin visual suites | 36 / 22 / 9 passed |
| Visible hardware smoke, both sources, fourteen workloads, 120-frame warm-up | Completed |

Original P2 regression coverage includes all octants, reversed and zero-length lines, exact endpoint
and color emission, alpha, translated/clipped views, batch capacity/growth/overflow, oversized lines,
forced flushes, and full/lite WebGL context restoration. Approved screenshot baselines are preserved.

Initial browser tests encountered a sandbox process-launch restriction and passed with access to
launch local Chromium. The initial isolated correctness run lacked the shader helper and demo
fixtures; the five affected regression failures and full/lite visual failures are retained in their
initial logs. After completing the fixture snapshots, all correctness suites passed. These setup
failures are separate from performance measurements. The PATH `npm` shim was unavailable, so the
same scripts were invoked through the installed Node/npm CLI paths.

## Qualification and integration decision

The selection, protocol, source and executable hashes were frozen in `selection.json` before
qualification. The campaign uses all fourteen representative workloads, 16 warm-up and 32 measured
frames, alternating source order, and seven rounds with the existing capped extension to fourteen.
All correctness jobs finished before measurement. Diagnostic and historical results are excluded.

The original acceptance gates required at least 10% lower median line submission time, a 95%
whole-run bootstrap interval below no change, MAD at most 5% for both line groups, passing
correctness, and no established regression above 5% elsewhere under the same interval/stability
rules. A failed qualification under those original gates retained the separate P2 patch without
integration.

The campaign completed fourteen rounds per source, 28 complete timing runs. It extended once
under the existing variability rule. One interruption occurred before timing in baseline round 3:
`img_5` / `dog_image.png` failed with `net::ERR_CONNECTION_FAILED`. The same campaign was explicitly
resumed after validating identical inputs and environment; its first four completed runs and the
interruption record were preserved. No qualification campaign was restarted or repeated to seek
a pass. Image-loading startup reliability remains unresolved.

Environment: visible Chromium 141.0.7390.37, Windows 10.0.26200, Intel i5-13400F, NVIDIA RTX 4060
through ANGLE/Direct3D 11, Balanced power plan. Measurements describe CPU submission including
forced flushes, not GPU completion or application FPS. Intervals use 5,000 whole-run bootstrap
resamples; negative changes mean lower submission time.

| Workload | Baseline ms | P2 ms | Change | 95% change interval | Baseline / P2 MAD |
| --- | --- | --- | --- | --- | --- |
| Line | 4.400 | 3.650 | -17.0% | -23.2 to -11.9% | 2.8 / 8.2% |
| Filled rectangle | 3.100 | 3.200 | +3.2% | -3.1 to +10.1% | 4.8 / 3.9% |
| Filled circle | 4.875 | 4.825 | -1.0% | -2.0 to +1.6% | 1.0 / 1.6% |
| Filled ellipse | 6.325 | 6.300 | -0.4% | -1.6 to +1.6% | 1.2 / 0.0% |
| Mixed | 4.500 | 4.400 | -2.2% | -3.9 to +1.1% | 2.2 / 2.3% |
| Polygon | 6.500 | 6.075 | -6.5% | -12.6 to +11.9% | 7.7 / 8.6% |
| Filled polygon | 12.200 | 11.625 | -4.7% | -5.5 to -2.7% | 1.0 / 1.1% |
| Images | 3.900 | 3.900 | 0.0% | -1.3 to +2.6% | 1.9 / 1.3% |
| Sprites | 5.000 | 5.000 | 0.0% | -2.4 to +3.0% | 2.0 / 2.0% |
| Text | 6.625 | 6.800 | +2.6% | -5.6 to +12.6% | 7.2 / 5.5% |
| Short lines | 6.275 | 6.275 | 0.0% | -8.0 to +4.8% | 4.0 / 6.0% |
| Batch boundary | 9.700 | 7.875 | -18.8% | -20.6 to -15.7% | 1.8 / 2.5% |
| Nested view | 6.175 | 6.000 | -2.8% | -13.5 to +13.0% | 11.3 / 6.2% |
| Shared screen | 19.350 | 19.150 | -1.0% | -2.9 to +1.8% | 1.7 / 1.2% |

Line benefit and interval gates passed; candidate stability failed the original strict gate.
No regression above 5% was established elsewhere by the required interval and stability checks.
The stable batch-boundary benefit did not override the failed line gate in the original decision.
At that point both P2 variants remained separate patches and neither was enabled in production.

The [complete qualification summary](evidence/performance/README.md),
[diagnostic analysis](evidence/performance/README.md), and
[verification record](evidence/performance/README.md) retain the
unrounded results. The five diagnostic experiments completed 140 runs without interruption;
execution/allocation evidence comprises 140 profile/counter files. Phase 4 narrows the investigation
but does not establish a single cause or a stable line optimization. Broader GPU/backend/browser/
application qualification remains Phase 6 work.

## Integration under the revised variability policy

The maintainer accepted original P2 with 5% MAD as a soft target. The existing qualification meets
the retained 10% median line-improvement target and confidence-interval requirement. Its 8.2% MAD
remains above target; integration does not relabel the campaign as stable or resolve the cause.
Correctness remains mandatory, and regressions elsewhere remain subject to review even when their
variability exceeds the target. No new timing campaign is needed for this unchanged candidate.

The selected patch is applied to the production renderer and all three regression-test files.
The direct-write variant is not applied. Benchmark statistics, `stable` flags, the seven-to-fourteen
round protocol, original campaign artifacts, and approved screenshot baselines are preserved.

### Fresh integration validation — 2026-09-16

These checks validate the integrated working tree separately from the historical campaign:

| Check | Result |
| --- | --- |
| `npm run test:patch` | 469 passed |
| `npm run test:benchmark` | 17 passed |
| Standard `scripts/build.js` in an isolated current-source copy | Passed |
| Full / lite / plugin visual suites against that build | 36 / 22 / 9 passed |
| Renderer and three regression-test files versus selected P2 snapshot | All SHA-256 hashes match |
| Reverse patch applicability and `git diff --check` | Passed |
| Approved baselines and tracked generated artifacts | Unchanged |

The integrated renderer SHA-256 is
`b239f1e7affbd4d41b15a9f8744aca1ea1c5811bc7c99381b917dba209d75abe`.
The standard build includes full/lite IIFE/ESM, minified/unminified bundles, plugin bundles, and
metadata/type validation. Its release-copy step runs only inside the ignored source copy.
No new performance campaign was run; the qualification table above remains the performance evidence.

Fresh build and visual logs, the isolated source/build, and the visual runner are archived from
[`p2-integration-20260916/`](evidence/performance/README.md).
The regression and benchmark logs are
[`p2-integration-patch-complete.log`](../test/performance/campaigns/p2-integration-patch-complete.log)
and [`p2-integration-benchmark.log`](../test/performance/campaigns/p2-integration-benchmark.log).
The npm scripts were invoked through the installed Node/npm CLI path.

The first regression attempt was blocked by Chromium launch permissions (`spawn EPERM`); its log
is retained as `p2-integration-patch.log`. The suite passed after allowing local browser launch.
An initial visual attempt also discovered archived campaign fixtures and was interrupted; its log
is retained as `visual-discovery-interrupted.log`. Restricting discovery to `test/scripts` produced
the complete 67-test result above. Neither setup issue changed the renderer or approved baselines.
