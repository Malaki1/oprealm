import { requireUser } from "../_lib/auth.js";
import { json, readJson } from "../_lib/http.js";
import { movieMusicCredits, movieNarrationCredits } from "../_lib/creator-pricing.js";

const MAX_NARRATION_CHARS = 2200;
const MAX_MUSIC_SECONDS = 60;

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireUser(request, env);
    if (!env.ELEVENLABS_API_KEY) {
      return json({ ok: false, error: "Movie audio needs ELEVENLABS_API_KEY configured before narration or music can be generated." }, 500);
    }

    const body = await readJson(request, "Invalid movie audio request.", 64 * 1024);
    const type = body.type === "music" ? "music" : "narration";
    const text = cleanText(body.text, type === "music" ? 700 : MAX_NARRATION_CHARS);
    if (text.length < 12) return json({ ok: false, error: "The movie needs stronger story text before audio can be created." }, 400);
    const safetyWarning = checkAudioSafety(text);
    if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);

    const seconds = Math.min(MAX_MUSIC_SECONDS, Math.max(10, Number(body.seconds || 30)));
    const credits = type === "music" ? movieMusicCredits(seconds) : movieNarrationCredits(text.length);
    if (Number(user.credits_remaining || 0) < credits) {
      return json({ ok: false, error: `You need ${credits} Creator credits to generate this movie ${type}.` }, 402);
    }
    const audio = type === "music"
      ? await createMusic(env, {
          prompt: buildMusicPrompt(text, body),
          seconds,
        })
      : await createNarration(env, {
          text: buildNarrationText(text),
          voice: cleanText(body.voice, 80),
        });

    const charged = await chargeCredits(env, user.id, credits);
    if (!charged) return json({ ok: false, error: `You need ${credits} Creator credits to finish this movie ${type}.` }, 402);
    return new Response(audio.bytes, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store",
        "x-oprealm-audio-type": type,
        "x-oprealm-audio-model": audio.model,
        "x-oprealm-credits-used": String(credits),
      },
    });
  } catch (error) {
    return json({ ok: false, error: error.message || "Movie audio generation failed." }, error.status || 500);
  }
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  ).bind(credits, userId, credits).run();
  return Number(result?.meta?.changes || 0) > 0;
}

async function createNarration(env, { text, voice }) {
  const voiceId = voiceIdFor(env, voice);
  const fallbackVoiceId = env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  let response = await requestNarration(env, voiceId, text);
  if (!response.ok && voiceId !== fallbackVoiceId) {
    response = await requestNarration(env, fallbackVoiceId, text);
  }
  if (!response.ok) {
    throw Object.assign(new Error(`Narration generation failed (${response.status}). ${(await response.text()).slice(0, 240)}`), { status: 502 });
  }
  return {
    bytes: await response.arrayBuffer(),
    model: env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2",
  };
}

function requestNarration(env, voiceId, text) {
  const outputFormat = "mp3_44100_128";
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.56,
        similarity_boost: 0.72,
        style: 0.18,
        use_speaker_boost: true,
      },
    }),
  });
}

async function createMusic(env, { prompt, seconds }) {
  const outputFormat = "mp3_44100_128";
  const response = await fetch(`https://api.elevenlabs.io/v1/music?output_format=${outputFormat}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: Math.round(seconds * 1000),
      model_id: env.ELEVENLABS_MUSIC_MODEL || "music_v1",
    }),
  });
  if (!response.ok) {
    throw Object.assign(new Error(`Music generation failed (${response.status}). ${(await response.text()).slice(0, 240)}`), { status: 502 });
  }
  return {
    bytes: await response.arrayBuffer(),
    model: env.ELEVENLABS_MUSIC_MODEL || "music_v1",
  };
}

function buildNarrationText(text) {
  return cleanTrailerVoiceover(text).slice(0, MAX_NARRATION_CHARS);
}

function cleanTrailerVoiceover(text) {
  return String(text || "")
    .replace(/\b(make|create|generate|write|perform|read)\s+(this\s+)?(as\s+)?(a\s+)?child[- ]friendly[^.!?]*[.!?]/gi, "")
    .replace(/\bdo not read[^.!?]*[.!?]/gi, "")
    .replace(/\buse short dramatic pauses[^.!?]*[.!?]/gi, "")
    .replace(/\bmake it sound[^.!?]*[.!?]/gi, "")
    .replace(/\b(scene|chapter|prompt)\s+\d*[:.]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMusicPrompt(text, body) {
  const mood = cleanText(body.mood, 80) || "adventure";
  return [
    `Create a child-friendly instrumental ${mood} movie soundtrack bed for OPRealm.`,
    "No vocals, no lyrics, no scary realism, no copyrighted melodies.",
    "It should sit under narration, with gentle drums, magical texture, and a clear adventure pulse.",
    `Story reference: ${text}`,
  ].join(" ").slice(0, 900);
}

function voiceIdFor(env, voice) {
  const key = cleanText(voice, 80).toLowerCase();
  const map = {
    "young-adventurer": env.ELEVENLABS_VOICE_ID_YOUNG_ADVENTURER || "21m00Tcm4TlvDq8ikWAM",
    "warm-storyteller": env.ELEVENLABS_VOICE_ID_WARM_STORYTELLER || "JBFqnCBsd6RMkjVDRZzb",
    "epic-guide": env.ELEVENLABS_VOICE_ID_EPIC_GUIDE || "ErXwobaYiN019PkySvjV",
  };
  return map[key] || env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
}

function checkAudioSafety(value) {
  const text = String(value || "").toLowerCase();
  const blocked = ["phone number", "address", "school name", "password", "private chat", "meet me", "snapchat", "instagram", "tiktok", "whatsapp"];
  const phrase = blocked.find((item) => text.includes(item));
  return phrase ? "Remove personal or private contact details before creating movie audio." : "";
}

function cleanText(value, max = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
