# OPREALM Production Deployment

Production deployment is handled by the guarded GitHub Actions workflow:

```txt
.github/workflows/oprealm-production-deploy.yml
```

The workflow deploys only from `main`. A manual run from any feature branch fails before checkout, tests, migrations, or Cloudflare deployment.

## What The Workflow Does

1. Confirms the Git ref is exactly `refs/heads/main`.
2. Confirms the required Cloudflare GitHub repository secrets exist.
3. Checks out the guarded main commit.
4. Installs dependencies with `npm ci`.
5. Runs `npm test`.
6. Runs `node scripts/generate-content-machine-docs.mjs`.
7. Fails if generated docs are not committed.
8. Verifies Cloudflare authentication with `npx wrangler whoami`.
9. Applies remote D1 migrations to `oprealm-discord`.
10. Deploys `public/` to the Cloudflare Pages project `oprealm` on branch `main`.

## GitHub Repository Secrets

Add these in GitHub repository settings under:

```txt
Settings -> Secrets and variables -> Actions -> Repository secrets
```

| Secret | Required | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Yes | Authenticates Wrangler in GitHub Actions. The token must be scoped to the Cloudflare account that owns the `oprealm` Pages project and `oprealm-discord` D1 database, with permission to deploy Pages and apply D1 migrations. |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Selects the Cloudflare account for Wrangler commands in CI. |

Do not commit these values. Do not print them in logs, issues, pull requests, docs, or chat.

## Cloudflare Runtime Secrets

Application runtime secrets belong in Cloudflare Pages production environment variables/secrets, not in this GitHub Actions workflow unless a future workflow step explicitly needs them.

Common OPREALM runtime secrets include:

- `OPREALM_SESSION_SECRET`
- `OPREALM_AUTH_SECRET`
- `OPREALM_ADMIN_SECRET`
- `OPREALM_WEBHOOK_SECRET`
- `OPREALM_LOG_SALT`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL`
- `TURNSTILE_SECRET_KEY`
- `DISCORD_CLIENT_SECRET`
- `OPENAI_API_KEY` or `OPENAI_API_KEYS`
- `ELEVENLABS_API_KEY`
- `GEMINI_API_KEY`
- provider-specific media generation secrets

Public IDs, D1 bindings, R2 bindings, and queue names stay in `wrangler.jsonc`.

## Production Resources

| Resource | Value |
| --- | --- |
| Cloudflare Pages project | `oprealm` |
| Pages output directory | `public` |
| Production branch | `main` |
| D1 database | `oprealm-discord` |
| D1 binding | `OPREALM_DB` |
| R2 bucket | `oprealm-assets` |
| R2 binding | `OPREALM_ASSETS` |

## Guardrails

- The workflow trigger listens only to pushes on `main` plus manual dispatch.
- The first step fails unless `GITHUB_REF` is `refs/heads/main`.
- Cloudflare commands do not run unless `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are present.
- Tests and docs generation run before D1 migrations or Pages deployment.
- D1 migrations are applied before deploying the Pages project.
- Feature branches and pull requests do not deploy production.
