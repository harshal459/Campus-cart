"use strict";

const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add your MongoDB Atlas connection string to .env.");
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`Connected to MongoDB database "${mongoose.connection.name}".`);
  } catch (error) {
    throw new Error(`Could not connect to MongoDB: ${error.message}`);
  }
}

module.exports = { connectDatabase };
