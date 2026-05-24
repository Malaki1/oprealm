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
  const sessionId = parseCookies(request.headers.get("cookie") || "").oprealm_session;
  if (!sessionId || !env.OPREALM_DB) return null;
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
