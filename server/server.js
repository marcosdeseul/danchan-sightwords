"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { pool, query } = require("./db");
const {
  hashPassword,
  normalizeEmail,
  normalizeUsername,
  validateOptionalEmail,
  validatePassword,
  validateUsername,
  verifyPassword,
} = require("./auth");
const { PUBLIC_CONTENT, CONTENT_VERSION } = require("./content");
const {
  createDefaultProgress,
  mergeProgress,
  sanitizeProgress,
} = require("./progress");
const { migrate } = require("./migrate");

const PORT = Number(process.env.PORT || 4173);
const DIST_DIR = path.join(__dirname, "..", "dist");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const CLIENT_DIR = fs.existsSync(path.join(DIST_DIR, "index.html")) ? DIST_DIR : null;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function createApp() {
  const app = express();
  const sessionSecret = process.env.SESSION_SECRET;

  if (IS_PRODUCTION && !sessionSecret) {
    throw new Error("SESSION_SECRET is required in production.");
  }

  if (IS_PRODUCTION) {
    app.set("trust proxy", 1);
  }

  app.use(express.json({ limit: "300kb" }));
  app.use(
    session({
      name: "dan.sid",
      secret: sessionSecret || "development-only-secret",
      store: new PgSession({
        pool,
        tableName: "sessions",
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PRODUCTION,
        maxAge: 1000 * 60 * 60 * 24 * 30,
      },
    }),
  );

  app.get("/api/health", asyncHandler(async (req, res) => {
    await query("SELECT 1");
    res.json({ ok: true });
  }));

  app.get("/api/content", (req, res) => {
    res.json(PUBLIC_CONTENT);
  });

  app.get("/api/me", asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    res.json({ user });
  }));

  app.post("/api/auth/signup", asyncHandler(async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    const usernameError = validateUsername(username);

    if (usernameError) {
      return res.status(400).json({ error: usernameError });
    }

    const emailError = validateOptionalEmail(email);

    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const passwordHash = await hashPassword(password);

    try {
      const result = await query(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
        [username, email, passwordHash],
      );
      const user = result.rows[0];

      await saveProgress(user.id, createDefaultProgress());
      req.session.userId = user.id;
      await saveSession(req);
      res.status(201).json({ user, progress: await loadProgress(user.id) });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: duplicateAccountMessage(error),
        });
      }

      throw error;
    }
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const password = req.body?.password;
    const usernameError = validateUsername(username);

    if (usernameError || typeof password !== "string") {
      return res.status(401).json({ error: "Username or password is incorrect." });
    }

    const result = await query(
      "SELECT id, username, email, password_hash FROM users WHERE username = $1",
      [username],
    );
    const userRow = result.rows[0];

    if (!userRow || !(await verifyPassword(password, userRow.password_hash))) {
      return res.status(401).json({ error: "Username or password is incorrect." });
    }

    req.session.userId = userRow.id;
    await saveSession(req);

    res.json({
      user: toPublicUser(userRow),
      progress: await loadProgress(userRow.id),
    });
  }));

  app.post("/api/auth/logout", asyncHandler(async (req, res) => {
    await destroySession(req);
    res.json({ ok: true });
  }));

  app.put("/api/me", requireAuth, asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const emailError = validateOptionalEmail(email);

    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    try {
      const result = await query(
        "UPDATE users SET email = $1, updated_at = now() WHERE id = $2 RETURNING id, username, email",
        [email, req.session.userId],
      );

      res.json({ user: toPublicUser(result.rows[0]) });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: duplicateAccountMessage(error),
        });
      }

      throw error;
    }
  }));

  app.get("/api/progress", requireAuth, asyncHandler(async (req, res) => {
    res.json({ progress: await loadProgress(req.session.userId) });
  }));

  app.put("/api/progress", requireAuth, asyncHandler(async (req, res) => {
    const progress = sanitizeProgress(req.body?.progress);
    await saveProgress(req.session.userId, progress);
    res.json({ progress });
  }));

  app.post("/api/progress/import-local", requireAuth, asyncHandler(async (req, res) => {
    const existing = await loadProgress(req.session.userId);
    const merged = mergeProgress(existing, req.body?.progress);
    await saveProgress(req.session.userId, merged);
    res.json({ progress: merged });
  }));

  app.get("/content.js", (req, res) => {
    res
      .type("application/javascript")
      .send(`window.SIGHT_WORD_CONTENT = ${JSON.stringify(PUBLIC_CONTENT)};\n`);
  });

  if (CLIENT_DIR) {
    app.use(express.static(CLIENT_DIR));
  }

  app.use(express.static(PUBLIC_DIR));
  app.get(/.*/, (req, res) => {
    if (!CLIENT_DIR) {
      return res
        .status(404)
        .send("Frontend is not built. Run npm run dev for local development or npm run build before npm start.");
    }

    res.sendFile(path.join(CLIENT_DIR, "index.html"));
  });

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(error.status || 500).json({
      error: error.expose ? error.message : "Something went wrong.",
    });
  });

  return app;
}

async function currentUser(req) {
  if (!req.session?.userId) {
    return null;
  }

  const result = await query("SELECT id, username, email FROM users WHERE id = $1", [
    req.session.userId,
  ]);

  return result.rows[0] ? toPublicUser(result.rows[0]) : null;
}

function toPublicUser(userRow) {
  return {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email || null,
  };
}

function duplicateAccountMessage(error) {
  const constraint = String(error.constraint || "");

  if (constraint.includes("email")) {
    return "That email is already used by another account.";
  }

  return "That username already has an account.";
}

async function loadProgress(userId) {
  const result = await query(
    "SELECT state, content_version FROM user_progress WHERE user_id = $1",
    [userId],
  );

  if (!result.rows[0]) {
    const progress = createDefaultProgress();
    await saveProgress(userId, progress);
    return progress;
  }

  const progress = sanitizeProgress(result.rows[0].state);

  if (result.rows[0].content_version !== CONTENT_VERSION) {
    await saveProgress(userId, progress);
  }

  return progress;
}

async function saveProgress(userId, progress) {
  const cleanProgress = sanitizeProgress(progress);

  await query(
    `
      INSERT INTO user_progress (user_id, content_version, state, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (user_id) DO UPDATE
      SET content_version = EXCLUDED.content_version,
          state = EXCLUDED.state,
          updated_at = now()
    `,
    [userId, CONTENT_VERSION, cleanProgress],
  );

  return cleanProgress;
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Please log in first." });
  }

  next();
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function start() {
  await migrate();
  const app = createApp();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sight words game listening on http://0.0.0.0:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  loadProgress,
  saveProgress,
};
