"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const express = require("express");

const router = express.Router();
const USERS_FILE = path.join(__dirname, "data", "users.json");
const PASSWORD_HASH_ROUNDS = 12;

let users = [];
let writeQueue = Promise.resolve();

router.use((request, response, next) => {
  response.set("Cache-Control", "no-store");
  return next();
});

function isStoredUser(user) {
  return (
    user !== null &&
    typeof user === "object" &&
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    typeof user.college === "string" &&
    typeof user.passwordHash === "string" &&
    typeof user.dateRegistered === "string"
  );
}

async function loadUsers() {
  let fileContents;
  try {
    fileContents = await fs.readFile(USERS_FILE, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await fs.writeFile(USERS_FILE, "[]\n", { encoding: "utf8", flag: "wx" });
    return [];
  }

  let savedUsers;
  try {
    savedUsers = JSON.parse(fileContents);
  } catch (error) {
    throw new Error(`Could not parse ${USERS_FILE}: ${error.message}`);
  }

  if (
    !Array.isArray(savedUsers) ||
    !savedUsers.every(isStoredUser) ||
    new Set(savedUsers.map((user) => user.email)).size !== savedUsers.length
  ) {
    throw new Error(
      `${USERS_FILE} must contain a JSON array of valid users with unique email addresses.`,
    );
  }

  return savedUsers;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    college: user.college,
  };
}

function createCsrfToken(session) {
  if (!session.csrfToken) {
    session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return session.csrfToken;
}

function verifyCsrfToken(request, response, next) {
  const submittedToken = request.get("X-CSRF-Token");
  const sessionToken = request.session.csrfToken;
  const submittedBuffer =
    typeof submittedToken === "string" ? Buffer.from(submittedToken) : null;
  const sessionBuffer =
    typeof sessionToken === "string" ? Buffer.from(sessionToken) : null;

  if (
    !submittedBuffer ||
    !sessionBuffer ||
    submittedBuffer.length !== sessionBuffer.length ||
    !crypto.timingSafeEqual(submittedBuffer, sessionBuffer)
  ) {
    return response.status(403).json({
      error: "Your session token is missing or expired. Refresh the page and try again.",
    });
  }

  return next();
}

function requireAuthentication(request, response, next) {
  if (!request.session.userId) {
    return response.status(401).json({ error: "Please log in to continue." });
  }

  const user = users.find((item) => item.id === request.session.userId);
  if (!user) {
    return request.session.destroy((error) => {
      if (error) return next(error);
      return response.status(401).json({ error: "Your session has expired. Please log in again." });
    });
  }

  request.user = user;
  return next();
}

function saveNewUser(user) {
  const operation = writeQueue.then(async () => {
    if (users.some((existing) => existing.email === user.email)) {
      const error = new Error("An account with this email already exists.");
      error.status = 409;
      throw error;
    }

    const updatedUsers = [...users, user];
    const temporaryFile = `${USERS_FILE}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryFile, `${JSON.stringify(updatedUsers, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      await fs.rename(temporaryFile, USERS_FILE);
      users = updatedUsers;
    } catch (error) {
      await fs.rm(temporaryFile, { force: true });
      throw error;
    }
  });

  writeQueue = operation.catch(() => {});
  return operation;
}

function validateRegistration(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Send registration details as a JSON object." };
  }

  const fields = ["name", "email", "college", "password", "confirmPassword"];
  for (const field of fields) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      return { error: `${field} is required.` };
    }
    if (/[\u0000-\u001f\u007f]/.test(body[field])) {
      return { error: `${field} contains invalid control characters.` };
    }
  }

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const college = body.college.trim();
  if (name.length > 100) return { error: "Full name must be 100 characters or fewer." };
  if (college.length > 120) return { error: "College name must be 120 characters or fewer." };
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  ) {
    return { error: "Enter a valid email address." };
  }
  if (body.password !== body.confirmPassword) {
    return { error: "Password and confirm password do not match." };
  }

  const passwordBytes = Buffer.byteLength(body.password, "utf8");
  if (body.password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (passwordBytes > 72) {
    return { error: "Password must be no more than 72 bytes." };
  }

  return { userDetails: { name, email, college, password: body.password } };
}

function validateLogin(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    !body.email.trim() ||
    !body.password
  ) {
    return { error: "Enter your email address and password." };
  }
  if (
    body.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email.trim())
  ) {
    return { error: "Enter a valid email address." };
  }
  if (Buffer.byteLength(body.password, "utf8") > 72) {
    return { error: "Email or password is incorrect." };
  }
  return { email: body.email.trim().toLowerCase(), password: body.password };
}

router.get("/csrf", (request, response, next) => {
  request.session.csrfToken = crypto.randomBytes(32).toString("hex");
  request.session.save((error) => {
    if (error) return next(error);
    return response.json({ csrfToken: request.session.csrfToken });
  });
});

router.get("/me", (request, response, next) => {
  const user = users.find((item) => item.id === request.session.userId);
  if (!user) {
    if (request.session.userId) {
      return request.session.destroy((error) => {
        if (error) return next(error);
        return response.json({ authenticated: false, csrfToken: null });
      });
    }
    return response.json({ authenticated: false, csrfToken: createCsrfToken(request.session) });
  }

  createCsrfToken(request.session);
  return request.session.save((error) => {
    if (error) return next(error);
    return response.json({
      authenticated: true,
      user: publicUser(user),
      csrfToken: request.session.csrfToken,
    });
  });
});

router.post("/register", verifyCsrfToken, async (request, response, next) => {
  const validation = validateRegistration(request.body);
  if (validation.error) return response.status(400).json({ error: validation.error });

  if (users.some((user) => user.email === validation.userDetails.email)) {
    return response.status(409).json({ error: "An account with this email already exists." });
  }

  try {
    const passwordHash = await bcrypt.hash(
      validation.userDetails.password,
      PASSWORD_HASH_ROUNDS,
    );
    const user = {
      id: crypto.randomUUID(),
      name: validation.userDetails.name,
      email: validation.userDetails.email,
      college: validation.userDetails.college,
      passwordHash,
      dateRegistered: new Date().toISOString(),
    };

    await saveNewUser(user);
    return response.status(201).json({
      message: "Your account has been created. You can now log in.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.status === 409) return response.status(409).json({ error: error.message });
    return next(error);
  }
});

router.post("/login", verifyCsrfToken, async (request, response, next) => {
  const validation = validateLogin(request.body);
  if (validation.error) return response.status(400).json({ error: validation.error });

  const user = users.find((item) => item.email === validation.email);
  const passwordMatches =
    user && (await bcrypt.compare(validation.password, user.passwordHash));
  if (!passwordMatches) {
    return response.status(401).json({ error: "Email or password is incorrect." });
  }

  return request.session.regenerate((error) => {
    if (error) return next(error);
    request.session.userId = user.id;
    request.session.csrfToken = crypto.randomBytes(32).toString("hex");
    return request.session.save((saveError) => {
      if (saveError) return next(saveError);
      return response.json({
        message: "You are now logged in.",
        user: publicUser(user),
        csrfToken: request.session.csrfToken,
      });
    });
  });
});

router.post("/logout", verifyCsrfToken, (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie("campus_cart.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response.json({ message: "You have been logged out." });
  });
});

module.exports = {
  router,
  requireAuthentication,
  verifyCsrfToken,
  loadUsers: async () => {
    users = await loadUsers();
    return users.length;
  },
};
