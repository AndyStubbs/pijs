/**
 * Pi.js - Graphics and Sound Library
 * @version 2.0.0-alpha.2
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    calcColorDifference: () => calcColorDifference,
    clamp: () => clamp,
    convertToColor: () => convertToColor,
    degreesToRadian: () => degreesToRadian,
    errFn: () => errFn,
    generateColorKey: () => generateColorKey,
    getFloat: () => getFloat,
    getInt: () => getInt,
    hexToData: () => hexToData,
    inRange: () => inRange,
    inRange2: () => inRange2,
    isDomElement: () => isDomElement,
    isFunction: () => isFunction,
    isObjectLiteral: () => isObjectLiteral,
    pad: () => pad,
    padL: () => padL,
    parseOptions: () => parseOptions,
    queueMicrotask: () => queueMicrotask,
    radiansToDegrees: () => radiansToDegrees,
    rgbToColor: () => rgbToColor,
    rndRange: () => rndRange,
    setColor: () => setColor
  });
  var errFn = (commandName) => {
    const error = new Error(
      `${commandName}: No screens available for command. You must first create a screen with $.screen command.`
    );
    error.code = "NO_SCREEN";
    throw error;
  };
  function parseOptions(args, parameterNames) {
    const resultOptions = {};
    for (const name of parameterNames) {
      resultOptions[name] = null;
    }
    let isNamedParameterFound = false;
    if (args.length > 0 && isObjectLiteral(args[0])) {
      const inputOptions = args[0];
      for (const name of parameterNames) {
        if (name in inputOptions) {
          isNamedParameterFound = true;
          resultOptions[name] = inputOptions[name];
        }
      }
    }
    if (!isNamedParameterFound) {
      for (let i = 0; i < parameterNames.length; i++) {
        if (i < args.length) {
          resultOptions[parameterNames[i]] = args[i];
        }
      }
    }
    return resultOptions;
  }
  var isFunction = (fn) => typeof fn === "function";
  var isDomElement = (el) => el instanceof Element;
  var isObjectLiteral = (obj) => {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      return false;
    }
    const proto = Object.getPrototypeOf(obj);
    return proto === null || proto === Object.prototype;
  };
  function hexToData(hex, width, height) {
    hex = hex.toUpperCase();
    const data = [];
    let i = 0;
    let digits = "";
    let digitIndex = 0;
    for (let y = 0; y < height; y++) {
      data.push([]);
      for (let x = 0; x < width; x++) {
        if (digitIndex >= digits.length) {
          let hexPart = parseInt(hex[i], 16);
          if (isNaN(hexPart)) {
            hexPart = 0;
          }
          digits = padL(hexPart.toString(2), 4, "0");
          i += 1;
          digitIndex = 0;
        }
        data[y].push(parseInt(digits[digitIndex]));
        digitIndex += 1;
      }
    }
    return data;
  }
  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }
  function inRange(point, hitBox) {
    return point.x >= hitBox.x && point.x < hitBox.x + hitBox.width && point.y >= hitBox.y && point.y < hitBox.y + hitBox.height;
  }
  function inRange2(x1, y1, x2, y2, width, height) {
    return x1 >= x2 && x1 < x2 + width && y1 >= y2 && y1 < y2 + height;
  }
  function rndRange(min, max) {
    return Math.random() * (max - min) + min;
  }
  function degreesToRadian(deg) {
    return deg * (Math.PI / 180);
  }
  function radiansToDegrees(rad) {
    return rad * (180 / Math.PI);
  }
  function padL(str, len, c) {
    if (typeof c !== "string") {
      c = " ";
    }
    let pad2 = "";
    str = str + "";
    for (let i = str.length; i < len; i++) {
      pad2 += c;
    }
    return pad2 + str;
  }
  function pad(str, len, c) {
    if (typeof c !== "string" || c.length === 0) {
      c = " ";
    }
    str = str + "";
    while (str.length < len) {
      str = c + str + c;
    }
    if (str.length > len) {
      str = str.substring(0, len);
    }
    return str;
  }
  function getInt(val, def) {
    if (val === null || val === void 0) {
      return def;
    }
    const parsed = Number(val);
    if (!Number.isFinite(parsed)) {
      return def;
    }
    return Math.round(parsed);
  }
  function getFloat(val, def) {
    if (val === null || val === void 0) {
      return def;
    }
    const parsed = Number(val);
    if (!Number.isFinite(parsed)) {
      return def;
    }
    return parsed;
  }
  var queueMicrotask = (callback) => {
    if (window.queueMicrotask) {
      window.queueMicrotask(callback);
    } else {
      setTimeout(callback, 0);
    }
  };
  var COLOR_PROTO = {
    "key": 0,
    "r": 0,
    "g": 0,
    "b": 0,
    "a": 0,
    "rgba": "",
    "hex": ""
  };
  var m_colorCheckerContext = document.createElement("canvas").getContext(
    "2d",
    { "willReadFrequently": true }
  );
  function generateColorKey(r, g, b, a) {
    return r << 24 | g << 16 | b << 8 | a;
  }
  function rgbToColor(r, g, b, a) {
    const hex = rgbToHex(r, g, b, a);
    return createColor(r, g, b, a, hex);
  }
  function convertToColor(color) {
    if (color === void 0 || color === null || color === "") {
      return null;
    }
    if (Object.getPrototypeOf(color) === COLOR_PROTO) {
      return color;
    } else if (Array.isArray(color)) {
      if (color.length < 3) {
        return null;
      } else if (color.length === 3) {
        color.push(255);
      }
    } else if (color.r !== void 0) {
      color = [color.r, color.g, color.b, color.a];
    } else if (typeof color === "string") {
      const checkHexColor = /(^#[0-9A-F]{8}$)|(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
      if (checkHexColor.test(color)) {
        return hexToColor(color);
      }
      if (color.indexOf("rgb") === 0) {
        color = splitRgb(color);
        if (color.length < 3) {
          return null;
        } else if (color.length === 3) {
          color.push(255);
        }
      } else {
        return colorStringToColor(color);
      }
    }
    for (let i = 0; i < 3; i += 1) {
      color[i] = getInt(color[i], 0);
    }
    color[3] = getFloat(color[3], 0);
    if (color[3] < 1) {
      color[3] = Math.round(color[3] * 255);
    } else {
      color[3] = Math.round(color[3]);
    }
    return rgbToColor(color[0], color[1], color[2], color[3]);
  }
  function calcColorDifference(c1, c2, w = [0.2, 0.68, 0.07, 0.05]) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    const da = c1.a - c2.a;
    return dr * dr * w[0] + dg * dg * w[1] + db * db * w[2] + da * da * w[3];
  }
  function createColor(r, g, b, a, hex) {
    const color = Object.create(COLOR_PROTO);
    color.key = generateColorKey(r, g, b, a, hex);
    color.r = r;
    color.g = g;
    color.b = b;
    color.a = a;
    color.rgba = `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
    color.hex = hex;
    return color;
  }
  function setColor(colorSrc, colorDest) {
    colorDest.key = colorSrc.key;
    colorDest.r = colorSrc.r;
    colorDest.g = colorSrc.g;
    colorDest.b = colorSrc.b;
    colorDest.a = colorSrc.a;
    colorDest.rgba = colorSrc.rgba;
    colorDest.hex = colorSrc.hex;
  }
  function hexToColor(hex) {
    let r, g, b, a;
    if (hex.length === 4) {
      r = parseInt(hex.slice(1, 2), 16) * 16 - 1;
      g = parseInt(hex.slice(2, 3), 16) * 16 - 1;
      b = parseInt(hex.slice(3, 4), 16) * 16 - 1;
    } else {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    if (hex.length === 9) {
      a = parseInt(hex.slice(7, 9), 16);
    } else {
      a = 255;
    }
    return createColor(r, g, b, a, hex);
  }
  function splitRgb(s) {
    s = s.slice(s.indexOf("(") + 1, s.indexOf(")"));
    const parts = s.split(",");
    const colors = [];
    for (let i = 0; i < parts.length; i++) {
      let val;
      if (i === 3) {
        val = parseFloat(parts[i].trim());
        if (val <= 1) {
          val *= 255;
        }
      } else {
        val = parseInt(parts[i].trim());
      }
      colors.push(val);
    }
    return colors;
  }
  function cToHex(c) {
    if (!Number.isInteger(c)) {
      c = Math.round(c);
    }
    c = clamp(c, 0, 255);
    const hex = Number(c).toString(16);
    return hex.length < 2 ? "0" + hex : hex.toUpperCase();
  }
  function rgbToHex(r, g, b, a) {
    if (isNaN(a)) {
      a = 255;
    }
    return "#" + cToHex(r) + cToHex(g) + cToHex(b) + cToHex(a);
  }
  function colorStringToColor(colorStr) {
    m_colorCheckerContext.clearRect(0, 0, 1, 1);
    m_colorCheckerContext.fillStyle = colorStr;
    m_colorCheckerContext.fillRect(0, 0, 1, 1);
    const data = m_colorCheckerContext.getImageData(0, 0, 1, 1).data;
    return rgbToColor(data[0], data[1], data[2], data[3]);
  }

  // src/core/state-settings.js
  var state_settings_exports = {};
  __export(state_settings_exports, {
    addCommand: () => addCommand,
    addSetting: () => addSetting,
    done: () => done,
    init: () => init7,
    processCommands: () => processCommands,
    set: () => set,
    wait: () => wait
  });

  // src/core/screen-manager.js
  var screen_manager_exports = {};
  __export(screen_manager_exports, {
    CANVAS2D_RENDER_MODE: () => CANVAS2D_RENDER_MODE,
    WEBGL2_RENDER_MODE: () => WEBGL2_RENDER_MODE,
    activeScreenData: () => m_activeScreenData,
    addScreenCleanupFunction: () => addScreenCleanupFunction,
    addScreenDataItem: () => addScreenDataItem,
    addScreenDataItemGetter: () => addScreenDataItemGetter,
    addScreenInitFunction: () => addScreenInitFunction,
    addScreenResizeFunction: () => addScreenResizeFunction,
    getActiveScreen: () => getActiveScreen,
    getAllScreens: () => getAllScreens,
    init: () => init6
  });

  // src/graphics/renderer-webgl2.js
  var renderer_webgl2_exports = {};
  __export(renderer_webgl2_exports, {
    IMAGE_BATCH: () => IMAGE_BATCH,
    POINTS_BATCH: () => POINTS_BATCH,
    blendModeChanged: () => blendModeChanged,
    cleanup: () => cleanup,
    cls: () => cls,
    deleteWebGL2Texture: () => deleteWebGL2Texture,
    drawImage: () => drawImage,
    drawPixelUnsafe: () => drawPixelUnsafe,
    getWebGL2Texture: () => getWebGL2Texture,
    init: () => init4,
    initWebGL: () => initWebGL,
    isWebgl2Capable: () => m_isWebgl2Capable,
    prepareBatch: () => prepareBatch,
    readPixel: () => readPixel,
    readPixelAsync: () => readPixelAsync,
    readPixels: () => readPixels,
    readPixelsAsync: () => readPixelsAsync,
    setImageDirty: () => setImageDirty
  });

  // src/graphics/pens.js
  var pens_exports = {};
  __export(pens_exports, {
    BLENDS: () => BLENDS,
    BLEND_ALPHA: () => BLEND_ALPHA,
    BLEND_REPLACE: () => BLEND_REPLACE,
    PENS: () => PENS,
    PEN_CIRCLE: () => PEN_CIRCLE,
    PEN_PIXEL: () => PEN_PIXEL,
    PEN_SQUARE: () => PEN_SQUARE,
    init: () => init3
  });

  // src/graphics/graphics-api.js
  var graphics_api_exports = {};
  __export(graphics_api_exports, {
    buildGraphicsApi: () => buildGraphicsApi,
    init: () => init2
  });

  // src/graphics/colors.js
  var colors_exports = {};
  __export(colors_exports, {
    findColorIndexByColorValue: () => findColorIndexByColorValue,
    getColorValueByIndex: () => getColorValueByIndex,
    getColorValueByRawInput: () => getColorValueByRawInput,
    init: () => init
  });
  var m_defaultPal = [];
  var m_defaultPalMap = /* @__PURE__ */ new Map();
  var m_defaultColor = -1;
  function init(api2) {
    const defaultPaletteHex = [
      "#0000AA",
      "#00AA00",
      "#00AAAA",
      "#AA0000",
      "#AA00AA",
      "#AA5500",
      "#AAAAAA",
      "#555555",
      "#5555FF",
      "#55FF55",
      "#55FFFF",
      "#FF5555",
      "#FF55FF",
      "#FFFF55",
      "#FFFFFF",
      "#000000",
      "#141414",
      "#202020",
      "#2D2D2D",
      "#393939",
      "#454545",
      "#515151",
      "#616161",
      "#717171",
      "#828282",
      "#929292",
      "#A2A2A2",
      "#B6B6B6",
      "#CACACA",
      "#E3E3E3",
      "#FFFFFF",
      "#0000FF",
      "#4100FF",
      "#7D00FF",
      "#BE00FF",
      "#FF00FF",
      "#FF00BE",
      "#FF007D",
      "#FF0041",
      "#FF0000",
      "#FF4100",
      "#FF7D00",
      "#FFBE00",
      "#FFFF00",
      "#BEFF00",
      "#7DFF00",
      "#41FF00",
      "#00FF00",
      "#00FF41",
      "#00FF7D",
      "#00FFBE",
      "#00FFFF",
      "#00BEFF",
      "#007DFF",
      "#0041FF",
      "#7D7DFF",
      "#9E7DFF",
      "#BE7DFF",
      "#DF7DFF",
      "#FF7DFF",
      "#FF7DDF",
      "#FF7DBE",
      "#FF7D9E",
      "#FF7D7D",
      "#FF9E7D",
      "#FFBE7D",
      "#FFDF7D",
      "#FFFF7D",
      "#DFFF7D",
      "#BEFF7D",
      "#9EFF7D",
      "#7DFF7D",
      "#7DFF9E",
      "#7DFFBE",
      "#7DFFDF",
      "#7DFFFF",
      "#7DDFFF",
      "#7DBEFF",
      "#7D9EFF",
      "#B6B6FF",
      "#C6B6FF",
      "#DBB6FF",
      "#EBB6FF",
      "#FFB6FF",
      "#FFB6EB",
      "#FFB6DB",
      "#FFB6C6",
      "#FFB6B6",
      "#FFC6B6",
      "#FFDBB6",
      "#FFEBB6",
      "#FFFFB6",
      "#EBFFB6",
      "#DBFFB6",
      "#C6FFB6",
      "#B6FFB6",
      "#B6FFC6",
      "#B6FFDB",
      "#B6FFEB",
      "#B6FFFF",
      "#B6EBFF",
      "#B6DBFF",
      "#B6C6FF",
      "#000071",
      "#1C0071",
      "#390071",
      "#550071",
      "#710071",
      "#710055",
      "#710039",
      "#71001C",
      "#710000",
      "#711C00",
      "#713900",
      "#715500",
      "#717100",
      "#557100",
      "#397100",
      "#1C7100",
      "#007100",
      "#00711C",
      "#007139",
      "#007155",
      "#007171",
      "#005571",
      "#003971",
      "#001C71",
      "#393971",
      "#453971",
      "#553971",
      "#613971",
      "#713971",
      "#713961",
      "#713955",
      "#713945",
      "#713939",
      "#714539",
      "#715539",
      "#716139",
      "#717139",
      "#617139",
      "#557139",
      "#457139",
      "#397139",
      "#397145",
      "#397155",
      "#397161",
      "#397171",
      "#396171",
      "#395571",
      "#394571",
      "#515171",
      "#595171",
      "#615171",
      "#695171",
      "#715171",
      "#715169",
      "#715161",
      "#715159",
      "#715151",
      "#715951",
      "#716151",
      "#716951",
      "#717151",
      "#697151",
      "#617151",
      "#597151",
      "#517151",
      "#517159",
      "#517161",
      "#517169",
      "#517171",
      "#516971",
      "#516171",
      "#515971",
      "#000041",
      "#100041",
      "#200041",
      "#310041",
      "#410041",
      "#410031",
      "#410020",
      "#410010",
      "#410000",
      "#411000",
      "#412000",
      "#413100",
      "#414100",
      "#314100",
      "#204100",
      "#104100",
      "#004100",
      "#004110",
      "#004120",
      "#004131",
      "#004141",
      "#003141",
      "#002041",
      "#001041",
      "#202041",
      "#282041",
      "#312041",
      "#392041",
      "#412041",
      "#412039",
      "#412031",
      "#412028",
      "#412020",
      "#412820",
      "#413120",
      "#413920",
      "#414120",
      "#394120",
      "#314120",
      "#284120",
      "#204120",
      "#204128",
      "#204131",
      "#204139",
      "#204141",
      "#203941",
      "#203141",
      "#202841",
      "#2D2D41",
      "#312D41",
      "#352D41",
      "#3D2D41",
      "#412D41",
      "#412D3D",
      "#412D35",
      "#412D31",
      "#412D2D",
      "#41312D",
      "#41352D",
      "#413D2D",
      "#41412D",
      "#3D412D",
      "#35412D",
      "#31412D",
      "#2D412D",
      "#2D4131",
      "#2D4135",
      "#2D413D",
      "#2D4141",
      "#2D3D41",
      "#2D3541",
      "#2D3141",
      "#000000",
      "#000000",
      "#000000",
      "#000000",
      "#000000",
      "#000000",
      "#000000"
    ];
    setDefaultPal({ "pal": defaultPaletteHex });
    setDefaultColor({ "color": 7 });
    addScreenDataItemGetter("pal", () => m_defaultPal);
    addScreenDataItemGetter("color", () => m_defaultColor);
    addScreenDataItemGetter("palMap", () => m_defaultPalMap);
    registerCommands(api2);
  }
  function registerCommands() {
    addCommand("setDefaultPal", setDefaultPal, false, ["pal"]);
    addCommand("setDefaultColor", setDefaultColor, false, ["color"]);
    addCommand("setColor", setColor2, true, ["color", "isAddToPalette"]);
    addCommand("getColor", getColor, true, ["asIndex"]);
    addCommand("getPal", getPal, true, []);
    addCommand("setPal", setPal, true, ["pal"]);
    addCommand("getPalIndex", getPalIndex, true, ["color", "tolerance"]);
    addCommand("setBgColor", setBgColor, true, ["color"]);
    addCommand("setContainerBgColor", setContainerBgColor, true, ["color"]);
    addCommand("setPalColor", setPalColor, true, ["index", "color"]);
    addCommand("getPalColor", getPalColor, true, ["index"]);
  }
  function setDefaultPal(options) {
    const pal = options.pal;
    if (!Array.isArray(pal)) {
      const error = new TypeError("setDefaultPal: Parameter pal must be an array.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (pal.length === 0) {
      const error = new RangeError(
        "setDefaultPal: Parameter pal must have at least one color value."
      );
      error.code = "EMPTY_PALETTE";
      throw error;
    }
    m_defaultPal = [convertToColor([0, 0, 0, 0])];
    for (let i = 0; i < pal.length; i++) {
      const c = convertToColor(pal[i]);
      if (c === null) {
        console.warn(`setDefaultPal: Invalid color value inside array pal at index: ${i}.`);
        m_defaultPal.push(convertToColor("#000000"));
      } else {
        m_defaultPal.push(c);
      }
    }
    m_defaultPalMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < m_defaultPal.length; i++) {
      m_defaultPalMap.set(m_defaultPal[i].key, i);
    }
    if (!m_defaultPalMap.has(m_defaultColor.key)) {
      m_defaultColor = m_defaultPal[1];
    }
  }
  function setDefaultColor(options) {
    let c = options.color;
    if (!isNaN(Number(c)) && m_defaultPal.length > c) {
      m_defaultColor = m_defaultPal[c];
    } else {
      c = convertToColor(c);
      if (c === null) {
        const error = new TypeError(
          "setDefaultColor: Parameter color is not a valid color format."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      m_defaultColor = c;
    }
  }
  function setColor2(screenData, options) {
    const colorInput = options.color;
    const isAddToPalette = !!options.isAddToPalette;
    let colorValue;
    if (typeof colorInput === "number") {
      if (colorInput >= screenData.pal.length) {
        const error = new TypeError(
          `setColor: Parameter color index is not in pal.`
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      colorValue = screenData.pal[colorInput];
    } else {
      colorValue = convertToColor(colorInput);
      if (colorValue === null) {
        const error = new TypeError(
          `setColor: Parameter color is not a valid color format.`
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      if (isAddToPalette && findColorIndexByColorValue(screenData, colorValue) === null) {
        screenData.pal.push(colorValue);
        screenData.palMap.set(colorValue.key, screenData.pal.length - 1);
      }
    }
    setColor(colorValue, screenData.color);
    return true;
  }
  function getColor(screenData, options) {
    const asIndex = !!options.asIndex;
    if (asIndex) {
      return findColorIndexByColorValue(screenData, screenData.color);
    }
    return rgbToColor(
      screenData.color.r,
      screenData.color.g,
      screenData.color.b,
      screenData.color.a
    );
  }
  function getPal(screenData) {
    const filteredPal = [];
    for (let i = 1; i < screenData.pal.length; i += 1) {
      filteredPal.push({ ...screenData.pal[i] });
    }
    return filteredPal;
  }
  function setPal(screenData, options) {
    const pal = options.pal;
    if (!Array.isArray(pal)) {
      const error = new TypeError("setPal: Parameter pal is must be an array.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (pal.length === 0) {
      const error = new RangeError(
        "setPal: Parameter pal must have at least one color value."
      );
      error.code = "EMPTY_PALETTE";
      throw error;
    }
    const newPal = [convertToColor([0, 0, 0, 0])];
    for (let i = 0; i < pal.length; i++) {
      const c = convertToColor(pal[i]);
      if (c === null) {
        console.warn(`setPal: Invalid color value inside array pal at index: ${i}.`);
        newPal.push(convertToColor("#000000"));
      } else {
        newPal.push(c);
      }
    }
    screenData.pal = newPal;
    screenData.palMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < newPal.length; i++) {
      screenData.palMap.set(newPal[i].key, i);
    }
    const currentColor = screenData.color;
    const newIndex = findColorIndexByColorValue(screenData, currentColor);
    if (newIndex !== null) {
      screenData.color = newPal[newIndex];
    } else {
      screenData.color = newPal[1];
    }
  }
  function getPalIndex(screenData, options) {
    let color = options.color;
    let tolerance = getFloat(options.tolerance, 1);
    if (tolerance < 0 || tolerance > 1) {
      const error = new RangeError(
        "getPalIndex: Parameter tolerance must be a number between 0 and 1."
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    const colorValue = convertToColor(color);
    if (colorValue === null) {
      const error = new TypeError(
        `getPalIndex: Parameter color is not a valid color format.`
      );
      error.code = "INVALID_COLOR";
      throw error;
    }
    const index = findColorIndexByColorValue(screenData, colorValue, tolerance);
    if (index === null) {
      return false;
    }
    return index;
  }
  function setBgColor(screenData, options) {
    const color = options.color;
    let bc;
    if (Number.isInteger(color)) {
      bc = screenData.pal[color];
    } else {
      bc = convertToColor(color);
    }
    if (bc && typeof bc.hex === "string") {
      screenData.canvas.style.backgroundColor = bc.hex;
    } else {
      const error = new TypeError("setBgColor: invalid color value for parameter color.");
      error.code = "INVALID_COLOR";
      throw error;
    }
  }
  function setContainerBgColor(screenData, options) {
    const color = options.color;
    let bc;
    if (screenData.container) {
      if (Number.isInteger(color)) {
        bc = screenData.pal[color];
      } else {
        bc = convertToColor(color);
      }
      if (bc && typeof bc.hex === "string") {
        screenData.container.style.backgroundColor = bc.hex;
        return;
      } else {
        const error = new TypeError(
          "setContainerBgColor: invalid color value for parameter color."
        );
        error.code = "INVALID_COLOR";
        throw error;
      }
    }
  }
  function setPalColor(screenData, options) {
    const index = options.index;
    const color = options.color;
    if (!Number.isInteger(index) || index < 0 || index >= screenData.pal.length) {
      const error = new RangeError(
        "setPalColor: Parameter index must be an integer value."
      );
      error.code = "INVALID_INDEX";
      throw error;
    }
    if (index === 0) {
      const error = new RangeError(
        "setPalColor: Parameter index cannot be 0, this is reserved for transparency. To set background color of the screen use the setBgColor command."
      );
      error.code = "INVALID_INDEX";
      throw error;
    }
    const colorValue = convertToColor(color);
    if (colorValue === null) {
      const error = new TypeError(
        "setPalColor: Parameter color is not a valid color format."
      );
      error.code = "INVALID_COLOR";
      throw error;
    }
    const oldColor = screenData.pal[index];
    if (screenData.color.key === oldColor.key) {
      screenData.color = colorValue;
    }
    screenData.pal[index] = colorValue;
    screenData.palMap.delete(oldColor.key);
    screenData.palMap.set(colorValue.key, index);
  }
  function getPalColor(screenData, options) {
    const index = options.index;
    if (screenData.pal[index]) {
      const color = screenData.pal[index];
      return rgbToColor(color.r, color.g, color.b, color.a);
    }
    return null;
  }
  function getColorValueByRawInput(screenData, rawInput) {
    let colorValue;
    if (Number.isInteger(rawInput)) {
      if (rawInput >= screenData.pal.length) {
        return null;
      }
      return screenData.pal[rawInput];
    }
    colorValue = convertToColor(rawInput);
    return colorValue;
  }
  function findColorIndexByColorValue(screenData, color, tolerance = 1) {
    if (screenData.palMap.has(color.key)) {
      return screenData.palMap.get(color.key);
    }
    const maxDifference = 255 * 255 * 3.25;
    const minSimularity = tolerance * (2 - tolerance) * maxDifference;
    let bestMatchIndex = null;
    let bestMatchSimularity = 0;
    for (let i = 0; i < screenData.pal.length; i++) {
      const palColor = screenData.pal[i];
      if (palColor.key === color.key) {
        return i;
      }
      let difference;
      if (i === 0) {
        difference = calcColorDifference(palColor, color, [0.2, 0.2, 0.2, 0.4]);
      } else {
        difference = calcColorDifference(palColor, color);
      }
      const similarity = maxDifference - difference;
      if (similarity >= minSimularity) {
        if (similarity > bestMatchSimularity) {
          bestMatchIndex = i;
          bestMatchSimularity = similarity;
        }
      }
    }
    return bestMatchIndex;
  }
  function getColorValueByIndex(screenData, palIndex) {
    if (palIndex >= screenData.pal.length) {
      return null;
    }
    return screenData.pal[palIndex];
  }

  // src/graphics/graphics-primitives.js
  var commandNames = ["pset", "lines", "arc", "bezier"];
  function buildApi(s_api, s_screenData, s_penFn, s_isObjectLiteral, s_getInt, s_getImageData, s_color, s_setImageDirty, s_prepareBatch, s_batchType, s_pixelsPerPen) {
    let s_preprocessPset;
    if (s_screenData.renderMode === CANVAS2D_RENDER_MODE) {
      s_preprocessPset = s_getImageData;
    } else {
      s_preprocessPset = (screenData) => s_prepareBatch(
        screenData,
        s_batchType,
        s_pixelsPerPen
      );
    }
    const psetFn = (x, y) => {
      let pX, pY;
      if (s_isObjectLiteral(x)) {
        pX = s_getInt(x.x1, null);
        pY = s_getInt(x.y1, null);
      } else {
        pX = s_getInt(x, null);
        pY = s_getInt(y, null);
      }
      if (pX === null || pY === null) {
        const error = new TypeError("pset: Parameters x and y must be integers.");
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      s_preprocessPset(s_screenData);
      s_penFn(s_screenData, pX, pY, s_color);
      s_setImageDirty(s_screenData);
    };
    s_api.pset = psetFn;
    s_screenData.api.pset = psetFn;
    let s_preprocessLine;
    if (s_screenData.renderMode === CANVAS2D_RENDER_MODE) {
      s_preprocessLine = s_getImageData;
    } else {
      s_preprocessLine = (screenData, x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lineLen = Math.round(Math.sqrt(dx * dx + dy * dy)) + 1;
        s_prepareBatch(screenData, s_batchType, lineLen * s_pixelsPerPen);
      };
    }
    const lineFn = (x1, y1, x2, y2) => {
      let px1, py1, px2, py2;
      if (s_isObjectLiteral(x1)) {
        px1 = s_getInt(x1.x1, null);
        py1 = s_getInt(x1.y1, null);
        px2 = s_getInt(x1.x2, null);
        py2 = s_getInt(x1.y2, null);
      } else {
        px1 = s_getInt(x1, null);
        py1 = s_getInt(y1, null);
        px2 = s_getInt(x2, null);
        py2 = s_getInt(y2, null);
      }
      if (px1 === null || py1 === null || px2 === null || py2 === null) {
        const error = new TypeError("line: Parameters x1, y1, x2, and y2 must be integers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      s_preprocessLine(s_screenData, px1, py1, px2, py2);
      m_line(s_screenData, px1, py1, px2, py2, s_color, s_penFn);
      s_setImageDirty(s_screenData);
    };
    s_api.line = lineFn;
    s_screenData.api.line = lineFn;
    let s_preprocessArcOutline;
    if (s_screenData.renderMode === CANVAS2D_RENDER_MODE) {
      s_preprocessArcOutline = s_getImageData;
    } else {
      s_preprocessArcOutline = (screenData, radius, spanDeg) => {
        const span = Math.max(0, Math.min(360, spanDeg));
        const perimeterPixels = Math.max(
          1,
          Math.round(2 * Math.PI * radius * (span / 360))
        );
        s_prepareBatch(screenData, s_batchType, perimeterPixels * s_pixelsPerPen);
      };
    }
    const arcFn = (x, y, radius, angle1, angle2) => {
      let pX, pY, pRadius, pAngle1, pAngle2;
      if (s_isObjectLiteral(x)) {
        pX = s_getInt(x.x1, null);
        pY = s_getInt(x.y1, null);
        pRadius = s_getInt(x.radius, null);
        pAngle1 = s_getInt(x.angle1, null);
        pAngle2 = s_getInt(x.angle2, null);
      } else {
        pX = s_getInt(x, null);
        pY = s_getInt(y, null);
        pRadius = s_getInt(radius, null);
        pAngle1 = s_getInt(angle1, null);
        pAngle2 = s_getInt(angle2, null);
      }
      if (pX === null || pY === null || pRadius === null || pAngle1 === null || pAngle2 === null) {
        const error = new TypeError(
          "arc: Parameters x1, y1, radius, angle1, and angle2 must be integers."
        );
        error.code = "INVALID_PARAMETERS";
        throw error;
      }
      pAngle1 = (pAngle1 + 360) % 360;
      pAngle2 = (pAngle2 + 360) % 360;
      const winding = pAngle1 > pAngle2;
      if (pRadius < 0) {
        return;
      }
      if (pRadius === 0) {
        s_preprocessArcOutline(s_screenData, 1, 0);
        s_penFn(s_screenData, pX, pY, s_color);
        s_setImageDirty(s_screenData);
        return;
      }
      let spanDeg;
      if (winding) {
        spanDeg = 360 - pAngle1 + pAngle2;
      } else {
        spanDeg = pAngle2 - pAngle1;
      }
      s_preprocessArcOutline(s_screenData, pRadius, spanDeg);
      m_arcOutline(s_screenData, pX, pY, pRadius, pAngle1, pAngle2, winding, s_color, s_penFn);
      s_setImageDirty(s_screenData);
    };
    s_api.arc = arcFn;
    s_screenData.api.arc = arcFn;
    let s_preprocessBezierOutline;
    if (s_screenData.renderMode === CANVAS2D_RENDER_MODE) {
      s_preprocessBezierOutline = s_getImageData;
    } else {
      s_preprocessBezierOutline = (screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) => {
        const d01 = Math.hypot(p1x - p0x, p1y - p0y);
        const d12 = Math.hypot(p2x - p1x, p2y - p1y);
        const d23 = Math.hypot(p3x - p2x, p3y - p2y);
        const approxLen = Math.max(1, Math.round(d01 + d12 + d23));
        s_prepareBatch(screenData, s_batchType, approxLen * s_pixelsPerPen);
      };
    }
    const bezierFn = (xStart, yStart, x1, y1, x2, y2, xEnd, yEnd) => {
      let p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y;
      if (s_isObjectLiteral(xStart)) {
        p0x = s_getInt(xStart.xStart, null);
        p0y = s_getInt(xStart.yStart, null);
        p1x = s_getInt(xStart.x1, null);
        p1y = s_getInt(xStart.y1, null);
        p2x = s_getInt(xStart.x2, null);
        p2y = s_getInt(xStart.y2, null);
        p3x = s_getInt(xStart.xEnd, null);
        p3y = s_getInt(xStart.yEnd, null);
      } else {
        p0x = s_getInt(xStart, null);
        p0y = s_getInt(yStart, null);
        p1x = s_getInt(x1, null);
        p1y = s_getInt(y1, null);
        p2x = s_getInt(x2, null);
        p2y = s_getInt(y2, null);
        p3x = s_getInt(xEnd, null);
        p3y = s_getInt(yEnd, null);
      }
      if (p0x === null || p0y === null || p1x === null || p1y === null || p2x === null || p2y === null || p3x === null || p3y === null) {
        const error = new TypeError(
          "bezier: Parameters xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd must be integers."
        );
        error.code = "INVALID_PARAMETERS";
        throw error;
      }
      s_preprocessBezierOutline(
        s_screenData,
        p0x,
        p0y,
        p1x,
        p1y,
        p2x,
        p2y,
        p3x,
        p3y
      );
      m_bezierOutline(s_screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, s_color, s_penFn);
      s_setImageDirty(s_screenData);
    };
    s_api.bezier = bezierFn;
    s_screenData.api.bezier = bezierFn;
  }
  function m_line(screenData, x1, y1, x2, y2, color, penFn) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    let sx = x1 < x2 ? 1 : -1;
    let sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    penFn(screenData, x1, y1, color);
    while (!(x1 === x2 && y1 === y2)) {
      const e2 = err << 1;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
      penFn(screenData, x1, y1, color);
    }
  }
  function m_arcOutline(screenData, cx, cy, radius, angle1, angle2, winding, color, penFn) {
    function setPixel(px, py) {
      let a = Math.atan2(py - cy, px - cx) * (180 / Math.PI);
      a = (a + 360) % 360;
      if (winding) {
        if (a >= angle1 || a <= angle2) {
          penFn(screenData, px, py, color);
        }
      } else if (a >= angle1 && a <= angle2) {
        penFn(screenData, px, py, color);
      }
    }
    let x = radius;
    let y = 0;
    let err = 1 - x;
    setPixel(cx + x, cy + y);
    setPixel(cx - x, cy + y);
    setPixel(cx + y, cy + x);
    setPixel(cx + y, cy - x);
    while (x >= y) {
      y++;
      if (err < 0) {
        err += 2 * y + 1;
      } else {
        x--;
        err += 2 * (y - x) + 1;
      }
      setPixel(cx + x, cy + y);
      setPixel(cx + y, cy + x);
      setPixel(cx - y, cy + x);
      setPixel(cx - x, cy + y);
      setPixel(cx - x, cy - y);
      setPixel(cx - y, cy - x);
      setPixel(cx + y, cy - x);
      setPixel(cx + x, cy - y);
    }
  }
  function m_bezierOutline(screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penFn) {
    function bezierPoint(t2) {
      const u = 1 - t2;
      const uu = u * u;
      const uuu = uu * u;
      const tt = t2 * t2;
      const ttt = tt * t2;
      const x = Math.round(
        uuu * p0x + 3 * uu * t2 * p1x + 3 * u * tt * p2x + ttt * p3x
      );
      const y = Math.round(
        uuu * p0y + 3 * uu * t2 * p1y + 3 * u * tt * p2y + ttt * p3y
      );
      return { "x": x, "y": y };
    }
    function distance(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
    let lastPoint = bezierPoint(0);
    penFn(screenData, lastPoint.x, lastPoint.y, color);
    let t = 0.1;
    let dt = 0.1;
    const minDistance = 1;
    while (t < 1) {
      const point = bezierPoint(t);
      const d = distance(point, lastPoint);
      if (d > minDistance && dt > 1e-5) {
        t -= dt;
        dt = dt * 0.75;
      } else {
        penFn(screenData, point.x, point.y, color);
        lastPoint = point;
      }
      t += dt;
    }
    const endPoint = bezierPoint(1);
    penFn(screenData, endPoint.x, endPoint.y, color);
  }

  // src/graphics/graphics-shapes.js
  var commandNames2 = ["rect", "circle", "ellipse"];
  function buildApi2(s_api, s_screenData, s_penFn, s_blendFn, s_isObjectLiteral, s_getInt, s_getImageData, s_color, s_setImageDirty, s_prepareBatch, s_batchType, s_pixelsPerPen, s_screenWidth, s_screenHeight, s_penSize, s_penHalfSize, s_getColorValueByRawInput) {
    let s_preprocessRectOutline;
    let s_preprocessRectFilled;
    if (s_screenData.renderMode === CANVAS2D_RENDER_MODE) {
      s_preprocessRectOutline = s_getImageData;
      s_preprocessRectFilled = s_getImageData;
    } else {
      s_preprocessRectOutline = (screenData, width, height) => {
        let perimeterPixels = width * 2 + height * 2;
        s_prepareBatch(screenData, s_batchType, perimeterPixels * s_pixelsPerPen);
      };
      s_preprocessRectFilled = (screenData, width, height) => {
        const areaPixels = width * height;
        s_prepareBatch(screenData, s_batchType, areaPixels * s_pixelsPerPen);
      };
    }
    const rectFn = (x, y, width, height, fillColor) => {
      let pX, pY, pFillColor, pWidth, pHeight;
      if (s_isObjectLiteral(x)) {
        pX = s_getInt(x.x1, null);
        pY = s_getInt(x.y1, null);
        pWidth = s_getInt(x.width, null);
        pHeight = s_getInt(x.height, null);
        pFillColor = x.pFillColor;
      } else {
        pX = s_getInt(x, null);
        pY = s_getInt(y, null);
        pWidth = s_getInt(width, null);
        pHeight = s_getInt(height, null);
        pFillColor = fillColor;
      }
      if (pX === null || pY === null || pWidth === null || pHeight === null) {
        const error = new TypeError(
          "rect: Parameters x1, y1, width, and height must be integers."
        );
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      if (pWidth < 1 || pHeight < 1) {
        return;
      }
      const x2 = pX + pWidth;
      const y2 = pY + pHeight;
      const fillColorValue = s_getColorValueByRawInput(s_screenData, pFillColor);
      if (fillColorValue !== null && pWidth > s_penSize && pHeight > s_penSize) {
        s_preprocessRectFilled(s_screenData, pWidth, pHeight);
        m_rectFilled(
          s_screenData,
          Math.max(pX + s_penHalfSize, 0),
          Math.max(pY + s_penHalfSize, 0),
          Math.min(x2 - s_penHalfSize, s_screenWidth - 1),
          Math.min(y2 - s_penHalfSize, s_screenHeight - 1),
          fillColorValue,
          s_blendFn
        );
      }
      s_preprocessRectOutline(s_screenData, pWidth, pHeight);
      m_rectOutline(s_screenData, pX, pY, x2, y2, s_color, s_penFn);
      s_setImageDirty(s_screenData);
    };
    s_api.rect = rectFn;
    s_screenData.api.rect = rectFn;
    let s_preprocessCircleOutline;
    let s_preprocessCircleFilled;
    if (s_screenData.renderMode === CANVAS2D_RENDER_MODE) {
      s_preprocessCircleOutline = s_getImageData;
      s_preprocessCircleFilled = s_getImageData;
    } else {
      s_preprocessCircleOutline = (screenData, radius) => {
        const perimeterPixels = Math.round(2 * Math.PI * radius);
        s_prepareBatch(
          screenData,
          s_batchType,
          perimeterPixels * s_pixelsPerPen
        );
      };
      s_preprocessCircleFilled = (screenData, radius) => {
        const areaPixels = Math.round(Math.PI * radius * radius);
        s_prepareBatch(
          screenData,
          s_batchType,
          areaPixels * s_pixelsPerPen
        );
      };
    }
    const circleFn = (x, y, radius, fillColor) => {
      let pX, pY, pRadius, pFillColor;
      if (s_isObjectLiteral(x)) {
        pX = s_getInt(x.x1, null);
        pY = s_getInt(x.y1, null);
        pRadius = s_getInt(x.radius, null);
        pFillColor = x.pFillColor;
      } else {
        pX = s_getInt(x, null);
        pY = s_getInt(y, null);
        pRadius = s_getInt(radius, null);
        pFillColor = fillColor;
      }
      if (pX === null || pY === null || pRadius === null) {
        const error = new TypeError(
          "circle: Parameters x1, y1, and radius must be integers."
        );
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      if (pRadius < 0) {
        return;
      }
      if (pRadius === 0) {
        s_preprocessRectFilled(s_screenData, 1, 1);
        s_penFn(s_screenData, pX, pY, s_color);
        s_setImageDirty(s_screenData);
        return;
      }
      const fillColorValue = s_getColorValueByRawInput(s_screenData, pFillColor);
      if (fillColorValue !== null && pRadius > s_penSize) {
        s_preprocessCircleFilled(s_screenData, pRadius);
        m_circleFilled(
          s_screenData,
          pX,
          pY,
          pRadius,
          fillColorValue,
          s_blendFn,
          s_screenWidth - 1,
          s_screenHeight - 1
        );
      }
      s_preprocessCircleOutline(s_screenData, pRadius);
      m_circleOutline(s_screenData, pX, pY, pRadius, s_color, s_penFn);
      s_setImageDirty(s_screenData);
    };
    s_api.circle = circleFn;
    s_screenData.api.circle = circleFn;
    let s_preprocessEllipseOutline;
    let s_preprocessEllipseFilled;
    if (s_screenData.renderMode === CANVAS2D_RENDER_MODE) {
      s_preprocessEllipseOutline = s_getImageData;
      s_preprocessEllipseFilled = s_getImageData;
    } else {
      s_preprocessEllipseOutline = (screenData, rx, ry) => {
        const perimeterPixels = Math.round(
          2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2)
        );
        s_prepareBatch(screenData, s_batchType, perimeterPixels * s_pixelsPerPen);
      };
      s_preprocessEllipseFilled = (screenData, rx, ry) => {
        const areaPixels = Math.round(Math.PI * rx * ry);
        s_prepareBatch(screenData, s_batchType, areaPixels * s_pixelsPerPen);
      };
    }
    const ellipseFn = (x, y, rx, ry, fillColor) => {
      let pX, pY, pRx, pRy, pFillColor;
      if (s_isObjectLiteral(x)) {
        pX = s_getInt(x.x1, null);
        pY = s_getInt(x.y1, null);
        pRx = s_getInt(x.rx, null);
        pRy = s_getInt(x.ry, null);
        pFillColor = x.pFillColor;
      } else {
        pX = s_getInt(x, null);
        pY = s_getInt(y, null);
        pRx = s_getInt(rx, null);
        pRy = s_getInt(ry, null);
        pFillColor = fillColor;
      }
      if (pX === null || pY === null || pRx === null || pRy === null) {
        const error = new TypeError(
          "ellipse: Parameters x1, y1, rx, and ry must be integers."
        );
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      if (pRx < 0 || pRy < 0) {
        return;
      }
      if (pRx === 0 && pRy === 0) {
        s_preprocessEllipseOutline(s_screenData, 1, 1);
        s_penFn(s_screenData, pX, pY, s_color);
        s_setImageDirty(s_screenData);
        return;
      }
      if (pRx === 0) {
        s_preprocessEllipseOutline(s_screenData, 1, pRy);
        let y1 = pY - pRy;
        const y2 = pY + pRy;
        while (y1 <= y2) {
          s_penFn(s_screenData, pX, y1, s_color);
          y1++;
        }
        s_setImageDirty(s_screenData);
        return;
      }
      if (pRy === 0) {
        s_preprocessEllipseOutline(s_screenData, pRx, 1);
        let x1 = pX - pRx;
        const x2 = pX + pRx;
        while (x1 <= x2) {
          s_penFn(s_screenData, x1, pY, s_color);
          x1++;
        }
        s_setImageDirty(s_screenData);
        return;
      }
      const fillColorValue = s_getColorValueByRawInput(s_screenData, pFillColor);
      if (fillColorValue !== null && pRx > s_penSize && pRy > s_penSize) {
        s_preprocessEllipseFilled(s_screenData, pRx, pRy);
        m_ellipseFilled(
          s_screenData,
          pX,
          pY,
          pRx,
          pRy,
          fillColorValue,
          s_blendFn,
          s_screenWidth - 1,
          s_screenHeight - 1
        );
      }
      s_preprocessEllipseOutline(s_screenData, pRx, pRy);
      m_ellipseOutline(s_screenData, pX, pY, pRx, pRy, s_color, s_penFn);
      s_setImageDirty(s_screenData);
    };
    s_api.ellipse = ellipseFn;
    s_screenData.api.ellipse = ellipseFn;
  }
  function m_rectOutline(screenData, x1, y1, x2, y2, color, penFn) {
    if (x1 === x2 && y1 === y2) {
      penFn(screenData, x1, y1, color);
      return;
    }
    if (y1 === y2) {
      let x3 = x1;
      while (x3 <= x2) {
        penFn(screenData, x3, y1, color);
        x3++;
      }
      return;
    }
    if (x1 === x2) {
      let y3 = y1;
      while (y3 <= y2) {
        penFn(screenData, x1, y3, color);
        y3++;
      }
      return;
    }
    let x;
    let y;
    x = x1;
    while (x <= x2) {
      penFn(screenData, x, y1, color);
      x++;
    }
    x = x1;
    while (x <= x2) {
      penFn(screenData, x, y2, color);
      x++;
    }
    y = y1 + 1;
    while (y < y2) {
      penFn(screenData, x1, y, color);
      penFn(screenData, x2, y, color);
      y++;
    }
  }
  function m_rectFilled(screenData, x1, y1, x2, y2, color, blendFn) {
    let y = y1;
    while (y <= y2) {
      let x = x1;
      while (x <= x2) {
        blendFn(screenData, x, y, color);
        x++;
      }
      y++;
    }
  }
  function m_circleOutline(screenData, cx, cy, radius, color, penFn) {
    let x = radius;
    let y = 0;
    let err = 1 - x;
    while (x >= y) {
      penFn(screenData, cx + x, cy + y, color);
      penFn(screenData, cx + y, cy + x, color);
      penFn(screenData, cx - y, cy + x, color);
      penFn(screenData, cx - x, cy + y, color);
      penFn(screenData, cx - x, cy - y, color);
      penFn(screenData, cx - y, cy - x, color);
      penFn(screenData, cx + y, cy - x, color);
      penFn(screenData, cx + x, cy - y, color);
      y++;
      if (err < 0) {
        err += 2 * y + 1;
      } else {
        x--;
        err += 2 * (y - x) + 1;
      }
    }
  }
  function m_circleFilled(screenData, cx, cy, radius, color, blendFn, maxX, maxY) {
    for (let dy = -radius; dy <= radius; dy++) {
      const y = cy + dy;
      if (y < 0 || y > maxY) {
        continue;
      }
      const dxMax = Math.floor(Math.sqrt(radius * radius - dy * dy));
      let x = Math.max(cx - dxMax, 0);
      const xEnd = Math.min(cx + dxMax, maxX);
      while (x <= xEnd) {
        blendFn(screenData, x, y, color);
        x++;
      }
    }
  }
  function m_ellipseOutline(screenData, cx, cy, rx, ry, color, penFn) {
    let x = 0;
    let y = ry;
    const rx2 = rx * rx;
    const ry2 = ry * ry;
    let dx = 2 * ry2 * x;
    let dy = 2 * rx2 * y;
    let p1 = ry2 - rx2 * ry + 0.25 * rx2;
    while (dx < dy) {
      penFn(screenData, cx + x, cy + y, color);
      penFn(screenData, cx - x, cy + y, color);
      penFn(screenData, cx - x, cy - y, color);
      penFn(screenData, cx + x, cy - y, color);
      x++;
      dx += 2 * ry2;
      if (p1 < 0) {
        p1 += ry2 + dx;
      } else {
        y--;
        dy -= 2 * rx2;
        p1 += ry2 + dx - dy;
      }
    }
    let p2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
    while (y >= 0) {
      penFn(screenData, cx + x, cy + y, color);
      penFn(screenData, cx - x, cy + y, color);
      penFn(screenData, cx - x, cy - y, color);
      penFn(screenData, cx + x, cy - y, color);
      y--;
      dy -= 2 * rx2;
      if (p2 > 0) {
        p2 += rx2 - dy;
      } else {
        x++;
        dx += 2 * ry2;
        p2 += rx2 - dy + dx;
      }
    }
  }
  function m_ellipseFilled(screenData, cx, cy, rx, ry, color, blendFn, maxX, maxY) {
    for (let dy = -ry; dy <= ry; dy++) {
      const y = cy + dy;
      if (y < 0 || y > maxY) {
        continue;
      }
      const t = 1 - dy * dy / (ry * ry);
      const dxMax = t <= 0 ? 0 : Math.floor(rx * Math.sqrt(t));
      let x = Math.max(cx - dxMax, 0);
      const xEnd = Math.min(cx + dxMax, maxX);
      while (x <= xEnd) {
        blendFn(screenData, x, y, color);
        x++;
      }
    }
  }

  // src/graphics/graphics-api.js
  var m_api = null;
  function init2(api2) {
    m_api = api2;
    buildGraphicsApi(null);
  }
  function buildGraphicsApi(s_screenData) {
    if (s_screenData === null) {
      for (const commandName of commandNames) {
        m_api[commandName] = () => errFn(commandName);
      }
      for (const commandName of commandNames2) {
        m_api[commandName] = () => errFn(commandName);
      }
      return;
    }
    const s_penFn = s_screenData.pens.penFn;
    const s_penSize = s_screenData.pens.size;
    const s_penHalfSize = Math.round(s_penSize / 2);
    const s_screenWidth = s_screenData.width;
    const s_screenHeight = s_screenData.height;
    const s_blendFn = s_screenData.blends.blendFn;
    const s_setImageDirty = s_screenData.renderer.setImageDirty;
    const s_getImageData = s_screenData.renderer.getImageData;
    const s_batchType = POINTS_BATCH;
    const s_pixelsPerPen = s_screenData.pens.pixelsPerPen;
    const s_prepareBatch = s_screenData.renderer.prepareBatch;
    const s_isObjectLiteral = isObjectLiteral;
    const s_getInt = getInt;
    const s_color = s_screenData.color;
    const s_getColorValueByRawInput = getColorValueByRawInput;
    buildApi(
      m_api,
      s_screenData,
      s_penFn,
      s_isObjectLiteral,
      s_getInt,
      s_getImageData,
      s_color,
      s_setImageDirty,
      s_prepareBatch,
      s_batchType,
      s_pixelsPerPen
    );
    buildApi2(
      m_api,
      s_screenData,
      s_penFn,
      s_blendFn,
      s_isObjectLiteral,
      s_getInt,
      s_getImageData,
      s_color,
      s_setImageDirty,
      s_prepareBatch,
      s_batchType,
      s_pixelsPerPen,
      s_screenWidth,
      s_screenHeight,
      s_penSize,
      s_penHalfSize,
      s_getColorValueByRawInput
    );
  }

  // src/graphics/pens.js
  var PEN_PIXEL = "pixel";
  var PEN_SQUARE = "square";
  var PEN_CIRCLE = "circle";
  var PENS = /* @__PURE__ */ new Set([PEN_PIXEL, PEN_SQUARE, PEN_CIRCLE]);
  var BLEND_REPLACE = "replace";
  var BLEND_ALPHA = "alpha";
  var BLENDS = /* @__PURE__ */ new Set([BLEND_REPLACE, BLEND_ALPHA]);
  var m_noiseColor = { "r": 0, "g": 0, "b": 0, "a": 0 };
  async function init3(api2) {
    addScreenDataItems();
    registerCommands2();
  }
  function addScreenDataItems() {
    addScreenDataItem("blends", {
      "blend": BLEND_REPLACE,
      "blendFn": null,
      "noise": null,
      "noiseData": []
    });
    addScreenDataItem("pens", {
      "pen": PEN_PIXEL,
      "penFn": null,
      "size": 1,
      "pixelsPerPen": 1
    });
    addScreenResizeFunction((screenData) => {
      buildPenFn(screenData);
    });
  }
  function registerCommands2() {
    addCommand("setPen", setPen, true, ["pen", "size", "blend", "noise"]);
  }
  function buildPenFn(s_screenData) {
    const s_drawPixelunsafe = s_screenData.renderer.drawPixelUnsafe;
    const s_blendPixelUnsafe = s_screenData.renderer.blendPixelUnsafe;
    const s_width = s_screenData.width;
    const s_height = s_screenData.height;
    const s_noise = s_screenData.blends.noise;
    const s_clamp = clamp;
    let s_blendFn;
    if (s_screenData.blends.noise === null && (s_screenData.renderMode === WEBGL2_RENDER_MODE || s_screenData.blends.blend === BLEND_REPLACE)) {
      s_blendFn = s_drawPixelunsafe;
    } else if (s_screenData.blends.blend === BLEND_REPLACE) {
      s_blendFn = (screenData, x, y, color) => {
        s_drawPixelunsafe(screenData, x, y, getColorNoise(s_noise, color, s_clamp));
      };
    } else if (s_screenData.blends.blend === BLEND_ALPHA && s_screenData.blends.noise === null) {
      if (s_screenData.renderMode === WEBGL2_RENDER_MODE) {
        s_blendFn = s_drawPixelunsafe;
      } else {
        s_blendFn = s_blendPixelUnsafe;
      }
    } else {
      if (s_screenData.renderMode === WEBGL2_RENDER_MODE) {
        s_blendFn = (screenData, x, y, color) => {
          s_drawPixelunsafe(screenData, x, y, getColorNoise(s_noise, color, s_clamp));
        };
      } else {
        s_blendFn = (screenData, x, y, color) => {
          s_blendPixelUnsafe(screenData, x, y, getColorNoise(s_noise, color, s_clamp));
        };
      }
    }
    if (s_screenData.pens.pen === PEN_PIXEL) {
      s_screenData.pens.penFn = (screenData, x, y, color) => {
        if (x < 0 || x >= s_width || y < 0 || y >= s_height) {
          return;
        }
        s_blendFn(screenData, x, y, color);
      };
    } else if (s_screenData.pens.pen === PEN_SQUARE) {
      const squareSize = s_screenData.pens.size | 1;
      const offset = Math.round(squareSize / 2) - 1;
      s_screenData.pens.penFn = (screenData, x, y, color) => {
        const x1 = s_clamp(x - offset, 0, s_width);
        const x2 = s_clamp(x - offset + squareSize, 0, s_width);
        const y1 = s_clamp(y - offset, 0, s_height);
        const y2 = s_clamp(y - offset + squareSize, 0, s_height);
        drawPenSquare(screenData, x1, y1, x2, y2, color, s_blendFn);
      };
    } else if (s_screenData.pens.pen === PEN_CIRCLE) {
      if (s_screenData.pens.size === 2) {
        s_screenData.pens.penFn = (screenData, x, y, color) => {
          drawPenCross(screenData, x, y, color, s_width, s_height, s_blendFn);
        };
      } else {
        const diameter = s_screenData.pens.size * 2;
        const half = s_screenData.pens.size;
        const offset = half - 1;
        const radiusThresholdSq = (half - 0.5) * (half - 0.5);
        s_screenData.pens.penFn = (screenData, x, y, color) => {
          const x1 = s_clamp(x - offset, 0, s_width);
          const x2 = s_clamp(x - offset + diameter, 0, s_width);
          const y1 = s_clamp(y - offset, 0, s_height);
          const y2 = s_clamp(y - offset + diameter, 0, s_height);
          drawPenCircle(
            screenData,
            x,
            y,
            x1,
            y1,
            x2,
            y2,
            radiusThresholdSq,
            color,
            s_blendFn
          );
        };
      }
    }
    s_screenData.blends.blendFn = s_blendFn;
    buildGraphicsApi(s_screenData);
  }
  function setPen(screenData, options) {
    let pen = options.pen;
    let size = getInt(options.size, 1);
    let blend = options.blend;
    let noise = options.noise;
    if (!pen) {
      pen = screenData.pens.pen;
    }
    if (!PENS.has(pen)) {
      const error = new TypeError(
        `setPen: Parameter pen is not a valid pen. Valid pens are (${Array.from(PENS).join(", ")}).`
      );
      error.code = "INVALID_PEN";
      throw error;
    }
    if (pen === PEN_PIXEL) {
      size = 1;
    }
    if (size < 1) {
      size = 1;
    }
    if (size === 1) {
      pen = PEN_PIXEL;
    }
    if (!blend) {
      blend = screenData.blends.blend;
    }
    if (!BLENDS.has(blend)) {
      const error = new TypeError(
        `setBlend: Parameter blend is not a valid blend. Valid blends are (${Array.from(BLENDS).join(", ")}).`
      );
      error.code = "INVALID_BLEND_MODE";
      throw error;
    }
    if (Array.isArray(noise)) {
      for (let i = 0; i < noise.length; i++) {
        if (isNaN(noise[i])) {
          const error = new TypeError(
            "setBlend: Parameter noise array contains an invalid value."
          );
          error.code = "INVALID_NOISE_VALUE";
          throw error;
        }
      }
    } else {
      noise = getInt(noise, null);
      if (noise !== null) {
        noise = [noise, noise, noise, 0];
      }
    }
    screenData.pens.pen = pen;
    screenData.pens.size = size;
    if (pen === PEN_SQUARE) {
      screenData.pens.pixelsPerPen = size * size;
    } else if (pen === PEN_CIRCLE) {
      if (size === 2) {
        screenData.pens.pixelsPerPen = 5;
      } else {
        screenData.pens.pixelsPerPen = Math.round(Math.PI * (size + 1) * (size + 1)) + 1;
      }
    } else {
      screenData.pens.pixelsPerPen = 1;
    }
    const previousBlend = screenData.blends.blend;
    screenData.blends.blend = blend;
    screenData.blends.noise = noise;
    buildPenFn(screenData);
    if (previousBlend !== blend && screenData.renderMode === WEBGL2_RENDER_MODE) {
      screenData.renderer.blendModeChanged(screenData, previousBlend);
    }
  }
  function drawPenSquare(screenData, x1, y1, x2, y2, color, blendFn) {
    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        blendFn(screenData, px, py, color);
      }
    }
  }
  function drawPenCross(screenData, x, y, color, width, height, blendFn) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      blendFn(screenData, x, y, color);
    }
    if (x + 1 >= 0 && x + 1 < width && y >= 0 && y < height) {
      blendFn(screenData, x + 1, y, color);
    }
    if (x - 1 >= 0 && x - 1 < width && y >= 0 && y < height) {
      blendFn(screenData, x - 1, y, color);
    }
    if (x >= 0 && x < width && y + 1 >= 0 && y + 1 < height) {
      blendFn(screenData, x, y + 1, color);
    }
    if (x >= 0 && x < width && y - 1 >= 0 && y - 1 < height) {
      blendFn(screenData, x, y - 1, color);
    }
  }
  function drawPenCircle(screenData, x, y, x1, y1, x2, y2, radiusThresholdSq, color, blendFn) {
    for (let py = y1; py < y2; py++) {
      const dy = py - y;
      for (let px = x1; px < x2; px++) {
        const dx = px - x;
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusThresholdSq) {
          blendFn(screenData, px, py, color);
        }
      }
    }
  }
  function getColorNoise(noise, color, clamp2) {
    const c2 = m_noiseColor;
    c2.r = color.r;
    c2.g = color.g;
    c2.b = color.b;
    c2.a = color.a;
    const half = noise / 2;
    c2.r = clamp2(Math.round(c2.r + rndRange(-noise[0], noise[0])), 0, 255);
    c2.g = clamp2(Math.round(c2.g + rndRange(-noise[1], noise[1])), 0, 255);
    c2.b = clamp2(Math.round(c2.b + rndRange(-noise[2], noise[2])), 0, 255);
    c2.a = clamp2(Math.round(c2.a + rndRange(-noise[3], noise[3])), 0, 255);
    return c2;
  }

  // src/graphics/shaders/point.vert
  var point_default = "#version 300 es\nin vec2 a_position;\nin vec4 a_color;\nuniform vec2 u_resolution;\nout vec4 v_color;\n\nvoid main() {\n\n	// Convert screen coords to NDC with pixel center adjustment\n	// Add 0.5 to center the pixel, then convert to NDC\n	vec2 pixelCenter = a_position + 0.5;\n	vec2 ndc = ((pixelCenter / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);\n	gl_Position = vec4(ndc, 0.0, 1.0);\n	gl_PointSize = 1.0;\n	v_color = a_color;\n}";

  // src/graphics/shaders/point.frag
  var point_default2 = "#version 300 es\nprecision mediump float;\nin vec4 v_color;\nout vec4 fragColor;\n\nvoid main() {\n	\n	// The fragColor will always be the straight alpha v_color.\n	// The blend state (enabled/disabled) will determine how it's written.\n	fragColor = v_color;\n}";

  // src/graphics/shaders/image.vert
  var image_default = "#version 300 es\nin vec4 a_position;\nin vec4 a_color;\nin vec2 a_texCoord;\n\nuniform vec2 u_resolution;\n\nout vec4 v_color;\nout vec2 v_texCoord;\n\nvoid main() {\n	\n	// Convert from pixel space (0 to u_resolution) to clip space (-1 to 1)\n	vec2 zeroToOne = a_position.xy / u_resolution;\n	vec2 zeroToTwo = zeroToOne * 2.0;\n	vec2 clipSpace = zeroToTwo - 1.0;\n\n	// Flip the Y-coordinate to match standard 2D graphics (top-left origin)\n	// In WebGL, +Y is typically up, but for 2D, we want +Y down.\n	gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n\n	v_color = a_color;\n	v_texCoord = a_texCoord;\n}";

  // src/graphics/shaders/image.frag
  var image_default2 = "#version 300 es\nprecision highp float;\n\nin vec4 v_color;\nin vec2 v_texCoord;\n\nuniform sampler2D u_texture;\n\nout vec4 outColor;\n\nvoid main() {\n\n	// Sample the color from the texture at the given texture coordinates\n	vec4 texColor = texture(u_texture, v_texCoord);\n\n	// Multiply the texture color by the vertex color (which can be used for tinting/alpha)\n	// If v_color is white (1,1,1,1), it will just use the texColor.\n	outColor = texColor * v_color;\n}";

  // src/graphics/shaders/display.vert
  var display_default = "#version 300 es\nin vec2 a_position;\nout vec2 v_texCoord;\n\nvoid main() {\n	gl_Position = vec4(a_position, 0.0, 1.0);\n\n	// Flip Y coordinate when sampling texture\n	v_texCoord = (a_position + 1.0) * 0.5;\n}";

  // src/graphics/shaders/display.frag
  var display_default2 = "#version 300 es\nprecision mediump float;\nin vec2 v_texCoord;\nuniform sampler2D u_texture;\nout vec4 fragColor;\n\nvoid main() {\n	vec4 texColor = texture(u_texture, v_texCoord);\n	\n	// The FBO already contains STRAIGHT ALPHA, so just output it directly.\n	fragColor = texColor;\n}";

  // src/graphics/renderer-webgl2.js
  var MAX_POINT_BATCH_SIZE = 1e6;
  var DEFAULT_POINT_BATCH_SIZE = 5e3;
  var MAX_IMAGE_BATCH_SIZE = 1e4;
  var DEFAULT_IMAGE_BATCH_SIZE = 50;
  var BATCH_CAPACITY_SHRINK_INTERVAL = 5e3;
  var m_webgl2Textures = /* @__PURE__ */ new Map();
  var POINTS_BATCH = 0;
  var IMAGE_BATCH = 1;
  var BATCH_TYPES = ["POINTS", "IMAGE"];
  var m_batchProto = {
    // Type of batch POINTS_BATCH, IMAGE_BATCH, etc...
    "type": null,
    "program": null,
    "vertices": null,
    "colors": null,
    "count": 0,
    // Capacity
    "minCapacity": 0,
    "capacity": 0,
    "capacityChanged": true,
    "capacityLocalMax": 0,
    "capacityShrinkCheckTime": 0,
    // Components
    "vertexComps": 2,
    "colorComps": 4,
    "texCoordComps": 2,
    // WebGL resources
    "vertexVBO": null,
    "colorVBO": null,
    "texCoordVBO": null,
    "vao": null,
    // Image Specific items
    "texture": null,
    "image": null,
    // Drawing mode, e.g., gl.POINTS or gl.TRIANGLES
    "mode": null,
    // Cached shader locations
    "locations": null
  };
  var m_isWebgl2Capable = false;
  function init4() {
    addScreenCleanupFunction(cleanup);
    m_isWebgl2Capable = testWebGL2Capability();
  }
  function cleanup(screenData) {
    if (screenData.renderMode === CANVAS2D_RENDER_MODE) {
      return;
    }
    const gl = screenData.gl;
    for (const batchType in screenData.batches) {
      const batch = screenData.batches[batchType];
      if (batch.texCoordVBO) {
        gl.deleteBuffer(batch.texCoordVBO);
      }
      gl.deleteBuffer(batch.vertexVBO);
      gl.deleteBuffer(batch.colorVBO);
      gl.deleteVertexArray(batch.vao);
      gl.deleteProgram(batch.program);
      if (batch.texture) {
        gl.deleteTexture(batch.texture);
      }
    }
    screenData.batches = {};
    screenData.batchInfo = {};
    if (screenData.displayProgram) {
      gl.deleteProgram(screenData.displayProgram);
      gl.deleteBuffer(screenData.displayPositionBuffer);
    }
    if (screenData.FBO) {
      gl.deleteFramebuffer(screenData.FBO);
      gl.deleteTexture(screenData.texture);
    }
  }
  function testWebGL2Capability() {
    const testCanvas = document.createElement("canvas");
    testCanvas.width = 1;
    testCanvas.height = 1;
    const testScreenData = {
      "canvas": testCanvas,
      "width": 1,
      "height": 1
    };
    const result = initWebGL(testScreenData);
    if (result && testScreenData.gl) {
      cleanup(testScreenData);
    }
    return result;
  }
  function initWebGL(screenData) {
    screenData.contextLost = false;
    screenData.isRenderScheduled = false;
    screenData.isFirstRender = true;
    screenData.batches = {};
    screenData.batchInfo = {
      "currentBatch": null,
      "drawOrder": []
    };
    const canvas = screenData.canvas;
    const width = screenData.width;
    const height = screenData.height;
    screenData.gl = canvas.getContext("webgl2", {
      "alpha": true,
      "premultipliedAlpha": false,
      "antialias": false,
      "preserveDrawingBuffer": true,
      "desynchronized": false,
      "colorType": "unorm8"
    });
    if (!screenData.gl) {
      return false;
    }
    screenData.gl.viewport(0, 0, width, height);
    if (!createTextureAndFBO(screenData)) {
      screenData.gl = null;
      return false;
    }
    screenData.batches[POINTS_BATCH] = createBatchSystem(
      screenData,
      point_default,
      point_default2,
      POINTS_BATCH
    );
    screenData.batches[IMAGE_BATCH] = createBatchSystem(
      screenData,
      image_default,
      image_default2,
      IMAGE_BATCH
    );
    setupDisplayShader(screenData);
    if (typeof window !== "undefined" && window.location.search.includes("webgl-debug")) {
      const debugExt = screenData.gl.getExtension("WEBGL_debug_renderer_info");
      if (debugExt) {
        console.log("GPU:", screenData.gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL));
      }
    }
    screenData.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("WebGL context lost");
      screenData.contextLost = true;
    });
    screenData.canvas.addEventListener("webglcontextrestored", () => {
      console.log("WebGL context restored");
      initWebGL(screenData);
      screenData.contextLost = false;
      blendModeChanged(screenData);
    });
    return true;
  }
  function createTextureAndFBO(screenData) {
    const gl = screenData.gl;
    const width = screenData.width;
    const height = screenData.height;
    screenData.texture = gl.createTexture();
    if (!screenData.texture) {
      console.error("Failed to create WebGL2 texture.");
      return false;
    }
    gl.bindTexture(gl.TEXTURE_2D, screenData.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    screenData.FBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      screenData.texture,
      0
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error("WebGL2 Framebuffer incomplete:", status);
      return false;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return true;
  }
  function createShaderProgram(screenData, vertexSource, fragmentSource) {
    const gl = screenData.gl;
    const vertexShader = compileShader(screenData, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(screenData, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) {
      const error = new Error("screen: Unable to compile shaders.");
      error.code = "INVALID_SHADERS";
      throw error;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const errLog = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      const error = new Error(`screen: Shader program error:, ${errLog}.`);
      error.code = "SHADER_PROGRAM_ERROR";
      throw error;
    }
    return program;
  }
  function compileShader(screenData, type, source) {
    const gl = screenData.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  function setupDisplayShader(screenData) {
    const gl = screenData.gl;
    const program = createShaderProgram(screenData, display_default, display_default2);
    const positions = new Float32Array([
      -1,
      -1,
      // Bottom left
      1,
      -1,
      // Bottom right
      -1,
      1,
      // Top left
      -1,
      1,
      // Top left
      1,
      -1,
      // Bottom right
      1,
      1
      // Top right
    ]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(program, "a_position");
    const textureLoc = gl.getUniformLocation(program, "u_texture");
    screenData.displayProgram = program;
    screenData.displayPositionBuffer = positionBuffer;
    screenData.displayLocations = {
      "position": positionLoc,
      "texture": textureLoc
    };
  }
  function setImageDirty(screenData) {
    if (!screenData.isRenderScheduled) {
      screenData.isRenderScheduled = true;
      queueMicrotask(() => {
        flushBatches(screenData);
        displayToCanvas(screenData);
        screenData.isRenderScheduled = false;
      });
    }
  }
  function cls(screenData, x, y, width, height) {
  }
  function blendModeChanged(screenData, previousBlend) {
    flushBatches(screenData, previousBlend);
    displayToCanvas(screenData);
  }
  function createBatchSystem(screenData, vertSrc, fragSrc, type) {
    const gl = screenData.gl;
    const batch = Object.create(m_batchProto);
    batch.program = createShaderProgram(screenData, vertSrc, fragSrc);
    batch.locations = {
      "position": gl.getAttribLocation(batch.program, "a_position"),
      "color": gl.getAttribLocation(batch.program, "a_color"),
      "resolution": gl.getUniformLocation(batch.program, "u_resolution")
    };
    batch.type = type;
    if (batch.type === POINTS_BATCH) {
      batch.capacity = DEFAULT_POINT_BATCH_SIZE;
      batch.minCapacity = DEFAULT_POINT_BATCH_SIZE;
      batch.maxCapacity = MAX_POINT_BATCH_SIZE;
      batch.mode = gl.POINTS;
    } else if (batch.type === IMAGE_BATCH) {
      batch.capacity = DEFAULT_IMAGE_BATCH_SIZE;
      batch.minCapacity = DEFAULT_IMAGE_BATCH_SIZE;
      batch.maxCapacity = MAX_IMAGE_BATCH_SIZE;
      batch.mode = gl.TRIANGLES;
      batch.locations.texCoord = gl.getAttribLocation(batch.program, "a_texCoord");
      batch.locations.texture = gl.getUniformLocation(batch.program, "u_texture");
      batch.texCoords = new Float32Array(batch.capacity * batch.texCoordComps);
      batch.texCoordVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.texCoordVBO);
      gl.enableVertexAttribArray(batch.locations.texCoord);
      gl.vertexAttribPointer(
        batch.locations.texCoord,
        batch.texCoordComps,
        gl.FLOAT,
        false,
        0,
        0
      );
    } else {
      throw new Error("Invalid batch type.");
    }
    batch.vertices = new Float32Array(batch.capacity * batch.vertexComps);
    batch.colors = new Uint8Array(batch.capacity * batch.colorComps);
    batch.vertexVBO = gl.createBuffer();
    batch.colorVBO = gl.createBuffer();
    batch.vao = gl.createVertexArray();
    gl.bindVertexArray(batch.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertexVBO);
    gl.enableVertexAttribArray(batch.locations.position);
    gl.vertexAttribPointer(
      batch.locations.position,
      batch.vertexComps,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.colorVBO);
    gl.enableVertexAttribArray(batch.locations.color);
    gl.vertexAttribPointer(
      batch.locations.color,
      batch.colorComps,
      gl.UNSIGNED_BYTE,
      true,
      0,
      0
    );
    gl.bindVertexArray(null);
    batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;
    return batch;
  }
  function prepareBatch(screenData, batchType, newItemCount) {
    const batch = screenData.batches[batchType];
    const batchInfo = screenData.batchInfo;
    if (batchInfo.currentBatch !== batch) {
      if (batchInfo.drawOrder.length > 0) {
        const lastDrawOrderItem = batchInfo.drawOrder[batchInfo.drawOrder.length - 1];
        lastDrawOrderItem.endIndex = lastDrawOrderItem.batch.count;
      }
      const drawOrderItem = { batch, "startIndex": batch.count, "endIndex": null };
      if (batch.type === IMAGE_BATCH) {
        drawOrderItem.image = batch.image;
        drawOrderItem.texture = batch.texture;
      }
      batchInfo.drawOrder.push(drawOrderItem);
      batchInfo.currentBatch = batch;
    }
    const requiredCount = batch.count + newItemCount;
    if (requiredCount >= batch.capacity) {
      if (requiredCount > batch.maxCapacity) {
        flushBatches(screenData);
        return prepareBatch(screenData, batchType, newItemCount);
      }
      const newCapacity = Math.max(requiredCount, batch.capacity * 2);
      resizeBatch(batch, newCapacity);
    }
    return true;
  }
  function resizeBatch(batch, newCapacity) {
    const newVertices = new Float32Array(newCapacity * batch.vertexComps);
    const newColors = new Uint8Array(newCapacity * batch.colorComps);
    newVertices.set(batch.vertices);
    batch.vertices = newVertices;
    newColors.set(batch.colors);
    batch.colors = newColors;
    if (batch.type === IMAGE_BATCH) {
      const newTexCoords = new Float32Array(newCapacity * batch.texCoordComps);
      newTexCoords.set(batch.texCoords);
      batch.texCoords = newTexCoords;
    }
    console.log(
      `Batch ${BATCH_TYPES[batch.type]} resized from ${batch.capacity} to ${newCapacity}`
    );
    batch.capacity = newCapacity;
    batch.capacityChanged = true;
    batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;
  }
  function flushBatches(screenData, blend = null) {
    if (blend === null) {
      blend = screenData.blends.blend;
    }
    const gl = screenData.gl;
    if (screenData.contextLost) {
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
    gl.viewport(0, 0, screenData.width, screenData.height);
    if (screenData.isFirstRender) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      screenData.isFirstRender = false;
    }
    if (blend === BLEND_REPLACE) {
      gl.disable(gl.BLEND);
    } else {
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        // srcRGBFactor
        gl.ONE_MINUS_SRC_ALPHA,
        // dstRGBFactor
        gl.ONE,
        // srcAlphaFactor  <--- Make src alpha factor 1.0 (no scaling)
        gl.ONE_MINUS_SRC_ALPHA
        // dstAlphaFactor  <--- Make dst alpha factor (1-src.a)
      );
    }
    for (const batchType in screenData.batches) {
      const batch = screenData.batches[batchType];
      if (batch.count > 0) {
        uploadBatch(gl, batch, screenData.width, screenData.height);
      }
    }
    for (const drawOrderItem of screenData.batchInfo.drawOrder) {
      if (drawOrderItem.endIndex === null) {
        drawOrderItem.endIndex = drawOrderItem.batch.count;
      }
      if (drawOrderItem.endIndex - drawOrderItem.startIndex > 0) {
        const texture = drawOrderItem.batch.type === IMAGE_BATCH ? drawOrderItem.texture : null;
        drawBatch(gl, drawOrderItem.batch, drawOrderItem.startIndex, drawOrderItem.endIndex, texture);
      }
    }
    for (const batchType in screenData.batches) {
      const batch = screenData.batches[batchType];
      resetBatch(batch);
    }
    screenData.batchInfo.drawOrder = [];
    screenData.batchInfo.currentBatch = null;
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function uploadBatch(gl, batch, width, height) {
    gl.useProgram(batch.program);
    gl.uniform2f(batch.locations.resolution, width, height);
    gl.bindVertexArray(batch.vao);
    if (batch.capacityChanged) {
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertexVBO);
      gl.bufferData(gl.ARRAY_BUFFER, batch.vertices.byteLength, gl.STREAM_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.colorVBO);
      gl.bufferData(gl.ARRAY_BUFFER, batch.colors.byteLength, gl.STREAM_DRAW);
      if (batch.type === IMAGE_BATCH) {
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.texCoordVBO);
        gl.bufferData(gl.ARRAY_BUFFER, batch.texCoords.byteLength, gl.STREAM_DRAW);
      }
      batch.capacityChanged = false;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertexVBO);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      batch.vertices.subarray(0, batch.count * batch.vertexComps)
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.colorVBO);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      batch.colors.subarray(0, batch.count * batch.colorComps)
    );
    if (batch.type === IMAGE_BATCH) {
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.texCoordVBO);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        batch.texCoords.subarray(0, batch.count * batch.texCoordComps)
      );
    }
  }
  function drawBatch(gl, batch, startIndex, endIndex, texture = null) {
    gl.useProgram(batch.program);
    gl.bindVertexArray(batch.vao);
    if (batch.type === IMAGE_BATCH && texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(batch.locations.texture, 0);
    }
    gl.drawArrays(batch.mode, startIndex, endIndex - startIndex);
  }
  function resetBatch(batch) {
    batch.capacityLocalMax = Math.max(batch.count, batch.capacityLocalMax);
    batch.count = 0;
    if (batch.type === IMAGE_BATCH) {
      batch.image = null;
    }
    if (Date.now() > batch.capacityShrinkCheckTime) {
      if (batch.capacity > batch.minCapacity && batch.capacityLocalMax < batch.capacity * 0.5) {
        resizeBatch(batch, Math.max(batch.capacity * 0.5, batch.minCapacity));
      }
      batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;
      batch.capacityLocalMax = 0;
    }
  }
  function displayToCanvas(screenData) {
    const gl = screenData.gl;
    const program = screenData.displayProgram;
    const locations = screenData.displayLocations;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, screenData.canvas.width, screenData.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(program);
    gl.enableVertexAttribArray(locations.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, screenData.displayPositionBuffer);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, screenData.texture);
    gl.uniform1i(locations.texture, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(locations.position);
  }
  function drawPixelUnsafe(screenData, x, y, color) {
    const batch = screenData.batches[POINTS_BATCH];
    const idx = batch.count * batch.vertexComps;
    const cidx = batch.count * batch.colorComps;
    batch.vertices[idx] = x;
    batch.vertices[idx + 1] = y;
    batch.colors[cidx] = color.r;
    batch.colors[cidx + 1] = color.g;
    batch.colors[cidx + 2] = color.b;
    batch.colors[cidx + 3] = color.a;
    batch.count++;
  }
  function readPixel(screenData, x, y) {
    flushBatches(screenData);
    const gl = screenData.gl;
    const screenWidth = screenData.width;
    const screenHeight = screenData.height;
    if (x < 0 || y < 0 || x >= screenWidth || y >= screenHeight) {
      return null;
    }
    const glY = screenHeight - 1 - y;
    const buf = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
    gl.readPixels(x, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return rgbToColor(buf[0], buf[1], buf[2], buf[3]);
  }
  function readPixelAsync(screenData, x, y) {
    return new Promise((resolve) => {
      queueMicrotask(() => {
        resolve(readPixel(screenData, x, y));
      });
    });
  }
  function readPixels(screenData, x, y, width, height) {
    const gl = screenData.gl;
    const screenWidth = screenData.width;
    const screenHeight = screenData.height;
    const clampedX = Math.max(0, x);
    const clampedY = Math.max(0, y);
    const clampedWidth = Math.min(width, screenWidth - clampedX);
    const clampedHeight = Math.min(height, screenHeight - clampedY);
    if (clampedWidth <= 0 || clampedHeight <= 0) {
      return [];
    }
    flushBatches(screenData);
    const buf = new Uint8Array(clampedWidth * clampedHeight * 4);
    const glReadY = screenHeight - (clampedY + clampedHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
    gl.readPixels(clampedX, glReadY, clampedWidth, clampedHeight, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const resultColors = new Array(clampedHeight);
    for (let row = 0; row < clampedHeight; row++) {
      const resultsRow = new Array(clampedWidth);
      for (let col = 0; col < clampedWidth; col++) {
        const bufRow = clampedHeight - 1 - row;
        const i = (clampedWidth * bufRow + col) * 4;
        resultsRow[col] = rgbToColor(
          buf[i],
          buf[i + 1],
          buf[i + 2],
          buf[i + 3]
        );
      }
      resultColors[row] = resultsRow;
    }
    return resultColors;
  }
  function readPixelsAsync(screenData, x, y, width, height) {
    return new Promise((resolve) => {
      queueMicrotask(() => {
        resolve(readPixels(screenData, x, y, width, height));
      });
    });
  }
  function getWebGL2Texture(screenData, img) {
    if (!screenData.gl) {
      return null;
    }
    let contextMap = m_webgl2Textures.get(img);
    if (!contextMap) {
      contextMap = /* @__PURE__ */ new Map();
      m_webgl2Textures.set(img, contextMap);
    }
    const gl = screenData.gl;
    let texture = contextMap.get(gl);
    if (texture) {
      return texture;
    }
    texture = gl.createTexture();
    if (!texture) {
      console.error("Failed to create WebGL2 texture for image.");
      return null;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    contextMap.set(gl, texture);
    return texture;
  }
  function deleteWebGL2Texture(img) {
    const contextMap = m_webgl2Textures.get(img);
    if (!contextMap) {
      return;
    }
    const allScreens = getAllScreens();
    for (const screenData of allScreens) {
      if (!screenData.gl || screenData.renderMode !== "webgl2") {
        continue;
      }
      const texture = contextMap.get(screenData.gl);
      if (texture) {
        screenData.gl.deleteTexture(texture);
        contextMap.delete(screenData.gl);
      }
    }
    if (contextMap.size === 0) {
      m_webgl2Textures.delete(img);
    }
  }
  function drawImage(screenData, img, x, y, angleRad, anchorX, anchorY, alpha, scaleX, scaleY) {
    const texture = getWebGL2Texture(screenData, img);
    if (!texture) {
      return;
    }
    const imgWidth = img.width;
    const imgHeight = img.height;
    const anchorXPx = Math.round(imgWidth * anchorX);
    const anchorYPx = Math.round(imgHeight * anchorY);
    const scaledWidth = imgWidth * scaleX;
    const scaledHeight = imgHeight * scaleY;
    const corners = [
      { "x": -anchorXPx, "y": -anchorYPx },
      // Top-left
      { "x": scaledWidth - anchorXPx, "y": -anchorYPx },
      // Top-right
      { "x": -anchorXPx, "y": scaledHeight - anchorYPx },
      // Bottom-left
      { "x": scaledWidth - anchorXPx, "y": scaledHeight - anchorYPx }
      // Bottom-right
    ];
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const rx = corner.x * cos - corner.y * sin;
      const ry = corner.x * sin + corner.y * cos;
      corner.x = rx + x;
      corner.y = ry + y;
    }
    const texCoords = [
      0,
      0,
      // Top-left
      1,
      0,
      // Top-right
      0,
      1,
      // Bottom-left
      1,
      0,
      // Top-right (repeat for second triangle)
      1,
      1,
      // Bottom-right
      0,
      1
      // Bottom-left (repeat for second triangle)
    ];
    const batch = screenData.batches[IMAGE_BATCH];
    const batchInfo = screenData.batchInfo;
    if (batchInfo.currentBatch === batch && (batch.image !== img || batch.texture !== texture)) {
      if (batchInfo.drawOrder.length > 0) {
        const lastDrawOrderItem = batchInfo.drawOrder[batchInfo.drawOrder.length - 1];
        lastDrawOrderItem.endIndex = batch.count;
      }
      const drawOrderItem = {
        batch,
        "startIndex": batch.count,
        "endIndex": null,
        image: img,
        texture
      };
      batchInfo.drawOrder.push(drawOrderItem);
    }
    prepareBatch(screenData, IMAGE_BATCH, 6);
    batch.image = img;
    batch.texture = texture;
    if (batchInfo.drawOrder.length > 0) {
      const lastDrawOrderItem = batchInfo.drawOrder[batchInfo.drawOrder.length - 1];
      if (lastDrawOrderItem.endIndex === null) {
        lastDrawOrderItem.image = img;
        lastDrawOrderItem.texture = texture;
      }
    }
    const r = Math.round(255);
    const g = Math.round(255);
    const b = Math.round(255);
    const a = Math.round(alpha);
    const baseIdx = batch.count;
    const vertexBase = baseIdx * batch.vertexComps;
    const colorBase = baseIdx * batch.colorComps;
    const texBase = baseIdx * batch.texCoordComps;
    let vIdx = vertexBase;
    let cIdx = colorBase;
    let tIdx = texBase;
    batch.vertices[vIdx++] = corners[0].x;
    batch.vertices[vIdx++] = corners[0].y;
    batch.colors[cIdx++] = r;
    batch.colors[cIdx++] = g;
    batch.colors[cIdx++] = b;
    batch.colors[cIdx++] = a;
    batch.texCoords[tIdx++] = texCoords[0];
    batch.texCoords[tIdx++] = texCoords[1];
    batch.vertices[vIdx++] = corners[1].x;
    batch.vertices[vIdx++] = corners[1].y;
    batch.colors[cIdx++] = r;
    batch.colors[cIdx++] = g;
    batch.colors[cIdx++] = b;
    batch.colors[cIdx++] = a;
    batch.texCoords[tIdx++] = texCoords[2];
    batch.texCoords[tIdx++] = texCoords[3];
    batch.vertices[vIdx++] = corners[2].x;
    batch.vertices[vIdx++] = corners[2].y;
    batch.colors[cIdx++] = r;
    batch.colors[cIdx++] = g;
    batch.colors[cIdx++] = b;
    batch.colors[cIdx++] = a;
    batch.texCoords[tIdx++] = texCoords[4];
    batch.texCoords[tIdx++] = texCoords[5];
    batch.vertices[vIdx++] = corners[1].x;
    batch.vertices[vIdx++] = corners[1].y;
    batch.colors[cIdx++] = r;
    batch.colors[cIdx++] = g;
    batch.colors[cIdx++] = b;
    batch.colors[cIdx++] = a;
    batch.texCoords[tIdx++] = texCoords[6];
    batch.texCoords[tIdx++] = texCoords[7];
    batch.vertices[vIdx++] = corners[3].x;
    batch.vertices[vIdx++] = corners[3].y;
    batch.colors[cIdx++] = r;
    batch.colors[cIdx++] = g;
    batch.colors[cIdx++] = b;
    batch.colors[cIdx++] = a;
    batch.texCoords[tIdx++] = texCoords[8];
    batch.texCoords[tIdx++] = texCoords[9];
    batch.vertices[vIdx++] = corners[2].x;
    batch.vertices[vIdx++] = corners[2].y;
    batch.colors[cIdx++] = r;
    batch.colors[cIdx++] = g;
    batch.colors[cIdx++] = b;
    batch.colors[cIdx++] = a;
    batch.texCoords[tIdx++] = texCoords[10];
    batch.texCoords[tIdx++] = texCoords[11];
    batch.count += 6;
    setImageDirty(screenData);
  }

  // src/graphics/renderer-canvas2d.js
  var renderer_canvas2d_exports = {};
  __export(renderer_canvas2d_exports, {
    afterResize: () => afterResize,
    beforeResize: () => beforeResize,
    blendPixelUnsafe: () => blendPixelUnsafe,
    cleanup: () => cleanup2,
    cls: () => cls2,
    drawImage: () => drawImage2,
    drawPixelUnsafe: () => drawPixelUnsafe2,
    getImageData: () => getImageData,
    init: () => init5,
    initCanvas2D: () => initCanvas2D,
    readPixel: () => readPixel2,
    readPixelAsync: () => readPixelAsync2,
    readPixels: () => readPixels2,
    readPixelsAsync: () => readPixelsAsync2,
    setImageDirty: () => setImageDirty2
  });
  var m_autoRenderScheduled = false;
  function init5(api2) {
  }
  function cleanup2(screenData) {
    screenData.context = null;
    screenData.canvas = null;
    screenData.imageData = null;
    screenData.bufferCanvas = null;
    screenData.bufferContext = null;
  }
  function initCanvas2D(screenData) {
    const context = screenData.canvas.getContext("2d", { "willReadFrequently": true });
    if (!context) {
      return null;
    }
    context.imageSmoothingEnabled = false;
    screenData.imageData = context.createImageData(screenData.width, screenData.height);
    screenData.context = context;
    screenData.bufferCanvas = null;
    screenData.bufferContext = null;
    return true;
  }
  function getImageData(screenData) {
  }
  function setImageDirty2(screenData) {
    if (!m_autoRenderScheduled) {
      m_autoRenderScheduled = true;
      queueMicrotask(() => {
        screenData.context.putImageData(screenData.imageData, 0, 0);
        m_autoRenderScheduled = false;
      });
    }
  }
  function beforeResize(screenData, fromSize) {
    if (screenData.bufferCanvas === null) {
      screenData.bufferCanvas = new OffscreenCanvas(fromSize.width, fromSize.height);
      screenData.bufferContext = screenData.bufferCanvas.getContext("2d");
      setTimeout(() => {
        screenData.bufferCanvas = null;
        screenData.bufferContext = null;
      }, 3e3);
    }
    screenData.bufferContext.clearRect(0, 0, fromSize.width, fromSize.height);
    screenData.bufferContext.drawImage(screenData.canvas, 0, 0);
  }
  function afterResize(screenData, fromSize, toSize) {
    screenData.context.drawImage(
      screenData.bufferCanvas,
      0,
      0,
      fromSize.width,
      fromSize.height
    );
    screenData.bufferCanvas.width = toSize.width;
    screenData.bufferCanvas.height = toSize.height;
  }
  function cls2(screenData, x, y, width, height) {
  }
  function drawPixelUnsafe2(screenData, x, y, color) {
    const data = screenData.imageData.data;
    const i = (screenData.width * y + x) * 4;
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
    data[i + 3] = color.a;
  }
  function blendPixelUnsafe(screenData, x, y, color) {
    const data = screenData.imageData.data;
    const i = (screenData.width * y + x) * 4;
    const srcA = color.a / 255;
    const dstA = data[i + 3] / 255;
    data[i] = Math.round(color.r * srcA + data[i] * (1 - srcA));
    data[i + 1] = Math.round(color.g * srcA + data[i + 1] * (1 - srcA));
    data[i + 2] = Math.round(color.b * srcA + data[i + 2] * (1 - srcA));
    data[i + 3] = Math.round((srcA + dstA * (1 - srcA)) * 255);
  }
  function readPixel2(screenData, x, y) {
    if (x < 0 || y < 0 || x >= screenData.width || y >= screenData.height) {
      return null;
    }
    const data = screenData.imageData.data;
    const i = (screenData.width * y + x) * 4;
    return rgbToColor(data[i], data[i + 1], data[i + 2], data[i + 3]);
  }
  function readPixelAsync2(screenData, x, y) {
    return Promise.resolve(readPixel2(screenData, x, y));
  }
  function readPixels2(screenData, x, y, width, height) {
    getImageData(screenData);
    const screenWidth = screenData.width;
    const screenHeight = screenData.height;
    const data = screenData.imageData.data;
    const results = new Array(height);
    for (let row = 0; row < height; row++) {
      const screenY = y + row;
      const isRowOnScreen = screenY >= 0 && screenY < screenHeight;
      const resultRow = new Array(width);
      for (let col = 0; col < width; col++) {
        const screenX = x + col;
        if (isRowOnScreen && screenX >= 0 && screenX < screenWidth) {
          const i = (screenWidth * screenY + screenX) * 4;
          resultRow[col] = rgbToColor(
            data[i],
            data[i + 1],
            data[i + 2],
            data[i + 3]
          );
        } else {
          resultRow[col] = null;
        }
      }
      results[row] = resultRow;
    }
    return results;
  }
  function readPixelsAsync2(screenData, x, y, width, height) {
    return Promise.resolve(readPixels2(screenData, x, y, width, height));
  }
  function drawImage2(screenData, img, x, y, angleRad, anchorX, anchorY, alpha, scaleX, scaleY) {
    const context = screenData.context;
    const anchorXPx = Math.round(img.width * anchorX);
    const anchorYPx = Math.round(img.height * anchorY);
    context.save();
    context.globalAlpha = alpha / 255;
    context.translate(x, y);
    context.rotate(angleRad);
    context.scale(scaleX, scaleY);
    context.drawImage(img, -anchorXPx, -anchorYPx);
    context.restore();
    setImageDirty2(screenData);
  }

  // src/core/screen-manager.js
  var WEBGL2_RENDER_MODE = "webgl2";
  var CANVAS2D_RENDER_MODE = "canvas2d";
  var MAX_CANVAS_DIMENSION = 8192;
  var SCREEN_API_PROTO = { "screen": true };
  var m_screens = {};
  var m_screenDataItems = {};
  var m_screenDataItemGetters = [];
  var m_screenDataInitFunctions = [];
  var m_screenDataResizeFunctions = [];
  var m_screenDataCleanupFunctions = [];
  var m_nextScreenId = 0;
  var m_activeScreenData = null;
  var m_resizeObserver = null;
  var m_observedContainers = /* @__PURE__ */ new Set();
  function getAllScreens() {
    const screens = [];
    for (const id in m_screens) {
      screens.push(m_screens[id]);
    }
    return screens;
  }
  function init6(api2) {
    m_resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const container = entry.target;
        const canvases = container.querySelectorAll("canvas[data-screen-id]");
        if (canvases.length === 0) {
          continue;
        }
        for (const canvas of canvases) {
          const screenId = parseInt(canvas.dataset.screenId, 10);
          const screenData = m_screens[screenId];
          if (screenData) {
            resizeScreen(screenData, false);
          }
        }
      }
    });
    registerCommands3();
  }
  function registerCommands3() {
    addCommand(
      "screen",
      screen,
      false,
      ["aspect", "container", "isOffscreen", "isNoStyles", "resizeCallback", "useCanvas2d"]
    );
    addCommand("setScreen", setScreen, false, ["screen"]);
    addCommand("getScreen", getScreen, false, ["screenId"]);
    addCommand("removeScreen", removeScreen, false, ["screenId"]);
    addCommand("width", widthCmd, true, []);
    addCommand("height", heightCmd, true, []);
    addCommand("canvas", canvasCmd, true, []);
  }
  function addScreenDataItem(name, val) {
    m_screenDataItems[name] = val;
  }
  function addScreenDataItemGetter(name, fn) {
    m_screenDataItemGetters.push({ name, fn });
  }
  function addScreenInitFunction(fn) {
    m_screenDataInitFunctions.push(fn);
  }
  function addScreenResizeFunction(fn) {
    m_screenDataResizeFunctions.push(fn);
  }
  function addScreenCleanupFunction(fn) {
    m_screenDataCleanupFunctions.push(fn);
  }
  function getActiveScreen(fnName, isScreenOptional) {
    if (m_activeScreenData === null && !isScreenOptional) {
      const error = new Error(
        fnName + ": You are attempting to call a method that requires a screen but there there is currently no active screen. Call $.screen() before calling any graphics commands."
      );
      error.code = "NO_ACTIVE_SCREEN";
      throw error;
    }
    return m_activeScreenData;
  }
  function screen(options) {
    if (options.resizeCallback != null && !isFunction(options.resizeCallback)) {
      const error = new TypeError("screen: Parameter resizeCallback must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    const screenData = {
      "id": m_nextScreenId,
      "useCanvas2d": !!options.useCanvas2d,
      "isOffscreen": !!options.isOffscreen,
      "isNoStyles": !!options.isNoStyles,
      "resizeCallback": options.resizeCallback,
      "api": Object.create(SCREEN_API_PROTO),
      "canvas": null,
      "width": null,
      "height": null,
      "container": null,
      "aspectData": null,
      "clientRect": null,
      "previousOffsetSize": null
    };
    if (!m_isWebgl2Capable) {
      screenData.useCanvas2d = true;
    }
    Object.assign(screenData, structuredClone(m_screenDataItems));
    for (const itemGetter of m_screenDataItemGetters) {
      screenData[itemGetter.name] = structuredClone(itemGetter.fn());
    }
    m_nextScreenId += 1;
    if (!options.aspect) {
      screenData.aspectData = {
        "width": null,
        "height": null,
        "splitter": "",
        "isFixedSize": false
      };
    }
    if (typeof options.aspect === "string" && options.aspect !== "") {
      screenData.aspectData = parseAspect(options.aspect.toLowerCase());
      if (!screenData.aspectData) {
        const error = new Error("screen: Parameter aspect is not valid.");
        error.code = "INVALID_ASPECT";
        throw error;
      }
      if (screenData.aspectData.splitter !== ":") {
        validateDimensions(screenData.aspectData.width, screenData.aspectData.height);
      }
    }
    if (!m_isWebgl2Capable) {
      screenData.useCanvas2d = true;
    }
    screenData.canvas = document.createElement("canvas");
    if (screenData.isOffscreen) {
      if (!screenData.aspectData) {
        const error = new Error(
          "screen: You must supply an aspect ratio with exact dimensions for offscreen screens."
        );
        error.code = "NO_ASPECT_OFFSCREEN";
        throw error;
      }
      if (screenData.aspectData.splitter !== "x") {
        const error = new Error(
          "screen: You must use aspect ratio with e(x)act pixel dimensions for offscreen screens. For example: 320x200 for width of 320 and height of 200 pixels."
        );
        error.code = "INVALID_OFFSCREEN_ASPECT";
        throw error;
      }
      setupOffscreenCanvasOptions(screenData);
    } else {
      screenData.canvas.tabIndex = 0;
      if (typeof options.container === "string") {
        screenData.container = document.getElementById(options.container);
      } else if (!options.container) {
        screenData.container = document.body;
      } else {
        screenData.container = options.container;
      }
      if (!isDomElement(screenData.container)) {
        const error = new TypeError(
          "screen: Invalid argument container. Container must be a DOM element or a string id of a DOM element."
        );
        error.code = "INVALID_CONTAINER";
        throw error;
      }
      if (!screenData.isNoStyles) {
        setDefaultCanvasOptions(screenData);
      }
      screenData.container.appendChild(screenData.canvas);
      if (m_resizeObserver && screenData.container && !m_observedContainers.has(screenData.container)) {
        m_resizeObserver.observe(screenData.container);
        m_observedContainers.add(screenData.container);
      }
    }
    if (!screenData.isOffscreen) {
      resizeScreen(screenData, true);
    }
    m_activeScreenData = screenData;
    m_screens[screenData.id] = screenData;
    setupScreenRenderer(screenData);
    for (const fn of m_screenDataInitFunctions) {
      fn(screenData);
    }
    screenData.api.setPen(PEN_PIXEL);
    return screenData.api;
  }
  function parseAspect(aspect) {
    const match = aspect.replaceAll(" ", "").match(/^(\d+(?:\.\d+)?)(:|x|e|m)(\d+(?:\.\d+)?)$/);
    if (!match) {
      return null;
    }
    const width = Number(match[1]);
    const splitter = match[2];
    const height = Number(match[3]);
    if (isNaN(width) || width === 0 || isNaN(height) || height === 0) {
      return null;
    }
    return {
      "width": width,
      "height": height,
      "splitter": splitter,
      "isFixedSize": splitter === "m" || splitter === "x"
    };
  }
  function setupOffscreenCanvasOptions(screenData) {
    screenData.canvas.width = screenData.aspectData.width;
    screenData.canvas.height = screenData.aspectData.height;
    screenData.container = null;
    screenData.isOffscreen = true;
    screenData.isNoStyles = false;
    screenData.resizeCallback = null;
    screenData.previousOffsetSize = null;
  }
  function setDefaultCanvasOptions(screenData) {
    screenData.canvas.style.outline = "none";
    screenData.canvas.style.backgroundColor = "black";
    screenData.canvas.style.position = "absolute";
    screenData.canvas.style.imageRendering = "pixelated";
    const imageRenderingValues = ["pixelated", "crisp-edges", "-webkit-crisp-edges"];
    for (let i = 1; i < imageRenderingValues; i += 1) {
      if (screenData.canvas.styles.imageRendering === imageRenderingValues[i - 1]) {
        break;
      }
      screenData.canvas.style.imageRendering = imageRenderingValues[i];
    }
    if (screenData.container === document.body) {
      document.documentElement.style.height = "100%";
      document.documentElement.style.margin = "0";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
      screenData.canvas.style.left = "0";
      screenData.canvas.style.top = "0";
    }
  }
  function setupScreenRenderer(screenData) {
    let webgl2Status = null;
    if (!screenData.useCanvas2d) {
      webgl2Status = initWebGL(screenData);
      if (!webgl2Status) {
        console.error("Failed to create WebGL 2 canvas, falling back to canvas2d renderer");
        screenData.useCanvas2d = true;
        if (screenData.aspect !== ":") {
          resizeScreen(screenData, true);
        }
      }
    }
    if (webgl2Status !== null) {
      screenData.renderMode = WEBGL2_RENDER_MODE;
      screenData.renderer = renderer_webgl2_exports;
    } else {
      const canvas2dStatus = initCanvas2D(screenData);
      if (!canvas2dStatus) {
        const error = new Error("screen: Failed to create rendering context.");
        error.code = "NO_RENDERING_CONTEXT";
        throw error;
      }
      screenData.renderMode = CANVAS2D_RENDER_MODE;
      screenData.renderer = renderer_canvas2d_exports;
    }
  }
  function validateDimensions(width, height) {
    if (width <= 0 || height <= 0) {
      const error = new Error("screen: Canvas dimensions must be positive.");
      error.code = "INVALID_DIMENSIONS";
      throw error;
    }
    if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
      const error = new Error(
        `screen: Canvas dimensions exceed maximum of ${MAX_CANVAS_DIMENSION}px.`
      );
      error.code = "DIMENSION_TOO_LARGE";
      throw error;
    }
  }
  function removeScreen(options) {
    let screenId = options.id;
    if (!m_screens[screenId]) {
      return;
    }
    const screenData = m_screens[screenId];
    screenData.api.cancelInput();
    screenData.api.clearEvents();
    screenData.renderer.cleanup(screenData);
    for (const fn of m_screenDataCleanupFunctions) {
      fn(screenData);
    }
    const createdDeletedMethodErrorFn = (key, screenId2) => {
      screenData.api[key] = () => {
        const errorMessage = `Cannot call ${key}() on removed screen (id: ${screenId2}). The screen has been removed from the page.`;
        const error = new TypeError(errorMessage);
        error.code = "DELETED_METHOD";
        throw error;
      };
    };
    for (const key in screenData.api) {
      if (typeof screenData.api[key] === "function") {
        createdDeletedMethodErrorFn(key, screenId);
      }
    }
    if (screenData.canvas && screenData.canvas.parentElement) {
      screenData.canvas.parentElement.removeChild(screenData.canvas);
    }
    if (screenData.container && m_observedContainers.has(screenData.container)) {
      let hasOtherScreens = false;
      for (const id in m_screens) {
        const otherScreen = m_screens[id];
        if (otherScreen !== screenData && otherScreen.container === screenData.container) {
          hasOtherScreens = true;
          break;
        }
      }
      if (!hasOtherScreens) {
        m_resizeObserver.unobserve(screenData.container);
        m_observedContainers.delete(screenData.container);
      }
    }
    screenData.canvas = null;
    screenData.commands = null;
    screenData.resizeCallback = null;
    screenData.container = null;
    screenData.aspectData = null;
    screenData.clientRect = null;
    screenData.previousOffsetSize = null;
    for (const i in m_screenDataItems) {
      screenData[i] = null;
    }
    for (const getter of m_screenDataItemGetters) {
      screenData[getter.name] = null;
    }
    if (screenData === m_activeScreenData) {
      m_activeScreenData = null;
      for (const i in m_screens) {
        if (m_screens[i] !== screenData) {
          m_activeScreenData = m_screens[i];
          break;
        }
      }
    }
    delete m_screens[screenId];
  }
  function setScreen(options) {
    const screenObj = options.screen;
    let screenId;
    if (Number.isInteger(screenObj)) {
      screenId = screenObj;
    } else if (screenObj && Number.isInteger(screenObj.id)) {
      screenId = screenObj.id;
    }
    if (!m_screens[screenId]) {
      const error = new Error("screen: Invalid screen.");
      error.code = "INVALID_SCREEN";
      throw error;
    }
    m_activeScreenData = m_screens[screenId];
  }
  function getScreen(options) {
    const screenId = getInt(options.screenId, null);
    if (screenId === null || screenId < 0) {
      const error = new Error("screen: Invalid screen id.");
      error.code = "INVALID_SCREEN_ID";
      throw error;
    }
    const screen2 = m_screens[screenId];
    if (!screen2) {
      const error = new Error(`screen: Screen "${screenId}" not found.`);
      error.code = "SCREEN_NOT_FOUND";
      throw error;
    }
    return screen2.api;
  }
  function widthCmd(screenData) {
    return screenData.width;
  }
  function heightCmd(screenData) {
    return screenData.height;
  }
  function canvasCmd(screenData) {
    return screenData.canvas;
  }
  function resizeScreen(screenData, isInit) {
    if (screenData.isOffscreen || screenData.isNoStyles || screenData.canvas.offsetParent === null) {
      return;
    }
    let fromSize = screenData.previousOffsetSize;
    if (!isInit && screenData.renderMode === CANVAS2D_RENDER_MODE) {
      beforeResize(screenData, fromSize);
    }
    if (screenData.aspectData.splitter !== "") {
      const size = getSize(screenData.container);
      setCanvasSize(screenData, size.width, size.height);
    } else {
      if (screenData.container === document.body) {
        screenData.canvas.style.position = "static";
      }
      screenData.canvas.style.width = "100%";
      screenData.canvas.style.height = "100%";
      const size = getSize(screenData.canvas);
      screenData.canvas.width = Math.min(size.width, MAX_CANVAS_DIMENSION);
      screenData.canvas.height = Math.min(size.height, MAX_CANVAS_DIMENSION);
    }
    screenData.clientRect = screenData.canvas.getBoundingClientRect();
    if (screenData.aspectData.isFixedSize) {
      screenData.width = screenData.aspectData.width;
      screenData.height = screenData.aspectData.height;
    } else {
      if (screenData.splitter === "" || screenData.splitter === ":") {
        screenData.width = newCssWidth;
        screenData.height = newCssHeight;
      } else {
      }
    }
    const toSize = {
      "width": screenData.canvas.offsetWidth,
      "height": screenData.canvas.offsetHeight
    };
    if (!isInit) {
      if (screenData.renderMode === CANVAS2D_RENDER_MODE) {
        afterResize(screenData, fromSize, toSize);
      }
      for (const fn of m_screenDataResizeFunctions) {
        fn(screenData);
      }
    }
    if (screenData.resizeCallback) {
      if (fromSize !== null && (fromSize.width !== toSize.width || fromSize.height !== toSize.height)) {
        screenData.resizeCallback(screenData.api, fromSize, toSize);
      }
    }
    screenData.previousOffsetSize = toSize;
  }
  function setCanvasSize(screenData, maxWidth, maxHeight) {
    const aspectData = screenData.aspectData;
    const canvas = screenData.canvas;
    let width = aspectData.width;
    let height = aspectData.height;
    const splitter = aspectData.splitter;
    let newCssWidth2, newCssHeight2;
    if (splitter === "m" || splitter === "e") {
      const factorX = Math.floor(maxWidth / width);
      const factorY = Math.floor(maxHeight / height);
      let factor = factorX > factorY ? factorY : factorX;
      if (factor < 1) {
        factor = 1;
      }
      newCssWidth2 = width * factor;
      newCssHeight2 = height * factor;
      if (splitter === "e") {
        width = Math.floor(maxWidth / factor);
        height = Math.floor(maxHeight / factor);
        newCssWidth2 = width * factor;
        newCssHeight2 = height * factor;
        screenData.width = width;
        screenData.height = height;
      }
    } else {
      const ratio1 = height / width;
      const ratio2 = width / height;
      newCssWidth2 = maxHeight * ratio2;
      newCssHeight2 = maxWidth * ratio1;
      if (newCssWidth2 > maxWidth) {
        newCssWidth2 = maxWidth;
        newCssHeight2 = newCssWidth2 * ratio1;
      } else {
        newCssHeight2 = maxHeight;
      }
    }
    canvas.style.width = Math.floor(newCssWidth2) + "px";
    canvas.style.height = Math.floor(newCssHeight2) + "px";
    canvas.style.marginLeft = Math.floor((maxWidth - newCssWidth2) / 2) + "px";
    canvas.style.marginTop = Math.floor((maxHeight - newCssHeight2) / 2) + "px";
    if (splitter !== ":") {
      canvas.width = Math.min(width, MAX_CANVAS_DIMENSION);
      canvas.height = Math.min(height, MAX_CANVAS_DIMENSION);
    } else {
      canvas.width = Math.min(Math.floor(newCssWidth2), MAX_CANVAS_DIMENSION);
      canvas.height = Math.min(Math.floor(newCssHeight2), MAX_CANVAS_DIMENSION);
    }
  }
  function getSize(element) {
    return {
      "width": element.offsetWidth || element.clientWidth || element.width,
      "height": element.offsetHeight || element.clientHeight || element.height
    };
  }

  // src/core/state-settings.js
  var m_settings = {};
  var m_readyCallbacks = [];
  var m_isDocumentReady = false;
  var m_waitCount = 0;
  var m_checkReadyTimeout = null;
  var m_commands = [];
  function init7(api2) {
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
      } else {
        m_isDocumentReady = true;
      }
    } else {
      m_isDocumentReady = true;
    }
    registerCommands4(api2);
    addScreenInitFunction(processScreenCommands);
  }
  function registerCommands4(api2) {
    addCommand("ready", ready, false, ["callback"]);
    addCommand("set", set, true, ["options"], true);
  }
  function wait() {
    m_waitCount++;
  }
  function done() {
    m_waitCount--;
    if (m_waitCount < 0) {
      m_waitCount = 0;
    }
    scheduleReadyCheck();
  }
  function addSetting(name, fn, isScreen) {
    m_settings[name] = { fn, isScreen };
  }
  function addCommand(name, fn, isScreen, parameterNames, isScreenOptional) {
    m_commands.push({ name, fn, isScreen, parameterNames, isScreenOptional });
    if (name.startsWith("set") && name !== "set") {
      const settingName = name.substring(3, 4).toLowerCase() + name.substring(4);
      m_settings[settingName] = { fn, isScreen, "parameterNames": parameterNames };
    }
  }
  function processCommands(api2) {
    for (const command of m_commands) {
      const { name, fn, isScreen, parameterNames, isScreenOptional } = command;
      if (isScreen) {
        api2[name] = (...args) => {
          const options = parseOptions(args, parameterNames);
          const screenData = getActiveScreen(name, isScreenOptional);
          return fn(screenData, options);
        };
      } else {
        api2[name] = (...args) => {
          const options = parseOptions(args, parameterNames);
          return fn(options);
        };
      }
    }
  }
  function processScreenCommands(screenData) {
    for (const command of m_commands) {
      const { name, fn, isScreen, parameterNames } = command;
      if (isScreen) {
        screenData.api[name] = (...args) => {
          const options = parseOptions(args, parameterNames);
          return fn(screenData, options);
        };
      }
    }
  }
  function ready(callback) {
    if (callback != null && !isFunction(callback)) {
      const error = new TypeError("ready: Parameter callback must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    return new Promise((resolve) => {
      m_readyCallbacks.push({
        "callback": callback,
        "resolve": resolve,
        "triggered": false
      });
      scheduleReadyCheck();
    });
  }
  function set(screenData, options) {
    for (const optionName in options) {
      if (options[optionName] === null) {
        continue;
      }
      if (m_settings[optionName]) {
        const setting = m_settings[optionName];
        const optionValues = options[optionName];
        const argsArray = [optionValues];
        const parsedOptions = parseOptions(argsArray, setting.parameterNames);
        if (setting.isScreen) {
          setting.fn(screenData, parsedOptions);
        } else {
          setting.fn(parsedOptions);
        }
        if (optionName === "screen") {
          screenData = getActiveScreen();
        }
      }
    }
  }
  function onDocumentReady() {
    m_isDocumentReady = true;
    scheduleReadyCheck();
  }
  function scheduleReadyCheck() {
    if (m_checkReadyTimeout !== null) {
      clearTimeout(m_checkReadyTimeout);
    }
    m_checkReadyTimeout = setTimeout(checkReady, 0);
  }
  function checkReady() {
    m_checkReadyTimeout = null;
    if (!m_isDocumentReady) {
      return;
    }
    if (m_waitCount !== 0) {
      return;
    }
    const callbacks = m_readyCallbacks.slice();
    m_readyCallbacks = [];
    for (const item of callbacks) {
      if (item.triggered) {
        continue;
      }
      item.triggered = true;
      if (item.callback) {
        item.callback();
      }
      item.resolve();
    }
  }

  // src/core/plugins.js
  var plugins_exports = {};
  __export(plugins_exports, {
    init: () => init8
  });
  var m_plugins = [];
  var m_api2;
  function init8(api2) {
    m_api2 = api2;
    addCommand(
      "registerPlugin",
      registerPlugin,
      false,
      ["name", "version", "description", "init"]
    );
    addCommand(
      "getPlugins",
      getPlugins,
      false,
      []
    );
  }
  function registerPlugin(options) {
    if (!options.name || typeof options.name !== "string") {
      const error = new TypeError("registerPlugin: Plugin must have a 'name' property.");
      error.code = "INVALID_PLUGIN_NAME";
      throw error;
    }
    if (!options.init || typeof options.init !== "function") {
      const error = new TypeError(
        `registerPlugin: Plugin '${options.name}' must have an 'init' function.`
      );
      error.code = "INVALID_PLUGIN_INIT";
      throw error;
    }
    if (m_plugins.find((p) => p.name === options.name)) {
      const error = new Error(
        `registerPlugin: Plugin '${options.name}' is already registered.`
      );
      error.code = "DUPLICATE_PLUGIN";
      throw error;
    }
    const pluginInfo = {
      "name": options.name,
      "version": options.version || "unknown",
      "description": options.description || "",
      "config": options,
      "initialized": false
    };
    m_plugins.push(pluginInfo);
    initializePlugin(pluginInfo);
  }
  function getPlugins() {
    return m_plugins.map((p) => ({
      "name": p.name,
      "version": p.version,
      "description": p.description,
      "initialized": p.initialized
    }));
  }
  function initializePlugin(pluginInfo) {
    if (pluginInfo.initialized) {
      return;
    }
    try {
      pluginInfo.config.init(m_api2, m_mods);
      pluginInfo.initialized = true;
    } catch (error) {
      const pluginError = new Error(
        `registerPlugin: Failed to initialize plugin '${pluginInfo.name}': ${error.message}`
      );
      pluginError.code = "PLUGIN_INIT_FAILED";
      pluginError.originalError = error;
      throw pluginError;
    }
  }

  // src/graphics/pixels.js
  var pixels_exports = {};
  __export(pixels_exports, {
    init: () => init9
  });
  function init9(api2) {
    registerCommands5();
    api2.put = (data, x, y, include0) => {
      return putWrapper(getActiveScreen("put"), data, x, y, include0);
    };
    addScreenInitFunction((screenData) => {
      screenData.api.put = (data, x, y, include0) => {
        return putWrapper(screenData, data, x, y, include0);
      };
    });
  }
  function registerCommands5() {
    addCommand("getPixel", getPixel, true, ["x", "y", "asIndex"]);
    addCommand("getPixelAsync", getPixelAsync, true, ["x", "y", "asIndex"]);
    addCommand(
      "get",
      get,
      true,
      ["x", "y", "width", "height", "tolerance", "asIndex"]
    );
  }
  function getPixel(screenData, options) {
    const px = getInt(options.x, null);
    const py = getInt(options.y, null);
    if (px === null || py === null) {
      const error = new TypeError("getPixel: Parameters x and y must be integers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    const asIndex = options.asIndex === true ? true : false;
    const colorValue = screenData.renderer.readPixel(screenData, px, py);
    if (asIndex) {
      return findColorIndexByColorValue(screenData, colorValue);
    }
    return colorValue;
  }
  function getPixelAsync(screenData, options) {
    const px = getInt(options.x, null);
    const py = getInt(options.y, null);
    if (px === null || py === null) {
      const error = new TypeError("getPixelAsync: Parameters x and y must be integers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    const asIndex = options.asIndex === true ? true : false;
    return screenData.renderer.readPixelsAsync(screenData, px, py).then((arr) => {
      const colorValue = arr[0];
      if (asIndex) {
        return findColorIndexByColorValue(screenData, colorValue);
      }
      return colorValue;
    });
  }
  function get(screenData, options) {
    const pX = getInt(options.x, null);
    const pY = getInt(options.y, null);
    const pWidth = getInt(options.width, null);
    const pHeight = getInt(options.height, null);
    const tolerance = options.tolerance;
    const asIndex = options.asIndex === null ? true : !!options.asIndex;
    if (pX === null || pY === null || pWidth === null || pHeight === null) {
      const error = new TypeError(
        "get: Parameters x, y, width and height must be integers."
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (pWidth <= 0 || pHeight <= 0) {
      return [];
    }
    const colors = screenData.renderer.readPixels(screenData, pX, pY, pWidth, pHeight);
    if (!asIndex) {
      return colors;
    }
    const results = new Array(colors.length);
    for (let row = 0; row < colors.length; row++) {
      const resultsRow = new Array(colors[row].length);
      for (let col = 0; col < pWidth; col++) {
        const colorValue = colors[row][col];
        if (asIndex) {
          const idx = findColorIndexByColorValue(
            screenData,
            colorValue,
            tolerance
          );
          resultsRow[col] = idx === null ? 0 : idx;
        } else {
          resultsRow[col] = colorValue;
        }
      }
      results[row] = resultsRow;
    }
    return results;
  }
  function putWrapper(screenData, data, x, y, include0 = false) {
    let pData, pX, pY, pInclude0;
    if (isObjectLiteral(data)) {
      pData = data.data;
      pX = getInt(data.x, null);
      pY = getInt(data.y, null);
      pInclude0 = !!data.include0;
    } else {
      pData = data;
      pX = getInt(x, null);
      pY = getInt(y, null);
      pInclude0 = !!include0;
    }
    if (!pData || pData.length < 1) {
      return null;
    }
    if (pX === null || pY === null) {
      const error = new TypeError("put: Parameters x and y must be integers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    const screenW = screenData.width;
    const screenH = screenData.height;
    let startX = pX < 0 ? -pX : 0;
    let startY = pY < 0 ? -pY : 0;
    let width = data[0] ? data[0].length - startX : 0;
    let height = data.length - startY;
    if (pX + startX + width > screenW) {
      width = screenW - pX - startX;
    }
    if (pY + startY + height > screenH) {
      height = screenH - pY - startY;
    }
    if (width <= 0 || height <= 0) {
      return;
    }
    if (screenData.renderMode === CANVAS2D_RENDER_MODE) {
      screenData.renderer.getImageData();
    } else {
      let pixelCount = 0;
      for (let i = startY; i < startY + height; i++) {
        const row = pData[i];
        if (row) {
          pixelCount += width;
        }
      }
      screenData.renderer.prepareBatch(screenData, POINTS_BATCH, pixelCount);
    }
    put(screenData, pData, pX, pY, pInclude0, startY, startX, width, height);
    screenData.renderer.setImageDirty(screenData);
  }
  function put(screenData, data, x, y, include0, startY, startX, width, height) {
    const endY = startY + height;
    const endX = startX + width;
    for (let dataY = startY; dataY < endY; dataY++) {
      const row = data[dataY];
      if (!row) {
        continue;
      }
      for (let dataX = startX; dataX < endX; dataX++) {
        const colorIndex = ~~row[dataX];
        if (colorIndex === 0 && include0 === false) {
          continue;
        }
        const colorValue = getColorValueByIndex(screenData, colorIndex);
        const sx = x + dataX;
        const sy = y + dataY;
        screenData.renderer.drawPixelUnsafe(screenData, sx, sy, colorValue);
      }
    }
  }

  // src/graphics/images.js
  var images_exports = {};
  __export(images_exports, {
    getCanvas2DImage: () => getCanvas2DImage,
    getStoredImage: () => getStoredImage,
    init: () => init10,
    removeImage: () => removeImage
  });
  var m_images = {};
  var m_imageCount = 0;
  var m_canvas2dImages = /* @__PURE__ */ new WeakMap();
  function init10(api2) {
    registerCommands6();
  }
  function registerCommands6() {
    addCommand(
      "loadImage",
      loadImage,
      false,
      ["src", "name", "onLoad", "onError"]
    );
    addCommand(
      "drawImage",
      drawImage3,
      true,
      ["name", "x", "y", "angle", "anchorX", "anchorY", "alpha", "scaleX", "scaleY"]
    );
  }
  function loadImage(options) {
    const src = options.src;
    let name = options.name;
    const onLoadCallback = options.onLoad;
    const onErrorCallback = options.onError;
    const srcErrMsg = "loadImage: Parameter src must be a string URL, Image element, or Canvas element.";
    if (typeof src === "string") {
      if (src === "") {
        const error = new TypeError(srcErrMsg);
        error.code = "INVALID_SRC";
        throw error;
      }
    } else if (src && typeof src === "object") {
      if (src.tagName !== "IMG" && src.tagName !== "CANVAS") {
        const error = new TypeError(srcErrMsg);
        error.code = "INVALID_SRC";
        throw error;
      }
    } else {
      const error = new TypeError(srcErrMsg);
      error.code = "INVALID_SRC";
      throw error;
    }
    if (name && typeof name !== "string") {
      const error = new TypeError("loadImage: Parameter name must be a string.");
      error.code = "INVALID_NAME";
      throw error;
    }
    if (!name || name === "") {
      m_imageCount += 1;
      name = "" + m_imageCount;
    }
    if (m_images[name]) {
      const error = new TypeError("loadImage: Parameter name must be unique.");
      error.code = "INVALID_NAME";
      throw error;
    }
    if (onLoadCallback != null && !isFunction(onLoadCallback)) {
      const error = new TypeError("loadImage: Parameter onLoad must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    if (onErrorCallback != null && !isFunction(onErrorCallback)) {
      const error = new TypeError("loadImage: Parameter onError must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    let img;
    if (typeof src !== "string") {
      img = src;
      m_images[name] = {
        "status": "ready",
        "type": "image",
        "image": img,
        "width": img.width,
        "height": img.height
      };
      registerImageForRenderers(img);
      if (onLoadCallback) {
        onLoadCallback(img);
      }
      return name;
    }
    m_images[name] = { "status": "loading" };
    img = new Image();
    wait();
    img.onload = function() {
      m_images[name] = {
        "status": "ready",
        "type": "image",
        "image": img,
        "width": img.width,
        "height": img.height
      };
      registerImageForRenderers(img);
      if (onLoadCallback) {
        onLoadCallback(img);
      }
      done();
    };
    img.onerror = function(error) {
      m_images[name] = {
        "status": "error",
        "error": error
      };
      if (onErrorCallback) {
        onErrorCallback(error);
      }
      done();
    };
    img.src = src;
    return name;
  }
  function drawImage3(screenData, options) {
    const name = options.name;
    let x = options.x || 0;
    let y = options.y || 0;
    let angle = options.angle;
    let anchorX = options.anchorX;
    let anchorY = options.anchorY;
    let alpha = options.alpha;
    let scaleX = options.scaleX;
    let scaleY = options.scaleY;
    let img;
    if (typeof name === "string") {
      const imageData = getStoredImage(name);
      if (!imageData) {
        const error = new Error(`drawImage: Image "${name}" not found.`);
        error.code = "IMAGE_NOT_FOUND";
        throw error;
      }
      if (imageData.status === "loading") {
        const error = new Error(
          `drawImage: Image "${name}" is still loading. Use $.ready() to wait for it.`
        );
        error.code = "IMAGE_NOT_READY";
        throw error;
      }
      if (imageData.status === "error") {
        const error = new Error(`drawImage: Image "${name}" failed to load.`);
        error.code = "IMAGE_LOAD_FAILED";
        throw error;
      }
      img = imageData.image;
    } else if (name && typeof name === "object") {
      if (name.screen === true) {
        if (typeof name.canvas === "function") {
          img = name.canvas();
        } else {
          img = name.canvas;
        }
        if (!img) {
          const error = new Error("drawImage: Screen has no canvas.");
          error.code = "INVALID_SCREEN";
          throw error;
        }
      } else if (name.tagName === "CANVAS" || name.tagName === "IMG") {
        img = name;
      } else {
        const error = new TypeError(
          "drawImage: Parameter name must be a string, screen object, Canvas element, or Image element."
        );
        error.code = "INVALID_NAME";
        throw error;
      }
    } else {
      const error = new TypeError(
        "drawImage: Parameter name must be a string, screen object, Canvas element, or Image element."
      );
      error.code = "INVALID_NAME";
      throw error;
    }
    if (isNaN(x) || isNaN(y)) {
      const error = new TypeError("drawImage: Parameters x and y must be numbers.");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    if (scaleX == null || isNaN(Number(scaleX))) {
      scaleX = 1;
    }
    if (scaleY == null || isNaN(Number(scaleY))) {
      scaleY = 1;
    }
    if (angle == null) {
      angle = 0;
    }
    if (anchorX == null) {
      anchorX = 0;
    }
    if (anchorY == null) {
      anchorY = 0;
    }
    if (alpha == null && alpha !== 0) {
      alpha = 255;
    }
    const angleRad = degreesToRadian(angle);
    screenData.renderer.drawImage(
      screenData,
      img,
      x,
      y,
      angleRad,
      anchorX,
      anchorY,
      alpha,
      scaleX,
      scaleY
    );
  }
  function registerImageForRenderers(img) {
    m_canvas2dImages.set(img, img);
  }
  function getCanvas2DImage(img) {
    return m_canvas2dImages.get(img) || img;
  }
  function getStoredImage(name) {
    if (typeof name !== "string") {
      return null;
    }
    return m_images[name] || null;
  }
  function removeImage(name) {
    if (typeof name !== "string") {
      return;
    }
    const imageData = m_images[name];
    if (imageData && imageData.image) {
      const img = imageData.image;
      deleteWebGL2Texture(img);
      delete m_images[name];
    }
  }

  // src/input/events.js
  var events_exports = {};
  __export(events_exports, {
    init: () => init11,
    offevent: () => offevent,
    onevent: () => onevent,
    triggerEventListeners: () => triggerEventListeners
  });
  function clearKeyboardEvents() {
  }
  function clearMouseEvents(screenData) {
  }
  function clearTouchEvents(screenData) {
  }
  function clearPressEvents(screenData) {
  }
  function clearClickEvents(screenData) {
  }
  function clearGamepadEvents() {
  }
  function init11(api2) {
    addCommand("clearEvents", clearEvents, true, ["clearEvents"], true);
  }
  function clearEvents(screenData, options) {
    const type = options.type;
    const types = Array.isArray(type) ? type : type ? [type] : null;
    if (!types) {
      clearKeyboardEvents();
      clearGamepadEvents();
      if (screenData) {
        clearMouseEvents(screenData);
        clearTouchEvents(screenData);
        clearPressEvents(screenData);
        clearClickEvents(screenData);
      }
      return;
    }
    for (const t of types) {
      const lowerType = t.toLowerCase();
      if (lowerType === "keyboard") {
        clearKeyboardEvents();
      } else if (lowerType === "gamepad") {
        clearGamepadEvents();
      } else if (lowerType === "mouse") {
        if (!screenData) {
          const error = new Error("clearEvents: No screen available to clear mouse events.");
          error.code = "NO_SCREEN";
          throw error;
        }
        clearMouseEvents(screenData);
      } else if (lowerType === "touch") {
        if (!screenData) {
          const error = new Error("clearEvents: No screen available to clear touch events.");
          error.code = "NO_SCREEN";
          throw error;
        }
        clearTouchEvents(screenData);
      } else if (lowerType === "press") {
        if (!screenData) {
          const error = new Error("clearEvents: No screen available to clear press events.");
          error.code = "NO_SCREEN";
          throw error;
        }
        clearPressEvents(screenData);
      } else if (lowerType === "click") {
        if (!screenData) {
          const error = new Error("clearEvents: No screen available to clear click events.");
          error.code = "NO_SCREEN";
          throw error;
        }
        clearClickEvents(screenData);
      } else {
        const error = new Error(
          `clearEvents: Invalid type "${t}". Valid types: keyboard, mouse, touch, press, click, gamepad.`
        );
        error.code = "INVALID_TYPE";
        throw error;
      }
    }
  }
  function onevent(mode, fn, once, hitBox, modes, name, listenerArr, extraId, extraData, customData) {
    let modeFound = false;
    for (let i = 0; i < modes.length; i++) {
      if (mode === modes[i]) {
        modeFound = true;
        break;
      }
    }
    if (!modeFound) {
      const error = new Error(
        `${name}: mode needs to be one of the following: ${modes.join(", ")}.`
      );
      error.code = "INVALID_MODE";
      throw error;
    }
    once = !!once;
    if (!isFunction(fn)) {
      const error = new Error(`${name}: fn is not a valid function.`);
      error.code = "INVALID_FUNCTION";
      throw error;
    }
    if (hitBox) {
      if (!Number.isInteger(hitBox.x) || !Number.isInteger(hitBox.y) || !Number.isInteger(hitBox.width) || !Number.isInteger(hitBox.height)) {
        const error = new Error(
          `${name}: hitBox must have properties x, y, width, and height whose values are integers.`
        );
        error.code = "INVALID_HITBOX";
        throw error;
      }
    }
    setTimeout(() => {
      const originalFn = fn;
      let newMode = mode;
      if (typeof extraId === "string") {
        newMode = mode + extraId;
      }
      let wrappedFn = fn;
      if (once) {
        wrappedFn = (data, customData2) => {
          offevent(mode, originalFn, modes, name, listenerArr, extraId);
          originalFn(data, customData2);
        };
      }
      if (!listenerArr[newMode]) {
        listenerArr[newMode] = [];
      }
      listenerArr[newMode].push({
        "fn": wrappedFn,
        "hitBox": hitBox,
        "extraData": extraData,
        "clickDown": false,
        "originalFn": originalFn,
        "customData": customData
      });
    }, 1);
    return true;
  }
  function offevent(mode, fn, modes, name, listenerArr, extraId) {
    let modeFound = false;
    for (let i = 0; i < modes.length; i++) {
      if (mode === modes[i]) {
        modeFound = true;
        break;
      }
    }
    if (!modeFound) {
      const error = new Error(
        `${name}: mode needs to be one of the following: ${modes.join(", ")}.`
      );
      error.code = "INVALID_MODE";
      throw error;
    }
    if (typeof extraId === "string") {
      mode += extraId;
    }
    const isClear = fn == null;
    if (!isClear && !isFunction(fn)) {
      const error = new Error(`${name}: fn is not a valid function.`);
      error.code = "INVALID_FUNCTION";
      throw error;
    }
    if (listenerArr[mode]) {
      if (isClear) {
        delete listenerArr[mode];
      } else {
        for (let i = listenerArr[mode].length - 1; i >= 0; i--) {
          if (listenerArr[mode][i].originalFn === fn) {
            listenerArr[mode].splice(i, 1);
          }
        }
        if (listenerArr[mode].length === 0) {
          delete listenerArr[mode];
        }
      }
      return true;
    }
    return false;
  }
  function triggerEventListeners(mode, data, listenerArr, clickStatus) {
    if (!listenerArr[mode]) {
      return;
    }
    const temp = listenerArr[mode].slice();
    for (let i = 0; i < temp.length; i++) {
      const listener = temp[i];
      if (clickStatus === "up" && !listener.clickDown) {
        continue;
      }
      if (listener.hitBox) {
        let isHit = false;
        let newData;
        if (Array.isArray(data)) {
          newData = [];
          for (let j = 0; j < data.length; j++) {
            const pos = data[j];
            if (inRange(pos, listener.hitBox)) {
              newData.push(pos);
            }
          }
          if (newData.length > 0) {
            isHit = true;
          }
        } else {
          newData = data;
          if (inRange(data, listener.hitBox)) {
            isHit = true;
          }
        }
        if (isHit) {
          if (clickStatus === "down") {
            listener.clickDown = true;
          } else {
            listener.clickDown = false;
            listener.fn(newData, listener.customData);
          }
        }
      } else {
        listener.fn(data, listener.customData);
      }
    }
  }

  // src/index.js
  var VERSION = "2.0.0-alpha.2";
  var api = {
    "version": VERSION
  };
  var mods = [
    utils_exports,
    state_settings_exports,
    screen_manager_exports,
    plugins_exports,
    renderer_webgl2_exports,
    renderer_canvas2d_exports,
    pens_exports,
    colors_exports,
    graphics_api_exports,
    pixels_exports,
    images_exports,
    events_exports
  ];
  for (const mod of mods) {
    if (mod.init) {
      mod.init(api);
    }
  }
  processCommands(api);
  if (typeof window !== "undefined") {
    window.pi = api;
    if (window.$ === void 0) {
      window.$ = api;
    }
  }
  var index_default = api;
})();
/**
 * Pi.js - Main Entry Point
 * 
 * Graphics and sound library for retro-style games and demos.
 * 
 * @module pi.js
 * @author Andy Stubbs
 * @license Apache-2.0
 */
//# sourceMappingURL=pi.js.map
