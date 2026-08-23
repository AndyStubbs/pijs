/**
 * Pi.js Graphics Library - Full Version
 * 
 * A powerful, lightweight JavaScript graphics library for web applications.
 * This version includes the complete core functionality plus additional
 * plugins for extended features.
 * 
 * @version 2.0.3
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
 * 
 * For the core-only version, use pi.lite.js
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
    queueMicrotask: () => queueMicrotask2,
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
  var queueMicrotask2 = (callback) => {
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
    return hex.length < 2 ? "0" + hex : hex.toUpperCase();
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

  // src/core/commands.js
  var commands_exports = {};
  __export(commands_exports, {
    addCommand: () => addCommand,
    addSetting: () => addSetting,
    done: () => done,
    init: () => init12,
    processCommands: () => processCommands,
    set: () => set,
    wait: () => wait
  });

  // src/core/screen-manager.js
  var screen_manager_exports = {};
  __export(screen_manager_exports, {
    activeScreenData: () => m_activeScreenData,
    addScreenCleanupFunction: () => addScreenCleanupFunction,
    addScreenDataItem: () => addScreenDataItem,
    addScreenDataItemGetter: () => addScreenDataItemGetter,
    addScreenInitFunction: () => addScreenInitFunction,
    getActiveScreen: () => getActiveScreen,
    getAllScreensData: () => getAllScreensData,
    getScreenData: () => getScreenData,
    init: () => init11,
    screenCanvasMap: () => m_screenCanvasMap
  });

  // src/renderer/renderer.js
  var renderer_exports = {};
  __export(renderer_exports, {
    GEOMETRY_BATCH: () => GEOMETRY_BATCH,
    IMAGE_BATCH: () => IMAGE_BATCH,
    IMAGE_REPLACE_BATCH: () => IMAGE_REPLACE_BATCH,
    POINTS_BATCH: () => POINTS_BATCH,
    POINTS_REPLACE_BATCH: () => POINTS_REPLACE_BATCH,
    SHADER_BATCH: () => SHADER_BATCH,
    blendModeChanged: () => blendModeChanged,
    cleanup: () => cleanup3,
    cls: () => cls,
    createContext: () => createContext,
    deleteWebGL2Texture: () => deleteWebGL2Texture,
    displayToCanvas: () => displayToCanvas,
    drawArc: () => drawArc,
    drawBezier: () => drawBezier,
    drawCachedGeometry: () => drawCachedGeometry,
    drawCircle: () => drawCircle,
    drawCircleFilled: () => drawCircleFilled,
    drawEllipse: () => drawEllipse,
    drawImage: () => drawImage,
    drawLine: () => drawLine,
    drawPixel: () => drawPixel,
    drawPixelUnsafe: () => drawPixelUnsafe,
    drawRect: () => drawRect,
    drawRectFilled: () => drawRectFilled,
    drawSprite: () => drawSprite,
    flushBatches: () => flushBatches,
    getWebGL2Texture: () => getWebGL2Texture,
    init: () => init7,
    prepareBatch: () => prepareBatch,
    prepareShaderBatch: () => prepareShaderBatch,
    readPixel: () => readPixel,
    readPixelAsync: () => readPixelAsync,
    readPixels: () => readPixels,
    readPixelsAsync: () => readPixelsAsync,
    readPixelsRaw: () => readPixelsRaw,
    resizeScreen: () => resizeScreen,
    setImageDirty: () => setImageDirty,
    shiftImageUp: () => shiftImageUp,
    updateWebGL2TextureImage: () => updateWebGL2TextureImage,
    updateWebGL2TextureSubImage: () => updateWebGL2TextureSubImage
  });

  // src/renderer/shaders/display.vert
  var display_default = "#version 300 es\nin vec2 a_position;\nout vec2 v_texCoord;\n\nvoid main() {\n	gl_Position = vec4(a_position, 0.0, 1.0);\n\n	// Flip Y coordinate when sampling texture\n	v_texCoord = (a_position + 1.0) * 0.5;\n}\n\n";

  // src/renderer/shaders/display.frag
  var display_default2 = "#version 300 es\nprecision mediump float;\nin vec2 v_texCoord;\nuniform sampler2D u_texture;\nout vec4 fragColor;\n\nvoid main() {\n	vec4 texColor = texture(u_texture, v_texCoord);\n	\n	// The FBO already contains STRAIGHT ALPHA, so just output it directly.\n	fragColor = texColor;\n}\n\n";

  // src/renderer/shaders.js
  function init() {
    addScreenDataItem("displayProgram", null);
    addScreenDataItem("displayPositionBuffer", null);
    addScreenDataItem("displayLocations", null);
  }
  function compileShader(gl, type, source) {
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
  function createShaderProgram(gl, vertexSrc, fragSrc) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
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
  function setupDisplayShader(screenData) {
    const gl = screenData.gl;
    const program = createShaderProgram(gl, display_default, display_default2);
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
    const quadVao = gl.createVertexArray();
    gl.bindVertexArray(quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
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
  function getOrCreateCustomShaderProgram(screenData, handle) {
    const gl = screenData.gl;
    let cache = screenData.customShaders[handle.id];
    if (cache) {
      return cache;
    }
    const program = createShaderProgram(gl, display_default, handle.fragmentSource);
    const positionLoc = gl.getAttribLocation(program, "a_position");
    const textureLoc = gl.getUniformLocation(program, "u_texture");
    const sourceSizeLoc = gl.getUniformLocation(program, "u_sourceSize");
    const outputSizeLoc = gl.getUniformLocation(program, "u_outputSize");
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const frameLoc = gl.getUniformLocation(program, "u_frame");
    cache = {
      program,
      locations: {
        position: positionLoc,
        texture: textureLoc,
        sourceSize: sourceSizeLoc,
        outputSize: outputSizeLoc,
        time: timeLoc,
        frame: frameLoc
      }
    };
    screenData.customShaders[handle.id] = cache;
    return cache;
  }
  var m_isDebug = typeof window !== "undefined" && window.location.search.includes("webgl-debug");
  function setCustomUniforms(gl, program, uniforms) {
    if (!uniforms || typeof uniforms !== "object") {
      return;
    }
    for (const name of Object.keys(uniforms)) {
      const value = uniforms[name];
      const loc = gl.getUniformLocation(program, name);
      if (loc === null) {
        if (m_isDebug) {
          console.warn(`applyShader: Unknown uniform "${name}" ignored.`);
        }
        continue;
      }
      if (typeof value === "number") {
        gl.uniform1f(loc, value);
      } else if (Array.isArray(value)) {
        if (value.length === 2) {
          gl.uniform2f(loc, value[0], value[1]);
        } else if (value.length === 3) {
          gl.uniform3f(loc, value[0], value[1], value[2]);
        } else if (value.length === 4) {
          gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
        } else if (m_isDebug) {
          console.warn(
            `applyShader: Unsupported uniform "${name}" array length ${value.length}, ignored.`
          );
        }
      } else if (m_isDebug) {
        console.warn(`applyShader: Unsupported uniform "${name}" type, ignored.`);
      }
    }
  }

  // src/api/blends.js
  var blends_exports = {};
  __export(blends_exports, {
    BLENDS: () => BLENDS,
    BLEND_ALPHA: () => BLEND_ALPHA,
    BLEND_REPLACE: () => BLEND_REPLACE,
    init: () => init2
  });
  var BLEND_REPLACE = "replace";
  var BLEND_ALPHA = "alpha";
  var BLENDS = /* @__PURE__ */ new Set([BLEND_REPLACE, BLEND_ALPHA]);
  function init2(api2) {
    addScreenDataItem("blends", {
      "blend": BLEND_REPLACE,
      "noise": null,
      "noiseSeed": null,
      "noiseData": []
    });
    registerCommands();
  }
  function registerCommands() {
    addCommand("setBlend", setBlend, true, ["blend"]);
    addCommand("setNoise", setNoise, true, ["noise", "seed"]);
  }
  function setBlend(screenData, options) {
    let blend = options.blend ?? screenData.blends.blend;
    if (!BLENDS.has(blend)) {
      const error = new TypeError(
        `setBlend: Parameter blend is not a valid blend. Valid blends are (${Array.from(BLENDS).join(", ")}).`
      );
      error.code = "INVALID_BLEND_MODE";
      throw error;
    }
    const previousBlend = screenData.blends.blend;
    const previousBlends = structuredClone(screenData.blends);
    screenData.blends.blend = blend;
    if (previousBlend !== blend) {
      blendModeChanged(screenData, previousBlends);
    }
  }
  function setNoise(screenData, options) {
    let noise = options.noise;
    let seed = options.seed;
    const noiseErrorMsg = "setNoise: Parameter noise must either be a number ie: 32, a 1d array with numbers ie: [23, 13, 15, 0], or a 2d array where the inner array is two arrays first array is min values second array is max values for each ie: [[23, 15, 18, 0], [32,18, 12, 0]]. The order of items in the inner array is [red, green, blue, alpha].";
    let noiseResult = null;
    if (noise !== null) {
      const validateNoiseValFn = (noiseVal) => {
        if (noiseVal === null) {
          const error = new TypeError(noiseErrorMsg);
          error.code = "INVALID_NOISE_VALUE";
          throw error;
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
    let noiseSeed = getFloat(seed, null);
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
  var point_default = "#version 300 es\nin vec2 a_position;\nin vec4 a_color;\nuniform vec2 u_resolution;\nout vec4 v_color;\n\nvoid main() {\n\n	// Convert screen coords to NDC with pixel center adjustment\n	// Add 0.5 to center the pixel, then convert to NDC\n	vec2 pixelCenter = a_position + 0.5;\n	vec2 ndc = ((pixelCenter / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);\n	gl_Position = vec4(ndc, 0.0, 1.0);\n	gl_PointSize = 1.0;\n	v_color = a_color;\n}\n\n";

  // src/renderer/shaders/point.frag
  var point_default2 = "#version 300 es\nprecision mediump float;\nin vec4 v_color;\nuniform vec4 u_noiseMin;\nuniform vec4 u_noiseMax;\nuniform float u_time;\nout vec4 fragColor;\n\n// A hash function that works with integer coordinates\n// This tends to be very effective at breaking coherence.\nfloat hash(vec2 p) {\n	p = fract(p * vec2(5.3983, 5.4439));\n	p += dot(p, p.yx + 2.153); // Add a small value to break symmetry\n	return fract(p.x * p.y * 954.3121);\n}\n\n// Map value from [0,1] range to [min,max] range\nfloat mapRange(float value, float min, float max) {\n	return min + value * (max - min);\n}\n\nvoid main() {\n\n	vec4 baseColor = v_color;\n	vec4 pixelNoise = vec4(0.0);\n\n	float noiseRange = abs(u_noiseMax.r - u_noiseMin.r) +\n	                   abs(u_noiseMax.g - u_noiseMin.g) +\n	                   abs(u_noiseMax.b - u_noiseMin.b) +\n	                   abs(u_noiseMax.a - u_noiseMin.a);\n\n	if (noiseRange > 0.0001) {\n\n		// Use integer coordinates for the hash function\n		// This is critical for noise that looks truly random at pixel level\n		vec2 iFragCoord = floor(gl_FragCoord.xy);\n\n		// Combine iFragCoord with u_time and different offsets for each channel\n		// The offsets here can be smaller because the hash itself is strong.\n		float noiseR = hash(iFragCoord + vec2(u_time * 0.01, u_time * 0.02) + vec2(10.0, 20.0));\n		float noiseG = hash(iFragCoord + vec2(u_time * 0.03, u_time * 0.04) + vec2(30.0, 40.0));\n		float noiseB = hash(iFragCoord + vec2(u_time * 0.05, u_time * 0.06) + vec2(50.0, 60.0));\n		float noiseA = hash(iFragCoord + vec2(u_time * 0.07, u_time * 0.08) + vec2(70.0, 80.0));\n\n		pixelNoise.r = mapRange(noiseR, u_noiseMin.r, u_noiseMax.r);\n		pixelNoise.g = mapRange(noiseG, u_noiseMin.g, u_noiseMax.g);\n		pixelNoise.b = mapRange(noiseB, u_noiseMin.b, u_noiseMax.b);\n		pixelNoise.a = mapRange(noiseA, u_noiseMin.a, u_noiseMax.a);\n	}\n\n	vec4 finalColor = baseColor + pixelNoise;\n	fragColor = clamp(finalColor, 0.0, 1.0);\n}";

  // src/renderer/shaders/image.vert
  var image_default = "#version 300 es\nin vec4 a_position;\nin vec4 a_color;\nin vec2 a_texCoord;\n\nuniform vec2 u_resolution;\n\nout vec4 v_color;\nout vec2 v_texCoord;\n\nvoid main() {\n	\n	// Convert from pixel space (0 to u_resolution) to clip space (-1 to 1)\n	vec2 zeroToOne = a_position.xy / u_resolution;\n	vec2 zeroToTwo = zeroToOne * 2.0;\n	vec2 clipSpace = zeroToTwo - 1.0;\n\n	// Flip the Y-coordinate to match standard 2D graphics (top-left origin)\n	// In WebGL, +Y is typically up, but for 2D, we want +Y down.\n	gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n\n	v_color = a_color;\n	v_texCoord = a_texCoord;\n}\n\n";

  // src/renderer/shaders/image.frag
  var image_default2 = "#version 300 es\nprecision highp float;\n\nin vec4 v_color;\nin vec2 v_texCoord;\n\nuniform sampler2D u_texture;\n\nout vec4 outColor;\n\nvoid main() {\n\n	// Sample the color from the texture at the given texture coordinates\n	vec4 texColor = texture(u_texture, v_texCoord);\n\n	// Multiply the texture color by the vertex color (which can be used for tinting/alpha)\n	// If v_color is white (1,1,1,1), it will just use the texColor.\n	outColor = texColor * v_color;\n}\n\n";

  // src/renderer/shaders/geometry.vert
  var geometry_default = "#version 300 es\nin vec2 a_position;\nin vec4 a_color;\nuniform vec2 u_resolution;\nout vec4 v_color;\n\nvoid main() {\n	\n	// For TRIANGLES/LINES, a_position directly represents the desired vertex\n	// position (e.g., top-left of a pixel boundary).\n	// No 0.5 offset needed for precise geometry rasterization.\n	vec2 ndc = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);\n	gl_Position = vec4(ndc, 0.0, 1.0);\n	v_color = a_color;\n}";

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
    "overrideGlobalBlend": null,
    // Tri-state: null = use default, true = alpha, false = replace
    "program": null,
    "vertices": null,
    "colors": null,
    "count": 0,
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
  function init3() {
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
      const error = new Error(`createBatch: Unknown batch type ${type}`);
      error.code = "INVALID_BATCH_TYPE";
      throw error;
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
    const batch = screenData.batches[batchType];
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
    const requiredCount = batch.count + itemCount;
    if (requiredCount >= batch.capacity) {
      if (requiredCount > batch.maxCapacity) {
        if (m_isDebug2) {
          console.log(
            `Batch ${BATCH_TYPES[batch.type]} exceeded maxCapacity ${batch.maxCapacity}, requested ${requiredCount}.  Flushing batch to reset count to 0.`
          );
        }
        flushBatches(screenData);
        return prepareBatch(screenData, batchType, itemCount, texture);
      }
      const newCapacity = Math.max(
        requiredCount,
        Math.min(batch.capacity * 2, batch.maxCapacity)
      );
      resizeBatch(batch, newCapacity);
    }
  }
  function prepareShaderBatch(screenData, handle, uniforms) {
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
      "uniforms": uniforms ?? {}
    };
    batchInfo.drawOrder.push(drawOrderItem);
    batchInfo.currentBatch = batch;
  }
  function runShaderPass(screenData, drawOrderItem) {
    const gl = screenData.gl;
    const handle = drawOrderItem.shaderHandle;
    const uniforms = drawOrderItem.uniforms;
    const { program, locations } = getOrCreateCustomShaderProgram(screenData, handle);
    if (locations.texture === null) {
      const error = new Error("applyShader: Missing required uniform u_texture in shader.");
      error.code = "MISSING_U_TEXTURE";
      throw error;
    }
    const w = screenData.width;
    const h = screenData.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.bufferFBO);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.BLEND);
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
    setCustomUniforms(gl, program, uniforms);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, screenData.bufferFBO);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.FBO);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.FBO);
  }
  function flushBatches(screenData, blends = null) {
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
    for (const drawOrderItem of screenData.batchInfo.drawOrder) {
      if (drawOrderItem.endIndex === null) {
        drawOrderItem.endIndex = drawOrderItem.batch.count;
      }
      if (drawOrderItem.batch.type === SHADER_BATCH) {
        runShaderPass(screenData, drawOrderItem);
        continue;
      }
      if (drawOrderItem.endIndex - drawOrderItem.startIndex > 0) {
        if (drawOrderItem.overrideGlobalBlend === null) {
          if (blends.blend === BLEND_REPLACE) {
            gl.disable(gl.BLEND);
          } else {
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(
              gl.SRC_ALPHA,
              // srcRGBFactor
              gl.ONE_MINUS_SRC_ALPHA,
              // dstRGBFactor
              gl.ONE,
              // srcAlphaFactor - src alpha factor 1.0 (no scale)
              gl.ONE_MINUS_SRC_ALPHA
              // dstAlphaFactor - dst alpha factor (1-src.a)
            );
          }
        } else if (drawOrderItem.overrideGlobalBlend === true) {
          gl.enable(gl.BLEND);
          gl.blendFuncSeparate(
            gl.SRC_ALPHA,
            // srcRGBFactor
            gl.ONE_MINUS_SRC_ALPHA,
            // dstRGBFactor
            gl.ONE,
            // srcAlphaFactor - src alpha factor 1.0 (no scale)
            gl.ONE_MINUS_SRC_ALPHA
            // dstAlphaFactor - dst alpha factor (1-src.a)
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
    const gl = screenData.gl;
    const program = screenData.displayProgram;
    const locations = screenData.displayLocations;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, screenData.canvas.width, screenData.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(program);
    gl.bindVertexArray(screenData.displayQuadVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, screenData.fboTexture);
    gl.uniform1i(locations.texture, 0);
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
  function addVertexToBatch(batch, x, y, color) {
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
  function init4() {
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
    if (m_geometryCache.has(cacheKey)) {
      return m_geometryCache.get(cacheKey);
    }
    let geometry;
    if (cacheType === FILLED_CIRCLE) {
      geometry = generateCircleGeometry(unit);
    } else {
      throw new Error(`Unknown geometry cache type: ${cacheType}`);
    }
    m_geometryCache.set(cacheKey, geometry);
    return geometry;
  }
  function drawCachedGeometry(screenData, cacheType, unit, x, y, color) {
    const geometry = getCachedGeometry(cacheType, unit);
    const batch = screenData.batches[GEOMETRY_BATCH];
    prepareBatch(screenData, GEOMETRY_BATCH, geometry.vertexCount);
    const vertices = geometry.vertices;
    let vIdx = 0;
    for (let i = 0; i < geometry.vertexCount; i++) {
      const vx = vertices[vIdx++] + x;
      const vy = vertices[vIdx++] + y;
      addVertexToBatch(batch, vx, vy, color);
    }
  }

  // src/renderer/textures.js
  function init5() {
    addScreenDataItem("imageContextMap", /* @__PURE__ */ new Map());
  }
  function copyImageToTexture(gl, img) {
    if (img.isMock) {
      const imgScreenData = m_screenCanvasMap.get(img);
      if (imgScreenData) {
        flushBatches(imgScreenData);
        if (imgScreenData.gl !== gl) {
          const srcGl = imgScreenData.gl;
          const width = imgScreenData.width;
          const height = imgScreenData.height;
          const pixelData = new Uint8Array(width * height * 4);
          srcGl.bindFramebuffer(srcGl.FRAMEBUFFER, imgScreenData.FBO);
          srcGl.readPixels(0, 0, width, height, srcGl.RGBA, srcGl.UNSIGNED_BYTE, pixelData);
          srcGl.bindFramebuffer(srcGl.FRAMEBUFFER, null);
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
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, imgScreenData.FBO);
          gl.copyTexImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            0,
            0,
            imgScreenData.width,
            imgScreenData.height,
            0
          );
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        }
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      }
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    }
  }
  function getWebGL2Texture(screenData, img) {
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
    const gl = screenData.gl;
    let texture = contextTextureMap.get(gl);
    if (texture) {
      if (img instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && img instanceof OffscreenCanvas || img.isMock) {
        if (img.isDirty !== void 0 && img.isDirty === false) {
          return texture;
        }
        if (screenData.batchInfo.textureBatchSet.has(texture)) {
          flushBatches(screenData);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        copyImageToTexture(gl, img);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
      return texture;
    }
    texture = gl.createTexture();
    if (!texture) {
      const error = new Error("Failed to create WebGL2 texture for image.");
      error.code = "WEBGL2_ERROR";
      throw error;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    copyImageToTexture(gl, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    contextTextureMap.set(gl, texture);
    return texture;
  }
  function deleteWebGL2Texture(screenData, img) {
    const contextMap = screenData.imageContextMap.get(img);
    if (!contextMap) {
      return;
    }
    if (contextMap.size === 0) {
      screenData.imageContextMap.delete(img);
    }
  }
  function updateWebGL2TextureSubImage(screenData, imgKey, pixelData, width, height, dstX, dstY) {
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
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      dstX,
      dstY,
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixelData
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }
  function updateWebGL2TextureImage(screenData, imgKey, pixelData, width, height) {
    let texture = getWebGL2Texture(screenData, imgKey);
    if (screenData.batchInfo.textureBatchSets.has(texture)) {
      flushBatches(screenData);
    }
    const gl = screenData.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
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
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }
  function cleanup2(screenData) {
    const gl = screenData.gl;
    for (const img of screenData.imageContextMap.keys()) {
      const screenMap = screenData.imageContextMap.get(img);
      const texture = screenMap.get(gl);
      if (texture) {
        gl.deleteTexture(texture);
      }
    }
    screenData.imageContextMap = null;
  }

  // src/renderer/readback.js
  function init6() {
  }
  function readPixel(screenData, x, y) {
    flushBatches(screenData);
    const gl = screenData.gl;
    const screenHeight = screenData.height;
    const glY = screenHeight - 1 - y;
    const buf = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
    gl.readPixels(x, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return rgbToColor(buf[0], buf[1], buf[2], buf[3]);
  }
  function readPixelAsync(screenData, x, y) {
    return new Promise((resolve) => {
      queueMicrotask2(() => {
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
      queueMicrotask2(() => {
        resolve(readPixels(screenData, x, y, width, height));
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, screenData.FBO);
    gl.readPixels(clampedX, glReadY, clampedWidth, clampedHeight, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
      { "x": -anchorXPx, "y": -anchorYPx },
      // Top-left
      { "x": scaledWidth - anchorXPx, "y": -anchorYPx },
      // Top-right
      { "x": -anchorXPx, "y": scaledHeight - anchorYPx },
      // Bottom-left
      { "x": scaledWidth - anchorXPx, "y": scaledHeight - anchorYPx }
      // Bottom-right
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
    prepareBatch(screenData, batchType, 6, texture);
    const batchVertices = batch.vertices;
    const batchTexCoords = batch.texCoords;
    const batchColors = batch.colors;
    const baseIdx = batch.count;
    const vertexBase = baseIdx * batch.vertexComps;
    const texBase = baseIdx * batch.texCoordComps;
    const colorBase = baseIdx * batch.colorComps;
    let vIdx = vertexBase;
    let tIdx = texBase;
    batchVertices[vIdx++] = corners[0].x;
    batchVertices[vIdx++] = corners[0].y;
    batchTexCoords[tIdx++] = texCoords[0];
    batchTexCoords[tIdx++] = texCoords[1];
    batchVertices[vIdx++] = corners[1].x;
    batchVertices[vIdx++] = corners[1].y;
    batchTexCoords[tIdx++] = texCoords[2];
    batchTexCoords[tIdx++] = texCoords[3];
    batchVertices[vIdx++] = corners[2].x;
    batchVertices[vIdx++] = corners[2].y;
    batchTexCoords[tIdx++] = texCoords[4];
    batchTexCoords[tIdx++] = texCoords[5];
    batchVertices[vIdx++] = corners[1].x;
    batchVertices[vIdx++] = corners[1].y;
    batchTexCoords[tIdx++] = texCoords[6];
    batchTexCoords[tIdx++] = texCoords[7];
    batchVertices[vIdx++] = corners[3].x;
    batchVertices[vIdx++] = corners[3].y;
    batchTexCoords[tIdx++] = texCoords[8];
    batchTexCoords[tIdx++] = texCoords[9];
    batchVertices[vIdx++] = corners[2].x;
    batchVertices[vIdx++] = corners[2].y;
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
    const texture = getWebGL2Texture(screenData, img);
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
    const texture = getWebGL2Texture(screenData, img);
    const texWidth = img.width;
    const texHeight = img.height;
    const u0 = sx / texWidth;
    const v0 = sy / texHeight;
    const u1 = (sx + sw) / texWidth;
    const v1 = (sy + sh) / texHeight;
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
      u0,
      v0,
      // Top-left
      u1,
      v0,
      // Top-right
      u0,
      v1,
      // Bottom-left
      u1,
      v0,
      // Top-right (repeat for second triangle)
      u1,
      v1,
      // Bottom-right
      u0,
      v1
      // Bottom-left (repeat for second triangle)
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
    prepareBatch(screenData, batchType, 1, null, null);
    const batch = screenData.batches[batchType];
    addVertexToBatch(batch, x, y, screenData.color);
  }
  function drawPixelUnsafe(screenData, x, y, color, batchType) {
    const batch = screenData.batches[batchType];
    addVertexToBatch(batch, x, y, color);
  }

  // src/renderer/draw/arcs.js
  var TWO_PI = 2 * Math.PI;
  var FULL_CIRCLE_EPSILON = 1e-4;
  function drawArc(screenData, cx, cy, radius, angle1, angle2) {
    const color = screenData.color;
    let a1 = normalizeAngle(angle1);
    let a2 = normalizeAngle(angle2);
    let span = a2 - a1;
    if (span < 0) {
      span += TWO_PI;
    }
    const isFullCircle = span >= TWO_PI - FULL_CIRCLE_EPSILON;
    const isLargeArc = !isFullCircle && span > Math.PI;
    const estimatedPixels = Math.max(
      4,
      Math.ceil(radius * (isFullCircle ? TWO_PI : span))
    );
    const batchIndex = POINTS_BATCH;
    prepareBatch(screenData, batchIndex, estimatedPixels);
    const batch = screenData.batches[batchIndex];
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    if (!isFullCircle) {
      startX = Math.cos(a1);
      startY = Math.sin(a1);
      endX = Math.cos(a2);
      endY = Math.sin(a2);
    }
    let setPixel;
    if (isFullCircle) {
      setPixel = function(px, py) {
        addVertexToBatch(batch, px, py, color);
      };
    } else if (!isLargeArc) {
      setPixel = function(px, py) {
        const dx = px - cx;
        const dy = py - cy;
        if (dx === 0 && dy === 0) {
          return;
        }
        const cuw = startX * dy - startY * dx;
        const cvw = endX * dy - endY * dx;
        if (cuw >= 0 && cvw <= 0) {
          addVertexToBatch(batch, px, py, color);
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
          addVertexToBatch(batch, px, py, color);
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
    const color = screenData.color;
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
      const batch2 = screenData.batches[POINTS_BATCH];
      prepareBatch(screenData, POINTS_BATCH, 1);
      addVertexToBatch(batch2, p0x | 0, p0y | 0, color);
      return;
    }
    const drawn = /* @__PURE__ */ new Set();
    const batch = screenData.batches[POINTS_BATCH];
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const x1 = pts[i] | 0;
      const y1 = pts[i + 1] | 0;
      const x2 = pts[i + 2] | 0;
      const y2 = pts[i + 3] | 0;
      if (x1 === x2 && y1 === y2) continue;
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const pointCount = Math.max(dx, dy) + 1;
      prepareBatch(screenData, POINTS_BATCH, pointCount);
      const sx = x1 < x2 ? 1 : -1;
      const sy = y1 < y2 ? 1 : -1;
      let err = dx - dy;
      let x = x1;
      let y = y1;
      while (true) {
        const key = x + "," + y;
        if (!drawn.has(key)) {
          drawn.add(key);
          addVertexToBatch(batch, x, y, color);
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
    const color = screenData.color;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const pointCount = Math.max(dx, dy) + 1;
    const batch = screenData.batches[POINTS_BATCH];
    prepareBatch(screenData, POINTS_BATCH, pointCount);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
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

  // src/renderer/draw/rects.js
  function drawRect(screenData, x, y, width, height) {
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
    const batch = screenData.batches[GEOMETRY_BATCH];
    prepareBatch(screenData, GEOMETRY_BATCH, 6);
    const x1 = x;
    const y1 = y;
    const x2 = x + width;
    const y2 = y + height;
    addTriangleToBatch(batch, x1, y1, x2, y1, x1, y2, color);
    addTriangleToBatch(batch, x2, y1, x2, y2, x1, y2, color);
  }

  // src/renderer/draw/circles.js
  function drawCircle(screenData, cx, cy, radius) {
    const color = screenData.color;
    if (radius <= 0) {
      return;
    }
    if (radius === 1) {
      prepareBatch(screenData, POINTS_BATCH, 1);
      drawPixelUnsafe(screenData, cx + 1, cy, color, POINTS_BATCH);
      return;
    }
    radius -= 1;
    if (radius === 1) {
      prepareBatch(screenData, POINTS_BATCH, 4);
      drawPixelUnsafe(screenData, cx + 1, cy, color, POINTS_BATCH);
      drawPixelUnsafe(screenData, cx - 1, cy, color, POINTS_BATCH);
      drawPixelUnsafe(screenData, cx, cy + 1, color, POINTS_BATCH);
      drawPixelUnsafe(screenData, cx, cy - 1, color, POINTS_BATCH);
      return;
    }
    const perimeterPixels = Math.round(2 * Math.PI * radius);
    prepareBatch(screenData, POINTS_BATCH, perimeterPixels);
    let x = radius;
    let y = 0;
    let err = 1 - x;
    drawPixelUnsafe(screenData, cx + x, cy + y, color, POINTS_BATCH);
    drawPixelUnsafe(screenData, cx - x, cy + y, color, POINTS_BATCH);
    drawPixelUnsafe(screenData, cx + y, cy + x, color, POINTS_BATCH);
    drawPixelUnsafe(screenData, cx + y, cy - x, color, POINTS_BATCH);
    while (x >= y) {
      y++;
      if (err < 0) {
        err += 2 * y + 1;
      } else {
        x--;
        err += 2 * (y - x) + 1;
      }
      if (x === y) {
        drawPixelUnsafe(screenData, cx + x, cy + y, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx - x, cy + y, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx - x, cy - y, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx + x, cy - y, color, POINTS_BATCH);
      } else {
        drawPixelUnsafe(screenData, cx + x, cy + y, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx + y, cy + x, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx - y, cy + x, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx - x, cy + y, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx - x, cy - y, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx - y, cy - x, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx + y, cy - x, color, POINTS_BATCH);
        drawPixelUnsafe(screenData, cx + x, cy - y, color, POINTS_BATCH);
      }
    }
  }
  function drawCircleFilled(screenData, cx, cy, radius, color) {
    return drawCachedGeometry(
      screenData,
      FILLED_CIRCLE,
      radius,
      cx,
      cy,
      color
    );
  }

  // src/renderer/draw/ellipses.js
  function drawEllipse(screenData, cx, cy, rx, ry, fillColor) {
    const color = screenData.color;
    if (rx < 0 || ry < 0) {
      return;
    }
    if (rx === 0 && ry === 0) {
      prepareBatch(screenData, POINTS_BATCH, 1);
      const singleBatch = screenData.batches[POINTS_BATCH];
      addVertexToBatch(singleBatch, cx, cy, color);
      return;
    }
    const a = rx;
    const b = ry;
    const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    const estimatedPixels = Math.max(8, Math.ceil(perimeter));
    const pointsBatchIndex = POINTS_BATCH;
    prepareBatch(screenData, pointsBatchIndex, estimatedPixels);
    const pointsBatch = screenData.batches[pointsBatchIndex];
    const plotPoint = function(px, py) {
      const ix = px | 0;
      const iy = py | 0;
      addVertexToBatch(pointsBatch, ix, iy, color);
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
      sortedYCoords.sort(function(a2, b2) {
        return a2 - b2;
      });
      if (sortedYCoords.length >= 3) {
        const interiorRowCount = sortedYCoords.length - 2;
        const vertexCount = interiorRowCount * 6;
        prepareBatch(screenData, GEOMETRY_BATCH, vertexCount);
        const geoBatch = screenData.batches[GEOMETRY_BATCH];
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
  function shiftImageUp(screenData, yOffset) {
    if (yOffset <= 0) {
      return;
    }
    const gl = screenData.gl;
    const width = screenData.width;
    const height = screenData.height;
    flushBatches(screenData);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, screenData.FBO);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.bufferFBO);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blitFramebuffer(
      0,
      0,
      width,
      Math.max(0, height - yOffset),
      0,
      yOffset,
      width,
      height,
      gl.COLOR_BUFFER_BIT,
      gl.NEAREST
    );
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, screenData.FBO);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, screenData.bufferFBO);
    gl.blitFramebuffer(
      0,
      0,
      width,
      height,
      0,
      0,
      width,
      height,
      gl.COLOR_BUFFER_BIT,
      gl.NEAREST
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }
  function cls(screenData, x, y, width, height) {
    if (x === 0 && y === 0 && width === screenData.width && height === screenData.height) {
      resetBatches(screenData);
    } else {
      flushBatches(screenData);
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
  function init7(api2) {
    addScreenDataItem("contextLost", false);
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
    init();
    init3();
    init5();
    init6();
    init4();
  }
  function createContext(screenData) {
    let canvas = screenData.canvas;
    const width = screenData.width;
    const height = screenData.height;
    if (screenData.isOffscreen) {
      canvas = screenData.canvas.canvas;
      if (!m_offscreenContext) {
        m_offscreenContext = canvas.getContext("webgl2", {
          "alpha": true,
          "premultipliedAlpha": false,
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
        "premultipliedAlpha": false,
        "antialias": false,
        "preserveDrawingBuffer": true,
        "desynchronized": false,
        "colorType": "unorm8"
      });
    }
    if (!screenData.gl) {
      const error = new Error("screen: Failed to create WebGL2 context. WebGL2 is required.");
      error.code = "WEBGL_ERROR";
      throw error;
    }
    screenData.gl.viewport(0, 0, width, height);
    const fboAndTexture = createTextureAndFBO(screenData);
    screenData.fboTexture = fboAndTexture.fboTexture;
    screenData.FBO = fboAndTexture.FBO;
    const bufferFboAndTexture = createTextureAndFBO(screenData);
    screenData.bufferFboTexture = bufferFboAndTexture.fboTexture;
    screenData.bufferFBO = bufferFboAndTexture.FBO;
    createBatches(screenData);
    setupDisplayShader(screenData);
    if (m_isDebug3) {
      const debugExt = screenData.gl.getExtension("WEBGL_debug_renderer_info");
      if (debugExt) {
        console.log("GPU:", screenData.gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL));
      }
    }
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("WebGL context lost");
      screenData.contextLost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      console.log("WebGL context restored");
      screenData.contextLost = false;
    });
  }
  function createTextureAndFBO(screenData) {
    const gl = screenData.gl;
    const width = screenData.width;
    const height = screenData.height;
    const fboTexture = gl.createTexture();
    if (!fboTexture) {
      const error = new Error("screen: Failed to create WebGL2 texture.");
      error.code = "WEBGL_ERROR";
      throw error;
    }
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
    const FBO = gl.createFramebuffer();
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
      const error = new Error(`screen: WebGL2 Framebuffer incomplete. ${status}`);
      error.code = "WEBGL_ERROR";
      throw error;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { fboTexture, FBO };
  }
  function cleanup3(screenData) {
    const gl = screenData.gl;
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
    if (!screenData.isRenderScheduled) {
      screenData.isRenderScheduled = true;
      queueMicrotask2(() => {
        if (!screenData.isRenderScheduled) {
          return;
        }
        flushBatches(screenData);
        displayToCanvas(screenData);
        screenData.isRenderScheduled = false;
      });
    }
  }
  function blendModeChanged(screenData, previousBlends) {
    flushBatches(screenData, previousBlends);
    displayToCanvas(screenData);
  }
  function resizeScreen(screenData, oldWidth, oldHeight) {
    flushBatches(screenData);
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
    const srcY = Math.max(0, oldHeight - newHeight);
    gl.blitFramebuffer(
      0,
      srcY,
      copyWidth,
      srcY + copyHeight,
      0,
      0,
      copyWidth,
      copyHeight,
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

  // src/api/graphics.js
  var graphics_exports = {};
  __export(graphics_exports, {
    buildApi: () => buildApi,
    init: () => init10
  });

  // src/api/colors.js
  var colors_exports = {};
  __export(colors_exports, {
    findColorIndexByColorValue: () => findColorIndexByColorValue,
    getColorValueByIndex: () => getColorValueByIndex,
    getColorValueByRawInput: () => getColorValueByRawInput,
    init: () => init9
  });

  // src/api/images.js
  var images_exports = {};
  __export(images_exports, {
    getImageFromRawInput: () => getImageFromRawInput,
    getStoredImage: () => getStoredImage,
    init: () => init8,
    palettizeImages: () => palettizeImages
  });
  var m_images = {};
  var m_paletteImages = [];
  var m_imageCount = 0;
  function init8(api2) {
    registerCommands2(api2);
    addScreenDataItem("defaultAnchorX", 0);
    addScreenDataItem("defaultAnchorY", 0);
    addScreenDataItem("palImagesData", {});
    addScreenInitFunction(palettizeImages);
  }
  function registerCommands2(api2) {
    addCommand(
      "loadImage",
      loadImage,
      false,
      ["src", "name", "usePalette", "paletteKeys", "onLoad", "onError"]
    );
    addCommand(
      "loadSpritesheet",
      loadSpritesheet,
      false,
      [
        "src",
        "name",
        "width",
        "height",
        "margin",
        "usePalette",
        "paletteKeys",
        "onLoad",
        "onError"
      ]
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
    const usePalette = !!options.usePalette;
    const paletteKeys = options.paletteKeys;
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
    let palColors = null;
    let palColorMap = null;
    if (usePalette) {
      if (!Array.isArray(paletteKeys) || paletteKeys.length === 0) {
        const error = new TypeError(
          "loadImage: Parameter paletteKeys must be non empty Array when usePalette is set."
        );
        error.code = "INVALID_PALETTE";
        throw error;
      }
      palColorMap = /* @__PURE__ */ new Map();
      palColors = [convertToColor("rgba(0, 0, 0, 0)")];
      palColorMap.set(palColors[0].key, 0);
      for (let i = 0; i < paletteKeys.length; i += 1) {
        const palColorRaw = paletteKeys[i];
        const palColor = convertToColor(palColorRaw);
        palColors.push(palColor);
        palColorMap.set(palColor.key, i + 1);
      }
    }
    m_images[name] = {
      "status": "loading",
      "image": null,
      "width": null,
      "height": null,
      "usePalette": usePalette,
      "palColors": palColors,
      "palColorMap": palColorMap
    };
    const updateImageFn = (img2) => {
      const imageObj = m_images[name];
      imageObj.image = img2;
      imageObj.status = "ready";
      imageObj.width = img2.width;
      imageObj.height = img2.height;
      if (imageObj.usePalette) {
        addPaletteImage(name);
      }
      if (onLoadCallback) {
        onLoadCallback(name);
      }
    };
    if (typeof src !== "string") {
      updateImageFn(src);
      return name;
    }
    const img = new Image();
    wait();
    img.onload = function() {
      updateImageFn(img);
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
  function removeImage(options) {
    const name = options.name;
    if (typeof name !== "string") {
      const error = new TypeError("removeImage: Parameter name must be a string.");
      error.code = "INVALID_NAME";
      throw error;
    }
    const imageObj = m_images[name];
    if (imageObj && imageObj.image) {
      const img = imageObj.image;
      for (const screenData of getAllScreensData()) {
        deleteWebGL2Texture(screenData, img);
      }
      if (imageObj.usePalette) {
        m_paletteImages.splice(m_paletteImages.indexOf(name), 1);
      }
      delete m_images[name];
    }
  }
  function loadSpritesheet(options) {
    const src = options.src;
    let name = options.name;
    let spriteWidth = options.width;
    let spriteHeight = options.height;
    let margin = options.margin;
    const usePalette = !!options.usePalette;
    const paletteKeys = options.paletteKeys;
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
      const error = new TypeError("loadSpritesheet: width and height must be integers.");
      error.code = "INVALID_DIMENSIONS";
      throw error;
    }
    if (!isAuto && (spriteWidth < 1 || spriteHeight < 1)) {
      const error = new RangeError(
        "loadSpritesheet: width and height must be greater than 0."
      );
      error.code = "INVALID_DIMENSIONS";
      throw error;
    }
    if (!Number.isInteger(margin)) {
      const error = new TypeError("loadSpritesheet: margin must be an integer.");
      error.code = "INVALID_MARGIN";
      throw error;
    }
    if (!name || name === "") {
      m_imageCount += 1;
      name = "" + m_imageCount;
    }
    if (typeof name !== "string") {
      const error = new TypeError("loadSpritesheet: Parameter name must be a string.");
      error.code = "INVALID_NAME";
      throw error;
    }
    if (m_images[name]) {
      const error = new TypeError("loadSpritesheet: Parameter name must be unique.");
      error.code = "INVALID_NAME";
      throw error;
    }
    if (onLoadCallback != null && !isFunction(onLoadCallback)) {
      const error = new TypeError("loadSpritesheet: Parameter onLoad must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    if (onErrorCallback != null && !isFunction(onErrorCallback)) {
      const error = new TypeError("loadSpritesheet: Parameter onError must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    let palColors = null;
    let palColorMap = null;
    if (usePalette) {
      if (!Array.isArray(paletteKeys) || paletteKeys.length === 0) {
        const error = new TypeError(
          "loadSpritesheet: Parameter paletteKeys must be non empty Array when usePalette is set."
        );
        error.code = "INVALID_PALETTE";
        throw error;
      }
      palColorMap = /* @__PURE__ */ new Map();
      palColors = [convertToColor("rgba(0, 0, 0, 0)")];
      palColorMap.set(palColors[0].key, 0);
      for (let i = 0; i < paletteKeys.length; i += 1) {
        const palColorRaw = paletteKeys[i];
        const palColor = convertToColor(palColorRaw);
        palColors.push(palColor);
        palColorMap.set(palColor.key, i + 1);
      }
    }
    loadImage({
      "src": src,
      "name": name,
      "usePalette": usePalette,
      "paletteKeys": paletteKeys,
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
      return createImageFromScreen(imgScreenData);
    }
    return img;
  }
  function createImageFromScreen(screenData, options) {
    let name = options.name;
    let x1 = getInt(options.x1, 0);
    let y1 = getInt(options.y1, 0);
    let x2 = getInt(options.x2, screenData.width - 1);
    let y2 = getInt(options.y2, screenData.height - 1);
    x1 = clamp(x1, 0, screenData.width - 1);
    y1 = clamp(y1, 0, screenData.height - 1);
    x2 = clamp(x2, 0, screenData.width - 1);
    y2 = clamp(y2, 0, screenData.height - 1);
    const width = Math.abs(x2 - x1) + 1;
    const height = Math.abs(y2 - y1) + 1;
    if (width === 0 || height === 0) {
      const error = new RangeError(
        "createImageFromScreen: Region width and height must be greater than 0."
      );
      error.code = "INVALID_DIMENSIONS";
      throw error;
    }
    const actualX = Math.min(x1, x2);
    const actualY = Math.min(y1, y2);
    if (!name || name === "") {
      m_imageCount += 1;
      name = "" + m_imageCount;
    } else if (typeof name !== "string") {
      const error = new TypeError("createImageFromScreen: Parameter name must be a string.");
      error.code = "INVALID_NAME";
      throw error;
    } else if (m_images[name]) {
      const error = new Error(
        `createImageFromScreen: name "${name}" is already used; name must be unique.`
      );
      error.code = "DUPLICATE_NAME";
      throw error;
    }
    const canvas = createCanvasFromScreenRegion(screenData, actualX, actualY, width, height);
    m_images[name] = {
      "status": "ready",
      "image": canvas,
      "width": width,
      "height": height,
      "usePalette": false,
      "palColors": null,
      "palColorMap": null
    };
    return name;
  }
  function setDefaultAnchor(screenData, options) {
    const anchorX = getFloat(options.x, null);
    const anchorY = getFloat(options.y, null);
    if (anchorX === null || anchorX < 0 || anchorX > 1) {
      const error = new TypeError(
        "setDefaultAnchor: Parameter x must be a number between 0 and 1."
      );
      error.code = "INVALID_ANCHOR";
      throw error;
    }
    if (anchorY === null || anchorY < 0 || anchorY > 1) {
      const error = new TypeError(
        "setDefaultAnchor: Parameter y must be a number between 0 and 1."
      );
      error.code = "INVALID_ANCHOR";
      throw error;
    }
    screenData.defaultAnchorX = anchorX;
    screenData.defaultAnchorY = anchorY;
  }
  function getSpritesheetData(screenData, options) {
    const name = options.name;
    if (typeof name !== "string") {
      const error = new TypeError("getSpritesheetData: Parameter name must be a string.");
      error.code = "INVALID_NAME";
      throw error;
    }
    const spriteData = getStoredImage(name);
    if (!spriteData) {
      const error = new Error(`getSpritesheetData: Spritesheet "${name}" not found.`);
      error.code = "IMAGE_NOT_FOUND";
      throw error;
    }
    if (spriteData.type !== "spritesheet") {
      const error = new Error(`getSpritesheetData: Image "${name}" is not a spritesheet.`);
      error.code = "NOT_A_SPRITESHEET";
      throw error;
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
      const error = new Error(
        "createCanvasFromScreenRegion: Failed to read pixel data from screen."
      );
      error.code = "READ_FAILED";
      throw error;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
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
        const error = new Error(`${fnName}: Image "${imageOrName}" not found.`);
        error.code = "IMAGE_NOT_FOUND";
        throw error;
      }
      if (imageData.status !== "ready") {
        const imgName = `Image "${imageOrName}"`;
        if (imageData.status === "loading") {
          const error = new Error(
            `${fnName}: "${imgName}" is still loading. Use $.ready() to wait for it.`
          );
          error.code = "IMAGE_NOT_READY";
          throw error;
        }
        if (imageData.status === "error") {
          const error = new Error(`${fnName}: "${imgName}" failed to load.`);
          error.code = "IMAGE_LOAD_FAILED";
          throw error;
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
      const error = new TypeError(
        `${fnName}: Parameter name must be a string, canvas element, or image element.`
      );
      error.code = "INVALID_NAME";
      throw error;
    }
    return img;
  }
  function isTexImageCompatible(img) {
    return img instanceof HTMLImageElement || img instanceof HTMLVideoElement || img instanceof HTMLCanvasElement || img instanceof ImageBitmap || img instanceof ImageData || typeof OffscreenCanvas !== "undefined" && img instanceof OffscreenCanvas;
  }
  function getStoredImage(name) {
    if (typeof name !== "string") {
      return null;
    }
    return m_images[name] || null;
  }
  function addPaletteImage(name) {
    m_paletteImages.push(name);
    const imageObj = m_images[name];
    let context;
    if (imageObj.image.tagName !== "CANVAS") {
      const canvas = document.createElement("canvas");
      canvas.width = imageObj.width;
      canvas.height = imageObj.height;
      context = canvas.getContext("2d");
      context.drawImage(imageObj.image, 0, 0);
      imageObj.image = canvas;
    } else {
      const canvas = imageObj.image;
      context = canvas.getContext("2d");
    }
    const fakeScreenData = { "pal": imageObj.palColors, "palMap": imageObj.palColorMap };
    const imageData = context.getImageData(0, 0, imageObj.width, imageObj.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const color = rgbToColor(data[i], data[i + 1], data[i + 2], data[i + 3]);
      const index = findColorIndexByColorValue(fakeScreenData, color, 1);
      const newColor = fakeScreenData.pal[index];
      if (newColor.key !== color.key) {
        data[i] = newColor.r;
        data[i + 1] = newColor.g;
        data[i + 2] = newColor.b;
        data[i + 3] = newColor.a;
      }
    }
    context.putImageData(imageData, 0, 0);
    imageObj.data = data;
    for (const screenData of getAllScreensData()) {
      palettizeImage(screenData, name);
    }
  }
  function palettizeImages(screenData) {
    for (const name of m_paletteImages) {
      palettizeImage(screenData, name);
    }
  }
  function palettizeImage(screenData, name) {
    const imageObj = m_images[name];
    if (imageObj.palColors.length > screenData.pal.length) {
      console.warn(
        `There are too many palette colors in image: ${name}. Unable to swap colors for this palette.`
      );
      return;
    }
    const len = imageObj.width * imageObj.height * 4;
    const palettizedImageData = new Uint8ClampedArray(len);
    const data = imageObj.data;
    for (let i = 0; i < len; i += 4) {
      const key = generateColorKey(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3]
      );
      const palIndex = imageObj.palColorMap.get(key);
      const newColor = screenData.pal[palIndex];
      palettizedImageData[i] = newColor.r;
      palettizedImageData[i + 1] = newColor.g;
      palettizedImageData[i + 2] = newColor.b;
      palettizedImageData[i + 3] = newColor.a;
    }
    updateWebGL2TextureImage(
      screenData,
      imageObj.image,
      palettizedImageData,
      imageObj.width,
      imageObj.height
    );
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

  // src/api/colors.js
  var MAX_DIFFERENCE = 255 * 255 * 3.25;
  var m_defaultPal = [];
  var m_defaultPalMap = /* @__PURE__ */ new Map();
  var m_defaultColor = -1;
  function init9(api2) {
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
    registerCommands3(api2);
  }
  function registerCommands3() {
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
  function getDefaultPal(options) {
    const include0 = options.include0 ?? null;
    const filteredPal = [];
    let startIndex = 0;
    if (include0 === null) {
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
      const error = new TypeError(
        `createColor: Parameter color is not a valid color format.`
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    return color;
  }
  function setColor(screenData, options) {
    const colorInput = options.color;
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
    const include0 = options.include0 ?? null;
    const filteredPal = [];
    let startIndex = 0;
    if (include0 === null) {
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
    palettizeImages(screenData);
  }
  function getPalIndex(screenData, options) {
    let color = options.color;
    let tolerance = getFloat(options.tolerance, 0);
    if (tolerance < 0 || tolerance > 1) {
      const error = new RangeError(
        "getPalIndex: Parameter tolerance must be a number between 0 and 1 (0 = exact match, 1 = any color)."
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
    return index;
  }
  function setBgColor(screenData, options) {
    const colorRaw = options.color;
    const color = getColorValueByRawInput(screenData, colorRaw);
    if (color !== null) {
      screenData.canvas.style.backgroundColor = colorToHex(color);
    } else {
      const error = new TypeError("setBgColor: invalid color value for parameter color.");
      error.code = "INVALID_COLOR";
      throw error;
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
      const error = new TypeError(
        "setContainerBgColor: invalid color value for parameter color."
      );
      error.code = "INVALID_COLOR";
      throw error;
    }
  }
  function setPalColors(screenData, options) {
    const indices = options.indices;
    const colors = options.colors;
    if (!Array.isArray(indices)) {
      const error = new TypeError("setPalColors: Parameter indices must be an array.");
      error.code = "INVALID_INDICES";
      throw error;
    }
    if (!Array.isArray(colors)) {
      const error = new TypeError("setPalColors: Parameter colors must be an array.");
      error.code = "INVALID_COLORS";
      throw error;
    }
    if (indices.length !== colors.length) {
      const error = new RangeError(
        "setPalColors: Parameters indices and colors must have the same length."
      );
      error.code = "LENGTH_MISMATCH";
      throw error;
    }
    if (indices.length === 0) {
      return;
    }
    let colorSwapped = false;
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
      colorSwapped = true;
    }
    if (colorSwapped) {
      palettizeImages(screenData);
    }
  }
  function addPalColors(screenData, options) {
    const colors = options.colors;
    if (!Array.isArray(colors)) {
      const error = new TypeError("addPalColors: Parameter colors must be an array.");
      error.code = "INVALID_COLORS";
      throw error;
    }
    if (colors.length === 0) {
      return [];
    }
    const newIndices = [];
    let colorsAdded = false;
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
      colorsAdded = true;
    }
    if (colorsAdded) {
      palettizeImages(screenData);
    }
    return newIndices;
  }
  function getPalColor(screenData, options) {
    const index = options.index;
    if (screenData.pal[index]) {
      const color = screenData.pal[index];
      return createColor(color.array);
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
    if (palIndex >= screenData.pal.length) {
      return null;
    }
    return screenData.pal[palIndex];
  }

  // src/api/graphics.js
  var DEFAULT_BLIT_COLOR = rgbToColor(255, 255, 255, 255);
  var m_api = null;
  function init10(api2) {
    m_api = api2;
    buildApi(null);
    addCommand("cls", cls2, true, ["x", "y", "width", "height"]);
    addScreenInitFunction((screenData) => buildApi(screenData));
  }
  function buildApi(s_screenData) {
    if (s_screenData === null) {
      m_api.arc = () => errFn("arc");
      m_api.bezier = () => errFn("bezier");
      m_api.circle = () => errFn("circle");
      m_api.ellipse = () => errFn("ellipse");
      m_api.line = () => errFn("line");
      m_api.pset = () => errFn("pset");
      m_api.rect = () => errFn("rect");
      return;
    }
    const s_drawArc = drawArc;
    const s_drawBezier = drawBezier;
    const s_drawCircle = drawCircle;
    const s_drawCircleFilled = drawCircleFilled;
    const s_drawEllipse = drawEllipse;
    const s_drawLine = drawLine;
    const s_drawPixel = drawPixel;
    const s_drawRect = drawRect;
    const s_drawRectFilled = drawRectFilled;
    const s_drawImage = drawImage;
    const s_drawSprite = drawSprite;
    const s_getImageFromRawInput = getImageFromRawInput;
    const s_getStoredImage = getStoredImage;
    const s_isObjectLiteral = isObjectLiteral;
    const s_setImageDirty = setImageDirty;
    const s_getInt = getInt;
    const s_getFloat = getFloat;
    const s_degreesToRadian = degreesToRadian;
    const s_getColorValueByRawInput = getColorValueByRawInput;
    const s_pointsBatch = POINTS_BATCH;
    const s_imageReplaceBatch = IMAGE_REPLACE_BATCH;
    const arcFn = (x, y, radius, angle1, angle2) => {
      const pX = s_getInt(x, null);
      const pY = s_getInt(y, null);
      const pRadius = s_getInt(radius, null);
      if (pX === null || pY === null || pRadius === null) {
        const error = new TypeError("arc: Parameters x, y, and radius must be integers.");
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      if (typeof angle1 !== "number" || isNaN(angle1) || typeof angle2 !== "number" || isNaN(angle2)) {
        const error = new TypeError(
          "arc: Parameters angle1 and angle2 must be numbers (in radians)."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      s_drawArc(
        s_screenData,
        pX,
        pY,
        pRadius,
        s_degreesToRadian(angle1),
        s_degreesToRadian(angle2)
      );
      s_setImageDirty(s_screenData);
    };
    const arcFnWrapper = (x, y, radius, angle1, angle2) => {
      if (s_isObjectLiteral(x)) {
        arcFn(x.x, x.y, x.radius, x.angle1, x.angle2);
      } else {
        arcFn(x, y, radius, angle1, angle2);
      }
    };
    m_api.arc = arcFnWrapper;
    s_screenData.api.arc = arcFnWrapper;
    const bezierFn = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      const pX1 = s_getInt(x1, null);
      const pY1 = s_getInt(y1, null);
      const pX2 = s_getInt(x2, null);
      const pY2 = s_getInt(y2, null);
      const pX3 = s_getInt(x3, null);
      const pY3 = s_getInt(y3, null);
      const pX4 = s_getInt(x4, null);
      const pY4 = s_getInt(y4, null);
      if (pX1 === null || pY1 === null || pX2 === null || pY2 === null || pX3 === null || pY3 === null || pX4 === null || pY4 === null) {
        const error = new TypeError(
          "bezier: All control point coordinates must be integers."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      s_drawBezier(s_screenData, pX1, pY1, pX2, pY2, pX3, pY3, pX4, pY4);
      s_setImageDirty(s_screenData);
    };
    const bezierFnWrapper = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      if (s_isObjectLiteral(x1)) {
        bezierFn(x1.x1, x1.y1, x1.x2, x1.y2, x1.x3, x1.y3, x1.x4, x1.y4);
      } else {
        bezierFn(x1, y1, x2, y2, x3, y3, x4, y4);
      }
    };
    m_api.bezier = bezierFnWrapper;
    s_screenData.api.bezier = bezierFnWrapper;
    const circleFn = (x, y, radius, fillColor) => {
      const pX = s_getInt(x, null);
      const pY = s_getInt(y, null);
      const pRadius = s_getInt(radius, null);
      if (pX === null || pY === null || pRadius === null) {
        const error = new TypeError(
          "circle: Parameters x, y, and radius must be integers."
        );
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      let fillColorValue = null;
      if (fillColor != null) {
        fillColorValue = s_getColorValueByRawInput(s_screenData, fillColor);
        if (fillColorValue === null) {
          const error = new TypeError("rect: Parameter 'fillColor' must be a valid color.");
          error.code = "INVALID_PARAMETER";
          throw error;
        }
        if (pRadius > 0) {
          s_drawCircleFilled(s_screenData, pX, pY, pRadius, fillColorValue);
        }
      }
      s_drawCircle(s_screenData, pX, pY, pRadius);
      s_setImageDirty(s_screenData);
    };
    const circleFnWrapper = (x, y, radius, fillColor) => {
      if (s_isObjectLiteral(x)) {
        circleFn(x.x, x.y, x.radius, x.fillColor);
      } else {
        circleFn(x, y, radius, fillColor);
      }
    };
    m_api.circle = circleFnWrapper;
    s_screenData.api.circle = circleFnWrapper;
    const ellipseFn = (x, y, radiusX, radiusY, fillColor) => {
      const pX = s_getInt(x, null);
      const pY = s_getInt(y, null);
      const pRx = s_getInt(radiusX, null);
      const pRy = s_getInt(radiusY, null);
      if (pX === null || pY === null || pRx === null || pRy === null) {
        const error = new TypeError("ellipse: Parameters x, y, rx, and ry must be integers.");
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      let fillColorValue = null;
      if (fillColor != null) {
        fillColorValue = s_getColorValueByRawInput(s_screenData, fillColor);
        if (fillColorValue === null) {
          const error = new TypeError(
            "ellipse: Parameter 'fillColor' must be a valid color."
          );
          error.code = "INVALID_PARAMETER";
          throw error;
        }
      }
      s_drawEllipse(s_screenData, pX, pY, pRx, pRy, fillColorValue);
      s_setImageDirty(s_screenData);
    };
    const ellipseFnWrapper = (x, y, radiusX, radiusY, fillColor) => {
      if (s_isObjectLiteral(x)) {
        ellipseFn(x.x, x.y, x.radiusX, x.radiusY, x.fillColor);
      } else {
        ellipseFn(x, y, radiusX, radiusY, fillColor);
      }
    };
    m_api.ellipse = ellipseFnWrapper;
    s_screenData.api.ellipse = ellipseFnWrapper;
    const lineFn = (x1, y1, x2, y2) => {
      const pX1 = s_getInt(x1, null);
      const pY1 = s_getInt(y1, null);
      const pX2 = s_getInt(x2, null);
      const pY2 = s_getInt(y2, null);
      if (pX1 === null || pY1 === null || pX2 === null || pY2 === null) {
        const error = new TypeError("line: Parameters x1, y1, x2, y2 must be integers.");
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      s_drawLine(s_screenData, pX1, pY1, pX2, pY2);
      s_setImageDirty(s_screenData);
    };
    const lineFnWrapper = (x1, y1, x2, y2) => {
      if (s_isObjectLiteral(x1)) {
        lineFn(x1.x1, x1.y1, x1.x2, x1.y2);
      } else {
        lineFn(x1, y1, x2, y2);
      }
    };
    m_api.line = lineFnWrapper;
    s_screenData.api.line = lineFnWrapper;
    const psetFn = (x, y) => {
      const pX = s_getInt(x, null);
      const pY = s_getInt(y, null);
      if (pX === null || pY === null) {
        const error = new TypeError("pset: Parameters x and y must be integers.");
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      s_drawPixel(s_screenData, pX, pY, s_pointsBatch);
      s_setImageDirty(s_screenData);
      s_screenData.cursor.x = x;
      s_screenData.cursor.y = y;
    };
    const psetFnWrapper = (x, y) => {
      if (s_isObjectLiteral(x)) {
        psetFn(x.x, x.y);
      } else {
        psetFn(x, y);
      }
    };
    m_api.pset = psetFnWrapper;
    s_screenData.api.pset = psetFnWrapper;
    const rectFn = (x, y, width, height, fillColor) => {
      const pX = s_getInt(x, null);
      const pY = s_getInt(y, null);
      const pWidth = s_getInt(width, null);
      const pHeight = s_getInt(height, null);
      if (pX === null || pY === null || pWidth === null || pHeight === null) {
        const error = new TypeError("rect: Parameters x, y, width, height must be integers.");
        error.code = "INVALID_PARAMETER";
        throw error;
      }
      if (pWidth < 1 || pHeight < 1) {
        return;
      }
      let fillColorValue = null;
      if (fillColor != null) {
        fillColorValue = s_getColorValueByRawInput(s_screenData, fillColor);
        if (fillColorValue === null) {
          const error = new TypeError("rect: Parameter 'fillColor' must be a valid color.");
          error.code = "INVALID_PARAMETER";
          throw error;
        }
        const fWidth = pWidth - 2;
        const fHeight = pHeight - 2;
        if (fWidth > 0 && fHeight > 0) {
          s_drawRectFilled(s_screenData, pX + 1, pY + 1, fWidth, fHeight, fillColorValue);
        }
      }
      s_drawRect(s_screenData, pX, pY, pWidth, pHeight);
      s_setImageDirty(s_screenData);
    };
    const rectFnWrapper = (x, y, width, height, fillColor) => {
      if (s_isObjectLiteral(x)) {
        rectFn(x.x, x.y, x.width, x.height, x.fillColor);
      } else {
        rectFn(x, y, width, height, fillColor);
      }
    };
    m_api.rect = rectFnWrapper;
    s_screenData.api.rect = rectFnWrapper;
    const blitImageFn = (img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad) => {
      const pAnchorX = anchorX ?? s_screenData.defaultAnchorX;
      const pAnchorY = anchorY ?? s_screenData.defaultAnchorY;
      const pColor = color ?? DEFAULT_BLIT_COLOR;
      s_drawImage(
        s_screenData,
        img,
        x,
        y,
        pColor,
        pAnchorX,
        pAnchorY,
        scaleX,
        scaleY,
        angleRad,
        s_imageReplaceBatch
      );
      s_setImageDirty(s_screenData);
    };
    const blitImageFnWrapper = (img, x = 0, y = 0, color, anchorX, anchorY, scaleX = 1, scaleY = 1, angleRad = 0) => {
      if (s_isObjectLiteral(img)) {
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
    s_screenData.api.blitImage = blitImageFnWrapper;
    const blitSpriteFn = (name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad) => {
      const spriteData = s_getStoredImage(name);
      const frameData = spriteData.frames[frame];
      const img = spriteData.image;
      const pAnchorX = anchorX ?? s_screenData.defaultAnchorX;
      const pAnchorY = anchorY ?? s_screenData.defaultAnchorY;
      const pColor = color ?? DEFAULT_BLIT_COLOR;
      s_drawSprite(
        s_screenData,
        img,
        frameData.x,
        frameData.y,
        frameData.width,
        frameData.height,
        x,
        y,
        frameData.width,
        frameData.height,
        pColor,
        pAnchorX,
        pAnchorY,
        scaleX,
        scaleY,
        angleRad,
        s_imageReplaceBatch
      );
      s_setImageDirty(s_screenData);
    };
    const blitSpriteFnWrapper = (name, frame = 0, x = 0, y = 0, color, anchorX, anchorY, scaleX = 1, scaleY = 1, angleRad = 0) => {
      if (s_isObjectLiteral(name)) {
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
    s_screenData.api.blitSprite = blitSpriteFnWrapper;
    const drawImageFn = (image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle) => {
      x = s_getInt(x, null);
      y = s_getInt(y, null);
      color = color ?? DEFAULT_BLIT_COLOR;
      anchorX = s_getFloat(anchorX, s_screenData.defaultAnchorX);
      anchorY = s_getFloat(anchorY, s_screenData.defaultAnchorY);
      scaleX = s_getFloat(scaleX, 1);
      scaleY = s_getFloat(scaleY, 1);
      angle = s_getFloat(angle, 0);
      image = s_getImageFromRawInput(image, "drawImage");
      if (x === null || y === null) {
        const error = new TypeError("drawImage: Parameters x and y must be numbers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      color = s_getColorValueByRawInput(s_screenData, color);
      if (color === null) {
        color = DEFAULT_BLIT_COLOR;
      }
      const angleRad = s_degreesToRadian(angle);
      s_drawImage(
        s_screenData,
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
      s_setImageDirty(s_screenData);
    };
    const drawImageFnWrapper = (image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle) => {
      if (s_isObjectLiteral(image)) {
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
    s_screenData.api.drawImage = drawImageFnWrapper;
    const drawSpriteFn = (name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle) => {
      frame = frame ?? 0;
      x = s_getInt(x, null);
      y = s_getInt(y, null);
      color = color ?? DEFAULT_BLIT_COLOR;
      anchorX = s_getFloat(anchorX, s_screenData.defaultAnchorX);
      anchorY = s_getFloat(anchorY, s_screenData.defaultAnchorY);
      scaleX = s_getFloat(scaleX, 1);
      scaleY = s_getFloat(scaleY, 1);
      angle = s_getFloat(angle, 0);
      if (typeof name !== "string") {
        const error = new TypeError("drawSprite: Parameter name must be a string.");
        error.code = "INVALID_NAME";
        throw error;
      }
      const spriteData = s_getStoredImage(name);
      if (!spriteData) {
        const error = new Error(`drawSprite: Spritesheet "${name}" not found.`);
        error.code = "IMAGE_NOT_FOUND";
        throw error;
      }
      if (spriteData.type !== "spritesheet") {
        const error = new Error(`drawSprite: Image "${name}" is not a spritesheet.`);
        error.code = "NOT_A_SPRITESHEET";
        throw error;
      }
      if (spriteData.status !== "ready") {
        const imgName = `Spritesheet "${name}"`;
        if (spriteData.status === "loading") {
          const error = new Error(
            `drawSprite: ${imgName} is still loading. Use $.ready() to wait for it.`
          );
          error.code = "IMAGE_NOT_READY";
          throw error;
        }
        if (spriteData.status === "error") {
          const error = new Error(`drawSprite: ${imgName} failed to load.`);
          error.code = "IMAGE_LOAD_FAILED";
          throw error;
        }
      }
      if (!Number.isInteger(frame) || frame >= spriteData.frames.length || frame < 0) {
        const error = new RangeError(
          `drawSprite: Frame ${frame} is not valid. Spritesheet has ${spriteData.frames.length} frames.`
        );
        error.code = "INVALID_FRAME";
        throw error;
      }
      if (x === null || y === null) {
        const error = new TypeError("drawSprite: Parameters x and y must be numbers.");
        error.code = "INVALID_COORDINATES";
        throw error;
      }
      color = s_getColorValueByRawInput(s_screenData, color);
      if (color === null) {
        color = DEFAULT_BLIT_COLOR;
      }
      const angleRad = s_degreesToRadian(angle);
      const frameData = spriteData.frames[frame];
      const img = spriteData.image;
      drawSprite(
        s_screenData,
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
      s_setImageDirty(s_screenData);
    };
    const drawSpriteFnWrapper = (name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle) => {
      if (s_isObjectLiteral(name)) {
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
    s_screenData.api.drawSprite = drawSpriteFnWrapper;
  }
  function cls2(screenData, options) {
    const x = clamp(getInt(options.x, 0), 0, screenData.width);
    const y = clamp(getInt(options.y, 0), 0, screenData.height);
    const width = clamp(
      getInt(options.width, screenData.width - x),
      0,
      screenData.width
    );
    const height = clamp(
      getInt(options.height, screenData.height - y),
      0,
      screenData.height
    );
    if (width <= 0 || height <= 0) {
      return;
    }
    cls(screenData, x, y, width, height);
    setImageDirty(screenData);
    if (x === 0 && y === 0 && width === screenData.width && height === screenData.height) {
      screenData.api.setPos(0, 0);
    }
  }

  // src/core/screen-manager.js
  var SCREEN_API_PROTO = { "screen": true, "id": 0 };
  var m_screens = {};
  var m_screenCanvasMap = /* @__PURE__ */ new Map();
  var m_screenDataItems = {};
  var m_screenDataItemGetters = [];
  var m_screenDataInitFunctions = [];
  var m_screenDataCleanupFunctions = [];
  var MAX_CANVAS_DIMENSION = 8192;
  var m_observedContainers = /* @__PURE__ */ new Set();
  var m_nextScreenId = 0;
  var m_activeScreenData = null;
  var m_resizeObserver = null;
  var m_offscreenCanvas = null;
  function init11(api2) {
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
            resizeScreen2(screenData, false);
          }
        }
      }
    });
    registerCommands4();
    api2.removeScreen = (screenId) => {
      if (Object.getPrototypeOf(screenId) === SCREEN_API_PROTO) {
        screenId = screenId.id;
      }
      if (m_screens[screenId]) {
        return removeScreen(m_screens[screenId]);
      }
    };
    addScreenInitFunction((screenData) => {
      screenData.api.removeScreen = () => removeScreen(screenData);
    });
  }
  function registerCommands4() {
    addCommand(
      "screen",
      screen,
      false,
      ["aspect", "container", "isOffscreen", "resizeCallback"]
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
    m_screenDataItemGetters.push({ name, fn });
  }
  function addScreenInitFunction(fn) {
    m_screenDataInitFunctions.push(fn);
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
  function getScreenData(fnName, screenId) {
    if (!m_screens[screenId]) {
      const error = new Error(`${fnName}: Invalid screen id.`);
      error.code = "INVALID_SCREEN_ID";
      throw error;
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
    if (options.resizeCallback != null && !isFunction(options.resizeCallback)) {
      const error = new TypeError("screen: Parameter resizeCallback must be a function.");
      error.code = "INVALID_CALLBACK";
      throw error;
    }
    if (typeof options.aspect !== "string" || options.aspect === "") {
      const error = new Error("screen: Parameter aspect must be a non-empty string.");
      error.code = "INVALID_ASPECT";
      throw error;
    }
    const screenData = {
      "id": m_nextScreenId,
      "isOffscreen": !!options.isOffscreen,
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
    screenData.api.id = screenData.id;
    Object.assign(screenData, structuredClone(m_screenDataItems));
    for (const itemGetter of m_screenDataItemGetters) {
      screenData[itemGetter.name] = structuredClone(itemGetter.fn());
    }
    m_nextScreenId += 1;
    screenData.aspectData = parseAspect(options.aspect.toLowerCase());
    if (!screenData.aspectData) {
      const error = new Error("screen: Parameter aspect is not valid.");
      error.code = "INVALID_ASPECT";
      throw error;
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
        const error = new Error(
          "screen: You must use aspect ratio with e(x)act pixel dimensions for offscreen screens. For example: 320x200 for width of 320 and height of 200 pixels."
        );
        error.code = "INVALID_OFFSCREEN_ASPECT";
        throw error;
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
        const error = new TypeError(
          "screen: Invalid argument container. Container must be a DOM element or a string id of a DOM element."
        );
        error.code = "INVALID_CONTAINER";
        throw error;
      }
      setDefaultCanvasOptions(screenData);
      screenData.container.appendChild(screenData.canvas);
      if (m_resizeObserver && screenData.container && !m_observedContainers.has(screenData.container)) {
        m_resizeObserver.observe(screenData.container);
        m_observedContainers.add(screenData.container);
      }
    }
    m_screenCanvasMap.set(screenData.canvas, screenData);
    if (!screenData.isOffscreen) {
      resizeScreen2(screenData, true);
    }
    m_activeScreenData = screenData;
    m_screens[screenData.id] = screenData;
    createContext(screenData);
    for (const fn of m_screenDataInitFunctions) {
      fn(screenData);
    }
    return screenData.api;
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
    screenData.canvas.style.outline = "none";
    screenData.canvas.style.backgroundColor = "black";
    screenData.canvas.style.position = "absolute";
    screenData.canvas.style.imageRendering = "pixelated";
    if (screenData.container === document.body) {
      document.documentElement.style.height = "100%";
      document.documentElement.style.margin = "0";
      document.documentElement.style.padding = "0";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      screenData.canvas.style.left = "0";
      screenData.canvas.style.top = "0";
    }
    screenData.container.style.overflow = "hidden";
    if (screenData.container.offsetHeight === 0) {
      screenData.container.style.height = "200px";
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
  function removeAllScreens() {
    const allScreenDatas = getAllScreensData();
    for (const screenData of allScreenDatas) {
      removeScreen(screenData);
    }
  }
  function removeScreen(screenData) {
    const screenId = screenData.id;
    for (const fn of m_screenDataCleanupFunctions) {
      fn(screenData);
    }
    for (const key in screenData.api) {
      if (typeof screenData.api[key] === "function") {
        screenData.api[key] = () => {
          const error = new TypeError(
            `Cannot call ${key}() on removed screen (id: ${screenId}). The screen has been removed from the page.`
          );
          error.code = "DELETED_METHOD";
          throw error;
        };
      }
    }
    m_screenCanvasMap.delete(screenData.canvas);
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
    const previousScreenId = m_activeScreenData.id;
    m_activeScreenData = m_screens[screenId];
    if (previousScreenId !== m_activeScreenData.id) {
      buildApi(m_activeScreenData);
    }
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
  function getAllScreens() {
    const screens = [];
    for (const id in m_screens) {
      screens.push(m_screens[id].api);
    }
    return screens;
  }
  function widthCmd(screenData) {
    return screenData.width;
  }
  function heightCmd(screenData) {
    return screenData.height;
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
  function resizeScreen2(screenData, isInit) {
    if (screenData.isOffscreen || screenData.canvas.offsetParent === null) {
      return;
    }
    let fromSize = screenData.previousOffsetSize;
    const lastScreenWidth = screenData.width;
    const lastScreenHeight = screenData.height;
    const size = getSize(screenData.container);
    setCanvasSize(screenData, size.width, size.height);
    screenData.clientRect = screenData.canvas.getBoundingClientRect();
    const toSize = {
      "width": screenData.canvas.offsetWidth,
      "height": screenData.canvas.offsetHeight
    };
    if (!isInit) {
      if (lastScreenWidth !== screenData.width || lastScreenHeight !== screenData.height) {
        resizeScreen(screenData, lastScreenWidth, lastScreenHeight);
        displayToCanvas(screenData);
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
    let newCssWidth, newCssHeight;
    if (splitter === "m" || splitter === "e") {
      const factorX = Math.floor(maxWidth / width);
      const factorY = Math.floor(maxHeight / height);
      let factor = factorX > factorY ? factorY : factorX;
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
    screenData.width = width;
    screenData.height = height;
    canvas.style.width = Math.floor(newCssWidth) + "px";
    canvas.style.height = Math.floor(newCssHeight) + "px";
    canvas.style.marginLeft = Math.floor((maxWidth - newCssWidth) / 2) + "px";
    canvas.style.marginTop = Math.floor((maxHeight - newCssHeight) / 2) + "px";
    canvas.width = Math.min(width, MAX_CANVAS_DIMENSION);
    canvas.height = Math.min(height, MAX_CANVAS_DIMENSION);
  }
  function getSize(element) {
    return {
      "width": element.offsetWidth || element.clientWidth || element.width,
      "height": element.offsetHeight || element.clientHeight || element.height
    };
  }

  // src/core/commands.js
  var m_settings = {};
  var m_commands = [];
  var m_api2 = null;
  var m_readyCallbacks = [];
  var m_isDocumentReady = false;
  var m_waitCount = 0;
  var m_checkReadyTimeout = null;
  function init12(api2) {
    m_api2 = api2;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onDocumentReady);
      } else {
        m_isDocumentReady = true;
      }
    } else {
      m_isDocumentReady = true;
    }
    registerCommands5();
    addScreenInitFunction(processScreenCommands);
  }
  function registerCommands5() {
    addCommand("ready", ready, false, ["callback"]);
    addCommand("set", set, true, ["options"], true);
  }
  function addCommand(name, fn, isScreen, parameterNames, isScreenOptional) {
    m_commands.push({ name, fn, isScreen, parameterNames, isScreenOptional });
    if (name.startsWith("set") && name !== "set") {
      const settingName = name.substring(3, 4).toLowerCase() + name.substring(4);
      m_settings[settingName] = {
        fn,
        isScreen,
        "parameterNames": parameterNames,
        isProcessed: false
      };
    }
  }
  function processCommands(api2) {
    for (const command of m_commands) {
      if (!command.isProcessed) {
        processCommand(api2, command);
      }
    }
  }
  function processCommand(api2, command) {
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
      if (item.callback) {
        item.callback();
      }
      item.resolve();
    }
  }
  function set(screenData, options) {
    options = options.options;
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
  function addSetting(name, fn, isScreen) {
    m_settings[name] = { fn, isScreen };
  }

  // src/core/plugins.js
  var plugins_exports = {};
  __export(plugins_exports, {
    init: () => init13
  });
  var m_plugins = [];
  var m_waitingForDependencies = [];
  var m_clearEventsHandlers = {};
  var m_api3 = null;
  function init13(api2) {
    m_api3 = api2;
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
      clearEvents,
      true,
      ["type"],
      true
    );
    queueMicrotask(() => {
      for (const pluginInfo of m_waitingForDependencies) {
        let missingDependencies = [];
        for (const dependency of pluginInfo.dependencies) {
          if (!m_plugins.some((pi) => pi.name === dependency)) {
            missingDependencies.push(dependency);
          }
        }
        if (missingDependencies.length > 0) {
          console.error(
            `Unable to initialize plugin "${pluginInfo.name}". Missing the following dependencies: ` + missingDependencies.join(", ") + "."
          );
        } else {
          initializePlugin(pluginInfo);
        }
      }
    });
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
    if (options.dependencies === null) {
      options.dependencies = [];
    }
    if (m_plugins.some((p) => p.name === options.name)) {
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
    let isWaitingForDependencies = false;
    for (const dependency of pluginInfo.config.dependencies) {
      if (!m_plugins.some((pi) => pi.name === dependency)) {
        isWaitingForDependencies = true;
      }
    }
    if (isWaitingForDependencies) {
      m_waitingForDependencies.push(pluginInfo);
    } else {
      initializePlugin(pluginInfo);
    }
  }
  function getPlugins() {
    return m_plugins.map((p) => ({
      "name": p.name,
      "version": p.version,
      "description": p.description,
      "initialized": p.initialized
    }));
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
        const error = new Error(errorMessage);
        error.code = "INVALID_TYPE";
        throw error;
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
  function registerClearEvents(name, handler) {
    if (!name || typeof name !== "string") {
      const error = new TypeError("registerClearEvents: name must be a non-empty string.");
      error.code = "INVALID_NAME";
      throw error;
    }
    if (typeof handler !== "function") {
      const error = new TypeError("registerClearEvents: handler must be a function.");
      error.code = "INVALID_HANDLER";
      throw error;
    }
    const lowerName = name.toLowerCase();
    if (m_clearEventsHandlers[lowerName]) {
      const error = new Error(
        `registerClearEvents: Handler with name "${name}" is already registered.`
      );
      error.code = "DUPLICATE_HANDLER";
      throw error;
    }
    m_clearEventsHandlers[lowerName] = handler;
  }
  function initializePlugin(pluginInfo) {
    if (pluginInfo.initialized) {
      return;
    }
    const pluginApi = {
      "addCommand": addCommand,
      "addScreenDataItem": addScreenDataItem,
      "addScreenDataItemGetter": addScreenDataItemGetter,
      "addScreenInitFunction": addScreenInitFunction,
      "addScreenCleanupFunction": addScreenCleanupFunction,
      "getScreenData": getScreenData,
      "getAllScreensData": getAllScreensData,
      "getApi": () => m_api3,
      "utils": utils_exports,
      "wait": wait,
      "done": done,
      "registerClearEvents": registerClearEvents
    };
    try {
      pluginInfo.config.init(pluginApi);
      processCommands(m_api3);
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

  // src/api/pixels.js
  var pixels_exports = {};
  __export(pixels_exports, {
    init: () => init14
  });
  function init14(api2) {
    registerCommands6();
    api2.put = (data, x, y, include0) => {
      return putWrapper(getActiveScreen("put"), data, x, y, include0);
    };
    addScreenInitFunction((screenData) => {
      screenData.api.put = (data, x, y, include0) => {
        return putWrapper(screenData, data, x, y, include0);
      };
    });
  }
  function registerCommands6() {
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
      const error = new TypeError("getPixel: Parameters x and y must be integers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    const asIndex = options.asIndex ?? false;
    const colorValue = readPixel(screenData, px, py);
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
    const asIndex = options.asIndex ?? false;
    return readPixelAsync(screenData, px, py).then((colorValue) => {
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
      const error = new TypeError(
        "get: Parameters x, y, width and height must be integers."
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (pWidth <= 0 || pHeight <= 0) {
      return [];
    }
    const colors = readPixels(screenData, pX, pY, pWidth, pHeight);
    return convertColorsToIndices(screenData, colors, pWidth, asIndex, tolerance);
  }
  function getAsync(screenData, options) {
    const pX = getInt(options.x, null);
    const pY = getInt(options.y, null);
    const pWidth = getInt(options.width, null);
    const pHeight = getInt(options.height, null);
    const tolerance = getFloat(options.tolerance, 1);
    const asIndex = options.asIndex ?? true;
    if (pX === null || pY === null || pWidth === null || pHeight === null) {
      const error = new TypeError(
        "getAsync: Parameters x, y, width and height must be integers."
      );
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (pWidth <= 0 || pHeight <= 0) {
      return Promise.resolve([]);
    }
    return readPixelsAsync(screenData, pX, pY, pWidth, pHeight).then((colors) => {
      return convertColorsToIndices(screenData, colors, pWidth, asIndex, tolerance);
    });
  }
  function convertColorsToIndices(screenData, colors, width, asIndex, tolerance) {
    if (!asIndex) {
      return colors;
    }
    const results = new Array(colors.length);
    for (let row = 0; row < colors.length; row++) {
      const resultsRow = new Array(width);
      const rowLength = colors[row] ? colors[row].length : 0;
      for (let col = 0; col < width; col++) {
        if (col < rowLength) {
          const colorValue = colors[row][col];
          const idx = findColorIndexByColorValue(
            screenData,
            colorValue,
            tolerance
          );
          resultsRow[col] = idx === null ? 0 : idx;
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
    const width = x2 - x1 + 1;
    const height = y2 - y1 + 1;
    queueMicrotask2(() => {
      queueMicrotask2(() => {
        applyFilter(screenData, filter, x1, y1, width, height);
      });
    });
  }
  function applyFilter(screenData, filter, x1, y1, width, height) {
    flushBatches(screenData);
    const imageData = readPixelsRaw(screenData, x1, y1, width, height);
    if (!imageData) {
      return;
    }
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
        if (filter(pixelData, x1 + x, y1 + y)) {
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
      const error = new TypeError("put: Parameters x and y must be integers.");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    const screenW = screenData.width;
    const screenH = screenData.height;
    let startX = pX < 0 ? -pX : 0;
    let startY = pY < 0 ? -pY : 0;
    let width = pData[0] ? pData[0].length - startX : 0;
    let height = pData.length - startY;
    if (pX + startX + width > screenW) {
      width = screenW - pX - startX;
    }
    if (pY + startY + height > screenH) {
      height = screenH - pY - startY;
    }
    if (width <= 0 || height <= 0) {
      return null;
    }
    let pixelCount = 0;
    for (let i = startY; i < startY + height; i++) {
      const row = pData[i];
      if (row) {
        pixelCount += width;
      }
    }
    prepareBatch(screenData, POINTS_REPLACE_BATCH, pixelCount);
    put(screenData, pData, pX, pY, pInclude0, startY, startX, width, height);
    setImageDirty(screenData);
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
        drawPixelUnsafe(
          screenData,
          sx,
          sy,
          colorValue,
          POINTS_REPLACE_BATCH
        );
      }
    }
  }

  // src/api/paint.js
  var paint_exports = {};
  __export(paint_exports, {
    init: () => init15
  });
  function init15(api2) {
    registerCommands7();
  }
  function registerCommands7() {
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
    let tolerance = getFloat(options.tolerance, 0);
    let boundaryColor = options.boundaryColor;
    if (x === null || y === null) {
      const error = new TypeError("paint: Parameters x and y must be integers");
      error.code = "INVALID_PARAMETER";
      throw error;
    }
    if (tolerance < 0 || tolerance > 1) {
      const error = new RangeError(
        "paint: Parameter tolerance must be a number between 0 and 1 (0 = exact match, 1 = any color)."
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
    const width = screenData.width;
    const height = screenData.height;
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    if (tolerance === 1) {
      drawRectFilled(screenData, 0, 0, width, height, fillColor);
      setImageDirty(screenData);
      return;
    }
    const pixels2D = readPixels(screenData, 0, 0, width, height);
    const startColor = pixels2D[y][x];
    if (startColor.key === fillColor.key) {
      return;
    }
    const weights = [0.2, 0.68, 0.07, 0.05];
    const maxDifference = 255 * 255 * weights.reduce((a, b) => a + b);
    const toleranceThreshold = (1 - tolerance * tolerance) * maxDifference;
    const visited = new Uint8Array(width * height);
    const queue = [];
    queue.push({ "x": x, "y": y });
    visited[y * width + x] = 1;
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
    const pixelCount = width * height;
    prepareBatch(screenData, POINTS_BATCH, pixelCount);
    let head = 0;
    while (head < queue.length) {
      const pixel = queue[head++];
      const px = pixel.x;
      const py = pixel.y;
      const pixelColor = pixels2D[py][px];
      if (shouldSkipPixel(pixelColor)) {
        continue;
      }
      drawPixelUnsafe(
        screenData,
        pixel.x,
        pixel.y,
        fillColor,
        POINTS_BATCH
      );
      addToQueue(queue, visited, px + 1, py, width, height);
      addToQueue(queue, visited, px - 1, py, width, height);
      addToQueue(queue, visited, px, py + 1, width, height);
      addToQueue(queue, visited, px, py - 1, width, height);
    }
    setImageDirty(screenData);
  }
  function addToQueue(queue, visited, x, y, width, height) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    const index = y * width + x;
    if (visited[index] === 0) {
      visited[index] = 1;
      queue.push({ "x": x, "y": y });
    }
  }

  // src/api/draw.js
  var draw_exports = {};
  __export(draw_exports, {
    init: () => init16
  });
  function init16(api2) {
    addScreenDataItem("cursor", { "x": 0, "y": 0 });
    addScreenDataItem("angle", 0);
    registerCommands8();
  }
  function registerCommands8() {
    addCommand("draw", draw, true, ["drawString"]);
  }
  function draw(screenData, options) {
    let drawString = options.drawString;
    if (typeof drawString !== "string") {
      const error = new TypeError("draw: Parameter drawString must be a string.");
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

  // src/api/postfx.js
  var postfx_exports = {};
  __export(postfx_exports, {
    getShaderHandle: () => getShaderHandle,
    init: () => init17
  });
  var m_nextShaderId = 0;
  var m_shaderHandles = /* @__PURE__ */ new Map();
  function init17(api2) {
    registerCommands9();
  }
  function registerCommands9() {
    addCommand("createShader", createShader, false, ["fragmentSource", "uniforms"]);
    addCommand("applyShader", applyShader, true, ["shaderHandle", "uniforms"]);
  }
  function createShader(options) {
    const fragmentSource = options.fragmentSource;
    const uniforms = options.uniforms ?? null;
    if (typeof fragmentSource !== "string") {
      const error = new TypeError("createShader: Parameter fragmentSource must be a string.");
      error.code = "INVALID_FRAGMENT_SOURCE";
      throw error;
    }
    if (fragmentSource.trim().length === 0) {
      const error = new TypeError("createShader: Parameter fragmentSource must not be empty.");
      error.code = "INVALID_FRAGMENT_SOURCE";
      throw error;
    }
    if (!fragmentSource.includes("#version 300 es")) {
      const error = new TypeError(
        "createShader: Parameter fragmentSource must include #version 300 es."
      );
      error.code = "INVALID_FRAGMENT_SOURCE";
      throw error;
    }
    if (uniforms && typeof uniforms !== "object") {
      const error = new TypeError("createShader: Parameter uniforms must be an object.");
      error.code = "INVALID_UNIFORMS";
      throw error;
    }
    const handle = {
      id: m_nextShaderId++,
      fragmentSource,
      uniforms
    };
    m_shaderHandles.set(handle.id, handle);
    return handle.id;
  }
  function getShaderHandle(shaderHandle) {
    if (shaderHandle == null) {
      const error2 = new TypeError("applyShader: Parameter shaderHandle is required.");
      error2.code = "INVALID_SHADER_HANDLE";
      throw error2;
    }
    if (typeof shaderHandle === "number") {
      const handle = m_shaderHandles.get(shaderHandle);
      if (!handle) {
        const error2 = new TypeError(`applyShader: Unknown shader handle id ${shaderHandle}.`);
        error2.code = "INVALID_SHADER_HANDLE";
        throw error2;
      }
      return handle;
    }
    if (typeof shaderHandle === "object" && "id" in shaderHandle && "fragmentSource" in shaderHandle) {
      return shaderHandle;
    }
    const error = new TypeError(
      "applyShader: Parameter shaderHandle must be a shader id or handle from createShader."
    );
    error.code = "INVALID_SHADER_HANDLE";
    throw error;
  }
  function applyShader(screenData, options) {
    const handle = getShaderHandle(options.shaderHandle);
    const overrides = options.uniforms ?? {};
    const merged = { ...handle.uniforms ?? {}, ...overrides };
    prepareShaderBatch(screenData, handle, merged);
    setImageDirty(screenData);
  }

  // src/text/fonts.js
  var fonts_exports = {};
  __export(fonts_exports, {
    init: () => init19,
    setFont: () => setFont
  });

  // src/text/print.js
  var print_exports = {};
  __export(print_exports, {
    init: () => init18,
    updatePrintCursorDimensions: () => updatePrintCursorDimensions
  });
  function init18(api2) {
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
    registerCommands10();
  }
  function registerCommands10() {
    addCommand("print", print, true, ["msg", "isInline", "isCentered"]);
    addCommand("setPos", setPos, true, ["col", "row"]);
    addCommand("setPosPx", setPosPx, true, ["x", "y"]);
    addCommand("getPos", getPos, true, []);
    addCommand("getPosPx", getPosPx, true, []);
    addCommand("getCols", getCols, true, []);
    addCommand("getRows", getRows, true, []);
    addCommand("setWordBreak", setWordBreak, true, ["isEnabled"]);
    addCommand("setPrintSize", setPrintSize, true, ["scaleWidth", "scaleHeight", "padX", "padY"]);
    addCommand("calcWidth", calcWidth, true, ["msg"]);
  }
  function print(screenData, options) {
    let msg = options.msg;
    const isInline = !!options.isInline;
    const isCentered = !!options.isCentered;
    if (!screenData.font) {
      const error = new Error("print: No font set. Call setFont() first.");
      error.code = "NO_FONT_SET";
      throw error;
    }
    if (screenData.printCursor.height > screenData.height) {
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
      const error = new Error("setPos: No font set. Call setFont() first.");
      error.code = "NO_FONT_SET";
      throw error;
    }
    const printCursor = screenData.printCursor;
    if (col !== null) {
      if (isNaN(col)) {
        const error = new TypeError("setPos: parameter col must be a number");
        error.code = "INVALID_COL";
        throw error;
      }
      let x = Math.floor(col * printCursor.width);
      if (x > screenData.width) {
        x = screenData.width - printCursor.height;
      }
      screenData.printCursor.x = x;
    }
    if (row !== null) {
      if (isNaN(row)) {
        const error = new TypeError("setPos: parameter row must be a number");
        error.code = "INVALID_ROW";
        throw error;
      }
      let y = Math.floor(row * screenData.printCursor.height);
      if (y > screenData.height) {
        y = screenData.height - screenData.printCursor.height;
      }
      screenData.printCursor.y = y;
    }
  }
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
    const scaleWidth = getFloat(options.scaleWidth, null);
    const scaleHeight = getFloat(options.scaleHeight, null);
    const padX = getInt(options.padX, null);
    const padY = getInt(options.padY, null);
    if (scaleWidth !== null && scaleWidth <= 0 || scaleHeight !== null && scaleHeight <= 0) {
      const error = new RangeError(
        "setPrintSize: Parameters scaleWidth and scaleHeight must be a number greater than 0."
      );
      error.code = "INVALID_SIZE";
      throw error;
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
    if (!isInline && !isCentered && width + printCursor.x > screenData.width && msg.length > 1) {
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
      startPrint(screenData, msg1, isInline, isCentered);
      startPrint(screenData, msg2, isInline, isCentered);
      return;
    }
    if (printCursor.y + printCursor.height > screenData.height) {
      shiftImageUp(screenData, printCursor.height);
      printCursor.y -= printCursor.height;
    }
    bitmapPrint(screenData, msg, printCursor.x, printCursor.y);
    if (!isInline) {
      printCursor.y += printCursor.height;
      printCursor.x = 0;
    } else {
      printCursor.x += printCursor.width * msg.length;
      if (printCursor.x > screenData.width - printCursor.width) {
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
    printCursor.cols = Math.floor(screenData.width / printCursor.width);
    printCursor.rows = Math.floor(screenData.height / printCursor.height);
  }

  // src/text/fonts/font-6x6.webp
  var font_6x6_default = { "data": "data:image/webp;base64,UklGRs4EAABXRUJQVlA4WAoAAAAYAAAAfwEAFwAAVlA4TNIDAAAvf8EFEA8w//M///Mf8KA+///atl3fR/IvyS+ZrpU99are+RzJUZnkMltW7CVl+fpsWO6j3MnDwEB1DCoFyoxjZgbTmJnR3rxHZSbfwXqL6L/Ctm0bZnT3EOAHLgk/TKsYd1xe4qlTaR2Qugw97NaclAWQcmd9O9/v4LKgmmkpFzwZZiKWWtLcuqPhbfXt7ihvFa5Av7D+QRBFBpZO8Aa2StrmnBTr1YDz73w+XcY0K3/lwOfGIFads3lX6lgHWMOjg+RMq04dFTU355dxdWAhVxybKSNoSRXbr3TZpVKm4rx4iCE5CRCH6docxefKIdYLK2d6io6JCKYqC0a4OJHu2NVzugswenKgXoZa1F309WWdXFaimoQmeePnjB/TUs9Wrkw6V3JHeRyfCBbVQXCN4AG482ZP8YQruSU24nZ3funbyvrD//ocCXAaeAsEPL0WSdTl7Ur9Zom62HCsbf2DitNWHhdqnLVBxm42+eZn3VGe/q1yD0dsYm/NXS8+aO4u0MPFDz2sL3Zs/ZsFtYxmeI4AufqdhVYFhj1+rhAasld53CZDwNnR4eXW5/KGY49viA0L2MGI4OVFAqulYWtzuxJV7VFzuRtMO3iBJnmR2HsLZs/wpa73+98ccQcZHaHdhvcvH18LfBwRWzTlsGGP8JFgO91gCLkmkT2P/xuXAQDToFV9UvWh5QCAvTHpcNoMepUeWUkw7VzfPM/XE/b+pZKoFCuaAGEYbP7JS3UGIUaIg9UMZGiDBqcmvvfCUFfe99S5rge9YTbARwsmhVKjzdPONH3QzHweum/wGURz03ryNLFMTCxT5i4dvvFB9p1vGgb8KdamW3tqAAgOuf/B12WqMzQU4OPYqwR4Epm7mScB5cMV/s0vdr5w7rrYEZXIczf/02EXR3KBSht4+31lXyRnicfa9xfT70fKZi3+Y6jr1MSnvumc9Oeg2jKCPgS4qu0PmsOfh25pPC65U8+N+Xh5T35aT175sGk4x08ofaLuPyL2ZNUyN5ZSoNyoHqahMCBRVkLUEDRG0GQBBoVB2cvW2isoMo2AJ38BOcYP0CC4qo+rLJn0QOn0A6VvBhrTBhj+Kn0K48SrG4WG/WtUBHiBGC4s5Ug1gzAgQKWx/2mfDT8fbWnbPLizbWTrO90SKYzgWEnIMOdL+VLvF9X8x0/RTOmD7tI7a5mPFCOWkTcLN+4vzkWAJwRISUKagVVZzLrye3mRWsxMWxT2W5fLPhtubNaljcrc1NJW/x/TSMgARmx9v5qBmsoT6Az0MK3SJ6FRljwTu5CaazlA2BGACgBFWElG1gAAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAAxAQIAEAAAAGYAAABphwQAAQAAAHYAAAAAAAAAYAAAAAEAAABgAAAAAQAAAFBhaW50Lk5FVCA1LjEuOQAFAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAKgBAABAAAAgAEAAAOgBAABAAAAGAAAAAWgBAABAAAAuAAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAA=" };

  // src/text/fonts/font-6x8.js
  var m_font6x8 = {
    "byteSize": 48,
    "byteBase": 36,
    "width": 6,
    "height": 8,
    "margin": 0,
    "str": "0,1blc8udu8u,1cbkhzwsm6,wpp1xfvgg,coebolreo,d5nukh2cc,coe2eccv0,65jplhc,2rrpnxyccf,0,0,azkg0jpqw,j5ihd7hxo,nly3soshc,nly42td40,dkvajkdak,1f2tcd2lts,39po4vukg,d6e29q3uw,voa3n9udc,1dd8ay5r40,majymyen0,4r8g0,d6e2i2i4f,d6ebp7j7k,co4b4mebk,7307h2ww,78xcoo3k,80mu96o,g90j3o5c,74q25kao,1j83fxkao,0,d5xai464g,vo9y0dkao,voutnk5q8,d7qk1tfr4,18caako74,cyn4y7kow,co7x9kqgw,cvgmd4740,p51ihjmyo,hnt6v75s,3khmlszk,pow,8bnthc,pog,wl5log0,18hslmrwg0,d2kxm9lkw,18halx058g,18haltkhkw,6japxtny8,2pg5ex9zwg,j3ykqif40,2phicbtjpc,18hqina874,18hqj26t4w,74i0nugw,74i0nuhc,6fqfmdlog,ukzeakg,p51hxkg74,18hajmifpc,18hwjobyf4,cyzwjl3ls,2lzffaao74,j5phy2vpc,2lzfcieqdc,2p3nb23s74,2p3nb23lkw,j5phz0lfk,1huhdyxjsw,17ukqfasqo,lxadcq0ow,26fz67fm4g,2fp5guls3k,1ic4kdfc74,1i8m9a9g8w,18hqkb7shs,2lzff9z94w,18hqkb8hs3,2lzffb8jnk,18hpizqeio,2pokva2znk,1huh678wsg,1huh677nk0,1huh8gfaww,1hi03e73pc,1hua29iwow,2phicbv6v4,2g3ele8o3k,1eo82xhoow,2fi0wks268,cyzw9tpmo,1r,co2068kjk,dtwj5q8,23860tetq8,e2shedc,9eixrx874,e2x5s74,j5hseuwhs,d3a881o,23881h7i4g,chbdmk9hc,34buepwv0,23870bnr7k,11m2zty1vk,pz8ndz4,m3d2d8g,e2ssmww,tqjd4qg,d3uih3i,qu79kao,f1qczy8,pcts9aups,h1ch2f4,h1cfgn4,h3ln400,gxcj3i8,h1cgbzw,um4hny8,9jvh9ef7k,co3z8madc,2311eu3da8,t4svfdzi8,7aoozlhc,18hpkro330,vkry6glc,ipvap80sg,18hleduav4,1h0inglklc,11faaz7pfk,chbclspz4,e28hnkc,18hnlvwutc,1h0kuyo4jk,11fciha9ds,1k4rjs1hj4,18hlfeludc,11fabzz8xs,1h7hguv81s,co0929o5c,9dlbfia9s,orcjkhs,mbrplsz28,cyj2ztqm8,ttkqcjcw,p4zq8wp34,cyj4nraww,p4zrwu9ds,ttme9pr0,1h7hgqgmww,1h0ntdz280,cof2w6djc,j5hsewhkw,1hikteekn4,2m32k36f3m,iyd2l9grc,ipt375gu8,ipt47x0cg,6fiigughs,3mhmfvgg,15lstet6kg,15gjbpd9xc,18jink6l1c,12b0vaw3k0,ch3jttxc0,hcdfk0,h7m8lc,tc5on8j33,tc4p4v62q,e18f6vi8,91vaa29s,zcpsr7r4,rdwjrp3dw,xrpq1jqei,2cwu2vechn,co41gj1fs,co41o0qh4,corq1de6g,fu5215hu2,9p8y2,row8vm0,fuso6leh6,fu51tnssq,ulsat8q,fuso76zgg,fu521r2tc,corq1cohs,8rcw8,co41hlnnk,co41p3cow,9uoso,co41hmdc8,9tz40,co41p42dk,co7hskgso,fu51ttf2i,fu5j1pts0,7gmtnka,fut5enfgg,v2zr98q,fu5j148sq,v30cu80,fut5e1uh6,cov45hcsg,fu521wp34,v30djwo,9uv7u,fu51uf01s,co7hsjr40,7gnfy88,2d66i,fu521xl6y,cov6detjc,co41o00sg,2czrc,2rrvthnxtr,9zldr,2gosa7pa2g,b33j9ynrb,2rrvt7ocg0,cnr79s0,p16ep15s,1iubfwjy8,rrfz0t4w,2phoaj5qbk,f408g74,g19nt3xc,mg0a7ocg,2ov1ky6o8u,j5q8b5xc0,j5pzx5vpc,m7xcjszuo,geqgaku8,1mantcco0,j3ykq5kw0,18hqkb7ssg,r6vxlclc,couodj5hc,ckirtofwg,cvghtiikg,9kr8exk3s,co41glw60,j00j709hc,mfz9m9s0,j5ifndeyo,3dqjuo,1vf9c,b0fboebd8,2g6yvj277k,12an04etc0,e13wsn4,0"
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
  function init19(api2) {
    addScreenDataItem("font", null);
    registerCommands11(api2);
    loadDefaultFonts();
    addScreenInitFunction(
      (screenData) => setFont(screenData, { "fontId": m_defaultFontId })
    );
  }
  function registerCommands11(api2) {
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
    m_defaultFontId = loadFont({
      "src": getFontImage(),
      "width": 6,
      "height": 8,
      "margin": 0,
      "charset": null
    });
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
    const width = getInt(options.width, null);
    const height = getInt(options.height, null);
    const margin = getInt(options.margin, 0);
    const cellWidth = width + margin * 2;
    const cellHeight = height + margin * 2;
    let charset = options.charset;
    if (width === null || height === null) {
      const error = new TypeError("loadFont: width and height must be integers.");
      error.code = "INVALID_DIMENSIONS";
      throw error;
    }
    if (!charset) {
      charset = [];
      for (let i = 0; i < 256; i += 1) {
        charset.push(i);
      }
    }
    if (!(Array.isArray(charset) || typeof charset === "string")) {
      const error = new TypeError("loadFont: charset must be an array or a string.");
      error.code = "INVALID_CHARSET";
      throw error;
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
      "id": m_nextFontId,
      "width": width,
      "height": height,
      "margin": margin,
      "cellWidth": cellWidth,
      "cellHeight": cellHeight,
      "chars": chars,
      "charset": charset,
      "image": null,
      "atlasWidth": null,
      "atlasHeight": null
    };
    m_fontMap.set(font.id, font);
    m_nextFontId += 1;
    loadFontFromImage(fontSrc, font);
    return font.id;
  }
  function loadFontFromImage(fontSrc, font) {
    let img;
    if (typeof fontSrc === "string") {
      img = new Image();
      wait();
      img.onload = function() {
        font.image = img;
        font.atlasWidth = img.width;
        font.atlasHeight = img.height;
        done();
      };
      img.onerror = function(err) {
        console.error("loadFont: Unable to load image for font.");
        done();
      };
      img.src = fontSrc;
    } else if (fontSrc instanceof HTMLImageElement || fontSrc instanceof HTMLCanvasElement || typeof OffscreenCanvas !== "undefined" && fontSrc instanceof OffscreenCanvas) {
      font.image = fontSrc;
      font.atlasWidth = fontSrc.width;
      font.atlasHeight = fontSrc.height;
    } else {
      const error = new TypeError("loadFont: fontSrc must be a string or Image element.");
      error.code = "INVALID_FONT_SRC";
      throw error;
    }
  }
  function setDefaultFont(options) {
    const fontId = getInt(options.fontId, null);
    if (fontId === null || !m_fontMap.has(fontId)) {
      const error = new RangeError("setDefaultFont: invalid fontId");
      error.code = "INVALID_FONT_ID";
      throw error;
    }
    m_defaultFontId = fontId;
  }
  function setFont(screenData, options) {
    const fontId = getInt(options.fontId, null);
    if (fontId === null || !m_fontMap.has(fontId)) {
      const error = new RangeError(
        "setFont: Parameter fontId must be an integer and an index in the available fonts."
      );
      error.code = "INVALID_FONT_ID";
      throw error;
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
      const error = new Error("setChar: No font image loaded on this screen.");
      error.code = "NO_FONT_IMAGE";
      throw error;
    }
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
    if (!Array.isArray(data)) {
      if (typeof data === "string") {
        data = hexToData(data, font.width, font.height);
      } else {
        const error = new TypeError("setChar: data must be a 2D array or an encoded string");
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
        const on = data[y][x] ? 1 : 0;
        if (on) {
          const i = (y * sw + x) * 4;
          buf[i + 0] = 255;
          buf[i + 1] = 255;
          buf[i + 2] = 255;
          buf[i + 3] = 255;
        }
      }
    }
    updateWebGL2TextureSubImage(screenData, font.image, buf, sw, sh, sx, sy);
  }

  // src/index.js
  var VERSION = "2.0.3";
  var api = {
    "version": VERSION
  };
  var mods = [
    utils_exports,
    commands_exports,
    screen_manager_exports,
    plugins_exports,
    renderer_exports,
    colors_exports,
    graphics_exports,
    images_exports,
    blends_exports,
    pixels_exports,
    paint_exports,
    draw_exports,
    postfx_exports,
    fonts_exports,
    print_exports
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

  // plugins/gamepad/index.js
  var m_gamepads = {};
  var m_onConnectHandlers = [];
  var m_onDisconnectHandlers = [];
  var m_isInitialized = false;
  var m_isStopped = false;
  var m_isLooping = false;
  var m_gamepadLoopId = null;
  var m_axesSensitivity = 0.2;
  var m_tick = 0;
  var m_lastGamepadUpdateTick = -1;
  function gamepadPlugin(pluginApi) {
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    pluginApi.addCommand("startGamepad", startGamepad, false, []);
    pluginApi.addCommand("stopGamepad", stopGamepad, false, []);
    pluginApi.addCommand("ingamepad", ingamepad, false, ["gamepadIndex"]);
    pluginApi.addCommand(
      "setGamepadSensitivity",
      setGamepadSensitivity,
      false,
      ["sensitivity"]
    );
    pluginApi.addCommand("onGamepadConnected", onGamepadConnected, false, ["fn"]);
    pluginApi.addCommand("onGamepadDisconnected", onGamepadDisconnected, false, ["fn"]);
    pluginApi.registerClearEvents("gamepad", clearGamepadEvents);
  }
  function startGamepad() {
    if (!m_isInitialized) {
      window.addEventListener("gamepadconnected", gamepadConnected);
      window.addEventListener("gamepaddisconnected", gamepadDisconnected);
      m_isInitialized = true;
      scanForGamepads();
    }
    m_isStopped = false;
    if (!m_isLooping) {
      m_isLooping = true;
      m_gamepadLoopId = requestAnimationFrame(gamepadLoop);
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
  }
  function ingamepad(options) {
    const gamepadIndex = options.gamepadIndex;
    if (m_isStopped) {
      return null;
    }
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
  function scanForGamepads() {
    let gamepads;
    if ("getGamepads" in navigator) {
      gamepads = navigator.getGamepads();
    } else if ("webkitGetGamepads" in navigator) {
      gamepads = navigator.webkitGetGamepads();
    } else {
      gamepads = [];
    }
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && !(gamepads[i].index in m_gamepads)) {
        updateGamepad(gamepads[i]);
        const gamepadData = m_gamepads[gamepads[i].index];
        for (const handler of m_onConnectHandlers) {
          handler(gamepadData);
        }
      }
    }
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
    for (const gamepad of gamepads) {
      if (!gamepad || !gamepad.connected) {
        continue;
      }
      updateGamepad(gamepad);
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
  function onWindowBlur() {
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
  function clearGamepadEvents(screenData) {
    m_onConnectHandlers.length = 0;
    m_onDisconnectHandlers.length = 0;
  }
  if (typeof window !== "undefined" && window.pi) {
    window.pi.registerPlugin({
      "name": "gamepad",
      "version": "1.0.0",
      "description": "Gamepad input handling for Pi.js",
      "init": gamepadPlugin
    });
  }

  // plugins/keyboard/input.js
  var CURSOR_BLINK = 500;
  var m_inputData = null;
  var m_pluginApi = null;
  function initInput(pluginApi) {
    m_pluginApi = pluginApi;
    pluginApi.addCommand(
      "input",
      input,
      true,
      ["prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative", "maxLength"]
    );
    pluginApi.addCommand("cancelInput", cancelInput, true, []);
  }
  function input(screenData, options) {
    const prompt = options.prompt;
    const fn = options.fn;
    const cursor = options.cursor ? options.cursor : String.fromCharCode(219);
    const isNumber = !!options.isNumber;
    const isInteger = !!options.isInteger;
    const allowNegative = !!options.allowNegative;
    const maxLength = options.maxLength;
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
    if (maxLength !== null && (typeof maxLength !== "number" || maxLength < 0 || !Number.isInteger(maxLength))) {
      const error = new TypeError("input: maxLength must be a non-negative integer");
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
    startInput();
    return promise;
  }
  function cancelInput(screenData) {
    if (m_inputData && m_inputData.screenData === screenData) {
      finishInput(true);
    }
  }
  function startInput() {
    const api2 = m_pluginApi.getApi();
    const key = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    m_inputData.backgroundImageName = `__input_bg_${key}`;
    captureBackground();
    api2.onkey("any", "down", onInputKeyDown, false, true);
    m_inputData.interval = setInterval(showPrompt, 100);
  }
  function captureBackground() {
    const screenData = m_inputData.screenData;
    let pos = screenData.api.getPos();
    if (pos.row >= screenData.api.getRows()) {
      screenData.api.print("");
      screenData.api.setPos(pos.col, pos.row - 1);
    }
    const posPx = screenData.api.getPosPx();
    const font = screenData.font;
    const width = screenData.width;
    const height = font.height;
    const captureWidth = width - posPx.x;
    const captureHeight = height;
    screenData.api.createImageFromScreen({
      "name": m_inputData.backgroundImageName,
      "x1": posPx.x,
      "y1": posPx.y,
      "x2": posPx.x + captureWidth - 1,
      "y2": posPx.y + captureHeight - 1
    });
    m_inputData.backgroundImage = m_pluginApi.getApi().getImage(m_inputData.backgroundImageName);
    m_inputData.captureX = posPx.x;
    m_inputData.captureY = posPx.y;
    m_inputData.captureWidth = captureWidth;
    m_inputData.captureHeight = captureHeight;
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
        } else if ((keyData.key === "+" || keyData.code === "Equal") && m_inputData.val.charAt(0) === "-") {
          m_inputData.val = m_inputData.val.substring(1);
          inputHandled = true;
        }
      }
      if (m_inputData.isInteger && keyData.code === "Period") {
        inputHandled = true;
      }
      if (!inputHandled) {
        if (m_inputData.maxLength !== null && m_inputData.val.length >= m_inputData.maxLength) {
          inputHandled = true;
        } else {
          m_inputData.val += keyData.key;
          if (m_inputData.isNumber && isNaN(Number(m_inputData.val)) || m_inputData.isInteger && !Number.isInteger(Number(m_inputData.val))) {
            m_inputData.val = m_inputData.val.substring(0, m_inputData.val.length - 1);
          }
        }
      }
    }
    showPrompt();
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
    screenData.api.blitImage(
      m_inputData.backgroundImage,
      m_inputData.captureX,
      m_inputData.captureY
    );
    const posPx = $.getPosPx();
    $.setPosPx(m_inputData.captureX, m_inputData.captureY);
    screenData.api.print(msg, true);
    screenData.api.setPosPx(posPx);
  }
  function finishInput(isCancel) {
    const screenData = m_inputData.screenData;
    const api2 = m_pluginApi.getApi();
    api2.offkey("any", "down", onInputKeyDown, false, true);
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
    api2.removeImage(m_inputData.backgroundImageName);
    const tempInputData = m_inputData;
    m_inputData = null;
    if (isCancel) {
      tempInputData.resolve(null);
      if (tempInputData.fn) {
        tempInputData.fn(null);
      }
    } else {
      tempInputData.resolve(val);
      if (tempInputData.fn) {
        tempInputData.fn(val);
      }
    }
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
  var m_inCodes = {};
  var m_inKeys = {};
  var m_actionKeys = /* @__PURE__ */ new Set();
  var m_onKeyHandlers = {};
  var m_isKeyboardActive = false;
  function keyboardPlugin(pluginApi) {
    startKeyboard();
    window.addEventListener("blur", clearInKeys);
    pluginApi.addScreenCleanupFunction(() => {
    });
    pluginApi.addCommand("startKeyboard", startKeyboard, false, []);
    pluginApi.addCommand("stopKeyboard", stopKeyboard, false, []);
    pluginApi.addCommand("inkey", inkey, false, ["key"]);
    pluginApi.addCommand("setActionKeys", setActionKeys, false, ["keys"]);
    pluginApi.addCommand("removeActionKeys", removeActionKeys, false, ["keys"]);
    pluginApi.addCommand("onkey", onkey, false, ["key", "mode", "fn", "once", "allowRepeat"]);
    pluginApi.addCommand("offkey", offkey, false, ["key", "mode", "fn", "once", "allowRepeat"]);
    initInput(pluginApi);
    pluginApi.registerClearEvents("keyboard", clearKeyboardEvents);
  }
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
  function stopKeyboard() {
    if (!m_isKeyboardActive) {
      return;
    }
    window.removeEventListener("keydown", onKeyDown, { "capture": true });
    window.removeEventListener("keyup", onKeyUp, { "capture": true });
    m_isKeyboardActive = false;
    clearInKeys();
  }
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
    if (event.code !== event.key) {
      triggerKeyEventHandlers(event, "down", event.key);
    }
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
    if (event.code !== event.key) {
      triggerKeyEventHandlers(event, "up", event.key);
    }
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
  function clearKeyboardEvents(screenData) {
    for (const mode in m_onKeyHandlers) {
      delete m_onKeyHandlers[mode];
    }
    cancelAllInputs(screenData);
  }
  if (typeof window !== "undefined" && window.pi) {
    window.pi.registerPlugin({
      "name": "keyboard",
      "version": "1.0.0",
      "description": "Keyboard input handling for Pi.js",
      "init": keyboardPlugin
    });
  }

  // plugins/sound/sound.js
  var m_audioContext = null;
  var m_masterGain = null;
  var m_audioPools = {};
  var m_nextAudioId = 0;
  var m_soundPool = {};
  var m_nextSoundId = 0;
  var m_volume = 0.75;
  var MAX_VOICES = 64;
  function loadAudioItem(pluginApi, audioItem, audio, retryCount = 3) {
    function audioReady() {
      audioItem.pool.push({
        "audio": audio,
        "timeout": 0,
        "volume": 1
      });
      audio.removeEventListener("canplay", audioReady);
      pluginApi.done();
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
        console.error("loadAudio: " + errors[index]);
        if (retryCount > 0) {
          setTimeout(() => {
            audio.removeEventListener("canplay", audioReady);
            audio.removeEventListener("error", audioError);
            const newAudio = new Audio(audio.src);
            loadAudioItem(pluginApi, audioItem, newAudio, retryCount - 1);
          }, 100);
        } else {
          console.error("loadAudio: Max retries exceeded for " + audio.src);
          pluginApi.done();
        }
      } else {
        console.error("loadAudio: Unknown error - " + errorCode);
        pluginApi.done();
      }
    }
    if (retryCount === 3) {
      pluginApi.wait();
    }
    audio.addEventListener("canplay", audioReady);
    audio.addEventListener("error", audioError);
  }
  function getAudioContext() {
    if (!m_audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      m_audioContext = new AudioContextClass();
    }
    return m_audioContext;
  }
  function getMasterGain() {
    const audioContext = getAudioContext();
    if (!m_masterGain) {
      m_masterGain = audioContext.createGain();
      m_masterGain.gain.value = 1;
      m_masterGain.connect(audioContext.destination);
    }
    return m_masterGain;
  }
  function cleanupSound(soundId) {
    const sound = m_soundPool[soundId];
    if (!sound) {
      return;
    }
    try {
      sound.oscillator.disconnect();
    } catch (_e) {
    }
    try {
      sound.envelope.disconnect();
    } catch (_e) {
    }
    try {
      sound.master.disconnect();
    } catch (_e) {
    }
    delete m_soundPool[soundId];
  }
  function enforceVoiceLimit() {
    const audioContext = getAudioContext();
    const now = audioContext.currentTime;
    const activeIds = [];
    for (const soundId in m_soundPool) {
      const sound = m_soundPool[soundId];
      if (sound.startTime <= now) {
        activeIds.push(soundId);
      }
    }
    if (activeIds.length < MAX_VOICES) {
      return;
    }
    const removeCount = activeIds.length - MAX_VOICES + 1;
    for (let i = 0; i < removeCount; i++) {
      stopSoundById(activeIds[i]);
    }
  }
  function stopSoundById(soundId) {
    const sound = m_soundPool[soundId];
    if (!sound) {
      return;
    }
    try {
      sound.oscillator.stop();
    } catch (_e) {
      cleanupSound(soundId);
    }
  }
  function createSound(audioContext, frequency, volume, attackTime, sustainTime, decayTime, stopTime, oType, waveTables, delay) {
    enforceVoiceLimit();
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const master = audioContext.createGain();
    const startTime = audioContext.currentTime + delay;
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
    oscillator.connect(envelope);
    envelope.connect(master);
    master.connect(getMasterGain());
    const soundId = "sound_" + m_nextSoundId;
    m_nextSoundId += 1;
    m_soundPool[soundId] = {
      "oscillator": oscillator,
      "envelope": envelope,
      "master": master,
      "audioContext": audioContext,
      "startTime": startTime
    };
    oscillator.onended = function() {
      cleanupSound(soundId);
    };
    try {
      const attackEnd = startTime + attackTime;
      const sustainEnd = attackEnd + sustainTime;
      const decayEnd = sustainEnd + decayTime;
      let endTime = startTime + stopTime;
      if (endTime < decayEnd) {
        endTime = decayEnd;
      }
      if (attackTime > 0) {
        envelope.gain.setValueAtTime(0, startTime);
        envelope.gain.linearRampToValueAtTime(volume, attackEnd);
      } else {
        envelope.gain.setValueAtTime(volume, startTime);
      }
      if (sustainTime > 0) {
        envelope.gain.linearRampToValueAtTime(0.8 * volume, sustainEnd);
      }
      if (decayTime > 0) {
        envelope.gain.linearRampToValueAtTime(0.1 * volume, sustainEnd + decayTime * 0.5);
        envelope.gain.linearRampToValueAtTime(0, decayEnd);
      } else {
        envelope.gain.linearRampToValueAtTime(0, endTime);
      }
      oscillator.start(startTime);
      oscillator.stop(endTime);
    } catch (err) {
      cleanupSound(soundId);
      throw err;
    }
    return soundId;
  }
  function registerSound(pluginApi) {
    const utils = pluginApi.utils;
    pluginApi.addCommand("loadAudio", loadAudio, false, ["src", "name", "poolSize"]);
    function loadAudio(options) {
      const src = options.src;
      let poolSize = utils.getInt(options.poolSize, 1);
      let audioName = options.name;
      if (!src || typeof src !== "string") {
        const error = new TypeError("loadAudio: Parameter src must be a non-empty string.");
        error.code = "INVALID_SRC";
        throw error;
      }
      let audioId = "audioPool_" + m_nextAudioId;
      if (audioName) {
        if (m_audioPools[audioName]) {
          const error = new Error(
            `loadAudio: Audio pool name "${audioName}" is already in use.`
          );
          error.code = "DUPLICATE_AUDIO_NAME";
          throw error;
        }
        audioId = audioName;
      } else {
        m_nextAudioId += 1;
      }
      if (poolSize < 1) {
        const error = new RangeError(
          "loadAudio: Parameter poolSize must be an integer greater than 0."
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
        loadAudioItem(pluginApi, audioItem, audio);
      }
      m_audioPools[audioId] = audioItem;
      return audioId;
    }
    pluginApi.addCommand("removeAudio", removeAudio, false, ["audioId"]);
    function removeAudio(options) {
      const audioId = options.audioId;
      if (!m_audioPools[audioId]) {
        const error = new Error(`removeAudio: Audio pool "${audioId}" not found.`);
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
    pluginApi.addCommand(
      "playAudio",
      playAudio,
      false,
      ["audioId", "volume", "startTime", "duration"]
    );
    function playAudio(options) {
      const audioId = options.audioId;
      const volume = utils.getFloat(options.volume, 1);
      const startTime = utils.getFloat(options.startTime, 0);
      const duration = utils.getFloat(options.duration, 0);
      if (!m_audioPools[audioId]) {
        const error = new Error(`playAudio: Audio pool "${audioId}" not found.`);
        error.code = "AUDIO_POOL_NOT_FOUND";
        throw error;
      }
      if (volume < 0 || volume > 1) {
        const error = new RangeError(
          "playAudio: Parameter volume must be a number between 0 and 1."
        );
        error.code = "INVALID_VOLUME";
        throw error;
      }
      if (startTime < 0) {
        const error = new RangeError(
          "playAudio: Parameter startTime must be a number greater than or equal to 0."
        );
        error.code = "INVALID_START_TIME";
        throw error;
      }
      if (duration < 0) {
        const error = new RangeError(
          "playAudio: Parameter duration must be a number greater than or equal to 0."
        );
        error.code = "INVALID_DURATION";
        throw error;
      }
      const audioItem = m_audioPools[audioId];
      if (audioItem.pool.length === 0) {
        const error = new Error("playAudio: Audio pool has no sounds loaded.");
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
      const playPromise = audio.play();
      if (playPromise !== void 0) {
        playPromise.catch((error) => {
          console.warn("playAudio: Audio playback failed:", error.message);
        });
      }
      audioItem.index += 1;
      if (audioItem.index >= audioItem.pool.length) {
        audioItem.index = 0;
      }
    }
    pluginApi.addCommand("stopAudio", stopAudio, false, ["audioId"]);
    function stopAudio(options) {
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
        const error = new Error(`stopAudio: Audio pool "${audioId}" not found.`);
        error.code = "AUDIO_POOL_NOT_FOUND";
        throw error;
      }
      for (let i = 0; i < m_audioPools[audioId].pool.length; i++) {
        const poolItem = m_audioPools[audioId].pool[i];
        poolItem.audio.pause();
        clearTimeout(poolItem.timeout);
      }
    }
    pluginApi.addCommand("sound", sound, false, [
      "frequency",
      "duration",
      "volume",
      "oType",
      "delay",
      "attack",
      "decay"
    ]);
    function sound(options) {
      const frequency = Math.round(utils.getFloat(options.frequency, 440));
      const duration = utils.getFloat(options.duration, 1);
      const volume = utils.getFloat(options.volume, 1);
      let oType = options.oType != null ? options.oType : "triangle";
      const delay = utils.getFloat(options.delay, 0);
      const attack = utils.getFloat(options.attack, 0);
      const decay = utils.getFloat(options.decay, 0.1);
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
      const stopTime = attack + duration + decay;
      return createSound(
        getAudioContext(),
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
    pluginApi.addCommand("stopSound", stopSound, false, ["soundId"]);
    function stopSound(options) {
      const soundId = options.soundId;
      if (soundId == null) {
        const soundIds = Object.keys(m_soundPool);
        for (let i = 0; i < soundIds.length; i++) {
          stopSoundById(soundIds[i]);
        }
        return;
      }
      stopSoundById(soundId);
    }
    pluginApi.addCommand("setVolume", setVolume, false, ["volume"]);
    function setVolume(options) {
      const volume = utils.getFloat(options.volume, 0.75);
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
  }

  // plugins/sound/play.js
  var m_tracks = {};
  var m_allTracks = [];
  var m_lastTrackId = 0;
  var m_playData = [];
  var m_utils = null;
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
          val = m_utils.getInt(cmd.val, 0);
          if (val >= 0 && val < m_allNotes.length) {
            frequency = m_allNotes[val];
          }
          wait2 = true;
        }
        break;
      case "O":
        if (!isNaN(Number(cmd.val))) {
          val = m_utils.getInt(cmd.val, 4);
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
          val = m_utils.getInt(cmd.val, 1);
          track.noteLength = getNoteLength(val);
        }
        break;
      case "T":
        if (!isNaN(Number(cmd.val))) {
          val = m_utils.getInt(cmd.val, 120);
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
          val = m_utils.getInt(cmd.val, 1);
          track.extra = getNoteLength(val);
        }
        break;
      case "V":
        if (!isNaN(Number(cmd.val))) {
          val = m_utils.getInt(cmd.val, 50);
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
      const val = m_utils.getInt(cmd.val, 1);
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
          const val = m_utils.getInt(cmd.val, 0);
          track.octaveExtra = val;
        }
        break;
      case "MY":
        if (!isNaN(Number(cmd.val))) {
          const val = m_utils.getInt(cmd.val, 25);
          track.attackRate = val / 100;
        }
        break;
      case "MX":
        if (!isNaN(Number(cmd.val))) {
          const val = m_utils.getInt(cmd.val, 25);
          track.sustainRate = val / 100;
        }
        break;
      case "MZ":
        if (!isNaN(Number(cmd.val))) {
          const val = m_utils.getInt(cmd.val, 25);
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
      const val = m_utils.getInt(cmd.val, -1);
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
  function registerPlay(pluginApi) {
    m_utils = pluginApi.utils;
    pluginApi.addCommand("play", play, false, ["playString"]);
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
      const audioContext = getAudioContext();
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
      return trackId;
    }
    pluginApi.addCommand("stopPlay", stopPlay, false, ["trackId"]);
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
  }

  // plugins/sound/index.js
  function playSoundPlugin(pluginApi) {
    registerSound(pluginApi);
    registerPlay(pluginApi);
  }
  if (typeof window !== "undefined" && window.pi) {
    window.pi.registerPlugin({
      "name": "sound",
      "version": "1.0.0",
      "description": "Music playback and sound effects using Web Audio API",
      "init": playSoundPlugin
    });
  }

  // plugins/pointer/shared-events.js
  function createEventHelpers(pluginApi) {
    const utils = pluginApi.utils;
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
      if (typeof fn !== "function") {
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
      if (!isClear && typeof fn !== "function") {
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
              if (utils.inRange(pos, listener.hitBox)) {
                newData.push(pos);
              }
            }
            if (newData.length > 0) {
              isHit = true;
            }
          } else {
            newData = data;
            if (utils.inRange(data, listener.hitBox)) {
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
    return {
      "onevent": onevent,
      "offevent": offevent,
      "triggerEventListeners": triggerEventListeners
    };
  }

  // plugins/pointer/touch.js
  var m_startTouchInternal = null;
  function startTouchInternal(screenData) {
    if (m_startTouchInternal) {
      m_startTouchInternal(screenData);
    }
  }
  function registerTouch(pluginApi, helpers) {
    const m_onevent = helpers.onevent;
    const m_offevent = helpers.offevent;
    const m_triggerEventListeners2 = helpers.triggerEventListeners;
    pluginApi.addScreenDataItem("touchStopped", false);
    pluginApi.addScreenDataItem("touchStarted", false);
    pluginApi.addScreenDataItem("touches", {});
    pluginApi.addScreenDataItem("lastTouches", {});
    pluginApi.addScreenDataItem("touchEventListenersActive", 0);
    pluginApi.addScreenDataItem("onTouchEventListeners", {});
    pluginApi.addScreenInitFunction(initTouchData);
    window.addEventListener("blur", onWindowBlurTouch);
    pluginApi.addCommand("startTouch", startTouch, true, []);
    pluginApi.addCommand("stopTouch", stopTouch, true, []);
    pluginApi.addCommand("intouch", intouch, true, []);
    pluginApi.addCommand(
      "ontouch",
      ontouch,
      true,
      ["mode", "fn", "once", "hitBox", "customData"]
    );
    pluginApi.addCommand("offtouch", offtouch, true, ["mode", "fn"]);
    pluginApi.addCommand("setPinchZoom", setPinchZoom, false, ["isEnabled"]);
    function initTouchData(screenData) {
      screenData.onTouchEventListeners = {
        "start": [],
        "end": [],
        "move": []
      };
    }
    function startTouchInternal2(screenData) {
      if (!screenData.touchStopped) {
        startTouch(screenData);
      }
    }
    m_startTouchInternal = startTouchInternal2;
    function startTouch(screenData) {
      screenData.touchStopped = false;
      if (!screenData.touchStarted) {
        const options = { "passive": false };
        screenData.canvas.addEventListener("touchstart", touchStart, options);
        screenData.canvas.addEventListener("touchmove", touchMove, options);
        screenData.canvas.addEventListener("touchend", touchEnd, options);
        screenData.canvas.addEventListener("touchcancel", touchEnd, options);
        screenData.touchStarted = true;
      }
    }
    function stopTouch(screenData) {
      screenData.touchStopped = true;
      if (screenData.touchStarted) {
        screenData.canvas.removeEventListener("touchstart", touchStart);
        screenData.canvas.removeEventListener("touchmove", touchMove);
        screenData.canvas.removeEventListener("touchend", touchEnd);
        screenData.canvas.removeEventListener("touchcancel", touchEnd);
        screenData.touchStarted = false;
      }
    }
    function intouch(screenData) {
      startTouchInternal2(screenData);
      return getTouch(screenData);
    }
    function ontouch(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const once = options.once;
      const hitBox = options.hitBox;
      const customData = options.customData;
      const isValid = m_onevent(
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
        startTouchInternal2(screenData);
        screenData.touchEventListenersActive += 1;
      }
    }
    function offtouch(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const isValid = m_offevent(
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
    function setPinchZoom(options) {
      const isEnabled = !!options.isEnabled;
      if (isEnabled) {
        document.body.style.touchAction = "";
      } else {
        document.body.style.touchAction = "none";
      }
    }
    function touchStart(e) {
      const screenData = getScreenDataFromEvent(e);
      if (screenData == null) {
        return;
      }
      updateTouch(screenData, e, "start");
      const touchData = getTouch(screenData);
      if (screenData.touchEventListenersActive > 0) {
        m_triggerEventListeners2("start", touchData, screenData.onTouchEventListeners);
      }
      triggerPressListeners(screenData, "down", getTouchPress(screenData));
      e.preventDefault();
      triggerClickListeners(screenData, getTouchPress(screenData), "down");
    }
    function touchMove(e) {
      const screenData = getScreenDataFromEvent(e);
      if (screenData == null) {
        return;
      }
      updateTouch(screenData, e, "move");
      const touchData = getTouch(screenData);
      if (screenData.touchEventListenersActive > 0) {
        m_triggerEventListeners2("move", touchData, screenData.onTouchEventListeners);
      }
      triggerPressListeners(screenData, "move", getTouchPress(screenData));
    }
    function touchEnd(e) {
      const screenData = getScreenDataFromEvent(e);
      if (screenData == null) {
        return;
      }
      updateTouch(screenData, e, "end");
      const touchData = getTouch(screenData);
      if (screenData.touchEventListenersActive > 0) {
        m_triggerEventListeners2("end", touchData, screenData.onTouchEventListeners);
      }
      triggerPressListeners(screenData, "up", getTouchPress(screenData));
      triggerClickListeners(screenData, getTouchPress(screenData), "up");
    }
    function updateTouch(screenData, e, action) {
      if (!screenData.clientRect) {
        return;
      }
      const newTouches = {};
      const rect = screenData.clientRect;
      for (let j = 0; j < e.touches.length; j++) {
        const touch = e.touches[j];
        const touchData = {};
        touchData.x = Math.floor(
          (touch.clientX - rect.left) / rect.width * screenData.width
        );
        touchData.y = Math.floor(
          (touch.clientY - rect.top) / rect.height * screenData.height
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
    function getScreenDataFromEvent(e) {
      const screenId = e.target.dataset?.screenId;
      if (screenId === void 0) {
        return null;
      }
      return pluginApi.getScreenData("touch-event", screenId);
    }
    function onWindowBlurTouch() {
      const allScreensData = pluginApi.getAllScreensData();
      for (const screenData of allScreensData) {
        screenData.lastTouches = screenData.touches;
        screenData.touches = {};
      }
    }
    function clearTouchEvents(screenData) {
      screenData.onTouchEventListeners = {};
      screenData.touchEventListenersActive = 0;
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
    const triggerEventListenersLocal = helpers.triggerEventListeners;
    m_triggerEventListeners = triggerEventListenersLocal;
    pluginApi.addScreenDataItem("pressEventListenersActive", 0);
    pluginApi.addScreenDataItem("onPressEventListeners", {});
    pluginApi.addScreenDataItem("clickEventListenersActive", 0);
    pluginApi.addScreenDataItem("onClickEventListeners", {});
    pluginApi.addScreenInitFunction(initPressData);
    pluginApi.addCommand("inpress", inpress, true, []);
    pluginApi.addCommand("onpress", onpress, true, ["mode", "fn", "once", "hitBox", "customData"]);
    pluginApi.addCommand("offpress", offpress, true, ["mode", "fn"]);
    pluginApi.addCommand("onclick", onclick, true, ["fn", "once", "hitBox", "customData"]);
    pluginApi.addCommand("offclick", offclick, true, ["fn"]);
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
    function inpress(screenData) {
      startMouseInternal(screenData);
      startTouchInternal(screenData);
      if (screenData.lastEvent === "touch") {
        return getTouchPress(screenData);
      } else {
        return screenData.api.inmouse();
      }
    }
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
        startMouseInternal(screenData);
        startTouchInternal(screenData);
        screenData.pressEventListenersActive += 1;
      }
    }
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
        startMouseInternal(screenData);
        startTouchInternal(screenData);
        screenData.clickEventListenersActive += 1;
      }
    }
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
    function clearPressEvents(screenData) {
      screenData.onPressEventListeners = {};
      screenData.pressEventListenersActive = 0;
    }
    function clearClickEvents(screenData) {
      screenData.onClickEventListeners = {};
      screenData.clickEventListenersActive = 0;
    }
    return {
      "clearPressEvents": clearPressEvents,
      "clearClickEvents": clearClickEvents
    };
  }
  var m_triggerEventListeners = null;
  function triggerPressListeners(screenData, mode, data) {
    if (screenData.pressEventListenersActive > 0 && m_triggerEventListeners) {
      m_triggerEventListeners(mode, data, screenData.onPressEventListeners);
    }
  }
  function triggerClickListeners(screenData, data, clickStatus) {
    if (screenData.clickEventListenersActive > 0 && m_triggerEventListeners) {
      m_triggerEventListeners("click", data, screenData.onClickEventListeners, clickStatus);
    }
  }
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

  // plugins/pointer/mouse.js
  var m_startMouseInternal = null;
  function startMouseInternal(screenData) {
    if (m_startMouseInternal) {
      m_startMouseInternal(screenData);
    }
  }
  function registerMouse(pluginApi, helpers) {
    const m_onevent = helpers.onevent;
    const m_offevent = helpers.offevent;
    const m_triggerEventListeners2 = helpers.triggerEventListeners;
    pluginApi.addScreenDataItem("mouseStopped", false);
    pluginApi.addScreenDataItem("mouseStarted", false);
    pluginApi.addScreenDataItem("mouse", null);
    pluginApi.addScreenDataItem("lastEvent", null);
    pluginApi.addScreenDataItem("isContextMenuEnabled", false);
    pluginApi.addScreenDataItem("mouseEventListenersActive", 0);
    pluginApi.addScreenDataItem("onMouseEventListeners", {
      "down": [],
      "up": [],
      "move": []
    });
    pluginApi.addScreenInitFunction(initMouseData);
    window.addEventListener("blur", onWindowBlurMouse);
    pluginApi.addCommand("startMouse", startMouse, true, []);
    pluginApi.addCommand("stopMouse", stopMouse, true, []);
    pluginApi.addCommand("inmouse", inmouse, true, []);
    pluginApi.addCommand("setEnableContextMenu", setEnableContextMenu, true, ["isEnabled"]);
    pluginApi.addCommand(
      "onmouse",
      onmouse,
      true,
      ["mode", "fn", "once", "hitBox", "customData"]
    );
    pluginApi.addCommand("offmouse", offmouse, true, ["mode", "fn"]);
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
    function startMouseInternal2(screenData) {
      if (screenData.mouseStopped === false) {
        startMouse(screenData);
      }
    }
    m_startMouseInternal = startMouseInternal2;
    function startMouse(screenData) {
      screenData.mouseStopped = false;
      if (!screenData.mouseStarted) {
        screenData.canvas.addEventListener("mousemove", mouseMove);
        screenData.canvas.addEventListener("mousedown", mouseDown);
        screenData.canvas.addEventListener("mouseup", mouseUp);
        screenData.canvas.addEventListener("contextmenu", onContextMenu);
        screenData.mouseStarted = true;
      }
    }
    function stopMouse(screenData) {
      screenData.mouseStopped = true;
      if (screenData.mouseStarted) {
        screenData.canvas.removeEventListener("mousemove", mouseMove);
        screenData.canvas.removeEventListener("mousedown", mouseDown);
        screenData.canvas.removeEventListener("mouseup", mouseUp);
        screenData.canvas.removeEventListener("contextmenu", onContextMenu);
        screenData.mouseStarted = false;
      }
    }
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
    function inmouse(screenData) {
      startMouseInternal2(screenData);
      return getMouse(screenData);
    }
    function setEnableContextMenu(screenData, options) {
      screenData.isContextMenuEnabled = !!options.isEnabled;
      startMouseInternal2(screenData);
    }
    function onmouse(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const once = options.once;
      const hitBox = options.hitBox;
      const customData = options.customData;
      const isValid = m_onevent(
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
        startMouseInternal2(screenData);
        screenData.mouseEventListenersActive += 1;
      }
    }
    function offmouse(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const isValid = m_offevent(
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
    function clearMouseEvents(screenData) {
      screenData.onMouseEventListeners = {
        "down": [],
        "up": [],
        "move": []
      };
      screenData.mouseEventListenersActive = 0;
    }
    function mouseMove(e) {
      const screenData = getScreenDataFromEvent(e);
      if (!screenData) {
        return;
      }
      updateMouse(screenData, e, "move");
      const mouseData = getMouse(screenData);
      if (screenData.mouseEventListenersActive > 0) {
        m_triggerEventListeners2("move", mouseData, screenData.onMouseEventListeners);
      }
      triggerPressListeners(screenData, "move", mouseData);
    }
    function mouseDown(e) {
      const screenData = getScreenDataFromEvent(e);
      if (!screenData) {
        return;
      }
      updateMouse(screenData, e, "down");
      const mouseData = getMouse(screenData);
      if (screenData.mouseEventListenersActive > 0) {
        m_triggerEventListeners2("down", mouseData, screenData.onMouseEventListeners);
      }
      triggerPressListeners(screenData, "down", mouseData);
      triggerClickListeners(screenData, mouseData, "down");
    }
    function mouseUp(e) {
      const screenData = getScreenDataFromEvent(e);
      if (!screenData) {
        return;
      }
      updateMouse(screenData, e, "up");
      const mouseData = getMouse(screenData);
      if (screenData.mouseEventListenersActive > 0) {
        m_triggerEventListeners2("up", mouseData, screenData.onMouseEventListeners);
      }
      triggerPressListeners(screenData, "up", mouseData);
      triggerClickListeners(screenData, mouseData, "up");
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
      const rect = screenData.clientRect;
      const x = Math.floor(
        e.offsetX / rect.width * screenData.width
      );
      const y = Math.floor(
        e.offsetY / rect.height * screenData.height
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
      return pluginApi.getScreenData("mouse-event", screenId);
    }
    function onWindowBlurMouse() {
      const allScreensData = pluginApi.getAllScreensData();
      for (const screenData of allScreensData) {
        screenData.mouse.buttons = 0;
        screenData.mouse.action = "up";
      }
    }
    return {
      "stopMouse": stopMouse,
      "clearMouseEvents": clearMouseEvents
    };
  }

  // plugins/pointer/index.js
  function pointerPlugin(pluginApi) {
    const helpers = createEventHelpers(pluginApi);
    const mouseApi = registerMouse(pluginApi, helpers);
    const touchApi = registerTouch(pluginApi, helpers);
    const pressApi = registerPress(pluginApi, helpers);
    pluginApi.registerClearEvents("mouse", (screenData) => {
      if (screenData !== null) {
        mouseApi.clearMouseEvents(screenData);
      } else {
        const allScreensData = pluginApi.getAllScreensData();
        for (const sd of allScreensData) {
          mouseApi.clearMouseEvents(sd);
        }
      }
    });
    pluginApi.registerClearEvents("touch", (screenData) => {
      if (screenData !== null) {
        touchApi.clearTouchEvents(screenData);
      } else {
        const allScreensData = pluginApi.getAllScreensData();
        for (const sd of allScreensData) {
          touchApi.clearTouchEvents(sd);
        }
      }
    });
    pluginApi.registerClearEvents("press", (screenData) => {
      if (screenData !== null) {
        pressApi.clearPressEvents(screenData);
        pressApi.clearClickEvents(screenData);
      } else {
        const allScreensData = pluginApi.getAllScreensData();
        for (const sd of allScreensData) {
          pressApi.clearPressEvents(sd);
          pressApi.clearClickEvents(sd);
        }
      }
    });
    pluginApi.addScreenCleanupFunction((screenData) => {
      if (screenData.mouseStarted) {
        mouseApi.stopMouse(screenData);
      }
      if (screenData.touchStarted) {
        touchApi.stopTouch(screenData);
      }
      mouseApi.clearMouseEvents(screenData);
      touchApi.clearTouchEvents(screenData);
      pressApi.clearPressEvents(screenData);
      pressApi.clearClickEvents(screenData);
    });
  }
  if (typeof window !== "undefined" && window.pi) {
    window.pi.registerPlugin({
      "name": "pointer",
      "version": "1.0.0",
      "description": "Mouse and touch input handling for Pi.js",
      "init": pointerPlugin
    });
  }

  // src/index-full.js
  var index_full_default = index_default;
})();
//# sourceMappingURL=pi.js.map
