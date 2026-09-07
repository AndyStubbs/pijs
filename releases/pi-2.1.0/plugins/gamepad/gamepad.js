/**
 * gamepad - Gamepad input handling for Pi.js
 * @version 1.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
"use strict";
(() => {
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
})();
//# sourceMappingURL=gamepad.js.map
