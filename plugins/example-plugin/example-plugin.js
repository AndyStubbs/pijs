"use strict";
(() => {
  // plugins/example-plugin/index.js
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
})();
//# sourceMappingURL=example-plugin.js.map
