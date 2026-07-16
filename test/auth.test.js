"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  normalizeUsername,
  validateOptionalEmail,
  validatePassword,
  validateUsername,
  verifyPassword,
} = require("../server/auth");

test("username auth helpers normalize and validate kid-friendly usernames", () => {
  assert.equal(normalizeUsername(" Dan_Player-1 "), "dan_player-1");
  assert.equal(normalizeUsername(null), "");
  assert.equal(validateUsername("dan"), null);
  assert.equal(validateUsername("dan_player-1"), null);
  assert.equal(validateUsername(""), "Username must be at least 3 characters.");
  assert.equal(validateUsername(123), "Username must be at least 3 characters.");
  assert.equal(
    validateUsername("a".repeat(25)),
    "Username must be 24 characters or fewer.",
  );
  assert.equal(
    validateUsername("dan player"),
    "Username can use letters, numbers, dashes, and underscores.",
  );
});

test("email helpers allow blank optional email and validate configured email", () => {
  assert.equal(normalizeEmail(" Dan@Example.COM "), "dan@example.com");
  assert.equal(normalizeEmail("   "), null);
  assert.equal(normalizeEmail(undefined), null);
  assert.equal(isValidEmail("dan@example.com"), true);
  assert.equal(isValidEmail("dan"), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(validateOptionalEmail(null), null);
  assert.equal(validateOptionalEmail("dan@example.com"), null);
  assert.equal(
    validateOptionalEmail("dan"),
    "Enter a valid email address or leave it blank.",
  );
});

test("password helpers validate and verify scrypt hashes", async () => {
  assert.equal(validatePassword("secret1"), null);
  assert.equal(validatePassword("short"), "Password must be at least 6 characters.");
  assert.equal(validatePassword(null), "Password must be at least 6 characters.");
  assert.equal(validatePassword("a".repeat(201)), "Password is too long.");

  const hash = await hashPassword("secret1");

  assert.match(hash, /^scrypt:[a-f0-9]+:[a-f0-9]+$/);
  assert.equal(await verifyPassword("secret1", hash), true);
  assert.equal(await verifyPassword("wrong-pass", hash), false);
  assert.equal(await verifyPassword("secret1", null), false);
  assert.equal(await verifyPassword("secret1", "bcrypt:salt:hash"), false);
  assert.equal(await verifyPassword("secret1", "scrypt::hash"), false);
  assert.equal(await verifyPassword("secret1", "scrypt:salt:"), false);
  assert.equal(await verifyPassword("secret1", "scrypt:salt:00"), false);
});
