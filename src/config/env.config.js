require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/dealtracker",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  nodeEnv: process.env.NODE_ENV || "development",
};
