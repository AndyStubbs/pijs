# Phase 6 local readiness validation

**Local pass completed; readiness is blocked.** The single primary campaign passed all benefit
targets and established no regression above 5%. Firefox loaded and rendered successfully, but its
baseline sprite smoke workload exceeded the 30-second case timeout. The candidate was not measured
in that smoke. This is an unresolved operational failure, not evidence of a candidate regression.
The readiness report conservatively records local and broad readiness as **failed**.

Phase 5 is skipped/deferred. P4 and P7 are not implemented. P1, P3, and original P2 remain integrated;
no production rollback, version change, publication, or release-package generation was performed.

## Evidence and inputs

The machine-local evidence is retained in
[`phase6-final-20260916`](../test/performance/campaigns/phase6-final-20260916/readiness.json).
The [evidence index](evidence/performance/index.json) records report and inventory checksums.
Raw campaigns, screenshots, source snapshots, logs, and executable hashes remain in this ignored
directory; they are not automatically available on another machine.

The baseline is the pre-P1/P2/P3 `sources/baseline` snapshot from the Phase 2 archive at
`C:\Docs\src\pijs-evidence\phase2-20260916.zip`. The ZIP SHA-256 and all 693 extracted files were
verified against the existing archive index and inventory. The isolated current-source candidate
differs in the three expected renderer files and `package.json`; the package changes are test
commands, with unchanged version and dependencies. No dirty-tree reverse patching was needed.
The runner accepts an explicit known pre-optimization `--baseline` when that archive is unavailable.

The report identifies the archived P1/P3 patches and
[original P2 patch](patches/upgrade-2.2-phase4-p2.patch) for independent rollback identification.
The patches are not applied or reversed by the readiness runner.

## Correctness and compatibility

The complete correctness workflow ran before performance measurement in an isolated source copy.
Its standard test-only build produced the artifacts used for compatibility checks. Existing
`releases/base-package.json` was copied as a test input; no release outputs were generated.

| Check | Result |
| --- | --- |
| Node tests | 282 passed |
| Browser regressions | 233 passed |
| Metadata/type consumer checks | 2 passed |
| Full / lite / plugin visuals | 36 / 22 / 9 passed |
| Pending baselines, retries, visual failures | 0 |
| Full/lite × IIFE/ESM × minified/unminified load/render | All 8 passed |
| Galaga start, movement, firing: full and lite with input/sound plugins | Both passed |
| Final tooling guard tests | 19 passed |

Coverage includes bounds, alpha, views, batch capacity, texture/resource lifetime, and context
recovery. The source-routing harness now serves actual minified core and plugin code for `.min.js`
requests and keeps those cache entries separate. A browser regression verifies the returned bytes.
Galaga's normal behavior is unchanged; its screenshots are inspection evidence, not cross-browser
pixel baselines or application FPS measurements.

The final guard tests cover unsupported options in Chromium-only diagnostics, output-directory
containment, and preservation of manifests after rejected resume attempts, in addition to target,
identity, and readiness cases. These small guard changes followed qualification and do not change
timed workloads, launch selection, sampling, statistics, or saved results. Their hashes
are recorded in [verification.json](../test/performance/campaigns/phase6-final-20260916/verification.json).

The independent audit verified all 2,166 originally inventoried evidence files, recomputed every
campaign summary from its complete raw runs, and checked 217 current production, demo, package,
and approved-baseline inputs against the frozen candidate. All checks passed.

## Primary performance qualification

Exactly one primary campaign ran: visible Chromium 141.0.7390.37, default ANGLE/D3D11 backend,
NVIDIA RTX 4060, Intel i5-13400F, Windows 10.0.26200, Balanced power plan, full unminified IIFE.
It completed 14 rounds per source (28 runs), extending once under the existing variability rule,
with no interruptions or resumes. The campaign ran from 23:22 to 23:25 UTC on 2026-09-16.

All fourteen deterministic workloads retained alternating source order, 16 warm-up frames and
32 measured frames. Intervals use 5,000 whole-run bootstrap resamples. Negative changes mean lower
CPU submission time; measurements do not wait for GPU completion. Historical results were not pooled.

