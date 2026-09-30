# Library Size Reduction Review

Review date: 2026-09-29. Source version: 2.3.0.

This is an engineering assessment and proposal document, not an API reference. It reviews the
current library and measures possible changes without implementing them. "Lite" means the
core-only `pi.lite` bundle; there is no separate lite plugin in this source tree.

## Recommendations

Start with direct module initialization and build-time GLSL compaction. They offer measurable
savings with limited implementation scope. Shared error construction, compact palette data,
and shorter banners offer smaller improvements and deserve individual validation.

For a substantially smaller lite bundle, keep the renderer and synchronous default font, then
make additional fonts, BASIC `draw()`, and flood fill optional. A combined omission probe with
direct initialization reduces lite from **49,710 to 41,300 bytes gzip**, a saving of **8,410
bytes (16.9%)**. Removing text as well reaches **35,995 bytes gzip**, saving **13,715 bytes
(27.6%)**. These are measured design budgets, not completed plugin implementations.

For full, the largest composition choice is sound: omitting its existing plugin saves
**15,240 bytes gzip**. A custom feature selection or an additional slim distribution can offer
this saving without immediately changing the existing full distribution. Changing current
full or lite defaults, or removing existing APIs, belongs in a future major-release proposal.

Moving a feature into a plugin saves downloads for consumers who omit it. If full continues
bundling the feature, its size does not receive the omission saving and may gain registration
overhead. Consumers loading core plus several separate plugins also lose some shared compression.

## Measurement method and baseline

Measurements were reproduced from the current checkout using Node **22.19.0** and esbuild
**0.25.10**. The main-bundle options come from
[build.js](../../scripts/build.js), and the baseline was independently reproduced through
[size.js](../../scripts/size.js). Every measurement uses:

- Browser platform, ES2020 target, bundled and minified IIFE output.
- The current full or lite banner, version injection, shader text loader, and WebP data loader.
- In-memory builds with `write: false`, retaining the normal source-map URL comment.
- Gzip level 9, matching [size-utils.js](../../scripts/size-utils.js).
- The same output filename for each bundle's baseline and variants.

| Bundle | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| Full: `pi.min.js` | 223,423 | 78,093 |
| Lite: `pi.lite.min.js` | 141,325 | 49,710 |

Baseline reproduction from the repository root, without writing a report or release artifacts:

```powershell
@'
import * as g_size from "./scripts/size.js";
const report = await g_size.createSizeReport( { "differentials": [] } );
console.log( JSON.stringify( report, null, 2 ) );
'@ | node --input-type=module
```

Variants intercepted source reads with an esbuild `onLoad` plugin and transformed only the
in-memory contents. No source, generated bundle, release artifact, or baseline image was changed
to measure them. Variant compilation succeeded; browser behavior and performance were **not
validated**. Feature omissions can leave an unusable configuration and are evidence of retained
code cost, not evidence that a feature can safely be deleted as measured.

Each saving is baseline minus variant. **Do not add independent gzip savings**: compression
context, identifier allocation, retained helpers, and namespace exports change between builds.
Combined profile numbers below were built separately. Plugin registration, renderer service
hooks, compatibility shims, and retained dependencies can change the final saving.

These numbers measure JavaScript bytes and gzip transfer bytes, excluding separately requested
source maps. Source maps, duplicate distribution formats, and release contents affect package
download or installation size separately. They do not reduce the JavaScript fetched by a page
that already requests one minified bundle. Brotli and ESM sizes were not measured in this review.

### Largest retained modules

These are esbuild metafile `bytesInOutput` contributions for minified lite. They are useful for
locating work, but **are not gzip costs or promised savings from removing a file**.

| Lite source module | Minified contribution |
| --- | ---: |
| [Screen manager](../../src/core/screen-manager.js) | 12,512 B |
| [Batches](../../src/renderer/batches.js) | 11,730 B |
| [Images](../../src/api/images.js) | 8,940 B |
| [Colors](../../src/api/colors.js) | 8,496 B |
| [Textures](../../src/renderer/textures.js) | 8,102 B |
| [Shaders](../../src/renderer/shaders.js) | 7,662 B |
| [Renderer](../../src/renderer/renderer.js) | 6,868 B |
| [Graphics wrappers](../../src/api/graphics.js) | 6,752 B |
| [Post-FX API](../../src/api/postfx.js) | 5,937 B |
| [Plugin system](../../src/core/plugins.js) | 5,506 B |

