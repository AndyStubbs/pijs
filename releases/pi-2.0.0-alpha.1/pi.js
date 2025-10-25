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
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src-pi-2.0.0-alpha.1/core/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    calcColorDifference: () => calcColorDifference,
    clamp: () => clamp,
    convertToColor: () => convertToColor,
    degreesToRadian: () => degreesToRadian,
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
    rndRange: () => rndRange
  });
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
  function hexToData(hex, width2, height2) {
    hex = hex.toUpperCase();
    const data = [];
    let i = 0;
    let digits = "";
    let digitIndex = 0;
    for (let y = 0; y < height2; y++) {
      data.push([]);
      for (let x = 0; x < width2; x++) {
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
  function inRange2(x1, y1, x2, y2, width2, height2) {
    return x1 >= x2 && x1 < x2 + width2 && y1 >= y2 && y1 < y2 + height2;
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
        val = parseFloat(parts[i].trim()) * 255;
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

  // src-pi-2.0.0-alpha.1/core/commands.js
  var m_commandList = [];
  var m_settings = {};
  var m_api;
  var m_screenManager;
  var m_readyCallbacks = [];
  var m_isDocumentReady = false;
  var m_waitCount = 0;
  var m_checkReadyTimeout = null;
  function init(api2, screenManager) {
    m_api = api2;
    m_screenManager = screenManager;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
      } else {
        m_isDocumentReady = true;
      }
    } else {
      m_isDocumentReady = true;
    }
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
  function addCommand(name, fn, parameterNames, isScreen = false, screenOptional = false) {
    const cmd = {
      "name": name,
      "fn": fn,
      "parameterNames": parameterNames,
      "isScreen": isScreen,
      "screenOptional": screenOptional
    };
    m_commandList.push(cmd);
    if (name.startsWith("set") && name !== "set") {
      const settingName = cmd.name.substring(3, 4).toLowerCase() + cmd.name.substring(4);
      m_settings[settingName] = cmd;
    }
  }
  function processApi() {
    const setList = [];
    for (const cmd of m_commandList) {
      if (cmd.name.startsWith("set")) {
        const settingName = cmd.name.substring(3, 4).toLowerCase() + cmd.name.substring(4);
        setList.push(settingName);
      }
    }
    setList.sort((settingNameA, settingNameB) => {
      if (settingNameA === "screen") {
        return -1;
      } else if (settingNameB === "screen") {
        return 1;
      }
      return settingNameA.localeCompare(settingNameB);
    });
    m_screenManager.addCommand("set", set, setList, true);
    m_commandList.sort((a, b) => a.name.localeCompare(b.name));
    m_screenManager.sortScreenCommands();
    for (const command of m_commandList) {
      processApiCommand(command);
    }
  }
  function processApiCommand(command) {
    if (command.isScreen) {
      m_api[command.name] = (...args) => {
        const options = parseOptions(args, command.parameterNames);
        const screenData = m_screenManager.getActiveScreen();
        if (!screenData && !command.screenOptional) {
          const error = new Error(`${command.name}: No screens available for command.`);
          error.code = "NO_SCREEN";
          throw error;
        }
        return command.fn(screenData, options);
      };
    } else {
      m_api[command.name] = (...args) => {
        const options = parseOptions(args, command.parameterNames);
        return command.fn(options);
      };
    }
  }
  function getApi() {
    return m_api;
  }
  addCommand("ready", ready, ["callback"]);
  function ready(options) {
    const callback = options.callback;
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
          screenData = m_screenManager.getActiveScreen();
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

  // src-pi-2.0.0-alpha.1/core/screen-manager.js
  var screen_manager_exports = {};
  __export(screen_manager_exports, {
    addAACommand: () => addAACommand,
    addCommand: () => addCommand2,
    addPixelCommand: () => addPixelCommand,
    addScreenCleanupFunction: () => addScreenCleanupFunction,
    addScreenDataItem: () => addScreenDataItem,
    addScreenDataItemGetter: () => addScreenDataItemGetter,
    addScreenInitFunction: () => addScreenInitFunction,
    addScreenInternalCommands: () => addScreenInternalCommands,
    getActiveScreen: () => getActiveScreen,
    init: () => init2,
    sortScreenCommands: () => sortScreenCommands
  });
  var SCREEN_API_PROTO = { "screen": true };
  var m_screens = {};
  var m_commandList2 = [];
  var m_pixelCommands = {};
  var m_aaCommands = {};
  var m_screenDataItems = {};
  var m_screenDataItemGetters = [];
  var m_screenInternalCommands = [];
  var m_screenDataInitFunctions = [];
  var m_sceenDataCleanupFunctions = [];
  var m_nextScreenId = 0;
  var m_activeScreen = null;
  var m_resizeObserver = null;
  var m_observedContainers = /* @__PURE__ */ new Set();
  function init2() {
    m_resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const container = entry.target;
        const canvases = container.querySelectorAll("canvas[data-screen-id]");
        if (canvases.length === 0) {
          continue;
        }
        for (const canvas2 of canvases) {
          const screenId = parseInt(canvas2.dataset.screenId, 10);
          const screenData = m_screens[screenId];
          if (screenData) {
            resizeScreen(screenData);
          }
        }
      }
    });
  }
  function addCommand2(name, fn, parameterNames, screenOptional = false) {
    m_commandList2.push({
      "name": name,
      "fn": fn,
      "parameterNames": parameterNames,
      "screenOptional": screenOptional
    });
    addCommand(name, fn, parameterNames, true, screenOptional);
  }
  function addPixelCommand(name, fn, parameterNames) {
    const cmd = {
      "name": name,
      "fn": fn,
      "parameterNames": parameterNames,
      "isScreen": true
    };
    m_commandList2.push(cmd);
    addCommand(name, fn, parameterNames, true);
    m_pixelCommands[name] = cmd;
  }
  function addAACommand(name, fn, parameterNames) {
    const cmd = {
      "name": name,
      "fn": fn,
      "parameterNames": parameterNames,
      "isScreen": true
    };
    m_aaCommands[name] = cmd;
  }
  function sortScreenCommands() {
    m_commandList2.sort((a, b) => a.name.localeCompare(b.name));
  }
  function addScreenDataItem(name, val) {
    m_screenDataItems[name] = val;
  }
  function addScreenInternalCommands(name, fn) {
    m_screenInternalCommands.push({ name, fn });
  }
  function addScreenDataItemGetter(name, fn) {
    m_screenDataItemGetters.push({ name, fn });
  }
  function getActiveScreen() {
    return m_activeScreen;
  }
  function addScreenInitFunction(fn) {
    m_screenDataInitFunctions.push(fn);
  }
  function addScreenCleanupFunction(fn) {
    m_sceenDataCleanupFunctions.push(fn);
  }
  addCommand("screen", screen, [
    "aspect",
    "container",
    "isOffscreen",
    "willReadFrequently",
    "noStyles",
    "resizeCallback"
  ]);
  function screen(options) {
    if (options.resizeCallback != null && !isFunction(options.resizeCallback)) {
      const error = new TypeError("screen: resizeCallback must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    if (typeof options.aspect === "string" && options.aspect !== "") {
      options.aspectData = parseAspect(options.aspect.toLowerCase());
      if (!options.aspectData) {
        const error = new Error("screen: invalid value for aspect.");
        error.code = "INVALID_ASPECT";
        throw error;
      }
    }
    let screenData = createScreen(options);
    for (const command of m_commandList2) {
      processApiCommand2(screenData, command);
    }
    m_activeScreen = screenData;
    m_screens[screenData.id] = screenData;
    screenData.api.setFont(screenData.font.id);
    for (const fn of m_screenDataInitFunctions) {
      fn(screenData);
    }
    return screenData.api;
  }
  addCommand2("removeScreen", removeScreen, []);
  function removeScreen(screenData) {
    const screenId = screenData.id;
    screenData.api.cancelInput();
    screenData.api.clearEvents();
    const errorMessage = `Cannot call {METHOD}() on removed screen (id: ${screenId}). The screen has been removed from the page.`;
    for (const key in screenData.api) {
      if (typeof screenData.api[key] === "function") {
        screenData.api[key] = () => {
          const error = new TypeError(errorMessage.replace("{METHOD}", key));
          error.code = "DELETED_METHOD";
          throw error;
        };
      }
    }
    if (screenData.canvas && screenData.canvas.parentElement) {
      screenData.canvas.parentElement.removeChild(screenData.canvas);
    }
    if (screenData.container && m_resizeObserver && m_observedContainers.has(screenData.container)) {
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
    screenData.bufferCanvas = null;
    screenData.context = null;
    screenData.bufferContext = null;
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
    for (const internal of m_screenInternalCommands) {
      screenData[internal.name] = null;
    }
    if (screenData === m_activeScreen) {
      m_activeScreen = null;
      for (const i in m_screens) {
        if (m_screens[i] !== screenData) {
          m_activeScreen = m_screens[i];
          break;
        }
      }
    }
    for (const fn of m_sceenDataCleanupFunctions) {
      fn(screenData);
    }
    delete m_screens[screenId];
  }
  addCommand("setScreen", setScreen, ["screen"]);
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
    m_activeScreen = m_screens[screenId];
  }
  addCommand("getScreen", getScreen, ["screenId"]);
  function getScreen(options) {
    const screenId = getInt(options.screenId, null);
    if (screenId === null) {
      const error = new Error("screen: Invalid screen id.");
      error.code = "INVALID_SCREEN_ID";
      throw error;
    }
    const screen2 = m_screens[screenId];
    if (!screen2) {
      const error = new Error(`screen: Screen "${screenId} not found.`);
      error.code = "SCREEN_NOT_FOUND";
      throw error;
    }
    return screen2.api;
  }
  addCommand2("width", width, []);
  function width(screenData) {
    return screenData.width;
  }
  addCommand2("height", height, []);
  function height(screenData) {
    return screenData.height;
  }
  addCommand2("canvas", canvas, []);
  function canvas(screenData) {
    return screenData.canvas;
  }
  addCommand2("setPixelMode", setPixelMode, ["isEnabled"]);
  function setPixelMode(screenData, options) {
    const isEnabled = !!options.isEnabled;
    if (isEnabled) {
      screenData.context.imageSmoothingEnabled = false;
      for (const name in m_pixelCommands) {
        processApiCommand2(screenData, m_pixelCommands[name]);
        processApiCommand(m_pixelCommands[name]);
      }
    } else {
      screenData.context.imageSmoothingEnabled = true;
      for (const name in m_aaCommands) {
        processApiCommand2(screenData, m_aaCommands[name]);
        processApiCommand(m_aaCommands[name]);
      }
    }
  }
  addCommand2("getPixelMode", getPixelMode, []);
  function getPixelMode(screenData) {
    return !screenData.context.imageSmoothingEnabled;
  }
  function processApiCommand2(screenData, command) {
    screenData.api[command.name] = (...args) => {
      const options = parseOptions(args, command.parameterNames);
      return command.fn(screenData, options);
    };
  }
  function parseAspect(aspect) {
    const match = aspect.replaceAll(" ", "").match(/^(\d+)(:|x|e|m)(\d+)$/);
    if (!match) {
      return null;
    }
    const width2 = Number(match[1]);
    const splitter = match[2];
    const height2 = Number(match[3]);
    if (isNaN(width2) || width2 === 0 || isNaN(height2) || height2 === 0) {
      return null;
    }
    return {
      "width": width2,
      "height": height2,
      "splitter": splitter,
      "isMultiple": splitter === "m" || splitter === "e"
    };
  }
  function createScreen(options) {
    if (options.isOffscreen) {
      if (!options.aspectData) {
        const error = new Error(
          "screen: You must supply an aspect ratio with exact dimensions for offscreen screens."
        );
        error.code = "NO_ASPECT_OFFSCREEN";
        throw error;
      }
      if (options.aspectData.splitter !== "x") {
        const error = new Error(
          "screen: You must use aspect ratio with e(x)act pixel dimensions for offscreenscreens. For example: 320x200 for width of 320 and height of 200 pixels."
        );
        error.code = "INVALID_OFFSCREEN_ASPECT";
        throw error;
      }
      return createOffscreenScreen(options);
    }
    if (typeof options.container === "string") {
      options.container = document.getElementById(options.container);
    } else if (!options.container) {
      options.container = document.body;
    } else if (!isDomElement(options.container)) {
      const error = new TypeError(
        "screen: Invalid argument container. Container must be a DOM element or a string id of a DOM element."
      );
      error.code = "INVALID_CONTAINER";
      throw error;
    }
    if (options.noStyles) {
      return createNoStyleScreen(options);
    }
    return createDefaultScreen(options);
  }
  function createOffscreenScreen(options) {
    options.canvas = document.createElement("canvas");
    options.canvas.width = options.aspectData.width;
    options.canvas.height = options.aspectData.height;
    options.bufferCanvas = document.createElement("canvas");
    options.bufferCanvas.width = options.aspectData.width;
    options.bufferCanvas.height = options.aspectData.height;
    options.container = null;
    options.isOffscreen = true;
    options.isNoStyles = false;
    options.resizeCallback = null;
    options.previousOffsetSize = null;
    return createScreenData(options);
  }
  function createDefaultScreen(options) {
    options.canvas = document.createElement("canvas");
    options.bufferCanvas = document.createElement("canvas");
    options.canvas.tabIndex = 0;
    options.canvas.style.outline = "none";
    options.canvas.style.backgroundColor = "black";
    options.canvas.style.position = "absolute";
    options.canvas.style.imageRendering = "pixelated";
    options.canvas.style.imageRendering = "crisp-edges";
    let isContainerBody = true;
    if (options.container === document.body) {
      isContainerBody = false;
      document.documentElement.style.height = "100%";
      document.documentElement.style.margin = "0";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
      options.canvas.style.left = "0";
      options.canvas.style.top = "0";
    }
    if (options.container.offsetHeight === 0) {
      options.container.style.height = "200px";
    }
    options.container.appendChild(options.canvas);
    if (options.aspectData) {
      const size = getSize(options.container);
      setCanvasSize(options.aspectData, options.canvas, size.width, size.height);
      options.bufferCanvas.width = options.canvas.width;
      options.bufferCanvas.height = options.canvas.height;
    } else {
      if (isContainerBody) {
        options.canvas.style.position = "static";
      }
      options.canvas.style.width = "100%";
      options.canvas.style.height = "100%";
      const size = getSize(options.canvas);
      options.canvas.width = size.width;
      options.canvas.height = size.height;
      options.bufferCanvas.width = size.width;
      options.bufferCanvas.height = size.height;
    }
    options.previousOffsetSize = {
      "width": options.canvas.offsetWidth,
      "height": options.canvas.offsetHeight
    };
    const screenData = createScreenData(options);
    if (m_resizeObserver && options.container && !m_observedContainers.has(options.container)) {
      m_resizeObserver.observe(options.container);
      m_observedContainers.add(options.container);
    }
    return screenData;
  }
  function createNoStyleScreen(options) {
    options.canvas = document.createElement("canvas");
    options.bufferCanvas = document.createElement("canvas");
    options.container.appendChild(options.canvas);
    options.canvas.tabIndex = 0;
    if (options.aspectData && options.aspectData.splitter === "x") {
      options.canvas.width = options.aspectData.width;
      options.canvas.height = options.aspectData.height;
      options.bufferCanvas.width = options.canvas.width;
      options.bufferCanvas.height = options.canvas.height;
    } else {
      const size = getSize(options.canvas);
      options.bufferCanvas.width = size.width;
      options.bufferCanvas.height = size.height;
    }
    options.previousOffsetSize = null;
    return createScreenData(options);
  }
  function createScreenData(options) {
    const contextAttributes = { "willReadFrequently": !!options.willReadFrequently };
    const screenApi = Object.create(SCREEN_API_PROTO);
    screenApi.id = m_nextScreenId;
    const screenData = {
      "id": m_nextScreenId,
      "canvas": options.canvas,
      "width": options.canvas.width,
      "height": options.canvas.height,
      "container": options.container,
      "aspectData": options.aspectData,
      "isOffscreen": options.isOffscreen,
      "isNoStyles": options.isNoStyles,
      "context": options.canvas.getContext("2d", contextAttributes),
      "bufferCanvas": options.bufferCanvas,
      "bufferContext": options.bufferCanvas.getContext("2d", contextAttributes),
      "clientRect": options.canvas.getBoundingClientRect(),
      "resizeCallback": options.resizeCallback,
      "previousOffsetSize": options.previousOffsetSize || null,
      "api": screenApi
    };
    Object.assign(screenData, structuredClone(m_screenDataItems));
    for (const itemGetter of m_screenDataItemGetters) {
      screenData[itemGetter.name] = structuredClone(itemGetter.fn());
    }
    for (const cmd of m_screenInternalCommands) {
      screenData[cmd.name] = cmd.fn;
    }
    m_nextScreenId += 1;
    options.canvas.dataset.screenId = screenData.id;
    screenData.context.imageSmoothingEnabled = false;
    screenData.context.fillStyle = screenData.color.hex;
    screenData.context.strokeStyle = screenData.color.hex;
    return screenData;
  }
  function setCanvasSize(aspectData, canvas2, maxWidth, maxHeight) {
    let width2 = aspectData.width;
    let height2 = aspectData.height;
    const splitter = aspectData.splitter;
    let newWidth, newHeight;
    if (aspectData.isMultiple && splitter !== ":") {
      const factorX = Math.floor(maxWidth / width2);
      const factorY = Math.floor(maxHeight / height2);
      let factor = factorX > factorY ? factorY : factorX;
      if (factor < 1) {
        factor = 1;
      }
      newWidth = width2 * factor;
      newHeight = height2 * factor;
      if (splitter === "e") {
        width2 = Math.floor(maxWidth / factor);
        height2 = Math.floor(maxHeight / factor);
        newWidth = width2 * factor;
        newHeight = height2 * factor;
      }
    } else {
      const ratio1 = height2 / width2;
      const ratio2 = width2 / height2;
      newWidth = maxHeight * ratio2;
      newHeight = maxWidth * ratio1;
      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        newHeight = newWidth * ratio1;
      } else {
        newHeight = maxHeight;
      }
      if (splitter === "e") {
        width2 += Math.round((maxWidth - newWidth) * (width2 / newWidth));
        height2 += Math.round((maxHeight - newHeight) * (height2 / newHeight));
        newWidth = maxWidth;
        newHeight = maxHeight;
      }
    }
    canvas2.style.width = Math.floor(newWidth) + "px";
    canvas2.style.height = Math.floor(newHeight) + "px";
    canvas2.style.marginLeft = Math.floor((maxWidth - newWidth) / 2) + "px";
    canvas2.style.marginTop = Math.floor((maxHeight - newHeight) / 2) + "px";
    if (splitter !== ":") {
      canvas2.width = width2;
      canvas2.height = height2;
    } else {
      canvas2.width = Math.floor(newWidth);
      canvas2.height = Math.floor(newHeight);
    }
  }
  function getSize(element) {
    return {
      "width": element.offsetWidth || element.clientWidth || element.width,
      "height": element.offsetHeight || element.clientHeight || element.height
    };
  }
  function resizeScreen(screenData) {
    if (screenData.isOffscreen || screenData.isNoStyles || screenData.canvas.offsetParent === null) {
      return;
    }
    const fromSize = screenData.previousOffsetSize || {
      "width": screenData.canvas.offsetWidth,
      "height": screenData.canvas.offsetHeight
    };
    screenData.bufferContext.clearRect(0, 0, screenData.width, screenData.height);
    screenData.bufferContext.drawImage(screenData.canvas, 0, 0);
    let size;
    if (screenData.aspectData) {
      size = getSize(screenData.container);
      setCanvasSize(screenData.aspectData, screenData.canvas, size.width, size.height);
    } else {
      size = getSize(screenData.canvas);
      screenData.canvas.width = size.width;
      screenData.canvas.height = size.height;
    }
    screenData.clientRect = screenData.canvas.getBoundingClientRect();
    screenData.context.drawImage(
      screenData.bufferCanvas,
      0,
      0,
      screenData.width,
      screenData.height
    );
    screenData.bufferCanvas.width = screenData.canvas.width;
    screenData.bufferCanvas.height = screenData.canvas.height;
    screenData.width = screenData.canvas.width;
    screenData.height = screenData.canvas.height;
    const toSize = {
      "width": screenData.canvas.offsetWidth,
      "height": screenData.canvas.offsetHeight
    };
    if (screenData.resizeCallback) {
      if (fromSize.width !== toSize.width || fromSize.height !== toSize.height) {
        screenData.resizeCallback(screenData.api, fromSize, toSize);
      }
    }
    screenData.previousOffsetSize = toSize;
  }

  // src-pi-2.0.0-alpha.1/core/renderer.js
  var m_pens = {};
  var m_blends = {};
  function init3() {
    addPen("pixel", penSetPixel, "square");
    addPen("square", penSquare, "square");
    addPen("circle", penCircle, "round");
    addBlend("replace", blendReplace);
    addBlend("alpha", blendAlpha);
    addScreenDataItem("imageData", null);
    addScreenDataItem("imageData2", null);
    addScreenDataItem("isDirty", false);
    addScreenDataItem("penData", { "cap": "square", "size": 1 });
    addScreenDataItem("blendData", { "noise": null });
    addScreenDataItem("isAutoRender", true);
    addScreenDataItem("autoRenderMicrotaskScheduled", false);
    addScreenInternalCommands("pen", m_pens["pixel"].fn);
    addScreenInternalCommands("blend", m_blends["replace"].fn);
    addScreenInternalCommands("blendColor", blendGetColorNoNoise);
  }
  function getImageData(screenData) {
    if (screenData.isDirty === false || screenData.imageData === null) {
      screenData.imageData = screenData.context.getImageData(
        0,
        0,
        screenData.width,
        screenData.height
      );
      screenData.imageData2 = screenData.imageData.data;
    }
  }
  function setImageDirty(screenData) {
    if (screenData.isDirty === false) {
      screenData.isDirty = true;
      if (screenData.isAutoRender && !screenData.autoRenderMicrotaskScheduled) {
        screenData.autoRenderMicrotaskScheduled = true;
        queueMicrotask(function() {
          if (screenData.isAutoRender) {
            screenData.api.render();
          }
          screenData.autoRenderMicrotaskScheduled = false;
        });
      }
    }
  }
  addCommand2("render", render, []);
  function render(screenData) {
    if (screenData.imageData && screenData.isDirty) {
      screenData.context.putImageData(screenData.imageData, 0, 0);
    }
    screenData.isDirty = false;
  }
  addCommand2("cls", cls, ["x", "y", "width", "height"]);
  function cls(screenData, options) {
    const x = getInt(options.x, 0);
    const y = getInt(options.y, 0);
    const width2 = getInt(options.width, screenData.width);
    const height2 = getInt(options.height, screenData.height);
    if (x !== 0 || y !== 0 || width2 !== screenData.width || height2 !== screenData.height) {
      screenData.api.render();
      screenData.context.clearRect(x, y, width2, height2);
    } else {
      screenData.context.clearRect(x, y, width2, height2);
      screenData.imageData = null;
      screenData.isDirty = false;
      screenData.printCursor.x = 0;
      screenData.printCursor.y = 0;
      screenData.cursor.x = 0;
      screenData.cursor.y = 0;
    }
  }
  addCommand2("setAutoRender", setAutoRender, ["isAutoRender"]);
  function setAutoRender(screenData, options) {
    const isAutoRender = !!options.isAutoRender;
    screenData.isAutoRender = isAutoRender;
    if (isAutoRender) {
      screenData.api.render();
    }
  }
  addCommand2("setPen", setPen, ["pen", "size"]);
  function setPen(screenData, options) {
    const pen = options.pen;
    let size = getFloat(options.size, null);
    if (!m_pens[pen]) {
      const error = new TypeError(
        `setPen: parameter pen is not a valid pen.`
      );
      error.code = "INVALID_PEN";
      throw error;
    }
    if (size === null) {
      const error = new TypeError("setPen: parameter size must be a number");
      error.code = "INVALID_SIZE";
      throw error;
    }
    if (pen === "pixel") {
      size = 1;
    }
    if (size < 1) {
      size = 1;
    }
    if (size === 1) {
      screenData.pen = m_pens["pixel"].fn;
      screenData.context.lineWidth = 1;
    } else {
      screenData.pen = m_pens[pen].fn;
      screenData.context.lineWidth = size;
    }
    screenData.penData.size = size;
    screenData.penData.cap = m_pens[pen].cap;
    screenData.context.lineCap = m_pens[pen].cap;
  }
  addCommand2("setBlend", setBlend, ["mode", "noise"]);
  function setBlend(screenData, options) {
    const mode = options.mode;
    let noise = options.noise;
    if (!m_blends[mode]) {
      const error = new TypeError(
        `setBlend: Argument blend is not a valid blend mode.`
      );
      error.code = "INVALID_BLEND_MODE";
      throw error;
    }
    if (Array.isArray(noise)) {
      for (let i = 0; i < noise.length; i++) {
        if (isNaN(noise[i])) {
          const error = new TypeError(
            "setBlend: parameter noise array contains an invalid value"
          );
          error.code = "INVALID_NOISE_VALUE";
          throw error;
        }
      }
      screenData.blendColor = blendGetColorNoise;
      screenData.blendData.noise = noise;
    } else {
      noise = getInt(noise, null);
      if (noise === null) {
        screenData.blendColor = blendGetColorNoNoise;
        screenData.blendData.noise = null;
      } else {
        screenData.blendColor = blendGetColorNoise;
        screenData.blendData.noise = clamp(noise, 0, 255);
      }
    }
    screenData.blend = m_blends[mode].fn;
  }
  function addPen(name, fn, cap) {
    m_pens[name] = { fn, cap, "size": 1 };
  }
  function addBlend(name, fn) {
    m_blends[name] = { fn };
  }
  function blendGetColorNoNoise(screenData, c) {
    return c;
  }
  function blendGetColorNoise(screenData, c) {
    const noise = screenData.blendData.noise;
    const c2 = { "r": c.r, "g": c.g, "b": c.b, "a": c.a };
    const half = noise / 2;
    if (Array.isArray(noise)) {
      c2.r = clamp(
        Math.round(c2.r + rndRange(-noise[0], noise[0])),
        0,
        255
      );
      c2.g = clamp(
        Math.round(c2.g + rndRange(-noise[1], noise[1])),
        0,
        255
      );
      c2.b = clamp(
        Math.round(c2.b + rndRange(-noise[2], noise[2])),
        0,
        255
      );
      c2.a = clamp(
        c2.a + rndRange(-noise[3], noise[3]),
        0,
        255
      );
    } else {
      const change = Math.round(Math.random() * noise - half);
      c2.r = clamp(c2.r + change, 0, 255);
      c2.g = clamp(c2.g + change, 0, 255);
      c2.b = clamp(c2.b + change, 0, 255);
    }
    return c2;
  }
  function blendReplace(screenData, x, y, c) {
    c = screenData.blendColor(screenData, c);
    const data = screenData.imageData2;
    const i = (screenData.width * y + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = c.a;
  }
  function blendAlpha(screenData, x, y, c) {
    c = screenData.blendColor(screenData, c);
    const data = screenData.imageData2;
    const i = (screenData.width * y + x) * 4;
    const srcA = c.a / 255;
    const dstA = data[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    data[i] = Math.round((c.r * srcA + data[i] * dstA * (1 - srcA)) / outA);
    data[i + 1] = Math.round((c.g * srcA + data[i + 1] * dstA * (1 - srcA)) / outA);
    data[i + 2] = Math.round((c.b * srcA + data[i + 2] * dstA * (1 - srcA)) / outA);
    data[i + 3] = Math.round(outA * 255);
  }
  function penSetPixel(screenData, x, y, c) {
    if (x < 0 || x >= screenData.width || y < 0 || y >= screenData.height) {
      return;
    }
    screenData.blend(screenData, x, y, c);
  }
  function penSquare(screenData, x, y, c) {
    const size = Math.round(screenData.penData.size) | 1;
    const offset = Math.round(size / 2) - 1;
    const startX = clamp(x - offset, 0, screenData.width);
    const endX = clamp(x - offset + size, 0, screenData.width);
    const startY = clamp(y - offset, 0, screenData.height);
    const endY = clamp(y - offset + size, 0, screenData.height);
    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        screenData.blend(screenData, px, py, c);
      }
    }
  }
  function penCircle(screenData, x, y, c) {
    const baseSize = Math.round(screenData.penData.size);
    if (baseSize === 2) {
      if (x >= 0 && x < screenData.width && y >= 0 && y < screenData.height) {
        screenData.blend(screenData, x, y, c);
      }
      if (x + 1 >= 0 && x + 1 < screenData.width && y >= 0 && y < screenData.height) {
        screenData.blend(screenData, x + 1, y, c);
      }
      if (x - 1 >= 0 && x - 1 < screenData.width && y >= 0 && y < screenData.height) {
        screenData.blend(screenData, x - 1, y, c);
      }
      if (x >= 0 && x < screenData.width && y + 1 >= 0 && y + 1 < screenData.height) {
        screenData.blend(screenData, x, y + 1, c);
      }
      if (x >= 0 && x < screenData.width && y - 1 >= 0 && y - 1 < screenData.height) {
        screenData.blend(screenData, x, y - 1, c);
      }
      return;
    }
    const diameter = baseSize * 2;
    const half = baseSize;
    const offset = half - 1;
    const radiusThresholdSq = (half - 0.5) * (half - 0.5);
    const startX = clamp(x - offset, 0, screenData.width);
    const endX = clamp(x - offset + diameter, 0, screenData.width);
    const startY = clamp(y - offset, 0, screenData.height);
    const endY = clamp(y - offset + diameter, 0, screenData.height);
    for (let py = startY; py < endY; py++) {
      const dy = py - y;
      for (let px = startX; px < endX; px++) {
        const dx = px - x;
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusThresholdSq) {
          screenData.blend(screenData, px, py, c);
        }
      }
    }
  }

  // src-pi-2.0.0-alpha.1/core/colors.js
  var m_defaultPal = [];
  var m_defaultPalMap = /* @__PURE__ */ new Map();
  var m_defaultColor = -1;
  function init4() {
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
  }
  addCommand("setDefaultPal", setDefaultPal, ["pal"]);
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
  addCommand("setDefaultColor", setDefaultColor, ["color"]);
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
  addCommand2("setColor", setColor, ["color", "isAddToPalette"]);
  function setColor(screenData, options) {
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
    screenData.color = colorValue;
    screenData.context.fillStyle = screenData.color.hex;
    screenData.context.strokeStyle = screenData.color.hex;
    return true;
  }
  addCommand2("getPalIndex", getPalIndex, ["color", "tolerance"]);
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
  addCommand2("setBgColor", setBgColor, ["color"]);
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
      const error = new TypeError("bgColor: invalid color value for parameter color.");
      error.code = "INVALID_COLOR";
      throw error;
    }
  }
  addCommand2("setContainerBgColor", setContainerBgColor, ["color"]);
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
          "containerBgColor: invalid color value for parameter color."
        );
        error.code = "INVALID_COLOR";
        throw error;
      }
    }
  }
  addCommand2("setPalColor", setPalColor, ["index", "color"]);
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
      screenData.context.fillStyle = colorValue.hex;
      screenData.context.strokeStyle = colorValue.hex;
    }
    screenData.pal[index] = colorValue;
    screenData.palMap.delete(oldColor.key);
    screenData.palMap.set(colorValue.key, index);
  }
  addCommand2("getPal", getPal, []);
  function getPal(screenData) {
    const filteredPal = [];
    for (let i = 1; i < screenData.pal.length; i += 1) {
      filteredPal.push({ ...screenData.pal[i] });
    }
    return filteredPal;
  }
  addCommand2("getPalInternal", getPalInternal, []);
  function getPalInternal(screenData) {
    const filteredPal = [];
    for (let i = 0; i < screenData.pal.length; i += 1) {
      filteredPal.push({ ...screenData.pal[i] });
    }
    return filteredPal;
  }
  addCommand2("setPal", setPal, ["pal"]);
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
      screenData.context.fillStyle = screenData.color.hex;
      screenData.context.strokeStyle = screenData.color.hex;
    } else {
      screenData.color = newPal[1];
      screenData.context.fillStyle = screenData.color.hex;
      screenData.context.strokeStyle = screenData.color.hex;
    }
  }
  addCommand2("replaceColors", replaceColors, ["findColors", "newColors"]);
  function replaceColors(screenData, options) {
    let findColors = options.findColors;
    const newColors = options.newColors;
    if (!Array.isArray(findColors) || !Array.isArray(newColors)) {
      const error = new TypeError("replaceColors: Parameter findColors is must be an array.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (findColors.length > newColors.length) {
      let newArray = [];
      for (let i = 0; i < newColors.length; i += 1) {
        newArray.push(findColors[i]);
      }
      findColors = newArray;
    }
    let findKeys = {};
    for (let i = 0; i < findColors.length; i += 1) {
      const findColor = getColorValueByRawInput(screenData, findColors[i]);
      if (findColor === null) {
        console.warn(
          `replaceColors: Invalid color value inside array findColors at index: ${i}.`
        );
        continue;
      }
      let newColor = getColorValueByRawInput(screenData, newColors[i]);
      if (newColor === null) {
        console.warn(
          `replaceColors: Invalid color value inside array newColors at index: ${i}.`
        );
        continue;
      }
      findKeys[findColor.key] = newColor;
    }
    if (Object.keys(findKeys).length === 0) {
      const error = new TypeError("replaceColors: No valid find and new colors found.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    getImageData(screenData);
    const data = screenData.imageData2;
    for (let y = 0; y < screenData.height; y++) {
      for (let x = 0; x < screenData.width; x++) {
        const i = (screenData.width * y + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const colorKey = generateColorKey(r, g, b, a);
        if (findKeys[colorKey]) {
          data[i] = findKeys[colorKey].r;
          data[i + 1] = findKeys[colorKey].g;
          data[i + 2] = findKeys[colorKey].b;
          data[i + 3] = findKeys[colorKey].a;
        }
      }
    }
    setImageDirty(screenData);
  }
  addCommand2("replacePalColors", replacePalColors, ["findColors", "newColors"]);
  function replacePalColors(screenData, options) {
    let findColors = options.findColors;
    const newColors = options.newColors;
    if (!Array.isArray(findColors) || !Array.isArray(newColors)) {
      const error = new TypeError(
        "replacePalColors: Parameter findColors is must be an array."
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (findColors.length > newColors.length) {
      let newArray = [];
      for (let i = 0; i < newColors.length; i += 1) {
        newArray.push(findColors[i]);
      }
      findColors = newArray;
    }
    let findKeys = {};
    for (let i = 0; i < findColors.length; i += 1) {
      let findColorValue = null;
      if (Number.isInteger(findColors[i]) && findColors[i] < screenData.pal.length) {
        findColorValue = screenData.pal[findColors[i]];
      }
      if (findColorValue === null) {
        findColorValue = convertToColor(findColors[i]);
        if (findColorIndexByColorValue(screenData, findColorValue) === null) {
          continue;
        }
      }
      let newColorValue = null;
      if (Number.isInteger(newColors[i]) && newColors[i] < screenData.pal.length) {
        newColorValue = screenData.pal[newColors[i]];
      }
      if (newColorValue === null) {
        newColorValue = convertToColor(newColors[i]);
      }
      if (newColorValue === null) {
        console.warn(
          `replacePalColors: Invalid color value inside array newColors at index: ${i}.`
        );
        continue;
      }
      findKeys[findColorValue.key] = newColorValue;
    }
    if (Object.keys(findKeys).length === 0) {
      return;
    }
    getImageData(screenData);
    const data = screenData.imageData2;
    for (let y = 0; y < screenData.height; y++) {
      for (let x = 0; x < screenData.width; x++) {
        const i = (screenData.width * y + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const colorKey = generateColorKey(r, g, b, a);
        if (findKeys[colorKey]) {
          data[i] = findKeys[colorKey].r;
          data[i + 1] = findKeys[colorKey].g;
          data[i + 2] = findKeys[colorKey].b;
          data[i + 3] = findKeys[colorKey].a;
        }
      }
    }
    for (let i = 0; i < screenData.pal.length; i += 1) {
      const colorKey = screenData.pal[i].key;
      if (findKeys[colorKey]) {
        screenData.pal[i] = findKeys[colorKey];
      }
    }
    screenData.palMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < screenData.pal.length; i += 1) {
      screenData.palMap.set(screenData.pal[i].key, i);
    }
    setImageDirty(screenData);
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
    tolerance = tolerance * (2 - tolerance) * maxDifference;
    for (let i = 0; i < screenData.pal.length; i++) {
      if (screenData.pal[i].key === color.key) {
        return i;
      } else {
        let difference;
        if (i === 0) {
          difference = calcColorDifference(
            screenData.pal[i],
            color,
            [0.2, 0.2, 0.2, 0.4]
          );
        } else {
          difference = calcColorDifference(screenData.pal[i], color);
        }
        const similarity = maxDifference - difference;
        if (similarity >= tolerance) {
          return i;
        }
      }
    }
    return null;
  }

  // src-pi-2.0.0-alpha.1/modules/keyboard.js
  var INPUT_TAGS = /* @__PURE__ */ new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
  var CURSOR_BLINK = 500;
  var m_inCodes = {};
  var m_inKeys = {};
  var m_actionKeys = /* @__PURE__ */ new Set();
  var m_onKeyHandlers = {};
  var m_inputData = null;
  var m_isKeyboardActive = false;
  function init5() {
    startKeyboard();
    window.addEventListener("blur", clearInKeys);
  }
  function clearKeyboardEvents() {
    for (const mode in m_onKeyHandlers) {
      delete m_onKeyHandlers[mode];
    }
  }
  addCommand("startKeyboard", startKeyboard, []);
  function startKeyboard() {
    if (m_isKeyboardActive) {
      return;
    }
    window.addEventListener("keydown", onKeyDown, { "capture": true });
    window.addEventListener("keyup", onKeyUp, { "capture": true });
    m_isKeyboardActive = true;
    if (document.activeElement) {
      document.activeElement.blur();
    }
  }
  addCommand("stopKeyboard", stopKeyboard, []);
  function stopKeyboard() {
    if (!m_isKeyboardActive) {
      return;
    }
    window.removeEventListener("keydown", onKeyDown, { "capture": true });
    window.removeEventListener("keyup", onKeyUp, { "capture": true });
    m_isKeyboardActive = false;
    clearInKeys();
  }
  addCommand("inkey", inkey, ["key"]);
  function inkey(options) {
    const key = options.key;
    if (key) {
      if (typeof key !== "string") {
        const error = new TypeError("inkey: key must be a string.");
        error.code = "INVALID_PARAMETERS";
        throw error;
      }
      if (m_inCodes[key]) {
        return m_inCodes[key];
      }
      if (m_inKeys[key]) {
        return m_inKeys[key];
      }
      return null;
    }
    const keyCodes = [];
    for (const code in m_inCodes) {
      if (m_inCodes[code]) {
        keyCodes.push(m_inCodes[code]);
      }
    }
    return keyCodes;
  }
  addCommand("setActionKeys", setActionKeys, ["keys"]);
  function setActionKeys(options) {
    const keys = options.keys;
    if (!Array.isArray(keys)) {
      const error = new TypeError("setActionKeys: keys must be an array.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    for (const key of keys) {
      m_actionKeys.add(key);
    }
  }
  addCommand("removeActionKeys", removeActionKeys, ["keys"]);
  function removeActionKeys(options) {
    const keys = options.keys;
    if (!Array.isArray(keys)) {
      const error = new TypeError("removeActionKeys: keys must be an array.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    for (const key of keys) {
      m_actionKeys.delete(key);
    }
  }
  addCommand("onkey", onkey, ["key", "mode", "fn", "once", "allowRepeat"]);
  function onkey(options) {
    const key = options.key;
    const mode = options.mode;
    const fn = options.fn;
    const once = !!options.once;
    const allowRepeat = !!options.allowRepeat;
    if (!key || typeof key !== "string" && !Array.isArray(key)) {
      const error = new TypeError("onkey: key must be a string or an array of strings.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    if (!mode || typeof mode !== "string") {
      const error = new TypeError("onkey: mode must be a string with value of up or down.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    if (typeof fn !== "function") {
      const error = new TypeError("onkey: fn must be a function.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    const combo = typeof key === "string" ? [key] : key;
    const handler = {
      "comboKey": combo.sort().join(""),
      "combo": combo,
      "mode": mode,
      "fn": fn,
      "once": once,
      "allowRepeat": allowRepeat,
      "isRemoved": false
    };
    for (const key2 of combo) {
      if (!m_onKeyHandlers[key2]) {
        m_onKeyHandlers[key2] = [];
      }
      m_onKeyHandlers[key2].push(handler);
    }
  }
  addCommand("offkey", offkey, ["key", "mode", "fn", "once", "allowRepeat"]);
  function offkey(options) {
    const key = options.key;
    const mode = options.mode;
    const fn = options.fn;
    const once = !!options.once;
    const allowRepeat = !!options.allowRepeat;
    if (!key || typeof key !== "string" && !Array.isArray(key)) {
      const error = new TypeError("offkey: key must be a string or an array of strings.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    if (typeof fn !== "function") {
      const error = new TypeError("offkey: callback must be a function.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    const combo = typeof key === "string" ? [key] : key;
    const comboKey = combo.sort().join("");
    for (const key2 of combo) {
      const handlers = m_onKeyHandlers[key2];
      if (!handlers) {
        continue;
      }
      const toRemove = [];
      for (let i = 0; i < handlers.length; i += 1) {
        const handler = handlers[i];
        if (handler.comboKey === comboKey && handler.mode === mode && handler.fn === fn && handler.once === once && handler.allowRepeat === allowRepeat) {
          toRemove.push(i);
          handler.isRemoved = true;
        }
      }
      for (let i = toRemove.length - 1; i >= 0; i -= 1) {
        handlers.splice(toRemove[i], 1);
      }
      if (handlers.length === 0) {
        delete m_onKeyHandlers[key2];
      }
    }
  }
  addCommand2(
    "input",
    input,
    ["prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative"]
  );
  function input(screenData, options) {
    const prompt = options.prompt;
    const fn = options.fn;
    const cursor = options.cursor ? options.cursor : String.fromCharCode(219);
    const isNumber = !!options.isNumber;
    const isInteger = !!options.isInteger;
    const allowNegative = !!options.allowNegative;
    if (typeof prompt !== "string") {
      const error = new TypeError("input: prompt must be a string");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    if (fn && typeof fn !== "function") {
      const error = new TypeError("input: fn must be a function.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    if (typeof cursor !== "string") {
      const error = new TypeError("input: cursor must be a string");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    let resolvePromise, rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    if (m_inputData) {
      finishInput(true);
    }
    m_inputData = {
      "screenData": screenData,
      "prompt": prompt,
      "cursor": cursor,
      "lastCursorBlink": Date.now(),
      "showCursor": true,
      "isNumber": isNumber,
      "isInteger": isInteger,
      "allowNegative": allowNegative,
      "val": "",
      "fn": fn,
      "resolve": resolvePromise,
      "reject": rejectPromise
    };
    startInput();
    return promise;
  }
  addCommand2("cancelInput", cancelInput, []);
  function cancelInput(screenData) {
    if (m_inputData) {
      finishInput(true);
    }
  }
  function onKeyDown(event) {
    if (isFromEditableTarget(event)) {
      clearInKeys();
      return;
    }
    const keyData = {
      "code": event.code,
      "key": event.key,
      "location": event.location,
      "altKey": event.altKey,
      "ctrlKey": event.ctrlKey,
      "metaKey": event.metaKey,
      "shiftKey": event.shiftKey,
      "repeat": event.repeat
    };
    m_inCodes[event.code] = keyData;
    m_inKeys[event.key] = keyData;
    triggerKeyEventHandlers(event, "down", event.code);
    triggerKeyEventHandlers(event, "down", event.key);
    triggerKeyEventHandlers(event, "down", "any");
    if (m_actionKeys.has(event.code) || m_actionKeys.has(event.key)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    if (isFromEditableTarget(event)) {
      clearInKeys();
      return;
    }
    triggerKeyEventHandlers(event, "up", event.code);
    triggerKeyEventHandlers(event, "up", event.key);
    triggerKeyEventHandlers(event, "up", "any");
    delete m_inCodes[event.code];
    delete m_inKeys[event.key];
    if (m_actionKeys.has(event.code) || m_actionKeys.has(event.key)) {
      event.preventDefault();
    }
  }
  function triggerKeyEventHandlers(event, mode, keyOrCode) {
    const handlers = m_onKeyHandlers[keyOrCode];
    if (!handlers) {
      return;
    }
    const isAnyKey = keyOrCode === "any";
    const handlersCopy = handlers.slice();
    const toRemove = /* @__PURE__ */ new Set();
    for (let i = 0; i < handlersCopy.length; i += 1) {
      const handler = handlersCopy[i];
      if (handler.mode !== mode) {
        continue;
      }
      if (event.repeat && !handler.allowRepeat) {
        continue;
      }
      if (handler.isRemoved) {
        continue;
      }
      if (isAnyKey) {
        let keyData = m_inCodes[event.code];
        if (!keyData) {
          keyData = m_inKeys[event.key];
        }
        if (keyData !== void 0) {
          handler.fn(keyData);
        }
        if (handler.once) {
          toRemove.add(handler);
          handler.isRemoved = true;
        }
        continue;
      }
      const isAllKeysPressed = handler.combo.every((key) => m_inKeys[key] || m_inCodes[key]);
      if (isAllKeysPressed) {
        const comboData = handler.combo.map((key) => {
          if (m_inKeys[key]) {
            return m_inKeys[key];
          }
          return m_inCodes[key];
        });
        if (comboData.length === 1) {
          handler.fn(comboData[0]);
        } else {
          handler.fn(comboData);
        }
        if (handler.once) {
          toRemove.add(handler);
          handler.isRemoved = true;
        }
      }
    }
    if (toRemove.size > 0) {
      m_onKeyHandlers[keyOrCode] = handlers.filter((h) => !toRemove.has(h));
      if (m_onKeyHandlers[keyOrCode].length === 0) {
        delete m_onKeyHandlers[keyOrCode];
      }
    }
  }
  function isFromEditableTarget(event) {
    const element = event.target;
    if (!element) {
      return false;
    }
    if (INPUT_TAGS.has(element.tagName)) {
      return true;
    }
    if (element.isContentEditable) {
      return true;
    }
    const role = element.getAttribute && element.getAttribute("role");
    if (role === "textbox" || role === "searchbox") {
      return true;
    }
    return false;
  }
  function clearInKeys() {
    for (const code in m_inCodes) {
      delete m_inCodes[code];
    }
    for (const key in m_inKeys) {
      delete m_inKeys[key];
    }
  }
  function startInput() {
    const screenData = m_inputData.screenData;
    const backCanvas = document.createElement("canvas");
    backCanvas.width = screenData.width;
    backCanvas.height = screenData.height;
    const backContext = backCanvas.getContext("2d");
    screenData.api.render();
    backContext.drawImage(screenData.canvas, 0, 0);
    m_inputData.backCanvas = backCanvas;
    m_inputData.backContext = backContext;
    getApi().onkey("any", "down", onInputKeyDown);
    m_inputData.interval = setInterval(showPrompt, 100);
  }
  function onInputKeyDown(keyData) {
    if (keyData.key === "Enter") {
      finishInput();
      return;
    } else if (keyData.key === "Escape") {
      finishInput(true);
      return;
    } else if (keyData.key === "Backspace") {
      if (m_inputData.val.length > 0) {
        m_inputData.val = m_inputData.val.substring(0, m_inputData.val.length - 1);
      }
    } else if (keyData.key && keyData.key.length === 1) {
      let inputHandled = false;
      if (m_inputData.isNumber && m_inputData.allowNegative) {
        if (keyData.key === "-") {
          if (m_inputData.val.charAt(0) !== "-") {
            m_inputData.val = "-" + m_inputData.val;
          }
          inputHandled = true;
        } else if (keyData.key === "+" && m_inputData.val.charAt(0) === "-") {
          m_inputData.val = m_inputData.val.substring(1);
          inputHandled = true;
        }
      }
      if (!inputHandled) {
        m_inputData.val += keyData.key;
        if (m_inputData.isNumber && isNaN(Number(m_inputData.val)) || m_inputData.isInteger && !Number.isInteger(Number(m_inputData.val))) {
          m_inputData.val = m_inputData.val.substring(0, m_inputData.val.length - 1);
        }
      }
    }
  }
  function showPrompt(hideCursorOverride) {
    const screenData = m_inputData.screenData;
    let msg = m_inputData.prompt + m_inputData.val;
    if (!hideCursorOverride) {
      const now = Date.now();
      if (now - m_inputData.lastCursorBlink > CURSOR_BLINK) {
        m_inputData.lastCursorBlink = now;
        m_inputData.showCursor = !m_inputData.showCursor;
      }
      if (m_inputData.showCursor) {
        msg += m_inputData.cursor;
      }
    }
    let pos = screenData.api.getPos();
    if (pos.row >= screenData.api.getRows()) {
      screenData.api.print("");
      screenData.api.setPos(pos.col, pos.row - 1);
      pos = screenData.api.getPos(screenData);
    }
    const posPx = screenData.api.getPosPx(screenData);
    const width2 = (msg.length + 1) * screenData.font.width;
    const height2 = screenData.font.height;
    screenData.context.clearRect(posPx.x, posPx.y, width2, height2);
    screenData.context.drawImage(
      m_inputData.backCanvas,
      posPx.x,
      posPx.y,
      width2,
      height2,
      posPx.x,
      posPx.y,
      width2,
      height2
    );
    screenData.imageData = null;
    screenData.api.print(msg, true);
    screenData.api.setPos(pos.col, pos.row);
  }
  function finishInput(isCancel) {
    const screenData = m_inputData.screenData;
    getApi().offkey("any", "down", onInputKeyDown);
    showPrompt(true);
    screenData.printCursor.y += screenData.font.height;
    clearInterval(m_inputData.interval);
    let val = m_inputData.val;
    if (m_inputData.isNumber) {
      if (val === "" || val === "-") {
        val = 0;
      } else {
        val = Number(val);
        if (m_inputData.isInteger) {
          val = Math.floor(val);
        }
      }
    }
    const tempInputData = m_inputData;
    m_inputData = null;
    if (isCancel) {
      tempInputData.reject(val);
    } else {
      tempInputData.resolve(val);
      if (tempInputData.fn) {
        tempInputData.fn(val);
      }
    }
  }

  // src-pi-2.0.0-alpha.1/modules/mouse.js
  function init6() {
    addScreenDataItem("mouseStarted", false);
    addScreenDataItem("mouse", null);
    addScreenDataItem("lastEvent", null);
    addScreenDataItem("isContextMenuEnabled", false);
    addScreenDataItem("mouseEventListenersActive", 0);
    addScreenDataItem("onMouseEventListeners", {
      "down": [],
      "up": [],
      "move": []
    });
    addScreenInitFunction(initMouseData);
    window.addEventListener("blur", onWindowBlur);
  }
  function clearMouseEvents(screenData) {
    screenData.onMouseEventListeners = {
      "down": [],
      "up": [],
      "move": []
    };
    screenData.mouseEventListenersActive = 0;
  }
  function initMouseData(screenData) {
    screenData.mouse = {
      "x": Math.floor(screenData.width / 2),
      "y": Math.floor(screenData.height / 2),
      "lastX": Math.floor(screenData.width / 2),
      "lastY": Math.floor(screenData.height / 2),
      "buttons": 0,
      "action": "none"
    };
  }
  addCommand2("startMouse", startMouse, []);
  function startMouse(screenData) {
    if (!screenData.mouseStarted) {
      screenData.canvas.addEventListener("mousemove", mouseMove);
      screenData.canvas.addEventListener("mousedown", mouseDown);
      screenData.canvas.addEventListener("mouseup", mouseUp);
      screenData.canvas.addEventListener("contextmenu", onContextMenu);
      screenData.mouseStarted = true;
    }
  }
  addCommand2("stopMouse", stopMouse, []);
  function stopMouse(screenData) {
    if (screenData.mouseStarted) {
      screenData.canvas.removeEventListener("mousemove", mouseMove);
      screenData.canvas.removeEventListener("mousedown", mouseDown);
      screenData.canvas.removeEventListener("mouseup", mouseUp);
      screenData.canvas.removeEventListener("contextmenu", onContextMenu);
      screenData.mouseStarted = false;
    }
  }
  addCommand2("getMouse", getMouse, []);
  function getMouse(screenData) {
    const mouse = {};
    mouse.x = screenData.mouse.x;
    mouse.y = screenData.mouse.y;
    mouse.lastX = screenData.mouse.lastX;
    mouse.lastY = screenData.mouse.lastY;
    mouse.buttons = screenData.mouse.buttons;
    mouse.action = screenData.mouse.action;
    mouse.type = "mouse";
    return mouse;
  }
  addCommand2("inmouse", inmouse, []);
  function inmouse(screenData) {
    startMouse(screenData);
    return getMouse(screenData);
  }
  addCommand2("setEnableContextMenu", setEnableContextMenu, ["isEnabled"]);
  function setEnableContextMenu(screenData, options) {
    screenData.isContextMenuEnabled = !!options.isEnabled;
    startMouse(screenData);
  }
  addCommand2("onmouse", onmouse, ["mode", "fn", "once", "hitBox", "customData"]);
  function onmouse(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    const once = options.once;
    const hitBox = options.hitBox;
    const customData = options.customData;
    const isValid = onevent(
      mode,
      fn,
      once,
      hitBox,
      ["down", "up", "move"],
      "onmouse",
      screenData.onMouseEventListeners,
      null,
      null,
      customData
    );
    if (isValid) {
      startMouse(screenData);
      screenData.mouseEventListenersActive += 1;
    }
  }
  addCommand2("offmouse", offmouse, ["mode", "fn"]);
  function offmouse(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    const isValid = offevent(
      mode,
      fn,
      ["down", "up", "move"],
      "offmouse",
      screenData.onMouseEventListeners
    );
    if (isValid) {
      if (fn == null) {
        screenData.mouseEventListenersActive = 0;
      } else {
        screenData.mouseEventListenersActive -= 1;
        if (screenData.mouseEventListenersActive < 0) {
          screenData.mouseEventListenersActive = 0;
        }
      }
    }
  }
  function mouseMove(e) {
    const screenData = getScreenDataFromEvent(e);
    if (!screenData) {
      return;
    }
    updateMouse(screenData, e, "move");
    const mouseData = getMouse(screenData);
    if (screenData.mouseEventListenersActive > 0) {
      triggerEventListeners("move", mouseData, screenData.onMouseEventListeners);
    }
    if (screenData.triggerPressListeners) {
      screenData.triggerPressListeners(screenData, "move", mouseData);
    }
  }
  function mouseDown(e) {
    const screenData = getScreenDataFromEvent(e);
    if (!screenData) {
      return;
    }
    updateMouse(screenData, e, "down");
    const mouseData = getMouse(screenData);
    if (screenData.mouseEventListenersActive > 0) {
      triggerEventListeners("down", mouseData, screenData.onMouseEventListeners);
    }
    if (screenData.triggerPressListeners) {
      screenData.triggerPressListeners(screenData, "down", mouseData);
    }
    if (screenData.triggerClickListeners) {
      screenData.triggerClickListeners(screenData, mouseData, "down");
    }
  }
  function mouseUp(e) {
    const screenData = getScreenDataFromEvent(e);
    if (!screenData) {
      return;
    }
    updateMouse(screenData, e, "up");
    const mouseData = getMouse(screenData);
    if (screenData.mouseEventListenersActive > 0) {
      triggerEventListeners("up", mouseData, screenData.onMouseEventListeners);
    }
    if (screenData.triggerPressListeners) {
      screenData.triggerPressListeners(screenData, "up", mouseData);
    }
    if (screenData.triggerClickListeners) {
      screenData.triggerClickListeners(screenData, mouseData, "up");
    }
  }
  function onContextMenu(e) {
    const screenData = getScreenDataFromEvent(e);
    if (!screenData) {
      return;
    }
    if (!screenData.isContextMenuEnabled) {
      e.preventDefault();
      return false;
    }
  }
  function updateMouse(screenData, e, action) {
    const rect2 = screenData.clientRect;
    const x = Math.floor(
      e.offsetX / rect2.width * screenData.width
    );
    const y = Math.floor(
      e.offsetY / rect2.height * screenData.height
    );
    let lastX = x;
    let lastY = y;
    if (screenData.mouse) {
      if (screenData.mouse.x !== void 0) {
        lastX = screenData.mouse.x;
      }
      if (screenData.mouse.y !== void 0) {
        lastY = screenData.mouse.y;
      }
    }
    screenData.mouse = {
      "x": x,
      "y": y,
      "lastX": lastX,
      "lastY": lastY,
      "buttons": e.buttons,
      "action": action
    };
    screenData.lastEvent = "mouse";
  }
  function getScreenDataFromEvent(e) {
    const screenId = e.target.dataset?.screenId;
    if (screenId === void 0) {
      return null;
    }
    const activeScreen = getActiveScreen();
    if (activeScreen && activeScreen.id === parseInt(screenId)) {
      return activeScreen;
    }
    return null;
  }
  function onWindowBlur() {
    const activeScreen = getActiveScreen();
    if (activeScreen && activeScreen.mouse) {
      activeScreen.mouse.buttons = 0;
      activeScreen.mouse.action = "up";
    }
  }

  // src-pi-2.0.0-alpha.1/modules/touch.js
  var m_isTouchScreen = false;
  function init7() {
    addScreenDataItem("touchStarted", false);
    addScreenDataItem("touches", {});
    addScreenDataItem("lastTouches", {});
    addScreenDataItem("touchEventListenersActive", 0);
    addScreenDataItem("onTouchEventListeners", {});
    addScreenInitFunction(initTouchData);
    window.addEventListener("blur", onWindowBlur2);
  }
  function clearTouchEvents(screenData) {
    screenData.onTouchEventListeners = {};
    screenData.touchEventListenersActive = 0;
  }
  function initTouchData(screenData) {
    screenData.onTouchEventListeners = {
      "start": [],
      "end": [],
      "move": []
    };
  }
  addCommand2("startTouch", startTouch, []);
  function startTouch(screenData) {
    if (!screenData.touchStarted) {
      const options = { "passive": false };
      screenData.canvas.addEventListener("touchstart", touchStart, options);
      screenData.canvas.addEventListener("touchmove", touchMove, options);
      screenData.canvas.addEventListener("touchend", touchEnd, options);
      screenData.canvas.addEventListener("touchcancel", touchEnd, options);
      screenData.touchStarted = true;
    }
  }
  addCommand2("stopTouch", stopTouch, []);
  function stopTouch(screenData) {
    if (screenData.touchStarted) {
      screenData.canvas.removeEventListener("touchstart", touchStart);
      screenData.canvas.removeEventListener("touchmove", touchMove);
      screenData.canvas.removeEventListener("touchend", touchEnd);
      screenData.canvas.removeEventListener("touchcancel", touchEnd);
      screenData.touchStarted = false;
    }
  }
  addCommand2("intouch", intouch, []);
  function intouch(screenData) {
    startTouch(screenData);
    return getTouch(screenData);
  }
  addCommand2("ontouch", ontouch, ["mode", "fn", "once", "hitBox", "customData"]);
  function ontouch(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    const once = options.once;
    const hitBox = options.hitBox;
    const customData = options.customData;
    const isValid = onevent(
      mode,
      fn,
      once,
      hitBox,
      ["start", "end", "move"],
      "ontouch",
      screenData.onTouchEventListeners,
      null,
      null,
      customData
    );
    if (isValid) {
      startTouch(screenData);
      screenData.touchEventListenersActive += 1;
    }
  }
  addCommand2("offtouch", offtouch, ["mode", "fn"]);
  function offtouch(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    const isValid = offevent(
      mode,
      fn,
      ["start", "end", "move"],
      "offtouch",
      screenData.onTouchEventListeners
    );
    if (isValid) {
      if (fn == null) {
        screenData.touchEventListenersActive = 0;
      } else {
        screenData.touchEventListenersActive -= 1;
        if (screenData.touchEventListenersActive < 0) {
          screenData.touchEventListenersActive = 0;
        }
      }
    }
  }
  addCommand("setPinchZoom", setPinchZoom, ["isEnabled"]);
  function setPinchZoom(options) {
    const isEnabled = !!options.isEnabled;
    if (isEnabled) {
      document.body.style.touchAction = "";
    } else {
      document.body.style.touchAction = "none";
    }
  }
  function touchStart(e) {
    m_isTouchScreen = true;
    const screenData = getScreenDataFromEvent2(e);
    if (screenData == null) {
      return;
    }
    updateTouch(screenData, e, "start");
    const touchData = getTouch(screenData);
    if (screenData.touchEventListenersActive > 0) {
      triggerEventListeners("start", touchData, screenData.onTouchEventListeners);
    }
    if (screenData.triggerPressListeners && screenData.getTouchPress) {
      screenData.triggerPressListeners(screenData, "down", screenData.getTouchPress(screenData));
      e.preventDefault();
    }
    if (screenData.triggerClickListeners && screenData.getTouchPress) {
      screenData.triggerClickListeners(
        screenData,
        screenData.getTouchPress(screenData),
        "down"
      );
    }
  }
  function touchMove(e) {
    const screenData = getScreenDataFromEvent2(e);
    if (screenData == null) {
      return;
    }
    updateTouch(screenData, e, "move");
    const touchData = getTouch(screenData);
    if (screenData.touchEventListenersActive > 0) {
      triggerEventListeners("move", touchData, screenData.onTouchEventListeners);
    }
    if (screenData.triggerPressListeners && screenData.getTouchPress) {
      screenData.triggerPressListeners(screenData, "move", screenData.getTouchPress(screenData));
    }
  }
  function touchEnd(e) {
    const screenData = getScreenDataFromEvent2(e);
    if (screenData == null) {
      return;
    }
    updateTouch(screenData, e, "end");
    const touchData = getTouch(screenData);
    if (screenData.touchEventListenersActive > 0) {
      triggerEventListeners("end", touchData, screenData.onTouchEventListeners);
    }
    if (screenData.triggerPressListeners && screenData.getTouchPress) {
      screenData.triggerPressListeners(screenData, "up", screenData.getTouchPress(screenData));
    }
    if (screenData.triggerClickListeners && screenData.getTouchPress) {
      screenData.triggerClickListeners(
        screenData,
        screenData.getTouchPress(screenData),
        "up"
      );
    }
  }
  function updateTouch(screenData, e, action) {
    if (!screenData.clientRect) {
      return;
    }
    const newTouches = {};
    const rect2 = screenData.clientRect;
    for (let j = 0; j < e.touches.length; j++) {
      const touch = e.touches[j];
      const touchData = {};
      touchData.x = Math.floor(
        (touch.clientX - rect2.left) / rect2.width * screenData.width
      );
      touchData.y = Math.floor(
        (touch.clientY - rect2.top) / rect2.height * screenData.height
      );
      touchData.id = touch.identifier;
      if (screenData.touches[touchData.id]) {
        touchData.lastX = screenData.touches[touchData.id].x;
        touchData.lastY = screenData.touches[touchData.id].y;
      } else {
        touchData.lastX = null;
        touchData.lastY = null;
      }
      touchData.action = action;
      newTouches[touchData.id] = touchData;
    }
    screenData.lastTouches = screenData.touches;
    screenData.touches = newTouches;
    screenData.lastEvent = "touch";
  }
  function getTouch(screenData) {
    const touchArr = [];
    for (const i in screenData.touches) {
      const touch = screenData.touches[i];
      const touchData = {
        "x": touch.x,
        "y": touch.y,
        "id": touch.id,
        "lastX": touch.lastX,
        "lastY": touch.lastY,
        "action": touch.action,
        "type": "touch"
      };
      touchArr.push(touchData);
    }
    return touchArr;
  }
  function getScreenDataFromEvent2(e) {
    const screenId = e.target.dataset?.screenId;
    if (screenId === void 0) {
      return null;
    }
    const activeScreen = getActiveScreen();
    if (activeScreen && activeScreen.id === parseInt(screenId)) {
      return activeScreen;
    }
    return null;
  }
  function onWindowBlur2() {
    const activeScreen = getActiveScreen();
    if (activeScreen) {
      activeScreen.lastTouches = activeScreen.touches;
      activeScreen.touches = {};
    }
  }

  // src-pi-2.0.0-alpha.1/modules/press.js
  function init8() {
    addScreenDataItem("pressEventListenersActive", 0);
    addScreenDataItem("onPressEventListeners", {});
    addScreenDataItem("clickEventListenersActive", 0);
    addScreenDataItem("onClickEventListeners", {});
    addScreenInitFunction(initPressData);
  }
  function clearPressEvents(screenData) {
    screenData.onPressEventListeners = {};
    screenData.pressEventListenersActive = 0;
  }
  function clearClickEvents(screenData) {
    screenData.onClickEventListeners = {};
    screenData.clickEventListenersActive = 0;
  }
  function initPressData(screenData) {
    screenData.onPressEventListeners = {
      "down": [],
      "up": [],
      "move": []
    };
    screenData.onClickEventListeners = {
      "click": []
    };
  }
  addCommand2("inpress", inpress, []);
  function inpress(screenData) {
    screenData.api.startMouse();
    screenData.api.startTouch();
    if (screenData.lastEvent === "touch") {
      return getTouchPress(screenData);
    } else {
      return screenData.api.getMouse();
    }
  }
  addCommand2("onpress", onpress, ["mode", "fn", "once", "hitBox", "customData"]);
  function onpress(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    const once = options.once;
    const hitBox = options.hitBox;
    const customData = options.customData;
    const isValid = onevent(
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
      screenData.api.startMouse();
      screenData.api.startTouch();
      screenData.pressEventListenersActive += 1;
    }
  }
  addCommand2("offpress", offpress, ["mode", "fn"]);
  function offpress(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    const isValid = offevent(
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
  addCommand2("onclick", onclick, ["fn", "once", "hitBox", "customData"]);
  function onclick(screenData, options) {
    const fn = options.fn;
    const once = options.once;
    let hitBox = options.hitBox;
    const customData = options.customData;
    if (hitBox == null) {
      hitBox = {
        "x": 0,
        "y": 0,
        "width": screenData.width,
        "height": screenData.height
      };
    }
    const isValid = onevent(
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
      screenData.api.startMouse();
      screenData.api.startTouch();
      screenData.clickEventListenersActive += 1;
    }
  }
  addCommand2("offclick", offclick, ["fn"]);
  function offclick(screenData, options) {
    const fn = options.fn;
    const isValid = offevent(
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
  addScreenInternalCommands("triggerPressListeners", triggerPressListeners);
  function triggerPressListeners(screenData, mode, data) {
    if (screenData.pressEventListenersActive > 0) {
      triggerEventListeners(mode, data, screenData.onPressEventListeners);
    }
  }
  addScreenInternalCommands("triggerClickListeners", triggerClickListeners);
  function triggerClickListeners(screenData, data, clickStatus) {
    if (screenData.clickEventListenersActive > 0) {
      triggerEventListeners("click", data, screenData.onClickEventListeners, clickStatus);
    }
  }
  addScreenInternalCommands("getTouchPress", getTouchPress);
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
          touchData.action = action;
        }
        touchArr2.push(touchData);
      }
    }
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
    } else {
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
  }

  // src-pi-2.0.0-alpha.1/modules/gamepad.js
  var m_gamepads = {};
  var m_onConnectHandlers = [];
  var m_onDisconnectHandlers = [];
  var m_isInitialized = false;
  var m_isLooping = false;
  var m_gamepadLoopId = null;
  var m_axesSensitivity = 0.2;
  var m_tick = 0;
  var m_lastGamepadUpdateTick = -1;
  function init9() {
    window.addEventListener("blur", onWindowBlur3);
    window.addEventListener("focus", onWindowFocus);
  }
  function clearGamepadEvents() {
    m_onConnectHandlers.length = 0;
    m_onDisconnectHandlers.length = 0;
  }
  addCommand("startGamepad", startGamepad, []);
  function startGamepad() {
    if (!m_isInitialized) {
      window.addEventListener("gamepadconnected", gamepadConnected);
      window.addEventListener("gamepaddisconnected", gamepadDisconnected);
      m_isInitialized = true;
    }
    if (!m_isLooping) {
      m_isLooping = true;
      m_gamepadLoopId = requestAnimationFrame(gamepadLoop);
    }
  }
  addCommand("stopGamepad", stopGamepad, []);
  function stopGamepad() {
    if (m_isLooping) {
      m_isLooping = false;
      if (m_gamepadLoopId) {
        cancelAnimationFrame(m_gamepadLoopId);
        m_gamepadLoopId = null;
      }
    }
  }
  addCommand("ingamepad", ingamepad, ["gamepadIndex"]);
  function ingamepad(options) {
    const gamepadIndex = options.gamepadIndex;
    startGamepad();
    updateGamepads();
    if (gamepadIndex === null || gamepadIndex === void 0) {
      return Object.values(m_gamepads).sort((a, b) => a.index - b.index);
    }
    if (!Number.isInteger(gamepadIndex) || gamepadIndex < 0) {
      const error = new TypeError(
        "ingamepad: gamepadIndex must be a non-negative integer or null."
      );
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    return m_gamepads[gamepadIndex];
  }
  addCommand("setGamepadSensitivity", setGamepadSensitivity, ["sensitivity"]);
  function setGamepadSensitivity(options) {
    const sensitivity = options.sensitivity;
    if (typeof sensitivity !== "number" || sensitivity < 0 || sensitivity > 1) {
      const error = new TypeError(
        "setGamepadSensitivity: sensitivity must be a number between 0 and 1."
      );
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    if (sensitivity === 1) {
      m_axesSensitivity = 0.99999;
    } else {
      m_axesSensitivity = sensitivity;
    }
  }
  addCommand("onGamepadConnected", onGamepadConnected, ["fn"]);
  function onGamepadConnected(options) {
    const fn = options.fn;
    if (typeof fn !== "function") {
      const error = new TypeError("onGamepadConnected: fn must be a function.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    m_onConnectHandlers.push(fn);
    startGamepad();
  }
  addCommand("onGamepadDisconnected", onGamepadDisconnected, ["fn"]);
  function onGamepadDisconnected(options) {
    const fn = options.fn;
    if (typeof fn !== "function") {
      const error = new TypeError("onGamepadDisconnected: fn must be a function.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    m_onDisconnectHandlers.push(fn);
    startGamepad();
  }
  function gamepadConnected(e) {
    updateGamepad(e.gamepad);
    const gamepadData = m_gamepads[e.gamepad.index];
    for (const handler of m_onConnectHandlers) {
      handler(gamepadData);
    }
  }
  function gamepadDisconnected(e) {
    const data = {
      "index": e.gamepad.index,
      "id": e.gamepad.id,
      "mapping": e.gamepad.mapping,
      "connected": e.gamepad.connected
    };
    for (const handler of m_onDisconnectHandlers) {
      handler(data);
    }
    delete m_gamepads[e.gamepad.index];
  }
  function gamepadLoop() {
    if (!m_isLooping) {
      return;
    }
    updateGamepads();
    m_tick += 1;
    m_gamepadLoopId = requestAnimationFrame(gamepadLoop);
  }
  function updateGamepads() {
    let gamepads;
    if (m_lastGamepadUpdateTick === m_tick) {
      return;
    }
    m_lastGamepadUpdateTick = m_tick;
    if ("getGamepads" in navigator) {
      gamepads = navigator.getGamepads();
    } else if ("webkitGetGamepads" in navigator) {
      gamepads = navigator.webkitGetGamepads();
    } else {
      gamepads = [];
    }
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].index in m_gamepads) {
        updateGamepad(gamepads[i]);
      }
    }
  }
  function createNewGamepadData(gamepadDataRaw) {
    const newGamepadData = {
      "index": gamepadDataRaw.index,
      "id": gamepadDataRaw.id,
      "connected": gamepadDataRaw.connected,
      "mapping": gamepadDataRaw.mapping,
      "timestamp": gamepadDataRaw.timestamp,
      "vibrationActuator": gamepadDataRaw.vibrationActuator,
      "axes": [],
      "lastAxes": [],
      "buttons": []
    };
    newGamepadData.getButton = function(buttonIndex) {
      if (buttonIndex < 0 || buttonIndex >= this.buttons.length) {
        return null;
      }
      return this.buttons[buttonIndex];
    };
    newGamepadData.getButtonPressed = function(buttonIndex) {
      if (buttonIndex < 0 || buttonIndex >= this.buttons.length) {
        return null;
      }
      return this.buttons[buttonIndex].pressed;
    };
    newGamepadData.getButtonJustPressed = function(buttonIndex) {
      if (buttonIndex < 0 || buttonIndex >= this.buttons.length) {
        return false;
      }
      return this.buttons[buttonIndex].pressStarted;
    };
    newGamepadData.getButtonJustReleased = function(buttonIndex) {
      if (buttonIndex < 0 || buttonIndex >= this.buttons.length) {
        return false;
      }
      return this.buttons[buttonIndex].pressReleased;
    };
    newGamepadData.getAxis = function(axisIndex) {
      if (axisIndex < 0 || axisIndex >= this.axes.length) {
        return 0;
      }
      return this.axes[axisIndex];
    };
    newGamepadData.getAxisChanged = function(axisIndex) {
      if (axisIndex < 0 || axisIndex >= this.axes.length) {
        return false;
      }
      const current = this.axes[axisIndex];
      const last = this.lastAxes[axisIndex] || 0;
      return current !== last;
    };
    return newGamepadData;
  }
  function updateGamepad(gamepadRawData) {
    let gamepadData = m_gamepads[gamepadRawData.index];
    if (!gamepadData) {
      gamepadData = createNewGamepadData(gamepadRawData);
      m_gamepads[gamepadRawData.index] = gamepadData;
    }
    const newButtons = [];
    for (let i = 0; i < gamepadRawData.buttons.length; i += 1) {
      const buttonNew = gamepadRawData.buttons[i];
      const buttonOld = gamepadData.buttons[i] || { "pressed": false };
      newButtons.push({
        "pressed": buttonNew.pressed,
        "value": buttonNew.value,
        "pressStarted": !buttonOld.pressed && buttonNew.pressed,
        "pressReleased": buttonOld.pressed && !buttonNew.pressed
      });
    }
    gamepadData.buttons = newButtons;
    gamepadData.lastAxes = gamepadData.axes.slice();
    gamepadData.axes = [];
    for (let i = 0; i < gamepadRawData.axes.length; i++) {
      gamepadData.axes.push(smoothAxis(gamepadRawData.axes[i]));
    }
    gamepadData.timestamp = gamepadRawData.timestamp;
    gamepadData.connected = gamepadRawData.connected;
    gamepadData.vibrationActuator = gamepadRawData.vibrationActuator;
  }
  function smoothAxis(axis) {
    if (Math.abs(axis) < m_axesSensitivity) {
      return 0;
    }
    axis = axis - Math.sign(axis) * m_axesSensitivity;
    axis = axis / (1 - m_axesSensitivity);
    return axis;
  }
  function onWindowBlur3() {
    if (m_isLooping) {
      if (m_gamepadLoopId) {
        cancelAnimationFrame(m_gamepadLoopId);
        m_gamepadLoopId = null;
      }
    }
  }
  function onWindowFocus() {
    if (m_isLooping && !m_gamepadLoopId) {
      m_gamepadLoopId = requestAnimationFrame(gamepadLoop);
    }
  }

  // src-pi-2.0.0-alpha.1/core/events.js
  function init10() {
    addCommand2("clearEvents", clearEvents, ["type"], true);
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

  // src-pi-2.0.0-alpha.1/modules/graphics.js
  function init11() {
    addScreenDataItem("cursor", { "x": 0, "y": 0 });
  }
  addPixelCommand("pset", pset, ["x", "y"]);
  function pset(screenData, options) {
    const x = getInt(options.x, null);
    const y = getInt(options.y, null);
    if (x === null || y === null) {
      const error = new TypeError("pset: Parameters x and y must be integers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (!inRange2(x, y, 0, 0, screenData.width, screenData.height)) {
      return;
    }
    const color = screenData.color;
    getImageData(screenData);
    screenData.pen(screenData, x, y, color);
    setImageDirty(screenData);
    screenData.cursor.x = x;
    screenData.cursor.y = y;
  }
  addAACommand("pset", aaPset, ["x", "y"]);
  function aaPset(screenData, options) {
    const x = getFloat(options.x, null);
    const y = getFloat(options.y, null);
    if (x === null || y === null) {
      const error = new TypeError("pset: Parameters x and y must be numbers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    screenData.api.render();
    screenData.context.beginPath();
    screenData.context.moveTo(x, y);
    screenData.context.lineTo(x, y);
    screenData.context.stroke();
    screenData.cursor.x = x;
    screenData.cursor.y = y;
  }
  addPixelCommand("line", line, ["x1", "y1", "x2", "y2"]);
  function line(screenData, options) {
    let x1 = getInt(options.x1, null);
    let y1 = getInt(options.y1, null);
    const x2 = getInt(options.x2, null);
    const y2 = getInt(options.y2, null);
    if (x1 === null || y1 === null || x2 === null || y2 === null) {
      const error = new TypeError("line: Arguments x1, y1, x2, and y2 must be integers.");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    const color = screenData.color;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    let sx;
    if (x1 < x2) {
      sx = 1;
    } else {
      sx = -1;
    }
    let sy;
    if (y1 < y2) {
      sy = 1;
    } else {
      sy = -1;
    }
    let err = dx - dy;
    getImageData(screenData);
    screenData.pen(screenData, x1, y1, color);
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
      screenData.pen(screenData, x1, y1, color);
    }
    setImageDirty(screenData);
  }
  addAACommand("line", aaLine, ["x1", "y1", "x2", "y2"]);
  function aaLine(screenData, options) {
    const x1 = getFloat(options.x1, null);
    const y1 = getFloat(options.y1, null);
    const x2 = getFloat(options.x2, null);
    const y2 = getFloat(options.y2, null);
    if (x1 === null || y1 === null || x2 === null || y2 === null) {
      const error = new TypeError("line: Parameters x1, y1, x2, y2 must be numbers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    screenData.api.render();
    screenData.context.strokeStyle = screenData.color.hex;
    screenData.context.beginPath();
    screenData.context.moveTo(x1, y1);
    screenData.context.lineTo(x2, y2);
    screenData.context.stroke();
  }
  addPixelCommand("rect", rect, ["x", "y", "width", "height", "fillColor"]);
  function rect(screenData, options) {
    let x = getInt(options.x, null);
    let y = getInt(options.y, null);
    const width2 = getInt(options.width, null);
    const height2 = getInt(options.height, null);
    let fillColor = options.fillColor;
    if (x === null || y === null || width2 === null || height2 === null) {
      const error = new TypeError("rect: Paramters x, y, width, and height must be integers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    let isFill = false;
    if (fillColor != null) {
      fillColor = getColorValueByRawInput(screenData, fillColor);
      if (fillColor === null) {
        const error = new TypeError(
          "rect: Parameter fillColor must be a valid color format."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      isFill = true;
    }
    const x2 = x + width2 - 1;
    const y2 = y + height2 - 1;
    screenData.api.line(x, y, x2, y);
    screenData.api.line(x2, y, x2, y2);
    screenData.api.line(x2, y2, x, y2);
    screenData.api.line(x, y2, x, y);
    if (isFill && width2 > screenData.penData.size && height2 > screenData.penData.size && width2 > 2 && height2 > 2) {
      const tempColor = screenData.color;
      screenData.color = fillColor;
      getImageData(screenData);
      y = y + screenData.penData.size;
      let y2Adjusted = y2 - screenData.penData.size + 1;
      x = x + screenData.penData.size;
      let x2Adjusted = x2 - screenData.penData.size + 1;
      if (x < 0) {
        x = 0;
      }
      if (x2Adjusted > screenData.width) {
        x2Adjusted = screenData.width;
      }
      if (y < 0) {
        y = 0;
      }
      if (y2Adjusted > screenData.height) {
        y2Adjusted = screenData.height;
      }
      for (; y < y2Adjusted; y += 1) {
        for (let x3 = x; x3 < x2Adjusted; x3 += 1) {
          screenData.pen(screenData, x3, y, fillColor);
        }
      }
      setImageDirty(screenData);
      screenData.color = tempColor;
    }
  }
  addAACommand("rect", aaRect, ["x", "y", "width", "height", "fillColor"]);
  function aaRect(screenData, options) {
    const x = getFloat(options.x, null);
    const y = getFloat(options.y, null);
    const width2 = getFloat(options.width, null);
    const height2 = getFloat(options.height);
    let fillColor = options.fillColor;
    let isFill = false;
    if (x === null || y === null || width2 === null || height2 === null) {
      const error = new TypeError("rect: Parameters x, y, width, height must be numbers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (fillColor != null) {
      fillColor = getColorValueByRawInput(screenData, fillColor);
      if (fillColor === null) {
        const error = new TypeError(
          "rect: Parameter fillColor must be a valid color format."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      isFill = true;
    }
    screenData.api.render();
    screenData.context.beginPath();
    screenData.context.strokeStyle = screenData.color.hex;
    screenData.context.rect(x, y, width2, height2);
    if (isFill) {
      screenData.context.fillStyle = fillColor.hex;
      screenData.context.fill();
    }
    screenData.context.stroke();
  }
  addPixelCommand("circle", circle, ["x", "y", "radius", "fillColor"]);
  function circle(screenData, options) {
    const x = getInt(options.x, null);
    const y = getInt(options.y, null);
    let radius = getInt(options.radius, null);
    let fillColor = options.fillColor;
    let isFill = false;
    if (x === null || y === null || radius === null) {
      const error = new TypeError("circle: Paramters x, y, and radius must be integers.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    if (fillColor != null) {
      fillColor = getColorValueByRawInput(screenData, fillColor);
      if (fillColor === null) {
        const error = new TypeError(
          "circle: Parameter fillColor must be a valid color format."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      isFill = true;
    }
    getImageData(screenData);
    const color = screenData.color;
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
          const i = (py * screenData.width + px) * 4;
          const data = screenData.imageData2;
          data[i] = fillColor.r;
          data[i + 1] = fillColor.g;
          data[i + 2] = fillColor.b;
          data[i + 3] = fillColor.a;
        }
      }
    }
    radius -= 1;
    let x2 = radius;
    let y2 = 0;
    if (radius > 1) {
      screenData.pen(screenData, x2 + x, y2 + y, color);
      screenData.pen(screenData, -x2 + x, y2 + y, color);
      screenData.pen(screenData, x, x2 + y, color);
      screenData.pen(screenData, x, -x2 + y, color);
    } else if (radius === 1) {
      screenData.pen(screenData, x + 1, y, color);
      screenData.pen(screenData, x - 1, y, color);
      screenData.pen(screenData, x, y + 1, color);
      screenData.pen(screenData, x, y - 1, color);
      y2 = x2 + 1;
    } else if (radius === 0) {
      screenData.pen(screenData, x, y, color);
      y2 = x2 + 1;
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
      screenData.pen(screenData, x2 + x, y2 + y, color);
      screenData.pen(screenData, -x2 + x, y2 + y, color);
      screenData.pen(screenData, x2 + x, -y2 + y, color);
      screenData.pen(screenData, -x2 + x, -y2 + y, color);
      if (x2 != y2) {
        screenData.pen(screenData, y2 + x, x2 + y, color);
        screenData.pen(screenData, -y2 + x, x2 + y, color);
        screenData.pen(screenData, y2 + x, -x2 + y, color);
        screenData.pen(screenData, -y2 + x, -x2 + y, color);
      }
    }
    setImageDirty(screenData);
  }
  addAACommand("circle", aaCircle, ["x", "y", "radius", "fillColor"]);
  function aaCircle(screenData, options) {
    const x = getFloat(options.x + 0.5, null);
    const y = getFloat(options.y + 0.5, null);
    const r = getFloat(options.radius - 0.9, null);
    let fillColor = options.fillColor;
    if (isNaN(x) || isNaN(y) || isNaN(r)) {
      const error = new TypeError("circle: Parameters cx, cy, r must be numbers.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    let isFill = false;
    if (fillColor != null) {
      fillColor = getColorValueByRawInput(screenData, fillColor, "circle");
      if (fillColor === null) {
        const error = new TypeError(
          "circle: Parameter fillColor must be a valid color format."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      isFill = true;
    }
    screenData.api.render();
    const angle1 = degreesToRadian(0);
    const angle2 = degreesToRadian(360);
    screenData.context.beginPath();
    screenData.context.arc(x, y, r, angle1, angle2);
    if (isFill) {
      screenData.context.fillStyle = fillColor.hex;
      screenData.context.fill();
    }
    screenData.context.strokeStyle = screenData.color.hex;
    screenData.context.stroke();
  }
  addCommand2("put", put, ["data", "x", "y", "includeZero"]);
  function put(screenData, options) {
    const data = options.data;
    const x = Math.round(options.x);
    const y = Math.round(options.y);
    const includeZero = !!options.includeZero;
    if (!data || data.length < 1) {
      return;
    }
    if (isNaN(x) || isNaN(y)) {
      const error = new TypeError("put: Parameters x and y must be integers.");
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
    let width2 = data[0].length - startX;
    let height2 = data.length - startY;
    if (x + startX + width2 >= screenData.width) {
      width2 = screenData.width - x + startX;
    }
    if (y + startY + height2 >= screenData.height) {
      height2 = screenData.height - y + startY;
    }
    if (width2 <= 0 || height2 <= 0) {
      return;
    }
    getImageData(screenData);
    for (let dataY = startY; dataY < startY + height2; dataY++) {
      for (let dataX = startX; dataX < startX + width2; dataX++) {
        const c = screenData.pal[data[dataY][dataX]];
        const i = (screenData.width * (y + dataY) + (x + dataX)) * 4;
        if (c.a > 0 || includeZero) {
          screenData.imageData2[i] = c.r;
          screenData.imageData2[i + 1] = c.g;
          screenData.imageData2[i + 2] = c.b;
          screenData.imageData2[i + 3] = c.a;
        }
      }
    }
    setImageDirty(screenData);
  }
  addCommand2("get", get, ["x1", "y1", "x2", "y2", "tolerance"]);
  function get(screenData, options) {
    let x1 = Math.round(options.x1);
    let y1 = Math.round(options.y1);
    let x2 = Math.round(options.x2);
    let y2 = Math.round(options.y2);
    let tolerance = options.tolerance;
    const isAddToPalette = !!options.isAddToPalette;
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      const error = new TypeError("get: Parameters x1, x2, y1, y2 must be integers.");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    if (tolerance == null) {
      tolerance = 1;
    } else if (isNaN(tolerance)) {
      const error = new TypeError("get: Parameter tolerance must be a number.");
      error.code = "INVALID_TOLERANCE";
      throw error;
    }
    x1 = clamp(x1, 0, screenData.width - 1);
    x2 = clamp(x2, 0, screenData.width - 1);
    y1 = clamp(y1, 0, screenData.height - 1);
    y2 = clamp(y2, 0, screenData.height - 1);
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
    getImageData(screenData);
    const imageData2 = screenData.imageData2;
    const data = [];
    let colorLookupFn;
    if (tolerance === 1) {
      colorLookupFn = (i) => {
        const key = generateColorKey(
          imageData2[i],
          imageData2[i + 1],
          imageData2[i + 2],
          imageData2[i + 3]
        );
        if (screenData.palMap.has(key)) {
          data[row].push(screenData.palMap.get(key));
        } else {
          data[row].push(0);
        }
      };
    } else {
      colorLookupFn = (i) => {
        const colorValue = rgbToColor(
          imageData2[i],
          imageData2[i + 1],
          imageData2[i + 2],
          imageData2[i + 3]
        );
        const c = findColorIndexByColorValue(screenData, colorValue, tolerance);
        if (c === null) {
          data[row].push(0);
        } else {
          data[row].push(c);
        }
      };
    }
    let row = 0;
    for (let y = y1; y <= y2; y++) {
      data.push([]);
      for (let x = x1; x <= x2; x++) {
        const i = (screenData.width * y + x) * 4;
        colorLookupFn(i);
      }
      row += 1;
    }
    return data;
  }
  addCommand2("getPixel", getPixel, ["x", "y"]);
  function getPixel(screenData, options) {
    const x = Math.round(options.x);
    const y = Math.round(options.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      const error = new TypeError("getPixel: Arguments x and y must be integers.");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    if (x < 0 || x >= screenData.width || y < 0 || y >= screenData.height) {
      const error = new RangeError("getPixel: Coordinates are out of bounds.");
      error.code = "OUT_OF_BOUNDS";
      throw error;
    }
    getImageData(screenData);
    const data = screenData.imageData2;
    const i = (screenData.width * y + x) * 4;
    const colorValue = rgbToColor(data[i], data[i + 1], data[i + 2], data[i + 3]);
    const colorIndex = findColorIndexByColorValue(screenData, colorValue);
    return colorIndex;
  }
  addCommand2("getPixelColor", getPixelColor, ["x", "y"]);
  function getPixelColor(screenData, options) {
    const x = Math.round(options.x);
    const y = Math.round(options.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      const error = new TypeError("getPixelColor: Arguments x and y must be integers.");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    if (x < 0 || x >= screenData.width || y < 0 || y >= screenData.height) {
      const error = new RangeError("getPixelColor: Coordinates are out of bounds.");
      error.code = "OUT_OF_BOUNDS";
      throw error;
    }
    getImageData(screenData);
    const data = screenData.imageData2;
    const i = (screenData.width * y + x) * 4;
    const colorValue = rgbToColor(data[i], data[i + 1], data[i + 2], data[i + 3]);
    return colorValue;
  }

  // src-pi-2.0.0-alpha.1/modules/graphics-advanced.js
  function init12() {
  }
  addPixelCommand("arc", arc, ["x", "y", "radius", "angle1", "angle2"]);
  function arc(screenData, options) {
    const x = getInt(options.x, null);
    const y = getInt(options.y, null);
    let radius = getInt(options.radius, null);
    let angle1 = getInt(options.angle1, null);
    let angle2 = getInt(options.angle2, null);
    if (x === null || y === null || radius === null || angle1 === null || angle2 === null) {
      const error = new TypeError(
        "arc: Argument's x, y, radius, angle1, and angle2 must be integers."
      );
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    angle1 = (angle1 + 360) % 360;
    angle2 = (angle2 + 360) % 360;
    const winding = angle1 > angle2;
    getImageData(screenData);
    const color = screenData.color;
    radius -= 1;
    if (radius < 0) {
      radius = 0;
    }
    let x2 = radius;
    let y2 = 0;
    function set2(x22, y22) {
      let a = radiansToDegrees(Math.atan2(y22 - y, x22 - x));
      a = (a + 360) % 360;
      if (winding) {
        if (a >= angle1 || a <= angle2) {
          screenData.pen(screenData, x22, y22, color);
        }
      } else if (a >= angle1 && a <= angle2) {
        screenData.pen(screenData, x22, y22, color);
      }
    }
    if (radius > 1) {
      set2(x2 + x, y2 + y, color);
      set2(-x2 + x, y2 + y, color);
      set2(x, x2 + y, color);
      set2(x, -x2 + y, color);
    } else if (radius === 1) {
      set2(x + 1, y, color);
      set2(x - 1, y, color);
      set2(x, y + 1, color);
      set2(x, y - 1, color);
      setImageDirty(screenData);
      return;
    } else if (radius === 0) {
      screenData.pen(screenData, x, y, color);
      setImageDirty(screenData);
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
      set2(x2 + x, y2 + y, color);
      set2(-x2 + x, y2 + y, color);
      set2(x2 + x, -y2 + y, color);
      set2(-x2 + x, -y2 + y, color);
      if (x2 != y2) {
        set2(y2 + x, x2 + y, color);
        set2(-y2 + x, x2 + y, color);
        set2(y2 + x, -x2 + y, color);
        set2(-y2 + x, -x2 + y, color);
      }
    }
    setImageDirty(screenData);
  }
  addAACommand("arc", aaArc, ["x", "y", "radius", "angle1", "angle2"]);
  function aaArc(screenData, options) {
    let x = getFloat(options.x, null);
    let y = getFloat(options.y, null);
    let radius = getFloat(options.radius, null);
    const angle1 = getFloat(options.angle1, null);
    const angle2 = getFloat(options.angle2, null);
    if (x === null || y === null || radius === null || angle1 === null || angle2 === null) {
      const error = new TypeError(
        "arc: Argument's x, y, radius, angle1, and angle2 must be numbers."
      );
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    x = x + 0.5;
    y = y + 0.5;
    radius = radius - 0.9;
    if (radius < 0) {
      radius = 0;
    }
    screenData.api.render();
    const angle1Rad = degreesToRadian(angle1);
    const angle2Rad = degreesToRadian(angle2);
    screenData.context.beginPath();
    screenData.context.strokeStyle = screenData.color.hex;
    screenData.context.moveTo(
      x + Math.cos(angle1Rad) * radius,
      y + Math.sin(angle1Rad) * radius
    );
    screenData.context.arc(x, y, radius, angle1Rad, angle2Rad);
    screenData.context.stroke();
  }
  addPixelCommand("ellipse", ellipse, ["x", "y", "radiusX", "radiusY", "fillColor"]);
  function ellipse(screenData, options) {
    const x = getInt(options.x, null);
    const y = getInt(options.y, null);
    const radiusX = getInt(options.radiusX, null);
    const radiusY = getInt(options.radiusY, null);
    let fillColor = options.fillColor;
    if (x === null || y === null || radiusX === null || radiusY === null) {
      const error = new TypeError(
        "ellipse: Parameters x, y, radiusX, radiusY must be integers."
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    let isFill = false;
    if (fillColor !== null) {
      fillColor = getColorValueByRawInput(screenData, fillColor);
      if (fillColor === null) {
        const error = new TypeError(
          "ellipse: Parameter fillColor must be a valid color format."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      isFill = true;
    }
    getImageData(screenData);
    const color = screenData.color;
    if (radiusX === 0 && radiusY === 0) {
      screenData.pen(screenData, Math.floor(x), Math.floor(y), color);
      setImageDirty(screenData);
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
          const i = (py * screenData.width + px) * 4;
          const data = screenData.imageData2;
          data[i] = fillColor.r;
          data[i + 1] = fillColor.g;
          data[i + 2] = fillColor.b;
          data[i + 3] = fillColor.a;
        }
      }
    }
    let x2 = 0;
    let y2 = radiusY;
    let d1 = radiusY * radiusY - radiusX * radiusX * radiusY + 0.25 * radiusX * radiusX;
    let dx = 2 * radiusY * radiusY * x2;
    let dy = 2 * radiusX * radiusX * y2;
    while (dx < dy) {
      screenData.pen(screenData, Math.floor(x2 + x), Math.floor(y2 + y), color);
      screenData.pen(screenData, Math.floor(-x2 + x), Math.floor(y2 + y), color);
      screenData.pen(screenData, Math.floor(x2 + x), Math.floor(-y2 + y), color);
      screenData.pen(screenData, Math.floor(-x2 + x), Math.floor(-y2 + y), color);
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
      screenData.pen(screenData, Math.floor(x2 + x), Math.floor(y2 + y), color);
      screenData.pen(screenData, Math.floor(-x2 + x), Math.floor(y2 + y), color);
      screenData.pen(screenData, Math.floor(x2 + x), Math.floor(-y2 + y), color);
      screenData.pen(screenData, Math.floor(-x2 + x), Math.floor(-y2 + y), color);
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
    setImageDirty(screenData);
  }
  addAACommand("ellipse", aaEllipse, ["x", "y", "radiusX", "radiusY", "fillColor"]);
  function aaEllipse(screenData, options) {
    const cx = getInt(options.x, null);
    const cy = getInt(options.y, null);
    const rx = getInt(options.radiusX, null);
    const ry = getInt(options.radiusY, null);
    let fillColor = options.fillColor;
    if (cx === null || cy === null || rx === null || ry === null) {
      const error = new TypeError(
        "ellipse: Parameters x, y, radiusX, radiusY must be integers."
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    let isFill = false;
    if (fillColor != null) {
      fillColor = getColorValueByRawInput(screenData, fillColor);
      if (fillColor === null) {
        const error = new TypeError(
          "ellipse: Parameter fillColor must be a valid color format."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      isFill = true;
    }
    if (screenData.isDirty) {
      screenData.api.render();
    }
    screenData.context.beginPath();
    screenData.context.strokeStyle = screenData.color.hex;
    screenData.context.moveTo(cx + rx, cy);
    screenData.context.ellipse(cx, cy, rx, ry, 0, Math.PI * 2, false);
    if (isFill) {
      screenData.context.fillStyle = fillColor.hex;
      screenData.context.fill();
    }
    screenData.context.stroke();
  }
  addCommand2("filterImg", filterImg, ["filter", "x1", "y1", "x2", "y2"]);
  function filterImg(screenData, options) {
    const filter = options.filter;
    let x1 = getInt(options.x1, 0);
    let y1 = getInt(options.y1, 0);
    let x2 = getInt(options.x2, screenData.width - 1);
    let y2 = getInt(options.y2, screenData.height - 1);
    if (!isFunction(filter)) {
      const error = new TypeError("filterImg: Argument filter must be a callback function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    x1 = clamp(x1, 0, screenData.width - 1);
    y1 = clamp(y1, 0, screenData.height - 1);
    x2 = clamp(x2, 0, screenData.width - 1);
    y2 = clamp(y2, 0, screenData.height - 1);
    if (x1 > x2) {
      const temp = x1;
      x1 = x2;
      x2 = temp;
    }
    if (y1 > y2) {
      const temp = y1;
      y1 = y2;
      y2 = temp;
    }
    getImageData(screenData);
    const data = screenData.imageData2;
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const i = (screenData.width * y + x) * 4;
        const color = filter({
          "r": data[i],
          "g": data[i + 1],
          "b": data[i + 2],
          "a": data[i + 3]
        }, x, y);
        if (color && Number.isInteger(color.r) && Number.isInteger(color.g) && Number.isInteger(color.b) && Number.isInteger(color.a)) {
          data[i] = clamp(color.r, 0, 255);
          data[i + 1] = clamp(color.g, 0, 255);
          data[i + 2] = clamp(color.b, 0, 255);
          data[i + 3] = clamp(color.a, 0, 255);
        }
      }
    }
    setImageDirty(screenData);
  }
  addPixelCommand(
    "bezier",
    bezier,
    ["xStart", "yStart", "x1", "y1", "x2", "y2", "xEnd", "yEnd"]
  );
  function bezier(screenData, options) {
    const xStart = Math.round(options.xStart);
    const yStart = Math.round(options.yStart);
    const x1 = Math.round(options.x1);
    const y1 = Math.round(options.y1);
    const x2 = Math.round(options.x2);
    const y2 = Math.round(options.y2);
    const xEnd = Math.round(options.xEnd);
    const yEnd = Math.round(options.yEnd);
    if (isNaN(xStart) || isNaN(yStart) || isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || isNaN(xEnd) || isNaN(yEnd)) {
      const error = new TypeError(
        "bezier: Arguments xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd must be numbers."
      );
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    const color = screenData.color;
    getImageData(screenData);
    const minDistance = screenData.penData.size;
    const points = [
      { "x": xStart, "y": yStart },
      { "x": x1, "y": y1 },
      { "x": x2, "y": y2 },
      { "x": xEnd, "y": yEnd }
    ];
    let lastPoint = calcBezierStep(0, points);
    screenData.pen(screenData, lastPoint.x, lastPoint.y, color);
    let t = 0.1;
    let dt = 0.1;
    while (t < 1) {
      const point2 = calcBezierStep(t, points);
      const distance = calcBezierDistance(point2, lastPoint);
      if (distance > minDistance && dt > 1e-5) {
        t -= dt;
        dt = dt * 0.75;
      } else {
        screenData.pen(screenData, point2.x, point2.y, color);
        lastPoint = point2;
      }
      t += dt;
    }
    const point = calcBezierStep(1, points);
    screenData.pen(screenData, point.x, point.y, color);
    setImageDirty(screenData);
  }
  addAACommand(
    "bezier",
    aaBezier,
    ["xStart", "yStart", "x1", "y1", "x2", "y2", "xEnd", "yEnd"]
  );
  function aaBezier(screenData, options) {
    const xStart = options.xStart + 0.5;
    const yStart = options.yStart + 0.5;
    const x1 = options.x1 + 0.5;
    const y1 = options.y1 + 0.5;
    const x2 = options.x2 + 0.5;
    const y2 = options.y2 + 0.5;
    const xEnd = options.xEnd + 0.5;
    const yEnd = options.yEnd + 0.5;
    if (isNaN(xStart) || isNaN(yStart) || isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || isNaN(xEnd) || isNaN(yEnd)) {
      const error = new TypeError(
        "bezier: Parameters xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd must be numbers."
      );
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    screenData.api.render();
    screenData.context.strokeStyle = screenData.color.hex;
    screenData.context.beginPath();
    screenData.context.moveTo(xStart, yStart);
    screenData.context.bezierCurveTo(x1, y1, x2, y2, xEnd, yEnd);
    screenData.context.stroke();
  }
  function calcBezierDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  }
  function calcBezierStep(t, points) {
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

  // src-pi-2.0.0-alpha.1/modules/draw.js
  function init13() {
    addScreenDataItem("angle", 0);
  }
  addCommand2("draw", draw, ["drawString"]);
  function draw(screenData, options) {
    let drawString = options.drawString;
    if (typeof drawString !== "string") {
      const error = new TypeError("draw: drawString must be a string.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    drawString = drawString.toUpperCase();
    const tempColors = drawString.match(/(#[A-Z0-9]+)/g);
    if (tempColors) {
      for (let i = 0; i < tempColors.length; i++) {
        drawString = drawString.replace("C" + tempColors[i], "O" + i);
      }
    }
    drawString = drawString.replace(/[^CRBFGLATDHUENMPSO0-9#,]/g, "");
    drawString = drawString.replace(/(TA)/gi, "T");
    drawString = drawString.replace(/(ARC)/gi, "Z");
    const reg = /(?=C|O|R|B|F|G|L|A|T|D|G|H|U|E|N|M|P|S|Z)/;
    const parts = drawString.split(reg);
    let isReturn = false;
    let lastCursor = {
      "x": screenData.cursor.x,
      "y": screenData.cursor.y,
      "angle": screenData.angle
    };
    let isBlind = false;
    let isArc = false;
    let arcRadius, arcAngle1, arcAngle2;
    let scale = 1;
    for (let i = 0; i < parts.length; i++) {
      const drawArgs = parts[i].split(/(\d+)/);
      switch (drawArgs[0]) {
        // C - Change Color - Using integer
        case "C": {
          const colorNum = Number(drawArgs[1]);
          screenData.api.setColor(colorNum);
          isBlind = true;
          break;
        }
        // O - Change Color - Using string
        case "O": {
          const colorStr = tempColors[drawArgs[1]];
          screenData.api.setColor(colorStr);
          isBlind = true;
          break;
        }
        // D - Down
        case "D": {
          const len = getInt(drawArgs[1], 1) * scale;
          const angle = degreesToRadian(90) + screenData.angle;
          screenData.cursor.x += Math.round(Math.cos(angle) * len);
          screenData.cursor.y += Math.round(Math.sin(angle) * len);
          break;
        }
        // E - Up and Right
        case "E": {
          let len = getInt(drawArgs[1], 1) * scale;
          len = Math.sqrt(len * len + len * len);
          const angle = degreesToRadian(315) + screenData.angle;
          screenData.cursor.x += Math.round(Math.cos(angle) * len);
          screenData.cursor.y += Math.round(Math.sin(angle) * len);
          break;
        }
        // F - Down and Right
        case "F": {
          let len = getInt(drawArgs[1], 1) * scale;
          len = Math.sqrt(len * len + len * len);
          const angle = degreesToRadian(45) + screenData.angle;
          screenData.cursor.x += Math.round(Math.cos(angle) * len);
          screenData.cursor.y += Math.round(Math.sin(angle) * len);
          break;
        }
        // G - Down and Left
        case "G": {
          let len = getInt(drawArgs[1], 1) * scale;
          len = Math.sqrt(len * len + len * len);
          const angle = degreesToRadian(135) + screenData.angle;
          screenData.cursor.x += Math.round(Math.cos(angle) * len);
          screenData.cursor.y += Math.round(Math.sin(angle) * len);
          break;
        }
        // H - Up and Left
        case "H": {
          let len = getInt(drawArgs[1], 1) * scale;
          len = Math.sqrt(len * len + len * len);
          const angle = degreesToRadian(225) + screenData.angle;
          screenData.cursor.x += Math.round(Math.cos(angle) * len);
          screenData.cursor.y += Math.round(Math.sin(angle) * len);
          break;
        }
        // L - Left
        case "L": {
          const len = getInt(drawArgs[1], 1) * scale;
          const angle = degreesToRadian(180) + screenData.angle;
          screenData.cursor.x += Math.round(Math.cos(angle) * len);
          screenData.cursor.y += Math.round(Math.sin(angle) * len);
          break;
        }
        // R - Right
        case "R": {
          const len = getInt(drawArgs[1], 1) * scale;
          const angle = degreesToRadian(0) + screenData.angle;
          screenData.cursor.x += Math.round(Math.cos(angle) * len);
          screenData.cursor.y += Math.round(Math.sin(angle) * len);
          break;
        }
        // U - Up
        case "U": {
          const len = getInt(drawArgs[1], 1) * scale;
          const angle = degreesToRadian(270) + screenData.angle;
          screenData.cursor.x += Math.round(Math.cos(angle) * len);
          screenData.cursor.y += Math.round(Math.sin(angle) * len);
          break;
        }
        // P - Paint Exact Match
        case "P": {
          const colorNum = getInt(drawArgs[1], 0);
          const boundryNumber = getInt(drawArgs[3], null);
          screenData.api.paint(
            screenData.cursor.x,
            screenData.cursor.y,
            colorNum,
            1,
            boundryNumber
          );
          isBlind = true;
          break;
        }
        // S - Scale
        /*
        	Set scale factor. n may range from 1 to 255. n is divided by 4 to derive the scale 
        	factor. The scale factor is multiplied by the distances given with U, D, L, R, E, 
        	F, G, H, or relative M commands to get the actual distance traveled. The default 
        	for S is 4.
        */
        case "S": {
          const scaleNum = getInt(drawArgs[1], 4);
          scale = scaleNum / 4;
          isBlind = true;
          break;
        }
        // Z - Arc Line
        case "Z":
          arcRadius = getInt(drawArgs[1], 1);
          arcAngle1 = getInt(drawArgs[3], 1);
          arcAngle2 = getInt(drawArgs[5], 1);
          isArc = true;
          break;
        // A - Angle
        /*
        	Set angle n. n may range from 0 to 3, where 0 is 0°, 1 is 90°, 2 is 180°, and 3 is
        	270°. Figures rotated 90° or 270° are scaled so that they will appear the same size
        	as with 0° or 180° on a monitor screen with the standard aspect ratio of 4:3.
        */
        case "A":
          screenData.angle = degreesToRadian(
            clamp(getInt(drawArgs[1], 0), 0, 3) * 90
          );
          isBlind = true;
          break;
        // TA - T - Turn Angle
        case "T":
          screenData.angle = degreesToRadian(
            clamp(getInt(drawArgs[1], 0), -360, 360)
          );
          isBlind = true;
          break;
        // M - Move
        case "M":
          screenData.cursor.x = getInt(drawArgs[1], 1);
          screenData.cursor.y = getInt(drawArgs[3], 1);
          isBlind = true;
          break;
        default:
          isBlind = true;
      }
      if (!isBlind) {
        if (isArc) {
          screenData.api.arc(
            screenData.cursor.x,
            screenData.cursor.y,
            arcRadius,
            arcAngle1,
            arcAngle2
          );
        } else {
          screenData.api.line(
            lastCursor.x,
            lastCursor.y,
            screenData.cursor.x,
            screenData.cursor.y
          );
        }
      }
      isBlind = false;
      isArc = false;
      if (isReturn) {
        isReturn = false;
        screenData.cursor.x = lastCursor.x;
        screenData.cursor.y = lastCursor.y;
        screenData.angle = lastCursor.angle;
      }
      if (drawArgs[0] === "N") {
        isReturn = true;
      } else {
        lastCursor = {
          "x": screenData.cursor.x,
          "y": screenData.cursor.y,
          "angle": screenData.angle
        };
      }
      if (drawArgs[0] === "B") {
        isBlind = true;
      }
    }
  }

  // src-pi-2.0.0-alpha.1/modules/paint.js
  function init14() {
  }
  addCommand2("paint", paint, ["x", "y", "fillColor", "tolerance", "boundaryColor"]);
  function paint(screenData, options) {
    const x = getInt(options.x, null);
    const y = getInt(options.y, null);
    let fillColor = options.fillColor;
    let tolerance = getFloat(options.tolerance, 1);
    let boundaryColor = options.boundaryColor;
    if (x === null || y === null) {
      const error = new TypeError("paint: Parameters x and y must be integers");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (tolerance < 0 || tolerance > 1) {
      const error = new RangeError(
        "paint: Parameter tolerance must be a number between 0 and 1."
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    fillColor = getColorValueByRawInput(screenData, fillColor);
    if (fillColor === null) {
      const error = new RangeError("paint: Parameter fillColor is not a valid color format.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    getImageData(screenData);
    const data = screenData.imageData2;
    const width2 = screenData.width;
    const height2 = screenData.height;
    if (x < 0 || x >= width2 || y < 0 || y >= height2) {
      return;
    }
    const startIndex = (y * width2 + x) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];
    if (startR === fillColor.r && startG === fillColor.g && startB === fillColor.b && startA === fillColor.a) {
      return;
    }
    const weights = [0.2, 0.68, 0.07, 0.05];
    const maxDifference = 255 * 255 * weights.reduce((a, b) => a + b);
    const toleranceThreshold = tolerance * (2 - tolerance) * maxDifference;
    const visited = new Uint8Array(width2 * height2);
    const queue = [];
    queue.push({ "x": x, "y": y });
    visited[y * width2 + x] = 1;
    let shouldSkipPixel;
    if (boundaryColor !== null) {
      boundaryColor = getColorValueByRawInput(screenData, boundaryColor);
      if (boundaryColor === null) {
        const error = new RangeError(
          "paint: Parameter boundaryColor is not a valid color format."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      const refColor = {
        "r": boundaryColor.r,
        "g": boundaryColor.g,
        "b": boundaryColor.b,
        "a": boundaryColor.a
      };
      shouldSkipPixel = (pixelColor) => {
        const difference = calcColorDifference(refColor, pixelColor, weights);
        const similarity = maxDifference - difference;
        return similarity >= toleranceThreshold;
      };
    } else {
      const startColor = { "r": startR, "g": startG, "b": startB, "a": startA };
      shouldSkipPixel = (pixelColor) => {
        const difference = calcColorDifference(startColor, pixelColor, weights);
        const similarity = maxDifference - difference;
        return similarity < toleranceThreshold;
      };
    }
    let head = 0;
    while (head < queue.length) {
      const pixel = queue[head++];
      const px = pixel.x;
      const py = pixel.y;
      const i = (py * width2 + px) * 4;
      const pixelColor = {
        "r": data[i],
        "g": data[i + 1],
        "b": data[i + 2],
        "a": data[i + 3]
      };
      if (shouldSkipPixel(pixelColor)) {
        continue;
      }
      screenData.blend(screenData, pixel.x, pixel.y, fillColor);
      addToQueue(queue, visited, px + 1, py, width2, height2);
      addToQueue(queue, visited, px - 1, py, width2, height2);
      addToQueue(queue, visited, px, py + 1, width2, height2);
      addToQueue(queue, visited, px, py - 1, width2, height2);
    }
    setImageDirty(screenData);
  }
  function addToQueue(queue, visited, x, y, width2, height2) {
    if (x < 0 || x >= width2 || y < 0 || y >= height2) {
      return;
    }
    const index = y * width2 + x;
    if (visited[index] === 0) {
      visited[index] = 1;
      queue.push({ "x": x, "y": y });
    }
  }

  // src-pi-2.0.0-alpha.1/modules/images.js
  var m_images = {};
  var m_imageCount = 0;
  function init15() {
  }
  addCommand("loadImage", loadImage, ["src", "name", "onLoad", "onError"]);
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
  addCommand(
    "loadSpritesheet",
    loadSpritesheet,
    ["src", "name", "width", "height", "margin"]
  );
  function loadSpritesheet(options) {
    const src = options.src;
    let name = options.name;
    let spriteWidth = options.width;
    let spriteHeight = options.height;
    let margin = options.margin;
    let isAuto = false;
    if (margin == null) {
      margin = 0;
    }
    if (spriteWidth == null && spriteHeight == null) {
      isAuto = true;
      spriteWidth = 0;
      spriteHeight = 0;
      margin = 0;
    } else {
      spriteWidth = Math.round(spriteWidth);
      spriteHeight = Math.round(spriteHeight);
      margin = Math.round(margin);
    }
    if (!isAuto && (!Number.isInteger(spriteWidth) || !Number.isInteger(spriteHeight))) {
      const error = new TypeError("loadSpriteSheet: width and height must be integers.");
      error.code = "INVALID_DIMENSIONS";
      throw error;
    }
    if (!isAuto && (spriteWidth < 1 || spriteHeight < 1)) {
      const error = new RangeError(
        "loadSpriteSheet: width and height must be greater than 0."
      );
      error.code = "INVALID_DIMENSIONS";
      throw error;
    }
    if (!Number.isInteger(margin)) {
      const error = new TypeError("loadSpriteSheet: margin must be an integer.");
      error.code = "INVALID_MARGIN";
      throw error;
    }
    if (!name || name === "") {
      m_imageCount += 1;
      name = "" + m_imageCount;
    }
    loadImage({
      "src": src,
      "name": name,
      "onLoad": function() {
        const imageData = m_images[name];
        imageData.type = "spritesheet";
        imageData.spriteWidth = spriteWidth;
        imageData.spriteHeight = spriteHeight;
        imageData.margin = margin;
        imageData.frames = [];
        imageData.isAuto = isAuto;
        const width2 = imageData.image.width;
        const height2 = imageData.image.height;
        if (isAuto) {
          processSpriteSheetAuto(imageData, width2, height2);
        } else {
          processSpriteSheetFixed(imageData, width2, height2);
        }
      }
    });
    return name;
  }
  addCommand("removeImage", removeImage, ["name"]);
  function removeImage(options) {
    const name = options.name;
    if (typeof name !== "string") {
      const error = new TypeError("removeImage: name must be a string.");
      error.code = "INVALID_NAME";
      throw error;
    }
    delete m_images[name];
  }
  addCommand2("getImage", getImage, ["name", "x1", "y1", "x2", "y2"]);
  function getImage(screenData, options) {
    let name = options.name;
    const x1 = Math.round(options.x1);
    const y1 = Math.round(options.y1);
    const x2 = Math.round(options.x2);
    const y2 = Math.round(options.y2);
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      const error = new TypeError("getImage: parameters x1, x2, y1, y2 must be integers.");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    if (!name || name === "") {
      m_imageCount += 1;
      name = "" + m_imageCount;
    } else if (typeof name !== "string") {
      const error = new TypeError("getImage: name must be a string.");
      error.code = "INVALID_NAME";
      throw error;
    } else if (m_images[name]) {
      const error = new Error(`getImage: name "${name}" is already used; name must be unique.`);
      error.code = "DUPLICATE_NAME";
      throw error;
    }
    const canvas2 = document.createElement("canvas");
    const context = canvas2.getContext("2d");
    const width2 = Math.abs(x1 - x2);
    const height2 = Math.abs(y1 - y2);
    canvas2.width = width2;
    canvas2.height = height2;
    screenData.api.render();
    context.drawImage(screenData.canvas, x1, y1, width2, height2, 0, 0, width2, height2);
    m_images[name] = {
      "status": "ready",
      "image": canvas2,
      "type": "image",
      "width": width2,
      "height": height2
    };
    return name;
  }
  addCommand2("getSpritesheetData", getSpritesheetData, ["name"]);
  function getSpritesheetData(screenData, options) {
    const name = options.name;
    if (!m_images[name]) {
      const error = new Error("getSpritesheetData: invalid sprite name");
      error.code = "INVALID_NAME";
      throw error;
    }
    const sprite = m_images[name];
    if (sprite.type !== "spritesheet") {
      const error = new Error("getSpritesheetData: image is not a spritesheet");
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
  addCommand2(
    "drawImage",
    drawImage,
    ["name", "x", "y", "angle", "anchorX", "anchorY", "alpha", "scaleX", "scaleY"]
  );
  function drawImage(screenData, options) {
    const name = options.name;
    const x = options.x || 0;
    const y = options.y || 0;
    const angle = options.angle;
    const anchorX = options.anchorX;
    const anchorY = options.anchorY;
    const alpha = options.alpha;
    const scaleX = options.scaleX;
    const scaleY = options.scaleY;
    let image;
    if (typeof name === "string") {
      if (!m_images[name]) {
        const error = new Error(
          `drawImage: Image "${name}" not found.`
        );
        error.code = "IMAGE_NOT_FOUND";
        throw error;
      }
      const imageData = m_images[name];
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
      image = imageData.image;
    } else if (name && typeof name === "object") {
      if (name.screen === true) {
        image = name.canvas();
        if (!image) {
          const error = new Error("drawImage: Screen has no canvas.");
          error.code = "INVALID_SCREEN";
          throw error;
        }
      } else if (name.tagName === "CANVAS" || name.tagName === "IMG") {
        image = name;
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
      const error = new TypeError("drawImage: parameters x and y must be numbers");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    drawItem(
      screenData,
      image,
      x,
      y,
      angle,
      anchorX,
      anchorY,
      alpha,
      null,
      scaleX,
      scaleY
    );
  }
  addCommand2(
    "drawSprite",
    drawSprite,
    ["name", "frame", "x", "y", "angle", "anchorX", "anchorY", "alpha", "scaleX", "scaleY"]
  );
  function drawSprite(screenData, options) {
    const name = options.name;
    const frame = options.frame || 0;
    const x = options.x || 0;
    const y = options.y || 0;
    const angle = options.angle;
    const anchorX = options.anchorX;
    const anchorY = options.anchorY;
    const alpha = options.alpha;
    const scaleX = options.scaleX;
    const scaleY = options.scaleY;
    if (!m_images[name]) {
      const error = new Error("drawSprite: invalid sprite name");
      error.code = "INVALID_NAME";
      throw error;
    }
    const spriteData = m_images[name];
    if (spriteData.type !== "spritesheet") {
      const error = new Error("drawSprite: image is not a spritesheet");
      error.code = "NOT_A_SPRITESHEET";
      throw error;
    }
    if (!Number.isInteger(frame) || frame >= spriteData.frames.length || frame < 0) {
      const error = new RangeError("drawSprite: frame number is not valid");
      error.code = "INVALID_FRAME";
      throw error;
    }
    if (isNaN(x) || isNaN(y)) {
      const error = new TypeError("drawSprite: parameters x and y must be numbers");
      error.code = "INVALID_COORDINATES";
      throw error;
    }
    const img = spriteData.image;
    const frameData = spriteData.frames[frame];
    drawItem(screenData, img, x, y, angle, anchorX, anchorY, alpha, frameData, scaleX, scaleY);
  }
  function drawItem(screenData, img, x, y, angle, anchorX, anchorY, alpha, frameData, scaleX, scaleY) {
    if (scaleX == null || isNaN(Number(scaleX))) {
      scaleX = 1;
    }
    if (scaleY == null || isNaN(Number(scaleY))) {
      scaleY = 1;
    }
    if (angle == null) {
      angle = 0;
    }
    angle = degreesToRadian(angle);
    if (!anchorX) {
      anchorX = 0;
    }
    if (!anchorY) {
      anchorY = 0;
    }
    if (!alpha && alpha !== 0) {
      alpha = 255;
    }
    if (frameData) {
      anchorX = Math.round(frameData.width * anchorX);
      anchorY = Math.round(frameData.height * anchorY);
    } else {
      anchorX = Math.round(img.width * anchorX);
      anchorY = Math.round(img.height * anchorY);
    }
    const context = screenData.context;
    const oldAlpha = context.globalAlpha;
    context.globalAlpha = alpha / 255;
    screenData.api.render();
    context.translate(x, y);
    context.rotate(angle);
    context.scale(scaleX, scaleY);
    if (frameData == null) {
      context.drawImage(img, -anchorX, -anchorY);
    } else {
      context.drawImage(
        img,
        frameData.x,
        frameData.y,
        frameData.width,
        frameData.height,
        -anchorX,
        -anchorY,
        frameData.width,
        frameData.height
      );
    }
    context.scale(1 / scaleX, 1 / scaleY);
    context.rotate(-angle);
    context.translate(-x, -y);
    context.globalAlpha = oldAlpha;
  }
  function processSpriteSheetFixed(imageData, width2, height2) {
    let x1 = imageData.margin;
    let y1 = imageData.margin;
    let x2 = x1 + imageData.spriteWidth;
    let y2 = y1 + imageData.spriteHeight;
    while (y2 <= height2 - imageData.margin) {
      while (x2 <= width2 - imageData.margin) {
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
  function processSpriteSheetAuto(imageData, width2, height2) {
    const canvas2 = document.createElement("canvas");
    canvas2.width = width2;
    canvas2.height = height2;
    const context = canvas2.getContext("2d", { "willReadFrequently": true });
    context.drawImage(imageData.image, 0, 0);
    const data = context.getImageData(0, 0, width2, height2).data;
    const searched = new Uint8Array(width2 * height2);
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
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        const index = (i - 3) / 4;
        const x1 = index % width2;
        const y1 = Math.floor(index / width2);
        const pixelIndex = y1 * width2 + x1;
        if (searched[pixelIndex]) {
          continue;
        }
        const frameData = {
          "x": width2,
          "y": height2,
          "width": 0,
          "height": 0,
          "right": 0,
          "bottom": 0
        };
        const queue = [];
        queue.push({ "x": x1, "y": y1 });
        searched[pixelIndex] = 1;
        let head = 0;
        while (head < queue.length) {
          const pixel = queue[head++];
          const px = pixel.x;
          const py = pixel.y;
          frameData.x = Math.min(frameData.x, px);
          frameData.y = Math.min(frameData.y, py);
          frameData.right = Math.max(frameData.right, px);
          frameData.bottom = Math.max(frameData.bottom, py);
          for (const dir of dirs) {
            const nx = px + dir[0];
            const ny = py + dir[1];
            if (nx < 0 || nx >= width2 || ny < 0 || ny >= height2) {
              continue;
            }
            const nIndex = ny * width2 + nx;
            if (searched[nIndex]) {
              continue;
            }
            const dataIndex = nIndex * 4;
            if (data[dataIndex + 3] > 0) {
              searched[nIndex] = 1;
              queue.push({ "x": nx, "y": ny });
            }
          }
        }
        frameData.width = frameData.right - frameData.x + 1;
        frameData.height = frameData.bottom - frameData.y + 1;
        if (frameData.width + frameData.height > 4) {
          imageData.frames.push(frameData);
        }
      }
    }
  }

  // src-pi-2.0.0-alpha.1/modules/font.js
  var m_fonts = [];
  var m_fontBitmaps = {};
  var m_defaultFont = null;
  var m_nextFontId = 0;
  var m_nextFontBitmapId = 0;
  function init16() {
    addScreenDataItemGetter("font", () => m_defaultFont);
  }
  function getFontBitmap(bitmapId) {
    return m_fontBitmaps[bitmapId];
  }
  addCommand(
    "loadFont",
    loadFont,
    ["fontSrc", "width", "height", "charSet", "isEncoded"]
  );
  function loadFont(options) {
    const fontSrc = options.fontSrc;
    const width2 = Math.round(options.width);
    const height2 = Math.round(options.height);
    let charSet = options.charSet;
    const isEncoded = !!options.isEncoded;
    if (isNaN(width2) || isNaN(height2)) {
      const error = new TypeError("loadFont: width and height must be integers.");
      error.code = "INVALID_DIMENSIONS";
      throw error;
    }
    if (!charSet) {
      charSet = [];
      for (let i = 0; i < 256; i += 1) {
        charSet.push(i);
      }
    }
    if (!(Array.isArray(charSet) || typeof charSet === "string")) {
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
      "id": m_nextFontId,
      "width": width2,
      "height": height2,
      "data": [],
      "chars": chars,
      "charSet": charSet,
      "mode": isEncoded ? "pixel" : "bitmap",
      "bitmapId": null
    };
    m_fonts[font.id] = font;
    m_nextFontId += 1;
    if (isEncoded) {
      font.data = decompressFont(fontSrc, width2, height2);
    } else {
      loadFontFromImage(fontSrc, font);
    }
    return font.id;
  }
  addCommand("setDefaultFont", setDefaultFont, ["fontId"]);
  function setDefaultFont(options) {
    const fontId = parseInt(options.fontId);
    if (isNaN(fontId) || fontId < 0 || !m_fonts[fontId]) {
      const error = new RangeError("setDefaultFont: invalid fontId");
      error.code = "INVALID_FONT_ID";
      throw error;
    }
    m_defaultFont = m_fonts[fontId];
  }
  addCommand2("setFont", setFont, ["font"]);
  function setFont(screenData, options) {
    const fontInput = options.font;
    let font;
    if (typeof fontInput === "string") {
      screenData.context.font = fontInput;
      screenData.context.textBaseline = "top";
      font = {
        "name": screenData.context.font,
        "width": 10,
        "height": 10,
        "mode": "canvas"
      };
    } else if (m_fonts[fontInput]) {
      font = m_fonts[fontInput];
    } else {
      const error = new RangeError("setFont: invalid fontId");
      error.code = "INVALID_FONT_ID";
      throw error;
    }
    screenData.font = font;
    updatePrintCursorDimensions(screenData);
  }
  addCommand2("setFontSize", setFontSize, ["width", "height"]);
  function setFontSize(screenData, options) {
    if (screenData.font.mode !== "bitmap") {
      const error = new RangeError(
        "setFontSize: only bitmap fonts can change sizes. Load a bitmap font before setting the font size."
      );
      error.code = "INVALID_SIZE";
      throw error;
    }
    const width2 = getInt(options.width, null);
    const height2 = getInt(options.height, null);
    if (!width2 || width2 < 1 || !height2 || height2 < 1) {
      const error = new RangeError(
        "setFontSize: width and height must be an integer greater than 0"
      );
      error.code = "INVALID_SIZE";
      throw error;
    }
    screenData.font.width = width2;
    screenData.font.height = height2;
    updatePrintCursorDimensions(screenData);
  }
  addCommand("getAvailableFonts", getAvailableFonts, []);
  function getAvailableFonts() {
    const fonts = [];
    for (let i = 0; i < m_fonts.length; i++) {
      if (m_fonts[i]) {
        fonts.push({
          "id": m_fonts[i].id,
          "width": m_fonts[i].width,
          "height": m_fonts[i].height,
          "mode": m_fonts[i].mode
        });
      }
    }
    return fonts;
  }
  addCommand2("setChar", setChar, ["charCode", "data"]);
  function setChar(screenData, options) {
    let charCode = options.charCode;
    let data = options.data;
    if (typeof charCode === "string") {
      charCode = charCode.charCodeAt(0);
    } else {
      charCode = getInt(charCode, null);
      if (charCode === null) {
        const error = new TypeError("setChar: charCode must be an integer or a string");
        error.code = "INVALID_CHAR_CODE";
        throw error;
      }
    }
    const font = screenData.font;
    if (!Array.isArray(data)) {
      if (typeof data === "string") {
        data = hexToData(data, font.width, font.height);
      } else {
        const error = new TypeError("setChar: data must be a 2D array or an encode string");
        error.code = "INVALID_DATA";
        throw error;
      }
    }
    if (data.length !== font.height) {
      const error = new RangeError(
        `setChar: data height (${data.length}) must match font height (${font.height})`
      );
      error.code = "INVALID_DATA_HEIGHT";
      throw error;
    }
    for (let i = 0; i < data.length; i++) {
      if (!Array.isArray(data[i]) || data[i].length !== font.width) {
        const error = new RangeError(
          `setChar: data width at row ${i} must match font width (${font.width})`
        );
        error.code = "INVALID_DATA_WIDTH";
        throw error;
      }
    }
    const charIndex = font.chars[charCode];
    if (charIndex === void 0) {
      const error = new RangeError("setChar: character not in font character set");
      error.code = "CHAR_NOT_IN_FONT";
      throw error;
    }
    font.data[charIndex] = data;
  }
  function updatePrintCursorDimensions(screenData) {
    const font = screenData.font;
    if (font.mode === "canvas") {
      const tempSize = Math.round(screenData.context.measureText("M").width * 2);
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = tempSize;
      tempCanvas.height = tempSize;
      const tempContext = tempCanvas.getContext("2d", { "willReadFrequently": true });
      tempContext.font = screenData.context.font;
      tempContext.textBaseline = "top";
      tempContext.fillStyle = "#FF0000";
      const tempMessage = "WHMGLIyzjpgl_|,.";
      for (const c of tempMessage) {
        tempContext.fillText(c, 0, 0);
      }
      let minX = Infinity;
      let maxX = 0;
      let minY = Infinity;
      let maxY = 0;
      const data = tempContext.getImageData(0, 0, tempSize, tempSize).data;
      for (let y = 0; y < tempSize; y++) {
        for (let x = 0; x < tempSize; x++) {
          const index = (y * tempSize + x) * 4;
          if (data[index] === 255) {
            minX = Math.min(x, minX);
            maxX = Math.max(x, maxX);
            minY = Math.min(y, minY);
            maxY = Math.max(y, maxY);
          }
        }
      }
      screenData.font.width = maxX - minX;
      screenData.font.height = maxY - minY;
    }
    screenData.printCursor.cols = Math.floor(screenData.width / screenData.font.width);
    screenData.printCursor.rows = Math.floor(screenData.height / screenData.font.height);
  }
  function decompressFont(numStr, width2, height2) {
    const size = 32;
    const base = 32;
    let bin = "";
    const data = [];
    numStr = "" + numStr;
    const nums = numStr.split(",");
    for (let i2 = 0; i2 < nums.length; i2++) {
      let num = parseInt(nums[i2], base).toString(2);
      while (num.length < size) {
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
      for (let y = 0; y < height2; y += 1) {
        data[index].push([]);
        for (let x = 0; x < width2; x += 1) {
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
  function loadFontFromImage(fontSrc, font) {
    let img;
    const bitmap = {
      "image": null,
      "width": font.width,
      "height": font.height
    };
    if (typeof fontSrc === "string") {
      img = new Image();
      wait();
      img.onload = function() {
        bitmap.image = img;
        done();
      };
      img.onerror = function(err) {
        console.warn("loadFont: unable to load image for font.");
        done();
      };
      img.src = fontSrc;
    } else if (fontSrc instanceof HTMLImageElement) {
      bitmap.image = fontSrc;
    } else {
      const error = new TypeError("loadFont: fontSrc must be a string or Image element.");
      error.code = "INVALID_FONT_SRC";
      throw error;
    }
    font.bitmapId = m_nextFontBitmapId;
    m_nextFontBitmapId += 1;
    m_fontBitmaps[font.bitmapId] = bitmap;
  }

  // src-pi-2.0.0-alpha.1/modules/print.js
  function init17() {
    addScreenDataItem("printCursor", {
      "x": 0,
      "y": 0,
      "cols": 0,
      "rows": 0,
      "breakWord": true
    });
  }
  addCommand2("print", print, ["msg", "isInline", "isCentered"]);
  function print(screenData, options) {
    let msg = options.msg;
    const isInline = !!options.isInline;
    const isCentered = !!options.isCentered;
    if (screenData.font.height > screenData.height) {
      return;
    }
    if (msg === void 0 || msg === null) {
      msg = "";
    } else if (typeof msg !== "string") {
      msg = "" + msg;
    }
    msg = msg.replace(/\t/g, "    ");
    const parts = msg.split(/\n/);
    for (let i = 0; i < parts.length; i++) {
      startPrint(screenData, parts[i], isInline, isCentered);
    }
  }
  addCommand2("setPos", setPos, ["col", "row"]);
  function setPos(screenData, options) {
    const col = options.col;
    const row = options.row;
    if (col != null) {
      if (isNaN(col)) {
        const error = new TypeError("setPos: parameter col must be a number");
        error.code = "INVALID_COL";
        throw error;
      }
      let x = Math.floor(col * screenData.font.width);
      if (x > screenData.width) {
        x = screenData.width - screenData.font.width;
      }
      screenData.printCursor.x = x;
    }
    if (row != null) {
      if (isNaN(row)) {
        const error = new TypeError("setPos: parameter row must be a number");
        error.code = "INVALID_ROW";
        throw error;
      }
      let y = Math.floor(row * screenData.font.height);
      if (y > screenData.height) {
        y = screenData.height - screenData.font.height;
      }
      screenData.printCursor.y = y;
    }
  }
  addCommand2("setPosPx", setPosPx, ["x", "y"]);
  function setPosPx(screenData, options) {
    const x = options.x;
    const y = options.y;
    if (x != null) {
      if (isNaN(x)) {
        const error = new TypeError("setPosPx: parameter x must be a number");
        error.code = "INVALID_X";
        throw error;
      }
      screenData.printCursor.x = Math.round(x);
    }
    if (y != null) {
      if (isNaN(y)) {
        const error = new TypeError("setPosPx: parameter y must be a number");
        error.code = "INVALID_Y";
        throw error;
      }
      screenData.printCursor.y = Math.round(y);
    }
  }
  addCommand2("getPos", getPos, []);
  function getPos(screenData) {
    return {
      "col": Math.floor(
        screenData.printCursor.x / screenData.font.width
      ),
      "row": Math.floor(
        screenData.printCursor.y / screenData.font.height
      )
    };
  }
  addCommand2("getPosPx", getPosPx, []);
  function getPosPx(screenData) {
    return {
      "x": screenData.printCursor.x,
      "y": screenData.printCursor.y
    };
  }
  addCommand2("getCols", getCols, []);
  function getCols(screenData) {
    return screenData.printCursor.cols;
  }
  addCommand2("getRows", getRows, []);
  function getRows(screenData) {
    return screenData.printCursor.rows;
  }
  addCommand2("setWordBreak", setWordBreak, ["isEnabled"]);
  function setWordBreak(screenData, options) {
    screenData.printCursor.breakWord = !!options.isEnabled;
  }
  addCommand2("piCalcWidth", piCalcWidth, ["msg"]);
  function piCalcWidth(screenData, options) {
    const msg = options.msg || "";
    return screenData.font.width * msg.length;
  }
  addCommand2("canvasCalcWidth", canvasCalcWidth, ["msg"]);
  function canvasCalcWidth(screenData, options) {
    const msg = options.msg || "";
    return screenData.context.measureText(msg).width;
  }
  function startPrint(screenData, msg, isInline, isCentered) {
    const printCursor = screenData.printCursor;
    const font = screenData.font;
    const width2 = calcWidth(screenData, msg);
    if (isCentered) {
      printCursor.x = Math.floor((printCursor.cols - msg.length) / 2) * font.width;
    }
    if (!isInline && !isCentered && width2 + printCursor.x > screenData.width && msg.length > 1) {
      const overlap = width2 + printCursor.x - screenData.width;
      const onScreen = width2 - overlap;
      const onScreenPct = onScreen / width2;
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
      startPrint(screenData, msg1, isInline, isCentered);
      startPrint(screenData, msg2, isInline, isCentered);
      return;
    }
    if (printCursor.y + font.height > screenData.height) {
      if (font.mode === "canvas") {
        screenData.api.render();
      }
      shiftImageUp(screenData, font.height);
      printCursor.y -= font.height;
    }
    if (font.mode === "pixel") {
      piPrint(screenData, msg, printCursor.x, printCursor.y);
    } else if (font.mode === "bitmap") {
      bitmapPrint(screenData, msg, printCursor.x, printCursor.y);
    } else if (font.mode === "canvas") {
      canvasPrint(screenData, msg, printCursor.x, printCursor.y);
    }
    if (!isInline) {
      printCursor.y += font.height;
      printCursor.x = 0;
    } else {
      printCursor.x += font.width * msg.length;
      if (printCursor.x > screenData.width - font.width) {
        printCursor.x = 0;
        printCursor.y += font.height;
      }
    }
  }
  function shiftImageUp(screenData, yOffset) {
    if (yOffset <= 0) {
      return;
    }
    getImageData(screenData);
    for (let y = yOffset; y < screenData.height; y++) {
      for (let x = 0; x < screenData.width; x++) {
        const iDest = (screenData.width * y + x) * 4;
        const iSrc = (screenData.width * (y - yOffset) + x) * 4;
        const data = screenData.imageData2;
        data[iSrc] = data[iDest];
        data[iSrc + 1] = data[iDest + 1];
        data[iSrc + 2] = data[iDest + 2];
        data[iSrc + 3] = data[iDest + 3];
      }
    }
    for (let y = screenData.height - yOffset; y < screenData.height; y++) {
      for (let x = 0; x < screenData.width; x++) {
        const i = (screenData.width * y + x) * 4;
        screenData.imageData2[i] = 0;
        screenData.imageData2[i + 1] = 0;
        screenData.imageData2[i + 2] = 0;
        screenData.imageData2[i + 3] = 0;
      }
    }
    setImageDirty(screenData);
  }
  function calcWidth(screenData, msg) {
    const font = screenData.font;
    if (font.mode === "canvas") {
      return screenData.context.measureText(msg).width;
    }
    return font.width * msg.length;
  }
  function piPrint(screenData, msg, x, y) {
    const font = screenData.font;
    const defaultPal = screenData.pal;
    screenData.pal = [screenData.pal[0], screenData.color];
    for (let i = 0; i < msg.length; i++) {
      const charIndex = font.chars[msg.charCodeAt(i)];
      if (charIndex !== void 0) {
        screenData.api.put(font.data[charIndex], x + font.width * i, y);
      }
    }
    screenData.pal = defaultPal;
  }
  function canvasPrint(screenData, msg, x, y) {
    screenData.api.render();
    screenData.context.fillText(msg, x, y);
    screenData.imageData = null;
  }
  function bitmapPrint(screenData, msg, x, y) {
    screenData.api.render();
    const font = screenData.font;
    const bitmap = getFontBitmap(font.bitmapId);
    if (!bitmap) {
      const error = new TypeError("print: font bitmap not found");
      error.code = "FONT_BITMAP_NOT_FOUND";
      throw error;
    }
    const bitmapWidth = bitmap.image.width;
    const sw = bitmap.width;
    const sh = bitmap.height;
    const columns = Math.floor(bitmapWidth / sw);
    for (let i = 0; i < msg.length; i++) {
      const charIndex = font.chars[msg.charCodeAt(i)];
      if (charIndex !== void 0) {
        const sx = charIndex % columns * sw;
        const sy = Math.floor(charIndex / columns) * sh;
        const dx = x + font.width * i;
        screenData.context.drawImage(
          bitmap.image,
          sx,
          sy,
          sw,
          sh,
          dx,
          y,
          font.width,
          font.height
        );
      }
    }
    screenData.imageData = null;
  }

  // src-pi-2.0.0-alpha.1/modules/sound.js
  var m_audioContext = null;
  var m_audioPools = {};
  var m_nextAudioId = 0;
  var m_soundPool = {};
  var m_nextSoundId = 0;
  var m_volume = 0.75;
  function init18() {
  }
  function stopSoundById(soundId) {
    if (m_soundPool[soundId]) {
      m_soundPool[soundId].oscillator.stop(0);
    }
  }
  function createSound(audioContext, frequency, volume, attackTime, sustainTime, decayTime, stopTime, oType, waveTables, delay) {
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const master = audioContext.createGain();
    master.gain.value = m_volume;
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
  addCommand("createAudioPool", createAudioPool, ["src", "poolSize"]);
  function createAudioPool(options) {
    const src = options.src;
    let poolSize = getInt(options.poolSize, 1);
    if (!src || typeof src !== "string") {
      const error = new TypeError("createAudioPool: Parameter src must be a non-empty string.");
      error.code = "INVALID_SRC";
      throw error;
    }
    if (poolSize < 1) {
      const error = new RangeError(
        "createAudioPool: Parameter poolSize must be an integer greater than 0."
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
  addCommand("deleteAudioPool", deleteAudioPool, ["audioId"]);
  function deleteAudioPool(options) {
    const audioId = options.audioId;
    if (!m_audioPools[audioId]) {
      const error = new Error(`deleteAudioPool: Audio pool "${audioId}" not found.`);
      error.code = "AUDIO_POOL_NOT_FOUND";
      throw error;
    }
    for (let i = 0; i < m_audioPools[audioId].pool.length; i++) {
      const poolItem = m_audioPools[audioId].pool[i];
      poolItem.audio.pause();
      clearTimeout(poolItem.timeout);
    }
    delete m_audioPools[audioId];
  }
  addCommand(
    "playAudioPool",
    playAudioPool,
    ["audioId", "volume", "startTime", "duration"]
  );
  function playAudioPool(options) {
    const audioId = options.audioId;
    const volume = getFloat(options.volume, 1);
    const startTime = getFloat(options.startTime, 0);
    const duration = getFloat(options.duration, 0);
    if (!m_audioPools[audioId]) {
      const error = new Error(`playAudioPool: Audio pool "${audioId}" not found.`);
      error.code = "AUDIO_POOL_NOT_FOUND";
      throw error;
    }
    if (volume < 0 || volume > 1) {
      const error = new RangeError(
        "playAudioPool: Parameter volume must be a number between 0 and 1."
      );
      error.code = "INVALID_VOLUME";
      throw error;
    }
    if (startTime < 0) {
      const error = new RangeError(
        "playAudioPool: Parameter startTime must be a number greater than or equal to 0."
      );
      error.code = "INVALID_START_TIME";
      throw error;
    }
    if (duration < 0) {
      const error = new RangeError(
        "playAudioPool: Parameter duration must be a number greater than or equal to 0."
      );
      error.code = "INVALID_DURATION";
      throw error;
    }
    const audioItem = m_audioPools[audioId];
    if (audioItem.pool.length === 0) {
      const error = new Error("playAudioPool: Audio pool has no sounds loaded.");
      error.code = "EMPTY_POOL";
      throw error;
    }
    const poolItem = audioItem.pool[audioItem.index];
    const audio = poolItem.audio;
    audio.volume = m_volume * volume;
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
  addCommand("stopAudioPool", stopAudioPool, ["audioId"]);
  function stopAudioPool(options) {
    const audioId = options.audioId;
    if (audioId == null) {
      for (const poolId in m_audioPools) {
        for (let j = 0; j < m_audioPools[poolId].pool.length; j++) {
          const poolItem = m_audioPools[poolId].pool[j];
          poolItem.audio.pause();
          clearTimeout(poolItem.timeout);
        }
      }
      return;
    }
    if (!m_audioPools[audioId]) {
      const error = new Error(`stopAudioPool: Audio pool "${audioId}" not found.`);
      error.code = "AUDIO_POOL_NOT_FOUND";
      throw error;
    }
    for (let i = 0; i < m_audioPools[audioId].pool.length; i++) {
      const poolItem = m_audioPools[audioId].pool[i];
      poolItem.audio.pause();
      clearTimeout(poolItem.timeout);
    }
  }
  addCommand("sound", sound, [
    "frequency",
    "duration",
    "volume",
    "oType",
    "delay",
    "attack",
    "decay"
  ]);
  function sound(options) {
    const frequency = Math.round(getFloat(options.frequency, 440));
    const duration = getFloat(options.duration, 1);
    const volume = getFloat(options.volume, 1);
    let oType = options.oType != null ? options.oType : "triangle";
    const delay = getFloat(options.delay, 0);
    const attack = getFloat(options.attack, 0);
    const decay = getFloat(options.decay, 0.1);
    if (duration < 0) {
      const error = new RangeError(
        "sound: Parameter duration must be a number greater than or equal to 0."
      );
      error.code = "INVALID_DURATION";
      throw error;
    }
    if (volume < 0 || volume > 1) {
      const error = new RangeError("sound: Parameter volume must be a number between 0 and 1.");
      error.code = "INVALID_VOLUME";
      throw error;
    }
    if (attack < 0) {
      const error = new RangeError(
        "sound: Parameter attack must be a number greater than or equal to 0."
      );
      error.code = "INVALID_ATTACK";
      throw error;
    }
    if (delay < 0) {
      const error = new RangeError(
        "sound: Parameter delay must be a number greater than or equal to 0."
      );
      error.code = "INVALID_DELAY";
      throw error;
    }
    let waveTables = null;
    if (Array.isArray(oType)) {
      if (oType.length !== 2 || oType[0].length === 0 || oType[1].length === 0 || oType[0].length !== oType[1].length) {
        const error = new TypeError(
          "sound: Parameter oType array must contain two non-empty arrays of equal length."
        );
        error.code = "INVALID_WAVE_TABLE";
        throw error;
      }
      waveTables = [];
      for (let i = 0; i < oType.length; i++) {
        for (let j = 0; j < oType[i].length; j++) {
          if (isNaN(oType[i][j])) {
            const error = new TypeError(
              "sound: Parameter oType array must only contain numbers."
            );
            error.code = "INVALID_WAVE_TABLE_VALUE";
            throw error;
          }
        }
        waveTables.push(new Float32Array(oType[i]));
      }
      oType = "custom";
    } else if (typeof oType !== "string") {
      const error = new TypeError("sound: Parameter oType must be a string or an array.");
      error.code = "INVALID_OTYPE";
      throw error;
    } else {
      const validTypes = ["triangle", "sine", "square", "sawtooth"];
      if (validTypes.indexOf(oType) === -1) {
        const error = new Error(
          "sound: Parameter oType must be one of: triangle, sine, square, sawtooth."
        );
        error.code = "INVALID_OTYPE";
        throw error;
      }
    }
    if (!m_audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      m_audioContext = new AudioContextClass();
    }
    const stopTime = attack + duration + decay;
    return createSound(
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
  addCommand("stopSound", stopSound, ["soundId"]);
  function stopSound(options) {
    const soundId = options.soundId;
    if (soundId == null) {
      for (const id in m_soundPool) {
        m_soundPool[id].oscillator.stop(0);
      }
      return;
    }
    if (!m_soundPool[soundId]) {
      return;
    }
    m_soundPool[soundId].oscillator.stop(0);
  }
  addCommand("setVolume", setVolume, ["volume"]);
  function setVolume(options) {
    const volume = getFloat(options.volume, 0.75);
    if (volume < 0 || volume > 1) {
      const error = new RangeError(
        "setVolume: Parameter volume must be a number between 0 and 1."
      );
      error.code = "INVALID_VOLUME";
      throw error;
    }
    m_volume = volume;
    for (const soundId in m_soundPool) {
      const sound2 = m_soundPool[soundId];
      if (volume === 0) {
        sound2.master.gain.exponentialRampToValueAtTime(
          0.01,
          sound2.audioContext.currentTime + 0.1
        );
        sound2.master.gain.setValueAtTime(
          0,
          sound2.audioContext.currentTime + 0.11
        );
      } else {
        sound2.master.gain.exponentialRampToValueAtTime(
          volume,
          sound2.audioContext.currentTime + 0.1
        );
      }
    }
    for (const poolId in m_audioPools) {
      for (let j = 0; j < m_audioPools[poolId].pool.length; j++) {
        const poolItem = m_audioPools[poolId].pool[j];
        poolItem.audio.volume = m_volume * poolItem.volume;
      }
    }
  }
  function loadAudio(audioItem, audio, retryCount = 3) {
    function audioReady() {
      audioItem.pool.push({
        "audio": audio,
        "timeout": 0,
        "volume": 1
      });
      audio.removeEventListener("canplay", audioReady);
      done();
    }
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
        console.error("createAudioPool: " + errors[index]);
        if (retryCount > 0) {
          setTimeout(() => {
            audio.removeEventListener("canplay", audioReady);
            audio.removeEventListener("error", audioError);
            const newAudio = new Audio(audio.src);
            loadAudio(audioItem, newAudio, retryCount - 1);
          }, 100);
        } else {
          console.error("createAudioPool: Max retries exceeded for " + audio.src);
          done();
        }
      } else {
        console.error("createAudioPool: Unknown error - " + errorCode);
        done();
      }
    }
    if (retryCount === 3) {
      wait();
    }
    audio.addEventListener("canplay", audioReady);
    audio.addEventListener("error", audioError);
  }

  // src-pi-2.0.0-alpha.1/modules/play.js
  var m_tracks = {};
  var m_allTracks = [];
  var m_lastTrackId = 0;
  var m_playData = [];
  var m_notesData = {
    "A": [27.5, 55, 110, 220, 440, 880, 1760, 3520, 7040, 14080],
    "A#": [29.14, 58.27, 116.541, 233.082, 466.164, 932.328, 1864.655, 3729.31, 7458.62, 14917.24],
    "B": [30.87, 61.74, 123.471, 246.942, 493.883, 987.767, 1975.533, 3951.066, 7902.132, 15804.264],
    "C": [16.35, 32.7, 65.41, 130.813, 261.626, 523.251, 1046.502, 2093.005, 4186.009, 8372.018],
    "C#": [17.32, 34.65, 69.296, 138.591, 277.183, 554.365, 1108.731, 2217.461, 4434.922, 8869.844],
    "D": [18.35, 36.71, 73.416, 146.832, 293.665, 587.33, 1174.659, 2349.318, 4698.636, 9397.272],
    "D#": [19.45, 38.89, 77.782, 155.563, 311.127, 622.254, 1244.508, 2489.016, 4978.032, 9956.064],
    "E": [20.6, 41.2, 82.407, 164.814, 329.628, 659.255, 1318.51, 2637.021, 5274.042, 10548.084],
    "F": [21.83, 43.65, 87.307, 174.614, 349.228, 698.456, 1396.913, 2793.826, 5587.652, 11175.304],
    "F#": [23.12, 46.25, 92.499, 184.997, 369.994, 739.989, 1479.978, 2959.955, 5919.91, 11839.82],
    "G": [24.5, 49, 97.999, 195.998, 391.995, 783.991, 1567.982, 3135.964, 6271.928, 12543.856],
    "G#": [25.96, 51.91, 103.826, 207.652, 415.305, 830.609, 1661.219, 3322.438, 6644.876, 13289.752]
  };
  var m_allNotes = [
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
  function init19() {
  }
  addCommand("play", play, ["playString"]);
  function play(options) {
    let playString = options.playString;
    if (typeof playString !== "string") {
      const error = new TypeError("play: Parameter playString must be a string.");
      error.code = "INVALID_PLAY_STRING";
      throw error;
    }
    const trackId = createTrack(playString);
    m_playData = [];
    playTrack(trackId);
    m_playData.sort((a, b) => a.time - b.time);
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    for (let i = 0; i < m_playData.length; i++) {
      const playData = m_playData[i];
      playData.track.sounds.push(
        createSound(
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
  addCommand("stopPlay", stopPlay, ["trackId"]);
  function stopPlay(options) {
    const trackId = options.trackId;
    if (trackId === null) {
      for (let i = 0; i < m_allTracks.length; i++) {
        const track = m_tracks[m_allTracks[i]];
        if (track) {
          for (let j = 0; j < track.sounds.length; j++) {
            stopSoundById(track.sounds[j]);
          }
          delete m_tracks[m_allTracks[i]];
        }
      }
      m_allTracks.length = 0;
      return;
    }
    if (m_tracks[trackId]) {
      const track = m_tracks[trackId];
      for (let j = 0; j < track.sounds.length; j++) {
        stopSoundById(track.sounds[j]);
      }
      removeTrack(trackId);
    }
  }
  function createTrack(playString) {
    let firstTrackId;
    playString = playString.split(/\s+/).join("").toUpperCase();
    const waveTables = [];
    let start = 0;
    while (start > -1) {
      start = playString.indexOf("[[");
      if (start > -1) {
        const end = playString.indexOf("]]", start);
        waveTables.push(playString.substring(start, end + 2));
        const i = waveTables.length - 1;
        playString = playString.replace(waveTables[i], "W" + i);
      }
    }
    for (let i = 0; i < waveTables.length; i++) {
      waveTables[i] = JSON.parse(waveTables[i]);
      if (waveTables[i].length !== 2 || waveTables[i][0].length !== waveTables[i][1].length) {
        console.error(
          "play: Wavetables must have 2 arrays of same length. Defaulting to triangle wave."
        );
        waveTables[i] = "triangle";
        continue;
      }
      for (let j = 0; j < 2; j++) {
        for (let k = 0; k < waveTables[i][j].length; k++) {
          waveTables[i][j][k] = parseFloat(waveTables[i][j][k]);
          if (isNaN(waveTables[i][j][k])) {
            waveTables[i][j][k] = 0;
          }
        }
        waveTables[i][j] = new Float32Array(waveTables[i][j]);
      }
    }
    const trackStrings = playString.split(",");
    const trackIds = [];
    const regString = "(?=WS|WQ|WW|WT|W\\d[\\d]?|V\\d|Q\\d|O\\d|\\<|\\>|N\\d\\d?|L\\d\\d?|MS|MN|ML|MU\\d|MU\\-\\d|MK\\d[\\d]?[\\d]?|MZ\\d[\\d]?[\\d]?|MX\\d[\\d]?[\\d]?|MY\\d[\\d]?[\\d]?|MW|P[\\d]?|T\\d|[[A|B|C|D|E|F|G][\\d]?[\\+|\\-|\\#|\\.\\.?]?)";
    const reg = new RegExp(regString);
    let lastNote;
    for (let i = 0; i < trackStrings.length; i++) {
      trackStrings[i] = trackStrings[i].replace(/SINE/g, "WS");
      trackStrings[i] = trackStrings[i].replace(/SQUARE/g, "WQ");
      trackStrings[i] = trackStrings[i].replace(/SAWTOOTH/g, "WW");
      trackStrings[i] = trackStrings[i].replace(/TRIANGLE/g, "WT");
      trackStrings[i] = trackStrings[i].replace(/MD/g, "MZ");
      trackStrings[i] = trackStrings[i].replace(/MA/g, "MY");
      trackStrings[i] = trackStrings[i].replace(/MT/g, "MX");
      trackStrings[i] = trackStrings[i].replace(/MO/g, "MU");
      trackStrings[i] = trackStrings[i].replace(/MB/g, "");
      trackStrings[i] = trackStrings[i].replace(/MF/g, "");
      const trackId = m_lastTrackId;
      if (firstTrackId === void 0) {
        firstTrackId = trackId;
      }
      m_lastTrackId += 1;
      m_tracks[trackId] = {
        "id": trackId,
        "notes": [],
        "noteId": 0,
        "decayRate": 0.2,
        "attackRate": 0.15,
        "sustainRate": 0.65,
        "fullNote": false,
        "extra": 1,
        "space": "normal",
        "interval": 0,
        "time": 0,
        "simultaneousPlay": i > 0,
        "tempo": 60 / 120,
        "noteLength": 0.25,
        "pace": 0.875,
        "octave": 4,
        "octaveExtra": 0,
        "volume": 1,
        "trackIds": trackIds,
        "type": "triangle",
        "waveTables": waveTables,
        "sounds": []
      };
      m_allTracks.push(trackId);
      trackIds.push(trackId);
      if (i > 0) {
        lastNote.simultaneousPlay = trackId;
      }
      const trackParts = trackStrings[i].split(reg);
      for (let j = 0; j < trackParts.length; j++) {
        const index = trackParts[j].indexOf("-");
        if (index > -1 && "ABCDEFG".indexOf(trackParts[j][0]) === -1) {
          const noteData = {
            "name": trackParts[j].substring(0, index),
            "val": trackParts[j].substring(index)
          };
          m_tracks[trackId].notes.push(noteData);
          lastNote = noteData;
        } else {
          const noteParts = trackParts[j].split(/(\d+)/);
          const noteData = {
            "name": noteParts[0]
          };
          if (noteParts.length > 1) {
            noteData.val = noteParts[1];
          }
          m_tracks[trackId].notes.push(noteData);
          lastNote = noteData;
        }
      }
    }
    return firstTrackId;
  }
  function playTrack(trackId) {
    const track = m_tracks[trackId];
    if (track.noteId >= track.notes.length) {
      return;
    }
    const cmd = track.notes[track.noteId];
    let frequency = 0;
    let val;
    let wait2 = false;
    track.extra = 0;
    switch (cmd.name.charAt(0)) {
      case "A":
      case "B":
      case "C":
      case "D":
      case "E":
      case "F":
      case "G":
        frequency = processNote(track, cmd);
        wait2 = true;
        break;
      case "N":
        if (!isNaN(Number(cmd.val))) {
          val = getInt(cmd.val, 0);
          if (val >= 0 && val < m_allNotes.length) {
            frequency = m_allNotes[val];
          }
          wait2 = true;
        }
        break;
      case "O":
        if (!isNaN(Number(cmd.val))) {
          val = getInt(cmd.val, 4);
          if (val >= 0 && val < m_notesData["A"].length) {
            track.octave = val;
          }
        }
        break;
      case ">":
        track.octave += 1;
        if (track.octave >= m_notesData["A"].length) {
          track.octave = m_notesData["A"].length - 1;
        }
        break;
      case "<":
        track.octave -= 1;
        if (track.octave < 0) {
          track.octave = 0;
        }
        break;
      case "L":
        if (!isNaN(Number(cmd.val))) {
          val = getInt(cmd.val, 1);
          track.noteLength = getNoteLength(val);
        }
        break;
      case "T":
        if (!isNaN(Number(cmd.val))) {
          val = getInt(cmd.val, 120);
          if (val >= 32 && val < 256) {
            track.tempo = 60 / val;
          }
        }
        break;
      case "M":
        processMusic(track, cmd);
        break;
      case "P":
        if (!isNaN(Number(cmd.val))) {
          wait2 = true;
          val = getInt(cmd.val, 1);
          track.extra = getNoteLength(val);
        }
        break;
      case "V":
        if (!isNaN(Number(cmd.val))) {
          val = getInt(cmd.val, 50);
          if (val < 0) {
            val = 0;
          } else if (val > 100) {
            val = 100;
          }
          track.volume = val / 100;
        }
        break;
      case "W":
        processWaveform(track, cmd);
        break;
    }
    if (track.extra > 0) {
      track.interval = track.tempo * track.extra * track.pace * 4;
    } else {
      track.interval = track.tempo * track.noteLength * track.pace * 4;
    }
    if (m_tracks[cmd.simultaneousPlay]) {
      m_tracks[cmd.simultaneousPlay].time = track.time;
      copyTrackData(m_tracks[cmd.simultaneousPlay].id, trackId);
      playTrack(m_tracks[cmd.simultaneousPlay].id);
    }
    if (frequency > 0) {
      playNote(track, frequency);
    }
    track.noteId += 1;
    if (track.noteId < track.notes.length) {
      if (wait2) {
        track.time += track.interval;
      }
      playTrack(trackId);
    } else {
      setTimeout(() => {
        if (m_tracks[trackId]) {
          removeTrack(trackId);
        }
      }, (track.time + track.interval) * 1e3);
    }
  }
  function processNote(track, cmd) {
    let note = cmd.name;
    note = note.replace(/\+/g, "#");
    note = note.replace("C-", "B");
    note = note.replace("D-", "C#");
    note = note.replace("E-", "D#");
    note = note.replace("G-", "F#");
    note = note.replace("A-", "G#");
    note = note.replace("B-", "A#");
    note = note.replace("E#", "F");
    note = note.replace("B#", "C");
    if (cmd.name.indexOf("..") > 0) {
      track.extra = 1.75 * track.noteLength;
    } else if (cmd.name.indexOf(".") > 0) {
      track.extra = 1.5 * track.noteLength;
    }
    note = note.replace(/\./g, "");
    let frequency = 0;
    if (m_notesData[note]) {
      const octave = track.octave + track.octaveExtra;
      if (octave < m_notesData[note].length) {
        frequency = m_notesData[note][octave];
      }
    }
    if (!isNaN(Number(cmd.val))) {
      const val = getInt(cmd.val, 1);
      track.extra = getNoteLength(val);
    }
    return frequency;
  }
  function processMusic(track, cmd) {
    switch (cmd.name) {
      case "MS":
        track.pace = 0.75;
        break;
      case "MN":
        track.pace = 0.875;
        break;
      case "ML":
        track.pace = 1;
        break;
      case "MU":
        if (!isNaN(Number(cmd.val))) {
          const val = getInt(cmd.val, 0);
          track.octaveExtra = val;
        }
        break;
      case "MY":
        if (!isNaN(Number(cmd.val))) {
          const val = getInt(cmd.val, 25);
          track.attackRate = val / 100;
        }
        break;
      case "MX":
        if (!isNaN(Number(cmd.val))) {
          const val = getInt(cmd.val, 25);
          track.sustainRate = val / 100;
        }
        break;
      case "MZ":
        if (!isNaN(Number(cmd.val))) {
          const val = getInt(cmd.val, 25);
          track.decayRate = val / 100;
        }
        break;
      case "MW":
        track.fullNote = !track.fullNote;
        break;
    }
  }
  function processWaveform(track, cmd) {
    if (cmd.name === "WS") {
      track.type = "sine";
    } else if (cmd.name === "WQ") {
      track.type = "square";
    } else if (cmd.name === "WW") {
      track.type = "sawtooth";
    } else if (cmd.name === "WT") {
      track.type = "triangle";
    } else if (!isNaN(Number(cmd.val))) {
      const val = getInt(cmd.val, -1);
      if (track.waveTables[val]) {
        track.type = val;
      }
    }
  }
  function playNote(track, frequency) {
    const volume = track.volume;
    const attackTime = track.interval * track.attackRate;
    const sustainTime = track.interval * track.sustainRate;
    const decayTime = track.interval * track.decayRate;
    let stopTime;
    if (track.fullNote && attackTime + sustainTime + decayTime > track.interval) {
      stopTime = track.interval;
    } else {
      stopTime = attackTime + sustainTime + decayTime;
    }
    let oType;
    let waveTables = null;
    if (typeof track.type === "string") {
      oType = track.type;
    } else {
      waveTables = track.waveTables[track.type];
      if (Array.isArray(waveTables)) {
        oType = "custom";
      } else {
        oType = waveTables;
        waveTables = null;
      }
    }
    const soundData = {
      "frequency": frequency,
      "volume": volume,
      "attackTime": attackTime,
      "sustainTime": sustainTime,
      "decayTime": decayTime,
      "stopTime": stopTime,
      "oType": oType,
      "waveTables": waveTables,
      "time": track.time,
      "track": track
    };
    m_playData.push(soundData);
  }
  function copyTrackData(trackDestId, trackSourceId) {
    const trackDest = m_tracks[trackDestId];
    const trackSource = m_tracks[trackSourceId];
    trackDest.decayRate = trackSource.decayRate;
    trackDest.attackRate = trackSource.attackRate;
    trackDest.sustainRate = trackSource.sustainRate;
    trackDest.fullNote = trackSource.fullNote;
    trackDest.extra = trackSource.extra;
    trackDest.space = trackSource.space;
    trackDest.interval = trackSource.interval;
    trackDest.tempo = trackSource.tempo;
    trackDest.noteLength = trackSource.noteLength;
    trackDest.pace = trackSource.pace;
    trackDest.octave = trackSource.octave;
    trackDest.octaveExtra = trackSource.octaveExtra;
    trackDest.volume = trackSource.volume;
    trackDest.type = trackSource.type;
  }
  function removeTrack(trackId) {
    const trackIds = m_tracks[trackId].trackIds;
    for (let i = trackIds.length; i >= 0; i--) {
      delete m_tracks[trackIds[i]];
    }
    for (let i = m_allTracks.length - 1; i >= 0; i--) {
      if (!m_tracks[m_allTracks[i]]) {
        m_allTracks.splice(i, 1);
      }
    }
  }
  function getNoteLength(val) {
    if (val >= 1 && val < 65) {
      return 1 / val;
    }
    return 0.875;
  }

  // src-pi-2.0.0-alpha.1/core/plugins.js
  var m_plugins = [];
  var m_api2 = null;
  var m_isInitialized2 = false;
  function init20() {
    m_api2 = getApi();
    m_isInitialized2 = true;
    processEarlyRegistrations();
  }
  addCommand("registerPlugin", registerPlugin, ["name", "version", "description", "init"]);
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
    if (m_isInitialized2) {
      initializePlugin(pluginInfo);
    }
  }
  addCommand("getPlugins", getPlugins, []);
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
    const pluginApi = {
      "addCommand": addCommand,
      "addScreenCommand": addCommand2,
      "addPixelCommand": addPixelCommand,
      "addAACommand": addAACommand,
      "addScreenDataItem": addScreenDataItem,
      "addScreenDataItemGetter": addScreenDataItemGetter,
      "addScreenInternalCommands": addScreenInternalCommands,
      "addScreenInitFunction": addScreenInitFunction,
      "addScreenCleanupFunction": addScreenCleanupFunction,
      "getApi": () => m_api2,
      "utils": utils_exports
    };
    try {
      pluginInfo.config.init(pluginApi);
      pluginInfo.initialized = true;
    } catch (error) {
      const pluginError = new Error(
        `registerPlugin: Failed to initialize plugin '${pluginInfo.name}': ${error.message}`
      );
      pluginError.code = "PLUGIN_INIT_FAILED";
      pluginError.originalError = error;
      throw pluginError;
    }
    processApi();
  }
  function processEarlyRegistrations() {
    for (const pluginInfo of m_plugins) {
      if (!pluginInfo.initialized) {
        initializePlugin(pluginInfo);
      }
    }
  }

  // src-pi-2.0.0-alpha.1/assets/font-data.js
  function loadBuiltInFonts(api2) {
    api2.loadFont(
      "0,14004,2602800,oidnrt,3po8cff,3vnhgs4,1uv77og,3hpuv70,73g00,3vjgoef,3o00000,0,71ji,k9o000,1sg,1ogoc3p,jp4ir8,19fvt51,31ovfn3,cevfh,31vrooc,1tv52h8,2g0kula,2d2hcsp,8r2jg0,3vvvj,f33opv,8efh0g,3ho84fj,2200idv,2c40237,3r4g000,87000i,3vv901h,3jptvvv,3vnjpsc,0,g8420,22h800,57p9,3p80ea7,237000i,889019,111cc02,0,88420g,g4211,28oc,140011o,1000000,11000,1s00000,400,3333100,sjam9o,1g8423,203i888,1s060ho,hg0654,2fgg1sg,1o2e01p,3p4e07,211hgg0,oi64hg,1h4e13,31g0c,o00100,gg444,41000v,v0010,1088803,2110080,sqb41o,1h4if4,20729oi,1o07421,1o0s94,19701sg,1sgf03p,3p0g03,384p4c0,14if4i8,1o8423,201o84i,s04ihg,2h40842,43o12r,1ul8g25,2blej03,28ka4s0,s97i10,1h4ib3,10729oi,140321g,ho0v21,21014i,14i6025,a4k404,1al9ok0,12a22i4,24k421,7g8og,1s06210,21g1gc3,30g0c2,42300g,2g00000,1v,o40000,1o2f3,10210s9,s003i1,1o0211,251g00c,14s700g,23gg800,6kjo4s,ge4i94,8021,g04,1884218,3180421,21000a,1ul8g01,3294i00,64i8o0,c5310,200ca30,2102ok8,g003j0,3jo0023,221000i,14i6g00,24k400,8lbsk0,a2118,14i70,2e01s44,u02230,20g0630,31g082,622019,1000001,74a5u0,sg83go,3i80i93,30110oi,1oe22jg,joqh07,17hlg4,1o2f39g,33g4u6j,2841o66,gkc971,34g0oie,e411h4,3gsi030,211osh6,423hg0,1g84720,230g8e9,c94jp4,1goi97i,133p0u8,u06pmr,1sjf94j,34i8c93,94hg0c,14i604l,3inbvgk,2603ooc,1tdvstn,3phsif4,2prfurv,2qc67i1,3ooe4n,42rp8k,gs473h,jh8ua3,561igo,ggc231,30gg842,e110oi,14c2229,i8o887,94i9si,1km94jh,301s003,2703o00,40108,3g000f4,u,40g951,108d0kc,630gg0,g84000,2a8i000,92a800,1404g28,2mkll5,1lbfvdv,2rv210g,10g8421,u10g9s,84u118,2hbka50,7oka,1s217g,11bka5e,252h8ka,ka0fg8,n8kat0,21fg0ka,lu000j,30g9s00,7g84,8421o0,g84vg,1v,84210g,1og8000,vg0084,9v210g,1og8722,252hcka,kb421s,u842,352nc00,3u00fo0,7cka5i,42p81v,vg1b,2o01r51,vg03u0,ka5fo0,3u00f,320001v,ka52h8,3o0043h,21o007,843h00,ua52,252nska,9v217s,10g84u0,7,84vvvv,3vvu000,vvvtgo,1goc60o,1goc63f,3vvo000,2e53g,hp5upf,287i90g,10g003s,2h81uh4,44no00,1ska200,18s880,etgg84,1sc94hh,3hh4u94,267k631,15jfk3p,2i9s0fb,1f0004u,2iuo01p,221so70,64i94i,3u0vg7s,gs40,e01088,1o0020g,23g0452,421042,425110,3g0800,5500kk,oi6000,400,c,1gg,12go062,252g1o2,88f000,1ose00",
      6,
      6,
      null,
      true
    );
    api2.loadFont(
      "0,ugs,3gvtm2u,1tvmss7,vtskvf,2v710g0,g8efjg,21008e2,vfl8gs,g8e77p,311o003,f7hg00,3vvpoc7,vvu045,h8igg0,3v1mrdm,3efu71h,1ep4i8o,oi94hg,33oof4j,34233hg,u97i95,cq08mn,2pspiqc,21gsfn3,400233,2v3go40,gsv213,3jggka5,a50180,1val6h8,2h80e9j,94hj4s,3p,3jo08ef,24fjghv,gsvah0,2100842,lfjgg0,82fgg,2000044,v41000,8421,3g00098,1voa800,8477r,3g000vf,2e21000,0,8e7,4200g0,18ka000,kaf,2afih80,gug70b,33000p9,442ac0,gk4aki,1380844,0,ggg841,100g41,211100,k4fh1,1000021,fh0g00,0,2110000,f00000,0,210000g,2222200,1p2jamb,jg08ca,4213s0,1p21332,no0sh0,260k9o0,8ca97o,11o1ug8,u0k9o0,oggf4a,jg1uh1,442100,1p2h74a,jg0sh8,2f0g9o0,84000,2100042,10gg,888820,20g000f,2007o00,10820gg,2200sh0,22200g0,1p2nalq,3g08a8,2hfka40,3oi9729,ng0c98,g828o0,3oi94i9,ng1u94,e42bs0,3si8721,700c98,g9i8s0,252hfka,k80s42,4211o0,s4214i,1301ia5,c52j60,3gg8421,no12ra,2l8ka40,25il9ka,k80sh8,2h8k9o0,3oi9721,700sh8,2h8l9o3,3oi9731,1680sh8,e0k9o0,3ta4210,23g12h8,2h8k9o0,252h8k9,11012h8,2lal980,24ka22h,14812h5,4211o0,3t22222,no1og8,g843g0,210820g,g41o42,4213g0,gkh8g0,0,1v,g82000,7,17k9u0,30g8539,lg0007,h849o0,c216kq,1jc0007,hfk1o0,oi8e21,700006,2h8jo5s,30ga6i9,m80806,4211o0,4030ga,k9pg84,2a62h40,1g84210,23g000d,lalak0,mcka,k80007,h8k9o0,u4i9,323g006,2i93g8e,r6i1,700007,2g70bo0,10gu421,hg0008,2h8kpk0,h8k9,1100008,2lal980,h511,1480008,2h8jo5s,v111,7o0642,o210c0,g84010,2101g42,321300,15c0000,45,h8kbs0,1p2g8jg,309o0i0,i94hs0,o0e8nq,3g0sh6,274hs0,240c13i,13o0o06,274hs0,g0c13i,13o0007,g83gcc,1p2e8nq,3g1207,hfk1o0,1g0e8nq,3g1406,4211o0,1p2c210,23g0o06,4211o0,248a8nq,k80840,e8nq40,c0v43h,7o000c,267khk0,skifki,14o08a0,e8k9o0,12074a,jg0g40,e8k9o0,gk08ka,jg0g40,h8k9o0,1208k9,3g9p245,h8igg0,240h8ka,jg0847,2g83og8,oi8e22,ng12af,24fh0g0,3ome4it,if4c52,e212go,o0c13i,13o0c06,4211o0,88074a,jg0022,h8k9o0,1lc0f4a,k80qj0,pakq40,1p4i7g3,3g00oi9,c07g00,g04442,jg0000,v84000,fg8,g00iq6,r5cecv,15kbdiq,3s84080,842100,aaa2g,2g000k5,555000,1348p26,1268ll5,1l5d9ba,3ctreup,3erm842,4210g8,g84270,210g84e,4e10g8,ka52n8,2h8k000,fh8ka,s270,210ga5e,21eh8ka,ka52h8,2h8k00f,21eh8ka,kat0no,a52,25fg000,g8s270,0,e10g8,g8421s,842,4fo000,7s,210g842,43p0g8,7s,842,4fp0g8,g87i1s,210ga52,252p8ka,ka5i1s,3,342p8ka,katg7s,f,30ep8ka,ka5i1c,2h8k00f,30fo000,katg7c,2h8k84f,30fo000,ka52ns,f,30fp0g8,7s,2h8ka52,253o000,g87i1s,3,343p0g8,1s,2h8ka52,25fp8ka,g8vi7s,210g842,4e0000,1s,210hvvv,3vvvvvv,7v,3vvvose,se73ho,e73hos,1osfvvv,3vg0000,cqki,2i400e8,2u8ni10,1uh842,4000fq,252h8k0,3t28322,no0007,2ka5100,i94jl,2200cp,2210g80,3s8e8k9,313sc98,1voa8o0,oigoa9,mc0e83,f8c5s0,impdd,g00117,2iqbp10,oggf41,1g0sh8,2h8ka40,v07o1,3o0084f,24203s0,g41110,7o0888,8203s0,c94i10,210g842,4252go,oc0fo0,31g00cp,206co00,oi9300,0,630000,1g,721,216h8c,3h4i94g,oi2,8f0000,e73h,3000000",
      6,
      8,
      null,
      true
    );
    api2.loadFont(
      "0,0,1v839c1,2upj0bu,1vfvmvv,31ufvru,1mftvnu,1u3g400,83gv7u,1u3g400,s7oe7u,3v7oe3s,810e3s,3v7oe3s,61s,u1g000,3vvvpu3,31ufvvv,3opi2,116cf00,3vs76dt,2upjgvv,7ge3rt,36cpj3o,u6cpj6,u1gvgo,vj6fpg,o71s70,1vm6vr3,1hmfpm0,2clkf77,3jjomkp,20e1u7u,3se1000,10sfnu,v0s0g0,c3ovgo,c7sf0o,1j6cpj6,1j00pg0,1vtnmrr,dhm6o0,v66e3c,1m3hj3o,0,1v7svg0,c3ovgo,1v3o67v,c3ovgo,c1g600,c1g60o,1v3o600,1g37u,61g000,30o7u,1g30000,1g60,30fs000,28pnv,1j28000,1gf3u,3vvu000,fvvru,u1g000,0,0,o7gu1g,o00c00,1m6or00,0,1m6pvjc,3v6or00,o7pg3o,6fgc00,cdj0o,o6dhg0,s6oe3m,3ecotg0,1g61g00,0,c30o30,1g30600,1g3060o,c30o00,6cf7v,u6c000,30c7s,o30000,0,30c30,7s,0,0,30c00,30o61g,1gc1000,1ucdjmu,3recv00,o70c1g,o31v00,1sco31o,1gcpv00,1sco31o,6cou00,e3or6c,3v0o7g0,3uc1u0c,6cou00,s61g7o,36cou00,3uco30o,o30c00,1scpj3o,36cou00,1scpj3s,61gs00,30c00,30c00,30c00,30c30,c30o60,1g30600,1v00,fo000,1g3060c,c30o00,1sco30o,o00c00,1ucdnmu,3fc0u00,o7hj6c,3ucpj00,3u6cpjs,1j6dv00,u6dg60,306cf00,3s6opj6,1j6pu00,3v64q3o,1k65vg0,3v64q3o,1k61s00,u6dg60,376cfg0,36cpj7s,36cpj00,1s30c1g,o30u00,f0o30c,36cou00,3j6cr3o,1m6dpg0,3o60o30,1h6dvg0,33etvnu,3bcdhg0,33edtmu,37cdhg0,s6phm6,336oe00,3u6cpjs,1g61s00,1scpj6c,3e7g700,3u6cpjs,1m6dpg0,1scpo3g,ecou00,3ub8c1g,o30u00,36cpj6c,36cpv00,36cpj6c,367gc00,33cdhmm,3vethg0,33ccr1o,s6phg0,36cpj3o,o30u00,3vcd30o,p6dvg0,1s60o30,1g60u00,3060c0o,60c0g0,1s1g60o,c1gu00,83gr66,0,0,7v,o30600,0,u0c,1ucotg0,3g60o3s,1j6dn00,u6c,30cou00,e0o33s,36cotg0,u6c,3uc0u00,s6oo7g,1g61s00,tmc,367o37o,3g60r3m,1j6dpg0,o00s1g,o30u00,60030c,6cpj3o,3g60pjc,1s6ppg0,1o30c1g,o30u00,1j7u,3vddhg0,1u6c,36cpj00,u6c,36cou00,1n36,1j7oo7g,tmc,367o30u,1n3m,1j61s00,v60,1s0pu00,830v1g,o38600,1j6c,36cotg0,1j6c,367gc00,1hmm,3vfsr00,1hjc,s6phg0,1j6c,367o37o,1v4o,o69v00,e30c70,o30700,c1g600,c1g600,3g30c0s,o31o00,1rdo000,0,10e3c,33cdvg0,1scpg6c,1s1g33o,co06c,36covg0,e00u6c,3uc0u00,1vc6f06,v6cfo0,3600u0c,1ucovg0,3g00u0c,1ucovg0,o30u0c,1ucovg0,u60,307g31o,1vc6f36,1v60f00,3600u6c,3uc0u00,3g00u6c,3uc0u00,3600s1g,o30u00,1ucce0o,c1gf00,3g00s1g,o30u00,333gr66,3vcdhg0,o3003o,36fpj00,e01v30,1s61v00,voc,1vsovo0,v6pj7u,36cpjg0,1sco03o,36cou00,co03o,36cou00,e003o,36cou00,1sco06c,36covg0,e006c,36covg0,co06c,367o37o,31hgf36,1j3o600,3601j6c,36cou00,c1gvm0,307s60o,s6op7g,1gedv00,36cou7s,ofoc1g,3scpj7q,33cvhm7,71m61s,c1hm3g,e00u0c,1ucovg0,s00s1g,o30u00,1o03o,36cou00,1o06c,36covg0,fg07o,36cpj00,3u01j7c,3udpj00,u6or1u,7s000,s6or1o,7o000,o00c30,30cou00,7s,30c0000,7s,60o000,31sdj6u,pmdj0f,31sdj6r,rmvjo3,c1g00o,c1g600,36pmc,1j36000,cophj,1jco000,h8g8k8,h8g8k8,1aqklda,1aqklda,3dnfmve,3dnfmve,c1g60o,c1g60o,c1g60o,3s1g60o,c1hu0o,3s1g60o,r3cdhm,3r3cdhm,0,3v3cdhm,1u0o,3s1g60o,r3dtg6,3r3cdhm,r3cdhm,r3cdhm,1vg6,3r3cdhm,r3dtg6,3v00000,r3cdhm,3v00000,c1hu0o,3s00000,0,3s1g60o,c1g60o,fg0000,c1g60o,3vg0000,0,3vhg60o,c1g60o,fhg60o,0,3vg0000,c1g60o,3vhg60o,c1g7oo,fhg60o,r3cdhm,rjcdhm,r3cdpg,vg0000,fpg,rjcdhm,r3dto0,3vg0000,1vo0,3rjcdhm,r3cdpg,rjcdhm,1vo0,3vg0000,r3dto0,3rjcdhm,c1hvo0,3vg0000,r3cdhm,3vg0000,1vo0,3vhg60o,0,3vjcdhm,r3cdhm,vg0000,c1g7oo,fg0000,7oo,fhg60o,0,vjcdhm,r3cdhm,3vjcdhm,c1hvoo,3vhg60o,c1g60o,3s00000,0,fhg60o,3vvvvvv,3vvvvvv,0,3vvvvvv,3of1s7g,3of1s7g,7gu3of,7gu3of,3vvvvvv,0,tms,34dotg0,7hj7o,36fhg60,fpj60,30c1g00,fsr3c,1m6or00,3ucoo1g,1gcpv00,vmo,3cdgs00,6cpj6,1j7oo60,7dn0o,c1g600,3u30u6c,367gc7s,s6phnu,336oe00,s6phm6,1m6prg0,e3063s,36cou00,vmr,3dns000,30ovmr,3dnso60,s61g7o,3060e00,1scpj6c,36cpj00,fo07s,fo000,o31v1g,o01v00,1g3061g,1g01v00,c30o1g,c01v00,71m6oo,c1g60o,c1g60o,cdhm3g,o3007s,30c00,7dn00,1rdo000,s6or1o,0,o,c00000,0,c00000,7go30c,3m6of0s,1s6or3c,1m00000,1o1gc30,1s00000,f1s,u3o000",
      8,
      8,
      null,
      true
    );
    api2.loadFont(
      "0,0,0,0,1v839c1,20rr6c1,1v00000,vnv,3dvvvu3,3jvuvg0,0,6pvnu,3vfsv1o,800000,g,s7pvjs,s10000,0,c3of77,3jue60o,u00000,61s,1vfvvru,c1gf00,0,o,u3o600,0,3vvvvvv,3vufgu3,3jvvvvv,3vvu000,f36,1144phs,0,3vvvvvv,31pjfdt,2cs7vvv,3vvu000,f0s6hi,1scpj6c,1s00000,f36,1j6cf0o,1v1g600,0,vj6fpg,o30s7g,3g00000,vr3,1vm6or3,1jufpm0,0,c1hmps,3jjpmoo,c00000,1060,3gfhvno,3gc1000,0,10c3hu,3v3s3g6,100000,61s,1v1g60o,1v3o600,0,1j6cpj6,1j6c036,1j00000,vur,3dtmuor,dhm6o0,3s,3360e3c,33ccr1o,6ccv00,0,0,3vftvg0,0,c3ovgo,c1gvhs,c7s000,61s,1v1g60o,c1g600,0,c1g60o,c1gvhs,c00000,0,c0pvgc,c00000,0,c30,3v60c00,0,0,c1g60,3v00000,0,a3c,3v6oa00,0,g,s3gv3s,3vfs000,0,ftvjs,1u3ge0g,0,0,0,0,0,c3of1s,c1g00o,c00000,6cpj6,i00000,0,0,1m6pvjc,1m6pvjc,1m00000,c1gv66,31c0v06,23ccv0o,c00000,1gm6,61gc36,3300000,e3c,1m3gtms,36cotg0,1g,o30o00,0,0,30o,o30c1g,o1g300,0,o1g30c,60o30o,o00000,0,1j3pvps,1j00000,0,60o,1v1g600,0,0,0,c1g61g,0,0,3v00000,0,0,0,1g600,0,10c30o,o61g40,0,v66,37dttn6,33ccv00,0,c3gu0o,c1g60o,1v00000,v66,30o61g,1gcdvg0,0,1ucc1g6,u0c1m6,1u00000,30s,u6pj7u,60o7g0,0,3vc1g60,3u0c1m6,1u00000,e30,30c1v66,33ccv00,0,3vcc1gc,c30c1g,o00000,v66,33ccv66,33ccv00,0,1ucdhm6,1v0c1gc,1s00000,o,c00000,c1g000,0,1g600,60o,o00000,1gc,c30o1g,c0o1g0,0,3u,vg0,0,o1g,c0o1gc,c30o00,0,1ucdhgc,c1g00o,c00000,v66,33dtnmu,3ec0v00,0,83gr66,33fthm6,3300000,1v36,1j6cv36,1j6dv00,0,u6dgm0,30c1gj6,u00000,1u3c,1j6cpj6,1j6pu00,0,3v6coj8,1s6goj6,3v00000,1vj6,1h6gu38,1g61s00,0,u6dgm0,30dthj6,t00000,1hm6,33cdvm6,33cdhg0,0,u1g60o,c1g60o,u00000,7gc,60o30c,36cou00,0,3j6cr3c,1s6or36,3j00000,1s30,1g60o30,1h6dvg0,0,33etvnu,3bcdhm6,3300000,1hn6,3rftnme,33cdhg0,0,s6phm6,33cdhjc,s00000,1v36,1j6cv30,1g61s00,0,1ucdhm6,33ddnjs,60s000,1v36,1j6cv3c,1j6dpg0,0,1ucdhj0,s0phm6,1u00000,vju,1d1g60o,c1gf00,0,33cdhm6,33cdhm6,1u00000,1hm6,33cdhm6,1m3g400,0,33cdhm6,3bddvjs,1m00000,1hm6,1m3ge1o,1mcdhg0,0,1j6cpj6,u1g60o,u00000,1vm6,261gc30,31cdvg0,0,u30c1g,o30c1g,u00000,1060,3g70e0s,70c0g0,0,u0o30c,60o30c,u00000,83gr66,0,0,0,0,0,1vo0,o30600,0,0,0,3o,67pj6c,1r00000,1o30,1g7gr36,1j6cv00,0,3s,33c1g66,1u00000,70c,63or6c,36cotg0,0,3s,33ftg66,1u00000,e3c,1i61s30,1g61s00,0,3m,36cpj3s,6cou00,1o30,1g6otj6,1j6dpg0,0,c1g01o,c1g60o,u00000,1g6,s1g6,30cpj6,u00000,3g60o36,1m7gr36,3j00000,e0o,c1g60o,c1gf00,0,7c,3vddlmm,3300000,0,dopj6,1j6cpg0,0,3s,33cdhm6,1u00000,0,dopj6,1j7oo30,3o00000,3m,36cpj3s,60o7g0,0,dotj6,1g61s00,0,3s,3370766,1u00000,41g,ofoc1g,o3c700,0,6c,36cpj6c,1r00000,0,6cpj6,1j3o600,0,66,33ddlnu,1m00000,0,ccr1o,s6phg0,0,66,33cdhju,30pu00,0,ftj0o,o6dvg0,0,71g60o,1o1g60o,700000,60o,c1g00o,c1g600,0,1o1g60o,71g60o,1o00000,tms,0,0,0,41o,1mcdhnu,0,f36,31c1g62,1j3o306,1u00000,36co06c,36cpj6c,1r00000,o61g,7phnu,30ccv00,g,s6o03o,67pj6c,1r00000,1j6c,7g33s,36cotg0,30,o1g03o,67pj6c,1r00000,3gr1o,7g33s,36cotg0,0,f36,1g6cf0c,33o000,10e3c,7phnu,30ccv00,0,36co03s,33ftg66,1u00000,60c0o,7phnu,30ccv00,0,1j6c01o,c1g60o,u00000,1gf36,3g60o,c1gf00,30,o1g01o,c1g60o,u00000,cdhgg,s6phm6,3vcdhg0,e3c,s00e3c,33cdvm6,3300000,c30o00,3v6co3s,1g6dvg0,0,1j3m,r7tm6o,1n00000,fjc,36cpvmc,36cpjg0,g,s6o03s,33cdhm6,1u00000,1hm6,7phm6,33ccv00,30,o1g03s,33cdhm6,1u00000,30u6c,cpj6c,36cotg0,30,o1g06c,36cpj6c,1r00000,1hm6,cdhm6,337s1gc,1s00066,333gr66,33cdhjc,s00000,cdhg0,33cdhm6,33ccv00,o,c3opj0,1g6cf0o,c00000,3gr34,1gf0o30,1gedv00,0,1j6cf0o,1v1gvgo,c00000,fhj6c,3sc9j6u,36cphg0,e,dhg60o,1v1g60o,cdgs00,1gc30,7g33s,36cotg0,c,c3001o,c1g60o,u00000,1gc30,7phm6,33ccv00,o,o6006c,36cpj6c,1r00000,tms,dopj6,1j6cpg0,tms,cdpnm,3vdtjm6,3300000,3or3c,v00vg0,0,1o,1m6oe00,1u00000,0,c1g,30c30,33ccv00,0,0,3vc1g60,0,0,1vg6,30c000,60,30cdj6o,o61n46,61gfg0,c1g66,36dgc36,379sfg6,300000,c1g00o,c3of1s,c00000,0,r6pm3c,r00000,0,1m3c,r6pm00,0,8k84a4,8k84a4,8k84a4,8k8lda,1aqklda,1aqklda,1aqklda,3enfnbn,3enfnbn,3enfnbn,3ene60o,c1g60o,c1g60o,c1g60o,c1g60o,c1g67o,c1g60o,c1g60o,c1g67o,cfg60o,c1g60o,r3cdhm,r3cdnm,r3cdhm,r3c000,0,fsdhm,r3cdhm,0,fg67o,c1g60o,c1gdhm,r3cdnm,3fcdhm,r3cdhm,r3cdhm,r3cdhm,r3cdhm,r3c000,7u,3fcdhm,r3cdhm,r3cdhm,rfc1nu,0,dhm,r3cdhm,rfs000,0,c1g60o,cfg67o,0,0,0,fg60o,c1g60o,c1g60o,c1g60v,0,60o,c1g60o,cfu000,0,0,7v,c1g60o,c1g60o,c1g60o,c1u60o,c1g60o,0,7v,0,60o,c1g60o,cfu60o,c1g60o,c1g60o,c1u60v,c1g60o,c1gdhm,r3cdhm,r3edhm,r3cdhm,r3cdhm,r3ec1v,0,0,1v,o3edhm,r3cdhm,r3cdhm,rfe07v,0,0,7v,fedhm,r3cdhm,r3cdhm,r3ec1n,r3cdhm,r3c000,7v,fu000,0,r3cdhm,rfe07n,r3cdhm,r3c60o,c1g67v,fu000,0,r3cdhm,r3cdnv,0,0,7v,fu60o,c1g60o,0,7v,r3cdhm,r3cdhm,r3cdhm,r3u000,0,c1g60o,c1u60v,0,0,v,c1u60o,c1g60o,0,1v,r3cdhm,r3cdhm,r3cdhm,rfudhm,r3cdhm,c1g60o,cfu67v,c1g60o,c1g60o,c1g60o,cfg000,0,0,v,c1g60o,c1hvvv,3vvvvvv,3vvvvvv,3vvvvvv,0,7v,3vvvvvv,3vvvs7g,3of1s7g,3of1s7g,3of1s7g,7gu3of,7gu3of,7gu3of,7gvvvv,3vvvvvv,3vg0000,0,0,7dn6o,3cdotg0,0,v66,3ucdhns,30c0g00,1vm6,33c1g60,30c1g00,0,1vjc,1m6or3c,1m00000,1vm6,1g3061g,1gcdvg0,0,3u,3cdhm6o,1o00000,0,1j6cpj6,1u60o60,0,tms,c1g60o,c00000,vgo,u6cpj6,u1gvg0,0,s6phm6,3vcdhjc,s00000,e3c,33cdhjc,1m6prg0,0,f3060c,v6cpj6,u00000,0,7tmur,1v00000,0,1gcvmr,3dv6vj0,3000000,71g,1g60v30,1g30700,0,7phm6,33cdhm6,3300000,7u,1vg0,fs000,0,1g63u,c1g000,3vg0000,c0o,60c30o,o00vg0,0,61gc30,o1g300,1v00000,3gr,dhg60o,c1g60o,c1g60o,c1g60o,c1hm6o,1o00000,o,c00vg0,c1g000,0,tms,7dn00,0,3gr3c,s00000,0,0,0,c1g000,0,0,o,0,f,60o30c,6eor1s,e00000,dgr3c,1m6or00,0,3g,3c30o68,3s00000,0,0,1u7ov3s,1u7o000,0",
      8,
      14,
      null,
      true
    );
    api2.loadFont(
      "0,0,0,0,vk1,2io30dt,2co30bu,0,vnv,3dvvvu3,3jvvvru,0,0,1mftvnu,3v7oe0g,0,0,83gv7u,1u3g400,0,o,u3ppv7,3jhg61s,0,o,u7tvvv,1v1g61s,0,0,0,0,0,3vvvvvv,3vvvpu3,31ufvvv,3vvvvvv,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,vr3,1vm6or3,1hmfpv6,3000000,o,cdmf77,udm60o,0,81g70,3ofhvno,3oe1g40,0,41ge,f3tvhu,f0s1g2,0,61s,1v1g60o,1v3o600,0,pj6,1j6cpj6,1j00pj6,0,vur,3dtmuor,dhm6or,0,7phj0,s6phm6,1m3g366,1u00000,0,0,3vftvnu,0,61s,1v1g60o,1v3o63u,0,61s,1v1g60o,c1g60o,0,60o,c1g60o,c7sf0o,0,0,1g37u,61g000,0,0,30o7u,1g30000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,61s,u3o60o,c0060o,0,6cpj6,i00000,0,0,3c,1mfsr3c,1mfsr3c,0,c1gv66,31c0v06,38dhjs,c1g000,0,31cc30o,o61hk6,0,e3c,1m3gtms,36cpj3m,0,30c1g,1g00000,0,0,30o,o30c1g,o3060c,0,c0o,60o30c,60o61g,0,0,6cf7v,u6c000,0,0,1g63u,c1g000,0,0,0,1g60o,o00000,0,7u,0,0,0,0,60o,0,0,10c30o,o61g40,0,f36,31s7mur,31s6phs,0,61o,1s1g60o,c1g63u,0,v66,30o61g,1gc1hnu,0,v66,30cf06,30dhjs,0,30s,u6pj7u,60o30u,0,1vm0,30c1v06,30dhjs,0,e30,30c1v66,33cdhjs,0,1vm6,30c30o,o30c1g,0,v66,33ccv66,33cdhjs,0,v66,33ccvg6,30c33o,0,0,c1g000,1g600,0,0,c1g000,1g61g,0,6,61gc30,o1g306,0,0,7s000,1v00000,0,30,o1g306,61gc30,0,v66,330o60o,c0060o,0,3s,33cdnmu,3fdpg3s,0,41o,1mcdhnu,33cdhm6,0,1v36,1j6cv36,1j6cpns,0,f36,31c1g60,30c4phs,0,1u3c,1j6cpj6,1j6cr7o,0,1vj6,1h6gu38,1g64pnu,0,1vj6,1h6gu38,1g60o7g,0,f36,31c1g6u,33ccphq,0,1hm6,33cdvm6,33cdhm6,0,f0o,c1g60o,c1g61s,0,7gc,60o30c,36cpj3o,0,1pj6,1j6ou3o,1m6cpn6,0,1s30,1g60o30,1g64pnu,0,1gv7,3vvvmu3,31s7gu3,0,1hn6,3rftnme,33cdhm6,0,v66,33cdhm6,33cdhjs,0,1v36,1j6cv30,1g60o7g,0,v66,33cdhm6,33ddnjs,60s000,1v36,1j6cv3c,1j6cpn6,0,v66,3360e0c,3cdhjs,0,1vur,2chg60o,c1g61s,0,1hm6,33cdhm6,33cdhjs,0,1gu3,31s7gu3,31mcf0o,0,1gu3,31s7gur,3dvupj6,0,1gu3,1j3o60o,u6dgu3,0,1gu3,31mcf0o,c1g61s,0,1vu3,230o61g,1gc3gvv,0,f1g,o30c1g,o30c1s,0,40,30e0s1o,e0s1g2,0,f0c,60o30c,60o31s,0,83gr66,0,0,0,0,0,0,fu000,o30600,0,0,0,0,7g33s,36cpj3m,0,1o30,1g7gr36,1j6cpjs,0,0,7phm0,30c1hjs,0,70c,63or6c,36cpj3m,0,0,7phnu,30c1hjs,0,e3c,1i61s30,1g60o7g,0,0,7dj6c,36cpj3s,6cou00,1o30,1g6otj6,1j6cpn6,0,60o,3g60o,c1g61s,0,1g6,s1g6,30c1g6,1j6cf00,1o30,1g6cr3o,1s6opn6,0,e0o,c1g60o,c1g61s,0,0,edvur,3dtnmur,0,0,dopj6,1j6cpj6,0,0,7phm6,33cdhjs,0,0,dopj6,1j6cpjs,1g61s00,0,7dj6c,36cpj3s,60o7g0,0,dotj6,1g60o7g,0,0,7phj0,s0phjs,0,41g,ofoc1g,o30dgs,0,0,cpj6c,36cpj3m,0,0,c7gu3,31mcf0o,0,0,c7gu3,3dtnvr6,0,0,c6phs,c3opm3,0,0,cdhm6,33cdhju,30pu00,0,ftj0o,o61hnu,0,3go,c1gs0o,c1g60e,0,60o,c1g00o,c1g60o,0,s0o,c1g3go,c1g63g,0,tms,0,0,0,0,83gr66,33cdvg0,0,f36,31c1g60,316cf0c,37o000,1j00,cpj6c,36cpj3m,0,o61g,7phnu,30c1hjs,0,10e3c,7g33s,36cpj3m,0,1j00,7g33s,36cpj3m,0,60c0o,7g33s,36cpj3m,0,3gr1o,7g33s,36cpj3m,0,0,u6co30,1j3o306,u00000,10e3c,7phnu,30c1hjs,0,1hg0,7phnu,30c1hjs,0,60c0o,7phnu,30c1hjs,0,pg0,3g60o,c1g61s,0,1gf36,3g60o,c1g61s,0,60c0o,3g60o,c1g61s,0,cc00g,s6phm6,3vcdhm6,0,s6oe00,s6phm6,3vcdhm6,0,c30o00,3v6co3s,1g60pnu,0,0,6seor,1vdhn3n,0,fjc,36cpvmc,36cpj6e,0,10e3c,7phm6,33cdhjs,0,1hg0,7phm6,33cdhjs,0,60c0o,7phm6,33cdhjs,0,30u6c,cpj6c,36cpj3m,0,60c0o,cpj6c,36cpj3m,0,1hg0,cdhm6,33cdhju,30ou00,cc03s,33cdhm6,33cdhjs,0,cc066,33cdhm6,33cdhjs,0,1g63u,31s1g60,31ns60o,0,3gr34,1gf0o30,1g61pns,0,1gr6,u1hvoo,3vhg60o,0,fopj6,1u64pjf,1j6cpnj,0,s6oo,c1gvgo,c1g60o,3c70000,1gc30,7g33s,36cpj3m,0,o61g,3g60o,c1g61s,0,1gc30,7phm6,33cdhjs,0,1gc30,cpj6c,36cpj3m,0,tms,dopj6,1j6cpj6,0,1rdo066,3jfdvmu,37cdhm6,0,3or3c,v00vg0,0,0,3gr3c,s00v00,0,0,c1g,30c30,30cdhjs,0,0,1vm0,30c1g00,0,0,1vg6,30c1g0,0,c1g62,33co61g,1gct6o6,61u000,c1g62,33co61g,1jct5hu,30c000,60o,1g60o,u3of0o,0,0,3cr6o,1m3c000,0,0,dgr1m,1mdg000,0,8k84a4,8k84a4,8k84a4,8k84a4,1aqklda,1aqklda,1aqklda,1aqklda,3enfnbn,3enfnbn,3enfnbn,3enfnbn,c1g60o,c1g60o,c1g60o,c1g60o,c1g60o,c1g67o,c1g60o,c1g60o,c1g60o,cfg67o,c1g60o,c1g60o,r3cdhm,r3cdnm,r3cdhm,r3cdhm,0,7u,r3cdhm,r3cdhm,0,fg67o,c1g60o,c1g60o,r3cdhm,rfc1nm,r3cdhm,r3cdhm,r3cdhm,r3cdhm,r3cdhm,r3cdhm,0,fs1nm,r3cdhm,r3cdhm,r3cdhm,rfc1nu,0,0,r3cdhm,r3cdnu,0,0,c1g60o,cfg67o,0,0,0,7o,c1g60o,c1g60o,c1g60o,c1g60v,0,0,c1g60o,c1g67v,0,0,0,7v,c1g60o,c1g60o,c1g60o,c1g60v,c1g60o,c1g60o,0,7v,0,0,c1g60o,c1g67v,c1g60o,c1g60o,c1g60o,c1u60v,c1g60o,c1g60o,r3cdhm,r3cdhn,r3cdhm,r3cdhm,r3cdhm,r3ec1v,0,0,0,3uc1n,r3cdhm,r3cdhm,r3cdhm,rfe07v,0,0,0,fu07n,r3cdhm,r3cdhm,r3cdhm,r3ec1n,r3cdhm,r3cdhm,0,fu07v,0,0,r3cdhm,rfe07n,r3cdhm,r3cdhm,c1g60o,cfu07v,0,0,r3cdhm,r3cdnv,0,0,0,fu07v,c1g60o,c1g60o,0,7v,r3cdhm,r3cdhm,r3cdhm,r3cdhv,0,0,c1g60o,c1u60v,0,0,0,1u60v,c1g60o,c1g60o,0,1v,r3cdhm,r3cdhm,r3cdhm,r3cdnv,r3cdhm,r3cdhm,c1g60o,cfu67v,c1g60o,c1g60o,c1g60o,c1g67o,0,0,0,v,c1g60o,c1g60o,3vvvvvv,3vvvvvv,3vvvvvv,3vvvvvv,0,7v,3vvvvvv,3vvvvvv,3of1s7g,3of1s7g,3of1s7g,3of1s7g,7gu3of,7gu3of,7gu3of,7gu3of,3vvvvvv,3vvvvo0,0,0,0,7dn6o,3cdhn3m,0,u6c,36cpm6c,33cdhmc,0,1vm6,33c1g60,30c1g60,0,0,3v6or3c,1m6or3c,0,7u,3360c0o,o61hnu,0,0,7tm6o,3cdhm3g,0,0,1j6cpj6,1j7oo30,3000000,0,1rdo60o,c1g60o,0,3u,c3opj6,1j3o63u,0,1o,1mcdhnu,33ccr1o,0,e3c,33cdhjc,1m6or7e,0,7hg,c0ofj6,1j6cphs,0,0,7tmur,3dns000,0,3,37tmur,3pnso60,0,71g,1g60v30,1g60c0s,0,3s,33cdhm6,33cdhm6,0,0,3v0007u,1vg0,0,0,c1gvgo,c0007v,0,1g,c0o1gc,c3003u,0,c,c30o1g,c0o03u,0,3gr,dhg60o,c1g60o,c1g60o,c1g60o,c1g60o,3cdhm3g,0,0,c1g03u,1g600,0,0,7dn00,1rdo000,0,3gr3c,s00000,0,0,0,o,c00000,0,0,0,c00000,0,u30c,60o37c,1m6of0s,0,dgr3c,1m6or00,0,0,71m1g,1gchu00,0,0,0,1u7ov3s,1u7ov00,0",
      8,
      16,
      null,
      true
    );
    api2.setDefaultFont(1);
  }

  // src-pi-2.0.0-alpha.1/index.js
  var VERSION = "2.0.0-alpha.1";
  var api = {
    "version": VERSION
  };
  init(api, screen_manager_exports);
  init2();
  init3();
  init4();
  init10();
  init11();
  init12();
  init13();
  init14();
  init15();
  init16();
  init17();
  init5();
  init6();
  init7();
  init9();
  init8();
  init18();
  init19();
  init20();
  processApi();
  loadBuiltInFonts(api);
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
