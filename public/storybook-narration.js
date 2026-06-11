(function initStorybookNarration(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OPREALMStorybookNarration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createStorybookNarration() {
  const NARRATOR = "Narrator";
  const MAX_BEAT_CHARS = 260;
  const SPEECH_VERBS = "said|asked|replied|answered|whispered|shouted|called|cried|murmured|warned|added|told|promised";

  /**
   * @typedef {Object} NarrationBeat
   * @property {string} id
   * @property {string} sceneId
   * @property {number} order
   * @property {"narration"|"dialogue"} type
   * @property {string} speaker
   * @property {string} text
   * @property {string} emotion
   * @property {string} deliveryDirection
   * @property {string} voiceId
   * @property {string} audioUrl
   * @property {number} durationMs
   */

  /**
   * @typedef {Object} NarrationScript
   * @property {string} sceneId
   * @property {NarrationBeat[]} beats
   */

  /**
   * @typedef {Object} SpeakerVoiceProfile
   * @property {string} speaker
   * @property {string} voiceId
   * @property {string} deliveryDirection
   * @property {string} role
   */

  /**
   * @typedef {Object} SceneAudioManifest
   * @property {string} storybookId
   * @property {string} sceneId
   * @property {"pending"|"generating"|"ready"|"failed"} status
   * @property {NarrationBeat[]} beats
   */

  function parseStorySceneIntoNarrationBeats(sceneText, characters, sceneId = "scene") {
    const text = cleanText(sceneText);
    if (!text) return [];
    const cast = normalizeCharacters(characters);
    const hero = cast[0]?.name || "";
    const quotePattern = /["\u201c]([^"\u201d]+)["\u201d]/g;
    const segments = [];
    let cursor = 0;
    let quoteMatch;
    let activeSpeaker = hero;

    while ((quoteMatch = quotePattern.exec(text))) {
      const narration = cleanNarrationSegment(text.slice(cursor, quoteMatch.index), cast);
      if (narration) segments.push({ type: "narration", speaker: NARRATOR, text: narration });
      const contextBefore = text.slice(Math.max(0, quoteMatch.index - 100), quoteMatch.index);
      const contextAfter = text.slice(quotePattern.lastIndex, quotePattern.lastIndex + 100);
      const speaker = detectSpeaker(contextBefore, contextAfter, cast, activeSpeaker || hero);
      if (speaker) activeSpeaker = speaker;
      segments.push({
        type: "dialogue",
        speaker: speaker || hero || NARRATOR,
        text: quoteMatch[1].trim(),
      });
      cursor = quotePattern.lastIndex;
    }

    const tail = cleanNarrationSegment(text.slice(cursor), cast);
    if (tail) segments.push({ type: "narration", speaker: NARRATOR, text: tail });
    if (!segments.length) segments.push({ type: "narration", speaker: NARRATOR, text });

    const beats = [];
    segments.forEach((segment) => {
      chunkForAudio(segment.text, segment.type === "dialogue" ? 190 : MAX_BEAT_CHARS).forEach((chunk) => {
        const order = beats.length + 1;
        beats.push({
          id: `${safeId(sceneId)}-beat-${order}`,
          sceneId: String(sceneId),
          order,
          type: segment.type,
          speaker: segment.speaker,
          text: chunk,
          emotion: inferEmotion(chunk),
          deliveryDirection: "",
          voiceId: "",
          audioUrl: "",
          durationMs: 0,
        });
      });
    });
    return beats;
  }

  function assignVoiceProfiles(characters, ageBand = "7-10", storyTone = "magical") {
    const cast = normalizeCharacters(characters);
    const profiles = [{
      speaker: NARRATOR,
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
      deliveryDirection: narratorDirection(ageBand, storyTone),
      role: "narrator",
    }];
    const fallbackVoices = ["21m00Tcm4TlvDq8ikWAM", "ErXwobaYiN019PkySvjV"];
    cast.forEach((character, index) => {
      const description = [
        character.characterType,
        character.type,
        character.personality,
        ...(Array.isArray(character.traits) ? character.traits : []),
      ].filter(Boolean).join(" ").toLowerCase();
      const direction = character.voiceDirection
        || `Read this line as ${character.name}, ${characterDelivery(description, index)}.`;
      profiles.push({
        speaker: character.name,
        voiceId: character.voiceId || fallbackVoices[Math.min(index, fallbackVoices.length - 1)] || profiles[0].voiceId,
        deliveryDirection: direction,
        role: index === 0 ? "hero" : "supporting",
      });
    });
    return profiles;
  }

  function applyVoiceProfiles(beats, profiles) {
    const narrator = profiles.find((profile) => profile.role === "narrator") || profiles[0];
    return beats.map((beat) => {
      const profile = profiles.find((item) => item.speaker.toLowerCase() === beat.speaker.toLowerCase()) || narrator;
      const direction = beat.type === "dialogue" && profile === narrator
        ? `Read this quoted line as ${beat.speaker}, ${deliveryForEmotion(beat.emotion)}.`
        : profile.deliveryDirection;
      return { ...beat, voiceId: profile.voiceId, deliveryDirection: direction };
    });
  }

  function detectSpeaker(before, after, cast, fallback) {
    const names = cast.map((item) => item.name).filter(Boolean);
    for (const name of names) {
      const escaped = escapeRegExp(name);
      const beforePattern = new RegExp(`(?:${escaped})\\s+(?:${SPEECH_VERBS})[^.!?]{0,45}$`, "i");
      const afterPattern = new RegExp(`^\\s*[,;:-]?\\s*(?:${SPEECH_VERBS})\\s+(?:${escaped})\\b`, "i");
      const afterNameFirst = new RegExp(`^\\s*[,;:-]?\\s*(?:${escaped})\\s+(?:${SPEECH_VERBS})\\b`, "i");
      if (beforePattern.test(before) || afterPattern.test(after) || afterNameFirst.test(after)) return name;
    }
    return fallback || names[0] || NARRATOR;
  }

  function chunkForAudio(text, maxChars) {
    const sentences = cleanText(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) || [];
    const chunks = [];
    sentences.forEach((sentence) => {
      if (sentence.length > maxChars) {
        splitLongSentence(sentence, maxChars).forEach((part) => chunks.push(part));
        return;
      }
      const previous = chunks[chunks.length - 1];
      if (previous && `${previous} ${sentence}`.length <= maxChars) chunks[chunks.length - 1] = `${previous} ${sentence}`;
      else chunks.push(sentence);
    });
    return chunks.filter(Boolean);
  }

  function splitLongSentence(sentence, maxChars) {
    const words = sentence.split(/\s+/);
    const parts = [];
    let current = "";
    words.forEach((word) => {
      if (current && `${current} ${word}`.length > maxChars) {
        parts.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    });
    if (current) parts.push(current);
    return parts;
  }

  function inferEmotion(text) {
    const value = String(text).toLowerCase();
    if (/!|cheer|laugh|delight|amazing|wonderful/.test(value)) return "excited";
    if (/whisper|quiet|careful|secret|hidden/.test(value)) return "hushed";
    if (/danger|run|hurry|attack|storm/.test(value)) return "urgent";
    if (/sad|sorry|lost|alone|tear/.test(value)) return "tender";
    if (/\?/.test(value)) return "curious";
    return "warm";
  }

  function narratorDirection(ageBand, tone) {
    const younger = /under|4|5|6|7/i.test(String(ageBand));
    return `Read in a warm, expressive, clear children's storybook narration style with ${younger ? "slow, gentle" : "natural, engaging"} pacing and ${String(tone || "playful").toLowerCase()} wonder.`;
  }

  function characterDelivery(description, index) {
    if (/elder|old|ancient|gruff/.test(description)) return "with a wise, textured elder tone";
    if (/funny|playful|comic/.test(description)) return "with playful energy and clear comic timing";
    if (/brave|hero|protective|determined/.test(description)) return "brave, calm, and protective";
    if (/calm|kind|gentle/.test(description)) return "calm, kind, and reassuring";
    if (/villain|rival|dark/.test(description)) return "controlled, mysterious, and dramatic";
    return index === 0 ? "brave, lively, and easy for children to understand" : "distinct, expressive, and story-focused";
  }

  function deliveryForEmotion(emotion) {
    const directions = {
      excited: "bright and excited",
      hushed: "quietly, as though sharing a secret",
      urgent: "urgent but still clear",
      tender: "gently and with care",
      curious: "with thoughtful curiosity",
      warm: "warmly and naturally",
    };
    return directions[emotion] || directions.warm;
  }

  function audioGenerationSource(text, voiceId, deliveryDirection) {
    return `${cleanText(text)}\n${String(voiceId || "").trim()}\n${cleanText(deliveryDirection)}`;
  }

  async function audioGenerationHash(text, voiceId, deliveryDirection) {
    const source = audioGenerationSource(text, voiceId, deliveryDirection);
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function nextPlaybackPosition({ pageIndex, beatIndex, beatCount, pageCount, hasChoices }) {
    if (hasChoices) return { pageIndex, beatIndex, stopped: true, sceneChanged: false };
    if (beatIndex + 1 < beatCount) return { pageIndex, beatIndex: beatIndex + 1, stopped: false, sceneChanged: false };
    if (pageIndex + 1 < pageCount) return { pageIndex: pageIndex + 1, beatIndex: 0, stopped: false, sceneChanged: true };
    return { pageIndex, beatIndex, stopped: true, sceneChanged: false };
  }

  function narrationFallback(error) {
    return {
      status: "failed",
      textOnly: true,
      message: error?.message || "Narration unavailable",
    };
  }

  function normalizeCharacters(characters) {
    return (Array.isArray(characters) ? characters : [])
      .map((item) => typeof item === "string" ? { name: item } : item || {})
      .filter((item) => item.name && !/^(narrator|custom object|custom pet|none)$/i.test(item.name));
  }

  function cleanNarrationSegment(value, cast) {
    let text = String(value || "").trim();
    const names = cast.map((item) => escapeRegExp(item.name)).filter(Boolean).join("|");
    if (!names) return text;
    const attribution = `(?:${names})\\s+(?:${SPEECH_VERBS})`;
    const inverseAttribution = `(?:${SPEECH_VERBS})\\s+(?:${names})`;
    text = text
      .replace(new RegExp(`^\\s*[,;:-]?\\s*(?:${attribution}|${inverseAttribution})\\s*[,.!?;:-]*\\s*`, "i"), "")
      .replace(new RegExp(`\\s*(?:${attribution}|${inverseAttribution})\\s*[,;:-]?\\s*$`, "i"), "")
      .trim();
    return text;
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function safeId(value) {
    return String(value || "scene").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "scene";
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return {
    parseStorySceneIntoNarrationBeats,
    assignVoiceProfiles,
    applyVoiceProfiles,
    audioGenerationSource,
    audioGenerationHash,
    nextPlaybackPosition,
    narrationFallback,
  };
});
