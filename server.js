"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const {
  loadUsers,
  requireAuthentication,
  verifyCsrfToken,
  router: authRouter,
} = require("./auth");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIRECTORY = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIRECTORY, "products.json");
const SESSION_SECRET = process.env.SESSION_SECRET;
const CATEGORIES = ["Books", "Electronics", "Stationery", "Other"];
const CONDITIONS = ["Brand New", "Like New", "Good", "Fair"];
const MAX_IMAGE_DATA_LENGTH = 3 * 1024 * 1024;

let products = [];
let writeQueue = Promise.resolve();

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error("Set SESSION_SECRET to a random value of at least 32 characters in your .env file.");
}

app.use(express.json({ limit: "5mb" }));
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const sessionStore = new MemoryStore({
  checkPeriod: 24 * 60 * 60 * 1000,
  max: 1000,
});

app.use(
  session({
    name: "campus_cart.sid",
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);
app.use("/api/auth", authRouter);

function isStoredProduct(product) {
  return (
    product !== null &&
    typeof product === "object" &&
    typeof product.id === "string" &&
    typeof product.title === "string" &&
    typeof product.description === "string" &&
    typeof product.price === "number" &&
    Number.isFinite(product.price) &&
    product.price >= 0 &&
    typeof product.category === "string" &&
    CATEGORIES.includes(product.category) &&
    typeof product.condition === "string" &&
    CONDITIONS.includes(product.condition) &&
    typeof product.location === "string" &&
    typeof product.seller === "string" &&
    typeof product.contact === "string" &&
    typeof product.datePosted === "string" &&
    Number.isFinite(Date.parse(product.datePosted)) &&
    (product.image === undefined || typeof product.image === "string")
  );
}

async function loadProducts() {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true });

  let fileContents;
  try {
    fileContents = await fs.readFile(PRODUCTS_FILE, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await fs.writeFile(PRODUCTS_FILE, "[]\n", "utf8");
    return [];
  }

  let savedProducts;
  try {
    savedProducts = JSON.parse(fileContents);
  } catch (error) {
    throw new Error(`Could not parse ${PRODUCTS_FILE}: ${error.message}`);
  }

  if (
    !Array.isArray(savedProducts) ||
    !savedProducts.every(isStoredProduct) ||
    new Set(savedProducts.map((product) => product.id)).size !== savedProducts.length
  ) {
    throw new Error(
      `${PRODUCTS_FILE} must contain a JSON array of valid products with unique IDs.`,
    );
  }

  return savedProducts;
}

function changeProducts(change) {
  const operation = writeQueue.then(async () => {
    const updatedProducts = change(products);
    if (!updatedProducts) return null;

    const temporaryFile = `${PRODUCTS_FILE}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryFile, `${JSON.stringify(updatedProducts, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      await fs.rename(temporaryFile, PRODUCTS_FILE);
      products = updatedProducts;
      return updatedProducts;
    } catch (error) {
      await fs.rm(temporaryFile, { force: true });
      throw error;
    }
  });

  writeQueue = operation.catch(() => {});
  return operation;
}

function saveNewProduct(product) {
  return changeProducts((currentProducts) => [product, ...currentProducts]);
}

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
      datePosted: new Date().toISOString(),
      image,
    },
  };
}

function publicProduct(product) {
  const { sellerId, ...listing } = product;
  return listing;
}

app.get("/api/products", (request, response) => {
  const category = readFilter(request.query, "category", response);
  const location = readFilter(request.query, "location", response);
  const search = readFilter(request.query, "search", response);
  if (category === null || location === null || search === null) return;

  const results = products.filter((product) => {
    const isUserListing =
      typeof product.sellerId === "string" && product.sellerId.length > 0;
    const matchesCategory =
      !category || product.category.toLowerCase() === category.toLowerCase();
    const matchesLocation =
      !location || product.location.toLowerCase().includes(location.toLowerCase());
    const searchTerm = search.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      product.title.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm);

    return isUserListing && matchesCategory && matchesLocation && matchesSearch;
  });

  response.json(results.map(publicProduct));
});

app.get("/api/products/:id", (request, response) => {
  const product = products.find((item) => item.id === request.params.id);
  if (!product) {
    return response.status(404).json({ error: "Product not found." });
  }
  return response.json(publicProduct(product));
});

app.get("/api/my-products", requireAuthentication, (request, response) => {
  const ownProducts = products
    .filter((product) => product.sellerId === request.user.id)
    .map(publicProduct);
  response.set("Cache-Control", "no-store");
  return response.json(ownProducts);
});

app.post(
  "/api/products",
  requireAuthentication,
  verifyCsrfToken,
  async (request, response, next) => {
    const result = validateProduct(request.body);
    if (result.error) {
      return response.status(400).json({ error: result.error });
    }

    try {
      const product = {
        ...result.product,
        seller: request.user.name,
        sellerId: request.user.id,
      };
      await saveNewProduct(product);
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
      const updatedProducts = await changeProducts((currentProducts) => {
        const existingProduct = currentProducts.find((product) => product.id === request.params.id);
        if (!existingProduct) {
          const error = new Error("Product not found.");
          error.status = 404;
          throw error;
        }
        if (existingProduct.sellerId !== request.user.id) {
          const error = new Error("You can only edit your own listings.");
          error.status = 403;
          throw error;
        }

        const updatedProduct = {
          ...validation.product,
          id: existingProduct.id,
          datePosted: existingProduct.datePosted,
          image:
            request.body.image === undefined
              ? existingProduct.image || ""
              : validation.product.image,
          seller: request.user.name,
          sellerId: request.user.id,
        };
        request.updatedProduct = updatedProduct;
        return currentProducts.map((product) =>
          product.id === existingProduct.id ? updatedProduct : product,
        );
      });
      if (!updatedProducts) {
        return response.status(500).json({ error: "The product could not be updated." });
      }
      return response.json(publicProduct(request.updatedProduct));
    } catch (error) {
      if (error.status) return response.status(error.status).json({ error: error.message });
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
      let deleted = false;
      await changeProducts((currentProducts) => {
        const existingProduct = currentProducts.find((product) => product.id === request.params.id);
        if (!existingProduct) {
          const error = new Error("Product not found.");
          error.status = 404;
          throw error;
        }
        if (existingProduct.sellerId !== request.user.id) {
          const error = new Error("You can only delete your own listings.");
          error.status = 403;
          throw error;
        }

        deleted = true;
        return currentProducts.filter((product) => product.id !== existingProduct.id);
      });
      if (!deleted) {
        return response.status(500).json({ error: "The product could not be deleted." });
      }
      return response.status(204).end();
    } catch (error) {
      if (error.status) return response.status(error.status).json({ error: error.message });
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
  products = await loadProducts();
  const userCount = await loadUsers();
  app.listen(PORT, () => {
    console.log(`Campus Cart is running at http://localhost:${PORT}`);
    console.log(`Loaded ${products.length} saved product listing(s).`);
    console.log(`Loaded ${userCount} registered user account(s).`);
  });
}

startServer().catch((error) => {
  console.error(`Could not start Campus Cart: ${error.message}`);
  process.exitCode = 1;
});
