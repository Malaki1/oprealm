export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  return json({
    ok: true,
    authenticated: Boolean(user),
    user: user
      ? {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        parentEmail: user.parent_email,
        ageBand: user.age_band,
        tier: user.tier,
        creditsRemaining: user.credits_remaining,
        safetyCompleted: Boolean(user.safety_completed),
        createdAt: user.created_at,
      }
      : null,
  });
}

export async function onRequestPost({ request, env }) {
  try {
    return await handleAccountPost(request, env);
  } catch (error) {
    console.error("Account API failed before response", error);
    return json(
      {
        ok: false,
        error: "The account service hit a temporary server error. Please try again, or ask an OPRealm admin to check the latest deployment.",
      },
      500,
    );
  }
}

async function handleAccountPost(request, env) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  await ensureAccountSchema(env);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const action = body.action || "";
  if (["register", "login", "request_reset"].includes(action)) {
    const turnstile = await verifyTurnstile(request, env, body.turnstileToken || body["cf-turnstile-response"] || "");
    if (!turnstile.ok) return json({ ok: false, error: turnstile.error }, 403);
  }

  try {
    if (action === "register") return await register(request, env, body);
    if (action === "login") return await login(request, env, body);
    if (action === "logout") return logout();
    if (action === "update_profile") return await updateProfile(request, env, body);
    if (action === "change_password") return await changePassword(request, env, body);
    if (action === "request_reset") return await requestReset(request, env, body);
    if (action === "reset_password") return await resetPassword(env, body);
  } catch (error) {
    console.error("Account API failed", error);
    return json(
      {
        ok: false,
        error: `Account database error: ${error?.message || "unknown database issue"}`,
      },
      500,
    );
  }

  return json({ ok: false, error: "Unsupported account action." }, 400);
}

async function register(request, env, body) {
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  const displayName = cleanText(body.displayName || body.display_name || "", 48);
  const parentEmail = cleanEmail(body.parentEmail || body.parent_email || "");
  const ageBand = cleanText(body.ageBand || body.age_band || "", 24);

  if (!email || !displayName || password.length < 10) {
    return json({ ok: false, error: "Use a valid email, display name and password of at least 10 characters." }, 400);
  }

  const existing = await env.OPREALM_DB.prepare("SELECT id FROM web_users WHERE email = ? LIMIT 1").bind(email).first();
  if (existing) return json({ ok: false, error: "An account already exists for this email." }, 409);

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.OPREALM_DB.prepare(
    `
      INSERT INTO web_users (id, email, password_hash, display_name, parent_email, age_band, tier, credits_remaining, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'explorer', 50, datetime('now'), datetime('now'))
    `,
  )
    .bind(id, email, passwordHash, displayName, parentEmail || null, ageBand || null)
    .run();

  return createSessionResponse(request, env, id, { registered: true });
}

async function login(request, env, body) {
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  const user = await env.OPREALM_DB.prepare("SELECT * FROM web_users WHERE email = ? LIMIT 1").bind(email).first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ ok: false, error: "Email or password was not recognised." }, 401);
  }

  return createSessionResponse(request, env, user.id, { loggedIn: true });
}

async function updateProfile(request, env, body) {
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please log in before updating your account." }, 401);

  const displayName = cleanText(body.displayName || body.display_name || "", 48);
  const parentEmail = cleanEmail(body.parentEmail || body.parent_email || "");
  const ageBand = cleanText(body.ageBand || body.age_band || "", 24);

  if (!displayName) {
    return json({ ok: false, error: "Please add a creator display name." }, 400);
  }

  await env.OPREALM_DB.prepare(
    `
      UPDATE web_users
      SET display_name = ?, parent_email = ?, age_band = ?, updated_at = datetime('now')
      WHERE id = ?
    `,
  )
    .bind(displayName, parentEmail || null, ageBand || null, user.id)
    .run();

  return json({ ok: true, message: "Account profile updated." });
}

