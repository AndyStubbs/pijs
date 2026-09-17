# Benchmark evidence

`index.json` records archive locations, SHA-256 checksums, and per-file inventories.
Historical campaign names and original paths are retained as evidence identifiers.
The external archives live at `C:\Docs\src\pijs-evidence` and are not provisioned automatically.

To restore an archive, verify its checksum, extract into an empty directory, and verify every
relative file path, byte length, and SHA-256 against the matching `.files.json` inventory.
Never overwrite a newer campaign or edit historical hashes to make a resume succeed.
Use a fresh campaign when the original paths or inputs cannot be reproduced.

The original local qualification evidence is retained under
`test/performance/campaigns/phase6-final-20260916`. Its original readiness report records a
Firefox baseline sprite timeout and an unmeasured candidate. Preserve that result when recording
subsequent diagnosis. Local campaign files are ignored by Git.

See the [benchmark guide](../README.md) for executable workflows and the
[release browser policy](../../README.md#release-browser-coverage) for compatibility requirements.

[Release validation](release-validation.json) records the current checks, Firefox diagnosis,
and cleanup recovery location. The `releaseValidation` entry in `index.json` pins the verified
local archive of logs, diagnostic inputs/results, and the inspected package. Extract ZIP entries
into an empty directory; paths inside these archives are relative to the repository root.
