export function hasOpenAiKey(env) {
  return openAiKeys(env).length > 0;
}

export async function openAiFetch(env, path, init = {}, options = {}) {
  const keys = openAiKeys(env);
  if (!keys.length) {
    const error = new Error("The OPRealm AI gateway is not configured yet.");
    error.status = 500;
    throw error;
  }

  const url = path.startsWith("http") ? path : `https://api.openai.com${path}`;
  const retries = Math.max(0, Math.min(3, Number(options.retries ?? 2)));
  const timeoutMs = Math.max(5000, Math.min(240000, Number(options.timeoutMs || 120000)));
  const start = Date.now();
  let lastResponse;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const key = keys[(stableNumber(options.seed) + attempt) % keys.length];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(init.headers || {}),
          authorization: `Bearer ${key}`,
        },
      });
      lastResponse = response;
      if (!shouldRetry(response.status) || attempt === retries) {
        logGateway(env, {
          provider: "openai",
          path: new URL(url).pathname,
          status: response.status,
          attempts: attempt + 1,
          durationMs: Date.now() - start,
        });
        return response;
      }
      await sleep(retryDelayMs(attempt));
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? Object.assign(new Error("The AI provider took too long to respond."), { status: 504 })
        : error;
      if (attempt === retries) break;
      await sleep(retryDelayMs(attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("AI gateway request failed.");
}

function openAiKeys(env) {
  const keys = [];
  const add = (value) => {
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        if (!keys.includes(item)) keys.push(item);
      });
  };
  add(env.OPENAI_API_KEYS);
  add(env.OPENAI_API_KEY);
  for (let index = 2; index <= 10; index += 1) add(env[`OPENAI_API_KEY_${index}`]);
  return keys;
}

function shouldRetry(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function retryDelayMs(attempt) {
  return 250 * 2 ** attempt + Math.floor(Math.random() * 120);
}

function stableNumber(value) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return hash;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logGateway(env, event) {
  if (!env.OPREALM_DB) return;
  const payload = JSON.stringify(event).slice(0, 1500);
  env.OPREALM_DB.prepare(
    `INSERT INTO api_gateway_events (provider, route, status, attempts, duration_ms, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(event.provider, event.path, event.status, event.attempts, event.durationMs, payload)
    .run()
    .catch(() => {});
}
