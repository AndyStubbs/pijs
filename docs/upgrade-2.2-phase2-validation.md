# Phase 2 optimization validation

**Current status:** P1, P3, and original helper-based P2 are integrated.

**Evidence location:** the campaign is archived outside the repository. Consult the
[evidence index and restore instructions](evidence/performance/README.md) before using the
reproduction commands below. Archived manifests and historical decisions are unchanged.

P1 adds a static-image texture cache lookup after the context-loss probe and before GL state
capture. It excludes images with a truthy `isMock` and leaves mutable sources on the existing
resolver. P3 reserves complete triangle chunks outside the cached-geometry vertex-copy loop.
Neither patch changes the public API, types, batch limits, or alpha representation.

## Reproducible candidates

The baseline is commit `962ca9fe430286f718122501025b9c23b2f2f2d6`, with a clean starting worktree.
The archived campaign originally lived under
[`test/performance/campaigns/phase2-20260916/`](evidence/performance/README.md),
an ignored output directory. Its archive contains baseline, P1-only, P3-only, and combined source snapshots,
independently applicable `p1.patch` and `p3.patch` files, test logs, and benchmark campaigns.
The standalone source snapshots differ from baseline only in their respective renderer module;
the combined snapshot contains both changes. The patches include their regression tests.

Each campaign compares baseline with one candidate, using all fourteen maintained workloads and
the same saved polygon-plugin source. To reproduce with the retained snapshots:

```powershell
$phaseRoot = "test/performance/campaigns/phase2-20260916"
foreach( $candidate in @("p1", "p3", "combined") ) {
    node test/performance/benchmark/run.js `
        "--source=baseline=$phaseRoot/sources/baseline" `
        "--source=$candidate=$phaseRoot/sources/$candidate" `
        "--plugin-source=$phaseRoot/plugin" `
        "--out=$phaseRoot/repeat-$candidate"
}
```

Use fresh output directories for new campaigns. Retained manifests include exact input and bundle
hashes, environment information, run order, and interruptions. Raw runs and summaries stay with
their campaigns; no historical investigation results are modified or pooled into these comparisons.

## Correctness

| Validation | Result |
| --- | --- |
| P1-only texture and image-lifecycle unit/browser tests, including full/lite recovery | 99 passed |
| P3-only batch unit tests | 21 passed |
| P3-only batch browser tests, full/lite | 16 passed |
| Integrated `npm run test:patch` | 451 passed |
| `npm run test:benchmark` | 11 passed |
| Final static-texture tests after strengthening flush-order assertions | 10 passed |
| `node scripts/build.js` | Passed; full/lite, IIFE/ESM, unminified/minified outputs |
| Core full visual suite | 36 passed |
| Core lite visual suite | 22 passed |
| Plugin visual suite | 9 passed |

The visual suites used the normal Playwright runner with four workers and the existing approved
baselines. There were no screenshot failures or baseline replacements. Generated bundles remain
ignored. Chromium tests required execution outside the filesystem sandbox; the initial sandboxed
launch failure was environmental, not a renderer failure.

New texture coverage verifies the warm-hit GL call reduction, cold upload/state preservation,
context-specific cache entries, removal/invalidation, pending loss and restoration, missing image
constructors, failed uploads, and mutable canvas/offscreen/video/screen/mock-image behavior.
Actual Chromium checks retain external texture/framebuffer bindings and redraw a static image
after context restoration in full and lite builds.

Geometry coverage compares exact emitted positions, colors, and primitive order with capacities
3/3, 4/7, 8/19, and 12/25; it includes translated views, partial occupancy, large cached geometry,
alpha 0/128/255, interleaved points, a final short chunk, and loss during a later chunk's flush.

## Performance qualification

Campaigns run sequentially, without concurrent correctness jobs, in visible Chromium 141.0.7390.37
on Windows 10.0.26200, an Intel i5-13400F, and an NVIDIA RTX 4060 through ANGLE/Direct3D 11, using
the Balanced power plan. The CLI uses deterministic fixed work, 16 warm-up frames, 32 measured
frames, alternating version order, and seven rounds extended to fourteen when variability exceeds
5%. These are CPU submission measurements, not GPU completion times or FPS promises.

All three campaigns completed fourteen rounds per source: 84 complete runs across the campaigns,
with no interruptions. Saved input/run hashes were verified and every summary was recomputed from
the raw runs. The fixed polygon-plugin hash matched across all three campaigns.

Positive percentages below mean lower submission time. Intervals use 5,000 whole-run bootstrap
resamples. Maximum MAD is the larger of baseline and candidate run-level variability.

| Candidate | Workload | Reduction | 95% reduction interval | Maximum MAD | Gate |
| --- | --- | --- | --- | --- | --- |
| P1 | Images | 37.8% | 36.6–40.5% | 1.4% | Pass |
| P1 | Sprites | 40.4% | 38.3–41.7% | 3.6% | Pass |
| P1 | Text | 48.4% | 43.5–51.6% | 8.6% | Unstable |
| P3 | Filled circles | 12.1% | 11.6–14.0% | 0.5% | Pass |
| Combined | Images | 37.8% | 35.6–40.5% | 4.3% | Pass |
| Combined | Sprites | 38.3% | 37.2–39.9% | 1.7% | Pass |
| Combined | Filled circles | 12.3% | 11.4–15.2% | 2.0% | Pass |
| Combined | Text | 49.4% | 44.8–52.4% | 7.9% | Unstable |

P1 exceeded the 10% image/sprite targets, and P3 exceeded the 5% filled-circle target. Those gains
and the combined candidate's image/sprite/circle gains excluded no change and satisfied the 5% MAD
limit. Text gains remain unqualified because of variability. Combined gains are measured directly,
not added or inferred from separate campaigns.

No regression above 5% met both the interval and stability gates in any campaign. Line, rectangle,
polygon, short-line, and nested-view comparisons remained unstable in all three campaigns. Absence
of an established regression is not proof of no regression. In particular, P1 short-lines had a
12.4% slower median, but its interval included no change and both versions exceeded 5% MAD.

The complete workload results are in the local
[P1 summary](evidence/performance/README.md),
[P3 summary](evidence/performance/README.md), and
[combined summary](evidence/performance/README.md).
The [verification record](evidence/performance/README.md)
records completion, interruption counts, fixed plugin identity, and regression-gate results.

These results qualify the targeted benefits on this configuration. Additional GPU/backend,
browser-engine, representative-application, and release-wide qualification remain
[Phase 6 work](upgrade-2.2-performance-action-plan.md#phase-6--qualify-and-release).
