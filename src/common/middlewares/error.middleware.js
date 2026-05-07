const logger = require("../../config/logger.config");

module.exports = (err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
};