In full, [sampled audio](../../plugins/sound/samples.js) contributes 13,718 minified bytes,
[voices](../../plugins/sound/voices.js) 10,634, and
[BASIC music](../../plugins/sound/play.js) 8,220. Together with the core modules above, these
explain why renderer boundaries, text assets, and sound composition deserve more attention than
individual primitive drawing routines.

## Compatible optimization candidates

The order below prioritizes implementation safety and useful savings. Effort and risk describe
the proposed production change; passing an in-memory build alone does not establish compatibility.

| Rank | Candidate | Full gzip saving | Lite gzip saving | Effort / risk |
| --- | --- | ---: | ---: | --- |
| 1 | Direct initialization | 1,085 B | 1,038 B | Low / low |
| 2 | GLSL compaction | 633 B | 615 B | Low / medium |
| 3 | Shared error construction | 683 B | 573 B | Medium / medium |
| 4 | Compact palette data | 353 B | 334 B | Low / low |
| 5 | Shorter banners | 360 B | 209 B | Low / low |

### 1. Initialize modules directly

**Source:** [index.js](../../src/index.js), `m_mods` and its initialization loop.

The entry point puts imported module namespaces into an array and dynamically reads `mod.init`.
This retains namespace objects and exposes exports beyond the initialization functions. Replace
that dispatch with explicit namespace calls in the same order. Keep namespace imports, as required
by the repository conventions. `utils` has no `init()` and needs no initialization call.

**Probe:** replace the array and loop with the 15 existing `init( m_api )` calls, ordered exactly
as today. Lite becomes 138,611 minified / 48,672 gzip bytes; full becomes 220,721 / 77,008.

**API and risk:** no intended public change. Startup order, command installation, screen hooks,
and globals must remain identical. Do not remove the utility namespace exposed to plugins or
exports used by other source modules merely because they appear unused at the entry point.

**Validation:** metadata/runtime parity, settings, plugin installation, full/lite IIFE and ESM
loading, source routing, font publication, and readiness. This is the first recommended change.

### 2. Compact bundled GLSL during the build

**Source:** shader text loaders in [build.js](../../scripts/build.js) and
[build-plugin.js](../../scripts/build-plugin.js), plus the
[point fragment shader](../../src/renderer/shaders/point.frag).

JavaScript minification does not remove comments inside imported shader strings. Compact the
library-owned `.vert` and `.frag` inputs at build time while keeping readable source files.
Apply the same loader policy to core and plugin builds. Public caller-provided custom shader
strings should retain their existing handling.

**Probe:** remove block and line comments, trim each line, collapse repeated spaces/tabs inside
lines, remove blank lines, and join remaining lines with newlines. This saves 1,378 minified
bytes in either main bundle and the gzip amounts in the table.

**API and risk:** preserve `#version` and preprocessor line boundaries and prevent comments from
joining adjacent tokens. The simple probe works as a size experiment; production handling must
be safe for the supported shader syntax. Compiler line numbers can differ in compacted shaders.

**Validation:** compilation, orientation, samplers, premultiplied alpha, noise, context recovery,
and full/lite/plugin visual suites. Confirm valid emitted GLSL rather than accepting a JavaScript
build as shader validation.

### 3. Share error construction, preserving validation

**Source:** repeated error blocks across [src](../../src), especially
[graphics.js](../../src/api/graphics.js), [colors.js](../../src/api/colors.js), and
[screen-manager.js](../../src/core/screen-manager.js). Sound already uses local error helpers.

A small internal helper can construct the supplied error class, assign its code, and throw it.
Keep all checks and message expressions; reducing error boilerplate does not require weakening
validation or shipping an unchecked default build.

**Probe:** a TypeScript AST pass replaced only three consecutive statements: a local `error`
initialized by `new Error`, `new TypeError`, or `new RangeError` with one argument; assignment to
`error.code`; and `throw error`. The helper used a namespace import. It saves 4,446 minified
bytes in lite and 4,703 in full, but only 573 and 683 gzip bytes because repeated syntax already
compresses well.

