import { requireUser } from "../_lib/auth.js";
import { json, readJson } from "../_lib/http.js";
import { generateSpeech, estimateNarrationCost } from "../_lib/elevenlabs.js";
import {
  assertRateLimit,
  createGenerationJob,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
  sha256Text,
} from "../_lib/generation-jobs.js";
import { checkPromptSafety } from "../_lib/validate.js";

const TOOL = "storybook_narration";

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(request, env);
    const storybookId = cleanId(new URL(request.url).searchParams.get("storybookId"), 120);
    if (!storybookId) return json({ ok: false, error: "A storybook is required." }, 400);
    const result = await env.OPREALM_DB.prepare(`
      SELECT id, storybook_id, scene_id, beat_id, scene_number, beat_number, speaker,
             voice_id, delivery_direction, audio_hash, duration_ms, status, generated_at
      FROM storybook_audio_beats
      WHERE web_user_id = ? AND storybook_id = ?
      ORDER BY scene_number, beat_number
    `).bind(user.id, storybookId).all();
    return json({
      ok: true,
      storybookId,
      beats: (result.results || []).map(publicBeat),
    });
  } catch (error) {
    return json({ ok: false, error: error.message || "Narration manifest could not be loaded." }, error.status || 500);
  }
}

export async function onRequestPost({ request, env }) {
  let jobId = "";
  let input = null;
  let userId = "";
  try {
    const user = await requireUser(request, env);
    userId = user.id;
    if (!env.OPREALM_ASSETS) return json({ ok: false, error: "Storybook audio storage is not connected." }, 500);
    const body = await readJson(request, "Invalid storybook narration request.", 48 * 1024);
    input = cleanInput(body);
    if (!input.storybookId || !input.sceneId || !input.beatId || !input.text || !input.voiceId) {
      return json({ ok: false, error: "This narration beat is missing required story details." }, 400);
    }
    const safetyWarning = checkPromptSafety(input.text);
    if (safetyWarning) {
      return json({ ok: false, error: "Narration unavailable until this story text passes the child-safety check." }, 400);
    }

    const audioHash = await sha256Text(`${input.text}\n${input.voiceId}\n${input.deliveryDirection}`);
    const cached = await findCachedAudio(env, user.id, input.storybookId, audioHash);
    if (cached && await env.OPREALM_ASSETS.head(cached.r2_key)) {
      await attachCachedBeat(env, cached, user.id, input);
      const attached = await findBeat(env, user.id, input.storybookId, input.beatId);
      return json({ ok: true, cached: true, creditsUsed: 0, beat: publicBeat(attached) });
    }

    const credits = estimateNarrationCost(input.text.length).creatorCredits;
    if (Number(user.credits_remaining || 0) < credits) {
      return json({ ok: false, error: `You need ${credits} Creator credits to narrate this story beat.` }, 402);
    }
    await assertRateLimit(env, user.id, TOOL, { limit: 120, windowSeconds: 60 });

    jobId = crypto.randomUUID();
    await createGenerationJob(env, {
      id: jobId,
      userId: user.id,
      tool: TOOL,
      promptHash: audioHash,
      idempotencyKey: `${input.storybookId}:${input.beatId}:${audioHash}`,
      creditsReserved: credits,
      metadata: {
        storybookId: input.storybookId,
        sceneId: input.sceneId,
        beatId: input.beatId,
        speaker: input.speaker,
      },
    });
    await saveBeatStatus(env, user.id, input, audioHash, "pending");
    await markJobProcessing(env, jobId);
    await saveBeatStatus(env, user.id, input, audioHash, "generating");

    const speech = await generateSpeech(env, input.text, input.voiceId, {
      deliveryDirection: input.deliveryDirection,
    });
    const charged = await chargeCredits(env, user.id, credits);
    if (!charged) {
      const error = new Error(`You need ${credits} Creator credits to finish this narration beat.`);
      error.status = 402;
      throw error;
    }

    const r2Key = audioKey(input);
    const durationMs = estimateDuration(input.text);
    await env.OPREALM_ASSETS.put(r2Key, speech.bytes, {
      httpMetadata: { contentType: "audio/mpeg" },
      customMetadata: {
        storybookId: input.storybookId,
        sceneId: input.sceneId,
        beatId: input.beatId,
        audioHash,
        voiceId: input.voiceId,
      },
    });
    const recordId = crypto.randomUUID();
    await env.OPREALM_DB.prepare(`
      INSERT INTO storybook_audio_beats (
        id, web_user_id, storybook_id, scene_id, beat_id, scene_number, beat_number,
        speaker, voice_id, delivery_direction, audio_hash, r2_key, duration_ms,
        status, generated_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', datetime('now'), datetime('now'), datetime('now'))
      ON CONFLICT(web_user_id, storybook_id, beat_id) DO UPDATE SET
        scene_id = excluded.scene_id,
        scene_number = excluded.scene_number,
        beat_number = excluded.beat_number,
        speaker = excluded.speaker,
        voice_id = excluded.voice_id,
        delivery_direction = excluded.delivery_direction,
        audio_hash = excluded.audio_hash,
        r2_key = excluded.r2_key,
        duration_ms = excluded.duration_ms,
        status = 'ready',
        generated_at = datetime('now'),
        updated_at = datetime('now')
    `).bind(
      recordId,
      user.id,
      input.storybookId,
      input.sceneId,
      input.beatId,
      input.sceneNumber,
      input.beatNumber,
      input.speaker,
      input.voiceId,
      input.deliveryDirection,
      audioHash,
      r2Key,
      durationMs,
    ).run();
    const saved = await findBeat(env, user.id, input.storybookId, input.beatId);
    await markJobCompleted(env, jobId, {
      result: { recordId: saved.id, storybookId: input.storybookId, beatId: input.beatId },
      creditsCharged: credits,
      model: speech.model,
      quality: "storybook-beat",
    });
    return json({ ok: true, cached: false, creditsUsed: credits, beat: publicBeat(saved) });
  } catch (error) {
    if (jobId) await markJobFailed(env, jobId, error).catch(() => {});
    if (input && userId) {
      const audioHash = await sha256Text(`${input.text}\n${input.voiceId}\n${input.deliveryDirection}`).catch(() => "");
      await saveBeatStatus(env, userId, input, audioHash, "failed").catch(() => {});
    }
    return json({ ok: false, error: error.message || "Narration unavailable." }, error.status || 500);
  }
}

