# Pi.js 2.0.3–2.2.0 performance investigation and improvement plan

Investigation target: `v2.0.3` → `v2.1.0` → `cff1b9a` (2.2.0).
This is a dedicated upgrade investigation, including historical comparisons and experimental
alternatives. Production library code and approved visual baselines are not changed.

## 1. Executive assessment

<!-- EXECUTIVE_RESULTS -->
**The fixed-work measurements reproduce both regressions, with different dominant costs.**

- **2.1.0:** filled-circle submission time rises +21.2%
  and short-line time rises +23.6% versus 2.0.3.
  View-origin work is a tested contributor; not every workload regresses equally.
- **2.2.0:** image, sprite, and text submission time rises +53.0%,
  +61.3%, and +111.0% versus 2.1.0.
  Repeated state preservation on cached textures is a confirmed, avoidable cost.
- **Compatible experiments:** the static-texture prototype reduces image/sprite/text submission
  time by 40.91%,
  43.75%, and
  59.18% against its contemporary 2.2.0 control.
  Line reservation reduces line time by 26.39%;
  the outer geometry-chunk loop reduces filled-circle time by
  12.07%.
- These are measured workload-specific CPU submission reductions, not additive speedups or
  promises of equivalent FPS gains. Stability, intervals, and correctness outcomes appear below.
<!-- END_EXECUTIVE_RESULTS -->

The first optimization to investigate for image-heavy applications is a cached static-image
texture lookup that avoids saving and restoring WebGL state when no GL mutation occurs.
For primitive-heavy applications, prioritize line reservation and geometry-copy loops.
Treat removal of validation, context guards, and view translation as separate tradeoff experiments.

The existing benchmark also has a reproducibility defect: its calls to
`new Math.seedrandom( seed, true )` enable entropy mixing in the bundled implementation.
Equal seed strings therefore do **not** produce equal operation sequences across page loads.
The controlled diagnostics disable entropy mixing. Original-suite runs preserve existing behavior.

### Reading the evidence

- **Confirmed mechanism:** source inspection and an isolated experiment identify a specific cost.
- **Supported hypothesis:** source or profiling suggests a mechanism, but its contribution remains
  uncertain or a repeated A/B result is unstable.
- **Speculative:** a proposal has not been prototyped or lacks supporting measurements.
- **Disproven as a new cause:** the suspected code did not change across the relevant transition,
  or the controlled experiment does not support the proposed attribution.

An unstable measurement can still reveal a large recurring difference. It is not presented as a
precise release-wide speedup. Likelihood ratings below are engineering judgments about a stated
target, not calibrated probabilities.
Cells marked † or `Stable: false` remain **inconclusive under the stability acceptance criterion**
after fourteen runs, even when their confidence interval excludes zero.

## 2. Reproduction methodology and limitations

### Version and build provenance

| Label | Source revision |
|---|---|
| 2.0.3 | `4420cdc2a9741c98145393f0f4356ada766eea48` (`v2.0.3`) |
| 2.1.0 | `d4aa1c5e606fbf17df3a6fed78493412b4ff8ea9` (`v2.1.0`) |
| 2.2.0 | `cff1b9a1fbd61721d1eba8e978dfc1f1273e6e48` |

Source builds use Node 22.19.0, esbuild 0.25.10, full-library IIFE output, ES2020, no minification,
shader text loaders, and the repository's font-data object loader. They are extracted from Git
into ignored snapshots and built directly; the release-writing build script is not invoked.
Shipped 2.0.3/2.1.0 bundles are copied without modification for a separate packaging comparison.
The fixed polygon plugin is version 1.0.0 from `cff1b9a`, matching the original suite's use of the
current polygon plugin with all three library versions. Polygon measurements are therefore
**plugin-plus-core comparisons**, not comparisons of historical polygon releases.
Its exercised contract uses the existing numeric utility, palette access, and public line/rectangle
commands. Both polygon workloads execute on all three cores. This verifies the exercised API
compatibility, not every polygon input or pixel-level equivalence between historical renderers.

Full hashes and build metadata are in the
[manifest](../test/performance/investigation/manifest.json). The
[artifact inventory](../test/performance/investigation/artifact-inventory.json) hashes retained
results and reproduction scripts. Generated bundles and extracted snapshots remain in ignored
`.cache` storage and can be recreated.

### Environment and measurement design

The measurement machine uses an Intel Core i5-13400F, approximately 32 GiB RAM, Windows
10.0.26200, and an NVIDIA GeForce RTX 4060 through ANGLE/D3D11. Controlled runs use visible
Chromium 141.0.7390.37 with hardware acceleration and the Balanced power scheme. Playwright's
1000 × 680 viewport and emulated screen size are recorded separately from physical display
properties. The logical Pi screen is 800 × 600. Browser/device details are saved per run.
Device pixel ratio is approximately 1.0. Nested-view and shared-screen comparisons start at 2.1.0;
the diagnostic harness skips both cases on the older API, leaving 2.0.3 offscreen performance open.
The recorded physical mode is 3440 × 1440 at 99 Hz, with NVIDIA driver `32.0.15.9186`;
the measured frame cadence is the source of truth for each run's frame budget.

