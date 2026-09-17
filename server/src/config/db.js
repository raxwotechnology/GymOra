const mongoose = require("mongoose");

let cachedPromise = null;

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("[mongodb] MONGO_URI environment variable is missing!");
    throw new Error("MONGO_URI is not set");
  }

  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    }).then((m) => {
      console.log("[mongodb] Connected successfully");
      return m;
    }).catch((err) => {
      console.error("[mongodb] Connection failed:", err.message);
      cachedPromise = null;
      throw err;
    });
  }

  return cachedPromise;
}

module.exports = connectDB;

