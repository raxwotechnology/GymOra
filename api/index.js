let app;
try {
  app = require("../server/src/app");
} catch (err) {
  console.error("Critical error loading Express app:", err);
  const express = require("express");
  app = express();
  app.all("*", (_req, res) => {
    res.status(500).json({
      error: "Critical Server Initialization Failure",
      message: err.message,
      stack: err.stack
    });
  });
}

module.exports = app;

