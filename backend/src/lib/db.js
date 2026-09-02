require("dotenv").config();
const mongoose = require("mongoose");

async function connectDb() {
  const rawUri = process.env.MONGODB_URI || "";
  const uri = rawUri || "mongodb://127.0.0.1:27017/tajira";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`MongoDB connected: ${uri.replace(/\/\/([^@]+)@/, "//***@")}`);
    return "mongodb";
  } catch (err) {
    if (rawUri) {
      console.error(`MongoDB connection failed (${err.message}). Fix MONGODB_URI — data will not save until connected.`);
      throw err;
    }
    if (process.env.NODE_ENV === "production") throw err;
    console.warn(`MongoDB at ${uri} not reachable (${err.message}). Starting in-memory MongoDB.`);
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    const memUri = mem.getUri("tajira");
    await mongoose.connect(memUri);
    console.warn("In-memory MongoDB ready — data will NOT persist. Set MONGODB_URI to use your real cluster.");
    return "memory";
  }
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
