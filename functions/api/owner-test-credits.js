import { verifyStatelessSession } from "../_lib/auth.js";

const OWNER_DISPLAY_NAME = "Maloceraptor";
const OWNER_EMAIL = "malakiaiono@gmail.com";
const TEST_CREDIT_BALANCE = 10000;

export async function onRequestGet({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "Database unavailable." }, 500);

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const userId = await verifyStatelessSession(env, cookies.oprealm_auth);
  const user = userId
    ? await env.OPREALM_DB.prepare("SELECT id, email, display_name FROM web_users WHERE id = ? LIMIT 1").bind(userId).first()
    : await userFromDatabaseSession(env, cookies.oprealm_session);

  if (
    !user
    || String(user.display_name || "").trim() !== OWNER_DISPLAY_NAME
    || String(user.email || "").trim().toLowerCase() !== OWNER_EMAIL
  ) {
    return json({ ok: false, error: "Owner account required." }, 403);
  }

  await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(TEST_CREDIT_BALANCE, user.id)
    .run();

  return json({ ok: true, creditsRemaining: TEST_CREDIT_BALANCE });
}

async function userFromDatabaseSession(env, sessionId) {
  if (!sessionId) return null;
  return env.OPREALM_DB.prepare(
    `
      SELECT web_users.id, web_users.email, web_users.display_name
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

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1
          ? [part, ""]
          : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
