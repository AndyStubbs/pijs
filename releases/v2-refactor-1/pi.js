/**
 * Pi.js - Graphics and Sound Library
 * @version 2.0.0-alpha.1
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/pi-data.js
  var defaultPaletteHex = [
    "#000000",
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
      data[i + 3] = c.a + data[i + 3] * pct2;
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
    pi2._.addCommand("put", put, false, true, ["data", "x", "y", "includeZero"]);
    function put(screenData, args) {
      const data = args[0];
      let x = Math.round(args[1]);
      let y = Math.round(args[2]);
      const includeZero = !!args[3];
      if (!data || data.length < 1) {
        return;
      }
      if (isNaN(x) || isNaN(y)) {
        const error = new TypeError("put: parameters x and y must be integers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      let startX;
      if (x < 0) {
        startX = x * -1;
      } else {
        startX = 0;
      }
      let startY;
      if (y < 0) {
        startY = y * -1;
      } else {
        startY = 0;
      }
      let width = data[0].length - startX;
      let height = data.length - startY;
      if (x + startX + width >= screenData.width) {
        width = screenData.width - x - startX;
      }
      if (y + startY + height >= screenData.height) {
        height = screenData.height - y - startY;
      }
      if (width <= 0 || height <= 0) {
        return;
      }
      piData2.commands.getImageData(screenData);
      for (let dataY = startY; dataY < startY + height; dataY++) {
        for (let dataX = startX; dataX < startX + width; dataX++) {
          const c = screenData.pal[data[dataY][dataX]];
          const i = (screenData.width * (y + dataY) + (x + dataX)) * 4;
          if (c && (c.a > 0 || includeZero)) {
            screenData.imageData.data[i] = c.r;
            screenData.imageData.data[i + 1] = c.g;
            screenData.imageData.data[i + 2] = c.b;
            screenData.imageData.data[i + 3] = c.a;
          }
        }
      }
      piData2.commands.setImageDirty(screenData);
    }
    __name(put, "put");
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
        "offsetX": 0,
        "offsetY": 0,
        "button": 0,
        "buttons": 0,
        "lastX": -1,
        "lastY": -1,
        "eventType": ""
      };
      screenData.touch = {
        "x": -1,
        "y": -1,
        "count": 0,
        "touches": [],
        "eventType": ""
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
    pi2._.addCommand("onevent", onevent, true, true, []);
    function onevent(mode, fn, once, hitBox, modes, name, listenerArr, extraId, extraData, customData) {
      let modeFound = false;
      for (let i = 0; i < modes.length; i++) {
        if (mode === modes[i]) {
          modeFound = true;
          break;
        }
      }
      if (!modeFound) {
        const error = new TypeError(
          `${name}: mode needs to be one of the following ${modes.join(", ")}`
        );
        error.code = "INVALID_MODE";
        throw error;
      }
      once = !!once;
      if (!pi2.util.isFunction(fn)) {
        const error = new TypeError(`${name}: fn is not a valid function`);
        error.code = "INVALID_CALLBACK";
        throw error;
      }
      if (hitBox) {
        if (!pi2.util.isInteger(hitBox.x) || !pi2.util.isInteger(hitBox.y) || !pi2.util.isInteger(hitBox.width) || !pi2.util.isInteger(hitBox.height)) {
          const error = new TypeError(
            `${name}: hitbox must have properties x, y, width, and height whose values are integers`
          );
          error.code = "INVALID_HITBOX";
          throw error;
        }
      }
      setTimeout(function() {
        const originalFn = fn;
        let newMode;
        if (typeof extraId === "string") {
          newMode = mode + extraId;
        } else {
          newMode = mode;
        }
        if (once) {
          fn = /* @__PURE__ */ __name(function(data, customData2) {
            offevent(mode, originalFn, modes, name, listenerArr, extraId);
            originalFn(data, customData2);
          }, "fn");
        }
        if (!listenerArr[newMode]) {
          listenerArr[newMode] = [];
        }
        listenerArr[newMode].push({
          "fn": fn,
          "hitBox": hitBox,
          "extraData": extraData,
          "clickDown": false,
          "originalFn": originalFn,
          "customData": customData
        });
      }, 1);
      return true;
    }
    __name(onevent, "onevent");
    pi2._.addCommand("offevent", offevent, true, true, []);
    function offevent(mode, fn, modes, name, listenerArr, extraId) {
      let modeFound = false;
      for (let i = 0; i < modes.length; i++) {
        if (mode === modes[i]) {
          modeFound = true;
          break;
        }
      }
      if (!modeFound) {
        const error = new TypeError(
          `${name}: mode needs to be one of the following ${modes.join(", ")}`
        );
        error.code = "INVALID_MODE";
        throw error;
      }
      if (typeof extraId === "string") {
        mode += extraId;
      }
      const isClear = fn == null;
      if (!isClear && !pi2.util.isFunction(fn)) {
        const error = new TypeError(`${name}: fn is not a valid function`);
        error.code = "INVALID_CALLBACK";
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
            if (listenerArr[mode].length === 0) {
              delete listenerArr[mode];
            }
          }
        }
        return true;
      }
      return false;
    }
    __name(offevent, "offevent");
    pi2._.addCommand("clearEvents", clearEvents, false, true, []);
    function clearEvents(screenData) {
      screenData.onMouseEventListeners = {};
      screenData.onTouchEventListeners = {};
      screenData.onPressEventListeners = {};
      screenData.onClickEventListeners = {};
      screenData.mouseEventListenersActive = 0;
      screenData.touchEventListenersActive = 0;
      screenData.pressEventListenersActive = 0;
      screenData.clickEventListenersActive = 0;
      screenData.lastEvent = null;
    }
    __name(clearEvents, "clearEvents");
    pi2._.addCommand("setAutoRender", setAutoRender, false, true, ["isAutoRender"]);
    pi2._.addSetting("autoRender", setAutoRender, true, ["isAutoRender"]);
    function setAutoRender(screenData, args) {
      screenData.isAutoRender = !!args[0];
      if (screenData.isAutoRender) {
        screenData.screenObj.render();
      }
    }
    __name(setAutoRender, "setAutoRender");
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
    pi2._.addCommand(
      "findColor",
      findColor,
      false,
      true,
      ["color", "tolerance", "isAddToPalette"]
    );
    function findColor(screenData, args) {
      let color = args[0];
      let tolerance = args[1];
      const isAddToPalette = !!args[2];
      const m_maxDifference = 255 * 255 * 3.25;
      if (tolerance == null) {
        tolerance = 1;
      } else if (isNaN(tolerance) || tolerance < 0 || tolerance > 1) {
        const error = new RangeError(
          "findColor: parameter tolerance must be a number between 0 and 1"
        );
        error.code = "INVALID_TOLERANCE";
        throw error;
      }
      tolerance = tolerance * (2 - tolerance) * m_maxDifference;
      const pal = screenData.pal;
      if (color && color.s && screenData.cache.findColor[color.s] !== void 0) {
        return screenData.cache.findColor[color.s];
      }
      color = piData2.commands.findColorValue(screenData, color, "findColor");
      for (let i = 0; i < pal.length; i++) {
        if (pal[i].s === color.s) {
          screenData.cache.findColor[color.s] = i;
          return i;
        } else {
          const dr = pal[i].r - color.r;
          const dg = pal[i].g - color.g;
          const db = pal[i].b - color.b;
          const da = pal[i].a - color.a;
          const difference = dr * dr + dg * dg + db * db + da * da * 0.25;
          const similarity = m_maxDifference - difference;
          if (similarity >= tolerance) {
            screenData.cache.findColor[color.s] = i;
            return i;
          }
        }
      }
      if (isAddToPalette) {
        pal.push(color);
        screenData.cache.findColor[color.s] = pal.length - 1;
        return pal.length - 1;
      }
      return 0;
    }
    __name(findColor, "findColor");
    pi2._.addCommand("setColor", setColor, false, true, ["color", "isAddToPalette"]);
    pi2._.addSetting("color", setColor, true, ["color", "isAddToPalette"]);
    function setColor(screenData, args) {
      const colorInput = args[0];
      const isAddToPalette = !!args[1];
      const colorValue = piData2.commands.findColorValue(
        screenData,
        colorInput,
        "setColor"
      );
      if (colorValue === void 0) {
        return;
      }
      if (isAddToPalette) {
        const colorIndex = piData2.commands.findColor(
          screenData,
          [colorValue, 1, isAddToPalette]
        );
        screenData.fColor = screenData.pal[colorIndex];
      } else {
        screenData.fColor = colorValue;
      }
      screenData.context.fillStyle = screenData.fColor.s;
      screenData.context.strokeStyle = screenData.fColor.s;
    }
    __name(setColor, "setColor");
    pi2._.addCommand("setPenSize", setPenSize, false, true, ["size"]);
    pi2._.addSetting("penSize", setPenSize, true, ["size"]);
    function setPenSize(screenData, args) {
      let size = args[0];
      if (size === void 0) {
        size = 1;
      }
      if (!pi2.util.isInteger(size) || size < 1) {
        const error = new TypeError("setPenSize: size must be an integer >= 1.");
        error.code = "INVALID_PEN_SIZE";
        throw error;
      }
      screenData.pen.size = size;
      screenData.context.lineWidth = size;
    }
    __name(setPenSize, "setPenSize");
    pi2._.addCommand("getPal", getPal, false, true, []);
    function getPal(screenData) {
      const colors = [];
      for (let i = 0; i < screenData.pal.length; i++) {
        const color = {
          "r": screenData.pal[i].r,
          "g": screenData.pal[i].g,
          "b": screenData.pal[i].b,
          "a": screenData.pal[i].a,
          "s": screenData.pal[i].s
        };
        colors.push(color);
      }
      return colors;
    }
    __name(getPal, "getPal");
    pi2._.addCommand("setPalColor", setPalColor, false, true, ["index", "color"]);
    pi2._.addSetting("palColor", setPalColor, true, ["index", "color"]);
    function setPalColor(screenData, args) {
      const index = args[0];
      const color = args[1];
      if (!pi2.util.isInteger(index) || index < 0 || index > screenData.pal.length) {
        const error = new RangeError("setPalColor: index is not a valid integer value");
        error.code = "INVALID_INDEX";
        throw error;
      }
      const colorValue = pi2.util.convertToColor(color);
      if (colorValue === null) {
        const error = new TypeError(
          "setPalColor: parameter color is not a valid color format"
        );
        error.code = "INVALID_COLOR";
        throw error;
      }
      if (screenData.fColor.s === screenData.pal[index].s) {
        screenData.fColor = colorValue;
      }
      if (screenData.cache.findColor[color.s]) {
        screenData.cache.findColor[color.s] = index;
      }
      screenData.pal[index] = colorValue;
    }
    __name(setPalColor, "setPalColor");
    pi2._.addCommand("swapColor", swapColor, false, true, ["oldColor", "newColor"]);
    function swapColor(screenData, args) {
      let oldColor = args[0];
      let newColor = args[1];
      if (!pi2.util.isInteger(oldColor)) {
        const error = new TypeError("swapColor: parameter oldColor must be an integer");
        error.code = "INVALID_OLD_COLOR";
        throw error;
      }
      if (oldColor < 0 || oldColor >= screenData.pal.length) {
        const error = new RangeError("swapColor: parameter oldColor is an invalid integer");
        error.code = "INVALID_OLD_COLOR_INDEX";
        throw error;
      }
      if (screenData.pal[oldColor] === void 0) {
        const error = new Error(
          "swapColor: parameter oldColor is not in the screen color palette"
        );
        error.code = "COLOR_NOT_IN_PALETTE";
        throw error;
      }
      const index = oldColor;
      oldColor = screenData.pal[index];
      newColor = pi2.util.convertToColor(newColor);
      if (newColor === null) {
        const error = new TypeError(
          "swapColor: parameter newColor is not a valid color format"
        );
        error.code = "INVALID_NEW_COLOR";
        throw error;
      }
      piData2.commands.getImageData(screenData);
      const data = screenData.imageData.data;
      for (let y = 0; y < screenData.height; y++) {
        for (let x = 0; x < screenData.width; x++) {
          const i = (screenData.width * y + x) * 4;
          if (data[i] === oldColor.r && data[i + 1] === oldColor.g && data[i + 2] === oldColor.b && data[i + 3] === oldColor.a) {
            data[i] = newColor.r;
            data[i + 1] = newColor.g;
            data[i + 2] = newColor.b;
            data[i + 3] = newColor.a;
          }
        }
      }
      piData2.commands.setImageDirty(screenData);
      screenData.pal[index] = newColor;
    }
    __name(swapColor, "swapColor");
    pi2._.addCommand("setPixelMode", setPixelMode, false, true, ["isEnabled"]);
    pi2._.addSetting("pixelMode", setPixelMode, true, ["isEnabled"]);
    function setPixelMode(screenData, args) {
      const isEnabled = args[0];
      if (isEnabled) {
        screenData.context.imageSmoothingEnabled = false;
        screenData.pixelMode = true;
      } else {
        screenData.context.imageSmoothingEnabled = true;
        screenData.pixelMode = false;
      }
    }
    __name(setPixelMode, "setPixelMode");
    pi2._.addCommand("setPen", setPen, false, true, ["pen", "size", "noise"]);
    pi2._.addSetting("pen", setPen, true, ["pen", "size", "noise"]);
    function setPen(screenData, args) {
      let pen = args[0];
      let size = Math.round(args[1]);
      let noise = args[2];
      if (!piData2.pens[pen]) {
        const error = new TypeError(
          `setPen: parameter pen is not a valid pen. Valid pens: ${piData2.penList.join(", ")}`
        );
        error.code = "INVALID_PEN";
        throw error;
      }
      if (!pi2.util.isInteger(size)) {
        const error = new TypeError("setPen: parameter size must be an integer");
        error.code = "INVALID_SIZE";
        throw error;
      }
      if (noise && (!pi2.util.isArray(noise) && isNaN(noise))) {
        const error = new TypeError("setPen: parameter noise is not an array or number");
        error.code = "INVALID_NOISE";
        throw error;
      }
      if (pi2.util.isArray(noise)) {
        noise = noise.slice();
        for (let i = 0; i < noise.length; i++) {
          if (isNaN(noise[i])) {
            const error = new TypeError(
              "setPen: parameter noise array contains an invalid value"
            );
            error.code = "INVALID_NOISE_VALUE";
            throw error;
          }
        }
      }
      if (pen === "pixel") {
        size = 1;
      }
      if (size < 1) {
        size = 1;
      }
      if (size === 1) {
        screenData.pen.draw = piData2.pens.pixel.cmd;
        screenData.context.lineWidth = 1;
      } else {
        screenData.pen.draw = piData2.pens[pen].cmd;
        screenData.context.lineWidth = size * 2 - 1;
      }
      screenData.pen.noise = noise;
      screenData.pen.size = size;
      screenData.context.lineCap = piData2.pens[pen].cap;
    }
    __name(setPen, "setPen");
    pi2._.addCommand("setBlendMode", setBlendMode, false, true, ["mode"]);
    pi2._.addSetting("blendMode", setBlendMode, true, ["mode"]);
    function setBlendMode(screenData, args) {
      const mode = args[0];
      if (!piData2.blendCommands[mode]) {
        const error = new TypeError(
          `setBlendMode: Argument blend is not a valid blend mode. Valid modes: ${piData2.blendCommandsList.join(", ")}`
        );
        error.code = "INVALID_BLEND_MODE";
        throw error;
      }
      screenData.blendPixelCmd = piData2.blendCommands[mode];
    }
    __name(setBlendMode, "setBlendMode");
    pi2._.addCommand("getPixel", getPixel, false, true, ["x", "y"]);
    function getPixel(screenData, args) {
      const x = Math.round(args[0]);
      const y = Math.round(args[1]);
      if (!pi2.util.isInteger(x) || !pi2.util.isInteger(y)) {
        const error = new TypeError("getPixel: x and y must be integers");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      piData2.commands.getImageData(screenData);
      const data = screenData.imageData.data;
      const i = (screenData.width * y + x) * 4;
      return pi2.util.convertToColor({
        "r": data[i],
        "g": data[i + 1],
        "b": data[i + 2],
        "a": data[i + 3]
      });
    }
    __name(getPixel, "getPixel");
    pi2._.addCommand("filterImg", filterImg, false, true, ["filter"]);
    function filterImg(screenData, args) {
      const filter = args[0];
      if (!pi2.util.isFunction(filter)) {
        const error = new TypeError("filterImg: filter must be a callback function");
        error.code = "INVALID_FILTER";
        throw error;
      }
      piData2.commands.getImageData(screenData);
      const data = screenData.imageData.data;
      for (let y = 0; y < screenData.height; y++) {
        for (let x = 0; x < screenData.width; x++) {
          const i = (screenData.width * y + x) * 4;
          const color = filter({
            "r": data[i],
            "g": data[i + 1],
            "b": data[i + 2],
            "a": data[i + 3]
          }, x, y);
          if (color && pi2.util.isInteger(color.r) && pi2.util.isInteger(color.g) && pi2.util.isInteger(color.b) && pi2.util.isInteger(color.a)) {
            data[i] = pi2.util.clamp(color.r, 0, 255);
            data[i + 1] = pi2.util.clamp(color.g, 0, 255);
            data[i + 2] = pi2.util.clamp(color.b, 0, 255);
            data[i + 3] = pi2.util.clamp(color.a, 0, 255);
          }
        }
      }
      piData2.commands.setImageDirty(screenData);
    }
    __name(filterImg, "filterImg");
    pi2._.addCommand(
      "get",
      get,
      false,
      true,
      ["x1", "y1", "x2", "y2", "tolerance", "isAddToPalette"]
    );
    function get(screenData, args) {
      let x1 = Math.round(args[0]);
      let y1 = Math.round(args[1]);
      let x2 = Math.round(args[2]);
      let y2 = Math.round(args[3]);
      const tolerance = args[4] != null ? args[4] : 1;
      const isAddToPalette = !!args[5];
      if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
        const error = new TypeError("get: parameters x1, x2, y1, y2 must be integers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      if (isNaN(tolerance)) {
        const error = new TypeError("get: parameter tolerance must be a number.");
        error.code = "INVALID_TOLERANCE";
        throw error;
      }
      x1 = pi2.util.clamp(x1, 0, screenData.width - 1);
      x2 = pi2.util.clamp(x2, 0, screenData.width - 1);
      y1 = pi2.util.clamp(y1, 0, screenData.height - 1);
      y2 = pi2.util.clamp(y2, 0, screenData.height - 1);
      if (x1 > x2) {
        const t = x1;
        x1 = x2;
        x2 = t;
      }
      if (y1 > y2) {
        const t = y1;
        y1 = y2;
        y2 = t;
      }
      piData2.commands.getImageData(screenData);
      const imageData = screenData.imageData;
      const data = [];
      let row = 0;
      for (let y = y1; y <= y2; y++) {
        data.push([]);
        for (let x = x1; x <= x2; x++) {
          const i = (screenData.width * y + x) * 4;
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          const color = pi2.util.rgbToColor(r, g, b, a);
          const colorIndex = piData2.commands.findColor(
            screenData,
            [color, tolerance, isAddToPalette]
          );
          data[row].push(colorIndex);
        }
        row += 1;
      }
      return data;
    }
    __name(get, "get");
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
    pi2._.addCommands("circle", pxCircle, aaCircle, ["x", "y", "radius", "fillColor"]);
    function pxCircle(screenData, args) {
      let x = Math.round(args[0]);
      let y = Math.round(args[1]);
      let radius = Math.round(args[2]);
      let fillColor = args[3];
      let isFill = false;
      if (!pi2.util.isInteger(x) || !pi2.util.isInteger(y) || !pi2.util.isInteger(radius)) {
        const error = new TypeError("circle: x, y, radius must be integers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      if (fillColor != null) {
        fillColor = piData2.commands.findColorValue(screenData, fillColor, "circle");
        if (fillColor === void 0) {
          return;
        }
        isFill = true;
      }
      piData2.commands.getImageData(screenData);
      const color = screenData.fColor;
      if (isFill) {
        const r = radius - 1;
        const rSquared = r * r;
        for (let dy = -r; dy <= r; dy++) {
          const py = y + dy;
          if (py < 0 || py >= screenData.height) {
            continue;
          }
          const dx = Math.floor(Math.sqrt(rSquared - dy * dy));
          for (let px = x - dx; px <= x + dx; px++) {
            if (px < 0 || px >= screenData.width) {
              continue;
            }
            piData2.commands.setPixelSafe(screenData, px, py, fillColor);
          }
        }
      }
      const outlineRadius = radius - 1;
      let x2 = outlineRadius;
      let y2 = 0;
      if (outlineRadius > 1) {
        screenData.pen.draw(screenData, x2 + x, y2 + y, color);
        screenData.pen.draw(screenData, -x2 + x, y2 + y, color);
        screenData.pen.draw(screenData, x, x2 + y, color);
        screenData.pen.draw(screenData, x, -x2 + y, color);
      } else if (outlineRadius === 1) {
        screenData.pen.draw(screenData, x + 1, y, color);
        screenData.pen.draw(screenData, x - 1, y, color);
        screenData.pen.draw(screenData, x, y + 1, color);
        screenData.pen.draw(screenData, x, y - 1, color);
        y2 = x2 + 1;
      } else if (outlineRadius === 0) {
        screenData.pen.draw(screenData, x, y, color);
        y2 = x2 + 1;
      }
      let midPoint = 1 - outlineRadius;
      while (x2 > y2) {
        y2 += 1;
        if (midPoint <= 0) {
          midPoint = midPoint + 2 * y2 + 1;
        } else {
          x2 -= 1;
          midPoint = midPoint + 2 * y2 - 2 * x2 + 1;
        }
        screenData.pen.draw(screenData, x2 + x, y2 + y, color);
        screenData.pen.draw(screenData, -x2 + x, y2 + y, color);
        screenData.pen.draw(screenData, x2 + x, -y2 + y, color);
        screenData.pen.draw(screenData, -x2 + x, -y2 + y, color);
        if (x2 !== y2) {
          screenData.pen.draw(screenData, y2 + x, x2 + y, color);
          screenData.pen.draw(screenData, -y2 + x, x2 + y, color);
          screenData.pen.draw(screenData, y2 + x, -x2 + y, color);
          screenData.pen.draw(screenData, -y2 + x, -x2 + y, color);
        }
      }
      piData2.commands.setImageDirty(screenData);
    }
    __name(pxCircle, "pxCircle");
    function aaCircle(screenData, args) {
      let x = args[0] + 0.5;
      let y = args[1] + 0.5;
      let r = args[2] - 0.9;
      let fillColor = args[3];
      if (isNaN(x) || isNaN(y) || isNaN(r)) {
        const error = new TypeError("circle: parameters x, y, r must be numbers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      if (r < 0) {
        r = 0;
      }
      let isFill = false;
      if (fillColor != null) {
        fillColor = piData2.commands.findColorValue(screenData, fillColor, "circle");
        if (fillColor === void 0) {
          return;
        }
        isFill = true;
      }
      screenData.screenObj.render();
      const ctx = screenData.context;
      const strokeColor = screenData.fColor.s;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (isFill) {
        ctx.fillStyle = fillColor.s;
        ctx.fill();
      }
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
    __name(aaCircle, "aaCircle");
    pi2._.addCommands("rect", pxRect, aaRect, ["x", "y", "width", "height", "fillColor"]);
    function pxRect(screenData, args) {
      let x = Math.round(args[0]);
      let y = Math.round(args[1]);
      let width = Math.round(args[2]);
      let height = Math.round(args[3]);
      let fillColor = args[4];
      if (!pi2.util.isInteger(x) || !pi2.util.isInteger(y) || !pi2.util.isInteger(width) || !pi2.util.isInteger(height)) {
        const error = new TypeError("rect: x, y, width, height must be integers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      const color = screenData.fColor;
      const isFill = fillColor != null;
      if (isFill) {
        fillColor = piData2.commands.findColorValue(screenData, fillColor, "rect");
        if (fillColor === void 0) {
          return;
        }
      }
      piData2.commands.getImageData(screenData);
      for (let i = 0; i < width; i++) {
        screenData.pen.draw(screenData, x + i, y, color);
        screenData.pen.draw(screenData, x + i, y + height - 1, color);
      }
      for (let i = 1; i < height - 1; i++) {
        screenData.pen.draw(screenData, x, y + i, color);
        screenData.pen.draw(screenData, x + width - 1, y + i, color);
      }
      if (isFill) {
        for (let j = 1; j < height - 1; j++) {
          for (let i = 1; i < width - 1; i++) {
            piData2.commands.setPixel(screenData, x + i, y + j, fillColor);
          }
        }
      }
      piData2.commands.setImageDirty(screenData);
    }
    __name(pxRect, "pxRect");
    function aaRect(screenData, args) {
      const x = args[0];
      const y = args[1];
      const width = args[2];
      const height = args[3];
      let fillColor = args[4];
      if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
        const error = new TypeError("rect: parameters must be numbers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      const isFill = fillColor != null;
      if (isFill) {
        fillColor = piData2.commands.findColorValue(screenData, fillColor, "rect");
        if (fillColor === void 0) {
          return;
        }
      }
      screenData.screenObj.render();
      const ctx = screenData.context;
      if (isFill) {
        ctx.fillStyle = fillColor.s;
        ctx.fillRect(x, y, width, height);
      } else {
        ctx.strokeRect(x, y, width, height);
      }
    }
    __name(aaRect, "aaRect");
    pi2._.addCommands(
      "ellipse",
      pxEllipse,
      aaEllipse,
      ["x", "y", "radiusX", "radiusY", "fillColor"]
    );
    function pxEllipse(screenData, args) {
      let x = Math.round(args[0]);
      let y = Math.round(args[1]);
      let radiusX = Math.round(args[2]);
      let radiusY = Math.round(args[3]);
      let fillColor = args[4];
      if (isNaN(x) || isNaN(y) || isNaN(radiusX) || isNaN(radiusY)) {
        const error = new TypeError(
          "ellipse: parameters x, y, radiusX, radiusY must be integers."
        );
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      let isFill = false;
      if (fillColor != null) {
        fillColor = piData2.commands.findColorValue(screenData, fillColor, "ellipse");
        if (fillColor === void 0) {
          return;
        }
        isFill = true;
      }
      piData2.commands.getImageData(screenData);
      const color = screenData.fColor;
      if (radiusX === 0 && radiusY === 0) {
        screenData.pen.draw(screenData, Math.floor(x), Math.floor(y), color);
        piData2.commands.setImageDirty(screenData);
        return;
      }
      if (isFill) {
        const rxSquared = radiusX * radiusX;
        const rySquared = radiusY * radiusY;
        for (let dy2 = -radiusY; dy2 <= radiusY; dy2++) {
          const py = y + dy2;
          if (py < 0 || py >= screenData.height) {
            continue;
          }
          const dx2 = Math.floor(radiusX * Math.sqrt(1 - dy2 * dy2 / rySquared));
          for (let px = x - dx2; px <= x + dx2; px++) {
            if (px < 0 || px >= screenData.width) {
              continue;
            }
            piData2.commands.setPixelSafe(screenData, px, py, fillColor);
          }
        }
      }
      let x2 = 0;
      let y2 = radiusY;
      let d1 = radiusY * radiusY - radiusX * radiusX * radiusY + 0.25 * radiusX * radiusX;
      let dx = 2 * radiusY * radiusY * x2;
      let dy = 2 * radiusX * radiusX * y2;
      while (dx < dy) {
        screenData.pen.draw(screenData, Math.floor(x2 + x), Math.floor(y2 + y), color);
        screenData.pen.draw(screenData, Math.floor(-x2 + x), Math.floor(y2 + y), color);
        screenData.pen.draw(screenData, Math.floor(x2 + x), Math.floor(-y2 + y), color);
        screenData.pen.draw(screenData, Math.floor(-x2 + x), Math.floor(-y2 + y), color);
        if (d1 < 0) {
          x2++;
          dx = dx + 2 * radiusY * radiusY;
          d1 = d1 + dx + radiusY * radiusY;
        } else {
          x2++;
          y2--;
          dx = dx + 2 * radiusY * radiusY;
          dy = dy - 2 * radiusX * radiusX;
          d1 = d1 + dx - dy + radiusY * radiusY;
        }
      }
      let d2 = radiusY * radiusY * ((x2 + 0.5) * (x2 + 0.5)) + radiusX * radiusX * ((y2 - 1) * (y2 - 1)) - radiusX * radiusX * radiusY * radiusY;
      while (y2 >= 0) {
        screenData.pen.draw(screenData, Math.floor(x2 + x), Math.floor(y2 + y), color);
        screenData.pen.draw(screenData, Math.floor(-x2 + x), Math.floor(y2 + y), color);
        screenData.pen.draw(screenData, Math.floor(x2 + x), Math.floor(-y2 + y), color);
        screenData.pen.draw(screenData, Math.floor(-x2 + x), Math.floor(-y2 + y), color);
        if (d2 > 0) {
          y2--;
          dy = dy - 2 * radiusX * radiusX;
          d2 = d2 + radiusX * radiusX - dy;
        } else {
          y2--;
          x2++;
          dx = dx + 2 * radiusY * radiusY;
          dy = dy - 2 * radiusX * radiusX;
          d2 = d2 + dx - dy + radiusX * radiusX;
        }
      }
      piData2.commands.setImageDirty(screenData);
    }
    __name(pxEllipse, "pxEllipse");
    function aaEllipse(screenData, args) {
      const cx = args[0];
      const cy = args[1];
      const rx = args[2];
      const ry = args[3];
      let fillColor = args[4];
      if (isNaN(cx) || isNaN(cy) || isNaN(rx) || isNaN(ry)) {
        const error = new TypeError(
          "ellipse: parameters x, y, radiusX, radiusY must be numbers."
        );
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      let isFill = false;
      if (fillColor != null) {
        fillColor = piData2.commands.findColorValue(screenData, fillColor, "ellipse");
        if (fillColor === void 0) {
          return;
        }
        isFill = true;
      }
      screenData.screenObj.render();
      const ctx = screenData.context;
      ctx.beginPath();
      ctx.strokeStyle = screenData.fColor.s;
      ctx.moveTo(cx + rx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, pi2.util.math.deg360, false);
      if (isFill) {
        ctx.fillStyle = fillColor.s;
        ctx.fill();
      }
      ctx.stroke();
      piData2.commands.resetImageData(screenData);
    }
    __name(aaEllipse, "aaEllipse");
    pi2._.addCommands("arc", pxArc, aaArc, ["x", "y", "radius", "angle1", "angle2"]);
    function pxArc(screenData, args) {
      let x = Math.round(args[0]);
      let y = Math.round(args[1]);
      let radius = Math.round(args[2]);
      let angle1 = args[3];
      let angle2 = args[4];
      angle1 = (angle1 + 360) % 360;
      angle2 = (angle2 + 360) % 360;
      const winding = angle1 > angle2;
      if (isNaN(x) || isNaN(y) || isNaN(radius)) {
        const error = new TypeError("arc: x, y, radius must be integers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      piData2.commands.getImageData(screenData);
      const color = screenData.fColor;
      function shouldDrawPixel(px, py) {
        let a = pi2.util.radiansToDegrees(Math.atan2(py - y, px - x));
        a = (a + 360) % 360;
        if (winding) {
          return a >= angle1 || a <= angle2;
        }
        return a >= angle1 && a <= angle2;
      }
      __name(shouldDrawPixel, "shouldDrawPixel");
      radius -= 1;
      if (radius < 0) {
        radius = 0;
      }
      let x2 = radius;
      let y2 = 0;
      if (radius > 1) {
        if (shouldDrawPixel(x2 + x, y2 + y)) {
          screenData.pen.draw(screenData, x2 + x, y2 + y, color);
        }
        if (shouldDrawPixel(-x2 + x, y2 + y)) {
          screenData.pen.draw(screenData, -x2 + x, y2 + y, color);
        }
        if (shouldDrawPixel(x, x2 + y)) {
          screenData.pen.draw(screenData, x, x2 + y, color);
        }
        if (shouldDrawPixel(x, -x2 + y)) {
          screenData.pen.draw(screenData, x, -x2 + y, color);
        }
      } else if (radius === 1) {
        if (shouldDrawPixel(x + 1, y)) screenData.pen.draw(screenData, x + 1, y, color);
        if (shouldDrawPixel(x - 1, y)) screenData.pen.draw(screenData, x - 1, y, color);
        if (shouldDrawPixel(x, y + 1)) screenData.pen.draw(screenData, x, y + 1, color);
        if (shouldDrawPixel(x, y - 1)) screenData.pen.draw(screenData, x, y - 1, color);
        piData2.commands.setImageDirty(screenData);
        return;
      } else if (radius === 0) {
        screenData.pen.draw(screenData, x, y, color);
        piData2.commands.setImageDirty(screenData);
        return;
      }
      let midPoint = 1 - radius;
      while (x2 > y2) {
        y2 += 1;
        if (midPoint <= 0) {
          midPoint = midPoint + 2 * y2 + 1;
        } else {
          x2 -= 1;
          midPoint = midPoint + 2 * y2 - 2 * x2 + 1;
        }
        if (shouldDrawPixel(x2 + x, y2 + y)) {
          screenData.pen.draw(screenData, x2 + x, y2 + y, color);
        }
        if (shouldDrawPixel(-x2 + x, y2 + y)) {
          screenData.pen.draw(screenData, -x2 + x, y2 + y, color);
        }
        if (shouldDrawPixel(x2 + x, -y2 + y)) {
          screenData.pen.draw(screenData, x2 + x, -y2 + y, color);
        }
        if (shouldDrawPixel(-x2 + x, -y2 + y)) {
          screenData.pen.draw(screenData, -x2 + x, -y2 + y, color);
        }
        if (x2 !== y2) {
          if (shouldDrawPixel(y2 + x, x2 + y)) {
            screenData.pen.draw(screenData, y2 + x, x2 + y, color);
          }
          if (shouldDrawPixel(-y2 + x, x2 + y)) {
            screenData.pen.draw(screenData, -y2 + x, x2 + y, color);
          }
          if (shouldDrawPixel(y2 + x, -x2 + y)) {
            screenData.pen.draw(screenData, y2 + x, -x2 + y, color);
          }
          if (shouldDrawPixel(-y2 + x, -x2 + y)) {
            screenData.pen.draw(screenData, -y2 + x, -x2 + y, color);
          }
        }
      }
      piData2.commands.setImageDirty(screenData);
    }
    __name(pxArc, "pxArc");
    function aaArc(screenData, args) {
      let x = args[0];
      let y = args[1];
      let radius = args[2];
      let angle1 = args[3];
      let angle2 = args[4];
      if (isNaN(x) || isNaN(y) || isNaN(radius) || isNaN(angle1) || isNaN(angle2)) {
        const error = new TypeError("arc: parameters must be numbers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      x = x + 0.5;
      y = y + 0.5;
      radius = radius - 0.9;
      if (radius < 0) {
        radius = 0;
      }
      screenData.screenObj.render();
      angle1 = pi2.util.degreesToRadian(angle1);
      angle2 = pi2.util.degreesToRadian(angle2);
      const ctx = screenData.context;
      ctx.beginPath();
      ctx.strokeStyle = screenData.fColor.s;
      ctx.moveTo(x + Math.cos(angle1) * radius, y + Math.sin(angle1) * radius);
      ctx.arc(x, y, radius, angle1, angle2);
      ctx.stroke();
      piData2.commands.resetImageData(screenData);
    }
    __name(aaArc, "aaArc");
  }
  __name(init5, "init");

  // src/modules/paint.js
  function init6(pi2) {
    const piData2 = pi2._.data;
    const m_maxDifference = 255 * 255 * 3.25;
    let m_setPixel;
    let m_pixels;
    pi2._.addCommand("paint", paint, false, true, ["x", "y", "fillColor", "tolerance"]);
    function paint(screenData, args) {
      let x = Math.round(args[0]);
      let y = Math.round(args[1]);
      let fillColor = args[2];
      let tolerance = args[3];
      if (!pi2.util.isInteger(x) || !pi2.util.isInteger(y)) {
        const error = new TypeError("paint: parameters x and y must be integers");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      if (tolerance == null || tolerance === false) {
        tolerance = 1;
      }
      if (isNaN(tolerance) || tolerance < 0 || tolerance > 1) {
        const error = new RangeError(
          "paint: parameter tolerance must be a number between 0 and 1."
        );
        error.code = "INVALID_TOLERANCE";
        throw error;
      }
      tolerance = tolerance * (2 - tolerance) * m_maxDifference;
      if (navigator.brave && tolerance === m_maxDifference) {
        tolerance -= 1;
      }
      const fills = [{
        "x": x,
        "y": y
      }];
      if (screenData.pen.noise) {
        m_setPixel = setPixelNoise;
      } else {
        m_setPixel = piData2.commands.setPixel;
      }
      if (pi2.util.isInteger(fillColor)) {
        if (fillColor > screenData.pal.length) {
          const error = new RangeError(
            "paint: Argument fillColor is not a color in the palette."
          );
          error.code = "COLOR_OUT_OF_RANGE";
          throw error;
        }
        fillColor = screenData.pal[fillColor];
      } else {
        fillColor = pi2.util.convertToColor(fillColor);
        if (fillColor === null) {
          const error = new TypeError(
            "paint: Argument fillColor is not a valid color format."
          );
          error.code = "INVALID_COLOR";
          throw error;
        }
      }
      m_pixels = {};
      piData2.commands.getImageData(screenData);
      const backgroundColor = piData2.commands.getPixelInternal(screenData, x, y);
      while (fills.length > 0) {
        const pixel = fills.pop();
        m_setPixel(screenData, pixel.x, pixel.y, fillColor);
        addFill(
          screenData,
          pixel.x + 1,
          pixel.y,
          fills,
          fillColor,
          backgroundColor,
          tolerance
        );
        addFill(
          screenData,
          pixel.x - 1,
          pixel.y,
          fills,
          fillColor,
          backgroundColor,
          tolerance
        );
        addFill(
          screenData,
          pixel.x,
          pixel.y + 1,
          fills,
          fillColor,
          backgroundColor,
          tolerance
        );
        addFill(
          screenData,
          pixel.x,
          pixel.y - 1,
          fills,
          fillColor,
          backgroundColor,
          tolerance
        );
      }
      m_pixels = null;
      piData2.commands.setImageDirty(screenData);
    }
    __name(paint, "paint");
    function setPixelNoise(screenData, x, y, fillColor) {
      fillColor = piData2.commands.getPixelColor(screenData, fillColor);
      piData2.commands.setPixel(screenData, x, y, fillColor);
    }
    __name(setPixelNoise, "setPixelNoise");
    function checkPixel(x, y) {
      const key = x + " " + y;
      if (m_pixels[key]) {
        return true;
      }
      m_pixels[key] = true;
      return false;
    }
    __name(checkPixel, "checkPixel");
    function addFill(screenData, x, y, fills, fillColor, backgroundColor, tolerance) {
      if (floodCheck(screenData, x, y, fillColor, backgroundColor, tolerance)) {
        m_setPixel(screenData, x, y, fillColor);
        const fill = { "x": x, "y": y };
        fills.push(fill);
      }
    }
    __name(addFill, "addFill");
    function floodCheck(screenData, x, y, fillColor, backgroundColor, tolerance) {
      if (x < 0 || x >= screenData.width || y < 0 || y >= screenData.height) {
        return false;
      }
      const pixelColor = piData2.commands.getPixelInternal(screenData, x, y);
      if (!checkPixel(x, y)) {
        const dr = pixelColor.r - backgroundColor.r;
        const dg = pixelColor.g - backgroundColor.g;
        const db = pixelColor.b - backgroundColor.b;
        const da = pixelColor.a - backgroundColor.a;
        const difference = dr * dr + dg * dg + db * db + da * da * 0.25;
        const simularity = m_maxDifference - difference;
        return simularity >= tolerance;
      }
      return false;
    }
    __name(floodCheck, "floodCheck");
  }
  __name(init6, "init");

  // src/modules/bezier.js
  function init7(pi2) {
    const piData2 = pi2._.data;
    pi2._.addCommands(
      "bezier",
      pxBezier,
      aaBezier,
      ["xStart", "yStart", "x1", "y1", "x2", "y2", "xEnd", "yEnd"]
    );
    function pxBezier(screenData, args) {
      let xStart = Math.round(args[0]);
      let yStart = Math.round(args[1]);
      let x1 = Math.round(args[2]);
      let y1 = Math.round(args[3]);
      let x2 = Math.round(args[4]);
      let y2 = Math.round(args[5]);
      let xEnd = Math.round(args[6]);
      let yEnd = Math.round(args[7]);
      if (isNaN(xStart) || isNaN(yStart) || isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || isNaN(xEnd) || isNaN(yEnd)) {
        const error = new TypeError(
          "bezier: parameters xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd must be numbers."
        );
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      const color = screenData.fColor;
      piData2.commands.getImageData(screenData);
      const minDistance = screenData.pen.size;
      const points = [
        { "x": xStart, "y": yStart },
        { "x": x1, "y": y1 },
        { "x": x2, "y": y2 },
        { "x": xEnd, "y": yEnd }
      ];
      let lastPoint = calcStep(0, points);
      screenData.pen.draw(screenData, lastPoint.x, lastPoint.y, color);
      let t = 0.1;
      let dt = 0.1;
      while (t < 1) {
        const point2 = calcStep(t, points);
        const distance = calcDistance(point2, lastPoint);
        if (distance > minDistance && dt > 1e-5) {
          t -= dt;
          dt = dt * 0.75;
        } else {
          screenData.pen.draw(screenData, point2.x, point2.y, color);
          lastPoint = point2;
        }
        t += dt;
      }
      const point = calcStep(1, points);
      screenData.pen.draw(screenData, point.x, point.y, color);
      piData2.commands.setImageDirty(screenData);
    }
    __name(pxBezier, "pxBezier");
    function aaBezier(screenData, args) {
      let xStart = args[0] + 0.5;
      let yStart = args[1] + 0.5;
      let x1 = args[2] + 0.5;
      let y1 = args[3] + 0.5;
      let x2 = args[4] + 0.5;
      let y2 = args[5] + 0.5;
      let xEnd = args[6] + 0.5;
      let yEnd = args[7] + 0.5;
      if (isNaN(xStart) || isNaN(yStart) || isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || isNaN(xEnd) || isNaN(yEnd)) {
        const error = new TypeError(
          "bezier: parameters xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd must be numbers."
        );
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      screenData.screenObj.render();
      const ctx = screenData.context;
      ctx.strokeStyle = screenData.fColor.s;
      ctx.beginPath();
      ctx.moveTo(xStart, yStart);
      ctx.bezierCurveTo(x1, y1, x2, y2, xEnd, yEnd);
      ctx.stroke();
      piData2.commands.resetImageData(screenData);
    }
    __name(aaBezier, "aaBezier");
    function calcDistance(p1, p2) {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return dx * dx + dy * dy;
    }
    __name(calcDistance, "calcDistance");
    function calcStep(t, points) {
      const a = 1 - t;
      const a2 = a * a;
      const a3 = a * a * a;
      const t2 = t * t;
      const t3 = t * t * t;
      return {
        "x": Math.round(
          a3 * points[0].x + 3 * a2 * t * points[1].x + 3 * a * t2 * points[2].x + t3 * points[3].x
        ),
        "y": Math.round(
          a3 * points[0].y + 3 * a2 * t * points[1].y + 3 * a * t2 * points[2].y + t3 * points[3].y
        )
      };
    }
    __name(calcStep, "calcStep");
  }
  __name(init7, "init");

  // src/modules/images.js
  function init8(pi2) {
    const piData2 = pi2._.data;
    const m_piWait = pi2._.wait;
    const m_piResume = pi2._.resume;
    let m_callback = null;
    pi2._.addCommand("loadImage", loadImage, false, false, ["src", "name"]);
    function loadImage(args) {
      let src = args[0];
      let name = args[1];
      let image;
      let callback;
      let tempOnload;
      if (typeof src === "string") {
        image = new Image();
        image.src = src;
      } else {
        if (!src || src.tagName !== "IMG" && src.tagName !== "CANVAS") {
          const error = new TypeError(
            "loadImage: src must be a string, image element, or canvas."
          );
          error.code = "INVALID_IMAGE_SOURCE";
          throw error;
        }
        image = src;
      }
      if (typeof name !== "string") {
        name = "" + piData2.imageCount;
        piData2.imageCount += 1;
      }
      piData2.images[name] = {
        "image": null,
        "type": "image"
      };
      callback = m_callback;
      m_callback = null;
      if (!image.complete) {
        m_piWait();
        if (pi2.util.isFunction(image.onload)) {
          tempOnload = image.onload;
        }
        image.onload = function() {
          if (tempOnload) {
            tempOnload();
          }
          piData2.images[name].image = image;
          if (pi2.util.isFunction(callback)) {
            callback();
          }
          m_piResume();
        };
      } else {
        piData2.images[name].image = image;
        if (pi2.util.isFunction(callback)) {
          callback();
        }
      }
      return name;
    }
    __name(loadImage, "loadImage");
    pi2._.addCommand(
      "loadSpritesheet",
      loadSpritesheet,
      false,
      false,
      ["src", "name", "width", "height", "margin"]
    );
    function loadSpritesheet(args) {
      let src = args[0];
      let name = args[1];
      let spriteWidth = args[2];
      let spriteHeight = args[3];
      let margin = args[4];
      if (margin == null) {
        margin = 0;
      }
      let isAuto = false;
      if (spriteWidth == null && spriteHeight == null) {
        isAuto = true;
        spriteWidth = 0;
        spriteHeight = 0;
        margin = 0;
      }
      spriteWidth = Math.round(spriteWidth);
      spriteHeight = Math.round(spriteHeight);
      margin = Math.round(margin);
      if (!isAuto && (!pi2.util.isInteger(spriteWidth) || !pi2.util.isInteger(spriteHeight))) {
        const error = new TypeError(
          "loadSpriteSheet: width, and height must be integers."
        );
        error.code = "INVALID_SPRITE_SIZE";
        throw error;
      }
      if (!isAuto && (spriteWidth < 1 || spriteHeight < 1)) {
        const error = new RangeError(
          "loadSpriteSheet: width, and height must be greater than 0."
        );
        error.code = "INVALID_SPRITE_SIZE";
        throw error;
      }
      if (!pi2.util.isInteger(margin)) {
        const error = new TypeError("loadSpriteSheet: margin must be an integer.");
        error.code = "INVALID_MARGIN";
        throw error;
      }
      if (typeof name !== "string") {
        name = "" + piData2.imageCount;
        piData2.imageCount += 1;
      }
      m_callback = /* @__PURE__ */ __name(function() {
        const imageData = piData2.images[name];
        imageData.type = "spritesheet";
        imageData.spriteWidth = spriteWidth;
        imageData.spriteHeight = spriteHeight;
        imageData.margin = margin;
        imageData.frames = [];
        imageData.isAuto = isAuto;
        const width = imageData.image.width;
        const height = imageData.image.height;
        if (imageData.isAuto) {
          let getCluster = function(x, y, frameData) {
            const clusterName = x + "_" + y;
            if (searched[clusterName] || x < 0 || x >= width || y < 0 || y >= height) {
              return;
            }
            const clusters = [];
            clusters.push([x, y, clusterName]);
            while (clusters.length > 0) {
              const cluster = clusters.pop();
              x = cluster[0];
              y = cluster[1];
              const name2 = cluster[2];
              searched[name2] = true;
              const index = (x + y * width) * 4;
              if (data[index + 3] > 0) {
                frameData.x = Math.min(frameData.x, x);
                frameData.y = Math.min(frameData.y, y);
                frameData.right = Math.max(frameData.right, x);
                frameData.bottom = Math.max(frameData.bottom, y);
                frameData.width = frameData.right - frameData.x + 1;
                frameData.height = frameData.bottom - frameData.y + 1;
                for (let i = 0; i < dirs.length; i++) {
                  const x2 = x + dirs[i][0];
                  const y2 = y + dirs[i][1];
                  const name22 = x2 + "_" + y2;
                  if (!(searched[name22] || x2 < 0 || x2 >= width || y2 < 0 || y2 >= height)) {
                    clusters.push([x2, y2, name22]);
                  }
                }
              }
            }
          };
          __name(getCluster, "getCluster");
          const searched = {};
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { "willReadFrequently": true });
          context.drawImage(imageData.image, 0, 0);
          const dirs = [
            [-1, -1],
            [0, -1],
            [1, -1],
            [-1, 0],
            [1, 0],
            [-1, 1],
            [0, 1],
            [1, 1]
          ];
          const data = context.getImageData(0, 0, width, height).data;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) {
              const index = (i - 3) / 4;
              const x1 = index % width;
              const y1 = Math.floor(index / width);
              const frameData = {
                "x": width,
                "y": height,
                "width": 0,
                "height": 0,
                "right": 0,
                "bottom": 0
              };
              getCluster(x1, y1, frameData);
              if (frameData.width + frameData.height > 4) {
                imageData.frames.push(frameData);
              }
            }
          }
        } else {
          let x1 = imageData.margin;
          let y1 = imageData.margin;
          let x2 = x1 + imageData.spriteWidth;
          let y2 = y1 + imageData.spriteHeight;
          while (y2 <= height - imageData.margin) {
            while (x2 <= width - imageData.margin) {
              imageData.frames.push({
                "x": x1,
                "y": y1,
                "width": imageData.spriteWidth,
                "height": imageData.spriteHeight,
                "right": x1 + imageData.spriteWidth - 1,
                "bottom": y1 + imageData.spriteHeight - 1
              });
              x1 += imageData.spriteWidth + imageData.margin;
              x2 = x1 + imageData.spriteWidth;
            }
            x1 = imageData.margin;
            x2 = x1 + imageData.spriteWidth;
            y1 += imageData.spriteHeight + imageData.margin;
            y2 = y1 + imageData.spriteHeight;
          }
        }
      }, "m_callback");
      loadImage([src, name]);
      return name;
    }
    __name(loadSpritesheet, "loadSpritesheet");
    pi2._.addCommand("getSpritesheetData", getSpritesheetData, false, true, ["name"]);
    function getSpritesheetData(screenData, args) {
      const name = args[0];
      if (!piData2.images[name]) {
        const error = new Error("getSpritesheetData: invalid sprite name");
        error.code = "INVALID_SPRITE_NAME";
        throw error;
      }
      const sprite = piData2.images[name];
      if (sprite.type !== "spritesheet") {
        const error = new Error("getSpritesheetData: image is not a sprite");
        error.code = "NOT_A_SPRITESHEET";
        throw error;
      }
      const spriteData = {
        "frameCount": sprite.frames.length,
        "frames": []
      };
      for (let i = 0; i < sprite.frames.length; i++) {
        spriteData.frames.push({
          "index": i,
          "x": sprite.frames[i].x,
          "y": sprite.frames[i].y,
          "width": sprite.frames[i].width,
          "height": sprite.frames[i].height,
          "left": sprite.frames[i].x,
          "top": sprite.frames[i].y,
          "right": sprite.frames[i].right,
          "bottom": sprite.frames[i].bottom
        });
      }
      return spriteData;
    }
    __name(getSpritesheetData, "getSpritesheetData");
    pi2._.addCommand("getImage", getImage, false, true, ["name", "x1", "y1", "x2", "y2"]);
    function getImage(screenData, args) {
      let name = args[0];
      const x1 = Math.round(args[1]);
      const y1 = Math.round(args[2]);
      const x2 = Math.round(args[3]);
      const y2 = Math.round(args[4]);
      if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
        const error = new TypeError("getImage: parameters x1, x2, y1, y2 must be integers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      if (typeof name !== "string") {
        name = "" + piData2.imageCount;
        piData2.imageCount += 1;
      } else if (piData2.images[name]) {
        const error = new Error(
          `getImage: name ${name} is already used; name must be unique.`
        );
        error.code = "DUPLICATE_IMAGE_NAME";
        throw error;
      }
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const width = Math.abs(x1 - x2);
      const height = Math.abs(y1 - y2);
      canvas.width = width;
      canvas.height = height;
      screenData.screenObj.render();
      context.drawImage(screenData.screenObj.canvas(), x1, y1, width, height, 0, 0, width, height);
      piData2.images[name] = {
        "image": canvas,
        "type": "image"
      };
      return name;
    }
    __name(getImage, "getImage");
    pi2._.addCommand("removeImage", removeImage, false, false, ["name"]);
    function removeImage(args) {
      const name = args[0];
      if (typeof name !== "string") {
        const error = new TypeError("removeImage: name must be a string.");
        error.code = "INVALID_NAME";
        throw error;
      }
      delete piData2.images[name];
    }
    __name(removeImage, "removeImage");
    pi2._.addCommand(
      "drawImage",
      drawImage,
      false,
      true,
      ["name", "x", "y", "angle", "anchorX", "anchorY", "alpha", "scaleX", "scaleY"]
    );
    function drawImage(screenData, args) {
      const name = args[0];
      const x = args[1];
      const y = args[2];
      const angle = args[3];
      const anchorX = args[4];
      const anchorY = args[5];
      const alpha = args[6];
      const scaleX = args[7];
      const scaleY = args[8];
      let img;
      if (typeof name === "string") {
        if (!piData2.images[name]) {
          const error = new Error("drawImage: invalid image name");
          error.code = "INVALID_IMAGE_NAME";
          throw error;
        }
        img = piData2.images[name].image;
      } else {
        if (!name || !name.canvas && !name.getContext) {
          const error = new TypeError(
            "drawImage: image source object type must be an image already loaded by the loadImage command or a screen."
          );
          error.code = "INVALID_IMAGE_SOURCE";
          throw error;
        }
        if (pi2.util.isFunction(name.canvas)) {
          img = name.canvas();
        } else {
          img = name;
        }
      }
      if (isNaN(x) || isNaN(y)) {
        const error = new TypeError("drawImage: parameters x and y must be numbers");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      drawItem(screenData, img, x, y, angle, anchorX, anchorY, alpha, null, scaleX, scaleY);
    }
    __name(drawImage, "drawImage");
    pi2._.addCommand(
      "drawSprite",
      drawSprite,
      false,
      true,
      [
        "name",
        "frame",
        "x",
        "y",
        "angle",
        "anchorX",
        "anchorY",
        "alpha",
        "scaleX",
        "scaleY"
      ]
    );
    function drawSprite(screenData, args) {
      const name = args[0];
      const frame = args[1];
      const x = args[2];
      const y = args[3];
      const angle = args[4];
      const anchorX = args[5];
      const anchorY = args[6];
      const alpha = args[7];
      const scaleX = args[8];
      const scaleY = args[9];
      if (!piData2.images[name]) {
        const error = new Error("drawSprite: invalid sprite name");
        error.code = "INVALID_SPRITE_NAME";
        throw error;
      }
      if (!pi2.util.isInteger(frame) || frame >= piData2.images[name].frames.length || frame < 0) {
        const error = new RangeError("drawSprite: frame number is not valid");
        error.code = "INVALID_FRAME";
        throw error;
      }
      if (isNaN(x) || isNaN(y)) {
        const error = new TypeError("drawSprite: parameters x and y must be numbers");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      const img = piData2.images[name].image;
      drawItem(
        screenData,
        img,
        x,
        y,
        angle,
        anchorX,
        anchorY,
        alpha,
        piData2.images[name].frames[frame],
        scaleX,
        scaleY
      );
    }
    __name(drawSprite, "drawSprite");
    function drawItem(screenData, img, x, y, angle, anchorX, anchorY, alpha, spriteData, scaleX, scaleY) {
      if (scaleX == null || isNaN(Number(scaleX))) {
        scaleX = 1;
      }
      if (scaleY == null || isNaN(Number(scaleY))) {
        scaleY = 1;
      }
      if (angle == null) {
        angle = 0;
      }
      angle = pi2.util.degreesToRadian(angle);
      if (!anchorX) {
        anchorX = 0;
      }
      if (!anchorY) {
        anchorY = 0;
      }
      if (!alpha && alpha !== 0) {
        alpha = 255;
      }
      if (spriteData) {
        anchorX = Math.round(spriteData.width * anchorX);
        anchorY = Math.round(spriteData.height * anchorY);
      } else {
        anchorX = Math.round(img.width * anchorX);
        anchorY = Math.round(img.height * anchorY);
      }
      const context = screenData.context;
      const oldAlpha = context.globalAlpha;
      context.globalAlpha = alpha / 255;
      screenData.screenObj.render();
      context.translate(x, y);
      context.rotate(angle);
      context.scale(scaleX, scaleY);
      if (spriteData == null) {
        context.drawImage(img, -anchorX, -anchorY);
      } else {
        context.drawImage(
          img,
          spriteData.x,
          spriteData.y,
          spriteData.width,
          spriteData.height,
          -anchorX,
          -anchorY,
          spriteData.width,
          spriteData.height
        );
      }
      context.scale(1 / scaleX, 1 / scaleY);
      context.rotate(-angle);
      context.translate(-x, -y);
      context.globalAlpha = oldAlpha;
      piData2.commands.resetImageData(screenData);
    }
    __name(drawItem, "drawItem");
  }
  __name(init8, "init");

  // src/modules/font.js
  function init9(pi2) {
    const piData2 = pi2._.data;
    const m_piWait = pi2._.wait;
    const m_piResume = pi2._.resume;
    pi2._.addCommand(
      "loadFont",
      loadFont,
      false,
      false,
      ["fontSrc", "width", "height", "charSet", "isEncoded"]
    );
    function loadFont(args) {
      const fontSrc = args[0];
      const width = Math.round(args[1]);
      const height = Math.round(args[2]);
      let charSet = args[3];
      const isEncoded = !!args[4];
      if (isNaN(width) || isNaN(height)) {
        const error = new TypeError("loadFont: width and height must be integers.");
        error.code = "INVALID_FONT_SIZE";
        throw error;
      }
      if (!charSet) {
        charSet = [];
        for (let i = 0; i < 256; i += 1) {
          charSet.push(i);
        }
      }
      if (!(pi2.util.isArray(charSet) || typeof charSet === "string")) {
        const error = new TypeError("loadFont: charSet must be an array or a string.");
        error.code = "INVALID_CHARSET";
        throw error;
      }
      if (typeof charSet === "string") {
        const temp = [];
        for (let i = 0; i < charSet.length; i += 1) {
          temp.push(charSet.charCodeAt(i));
        }
        charSet = temp;
      }
      const chars = {};
      for (let i = 0; i < charSet.length; i += 1) {
        chars[charSet[i]] = i;
      }
      const font = {
        "id": piData2.nextFontId,
        "width": width,
        "height": height,
        "data": [],
        "chars": chars,
        "charSet": charSet,
        "colorCount": 2,
        "mode": "pixel",
        "printFunction": piData2.commands.piPrint,
        "calcWidth": piData2.commands.piCalcWidth,
        "image": null,
        "sWidth": width,
        "sHeight": height
      };
      if (!isEncoded) {
        font.mode = "bitmap";
        font.printFunction = piData2.commands.bitmapPrint;
      }
      piData2.fonts[font.id] = font;
      piData2.nextFontId += 1;
      if (isEncoded) {
        loadFontFromBase32Encoded(fontSrc, width, height, font);
      } else {
        loadFontFromImg(fontSrc, font);
      }
      return font.id;
    }
    __name(loadFont, "loadFont");
    function loadFontFromBase32Encoded(fontSrc, width, height, font) {
      font.data = decompressFont(fontSrc, width, height);
    }
    __name(loadFontFromBase32Encoded, "loadFontFromBase32Encoded");
    function decompressFont(numStr, width, height) {
      const size = 32;
      const base = 32;
      let bin = "";
      const data = [];
      numStr = "" + numStr;
      const nums = numStr.split(",");
      for (let i2 = 0; i2 < nums.length; i2++) {
        let num = parseInt(nums[i2], base).toString(2);
        for (let j = num.length; j < size; j++) {
          num = "0" + num;
        }
        bin += num;
      }
      let i = 0;
      if (bin.length % size > 0) {
        console.warn("loadFont: Invalid font data.");
        return data;
      }
      while (i < bin.length) {
        data.push([]);
        const index = data.length - 1;
        for (let y = 0; y < height; y += 1) {
          data[index].push([]);
          for (let x = 0; x < width; x += 1) {
            let num;
            if (i >= bin.length) {
              num = 0;
            } else {
              num = parseInt(bin[i]);
              if (isNaN(num)) {
                num = 0;
              }
            }
            data[index][y].push(num);
            i += 1;
          }
        }
      }
      return data;
    }
    __name(decompressFont, "decompressFont");
    function loadFontFromImg(fontSrc, font) {
      let img;
      if (typeof fontSrc === "string") {
        img = new Image();
        img.src = fontSrc;
      } else if (fontSrc instanceof HTMLImageElement) {
        img = fontSrc;
      } else {
        const error = new TypeError(
          "loadFont: fontSrc must be a string, image or canvas."
        );
        error.code = "INVALID_FONT_SOURCE";
        throw error;
      }
      if (!img.complete) {
        m_piWait();
        img.onload = function() {
          font.image = img;
          m_piResume();
        };
        img.onerror = function(err) {
          console.warn("loadFont: unable to load image for font.");
          m_piResume();
        };
      } else {
        font.image = img;
      }
    }
    __name(loadFontFromImg, "loadFontFromImg");
    pi2._.addCommand("setDefaultFont", setDefaultFont, false, false, ["fontId"]);
    pi2._.addSetting("defaultFont", setDefaultFont, false, ["fontId"]);
    function setDefaultFont(args) {
      const fontId = parseInt(args[0]);
      if (isNaN(fontId) || fontId < 0 || !piData2.fonts[fontId]) {
        const error = new Error("setDefaultFont: invalid fontId");
        error.code = "INVALID_FONT_ID";
        throw error;
      }
      piData2.defaultFont = piData2.fonts[fontId];
    }
    __name(setDefaultFont, "setDefaultFont");
    pi2._.addCommand("setFont", setFont, false, true, ["fontId"]);
    pi2._.addSetting("font", setFont, true, ["fontId"]);
    function setFont(screenData, args) {
      const fontId = args[0];
      if (piData2.fonts[fontId]) {
        const font = piData2.fonts[fontId];
        screenData.printCursor.font = font;
        screenData.printCursor.cols = Math.floor(screenData.width / font.width);
        screenData.printCursor.rows = Math.floor(screenData.height / font.height);
      } else if (typeof fontId === "string") {
        screenData.context.font = fontId;
        screenData.context.textBaseline = "top";
        const size = calcFontSize(screenData.context);
        screenData.printCursor.font = {
          "name": screenData.context.font,
          "width": size.width,
          "height": size.height,
          "mode": "canvas",
          "printFunction": piData2.commands.canvasPrint,
          "calcWidth": piData2.commands.canvasCalcWidth
        };
        screenData.printCursor.cols = Math.floor(screenData.width / size.width);
        screenData.printCursor.rows = Math.floor(screenData.height / size.height);
      }
    }
    __name(setFont, "setFont");
    function calcFontSize(context) {
      let px = context.measureText("M").width;
      px = Math.round(px * 1.5);
      const tCanvas = document.createElement("canvas");
      tCanvas.width = px;
      tCanvas.height = px;
      const tContext = tCanvas.getContext("2d", { "willReadFrequently": true });
      tContext.font = context.font;
      tContext.textBaseline = "top";
      tContext.fillStyle = "#FF0000";
      const size = {
        "height": 0,
        "width": 0
      };
      tContext.fillText("M", 0, 0);
      const data = tContext.getImageData(0, 0, px, px).data;
      for (let y = 0; y < px; y++) {
        for (let x = 0; x < px; x++) {
          const i = (y * px + x) * 4;
          if (data[i + 3] > 0) {
            if (x > size.width) {
              size.width = x;
            }
            if (y > size.height) {
              size.height = y;
            }
          }
        }
      }
      size.width += 1;
      size.height += 1;
      return size;
    }
    __name(calcFontSize, "calcFontSize");
    pi2._.addCommand("canvasPrint", canvasPrint, true, false);
    function canvasPrint(screenData, msg, x, y) {
      screenData.context.fillStyle = screenData.fColor.s;
      screenData.context.fillText(msg, x, y);
    }
    __name(canvasPrint, "canvasPrint");
    pi2._.addCommand("bitmapPrint", bitmapPrint, true, false);
    function bitmapPrint(screenData, msg, x, y) {
      screenData.screenObj.render();
      const font = screenData.printCursor.font;
      const width = font.image.width;
      const columns = Math.floor(width / font.sWidth);
      for (let i = 0; i < msg.length; i++) {
        const charIndex = font.chars[msg.charCodeAt(i)];
        const sx = charIndex % columns * font.sWidth;
        const sy = Math.floor(charIndex / columns) * font.sHeight;
        screenData.context.drawImage(
          font.image,
          sx,
          sy,
          font.sWidth,
          font.sHeight,
          x + font.width * i,
          y,
          font.width,
          font.height
        );
      }
    }
    __name(bitmapPrint, "bitmapPrint");
    pi2._.addCommand("getAvailableFonts", getAvailableFonts, false, false, []);
    function getAvailableFonts() {
      const data = [];
      for (const i in piData2.fonts) {
        data.push({
          "id": piData2.fonts[i].id,
          "width": piData2.fonts[i].width,
          "height": piData2.fonts[i].height
        });
      }
      return data;
    }
    __name(getAvailableFonts, "getAvailableFonts");
    pi2._.addCommand("setFontSize", setFontSize, false, true, ["width", "height"]);
    pi2._.addSetting("fontSize", setFontSize, true, ["width", "height"]);
    function setFontSize(screenData, args) {
      const width = args[0];
      const height = args[1];
      if (isNaN(width)) {
        const error = new TypeError("setFontSize: width must be a number");
        error.code = "INVALID_WIDTH";
        throw error;
      }
      if (isNaN(height)) {
        const error = new TypeError("setFontSize: height must be a number");
        error.code = "INVALID_HEIGHT";
        throw error;
      }
      if (screenData.printCursor.font.mode !== "bitmap") {
        console.warn("setFontSize: only bitmap fonts can change sizes");
        return;
      }
      screenData.printCursor.font.width = width;
      screenData.printCursor.font.height = height;
      screenData.printCursor.cols = Math.floor(screenData.width / width);
      screenData.printCursor.rows = Math.floor(screenData.height / height);
    }
    __name(setFontSize, "setFontSize");
    pi2._.addCommand("setChar", setChar, false, true, ["code", "data"]);
    pi2._.addSetting("char", setChar, true, ["code", "data"]);
    function setChar(screenData, args) {
      let code = args[0];
      let data = args[1];
      if (screenData.printCursor.font.mode !== "pixel") {
        console.warn("setChar: only pixel fonts can change characters");
        return;
      }
      if (typeof code === "string") {
        code = code.charCodeAt(0);
      } else {
        code = Math.round(code);
      }
      if (isNaN(code)) {
        const error = new TypeError("setChar: code must be an integer or a string");
        error.code = "INVALID_CODE";
        throw error;
      }
      if (typeof data === "string") {
        data = pi2.util.hexToData(
          data,
          screenData.printCursor.font.width,
          screenData.printCursor.font.height
        );
      } else if (pi2.util.isArray(data)) {
        if (data.length !== screenData.printCursor.font.height) {
          const error = new RangeError("setChar: data array is the wrong length");
          error.code = "INVALID_DATA_LENGTH";
          throw error;
        }
        for (let i = 0; i < data.length; i++) {
          if (data[i].length !== screenData.printCursor.font.width) {
            const error = new RangeError("setChar: data array row is the wrong length");
            error.code = "INVALID_DATA_WIDTH";
            throw error;
          }
          for (let j = 0; j < data[i].length; j++) {
            if (!pi2.util.isInteger(data[i][j])) {
              const error = new TypeError("setChar: data array contains invalid data");
              error.code = "INVALID_DATA_VALUE";
              throw error;
            }
          }
        }
      } else {
        const error = new TypeError("setChar: data must be a string or an array");
        error.code = "INVALID_DATA_TYPE";
        throw error;
      }
      screenData.printCursor.font.data[code] = data;
    }
    __name(setChar, "setChar");
  }
  __name(init9, "init");

  // src/modules/print.js
  function init10(pi2) {
    const piData2 = pi2._.data;
    pi2._.addCommand("print", print, false, true, ["msg", "inLine", "isCentered"]);
    function print(screenData, args) {
      let msg = args[0];
      const inLine = args[1];
      const isCentered = args[2];
      if (screenData.printCursor.font.height > screenData.height) {
        return;
      }
      if (msg === void 0) {
        msg = "";
      } else if (typeof msg !== "string") {
        msg = "" + msg;
      }
      msg = msg.replace(/\t/g, "    ");
      const parts = msg.split(/\n/);
      for (let i = 0; i < parts.length; i++) {
        startPrint(screenData, parts[i], inLine, isCentered);
      }
    }
    __name(print, "print");
    function startPrint(screenData, msg, inLine, isCentered) {
      const printCursor = screenData.printCursor;
      let width = printCursor.font.calcWidth(screenData, msg);
      if (isCentered) {
        printCursor.x = Math.floor(
          (printCursor.cols - msg.length) / 2
        ) * screenData.printCursor.font.width;
      }
      if (!inLine && !isCentered && width + printCursor.x > screenData.width && msg.length > 1) {
        const overlap = width + printCursor.x - screenData.width;
        const onScreen = width - overlap;
        const onScreenPct = onScreen / width;
        let msgSplit = Math.floor(msg.length * onScreenPct);
        let msg1 = msg.substring(0, msgSplit);
        let msg2 = msg.substring(msgSplit, msg.length);
        if (printCursor.breakWord) {
          const index = msg1.lastIndexOf(" ");
          if (index > -1) {
            msg2 = msg1.substring(index).trim() + msg2;
            msg1 = msg1.substring(0, index);
          }
        }
        startPrint(screenData, msg1, inLine, isCentered);
        startPrint(screenData, msg2, inLine, isCentered);
        return;
      }
      if (printCursor.y + printCursor.font.height > screenData.height) {
        if (printCursor.font.mode === "canvas") {
          screenData.screenObj.render();
        }
        shiftImageUp(screenData, printCursor.font.height);
        printCursor.y -= printCursor.font.height;
      }
      printCursor.font.printFunction(screenData, msg, printCursor.x, printCursor.y);
      if (!inLine) {
        printCursor.y += printCursor.font.height;
        printCursor.x = 0;
      } else {
        printCursor.x += printCursor.font.width * msg.length;
        if (printCursor.x > screenData.width - printCursor.font.width) {
          printCursor.x = 0;
          printCursor.y += printCursor.font.height;
        }
      }
    }
    __name(startPrint, "startPrint");
    function shiftImageUp(screenData, yOffset) {
      if (yOffset <= 0) {
        return;
      }
      piData2.commands.getImageData(screenData);
      let y = yOffset;
      for (; y < screenData.height; y++) {
        for (let x = 0; x < screenData.width; x++) {
          const iDest = (screenData.width * y + x) * 4;
          const iSrc = (screenData.width * (y - yOffset) + x) * 4;
          const data = screenData.imageData.data;
          screenData.imageData.data[iSrc] = data[iDest];
          screenData.imageData.data[iSrc + 1] = data[iDest + 1];
          screenData.imageData.data[iSrc + 2] = data[iDest + 2];
          screenData.imageData.data[iSrc + 3] = data[iDest + 3];
        }
      }
      for (y = screenData.height - yOffset; y < screenData.height; y++) {
        for (let x = 0; x < screenData.width; x++) {
          const iSrc = (screenData.width * y + x) * 4;
          screenData.imageData.data[iSrc] = 0;
          screenData.imageData.data[iSrc + 1] = 0;
          screenData.imageData.data[iSrc + 2] = 0;
          screenData.imageData.data[iSrc + 3] = 0;
        }
      }
      piData2.commands.setImageDirty(screenData);
    }
    __name(shiftImageUp, "shiftImageUp");
    pi2._.addCommand("piCalcWidth", piCalcWidth, true, false);
    function piCalcWidth(screenData, msg) {
      return screenData.printCursor.font.width * msg.length;
    }
    __name(piCalcWidth, "piCalcWidth");
    pi2._.addCommand("canvasCalcWidth", canvasCalcWidth, true, false);
    function canvasCalcWidth(screenData, msg) {
      return screenData.context.measureText(msg).width;
    }
    __name(canvasCalcWidth, "canvasCalcWidth");
    pi2._.addCommand("setWordBreak", setWordBreak, false, true, ["isEnabled"]);
    pi2._.addSetting("wordBreak", setWordBreak, true, ["isEnabled"]);
    function setWordBreak(screenData, args) {
      screenData.printCursor.breakWord = !!args[0];
    }
    __name(setWordBreak, "setWordBreak");
    pi2._.addCommand("piPrint", piPrint, true, false);
    function piPrint(screenData, msg, x, y) {
      const printCursor = screenData.printCursor;
      const defaultPal = screenData.pal;
      screenData.pal = [screenData.pal[0], screenData.fColor];
      for (let i = 0; i < msg.length; i++) {
        const charIndex = printCursor.font.chars[msg.charCodeAt(i)];
        if (charIndex !== void 0 && printCursor.font.data[charIndex]) {
          screenData.screenObj.put(
            printCursor.font.data[charIndex],
            x + i * printCursor.font.width,
            y,
            false
          );
        }
      }
      screenData.pal = defaultPal;
    }
    __name(piPrint, "piPrint");
    pi2._.addCommand("setPos", setPos, false, true, ["col", "row"]);
    pi2._.addSetting("pos", setPos, true, ["col", "row"]);
    function setPos(screenData, args) {
      const col = args[0];
      const row = args[1];
      if (col != null) {
        if (isNaN(col)) {
          const error = new TypeError("setPos: parameter col must be a number");
          error.code = "INVALID_COL";
          throw error;
        }
        let x = Math.floor(col * screenData.printCursor.font.width);
        if (x > screenData.width) {
          x = screenData.width - screenData.printCursor.font.width;
        }
        screenData.printCursor.x = x;
      }
      if (row != null) {
        if (isNaN(row)) {
          const error = new TypeError("setPos: parameter row must be a number");
          error.code = "INVALID_ROW";
          throw error;
        }
        let y = Math.floor(row * screenData.printCursor.font.height);
        if (y > screenData.height) {
          y = screenData.height - screenData.printCursor.font.height;
        }
        screenData.printCursor.y = y;
      }
    }
    __name(setPos, "setPos");
    pi2._.addCommand("setPosPx", setPosPx, false, true, ["x", "y"]);
    pi2._.addSetting("posPx", setPosPx, true, ["x", "y"]);
    function setPosPx(screenData, args) {
      const x = args[0];
      const y = args[1];
      if (x != null) {
        if (isNaN(x)) {
          const error = new TypeError("setPosPx: parameter x must be an integer");
          error.code = "INVALID_X";
          throw error;
        }
        screenData.printCursor.x = Math.round(x);
      }
      if (y != null) {
        if (isNaN(y)) {
          const error = new TypeError("setPosPx: parameter y must be an integer");
          error.code = "INVALID_Y";
          throw error;
        }
        screenData.printCursor.y = Math.round(y);
      }
    }
    __name(setPosPx, "setPosPx");
    pi2._.addCommand("getPos", getPos, false, true, []);
    function getPos(screenData) {
      return {
        "col": Math.floor(
          screenData.printCursor.x / screenData.printCursor.font.width
        ),
        "row": Math.floor(
          screenData.printCursor.y / screenData.printCursor.font.height
        )
      };
    }
    __name(getPos, "getPos");
    pi2._.addCommand("getCols", getCols, false, true, []);
    function getCols(screenData) {
      return screenData.printCursor.cols;
    }
    __name(getCols, "getCols");
    pi2._.addCommand("getRows", getRows, false, true, []);
    function getRows(screenData) {
      return screenData.printCursor.rows;
    }
    __name(getRows, "getRows");
    pi2._.addCommand("getPosPx", getPosPx, false, true, []);
    function getPosPx(screenData) {
      return {
        "x": screenData.printCursor.x,
        "y": screenData.printCursor.y
      };
    }
    __name(getPosPx, "getPosPx");
  }
  __name(init10, "init");

  // src/modules/table.js
  function init11(pi2) {
    const piData2 = pi2._.data;
    const m_borderStyles = {
      "single": [
        [218, 196, 194, 191],
        [195, 196, 197, 180],
        [192, 196, 193, 217],
        [179, 32, 179]
      ],
      "double": [
        [201, 205, 203, 187],
        [204, 205, 206, 185],
        [200, 205, 202, 188],
        [186, 32, 186]
      ],
      "singleDouble": [
        [213, 205, 209, 184],
        [198, 205, 216, 181],
        [212, 205, 207, 190],
        [179, 32, 179]
      ],
      "doubleSingle": [
        [214, 196, 210, 183],
        [199, 196, 215, 182],
        [211, 196, 208, 189],
        [186, 32, 186]
      ],
      "thick": [
        [219, 223, 219, 219],
        [219, 223, 219, 219],
        [223, 223, 223, 223],
        [219, 32, 219]
      ]
    };
    pi2._.addCommand(
      "printTable",
      printTable,
      false,
      true,
      ["items", "tableFormat", "borderStyle", "isCentered"]
    );
    function printTable(screenData, args) {
      const items = args[0];
      let tableFormat = args[1];
      let borderStyle = args[2];
      const isCentered = !!args[3];
      if (!pi2.util.isArray(items)) {
        const error = new TypeError("printTable: items must be an array");
        error.code = "INVALID_ITEMS";
        throw error;
      }
      if (!borderStyle) {
        borderStyle = m_borderStyles["single"];
      }
      let isFormatted;
      if (tableFormat == null) {
        isFormatted = false;
      } else if (pi2.util.isArray(tableFormat)) {
        for (let i = 0; i < tableFormat.length; i++) {
          if (typeof tableFormat[i] !== "string") {
            const error = new TypeError(
              "printTable: tableFormat must be an array of strings"
            );
            error.code = "INVALID_FORMAT";
            throw error;
          }
        }
        isFormatted = true;
      } else {
        const error = new TypeError("printTable: tableFormat must be an array");
        error.code = "INVALID_FORMAT";
        throw error;
      }
      if (typeof borderStyle === "string" && m_borderStyles[borderStyle]) {
        borderStyle = m_borderStyles[borderStyle];
      } else if (!pi2.util.isArray(borderStyle)) {
        const error = new TypeError(
          "printTable: borderStyle must be an integer or array"
        );
        error.code = "INVALID_BORDER_STYLE";
        throw error;
      }
      if (isFormatted) {
        return buildFormatedTable(
          screenData,
          items,
          borderStyle,
          tableFormat,
          isCentered
        );
      } else {
        const width = piData2.commands.getCols(screenData);
        return buildStandardTable(screenData, items, width, borderStyle);
      }
    }
    __name(printTable, "printTable");
    function buildStandardTable(screenData, items, width, borders) {
      let msg = "";
      const boxes = [];
      const font = screenData.printCursor.font;
      const startPos = piData2.commands.getPos(screenData);
      const cellHeight = 2;
      for (let row = 0; row < items.length; row += 1) {
        let cellWidth = Math.floor(width / items[row].length);
        if (cellWidth < 3) {
          cellWidth = 3;
        }
        const rowWidth = (cellWidth - 2) * items[row].length + items[row].length + 1;
        const rowPad = Math.round((width - rowWidth) / 2);
        let msgTop = pi2.util.padL("", rowPad, " ");
        let msgMid = msgTop;
        let msgBot = msgTop;
        for (let col = 0; col < items[row].length; col += 1) {
          createBox(
            col * (cellWidth - 1) + rowPad,
            row * 2 + startPos.row,
            boxes,
            font
          );
          const box = boxes[boxes.length - 1];
          box.pos.width = cellWidth - 1;
          box.pos.height = 2;
          box.pixels.width = box.pos.width * font.width;
          box.pixels.height = box.pos.height * font.height;
          if (col === items[row].length - 1) {
            box.pixels.width += 1;
          }
          if (row === items.length - 1) {
            box.pixels.height += 1;
          }
          msgMid += String.fromCharCode(borders[3][0]) + pi2.util.pad(
            items[row][col],
            cellWidth - 2,
            String.fromCharCode(borders[3][1])
          );
          if (col === items[row].length - 1) {
            msgMid += String.fromCharCode(borders[3][2]);
          }
          if (row === 0) {
            if (col === 0) {
              msgTop += String.fromCharCode(borders[0][0]);
            } else {
              msgTop += String.fromCharCode(borders[0][2]);
            }
            msgTop += pi2.util.pad(
              "",
              cellWidth - 2,
              String.fromCharCode(borders[0][1])
            );
            if (col === items[row].length - 1) {
              msgTop += String.fromCharCode(borders[0][3]);
            }
          }
          let bottomRow;
          if (row === items.length - 1) {
            bottomRow = 2;
          } else {
            bottomRow = 1;
          }
          if (col === 0) {
            msgBot += String.fromCharCode(borders[bottomRow][0]);
          } else {
            msgBot += String.fromCharCode(borders[bottomRow][2]);
          }
          msgBot += pi2.util.pad(
            "",
            cellWidth - 2,
            String.fromCharCode(
              borders[bottomRow][1]
            )
          );
          if (col === items[row].length - 1) {
            msgBot += String.fromCharCode(borders[bottomRow][3]);
          }
        }
        if (row === 0) {
          msg += msgTop + "\n";
        }
        msg += msgMid + "\n";
        msg += msgBot + "\n";
      }
      msg = msg.substr(0, msg.length - 1);
      piData2.commands.print(screenData, [msg]);
      return boxes;
    }
    __name(buildStandardTable, "buildStandardTable");
    function buildFormatedTable(screenData, items, borders, tableFormat, isCentered) {
      let msg = "";
      const boxes = [];
      let pos = piData2.commands.getPos(screenData);
      const font = screenData.printCursor.font;
      if (isCentered) {
        pos.col = Math.floor(
          (piData2.commands.getCols(screenData) - tableFormat[0].length) / 2
        );
      }
      const padding = pi2.util.pad("", pos.col, " ");
      piData2.commands.setPos(screenData, [0, pos.row]);
      for (let row = 0; row < tableFormat.length; row += 1) {
        msg += padding;
        for (let col = 0; col < tableFormat[row].length; col += 1) {
          const cell = tableFormat[row].charAt(col);
          if (cell === "*") {
            const cellDirs = "" + lookCell(col, row, "left", tableFormat) + lookCell(col, row, "right", tableFormat) + lookCell(col, row, "up", tableFormat) + lookCell(col, row, "down", tableFormat);
            if (cellDirs === " - |") {
              msg += String.fromCharCode(borders[0][0]);
              createBox(pos.col + col, pos.row + row, boxes, font);
            } else if (cellDirs === "-- |") {
              msg += String.fromCharCode(borders[0][2]);
              createBox(pos.col + col, pos.row + row, boxes, font);
            } else if (cellDirs === "-  |") {
              msg += String.fromCharCode(borders[0][3]);
            } else if (cellDirs === " -||") {
              msg += String.fromCharCode(borders[1][0]);
              createBox(pos.col + col, pos.row + row, boxes, font);
            } else if (cellDirs === "--||") {
              msg += String.fromCharCode(borders[1][2]);
              createBox(pos.col + col, pos.row + row, boxes, font);
            } else if (cellDirs === "- ||") {
              msg += String.fromCharCode(borders[1][3]);
            } else if (cellDirs === " -| ") {
              msg += String.fromCharCode(borders[2][0]);
            } else if (cellDirs === "--| ") {
              msg += String.fromCharCode(borders[2][2]);
            } else if (cellDirs === "- | ") {
              msg += String.fromCharCode(borders[2][3]);
            }
          } else if (cell === "-") {
            msg += String.fromCharCode(borders[0][1]);
          } else if (cell === "|") {
            msg += String.fromCharCode(borders[3][0]);
          } else {
            msg += " ";
          }
        }
        msg += "\n";
      }
      const posAfter = piData2.commands.getPos(screenData);
      completeBoxes(boxes, tableFormat, font, pos);
      msg = msg.substr(0, msg.length - 1);
      piData2.commands.print(screenData, [msg]);
      let i = 0;
      for (let row = 0; row < items.length; row += 1) {
        if (pi2.util.isArray(items[row])) {
          for (let col = 0; col < items[row].length; col += 1) {
            if (i < boxes.length) {
              printItem(
                screenData,
                boxes[i],
                items[row][col],
                pos.col
              );
              i += 1;
            }
          }
        } else {
          printItem(screenData, boxes[i], items[row], pos.col);
          i += 1;
        }
      }
      piData2.commands.setPos(
        screenData,
        [0, posAfter.row + tableFormat.length]
      );
      return boxes;
    }
    __name(buildFormatedTable, "buildFormatedTable");
    function printItem(screenData, box, msg) {
      if (!box) {
        return;
      }
      msg = "" + msg;
      const width = box.pos.width;
      const height = box.pos.height;
      const isVertical = box.format.toLowerCase() === "v";
      if (isVertical) {
        if (msg.length > height) {
          msg = msg.substr(0, height);
        }
      } else {
        if (msg.length > width) {
          msg = msg.substr(0, width);
        }
      }
      const pos = piData2.commands.getPos(screenData);
      if (isVertical) {
        let index = 0;
        const col = box.pos.col + Math.round(width / 2);
        const startRow = box.pos.row + 1 + Math.floor((height - msg.length) / 2);
        for (let row = startRow; row <= height + startRow; row += 1) {
          piData2.commands.setPos(screenData, [col, row]);
          piData2.commands.print(
            screenData,
            [msg.charAt(index), true]
          );
          index += 1;
        }
      } else {
        const col = box.pos.col + 1 + Math.floor((width - msg.length) / 2);
        const row = box.pos.row + Math.round(height / 2);
        piData2.commands.setPos(screenData, [col, row]);
        piData2.commands.print(screenData, [msg, true]);
      }
      piData2.commands.setPos(screenData, [pos.col, pos.row]);
    }
    __name(printItem, "printItem");
    function createBox(col, row, boxes, font) {
      boxes.push({
        "pos": {
          "col": col,
          "row": row,
          "width": null,
          "height": null
        },
        "pixels": {
          "x": col * font.width + Math.round(font.width / 2) - 1,
          "y": row * font.height + Math.round(font.height / 2),
          "width": null,
          "height": null
        },
        "format": " "
      });
    }
    __name(createBox, "createBox");
    function completeBoxes(boxes, tableFormat, font, pos) {
      for (let i = 0; i < boxes.length; i += 1) {
        const box = boxes[i];
        let xt = box.pos.col + 1 - pos.col;
        let yt = box.pos.row + 1 - pos.row;
        if (yt < tableFormat.length && xt < tableFormat[yt].length) {
          box.format = tableFormat[yt].charAt(xt);
        }
        xt = box.pos.col - pos.col;
        yt = box.pos.row - pos.row;
        while (xt < tableFormat[yt].length - 1) {
          xt += 1;
          if (tableFormat[yt].charAt(xt) === "*") {
            const cell = lookCell(xt, yt, "down", tableFormat);
            if (cell === "|") {
              box.pos.width = pos.col + (xt - 1) - box.pos.col;
              box.pixels.width = (box.pos.width + 1) * font.width;
              break;
            }
          }
        }
        if (box.pos.width === null) {
          box.pos.width = pos.col + (xt - 1) - box.pos.col;
          box.pixels.width = (box.pos.width + 1) * font.width + 1;
        }
        while (yt < tableFormat.length - 1) {
          yt += 1;
          if (tableFormat[yt].charAt(xt) === "*") {
            const cell = lookCell(xt, yt, "left", tableFormat);
            if (cell === "-") {
              box.pos.height = pos.row + (yt - 1) - box.pos.row;
              box.pixels.height = (box.pos.height + 1) * font.height;
              break;
            }
          }
        }
        if (box.pos.height === null) {
          box.pos.height = pos.row + (yt - 1) - box.pos.row;
          box.pixels.height = (box.pos.height + 1) * font.height + 1;
        }
      }
    }
    __name(completeBoxes, "completeBoxes");
    function lookCell(x, y, dir, tableFormat) {
      if (dir === "left") {
        x -= 1;
      } else if (dir === "right") {
        x += 1;
      } else if (dir === "up") {
        y -= 1;
      } else if (dir === "down") {
        y += 1;
      }
      if (y >= tableFormat.length || y < 0 || x < 0) {
        return " ";
      }
      if (x >= tableFormat[y].length) {
        return " ";
      }
      if (tableFormat[y].charAt(x) === "*" && (dir === "left" || dir === "right")) {
        return "-";
      }
      if (tableFormat[y].charAt(x) === "*" && (dir === "up" || dir === "down")) {
        return "|";
      }
      return tableFormat[y].charAt(x);
    }
    __name(lookCell, "lookCell");
  }
  __name(init11, "init");

  // src/modules/keyboard.js
  function init12(pi2) {
    const piData2 = pi2._.data;
    let m_inKeys = {};
    let m_inKeyCodes = {};
    let m_inCodes = {};
    let m_inputs = [];
    let m_inputIndex = 0;
    let m_onKeyEventListeners = {};
    let m_anyKeyEventListeners = {};
    let m_onKeyCombos = {};
    let m_isKeyEventsActive = false;
    let m_inputFocus = null;
    let m_preventKeys = {};
    let m_inputQueue = [];
    let m_inputQueueIndex = 0;
    let m_promptInterval = null;
    let m_promptBlink = false;
    let m_promptLastTime = 0;
    let m_promptBackground = null;
    let m_promptBackgroundWidth = 0;
    let m_keyboardStarted = false;
    pi2._.addCommand("startKeyboard", startKeyboard, false, false, []);
    function startKeyboard() {
      if (m_keyboardStarted) {
        return;
      }
      const target = m_inputFocus || piData2.defaultInputFocus || window;
      if (!target) {
        return;
      }
      target.addEventListener("keydown", onKeyDown);
      target.addEventListener("keyup", onKeyUp);
      target.addEventListener("blur", clearPressedKeys);
      m_keyboardStarted = true;
    }
    __name(startKeyboard, "startKeyboard");
    pi2._.addCommand("stopKeyboard", stopKeyboard, false, false, []);
    function stopKeyboard() {
      m_inKeys = {};
      m_inKeyCodes = {};
      m_inCodes = {};
      m_inputs = [];
      m_onkeyListeners = {};
      m_onKeyCombos = {};
      if (!m_keyboardStarted) {
        return;
      }
      const target = m_inputFocus || piData2.defaultInputFocus || window;
      if (target) {
        target.removeEventListener("keydown", onKeyDown);
        target.removeEventListener("keyup", onKeyUp);
        target.removeEventListener("blur", clearPressedKeys);
      }
      m_keyboardStarted = false;
    }
    __name(stopKeyboard, "stopKeyboard");
    function onKeyDown(e) {
      const key = e.key;
      const code = e.code;
      const keyCode = e.keyCode;
      const keyData = {
        "key": e.key,
        "location": e.location,
        "code": e.code,
        "keyCode": e.keyCode
      };
      m_inKeys[key] = keyData;
      m_inKeyCodes[keyCode] = keyData;
      m_inCodes[code] = keyData;
      m_inputs.push(keyData);
      if (m_preventKeys[key] || m_preventKeys[code] || m_preventKeys[keyCode]) {
        e.preventDefault();
      }
      if (m_isKeyEventsActive) {
        triggerKeyEventListeners("down", key, code);
      }
    }
    __name(onKeyDown, "onKeyDown");
    function onKeyUp(e) {
      const key = e.key;
      const code = e.code;
      const keyCode = e.keyCode;
      m_inKeys[key] = false;
      m_inCodes[code] = false;
      m_inKeyCodes[keyCode] = false;
      if (m_isKeyEventsActive) {
        triggerKeyEventListeners("up", key, code);
      }
    }
    __name(onKeyUp, "onKeyUp");
    function clearPressedKeys() {
      for (const i in m_inKeys) {
        m_inKeys[i] = false;
      }
      for (const i in m_inKeyCodes) {
        m_inKeyCodes[i] = false;
      }
      for (const i in m_inCodes) {
        m_inCodes[i] = false;
      }
    }
    __name(clearPressedKeys, "clearPressedKeys");
    function triggerKeyEventListeners(mode, key, code) {
      const keyListeners = m_onKeyEventListeners[key];
      if (keyListeners && keyListeners[mode]) {
        for (let i = keyListeners[mode].length - 1; i >= 0; i--) {
          const listener = keyListeners[mode][i];
          listener.fn({ "key": key, "code": code, "mode": mode });
          if (listener.once) {
            keyListeners[mode].splice(i, 1);
          }
        }
      }
      if (code && code !== key) {
        const codeListeners = m_onKeyEventListeners[code];
        if (codeListeners && codeListeners[mode]) {
          for (let i = codeListeners[mode].length - 1; i >= 0; i--) {
            const listener = codeListeners[mode][i];
            listener.fn({ "key": key, "code": code, "mode": mode });
            if (listener.once) {
              codeListeners[mode].splice(i, 1);
            }
          }
        }
      }
      if (m_anyKeyEventListeners[mode]) {
        for (let i = m_anyKeyEventListeners[mode].length - 1; i >= 0; i--) {
          const listener = m_anyKeyEventListeners[mode][i];
          listener.fn({ "key": key, "code": code, "mode": mode });
          if (listener.once) {
            m_anyKeyEventListeners[mode].splice(i, 1);
          }
        }
      }
    }
    __name(triggerKeyEventListeners, "triggerKeyEventListeners");
    pi2._.addCommand("inkey", inkey, false, false, ["key"]);
    function inkey(args) {
      const key = args[0];
      startKeyboard();
      if (key != null) {
        if (m_inKeys[key]) {
          return m_inKeys[key];
        }
        if (m_inKeyCodes[key]) {
          return m_inKeyCodes[key];
        }
        return m_inCodes[key] || false;
      }
      const keysReturn = {};
      for (const i in m_inCodes) {
        if (m_inCodes[i]) {
          keysReturn[i] = m_inCodes[i];
        }
      }
      return keysReturn;
    }
    __name(inkey, "inkey");
    pi2._.addCommand("onkey", onkey, false, false, ["key", "mode", "fn", "once"]);
    function onkey(args) {
      const key = args[0];
      const mode = args[1] || "down";
      const fn = args[2];
      const once = !!args[3];
      startKeyboard();
      m_isKeyEventsActive = true;
      if (!pi2.util.isFunction(fn)) {
        const error = new TypeError("onkey: fn must be a function");
        error.code = "INVALID_CALLBACK";
        throw error;
      }
      if (key == null || key === "*") {
        if (!m_anyKeyEventListeners[mode]) {
          m_anyKeyEventListeners[mode] = [];
        }
        m_anyKeyEventListeners[mode].push({ "fn": fn, "once": once });
        return;
      }
      if (!m_onKeyEventListeners[key]) {
        m_onKeyEventListeners[key] = {};
      }
      if (!m_onKeyEventListeners[key][mode]) {
        m_onKeyEventListeners[key][mode] = [];
      }
      m_onKeyEventListeners[key][mode].push({ "fn": fn, "once": once });
    }
    __name(onkey, "onkey");
    pi2._.addCommand("offkey", offkey, false, false, ["key", "mode", "fn"]);
    function offkey(args) {
      const key = args[0];
      const mode = args[1] || "down";
      const fn = args[2];
      if (key == null || key === "*") {
        if (m_anyKeyEventListeners[mode]) {
          if (fn) {
            m_anyKeyEventListeners[mode] = m_anyKeyEventListeners[mode].filter(
              (listener) => listener.fn !== fn
            );
          } else {
            m_anyKeyEventListeners[mode] = [];
          }
        }
        return;
      }
      if (m_onKeyEventListeners[key] && m_onKeyEventListeners[key][mode]) {
        if (fn) {
          m_onKeyEventListeners[key][mode] = m_onKeyEventListeners[key][mode].filter(
            (listener) => listener.fn !== fn
          );
        } else {
          m_onKeyEventListeners[key][mode] = [];
        }
      }
    }
    __name(offkey, "offkey");
    pi2._.addCommand("preventKey", preventKey, false, false, ["key", "isPrevent"]);
    function preventKey(args) {
      const key = args[0];
      const isPrevent = args[1] !== false;
      if (isPrevent) {
        m_preventKeys[key] = true;
      } else {
        delete m_preventKeys[key];
      }
    }
    __name(preventKey, "preventKey");
    pi2._.addCommand("clearKeys", clearKeys, false, false, []);
    function clearKeys() {
      m_inKeys = {};
      m_inKeyCodes = {};
      m_inCodes = {};
      m_inputs = [];
      m_inputIndex = 0;
    }
    __name(clearKeys, "clearKeys");
    pi2._.addCommand("reinitKeyboard", reinitKeyboard, true, false);
    function reinitKeyboard() {
      if (m_keyboardStarted) {
        stopKeyboard();
        m_inputFocus = piData2.defaultInputFocus;
        startKeyboard();
      }
    }
    __name(reinitKeyboard, "reinitKeyboard");
    pi2._.addCommand("setInputFocus", setInputFocus, false, true, ["element"]);
    function setInputFocus(screenData, args) {
      let element = args[0];
      if (typeof element === "string") {
        element = document.getElementById(element);
      }
      if (!element || !pi2.util.canAddEventListeners(element)) {
        const error = new TypeError(
          "setInputFocus: Invalid element."
        );
        error.code = "INVALID_ELEMENT";
        throw error;
      }
      m_inputFocus = element;
      if (m_keyboardStarted) {
        stopKeyboard();
        startKeyboard();
      }
    }
    __name(setInputFocus, "setInputFocus");
    pi2._.addCommand("onkeyCombo", onkeyCombo, false, false, ["keys", "fn", "once"]);
    function onkeyCombo(args) {
      const keys = args[0];
      const fn = args[1];
      const once = !!args[2];
      if (!pi2.util.isArray(keys) || keys.length === 0) {
        const error = new TypeError("onkeyCombo: keys must be a non-empty array");
        error.code = "INVALID_KEYS";
        throw error;
      }
      if (!pi2.util.isFunction(fn)) {
        const error = new TypeError("onkeyCombo: fn must be a function");
        error.code = "INVALID_CALLBACK";
        throw error;
      }
      const comboId = keys.join("+");
      const allKeys = [];
      const comboData = {
        "keys": keys.slice(),
        "keyData": [],
        "fn": fn,
        "allKeys": allKeys,
        "once": once
      };
      if (!m_onKeyCombos[comboId]) {
        m_onKeyCombos[comboId] = [];
      }
      m_onKeyCombos[comboId].push(comboData);
      for (let i = 0; i < keys.length; i++) {
        addKeyCombo(keys[i], i, allKeys, fn, once, comboData);
      }
    }
    __name(onkeyCombo, "onkeyCombo");
    function addKeyCombo(key, i, allKeys, fn, once, comboData) {
      comboData.keyData.push({
        "key": key,
        "keyComboDown": keyComboDown,
        "keyComboUp": keyComboUp
      });
      allKeys.push(false);
      onkey([key, "down", keyComboDown, false]);
      onkey([key, "up", keyComboUp, false]);
      function keyComboDown(e) {
        allKeys[i] = true;
        if (allKeys.indexOf(false) === -1) {
          if (once) {
            offkey([key, "down", keyComboDown]);
            offkey([key, "up", keyComboUp]);
          }
          fn(e);
        }
      }
      __name(keyComboDown, "keyComboDown");
      function keyComboUp(e) {
        allKeys[i] = false;
      }
      __name(keyComboUp, "keyComboUp");
    }
    __name(addKeyCombo, "addKeyCombo");
    pi2._.addCommand("offkeyCombo", offkeyCombo, false, false, ["keys", "fn"]);
    function offkeyCombo(args) {
      const keys = args[0];
      const fn = args[1];
      if (!pi2.util.isArray(keys)) {
        return;
      }
      const comboId = keys.join("+");
      if (!m_onKeyCombos[comboId]) {
        return;
      }
      for (let i = m_onKeyCombos[comboId].length - 1; i >= 0; i--) {
        const combo = m_onKeyCombos[comboId][i];
        if (!fn || combo.fn === fn) {
          for (let j = 0; j < combo.keyData.length; j++) {
            const kd = combo.keyData[j];
            offkey([kd.key, "down", kd.keyComboDown]);
            offkey([kd.key, "up", kd.keyComboUp]);
          }
          m_onKeyCombos[comboId].splice(i, 1);
        }
      }
      if (m_onKeyCombos[comboId].length === 0) {
        delete m_onKeyCombos[comboId];
      }
    }
    __name(offkeyCombo, "offkeyCombo");
    pi2._.addCommand("input", input, false, true, [
      "prompt",
      "callback",
      "isNumber",
      "isInteger",
      "allowNegative"
    ]);
    function input(screenData, args) {
      const prompt = args[0] || "";
      const callback = args[1];
      const isNumber = !!args[2];
      const isInteger2 = !!args[3];
      const allowNegative = args[4] !== false;
      if (typeof prompt !== "string") {
        const error = new TypeError("input: prompt must be a string");
        error.code = "INVALID_PROMPT";
        throw error;
      }
      if (callback != null && !pi2.util.isFunction(callback)) {
        const error = new TypeError("input: callback must be a function");
        error.code = "INVALID_CALLBACK";
        throw error;
      }
      let resolvePromise, rejectPromise;
      const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      const inputData = {
        "prompt": prompt,
        "isNumber": isNumber,
        "isInteger": isInteger2,
        "allowNegative": allowNegative,
        "val": "",
        "callback": callback,
        "resolve": resolvePromise,
        "reject": rejectPromise,
        "screenData": screenData
      };
      m_inputQueue.push(inputData);
      if (m_inputQueue.length === 1) {
        startInputCollection();
      }
      return promise;
    }
    __name(input, "input");
    function startInputCollection() {
      startKeyboard();
      const input2 = m_inputQueue[m_inputQueueIndex];
      if (!input2) {
        return;
      }
      m_promptLastTime = Date.now();
      m_promptBackground = null;
      m_promptBackgroundWidth = 0;
      if (!m_promptInterval) {
        m_promptInterval = setInterval(showPrompt, 100);
      }
      onkey([null, "down", collectInput, false]);
    }
    __name(startInputCollection, "startInputCollection");
    function collectInput(event) {
      const input2 = m_inputQueue[m_inputQueueIndex];
      if (!input2) {
        return;
      }
      let removeLastChar = false;
      if (event.key === "Enter") {
        finishInput(input2);
      } else if (event.key === "Backspace") {
        if (input2.val.length > 0) {
          input2.val = input2.val.substring(0, input2.val.length - 1);
        }
      } else if (event.key && event.key.length === 1) {
        if (input2.isNumber && input2.allowNegative) {
          if (event.key === "-" && input2.val.length === 0) {
            input2.val = "-";
            return;
          } else if (event.key === "+" && input2.val.charAt(0) === "-") {
            input2.val = input2.val.substring(1);
            return;
          }
        }
        input2.val += event.key;
        if (input2.isNumber) {
          if (isNaN(Number(input2.val))) {
            removeLastChar = true;
          } else if (input2.isInteger && event.key === ".") {
            removeLastChar = true;
          }
        }
      }
      if (removeLastChar) {
        input2.val = input2.val.substring(0, input2.val.length - 1);
      }
      showPrompt();
    }
    __name(collectInput, "collectInput");
    function showPrompt(hideCursor) {
      if (m_inputQueue.length === 0 || m_inputQueueIndex >= m_inputQueue.length) {
        return;
      }
      const input2 = m_inputQueue[m_inputQueueIndex];
      const screenData = input2.screenData;
      let msg = input2.prompt + input2.val;
      const now = Date.now();
      if (now - m_promptLastTime > 500) {
        m_promptBlink = !m_promptBlink;
        m_promptLastTime = now;
      }
      if (m_promptBlink && !hideCursor) {
        msg += screenData.printCursor.prompt;
      }
      let pos = piData2.commands.getPos(screenData);
      if (pos.row >= piData2.commands.getRows(screenData)) {
        piData2.commands.print(screenData, ["", false]);
        piData2.commands.setPos(screenData, [pos.col, pos.row - 1]);
        pos = piData2.commands.getPos(screenData);
      }
      const posPx = piData2.commands.getPosPx(screenData);
      const width = (msg.length + 1) * screenData.printCursor.font.width;
      const height = screenData.printCursor.font.height;
      if (!m_promptBackground) {
        m_promptBackground = piData2.commands.get(
          screenData,
          [posPx.x, posPx.y, posPx.x + width, posPx.y + height]
        );
      } else if (m_promptBackgroundWidth < width) {
        piData2.commands.put(
          screenData,
          [m_promptBackground, posPx.x, posPx.y, true]
        );
        m_promptBackground = piData2.commands.get(
          screenData,
          [posPx.x, posPx.y, posPx.x + width, posPx.y + height]
        );
      } else {
        piData2.commands.put(
          screenData,
          [m_promptBackground, posPx.x, posPx.y, true]
        );
      }
      m_promptBackgroundWidth = width;
      piData2.commands.print(screenData, [msg, true]);
      piData2.commands.setPos(screenData, [pos.col, pos.row]);
      piData2.commands.render(screenData);
    }
    __name(showPrompt, "showPrompt");
    function finishInput(input2) {
      showPrompt(true);
      if (m_promptInterval) {
        clearInterval(m_promptInterval);
        m_promptInterval = null;
      }
      m_promptBackground = null;
      m_promptBackgroundWidth = 0;
      offkey([null, "down", collectInput]);
      processInputValue(input2);
      piData2.commands.print(input2.screenData, [""]);
      if (input2.callback) {
        input2.callback(input2.val);
      }
      input2.resolve(input2.val);
      m_inputQueueIndex++;
      if (m_inputQueueIndex >= m_inputQueue.length) {
        m_inputQueue = [];
        m_inputQueueIndex = 0;
      } else {
        startInputCollection();
      }
    }
    __name(finishInput, "finishInput");
    function processInputValue(input2) {
      if (input2.isNumber) {
        if (input2.val === "" || input2.val === "-") {
          input2.val = 0;
        } else {
          input2.val = Number(input2.val);
          if (input2.isInteger) {
            input2.val = Math.floor(input2.val);
          }
        }
      }
    }
    __name(processInputValue, "processInputValue");
    pi2._.addCommand("cancelInput", cancelInput, false, true, []);
    function cancelInput(screenData) {
      for (let i = m_inputQueue.length - 1; i >= 0; i--) {
        if (m_inputQueue[i].screenData === screenData) {
          m_inputQueue[i].reject(new Error("Input cancelled"));
          m_inputQueue.splice(i, 1);
        }
      }
      if (m_promptInterval) {
        clearInterval(m_promptInterval);
        m_promptInterval = null;
      }
      offkey([null, "down", collectInput]);
      m_inputQueueIndex = 0;
    }
    __name(cancelInput, "cancelInput");
    pi2._.addCommand("setInputCursor", setInputCursor, false, true, ["cursor"]);
    pi2._.addSetting("inputCursor", setInputCursor, true, ["cursor"]);
    function setInputCursor(screenData, args) {
      let cursor = args[0];
      if (pi2.util.isInteger(cursor)) {
        cursor = String.fromCharCode(cursor);
      }
      if (typeof cursor !== "string") {
        const error = new TypeError("setInputCursor: cursor must be a string or integer");
        error.code = "INVALID_CURSOR";
        throw error;
      }
      const font = screenData.printCursor.font;
      if (font.mode === "pixel") {
        if (font.charset) {
          let badChar = true;
          for (let i = 0; i < font.charset.length; i++) {
            if (font.charset.charAt(i) === cursor) {
              badChar = false;
              break;
            }
          }
          if (badChar) {
            console.warn(
              `setInputCursor: cursor "${cursor}" not found in current font charset`
            );
            return;
          }
        }
      }
      screenData.printCursor.prompt = cursor;
    }
    __name(setInputCursor, "setInputCursor");
  }
  __name(init12, "init");

  // src/modules/mouse.js
  function init13(pi2) {
    const piData2 = pi2._.data;
    pi2._.addCommand("startMouse", startMouse, false, true, []);
    function startMouse(screenData) {
      if (!screenData.mouseStarted) {
        screenData.canvas.addEventListener("mousemove", mouseMove);
        screenData.canvas.addEventListener("mousedown", mouseDown);
        screenData.canvas.addEventListener("mouseup", mouseUp);
        screenData.canvas.addEventListener("contextmenu", onContextMenu);
        screenData.mouseStarted = true;
      }
    }
    __name(startMouse, "startMouse");
    pi2._.addCommand("stopMouse", stopMouse, false, true, []);
    function stopMouse(screenData) {
      if (screenData.mouseStarted) {
        screenData.canvas.removeEventListener("mousemove", mouseMove);
        screenData.canvas.removeEventListener("mousedown", mouseDown);
        screenData.canvas.removeEventListener("mouseup", mouseUp);
        screenData.canvas.removeEventListener("contextmenu", onContextMenu);
        screenData.mouseStarted = false;
      }
    }
    __name(stopMouse, "stopMouse");
    function mouseMove(e) {
      const screenData = piData2.screens[e.target.dataset.screenId];
      if (!screenData) return;
      updateMouse(screenData, e, "move");
      if (screenData.mouseEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "move",
          getMouse(screenData),
          screenData.onMouseEventListeners
        );
      }
      if (screenData.pressEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "move",
          getMouse(screenData),
          screenData.onPressEventListeners
        );
      }
    }
    __name(mouseMove, "mouseMove");
    function mouseDown(e) {
      const screenData = piData2.screens[e.target.dataset.screenId];
      if (!screenData) return;
      updateMouse(screenData, e, "down");
      if (screenData.mouseEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "down",
          getMouse(screenData),
          screenData.onMouseEventListeners
        );
      }
      if (screenData.pressEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "down",
          getMouse(screenData),
          screenData.onPressEventListeners
        );
      }
      if (screenData.clickEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "click",
          getMouse(screenData),
          screenData.onClickEventListeners,
          "down"
        );
      }
    }
    __name(mouseDown, "mouseDown");
    function mouseUp(e) {
      const screenData = piData2.screens[e.target.dataset.screenId];
      if (!screenData) return;
      updateMouse(screenData, e, "up");
      if (screenData.mouseEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "up",
          getMouse(screenData),
          screenData.onMouseEventListeners
        );
      }
      if (screenData.pressEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "up",
          getMouse(screenData),
          screenData.onPressEventListeners
        );
      }
      if (screenData.clickEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "click",
          getMouse(screenData),
          screenData.onClickEventListeners,
          "up"
        );
      }
    }
    __name(mouseUp, "mouseUp");
    function onContextMenu(e) {
      e.preventDefault();
      return false;
    }
    __name(onContextMenu, "onContextMenu");
    function updateMouse(screenData, e, eventType) {
      const rect = screenData.canvas.getBoundingClientRect();
      const scaleX = screenData.width / rect.width;
      const scaleY = screenData.height / rect.height;
      screenData.mouse.x = Math.floor((e.clientX - rect.left) * scaleX);
      screenData.mouse.y = Math.floor((e.clientY - rect.top) * scaleY);
      screenData.mouse.offsetX = e.offsetX;
      screenData.mouse.offsetY = e.offsetY;
      screenData.mouse.button = e.button;
      screenData.mouse.buttons = e.buttons;
      screenData.mouse.eventType = eventType;
      screenData.lastEvent = "mouse";
    }
    __name(updateMouse, "updateMouse");
    function getMouse(screenData) {
      return {
        "x": screenData.mouse.x,
        "y": screenData.mouse.y,
        "offsetX": screenData.mouse.offsetX,
        "offsetY": screenData.mouse.offsetY,
        "button": screenData.mouse.button,
        "buttons": screenData.mouse.buttons,
        "eventType": screenData.mouse.eventType
      };
    }
    __name(getMouse, "getMouse");
    pi2._.addCommand("inmouse", inmouse, false, true, []);
    function inmouse(screenData) {
      piData2.commands.startMouse(screenData);
      return getMouse(screenData);
    }
    __name(inmouse, "inmouse");
    pi2._.addCommand("onmouse", onmouse, false, true, ["mode", "fn", "once"]);
    function onmouse(screenData, args) {
      const mode = args[0] || "down";
      const fn = args[1];
      const once = !!args[2];
      piData2.commands.startMouse(screenData);
      if (!pi2.util.isFunction(fn)) {
        const error = new TypeError("onmouse: fn must be a function");
        error.code = "INVALID_CALLBACK";
        throw error;
      }
      if (!screenData.onMouseEventListeners) {
        screenData.onMouseEventListeners = {};
        screenData.mouseEventListenersActive = 0;
      }
      if (!screenData.onMouseEventListeners[mode]) {
        screenData.onMouseEventListeners[mode] = [];
      }
      screenData.onMouseEventListeners[mode].push({ "fn": fn, "once": once });
      screenData.mouseEventListenersActive++;
    }
    __name(onmouse, "onmouse");
    pi2._.addCommand("offmouse", offmouse, false, true, ["mode", "fn"]);
    function offmouse(screenData, args) {
      const mode = args[0] || "down";
      const fn = args[1];
      if (screenData.onMouseEventListeners && screenData.onMouseEventListeners[mode]) {
        if (fn) {
          const beforeLen = screenData.onMouseEventListeners[mode].length;
          screenData.onMouseEventListeners[mode] = screenData.onMouseEventListeners[mode].filter(
            (listener) => listener.fn !== fn
          );
          screenData.mouseEventListenersActive -= beforeLen - screenData.onMouseEventListeners[mode].length;
        } else {
          screenData.mouseEventListenersActive -= screenData.onMouseEventListeners[mode].length;
          screenData.onMouseEventListeners[mode] = [];
        }
      }
    }
    __name(offmouse, "offmouse");
    pi2._.addCommand("triggerEventListeners", triggerEventListeners, true, false);
    function triggerEventListeners(mode, data, listeners, extraMode) {
      if (!listeners || !listeners[mode]) {
        return;
      }
      for (let i = listeners[mode].length - 1; i >= 0; i--) {
        const listener = listeners[mode][i];
        listener.fn(data, extraMode);
        if (listener.once) {
          listeners[mode].splice(i, 1);
        }
      }
    }
    __name(triggerEventListeners, "triggerEventListeners");
    pi2._.addCommand("getMouse", getMouse, true, true, []);
    function getMouse(screenData) {
      return {
        "x": screenData.mouse.x,
        "y": screenData.mouse.y,
        "lastX": screenData.mouse.lastX,
        "lastY": screenData.mouse.lastY,
        "buttons": screenData.mouse.buttons,
        "action": screenData.mouse.eventType,
        "type": "mouse"
      };
    }
    __name(getMouse, "getMouse");
    pi2._.addCommand("inpress", inpress, false, true, []);
    function inpress(screenData) {
      piData2.commands.startMouse(screenData);
      piData2.commands.startTouch(screenData);
      if (screenData.lastEvent === "touch") {
        return piData2.commands.getTouchPress(screenData);
      }
      return piData2.commands.getMouse(screenData);
    }
    __name(inpress, "inpress");
    pi2._.addCommand(
      "onpress",
      onpress,
      false,
      true,
      ["mode", "fn", "once", "hitBox", "customData"]
    );
    function onpress(screenData, args) {
      const mode = args[0];
      const fn = args[1];
      const once = args[2];
      const hitBox = args[3];
      const customData = args[4];
      const isValid = piData2.commands.onevent(
        mode,
        fn,
        once,
        hitBox,
        ["down", "up", "move"],
        "onpress",
        screenData.onPressEventListeners,
        null,
        null,
        customData
      );
      if (isValid) {
        piData2.commands.startMouse(screenData);
        piData2.commands.startTouch(screenData);
        screenData.pressEventListenersActive += 1;
      }
    }
    __name(onpress, "onpress");
    pi2._.addCommand("offpress", offpress, false, true, ["mode", "fn"]);
    function offpress(screenData, args) {
      const mode = args[0];
      const fn = args[1];
      const isValid = piData2.commands.offevent(
        mode,
        fn,
        ["down", "up", "move"],
        "offpress",
        screenData.onPressEventListeners
      );
      if (isValid) {
        if (fn == null) {
          screenData.pressEventListenersActive = 0;
        } else {
          screenData.pressEventListenersActive -= 1;
          if (screenData.pressEventListenersActive < 0) {
            screenData.pressEventListenersActive = 0;
          }
        }
      }
    }
    __name(offpress, "offpress");
    pi2._.addCommand(
      "onclick",
      onclick,
      false,
      true,
      ["fn", "once", "hitBox", "customData"]
    );
    function onclick(screenData, args) {
      const fn = args[0];
      const once = args[1];
      let hitBox = args[2];
      const customData = args[3];
      if (hitBox == null) {
        hitBox = {
          "x": 0,
          "y": 0,
          "width": piData2.commands.width(screenData),
          "height": piData2.commands.height(screenData)
        };
      }
      const isValid = piData2.commands.onevent(
        "click",
        fn,
        once,
        hitBox,
        ["click"],
        "onclick",
        screenData.onClickEventListeners,
        null,
        null,
        customData
      );
      if (isValid) {
        piData2.commands.startMouse(screenData);
        piData2.commands.startTouch(screenData);
        screenData.clickEventListenersActive += 1;
      }
    }
    __name(onclick, "onclick");
    pi2._.addCommand("offclick", offclick, false, true, ["fn"]);
    function offclick(screenData, args) {
      const fn = args[0];
      const isValid = piData2.commands.offevent(
        "click",
        fn,
        ["click"],
        "offclick",
        screenData.onClickEventListeners
      );
      if (isValid) {
        if (fn == null) {
          screenData.clickEventListenersActive = 0;
        } else {
          screenData.clickEventListenersActive -= 1;
          if (screenData.clickEventListenersActive < 0) {
            screenData.clickEventListenersActive = 0;
          }
        }
      }
    }
    __name(offclick, "offclick");
    pi2._.addCommand("setEnableContextMenu", setEnableContextMenu, false, true, ["isEnabled"]);
    pi2._.addSetting("enableContextMenu", setEnableContextMenu, true, ["isEnabled"]);
    function setEnableContextMenu(screenData, args) {
      screenData.isContextMenuEnabled = !!args[0];
      startMouse(screenData);
    }
    __name(setEnableContextMenu, "setEnableContextMenu");
  }
  __name(init13, "init");

  // src/modules/touch.js
  function init14(pi2) {
    const piData2 = pi2._.data;
    pi2._.addCommand("startTouch", startTouch, false, true, []);
    function startTouch(screenData) {
      if (!screenData.touchStarted) {
        screenData.canvas.addEventListener("touchstart", touchStart);
        screenData.canvas.addEventListener("touchmove", touchMove);
        screenData.canvas.addEventListener("touchend", touchEnd);
        screenData.canvas.addEventListener("touchcancel", touchEnd);
        screenData.touchStarted = true;
      }
    }
    __name(startTouch, "startTouch");
    pi2._.addCommand("stopTouch", stopTouch, false, true, []);
    function stopTouch(screenData) {
      if (screenData.touchStarted) {
        screenData.canvas.removeEventListener("touchstart", touchStart);
        screenData.canvas.removeEventListener("touchmove", touchMove);
        screenData.canvas.removeEventListener("touchend", touchEnd);
        screenData.canvas.removeEventListener("touchcancel", touchEnd);
        screenData.touchStarted = false;
      }
    }
    __name(stopTouch, "stopTouch");
    function touchStart(e) {
      piData2.isTouchScreen = true;
      const screenData = piData2.screens[e.target.dataset.screenId];
      if (!screenData) {
        return;
      }
      updateTouch(screenData, e, "start");
      if (screenData.touchEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "start",
          getTouch(screenData),
          screenData.onTouchEventListeners
        );
      }
      if (screenData.pressEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "down",
          getTouchPress(screenData),
          screenData.onPressEventListeners
        );
        e.preventDefault();
      }
      if (screenData.clickEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "click",
          getTouchPress(screenData),
          screenData.onClickEventListeners,
          "down"
        );
      }
    }
    __name(touchStart, "touchStart");
    function touchMove(e) {
      const screenData = piData2.screens[e.target.dataset.screenId];
      if (!screenData) {
        return;
      }
      updateTouch(screenData, e, "move");
      if (screenData.touchEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "move",
          getTouch(screenData),
          screenData.onTouchEventListeners
        );
      }
      if (screenData.pressEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "move",
          getTouchPress(screenData),
          screenData.onPressEventListeners
        );
        e.preventDefault();
      }
    }
    __name(touchMove, "touchMove");
    function touchEnd(e) {
      const screenData = piData2.screens[e.target.dataset.screenId];
      if (!screenData) {
        return;
      }
      updateTouch(screenData, e, "end");
      if (screenData.touchEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "end",
          getTouch(screenData),
          screenData.onTouchEventListeners
        );
      }
      if (screenData.pressEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "up",
          getTouchPress(screenData),
          screenData.onPressEventListeners
        );
      }
      if (screenData.clickEventListenersActive > 0) {
        piData2.commands.triggerEventListeners(
          "click",
          getTouchPress(screenData),
          screenData.onClickEventListeners,
          "up"
        );
      }
    }
    __name(touchEnd, "touchEnd");
    function updateTouch(screenData, e, eventType) {
      const rect = screenData.canvas.getBoundingClientRect();
      const scaleX = screenData.width / rect.width;
      const scaleY = screenData.height / rect.height;
      screenData.touch.eventType = eventType;
      screenData.touch.count = e.touches.length;
      screenData.touch.touches = [];
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        screenData.touch.touches.push({
          "x": Math.floor((touch.clientX - rect.left) * scaleX),
          "y": Math.floor((touch.clientY - rect.top) * scaleY),
          "identifier": touch.identifier
        });
      }
      if (screenData.touch.touches.length > 0) {
        screenData.touch.x = screenData.touch.touches[0].x;
        screenData.touch.y = screenData.touch.touches[0].y;
      }
      screenData.lastEvent = "touch";
    }
    __name(updateTouch, "updateTouch");
    function getTouch(screenData) {
      return {
        "x": screenData.touch.x,
        "y": screenData.touch.y,
        "count": screenData.touch.count,
        "touches": screenData.touch.touches.slice(),
        "eventType": screenData.touch.eventType
      };
    }
    __name(getTouch, "getTouch");
    function getTouchPress(screenData) {
      return {
        "x": screenData.touch.x,
        "y": screenData.touch.y,
        "eventType": screenData.touch.eventType,
        "inputType": "touch"
      };
    }
    __name(getTouchPress, "getTouchPress");
    pi2._.addCommand("intouch", intouch, false, true, []);
    function intouch(screenData) {
      piData2.commands.startTouch(screenData);
      return getTouch(screenData);
    }
    __name(intouch, "intouch");
    pi2._.addCommand("ontouch", ontouch, false, true, ["mode", "fn", "once"]);
    function ontouch(screenData, args) {
      const mode = args[0] || "start";
      const fn = args[1];
      const once = !!args[2];
      piData2.commands.startTouch(screenData);
      if (!pi2.util.isFunction(fn)) {
        const error = new TypeError("ontouch: fn must be a function");
        error.code = "INVALID_CALLBACK";
        throw error;
      }
      if (!screenData.onTouchEventListeners) {
        screenData.onTouchEventListeners = {};
        screenData.touchEventListenersActive = 0;
      }
      if (!screenData.onTouchEventListeners[mode]) {
        screenData.onTouchEventListeners[mode] = [];
      }
      screenData.onTouchEventListeners[mode].push({ "fn": fn, "once": once });
      screenData.touchEventListenersActive++;
    }
    __name(ontouch, "ontouch");
    pi2._.addCommand("offtouch", offtouch, false, true, ["mode", "fn"]);
    function offtouch(screenData, args) {
      const mode = args[0] || "start";
      const fn = args[1];
      if (screenData.onTouchEventListeners && screenData.onTouchEventListeners[mode]) {
        if (fn) {
          const beforeLen = screenData.onTouchEventListeners[mode].length;
          screenData.onTouchEventListeners[mode] = screenData.onTouchEventListeners[mode].filter(
            (listener) => listener.fn !== fn
          );
          screenData.touchEventListenersActive -= beforeLen - screenData.onTouchEventListeners[mode].length;
        } else {
          screenData.touchEventListenersActive -= screenData.onTouchEventListeners[mode].length;
          screenData.onTouchEventListeners[mode] = [];
        }
      }
    }
    __name(offtouch, "offtouch");
    pi2._.addCommand("getTouchPress", getTouchPress, true, true, []);
    function getTouchPress(screenData) {
      function copyTouches(touches, touchArr2, action) {
        for (const i in touches) {
          const touch = touches[i];
          const touchData = {
            "x": touch.x,
            "y": touch.y,
            "id": touch.id,
            "lastX": touch.lastX,
            "lastY": touch.lastY,
            "action": touch.action,
            "type": "touch"
          };
          if (action !== void 0) {
            touch.action = action;
          }
          touchArr2.push(touchData);
        }
      }
      __name(copyTouches, "copyTouches");
      const touchArr = [];
      copyTouches(screenData.touches, touchArr);
      if (touchArr.length === 0) {
        copyTouches(screenData.lastTouches, touchArr, "up");
      }
      if (touchArr.length > 0) {
        const touchData = touchArr[0];
        if (touchData.action === "up") {
          touchData.buttons = 0;
        } else {
          touchData.buttons = 1;
        }
        touchData.touches = touchArr;
        return touchData;
      }
      return {
        "x": -1,
        "y": -1,
        "id": -1,
        "lastX": -1,
        "lastY": -1,
        "action": "none",
        "buttons": 0,
        "type": "touch"
      };
    }
    __name(getTouchPress, "getTouchPress");
    pi2._.addCommand("setPinchZoom", setPinchZoom, false, false, ["isEnabled"]);
    pi2._.addSetting("pinchZoom", setPinchZoom, false, ["isEnabled"]);
    function setPinchZoom(args) {
      const isEnabled = !!args[0];
      if (isEnabled) {
        document.body.style.touchAction = "";
      } else {
        document.body.style.touchAction = "none";
      }
    }
    __name(setPinchZoom, "setPinchZoom");
  }
  __name(init14, "init");

  // src/modules/gamepad.js
  function init15(pi2) {
    const piData2 = pi2._.data;
    let m_controllers = {};
    let m_controllerArr = [];
    let m_events = {};
    let m_gamepadLoopId = null;
    const m_Modes = [
      "connect",
      "disconnect",
      "axis",
      "pressed",
      "touched",
      "pressReleased",
      "touchReleased"
    ];
    let m_isLooping = false;
    const m_loopInterval = 8;
    let m_axesSensitivity = 0.2;
    let m_init = false;
    function initGamepads() {
      window.addEventListener("gamepadconnected", gamepadConnected);
      window.addEventListener("gamepaddisconnected", gamepadDisconnected);
      m_init = true;
    }
    __name(initGamepads, "initGamepads");
    function gamepadConnected(e) {
      m_controllers[e.gamepad.index] = e.gamepad;
      e.gamepad.controllerIndex = m_controllerArr.length;
      m_controllerArr.push(e.gamepad);
      updateController(e.gamepad);
      triggerGamepadEvent("connect", e.gamepad.index);
    }
    __name(gamepadConnected, "gamepadConnected");
    function gamepadDisconnected(e) {
      triggerGamepadEvent("disconnect", e.gamepad.index);
      m_controllerArr.splice(
        m_controllers[e.gamepad.index].controllerIndex,
        1
      );
      delete m_controllers[e.gamepad.index];
    }
    __name(gamepadDisconnected, "gamepadDisconnected");
    function updateControllers() {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && m_controllers[i]) {
          updateController(gamepads[i]);
        }
      }
    }
    __name(updateControllers, "updateControllers");
    function updateController(gamepad) {
      const oldGamepad = m_controllers[gamepad.index];
      if (!oldGamepad.buttons) {
        oldGamepad.buttons = [];
      }
      if (!oldGamepad.axes) {
        oldGamepad.axes = [];
      }
      for (let i = 0; i < gamepad.buttons.length; i++) {
        const button = gamepad.buttons[i];
        const oldButton = oldGamepad.buttons[i] || { "pressed": false, "touched": false };
        if (button.pressed && !oldButton.pressed) {
          triggerGamepadEvent("pressed", gamepad.index, i);
        }
        if (!button.pressed && oldButton.pressed) {
          triggerGamepadEvent("pressReleased", gamepad.index, i);
        }
        if (button.touched && !oldButton.touched) {
          triggerGamepadEvent("touched", gamepad.index, i);
        }
        if (!button.touched && oldButton.touched) {
          triggerGamepadEvent("touchReleased", gamepad.index, i);
        }
        oldGamepad.buttons[i] = {
          "pressed": button.pressed,
          "touched": button.touched,
          "value": button.value
        };
      }
      for (let i = 0; i < gamepad.axes.length; i++) {
        const axisValue = gamepad.axes[i];
        const oldValue = oldGamepad.axes[i] || 0;
        if (Math.abs(axisValue - oldValue) > m_axesSensitivity) {
          triggerGamepadEvent("axis", gamepad.index, i, axisValue);
        }
        oldGamepad.axes[i] = axisValue;
      }
      m_controllers[gamepad.index] = oldGamepad;
    }
    __name(updateController, "updateController");
    function triggerGamepadEvent(mode, gamepadIndex, item, value) {
      if (!m_events[gamepadIndex]) {
        return;
      }
      const modeEvents = m_events[gamepadIndex][mode];
      if (!modeEvents) {
        return;
      }
      if (item !== void 0 && modeEvents[item]) {
        for (let i = modeEvents[item].length - 1; i >= 0; i--) {
          const listener = modeEvents[item][i];
          listener.fn({
            "gamepadIndex": gamepadIndex,
            "mode": mode,
            "item": item,
            "value": value,
            "customData": listener.customData
          });
          if (listener.once) {
            modeEvents[item].splice(i, 1);
          }
        }
      }
      if (modeEvents["*"]) {
        for (let i = modeEvents["*"].length - 1; i >= 0; i--) {
          const listener = modeEvents["*"][i];
          listener.fn({
            "gamepadIndex": gamepadIndex,
            "mode": mode,
            "item": item,
            "value": value,
            "customData": listener.customData
          });
          if (listener.once) {
            modeEvents["*"].splice(i, 1);
          }
        }
      }
    }
    __name(triggerGamepadEvent, "triggerGamepadEvent");
    pi2._.addCommand("ingamepads", ingamepads, false, false, []);
    function ingamepads() {
      if (!m_init) {
        initGamepads();
      }
      if (m_controllers) {
        updateControllers();
      }
      return m_controllerArr;
    }
    __name(ingamepads, "ingamepads");
    pi2._.addCommand(
      "ongamepad",
      ongamepad,
      false,
      false,
      ["gamepadIndex", "mode", "item", "fn", "once", "customData"]
    );
    function ongamepad(args) {
      if (!m_init) {
        initGamepads();
      }
      const gamepadIndex = args[0];
      const mode = args[1];
      const item = args[2];
      const fn = args[3];
      const once = !!args[4];
      const customData = args[5];
      if (!pi2.util.isFunction(fn)) {
        const error = new TypeError("ongamepad: fn must be a function");
        error.code = "INVALID_CALLBACK";
        throw error;
      }
      if (gamepadIndex == null) {
        const error = new TypeError("ongamepad: gamepadIndex is required");
        error.code = "MISSING_GAMEPAD_INDEX";
        throw error;
      }
      if (!m_events[gamepadIndex]) {
        m_events[gamepadIndex] = {};
      }
      if (!m_events[gamepadIndex][mode]) {
        m_events[gamepadIndex][mode] = {};
      }
      const itemKey = item !== void 0 ? item : "*";
      if (!m_events[gamepadIndex][mode][itemKey]) {
        m_events[gamepadIndex][mode][itemKey] = [];
      }
      m_events[gamepadIndex][mode][itemKey].push({
        "fn": fn,
        "once": once,
        "customData": customData
      });
      if (!m_isLooping) {
        startGamepadLoop();
      }
    }
    __name(ongamepad, "ongamepad");
    pi2._.addCommand(
      "offgamepad",
      offgamepad,
      false,
      false,
      ["gamepadIndex", "mode", "item", "fn"]
    );
    function offgamepad(args) {
      const gamepadIndex = args[0];
      const mode = args[1];
      const item = args[2];
      const fn = args[3];
      if (!m_events[gamepadIndex] || !m_events[gamepadIndex][mode]) {
        return;
      }
      const itemKey = item !== void 0 ? item : "*";
      if (m_events[gamepadIndex][mode][itemKey]) {
        if (fn) {
          m_events[gamepadIndex][mode][itemKey] = m_events[gamepadIndex][mode][itemKey].filter(
            (listener) => listener.fn !== fn
          );
        } else {
          m_events[gamepadIndex][mode][itemKey] = [];
        }
      }
    }
    __name(offgamepad, "offgamepad");
    function startGamepadLoop() {
      if (m_isLooping) {
        return;
      }
      m_isLooping = true;
      function loop() {
        if (!m_isLooping) {
          return;
        }
        updateControllers();
        m_gamepadLoopId = setTimeout(loop, m_loopInterval);
      }
      __name(loop, "loop");
      loop();
    }
    __name(startGamepadLoop, "startGamepadLoop");
    function stopGamepadLoop() {
      m_isLooping = false;
      if (m_gamepadLoopId) {
        clearTimeout(m_gamepadLoopId);
        m_gamepadLoopId = null;
      }
    }
    __name(stopGamepadLoop, "stopGamepadLoop");
    pi2._.addCommand(
      "setGamepadSensitivity",
      setGamepadSensitivity,
      false,
      false,
      ["sensitivity"]
    );
    function setGamepadSensitivity(args) {
      const sensitivity = args[0];
      if (isNaN(sensitivity) || sensitivity < 0 || sensitivity > 1) {
        const error = new RangeError(
          "setGamepadSensitivity: sensitivity must be between 0 and 1"
        );
        error.code = "INVALID_SENSITIVITY";
        throw error;
      }
      m_axesSensitivity = sensitivity;
    }
    __name(setGamepadSensitivity, "setGamepadSensitivity");
  }
  __name(init15, "init");

  // src/modules/sound.js
  function init16(pi2) {
    const piData2 = pi2._.data;
    const m_piWait = pi2._.wait;
    const m_piResume = pi2._.resume;
    let m_audioPools = {};
    let m_nextAudioId = 0;
    let m_audioContext = null;
    let m_soundPool = {};
    let m_nextSoundId = 0;
    pi2._.addCommand(
      "createAudioPool",
      createAudioPool,
      false,
      false,
      ["src", "poolSize"]
    );
    function createAudioPool(args) {
      const src = args[0];
      let poolSize = args[1];
      if (!src) {
        const error = new TypeError("createAudioPool: No sound source provided");
        error.code = "NO_SOURCE";
        throw error;
      }
      if (poolSize == null) {
        poolSize = 1;
      }
      poolSize = Math.round(poolSize);
      if (isNaN(poolSize) || poolSize < 1) {
        const error = new RangeError(
          "createAudioPool: parameter poolSize must be an integer greater than 0"
        );
        error.code = "INVALID_POOL_SIZE";
        throw error;
      }
      const audioItem = {
        "pool": [],
        "index": 0
      };
      for (let i = 0; i < poolSize; i++) {
        const audio = new Audio(src);
        loadAudio(audioItem, audio);
      }
      const audioId = "audioPool_" + m_nextAudioId;
      m_audioPools[audioId] = audioItem;
      m_nextAudioId += 1;
      return audioId;
    }
    __name(createAudioPool, "createAudioPool");
    function loadAudio(audioItem, audio, retryCount) {
      if (retryCount == null) {
        retryCount = 3;
      }
      function audioReady() {
        audioItem.pool.push({
          "audio": audio,
          "timeout": 0,
          "volume": 1
        });
        audio.removeEventListener("canplay", audioReady);
        m_piResume();
      }
      __name(audioReady, "audioReady");
      function audioError() {
        const errors = [
          "MEDIA_ERR_ABORTED - fetching process aborted by user",
          "MEDIA_ERR_NETWORK - error occurred when downloading",
          "MEDIA_ERR_DECODE - error occurred when decoding",
          "MEDIA_ERR_SRC_NOT_SUPPORTED - audio/video not supported"
        ];
        const errorCode = audio.error.code;
        const index = errorCode - 1;
        if (index >= 0 && index < errors.length) {
          console.warn(`createAudioPool: ${errors[index]}`);
          if (retryCount > 0) {
            setTimeout(() => {
              audio.removeEventListener("canplay", audioReady);
              audio.removeEventListener("error", audioError);
              const newAudio = new Audio(audio.src);
              loadAudio(audioItem, newAudio, retryCount - 1);
            }, 100);
          } else {
            console.warn(`createAudioPool: Max retries exceeded for ${audio.src}`);
            m_piResume();
          }
        } else {
          console.warn(`createAudioPool: unknown error - ${errorCode}`);
          m_piResume();
        }
      }
      __name(audioError, "audioError");
      if (retryCount === 3) {
        m_piWait();
      }
      audio.addEventListener("canplay", audioReady);
      audio.addEventListener("error", audioError);
    }
    __name(loadAudio, "loadAudio");
    pi2._.addCommand("deleteAudioPool", deleteAudioPool, false, false, ["audioId"]);
    function deleteAudioPool(args) {
      const audioId = args[0];
      if (!m_audioPools[audioId]) {
        console.warn(`deleteAudioPool: audio ID ${audioId} not found.`);
        return;
      }
      for (let i = 0; i < m_audioPools[audioId].pool.length; i++) {
        const poolItem = m_audioPools[audioId].pool[i];
        poolItem.audio.pause();
        poolItem.audio.src = "";
        clearTimeout(poolItem.timeout);
      }
      delete m_audioPools[audioId];
    }
    __name(deleteAudioPool, "deleteAudioPool");
    pi2._.addCommand(
      "playAudioPool",
      playAudioPool,
      false,
      false,
      ["audioId", "volume", "startTime", "duration"]
    );
    function playAudioPool(args) {
      const audioId = args[0];
      let volume = args[1];
      let startTime = args[2];
      let duration = args[3];
      if (!m_audioPools[audioId]) {
        console.warn(`playAudioPool: audio ID ${audioId} not found.`);
        return;
      }
      const audioItem = m_audioPools[audioId];
      if (volume == null) {
        volume = 1;
      }
      if (isNaN(volume) || volume < 0 || volume > 1) {
        const error = new RangeError(
          "playAudioPool: volume needs to be a number between 0 and 1"
        );
        error.code = "INVALID_VOLUME";
        throw error;
      }
      if (startTime == null) {
        startTime = 0;
      }
      if (isNaN(startTime) || startTime < 0) {
        const error = new RangeError(
          "playAudioPool: startTime needs to be a number equal to or greater than 0"
        );
        error.code = "INVALID_START_TIME";
        throw error;
      }
      if (duration == null) {
        duration = 0;
      }
      if (isNaN(duration) || duration < 0) {
        const error = new RangeError(
          "playAudioPool: duration needs to be a number equal to or greater than 0"
        );
        error.code = "INVALID_DURATION";
        throw error;
      }
      const poolItem = audioItem.pool[audioItem.index];
      const audio = poolItem.audio;
      audio.volume = piData2.volume * volume;
      poolItem.volume = volume;
      audio.currentTime = startTime;
      if (duration > 0) {
        clearTimeout(poolItem.timeout);
        poolItem.timeout = setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, duration * 1e3);
      }
      audio.play();
      audioItem.index += 1;
      if (audioItem.index >= audioItem.pool.length) {
        audioItem.index = 0;
      }
    }
    __name(playAudioPool, "playAudioPool");
    pi2._.addCommand("stopAudioPool", stopAudioPool, false, false, ["audioId"]);
    function stopAudioPool(args) {
      const audioId = args[0];
      if (audioId == null) {
        for (const i in m_audioPools) {
          for (let j = 0; j < m_audioPools[i].pool.length; j++) {
            m_audioPools[i].pool[j].audio.pause();
          }
        }
        return;
      }
      if (!m_audioPools[audioId]) {
        console.warn(`stopAudioPool: audio ID ${audioId} not found.`);
        return;
      }
      for (let i = 0; i < m_audioPools[audioId].pool.length; i++) {
        m_audioPools[audioId].pool[i].audio.pause();
      }
    }
    __name(stopAudioPool, "stopAudioPool");
    pi2._.addCommand("sound", sound, false, false, [
      "frequency",
      "duration",
      "volume",
      "oType",
      "delay",
      "attack",
      "decay"
    ]);
    function sound(args) {
      let frequency = Math.round(args[0]);
      let duration = args[1];
      let volume = args[2];
      let oType = args[3];
      let delay = args[4];
      let attack = args[5];
      let decay = args[6];
      if (isNaN(frequency)) {
        const error = new TypeError("sound: frequency needs to be an integer");
        error.code = "INVALID_FREQUENCY";
        throw error;
      }
      if (duration == null) {
        duration = 1;
      }
      if (isNaN(duration) || duration < 0) {
        const error = new RangeError(
          "sound: duration needs to be a number equal to or greater than 0"
        );
        error.code = "INVALID_DURATION";
        throw error;
      }
      if (volume == null) {
        volume = 1;
      }
      if (isNaN(volume) || volume < 0 || volume > 1) {
        const error = new RangeError("sound: volume needs to be a number between 0 and 1");
        error.code = "INVALID_VOLUME";
        throw error;
      }
      if (attack == null) {
        attack = 0;
      }
      if (isNaN(attack) || attack < 0) {
        const error = new RangeError(
          "sound: attack needs to be a number equal to or greater than 0"
        );
        error.code = "INVALID_ATTACK";
        throw error;
      }
      if (delay == null) {
        delay = 0;
      }
      if (isNaN(delay) || delay < 0) {
        const error = new RangeError(
          "sound: delay needs to be a number equal to or greater than 0"
        );
        error.code = "INVALID_DELAY";
        throw error;
      }
      if (decay == null) {
        decay = 0.1;
      }
      if (isNaN(decay)) {
        const error = new TypeError("sound: decay needs to be a number");
        error.code = "INVALID_DECAY";
        throw error;
      }
      if (oType == null) {
        oType = "triangle";
      }
      let waveTables = null;
      if (pi2.util.isArray(oType)) {
        if (oType.length !== 2 || oType[0].length === 0 || oType[1].length === 0 || oType[0].length !== oType[1].length) {
          const error = new TypeError(
            "sound: oType array must be an array with two non empty arrays of equal length"
          );
          error.code = "INVALID_WAVE_TABLE";
          throw error;
        }
        waveTables = [];
        for (let i = 0; i < oType.length; i++) {
          for (let j = 0; j < oType[i].length; j++) {
            if (isNaN(oType[i][j])) {
              const error = new TypeError("sound: oType array must only contain numbers");
              error.code = "INVALID_WAVE_VALUE";
              throw error;
            }
          }
          waveTables.push(new Float32Array(oType[i]));
        }
        oType = "custom";
      } else {
        if (typeof oType !== "string") {
          const error = new TypeError("sound: oType needs to be a string or an array");
          error.code = "INVALID_TYPE";
          throw error;
        }
        const types = ["triangle", "sine", "square", "sawtooth"];
        if (types.indexOf(oType) === -1) {
          const error = new TypeError(
            "sound: oType is not a valid type. oType must be one of the following: triangle, sine, square, sawtooth"
          );
          error.code = "INVALID_OSCILLATOR_TYPE";
          throw error;
        }
      }
      if (!m_audioContext) {
        const context = window.AudioContext || window.webkitAudioContext;
        m_audioContext = new context();
      }
      const stopTime = attack + duration + decay;
      return piData2.commands.createSound(
        "sound",
        m_audioContext,
        frequency,
        volume,
        attack,
        duration,
        decay,
        stopTime,
        oType,
        waveTables,
        delay
      );
    }
    __name(sound, "sound");
    pi2._.addCommand("createSound", createSound, true, false, []);
    function createSound(cmdName, audioContext, frequency, volume, attackTime, sustainTime, decayTime, stopTime, oType, waveTables, delay) {
      const oscillator = audioContext.createOscillator();
      const envelope = audioContext.createGain();
      const master = audioContext.createGain();
      master.gain.value = piData2.volume;
      oscillator.frequency.value = frequency;
      if (oType === "custom") {
        const real = waveTables[0];
        const imag = waveTables[1];
        const wave = audioContext.createPeriodicWave(real, imag);
        oscillator.setPeriodicWave(wave);
      } else {
        oscillator.type = oType;
      }
      if (attackTime === 0) {
        envelope.gain.value = volume;
      } else {
        envelope.gain.value = 0;
      }
      oscillator.connect(envelope);
      envelope.connect(master);
      master.connect(audioContext.destination);
      const currentTime = audioContext.currentTime + delay;
      if (attackTime > 0) {
        envelope.gain.setValueCurveAtTime(
          new Float32Array([0, volume]),
          currentTime,
          attackTime
        );
      }
      if (sustainTime > 0) {
        envelope.gain.setValueCurveAtTime(
          new Float32Array([volume, 0.8 * volume]),
          currentTime + attackTime,
          sustainTime
        );
      }
      if (decayTime > 0) {
        envelope.gain.setValueCurveAtTime(
          new Float32Array([0.8 * volume, 0.1 * volume, 0]),
          currentTime + attackTime + sustainTime,
          decayTime
        );
      }
      oscillator.start(currentTime);
      oscillator.stop(currentTime + stopTime);
      const soundId = "sound_" + m_nextSoundId;
      m_nextSoundId += 1;
      m_soundPool[soundId] = {
        "oscillator": oscillator,
        "master": master,
        "audioContext": audioContext
      };
      setTimeout(() => {
        delete m_soundPool[soundId];
      }, (currentTime + stopTime) * 1e3);
      return soundId;
    }
    __name(createSound, "createSound");
    pi2._.addCommand("stopSound", stopSound, false, false, ["soundId"]);
    function stopSound(args) {
      const soundId = args[0];
      if (soundId == null) {
        for (const i in m_soundPool) {
          m_soundPool[i].oscillator.stop(0);
        }
        return;
      }
      if (!m_soundPool[soundId]) {
        return;
      }
      m_soundPool[soundId].oscillator.stop(0);
    }
    __name(stopSound, "stopSound");
    pi2._.addCommand("setVolume", setVolume, false, false, ["volume"]);
    pi2._.addSetting("volume", setVolume, false, ["volume"]);
    function setVolume(args) {
      const volume = args[0];
      if (isNaN(volume) || volume < 0 || volume > 1) {
        const error = new RangeError(
          "setVolume: volume needs to be a number between 0 and 1"
        );
        error.code = "INVALID_VOLUME";
        throw error;
      }
      piData2.volume = volume;
      for (const i in m_soundPool) {
        if (volume === 0) {
          m_soundPool[i].master.gain.exponentialRampToValueAtTime(
            0.01,
            m_soundPool[i].audioContext.currentTime + 0.1
          );
          m_soundPool[i].master.gain.setValueAtTime(
            0,
            m_soundPool[i].audioContext.currentTime + 0.11
          );
        } else {
          m_soundPool[i].master.gain.exponentialRampToValueAtTime(
            volume,
            m_soundPool[i].audioContext.currentTime + 0.1
          );
        }
      }
      for (const i in m_audioPools) {
        for (const j in m_audioPools[i].pool) {
          const poolItem = m_audioPools[i].pool[j];
          poolItem.audio.volume = piData2.volume * poolItem.volume;
        }
      }
    }
    __name(setVolume, "setVolume");
  }
  __name(init16, "init");

  // src/modules/play.js
  function init17(pi2) {
    const piData2 = pi2._.data;
    const m_notesData = {
      "A": [27.5, 55, 110, 220, 440, 880, 1760, 3520, 7040, 14080],
      "A#": [
        29.14,
        58.27,
        116.541,
        233.082,
        466.164,
        932.328,
        1864.655,
        3729.31,
        7458.62,
        14917.24
      ],
      "B": [
        30.87,
        61.74,
        123.471,
        246.942,
        493.883,
        987.767,
        1975.533,
        3951.066,
        7902.132,
        15804.264
      ],
      "C": [
        16.35,
        32.7,
        65.41,
        130.813,
        261.626,
        523.251,
        1046.502,
        2093.005,
        4186.009,
        8372.018
      ],
      "C#": [
        17.32,
        34.65,
        69.296,
        138.591,
        277.183,
        554.365,
        1108.731,
        2217.461,
        4434.922,
        8869.844
      ],
      "D": [
        18.35,
        36.71,
        73.416,
        146.832,
        293.665,
        587.33,
        1174.659,
        2349.318,
        4698.636,
        9397.272
      ],
      "D#": [
        19.45,
        38.89,
        77.782,
        155.563,
        311.127,
        622.254,
        1244.508,
        2489.016,
        4978.032,
        9956.064
      ],
      "E": [
        20.6,
        41.2,
        82.407,
        164.814,
        329.628,
        659.255,
        1318.51,
        2637.021,
        5274.042,
        10548.084
      ],
      "F": [
        21.83,
        43.65,
        87.307,
        174.614,
        349.228,
        698.456,
        1396.913,
        2793.826,
        5587.652,
        11175.304
      ],
      "F#": [
        23.12,
        46.25,
        92.499,
        184.997,
        369.994,
        739.989,
        1479.978,
        2959.955,
        5919.91,
        11839.82
      ],
      "G": [
        24.5,
        49,
        97.999,
        195.998,
        391.995,
        783.991,
        1567.982,
        3135.964,
        6271.928,
        12543.856
      ],
      "G#": [
        25.96,
        51.91,
        103.826,
        207.652,
        415.305,
        830.609,
        1661.219,
        3322.438,
        6644.876,
        13289.752
      ]
    };
    let m_tracks = {};
    let m_allTracks = [];
    let m_lastTrackId = 0;
    let m_playData = [];
    pi2._.addCommand("play", play, false, false, ["playString"]);
    function play(args) {
      let playString = args[0];
      if (typeof playString !== "string") {
        const error = new TypeError("play: playString needs to be a string");
        error.code = "INVALID_PLAY_STRING";
        throw error;
      }
      const trackId = createTrack(playString);
      if (!trackId) {
        return null;
      }
      m_playData = [];
      playTrack(trackId);
      m_playData.sort((a, b) => a.time - b.time);
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      for (let i = 0; i < m_playData.length; i++) {
        const playData = m_playData[i];
        playData.track.sounds.push(
          piData2.commands.createSound(
            "play",
            audioContext,
            playData.frequency,
            playData.volume,
            playData.attackTime,
            playData.sustainTime,
            playData.decayTime,
            playData.stopTime,
            playData.oType,
            playData.waveTables,
            playData.time
          )
        );
      }
    }
    __name(play, "play");
    function createTrack(playString) {
      playString = playString.split(/\s+/).join("").toUpperCase();
      const trackId = "track_" + m_lastTrackId;
      m_lastTrackId += 1;
      const track = {
        "id": trackId,
        "notes": [],
        "noteId": 0,
        "attackRate": 0.1,
        "decayRate": 0.2,
        "sustainRate": 0.65,
        "fullNote": false,
        "tempo": 60 / 120,
        "noteLength": 0.25,
        "pace": 0.875,
        "octave": 4,
        "volume": 1,
        "type": "triangle",
        "waveTables": null,
        "sounds": []
      };
      m_tracks[trackId] = track;
      m_allTracks.push({ "id": trackId });
      let i = 0;
      while (i < playString.length) {
        const char = playString.charAt(i);
        if ("ABCDEFG".indexOf(char) !== -1) {
          let note = char;
          let length = null;
          let dots = 0;
          i++;
          if (i < playString.length && "#+- ".indexOf(playString.charAt(i)) !== -1) {
            if (playString.charAt(i) !== " ") {
              note += playString.charAt(i);
            }
            i++;
          }
          let lengthStr = "";
          while (i < playString.length && /\d/.test(playString.charAt(i))) {
            lengthStr += playString.charAt(i);
            i++;
          }
          if (lengthStr) {
            length = parseFloat(lengthStr);
          }
          while (i < playString.length && playString.charAt(i) === ".") {
            dots++;
            i++;
          }
          track.notes.push({
            "type": "note",
            "note": note,
            "length": length,
            "dots": dots
          });
          continue;
        }
        if ("PN".indexOf(char) !== -1) {
          const cmd = char;
          i++;
          let value = "";
          while (i < playString.length && /\d/.test(playString.charAt(i))) {
            value += playString.charAt(i);
            i++;
          }
          if (value) {
            track.notes.push({
              "type": cmd === "P" ? "pause" : "noteNum",
              "value": parseInt(value)
            });
          }
          continue;
        }
        if (char === "M") {
          i++;
          if (i < playString.length) {
            const subCmd = playString.charAt(i);
            if ("LNSF".indexOf(subCmd) !== -1) {
              i++;
              if (subCmd === "L" || subCmd === "N" || subCmd === "S") {
                track.notes.push({
                  "type": "musicStyle",
                  "value": subCmd
                });
              } else if (subCmd === "F") {
                track.notes.push({
                  "type": "fullNote"
                });
              }
              continue;
            }
            if ("ATD".indexOf(subCmd) !== -1) {
              i++;
              let value = "";
              while (i < playString.length && /\d/.test(playString.charAt(i))) {
                value += playString.charAt(i);
                i++;
              }
              if (value) {
                const numValue = parseInt(value);
                if (numValue >= 0 && numValue <= 100) {
                  let noteType;
                  if (subCmd === "A") {
                    noteType = "attackRate";
                  } else if (subCmd === "T") {
                    noteType = "sustainRate";
                  } else if (subCmd === "D") {
                    noteType = "decayRate";
                  }
                  track.notes.push({
                    "type": noteType,
                    "value": numValue / 100
                  });
                }
              }
              continue;
            }
          }
          continue;
        }
        if ("OLT".indexOf(char) !== -1) {
          const cmd = char;
          i++;
          let value = "";
          while (i < playString.length && /\d/.test(playString.charAt(i))) {
            value += playString.charAt(i);
            i++;
          }
          if (value) {
            const numValue = parseFloat(value);
            if (cmd === "O" && numValue >= 0 && numValue <= 7) {
              track.notes.push({
                "type": "octave",
                "value": parseInt(numValue)
              });
            } else if (cmd === "L" && numValue > 0) {
              track.notes.push({
                "type": "length",
                "value": numValue
              });
            } else if (cmd === "T" && numValue >= 32 && numValue <= 255) {
              track.notes.push({
                "type": "tempo",
                "value": parseInt(numValue)
              });
            }
          }
          continue;
        }
        if (char === "V") {
          i++;
          let value = "";
          while (i < playString.length && /\d/.test(playString.charAt(i))) {
            value += playString.charAt(i);
            i++;
          }
          if (value) {
            const numValue = parseInt(value);
            if (numValue >= 0 && numValue <= 100) {
              track.notes.push({
                "type": "volume",
                "value": numValue / 100
              });
            }
          }
          continue;
        }
        if (char === "<") {
          track.notes.push({ "type": "octaveDown" });
          i++;
          continue;
        }
        if (char === ">") {
          track.notes.push({ "type": "octaveUp" });
          i++;
          continue;
        }
        if (i + 6 <= playString.length && playString.substring(i, i + 6) === "SQUARE") {
          track.notes.push({
            "type": "waveform",
            "value": "square"
          });
          i += 6;
          continue;
        }
        if (i + 4 <= playString.length && playString.substring(i, i + 4) === "SINE") {
          track.notes.push({
            "type": "waveform",
            "value": "sine"
          });
          i += 4;
          continue;
        }
        if (i + 8 <= playString.length && playString.substring(i, i + 8) === "TRIANGLE") {
          track.notes.push({
            "type": "waveform",
            "value": "triangle"
          });
          i += 8;
          continue;
        }
        if (i + 8 <= playString.length && playString.substring(i, i + 8) === "SAWTOOTH") {
          track.notes.push({
            "type": "waveform",
            "value": "sawtooth"
          });
          i += 8;
          continue;
        }
        if (char === "[") {
          let token = "";
          let depth = 0;
          while (i < playString.length) {
            token += playString.charAt(i);
            if (playString.charAt(i) === "[") {
              depth++;
            } else if (playString.charAt(i) === "]") {
              depth--;
              if (depth === 0) {
                i++;
                break;
              }
            }
            i++;
          }
          try {
            const waveData = JSON.parse(token);
            if (pi2.util.isArray(waveData) && waveData.length === 2) {
              track.notes.push({
                "type": "wavetable",
                "value": waveData
              });
            }
          } catch (e) {
            console.warn(`play: Invalid wavetable format: ${token}`);
          }
          continue;
        }
        i++;
      }
      return trackId;
    }
    __name(createTrack, "createTrack");
    function playTrack(trackId) {
      const track = m_tracks[trackId];
      if (!track || track.noteId >= track.notes.length) {
        return;
      }
      let time = 0;
      while (track.noteId < track.notes.length) {
        const cmd = track.notes[track.noteId];
        switch (cmd.type) {
          case "note":
            const frequency = getNoteFrequency(track, cmd.note);
            if (frequency > 0) {
              const duration = getNoteDuration(track, cmd.length, cmd.dots);
              playNote(track, frequency, time);
              time += duration;
            }
            break;
          case "noteNum":
            if (cmd.value > 0 && cmd.value < 85) {
              const freq = m_allNotes[cmd.value];
              const duration = getNoteDuration(track, null, 0);
              playNote(track, freq, time);
              time += duration;
            }
            break;
          case "pause":
            const pauseDuration = 4 / cmd.value * track.tempo;
            time += pauseDuration;
            break;
          case "octave":
            track.octave = cmd.value;
            break;
          case "octaveUp":
            if (track.octave < 7) {
              track.octave++;
            }
            break;
          case "octaveDown":
            if (track.octave > 0) {
              track.octave--;
            }
            break;
          case "length":
            track.noteLength = 4 / cmd.value;
            break;
          case "tempo":
            track.tempo = 60 / cmd.value;
            break;
          case "volume":
            track.volume = cmd.value;
            break;
          case "attackRate":
            track.attackRate = cmd.value;
            break;
          case "sustainRate":
            track.sustainRate = cmd.value;
            break;
          case "decayRate":
            track.decayRate = cmd.value;
            break;
          case "fullNote":
            track.fullNote = true;
            track.pace = 1;
            break;
          case "waveform":
            track.type = cmd.value;
            break;
          case "wavetable":
            track.waveTables = [
              new Float32Array(cmd.value[0]),
              new Float32Array(cmd.value[1])
            ];
            track.type = "custom";
            break;
          case "musicStyle":
            if (cmd.value === "L") {
              track.pace = 1;
              track.fullNote = true;
            } else if (cmd.value === "N") {
              track.pace = 0.875;
              track.fullNote = false;
            } else if (cmd.value === "S") {
              track.pace = 0.75;
              track.fullNote = false;
            }
            break;
        }
        track.noteId++;
      }
    }
    __name(playTrack, "playTrack");
    function getNoteFrequency(track, note) {
      note = note.replace(/\+/g, "#");
      note = note.replace("C-", "B");
      note = note.replace("D-", "C#");
      note = note.replace("E-", "D#");
      note = note.replace("F-", "E");
      note = note.replace("G-", "F#");
      note = note.replace("A-", "G#");
      note = note.replace("B-", "A#");
      const noteData = m_notesData[note];
      if (!noteData) {
        return 0;
      }
      const octave = track.octave;
      if (octave < 0 || octave >= noteData.length) {
        return 0;
      }
      return noteData[octave];
    }
    __name(getNoteFrequency, "getNoteFrequency");
    function getNoteDuration(track, length, dots) {
      if (length == null) {
        length = track.noteLength;
      } else {
        length = 4 / length;
      }
      let duration = length * track.tempo * track.pace;
      if (dots === 1) {
        duration = duration * 1.5;
      } else if (dots === 2) {
        duration = duration * 1.75;
      } else if (dots > 2) {
        let multiplier = 1;
        let addition = 0.5;
        for (let i = 0; i < dots; i++) {
          multiplier += addition;
          addition = addition / 2;
        }
        duration = duration * multiplier;
      }
      return duration;
    }
    __name(getNoteDuration, "getNoteDuration");
    function playNote(track, frequency, time) {
      const volume = track.volume;
      const interval = getNoteDuration(track, null, 0);
      const attackTime = interval * track.attackRate;
      const sustainTime = interval * track.sustainRate;
      const decayTime = interval * track.decayRate;
      let stopTime;
      if (track.fullNote && attackTime + sustainTime + decayTime > interval) {
        stopTime = interval;
      } else {
        stopTime = attackTime + sustainTime + decayTime;
      }
      const soundData = {
        "frequency": frequency,
        "volume": volume,
        "attackTime": attackTime,
        "sustainTime": sustainTime,
        "decayTime": decayTime,
        "stopTime": stopTime,
        "oType": track.type,
        "waveTables": track.waveTables,
        "time": time,
        "track": track
      };
      m_playData.push(soundData);
    }
    __name(playNote, "playNote");
    const m_allNotes = [
      0,
      16.35,
      17.32,
      18.35,
      19.45,
      20.6,
      21.83,
      23.12,
      24.5,
      25.96,
      27.5,
      29.14,
      30.87,
      32.7,
      34.65,
      36.71,
      38.89,
      41.2,
      43.65,
      46.25,
      49,
      51.91,
      55,
      58.27,
      61.74,
      65.406,
      69.296,
      73.416,
      77.782,
      82.407,
      87.307,
      92.499,
      97.999,
      103.826,
      110,
      116.541,
      123.471,
      130.813,
      138.591,
      146.832,
      155.563,
      164.814,
      174.614,
      184.997,
      195.998,
      207.652,
      220,
      233.082,
      246.942,
      261.626,
      277.183,
      293.665,
      311.127,
      329.628,
      349.228,
      369.994,
      391.995,
      415.305,
      440,
      466.164,
      493.883,
      523.251,
      554.365,
      587.33,
      622.254,
      659.255,
      698.456,
      739.989,
      783.991,
      830.609,
      880,
      932.328,
      987.767,
      1046.502,
      1108.731,
      1174.659,
      1244.508,
      1318.51,
      1396.913,
      1479.978,
      1567.982,
      1661.219,
      1760,
      1864.655,
      1975.533,
      2093.005,
      2217.461,
      2349.318,
      2489.016,
      2637.021,
      2793.826,
      2959.955,
      3135.964,
      3322.438,
      3520,
      3729.31,
      3951.066,
      4186.009,
      4434.922,
      4698.636,
      4978.032,
      5274.042,
      5587.652,
      5919.91,
      6271.928,
      6644.876,
      7040,
      7458.62,
      7902.132,
      8372.018,
      8869.844,
      9397.272,
      9956.064,
      10548.084,
      11175.304,
      11839.82,
      13289.752,
      14080,
      14917.24,
      15804.264
    ];
    pi2._.addCommand("stopPlay", stopPlay, false, false, ["trackId"]);
    function stopPlay(args) {
      const trackId = args[0];
      if (trackId === null || trackId === void 0) {
        for (let i = 0; i < m_allTracks.length; i++) {
          const track = m_tracks[m_allTracks[i].id];
          if (track) {
            for (let j = 0; j < track.sounds.length; j++) {
              const sound = track.sounds[j];
              piData2.commands.stopSound([sound]);
            }
            delete m_tracks[m_allTracks[i].id];
          }
        }
        m_allTracks = [];
        return;
      }
      if (m_tracks[trackId]) {
        const track = m_tracks[trackId];
        for (let j = 0; j < track.sounds.length; j++) {
          const sound = track.sounds[j];
          piData2.commands.stopSound([sound]);
        }
        removeTrack(trackId);
      }
    }
    __name(stopPlay, "stopPlay");
    function removeTrack(trackId) {
      for (let i = 0; i < m_allTracks.length; i++) {
        if (m_allTracks[i].id === trackId) {
          m_allTracks.splice(i, 1);
          break;
        }
      }
      delete m_tracks[trackId];
    }
    __name(removeTrack, "removeTrack");
  }
  __name(init17, "init");

  // src/modules/draw.js
  function init18(pi2) {
    const piData2 = pi2._.data;
    pi2._.addCommand("draw", draw, false, true, ["drawString"]);
    function draw(screenData, args) {
      let drawString = args[0];
      if (typeof drawString !== "string") {
        const error = new TypeError("draw: drawString must be a string");
        error.code = "INVALID_DRAW_STRING";
        throw error;
      }
      drawString = drawString.toUpperCase();
      const tempColors = drawString.match(/(#[A-Z0-9]+)/g);
      if (tempColors) {
        for (let i = 0; i < tempColors.length; i++) {
          drawString = drawString.replace("C" + tempColors[i], "O" + i);
        }
      }
      drawString = drawString.replace(/(TA)/gi, "T");
      drawString = drawString.split(/\s+/).join("");
      const reg = /(?=C|C#|R|B|F|G|L|A|T|D|G|H|U|E|N|M|P|S)/;
      const parts = drawString.split(reg);
      let isReturn = false;
      let lastCursor = {
        "x": screenData.x,
        "y": screenData.y,
        "angle": 0
      };
      let isBlind = false;
      let isArc = false;
      for (let i = 0; i < parts.length; i++) {
        const drawArgs = parts[i].split(/(\d+)/);
        switch (drawArgs[0]) {
          // C - Change Color
          case "C":
            const color = Number(drawArgs[1]);
            screenData.screenObj.setColor(color);
            isBlind = true;
            break;
          case "O":
            const colorStr = tempColors[drawArgs[1]];
            screenData.screenObj.setColor(colorStr);
            isBlind = true;
            break;
          // D - Down
          case "D": {
            const len = pi2.util.getInt(drawArgs[1], 1);
            const angle = pi2.util.degreesToRadian(90) + screenData.angle;
            screenData.x += Math.round(Math.cos(angle) * len);
            screenData.y += Math.round(Math.sin(angle) * len);
            break;
          }
          // E - Up and Right
          case "E": {
            let len = pi2.util.getInt(drawArgs[1], 1);
            len = Math.sqrt(len * len + len * len);
            const angle = pi2.util.degreesToRadian(315) + screenData.angle;
            screenData.x += Math.round(Math.cos(angle) * len);
            screenData.y += Math.round(Math.sin(angle) * len);
            break;
          }
          // F - Down and Right
          case "F": {
            let len = pi2.util.getInt(drawArgs[1], 1);
            len = Math.sqrt(len * len + len * len);
            const angle = pi2.util.degreesToRadian(45) + screenData.angle;
            screenData.x += Math.round(Math.cos(angle) * len);
            screenData.y += Math.round(Math.sin(angle) * len);
            break;
          }
          // G - Down and Left
          case "G": {
            let len = pi2.util.getInt(drawArgs[1], 1);
            len = Math.sqrt(len * len + len * len);
            const angle = pi2.util.degreesToRadian(135) + screenData.angle;
            screenData.x += Math.round(Math.cos(angle) * len);
            screenData.y += Math.round(Math.sin(angle) * len);
            break;
          }
          // H - Up and Left
          case "H": {
            let len = pi2.util.getInt(drawArgs[1], 1);
            len = Math.sqrt(len * len + len * len);
            const angle = pi2.util.degreesToRadian(225) + screenData.angle;
            screenData.x += Math.round(Math.cos(angle) * len);
            screenData.y += Math.round(Math.sin(angle) * len);
            break;
          }
          // L - Left
          case "L": {
            const len = pi2.util.getInt(drawArgs[1], 1);
            const angle = pi2.util.degreesToRadian(180) + screenData.angle;
            screenData.x += Math.round(Math.cos(angle) * len);
            screenData.y += Math.round(Math.sin(angle) * len);
            break;
          }
          // R - Right
          case "R": {
            const len = pi2.util.getInt(drawArgs[1], 1);
            const angle = pi2.util.degreesToRadian(0) + screenData.angle;
            screenData.x += Math.round(Math.cos(angle) * len);
            screenData.y += Math.round(Math.sin(angle) * len);
            break;
          }
          // U - Up
          case "U": {
            const len = pi2.util.getInt(drawArgs[1], 1);
            const angle = pi2.util.degreesToRadian(270) + screenData.angle;
            screenData.x += Math.round(Math.cos(angle) * len);
            screenData.y += Math.round(Math.sin(angle) * len);
            break;
          }
          // P - Paint
          // S - Paint with boundary color
          case "P":
          case "S": {
            const color1 = pi2.util.getInt(drawArgs[1], 0);
            screenData.screenObj.paint(
              screenData.x,
              screenData.y,
              color1,
              drawArgs[0] === "S"
            );
            isBlind = true;
            break;
          }
          // A - Arc Line
          case "A": {
            const radius = pi2.util.getInt(drawArgs[1], 1);
            const angle1 = pi2.util.getInt(drawArgs[3], 1);
            const angle2 = pi2.util.getInt(drawArgs[5], 1);
            isArc = true;
            screenData._arcParams = { radius, angle1, angle2 };
            break;
          }
          // TA/T - Turn Angle
          case "T":
            screenData.angle = pi2.util.degreesToRadian(
              pi2.util.getInt(drawArgs[1], 1)
            );
            isBlind = true;
            break;
          // M - Move to absolute position
          case "M":
            screenData.x = pi2.util.getInt(drawArgs[1], 1);
            screenData.y = pi2.util.getInt(drawArgs[3], 1);
            isBlind = true;
            break;
          default:
            isBlind = true;
        }
        if (!isBlind) {
          if (isArc && screenData._arcParams) {
            const arc = screenData._arcParams;
            screenData.screenObj.arc(
              screenData.x,
              screenData.y,
              arc.radius,
              arc.angle1,
              arc.angle2
            );
          } else {
            screenData.screenObj.line(
              lastCursor.x,
              lastCursor.y,
              screenData.x,
              screenData.y
            );
          }
        }
        isBlind = false;
        isArc = false;
        if (isReturn) {
          isReturn = false;
          screenData.x = lastCursor.x;
          screenData.y = lastCursor.y;
          screenData.angle = lastCursor.angle;
        }
        if (drawArgs[0] === "N") {
          isReturn = true;
        } else {
          lastCursor = {
            "x": screenData.x,
            "y": screenData.y,
            "angle": screenData.angle
          };
        }
        if (drawArgs[0] === "B") {
          isBlind = true;
        }
      }
    }
    __name(draw, "draw");
  }
  __name(init18, "init");

  // src/assets/font-data.js
  function loadBuiltInFonts(pi2) {
    pi2.loadFont(
      "0,14004,2602800,oidnrt,3po8cff,3vnhgs4,1uv77og,3hpuv70,73g00,3vjgoef,3o00000,0,71ji,k9o000,1sg,1ogoc3p,jp4ir8,19fvt51,31ovfn3,cevfh,31vrooc,1tv52h8,2g0kula,2d2hcsp,8r2jg0,3vvvj,f33opv,8efh0g,3ho84fj,2200idv,2c40237,3r4g000,87000i,3vv901h,3jptvvv,3vnjpsc,0,g8420,22h800,57p9,3p80ea7,237000i,889019,111cc02,0,88420g,g4211,28oc,140011o,1000000,11000,1s00000,400,3333100,sjam9o,1g8423,203i888,1s060ho,hg0654,2fgg1sg,1o2e01p,3p4e07,211hgg0,oi64hg,1h4e13,31g0c,o00100,gg444,41000v,v0010,1088803,2110080,sqb41o,1h4if4,20729oi,1o07421,1o0s94,19701sg,1sgf03p,3p0g03,384p4c0,14if4i8,1o8423,201o84i,s04ihg,2h40842,43o12r,1ul8g25,2blej03,28ka4s0,s97i10,1h4ib3,10729oi,140321g,ho0v21,21014i,14i6025,a4k404,1al9ok0,12a22i4,24k421,7g8og,1s06210,21g1gc3,30g0c2,42300g,2g00000,1v,o40000,1o2f3,10210s9,s003i1,1o0211,251g00c,14s700g,23gg800,6kjo4s,ge4i94,8021,g04,1884218,3180421,21000a,1ul8g01,3294i00,64i8o0,c5310,200ca30,2102ok8,g003j0,3jo0023,221000i,14i6g00,24k400,8lbsk0,a2118,14i70,2e01s44,u02230,20g0630,31g082,622019,1000001,74a5u0,sg83go,3i80i93,30110oi,1oe22jg,joqh07,17hlg4,1o2f39g,33g4u6j,2841o66,gkc971,34g0oie,e411h4,3gsi030,211osh6,423hg0,1g84720,230g8e9,c94jp4,1goi97i,133p0u8,u06pmr,1sjf94j,34i8c93,94hg0c,14i604l,3inbvgk,2603ooc,1tdvstn,3phsif4,2prfurv,2qc67i1,3ooe4n,42rp8k,gs473h,jh8ua3,561igo,ggc231,30gg842,e110oi,14c2229,i8o887,94i9si,1km94jh,301s003,2703o00,40108,3g000f4,u,40g951,108d0kc,630gg0,g84000,2a8i000,92a800,1404g28,2mkll5,1lbfvdv,2rv210g,10g8421,u10g9s,84u118,2hbka50,7oka,1s217g,11bka5e,252h8ka,ka0fg8,n8kat0,21fg0ka,lu000j,30g9s00,7g84,8421o0,g84vg,1v,84210g,1og8000,vg0084,9v210g,1og8722,252hcka,kb421s,u842,352nc00,3u00fo0,7cka5i,42p81v,vg1b,2o01r51,vg03u0,ka5fo0,3u00f,320001v,ka52h8,3o0043h,21o007,843h00,ua52,252nska,9v217s,10g84u0,7,84vvvv,3vvu000,vvvtgo,1goc60o,1goc63f,3vvo000,2e53g,hp5upf,287i90g,10g003s,2h81uh4,44no00,1ska200,18s880,etgg84,1sc94hh,3hh4u94,267k631,15jfk3p,2i9s0fb,1f0004u,2iuo01p,221so70,64i94i,3u0vg7s,gs40,e01088,1o0020g,23g0452,421042,425110,3g0800,5500kk,oi6000,400,c,1gg,12go062,252g1o2,88f000,1ose00",
      6,
      6,
      null,
      true
    );
    pi2.loadFont(
      "0,ugs,3gvtm2u,1tvmss7,vtskvf,2v710g0,g8efjg,21008e2,vfl8gs,g8e77p,311o003,f7hg00,3vvpoc7,vvu045,h8igg0,3v1mrdm,3efu71h,1ep4i8o,oi94hg,33oof4j,34233hg,u97i95,cq08mn,2pspiqc,21gsfn3,400233,2v3go40,gsv213,3jggka5,a50180,1val6h8,2h80e9j,94hj4s,3p,3jo08ef,24fjghv,gsvah0,2100842,lfjgg0,82fgg,2000044,v41000,8421,3g00098,1voa800,8477r,3g000vf,2e21000,0,8e7,4200g0,18ka000,kaf,2afih80,gug70b,33000p9,442ac0,gk4aki,1380844,0,ggg841,100g41,211100,k4fh1,1000021,fh0g00,0,2110000,f00000,0,210000g,2222200,1p2jamb,jg08ca,4213s0,1p21332,no0sh0,260k9o0,8ca97o,11o1ug8,u0k9o0,oggf4a,jg1uh1,442100,1p2h74a,jg0sh8,2f0g9o0,84000,2100042,10gg,888820,20g000f,2007o00,10820gg,2200sh0,22200g0,1p2nalq,3g08a8,2hfka40,3oi9729,ng0c98,g828o0,3oi94i9,ng1u94,e42bs0,3si8721,700c98,g9i8s0,252hfka,k80s42,4211o0,s4214i,1301ia5,c52j60,3gg8421,no12ra,2l8ka40,25il9ka,k80sh8,2h8k9o0,3oi9721,700sh8,2h8l9o3,3oi9731,1680sh8,e0k9o0,3ta4210,23g12h8,2h8k9o0,252h8k9,11012h8,2lal980,24ka22h,14812h5,4211o0,3t22222,no1og8,g843g0,210820g,g41o42,4213g0,gkh8g0,0,1v,g82000,7,17k9u0,30g8539,lg0007,h849o0,c216kq,1jc0007,hfk1o0,oi8e21,700006,2h8jo5s,30ga6i9,m80806,4211o0,4030ga,k9pg84,2a62h40,1g84210,23g000d,lalak0,mcka,k80007,h8k9o0,u4i9,323g006,2i93g8e,r6i1,700007,2g70bo0,10gu421,hg0008,2h8kpk0,h8k9,1100008,2lal980,h511,1480008,2h8jo5s,v111,7o0642,o210c0,g84010,2101g42,321300,15c0000,45,h8kbs0,1p2g8jg,309o0i0,i94hs0,o0e8nq,3g0sh6,274hs0,240c13i,13o0o06,274hs0,g0c13i,13o0007,g83gcc,1p2e8nq,3g1207,hfk1o0,1g0e8nq,3g1406,4211o0,1p2c210,23g0o06,4211o0,248a8nq,k80840,e8nq40,c0v43h,7o000c,267khk0,skifki,14o08a0,e8k9o0,12074a,jg0g40,e8k9o0,gk08ka,jg0g40,h8k9o0,1208k9,3g9p245,h8igg0,240h8ka,jg0847,2g83og8,oi8e22,ng12af,24fh0g0,3ome4it,if4c52,e212go,o0c13i,13o0c06,4211o0,88074a,jg0022,h8k9o0,1lc0f4a,k80qj0,pakq40,1p4i7g3,3g00oi9,c07g00,g04442,jg0000,v84000,fg8,g00iq6,r5cecv,15kbdiq,3s84080,842100,aaa2g,2g000k5,555000,1348p26,1268ll5,1l5d9ba,3ctreup,3erm842,4210g8,g84270,210g84e,4e10g8,ka52n8,2h8k000,fh8ka,s270,210ga5e,21eh8ka,ka52h8,2h8k00f,21eh8ka,kat0no,a52,25fg000,g8s270,0,e10g8,g8421s,842,4fo000,7s,210g842,43p0g8,7s,842,4fp0g8,g87i1s,210ga52,252p8ka,ka5i1s,3,342p8ka,katg7s,f,30ep8ka,ka5i1c,2h8k00f,30fo000,katg7c,2h8k84f,30fo000,ka52ns,f,30fp0g8,7s,2h8ka52,253o000,g87i1s,3,343p0g8,1s,2h8ka52,25fp8ka,g8vi7s,210g842,4e0000,1s,210hvvv,3vvvvvv,7v,3vvvose,se73ho,e73hos,1osfvvv,3vg0000,cqki,2i400e8,2u8ni10,1uh842,4000fq,252h8k0,3t28322,no0007,2ka5100,i94jl,2200cp,2210g80,3s8e8k9,313sc98,1voa8o0,oigoa9,mc0e83,f8c5s0,impdd,g00117,2iqbp10,oggf41,1g0sh8,2h8ka40,v07o1,3o0084f,24203s0,g41110,7o0888,8203s0,c94i10,210g842,4252go,oc0fo0,31g00cp,206co00,oi9300,0,630000,1g,721,216h8c,3h4i94g,oi2,8f0000,e73h,3000000",
      6,
      8,
      null,
      true
    );
    pi2.loadFont(
      "0,0,1v839c1,2upj0bu,1vfvmvv,31ufvru,1mftvnu,1u3g400,83gv7u,1u3g400,s7oe7u,3v7oe3s,810e3s,3v7oe3s,61s,u1g000,3vvvpu3,31ufvvv,3opi2,116cf00,3vs76dt,2upjgvv,7ge3rt,36cpj3o,u6cpj6,u1gvgo,vj6fpg,o71s70,1vm6vr3,1hmfpm0,2clkf77,3jjomkp,20e1u7u,3se1000,10sfnu,v0s0g0,c3ovgo,c7sf0o,1j6cpj6,1j00pg0,1vtnmrr,dhm6o0,v66e3c,1m3hj3o,0,1v7svg0,c3ovgo,1v3o67v,c3ovgo,c1g600,c1g60o,1v3o600,1g37u,61g000,30o7u,1g30000,1g60,30fs000,28pnv,1j28000,1gf3u,3vvu000,fvvru,u1g000,0,0,o7gu1g,o00c00,1m6or00,0,1m6pvjc,3v6or00,o7pg3o,6fgc00,cdj0o,o6dhg0,s6oe3m,3ecotg0,1g61g00,0,c30o30,1g30600,1g3060o,c30o00,6cf7v,u6c000,30c7s,o30000,0,30c30,7s,0,0,30c00,30o61g,1gc1000,1ucdjmu,3recv00,o70c1g,o31v00,1sco31o,1gcpv00,1sco31o,6cou00,e3or6c,3v0o7g0,3uc1u0c,6cou00,s61g7o,36cou00,3uco30o,o30c00,1scpj3o,36cou00,1scpj3s,61gs00,30c00,30c00,30c00,30c30,c30o60,1g30600,1v00,fo000,1g3060c,c30o00,1sco30o,o00c00,1ucdnmu,3fc0u00,o7hj6c,3ucpj00,3u6cpjs,1j6dv00,u6dg60,306cf00,3s6opj6,1j6pu00,3v64q3o,1k65vg0,3v64q3o,1k61s00,u6dg60,376cfg0,36cpj7s,36cpj00,1s30c1g,o30u00,f0o30c,36cou00,3j6cr3o,1m6dpg0,3o60o30,1h6dvg0,33etvnu,3bcdhg0,33edtmu,37cdhg0,s6phm6,336oe00,3u6cpjs,1g61s00,1scpj6c,3e7g700,3u6cpjs,1m6dpg0,1scpo3g,ecou00,3ub8c1g,o30u00,36cpj6c,36cpv00,36cpj6c,367gc00,33cdhmm,3vethg0,33ccr1o,s6phg0,36cpj3o,o30u00,3vcd30o,p6dvg0,1s60o30,1g60u00,3060c0o,60c0g0,1s1g60o,c1gu00,83gr66,0,0,7v,o30600,0,u0c,1ucotg0,3g60o3s,1j6dn00,u6c,30cou00,e0o33s,36cotg0,u6c,3uc0u00,s6oo7g,1g61s00,tmc,367o37o,3g60r3m,1j6dpg0,o00s1g,o30u00,60030c,6cpj3o,3g60pjc,1s6ppg0,1o30c1g,o30u00,1j7u,3vddhg0,1u6c,36cpj00,u6c,36cou00,1n36,1j7oo7g,tmc,367o30u,1n3m,1j61s00,v60,1s0pu00,830v1g,o38600,1j6c,36cotg0,1j6c,367gc00,1hmm,3vfsr00,1hjc,s6phg0,1j6c,367o37o,1v4o,o69v00,e30c70,o30700,c1g600,c1g600,3g30c0s,o31o00,1rdo000,0,10e3c,33cdvg0,1scpg6c,1s1g33o,co06c,36covg0,e00u6c,3uc0u00,1vc6f06,v6cfo0,3600u0c,1ucovg0,3g00u0c,1ucovg0,o30u0c,1ucovg0,u60,307g31o,1vc6f36,1v60f00,3600u6c,3uc0u00,3g00u6c,3uc0u00,3600s1g,o30u00,1ucce0o,c1gf00,3g00s1g,o30u00,333gr66,3vcdhg0,o3003o,36fpj00,e01v30,1s61v00,voc,1vsovo0,v6pj7u,36cpjg0,1sco03o,36cou00,co03o,36cou00,e003o,36cou00,1sco06c,36covg0,e006c,36covg0,co06c,367o37o,31hgf36,1j3o600,3601j6c,36cou00,c1gvm0,307s60o,s6op7g,1gedv00,36cou7s,ofoc1g,3scpj7q,33cvhm7,71m61s,c1hm3g,e00u0c,1ucovg0,s00s1g,o30u00,1o03o,36cou00,1o06c,36covg0,fg07o,36cpj00,3u01j7c,3udpj00,u6or1u,7s000,s6or1o,7o000,o00c30,30cou00,7s,30c0000,7s,60o000,31sdj6u,pmdj0f,31sdj6r,rmvjo3,c1g00o,c1g600,36pmc,1j36000,cophj,1jco000,h8g8k8,h8g8k8,1aqklda,1aqklda,3dnfmve,3dnfmve,c1g60o,c1g60o,c1g60o,3s1g60o,c1hu0o,3s1g60o,r3cdhm,3r3cdhm,0,3v3cdhm,1u0o,3s1g60o,r3dtg6,3r3cdhm,r3cdhm,r3cdhm,1vg6,3r3cdhm,r3dtg6,3v00000,r3cdhm,3v00000,c1hu0o,3s00000,0,3s1g60o,c1g60o,fg0000,c1g60o,3vg0000,0,3vhg60o,c1g60o,fhg60o,0,3vg0000,c1g60o,3vhg60o,c1g7oo,fhg60o,r3cdhm,rjcdhm,r3cdpg,vg0000,fpg,rjcdhm,r3dto0,3vg0000,1vo0,3rjcdhm,r3cdpg,rjcdhm,1vo0,3vg0000,r3dto0,3rjcdhm,c1hvo0,3vg0000,r3cdhm,3vg0000,1vo0,3vhg60o,0,3vjcdhm,r3cdhm,vg0000,c1g7oo,fg0000,7oo,fhg60o,0,vjcdhm,r3cdhm,3vjcdhm,c1hvoo,3vhg60o,c1g60o,3s00000,0,fhg60o,3vvvvvv,3vvvvvv,0,3vvvvvv,3of1s7g,3of1s7g,7gu3of,7gu3of,3vvvvvv,0,tms,34dotg0,7hj7o,36fhg60,fpj60,30c1g00,fsr3c,1m6or00,3ucoo1g,1gcpv00,vmo,3cdgs00,6cpj6,1j7oo60,7dn0o,c1g600,3u30u6c,367gc7s,s6phnu,336oe00,s6phm6,1m6prg0,e3063s,36cou00,vmr,3dns000,30ovmr,3dnso60,s61g7o,3060e00,1scpj6c,36cpj00,fo07s,fo000,o31v1g,o01v00,1g3061g,1g01v00,c30o1g,c01v00,71m6oo,c1g60o,c1g60o,cdhm3g,o3007s,30c00,7dn00,1rdo000,s6or1o,0,o,c00000,0,c00000,7go30c,3m6of0s,1s6or3c,1m00000,1o1gc30,1s00000,f1s,u3o000",
      6,
      8,
      null,
      true
    );
    pi2.loadFont(
      "0,0,0,0,1v839c1,20rr6c1,1v00000,vnv,3dvvvu3,3jvuvg0,0,6pvnu,3vfsv1o,800000,g,s7pvjs,s10000,0,c3of77,3jue60o,u00000,61s,1vfvvru,c1gf00,0,o,u3o600,0,3vvvvvv,3vufgu3,3jvvvvv,3vvu000,f36,1144phs,0,3vvvvvv,31pjfdt,2cs7vvv,3vvu000,f0s6hi,1scpj6c,1s00000,f36,1j6cf0o,1v1g600,0,vj6fpg,o30s7g,3g00000,vr3,1vm6or3,1jufpm0,0,c1hmps,3jjpmoo,c00000,1060,3gfhvno,3gc1000,0,10c3hu,3v3s3g6,100000,61s,1v1g60o,1v3o600,0,1j6cpj6,1j6c036,1j00000,vur,3dtmuor,dhm6o0,3s,3360e3c,33ccr1o,6ccv00,0,0,3vftvg0,0,c3ovgo,c1gvhs,c7s000,61s,1v1g60o,c1g600,0,c1g60o,c1gvhs,c00000,0,c0pvgc,c00000,0,c30,3v60c00,0,0,c1g60,3v00000,0,a3c,3v6oa00,0,g,s3gv3s,3vfs000,0,ftvjs,1u3ge0g,0,0,0,0,0,c3of1s,c1g00o,c00000,6cpj6,i00000,0,0,1m6pvjc,1m6pvjc,1m00000,c1gv66,31c0v06,23ccv0o,c00000,1gm6,61gc36,3300000,e3c,1m3gtms,36cotg0,1g,o30o00,0,0,30o,o30c1g,o1g300,0,o1g30c,60o30o,o00000,0,1j3pvps,1j00000,0,60o,1v1g600,0,0,0,c1g61g,0,0,3v00000,0,0,0,1g600,0,10c30o,o61g40,0,v66,37dttn6,33ccv00,0,c3gu0o,c1g60o,1v00000,v66,30o61g,1gcdvg0,0,1ucc1g6,u0c1m6,1u00000,30s,u6pj7u,60o7g0,0,3vc1g60,3u0c1m6,1u00000,e30,30c1v66,33ccv00,0,3vcc1gc,c30c1g,o00000,v66,33ccv66,33ccv00,0,1ucdhm6,1v0c1gc,1s00000,o,c00000,c1g000,0,1g600,60o,o00000,1gc,c30o1g,c0o1g0,0,3u,vg0,0,o1g,c0o1gc,c30o00,0,1ucdhgc,c1g00o,c00000,v66,33dtnmu,3ec0v00,0,83gr66,33fthm6,3300000,1v36,1j6cv36,1j6dv00,0,u6dgm0,30c1gj6,u00000,1u3c,1j6cpj6,1j6pu00,0,3v6coj8,1s6goj6,3v00000,1vj6,1h6gu38,1g61s00,0,u6dgm0,30dthj6,t00000,1hm6,33cdvm6,33cdhg0,0,u1g60o,c1g60o,u00000,7gc,60o30c,36cou00,0,3j6cr3c,1s6or36,3j00000,1s30,1g60o30,1h6dvg0,0,33etvnu,3bcdhm6,3300000,1hn6,3rftnme,33cdhg0,0,s6phm6,33cdhjc,s00000,1v36,1j6cv30,1g61s00,0,1ucdhm6,33ddnjs,60s000,1v36,1j6cv3c,1j6dpg0,0,1ucdhj0,s0phm6,1u00000,vju,1d1g60o,c1gf00,0,33cdhm6,33cdhm6,1u00000,1hm6,33cdhm6,1m3g400,0,33cdhm6,3bddvjs,1m00000,1hm6,1m3ge1o,1mcdhg0,0,1j6cpj6,u1g60o,u00000,1vm6,261gc30,31cdvg0,0,u30c1g,o30c1g,u00000,1060,3g70e0s,70c0g0,0,u0o30c,60o30c,u00000,83gr66,0,0,0,0,0,1vo0,o30600,0,0,0,3o,67pj6c,1r00000,1o30,1g7gr36,1j6cv00,0,3s,33c1g66,1u00000,70c,63or6c,36cotg0,0,3s,33ftg66,1u00000,e3c,1i61s30,1g61s00,0,3m,36cpj3s,6cou00,1o30,1g6otj6,1j6dpg0,0,c1g01o,c1g60o,u00000,1g6,s1g6,30cpj6,u00000,3g60o36,1m7gr36,3j00000,e0o,c1g60o,c1gf00,0,7c,3vddlmm,3300000,0,dopj6,1j6cpg0,0,3s,33cdhm6,1u00000,0,dopj6,1j7oo30,3o00000,3m,36cpj3s,60o7g0,0,dotj6,1g61s00,0,3s,3370766,1u00000,41g,ofoc1g,o3c700,0,6c,36cpj6c,1r00000,0,6cpj6,1j3o600,0,66,33ddlnu,1m00000,0,ccr1o,s6phg0,0,66,33cdhju,30pu00,0,ftj0o,o6dvg0,0,71g60o,1o1g60o,700000,60o,c1g00o,c1g600,0,1o1g60o,71g60o,1o00000,tms,0,0,0,41o,1mcdhnu,0,f36,31c1g62,1j3o306,1u00000,36co06c,36cpj6c,1r00000,o61g,7phnu,30ccv00,g,s6o03o,67pj6c,1r00000,1j6c,7g33s,36cotg0,30,o1g03o,67pj6c,1r00000,3gr1o,7g33s,36cotg0,0,f36,1g6cf0c,33o000,10e3c,7phnu,30ccv00,0,36co03s,33ftg66,1u00000,60c0o,7phnu,30ccv00,0,1j6c01o,c1g60o,u00000,1gf36,3g60o,c1gf00,30,o1g01o,c1g60o,u00000,cdhgg,s6phm6,3vcdhg0,e3c,s00e3c,33cdvm6,3300000,c30o00,3v6co3s,1g6dvg0,0,1j3m,r7tm6o,1n00000,fjc,36cpvmc,36cpjg0,g,s6o03s,33cdhm6,1u00000,1hm6,7phm6,33ccv00,30,o1g03s,33cdhm6,1u00000,30u6c,cpj6c,36cotg0,30,o1g06c,36cpj6c,1r00000,1hm6,cdhm6,337s1gc,1s00066,333gr66,33cdhjc,s00000,cdhg0,33cdhm6,33ccv00,o,c3opj0,1g6cf0o,c00000,3gr34,1gf0o30,1gedv00,0,1j6cf0o,1v1gvgo,c00000,fhj6c,3sc9j6u,36cphg0,e,dhg60o,1v1g60o,cdgs00,1gc30,7g33s,36cotg0,c,c3001o,c1g60o,u00000,1gc30,7phm6,33ccv00,o,o6006c,36cpj6c,1r00000,tms,dopj6,1j6cpg0,tms,cdpnm,3vdtjm6,3300000,3or3c,v00vg0,0,1o,1m6oe00,1u00000,0,c1g,30c30,33ccv00,0,0,3vc1g60,0,0,1vg6,30c000,60,30cdj6o,o61n46,61gfg0,c1g66,36dgc36,379sfg6,300000,c1g00o,c3of1s,c00000,0,r6pm3c,r00000,0,1m3c,r6pm00,0,8k84a4,8k84a4,8k84a4,8k8lda,1aqklda,1aqklda,1aqklda,3enfnbn,3enfnbn,3enfnbn,3ene60o,c1g60o,c1g60o,c1g60o,c1g60o,c1g67o,c1g60o,c1g60o,c1g67o,cfg60o,c1g60o,r3cdhm,r3cdnm,r3cdhm,r3c000,0,fsdhm,r3cdhm,0,fg67o,c1g60o,c1gdhm,r3cdnm,3fcdhm,r3cdhm,r3cdhm,r3cdhm,r3cdhm,r3c000,7u,3fcdhm,r3cdhm,r3cdhm,rfc1nu,0,dhm,r3cdhm,rfs000,0,c1g60o,cfg67o,0,0,0,fg60o,c1g60o,c1g60o,c1g60v,0,60o,c1g60o,cfu000,0,0,7v,c1g60o,c1g60o,c1g60o,c1u60o,c1g60o,0,7v,0,60o,c1g60o,cfu60o,c1g60o,c1g60o,c1u60v,c1g60o,c1gdhm,r3cdhm,r3edhm,r3cdhm,r3cdhm,r3ec1v,0,0,1v,o3edhm,r3cdhm,r3cdhm,rfe07v,0,0,7v,fedhm,r3cdhm,r3cdhm,r3ec1n,r3cdhm,r3c000,7v,fu000,0,r3cdhm,rfe07n,r3cdhm,r3c60o,c1g67v,fu000,0,r3cdhm,r3cdnv,0,0,7v,fu60o,c1g60o,0,7v,r3cdhm,r3cdhm,r3cdhm,r3u000,0,c1g60o,c1u60v,0,0,v,c1u60o,c1g60o,0,1v,r3cdhm,r3cdhm,r3cdhm,rfudhm,r3cdhm,c1g60o,cfu67v,c1g60o,c1g60o,c1g60o,cfg000,0,0,v,c1g60o,c1hvvv,3vvvvvv,3vvvvvv,3vvvvvv,0,7v,3vvvvvv,3vvvs7g,3of1s7g,3of1s7g,3of1s7g,7gu3of,7gu3of,7gu3of,7gvvvv,3vvvvvv,3vg0000,0,0,7dn6o,3cdotg0,0,v66,3ucdhns,30c0g00,1vm6,33c1g60,30c1g00,0,1vjc,1m6or3c,1m00000,1vm6,1g3061g,1gcdvg0,0,3u,3cdhm6o,1o00000,0,1j6cpj6,1u60o60,0,tms,c1g60o,c00000,vgo,u6cpj6,u1gvg0,0,s6phm6,3vcdhjc,s00000,e3c,33cdhjc,1m6prg0,0,f3060c,v6cpj6,u00000,0,7tmur,1v00000,0,1gcvmr,3dv6vj0,3000000,71g,1g60v30,1g30700,0,7phm6,33cdhm6,3300000,7u,1vg0,fs000,0,1g63u,c1g000,3vg0000,c0o,60c30o,o00vg0,0,61gc30,o1g300,1v00000,3gr,dhg60o,c1g60o,c1g60o,c1g60o,c1hm6o,1o00000,o,c00vg0,c1g000,0,tms,7dn00,0,3gr3c,s00000,0,0,0,c1g000,0,0,o,0,f,60o30c,6eor1s,e00000,dgr3c,1m6or00,0,3g,3c30o68,3s00000,0,0,1u7ov3s,1u7o000,0",
      8,
      14,
      null,
      true
    );
    pi2.loadFont(
      "0,0,0,0,vk1,2io30dt,2co30bu,0,vnv,3dvvvu3,3jvvvru,0,0,1mftvnu,3v7oe0g,0,0,83gv7u,1u3g400,0,o,u3ppv7,3jhg61s,0,o,u7tvvv,1v1g61s,0,0,0,0,0,3vvvvvv,3vvvpu3,31ufvvv,3vvvvvv,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,vr3,1vm6or3,1hmfpv6,3000000,o,cdmf77,udm60o,0,81g70,3ofhvno,3oe1g40,0,41ge,f3tvhu,f0s1g2,0,61s,1v1g60o,1v3o600,0,pj6,1j6cpj6,1j00pj6,0,vur,3dtmuor,dhm6or,0,7phj0,s6phm6,1m3g366,1u00000,0,0,3vftvnu,0,61s,1v1g60o,1v3o63u,0,61s,1v1g60o,c1g60o,0,60o,c1g60o,c7sf0o,0,0,1g37u,61g000,0,0,30o7u,1g30000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,61s,u3o60o,c0060o,0,6cpj6,i00000,0,0,3c,1mfsr3c,1mfsr3c,0,c1gv66,31c0v06,38dhjs,c1g000,0,31cc30o,o61hk6,0,e3c,1m3gtms,36cpj3m,0,30c1g,1g00000,0,0,30o,o30c1g,o3060c,0,c0o,60o30c,60o61g,0,0,6cf7v,u6c000,0,0,1g63u,c1g000,0,0,0,1g60o,o00000,0,7u,0,0,0,0,60o,0,0,10c30o,o61g40,0,f36,31s7mur,31s6phs,0,61o,1s1g60o,c1g63u,0,v66,30o61g,1gc1hnu,0,v66,30cf06,30dhjs,0,30s,u6pj7u,60o30u,0,1vm0,30c1v06,30dhjs,0,e30,30c1v66,33cdhjs,0,1vm6,30c30o,o30c1g,0,v66,33ccv66,33cdhjs,0,v66,33ccvg6,30c33o,0,0,c1g000,1g600,0,0,c1g000,1g61g,0,6,61gc30,o1g306,0,0,7s000,1v00000,0,30,o1g306,61gc30,0,v66,330o60o,c0060o,0,3s,33cdnmu,3fdpg3s,0,41o,1mcdhnu,33cdhm6,0,1v36,1j6cv36,1j6cpns,0,f36,31c1g60,30c4phs,0,1u3c,1j6cpj6,1j6cr7o,0,1vj6,1h6gu38,1g64pnu,0,1vj6,1h6gu38,1g60o7g,0,f36,31c1g6u,33ccphq,0,1hm6,33cdvm6,33cdhm6,0,f0o,c1g60o,c1g61s,0,7gc,60o30c,36cpj3o,0,1pj6,1j6ou3o,1m6cpn6,0,1s30,1g60o30,1g64pnu,0,1gv7,3vvvmu3,31s7gu3,0,1hn6,3rftnme,33cdhm6,0,v66,33cdhm6,33cdhjs,0,1v36,1j6cv30,1g60o7g,0,v66,33cdhm6,33ddnjs,60s000,1v36,1j6cv3c,1j6cpn6,0,v66,3360e0c,3cdhjs,0,1vur,2chg60o,c1g61s,0,1hm6,33cdhm6,33cdhjs,0,1gu3,31s7gu3,31mcf0o,0,1gu3,31s7gur,3dvupj6,0,1gu3,1j3o60o,u6dgu3,0,1gu3,31mcf0o,c1g61s,0,1vu3,230o61g,1gc3gvv,0,f1g,o30c1g,o30c1s,0,40,30e0s1o,e0s1g2,0,f0c,60o30c,60o31s,0,83gr66,0,0,0,0,0,0,fu000,o30600,0,0,0,0,7g33s,36cpj3m,0,1o30,1g7gr36,1j6cpjs,0,0,7phm0,30c1hjs,0,70c,63or6c,36cpj3m,0,0,7phnu,30c1hjs,0,e3c,1i61s30,1g60o7g,0,0,7dj6c,36cpj3s,6cou00,1o30,1g6otj6,1j6cpn6,0,60o,3g60o,c1g61s,0,1g6,s1g6,30c1g6,1j6cf00,1o30,1g6cr3o,1s6opn6,0,e0o,c1g60o,c1g61s,0,0,edvur,3dtnmur,0,0,dopj6,1j6cpj6,0,0,7phm6,33cdhjs,0,0,dopj6,1j6cpjs,1g61s00,0,7dj6c,36cpj3s,60o7g0,0,dotj6,1g60o7g,0,0,7phj0,s0phjs,0,41g,ofoc1g,o30dgs,0,0,cpj6c,36cpj3m,0,0,c7gu3,31mcf0o,0,0,c7gu3,3dtnvr6,0,0,c6phs,c3opm3,0,0,cdhm6,33cdhju,30pu00,0,ftj0o,o61hnu,0,3go,c1gs0o,c1g60e,0,60o,c1g00o,c1g60o,0,s0o,c1g3go,c1g63g,0,tms,0,0,0,0,83gr66,33cdvg0,0,f36,31c1g60,316cf0c,37o000,1j00,cpj6c,36cpj3m,0,o61g,7phnu,30c1hjs,0,10e3c,7g33s,36cpj3m,0,1j00,7g33s,36cpj3m,0,60c0o,7g33s,36cpj3m,0,3gr1o,7g33s,36cpj3m,0,0,u6co30,1j3o306,u00000,10e3c,7phnu,30c1hjs,0,1hg0,7phnu,30c1hjs,0,60c0o,7phnu,30c1hjs,0,pg0,3g60o,c1g61s,0,1gf36,3g60o,c1g61s,0,60c0o,3g60o,c1g61s,0,cc00g,s6phm6,3vcdhm6,0,s6oe00,s6phm6,3vcdhm6,0,c30o00,3v6co3s,1g60pnu,0,0,6seor,1vdhn3n,0,fjc,36cpvmc,36cpj6e,0,10e3c,7phm6,33cdhjs,0,1hg0,7phm6,33cdhjs,0,60c0o,7phm6,33cdhjs,0,30u6c,cpj6c,36cpj3m,0,60c0o,cpj6c,36cpj3m,0,1hg0,cdhm6,33cdhju,30ou00,cc03s,33cdhm6,33cdhjs,0,cc066,33cdhm6,33cdhjs,0,1g63u,31s1g60,31ns60o,0,3gr34,1gf0o30,1g61pns,0,1gr6,u1hvoo,3vhg60o,0,fopj6,1u64pjf,1j6cpnj,0,s6oo,c1gvgo,c1g60o,3c70000,1gc30,7g33s,36cpj3m,0,o61g,3g60o,c1g61s,0,1gc30,7phm6,33cdhjs,0,1gc30,cpj6c,36cpj3m,0,tms,dopj6,1j6cpj6,0,1rdo066,3jfdvmu,37cdhm6,0,3or3c,v00vg0,0,0,3gr3c,s00v00,0,0,c1g,30c30,30cdhjs,0,0,1vm0,30c1g00,0,0,1vg6,30c1g0,0,c1g62,33co61g,1gct6o6,61u000,c1g62,33co61g,1jct5hu,30c000,60o,1g60o,u3of0o,0,0,3cr6o,1m3c000,0,0,dgr1m,1mdg000,0,8k84a4,8k84a4,8k84a4,8k84a4,1aqklda,1aqklda,1aqklda,1aqklda,3enfnbn,3enfnbn,3enfnbn,3enfnbn,c1g60o,c1g60o,c1g60o,c1g60o,c1g60o,c1g67o,c1g60o,c1g60o,c1g60o,cfg67o,c1g60o,c1g60o,r3cdhm,r3cdnm,r3cdhm,r3cdhm,0,7u,r3cdhm,r3cdhm,0,fg67o,c1g60o,c1g60o,r3cdhm,rfc1nm,r3cdhm,r3cdhm,r3cdhm,r3cdhm,r3cdhm,r3cdhm,0,fs1nm,r3cdhm,r3cdhm,r3cdhm,rfc1nu,0,0,r3cdhm,r3cdnu,0,0,c1g60o,cfg67o,0,0,0,7o,c1g60o,c1g60o,c1g60o,c1g60v,0,0,c1g60o,c1g67v,0,0,0,7v,c1g60o,c1g60o,c1g60o,c1g60v,c1g60o,c1g60o,0,7v,0,0,c1g60o,c1g67v,c1g60o,c1g60o,c1g60o,c1u60v,c1g60o,c1g60o,r3cdhm,r3cdhn,r3cdhm,r3cdhm,r3cdhm,r3ec1v,0,0,0,3uc1n,r3cdhm,r3cdhm,r3cdhm,rfe07v,0,0,0,fu07n,r3cdhm,r3cdhm,r3cdhm,r3ec1n,r3cdhm,r3cdhm,0,fu07v,0,0,r3cdhm,rfe07n,r3cdhm,r3cdhm,c1g60o,cfu07v,0,0,r3cdhm,r3cdnv,0,0,0,fu07v,c1g60o,c1g60o,0,7v,r3cdhm,r3cdhm,r3cdhm,r3cdhv,0,0,c1g60o,c1u60v,0,0,0,1u60v,c1g60o,c1g60o,0,1v,r3cdhm,r3cdhm,r3cdhm,r3cdnv,r3cdhm,r3cdhm,c1g60o,cfu67v,c1g60o,c1g60o,c1g60o,c1g67o,0,0,0,v,c1g60o,c1g60o,3vvvvvv,3vvvvvv,3vvvvvv,3vvvvvv,0,7v,3vvvvvv,3vvvvvv,3of1s7g,3of1s7g,3of1s7g,3of1s7g,7gu3of,7gu3of,7gu3of,7gu3of,3vvvvvv,3vvvvo0,0,0,0,7dn6o,3cdhn3m,0,u6c,36cpm6c,33cdhmc,0,1vm6,33c1g60,30c1g60,0,0,3v6or3c,1m6or3c,0,7u,3360c0o,o61hnu,0,0,7tm6o,3cdhm3g,0,0,1j6cpj6,1j7oo30,3000000,0,1rdo60o,c1g60o,0,3u,c3opj6,1j3o63u,0,1o,1mcdhnu,33ccr1o,0,e3c,33cdhjc,1m6or7e,0,7hg,c0ofj6,1j6cphs,0,0,7tmur,3dns000,0,3,37tmur,3pnso60,0,71g,1g60v30,1g60c0s,0,3s,33cdhm6,33cdhm6,0,0,3v0007u,1vg0,0,0,c1gvgo,c0007v,0,1g,c0o1gc,c3003u,0,c,c30o1g,c0o03u,0,3gr,dhg60o,c1g60o,c1g60o,c1g60o,c1g60o,3cdhm3g,0,0,c1g03u,1g600,0,0,7dn00,1rdo000,0,3gr3c,s00000,0,0,0,o,c00000,0,0,0,c00000,0,u30c,60o37c,1m6of0s,0,dgr3c,1m6or00,0,0,71m1g,1gchu00,0,0,0,1u7ov3s,1u7ov00,0",
      8,
      16,
      null,
      true
    );
    pi2.setDefaultFont(1);
  }
  __name(loadBuiltInFonts, "loadBuiltInFonts");

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
  init6(pi);
  init7(pi);
  init8(pi);
  init9(pi);
  init10(pi);
  init11(pi);
  init12(pi);
  init13(pi);
  init14(pi);
  init15(pi);
  init16(pi);
  init17(pi);
  init18(pi);
  init(pi);
  piData.commands.setDefaultPal([defaultPaletteHex]);
  piData.commands.setDefaultColor([7]);
  processCommands(pi);
  if (typeof window !== "undefined") {
    window.pi = pi;
    if (window.$ === void 0) {
      window.$ = pi;
    }
  }
  if (typeof window !== "undefined") {
    loadBuiltInFonts(pi);
  }
  var index_default = pi;
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
