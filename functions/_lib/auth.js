export async function requireUser(request, env) {
  if (!env.OPREALM_DB) {
    const error = new Error("OPRealm database is not connected.");
    error.status = 500;
    throw error;
  }

  const user = await currentUser(request, env);
  if (!user) {
    const error = new Error("Please log in before using this tool.");
    error.status = 401;
    throw error;
  }
  return user;
}

export async function currentUser(request, env) {
  if (!env.OPREALM_DB) return null;
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const signedUserId = await verifyStatelessSession(env, cookies.oprealm_auth);
  if (signedUserId) {
    return env.OPREALM_DB.prepare("SELECT * FROM web_users WHERE id = ? LIMIT 1")
      .bind(signedUserId)
      .first();
  }

  const sessionId = cookies.oprealm_session;
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

export async function createStatelessSessionToken(env, userId, maxAgeSeconds = 30 * 24 * 60 * 60) {
  const secret = sessionSecret(env);
  if (!secret || !userId) return "";
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlJson({
    sub: String(userId),
    iat: now,
    exp: now + maxAgeSeconds,
    v: 1,
  });
  const signature = await sign(`${payload}`, secret);
  return `${payload}.${signature}`;
}

export async function verifyStatelessSession(env, token) {
  const secret = sessionSecret(env);
  if (!secret || !token) return "";
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature) return "";
  const expected = await sign(payload, secret);
  if (!timingSafeEqual(signature, expected)) return "";
  const data = parseBase64urlJson(payload);
  if (!data?.sub || Number(data.exp || 0) <= Math.floor(Date.now() / 1000)) return "";
  return String(data.sub);
}

export function sessionSecret(env) {
  return env.OPREALM_SESSION_SECRET || env.OPREALM_AUTH_SECRET || env.OPREALM_WEBHOOK_SECRET || "";
}

export function parseCookies(header) {
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

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64url(new Uint8Array(signature));
}

function base64urlJson(value) {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

function parseBase64urlJson(value) {
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64url(value)));
  } catch {
    return null;
  }
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
