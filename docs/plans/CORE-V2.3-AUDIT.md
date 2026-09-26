# Pi.js 2.3 Core Audit

Status: Reviewed 2026-09-25; C4 rejected, every other finding and proposal accepted
(Section 9)
Plan: [UPGRADE-V2.3-PLAN.md](UPGRADE-V2.3-PLAN.md), Section 7
Evidence: [docs/evidence/core-2.3/](../evidence/core-2.3/README.md)

## 1. Summary

- **Revision:** `96279b9` (working tree at that commit, 2026-09-24). The 2.2 audit revision was
  `694d02a`; 67 commits separate them.
- **Environment:** Windows 11 Home 10.0.26200, 16 logical CPUs, Node 22.19.0, Playwright
  1.56.0 (Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0), esbuild 0.25.10,
  TypeScript 5.6.3.
- **Scope:** the five areas of plan §7.1:
  - The 2.2 contracts.
  - The changes since `694d02a` in `src/`, `scripts/`, `metadata/`, and the polygons plugin
    (about 6,300 inserted lines in 102 files).
  - The plugin API.
  - A consistency pass over the core commands.
  - Build, metadata, declarations, and packaging.

  Out of scope: a rendering re-audit, a performance campaign, and platform portability.
- **Size:** `pi.min.js` 72,604 bytes gzipped, `pi.lite.min.js` 48,585.
- **Method:**
  - Source review of the diff and the plugin API.
  - Every 2.2 contract suite run alone.
  - Deliberate breaks of the four P1 fixes in a scratch copy of the tree.
  - Reproductions in `probes.js`, run in all three engines, which agree on every observation.
  - Declaration consumers compiled with TypeScript under `bundler` and `nodenext` resolution.

The 2.2 fixes hold. Every contract, SYS-001–023 and COV-001–005, still has passing tests (458
tests in 35 suites, none failing). A deliberate break of each P1 fix is caught by its
regression tests. The larger 2.2 changes are sound in the areas they cover:
- Batch chunking holds in the later line and geometry paths.
- Premultiplied alpha is consistent across the shaders, uploads, and readbacks.
- Context recovery invalidates every GPU resource that later optimizations added.

The findings sit mostly at the edges: the plugin API, packaging and declarations, and option
parsing. There is no P1 finding.

Most important findings:
1. **A failed plugin stays half-installed (CORE-002).** When a plugin's init throws, its
   commands still reach every new screen, its settings, screen hooks, and clear handlers stay
   live, and its name cannot be registered again. A late plugin that fails on one screen leaves
   its commands on all of them.
2. **Loading a bundled plugin after Full breaks the page (CORE-003).** The standalone keyboard,
   pointer, gamepad, sound, or polygons plugin throws `DUPLICATE_PLUGIN` after Full. As ES
   modules, the throw stops the whole module graph, so the application never runs. All three
   input audits raised this (PAD-015, PTR-016, KEY-018).
3. **`clearEvents()` disables dependent plugins (CORE-004).** Plugins subscribe through the
   public `onpress`, so a user's `clearEvents()` or `clearEvents( "press" )` silently removes
   the on-screen keyboard's and Pi Vision's handlers. Core has no private subscription.
4. **The shared offscreen context cannot recover once it has no screens (CORE-001).** Context
   recovery removes its listeners when the last offscreen screen goes, but the context is kept
   and reused. A loss after that point can never be restored, and every later offscreen screen
   draws nothing.
5. **The package's types are wrong for `nodenext` consumers and for Lite with plugins
   (CORE-005, CORE-016).**
   - The release `package.json` has no `"type": "module"`, so a Node-style TypeScript project
     types the default import as a namespace and every call fails to compile.
   - A Lite user who loads a standalone plugin gets no types for its commands and two
     conflicting global declarations.

## 2. API Inventory

### 2.1 Plugin API

Sources compared: the runtime (`src/core/plugins.js`, `src/core/commands.js`,
`src/core/screen-manager.js`), `metadata/pi-2.3/_objects.toml` and `registerPlugin.toml`, the
generated `docs/llms/pi.d.ts`, `docs/API.md:443-490`, and `plugins/README.md`. The declared
`PluginAPI` has the same 17 members as the runtime object.

| Member | Runtime | Disagreements |
| --- | --- | --- |
| `registerPlugin( name, init, version, description, dependencies )` | Validates, rejects duplicate names with `DUPLICATE_PLUGIN` before init, queues the plugin, and resolves every plugin whose dependencies are initialized (`plugins.js:95-166`). The first failure is thrown after the queue settles | A failed plugin keeps its name (CORE-002). The error goes to whichever call triggered resolution (CORE-006). Plugins waiting on a missing or failed dependency stay pending with no warning |
| `addCommand( name, fn, isScreen, parameterNames, isScreenOptional )` | Queues the command globally at once (`commands.js:80-96`); a `set*` name also becomes a setting at once. Installed on the API only after init succeeds | Not rolled back on failure (CORE-002). The declaration requires all five arguments (CORE-017). The JSDoc example at `plugins.js:71` passes the array as `isScreen` (CORE-017). A plugin can replace a core command or setting of the same name without warning |
| `addScreenDataItem`, `addScreenDataItemGetter`, `addScreenInitFunction` | Registered globally at once; installed on existing screens after init | Not rolled back on failure (CORE-002) |
| `addScreenPreCleanupFunction`, `addScreenCleanupFunction` | Registered globally at once | Not rolled back on failure |
| `registerClearEvents( name, handler )` | Adds a named handler for `clearEvents()`; a duplicate name throws | Not rolled back on failure (CORE-002) |
| `provideService`, `getService` | A service is published only after init succeeds; `getService` accepts only declared, initialized dependencies | None found |
| `getActiveScreen`, `getScreenData`, `getAllScreensData`, `resizeOffscreenScreen`, `getApi`, `utils`, `wait`, `done` | Direct references to core functions | None found |
| Frame hook | None. Gamepad and Pi Vision each run their own `requestAnimationFrame` loop | See Section 4, C9 |
| Private subscriptions | None. Dependent plugins use public commands such as `onpress` | CORE-004 |

### 2.2 Core commands

The 2.3 reference lists 131 commands, 84 of them core. A static
comparison of the 138 `addCommand` sites with `build/reference-2.3.json` and the plugin
metadata found no disagreement in names, parameter order, `isScreen`, or the 30 checkable
defaults. Only the example plugin's demo commands have no metadata. The disagreements are in
behavior:

