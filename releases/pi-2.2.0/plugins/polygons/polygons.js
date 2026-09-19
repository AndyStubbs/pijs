/**
 * Polygons Plugin for Pi.js - Outlined and nonzero-filled complex polygons
 * @version 1.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
"use strict";
(() => {
  // plugins/polygons/index.js
  var m_polygonCache = /* @__PURE__ */ new WeakMap();
  function polygonsPlugin(pluginApi) {
    pluginApi.addCommand("polygon", polygon, true, ["points", "fillColor"]);
    function polygon(screenData, options) {
      const polygonData = getPolygonData(options.points, pluginApi.utils.getInt);
      const outlineColor = screenData.api.getColor();
      if (options.fillColor != null) {
        let fillColor;
        if (typeof options.fillColor === "number") {
          fillColor = screenData.api.getPalColor(options.fillColor);
        } else {
          fillColor = pluginApi.utils.convertToColor(options.fillColor);
        }
        if (fillColor == null) {
          throw createParameterError(
            "polygon: Parameter 'fillColor' must be a valid color."
          );
        }
        if (polygonData.spans === null) {
          polygonData.spans = generateSpans(polygonData.coordinates);
        }
        drawFill(screenData, polygonData, fillColor, outlineColor);
        if (fillColor.key === outlineColor.key) {
          return;
        }
      }
      drawOutline(screenData, polygonData.coordinates);
    }
  }
  function getPolygonData(points, getInt) {
    if (!isPointCollection(points)) {
      throw createParameterError(
        "polygon: Parameter 'points' must be an array or typed array."
      );
    }
    const cached = m_polygonCache.get(points);
    if (cached) {
      return cached;
    }
    const coordinates = normalizePoints(points, getInt);
    validatePolygon(coordinates);
    const polygonData = {
      "coordinates": coordinates,
      "spans": null
    };
    m_polygonCache.set(points, polygonData);
    return polygonData;
  }
  function isPointCollection(value) {
    return Array.isArray(value) || ArrayBuffer.isView(value) && !(value instanceof DataView);
  }
  function normalizePoints(points, getInt) {
    const coordinates = [];
    const usesPointObjects = Array.isArray(points) && points.length > 0 && typeof points[0] === "object" && points[0] !== null;
    if (usesPointObjects) {
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (!point || typeof point !== "object" || Array.isArray(point)) {
          throw createParameterError(
            "polygon: Point objects must contain valid x and y coordinates."
          );
        }
        appendCoordinate(coordinates, point.x, point.y, getInt);
      }
    } else {
      if (points.length % 2 !== 0) {
        throw createParameterError(
          "polygon: A flat points array must contain an even number of values."
        );
      }
      for (let i = 0; i < points.length; i += 2) {
        appendCoordinate(coordinates, points[i], points[i + 1], getInt);
      }
    }
    removeConsecutiveDuplicates(coordinates);
    removeClosingDuplicate(coordinates);
    return new Float64Array(coordinates);
  }
  function appendCoordinate(coordinates, x, y, getInt) {
    const parsedX = getInt(x, null);
    const parsedY = getInt(y, null);
    if (parsedX === null || parsedY === null || !Number.isSafeInteger(parsedX) || !Number.isSafeInteger(parsedY)) {
      throw createParameterError(
        "polygon: Point coordinates must be finite numbers that round to safe integers."
      );
    }
    coordinates.push(parsedX, parsedY);
  }
  function removeConsecutiveDuplicates(coordinates) {
    let length = 0;
    for (let i = 0; i < coordinates.length; i += 2) {
      const x = coordinates[i];
      const y = coordinates[i + 1];
      if (length === 0 || x !== coordinates[length - 2] || y !== coordinates[length - 1]) {
        coordinates[length++] = x;
        coordinates[length++] = y;
      }
    }
    coordinates.length = length;
  }
  function removeClosingDuplicate(coordinates) {
    while (coordinates.length >= 4) {
      const last = coordinates.length - 2;
      if (coordinates[0] !== coordinates[last] || coordinates[1] !== coordinates[last + 1]) {
        break;
      }
      coordinates.length -= 2;
    }
  }
  function validatePolygon(coordinates) {
    const distinct = /* @__PURE__ */ new Set();
    for (let i = 0; i < coordinates.length; i += 2) {
      distinct.add(coordinates[i] + "," + coordinates[i + 1]);
      if (distinct.size === 3) {
        return;
      }
    }
    throw createPolygonError("polygon: At least three distinct points are required.");
  }
  function buildEdgeTable(coordinates) {
    const edges = [];
    const pointCount = coordinates.length / 2;
    for (let i = 0; i < pointCount; i++) {
      const next = (i + 1) % pointCount;
      const x1 = getX(coordinates, i);
      const y1 = getY(coordinates, i);
      const x2 = getX(coordinates, next);
      const y2 = getY(coordinates, next);
      if (y1 === y2) {
        continue;
      }
      let x = x1;
      let direction = 1;
      if (y1 > y2) {
        x = x2;
        direction = -1;
      }
      edges.push({
        "yMin": Math.min(y1, y2),
        "yMax": Math.max(y1, y2),
        "x": x,
        "inverseSlope": (x2 - x1) / (y2 - y1),
        "direction": direction,
        "index": i
      });
    }
    edges.sort(function(a, b) {
      return a.yMin - b.yMin || a.index - b.index;
    });
    return edges;
  }
  function generateSpans(coordinates) {
    const edges = buildEdgeTable(coordinates);
    const active = [];
    const spans = [];
    let edgeIndex = 0;
    if (edges.length === 0) {
      return new Int32Array(0);
    }
    let y = edges[0].yMin;
    while (edgeIndex < edges.length || active.length > 0) {
      let length = 0;
      for (const edge of active) {
        if (y < edge.yMax) {
          active[length++] = edge;
        }
      }
      active.length = length;
      while (edgeIndex < edges.length && edges[edgeIndex].yMin === y) {
        active.push(edges[edgeIndex++]);
      }
      active.sort(function(a, b) {
        return a.x - b.x || a.index - b.index;
      });
      let winding = 0;
      let leftX = 0;
      for (const edge of active) {
        if (winding === 0) {
          leftX = edge.x;
        }
        winding += edge.direction;
        if (winding === 0) {
          appendSpan(spans, y, Math.round(leftX), Math.round(edge.x));
        }
      }
      for (const edge of active) {
        edge.x += edge.inverseSlope;
      }
      if (active.length === 0 && edgeIndex < edges.length) {
        y = edges[edgeIndex].yMin;
      } else {
        y++;
      }
    }
    return new Int32Array(spans);
  }
  function appendSpan(spans, y, startX, endX) {
    const previous = spans.length - 3;
    if (previous >= 0 && spans[previous] === y && startX <= spans[previous + 2] + 1) {
      spans[previous + 2] = Math.max(spans[previous + 2], endX);
    } else {
      spans.push(y, startX, endX);
    }
  }
  function drawFill(screenData, polygonData, color, outlineColor) {
    const spans = polygonData.spans;
    const api = screenData.api;
    try {
      api.setColor(color);
      for (let i = 0; i < spans.length; i += 3) {
        const y = spans[i];
        const x1 = spans[i + 1];
        const x2 = spans[i + 2];
        api.rect(x1, y, x2 - x1 + 1, 1);
      }
    } finally {
      api.setColor(outlineColor);
    }
  }
  function drawOutline(screenData, coordinates) {
    const pointCount = coordinates.length / 2;
    for (let i = 0; i < pointCount; i++) {
      const next = (i + 1) % pointCount;
      screenData.api.line(
        getX(coordinates, i),
        getY(coordinates, i),
        getX(coordinates, next),
        getY(coordinates, next)
      );
    }
  }
  function getX(coordinates, pointIndex) {
    return coordinates[pointIndex * 2];
  }
  function getY(coordinates, pointIndex) {
    return coordinates[pointIndex * 2 + 1];
  }
  function createParameterError(message) {
    const error = new TypeError(message);
    error.code = "INVALID_PARAMETER";
    return error;
  }
  function createPolygonError(message) {
    const error = new RangeError(message);
    error.code = "INVALID_POLYGON";
    return error;
  }
  if (typeof window !== "undefined" && window.pi) {
    window.pi.registerPlugin({
      "name": "polygons",
      "version": "1.0.0",
      "description": "Outlined and nonzero-filled complex polygons",
      "init": polygonsPlugin
    });
  }
})();
//# sourceMappingURL=polygons.js.map
