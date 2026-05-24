export async function sha256Text(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function findCachedJob(env, userId, tool, promptHash) {
  return env.OPREALM_DB.prepare(
    `
      SELECT *
      FROM generation_jobs
      WHERE web_user_id = ?
        AND tool = ?
        AND prompt_hash = ?
        AND status = 'completed'
        AND result_json IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 1
    `,
  )
    .bind(userId, tool, promptHash)
    .first();
}

export async function findIdempotentJob(env, userId, tool, idempotencyKey) {
  if (!idempotencyKey) return null;
  return env.OPREALM_DB.prepare(
    `
      SELECT *
      FROM generation_jobs
      WHERE web_user_id = ?
        AND tool = ?
        AND idempotency_key = ?
      LIMIT 1
    `,
  )
    .bind(userId, tool, idempotencyKey)
    .first();
}

export async function assertRateLimit(env, userId, tool, { limit = 6, windowSeconds = 60 } = {}) {
  const row = await env.OPREALM_DB.prepare(
    `
      SELECT COUNT(*) AS count
      FROM generation_jobs
      WHERE web_user_id = ?
        AND tool = ?
        AND created_at >= datetime('now', ?)
        AND status IN ('queued', 'processing', 'completed')
    `,
  )
    .bind(userId, tool, `-${windowSeconds} seconds`)
    .first();

  if (Number(row?.count || 0) >= limit) {
    const error = new Error("You are generating quickly. Please wait a moment before trying again.");
    error.status = 429;
    throw error;
  }
}

export async function createGenerationJob(env, { id, userId, tool, promptHash, idempotencyKey, creditsReserved, metadata }) {
  await env.OPREALM_DB.prepare(
    `
      INSERT INTO generation_jobs (
        id,
        web_user_id,
        tool,
        status,
        prompt_hash,
        idempotency_key,
        credits_reserved,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      id,
      userId,
      tool,
      promptHash,
      idempotencyKey || null,
      Number(creditsReserved || 0),
      JSON.stringify(metadata || {}).slice(0, 3000),
    )
    .run();
}

export async function markJobProcessing(env, jobId) {
  await env.OPREALM_DB.prepare(
    "UPDATE generation_jobs SET status = 'processing', updated_at = datetime('now') WHERE id = ?",
  )
    .bind(jobId)
    .run();
}

export async function markJobCompleted(env, jobId, { result, creditsCharged, model, quality }) {
  await env.OPREALM_DB.prepare(
    `
      UPDATE generation_jobs
      SET status = 'completed',
          result_json = ?,
          credits_charged = ?,
          model = ?,
          quality = ?,
          updated_at = datetime('now'),
          completed_at = datetime('now')
      WHERE id = ?
    `,
  )
    .bind(JSON.stringify(result || {}), Number(creditsCharged || 0), model || null, quality || null, jobId)
    .run();
}

export async function markJobFailed(env, jobId, error) {
  await env.OPREALM_DB.prepare(
    `
      UPDATE generation_jobs
      SET status = 'failed',
          error = ?,
          updated_at = datetime('now'),
          completed_at = datetime('now')
      WHERE id = ?
    `,
  )
    .bind(String(error?.message || error || "Generation failed.").slice(0, 1000), jobId)
    .run();
}

export function jobResponse(job, extra = {}) {
  const result = safeJson(job?.result_json) || {};
  const chargedCredits = Number(job.credits_charged || 0);
  const cached = Boolean(extra.cached);
  return {
    ok: true,
    jobId: job.id,
    status: job.status,
    tool: job.tool,
    cached,
    creditsUsed: cached ? 0 : chargedCredits,
    creditsSaved: cached ? chargedCredits : 0,
    error: job.error || "",
    ...result,
  };
}

function safeJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
