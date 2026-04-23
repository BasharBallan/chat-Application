const mongoose = require("mongoose");
const pkg = require("../package.json");

exports.getHealthStatus = () => {
  const dbState = mongoose.connection.readyState;

  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: pkg.version,
    database: {
      state: states[dbState] || "unknown",
    },
  };
};
