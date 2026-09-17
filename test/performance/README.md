# Performance benchmarks

Pi.js provides a reproducible fixed-work CLI and an interactive adaptive benchmark.

Correctness validation runs separately through `npm test`; see [the testing guide](../README.md).
Historical integration campaigns are stored outside the repository; see the
[evidence archive index](../../docs/evidence/performance/README.md) for checksums and restoration.

## Fixed-work CLI

Install the repository's Node 18+ dependencies and Playwright Chromium. Run from the repository
root, using source directories that contain `package.json` and `src/index-full.js`:

```powershell
# Check the current source tree with one round of every case.
npm run benchmark -- --source=current=. --smoke

# Compare a saved baseline directory with the current source tree.
npm run benchmark -- --source=baseline=C:/sources/pi-baseline --source=candidate=. `
  --out=test/performance/campaigns/change-01

# Select cases and an explicit, fixed polygon plugin source directory.
npm run benchmark -- --source=baseline=C:/sources/pi-baseline --source=candidate=. `
  --plugin-source=plugins/polygons --cases=line,images,sprites `
  --out=test/performance/campaigns/change-02

# Resume an interrupted campaign with exactly the same inputs and options.
npm run benchmark -- --source=baseline=C:/sources/pi-baseline --source=candidate=. `
  --out=test/performance/campaigns/change-01 --resume
```

Quote the entire argument when a directory contains spaces, for example
`"--source=baseline=C:/sources/pi baseline"`. Labels contain letters, digits, dots, underscores,
and hyphens; they begin with a letter or digit and must be unique without regard to case.

The CLI accepts one or more `--source=label=directory` arguments. The first source is the
comparison baseline. `--plugin-source` points to a directory containing the polygon plugin's
`index.js`; it defaults to the first source's `plugins/polygons` directory. Supply it explicitly
if that source does not contain the plugin. Every core runs against the same plugin bundle.
Only Pi.js 2.x source trees are supported.

Each source defaults to an isolated full, unminified ES2020 IIFE build with esbuild. Font and shader
loaders follow the repository's conventions. Campaigns use snapshots of the resulting bundles,
harness, seedrandom implementation, and media. The CLI does not require a running development
server: it starts a read-only loopback server on a free port.

`--browser=chromium|firefox` selects the engine (default Chromium).
`--backend=default|d3d11|opengl` selects Chromium's requested backend; Firefox requires `default`.
`--build=full|lite` selects the core entry point, and `--minify` enables core minification.
The fixed polygon plugin is identical for both sources. Defaults retain full unminified IIFE.
The target, launch options, executable path/hash, and build variant are part of campaign identity.
The observed renderer belongs to the saved environment and must match on resume. Launch flags alone
do not establish additional hardware-backend coverage. Browser binaries must be installed before
starting a campaign; installing or changing them invalidates resume identity.

`--out` selects an empty output directory. Its default is a timestamped directory under ignored
`test/performance/campaigns/`. Use a new directory for each independent campaign. Keep source
directories available and unchanged if you need to resume.

### Measurement protocol

- Keep the selected browser visible and run one measurement process at a time. Avoid competing CPU/GPU work
  and correctness-test jobs. Software renderers and hidden-page measurements are rejected.
- Every case uses an 800 × 600 logical screen, 16 warm-up frames by default, and 32 measured frames.
  `--warmup-frames=120` adds 104 preliminary frames, drains their rendering, reinitializes the
  workload generator, then performs the canonical 16 warm-up frames. Renderer resources remain
  warm. Both settings measure the same operation sequence, including image motion and sprite frames.
  The setting and workload protocol are part of campaign identity and resume validation. Workload
  generators reinitialize with explicit `entropy: false`; seed-check streams are saved per run.
- The asset set comprises twelve images and three spritesheets with explicit frame dimensions.
  Required asset failures abort the run. Image decoding and workload initialization precede timing.
- Two sources alternate A/B and B/A. Larger groups rotate and reverse their order;
  this schedule is not fully counterbalanced for every group size. Actual order is recorded.
- Normal campaigns start with seven rounds. Any supported workload with run-level median absolute
  deviation (MAD) above 5%, or an unresolved zero timing median, extends the whole campaign to
  fourteen rounds. There is no further extension to seek a preferred result.
- `--smoke` runs one round and produces no comparison intervals or performance conclusions.
  Automated browser tests may allow software rendering internally; the CLI has no such override.

### Cases

Counts are nominal generator inputs, identical for every source:

| Case | Count | Case | Count |
| --- | ---: | --- | ---: |
| line | 1,200 | images | 3,000 |
| rect-filled | 3,000 | sprites | 4,000 |
| circle-filled | 800 | text | 300 |
| ellipse-filled | 500 | short-lines | 10,000 |
| mixed | 400 | batch-boundary | 3,000 |
| polygon | 1,200 | nested-view | 1,200 |
| polygon-filled | 500 | shared-screen | 1,000 |