Versions execute sequentially in rotating/reversed order. Seven runs are attempted first;
any workload with run-level median absolute deviation (MAD) above 5% extends the group to
fourteen runs. Remaining unstable cells are explicitly marked. No concurrent benchmark workers
or correctness-test jobs are used.
The ten-artifact history campaign rotates/reverses positions but is not fully counterbalanced:
even/odd position bias remains. Treat its small differences as attribution clues, supported where
possible by isolated ablations. The initial two-artifact combined campaign had fixed order because
rotation and reversal canceled; it is retained in `results/exploratory-combined-order` and excluded
from the final combined table. The corrected combined campaign alternates A/B and B/A.
One corrected combined attempt stopped at round 13 when local image `img_4` failed to load during
workload initialization. No partial timing result was saved. A fresh-browser resume completed the
missing run and round 14; the failure is recorded in `results/combined-interruption.json`.
Its cause remains unresolved and is a startup-reliability follow-up, not an omitted slow sample.

The original suite retains its 500 ms warm-up, 1500 ms minimum calibration, 2000 ms measurement,
adaptive workload, Pi-rendered status overlay, and existing score formula. Its saved throughput
is the median of run-level throughput values. Calibration may exceed its nominal duration.

The fixed-work diagnostics use the same workload generators and assets, deterministic seeds,
16 warm-up frames, and 32 measured frames per case. Counts and seed-check samples are retained.
They measure:

- **Queue time:** synchronous JavaScript call time, including any flush forced by those calls.
- **Submission time:** queue time plus the library's scheduled rendering microtask, including
  CPU-side buffer uploads and draw submission. This is not GPU completion time.
- **Frame interval:** requestAnimationFrame spacing; refresh-rate ceilings can hide faster CPU work.
- **p95:** the median across runs of each run's 95th percentile, rather than a pooled percentile.

Reported confidence intervals bootstrap whole runs, not individual frames, with 5000 deterministic
resamples. They do not capture all systematic errors, machine-to-machine variation, or changes in
browser scheduling. The original graphics generator performs `itemCount - 1` operations; its
score still uses `itemCount`. Fixed-case counts remain nominal generator inputs, not a new claim
of exact primitive counts for mixed workloads.

### Benchmark audit

| Issue | Consequence | Treatment |
|---|---|---|
| `seedrandom( seed, true )` mixes entropy | Different geometry, texture switches, and fill work per page | Keep original suite; disable entropy only in diagnostics and save seed proof |
| Overlay uses Pi text and drawing | A text regression can reduce every adaptive score | Fixed-work diagnostics omit the overlay; retain a separate overlay-off check |
| Adaptive counts differ by version | Versions do different amounts of work and traverse different animation states | Add identical fixed workloads and warm-up counts |
| Short calibration and measurement | JIT, allocation, growth, and display timing influence scores | Repeated balanced runs; report MAD and p95 |
| Current polygon plugin on old cores | Polygon score includes many public line/rectangle calls | Separate core workloads and identify plugin provenance |
| Arithmetic mean of heterogeneous scores | High-throughput sprites/rectangles dominate the aggregate | Prioritize per-workload results; use overall score only for reproduction |
| Comparison graph uses the common supported test set | Including legacy 1.2.5 changes the overall comparison's workloads | Keep this report focused on the requested 2.x versions |
| Warm texture and geometry caches | Results primarily describe steady state | Keep loading/startup costs outside claims; profile allocations separately |

The initial fixed-work and profile runs made before discovering entropy mixing are retained in
`results/exploratory-*`. They are excluded from the controlled comparison tables. Historical user
results are retained separately and were produced with a different browser version; they are not
pooled with the new measurements.

<!-- MEASUREMENT_RESULTS -->
### Fixed-work release results

CPU submission milliseconds per fixed workload; lower is better. † means run MAD exceeds 5%.

| Workload | 2.0.3 ms | 2.1.0 ms | 2.2.0 ms | 2.0→2.1 time | 2.1→2.2 time |
| --- | --- | --- | --- | --- | --- |
| line | 3.85† | 4.15† | 5.80 | +7.8% | +39.8% |
| rect-filled | 2.65 | 3.03† | 3.10 | +14.2% | +2.5% |
| circle-filled | 4.60 | 5.58 | 6.08 | +21.2% | +9.0% |
| ellipse-filled | 8.10 | 8.88 | 9.70 | +9.6% | +9.3% |
| mixed | 4.95 | 5.17† | 5.55 | +4.5% | +7.2% |
| polygon | 3.87 | 4.50 | 4.38 | +16.1% | -2.8% |
| polygon-filled | 4.45† | 5.10 | 5.90 | +14.6% | +15.7% |
| images | 2.35 | 2.50 | 3.83 | +6.4% | +53.0% |
| sprites | 3.00 | 3.10 | 5.00 | +3.3% | +61.3% |
| text | 3.00 | 3.17 | 6.70 | +5.8% | +111.0% |
| short-lines | 1.37† | 1.70 | 2.40 | +23.6% | +41.2% |
| batch-boundary | 3.30 | 3.80 | 4.83 | +15.2% | +27.0% |
| nested-view | — | 2.22† | 2.63 | — | +18.0% |
| shared-screen | — | 6.40 | 6.40 | — | +0.0% |

![Fixed-work release comparison](../test/performance/investigation/figures/release-comparison.png)

### 2.2.0 timing breakdown and uncertainty