async function saveBeatStatus(env, userId, input, audioHash, status) {
  await env.OPREALM_DB.prepare(`
    INSERT INTO storybook_audio_beats (
      id, web_user_id, storybook_id, scene_id, beat_id, scene_number, beat_number,
      speaker, voice_id, delivery_direction, audio_hash, r2_key, duration_ms,
      status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, ?, datetime('now'), datetime('now'))
    ON CONFLICT(web_user_id, storybook_id, beat_id) DO UPDATE SET
      speaker = excluded.speaker,
      voice_id = excluded.voice_id,
      delivery_direction = excluded.delivery_direction,
      audio_hash = excluded.audio_hash,
      status = excluded.status,
      updated_at = datetime('now')
  `).bind(
    crypto.randomUUID(),
    userId,
    input.storybookId,
    input.sceneId,
    input.beatId,
    input.sceneNumber,
    input.beatNumber,
    input.speaker,
    input.voiceId,
    input.deliveryDirection,
    audioHash,
    status,
  ).run();
}

async function findCachedAudio(env, userId, storybookId, audioHash) {
  return env.OPREALM_DB.prepare(`
    SELECT * FROM storybook_audio_beats
    WHERE web_user_id = ? AND storybook_id = ? AND audio_hash = ? AND status = 'ready'
    ORDER BY generated_at DESC LIMIT 1
  `).bind(userId, storybookId, audioHash).first();
}

async function findBeat(env, userId, storybookId, beatId) {
  return env.OPREALM_DB.prepare(`
    SELECT * FROM storybook_audio_beats
    WHERE web_user_id = ? AND storybook_id = ? AND beat_id = ?
    LIMIT 1
  `).bind(userId, storybookId, beatId).first();
}

async function attachCachedBeat(env, cached, userId, input) {
  await env.OPREALM_DB.prepare(`
    INSERT INTO storybook_audio_beats (
      id, web_user_id, storybook_id, scene_id, beat_id, scene_number, beat_number,
      speaker, voice_id, delivery_direction, audio_hash, r2_key, duration_ms,
      status, generated_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, datetime('now'), datetime('now'))
    ON CONFLICT(web_user_id, storybook_id, beat_id) DO UPDATE SET
      voice_id = excluded.voice_id,
      delivery_direction = excluded.delivery_direction,
      audio_hash = excluded.audio_hash,
      r2_key = excluded.r2_key,
      duration_ms = excluded.duration_ms,
      status = 'ready',
      generated_at = excluded.generated_at,
      updated_at = datetime('now')
  `).bind(
    crypto.randomUUID(),
    userId,
    input.storybookId,
    input.sceneId,
    input.beatId,
    input.sceneNumber,
    input.beatNumber,
    input.speaker,
    input.voiceId,
    input.deliveryDirection,
    cached.audio_hash,
    cached.r2_key,
    cached.duration_ms,
    cached.generated_at,
  ).run();
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  ).bind(credits, userId, credits).run();
  return Number(result?.meta?.changes || 0) > 0;
}

function publicBeat(row) {
  return {
    id: row.id,
    storybookId: row.storybook_id,
    sceneId: row.scene_id,
    beatId: row.beat_id,
    sceneNumber: Number(row.scene_number),
    beatNumber: Number(row.beat_number),
    speaker: row.speaker,
    voiceId: row.voice_id,
    deliveryDirection: row.delivery_direction,
    audioHash: row.audio_hash,
    audioUrl: row.status === "ready" ? `/api/storybook-audio?id=${encodeURIComponent(row.id)}` : "",
    durationMs: Number(row.duration_ms || 0),
    status: row.status,
    generatedAt: row.generated_at,
  };
}

function cleanInput(body) {
  return {
    storybookId: cleanId(body.storybookId, 120),
    sceneId: cleanId(body.sceneId, 120),
    beatId: cleanId(body.beatId, 160),
    sceneNumber: Math.max(1, Math.min(200, Number(body.sceneNumber) || 1)),
    beatNumber: Math.max(1, Math.min(100, Number(body.beatNumber) || 1)),
    speaker: cleanText(body.speaker || "Narrator", 80),
    text: cleanText(body.text, 1200),
    voiceId: cleanId(body.voiceId, 120),
    deliveryDirection: cleanText(body.deliveryDirection, 360),
  };
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanId(value, maxLength) {
  return String(value || "").trim().replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, maxLength);
}

function audioKey(input) {
  return `storybooks/${input.storybookId}/audio/scene-${input.sceneNumber}/beat-${input.beatNumber}.mp3`;
}

function estimateDuration(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1200, Math.round((words / 2.45) * 1000));
}
