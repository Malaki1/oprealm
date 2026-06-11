const DEFAULT_NARRATOR_VOICE = "JBFqnCBsd6RMkjVDRZzb";

export async function generateSpeech(env, text, voiceId, options = {}) {
  if (!env.ELEVENLABS_API_KEY) {
    const error = new Error("The OPRealm storybook narrator is not connected yet.");
    error.status = 500;
    throw error;
  }
  const selectedVoice = voiceId || env.ELEVENLABS_VOICE_ID_WARM_STORYTELLER || DEFAULT_NARRATOR_VOICE;
  const primaryModel = options.modelId || env.ELEVENLABS_STORYBOOK_TTS_MODEL || "eleven_v3";
  let response = await requestSpeech(env, selectedVoice, text, options.deliveryDirection, primaryModel);
  if (!response.ok && primaryModel === "eleven_v3") {
    response = await requestSpeech(env, selectedVoice, text, "", "eleven_flash_v2_5");
  }
  if (!response.ok) {
    const details = (await response.text()).slice(0, 320);
    const error = new Error(`Storybook narration failed (${response.status}). ${details}`);
    error.status = 502;
    throw error;
  }
  return {
    bytes: await response.arrayBuffer(),
    model: response.headers.get("x-elevenlabs-model-id") || primaryModel,
  };
}

export async function generateDialogue(env, beats, voiceProfiles) {
  const narrator = voiceProfiles.find((profile) => /^narrator$/i.test(profile.speaker)) || voiceProfiles[0];
  const results = [];
  for (const beat of beats) {
    const profile = voiceProfiles.find((item) => item.speaker.toLowerCase() === beat.speaker.toLowerCase()) || narrator;
    results.push({
      beatId: beat.id,
      ...(await generateSpeech(env, beat.text, beat.voiceId || profile.voiceId, {
        deliveryDirection: beat.deliveryDirection || profile.deliveryDirection,
      })),
    });
  }
  return results;
}

export async function getAvailableVoices(env) {
  if (!env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured.");
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
  });
  if (!response.ok) throw new Error(`ElevenLabs voice lookup failed (${response.status}).`);
  const data = await response.json();
  return data.voices || [];
}

export function estimateNarrationCost(characterCount) {
  const characters = Math.max(0, Number(characterCount) || 0);
  return {
    characters,
    creatorCredits: Math.max(1, Math.ceil(characters / 1000) * 5),
  };
}

function requestSpeech(env, voiceId, text, deliveryDirection, modelId) {
  const directedText = deliveryDirection && modelId === "eleven_v3"
    ? `[${String(deliveryDirection).replace(/[\[\]]/g, "").slice(0, 260)}] ${text}`
    : text;
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: directedText,
      model_id: modelId,
      voice_settings: {
        stability: 0.56,
        similarity_boost: 0.76,
        style: 0.28,
        use_speaker_boost: true,
      },
    }),
  });
}