| Workload | Queue ms | p95 submit ms | Frame median / p95 ms | Run MAD | 2.1→2.2 time change: 95% interval |
| --- | --- | --- | --- | --- | --- |
| line | 5.50 | 7.51 | 10.00 / 10.10 | 3.45% | +28.2% to +49.4% |
| rect-filled | 2.95 | 4.83 | 10.00 / 10.10 | 4.03% | -5.6% to +12.5% |
| circle-filled | 5.75 | 10.01 | 10.00 / 10.10 | 1.65% | +6.6% to +11.8% |
| ellipse-filled | 8.40 | 11.01 | 10.00 / 10.10 | 1.55% | +6.1% to +11.5% |
| mixed | 4.97 | 6.45 | 10.00 / 10.10 | 1.80% | -0.9% to +10.3% |
| polygon | 4.13 | 5.10 | 10.00 / 10.10 | 4.57% | -12.2% to +7.8% |
| polygon-filled | 5.07 | 6.76 | 10.00 / 10.10 | 2.54% | -3.9% to +28.3% |
| images | 3.20 | 4.40 | 10.00 / 10.10 | 1.31% | +52.0% to +61.5% |
| sprites | 4.43 | 5.47 | 10.00 / 10.10 | 2.00% | +59.7% to +68.3% |
| text | 6.60 | 7.50 | 10.00 / 10.10 | 0.00% | +101.5% to +116.9% |
| short-lines | 2.35 | 3.64 | 10.00 / 10.15 | 4.17% | +32.4% to +45.6% |
| batch-boundary | 4.55 | 5.66 | 10.00 / 10.20 | 1.55% | +26.3% to +31.8% |
| nested-view | 2.63 | 3.59 | 10.00 / 10.15 | 4.76% | +9.5% to +25.9% |
| shared-screen | 6.35 | 7.72 | 10.00 / 10.10 | 1.56% | -4.5% to +2.4% |

### Original adaptive-suite reproduction

Throughput is nominal items/second; higher is better. This table retains entropy mixing and
the Pi-rendered overlay. It reproduces user-facing benchmark behavior, not identical work.

| Workload | 2.0.3 | 2.1.0 | 2.2.0 | 2.0→2.1 throughput | 2.1→2.2 throughput |
| --- | --- | --- | --- | --- | --- |
| Polygon polygon Test | 834,500 | 724,850 | 505,700 | -13.1% | -30.2% |
| Polygon polygon-filled Test | 158,650 | 133,000 | 109,400 | -16.2% | -17.7% |
| Graphics line Test | 452,900 | 430,100 | 282,600 | -5.0% | -34.3% |
| Graphics rect-filled Test | 1,937,000 | 1,604,650 | 1,384,300 | -17.2% | -13.7% |
| Graphics circle-filled Test | 200,300 | 158,150 | 142,750 | -21.0% | -9.7% |
| Graphics ellipse-filled Test | 101,200 | 91,150 | 82,200 | -9.9% | -9.8% |
| Graphics Test | 104,000 | 100,050 | 94,700† | -3.8% | -5.3% |
| Blit Images Colors Test | 933,100 | 942,950 | 923,400 | +1.1% | -2.1% |
| Blit Sprites Colors Test | 1,292,150 | 1,292,650 | 946,350 | +0.0% | -26.8% |
| Draw Images Test | 909,200 | 905,600 | 883,850 | -0.4% | -2.4% |
| Draw Images Colors Test | 901,050 | 923,700 | 855,150 | +2.5% | -7.4% |
| Draw Sprites Test | 1,283,750 | 1,281,850 | 927,350 | -0.1% | -27.7% |
| Draw Sprites Colors Test | 1,284,050 | 1,283,750 | 892,600 | -0.0% | -30.5% |

### Shipped/source comparability

| Version | Normalized executable text equal | Interpretation |
| --- | --- | --- |
| 2.0.3 | false | Hashes differ; retain separate source/shipped measurements |
| 2.1.0 | true | Build formatting/banner differences do not change normalized code |

The full shipped/source timing comparisons and confidence intervals are retained in
`results/summary.json`. Do not assign small source/shipped timing differences to packaging
when normalized executable text is equal.

For 2.0.3, inspection traced the remaining difference to CRLF versus LF in
embedded shader strings. Normalizing those escapes before code normalization makes the
hashes equal (`lineEndingNormalizedEqual` in `build-comparison.json`). This is evidence
against a changed JavaScript implementation in the shipped package; startup shader compiler
effects were not measured. The original artifacts were retained unmodified.

The overlay-off check has one run per version and is descriptive only. Its
entropy-mixed inputs do not support an isolated numerical estimate of overlay cost. The
deterministic fixed-work results above establish regressions without that overlay.

<!-- END_MEASUREMENT_RESULTS -->

## 3. Attribution by version transition

### 2.0.3 → 2.1.0

The source diff adds view origins to untextured vertex emission, copies view state when preparing
batches, and applies scissor state during flushes. Even a default full-screen view enters these
paths. Image vertices also gain origin translation, while display selection becomes shader-aware.
The diff also adds an empty-flush shortcut, so added feature support is not uniformly a slowdown.

The view ablation removes **only untextured vertex origin addition**. It is an upper-bound probe
for a specialized zero-origin path, not a complete implementation of that path. It deliberately
breaks translated primitive rendering and cannot establish that all clipping/shader overhead is
responsible. History probes compare the state immediately before view introduction with the
state after the initial view follow-up.

Custom shader compilation and reflected-uniform validation are not executed for every ordinary
primitive. Their existence is insufficient evidence of a rendering regression. Likewise, shared
offscreen handling must be measured in a shared-screen workload; it cannot be inferred from a
single visible screen benchmark.

<!-- ATTRIBUTION_21 -->
#### View history and ablation

| Boundary | Workload | Before ms | After ms | Time change | 95% interval | Run MAD |
| --- | --- | --- | --- | --- | --- | --- |
| views | line | 3.90† | 4.10† | +5.1% | -5.4% to +21.6% | >5% |
| views | circle-filled | 4.50 | 5.40 | +20.0% | +16.5% to +20.9% | ≤5% |
| views | sprites | 2.50 | 2.60 | +4.0% | -1.9% to +5.1% | ≤5% |
| views | text | 2.63 | 2.88 | +9.5% | -3.6% to +12.6% | ≤5% |

