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
    "dm me",
    "message me",
    "add me",
    "phone number",
    "address",
    "school name",
    "password",
    "free robux",
    "private chat",
    "meet me",
    "snapchat",
    "instagram",
    "tiktok",
    "whatsapp",
  ];
  const phrase = blocked.find((item) => text.includes(item));
  if (!phrase) return "";
  return `Please remove unsafe personal/contact wording like "${phrase}" before generating.`;
}

export function assertSafePrompt(value) {
  const warning = checkPromptSafety(value);
  if (warning) {
    const error = new Error(warning);
    error.status = 400;
    throw error;
  }
}
