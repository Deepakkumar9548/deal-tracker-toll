const mongoose = require('mongoose');
const { mongoUri } = require("./env.config");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host} ✅`);
  } catch (err) {
    console.error(`DB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