| 2.1.0 experiment | Time change | 95% interval | Stable |
| --- | --- | --- | --- |
| line | +0.6% | -9.9% to +3.7% | true |
| rect-filled | -5.8% | -11.3% to -0.8% | false |
| circle-filled | -17.0% | -17.8% to -16.6% | true |
| short-lines | -7.1% | -14.8% to +0.0% | false |

The history boundary includes view introduction and its initial follow-up. The narrower
origin ablation improves attribution, but does not measure a compatible implementation.

<!-- END_ATTRIBUTION_21 -->

### 2.1.0 → 2.2.0

**Cached texture state preservation.** The large `694d02a` upgrade commit wraps texture resolution
in four `getParameter` calls and restoration of active texture, texture binding, and read/draw
framebuffer bindings. This happens on a cache hit as well as an upload. Text uses the same image
path for glyphs. The experimental fast path returns an existing texture for an `HTMLImageElement`
after the existing context-loss probe, before the state snapshot. Uploads, canvas/video sources,
and cache misses retain the original path. The later `114edda` context-recovery change adds guards
but did not introduce this state snapshot.

**Line and geometry reservations.** `d8c0e9b` fixes oversized reservations by introducing bounded
chunk emission. Lines create a point-writer closure and decrement/check remaining capacity for
each pixel. Cached filled geometry similarly checks chunk capacity for each vertex. Those checks
prevent real overflow and non-termination problems. The prototypes restructure normal work while
retaining an oversized fallback or bounded outer chunk loop.

**Context recovery and alpha composition.** `114edda` restores lost GPU resources and rejects
suspended work. `9faacbd` corrects premultiplied-alpha composition. Their changed semantics matter
for correctness, but the cost of earlier state preservation must not be assigned to these fixes.
History comparisons and GL counters distinguish their contributions.

**Numeric parsing.** `getInt` and `getFloat`, including `Number.isFinite`, are unchanged between
the tagged 2.1.0 source and `cff1b9a`. Removing their finite guards is a tradeoff experiment,
not a causal explanation for this transition. Palette validation did change and is assessed
separately from these unchanged conversion functions.

<!-- ATTRIBUTION_22 -->
#### History checkpoints

| Boundary | Workload | Before ms | After ms | Time change | 95% interval | Run MAD |
| --- | --- | --- | --- | --- | --- | --- |
| upgrade | line | 3.95† | 4.10† | +3.8% | -8.2% to +11.5% | >5% |
| upgrade | circle-filled | 5.40 | 5.40 | -0.0% | -1.9% to +2.8% | ≤5% |
| upgrade | sprites | 2.65 | 4.30 | +62.3% | +59.3% to +67.9% | ≤5% |
| upgrade | text | 2.80 | 5.85 | +108.9% | +101.8% to +112.0% | ≤5% |
| chunks | line | 4.30† | 5.32 | +23.8% | +16.3% to +36.5% | >5% |
| chunks | circle-filled | 5.40 | 5.90 | +9.3% | +8.3% to +10.8% | ≤5% |
| chunks | sprites | 4.35 | 4.40 | +1.1% | -1.1% to +4.1% | ≤5% |
| chunks | text | 5.70 | 5.80 | +1.8% | -1.7% to +3.1% | ≤5% |
| alpha | line | 5.42† | 5.45 | +0.5% | -8.8% to +5.7% | >5% |
| alpha | circle-filled | 5.90 | 5.83 | -1.3% | -2.5% to +0.4% | ≤5% |
| alpha | sprites | 4.47 | 4.40 | -1.7% | -4.3% to +2.3% | ≤5% |
| alpha | text | 5.93 | 5.95 | +0.4% | -2.9% to +5.1% | ≤5% |
| context | line | 5.30 | 5.47 | +3.3% | -0.5% to +7.1% | ≤5% |
| context | circle-filled | 5.83 | 5.93 | +1.7% | -0.4% to +3.9% | ≤5% |
| context | sprites | 4.40 | 4.63 | +5.1% | +3.4% to +9.1% | ≤5% |
| context | text | 5.85 | 6.30 | +7.7% | +5.1% to +10.8% | ≤5% |

#### Instrumented GL evidence

Counts cover 32 diagnostic frames, excluded from headline time comparisons.

| Artifact | Workload | getParameter | Framebuffer binds | Draw calls | GPU interval ms |
| --- | --- | --- | --- | --- | --- |
| 2.1.0 | images | 0 | 160 | 87104 | 3.38 |
| 2.1.0 | sprites | 0 | 160 | 81216 | 3.74 |
| 2.1.0 | text | 0 | 160 | 64 | 0.05 |
| 2.2.0 | images | 384000 | 192160 | 87104 | 5.49 |
| 2.2.0 | sprites | 512000 | 256160 | 81216 | 5.17 |
| 2.2.0 | text | 1113600 | 556960 | 64 | 0.27 |
| 2.2.0-static-texture | images | 0 | 160 | 87104 | 3.76 |
| 2.2.0-static-texture | sprites | 0 | 160 | 81216 | 5.13 |
| 2.2.0-static-texture | text | 0 | 160 | 64 | 0.05 |

The cached-texture prototype preserves the image/sprite/text draw and upload counts while
eliminating the cache-hit state snapshots. GPU query intervals include command-stream gaps,
CPU starvation, and instrumentation effects; they are not pure shader execution costs.

