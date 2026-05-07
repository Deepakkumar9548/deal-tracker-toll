const mongoose = require('mongoose');
const { mongoUri } = require("./env.config");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host} ✅`);
  } catch (err) {
    console.error(`DB Connection Error: ${err.message}`);
    // Process should not exit in serverless environments
  }
};

module.exports = connectDB;
