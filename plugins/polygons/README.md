# Polygons Plugin

Draw outlined and optionally filled polygons with Pi.js. Polygon fills use integer scanline spans
aligned with Pi.js's Bresenham outlines, then submit those spans to the existing WebGL geometry
batch as one-pixel-tall rectangles.

## Loading

Build the plugin with:

```bash
node scripts/build-plugin.js polygons
```

Load the IIFE bundle after Pi.js:

```html
<script src="build/pi.js"></script>
<script src="build/plugins/polygons/polygons.min.js"></script>
```

Or register the ESM build explicitly:

```javascript
import pi from "./build/pi.esm.min.js";
import polygonsPlugin from "./build/plugins/polygons/polygons.esm.min.js";

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
format supported by Pi.js.

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

Coordinates are rounded to integers. Convex and concave simple polygons are supported in either
winding order. A repeated closing point and redundant consecutive or collinear points are removed
automatically.

Holes, zero-area polygons, and self-intersecting polygons are not supported.

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
