/**
 * Pi.js - Graphics and Sound Library
 * @version 2.0.0-alpha.1
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
  "isTouchScreen": false,
  "defaultInputFocus": typeof window !== "undefined" ? window : null
};
var commandList = [];

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
var isFunction = /* @__PURE__ */ __name((fn) => typeof fn === "function", "isFunction");
var isDomElement = /* @__PURE__ */ __name((el) => el instanceof Element, "isDomElement");
var isArray = Array.isArray;
var isInteger = Number.isInteger;
var canAddEventListeners = /* @__PURE__ */ __name((el) => {
  return typeof el.addEventListener === "function" && typeof el.removeEventListener === "function";
}, "canAddEventListeners");
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
__name(hexToColor, "hexToColor");
function cToHex(c) {
  if (!isInteger(c)) {
    c = Math.round(c);
  }
  c = clamp(c, 0, 255);
  const hex = Number(c).toString(16);
  return hex.length < 2 ? "0" + hex : hex.toUpperCase();
}
__name(cToHex, "cToHex");
function rgbToHex(r, g, b, a) {
  if (isNaN(a)) {
    a = 255;
  }
  return "#" + cToHex(r) + cToHex(g) + cToHex(b) + cToHex(a);
}
__name(rgbToHex, "rgbToHex");
function rgbToColor(r, g, b, a) {
  return hexToColor(rgbToHex(r, g, b, a));
}
__name(rgbToColor, "rgbToColor");
function colorStringToColor(colorStr) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { "willReadFrequently": true });
  context.fillStyle = colorStr;
  context.fillRect(0, 0, 1, 1);
  const data = context.getImageData(0, 0, 1, 1).data;
  return rgbToColor(data[0], data[1], data[2], data[3]);
}
__name(colorStringToColor, "colorStringToColor");
function colorStringToHex(colorStr) {
  return colorStringToColor(colorStr).s2;
}
__name(colorStringToHex, "colorStringToHex");
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
__name(splitRgb, "splitRgb");
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
__name(convertToColor, "convertToColor");
function checkColor(strColor) {
  const s = new Option().style;
  s.color = strColor;
  return s.color !== "";
}
__name(checkColor, "checkColor");
function compareColors(color1, color2) {
  return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b && color1.a === color2.a;
}
__name(compareColors, "compareColors");
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
__name(hexToData, "hexToData");
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
__name(dataToHex, "dataToHex");
function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}
__name(clamp, "clamp");
function inRange(point, hitBox) {
  return point.x >= hitBox.x && point.x < hitBox.x + hitBox.width && point.y >= hitBox.y && point.y < hitBox.y + hitBox.height;
}
__name(inRange, "inRange");
function inRange2(x1, y1, x2, y2, width, height) {
  return x1 >= x2 && x1 < x2 + width && y1 >= y2 && y1 < y2 + height;
}
__name(inRange2, "inRange2");
function rndRange(min, max) {
  return Math.random() * (max - min) + min;
}
__name(rndRange, "rndRange");
function degreesToRadian(deg) {
  return deg * (Math.PI / 180);
}
__name(degreesToRadian, "degreesToRadian");
function radiansToDegrees(rad) {
  return rad * (180 / Math.PI);
}
__name(radiansToDegrees, "radiansToDegrees");
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
__name(padL, "padL");
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
__name(padR, "padR");
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
__name(pad, "pad");
function copyProperties(dest, src) {
  for (const prop in src) {
    if (src.hasOwnProperty(prop)) {
      dest[prop] = src[prop];
    }
  }
}
__name(copyProperties, "copyProperties");
function convertToArray(src) {
  const arr = [];
  for (const prop in src) {
    if (src.hasOwnProperty(prop)) {
      arr.push(src[prop]);
    }
  }
  return arr;
}
__name(convertToArray, "convertToArray");
function deleteProperties(obj) {
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      delete obj[prop];
    }
  }
}
__name(deleteProperties, "deleteProperties");
function getWindowSize() {
  const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  return { "width": width, "height": height };
}
__name(getWindowSize, "getWindowSize");
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
__name(binarySearch, "binarySearch");
function getInt(val, def) {
  val = parseInt(val);
  if (isNaN(val)) {
    val = def;
  }
  return val;
}
__name(getInt, "getInt");
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
var queueMicrotask = /* @__PURE__ */ __name((callback) => {
  if (window.queueMicrotask) {
    window.queueMicrotask(callback);
  } else {
    setTimeout(callback, 0);
  }
}, "queueMicrotask");

// src/core/command-system.js
function addCommand(name, fn, isInternal, isScreen, parameters, isSet) {
  piData.commands[name] = fn;
  if (!isInternal) {
    commandList.push({
      "name": name,
      "fn": fn,
      "isScreen": isScreen,
      "parameters": parameters || [],
      "isSet": isSet,
      "noParse": isSet
    });
  }
}
__name(addCommand, "addCommand");
function addCommands(name, fnPx, fnAa, parameters) {
  addCommand(name, function(screenData, args) {
    if (screenData.pixelMode) {
      fnPx(screenData, args);
    } else {
      fnAa(screenData, args);
    }
  }, false, true, parameters);
}
__name(addCommands, "addCommands");
function addSetting(name, fn, isScreen, parameters) {
  piData.settings[name] = {
    "name": name,
    "fn": fn,
    "isScreen": isScreen,
    "parameters": parameters || []
  };
  piData.settingsList.push(name);
}
__name(addSetting, "addSetting");
function parseOptions(cmd, args) {
  if (cmd.noParse) {
    return args;
  }
  if (args.length > 0 && typeof args[0] === "object" && args[0] !== null && !args[0].hasOwnProperty("screen") && !isArray(args[0]) && !isDomElement(args[0])) {
    const options = args[0];
    const args2 = [];
    let foundParameter = false;
    for (let i = 0; i < cmd.parameters.length; i++) {
      if (options.hasOwnProperty(cmd.parameters[i])) {
        args2.push(options[cmd.parameters[i]]);
        foundParameter = true;
      } else {
        args2.push(null);
      }
    }
    if (foundParameter) {
      return args2;
    }
  }
  return args;
}
__name(parseOptions, "parseOptions");
function addPen(name, fn, cap) {
  piData.penList.push(name);
  piData.pens[name] = {
    "cmd": fn,
    "cap": cap
  };
}
__name(addPen, "addPen");
function addBlendCommand(name, fn) {
  piData.blendCommandsList.push(name);
  piData.blendCommands[name] = fn;
}
__name(addBlendCommand, "addBlendCommand");
function processCommands(api) {
  commandList.sort((a, b) => {
    const nameA = a.name.toUpperCase();
    const nameB = b.name.toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });
  for (const cmd of commandList) {
    processCommand(api, cmd);
  }
}
__name(processCommands, "processCommands");
function processCommand(api, cmd) {
  if (cmd.isSet) {
    piData.screenCommands[cmd.name] = cmd;
    api[cmd.name] = function(...args) {
      const parsedArgs = parseOptions(cmd, args);
      return piData.commands[cmd.name](null, parsedArgs);
    };
    return;
  }
  if (cmd.isScreen) {
    piData.screenCommands[cmd.name] = cmd;
    api[cmd.name] = function(...args) {
      const parsedArgs = parseOptions(cmd, args);
      const screenData = getScreenData(void 0, cmd.name);
      if (screenData !== false) {
        return piData.commands[cmd.name](screenData, parsedArgs);
      }
    };
  } else {
    api[cmd.name] = function(...args) {
      const parsedArgs = parseOptions(cmd, args);
      return piData.commands[cmd.name](parsedArgs);
    };
  }
}
__name(processCommand, "processCommand");
function getScreenData(screenId, commandName) {
  if (piData.activeScreen === null) {
    if (commandName === "set") {
      return false;
    }
    const error = new Error(`${commandName}: No screens available for command.`);
    error.code = "NO_SCREEN";
    throw error;
  }
  if (screenId === void 0 || screenId === null) {
    screenId = piData.activeScreen.id;
  }
  if (isInteger(screenId) && !piData.screens[screenId]) {
    const error = new Error(`${commandName}: Invalid screen id.`);
    error.code = "INVALID_SCREEN_ID";
    throw error;
  }
  return piData.screens[screenId];
}
__name(getScreenData, "getScreenData");