async function changePassword(request, env, body) {
  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please log in before changing your password." }, 401);

  const currentPassword = String(body.currentPassword || body.current_password || "");
  const newPassword = String(body.newPassword || body.new_password || "");

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    return json({ ok: false, error: "Current password was not recognised." }, 401);
  }

  if (newPassword.length < 10) {
    return json({ ok: false, error: "Use a new password of at least 10 characters." }, 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await env.OPREALM_DB.prepare("UPDATE web_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(passwordHash, user.id)
    .run();

  return json({ ok: true, message: "Password updated." });
}

async function requestReset(request, env, body) {
  const email = cleanEmail(body.email);
  const user = email
    ? await env.OPREALM_DB.prepare("SELECT * FROM web_users WHERE email = ? LIMIT 1").bind(email).first()
    : null;

  if (user) {
    const rawToken = crypto.randomUUID() + "." + crypto.randomUUID();
    const tokenHash = await sha256(rawToken);
    const id = crypto.randomUUID();

    await env.OPREALM_DB.prepare(
      `
        INSERT INTO password_reset_tokens (id, web_user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now', '+45 minutes'), datetime('now'))
      `,
    )
      .bind(id, user.id, tokenHash)
      .run();

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await sendResetEmail(env, user.email, user.display_name, resetUrl);
  }

  return json({
    ok: true,
    message: "If that account exists, reset instructions will be sent.",
    emailConfigured: Boolean(env.RESEND_API_KEY && env.OPREALM_FROM_EMAIL),
  });
}

async function resetPassword(env, body) {
  const token = String(body.token || "").trim();
  const password = String(body.password || "");

  if (!token || password.length < 10) {
    return json({ ok: false, error: "Use a valid reset link and a password of at least 10 characters." }, 400);
  }

  const tokenHash = await sha256(token);
  const reset = await env.OPREALM_DB.prepare(
    `
      SELECT * FROM password_reset_tokens
      WHERE token_hash = ?
        AND used_at IS NULL
        AND expires_at > datetime('now')
      LIMIT 1
    `,
  )
    .bind(tokenHash)
    .first();

  if (!reset) return json({ ok: false, error: "That reset link is invalid or expired." }, 400);

  const passwordHash = await hashPassword(password);
  await env.OPREALM_DB.prepare("UPDATE web_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(passwordHash, reset.web_user_id)
    .run();
  await env.OPREALM_DB.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?")
    .bind(reset.id)
    .run();

  return json({ ok: true, message: "Password updated. You can now log in." });
}

function logout() {
  return json({ ok: true }, 200, {
    "set-cookie": cookie("oprealm_session", "", 0),
  });
}

async function createSessionResponse(request, env, userId, extra = {}) {
  const sessionId = crypto.randomUUID();
  await env.OPREALM_DB.prepare(
    "INSERT INTO web_sessions (id, web_user_id, expires_at, created_at) VALUES (?, ?, datetime('now', '+30 days'), datetime('now'))",
  )
    .bind(sessionId, userId)
    .run();

  return json({ ok: true, ...extra }, 200, {
    "set-cookie": cookie("oprealm_session", sessionId, 30 * 24 * 60 * 60),
  });
}

async function currentUser(request, env) {
  if (!env.OPREALM_DB) return null;
  await ensureAccountSchema(env);

  const sessionId = parseCookies(request.headers.get("cookie") || "").oprealm_session;
  if (!sessionId) return null;

  return env.OPREALM_DB.prepare(
    `
      SELECT web_users.*
      FROM web_sessions
      JOIN web_users ON web_users.id = web_sessions.web_user_id
      WHERE web_sessions.id = ?
        AND web_sessions.expires_at > datetime('now')
      LIMIT 1
    `,
  )
    .bind(sessionId)
    .first();
}

async function ensureAccountSchema(env) {
  if (!env.OPREALM_DB) return;

  await env.OPREALM_DB.batch([
    env.OPREALM_DB.prepare(`
      CREATE TABLE IF NOT EXISTS web_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        parent_email TEXT,
        age_band TEXT,
        tier TEXT NOT NULL DEFAULT 'explorer',
        credits_remaining INTEGER NOT NULL DEFAULT 50,
        email_verified INTEGER NOT NULL DEFAULT 0,
        safety_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_web_users_tier ON web_users(tier)"),
    env.OPREALM_DB.prepare(`
      CREATE TABLE IF NOT EXISTS web_sessions (
        id TEXT PRIMARY KEY,
        web_user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (web_user_id) REFERENCES web_users(id)
      )
    `),
    env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_web_sessions_user ON web_sessions(web_user_id)"),
    env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at)"),
    env.OPREALM_DB.prepare(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        web_user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (web_user_id) REFERENCES web_users(id)
      )
    `),
    env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)"),
    env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(web_user_id)"),
  ]);
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) {
    const host = new URL(request.url).hostname;
    if (host === "127.0.0.1" || host === "localhost") return { ok: true };
    return { ok: false, error: "Human verification is not configured yet." };
  }

  if (!token) return { ok: false, error: "Please complete the human verification check." };

  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  form.append("remoteip", request.headers.get("CF-Connecting-IP") || "");

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    return data.success ? { ok: true } : { ok: false, error: "Human verification failed. Please try again." };
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return { ok: false, error: "Human verification could not be checked. Please refresh and try again." };
  }
}

async function sendResetEmail(env, to, displayName, resetUrl) {
  if (!env.RESEND_API_KEY || !env.OPREALM_FROM_EMAIL) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.OPREALM_FROM_EMAIL,
      to,
      subject: "Reset your OPREALM password",
      html: `
        <p>Hello ${escapeHtml(displayName || "creator")},</p>
        <p>Use this secure link to reset your OPREALM password. It expires in 45 minutes.</p>
        <p><a href="${resetUrl}">Reset OPREALM password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    }),
  });

  return response.ok;
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2_sha256$${iterations}$${base64url(salt)}$${base64url(hash)}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
  const salt = fromBase64url(parts[2]);
  const expected = parts[3];
  const actual = base64url(await pbkdf2(password, salt, Number(parts[1])));
  return timingSafeEqual(actual, expected);
}

async function pbkdf2(password, salt, iterations = 100000) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

async function sha256(value) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 160) : "";
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}
