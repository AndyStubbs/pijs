"use strict";
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

// plugins/example-plugin/index.js
var index_exports = {};
__export(index_exports, {
  default: () => examplePlugin
});
module.exports = __toCommonJS(index_exports);
function examplePlugin(pluginApi) {
  pluginApi.addScreenDataItem("exampleData", {
    "clicks": 0,
    "timestamp": null
  });
  pluginApi.addScreenInitFunction((screenData) => {
    screenData.exampleData.timestamp = Date.now();
  });
  pluginApi.addScreenCleanupFunction((screenData) => {
    screenData.exampleData = null;
  });
  pluginApi.addCommand("hello", hello, ["name"]);
  function hello(options) {
    const name = options.name || "World";
    const message = `Hello, ${name}!`;
    console.log(message);
    return message;
  }
  pluginApi.addScreenCommand("trackClick", trackClick, ["x", "y"]);
  function trackClick(screenData, options) {
    screenData.exampleData.clicks++;
    const x = options.x || 0;
    const y = options.y || 0;
    console.log(`Click #${screenData.exampleData.clicks} at (${x}, ${y})`);
    return screenData.exampleData.clicks;
  }
  pluginApi.addCommand("getLibraryInfo", getLibraryInfo, []);
  function getLibraryInfo() {
    const api = pluginApi.getApi();
    return {
      "version": api.version,
      "pluginSystem": "enabled"
    };
  }
  pluginApi.addScreenCommand("drawRandomCircle", drawRandomCircle, ["x", "y", "radius"]);
  function drawRandomCircle(screenData, options) {
    const x = options.x || 0;
    const y = options.y || 0;
    const radius = options.radius || 50;
    const utils = pluginApi.utils;
    const r = Math.floor(utils.rndRange(0, 256));
    const g = Math.floor(utils.rndRange(0, 256));
    const b = Math.floor(utils.rndRange(0, 256));
    const color = utils.rgbToColor(r, g, b, 255);
    const ctx = screenData.context;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color.s;
    ctx.fill();
  }
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "example-plugin",
    "version": "1.0.0",
    "description": "Example plugin demonstrating Pi.js plugin capabilities",
    "init": examplePlugin
  });
}
//# sourceMappingURL=example-plugin.cjs.js.map