// src/modules/core-commands.js
function init(pi2) {
  const piData2 = pi2._.data;
  pi2._.addCommand("setScreen", setScreen, false, false, ["screen"]);
  pi2._.addSetting("screen", setScreen, false, ["screen"]);
  function setScreen(args) {
    const screenObj = args[0];
    let screenId;
    if (pi2.util.isInteger(screenObj)) {
      screenId = screenObj;
    } else if (screenObj && pi2.util.isInteger(screenObj.id)) {
      screenId = screenObj.id;
    }
    if (!piData2.screens[screenId]) {
      const error = new Error("screen: Invalid screen.");
      error.code = "INVALID_SCREEN";
      throw error;
    }
    piData2.activeScreen = piData2.screens[screenId];
  }
  __name(setScreen, "setScreen");
  pi2._.addCommand("removeAllScreens", removeAllScreens, false, false, []);
  function removeAllScreens() {
    for (const i in piData2.screens) {
      const screenData = piData2.screens[i];
      screenData.screenObj.removeScreen();
    }
    piData2.nextScreenId = 0;
  }
  __name(removeAllScreens, "removeAllScreens");
  pi2._.addCommand("getScreen", getScreen, false, false, ["screenId"]);
  function getScreen(args) {
    const screenId = args[0];
    const screen = getScreenData(screenId, "getScreen");
    return screen.screenObj;
  }
  __name(getScreen, "getScreen");
  pi2._.addCommand("setDefaultColor", setDefaultColor, false, false, ["color"]);
  pi2._.addSetting("defaultColor", setDefaultColor, false, ["color"]);
  function setDefaultColor(args) {
    let c = args[0];
    if (!isNaN(Number(c)) && piData2.defaultPalette.length > c) {
      piData2.defaultColor = c;
    } else {
      c = pi2.util.convertToColor(c);
      if (c === null) {
        const error = new TypeError(
          "setDefaultColor: invalid color value for parameter color."
        );
        error.code = "INVALID_COLOR";
        throw error;
      }
      piData2.defaultColor = c;
    }
  }
  __name(setDefaultColor, "setDefaultColor");
  pi2._.addCommand("setDefaultPal", setDefaultPal, false, false, ["pal"]);
  pi2._.addSetting("defaultPal", setDefaultPal, false, ["pal"]);
  function setDefaultPal(args) {
    const pal = args[0];
    if (!pi2.util.isArray(pal)) {
      const error = new TypeError("setDefaultPal: parameter pal is not an array.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (pal.length < 1) {
      const error = new RangeError(
        "setDefaultPal: parameter pal must have at least one color value."
      );
      error.code = "EMPTY_PALETTE";
      throw error;
    }
    piData2.defaultPalette = [];
    if (pal.length > 1) {
      piData2.defaultColor = 1;
    } else {
      piData2.defaultColor = 0;
    }
    for (let i = 0; i < pal.length; i++) {
      const c = pi2.util.convertToColor(pal[i]);
      if (c === null) {
        console.warn("setDefaultPal: invalid color value inside array pal.");
        piData2.defaultPalette.push(pi2.util.convertToColor("#000000"));
      } else {
        piData2.defaultPalette.push(c);
      }
    }
    const firstColor = piData2.defaultPalette[0];
    piData2.defaultPalette[0] = pi2.util.convertToColor([
      firstColor.r,
      firstColor.g,
      firstColor.b,
      0
    ]);
  }
  __name(setDefaultPal, "setDefaultPal");
  pi2._.addCommand("getDefaultPal", getDefaultPal, false, false, []);
  function getDefaultPal() {
    const colors = [];
    for (const color of piData2.defaultPalette) {
      colors.push(color);
    }
    return colors;
  }
  __name(getDefaultPal, "getDefaultPal");
  pi2._.addCommand("setDefaultInputFocus", setDefaultInputFocus, false, false, ["element"]);
  pi2._.addSetting("defaultInputFocus", setDefaultInputFocus, false, ["element"]);
  function setDefaultInputFocus(args) {
    let element = args[0];
    if (typeof element === "string") {
      element = document.getElementById(element);
    }
    if (!element || !pi2.util.canAddEventListeners(element)) {
      const error = new TypeError(
        "setDefaultInputFocus: Invalid argument element. Element must be a DOM element or string id of a DOM element."
      );
      error.code = "INVALID_ELEMENT";
      throw error;
    }
    if (!(element.tabIndex >= 0)) {
      element.tabIndex = 0;
    }
    piData2.defaultInputFocus = element;
    if (piData2.commands["reinitKeyboard"]) {
      piData2.commands["reinitKeyboard"]();
    }
  }
  __name(setDefaultInputFocus, "setDefaultInputFocus");
  pi2._.addCommand("set", set, false, true, piData2.settingsList, true);
  function set(screenData, args) {
    const options = args[0];
    for (const optionName in options) {
      if (piData2.settings[optionName]) {
        const setting = piData2.settings[optionName];
        let optionValues = options[optionName];
        if (!pi2.util.isArray(optionValues) && typeof optionValues === "object") {
          optionValues = pi2._.parseOptions(setting, [optionValues]);
        } else {
          optionValues = [optionValues];
        }
        if (setting.isScreen) {
          if (!screenData) {
            screenData = getScreenData(void 0, `set ${setting.name}`);
          }
          setting.fn(screenData, optionValues);
        } else {
          setting.fn(optionValues);
        }
      }
    }
  }
  __name(set, "set");
}
__name(init, "init");

// src/modules/screen-helper.js
function init2(pi2) {
  const piData2 = pi2._.data;
  pi2._.addBlendCommand("normal", normalBlend);
  function normalBlend(screenData, x, y, c) {
    const data = screenData.imageData.data;
    const i = (screenData.width * y + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = c.a;
  }
  __name(normalBlend, "normalBlend");
  pi2._.addBlendCommand("blend", blendPixel);
  function blendPixel(screenData, x, y, c) {
    const data = screenData.imageData.data;
    const i = (screenData.width * y + x) * 4;
    const pct = c.a / 255;
    const pct2 = (255 - c.a) / 255;
    data[i] = c.r * pct + data[i] * pct2;
    data[i + 1] = c.g * pct + data[i + 1] * pct2;
    data[i + 2] = c.b * pct + data[i + 2] * pct2;
  }
  __name(blendPixel, "blendPixel");
  pi2._.addCommand("getImageData", getImageData, true, false);
  function getImageData(screenData) {
    if (screenData.dirty === false || screenData.imageData === null) {
      screenData.imageData = screenData.context.getImageData(
        0,
        0,
        screenData.width,
        screenData.height
      );
    }
  }
  __name(getImageData, "getImageData");
  pi2._.addCommand("resetImageData", resetImageData, true, false);
  function resetImageData(screenData) {
    screenData.imageData = null;
  }
  __name(resetImageData, "resetImageData");
  pi2._.addCommand("setImageDirty", setImageDirty, true, false);
  function setImageDirty(screenData) {
    if (screenData.dirty === false) {
      screenData.dirty = true;
      if (screenData.isAutoRender && !screenData.autoRenderMicrotaskScheduled) {
        screenData.autoRenderMicrotaskScheduled = true;
        pi2.util.queueMicrotask(function() {
          if (screenData.screenObj && screenData.isAutoRender) {
            screenData.screenObj.render();
          }
          screenData.autoRenderMicrotaskScheduled = false;
        });
      }
    }
  }
  __name(setImageDirty, "setImageDirty");
  pi2._.addCommand("setPixel", setPixel, true, false);
  function setPixel(screenData, x, y, c) {
    screenData.blendPixelCmd(screenData, x, y, c);
  }
  __name(setPixel, "setPixel");
  pi2._.addCommand("setPixelSafe", setPixelSafe, true, false);
  pi2._.addPen("pixel", setPixelSafe, "square");
  function setPixelSafe(screenData, x, y, c) {
    if (x < 0 || x >= screenData.width || y < 0 || y >= screenData.height) {
      return;
    }
    piData2.commands.getImageData(screenData);
    c = getPixelColor(screenData, c);
    screenData.blendPixelCmd(screenData, x, y, c);
    piData2.commands.setImageDirty(screenData);
  }
  __name(setPixelSafe, "setPixelSafe");
  pi2._.addCommand("getPixelColor", getPixelColor, true, false);
  function getPixelColor(screenData, c) {
    const noise = screenData.pen.noise;
    if (!noise) {
      return c;
    }
    const c2 = { "r": c.r, "g": c.g, "b": c.b, "a": c.a };
    const half = noise / 2;
    if (pi2.util.isArray(noise)) {
      c2.r = pi2.util.clamp(
        Math.round(c2.r + pi2.util.rndRange(-noise[0], noise[0])),
        0,
        255
      );
      c2.g = pi2.util.clamp(
        Math.round(c2.g + pi2.util.rndRange(-noise[1], noise[1])),
        0,
        255
      );
      c2.b = pi2.util.clamp(
        Math.round(c2.b + pi2.util.rndRange(-noise[2], noise[2])),
        0,
        255
      );
      c2.a = pi2.util.clamp(
        c2.a + pi2.util.rndRange(-noise[3], noise[3]),
        0,
        255
      );
    } else {
      const change = Math.round(Math.random() * noise - half);
      c2.r = pi2.util.clamp(c2.r + change, 0, 255);
      c2.g = pi2.util.clamp(c2.g + change, 0, 255);
      c2.b = pi2.util.clamp(c2.b + change, 0, 255);
    }
    return c2;
  }
  __name(getPixelColor, "getPixelColor");
  pi2._.addCommand("drawSquarePen", drawSquarePen, true, false);
  pi2._.addPen("square", drawSquarePen, "square");
  function drawSquarePen(screenData, x, y, c) {
    const size = screenData.pen.size * 2 - 1;
    const offset = Math.round(size / 2) - 1;
    for (let y2 = 0; y2 < size; y2++) {
      for (let x2 = 0; x2 < size; x2++) {
        piData2.commands.setPixelSafe(
          screenData,
          x2 + x - offset,
          y2 + y - offset,
          c
        );
      }
    }
    piData2.commands.setImageDirty(screenData);
  }
  __name(drawSquarePen, "drawSquarePen");
  pi2._.addCommand("drawCirclePen", drawCirclePen, true, false);
  pi2._.addPen("circle", drawCirclePen, "round");
  function drawCirclePen(screenData, x, y, c) {
    if (screenData.pen.size === 2) {
      piData2.commands.setPixelSafe(screenData, x, y, c);
      piData2.commands.setPixelSafe(screenData, x + 1, y, c);
      piData2.commands.setPixelSafe(screenData, x - 1, y, c);
      piData2.commands.setPixelSafe(screenData, x, y + 1, c);
      piData2.commands.setPixelSafe(screenData, x, y - 1, c);
      piData2.commands.setImageDirty(screenData);
      return;
    }
    const size = screenData.pen.size * 2;
    const half = screenData.pen.size;
    const offset = half - 1;
    for (let y2 = 0; y2 < size; y2++) {
      for (let x2 = 0; x2 < size; x2++) {
        const x3 = x2 - offset;
        const y3 = y2 - offset;
        const r = Math.round(Math.sqrt(x3 * x3 + y3 * y3));
        if (r < half) {
          piData2.commands.setPixelSafe(screenData, x3 + x, y3 + y, c);
        }
      }
    }
    piData2.commands.setImageDirty(screenData);
  }
  __name(drawCirclePen, "drawCirclePen");
  pi2._.addCommand("getPixelInternal", getPixelInternal, true, false);
  function getPixelInternal(screenData, x, y) {
    const data = screenData.imageData.data;
    const i = (screenData.width * y + x) * 4;
    return {
      "r": data[i],
      "g": data[i + 1],
      "b": data[i + 2],
      "a": data[i + 3]
    };
  }
  __name(getPixelInternal, "getPixelInternal");
  pi2._.addCommand("getPixelSafe", getPixelSafe, true, false);
  function getPixelSafe(screenData, x, y) {
    piData2.commands.getImageData(screenData);
    return getPixelInternal(screenData, x, y);
  }
  __name(getPixelSafe, "getPixelSafe");
  pi2._.addCommand("findColorValue", findColorValue, true, false);
  function findColorValue(screenData, colorInput, commandName) {
    let colorValue;
    if (pi2.util.isInteger(colorInput)) {
      if (colorInput > screenData.pal.length) {
        const error = new RangeError(
          `${commandName}: parameter color is not a color in the palette.`
        );
        error.code = "COLOR_OUT_OF_RANGE";
        throw error;
      }
      colorValue = screenData.pal[colorInput];
    } else {
      colorValue = pi2.util.convertToColor(colorInput);
      if (colorValue === null) {
        const error = new TypeError(
          `${commandName}: parameter color is not a valid color format.`
        );
        error.code = "INVALID_COLOR";
        throw error;
      }
    }
    return colorValue;
  }
  __name(findColorValue, "findColorValue");
  piData2.defaultPenDraw = setPixelSafe;
  piData2.defaultBlendCmd = normalBlend;
}
__name(init2, "init");

// src/modules/screen.js
function init3(pi2) {
  const piData2 = pi2._.data;
  pi2._.addCommand(
    "screen",
    screen,
    false,
    false,
    [
      "aspect",
      "container",
      "isOffscreen",
      "willReadFrequently",
      "noStyles",
      "isMultiple",
      "resizeCallback"
    ]
  );
  function screen(args) {
    const aspect = args[0];
    const container = args[1];
    const isOffscreen = args[2];
    const willReadFrequently = !!args[3];
    const noStyles = args[4];
    const isMultiple = args[5];
    const resizeCallback = args[6];
    let aspectData;
    if (resizeCallback != null && !pi2.util.isFunction(resizeCallback)) {
      const error = new TypeError("screen: resizeCallback must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    if (typeof aspect === "string" && aspect !== "") {
      aspectData = parseAspect(aspect.toLowerCase());
      if (!aspectData) {
        const error = new Error("screen: invalid value for aspect.");
        error.code = "INVALID_ASPECT";
        throw error;
      }
      aspectData.isMultiple = !!isMultiple;
    }
    let screenData;
    if (isOffscreen) {
      if (!aspectData) {
        const error = new Error(
          "screen: You must supply an aspect ratio with exact dimensions for offscreen screens."
        );
        error.code = "NO_ASPECT_OFFSCREEN";
        throw error;
      }
      if (aspectData.splitter !== "x") {
        const error = new Error(
          "screen: You must use aspect ratio with e(x)act pixel dimensions such as 320x200 for offscreen screens."
        );
        error.code = "INVALID_OFFSCREEN_ASPECT";
        throw error;
      }
      screenData = createOffscreenScreen(aspectData, willReadFrequently);
    } else {
      let containerEl = container;
      if (typeof container === "string") {
        containerEl = document.getElementById(container);
      }
      if (containerEl && !pi2.util.isDomElement(containerEl)) {
        const error = new TypeError(
          "screen: Invalid argument container. Container must be a DOM element or a string id of a DOM element."
        );
        error.code = "INVALID_CONTAINER";
        throw error;
      }
      if (noStyles) {
        screenData = createNoStyleScreen(aspectData, containerEl, willReadFrequently);
      } else {
        screenData = createScreen(
          aspectData,
          containerEl,
          resizeCallback,
          willReadFrequently
        );
      }
    }
    screenData.cache = { "findColor": {} };
    const screenObj = {};
    screenData.commands = {};
    for (const cmdName in piData2.screenCommands) {
      const commandData = piData2.screenCommands[cmdName];
      screenData.commands[cmdName] = commandData.fn;
      setupApiCommand(screenObj, cmdName, screenData, commandData);
    }
    screenData.screenObj = screenObj;
    screenObj.id = screenData.id;
    screenObj.screen = true;
    return screenObj;
  }
  __name(screen, "screen");
  function setupApiCommand(screenObj, name, screenData, cmd) {
    screenObj[name] = function(...args) {
      const parsedArgs = pi2._.parseOptions(cmd, args);
      return screenData.commands[name](screenData, parsedArgs);
    };
  }
  __name(setupApiCommand, "setupApiCommand");
  function parseAspect(aspect) {
    let width, height, parts, splitter;
    if (aspect.indexOf(":") > -1) {
      splitter = ":";
    } else if (aspect.indexOf("x") > -1) {
      splitter = "x";
    } else if (aspect.indexOf("e") > -1) {
      splitter = "e";
    } else {
      return null;
    }
    parts = aspect.split(splitter);
    width = Number(parts[0]);
    if (isNaN(width) || width === 0) {
      return null;
    }
    height = Number(parts[1]);
    if (isNaN(height) || height === 0) {
      return null;
    }
    return {
      "width": width,
      "height": height,
      "splitter": splitter
    };
  }
  __name(parseAspect, "parseAspect");
  function createOffscreenScreen(aspectData, willReadFrequently) {
    const canvas = document.createElement("canvas");
    canvas.width = aspectData.width;
    canvas.height = aspectData.height;
    const bufferCanvas = document.createElement("canvas");
    bufferCanvas.width = aspectData.width;
    bufferCanvas.height = aspectData.height;
    return createScreenData(
      canvas,
      bufferCanvas,
      null,
      aspectData,
      true,
      false,
      null,
      willReadFrequently
    );
  }
  __name(createOffscreenScreen, "createOffscreenScreen");
  function createScreen(aspectData, container, resizeCallback, willReadFrequently) {
    const canvas = document.createElement("canvas");
    const bufferCanvas = document.createElement("canvas");
    canvas.style.backgroundColor = "black";
    canvas.style.position = "absolute";
    canvas.style.imageRendering = "pixelated";
    canvas.style.imageRendering = "crisp-edges";
    let isContainer = true;
    if (!pi2.util.isDomElement(container)) {
      isContainer = false;
      document.documentElement.style.height = "100%";
      document.documentElement.style.margin = "0";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
      canvas.style.left = "0";
      canvas.style.top = "0";
      container = document.body;
    }
    if (container.offsetHeight === 0) {
      container.style.height = "200px";
    }
    container.appendChild(canvas);
    if (aspectData) {
      const size = getSize(container);
      setCanvasSize(aspectData, canvas, size.width, size.height);
      bufferCanvas.width = canvas.width;
      bufferCanvas.height = canvas.height;
    } else {
      if (isContainer) {
        canvas.style.position = "static";
      }
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      const size = getSize(canvas);
      canvas.width = size.width;
      canvas.height = size.height;
      bufferCanvas.width = size.width;
      bufferCanvas.height = size.height;
    }
    return createScreenData(
      canvas,
      bufferCanvas,
      container,
      aspectData,
      false,
      false,
      resizeCallback,
      willReadFrequently
    );
  }
  __name(createScreen, "createScreen");
  function createNoStyleScreen(aspectData, container, willReadFrequently) {
    const canvas = document.createElement("canvas");
    const bufferCanvas = document.createElement("canvas");
    if (!pi2.util.isDomElement(container)) {
      container = document.body;
    }
    container.appendChild(canvas);
    if (aspectData && aspectData.splitter === "x") {
      canvas.width = aspectData.width;
      canvas.height = aspectData.height;
      bufferCanvas.width = canvas.width;
      bufferCanvas.height = canvas.height;
    } else {
      const size = getSize(canvas);
      bufferCanvas.width = size.width;
      bufferCanvas.height = size.height;
    }
    return createScreenData(
      canvas,
      bufferCanvas,
      container,
      aspectData,
      false,
      true,
      null,
      willReadFrequently
    );
  }
  __name(createNoStyleScreen, "createNoStyleScreen");
  function createScreenData(canvas, bufferCanvas, container, aspectData, isOffscreen, isNoStyles, resizeCallback, willReadFrequently) {
    const screenData = {};
    screenData.id = piData2.nextScreenId;
    piData2.nextScreenId += 1;
    piData2.activeScreen = screenData;
    canvas.dataset.screenId = screenData.id;
    if (willReadFrequently) {
      screenData.contextAttributes = { "willReadFrequently": true };
    } else {
      screenData.contextAttributes = {};
    }
    screenData.canvas = canvas;
    screenData.width = canvas.width;
    screenData.height = canvas.height;
    screenData.container = container;
    screenData.aspectData = aspectData;
    screenData.isOffscreen = isOffscreen;
    screenData.isNoStyles = isNoStyles;
    screenData.context = canvas.getContext("2d", screenData.contextAttributes);
    screenData.bufferCanvas = bufferCanvas;
    screenData.bufferContext = bufferCanvas.getContext(
      "2d",
      screenData.contextAttributes
    );
    screenData.dirty = false;
    screenData.isAutoRender = true;
    screenData.autoRenderMicrotaskScheduled = false;
    screenData.imageData = null;
    screenData.x = 0;
    screenData.y = 0;
    screenData.angle = 0;
    screenData.pal = piData2.defaultPalette.slice();
    screenData.fColor = screenData.pal[piData2.defaultColor] || pi2.util.convertToColor("#FFFFFF");
    screenData.bColor = screenData.pal[0] || pi2.util.convertToColor("#000000");
    screenData.context.fillStyle = screenData.fColor.s;
    screenData.context.strokeStyle = screenData.fColor.s;
    screenData.mouseStarted = false;
    screenData.touchStarted = false;
    screenData.printCursor = {
      "x": 0,
      "y": 0,
      "font": piData2.defaultFont,
      "rows": Math.floor(canvas.height / (piData2.defaultFont.height || 14)),
      "cols": Math.floor(canvas.width / (piData2.defaultFont.width || 8)),
      "prompt": piData2.defaultPrompt,
      "breakWord": true
    };
    screenData.clientRect = canvas.getBoundingClientRect();
    screenData.mouse = {
      "x": -1,
      "y": -1,
      "buttons": 0,
      "lastX": -1,
      "lastY": -1
    };
    screenData.touches = {};
    screenData.lastTouches = {};
    screenData.pixelMode = true;
    screenData.pen = {
      "draw": piData2.defaultPenDraw,
      "size": 1,
      "noise": null
    };
    screenData.blendPixelCmd = piData2.defaultBlendCmd;
    screenData.context.imageSmoothingEnabled = false;
    screenData.onMouseEventListeners = {};
    screenData.onTouchEventListeners = {};
    screenData.onPressEventListeners = {};
    screenData.onClickEventListeners = {};
    screenData.mouseEventListenersActive = 0;
    screenData.touchEventListenersActive = 0;
    screenData.pressEventListenersActive = 0;
    screenData.clickEventListenersActive = 0;
    screenData.lastEvent = null;
    screenData.isContextMenuEnabled = true;
    screenData.resizeCallback = resizeCallback;
    piData2.screens[screenData.id] = screenData;
    return screenData;
  }
  __name(createScreenData, "createScreenData");
  function setCanvasSize(aspectData, canvas, maxWidth, maxHeight) {
    let width = aspectData.width;
    let height = aspectData.height;
    const splitter = aspectData.splitter;
    let newWidth, newHeight;
    if (aspectData.isMultiple && splitter !== ":") {
      const factorX = Math.floor(maxWidth / width);
      const factorY = Math.floor(maxHeight / height);
      let factor = factorX > factorY ? factorY : factorX;
      if (factor < 1) {
        factor = 1;
      }
      newWidth = width * factor;
      newHeight = height * factor;
      if (splitter === "e") {
        width = Math.floor(maxWidth / factor);
        height = Math.floor(maxHeight / factor);
        newWidth = width * factor;
        newHeight = height * factor;
      }
    } else {
      const ratio1 = height / width;
      const ratio2 = width / height;
      newWidth = maxHeight * ratio2;
      newHeight = maxWidth * ratio1;
      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        newHeight = newWidth * ratio1;
      } else {
        newHeight = maxHeight;
      }
      if (splitter === "e") {
        width += Math.round((maxWidth - newWidth) * (width / newWidth));
        height += Math.round((maxHeight - newHeight) * (height / newHeight));
        newWidth = maxWidth;
        newHeight = maxHeight;
      }
    }
    canvas.style.width = Math.floor(newWidth) + "px";
    canvas.style.height = Math.floor(newHeight) + "px";
    canvas.style.marginLeft = Math.floor((maxWidth - newWidth) / 2) + "px";
    canvas.style.marginTop = Math.floor((maxHeight - newHeight) / 2) + "px";
    if (splitter === "x" || splitter === "e") {
      canvas.width = width;
      canvas.height = height;
    } else {
      canvas.width = Math.floor(newWidth);
      canvas.height = Math.floor(newHeight);
    }
  }
  __name(setCanvasSize, "setCanvasSize");
  function getSize(element) {
    return {
      "width": element.offsetWidth || element.clientWidth || element.width,
      "height": element.offsetHeight || element.clientHeight || element.height
    };
  }
  __name(getSize, "getSize");
}
__name(init3, "init");

// src/modules/screen-commands.js
function init4(pi2) {
  const piData2 = pi2._.data;
  pi2._.addCommand("removeScreen", removeScreen, false, true, []);
  function removeScreen(screenData) {
    const screenId = screenData.id;
    if (screenData === piData2.activeScreen) {
      for (const i in piData2.screens) {
        if (piData2.screens[i] !== screenData) {
          piData2.activeScreen = piData2.screens[i];
          break;
        }
      }
    }
    if (screenData.screenObj.cancelInput) {
      screenData.screenObj.cancelInput();
    }
    for (const i in screenData.screenObj) {
      delete screenData.screenObj[i];
    }
    if (screenData.canvas.parentElement) {
      screenData.canvas.parentElement.removeChild(screenData.canvas);
    }
    screenData.canvas = null;
    screenData.bufferCanvas = null;
    screenData.pal = null;
    screenData.commands = null;
    screenData.context = null;
    screenData.imageData = null;
    screenData.screenObj = null;
    delete piData2.screens[screenId];
  }
  __name(removeScreen, "removeScreen");
  pi2._.addCommand("render", render, false, true, []);
  function render(screenData) {
    if (screenData.dirty === true) {
      screenData.context.putImageData(
        screenData.imageData,
        0,
        0
      );
      screenData.dirty = false;
    }
  }
  __name(render, "render");
  pi2._.addCommand("width", getWidth, false, true, []);
  function getWidth(screenData) {
    return screenData.width;
  }
  __name(getWidth, "getWidth");
  pi2._.addCommand("height", getHeight, false, true, []);
  function getHeight(screenData) {
    return screenData.height;
  }
  __name(getHeight, "getHeight");
  pi2._.addCommand("canvas", getCanvas, false, true, []);
  function getCanvas(screenData) {
    return screenData.canvas;
  }
  __name(getCanvas, "getCanvas");
  pi2._.addCommand("setBgColor", setBgColor, false, true, ["color"]);
  pi2._.addSetting("bgColor", setBgColor, true, ["color"]);
  function setBgColor(screenData, args) {
    let color = args[0];
    let bc;
    if (pi2.util.isInteger(color)) {
      bc = screenData.pal[color];
    } else {
      bc = pi2.util.convertToColor(color);
    }
    if (bc && typeof bc.s === "string") {
      screenData.canvas.style.backgroundColor = bc.s;
    } else {
      const error = new TypeError("bgColor: invalid color value for parameter c.");
      error.code = "INVALID_COLOR";
      throw error;
    }
  }
  __name(setBgColor, "setBgColor");
  pi2._.addCommand("setContainerBgColor", setContainerBgColor, false, true, ["color"]);
  pi2._.addSetting("containerBgColor", setContainerBgColor, true, ["color"]);
  function setContainerBgColor(screenData, args) {
    const color = args[0];
    let bc;
    if (screenData.container) {
      if (pi2.util.isInteger(color)) {
        bc = screenData.pal[color];
      } else {
        bc = pi2.util.convertToColor(color);
      }
      if (bc && typeof bc.s === "string") {
        screenData.container.style.backgroundColor = bc.s;
      } else {
        const error = new TypeError(
          "containerBgColor: invalid color value for parameter c."
        );
        error.code = "INVALID_COLOR";
        throw error;
      }
    }
  }
  __name(setContainerBgColor, "setContainerBgColor");
}
__name(init4, "init");

// src/modules/graphics-pixel.js
function init5(pi2) {
  const piData2 = pi2._.data;
  pi2._.addCommand("cls", cls, false, true, ["x", "y", "width", "height"]);
  function cls(screenData, args) {
    const x = pi2.util.getInt(Math.round(args[0]), 0);
    const y = pi2.util.getInt(Math.round(args[1]), 0);
    const width = pi2.util.getInt(Math.round(args[2]), screenData.width);
    const height = pi2.util.getInt(Math.round(args[3]), screenData.height);
    if (x !== 0 || y !== 0 || width !== screenData.width || height !== screenData.height) {
      screenData.screenObj.render();
      screenData.context.clearRect(x, y, width, height);
    } else {
      screenData.context.clearRect(x, y, width, height);
      screenData.imageData = null;
      screenData.printCursor.x = 0;
      screenData.printCursor.y = 0;
      screenData.x = 0;
      screenData.y = 0;
      screenData.dirty = false;
    }
    piData2.commands.resetImageData(screenData);
  }
  __name(cls, "cls");
  pi2._.addCommands("pset", pset, aaPset, ["x", "y"]);
  function pset(screenData, args) {
    let x = Math.round(args[0]);
    let y = Math.round(args[1]);
    if (!pi2.util.isInteger(x) || !pi2.util.isInteger(y)) {
      const error = new TypeError("pset: Arguments x and y must be integers.");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    screenData.x = x;
    screenData.y = y;
    if (!pi2.util.inRange2(x, y, 0, 0, screenData.width, screenData.height)) {
      return;
    }
    const color = screenData.fColor;
    piData2.commands.getImageData(screenData);
    screenData.pen.draw(screenData, x, y, color);
    piData2.commands.setImageDirty(screenData);
  }
  __name(pset, "pset");
  function aaPset(screenData, args) {
    const x = args[0];
    const y = args[1];
    if (isNaN(x) || isNaN(y)) {
      const error = new TypeError("pset: Arguments x and y must be numbers.");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    screenData.context.fillRect(x, y, 1, 1);
  }
  __name(aaPset, "aaPset");
  pi2._.addCommands("line", pxLine, aaLine, ["x1", "y1", "x2", "y2"]);
  function pxLine(screenData, args) {
    let x1 = Math.round(args[0]);
    let y1 = Math.round(args[1]);
    let x2 = Math.round(args[2]);
    let y2 = Math.round(args[3]);
    if (!pi2.util.isInteger(x1) || !pi2.util.isInteger(y1) || !pi2.util.isInteger(x2) || !pi2.util.isInteger(y2)) {
      const error = new TypeError(
        "line: Arguments x1, y1, x2, and y2 must be integers."
      );
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    const color = screenData.fColor;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    piData2.commands.getImageData(screenData);
    screenData.pen.draw(screenData, x1, y1, color);
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
      screenData.pen.draw(screenData, x1, y1, color);
    }
    piData2.commands.setImageDirty(screenData);
  }
  __name(pxLine, "pxLine");
  function aaLine(screenData, args) {
    const x1 = args[0];
    const y1 = args[1];
    const x2 = args[2];
    const y2 = args[3];
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      const error = new TypeError(
        "line: parameters x1, y1, x2, y2 must be numbers."
      );
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    screenData.screenObj.render();
    const ctx = screenData.context;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  __name(aaLine, "aaLine");
}
__name(init5, "init");

// src/index.js
var VERSION = "2.0.0-alpha.1";
var waitCount = 0;
var waiting = false;
var readyList = [];
var startReadyListTimeout = 0;
function wait() {
  waitCount++;
  waiting = true;
}
__name(wait, "wait");
function resume() {
  waitCount--;
  if (waitCount === 0) {
    startReadyList();
  }
}
__name(resume, "resume");
function startReadyList() {
  if (document.readyState !== "loading" && waitCount === 0) {
    waiting = false;
    const temp = readyList.slice();
    readyList.length = 0;
    for (const fn of temp) {
      fn();
    }
  } else {
    clearTimeout(startReadyListTimeout);
    startReadyListTimeout = setTimeout(startReadyList, 10);
  }
}
__name(startReadyList, "startReadyList");
var pi = {
  "version": VERSION,
  "_": {
    "data": piData,
    "addCommand": addCommand,
    "addCommands": addCommands,
    "addSetting": addSetting,
    "addPen": addPen,
    "addBlendCommand": addBlendCommand,
    "parseOptions": parseOptions,
    "wait": wait,
    "resume": resume
  },
  "util": utils_exports
};
addCommand("ready", ready, false, false, ["fn"]);
function ready(args) {
  const fn = args[0];
  if (isFunction(fn)) {
    if (waiting) {
      readyList.push(fn);
    } else if (document.readyState === "loading") {
      readyList.push(fn);
      clearTimeout(startReadyListTimeout);
      startReadyListTimeout = setTimeout(startReadyList, 10);
    } else {
      fn();
    }
  }
}
__name(ready, "ready");
init2(pi);
init3(pi);
init4(pi);
init5(pi);
init(pi);
processCommands(pi);
if (typeof window !== "undefined") {
  window.pi = pi;
  if (window.$ === void 0) {
    window.$ = pi;
  }
}
var index_default = pi;
export {
  index_default as default,
  pi
};
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvcmUvcGktZGF0YS5qcyIsICIuLi9zcmMvbW9kdWxlcy91dGlscy5qcyIsICIuLi9zcmMvY29yZS9jb21tYW5kLXN5c3RlbS5qcyIsICIuLi9zcmMvbW9kdWxlcy9jb3JlLWNvbW1hbmRzLmpzIiwgIi4uL3NyYy9tb2R1bGVzL3NjcmVlbi1oZWxwZXIuanMiLCAiLi4vc3JjL21vZHVsZXMvc2NyZWVuLmpzIiwgIi4uL3NyYy9tb2R1bGVzL3NjcmVlbi1jb21tYW5kcy5qcyIsICIuLi9zcmMvbW9kdWxlcy9ncmFwaGljcy1waXhlbC5qcyIsICIuLi9zcmMvaW5kZXguanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxyXG4gKiBQaS5qcyAtIENvcmUgRGF0YSBNb2R1bGVcclxuICogXHJcbiAqIENlbnRyYWwgZGF0YSBzdG9yYWdlIGZvciBQaS5qcywgZXF1aXZhbGVudCB0byBsZWdhY3kgbV9waURhdGEuXHJcbiAqIFxyXG4gKiBAbW9kdWxlIGNvcmUvcGktZGF0YVxyXG4gKi9cclxuXHJcbi8vIENlbnRyYWwgUGkuanMgZGF0YSBzdG9yYWdlXHJcbmV4cG9ydCBjb25zdCBwaURhdGEgPSB7XHJcblx0XCJuZXh0U2NyZWVuSWRcIjogMCxcclxuXHRcInNjcmVlbnNcIjoge30sXHJcblx0XCJhY3RpdmVTY3JlZW5cIjogbnVsbCxcclxuXHRcImltYWdlc1wiOiB7fSxcclxuXHRcImltYWdlQ291bnRcIjogMCxcclxuXHRcImRlZmF1bHRQcm9tcHRcIjogU3RyaW5nLmZyb21DaGFyQ29kZSggMjE5ICksXHJcblx0XCJkZWZhdWx0Rm9udFwiOiB7fSxcclxuXHRcIm5leHRGb250SWRcIjogMCxcclxuXHRcImZvbnRzXCI6IHt9LFxyXG5cdFwiZGVmYXVsdFBhbGV0dGVcIjogW10sXHJcblx0XCJkZWZhdWx0Q29sb3JcIjogNyxcclxuXHRcImNvbW1hbmRzXCI6IHt9LFxyXG5cdFwic2NyZWVuQ29tbWFuZHNcIjoge30sXHJcblx0XCJkZWZhdWx0UGVuRHJhd1wiOiBudWxsLFxyXG5cdFwicGVuc1wiOiB7fSxcclxuXHRcInBlbkxpc3RcIjogW10sXHJcblx0XCJibGVuZENvbW1hbmRzXCI6IHt9LFxyXG5cdFwiYmxlbmRDb21tYW5kc0xpc3RcIjogW10sXHJcblx0XCJkZWZhdWx0QmxlbmRDbWRcIjogbnVsbCxcclxuXHRcInNldHRpbmdzXCI6IHt9LFxyXG5cdFwic2V0dGluZ3NMaXN0XCI6IFtdLFxyXG5cdFwidm9sdW1lXCI6IDAuNzUsXHJcblx0XCJpc1RvdWNoU2NyZWVuXCI6IGZhbHNlLFxyXG5cdFwiZGVmYXVsdElucHV0Rm9jdXNcIjogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IG51bGxcclxufTtcclxuXHJcbi8vIENvbW1hbmQgbGlzdCBmb3IgcHJvY2Vzc0NvbW1hbmRzXHJcbmV4cG9ydCBjb25zdCBjb21tYW5kTGlzdCA9IFtdO1xyXG5cclxuLy8gUmVhZHkgc3lzdGVtXHJcbmV4cG9ydCBsZXQgd2FpdENvdW50ID0gMDtcclxuZXhwb3J0IGxldCB3YWl0aW5nID0gZmFsc2U7XHJcbmV4cG9ydCBjb25zdCByZWFkeUxpc3QgPSBbXTtcclxuZXhwb3J0IGxldCBzdGFydFJlYWR5TGlzdFRpbWVvdXQgPSAwO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldFdhaXRDb3VudCggY291bnQgKSB7XHJcblx0d2FpdENvdW50ID0gY291bnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRXYWl0aW5nKCBzdGF0ZSApIHtcclxuXHR3YWl0aW5nID0gc3RhdGU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRTdGFydFJlYWR5TGlzdFRpbWVvdXQoIHRpbWVvdXQgKSB7XHJcblx0c3RhcnRSZWFkeUxpc3RUaW1lb3V0ID0gdGltZW91dDtcclxufVxyXG5cclxuIiwgIi8qKlxyXG4gKiBQaS5qcyAtIFV0aWxpdGllcyBNb2R1bGVcclxuICogXHJcbiAqIENvbW1vbiB1dGlsaXR5IGZ1bmN0aW9ucyBmb3IgbWF0aCwgY29sb3JzLCB0eXBlcywgYW5kIGRhdGEgbWFuaXB1bGF0aW9uLlxyXG4gKiBcclxuICogQG1vZHVsZSBtb2R1bGVzL3V0aWxzXHJcbiAqL1xyXG5cclxuLy8gVHlwZSBjaGVja2luZyB1dGlsaXRpZXNcclxuZXhwb3J0IGNvbnN0IGlzRnVuY3Rpb24gPSAoIGZuICkgPT4gdHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCI7XHJcbmV4cG9ydCBjb25zdCBpc0RvbUVsZW1lbnQgPSAoIGVsICkgPT4gZWwgaW5zdGFuY2VvZiBFbGVtZW50O1xyXG5leHBvcnQgY29uc3QgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XHJcbmV4cG9ydCBjb25zdCBpc0ludGVnZXIgPSBOdW1iZXIuaXNJbnRlZ2VyO1xyXG5leHBvcnQgY29uc3QgY2FuQWRkRXZlbnRMaXN0ZW5lcnMgPSAoIGVsICkgPT4ge1xyXG5cdHJldHVybiB0eXBlb2YgZWwuYWRkRXZlbnRMaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiICYmIFxyXG5cdFx0dHlwZW9mIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIjtcclxufTtcclxuXHJcbi8vIENvbG9yIGNvbnZlcnNpb24gdXRpbGl0aWVzXHJcblxyXG4vKipcclxuICogQ29udmVydCBoZXggY29sb3IgdG8gY29sb3Igb2JqZWN0XHJcbiAqIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaGV4IC0gSGV4IGNvbG9yIHN0cmluZyAoI1JHQiwgI1JSR0dCQiwgb3IgI1JSR0dCQkFBKVxyXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBDb2xvciBvYmplY3Qgd2l0aCByLCBnLCBiLCBhLCBzLCBzMiBwcm9wZXJ0aWVzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaGV4VG9Db2xvciggaGV4ICkge1xyXG5cdGxldCByLCBnLCBiLCBhLCBzMjtcclxuXHRzMiA9IGhleDtcclxuXHJcblx0aWYoIGhleC5sZW5ndGggPT09IDQgKSB7XHJcblx0XHRyID0gcGFyc2VJbnQoIGhleC5zbGljZSggMSwgMiApLCAxNiApICogMTYgLSAxO1xyXG5cdFx0ZyA9IHBhcnNlSW50KCBoZXguc2xpY2UoIDIsIDMgKSwgMTYgKSAqIDE2IC0gMTtcclxuXHRcdGIgPSBwYXJzZUludCggaGV4LnNsaWNlKCAzLCA0ICksIDE2ICkgKiAxNiAtIDE7XHJcblx0fSBlbHNlIHtcclxuXHRcdHIgPSBwYXJzZUludCggaGV4LnNsaWNlKCAxLCAzICksIDE2ICk7XHJcblx0XHRnID0gcGFyc2VJbnQoIGhleC5zbGljZSggMywgNSApLCAxNiApO1xyXG5cdFx0YiA9IHBhcnNlSW50KCBoZXguc2xpY2UoIDUsIDcgKSwgMTYgKTtcclxuXHR9XHJcblxyXG5cdGlmKCBoZXgubGVuZ3RoID09PSA5ICkge1xyXG5cdFx0czIgPSBoZXguc2xpY2UoIDAsIDcgKTtcclxuXHRcdGEgPSBwYXJzZUludCggaGV4LnNsaWNlKCA3LCA5ICksIDE2ICk7XHJcblx0fSBlbHNlIHtcclxuXHRcdGEgPSAyNTU7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0XCJyXCI6IHIsXHJcblx0XHRcImdcIjogZyxcclxuXHRcdFwiYlwiOiBiLFxyXG5cdFx0XCJhXCI6IGEsXHJcblx0XHRcInNcIjogYHJnYmEoJHtyfSwke2d9LCR7Yn0sJHtNYXRoLnJvdW5kKCBhIC8gMjU1ICogMTAwMCApIC8gMTAwMH0pYCxcclxuXHRcdFwiczJcIjogczJcclxuXHR9O1xyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCBjb2xvciBjb21wb25lbnQgdG8gaGV4XHJcbiAqIFxyXG4gKiBAcGFyYW0ge251bWJlcn0gYyAtIENvbG9yIGNvbXBvbmVudCAoMC0yNTUpXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEhleCBzdHJpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjVG9IZXgoIGMgKSB7XHJcblx0aWYoICFpc0ludGVnZXIoIGMgKSApIHtcclxuXHRcdGMgPSBNYXRoLnJvdW5kKCBjICk7XHJcblx0fVxyXG5cdGMgPSBjbGFtcCggYywgMCwgMjU1ICk7XHJcblx0Y29uc3QgaGV4ID0gTnVtYmVyKCBjICkudG9TdHJpbmcoIDE2ICk7XHJcblx0cmV0dXJuIGhleC5sZW5ndGggPCAyID8gXCIwXCIgKyBoZXggOiBoZXgudG9VcHBlckNhc2UoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgUkdCIHRvIGhleCBjb2xvclxyXG4gKiBcclxuICogQHBhcmFtIHtudW1iZXJ9IHIgLSBSZWQgY29tcG9uZW50ICgwLTI1NSlcclxuICogQHBhcmFtIHtudW1iZXJ9IGcgLSBHcmVlbiBjb21wb25lbnQgKDAtMjU1KVxyXG4gKiBAcGFyYW0ge251bWJlcn0gYiAtIEJsdWUgY29tcG9uZW50ICgwLTI1NSlcclxuICogQHBhcmFtIHtudW1iZXJ9IGEgLSBBbHBoYSBjb21wb25lbnQgKDAtMjU1KSwgZGVmYXVsdHMgdG8gMjU1XHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEhleCBjb2xvciBzdHJpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZ2JUb0hleCggciwgZywgYiwgYSApIHtcclxuXHRpZiggaXNOYU4oIGEgKSApIHtcclxuXHRcdGEgPSAyNTU7XHJcblx0fVxyXG5cdHJldHVybiBcIiNcIiArIGNUb0hleCggciApICsgY1RvSGV4KCBnICkgKyBjVG9IZXgoIGIgKSArIGNUb0hleCggYSApO1xyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCBSR0IgdG8gY29sb3Igb2JqZWN0XHJcbiAqIFxyXG4gKiBAcGFyYW0ge251bWJlcn0gciAtIFJlZCBjb21wb25lbnQgKDAtMjU1KVxyXG4gKiBAcGFyYW0ge251bWJlcn0gZyAtIEdyZWVuIGNvbXBvbmVudCAoMC0yNTUpXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBiIC0gQmx1ZSBjb21wb25lbnQgKDAtMjU1KVxyXG4gKiBAcGFyYW0ge251bWJlcn0gYSAtIEFscGhhIGNvbXBvbmVudCAoMC0yNTUpXHJcbiAqIEByZXR1cm5zIHtPYmplY3R9IENvbG9yIG9iamVjdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJnYlRvQ29sb3IoIHIsIGcsIGIsIGEgKSB7XHJcblx0cmV0dXJuIGhleFRvQ29sb3IoIHJnYlRvSGV4KCByLCBnLCBiLCBhICkgKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgY29sb3Igc3RyaW5nIHRvIGNvbG9yIG9iamVjdCB1c2luZyBjYW52YXNcclxuICogXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb2xvclN0ciAtIENTUyBjb2xvciBzdHJpbmdcclxuICogQHJldHVybnMge09iamVjdH0gQ29sb3Igb2JqZWN0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29sb3JTdHJpbmdUb0NvbG9yKCBjb2xvclN0ciApIHtcclxuXHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImNhbnZhc1wiICk7XHJcblx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCBcIjJkXCIsIHsgXCJ3aWxsUmVhZEZyZXF1ZW50bHlcIjogdHJ1ZSB9ICk7XHJcblx0Y29udGV4dC5maWxsU3R5bGUgPSBjb2xvclN0cjtcclxuXHRjb250ZXh0LmZpbGxSZWN0KCAwLCAwLCAxLCAxICk7XHJcblx0Y29uc3QgZGF0YSA9IGNvbnRleHQuZ2V0SW1hZ2VEYXRhKCAwLCAwLCAxLCAxICkuZGF0YTtcclxuXHRyZXR1cm4gcmdiVG9Db2xvciggZGF0YVsgMCBdLCBkYXRhWyAxIF0sIGRhdGFbIDIgXSwgZGF0YVsgMyBdICk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGNvbG9yIHN0cmluZyB0byBoZXhcclxuICogXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb2xvclN0ciAtIENTUyBjb2xvciBzdHJpbmdcclxuICogQHJldHVybnMge3N0cmluZ30gSGV4IGNvbG9yIHN0cmluZ1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbG9yU3RyaW5nVG9IZXgoIGNvbG9yU3RyICkge1xyXG5cdHJldHVybiBjb2xvclN0cmluZ1RvQ29sb3IoIGNvbG9yU3RyICkuczI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTcGxpdCBSR0IvUkdCQSBzdHJpbmcgaW50byBjb21wb25lbnRzXHJcbiAqIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcyAtIFJHQiBvciBSR0JBIHN0cmluZ1xyXG4gKiBAcmV0dXJucyB7QXJyYXk8bnVtYmVyPn0gQXJyYXkgb2YgY29sb3IgY29tcG9uZW50c1xyXG4gKi9cclxuZnVuY3Rpb24gc3BsaXRSZ2IoIHMgKSB7XHJcblx0cyA9IHMuc2xpY2UoIHMuaW5kZXhPZiggXCIoXCIgKSArIDEsIHMuaW5kZXhPZiggXCIpXCIgKSApO1xyXG5cdGNvbnN0IHBhcnRzID0gcy5zcGxpdCggXCIsXCIgKTtcclxuXHRjb25zdCBjb2xvcnMgPSBbXTtcclxuXHRmb3IoIGxldCBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrICkge1xyXG5cdFx0bGV0IHZhbDtcclxuXHRcdGlmKCBpID09PSAzICkge1xyXG5cdFx0XHR2YWwgPSBwYXJzZUZsb2F0KCBwYXJ0c1sgaSBdLnRyaW0oKSApICogMjU1O1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dmFsID0gcGFyc2VJbnQoIHBhcnRzWyBpIF0udHJpbSgpICk7XHJcblx0XHR9XHJcblx0XHRjb2xvcnMucHVzaCggdmFsICk7XHJcblx0fVxyXG5cdHJldHVybiBjb2xvcnM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IHZhcmlvdXMgY29sb3IgZm9ybWF0cyB0byBjb2xvciBvYmplY3RcclxuICogXHJcbiAqIEBwYXJhbSB7Kn0gY29sb3IgLSBDb2xvciBpbiB2YXJpb3VzIGZvcm1hdHNcclxuICogQHJldHVybnMge09iamVjdHxudWxsfSBDb2xvciBvYmplY3Qgb3IgbnVsbCBpZiBpbnZhbGlkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRvQ29sb3IoIGNvbG9yICkge1xyXG5cdGlmKCBjb2xvciA9PT0gdW5kZWZpbmVkICkge1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvLyBBcnJheSBmb3JtYXQgW3IsIGcsIGIsIGFdXHJcblx0aWYoIGlzQXJyYXkoIGNvbG9yICkgJiYgY29sb3IubGVuZ3RoID4gMiApIHtcclxuXHRcdHJldHVybiByZ2JUb0NvbG9yKCBjb2xvclsgMCBdLCBjb2xvclsgMSBdLCBjb2xvclsgMiBdLCBjb2xvclsgMyBdICk7XHJcblx0fVxyXG5cclxuXHQvLyBPYmplY3QgZm9ybWF0IHtyLCBnLCBiLCBhfVxyXG5cdGlmKFxyXG5cdFx0aXNJbnRlZ2VyKCBjb2xvcj8uciApICYmXHJcblx0XHRpc0ludGVnZXIoIGNvbG9yPy5nICkgJiZcclxuXHRcdGlzSW50ZWdlciggY29sb3I/LmIgKVxyXG5cdCkge1xyXG5cdFx0cmV0dXJuIHJnYlRvQ29sb3IoIGNvbG9yLnIsIGNvbG9yLmcsIGNvbG9yLmIsIGNvbG9yLmEgKTtcclxuXHR9XHJcblxyXG5cdGlmKCB0eXBlb2YgY29sb3IgIT09IFwic3RyaW5nXCIgKSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8vIEhleCBmb3JtYXRcclxuXHRjb25zdCBjaGVja0hleENvbG9yID0gLyheI1swLTlBLUZdezh9JCl8KF4jWzAtOUEtRl17Nn0kKXwoXiNbMC05QS1GXXszfSQpL2k7XHJcblx0aWYoIGNoZWNrSGV4Q29sb3IudGVzdCggY29sb3IgKSApIHtcclxuXHRcdHJldHVybiBoZXhUb0NvbG9yKCBjb2xvciApO1xyXG5cdH1cclxuXHJcblx0Ly8gUkdCL1JHQkEgZm9ybWF0XHJcblx0aWYoIGNvbG9yLmluZGV4T2YoIFwicmdiXCIgKSA9PT0gMCApIHtcclxuXHRcdGNvbnN0IHJnYlBhcnRzID0gc3BsaXRSZ2IoIGNvbG9yICk7XHJcblx0XHRpZiggcmdiUGFydHMubGVuZ3RoIDwgMyApIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmdiVG9Db2xvciggcmdiUGFydHNbIDAgXSwgcmdiUGFydHNbIDEgXSwgcmdiUGFydHNbIDIgXSwgcmdiUGFydHNbIDMgXSApO1xyXG5cdH1cclxuXHJcblx0Ly8gTmFtZWQgY29sb3Igb3Igb3RoZXIgQ1NTIGNvbG9yXHJcblx0cmV0dXJuIGNvbG9yU3RyaW5nVG9Db2xvciggY29sb3IgKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgY29sb3Igc3RyaW5nIGlzIHZhbGlkXHJcbiAqIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyQ29sb3IgLSBDb2xvciBzdHJpbmcgdG8gY2hlY2tcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsaWRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjaGVja0NvbG9yKCBzdHJDb2xvciApIHtcclxuXHRjb25zdCBzID0gbmV3IE9wdGlvbigpLnN0eWxlO1xyXG5cdHMuY29sb3IgPSBzdHJDb2xvcjtcclxuXHRyZXR1cm4gcy5jb2xvciAhPT0gXCJcIjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbXBhcmUgdHdvIGNvbG9yIG9iamVjdHNcclxuICogXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb2xvcjEgLSBGaXJzdCBjb2xvclxyXG4gKiBAcGFyYW0ge09iamVjdH0gY29sb3IyIC0gU2Vjb25kIGNvbG9yXHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNvbG9ycyBhcmUgZXF1YWxcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlQ29sb3JzKCBjb2xvcjEsIGNvbG9yMiApIHtcclxuXHRyZXR1cm4gY29sb3IxLnIgPT09IGNvbG9yMi5yICYmXHJcblx0XHRjb2xvcjEuZyA9PT0gY29sb3IyLmcgJiZcclxuXHRcdGNvbG9yMS5iID09PSBjb2xvcjIuYiAmJlxyXG5cdFx0Y29sb3IxLmEgPT09IGNvbG9yMi5hO1xyXG59XHJcblxyXG4vLyBEYXRhIGNvbnZlcnNpb24gdXRpbGl0aWVzXHJcblxyXG4vKipcclxuICogQ29udmVydCBoZXggc3RyaW5nIHRvIDJEIGRhdGEgYXJyYXlcclxuICogXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBoZXggLSBIZXggc3RyaW5nXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB3aWR0aCAtIFdpZHRoIG9mIGRhdGFcclxuICogQHBhcmFtIHtudW1iZXJ9IGhlaWdodCAtIEhlaWdodCBvZiBkYXRhXHJcbiAqIEByZXR1cm5zIHtBcnJheTxBcnJheTxudW1iZXI+Pn0gMkQgYXJyYXkgb2YgYmluYXJ5IGRhdGFcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBoZXhUb0RhdGEoIGhleCwgd2lkdGgsIGhlaWdodCApIHtcclxuXHRoZXggPSBoZXgudG9VcHBlckNhc2UoKTtcclxuXHRjb25zdCBkYXRhID0gW107XHJcblx0bGV0IGkgPSAwO1xyXG5cdGxldCBkaWdpdHMgPSBcIlwiO1xyXG5cdGxldCBkaWdpdEluZGV4ID0gMDtcclxuXHJcblx0Zm9yKCBsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKyApIHtcclxuXHRcdGRhdGEucHVzaCggW10gKTtcclxuXHRcdGZvciggbGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKyApIHtcclxuXHRcdFx0aWYoIGRpZ2l0SW5kZXggPj0gZGlnaXRzLmxlbmd0aCApIHtcclxuXHRcdFx0XHRsZXQgaGV4UGFydCA9IHBhcnNlSW50KCBoZXhbIGkgXSwgMTYgKTtcclxuXHRcdFx0XHRpZiggaXNOYU4oIGhleFBhcnQgKSApIHtcclxuXHRcdFx0XHRcdGhleFBhcnQgPSAwO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRkaWdpdHMgPSBwYWRMKCBoZXhQYXJ0LnRvU3RyaW5nKCAyICksIDQsIFwiMFwiICk7XHJcblx0XHRcdFx0aSArPSAxO1xyXG5cdFx0XHRcdGRpZ2l0SW5kZXggPSAwO1xyXG5cdFx0XHR9XHJcblx0XHRcdGRhdGFbIHkgXS5wdXNoKCBwYXJzZUludCggZGlnaXRzWyBkaWdpdEluZGV4IF0gKSApO1xyXG5cdFx0XHRkaWdpdEluZGV4ICs9IDE7XHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiBkYXRhO1xyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCAyRCBkYXRhIGFycmF5IHRvIGhleCBzdHJpbmdcclxuICogXHJcbiAqIEBwYXJhbSB7QXJyYXk8QXJyYXk8bnVtYmVyPj59IGRhdGEgLSAyRCBhcnJheSBvZiBiaW5hcnkgZGF0YVxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIZXggc3RyaW5nXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGF0YVRvSGV4KCBkYXRhICkge1xyXG5cdGxldCBoZXggPSBcIlwiO1xyXG5cdGxldCBkaWdpdHMgPSBcIlwiO1xyXG5cclxuXHRmb3IoIGxldCB5ID0gMDsgeSA8IGRhdGEubGVuZ3RoOyB5KysgKSB7XHJcblx0XHRmb3IoIGxldCB4ID0gMDsgeCA8IGRhdGFbIHkgXS5sZW5ndGg7IHgrKyApIHtcclxuXHRcdFx0ZGlnaXRzICs9IGRhdGFbIHkgXVsgeCBdO1xyXG5cdFx0XHRpZiggZGlnaXRzLmxlbmd0aCA9PT0gNCApIHtcclxuXHRcdFx0XHRoZXggKz0gcGFyc2VJbnQoIGRpZ2l0cywgMiApLnRvU3RyaW5nKCAxNiApO1xyXG5cdFx0XHRcdGRpZ2l0cyA9IFwiXCI7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0cmV0dXJuIGhleDtcclxufVxyXG5cclxuLy8gTWF0aCB1dGlsaXRpZXNcclxuXHJcbi8qKlxyXG4gKiBDbGFtcCBhIG51bWJlciBiZXR3ZWVuIG1pbiBhbmQgbWF4XHJcbiAqIFxyXG4gKiBAcGFyYW0ge251bWJlcn0gbnVtIC0gTnVtYmVyIHRvIGNsYW1wXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBtaW4gLSBNaW5pbXVtIHZhbHVlXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBtYXggLSBNYXhpbXVtIHZhbHVlXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IENsYW1wZWQgdmFsdWVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjbGFtcCggbnVtLCBtaW4sIG1heCApIHtcclxuXHRyZXR1cm4gTWF0aC5taW4oIE1hdGgubWF4KCBudW0sIG1pbiApLCBtYXggKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgcG9pbnQgaXMgaW4gYSByZWN0YW5nbGVcclxuICogXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBwb2ludCAtIFBvaW50IHdpdGggeCwgeSBwcm9wZXJ0aWVzXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBoaXRCb3ggLSBSZWN0YW5nbGUgd2l0aCB4LCB5LCB3aWR0aCwgaGVpZ2h0IHByb3BlcnRpZXNcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgcG9pbnQgaXMgaW5zaWRlIHJlY3RhbmdsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluUmFuZ2UoIHBvaW50LCBoaXRCb3ggKSB7XHJcblx0cmV0dXJuIHBvaW50LnggPj0gaGl0Qm94LnggJiYgcG9pbnQueCA8IGhpdEJveC54ICsgaGl0Qm94LndpZHRoICYmXHJcblx0XHRwb2ludC55ID49IGhpdEJveC55ICYmIHBvaW50LnkgPCBoaXRCb3gueSArIGhpdEJveC5oZWlnaHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiBjb29yZGluYXRlcyBhcmUgaW4gYSByZWN0YW5nbGVcclxuICogXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB4MSAtIFBvaW50IHhcclxuICogQHBhcmFtIHtudW1iZXJ9IHkxIC0gUG9pbnQgeVxyXG4gKiBAcGFyYW0ge251bWJlcn0geDIgLSBSZWN0YW5nbGUgeFxyXG4gKiBAcGFyYW0ge251bWJlcn0geTIgLSBSZWN0YW5nbGUgeVxyXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGggLSBSZWN0YW5nbGUgd2lkdGhcclxuICogQHBhcmFtIHtudW1iZXJ9IGhlaWdodCAtIFJlY3RhbmdsZSBoZWlnaHRcclxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgcG9pbnQgaXMgaW5zaWRlIHJlY3RhbmdsZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluUmFuZ2UyKCB4MSwgeTEsIHgyLCB5Miwgd2lkdGgsIGhlaWdodCApIHtcclxuXHRyZXR1cm4geDEgPj0geDIgJiYgeDEgPCB4MiArIHdpZHRoICYmXHJcblx0XHR5MSA+PSB5MiAmJiB5MSA8IHkyICsgaGVpZ2h0O1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgcmFuZG9tIG51bWJlciBpbiByYW5nZVxyXG4gKiBcclxuICogQHBhcmFtIHtudW1iZXJ9IG1pbiAtIE1pbmltdW0gdmFsdWVcclxuICogQHBhcmFtIHtudW1iZXJ9IG1heCAtIE1heGltdW0gdmFsdWVcclxuICogQHJldHVybnMge251bWJlcn0gUmFuZG9tIG51bWJlciBiZXR3ZWVuIG1pbiBhbmQgbWF4XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcm5kUmFuZ2UoIG1pbiwgbWF4ICkge1xyXG5cdHJldHVybiBNYXRoLnJhbmRvbSgpICogKCBtYXggLSBtaW4gKSArIG1pbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgZGVncmVlcyB0byByYWRpYW5zXHJcbiAqIFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZGVnIC0gRGVncmVlc1xyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSYWRpYW5zXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVncmVlc1RvUmFkaWFuKCBkZWcgKSB7XHJcblx0cmV0dXJuIGRlZyAqICggTWF0aC5QSSAvIDE4MCApO1xyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCByYWRpYW5zIHRvIGRlZ3JlZXNcclxuICogXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSByYWQgLSBSYWRpYW5zXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IERlZ3JlZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByYWRpYW5zVG9EZWdyZWVzKCByYWQgKSB7XHJcblx0cmV0dXJuIHJhZCAqICggMTgwIC8gTWF0aC5QSSApO1xyXG59XHJcblxyXG4vLyBTdHJpbmcgdXRpbGl0aWVzXHJcblxyXG4vKipcclxuICogUGFkIHN0cmluZyBvbiBsZWZ0XHJcbiAqIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIC0gU3RyaW5nIHRvIHBhZFxyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVuIC0gVGFyZ2V0IGxlbmd0aFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gYyAtIFBhZGRpbmcgY2hhcmFjdGVyXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFBhZGRlZCBzdHJpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwYWRMKCBzdHIsIGxlbiwgYyApIHtcclxuXHRpZiggdHlwZW9mIGMgIT09IFwic3RyaW5nXCIgKSB7XHJcblx0XHRjID0gXCIgXCI7XHJcblx0fVxyXG5cdGxldCBwYWQgPSBcIlwiO1xyXG5cdHN0ciA9IHN0ciArIFwiXCI7XHJcblx0Zm9yKCBsZXQgaSA9IHN0ci5sZW5ndGg7IGkgPCBsZW47IGkrKyApIHtcclxuXHRcdHBhZCArPSBjO1xyXG5cdH1cclxuXHRyZXR1cm4gcGFkICsgc3RyO1xyXG59XHJcblxyXG4vKipcclxuICogUGFkIHN0cmluZyBvbiByaWdodFxyXG4gKiBcclxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciAtIFN0cmluZyB0byBwYWRcclxuICogQHBhcmFtIHtudW1iZXJ9IGxlbiAtIFRhcmdldCBsZW5ndGhcclxuICogQHBhcmFtIHtzdHJpbmd9IGMgLSBQYWRkaW5nIGNoYXJhY3RlclxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBQYWRkZWQgc3RyaW5nXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFkUiggc3RyLCBsZW4sIGMgKSB7XHJcblx0aWYoIHR5cGVvZiBjICE9PSBcInN0cmluZ1wiICkge1xyXG5cdFx0YyA9IFwiIFwiO1xyXG5cdH1cclxuXHRzdHIgPSBzdHIgKyBcIlwiO1xyXG5cdGZvciggbGV0IGkgPSBzdHIubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XHJcblx0XHRzdHIgKz0gYztcclxuXHR9XHJcblx0cmV0dXJuIHN0cjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBhZCBzdHJpbmcgb24gYm90aCBzaWRlc1xyXG4gKiBcclxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciAtIFN0cmluZyB0byBwYWRcclxuICogQHBhcmFtIHtudW1iZXJ9IGxlbiAtIFRhcmdldCBsZW5ndGhcclxuICogQHBhcmFtIHtzdHJpbmd9IGMgLSBQYWRkaW5nIGNoYXJhY3RlclxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBQYWRkZWQgc3RyaW5nXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFkKCBzdHIsIGxlbiwgYyApIHtcclxuXHRpZiggdHlwZW9mIGMgIT09IFwic3RyaW5nXCIgfHwgYy5sZW5ndGggPT09IDAgKSB7XHJcblx0XHRjID0gXCIgXCI7XHJcblx0fVxyXG5cdHN0ciA9IHN0ciArIFwiXCI7XHJcblx0d2hpbGUoIHN0ci5sZW5ndGggPCBsZW4gKSB7XHJcblx0XHRzdHIgPSBjICsgc3RyICsgYztcclxuXHR9XHJcblx0aWYoIHN0ci5sZW5ndGggPiBsZW4gKSB7XHJcblx0XHRzdHIgPSBzdHIuc3Vic3RyKCAwLCBsZW4gKTtcclxuXHR9XHJcblx0cmV0dXJuIHN0cjtcclxufVxyXG5cclxuLy8gT2JqZWN0IHV0aWxpdGllc1xyXG5cclxuLyoqXHJcbiAqIENvcHkgcHJvcGVydGllcyBmcm9tIHNvdXJjZSB0byBkZXN0aW5hdGlvblxyXG4gKiBcclxuICogQHBhcmFtIHtPYmplY3R9IGRlc3QgLSBEZXN0aW5hdGlvbiBvYmplY3RcclxuICogQHBhcmFtIHtPYmplY3R9IHNyYyAtIFNvdXJjZSBvYmplY3RcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3B5UHJvcGVydGllcyggZGVzdCwgc3JjICkge1xyXG5cdGZvciggY29uc3QgcHJvcCBpbiBzcmMgKSB7XHJcblx0XHRpZiggc3JjLmhhc093blByb3BlcnR5KCBwcm9wICkgKSB7XHJcblx0XHRcdGRlc3RbIHByb3AgXSA9IHNyY1sgcHJvcCBdO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgb2JqZWN0IHRvIGFycmF5XHJcbiAqIFxyXG4gKiBAcGFyYW0ge09iamVjdH0gc3JjIC0gU291cmNlIG9iamVjdFxyXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHZhbHVlc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0FycmF5KCBzcmMgKSB7XHJcblx0Y29uc3QgYXJyID0gW107XHJcblx0Zm9yKCBjb25zdCBwcm9wIGluIHNyYyApIHtcclxuXHRcdGlmKCBzcmMuaGFzT3duUHJvcGVydHkoIHByb3AgKSApIHtcclxuXHRcdFx0YXJyLnB1c2goIHNyY1sgcHJvcCBdICk7XHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiBhcnI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWxldGUgYWxsIHByb3BlcnRpZXMgZnJvbSBvYmplY3RcclxuICogXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBPYmplY3QgdG8gY2xlYXJcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWxldGVQcm9wZXJ0aWVzKCBvYmogKSB7XHJcblx0Zm9yKCBjb25zdCBwcm9wIGluIG9iaiApIHtcclxuXHRcdGlmKCBvYmouaGFzT3duUHJvcGVydHkoIHByb3AgKSApIHtcclxuXHRcdFx0ZGVsZXRlIG9ialsgcHJvcCBdO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8gV2luZG93IHV0aWxpdGllc1xyXG5cclxuLyoqXHJcbiAqIEdldCB3aW5kb3cgc2l6ZVxyXG4gKiBcclxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggd2lkdGggYW5kIGhlaWdodFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFdpbmRvd1NpemUoKSB7XHJcblx0Y29uc3Qgd2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggfHxcclxuXHRcdGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XHJcblxyXG5cdGNvbnN0IGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IHx8XHJcblx0XHRkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcclxuXHJcblx0cmV0dXJuIHsgXCJ3aWR0aFwiOiB3aWR0aCwgXCJoZWlnaHRcIjogaGVpZ2h0IH07XHJcbn1cclxuXHJcbi8vIFNlYXJjaCB1dGlsaXRpZXNcclxuXHJcbi8qKlxyXG4gKiBCaW5hcnkgc2VhcmNoIGluIHNvcnRlZCBhcnJheVxyXG4gKiBcclxuICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFNvcnRlZCBhcnJheVxyXG4gKiBAcGFyYW0geyp9IHNlYXJjaCAtIFZhbHVlIHRvIHNlYXJjaCBmb3JcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29tcGFyZUZuIC0gQ29tcGFyaXNvbiBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBJbmRleCBvZiBmb3VuZCBlbGVtZW50IG9yIG5lZ2F0aXZlIGluc2VydGlvbiBwb2ludFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVNlYXJjaCggZGF0YSwgc2VhcmNoLCBjb21wYXJlRm4gKSB7XHJcblx0bGV0IG0gPSAwO1xyXG5cdGxldCBuID0gZGF0YS5sZW5ndGggLSAxO1xyXG5cclxuXHR3aGlsZSggbSA8PSBuICkge1xyXG5cdFx0Y29uc3QgayA9ICggbiArIG0gKSA+PiAxO1xyXG5cdFx0Y29uc3QgcmVzdWx0ID0gY29tcGFyZUZuKCBzZWFyY2gsIGRhdGFbIGsgXSwgayApO1xyXG5cdFx0aWYoIHJlc3VsdCA+IDAgKSB7XHJcblx0XHRcdG0gPSBrICsgMTtcclxuXHRcdH0gZWxzZSBpZiggcmVzdWx0IDwgMCApIHtcclxuXHRcdFx0biA9IGsgLSAxO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGs7XHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiAtbSAtIDE7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBpbnRlZ2VyIHdpdGggZGVmYXVsdCB2YWx1ZVxyXG4gKiBcclxuICogQHBhcmFtIHsqfSB2YWwgLSBWYWx1ZSB0byBwYXJzZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gZGVmIC0gRGVmYXVsdCB2YWx1ZSBpZiBwYXJzaW5nIGZhaWxzXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFBhcnNlZCBpbnRlZ2VyIG9yIGRlZmF1bHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRJbnQoIHZhbCwgZGVmICkge1xyXG5cdHZhbCA9IHBhcnNlSW50KCB2YWwgKTtcclxuXHRpZiggaXNOYU4oIHZhbCApICkge1xyXG5cdFx0dmFsID0gZGVmO1xyXG5cdH1cclxuXHRyZXR1cm4gdmFsO1xyXG59XHJcblxyXG4vLyBDb21tb24gbWF0aCBjb25zdGFudHNcclxuZXhwb3J0IGNvbnN0IG1hdGggPSBPYmplY3QuZnJlZXplKCB7XHJcblx0XCJkZWczMFwiOiBNYXRoLlBJIC8gNixcclxuXHRcImRlZzQ1XCI6IE1hdGguUEkgLyA0LFxyXG5cdFwiZGVnNjBcIjogTWF0aC5QSSAvIDMsXHJcblx0XCJkZWc5MFwiOiBNYXRoLlBJIC8gMixcclxuXHRcImRlZzEyMFwiOiAoIDIgKiBNYXRoLlBJICkgLyAzLFxyXG5cdFwiZGVnMTM1XCI6ICggMyAqIE1hdGguUEkgKSAvIDQsXHJcblx0XCJkZWcxNTBcIjogKCA1ICogTWF0aC5QSSApIC8gNixcclxuXHRcImRlZzE4MFwiOiBNYXRoLlBJLFxyXG5cdFwiZGVnMjEwXCI6ICggNyAqIE1hdGguUEkgKSAvIDYsXHJcblx0XCJkZWcyMjVcIjogKCA1ICogTWF0aC5QSSApIC8gNCxcclxuXHRcImRlZzI0MFwiOiAoIDQgKiBNYXRoLlBJICkgLyAzLFxyXG5cdFwiZGVnMjcwXCI6ICggMyAqIE1hdGguUEkgKSAvIDIsXHJcblx0XCJkZWczMDBcIjogKCA1ICogTWF0aC5QSSApIC8gMyxcclxuXHRcImRlZzMxNVwiOiAoIDcgKiBNYXRoLlBJICkgLyA0LFxyXG5cdFwiZGVnMzMwXCI6ICggMTEgKiBNYXRoLlBJICkgLyA2LFxyXG5cdFwiZGVnMzYwXCI6IE1hdGguUEkgKiAyXHJcbn0gKTtcclxuXHJcbi8vIFF1ZXVlIG1pY3JvdGFzayAoYnVpbHQtaW4gaW4gbW9kZXJuIGJyb3dzZXJzKVxyXG4vLyBXcmFwIHRvIHByZXNlcnZlIHdpbmRvdyBjb250ZXh0XHJcbmV4cG9ydCBjb25zdCBxdWV1ZU1pY3JvdGFzayA9ICggY2FsbGJhY2sgKSA9PiB7XHJcblx0aWYoIHdpbmRvdy5xdWV1ZU1pY3JvdGFzayApIHtcclxuXHRcdHdpbmRvdy5xdWV1ZU1pY3JvdGFzayggY2FsbGJhY2sgKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0c2V0VGltZW91dCggY2FsbGJhY2ssIDAgKTtcclxuXHR9XHJcbn07XHJcblxyXG4iLCAiLyoqXHJcbiAqIFBpLmpzIC0gQ29tbWFuZCBTeXN0ZW0gTW9kdWxlXHJcbiAqIFxyXG4gKiBDb21tYW5kIHJlZ2lzdHJhdGlvbiBhbmQgcHJvY2Vzc2luZywgbWF0Y2hpbmcgbGVnYWN5IEFQSSBwYXR0ZXJuLlxyXG4gKiBcclxuICogQG1vZHVsZSBjb3JlL2NvbW1hbmQtc3lzdGVtXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgcGlEYXRhLCBjb21tYW5kTGlzdCB9IGZyb20gXCIuL3BpLWRhdGEuanNcIjtcclxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSBcIi4uL21vZHVsZXMvdXRpbHMuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBBZGQgYSBjb21tYW5kIHRvIHRoZSBzeXN0ZW1cclxuICogXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIC0gQ29tbWFuZCBuYW1lXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gQ29tbWFuZCBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGlzSW50ZXJuYWwgLSBJZiB0cnVlLCBub3QgZXhwb3NlZCBpbiBBUElcclxuICogQHBhcmFtIHtib29sZWFufSBpc1NjcmVlbiAtIElmIHRydWUsIHJlcXVpcmVzIHNjcmVlbiBjb250ZXh0XHJcbiAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgLSBQYXJhbWV0ZXIgbmFtZXNcclxuICogQHBhcmFtIHtib29sZWFufSBpc1NldCAtIElmIHRydWUsIHRoaXMgaXMgYSBzZXR0aW5nXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYWRkQ29tbWFuZCggbmFtZSwgZm4sIGlzSW50ZXJuYWwsIGlzU2NyZWVuLCBwYXJhbWV0ZXJzLCBpc1NldCApIHtcclxuXHRwaURhdGEuY29tbWFuZHNbIG5hbWUgXSA9IGZuO1xyXG5cclxuXHRpZiggIWlzSW50ZXJuYWwgKSB7XHJcblx0XHRjb21tYW5kTGlzdC5wdXNoKCB7XHJcblx0XHRcdFwibmFtZVwiOiBuYW1lLFxyXG5cdFx0XHRcImZuXCI6IGZuLFxyXG5cdFx0XHRcImlzU2NyZWVuXCI6IGlzU2NyZWVuLFxyXG5cdFx0XHRcInBhcmFtZXRlcnNcIjogcGFyYW1ldGVycyB8fCBbXSxcclxuXHRcdFx0XCJpc1NldFwiOiBpc1NldCxcclxuXHRcdFx0XCJub1BhcnNlXCI6IGlzU2V0XHJcblx0XHR9ICk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQWRkIGEgY29tbWFuZCB3aXRoIGR1YWwgcGl4ZWwvYW50aS1hbGlhc2VkIGltcGxlbWVudGF0aW9uc1xyXG4gKiBcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSBDb21tYW5kIG5hbWVcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5QeCAtIFBpeGVsIG1vZGUgaW1wbGVtZW50YXRpb25cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5BYSAtIEFudGktYWxpYXNlZCBtb2RlIGltcGxlbWVudGF0aW9uXHJcbiAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgLSBQYXJhbWV0ZXIgbmFtZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGRDb21tYW5kcyggbmFtZSwgZm5QeCwgZm5BYSwgcGFyYW1ldGVycyApIHtcclxuXHRhZGRDb21tYW5kKCBuYW1lLCBmdW5jdGlvbiggc2NyZWVuRGF0YSwgYXJncyApIHtcclxuXHRcdGlmKCBzY3JlZW5EYXRhLnBpeGVsTW9kZSApIHtcclxuXHRcdFx0Zm5QeCggc2NyZWVuRGF0YSwgYXJncyApO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Zm5BYSggc2NyZWVuRGF0YSwgYXJncyApO1xyXG5cdFx0fVxyXG5cdH0sIGZhbHNlLCB0cnVlLCBwYXJhbWV0ZXJzICk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgYSBzZXR0aW5nXHJcbiAqIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIFNldHRpbmcgbmFtZVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiAtIFNldHRpbmcgZnVuY3Rpb25cclxuICogQHBhcmFtIHtib29sZWFufSBpc1NjcmVlbiAtIElmIHRydWUsIHJlcXVpcmVzIHNjcmVlbiBjb250ZXh0XHJcbiAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgLSBQYXJhbWV0ZXIgbmFtZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGRTZXR0aW5nKCBuYW1lLCBmbiwgaXNTY3JlZW4sIHBhcmFtZXRlcnMgKSB7XHJcblx0cGlEYXRhLnNldHRpbmdzWyBuYW1lIF0gPSB7XHJcblx0XHRcIm5hbWVcIjogbmFtZSxcclxuXHRcdFwiZm5cIjogZm4sXHJcblx0XHRcImlzU2NyZWVuXCI6IGlzU2NyZWVuLFxyXG5cdFx0XCJwYXJhbWV0ZXJzXCI6IHBhcmFtZXRlcnMgfHwgW11cclxuXHR9O1xyXG5cdHBpRGF0YS5zZXR0aW5nc0xpc3QucHVzaCggbmFtZSApO1xyXG59XHJcblxyXG4vKipcclxuICogUGFyc2Ugb3B0aW9ucyAtIGNvbnZlcnRzIG9iamVjdCBub3RhdGlvbiB0byBhcnJheSBvciBwYXNzZXMgdGhyb3VnaCBhcnJheVxyXG4gKiBcclxuICogQHBhcmFtIHtPYmplY3R9IGNtZCAtIENvbW1hbmQgZGVmaW5pdGlvblxyXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzIC0gQXJndW1lbnRzIHBhc3NlZCB0byBjb21tYW5kXHJcbiAqIEByZXR1cm5zIHtBcnJheX0gUGFyc2VkIGFyZ3VtZW50c1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlT3B0aW9ucyggY21kLCBhcmdzICkge1xyXG5cdGlmKCBjbWQubm9QYXJzZSApIHtcclxuXHRcdHJldHVybiBhcmdzO1xyXG5cdH1cclxuXHJcblx0Ly8gSWYgZmlyc3QgYXJndW1lbnQgaXMgYW4gb2JqZWN0LCBjb252ZXJ0IHRvIGFycmF5IGJhc2VkIG9uIHBhcmFtZXRlciBuYW1lc1xyXG5cdGlmKFxyXG5cdFx0YXJncy5sZW5ndGggPiAwICYmXHJcblx0XHR0eXBlb2YgYXJnc1sgMCBdID09PSBcIm9iamVjdFwiICYmXHJcblx0XHRhcmdzWyAwIF0gIT09IG51bGwgJiZcclxuXHRcdCFhcmdzWyAwIF0uaGFzT3duUHJvcGVydHkoIFwic2NyZWVuXCIgKSAmJlxyXG5cdFx0IXV0aWxzLmlzQXJyYXkoIGFyZ3NbIDAgXSApICYmXHJcblx0XHQhdXRpbHMuaXNEb21FbGVtZW50KCBhcmdzWyAwIF0gKVxyXG5cdCkge1xyXG5cdFx0Y29uc3Qgb3B0aW9ucyA9IGFyZ3NbIDAgXTtcclxuXHRcdGNvbnN0IGFyZ3MyID0gW107XHJcblx0XHRsZXQgZm91bmRQYXJhbWV0ZXIgPSBmYWxzZTtcclxuXHJcblx0XHRmb3IoIGxldCBpID0gMDsgaSA8IGNtZC5wYXJhbWV0ZXJzLmxlbmd0aDsgaSsrICkge1xyXG5cdFx0XHRpZiggb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSggY21kLnBhcmFtZXRlcnNbIGkgXSApICkge1xyXG5cdFx0XHRcdGFyZ3MyLnB1c2goIG9wdGlvbnNbIGNtZC5wYXJhbWV0ZXJzWyBpIF0gXSApO1xyXG5cdFx0XHRcdGZvdW5kUGFyYW1ldGVyID0gdHJ1ZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRhcmdzMi5wdXNoKCBudWxsICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiggZm91bmRQYXJhbWV0ZXIgKSB7XHJcblx0XHRcdHJldHVybiBhcmdzMjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBhcmdzO1xyXG59XHJcblxyXG4vKipcclxuICogQWRkIGEgcGVuIGRyYXdpbmcgbW9kZVxyXG4gKiBcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSBQZW4gbmFtZVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiAtIFBlbiBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge3N0cmluZ30gY2FwIC0gTGluZSBjYXAgc3R5bGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGRQZW4oIG5hbWUsIGZuLCBjYXAgKSB7XHJcblx0cGlEYXRhLnBlbkxpc3QucHVzaCggbmFtZSApO1xyXG5cdHBpRGF0YS5wZW5zWyBuYW1lIF0gPSB7XHJcblx0XHRcImNtZFwiOiBmbixcclxuXHRcdFwiY2FwXCI6IGNhcFxyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgYSBibGVuZCBjb21tYW5kXHJcbiAqIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIEJsZW5kIG1vZGUgbmFtZVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiAtIEJsZW5kIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYWRkQmxlbmRDb21tYW5kKCBuYW1lLCBmbiApIHtcclxuXHRwaURhdGEuYmxlbmRDb21tYW5kc0xpc3QucHVzaCggbmFtZSApO1xyXG5cdHBpRGF0YS5ibGVuZENvbW1hbmRzWyBuYW1lIF0gPSBmbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFByb2Nlc3MgY29tbWFuZHMgYW5kIGNyZWF0ZSBBUEkgbWV0aG9kc1xyXG4gKiBcclxuICogQHBhcmFtIHtPYmplY3R9IGFwaSAtIEFQSSBvYmplY3QgdG8gYWRkIG1ldGhvZHMgdG9cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzQ29tbWFuZHMoIGFwaSApIHtcclxuXHQvLyBBbHBoYWJldGl6ZSBjb21tYW5kc1xyXG5cdGNvbW1hbmRMaXN0LnNvcnQoICggYSwgYiApID0+IHtcclxuXHRcdGNvbnN0IG5hbWVBID0gYS5uYW1lLnRvVXBwZXJDYXNlKCk7XHJcblx0XHRjb25zdCBuYW1lQiA9IGIubmFtZS50b1VwcGVyQ2FzZSgpO1xyXG5cdFx0aWYoIG5hbWVBIDwgbmFtZUIgKSB7XHJcblx0XHRcdHJldHVybiAtMTtcclxuXHRcdH1cclxuXHRcdGlmKCBuYW1lQSA+IG5hbWVCICkge1xyXG5cdFx0XHRyZXR1cm4gMTtcclxuXHRcdH1cclxuXHRcdHJldHVybiAwO1xyXG5cdH0gKTtcclxuXHJcblx0Zm9yKCBjb25zdCBjbWQgb2YgY29tbWFuZExpc3QgKSB7XHJcblx0XHRwcm9jZXNzQ29tbWFuZCggYXBpLCBjbWQgKTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIGEgc2luZ2xlIGNvbW1hbmQgYW5kIGFkZCB0byBBUElcclxuICogXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBhcGkgLSBBUEkgb2JqZWN0XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBjbWQgLSBDb21tYW5kIGRlZmluaXRpb25cclxuICovXHJcbmZ1bmN0aW9uIHByb2Nlc3NDb21tYW5kKCBhcGksIGNtZCApIHtcclxuXHRpZiggY21kLmlzU2V0ICkge1xyXG5cdFx0cGlEYXRhLnNjcmVlbkNvbW1hbmRzWyBjbWQubmFtZSBdID0gY21kO1xyXG5cdFx0YXBpWyBjbWQubmFtZSBdID0gZnVuY3Rpb24oIC4uLmFyZ3MgKSB7XHJcblx0XHRcdGNvbnN0IHBhcnNlZEFyZ3MgPSBwYXJzZU9wdGlvbnMoIGNtZCwgYXJncyApO1xyXG5cdFx0XHRyZXR1cm4gcGlEYXRhLmNvbW1hbmRzWyBjbWQubmFtZSBdKCBudWxsLCBwYXJzZWRBcmdzICk7XHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0aWYoIGNtZC5pc1NjcmVlbiApIHtcclxuXHRcdHBpRGF0YS5zY3JlZW5Db21tYW5kc1sgY21kLm5hbWUgXSA9IGNtZDtcclxuXHRcdGFwaVsgY21kLm5hbWUgXSA9IGZ1bmN0aW9uKCAuLi5hcmdzICkge1xyXG5cdFx0XHRjb25zdCBwYXJzZWRBcmdzID0gcGFyc2VPcHRpb25zKCBjbWQsIGFyZ3MgKTtcclxuXHRcdFx0Y29uc3Qgc2NyZWVuRGF0YSA9IGdldFNjcmVlbkRhdGEoIHVuZGVmaW5lZCwgY21kLm5hbWUgKTtcclxuXHRcdFx0aWYoIHNjcmVlbkRhdGEgIT09IGZhbHNlICkge1xyXG5cdFx0XHRcdHJldHVybiBwaURhdGEuY29tbWFuZHNbIGNtZC5uYW1lIF0oIHNjcmVlbkRhdGEsIHBhcnNlZEFyZ3MgKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0YXBpWyBjbWQubmFtZSBdID0gZnVuY3Rpb24oIC4uLmFyZ3MgKSB7XHJcblx0XHRcdGNvbnN0IHBhcnNlZEFyZ3MgPSBwYXJzZU9wdGlvbnMoIGNtZCwgYXJncyApO1xyXG5cdFx0XHRyZXR1cm4gcGlEYXRhLmNvbW1hbmRzWyBjbWQubmFtZSBdKCBwYXJzZWRBcmdzICk7XHJcblx0XHR9O1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBzY3JlZW4gZGF0YSBmb3IgY29tbWFuZCBleGVjdXRpb25cclxuICogXHJcbiAqIEBwYXJhbSB7bnVtYmVyfHVuZGVmaW5lZH0gc2NyZWVuSWQgLSBTY3JlZW4gSUQgb3IgdW5kZWZpbmVkIGZvciBhY3RpdmUgc2NyZWVuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb21tYW5kTmFtZSAtIENvbW1hbmQgbmFtZSBmb3IgZXJyb3IgbWVzc2FnZXNcclxuICogQHJldHVybnMge09iamVjdHxib29sZWFufSBTY3JlZW4gZGF0YSBvciBmYWxzZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNjcmVlbkRhdGEoIHNjcmVlbklkLCBjb21tYW5kTmFtZSApIHtcclxuXHRpZiggcGlEYXRhLmFjdGl2ZVNjcmVlbiA9PT0gbnVsbCApIHtcclxuXHRcdGlmKCBjb21tYW5kTmFtZSA9PT0gXCJzZXRcIiApIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVzZSBuYXRpdmUgRXJyb3IgZm9yIG1pc3Npbmcgc2NyZWVuXHJcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvciggYCR7Y29tbWFuZE5hbWV9OiBObyBzY3JlZW5zIGF2YWlsYWJsZSBmb3IgY29tbWFuZC5gICk7XHJcblx0XHRlcnJvci5jb2RlID0gXCJOT19TQ1JFRU5cIjtcclxuXHRcdHRocm93IGVycm9yO1xyXG5cdH1cclxuXHJcblx0aWYoIHNjcmVlbklkID09PSB1bmRlZmluZWQgfHwgc2NyZWVuSWQgPT09IG51bGwgKSB7XHJcblx0XHRzY3JlZW5JZCA9IHBpRGF0YS5hY3RpdmVTY3JlZW4uaWQ7XHJcblx0fVxyXG5cclxuXHRpZiggdXRpbHMuaXNJbnRlZ2VyKCBzY3JlZW5JZCApICYmICFwaURhdGEuc2NyZWVuc1sgc2NyZWVuSWQgXSApIHtcclxuXHRcdC8vIFVzZSBuYXRpdmUgRXJyb3IgZm9yIGludmFsaWQgc2NyZWVuIElEXHJcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvciggYCR7Y29tbWFuZE5hbWV9OiBJbnZhbGlkIHNjcmVlbiBpZC5gICk7XHJcblx0XHRlcnJvci5jb2RlID0gXCJJTlZBTElEX1NDUkVFTl9JRFwiO1xyXG5cdFx0dGhyb3cgZXJyb3I7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gcGlEYXRhLnNjcmVlbnNbIHNjcmVlbklkIF07XHJcbn1cclxuXHJcbiIsICIvKipcbiAqIFBpLmpzIC0gQ29yZSBDb21tYW5kcyBNb2R1bGVcbiAqIFxuICogQ29yZSBzeXN0ZW0gY29tbWFuZHMgaW5jbHVkaW5nIHNjcmVlbiBtYW5hZ2VtZW50IGFuZCBnbG9iYWwgc2V0dGluZ3MuXG4gKiBcbiAqIEBtb2R1bGUgbW9kdWxlcy9jb3JlLWNvbW1hbmRzXG4gKi9cblxuaW1wb3J0IHsgZ2V0U2NyZWVuRGF0YSB9IGZyb20gXCIuLi9jb3JlL2NvbW1hbmQtc3lzdGVtLmpzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KCBwaSApIHtcblx0Y29uc3QgcGlEYXRhID0gcGkuXy5kYXRhO1xuXG5cdC8vIFNldCB0aGUgYWN0aXZlIHNjcmVlblxuXHRwaS5fLmFkZENvbW1hbmQoIFwic2V0U2NyZWVuXCIsIHNldFNjcmVlbiwgZmFsc2UsIGZhbHNlLCBbIFwic2NyZWVuXCIgXSApO1xuXHRwaS5fLmFkZFNldHRpbmcoIFwic2NyZWVuXCIsIHNldFNjcmVlbiwgZmFsc2UsIFsgXCJzY3JlZW5cIiBdICk7XG5cblx0ZnVuY3Rpb24gc2V0U2NyZWVuKCBhcmdzICkge1xuXHRcdGNvbnN0IHNjcmVlbk9iaiA9IGFyZ3NbIDAgXTtcblx0XHRsZXQgc2NyZWVuSWQ7XG5cblx0XHRpZiggcGkudXRpbC5pc0ludGVnZXIoIHNjcmVlbk9iaiApICkge1xuXHRcdFx0c2NyZWVuSWQgPSBzY3JlZW5PYmo7XG5cdFx0fSBlbHNlIGlmKCBzY3JlZW5PYmogJiYgcGkudXRpbC5pc0ludGVnZXIoIHNjcmVlbk9iai5pZCApICkge1xuXHRcdFx0c2NyZWVuSWQgPSBzY3JlZW5PYmouaWQ7XG5cdFx0fVxuXG5cdFx0aWYoICFwaURhdGEuc2NyZWVuc1sgc2NyZWVuSWQgXSApIHtcblx0XHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKCBcInNjcmVlbjogSW52YWxpZCBzY3JlZW4uXCIgKTtcblx0XHRcdGVycm9yLmNvZGUgPSBcIklOVkFMSURfU0NSRUVOXCI7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cblx0XHRwaURhdGEuYWN0aXZlU2NyZWVuID0gcGlEYXRhLnNjcmVlbnNbIHNjcmVlbklkIF07XG5cdH1cblxuXHQvLyBSZW1vdmUgYWxsIHNjcmVlbnMgZnJvbSB0aGUgcGFnZSBhbmQgbWVtb3J5XG5cdHBpLl8uYWRkQ29tbWFuZCggXCJyZW1vdmVBbGxTY3JlZW5zXCIsIHJlbW92ZUFsbFNjcmVlbnMsIGZhbHNlLCBmYWxzZSwgW10gKTtcblxuXHRmdW5jdGlvbiByZW1vdmVBbGxTY3JlZW5zKCkge1xuXHRcdGZvciggY29uc3QgaSBpbiBwaURhdGEuc2NyZWVucyApIHtcblx0XHRcdGNvbnN0IHNjcmVlbkRhdGEgPSBwaURhdGEuc2NyZWVuc1sgaSBdO1xuXHRcdFx0c2NyZWVuRGF0YS5zY3JlZW5PYmoucmVtb3ZlU2NyZWVuKCk7XG5cdFx0fVxuXHRcdHBpRGF0YS5uZXh0U2NyZWVuSWQgPSAwO1xuXHR9XG5cblx0Ly8gR2V0IHNjcmVlbiBieSBJRFxuXHRwaS5fLmFkZENvbW1hbmQoIFwiZ2V0U2NyZWVuXCIsIGdldFNjcmVlbiwgZmFsc2UsIGZhbHNlLCBbIFwic2NyZWVuSWRcIiBdICk7XG5cblx0ZnVuY3Rpb24gZ2V0U2NyZWVuKCBhcmdzICkge1xuXHRcdGNvbnN0IHNjcmVlbklkID0gYXJnc1sgMCBdO1xuXHRcdGNvbnN0IHNjcmVlbiA9IGdldFNjcmVlbkRhdGEoIHNjcmVlbklkLCBcImdldFNjcmVlblwiICk7XG5cdFx0cmV0dXJuIHNjcmVlbi5zY3JlZW5PYmo7XG5cdH1cblxuXHQvLyBTZXQgdGhlIGRlZmF1bHQgY29sb3Jcblx0cGkuXy5hZGRDb21tYW5kKCBcInNldERlZmF1bHRDb2xvclwiLCBzZXREZWZhdWx0Q29sb3IsIGZhbHNlLCBmYWxzZSwgWyBcImNvbG9yXCIgXSApO1xuXHRwaS5fLmFkZFNldHRpbmcoIFwiZGVmYXVsdENvbG9yXCIsIHNldERlZmF1bHRDb2xvciwgZmFsc2UsIFsgXCJjb2xvclwiIF0gKTtcblxuXHRmdW5jdGlvbiBzZXREZWZhdWx0Q29sb3IoIGFyZ3MgKSB7XG5cdFx0bGV0IGMgPSBhcmdzWyAwIF07XG5cblx0XHRpZiggIWlzTmFOKCBOdW1iZXIoIGMgKSApICYmIHBpRGF0YS5kZWZhdWx0UGFsZXR0ZS5sZW5ndGggPiBjICkge1xuXHRcdFx0cGlEYXRhLmRlZmF1bHRDb2xvciA9IGM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGMgPSBwaS51dGlsLmNvbnZlcnRUb0NvbG9yKCBjICk7XG5cdFx0XHRpZiggYyA9PT0gbnVsbCApIHtcblx0XHRcdFx0Y29uc3QgZXJyb3IgPSBuZXcgVHlwZUVycm9yKFxuXHRcdFx0XHRcdFwic2V0RGVmYXVsdENvbG9yOiBpbnZhbGlkIGNvbG9yIHZhbHVlIGZvciBwYXJhbWV0ZXIgY29sb3IuXCJcblx0XHRcdFx0KTtcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwiSU5WQUxJRF9DT0xPUlwiO1xuXHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHRcdHBpRGF0YS5kZWZhdWx0Q29sb3IgPSBjO1xuXHRcdH1cblx0fVxuXG5cdC8vIFNldCB0aGUgZGVmYXVsdCBwYWxldHRlXG5cdHBpLl8uYWRkQ29tbWFuZCggXCJzZXREZWZhdWx0UGFsXCIsIHNldERlZmF1bHRQYWwsIGZhbHNlLCBmYWxzZSwgWyBcInBhbFwiIF0gKTtcblx0cGkuXy5hZGRTZXR0aW5nKCBcImRlZmF1bHRQYWxcIiwgc2V0RGVmYXVsdFBhbCwgZmFsc2UsIFsgXCJwYWxcIiBdICk7XG5cblx0ZnVuY3Rpb24gc2V0RGVmYXVsdFBhbCggYXJncyApIHtcblx0XHRjb25zdCBwYWwgPSBhcmdzWyAwIF07XG5cblx0XHRpZiggIXBpLnV0aWwuaXNBcnJheSggcGFsICkgKSB7XG5cdFx0XHRjb25zdCBlcnJvciA9IG5ldyBUeXBlRXJyb3IoIFwic2V0RGVmYXVsdFBhbDogcGFyYW1ldGVyIHBhbCBpcyBub3QgYW4gYXJyYXkuXCIgKTtcblx0XHRcdGVycm9yLmNvZGUgPSBcIklOVkFMSURfUEFSQU1FVEVSXCI7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cblx0XHRpZiggcGFsLmxlbmd0aCA8IDEgKSB7XG5cdFx0XHRjb25zdCBlcnJvciA9IG5ldyBSYW5nZUVycm9yKFxuXHRcdFx0XHRcInNldERlZmF1bHRQYWw6IHBhcmFtZXRlciBwYWwgbXVzdCBoYXZlIGF0IGxlYXN0IG9uZSBjb2xvciB2YWx1ZS5cIlxuXHRcdFx0KTtcblx0XHRcdGVycm9yLmNvZGUgPSBcIkVNUFRZX1BBTEVUVEVcIjtcblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH1cblxuXHRcdHBpRGF0YS5kZWZhdWx0UGFsZXR0ZSA9IFtdO1xuXG5cdFx0aWYoIHBhbC5sZW5ndGggPiAxICkge1xuXHRcdFx0cGlEYXRhLmRlZmF1bHRDb2xvciA9IDE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBpRGF0YS5kZWZhdWx0Q29sb3IgPSAwO1xuXHRcdH1cblxuXHRcdGZvciggbGV0IGkgPSAwOyBpIDwgcGFsLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0Y29uc3QgYyA9IHBpLnV0aWwuY29udmVydFRvQ29sb3IoIHBhbFsgaSBdICk7XG5cdFx0XHRpZiggYyA9PT0gbnVsbCApIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKCBcInNldERlZmF1bHRQYWw6IGludmFsaWQgY29sb3IgdmFsdWUgaW5zaWRlIGFycmF5IHBhbC5cIiApO1xuXHRcdFx0XHRwaURhdGEuZGVmYXVsdFBhbGV0dGUucHVzaCggcGkudXRpbC5jb252ZXJ0VG9Db2xvciggXCIjMDAwMDAwXCIgKSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGlEYXRhLmRlZmF1bHRQYWxldHRlLnB1c2goIGMgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTZXQgY29sb3IgMCB0byB0cmFuc3BhcmVudFxuXHRcdGNvbnN0IGZpcnN0Q29sb3IgPSBwaURhdGEuZGVmYXVsdFBhbGV0dGVbIDAgXTtcblx0XHRwaURhdGEuZGVmYXVsdFBhbGV0dGVbIDAgXSA9IHBpLnV0aWwuY29udmVydFRvQ29sb3IoIFtcblx0XHRcdGZpcnN0Q29sb3Iucixcblx0XHRcdGZpcnN0Q29sb3IuZyxcblx0XHRcdGZpcnN0Q29sb3IuYixcblx0XHRcdDBcblx0XHRdICk7XG5cdH1cblxuXHQvLyBHZXQgZGVmYXVsdCBwYWxldHRlXG5cdHBpLl8uYWRkQ29tbWFuZCggXCJnZXREZWZhdWx0UGFsXCIsIGdldERlZmF1bHRQYWwsIGZhbHNlLCBmYWxzZSwgW10gKTtcblxuXHRmdW5jdGlvbiBnZXREZWZhdWx0UGFsKCkge1xuXHRcdGNvbnN0IGNvbG9ycyA9IFtdO1xuXHRcdGZvciggY29uc3QgY29sb3Igb2YgcGlEYXRhLmRlZmF1bHRQYWxldHRlICkge1xuXHRcdFx0Y29sb3JzLnB1c2goIGNvbG9yICk7XG5cdFx0fVxuXHRcdHJldHVybiBjb2xvcnM7XG5cdH1cblxuXHQvLyBTZXQgdGhlIGRlZmF1bHQgaW5wdXQgZm9jdXMgZWxlbWVudFxuXHRwaS5fLmFkZENvbW1hbmQoIFwic2V0RGVmYXVsdElucHV0Rm9jdXNcIiwgc2V0RGVmYXVsdElucHV0Rm9jdXMsIGZhbHNlLCBmYWxzZSwgWyBcImVsZW1lbnRcIiBdICk7XG5cdHBpLl8uYWRkU2V0dGluZyggXCJkZWZhdWx0SW5wdXRGb2N1c1wiLCBzZXREZWZhdWx0SW5wdXRGb2N1cywgZmFsc2UsIFsgXCJlbGVtZW50XCIgXSApO1xuXG5cdGZ1bmN0aW9uIHNldERlZmF1bHRJbnB1dEZvY3VzKCBhcmdzICkge1xuXHRcdGxldCBlbGVtZW50ID0gYXJnc1sgMCBdO1xuXG5cdFx0aWYoIHR5cGVvZiBlbGVtZW50ID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0ZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBlbGVtZW50ICk7XG5cdFx0fVxuXG5cdFx0aWYoICFlbGVtZW50IHx8ICFwaS51dGlsLmNhbkFkZEV2ZW50TGlzdGVuZXJzKCBlbGVtZW50ICkgKSB7XG5cdFx0XHRjb25zdCBlcnJvciA9IG5ldyBUeXBlRXJyb3IoXG5cdFx0XHRcdFwic2V0RGVmYXVsdElucHV0Rm9jdXM6IEludmFsaWQgYXJndW1lbnQgZWxlbWVudC4gXCIgK1xuXHRcdFx0XHRcIkVsZW1lbnQgbXVzdCBiZSBhIERPTSBlbGVtZW50IG9yIHN0cmluZyBpZCBvZiBhIERPTSBlbGVtZW50LlwiXG5cdFx0XHQpO1xuXHRcdFx0ZXJyb3IuY29kZSA9IFwiSU5WQUxJRF9FTEVNRU5UXCI7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cblx0XHRpZiggISggZWxlbWVudC50YWJJbmRleCA+PSAwICkgKSB7XG5cdFx0XHRlbGVtZW50LnRhYkluZGV4ID0gMDtcblx0XHR9XG5cblx0XHRwaURhdGEuZGVmYXVsdElucHV0Rm9jdXMgPSBlbGVtZW50O1xuXG5cdFx0Ly8gUmVpbml0aWFsaXplIGtleWJvYXJkIGlmIGNvbW1hbmQgZXhpc3RzXG5cdFx0aWYoIHBpRGF0YS5jb21tYW5kc1sgXCJyZWluaXRLZXlib2FyZFwiIF0gKSB7XG5cdFx0XHRwaURhdGEuY29tbWFuZHNbIFwicmVpbml0S2V5Ym9hcmRcIiBdKCk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gR2xvYmFsIHNldHRpbmdzIGNvbW1hbmRcblx0cGkuXy5hZGRDb21tYW5kKCBcInNldFwiLCBzZXQsIGZhbHNlLCB0cnVlLCBwaURhdGEuc2V0dGluZ3NMaXN0LCB0cnVlICk7XG5cblx0ZnVuY3Rpb24gc2V0KCBzY3JlZW5EYXRhLCBhcmdzICkge1xuXHRcdGNvbnN0IG9wdGlvbnMgPSBhcmdzWyAwIF07XG5cblx0XHQvLyBMb29wIHRocm91Z2ggYWxsIHRoZSBvcHRpb25zXG5cdFx0Zm9yKCBjb25zdCBvcHRpb25OYW1lIGluIG9wdGlvbnMgKSB7XG5cdFx0XHRcblx0XHRcdC8vIElmIHRoZSBvcHRpb24gaXMgYSB2YWxpZCBzZXR0aW5nXG5cdFx0XHRpZiggcGlEYXRhLnNldHRpbmdzWyBvcHRpb25OYW1lIF0gKSB7XG5cblx0XHRcdFx0Ly8gR2V0IHRoZSBzZXR0aW5nIGRhdGFcblx0XHRcdFx0Y29uc3Qgc2V0dGluZyA9IHBpRGF0YS5zZXR0aW5nc1sgb3B0aW9uTmFtZSBdO1xuXG5cdFx0XHRcdC8vIFBhcnNlIHRoZSBvcHRpb25zIGZyb20gdGhlIHNldHRpbmdcblx0XHRcdFx0bGV0IG9wdGlvblZhbHVlcyA9IG9wdGlvbnNbIG9wdGlvbk5hbWUgXTtcblxuXHRcdFx0XHRpZihcblx0XHRcdFx0XHQhcGkudXRpbC5pc0FycmF5KCBvcHRpb25WYWx1ZXMgKSAmJlxuXHRcdFx0XHRcdHR5cGVvZiBvcHRpb25WYWx1ZXMgPT09IFwib2JqZWN0XCJcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0b3B0aW9uVmFsdWVzID0gcGkuXy5wYXJzZU9wdGlvbnMoIHNldHRpbmcsIFsgb3B0aW9uVmFsdWVzIF0gKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRvcHRpb25WYWx1ZXMgPSBbIG9wdGlvblZhbHVlcyBdO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ2FsbCB0aGUgc2V0dGluZyBmdW5jdGlvblxuXHRcdFx0XHRpZiggc2V0dGluZy5pc1NjcmVlbiApIHtcblx0XHRcdFx0XHRpZiggIXNjcmVlbkRhdGEgKSB7XG5cdFx0XHRcdFx0XHRzY3JlZW5EYXRhID0gZ2V0U2NyZWVuRGF0YSggdW5kZWZpbmVkLCBgc2V0ICR7c2V0dGluZy5uYW1lfWAgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c2V0dGluZy5mbiggc2NyZWVuRGF0YSwgb3B0aW9uVmFsdWVzICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2V0dGluZy5mbiggb3B0aW9uVmFsdWVzICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuIiwgIi8qKlxuICogUGkuanMgLSBTY3JlZW4gSGVscGVyIEZ1bmN0aW9ucyBNb2R1bGVcbiAqIFxuICogSGVscGVyIGZ1bmN0aW9ucyBmb3Igc2NyZWVuIG9wZXJhdGlvbnMsIGNvbG9yIHJlc29sdXRpb24sIHBpeGVsIG9wZXJhdGlvbnMsXG4gKiBibGVuZCBtb2RlcywgYW5kIHBlbiBkcmF3aW5nLlxuICogXG4gKiBAbW9kdWxlIG1vZHVsZXMvc2NyZWVuLWhlbHBlclxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KCBwaSApIHtcblx0Y29uc3QgcGlEYXRhID0gcGkuXy5kYXRhO1xuXG5cdC8vIEJsZW5kIENvbW1hbmRzXG5cblx0cGkuXy5hZGRCbGVuZENvbW1hbmQoIFwibm9ybWFsXCIsIG5vcm1hbEJsZW5kICk7XG5cblx0ZnVuY3Rpb24gbm9ybWFsQmxlbmQoIHNjcmVlbkRhdGEsIHgsIHksIGMgKSB7XG5cdFx0Y29uc3QgZGF0YSA9IHNjcmVlbkRhdGEuaW1hZ2VEYXRhLmRhdGE7XG5cblx0XHQvLyBDYWxjdWxhdGUgdGhlIGluZGV4XG5cdFx0Y29uc3QgaSA9ICggKCBzY3JlZW5EYXRhLndpZHRoICogeSApICsgeCApICogNDtcblxuXHRcdGRhdGFbIGkgXSA9IGMucjtcblx0XHRkYXRhWyBpICsgMSBdID0gYy5nO1xuXHRcdGRhdGFbIGkgKyAyIF0gPSBjLmI7XG5cdFx0ZGF0YVsgaSArIDMgXSA9IGMuYTtcblx0fVxuXG5cdHBpLl8uYWRkQmxlbmRDb21tYW5kKCBcImJsZW5kXCIsIGJsZW5kUGl4ZWwgKTtcblxuXHRmdW5jdGlvbiBibGVuZFBpeGVsKCBzY3JlZW5EYXRhLCB4LCB5LCBjICkge1xuXHRcdGNvbnN0IGRhdGEgPSBzY3JlZW5EYXRhLmltYWdlRGF0YS5kYXRhO1xuXG5cdFx0Ly8gQ2FsY3VsYXRlIHRoZSBpbmRleFxuXHRcdGNvbnN0IGkgPSAoICggc2NyZWVuRGF0YS53aWR0aCAqIHkgKSArIHggKSAqIDQ7XG5cblx0XHQvLyBkaXNwbGF5Q29sb3IgPSBzb3VyY2VDb2xvciBcdTAwRDcgYWxwaGEgLyAyNTUgKyBiYWNrZ3JvdW5kQ29sb3IgXHUwMEQ3ICgyNTUgXHUyMDEzIGFscGhhKSAvIDI1NVxuXHRcdC8vIGJsZW5kID0gKCBzb3VyY2UgKiBzb3VyY2VfYWxwaGEpICsgZGVzdGluYXRpb24gKiAoIDEgLSBzb3VyY2VfYWxwaGEpXG5cdFx0Y29uc3QgcGN0ID0gYy5hIC8gMjU1O1xuXHRcdGNvbnN0IHBjdDIgPSAoIDI1NSAtIGMuYSApIC8gMjU1O1xuXG5cdFx0ZGF0YVsgaSBdID0gKCBjLnIgKiBwY3QgKSArIGRhdGFbIGkgXSAqIHBjdDI7XG5cdFx0ZGF0YVsgaSArIDEgXSA9ICggYy5nICogcGN0ICkgKyBkYXRhWyBpICsgMSBdICogcGN0Mjtcblx0XHRkYXRhWyBpICsgMiBdID0gKCBjLmIgKiBwY3QgKSArIGRhdGFbIGkgKyAyIF0gKiBwY3QyO1xuXHR9XG5cblx0Ly8gSW1hZ2VEYXRhIEhlbHBlcnNcblxuXHRwaS5fLmFkZENvbW1hbmQoIFwiZ2V0SW1hZ2VEYXRhXCIsIGdldEltYWdlRGF0YSwgdHJ1ZSwgZmFsc2UgKTtcblxuXHRmdW5jdGlvbiBnZXRJbWFnZURhdGEoIHNjcmVlbkRhdGEgKSB7XG5cdFx0aWYoIHNjcmVlbkRhdGEuZGlydHkgPT09IGZhbHNlIHx8IHNjcmVlbkRhdGEuaW1hZ2VEYXRhID09PSBudWxsICkge1xuXHRcdFx0c2NyZWVuRGF0YS5pbWFnZURhdGEgPSBzY3JlZW5EYXRhLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKFxuXHRcdFx0XHQwLCAwLCBzY3JlZW5EYXRhLndpZHRoLCBzY3JlZW5EYXRhLmhlaWdodFxuXHRcdFx0KTtcblx0XHR9XG5cdH1cblxuXHRwaS5fLmFkZENvbW1hbmQoIFwicmVzZXRJbWFnZURhdGFcIiwgcmVzZXRJbWFnZURhdGEsIHRydWUsIGZhbHNlICk7XG5cblx0ZnVuY3Rpb24gcmVzZXRJbWFnZURhdGEoIHNjcmVlbkRhdGEgKSB7XG5cdFx0c2NyZWVuRGF0YS5pbWFnZURhdGEgPSBudWxsO1xuXHR9XG5cblx0cGkuXy5hZGRDb21tYW5kKCBcInNldEltYWdlRGlydHlcIiwgc2V0SW1hZ2VEaXJ0eSwgdHJ1ZSwgZmFsc2UgKTtcblxuXHRmdW5jdGlvbiBzZXRJbWFnZURpcnR5KCBzY3JlZW5EYXRhICkge1xuXHRcdGlmKCBzY3JlZW5EYXRhLmRpcnR5ID09PSBmYWxzZSApIHtcblx0XHRcdHNjcmVlbkRhdGEuZGlydHkgPSB0cnVlO1xuXG5cdFx0XHRpZihcblx0XHRcdFx0c2NyZWVuRGF0YS5pc0F1dG9SZW5kZXIgJiZcblx0XHRcdFx0IXNjcmVlbkRhdGEuYXV0b1JlbmRlck1pY3JvdGFza1NjaGVkdWxlZFxuXHRcdFx0KSB7XG5cdFx0XHRcdHNjcmVlbkRhdGEuYXV0b1JlbmRlck1pY3JvdGFza1NjaGVkdWxlZCA9IHRydWU7XG5cblx0XHRcdFx0cGkudXRpbC5xdWV1ZU1pY3JvdGFzayggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYoIHNjcmVlbkRhdGEuc2NyZWVuT2JqICYmIHNjcmVlbkRhdGEuaXNBdXRvUmVuZGVyICkge1xuXHRcdFx0XHRcdFx0c2NyZWVuRGF0YS5zY3JlZW5PYmoucmVuZGVyKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHNjcmVlbkRhdGEuYXV0b1JlbmRlck1pY3JvdGFza1NjaGVkdWxlZCA9IGZhbHNlO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUGl4ZWwgT3BlcmF0aW9uc1xuXG5cdHBpLl8uYWRkQ29tbWFuZCggXCJzZXRQaXhlbFwiLCBzZXRQaXhlbCwgdHJ1ZSwgZmFsc2UgKTtcblxuXHRmdW5jdGlvbiBzZXRQaXhlbCggc2NyZWVuRGF0YSwgeCwgeSwgYyApIHtcblx0XHRzY3JlZW5EYXRhLmJsZW5kUGl4ZWxDbWQoIHNjcmVlbkRhdGEsIHgsIHksIGMgKTtcblx0fVxuXG5cdHBpLl8uYWRkQ29tbWFuZCggXCJzZXRQaXhlbFNhZmVcIiwgc2V0UGl4ZWxTYWZlLCB0cnVlLCBmYWxzZSApO1xuXHRwaS5fLmFkZFBlbiggXCJwaXhlbFwiLCBzZXRQaXhlbFNhZmUsIFwic3F1YXJlXCIgKTtcblxuXHRmdW5jdGlvbiBzZXRQaXhlbFNhZmUoIHNjcmVlbkRhdGEsIHgsIHksIGMgKSB7XG5cdFx0aWYoIHggPCAwIHx8IHggPj0gc2NyZWVuRGF0YS53aWR0aCB8fCB5IDwgMCB8fCB5ID49IHNjcmVlbkRhdGEuaGVpZ2h0ICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHBpRGF0YS5jb21tYW5kcy5nZXRJbWFnZURhdGEoIHNjcmVlbkRhdGEgKTtcblx0XHRjID0gZ2V0UGl4ZWxDb2xvciggc2NyZWVuRGF0YSwgYyApO1xuXHRcdHNjcmVlbkRhdGEuYmxlbmRQaXhlbENtZCggc2NyZWVuRGF0YSwgeCwgeSwgYyApO1xuXHRcdHBpRGF0YS5jb21tYW5kcy5zZXRJbWFnZURpcnR5KCBzY3JlZW5EYXRhICk7XG5cdH1cblxuXHRwaS5fLmFkZENvbW1hbmQoIFwiZ2V0UGl4ZWxDb2xvclwiLCBnZXRQaXhlbENvbG9yLCB0cnVlLCBmYWxzZSApO1xuXG5cdGZ1bmN0aW9uIGdldFBpeGVsQ29sb3IoIHNjcmVlbkRhdGEsIGMgKSB7XG5cdFx0Y29uc3Qgbm9pc2UgPSBzY3JlZW5EYXRhLnBlbi5ub2lzZTtcblxuXHRcdGlmKCAhbm9pc2UgKSB7XG5cdFx0XHRyZXR1cm4gYztcblx0XHR9XG5cblx0XHRjb25zdCBjMiA9IHsgXCJyXCI6IGMuciwgXCJnXCI6IGMuZywgXCJiXCI6IGMuYiwgXCJhXCI6IGMuYSB9O1xuXHRcdGNvbnN0IGhhbGYgPSBub2lzZSAvIDI7XG5cblx0XHRpZiggcGkudXRpbC5pc0FycmF5KCBub2lzZSApICkge1xuXHRcdFx0YzIuciA9IHBpLnV0aWwuY2xhbXAoXG5cdFx0XHRcdE1hdGgucm91bmQoIGMyLnIgKyBwaS51dGlsLnJuZFJhbmdlKCAtbm9pc2VbIDAgXSwgbm9pc2VbIDAgXSApICksXG5cdFx0XHRcdDAsIDI1NVxuXHRcdFx0KTtcblx0XHRcdGMyLmcgPSBwaS51dGlsLmNsYW1wKFxuXHRcdFx0XHRNYXRoLnJvdW5kKCBjMi5nICsgcGkudXRpbC5ybmRSYW5nZSggLW5vaXNlWyAxIF0sIG5vaXNlWyAxIF0gKSApLFxuXHRcdFx0XHQwLCAyNTVcblx0XHRcdCk7XG5cdFx0XHRjMi5iID0gcGkudXRpbC5jbGFtcChcblx0XHRcdFx0TWF0aC5yb3VuZCggYzIuYiArIHBpLnV0aWwucm5kUmFuZ2UoIC1ub2lzZVsgMiBdLCBub2lzZVsgMiBdICkgKSxcblx0XHRcdFx0MCwgMjU1XG5cdFx0XHQpO1xuXHRcdFx0YzIuYSA9IHBpLnV0aWwuY2xhbXAoXG5cdFx0XHRcdGMyLmEgKyBwaS51dGlsLnJuZFJhbmdlKCAtbm9pc2VbIDMgXSwgbm9pc2VbIDMgXSApLFxuXHRcdFx0XHQwLCAyNTVcblx0XHRcdCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGNoYW5nZSA9IE1hdGgucm91bmQoIE1hdGgucmFuZG9tKCkgKiBub2lzZSAtIGhhbGYgKTtcblx0XHRcdGMyLnIgPSBwaS51dGlsLmNsYW1wKCBjMi5yICsgY2hhbmdlLCAwLCAyNTUgKTtcblx0XHRcdGMyLmcgPSBwaS51dGlsLmNsYW1wKCBjMi5nICsgY2hhbmdlLCAwLCAyNTUgKTtcblx0XHRcdGMyLmIgPSBwaS51dGlsLmNsYW1wKCBjMi5iICsgY2hhbmdlLCAwLCAyNTUgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYzI7XG5cdH1cblxuXHQvLyBQZW4gRHJhd2luZyBGdW5jdGlvbnNcblxuXHRwaS5fLmFkZENvbW1hbmQoIFwiZHJhd1NxdWFyZVBlblwiLCBkcmF3U3F1YXJlUGVuLCB0cnVlLCBmYWxzZSApO1xuXHRwaS5fLmFkZFBlbiggXCJzcXVhcmVcIiwgZHJhd1NxdWFyZVBlbiwgXCJzcXVhcmVcIiApO1xuXG5cdGZ1bmN0aW9uIGRyYXdTcXVhcmVQZW4oIHNjcmVlbkRhdGEsIHgsIHksIGMgKSB7XG5cdFx0Ly8gU2l6ZSBtdXN0IGFsd2F5cyBiZSBhbiBvZGQgbnVtYmVyXG5cdFx0Y29uc3Qgc2l6ZSA9IHNjcmVlbkRhdGEucGVuLnNpemUgKiAyIC0gMTtcblxuXHRcdC8vIENvbXB1dGUgdGhlIGNlbnRlciBvZmZzZXQgb2YgdGhlIHNxdWFyZVxuXHRcdGNvbnN0IG9mZnNldCA9IE1hdGgucm91bmQoIHNpemUgLyAyICkgLSAxO1xuXG5cdFx0Ly8gRHJhdyB0aGUgc3F1YXJlXG5cdFx0Zm9yKCBsZXQgeTIgPSAwOyB5MiA8IHNpemU7IHkyKysgKSB7XG5cdFx0XHRmb3IoIGxldCB4MiA9IDA7IHgyIDwgc2l6ZTsgeDIrKyApIHtcblx0XHRcdFx0cGlEYXRhLmNvbW1hbmRzLnNldFBpeGVsU2FmZShcblx0XHRcdFx0XHRzY3JlZW5EYXRhLFxuXHRcdFx0XHRcdHgyICsgeCAtIG9mZnNldCxcblx0XHRcdFx0XHR5MiArIHkgLSBvZmZzZXQsXG5cdFx0XHRcdFx0Y1xuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHBpRGF0YS5jb21tYW5kcy5zZXRJbWFnZURpcnR5KCBzY3JlZW5EYXRhICk7XG5cdH1cblxuXHRwaS5fLmFkZENvbW1hbmQoIFwiZHJhd0NpcmNsZVBlblwiLCBkcmF3Q2lyY2xlUGVuLCB0cnVlLCBmYWxzZSApO1xuXHRwaS5fLmFkZFBlbiggXCJjaXJjbGVcIiwgZHJhd0NpcmNsZVBlbiwgXCJyb3VuZFwiICk7XG5cblx0ZnVuY3Rpb24gZHJhd0NpcmNsZVBlbiggc2NyZWVuRGF0YSwgeCwgeSwgYyApIHtcblx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIHBlbiBzaXplIDJcblx0XHRpZiggc2NyZWVuRGF0YS5wZW4uc2l6ZSA9PT0gMiApIHtcblx0XHRcdHBpRGF0YS5jb21tYW5kcy5zZXRQaXhlbFNhZmUoIHNjcmVlbkRhdGEsIHgsIHksIGMgKTtcblx0XHRcdHBpRGF0YS5jb21tYW5kcy5zZXRQaXhlbFNhZmUoIHNjcmVlbkRhdGEsIHggKyAxLCB5LCBjICk7XG5cdFx0XHRwaURhdGEuY29tbWFuZHMuc2V0UGl4ZWxTYWZlKCBzY3JlZW5EYXRhLCB4IC0gMSwgeSwgYyApO1xuXHRcdFx0cGlEYXRhLmNvbW1hbmRzLnNldFBpeGVsU2FmZSggc2NyZWVuRGF0YSwgeCwgeSArIDEsIGMgKTtcblx0XHRcdHBpRGF0YS5jb21tYW5kcy5zZXRQaXhlbFNhZmUoIHNjcmVlbkRhdGEsIHgsIHkgLSAxLCBjICk7XG5cdFx0XHRwaURhdGEuY29tbWFuZHMuc2V0SW1hZ2VEaXJ0eSggc2NyZWVuRGF0YSApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIERvdWJsZSBzaXplIHRvIGdldCB0aGUgc2l6ZSBvZiB0aGUgb3V0ZXIgYm94XG5cdFx0Y29uc3Qgc2l6ZSA9IHNjcmVlbkRhdGEucGVuLnNpemUgKiAyO1xuXG5cdFx0Ly8gSGFsZiBpcyBzaXplIG9mIHJhZGl1c1xuXHRcdGNvbnN0IGhhbGYgPSBzY3JlZW5EYXRhLnBlbi5zaXplO1xuXG5cdFx0Ly8gQ2FsY3VsYXRlIHRoZSBjZW50ZXIgb2YgY2lyY2xlXG5cdFx0Y29uc3Qgb2Zmc2V0ID0gaGFsZiAtIDE7XG5cblx0XHQvLyBMb29wIHRocm91Z2ggdGhlIHNxdWFyZSBib3VuZGFyeSBvdXRzaWRlIG9mIHRoZSBjaXJjbGVcblx0XHRmb3IoIGxldCB5MiA9IDA7IHkyIDwgc2l6ZTsgeTIrKyApIHtcblx0XHRcdGZvciggbGV0IHgyID0gMDsgeDIgPCBzaXplOyB4MisrICkge1xuXG5cdFx0XHRcdC8vIENvbXB1dGUgdGhlIGNvb3JkaW5hdGVzXG5cdFx0XHRcdGNvbnN0IHgzID0geDIgLSBvZmZzZXQ7XG5cdFx0XHRcdGNvbnN0IHkzID0geTIgLSBvZmZzZXQ7XG5cblx0XHRcdFx0Ly8gQ29tcHV0ZSB0aGUgcmFkaXVzIG9mIHBvaW50IC0gcm91bmQgdG8gbWFrZSBwaXhlbCBwZXJmZWN0XG5cdFx0XHRcdGNvbnN0IHIgPSBNYXRoLnJvdW5kKCBNYXRoLnNxcnQoIHgzICogeDMgKyB5MyAqIHkzICkgKTtcblxuXHRcdFx0XHQvLyBPbmx5IGRyYXcgdGhlIHBpeGVsIGlmIGl0IGlzIGluc2lkZSB0aGUgY2lyY2xlXG5cdFx0XHRcdGlmKCByIDwgaGFsZiApIHtcblx0XHRcdFx0XHRwaURhdGEuY29tbWFuZHMuc2V0UGl4ZWxTYWZlKCBzY3JlZW5EYXRhLCB4MyArIHgsIHkzICsgeSwgYyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cGlEYXRhLmNvbW1hbmRzLnNldEltYWdlRGlydHkoIHNjcmVlbkRhdGEgKTtcblx0fVxuXG5cdHBpLl8uYWRkQ29tbWFuZCggXCJnZXRQaXhlbEludGVybmFsXCIsIGdldFBpeGVsSW50ZXJuYWwsIHRydWUsIGZhbHNlICk7XG5cblx0ZnVuY3Rpb24gZ2V0UGl4ZWxJbnRlcm5hbCggc2NyZWVuRGF0YSwgeCwgeSApIHtcblx0XHRjb25zdCBkYXRhID0gc2NyZWVuRGF0YS5pbWFnZURhdGEuZGF0YTtcblxuXHRcdC8vIENhbGN1bGF0ZSB0aGUgaW5kZXggb2YgdGhlIGNvbG9yXG5cdFx0Y29uc3QgaSA9ICggKCBzY3JlZW5EYXRhLndpZHRoICogeSApICsgeCApICogNDtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRcInJcIjogZGF0YVsgaSBdLFxuXHRcdFx0XCJnXCI6IGRhdGFbIGkgKyAxIF0sXG5cdFx0XHRcImJcIjogZGF0YVsgaSArIDIgXSxcblx0XHRcdFwiYVwiOiBkYXRhWyBpICsgMyBdXG5cdFx0fTtcblx0fVxuXG5cdHBpLl8uYWRkQ29tbWFuZCggXCJnZXRQaXhlbFNhZmVcIiwgZ2V0UGl4ZWxTYWZlLCB0cnVlLCBmYWxzZSApO1xuXG5cdGZ1bmN0aW9uIGdldFBpeGVsU2FmZSggc2NyZWVuRGF0YSwgeCwgeSApIHtcblx0XHRwaURhdGEuY29tbWFuZHMuZ2V0SW1hZ2VEYXRhKCBzY3JlZW5EYXRhICk7XG5cdFx0cmV0dXJuIGdldFBpeGVsSW50ZXJuYWwoIHNjcmVlbkRhdGEsIHgsIHkgKTtcblx0fVxuXG5cdC8vIENvbG9yIFJlc29sdXRpb25cblxuXHRwaS5fLmFkZENvbW1hbmQoIFwiZmluZENvbG9yVmFsdWVcIiwgZmluZENvbG9yVmFsdWUsIHRydWUsIGZhbHNlICk7XG5cblx0ZnVuY3Rpb24gZmluZENvbG9yVmFsdWUoIHNjcmVlbkRhdGEsIGNvbG9ySW5wdXQsIGNvbW1hbmROYW1lICkge1xuXHRcdGxldCBjb2xvclZhbHVlO1xuXG5cdFx0aWYoIHBpLnV0aWwuaXNJbnRlZ2VyKCBjb2xvcklucHV0ICkgKSB7XG5cdFx0XHRpZiggY29sb3JJbnB1dCA+IHNjcmVlbkRhdGEucGFsLmxlbmd0aCApIHtcblx0XHRcdFx0Y29uc3QgZXJyb3IgPSBuZXcgUmFuZ2VFcnJvcihcblx0XHRcdFx0XHRgJHtjb21tYW5kTmFtZX06IHBhcmFtZXRlciBjb2xvciBpcyBub3QgYSBjb2xvciBpbiB0aGUgcGFsZXR0ZS5gXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIkNPTE9SX09VVF9PRl9SQU5HRVwiO1xuXHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHRcdGNvbG9yVmFsdWUgPSBzY3JlZW5EYXRhLnBhbFsgY29sb3JJbnB1dCBdO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb2xvclZhbHVlID0gcGkudXRpbC5jb252ZXJ0VG9Db2xvciggY29sb3JJbnB1dCApO1xuXHRcdFx0aWYoIGNvbG9yVmFsdWUgPT09IG51bGwgKSB7XG5cdFx0XHRcdGNvbnN0IGVycm9yID0gbmV3IFR5cGVFcnJvcihcblx0XHRcdFx0XHRgJHtjb21tYW5kTmFtZX06IHBhcmFtZXRlciBjb2xvciBpcyBub3QgYSB2YWxpZCBjb2xvciBmb3JtYXQuYFxuXHRcdFx0XHQpO1xuXHRcdFx0XHRlcnJvci5jb2RlID0gXCJJTlZBTElEX0NPTE9SXCI7XG5cdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBjb2xvclZhbHVlO1xuXHR9XG5cblx0Ly8gU2V0IGRlZmF1bHRzXG5cdHBpRGF0YS5kZWZhdWx0UGVuRHJhdyA9IHNldFBpeGVsU2FmZTtcblx0cGlEYXRhLmRlZmF1bHRCbGVuZENtZCA9IG5vcm1hbEJsZW5kO1xufVxuXG4iLCAiLyoqXG4gKiBQaS5qcyAtIFNjcmVlbiBNb2R1bGVcbiAqIFxuICogU2NyZWVuIGNyZWF0aW9uIGFuZCBtYW5hZ2VtZW50IGZvciBQaS5qcy5cbiAqIENyZWF0ZXMgY2FudmFzIGVsZW1lbnRzLCBtYW5hZ2VzIG11bHRpcGxlIHNjcmVlbnMsIGhhbmRsZXMgYXNwZWN0IHJhdGlvcy5cbiAqIFxuICogQG1vZHVsZSBtb2R1bGVzL3NjcmVlblxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KCBwaSApIHtcblx0Y29uc3QgcGlEYXRhID0gcGkuXy5kYXRhO1xuXG5cdC8vIE1haW4gc2NyZWVuIGNyZWF0aW9uIGNvbW1hbmRcblx0cGkuXy5hZGRDb21tYW5kKCBcInNjcmVlblwiLCBzY3JlZW4sIGZhbHNlLCBmYWxzZSxcblx0XHRbIFwiYXNwZWN0XCIsIFwiY29udGFpbmVyXCIsIFwiaXNPZmZzY3JlZW5cIiwgXCJ3aWxsUmVhZEZyZXF1ZW50bHlcIiwgXCJub1N0eWxlc1wiLFxuXHRcdCBcImlzTXVsdGlwbGVcIiwgXCJyZXNpemVDYWxsYmFja1wiIF1cblx0KTtcblxuXHRmdW5jdGlvbiBzY3JlZW4oIGFyZ3MgKSB7XG5cdFx0Y29uc3QgYXNwZWN0ID0gYXJnc1sgMCBdO1xuXHRcdGNvbnN0IGNvbnRhaW5lciA9IGFyZ3NbIDEgXTtcblx0XHRjb25zdCBpc09mZnNjcmVlbiA9IGFyZ3NbIDIgXTtcblx0XHRjb25zdCB3aWxsUmVhZEZyZXF1ZW50bHkgPSAhISggYXJnc1sgMyBdICk7XG5cdFx0Y29uc3Qgbm9TdHlsZXMgPSBhcmdzWyA0IF07XG5cdFx0Y29uc3QgaXNNdWx0aXBsZSA9IGFyZ3NbIDUgXTtcblx0XHRjb25zdCByZXNpemVDYWxsYmFjayA9IGFyZ3NbIDYgXTtcblxuXHRcdGxldCBhc3BlY3REYXRhO1xuXG5cdFx0Ly8gVmFsaWRhdGUgcmVzaXplIGNhbGxiYWNrXG5cdFx0aWYoIHJlc2l6ZUNhbGxiYWNrICE9IG51bGwgJiYgIXBpLnV0aWwuaXNGdW5jdGlvbiggcmVzaXplQ2FsbGJhY2sgKSApIHtcblx0XHRcdGNvbnN0IGVycm9yID0gbmV3IFR5cGVFcnJvciggXCJzY3JlZW46IHJlc2l6ZUNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbi5cIiApO1xuXHRcdFx0ZXJyb3IuY29kZSA9IFwiSU5WQUxJRF9DQUxMQkFDS1wiO1xuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fVxuXG5cdFx0Ly8gUGFyc2UgYXNwZWN0IHJhdGlvXG5cdFx0aWYoIHR5cGVvZiBhc3BlY3QgPT09IFwic3RyaW5nXCIgJiYgYXNwZWN0ICE9PSBcIlwiICkge1xuXHRcdFx0YXNwZWN0RGF0YSA9IHBhcnNlQXNwZWN0KCBhc3BlY3QudG9Mb3dlckNhc2UoKSApO1xuXHRcdFx0aWYoICFhc3BlY3REYXRhICkge1xuXHRcdFx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvciggXCJzY3JlZW46IGludmFsaWQgdmFsdWUgZm9yIGFzcGVjdC5cIiApO1xuXHRcdFx0XHRlcnJvci5jb2RlID0gXCJJTlZBTElEX0FTUEVDVFwiO1xuXHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHRcdGFzcGVjdERhdGEuaXNNdWx0aXBsZSA9ICEhKCBpc011bHRpcGxlICk7XG5cdFx0fVxuXG5cdFx0Ly8gQ3JlYXRlIGFwcHJvcHJpYXRlIHNjcmVlbiB0eXBlXG5cdFx0bGV0IHNjcmVlbkRhdGE7XG5cblx0XHRpZiggaXNPZmZzY3JlZW4gKSB7XG5cdFx0XHRpZiggIWFzcGVjdERhdGEgKSB7XG5cdFx0XHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFxuXHRcdFx0XHRcdFwic2NyZWVuOiBZb3UgbXVzdCBzdXBwbHkgYW4gYXNwZWN0IHJhdGlvIHdpdGggZXhhY3QgZGltZW5zaW9ucyBcIiArXG5cdFx0XHRcdFx0XCJmb3Igb2Zmc2NyZWVuIHNjcmVlbnMuXCJcblx0XHRcdFx0KTtcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwiTk9fQVNQRUNUX09GRlNDUkVFTlwiO1xuXHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHRcdGlmKCBhc3BlY3REYXRhLnNwbGl0dGVyICE9PSBcInhcIiApIHtcblx0XHRcdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoXG5cdFx0XHRcdFx0XCJzY3JlZW46IFlvdSBtdXN0IHVzZSBhc3BlY3QgcmF0aW8gd2l0aCBlKHgpYWN0IHBpeGVsIGRpbWVuc2lvbnMgXCIgK1xuXHRcdFx0XHRcdFwic3VjaCBhcyAzMjB4MjAwIGZvciBvZmZzY3JlZW4gc2NyZWVucy5cIlxuXHRcdFx0XHQpO1xuXHRcdFx0XHRlcnJvci5jb2RlID0gXCJJTlZBTElEX09GRlNDUkVFTl9BU1BFQ1RcIjtcblx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHR9XG5cdFx0XHRzY3JlZW5EYXRhID0gY3JlYXRlT2Zmc2NyZWVuU2NyZWVuKCBhc3BlY3REYXRhLCB3aWxsUmVhZEZyZXF1ZW50bHkgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGV0IGNvbnRhaW5lckVsID0gY29udGFpbmVyO1xuXHRcdFx0aWYoIHR5cGVvZiBjb250YWluZXIgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdGNvbnRhaW5lckVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIGNvbnRhaW5lciApO1xuXHRcdFx0fVxuXHRcdFx0aWYoIGNvbnRhaW5lckVsICYmICFwaS51dGlsLmlzRG9tRWxlbWVudCggY29udGFpbmVyRWwgKSApIHtcblx0XHRcdFx0Y29uc3QgZXJyb3IgPSBuZXcgVHlwZUVycm9yKFxuXHRcdFx0XHRcdFwic2NyZWVuOiBJbnZhbGlkIGFyZ3VtZW50IGNvbnRhaW5lci4gQ29udGFpbmVyIG11c3QgYmUgYSBET00gZWxlbWVudCBcIiArXG5cdFx0XHRcdFx0XCJvciBhIHN0cmluZyBpZCBvZiBhIERPTSBlbGVtZW50LlwiXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIklOVkFMSURfQ09OVEFJTkVSXCI7XG5cdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0fVxuXHRcdFx0aWYoIG5vU3R5bGVzICkge1xuXHRcdFx0XHRzY3JlZW5EYXRhID0gY3JlYXRlTm9TdHlsZVNjcmVlbiggYXNwZWN0RGF0YSwgY29udGFpbmVyRWwsIHdpbGxSZWFkRnJlcXVlbnRseSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2NyZWVuRGF0YSA9IGNyZWF0ZVNjcmVlbihcblx0XHRcdFx0XHRhc3BlY3REYXRhLCBjb250YWluZXJFbCwgcmVzaXplQ2FsbGJhY2ssIHdpbGxSZWFkRnJlcXVlbnRseVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFNldHVwIHNjcmVlbiBjYWNoZVxuXHRcdHNjcmVlbkRhdGEuY2FjaGUgPSB7IFwiZmluZENvbG9yXCI6IHt9IH07XG5cblx0XHQvLyBDcmVhdGUgc2NyZWVuIG9iamVjdFxuXHRcdGNvbnN0IHNjcmVlbk9iaiA9IHt9O1xuXHRcdHNjcmVlbkRhdGEuY29tbWFuZHMgPSB7fTtcblxuXHRcdC8vIExvb3AgdGhyb3VnaCBhbGwgdGhlIHNjcmVlbiBjb21tYW5kc1xuXHRcdGZvciggY29uc3QgY21kTmFtZSBpbiBwaURhdGEuc2NyZWVuQ29tbWFuZHMgKSB7XG5cdFx0XHRjb25zdCBjb21tYW5kRGF0YSA9IHBpRGF0YS5zY3JlZW5Db21tYW5kc1sgY21kTmFtZSBdO1xuXHRcdFx0c2NyZWVuRGF0YS5jb21tYW5kc1sgY21kTmFtZSBdID0gY29tbWFuZERhdGEuZm47XG5cblx0XHRcdC8vIFNldHVwIHRoZSBBUEkgY29tbWFuZCBvbiBzY3JlZW5PYmpcblx0XHRcdHNldHVwQXBpQ29tbWFuZCggc2NyZWVuT2JqLCBjbWROYW1lLCBzY3JlZW5EYXRhLCBjb21tYW5kRGF0YSApO1xuXHRcdH1cblxuXHRcdC8vIEFzc2lnbiBzY3JlZW4gb2JqZWN0IHJlZmVyZW5jZVxuXHRcdHNjcmVlbkRhdGEuc2NyZWVuT2JqID0gc2NyZWVuT2JqO1xuXHRcdHNjcmVlbk9iai5pZCA9IHNjcmVlbkRhdGEuaWQ7XG5cdFx0c2NyZWVuT2JqLnNjcmVlbiA9IHRydWU7XG5cblx0XHRyZXR1cm4gc2NyZWVuT2JqO1xuXHR9XG5cblx0Ly8gU2V0dXAgQVBJIGNvbW1hbmQgbWV0aG9kIG9uIHNjcmVlbiBvYmplY3Rcblx0ZnVuY3Rpb24gc2V0dXBBcGlDb21tYW5kKCBzY3JlZW5PYmosIG5hbWUsIHNjcmVlbkRhdGEsIGNtZCApIHtcblx0XHRzY3JlZW5PYmpbIG5hbWUgXSA9IGZ1bmN0aW9uKCAuLi5hcmdzICkge1xuXHRcdFx0Y29uc3QgcGFyc2VkQXJncyA9IHBpLl8ucGFyc2VPcHRpb25zKCBjbWQsIGFyZ3MgKTtcblx0XHRcdHJldHVybiBzY3JlZW5EYXRhLmNvbW1hbmRzWyBuYW1lIF0oIHNjcmVlbkRhdGEsIHBhcnNlZEFyZ3MgKTtcblx0XHR9O1xuXHR9XG5cblx0Ly8gUGFyc2UgYXNwZWN0IHJhdGlvIHN0cmluZ1xuXHRmdW5jdGlvbiBwYXJzZUFzcGVjdCggYXNwZWN0ICkge1xuXHRcdGxldCB3aWR0aCwgaGVpZ2h0LCBwYXJ0cywgc3BsaXR0ZXI7XG5cblx0XHQvLyAyIHR5cGVzIG9mIHJhdGlvczogcGVyY2VudGFnZSBvciBleGFjdCBwaXhlbHNcblx0XHRpZiggYXNwZWN0LmluZGV4T2YoIFwiOlwiICkgPiAtMSApIHtcblx0XHRcdHNwbGl0dGVyID0gXCI6XCI7XG5cdFx0fSBlbHNlIGlmKCBhc3BlY3QuaW5kZXhPZiggXCJ4XCIgKSA+IC0xICkge1xuXHRcdFx0c3BsaXR0ZXIgPSBcInhcIjtcblx0XHR9IGVsc2UgaWYoIGFzcGVjdC5pbmRleE9mKCBcImVcIiApID4gLTEgKSB7XG5cdFx0XHRzcGxpdHRlciA9IFwiZVwiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cblx0XHRwYXJ0cyA9IGFzcGVjdC5zcGxpdCggc3BsaXR0ZXIgKTtcblxuXHRcdC8vIEdldCB0aGUgd2lkdGggYW5kIHZhbGlkYXRlIGl0XG5cdFx0d2lkdGggPSBOdW1iZXIoIHBhcnRzWyAwIF0gKTtcblx0XHRpZiggaXNOYU4oIHdpZHRoICkgfHwgd2lkdGggPT09IDAgKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cblx0XHQvLyBHZXQgdGhlIGhlaWdodCBhbmQgdmFsaWRhdGUgaXRcblx0XHRoZWlnaHQgPSBOdW1iZXIoIHBhcnRzWyAxIF0gKTtcblx0XHRpZiggaXNOYU4oIGhlaWdodCApIHx8IGhlaWdodCA9PT0gMCApIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRcIndpZHRoXCI6IHdpZHRoLFxuXHRcdFx0XCJoZWlnaHRcIjogaGVpZ2h0LFxuXHRcdFx0XCJzcGxpdHRlclwiOiBzcGxpdHRlclxuXHRcdH07XG5cdH1cblxuXHQvLyBDcmVhdGUgb2Zmc2NyZWVuIGNhbnZhc1xuXHRmdW5jdGlvbiBjcmVhdGVPZmZzY3JlZW5TY3JlZW4oIGFzcGVjdERhdGEsIHdpbGxSZWFkRnJlcXVlbnRseSApIHtcblx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImNhbnZhc1wiICk7XG5cdFx0Y2FudmFzLndpZHRoID0gYXNwZWN0RGF0YS53aWR0aDtcblx0XHRjYW52YXMuaGVpZ2h0ID0gYXNwZWN0RGF0YS5oZWlnaHQ7XG5cblx0XHRjb25zdCBidWZmZXJDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImNhbnZhc1wiICk7XG5cdFx0YnVmZmVyQ2FudmFzLndpZHRoID0gYXNwZWN0RGF0YS53aWR0aDtcblx0XHRidWZmZXJDYW52YXMuaGVpZ2h0ID0gYXNwZWN0RGF0YS5oZWlnaHQ7XG5cblx0XHRyZXR1cm4gY3JlYXRlU2NyZWVuRGF0YShcblx0XHRcdGNhbnZhcywgYnVmZmVyQ2FudmFzLCBudWxsLCBhc3BlY3REYXRhLCB0cnVlLFxuXHRcdFx0ZmFsc2UsIG51bGwsIHdpbGxSZWFkRnJlcXVlbnRseVxuXHRcdCk7XG5cdH1cblxuXHQvLyBDcmVhdGUgc2NyZWVuIHdpdGggZGVmYXVsdCBzdHlsaW5nXG5cdGZ1bmN0aW9uIGNyZWF0ZVNjcmVlbiggYXNwZWN0RGF0YSwgY29udGFpbmVyLCByZXNpemVDYWxsYmFjaywgd2lsbFJlYWRGcmVxdWVudGx5ICkge1xuXHRcdGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiY2FudmFzXCIgKTtcblx0XHRjb25zdCBidWZmZXJDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImNhbnZhc1wiICk7XG5cblx0XHQvLyBTdHlsZSB0aGUgY2FudmFzXG5cdFx0Y2FudmFzLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiYmxhY2tcIjtcblx0XHRjYW52YXMuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG5cdFx0Y2FudmFzLnN0eWxlLmltYWdlUmVuZGVyaW5nID0gXCJwaXhlbGF0ZWRcIjtcblx0XHRjYW52YXMuc3R5bGUuaW1hZ2VSZW5kZXJpbmcgPSBcImNyaXNwLWVkZ2VzXCI7XG5cblx0XHQvLyBJZiBubyBjb250YWluZXIsIHVzZSBkb2N1bWVudCBib2R5XG5cdFx0bGV0IGlzQ29udGFpbmVyID0gdHJ1ZTtcblx0XHRpZiggIXBpLnV0aWwuaXNEb21FbGVtZW50KCBjb250YWluZXIgKSApIHtcblx0XHRcdGlzQ29udGFpbmVyID0gZmFsc2U7XG5cdFx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gXCIxMDAlXCI7XG5cdFx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUubWFyZ2luID0gXCIwXCI7XG5cdFx0XHRkb2N1bWVudC5ib2R5LnN0eWxlLmhlaWdodCA9IFwiMTAwJVwiO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW4gPSBcIjBcIjtcblx0XHRcdGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiO1xuXHRcdFx0Y2FudmFzLnN0eWxlLmxlZnQgPSBcIjBcIjtcblx0XHRcdGNhbnZhcy5zdHlsZS50b3AgPSBcIjBcIjtcblx0XHRcdGNvbnRhaW5lciA9IGRvY3VtZW50LmJvZHk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFrZSBzdXJlIGNvbnRhaW5lciBpcyBub3QgYmxhbmtcblx0XHRpZiggY29udGFpbmVyLm9mZnNldEhlaWdodCA9PT0gMCApIHtcblx0XHRcdGNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBcIjIwMHB4XCI7XG5cdFx0fVxuXG5cdFx0Ly8gQXBwZW5kIGNhbnZhcyB0byBjb250YWluZXJcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoIGNhbnZhcyApO1xuXG5cdFx0aWYoIGFzcGVjdERhdGEgKSB7XG5cdFx0XHQvLyBDYWxjdWxhdGUgY29udGFpbmVyIHNpemVcblx0XHRcdGNvbnN0IHNpemUgPSBnZXRTaXplKCBjb250YWluZXIgKTtcblxuXHRcdFx0Ly8gU2V0IHRoZSBjYW52YXMgc2l6ZVxuXHRcdFx0c2V0Q2FudmFzU2l6ZSggYXNwZWN0RGF0YSwgY2FudmFzLCBzaXplLndpZHRoLCBzaXplLmhlaWdodCApO1xuXG5cdFx0XHQvLyBTZXQgdGhlIGJ1ZmZlciBzaXplXG5cdFx0XHRidWZmZXJDYW52YXMud2lkdGggPSBjYW52YXMud2lkdGg7XG5cdFx0XHRidWZmZXJDYW52YXMuaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gSWYgY2FudmFzIGlzIGluc2lkZSBhbiBlbGVtZW50LCB1c2Ugc3RhdGljIHBvc2l0aW9uXG5cdFx0XHRpZiggaXNDb250YWluZXIgKSB7XG5cdFx0XHRcdGNhbnZhcy5zdHlsZS5wb3NpdGlvbiA9IFwic3RhdGljXCI7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCBjYW52YXMgdG8gZnVsbHNjcmVlblxuXHRcdFx0Y2FudmFzLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG5cdFx0XHRjYW52YXMuc3R5bGUuaGVpZ2h0ID0gXCIxMDAlXCI7XG5cdFx0XHRjb25zdCBzaXplID0gZ2V0U2l6ZSggY2FudmFzICk7XG5cdFx0XHRjYW52YXMud2lkdGggPSBzaXplLndpZHRoO1xuXHRcdFx0Y2FudmFzLmhlaWdodCA9IHNpemUuaGVpZ2h0O1xuXHRcdFx0YnVmZmVyQ2FudmFzLndpZHRoID0gc2l6ZS53aWR0aDtcblx0XHRcdGJ1ZmZlckNhbnZhcy5oZWlnaHQgPSBzaXplLmhlaWdodDtcblx0XHR9XG5cblx0XHRyZXR1cm4gY3JlYXRlU2NyZWVuRGF0YShcblx0XHRcdGNhbnZhcywgYnVmZmVyQ2FudmFzLCBjb250YWluZXIsIGFzcGVjdERhdGEsIGZhbHNlLFxuXHRcdFx0ZmFsc2UsIHJlc2l6ZUNhbGxiYWNrLCB3aWxsUmVhZEZyZXF1ZW50bHlcblx0XHQpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIHNjcmVlbiB3aXRob3V0IHN0eWxlc1xuXHRmdW5jdGlvbiBjcmVhdGVOb1N0eWxlU2NyZWVuKCBhc3BlY3REYXRhLCBjb250YWluZXIsIHdpbGxSZWFkRnJlcXVlbnRseSApIHtcblx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImNhbnZhc1wiICk7XG5cdFx0Y29uc3QgYnVmZmVyQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJjYW52YXNcIiApO1xuXG5cdFx0Ly8gSWYgbm8gY29udGFpbmVyLCB1c2UgZG9jdW1lbnQgYm9keVxuXHRcdGlmKCAhcGkudXRpbC5pc0RvbUVsZW1lbnQoIGNvbnRhaW5lciApICkge1xuXHRcdFx0Y29udGFpbmVyID0gZG9jdW1lbnQuYm9keTtcblx0XHR9XG5cblx0XHQvLyBBcHBlbmQgY2FudmFzIHRvIGNvbnRhaW5lclxuXHRcdGNvbnRhaW5lci5hcHBlbmRDaGlsZCggY2FudmFzICk7XG5cblx0XHRpZiggYXNwZWN0RGF0YSAmJiBhc3BlY3REYXRhLnNwbGl0dGVyID09PSBcInhcIiApIHtcblx0XHRcdC8vIFNldCB0aGUgYnVmZmVyIHNpemVcblx0XHRcdGNhbnZhcy53aWR0aCA9IGFzcGVjdERhdGEud2lkdGg7XG5cdFx0XHRjYW52YXMuaGVpZ2h0ID0gYXNwZWN0RGF0YS5oZWlnaHQ7XG5cdFx0XHRidWZmZXJDYW52YXMud2lkdGggPSBjYW52YXMud2lkdGg7XG5cdFx0XHRidWZmZXJDYW52YXMuaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3Qgc2l6ZSA9IGdldFNpemUoIGNhbnZhcyApO1xuXHRcdFx0YnVmZmVyQ2FudmFzLndpZHRoID0gc2l6ZS53aWR0aDtcblx0XHRcdGJ1ZmZlckNhbnZhcy5oZWlnaHQgPSBzaXplLmhlaWdodDtcblx0XHR9XG5cblx0XHRyZXR1cm4gY3JlYXRlU2NyZWVuRGF0YShcblx0XHRcdGNhbnZhcywgYnVmZmVyQ2FudmFzLCBjb250YWluZXIsIGFzcGVjdERhdGEsIGZhbHNlLFxuXHRcdFx0dHJ1ZSwgbnVsbCwgd2lsbFJlYWRGcmVxdWVudGx5XG5cdFx0KTtcblx0fVxuXG5cdC8vIENyZWF0ZSB0aGUgc2NyZWVuIGRhdGEgb2JqZWN0XG5cdGZ1bmN0aW9uIGNyZWF0ZVNjcmVlbkRhdGEoXG5cdFx0Y2FudmFzLCBidWZmZXJDYW52YXMsIGNvbnRhaW5lciwgYXNwZWN0RGF0YSwgaXNPZmZzY3JlZW4sIGlzTm9TdHlsZXMsXG5cdFx0cmVzaXplQ2FsbGJhY2ssIHdpbGxSZWFkRnJlcXVlbnRseVxuXHQpIHtcblx0XHRjb25zdCBzY3JlZW5EYXRhID0ge307XG5cblx0XHQvLyBTZXQgdGhlIHNjcmVlbiBpZFxuXHRcdHNjcmVlbkRhdGEuaWQgPSBwaURhdGEubmV4dFNjcmVlbklkO1xuXHRcdHBpRGF0YS5uZXh0U2NyZWVuSWQgKz0gMTtcblx0XHRwaURhdGEuYWN0aXZlU2NyZWVuID0gc2NyZWVuRGF0YTtcblxuXHRcdC8vIFNldCB0aGUgc2NyZWVuSWQgb24gdGhlIGNhbnZhc1xuXHRcdGNhbnZhcy5kYXRhc2V0LnNjcmVlbklkID0gc2NyZWVuRGF0YS5pZDtcblxuXHRcdC8vIENvbnRleHQgYXR0cmlidXRlc1xuXHRcdGlmKCB3aWxsUmVhZEZyZXF1ZW50bHkgKSB7XG5cdFx0XHRzY3JlZW5EYXRhLmNvbnRleHRBdHRyaWJ1dGVzID0geyBcIndpbGxSZWFkRnJlcXVlbnRseVwiOiB0cnVlIH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNjcmVlbkRhdGEuY29udGV4dEF0dHJpYnV0ZXMgPSB7fTtcblx0XHR9XG5cblx0XHQvLyBTZXQgdGhlIHNjcmVlbiBkZWZhdWx0IGRhdGFcblx0XHRzY3JlZW5EYXRhLmNhbnZhcyA9IGNhbnZhcztcblx0XHRzY3JlZW5EYXRhLndpZHRoID0gY2FudmFzLndpZHRoO1xuXHRcdHNjcmVlbkRhdGEuaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0XHRzY3JlZW5EYXRhLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcblx0XHRzY3JlZW5EYXRhLmFzcGVjdERhdGEgPSBhc3BlY3REYXRhO1xuXHRcdHNjcmVlbkRhdGEuaXNPZmZzY3JlZW4gPSBpc09mZnNjcmVlbjtcblx0XHRzY3JlZW5EYXRhLmlzTm9TdHlsZXMgPSBpc05vU3R5bGVzO1xuXHRcdHNjcmVlbkRhdGEuY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCBcIjJkXCIsIHNjcmVlbkRhdGEuY29udGV4dEF0dHJpYnV0ZXMgKTtcblx0XHRzY3JlZW5EYXRhLmJ1ZmZlckNhbnZhcyA9IGJ1ZmZlckNhbnZhcztcblx0XHRzY3JlZW5EYXRhLmJ1ZmZlckNvbnRleHQgPSBidWZmZXJDYW52YXMuZ2V0Q29udGV4dChcblx0XHRcdFwiMmRcIiwgc2NyZWVuRGF0YS5jb250ZXh0QXR0cmlidXRlc1xuXHRcdCk7XG5cdFx0c2NyZWVuRGF0YS5kaXJ0eSA9IGZhbHNlO1xuXHRcdHNjcmVlbkRhdGEuaXNBdXRvUmVuZGVyID0gdHJ1ZTtcblx0XHRzY3JlZW5EYXRhLmF1dG9SZW5kZXJNaWNyb3Rhc2tTY2hlZHVsZWQgPSBmYWxzZTtcblx0XHRzY3JlZW5EYXRhLmltYWdlRGF0YSA9IG51bGw7XG5cdFx0c2NyZWVuRGF0YS54ID0gMDtcblx0XHRzY3JlZW5EYXRhLnkgPSAwO1xuXHRcdHNjcmVlbkRhdGEuYW5nbGUgPSAwO1xuXHRcdHNjcmVlbkRhdGEucGFsID0gcGlEYXRhLmRlZmF1bHRQYWxldHRlLnNsaWNlKCk7XG5cdFx0c2NyZWVuRGF0YS5mQ29sb3IgPSBzY3JlZW5EYXRhLnBhbFsgcGlEYXRhLmRlZmF1bHRDb2xvciBdIHx8IFxuXHRcdFx0cGkudXRpbC5jb252ZXJ0VG9Db2xvciggXCIjRkZGRkZGXCIgKTtcblx0XHRzY3JlZW5EYXRhLmJDb2xvciA9IHNjcmVlbkRhdGEucGFsWyAwIF0gfHwgcGkudXRpbC5jb252ZXJ0VG9Db2xvciggXCIjMDAwMDAwXCIgKTtcblx0XHRzY3JlZW5EYXRhLmNvbnRleHQuZmlsbFN0eWxlID0gc2NyZWVuRGF0YS5mQ29sb3Iucztcblx0XHRzY3JlZW5EYXRhLmNvbnRleHQuc3Ryb2tlU3R5bGUgPSBzY3JlZW5EYXRhLmZDb2xvci5zO1xuXHRcdHNjcmVlbkRhdGEubW91c2VTdGFydGVkID0gZmFsc2U7XG5cdFx0c2NyZWVuRGF0YS50b3VjaFN0YXJ0ZWQgPSBmYWxzZTtcblx0XHRzY3JlZW5EYXRhLnByaW50Q3Vyc29yID0ge1xuXHRcdFx0XCJ4XCI6IDAsXG5cdFx0XHRcInlcIjogMCxcblx0XHRcdFwiZm9udFwiOiBwaURhdGEuZGVmYXVsdEZvbnQsXG5cdFx0XHRcInJvd3NcIjogTWF0aC5mbG9vciggY2FudmFzLmhlaWdodCAvICggcGlEYXRhLmRlZmF1bHRGb250LmhlaWdodCB8fCAxNCApICksXG5cdFx0XHRcImNvbHNcIjogTWF0aC5mbG9vciggY2FudmFzLndpZHRoIC8gKCBwaURhdGEuZGVmYXVsdEZvbnQud2lkdGggfHwgOCApICksXG5cdFx0XHRcInByb21wdFwiOiBwaURhdGEuZGVmYXVsdFByb21wdCxcblx0XHRcdFwiYnJlYWtXb3JkXCI6IHRydWVcblx0XHR9O1xuXHRcdHNjcmVlbkRhdGEuY2xpZW50UmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRzY3JlZW5EYXRhLm1vdXNlID0ge1xuXHRcdFx0XCJ4XCI6IC0xLFxuXHRcdFx0XCJ5XCI6IC0xLFxuXHRcdFx0XCJidXR0b25zXCI6IDAsXG5cdFx0XHRcImxhc3RYXCI6IC0xLFxuXHRcdFx0XCJsYXN0WVwiOiAtMVxuXHRcdH07XG5cdFx0c2NyZWVuRGF0YS50b3VjaGVzID0ge307XG5cdFx0c2NyZWVuRGF0YS5sYXN0VG91Y2hlcyA9IHt9O1xuXHRcdHNjcmVlbkRhdGEucGl4ZWxNb2RlID0gdHJ1ZTtcblx0XHRzY3JlZW5EYXRhLnBlbiA9IHtcblx0XHRcdFwiZHJhd1wiOiBwaURhdGEuZGVmYXVsdFBlbkRyYXcsXG5cdFx0XHRcInNpemVcIjogMSxcblx0XHRcdFwibm9pc2VcIjogbnVsbFxuXHRcdH07XG5cdFx0c2NyZWVuRGF0YS5ibGVuZFBpeGVsQ21kID0gcGlEYXRhLmRlZmF1bHRCbGVuZENtZDtcblxuXHRcdC8vIERpc2FibGUgYW50aS1hbGlhc2luZ1xuXHRcdHNjcmVlbkRhdGEuY29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcblxuXHRcdC8vIEV2ZW50IGxpc3RlbmVyc1xuXHRcdHNjcmVlbkRhdGEub25Nb3VzZUV2ZW50TGlzdGVuZXJzID0ge307XG5cdFx0c2NyZWVuRGF0YS5vblRvdWNoRXZlbnRMaXN0ZW5lcnMgPSB7fTtcblx0XHRzY3JlZW5EYXRhLm9uUHJlc3NFdmVudExpc3RlbmVycyA9IHt9O1xuXHRcdHNjcmVlbkRhdGEub25DbGlja0V2ZW50TGlzdGVuZXJzID0ge307XG5cdFx0c2NyZWVuRGF0YS5tb3VzZUV2ZW50TGlzdGVuZXJzQWN0aXZlID0gMDtcblx0XHRzY3JlZW5EYXRhLnRvdWNoRXZlbnRMaXN0ZW5lcnNBY3RpdmUgPSAwO1xuXHRcdHNjcmVlbkRhdGEucHJlc3NFdmVudExpc3RlbmVyc0FjdGl2ZSA9IDA7XG5cdFx0c2NyZWVuRGF0YS5jbGlja0V2ZW50TGlzdGVuZXJzQWN0aXZlID0gMDtcblx0XHRzY3JlZW5EYXRhLmxhc3RFdmVudCA9IG51bGw7XG5cblx0XHQvLyBSaWdodCBjbGljayBpcyBlbmFibGVkXG5cdFx0c2NyZWVuRGF0YS5pc0NvbnRleHRNZW51RW5hYmxlZCA9IHRydWU7XG5cblx0XHQvLyBSZXNpemUgY2FsbGJhY2tcblx0XHRzY3JlZW5EYXRhLnJlc2l6ZUNhbGxiYWNrID0gcmVzaXplQ2FsbGJhY2s7XG5cblx0XHQvLyBSZWdpc3RlciB0aGlzIHNjcmVlblxuXHRcdHBpRGF0YS5zY3JlZW5zWyBzY3JlZW5EYXRhLmlkIF0gPSBzY3JlZW5EYXRhO1xuXG5cdFx0cmV0dXJuIHNjcmVlbkRhdGE7XG5cdH1cblxuXHQvLyBTZXQgY2FudmFzIHNpemUgYmFzZWQgb24gYXNwZWN0IHJhdGlvXG5cdGZ1bmN0aW9uIHNldENhbnZhc1NpemUoIGFzcGVjdERhdGEsIGNhbnZhcywgbWF4V2lkdGgsIG1heEhlaWdodCApIHtcblx0XHRsZXQgd2lkdGggPSBhc3BlY3REYXRhLndpZHRoO1xuXHRcdGxldCBoZWlnaHQgPSBhc3BlY3REYXRhLmhlaWdodDtcblx0XHRjb25zdCBzcGxpdHRlciA9IGFzcGVjdERhdGEuc3BsaXR0ZXI7XG5cdFx0bGV0IG5ld1dpZHRoLCBuZXdIZWlnaHQ7XG5cblx0XHQvLyBJZiBzZXQgc2l6ZSB0byBleGFjdCBtdWx0aXBsZVxuXHRcdGlmKCBhc3BlY3REYXRhLmlzTXVsdGlwbGUgJiYgc3BsaXR0ZXIgIT09IFwiOlwiICkge1xuXHRcdFx0Y29uc3QgZmFjdG9yWCA9IE1hdGguZmxvb3IoIG1heFdpZHRoIC8gd2lkdGggKTtcblx0XHRcdGNvbnN0IGZhY3RvclkgPSBNYXRoLmZsb29yKCBtYXhIZWlnaHQgLyBoZWlnaHQgKTtcblx0XHRcdGxldCBmYWN0b3IgPSBmYWN0b3JYID4gZmFjdG9yWSA/IGZhY3RvclkgOiBmYWN0b3JYO1xuXHRcdFx0aWYoIGZhY3RvciA8IDEgKSB7XG5cdFx0XHRcdGZhY3RvciA9IDE7XG5cdFx0XHR9XG5cdFx0XHRuZXdXaWR0aCA9IHdpZHRoICogZmFjdG9yO1xuXHRcdFx0bmV3SGVpZ2h0ID0gaGVpZ2h0ICogZmFjdG9yO1xuXG5cdFx0XHQvLyBFeHRlbmRpbmcgdGhlIGNhbnZhcyB0byBtYXRjaCBjb250YWluZXIgc2l6ZVxuXHRcdFx0aWYoIHNwbGl0dGVyID09PSBcImVcIiApIHtcblx0XHRcdFx0d2lkdGggPSBNYXRoLmZsb29yKCBtYXhXaWR0aCAvIGZhY3RvciApO1xuXHRcdFx0XHRoZWlnaHQgPSBNYXRoLmZsb29yKCBtYXhIZWlnaHQgLyBmYWN0b3IgKTtcblx0XHRcdFx0bmV3V2lkdGggPSB3aWR0aCAqIGZhY3Rvcjtcblx0XHRcdFx0bmV3SGVpZ2h0ID0gaGVpZ2h0ICogZmFjdG9yO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBDYWxjdWxhdGUgdGhlIHNjcmVlbiByYXRpb3Ncblx0XHRcdGNvbnN0IHJhdGlvMSA9IGhlaWdodCAvIHdpZHRoO1xuXHRcdFx0Y29uc3QgcmF0aW8yID0gd2lkdGggLyBoZWlnaHQ7XG5cdFx0XHRuZXdXaWR0aCA9IG1heEhlaWdodCAqIHJhdGlvMjtcblx0XHRcdG5ld0hlaWdodCA9IG1heFdpZHRoICogcmF0aW8xO1xuXG5cdFx0XHQvLyBDYWxjdWxhdGUgdGhlIGJlc3QgZml0XG5cdFx0XHRpZiggbmV3V2lkdGggPiBtYXhXaWR0aCApIHtcblx0XHRcdFx0bmV3V2lkdGggPSBtYXhXaWR0aDtcblx0XHRcdFx0bmV3SGVpZ2h0ID0gbmV3V2lkdGggKiByYXRpbzE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRuZXdIZWlnaHQgPSBtYXhIZWlnaHQ7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEV4dGVuZGluZyBjYW52YXNcblx0XHRcdGlmKCBzcGxpdHRlciA9PT0gXCJlXCIgKSB7XG5cdFx0XHRcdHdpZHRoICs9IE1hdGgucm91bmQoICggbWF4V2lkdGggLSBuZXdXaWR0aCApICogKCB3aWR0aCAvIG5ld1dpZHRoICkgKTtcblx0XHRcdFx0aGVpZ2h0ICs9IE1hdGgucm91bmQoICggbWF4SGVpZ2h0IC0gbmV3SGVpZ2h0ICkgKiAoIGhlaWdodCAvIG5ld0hlaWdodCApICk7XG5cdFx0XHRcdG5ld1dpZHRoID0gbWF4V2lkdGg7XG5cdFx0XHRcdG5ld0hlaWdodCA9IG1heEhlaWdodDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTZXQgdGhlIHNpemVcblx0XHRjYW52YXMuc3R5bGUud2lkdGggPSBNYXRoLmZsb29yKCBuZXdXaWR0aCApICsgXCJweFwiO1xuXHRcdGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBNYXRoLmZsb29yKCBuZXdIZWlnaHQgKSArIFwicHhcIjtcblxuXHRcdC8vIFNldCB0aGUgbWFyZ2luc1xuXHRcdGNhbnZhcy5zdHlsZS5tYXJnaW5MZWZ0ID0gTWF0aC5mbG9vciggKCBtYXhXaWR0aCAtIG5ld1dpZHRoICkgLyAyICkgKyBcInB4XCI7XG5cdFx0Y2FudmFzLnN0eWxlLm1hcmdpblRvcCA9IE1hdGguZmxvb3IoICggbWF4SGVpZ2h0IC0gbmV3SGVpZ2h0ICkgLyAyICkgKyBcInB4XCI7XG5cblx0XHQvLyBTZXQgdGhlIGFjdHVhbCBjYW52YXMgZGltZW5zaW9uc1xuXHRcdGlmKCBzcGxpdHRlciA9PT0gXCJ4XCIgfHwgc3BsaXR0ZXIgPT09IFwiZVwiICkge1xuXHRcdFx0Y2FudmFzLndpZHRoID0gd2lkdGg7XG5cdFx0XHRjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBGb3IgcmF0aW8gbW9kZSwgc2V0IHRvIGNvbnRhaW5lciBzaXplXG5cdFx0XHRjYW52YXMud2lkdGggPSBNYXRoLmZsb29yKCBuZXdXaWR0aCApO1xuXHRcdFx0Y2FudmFzLmhlaWdodCA9IE1hdGguZmxvb3IoIG5ld0hlaWdodCApO1xuXHRcdH1cblx0fVxuXG5cdC8vIEdldCBzaXplIG9mIGNvbnRhaW5lclxuXHRmdW5jdGlvbiBnZXRTaXplKCBlbGVtZW50ICkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRcIndpZHRoXCI6IGVsZW1lbnQub2Zmc2V0V2lkdGggfHwgZWxlbWVudC5jbGllbnRXaWR0aCB8fCBlbGVtZW50LndpZHRoLFxuXHRcdFx0XCJoZWlnaHRcIjogZWxlbWVudC5vZmZzZXRIZWlnaHQgfHwgZWxlbWVudC5jbGllbnRIZWlnaHQgfHwgZWxlbWVudC5oZWlnaHRcblx0XHR9O1xuXHR9XG59XG5cbiIsICIvKipcbiAqIFBpLmpzIC0gU2NyZWVuIENvbW1hbmRzIE1vZHVsZVxuICogXG4gKiBCYXNpYyBzY3JlZW4gY29tbWFuZHMgbGlrZSByZW1vdmUsIHJlbmRlciwgd2lkdGgvaGVpZ2h0IGdldHRlcnMsIGV0Yy5cbiAqIFxuICogQG1vZHVsZSBtb2R1bGVzL3NjcmVlbi1jb21tYW5kc1xuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KCBwaSApIHtcblx0Y29uc3QgcGlEYXRhID0gcGkuXy5kYXRhO1xuXG5cdC8vIFJlbW92ZSB0aGUgc2NyZWVuIGZyb20gdGhlIHBhZ2UgYW5kIG1lbW9yeVxuXHRwaS5fLmFkZENvbW1hbmQoIFwicmVtb3ZlU2NyZWVuXCIsIHJlbW92ZVNjcmVlbiwgZmFsc2UsIHRydWUsIFtdICk7XG5cblx0ZnVuY3Rpb24gcmVtb3ZlU2NyZWVuKCBzY3JlZW5EYXRhICkge1xuXHRcdGNvbnN0IHNjcmVlbklkID0gc2NyZWVuRGF0YS5pZDtcblxuXHRcdC8vIElmIHJlbW92aW5nIGFjdGl2ZSBzY3JlZW4sIGZpbmQgYW5vdGhlclxuXHRcdGlmKCBzY3JlZW5EYXRhID09PSBwaURhdGEuYWN0aXZlU2NyZWVuICkge1xuXHRcdFx0Zm9yKCBjb25zdCBpIGluIHBpRGF0YS5zY3JlZW5zICkge1xuXHRcdFx0XHRpZiggcGlEYXRhLnNjcmVlbnNbIGkgXSAhPT0gc2NyZWVuRGF0YSApIHtcblx0XHRcdFx0XHRwaURhdGEuYWN0aXZlU2NyZWVuID0gcGlEYXRhLnNjcmVlbnNbIGkgXTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIENhbmNlbCBpbnB1dCBpZiBtZXRob2QgZXhpc3RzXG5cdFx0aWYoIHNjcmVlbkRhdGEuc2NyZWVuT2JqLmNhbmNlbElucHV0ICkge1xuXHRcdFx0c2NyZWVuRGF0YS5zY3JlZW5PYmouY2FuY2VsSW5wdXQoKTtcblx0XHR9XG5cblx0XHQvLyBSZW1vdmUgYWxsIGNvbW1hbmRzIGZyb20gc2NyZWVuIG9iamVjdFxuXHRcdGZvciggY29uc3QgaSBpbiBzY3JlZW5EYXRhLnNjcmVlbk9iaiApIHtcblx0XHRcdGRlbGV0ZSBzY3JlZW5EYXRhLnNjcmVlbk9ialsgaSBdO1xuXHRcdH1cblxuXHRcdC8vIFJlbW92ZSB0aGUgY2FudmFzIGZyb20gdGhlIHBhZ2Vcblx0XHRpZiggc2NyZWVuRGF0YS5jYW52YXMucGFyZW50RWxlbWVudCApIHtcblx0XHRcdHNjcmVlbkRhdGEuY2FudmFzLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoIHNjcmVlbkRhdGEuY2FudmFzICk7XG5cdFx0fVxuXG5cdFx0Ly8gU2V0IHZhbHVlcyB0byBudWxsXG5cdFx0c2NyZWVuRGF0YS5jYW52YXMgPSBudWxsO1xuXHRcdHNjcmVlbkRhdGEuYnVmZmVyQ2FudmFzID0gbnVsbDtcblx0XHRzY3JlZW5EYXRhLnBhbCA9IG51bGw7XG5cdFx0c2NyZWVuRGF0YS5jb21tYW5kcyA9IG51bGw7XG5cdFx0c2NyZWVuRGF0YS5jb250ZXh0ID0gbnVsbDtcblx0XHRzY3JlZW5EYXRhLmltYWdlRGF0YSA9IG51bGw7XG5cdFx0c2NyZWVuRGF0YS5zY3JlZW5PYmogPSBudWxsO1xuXG5cdFx0Ly8gRGVsZXRlIHRoZSBzY3JlZW4gZnJvbSBzY3JlZW5zIGNvbnRhaW5lclxuXHRcdGRlbGV0ZSBwaURhdGEuc2NyZWVuc1sgc2NyZWVuSWQgXTtcblx0fVxuXG5cdC8vIFJlbmRlciBzY3JlZW4gKHB1dHMgYnVmZmVyIHRvIG1haW4gY2FudmFzKVxuXHRwaS5fLmFkZENvbW1hbmQoIFwicmVuZGVyXCIsIHJlbmRlciwgZmFsc2UsIHRydWUsIFtdICk7XG5cblx0ZnVuY3Rpb24gcmVuZGVyKCBzY3JlZW5EYXRhICkge1xuXHRcdGlmKCBzY3JlZW5EYXRhLmRpcnR5ID09PSB0cnVlICkge1xuXHRcdFx0c2NyZWVuRGF0YS5jb250ZXh0LnB1dEltYWdlRGF0YShcblx0XHRcdFx0c2NyZWVuRGF0YS5pbWFnZURhdGEsIDAsIDBcblx0XHRcdCk7XG5cdFx0XHRzY3JlZW5EYXRhLmRpcnR5ID0gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0Ly8gR2V0IHNjcmVlbiB3aWR0aFxuXHRwaS5fLmFkZENvbW1hbmQoIFwid2lkdGhcIiwgZ2V0V2lkdGgsIGZhbHNlLCB0cnVlLCBbXSApO1xuXG5cdGZ1bmN0aW9uIGdldFdpZHRoKCBzY3JlZW5EYXRhICkge1xuXHRcdHJldHVybiBzY3JlZW5EYXRhLndpZHRoO1xuXHR9XG5cblx0Ly8gR2V0IHNjcmVlbiBoZWlnaHRcblx0cGkuXy5hZGRDb21tYW5kKCBcImhlaWdodFwiLCBnZXRIZWlnaHQsIGZhbHNlLCB0cnVlLCBbXSApO1xuXG5cdGZ1bmN0aW9uIGdldEhlaWdodCggc2NyZWVuRGF0YSApIHtcblx0XHRyZXR1cm4gc2NyZWVuRGF0YS5oZWlnaHQ7XG5cdH1cblxuXHQvLyBHZXQgY2FudmFzIGVsZW1lbnRcblx0cGkuXy5hZGRDb21tYW5kKCBcImNhbnZhc1wiLCBnZXRDYW52YXMsIGZhbHNlLCB0cnVlLCBbXSApO1xuXG5cdGZ1bmN0aW9uIGdldENhbnZhcyggc2NyZWVuRGF0YSApIHtcblx0XHRyZXR1cm4gc2NyZWVuRGF0YS5jYW52YXM7XG5cdH1cblxuXHQvLyBTZXQgYmFja2dyb3VuZCBjb2xvclxuXHRwaS5fLmFkZENvbW1hbmQoIFwic2V0QmdDb2xvclwiLCBzZXRCZ0NvbG9yLCBmYWxzZSwgdHJ1ZSwgWyBcImNvbG9yXCIgXSApO1xuXHRwaS5fLmFkZFNldHRpbmcoIFwiYmdDb2xvclwiLCBzZXRCZ0NvbG9yLCB0cnVlLCBbIFwiY29sb3JcIiBdICk7XG5cblx0ZnVuY3Rpb24gc2V0QmdDb2xvciggc2NyZWVuRGF0YSwgYXJncyApIHtcblx0XHRsZXQgY29sb3IgPSBhcmdzWyAwIF07XG5cdFx0bGV0IGJjO1xuXG5cdFx0aWYoIHBpLnV0aWwuaXNJbnRlZ2VyKCBjb2xvciApICkge1xuXHRcdFx0YmMgPSBzY3JlZW5EYXRhLnBhbFsgY29sb3IgXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YmMgPSBwaS51dGlsLmNvbnZlcnRUb0NvbG9yKCBjb2xvciApO1xuXHRcdH1cblxuXHRcdGlmKCBiYyAmJiB0eXBlb2YgYmMucyA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHNjcmVlbkRhdGEuY2FudmFzLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGJjLnM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGVycm9yID0gbmV3IFR5cGVFcnJvciggXCJiZ0NvbG9yOiBpbnZhbGlkIGNvbG9yIHZhbHVlIGZvciBwYXJhbWV0ZXIgYy5cIiApO1xuXHRcdFx0ZXJyb3IuY29kZSA9IFwiSU5WQUxJRF9DT0xPUlwiO1xuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fVxuXHR9XG5cblx0Ly8gU2V0IGNvbnRhaW5lciBiYWNrZ3JvdW5kIGNvbG9yXG5cdHBpLl8uYWRkQ29tbWFuZCggXCJzZXRDb250YWluZXJCZ0NvbG9yXCIsIHNldENvbnRhaW5lckJnQ29sb3IsIGZhbHNlLCB0cnVlLCBbIFwiY29sb3JcIiBdICk7XG5cdHBpLl8uYWRkU2V0dGluZyggXCJjb250YWluZXJCZ0NvbG9yXCIsIHNldENvbnRhaW5lckJnQ29sb3IsIHRydWUsIFsgXCJjb2xvclwiIF0gKTtcblxuXHRmdW5jdGlvbiBzZXRDb250YWluZXJCZ0NvbG9yKCBzY3JlZW5EYXRhLCBhcmdzICkge1xuXHRcdGNvbnN0IGNvbG9yID0gYXJnc1sgMCBdO1xuXHRcdGxldCBiYztcblxuXHRcdGlmKCBzY3JlZW5EYXRhLmNvbnRhaW5lciApIHtcblx0XHRcdGlmKCBwaS51dGlsLmlzSW50ZWdlciggY29sb3IgKSApIHtcblx0XHRcdFx0YmMgPSBzY3JlZW5EYXRhLnBhbFsgY29sb3IgXTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGJjID0gcGkudXRpbC5jb252ZXJ0VG9Db2xvciggY29sb3IgKTtcblx0XHRcdH1cblxuXHRcdFx0aWYoIGJjICYmIHR5cGVvZiBiYy5zID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRzY3JlZW5EYXRhLmNvbnRhaW5lci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBiYy5zO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3QgZXJyb3IgPSBuZXcgVHlwZUVycm9yKFxuXHRcdFx0XHRcdFwiY29udGFpbmVyQmdDb2xvcjogaW52YWxpZCBjb2xvciB2YWx1ZSBmb3IgcGFyYW1ldGVyIGMuXCJcblx0XHRcdFx0KTtcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwiSU5WQUxJRF9DT0xPUlwiO1xuXHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuIiwgIi8qKlxuICogUGkuanMgLSBQaXhlbC1Nb2RlIEdyYXBoaWNzIE1vZHVsZVxuICogXG4gKiBQaXhlbC1wZXJmZWN0IGRyYXdpbmcgaW1wbGVtZW50YXRpb25zIHVzaW5nIG1hbnVhbCBwaXhlbCBtYW5pcHVsYXRpb24uXG4gKiBJbXBsZW1lbnRzIEJyZXNlbmhhbSBsaW5lLCBtaWRwb2ludCBjaXJjbGUsIGFuZCBvdGhlciBhbGdvcml0aG1zLlxuICogXG4gKiBAbW9kdWxlIG1vZHVsZXMvZ3JhcGhpY3MtcGl4ZWxcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdCggcGkgKSB7XG5cdGNvbnN0IHBpRGF0YSA9IHBpLl8uZGF0YTtcblxuXHQvLyBDTFMgLSBDbGVhciBzY3JlZW5cblx0cGkuXy5hZGRDb21tYW5kKCBcImNsc1wiLCBjbHMsIGZhbHNlLCB0cnVlLCBbIFwieFwiLCBcInlcIiwgXCJ3aWR0aFwiLCBcImhlaWdodFwiIF0gKTtcblxuXHRmdW5jdGlvbiBjbHMoIHNjcmVlbkRhdGEsIGFyZ3MgKSB7XG5cdFx0Y29uc3QgeCA9IHBpLnV0aWwuZ2V0SW50KCBNYXRoLnJvdW5kKCBhcmdzWyAwIF0gKSwgMCApO1xuXHRcdGNvbnN0IHkgPSBwaS51dGlsLmdldEludCggTWF0aC5yb3VuZCggYXJnc1sgMSBdICksIDAgKTtcblx0XHRjb25zdCB3aWR0aCA9IHBpLnV0aWwuZ2V0SW50KCBNYXRoLnJvdW5kKCBhcmdzWyAyIF0gKSwgc2NyZWVuRGF0YS53aWR0aCApO1xuXHRcdGNvbnN0IGhlaWdodCA9IHBpLnV0aWwuZ2V0SW50KCBNYXRoLnJvdW5kKCBhcmdzWyAzIF0gKSwgc2NyZWVuRGF0YS5oZWlnaHQgKTtcblxuXHRcdGlmKCB4ICE9PSAwIHx8IHkgIT09IDAgfHwgd2lkdGggIT09IHNjcmVlbkRhdGEud2lkdGggfHwgaGVpZ2h0ICE9PSBzY3JlZW5EYXRhLmhlaWdodCApIHtcblx0XHRcdHNjcmVlbkRhdGEuc2NyZWVuT2JqLnJlbmRlcigpO1xuXHRcdFx0c2NyZWVuRGF0YS5jb250ZXh0LmNsZWFyUmVjdCggeCwgeSwgd2lkdGgsIGhlaWdodCApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzY3JlZW5EYXRhLmNvbnRleHQuY2xlYXJSZWN0KCB4LCB5LCB3aWR0aCwgaGVpZ2h0ICk7XG5cdFx0XHRzY3JlZW5EYXRhLmltYWdlRGF0YSA9IG51bGw7XG5cdFx0XHRzY3JlZW5EYXRhLnByaW50Q3Vyc29yLnggPSAwO1xuXHRcdFx0c2NyZWVuRGF0YS5wcmludEN1cnNvci55ID0gMDtcblx0XHRcdHNjcmVlbkRhdGEueCA9IDA7XG5cdFx0XHRzY3JlZW5EYXRhLnkgPSAwO1xuXHRcdFx0c2NyZWVuRGF0YS5kaXJ0eSA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdHBpRGF0YS5jb21tYW5kcy5yZXNldEltYWdlRGF0YSggc2NyZWVuRGF0YSApO1xuXHR9XG5cblx0Ly8gUFNFVCAtIFNldCBwaXhlbCAocGl4ZWwgbW9kZSBhbmQgYW50aS1hbGlhc2VkIG1vZGUpXG5cdHBpLl8uYWRkQ29tbWFuZHMoIFwicHNldFwiLCBwc2V0LCBhYVBzZXQsIFsgXCJ4XCIsIFwieVwiIF0gKTtcblxuXHRmdW5jdGlvbiBwc2V0KCBzY3JlZW5EYXRhLCBhcmdzICkge1xuXHRcdGxldCB4ID0gTWF0aC5yb3VuZCggYXJnc1sgMCBdICk7XG5cdFx0bGV0IHkgPSBNYXRoLnJvdW5kKCBhcmdzWyAxIF0gKTtcblxuXHRcdC8vIE1ha2Ugc3VyZSB4IGFuZCB5IGFyZSBpbnRlZ2Vyc1xuXHRcdGlmKCAhcGkudXRpbC5pc0ludGVnZXIoIHggKSB8fCAhcGkudXRpbC5pc0ludGVnZXIoIHkgKSApIHtcblx0XHRcdGNvbnN0IGVycm9yID0gbmV3IFR5cGVFcnJvciggXCJwc2V0OiBBcmd1bWVudHMgeCBhbmQgeSBtdXN0IGJlIGludGVnZXJzLlwiICk7XG5cdFx0XHRlcnJvci5jb2RlID0gXCJJTlZBTElEX0NPT1JESU5BVEVTXCI7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cblx0XHQvLyBTZXQgdGhlIGN1cnNvclxuXHRcdHNjcmVlbkRhdGEueCA9IHg7XG5cdFx0c2NyZWVuRGF0YS55ID0geTtcblxuXHRcdC8vIE1ha2Ugc3VyZSB4IGFuZCB5IGFyZSBvbiB0aGUgc2NyZWVuXG5cdFx0aWYoICFwaS51dGlsLmluUmFuZ2UyKCB4LCB5LCAwLCAwLCBzY3JlZW5EYXRhLndpZHRoLCBzY3JlZW5EYXRhLmhlaWdodCApICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIEdldCB0aGUgZm9yZSBjb2xvclxuXHRcdGNvbnN0IGNvbG9yID0gc2NyZWVuRGF0YS5mQ29sb3I7XG5cblx0XHRwaURhdGEuY29tbWFuZHMuZ2V0SW1hZ2VEYXRhKCBzY3JlZW5EYXRhICk7XG5cdFx0c2NyZWVuRGF0YS5wZW4uZHJhdyggc2NyZWVuRGF0YSwgeCwgeSwgY29sb3IgKTtcblx0XHRwaURhdGEuY29tbWFuZHMuc2V0SW1hZ2VEaXJ0eSggc2NyZWVuRGF0YSApO1xuXHR9XG5cblx0ZnVuY3Rpb24gYWFQc2V0KCBzY3JlZW5EYXRhLCBhcmdzICkge1xuXHRcdGNvbnN0IHggPSBhcmdzWyAwIF07XG5cdFx0Y29uc3QgeSA9IGFyZ3NbIDEgXTtcblxuXHRcdGlmKCBpc05hTiggeCApIHx8IGlzTmFOKCB5ICkgKSB7XG5cdFx0XHRjb25zdCBlcnJvciA9IG5ldyBUeXBlRXJyb3IoIFwicHNldDogQXJndW1lbnRzIHggYW5kIHkgbXVzdCBiZSBudW1iZXJzLlwiICk7XG5cdFx0XHRlcnJvci5jb2RlID0gXCJJTlZBTElEX0NPT1JESU5BVEVTXCI7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cblx0XHRzY3JlZW5EYXRhLmNvbnRleHQuZmlsbFJlY3QoIHgsIHksIDEsIDEgKTtcblx0fVxuXG5cdC8vIExJTkUgLSBEcmF3IGxpbmUgKEJyZXNlbmhhbSBhbGdvcml0aG0gZm9yIHBpeGVsIG1vZGUpXG5cdHBpLl8uYWRkQ29tbWFuZHMoIFwibGluZVwiLCBweExpbmUsIGFhTGluZSwgWyBcIngxXCIsIFwieTFcIiwgXCJ4MlwiLCBcInkyXCIgXSApO1xuXG5cdGZ1bmN0aW9uIHB4TGluZSggc2NyZWVuRGF0YSwgYXJncyApIHtcblx0XHRsZXQgeDEgPSBNYXRoLnJvdW5kKCBhcmdzWyAwIF0gKTtcblx0XHRsZXQgeTEgPSBNYXRoLnJvdW5kKCBhcmdzWyAxIF0gKTtcblx0XHRsZXQgeDIgPSBNYXRoLnJvdW5kKCBhcmdzWyAyIF0gKTtcblx0XHRsZXQgeTIgPSBNYXRoLnJvdW5kKCBhcmdzWyAzIF0gKTtcblxuXHRcdC8vIE1ha2Ugc3VyZSBjb29yZGluYXRlcyBhcmUgaW50ZWdlcnNcblx0XHRpZihcblx0XHRcdCFwaS51dGlsLmlzSW50ZWdlciggeDEgKSB8fCAhcGkudXRpbC5pc0ludGVnZXIoIHkxICkgfHxcblx0XHRcdCFwaS51dGlsLmlzSW50ZWdlciggeDIgKSB8fCAhcGkudXRpbC5pc0ludGVnZXIoIHkyIClcblx0XHQpIHtcblx0XHRcdGNvbnN0IGVycm9yID0gbmV3IFR5cGVFcnJvcihcblx0XHRcdFx0XCJsaW5lOiBBcmd1bWVudHMgeDEsIHkxLCB4MiwgYW5kIHkyIG11c3QgYmUgaW50ZWdlcnMuXCJcblx0XHRcdCk7XG5cdFx0XHRlcnJvci5jb2RlID0gXCJJTlZBTElEX0NPT1JESU5BVEVTXCI7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cblx0XHQvLyBJbml0aWFsaXplIHRoZSBjb2xvciBmb3IgdGhlIGxpbmVcblx0XHRjb25zdCBjb2xvciA9IHNjcmVlbkRhdGEuZkNvbG9yO1xuXG5cdFx0Y29uc3QgZHggPSBNYXRoLmFicyggeDIgLSB4MSApO1xuXHRcdGNvbnN0IGR5ID0gTWF0aC5hYnMoIHkyIC0geTEgKTtcblxuXHRcdC8vIFNldCB0aGUgeCBzbG9wZVxuXHRcdGNvbnN0IHN4ID0geDEgPCB4MiA/IDEgOiAtMTtcblxuXHRcdC8vIFNldCB0aGUgeSBzbG9wZVxuXHRcdGNvbnN0IHN5ID0geTEgPCB5MiA/IDEgOiAtMTtcblxuXHRcdC8vIFNldCB0aGUgZXJyb3Jcblx0XHRsZXQgZXJyID0gZHggLSBkeTtcblxuXHRcdC8vIEdldCB0aGUgaW1hZ2UgZGF0YVxuXHRcdHBpRGF0YS5jb21tYW5kcy5nZXRJbWFnZURhdGEoIHNjcmVlbkRhdGEgKTtcblxuXHRcdC8vIFNldCB0aGUgZmlyc3QgcGl4ZWxcblx0XHRzY3JlZW5EYXRhLnBlbi5kcmF3KCBzY3JlZW5EYXRhLCB4MSwgeTEsIGNvbG9yICk7XG5cblx0XHQvLyBCcmVzZW5oYW0ncyBsaW5lIGFsZ29yaXRobVxuXHRcdHdoaWxlKCAhKCAoIHgxID09PSB4MiApICYmICggeTEgPT09IHkyICkgKSApIHtcblx0XHRcdGNvbnN0IGUyID0gZXJyIDw8IDE7XG5cblx0XHRcdGlmKCBlMiA+IC1keSApIHtcblx0XHRcdFx0ZXJyIC09IGR5O1xuXHRcdFx0XHR4MSArPSBzeDtcblx0XHRcdH1cblxuXHRcdFx0aWYoIGUyIDwgZHggKSB7XG5cdFx0XHRcdGVyciArPSBkeDtcblx0XHRcdFx0eTEgKz0gc3k7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB0aGUgbmV4dCBwaXhlbFxuXHRcdFx0c2NyZWVuRGF0YS5wZW4uZHJhdyggc2NyZWVuRGF0YSwgeDEsIHkxLCBjb2xvciApO1xuXHRcdH1cblxuXHRcdHBpRGF0YS5jb21tYW5kcy5zZXRJbWFnZURpcnR5KCBzY3JlZW5EYXRhICk7XG5cdH1cblxuXHRmdW5jdGlvbiBhYUxpbmUoIHNjcmVlbkRhdGEsIGFyZ3MgKSB7XG5cdFx0Y29uc3QgeDEgPSBhcmdzWyAwIF07XG5cdFx0Y29uc3QgeTEgPSBhcmdzWyAxIF07XG5cdFx0Y29uc3QgeDIgPSBhcmdzWyAyIF07XG5cdFx0Y29uc3QgeTIgPSBhcmdzWyAzIF07XG5cblx0XHRpZiggaXNOYU4oIHgxICkgfHwgaXNOYU4oIHkxICkgfHwgaXNOYU4oIHgyICkgfHwgaXNOYU4oIHkyICkgKSB7XG5cdFx0XHRjb25zdCBlcnJvciA9IG5ldyBUeXBlRXJyb3IoXG5cdFx0XHRcdFwibGluZTogcGFyYW1ldGVycyB4MSwgeTEsIHgyLCB5MiBtdXN0IGJlIG51bWJlcnMuXCJcblx0XHRcdCk7XG5cdFx0XHRlcnJvci5jb2RlID0gXCJJTlZBTElEX0NPT1JESU5BVEVTXCI7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9XG5cblx0XHRzY3JlZW5EYXRhLnNjcmVlbk9iai5yZW5kZXIoKTtcblxuXHRcdGNvbnN0IGN0eCA9IHNjcmVlbkRhdGEuY29udGV4dDtcblx0XHRjdHguYmVnaW5QYXRoKCk7XG5cdFx0Y3R4Lm1vdmVUbyggeDEsIHkxICk7XG5cdFx0Y3R4LmxpbmVUbyggeDIsIHkyICk7XG5cdFx0Y3R4LnN0cm9rZSgpO1xuXHR9XG59XG5cbiIsICIvKipcclxuICogUGkuanMgLSBNYWluIEVudHJ5IFBvaW50XHJcbiAqIFxyXG4gKiBHcmFwaGljcyBhbmQgc291bmQgbGlicmFyeSBmb3IgcmV0cm8tc3R5bGUgZ2FtZXMgYW5kIGRlbW9zLlxyXG4gKiBNb2Rlcm5pemVkIGFyY2hpdGVjdHVyZSB3aXRoIGxlZ2FjeSBBUEkgY29tcGF0aWJpbGl0eS5cclxuICogXHJcbiAqIEBtb2R1bGUgcGkuanNcclxuICogQGF1dGhvciBBbmR5IFN0dWJic1xyXG4gKiBAbGljZW5zZSBBcGFjaGUtMi4wXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgcGlEYXRhIH0gZnJvbSBcIi4vY29yZS9waS1kYXRhLmpzXCI7XHJcbmltcG9ydCAqIGFzIGNtZCBmcm9tIFwiLi9jb3JlL2NvbW1hbmQtc3lzdGVtLmpzXCI7XHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gXCIuL21vZHVsZXMvdXRpbHMuanNcIjtcclxuaW1wb3J0ICogYXMgY29yZSBmcm9tIFwiLi9tb2R1bGVzL2NvcmUtY29tbWFuZHMuanNcIjtcclxuaW1wb3J0ICogYXMgaGVscGVyIGZyb20gXCIuL21vZHVsZXMvc2NyZWVuLWhlbHBlci5qc1wiO1xyXG5pbXBvcnQgKiBhcyBzY3JlZW4gZnJvbSBcIi4vbW9kdWxlcy9zY3JlZW4uanNcIjtcclxuaW1wb3J0ICogYXMgc2NyZWVuQ21kIGZyb20gXCIuL21vZHVsZXMvc2NyZWVuLWNvbW1hbmRzLmpzXCI7XHJcbmltcG9ydCAqIGFzIGdyYXBoaWNzIGZyb20gXCIuL21vZHVsZXMvZ3JhcGhpY3MtcGl4ZWwuanNcIjtcclxuXHJcbi8vIFZlcnNpb24gaW5qZWN0ZWQgZHVyaW5nIGJ1aWxkIGZyb20gcGFja2FnZS5qc29uXHJcbmNvbnN0IFZFUlNJT04gPSBcIjIuMC4wLWFscGhhLjFcIjtcclxuXHJcbi8vIFJlYWR5IHN5c3RlbSB2YXJpYWJsZXNcclxubGV0IHdhaXRDb3VudCA9IDA7XHJcbmxldCB3YWl0aW5nID0gZmFsc2U7XHJcbmNvbnN0IHJlYWR5TGlzdCA9IFtdO1xyXG5sZXQgc3RhcnRSZWFkeUxpc3RUaW1lb3V0ID0gMDtcclxuXHJcbi8vIFJlYWR5L1dhaXQvUmVzdW1lIHN5c3RlbSBmdW5jdGlvbnNcclxuXHJcbmZ1bmN0aW9uIHdhaXQoKSB7XHJcblx0d2FpdENvdW50Kys7XHJcblx0d2FpdGluZyA9IHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc3VtZSgpIHtcclxuXHR3YWl0Q291bnQtLTtcclxuXHRpZiggd2FpdENvdW50ID09PSAwICkge1xyXG5cdFx0c3RhcnRSZWFkeUxpc3QoKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0YXJ0UmVhZHlMaXN0KCkge1xyXG5cdGlmKCBkb2N1bWVudC5yZWFkeVN0YXRlICE9PSBcImxvYWRpbmdcIiAmJiB3YWl0Q291bnQgPT09IDAgKSB7XHJcblx0XHR3YWl0aW5nID0gZmFsc2U7XHJcblx0XHRjb25zdCB0ZW1wID0gcmVhZHlMaXN0LnNsaWNlKCk7XHJcblx0XHRyZWFkeUxpc3QubGVuZ3RoID0gMDtcclxuXHJcblx0XHRmb3IoIGNvbnN0IGZuIG9mIHRlbXAgKSB7XHJcblx0XHRcdGZuKCk7XHJcblx0XHR9XHJcblx0fSBlbHNlIHtcclxuXHRcdGNsZWFyVGltZW91dCggc3RhcnRSZWFkeUxpc3RUaW1lb3V0ICk7XHJcblx0XHRzdGFydFJlYWR5TGlzdFRpbWVvdXQgPSBzZXRUaW1lb3V0KCBzdGFydFJlYWR5TGlzdCwgMTAgKTtcclxuXHR9XHJcbn1cclxuXHJcbi8vIENyZWF0ZSB0aGUgcGkgb2JqZWN0IHdpdGggXyAoaW50ZXJuYWwgQVBJIGZvciBwbHVnaW5zKSBhbmQgdXRpbCBuYW1lc3BhY2VzXHJcbmNvbnN0IHBpID0ge1xyXG5cdFwidmVyc2lvblwiOiBWRVJTSU9OLFxyXG5cdFwiX1wiOiB7XHJcblx0XHRcImRhdGFcIjogcGlEYXRhLFxyXG5cdFx0XCJhZGRDb21tYW5kXCI6IGNtZC5hZGRDb21tYW5kLFxyXG5cdFx0XCJhZGRDb21tYW5kc1wiOiBjbWQuYWRkQ29tbWFuZHMsXHJcblx0XHRcImFkZFNldHRpbmdcIjogY21kLmFkZFNldHRpbmcsXHJcblx0XHRcImFkZFBlblwiOiBjbWQuYWRkUGVuLFxyXG5cdFx0XCJhZGRCbGVuZENvbW1hbmRcIjogY21kLmFkZEJsZW5kQ29tbWFuZCxcclxuXHRcdFwicGFyc2VPcHRpb25zXCI6IGNtZC5wYXJzZU9wdGlvbnMsXHJcblx0XHRcIndhaXRcIjogd2FpdCxcclxuXHRcdFwicmVzdW1lXCI6IHJlc3VtZVxyXG5cdH0sXHJcblx0XCJ1dGlsXCI6IHV0aWxzXHJcbn07XHJcblxyXG4vLyBSZWdpc3RlciB0aGUgcmVhZHkgY29tbWFuZFxyXG5jbWQuYWRkQ29tbWFuZCggXCJyZWFkeVwiLCByZWFkeSwgZmFsc2UsIGZhbHNlLCBbIFwiZm5cIiBdICk7XHJcblxyXG5mdW5jdGlvbiByZWFkeSggYXJncyApIHtcclxuXHRjb25zdCBmbiA9IGFyZ3NbIDAgXTtcclxuXHJcblx0aWYoIHV0aWxzLmlzRnVuY3Rpb24oIGZuICkgKSB7XHJcblx0XHRpZiggd2FpdGluZyApIHtcclxuXHRcdFx0cmVhZHlMaXN0LnB1c2goIGZuICk7XHJcblx0XHR9IGVsc2UgaWYoIGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwibG9hZGluZ1wiICkge1xyXG5cdFx0XHRyZWFkeUxpc3QucHVzaCggZm4gKTtcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KCBzdGFydFJlYWR5TGlzdFRpbWVvdXQgKTtcclxuXHRcdFx0c3RhcnRSZWFkeUxpc3RUaW1lb3V0ID0gc2V0VGltZW91dCggc3RhcnRSZWFkeUxpc3QsIDEwICk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRmbigpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8gSW5pdGlhbGl6ZSBtb2R1bGVzXHJcbmhlbHBlci5pbml0KCBwaSApO1xyXG5zY3JlZW4uaW5pdCggcGkgKTtcclxuc2NyZWVuQ21kLmluaXQoIHBpICk7XHJcbmdyYXBoaWNzLmluaXQoIHBpICk7XHJcbmNvcmUuaW5pdCggcGkgKTtcclxuXHJcbi8vIFByb2Nlc3MgYWxsIGNvbW1hbmRzIGFuZCBjcmVhdGUgQVBJIG1ldGhvZHNcclxuY21kLnByb2Nlc3NDb21tYW5kcyggcGkgKTtcclxuXHJcbi8vIEV4cG9ydCBmb3IgZGlmZmVyZW50IG1vZHVsZSBzeXN0ZW1zXHJcbmlmKCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICkge1xyXG5cdHdpbmRvdy5waSA9IHBpO1xyXG5cdFxyXG5cdC8vIFNldCAkIGFsaWFzIG9ubHkgaWYgbm90IGFscmVhZHkgZGVmaW5lZCAoYXZvaWQgalF1ZXJ5IGNvbmZsaWN0cylcclxuXHRpZiggd2luZG93LiQgPT09IHVuZGVmaW5lZCApIHtcclxuXHRcdHdpbmRvdy4kID0gcGk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBwaTtcclxuZXhwb3J0IHsgcGkgfTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7O0FBU08sSUFBTSxTQUFTO0FBQUEsRUFDckIsZ0JBQWdCO0FBQUEsRUFDaEIsV0FBVyxDQUFDO0FBQUEsRUFDWixnQkFBZ0I7QUFBQSxFQUNoQixVQUFVLENBQUM7QUFBQSxFQUNYLGNBQWM7QUFBQSxFQUNkLGlCQUFpQixPQUFPLGFBQWMsR0FBSTtBQUFBLEVBQzFDLGVBQWUsQ0FBQztBQUFBLEVBQ2hCLGNBQWM7QUFBQSxFQUNkLFNBQVMsQ0FBQztBQUFBLEVBQ1Ysa0JBQWtCLENBQUM7QUFBQSxFQUNuQixnQkFBZ0I7QUFBQSxFQUNoQixZQUFZLENBQUM7QUFBQSxFQUNiLGtCQUFrQixDQUFDO0FBQUEsRUFDbkIsa0JBQWtCO0FBQUEsRUFDbEIsUUFBUSxDQUFDO0FBQUEsRUFDVCxXQUFXLENBQUM7QUFBQSxF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
