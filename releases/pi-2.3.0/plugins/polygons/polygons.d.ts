import type { PluginAPI } from "pijs-web/lite";

// Commands the polygons plugin adds to the API and each screen
interface PolygonsScreenCommands {
	/**
	 * Draws a closed polygon outline with an optional fill.
	 *
	 * Draws a closed polygon on the current screen. The outline uses the current drawing color. If **fillColor** is supplied, the interior is filled first, then the outline is drawn on top. Omit fillColor, or pass null, to draw only the outline. fillColor accepts a palette index or any Pi.js color value.
	 *
	 * **points** is one closed path. Pass a flat array of x, y pairs, a typed array, or an array of { x, y } objects. Coordinates round to integers. Consecutive duplicate points and a repeated closing point are removed. At least three distinct rounded points are required. The path closes automatically from the last point to the first.
	 *
	 * Convex, concave, self-intersecting, and overlapping shapes are supported, including stars and bowties. Filling uses nonzero winding: overlapping regions stay filled when edges wind the same way, and cancel when they wind opposite ways. Reversing the whole path does not change the fill. Fill coverage can differ from the outline on some edges, including the bottom row. A translucent outline blends over filled boundary pixels.
	 *
	 * If the fill and outline resolve to the same RGBA color, only the fill is drawn. After filling, the current drawing color is restored.
	 *
	 * Treat **points** as immutable. polygon remembers each points collection; mutating it in place will not update the shape. Replace the array or typed array when coordinates change.
	 * @param points Flat coordinates or point objects describing one closed path.
	 * @param fillColor Optional palette index or Pi.js color value; null draws only the outline.
	 * @returns This function does not return a value.
	 */
	polygon( params: { "points": Array<number> | Array<{ x: number; y: number }> | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array; "fillColor"?: any } ): void;
	polygon( points: Array<number> | Array<{ x: number; y: number }> | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array, fillColor?: any ): void;
}

declare module "pijs-web/lite" {
	interface PluginScreenCommands extends PolygonsScreenCommands {}
}

/**
 * polygons plugin initializer for Pi.js.
 */
declare function polygonsPlugin( pluginApi: PluginAPI ): void;
export default polygonsPlugin;
