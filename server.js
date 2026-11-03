"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStoreModule = require("connect-mongo");
const MongoStore = MongoStoreModule.default || MongoStoreModule;
const mongoose = require("mongoose");
const { connectDatabase } = require("./db");
const Product = require("./models/Product");
const {
  requireAuthentication,
  verifyCsrfToken,
  router: authRouter,
} = require("./auth");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CATEGORIES = ["Books", "Electronics", "Stationery", "Other"];
const CONDITIONS = ["Brand New", "Like New", "Good", "Fair"];
const MAX_IMAGE_DATA_LENGTH = 3 * 1024 * 1024;
let sessionMiddleware;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error("Set SESSION_SECRET to a random value of at least 32 characters in your .env file.");
}

app.use(express.json({ limit: "5mb" }));
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use((request, response, next) => {
  if (!sessionMiddleware) {
    return next(new Error("Session storage is not ready."));
  }
  return sessionMiddleware(request, response, next);
});
app.use("/api/auth", authRouter);

function readFilter(query, name, response) {
  const value = query[name];
  if (value === undefined) return "";
  if (typeof value !== "string") {
    response.status(400).json({ error: `The ${name} filter must be a single text value.` });
    return null;
  }
  if (value.length > 120) {
    response.status(400).json({ error: `The ${name} filter must be 120 characters or fewer.` });
    return null;
  }
  return value.trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateProduct(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Send product details as a JSON object." };
  }

  const textLimits = {
    title: 120,
    description: 2000,
    location: 120,
    contact: 120,
  };
  const textValues = {};

  for (const [field, maxLength] of Object.entries(textLimits)) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      return { error: `${field} is required.` };
    }
    const value = body[field].trim();
    if (value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) {
      return { error: `${field} must be at most ${maxLength} characters without control characters.` };
    }
    textValues[field] = value;
  }

  if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0) {
    return { error: "Price must be a valid non-negative number." };
  }
  if (!CATEGORIES.includes(body.category)) {
    return { error: `Category must be one of: ${CATEGORIES.join(", ")}.` };
  }
  if (!CONDITIONS.includes(body.condition)) {
    return { error: `Condition must be one of: ${CONDITIONS.join(", ")}.` };
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValues.contact);
  const isPhone =
    /^\+?[\d\s().-]{5,24}$/.test(textValues.contact) &&
    textValues.contact.replace(/\D/g, "").length >= 5;
  if (!isEmail && !isPhone) {
    return { error: "Contact must be a valid email address or phone number." };
  }

  let image = "";
  if (body.image !== undefined && body.image !== null && body.image !== "") {
    if (typeof body.image !== "string") {
      return { error: "Image must be an HTTPS URL or a supported image data URL." };
    }
    const isDataImage =
      body.image.length <= MAX_IMAGE_DATA_LENGTH &&
      /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/]+=*$/i.test(body.image);
    let isHttpsImage = false;
    try {
      isHttpsImage = new URL(body.image).protocol === "https:";
    } catch {
      isHttpsImage = false;
    }
    if (!isDataImage && !isHttpsImage) {
      return {
        error: "Image must be an HTTPS URL or a supported image data URL under 2 MB.",
      };
    }
    image = body.image;
  }

  return {
    product: {
      id: crypto.randomUUID(),
      ...textValues,
      price: body.price,
      category: body.category,
      condition: body.condition,
      datePosted: new Date(),
      image,
    },
  };
}

function publicProduct(product) {
  const listing = typeof product.toObject === "function" ? product.toObject() : product;
  const { sellerId, _id, ...publicListing } = listing;
  return publicListing;
}

app.get("/api/products", async (request, response, next) => {
  const category = readFilter(request.query, "category", response);
  const location = readFilter(request.query, "location", response);
  const search = readFilter(request.query, "search", response);
  if (category === null || location === null || search === null) return;

  const query = { sellerId: { $exists: true, $ne: "" } };
  if (category) query.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  if (location) query.location = new RegExp(escapeRegex(location), "i");
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    query.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  try {
    const products = await Product.find(query).sort({ datePosted: -1 }).lean();
    return response.json(products.map(publicProduct));
  } catch (error) {
    return next(error);
  }
});