**API and risk:** retain the error class, code, exact message, evaluation order, and throw timing.
Stack traces will include the helper. Leave specialized errors with additional fields, causes,
or custom cleanup in their existing form. Benchmark valid drawing calls if this refactor also
changes wrapper structure; the probe itself only changes failure paths.

**Validation:** numeric boundaries, colors, settings, screen/font/image lifecycles, plugin failure
contracts, and audio validation. Compare error messages and codes explicitly.

### 4. Pack the default palette representation

**Source:** [colors.js](../../src/api/colors.js), `init()` and `defaultPaletteHex`.

Represent the palette as one contiguous six-digit hex string, then split it into RGB entries
and restore the `#` prefixes before passing it through the existing palette construction.

**Probe:** replace the string array with concatenated RGB hex values and
`.match( /.{6}/g ).map( color => "#" + color )`. This saves 978 minified bytes in either bundle.

**API and risk:** retain every value, duplicate entry, position, reserved transparent entry, and
default color. The small decoding cost happens at startup. Do not regenerate the palette with
an approximate color formula or reduce its length as a compatible optimization.

**Validation:** compare the complete resulting palette and default color, test palette mutation
and index lookup, and run palette-dependent visuals.

### 5. Shorten production banners

**Source:** `getFullBanner()` and `getLiteBanner()` in [build.js](../../scripts/build.js).

Keep descriptive feature lists in documentation and use a compact production banner. The probe
used `/*! Pi.js v2.3.0 | Andy Stubbs | Apache-2.0 */`. Its saving is small; preserve the project's
required attribution and license distribution, and verify release tooling before adopting it.

**API and risk:** no runtime API change. Version/banner checks and packaging expectations may
depend on the current text. Source-map URL removal is a separate, much smaller consideration.

**Validation:** build and size-script tests, version/banner validation, and release checks when
an actual release is prepared.

## Optional core features and lite profiles

The following probes omit imports and initialization from the entry point, except the font
asset probe, which edits only default-font loading in memory. They do not build replacement
plugins. The savings therefore exclude plugin wrappers and any new core extension interface.

| Candidate | Full gzip saving | Lite gzip saving | Effort / risk |
| --- | ---: | ---: | --- |
| Additional fonts | 6,636 B | 6,030 B | Low-medium / breaking defaults |
| All bitmap text | 11,845 B | 11,196 B | Medium / breaking API |
| BASIC drawing | 702 B | 641 B | Low-medium / breaking API |
| Flood fill | 597 B | 539 B | Medium / breaking API |
| Pixel API | 1,375 B | 1,248 B | Medium / breaking API |
| Post-FX registration only | 1,106 B | 1,062 B | High for full split |

### Additional bundled fonts: strongest small-scope lite reduction

**Source:** [fonts.js](../../src/text/fonts.js), `loadDefaultFonts()`, and the four WebP imports.
The synchronous [6x8 default font](../../src/text/fonts/font-6x8.js) remains included.

Create an optional font pack containing 6x6, 8x8, 8x14, and 8x16 assets. A smaller lite profile
would load only the default 6x8 font. The asset-only probe produces 132,771 / 43,680 bytes in
lite and 214,869 / 71,457 in full.

**Affected APIs and risk:** `getAvailableFonts()`, `setFont()`, `setDefaultFont()`, and readiness.
The current default is loaded after 6x6, so simply removing that load changes its numeric ID
from 1 to 0. Moving the other assets also changes available IDs and when asynchronous image
loads enter `ready()`. Define a deliberate font identification/loading contract for the new
profile; do not claim transparent compatibility with applications using numeric default IDs.
Keep synchronous default text working immediately. Merely decoding WebP lazily without changing
its static imports will not remove the embedded asset bytes from the bundle.

**Validation:** font list and IDs for each distribution, immediate default printing, plugin load
order, readiness success/failure, `setChar()`, texture invalidation, and text visuals.

### Entire bitmap text subsystem: larger, more disruptive option

**Source:** [fonts.js](../../src/text/fonts.js), [print.js](../../src/text/print.js), and their
entry-point initialization. Removing both includes the additional-font saving above.

