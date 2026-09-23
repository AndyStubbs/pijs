# Correctness testing

Install Node 18+, run `npm install`, and install Chromium with `npx playwright install chromium`.
The audio browser tests also need Firefox and WebKit: `npx playwright install firefox webkit`.
Run commands from the repository root. The command wrappers work on Windows and POSIX without
shell-specific environment assignments.

## Commands

| Command | Coverage |
| --- | --- |
| `npm test` / `npm run test:all` | Fresh test build, Node tests, browser regressions, metadata/types, then all visual modes |
| `npm run test:unit` | Immediate Node test files in the maintained unit and script-test directories |
| `npm run test:browser` | Browser regression files, including benchmark-tool browser correctness |
| `npm run test:types` | Fresh declarations, metadata validation, documentation parity, and package-consumer checks |
| `npm run test:visual` | Fresh test build and full, lite, and plugin visual suites |
| `npm run test:visual -- --mode=full` | Full-core visual fixtures |
| `npm run test:lite` | Lite-compatible visual fixtures |
| `npm run test:plugins` | Plugin visual fixtures |
| `npm run test:grep -- "Circle"` | Full-core visuals matching a Playwright title expression |
| `npm run test:lite:grep -- "Circle"` | Matching lite visuals |
| `npm run test:plugins:grep -- "pointer"` | Matching plugin visuals |
| `npm run test:patch` | Fresh test build, Node tests, and browser regressions |
| `npm run test:benchmark` | Benchmark-tool correctness tests, without measurement campaigns |
| `npm run test:performance-ui` | Performance report browser tests |
| `npm run test:metadata` | Metadata parser and formatting tests |
| `npm run size` | Minified and gzipped bundle, plugin, and differential sizes in `build/size-report.json` |
| `npm run sound:references` | Re-record the Pi.js 2.2 reference renders used by the sound lab |

The complete workflow stops at the first failed stage. Node files run sequentially to limit competing
browser and build processes. Visual workers remain configurable through Playwright arguments:

```sh
npm run test:visual -- --mode=full --workers=4
npm run test:visual -- --list --reporter=list
```

Discovery visits only maintained test locations. Benchmark campaigns and copied repositories are
outside discovery. `--list` does not build artifacts or start a server.

## Release browser coverage

Chromium runs the complete correctness workflow and full/lite/plugin visual suites.
Run `npm run test:firefox` for targeted rendering, sprites, shaders, context recovery,
CSS sizing, and keyboard/mouse input checks. Install Firefox with
`npx playwright install firefox` first. Browser versions and results are saved under
`test/test-results/firefox/`. This check uses assertions, without Chromium PNG baselines.

Safari itself is not tested because macOS hardware is unavailable. WebKit coverage comes from
Playwright's WebKit build as described below; iOS-specific audio behavior needs a device.

### Audio engines

The audio browser tests (`audio-*-browser.test.js`) run in Chromium, Firefox, and WebKit from
`npm run test:browser`. Set `PI_AUDIO_ENGINES` to a comma-separated subset, such as
`chromium,firefox`, while iterating. A missing engine fails with the install command.

The offline render harness (`test/unit/audio-render-harness.js`) replaces the page's
`AudioContext`, timers, clocks, `Math.random`, and visibility before any bundle loads, then renders
into an `OfflineAudioContext`. Engine support determines which tests run; the rest skip with the
reason in the test output:

| Engine | Web Audio | Offline `suspend()` | Harness coverage |
| --- | --- | --- | --- |
| Chromium 141 | Yes | Yes | All renders, including clock-driven tests |
| Firefox 142 | Yes | No | Single-pass renders; clock-driven tests skip |
| WebKit 26 (Playwright, Windows) | No | No | Media-element lifecycle tests only |

Playwright's Windows WebKit build has no `AudioContext` or `OfflineAudioContext`. Render
coverage for WebKit needs a platform whose WebKit build includes Web Audio, and Safari needs
manual listening. Firefox also lacks `AudioParam.cancelAndHoldAtTime()`.

Click checks compare renders with a reference carrier multiplied by an independent oracle
envelope (`test/unit/audio-metrics.js`). Tolerances are recorded per metric and engine in
`test/unit/audio-tolerances.js`; run the calibration test with `PI_AUDIO_CALIBRATE=1` to print
the observed extremes before changing them.

`npm run sound:references` re-records the Pi.js 2.2 reference renders in
`test/media/sound-2.2/` from the frozen `releases/pi-2.2.0/pi.js` bundle.

### Listening check

Each sound phase closes with a listening pass in every engine. Run `npm run build` and
`npm run server`, then open the sound lab in each engine:

