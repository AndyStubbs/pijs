# Pi.js performance improvement action plan

Based on the [2.0.3–2.2.0 investigation](upgrade-2.2-performance-report.md).
Objective: recover performance through compatible optimizations, starting with the strongest
measured results. Estimates are engineering days for a maintainer familiar with the renderer.
This document schedules implementation and validation. Phase 1 provides the maintained benchmark;
Phase 2 provides the first validated optimizations. Phase 3 provides a tested line candidate whose
integration remains deferred. Phase 4 is the next step: diagnose its variability and qualify stable
gains before integration. Phases 5–6 cover remaining optimizations and broader qualification.

## Phase 1 — Make benchmark results reproducible

- Promote deterministic seeds (`entropy: false`), fixed workloads, and overlay-independent timing
  from the investigation into the maintained benchmark.
- Preserve artifact/plugin hashes and alternating version order; keep historical scores separate.
- Carry forward the report's measurement limits and unresolved image-loading interruption.

**Deliverable:** a reproducible benchmark workflow ready for subsequent implementation phases.

**Implemented:** the [fixed-work CLI](../test/performance/README.md) builds supplied source
directories into isolated campaigns, records hashes and interruptions, and validates explicit
resume. The adaptive browser benchmark and historical scores remain separate. Protocol and browser
tests cover reproducibility, timing, ordering, result integrity, and asset failures. A hardware
smoke campaign verifies operation; it does not establish optimization benefits.

## Phase 2 — Implement the two strongest optimizations

Land each change independently, then integrate them.

| Change | Implementation | Existing evidence | Effort / likelihood |
|---|---|---|---|
| P1: static texture lookup | Return cached static-image textures before GL state save/restore. Retain context-loss probes and cache invalidation; exclude mutable sources and `isMock` images. | Image/sprite submission time fell 41–44%; text gains were large but unstable. | 1–3 days; low difficulty, high likelihood for images/sprites |
| P3: geometry chunk copying | Reserve complete triangle chunks outside the inner vertex-copy loop. Preserve capacity bounds, emission order, and alpha behavior. | Filled-circle submission time fell 12%. | 1–3 days; low–medium difficulty, high likelihood on the measured configuration |

**Deliverable:** separate production patches, followed by an integrated candidate. The existing
combined prototype reduced image/sprite time by 41–44% and circle time by 13%; these are CPU
submission reductions on one configuration, not additive gains or FPS promises.

**Implemented:** P1 and P3 have independent patches, source snapshots, and focused regression
coverage, followed by an integrated candidate. The integrated regression suite passed 451 tests;
all 67 full/lite/plugin visual fixtures passed without baseline changes. Three fixed-work campaigns
completed fourteen rounds per source without interruption. P1 reduced image/sprite submission by
37.8%/40.4%; P3 reduced filled-circle submission by 12.1%. The integrated candidate independently
measured 37.8%/38.3%/12.3% reductions for images/sprites/filled circles. These results passed the
interval and variability gates on the measured RTX 4060/Chromium configuration. Text remained
unstable, and broader qualification remains Phase 6 work. See the
[Phase 2 validation record](upgrade-2.2-phase2-validation.md) for tests, intervals, and artifacts.

## Phase 3 — Improve line reservation

- Implement P2: reserve ordinary Bresenham lines once using `max(dx, dy) + 1` points.
- Retain the bounded writer for oversized lines and preserve forced-flush/context-loss behavior.
- Make integration conditional on independent stability confirmation: the prototype's 26% line
  improvement was promising, but its 6.3% run variability exceeded the report's 5% threshold.

**Effort:** 2–4 days; medium difficulty and likelihood. **Deliverable:** a separate line patch
targeting at least 10% lower line submission time.

**Candidate validated; integration deferred:** P2 is retained as a separate renderer/test patch.
The candidate passed 469 regression tests and all 67 full/lite/plugin visual fixtures without
baseline changes. One fresh fixed-work campaign completed fourteen rounds per source without
interruption. Line submission time fell 13.7%, with a 95% reduction interval of 4.8–29.1%, but
candidate line variability was 11.0%, exceeding the 5% stability threshold. The integration gate
failed, so production renderer code remains unchanged. See the
[Phase 3 validation record](upgrade-2.2-phase3-validation.md) and
[standalone P2 patch](patches/upgrade-2.2-phase3-p2.patch).

## Phase 4 — Stabilize line performance while preserving the gain

