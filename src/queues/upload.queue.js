const redisConfig = require("../config/redis.config");

const UPLOAD_QUEUE_NAME = "excel-upload";

module.exports = {
  UPLOAD_QUEUE_NAME,
  redisConfig,
};
