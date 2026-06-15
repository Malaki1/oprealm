import { requireUser } from "../_lib/auth.js";
import { json, readJson } from "../_lib/http.js";

const PROJECT_ID = "story-builder-primary";

export async function onRequestGet({ request, env }) {
  if (!env.OPREALM_DB || !env.OPREALM_ASSETS) {
    return json({ ok: false, error: "Story project storage is unavailable." }, 500);
  }

  let user;
  try {
    user = await requireUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error.message }, error.status || 401);
  }

  const row = await env.OPREALM_DB.prepare(
    "SELECT title, updated_at FROM creator_projects WHERE id = ? AND web_user_id = ? LIMIT 1",
  )
    .bind(projectId(user.id), user.id)
    .first();
  if (!row) return json({ ok: true, project: null });

  const object = await env.OPREALM_ASSETS.get(projectKey(user.id));
  if (!object) return json({ ok: true, project: null });
  const project = await object.json().catch(() => null);
  return json({ ok: true, project, updatedAt: row.updated_at });
}

export async function onRequestPut({ request, env }) {
  if (!env.OPREALM_DB || !env.OPREALM_ASSETS) {
    return json({ ok: false, error: "Story project storage is unavailable." }, 500);
  }

  let user;
  try {
    user = await requireUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error.message }, error.status || 401);
  }

  let body;
  try {
    body = await readJson(request, "Invalid story project.", 20 * 1024 * 1024);
  } catch (error) {
    return json({ ok: false, error: error.message }, error.status || 400);
  }
  const project = body.project;
  if (!project || typeof project !== "object" || Array.isArray(project)) {
    return json({ ok: false, error: "A story project is required." }, 400);
  }

  const title = cleanText(project.title || project.storyDraft?.title || "My OPRealm Story", 120);
  const serialized = JSON.stringify(project);
  await env.OPREALM_ASSETS.put(projectKey(user.id), serialized, {
    httpMetadata: { contentType: "application/json", cacheControl: "no-store" },
    customMetadata: { userId: user.id, projectType: "story_builder" },
  });
  await env.OPREALM_DB.prepare(
    `
      INSERT INTO creator_projects (id, web_user_id, title, status, created_at, updated_at)
      VALUES (?, ?, ?, 'story_builder', datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = 'story_builder',
        updated_at = datetime('now')
      WHERE creator_projects.web_user_id = excluded.web_user_id
    `,
  )
    .bind(projectId(user.id), user.id, title)
    .run();

  return json({ ok: true, savedAt: new Date().toISOString() });
}

function projectId(userId) {
  return `${PROJECT_ID}:${userId}`;
}

function projectKey(userId) {
  return `story-projects/${userId}/${PROJECT_ID}.json`;
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
