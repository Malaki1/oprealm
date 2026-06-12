# OPRealm Development Handoff

Last updated: June 12, 2026

Repository: https://github.com/Malaki1/oprealm

Production: https://oprealm.com

Cloudflare Pages project: `oprealm`

Read this document before changing the creator flow. The current implementation has been built through many rapid production iterations, and older-looking files or assumptions can easily reintroduce bugs that were already fixed.

## 1. Product Vision

OPRealm is a safety-first, child-friendly AI creation platform for children aged 6 and over. The main product is not a generic prompt interface. It guides a child through creating an original world, character, full story, illustrated scenes, interactive AI storybook, movie assets, and a publishable RealmVerse creation.

The intended creator journey is:

`World > Character > Story Builder > Story Board (Scenes) > AI Story Generator > Publish > My Account`

The user should feel that they are making and publishing a real children's story experience, not exporting an AI response.

Key principles:

- Keep child-facing choices simple and understandable.
- Keep internal AI prompts, visual direction, plot planning, moderation, and technical metadata hidden.
- Story prose and visual image prompts must remain separate.
- Write the complete story first, approve it, then split it into scenes.
- Preserve character identity, outfit, palette, accessories, and world continuity.
- Publishing is moderated before a creation becomes public.
- Never expose provider API keys to the client.

## 2. Current Production Baseline

Use the latest `main` branch. At the time this handoff was written, the implementation baseline immediately before this document was:

`f35a78b Require manual scene image retries`

Important recent milestones:

- `f84032f` stores scene images in R2 and makes scene generation recoverable/idempotent.
- `f35a78b` removes automatic image retries. Failed scene images now require the user to press `Try Again`.
- `faae3c4` adds the seven-stage Publishing Studio.
- `2965013` separates story approval from the Story Scenes page.
- `6dabd95` expands stories to at least 16 scenes and improves cast-aware narration.
- `13869bf` prebuilds interactive storybook paths and narration.
- `e2a6464` adds persistent ElevenLabs storybook narration.
- `98f71c6` preserves deliberate cleared world and character state.

Do not restore a page from an earlier commit without comparing it against all later changes.

## 3. Technical Stack

- Static frontend: HTML, CSS, and browser JavaScript in `public/`
- Backend: Cloudflare Pages Functions in `functions/api/`
- Shared backend helpers: `functions/_lib/`
- Database: Cloudflare D1, binding `OPREALM_DB`
- Asset storage: Cloudflare R2, binding `OPREALM_ASSETS`
- Deployment config: `wrangler.jsonc`
- Image/text provider: OpenAI
- Video provider: Google Veo 3.1 preview
- Narration/music provider: ElevenLabs
- Billing: Stripe endpoints and webhook
- Authentication: signed stateless cookie when configured, D1 sessions as compatibility fallback
- Tests: Node test runner under `tests/`

This is not currently a framework application. Do not introduce React, a build system, or a second state architecture for a small change.

## 4. Main Pages

| Stage | Page | Main client code |
|---|---|---|
| Homepage / Describe Anything | `/` | `public/home.js` |
| World Creator | `/storyboard-world` | `public/storyboard-world.js` |
| Character Creator | `/storyboard-character` | `public/storyboard-character.js` |
| Story Builder / approval | `/storyboard` | `public/creator-flow.js` |
| Story scenes | `/storyboard-scenes` | `public/creator-flow.js` |
| Interactive storybook | `/ai-storybook` | `public/ai-storybook.js`, `public/storybook-narration.js` |
| Publishing Studio | `/publishing-studio` | `public/publishing-studio.js` |
| RealmVerse Library | `/library` | `public/library.js` |
| My Account | `/account` | `public/account.js` |

The creation navigation must remain:

`World > Character > Story Builder > Story Board (Scenes) > AI Story Generator > Publish > My Account`

## 5. Creator Flow State

The current creator project is primarily stored in browser local storage:

- Main project: `oprealm_storyboard_project_v1`
- AI storybook source: `oprealm_ai_storybook_source`
- Storybook player state: managed in `public/ai-storybook.js`
- Publishing state: managed in `public/publishing-studio.js`
- Story completion and recent publication records are also stored locally

The main project includes saved worlds, characters, approved story data, scene text, internal visual prompts, generated image URLs, generated video URLs, and workflow status.

Important:

- Clearing a world or character must persist as an intentional cleared state.
- Starting a blank creator must not reload the first saved item automatically.
- Do not preload placeholder worlds, characters, portals, prompts, landmarks, custom pets, or custom objects.
- Generated scene assets are increasingly server-backed, but the project structure is still local-first.
- A future priority is server-side project synchronization for cross-device access.