Use `--cases=name,name` to select an ordered subset. View and shared-screen cases explicitly
report unsupported on cores without the required view API. Graphics and polygon generators
execute `count - 1` operations; mixed cases do not imply an exact count of low-level primitives.

### Outputs and resume

- `manifest.json`: source-input, bundle, plugin, harness, runner, and media SHA-256 inventories;
  build/tool versions; campaign configuration; environment; ordered completed-result hashes;
  and interruption records.
- `artifacts/`, `harness.js`, `seedrandom.js`, `test/media/`: the exact executable and asset bytes
  served to the browser.
- `runs/`: one complete JSON result per source and round, with timestamps, actual order, raw
  samples, seed proof, and browser/OS/CPU/GPU, viewport, DPR, and power-plan information.
- `summary.json`: workload medians, p95 summaries, MAD, stability, and baseline comparisons.
  Smoke and incomplete summaries are marked and omit comparisons.

The environment records emulated screen dimensions separately from the logical canvas and
viewport. Physical display mode and GPU driver version are not automatically collected. Power
plan information is captured on Windows when available and otherwise recorded as null.

A loading error, page error, hidden page, WebGL failure, or timeout stops the campaign.
Initialization and each case have a 30-second bound. The manifest retains stage, source, round, error,
failed asset requests when available. Partial timing runs are not accepted as successful results.
There are no automatic retries. `--resume` creates a fresh browser and continues the missing run.

Resume checks configuration, all input hashes, saved snapshot bytes, completed-result hashes and
structure, execution order, seed proof, and environment compatibility. A mismatch requires a new
campaign. A lock prevents concurrent writers to one campaign. A hard process termination between
a result write and manifest update can leave an unindexed result; inspect that interruption and
start a new campaign instead of editing hashes. Keep interruptions as reliability evidence.

Adaptive scores in `data/` and evidence under `investigation/` are separate from CLI campaigns.
The CLI reads neither directory to aggregate results.

### Interpreting measurements

**Queue time** is synchronous JavaScript workload time, including flushes forced by those calls.
**Submission time** includes queue time and the scheduled rendering microtask, including CPU-side
uploads and draw submission. It does not wait for GPU completion. **Frame interval** measures
animation-frame spacing; display refresh ceilings can hide CPU improvements. Status drawing and
readbacks are outside the timed loop; text is drawn only as part of the text workload itself.

Summaries take medians across runs. Reported p95 is the median of each run's p95, not a pooled
percentile. MAD describes variation of run-level submission medians. Stability requires at least
seven runs and MAD at or below 5%; smoke results cannot qualify as stable. Comparison intervals use
5,000 deterministic bootstrap resamples of whole runs. Negative percentage change means lower
CPU submission time. Zero baselines yield unavailable ratios rather than infinite speedups.

The 5% MAD threshold is a diagnostic target, not an automatic integration veto. The `stable`
flag reports whether that target is met; accepting an optimization above the target does not change
the flag or the seven-to-fourteen-round sampling protocol. Integration decisions weigh the measured
benefit, confidence interval, correctness, and evidence of regressions, and disclose variability.

These measurements mainly describe warm caches and steady-state work. Intervals do not capture
all JIT, scheduling, driver, machine, or historical rasterization differences. Polygon results
measure the fixed plugin plus each core. A stable run group or interval excluding zero is not,
by itself, a release-wide FPS claim. Other browsers, GPUs, builds, and applications need validation.

Image-loading startup reliability remains unresolved; the dedicated
[performance investigation](../../docs/upgrade-2.2-performance-report.md) documents the `img_4`
interruption. Failure recording and explicit resume preserve that limitation rather than establish
its cause or a loading fix.

## Local readiness pass

The local readiness runner uses an isolated current-source snapshot, a verified historical baseline,
and actual test-only build artifacts. It runs complete correctness before measurements, checks
eight full/lite IIFE/ESM and minified/unminified builds, and briefly exercises Galaga with full and
lite plus keyboard/pointer/sound plugins. Application checks establish compatibility, not FPS gains.

```powershell
# Optional local browser installation under the ignored campaign directory.
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/test/performance/campaigns/browsers"
node node_modules/playwright/cli.js install chromium firefox

node test/performance/benchmark/qualify.js --out=test/performance/campaigns/local-readiness

# Fallback when the machine-local archive is unavailable.
node test/performance/benchmark/qualify.js --out=test/performance/campaigns/local-readiness-other `
  --baseline=C:/sources/known-pre-optimization-tree
