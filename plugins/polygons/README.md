# Polygons Plugin

Draw outlined and optionally filled complex polygons with Pi.js. A CPU-only Active Edge List
rasterizer generates integer scanline spans using nonzero winding. The public `rect` command draws
these spans as one-pixel-tall rectangles; Pi.js handles WebGL batching internally.

## Loading

When developing in the Pi.js repository, build the plugin with:

```bash
node scripts/build-plugin.js polygons
```

For any other project, copy the Pi.js bundle and the polygons plugin bundle into your project's
own directory (for example, `vendor/`). Only these JavaScript files are needed at runtime; the
plugin does not import or bundle Pi.js source modules. No Pi.js repository checkout is required.

Load the IIFE bundle after Pi.js:

```html
<script src="./vendor/pi.js"></script>
<script src="./vendor/polygons.min.js"></script>
```

For browser ESM usage, import Pi.js first and then import the plugin for its automatic
registration side effect:

```javascript
import pi from "./vendor/pi.esm.min.js";
import "./vendor/polygons.esm.min.js";
```

For controlled registration, import the plugin before Pi.js and register its default export:

```javascript
import polygonsPlugin from "./vendor/polygons.esm.min.js";
import pi from "./vendor/pi.esm.min.js";

pi.registerPlugin( {
	"name": "polygons",
	"version": "1.0.0",
	"init": polygonsPlugin
} );
```

## API

### `polygon( points, fillColor )`

Draws a closed polygon outline in the current Pi.js color. When `fillColor` is supplied, the
polygon is filled before its outline is drawn. The fill accepts palette indices and every color
format supported by Pi.js. If the resolved fill and current color have identical RGBA values, the
outline pass is skipped. A null or undefined fill color draws only the outline.

```javascript
$.setColor( 15 );
$.polygon( [ 10, 10, 80, 20, 60, 70 ], 4 );

$.polygon(
	[ { "x": 10, "y": 10 }, { "x": 80, "y": 20 }, { "x": 60, "y": 70 } ],
	"#4488ff"
);

$.polygon( {
	"points": new Int16Array( [ 10, 10, 80, 20, 60, 70 ] ),
	"fillColor": "rgba(68, 136, 255, 0.5)"
} );

// Outline only
$.polygon( [ 10, 10, 80, 20, 60, 70 ] );
```

Coordinates are rounded to integers. Flat arrays, typed arrays, and arrays of `{ x, y }` objects
are accepted. Paths close implicitly from the last vertex to the first. Repeated starting points
at the tail and consecutive duplicate points are removed automatically; other vertices are kept.
At least three distinct rounded points are required. Collinear and zero-area paths are accepted.

Convex, concave, self-intersecting, and self-overlapping paths are supported, including stars and
bowties. Filling uses nonzero winding: crossings in opposite directions cancel, while crossings
in the same direction accumulate. Reversing the entire path preserves its fill. The input describes
one closed path, not an array of separate contours.

Each span includes both rounded X endpoints, and touching spans are merged to draw fill pixels
only once. Crossing edges contribute on rows `yMin <= y < yMax`; horizontal edges do not contribute
crossings. Thus fill coverage alone can differ from the line outline, including at the bottom row
and along shallow edges. Distinct outline colors are drawn over the fill, so translucent outlines
blend over filled boundary pixels. The active drawing color is restored after filling.

## Scanline Cache

Normalized coordinates are cached by the identity of the supplied points array or typed array.
Fill spans are generated lazily on the first filled draw, then cached with those coordinates.
Outline-only calls do not generate spans. Treat the collection and its point objects as immutable.
Replace the outer collection when a vertex changes:

```javascript
let points = [ 10, 10, 80, 20, 60, 70 ];
$.polygon( points, 4 );

// Replace rather than mutate the cached array.
points = [ 10, 10, 90, 20, 60, 70 ];
$.polygon( points, 4 );
```
