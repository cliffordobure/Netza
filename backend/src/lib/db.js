require("dotenv").config();
const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/netza";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log(`MongoDB connected: ${uri.replace(/\/\/([^@]+)@/, "//***@")}`);
    return "mongodb";
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
    console.warn(`MongoDB at ${uri} not reachable (${err.message}). Starting in-memory MongoDB.`);
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    const memUri = mem.getUri("netza");
    await mongoose.connect(memUri);
    console.log("In-memory MongoDB ready (set MONGODB_URI to use a real cluster)");
    return "memory";
  }
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