Retain P2's reserve-once design and isolate the source of variability before changing the renderer.
The Phase 3 candidate's line medians ranged from 3.15–4.65 ms; most variation occurred during
synchronous drawing, while the remaining submission overhead stayed near 0.3 ms. The batch-boundary
workload also exercises lines and achieved a 19.1% reduction with 3.2% candidate variability.
These observations motivate investigation; they do not establish a cause or qualify P2 for release.

1. **Test warm-up sensitivity with P2 unchanged.** Each source/round starts in a fresh browser
   context, with lines first and only 16 warm-up frames. Compare that setting with a fixed
   120-frame warm-up in a separate diagnostic experiment. Apply identical settings to baseline
   and candidate, and preserve the same deterministic measured operation sequence so extra warm-up
   does not change the workload. Compilation and startup activity are hypotheses to test.
2. **Profile fast and slow runs separately.** Capture JavaScript execution, allocation/garbage
   collection activity, buffer growth, and forced-flush counts. Use a separate diagnostic workload
   with precomputed inputs to isolate the timed generator's parameter-array allocations and random
   number generation. Keep instrumented runs and simplified workloads out of qualification results;
   retain the representative workload for acceptance.
3. **Tighten the reserved-line loop only if profiling supports it.** Cache vertex/color arrays,
   offsets, view origin, and color components once, then write directly inside the Bresenham loop.
   Capture buffer references after successful reservation because reservation can resize them.
   Preserve exact emission order, count, endpoint inclusion, alpha, translated views, clipping,
   the oversized bounded fallback, and existing context-loss boundaries. Keep this variant separate
   from the original P2 candidate so its effect can be measured independently.
4. **Qualify the selected candidate in a fresh campaign.** Declare any protocol changes before
   qualification, include them in campaign identity/resume validation, and test the revised timing
   and deterministic-workload behavior. Use all fourteen workloads, alternating source order, and
   the existing seven-round protocol with its capped extension to fourteen. Finish correctness
   testing before measurement; do not pool historical/diagnostic results or repeat qualification
   merely to obtain a pass.

**Acceptance:** at least 10% lower median line submission time, a 95% whole-run bootstrap interval
excluding no change, and run MAD at or below 5% for both baseline and candidate. Require passing
line/batch/context-recovery regressions, full/lite/plugin visual coverage without baseline changes,
and no regression above 5% elsewhere established by the same interval and stability requirements.
Preserve these thresholds even if the measurement protocol changes. If qualification fails, retain
the separate patch and evidence without integrating P2.

**Effort:** 2–4 days initially; medium difficulty, stability benefit unproven.
**Deliverable:** a diagnosis with retained traces and hashes, a documented measurement protocol,
and an independently reviewable P2 patch with an explicit integration decision. Record any remaining
uncertainty; broader GPU/browser/application qualification remains Phase 6 work.

## Phase 5 — Address remaining costs selectively

1. **P4: specialize default views** while retaining translated views and clipping. Hoist origin
   calculations or select a zero-origin emitter. The breaking ablation improved 2.1.0 circle time
   by 17%; a compatible implementation remains unproven. **3–6 days; medium likelihood.**
2. **P7: reduce image-quad allocations and repeated corner/UV calculations.** Preserve transforms,
   tinting, and queued-data ownership. **3–6 days; medium likelihood; benefit unmeasured.**

Both have medium implementation difficulty. Prioritize using the residual profile after Phase 2.
Defer broader GL-state caching and new resource-update APIs until remaining costs justify them.
Do not remove numeric validation or context guards globally: those experiments established no
benefit and broke 21 and 30 correctness tests, respectively.

## Phase 6 — Qualify and release

- Apply the report's future acceptance gates: workload benefit exceeding noise, a 95% interval
  excluding no change, run variability at or below 5%, and no new correctness failures.
- Cover affected rendering, bounds, alpha, views, context recovery, and resource lifetime;
  preserve approved screenshot baselines. Check another GPU/backend, another browser engine,
  a representative application, and full/lite/minified builds before broad release claims.
- Keep patches independently revertible. Roll back on stale resources, state leaks, rendering
  differences, recovery failures, or an established regression above 5% elsewhere.

**Release priority:** P1 and P3 first; add P2 only after Phase 4 passes its gates. Neither the P2
stability investigation nor the selective Phase 5 optimizations block delivering the confirmed
P1/P3 improvements after Phase 6 qualification.
