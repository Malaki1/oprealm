# OPREALM backend scalability hardening

This project runs on Cloudflare Pages Functions, so public HTTP traffic is already edge load-balanced and horizontally autoscaled by Cloudflare. The application code should stay stateless and keep shared state in durable services.

## What is now in place

- Stateless web auth support through a signed `oprealm_auth` cookie. Set `OPREALM_SESSION_SECRET` to enable it. The older D1 `web_sessions` cookie remains as a compatibility fallback.
- D1-backed per-route rate limits in `api_rate_limits`, including 5 login/register/reset attempts per 15 minutes.
- D1 generation job records in `generation_jobs` for idempotency, caching, retries, and async queue migration.
- Central OpenAI gateway helper with key pooling. Supported secrets:
  - `OPENAI_API_KEYS` as a comma-separated pool.
  - `OPENAI_API_KEY`.
  - `OPENAI_API_KEY_2` through `OPENAI_API_KEY_10`.
- API request logging in `api_request_logs`, with request id, route, status, latency, colo, coarse user-agent type, and anonymized IP hash.
- AI provider gateway logging in `api_gateway_events`, with provider, route, status, attempts, and latency.
- Request size, malformed JSON, suspicious script content, and excessive nested-field validation in API middleware.

## Queue strategy

Current generation routes still return synchronously where possible for the smooth creator experience. The durable `generation_jobs` table is the shared source of truth for queue state.

For high traffic, add a Cloudflare Queue binding named `OPREALM_GENERATION_QUEUE` and move slow multi-step tools to this shape:

1. API route validates input, checks auth, rate limits, creates a `generation_jobs` row, and sends the job id to `OPREALM_GENERATION_QUEUE`.
2. API route returns `{ jobId, status: "queued" }` immediately.
3. Worker consumer processes the job, charges credits only after success, writes result metadata to D1, stores large assets in R2, and marks the job complete.
4. Frontend polls a `/api/generation-status?id=...` endpoint or subscribes through a future realtime channel.

This prevents long image/video generations from tying up request handlers during spikes.

## Required production secrets

Use Cloudflare Pages secrets, not `wrangler.jsonc`, for private values:

```powershell
& "C:\Users\malcr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "node_modules\wrangler\bin\wrangler.js" pages secret put OPREALM_SESSION_SECRET --project-name oprealm
& "C:\Users\malcr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "node_modules\wrangler\bin\wrangler.js" pages secret put OPENAI_API_KEYS --project-name oprealm
```

## Next reliability upgrades

- Move video generation and multi-image storyboard batches to Cloudflare Queues first.
- Store generated image/video artifacts in R2 and return signed asset URLs instead of large base64 payloads.
- Add an admin metrics page over `api_request_logs`, `api_gateway_events`, `generation_jobs`, and `ai_usage`.
- Add circuit breakers per provider so repeated upstream failures temporarily degrade gracefully.
- Add cache keys to all deterministic generation routes and idempotency keys to all credit-charging routes.
- Add scheduled cleanup for old request logs, rate-limit buckets, expired sessions, and stale failed jobs.
