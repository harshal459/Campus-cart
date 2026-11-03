"use strict";

require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const { connectDatabase } = require("./db");
const User = require("./models/User");
const Product = require("./models/Product");

async function readJson(fileName) {
  const filePath = path.join(__dirname, "data", fileName);
  const contents = await fs.readFile(filePath, "utf8");
  const records = JSON.parse(contents);
  if (!Array.isArray(records)) {
    throw new Error(`${fileName} must contain a JSON array.`);
  }
  return records;
}

async function importUsers(users) {
  let imported = 0;
  let skipped = 0;
  for (const user of users) {
    const existing = await User.exists({ $or: [{ id: user.id }, { email: user.email }] });
    if (existing) {
      skipped += 1;
      continue;
    }
    await User.create(user);
    imported += 1;
  }
  return { imported, skipped };
}

async function importProducts(products) {
  let imported = 0;
  let skipped = 0;
  for (const product of products) {
    if (await Product.exists({ id: product.id })) {
      skipped += 1;
      continue;
    }
    await Product.create(product);
    imported += 1;
  }
  return { imported, skipped };
}

async function migrate() {
  await connectDatabase();
  const [users, products] = await Promise.all([
    readJson("users.json"),
    readJson("products.json"),
  ]);
  const userResults = await importUsers(users);
  const productResults = await importProducts(products);

  console.log(
    `Users: imported ${userResults.imported}, skipped ${userResults.skipped}.`,
  );
  console.log(
    `Products: imported ${productResults.imported}, skipped ${productResults.skipped}.`,
  );
}

migrate()
  .catch((error) => {
    console.error(`Data migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