## 6. Story Creation Rules

### Story Builder

The child selects only:

- Story type
- Ending type
- Lesson/theme

Other structural choices are selected internally.

The generated story must:

- Be actual prose, not a plot outline or prompt.
- Use concrete events, dialogue, cause and effect, and clear progression.
- Avoid explaining its own themes, twists, structure, or author intent.
- Avoid excessive symbolism and vague emotional language.
- Include named speakers and dialogue where appropriate.
- Be divided into proper chapters and paragraphs.
- Include a title and chapter summary list.
- Not expose internal visual prompts or possible outcomes.

The complete story is approved before scenes are created.

### Scene Creation

- Minimum scene count is currently `16` via `MIN_STORY_SCENES` in `public/creator-flow.js`.
- The approved story is split into enough scenes to show meaningful events and dialogue.
- Scene text is reader-facing story prose.
- `imagePromptInternal` is separate internal visual direction.
- Mood and camera are assigned per scene and remain editable.
- The Story Scenes page must not contain another story approval builder.
- `Add Scene` appears only when scenes exist.

### Scene Image Generation

Endpoint: `/api/story-scene-images`

Current model: `gpt-image-1.5`, high quality.

Current scene image cost: `24` credits.

Current reliability behavior:

- Requests have idempotency keys and `generation_jobs` records.
- Successful images are stored in R2 under `story-scene-images/{userId}/{jobId}.png`.
- The client receives `/api/story-scene-image-file?jobId=...`, not a large base64 image when R2 is available.
- Credits are charged only after successful image generation/storage.
- The scene queue processes initial queued images one at a time.
- A failed image does **not** automatically retry.
- No timer, reload, page recovery, or provider-level automatic retry should regenerate a failed scene.
- A failed scene must show `Image Error` and `Try Again (24 credits)`.
- The user explicitly asked for manual retries only.

Do not reintroduce the old `Recovery queued` behavior.

## 7. Character and World Consistency

World generation:

- Uses `/api/story-world-image`.
- Current cost: `20` credits.
- World creator starts blank.
- Landmark selection has been removed.
- Generate World belongs beneath the prompt, not inside the image.
- Clear World must remain cleared after navigation.

Character generation:

- Uses `/api/story-character-image`.
- Current cost: `18` credits.
- Character creator starts blank.
- Character background should use the selected world when available.
- Saving a character needs visible acknowledgement.
- Clear Character must remain cleared after navigation.

Scene prompts enforce a detailed character consistency lock:

- Face, age, body proportions, hair/fur, species
- Exact outfit construction and local colours
- Pockets, panels, patches, accessories, seams, armour and asymmetry
- Saved master art style
- Original hero portrait has higher authority than later scene images

For unique branch scenes, continue to use the original character reference and approved outfit rather than allowing visual drift from a previous scene.

## 8. AI Storybook

The AI Storybook is a playable story experience, not a dashboard.

Current features include:

- Full-scene visual presentation
- Story beats within scenes
- Choice buttons only when choices are required
- Branching outcomes
- Pre-generated optional paths
- Persistent player position
- ElevenLabs narration
- Separate narrator, hero, and supporting-character voice assignment
- Gender, age band, character type, and role-aware voice selection
- Text highlighting and autoplay progression
- Play, pause, replay, volume, and autoplay controls
- Fullscreen/immersive presentation work

Narration architecture:

`Story text > beat parser > speaker detection > voice assignment > ElevenLabs generation > R2 audio > player`

Core files:

- `public/storybook-narration.js`
- `src/lib/apis/elevenlabs.ts`
- `functions/_lib/elevenlabs.js`
- `functions/api/storybook-narration.js`
- `functions/api/storybook-audio.js`

Narration rules:

- Delivery directions are metadata, never spoken text.
- The narrator must not read prompts such as “Make a child-friendly...”.
- Named dialogue should be attributed like a script before voice generation.
- Supporting characters must never default to the hero's voice.
- If speaker detection is uncertain, prefer Narrator over incorrectly assigning the hero.
- Autoplay should advance beats and scenes, but stop for a user choice.

Tests for parsing, speaker detection, voices, caching, fallback, and autoplay are in `tests/storybook-narration.test.cjs`.

## 9. Video and Movie Flow

Scene video:

- Endpoint: `/api/story-scene-video`
- Status endpoint: `/api/story-scene-video-status`
- File endpoint: `/api/story-scene-video-file`
- Provider: Google Veo
- Model: `veo-3.1-generate-preview`
- Current standard scene cost: `325` credits
- Uses the existing scene image plus an internally generated cinematic video prompt
- Completed video is persisted to R2
- The original scene image remains available after video generation
- Video jobs should remain visible after navigating away and returning

Required provider variables include one of:

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_AI_API_KEY`

The movie flow is intended to:

- Stitch generated scene videos together
- Mute original clip audio
- Add narration
- Add music
- Add synchronized subtitles
- Persist movie preview
- Allow playback, pause, stop, restart, and clear preview

Some movie-editor behavior remains an evolving area. Inspect the current page before changing it.

## 10. Publishing Studio

Page: `/publishing-studio`

Publishing is a major achievement moment and gateway to RealmVerse. Do not send a user directly from Story Complete to a final publish call.

Current seven-stage workflow:

1. Story celebration
2. AI Cover Generator
3. Cover editor
4. Scene review/edit
5. Story metadata
6. RealmVerse reader card preview
7. Final publishing screen

Cover generation:

- Generates three professional cover concepts
- Uses story, characters, world, and theme
- One provider request per concept
- Current cover cost is `24` credits each, `72` total for three
- Supports partial success and fallback cards

Cover editing includes:

- Title
- Subtitle
- Author
- Font
- Text colour
- Effects
- Title position

Scene review:

- Explicit `Edit Scene` action
- Expands the selected scene
- Allows title and story text editing
- Persists changes back to the local storyboard project

Final publishing:

- Submits through `/api/creations`
- Uses `story_game` as the creation type
- Saves age band and tags
- Starts as `pending_review`
- Must not immediately become public

## 11. RealmVerse, Account, Credits, and Progress

RealmVerse Library is the publishing destination and community discovery surface.

My Account currently includes:

- Credits
- Saved/recent projects
- Draft and completed creations
- Daily login streak
- Creator points/XP
- Levels and rank labels
- Achievement and leaderboard UI

The account and progression layer has a mixture of database-backed account information and locally derived project/progress information. Verify persistence before promising cross-device behavior.

Current pricing source of truth:

`functions/_lib/creator-pricing.js`

Current main costs:

| Action | Credits |
|---|---:|
| Character image | 18 |
| World image | 20 |
| Full story draft | 6 |
| Story plan | 5 |
| Scene image | 24 |
| Eight-second scene video | 325 |
| Story branch | 24 |
| Cover | 24 |
| Reference board | 24 |
| Roblox wallpaper | 8 |

Memberships:

- Explorer: A$9.99, 100 credits
- Creator: A$24.99, 250 credits
- Elite Creator: A$49.99, 500 credits

Do not silently change credit prices in UI only. Update the shared pricing module and all relevant labels together.

## 12. Safety and Moderation

Safety is a core product requirement.

- User prompts are checked before generation.
- Storybook audio must only be generated after story moderation and age-band checks.
- Public creations begin in `pending_review`.
- API middleware validates request size, JSON shape, unsafe markup, excessive nesting, and image data URL count.
- Login and generation routes have D1-backed rate limits.
- Pages set security headers in `public/_headers`.
- No public private messaging should be introduced.
- Avoid including real-child personal data in prompts or assets.

Relevant files:

- `functions/_lib/validate.js`
- `functions/api/_middleware.js`
- `functions/api/creations-moderate.js`
- `functions/api/audio-library-moderate.js`

## 13. Backend and Persistence

Important D1 tables include:

- `web_users`
- `web_sessions`
- `billing_events`
- `generation_jobs`
- `api_rate_limits`
- `api_request_logs`
- `api_gateway_events`
- `ai_usage`
- `storybooks`/creation-related tables from migrations
- `storybook_audio_beats`
- marketplace and public creation tables

Migrations live in `migrations/`.

Generation design:

- Use `generation_jobs` for idempotency and durable status.
- Use R2 for large image, video, and audio artifacts.
- Do not store large base64 results in D1.
- Charge credits only after successful provider generation and required asset persistence.
- Repeated requests with the same idempotency key must not double-charge.

Current limitation:

- Many generation endpoints remain synchronous Cloudflare Function requests.
- The recommended next backend step is Cloudflare Queues for long-running image batches, video, storybook preparation, and narration batches.

See `docs/backend-scalability-hardening.md`.

## 14. Provider Configuration

Private values must be Cloudflare Pages secrets, never committed.

Common secrets:

- `OPREALM_SESSION_SECRET`
- `OPENAI_API_KEYS` or `OPENAI_API_KEY`
- `OPENAI_API_KEY_2` through `_10` if key pooling is used
- `ELEVENLABS_API_KEY`
- ElevenLabs voice/model overrides
- `GEMINI_API_KEY` or equivalent Google key
- `OPREALM_VIDEO_PROVIDER`
- Stripe keys/webhook secret
- Turnstile secret
- Email/reset provider secrets

Public IDs and bindings are in `wrangler.jsonc`.

Never print secret values in logs, commits, documentation, or chat.

## 15. Local Development and Deployment

Install dependencies:

```powershell
npm install
```

Normal local development:

```powershell
npm run dev
```

If `npm`/`npx` are not available in PATH on this Windows machine, use the bundled Node runtime:

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ".\node_modules\wrangler\bin\wrangler.js" pages dev public
```

