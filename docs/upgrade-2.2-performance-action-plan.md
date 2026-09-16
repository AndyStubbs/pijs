# Pi.js performance improvement action plan

Based on the [2.0.3–2.2.0 investigation](upgrade-2.2-performance-report.md).
Objective: recover performance through compatible optimizations, starting with the strongest
measured results. Estimates are engineering days for a maintainer familiar with the renderer.
This document schedules implementation and validation. Phase 1 provides the maintained benchmark;
Phase 2 provides the first validated optimizations. Phase 3 provides the tested P2 line candidate.
Phase 4 investigated variability and ran independent qualification; original P2 is now integrated
with 5% MAD treated as a soft diagnostic target. Phases 5–6 cover remaining optimizations and broader
qualification.

Completed campaign evidence is catalogued in the [archive index](evidence/performance/README.md).
Use the [correctness workflow](../test/README.md) to validate the integrated source.

## Phase 1 — Make benchmark results reproducible - COMPLETED

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

## Phase 2 — Implement the two strongest optimizations - COMPLETED

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

## Phase 3 — Improve line reservation - COMPLETED

- Implement P2: reserve ordinary Bresenham lines once using `max(dx, dy) + 1` points.
- Retain the bounded writer for oversized lines and preserve forced-flush/context-loss behavior.
- The original plan made integration conditional on independent stability confirmation: the
  prototype's 26% line improvement was promising, but its 6.3% run variability exceeded the report's
  strict 5% threshold. The revised acceptance policy is recorded in Phase 4 below.

**Effort:** 2–4 days; medium difficulty and likelihood. **Deliverable:** a separate line patch
targeting at least 10% lower line submission time.

**Original Phase 3 decision — candidate validated; integration deferred:** P2 was retained as a
separate renderer/test patch.
The candidate passed 469 regression tests and all 67 full/lite/plugin visual fixtures without
baseline changes. One fresh fixed-work campaign completed fourteen rounds per source without
interruption. Line submission time fell 13.7%, with a 95% reduction interval of 4.8–29.1%, but
candidate line variability was 11.0%, exceeding the 5% stability threshold. The integration gate
failed, so production renderer code remained unchanged at that stage. See the
[Phase 3 validation record](upgrade-2.2-phase3-validation.md) and
[standalone P2 patch](patches/upgrade-2.2-phase3-p2.patch).

## Phase 4 — Investigate line variability and integrate P2 - COMPLETED

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

**Current acceptance:** at least 10% lower median line submission time and a 95% whole-run bootstrap
interval excluding no change. Run MAD at or below 5% is a soft diagnostic target, not an integration
veto; disclose variability and review the benefit and uncertainty together. Require passing
line/batch/context-recovery regressions, full/lite/plugin visual coverage without baseline changes,
and no established regression above 5% elsewhere. Review regression evidence even when variability
exceeds the target. Preserve truthful stability flags and the existing capped sampling protocol.
The original qualification used a strict MAD gate; its recorded results and decision are retained.

**Effort:** 2–4 days initially; medium difficulty, stability benefit unproven.
**Deliverable:** a diagnosis with retained traces and hashes, a documented measurement protocol,
and an independently reviewable P2 patch with an explicit integration decision. Record any remaining
uncertainty; broader GPU/browser/application qualification remains Phase 6 work.

**Investigation completed:** maintained tooling now supports deterministic
16/120-frame warm-up comparisons and separate execution, allocation, and precomputed-input
diagnostics with retained profiles and hashes. Longer warm-up failed the stability selection rule.
Profiles justified a separate direct-write variant, but its independent comparison failed interval
and stability selection. Original P2 at 16 frames was therefore frozen for qualification.

The selected candidate passed 469 regressions and all 67 full/lite/plugin visual fixtures without
baseline changes. One qualification campaign completed fourteen rounds per source after an explicit
resume of a recorded image-loading interruption. Line submission fell 17.0%, with a 95% change
interval of -23.2 to -11.9%, with candidate MAD of 8.2%, above the 5% target. Integration was initially
deferred under the strict MAD gate. The maintainer accepted this tradeoff under the revised policy;
original helper-based P2 is now integrated with its regression tests. The direct-write variant
remains separate because its additional benefit was not established.
The [Phase 4 validation record](upgrade-2.2-phase4-validation.md) retains the diagnosis, protocol,
patches, evidence, original decision, and subsequent integration checks. The variability cause and
startup image-loading reliability remain unresolved.

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

- Require workload benefit exceeding noise, a 95% interval excluding no change, and no new
  correctness failures. Target run variability at or below 5%, disclose higher variability, and
  assess the tradeoff without using that threshold alone to veto integration.
- Cover affected rendering, bounds, alpha, views, context recovery, and resource lifetime;
  preserve approved screenshot baselines. Check another GPU/backend, another browser engine,
  a representative application, and full/lite/minified builds before broad release claims.
- Keep patches independently revertible. Roll back on stale resources, state leaks, rendering
  differences, recovery failures, or an established regression above 5% elsewhere.

**Release priority:** P1, P3, and original P2 are integrated for Phase 6 qualification. Further
variability investigation and the selective Phase 5 optimizations do not block qualification of
these improvements.