A text plugin could own fonts, cursor state, word wrapping, and printing. It needs shared
texture, draw, view, clear, and scrolling facilities. Keep low-level facilities in core only
where the renderer or other APIs need them; move text-only work with the plugin. A standalone
plugin must not bundle the main entry point or a second renderer to obtain those facilities.

**Affected APIs and risk:** font commands, `setChar()`, `print()`, position and grid-size getters,
word-break settings, print sizing, and `calcWidth()`. Existing examples relying on immediate
printing need the plugin. Late installation must correctly initialize existing screens.

**Validation:** font publication, readiness, wrapping and scrolling, clip/origin handling,
multiple screens, plugin installation before and after screen creation, and text visuals.

### BASIC drawing and flood fill: good optional utility candidates

**Source:** [draw.js](../../src/api/draw.js), `draw()`; and
[paint.js](../../src/api/paint.js), `paint()`.

Move the BASIC string interpreter and its cursor/angle state into a drawing-language plugin.
Its work largely delegates to existing screen APIs, making it a relatively clean boundary.
Move flood fill into a pixel-editing plugin that can obtain ordered readback, view transforms,
color matching, and pixel upload through a small shared interface.

**Affected APIs and risk:** `draw()` and `paint()`, including BASIC paint instructions that
invoke painting. A drawing-language plugin must declare or handle that dependency. Flood fill
must preserve tolerance, boundary color, clipping, alpha, and command ordering. Avoid importing
core internals in a way that duplicates renderer code in a separately loaded plugin.

**Validation:** drawing-string commands and cursor behavior, paint-dependent BASIC instructions,
fill boundaries/tolerance, views, context loss, and the corresponding visuals in plugin mode.

### Pixel APIs: optional editing, while retaining necessary renderer readback

**Source:** [pixels.js](../../src/api/pixels.js), its `init()` and command registration;
[readback.js](../../src/renderer/readback.js); and
[images.js](../../src/api/images.js), screen-region capture.

Consider a pixel-editing plugin for `getPixel`, `getPixelAsync`, `get`, `getAsync`, `filterImg`,
and `put`. Removing `pixels.init()` also removes the separately installed hot-path `put()`.
The probe retains readback and texture code reached by images, painting, and the renderer.
Removing the entire readback file is not justified by the measured saving.

**API and risk:** preserve the direct `put()` calling convention and optimized path rather than
forcing it through generic command parsing. Deferred reads and filters must still respect screen
disposal and context generations. Smaller sub-splits, such as filters only, remain unmeasured.

**Validation:** pixel logic and disposal tests, alpha conversion, views, filtering, read ordering,
and pixel visuals. Measure the actual retained helpers after a real split.

### Custom shaders: a renderer boundary change, not just an import removal

**Source:** [postfx.js](../../src/api/postfx.js),
[renderer.js](../../src/renderer/renderer.js), [batches.js](../../src/renderer/batches.js),
[shaders.js](../../src/renderer/shaders.js), and [textures.js](../../src/renderer/textures.js).

Removing `postfx` from entry-point initialization saves only 1,062 gzip bytes in lite.
`renderer.restoreContext()` still directly calls `restoreDisplayShaderBindings()`; batches retain
shader pass execution and custom display presentation; shader reflection and custom sampler
texture handling remain reachable. This number is a partial omission result, not the saving
from a completed shader plugin.

Move the handle registry, uniform reflection/validation, custom shader diagnostics, sampler
support unique to post-FX, and shader-pass execution behind an explicit renderer extension
boundary. Core retains its built-in shaders and default presentation. The extension needs
ordered render-pass execution, presentation, restoration, and cleanup hooks; existing screen
initialization hooks alone do not supply those responsibilities. Measure the resulting core
plus extension cost before deciding whether this high-effort split is worthwhile.

**Affected APIs and risk:** `createShader`, `removeShader`, `getShaderInfo`, `applyShader`,
`setDisplayShader`, and `setDisplayShaderUniforms`. Preserve draw order, sampler source lifetime,
feedback restrictions, uniform snapshots, shader deletion, and context restoration. Avoid a
dependency from core back into the optional plugin, which would defeat the split.

**Validation:** shader samplers/orientation, alpha, context recovery, screen disposal, multiple
contexts, and full/lite/plugin shader visuals. Final extraction savings are **unmeasured**.

