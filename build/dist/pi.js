/**
 * Pi.js - Graphics and Sound Library
 * @version 2.0.0-alpha.1
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
var Pi = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default,
    pi: () => pi
  });

  // src/core/errors.js
  var ErrorMode = Object.freeze({
    "LOG": "log",
    "THROW": "throw",
    "NONE": "none"
  });
  var currentErrorMode = ErrorMode.LOG;
  function logError(msg) {
    if (currentErrorMode === ErrorMode.LOG) {
      console.error(msg);
    } else if (currentErrorMode === ErrorMode.THROW) {
      throw new Error(msg);
    }
  }

  // src/core/pi-data.js
  var piData = {
    "nextScreenId": 0,
    "screens": {},
    "activeScreen": null,
    "images": {},
    "imageCount": 0,
    "defaultPrompt": String.fromCharCode(219),
    "defaultFont": {},
    "nextFontId": 0,
    "fonts": {},
    "defaultPalette": [],
    "defaultColor": 7,
    "commands": {},
    "screenCommands": {},
    "defaultPenDraw": null,
    "pens": {},
    "penList": [],
    "blendCommands": {},
    "blendCommandsList": [],
    "defaultBlendCmd": null,
    "settings": {},
    "settingsList": [],
    "volume": 0.75,
    "log": logError,
    "isTouchScreen": false,
    "defaultInputFocus": typeof window !== "undefined" ? window : null
  };

  // src/modules/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    binarySearch: () => binarySearch,
    cToHex: () => cToHex,
    canAddEventListeners: () => canAddEventListeners,
    checkColor: () => checkColor,
    clamp: () => clamp,
    colorStringToColor: () => colorStringToColor,
    colorStringToHex: () => colorStringToHex,
    compareColors: () => compareColors,
    convertToArray: () => convertToArray,
    convertToColor: () => convertToColor,
    copyProperties: () => copyProperties,
    dataToHex: () => dataToHex,
    degreesToRadian: () => degreesToRadian,
    deleteProperties: () => deleteProperties,
    getInt: () => getInt,
    getWindowSize: () => getWindowSize,
    hexToColor: () => hexToColor,
    hexToData: () => hexToData,
    inRange: () => inRange,
    inRange2: () => inRange2,
    isArray: () => isArray,
    isDomElement: () => isDomElement,
    isFunction: () => isFunction,
    isInteger: () => isInteger,
    math: () => math,
    pad: () => pad,
    padL: () => padL,
    padR: () => padR,
    queueMicrotask: () => queueMicrotask,
    radiansToDegrees: () => radiansToDegrees,
    rgbToColor: () => rgbToColor,
    rgbToHex: () => rgbToHex,
    rndRange: () => rndRange
  });
  var isFunction = (fn) => typeof fn === "function";
  var isDomElement = (el) => el instanceof Element;
  var isArray = Array.isArray;
  var isInteger = Number.isInteger;
  var canAddEventListeners = (el) => {
    return typeof el.addEventListener === "function" && typeof el.removeEventListener === "function";
  };
  function hexToColor(hex) {
    let r, g, b, a, s2;
    s2 = hex;
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
      s2 = hex.slice(0, 7);
      a = parseInt(hex.slice(7, 9), 16);
    } else {
      a = 255;
    }
    return {
      "r": r,
      "g": g,
      "b": b,
      "a": a,
      "s": `rgba(${r},${g},${b},${Math.round(a / 255 * 1e3) / 1e3})`,
      "s2": s2
    };
  }
  function cToHex(c) {
    if (!isInteger(c)) {
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
  function rgbToColor(r, g, b, a) {
    return hexToColor(rgbToHex(r, g, b, a));
  }
  function colorStringToColor(colorStr) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { "willReadFrequently": true });
    context.fillStyle = colorStr;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    return rgbToColor(data[0], data[1], data[2], data[3]);
  }
  function colorStringToHex(colorStr) {
    return colorStringToColor(colorStr).s2;
  }
  function splitRgb(s) {
    s = s.slice(s.indexOf("(") + 1, s.indexOf(")"));
    const parts = s.split(",");
    const colors = [];
    for (let i = 0; i < parts.length; i++) {
      let val;
      if (i === 3) {
        val = parseFloat(parts[i].trim()) * 255;
      } else {
        val = parseInt(parts[i].trim());
      }
      colors.push(val);
    }
    return colors;
  }
  function convertToColor(color) {
    if (color === void 0) {
      return null;
    }
    if (isArray(color) && color.length > 2) {
      return rgbToColor(color[0], color[1], color[2], color[3]);
    }
    if (isInteger(color?.r) && isInteger(color?.g) && isInteger(color?.b)) {
      return rgbToColor(color.r, color.g, color.b, color.a);
    }
    if (typeof color !== "string") {
      return null;
    }
    const checkHexColor = /(^#[0-9A-F]{8}$)|(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
    if (checkHexColor.test(color)) {
      return hexToColor(color);
    }
    if (color.indexOf("rgb") === 0) {
      const rgbParts = splitRgb(color);
      if (rgbParts.length < 3) {
        return null;
      }
      return rgbToColor(rgbParts[0], rgbParts[1], rgbParts[2], rgbParts[3]);
    }
    return colorStringToColor(color);
  }
  function checkColor(strColor) {
    const s = new Option().style;
    s.color = strColor;
    return s.color !== "";
  }
  function compareColors(color1, color2) {
    return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b && color1.a === color2.a;
  }
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
  function dataToHex(data) {
    let hex = "";
    let digits = "";
    for (let y = 0; y < data.length; y++) {
      for (let x = 0; x < data[y].length; x++) {
        digits += data[y][x];
        if (digits.length === 4) {
          hex += parseInt(digits, 2).toString(16);
          digits = "";
        }
      }
    }
    return hex;
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
  function padR(str, len, c) {
    if (typeof c !== "string") {
      c = " ";
    }
    str = str + "";
    for (let i = str.length; i < len; i++) {
      str += c;
    }
    return str;
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
      str = str.substr(0, len);
    }
    return str;
  }
  function copyProperties(dest, src) {
    for (const prop in src) {
      if (src.hasOwnProperty(prop)) {
        dest[prop] = src[prop];
      }
    }
  }
  function convertToArray(src) {
    const arr = [];
    for (const prop in src) {
      if (src.hasOwnProperty(prop)) {
        arr.push(src[prop]);
      }
    }
    return arr;
  }
  function deleteProperties(obj) {
    for (const prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        delete obj[prop];
      }
    }
  }
  function getWindowSize() {
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    return { "width": width, "height": height };
  }
  function binarySearch(data, search, compareFn) {
    let m = 0;
    let n = data.length - 1;
    while (m <= n) {
      const k = n + m >> 1;
      const result = compareFn(search, data[k], k);
      if (result > 0) {
        m = k + 1;
      } else if (result < 0) {
        n = k - 1;
      } else {
        return k;
      }
    }
    return -m - 1;
  }
  function getInt(val, def) {
    val = parseInt(val);
    if (isNaN(val)) {
      val = def;
    }
    return val;
  }
  var math = Object.freeze({
    "deg30": Math.PI / 6,
    "deg45": Math.PI / 4,
    "deg60": Math.PI / 3,
    "deg90": Math.PI / 2,
    "deg120": 2 * Math.PI / 3,
    "deg135": 3 * Math.PI / 4,
    "deg150": 5 * Math.PI / 6,
    "deg180": Math.PI,
    "deg210": 7 * Math.PI / 6,
    "deg225": 5 * Math.PI / 4,
    "deg240": 4 * Math.PI / 3,
    "deg270": 3 * Math.PI / 2,
    "deg300": 5 * Math.PI / 3,
    "deg315": 7 * Math.PI / 4,
    "deg330": 11 * Math.PI / 6,
    "deg360": Math.PI * 2
  });
  var queueMicrotask = window.queueMicrotask || ((callback) => setTimeout(callback, 0));

  // src/index.js
  var VERSION = "2.0.0-alpha.1";
  var pi = {
    "version": VERSION,
    "_": {
      "data": piData
    },
    "util": utils_exports
  };
  if (typeof window !== "undefined") {
    window.pi = pi;
  }
  var index_default = pi;
  return __toCommonJS(index_exports);
})();
/**
 * Pi.js - Main Entry Point
 * 
 * Graphics and sound library for retro-style games and demos.
 * Modernized architecture with legacy API compatibility.
 * 
 * @module pi.js
 * @author Andy Stubbs
 * @license Apache-2.0
 */
//# sourceMappingURL=pi.js.map
