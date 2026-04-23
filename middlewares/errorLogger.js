const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  logger.error("Unhandled Error", {
    meta: {
      message: err.message,
      stack: err.stack,
      route: req.originalUrl,
      userId: req.user?._id,
      body: req.body,
      params: req.params,
      correlationId: req.correlationId
    }
  });

  next(err);
};
