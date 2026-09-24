# Break Checks

These checks back each proposed removal in the 2.3 test audit
([TESTS-V2.3-AUDIT.md](../../plans/TESTS-V2.3-AUDIT.md)).

## Method

- **Setup:** the checks ran in a temporary git worktree of `bd7bd70`, using the repository's
  `node_modules`. The worktree has since been removed, and the main working tree was not
  changed.
- **Each check:**
  1. Apply one minimal break to library source.
  2. Run the kept and removed tests with
     `node --test --test-concurrency=1 --test-timeout=<ms> <files>`.
  3. Restore the source before the next check.
- **Baseline:** before any break, all 21 involved files passed in the worktree (372 test
  cases).
- **Pass rule:** a removal is safe when at least one test that remains fails under the break.
- **Line numbers:** source locations are at `bd7bd70`. Test locations are `test(` call sites in
  `test/unit/`.

## Results

| ID | Break | Kept tests that failed | Proposed-removed tests that failed | Verdict |
| --- | --- | --- | --- | --- |
| B1 | `src/api/pixels.js:124,220`: no disposal check after readback | `patch-lifecycle` "checks disposal before palette conversion" | `pixel-disposal-browser:93` | Safe |
| B2a | `pixels.js:37`: filter pre-cleanup hook not registered | None | None | Inconclusive: the per-pixel `isRemoved` check at `pixels.js:417` already stops the filter, so the hook has no observable effect (Section 5.5 of the report) |
| B2b | `pixels.js:341,367`: queued checks ignore `isRemoved` | `patch-lifecycle:175` "immediate", "between microtasks" | `pixel-disposal-browser:106` | Safe |
| B2c | B2a plus no per-pixel `isRemoved` check | `patch-lifecycle:175` "inside callback" | `pixel-disposal-browser:106` | Safe |
| B3 | `src/renderer/readback.js:90,190`: no disposal check on pending reads | `patch-lifecycle:94`, `pixel-disposal-browser:69` | `ownership-reentrancy-matrix:234`, `ownership-reentrancy-browser:72` | Safe |
| B4a | `src/api/images.js:264`: `removeImage` skips the pending-load cancel | `image-lifecycle:66` | `image-lifecycle-browser:209`, matrix `:193` (`:240`, ownership-browser `:113` passed) | Safe |
| B4b | `images.js:289-290`: handlers not cleared when a load finishes | `image-lifecycle:66`, `:92` | Matrix `:193` only | Safe |
| B4c | `images.js:263`: pending removal keeps the name registered | `image-lifecycle:226`, `image-lifecycle-browser:287`, `:331` (not `:66` or `:92`) | Matrix `:193`, ownership-browser `:113` | Safe while `image-lifecycle:226` stays |
| B5 | `images.js:202,218`: a throwing callback deletes the registration | `image-lifecycle:116` | `image-lifecycle-browser:263` | Safe |
| B6 | `images.js`: wait release moved out of `finally` | `image-lifecycle-browser:109` | `patch-browser:186` fails; `:619` hangs until the test timeout | Safe |
| B7 | `src/core/commands.js`: one throwing ready callback aborts the queue | `patch-lifecycle:260` | `ownership-reentrancy-browser:92` (full fails, lite hangs until the timeout) | Safe |
| B8a | `src/core/plugins.js`: resolver stays marked busy after an init failure | `patch-lifecycle:383` | Matrix `:245` | Safe |
| B8b | `plugins.js`: resolver makes one pass over a snapshot | `patch-lifecycle:383`, `:466` | Matrix `:270` | Safe |
| B9a | `src/api/colors.js`: index bound off by one | `color-validation:50` | `color-validation-browser:80` | Safe |
| B9b | `colors.js`: `setColor` ignores an invalid index silently | `color-validation:50` | `color-validation-browser:80` | Safe |
| B10a | `src/renderer/draw/arcs.js:40`: equal-angle guard disabled | `arc-full-turn:26` | `arc-circle-browser:126` | Safe |
| B10b | `arcs.js:57`: wrapped span negated | `arc-full-turn:33` | None | Safe; the browser test can't see this break |
| B11 | `src/renderer/draw/circles.js:83`: diagonal emits duplicate points | `circle-outline:11`, `:29`, `:41` | `arc-circle-browser:152` | Safe |
| B12 | `src/text/fonts.js:313`: setup failure keeps its wait | `font-publication:114` and the cleanup-failure test | `font-publication-browser:213` | Safe |
| B13a | `src/api/view.js:329`: `pushView` accepts a non-finite `x` | `numeric-boundaries` pushView table | `numeric-boundaries-browser` | Safe |
| B13b | `src/api/blends.js:65`: blend mode not validated | `numeric-boundaries` setBlend table | `numeric-boundaries-browser` | Safe |
| B13c | `src/api/graphics.js`: `rect` accepts a non-finite width | None | `numeric-boundaries-browser` | **Not safe until the case is added to the Node table** (TEST-005) |
| B14a | `src/renderer/textures.js`: cross-context copy unpremultiplies | `alpha-composition-browser:335` (not `:166`, whose layers share one context) | `alpha-composition-browser:122` | Safe while `:335` stays |
| B14b | `src/renderer/batches.js`: image blend uses `SRC_ALPHA` | `alpha-composition-browser:166` | `alpha-composition-browser:122` | Safe |
| B15 | `textures.js:200`: warm static fast path disabled | `static-texture-cache:98` | `context-recovery-browser:105` | Safe |
| B16a | `batches.js:308`: vertices not copied on growth | `batch-reservations:258` and others | `batch-reservations-browser:248` | Safe |
| B16b | `batches.js:309`: colors not copied on growth | About 15 other `batch-reservations` Node tests (not `:258`) | `batch-reservations-browser:248` | Safe |
| B17 | `src/core/screen-manager.js:508`: noCss writes a host style | `patch-browser:256`, `:666` | `patch-browser:432` | Safe |

## Conclusions

- **Removals confirmed:** every proposed removal is covered by a remaining test, except
  B13(c). TEST-005 therefore adds the `rect` width and height cases to
  `numeric-boundaries.test.js` before deleting the browser file.
- **Tests that must stay:** B4c depends on `image-lifecycle.test.js:226`, and B14a depends on
  `alpha-composition-browser.test.js:335`. The report names both as covering tests.
- **Hangs:** under B6 and B7, a regression makes a browser test wait forever instead of fail.
  `scripts/test.js` sets no test timeout, so `npm test` would stop there (TEST-028).
