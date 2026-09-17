# Performance evidence archive

P1, P3, and original helper-based P2 are integrated. The direct-write P2 variant remains an
experiment. Historical qualification results and decisions are preserved in the phase validation
records; this archive preserves the source and measurement evidence behind those records.

## Inventory

The six campaign ZIP files are stored locally at `C:\Docs\src\pijs-evidence`, outside the working
repository. They are not downloaded or provisioned automatically on other machines.
[index.json](index.json) records archive SHA-256 checksums, original locations, and links by filename
to the per-campaign file inventories. Each inventory contains relative paths, lengths, and SHA-256
checksums. All archives were extracted and every file verified before originals were removed.

| Archive | Files | Evidence |
| --- | ---: | --- |
| `phase1-smoke.zip` | 66 | Initial benchmark smoke run |
| `phase1-verified.zip` | 66 | Verified benchmark smoke evidence |
| `phase2-20260916.zip` | 693 | Baseline, P1, P3, combined qualification and regression evidence |
| `phase3-20260916.zip` | 1771 | Original P2 candidate, baseline, qualification, and verification |
| `phase4-20260916.zip` | 2316 | P2 diagnostics, experimental direct-write variant, and qualification |
| `p2-integration-20260916.zip` | 523 | Integrated P2 source and visual validation evidence |

Loose integration logs directly inside `test/performance/campaigns/` were not part of these six
directories and remain in place. Unrelated investigation data and future campaigns are unchanged.

## Phase 6 local evidence

The Phase 6 local pass is retained unarchived at
[`test/performance/campaigns/phase6-final-20260916`](../../../test/performance/campaigns/phase6-final-20260916/readiness.json).
The `localCampaigns` entry in [index.json](index.json) records SHA-256 checksums for its readiness
report, original 2,166-file inventory, and supplemental verification/test evidence. Verify those
index checksums before using the file inventory to verify the individual artifacts. These local
files are ignored by Git and are not provisioned on other machines.

The single primary campaign passed its benefit and regression gates. Overall readiness remains
blocked by a Firefox baseline sprite smoke timeout; no candidate regression was established.
OpenGL, lite, and minified operational smokes passed, with timing conclusions explicitly
inconclusive. See the [Phase 6 validation record](../../upgrade-2.2-phase6-validation.md) for the
complete matrix, intervals, setup evidence, and limitations. Raw campaigns and the original
readiness report are unchanged by the subsequent evidence audit and final tooling guard checks.

## Restore and reproduce

1. Obtain the ZIP from the archive location and compare its SHA-256 with `index.json`.
2. Extract it into an empty directory. ZIP contents are relative to the original campaign root;
   do not add another nested campaign directory. Never overwrite a newer campaign.
3. Compare every extracted relative path, length, and SHA-256 with its `.files.json` inventory.
   Verify there are no additional or missing files.
4. For the reproduction commands in the phase validation records, restore the original campaign
   location recorded in the index, or set their `$phaseRoot` to the restored directory.
5. Run new comparisons into a fresh output directory. Preserve the archived raw results.

Original manifests include absolute paths and hashes of source inputs and measurement tooling.
Historical resume can require the original paths, unchanged inputs, and archived tooling. Do not
edit manifests or hashes to force a resumed run to accept relocated or modified inputs. A fresh
campaign is appropriate when those requirements cannot be met. Recorded interruptions remain
part of the evidence even when a campaign was later completed.

The archives include copied visual runners; normal test discovery excludes their campaign paths
even when restored. Keep future source snapshots outside maintained test-script directories.
