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
| `npm run test:browser` | Browser regression files (`*-browser.test.js`) |
| `npm run test:types` | Fresh declarations, metadata validation, documentation parity, and package-consumer checks |
| `npm run test:visual` | Fresh test build and full, lite, and plugin visual suites |
| `npm run test:visual -- --mode=full` | Full-core visual fixtures |
| `npm run test:lite` | Lite-compatible visual fixtures |
| `npm run test:plugins` | Plugin visual fixtures |
| `npm run test:grep -- "Circle"` | Full-core visuals matching a Playwright title expression |
| `npm run test:lite:grep -- "Circle"` | Matching lite visuals |
| `npm run test:plugins:grep -- "pointer"` | Matching plugin visuals |
| `npm run test:benchmark` | Benchmark-harness tests (`test/unit/benchmark*.test.js`), without measurement campaigns; not part of `npm test` |
| `npm run test:performance-ui` | Performance report browser tests |
| `npm run test:metadata` | Metadata parser and formatting tests |
| `npm run size` | Minified and gzipped bundle, plugin, and differential sizes in `build/size-report.json` |
| `npm run sound:references` | Re-record the Pi.js 2.2 reference renders used by the sound lab |

The complete workflow stops at the first failed stage. Node files run sequentially to limit competing
browser and build processes. Each Node and browser test, and each test file as a whole, has a
120-second limit, so a wait that never settles fails with the test's name instead of stalling the
workflow. Visual workers remain configurable through Playwright arguments:

```sh
npm run test:visual -- --mode=full --workers=4
npm run test:visual -- --list --reporter=list
```

Discovery visits only maintained test locations. Benchmark campaigns and copied repositories are
outside discovery. `--list` does not build artifacts or start a server.

## Suite layout

Suites are named for the subject they cover. Logic belongs in a Node test (`<subject>.test.js`)
that loads the real source module into a `vm` context with stubbed imports; the browser partner
(`<subject>-browser.test.js`) keeps only what needs a browser, such as WebGL output, DOM layout,
real image decoding, and the public API wiring of the full and lite bundles. For example,
`pixels.test.js` checks readback and filter lifetimes against stubs, and
`pixel-disposal-browser.test.js` checks the same contracts through `removeScreen()` in a page.

Shared helpers:

| Helper | Provides |
| --- | --- |
| `test/unit/vm-module-harness.js` | `loadModule()` for Node tests, plus the pixel, ready-queue, and plugin-registry harnesses |
| `test/unit/browser-source-harness.js` | Fresh in-memory bundles; `useBrowserBundles()` builds full and lite, launches Chromium, and returns a `probe()` that fails on unexpected page errors |
| `test/unit/rasterization-harness.js` | Arc and circle point capture |
| `test/unit/chromium-launch.js` | `launchChromium()` and the renderer flags (`--disable-gpu --enable-unsafe-swiftshader`) that every Chromium browser test and the visual suite use, so WebGL renders with SwiftShader on every platform. Launch Chromium through it, not with `chromium.launch()`. The benchmark keeps its own flags |
| `test/unit/audio-*.js` | Audio engines, render harness, sample fixtures, metrics, and tolerances |

Screen lifecycle, shader samplers, plugin installation, and pointer and keyboard behavior each
have their own browser suite. Pointer and keyboard suites are owned by their plugin workstreams.

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
| WebKit 26 (Playwright, Windows) | No | No | Stream-mode (media element) lifecycle tests only |

Playwright's Windows WebKit build has no `AudioContext` or `OfflineAudioContext`. Render
coverage for WebKit needs a platform whose WebKit build includes Web Audio, and Safari needs
manual listening. Firefox also lacks `AudioParam.cancelAndHoldAtTime()`.

The harness also records AudioParam automation calls and source lifetimes through prototype
wrappers (`probes()`, `sources()`, `liveSources()`), withholds timers to simulate a stalled main
thread (`holdTimers()`), advances wall time while the audio clock is frozen (`advanceWall()`),
re-locks a locked-context document (`simulateInterruption()`), and renders unmodulated
carriers for reference checks (`renderCarrier()`). A carrier is either an oscillator or a replay
of a recorded buffer source (`{ sourceId }`) with its buffer, loop, start time, and start
offset, which is how noise voices get their references. Each load waits for offline renders the page
started, such as the sound plugin's compressor probe. Suites share their per-engine setup
through `test/unit/audio-browser-suite.js`:

