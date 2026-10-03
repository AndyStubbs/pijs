# Pi.js 2.3 Evidence Archive

Evidence for the Pi.js 2.3 plans in [`../plans/v2.3/`](../plans/v2.3/ROADMAP.md), archived when
2.3.0 was released on 2026-10-03. Each folder's `README.md` holds that workstream's method,
measurements, and manual check results.

| Folder | Workstream |
| --- | --- |
| [ci-2.3](ci-2.3/README.md) | Cross-platform and CI/CD |
| [core-2.3](core-2.3/README.md) | Core |
| [gamepad-2.3](gamepad-2.3/README.md) | Gamepad |
| [keyboard-2.3](keyboard-2.3/README.md) | Keyboard |
| [pointer-2.3](pointer-2.3/README.md) | Pointer |
| [sound-2.3](sound-2.3/README.md) | Sound |
| [tests-2.3](tests-2.3/README.md) | Test suite |

## Files not kept here

The READMEs and plans name files that are not in this archive:

- **Probe scripts and raw output:** each folder's `probes.js` and `probes-output.json`, the
  `size-*.json` reports, `core-2.3/contracts-2.2.json`, and the `tests-2.3` timing, flake, and
  coverage-map JSON files. The READMEs keep their results. The files are in the repository at
  tag `v2.3.0`, under `docs/evidence/`; for example,
  `git show v2.3.0:docs/evidence/core-2.3/probes.js`.
- **Device-check pages:** each input plugin's `device-check.html` is now
  `test/tests/html-manual/device_check_<plugin>_01.html`, since the manual device passes still
  use them.

The `ci-2.3` JSON records are kept: they were measured on the Linux, Windows, and macOS runners,
and `test/unit/audio-tolerances.js` cites them for its calibration.

Paths in the READMEs and plans were updated for this archive and for the device-check pages.
Commands that write to a removed file, and steps that run a removed probe script, describe how
the evidence was gathered and no longer run as written.