### Combined lite options

| Profile probe | Minified bytes | Gzip bytes | Gzip saving |
| --- | ---: | ---: | ---: |
| Current lite | 141,325 | 49,710 | 0 |
| Default font; omit BASIC draw and paint; direct init | 126,008 | 41,300 | 8,410 |
| Omit all text, BASIC draw and paint; direct init | 112,853 | 35,995 | 13,715 |

Both probes retain pixel APIs and custom shader support. They do not include GLSL compaction,
error helpers, palette packing, or banner changes. These figures are not sums of table rows.

Recommend the default-font profile first: it retains immediate text for small programs while
removing substantial asset cost. The text-free profile suits applications supplying their own
text solution. Offer an additional opt-in distribution first if current lite compatibility must
be retained; changing the existing lite contract is a major-release choice. Full can continue
bundling the optional feature plugins, preserving its feature coverage.

## Full distribution and sound composition

### Existing full plugins can already be omitted

**Source:** the side-effect imports in [index-full.js](../../src/index-full.js).
Each row removes exactly one of these imports while retaining the usual full banner.

| Plugin omitted | Resulting full gzip | Gzip saving | Standalone plugin gzip |
| --- | ---: | ---: | ---: |
| Sound | 62,853 B | 15,240 B | 15,653 B |
| Pointer | 73,230 B | 4,863 B | 5,547 B |
| Keyboard | 74,575 B | 3,518 B | 4,224 B |
| Gamepad | 75,616 B | 2,477 B | 3,090 B |
| Polygons | 76,616 B | 1,477 B | 1,846 B |

**Approach:** support or document choosing lite plus required plugins, or offer a build-time
feature manifest that imports only the requested plugins. No new extraction is necessary for
these five features. The currently bundled ESM entry also initializes the API and registers
plugins through side effects; importing just the API object does not provide reliable
per-command tree shaking. A source composition interface would need explicit registration
boundaries, not just a different output format. Its implementation savings are unmeasured.

**Affected APIs and risk:** all commands supplied by each omitted plugin and their settings or
event types. Keyboard owns its input API; pointer owns mouse/touch/press/wheel behavior;
gamepad owns gamepad support; polygons supplies polygon drawing; sound supplies audio commands.
Lite itself is unaffected because these plugins are already absent. A default full composition
change is breaking. Standalone plugin sizes are not their marginal cost inside full.

**Validation:** runtime metadata and distribution declarations, source routing, plugin guides,
plugin installation, input lifecycle/browser suites, polygon bundles, audio suites, and plugin
visuals. Verify selected combinations rather than assuming each plugin's standalone checks
cover its integration into a custom distribution.

[Sound-advanced](../../plugins/sound-advanced/index.js) is already optional and is not imported by
full. It measures 36,618 minified / 13,049 gzip bytes standalone. Splitting it further can help
its users, but does not reduce current full or lite. Keep its existing optional boundary.

### Split sampled audio and BASIC music from the sound engine

**Source:** [sound/index.js](../../plugins/sound/index.js),
[samples.js](../../plugins/sound/samples.js), [play.js](../../plugins/sound/play.js), and the
service-version check in [sound-advanced/index.js](../../plugins/sound-advanced/index.js).

The base sound plugin combines oscillator/noise voices, shared buses and scheduling, decoded or
streamed audio playback, and BASIC music notation. Its registration function always installs
samples and PLAY commands. Separate sample playback and notation plugins could let applications
retain sound effects without paying for the full combination.

| Sound omission probe, measured within full | Resulting gzip | Saving |
| --- | ---: | ---: |
| Omit sample command registration; retain service | 73,564 B | 4,529 B |
| Also omit `getAudioBuffer` service member | 73,508 B | 4,585 B |
| Omit PLAY command registration; retain service | 75,693 B | 2,400 B |
| Also omit PLAY extension/observation service members | 75,200 B | 2,893 B |

These rows are independent and omit registration/service members only. They do not implement
new plugins or prove that retaining an otherwise disconnected service remains useful.

**Affected APIs:** sample loading/removal, playback/stop/pause/resume and playback controls;
`play()` and `stopPlay()`. Retain shared audio context, voice admission, scheduling, buses,
envelopes, volume, and resource cleanup in the common engine.