```

The default baseline is `sources/baseline` from the Phase 2 archive in
`C:\Docs\src\pijs-evidence`. The runner verifies the ZIP checksum against the
[evidence index](../../docs/evidence/performance/index.json), then verifies every restored file
against its inventory. `--archive-directory` overrides the archive location. Automatic archive
extraction uses Windows PowerShell; on other systems supply a separately verified `--baseline`.
Explicit baseline selection is an assertion that the supplied source predates P1/P2/P3. Both trees
are snapshotted, hashed, and compared; unrelated differences must be considered when attributing
benefits. No reverse patching or production rollback is performed.

The one primary campaign uses Chromium/default hardware/full/unminified IIFE and all fourteen
workloads. Its targets are at least 10% lower image, sprite, and line submission time, and 5% lower
filled-circle submission time, each with a 95% change interval entirely below zero. MAD above 5%
remains diagnostic. Any workload with a median slowdown above 5% and a 95% interval excluding zero
fails the regression gate, regardless of MAD.

Four secondary targets vary one setting each: Firefox, Chromium OpenGL, lite, and minified IIFE.
Each receives load/render checks and a one-round smoke for lines, images, sprites, and filled
circles. ESM receives load/render checks. These checks do not form a Cartesian matrix. Software
rendering is rejected for measurement, and OpenGL adds backend coverage only when its observed
hardware backend differs from the primary. Smoke timings remain inconclusive, even after a
successful operational check; secondary targets have no benefit threshold.

`readiness.json` records passed/failed/inconclusive/pending statuses, source differences, check
results, campaign locations, interruptions, and rollback-patch identification. `evidence-files.json`
hashes the retained evidence; candidate and baseline inventories describe the frozen inputs.
Missing browsers/backends are pending. They do not block completion of the local pass or otherwise
passing local readiness, but broad release readiness remains pending or inconclusive. Correctness
failures block measurements and readiness. The CLI exits nonzero unless local readiness passes.

The output directory must be fresh and inside `test/performance/campaigns`. The runner never retries
or resumes automatically. After investigating a benchmark interruption, use the fixed-work CLI
with the recorded inputs and `--resume`; retain the original readiness report and document the
subsequent result separately. Do not repeat qualification to seek a pass. The runner does not
publish, bump versions, or generate release packages; its isolated correctness fixture includes
the existing `releases/base-package.json` as a read-only test input.

## Interactive adaptive benchmark

Run `npm run server` and open `/test/performance/index.html`. Select a Pi.js version from the menu,
then run the performance tests. The browser calculates a target refresh rate, warms each case
for 0.5 seconds, calibrates for at least 1.5 seconds, then measures the workload for 2 seconds.
The Pi-rendered status overlay participates in this adaptive experience. Its generators enable
entropy mixing, so equal seed strings do not establish identical work across page loads.

Post a run, open **View Previous Results**, and press `C` to compare adaptive scores. Arrow keys
select individual tests. Bars use the median saved run for each version; overall comparisons use
only the tests supported by every displayed version. Pi.js 1.2.5 has legacy argument handling and
supports fewer cases. These scores are not combined with fixed-work submission timings.

## Maintenance and checks

The maintained CLI lives in `benchmark/`, with fixed case definitions in `benchmark/cases.json`.
Shared generators live in `src/tests/`. Their `getConfig()` results expose `init`, `run`, and
`cleanUp`; a caller may set `config.seedOptions` before initialization. Omitted seed options retain
the adaptive generator behavior. Updating any workload input changes campaign identity.

```powershell
npm run test:benchmark
npm run test:performance-ui
```

Tests cover deterministic operation sequences, counts and timing boundaries, statistics, ordering,
resume integrity, and loading failures. Run a visible hardware smoke campaign after changes to
browser measurement or build inputs. Smoke results verify operation, not optimization benefit.

### Line diagnostics

The separate diagnostic runner compares 16 and 120 warm-up frames over exactly seven rounds per
source and setting. Source order alternates and setting order reverses each round. Each run uses
a fresh context. Select one mode and a fresh output directory for each experiment:

```powershell
node test/performance/benchmark/diagnostics.js `
  --source=baseline=C:/sources/baseline --source=p2=C:/sources/p2 `
  --plugin-source=plugins/polygons --cases=line --mode=representative `
  --out=test/performance/campaigns/line-diagnostic
```

Modes are `representative` (ordinary timed generator), `precomputed` (identical colors and endpoints
prepared before timing), `execution` (CDP CPU profile and Chromium trace), and `allocation` (CDP
sampled allocations, including collected objects). Execution and allocation modes instrument only
isolated core bundles to record buffer resizing and reservation-forced flushes by benchmark phase.
Instrumentation fails if its expected code sites change. Profiles include startup and warm-up;
trace phase marks identify the measured interval. Allocation profiles describe the complete run.
Precomputed results include a different allocation and dispatch pattern and serve only as a
diagnostic comparison.

The runner saves every result, profiles, phase events, hashes, environment, execution schedule,
interruptions, and fast/slow run identifiers. Summaries are marked diagnostic and ineligible for
qualification. It has no retries, resume, adaptive extension, or historical aggregation. It always
tests both warm-up settings; `--warmup-frames` does not select a single diagnostic setting.
Run one measurement process at a time, with visible hardware Chromium and no correctness jobs.
Diagnostics require Chromium's default backend and full unminified builds; other shared benchmark
target options are rejected because the diagnostic capture and instrumentation are Chromium-only.
