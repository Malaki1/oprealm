export function cleanText(value, maxLength = 500) {
  const raw = String(value || "");
  if (raw.length > maxLength * 4) {
    const error = new Error("Input is too large.");
    error.status = 413;
    throw error;
  }
  return raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function requireMinText(value, label, minLength = 2, maxLength = 500) {
  const raw = String(value || "");
  if (raw.length > maxLength) {
    const error = new Error(`${label} is too long. Keep it under ${maxLength} characters.`);
    error.status = 413;
    throw error;
  }
  const text = cleanText(value, maxLength);
  if (text.length < minLength) {
    const error = new Error(`${label} is too short.`);
    error.status = 400;
    throw error;
  }
  return text;
}

export function enumValue(value, allowed, fallback) {
  const text = cleanText(value, 120);
  return allowed.includes(text) ? text : fallback;
}

export function checkPromptSafety(value) {
  const text = String(value || "").toLowerCase();
  const blocked = [
    ["dm me", /\bdm\s+me\b/i],
    ["message me", /\bmessage\s+me\b/i],
    ["add me", /\badd\s+me\b/i],
    ["phone number", /\b(?:my|your|their|send|share|give|text|call|what(?:'s| is))?\s*phone\s+number\b/i],
    ["home address", /\b(?:my|your|their|send|share|give|tell|what(?:'s| is)|street|home|email|mailing|postal)\s+(?:home\s+)?address\b/i],
    ["school name", /\b(?:my|your|their|send|share|give|tell|what(?:'s| is))?\s*school\s+name\b/i],
    ["password", /\b(?:my|your|their|send|share|give|tell|what(?:'s| is))?\s*password\b/i],
    ["free robux", /\bfree\s+robux\b/i],
    ["private chat", /\bprivate\s+chat\b/i],
    ["meet me", /\bmeet\s+me\b/i],
    ["snapchat", /\bsnapchat\b/i],
    ["instagram", /\binstagram\b/i],
    ["tiktok", /\btiktok\b/i],
    ["whatsapp", /\bwhatsapp\b/i],
  ];
  const match = blocked.find(([, pattern]) => pattern.test(text));
  if (!match) return "";
  return `Please remove personal contact details such as "${match[0]}" before generating.`;
}

export function assertSafePrompt(value) {
  const warning = checkPromptSafety(value);
  if (warning) {
    const error = new Error(warning);
    error.status = 400;
    throw error;
  }
}
