export type SpeechGenerationOptions = {
  deliveryDirection?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
};

export type DialogueBeat = {
  id: string;
  text: string;
  speaker: string;
  voiceId?: string;
  deliveryDirection?: string;
};

export type SpeakerVoiceProfile = {
  speaker: string;
  voiceId: string;
  deliveryDirection: string;
};

type ElevenLabsEnvironment = {
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_STORYBOOK_TTS_MODEL?: string;
};

export async function generateSpeech(
  env: ElevenLabsEnvironment,
  text: string,
  voiceId: string,
  options: SpeechGenerationOptions = {},
): Promise<ArrayBuffer> {
  if (!env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured.");
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        // Keep delivery direction out of the spoken text. Some models interpret
        // bracketed directions literally and read them to the listener.
        text,
        model_id: options.modelId || env.ELEVENLABS_STORYBOOK_TTS_MODEL || "eleven_v3",
        voice_settings: {
          stability: options.stability ?? 0.56,
          similarity_boost: options.similarityBoost ?? 0.76,
          style: options.style ?? 0.28,
          use_speaker_boost: true,
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`ElevenLabs speech generation failed (${response.status}).`);
  return response.arrayBuffer();
}

export async function generateDialogue(
  env: ElevenLabsEnvironment,
  beats: DialogueBeat[],
  voiceProfiles: SpeakerVoiceProfile[],
): Promise<Array<{ beatId: string; audio: ArrayBuffer }>> {
  const narrator = voiceProfiles.find((profile) => /^narrator$/i.test(profile.speaker)) || voiceProfiles[0];
  const results = [];
  for (const beat of beats) {
    const profile = voiceProfiles.find((item) => item.speaker.toLowerCase() === beat.speaker.toLowerCase()) || narrator;
    results.push({
      beatId: beat.id,
      audio: await generateSpeech(env, beat.text, beat.voiceId || profile.voiceId, {
        deliveryDirection: beat.deliveryDirection || profile.deliveryDirection,
      }),
    });
  }
  return results;
}

export async function getAvailableVoices(env: ElevenLabsEnvironment) {
  if (!env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured.");
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
  });
  if (!response.ok) throw new Error(`ElevenLabs voice lookup failed (${response.status}).`);
  const data = await response.json() as { voices?: unknown[] };
  return data.voices || [];
}

export function estimateNarrationCost(characterCount: number) {
  const characters = Math.max(0, Number(characterCount) || 0);
  return {
    characters,
    creatorCredits: Math.max(1, Math.ceil(characters / 1000) * 5),
  };
}