**Compatibility risk:** sound exposes frozen service version 1, including `getAudioBuffer`,
`registerPlayExtension`, and `observePlay`. Sound-advanced requires that version and uses the
extension capabilities. Removing or changing those members cannot silently preserve the
current contract. An additive small engine profile can leave existing sound intact; a redesign
of existing sound requires coordinated service versioning and dependent-plugin changes.
Delegating services to new providers may preserve a contract, but its dependencies and retained
cost need a separate design and measurement.

Streaming alone is another possible sample-plugin cut, but savings are **unmeasured**. Inspect
its media-element ownership, rate controls, pause/resume, admission, loading retries, and cleanup
before reducing its supported behavior. Do not cut voice caps or lifecycle protection merely
because the samples module is the largest contributor.

**Validation:** sample/stream playback, lifecycles, unlock, buses, voice admission, PLAY parser and
scheduling, sound service compatibility, advanced instruments and sync, and audio browser tests
across the supported engines. Plugin load order and missing dependencies need explicit coverage.

## Further candidates requiring measurement

These are concrete source-backed opportunities, but no isolated production saving is established.

### Automatic spritesheet detection

**Source:** [images.js](../../src/api/images.js), `loadSpritesheet()` and
`processSpriteSheetAuto()`. Omitting both dimensions selects connected-component detection;
fixed-grid loading does not need this pixel-cluster search.

**Approach:** move automatic atlas detection into an optional asset-tools plugin, or precompute
frame metadata during asset preparation. Retain ordinary image loading and fixed-grid sprites.
**API/risk:** calls to `loadSpritesheet()` without dimensions would require the feature or a new
explicit asset API. Preserve frame ordering, alpha thresholds, cluster connectivity, bounds,
and small-cluster filtering. Effort medium; breaking behavior if removed from current core.
**Validation:** image lifecycle and spritesheet visuals, fixed/automatic modes, and frame metadata
comparison. **Savings: unmeasured.**

### Editable glyphs

**Source:** [fonts.js](../../src/text/fonts.js), `setChar()` and `getEditableAtlas()`;
[utils.js](../../src/core/utils.js), `hexToData()`.

**Approach:** move glyph editing into a font-editing plugin while leaving font loading and
printing available. **API/risk:** `setChar()` accepts bitmap arrays and encoded strings; edits
must reach all screens without modifying borrowed source images. The default font has its own
decoder, and the plugin API exposes the utility namespace, which can retain `hexToData()` even
without glyph editing. Removing `setChar()` does not remove all font decoding or utility code.
Effort medium; API removal is breaking. **Validation:** edited glyphs on multiple screens,
queued text, texture invalidation, borrowed atlases, and restoration. **Savings: unmeasured.**

### Drawing noise

**Source:** [blends.js](../../src/api/blends.js), `setNoise()`;
[batches.js](../../src/renderer/batches.js), noise uniforms and batch state; and
[point.frag](../../src/renderer/shaders/point.frag).

**Approach:** separate noise-specific configuration and shader behavior from ordinary blend
modes, with an opt-in effects profile or renderer extension. **API/risk:** `setNoise()` and its
seeded behavior are optional-feature candidates; removing only its command leaves shader and
batch support. Do not remove alpha/replacement blending to obtain this saving. Effort high for
a runtime plugin; removing the existing command is breaking. **Validation:** seeded visuals,
blend transitions, draw ordering, alpha, and context recovery. **Savings: unmeasured.**

### Shader diagnostics

**Source:** [postfx.js](../../src/api/postfx.js), `getShaderInfo()`;
[shaders.js](../../src/renderer/shaders.js), `getCustomShaderDiagnostics()` and
`getUniformTypeName()`.

**Approach:** offer diagnostics through the shader plugin or a separate development profile.
**API/risk:** removing the public diagnostics command is breaking. Reflection required for
uniform validation and dispatch must remain even if human-readable diagnostics are omitted.
Effort low-medium. **Validation:** diagnostic output, shader lifetimes and queued-pass counts,
plus uniform validation and samplers. **Savings: unmeasured.**

### Duplicated uniform-type tables

**Source:** [shaders.js](../../src/renderer/shaders.js), `getUniformTypeName()` and
`getUniformTypeInfo()` both enumerate WebGL uniform types.

