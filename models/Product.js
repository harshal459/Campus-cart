"use strict";

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: ["Books", "Electronics", "Stationery", "Other"] },
    condition: { type: String, required: true, enum: ["Brand New", "Like New", "Good", "Fair"] },
    location: { type: String, required: true },
    seller: { type: String, required: true },
    contact: { type: String, required: true },
    datePosted: { type: Date, required: true },
    image: { type: String, default: "" },
    sellerId: { type: String, required: true, index: true },
  },
  { versionKey: false },
);

module.exports = mongoose.model("Product", productSchema);