| Workload | Baseline ms | Candidate ms | Change | 95% change interval | Baseline / candidate MAD |
| --- | ---: | ---: | ---: | --- | --- |
| Line | 4.500 | 3.400 | -24.4% | -27.8 to -17.8% | 1.7 / 5.9% |
| Filled rectangle | 2.750 | 2.825 | +2.7% | -13.8 to +20.4% | 10.0 / 11.5% |
| Filled circle | 5.600 | 4.950 | -11.6% | -14.3 to -10.7% | 1.3 / 1.5% |
| Filled ellipse | 6.525 | 6.500 | -0.4% | -2.3 to 0.0% | 0.8 / 1.5% |
| Mixed | 4.675 | 4.550 | -2.7% | -6.2 to +2.2% | 2.7 / 1.6% |
| Polygon | 6.450 | 6.225 | -3.5% | -16.8 to +7.7% | 9.3 / 9.6% |
| Filled polygon | 12.125 | 11.650 | -3.9% | -8.2 to -2.3% | 1.4 / 1.5% |
| Images | 8.500 | 4.050 | -52.4% | -53.6 to -51.2% | 1.2 / 1.9% |
| Sprites | 11.350 | 5.050 | -55.5% | -56.9 to -53.3% | 1.1 / 3.0% |
| Text | 14.175 | 6.775 | -52.2% | -59.1 to -50.2% | 4.6 / 3.7% |
| Short lines | 6.100 | 6.175 | +1.2% | -9.4 to +12.7% | 7.8 / 6.9% |
| Batch boundary | 9.575 | 7.700 | -19.6% | -21.6 to -17.6% | 1.8 / 1.3% |
| Nested view | 6.000 | 5.850 | -2.5% | -11.6 to +28.4% | 8.7 / 8.1% |
| Shared screen | 18.775 | 18.925 | +0.8% | -2.4 to +5.2% | 2.1 / 2.5% |

Images, sprites, and lines exceeded their 10% benefit targets; filled circles exceeded 5%.
All four benefit intervals are entirely below zero. Candidate line MAD is 5.9%; its stability flag
remains false. Higher variability elsewhere is disclosed above and is not used to waive regressions.
No workload met the hard regression gate: median slowdown above 5% with its interval excluding zero.
The [raw summary](../test/performance/campaigns/phase6-final-20260916/primary/summary.json)
retains unrounded values and all fourteen comparisons.

## Secondary checks and readiness decision

Secondary smoke runs selected only lines, images, sprites, and filled circles, with one round per
source. Their timings cannot establish statistical benefit or absence of regression and remain
**inconclusive**. No Cartesian matrix or further full qualification campaigns were run.

| Target | Load/render | Operational smoke | Coverage / limitation |
| --- | --- | --- | --- |
| Firefox 142.0.1 | Passed | Failed: baseline sprites timed out | No complete timing run; candidate unmeasured |
| Chromium OpenGL | Passed | Passed | Observed ANGLE/OpenGL 4.5.0, distinct from primary D3D11 |
| Chromium lite IIFE | Passed | Passed | Default hardware backend |
| Chromium minified full IIFE | Passed | Passed | Default hardware backend |
| Full/lite minified/unminified ESM | Passed | Not a timing campaign | Actual module load and rendering checks |

Firefox's interruption record contains no page errors or failed asset requests. Its GPU description
is privacy-masked (`GTX 980 ... or similar`), so it is not evidence of a second physical GPU. The
OpenGL run establishes another backend on the same physical GPU. No second GPU was tested.

The failed Firefox smoke remains recorded and was not retried. Local primary benefits are qualified,
but the unresolved operational timeout blocks the conservative overall readiness decision. Broad
release readiness is also not established: secondary timings are smoke-only and hardware coverage
is limited. Further Firefox diagnosis is follow-up work, not a hidden retry or a claim of regression.

Setup attempts before the primary campaign retained their logs under the sibling `phase6-*`
directories. They exposed a nested-copy guard, omitted metadata fixtures, an invalid rectangle
argument in the new compatibility probe, a stalled sandboxed Firefox launch, and a temporary-file
rename permission error. Snapshot/probe fixes, a bounded browser launch, and native browser access
with temporary files inside the ignored campaign area resolved the setup issues. The affected
diagnostic test passed. No primary timing campaign ran during these setup attempts.

Reproduction commands and baseline fallback are documented in the
[benchmark guide](../test/performance/README.md#local-readiness-pass). Do not repeat qualification
merely to seek a passing result. Preserve these raw results and the Firefox interruption when
investigating the remaining readiness blocker.