app.get("/api/products/:id", async (request, response, next) => {
  try {
    const product = await Product.findOne({ id: request.params.id }).lean();
    if (!product) return response.status(404).json({ error: "Product not found." });
    return response.json(publicProduct(product));
  } catch (error) {
    return next(error);
  }
});

app.get("/api/my-products", requireAuthentication, async (request, response, next) => {
  try {
    const products = await Product.find({ sellerId: request.user.id })
      .sort({ datePosted: -1 })
      .lean();
    response.set("Cache-Control", "no-store");
    return response.json(products.map(publicProduct));
  } catch (error) {
    return next(error);
  }
});

app.post(
  "/api/products",
  requireAuthentication,
  verifyCsrfToken,
  async (request, response, next) => {
    const result = validateProduct(request.body);
    if (result.error) return response.status(400).json({ error: result.error });

    try {
      const product = await Product.create({
        ...result.product,
        seller: request.user.name,
        sellerId: request.user.id,
      });
      return response.status(201).json(publicProduct(product));
    } catch (error) {
      return next(error);
    }
  },
);

app.put(
  "/api/products/:id",
  requireAuthentication,
  verifyCsrfToken,
  async (request, response, next) => {
    const validation = validateProduct(request.body);
    if (validation.error) {
      return response.status(400).json({ error: validation.error });
    }

    try {
      const existingProduct = await Product.findOne({ id: request.params.id });
      if (!existingProduct) {
        return response.status(404).json({ error: "Product not found." });
      }
      if (existingProduct.sellerId !== request.user.id) {
        return response.status(403).json({ error: "You can only edit your own listings." });
      }

      existingProduct.set({
        ...validation.product,
        id: existingProduct.id,
        datePosted: existingProduct.datePosted,
        image:
          request.body.image === undefined
            ? existingProduct.image || ""
            : validation.product.image,
        seller: request.user.name,
        sellerId: request.user.id,
      });
      await existingProduct.save();
      return response.json(publicProduct(existingProduct));
    } catch (error) {
      return next(error);
    }
  },
);

app.delete(
  "/api/products/:id",
  requireAuthentication,
  verifyCsrfToken,
  async (request, response, next) => {
    try {
      const existingProduct = await Product.findOne({ id: request.params.id });
      if (!existingProduct) {
        return response.status(404).json({ error: "Product not found." });
      }
      if (existingProduct.sellerId !== request.user.id) {
        return response.status(403).json({ error: "You can only delete your own listings." });
      }

      await Product.deleteOne({ _id: existingProduct._id });
      return response.status(204).end();
    } catch (error) {
      return next(error);
    }
  },
);

app.use("/api", (request, response) => {
  response.status(404).json({ error: "API route not found." });
});

app.get("/", (request, response) => {
  response.sendFile(path.join(__dirname, "code.html"));
});

app.get(["/login", "/login.html"], (request, response) => {
  response.sendFile(path.join(__dirname, "login.html"));
});

app.get(["/signup", "/signup.html"], (request, response) => {
  response.sendFile(path.join(__dirname, "signup.html"));
});

app.get([
  "/code.html",
  "/style.css",
  "/code.js",
  "/auth-pages.js",
  "/auth-pages.css",
  "/screen.png",
], (request, response, next) => {
  const requestedFile = path.basename(request.path);
  response.sendFile(path.join(__dirname, requestedFile), (error) => {
    if (error) next(error);
  });
});

app.use((request, response) => {
  response.status(404).send("Page not found.");
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);

  if (error.type === "entity.parse.failed") {
    return response.status(400).json({ error: "Request body must contain valid JSON." });
  }
  if (error.type === "entity.too.large") {
    return response.status(413).json({ error: "Request body is too large." });
  }

  console.error("Campus Cart server error:", error);
  return response.status(500).json({ error: "An unexpected server error occurred." });
});

async function startServer() {
  await connectDatabase();
  sessionMiddleware = session({
    name: "campus_cart.sid",
    secret: SESSION_SECRET,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      collectionName: "sessions",
      ttl: 8 * 60 * 60,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
    },
  });
  app.listen(PORT, () => {
    console.log(`Campus Cart is running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error(`Could not start Campus Cart: ${error.message}`);
  process.exitCode = 1;
});
