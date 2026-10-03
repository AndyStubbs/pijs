/**
 * gamepad - Gamepad input handling for Pi.js
 * @version 2.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
"use strict";
(() => {
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
    const pad = getBrowserGamepads()[options.gamepadIndex];
    if (!pad || !pad.connected || !isDualRumble(pad.vibrationActuator)) {
      return false;
    }
    const played = pad.vibrationActuator.playEffect("dual-rumble", {
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
})();
//# sourceMappingURL=gamepad.js.map
