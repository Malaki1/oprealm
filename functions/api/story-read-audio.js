import { requireUser } from "../_lib/auth.js";
import { json, readJson } from "../_lib/http.js";
import { storyReaderCredits } from "../_lib/creator-pricing.js";
import { checkPromptSafety } from "../_lib/validate.js";

const MAX_STORY_CHARS = 30000;

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireUser(request, env);
    if (!env.ELEVENLABS_API_KEY) {
      return json({ ok: false, error: "The OPRealm story reader is not connected yet." }, 500);
    }

    const body = await readJson(request, "Invalid story reader request.", 64 * 1024);
    const text = cleanStory(body.text);
    if (text.length < 200) {
      return json({ ok: false, error: "Write a complete story before asking OPRealm to read it." }, 400);
    }
    const safetyWarning = checkAudioSafety(text);
    if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);
    const credits = storyReaderCredits(text.length);
    if (Number(user.credits_remaining || 0) < credits) {
      return json({ ok: false, error: `You need ${credits} Creator credits to generate this story narration.` }, 402);
    }

    const voiceId = voiceIdFor(env, body.voice);
    const fallbackVoiceId = env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
    let response = await requestStoryAudio(env, voiceId, text);
    if (!response.ok && voiceId !== fallbackVoiceId) {
      response = await requestStoryAudio(env, fallbackVoiceId, text);
    }
    if (!response.ok) {
      throw Object.assign(
        new Error(`Story voice generation failed (${response.status}). ${(await response.text()).slice(0, 240)}`),
        { status: 502 },
      );
    }

    const bytes = await response.arrayBuffer();
    const charged = await chargeCredits(env, user.id, credits);
    if (!charged) return json({ ok: false, error: `You need ${credits} Creator credits to finish this story narration.` }, 402);
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "private, no-store",
        "x-oprealm-audio-type": "full-story",
        "x-oprealm-audio-model": env.ELEVENLABS_STORY_TTS_MODEL || "eleven_flash_v2_5",
        "x-oprealm-credits-used": String(credits),
      },
    });
  } catch (error) {
    return json({ ok: false, error: error.message || "Story voice generation failed." }, error.status || 500);
  }
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  ).bind(credits, userId, credits).run();
  return Number(result?.meta?.changes || 0) > 0;
}

function requestStoryAudio(env, voiceId, text) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: env.ELEVENLABS_STORY_TTS_MODEL || "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.74,
        style: 0.22,
        use_speaker_boost: true,
      },
    }),
  });
}

function cleanStory(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_STORY_CHARS);
}

function voiceIdFor(env, voice) {
  const key = String(voice || "").trim().toLowerCase();
  const voices = {
    "young-adventurer": env.ELEVENLABS_VOICE_ID_YOUNG_ADVENTURER || "21m00Tcm4TlvDq8ikWAM",
    "warm-storyteller": env.ELEVENLABS_VOICE_ID_WARM_STORYTELLER || "JBFqnCBsd6RMkjVDRZzb",
    "epic-guide": env.ELEVENLABS_VOICE_ID_EPIC_GUIDE || "ErXwobaYiN019PkySvjV",
  };
  return voices[key] || voices["warm-storyteller"];
}

function checkAudioSafety(value) {
  return checkPromptSafety(value) ? "Remove personal or private contact details before creating story audio." : "";
}