CPU self-sample rankings and sampled live heap allocations are available in
[profile-summary.json](../test/performance/investigation/results/profile-summary.json).
Heap sampling reports sampled live allocations at capture end, not total allocated bytes or
a memory leak. Full CPU profiles retain garbage-collector and idle samples.

Identical inputs do not guarantee identical historical rasterization: filled-circle emitted
vertex totals differ across the 2.2 changes. Image/sprite/text counter equivalence
provides a cleaner control for the texture experiment than the mixed-geometry workload.

<!-- END_ATTRIBUTION_22 -->

## 4. Prioritized improvement proposals

Difficulty estimates cover implementation and focused validation by a maintainer familiar with
the renderer. They exclude release scheduling and an extensive hardware/browser matrix.
Likelihood targets refer to the affected workloads, never all Pi.js applications.

| ID | Proposal and mechanism | Evidence / benefit target | Likelihood | Difficulty and dependencies |
|---|---|---|---|---|
| P1 | Static texture cache-hit path before GL state save/restore | Confirmed mechanism; target at least 10% lower submission time for warm images, sprites, and text | High for images/sprites; medium for a stable text estimate because text MAD remains above 5% | Low, 1–3 engineering days; cache invalidation and context-recovery coverage |
| P2 | Reserve ordinary lines once; retain bounded writer for oversized lines | Supported, large repeated benefit; target at least 10% lower line submission time | Medium; 26.4% observed reduction, but 6.3% prototype MAD fails the stability gate | Medium, 2–4 days; exact emission, forced-flush loss, and huge-line tests |
| P3 | Outer geometry chunk loop with uninterrupted inner copy | Confirmed mechanism; target at least 5% lower filled-circle submission time | High on this configuration; stable 12.1% reduction and passing focused tests | Low-medium, 1–3 days; complete-triangle reservations and alpha/order tests |
| P4 | Select a zero-origin primitive emitter at view changes | Breaking ablation informs target of at least 5% on point-heavy default-view work | Medium pending a compatible prototype; origin removal alone is not the final design | Medium, 3–6 days; view push/pop/reset, resize, captured API bindings |
| P5 | Consolidate cached context checks at proven synchronous boundaries | Ablation; target at least 5% on small primitive calls | Low; individual flag reads may inline cheaply, and removal changes correctness | High, 4–8 days; context-loss event timing, forced flushes, restoration, disposal |
| P6 | Prevalidated numeric/command path for trusted callers | Ablation; target at least 5% in conversion-heavy workloads | Low pending evidence; finite parsing was already present in 2.1.0 | Medium-high, 5–10 days; API/types/docs and invalid-input semantics |
| P7 | Reduce image-quad temporary allocation; precompute immutable UVs | Source/profile hypothesis; target at least 5% where GC or transformation work remains | Medium after P1; effect depends on V8 allocation elimination | Medium, 3–6 days; rotation, anchors, scaling, mutable sources, texture orientation |
| P8 | Coalesce redundant blend/state updates within a context owner | Source hypothesis; target at least 5% in state-heavy workloads | Low; must first measure redundant calls after P1 | High, 6–12 days; shared contexts, external GL access, custom shaders, invalidation |
| P9 | Explicit dirty marking for dynamic canvases/video, or immutable image handles | Speculative option for upload-heavy apps; no percentage estimate justified yet | Medium for apps dominated by redundant uploads; unproven for this suite | High, 7–15 days; new ownership/update API, types, documentation, migration |

<!-- PROTOTYPE_RESULTS -->
### Measured isolated experiments

Positive reductions mean faster submission. Each uses its own campaign's control.

| Experiment | Workload | Control ms | Prototype ms | Time reduction | Reduction 95% interval | Stable |
| --- | --- | --- | --- | --- | --- | --- |
| static-texture | images | 3.85 | 2.27 | +40.9% | +38.7% to +43.6% | true |
| static-texture | sprites | 4.80 | 2.70 | +43.8% | +42.9% to +46.4% | true |
| static-texture | text | 6.67 | 2.73† | +59.2% | +56.8% to +61.8% | false |
| line-reserve | line | 5.40 | 3.98† | +26.4% | +20.3% to +30.0% | false |
| line-reserve | short-lines | 2.15† | 1.87† | +12.8% | +3.7% to +20.0% | false |
| geometry-chunks | circle-filled | 5.80 | 5.10 | +12.1% | +10.3% to +13.8% | true |
| no-origin | circle-filled | 5.80 | 5.05 | +12.9% | +11.3% to +14.5% | true |
| no-origin | short-lines | 2.15† | 2.07† | +3.5% | -8.3% to +11.1% | false |
| trusted-numbers | images | 3.85 | 3.82 | +0.6% | -4.7% to +3.2% | true |
| no-context-guards | short-lines | 2.15† | 1.93† | +10.5% | -0.0% to +20.0% | false |

![Prototype reductions](../test/performance/investigation/figures/prototype-results.png)

#### Combined compatible prototype

| Workload | Control ms | Combined ms | Time reduction | Stable |
| --- | --- | --- | --- | --- |
| line | 5.42 | 5.30 | +2.3% | true |
| circle-filled | 5.90 | 5.15 | +12.7% | true |
| images | 3.80 | 2.25 | +40.8% | true |
| sprites | 4.83 | 2.70 | +44.0% | true |
| text | 6.60 | 2.95† | +55.3% | false |
| short-lines | 2.67 | 2.60† | +2.8% | false |
| batch-boundary | 3.63 | 3.67 | -1.4% | true |
| nested-view | 2.70 | 2.62† | +2.8% | false |