| Command | Runtime | Disagreements |
| --- | --- | --- |
| `set( options )` | Calls each known setting and skips everything else (`commands.js:300-330`) | `API.md:218-219` says unsupported properties are not accepted (CORE-008) |
| `removeScreen( screen )` | Global form takes an ID or screen object (`screen-manager.js:121-128`); each screen also has `screen.removeScreen()` | `removeScreen.toml` declares an optional parameter and the object form; the `Screen` type has no `removeScreen` (CORE-015) |
| `getPal( include0 )`, `getDefaultPal( include0 )` | Exclude index 0 only when `include0` is `null` | `false` includes index 0 (CORE-009) |
| `setChar( charCode, data )` | Edits the font's GPU texture | Has no effect on the default font (CORE-010) |
| `getImage( name )` | Accepts a name, element, or screen | Throws a raw `TypeError` for an offscreen screen (CORE-011) |
| `print( msg )` | Draws each UTF-16 unit through the font's table | Behavior outside the table is undocumented (CORE-014) |
| `clearEvents( type )` | Calls every registered clear handler, or one by type (`plugins.js:200-245`) | Reaches plugin-internal subscriptions (CORE-004) |

### 2.3 Build, metadata, and declarations

- **Metadata layering:** `scripts/generate-metadata.js` applies the `pi-X.Y` folders in version
  order. For each folder it applies `_removed.toml`, then `_objects.toml`, then the command
  files, and writes `reference-X.Y.json` plus the declarations. `metadata/pi-2.3/` holds the
  sound rebuild and the plugin API changes. The `sound-advanced` commands come from
  `metadata/plugin-sound-advanced/`.
- **Plugin metadata:** plugin declarations are generated only for plugins exported in
  `releases/base-package.json`. `metadata/plugin-print-table/` and
  `metadata/plugin-onscreen-keyboard/` feed nothing. Plugin folders are not merged into
  `reference-2.3.json`.
- **Declarations:** the generated `docs/llms/pi.d.ts` is identical to `build/pi.d.ts`.
  Standalone declarations for Full-bundled plugins declare only the init function (CORE-016).
- **Checks:**
  - `validate-type-definitions.js` checks that expected strings are present.
  - `validate-metadata-output.js` checks line endings.
  - `package-types-consumer.test.js` compiles consumers under `bundler` resolution only.
  - Nothing compares the runtime registry with the metadata (CORE-020).
- **Packaging:** every export, `types`, `unpkg`, and `jsdelivr` path in the release package
  exists. The tarball has 75 files, 2.80 MB packed, about 7 MB of it source maps.
- **Scripts:** portable. `scripts/test.js` spawns Node without a shell, and no script uses
  `xcopy`, `.cmd`, or a hard-coded separator. The only Windows-only step is the `xcopy` in the
  publish guide, already in the CI/CD exploration's scope (plan §9.1).

## 3. Findings

Priorities follow the 2.2 audit: **P1** blocks a supported workflow or corrupts shared state;
**P2** is incorrect behavior under a specific trigger; **P3** is a lower-impact contract
defect. Line numbers refer to `96279b9`. Each finding names its probe in `probes.js`; the
results are in `probes-output.json`. Every browser probe gives the same result in Chromium,
Firefox, and WebKit.

### CORE-001 — P2 — defect — The shared offscreen context cannot recover once it has no screens

