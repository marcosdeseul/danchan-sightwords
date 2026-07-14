"use strict";

const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function normalizeEmail(email) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  return normalized || null;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username) {
  if (typeof username !== "string" || username.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (username.length > 24) {
    return "Username must be 24 characters or fewer.";
  }

  if (!/^[a-z0-9_-]+$/.test(username)) {
    return "Username can use letters, numbers, dashes, and underscores.";
  }

  return null;
}

function validateOptionalEmail(email) {
  if (email === null) {
    return null;
  }

  if (!isValidEmail(email)) {
    return "Enter a valid email address or leave it blank.";
  }

  return null;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);

  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string") {
    return false;
  }

  const [algorithm, salt, hash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  const hashBuffer = Buffer.from(hash, "hex");

  if (hashBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, derivedKey);
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  if (password.length > 200) {
    return "Password is too long.";
  }

  return null;
}

module.exports = {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  normalizeUsername,
  validateOptionalEmail,
  validatePassword,
  validateUsername,
  verifyPassword,
};
