const logger = require("../utils/logger");

module.exports = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info("HTTP Request", {
      meta: {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?._id,
        ip: req.ip,
        device: req.headers["user-agent"],
        correlationId: req.correlationId
      }
    });
  });

  next();
};