**Locations:** `src/renderer/renderer.js:73` (the module keeps `m_offscreenContext`),
`:121-133` (every standalone offscreen screen reuses it), `:353-361` (`cleanup()` removes the
loss and restore listeners when the context's last screen goes).

**Trigger/reproduction (C01):**

```javascript
const a = $.screen( { "aspect": "4x4", "isOffscreen": true } );
const ext = a.canvas().getContext( "webgl2" ).getExtension( "WEBGL_lose_context" );
a.removeScreen();
ext.loseContext();         // or a real GPU reset while no offscreen screen exists
ext.restoreContext();
const b = $.screen( { "aspect": "4x4", "isOffscreen": true } );
b.pset( 1, 1 );
b.getPixel( 1, 1 );        // { r: 0, g: 0, b: 0, a: 0 }
```

**Expected:** `b` draws, as it does when `a` is kept through the loss (the control case reads
red).

**Actual:** with no `webglcontextlost` listener, nothing calls `preventDefault()`, so the
browser never restores the context. `b` joins the same lost context, which stays lost for the
page's lifetime, and every offscreen screen after it draws nothing.

**Evidence:** C01, identical in all three engines.

**Impact:** offscreen layers stop working for the rest of the session after a GPU reset that
happens while none exist, which is common between game scenes. The 2.2 fix (SYS-008) covers
losses while members exist. `context-recovery-browser.test.js` covers members that join,
resize, or leave while the context is lost, but not a loss after every member has gone.

**Proposed fix:** discard `m_offscreenContext` when its last screen is removed, or keep its
listeners for the context's lifetime (Section 4, C1).

### CORE-002 — P2 — defect — A failed plugin initialization leaves its registrations installed

**Locations:** `src/core/plugins.js:300-337` (the plugin API registers commands, settings,
screen data, screen hooks, and clear handlers globally as they are called),
`plugins.js:340-361` (on failure, only the plugin's state and service are withheld),
`src/core/commands.js:80-96`, `src/core/screen-manager.js` `installScreenExtensions()`.

**Trigger/reproduction (C02):**

```javascript
$.registerPlugin( { "name": "bad", "init": api => {
	api.addCommand( "badCmd", () => 1, true, [] );
	api.addCommand( "setBad", () => {}, false, [ "value" ] );
	api.addScreenInitFunction( () => {} );
	api.registerClearEvents( "bad", () => {} );
	throw new Error( "init failed" );
} } );                                    // throws PLUGIN_INIT_FAILED
const s = $.screen( "8x8" );              // s.badCmd exists; the init function ran
$.set( { "bad": 7 } );                    // calls setBad
$.clearEvents();                          // calls the bad clear handler
$.registerPlugin( { "name": "bad", "init": () => {} } );   // DUPLICATE_PLUGIN
```

**Late installation (C02b):** register a plugin after two screens exist, with a screen init
function that throws for the second screen. The plugin fails, `$.lateCmd` is undefined, and
`lateCmd` exists on the first, the second, and every later screen.

**Expected:** a failed plugin exposes nothing, as its service already does, and its name can
be registered again.

**Actual:** everything the plugin registered before the throw stays active. The global
command is withheld, so the API differs between `$` and screen objects.

**Evidence:** C02 and C02b, identical in all three engines.

**Impact:** a plugin that fails part-way, for example on a missing browser feature, keeps
running hooks on every new screen and answering `set()` and `clearEvents()`. Retrying with a
fixed plugin is impossible without reloading the page. The 2.2 contract SYS-009 covers
successful late installation only.

**Proposed fix:** collect every registration in the per-plugin `extensions` record and apply
it only after init succeeds, as services are. Remove the record from `m_plugins` on failure
(Section 4, C2).

### CORE-003 — P2 — defect — A bundled plugin loaded after Full breaks the page

**Locations:** each bundled plugin's self-registration block (for example
`plugins/keyboard/index.js:521-528`), `src/core/plugins.js:106-112` (duplicate check),
`releases/pi-latest/README.md:60-75` (package exports).

**Trigger/reproduction (C04):**

```javascript
import pi from "pijs-web";                  // Full: keyboard is already registered
import "pijs-web/plugins/keyboard";         // throws DUPLICATE_PLUGIN while evaluating
// application code here never runs
```

With classic scripts, `<script src="keyboard.js">` after `pi.js` reports the same uncaught
error. Only that script fails, and the page keeps working.

**Expected:** the plugin detects that it is already registered and does nothing, or the
package documents which entry points are for Lite only.

**Actual:** every bundled plugin (keyboard, pointer, gamepad, sound, polygons) registers
whenever `window.pi` exists, and a duplicate name throws. Under ES modules, the throw aborts
the importing module graph.

**Evidence:** C04, identical in all three engines. The manual gamepad, pointer, and keyboard
pages report the same error (PAD-015, PTR-016, KEY-018).

**Impact:** a documented package entry point stops a Full application from loading. The npm
README lists `pijs-web/plugins/keyboard`, `pointer`, `gamepad`, and `sound` as entry points
without saying they are for Lite. It omits `polygons` and `sound-advanced`.
`plugins/README.md:36` does document the throw.

**Proposed fix:** self-registration skips a plugin whose name is already registered with the
same version and warns on a version mismatch. `registerPlugin()` keeps throwing
`DUPLICATE_PLUGIN` for explicit calls. Document the Lite-only entry points (Section 4, C3).

### CORE-004 — P2 — defect — `clearEvents()` removes plugin-internal subscriptions

**Locations:** `plugins/pointer/press.js:185-193` (clearing replaces the handler table),
`plugins/onscreen-keyboard/index.js:298-314`, `plugins/pi-vision/window.js:333-347`,
`src/core/plugins.js:200-245`.

**Trigger/reproduction (C05):**

```javascript
$.showKeyboard( "number" );          // registers onpress handlers on the screen
$.clearEvents( "press" );            // or $.clearEvents()
// tapping a key now produces nothing in $.inkey()
```

**Expected:** a user's `clearEvents()` removes the user's handlers. The on-screen keyboard
keeps working.

**Actual:** before clearing, a tap produced keys. After clearing, the same tap produced none,
and the keyboard stays visible but dead. Pi Vision windows lose their press handling the same
way and never register it again.

**Evidence:** C05, identical in all three engines, with trusted mouse input. The pointer audit
listed this as an unconfirmed concern.

**Impact:** a common reset call, such as `clearEvents()` between game scenes, silently breaks
two bundled optional plugins.

**Proposed fix:** core gives plugins a way to subscribe that user-level `clearEvents()` does
not reach. For example, a flag on internal registrations that the clear handler skips, or
plugin-owned handler tables (Section 4, C4). The mechanism is decided in the conventions
review (§6), since it shapes every input plugin's handler tables.

### CORE-005 — P2 — defect — The release package is typed wrongly under `nodenext`

**Locations:** `releases/base-package.json` (no `"type"` field),
`test/scripts/package-types-consumer.test.js:273` and `:307-308`.

**Trigger/reproduction (declaration probe `default-import.mts`):** in a TypeScript project
using `"module": "nodenext"`:

```typescript
import pi from "pijs-web";
pi.screen( "8x8" );   // TS2339: Property 'screen' does not exist
```

**Expected:** compiles, as it does under `bundler` resolution.

**Actual:** without `"type": "module"`, TypeScript treats the package's `.d.ts` files as
CommonJS declarations. The default import is typed as the module namespace, so every call
fails. Adding `"type": "module"` to the release manifest fixes it.

**Evidence:** declaration probes; every consumer fails under `nodenext`.

**Impact:** TypeScript projects that use Node's module resolution cannot use the package's
types. The consumer test sets `"moduleResolution": "node16"` in its `tsconfig`. Its command
line then overrides that with `--moduleResolution bundler`, so the test never exercises Node
resolution.

**Proposed fix:** add `"type": "module"` to `releases/base-package.json`, and compile the
consumers under both resolutions (Section 4, C5).

### CORE-006 — P3 — defect — Plugin initialization errors are thrown to the wrong caller

**Locations:** `src/core/plugins.js:130-166` (`resolveDependencies()` throws the first failure
to whichever call is resolving).

**Trigger/reproduction (C03):**
- **Nested:** plugin `outer`'s init registers `inner`, and `inner`'s init throws. The inner
  `registerPlugin()` call returns normally. The outer call throws "Failed to initialize plugin
  'inner'", although `outer` initialized.
- **Pending:** `b` and `c` wait for `a`, and `b`'s init throws. `registerPlugin( a )` throws
  "Failed to initialize plugin 'b'", although `a` and `c` initialized.

**Expected:** each failure is reported to the call that registered the failing plugin, or
reported without failing an unrelated call.

**Evidence:** C03, identical in all three engines.

**Impact:** a page that wraps its own plugin's registration in `try` sees another plugin's
failure and may treat its own plugin as missing.

**Proposed fix:** throw a plugin's failure from its own `registerPlugin()` call when that call
resolved it. Report failures resolved during another call with `console.error` and in
`getPlugins()` (Section 4, C2).

### CORE-007 — P3 — defect — An explicit `undefined` is not treated as an omitted argument

**Locations:** `src/core/utils.js:35-71` (`parseOptions` copies any supplied value,
including `undefined`, where an omitted argument becomes `null`). The affected checks are at
`src/text/print.js:157,176`, `src/api/paint.js:135`, `src/api/images.js:335,339`, and
`src/core/commands.js:310`.

**Trigger/reproduction (C06):**

| Call | Result | Same call with the argument omitted or `null` |
| --- | --- | --- |
| `$.setPos( undefined, 2 )` | `INVALID_COL` | Column unchanged |
| `$.paint( 5, 5, 2, 0, undefined )` | `INVALID_PARAMETER` | Fills |
| `$.loadSpritesheet( canvas, "a", undefined, undefined )` | `INVALID_DIMENSIONS` | Auto-detects the frame size |
| `$.loadSpritesheet( canvas, "b", 8, 8, undefined )` | `INVALID_MARGIN` | Margin 0 |
| `$.set( { "color": undefined } )` | `INVALID_PARAMETER` | Skipped |

**Expected:** `undefined` means "not supplied", as JavaScript default parameters treat it.

**Evidence:** C06, identical in all three engines. Commands that normalize through `getInt`,
`getFloat`, `?? null`, or `== null` are not affected; the surveyed list is in the evidence.

**Impact:** forwarding an optional argument (`$.setPos( col, row )` where `col` may be
`undefined`) fails. The keyboard audit found the same cause in `input()` (KEY-009).

**Proposed fix:** `parseOptions` maps `undefined` to `null`, positionally and by name
(Section 4, C6).

### CORE-008 — P3 — defect — `set()` accepts unknown names and fails uncoded on some inputs

**Locations:** `src/core/commands.js:300-330`, `commands.js:90` (settings are a plain object),
`docs/API.md:218-219`.

**Trigger/reproduction (C07):**

| Call | Result |
| --- | --- |
| `$.set( { "notARealOption": 1 } )`, `$.set( 5 )` | Silently ignored |
| Lite: `$.set( { "volume": 0.5 } )`, `$.set( { "pinchZoom": true } )` | Silently ignored; the setting belongs to a plugin Lite does not include |
| `$.set( { "toString": 1 } )` | Raw `TypeError`: the name matches an inherited `Object.prototype` member |
| `$.set( { "color": 1 } )` before any screen | Raw `TypeError` reading the null screen, not `NO_ACTIVE_SCREEN` |

**Expected:** unknown and unavailable names throw a coded error that names the option, as
`API.md` says. A screen setting with no screen throws the core no-screen error.

**Evidence:** C07, identical in all three engines. The gamepad audit found the Lite case
(P14).

**Impact:** a misspelled option or a Full-only option in Lite does nothing, with no sign of
the mistake.

**Proposed fix:** look settings up with `Object.hasOwn` on a null-prototype object. Throw
`INVALID_OPTION` for unknown names, and the no-screen error for screen settings (Section 4,
C7).

### CORE-009 — P3 — defect — `getPal( false )` includes index 0

**Locations:** `src/api/colors.js:174`, `:313` (`include0 === null`).

**Trigger/reproduction (C08):** `$.getPal().length` is 254, while `$.getPal( false ).length`
and `$.getPal( true ).length` are both 255. `getDefaultPal` behaves the same.

**Expected:** `false` excludes index 0, as the default does. `docs/API.md:192` says index 0
is excluded by default.

**Evidence:** C08, identical in all three engines.

**Proposed fix:** test `include0` for truthiness after defaulting (Section 4, C6).

### CORE-010 — P3 — defect — `setChar()` has no effect on the default font

**Locations:** `src/text/fonts/font-6x8.js` (the default font's image is a canvas),
`src/renderer/textures.js:256-285` (a canvas texture is re-uploaded on every lookup unless
`isDirty === false`, and nothing in `src/` sets it), `src/text/print.js:467,497` (a texture
lookup per character), `src/text/fonts.js:510` (`setChar` edits only the GPU texture).

**Trigger/reproduction (C09):**

```javascript
$.screen( "32x16" );
$.setChar( "A", /* 8 rows of 6 ones: a solid cell */ );
$.print( "A", true );      // draws the stock "A": 16 lit pixels, not 48
```

**Expected:** the glyph changes, as it does on font 2 (64 of 64 pixels after the same edit).

**Actual:** the next lookup re-uploads the canvas over the edit. Printing `"HELLO"` with the
default font costs 6 texture uploads and a batch flush per glyph; font 2 costs none.

**Evidence:** C09, identical in all three engines. `alpha-composition-browser.test.js:272`
prints with font 1 but checks only the first lit pixel's color.

**Impact:** `setChar()` does not work on the default font, and printing with the default font
does much more GPU work than printing with image fonts.

**Proposed fix:** mark static canvas sources clean after upload, and draw `setChar` edits
into the source canvas as well, so they also survive a context restore (Section 4, C8).

### CORE-011 — P3 — defect — `getImage()` of an offscreen screen throws a raw `TypeError`

**Locations:** `src/api/images.js:452-455` calls `createImageFromScreen( imgScreenData )`
without an options object; `:474` reads `options.name`.

**Trigger/reproduction (C10):**
`$.getImage( $.screen( { "aspect": "8x8", "isOffscreen": true } ) )` throws
`TypeError: Cannot read properties of undefined (reading 'name')`, with no code.

**Expected:** the documented result for a screen argument, or a coded error.
`createImageFromScreen` returns an image name rather than an image, so the intended result
is also unclear.

**Evidence:** C10, identical in all three engines.

**Proposed fix:** decide what `getImage( screen )` returns, then pass an options object
(Section 4, C6).

### CORE-012 — P3 — defect — Polygon coordinates past 2³¹ wrap

**Locations:** `plugins/polygons/index.js:168` (accepts any safe integer), `:288-337` (spans
generated for every row of the polygon's bounds and stored in an `Int32Array`), `:386`.

**Trigger/reproduction (C11):** `$.polygon( [ 0, 0, 3000000000, 0, 0, 10 ], 4 )` on a 20x12
screen lights 1 pixel in rows 1 and 2 instead of 20. The same triangle with `x = 2000000000`
fills every row.

**Expected:** the visible rows are filled, or the input is rejected.

**Actual:** span ends past 2³¹ wrap to negative values, and `rect()` skips the negative
widths. Span generation is also not clipped to the screen, so a polygon billions of pixels tall
loops over every row.

**Evidence:** C11, identical in all three engines. `polygons.test.js` rejects non-safe
integers but tests nothing between 2³¹ and 2⁵³.

**Proposed fix:** clip the rows and span ends to the screen before storing them (Section 4,
C6).

### CORE-013 — P3 — defect — Numeric validation gaps in `arc`, `loadFont`, and `setPrintSize`

**Locations:** `src/api/graphics.js:120-123` (`arc` checks angles with `isNaN` only),
`src/text/fonts.js` (`loadFont` size and margin checks), `src/text/print.js`
(`setPrintSize` padding).

**Trigger/reproduction (C12):**

| Call | Result |
| --- | --- |
| `$.arc( 16, 16, 8, 0, Infinity )` | Draws a full circle |
| `$.arc( 16, 16, 8, Infinity, Infinity )` | Draws nothing |
| `$.loadFont( canvas, 0, 8 )` | Accepted; returns a font ID |
| `$.loadFont( canvas, 6.4, 8 )` | Accepted and rounded, although the message says sizes must be integers |
| `$.loadFont( canvas, 6, 8, -1 )` | Accepted |
| `$.setPrintSize( 1, 1, -6 )`, then `$.getPos().col` | `Infinity` |

**Expected:** non-finite angles, zero or fractional sizes, and negative margins or padding
throw coded errors, as `x`, `y`, and `radius` already do. The 2.2 numeric boundary tables
(COV-003) do not cover these parameters.

**Evidence:** C12, identical in all three engines.

**Proposed fix:** extend the finite, integer, and range checks, with rows in
`numeric-boundaries.test.js` (Section 4, C6).

### CORE-014 — P3 — documentation — Text outside the font's character table is undocumented

**Locations:** `src/text/print.js:484-503` (a character with no table entry is skipped, but
its cell is kept), the default 6x8 atlas (laid out as code page 437), `docs/API.md:326-356`.

**Trigger/reproduction (C13):**

| Text | Result |
| --- | --- |
| `"日"` | Nothing drawn; the cursor advances one cell |
| `"😀"` | Two blank cells (one per UTF-16 unit); `calcWidth` returns 12 |
| `"é"` (U+00E9, code 233) | Draws code page 437 glyph 233, which is Θ; CP437's é is glyph 130 |

A pending or failed URL font can be selected; `print()` then warns once, draws nothing, and
still advances the cursor.

**Expected:** the documentation says which characters each built-in font draws, how
characters outside the table are handled, and that one cell is used per UTF-16 unit.

**Evidence:** C13, identical in all three engines.

**Impact:** Latin-1 text draws the wrong glyphs without warning. This matters for the
keyboard audit's proposed text field for IME and paste input (A16), which would accept any
character.

**Proposed fix:** document the current behavior in the release phase (R.2). Whether to map
Latin-1 to CP437, or add a replacement glyph, is a separate decision (Section 4, C10).

### CORE-015 — P3 — API — `removeScreen` forms disagree with their declarations

**Locations:** `src/core/screen-manager.js:121-128`, `metadata/pi-2.0/removeScreen.toml`,
`docs/llms/pi.d.ts` (`Screen` interface).

**Trigger/reproduction (C14 and declaration probe `screen-remove.mts`):**

| Call | Result |
| --- | --- |
| `$.removeScreen()`, `$.removeScreen( null )` | Raw `TypeError` ("Cannot convert undefined or null to object") |
| `$.removeScreen( { "screen": s } )` | Silently does nothing |
| `s.removeScreen()` in TypeScript | TS2339; the `Screen` type has no `removeScreen`, although the metadata's own example uses it |

**Expected:** the declared forms work. A missing or unknown screen throws a coded error.

**Evidence:** C14, identical in all three engines, and the declaration probes.

**Proposed fix:** accept the object form, throw the core screen errors for missing or
unknown screens, and declare `Screen.removeScreen()` (Section 4, C6).

### CORE-016 — P3 — documentation — Plugin declarations do not serve Lite users

**Locations:** `scripts/generate-metadata.js:842-862` (plugin declarations augment only
`"pijs-web"`), `:919` (Lite drops plugin commands), `:679` (each file declares the global
`pi` and `$`).

**Trigger/reproduction (declaration probes):**
- `import lite from "pijs-web/lite"; import "pijs-web/plugins/keyboard"; lite.inkey();` fails
  with TS2339. `lite.synth()` with `sound-advanced` fails the same way.
- Importing any plugin next to `pijs-web/lite` adds two TS2403 errors from conflicting
  `declare global` blocks, unless `skipLibCheck` is set.
- The standalone `.d.ts` of each Full-bundled plugin (keyboard, pointer, gamepad, sound,
  polygons) declares only its init function; none has a `metadata/plugin-<name>/` folder.
- `pi.lite.d.ts` declares Full-only types (`ClickData`, `GamepadData`, `MouseData`,
  `PressData`, `TouchData`). Lite's `Options` accepts Full-only keys (`actionKeys`, `audio`,
  `busVolume`, `enableContextMenu`, `gamepadSensitivity`, `pinchZoom`, `soundLimiter`,
  `volume`), which runtime ignores (CORE-008).

**Expected:** Lite plus a plugin types exactly the commands that plugin adds.

**Evidence:** declaration probes; the three input audits reported the plugin case.

**Proposed fix:** generate each plugin's declarations from its metadata, augmenting both the
Full and Lite API types, and declare the globals once (Section 4, C5).

### CORE-017 — P3 — documentation — `addCommand` declaration and example disagree with runtime

**Locations:** `metadata/pi-2.3/_objects.toml:11-13`, `src/core/plugins.js:71`.

**Trigger/reproduction (declaration probe `plugin-addcommand.mts`):**
`api.addCommand( "hello", fn, false, [] )` fails with TS2554 ("Expected 5 arguments"), while
every bundled plugin calls it with four. The JSDoc example
`addCommand( "myCommand", myFn, [ "param1" ] )` passes the array as `isScreen`. Following it,
registration succeeds and the command then throws "parameterNames is not iterable".
`docs/API.md:457-474` shows the correct form.

**Proposed fix:** mark `isScreenOptional` optional in the signature, and correct the example
(Section 4, C5).

### CORE-018 — P3 — defect — The filled-circle geometry cache never evicts

**Locations:** `src/renderer/draw/geometry.js:26`, `:292-312`.

**Trigger/reproduction:** code review. Each distinct filled-circle radius adds an entry,
about 96 bytes per unit of radius, to a module-level `Map` that is never trimmed. Animating a
filled circle through radii 1 to 2,000 keeps about 190 MB. The sprite color cache, by
contrast, is capped at 1,000 entries.

**Expected:** bounded memory, like the other caches.

**Proposed fix:** cap the cache, or skip caching above a radius (Section 4, C8).

### CORE-019 — P3 — documentation — Release and repository packaging details

**Locations:** `releases/publish.md`, the root and release `package.json`,
`releases/pi-latest/README.md`.

- **File name case:** git tracks `releases/publish.md`, while the plan and the Windows working
  tree use `PUBLISH.md`. On a case-sensitive checkout, the references in
  `UPGRADE-V2.3-PLAN.md` (§9.1 and R.5, R.7) do not resolve.
- **Root package:** the root `package.json` has no `"private": true`. `npm pack --dry-run` from
  the root lists 1,102 files, 12.9 MB, so an accidental `npm publish` from the root would ship
  the tests, releases, and build output.
- **Changelog:** the release tarball omits `CHANGELOG.md`. `files` is `[ "dist" ]`, and npm no
  longer adds changelogs automatically.
- **Package README:** the plugin list is incomplete (CORE-003).

**Proposed fix:** release-phase tasks R.5 and R.6 (Section 4, C11).

### CORE-020 — P3 — test gap — Checks that would have caught these findings are missing

**Locations:** `test/unit/`, `test/scripts/`, `scripts/validate-*.js`.

- Nothing compares the runtime command and settings registry with the metadata. The static
  comparison in this audit found no disagreement today.
- The type consumers run under `bundler` resolution only, and never pair Lite with a plugin
  (CORE-005, CORE-016).
- No plugin test fails an init part-way and checks what remains (CORE-002, CORE-006).
- Context recovery is not tested for a loss after every member has left (CORE-001).
- The explicit-`undefined` and `set()` cases have no test (CORE-007, CORE-008).
- `setChar` is not tested on the default font (CORE-010).

### Unconfirmed concerns

These are not findings.
- **Command name collisions.** `addCommand` lets a plugin replace a core command or setting of
  the same name without warning (`commands.js:80-96`). This was read, not run, and no bundled
  plugin does it.
- **Silent pending plugins.** A plugin whose dependency is missing, failed, or cyclic stays
  pending forever with no message. Tests treat this as intended. A warning at `ready()` would
  make it visible.
- **Font header comment.** `font-6x8.js:3` says the characters are in 8x10 cells. The cells
  are 6x8, since the margin is 0.

### Changes since the 2.2 audit that were checked and found sound

- **Batch chunking (`d8c0e9b`) in later paths:**
  - `drawLine` reserves up to capacity and falls back to the point writer above it, with
    identical Bresenham output.
  - Cached geometry (`3197385`) chunks in threes and stops on a zero reservation, and ellipse
    fill chunks in sixes.
  - Every point writer finishes before another writer starts.
- **Context recovery (`114edda`) and later caches:**
  - `discardResources` resets the image and sampler context maps, the texture-copy
    framebuffer, custom shaders, display resources, and batches.
  - The static-image fast path runs only after the loss probe.
  - The geometry and quad-color caches hold no GPU objects.
  - A failed restore frees what it allocated.
- **Premultiplied alpha (`9faacbd`):**
  - The point, image, display, and custom shaders agree.
  - Browser uploads set and restore the unpack flag, and typed uploads premultiply once.
  - Readbacks, filters, and screen-region images unpremultiply.
- **Arcs and circles (`00590af`):** full turns match circles, and outlines emit each pixel
  once.
- **Fonts and printing:** since 2.2, the font source changed only in form (the split
  atlas string is byte-identical) and in when a font ID is published (`8264e68`). Both are
  correct.
- **Plugin services:** see Section 2.1.
- **Release copy (`copy-to-release.js`):** stages into a temporary folder, swaps with a
  backup, and rolls back on failure.

## 4. Proposed Changes

Each item is marked **fix** (restores documented or expected behavior), **additive**, or
**breaking**. Under plan §3, core stays stable unless a change fixes a confirmed defect or
serves an accepted plugin change, and each core API change needs maintainer approval; items
that change core API are marked **approval**.

| ID | Change | Kind | Findings |
| --- | --- | --- | --- |
| C1 | Discard the shared offscreen context when its last screen is removed, so the next offscreen screen creates a fresh one | fix | CORE-001 |
| C2 | Plugin installation is transactional: registrations are collected and applied only after init and screen installation succeed; a failed plugin leaves nothing, including its `m_plugins` entry. A failure is thrown from the call that registered the plugin; failures resolved during another call are reported with `console.error` and visible in `getPlugins()` | fix | CORE-002, CORE-006 |
| C3 | Self-registration skips a plugin whose name is already registered at the same version, and warns on a version mismatch. Explicit `registerPlugin()` keeps throwing `DUPLICATE_PLUGIN` | fix | CORE-003 |
| C4 | Plugin-internal subscriptions: a registration option, or plugin-owned handler tables, that user-level `clearEvents()` does not reach. Mechanism settled in §6 | additive, approval | CORE-004 |
| C5 | Declarations: `"type": "module"` in the release manifest; plugin declarations augment Full and Lite; globals declared once; Lite `Options` and types limited to Lite; `addCommand`'s last parameter optional; `Screen.removeScreen()` declared | fix | CORE-005, CORE-015, CORE-016, CORE-017 |
| C6 | Option and value handling: `parseOptions` maps `undefined` to `null`; `getPal( false )` excludes index 0; `getImage( screen )` fixed; polygon spans clipped; numeric checks for `arc`, `loadFont`, and `setPrintSize`; `removeScreen` object form and coded errors | fix | CORE-007, CORE-009, CORE-011, CORE-012, CORE-013, CORE-015 |
| C7 | `set()` throws `INVALID_OPTION` for unknown or unavailable names and the no-screen error for screen settings | breaking | CORE-008 |
| C8 | Static canvas textures are uploaded once; `setChar` also edits the source canvas; the circle geometry cache is bounded | fix | CORE-010, CORE-018 |
| C9 | No core frame hook in 2.3. Gamepad's own loop serves its roadmap (A1), and keyboard and pointer are event-driven. Revisit if a second input plugin needs frame-aligned updates | none | Handoff |
| C10 | Document the characters each built-in font draws and the one-cell-per-UTF-16-unit rule (R.2). Mapping Latin-1 to CP437 is deferred | documentation | CORE-014 |
| C11 | Release packaging: rename to `releases/PUBLISH.md` in git, `"private": true` in the root manifest, and ship `CHANGELOG.md` in the tarball | fix | CORE-019 |

C7 is the only breaking change. Code that passes a misspelled option or a Full-only option to
Lite's `set()` starts to throw.

**Upgrade-guide sketches:**
- **C7:** "`set()` now throws `INVALID_OPTION` for an option it does not recognize, including
  options from plugins that are not loaded. Remove the option, fix its spelling, or load the
  plugin that provides it."
- **C3:** "Importing a plugin that the Full bundle already includes no longer throws. It does
  nothing. The standalone plugin entry points are for Lite."
- **C5:** "TypeScript projects using `nodenext` module resolution now get the package's types.
  Lite projects that load a plugin get that plugin's command types."

## 5. Coverage Map

### 5.1 Current coverage

Limited to the §7.1 areas. The 2.2 contracts are mapped one by one in `contracts-2.2.json`.

| Area | Node | Browser | Gaps |
| --- | --- | --- | --- |
| 2.2 contracts SYS-001–023, COV-001–005 | 19 suites | 16 suites, plus the visual suites for SYS-023, COV-001, COV-002 | None; P1 contracts break-checked |
| Plugin registration, dependencies, services, late install | `plugins.test.js` (6) | `plugin-installation-browser` (5), `sound-advanced-bundles-browser` (8), `polygons-bundles-browser` (9), `plugin-docs-browser` (3) | Init failure part-way; errors reported to other callers; duplicate self-registration |
| Context recovery | `static-texture-cache` (10), `batch-reservations` | `context-recovery-browser` (24) | Loss with no members |
| Option parsing and `set()` | `numeric-boundaries` (54) | `color-validation-browser` | Explicit `undefined`; unknown, inherited, and Lite-only names; no screen |
| Fonts and printing | `font-publication` (15) | `font-publication-browser` (6), `alpha-composition-browser` | `setChar` on font 1; characters outside the table |
| Package and declarations | `build.test.js`, `copy-to-release.test.js` (24) | — | `package-types-consumer` (2): `bundler` only, no Lite plus plugin, no `nodenext` |
| Metadata against runtime | — | — | No comparison exists |

### 5.2 Tests to add first

Ranked by value. Each starts from the probe that reproduces its finding.

1. Transactional plugin installation: init and screen-install failures leave nothing, and
   the name can be registered again (C02, C02b, C03).
2. Type consumers under `nodenext`, and Lite with each exported plugin, in
   `package-types-consumer.test.js` (declaration probes).
3. Offscreen context loss after every member has gone, in `context-recovery-browser.test.js`
   (C01).
4. Duplicate self-registration after Full, IIFE and ESM (C04).
5. `clearEvents()` leaves plugin-internal subscriptions working (C05), once C4 is decided.
6. A generated check that every registered command and setting has metadata with matching
   parameters.
7. `parseOptions` with explicit `undefined`, and `set()` names, in the Node suites (C06, C07).
8. `setChar` on the default font (C09).
9. Numeric boundary rows for `arc`, `loadFont`, `setPrintSize`, and polygon extents (C11,
   C12).

## 6. Validation

### 6.1 Commands

| Check | Command | Result |
| --- | --- | --- |
| Full suite | `npm test` | Passed in 2 min 27 s: Node 400 of 400; browser 406 passed, 206 skipped (audio engines without Web Audio or `OfflineAudioContext.suspend()`); types 2 of 2; visual full 35, lite 20, plugins 8, none skipped |
| 2.2 contracts | Each contract suite alone, `node --test --test-concurrency=1 <file>` | 35 files, 458 tests: 450 passed, 8 skipped, 0 failed (`contracts-2.2.json`) |
| P1 break checks | SYS-001–004 reverted in a `git archive` copy of the tree | Each break failed its contract's tests (evidence README) |
| Size | `npm run size -- --out=docs/evidence/core-2.3/size-baseline.json` | Full 72,604 B gzip, Lite 48,585 B |
| Reproductions | `node docs/evidence/core-2.3/probes.js` | C01–C14 confirmed in Chromium, Firefox, and WebKit; every declaration consumer differs from runtime |
| Package contents | `npm pack --dry-run` in `releases/pi-latest` and in the root | 75 files, 2.80 MB; root 1,102 files, 12.9 MB (CORE-019) |

### 6.2 Limits

- The probes use Playwright's builds of the three engines on Windows. Safari, mobile browsers,
  and hardware GPU resets were not tested. Context loss was simulated with
  `WEBGL_lose_context`.
- The metadata comparison was static: 138 `addCommand` call sites against the reference and
  plugin metadata. Hot-path commands installed directly on the API were checked at runtime.
- CORE-018's memory figure was calculated from the vertex layout, not measured.

## 7. Recommended Roadmap

After review, only C7 changes the core API, so a short `CORE-V2.3-ROADMAP.md` is needed for it
(plan §7.2). C4 was decided as documentation only (Section 9). The other items are fixes,
tracked in the follow-up table below as in 2.2. Order:

**Phase 1: before the input roadmaps are approved.** The input plugins build on these:
- C2 and C3 (plugin installation and self-registration).
- C5's plugin declaration changes, because every input roadmap regenerates its plugin's
  declarations.

**Phase 2: fixes, in any order:**
- C1, C6, C8.
- C5's manifest and declaration fixes.
- C11.
- The tests in Section 5.2, except item 5, which C4's decision removes.

**Phase 3:** C7, with the compatibility summary.

User documentation is written in the release phase (R.2, R.3), as the standing rules require:
- C10's description of characters outside the font table.
- CORE-004: `clearEvents()` also removes handlers that a plugin registers through the public
  input commands. This is written for plugin authors (plugin guides); no plugin that remains
  in 2.3 is affected once `onscreen-keyboard` and `pi-vision` are removed (upgrade plan §3.1).
- The `set()` and `removeScreen` text in `API.md`.

**Scope-cut order:**
1. C8 and C10's Latin-1 mapping.
2. C7, which leaves `set()` lenient and documents that.
3. C11's changelog item.

Phase 1 and CORE-001 are not cut.

### Follow-up table

| Order | Task | Findings | Status |
| --- | --- | --- | --- |
| 1 | Transactional plugin installation and error routing | CORE-002, CORE-006 | Accepted |
| 2 | Skip duplicate self-registration | CORE-003 | Accepted |
| 3 | Document that `clearEvents()` reaches dependent plugins' handlers | CORE-004 | Accepted; release phase (R.2) |
| 4 | Declarations and release manifest | CORE-005, CORE-015, CORE-016, CORE-017 | Accepted |
| 5 | Offscreen context lifetime | CORE-001 | Accepted |
| 6 | Option and value handling | CORE-007, CORE-009, CORE-011, CORE-012, CORE-013 | Accepted |
| 7 | Canvas texture uploads, `setChar`, and cache bounds | CORE-010, CORE-018 | Accepted |
| 8 | Strict `set()` | CORE-008 | Accepted; `CORE-V2.3-ROADMAP.md` |
| 9 | Packaging details | CORE-019 | Accepted. The `releases/PUBLISH.md` rename is done (CI roadmap task 2.1, 2026-09-26); `"private": true` and the changelog in the tarball remain |
| 10 | Tests | CORE-020 | With each task |

## 8. Handoffs

### Input audits

The core audit's answer to each item the input audits handed to it:

| Item | Raised by | Result |
| --- | --- | --- |
| Self-registration after Full throws `DUPLICATE_PLUGIN` | PAD-015, PTR-016, KEY-018 | Confirmed, CORE-003; fixed by C3 |
| Standalone plugin declarations; Lite declares Full-only types | Gamepad, pointer, keyboard | Confirmed, CORE-016; fixed by C5 |
| `set()` accepts unknown options | Gamepad (P14) | Confirmed, CORE-008; C7 |
| `parseOptions` keeps an explicit `undefined` | KEY-009 | Confirmed, CORE-007; C6 |
| `addCommand` JSDoc example | Gamepad | Confirmed, CORE-017 |
| Plugin-internal subscriptions and `clearEvents` | Pointer | Confirmed, CORE-004. Review decision: documented, no core mechanism (C4 rejected) |
| `getCanvasContentRect()` content-box rule | PTR-011 | Not a core defect. It returns the canvas content box by design and is shared with `noCss` sizing (`screen-manager.js:1184,1248`). Clamping or dropping border and padding points belongs to the pointer plugin |
| Font glyph mapping for typed text | Keyboard (A16) | Confirmed and documented, CORE-014 |
| Frame hook for input plugins | Gamepad | None in 2.3 (C9) |

### Input conventions review (§6)

Core facts the review needs:

| Item | Detail |
| --- | --- |
| Error codes | Core uses `new TypeError( "<command>: message" )` or `RangeError` plus an UPPER_SNAKE `code`, but not uniformly. There are two "no screen" codes, `NO_SCREEN` (`utils.js:22`, hot-path commands) and `NO_ACTIVE_SCREEN` (`screen-manager.js:263`). Near-duplicates: `INVALID_SCREEN` and `INVALID_SCREEN_ID`; `INVALID_SCREEN_DIMENSIONS` and `INVALID_DIMENSIONS`; `WEBGL_ERROR` and `WEBGL2_ERROR`. Granularity varies: generic `INVALID_PARAMETER` (33 uses) next to `INVALID_X`, `INVALID_COL`, and `INVALID_COORDINATES`. The error class varies for the same kind of mistake: `aspect` throws `Error`, invalid `paint` colors `RangeError`, and anchors `TypeError`. `setScreen` and `getScreen` prefix messages with `screen:`, and `SCREEN_REMOVED` has no prefix |
| Handler registration | Core has no handler commands of its own; `clearEvents( type )` is a screen command that calls every plugin's clear handler with the screen, or with the active screen from `$`. Each plugin decides whether it clears per screen or globally |
| Setting names | `set*` commands become `set()` options by removing the prefix and lowering the first letter, so a rename of `setGamepadSensitivity` renames its option too |
| Boolean parameter names | `isEnabled` (`setEnableContextMenu`, `setPinchZoom`, `setWordBreak`), `enabled` (`setSoundLimiter`); command names mix `setEnableX` and `setX` |
| Angles | `drawImage` and `drawSprite` take `angle` in degrees; `blitImage` and `blitSprite` take `angleRad` in radians |
| Regions | `cls`, `rect`, and `get` take `x, y, width, height`; `filterImg` and `createImageFromScreen` take inclusive `x1, y1, x2, y2` |
| Getters | `width()`, `height()`, and `canvas()` have no `get` prefix; `getCols()`, `getRows()`, and `getPos()` do |
| Callbacks | `ready()` takes a callback and returns a promise; `loadImage` and `loadSpritesheet` take `onLoad` and `onError`; `loadAudio` and `loadFont` take neither and use `ready()` |

### CI/CD exploration (§9)

- The publish guide's `xcopy` step is the only Windows-only workflow step. The scripts are
  portable (Section 2.3).
- CORE-019's file name case difference will surface on the first Linux or macOS checkout.

## 9. Review Decisions

The maintainer marks each item accepted, rejected, or deferred (plan §5.6). Decisions
recorded 2026-09-25.

| ID | Summary | Decision | Notes |
| --- | --- | --- | --- |
| CORE-001 | Offscreen context not restored after its last screen | Accepted | P2. Fixed by C1 |
| CORE-002 | Failed plugin stays half-installed | Accepted | P2. Fixed by C2 |
| CORE-003 | Bundled plugin loaded after Full breaks the page | Accepted | P2. Fixed by C3: skip on the same version, warn on a mismatch |
| CORE-004 | `clearEvents()` removes plugin-internal subscriptions | Accepted | P2. Documentation only (C4 rejected): `API.md` and the plugin guides say that `clearEvents()` also removes handlers a plugin registers through the public input commands. The two affected plugins, `onscreen-keyboard` and `pi-vision`, are removed in 2.3 (upgrade plan §3.1, G7). No mechanism is needed from §6 |
| CORE-005 | Release package types wrong under `nodenext` | Accepted | P2. Fixed by C5 |
| CORE-006 | Init errors thrown to the wrong caller | Accepted | Fixed by C2 |
| CORE-007 | Explicit `undefined` not treated as omitted | Accepted | Fixed by C6 |
| CORE-008 | `set()` accepts unknown names | Accepted | Fixed by C7 (breaking) |
| CORE-009 | `getPal( false )` includes index 0 | Accepted | Fixed by C6 |
| CORE-010 | `setChar()` ignored on the default font | Accepted | Fixed by C8 |
| CORE-011 | `getImage()` of an offscreen screen | Accepted | Fixed by C6 |
| CORE-012 | Polygon coordinates past 2³¹ wrap | Accepted | Fixed by C6 |
| CORE-013 | Numeric validation gaps | Accepted | Fixed by C6 |
| CORE-014 | Text outside the font table undocumented | Accepted | Documented in R.2 (C10). The Latin-1 to CP437 mapping is deferred to a later release, although keyboard A16 lets typed accented text reach `print()` in 2.3.0 |
| CORE-015 | `removeScreen` forms and declarations | Accepted | Fixed by C5 and C6 |
| CORE-016 | Plugin declarations for Lite | Accepted | Fixed by C5 |
| CORE-017 | `addCommand` declaration and example | Accepted | Fixed by C5 |
| CORE-018 | Circle geometry cache unbounded | Accepted | Fixed by C8 |
| CORE-019 | Release packaging details | Accepted | Fixed by C11: rename, `"private": true`, and the changelog in the tarball |
| CORE-020 | Missing checks | Accepted | Section 5.2, without item 5 |
| C1–C3, C5, C6, C8 | Fixes | Accepted | Follow-up table |
| C4 | Plugin-internal subscriptions | Rejected | Core API stays as is; CORE-004 is documented instead |
| C7 | Strict `set()` | Accepted | Breaking core API change, approved. `CORE-V2.3-ROADMAP.md` |
| C9 | No frame hook in 2.3 | Accepted | |
| C10 | Document text outside the font table | Accepted | Latin-1 mapping deferred |
| C11 | Release packaging | Accepted | R.5 and R.6; the rename can land any time |