Run tests:

```powershell
npm test
```

Direct production deployment:

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ".\node_modules\wrangler\bin\wrangler.js" pages deploy public --project-name oprealm --branch main --commit-dirty=true
```

Cloudflare database:

- Name: `oprealm-discord`
- Binding: `OPREALM_DB`

Cloudflare asset bucket:

- Name: `oprealm-assets`
- Binding: `OPREALM_ASSETS`

Before a remote D1 command, run `wrangler whoami` and confirm the authenticated account can list both the `oprealm` Pages project and `oprealm-discord` D1 database.

## 16. Validation Checklist

Before deploying:

1. Run `node --check` on every changed JavaScript file.
2. Run `npm test`.
3. Run `git diff --check`.
4. Test first-run blank state separately from saved-project state.
5. Verify current creator navigation on all changed pages.
6. Confirm credit labels match `creator-pricing.js`.
7. Confirm failed generation does not charge credits.
8. Confirm manual-only scene retry behavior.
9. Confirm clear world/character remains cleared after navigation.
10. Confirm story prose does not contain internal prompts, custom placeholder objects, structural commentary, or visual direction.
11. Confirm generated character/world/scene assets persist after navigation.
12. Verify production after deployment with a cache-busting query.

Existing tests:

- `tests/prompt-safety.test.mjs`
- `tests/scene-visual-prompt.test.cjs`
- `tests/storybook-narration.test.cjs`

The Story Creator QA playbook is in `docs/story-creator-flow-qa.md`, but note that its old “at least 6 scenes” wording predates the current minimum of 16.

## 17. Known Limitations and Next Priorities

Highest-value next work:

1. Move long-running generation batches to Cloudflare Queues.
2. Add server-backed project persistence and cross-device synchronization.
3. Finish the movie editor/stitching pipeline with narration, music, subtitles, and durable previews.
4. Harden storybook preparation against provider rate limits with resumable staged jobs.
5. Add explicit per-stage save/version records rather than relying on one local project blob.
6. Expand automated end-to-end tests for World > Character > Story > Scenes > Storybook > Publish.
7. Add provider circuit breakers and clearer admin health metrics.
8. Reconcile old duplicate files such as `*-LAPTOP-6HQKL13B.*` only after confirming they are unused.
9. Update the root README, which still describes an early Cloudflare website rather than the current platform.

## 18. Do Not Regress These Decisions

- Do not preload premade worlds or characters.
- Do not restore landmark selection.
- Do not put internal image/video prompts into reader-facing story text.
- Do not write plot explanations instead of story prose.
- Do not show optional choice buttons when no choice is required.
- Do not give supporting-character dialogue the hero voice.
- Do not speak delivery directions through ElevenLabs.
- Do not remove the original image after generating video.
- Do not auto-retry failed scene images.
- Do not charge credits twice for one idempotent generation.
- Do not immediately publish unmoderated creations.
- Do not replace the current creator pages with older versions from another branch or machine.
- Do not expose API keys on the client.

## 19. Suggested Claude Starting Prompt

```text
Inspect the OPRealm repository and continue from the latest main branch.

Repository: https://github.com/Malaki1/oprealm

Read DEVELOPMENT_HANDOFF.md first. Preserve the current production creator flow:

World > Character > Story Builder > Story Board (Scenes) >
AI Story Generator > Publish > My Account

Before editing, inspect the relevant current page, its client script, API route,
recent commits, and existing tests. Do not restore older page versions. Keep
reader-facing story prose separate from internal planning and visual prompts.
Failed scene images must require a manual Try Again action and must not retry
automatically. Never expose secrets or mutate production data without explicit
authorization.

After changes, run syntax checks, tests, git diff --check, and verify the target
page in a browser before reporting completion.
```