All tested candidate/workload results, including neutral and slower cases,
are retained in `results/summary.json`; the chart selects each proposal's main target.

<!-- END_PROTOTYPE_RESULTS -->

### Decisions from the experiments

Advance **P1 and P3** to production-patch review after the remaining integration checks.
Keep **P2** as a strong candidate requiring an independent stability confirmation; its 95%
interval excludes zero, but it did not meet this report's MAD gate. The combined experiment
therefore selects P1 and P3 only. Its own results determine their joint effect.

The 2.1.0 origin ablation cuts filled-circle time by 17.0%, with a 16.6–17.8% reduction interval
and acceptable MAD. Ordinary lines show no established improvement. This supports **P4** for
filled geometry, while leaving the compatible dispatch design and the short-line residual open.
In that same campaign, circle submission is 4.375 ms on 2.0.3, 5.300 ms on 2.1.0, and 4.400 ms
with origin removal. This nearly restores that workload's earlier CPU time; it does not establish
recovery of the other workloads or of a compatible view implementation.

Removing finite-number checks establishes **no benefit** in any tested workload: every interval
includes no change, while 21 numeric tests fail. Removing cached context guards likewise has no
interval that excludes no change and causes 30 recovery-test failures. Do not prioritize either
blanket removal. A narrower trusted path needs new evidence before its compatibility cost is
justified. Removing origin handling has a measurable circle benefit but fails translated-view
rendering; use it to guide specialization, not as a default behavior change.

Neutral and negative results matter: geometry restructuring does not improve image, sprite, or
text submission. Its batch-boundary median is 3.7% slower, with an interval from no change to
7.4% slower; this is a follow-up risk, not an established regression under the stated gate.
P1 leaves circle submission essentially unchanged. The unexplained remainder includes short-call
overhead, transformed-image work, and shared-screen/presentation costs. Measurements from separate
campaigns must not be subtracted to claim a precise fraction of the historical loss recovered.

### Interfaces, next experiments, and acceptance

- **P1:** no public API/type change. Restrict the fast path to cache-hit static browser images;
  preserve the loss probe and cache invalidation. Accept only after reduced GL counters,
  repeated gains, matching valid-input pixels, and lifecycle/context tests.
  The experiment checks `HTMLImageElement`; a production patch must also exclude any image tagged
  `isMock` that the existing resolver treats as mutable. That synthetic combination was not covered.
- **P2:** no public API change. Use the exact Bresenham count for normal lines and the existing
  bounded path above the batch maximum. Test zero-length, reversed, steep, clipped, transparent,
  capacity-crossing, and forced-context-loss lines. Do not restore unchecked oversized allocation.
- **P3:** no public API change. Reserve complete triangles outside the inner copy loop. Test tiny
  artificial capacities and large cached geometries; reject if emission order or alpha changes.
- **P4:** keep view semantics; select the emitter or hoist origin once per draw. Prototype dispatch
  overhead before choosing the implementation. Accept only if default-view gains survive without
  slowing translated views or breaking clipping and saved API references.
- **P5:** keep public behavior; move a guard only after proving no user callback, flush, disposal,
  or context transition can occur before its next protected access. Measure a bounded change,
  not a blanket removal. Existing forced-flush loss tests are mandatory acceptance gates.
- **P6:** if worthwhile, propose an explicit trusted numeric interface in a separate API design.
  It must state supported input types, rounding, error behavior, and lifetime ownership. Retain
  checked defaults. Compare against specializing normal numeric inputs before adding an API.
- **P7:** first prototype flat numeric corner calculations or reusable immutable UV data; do not
  reuse mutable queued data. Require fewer allocations and unchanged transformed/tinted pixels.
- **P8:** profile state calls after P1, then prototype context-owned shadow state with explicit
  invalidation. An internal implementation needs no public change only if external GL access
  remains correct; otherwise it is a documented compatibility decision.
- **P9:** benchmark repeated mutable-source draws first. An explicit update/dirty contract needs
  new public API/types and an upgrade guide. Accept only with tests of edits between queued draws,
  videos, source deletion/reuse, and multiple screens sharing the same source.
  `resolveWebGL2Texture` already honors `isDirty === false` for non-video mutable sources.
  First evaluate and document that existing mechanism; a new API is justified only if a supported
  ownership/update contract adds value. Video freshness must remain a separate decision.

Source anchors for the unprototyped candidates are `calculateTransformedCorners`, the temporary
UV arrays, and `addTexturedQuadToBatch` in
[sprites.js](../src/renderer/draw/sprites.js) (P7), state binding and batch submission in
[batches.js](../src/renderer/batches.js) (P8), and mutable-source copying in
[textures.js](../src/renderer/textures.js) (P9). Image CPU profiles contain texture-query work and
quad emission; heap samples include draw/quad allocations, but do not isolate corner arrays or
establish GC as a primary regression. These remain hypotheses until a focused allocation A/B test.
After P1, the sprite profile's leading non-idle work includes quad emission, transformed corners,
and batch drawing. This makes P7 a useful next experiment; the sample ranking does not itself
measure how much of those costs a new implementation can remove.

### Constraints and checks: options for consideration

