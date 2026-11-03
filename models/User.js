"use strict";

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    college: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    dateRegistered: { type: Date, required: true },
  },
  { versionKey: false },
);

module.exports = mongoose.model("User", userSchema);