| Test | Covers |
| --- | --- |
| `audio-render-browser.test.js` | Harness behavior, state masking, determinism |
| `audio-voices-browser.test.js` | Envelopes, stops, steals, caps, late starts, locking |
| `audio-bus-browser.test.js` | Limiter ceiling and quality, master volume, `setBusVolume()` and its service method |
| `audio-sound-design-browser.test.js` | Noise spectra and buffers, pan law, sweep endpoints |
| `audio-samples-browser.test.js` | Decoded sample position, pause/resume, setAudio, late starts, shared caps |
| `audio-service-browser.test.js` | Sound extension service contracts with stub sources, inserts, and bus inserts |
| `audio-advanced-browser.test.js` | `sound-advanced` synth features, periodic noise, bus effects, levels, presets, instruments |
| `sound-envelope.test.js`, `sound-admission.test.js` | Envelope math and slot admission (Node) |
| `sound-advanced.test.js` | Pulse tables, LFSR, synth options, preset and instrument snapshots (Node) |
| `sound-noise.test.js` | Noise buffers: spectra, peak, loop seam, sharing, offsets (Node) |
| `sound-samples.test.js` | Sample position model: budgets, rate segments, end prediction (Node) |
| `audio-lifecycle.test.js` | Sample loading, retries, removal, IDs, validation (Node sandbox) |

Sample tests load generated 16-bit chirp WAV files through `blob:` URLs
(`test/unit/audio-sample-fixtures.js`). Their references integrate the content position per
frame from the rate schedule, so a position error of one frame fails the check.

`audio-lifecycle-browser.test.js` checks readiness and removal with controlled `fetch` results
and media events in the full and lite bundles, without the render harness.

`describeAudioEngines()` accepts `{ "plugins": [ ... ] }` to load plugin source bundles after
the full bundle in every page. `sound-advanced-bundles-browser.test.js` checks the plugin's IIFE
and ESM bundles beside the full bundle and beside the lite bundle with the `sound` plugin.

Stream mode cannot run offline, because `OfflineAudioContext` has no
`createMediaElementSource`. `audio-stream-browser.test.js` therefore plays through a real
`AudioContext` in Chromium and Firefox, launched with autoplay allowed
(`launchEngine( name, { "realtimeAudio": true } )`), from generated WAV files served by
`test/scripts/test-server.js` with byte-range support so media elements can seek. It checks
readiness at `canplay`, media event order, element positions after play, pause, resume, rate
changes, and replacement, rate limits, and audibility at rates 0.25 and 4 through an analyser
tap. Positions are compared with elapsed wall time, within 50 ms in Chromium and 120 ms in
Firefox, whose media start lags by up to 89 ms. The same file checks a decoded instance's
rendered position after a rate change against the position model within 0.05 s of content,
which is the realtime check on the scheduling lead. WebKit is skipped.

Focused level and timing checks call `setSoundLimiter( false )`: Chromium's compressor delays
its output by about 6 ms, and the limiter changes levels above its threshold.

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
2. With the master volume at 0.75, play A and B for every preset. B runs the 2.3 translation
   of the recorded call. They should match in pitch, length, and level; the 2.3 envelope
   curves differ slightly, and neither should click at onset or stop.
3. Sweep the synth controls, including zero attack and release, pan, and the frequency sweep,
   and listen for clicks. Stop sounds while they play, and toggle the limiter before playing.
4. Play white and pink noise, and use Pan sweep to check that the level stays even through
   center. Compare the noise pitch prototype (B) with the core call (A).
5. Record the engine version and anything that differs between A and B.
6. Open `test/demos/sound_samples_01.html`. Play one-shots, the scatter and burst, and a loop
   while moving the volume, rate, and pan sliders; pause and resume it, including before a
   delayed start. Play and replace the stream, change its rate, and pause and resume it. Run
   the synth flood with loops playing, then fill 64 loops and confirm that new sounds are not
   played. Listen for clicks at every start, stop, pause, resume, and replacement.

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

Full mode contains 35 HTML fixtures, lite selects 20 of those, and plugins contains 8.
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
documented at the top of `test/scripts/run-visual-tests.js`. `expectPageError` allowlists one
intentional uncaught error by its exact message. Other uncaught page errors fail independently of
pixels.

The runner loads the page, waits for `$.ready()` and for fixture assertions
(`window.patchResult`), then the metadata delay, scripted input, and two animation frames before
capture. `expectPatchResult` requires `patchResult` to resolve to that number.
`waitUntil` (a Playwright load state) and `renderWait` (a fixed wait in milliseconds instead of the
animation frames) are only for a fixture whose approved baseline depends on capture timing.

Images must have identical dimensions. Pixels whose summed RGBA difference exceeds 6 count as
different; fewer than 0.1% of pixels may differ.

Run the focused visual command, inspect its candidate PNG, and explicitly approve it only if correct.
Approved PNGs live in `test/tests/screenshots/`. Missing baselines require this review before the
complete suite can pass. For mismatches, inspect per-mode logs and traces as well as the comparison
page; browser and graphics-backend differences can affect rendering.

For manual exploration, start `npm run server` and browse `/test/tests/html-core/`
or `/test/tests/html-plugins/`.
