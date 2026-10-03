/**
 * Pi.js Graphics Library - Full Version
 * 
 * A powerful, lightweight JavaScript graphics library for web applications.
 * This version includes the complete core functionality plus additional
 * plugins for extended features.
 * 
 * @version 2.3.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * 
 * Features:
 * - Core graphics rendering engine
 * - Screen management and canvas operations
 * - Shape drawing and transformations
 * - Image loading and manipulation
 * - Plugin system with bundled plugins:
 *		gamepad: Gamepad input handling
 *		keyboard: Keyboard input handling
 *		sound: Music playback and sound effects
 *		pointer: Mouse, touch, and press handling
 *		polygons: Outlined and filled complex polygons
 * 
 * For the core-only version, use pi.lite.js
 */
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
  colorToHex: () => colorToHex,
  convertToColor: () => convertToColor,
  copyColor: () => copyColor,
  createColor: () => createColor,
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
  rndRange: () => rndRange
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
        resultOptions[name] = inputOptions[name] ?? null;
      }
    }
  }
  if (!isNamedParameterFound) {
    for (let i = 0; i < parameterNames.length; i++) {
      if (i < args.length) {
        resultOptions[parameterNames[i]] = args[i] ?? null;
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
var m_colorCheckerContext = document.createElement("canvas").getContext(
  "2d",
  { "willReadFrequently": true }
);
var COLOR_PROTO = {
  "key": 0,
  "r": 0,
  "g": 0,
  "b": 0,
  "a": 0,
  "array": null
};
function createColor(colorArray) {
  const color = Object.create(COLOR_PROTO);
  color.array = colorArray;
  color.r = colorArray[0];
  color.g = colorArray[1];
  color.b = colorArray[2];
  color.a = colorArray[3];
  color.key = colorArray[0] << 24 | colorArray[1] << 16 | colorArray[2] << 8 | colorArray[3];
  return color;
}
function generateColorKey(r, g, b, a) {
  return r << 24 | g << 16 | b << 8 | a;
}
function rgbToColor(r, g, b, a) {
  const colorArray = new Uint8Array(4);
  colorArray.set([r, g, b, a]);
  return createColor(colorArray);
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
  } else if (color.r !== void 0 && color.g !== void 0 && color.b !== void 0 && color.a !== void 0) {
    color = [color.r, color.g, color.b, color.a];
  }
  for (let i = 0; i < 3; i += 1) {
    color[i] = getInt(color[i], 0);
  }
  color[3] = getFloat(color[3], 0);
  if (color[3] <= 1) {
    color[3] = Math.round(color[3] * 255);
  } else {
    color[3] = Math.round(color[3]);
  }
  return rgbToColor(color[0], color[1], color[2], color[3]);
}
function calcColorDifference(c1, c2, w = [0.2, 0.68, 0.07, 0.05]) {
  const dr = c1.array[0] - c2.array[0];
  const dg = c1.array[1] - c2.array[1];
  const db = c1.array[2] - c2.array[2];
  const da = c1.array[3] - c2.array[3];
  return dr * dr * w[0] + dg * dg * w[1] + db * db * w[2] + da * da * w[3];
}
function copyColor(colorSrc, colorDest) {
  colorDest.key = colorSrc.key;
  colorDest.array[0] = colorSrc.array[0];
  colorDest.array[1] = colorSrc.array[1];
  colorDest.array[2] = colorSrc.array[2];
  colorDest.array[3] = colorSrc.array[3];
}
function hexToColor(hex) {
  let r, g, b, a;
  if (hex.length === 4) {
    r = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    g = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    b = parseInt(hex.charAt(3) + hex.charAt(3), 16);
  } else {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  if (hex.length === 9) {
    a = parseInt(hex.substring(7, 9), 16);
  } else {
    a = 255;
  }
  return rgbToColor(r, g, b, a);
}
function cToHex(c) {
  if (!Number.isInteger(c)) {
    c = Math.round(c);
  }
  c = clamp(c, 0, 255);
  const hex = Number(c).toString(16);
  if (hex.length < 2) {
    return "0" + hex;
  } else {
    return hex.toUpperCase();
  }
}
function colorToHex(color) {
  return "#" + cToHex(color.r) + cToHex(color.g) + cToHex(color.b) + cToHex(color.a);
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
function colorStringToColor(colorStr) {
  m_colorCheckerContext.clearRect(0, 0, 1, 1);
  m_colorCheckerContext.fillStyle = colorStr;
  m_colorCheckerContext.fillRect(0, 0, 1, 1);
  const data = m_colorCheckerContext.getImageData(0, 0, 1, 1).data;
  return rgbToColor(data[0], data[1], data[2], data[3]);
}

// src/core/errors.js
function throwError(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}

// src/renderer/alpha.js
function premultiplyPixels(pixels) {
  const result = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    for (let channel = 0; channel < 3; channel += 1) {
      result[i + channel] = Math.round(pixels[i + channel] * alpha / 255);
    }
    result[i + 3] = alpha;
  }
  return result;
}
function unpremultiplyPixels(pixels) {
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    for (let channel = 0; channel < 3; channel += 1) {
      if (alpha === 0) {
        pixels[i + channel] = 0;
      } else {
        pixels[i + channel] = Math.min(
          255,
          Math.round(pixels[i + channel] * 255 / alpha)
        );
      }
    }
  }
  return pixels;
}

// src/api/images.js
var m_images = {};
var m_imageCount = 0;
function init(api) {
  registerCommands(api);
  addScreenDataItem("defaultAnchorX", 0);
  addScreenDataItem("defaultAnchorY", 0);
}
function registerCommands(api) {
  addCommand(
    "loadImage",
    loadImage,
    false,
    ["src", "name", "onLoad", "onError"]
  );
  addCommand(
    "loadSpritesheet",
    loadSpritesheet,
    false,
    ["src", "name", "width", "height", "margin", "onLoad", "onError"]
  );
  addCommand("getImage", getImage, false, ["name"]);
  addCommand("getSpritesheetData", getSpritesheetData, true, ["name"], true);
  addCommand("removeImage", removeImage, false, ["name"]);
  addCommand(
    "createImageFromScreen",
    createImageFromScreen,
    true,
    ["name", "x1", "y1", "x2", "y2"]
  );
  addCommand("setDefaultAnchor", setDefaultAnchor, true, ["x", "y"]);
}
function loadImage(options) {
  const src = options.src;
  let name = options.name;
  const onLoadCallback = options.onLoad;
  const onErrorCallback = options.onError;
  const srcErrMsg = "loadImage: Parameter src must be a string URL, Image element, or Canvas element.";
  if (typeof src === "string") {
    if (src === "") {
      throwError(TypeError, srcErrMsg, "INVALID_SRC");
    }
  } else if (src && typeof src === "object") {
    if (src.tagName !== "IMG" && src.tagName !== "CANVAS") {
      throwError(TypeError, srcErrMsg, "INVALID_SRC");
    }
  } else {
    throwError(TypeError, srcErrMsg, "INVALID_SRC");
  }
  if (name && typeof name !== "string") {
    throwError(
      TypeError,
      "loadImage: Parameter name must be a string.",
      "INVALID_NAME"
    );
  }
  if (!name || name === "") {
    name = generateImageName();
  }
  if (m_images[name]) {
    throwError(
      TypeError,
      "loadImage: Parameter name must be unique.",
      "INVALID_NAME"
    );
  }
  if (onLoadCallback != null && !isFunction(onLoadCallback)) {
    throwError(
      TypeError,
      "loadImage: Parameter onLoad must be a function.",
      "INVALID_CALLBACK"
    );
  }
  if (onErrorCallback != null && !isFunction(onErrorCallback)) {
    throwError(
      TypeError,
      "loadImage: Parameter onError must be a function.",
      "INVALID_CALLBACK"
    );
  }
  const imageObj = {
    "status": "loading",
    "image": null,
    "width": null,
    "height": null
  };
  m_images[name] = imageObj;
  const updateImageFn = (img) => {
    imageObj.image = img;
    imageObj.status = "ready";
    imageObj.width = img.width;
    imageObj.height = img.height;
  };
  if (typeof src !== "string") {
    try {
      updateImageFn(src);
    } catch (error) {
      removeImage({ "name": name });
      throw error;
    }
    if (onLoadCallback) {
      onLoadCallback(name);
    }
    return name;
  }
  const load = {
    "image": null,
    "settled": false,
    "waiting": false,
    "releaseWait": () => {
      if (load.waiting) {
        load.waiting = false;
        done();
      }
    }
  };
  imageObj.load = load;
  try {
    const img = new Image();
    load.image = img;
    wait();
    load.waiting = true;
    img.onload = function() {
      if (load.settled || m_images[name] !== imageObj) {
        return;
      }
      finishImageLoad(load);
      try {
        updateImageFn(img);
        if (onLoadCallback) {
          onLoadCallback(name);
        }
      } finally {
        load.releaseWait();
      }
    };
    img.onerror = function(error) {
      if (load.settled || m_images[name] !== imageObj) {
        return;
      }
      finishImageLoad(load);
      try {
        imageObj.status = "error";
        imageObj.error = error;
        if (onErrorCallback) {
          onErrorCallback(error);
        }
      } finally {
        load.releaseWait();
      }
    };
    img.src = src;
  } catch (error) {
    if (!load.settled) {
      if (m_images[name] === imageObj) {
        delete m_images[name];
      }
      cancelImageLoad(load);
    }
    throw error;
  }
  return name;
}
function removeImage(options) {
  const name = options.name;
  if (typeof name !== "string") {
    throwError(
      TypeError,
      "removeImage: Parameter name must be a string.",
      "INVALID_NAME"
    );
  }
  const imageObj = m_images[name];
  if (!imageObj) {
    return;
  }
  delete m_images[name];
  if (imageObj.load && !imageObj.load.settled) {
    cancelImageLoad(imageObj.load);
  }
  if (imageObj.image) {
    const img = imageObj.image;
    for (const screenData of getAllScreensData()) {
      deleteWebGL2Texture(screenData, img);
    }
  }
}
function finishImageLoad(load) {
  load.settled = true;
  if (load.image) {
    load.image.onload = null;
    load.image.onerror = null;
    load.image = null;
  }
}
function cancelImageLoad(load) {
  const img = load.image;
  finishImageLoad(load);
  try {
    if (img) {
      img.removeAttribute("src");
    }
  } finally {
    load.releaseWait();
  }
}
function loadSpritesheet(options) {
  const src = options.src;
  let name = options.name;
  let spriteWidth = options.width;
  let spriteHeight = options.height;
  let margin = options.margin;
  const onLoadCallback = options.onLoad;
  const onErrorCallback = options.onError;
  let isAuto = false;
  if (margin === null) {
    margin = 0;
  }
  if (spriteWidth === null && spriteHeight === null) {
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
    throwError(
      TypeError,
      "loadSpritesheet: width and height must be integers.",
      "INVALID_DIMENSIONS"
    );
  }
  if (!isAuto && (spriteWidth < 1 || spriteHeight < 1)) {
    throwError(
      RangeError,
      "loadSpritesheet: width and height must be greater than 0.",
      "INVALID_DIMENSIONS"
    );
  }
  if (!Number.isInteger(margin)) {
    throwError(
      TypeError,
      "loadSpritesheet: margin must be an integer.",
      "INVALID_MARGIN"
    );
  }
  if (margin < 0) {
    throwError(
      RangeError,
      "loadSpritesheet: margin must be 0 or more.",
      "INVALID_MARGIN"
    );
  }
  if (!name || name === "") {
    name = generateImageName();
  }
  if (typeof name !== "string") {
    throwError(
      TypeError,
      "loadSpritesheet: Parameter name must be a string.",
      "INVALID_NAME"
    );
  }
  if (m_images[name]) {
    throwError(
      TypeError,
      "loadSpritesheet: Parameter name must be unique.",
      "INVALID_NAME"
    );
  }
  if (onLoadCallback != null && !isFunction(onLoadCallback)) {
    throwError(
      TypeError,
      "loadSpritesheet: Parameter onLoad must be a function.",
      "INVALID_CALLBACK"
    );
  }
  if (onErrorCallback != null && !isFunction(onErrorCallback)) {
    throwError(
      TypeError,
      "loadSpritesheet: Parameter onError must be a function.",
      "INVALID_CALLBACK"
    );
  }
  loadImage({
    "src": src,
    "name": name,
    "onLoad": function(imageName) {
      const imageData = m_images[imageName];
      imageData.type = "spritesheet";
      imageData.spriteWidth = spriteWidth;
      imageData.spriteHeight = spriteHeight;
      imageData.margin = margin;
      imageData.frames = [];
      imageData.isAuto = isAuto;
      const width = imageData.width;
      const height = imageData.height;
      if (isAuto) {
        processSpriteSheetAuto(imageData, width, height);
      } else {
        processSpriteSheetFixed(imageData, width, height);
      }
      if (onLoadCallback) {
        onLoadCallback(imageName);
      }
    },
    "onError": onErrorCallback
  });
  return name;
}
function getImage(options) {
  const img = getImageFromRawInput(options.name, "getImage");
  if (img.isMock) {
    const imgScreenData = getScreenData("getImage", img.dataset.screenId);
    return createCanvasFromScreenRegion(
      imgScreenData,
      0,
      0,
      imgScreenData.width,
      imgScreenData.height
    );
  }
  return img;
}
function createImageFromScreen(screenData, options) {
  let name = options.name;
  const view = screenData.view;
  let x1 = getInt(options.x1, 0);
  let y1 = getInt(options.y1, 0);
  let x2 = getInt(options.x2, view.width - 1);
  let y2 = getInt(options.y2, view.height - 1);
  if (view.clipWidth <= 0 || view.clipHeight <= 0) {
    throwError(
      RangeError,
      "createImageFromScreen: Region width and height must be greater than 0.",
      "INVALID_DIMENSIONS"
    );
  }
  const minLocalX = view.clipX - view.originX;
  const minLocalY = view.clipY - view.originY;
  const maxLocalX = view.clipX + view.clipWidth - 1 - view.originX;
  const maxLocalY = view.clipY + view.clipHeight - 1 - view.originY;
  x1 = clamp(x1, minLocalX, maxLocalX);
  y1 = clamp(y1, minLocalY, maxLocalY);
  x2 = clamp(x2, minLocalX, maxLocalX);
  y2 = clamp(y2, minLocalY, maxLocalY);
  const width = Math.abs(x2 - x1) + 1;
  const height = Math.abs(y2 - y1) + 1;
  if (width === 0 || height === 0) {
    throwError(
      RangeError,
      "createImageFromScreen: Region width and height must be greater than 0.",
      "INVALID_DIMENSIONS"
    );
  }
  const actualX = Math.min(x1, x2) + view.originX;
  const actualY = Math.min(y1, y2) + view.originY;
  if (!name || name === "") {
    name = generateImageName();
  } else if (typeof name !== "string") {
    throwError(
      TypeError,
      "createImageFromScreen: Parameter name must be a string.",
      "INVALID_NAME"
    );
  } else if (m_images[name]) {
    throwError(
      Error,
      `createImageFromScreen: name "${name}" is already used; name must be unique.`,
      "DUPLICATE_NAME"
    );
  }
  const canvas = createCanvasFromScreenRegion(screenData, actualX, actualY, width, height);
  m_images[name] = {
    "status": "ready",
    "image": canvas,
    "width": width,
    "height": height
  };
  return name;
}
function setDefaultAnchor(screenData, options) {
  const anchorX = getFloat(options.x, null);
  const anchorY = getFloat(options.y, null);
  if (anchorX === null || anchorX < 0 || anchorX > 1) {
    throwError(
      TypeError,
      "setDefaultAnchor: Parameter x must be a number between 0 and 1.",
      "INVALID_ANCHOR"
    );
  }
  if (anchorY === null || anchorY < 0 || anchorY > 1) {
    throwError(
      TypeError,
      "setDefaultAnchor: Parameter y must be a number between 0 and 1.",
      "INVALID_ANCHOR"
    );
  }
  screenData.defaultAnchorX = anchorX;
  screenData.defaultAnchorY = anchorY;
}
function getSpritesheetData(screenData, options) {
  const name = options.name;
  if (typeof name !== "string") {
    throwError(
      TypeError,
      "getSpritesheetData: Parameter name must be a string.",
      "INVALID_NAME"
    );
  }
  const spriteData = getStoredImage(name);
  if (!spriteData) {
    throwError(
      Error,
      `getSpritesheetData: Spritesheet "${name}" not found.`,
      "IMAGE_NOT_FOUND"
    );
  }
  if (spriteData.type !== "spritesheet") {
    throwError(
      Error,
      `getSpritesheetData: Image "${name}" is not a spritesheet.`,
      "NOT_A_SPRITESHEET"
    );
  }
  const spriteDataResult = {
    "frameCount": spriteData.frames.length,
    "frames": []
  };
  for (let i = 0; i < spriteData.frames.length; i++) {
    spriteDataResult.frames.push({
      "index": i,
      "x": spriteData.frames[i].x,
      "y": spriteData.frames[i].y,
      "width": spriteData.frames[i].width,
      "height": spriteData.frames[i].height,
      "left": spriteData.frames[i].x,
      "top": spriteData.frames[i].y,
      "right": spriteData.frames[i].right,
      "bottom": spriteData.frames[i].bottom
    });
  }
  return spriteDataResult;
}
function createCanvasFromScreenRegion(screenData, x, y, width, height) {
  const pixelData = readPixelsRaw(screenData, x, y, width, height);
  if (!pixelData) {
    throwError(
      Error,
      "createCanvasFromScreenRegion: Failed to read pixel data from screen.",
      "READ_FAILED"
    );
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  unpremultiplyPixels(pixelData);
  const imageData = context.createImageData(width, height);
  const canvasData = imageData.data;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcRow = height - 1 - row;
      const srcIndex = (srcRow * width + col) * 4;
      const dstIndex = (row * width + col) * 4;
      canvasData[dstIndex] = pixelData[srcIndex];
      canvasData[dstIndex + 1] = pixelData[srcIndex + 1];
      canvasData[dstIndex + 2] = pixelData[srcIndex + 2];
      canvasData[dstIndex + 3] = pixelData[srcIndex + 3];
    }
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}
function getImageFromRawInput(imageOrName, fnName) {
  let img = null;
  if (typeof imageOrName === "string") {
    const imageData = getStoredImage(imageOrName);
    if (!imageData) {
      throwError(
        Error,
        `${fnName}: Image "${imageOrName}" not found.`,
        "IMAGE_NOT_FOUND"
      );
    }
    if (imageData.status !== "ready") {
      const imgName = `Image "${imageOrName}"`;
      if (imageData.status === "loading") {
        throwError(
          Error,
          `${fnName}: "${imgName}" is still loading. Use $.ready() to wait for it.`,
          "IMAGE_NOT_READY"
        );
      }
      if (imageData.status === "error") {
        throwError(
          Error,
          `${fnName}: "${imgName}" failed to load.`,
          "IMAGE_LOAD_FAILED"
        );
      }
    }
    img = imageData.image;
  } else if (imageOrName && typeof imageOrName === "object") {
    if (isTexImageCompatible(imageOrName)) {
      img = imageOrName;
    } else if (imageOrName.screen === true) {
      const imgScreenData = getScreenData(fnName, imageOrName.id);
      img = imgScreenData.canvas;
    }
  }
  if (img === null) {
    throwError(
      TypeError,
      `${fnName}: Parameter name must be a string, canvas element, or image element.`,
      "INVALID_NAME"
    );
  }
  return img;
}
function isTexImageCompatible(img) {
  return img instanceof HTMLImageElement || img instanceof HTMLVideoElement || img instanceof HTMLCanvasElement || img instanceof ImageBitmap || img instanceof ImageData || typeof OffscreenCanvas !== "undefined" && img instanceof OffscreenCanvas;
}
function generateImageName() {
  let name;
  do {
    m_imageCount += 1;
    name = "" + m_imageCount;
  } while (m_images[name]);
  return name;
}
function getStoredImage(name) {
  if (typeof name !== "string") {
    return null;
  }
  return m_images[name] || null;
}
function processSpriteSheetFixed(imageData, width, height) {
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
function processSpriteSheetAuto(imageData, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { "willReadFrequently": true });
  context.drawImage(imageData.image, 0, 0);
  const data = context.getImageData(0, 0, width, height).data;
  const searched = new Uint8Array(width * height);
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
      const x1 = index % width;
      const y1 = Math.floor(index / width);
      const pixelIndex = y1 * width + x1;
      if (searched[pixelIndex]) {
        continue;
      }
      const frameData = {
        "x": width,
        "y": height,
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
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            continue;
          }
          const nIndex = ny * width + nx;
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

// src/renderer/context-state.js
function isContextUnavailable(screenData) {
  return screenData.contextLost === true;
}
function probeContextLoss(screenData) {
  if (isContextUnavailable(screenData)) {
    return true;
  }
  if (screenData.gl?.isContextLost?.()) {
    screenData.contextLost = true;
    screenData.contextState?.suspend();
    return true;
  }
  return false;
}
function getContextGeneration(screenData) {
  return screenData.contextGeneration ?? 0;
}

// src/api/postfx.js
var m_nextShaderId = 0;
var m_shaderHandles = /* @__PURE__ */ new Map();
function init2(api) {
  addScreenDataItem("displayShaderHandle", null);
  addScreenDataItem("displayShaderUniforms", {});
  addScreenDataItem("displayShaderUniformBindings", {});
  addScreenDataItem("displayShaderTextureResolver", null);
  addScreenDataItem("renderToDisplaySize", false);
  addScreenPreCleanupFunction(invalidateDisplayShaderScreenSource);
  registerCommands2();
}
function registerCommands2() {
  addCommand("createShader", createShader, false, ["fragmentSource", "uniforms"]);
  addCommand("removeShader", removeShader, false, ["shaderHandle"]);
  addCommand("getShaderInfo", getShaderInfo, true, ["shaderHandle"], true);
  addCommand("applyShader", applyShader, true, ["shaderHandle", "uniforms"]);
  addCommand(
    "setDisplayShader",
    setDisplayShader,
    true,
    ["shaderHandle", "uniforms"]
  );
  addCommand(
    "setDisplayShaderUniforms",
    setDisplayShaderUniforms,
    true,
    ["uniforms"]
  );
}
function createShader(options) {
  const fragmentSource = options.fragmentSource;
  const uniforms = options.uniforms ?? null;
  if (typeof fragmentSource !== "string") {
    throwError(
      TypeError,
      "createShader: Parameter fragmentSource must be a string.",
      "INVALID_FRAGMENT_SOURCE"
    );
  }
  if (fragmentSource.trim().length === 0) {
    throwError(
      TypeError,
      "createShader: Parameter fragmentSource must not be empty.",
      "INVALID_FRAGMENT_SOURCE"
    );
  }
  if (!fragmentSource.includes("#version 300 es")) {
    throwError(
      TypeError,
      "createShader: Parameter fragmentSource must include #version 300 es.",
      "INVALID_FRAGMENT_SOURCE"
    );
  }
  validateUniformMap(uniforms, "createShader");
  const handle = {
    "id": m_nextShaderId++,
    "fragmentSource": fragmentSource,
    "uniforms": copyUniforms(uniforms)
  };
  m_shaderHandles.set(handle.id, handle);
  return handle.id;
}
function validateShaderId(shaderId, cmdName) {
  if (typeof shaderId !== "number" || !Number.isInteger(shaderId) || shaderId < 0) {
    throwError(
      TypeError,
      `${cmdName}: Parameter shaderHandle must be a shader id from createShader.`,
      "INVALID_SHADER_HANDLE"
    );
  }
  return shaderId;
}
function getShaderInfo(screenData, options) {
  const shaderId = validateShaderId(options.shaderHandle, "getShaderInfo");
  const handle = m_shaderHandles.get(shaderId);
  if (!handle) {
    throwError(
      TypeError,
      `getShaderInfo: Unknown shader handle id ${shaderId}.`,
      "INVALID_SHADER_HANDLE"
    );
  }
  let compiledScreenCount = 0;
  let queuedPassCount = 0;
  let displayScreenCount = 0;
  for (const currentScreen of getAllScreensData()) {
    if (currentScreen.customShaders[shaderId]) {
      compiledScreenCount += 1;
    }
    queuedPassCount += countQueuedShaderPasses(currentScreen, shaderId);
    if (currentScreen.displayShaderHandle && currentScreen.displayShaderHandle.id === shaderId) {
      displayScreenCount += 1;
    }
  }
  const info = {
    "id": handle.id,
    "fragmentSource": handle.fragmentSource,
    "uniforms": copyUniforms(handle.uniforms),
    "compiledScreenCount": compiledScreenCount,
    "queuedPassCount": queuedPassCount,
    "displayScreenCount": displayScreenCount
  };
  if (screenData) {
    const diagnostics = getCustomShaderDiagnostics(screenData, shaderId);
    info.screen = {
      "compiled": diagnostics.compiled,
      "queuedPassCount": countQueuedShaderPasses(screenData, shaderId),
      "displayActive": !!screenData.displayShaderHandle && screenData.displayShaderHandle.id === shaderId,
      "uniforms": diagnostics.uniforms
    };
  }
  return info;
}
function removeShader(options) {
  const shaderId = validateShaderId(options.shaderHandle, "removeShader");
  if (!m_shaderHandles.has(shaderId)) {
    return;
  }
  const screens = getAllScreensData();
  for (const screenData of screens) {
    if (countQueuedShaderPasses(screenData, shaderId) > 0) {
      flushBatches(screenData);
    }
  }
  for (const screenData of screens) {
    if (screenData.displayShaderHandle && screenData.displayShaderHandle.id === shaderId) {
      clearDisplayShader(screenData);
    }
    deleteCustomShaderProgram(screenData, shaderId);
  }
  m_shaderHandles.delete(shaderId);
}
function getShaderHandle(shaderHandle, cmdName) {
  if (cmdName == null) {
    cmdName = "applyShader";
  }
  if (shaderHandle == null) {
    throwError(
      TypeError,
      `${cmdName}: Parameter shaderHandle is required.`,
      "INVALID_SHADER_HANDLE"
    );
  }
  if (typeof shaderHandle === "number") {
    const handle = m_shaderHandles.get(shaderHandle);
    if (!handle) {
      throwError(
        TypeError,
        `${cmdName}: Unknown shader handle id ${shaderHandle}.`,
        "INVALID_SHADER_HANDLE"
      );
    }
    return handle;
  }
  if (typeof shaderHandle === "object" && "id" in shaderHandle && "fragmentSource" in shaderHandle) {
    return shaderHandle;
  }
  throwError(
    TypeError,
    `${cmdName}: Parameter shaderHandle must be a shader id or handle from createShader.`,
    "INVALID_SHADER_HANDLE"
  );
}
function copyUniforms(uniforms) {
  if (!uniforms || typeof uniforms !== "object") {
    return {};
  }
  const copy = {};
  for (const name of Object.keys(uniforms)) {
    const value = uniforms[name];
    if (Array.isArray(value)) {
      copy[name] = value.slice();
    } else if (value instanceof Float32Array || value instanceof Int32Array || value instanceof Uint32Array) {
      copy[name] = value.slice();
    } else {
      copy[name] = value;
    }
  }
  return copy;
}
function mergeUniforms(defaults, overrides) {
  const merged = copyUniforms(defaults);
  const overrideCopy = copyUniforms(overrides);
  for (const name of Object.keys(overrideCopy)) {
    merged[name] = overrideCopy[name];
  }
  return merged;
}
function validateUniformMap(uniforms, cmdName) {
  if (uniforms != null && (typeof uniforms !== "object" || Array.isArray(uniforms))) {
    throwError(
      TypeError,
      `${cmdName}: Parameter uniforms must be an object.`,
      "INVALID_UNIFORMS"
    );
  }
}
function resolveSamplerSource(screenData, input2, cmdName) {
  let source;
  try {
    if (m_screenCanvasMap.has(input2)) {
      source = input2;
    } else {
      source = getImageFromRawInput(input2, cmdName);
    }
  } catch (error) {
    if (error.code === "INVALID_NAME") {
      throwError(
        TypeError,
        `${cmdName}: Invalid sampler2D image input.`,
        "INVALID_UNIFORM_VALUE"
      );
    }
    throw error;
  }
  const sourceData = m_screenCanvasMap.get(source);
  if (sourceData === screenData) {
    throwError(
      Error,
      `${cmdName}: A shader cannot sample its destination screen.`,
      "FRAMEBUFFER_FEEDBACK_LOOP"
    );
  }
  return source;
}
function normalizeUniforms(screenData, cache, uniforms, cmdName) {
  return normalizeCustomUniforms(
    screenData.gl,
    cache,
    uniforms,
    cmdName,
    (input2) => resolveSamplerSource(screenData, input2, cmdName)
  );
}
function getSamplerTextureMap(screenData, bindings) {
  const textures = /* @__PURE__ */ new Map();
  for (const binding of Object.values(bindings)) {
    if (binding.info.family !== "sampler") {
      continue;
    }
    for (const source of binding.sources) {
      if (!textures.has(source)) {
        textures.set(source, getSamplerTexture(screenData, source));
      }
    }
  }
  return textures;
}
function retainSamplerSources(uniforms, bindings) {
  const retained = copyUniforms(uniforms);
  for (const name of Object.keys(bindings)) {
    const binding = bindings[name];
    if (binding.info.family !== "sampler") {
      continue;
    }
    if (binding.sources.length === 1) {
      retained[name] = binding.sources[0];
    } else {
      retained[name] = binding.sources.slice();
    }
  }
  return retained;
}
function clearDisplayShader(screenData) {
  screenData.displayShaderHandle = null;
  screenData.displayShaderUniforms = {};
  screenData.displayShaderUniformBindings = {};
  screenData.displayShaderTextureResolver = null;
  screenData.renderToDisplaySize = false;
  flushBatches(screenData);
  refreshScreenSize(screenData, true);
}
function invalidateDisplayShaderScreenSource(sourceData) {
  const source = sourceData.canvas;
  for (const screenData of getAllScreensData()) {
    if (screenData === sourceData) {
      continue;
    }
    const usesSource = Object.values(
      screenData.displayShaderUniformBindings ?? {}
    ).some((binding) => {
      return binding.info.family === "sampler" && binding.sources.includes(source);
    }) || Object.values(screenData.displayShaderUniforms ?? {}).some((value) => {
      return value === source || value === sourceData.api || Array.isArray(value) && value.includes(source);
    });
    if (usesSource) {
      clearDisplayShader(screenData);
    }
    deleteWebGL2Texture(screenData, source);
  }
}
function applyShader(screenData, options) {
  const handle = getShaderHandle(options.shaderHandle);
  validateUniformMap(options.uniforms, "applyShader");
  if (probeContextLoss(screenData)) {
    return;
  }
  const overrides = copyUniforms(options.uniforms);
  const merged = mergeUniforms(handle.uniforms, overrides);
  const cache = validateCustomShaderProgram(screenData, handle, "applyShader");
  const bindings = normalizeUniforms(screenData, cache, merged, "applyShader");
  const samplerTextures = getSamplerTextureMap(screenData, bindings);
  prepareShaderBatch(screenData, handle, bindings, samplerTextures);
  setImageDirty(screenData);
}
function setDisplayShader(screenData, options) {
  if (options.shaderHandle == null) {
    clearDisplayShader(screenData);
    return;
  }
  validateUniformMap(options.uniforms, "setDisplayShader");
  const handle = getShaderHandle(options.shaderHandle, "setDisplayShader");
  if (probeContextLoss(screenData)) {
    screenData.displayShaderHandle = handle;
    screenData.displayShaderUniforms = copyUniforms(
      mergeUniforms(handle.uniforms, options.uniforms)
    );
    screenData.displayShaderUniformBindings = {};
    screenData.renderToDisplaySize = !screenData.isOffscreen;
    refreshScreenSize(screenData, true);
    return;
  }
  const cache = validateCustomShaderProgram(
    screenData,
    handle,
    "setDisplayShader"
  );
  const merged = mergeUniforms(handle.uniforms, options.uniforms);
  const bindings = normalizeUniforms(screenData, cache, merged, "setDisplayShader");
  getSamplerTextureMap(screenData, bindings);
  screenData.displayShaderHandle = handle;
  screenData.displayShaderUniforms = retainSamplerSources(merged, bindings);
  screenData.displayShaderUniformBindings = bindings;
  screenData.displayShaderTextureResolver = (source) => {
    return getSamplerTexture(screenData, source);
  };
  screenData.renderToDisplaySize = !screenData.isOffscreen;
  flushBatches(screenData);
  refreshScreenSize(screenData, true);
}
function setDisplayShaderUniforms(screenData, options) {
  const incoming = options.uniforms;
  validateUniformMap(incoming, "setDisplayShaderUniforms");
  const values = mergeUniforms(screenData.displayShaderUniforms, incoming);
  if (probeContextLoss(screenData)) {
    screenData.displayShaderUniforms = copyUniforms(values);
    return;
  }
  let bindings = screenData.displayShaderUniformBindings;
  if (screenData.displayShaderHandle) {
    const cache = validateCustomShaderProgram(
      screenData,
      screenData.displayShaderHandle,
      "setDisplayShaderUniforms"
    );
    bindings = normalizeUniforms(
      screenData,
      cache,
      values,
      "setDisplayShaderUniforms"
    );
    getSamplerTextureMap(screenData, bindings);
  }
  screenData.displayShaderUniforms = retainSamplerSources(values, bindings);
  screenData.displayShaderUniformBindings = bindings;
  if (screenData.displayShaderHandle) {
    presentCurrentScreen(screenData);
  }
}
function restoreDisplayShaderBindings(screenData) {
  if (!screenData.displayShaderHandle) {
    return;
  }
  const cache = validateCustomShaderProgram(
    screenData,
    screenData.displayShaderHandle,
    "setDisplayShader"
  );
  const bindings = normalizeUniforms(
    screenData,
    cache,
    screenData.displayShaderUniforms,
    "setDisplayShader"
  );
  screenData.displayShaderUniforms = retainSamplerSources(
    screenData.displayShaderUniforms,
    bindings
  );
  screenData.displayShaderUniformBindings = bindings;
  screenData.displayShaderTextureResolver = (source) => {
    return getSamplerTexture(screenData, source);
  };
}

// src/renderer/shaders/display.vert
var display_default = "#version 300 es\nin vec2 a_position;\nout vec2 v_texCoord;\nvoid main() {\ngl_Position = vec4(a_position, 0.0, 1.0);\nv_texCoord = (a_position + 1.0) * 0.5;\n}";

// src/renderer/shaders/display.frag
var display_default2 = "#version 300 es\nprecision mediump float;\nin vec2 v_texCoord;\nuniform sampler2D u_texture;\nout vec4 fragColor;\nvoid main() {\nvec4 texColor = texture(u_texture, v_texCoord);\nfragColor = texColor;\n}";

// src/renderer/shaders.js
function init3() {
  addScreenDataItem("displayProgram", null);
  addScreenDataItem("displayPositionBuffer", null);
  addScreenDataItem("displayLocations", null);
}
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    throwError(Error, "screen: Failed to allocate shader.", "WEBGL_ERROR");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
function createShaderProgram(gl, vertexSrc, fragSrc, cmdName = "screen") {
  let vertexShader = null;
  let fragmentShader = null;
  let program = null;
  let isProgramLinked = false;
  try {
    vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vertexShader || !fragmentShader) {
      throwError(
        Error,
        `${cmdName}: Unable to compile shaders.`,
        "INVALID_SHADERS"
      );
    }
    program = gl.createProgram();
    if (!program) {
      throwError(
        Error,
        `${cmdName}: Failed to allocate shader program.`,
        "WEBGL_ERROR"
      );
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const errLog = gl.getProgramInfoLog(program);
      throwError(
        Error,
        `${cmdName}: Shader program error: ${errLog}.`,
        "SHADER_PROGRAM_ERROR"
      );
    }
    isProgramLinked = true;
    return program;
  } finally {
    if (vertexShader) {
      gl.deleteShader(vertexShader);
    }
    if (fragmentShader) {
      gl.deleteShader(fragmentShader);
    }
    if (program && !isProgramLinked) {
      gl.deleteProgram(program);
    }
  }
}
function setupDisplayShader(screenData) {
  const gl = screenData.gl;
  const program = createShaderProgram(gl, display_default, display_default2);
  screenData.displayProgram = program;
  const positions = new Float32Array([
    // Bottom left
    -1,
    -1,
    // Bottom right
    1,
    -1,
    // Top left
    -1,
    1,
    // Top left
    -1,
    1,
    // Bottom right
    1,
    -1,
    // Top right
    1,
    1
  ]);
  const positionBuffer = gl.createBuffer();
  screenData.displayPositionBuffer = positionBuffer;
  const positionLoc = gl.getAttribLocation(program, "a_position");
  const textureLoc = gl.getUniformLocation(program, "u_texture");
  const quadVao = gl.createVertexArray();
  screenData.displayQuadVao = quadVao;
  if (!positionBuffer || !quadVao) {
    throwError(Error, "screen: Failed to allocate display buffers.", "WEBGL_ERROR");
  }
  gl.bindVertexArray(quadVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  screenData.displayProgram = program;
  screenData.displayPositionBuffer = positionBuffer;
  screenData.displayQuadVao = quadVao;
  screenData.displayLocations = {
    "position": positionLoc,
    "texture": textureLoc
  };
}
function getOrCreateCustomShaderProgram(screenData, handle, cmdName = "screen") {
  const gl = screenData.gl;
  let cache = screenData.customShaders[handle.id];
  if (cache) {
    return cache;
  }
  const program = createShaderProgram(gl, display_default, handle.fragmentSource, cmdName);
  const positionLoc = gl.getAttribLocation(program, "a_position");
  const textureLoc = gl.getUniformLocation(program, "u_texture");
  const sourceSizeLoc = gl.getUniformLocation(program, "u_sourceSize");
  const outputSizeLoc = gl.getUniformLocation(program, "u_outputSize");
  const timeLoc = gl.getUniformLocation(program, "u_time");
  const frameLoc = gl.getUniformLocation(program, "u_frame");
  const customUniforms = reflectCustomUniforms(gl, program);
  cache = {
    "program": program,
    "customUniforms": customUniforms,
    "locations": {
      "position": positionLoc,
      "texture": textureLoc,
      "sourceSize": sourceSizeLoc,
      "outputSize": outputSizeLoc,
      "time": timeLoc,
      "frame": frameLoc
    }
  };
  screenData.customShaders[handle.id] = cache;
  return cache;
}
var m_reservedUniforms = /* @__PURE__ */ new Set([
  "u_texture",
  "u_sourceSize",
  "u_outputSize",
  "u_time",
  "u_frame"
]);
function getUniformTypeName(gl, type) {
  const types = /* @__PURE__ */ new Map([
    [gl.FLOAT, "float"],
    [gl.FLOAT_VEC2, "vec2"],
    [gl.FLOAT_VEC3, "vec3"],
    [gl.FLOAT_VEC4, "vec4"],
    [gl.INT, "int"],
    [gl.INT_VEC2, "ivec2"],
    [gl.INT_VEC3, "ivec3"],
    [gl.INT_VEC4, "ivec4"],
    [gl.UNSIGNED_INT, "uint"],
    [gl.UNSIGNED_INT_VEC2, "uvec2"],
    [gl.UNSIGNED_INT_VEC3, "uvec3"],
    [gl.UNSIGNED_INT_VEC4, "uvec4"],
    [gl.BOOL, "bool"],
    [gl.BOOL_VEC2, "bvec2"],
    [gl.BOOL_VEC3, "bvec3"],
    [gl.BOOL_VEC4, "bvec4"],
    [gl.FLOAT_MAT2, "mat2"],
    [gl.FLOAT_MAT3, "mat3"],
    [gl.FLOAT_MAT4, "mat4"],
    [gl.FLOAT_MAT2x3, "mat2x3"],
    [gl.FLOAT_MAT2x4, "mat2x4"],
    [gl.FLOAT_MAT3x2, "mat3x2"],
    [gl.FLOAT_MAT3x4, "mat3x4"],
    [gl.FLOAT_MAT4x2, "mat4x2"],
    [gl.FLOAT_MAT4x3, "mat4x3"],
    [gl.SAMPLER_2D, "sampler2D"]
  ]);
  return types.get(type) ?? "unknown";
}
function getCustomShaderDiagnostics(screenData, shaderId) {
  const cache = screenData.customShaders[shaderId];
  if (!cache) {
    return { "compiled": false, "uniforms": [] };
  }
  const uniforms = [];
  for (const uniform of Object.values(cache.customUniforms)) {
    uniforms.push({
      "name": uniform.name,
      "type": getUniformTypeName(screenData.gl, uniform.type),
      "size": uniform.size,
      "reserved": m_reservedUniforms.has(uniform.name)
    });
  }
  return { "compiled": true, "uniforms": uniforms };
}
function deleteCustomShaderProgram(screenData, shaderId) {
  const cache = screenData.customShaders[shaderId];
  if (!cache) {
    return;
  }
  if (cache.program) {
    screenData.gl.deleteProgram(cache.program);
  }
  delete screenData.customShaders[shaderId];
}
function reflectCustomUniforms(gl, program) {
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const active = gl.getActiveUniform(program, i);
    if (!active) {
      continue;
    }
    let name;
    if (active.name.endsWith("[0]")) {
      name = active.name.slice(0, -3);
    } else {
      name = active.name;
    }
    uniforms[name] = {
      "location": gl.getUniformLocation(program, active.name),
      "name": name,
      "size": active.size,
      "type": active.type
    };
  }
  return uniforms;
}
function validateCustomShaderProgram(screenData, handle, cmdName) {
  const cache = getOrCreateCustomShaderProgram(screenData, handle, cmdName);
  if (cache.locations.texture === null) {
    throwError(
      Error,
      `${cmdName}: Missing required uniform u_texture in shader.`,
      "MISSING_U_TEXTURE"
    );
  }
  return cache;
}
var m_isDebug = typeof window !== "undefined" && window.location.search.includes(
  "webgl-debug"
);
function uniformError(cmdName, code, message) {
  const error = new TypeError(`${cmdName}: ${message}`);
  error.code = code;
  return error;
}
function getUniformTypeInfo(gl, type) {
  const types = /* @__PURE__ */ new Map([
    [gl.FLOAT, ["float", 1, "float"]],
    [gl.FLOAT_VEC2, ["float", 2, "float"]],
    [gl.FLOAT_VEC3, ["float", 3, "float"]],
    [gl.FLOAT_VEC4, ["float", 4, "float"]],
    [gl.INT, ["int", 1, "int"]],
    [gl.INT_VEC2, ["int", 2, "int"]],
    [gl.INT_VEC3, ["int", 3, "int"]],
    [gl.INT_VEC4, ["int", 4, "int"]],
    [gl.UNSIGNED_INT, ["uint", 1, "uint"]],
    [gl.UNSIGNED_INT_VEC2, ["uint", 2, "uint"]],
    [gl.UNSIGNED_INT_VEC3, ["uint", 3, "uint"]],
    [gl.UNSIGNED_INT_VEC4, ["uint", 4, "uint"]],
    [gl.BOOL, ["bool", 1, "int"]],
    [gl.BOOL_VEC2, ["bool", 2, "int"]],
    [gl.BOOL_VEC3, ["bool", 3, "int"]],
    [gl.BOOL_VEC4, ["bool", 4, "int"]],
    [gl.FLOAT_MAT2, ["matrix2fv", 4, "float"]],
    [gl.FLOAT_MAT3, ["matrix3fv", 9, "float"]],
    [gl.FLOAT_MAT4, ["matrix4fv", 16, "float"]],
    [gl.FLOAT_MAT2x3, ["matrix2x3fv", 6, "float"]],
    [gl.FLOAT_MAT2x4, ["matrix2x4fv", 8, "float"]],
    [gl.FLOAT_MAT3x2, ["matrix3x2fv", 6, "float"]],
    [gl.FLOAT_MAT3x4, ["matrix3x4fv", 12, "float"]],
    [gl.FLOAT_MAT4x2, ["matrix4x2fv", 8, "float"]],
    [gl.FLOAT_MAT4x3, ["matrix4x3fv", 12, "float"]]
  ]);
  if (type === gl.SAMPLER_2D) {
    return { "components": 1, "family": "sampler", "setter": "sampler" };
  }
  const info = types.get(type);
  if (!info) {
    return null;
  }
  return { "components": info[1], "family": info[2], "setter": info[0] };
}
function isNumericArray(value) {
  return Array.isArray(value) || value instanceof Float32Array || value instanceof Int32Array || value instanceof Uint32Array;
}
function normalizeNumericUniform(info, value, cmdName) {
  const expectedLength = info.components * info.uniform.size;
  let values;
  if (expectedLength === 1 && !isNumericArray(value)) {
    values = [value];
  } else if (isNumericArray(value)) {
    values = Array.from(value);
  } else {
    throw uniformError(
      cmdName,
      "INVALID_UNIFORM_VALUE",
      `Uniform "${info.uniform.name}" requires ${expectedLength} values.`
    );
  }
  if (values.length !== expectedLength) {
    throw uniformError(
      cmdName,
      "INVALID_UNIFORM_VALUE",
      `Uniform "${info.uniform.name}" requires ${expectedLength} values.`
    );
  }
  for (const item of values) {
    let isValid = typeof item === "number" && Number.isFinite(item);
    if (info.setter === "bool") {
      isValid = typeof item === "boolean";
    } else if (info.family === "int" || info.family === "uint") {
      isValid = isValid && Number.isInteger(item);
      if (info.family === "uint") {
        isValid = isValid && item >= 0 && item <= 4294967295;
      } else {
        isValid = isValid && item >= -2147483648 && item <= 2147483647;
      }
    }
    if (!isValid) {
      throw uniformError(
        cmdName,
        "INVALID_UNIFORM_VALUE",
        `Uniform "${info.uniform.name}" contains an invalid value.`
      );
    }
  }
  if (info.setter === "bool") {
    values = values.map((item) => {
      if (item) {
        return 1;
      }
      return 0;
    });
  }
  if (info.family === "float") {
    return new Float32Array(values);
  }
  if (info.family === "uint") {
    return new Uint32Array(values);
  }
  return new Int32Array(values);
}
function normalizeCustomUniforms(gl, cache, uniforms, cmdName, resolveSampler) {
  const normalized = {};
  const samplerInfos = Object.values(cache.customUniforms).filter((uniform) => {
    if (m_reservedUniforms.has(uniform.name)) {
      return false;
    }
    const typeInfo = getUniformTypeInfo(gl, uniform.type);
    return typeInfo && typeInfo.family === "sampler";
  });
  const samplerCount = samplerInfos.reduce((total, uniform) => total + uniform.size, 0);
  if (samplerCount + 1 > gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)) {
    throw uniformError(
      cmdName,
      "TOO_MANY_TEXTURE_UNIFORMS",
      "Shader requires more fragment texture units than this WebGL context supports."
    );
  }
  for (const name of Object.keys(uniforms ?? {})) {
    if (m_reservedUniforms.has(name)) {
      continue;
    }
    const uniform = cache.customUniforms[name];
    if (!uniform) {
      if (m_isDebug) {
        console.warn(`${cmdName}: Unknown uniform "${name}" ignored.`);
      }
      continue;
    }
    const typeInfo = getUniformTypeInfo(gl, uniform.type);
    if (!typeInfo) {
      throw uniformError(
        cmdName,
        "UNSUPPORTED_UNIFORM_TYPE",
        `Uniform "${name}" uses an unsupported GLSL type.`
      );
    }
    const info = {
      "components": typeInfo.components,
      "family": typeInfo.family,
      "setter": typeInfo.setter,
      "uniform": uniform
    };
    if (info.family === "sampler") {
      let inputs;
      if (uniform.size === 1) {
        inputs = [uniforms[name]];
      } else {
        inputs = uniforms[name];
      }
      if (!Array.isArray(inputs) || inputs.length !== uniform.size) {
        throw uniformError(
          cmdName,
          "INVALID_UNIFORM_VALUE",
          `Uniform "${name}" requires ${uniform.size} image inputs.`
        );
      }
      normalized[name] = {
        "info": info,
        "sources": inputs.map((input2) => resolveSampler(input2))
      };
    } else {
      normalized[name] = {
        "info": info,
        "value": normalizeNumericUniform(info, uniforms[name], cmdName)
      };
    }
  }
  for (const uniform of samplerInfos) {
    if (!normalized[uniform.name]) {
      throw uniformError(
        cmdName,
        "INVALID_UNIFORM_VALUE",
        `Sampler uniform "${uniform.name}" requires an image input.`
      );
    }
  }
  return normalized;
}
function setCustomUniforms(gl, uniforms, getTexture) {
  let textureUnit = 1;
  for (const binding of Object.values(uniforms ?? {})) {
    const { "info": info, "value": value, "sources": sources } = binding;
    const loc = info.uniform.location;
    if (info.family === "sampler") {
      const units = [];
      for (const source of sources) {
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, getTexture(source));
        units.push(textureUnit++);
      }
      if (units.length === 1) {
        gl.uniform1i(loc, units[0]);
      } else {
        gl.uniform1iv(loc, new Int32Array(units));
      }
      continue;
    }
    if (info.setter.startsWith("matrix")) {
      gl[`uniformMatrix${info.setter.slice(6)}`](loc, false, value);
    } else if (info.components === 1 && info.uniform.size === 1) {
      let method = "uniform1i";
      if (info.family === "float") {
        method = "uniform1f";
      } else if (info.family === "uint") {
        method = "uniform1ui";
      }
      gl[method](loc, value[0]);
    } else {
      let suffix = "iv";
      if (info.family === "float") {
        suffix = "fv";
      } else if (info.family === "uint") {
        suffix = "uiv";
      }
      gl[`uniform${info.components}${suffix}`](loc, value);
    }
  }
  gl.activeTexture(gl.TEXTURE0);
}

// src/api/blends.js
var BLEND_REPLACE = "replace";
var BLEND_ALPHA = "alpha";
var BLENDS = /* @__PURE__ */ new Set([BLEND_REPLACE, BLEND_ALPHA]);
function init4(api) {
  addScreenDataItem("blends", {
    "blend": BLEND_REPLACE,
    "noise": null,
    "noiseSeed": null,
    "noiseData": []
  });
  registerCommands3();
}
function registerCommands3() {
  addCommand("setBlend", setBlend, true, ["blend"]);
  addCommand("setNoise", setNoise, true, ["noise", "seed"]);
}
function setBlend(screenData, options) {
  const blend = options.blend ?? screenData.blends.blend;
  if (!BLENDS.has(blend)) {
    throwError(
      TypeError,
      `setBlend: Parameter blend is not a valid blend. Valid blends are (${Array.from(BLENDS).join(", ")}).`,
      "INVALID_BLEND_MODE"
    );
  }
  const previousBlend = screenData.blends.blend;
  const previousBlends = structuredClone(screenData.blends);
  screenData.blends.blend = blend;
  if (previousBlend !== blend) {
    blendModeChanged(screenData, previousBlends);
  }
}
function setNoise(screenData, options) {
  const noise = options.noise;
  const seed = options.seed;
  const noiseErrorMsg = "setNoise: Parameter noise must either be a number ie: 32, a 1d array with numbers ie: [23, 13, 15, 0], or a 2d array where the inner array is two arrays first array is min values second array is max values for each ie: [[23, 15, 18, 0], [32,18, 12, 0]]. The order of items in the inner array is [red, green, blue, alpha].";
  let noiseResult = null;
  if (noise !== null) {
    const validateNoiseValFn = (noiseVal) => {
      if (noiseVal === null) {
        throwError(TypeError, noiseErrorMsg, "INVALID_NOISE_VALUE");
      }
    };
    if (Array.isArray(noise)) {
      noiseResult = [
        new Float32Array([0, 0, 0, 0]),
        new Float32Array([0, 0, 0, 0])
      ];
      for (let i = 0; i < noise.length && i < 4; i += 1) {
        const noiseRow = noise[i];
        if (Array.isArray(noiseRow)) {
          if (i >= 2) {
            continue;
          }
          for (let j = 0; j < noiseRow.length && j < 4; j += 1) {
            const noiseVal = getInt(noiseRow[j], null);
            validateNoiseValFn(noiseVal);
            noiseResult[i][j] = noiseVal / 255;
          }
        } else {
          const noiseVal = getInt(noiseRow, null);
          validateNoiseValFn(noiseVal);
          noiseResult[0][i] = -noiseVal / 255;
          noiseResult[1][i] = noiseVal / 255;
        }
      }
    } else {
      const noiseVal = getInt(noise, null);
      if (noiseVal !== null) {
        const val = noiseVal / 255;
        noiseResult = [
          new Float32Array([-val, -val, -val, -val]),
          new Float32Array([val, val, val, val])
        ];
      }
    }
  }
  const noiseSeed = getFloat(seed, null);
  const previousNoise = screenData.blends.noise;
  const previousSeed = screenData.blends.noiseSeed;
  const previousBlends = structuredClone(screenData.blends);
  screenData.blends.noise = noiseResult;
  screenData.blends.noiseSeed = noiseSeed;
  let isNoiseChanged = false;
  if (previousNoise === null && noiseResult === null) {
    isNoiseChanged = false;
  } else if (previousNoise === null && noiseResult !== null || previousNoise !== null && noiseResult === null) {
    isNoiseChanged = true;
  } else {
    isNoiseChanged = JSON.stringify(previousNoise) !== JSON.stringify(noiseResult);
  }
  const isSeedChanged = previousSeed !== noiseSeed;
  if (isNoiseChanged || isSeedChanged) {
    blendModeChanged(screenData, previousBlends);
  }
}

// src/renderer/shaders/point.vert
var point_default = "#version 300 es\nin vec2 a_position;\nin vec4 a_color;\nuniform vec2 u_resolution;\nout vec4 v_color;\nvoid main() {\nvec2 pixelCenter = a_position + 0.5;\nvec2 ndc = ((pixelCenter / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);\ngl_Position = vec4(ndc, 0.0, 1.0);\ngl_PointSize = 1.0;\nv_color = a_color;\n}";

// src/renderer/shaders/point.frag
var point_default2 = "#version 300 es\nprecision mediump float;\nin vec4 v_color;\nuniform vec4 u_noiseMin;\nuniform vec4 u_noiseMax;\nuniform float u_time;\nout vec4 fragColor;\nfloat hash(vec2 p) {\np = fract(p * vec2(5.3983, 5.4439));\np += dot(p, p.yx + 2.153);\nreturn fract(p.x * p.y * 954.3121);\n}\nfloat mapRange(float value, float min, float max) {\nreturn min + value * (max - min);\n}\nvoid main() {\nvec4 baseColor = v_color;\nvec4 pixelNoise = vec4(0.0);\nfloat noiseRange = abs(u_noiseMax.r - u_noiseMin.r) +\nabs(u_noiseMax.g - u_noiseMin.g) +\nabs(u_noiseMax.b - u_noiseMin.b) +\nabs(u_noiseMax.a - u_noiseMin.a);\nif (noiseRange > 0.0001) {\nvec2 iFragCoord = floor(gl_FragCoord.xy);\nfloat noiseR = hash(iFragCoord + vec2(u_time * 0.01, u_time * 0.02) + vec2(10.0, 20.0));\nfloat noiseG = hash(iFragCoord + vec2(u_time * 0.03, u_time * 0.04) + vec2(30.0, 40.0));\nfloat noiseB = hash(iFragCoord + vec2(u_time * 0.05, u_time * 0.06) + vec2(50.0, 60.0));\nfloat noiseA = hash(iFragCoord + vec2(u_time * 0.07, u_time * 0.08) + vec2(70.0, 80.0));\npixelNoise.r = mapRange(noiseR, u_noiseMin.r, u_noiseMax.r);\npixelNoise.g = mapRange(noiseG, u_noiseMin.g, u_noiseMax.g);\npixelNoise.b = mapRange(noiseB, u_noiseMin.b, u_noiseMax.b);\npixelNoise.a = mapRange(noiseA, u_noiseMin.a, u_noiseMax.a);\n}\nvec4 finalColor = baseColor + pixelNoise;\nfinalColor = clamp(finalColor, 0.0, 1.0);\nfragColor = vec4(finalColor.rgb * finalColor.a, finalColor.a);\n}";

// src/renderer/shaders/image.vert
var image_default = "#version 300 es\nin vec4 a_position;\nin vec4 a_color;\nin vec2 a_texCoord;\nuniform vec2 u_resolution;\nout vec4 v_color;\nout vec2 v_texCoord;\nvoid main() {\nvec2 zeroToOne = a_position.xy / u_resolution;\nvec2 zeroToTwo = zeroToOne * 2.0;\nvec2 clipSpace = zeroToTwo - 1.0;\ngl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\nv_color = a_color;\nv_texCoord = a_texCoord;\n}";

// src/renderer/shaders/image.frag
var image_default2 = "#version 300 es\nprecision highp float;\nin vec4 v_color;\nin vec2 v_texCoord;\nuniform sampler2D u_texture;\nout vec4 outColor;\nvoid main() {\nvec4 texColor = texture(u_texture, v_texCoord);\noutColor = vec4(texColor.rgb * v_color.rgb * v_color.a, texColor.a * v_color.a);\n}";

// src/renderer/shaders/geometry.vert
var geometry_default = "#version 300 es\nin vec2 a_position;\nin vec4 a_color;\nuniform vec2 u_resolution;\nout vec4 v_color;\nvoid main() {\nvec2 ndc = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);\ngl_Position = vec4(ndc, 0.0, 1.0);\nv_color = a_color;\n}";

// src/renderer/batches.js
var POINTS_BATCH = 0;
var IMAGE_BATCH = 1;
var GEOMETRY_BATCH = 2;
var POINTS_REPLACE_BATCH = 3;
var IMAGE_REPLACE_BATCH = 4;
var SHADER_BATCH = 5;
var MAX_SIZE_MULTIPLIER = Math.pow(2, 8);
var DEFAULT_POINT_BATCH_SIZE = 7500;
var MAX_POINT_BATCH_SIZE = DEFAULT_POINT_BATCH_SIZE * MAX_SIZE_MULTIPLIER;
var DEFAULT_IMAGE_BATCH_SIZE = 700;
var MAX_IMAGE_BATCH_SIZE = DEFAULT_IMAGE_BATCH_SIZE * MAX_SIZE_MULTIPLIER;
var DEFAULT_GEOMETRY_BATCH_SIZE = 800;
var MAX_GEOMETRY_BATCH_SIZE = DEFAULT_GEOMETRY_BATCH_SIZE * MAX_SIZE_MULTIPLIER;
var BATCH_CAPACITY_SHRINK_INTERVAL = 5e3;
var BATCH_TYPES = ["POINTS", "IMAGE", "GEOMETRY", "POINTS_REPLACE", "IMAGE_REPLACE", "SHADER"];
var m_batchProto = {
  // Type of batch POINTS_BATCH, IMAGE_BATCH, etc...
  "type": null,
  // Tri-state: null = use default, true = alpha, false = replace
  "overrideGlobalBlend": null,
  "program": null,
  "vertices": null,
  "colors": null,
  "count": 0,
  // View origin applied to local vertices
  "originX": 0,
  "originY": 0,
  // Capacity
  "minCapacity": 0,
  "capacity": 0,
  "maxCapacity": 0,
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
  "useTexture": false,
  "texture": null,
  // Drawing mode, e.g., gl.POINTS or gl.TRIANGLES
  "mode": null,
  // Cached shader locations
  "locations": null
};
var m_isDebug2 = window.location.search.includes("webgl-debug");
function init5() {
  addScreenDataItem("batches", {});
  addScreenDataItem("batchInfo", {
    "currentBatch": null,
    "drawOrder": [],
    "textureBatchSet": /* @__PURE__ */ new Set()
  });
}
function createBatches(screenData) {
  screenData.batches[POINTS_BATCH] = createBatch(screenData, POINTS_BATCH);
  screenData.batches[IMAGE_BATCH] = createBatch(screenData, IMAGE_BATCH);
  screenData.batches[GEOMETRY_BATCH] = createBatch(screenData, GEOMETRY_BATCH);
  screenData.batches[POINTS_REPLACE_BATCH] = createBatch(screenData, POINTS_REPLACE_BATCH);
  screenData.batches[IMAGE_REPLACE_BATCH] = createBatch(screenData, IMAGE_REPLACE_BATCH);
  const shaderBatch = Object.create(m_batchProto);
  shaderBatch.type = SHADER_BATCH;
  shaderBatch.overrideGlobalBlend = null;
  shaderBatch.count = 0;
  screenData.batches[SHADER_BATCH] = shaderBatch;
}
function createBatch(screenData, type) {
  const gl = screenData.gl;
  const batch = Object.create(m_batchProto);
  screenData.batches[type] = batch;
  let vertSrc, fragSrc;
  if (type === POINTS_BATCH) {
    vertSrc = point_default;
    fragSrc = point_default2;
    batch.capacity = DEFAULT_POINT_BATCH_SIZE;
    batch.minCapacity = DEFAULT_POINT_BATCH_SIZE;
    batch.maxCapacity = MAX_POINT_BATCH_SIZE;
    batch.mode = gl.POINTS;
  } else if (type === IMAGE_BATCH || type === IMAGE_REPLACE_BATCH) {
    vertSrc = image_default;
    fragSrc = image_default2;
    batch.capacity = DEFAULT_IMAGE_BATCH_SIZE;
    batch.minCapacity = DEFAULT_IMAGE_BATCH_SIZE;
    batch.maxCapacity = MAX_IMAGE_BATCH_SIZE;
    batch.mode = gl.TRIANGLES;
    batch.useTexture = true;
    if (type === IMAGE_BATCH) {
      batch.overrideGlobalBlend = true;
    }
  } else if (type === GEOMETRY_BATCH) {
    vertSrc = geometry_default;
    fragSrc = point_default2;
    batch.capacity = DEFAULT_GEOMETRY_BATCH_SIZE;
    batch.minCapacity = DEFAULT_GEOMETRY_BATCH_SIZE;
    batch.maxCapacity = MAX_GEOMETRY_BATCH_SIZE;
    batch.mode = gl.TRIANGLES;
  } else if (type === POINTS_REPLACE_BATCH) {
    vertSrc = point_default;
    fragSrc = point_default2;
    batch.capacity = DEFAULT_POINT_BATCH_SIZE;
    batch.minCapacity = DEFAULT_POINT_BATCH_SIZE;
    batch.maxCapacity = MAX_POINT_BATCH_SIZE;
    batch.mode = gl.POINTS;
    batch.overrideGlobalBlend = false;
  } else {
    throwError(
      Error,
      `createBatch: Unknown batch type ${type}`,
      "INVALID_BATCH_TYPE"
    );
  }
  batch.program = createShaderProgram(gl, vertSrc, fragSrc);
  batch.locations = {
    "position": gl.getAttribLocation(batch.program, "a_position"),
    "color": gl.getAttribLocation(batch.program, "a_color"),
    "resolution": gl.getUniformLocation(batch.program, "u_resolution")
  };
  if (type === POINTS_BATCH || type === POINTS_REPLACE_BATCH || type === GEOMETRY_BATCH) {
    batch.locations.noiseMin = gl.getUniformLocation(batch.program, "u_noiseMin");
    batch.locations.noiseMax = gl.getUniformLocation(batch.program, "u_noiseMax");
    batch.locations.time = gl.getUniformLocation(batch.program, "u_time");
  }
  batch.type = type;
  if (batch.useTexture === true) {
    batch.locations.texCoord = gl.getAttribLocation(batch.program, "a_texCoord");
    batch.locations.texture = gl.getUniformLocation(batch.program, "u_texture");
    batch.texCoords = new Float32Array(batch.capacity * batch.texCoordComps);
    batch.texCoordVBO = gl.createBuffer();
  }
  batch.vertices = new Float32Array(batch.capacity * batch.vertexComps);
  batch.colors = new Uint8Array(batch.capacity * batch.colorComps);
  batch.vertexVBO = gl.createBuffer();
  batch.colorVBO = gl.createBuffer();
  batch.vao = gl.createVertexArray();
  if (!batch.vertexVBO || !batch.colorVBO || !batch.vao || batch.useTexture && !batch.texCoordVBO) {
    throwError(Error, "screen: Failed to allocate batch buffers.", "WEBGL_ERROR");
  }
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
  if (batch.useTexture === true) {
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
  }
  gl.bindVertexArray(null);
  batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;
  return batch;
}
function resizeBatch(batch, newCapacity) {
  const newVertices = new Float32Array(newCapacity * batch.vertexComps);
  const newColors = new Uint8Array(newCapacity * batch.colorComps);
  if (batch.count > 0) {
    newVertices.set(batch.vertices.subarray(0, batch.count * batch.vertexComps));
    newColors.set(batch.colors.subarray(0, batch.count * batch.colorComps));
  }
  batch.vertices = newVertices;
  batch.colors = newColors;
  if (batch.useTexture === true) {
    const newTexCoords = new Float32Array(newCapacity * batch.texCoordComps);
    if (batch.count > 0) {
      newTexCoords.set(batch.texCoords.subarray(0, batch.count * batch.texCoordComps));
    }
    batch.texCoords = newTexCoords;
  }
  if (m_isDebug2) {
    console.log(
      `Batch ${BATCH_TYPES[batch.type]} resized from ${batch.capacity} to ${newCapacity}`
    );
  }
  batch.capacity = newCapacity;
  batch.capacityChanged = true;
  batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;
}
function prepareBatch(screenData, batchType, itemCount, texture) {
  if (isContextUnavailable(screenData)) {
    return false;
  }
  const batch = screenData.batches[batchType];
  if (!Number.isSafeInteger(itemCount) || itemCount < 0 || itemCount > batch.maxCapacity) {
    throw new RangeError(
      `prepareBatch: itemCount must be an integer between 0 and ${batch.maxCapacity}.`
    );
  }
  if (itemCount === 0) {
    return true;
  }
  let requiredCount = batch.count + itemCount;
  if (requiredCount > batch.maxCapacity) {
    flushBatches(screenData);
    if (isContextUnavailable(screenData)) {
      return false;
    }
    requiredCount = batch.count + itemCount;
    if (requiredCount > batch.maxCapacity) {
      throw new RangeError("prepareBatch: Flushing could not make room for itemCount.");
    }
  }
  if (requiredCount > batch.capacity) {
    const newCapacity = Math.max(
      requiredCount,
      Math.min(batch.capacity * 2, batch.maxCapacity)
    );
    resizeBatch(batch, newCapacity);
  }
  if (screenData.view) {
    batch.originX = screenData.view.originX;
    batch.originY = screenData.view.originY;
  } else {
    batch.originX = 0;
    batch.originY = 0;
  }
  const batchInfo = screenData.batchInfo;
  const batchTypeChanging = batchInfo.currentBatch !== batch;
  const textureChanging = batch.useTexture === true && batchInfo.currentBatch === batch && batch.texture !== texture;
  if (batchTypeChanging || textureChanging) {
    if (batchInfo.drawOrder.length > 0) {
      const lastDrawOrderItem = batchInfo.drawOrder[batchInfo.drawOrder.length - 1];
      lastDrawOrderItem.endIndex = lastDrawOrderItem.batch.count;
    }
    const drawOrderItem = {
      "batch": batch,
      "startIndex": batch.count,
      "endIndex": null,
      "overrideGlobalBlend": batch.overrideGlobalBlend
    };
    if (batch.useTexture === true) {
      batch.texture = texture;
      drawOrderItem.texture = texture;
      batchInfo.textureBatchSet.add(texture);
    }
    batchInfo.drawOrder.push(drawOrderItem);
    batchInfo.currentBatch = batch;
  }
  return true;
}
function prepareBatchChunk(screenData, batchType, remainingCount, primitiveSize = 1) {
  if (isContextUnavailable(screenData)) {
    return 0;
  }
  const batch = screenData.batches[batchType];
  const limit = Math.min(batch.minCapacity, batch.maxCapacity);
  if (!Number.isSafeInteger(primitiveSize) || primitiveSize < 1 || primitiveSize > limit) {
    throw new RangeError("prepareBatchChunk: primitiveSize must fit in a chunk.");
  }
  if (remainingCount !== void 0 && (!Number.isSafeInteger(remainingCount) || remainingCount < 0 || remainingCount % primitiveSize !== 0)) {
    throw new RangeError(
      "prepareBatchChunk: remainingCount must contain complete primitives."
    );
  }
  let count = Math.floor(limit / primitiveSize) * primitiveSize;
  if (remainingCount !== void 0) {
    count = Math.min(count, remainingCount);
  }
  const available = Math.floor((batch.capacity - batch.count) / primitiveSize) * primitiveSize;
  if (available > 0) {
    count = Math.min(count, available);
  }
  if (!prepareBatch(screenData, batchType, count)) {
    return 0;
  }
  return count;
}
function prepareShaderBatch(screenData, handle, uniforms, samplerTextures = /* @__PURE__ */ new Map()) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const batchInfo = screenData.batchInfo;
  const batch = screenData.batches[SHADER_BATCH];
  if (batchInfo.drawOrder.length > 0) {
    const lastDrawOrderItem = batchInfo.drawOrder[batchInfo.drawOrder.length - 1];
    lastDrawOrderItem.endIndex = lastDrawOrderItem.batch.count;
  }
  const drawOrderItem = {
    "batch": batch,
    "startIndex": 0,
    "endIndex": 0,
    "overrideGlobalBlend": batch.overrideGlobalBlend,
    "shaderHandle": handle,
    "uniforms": uniforms ?? {},
    "samplerTextures": samplerTextures
  };
  for (const texture of samplerTextures.values()) {
    batchInfo.textureBatchSet.add(texture);
  }
  batchInfo.drawOrder.push(drawOrderItem);
  batchInfo.currentBatch = batch;
}
function countQueuedShaderPasses(screenData, shaderId) {
  let count = 0;
  for (const item of screenData.batchInfo.drawOrder) {
    if (item.shaderHandle && item.shaderHandle.id === shaderId) {
      count += 1;
    }
  }
  return count;
}
function runShaderPass(screenData, drawOrderItem) {
  const gl = screenData.gl;
  const handle = drawOrderItem.shaderHandle;
  const uniforms = drawOrderItem.uniforms;
  const samplerTextures = drawOrderItem.samplerTextures;
  const { "program": program, "locations": locations } = getOrCreateCustomShaderProgram(
    screenData,
    handle
  );
  if (locations.texture === null) {
    throwError(
      Error,
      "applyShader: Missing required uniform u_texture in shader.",
      "MISSING_U_TEXTURE"
    );
  }
  const w = screenData.width;
  const h = screenData.height;
  gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.bufferFBO);
  gl.viewport(0, 0, w, h);
  gl.disable(gl.BLEND);
  gl.disable(gl.SCISSOR_TEST);
  gl.useProgram(program);
  gl.bindVertexArray(screenData.displayQuadVao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, screenData.fboTexture);
  gl.uniform1i(locations.texture, 0);
  if (locations.sourceSize !== null) {
    gl.uniform2f(locations.sourceSize, w, h);
  }
  if (locations.outputSize !== null) {
    gl.uniform2f(locations.outputSize, w, h);
  }
  if (locations.time !== null) {
    gl.uniform1f(locations.time, performance.now() / 1e3);
  }
  if (locations.frame !== null) {
    gl.uniform1i(locations.frame, screenData.frameCount ?? 0);
  }
  setCustomUniforms(gl, uniforms, (source) => samplerTextures.get(source));
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, screenData.bufferFBO);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.FBO);
  gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.FBO);
}
function flushBatches(screenData, blends = null) {
  if (probeContextLoss(screenData)) {
    return;
  }
  if (!screenData.isFirstRender && screenData.batchInfo.drawOrder.length === 0) {
    return;
  }
  if (blends === null) {
    blends = screenData.blends;
  }
  const gl = screenData.gl;
  if (screenData.contextLost) {
    return;
  }
  screenData.frameCount = (screenData.frameCount ?? 0) + 1;
  gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
  gl.viewport(0, 0, screenData.width, screenData.height);
  if (screenData.isFirstRender) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    screenData.isFirstRender = false;
  }
  for (const batchType in screenData.batches) {
    const batch = screenData.batches[batchType];
    if (batch.count > 0) {
      uploadBatch(gl, batch, screenData.width, screenData.height);
    }
  }
  applyViewScissor(gl, screenData);
  for (const drawOrderItem of screenData.batchInfo.drawOrder) {
    if (drawOrderItem.endIndex === null) {
      drawOrderItem.endIndex = drawOrderItem.batch.count;
    }
    if (drawOrderItem.batch.type === SHADER_BATCH) {
      runShaderPass(screenData, drawOrderItem);
      applyViewScissor(gl, screenData);
      continue;
    }
    if (drawOrderItem.endIndex - drawOrderItem.startIndex > 0) {
      if (drawOrderItem.overrideGlobalBlend === null) {
        if (blends.blend === BLEND_REPLACE) {
          gl.disable(gl.BLEND);
        } else {
          gl.enable(gl.BLEND);
          gl.blendFuncSeparate(
            // premultiplied srcRGBFactor
            gl.ONE,
            // dstRGBFactor
            gl.ONE_MINUS_SRC_ALPHA,
            // srcAlphaFactor - src alpha factor 1.0 (no scale)
            gl.ONE,
            // dstAlphaFactor - dst alpha factor (1-src.a)
            gl.ONE_MINUS_SRC_ALPHA
          );
        }
      } else if (drawOrderItem.overrideGlobalBlend === true) {
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(
          // premultiplied srcRGBFactor
          gl.ONE,
          // dstRGBFactor
          gl.ONE_MINUS_SRC_ALPHA,
          // srcAlphaFactor - src alpha factor 1.0 (no scale)
          gl.ONE,
          // dstAlphaFactor - dst alpha factor (1-src.a)
          gl.ONE_MINUS_SRC_ALPHA
        );
      } else {
        gl.disable(gl.BLEND);
      }
      let texture = null;
      if (drawOrderItem.batch.useTexture === true) {
        texture = drawOrderItem.texture;
      }
      drawBatch(
        gl,
        screenData,
        drawOrderItem.batch,
        drawOrderItem.startIndex,
        drawOrderItem.endIndex,
        texture,
        blends
      );
    }
  }
  for (const batchType in screenData.batches) {
    const batch = screenData.batches[batchType];
    resetBatch(batch);
  }
  screenData.batchInfo.drawOrder = [];
  screenData.batchInfo.currentBatch = null;
  screenData.batchInfo.textureBatchSet.clear();
  gl.bindVertexArray(null);
  gl.disable(gl.SCISSOR_TEST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function applyViewScissor(gl, screenData) {
  const view = screenData.view;
  if (!view || view.clipWidth <= 0 || view.clipHeight <= 0) {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, 0, 0, 0);
    return;
  }
  if (view.clipX === 0 && view.clipY === 0 && view.clipWidth === screenData.width && view.clipHeight === screenData.height) {
    gl.disable(gl.SCISSOR_TEST);
    return;
  }
  gl.enable(gl.SCISSOR_TEST);
  const scissorY = screenData.height - (view.clipY + view.clipHeight);
  gl.scissor(view.clipX, scissorY, view.clipWidth, view.clipHeight);
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
    if (batch.useTexture === true) {
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
  if (batch.useTexture === true) {
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.texCoordVBO);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      batch.texCoords.subarray(0, batch.count * batch.texCoordComps)
    );
  }
}
function drawBatch(gl, screenData, batch, startIndex, endIndex, texture = null, blends = null) {
  gl.useProgram(batch.program);
  gl.bindVertexArray(batch.vao);
  if (batch.useTexture === true && texture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(batch.locations.texture, 0);
  }
  if (batch.locations.noiseMin !== void 0) {
    if (blends === null) {
      blends = screenData.blends;
    }
    const noise = blends.noise;
    const noiseSeed = blends.noiseSeed;
    let noiseMin, noiseMax;
    if (noise === null) {
      noiseMin = new Float32Array([0, 0, 0, 0]);
      noiseMax = new Float32Array([0, 0, 0, 0]);
    } else {
      noiseMin = noise[0];
      noiseMax = noise[1];
    }
    gl.uniform4fv(batch.locations.noiseMin, noiseMin);
    gl.uniform4fv(batch.locations.noiseMax, noiseMax);
    let timeValue;
    if (noiseSeed !== null) {
      timeValue = noiseSeed / 1e3;
    } else {
      timeValue = performance.now() / 1e3;
    }
    gl.uniform1f(batch.locations.time, timeValue);
  }
  gl.drawArrays(batch.mode, startIndex, endIndex - startIndex);
}
function resetBatches(screenData) {
  for (const batchType in screenData.batches) {
    const batch = screenData.batches[batchType];
    resetBatch(batch);
  }
  screenData.batchInfo.drawOrder = [];
  screenData.batchInfo.currentBatch = null;
  screenData.batchInfo.textureBatchSet.clear();
}
function resetBatch(batch) {
  if (batch.type === SHADER_BATCH) {
    batch.count = 0;
    return;
  }
  batch.capacityLocalMax = Math.max(batch.count, batch.capacityLocalMax);
  batch.count = 0;
  if (batch.useTexture === true) {
    batch.texture = null;
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
  if (probeContextLoss(screenData)) {
    return;
  }
  if (screenData.isOffscreen && screenData.parentRenderContext) {
    return;
  }
  const gl = screenData.gl;
  const useCustom = !screenData.isOffscreen && !!screenData.displayShaderHandle;
  let program;
  let locations;
  let customUniforms = null;
  if (useCustom) {
    const handle = screenData.displayShaderHandle;
    const cache = getOrCreateCustomShaderProgram(screenData, handle);
    if (cache.locations.texture === null) {
      throwError(
        Error,
        "setDisplayShader: Missing required uniform u_texture in shader.",
        "MISSING_U_TEXTURE"
      );
    }
    program = cache.program;
    locations = cache.locations;
    customUniforms = screenData.displayShaderUniformBindings ?? {};
  } else {
    program = screenData.displayProgram;
    locations = screenData.displayLocations;
  }
  const samplerTextures = /* @__PURE__ */ new Map();
  if (useCustom) {
    for (const binding of Object.values(customUniforms)) {
      if (binding.info.family !== "sampler") {
        continue;
      }
      for (const source of binding.sources) {
        if (!samplerTextures.has(source)) {
          samplerTextures.set(
            source,
            screenData.displayShaderTextureResolver(source)
          );
        }
      }
    }
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, screenData.canvas.width, screenData.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.BLEND);
  gl.disable(gl.SCISSOR_TEST);
  gl.useProgram(program);
  gl.bindVertexArray(screenData.displayQuadVao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, screenData.fboTexture);
  gl.uniform1i(locations.texture, 0);
  if (useCustom) {
    if (locations.sourceSize !== null) {
      gl.uniform2f(locations.sourceSize, screenData.width, screenData.height);
    }
    if (locations.outputSize !== null) {
      gl.uniform2f(
        locations.outputSize,
        screenData.canvas.width,
        screenData.canvas.height
      );
    }
    if (locations.time !== null) {
      gl.uniform1f(locations.time, performance.now() / 1e3);
    }
    if (locations.frame !== null) {
      gl.uniform1i(locations.frame, screenData.frameCount ?? 0);
    }
    setCustomUniforms(
      gl,
      customUniforms,
      (source) => samplerTextures.get(source)
    );
  }
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
}
function cleanup(screenData) {
  const gl = screenData.gl;
  for (const batchType in screenData.batches) {
    const batch = screenData.batches[batchType];
    if (batch.type === SHADER_BATCH) {
      continue;
    }
    if (batch.texCoordVBO) {
      gl.deleteBuffer(batch.texCoordVBO);
    }
    gl.deleteBuffer(batch.vertexVBO);
    gl.deleteBuffer(batch.colorVBO);
    gl.deleteVertexArray(batch.vao);
    gl.deleteProgram(batch.program);
    if (batch.useTexture === true) {
      batch.texture = null;
      batch.image = null;
    }
  }
  screenData.batches = null;
  screenData.batchInfo = null;
}

// src/renderer/draw/batch-helpers.js
function createPointWriter(screenData, batchType) {
  if (isContextUnavailable(screenData)) {
    return () => {
    };
  }
  const batch = screenData.batches[batchType];
  let remaining = 0;
  return function(x, y, color) {
    if (remaining === 0) {
      remaining = prepareBatchChunk(screenData, batchType);
      if (remaining === 0) {
        return;
      }
    }
    addVertexToBatch(batch, x, y, color);
    remaining--;
  };
}
function addVertexToBatch(batch, x, y, color) {
  const idx = batch.count * batch.vertexComps;
  const cidx = batch.count * batch.colorComps;
  const originX = batch.originX || 0;
  const originY = batch.originY || 0;
  batch.vertices[idx] = x + originX;
  batch.vertices[idx + 1] = y + originY;
  batch.colors[cidx] = color.r;
  batch.colors[cidx + 1] = color.g;
  batch.colors[cidx + 2] = color.b;
  batch.colors[cidx + 3] = color.a;
  batch.count++;
}
function addTriangleToBatch(batch, x1, y1, x2, y2, x3, y3, color) {
  addVertexToBatch(batch, x1, y1, color);
  addVertexToBatch(batch, x2, y2, color);
  addVertexToBatch(batch, x3, y3, color);
}
function tessellateCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, maxError) {
  const out = [];
  function pointLineDistanceSq(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq === 0) return apx * apx + apy * apy;
    let t = (apx * abx + apy * aby) / abLenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy;
  }
  const maxErrorSq = maxError * maxError;
  const maxDepth = 12;
  function subdivide(ax, ay, bx, by, cx, cy, dx, dy, depth) {
    const d1 = pointLineDistanceSq(bx, by, ax, ay, dx, dy);
    const d2 = pointLineDistanceSq(cx, cy, ax, ay, dx, dy);
    if (depth >= maxDepth || d1 <= maxErrorSq && d2 <= maxErrorSq) {
      if (out.length === 0) {
        out.push(ax, ay);
      }
      out.push(dx, dy);
      return;
    }
    const abx = (ax + bx) * 0.5;
    const aby = (ay + by) * 0.5;
    const bcx = (bx + cx) * 0.5;
    const bcy = (by + cy) * 0.5;
    const cdx = (cx + dx) * 0.5;
    const cdy = (cy + dy) * 0.5;
    const abbcx = (abx + bcx) * 0.5;
    const abbcy = (aby + bcy) * 0.5;
    const bccdx = (bcx + cdx) * 0.5;
    const bccdy = (bcy + cdy) * 0.5;
    const midx = (abbcx + bccdx) * 0.5;
    const midy = (abbcy + bccdy) * 0.5;
    subdivide(ax, ay, abx, aby, abbcx, abbcy, midx, midy, depth + 1);
    subdivide(midx, midy, bccdx, bccdy, cdx, cdy, dx, dy, depth + 1);
  }
  subdivide(x0, y0, x1, y1, x2, y2, x3, y3, 0);
  return out;
}

// src/renderer/draw/geometry.js
var FILLED_CIRCLE = 0;
var m_geometryCache = /* @__PURE__ */ new Map();
var MAX_CACHED_COORDINATES = 1048576;
var m_cachedCoordinates = 0;
function init6() {
  prepopulateCache();
}
function prepopulateCache() {
  const circle1 = generateSinglePixelGeometry();
  m_geometryCache.set(`${FILLED_CIRCLE}:1`, circle1);
  for (let radius = 1; radius <= 10; radius++) {
    const cacheKey = `${FILLED_CIRCLE}:${radius}`;
    const geometry = generateCircleGeometry(radius);
    m_geometryCache.set(cacheKey, geometry);
  }
}
function addVertex(vertices, vIdx, x, y) {
  vertices[vIdx++] = x;
  vertices[vIdx++] = y;
  return vIdx;
}
function addTriangle(vertices, vIdx, x1, y1, x2, y2, x3, y3) {
  vIdx = addVertex(vertices, vIdx, x1, y1);
  vIdx = addVertex(vertices, vIdx, x2, y2);
  vIdx = addVertex(vertices, vIdx, x3, y3);
  return vIdx;
}
function addQuad(vertices, vIdx, x1, y1, x2, y2) {
  vIdx = addTriangle(vertices, vIdx, x1, y1, x2, y1, x1, y2);
  vIdx = addTriangle(vertices, vIdx, x2, y1, x2, y2, x1, y2);
  return vIdx;
}
function generateCircleGeometry(radius) {
  if (radius <= 0) {
    return { "vertexCount": 0, "vertices": null };
  }
  const scanlineMinMax = /* @__PURE__ */ new Map();
  let x = radius - 1;
  let y = 0;
  let err = 1 - x;
  const updateScanline = (px, py) => {
    const pixelY = py | 0;
    const pixelX = px | 0;
    if (!scanlineMinMax.has(pixelY)) {
      if (pixelX < 0) {
        scanlineMinMax.set(pixelY, { "left": pixelX, "right": Infinity });
      } else if (pixelX > 0) {
        scanlineMinMax.set(pixelY, { "left": -Infinity, "right": pixelX });
      } else {
        scanlineMinMax.set(pixelY, { "left": pixelX, "right": pixelX });
      }
    } else {
      const limits = scanlineMinMax.get(pixelY);
      if (pixelX < 0 && pixelX > limits.left) {
        limits.left = pixelX;
      }
      if (pixelX > 0 && pixelX < limits.right) {
        limits.right = pixelX;
      }
    }
  };
  while (x >= y) {
    updateScanline(x, y);
    updateScanline(y, x);
    updateScanline(-y, x);
    updateScanline(-x, y);
    updateScanline(-x, -y);
    updateScanline(-y, -x);
    updateScanline(y, -x);
    updateScanline(x, -y);
    y++;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
  let vertexCount = 0;
  const sortedYCoords = [];
  for (const [currentY, mm] of scanlineMinMax.entries()) {
    vertexCount += 6;
    sortedYCoords.push(currentY);
  }
  sortedYCoords.sort((a, b) => a - b);
  const vertices = new Float32Array(vertexCount * 2);
  let vIdx = 0;
  for (let row = 1; row < sortedYCoords.length - 1; row += 1) {
    const currentY = sortedYCoords[row];
    const limits = scanlineMinMax.get(currentY);
    const xStart = limits.left + 1;
    const xEnd = limits.right - 1;
    vIdx = addQuad(vertices, vIdx, xStart, currentY, xEnd + 1, currentY + 1);
  }
  return { "vertexCount": vertexCount, "vertices": vertices };
}
function generateSinglePixelGeometry() {
  const vertexCount = 6;
  const vertices = new Float32Array(vertexCount * 2);
  let vIdx = 0;
  vIdx = addQuad(vertices, vIdx, 0, 0, 1, 1);
  return { "vertexCount": vertexCount, "vertices": vertices };
}
function getCachedGeometry(cacheType, unit) {
  const cacheKey = `${cacheType}:${unit}`;
  const cached = m_geometryCache.get(cacheKey);
  if (cached) {
    m_geometryCache.delete(cacheKey);
    m_geometryCache.set(cacheKey, cached);
    return cached;
  }
  let geometry;
  if (cacheType === FILLED_CIRCLE) {
    geometry = generateCircleGeometry(unit);
  } else {
    throw new Error(`Unknown geometry cache type: ${cacheType}`);
  }
  const size = getCoordinateCount(geometry);
  if (size <= MAX_CACHED_COORDINATES) {
    m_geometryCache.set(cacheKey, geometry);
    m_cachedCoordinates += size;
    for (const [key, entry] of m_geometryCache) {
      if (m_cachedCoordinates <= MAX_CACHED_COORDINATES) {
        break;
      }
      m_geometryCache.delete(key);
      m_cachedCoordinates -= getCoordinateCount(entry);
    }
  }
  return geometry;
}
function getCoordinateCount(geometry) {
  if (geometry.vertices) {
    return geometry.vertices.length;
  }
  return 0;
}
function drawCachedGeometry(screenData, cacheType, unit, x, y, color) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const geometry = getCachedGeometry(cacheType, unit);
  const batch = screenData.batches[GEOMETRY_BATCH];
  const vertices = geometry.vertices;
  let i = 0;
  while (i < geometry.vertexCount) {
    const count = prepareBatchChunk(
      screenData,
      GEOMETRY_BATCH,
      geometry.vertexCount - i,
      3
    );
    if (count === 0) {
      return;
    }
    const end = i + count;
    for (; i < end; i++) {
      addVertexToBatch(
        batch,
        vertices[i * 2] + x,
        vertices[i * 2 + 1] + y,
        color
      );
    }
  }
}

// src/renderer/textures.js
var m_textureSizes = /* @__PURE__ */ new WeakMap();
var m_textureVersions = /* @__PURE__ */ new WeakMap();
function init7() {
  addScreenDataItem("imageContextMap", /* @__PURE__ */ new Map());
  addScreenDataItem("textureCopyFBO", null);
  addScreenDataItem("samplerContextMap", /* @__PURE__ */ new Map());
}
function copyImageToTexture(screenData, img, texture) {
  const gl = screenData.gl;
  const read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
  const draw2 = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
  const scissor = gl.isEnabled(gl.SCISSOR_TEST);
  const premultiply = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
  try {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.disable(gl.SCISSOR_TEST);
    uploadImageToTexture(screenData, img, texture);
    m_textureSizes.set(texture, {
      "width": img.videoWidth || img.naturalWidth || img.width,
      "height": img.videoHeight || img.naturalHeight || img.height
    });
    m_textureVersions.set(texture, img.version);
  } finally {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, draw2);
    if (scissor) {
      gl.enable(gl.SCISSOR_TEST);
    }
  }
}
function uploadImageToTexture(screenData, img, texture) {
  const gl = screenData.gl;
  const sourceScreen = m_screenCanvasMap.get(img);
  if (sourceScreen && probeContextLoss(sourceScreen)) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      img.width,
      img.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    return;
  }
  if (img.isMock) {
    const imgScreenData = m_screenCanvasMap.get(img);
    if (imgScreenData) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      flushBatches(imgScreenData);
      if (imgScreenData.gl !== gl) {
        const srcGl = imgScreenData.gl;
        const width = imgScreenData.width;
        const height = imgScreenData.height;
        const pixelData = new Uint8Array(width * height * 4);
        const previousRead = srcGl.getParameter(srcGl.READ_FRAMEBUFFER_BINDING);
        srcGl.bindFramebuffer(srcGl.READ_FRAMEBUFFER, imgScreenData.FBO);
        try {
          srcGl.readPixels(0, 0, width, height, srcGl.RGBA, srcGl.UNSIGNED_BYTE, pixelData);
        } finally {
          srcGl.bindFramebuffer(srcGl.READ_FRAMEBUFFER, previousRead);
        }
        const rowSize = width * 4;
        const tempRow = new Uint8Array(rowSize);
        for (let y = 0; y < Math.floor(height / 2); y++) {
          const topRow = y * rowSize;
          const bottomRow = (height - 1 - y) * rowSize;
          tempRow.set(pixelData.subarray(topRow, topRow + rowSize));
          pixelData.set(pixelData.subarray(bottomRow, bottomRow + rowSize), topRow);
          pixelData.set(tempRow, bottomRow);
        }
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          width,
          height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixelData
        );
      } else {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA8,
          imgScreenData.width,
          imgScreenData.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );
        if (!screenData.textureCopyFBO) {
          screenData.textureCopyFBO = gl.createFramebuffer();
          if (!screenData.textureCopyFBO) {
            throwError(
              Error,
              "Failed to create texture copy framebuffer.",
              "WEBGL2_ERROR"
            );
          }
        }
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, imgScreenData.FBO);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.textureCopyFBO);
        gl.framebufferTexture2D(
          gl.DRAW_FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          texture,
          0
        );
        gl.blitFramebuffer(
          0,
          0,
          imgScreenData.width,
          imgScreenData.height,
          0,
          imgScreenData.height,
          imgScreenData.width,
          0,
          gl.COLOR_BUFFER_BIT,
          gl.NEAREST
        );
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      }
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    }
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  }
}
function getWebGL2Texture(screenData, img) {
  if (probeContextLoss(screenData)) {
    return null;
  }
  const gl = screenData.gl;
  if (typeof HTMLImageElement !== "undefined" && img instanceof HTMLImageElement && !img.isMock) {
    const cached = screenData.imageContextMap.get(img)?.get(gl);
    if (cached) {
      return cached;
    }
  }
  const activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
  const texture = gl.getParameter(gl.TEXTURE_BINDING_2D);
  const read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
  const draw2 = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
  try {
    return resolveWebGL2Texture(screenData, img);
  } finally {
    gl.activeTexture(activeTexture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, draw2);
  }
}
function resolveWebGL2Texture(screenData, img) {
  let contextTextureMap = screenData.imageContextMap.get(img);
  if (!contextTextureMap) {
    contextTextureMap = /* @__PURE__ */ new Map();
    screenData.imageContextMap.set(img, contextTextureMap);
  }
  const otherScreenData = m_screenCanvasMap.get(img);
  if (otherScreenData) {
    flushBatches(otherScreenData);
    displayToCanvas(otherScreenData);
  }
  if (isContextUnavailable(screenData)) {
    return null;
  }
  const gl = screenData.gl;
  let texture = contextTextureMap.get(gl);
  const isVideo = typeof HTMLVideoElement !== "undefined" && img instanceof HTMLVideoElement;
  if (isVideo && (img.readyState < 2 || !img.videoWidth || !img.videoHeight)) {
    if (texture) {
      return texture;
    }
    if (contextTextureMap.size === 0) {
      screenData.imageContextMap.delete(img);
    }
    throwError(Error, "Image has no decoded video frame yet.", "IMAGE_NOT_READY");
  }
  if (texture) {
    if (isVideo || img instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && img instanceof OffscreenCanvas || img.isMock) {
      if (!isVideo && img.isDirty === false && m_textureVersions.get(texture) === img.version) {
        return texture;
      }
      if (screenData.batchInfo.textureBatchSet.has(texture)) {
        flushBatches(screenData);
        if (isContextUnavailable(screenData)) {
          return null;
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, texture);
      copyImageToTexture(screenData, img, texture);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    return texture;
  }
  texture = gl.createTexture();
  if (!texture) {
    throwError(Error, "Failed to create WebGL2 texture for image.", "WEBGL2_ERROR");
  }
  try {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    copyImageToTexture(screenData, img, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    contextTextureMap.set(gl, texture);
  } catch (error) {
    gl.deleteTexture(texture);
    if (contextTextureMap.size === 0) {
      screenData.imageContextMap.delete(img);
    }
    throw error;
  } finally {
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
  return texture;
}
function getTextureDrawInfo(screenData, img) {
  const sourceData = m_screenCanvasMap.get(img);
  if (!sourceData || sourceData.gl !== screenData.gl) {
    return { "texture": getWebGL2Texture(screenData, img), "invertedY": false };
  }
  if (sourceData.FBO === screenData.FBO) {
    throwError(
      Error,
      "drawImage: A screen cannot draw its own framebuffer.",
      "FRAMEBUFFER_FEEDBACK_LOOP"
    );
  }
  if (screenData.batchInfo.textureBatchSet.has(sourceData.fboTexture)) {
    flushBatches(screenData);
  }
  flushBatches(sourceData);
  return { "texture": sourceData.fboTexture, "invertedY": true };
}
function getSamplerTexture(screenData, img) {
  if (isContextUnavailable(screenData)) {
    return null;
  }
  const gl = screenData.gl;
  const source = getWebGL2Texture(screenData, img);
  if (!source) {
    return null;
  }
  const size = m_textureSizes.get(source);
  let contexts = screenData.samplerContextMap.get(img);
  let entry = contexts?.get(gl);
  if (entry?.source === source && entry.sourceSize === size) {
    return entry.texture;
  }
  if (entry && screenData.batchInfo.textureBatchSet.has(entry.texture)) {
    flushBatches(screenData);
    if (isContextUnavailable(screenData)) {
      return null;
    }
  }
  const read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
  const draw2 = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
  const boundTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
  const scissor = gl.isEnabled(gl.SCISSOR_TEST);
  try {
    if (!entry) {
      entry = {
        "texture": gl.createTexture(),
        "width": 0,
        "height": 0,
        "readFbo": null,
        "drawFbo": null
      };
      if (!entry.texture) {
        throw new Error("Failed to allocate sampler texture.");
      }
      entry.readFbo = gl.createFramebuffer();
      entry.drawFbo = gl.createFramebuffer();
      if (!entry.readFbo || !entry.drawFbo) {
        throw new Error("Failed to allocate sampler copy framebuffers.");
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    if (entry.width !== size.width || entry.height !== size.height) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        size.width,
        size.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      entry.width = size.width;
      entry.height = size.height;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, entry.readFbo);
    gl.framebufferTexture2D(
      gl.READ_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      source,
      0
    );
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, entry.drawFbo);
    gl.framebufferTexture2D(
      gl.DRAW_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      entry.texture,
      0
    );
    if (gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE || gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Sampler copy framebuffer is incomplete.");
    }
    gl.disable(gl.SCISSOR_TEST);
    gl.blitFramebuffer(
      0,
      0,
      size.width,
      size.height,
      0,
      size.height,
      size.width,
      0,
      gl.COLOR_BUFFER_BIT,
      gl.NEAREST
    );
    entry.source = source;
    entry.sourceSize = size;
    if (!contexts) {
      contexts = /* @__PURE__ */ new Map();
      screenData.samplerContextMap.set(img, contexts);
    }
    contexts.set(gl, entry);
    return entry.texture;
  } catch (error) {
    if (entry?.texture) {
      gl.deleteTexture(entry.texture);
      gl.deleteFramebuffer(entry.readFbo);
      gl.deleteFramebuffer(entry.drawFbo);
    }
    contexts?.delete(gl);
    if (contexts?.size === 0) {
      screenData.samplerContextMap.delete(img);
    }
    error.code = error.code || "WEBGL2_ERROR";
    throw error;
  } finally {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, draw2);
    gl.bindTexture(gl.TEXTURE_2D, boundTexture);
    if (scissor) {
      gl.enable(gl.SCISSOR_TEST);
    }
  }
}
function deleteSamplerTexture(screenData, img) {
  const contexts = screenData.samplerContextMap?.get(img);
  const entry = contexts?.get(screenData.gl);
  if (entry) {
    if (screenData.batchInfo?.textureBatchSet.has(entry.texture)) {
      flushBatches(screenData);
    }
    screenData.gl.deleteTexture(entry.texture);
    screenData.gl.deleteFramebuffer(entry.readFbo);
    screenData.gl.deleteFramebuffer(entry.drawFbo);
    contexts.delete(screenData.gl);
  }
  if (contexts?.size === 0) {
    screenData.samplerContextMap.delete(img);
  }
}
function deleteWebGL2Texture(screenData, img) {
  deleteSamplerTexture(screenData, img);
  const contextMap = screenData.imageContextMap.get(img);
  if (!contextMap) {
    return;
  }
  const gl = screenData.gl;
  const texture = contextMap.get(gl);
  if (texture) {
    if (screenData.batchInfo.textureBatchSet.has(texture)) {
      flushBatches(screenData);
    }
    gl.deleteTexture(texture);
    contextMap.delete(gl);
  }
  if (contextMap.size === 0) {
    screenData.imageContextMap.delete(img);
  }
}
function updateWebGL2TextureSubImage(screenData, imgKey, pixelData, width, height, dstX, dstY) {
  if (probeContextLoss(screenData)) {
    return null;
  }
  if (!screenData.gl) {
    return null;
  }
  const gl = screenData.gl;
  let texture;
  if (imgKey === null) {
    texture = screenData.fboTexture;
    if (!texture) {
      return null;
    }
  } else {
    texture = getWebGL2Texture(screenData, imgKey);
  }
  if (screenData.batchInfo.textureBatchSet.has(texture)) {
    flushBatches(screenData);
  }
  if (isContextUnavailable(screenData)) {
    return null;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const premultiply = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
  try {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      dstX,
      dstY,
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      premultiplyPixels(pixelData)
    );
  } finally {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
  }
  if (imgKey !== null) {
    m_textureSizes.set(texture, { ...m_textureSizes.get(texture) });
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}
function cleanup2(screenData) {
  const gl = screenData.gl;
  for (const img of screenData.samplerContextMap?.keys() ?? []) {
    deleteSamplerTexture(screenData, img);
  }
  screenData.samplerContextMap = null;
  if (screenData.textureCopyFBO) {
    gl.deleteFramebuffer(screenData.textureCopyFBO);
    screenData.textureCopyFBO = null;
  }
  for (const img of screenData.imageContextMap?.keys() ?? []) {
    const screenMap = screenData.imageContextMap.get(img);
    const texture = screenMap.get(gl);
    if (texture) {
      gl.deleteTexture(texture);
    }
  }
  screenData.imageContextMap = null;
}

// src/renderer/readback.js
function init8() {
}
function readPixel(screenData, x, y, generation = getContextGeneration(screenData)) {
  if (isContextUnavailable(screenData) || generation !== getContextGeneration(screenData)) {
    return rgbToColor(0, 0, 0, 0);
  }
  flushBatches(screenData);
  if (isContextUnavailable(screenData)) {
    return rgbToColor(0, 0, 0, 0);
  }
  const gl = screenData.gl;
  const screenHeight = screenData.height;
  const glY = screenHeight - 1 - y;
  const buf = new Uint8Array(4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
  gl.readPixels(x, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  unpremultiplyPixels(buf);
  return rgbToColor(buf[0], buf[1], buf[2], buf[3]);
}
function readPixelAsync(screenData, x, y) {
  const generation = getContextGeneration(screenData);
  return new Promise((resolve, reject) => {
    queueMicrotask(() => {
      try {
        assertScreenAvailable(screenData);
        resolve(readPixel(screenData, x, y, generation));
      } catch (error) {
        reject(error);
      }
    });
  });
}
function readPixels(screenData, x, y, width, height, generation = getContextGeneration(screenData)) {
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
  const buf = new Uint8Array(clampedWidth * clampedHeight * 4);
  const glReadY = screenHeight - (clampedY + clampedHeight);
  if (!isContextUnavailable(screenData) && generation === getContextGeneration(screenData)) {
    flushBatches(screenData);
    if (!isContextUnavailable(screenData)) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
      gl.readPixels(
        clampedX,
        glReadY,
        clampedWidth,
        clampedHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        buf
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }
  unpremultiplyPixels(buf);
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
  const generation = getContextGeneration(screenData);
  return new Promise((resolve, reject) => {
    queueMicrotask(() => {
      try {
        assertScreenAvailable(screenData);
        resolve(readPixels(screenData, x, y, width, height, generation));
      } catch (error) {
        reject(error);
      }
    });
  });
}
function readPixelsRaw(screenData, x, y, width, height) {
  const gl = screenData.gl;
  const screenWidth = screenData.width;
  const screenHeight = screenData.height;
  const clampedX = Math.max(0, x);
  const clampedY = Math.max(0, y);
  const clampedWidth = Math.min(width, screenWidth - clampedX);
  const clampedHeight = Math.min(height, screenHeight - clampedY);
  if (clampedWidth <= 0 || clampedHeight <= 0) {
    return null;
  }
  flushBatches(screenData);
  const buf = new Uint8Array(clampedWidth * clampedHeight * 4);
  const glReadY = screenHeight - (clampedY + clampedHeight);
  if (!isContextUnavailable(screenData)) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
    gl.readPixels(clampedX, glReadY, clampedWidth, clampedHeight, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  return buf;
}

// src/renderer/draw/sprites.js
var MAX_QUAD_COLOR_MAP_SIZE = 1e3;
var m_quadColorMap = /* @__PURE__ */ new Map();
function calculateTransformedCorners(width, height, anchorX, anchorY, scaleX, scaleY, angleRad, x, y) {
  const scaledWidth = width * scaleX;
  const scaledHeight = height * scaleY;
  const anchorXPx = Math.round(scaledWidth * anchorX);
  const anchorYPx = Math.round(scaledHeight * anchorY);
  const corners = [
    // Top-left
    { "x": -anchorXPx, "y": -anchorYPx },
    // Top-right
    { "x": scaledWidth - anchorXPx, "y": -anchorYPx },
    // Bottom-left
    { "x": -anchorXPx, "y": scaledHeight - anchorYPx },
    // Bottom-right
    { "x": scaledWidth - anchorXPx, "y": scaledHeight - anchorYPx }
  ];
  if (angleRad !== 0) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const rx = corner.x * cos - corner.y * sin;
      const ry = corner.x * sin + corner.y * cos;
      corner.x = rx + x;
      corner.y = ry + y;
    }
  } else {
    for (let i = 0; i < corners.length; i++) {
      corners[i].x += x;
      corners[i].y += y;
    }
  }
  return corners;
}
function addTexturedQuadToBatch(screenData, texture, corners, texCoords, colorQuadArray, batchType) {
  const batch = screenData.batches[batchType];
  if (!prepareBatch(screenData, batchType, 6, texture)) {
    return;
  }
  const batchVertices = batch.vertices;
  const batchTexCoords = batch.texCoords;
  const batchColors = batch.colors;
  const originX = batch.originX || 0;
  const originY = batch.originY || 0;
  const baseIdx = batch.count;
  const vertexBase = baseIdx * batch.vertexComps;
  const texBase = baseIdx * batch.texCoordComps;
  const colorBase = baseIdx * batch.colorComps;
  let vIdx = vertexBase;
  let tIdx = texBase;
  batchVertices[vIdx++] = corners[0].x + originX;
  batchVertices[vIdx++] = corners[0].y + originY;
  batchTexCoords[tIdx++] = texCoords[0];
  batchTexCoords[tIdx++] = texCoords[1];
  batchVertices[vIdx++] = corners[1].x + originX;
  batchVertices[vIdx++] = corners[1].y + originY;
  batchTexCoords[tIdx++] = texCoords[2];
  batchTexCoords[tIdx++] = texCoords[3];
  batchVertices[vIdx++] = corners[2].x + originX;
  batchVertices[vIdx++] = corners[2].y + originY;
  batchTexCoords[tIdx++] = texCoords[4];
  batchTexCoords[tIdx++] = texCoords[5];
  batchVertices[vIdx++] = corners[1].x + originX;
  batchVertices[vIdx++] = corners[1].y + originY;
  batchTexCoords[tIdx++] = texCoords[6];
  batchTexCoords[tIdx++] = texCoords[7];
  batchVertices[vIdx++] = corners[3].x + originX;
  batchVertices[vIdx++] = corners[3].y + originY;
  batchTexCoords[tIdx++] = texCoords[8];
  batchTexCoords[tIdx++] = texCoords[9];
  batchVertices[vIdx++] = corners[2].x + originX;
  batchVertices[vIdx++] = corners[2].y + originY;
  batchTexCoords[tIdx++] = texCoords[10];
  batchTexCoords[tIdx++] = texCoords[11];
  batchColors.set(colorQuadArray, colorBase);
  batch.count += 6;
}
function getQuadColorArray(color) {
  let quadColorArray = m_quadColorMap.get(color.key);
  if (quadColorArray === void 0) {
    if (m_quadColorMap.size >= MAX_QUAD_COLOR_MAP_SIZE) {
      m_quadColorMap.clear();
    }
    const r = color.r;
    const g = color.g;
    const b = color.b;
    const a = color.a;
    quadColorArray = new Uint8Array(24);
    quadColorArray[0] = r;
    quadColorArray[1] = g;
    quadColorArray[2] = b;
    quadColorArray[3] = a;
    quadColorArray[4] = r;
    quadColorArray[5] = g;
    quadColorArray[6] = b;
    quadColorArray[7] = a;
    quadColorArray[8] = r;
    quadColorArray[9] = g;
    quadColorArray[10] = b;
    quadColorArray[11] = a;
    quadColorArray[12] = r;
    quadColorArray[13] = g;
    quadColorArray[14] = b;
    quadColorArray[15] = a;
    quadColorArray[16] = r;
    quadColorArray[17] = g;
    quadColorArray[18] = b;
    quadColorArray[19] = a;
    quadColorArray[20] = r;
    quadColorArray[21] = g;
    quadColorArray[22] = b;
    quadColorArray[23] = a;
    m_quadColorMap.set(color.key, quadColorArray);
  }
  return quadColorArray;
}
function drawImage(screenData, img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad, batchType = IMAGE_BATCH) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const textureInfo = getTextureDrawInfo(screenData, img);
  const texture = textureInfo.texture;
  if (!texture) {
    return;
  }
  const imgWidth = img.width;
  const imgHeight = img.height;
  const corners = calculateTransformedCorners(
    imgWidth,
    imgHeight,
    anchorX,
    anchorY,
    scaleX,
    scaleY,
    angleRad,
    x,
    y
  );
  let texCoords;
  if (textureInfo.invertedY) {
    texCoords = [
      // Top-left
      0,
      1,
      // Top-right
      1,
      1,
      // Bottom-left
      0,
      0,
      // Top-right (repeat for second triangle)
      1,
      1,
      // Bottom-right
      1,
      0,
      // Bottom-left (repeat for second triangle)
      0,
      0
    ];
  } else {
    texCoords = [
      // Top-left
      0,
      0,
      // Top-right
      1,
      0,
      // Bottom-left
      0,
      1,
      // Top-right (repeat for second triangle)
      1,
      0,
      // Bottom-right
      1,
      1,
      // Bottom-left (repeat for second triangle)
      0,
      1
    ];
  }
  addTexturedQuadToBatch(
    screenData,
    texture,
    corners,
    texCoords,
    getQuadColorArray(color),
    batchType
  );
}
function drawSprite(screenData, img, sx, sy, sw, sh, x, y, width, height, color, anchorX = 0, anchorY = 0, scaleX = 1, scaleY = 1, angleRad = 0, batchType = IMAGE_BATCH) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const textureInfo = getTextureDrawInfo(screenData, img);
  const texture = textureInfo.texture;
  if (!texture) {
    return;
  }
  const texWidth = img.width;
  const texHeight = img.height;
  const u0 = sx / texWidth;
  let v0 = sy / texHeight;
  const u1 = (sx + sw) / texWidth;
  let v1 = (sy + sh) / texHeight;
  if (textureInfo.invertedY) {
    v0 = 1 - v0;
    v1 = 1 - v1;
  }
  const corners = calculateTransformedCorners(
    width,
    height,
    anchorX,
    anchorY,
    scaleX,
    scaleY,
    angleRad,
    x,
    y
  );
  const texCoords = [
    // Top-left
    u0,
    v0,
    // Top-right
    u1,
    v0,
    // Bottom-left
    u0,
    v1,
    // Top-right (repeat for second triangle)
    u1,
    v0,
    // Bottom-right
    u1,
    v1,
    // Bottom-left (repeat for second triangle)
    u0,
    v1
  ];
  addTexturedQuadToBatch(
    screenData,
    texture,
    corners,
    texCoords,
    getQuadColorArray(color),
    batchType
  );
}

// src/renderer/draw/primitives.js
function drawPixel(screenData, x, y, batchType) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  if (!prepareBatch(screenData, batchType, 1, null, null)) {
    return;
  }
  const batch = screenData.batches[batchType];
  addVertexToBatch(batch, x, y, screenData.color);
}

// src/renderer/draw/circles.js
function drawCircle(screenData, cx, cy, radius) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const color = screenData.color;
  const writePoint = createPointWriter(screenData, POINTS_BATCH);
  if (radius <= 0) {
    return;
  }
  if (radius === 1) {
    writePoint(cx + 1, cy, color);
    return;
  }
  radius -= 1;
  if (radius === 1) {
    writePoint(cx + 1, cy, color);
    writePoint(cx - 1, cy, color);
    writePoint(cx, cy + 1, color);
    writePoint(cx, cy - 1, color);
    return;
  }
  let x = radius;
  let y = 0;
  let err = 1 - x;
  writePoint(cx + x, cy + y, color);
  writePoint(cx - x, cy + y, color);
  writePoint(cx + y, cy + x, color);
  writePoint(cx + y, cy - x, color);
  while (x >= y) {
    y++;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err += 2 * (y - x) + 1;
    }
    if (x < y) {
      break;
    }
    if (x === y) {
      writePoint(cx + x, cy + y, color);
      writePoint(cx - x, cy + y, color);
      writePoint(cx - x, cy - y, color);
      writePoint(cx + x, cy - y, color);
    } else {
      writePoint(cx + x, cy + y, color);
      writePoint(cx + y, cy + x, color);
      writePoint(cx - y, cy + x, color);
      writePoint(cx - x, cy + y, color);
      writePoint(cx - x, cy - y, color);
      writePoint(cx - y, cy - x, color);
      writePoint(cx + y, cy - x, color);
      writePoint(cx + x, cy - y, color);
    }
  }
}
function drawCircleFilled(screenData, cx, cy, radius, color) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  return drawCachedGeometry(
    screenData,
    FILLED_CIRCLE,
    radius,
    cx,
    cy,
    color
  );
}

// src/renderer/draw/arcs.js
var TWO_PI = 2 * Math.PI;
var FULL_CIRCLE_EPSILON = 1e-4;
function drawArc(screenData, cx, cy, radius, angle1, angle2) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const color = screenData.color;
  const rawSpan = angle2 - angle1;
  if (rawSpan === 0) {
    return;
  }
  if (Math.abs(rawSpan) >= TWO_PI - FULL_CIRCLE_EPSILON) {
    drawCircle(screenData, cx, cy, radius);
    return;
  }
  const a1 = normalizeAngle(angle1);
  const a2 = normalizeAngle(angle2);
  let span = a2 - a1;
  if (span < 0) {
    span += TWO_PI;
  }
  if (span >= TWO_PI - FULL_CIRCLE_EPSILON) {
    drawCircle(screenData, cx, cy, radius);
    return;
  }
  const isLargeArc = span > Math.PI;
  const writePoint = createPointWriter(screenData, POINTS_BATCH);
  const startX = Math.cos(a1);
  const startY = Math.sin(a1);
  const endX = Math.cos(a2);
  const endY = Math.sin(a2);
  let setPixel;
  if (!isLargeArc) {
    setPixel = function(px, py) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx === 0 && dy === 0) {
        return;
      }
      const cuw = startX * dy - startY * dx;
      const cvw = endX * dy - endY * dx;
      if (cuw >= 0 && cvw <= 0) {
        writePoint(px, py, color);
      }
    };
  } else {
    setPixel = function(px, py) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx === 0 && dy === 0) {
        return;
      }
      const cuw = startX * dy - startY * dx;
      const cvw = endX * dy - endY * dx;
      if (!(cvw >= 0 && cuw <= 0)) {
        writePoint(px, py, color);
      }
    };
  }
  const finalRadius = radius - 1;
  if (finalRadius < 1) {
    return;
  }
  if (finalRadius === 1) {
    setPixel(cx + 1, cy);
    setPixel(cx - 1, cy);
    setPixel(cx, cy + 1);
    setPixel(cx, cy - 1);
    return;
  }
  let x = finalRadius;
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
    if (x < y) {
      break;
    }
    if (x === y) {
      setPixel(cx + x, cy + y);
      setPixel(cx - x, cy + y);
      setPixel(cx - x, cy - y);
      setPixel(cx + x, cy - y);
    } else {
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
}
function normalizeAngle(angle) {
  let normalized = angle % TWO_PI;
  if (normalized < 0) {
    normalized += TWO_PI;
  }
  return normalized;
}

// src/renderer/draw/bezier.js
function drawBezier(screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const color = screenData.color;
  const writePoint = createPointWriter(screenData, POINTS_BATCH);
  const maxError = 0.75;
  const pts = tessellateCubicBezier(
    p0x,
    p0y,
    p1x,
    p1y,
    p2x,
    p2y,
    p3x,
    p3y,
    maxError
  );
  if (pts.length < 4) {
    writePoint(p0x | 0, p0y | 0, color);
    return;
  }
  const drawn = /* @__PURE__ */ new Set();
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const x1 = pts[i] | 0;
    const y1 = pts[i + 1] | 0;
    const x2 = pts[i + 2] | 0;
    const y2 = pts[i + 3] | 0;
    if (x1 === x2 && y1 === y2) continue;
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
    let x = x1;
    let y = y1;
    while (true) {
      const key = x + "," + y;
      if (!drawn.has(key)) {
        drawn.add(key);
        writePoint(x, y, color);
      }
      if (x === x2 && y === y2) {
        break;
      }
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
}

// src/renderer/draw/lines.js
function drawLine(screenData, x1, y1, x2, y2) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const color = screenData.color;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const pointCount = Math.max(dx, dy) + 1;
  const batch = screenData.batches[POINTS_BATCH];
  if (pointCount > batch.maxCapacity) {
    return drawLineChunked(screenData, x1, y1, x2, y2);
  }
  if (!prepareBatch(screenData, POINTS_BATCH, pointCount)) {
    return;
  }
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
  let x = x1;
  let y = y1;
  while (true) {
    addVertexToBatch(batch, x, y, color);
    if (x === x2 && y === y2) {
      break;
    }
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
function drawLineChunked(screenData, x1, y1, x2, y2) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const color = screenData.color;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const writePoint = createPointWriter(screenData, POINTS_BATCH);
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
  let x = x1;
  let y = y1;
  while (true) {
    writePoint(x, y, color);
    if (x === x2 && y === y2) {
      break;
    }
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

// src/renderer/draw/rects.js
function drawRect(screenData, x, y, width, height) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const x2 = x + width - 1;
  const y2 = y + height - 1;
  const color = screenData.color;
  drawRectFilled(screenData, x, y, width, 1, color);
  if (height > 1) {
    drawRectFilled(screenData, x, y + height - 1, width, 1, color);
  }
  if (width > 1 && height > 2) {
    drawRectFilled(screenData, x + width - 1, y + 1, 1, height - 2, color);
  }
  if (height > 2) {
    drawRectFilled(screenData, x, y + 1, 1, height - 2, color);
  }
}
function drawRectFilled(screenData, x, y, width, height, color) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const batch = screenData.batches[GEOMETRY_BATCH];
  if (!prepareBatch(screenData, GEOMETRY_BATCH, 6)) {
    return;
  }
  const x1 = x;
  const y1 = y;
  const x2 = x + width;
  const y2 = y + height;
  addTriangleToBatch(batch, x1, y1, x2, y1, x1, y2, color);
  addTriangleToBatch(batch, x2, y1, x2, y2, x1, y2, color);
}

// src/renderer/draw/ellipses.js
function drawEllipse(screenData, cx, cy, rx, ry, fillColor) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const color = screenData.color;
  const writePoint = createPointWriter(screenData, POINTS_BATCH);
  if (rx < 0 || ry < 0) {
    return;
  }
  if (rx === 0 && ry === 0) {
    writePoint(cx, cy, color);
    return;
  }
  const plotPoint = function(px, py) {
    const ix = px | 0;
    const iy = py | 0;
    writePoint(ix, iy, color);
  };
  const plotSymmetric = function(x2, y2) {
    if (x2 === 0) {
      plotPoint(cx, cy + y2);
      if (y2 !== 0) {
        plotPoint(cx, cy - y2);
      }
      return;
    }
    if (y2 === 0) {
      plotPoint(cx + x2, cy);
      plotPoint(cx - x2, cy);
      return;
    }
    plotPoint(cx + x2, cy + y2);
    plotPoint(cx - x2, cy + y2);
    plotPoint(cx - x2, cy - y2);
    plotPoint(cx + x2, cy - y2);
  };
  let x = 0;
  let y = ry;
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  let dx = 2 * ry2 * x;
  let dy = 2 * rx2 * y;
  let d1 = ry2 - rx2 * ry + 0.25 * rx2;
  plotSymmetric(x, y);
  const doFill = fillColor !== null && rx >= 1 && ry >= 1;
  let scanlineMinMax = null;
  let updateScanlineSym = null;
  if (doFill) {
    scanlineMinMax = /* @__PURE__ */ new Map();
    const updateScanline = function(px, py) {
      const pixelY = py | 0;
      const pixelX = px | 0;
      if (!scanlineMinMax.has(pixelY)) {
        if (pixelX < 0) {
          scanlineMinMax.set(pixelY, { "left": pixelX, "right": Infinity });
        } else if (pixelX > 0) {
          scanlineMinMax.set(pixelY, { "left": -Infinity, "right": pixelX });
        } else {
          scanlineMinMax.set(pixelY, { "left": pixelX, "right": pixelX });
        }
      } else {
        const limits = scanlineMinMax.get(pixelY);
        if (pixelX < 0 && pixelX > limits.left) {
          limits.left = pixelX;
        }
        if (pixelX > 0 && pixelX < limits.right) {
          limits.right = pixelX;
        }
      }
    };
    updateScanline(x, y);
    updateScanline(-x, y);
    updateScanline(-x, -y);
    updateScanline(x, -y);
    updateScanlineSym = function(sx, sy) {
      updateScanline(sx, sy);
      updateScanline(-sx, sy);
      updateScanline(-sx, -sy);
      updateScanline(sx, -sy);
    };
  }
  while (dx < dy) {
    if (d1 < 0) {
      x += 1;
      dx = dx + 2 * ry2;
      d1 = d1 + dx + ry2;
    } else {
      x += 1;
      y -= 1;
      dx = dx + 2 * ry2;
      dy = dy - 2 * rx2;
      d1 = d1 + dx - dy + ry2;
    }
    plotSymmetric(x, y);
    if (doFill) {
      updateScanlineSym(x, y);
    }
  }
  let d2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
  while (y >= 0) {
    if (d2 > 0) {
      y -= 1;
      dy = dy - 2 * rx2;
      d2 = d2 + rx2 - dy;
    } else {
      y -= 1;
      x += 1;
      dx = dx + 2 * ry2;
      dy = dy - 2 * rx2;
      d2 = d2 + dx - dy + rx2;
    }
    plotSymmetric(x, y);
    if (doFill) {
      updateScanlineSym(x, y);
    }
  }
  if (doFill) {
    const sortedYCoords = [];
    for (const [currentY] of scanlineMinMax.entries()) {
      sortedYCoords.push(currentY);
    }
    sortedYCoords.sort(function(a, b) {
      return a - b;
    });
    if (sortedYCoords.length >= 3) {
      const geoBatch = screenData.batches[GEOMETRY_BATCH];
      let remaining = 0;
      for (let row = 1; row < sortedYCoords.length - 1; row++) {
        const currentY = sortedYCoords[row];
        const limits = scanlineMinMax.get(currentY);
        if (limits.left === -Infinity || limits.right === Infinity) {
          continue;
        }
        const xStart = limits.left + 1;
        const xEnd = limits.right - 1;
        if (xEnd < xStart) {
          continue;
        }
        const yWorld = cy + currentY;
        const x1 = cx + xStart;
        const x2 = cx + xEnd + 1;
        if (remaining === 0) {
          remaining = prepareBatchChunk(
            screenData,
            GEOMETRY_BATCH,
            void 0,
            6
          );
          if (remaining === 0) {
            return;
          }
        }
        remaining -= 6;
        addVertexToBatch(geoBatch, x1, yWorld, fillColor);
        addVertexToBatch(geoBatch, x2, yWorld, fillColor);
        addVertexToBatch(geoBatch, x1, yWorld + 1, fillColor);
        addVertexToBatch(geoBatch, x2, yWorld, fillColor);
        addVertexToBatch(geoBatch, x2, yWorld + 1, fillColor);
        addVertexToBatch(geoBatch, x1, yWorld + 1, fillColor);
      }
    }
  }
}

// src/renderer/effects.js
function shiftImageUp(screenData, yOffset, x, y, width, height) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  if (yOffset <= 0) {
    return;
  }
  const screenWidth = screenData.width;
  const screenHeight = screenData.height;
  let regionX = 0;
  let regionY = 0;
  let regionW = screenWidth;
  let regionH = screenHeight;
  if (x !== void 0 && x !== null) {
    regionX = x;
    regionY = y;
    regionW = width;
    regionH = height;
  }
  if (regionW <= 0 || regionH <= 0) {
    return;
  }
  const gl = screenData.gl;
  flushBatches(screenData);
  if (isContextUnavailable(screenData)) {
    return;
  }
  const remainH = regionH - yOffset;
  const glX0 = regionX;
  const glY0 = screenHeight - (regionY + regionH);
  const glX1 = regionX + regionW;
  const glY1 = screenHeight - regionY;
  if (remainH <= 0) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(glX0, glY0, regionW, regionH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return;
  }
  const srcY0 = screenHeight - (regionY + regionH);
  const srcY1 = screenHeight - (regionY + yOffset);
  const dstY0 = screenHeight - (regionY + remainH);
  const dstY1 = screenHeight - regionY;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, screenData.FBO);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.bufferFBO);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.blitFramebuffer(
    glX0,
    srcY0,
    glX1,
    srcY1,
    glX0,
    dstY0,
    glX1,
    dstY1,
    gl.COLOR_BUFFER_BIT,
    gl.NEAREST
  );
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.FBO);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, screenData.bufferFBO);
  gl.blitFramebuffer(
    glX0,
    glY0,
    glX1,
    glY1,
    glX0,
    glY0,
    glX1,
    glY1,
    gl.COLOR_BUFFER_BIT,
    gl.NEAREST
  );
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
}
function cls(screenData, x, y, width, height) {
  if (probeContextLoss(screenData)) {
    return;
  }
  if (width <= 0 || height <= 0) {
    return;
  }
  if (x === 0 && y === 0 && width === screenData.width && height === screenData.height) {
    resetBatches(screenData);
  } else {
    flushBatches(screenData);
  }
  if (isContextUnavailable(screenData)) {
    return;
  }
  const gl = screenData.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
  gl.viewport(0, 0, screenData.width, screenData.height);
  if (x === 0 && y === 0 && width === screenData.width && height === screenData.height) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  } else {
    gl.enable(gl.SCISSOR_TEST);
    const scissorY = screenData.height - (y + height);
    gl.scissor(x, scissorY, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// src/renderer/renderer.js
var m_isDebug3 = window.location.search.includes("webgl-debug");
var m_offscreenContext = null;
var m_contexts = /* @__PURE__ */ new WeakMap();
function init9(api) {
  addScreenDataItem("contextLost", false);
  addScreenDataItem("contextGeneration", 0);
  addScreenDataItem("isRenderScheduled", false);
  addScreenDataItem("isFirstRender", true);
  addScreenDataItem("gl", null);
  addScreenDataItem("fboTexture", null);
  addScreenDataItem("FBO", null);
  addScreenDataItem("bufferFboTexture", null);
  addScreenDataItem("bufferFBO", null);
  addScreenDataItem("customShaders", {});
  addScreenDataItem("frameCount", 0);
  addScreenCleanupFunction(cleanup3);
  init3();
  init5();
  init7();
  init8();
  init6();
}
function createContext(screenData) {
  let canvas = screenData.canvas;
  if (screenData.parentRenderContext) {
    canvas = screenData.canvas.canvas;
    screenData.gl = screenData.parentRenderContext;
  } else if (screenData.isOffscreen) {
    canvas = screenData.canvas.canvas;
    if (!m_offscreenContext) {
      m_offscreenContext = canvas.getContext("webgl2", {
        "alpha": true,
        "premultipliedAlpha": true,
        "antialias": false,
        "preserveDrawingBuffer": true,
        "desynchronized": false,
        "colorType": "unorm8"
      });
    }
    screenData.gl = m_offscreenContext;
  } else {
    screenData.gl = canvas.getContext("webgl2", {
      "alpha": true,
      "premultipliedAlpha": true,
      "antialias": false,
      "preserveDrawingBuffer": true,
      "desynchronized": false,
      "colorType": "unorm8"
    });
  }
  if (!screenData.gl) {
    throwError(
      Error,
      "screen: Failed to create WebGL2 context. WebGL2 is required.",
      "WEBGL_ERROR"
    );
  }
  const gl = screenData.gl;
  let state = m_contexts.get(gl);
  if (!state) {
    state = {
      "gl": gl,
      "canvas": gl.canvas,
      "generation": 0,
      "status": "ready",
      "screens": /* @__PURE__ */ new Set(),
      "error": null
    };
    state.suspend = () => suspendContext(state);
    state.lostHandler = (event) => {
      event.preventDefault();
      state.suspend();
    };
    state.restoredHandler = () => restoreContext(state);
    state.canvas.addEventListener("webglcontextlost", state.lostHandler);
    state.canvas.addEventListener("webglcontextrestored", state.restoredHandler);
    m_contexts.set(gl, state);
  }
  state.screens.add(screenData);
  screenData.contextState = state;
  screenData.contextGeneration = state.generation;
  screenData.contextLost = state.status !== "ready";
  if (probeContextLoss(screenData)) {
    return;
  }
  createResources(screenData);
  if (m_isDebug3) {
    const debugExt = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugExt) {
      console.log("GPU:", gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL));
    }
  }
}
function createResources(screenData) {
  const gl = screenData.gl;
  gl.viewport(0, 0, screenData.width, screenData.height);
  const primary = createTextureAndFBO(screenData);
  screenData.FBO = primary.FBO;
  screenData.fboTexture = primary.fboTexture;
  const buffer = createTextureAndFBO(screenData);
  screenData.bufferFBO = buffer.FBO;
  screenData.bufferFboTexture = buffer.fboTexture;
  createBatches(screenData);
  setupDisplayShader(screenData);
}
function discardResources(screenData) {
  screenData.isRenderScheduled = false;
  screenData.isFirstRender = true;
  screenData.batches = {};
  screenData.batchInfo = {
    "currentBatch": null,
    "drawOrder": [],
    "textureBatchSet": /* @__PURE__ */ new Set()
  };
  screenData.customShaders = {};
  screenData.displayShaderUniformBindings = {};
  screenData.imageContextMap = /* @__PURE__ */ new Map();
  screenData.samplerContextMap = /* @__PURE__ */ new Map();
  for (const key of [
    "FBO",
    "fboTexture",
    "bufferFBO",
    "bufferFboTexture",
    "displayProgram",
    "displayPositionBuffer",
    "displayQuadVao",
    "displayLocations",
    "textureCopyFBO"
  ]) {
    screenData[key] = null;
  }
}
function suspendContext(state) {
  if (state.status === "lost") {
    return;
  }
  state.status = "lost";
  state.generation++;
  state.error = null;
  for (const screen2 of state.screens) {
    screen2.contextLost = true;
    screen2.contextGeneration = state.generation;
    discardResources(screen2);
  }
}
function restoreContext(state) {
  if (state.status !== "lost" || state.gl.isContextLost()) {
    return;
  }
  state.status = "restoring";
  try {
    for (const screen2 of state.screens) {
      createResources(screen2);
    }
    for (const screen2 of state.screens) {
      restoreDisplayShaderBindings(screen2);
      for (const other of getAllScreensData()) {
        if (other.gl !== state.gl) {
          deleteWebGL2Texture(other, screen2.canvas);
        }
      }
    }
    state.status = "ready";
    for (const screen2 of state.screens) {
      screen2.contextLost = false;
    }
    for (const screen2 of state.screens) {
      setImageDirty(screen2);
    }
  } catch (cause) {
    for (const screen2 of state.screens) {
      releaseResources(screen2);
      discardResources(screen2);
      screen2.contextLost = true;
    }
    state.status = "failed";
    const error = new Error("WebGL context resource recovery failed.", { "cause": cause });
    error.code = "WEBGL_CONTEXT_RESTORE_FAILED";
    state.error = error;
    console.error(error.code, error);
  }
}
function createTextureAndFBO(screenData) {
  const gl = screenData.gl;
  const width = screenData.width;
  const height = screenData.height;
  let FBO = null;
  const fboTexture = gl.createTexture();
  if (!fboTexture) {
    throwError(Error, "screen: Failed to create WebGL2 texture.", "WEBGL_ERROR");
  }
  try {
    gl.bindTexture(gl.TEXTURE_2D, fboTexture);
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
    FBO = gl.createFramebuffer();
    if (!FBO) {
      throwError(
        Error,
        "screen: Failed to create WebGL2 framebuffer.",
        "WEBGL_ERROR"
      );
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, FBO);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      fboTexture,
      0
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throwError(
        Error,
        `screen: WebGL2 Framebuffer incomplete. ${status}`,
        "WEBGL_ERROR"
      );
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { "fboTexture": fboTexture, "FBO": FBO };
  } catch (error) {
    gl.deleteTexture(fboTexture);
    gl.deleteFramebuffer(FBO);
    throw error;
  }
}
function cleanup3(screenData) {
  const state = screenData.contextState;
  let discarded = null;
  if (state) {
    state.screens.delete(screenData);
    if (state.screens.size === 0) {
      state.canvas.removeEventListener("webglcontextlost", state.lostHandler);
      state.canvas.removeEventListener("webglcontextrestored", state.restoredHandler);
      m_contexts.delete(state.gl);
      if (state.gl === m_offscreenContext) {
        m_offscreenContext = null;
        discarded = state.gl;
        releaseOffscreenCanvas(state.canvas);
      }
    }
    screenData.contextState = null;
  }
  releaseResources(screenData);
  if (discarded !== null && !discarded.isContextLost()) {
    const extension = discarded.getExtension("WEBGL_lose_context");
    if (extension) {
      extension.loseContext();
    }
  }
}
function releaseResources(screenData) {
  const gl = screenData.gl;
  if (!gl) {
    return;
  }
  screenData.isRenderScheduled = false;
  cleanup(screenData);
  if (screenData.displayProgram) {
    gl.deleteProgram(screenData.displayProgram);
    gl.deleteBuffer(screenData.displayPositionBuffer);
    gl.deleteVertexArray(screenData.displayQuadVao);
  }
  if (screenData.customShaders) {
    for (const id of Object.keys(screenData.customShaders)) {
      const cache = screenData.customShaders[id];
      if (cache && cache.program) {
        gl.deleteProgram(cache.program);
      }
    }
  }
  cleanup2(screenData);
  if (screenData.FBO) {
    gl.deleteFramebuffer(screenData.FBO);
    gl.deleteTexture(screenData.fboTexture);
  }
  if (screenData.bufferFBO) {
    gl.deleteFramebuffer(screenData.bufferFBO);
    gl.deleteTexture(screenData.bufferFboTexture);
  }
}
function setImageDirty(screenData) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  if (screenData.isOffscreen && screenData.parentRenderContext) {
    return;
  }
  if (!screenData.isRenderScheduled) {
    const generation = getContextGeneration(screenData);
    screenData.isRenderScheduled = true;
    queueMicrotask(() => {
      if (!screenData.isRenderScheduled || screenData.isRemoved || generation !== getContextGeneration(screenData) || isContextUnavailable(screenData)) {
        return;
      }
      try {
        flushBatches(screenData);
        displayToCanvas(screenData);
      } finally {
        screenData.isRenderScheduled = false;
      }
    });
  }
}
function blendModeChanged(screenData, previousBlends) {
  flushBatches(screenData, previousBlends);
  displayToCanvas(screenData);
}
function resizeScreen(screenData, oldWidth, oldHeight) {
  if (probeContextLoss(screenData)) {
    return;
  }
  flushBatches(screenData);
  if (isContextUnavailable(screenData)) {
    return;
  }
  const gl = screenData.gl;
  const newWidth = screenData.width;
  const newHeight = screenData.height;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, screenData.FBO);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.bufferFBO);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.blitFramebuffer(
    0,
    0,
    oldWidth,
    oldHeight,
    0,
    0,
    oldWidth,
    oldHeight,
    gl.COLOR_BUFFER_BIT,
    gl.NEAREST
  );
  gl.bindTexture(gl.TEXTURE_2D, screenData.fboTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    newWidth,
    newHeight,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  const copyWidth = Math.min(oldWidth, newWidth);
  const copyHeight = Math.min(oldHeight, newHeight);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, screenData.bufferFBO);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.FBO);
  const srcY = oldHeight - copyHeight;
  const destinationY = newHeight - copyHeight;
  gl.blitFramebuffer(
    0,
    srcY,
    copyWidth,
    srcY + copyHeight,
    0,
    destinationY,
    copyWidth,
    destinationY + copyHeight,
    gl.COLOR_BUFFER_BIT,
    gl.NEAREST
  );
  gl.bindTexture(gl.TEXTURE_2D, screenData.bufferFboTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    newWidth,
    newHeight,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
}

// src/api/colors.js
var MAX_DIFFERENCE = 255 * 255 * 3.25;
var m_defaultPal = [];
var m_defaultPalMap = /* @__PURE__ */ new Map();
var m_defaultColor = -1;
function init10(api) {
  const defaultPaletteHex = "0000AA00AA0000AAAAAA0000AA00AAAA5500AAAAAA5555555555FF55FF5555FFFFFF5555FF55FFFFFF55FFFFFF0000001414142020202D2D2D393939454545515151616161717171828282929292A2A2A2B6B6B6CACACAE3E3E3FFFFFF0000FF4100FF7D00FFBE00FFFF00FFFF00BEFF007DFF0041FF0000FF4100FF7D00FFBE00FFFF00BEFF007DFF0041FF0000FF0000FF4100FF7D00FFBE00FFFF00BEFF007DFF0041FF7D7DFF9E7DFFBE7DFFDF7DFFFF7DFFFF7DDFFF7DBEFF7D9EFF7D7DFF9E7DFFBE7DFFDF7DFFFF7DDFFF7DBEFF7D9EFF7D7DFF7D7DFF9E7DFFBE7DFFDF7DFFFF7DDFFF7DBEFF7D9EFFB6B6FFC6B6FFDBB6FFEBB6FFFFB6FFFFB6EBFFB6DBFFB6C6FFB6B6FFC6B6FFDBB6FFEBB6FFFFB6EBFFB6DBFFB6C6FFB6B6FFB6B6FFC6B6FFDBB6FFEBB6FFFFB6EBFFB6DBFFB6C6FF0000711C007139007155007171007171005571003971001C710000711C007139007155007171005571003971001C710000710000711C007139007155007171005571003971001C713939714539715539716139717139717139617139557139457139397145397155397161397171396171395571394571393971393971453971553971613971713961713955713945715151715951716151716951717151717151697151617151597151517159517161517169517171516971516171515971515171515171595171615171695171715169715161715159710000411000412000413100414100414100314100204100104100004110004120004131004141003141002041001041000041000041100041200041310041410031410020410010412020412820413120413920414120414120394120314120284120204128204131204139204141203941203141202841202041202041282041312041392041412039412031412028412D2D41312D41352D413D2D41412D41412D3D412D35412D31412D2D41312D41352D413D2D41412D3D412D35412D31412D2D412D2D41312D41352D413D2D41412D3D412D35412D3141000000000000000000000000000000000000000000".match(/.{6}/g).map((color) => "#" + color);
  setDefaultPal({ "pal": defaultPaletteHex });
  setDefaultColor({ "color": 7 });
  addScreenDataItemGetter("pal", () => m_defaultPal);
  addScreenDataItemGetter("color", () => m_defaultColor);
  addScreenDataItemGetter("palMap", () => m_defaultPalMap);
  registerCommands4(api);
}
function registerCommands4() {
  addCommand("setDefaultPal", setDefaultPal, false, ["pal"]);
  addCommand("getDefaultPal", getDefaultPal, false, ["include0"]);
  addCommand("setDefaultColor", setDefaultColor, false, ["color"]);
  addCommand("getDefaultColor", getDefaultColor, false, ["asIndex"]);
  addCommand("createColor", createColor2, false, ["color"]);
  addCommand("setColor", setColor, true, ["color"]);
  addCommand("getColor", getColor, true, ["asIndex"]);
  addCommand("getPal", getPal, true, ["include0"]);
  addCommand("setPal", setPal, true, ["pal"]);
  addCommand("getPalIndex", getPalIndex, true, ["color", "tolerance"]);
  addCommand("setBgColor", setBgColor, true, ["color"]);
  addCommand("setContainerBgColor", setContainerBgColor, true, ["color"]);
  addCommand("setPalColors", setPalColors, true, ["indices", "colors"]);
  addCommand("addPalColors", addPalColors, true, ["colors"]);
  addCommand("getPalColor", getPalColor, true, ["index"]);
}
function setDefaultPal(options) {
  const pal = options.pal;
  if (!Array.isArray(pal)) {
    throwError(
      TypeError,
      "setDefaultPal: Parameter pal must be an array.",
      "INVALID_PARAMETER"
    );
  }
  if (pal.length === 0) {
    throwError(
      RangeError,
      "setDefaultPal: Parameter pal must have at least one color value.",
      "EMPTY_PALETTE"
    );
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
function getDefaultPal(options) {
  const filteredPal = [];
  let startIndex = 0;
  if (!options.include0) {
    startIndex = 1;
  }
  for (let i = startIndex; i < m_defaultPal.length; i += 1) {
    filteredPal.push(rgbToColor(
      m_defaultPal[i].r,
      m_defaultPal[i].g,
      m_defaultPal[i].b,
      m_defaultPal[i].a
    ));
  }
  return filteredPal;
}
function setDefaultColor(options) {
  const colorValue = getColorValueByRawInput({ "pal": m_defaultPal }, options.color);
  if (colorValue === null) {
    throwError(
      TypeError,
      "setDefaultColor: Parameter color must be a valid color or an integer palette index in range.",
      "INVALID_PARAMETER"
    );
  }
  m_defaultColor = colorValue;
}
function getDefaultColor(options) {
  const asIndex = options.asIndex ?? true;
  if (asIndex) {
    const fakeScreenData = { "pal": m_defaultPal, "palMap": m_defaultPalMap };
    return findColorIndexByColorValue(fakeScreenData, m_defaultColor);
  }
  return createColor(m_defaultColor.array);
}
function createColor2(options) {
  const color = convertToColor(options.color);
  if (color === null) {
    throwError(
      TypeError,
      "createColor: Parameter color is not a valid color format.",
      "INVALID_PARAMETER"
    );
  }
  return color;
}
function setColor(screenData, options) {
  const colorInput = options.color;
  let colorValue;
  if (typeof colorInput === "number") {
    colorValue = getColorValueByIndex(screenData, colorInput);
    if (colorValue === null) {
      throwError(
        TypeError,
        "setColor: Parameter color index is not in pal.",
        "INVALID_PARAMETER"
      );
    }
  } else {
    colorValue = convertToColor(colorInput);
    if (colorValue === null) {
      throwError(
        TypeError,
        "setColor: Parameter color is not a valid color format.",
        "INVALID_PARAMETER"
      );
    }
  }
  screenData.color = colorValue;
}
function getColor(screenData, options) {
  const asIndex = !!options.asIndex;
  if (asIndex) {
    return findColorIndexByColorValue(screenData, screenData.color);
  }
  return createColor(screenData.color.array);
}
function getPal(screenData, options) {
  const filteredPal = [];
  let startIndex = 0;
  if (!options.include0) {
    startIndex = 1;
  }
  for (let i = startIndex; i < screenData.pal.length; i += 1) {
    filteredPal.push(rgbToColor(
      screenData.pal[i].r,
      screenData.pal[i].g,
      screenData.pal[i].b,
      screenData.pal[i].a
    ));
  }
  return filteredPal;
}
function setPal(screenData, options) {
  const pal = options.pal;
  if (!Array.isArray(pal)) {
    throwError(
      TypeError,
      "setPal: Parameter pal is must be an array.",
      "INVALID_PARAMETER"
    );
  }
  if (pal.length === 0) {
    throwError(
      RangeError,
      "setPal: Parameter pal must have at least one color value.",
      "EMPTY_PALETTE"
    );
  }
  const newPal = [rgbToColor(0, 0, 0, 0)];
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
  const color = options.color;
  const tolerance = getFloat(options.tolerance, 0);
  if (tolerance < 0 || tolerance > 1) {
    throwError(
      RangeError,
      "getPalIndex: Parameter tolerance must be a number between 0 and 1 (0 = exact match, 1 = any color).",
      "INVALID_PARAMETER"
    );
  }
  const colorValue = convertToColor(color);
  if (colorValue === null) {
    throwError(
      TypeError,
      "getPalIndex: Parameter color is not a valid color format.",
      "INVALID_COLOR"
    );
  }
  const index = findColorIndexByColorValue(screenData, colorValue, tolerance);
  return index;
}
function setBgColor(screenData, options) {
  const colorRaw = options.color;
  const color = getColorValueByRawInput(screenData, colorRaw);
  if (color !== null) {
    screenData.canvas.style.backgroundColor = colorToHex(color);
  } else {
    throwError(
      TypeError,
      "setBgColor: invalid color value for parameter color.",
      "INVALID_COLOR"
    );
  }
}
function setContainerBgColor(screenData, options) {
  if (!screenData.container) {
    return;
  }
  const colorRaw = options.color;
  const color = getColorValueByRawInput(screenData, colorRaw);
  if (color !== null) {
    screenData.container.style.backgroundColor = colorToHex(color);
  } else {
    throwError(
      TypeError,
      "setContainerBgColor: invalid color value for parameter color.",
      "INVALID_COLOR"
    );
  }
}
function setPalColors(screenData, options) {
  const indices = options.indices;
  const colors = options.colors;
  if (!Array.isArray(indices)) {
    throwError(
      TypeError,
      "setPalColors: Parameter indices must be an array.",
      "INVALID_INDICES"
    );
  }
  if (!Array.isArray(colors)) {
    throwError(
      TypeError,
      "setPalColors: Parameter colors must be an array.",
      "INVALID_COLORS"
    );
  }
  if (indices.length !== colors.length) {
    throwError(
      RangeError,
      "setPalColors: Parameters indices and colors must have the same length.",
      "LENGTH_MISMATCH"
    );
  }
  if (indices.length === 0) {
    return;
  }
  for (let i = 0; i < indices.length; i += 1) {
    const index = indices[i];
    const color = colors[i];
    if (!Number.isInteger(index) || index < 0 || index >= screenData.pal.length) {
      console.warn(
        `setPalColors: Parameter indices[${i}] must be an integer value between 0 and ${screenData.pal.length - 1}.`
      );
      continue;
    }
    if (index === 0) {
      console.warn(
        `setPalColors: Parameter indices[${i}] cannot be 0, this is reserved for transparency. To set background color of the screen use the setBgColor command.`
      );
      continue;
    }
    const colorValue = convertToColor(color);
    if (colorValue === null) {
      console.warn(
        `setPalColors: Parameter colors[${i}] is not a valid color format.`
      );
      continue;
    }
    const oldColor = screenData.pal[index];
    if (colorValue.key === oldColor.key) {
      continue;
    }
    if (screenData.color.key === oldColor.key) {
      screenData.color = colorValue;
    }
    screenData.pal[index] = colorValue;
    screenData.palMap.delete(oldColor.key);
    screenData.palMap.set(colorValue.key, index);
  }
}
function addPalColors(screenData, options) {
  const colors = options.colors;
  if (!Array.isArray(colors)) {
    throwError(
      TypeError,
      "addPalColors: Parameter colors must be an array.",
      "INVALID_COLORS"
    );
  }
  if (colors.length === 0) {
    return [];
  }
  const newIndices = [];
  for (let i = 0; i < colors.length; i += 1) {
    const color = colors[i];
    const colorValue = convertToColor(color);
    if (colorValue === null) {
      console.warn(`addPalColors: Parameter colors[${i}] is not a valid color format.`);
      continue;
    }
    const existingIndex = screenData.palMap.get(colorValue.key);
    if (existingIndex !== void 0) {
      continue;
    }
    const newIndex = screenData.pal.length;
    screenData.pal.push(colorValue);
    screenData.palMap.set(colorValue.key, newIndex);
    newIndices.push(newIndex);
  }
  return newIndices;
}
function getPalColor(screenData, options) {
  const color = getColorValueByIndex(screenData, options.index);
  if (color !== null) {
    return createColor(color.array);
  }
  return null;
}
function getColorValueByRawInput(screenData, rawInput) {
  if (typeof rawInput === "number") {
    return getColorValueByIndex(screenData, rawInput);
  }
  return convertToColor(rawInput);
}
function findColorIndexByColorValue(screenData, color, tolerance = 0) {
  if (screenData.palMap.has(color.key)) {
    return screenData.palMap.get(color.key);
  }
  const minSimularity = (1 - tolerance * tolerance) * MAX_DIFFERENCE;
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
    const similarity = MAX_DIFFERENCE - difference;
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
  if (!Number.isInteger(palIndex) || palIndex < 0 || palIndex >= screenData.pal.length) {
    return null;
  }
  return screenData.pal[palIndex];
}

// src/text/print.js
function init11(api) {
  addScreenDataItem("printCursor", {
    "x": 0,
    "y": 0,
    "cols": 0,
    "rows": 0,
    "scaleWidth": 1,
    "scaleHeight": 1,
    "width": 0,
    "height": 0,
    "breakWord": true,
    "padX": 0,
    "padY": 0
  });
  registerCommands5();
}
function registerCommands5() {
  addCommand("print", print, true, ["msg", "isInline", "isCentered"]);
  addCommand("setPos", setPos, true, ["col", "row"]);
  addCommand("setPosPx", setPosPx, true, ["x", "y"]);
  addCommand("getPos", getPos, true, []);
  addCommand("getPosPx", getPosPx, true, []);
  addCommand("getCols", getCols, true, []);
  addCommand("getRows", getRows, true, []);
  addCommand("setWordBreak", setWordBreak, true, ["isEnabled"]);
  addCommand(
    "setPrintSize",
    setPrintSize,
    true,
    ["scaleWidth", "scaleHeight", "padX", "padY"]
  );
  addCommand("calcWidth", calcWidth, true, ["msg"]);
}
function print(screenData, options) {
  let msg = options.msg;
  const isInline = !!options.isInline;
  const isCentered = !!options.isCentered;
  if (!screenData.font) {
    throwError(Error, "print: No font set. Call setFont() first.", "NO_FONT_SET");
  }
  const viewWidth = getViewWidth(screenData);
  const viewHeight = getViewHeight(screenData);
  if (viewWidth <= 0 || viewHeight <= 0) {
    return;
  }
  if (screenData.printCursor.height > viewHeight) {
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
function setPos(screenData, options) {
  const col = options.col;
  const row = options.row;
  const font = screenData.font;
  if (!font) {
    throwError(Error, "setPos: No font set. Call setFont() first.", "NO_FONT_SET");
  }
  const printCursor = screenData.printCursor;
  if (col !== null) {
    if (isNaN(col)) {
      throwError(
        TypeError,
        "setPos: parameter col must be a number",
        "INVALID_COL"
      );
    }
    const viewWidth = getViewWidth(screenData);
    let x = Math.floor(col * printCursor.width);
    if (x > viewWidth) {
      if (viewWidth - printCursor.width < 0) {
        x = 0;
      } else {
        x = viewWidth - printCursor.width;
      }
    }
    screenData.printCursor.x = x;
  }
  if (row !== null) {
    if (isNaN(row)) {
      throwError(
        TypeError,
        "setPos: parameter row must be a number",
        "INVALID_ROW"
      );
    }
    const viewHeight = getViewHeight(screenData);
    let y = Math.floor(row * screenData.printCursor.height);
    if (y > viewHeight) {
      if (viewHeight - printCursor.height < 0) {
        y = 0;
      } else {
        y = viewHeight - printCursor.height;
      }
    }
    screenData.printCursor.y = y;
  }
}
function setPosPx(screenData, options) {
  const x = options.x;
  const y = options.y;
  if (x != null) {
    if (isNaN(x)) {
      throwError(TypeError, "setPosPx: parameter x must be a number", "INVALID_X");
    }
    screenData.printCursor.x = Math.round(x);
  }
  if (y != null) {
    if (isNaN(y)) {
      throwError(TypeError, "setPosPx: parameter y must be a number", "INVALID_Y");
    }
    screenData.printCursor.y = Math.round(y);
  }
}
function getPos(screenData) {
  const font = screenData.font;
  if (!font) {
    return { "col": 0, "row": 0 };
  }
  const printCursor = screenData.printCursor;
  return {
    "col": Math.floor(printCursor.x / printCursor.width),
    "row": Math.floor(printCursor.y / printCursor.height)
  };
}
function getPosPx(screenData) {
  return {
    "x": screenData.printCursor.x,
    "y": screenData.printCursor.y
  };
}
function getCols(screenData) {
  return screenData.printCursor.cols;
}
function getRows(screenData) {
  return screenData.printCursor.rows;
}
function setWordBreak(screenData, options) {
  screenData.printCursor.breakWord = !!options.isEnabled;
}
function setPrintSize(screenData, options) {
  const scaleWidth = readPrintSize(options.scaleWidth, false);
  const scaleHeight = readPrintSize(options.scaleHeight, false);
  const padX = readPrintSize(options.padX, true);
  const padY = readPrintSize(options.padY, true);
  if (scaleWidth !== null && scaleWidth <= 0 || scaleHeight !== null && scaleHeight <= 0) {
    throwError(
      RangeError,
      "setPrintSize: Parameters scaleWidth and scaleHeight must be a number greater than 0.",
      "INVALID_SIZE"
    );
  }
  if (padX !== null && padX < 0 || padY !== null && padY < 0) {
    throwError(
      RangeError,
      "setPrintSize: Parameters padX and padY must be 0 or greater.",
      "INVALID_PADDING"
    );
  }
  if (scaleWidth !== null) {
    screenData.printCursor.scaleWidth = scaleWidth;
  }
  if (scaleHeight !== null) {
    screenData.printCursor.scaleHeight = scaleHeight;
  }
  if (padX !== null) {
    screenData.printCursor.padX = padX;
  }
  if (padY !== null) {
    screenData.printCursor.padY = padY;
  }
  updatePrintCursorDimensions(screenData);
}
function readPrintSize(value, isPadding) {
  if (value === null) {
    return null;
  }
  const parsed = getFloat(value, null);
  if (isPadding) {
    if (parsed === null || !Number.isInteger(parsed)) {
      throwError(
        TypeError,
        "setPrintSize: Parameters padX and padY must be integers.",
        "INVALID_PADDING"
      );
    }
  } else if (parsed === null) {
    throwError(
      TypeError,
      "setPrintSize: Parameters scaleWidth and scaleHeight must be finite numbers.",
      "INVALID_SIZE"
    );
  }
  return parsed;
}
function calcWidth(screenData, options) {
  const msg = options.msg || "";
  const printCursor = screenData.printCursor;
  return printCursor.width * msg.length;
}
function startPrint(screenData, msg, isInline, isCentered) {
  const printCursor = screenData.printCursor;
  const font = screenData.font;
  const width = calcWidth(screenData, { "msg": msg });
  if (isCentered) {
    printCursor.x = Math.floor((printCursor.cols - msg.length) / 2) * printCursor.width;
  }
  const viewWidth = getViewWidth(screenData);
  const viewHeight = getViewHeight(screenData);
  if (viewWidth <= 0 || viewHeight <= 0) {
    return;
  }
  if (!isInline && !isCentered && width + printCursor.x > viewWidth && msg.length > 1) {
    const overlap = width + printCursor.x - viewWidth;
    const onScreen = width - overlap;
    if (onScreen <= 0) {
      return;
    }
    const onScreenPct = onScreen / width;
    const msgSplit = Math.floor(msg.length * onScreenPct);
    if (msgSplit <= 0) {
      return;
    }
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
  if (printCursor.y + printCursor.height > viewHeight) {
    const view = screenData.view;
    shiftImageUp(
      screenData,
      printCursor.height,
      view.clipX,
      view.clipY,
      view.clipWidth,
      view.clipHeight
    );
    printCursor.y -= printCursor.height;
  }
  bitmapPrint(screenData, msg, printCursor.x, printCursor.y);
  if (!isInline) {
    printCursor.y += printCursor.height;
    printCursor.x = 0;
  } else {
    printCursor.x += printCursor.width * msg.length;
    if (printCursor.x > viewWidth - printCursor.width) {
      printCursor.x = 0;
      printCursor.y += printCursor.height;
    }
  }
}
function bitmapPrint(screenData, msg, x, y) {
  const font = screenData.font;
  if (!font.image) {
    console.warn("bitmapPrint: Font image not loaded yet.");
    return;
  }
  getWebGL2Texture(screenData, font.image);
  const atlasWidth = font.atlasWidth;
  const fontWidth = font.width;
  const fontHeight = font.height;
  const printWidth = screenData.printCursor.width;
  const scaleX = screenData.printCursor.scaleWidth;
  const scaleY = screenData.printCursor.scaleHeight;
  const margin = font.margin;
  const cellWidth = font.cellWidth;
  const cellHeight = font.cellHeight;
  const columns = Math.floor(atlasWidth / cellWidth);
  for (let i = 0; i < msg.length; i++) {
    const charIndex = font.chars[msg.charCodeAt(i)];
    if (charIndex !== void 0) {
      const sx = charIndex % columns * cellWidth + margin;
      const sy = Math.floor(charIndex / columns) * cellHeight + margin;
      const dx = x + printWidth * i;
      const color = screenData.color;
      drawSprite(
        screenData,
        font.image,
        sx,
        sy,
        fontWidth,
        fontHeight,
        dx,
        y,
        fontWidth,
        fontHeight,
        color,
        0,
        0,
        scaleX,
        scaleY,
        0
      );
    }
  }
  setImageDirty(screenData);
}
function updatePrintCursorDimensions(screenData) {
  const font = screenData.font;
  if (!font) {
    return;
  }
  const printCursor = screenData.printCursor;
  printCursor.width = printCursor.scaleWidth * (font.width + printCursor.padX);
  printCursor.height = printCursor.scaleHeight * (font.height + printCursor.padY);
  const viewWidth = getViewWidth(screenData);
  const viewHeight = getViewHeight(screenData);
  if (printCursor.width <= 0 || viewWidth <= 0) {
    printCursor.cols = 0;
  } else {
    printCursor.cols = Math.floor(viewWidth / printCursor.width);
  }
  if (printCursor.height <= 0 || viewHeight <= 0) {
    printCursor.rows = 0;
  } else {
    printCursor.rows = Math.floor(viewHeight / printCursor.height);
  }
}
function getViewWidth(screenData) {
  if (screenData.view) {
    return screenData.view.width;
  }
  return screenData.width;
}
function getViewHeight(screenData) {
  if (screenData.view) {
    return screenData.view.height;
  }
  return screenData.height;
}

// src/api/view.js
function init12(api) {
  addScreenDataItem("view", {
    "stack": [],
    "originX": 0,
    "originY": 0,
    "width": 0,
    "height": 0,
    "clipX": 0,
    "clipY": 0,
    "clipWidth": 0,
    "clipHeight": 0
  });
  addScreenInitFunction((screenData) => {
    syncFullScreenCache(screenData);
    afterViewLayoutChange(screenData);
  });
  registerCommands6();
}
function registerCommands6() {
  addCommand("pushView", pushViewCmd, true, ["x", "y", "width", "height"]);
  addCommand("popView", popViewCmd, true, []);
  addCommand("resetView", resetViewCmd, true, []);
  addCommand("viewToScreen", viewToScreenCmd, true, ["x", "y"]);
  addCommand("screenToView", screenToViewCmd, true, ["x", "y"]);
}
function intersectRects(aX, aY, aW, aH, bX, bY, bW, bH) {
  const left = Math.max(aX, bX);
  const top = Math.max(aY, bY);
  const right = Math.min(aX + aW, bX + bW);
  const bottom = Math.min(aY + aH, bY + bH);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return {
    "x": left,
    "y": top,
    "width": width,
    "height": height
  };
}
function containsPoint(x, y, rectX, rectY, rectW, rectH) {
  if (x < rectX || y < rectY) {
    return false;
  }
  if (x >= rectX + rectW || y >= rectY + rectH) {
    return false;
  }
  return true;
}
function toScreen(screenData, x, y) {
  return {
    "x": x + screenData.view.originX,
    "y": y + screenData.view.originY
  };
}
function snapshotView(screenData) {
  const view = screenData.view;
  return {
    "originX": view.originX,
    "originY": view.originY,
    "width": view.width,
    "height": view.height,
    "clipX": view.clipX,
    "clipY": view.clipY,
    "clipWidth": view.clipWidth,
    "clipHeight": view.clipHeight
  };
}
function isInsideClip(viewState, x, y) {
  return containsPoint(
    x,
    y,
    viewState.clipX,
    viewState.clipY,
    viewState.clipWidth,
    viewState.clipHeight
  );
}
function syncFullScreenCache(screenData) {
  const view = screenData.view;
  view.originX = 0;
  view.originY = 0;
  view.width = screenData.width;
  view.height = screenData.height;
  view.clipX = 0;
  view.clipY = 0;
  view.clipWidth = screenData.width;
  view.clipHeight = screenData.height;
}
function recomputeViewCache(screenData) {
  const view = screenData.view;
  const stack = view.stack;
  if (stack.length === 0) {
    syncFullScreenCache(screenData);
    return;
  }
  let originX = 0;
  let originY = 0;
  let clipX = 0;
  let clipY = 0;
  let clipWidth = screenData.width;
  let clipHeight = screenData.height;
  for (let i = 0; i < stack.length; i++) {
    const entry = stack[i];
    originX = originX + entry.localX;
    originY = originY + entry.localY;
    const clip = intersectRects(
      clipX,
      clipY,
      clipWidth,
      clipHeight,
      originX,
      originY,
      entry.width,
      entry.height
    );
    clipX = clip.x;
    clipY = clip.y;
    clipWidth = clip.width;
    clipHeight = clip.height;
  }
  const top = stack[stack.length - 1];
  view.originX = originX;
  view.originY = originY;
  view.width = top.width;
  view.height = top.height;
  view.clipX = clipX;
  view.clipY = clipY;
  view.clipWidth = clipWidth;
  view.clipHeight = clipHeight;
}
function normalizeCursor(screenData) {
  const printCursor = screenData.printCursor;
  if (!printCursor) {
    return;
  }
  const view = screenData.view;
  const maxX = view.width;
  const maxY = view.height;
  if (printCursor.x < 0) {
    printCursor.x = 0;
  } else if (printCursor.x > maxX) {
    printCursor.x = maxX;
  }
  if (printCursor.y < 0) {
    printCursor.y = 0;
  } else if (printCursor.y > maxY) {
    printCursor.y = maxY;
  }
}
function afterViewLayoutChange(screenData) {
  updatePrintCursorDimensions(screenData);
  normalizeCursor(screenData);
}
function onScreenResize(screenData) {
  recomputeViewCache(screenData);
  afterViewLayoutChange(screenData);
}
function flushThenMutate(screenData, mutateFn) {
  flushBatches(screenData);
  mutateFn();
  recomputeViewCache(screenData);
  afterViewLayoutChange(screenData);
}
function parseViewRect(fnName, options) {
  const x = getInt(options.x, null);
  const y = getInt(options.y, null);
  const width = getInt(options.width, null);
  const height = getInt(options.height, null);
  if (x === null || y === null || width === null || height === null) {
    throwError(
      TypeError,
      `${fnName}: Parameters x, y, width, and height must be integers.`,
      "INVALID_PARAMETER"
    );
  }
  if (width < 0 || height < 0) {
    throwError(
      RangeError,
      `${fnName}: Parameters width and height must be 0 or greater.`,
      "INVALID_PARAMETER"
    );
  }
  return {
    "x": x,
    "y": y,
    "width": width,
    "height": height
  };
}
function pushViewCmd(screenData, options) {
  const rect = parseViewRect("pushView", options);
  const printCursor = screenData.printCursor;
  let savedX = 0;
  let savedY = 0;
  if (printCursor) {
    savedX = printCursor.x;
    savedY = printCursor.y;
  }
  flushThenMutate(screenData, () => {
    screenData.view.stack.push({
      "localX": rect.x,
      "localY": rect.y,
      "width": rect.width,
      "height": rect.height,
      "savedCursorX": savedX,
      "savedCursorY": savedY
    });
    if (printCursor) {
      printCursor.x = 0;
      printCursor.y = 0;
    }
  });
}
function popViewCmd(screenData) {
  if (screenData.view.stack.length === 0) {
    throwError(Error, "popView: No view to pop.", "VIEW_STACK_EMPTY");
  }
  flushThenMutate(screenData, () => {
    const popped = screenData.view.stack.pop();
    const printCursor = screenData.printCursor;
    if (printCursor) {
      printCursor.x = popped.savedCursorX;
      printCursor.y = popped.savedCursorY;
    }
  });
}
function resetViewCmd(screenData) {
  flushThenMutate(screenData, () => {
    screenData.view.stack = [];
    const printCursor = screenData.printCursor;
    if (printCursor) {
      printCursor.x = 0;
      printCursor.y = 0;
    }
  });
}
function viewToScreenCmd(screenData, options) {
  const x = getInt(options.x, null);
  const y = getInt(options.y, null);
  if (x === null || y === null) {
    throwError(
      TypeError,
      "viewToScreen: Parameters x and y must be integers.",
      "INVALID_PARAMETER"
    );
  }
  return toScreen(screenData, x, y);
}
function screenToViewCmd(screenData, options) {
  const x = getInt(options.x, null);
  const y = getInt(options.y, null);
  if (x === null || y === null) {
    throwError(
      TypeError,
      "screenToView: Parameters x and y must be integers.",
      "INVALID_PARAMETER"
    );
  }
  return {
    "x": x - screenData.view.originX,
    "y": y - screenData.view.originY
  };
}

// src/api/graphics.js
var DEFAULT_BLIT_COLOR = rgbToColor(255, 255, 255, 255);
var m_api = null;
function init13(api) {
  m_api = api;
  buildApi(null);
  addCommand("cls", cls2, true, ["x", "y", "width", "height"]);
  addScreenInitFunction((screenData) => buildApi(screenData));
}
function buildApi(sharedScreenData) {
  if (sharedScreenData === null) {
    m_api.arc = () => errFn("arc");
    m_api.bezier = () => errFn("bezier");
    m_api.circle = () => errFn("circle");
    m_api.ellipse = () => errFn("ellipse");
    m_api.line = () => errFn("line");
    m_api.pset = () => errFn("pset");
    m_api.rect = () => errFn("rect");
    m_api.drawImage = () => errFn("drawImage");
    m_api.drawSprite = () => errFn("drawSprite");
    return;
  }
  const sharedDrawArc = drawArc;
  const sharedDrawBezier = drawBezier;
  const sharedDrawCircle = drawCircle;
  const sharedDrawCircleFilled = drawCircleFilled;
  const sharedDrawEllipse = drawEllipse;
  const sharedDrawLine = drawLine;
  const sharedDrawPixel = drawPixel;
  const sharedDrawRect = drawRect;
  const sharedDrawRectFilled = drawRectFilled;
  const sharedDrawImage = drawImage;
  const sharedDrawSprite = drawSprite;
  const sharedGetImageFromRawInput = getImageFromRawInput;
  const sharedGetStoredImage = getStoredImage;
  const sharedIsObjectLiteral = isObjectLiteral;
  const sharedSetImageDirty = setImageDirty;
  const sharedGetInt = getInt;
  const sharedGetFloat = getFloat;
  const sharedDegreesToRadian = degreesToRadian;
  const sharedGetColorValueByRawInput = getColorValueByRawInput;
  const sharedPointsBatch = POINTS_BATCH;
  const sharedImageReplaceBatch = IMAGE_REPLACE_BATCH;
  const arcFn = (x, y, radius, angle1, angle2) => {
    const pX = sharedGetInt(x, null);
    const pY = sharedGetInt(y, null);
    const pRadius = sharedGetInt(radius, null);
    if (pX === null || pY === null || pRadius === null) {
      throwError(
        TypeError,
        "arc: Parameters x, y, and radius must be integers.",
        "INVALID_PARAMETER"
      );
    }
    if (typeof angle1 !== "number" || !Number.isFinite(angle1) || typeof angle2 !== "number" || !Number.isFinite(angle2)) {
      throwError(
        TypeError,
        "arc: Parameters angle1 and angle2 must be finite numbers (in degrees).",
        "INVALID_PARAMETER"
      );
    }
    sharedDrawArc(
      sharedScreenData,
      pX,
      pY,
      pRadius,
      sharedDegreesToRadian(angle1),
      sharedDegreesToRadian(angle2)
    );
    sharedSetImageDirty(sharedScreenData);
  };
  const arcFnWrapper = (x, y, radius, angle1, angle2) => {
    if (sharedIsObjectLiteral(x)) {
      arcFn(x.x, x.y, x.radius, x.angle1, x.angle2);
    } else {
      arcFn(x, y, radius, angle1, angle2);
    }
  };
  m_api.arc = arcFnWrapper;
  sharedScreenData.api.arc = arcFnWrapper;
  const bezierFn = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const pX1 = sharedGetInt(x1, null);
    const pY1 = sharedGetInt(y1, null);
    const pX2 = sharedGetInt(x2, null);
    const pY2 = sharedGetInt(y2, null);
    const pX3 = sharedGetInt(x3, null);
    const pY3 = sharedGetInt(y3, null);
    const pX4 = sharedGetInt(x4, null);
    const pY4 = sharedGetInt(y4, null);
    if (pX1 === null || pY1 === null || pX2 === null || pY2 === null || pX3 === null || pY3 === null || pX4 === null || pY4 === null) {
      throwError(
        TypeError,
        "bezier: All control point coordinates must be integers.",
        "INVALID_PARAMETER"
      );
    }
    sharedDrawBezier(sharedScreenData, pX1, pY1, pX2, pY2, pX3, pY3, pX4, pY4);
    sharedSetImageDirty(sharedScreenData);
  };
  const bezierFnWrapper = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    if (sharedIsObjectLiteral(x1)) {
      bezierFn(x1.x1, x1.y1, x1.x2, x1.y2, x1.x3, x1.y3, x1.x4, x1.y4);
    } else {
      bezierFn(x1, y1, x2, y2, x3, y3, x4, y4);
    }
  };
  m_api.bezier = bezierFnWrapper;
  sharedScreenData.api.bezier = bezierFnWrapper;
  const circleFn = (x, y, radius, fillColor) => {
    const pX = sharedGetInt(x, null);
    const pY = sharedGetInt(y, null);
    const pRadius = sharedGetInt(radius, null);
    if (pX === null || pY === null || pRadius === null) {
      throwError(
        TypeError,
        "circle: Parameters x, y, and radius must be integers.",
        "INVALID_PARAMETER"
      );
    }
    let fillColorValue = null;
    if (fillColor != null) {
      fillColorValue = sharedGetColorValueByRawInput(sharedScreenData, fillColor);
      if (fillColorValue === null) {
        throwError(
          TypeError,
          "circle: Parameter 'fillColor' must be a valid color.",
          "INVALID_PARAMETER"
        );
      }
      if (pRadius > 0) {
        sharedDrawCircleFilled(sharedScreenData, pX, pY, pRadius, fillColorValue);
      }
    }
    sharedDrawCircle(sharedScreenData, pX, pY, pRadius);
    sharedSetImageDirty(sharedScreenData);
  };
  const circleFnWrapper = (x, y, radius, fillColor) => {
    if (sharedIsObjectLiteral(x)) {
      circleFn(x.x, x.y, x.radius, x.fillColor);
    } else {
      circleFn(x, y, radius, fillColor);
    }
  };
  m_api.circle = circleFnWrapper;
  sharedScreenData.api.circle = circleFnWrapper;
  const ellipseFn = (x, y, radiusX, radiusY, fillColor) => {
    const pX = sharedGetInt(x, null);
    const pY = sharedGetInt(y, null);
    const pRx = sharedGetInt(radiusX, null);
    const pRy = sharedGetInt(radiusY, null);
    if (pX === null || pY === null || pRx === null || pRy === null) {
      throwError(
        TypeError,
        "ellipse: Parameters x, y, rx, and ry must be integers.",
        "INVALID_PARAMETER"
      );
    }
    let fillColorValue = null;
    if (fillColor != null) {
      fillColorValue = sharedGetColorValueByRawInput(sharedScreenData, fillColor);
      if (fillColorValue === null) {
        throwError(
          TypeError,
          "ellipse: Parameter 'fillColor' must be a valid color.",
          "INVALID_PARAMETER"
        );
      }
    }
    sharedDrawEllipse(sharedScreenData, pX, pY, pRx, pRy, fillColorValue);
    sharedSetImageDirty(sharedScreenData);
  };
  const ellipseFnWrapper = (x, y, radiusX, radiusY, fillColor) => {
    if (sharedIsObjectLiteral(x)) {
      ellipseFn(x.x, x.y, x.radiusX, x.radiusY, x.fillColor);
    } else {
      ellipseFn(x, y, radiusX, radiusY, fillColor);
    }
  };
  m_api.ellipse = ellipseFnWrapper;
  sharedScreenData.api.ellipse = ellipseFnWrapper;
  const lineFn = (x1, y1, x2, y2) => {
    const pX1 = sharedGetInt(x1, null);
    const pY1 = sharedGetInt(y1, null);
    const pX2 = sharedGetInt(x2, null);
    const pY2 = sharedGetInt(y2, null);
    if (pX1 === null || pY1 === null || pX2 === null || pY2 === null) {
      throwError(
        TypeError,
        "line: Parameters x1, y1, x2, y2 must be integers.",
        "INVALID_PARAMETER"
      );
    }
    sharedDrawLine(sharedScreenData, pX1, pY1, pX2, pY2);
    sharedSetImageDirty(sharedScreenData);
  };
  const lineFnWrapper = (x1, y1, x2, y2) => {
    if (sharedIsObjectLiteral(x1)) {
      lineFn(x1.x1, x1.y1, x1.x2, x1.y2);
    } else {
      lineFn(x1, y1, x2, y2);
    }
  };
  m_api.line = lineFnWrapper;
  sharedScreenData.api.line = lineFnWrapper;
  const psetFn = (x, y) => {
    const pX = sharedGetInt(x, null);
    const pY = sharedGetInt(y, null);
    if (pX === null || pY === null) {
      throwError(
        TypeError,
        "pset: Parameters x and y must be integers.",
        "INVALID_PARAMETER"
      );
    }
    sharedDrawPixel(sharedScreenData, pX, pY, sharedPointsBatch);
    sharedSetImageDirty(sharedScreenData);
    sharedScreenData.cursor.x = x;
    sharedScreenData.cursor.y = y;
  };
  const psetFnWrapper = (x, y) => {
    if (sharedIsObjectLiteral(x)) {
      psetFn(x.x, x.y);
    } else {
      psetFn(x, y);
    }
  };
  m_api.pset = psetFnWrapper;
  sharedScreenData.api.pset = psetFnWrapper;
  const rectFn = (x, y, width, height, fillColor) => {
    const pX = sharedGetInt(x, null);
    const pY = sharedGetInt(y, null);
    const pWidth = sharedGetInt(width, null);
    const pHeight = sharedGetInt(height, null);
    if (pX === null || pY === null || pWidth === null || pHeight === null) {
      throwError(
        TypeError,
        "rect: Parameters x, y, width, height must be integers.",
        "INVALID_PARAMETER"
      );
    }
    if (pWidth < 1 || pHeight < 1) {
      return;
    }
    let fillColorValue = null;
    if (fillColor != null) {
      fillColorValue = sharedGetColorValueByRawInput(sharedScreenData, fillColor);
      if (fillColorValue === null) {
        throwError(
          TypeError,
          "rect: Parameter 'fillColor' must be a valid color.",
          "INVALID_PARAMETER"
        );
      }
      const fWidth = pWidth - 2;
      const fHeight = pHeight - 2;
      if (fWidth > 0 && fHeight > 0) {
        sharedDrawRectFilled(sharedScreenData, pX + 1, pY + 1, fWidth, fHeight, fillColorValue);
      }
    }
    sharedDrawRect(sharedScreenData, pX, pY, pWidth, pHeight);
    sharedSetImageDirty(sharedScreenData);
  };
  const rectFnWrapper = (x, y, width, height, fillColor) => {
    if (sharedIsObjectLiteral(x)) {
      rectFn(x.x, x.y, x.width, x.height, x.fillColor);
    } else {
      rectFn(x, y, width, height, fillColor);
    }
  };
  m_api.rect = rectFnWrapper;
  sharedScreenData.api.rect = rectFnWrapper;
  const getBlitColor = (color) => {
    if (color == null) {
      return DEFAULT_BLIT_COLOR;
    }
    return sharedGetColorValueByRawInput(sharedScreenData, color) ?? DEFAULT_BLIT_COLOR;
  };
  const blitImageFn = (img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad) => {
    const pAnchorX = anchorX ?? sharedScreenData.defaultAnchorX;
    const pAnchorY = anchorY ?? sharedScreenData.defaultAnchorY;
    sharedDrawImage(
      sharedScreenData,
      img,
      x ?? 0,
      y ?? 0,
      getBlitColor(color),
      pAnchorX,
      pAnchorY,
      scaleX ?? 1,
      scaleY ?? 1,
      angleRad ?? 0,
      sharedImageReplaceBatch
    );
    sharedSetImageDirty(sharedScreenData);
  };
  const blitImageFnWrapper = (img, x = 0, y = 0, color, anchorX, anchorY, scaleX = 1, scaleY = 1, angleRad = 0) => {
    if (sharedIsObjectLiteral(img)) {
      blitImageFn(
        img.img,
        img.x,
        img.y,
        img.color,
        img.anchorX,
        img.anchorY,
        img.scaleX,
        img.scaleY,
        img.angleRad
      );
    } else {
      blitImageFn(img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad);
    }
  };
  m_api.blitImage = blitImageFnWrapper;
  sharedScreenData.api.blitImage = blitImageFnWrapper;
  const blitSpriteFn = (name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad) => {
    const spriteData = sharedGetStoredImage(name);
    const frameData = spriteData.frames[frame ?? 0];
    const img = spriteData.image;
    const pAnchorX = anchorX ?? sharedScreenData.defaultAnchorX;
    const pAnchorY = anchorY ?? sharedScreenData.defaultAnchorY;
    sharedDrawSprite(
      sharedScreenData,
      img,
      frameData.x,
      frameData.y,
      frameData.width,
      frameData.height,
      x ?? 0,
      y ?? 0,
      frameData.width,
      frameData.height,
      getBlitColor(color),
      pAnchorX,
      pAnchorY,
      scaleX ?? 1,
      scaleY ?? 1,
      angleRad ?? 0,
      sharedImageReplaceBatch
    );
    sharedSetImageDirty(sharedScreenData);
  };
  const blitSpriteFnWrapper = (name, frame = 0, x = 0, y = 0, color, anchorX, anchorY, scaleX = 1, scaleY = 1, angleRad = 0) => {
    if (sharedIsObjectLiteral(name)) {
      blitSpriteFn(
        name.name,
        name.frame,
        name.x,
        name.y,
        name.color,
        name.anchorX,
        name.anchorY,
        name.scaleX,
        name.scaleY,
        name.angleRad
      );
    } else {
      blitSpriteFn(name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad);
    }
  };
  m_api.blitSprite = blitSpriteFnWrapper;
  sharedScreenData.api.blitSprite = blitSpriteFnWrapper;
  const drawImageFn = (image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle) => {
    x = sharedGetInt(x, null);
    y = sharedGetInt(y, null);
    color = color ?? DEFAULT_BLIT_COLOR;
    anchorX = sharedGetFloat(anchorX, sharedScreenData.defaultAnchorX);
    anchorY = sharedGetFloat(anchorY, sharedScreenData.defaultAnchorY);
    scaleX = sharedGetFloat(scaleX, 1);
    scaleY = sharedGetFloat(scaleY, 1);
    angle = sharedGetFloat(angle, 0);
    image = sharedGetImageFromRawInput(image, "drawImage");
    if (x === null || y === null) {
      throwError(
        TypeError,
        "drawImage: Parameters x and y must be numbers.",
        "INVALID_COORDINATES"
      );
    }
    color = sharedGetColorValueByRawInput(sharedScreenData, color);
    if (color === null) {
      color = DEFAULT_BLIT_COLOR;
    }
    const angleRad = sharedDegreesToRadian(angle);
    sharedDrawImage(
      sharedScreenData,
      image,
      x,
      y,
      color,
      anchorX,
      anchorY,
      scaleX,
      scaleY,
      angleRad
    );
    sharedSetImageDirty(sharedScreenData);
  };
  const drawImageFnWrapper = (image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle) => {
    if (sharedIsObjectLiteral(image)) {
      drawImageFn(
        image.image,
        image.x,
        image.y,
        image.color,
        image.anchorX,
        image.anchorY,
        image.scaleX,
        image.scaleY,
        image.angle
      );
    } else {
      drawImageFn(image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle);
    }
  };
  m_api.drawImage = drawImageFnWrapper;
  sharedScreenData.api.drawImage = drawImageFnWrapper;
  const drawSpriteFn = (name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle) => {
    frame = frame ?? 0;
    x = sharedGetInt(x, null);
    y = sharedGetInt(y, null);
    color = color ?? DEFAULT_BLIT_COLOR;
    anchorX = sharedGetFloat(anchorX, sharedScreenData.defaultAnchorX);
    anchorY = sharedGetFloat(anchorY, sharedScreenData.defaultAnchorY);
    scaleX = sharedGetFloat(scaleX, 1);
    scaleY = sharedGetFloat(scaleY, 1);
    angle = sharedGetFloat(angle, 0);
    if (typeof name !== "string") {
      throwError(
        TypeError,
        "drawSprite: Parameter name must be a string.",
        "INVALID_NAME"
      );
    }
    const spriteData = sharedGetStoredImage(name);
    if (!spriteData) {
      throwError(
        Error,
        `drawSprite: Spritesheet "${name}" not found.`,
        "IMAGE_NOT_FOUND"
      );
    }
    if (spriteData.type !== "spritesheet") {
      throwError(
        Error,
        `drawSprite: Image "${name}" is not a spritesheet.`,
        "NOT_A_SPRITESHEET"
      );
    }
    if (spriteData.status !== "ready") {
      const imgName = `Spritesheet "${name}"`;
      if (spriteData.status === "loading") {
        throwError(
          Error,
          `drawSprite: ${imgName} is still loading. Use $.ready() to wait for it.`,
          "IMAGE_NOT_READY"
        );
      }
      if (spriteData.status === "error") {
        throwError(
          Error,
          `drawSprite: ${imgName} failed to load.`,
          "IMAGE_LOAD_FAILED"
        );
      }
    }
    if (!Number.isInteger(frame) || frame >= spriteData.frames.length || frame < 0) {
      throwError(
        RangeError,
        `drawSprite: Frame ${frame} is not valid. Spritesheet has ${spriteData.frames.length} frames.`,
        "INVALID_FRAME"
      );
    }
    if (x === null || y === null) {
      throwError(
        TypeError,
        "drawSprite: Parameters x and y must be numbers.",
        "INVALID_COORDINATES"
      );
    }
    color = sharedGetColorValueByRawInput(sharedScreenData, color);
    if (color === null) {
      color = DEFAULT_BLIT_COLOR;
    }
    const angleRad = sharedDegreesToRadian(angle);
    const frameData = spriteData.frames[frame];
    const img = spriteData.image;
    drawSprite(
      sharedScreenData,
      img,
      frameData.x,
      frameData.y,
      frameData.width,
      frameData.height,
      x,
      y,
      frameData.width,
      frameData.height,
      color,
      anchorX,
      anchorY,
      scaleX,
      scaleY,
      angleRad
    );
    sharedSetImageDirty(sharedScreenData);
  };
  const drawSpriteFnWrapper = (name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle) => {
    if (sharedIsObjectLiteral(name)) {
      drawSpriteFn(
        name.name,
        name.frame,
        name.x,
        name.y,
        name.color,
        name.anchorX,
        name.anchorY,
        name.scaleX,
        name.scaleY,
        name.angle
      );
    } else {
      drawSpriteFn(name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle);
    }
  };
  m_api.drawSprite = drawSpriteFnWrapper;
  sharedScreenData.api.drawSprite = drawSpriteFnWrapper;
}
function cls2(screenData, options) {
  const view = screenData.view;
  const localW = view.width;
  const localH = view.height;
  const x = clamp(getInt(options.x, 0), 0, localW);
  const y = clamp(getInt(options.y, 0), 0, localH);
  const width = clamp(
    getInt(options.width, localW - x),
    0,
    localW - x
  );
  const height = clamp(
    getInt(options.height, localH - y),
    0,
    localH - y
  );
  const phys = toScreen(screenData, x, y);
  const clip = intersectRects(
    phys.x,
    phys.y,
    width,
    height,
    view.clipX,
    view.clipY,
    view.clipWidth,
    view.clipHeight
  );
  if (clip.width > 0 && clip.height > 0) {
    cls(screenData, clip.x, clip.y, clip.width, clip.height);
    setImageDirty(screenData);
  }
  if (x === 0 && y === 0 && width === localW && height === localH) {
    screenData.printCursor.x = 0;
    screenData.printCursor.y = 0;
  }
}

// src/core/canvas-layout.js
function getCanvasContentRect(canvas) {
  const rect = canvas.getBoundingClientRect();
  const style = getComputedStyle(canvas);
  const left = parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
  const top = parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
  const right = parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight);
  const bottom = parseFloat(style.borderBottomWidth) + parseFloat(style.paddingBottom);
  let width = parseFloat(style.width);
  let height = parseFloat(style.height);
  if (style.boxSizing !== "border-box") {
    width += left + right;
    height += top + bottom;
  }
  let scaleX = 0;
  let scaleY = 0;
  if (width > 0 && height > 0) {
    scaleX = rect.width / width;
    scaleY = rect.height / height;
  }
  return {
    "cssWidth": Math.max(0, width - left - right),
    "cssHeight": Math.max(0, height - top - bottom),
    "left": rect.left + left * scaleX,
    "top": rect.top + top * scaleY,
    "width": Math.max(0, rect.width - (left + right) * scaleX),
    "height": Math.max(0, rect.height - (top + bottom) * scaleY)
  };
}

// src/core/screen-manager.js
var SCREEN_API_PROTO = { "screen": true, "id": 0 };
var m_screens = {};
var m_screenCanvasMap = /* @__PURE__ */ new Map();
var m_screenDataItems = {};
var m_screenDataItemGetters = [];
var m_screenDataInitFunctions = [];
var m_screenDataPreCleanupFunctions = [];
var m_screenDataCleanupFunctions = [];
var MAX_CANVAS_DIMENSION = 8192;
var m_observedContainers = /* @__PURE__ */ new Set();
var m_styleOwners = /* @__PURE__ */ new WeakMap();
var m_nextScreenId = 0;
var m_activeScreenData = null;
var m_resizeObserver = null;
var m_offscreenCanvas = null;
function init14(api) {
  m_resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const container = entry.target;
      const ownScreen = m_screenCanvasMap.get(container);
      if (ownScreen?.noCss && m_screens[ownScreen.id]) {
        resizeScreen2(ownScreen, false);
      }
      const canvases = container.querySelectorAll("canvas[data-screen-id]");
      if (canvases.length === 0) {
        continue;
      }
      for (const canvas of canvases) {
        const screenId = parseInt(canvas.dataset.screenId, 10);
        const screenData = m_screens[screenId];
        if (screenData) {
          resizeScreen2(screenData, false);
        }
      }
    }
  });
  registerCommands7();
  api.removeScreen = (...args) => {
    let screen2 = parseOptions(args, ["screen"]).screen;
    if (screen2 !== null && Object.getPrototypeOf(screen2) === SCREEN_API_PROTO) {
      screen2 = screen2.id;
    }
    return removeScreen(getScreenData("removeScreen", screen2));
  };
  addScreenInitFunction((screenData) => {
    screenData.api.removeScreen = () => removeScreen(screenData);
  });
}
function registerCommands7() {
  addCommand(
    "screen",
    screen,
    false,
    ["aspect", "container", "isOffscreen", "resizeCallback", "parent", "noCss"]
  );
  addCommand("setScreen", setScreen, false, ["screen"]);
  addCommand("getScreen", getScreen, false, ["screenId"]);
  addCommand("getAllScreens", getAllScreens, false, []);
  addCommand("removeAllScreens", removeAllScreens, false, []);
  addCommand("width", widthCmd, true, []);
  addCommand("height", heightCmd, true, []);
  addCommand("canvas", canvasCmd, true, []);
}
function addScreenDataItem(name, val) {
  m_screenDataItems[name] = val;
}
function addScreenDataItemGetter(name, fn) {
  m_screenDataItemGetters.push({ "name": name, "fn": fn });
}
function addScreenInitFunction(fn) {
  m_screenDataInitFunctions.push(fn);
}
function addScreenPreCleanupFunction(fn) {
  m_screenDataPreCleanupFunctions.push(fn);
}
function addScreenCleanupFunction(fn) {
  m_screenDataCleanupFunctions.push(fn);
}
function installScreenExtensions(screens, extensions) {
  const undo = [];
  const record = (target, name) => {
    undo.push({
      "target": target,
      "name": name,
      "hadValue": Object.prototype.hasOwnProperty.call(target, name),
      "value": target[name]
    });
  };
  try {
    for (const screenData of screens) {
      if (screenData.isRemoved) {
        continue;
      }
      for (const item of extensions.dataItems) {
        record(screenData, item.name);
        screenData[item.name] = structuredClone(item.value);
      }
      for (const itemGetter of extensions.dataItemGetters) {
        record(screenData, itemGetter.name);
        screenData[itemGetter.name] = structuredClone(itemGetter.fn());
      }
      for (const command of extensions.commands) {
        if (command.isScreen) {
          record(screenData.api, command.name);
        }
      }
      processScreenCommands(screenData, extensions.commands);
      for (const fn of extensions.initFunctions) {
        fn(screenData);
      }
    }
  } catch (error) {
    for (const entry of undo.reverse()) {
      if (entry.hadValue) {
        entry.target[entry.name] = entry.value;
      } else {
        delete entry.target[entry.name];
      }
    }
    throw error;
  }
}
function getActiveScreen(fnName, isScreenOptional) {
  if (m_activeScreenData === null && !isScreenOptional) {
    throwError(
      Error,
      fnName + ": You are attempting to call a method that requires a screen but there is currently no active screen. Call $.screen() before calling any graphics commands.",
      "NO_ACTIVE_SCREEN"
    );
  }
  return m_activeScreenData;
}
function assertScreenAvailable(screenData) {
  if (screenData.isRemoved) {
    throwError(
      Error,
      `Cannot complete deferred work on removed screen (id: ${screenData.id}).`,
      "SCREEN_REMOVED"
    );
  }
}
function releaseOffscreenCanvas(canvas) {
  if (m_offscreenCanvas === canvas) {
    m_offscreenCanvas = null;
  }
}
function getScreenData(fnName, screenId) {
  if (!m_screens[screenId]) {
    throwError(Error, `${fnName}: Invalid screen id.`, "INVALID_SCREEN_ID");
  }
  return m_screens[screenId];
}
function getAllScreensData() {
  const screens = [];
  for (const id in m_screens) {
    screens.push(m_screens[id]);
  }
  return screens;
}
function screen(options) {
  if (options.noCss != null && typeof options.noCss !== "boolean") {
    throwError(
      TypeError,
      "screen: Parameter noCss must be a boolean.",
      "INVALID_PARAMETER"
    );
  }
  if (options.resizeCallback != null && !isFunction(options.resizeCallback)) {
    throwError(
      TypeError,
      "screen: Parameter resizeCallback must be a function.",
      "INVALID_CALLBACK"
    );
  }
  let parentData = null;
  let parentScreenId = null;
  let parentRenderContext = null;
  if (options.parent != null) {
    if (!options.isOffscreen) {
      throwError(
        TypeError,
        "screen: Parameter parent can only be used with an offscreen screen.",
        "INVALID_SCREEN_PARENT"
      );
    }
    if ((typeof options.parent === "string" || typeof options.parent === "number") && m_screens[options.parent]) {
      parentData = m_screens[options.parent];
    } else if (typeof options.parent !== "object" || Object.getPrototypeOf(options.parent) !== SCREEN_API_PROTO || !m_screens[options.parent.id] || m_screens[options.parent.id].api !== options.parent) {
      throwError(
        TypeError,
        "screen: Parameter parent must be an existing screen.",
        "INVALID_SCREEN_PARENT"
      );
    } else {
      parentData = m_screens[options.parent.id];
    }
    parentScreenId = parentData.id;
    parentRenderContext = parentData.gl;
  }
  if (typeof options.aspect !== "string" || options.aspect === "") {
    throwError(
      Error,
      "screen: Parameter aspect must be a non-empty string.",
      "INVALID_ASPECT"
    );
  }
  const screenData = {
    "id": m_nextScreenId,
    "isRemoved": false,
    "isOffscreen": !!options.isOffscreen,
    "noCss": options.noCss === true,
    "styleChanges": [],
    "resizeCallback": options.resizeCallback,
    "api": Object.create(SCREEN_API_PROTO),
    "canvas": null,
    "width": null,
    "height": null,
    "container": null,
    "aspectData": null,
    "clientRect": null,
    "previousOffsetSize": null,
    "parentScreenId": parentScreenId,
    "parentRenderContext": parentRenderContext
  };
  screenData.api.id = screenData.id;
  const previousActive = m_activeScreenData;
  m_nextScreenId += 1;
  try {
    Object.assign(screenData, structuredClone(m_screenDataItems));
    for (const itemGetter of m_screenDataItemGetters) {
      screenData[itemGetter.name] = structuredClone(itemGetter.fn());
    }
    screenData.aspectData = parseAspect(options.aspect.toLowerCase());
    if (!screenData.aspectData) {
      throwError(
        Error,
        "screen: Parameter aspect is not valid.",
        "INVALID_ASPECT"
      );
    }
    validateDimensions(screenData.aspectData.width, screenData.aspectData.height);
    if (screenData.isOffscreen) {
      if (!m_offscreenCanvas) {
        m_offscreenCanvas = document.createElement("canvas");
      }
      screenData.canvas = {
        "isMock": true,
        "canvas": m_offscreenCanvas,
        "dataset": { "screenId": screenData.id },
        "width": screenData.aspectData.width,
        "height": screenData.aspectData.height,
        "style": {}
      };
      if (screenData.aspectData.splitter !== "x") {
        throwError(
          Error,
          "screen: You must use aspect ratio with e(x)act pixel dimensions for offscreen screens. For example: 320x200 for width of 320 and height of 200 pixels.",
          "INVALID_OFFSCREEN_ASPECT"
        );
      }
      setupOffscreenCanvasOptions(screenData);
      screenData.width = screenData.aspectData.width;
      screenData.height = screenData.aspectData.height;
    } else {
      screenData.canvas = document.createElement("canvas");
      screenData.canvas.dataset.screenId = screenData.id;
      screenData.canvas.tabIndex = 0;
      if (typeof options.container === "string") {
        screenData.container = document.getElementById(options.container);
      } else if (!options.container) {
        screenData.container = document.body;
      } else {
        screenData.container = options.container;
      }
      if (!isDomElement(screenData.container)) {
        throwError(
          TypeError,
          "screen: Invalid argument container. Container must be a DOM element or a string id of a DOM element.",
          "INVALID_CONTAINER"
        );
      }
      if (!screenData.noCss) {
        setDefaultCanvasOptions(screenData);
      }
      screenData.container.appendChild(screenData.canvas);
      if (screenData.noCss) {
        m_resizeObserver.observe(screenData.canvas);
      }
      if (m_resizeObserver && screenData.container && !m_observedContainers.has(screenData.container)) {
        m_resizeObserver.observe(screenData.container);
        m_observedContainers.add(screenData.container);
      }
    }
    m_screenCanvasMap.set(screenData.canvas, screenData);
    if (!screenData.isOffscreen) {
      if (screenData.noCss) {
        screenData.width = screenData.aspectData.width;
        screenData.height = screenData.aspectData.height;
        screenData.canvas.width = screenData.width;
        screenData.canvas.height = screenData.height;
      }
      resizeScreen2(screenData, true);
    }
    m_activeScreenData = screenData;
    m_screens[screenData.id] = screenData;
    createContext(screenData);
    for (const fn of m_screenDataInitFunctions) {
      fn(screenData);
    }
    screenData.styleChanges = null;
    return screenData.api;
  } catch (error) {
    rollbackScreen(screenData, previousActive);
    throw error;
  }
}
function writeAutomaticStyle(screenData, element, property, value) {
  let properties = [property.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase())];
  if (property === "margin" || property === "padding") {
    properties = ["top", "right", "bottom", "left"].map((side) => property + "-" + side);
  }
  let owners = m_styleOwners.get(element);
  if (!owners) {
    owners = /* @__PURE__ */ new Map();
    m_styleOwners.set(element, owners);
  }
  for (const name of properties) {
    const change = {
      "element": element,
      "name": name,
      "value": element.style.getPropertyValue(name),
      "priority": element.style.getPropertyPriority(name),
      "owner": owners.get(name),
      "hadStyle": element.hasAttribute("style")
    };
    element.style.setProperty(name, value);
    change.written = element.style.getPropertyValue(name);
    owners.set(name, screenData.id);
    screenData.styleChanges?.push(change);
  }
}
function rollbackScreen(screenData, previousActive) {
  screenData.isRemoved = true;
  screenData.isRenderScheduled = false;
  try {
    flushScreenTextureUsers(screenData);
  } catch (error) {
  }
  for (const fn of m_screenDataPreCleanupFunctions) {
    try {
      fn(screenData);
    } catch (error) {
    }
  }
  for (const fn of m_screenDataCleanupFunctions) {
    try {
      fn(screenData);
    } catch (error) {
    }
  }
  m_screenCanvasMap.delete(screenData.canvas);
  delete m_screens[screenData.id];
  if (screenData.canvas?.parentElement) {
    screenData.canvas.remove();
  }
  if (screenData.noCss && !screenData.isOffscreen && screenData.canvas) {
    m_resizeObserver.unobserve(screenData.canvas);
  }
  if (screenData.container && !Object.values(m_screens).some(
    (other) => other.container === screenData.container
  )) {
    m_resizeObserver.unobserve(screenData.container);
    m_observedContainers.delete(screenData.container);
  }
  for (const change of screenData.styleChanges.reverse()) {
    const { "element": element, "name": name } = change;
    const owners = m_styleOwners.get(element);
    if (owners.get(name) === screenData.id && element.style.getPropertyValue(name) === change.written) {
      if (change.value) {
        element.style.setProperty(name, change.value, change.priority);
      } else {
        element.style.removeProperty(name);
      }
      owners.set(name, change.owner);
      if (!change.hadStyle && element.style.length === 0) {
        element.removeAttribute("style");
      }
    }
  }
  screenData.styleChanges = null;
  activateScreen(previousActive);
}
function parseAspect(aspect) {
  const match = aspect.replaceAll(" ", "").match(/^(\d+)(x|e|m)(\d+)$/);
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
    "isFixedSize": splitter !== "e"
  };
}
function setupOffscreenCanvasOptions(screenData) {
  screenData.canvas.width = screenData.aspectData.width;
  screenData.canvas.height = screenData.aspectData.height;
  screenData.container = null;
  screenData.isOffscreen = true;
  screenData.resizeCallback = null;
  screenData.previousOffsetSize = null;
}
function setDefaultCanvasOptions(screenData) {
  writeAutomaticStyle(screenData, screenData.canvas, "outline", "none");
  writeAutomaticStyle(screenData, screenData.canvas, "backgroundColor", "black");
  writeAutomaticStyle(screenData, screenData.canvas, "position", "absolute");
  writeAutomaticStyle(screenData, screenData.canvas, "imageRendering", "pixelated");
  if (screenData.container === document.body) {
    writeAutomaticStyle(screenData, document.documentElement, "height", "100%");
    writeAutomaticStyle(screenData, document.documentElement, "margin", "0");
    writeAutomaticStyle(screenData, document.documentElement, "padding", "0");
    writeAutomaticStyle(screenData, document.body, "height", "100%");
    writeAutomaticStyle(screenData, document.body, "margin", "0");
    writeAutomaticStyle(screenData, document.body, "padding", "0");
    writeAutomaticStyle(screenData, screenData.canvas, "left", "0");
    writeAutomaticStyle(screenData, screenData.canvas, "top", "0");
  }
  writeAutomaticStyle(screenData, screenData.container, "overflow", "hidden");
  if (screenData.container.offsetHeight === 0) {
    writeAutomaticStyle(screenData, screenData.container, "height", "200px");
  }
}
function validateDimensions(width, height) {
  if (width <= 0 || height <= 0) {
    throwError(
      Error,
      "screen: Canvas dimensions must be positive.",
      "INVALID_DIMENSIONS"
    );
  }
  if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
    throwError(
      Error,
      `screen: Canvas dimensions exceed maximum of ${MAX_CANVAS_DIMENSION}px.`,
      "DIMENSION_TOO_LARGE"
    );
  }
}
function removeAllScreens() {
  const allScreenDatas = getAllScreensData();
  for (const screenData of allScreenDatas) {
    removeScreen(screenData);
  }
}
function removeScreen(screenData) {
  screenData.isRemoved = true;
  const screenId = screenData.id;
  flushScreenTextureUsers(screenData);
  for (const fn of m_screenDataPreCleanupFunctions) {
    fn(screenData);
  }
  for (const fn of m_screenDataCleanupFunctions) {
    fn(screenData);
  }
  for (const key in screenData.api) {
    if (typeof screenData.api[key] === "function") {
      screenData.api[key] = () => {
        throwError(
          TypeError,
          `Cannot call ${key}() on removed screen (id: ${screenId}). The screen has been removed from the page.`,
          "DELETED_METHOD"
        );
      };
    }
  }
  m_screenCanvasMap.delete(screenData.canvas);
  if (screenData.noCss && !screenData.isOffscreen) {
    m_resizeObserver.unobserve(screenData.canvas);
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
  screenData.parentScreenId = null;
  screenData.parentRenderContext = null;
  for (const i in m_screenDataItems) {
    screenData[i] = null;
  }
  for (const getter of m_screenDataItemGetters) {
    screenData[getter.name] = null;
  }
  if (screenData === m_activeScreenData) {
    let nextScreen = null;
    for (const i in m_screens) {
      if (m_screens[i] !== screenData) {
        nextScreen = m_screens[i];
        break;
      }
    }
    activateScreen(nextScreen);
  }
  delete m_screens[screenId];
}
function activateScreen(screenData) {
  m_activeScreenData = screenData;
  buildApi(screenData);
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
    throwError(Error, "screen: Invalid screen.", "INVALID_SCREEN");
  }
  activateScreen(m_screens[screenId]);
}
function getScreen(options) {
  const screenId = getInt(options.screenId, null);
  if (screenId === null || screenId < 0) {
    throwError(Error, "screen: Invalid screen id.", "INVALID_SCREEN_ID");
  }
  const screen2 = m_screens[screenId];
  if (!screen2) {
    throwError(Error, `screen: Screen "${screenId}" not found.`, "SCREEN_NOT_FOUND");
  }
  return screen2.api;
}
function getAllScreens() {
  const screens = [];
  for (const id in m_screens) {
    screens.push(m_screens[id].api);
  }
  return screens;
}
function widthCmd(screenData) {
  return screenData.view.width;
}
function heightCmd(screenData) {
  return screenData.view.height;
}
function canvasCmd(screenData) {
  if (screenData.isOffscreen) {
    console.warn(
      "Offscreen screens use a shared canvas that draws to textures to simulate an offscreen canvas. The canvas returned is that shared canvas. Proceed with caution changes to this canvas could cause unexpected results."
    );
    return screenData.canvas.canvas;
  }
  return screenData.canvas;
}
function canSizeAndPresent(screenData) {
  if (screenData.isOffscreen) {
    return false;
  }
  if (!screenData.canvas || !screenData.noCss && screenData.canvas.offsetParent === null) {
    return false;
  }
  return true;
}
function presentCurrentScreen(screenData) {
  if (!canSizeAndPresent(screenData)) {
    return;
  }
  flushBatches(screenData);
  displayToCanvas(screenData);
}
function refreshScreenSize(screenData, forcePresent) {
  if (forcePresent == null) {
    forcePresent = false;
  }
  if (!canSizeAndPresent(screenData)) {
    return;
  }
  const flags = applyScreenSizing(screenData);
  applyResizeConsequences(screenData, flags, forcePresent);
}
function resizeOffscreenScreen(screenData, width, height) {
  if (!screenData || !screenData.isOffscreen) {
    throwError(
      TypeError,
      "resizeOffscreenScreen: Screen must be offscreen.",
      "INVALID_OFFSCREEN_SCREEN"
    );
  }
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throwError(
      TypeError,
      "resizeOffscreenScreen: Width and height must be integers.",
      "INVALID_SCREEN_DIMENSIONS"
    );
  }
  validateDimensions(width, height);
  if (screenData.width === width && screenData.height === height) {
    return;
  }
  flushScreenTextureUsers(screenData);
  const oldWidth = screenData.width;
  const oldHeight = screenData.height;
  screenData.width = width;
  screenData.height = height;
  screenData.canvas.width = width;
  screenData.canvas.height = height;
  screenData.aspectData.width = width;
  screenData.aspectData.height = height;
  resizeScreen(screenData, oldWidth, oldHeight);
  onScreenResize(screenData);
}
function flushScreenTextureUsers(sourceData) {
  if (!sourceData.fboTexture) {
    return;
  }
  for (const screenData of getAllScreensData()) {
    if (screenData !== sourceData) {
      deleteWebGL2Texture(screenData, sourceData.canvas);
    }
    if (screenData !== sourceData && screenData.gl === sourceData.gl && screenData.batchInfo?.textureBatchSet.has(sourceData.fboTexture)) {
      flushBatches(screenData);
    }
  }
}
function resizeScreen2(screenData, isInit) {
  if (!canSizeAndPresent(screenData)) {
    return;
  }
  const flags = applyScreenSizing(screenData);
  if (!isInit) {
    applyResizeConsequences(screenData, flags, false);
  }
}
function applyScreenSizing(screenData) {
  const fromSize = screenData.previousOffsetSize;
  const size = getSize(screenData.container);
  const flags = setCanvasSize(screenData, size.width, size.height);
  screenData.clientRect = screenData.canvas.getBoundingClientRect();
  const toSize = {
    "width": screenData.canvas.offsetWidth,
    "height": screenData.canvas.offsetHeight
  };
  screenData.previousOffsetSize = toSize;
  return {
    "logicalChanged": flags.logicalChanged,
    "backingChanged": flags.backingChanged,
    "oldWidth": flags.oldWidth,
    "oldHeight": flags.oldHeight,
    "fromSize": fromSize,
    "toSize": toSize
  };
}
function applyResizeConsequences(screenData, flags, forcePresent) {
  if (flags.logicalChanged) {
    flushScreenTextureUsers(screenData);
    resizeScreen(screenData, flags.oldWidth, flags.oldHeight);
    onScreenResize(screenData);
  }
  let callbackRan = false;
  const fromSize = flags.fromSize;
  const toSize = flags.toSize;
  if (screenData.resizeCallback && fromSize !== null && (fromSize.width !== toSize.width || fromSize.height !== toSize.height)) {
    screenData.resizeCallback(screenData.api, fromSize, toSize);
    callbackRan = true;
  }
  if (callbackRan) {
    flushBatches(screenData);
  }
  if (flags.logicalChanged || flags.backingChanged || forcePresent || callbackRan) {
    displayToCanvas(screenData);
  }
}
function setCanvasSize(screenData, maxWidth, maxHeight) {
  const aspectData = screenData.aspectData;
  const canvas = screenData.canvas;
  let width = aspectData.width;
  let height = aspectData.height;
  const splitter = aspectData.splitter;
  let newCssWidth, newCssHeight;
  const oldWidth = screenData.width;
  const oldHeight = screenData.height;
  const oldBackingWidth = canvas.width;
  const oldBackingHeight = canvas.height;
  if (screenData.noCss) {
    const bounds = getCanvasContentRect(canvas);
    if (!(maxWidth > 0 && maxHeight > 0 && bounds.width > 0 && bounds.height > 0)) {
      return {
        "logicalChanged": false,
        "backingChanged": false,
        "oldWidth": oldWidth,
        "oldHeight": oldHeight
      };
    }
  }
  if (splitter === "m" || splitter === "e") {
    const factorX = Math.floor(maxWidth / width);
    const factorY = Math.floor(maxHeight / height);
    let factor;
    if (factorX > factorY) {
      factor = factorY;
    } else {
      factor = factorX;
    }
    if (factor < 1) {
      factor = 1;
    }
    newCssWidth = width * factor;
    newCssHeight = height * factor;
    if (splitter === "e") {
      width = Math.floor(maxWidth / factor);
      height = Math.floor(maxHeight / factor);
      newCssWidth = width * factor;
      newCssHeight = height * factor;
    }
  } else {
    const ratio1 = height / width;
    const ratio2 = width / height;
    newCssWidth = maxHeight * ratio2;
    newCssHeight = maxWidth * ratio1;
    if (newCssWidth > maxWidth) {
      newCssWidth = maxWidth;
      newCssHeight = newCssWidth * ratio1;
    } else {
      newCssHeight = maxHeight;
    }
  }
  const logicalChanged = oldWidth !== width || oldHeight !== height;
  screenData.width = width;
  screenData.height = height;
  if (!screenData.noCss) {
    canvas.style.width = Math.floor(newCssWidth) + "px";
    canvas.style.height = Math.floor(newCssHeight) + "px";
    canvas.style.marginLeft = Math.floor((maxWidth - newCssWidth) / 2) + "px";
    canvas.style.marginTop = Math.floor((maxHeight - newCssHeight) / 2) + "px";
  }
  let desiredBackingWidth;
  let desiredBackingHeight;
  if (screenData.renderToDisplaySize) {
    if (screenData.noCss) {
      const bounds = getCanvasContentRect(canvas);
      newCssWidth = Math.max(1, bounds.cssWidth);
      newCssHeight = Math.max(1, bounds.cssHeight);
    }
    desiredBackingWidth = Math.min(
      Math.floor(newCssWidth),
      MAX_CANVAS_DIMENSION
    );
    desiredBackingHeight = Math.min(
      Math.floor(newCssHeight),
      MAX_CANVAS_DIMENSION
    );
  } else {
    desiredBackingWidth = Math.min(width, MAX_CANVAS_DIMENSION);
    desiredBackingHeight = Math.min(height, MAX_CANVAS_DIMENSION);
  }
  const backingChanged = oldBackingWidth !== desiredBackingWidth || oldBackingHeight !== desiredBackingHeight;
  if (canvas.width !== desiredBackingWidth) {
    canvas.width = desiredBackingWidth;
  }
  if (canvas.height !== desiredBackingHeight) {
    canvas.height = desiredBackingHeight;
  }
  return {
    "logicalChanged": logicalChanged,
    "backingChanged": backingChanged,
    "oldWidth": oldWidth,
    "oldHeight": oldHeight
  };
}
function getSize(element) {
  return {
    "width": element.offsetWidth || element.clientWidth || element.width,
    "height": element.offsetHeight || element.clientHeight || element.height
  };
}

// src/core/commands.js
var m_settings = /* @__PURE__ */ Object.create(null);
var m_commands = [];
var m_api2 = null;
var m_readyCallbacks = [];
var m_isDocumentReady = false;
var m_waitCount = 0;
var m_checkReadyTimeout = null;
function init15(api) {
  m_api2 = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onDocumentReady);
    } else {
      m_isDocumentReady = true;
    }
  } else {
    m_isDocumentReady = true;
  }
  registerCommands8();
  addScreenInitFunction(processScreenCommands);
}
function registerCommands8() {
  addCommand("ready", ready, false, ["callback"]);
  addCommand("set", set, true, ["options"], true);
}
function addCommand(name, fn, isScreen, parameterNames, isScreenOptional) {
  const command = {
    "name": name,
    "fn": fn,
    "isScreen": isScreen,
    "parameterNames": parameterNames,
    "isScreenOptional": isScreenOptional
  };
  m_commands.push(command);
  if (name.startsWith("set") && name !== "set") {
    const settingName = name.substring(3, 4).toLowerCase() + name.substring(4);
    m_settings[settingName] = {
      "fn": fn,
      "isScreen": isScreen,
      "parameterNames": parameterNames,
      "isScreenOptional": isScreenOptional === true,
      "isProcessed": false
    };
  }
  return command;
}
function processCommands(api, commands = m_commands) {
  for (const command of commands) {
    if (!command.isProcessed) {
      processCommand(api, command);
    }
  }
}
function processCommand(api, command) {
  const {
    "name": name,
    "fn": fn,
    "isScreen": isScreen,
    "parameterNames": parameterNames,
    "isScreenOptional": isScreenOptional
  } = command;
  if (isScreen) {
    api[name] = (...args) => {
      const options = parseOptions(args, parameterNames);
      const screenData = getActiveScreen(name, isScreenOptional);
      return fn(screenData, options);
    };
  } else {
    api[name] = (...args) => {
      const options = parseOptions(args, parameterNames);
      return fn(options);
    };
  }
}
function processScreenCommands(screenData, commands = m_commands) {
  for (const command of commands) {
    const {
      "name": name,
      "fn": fn,
      "isScreen": isScreen,
      "parameterNames": parameterNames
    } = command;
    if (isScreen) {
      screenData.api[name] = (...args) => {
        const options = parseOptions(args, parameterNames);
        return fn(screenData, options);
      };
    }
  }
}
function ready(options) {
  const callback = options.callback;
  if (callback != null && !isFunction(callback)) {
    throwError(
      TypeError,
      "ready: Parameter callback must be a function.",
      "INVALID_CALLBACK"
    );
  }
  return new Promise((resolve, reject) => {
    m_readyCallbacks.push({
      "callback": callback,
      "resolve": resolve,
      "reject": reject,
      "triggered": false
    });
    scheduleReadyCheck();
  });
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
    try {
      if (item.callback) {
        item.callback();
      }
      item.resolve();
    } catch (error) {
      item.reject(error);
    }
  }
}
function set(screenData, options) {
  options = options.options;
  if (!isObjectLiteral(options)) {
    throwError(
      TypeError,
      "set: Parameter options must be an object.",
      "INVALID_OPTIONS"
    );
  }
  const optionNames = Object.keys(options);
  checkOptionNames(screenData, options, optionNames);
  for (const optionName of optionNames) {
    if (options[optionName] == null) {
      continue;
    }
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
function checkOptionNames(screenData, options, optionNames) {
  let hasScreen = screenData !== null;
  for (const optionName of optionNames) {
    const setting = m_settings[optionName];
    if (setting === void 0) {
      throwError(
        RangeError,
        `set: Option "${optionName}" is not a setting. Check its spelling, or load the plugin that provides it.`,
        "INVALID_OPTION"
      );
    }
    if (options[optionName] == null) {
      continue;
    }
    if (optionName === "screen") {
      hasScreen = true;
    } else if (setting.isScreen && !setting.isScreenOptional && !hasScreen) {
      getActiveScreen("set");
    }
  }
}

// src/core/plugins.js
var CLEAR_EVENTS_PARAMETERS = ["type"];
var m_plugins = [];
var m_isResolving = false;
var m_clearEventsHandlers = {};
var m_api3 = null;
function init16(api) {
  m_api3 = api;
  addCommand(
    "registerPlugin",
    registerPlugin,
    false,
    ["name", "init", "version", "description", "dependencies"]
  );
  addCommand(
    "getPlugins",
    getPlugins,
    false,
    []
  );
  addCommand(
    "clearEvents",
    (options) => clearEvents(null, options),
    false,
    CLEAR_EVENTS_PARAMETERS
  );
  addScreenInitFunction((screenData) => {
    screenData.api.clearEvents = (...args) => {
      const options = parseOptions(args, CLEAR_EVENTS_PARAMETERS);
      return clearEvents(screenData, options);
    };
  });
}
function registerPlugin(options) {
  if (!options.name || typeof options.name !== "string") {
    throwError(
      TypeError,
      "registerPlugin: Plugin must have a 'name' property.",
      "INVALID_PLUGIN_NAME"
    );
  }
  if (!options.init || typeof options.init !== "function") {
    throwError(
      TypeError,
      `registerPlugin: Plugin '${options.name}' must have an 'init' function.`,
      "INVALID_PLUGIN_INIT"
    );
  }
  const dependencies = options.dependencies ?? [];
  if (!Array.isArray(dependencies) || dependencies.some((name) => typeof name !== "string" || name.trim() === "")) {
    throwError(
      TypeError,
      "registerPlugin: dependencies must be an array of nonempty strings.",
      "INVALID_PLUGIN_DEPENDENCIES"
    );
  }
  options = { ...options, "dependencies": dependencies.slice() };
  const existingIndex = m_plugins.findIndex((p) => p.name === options.name);
  if (existingIndex !== -1) {
    if (m_plugins[existingIndex].state !== "failed") {
      throwError(
        Error,
        `registerPlugin: Plugin '${options.name}' is already registered.`,
        "DUPLICATE_PLUGIN"
      );
    }
    m_plugins.splice(existingIndex, 1);
  }
  const pluginInfo = {
    "name": options.name,
    "version": options.version || "unknown",
    "description": options.description || "",
    "config": options,
    "initialized": false,
    "state": "pending"
  };
  m_plugins.push(pluginInfo);
  let ownError = null;
  for (const failure of resolveDependencies()) {
    if (failure.plugin === pluginInfo) {
      ownError = failure.error;
    } else {
      console.error(failure.error.message);
    }
  }
  if (ownError) {
    throw ownError;
  }
}
function resolveDependencies() {
  if (m_isResolving) {
    return [];
  }
  m_isResolving = true;
  const failures = [];
  try {
    let progress = true;
    while (progress) {
      progress = false;
      for (const plugin of m_plugins) {
        if (plugin.state !== "pending" || !plugin.config.dependencies.every(
          (name) => m_plugins.some((item) => item.name === name && item.initialized)
        )) {
          continue;
        }
        plugin.state = "initializing";
        try {
          initializePlugin(plugin);
          plugin.state = "initialized";
        } catch (error) {
          plugin.state = "failed";
          failures.push({ "plugin": plugin, "error": error });
        }
        progress = true;
      }
    }
  } finally {
    m_isResolving = false;
  }
  return failures;
}
function getPlugins() {
  return m_plugins.map((p) => {
    let state = p.state;
    if (state === "initializing") {
      state = "pending";
    }
    return {
      "name": p.name,
      "version": p.version,
      "description": p.description,
      "initialized": p.initialized,
      "state": state
    };
  });
}
function clearEvents(screenData, options) {
  const type = options?.type;
  if (type) {
    const lowerType = String(type).toLowerCase();
    const handler = m_clearEventsHandlers[lowerType];
    if (!handler) {
      const validTypes = Object.keys(m_clearEventsHandlers);
      let errorMessage = `clearEvents: Invalid type "${type}".`;
      if (validTypes.length > 0) {
        errorMessage += ` Valid types are: ${validTypes.join(", ")}.`;
      } else {
        errorMessage += " No event handlers are registered.";
      }
      throwError(Error, errorMessage, "INVALID_TYPE");
    }
    try {
      handler(screenData);
    } catch (error) {
      console.error(
        `clearEvents: Error calling clearEvents handler for type "${type}": ${error.message}`
      );
    }
  } else {
    for (const handlerName in m_clearEventsHandlers) {
      const handler = m_clearEventsHandlers[handlerName];
      try {
        handler(screenData);
      } catch (error) {
        console.error(
          `clearEvents: Error calling clearEvents handler for type "${handlerName}": ${error.message}`
        );
      }
    }
  }
}
function registerClearEvents(extensions, name, handler) {
  if (!name || typeof name !== "string") {
    throwError(
      TypeError,
      "registerClearEvents: name must be a non-empty string.",
      "INVALID_NAME"
    );
  }
  if (typeof handler !== "function") {
    throwError(
      TypeError,
      "registerClearEvents: handler must be a function.",
      "INVALID_HANDLER"
    );
  }
  const lowerName = name.toLowerCase();
  const isDuplicate = m_clearEventsHandlers[lowerName] || extensions.clearEvents.some((item) => item.name === lowerName);
  if (isDuplicate) {
    throwError(
      Error,
      `registerClearEvents: Handler with name "${name}" is already registered.`,
      "DUPLICATE_HANDLER"
    );
  }
  extensions.clearEvents.push({ "name": lowerName, "handler": handler });
}
function initializePlugin(pluginInfo) {
  if (pluginInfo.initialized) {
    return;
  }
  const extensions = {
    "commands": [],
    "dataItems": [],
    "dataItemGetters": [],
    "initFunctions": [],
    "preCleanupFunctions": [],
    "cleanupFunctions": [],
    "clearEvents": []
  };
  const session = { "isOpen": false, "hasService": false, "service": null };
  const register = (method, fn) => (...args) => {
    if (!session.isOpen) {
      throwError(
        Error,
        `${method}: Plugin '${pluginInfo.name}' can register only during init.`,
        "REGISTRATION_CLOSED"
      );
    }
    fn(...args);
  };
  const pluginApi = {
    "addCommand": register(
      "addCommand",
      (name, fn, isScreen, parameterNames, isScreenOptional) => {
        extensions.commands.push({
          "name": name,
          "fn": fn,
          "isScreen": isScreen,
          "parameterNames": parameterNames,
          "isScreenOptional": isScreenOptional
        });
      }
    ),
    "addScreenDataItem": register("addScreenDataItem", (name, value) => {
      extensions.dataItems.push({ "name": name, "value": value });
    }),
    "addScreenDataItemGetter": register("addScreenDataItemGetter", (name, fn) => {
      extensions.dataItemGetters.push({ "name": name, "fn": fn });
    }),
    "addScreenInitFunction": register("addScreenInitFunction", (fn) => {
      extensions.initFunctions.push(fn);
    }),
    "addScreenPreCleanupFunction": register("addScreenPreCleanupFunction", (fn) => {
      extensions.preCleanupFunctions.push(fn);
    }),
    "addScreenCleanupFunction": register("addScreenCleanupFunction", (fn) => {
      extensions.cleanupFunctions.push(fn);
    }),
    "getActiveScreen": getActiveScreen,
    "getScreenData": getScreenData,
    "getAllScreensData": getAllScreensData,
    "resizeOffscreenScreen": resizeOffscreenScreen,
    "getApi": () => m_api3,
    "utils": utils_exports,
    "wait": wait,
    "done": done,
    "registerClearEvents": register("registerClearEvents", (name, handler) => {
      registerClearEvents(extensions, name, handler);
    }),
    "provideService": (service) => provideService(session, service),
    "getService": (pluginName) => getService(pluginInfo, pluginName)
  };
  try {
    session.isOpen = true;
    try {
      pluginInfo.config.init(pluginApi);
    } finally {
      session.isOpen = false;
    }
    installScreenExtensions(
      getAllScreensData(),
      extensions
    );
  } catch (error) {
    const pluginError = new Error(
      `registerPlugin: Failed to initialize plugin '${pluginInfo.name}': ${error.message}`
    );
    pluginError.code = "PLUGIN_INIT_FAILED";
    pluginError.originalError = error;
    throw pluginError;
  }
  commitExtensions(extensions);
  if (session.hasService) {
    pluginInfo.service = session.service;
  }
  pluginInfo.initialized = true;
}
function commitExtensions(extensions) {
  const commands = extensions.commands.map((command) => addCommand(
    command.name,
    command.fn,
    command.isScreen,
    command.parameterNames,
    command.isScreenOptional
  ));
  for (const item of extensions.dataItems) {
    addScreenDataItem(item.name, item.value);
  }
  for (const item of extensions.dataItemGetters) {
    addScreenDataItemGetter(item.name, item.fn);
  }
  for (const fn of extensions.initFunctions) {
    addScreenInitFunction(fn);
  }
  for (const fn of extensions.preCleanupFunctions) {
    addScreenPreCleanupFunction(fn);
  }
  for (const fn of extensions.cleanupFunctions) {
    addScreenCleanupFunction(fn);
  }
  for (const item of extensions.clearEvents) {
    m_clearEventsHandlers[item.name] = item.handler;
  }
  processCommands(m_api3, commands);
}
function provideService(session, service) {
  if (!session.isOpen) {
    throwError(
      Error,
      "provideService: Services can only be provided during init.",
      "SERVICE_PROVIDE_CLOSED"
    );
  }
  if (service === null || typeof service !== "object") {
    throwError(
      TypeError,
      "provideService: service must be an object.",
      "INVALID_SERVICE"
    );
  }
  if (session.hasService) {
    throwError(
      Error,
      "provideService: This plugin has already provided a service.",
      "DUPLICATE_SERVICE"
    );
  }
  session.hasService = true;
  session.service = service;
}
function getService(pluginInfo, pluginName) {
  const provider = m_plugins.find((item) => item.name === pluginName);
  let reason = null;
  if (!pluginInfo.config.dependencies.includes(pluginName)) {
    reason = "is not a declared dependency";
  } else if (!provider || !provider.initialized) {
    reason = "is not initialized";
  } else if (!Object.prototype.hasOwnProperty.call(provider, "service")) {
    reason = "does not provide a service";
  }
  if (reason) {
    throwError(
      Error,
      `getService: Plugin '${pluginName}' ${reason} for plugin '${pluginInfo.name}'.`,
      "SERVICE_NOT_AVAILABLE"
    );
  }
  return provider.service;
}

// src/api/pixels.js
function init17(api) {
  registerCommands9();
  api.put = (data, x, y, include0) => {
    return putWrapper(getActiveScreen("put"), data, x, y, include0);
  };
  addScreenInitFunction((screenData) => {
    screenData.api.put = (data, x, y, include0) => {
      return putWrapper(screenData, data, x, y, include0);
    };
  });
}
function registerCommands9() {
  addCommand("getPixel", getPixel, true, ["x", "y", "asIndex"]);
  addCommand("getPixelAsync", getPixelAsync, true, ["x", "y", "asIndex"]);
  addCommand(
    "get",
    get,
    true,
    ["x", "y", "width", "height", "tolerance", "asIndex"]
  );
  addCommand(
    "getAsync",
    getAsync,
    true,
    ["x", "y", "width", "height", "tolerance", "asIndex"]
  );
  addCommand(
    "filterImg",
    filterImg,
    true,
    ["filter", "x1", "y1", "x2", "y2"]
  );
}
function getPixel(screenData, options) {
  const px = getInt(options.x, null);
  const py = getInt(options.y, null);
  if (px === null || py === null) {
    throwError(
      TypeError,
      "getPixel: Parameters x and y must be integers.",
      "INVALID_PARAMETER"
    );
  }
  const asIndex = options.asIndex ?? false;
  const colorValue = readViewPixel(screenData, px, py);
  if (asIndex) {
    return findColorIndexByColorValue(screenData, colorValue);
  }
  return colorValue;
}
function getPixelAsync(screenData, options) {
  const generation = getContextGeneration(screenData);
  const px = getInt(options.x, null);
  const py = getInt(options.y, null);
  if (px === null || py === null) {
    throwError(
      TypeError,
      "getPixelAsync: Parameters x and y must be integers.",
      "INVALID_PARAMETER"
    );
  }
  const asIndex = options.asIndex ?? false;
  const resolved = resolveViewPixel(screenData, px, py);
  if (resolved === null) {
    const empty = rgbToColor(0, 0, 0, 0);
    if (asIndex) {
      return Promise.resolve(findColorIndexByColorValue(screenData, empty));
    }
    return Promise.resolve(empty);
  }
  return readPixelAsync(screenData, resolved.x, resolved.y).then((colorValue) => {
    assertScreenAvailable(screenData);
    if (probeContextLoss(
      screenData
    ) || generation !== getContextGeneration(
      screenData
    )) {
      colorValue = rgbToColor(0, 0, 0, 0);
    }
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
  const tolerance = getFloat(options.tolerance, 1);
  const asIndex = options.asIndex ?? true;
  if (pX === null || pY === null || pWidth === null || pHeight === null) {
    throwError(
      TypeError,
      "get: Parameters x, y, width and height must be integers.",
      "INVALID_PARAMETER"
    );
  }
  if (pWidth <= 0 || pHeight <= 0) {
    return [];
  }
  const region = resolveViewReadRect(screenData, pX, pY, pWidth, pHeight);
  if (region === null) {
    return [];
  }
  const colors = readPixels(
    screenData,
    region.x,
    region.y,
    region.width,
    region.height
  );
  return convertColorsToIndices(screenData, colors, region.width, asIndex, tolerance);
}
function getAsync(screenData, options) {
  const generation = getContextGeneration(screenData);
  const pX = getInt(options.x, null);
  const pY = getInt(options.y, null);
  const pWidth = getInt(options.width, null);
  const pHeight = getInt(options.height, null);
  const tolerance = getFloat(options.tolerance, 1);
  const asIndex = options.asIndex ?? true;
  if (pX === null || pY === null || pWidth === null || pHeight === null) {
    throwError(
      TypeError,
      "getAsync: Parameters x, y, width and height must be integers.",
      "INVALID_PARAMETER"
    );
  }
  if (pWidth <= 0 || pHeight <= 0) {
    return Promise.resolve([]);
  }
  const region = resolveViewReadRect(screenData, pX, pY, pWidth, pHeight);
  if (region === null) {
    return Promise.resolve([]);
  }
  return readPixelsAsync(
    screenData,
    region.x,
    region.y,
    region.width,
    region.height
  ).then((colors) => {
    assertScreenAvailable(screenData);
    if (probeContextLoss(screenData) || generation !== getContextGeneration(screenData)) {
      colors = colors.map((row) => row.map(() => rgbToColor(0, 0, 0, 0)));
    }
    return convertColorsToIndices(screenData, colors, region.width, asIndex, tolerance);
  });
}
function convertColorsToIndices(screenData, colors, width, asIndex, tolerance) {
  if (!asIndex) {
    return colors;
  }
  const results = new Array(colors.length);
  for (let row = 0; row < colors.length; row++) {
    const resultsRow = new Array(width);
    let rowLength;
    if (colors[row]) {
      rowLength = colors[row].length;
    } else {
      rowLength = 0;
    }
    for (let col = 0; col < width; col++) {
      if (col < rowLength) {
        const colorValue = colors[row][col];
        const idx = findColorIndexByColorValue(
          screenData,
          colorValue,
          tolerance
        );
        if (idx === null) {
          resultsRow[col] = 0;
        } else {
          resultsRow[col] = idx;
        }
      } else {
        resultsRow[col] = 0;
      }
    }
    results[row] = resultsRow;
  }
  return results;
}
function filterImg(screenData, options) {
  const filter = options.filter;
  const viewSnap = snapshotView(screenData);
  const x1 = getInt(options.x1, 0);
  const y1 = getInt(options.y1, 0);
  const x2 = getInt(options.x2, viewSnap.width - 1);
  const y2 = getInt(options.y2, viewSnap.height - 1);
  if (!isFunction(filter)) {
    throwError(
      TypeError,
      "filterImg: Argument filter must be a callback function.",
      "INVALID_CALLBACK"
    );
  }
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2) + 1;
  const bottom = Math.max(y1, y2) + 1;
  const phys = intersectRects(
    left + viewSnap.originX,
    top + viewSnap.originY,
    right - left,
    bottom - top,
    viewSnap.clipX,
    viewSnap.clipY,
    viewSnap.clipWidth,
    viewSnap.clipHeight
  );
  if (phys.width <= 0 || phys.height <= 0) {
    return;
  }
  if (isContextUnavailable(screenData)) {
    return;
  }
  const generation = getContextGeneration(screenData);
  queueMicrotask(() => {
    if (screenData.isRemoved || isContextUnavailable(screenData) || generation !== getContextGeneration(screenData)) {
      return;
    }
    queueMicrotask(() => {
      if (generation === getContextGeneration(screenData)) {
        applyFilter(screenData, filter, phys.x, phys.y, phys.width, phys.height, viewSnap);
      }
    });
  });
}
function applyFilter(screenData, filter, x1, y1, width, height, viewSnap) {
  if (screenData.isRemoved || isContextUnavailable(screenData)) {
    return;
  }
  flushBatches(screenData);
  const imageData = readPixelsRaw(screenData, x1, y1, width, height);
  if (!imageData || isContextUnavailable(screenData)) {
    return;
  }
  unpremultiplyPixels(imageData);
  const screenHeight = screenData.height;
  const filteredData = new Uint8Array(width * height * 4);
  const pixelData = new Uint8ClampedArray(4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcRow = height - 1 - y;
      const srcIndex = (srcRow * width + x) * 4;
      pixelData[0] = imageData[srcIndex];
      pixelData[1] = imageData[srcIndex + 1];
      pixelData[2] = imageData[srcIndex + 2];
      pixelData[3] = imageData[srcIndex + 3];
      const dstIndex = (srcRow * width + x) * 4;
      const localX = x1 + x - viewSnap.originX;
      const localY = y1 + y - viewSnap.originY;
      const keep = filter(pixelData, localX, localY);
      if (screenData.isRemoved || isContextUnavailable(screenData)) {
        return;
      }
      if (keep) {
        filteredData[dstIndex] = pixelData[0];
        filteredData[dstIndex + 1] = pixelData[1];
        filteredData[dstIndex + 2] = pixelData[2];
        filteredData[dstIndex + 3] = pixelData[3];
      } else {
        filteredData[dstIndex] = 0;
        filteredData[dstIndex + 1] = 0;
        filteredData[dstIndex + 2] = 0;
        filteredData[dstIndex + 3] = 0;
      }
    }
  }
  if (screenData.isRemoved || isContextUnavailable(screenData)) {
    return;
  }
  const dstY = screenHeight - (y1 + height);
  updateWebGL2TextureSubImage(
    screenData,
    null,
    filteredData,
    width,
    height,
    x1,
    dstY
  );
  setImageDirty(screenData);
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
    throwError(
      TypeError,
      "put: Parameters x and y must be integers.",
      "INVALID_PARAMETER"
    );
  }
  const view = screenData.view;
  const clipLocalX = view.clipX - view.originX;
  const clipLocalY = view.clipY - view.originY;
  let sourceWidth = 0;
  if (pData[0]) {
    sourceWidth = pData[0].length;
  }
  const dest = intersectRects(
    pX,
    pY,
    sourceWidth,
    pData.length,
    clipLocalX,
    clipLocalY,
    view.clipWidth,
    view.clipHeight
  );
  const startX = dest.x - pX;
  const startY = dest.y - pY;
  const width = dest.width;
  const height = dest.height;
  if (width <= 0 || height <= 0) {
    return null;
  }
  put(screenData, pData, pX, pY, pInclude0, startY, startX, width, height);
  setImageDirty(screenData);
}
function put(screenData, data, x, y, include0, startY, startX, width, height) {
  if (isContextUnavailable(screenData)) {
    return;
  }
  const endY = startY + height;
  const endX = startX + width;
  const writePoint = createPointWriter(screenData, POINTS_REPLACE_BATCH);
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
      writePoint(sx, sy, colorValue);
    }
  }
}
function readViewPixel(screenData, x, y) {
  const resolved = resolveViewPixel(screenData, x, y);
  if (resolved === null) {
    return rgbToColor(0, 0, 0, 0);
  }
  return readPixel(screenData, resolved.x, resolved.y);
}
function resolveViewPixel(screenData, x, y) {
  const phys = toScreen(screenData, x, y);
  if (!isInsideClip(screenData.view, phys.x, phys.y)) {
    return null;
  }
  return phys;
}
function resolveViewReadRect(screenData, x, y, width, height) {
  const view = screenData.view;
  const phys = toScreen(screenData, x, y);
  const clip = intersectRects(
    phys.x,
    phys.y,
    width,
    height,
    view.clipX,
    view.clipY,
    view.clipWidth,
    view.clipHeight
  );
  if (clip.width <= 0 || clip.height <= 0) {
    return null;
  }
  return clip;
}

// src/api/paint.js
function init18(api) {
  registerCommands10();
}
function registerCommands10() {
  addCommand(
    "paint",
    paint,
    true,
    ["x", "y", "fillColor", "tolerance", "boundaryColor"]
  );
}
function paint(screenData, options) {
  const x = getInt(options.x, null);
  const y = getInt(options.y, null);
  let fillColor = options.fillColor;
  const tolerance = getFloat(options.tolerance, 0);
  let boundaryColor = options.boundaryColor;
  if (x === null || y === null) {
    throwError(
      TypeError,
      "paint: Parameters x and y must be integers",
      "INVALID_PARAMETER"
    );
  }
  if (tolerance < 0 || tolerance > 1) {
    throwError(
      RangeError,
      "paint: Parameter tolerance must be a number between 0 and 1 (0 = exact match, 1 = any color).",
      "INVALID_PARAMETER"
    );
  }
  fillColor = getColorValueByRawInput(screenData, fillColor);
  if (fillColor === null) {
    throwError(
      RangeError,
      "paint: Parameter fillColor is not a valid color format.",
      "INVALID_PARAMETER"
    );
  }
  const view = screenData.view;
  if (isContextUnavailable(screenData)) {
    return;
  }
  const clipX = view.clipX;
  const clipY = view.clipY;
  const clipW = view.clipWidth;
  const clipH = view.clipHeight;
  const originX = view.originX;
  const originY = view.originY;
  const startPhys = toScreen(screenData, x, y);
  if (!isInsideClip(view, startPhys.x, startPhys.y)) {
    return;
  }
  if (tolerance === 1) {
    drawRectFilled(screenData, 0, 0, view.width, view.height, fillColor);
    setImageDirty(screenData);
    return;
  }
  const pixels2D = readPixels(screenData, clipX, clipY, clipW, clipH);
  const startColor = pixels2D[startPhys.y - clipY][startPhys.x - clipX];
  if (startColor.key === fillColor.key) {
    return;
  }
  const weights = [0.2, 0.68, 0.07, 0.05];
  const maxDifference = 255 * 255 * weights.reduce((a, b) => a + b);
  const toleranceThreshold = (1 - tolerance * tolerance) * maxDifference;
  const visited = new Uint8Array(clipW * clipH);
  const queue = [];
  queue.push({ "x": startPhys.x, "y": startPhys.y });
  visited[(startPhys.y - clipY) * clipW + (startPhys.x - clipX)] = 1;
  let shouldSkipPixel;
  if (boundaryColor !== null) {
    boundaryColor = getColorValueByRawInput(screenData, boundaryColor);
    if (boundaryColor === null) {
      throwError(
        RangeError,
        "paint: Parameter boundaryColor is not a valid color format.",
        "INVALID_PARAMETER"
      );
    }
    shouldSkipPixel = (pixelColor) => {
      const difference = calcColorDifference(boundaryColor, pixelColor, weights);
      const similarity = maxDifference - difference;
      return similarity >= toleranceThreshold;
    };
  } else {
    shouldSkipPixel = (pixelColor) => {
      const difference = calcColorDifference(startColor, pixelColor, weights);
      const similarity = maxDifference - difference;
      return similarity < toleranceThreshold;
    };
  }
  const writePoint = createPointWriter(screenData, POINTS_BATCH);
  let head = 0;
  while (head < queue.length) {
    const pixel = queue[head++];
    const px = pixel.x;
    const py = pixel.y;
    const pixelColor = pixels2D[py - clipY][px - clipX];
    if (shouldSkipPixel(pixelColor)) {
      continue;
    }
    writePoint(px - originX, py - originY, fillColor);
    addToQueue(queue, visited, px + 1, py, clipX, clipY, clipW, clipH);
    addToQueue(queue, visited, px - 1, py, clipX, clipY, clipW, clipH);
    addToQueue(queue, visited, px, py + 1, clipX, clipY, clipW, clipH);
    addToQueue(queue, visited, px, py - 1, clipX, clipY, clipW, clipH);
  }
  setImageDirty(screenData);
}
function addToQueue(queue, visited, x, y, clipX, clipY, clipW, clipH) {
  if (x < clipX || x >= clipX + clipW || y < clipY || y >= clipY + clipH) {
    return;
  }
  const index = (y - clipY) * clipW + (x - clipX);
  if (visited[index] === 0) {
    visited[index] = 1;
    queue.push({ "x": x, "y": y });
  }
}

// src/api/draw.js
function init19(api) {
  addScreenDataItem("cursor", { "x": 0, "y": 0 });
  addScreenDataItem("angle", 0);
  registerCommands11();
}
function registerCommands11() {
  addCommand("draw", draw, true, ["drawString"]);
}
function draw(screenData, options) {
  let drawString = options.drawString;
  if (typeof drawString !== "string") {
    throwError(
      TypeError,
      "draw: Parameter drawString must be a string.",
      "INVALID_PARAMETER"
    );
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
          0,
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

// src/text/fonts/font-6x6.webp
var font_6x6_default = { "data": "data:image/webp;base64,UklGRuAEAABXRUJQVlA4WAoAAAAYAAAAfwEAFwAAVlA4TOIDAAAvf8EFEA8w//M///Mf8KA+///att3f5yf/Ev+S6VrZU68BnyPZKpNdZsuOvcQZyZdnw3If5U4eBgaKYzsqBVRmGjPzFhwzM9qb96jMTY6KEf2fAOAnvhkB6EYuZeurdtt9zA509iEUc6kOxgEwXD3+bR/W8TYwVTeUs+5uMgNLDClqPxTbXFDrSghGth+hs2sfAVVkQJ3uCW6SVCssJVtV4EzHl/NkzDUy/Xu/1EZxvsXW9s7DdeA0dwi0Vzfs0sSEbmWW8nZwkC84vEBG2JAu2NLfYA4MdF9wpmg/ob0SIIwNqYsVvzOMZCuMXt2ds81AuFOK2g8R8dwMtnV7y4kGQGvpBfMQZjBXzt/W4+BtElMleOX1X5IA5na+kLL1Vc88PeBKCDgyAxwuTnGZAgBXRm/JHXU2b0yOv8uVWfKesvbA/36SBq9CMEAhsMuRikLyFqXAkpiTiyVr1j6iOEzlKTHPwYWJWa4L5S+4EgL718c/Fjepuan32qJH9B1ZdiD3sZvzJw+vfSfrM5WnWLdAKdBbsC1bqUAzp0XFSPEu5SmTFoM3E+MKLKnN6Ykln1qXHBs0w3HRIzAKo6JwU3mtkvCZE6P8dboZPsuahSJq7srqLeOWOD9sf2f83XRSnDVpnn/8Qj7wabyoQlUOaOZ4Pw3XsnWa2Ost4s7gavfhwrlQAYBSADBsALArKR3o0sMepUVW0qSWb6tyfzt91z8+mpCSOR2ghMD6xcNCBBEipsCpGrpZoQqHWvTBy2OcGf+zpxse8cS4oJDI6gxKnlqlnvR+VE6+jDw4+iQSvXNbMiy9tCi9VIkuGbf+Ea7ju8IRfxfld1W25AEQbXL7I2/JLERYJCiksEsJCjQetQQaVD5eHrBeqX/59DXJgz4qR63/6szcBD5YpZ70jrzrQRYJftW8sOhw7Z5c14dxgQYX3vzXGOfxGc9+Vz/z71H5ctSiaEOQJ7B+8XxUHvsycnvZEcnV+eLkT5e1ZOa2ZJSPveN4YfrAZ749B4taenwWhQtLGKCe9LJQjEVigMQ4CQlNVImoyiI0Bo1xfUZjP3KkDHBnzqKXBAAWBg8YNlykeubDAyceHvhupDZ3hBa4SJtCHHhjvVi4Z7UPQUGkmhNLeHoxjRJQQITGOI1d5ItxZxIVNdbo+poJlR1NEs2O5zlJ7CZnBjIDrV9dLHDkOOse+KhpoKORfKJoyW7ZEm/Zk4siKFAKdEpiF4EhIVG9sP/PEw8PdN5M5t4UCxh9HY3ki3GaFZLWK9HOJZWBv+bSiAaM3/ThxTTkaaJKECIIxdhF2iSUyZJ7RgM6o4YNlBsP+AAARVhJRtgAAABJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAMQECABEAAABmAAAAaYcEAAEAAAB4AAAAAAAAAGAAAAABAAAAYAAAAAEAAABQYWludC5ORVQgNS4xLjEyAAAFAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAKgBAABAAAAgAEAAAOgBAABAAAAGAAAAAWgBAABAAAAugAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAA=" };

// src/text/fonts/font-6x8.js
var m_font6x8 = {
  "byteSize": 48,
  "byteBase": 36,
  "width": 6,
  "height": 8,
  "margin": 0,
  "str": "0,1blc8udu8u,1cbkhzwsm6,wpp1xfvgg,coebolreo,d5nukh2cc,coe2eccv0,65jplhc,2rrpnxyccf,0,0,azkg0jpqw,j5ihd7hxo,nly3soshc,nly42td40,13vtcwgg0,1f2tcd2lts,39po4vukg,d6e29q3uw,voa3n9udc,1dd8ay5r40,majymyen0,4r8g0,d6e2i2i4f,d6ebp7j7k,co4b4mebk,7307h2ww,78xcoo3k,80mu96o,g90j3o5c,74q25kao,1j83fxkao,0,d5xai464g,vo9y0dkao,voutnk5q8,d7qk1tfr4,18caako74,cyn4y7kow,co7x9kqgw,6fqb6k3k0,p51ihjmyo,hnt6v75s,3khmlszk,pow,8bnthc,pog,wl5log0,18hslmrwg0,d2kxm9lkw,18halx058g,18haltkhkw,6japxtny8,2pg5ex9zwg,j3ykqif40,2phicbtjpc,18hqina874,18hqj26t4w,74i0nugw,74i0nuhc,6fqfmdlog,ukzeakg,p51hxkg74,18hajmifpc,18hwjobyf4,cyzwjl3ls,2lzffaao74,j5phy2vpc,2lzfcieqdc,2p3nb23s74,2p3nb23lkw,j5phz0lfk,1huhdyxjsw,17ukqfasqo,lxadcq0ow,26fz67fm4g,2fp5guls3k,1ic4kdfc74,1i8m9a9g8w,18hqkb7shs,2lzff9z94w,18hqkb8hs3,2lzffb8jnk,18hpizqeio,2pokva2znk,1huh678wsg,1huh677nk0,1huh8gfaww,1hi03e73pc,1hua29iwow,2phicbv6v4,181pap4c1s,sa66nps0,17r0gae134,cyzw9tpmo,1r,co2068kjk,dtwj5q8,23860tetq8,e2shedc,9eixrx874,e2x5s74,j5hseuwhs,d3a881o,23881h7i4g,chbdmk9hc,34buepwv0,23870bnr7k,11m2zty1vk,pz8ndz4,m3d2d8g,e2ssmww,tqjd4qg,d3uih3i,qu79kao,f1qczy8,pcts9aups,h1ch2f4,h1cfgn4,h3ln400,gxcj3i8,h1cgbzw,um4hny8,9jvh9ef7k,co3z8madc,2311eu3da8,t4svfdzi8,7aoozlhc,18hpkro330,vkry6glc,ipvap80sg,18hleduav4,1h0inglklc,11faaz7pfk,chbclspz4,e28hnkc,18hnlvwutc,1h0kuyo4jk,11fciha9ds,1k4rjs1hj4,18hlfeludc,11fabzz8xs,1h7hguv81s,co0929o5c,9dlbfia9s,orcjkhs,mbrplsz28,cyj2ztqm8,ttkqcjcw,p4zq8wp34,cyj4nraww,p4zrwu9ds,ttme9pr0,1h7hgqgmww,1h0ntdz280,cof2w6djc,j5hsewhkw,1hikteekn4,2m32k36f3m,iyd2l9grc,ipt375gu8,ipt47x0cg,6fiigughs,3mhmfvgg,15lstet6kg,15gjbpd9xc,18jink6l1c,12b0vaw3k0,ch3jttxc0,hcdfk0,h7m8lc,tc5on8j33,tc4p4v62q,e18f6vi8,91vaa29s,zcpsr7r4,rdwjrp3dw,xrpq1jqei,2cwu2vechn,co41gj1fs,co41o0qh4,corq1de6g,fu5215hu2,9p8y2,row8vm0,fuso6leh6,fu51tnssq,ulsat8q,fuso76zgg,fu521r2tc,corq1cohs,8rcw8,co41hlnnk,co41p3cow,9uoso,co41hmdc8,9tz40,co41p42dk,co7hskgso,fu51ttf2i,fu5j1pts0,7gmtnka,fut5enfgg,v2zr98q,fu5j148sq,v30cu80,fut5e1uh6,cov45hcsg,fu521wp34,v30djwo,9uv7u,fu51uf01s,co7hsjr40,7gnfy88,2d66i,fu521xl6y,cov6detjc,co41o00sg,2czrc,2rrvthnxtr,9zldr,2gosa7pa2g,b33j9ynrb,2rrvt7ocg0,cnr79s0,p16ep15s,1iubfwjy8,rrfz0t4w,2phoaj5qbk,f408g74,g19nt3xc,mg0a7ocg,2ov1ky6o8u,j5q8b5xc0,j5pzx5vpc,m7xcjszuo,geqgaku8,1mantcco0,j3ykq5kw0,18hqkb7ssg,r6vxlclc,couodj5hc,ckirtofwg,cvghtiikg,9kr8exk3s,co41glw60,j00j709hc,mfz9m9s0,j5ifndeyo,3dqjuo,1vf9c,b0fboebd8,2g6yvj277k,12an04etc0,e13wsn4,0"
};
function getFontImage() {
  const charWidth = m_font6x8.width;
  const charHeight = m_font6x8.height;
  const margin = m_font6x8.margin;
  const cellWidth = m_font6x8.width + margin * 2;
  const cellHeight = m_font6x8.height + margin * 2;
  const width = cellWidth * 64;
  const height = cellHeight * 4;
  const chars = decompressFont(m_font6x8);
  m_font6x8.str = "";
  const data = new Uint8ClampedArray(width * height * 4);
  let x = margin;
  let y = margin;
  for (const char of chars) {
    for (let dataY = 0; dataY < charHeight; dataY += 1) {
      for (let dataX = 0; dataX < charWidth; dataX += 1) {
        const bit = char[dataY][dataX];
        if (bit === 1) {
          const i = (width * (y + dataY) + (x + dataX)) * 4;
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }
      }
    }
    x += cellWidth;
    if (x >= width) {
      x = margin;
      y += cellHeight;
    }
  }
  const imageData = new ImageData(data, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.putImageData(imageData, 0, 0);
  return canvas;
}
function decompressFont(fontData) {
  let numStr = fontData.str;
  const width = fontData.width;
  const height = fontData.height;
  const byteSize = fontData.byteSize;
  const byteBase = fontData.byteBase;
  let bin = "";
  const data = [];
  numStr = "" + numStr;
  const nums = numStr.split(",");
  for (let i2 = 0; i2 < nums.length; i2++) {
    let num = parseInt(nums[i2], byteBase).toString(2);
    while (num.length < byteSize) {
      num = "0" + num;
    }
    bin += num;
  }
  let i = 0;
  if (bin.length % byteSize > 0) {
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

// src/text/fonts/font-8x8.webp
var font_8x8_default = { "data": "data:image/webp;base64,UklGRpQFAABXRUJQVlA4WAoAAAAYAAAA/wEAHwAAVlA4TJcEAAAv/8EHEA8w//M///Mf8LCs/p8bSdK3EUTW4U+On/kPJf5af3Kx/CEmoYRi/Wmv3hYIop3I6vWmCol+jH6Ate/g25z6AQrWezfem6K0Rm2fIKL/CtO2YRQ6T2Ec0069wwzPtyenV858SMvpEarKMpKSUAcNAOx3YrbJdTYDJRiX56nuFv5Qbt74/OpSW359g7ZVFd6lM5ZS16cgUgSI/dq9rYK7iwjifP/XU1fX+nd4vpycts3RWH5dM44aQ1XaGUtT5XUVtBVAvy4xpqaK7iIha+TyPE1T116FnxW58fdp0vK7hKpOUzWPI0Iy3RJ0zmTkUOraY6PWQUVUfnq166apvQreyo2/N0dajtM46hhDVeYWYYqyxy0tHEiIU3TxCAEVrvy9rrtO/w6u67+1q0sjx/XYaqsyvWtWIDXFESkiSHVW3KO7uIpIFrg87+zUNTP4+MDZz5/5UFuOfVRVlhGS9Fs0gCBnupztO2ZiaxElCOMIXccMpqvqCigYM3eVwB0SADrJbTNNrdt3zj7Q93W2bNm9732yynYQVmyoWUlcrW+xs7TR1ZbeSkmf+ERxiSV8+2wqXvx9C30IWiMEIokAQW4hS6Kyt3PopSqPP165xBSmg754WYl7n/yDQTShFixa2KZ1LOKN7W33us697z2LCvWhd1Uxq7JEC9Nh33m3FveLtWlQ7SF23vkDvpWYZHIvvq3E/WLyJ1dsSId50b7u4ukTF7/eh720Efeplk+GqEBXKs/Bi0RbKibuU+0iKvSVl5I+EYqLl9L3KVhxcft2khL2FfDiXoWuiCe56N51Ib7XbUrdexbMc9tMDxy52dmp7+sHNmfNsvS9TfYhA7Z7trUH4lnzs9a7hfhAo1tJfcwbXTFxr5lZpgED4IHvsEwDAMZm9JUw+sq7VS8bjgwMrrrW3lza1EBua4GrVxU+9pNfq+oAw8AwKO5cBeEq0FMLJPeVr1zR5H4Mm01DSkDf601/6FPP3kGFtWZmrdm6XifyqQNA6+N7zNXWgKck4E4pi9YMNAfDdDA0uPt+jLEq7qLSW4iTmbl78eqB/JU2innz1FEdcj78tfrNhz717UXT/WF/f1DM81HXddWYs6hMbqfu7ktBeu3E3TNUVbz5tC5b0xxMzcFwME1No14Vd7dQVaLS53BLda2PZ/NL6uLue2PnVSyv3u496DAMgMbRTsZxjK2ZtdZ7Pv26mY1jVNMs/e5oNrqDgb+k8L/3HRgA1NwxDSjy5zW3y/O/AP7/vj1VFNVhYNF1gEFhUGXmgedngAzkut6wXxsS9JIKNTxva7gPLE9O2UpKQgyeReRYZZsgJr3V68PTJ8/NT8/PzcPM8PrrDPMttu4pjGXP+l7HsXKyhmNlb0Ha2zQREGDR9HZtr6mS7Bb1qe9+/etm0VQztRJTaHl9nl+f59efPnl6fu7p+bl5nueT118/mefm9Xl+4Hke8SqF3aLeJ//1rytHgqqyRfWpZC2gi8bAMDCALv6Dogt7TZV8t1NLyccxeAZ0V/aABPfDtqpSXgeV+ttGqJ2cs+4KLD/3ARVARQaoAEDXAGwAAABFWElG1gAAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAAxAQIAEAAAAGYAAABphwQAAQAAAHYAAAAAAAAAYAAAAAEAAABgAAAAAQAAAFBhaW50Lk5FVCA1LjEuOQAFAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAKgBAABAAAAAAIAAAOgBAABAAAAIAAAAAWgBAABAAAAuAAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAA=" };

// src/text/fonts/font-8x14.webp
var font_8x14_default = { "data": "data:image/webp;base64,UklGRpYGAABXRUJQVlA4WAoAAAAYAAAA/wEANwAAVlA4TJoFAAAv/8ENEA8w//M///Mf8LCs/n8jSdKvV6DKg8jxMz9Ikbn+rEWgKUihbHCnvXobwx/+7YKohPFTRYi+7SvsA/hX8P7krgVtjjveHF3RsSYyKztnHiCi/wzbtg1DAW67fYKNBjxMxEN3vrKdgoB7CH0PkBiAV/LZA164SH0gILn5VVOBd2F8uVhYSqi+lgI0sAW3hzTJGQOw1r//jabJesci55FJRdYkSI4EADTiRQ6NFREywAl+eqf63GMAvq1nD+4crHu949H3pMOTviJ/uV66lKwLSgDh+XnTZGMaEZKg4PZQy+sDXwe+ru5veXFCvZNAMliTfEFGMuLhQiYAHjM0yZggArg+BNwean19yH8G5tn97fVaqfcFJGs1tRQQqYQOLgw9KtwRmeNqxdIDFg3x2z/X8nqf/wxEbsypYGOKB5EaLjfHXqNraiNOGsAhED95vXiSrwOxn/77zsG6x2mqPXu6+mT1AOpzLsIFJQEjtE0YIdkTuD34CYkBiHzkdZom66mvmRkA6gREEo0gAYIXhCJBxEkgAxzR9xPkjAGY8+AaL1yknoZKEuOIVKRDcCMofS2vlOLKHK6BJTYaAAAGAABBj60R4xwepgFbKzgnYh8N+Gw2gfuU+T0ok1Ve1Jolv3LtERG/KqvSi4hozRdyAnGAQ3gcsDnwGyZja047iFdNqioMal++llRUxsSZIAAsAhIsG8sNbozkEpL0kl69ekkYkq1HoqLyXRFJ+jV3ELDhq7DATjA5FjX69NNmrIqKWoqIV7ppADCfl1xsl/xa+eyyLLtlWUUVkUoS/liK0fncVIa5vXUsRYqnyC2fnfMBQEiS5JHYsUmsKho7cVElSZxijXRcR3M8Gnle7K0URmjdYQBQ1MRqo7KZ85aKRp26qLe8kCRkKXpJr1oRxnRVROyxCiXVxEtuHQBENdGMpDF7OOZGjKgmtSqMqiLJFhWKL0JxzZhEsUXZKG+plGKljbmmXkmiFlnlRX3k+5Ln16qIfyRcK7lMkuSaL2YAXSldeSRcy3otixYbHimHHZM0dc0pdmmN3YqAAgBswLiA/TRsmAMZAPDIKxsW+GzmuZtumx//6tckW6Bt0bYEECawHhNY0EpywATWWYjQY7FmILHMHoAxAL74jffOkSN9dAk+Os1OvMWJFzd3IsKk8dTRuQ4pOcAY7jIaXYr0SJGqnABISRgpHvmrGmmdtUsZEeEucwkAgLzxx9cYAQBIojYvCAC4duIBxIh2dv6YWObz+VxLKd77lLSLpZQYRcQ+wi9x7ktcHgEOmM2Y0mgWLRZHbT1qFzBRQgjBighJEdtWERmzfewDJWrti6vVOc7azWHTNk1LXIq1lFK01jpS+rhJLY9ZKFGPAWsaq3k8i8VRXRy1R7UuFhpNjDFmYwzJWu1si2z7yEiJ+jwgplk+n7d8btm2LQDmKDHGGDYfuqFPwmvcICPPvZqB/30+R+hK13VdU0rJOYvUl54vpXRd4wtXFHa5dCpAAcIJgfOnAQAg49wCAAAzbIsNdpmCXZuPTbc6abDLYL/tNCQIsm0xWrZAS6AlMeCRDwbsFrGlT48HPphN96OiAui9fwV/OATgwppAAkKa7YdAADAlh8aVSvKUHHN7UaRaaJdFiN4KGNwp2XkgJFs2fNi+c/b+8M7w/tAOaD/8EO2woROTXK9LFQn9HSvoG0tiCSCkJzaxdQ5wAEbDbbNcmcSZUquc3LlTpDI4sgeIkBYFHw7Dh8Pw4Ttn7wzvvzO8PwzDcPbhh2fDsPhwGB75ADMxyc2UKknv/MsKSJLoQD4LFAAcDVq0LVqAo+8twS3srDBL0r63ArjAGZcA0n4sVybJzJIpKayTCoAzAkDej86YVKeWvX85wxwKhr7nFABwCGAPYADAYHvElvbhczivvduhcwFFWElG1gAAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAAxAQIAEAAAAGYAAABphwQAAQAAAHYAAAAAAAAAYAAAAAEAAABgAAAAAQAAAFBhaW50Lk5FVCA1LjEuOQAFAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAKgBAABAAAAAAIAAAOgBAABAAAAOAAAAAWgBAABAAAAuAAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAA=" };

// src/text/fonts/font-8x16.webp
var font_8x16_default = { "data": "data:image/webp;base64,UklGRq4GAABXRUJQVlA4WAoAAAAYAAAA/wEAPwAAVlA4TLEFAAAv/8EPEA8w//M///Mf8AwFbdswCX/Y+0MQERPAU60igEq0rP5/JEnOrxGoehE1+8wPUmR5PwsEckEK9VJQT+Elmj/8Z49J8FZQRcjLU8wD+DH2gLnOtUwaH10345PxqeMQiqzs9HKO6P8EwGm1vW72APgv67tZMifvAfBKgZDVWEzBlCKn473fVCVtCUT0P7A44XUSx7j04BmAsp/O3GsYhr1ewXTUVwKSC1QUeBdcK7OUUH0tpVHwqwkgF77iyTbrziLnpaxJkBzZUi9ybqyIAB2s4Le79DDnhVd842rQnccw7PGddHGRrAuNZ+O667IxnQgZ4AS/mqrPw8JXu7Mb6i6BJF0L1YiHC0oA3cjQpQUODLNyN+GulWul/k1mwTaIVEIPF/Is7Mgcnz4NZQAcAvG7sda7CWPr7uyGetuodanjBi5MAyq4o+tqJ5QOsOiIL+9quRuW8htXg96mOpDB7uEiXMgE4EbaLnTiZm4IxK+m4kncNf6+O9lm3PqaOdA1gPrSzpQE7EizQBIEfjX5hySmxh1NR70NlcxoE0kkggQIGqVIEHESyABHDMND5LzwIR88g95KHch9yssewTUe5KGWq1JcWcN1sMRiy6BZcE+i7fA6W4deer2v5zj/8w79EO4/zB/Dw6f5rNYs+erDN0YpT8vTMsk4juOUkROIE5zD44TdiV942NrytEfxqklVhUHt3YeiorJrjO5BEAAWAQmWneWCa5HcQJJe6OXlRWP6ovGljKOOL50JWPgeLHAQPBRRo++/b4Qh2anOLGUcswZ3MluvSy62T36r/HBTNv2mPI3jOEqd+WspRtdrUxnWdnctRYqfMdOdzkKSJG/Enl3ipKKxFxfHUSWeYot0XdXo++9fy2z8iVhJgTLuSOf8rKiJ1UZlt+ZupnaWhSQh16JGrRVhTHYUsaLdLNO681lUE81+1rs47iiusRG90MuGXs4+VaHopPyN294nLQQXdZfFNoyoJrU609n1LOvI0XUtidLQBfks5klFZrXI03xW3/iB5PWHdZTyRvmw5EId85SfZQB9KX15o3yYuw/zTkspb5TznjoOdctTHDLgsAFQzG1Au8Oht/eYFuIBwsEOvQZy442rhbMjO17Pw/T71NYlGWxsAYSHsB4PYUEryQEPYZ2FCD2ebhlIbLIHYAyAXMZOjvTRJXhxmh28xY0Xt3YCMI166+hcj5TcjEBtfUfhEuiRQCgfAkgJjESR4XuqtM7ajTQuLgjkMnYu0Mxoel8R0RQZbS7E/MMbD0AEQG19x8SyXq/XWkrx3qekP4+llBhFxLzBS659iZsvAAfEyM9WuQwpmTR7mZ0wUUIIwYoISRH71yoiLTvpEChR61BcrSRTqq1LMpo8TRYm1lJKsbXWRrmN+/BfLLNrwJrOOa4+y2UopXlJs+dlSekimhhjVGMMyVrtsMdoJ2Wc/QQwprOaU6qtS7JlG5C2ckvErvYYLBcEENP95Cf5s1UuYydHmQURaehmD354n798nIHa+k7oS9/3fVdKyTmL1H/8pJTS90MpfMqv2efSzwrQ3RDIZex0aGbcu0NzhX1DB6C2vlNaBwyt073+Pctl7ODg69YBa+sfOnwuY0dCSDbGWAYLLBH8n+J+TWLP73ngn6vTo1jXBX8FnDe2BBIQ0uoooqACGHxy+KMrgAu3S+5IqkB7JiE6K5XkLQk/s2Xh7PW+xRpbOPD5jOOljybZQTdZJAyDFTA4kj1m7yzJPz/wAxgsYb1sVia5lVJFbna7Ihg6S2LTOCs4R5wjzut9jW2NLSLifj7fI9I54v/EKprEWU2621mpDI4cAOL7QAFISMbYGGSQTbAlJrmZJN19bQUkuUIPMh2PXRVmSToMVgAXuOIGwJFsxCRZWTIlhXVSAXBFAMjH0UeT6qnl4H+RYc4F0zDwFPNzNN9tG+xP7P+Z+/5/AQBFWElG1gAAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAAxAQIAEAAAAGYAAABphwQAAQAAAHYAAAAAAAAAYAAAAAEAAABgAAAAAQAAAFBhaW50Lk5FVCA1LjEuOQAFAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAKgBAABAAAAAAIAAAOgBAABAAAAQAAAAAWgBAABAAAAuAAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAA=" };

// src/text/fonts.js
var m_fontMap = /* @__PURE__ */ new Map();
var m_defaultFontId = null;
var m_nextFontId = 0;
function init20(api) {
  addScreenDataItem("font", null);
  registerCommands12(api);
  loadDefaultFonts();
  addScreenInitFunction(
    (screenData) => setFont(screenData, { "fontId": m_defaultFontId })
  );
}
function registerCommands12(api) {
  addCommand(
    "loadFont",
    loadFont,
    false,
    ["src", "width", "height", "margin", "charset"]
  );
  addCommand("setDefaultFont", setDefaultFont, false, ["fontId"]);
  addCommand("getAvailableFonts", getAvailableFonts, false, []);
  addCommand("setChar", setChar, true, ["charCode", "data"]);
  addCommand("setFont", setFont, true, ["fontId"]);
}
function loadDefaultFonts() {
  loadFont({
    "src": font_6x6_default.data,
    "width": 6,
    "height": 6,
    "margin": 0,
    "charset": null
  });
  font_6x6_default.data = "";
  const defaultImage = getFontImage();
  defaultImage.isDirty = false;
  defaultImage.version = 0;
  m_defaultFontId = loadFont({
    "src": defaultImage,
    "width": 6,
    "height": 8,
    "margin": 0,
    "charset": null
  });
  m_fontMap.get(m_defaultFontId).isEditable = true;
  loadFont({
    "src": font_8x8_default.data,
    "width": 8,
    "height": 8,
    "margin": 0,
    "charset": null
  });
  font_8x8_default.data = "";
  loadFont({
    "src": font_8x14_default.data,
    "width": 8,
    "height": 14,
    "margin": 0,
    "charset": null
  });
  font_8x14_default.data = "";
  loadFont({
    "src": font_8x16_default.data,
    "width": 8,
    "height": 16,
    "margin": 0,
    "charset": null
  });
  font_8x16_default.data = "";
}
function loadFont(options) {
  const fontSrc = options.src;
  const width = getFloat(options.width, null);
  const height = getFloat(options.height, null);
  let margin = 0;
  if (options.margin != null) {
    margin = getFloat(options.margin, NaN);
  }
  const cellWidth = width + margin * 2;
  const cellHeight = height + margin * 2;
  let charset = options.charset;
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throwError(
      TypeError,
      "loadFont: width and height must be integers.",
      "INVALID_DIMENSIONS"
    );
  }
  if (width < 1 || height < 1) {
    throwError(
      RangeError,
      "loadFont: width and height must be at least 1.",
      "INVALID_DIMENSIONS"
    );
  }
  if (!Number.isInteger(margin)) {
    throwError(TypeError, "loadFont: margin must be an integer.", "INVALID_MARGIN");
  }
  if (margin < 0) {
    throwError(
      RangeError,
      "loadFont: margin must be 0 or greater.",
      "INVALID_MARGIN"
    );
  }
  if (!charset) {
    charset = [];
    for (let i = 0; i < 256; i += 1) {
      charset.push(i);
    }
  }
  if (!(Array.isArray(charset) || typeof charset === "string")) {
    throwError(
      TypeError,
      "loadFont: charset must be an array or a string.",
      "INVALID_CHARSET"
    );
  }
  if (typeof charset === "string") {
    const temp = [];
    for (let i = 0; i < charset.length; i += 1) {
      temp.push(charset.charCodeAt(i));
    }
    charset = temp;
  }
  const chars = {};
  for (let i = 0; i < charset.length; i += 1) {
    chars[charset[i]] = i;
  }
  const font = {
    "id": null,
    "width": width,
    "height": height,
    "margin": margin,
    "cellWidth": cellWidth,
    "cellHeight": cellHeight,
    "chars": chars,
    "charset": charset,
    "image": null,
    "atlasWidth": null,
    "atlasHeight": null,
    // Whether image is a static canvas that setChar may edit
    "isEditable": false
  };
  loadFontFromImage(fontSrc, font);
  font.id = m_nextFontId;
  m_fontMap.set(font.id, font);
  m_nextFontId += 1;
  return font.id;
}
function loadFontFromImage(fontSrc, font) {
  if (typeof fontSrc === "string") {
    loadFontUrl(fontSrc, font);
  } else if (fontSrc instanceof HTMLImageElement || fontSrc instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && fontSrc instanceof OffscreenCanvas) {
    font.image = fontSrc;
    font.atlasWidth = fontSrc.width;
    font.atlasHeight = fontSrc.height;
  } else {
    throwError(
      TypeError,
      "loadFont: fontSrc must be a string or Image element.",
      "INVALID_FONT_SRC"
    );
  }
}
function loadFontUrl(fontSrc, font) {
  let img = null;
  let settled = false;
  let waiting = false;
  function releaseWait() {
    if (waiting) {
      waiting = false;
      done();
    }
  }
  function finish() {
    settled = true;
    if (img) {
      for (const name of ["onload", "onerror"]) {
        try {
          img[name] = null;
        } catch (error) {
        }
      }
    }
  }
  try {
    img = new Image();
    wait();
    waiting = true;
    img.onload = function() {
      if (settled) {
        return;
      }
      finish();
      try {
        font.atlasWidth = img.width;
        font.atlasHeight = img.height;
        font.image = img;
      } finally {
        releaseWait();
      }
    };
    img.onerror = function() {
      if (settled) {
        return;
      }
      finish();
      try {
        console.error("loadFont: Unable to load image for font.");
      } finally {
        releaseWait();
      }
    };
    img.src = fontSrc;
  } catch (error) {
    finish();
    try {
      if (img) {
        img.removeAttribute("src");
      }
    } catch (cleanupError) {
    } finally {
      releaseWait();
    }
    throw error;
  }
}
function setDefaultFont(options) {
  const fontId = getInt(options.fontId, null);
  if (fontId === null || !m_fontMap.has(fontId)) {
    throwError(RangeError, "setDefaultFont: invalid fontId", "INVALID_FONT_ID");
  }
  m_defaultFontId = fontId;
}
function setFont(screenData, options) {
  const fontId = getInt(options.fontId, null);
  if (fontId === null || !m_fontMap.has(fontId)) {
    throwError(
      RangeError,
      "setFont: Parameter fontId must be an integer and an index in the available fonts.",
      "INVALID_FONT_ID"
    );
  }
  const font = m_fontMap.get(fontId);
  if (font.image) {
    getWebGL2Texture(screenData, font.image);
  }
  screenData.font = font;
  updatePrintCursorDimensions(screenData);
}
function getAvailableFonts() {
  const fonts = [];
  for (const [fontId, font] of m_fontMap) {
    fonts.push({
      "id": font.id,
      "width": font.width,
      "height": font.height
    });
  }
  return fonts;
}
function setChar(screenData, options) {
  let charCode = options.charCode;
  let data = options.data;
  const font = screenData.font;
  if (!font || !font.image) {
    throwError(
      Error,
      "setChar: No font image loaded on this screen.",
      "NO_FONT_IMAGE"
    );
  }
  if (typeof charCode === "string") {
    charCode = charCode.charCodeAt(0);
  } else {
    charCode = getInt(charCode, null);
    if (charCode === null) {
      throwError(
        TypeError,
        "setChar: charCode must be an integer or a string",
        "INVALID_CHAR_CODE"
      );
    }
  }
  if (!Array.isArray(data)) {
    if (typeof data === "string") {
      data = hexToData(data, font.width, font.height);
    } else {
      throwError(
        TypeError,
        "setChar: data must be a 2D array or an encoded string",
        "INVALID_DATA"
      );
    }
  }
  if (data.length !== font.height) {
    throwError(
      RangeError,
      `setChar: data height (${data.length}) must match font height (${font.height})`,
      "INVALID_DATA_HEIGHT"
    );
  }
  for (let i = 0; i < data.length; i++) {
    if (!Array.isArray(data[i]) || data[i].length !== font.width) {
      throwError(
        RangeError,
        `setChar: data width at row ${i} must match font width (${font.width})`,
        "INVALID_DATA_WIDTH"
      );
    }
  }
  const charIndex = font.chars[charCode];
  if (charIndex === void 0) {
    throwError(
      RangeError,
      "setChar: character not in font character set",
      "CHAR_NOT_IN_FONT"
    );
  }
  const columns = Math.floor(font.atlasWidth / font.cellWidth);
  const cellX = charIndex % columns * font.cellWidth;
  const cellY = Math.floor(charIndex / columns) * font.cellHeight;
  const sx = cellX + font.margin;
  const sy = cellY + font.margin;
  const sw = font.width;
  const sh = font.height;
  const buf = new Uint8ClampedArray(sw * sh * 4);
  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      let on;
      if (data[y][x]) {
        on = 1;
      } else {
        on = 0;
      }
      if (on) {
        const i = (y * sw + x) * 4;
        buf[i + 0] = 255;
        buf[i + 1] = 255;
        buf[i + 2] = 255;
        buf[i + 3] = 255;
      }
    }
  }
  const atlas = getEditableAtlas(font);
  const context = atlas.getContext("2d");
  const glyph = context.createImageData(sw, sh);
  glyph.data.set(buf);
  context.putImageData(glyph, sx, sy);
  atlas.version += 1;
}
function getEditableAtlas(font) {
  if (font.isEditable) {
    return font.image;
  }
  const canvas = document.createElement("canvas");
  canvas.width = font.atlasWidth;
  canvas.height = font.atlasHeight;
  canvas.getContext("2d").drawImage(font.image, 0, 0);
  canvas.isDirty = false;
  canvas.version = 0;
  for (const screenData of getAllScreensData()) {
    deleteWebGL2Texture(screenData, font.image);
  }
  font.image = canvas;
  font.isEditable = true;
  return canvas;
}

// src/index.js
var VERSION = "2.3.0";
var m_api4 = {
  "version": VERSION
};
init15(m_api4);
init14(m_api4);
init16(m_api4);
init9(m_api4);
init10(m_api4);
init13(m_api4);
init(m_api4);
init4(m_api4);
init17(m_api4);
init18(m_api4);
init19(m_api4);
init2(m_api4);
init20(m_api4);
init11(m_api4);
init12(m_api4);
processCommands(m_api4);
if (typeof window !== "undefined") {
  window.pi = m_api4;
  if (window.$ === void 0) {
    window.$ = m_api4;
  }
}
var index_default = m_api4;

// plugins/gamepad/index.js
var m_gamepads = {};
var m_padStates = {};
var m_padList = [];
var MODES = ["connect", "disconnect"];
var BUTTON_NAMES = [
  "south",
  "east",
  "west",
  "north",
  "leftShoulder",
  "rightShoulder",
  "leftTrigger",
  "rightTrigger",
  "select",
  "start",
  "leftStick",
  "rightStick",
  "dpadUp",
  "dpadDown",
  "dpadLeft",
  "dpadRight",
  "home"
];
var AXIS_NAMES = ["leftX", "leftY", "rightX", "rightY"];
var m_handlers = { "connect": [], "disconnect": [] };
var m_dispatchDepth = 0;
var m_pendingReplays = [];
var m_isInitialized = false;
var m_isStopped = false;
var m_isLooping = false;
var m_gamepadLoopId = null;
var m_deadZone = 0.2;
var m_tick = 0;
var m_lastReadTick = -1;
var m_isHidden = false;
var m_isReturning = false;
function gamepadPlugin(pluginApi) {
  pluginApi.addCommand("startGamepad", startGamepad, false, []);
  pluginApi.addCommand("stopGamepad", stopGamepad, false, []);
  pluginApi.addCommand("inGamepad", inGamepad, false, ["gamepadIndex"]);
  pluginApi.addCommand("setGamepadDeadZone", setGamepadDeadZone, false, ["deadZone"]);
  pluginApi.addCommand("onGamepad", onGamepad, false, ["mode", "fn", "once"]);
  pluginApi.addCommand("offGamepad", offGamepad, false, ["mode", "fn"]);
  pluginApi.addCommand(
    "vibrateGamepad",
    vibrateGamepad,
    false,
    ["gamepadIndex", "duration", "strong", "weak"]
  );
  pluginApi.registerClearEvents("gamepad", clearGamepadEvents);
}
function startGamepad() {
  m_isStopped = false;
  if (m_isLooping) {
    return;
  }
  m_isLooping = true;
  m_gamepadLoopId = requestAnimationFrame(gamepadLoop);
  if (!m_isInitialized) {
    window.addEventListener("gamepadconnected", gamepadConnected);
    window.addEventListener("gamepaddisconnected", gamepadDisconnected);
    document.addEventListener("visibilitychange", onVisibilityChange);
    m_isInitialized = true;
  } else {
    m_isReturning = true;
  }
  syncConnections();
}
function startGamepadInternal() {
  if (!m_isStopped) {
    startGamepad();
  }
}
function stopGamepad() {
  m_isStopped = true;
  if (m_isLooping) {
    m_isLooping = false;
    if (m_gamepadLoopId) {
      cancelAnimationFrame(m_gamepadLoopId);
      m_gamepadLoopId = null;
    }
  }
  releasePads();
}
function inGamepad(options) {
  const gamepadIndex = options.gamepadIndex;
  const isList = gamepadIndex === null || gamepadIndex === void 0;
  if (!isList) {
    checkIndex("inGamepad", "gamepadIndex", gamepadIndex);
  }
  if (m_isStopped) {
    if (isList) {
      m_padList.length = 0;
      return m_padList;
    }
    return null;
  }
  if (!m_isLooping) {
    startGamepad();
    updateGamepads(false);
  }
  readGamepads();
  if (isList) {
    m_padList.length = 0;
    for (const index in m_gamepads) {
      m_padList.push(m_gamepads[index]);
    }
    return m_padList;
  }
  const gamepadData = m_gamepads[gamepadIndex];
  if (gamepadData === void 0) {
    return null;
  }
  return gamepadData;
}
function setGamepadDeadZone(options) {
  const deadZone = options.deadZone;
  if (!Number.isFinite(deadZone)) {
    throwCode(
      TypeError,
      "setGamepadDeadZone: deadZone must be a finite number.",
      "INVALID_DEAD_ZONE"
    );
  }
  if (deadZone < 0 || deadZone >= 1) {
    throwCode(
      RangeError,
      "setGamepadDeadZone: deadZone must be at least 0 and less than 1.",
      "INVALID_DEAD_ZONE"
    );
  }
  m_deadZone = deadZone;
}
function onGamepad(options) {
  const mode = options.mode;
  const fn = options.fn;
  checkMode("onGamepad", mode);
  checkFunction("onGamepad", fn);
  if (options.once != null && typeof options.once !== "boolean") {
    throwCode(TypeError, "onGamepad: once must be a boolean.", "INVALID_ONCE");
  }
  let handler = null;
  for (const registered of m_handlers[mode]) {
    if (registered.fn === fn) {
      handler = registered;
    }
  }
  if (handler === null) {
    handler = { "fn": fn, "once": options.once === true, "isRemoved": false };
    if (mode === "connect") {
      handler.delivered = /* @__PURE__ */ new WeakSet();
    }
    m_handlers[mode].push(handler);
  }
  startGamepadInternal();
  if (m_isStopped) {
    return;
  }
  if (mode === "connect") {
    if (m_dispatchDepth > 0) {
      m_pendingReplays.push(handler);
    } else {
      replayConnected(handler);
    }
  }
}
function offGamepad(options) {
  const mode = options.mode;
  const fn = options.fn;
  if (mode == null && fn == null) {
    throwCode(
      TypeError,
      'offGamepad: mode or fn is required. To remove every handler, call clearEvents( "gamepad" ).',
      "INVALID_MODE"
    );
  }
  let modes = MODES;
  if (mode != null) {
    checkMode("offGamepad", mode);
    modes = [mode];
  }
  if (fn != null) {
    checkFunction("offGamepad", fn);
  }
  for (const eachMode of modes) {
    for (const handler of m_handlers[eachMode].slice()) {
      if (fn == null || handler.fn === fn) {
        removeHandler(eachMode, handler);
      }
    }
  }
}
function vibrateGamepad(options) {
  checkIndex("vibrateGamepad", "gamepadIndex", options.gamepadIndex);
  const duration = options.duration;
  if (!Number.isFinite(duration)) {
    throwCode(
      TypeError,
      "vibrateGamepad: duration must be a finite number.",
      "INVALID_DURATION"
    );
  }
  if (duration < 0) {
    throwCode(
      RangeError,
      "vibrateGamepad: duration must not be negative.",
      "INVALID_DURATION"
    );
  }
  const strong = readMagnitude("strong", options.strong, "INVALID_STRONG");
  const weak = readMagnitude("weak", options.weak, "INVALID_WEAK");
  const pad2 = getBrowserGamepads()[options.gamepadIndex];
  if (!pad2 || !pad2.connected || !isDualRumble(pad2.vibrationActuator)) {
    return false;
  }
  const played = pad2.vibrationActuator.playEffect("dual-rumble", {
    "startDelay": 0,
    "duration": duration,
    "strongMagnitude": strong,
    "weakMagnitude": weak
  });
  if (played && typeof played.catch === "function") {
    played.catch(() => {
    });
  }
  return true;
}
function readMagnitude(name, value, code) {
  if (value === null || value === void 0) {
    return 1;
  }
  if (!Number.isFinite(value)) {
    throwCode(TypeError, `vibrateGamepad: ${name} must be a finite number.`, code);
  }
  if (value < 0 || value > 1) {
    throwCode(RangeError, `vibrateGamepad: ${name} must be from 0 to 1.`, code);
  }
  return value;
}
function isDualRumble(actuator) {
  if (!actuator || typeof actuator.playEffect !== "function") {
    return false;
  }
  if (Array.isArray(actuator.effects)) {
    return actuator.effects.includes("dual-rumble");
  }
  if (typeof actuator.type === "string") {
    return actuator.type === "dual-rumble";
  }
  return true;
}
function throwCode(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function checkMode(command, mode) {
  const message = `${command}: mode must be "connect" or "disconnect".`;
  if (typeof mode !== "string") {
    throwCode(TypeError, message, "INVALID_MODE");
  }
  if (!MODES.includes(mode)) {
    throwCode(RangeError, message, "INVALID_MODE");
  }
}
function checkFunction(command, fn) {
  if (typeof fn !== "function") {
    throwCode(TypeError, `${command}: fn must be a function.`, "INVALID_FUNCTION");
  }
}
function checkIndex(command, name, index) {
  if (!Number.isInteger(index)) {
    throwCode(TypeError, `${command}: ${name} must be an integer.`, "INVALID_INDEX");
  }
  if (index < 0) {
    throwCode(RangeError, `${command}: ${name} must not be negative.`, "INVALID_INDEX");
  }
}
function readHelperIndex(command, name, value, names, kind) {
  if (typeof value === "string") {
    const index = names.indexOf(value);
    if (index === -1) {
      throwCode(
        RangeError,
        `${command}: ${name} "${value}" is not ${kind} name.`,
        "INVALID_INDEX"
      );
    }
    return index;
  }
  if (!Number.isInteger(value)) {
    throwCode(
      TypeError,
      `${command}: ${name} must be an integer or ${kind} name.`,
      "INVALID_INDEX"
    );
  }
  checkIndex(command, name, value);
  return value;
}
function readButton(command, value) {
  return readHelperIndex(command, "buttonIndex", value, BUTTON_NAMES, "a button");
}
function readAxis(command, value) {
  return readHelperIndex(command, "axisIndex", value, AXIS_NAMES, "an axis");
}
function removeHandler(mode, handler) {
  handler.isRemoved = true;
  const index = m_handlers[mode].indexOf(handler);
  if (index !== -1) {
    m_handlers[mode].splice(index, 1);
  }
}
function gamepadConnected(e) {
  if (m_isStopped) {
    return;
  }
  recordGamepad(e.gamepad);
  dispatch(m_handlers.connect, "connect", m_gamepads[e.gamepad.index]);
}
function gamepadDisconnected(e) {
  if (m_isStopped) {
    return;
  }
  removeGamepad(e.gamepad);
}
function removeGamepad(gamepad) {
  const data = {
    "index": gamepad.index,
    "id": gamepad.id,
    "mapping": gamepad.mapping,
    "connected": false
  };
  delete m_gamepads[gamepad.index];
  delete m_padStates[gamepad.index];
  dispatch(m_handlers.disconnect, "disconnect", data);
}
function dispatch(handlers, mode, data) {
  m_dispatchDepth += 1;
  for (const handler of handlers.slice()) {
    if (handler.isRemoved) {
      continue;
    }
    if (handler.delivered) {
      if (handler.delivered.has(data)) {
        continue;
      }
      handler.delivered.add(data);
    }
    if (handler.once) {
      removeHandler(mode, handler);
    }
    try {
      handler.fn(data);
    } catch (error) {
      console.error(`onGamepad: Handler for "${mode}" failed:`, error);
    }
  }
  m_dispatchDepth -= 1;
  if (m_dispatchDepth === 0) {
    while (m_pendingReplays.length > 0) {
      replayConnected(m_pendingReplays.shift());
    }
  }
}
function replayConnected(handler) {
  for (const gamepadData of Object.values(m_gamepads)) {
    dispatch([handler], "connect", gamepadData);
  }
}
function gamepadLoop() {
  if (!m_isLooping) {
    return;
  }
  if (!m_isHidden) {
    updateGamepads(!m_isReturning);
    m_isReturning = false;
  }
  m_tick += 1;
  m_gamepadLoopId = requestAnimationFrame(gamepadLoop);
}
function getBrowserGamepads() {
  if ("getGamepads" in navigator) {
    return navigator.getGamepads();
  }
  return [];
}
function syncConnections() {
  const present = {};
  for (const gamepad of getBrowserGamepads()) {
    if (gamepad && gamepad.connected) {
      present[gamepad.index] = true;
      recordGamepad(gamepad);
    }
  }
  for (const gamepadData of Object.values(m_gamepads)) {
    if (!present[gamepadData.index]) {
      removeGamepad(gamepadData);
    }
  }
  for (const gamepadData of Object.values(m_gamepads)) {
    dispatch(m_handlers.connect, "connect", gamepadData);
  }
}
function updateGamepads(isEdges) {
  const gamepads = getBrowserGamepads();
  for (const gamepad of gamepads) {
    if (!gamepad || !gamepad.connected) {
      continue;
    }
    recordGamepad(gamepad);
    updateGamepad(gamepad, isEdges);
  }
}
function readGamepads() {
  if (m_lastReadTick === m_tick) {
    return;
  }
  m_lastReadTick = m_tick;
  for (const index in m_gamepads) {
    const gamepadData = m_gamepads[index];
    const state = m_padStates[index];
    const buttons = gamepadData.buttons;
    for (let i = 0; i < state.buttons.length; i += 1) {
      if (!buttons[i]) {
        buttons[i] = {
          "pressed": false,
          "value": 0,
          "pressStarted": false,
          "pressReleased": false
        };
      }
      buttons[i].pressed = state.buttons[i].pressed;
      buttons[i].value = state.buttons[i].value;
      buttons[i].pressStarted = state.pressStarted[i] === true;
      buttons[i].pressReleased = state.pressReleased[i] === true;
    }
    buttons.length = state.buttons.length;
    copyArray(gamepadData.axes, gamepadData.lastAxes);
    copyArray(state.axes, gamepadData.axes);
    gamepadData.timestamp = state.timestamp;
    gamepadData.connected = state.connected;
    gamepadData.vibrationActuator = state.vibrationActuator;
    state.pressStarted.length = 0;
    state.pressReleased.length = 0;
  }
}
function copyArray(source, target) {
  for (let i = 0; i < source.length; i += 1) {
    target[i] = source[i];
  }
  target.length = source.length;
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
    const index = readButton("getButton", buttonIndex);
    readGamepads();
    if (index >= this.buttons.length) {
      return null;
    }
    return this.buttons[index];
  };
  newGamepadData.getButtonPressed = function(buttonIndex) {
    const index = readButton("getButtonPressed", buttonIndex);
    readGamepads();
    if (index >= this.buttons.length) {
      return false;
    }
    return this.buttons[index].pressed;
  };
  newGamepadData.getButtonJustPressed = function(buttonIndex) {
    const index = readButton("getButtonJustPressed", buttonIndex);
    readGamepads();
    if (index >= this.buttons.length) {
      return false;
    }
    return this.buttons[index].pressStarted;
  };
  newGamepadData.getButtonJustReleased = function(buttonIndex) {
    const index = readButton("getButtonJustReleased", buttonIndex);
    readGamepads();
    if (index >= this.buttons.length) {
      return false;
    }
    return this.buttons[index].pressReleased;
  };
  newGamepadData.getAxis = function(axisIndex) {
    const index = readAxis("getAxis", axisIndex);
    readGamepads();
    if (index >= this.axes.length) {
      return 0;
    }
    return this.axes[index];
  };
  newGamepadData.getAxisChanged = function(axisIndex) {
    const index = readAxis("getAxisChanged", axisIndex);
    readGamepads();
    if (index >= this.axes.length) {
      return false;
    }
    const current = this.axes[index];
    const last = this.lastAxes[index] || 0;
    return current !== last;
  };
  return newGamepadData;
}
function recordGamepad(gamepadRawData) {
  const index = gamepadRawData.index;
  if (m_gamepads[index]) {
    return;
  }
  const gamepadData = createNewGamepadData(gamepadRawData);
  const state = {
    "buttons": [],
    "axes": [],
    "pressStarted": [],
    "pressReleased": [],
    "timestamp": gamepadRawData.timestamp,
    "connected": gamepadRawData.connected,
    "vibrationActuator": gamepadRawData.vibrationActuator
  };
  for (let i = 0; i < gamepadRawData.buttons.length; i += 1) {
    state.buttons.push({ "pressed": false, "value": 0 });
    gamepadData.buttons.push({
      "pressed": false,
      "value": 0,
      "pressStarted": false,
      "pressReleased": false
    });
  }
  applyDeadZone(gamepadRawData, state.axes);
  gamepadData.axes = state.axes.slice();
  gamepadData.lastAxes = state.axes.slice();
  m_gamepads[index] = gamepadData;
  m_padStates[index] = state;
}
function updateGamepad(gamepadRawData, isEdges) {
  const state = m_padStates[gamepadRawData.index];
  for (let i = 0; i < gamepadRawData.buttons.length; i += 1) {
    const buttonNew = gamepadRawData.buttons[i];
    if (!state.buttons[i]) {
      state.buttons[i] = { "pressed": false, "value": 0 };
    }
    const button = state.buttons[i];
    if (isEdges) {
      if (!button.pressed && buttonNew.pressed) {
        state.pressStarted[i] = true;
      } else if (button.pressed && !buttonNew.pressed) {
        state.pressReleased[i] = true;
      }
    }
    button.pressed = buttonNew.pressed;
    button.value = buttonNew.value;
  }
  state.buttons.length = gamepadRawData.buttons.length;
  applyDeadZone(gamepadRawData, state.axes);
  state.timestamp = gamepadRawData.timestamp;
  state.connected = gamepadRawData.connected;
  state.vibrationActuator = gamepadRawData.vibrationActuator;
}
function applyDeadZone(gamepadRawData, target) {
  const axes = gamepadRawData.axes;
  let i = 0;
  if (gamepadRawData.mapping === "standard") {
    while (i < 4 && i + 1 < axes.length) {
      applyStickDeadZone(axes[i], axes[i + 1], target, i);
      i += 2;
    }
  }
  while (i < axes.length) {
    target[i] = applyAxisDeadZone(axes[i]);
    i += 1;
  }
  target.length = axes.length;
}
function applyStickDeadZone(x, y, target, index) {
  const magnitude = Math.hypot(x, y);
  if (magnitude === 0 || magnitude < m_deadZone) {
    target[index] = 0;
    target[index + 1] = 0;
    return;
  }
  const scale = (Math.min(magnitude, 1) - m_deadZone) / (1 - m_deadZone) / magnitude;
  target[index] = x * scale;
  target[index + 1] = y * scale;
}
function applyAxisDeadZone(axis) {
  if (Math.abs(axis) < m_deadZone) {
    return 0;
  }
  return (axis - Math.sign(axis) * m_deadZone) / (1 - m_deadZone);
}
function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    m_isHidden = true;
    releasePads();
  } else if (m_isHidden) {
    m_isHidden = false;
    m_isReturning = true;
  }
}
function releasePads() {
  for (const index in m_padStates) {
    const state = m_padStates[index];
    for (const button of state.buttons) {
      button.pressed = false;
      button.value = 0;
    }
    state.axes.fill(0);
    state.pressStarted.length = 0;
    state.pressReleased.length = 0;
  }
  m_lastReadTick = -1;
}
function clearGamepadEvents(screenData) {
  for (const handler of m_handlers.connect.concat(m_handlers.disconnect)) {
    handler.isRemoved = true;
  }
  m_handlers = { "connect": [], "disconnect": [] };
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "gamepad",
    "version": "2.0.0",
    "description": "Gamepad input handling for Pi.js",
    "init": gamepadPlugin
  });
}

// plugins/keyboard/input.js
var CURSOR_BLINK = 500;
var NUMBER_PATTERNS = {
  "decimal": /^\d*\.?\d*$/,
  "signedDecimal": /^-?\d*\.?\d*$/,
  "integer": /^\d*$/,
  "signedInteger": /^-?\d*$/
};
var m_inputData = null;
var m_inputRequest = 0;
var m_pluginApi = null;
var m_isFromEditableTarget = null;
var m_takeKeyboard = null;
var m_promptEvents = /* @__PURE__ */ new WeakSet();
function initInput(pluginApi, isFromEditableTarget2, takeKeyboard) {
  m_pluginApi = pluginApi;
  m_isFromEditableTarget = isFromEditableTarget2;
  m_takeKeyboard = takeKeyboard;
  pluginApi.addScreenPreCleanupFunction(disposeInput);
  pluginApi.addCommand(
    "input",
    input,
    true,
    ["prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative", "maxLength"]
  );
  pluginApi.addCommand("cancelInput", cancelInput, true, []);
}
function input(screenData, options) {
  if (screenData.isRemoved) {
    const error = new Error("input: Cannot start input on a removed screen.");
    error.code = "SCREEN_REMOVED";
    throw error;
  }
  const prompt = options.prompt;
  const fn = options.fn;
  if (typeof prompt !== "string") {
    throwCode2(TypeError, "input: prompt must be a string.", "INVALID_PROMPT");
  }
  if (fn != null && typeof fn !== "function") {
    throwCode2(TypeError, "input: fn must be a function.", "INVALID_FUNCTION");
  }
  let cursor = options.cursor;
  if (cursor == null || cursor === "") {
    cursor = String.fromCharCode(219);
  } else if (typeof cursor !== "string") {
    throwCode2(TypeError, "input: cursor must be a string.", "INVALID_CURSOR");
  }
  const isNumber = readFlag("isNumber", options.isNumber, "INVALID_IS_NUMBER");
  const isInteger = readFlag("isInteger", options.isInteger, "INVALID_IS_INTEGER");
  const allowNegative = readFlag(
    "allowNegative",
    options.allowNegative,
    "INVALID_ALLOW_NEGATIVE"
  );
  let maxLength = options.maxLength;
  if (maxLength == null) {
    maxLength = null;
  } else if (!Number.isInteger(maxLength)) {
    throwCode2(TypeError, "input: maxLength must be an integer.", "INVALID_MAX_LENGTH");
  } else if (maxLength < 1) {
    throwCode2(RangeError, "input: maxLength must be at least 1.", "INVALID_MAX_LENGTH");
  }
  let resolvePromise, rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  const request = ++m_inputRequest;
  if (m_inputData) {
    finishInput(true);
  }
  if (request !== m_inputRequest || screenData.isRemoved) {
    resolvePromise(null);
    notifyInput(fn, null);
    return promise;
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
    "maxLength": maxLength,
    "val": "",
    "fn": fn,
    "resolve": resolvePromise,
    "reject": rejectPromise,
    "backgroundImageName": null,
    "backgroundImage": null,
    "captureX": null,
    "captureY": null
  };
  const inputData = m_inputData;
  try {
    startInput(inputData);
  } catch (error) {
    if (m_inputData === inputData) {
      m_inputData = null;
      inputData.reject(error);
      releaseInput(inputData);
    } else {
      reportInputError(error);
    }
  }
  return promise;
}
function cancelInput(screenData) {
  if (m_inputData && m_inputData.screenData === screenData) {
    finishInput(true);
  }
}
function startInput(inputData) {
  m_takeKeyboard();
  if (m_inputData !== inputData) {
    return;
  }
  const key = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  inputData.backgroundImageName = `__input_bg_${key}`;
  captureBackground(inputData);
  inputData.keyListener = (event) => {
    if (!m_isFromEditableTarget(event)) {
      m_promptEvents.add(event);
      onInputKeyDown(inputData, event);
    }
  };
  window.addEventListener("keydown", inputData.keyListener, { "capture": true });
  inputData.pasteListener = (event) => {
    if (!m_isFromEditableTarget(event)) {
      onInputPaste(inputData, event);
    }
  };
  window.addEventListener("paste", inputData.pasteListener, { "capture": true });
  inputData.interval = setInterval(() => {
    if (m_inputData === inputData) {
      showPrompt(inputData);
    }
  }, 100);
}
function captureBackground(inputData) {
  const screenData = inputData.screenData;
  const pos = screenData.api.getPos();
  if (pos.row >= screenData.api.getRows()) {
    screenData.api.print("");
    screenData.api.setPos(pos.col, pos.row - 1);
  }
  const posPx = screenData.api.getPosPx();
  const printCursor = screenData.printCursor;
  let viewWidth = screenData.width;
  if (screenData.view) {
    viewWidth = screenData.view.width;
  }
  const captureWidth = viewWidth - posPx.x;
  const captureHeight = printCursor.height;
  screenData.api.createImageFromScreen({
    "name": inputData.backgroundImageName,
    "x1": posPx.x,
    "y1": posPx.y,
    "x2": posPx.x + captureWidth - 1,
    "y2": posPx.y + captureHeight - 1
  });
  inputData.backgroundImage = m_pluginApi.getApi().getImage(inputData.backgroundImageName);
  inputData.captureX = posPx.x;
  inputData.captureY = posPx.y;
  inputData.captureWidth = captureWidth;
  inputData.captureHeight = captureHeight;
  inputData.lineChars = Math.floor(captureWidth / printCursor.width);
}
function onInputKeyDown(inputData, keyData) {
  if (m_inputData !== inputData) {
    return;
  }
  const isAltGraph = Boolean(
    keyData.getModifierState && keyData.getModifierState("AltGraph")
  );
  if ((keyData.ctrlKey || keyData.metaKey) && !isAltGraph) {
    return;
  }
  keyData.preventDefault();
  if (keyData.key === "Enter") {
    finishInput();
    return;
  } else if (keyData.key === "Escape") {
    finishInput(true);
    return;
  } else if (keyData.key === "Backspace") {
    if (inputData.val.length > 0) {
      inputData.val = inputData.val.substring(0, inputData.val.length - 1);
    }
  } else if (keyData.key && keyData.key.length === 1) {
    insertCharacter(inputData, keyData.key);
  }
  showPrompt(inputData);
}
function onInputPaste(inputData, event) {
  if (m_inputData !== inputData) {
    return;
  }
  event.preventDefault();
  let text = "";
  if (event.clipboardData) {
    text = event.clipboardData.getData("text");
  }
  for (const char of text) {
    if (char.length === 1 && char >= " " && char !== "\x7F") {
      insertCharacter(inputData, char);
    }
  }
  showPrompt(inputData);
}
function insertCharacter(inputData, char) {
  const isNumeric = inputData.isNumber || inputData.isInteger;
  const val = inputData.val;
  let next = val + char;
  if (isNumeric && inputData.allowNegative) {
    if (char === "-") {
      if (val.charAt(0) === "-") {
        return;
      }
      next = "-" + val;
    } else if (char === "+") {
      if (val.charAt(0) === "-") {
        inputData.val = val.substring(1);
      }
      return;
    }
  }
  if (inputData.maxLength !== null && next.length > inputData.maxLength) {
    return;
  }
  if (isNumeric && !getNumberPattern(inputData).test(next)) {
    return;
  }
  inputData.val = next;
}
function getNumberPattern(inputData) {
  if (inputData.isInteger) {
    if (inputData.allowNegative) {
      return NUMBER_PATTERNS.signedInteger;
    }
    return NUMBER_PATTERNS.integer;
  }
  if (inputData.allowNegative) {
    return NUMBER_PATTERNS.signedDecimal;
  }
  return NUMBER_PATTERNS.decimal;
}
function showPrompt(inputData, hideCursorOverride) {
  if (inputData.screenData.isRemoved) {
    return;
  }
  const screenData = inputData.screenData;
  let val = inputData.val;
  const valueChars = Math.max(
    inputData.lineChars - inputData.prompt.length - inputData.cursor.length,
    0
  );
  if (val.length > valueChars) {
    val = val.substring(val.length - valueChars);
  }
  let msg = inputData.prompt + val;
  if (!hideCursorOverride) {
    const now = Date.now();
    if (now - inputData.lastCursorBlink > CURSOR_BLINK) {
      inputData.lastCursorBlink = now;
      inputData.showCursor = !inputData.showCursor;
    }
    if (inputData.showCursor) {
      msg += inputData.cursor;
    }
  }
  screenData.api.blitImage(
    inputData.backgroundImage,
    inputData.captureX,
    inputData.captureY
  );
  const posPx = screenData.api.getPosPx();
  screenData.api.setPosPx(inputData.captureX, inputData.captureY);
  screenData.api.print(msg, true);
  screenData.api.setPosPx(posPx);
}
function finishInput(isCancel, isDisposal = false) {
  const inputData = m_inputData;
  if (!inputData) {
    return;
  }
  m_inputData = null;
  const screenData = inputData.screenData;
  const fn = inputData.fn;
  let val = inputData.val;
  if (isCancel) {
    val = null;
  } else if (inputData.isNumber || inputData.isInteger) {
    if (/^-?\.?$/.test(val)) {
      val = 0;
    } else {
      val = Number(val);
      if (val === 0) {
        val = 0;
      }
    }
  }
  inputData.resolve(val);
  try {
    if (!isDisposal && !screenData.isRemoved && inputData.backgroundImage !== null) {
      showPrompt(inputData, true);
      screenData.printCursor.x = 0;
      screenData.printCursor.y = inputData.captureY + inputData.captureHeight;
    }
  } catch (error) {
    reportInputError(error);
  } finally {
    releaseInput(inputData);
  }
  notifyInput(fn, val);
}
function releaseInput(inputData) {
  const api = m_pluginApi.getApi();
  clearInterval(inputData.interval);
  if (inputData.keyListener) {
    window.removeEventListener("keydown", inputData.keyListener, { "capture": true });
  }
  if (inputData.pasteListener) {
    window.removeEventListener("paste", inputData.pasteListener, { "capture": true });
  }
  try {
    if (inputData.backgroundImageName) {
      api.removeImage(inputData.backgroundImageName);
    }
  } catch (error) {
    reportInputError(error);
  } finally {
    inputData.screenData = null;
    inputData.backgroundImage = null;
    inputData.backgroundImageName = null;
    inputData.keyListener = null;
    inputData.pasteListener = null;
    inputData.interval = null;
    inputData.fn = null;
    inputData.resolve = null;
    inputData.reject = null;
  }
}
function throwCode2(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function readFlag(name, value, code) {
  if (value == null) {
    return false;
  }
  if (typeof value !== "boolean") {
    throwCode2(TypeError, `input: ${name} must be a boolean.`, code);
  }
  return value;
}
function notifyInput(fn, val) {
  if (!fn) {
    return;
  }
  try {
    fn(val);
  } catch (error) {
    reportInputError(error);
  }
}
function reportInputError(error) {
  m_pluginApi.utils.queueMicrotask(() => {
    throw error;
  });
}
function disposeInput(screenData) {
  if (m_inputData && m_inputData.screenData === screenData) {
    finishInput(true, true);
  }
}
function isPromptKey(event) {
  return m_inputData !== null || m_promptEvents.has(event);
}
function cancelAllInputs(screenData) {
  if (m_inputData) {
    if (screenData === null || screenData === void 0) {
      finishInput(true);
    } else if (m_inputData.screenData === screenData) {
      finishInput(true);
    }
  }
}

// plugins/keyboard/index.js
var INPUT_TAGS = /* @__PURE__ */ new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
var m_heldCodes = /* @__PURE__ */ new Map();
var m_actionKeys = /* @__PURE__ */ new Set();
var m_onKeyHandlers = {};
var m_withheldCodes = /* @__PURE__ */ new Set();
var m_heldList = null;
var m_isKeyboardActive = false;
var m_isStopped2 = false;
var m_isReleaseListening = false;
function keyboardPlugin(pluginApi) {
  pluginApi.addCommand("startKeyboard", startKeyboard, false, []);
  pluginApi.addCommand("stopKeyboard", stopKeyboard, false, []);
  pluginApi.addCommand("inKey", inKey, false, ["key"]);
  pluginApi.addCommand("setActionKeys", setActionKeys, false, ["keys"]);
  pluginApi.addCommand("removeActionKeys", removeActionKeys, false, ["keys"]);
  pluginApi.addCommand("onKey", onKey, false, ["key", "mode", "fn", "once", "allowRepeat"]);
  pluginApi.addCommand("offKey", offKey, false, ["key", "mode", "fn"]);
  initInput(pluginApi, isFromEditableTarget, withholdHeldKeys);
  pluginApi.registerClearEvents("keyboard", clearKeyboardEvents);
}
function startKeyboard() {
  m_isStopped2 = false;
  if (m_isKeyboardActive) {
    return;
  }
  window.addEventListener("keydown", onKeyDown, { "capture": true });
  window.addEventListener("keyup", onKeyUp, { "capture": true });
  if (!m_isReleaseListening) {
    window.addEventListener("blur", releaseHeldKeys);
    document.addEventListener("visibilitychange", onVisibilityChange2);
    m_isReleaseListening = true;
  }
  m_isKeyboardActive = true;
}
function startOnUse() {
  if (!m_isStopped2) {
    startKeyboard();
  }
}
function stopKeyboard() {
  m_isStopped2 = true;
  if (!m_isKeyboardActive) {
    return;
  }
  releaseHeldKeys();
  window.removeEventListener("keydown", onKeyDown, { "capture": true });
  window.removeEventListener("keyup", onKeyUp, { "capture": true });
  m_isKeyboardActive = false;
}
function inKey(options) {
  const key = options.key;
  startOnUse();
  if (key == null) {
    return getHeldKeys();
  }
  if (typeof key !== "string") {
    throwCode3(TypeError, "inKey: key must be a string.", "INVALID_KEY");
  }
  if (key === "") {
    throwCode3(RangeError, "inKey: key must not be empty.", "INVALID_KEY");
  }
  return findHeldKey(key);
}
function setActionKeys(options) {
  const keys = readActionKeys("setActionKeys", options.keys);
  m_actionKeys.clear();
  for (const key of keys) {
    m_actionKeys.add(key);
  }
  startOnUse();
}
function removeActionKeys(options) {
  for (const key of readActionKeys("removeActionKeys", options.keys)) {
    m_actionKeys.delete(key);
  }
}
function onKey(options) {
  const combo = readKeys("onKey", options.key);
  const mode = options.mode;
  const fn = options.fn;
  readMode("onKey", mode);
  if (typeof fn !== "function") {
    throwCode3(TypeError, "onKey: fn must be a function.", "INVALID_FUNCTION");
  }
  const once = readFlag2("onKey", "once", options.once, "INVALID_ONCE");
  const allowRepeat = readFlag2(
    "onKey",
    "allowRepeat",
    options.allowRepeat,
    "INVALID_ALLOW_REPEAT"
  );
  startOnUse();
  const comboKey = getComboKey(combo);
  for (const existing of m_onKeyHandlers[combo[0]] || []) {
    if (existing.comboKey === comboKey && existing.mode === mode && existing.fn === fn) {
      return;
    }
  }
  const handler = {
    "comboKey": comboKey,
    "combo": combo,
    "mode": mode,
    "fn": fn,
    "once": once,
    "allowRepeat": allowRepeat,
    "isRemoved": false
  };
  for (const key of combo) {
    if (!m_onKeyHandlers[key]) {
      m_onKeyHandlers[key] = [];
    }
    m_onKeyHandlers[key].push(handler);
  }
}
function offKey(options) {
  const combo = readKeys("offKey", options.key);
  const mode = options.mode;
  const fn = options.fn;
  if (mode == null && fn == null) {
    throwCode3(
      TypeError,
      'offKey: mode or fn is required. To remove every key handler, call clearEvents( "keyboard" ).',
      "INVALID_MODE"
    );
  }
  if (mode != null) {
    readMode("offKey", mode);
  }
  if (fn != null && typeof fn !== "function") {
    throwCode3(TypeError, "offKey: fn must be a function.", "INVALID_FUNCTION");
  }
  const comboKey = getComboKey(combo);
  const matches = [];
  for (const handler of m_onKeyHandlers[combo[0]] || []) {
    if (handler.comboKey === comboKey && (mode == null || handler.mode === mode) && (fn == null || handler.fn === fn)) {
      matches.push(handler);
    }
  }
  for (const handler of matches) {
    removeHandler2(handler);
  }
}
function throwCode3(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function readKeys(command, key) {
  const isString = typeof key === "string";
  const isArray = Array.isArray(key) && key.every((item) => typeof item === "string");
  if (!isString && !isArray) {
    throwCode3(
      TypeError,
      `${command}: key must be a string or an array of strings.`,
      "INVALID_KEY"
    );
  }
  let keys;
  if (isString) {
    keys = [key];
  } else {
    keys = Array.from(new Set(key));
  }
  if (keys.length === 0 || keys.includes("")) {
    throwCode3(
      RangeError,
      `${command}: key must be a non-empty string or a non-empty array.`,
      "INVALID_KEY"
    );
  }
  if (keys.length > 1 && keys.includes("any")) {
    throwCode3(
      RangeError,
      `${command}: "any" cannot be part of a combination.`,
      "INVALID_KEY"
    );
  }
  return keys;
}
function getComboKey(keys) {
  return JSON.stringify(keys.slice().sort());
}
function readMode(command, mode) {
  if (typeof mode !== "string") {
    throwCode3(TypeError, `${command}: mode must be "up" or "down".`, "INVALID_MODE");
  }
  if (mode !== "up" && mode !== "down") {
    throwCode3(RangeError, `${command}: mode must be "up" or "down".`, "INVALID_MODE");
  }
}
function readFlag2(command, name, value, code) {
  if (value == null) {
    return false;
  }
  if (typeof value !== "boolean") {
    throwCode3(TypeError, `${command}: ${name} must be a boolean.`, code);
  }
  return value;
}
function readActionKeys(command, keys) {
  if (!Array.isArray(keys) || !keys.every((key) => typeof key === "string")) {
    throwCode3(TypeError, `${command}: keys must be an array of strings.`, "INVALID_KEYS");
  }
  if (keys.includes("")) {
    throwCode3(
      RangeError,
      `${command}: keys must not contain an empty string.`,
      "INVALID_KEYS"
    );
  }
  return keys;
}
function onKeyDown(event) {
  if (isFromEditableTarget(event)) {
    releaseHeldKeys();
    return;
  }
  if (isPromptKey(event)) {
    m_withheldCodes.add(event.code);
    preventActionKey(event);
    return;
  }
  m_withheldCodes.delete(event.code);
  const keyData = createKeyData(event);
  m_heldCodes.delete(event.code);
  m_heldCodes.set(event.code, keyData);
  m_heldList = null;
  const names = [event.code];
  if (event.code !== event.key) {
    names.push(event.key);
  }
  dispatchKey(event, "down", names, null);
  preventActionKey(event);
}
function onKeyUp(event) {
  if (isFromEditableTarget(event)) {
    releaseHeldKeys();
    return;
  }
  const isWithheld = m_withheldCodes.delete(event.code);
  if (isWithheld || isPromptKey(event)) {
    preventActionKey(event);
    return;
  }
  const codeData = m_heldCodes.get(event.code);
  const names = [event.code];
  if (!names.includes(event.key)) {
    names.push(event.key);
  }
  if (codeData && !names.includes(codeData.key)) {
    names.push(codeData.key);
  }
  releaseKey(event, createKeyData(event), names);
  preventActionKey(event);
}
function preventActionKey(event) {
  if (m_actionKeys.has(event.code) || m_actionKeys.has(event.key)) {
    event.preventDefault();
  }
}
function releaseKey(event, data, names) {
  const heldBefore = new Map(m_heldCodes);
  if (m_heldCodes.delete(event.code)) {
    m_heldList = null;
  }
  dispatchKey(event, "up", names, {
    "data": data,
    "names": names,
    "heldBefore": heldBefore
  });
}
function releaseHeldKeys() {
  for (const keyData of getHeldKeys()) {
    if (m_heldCodes.get(keyData.code) !== keyData) {
      continue;
    }
    const names = [keyData.code];
    if (!names.includes(keyData.key)) {
      names.push(keyData.key);
    }
    const data = Object.freeze({ ...keyData, "repeat": false, "cancelled": true });
    const event = { "code": keyData.code, "key": keyData.key, "repeat": false };
    releaseKey(event, data, names);
  }
}
function getHeldKeys() {
  if (m_heldList === null) {
    m_heldList = Object.freeze(Array.from(m_heldCodes.values()));
  }
  return m_heldList;
}
function withholdHeldKeys() {
  for (const code of m_heldCodes.keys()) {
    m_withheldCodes.add(code);
  }
  releaseHeldKeys();
}
function onVisibilityChange2() {
  if (document.visibilityState === "hidden") {
    releaseHeldKeys();
  }
}
function removeHandler2(handler) {
  handler.isRemoved = true;
  for (const key of handler.combo) {
    const handlers = m_onKeyHandlers[key];
    if (!handlers) {
      continue;
    }
    const remaining = handlers.filter((item) => item !== handler);
    if (remaining.length === 0) {
      delete m_onKeyHandlers[key];
    } else {
      m_onKeyHandlers[key] = remaining;
    }
  }
}
function invokeHandler(handler, data) {
  if (handler.once) {
    removeHandler2(handler);
  }
  try {
    handler.fn(data);
  } catch (error) {
    console.error(`onKey: Handler for "${handler.mode}" failed:`, error);
  }
}
function createKeyData(event) {
  return Object.freeze({
    "code": event.code,
    "key": event.key,
    "location": event.location,
    "altKey": event.altKey,
    "ctrlKey": event.ctrlKey,
    "metaKey": event.metaKey,
    "shiftKey": event.shiftKey,
    "repeat": event.repeat,
    "cancelled": false
  });
}
function dispatchKey(event, mode, names, release) {
  const handlers = /* @__PURE__ */ new Set();
  for (const name of names.concat("any")) {
    for (const handler of m_onKeyHandlers[name] || []) {
      if (handler.mode === mode && (!event.repeat || handler.allowRepeat)) {
        handlers.add(handler);
      }
    }
  }
  for (const handler of handlers) {
    if (handler.isRemoved) {
      continue;
    }
    const data = getHandlerData(handler, event, release);
    if (data !== null) {
      invokeHandler(handler, data);
    }
  }
}
function getHandlerData(handler, event, release) {
  if (handler.combo.length === 1 && handler.combo[0] === "any") {
    if (release) {
      return release.data;
    }
    return m_heldCodes.get(event.code) || null;
  }
  if (release && handler.combo.length === 1) {
    return release.data;
  }
  let held = m_heldCodes;
  if (release) {
    held = release.heldBefore;
  }
  const comboData = handler.combo.map((key) => findHeldKey(key, held));
  if (comboData.includes(null)) {
    return null;
  }
  if (release) {
    handler.combo.forEach((key, index) => {
      if (release.names.includes(key)) {
        comboData[index] = release.data;
      }
    });
  }
  if (comboData.length === 1) {
    return comboData[0];
  }
  return comboData;
}
function isFromEditableTarget(event) {
  let element = event.target;
  if (typeof event.composedPath === "function") {
    const path = event.composedPath();
    if (path.length > 0) {
      element = path[0];
    }
  }
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
function findHeldKey(key, held = m_heldCodes) {
  const codeData = held.get(key);
  if (codeData) {
    return codeData;
  }
  let keyData = null;
  for (const data of held.values()) {
    if (data.key === key) {
      keyData = data;
    }
  }
  return keyData;
}
function clearKeyboardEvents(screenData) {
  for (const key in m_onKeyHandlers) {
    for (const handler of m_onKeyHandlers[key]) {
      handler.isRemoved = true;
    }
    delete m_onKeyHandlers[key];
  }
  cancelAllInputs(screenData);
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "keyboard",
    "version": "2.0.0",
    "description": "Keyboard input handling for Pi.js",
    "init": keyboardPlugin
  });
}

// plugins/sound/envelope.js
var MIN_RAMP = 3e-3;
var STOP_FADE = 0.01;
var LN_10000 = Math.log(1e4);
function heldValueAt(env, t, peak) {
  if (t <= 0) {
    return 0;
  }
  if (t < env.attack) {
    return peak * t / env.attack;
  }
  const sustain = peak * env.sustain;
  return sustain + (peak - sustain) * Math.exp(-(t - env.attack) * LN_10000 / env.decay);
}
function resolveEnvelope(params) {
  return {
    "attack": Math.max(params.attackTime, MIN_RAMP),
    "decay": Math.max(params.decayTime, MIN_RAMP),
    "sustain": params.sustainLevel,
    "gate": params.duration,
    "release": Math.max(params.releaseTime, MIN_RAMP)
  };
}
function getEnvelopeLength(env) {
  return env.gate + env.release;
}
function envelopeValueAt(env, t, peak) {
  if (t <= 0 || t >= env.gate + env.release) {
    return 0;
  }
  if (t <= env.gate) {
    return heldValueAt(env, t, peak);
  }
  const gateValue = heldValueAt(env, env.gate, peak);
  return gateValue * Math.exp(-(t - env.gate) * LN_10000 / env.release);
}
function buildEnvelopeSchedule(env, start, peak, offset = 0) {
  const events = [];
  const attackEnd = start + env.attack;
  const gateEnd = start + env.gate;
  const end = gateEnd + env.release;
  const begin = start + offset;
  events.push({
    "type": "set",
    "time": begin,
    "value": envelopeValueAt(env, offset, peak)
  });
  if (offset < env.attack && offset < env.gate) {
    if (env.gate < env.attack) {
      events.push({
        "type": "linear",
        "time": gateEnd,
        "value": peak * env.gate / env.attack
      });
    } else {
      events.push({ "type": "linear", "time": attackEnd, "value": peak });
    }
  }
  if (env.gate > env.attack && offset < env.gate) {
    events.push({
      "type": "target",
      "time": Math.max(attackEnd, begin),
      "value": peak * env.sustain,
      "timeConstant": env.decay / LN_10000
    });
  }
  events.push({
    "type": "target",
    "time": Math.max(gateEnd, begin),
    "value": 0,
    "timeConstant": env.release / LN_10000
  });
  events.push({ "type": "set", "time": end, "value": 0 });
  return events;
}
function stopHoldEvent(env, start, peak, time) {
  const t = time - start;
  const value = envelopeValueAt(env, t, peak);
  if (t > 0 && t < env.attack && t < env.gate) {
    return { "type": "linear", "time": time, "value": value };
  }
  return { "type": "set", "time": time, "value": value };
}
function applySchedule(param, events) {
  for (const event of events) {
    if (event.type === "set") {
      param.setValueAtTime(event.value, event.time);
    } else if (event.type === "linear") {
      param.linearRampToValueAtTime(event.value, event.time);
    } else {
      param.setTargetAtTime(event.value, event.time, event.timeConstant);
    }
  }
}
function scheduleEnvelope(param, env, start, gateEnd, peak) {
  const resolved = resolveEnvelope({
    "duration": Math.max(gateEnd - start, 0),
    "attackTime": env.attackTime || 0,
    "decayTime": env.decayTime || 0,
    "sustainLevel": env.sustainLevel ?? 1,
    "releaseTime": env.releaseTime ?? 0.1
  });
  applySchedule(param, buildEnvelopeSchedule(resolved, start, peak));
  return start + getEnvelopeLength(resolved);
}
function rampValueAt(ramp, time) {
  if (time <= ramp.t0) {
    return ramp.from;
  }
  if (time >= ramp.t1) {
    return ramp.to;
  }
  return ramp.from + (ramp.to - ramp.from) * (time - ramp.t0) / (ramp.t1 - ramp.t0);
}

// plugins/sound/context.js
var BUS_NAMES = ["sfx", "music", "audio"];
var QUANTUM_FRAMES = 128;
var MIN_SCHEDULE_LEAD_QUANTA = 2;
var MASTER_TIME_CONSTANT = 0.015;
var BUS_RAMP = 0.01;
var COMPRESSOR_SETTINGS = {
  "threshold": -4,
  "knee": 0,
  "ratio": 20,
  "attack": 1e-3,
  "release": 0.2
};
var COMPRESSOR_STARTUP_RELEASE = 1e-3;
var COMPRESSOR_SETTLE = 0.05;
var PROBE_BELOW_THRESHOLD = 6;
var PROBE_TOLERANCE = 1;
var PROBE_FRAMES = 48e3;
var PROBE_SAMPLE_RATE = 48e3;
var PROBE_TAIL_FRAMES = 4800;
var LIMITER_HEADROOM = 4;
var LIMITER_KNEE = 0.9;
var LIMITER_CURVE_POINTS = 8001;
var UNLOCK_EVENTS = ["pointerdown", "keydown", "touchend"];
var m_audioContext = null;
var m_volume = 0.75;
var m_limiterEnabled = true;
var m_compressorUsable = true;
var m_probeStarted = false;
var m_graph = null;
var m_busVolumes = { "sfx": 1, "music": 1, "audio": 1 };
var m_unlockArmed = false;
var m_resumeRequested = false;
var m_unlockCallbacks = [];
function createClipperCurve() {
  const curve = new Float32Array(LIMITER_CURVE_POINTS);
  const center = (LIMITER_CURVE_POINTS - 1) / 2;
  const step = LIMITER_HEADROOM / center;
  const range = 1 - LIMITER_KNEE;
  for (let i = 0; i < LIMITER_CURVE_POINTS; i++) {
    const x = (i - center) * step;
    const magnitude = Math.abs(x);
    let y = magnitude;
    if (magnitude > LIMITER_KNEE) {
      y = LIMITER_KNEE + range * Math.tanh((magnitude - LIMITER_KNEE) / range);
    }
    if (x < 0) {
      y = -y;
    }
    curve[i] = y;
  }
  return curve;
}
function getMakeupGain() {
  const fullRangeDb = COMPRESSOR_SETTINGS.threshold * (1 - 1 / COMPRESSOR_SETTINGS.ratio);
  return Math.pow(10, -0.6 * fullRangeDb / 20);
}
function createCompressor(context) {
  const compressor = context.createDynamicsCompressor();
  for (const name in COMPRESSOR_SETTINGS) {
    compressor[name].value = COMPRESSOR_SETTINGS[name];
  }
  return compressor;
}
function createGraph(context) {
  const masterInput = context.createGain();
  const masterGain = context.createGain();
  masterGain.gain.value = m_volume;
  masterInput.connect(masterGain);
  const compressor = createCompressor(context);
  compressor.release.value = COMPRESSOR_STARTUP_RELEASE;
  compressor.release.setValueAtTime(COMPRESSOR_SETTINGS.release, COMPRESSOR_SETTLE);
  const makeupTrim = context.createGain();
  makeupTrim.gain.value = 1 / getMakeupGain();
  const clipperGain = context.createGain();
  clipperGain.gain.value = 1 / LIMITER_HEADROOM;
  const clipper = context.createWaveShaper();
  clipper.curve = createClipperCurve();
  clipper.oversample = "none";
  compressor.connect(makeupTrim);
  makeupTrim.connect(clipperGain);
  clipperGain.connect(clipper);
  const output = context.createGain();
  output.connect(context.destination);
  clipper.connect(output);
  const buses = {};
  for (const name of BUS_NAMES) {
    const input2 = context.createGain();
    const output2 = context.createGain();
    output2.gain.value = m_busVolumes[name];
    input2.connect(output2);
    output2.connect(masterInput);
    buses[name] = {
      "input": input2,
      "insert": null,
      "output": output2,
      "ramp": null
    };
  }
  return {
    "buses": buses,
    "master": { "input": masterInput, "insert": null, "output": masterGain },
    "output": { "output": output },
    "masterInput": masterInput,
    "masterGain": masterGain,
    "masterRoute": null,
    "compressor": compressor,
    "clipperGain": clipperGain
  };
}
function routeMaster() {
  const masterGain = m_graph.masterGain;
  let target;
  if (!m_limiterEnabled) {
    target = m_graph.output.output;
  } else if (m_compressorUsable) {
    target = m_graph.compressor;
  } else {
    target = m_graph.clipperGain;
  }
  if (m_graph.masterRoute !== target) {
    if (m_graph.masterRoute) {
      masterGain.disconnect(m_graph.masterRoute);
    }
    masterGain.connect(target);
    m_graph.masterRoute = target;
  }
}
function getBusStage(bus) {
  getAudioContext();
  if (bus === "master" || bus === "output") {
    return m_graph[bus];
  }
  return m_graph.buses[bus];
}
function probeCompressor() {
  if (m_probeStarted || typeof OfflineAudioContext !== "function") {
    return;
  }
  m_probeStarted = true;
  try {
    const context = new OfflineAudioContext(1, PROBE_FRAMES, PROBE_SAMPLE_RATE);
    const levelDb = COMPRESSOR_SETTINGS.threshold - PROBE_BELOW_THRESHOLD;
    const level = Math.pow(10, levelDb / 20);
    const oscillator = context.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.value = 440;
    const gain = context.createGain();
    gain.gain.value = level;
    const compressor = createCompressor(context);
    oscillator.connect(gain);
    gain.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);
    context.startRendering().then((buffer) => {
      oscillator.disconnect();
      const data = buffer.getChannelData(0);
      let peak = 0;
      for (let i = data.length - PROBE_TAIL_FRAMES; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
      }
      const expected = level * getMakeupGain() * Math.pow(10, -PROBE_TOLERANCE / 20);
      m_compressorUsable = peak >= expected;
      if (m_audioContext) {
        routeMaster();
      }
    }, () => {
    });
  } catch (error) {
  }
}
function setAudioSession() {
  try {
    if (typeof navigator !== "undefined" && navigator.audioSession) {
      navigator.audioSession.type = "ambient";
    }
  } catch (error) {
  }
}
function runUnlockCallbacks() {
  const callbacks = m_unlockCallbacks.splice(0, m_unlockCallbacks.length);
  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      console.error("sound: Deferred start failed:", error);
    }
  }
}
function hasUserActivation() {
  return typeof navigator !== "undefined" && !!navigator.userActivation && navigator.userActivation.isActive === true;
}
function handleUnlockGesture() {
  if (m_audioContext.state === "running") {
    disarmUnlock();
    runUnlockCallbacks();
    return;
  }
  m_resumeRequested = true;
  try {
    const result = m_audioContext.resume();
    if (result && typeof result.catch === "function") {
      result.catch(() => {
      });
    }
  } catch (error) {
  }
  runUnlockCallbacks();
}
function armUnlock() {
  if (m_unlockArmed || typeof document === "undefined") {
    return;
  }
  m_unlockArmed = true;
  for (const type of UNLOCK_EVENTS) {
    document.addEventListener(
      type,
      handleUnlockGesture,
      { "capture": true, "passive": true }
    );
  }
}
function disarmUnlock() {
  if (!m_unlockArmed) {
    return;
  }
  m_unlockArmed = false;
  for (const type of UNLOCK_EVENTS) {
    document.removeEventListener(type, handleUnlockGesture, { "capture": true });
  }
}
function handleStateChange() {
  const state = m_audioContext.state;
  if (state === "running") {
    m_resumeRequested = false;
    disarmUnlock();
    runUnlockCallbacks();
  } else if (state === "suspended" || state === "interrupted") {
    m_resumeRequested = false;
    armUnlock();
  }
}
function getAudioContext() {
  if (!m_audioContext) {
    m_audioContext = new AudioContext();
    setAudioSession();
    m_graph = createGraph(m_audioContext);
    routeMaster();
    m_audioContext.addEventListener("statechange", handleStateChange);
    if (m_audioContext.state !== "running") {
      armUnlock();
      if (hasUserActivation()) {
        handleUnlockGesture();
      }
    }
  }
  return m_audioContext;
}
function startLimiterProbe() {
  probeCompressor();
}
function getBusInput(bus) {
  getAudioContext();
  return m_graph.buses[bus].input;
}
function setBusInsert(bus, insert) {
  const stage = getBusStage(bus);
  const previous = stage.insert;
  if (previous === insert) {
    return;
  }
  if (previous) {
    for (const [from, to] of [
      [stage.input, previous.input],
      [previous.output, stage.output]
    ]) {
      try {
        from.disconnect(to);
      } catch (caughtError) {
      }
    }
    stage.input.connect(stage.output);
    stage.insert = null;
  }
  if (insert) {
    stage.input.disconnect(stage.output);
    stage.input.connect(insert.input);
    insert.output.connect(stage.output);
    stage.insert = insert;
  }
  if (previous) {
    try {
      previous.dispose();
    } catch (error) {
      console.error("sound: Bus insert cleanup failed:", error);
    }
  }
}
function tapBus(bus, node) {
  const output = getBusStage(bus).output;
  output.connect(node);
  let tapped = true;
  return () => {
    if (!tapped) {
      return;
    }
    tapped = false;
    try {
      output.disconnect(node);
    } catch (caughtError) {
    }
  };
}
function getScheduleLead() {
  const context = getAudioContext();
  const quantum = QUANTUM_FRAMES / context.sampleRate;
  const lead = Math.max(MIN_SCHEDULE_LEAD_QUANTA * quantum, context.baseLatency || 0);
  return Math.ceil((context.currentTime + lead) / quantum - 1e-6) * quantum;
}
function setMasterVolume(volume) {
  m_volume = volume;
  if (!m_audioContext) {
    return;
  }
  const lead = getScheduleLead();
  const gain = m_graph.masterGain.gain;
  gain.cancelScheduledValues(lead);
  gain.setTargetAtTime(volume, lead, MASTER_TIME_CONSTANT);
}
function setBusOutputVolume(bus, volume) {
  m_busVolumes[bus] = volume;
  if (!m_audioContext) {
    return;
  }
  const busNodes = m_graph.buses[bus];
  const gain = busNodes.output.gain;
  const lead = getScheduleLead();
  let current = gain.value;
  let holdType = "set";
  if (busNodes.ramp) {
    current = rampValueAt(busNodes.ramp, lead);
    if (lead > busNodes.ramp.t0 && lead < busNodes.ramp.t1) {
      holdType = "linear";
    }
  }
  gain.cancelScheduledValues(lead);
  if (holdType === "linear") {
    gain.linearRampToValueAtTime(current, lead);
  } else {
    gain.setValueAtTime(current, lead);
  }
  gain.linearRampToValueAtTime(volume, lead + BUS_RAMP);
  busNodes.ramp = { "from": current, "to": volume, "t0": lead, "t1": lead + BUS_RAMP };
}
function setLimiterEnabled(enabled) {
  m_limiterEnabled = enabled;
  if (m_audioContext) {
    routeMaster();
  }
}
function isLocked() {
  const context = getAudioContext();
  return context.state !== "running" && !m_resumeRequested;
}
function onUnlock(callback) {
  m_unlockCallbacks.push(callback);
}
function cancelUnlock(callback) {
  const index = m_unlockCallbacks.indexOf(callback);
  if (index > -1) {
    m_unlockCallbacks.splice(index, 1);
  }
}

// plugins/sound/scheduler.js
var BASE_WINDOW = 0.2;
var HIDDEN_WINDOW = 2;
var TICK = 0.025;
var LATE_GRACE = 0.025;
var FILL_HEADROOM = 16;
var MAX_PENDING_SOUNDS = 1024;
var m_pending = [];
var m_streams = [];
var m_timer = null;
var m_visibilityListener = false;
var m_canFill = () => true;
function tick() {
  processPending(getAudioContext().currentTime);
  if (m_pending.length === 0 && m_streams.length === 0 && m_timer !== null) {
    clearInterval(m_timer);
    m_timer = null;
  }
}
function handleVisibilityChange() {
  if (document.hidden && m_timer !== null) {
    tick();
  }
}
function ensureTimer() {
  if (m_timer === null && (m_pending.length > 0 || m_streams.length > 0)) {
    m_timer = setInterval(tick, TICK * 1e3);
    if (!m_visibilityListener && typeof document !== "undefined") {
      m_visibilityListener = true;
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
  }
}
function nextStream() {
  let best = null;
  let bestStart = Infinity;
  for (const stream of m_streams) {
    const start = stream.peek();
    if (start < bestStart) {
      best = stream;
      bestStart = start;
    }
  }
  return best;
}
function runItem(run) {
  try {
    run();
  } catch (error) {
    console.error("sound: Scheduled start failed:", error);
  }
}
function setFillProbe(canFill) {
  m_canFill = canFill;
}
function getWindow() {
  if (typeof document !== "undefined" && document.hidden) {
    return HIDDEN_WINDOW;
  }
  return BASE_WINDOW;
}
function shouldCreate(start, now) {
  const ahead = start - now;
  if (ahead <= BASE_WINDOW) {
    return true;
  }
  return ahead <= getWindow() && m_canFill();
}
function addPending(item, commandName) {
  if (m_pending.length >= MAX_PENDING_SOUNDS) {
    const error = new RangeError(
      `${commandName}: Too many pending sounds; at most ${MAX_PENDING_SOUNDS} delayed requests can wait at once.`
    );
    error.code = "TOO_MANY_PENDING_SOUNDS";
    throw error;
  }
  let index = m_pending.length;
  while (index > 0 && m_pending[index - 1].start > item.start) {
    index -= 1;
  }
  m_pending.splice(index, 0, item);
  ensureTimer();
}
function removePending(id) {
  const index = m_pending.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  m_pending.splice(index, 1);
  return true;
}
function clearPending(kind) {
  for (let i = m_pending.length - 1; i >= 0; i--) {
    if (m_pending[i].kind === kind) {
      m_pending.splice(i, 1);
    }
  }
}
function addStream(stream) {
  m_streams.push(stream);
  processPending(getAudioContext().currentTime);
  ensureTimer();
}
function removeStream(id) {
  const index = m_streams.findIndex((stream) => stream.id === id);
  if (index === -1) {
    return false;
  }
  m_streams.splice(index, 1);
  return true;
}
function processPending(now) {
  while (true) {
    const stream = nextStream();
    let start = Infinity;
    if (stream !== null) {
      start = stream.peek();
    }
    if (m_pending.length > 0 && m_pending[0].start <= start) {
      if (!shouldCreate(m_pending[0].start, now)) {
        break;
      }
      runItem(m_pending.shift().run);
    } else if (stream !== null && shouldCreate(start, now)) {
      runItem(stream.take);
    } else {
      break;
    }
  }
  for (let i = m_streams.length - 1; i >= 0; i--) {
    const stream = m_streams[i];
    if (stream.isDone()) {
      m_streams.splice(i, 1);
      runItem(stream.onDone);
    }
  }
}

// plugins/sound/noise.js
var NOISE_TYPES = ["white", "pink"];
var NOISE_SECONDS = 2;
var SEAM_SECONDS = 0.01;
var PINK_WARMUP = 4800;
var NOISE_RMS = 1 / Math.sqrt(3);
var KNEE = 0.8;
var LEVEL_PASSES = 3;
var m_context = null;
var m_buffers = {};
function createGenerator(type) {
  if (type === "white") {
    return () => Math.random() * 2 - 1;
  }
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  return () => {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    return pink;
  };
}
function rms(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}
function softLimit(sample) {
  const size = Math.abs(sample);
  if (size <= KNEE) {
    return sample;
  }
  const bent = KNEE + (1 - KNEE) * Math.tanh((size - KNEE) / (1 - KNEE));
  return Math.sign(sample) * bent;
}
function createNoiseBuffer(context, type) {
  const length = Math.round(NOISE_SECONDS * context.sampleRate);
  const seam = Math.round(SEAM_SECONDS * context.sampleRate);
  const next = createGenerator(type);
  if (type === "pink") {
    for (let i = 0; i < PINK_WARMUP; i++) {
      next();
    }
  }
  const raw = new Float32Array(length + seam);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = next();
  }
  const data = raw.subarray(0, length);
  for (let i = 0; i < seam; i++) {
    const angle = (i + 0.5) / seam * Math.PI / 2;
    data[i] = data[i] * Math.sin(angle) + raw[length + i] * Math.cos(angle);
  }
  const leveled = new Float32Array(length);
  let gain = NOISE_RMS / rms(data);
  for (let pass = 0; pass < LEVEL_PASSES; pass++) {
    if (pass > 0) {
      gain *= NOISE_RMS / rms(leveled);
    }
    for (let i = 0; i < length; i++) {
      leveled[i] = softLimit(data[i] * gain);
    }
  }
  const buffer = context.createBuffer(1, length, context.sampleRate);
  buffer.copyToChannel(leveled, 0);
  return buffer;
}
function isNoiseType(type) {
  return NOISE_TYPES.indexOf(type) !== -1;
}
function createNoiseSource(context, type) {
  if (m_context !== context) {
    m_context = context;
    m_buffers = {};
  }
  if (!m_buffers[type]) {
    m_buffers[type] = createNoiseBuffer(context, type);
  }
  const source = context.createBufferSource();
  source.buffer = m_buffers[type];
  source.loop = true;
  return {
    "source": source,
    "offset": Math.random() * NOISE_SECONDS
  };
}

// plugins/sound/voices.js
var MAX_VOICES = 64;
var MAX_LIVE_VOICES = 128;
var OSCILLATOR_TYPES = ["triangle", "sine", "square", "sawtooth"];
var CAPACITY_WARNING_INTERVAL = 1e3;
var VOICE_BUSES = ["sfx", "music"];
var m_voices = /* @__PURE__ */ new Map();
var m_sources = /* @__PURE__ */ new Map();
var m_utils = null;
var m_nextSoundId = 0;
var m_nextOrder = 0;
var m_lastCapacityWarning = -Infinity;
setFillProbe(
  () => countLiveVoices() < MAX_LIVE_VOICES - FILL_HEADROOM
);
function countLiveVoices() {
  return m_voices.size;
}
function stopInserts(voice, when) {
  for (const insert of voice.inserts) {
    insert.stop(when);
  }
}
function disposeInserts(inserts) {
  for (const insert of inserts.splice(0, inserts.length)) {
    try {
      insert.dispose();
    } catch (error) {
      console.error("sound: Insert cleanup failed:", error);
    }
  }
}
function disconnectNodes(voice) {
  for (const node of voice.nodes) {
    try {
      node.disconnect();
    } catch (caughtError) {
    }
  }
  for (const link of voice.links.splice(0, voice.links.length)) {
    try {
      link.node.disconnect(link.param);
    } catch (caughtError) {
    }
  }
}
function disposeVoiceParts(voice) {
  disposeInserts(voice.inserts);
  const disposeSource = voice.disposeSource;
  if (disposeSource) {
    voice.disposeSource = null;
    try {
      disposeSource();
    } catch (error) {
      console.error("sound: Source cleanup failed:", error);
    }
  }
}
function throwCode4(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function validateInsert(insert, label) {
  if (!hasMembers(insert, ["input", "output"], ["start", "stop", "dispose"]) || insert.detune != null && !(insert.detune instanceof AudioNode)) {
    throwCode4(
      TypeError,
      label + " must provide input, output, start, stop, and dispose.",
      "INVALID_INSERT"
    );
  }
}
function warnCapacity() {
  const now = Date.now();
  if (now - m_lastCapacityWarning >= CAPACITY_WARNING_INTERVAL) {
    m_lastCapacityWarning = now;
    console.warn("sound: Voice capacity reached; a new sound was not played.");
  }
}
function disposeVoice(voice) {
  if (voice.disposed) {
    return;
  }
  voice.disposed = true;
  disconnectNodes(voice);
  m_voices.delete(voice.id);
  disposeVoiceParts(voice);
  if (voice.onDispose) {
    try {
      voice.onDispose(voice);
    } catch (error) {
      console.error("sound: Voice cleanup failed:", error);
    }
  }
}
function hardStop(voice) {
  try {
    voice.source.stop();
  } catch (caughtError) {
  }
  try {
    stopInserts(voice, getAudioContext().currentTime);
  } catch (error) {
    console.error("sound: Insert stop failed:", error);
  }
  disposeVoice(voice);
}
function schedulePitch(param, spec, begin, offset) {
  const env = spec.env;
  if (spec.frequencyEnd != null) {
    let frequency = spec.frequency;
    if (offset > 0 && env.gate > 0) {
      const progress = Math.min(offset / env.gate, 1);
      const ratio = spec.frequencyEnd / spec.frequency;
      frequency = spec.frequency * Math.pow(ratio, progress);
    }
    param.setValueAtTime(frequency, begin);
    if (spec.start + env.gate > begin) {
      param.exponentialRampToValueAtTime(spec.frequencyEnd, spec.start + env.gate);
    }
  } else {
    param.value = spec.frequency;
  }
}
function createOscillator(context, spec, begin, offset) {
  const source = context.createOscillator();
  if (spec.oType === "custom") {
    source.setPeriodicWave(
      context.createPeriodicWave(spec.waveTables[0], spec.waveTables[1])
    );
  } else {
    source.type = spec.oType;
  }
  schedulePitch(source.frequency, spec, begin, offset);
  return source;
}
function createRegisteredSource(context, spec, voice, offset) {
  const factory = m_sources.get(spec.oType);
  const source = factory(context, Object.freeze({
    "oType": spec.oType,
    "frequency": spec.frequency,
    "frequencyEnd": spec.frequencyEnd,
    "start": spec.start,
    "gate": spec.env.gate,
    "end": voice.end,
    "offset": offset
  }));
  if (source && typeof source.dispose === "function") {
    voice.disposeSource = () => {
      source.dispose();
    };
  }
  if (!hasMembers(source, ["output"], ["start", "stop", "onEnded", "dispose"])) {
    throwCode4(
      TypeError,
      'sound: Source factory for "' + spec.oType + '" must return output, start, stop, onEnded, and dispose.',
      "INVALID_SOURCE"
    );
  }
  let started = false;
  voice.source = {
    "start": (when) => {
      started = true;
      source.start(when);
    },
    "stop": (when) => {
      if (started) {
        source.stop(when ?? context.currentTime);
      }
    }
  };
  if (source.frequency) {
    schedulePitch(source.frequency, spec, voice.begin, offset);
  }
  source.onEnded(() => {
    disposeVoice(voice);
  });
  return source;
}
function buildVoice(spec, soundId) {
  const context = getAudioContext();
  const env = spec.env;
  const offset = spec.offset || 0;
  const begin = spec.start + offset;
  const end = spec.start + getEnvelopeLength(env);
  let peak = spec.peak;
  if (spec.pan) {
    peak *= panGain(spec.pan);
  }
  const voice = createVoiceRecord({
    "id": soundId,
    "start": spec.start,
    "begin": begin,
    "end": end,
    "env": env,
    "peak": peak,
    "onDispose": spec.onDispose || null
  });
  try {
    let output;
    let detune = null;
    let startSource;
    if (m_sources.has(spec.oType)) {
      const registered = createRegisteredSource(context, spec, voice, offset);
      output = registered.output;
      if (registered.detune instanceof AudioParam) {
        detune = registered.detune;
      }
      startSource = () => {
        voice.source.start(begin);
        voice.source.stop(end);
      };
    } else {
      let source;
      let sourceOffset = null;
      if (isNoiseType(spec.oType)) {
        const noise = createNoiseSource(context, spec.oType);
        source = noise.source;
        sourceOffset = noise.offset;
      } else {
        source = createOscillator(context, spec, begin, offset);
        detune = source.detune;
      }
      voice.source = source;
      voice.nodes.push(source);
      output = source;
      startSource = () => {
        source.onended = () => {
          disposeVoice(voice);
        };
        if (sourceOffset === null) {
          source.start(begin);
        } else {
          source.start(begin, sourceOffset);
        }
        source.stop(end);
      };
    }
    if (spec.inserts) {
      for (const descriptor of spec.inserts) {
        const insert = descriptor.factory(context, descriptor.params);
        if (insert && typeof insert.dispose === "function") {
          voice.inserts.push(insert);
        }
        validateInsert(insert, "sound: Voice insert");
        output.connect(insert.input);
        output = insert.output;
        if (insert.detune && detune) {
          insert.detune.connect(detune);
          voice.links.push({ "node": insert.detune, "param": detune });
        }
        insert.start(begin, spec.start + env.gate);
        insert.stop(end);
      }
    }
    if (offset > 0) {
      const onset = context.createGain();
      voice.nodes.push(onset);
      onset.gain.value = 0;
      onset.gain.setValueAtTime(0, begin);
      onset.gain.linearRampToValueAtTime(1, begin + MIN_RAMP);
      output.connect(onset);
      output = onset;
    }
    const gain = context.createGain();
    voice.gain = gain;
    voice.nodes.push(gain);
    gain.gain.value = 0;
    applySchedule(
      gain.gain,
      buildEnvelopeSchedule(env, spec.start, peak, offset)
    );
    output.connect(gain);
    output = gain;
    if (spec.pan) {
      const panner = context.createStereoPanner();
      voice.nodes.push(panner);
      panner.pan.value = spec.pan;
      output.connect(panner);
      output = panner;
    }
    output.connect(getBusInput(spec.bus));
    startSource();
  } catch (error) {
    voice.disposed = true;
    try {
      voice.source?.stop(context.currentTime);
    } catch (caughtError) {
    }
    disconnectNodes(voice);
    disposeVoiceParts(voice);
    throw error;
  }
  m_voices.set(soundId, voice);
  return voice;
}
function admitAndCreate(spec, soundId) {
  return admitVoice({
    "begin": spec.start + (spec.offset || 0),
    "end": spec.start + getEnvelopeLength(spec.env),
    "protected": false,
    "inherit": false,
    "build": () => buildVoice(spec, soundId)
  });
}
function throwRange(message, code) {
  throwCode4(RangeError, message, code);
}
function resolveSoundRequest(name, options) {
  const utils = m_utils;
  const frequency = utils.getFloat(options.frequency, 440);
  const duration = utils.getFloat(options.duration, 1);
  const volume = utils.getFloat(options.volume, 1);
  let oType;
  if (options.oType != null) {
    oType = options.oType;
  } else {
    oType = "triangle";
  }
  const delay = utils.getFloat(options.delay, 0);
  const attackTime = utils.getFloat(options.attackTime, 0);
  const decayTime = utils.getFloat(options.decayTime, 0);
  const sustainLevel = utils.getFloat(options.sustainLevel, 1);
  const releaseTime = utils.getFloat(options.releaseTime, 0.1);
  const pan = utils.getFloat(options.pan, 0);
  let frequencyEnd = null;
  if (options.frequencyEnd != null) {
    frequencyEnd = utils.getFloat(options.frequencyEnd, NaN);
  }
  if (duration < 0) {
    throwRange(
      `${name}: Parameter duration must be a number greater than or equal to 0.`,
      "INVALID_DURATION"
    );
  }
  if (volume < 0 || volume > 1) {
    throwRange(
      `${name}: Parameter volume must be a number between 0 and 1.`,
      "INVALID_VOLUME"
    );
  }
  if (delay < 0) {
    throwRange(
      `${name}: Parameter delay must be a number greater than or equal to 0.`,
      "INVALID_DELAY"
    );
  }
  if (attackTime < 0) {
    throwRange(
      `${name}: Parameter attackTime must be a number greater than or equal to 0.`,
      "INVALID_ATTACK_TIME"
    );
  }
  if (decayTime < 0) {
    throwRange(
      `${name}: Parameter decayTime must be a number greater than or equal to 0.`,
      "INVALID_DECAY_TIME"
    );
  }
  if (sustainLevel < 0 || sustainLevel > 1) {
    throwRange(
      `${name}: Parameter sustainLevel must be a number between 0 and 1.`,
      "INVALID_SUSTAIN_LEVEL"
    );
  }
  if (releaseTime < 0) {
    throwRange(
      `${name}: Parameter releaseTime must be a number greater than or equal to 0.`,
      "INVALID_RELEASE_TIME"
    );
  }
  if (pan < -1 || pan > 1) {
    throwRange(`${name}: Parameter pan must be a number between -1 and 1.`, "INVALID_PAN");
  }
  if (frequencyEnd !== null && !(frequency > 0 && frequencyEnd > 0)) {
    throwRange(
      `${name}: Parameters frequency and frequencyEnd must be greater than 0 for a sweep.`,
      "INVALID_FREQUENCY"
    );
  }
  let waveTables = null;
  if (Array.isArray(oType)) {
    if (oType.length !== 2 || oType[0].length === 0 || oType[1].length === 0 || oType[0].length !== oType[1].length) {
      throwCode4(
        TypeError,
        `${name}: Parameter oType array must contain two non-empty arrays of equal length.`,
        "INVALID_WAVE_TABLE"
      );
    }
    waveTables = [];
    for (let i = 0; i < oType.length; i++) {
      for (let j = 0; j < oType[i].length; j++) {
        if (isNaN(oType[i][j])) {
          throwCode4(
            TypeError,
            `${name}: Parameter oType array must only contain numbers.`,
            "INVALID_WAVE_TABLE_VALUE"
          );
        }
      }
      waveTables.push(new Float32Array(oType[i]));
    }
    oType = "custom";
  } else if (typeof oType !== "string") {
    throwCode4(
      TypeError,
      `${name}: Parameter oType must be a string or an array.`,
      "INVALID_OTYPE"
    );
  } else if (!isSourceType(oType)) {
    throwCode4(
      Error,
      `${name}: Parameter oType must be one of: ${getSourceTypes().join(", ")}.`,
      "INVALID_OTYPE"
    );
  }
  return {
    "frequency": frequency,
    "frequencyEnd": frequencyEnd,
    "oType": oType,
    "waveTables": waveTables,
    "volume": volume,
    "pan": pan,
    "delay": delay,
    "envelope": {
      "duration": duration,
      "attackTime": attackTime,
      "decayTime": decayTime,
      "sustainLevel": sustainLevel,
      "releaseTime": releaseTime
    }
  };
}
function resolveInserts(name, inserts) {
  if (inserts == null) {
    return null;
  }
  if (!Array.isArray(inserts) || inserts.some((descriptor) => !descriptor || typeof descriptor.factory !== "function")) {
    throwCode4(
      TypeError,
      `${name}: Parameter inserts must be an array of { factory, params } descriptors.`,
      "INVALID_INSERT"
    );
  }
  if (inserts.length === 0) {
    return null;
  }
  return snapshot(inserts.map((descriptor) => ({
    "factory": descriptor.factory,
    "params": descriptor.params ?? null
  })));
}
function requestVoice(request, bus, inserts) {
  const context = getAudioContext();
  const soundId = nextSoundId();
  if (isLocked()) {
    return soundId;
  }
  const now = context.currentTime;
  const spec = {
    "frequency": request.frequency,
    "frequencyEnd": request.frequencyEnd,
    "oType": request.oType,
    "waveTables": request.waveTables,
    "peak": request.volume,
    "pan": request.pan,
    "bus": bus,
    "env": resolveEnvelope(request.envelope),
    "start": Math.max(now + request.delay, getScheduleLead()),
    "inserts": inserts
  };
  if (shouldCreate(spec.start, now)) {
    startVoice(spec, soundId);
  } else {
    addPending({
      "id": soundId,
      "kind": "sound",
      "start": spec.start,
      "run": () => startVoice(spec, soundId)
    }, "sound");
  }
  return soundId;
}
function getSourceTypes() {
  return OSCILLATOR_TYPES.concat(NOISE_TYPES, Array.from(m_sources.keys()));
}
function nextSoundId() {
  const soundId = "sound_" + m_nextSoundId;
  m_nextSoundId += 1;
  return soundId;
}
function startVoice(spec, soundId) {
  const context = getAudioContext();
  const now = context.currentTime;
  const lead = getScheduleLead();
  spec.offset = 0;
  if (spec.start < lead) {
    const end = spec.start + getEnvelopeLength(spec.env);
    if (end - lead < MIN_RAMP) {
      return null;
    }
    if (now - spec.start > LATE_GRACE) {
      return null;
    }
    spec.offset = lead - spec.start;
  }
  return admitAndCreate(spec, soundId);
}
function panGain(pan) {
  const angle = (pan + 1) * Math.PI / 4;
  return 1 / Math.max(Math.cos(angle), Math.sin(angle));
}
function createVoiceRecord(fields) {
  const voice = Object.assign({
    "kind": "synth",
    "order": m_nextOrder,
    "stopKind": null,
    "fadeStart": null,
    "protected": false,
    "nodes": [],
    "inserts": [],
    "links": [],
    "source": null,
    "disposeSource": null,
    "gain": null,
    "fade": null,
    "onDispose": null,
    "disposed": false
  }, fields);
  m_nextOrder += 1;
  if (voice.slotEnd === void 0) {
    voice.slotEnd = voice.end;
  }
  return voice;
}
function registerVoice(voice) {
  m_voices.set(voice.id, voice);
}
function releaseVoice(voice) {
  disposeVoice(voice);
}
function admitVoice(request) {
  const context = getAudioContext();
  const now = context.currentTime;
  const lead = getScheduleLead();
  const live = Array.from(m_voices.values());
  let cleanup4 = null;
  if (live.length >= MAX_LIVE_VOICES) {
    cleanup4 = chooseCleanup(live, now, lead);
    if (cleanup4 === null) {
      warnCapacity();
      return null;
    }
  }
  let victims = [];
  if (!request.inherit) {
    const holders = [];
    for (const voice2 of live) {
      if (voice2 !== cleanup4 && voice2.slotEnd !== null && voice2.slotEnd > request.begin) {
        holders.push({
          "voice": voice2,
          "start": voice2.begin,
          "end": voice2.slotEnd,
          "order": voice2.order,
          "protected": voice2.protected
        });
      }
    }
    const plan = planAdmission(holders, request.begin, request.end, MAX_VOICES);
    if (!plan.admit) {
      warnCapacity();
      return null;
    }
    victims = plan.victims;
  }
  if (cleanup4 !== null) {
    hardStop(cleanup4);
  }
  for (const victim of victims) {
    stopVoice(victim.holder.voice, victim.conflict, "steal");
  }
  const voice = request.build();
  voice.protected = request.protected === true;
  return voice;
}
function planAdmission(holders, start, end, maxVoices) {
  const ends = /* @__PURE__ */ new Map();
  for (const holder of holders) {
    ends.set(holder, holder.end);
  }
  const victims = [];
  for (let guard = 0; guard <= holders.length; guard++) {
    const points = [start];
    for (const holder of holders) {
      if (holder.start > start && holder.start < end) {
        points.push(holder.start);
      }
    }
    points.sort((a, b) => a - b);
    let conflict = null;
    for (const point of points) {
      let count = 0;
      for (const holder of holders) {
        if (holder.start <= point && point < ends.get(holder)) {
          count += 1;
        }
      }
      if (count >= maxVoices) {
        conflict = point;
        break;
      }
    }
    if (conflict === null) {
      return { "admit": true, "victims": victims };
    }
    let victim = null;
    for (const holder of holders) {
      if (!holder.protected && holder.start <= conflict && conflict < ends.get(holder) && (victim === null || holder.order < victim.order)) {
        victim = holder;
      }
    }
    if (victim === null) {
      return { "admit": false, "victims": [] };
    }
    ends.set(victim, conflict);
    victims.push({ "holder": victim, "conflict": conflict });
  }
  return { "admit": false, "victims": [] };
}
function chooseCleanup(voices, now, lead) {
  let silentRetiring = null;
  let stopping = null;
  let audibleRetiring = null;
  let active = null;
  for (const voice of voices) {
    const retiring = voice.stopKind === "steal" && now < voice.fadeStart;
    if (retiring && voice.begin >= lead) {
      if (silentRetiring === null || voice.order < silentRetiring.order) {
        silentRetiring = voice;
      }
    } else if (voice.stopKind !== null && !retiring || voice.end <= now) {
      if (stopping === null || voice.end < stopping.end) {
        stopping = voice;
      }
    } else if (retiring) {
      if (audibleRetiring === null || voice.order < audibleRetiring.order) {
        audibleRetiring = voice;
      }
    } else if (!voice.protected && voice.begin < lead) {
      if (active === null || voice.order < active.order) {
        active = voice;
      }
    }
  }
  return silentRetiring || stopping || audibleRetiring || active;
}
function stopVoice(voice, when, kind) {
  if (voice.disposed) {
    return;
  }
  const lead = getScheduleLead();
  let fadeStart = lead;
  if (when !== null && when !== void 0) {
    fadeStart = Math.max(lead, when - STOP_FADE);
  }
  if (kind === "steal") {
    if (voice.slotEnd !== null) {
      voice.slotEnd = Math.min(voice.slotEnd, when);
    }
  } else {
    voice.slotEnd = null;
  }
  if (voice.begin >= fadeStart) {
    hardStop(voice);
    return;
  }
  const deadline = fadeStart + STOP_FADE;
  if (kind === "stop") {
    voice.stopKind = "stop";
  }
  if (voice.end <= deadline) {
    return;
  }
  if (voice.stopKind === null) {
    voice.stopKind = "steal";
  }
  voice.end = deadline;
  voice.fadeStart = fadeStart;
  if (voice.fade) {
    voice.fade(fadeStart, deadline);
    return;
  }
  const param = voice.gain.gain;
  param.cancelScheduledValues(fadeStart);
  applySchedule(param, [
    stopHoldEvent(voice.env, voice.start, voice.peak, fadeStart),
    { "type": "linear", "time": deadline, "value": 0 }
  ]);
  voice.source.stop(deadline);
  stopInserts(voice, deadline);
}
function stopSoundById(soundId, when = null) {
  if (removePending(soundId)) {
    return;
  }
  const voice = m_voices.get(soundId);
  if (voice && voice.kind === "synth") {
    stopVoice(voice, when, "stop");
  }
}
function snapshot(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(snapshot));
  }
  if (ArrayBuffer.isView(value)) {
    return value.slice();
  }
  if (value !== null && typeof value === "object") {
    const copy = {};
    for (const key of Object.keys(value)) {
      copy[key] = snapshot(value[key]);
    }
    return Object.freeze(copy);
  }
  return value;
}
function hasMembers(object, nodes, functions) {
  return Boolean(object) && nodes.every((key) => object[key] instanceof AudioNode) && functions.every((key) => typeof object[key] === "function");
}
function isSourceType(oType) {
  return OSCILLATOR_TYPES.indexOf(oType) !== -1 || isNoiseType(oType) || m_sources.has(oType);
}
function registerSource(oType, factory) {
  if (typeof oType !== "string" || oType === "" || typeof factory !== "function") {
    throwCode4(
      TypeError,
      "registerSource: Parameter oType must be a non-empty string and factory a function.",
      "INVALID_SOURCE"
    );
  }
  if (isSourceType(oType) || oType === "custom") {
    throwCode4(
      Error,
      `registerSource: Source type "${oType}" is already defined.`,
      "DUPLICATE_SOURCE"
    );
  }
  m_sources.set(oType, factory);
}
function createVoice(spec, name = "createVoice") {
  if (spec === null || typeof spec !== "object") {
    throwCode4(TypeError, `${name}: Parameter spec must be an object.`, "INVALID_SPEC");
  }
  const request = resolveSoundRequest(name, spec);
  let bus = "sfx";
  if (spec.bus != null) {
    if (VOICE_BUSES.indexOf(spec.bus) === -1) {
      throwCode4(Error, `${name}: Parameter bus must be one of: sfx, music.`, "INVALID_BUS");
    }
    bus = spec.bus;
  }
  return requestVoice(request, bus, resolveInserts(name, spec.inserts));
}
function registerVoices(pluginApi) {
  m_utils = pluginApi.utils;
  pluginApi.addCommand("sound", sound, false, [
    "frequency",
    "duration",
    "volume",
    "oType",
    "delay",
    "attackTime",
    "decayTime",
    "sustainLevel",
    "releaseTime",
    "pan",
    "frequencyEnd"
  ]);
  function sound(options) {
    return requestVoice(resolveSoundRequest("sound", options), "sfx", null);
  }
  pluginApi.addCommand("stopSound", stopSound, false, ["soundId"]);
  function stopSound(options) {
    const soundId = options.soundId;
    if (soundId == null) {
      clearPending("sound");
      for (const voice of Array.from(m_voices.values())) {
        if (voice.kind === "synth") {
          stopVoice(voice, null, "stop");
        }
      }
      return;
    }
    stopSoundById(soundId);
  }
}

// plugins/sound/play.js
var NOTE_SEMITONES = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
var MAX_NOTE_NUMBER = 119;
var A4_NUMBER = 58;
var OCTAVES = 10;
var COMMANDS = [
  "N",
  "O",
  "L",
  "T",
  "V",
  "P",
  "<",
  ">",
  "MS",
  "MN",
  "ML",
  "MW",
  "MO",
  "MA",
  "MD",
  "MH",
  "MR",
  "MP",
  "MB",
  "MF",
  "WS",
  "WQ",
  "WW",
  "WT",
  "WN",
  "WP",
  "W"
];
var WORDS = {
  "SINE": "WS",
  "SQUARE": "WQ",
  "SAWTOOTH": "WW",
  "TRIANGLE": "WT",
  "NOISE": "WN",
  "PINK": "WP"
};
var WAVEFORMS = {
  "WS": "sine",
  "WQ": "square",
  "WW": "sawtooth",
  "WT": "triangle",
  "WN": "white",
  "WP": "pink"
};
var PACES = { "MS": 0.75, "MN": 0.875, "ML": 1 };
var ENVELOPE_COMMANDS = { "MA": "attack", "MD": "decay", "MH": "sustain", "MR": "release" };
var NOTE_PATTERN = /([A-G])([#+-]?)(\d*)(\.{0,2})/y;
var VALUE_PATTERN = /-?\d+/y;
var INVALID_PREFIX_PATTERN = /[\d\s,[\]#+.-]/;
var m_songs = /* @__PURE__ */ new Map();
var m_lastTrackId = 0;
var m_playObservers = /* @__PURE__ */ new Set();
var m_extensions = [];
var m_extensionTokens = /* @__PURE__ */ new Map();
var m_tokenNames = [];
rebuildTokenNames();
function rebuildTokenNames() {
  m_tokenNames = COMMANDS.concat(Object.keys(WORDS), "@", [...m_extensionTokens.keys()]);
  m_tokenNames.sort((a, b) => b.length - a.length);
}
function throwCode5(message, code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function noteFrequency(number) {
  return 440 * Math.pow(2, (number - A4_NUMBER) / 12);
}
function getNoteLength(val) {
  if (val >= 1 && val < 65) {
    return 1 / val;
  }
  return 0.875;
}
function clamp2(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function extractWaveTables(playString) {
  const waveTables = [];
  let start = playString.indexOf("[[");
  while (start > -1) {
    const end = playString.indexOf("]]", start);
    if (end === -1) {
      break;
    }
    const text = playString.substring(start, end + 2);
    playString = playString.replace(text, "W" + waveTables.length);
    let table = JSON.parse(text);
    if (table.length !== 2 || table[0].length !== table[1].length) {
      console.error(
        "play: Wavetables must have 2 arrays of same length. Defaulting to triangle wave."
      );
      table = "triangle";
    } else {
      for (let j = 0; j < 2; j++) {
        table[j] = new Float32Array(table[j].map((value) => {
          const number = parseFloat(value);
          if (isNaN(number)) {
            return 0;
          }
          return number;
        }));
      }
    }
    waveTables.push(table);
    start = playString.indexOf("[[");
  }
  return { "playString": playString, "waveTables": waveTables };
}
function readValue(text, index) {
  VALUE_PATTERN.lastIndex = index;
  const match = VALUE_PATTERN.exec(text);
  if (match === null) {
    return { "value": null, "index": index };
  }
  return { "value": parseInt(match[0], 10), "index": VALUE_PATTERN.lastIndex };
}
function createTrackState() {
  const state = {
    "tempo": 60 / 120,
    "noteLength": 0.25,
    "pace": PACES.MN,
    "octave": 4,
    "octaveOffset": 0,
    "volume": 1,
    "pan": 0,
    "attack": 15,
    "decay": 20,
    "sustain": 65,
    "release": 20,
    "oType": "triangle",
    "waveTables": null,
    "ext": {}
  };
  for (const extension of m_extensions) {
    state.ext[extension.name] = extension.initState();
  }
  return state;
}
function copyTrackState(state) {
  const copy = Object.assign({}, state, { "ext": {} });
  for (const extension of m_extensions) {
    copy.ext[extension.name] = extension.copyState(state.ext[extension.name]);
  }
  return copy;
}
function createNoteEvent(state, frequency, time, slot, track2) {
  const sounding = slot * state.pace;
  const releaseTime = Math.max(sounding * state.release / 100, MIN_RAMP);
  let note = {
    "frequency": frequency,
    "frequencyEnd": null,
    "time": time,
    "gate": Math.max(sounding - releaseTime, 0),
    "volume": state.volume,
    "envelope": {
      "attackTime": sounding * state.attack / 100,
      "decayTime": sounding * state.decay / 100,
      "sustainLevel": state.sustain / 100,
      "releaseTime": releaseTime
    },
    "pan": state.pan,
    "oType": state.oType,
    "waveTables": state.waveTables,
    "inserts": null
  };
  for (const extension of m_extensions) {
    const overrides = extension.resolveNote(
      state.ext[extension.name],
      snapshot(note)
    );
    if (overrides) {
      note = Object.assign({}, note, overrides, {
        "time": time,
        "envelope": Object.assign({}, note.envelope, overrides.envelope)
      });
    }
  }
  let oType = note.oType;
  let waveTables = note.waveTables;
  if (Array.isArray(oType)) {
    waveTables = [new Float32Array(oType[0]), new Float32Array(oType[1])];
    oType = "custom";
  } else if (oType !== "custom" && !isSourceType(oType)) {
    throwCode5(`play: Unknown oType "${oType}" from a PLAY extension.`, "INVALID_OTYPE");
  }
  return snapshot({
    "time": time,
    "track": track2,
    "frequency": note.frequency,
    "frequencyEnd": note.frequencyEnd,
    "peak": note.volume,
    "pan": note.pan,
    "oType": oType,
    "waveTables": waveTables,
    "env": resolveEnvelope({
      "duration": note.gate,
      "attackTime": note.envelope.attackTime,
      "decayTime": note.envelope.decayTime,
      "sustainLevel": note.envelope.sustainLevel,
      "releaseTime": note.envelope.releaseTime
    }),
    "inserts": note.inserts
  });
}
function applyToken(token, state, time, song) {
  const value = token.value;
  let frequency = 0;
  let length = 0;
  if (token.handler) {
    token.handler(state.ext[token.extension], value);
    return time;
  }
  switch (token.name) {
    case "NOTE": {
      const octave = state.octave + state.octaveOffset;
      if (octave >= 0 && octave < OCTAVES) {
        frequency = noteFrequency(octave * 12 + token.semitone + 1);
      }
      length = state.noteLength;
      if (token.length !== null) {
        length = getNoteLength(token.length);
      }
      length *= [1, 1.5, 1.75][token.dots];
      break;
    }
    case "N":
      if (value !== null) {
        if (value > 0 && value <= MAX_NOTE_NUMBER) {
          frequency = noteFrequency(value);
        }
        length = state.noteLength;
      }
      break;
    case "O":
      if (value !== null && value >= 0 && value < OCTAVES) {
        state.octave = value;
      }
      break;
    case ">":
      state.octave = Math.min(state.octave + 1, OCTAVES - 1);
      break;
    case "<":
      state.octave = Math.max(state.octave - 1, 0);
      break;
    case "L":
      if (value !== null) {
        state.noteLength = getNoteLength(value);
      }
      break;
    case "T":
      if (value !== null && value >= 32 && value < 256) {
        state.tempo = 60 / value;
      }
      break;
    case "V":
      if (value !== null) {
        state.volume = clamp2(value, 0, 100) / 100;
      }
      break;
    case "P":
      if (value !== null) {
        length = getNoteLength(value);
      }
      break;
    case "MS":
    case "MN":
    case "ML":
      state.pace = PACES[token.name];
      break;
    case "MO":
      if (value !== null) {
        state.octaveOffset = value;
      }
      break;
    case "MA":
    case "MD":
    case "MH":
    case "MR":
      if (value !== null) {
        state[ENVELOPE_COMMANDS[token.name]] = clamp2(value, 0, 100);
      }
      break;
    case "MP":
      if (value !== null) {
        state.pan = clamp2(value, -100, 100) / 100;
      }
      break;
    case "W": {
      const table = song.waveTables[value];
      if (Array.isArray(table)) {
        state.oType = "custom";
        state.waveTables = table;
      } else if (table) {
        state.oType = table;
        state.waveTables = null;
      }
      break;
    }
    case "@":
      song.warnings.instrument = true;
      break;
    case "?":
      if (song.warnings.unknown === null) {
        song.warnings.unknown = token.text;
      }
      break;
    default:
      if (WAVEFORMS[token.name]) {
        state.oType = WAVEFORMS[token.name];
        state.waveTables = null;
      }
      break;
  }
  if (length === 0) {
    return time;
  }
  const slot = state.tempo * length * 4;
  if (frequency > 0) {
    song.events.push(createNoteEvent(state, frequency, time, slot, song.track));
  }
  return time + slot;
}
function notifyPlay(event) {
  Object.freeze(event);
  for (const listener of Array.from(m_playObservers)) {
    try {
      listener(event);
    } catch (error) {
      console.error("sound: Play observer failed:", error);
    }
  }
}
function removeSong(song) {
  for (const trackId of song.trackIds) {
    if (m_songs.get(trackId) === song) {
      m_songs.delete(trackId);
    }
  }
}
function playNextEvent(song) {
  const event = song.events[song.index];
  song.index += 1;
  const soundId = nextSoundId();
  const voice = startVoice({
    "frequency": event.frequency,
    "frequencyEnd": event.frequencyEnd,
    "oType": event.oType,
    "waveTables": event.waveTables,
    "peak": event.peak,
    "pan": event.pan,
    "bus": "music",
    "env": event.env,
    "start": song.base + event.time,
    "inserts": event.inserts,
    "onDispose": () => {
      song.voices.delete(soundId);
    }
  }, soundId);
  if (voice) {
    song.voices.set(soundId, voice);
    notifyPlay({
      "type": "note",
      "trackId": song.id,
      "track": event.track,
      "time": voice.begin,
      "duration": voice.end - voice.begin,
      "frequency": event.frequency,
      "volume": event.peak
    });
  }
}
function startSong(song) {
  song.deferred = null;
  song.base = getScheduleLead();
  addStream({
    "id": song.id,
    "kind": "play",
    "peek": () => {
      if (song.index < song.events.length) {
        return song.base + song.events[song.index].time;
      }
      return Infinity;
    },
    "take": () => {
      playNextEvent(song);
    },
    "isDone": () => song.index >= song.events.length && song.voices.size === 0,
    "onDone": () => {
      removeSong(song);
      notifyPlay({ "type": "end", "trackId": song.id, "stopped": false });
    }
  });
}
function stopSong(song) {
  if (song.deferred) {
    cancelUnlock(song.deferred);
    song.deferred = null;
  }
  removeStream(song.id);
  song.index = song.events.length;
  for (const voice of Array.from(song.voices.values())) {
    stopVoice(voice, null, "stop");
  }
  removeSong(song);
  notifyPlay({ "type": "end", "trackId": song.id, "stopped": true });
}
function tokenize(text) {
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    const name = m_tokenNames.find((tokenName) => text.startsWith(tokenName, index));
    if (name !== void 0) {
      const read = readValue(text, index + name.length);
      const token = { "name": WORDS[name] || name, "value": read.value };
      const owner = m_extensionTokens.get(name);
      if (owner) {
        token.handler = owner.handler;
        token.extension = owner.extension;
      }
      tokens.push(token);
      index = read.index;
      continue;
    }
    NOTE_PATTERN.lastIndex = index;
    const note = NOTE_PATTERN.exec(text);
    if (note !== null) {
      let semitone = NOTE_SEMITONES[note[1]];
      if (note[2] === "-") {
        semitone -= 1;
      } else if (note[2] !== "") {
        semitone += 1;
      }
      let length = null;
      if (note[3] !== "") {
        length = parseInt(note[3], 10);
      }
      tokens.push({
        "name": "NOTE",
        "semitone": semitone,
        "length": length,
        "dots": note[4].length
      });
      index = NOTE_PATTERN.lastIndex;
      continue;
    }
    let end = index + 1;
    if (text[index] === "M" && /[A-Z]/.test(text[index + 1])) {
      end = readValue(text, index + 2).index;
    }
    tokens.push({ "name": "?", "value": null, "text": text.substring(index, end) });
    index = end;
  }
  return tokens;
}
function parsePlayString(playString) {
  const extracted = extractWaveTables(playString.split(/\s+/).join("").toUpperCase());
  const trackTexts = extracted.playString.split(",");
  const song = {
    "events": [],
    "waveTables": extracted.waveTables,
    "warnings": { "unknown": null, "instrument": false }
  };
  let state = createTrackState();
  let time = 0;
  for (let i = 0; i < trackTexts.length; i++) {
    const tokens = tokenize(trackTexts[i]);
    song.track = i;
    let nextTime = time;
    for (const token of tokens) {
      nextTime = time;
      time = applyToken(token, state, time, song);
    }
    if (i < trackTexts.length - 1) {
      state = copyTrackState(state);
      time = nextTime;
    }
  }
  song.events.sort((a, b) => a.time - b.time);
  return {
    "events": Object.freeze(song.events),
    "trackCount": trackTexts.length,
    "warnings": song.warnings
  };
}
function observePlay(listener) {
  if (typeof listener !== "function") {
    throwCode5("observePlay: Parameter listener must be a function.", "INVALID_LISTENER");
  }
  m_playObservers.add(listener);
  return () => {
    m_playObservers.delete(listener);
  };
}
function registerPlayExtension(name, extension) {
  if (typeof name !== "string" || name === "") {
    throwCode5(
      "registerPlayExtension: Parameter name must be a non-empty string.",
      "INVALID_PLAY_EXTENSION"
    );
  }
  if (!extension || typeof extension.tokens !== "object" || extension.tokens === null || typeof extension.initState !== "function" || typeof extension.copyState !== "function" || typeof extension.resolveNote !== "function") {
    throwCode5(
      "registerPlayExtension: Parameter extension must have tokens, initState, copyState, and resolveNote.",
      "INVALID_PLAY_EXTENSION"
    );
  }
  if (m_extensions.some((registered) => registered.name === name)) {
    throwCode5(
      `registerPlayExtension: A PLAY extension named "${name}" is already registered.`,
      "DUPLICATE_PLAY_TOKEN"
    );
  }
  const tokens = /* @__PURE__ */ new Map();
  for (const prefix of Object.keys(extension.tokens)) {
    const upper = prefix.toUpperCase();
    const handler = extension.tokens[prefix];
    if (upper === "" || INVALID_PREFIX_PATTERN.test(upper) || typeof handler !== "function") {
      throwCode5(
        `registerPlayExtension: Token "${prefix}" must be a prefix without digits, spaces, or , [ ] # + - . and must map to a function.`,
        "INVALID_PLAY_EXTENSION"
      );
    }
    if (COMMANDS.includes(upper) || WORDS[upper] || NOTE_SEMITONES[upper] !== void 0 || m_extensionTokens.has(upper) || tokens.has(upper)) {
      throwCode5(
        `registerPlayExtension: PLAY token "${upper}" is already registered.`,
        "DUPLICATE_PLAY_TOKEN"
      );
    }
    tokens.set(upper, { "handler": handler, "extension": name });
  }
  m_extensions.push({
    "name": name,
    "initState": extension.initState,
    "copyState": extension.copyState,
    "resolveNote": extension.resolveNote
  });
  for (const [prefix, owner] of tokens) {
    m_extensionTokens.set(prefix, owner);
  }
  rebuildTokenNames();
}
function registerPlay(pluginApi) {
  pluginApi.addCommand("play", play, false, ["playString"]);
  function play(options) {
    const playString = options.playString;
    if (typeof playString !== "string") {
      const error = new TypeError("play: Parameter playString must be a string.");
      error.code = "INVALID_PLAY_STRING";
      throw error;
    }
    const parsed = parsePlayString(playString);
    if (parsed.warnings.unknown !== null) {
      console.warn(`play: Unknown command "${parsed.warnings.unknown}" ignored.`);
    }
    if (parsed.warnings.instrument) {
      console.warn("play: Instrument command @n needs a PLAY extension; ignored.");
    }
    const song = {
      "id": m_lastTrackId,
      "trackIds": [],
      "events": parsed.events,
      "index": 0,
      "base": 0,
      "voices": /* @__PURE__ */ new Map(),
      "deferred": null
    };
    for (let i = 0; i < parsed.trackCount; i++) {
      song.trackIds.push(m_lastTrackId);
      m_songs.set(m_lastTrackId, song);
      m_lastTrackId += 1;
    }
    if (isLocked()) {
      song.deferred = () => {
        startSong(song);
      };
      onUnlock(song.deferred);
      return song.id;
    }
    startSong(song);
    return song.id;
  }
  pluginApi.addCommand("stopPlay", stopPlay, false, ["trackId"]);
  function stopPlay(options) {
    const trackId = options.trackId;
    if (trackId === null) {
      for (const song2 of new Set(m_songs.values())) {
        stopSong(song2);
      }
      return;
    }
    const song = m_songs.get(trackId);
    if (song) {
      stopSong(song);
    }
  }
}

// plugins/sound/samples.js
var DECODE_RATES = [0.0625, 16];
var STREAM_RATES = [0.25, 4];
var RETRY_COUNT = 3;
var RETRY_DELAY = 100;
var CONTROL_RAMP = 0.01;
var MEDIA_ERR_NETWORK = 2;
var m_audio = {};
var m_instances = /* @__PURE__ */ new Map();
var m_nextAudioId = 0;
var m_nextInstanceId = 1;
function resolveBudget(fileLength, startTime, duration, loop) {
  if (loop) {
    if (duration > 0) {
      return duration;
    }
    return Infinity;
  }
  const available = Math.max(fileLength - startTime, 0);
  if (duration > 0) {
    return Math.min(duration, available);
  }
  return available;
}
function consumedAt(segments, time) {
  let total = 0;
  for (let i = 0; i < segments.length; i++) {
    const segmentStart = segments[i].time;
    if (time <= segmentStart) {
      break;
    }
    let segmentEnd = time;
    if (i + 1 < segments.length && segments[i + 1].time < time) {
      segmentEnd = segments[i + 1].time;
    }
    total += segments[i].rate * (segmentEnd - segmentStart);
  }
  return total;
}
function rateAt(segments, time) {
  let rate = segments[0].rate;
  for (const segment of segments) {
    if (segment.time <= time) {
      rate = segment.rate;
    }
  }
  return rate;
}
function timeForContent(segments, content) {
  if (content === Infinity) {
    return Infinity;
  }
  let consumed = 0;
  for (let i = 0; i < segments.length - 1; i++) {
    const span = segments[i].rate * (segments[i + 1].time - segments[i].time);
    if (consumed + span >= content) {
      return segments[i].time + (content - consumed) / segments[i].rate;
    }
    consumed += span;
  }
  const last = segments[segments.length - 1];
  return last.time + (content - consumed) / last.rate;
}
function addRateSegment(segments, time, rate) {
  while (segments.length > 1 && segments[segments.length - 1].time >= time) {
    segments.pop();
  }
  if (time <= segments[0].time) {
    segments[0].rate = rate;
    return;
  }
  segments.push({ "time": time, "rate": rate });
}
function wrapPosition(startTime, consumed, fileLength, loop) {
  const position = startTime + consumed;
  if (loop && fileLength > 0) {
    return position % fileLength;
  }
  return position;
}
function isPlaybackRateValid(rate, stream) {
  let range = DECODE_RATES;
  if (stream) {
    range = STREAM_RATES;
  }
  return rate >= range[0] && rate <= range[1];
}
function throwError2(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function isFileUrl(src) {
  let base;
  if (typeof document !== "undefined") {
    base = document.baseURI;
  }
  try {
    return new URL(src, base).protocol === "file:";
  } catch (error) {
    return false;
  }
}
function releaseElement(element) {
  try {
    element.pause();
  } catch (caughtError) {
  }
  try {
    element.removeAttribute("src");
    element.load();
  } catch (caughtError) {
  }
}
function settleLoad(pluginApi, audio) {
  if (audio.settled) {
    return;
  }
  audio.settled = true;
  clearTimeout(audio.retryTimer);
  audio.retryTimer = null;
  pluginApi.done();
}
function failLoad(pluginApi, audio, message, retryable, retryCount, retry) {
  console.error("loadAudio: " + message + " - " + audio.src);
  if (retryable && retryCount > 0) {
    const timer = setTimeout(() => {
      if (audio.removed || audio.retryTimer !== timer) {
        return;
      }
      audio.retryTimer = null;
      try {
        retry();
      } catch (error) {
        audio.status = "failed";
        settleLoad(pluginApi, audio);
        console.error("loadAudio: Retry initialization failed:", error);
      }
    }, RETRY_DELAY);
    audio.retryTimer = timer;
    return;
  }
  if (retryable) {
    console.error("loadAudio: Max retries exceeded for " + audio.src);
  }
  audio.status = "failed";
  settleLoad(pluginApi, audio);
}
function loadDecoded(pluginApi, audio, retryCount) {
  const controller = new AbortController();
  audio.controller = controller;
  let retryable = true;
  function isCurrent() {
    return !audio.removed && audio.controller === controller;
  }
  fetch(audio.src, { "signal": controller.signal }).then((response) => {
    if (!response.ok) {
      retryable = response.status >= 500;
      throw new Error("HTTP status " + response.status);
    }
    return response.arrayBuffer();
  }).then((data) => {
    if (!isCurrent()) {
      return null;
    }
    retryable = false;
    return getAudioContext().decodeAudioData(data);
  }).then((buffer) => {
    if (!isCurrent() || !buffer) {
      return;
    }
    audio.controller = null;
    audio.buffer = buffer;
    audio.length = buffer.duration;
    audio.status = "ready";
    settleLoad(pluginApi, audio);
  }).catch((error) => {
    if (!isCurrent()) {
      return;
    }
    audio.controller = null;
    let message = "Failed to load audio";
    if (error && error.message) {
      message += ": " + error.message;
    }
    failLoad(pluginApi, audio, message, retryable, retryCount, () => {
      loadDecoded(pluginApi, audio, retryCount - 1);
    });
  });
}
function loadStream(pluginApi, audio, retryCount) {
  const element = new Audio();
  audio.element = element;
  let active = true;
  function detach() {
    active = false;
    element.removeEventListener("canplay", ready2);
    element.removeEventListener("error", fail);
    audio.detach = null;
  }
  audio.detach = detach;
  function ready2() {
    if (!active || audio.removed) {
      return;
    }
    detach();
    audio.length = element.duration;
    audio.status = "ready";
    audio.ended = () => {
      streamEnded(audio);
    };
    element.addEventListener("ended", audio.ended);
    settleLoad(pluginApi, audio);
  }
  function fail() {
    if (!active || audio.removed) {
      return;
    }
    detach();
    const code = element.error?.code;
    audio.element = null;
    releaseElement(element);
    failLoad(
      pluginApi,
      audio,
      "Media error " + code,
      code === MEDIA_ERR_NETWORK,
      retryCount,
      () => {
        loadStream(pluginApi, audio, retryCount - 1);
      }
    );
  }
  element.addEventListener("canplay", ready2);
  element.addEventListener("error", fail);
  element.crossOrigin = "anonymous";
  element.preload = "auto";
  element.preservesPitch = false;
  element.mozPreservesPitch = false;
  element.webkitPreservesPitch = false;
  element.src = audio.src;
}
function disposeAudio(pluginApi, audio) {
  audio.removed = true;
  if (audio.controller) {
    audio.controller.abort();
    audio.controller = null;
  }
  if (audio.detach) {
    audio.detach();
  }
  settleLoad(pluginApi, audio);
  for (const inst of Array.from(audio.instances)) {
    stopInstance(inst);
  }
  audio.buffer = null;
  const element = audio.element;
  const sourceNode = audio.sourceNode;
  audio.element = null;
  audio.sourceNode = null;
  if (element && audio.ended) {
    element.removeEventListener("ended", audio.ended);
  }
  if (element && !sourceNode) {
    releaseElement(element);
  } else if (element) {
    const context = getAudioContext();
    const delay = getScheduleLead() - context.currentTime + STOP_FADE;
    setTimeout(() => {
      sourceNode.disconnect();
      releaseElement(element);
    }, delay * 1e3);
  }
}
function isIssued(id) {
  return Number.isInteger(id) && id >= 1 && id < m_nextInstanceId;
}
function resolveInstances(id, name) {
  if (id === null || id === void 0) {
    return Array.from(m_instances.values());
  }
  if (typeof id === "string") {
    if (!m_audio[id]) {
      throwError2(Error, `${name}: Audio "${id}" not found.`, "AUDIO_NOT_FOUND");
    }
    return Array.from(m_audio[id].instances);
  }
  if (typeof id === "number") {
    if (!isIssued(id)) {
      throwError2(Error, `${name}: Audio instance ${id} not found.`, "AUDIO_NOT_FOUND");
    }
    const inst = m_instances.get(id);
    if (inst) {
      return [inst];
    }
    return [];
  }
  throwError2(
    TypeError,
    `${name}: Parameter id must be an instance ID or an audio ID.`,
    "INVALID_AUDIO_ID"
  );
}
function completeInstance(inst) {
  inst.state = "done";
  inst.voice = null;
  m_instances.delete(inst.id);
  inst.audio.instances.delete(inst);
  if (inst.audio.current === inst) {
    inst.audio.current = null;
  }
  if (inst.pending) {
    removePending(inst.id);
    inst.pending = false;
  }
  if (inst.deferred) {
    cancelUnlock(inst.deferred);
    inst.deferred = null;
  }
}
function stopInstance(inst) {
  const voice = inst.voice;
  completeInstance(inst);
  if (voice) {
    stopVoice(voice, null, "stop");
  }
}
function contentAt(inst, time) {
  return inst.consumed + consumedAt(inst.segments, time);
}
function instanceGain(inst) {
  if (inst.mono) {
    return inst.volume * panGain(inst.pan);
  }
  return inst.volume;
}
function rampControl(param, ramp, target, time) {
  const current = rampValueAt(ramp, time);
  param.cancelScheduledValues(time);
  if (time > ramp.t0 && time <= ramp.t1) {
    param.linearRampToValueAtTime(current, time);
  } else {
    param.setValueAtTime(current, time);
  }
  param.linearRampToValueAtTime(target, time + CONTROL_RAMP);
  return { "from": current, "to": target, "t0": time, "t1": time + CONTROL_RAMP };
}
function fadeValueAt(events, time) {
  let value = 0;
  let previous = -Infinity;
  for (const event of events) {
    if (event.time <= time) {
      value = event.value;
      previous = event.time;
    } else {
      if (event.type === "linear" && previous > -Infinity) {
        return value + (event.value - value) * (time - previous) / (event.time - previous);
      }
      return value;
    }
  }
  return value;
}
function pushFade(voice, event) {
  voice.fadeEvents.push(event);
  applySchedule(voice.gain.gain, [event]);
}
function holdFade(voice, time) {
  const events = voice.fadeEvents;
  const value = fadeValueAt(events, time);
  let type = "set";
  for (const event of events) {
    if (event.time >= time) {
      if (event.type === "linear") {
        type = "linear";
      }
      break;
    }
  }
  voice.gain.gain.cancelScheduledValues(time);
  while (events.length > 0 && events[events.length - 1].time >= time) {
    events.pop();
  }
  pushFade(voice, { "type": type, "time": time, "value": value });
}
function scheduleEndFade(voice, inst, from) {
  voice.endFadeStart = null;
  const end = timeForContent(inst.segments, inst.budget - inst.consumed);
  if (end === Infinity) {
    voice.end = Infinity;
    return;
  }
  const fadeEnd = Math.max(end, from + MIN_RAMP);
  const fadeStart = Math.max(from, fadeEnd - STOP_FADE);
  pushFade(voice, { "type": "set", "time": fadeStart, "value": 1 });
  pushFade(voice, { "type": "linear", "time": fadeEnd, "value": 0 });
  voice.endFadeStart = fadeStart;
  voice.end = fadeEnd;
  voice.source.stop(fadeEnd);
}
function updateEndFade(inst, voice) {
  if (voice.stopKind !== null || !voice.started) {
    return;
  }
  const from = Math.max(getScheduleLead(), voice.begin + MIN_RAMP);
  if (voice.endFadeStart !== null && voice.endFadeStart < from) {
    return;
  }
  if (voice.end === Infinity && voice.endFadeStart === null && inst.budget === Infinity) {
    return;
  }
  holdFade(voice, from);
  scheduleEndFade(voice, inst, from);
}
function voiceEnded(inst, voice) {
  clearTimeout(voice.startTimer);
  clearTimeout(voice.stopTimer);
  if (voice.streamSource) {
    try {
      voice.streamSource.disconnect(voice.gain);
    } catch (caughtError) {
    }
  }
  if (inst.voice === voice) {
    completeInstance(inst);
  }
}
function createSampleVoice(inst, begin) {
  const context = getAudioContext();
  const voice = createVoiceRecord({
    "id": "instance_" + inst.id,
    "kind": "sample",
    "start": begin,
    "begin": begin,
    "end": Infinity,
    "fadeEvents": [],
    "endFadeStart": null,
    "started": false,
    "startTimer": null,
    "stopTimer": null,
    "streamSource": null
  });
  const fade = context.createGain();
  const volume = context.createGain();
  const panner = context.createStereoPanner();
  voice.nodes.push(fade, volume, panner);
  voice.gain = fade;
  fade.gain.value = 0;
  volume.gain.value = instanceGain(inst);
  panner.pan.value = inst.pan;
  fade.connect(volume);
  volume.connect(panner);
  panner.connect(getBusInput("audio"));
  inst.volumeNode = volume;
  inst.panner = panner;
  inst.volumeRamp = { "from": volume.gain.value, "to": volume.gain.value, "t0": 0, "t1": 0 };
  inst.panRamp = { "from": inst.pan, "to": inst.pan, "t0": 0, "t1": 0 };
  pushFade(voice, { "type": "set", "time": begin, "value": 0 });
  voice.fade = (fadeStart, deadline) => {
    holdFade(voice, fadeStart);
    pushFade(voice, { "type": "linear", "time": deadline, "value": 0 });
    voice.source.stop(deadline);
  };
  voice.onDispose = () => {
    voiceEnded(inst, voice);
  };
  return voice;
}
function abandonVoice(voice) {
  voice.disposed = true;
  clearTimeout(voice.startTimer);
  for (const node of voice.nodes) {
    try {
      node.disconnect();
    } catch (caughtError) {
    }
  }
  if (voice.streamSource) {
    try {
      voice.streamSource.disconnect(voice.gain);
    } catch (caughtError) {
    }
  }
}
function buildDecodeVoice(inst, begin, content) {
  const context = getAudioContext();
  const audio = inst.audio;
  const voice = createSampleVoice(inst, begin);
  try {
    const source = context.createBufferSource();
    voice.source = source;
    voice.nodes.unshift(source);
    source.buffer = audio.buffer;
    source.loop = inst.loop;
    const rate = source.playbackRate;
    rate.value = rateAt(inst.segments, begin);
    rate.setValueAtTime(rate.value, begin);
    for (const segment of inst.segments) {
      if (segment.time > begin) {
        rate.setValueAtTime(segment.rate, segment.time);
      }
    }
    source.connect(voice.gain);
    source.onended = () => {
      releaseVoice(voice);
    };
    const offset = wrapPosition(inst.startTime, content, audio.length, inst.loop);
    const remaining = inst.budget - content;
    if (remaining === Infinity) {
      source.start(begin, offset);
    } else {
      source.start(begin, offset, remaining);
    }
    voice.started = true;
    pushFade(voice, {
      "type": "linear",
      "time": begin + MIN_RAMP,
      "value": 1
    });
    scheduleEndFade(voice, inst, begin + MIN_RAMP);
  } catch (error) {
    abandonVoice(voice);
    throw error;
  }
  registerVoice(voice);
  return voice;
}
function buildStreamVoice(inst, begin, content) {
  const context = getAudioContext();
  const audio = inst.audio;
  const voice = createSampleVoice(inst, begin);
  try {
    if (!audio.sourceNode) {
      audio.sourceNode = context.createMediaElementSource(audio.element);
    }
    voice.streamSource = audio.sourceNode;
    audio.sourceNode.connect(voice.gain);
    voice.source = {
      "stop": (when) => {
        stopStream(inst, voice, when);
      }
    };
  } catch (error) {
    abandonVoice(voice);
    throw error;
  }
  registerVoice(voice);
  inst.voice = voice;
  let position = inst.resumePosition;
  if (position === null) {
    position = wrapPosition(inst.startTime, content, audio.length, inst.loop);
  }
  if (begin <= getScheduleLead()) {
    startStream(inst, voice, position);
  } else {
    voice.startTimer = setTimeout(() => {
      voice.startTimer = null;
      startStream(inst, voice, position);
    }, (begin - context.currentTime) * 1e3);
  }
  return voice;
}
function startStream(inst, voice, position) {
  if (voice.disposed || inst.voice !== voice || voice.stopKind !== null) {
    return;
  }
  const audio = inst.audio;
  const element = audio.element;
  audio.playing = voice;
  element.loop = inst.loop;
  element.playbackRate = inst.rate;
  element.currentTime = position;
  const played = element.play();
  if (played && typeof played.catch === "function") {
    played.catch((error) => {
      console.warn("playAudio: Audio playback failed:", error.message);
    });
  }
  const lead = getScheduleLead();
  holdFade(voice, lead);
  pushFade(voice, { "type": "linear", "time": lead + MIN_RAMP, "value": 1 });
  voice.started = true;
  scheduleEndFade(voice, inst, lead + MIN_RAMP);
}
function stopStream(inst, voice, when) {
  clearTimeout(voice.stopTimer);
  voice.stopTimer = null;
  const audio = inst.audio;
  function finish() {
    voice.stopTimer = null;
    if (audio.playing === voice) {
      audio.playing = null;
      if (audio.element) {
        audio.element.pause();
      }
    }
    releaseVoice(voice);
  }
  let delay = 0;
  if (when !== void 0) {
    delay = when - getAudioContext().currentTime;
  }
  if (delay <= 0) {
    finish();
  } else {
    voice.stopTimer = setTimeout(finish, delay * 1e3);
  }
}
function streamEnded(audio) {
  const voice = audio.playing;
  audio.playing = null;
  if (voice) {
    releaseVoice(voice);
  }
}
function admitInstance(inst, begin, content) {
  const inherit = inst.inherit;
  inst.inherit = false;
  const voice = admitVoice({
    "begin": begin,
    "end": Infinity,
    "protected": inst.loop,
    "inherit": inherit,
    "build": () => {
      if (inst.stream) {
        return buildStreamVoice(inst, begin, content);
      }
      return buildDecodeVoice(inst, begin, content);
    }
  });
  if (voice === null) {
    return false;
  }
  inst.voice = voice;
  inst.state = "voiced";
  inst.resumePosition = null;
  return true;
}
function startInstance(inst) {
  const context = getAudioContext();
  const now = context.currentTime;
  const lead = getScheduleLead();
  let begin = inst.start;
  let content = inst.consumed;
  if (begin < lead) {
    content = contentAt(inst, lead);
    const remaining = inst.budget - content;
    if (remaining < MIN_RAMP * rateAt(inst.segments, lead)) {
      completeInstance(inst);
      return;
    }
    if (!inst.loop && now - inst.start > LATE_GRACE) {
      completeInstance(inst);
      return;
    }
    begin = lead;
  }
  let admitted = false;
  try {
    admitted = admitInstance(inst, begin, content);
  } finally {
    if (!admitted) {
      completeInstance(inst);
    }
  }
}
function scheduleInstance(inst) {
  const context = getAudioContext();
  const now = context.currentTime;
  inst.start = Math.max(now + inst.delay, getScheduleLead(), inst.after);
  inst.segments = [{ "time": inst.start, "rate": inst.rate }];
  if (shouldCreate(inst.start, now)) {
    startInstance(inst);
    return;
  }
  addPending({
    "id": inst.id,
    "kind": "audio",
    "start": inst.start,
    "run": () => {
      inst.pending = false;
      startInstance(inst);
    }
  }, "playAudio");
  inst.pending = true;
}
function pauseInstance(inst) {
  if (inst.deferred) {
    cancelUnlock(inst.deferred);
    inst.deferred = null;
  }
  if (inst.state === "paused") {
    return;
  }
  if (inst.pending) {
    removePending(inst.id);
    inst.pending = false;
  }
  const voice = inst.voice;
  inst.voice = null;
  inst.state = "paused";
  if (!voice) {
    return;
  }
  const lead = getScheduleLead();
  if (voice.begin >= lead || !voice.started) {
    inst.consumed = 0;
  } else {
    inst.consumed = Math.min(contentAt(inst, lead), inst.budget);
    if (inst.stream && inst.audio.element) {
      inst.resumePosition = inst.audio.element.currentTime;
    }
  }
  inst.segments = null;
  stopVoice(voice, null, "stop");
}
function resumeInstance(inst) {
  if (inst.state !== "paused") {
    return;
  }
  if (inst.budget - inst.consumed < MIN_RAMP * inst.rate) {
    completeInstance(inst);
    return;
  }
  if (isLocked()) {
    if (inst.loop && !inst.deferred) {
      inst.deferred = () => {
        inst.deferred = null;
        resumeInstance(inst);
      };
      onUnlock(inst.deferred);
    }
    return;
  }
  const lead = getScheduleLead();
  inst.start = lead;
  inst.segments = [{ "time": lead, "rate": inst.rate }];
  let admitted = false;
  try {
    admitted = admitInstance(inst, lead, inst.consumed);
  } finally {
    if (!admitted) {
      inst.segments = null;
    }
  }
}
function changeInstance(inst, volume, rate, pan) {
  if (volume !== null) {
    inst.volume = volume;
  }
  if (pan !== null) {
    inst.pan = pan;
  }
  if (rate !== null) {
    inst.rate = rate;
  }
  const voice = inst.voice;
  if (!voice) {
    if (rate !== null && inst.segments && inst.state === "pending") {
      addRateSegment(inst.segments, getScheduleLead(), rate);
    }
    return;
  }
  const lead = getScheduleLead();
  const time = Math.max(lead, voice.begin);
  if (volume !== null || pan !== null) {
    inst.volumeRamp = rampControl(
      inst.volumeNode.gain,
      inst.volumeRamp,
      instanceGain(inst),
      time
    );
  }
  if (pan !== null) {
    inst.panRamp = rampControl(inst.panner.pan, inst.panRamp, pan, time);
  }
  if (rate === null) {
    return;
  }
  if (inst.stream) {
    addRateSegment(inst.segments, lead, rate);
    if (inst.audio.playing === voice && inst.audio.element) {
      inst.audio.element.playbackRate = rate;
    }
  } else {
    addRateSegment(inst.segments, time, rate);
    let step = time;
    if (time <= voice.begin) {
      step = lead;
    }
    const param = voice.source.playbackRate;
    param.cancelScheduledValues(step);
    param.setValueAtTime(rate, step);
  }
  updateEndFade(inst, voice);
}
function validateRange(name, param, value, min, max, code) {
  if (!(value >= min && value <= max)) {
    let message = `${name}: Parameter ${param} must be a number `;
    if (max === Infinity) {
      message += `greater than or equal to ${min}.`;
    } else {
      message += `between ${min} and ${max}.`;
    }
    throwError2(RangeError, message, code);
  }
}
function validatePlaybackRate(name, rate, stream) {
  if (!isPlaybackRateValid(rate, stream)) {
    let range = DECODE_RATES;
    let mode = "decoded";
    if (stream) {
      range = STREAM_RATES;
      mode = "streamed";
    }
    throwError2(
      RangeError,
      `${name}: Parameter playbackRate must be between ${range[0]} and ${range[1]} for ${mode} audio.`,
      "INVALID_PLAYBACK_RATE"
    );
  }
}
function getAudioBuffer(name) {
  if (Object.prototype.hasOwnProperty.call(m_audio, name)) {
    return m_audio[name].buffer;
  }
  return null;
}
function registerSamples(pluginApi) {
  const utils = pluginApi.utils;
  pluginApi.addCommand("loadAudio", loadAudio, false, ["src", "name", "stream"]);
  function loadAudio(options) {
    const src = options.src;
    const audioName = options.name;
    let stream = false;
    if (options.stream !== null && options.stream !== void 0) {
      stream = options.stream;
    }
    if (!src || typeof src !== "string") {
      throwError2(
        TypeError,
        "loadAudio: Parameter src must be a non-empty string.",
        "INVALID_SRC"
      );
    }
    if (typeof stream !== "boolean") {
      throwError2(
        TypeError,
        "loadAudio: Parameter stream must be a boolean.",
        "INVALID_STREAM"
      );
    }
    if (isFileUrl(src)) {
      throwError2(
        Error,
        "loadAudio: Audio requires an HTTP(S) server; file: URLs are not supported.",
        "UNSUPPORTED_PROTOCOL"
      );
    }
    let audioId;
    if (audioName) {
      if (m_audio[audioName]) {
        throwError2(
          Error,
          `loadAudio: Audio name "${audioName}" is already in use.`,
          "DUPLICATE_AUDIO_NAME"
        );
      }
      audioId = audioName;
    } else {
      do {
        audioId = "audio_" + m_nextAudioId;
        m_nextAudioId += 1;
      } while (m_audio[audioId]);
    }
    const audio = {
      "id": audioId,
      "src": src,
      "stream": stream,
      "status": "loading",
      "removed": false,
      "settled": false,
      "controller": null,
      "retryTimer": null,
      "detach": null,
      "ended": null,
      "buffer": null,
      "element": null,
      "sourceNode": null,
      "length": 0,
      "instances": /* @__PURE__ */ new Set(),
      "current": null,
      "playing": null
    };
    pluginApi.wait();
    try {
      if (stream) {
        loadStream(pluginApi, audio, RETRY_COUNT);
      } else {
        loadDecoded(pluginApi, audio, RETRY_COUNT);
      }
    } catch (error) {
      disposeAudio(pluginApi, audio);
      throw error;
    }
    m_audio[audioId] = audio;
    return audioId;
  }
  pluginApi.addCommand("removeAudio", removeAudio, false, ["audioId"]);
  function removeAudio(options) {
    const audioId = options.audioId;
    if (typeof audioId !== "string" || !m_audio[audioId]) {
      throwError2(Error, `removeAudio: Audio "${audioId}" not found.`, "AUDIO_NOT_FOUND");
    }
    const audio = m_audio[audioId];
    delete m_audio[audioId];
    disposeAudio(pluginApi, audio);
  }
  pluginApi.addCommand("playAudio", playAudio, false, [
    "audioId",
    "volume",
    "startTime",
    "duration",
    "loop",
    "playbackRate",
    "pan",
    "delay"
  ]);
  function playAudio(options) {
    const audioId = options.audioId;
    const volume = utils.getFloat(options.volume, 1);
    const startTime = utils.getFloat(options.startTime, 0);
    const duration = utils.getFloat(options.duration, 0);
    const playbackRate = utils.getFloat(options.playbackRate, 1);
    const pan = utils.getFloat(options.pan, 0);
    const delay = utils.getFloat(options.delay, 0);
    let loop = false;
    if (options.loop !== null && options.loop !== void 0) {
      loop = options.loop;
    }
    if (typeof audioId !== "string" || !m_audio[audioId]) {
      throwError2(Error, `playAudio: Audio "${audioId}" not found.`, "AUDIO_NOT_FOUND");
    }
    const audio = m_audio[audioId];
    validateRange("playAudio", "volume", volume, 0, 1, "INVALID_VOLUME");
    validateRange("playAudio", "startTime", startTime, 0, Infinity, "INVALID_START_TIME");
    validateRange("playAudio", "duration", duration, 0, Infinity, "INVALID_DURATION");
    if (typeof loop !== "boolean") {
      throwError2(TypeError, "playAudio: Parameter loop must be a boolean.", "INVALID_LOOP");
    }
    validatePlaybackRate("playAudio", playbackRate, audio.stream);
    validateRange("playAudio", "pan", pan, -1, 1, "INVALID_PAN");
    validateRange("playAudio", "delay", delay, 0, Infinity, "INVALID_DELAY");
    if (audio.status !== "ready") {
      throwError2(
        Error,
        `playAudio: Audio "${audioId}" is not loaded.`,
        "AUDIO_NOT_LOADED"
      );
    }
    const id = m_nextInstanceId;
    m_nextInstanceId += 1;
    const budget = resolveBudget(audio.length, startTime, duration, loop);
    if (!(budget > 0)) {
      return id;
    }
    const locked = isLocked();
    if (locked && !loop) {
      return id;
    }
    const inst = {
      "id": id,
      "audio": audio,
      "stream": audio.stream,
      "mono": !audio.stream && audio.buffer.numberOfChannels === 1,
      "volume": volume,
      "rate": playbackRate,
      "pan": pan,
      "loop": loop,
      "startTime": startTime,
      "delay": delay,
      "budget": budget,
      "consumed": 0,
      "segments": null,
      "start": 0,
      "after": 0,
      "state": "pending",
      "voice": null,
      "pending": false,
      "deferred": null,
      "inherit": false,
      "resumePosition": null,
      "volumeNode": null,
      "panner": null,
      "volumeRamp": null,
      "panRamp": null
    };
    if (audio.stream && audio.current) {
      const outgoing = audio.current;
      const outgoingVoice = outgoing.voice;
      if (outgoingVoice && outgoingVoice.slotEnd !== null) {
        inst.inherit = true;
      }
      stopInstance(outgoing);
      if (outgoingVoice && !outgoingVoice.disposed) {
        inst.after = outgoingVoice.end;
      }
    }
    m_instances.set(id, inst);
    audio.instances.add(inst);
    if (audio.stream) {
      audio.current = inst;
    }
    if (locked) {
      inst.deferred = () => {
        inst.deferred = null;
        try {
          scheduleInstance(inst);
        } catch (error) {
          completeInstance(inst);
          throw error;
        }
      };
      onUnlock(inst.deferred);
      return id;
    }
    try {
      scheduleInstance(inst);
    } catch (error) {
      completeInstance(inst);
      throw error;
    }
    return id;
  }
  pluginApi.addCommand("stopAudio", stopAudio, false, ["id"]);
  function stopAudio(options) {
    for (const inst of resolveInstances(options.id, "stopAudio")) {
      stopInstance(inst);
    }
  }
  pluginApi.addCommand("pauseAudio", pauseAudio, false, ["id"]);
  function pauseAudio(options) {
    for (const inst of resolveInstances(options.id, "pauseAudio")) {
      pauseInstance(inst);
    }
  }
  pluginApi.addCommand("resumeAudio", resumeAudio, false, ["id"]);
  function resumeAudio(options) {
    for (const inst of resolveInstances(options.id, "resumeAudio")) {
      resumeInstance(inst);
    }
  }
  pluginApi.addCommand(
    "setAudio",
    setAudio,
    false,
    ["instanceId", "volume", "playbackRate", "pan"]
  );
  function setAudio(options) {
    const instanceId = options.instanceId;
    const volume = utils.getFloat(options.volume, null);
    const playbackRate = utils.getFloat(options.playbackRate, null);
    const pan = utils.getFloat(options.pan, null);
    if (typeof instanceId !== "number") {
      throwError2(
        TypeError,
        "setAudio: Parameter instanceId must be an instance ID.",
        "INVALID_AUDIO_ID"
      );
    }
    if (volume !== null) {
      validateRange("setAudio", "volume", volume, 0, 1, "INVALID_VOLUME");
    }
    if (pan !== null) {
      validateRange("setAudio", "pan", pan, -1, 1, "INVALID_PAN");
    }
    const instances = resolveInstances(instanceId, "setAudio");
    if (playbackRate !== null) {
      let stream = false;
      if (instances.length > 0) {
        stream = instances[0].stream;
      }
      validatePlaybackRate("setAudio", playbackRate, stream);
    }
    for (const inst of instances) {
      changeInstance(inst, volume, playbackRate, pan);
    }
  }
}

// plugins/sound/index.js
var SERVICE_VERSION = 1;
function playSoundPlugin(pluginApi) {
  registerSamples(pluginApi);
  registerVoices(pluginApi);
  registerVolume(pluginApi);
  registerPlay(pluginApi);
  startLimiterProbe();
  pluginApi.provideService({
    "version": SERVICE_VERSION,
    "getContext": getAudioContext,
    "createVoice": createVoice,
    "registerSource": registerSource,
    "scheduleEnvelope": scheduleEnvelope,
    "stopVoice": (soundId, when) => {
      stopSoundById(soundId, when ?? null);
    },
    "setBusVolume": setBusVolume,
    "setBusInsert": setBusInsert2,
    "tapBus": tapBus2,
    "registerPlayExtension": registerPlayExtension,
    "observePlay": observePlay,
    "getAudioBuffer": getAudioBuffer
  });
}
function validateBus(name, bus, allowOutput) {
  let names = "sfx, music, audio, master";
  if (allowOutput) {
    if (bus === "output") {
      return;
    }
    names += ", output";
  }
  if (bus !== "master" && BUS_NAMES.indexOf(bus) === -1) {
    const error = new Error(`${name}: Parameter bus must be one of: ${names}.`);
    error.code = "INVALID_BUS";
    throw error;
  }
}
function validateVolume(name, volume) {
  if (!(volume >= 0 && volume <= 1)) {
    const error = new RangeError(
      `${name}: Parameter volume must be a number between 0 and 1.`
    );
    error.code = "INVALID_VOLUME";
    throw error;
  }
}
function setBusVolume(bus, volume) {
  validateBus("setBusVolume", bus);
  validateVolume("setBusVolume", volume);
  if (bus === "master") {
    setMasterVolume(volume);
  } else {
    setBusOutputVolume(bus, volume);
  }
}
function setBusInsert2(bus, insert) {
  validateBus("setBusInsert", bus);
  if (insert !== null && !hasMembers(insert, ["input", "output"], ["dispose"])) {
    const error = new TypeError(
      "setBusInsert: Parameter insert must be null or provide input, output, and dispose."
    );
    error.code = "INVALID_INSERT";
    throw error;
  }
  setBusInsert(bus, insert);
}
function tapBus2(bus, node) {
  validateBus("tapBus", bus, true);
  if (!(node instanceof AudioNode)) {
    const error = new TypeError("tapBus: Parameter node must be an AudioNode.");
    error.code = "INVALID_TAP";
    throw error;
  }
  return tapBus(bus, node);
}
function registerVolume(pluginApi) {
  const utils = pluginApi.utils;
  pluginApi.addCommand("setVolume", setVolume, false, ["volume"]);
  function setVolume(options) {
    const volume = utils.getFloat(options.volume, 0.75);
    validateVolume("setVolume", volume);
    setMasterVolume(volume);
  }
  pluginApi.addCommand("setBusVolume", setBusVolumeCommand, false, ["bus", "volume"]);
  function setBusVolumeCommand(options) {
    setBusVolume(options.bus, utils.getFloat(options.volume, NaN));
  }
  pluginApi.addCommand("setSoundLimiter", setSoundLimiter, false, ["enabled"]);
  function setSoundLimiter(options) {
    if (typeof options.enabled !== "boolean") {
      const error = new TypeError("setSoundLimiter: Parameter enabled must be a boolean.");
      error.code = "INVALID_ENABLED";
      throw error;
    }
    setLimiterEnabled(options.enabled);
  }
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "sound",
    "version": "2.0.0",
    "description": "Music playback and sound effects using Web Audio API",
    "init": playSoundPlugin
  });
}

// plugins/pointer/shared-events.js
function throwCode6(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function createEventHelpers(pluginApi) {
  const utils = pluginApi.utils;
  function onevent(mode, fn, once, hitBox, modes, name, listenerArr, customData) {
    checkMode2(name, mode, modes);
    checkFunction2(name, fn);
    if (once != null && typeof once !== "boolean") {
      throwCode6(TypeError, `${name}: once must be a boolean.`, "INVALID_ONCE");
    }
    once = once === true;
    if (hitBox != null) {
      if (typeof hitBox !== "object" || !Number.isFinite(hitBox.x) || !Number.isFinite(hitBox.y) || !Number.isFinite(hitBox.width) || !Number.isFinite(hitBox.height)) {
        throwCode6(
          TypeError,
          `${name}: hitBox must be an object with properties x, y, width, and height whose values are finite numbers.`,
          "INVALID_HITBOX"
        );
      }
      if (hitBox.width < 0 || hitBox.height < 0) {
        throwCode6(
          RangeError,
          `${name}: hitBox width and height must not be negative.`,
          "INVALID_HITBOX"
        );
      }
    }
    if (!listenerArr[mode]) {
      listenerArr[mode] = [];
    }
    for (const listener of listenerArr[mode]) {
      if (listener.fn === fn) {
        return;
      }
    }
    listenerArr[mode].push({
      "fn": fn,
      "once": once,
      "hitBox": hitBox,
      "armedPointers": null,
      "isRemoved": false,
      "customData": customData,
      "name": name
    });
  }
  function offevent(mode, fn, modes, name, listenerArr, clearType) {
    if (mode == null && fn == null) {
      throwCode6(
        TypeError,
        `${name}: mode or fn is required. To remove every handler, call clearEvents( "${clearType}" ).`,
        "INVALID_MODE"
      );
    }
    let offModes = modes;
    if (mode != null) {
      checkMode2(name, mode, modes);
      offModes = [mode];
    }
    if (fn != null) {
      checkFunction2(name, fn);
    }
    for (const offMode of offModes) {
      const listeners = listenerArr[offMode];
      if (!listeners) {
        continue;
      }
      for (let i = listeners.length - 1; i >= 0; i--) {
        if (fn == null || listeners[i].fn === fn) {
          removeListener(listenerArr, offMode, listeners[i]);
        }
      }
    }
  }
  function checkMode2(name, mode, modes) {
    const message = `${name}: mode must be one of the following: ${modes.join(", ")}.`;
    if (typeof mode !== "string") {
      throwCode6(TypeError, message, "INVALID_MODE");
    }
    if (!modes.includes(mode)) {
      throwCode6(RangeError, message, "INVALID_MODE");
    }
  }
  function checkFunction2(name, fn) {
    if (typeof fn !== "function") {
      throwCode6(TypeError, `${name}: fn must be a function.`, "INVALID_FUNCTION");
    }
  }
  function removeListener(listenerArr, mode, listener) {
    listener.isRemoved = true;
    const listeners = listenerArr[mode];
    if (!listeners) {
      return;
    }
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    if (listeners.length === 0) {
      delete listenerArr[mode];
    }
  }
  function removeAllListeners(listenerArr) {
    for (const mode in listenerArr) {
      for (const listener of listenerArr[mode]) {
        listener.isRemoved = true;
      }
    }
  }
  function runListener(listenerArr, mode, listener, data) {
    if (listener.once) {
      removeListener(listenerArr, mode, listener);
    }
    try {
      listener.fn(data, listener.customData);
    } catch (error) {
      console.error(`${listener.name}: Handler for "${mode}" failed:`, error);
    }
  }
  function triggerEventListeners(mode, data, listenerArr) {
    if (!listenerArr[mode]) {
      return;
    }
    const temp = listenerArr[mode].slice();
    for (let i = 0; i < temp.length; i++) {
      const listener = temp[i];
      if (listener.isRemoved) {
        continue;
      }
      if (listener.hitBox) {
        let isHit = false;
        let newData;
        if (Array.isArray(data)) {
          newData = [];
          for (let j = 0; j < data.length; j++) {
            const pos = data[j];
            if (utils.inRange(pos, listener.hitBox)) {
              newData.push(pos);
            }
          }
          if (newData.length > 0) {
            isHit = true;
          }
          Object.freeze(newData);
        } else {
          newData = data;
          if (utils.inRange(data, listener.hitBox)) {
            isHit = true;
          }
        }
        if (isHit) {
          runListener(listenerArr, mode, listener, newData);
        }
      } else {
        runListener(listenerArr, mode, listener, data);
      }
    }
  }
  function triggerClickListeners2(data, listenerArr, action, pointerId) {
    if (!listenerArr.click) {
      return;
    }
    const temp = listenerArr.click.slice();
    for (const listener of temp) {
      if (listener.isRemoved) {
        continue;
      }
      const isHit = utils.inRange(data, listener.hitBox);
      if (action === "down") {
        if (isHit) {
          if (listener.armedPointers === null) {
            listener.armedPointers = /* @__PURE__ */ new Set();
          }
          listener.armedPointers.add(pointerId);
        }
      } else if (listener.armedPointers !== null) {
        const wasArmed = listener.armedPointers.delete(pointerId);
        if (wasArmed && isHit && action === "up") {
          runListener(listenerArr, "click", listener, data);
        }
      }
    }
  }
  return {
    "onevent": onevent,
    "offevent": offevent,
    "removeAllListeners": removeAllListeners,
    "triggerEventListeners": triggerEventListeners,
    "triggerClickListeners": triggerClickListeners2
  };
}

// plugins/pointer/target.js
function validatePointerTarget(screenData, command) {
  if (screenData.isOffscreen) {
    const error = new TypeError(
      `${command}: Screen ${screenData.id} is offscreen and cannot receive pointer input. Call ${command}() on an onscreen screen, or select an onscreen screen with setScreen() first.`
    );
    error.code = "OFFSCREEN_INPUT_UNSUPPORTED";
    throw error;
  }
}
function pointerPosition(screenData, event) {
  const rect = getCanvasContentRect(screenData.canvas);
  screenData.clientRect = rect;
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return {
    "x": Math.floor((event.clientX - rect.left) / rect.width * screenData.width),
    "y": Math.floor((event.clientY - rect.top) / rect.height * screenData.height)
  };
}
function throwCode7(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function readIsEnabled(command, isEnabled) {
  if (isEnabled == null) {
    return false;
  }
  if (typeof isEnabled !== "boolean") {
    throwCode7(TypeError, `${command}: isEnabled must be a boolean.`, "INVALID_IS_ENABLED");
  }
  return isEnabled;
}
function createPointerData(record) {
  return Object.freeze({
    "x": record.x,
    "y": record.y,
    "lastX": record.lastX,
    "lastY": record.lastY,
    "buttons": record.buttons,
    "action": record.action,
    "type": record.type,
    "id": record.id,
    "cancelled": record.cancelled
  });
}
function isOnScreen(screenData, position) {
  return position !== null && position.x >= 0 && position.y >= 0 && position.x < screenData.width && position.y < screenData.height;
}

// plugins/pointer/listeners.js
var EVENT_TYPES = ["pointerdown", "pointermove", "pointerup", "pointercancel"];
var m_handlers2 = {};
var m_tracked = /* @__PURE__ */ new WeakMap();
var m_getScreenData = null;
function setHandlers(kind, handlers, getScreenData2) {
  m_handlers2[kind] = handlers;
  m_getScreenData = getScreenData2;
}
function track(screenData, kind) {
  let kinds = m_tracked.get(screenData);
  if (!kinds) {
    kinds = /* @__PURE__ */ new Set();
    m_tracked.set(screenData, kinds);
    for (const type of EVENT_TYPES) {
      screenData.canvas.addEventListener(type, onPointerEvent);
    }
  }
  kinds.add(kind);
}
function untrack(screenData, kind) {
  const kinds = m_tracked.get(screenData);
  if (!kinds) {
    return;
  }
  kinds.delete(kind);
  if (kinds.size === 0) {
    m_tracked.delete(screenData);
    for (const type of EVENT_TYPES) {
      screenData.canvas.removeEventListener(type, onPointerEvent);
    }
  }
}
function onPointerEvent(e) {
  const screenData = m_getScreenData(e);
  if (!screenData) {
    return;
  }
  let kind = "mouse";
  if (e.pointerType === "touch") {
    kind = "touch";
  }
  const kinds = m_tracked.get(screenData);
  if (!kinds || !kinds.has(kind)) {
    return;
  }
  const isAccepted = m_handlers2[kind][e.type](screenData, e);
  if (e.type === "pointerdown" && isAccepted) {
    capturePointer(screenData.canvas, e.pointerId);
  }
}
function capturePointer(canvas, pointerId) {
  try {
    canvas.setPointerCapture(pointerId);
  } catch (error) {
  }
}

// plugins/pointer/touch.js
var m_startTouchInternal = null;
var NO_TOUCHES = Object.freeze([]);
function startTouchInternal(screenData) {
  if (m_startTouchInternal) {
    m_startTouchInternal(screenData);
  }
}
function registerTouch(pluginApi, helpers) {
  const m_onevent = helpers.onevent;
  const m_offevent = helpers.offevent;
  const m_removeAllListeners = helpers.removeAllListeners;
  const m_triggerEventListeners2 = helpers.triggerEventListeners;
  let m_isVisibilityListening = false;
  const m_touchActions = /* @__PURE__ */ new WeakMap();
  pluginApi.addScreenDataItem("touchStopped", false);
  pluginApi.addScreenDataItem("touchStarted", false);
  pluginApi.addScreenDataItem("touches", {});
  pluginApi.addScreenDataItem("touchList", null);
  pluginApi.addScreenDataItem("primaryTouchId", null);
  pluginApi.addScreenDataItem("isPinchZoomEnabled", null);
  pluginApi.addScreenDataItem("touchPress", null);
  pluginApi.addScreenDataItem("onTouchEventListeners", {});
  pluginApi.addScreenInitFunction(initTouchData);
  pluginApi.addCommand("startTouch", startTouch, true, []);
  pluginApi.addCommand("stopTouch", stopTouch, true, []);
  pluginApi.addCommand("inTouch", inTouch, true, []);
  pluginApi.addCommand(
    "onTouch",
    onTouch,
    true,
    ["mode", "fn", "once", "hitBox", "customData"]
  );
  pluginApi.addCommand("offTouch", offTouch, true, ["mode", "fn"]);
  pluginApi.addCommand("setPinchZoom", setPinchZoom, true, ["isEnabled"]);
  function initTouchData(screenData) {
    screenData.touchList = NO_TOUCHES;
    screenData.onTouchEventListeners = {
      "down": [],
      "up": [],
      "move": []
    };
  }
  setHandlers("touch", {
    "pointerdown": touchStart,
    "pointermove": touchMove,
    "pointerup": (screenData, e) => endTouches(screenData, e, false),
    "pointercancel": (screenData, e) => endTouches(screenData, e, true)
  }, getScreenDataFromEvent);
  function startTouchInternal2(screenData) {
    if (!screenData.touchStopped) {
      startTouch(screenData);
    }
  }
  m_startTouchInternal = startTouchInternal2;
  function startTouch(screenData) {
    validatePointerTarget(screenData, "startTouch");
    screenData.touchStopped = false;
    if (!m_isVisibilityListening) {
      document.addEventListener("visibilitychange", onVisibilityChangeTouch);
      m_isVisibilityListening = true;
    }
    if (!screenData.touchStarted) {
      if (screenData.isPinchZoomEnabled === null) {
        m_touchActions.set(screenData, screenData.canvas.style.touchAction);
        screenData.canvas.style.touchAction = "none";
      }
      track(screenData, "touch");
      screenData.touchStarted = true;
    }
  }
  function stopTouch(screenData) {
    releaseHeldTouches(screenData);
    screenData.touchPress = null;
    if (screenData.press !== null && screenData.press.type === "touch") {
      screenData.press = null;
    }
    screenData.touchStopped = true;
    if (screenData.touchStarted) {
      untrack(screenData, "touch");
      if (m_touchActions.has(screenData)) {
        screenData.canvas.style.touchAction = m_touchActions.get(screenData);
        m_touchActions.delete(screenData);
      }
      screenData.touchStarted = false;
    }
  }
  function inTouch(screenData) {
    validatePointerTarget(screenData, "inTouch");
    startTouchInternal2(screenData);
    return screenData.touchList;
  }
  function onTouch(screenData, options) {
    validatePointerTarget(screenData, "onTouch");
    const mode = options.mode;
    const fn = options.fn;
    const once = options.once;
    const hitBox = options.hitBox;
    const customData = options.customData;
    checkRenamedMode(mode, "onTouch");
    m_onevent(
      mode,
      fn,
      once,
      hitBox,
      ["down", "up", "move"],
      "onTouch",
      screenData.onTouchEventListeners,
      customData
    );
    startTouchInternal2(screenData);
  }
  function offTouch(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    checkRenamedMode(mode, "offTouch");
    m_offevent(
      mode,
      fn,
      ["down", "up", "move"],
      "offTouch",
      screenData.onTouchEventListeners,
      "touch"
    );
  }
  function checkRenamedMode(mode, command) {
    const renamed = { "start": "down", "end": "up" };
    if (mode === "start" || mode === "end") {
      throwCode7(
        RangeError,
        `${command}: mode "${mode}" is now "${renamed[mode]}"; touch modes are down, up, and move.`,
        "INVALID_MODE"
      );
    }
  }
  function setPinchZoom(screenData, options) {
    validatePointerTarget(screenData, "setPinchZoom");
    const isEnabled = readIsEnabled("setPinchZoom", options.isEnabled);
    screenData.isPinchZoomEnabled = isEnabled;
    m_touchActions.delete(screenData);
    if (isEnabled) {
      screenData.canvas.style.touchAction = "pinch-zoom";
    } else {
      screenData.canvas.style.touchAction = "none";
    }
  }
  function touchStart(screenData, e) {
    let isIdle = true;
    for (const id in screenData.touches) {
      isIdle = false;
      break;
    }
    const changed = updateTouch(screenData, e, "down", false);
    if (isIdle && changed.length > 0) {
      screenData.primaryTouchId = changed[0].id;
    }
    if (changed.length === 0) {
      return false;
    }
    const primary = findTouch(changed, screenData.primaryTouchId);
    if (primary) {
      setTouchPress(screenData, primary, primary.action, 1);
    }
    updatePress(screenData);
    const pressData = screenData.press;
    m_triggerEventListeners2("down", changed, screenData.onTouchEventListeners);
    if (!isTracking(screenData)) {
      return false;
    }
    if (primary) {
      triggerPressListeners(screenData, "down", pressData);
      if (!isTracking(screenData)) {
        return false;
      }
    }
    for (const touch of changed) {
      triggerClickListeners(screenData, touch, "down", touch.id);
    }
    return true;
  }
  function touchMove(screenData, e) {
    const changed = updateTouch(screenData, e, "move", false);
    if (changed.length === 0) {
      return;
    }
    const primary = findTouch(changed, screenData.primaryTouchId);
    if (primary) {
      setTouchPress(screenData, primary, primary.action, 1);
    }
    updatePress(screenData);
    const pressData = screenData.press;
    m_triggerEventListeners2("move", changed, screenData.onTouchEventListeners);
    if (primary && isTracking(screenData)) {
      triggerPressListeners(screenData, "move", pressData);
    }
  }
  function endTouches(screenData, e, isCancelled) {
    const changed = updateTouch(screenData, e, "up", isCancelled);
    dispatchTouchRelease(screenData, changed, isCancelled);
  }
  function releaseHeldTouches(screenData) {
    const changed = [];
    for (const id in screenData.touches) {
      const touch = screenData.touches[id];
      changed.push(createPointerData({
        ...touch,
        "lastX": touch.x,
        "lastY": touch.y,
        "buttons": 0,
        "action": "up",
        "cancelled": true
      }));
    }
    if (changed.length === 0) {
      return;
    }
    screenData.touches = {};
    screenData.touchList = NO_TOUCHES;
    dispatchTouchRelease(screenData, Object.freeze(changed), true);
  }
  function dispatchTouchRelease(screenData, changed, isCancelled) {
    if (changed.length === 0) {
      return;
    }
    const primary = findTouch(changed, screenData.primaryTouchId);
    if (primary) {
      setTouchPress(screenData, primary, "up", 0);
      screenData.primaryTouchId = null;
    }
    updatePress(screenData);
    const pressData = screenData.press;
    m_triggerEventListeners2("up", changed, screenData.onTouchEventListeners);
    if (primary && isTracking(screenData)) {
      triggerPressListeners(screenData, "up", pressData);
    }
    if (screenData.isRemoved) {
      return;
    }
    if (!isTracking(screenData)) {
      isCancelled = true;
    }
    for (const touch of changed) {
      if (isCancelled) {
        triggerClickListeners(screenData, touch, "cancel", touch.id);
      } else {
        triggerClickListeners(screenData, touch, "up", touch.id);
      }
    }
  }
  function isTracking(screenData) {
    return !screenData.isRemoved && screenData.touchStarted === true;
  }
  function findTouch(touches, id) {
    for (const touch of touches) {
      if (touch.id === id) {
        return touch;
      }
    }
    return null;
  }
  function setTouchPress(screenData, touch, action, buttons) {
    screenData.touchPress = createPointerData({
      ...touch,
      "action": action,
      "buttons": buttons
    });
  }
  function updatePress(screenData) {
    if (screenData.touchPress !== null) {
      screenData.press = getTouchPress(screenData);
    }
  }
  function updateTouch(screenData, e, action, isCancelled) {
    const previous = screenData.touches[e.pointerId];
    let position = pointerPosition(screenData, e);
    if (action === "down") {
      if (!isOnScreen(screenData, position)) {
        return [];
      }
    } else if (!previous) {
      return [];
    } else if (!position) {
      position = previous;
    }
    let buttons = 1;
    if (action === "up") {
      buttons = 0;
    }
    let lastX = position.x;
    let lastY = position.y;
    if (previous) {
      lastX = previous.x;
      lastY = previous.y;
    }
    const touchData = createPointerData({
      "x": position.x,
      "y": position.y,
      "lastX": lastX,
      "lastY": lastY,
      "buttons": buttons,
      "action": action,
      "type": "touch",
      "id": e.pointerId,
      "cancelled": isCancelled
    });
    const newTouches = {};
    for (const id in screenData.touches) {
      newTouches[id] = screenData.touches[id];
    }
    if (action === "up") {
      delete newTouches[touchData.id];
    } else {
      newTouches[touchData.id] = touchData;
    }
    screenData.touches = newTouches;
    const touchList = [];
    for (const id in newTouches) {
      touchList.push(newTouches[id]);
    }
    screenData.touchList = Object.freeze(touchList);
    return Object.freeze([touchData]);
  }
  function getScreenDataFromEvent(e) {
    const screenId = e.target.dataset?.screenId;
    if (screenId === void 0) {
      return null;
    }
    return pluginApi.getScreenData("pointer-event", screenId);
  }
  function onVisibilityChangeTouch() {
    if (document.visibilityState !== "hidden") {
      return;
    }
    for (const screenData of pluginApi.getAllScreensData()) {
      if (screenData.touches) {
        releaseHeldTouches(screenData);
      }
    }
  }
  function clearTouchEvents(screenData) {
    m_removeAllListeners(screenData.onTouchEventListeners);
    screenData.onTouchEventListeners = {};
  }
  return {
    "stopTouch": stopTouch,
    "clearTouchEvents": clearTouchEvents
  };
}

// plugins/pointer/press.js
function registerPress(pluginApi, helpers) {
  const onevent = helpers.onevent;
  const offevent = helpers.offevent;
  const removeAllListeners = helpers.removeAllListeners;
  m_triggerEventListeners = helpers.triggerEventListeners;
  m_triggerClickListeners = helpers.triggerClickListeners;
  pluginApi.addScreenDataItem("press", null);
  pluginApi.addScreenDataItem("onPressEventListeners", {});
  pluginApi.addScreenDataItem("onClickEventListeners", {});
  pluginApi.addScreenInitFunction(initPressData);
  pluginApi.addCommand("inPress", inPress, true, []);
  pluginApi.addCommand(
    "onPress",
    onPress,
    true,
    ["mode", "fn", "once", "hitBox", "customData"]
  );
  pluginApi.addCommand("offPress", offPress, true, ["mode", "fn"]);
  pluginApi.addCommand("onClick", onClick, true, ["fn", "once", "hitBox", "customData"]);
  pluginApi.addCommand("offClick", offClick, true, ["fn"]);
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
  function inPress(screenData) {
    validatePointerTarget(screenData, "inPress");
    startMouseInternal(screenData);
    startTouchInternal(screenData);
    return screenData.press;
  }
  function onPress(screenData, options) {
    validatePointerTarget(screenData, "onPress");
    const mode = options.mode;
    const fn = options.fn;
    const once = options.once;
    const hitBox = options.hitBox;
    const customData = options.customData;
    onevent(
      mode,
      fn,
      once,
      hitBox,
      ["down", "up", "move"],
      "onPress",
      screenData.onPressEventListeners,
      customData
    );
    startMouseInternal(screenData);
    startTouchInternal(screenData);
  }
  function offPress(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    offevent(
      mode,
      fn,
      ["down", "up", "move"],
      "offPress",
      screenData.onPressEventListeners,
      "press"
    );
  }
  function onClick(screenData, options) {
    validatePointerTarget(screenData, "onClick");
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
    onevent(
      "click",
      fn,
      once,
      hitBox,
      ["click"],
      "onClick",
      screenData.onClickEventListeners,
      customData
    );
    startMouseInternal(screenData);
    startTouchInternal(screenData);
  }
  function offClick(screenData, options) {
    const fn = options.fn;
    offevent(
      "click",
      fn,
      ["click"],
      "offClick",
      screenData.onClickEventListeners,
      "click"
    );
  }
  function clearPressEvents(screenData) {
    removeAllListeners(screenData.onPressEventListeners);
    screenData.onPressEventListeners = {};
  }
  function clearClickEvents(screenData) {
    removeAllListeners(screenData.onClickEventListeners);
    screenData.onClickEventListeners = {};
  }
  return {
    "clearPressEvents": clearPressEvents,
    "clearClickEvents": clearClickEvents
  };
}
var m_triggerEventListeners = null;
var m_triggerClickListeners = null;
function triggerPressListeners(screenData, mode, data) {
  if (m_triggerEventListeners) {
    m_triggerEventListeners(mode, data, screenData.onPressEventListeners);
  }
}
function triggerClickListeners(screenData, data, action, pointerId) {
  if (m_triggerClickListeners) {
    if (action === "up") {
      data = createPointerData({ ...data, "action": "click" });
    }
    m_triggerClickListeners(data, screenData.onClickEventListeners, action, pointerId);
  }
}
var NO_TOUCHES2 = Object.freeze([]);
function getMousePress(mouseData) {
  return Object.freeze({ ...mouseData, "touches": NO_TOUCHES2 });
}
function getTouchPress(screenData) {
  return Object.freeze({ ...screenData.touchPress, "touches": screenData.touchList });
}

// plugins/pointer/mouse.js
var m_startMouseInternal = null;
var BUTTON_BITS = [1, 4, 2, 8, 16];
function startMouseInternal(screenData) {
  if (m_startMouseInternal) {
    m_startMouseInternal(screenData);
  }
}
function registerMouse(pluginApi, helpers) {
  const m_onevent = helpers.onevent;
  const m_offevent = helpers.offevent;
  const m_removeAllListeners = helpers.removeAllListeners;
  const m_triggerEventListeners2 = helpers.triggerEventListeners;
  const m_heldScreens = /* @__PURE__ */ new Set();
  let m_isVisibilityListening = false;
  pluginApi.addScreenDataItem("mouseStopped", false);
  pluginApi.addScreenDataItem("mouseStarted", false);
  pluginApi.addScreenDataItem("mouse", null);
  pluginApi.addScreenDataItem("isContextMenuEnabled", false);
  pluginApi.addScreenInitFunction(initContextMenu);
  pluginApi.addScreenDataItem("onMouseEventListeners", {
    "down": [],
    "up": [],
    "move": []
  });
  pluginApi.addCommand("startMouse", startMouse, true, []);
  pluginApi.addCommand("stopMouse", stopMouse, true, []);
  pluginApi.addCommand("inMouse", inMouse, true, []);
  pluginApi.addCommand("setContextMenu", setContextMenu, true, ["isEnabled"]);
  pluginApi.addCommand(
    "onMouse",
    onMouse,
    true,
    ["mode", "fn", "once", "hitBox", "customData"]
  );
  pluginApi.addCommand("offMouse", offMouse, true, ["mode", "fn"]);
  setHandlers("mouse", {
    "pointerdown": mouseDown,
    "pointermove": mouseMove,
    "pointerup": mouseUp,
    "pointercancel": releaseHeldMouse
  }, getScreenDataFromEvent);
  function startMouseInternal2(screenData) {
    if (screenData.mouseStopped === false) {
      startMouse(screenData);
    }
  }
  m_startMouseInternal = startMouseInternal2;
  function startMouse(screenData) {
    validatePointerTarget(screenData, "startMouse");
    screenData.mouseStopped = false;
    if (!m_isVisibilityListening) {
      document.addEventListener("visibilitychange", onVisibilityChangeMouse);
      m_isVisibilityListening = true;
    }
    if (!screenData.mouseStarted) {
      track(screenData, "mouse");
      screenData.mouseStarted = true;
    }
  }
  function stopMouse(screenData) {
    releaseHeldMouse(screenData);
    screenData.mouse = null;
    if (screenData.press !== null && screenData.press.type !== "touch") {
      screenData.press = null;
    }
    screenData.mouseStopped = true;
    if (screenData.mouseStarted) {
      untrack(screenData, "mouse");
      screenData.mouseStarted = false;
    }
  }
  function inMouse(screenData) {
    validatePointerTarget(screenData, "inMouse");
    startMouseInternal2(screenData);
    return screenData.mouse;
  }
  function initContextMenu(screenData) {
    if (screenData.isOffscreen || !screenData.canvas) {
      return;
    }
    screenData.canvas.addEventListener("contextmenu", onContextMenu);
  }
  function cleanupContextMenu(screenData) {
    if (screenData.isOffscreen || !screenData.canvas) {
      return;
    }
    screenData.canvas.removeEventListener("contextmenu", onContextMenu);
  }
  function setContextMenu(screenData, options) {
    validatePointerTarget(screenData, "setContextMenu");
    screenData.isContextMenuEnabled = readIsEnabled(
      "setContextMenu",
      options.isEnabled
    );
  }
  function onMouse(screenData, options) {
    validatePointerTarget(screenData, "onMouse");
    const mode = options.mode;
    const fn = options.fn;
    const once = options.once;
    const hitBox = options.hitBox;
    const customData = options.customData;
    m_onevent(
      mode,
      fn,
      once,
      hitBox,
      ["down", "up", "move"],
      "onMouse",
      screenData.onMouseEventListeners,
      customData
    );
    startMouseInternal2(screenData);
  }
  function offMouse(screenData, options) {
    const mode = options.mode;
    const fn = options.fn;
    m_offevent(
      mode,
      fn,
      ["down", "up", "move"],
      "offMouse",
      screenData.onMouseEventListeners,
      "mouse"
    );
  }
  function clearMouseEvents(screenData) {
    m_removeAllListeners(screenData.onMouseEventListeners);
    screenData.onMouseEventListeners = {
      "down": [],
      "up": [],
      "move": []
    };
  }
  function mouseMove(screenData, e) {
    if (e.button >= 0) {
      const bit = BUTTON_BITS[e.button];
      if (bit !== void 0 && (e.buttons & bit) !== 0) {
        mouseDown(screenData, e);
      } else {
        mouseUp(screenData, e);
      }
      return;
    }
    if (!updateMouse(screenData, e, "move", getHeldButtons(screenData) & e.buttons)) {
      return;
    }
    updateHeld(screenData);
    const pressData = screenData.press;
    m_triggerEventListeners2("move", screenData.mouse, screenData.onMouseEventListeners);
    if (isTracking(screenData)) {
      triggerPressListeners(screenData, "move", pressData);
    }
  }
  function mouseDown(screenData, e) {
    if (!isOnScreen(screenData, pointerPosition(screenData, e))) {
      return false;
    }
    let bit = BUTTON_BITS[e.button];
    if (bit === void 0) {
      bit = 0;
    }
    updateMouse(screenData, e, "down", getHeldButtons(screenData) & e.buttons | bit);
    updateHeld(screenData);
    const mouseData = screenData.mouse;
    const pressData = screenData.press;
    m_triggerEventListeners2("down", mouseData, screenData.onMouseEventListeners);
    if (!isTracking(screenData)) {
      return false;
    }
    triggerPressListeners(screenData, "down", pressData);
    if (!isTracking(screenData)) {
      return false;
    }
    if (e.button === 0) {
      triggerClickListeners(screenData, mouseData, "down", "mouse");
    }
    return true;
  }
  function mouseUp(screenData, e) {
    const bit = BUTTON_BITS[e.button];
    if (bit === void 0 || (getHeldButtons(screenData) & bit) === 0) {
      return;
    }
    updateMouse(screenData, e, "up", screenData.mouse.buttons & e.buttons & ~bit);
    updateHeld(screenData);
    if (e.button === 0) {
      dispatchRelease(screenData, "up");
    } else {
      dispatchRelease(screenData, "cancel");
    }
  }
  function releaseHeldMouse(screenData) {
    if (getHeldButtons(screenData) === 0) {
      return;
    }
    const mouse = screenData.mouse;
    setMouse(screenData, {
      "x": mouse.x,
      "y": mouse.y,
      "lastX": mouse.x,
      "lastY": mouse.y,
      "buttons": 0,
      "action": "up",
      "type": mouse.type,
      "id": mouse.id,
      "cancelled": true
    });
    updateHeld(screenData);
    dispatchRelease(screenData, "cancel");
  }
  function dispatchRelease(screenData, clickAction) {
    const mouseData = screenData.mouse;
    const pressData = screenData.press;
    m_triggerEventListeners2("up", mouseData, screenData.onMouseEventListeners);
    if (isTracking(screenData)) {
      triggerPressListeners(screenData, "up", pressData);
    }
    if (screenData.isRemoved) {
      return;
    }
    if (!isTracking(screenData)) {
      clickAction = "cancel";
    }
    triggerClickListeners(screenData, mouseData, clickAction, "mouse");
  }
  function isTracking(screenData) {
    return !screenData.isRemoved && screenData.mouseStarted === true;
  }
  function getHeldButtons(screenData) {
    if (screenData.mouse === null) {
      return 0;
    }
    return screenData.mouse.buttons;
  }
  function updateHeld(screenData) {
    if (getHeldButtons(screenData) !== 0) {
      m_heldScreens.add(screenData);
    } else {
      m_heldScreens.delete(screenData);
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
  function updateMouse(screenData, e, action, buttons) {
    let position = pointerPosition(screenData, e);
    if (!position) {
      position = screenData.mouse;
    }
    if (!position) {
      return false;
    }
    const { "x": x, "y": y } = position;
    let lastX = x;
    let lastY = y;
    if (screenData.mouse !== null) {
      lastX = screenData.mouse.x;
      lastY = screenData.mouse.y;
    }
    setMouse(screenData, {
      "x": x,
      "y": y,
      "lastX": lastX,
      "lastY": lastY,
      "buttons": buttons,
      "action": action,
      "type": getPointerType(e),
      "id": e.pointerId,
      "cancelled": false
    });
    return true;
  }
  function setMouse(screenData, record) {
    screenData.mouse = createPointerData(record);
    screenData.press = getMousePress(screenData.mouse);
  }
  function getPointerType(e) {
    if (e.pointerType === "pen") {
      return "pen";
    }
    return "mouse";
  }
  function getScreenDataFromEvent(e) {
    const screenId = e.target.dataset?.screenId;
    if (screenId === void 0) {
      return null;
    }
    return pluginApi.getScreenData("pointer-event", screenId);
  }
  function onVisibilityChangeMouse() {
    if (document.visibilityState !== "hidden") {
      return;
    }
    for (const screenData of Array.from(m_heldScreens)) {
      releaseHeldMouse(screenData);
    }
  }
  return {
    "stopMouse": stopMouse,
    "clearMouseEvents": clearMouseEvents,
    "cleanupContextMenu": cleanupContextMenu
  };
}

// plugins/pointer/wheel.js
var DOM_DELTA_LINE = 1;
var DOM_DELTA_PAGE = 2;
var LINE_HEIGHT = 16;
function registerWheel(pluginApi, helpers) {
  const m_onevent = helpers.onevent;
  const m_offevent = helpers.offevent;
  const m_removeAllListeners = helpers.removeAllListeners;
  const m_triggerEventListeners2 = helpers.triggerEventListeners;
  pluginApi.addScreenDataItem("onWheelEventListeners", {});
  pluginApi.addScreenDataItem("isWheelListening", false);
  pluginApi.addCommand("onWheel", onWheel, true, ["fn", "once", "hitBox", "customData"]);
  pluginApi.addCommand("offWheel", offWheel, true, ["fn"]);
  function onWheel(screenData, options) {
    validatePointerTarget(screenData, "onWheel");
    m_onevent(
      "wheel",
      options.fn,
      options.once,
      options.hitBox,
      ["wheel"],
      "onWheel",
      screenData.onWheelEventListeners,
      options.customData
    );
    updateListener(screenData);
  }
  function offWheel(screenData, options) {
    m_offevent(
      "wheel",
      options.fn,
      ["wheel"],
      "offWheel",
      screenData.onWheelEventListeners,
      "wheel"
    );
    updateListener(screenData);
  }
  function clearWheelEvents(screenData) {
    m_removeAllListeners(screenData.onWheelEventListeners);
    screenData.onWheelEventListeners = {};
    updateListener(screenData);
  }
  function updateListener(screenData) {
    const hasHandlers = screenData.onWheelEventListeners.wheel !== void 0;
    if (hasHandlers && !screenData.isWheelListening) {
      screenData.canvas.addEventListener("wheel", onWheelEvent, { "passive": false });
      screenData.isWheelListening = true;
    } else if (!hasHandlers && screenData.isWheelListening) {
      screenData.canvas.removeEventListener("wheel", onWheelEvent, { "passive": false });
      screenData.isWheelListening = false;
    }
  }
  function onWheelEvent(e) {
    const screenId = e.target.dataset?.screenId;
    if (screenId === void 0) {
      return;
    }
    const screenData = pluginApi.getScreenData("pointer-event", screenId);
    if (!screenData) {
      return;
    }
    if (screenData.onWheelEventListeners.wheel === void 0) {
      updateListener(screenData);
      return;
    }
    e.preventDefault();
    const position = pointerPosition(screenData, e);
    if (position === null) {
      return;
    }
    const scale = getDeltaScale(e.deltaMode);
    const data = Object.freeze({
      "x": position.x,
      "y": position.y,
      "deltaX": e.deltaX * scale.x,
      "deltaY": e.deltaY * scale.y
    });
    m_triggerEventListeners2("wheel", data, screenData.onWheelEventListeners);
    if (!screenData.isRemoved) {
      updateListener(screenData);
    }
  }
  return {
    "clearWheelEvents": clearWheelEvents
  };
}
function getDeltaScale(deltaMode) {
  if (deltaMode === DOM_DELTA_LINE) {
    return { "x": LINE_HEIGHT, "y": LINE_HEIGHT };
  }
  if (deltaMode === DOM_DELTA_PAGE) {
    return { "x": window.innerWidth, "y": window.innerHeight };
  }
  return { "x": 1, "y": 1 };
}

// plugins/pointer/index.js
function pointerPlugin(pluginApi) {
  const helpers = createEventHelpers(pluginApi);
  const mouseApi = registerMouse(pluginApi, helpers);
  const touchApi = registerTouch(pluginApi, helpers);
  const pressApi = registerPress(pluginApi, helpers);
  const wheelApi = registerWheel(pluginApi, helpers);
  registerScreenClear(pluginApi, "mouse", mouseApi.clearMouseEvents);
  registerScreenClear(pluginApi, "touch", touchApi.clearTouchEvents);
  registerScreenClear(pluginApi, "press", pressApi.clearPressEvents);
  registerScreenClear(pluginApi, "click", pressApi.clearClickEvents);
  registerScreenClear(pluginApi, "wheel", wheelApi.clearWheelEvents);
  pluginApi.addScreenCleanupFunction((screenData) => {
    mouseApi.clearMouseEvents(screenData);
    touchApi.clearTouchEvents(screenData);
    pressApi.clearPressEvents(screenData);
    pressApi.clearClickEvents(screenData);
    wheelApi.clearWheelEvents(screenData);
    if (screenData.mouseStarted) {
      mouseApi.stopMouse(screenData);
    }
    if (screenData.touchStarted) {
      touchApi.stopTouch(screenData);
    }
    mouseApi.cleanupContextMenu(screenData);
  });
}
function registerScreenClear(pluginApi, type, clear) {
  pluginApi.registerClearEvents(type, (screenData) => {
    if (screenData !== null) {
      clear(screenData);
    } else {
      for (const eachScreenData of pluginApi.getAllScreensData()) {
        clear(eachScreenData);
      }
    }
  });
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "pointer",
    "version": "2.0.0",
    "description": "Mouse and touch input handling for Pi.js",
    "init": pointerPlugin
  });
}

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
      const bounds = getVisibleBounds(screenData);
      if (polygonData.spans === null || polygonData.spanBounds !== bounds.key) {
        polygonData.spans = generateSpans(polygonData.coordinates, bounds);
        polygonData.spanBounds = bounds.key;
      }
      drawFill(screenData, polygonData, fillColor, outlineColor);
      if (fillColor.key === outlineColor.key) {
        return;
      }
    }
    drawOutline(screenData, polygonData.coordinates);
  }
}
function getPolygonData(points, getInt2) {
  if (!isPointCollection(points)) {
    throw createParameterError(
      "polygon: Parameter 'points' must be an array or typed array."
    );
  }
  const cached = m_polygonCache.get(points);
  if (cached) {
    return cached;
  }
  const coordinates = normalizePoints(points, getInt2);
  validatePolygon(coordinates);
  const polygonData = {
    "coordinates": coordinates,
    "spans": null,
    "spanBounds": null
  };
  m_polygonCache.set(points, polygonData);
  return polygonData;
}
function isPointCollection(value) {
  return Array.isArray(value) || ArrayBuffer.isView(value) && !(value instanceof DataView);
}
function normalizePoints(points, getInt2) {
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
      appendCoordinate(coordinates, point.x, point.y, getInt2);
    }
  } else {
    if (points.length % 2 !== 0) {
      throw createParameterError(
        "polygon: A flat points array must contain an even number of values."
      );
    }
    for (let i = 0; i < points.length; i += 2) {
      appendCoordinate(coordinates, points[i], points[i + 1], getInt2);
    }
  }
  removeConsecutiveDuplicates(coordinates);
  removeClosingDuplicate(coordinates);
  return new Float64Array(coordinates);
}
function appendCoordinate(coordinates, x, y, getInt2) {
  const parsedX = getInt2(x, null);
  const parsedY = getInt2(y, null);
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
function getVisibleBounds(screenData) {
  const view = screenData.view;
  const minX = view.clipX - view.originX;
  const minY = view.clipY - view.originY;
  const maxX = minX + view.clipWidth - 1;
  const maxY = minY + view.clipHeight - 1;
  return {
    "minX": minX,
    "minY": minY,
    "maxX": maxX,
    "maxY": maxY,
    "key": minX + "," + minY + "," + maxX + "," + maxY
  };
}
function generateSpans(coordinates, bounds) {
  const edges = buildEdgeTable(coordinates);
  const active = [];
  const spans = [];
  let edgeIndex = 0;
  if (edges.length === 0 || bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) {
    return new Int32Array(0);
  }
  let y = Math.max(edges[0].yMin, bounds.minY);
  while ((edgeIndex < edges.length || active.length > 0) && y <= bounds.maxY) {
    let length = 0;
    for (const edge of active) {
      if (y < edge.yMax) {
        active[length++] = edge;
      }
    }
    active.length = length;
    while (edgeIndex < edges.length && edges[edgeIndex].yMin <= y) {
      const edge = edges[edgeIndex++];
      if (y < edge.yMax) {
        edge.x += (y - edge.yMin) * edge.inverseSlope;
        active.push(edge);
      }
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
        const startX = Math.max(Math.round(leftX), bounds.minX);
        const endX = Math.min(Math.round(edge.x), bounds.maxX);
        if (startX <= endX) {
          appendSpan(spans, y, startX, endX);
        }
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

// src/index-full.js
var index_full_default = index_default;
export {
  index_default as $,
  index_full_default as default,
  index_default as pi
};
//# sourceMappingURL=pi.esm.js.map
