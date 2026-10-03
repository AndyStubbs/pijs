/**
 * keyboard - Keyboard input handling for Pi.js
 * @version 2.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
"use strict";
(() => {
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
      throwCode(TypeError, "input: prompt must be a string.", "INVALID_PROMPT");
    }
    if (fn != null && typeof fn !== "function") {
      throwCode(TypeError, "input: fn must be a function.", "INVALID_FUNCTION");
    }
    let cursor = options.cursor;
    if (cursor == null || cursor === "") {
      cursor = String.fromCharCode(219);
    } else if (typeof cursor !== "string") {
      throwCode(TypeError, "input: cursor must be a string.", "INVALID_CURSOR");
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
      throwCode(TypeError, "input: maxLength must be an integer.", "INVALID_MAX_LENGTH");
    } else if (maxLength < 1) {
      throwCode(RangeError, "input: maxLength must be at least 1.", "INVALID_MAX_LENGTH");
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
  function throwCode(ErrorType, message, code) {
    const error = new ErrorType(message);
    error.code = code;
    throw error;
  }
  function readFlag(name, value, code) {
    if (value == null) {
      return false;
    }
    if (typeof value !== "boolean") {
      throwCode(TypeError, `input: ${name} must be a boolean.`, code);
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
  var m_isStopped = false;
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
    m_isStopped = false;
    if (m_isKeyboardActive) {
      return;
    }
    window.addEventListener("keydown", onKeyDown, { "capture": true });
    window.addEventListener("keyup", onKeyUp, { "capture": true });
    if (!m_isReleaseListening) {
      window.addEventListener("blur", releaseHeldKeys);
      document.addEventListener("visibilitychange", onVisibilityChange);
      m_isReleaseListening = true;
    }
    m_isKeyboardActive = true;
  }
  function startOnUse() {
    if (!m_isStopped) {
      startKeyboard();
    }
  }
  function stopKeyboard() {
    m_isStopped = true;
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
      throwCode2(TypeError, "inKey: key must be a string.", "INVALID_KEY");
    }
    if (key === "") {
      throwCode2(RangeError, "inKey: key must not be empty.", "INVALID_KEY");
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
      throwCode2(TypeError, "onKey: fn must be a function.", "INVALID_FUNCTION");
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
      throwCode2(
        TypeError,
        'offKey: mode or fn is required. To remove every key handler, call clearEvents( "keyboard" ).',
        "INVALID_MODE"
      );
    }
    if (mode != null) {
      readMode("offKey", mode);
    }
    if (fn != null && typeof fn !== "function") {
      throwCode2(TypeError, "offKey: fn must be a function.", "INVALID_FUNCTION");
    }
    const comboKey = getComboKey(combo);
    const matches = [];
    for (const handler of m_onKeyHandlers[combo[0]] || []) {
      if (handler.comboKey === comboKey && (mode == null || handler.mode === mode) && (fn == null || handler.fn === fn)) {
        matches.push(handler);
      }
    }
    for (const handler of matches) {
      removeHandler(handler);
    }
  }
  function throwCode2(ErrorType, message, code) {
    const error = new ErrorType(message);
    error.code = code;
    throw error;
  }
  function readKeys(command, key) {
    const isString = typeof key === "string";
    const isArray = Array.isArray(key) && key.every((item) => typeof item === "string");
    if (!isString && !isArray) {
      throwCode2(
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
      throwCode2(
        RangeError,
        `${command}: key must be a non-empty string or a non-empty array.`,
        "INVALID_KEY"
      );
    }
    if (keys.length > 1 && keys.includes("any")) {
      throwCode2(
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
      throwCode2(TypeError, `${command}: mode must be "up" or "down".`, "INVALID_MODE");
    }
    if (mode !== "up" && mode !== "down") {
      throwCode2(RangeError, `${command}: mode must be "up" or "down".`, "INVALID_MODE");
    }
  }
  function readFlag2(command, name, value, code) {
    if (value == null) {
      return false;
    }
    if (typeof value !== "boolean") {
      throwCode2(TypeError, `${command}: ${name} must be a boolean.`, code);
    }
    return value;
  }
  function readActionKeys(command, keys) {
    if (!Array.isArray(keys) || !keys.every((key) => typeof key === "string")) {
      throwCode2(TypeError, `${command}: keys must be an array of strings.`, "INVALID_KEYS");
    }
    if (keys.includes("")) {
      throwCode2(
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
  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      releaseHeldKeys();
    }
  }
  function removeHandler(handler) {
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
      removeHandler(handler);
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
})();
//# sourceMappingURL=keyboard.js.map