| Constraint | Compatible approach | Opt-in or breaking alternative | Concrete lost guarantee / failure | Required evidence |
|---|---|---|---|---|
| Finite numeric inputs and conversion | Numeric fast case with existing fallback | Trusted numbers only; skip finite checks | NaN poisons coordinates; Infinity can prevent CPU raster loops from finishing; strings/defaults may change | Numeric-boundary tables plus finite-input A/B |
| Batch bounds and complete primitives | Reserve once or validate per chunk | Cap primitives, reject large inputs, or expose unchecked internal writes | Clipped/truncated shapes, incomplete triangles, capacity overflow, prior oversized recursion | SYS-007 reservation and emission tests |
| View origin and clipping | Hoist origin; specialize zero-origin/full-clip paths | Flat-coordinate mode without nested views | Wrong placement and drawing outside intended panels | View fixtures, translated alpha shapes, view transitions |
| Context availability and generation | Cached flag at safe boundaries; keep probes at GL work | No automatic restoration; app recreates screens | Writes to cleared arrays, stale textures, dropped work after loss | SYS-008 forced-flush and repeated-loss tests |
| Resource lifetime and name reuse | Validate on acquisition; invalidate handles on removal | Caller owns lifetime and uses immutable handles | Removed/replaced images remain drawable; old loads publish stale assets | Image lifecycle and ownership/reentrancy matrix |
| GL state preservation | Skip save/restore for provably read-only cache hits | Renderer exclusively owns all GL state | Shared-screen/sampler rendering changes another consumer's bindings | Shared-screen, shader sampler, and context tests |
| Palette/color validation | Resolve once when color changes; cache valid immutable values | Pre-resolved colors and no invalid-index errors | Invalid indices corrupt drawing state; changed palettes stale cached colors | SYS-017 color validation and palette-change tests |
| Rendering fidelity and alpha | Optimize while preserving premultiplied representation | Approximate curves, opaque-only mode, relaxed pixel matching | Different edges, wrong translucent overlap, double alpha application | SYS-006/015/016 and visual fixtures |
| Mutable-image freshness | Track owned source changes | Explicit dirty/update requirement | Canvas/video edits are not visible until marked | Mutation between draws, ordering, source reuse |

These alternatives are decisions for a later implementation. No global “disable safety” switch
is recommended from source inspection alone. Local specialization can eliminate substantial work
without changing callers' contracts.

### Feasibility of intentionally reduced contracts

These estimates include documenting the changed contract and replacing affected tests, not merely
deleting a guard. Targets are validation goals, not measured benefits unless stated. No estimate
assumes that an application can tolerate the lost guarantee.

| Reduced contract | Benefit evidence / validation target | Likelihood of target | Difficulty / engineering days |
|---|---|---|---|
| Trusted finite numbers | No established gain; target 5% in conversion-heavy calls | Low; repeated removal experiment is neutral | Medium-high, 5–10; explicit API, conversion rules, types, numeric tests |
| Reject/cap oversized primitives | Unmeasured; target 5% in a workload dominated by reservations | Low; compatible reservation restructuring already removes inner checks | Medium, 2–5; limit design, error handling, plugin compatibility |
| Flat coordinates, no translated views | Measured 17.0% circle reduction in 2.1; target 5% with new mode dispatch | Medium; gain established only for selected geometry | Medium, 3–6; screen configuration, view errors, rendering fixtures |
| App-owned context recreation | Blanket guard removal is inconclusive; target 5% in small calls | Low; lost-context semantics change substantially | High, 6–12; screen/resource generations, shutdown and recreation API |
| Immutable caller-owned image handles | Unmeasured; target 5% where repeated resource lookup dominates | Low for this suite after P1; needs handle-specific profiling | High, 7–15; ownership, reuse, stale-handle detection, plugin contract |
| Exclusive renderer ownership of GL state | State removal helps cache hits; broader residual benefit unmeasured | Medium only when remaining queries dominate | High, 6–12; interoperability policy and shared-context invalidation |
| Pre-resolved palette values | Unmeasured; target 5% for frequent color changes | Low pending palette-focused measurements | Medium, 3–6; palette mutation/version rules and SYS-017 coverage |
| Opaque-only or approximate rendering | No prototype; cannot justify a percentage | Low for current CPU-bound causes; GPU-heavy apps remain open | High, 5–15; separate rendering mode, fidelity criteria, deliberate baseline review |
| Explicit dirty updates for mutable sources | Unmeasured; target fewer uploads with the same explicitly published frames | Medium for redundant-upload apps; unproven here | High, 7–15; update API, video cadence, ordering and lifetime tests |

Before pursuing a row, run its smallest targeted workload and count the work it intends to remove.
Reject it if that work is negligible after compatible optimizations. Preserve checked defaults for
opt-in designs; a breaking default requires a separate release decision and upgrade documentation.

## 5. Correctness validation

Experiments are applied to isolated source copies. The existing reservation, numeric-boundary,
alpha-composition, context-recovery, image-lifecycle, and ownership/reentrancy tests are reused.
Relevant approved visual fixtures are read and compared without replacing baselines. Deliberately
breaking experiments have their failures recorded rather than adjusting expected behavior to pass.
The first baseline and line runs failed because the isolated test setup omitted a shader-demo
file. After copying the required demo fixtures, both passed on rerun. Initial setup-failure logs
are retained as `setup-baseline.txt` and `setup-line-reserve.txt` in the verification directory.

