# Pi.js performance improvement action plan

Based on the [2.0.3–2.2.0 investigation](upgrade-2.2-performance-report.md).
Objective: recover performance through compatible optimizations, starting with the strongest
measured results. Estimates are engineering days for a maintainer familiar with the renderer.
This document schedules future implementation and validation; no additional tests were run.

## Phase 1 — Make benchmark results reproducible

- Promote deterministic seeds (`entropy: false`), fixed workloads, and overlay-independent timing
  from the investigation into the maintained benchmark.
- Preserve artifact/plugin hashes and alternating version order; keep historical scores separate.
- Carry forward the report's measurement limits and unresolved image-loading interruption.

**Deliverable:** a reproducible benchmark workflow ready for subsequent implementation phases.

## Phase 2 — Implement the two strongest optimizations

Land each change independently, then integrate them.

| Change | Implementation | Existing evidence | Effort / likelihood |
|---|---|---|---|
| P1: static texture lookup | Return cached static-image textures before GL state save/restore. Retain context-loss probes and cache invalidation; exclude mutable sources and `isMock` images. | Image/sprite submission time fell 41–44%; text gains were large but unstable. | 1–3 days; low difficulty, high likelihood for images/sprites |
| P3: geometry chunk copying | Reserve complete triangle chunks outside the inner vertex-copy loop. Preserve capacity bounds, emission order, and alpha behavior. | Filled-circle submission time fell 12%. | 1–3 days; low–medium difficulty, high likelihood on the measured configuration |

**Deliverable:** separate production patches, followed by an integrated candidate. The existing
combined prototype reduced image/sprite time by 41–44% and circle time by 13%; these are CPU
submission reductions on one configuration, not additive gains or FPS promises.

## Phase 3 — Improve line reservation

- Implement P2: reserve ordinary Bresenham lines once using `max(dx, dy) + 1` points.
- Retain the bounded writer for oversized lines and preserve forced-flush/context-loss behavior.
- Make integration conditional on independent stability confirmation: the prototype's 26% line
  improvement was promising, but its 6.3% run variability exceeded the report's 5% threshold.

**Effort:** 2–4 days; medium difficulty and likelihood. **Deliverable:** a separate line patch
targeting at least 10% lower line submission time.

## Phase 4 — Address remaining costs selectively

1. **P4: specialize default views** while retaining translated views and clipping. Hoist origin
   calculations or select a zero-origin emitter. The breaking ablation improved 2.1.0 circle time
   by 17%; a compatible implementation remains unproven. **3–6 days; medium likelihood.**
2. **P7: reduce image-quad allocations and repeated corner/UV calculations.** Preserve transforms,
   tinting, and queued-data ownership. **3–6 days; medium likelihood; benefit unmeasured.**

Both have medium implementation difficulty. Prioritize using the residual profile after Phase 2.
Defer broader GL-state caching and new resource-update APIs until remaining costs justify them.
Do not remove numeric validation or context guards globally: those experiments established no
benefit and broke 21 and 30 correctness tests, respectively.

## Phase 5 — Qualify and release

- Apply the report's future acceptance gates: workload benefit exceeding noise, a 95% interval
  excluding no change, run variability at or below 5%, and no new correctness failures.
- Cover affected rendering, bounds, alpha, views, context recovery, and resource lifetime;
  preserve approved screenshot baselines. Check another GPU/backend, another browser engine,
  a representative application, and full/lite/minified builds before broad release claims.
- Keep patches independently revertible. Roll back on stale resources, state leaks, rendering
  differences, recovery failures, or an established regression above 5% elsewhere.

**Release priority:** P1 and P3 first; add P2 once stable. Treat Phase 4 as follow-up work rather
than a dependency for delivering the confirmed improvements.
