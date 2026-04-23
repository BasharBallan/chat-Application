const { v4: uuid } = require("uuid");

module.exports = (req, res, next) => {
  req.correlationId = uuid();
  res.setHeader("X-Correlation-ID", req.correlationId);
  next();
};
