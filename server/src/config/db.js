const mongoose = require("mongoose");

let cachedPromise = null;

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    }).then((m) => {
      console.log("[mongodb] Connected successfully");
      return m;
    });
  }

  return cachedPromise;
}

module.exports = connectDB;
