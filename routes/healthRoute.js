const express = require("express");
const router = express.Router();
const { getHealthStatus } = require("../services/healthService");

router.get("/", (req, res) => {
  const data = getHealthStatus();

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = router;