**Approach:** test a shared descriptor table containing names, component counts, families, and
setter information. **API/risk:** compatible in intent, but preserve booleans, signed/unsigned
integers, rectangular matrices, samplers, array sizes, and unsupported-type behavior. Additional
descriptor fields or dynamic lookup may outweigh removed duplication; benchmark normalization
and uniform dispatch. Effort medium. **Validation:** shader diagnostics and sampler/type tests.
**Savings: unmeasured.**

## Cuts with poor return and behavior to preserve

- **Primitive algorithms:** metafile contributions in lite are 456 B for Bézier, 539 B for
  lines, 517 B for circle wrappers, 883 B for arcs, and 1,369 B for ellipses. These are minified
  contributions, not gzip savings. Moving individual shapes adds interface and plugin overhead
  while fragmenting basic drawing. Keep them unless an application-specific build requires a
  deliberately smaller API. Validate rasterization, full turns, alpha, and visuals if changed.
- **Debug branches:** forcing `m_isDebug = false` in renderer, batches, and shaders removes
  151 minified bytes, but saves only 24 B gzip in lite and 23 B in full. It removes query-enabled
  diagnostic behavior. Keep the existing diagnostics unless build-profile simplicity motivates
  a separate release/debug distinction; size alone does not justify it.
- **Newer JavaScript target:** switching only ES2020 to ES2022 produced exactly the same main
  bundle sizes. It is not a current size optimization. Any future target change also needs a
  supported-browser decision and browser validation.
- **Broad property mangling:** internal state is accessed by plugins, and API, parameter, shader,
  and service property names are contracts. Avoid global property renaming. A carefully isolated
  private-property convention could be investigated, but its benefit is unmeasured and would
  require checking separately built plugins against core.
- **Lifecycle and validation:** preserve context restoration, screen and texture disposal,
  pending-resource settlement, plugin installation transactions, and input/audio cleanup.
  Their large modules reflect shared responsibilities. Reduce duplication or extract features
  before considering any guarantee a cut candidate.

## Suggested implementation sequence and acceptance checks

1. Apply direct initialization and GLSL compaction as separate, measurable changes. Preserve
   initialization order and verify emitted shader validity.
2. Evaluate error helpers, palette packing, and banners independently. Retain only changes
   with a measured compressed benefit and acceptable runtime/maintenance cost.
3. Prototype the default-font lite profile and optional BASIC drawing/fill utilities. Establish
   font identity, readiness, existing-screen installation, and distribution type contracts.
4. Assess full plugin selection and the sound-engine split. Version service changes deliberately.
5. Prototype the custom-shader boundary only after defining render-order, presentation,
   restoration, and cleanup hooks. Measure core, full, and core-plus-plugin totals.

For a later implementation, rerun the focused checks identified above, then use the repository's
maintained workflows as appropriate:

- `npm run test:unit` and `npm run test:browser` for logic and browser contracts.
- `npm run test:types` for metadata, declarations, and package consumers.
- `npm run test:visual -- --mode=full`, `npm run test:lite`, and `npm run test:plugins` for
  affected rendering configurations. Review results without automatically replacing baselines.
- `npm run benchmark` for changes to drawing wrappers, batches, texture access, or dispatch.
- `npm run size` and `npm run size:diff -- <base.json> <head.json>` for actual compressed impact.

Specific maintained tests worth consulting include metadata/runtime and source-routing browser
tests; font-publication and ready tests; context-recovery and shader-samplers browser tests;
plugin-installation tests; pixel-disposal tests; sound sample/PLAY/admission tests; and audio
sample/stream/service/lifecycle browser suites. Use [test/README.md](../../test/README.md) for
the supported test commands, browser requirements, and visual review process.

Acceptance requires unchanged behavior for compatible optimizations, deliberately documented
contracts and matching declarations for new distributions, successful required regressions,
and measured saving on the resulting configuration. Report core-plus-plugin download cost
alongside bare-core saving when recommending extraction.

This review's validation consists of source inspection, successful in-memory builds, exact
baseline reproduction, independent variant measurements, numerical checks, and source-reference
verification. It does not claim that the proposed optimizations or omissions pass runtime tests.
