const mongoose = require('mongoose');
const logger = require('./logger.config');

// Maximum number of connection attempts before giving up
const MAX_RETRIES = 5;
// Delay between retries in ms
const RETRY_DELAY = 3000;

let retryCount = 0;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.ATLAS_URI;
  if (!uri) {
    logger.error('MongoDB connection string not defined in environment variables');
    throw new Error('MongoDB connection string missing');
  }

  const options = {
    // Use the new URL parser
    useNewUrlParser: true,
    // Use the new Server Discover and Monitoring engine
    useUnifiedTopology: true,
    // Server selection timeout: how long the driver will try to select a server before throwing an error
    serverSelectionTimeoutMS: 5000,
    // Socket timeout (ms) for inactivity on established connections
    socketTimeoutMS: 45000,
    // Auto-reconnect settings handled by the driver
    // No need to set reconnectTries/reconnectInterval in Mongoose 6+; use unified topology
  };

  const attemptConnection = async () => {
    try {
      await mongoose.connect(uri, options);
      logger.info('✅ MongoDB connected successfully');
    } catch (err) {
      retryCount++;
      logger.error(`MongoDB connection attempt ${retryCount} failed: ${err.message}`);
      if (retryCount < MAX_RETRIES) {
        logger.info(`Retrying MongoDB connection in ${RETRY_DELAY}ms...`);
        await new Promise(res => setTimeout(res, RETRY_DELAY));
        await attemptConnection();
      } else {
        logger.error('Exceeded maximum MongoDB connection attempts');
        throw err; // propagate to caller
      }
    }
  };

  // Register mongoose connection event listeners for better observability
  mongoose.connection.on('connected', () => logger.info('Mongoose connected to DB'));
  mongoose.connection.on('error', err => logger.error(`Mongoose connection error: ${err}`));
  mongoose.connection.on('disconnected', () => logger.warn('Mongoose disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('Mongoose reconnected'));

  // Initial attempt
  await attemptConnection();
};

module.exports = connectDB;