<!-- VERIFICATION_RESULTS -->
| Source variant | Test counts | Exit | Outcome |
| --- | --- | --- | --- |
| geometry-chunks | tests 221; pass 220; fail 0; skipped 1 | 0 | Passed |
| static-texture | tests 221; pass 220; fail 0; skipped 1 | 0 | Passed |
| no-origin | tests 43; pass 41; fail 1; skipped 1 | 1 | Failures recorded |
| trusted-numbers | tests 56; pass 35; fail 21; skipped 0 | 1 | Failures recorded |
| no-context-guards | tests 48; pass 18; fail 30; skipped 0 | 1 | Failures recorded |
| baseline | tests 221; pass 220; fail 0; skipped 1 | 0 | Passed |
| line-reserve | tests 221; pass 220; fail 0; skipped 1 | 0 | Passed |
| combined | tests 221; pass 220; fail 0; skipped 1 | 0 | Passed |

**no-origin:**

- not ok 22 - SYS-007 full: existing visual fixture view_comprehensive

**trusted-numbers:**

- not ok 1 - COV-003 full: view, blend, paint, geometry and font boundaries
- not ok 2 - COV-003 lite: view, blend, paint, geometry and font boundaries
- not ok 3 - COV-003 pushView rejects non-finite NaN
- not ok 4 - COV-003 pushView rejects non-finite Infinity
- not ok 5 - COV-003 pushView rejects non-finite -Infinity
- not ok 8 - COV-003 pushView rejects non-finite x
- 15 more failures; see the log.

**no-context-guards:**

- not ok 3 - SYS-008 full: pixel stops when its forced flush detects loss
- not ok 4 - SYS-008 full: line stops when its forced flush detects loss
- not ok 5 - SYS-008 full: put stops when its forced flush detects loss
- not ok 6 - SYS-008 full: rectangle stops when its forced flush detects loss
- not ok 7 - SYS-008 full: geometry stops when its forced flush detects loss
- not ok 8 - SYS-008 full: ellipse stops when its forced flush detects loss
- 24 more failures; see the log.

Original-suite image/shader outputs are not promoted to new approved baselines.
Ablations that fail correctness tests are evidence about tradeoffs, not shippable fixes.

<!-- END_VERIFICATION_RESULTS -->

## 6. Implementation roadmap

1. **Repair measurement reproducibility first.** Correct the benchmark's entropy option, retain
   deterministic operation data, add an overlay-independent mode, and record build/plugin hashes.
   Keep historical results identifiable by method. Do not compare old and new aggregate scores
   as if they came from identical workloads.
2. **Land P1 independently if accepted.** Limit the change to static cached images. Require a
   reproducible affected-workload win, no correctness failures, and no material loss in mixed or
   mutable-source cases. Roll back on stale images, context-restoration failures, or state leaks.
3. **Land P2 and P3 separately if accepted.** Retain oversized and loss-handling paths. Run targeted
   tests and the normal visual suite; reject any pixel/order drift. Re-measure after each change.
4. **Measure a combined candidate.** Combine only individually supported changes. Report its own
   result; never add individual speedups. Validate all interacting rendering/lifetime paths again.
5. **Investigate the residual.** Use remaining profile hotspots to choose P4/P7/P8. Design any
   trusted or breaking interface only after the compatible options have measured limits.
6. **Broaden before release.** Repeat on another GPU/backend and at least one other browser engine,
   plus one representative application. Check full/lite and minified output. Keep benchmark
   artifacts for the release and trend the affected workloads with run-level variability; use a
   stable dedicated machine before adopting automated percentage gates.

Default acceptance for a proposed optimization is an affected-workload benefit exceeding noise,
95% run-bootstrap interval excluding no change, run MAD at or below 5%, and no new correctness
failure. A material regression elsewhere means over 5% with the same evidence requirements.
If the environment cannot meet stability requirements, retain the proposal and schedule an
independent confirmation rather than lowering the acceptance bar.

## 7. Evidence and reproduction index

- [Investigation README and commands](../test/performance/investigation/README.md)
- [Pinned artifacts and hashes](../test/performance/investigation/manifest.json)
- [Benchmark source and media hashes](../test/performance/investigation/results/benchmark-inputs.json)
- [Computed tables and intervals](../test/performance/investigation/results/summary.json)
- [Raw original-suite results](../test/performance/investigation/results/suite/)
- [Fixed-work results](../test/performance/investigation/results/fixed/)
- [Prototype results](../test/performance/investigation/results/prototypes/)
- [History checkpoints](../test/performance/investigation/results/history/)
- [Instrumented profiles and counters](../test/performance/investigation/results/profiles/)
- [Correctness-test logs](../test/performance/investigation/results/verification/)
- [Evidence completeness checks](../test/performance/investigation/results/artifact-validation.json)
- [Existing correctness audit](../SYSTEM-AUDIT-2.2.md), especially SYS-006/007/008/017 and COV-003/004
- Relevant source: [texture resolution](../src/renderer/textures.js),
  [line drawing](../src/renderer/draw/lines.js),
  [geometry emission](../src/renderer/draw/geometry.js),
  [vertex emission](../src/renderer/draw/batch-helpers.js),
  [batch management](../src/renderer/batches.js), and [numeric parsing](../src/core/utils.js).

<!-- COMPLETION_LIMITS -->
### Remaining limits

Both transitions now have retained measurements, source attribution experiments, and ranked
follow-up work. Uncertainty includes unstable cells, JIT/driver variation, historical
rasterization differences, and the fraction of aggregate score loss attributable to each
cause. This report does not claim a complete additive decomposition of either regression.

Production rollout, external-GL interoperability beyond existing tests, cold-cache loading,
other browsers/GPUs, and minified/lite performance need follow-up before a release claim.
A browser presentation/compositor trace and a driver-level GPU capture were not collected;
frame cadence and GPU elapsed intervals bound the discussion but do not isolate presentation.

<!-- END_COMPLETION_LIMITS -->