| Engine | Command |
| --- | --- |
| Chromium | `npx playwright cr http://localhost:8080/test/demos/sound_lab_01.html` |
| Firefox | `npx playwright ff http://localhost:8080/test/demos/sound_lab_01.html` |
| WebKit | `npx playwright wk http://localhost:8080/test/demos/sound_lab_01.html` |

In each engine:

1. Click the page once so the browser allows audio.
2. With the master volume at 0.75, play A and B for every preset. They should match in pitch,
   length, and level, with no clicks at onset or stop.
3. Sweep the synth controls, including zero attack and short decay, and listen for clicks.
4. Record the engine version and anything that differs between A and B.

Playwright's Windows WebKit has no Web Audio, so the WebKit pass uses Safari on macOS or iOS, or
Playwright WebKit on a platform whose build includes Web Audio.

Additional browser/GPU performance campaigns are optional follow-up work. Performance claims
must identify the measured browser, hardware, and workload. A benchmark timeout needs diagnosis;
it is not interchangeable with a failed compatibility assertion.

## Artifacts and review

Correctness builds use `node scripts/build.js --test-only`. Metadata generation uses
`node scripts/generate-metadata.js --test-only`. These write ignored build artifacts without
publishing release files or updating documentation. A stale checked-in declaration fails parity
validation; use the explicit metadata-generation workflow and review the resulting changes.

Visual runs start their own read-only loopback server on an available port and close it when the
child process finishes or is interrupted. No manually started server is needed for validation.
Existing browser regressions that intercept localhost requests keep their isolated source harness.

Each visual mode (`full`, `lite`, `plugins`) has independent outputs:

- `test/test-results/<mode>/results.html`: comparison and baseline-review page.
- `test/test-results/<mode>/summary.json`: unique outcomes, attempts, and pending approvals.
- `test/test-results/<mode>/screenshots/`, `logs/`, and `traces/`: diagnostic artifacts.
- `test/playwright-report/<mode>/`: Playwright HTML report.

Full mode contains 36 HTML fixtures, lite selects 22 of those, and plugins contains 9.
Each selected fixture runs once by default. Playwright lists these as tests in one JavaScript
runner file. Explicit `--repeat-each` repetitions are separate executions; retries are attempts
within an execution. Copied runners under benchmark campaigns are excluded from discovery.
Legacy report URLs redirect to the current full or plugin report through the development server.

The console prints selected tests and workers once. Completion markers count unique tests:
`.` passed, `R` flaky, `F` failed, `T` timed out, `I` interrupted, and `S` skipped. Retries are
reported separately. Local runs have no automatic retries; CI allows two retries.

For interactive review, run `npm run server` and open
`http://localhost:8080/test/test-results/full/results.html` (substitute the desired mode).
Compare the candidate with the approved PNG before explicitly choosing an approval/reset action.
The action promotes only that mode's candidate to the shared approved baseline directory.
Never approve changed images merely to make a test pass.

Missing baselines produce candidate screenshots and a pending-review result. Focused visual runs
allow this review workflow; `npm test` fails while baseline approvals remain outstanding. Rerun
validation after any deliberate baseline change.

## Performance and integration evidence

Correctness tests do not establish performance benefits. Run measurement campaigns separately,
without competing correctness jobs, following [the benchmark protocol](performance/README.md).
P1, P3, and original helper-based P2 are integrated; the direct-write P2 variant is experimental.
Historical campaigns are listed in the [evidence archive index](performance/evidence/README.md).

## Adding visual fixtures

Put HTML fixtures in `test/tests/html-core/` or `test/tests/html-plugins/`. Include TOML metadata:

```html
<script type="text/toml">
	[[TOML_START]]
	file = "circle_01"
	name = "Circle Test 01"
	width = 320
	height = 200
	delay = 0
	lite = true
	[[TOML_END]]
</script>
```

Use `lite = true` only for core fixtures that work with the lite bundle. Initialize drawing through
`$.ready()`. The optional `commands` string simulates input before capture; supported commands are
documented at the top of `scripts/run-visual-tests.js`. `expectPageError` allowlists one intentional
uncaught error by its exact message. Other uncaught page errors fail independently of pixels.

The runner waits for fixture assertions (`window.patchResult`), the metadata delay, scripted input,
and rendering before capture. Images must have identical dimensions. Pixels whose summed RGBA
difference exceeds 6 count as different; fewer than 0.1% of pixels may differ.

Run the focused visual command, inspect its candidate PNG, and explicitly approve it only if correct.
Approved PNGs live in `test/tests/screenshots/`. Missing baselines require this review before the
complete suite can pass. For mismatches, inspect per-mode logs and traces as well as the comparison
page; browser and graphics-backend differences can affect rendering.

For manual exploration, start `npm run server` and browse `/test/tests/html-core/`
or `/test/tests/html-plugins/`.
