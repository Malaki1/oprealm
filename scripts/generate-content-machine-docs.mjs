import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const docsRoot = path.join(repoRoot, "docs", "oprealm-content-machine");
const notionRoot = path.join(repoRoot, "docs", "notion", "oprealm-action-plan");

function write(relativePath, content) {
  const fullPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${content.trim()}\n`, "utf8");
}

function mdList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

const canonicalDocs = [
  ["00-source-of-truth.md", "Source Of Truth"],
  ["01-product-vision.md", "Product Vision"],
  ["02-ecosystem-overview.md", "Ecosystem Overview"],
  ["03-master-workflow.md", "Master Workflow"],
  ["04-user-input-to-brand-brain.md", "User Input To Brand Brain"],
  ["05-brand-brain.md", "Brand Brain"],
  ["06-creative-brief.md", "Creative Brief"],
  ["07-campaign-engine.md", "Campaign Engine"],
  ["08-content-blueprint.md", "Content Blueprint"],
  ["09-agency-quality-layer.md", "Agency Quality Layer"],
  ["10-creative-review-agents.md", "Creative Review Agents"],
  ["11-pre-video-qa-gates.md", "Pre-Video QA Gates"],
  ["12-revision-engine.md", "Revision Engine"],
  ["13-generation-workflows.md", "Generation Workflows"],
  ["14-media-generation-adapter.md", "Media Generation Adapter"],
  ["15-asset-library.md", "Asset Library"],
  ["16-token-billing.md", "Token Billing"],
  ["17-calendar-and-approval.md", "Calendar And Approval"],
  ["18-scheduling-and-publishing.md", "Scheduling And Publishing"],
  ["19-social-connectors.md", "Social Connectors"],
  ["20-youtube-engine.md", "YouTube Engine"],
  ["21-analytics-feedback-loop.md", "Analytics Feedback Loop"],
  ["22-data-models.md", "Data Models"],
  ["23-api-surface.md", "API Surface"],
  ["24-worker-architecture.md", "Worker Architecture"],
  ["25-state-machines.md", "State Machines"],
  ["26-error-handling-and-retries.md", "Error Handling And Retries"],
  ["27-admin-and-friend-access.md", "Admin And Friend Access"],
  ["28-security-and-secrets.md", "Security And Secrets"],
  ["29-implementation-roadmap.md", "Implementation Roadmap"],
  ["30-pr-breakdown.md", "PR Breakdown"],
  ["31-acceptance-criteria.md", "Acceptance Criteria"],
  ["32-open-questions.md", "Open Questions"],
  ["33-glossary.md", "Glossary"],
];

const principles = [
  "GitHub docs under `docs/oprealm-content-machine/` are canonical.",
  "Notion-ready docs under `docs/notion/oprealm-action-plan/` are execution planning documents only.",
  "OPREALM owns orchestration, Brand Brain, campaign strategy, token billing, approval state, publishing mirrors, analytics memory, and provider-cost tracking.",
  "Generative-Media-Skills is a workflow reference and optional adapter source, not the OPREALM user-facing information architecture.",
  "BrightBean-style scheduling is represented as a scheduling/publishing abstraction until OPREALM decides whether to integrate or rebuild.",
  "Tokens are internal usage credits, not blockchain assets.",
  "Approval means business publishing approval unless a doc explicitly refers to safety or moderation.",
  "Generated assets are private to their workspace by default.",
  "Publishing must be idempotent so retries cannot duplicate posts.",
  "No high-cost video-generation workflow may run before Agency QA and the Pre-Video Gate pass or receive a logged human override.",
];

const firstInputFields = [
  "businessName",
  "websiteUrl",
  "productOrService",
  "targetAudience",
  "mainBusinessGoal",
  "offer",
  "primaryCTA",
  "platforms",
  "campaignDurationDays",
  "postingCadence",
  "contentPacks",
  "brandAssets",
  "sourceVideos",
  "productImages",
  "productVideos",
  "approvalMode",
  "tokenBudget",
  "manualExportMode",
  "connectedSocialAccountIds",
];

const qaGates = [
  "Gate 1: Brand Brain QA",
  "Gate 2: Creative Brief QA",
  "Gate 3: Best-of-N Concept QA",
  "Gate 4: Copy / Script QA",
  "Gate 5: Storyboard / Shot-list QA",
  "Gate 6: Static Keyframe QA",
  "Gate 7: Platform Native QA",
  "Gate 8: Pre-Video Production Approval",
  "Gate 9: Post-Render QA",
  "Gate 10: Campaign Coherence QA",
  "Gate 11: Calendar Approval",
  "Gate 12: Analytics Feedback Review",
];

const reviewAgents = [
  ["Creative Director Agent", "Reviews the whole concept against campaign strategy, audience, offer, and commercial clarity."],
  ["Brand Consistency Agent", "Checks voice, claims, CTA, offer, proof points, visual identity, and forbidden language."],
  ["Copy Chief Agent", "Reviews hooks, scripts, captions, titles, descriptions, CTAs, readability, and spoken duration."],
  ["Art Director Agent", "Reviews composition, hierarchy, color, typography, product visibility, lighting, and premium polish."],
  ["Platform Native Agent", "Checks whether the work fits TikTok, Reels, Shorts, YouTube, LinkedIn, Facebook, and feed placements."],
  ["Video Preflight Agent", "Checks storyboard, shot list, duration, aspect ratio, scene continuity, assets, and render readiness."],
  ["Performance Prediction Agent", "Scores likely performance from hook strength, novelty, clarity, CTA, audience fit, and platform fit."],
  ["Revision Planner", "Turns structured QA findings into specific low-cost regeneration or patch instructions."],
  ["Post-Render QA Agent", "Reviews rendered media for playback, audio, captions, duration, defects, CTA, and export validity."],
  ["Campaign Coherence Agent", "Reviews the campaign as a set so the month feels coherent without becoming repetitive."],
];

const contentMachineStates = [
  "draft",
  "input_collected",
  "brand_ingestion_started",
  "brand_brain_ready",
  "brand_brain_qa_pending",
  "brand_brain_qa_passed",
  "creative_brief_ready",
  "creative_brief_qa_pending",
  "creative_brief_qa_passed",
  "campaign_strategy_ready",
  "campaign_strategy_qa_pending",
  "campaign_strategy_qa_passed",
  "token_quote_ready",
  "awaiting_token_confirmation",
  "tokens_reserved",
  "content_blueprints_created",
  "concepts_generated",
  "concepts_reviewed",
  "copy_generated",
  "copy_qa_pending",
  "copy_qa_passed",
  "visual_direction_generated",
  "visual_direction_qa_pending",
  "visual_direction_qa_passed",
  "storyboards_generated",
  "storyboard_qa_pending",
  "storyboard_qa_passed",
  "static_keyframes_generated",
  "static_keyframe_qa_pending",
  "static_keyframe_qa_passed",
  "approved_for_video_generation",
  "media_jobs_queued",
  "media_generated",
  "post_render_qa_pending",
  "post_render_qa_passed",
  "assets_packaged",
  "calendar_drafts_created",
  "awaiting_business_approval",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "analytics_pending",
  "analytics_collected",
  "campaign_memory_updated",
  "completed",
  "failed",
  "cancelled",
];

const entities = [
  ["users", "Authenticated people who can own or access workspaces."],
  ["workspaces", "Business, friend, or client containers for brands, assets, runs, tokens, and approvals."],
  ["workspace_members", "Scoped user membership and role records for workspaces."],
  ["friend_invites", "Tokenized access invitations for collaborators or clients."],
  ["brands", "Business identities connected to Brand Brain, sources, design systems, campaigns, and assets."],
  ["brand_sources", "Website pages, uploaded documents, logos, videos, testimonials, ads, and notes used for ingestion."],
  ["brand_brains", "Approved business memory: offer, audience, CTAs, proof points, objections, tone, and visual identity."],
  ["brand_design_systems", "Lightweight brand design rules for colors, fonts, logos, thumbnails, captions, and video style."],
  ["business_goals", "Objective, audience, offer, CTA, platforms, cadence, and content mix for a campaign."],
  ["creative_briefs", "Campaign-level operating brief used by generation and QA agents."],
  ["campaigns", "Strategy container for pillars, hooks, angles, platforms, token quotes, and content packs."],
  ["content_machine_runs", "End-to-end orchestration run from input through analytics feedback."],
  ["content_blueprint_items", "Planned deliverables before they become generation-ready Content Atoms."],
  ["content_atoms", "Individual post, ad, video, thumbnail, caption, script, or creative unit."],
  ["creative_review_jobs", "QA jobs for stages such as brand_brain, copy_script, storyboard, static_keyframe, pre_video, and post_render."],
  ["creative_scorecards", "Numeric QA decisions with category scores, blockers, and recommended changes."],
  ["qa_feedback", "Machine-actionable findings used by the revision engine."],
  ["revision_requests", "Structured change instructions created from QA findings."],
  ["asset_versions", "Version history for generated or uploaded assets."],
  ["media_jobs", "Provider-facing jobs for images, video, audio, captions, thumbnails, and exports."],
  ["assets", "Private workspace files with metadata, source links, versions, QA status, and publish usage."],
  ["calendar_items", "Draft, approved, scheduled, published, or manual-export content placements."],
  ["approval_events", "Business approval, rejection, change request, override, and bulk-approval audit records."],
  ["social_accounts", "Connected or manually represented platform accounts."],
  ["publishing_attempts", "Idempotent platform posting attempts with status, errors, platform IDs, and URLs."],
  ["analytics_records", "Performance snapshots normalized by platform, hook, angle, CTA, content type, and posting time."],
  ["token_wallets", "User token balances with available, reserved, purchased, and spent totals."],
  ["token_transactions", "Ledger entries for purchases, admin grants, reservations, reservation releases, spends, refunds, and adjustments."],
  ["token_reservations", "Protected token holds for planned work and provider jobs, including spend, release, and refund totals."],
  ["token_packs", "Purchasable or grantable internal credit bundles."],
  ["stripe_webhook_events", "Verified Stripe webhook receipts used to process token purchases idempotently."],
  ["provider_cost_records", "Actual provider cost and margin data for admin reporting."],
];

const apiGroups = [
  ["Workspaces", "GET /api/workspaces", "List workspaces visible to the signed-in user."],
  ["Workspaces", "POST /api/workspaces", "Create a workspace and owner membership."],
  ["Workspaces", "GET /api/workspaces/:workspaceId", "Read a workspace after membership authorization."],
  ["Workspace Members", "GET /api/workspaces/:workspaceId/members", "List workspace members."],
  ["Workspace Members", "POST /api/workspaces/:workspaceId/members", "Owner/admin route to add a member by user ID or email."],
  ["Friend Invites", "GET /api/workspaces/:workspaceId/invites", "Owner/admin route to list workspace invites."],
  ["Friend Invites", "POST /api/workspaces/:workspaceId/invites", "Owner/admin route to create a friend/client invite with optional token grant."],
  ["Friend Invites", "POST /api/invites/:inviteId/accept", "Accept a pending invite, create membership, and apply any grant once."],
  ["Friend Invites", "POST /api/invites/:inviteId/revoke", "Owner/admin route to revoke a pending invite."],
  ["Brands", "POST /api/brands", "Create a brand shell for ingestion."],
  ["Brand Sources", "POST /api/brands/:brandId/sources", "Attach website URLs, files, videos, testimonials, or notes."],
  ["Brand Brain", "POST /api/brands/:brandId/brand-brain/ingest", "Queue Brand Brain ingestion."],
  ["Brand Brain", "PUT /api/brand-brains/:brandBrainId", "Edit and approve extracted Brand Brain fields."],
  ["Campaigns", "POST /api/campaigns", "Create campaign strategy from Brand Brain and business goal."],
  ["Creative Briefs", "POST /api/campaigns/:campaignId/creative-brief", "Generate a campaign creative brief."],
  ["Creative Briefs", "GET /api/campaigns/:campaignId/creative-brief", "Read the active creative brief."],
  ["Creative Briefs", "PUT /api/campaigns/:campaignId/creative-brief", "Update or approve the creative brief."],
  ["Content Machine", "POST /api/content-machine-runs", "Create a draft run from first input."],
  ["Content Machine", "POST /api/content-machine-runs/:runId/quote", "Create token quote."],
  ["Content Machine", "POST /api/content-machine-runs/:runId/confirm", "Reserve tokens and begin generation."],
  ["Blueprints", "POST /api/campaigns/:campaignId/blueprint", "Create content blueprint items."],
  ["Concepts", "POST /api/campaigns/:campaignId/generate-concepts", "Generate Best-of-N concept options."],
  ["Concepts", "POST /api/campaigns/:campaignId/select-concept", "Select the winning concept."],
  ["Concepts", "GET /api/campaigns/:campaignId/concepts", "List concept options and scores."],
  ["Creative QA", "POST /api/creative-reviews", "Create a creative review job."],
  ["Creative QA", "GET /api/creative-reviews/:reviewId", "Read review status, scorecard, and findings."],
  ["Creative QA", "GET /api/content-atoms/:contentAtomId/reviews", "List reviews for a content atom."],
  ["Creative QA", "POST /api/content-atoms/:contentAtomId/request-qa", "Request stage QA."],
  ["Creative QA", "POST /api/content-atoms/:contentAtomId/apply-qa-feedback", "Create revision request from QA findings."],
  ["Creative QA", "POST /api/content-atoms/:contentAtomId/approve-for-video", "Mark approved_for_video when gates pass."],
  ["Creative QA", "POST /api/content-atoms/:contentAtomId/override-qa", "Log manual override with reason."],
  ["Media Jobs", "POST /api/media-jobs", "Queue media generation only when prerequisites are met."],
  ["Assets", "GET /api/assets", "List active workspace asset records visible to the signed-in user."],
  ["Assets", "POST /api/assets", "Create a source or generated asset record."],
  ["Assets", "GET /api/assets/:assetId", "Read an asset after workspace authorization."],
  ["Assets", "PATCH /api/assets/:assetId", "Update asset metadata, title, storage URL, thumbnail, or visibility."],
  ["Assets", "DELETE /api/assets/:assetId", "Archive an asset record without removing its storage object."],
  ["Calendar", "POST /api/calendar-items", "Create calendar draft."],
  ["Approval", "POST /api/calendar-items/:calendarItemId/approval-events", "Approve, reject, request changes, or override."],
  ["Publishing", "POST /api/calendar-items/:calendarItemId/schedule", "Schedule approved item."],
  ["Publishing", "GET /api/publishing-attempts/:attemptId", "Read publish attempt status."],
  ["Analytics", "POST /api/analytics/sync", "Queue analytics sync for connected accounts."],
  ["Billing", "GET /api/billing/wallet", "Read or create the signed-in user's token wallet."],
  ["Billing", "GET /api/billing/transactions", "List signed-in user's token ledger entries."],
  ["Billing", "GET /api/billing/token-packs", "List active token packs."],
  ["Billing", "POST /api/billing/token-topup", "Create a Stripe Checkout Session for an active token pack."],
  ["Billing", "POST /api/billing/reservations", "Reserve available tokens for planned work."],
  ["Billing", "POST /api/billing/reservations/:reservationId/spend", "Spend from an active reservation."],
  ["Billing", "POST /api/billing/reservations/:reservationId/release", "Release unused reserved tokens."],
  ["Billing", "POST /api/billing/reservations/:reservationId/refund", "Refund a reservation and reverse spent totals where needed."],
  ["Webhooks", "POST /api/webhooks/stripe", "Verify Stripe signatures and credit token purchases exactly once."],
  ["Admin", "POST /api/admin/users/:userId/grant-tokens", "Grant tokens to a user with an admin bearer secret."],
  ["Admin", "GET /api/admin/token-transactions", "Read recent token ledger entries with user context."],
  ["Admin", "GET /api/admin/provider-costs", "Review provider cost and margin records."],
];

const workers = [
  ["brand-ingest-worker", "Fetches websites, stores sources, extracts Brand Brain, and marks low-confidence gaps."],
  ["creative-brief-worker", "Creates creative brief and moodboard from Brand Brain, goal, offer, and platform plan."],
  ["campaign-worker", "Generates pillars, hooks, angles, platform plan, cadence, and token quote inputs."],
  ["content-blueprint-worker", "Creates blueprint items and Content Atoms for planned deliverables."],
  ["creative-qa-worker", "Runs QA agents, scorecards, findings, and stage approval decisions."],
  ["revision-planner-worker", "Converts QA findings into regeneration or patch instructions and manages revision loops."],
  ["media-generation-worker", "Calls approved provider adapters and records media job outputs."],
  ["asset-packaging-worker", "Normalizes formats, variants, captions, thumbnails, and export files."],
  ["calendar-worker", "Creates calendar drafts and validates approval readiness."],
  ["publishing-worker", "Publishes due approved items idempotently and records platform IDs and URLs."],
  ["analytics-worker", "Pulls performance data and updates campaign memory and recommendations."],
  ["admin-cost-worker", "Reconciles token spend, provider costs, margin, grants, and refunds."],
];

const workflowSteps = [
  "User signs in",
  "User creates or selects workspace",
  "User creates or selects brand",
  "User enters business website and basic business details",
  "User uploads brand assets, product images, product videos, source videos, testimonials, notes, and existing ads",
  "User connects social accounts or chooses manual export mode",
  "User tops up tokens if needed",
  "User starts a Content Machine Run",
  "OPREALM validates required inputs",
  "OPREALM ingests website and uploaded assets",
  "OPREALM builds Brand Brain",
  "OPREALM extracts offer, audience, CTAs, pain points, proof points, objections, tone, products/services, testimonials, FAQs, and visual identity",
  "User reviews and edits Brand Brain",
  "OPREALM creates Creative Brief",
  "Agency QA reviews Brand Brain and Creative Brief",
  "OPREALM interprets business objective",
  "OPREALM creates campaign strategy",
  "OPREALM creates content pillars, campaign angles, hooks, platform plan, content mix, and posting cadence",
  "OPREALM creates token quote",
  "User confirms quote",
  "OPREALM reserves tokens",
  "OPREALM creates content blueprint",
  "OPREALM creates Content Atoms for every planned post/video/asset",
  "OPREALM generates Best-of-N concepts",
  "Agency QA scores concepts and selects or recommends winners",
  "OPREALM generates copy assets",
  "OPREALM generates scripts",
  "Agency QA reviews copy and scripts",
  "OPREALM generates visual direction and shot lists",
  "OPREALM generates storyboards",
  "Agency QA reviews visual direction and storyboards",
  "OPREALM generates static keyframes and thumbnail previews",
  "Agency QA reviews static keyframes",
  "Pre-Video Gate approves video-ready Content Atoms",
  "OPREALM generates image creatives",
  "OPREALM generates UGC videos, product videos, YouTube packages, and Shorts/Reels/TikTok variants only after approval",
  "Post-Render QA reviews generated video/audio/caption outputs",
  "OPREALM packages generated media into platform-specific formats",
  "OPREALM stores assets in asset library",
  "OPREALM creates calendar drafts",
  "OPREALM uploads media to scheduling layer if applicable",
  "OPREALM attaches platform-specific captions, hashtags, metadata, and assets",
  "User reviews drafts",
  "User approves, rejects, requests changes, regenerates, or bulk approves",
  "Approved items become scheduled",
  "Publishing worker validates and publishes due items idempotently",
  "OPREALM stores platform post ID, URL, attempts, and errors",
  "Analytics worker pulls metrics and OPREALM updates memory, insights, and next-batch recommendations",
];

function workflowTable() {
  const rows = workflowSteps.map((name, index) => {
    const step = index + 1;
    const owner = step <= 8 ? "UI + workspace service" : step <= 15 ? "Brand Brain + QA" : step <= 25 ? "Campaign + token services" : step <= 34 ? "Generation + QA" : step <= 42 ? "Asset + calendar services" : "Publishing + analytics";
    const worker = step <= 8 ? "none or async upload" : step <= 13 ? "brand-ingest-worker" : step <= 15 ? "creative-qa-worker" : step <= 23 ? "campaign/content-blueprint workers" : step <= 34 ? "creative-qa-worker + revision-planner-worker" : step <= 39 ? "media-generation-worker + asset-packaging-worker" : step <= 45 ? "calendar-worker" : "publishing-worker + analytics-worker";
    const entitiesWritten = step <= 8 ? "users, workspaces, brands, token_wallets, content_machine_runs" : step <= 15 ? "brand_sources, brand_brains, creative_briefs, creative_review_jobs" : step <= 25 ? "business_goals, campaigns, token_reservations, content_blueprint_items, content_atoms" : step <= 34 ? "creative_scorecards, qa_feedback, revision_requests, asset_versions" : step <= 39 ? "media_jobs, assets, provider_cost_records" : step <= 45 ? "calendar_items, approval_events" : "publishing_attempts, analytics_records";
    const token = step < 19 ? "No spend except optional ingestion estimate" : step <= 21 ? "quote/reservation" : step <= 34 ? "low-cost QA/revision spend" : step <= 37 ? "high-cost media spend only after approval" : "spend, release/refund, or analytics-only";
    return [
      `${step}. ${name}`,
      "Move the run one canonical state forward.",
      "Current run state plus required user or worker data.",
      "Validated state transition and persisted artifacts.",
      owner,
      worker,
      entitiesWritten,
      "Retry idempotently; block on missing required data; route provider failures to retry or human review.",
      token,
      "State, audit event, and user-visible status are updated without duplicating work.",
    ];
  });
  return table(["Step", "Purpose", "Input", "Output", "Owner", "Worker", "Entities written", "Failure / retry", "Token implications", "Acceptance"], rows);
}

function codeBlock(lang, value) {
  return `\`\`\`${lang}\n${value.trim()}\n\`\`\``;
}

function docHeader(title, description) {
  return `# ${title}\n\n${description}\n\nCanonical source: [00-source-of-truth.md](00-source-of-truth.md).\n\n`;
}

const generatedWarning = "<!-- Generated by scripts/generate-content-machine-docs.mjs. Edit generated docs directly only when intentionally changing the source of truth. -->";

function writeCoreDocs() {
  write("docs/oprealm-content-machine/README.md", `${generatedWarning}
# OPREALM Content Machine

This folder is the canonical engineering and product source of truth for the OPREALM business-facing content production overhaul.

The system turns business input into a repeatable marketing content machine:

${codeBlock("txt", `Business input
  -> Brand Brain
  -> Creative Brief
  -> Campaign Engine
  -> Content Blueprint
  -> Best-of-N Concepts
  -> Copy / Script / Storyboard
  -> Agency QA Gates
  -> Static Keyframes
  -> Pre-Video QA Approval
  -> Media Generation
  -> Post-Render QA
  -> Asset Library
  -> Content Calendar
  -> Business Approval
  -> Scheduled Publishing
  -> Analytics Feedback
  -> Better next batch`)}

## Start Here

${table(["Doc", "Purpose"], canonicalDocs.map(([file, title]) => [`[${title}](${file})`, file === "00-source-of-truth.md" ? "Rules future implementation tasks must obey." : `Canonical reference for ${title.toLowerCase()}.`]))}

## Supporting References

- [Diagrams](diagrams/master-flow.mmd)
- [JSON schemas](schemas/content-machine-run.schema.json)
- [Architecture decision records](adr/ADR-001-docs-as-source-of-truth.md)
- [Checklists](checklists/release-readiness-checklist.md)

## Non-Negotiable Rule

No high-cost video-generation job may run until the cheaper upstream strategy, copy, storyboard, visual, and static-keyframe stages pass Agency QA and the Pre-Video Gate, or receive a logged human override.
`);

  write("docs/oprealm-content-machine/00-source-of-truth.md", `${generatedWarning}
# OPREALM Content Machine Source Of Truth

This documentation is the canonical OPREALM Content Machine reference. Future Codex tasks must consult these docs before implementation.

## Authority

${mdList(principles)}

## Canonical Locations

${table(["Area", "Canonical file"], [
  ["Workflow states", "[25-state-machines.md](25-state-machines.md)"],
  ["Database entities and object ownership", "[22-data-models.md](22-data-models.md)"],
  ["API route definitions", "[23-api-surface.md](23-api-surface.md)"],
  ["Worker responsibilities", "[24-worker-architecture.md](24-worker-architecture.md)"],
  ["Implementation phasing", "[29-implementation-roadmap.md](29-implementation-roadmap.md)"],
  ["Roadmap PR sequencing", "[30-pr-breakdown.md](30-pr-breakdown.md)"],
  ["Terms", "[33-glossary.md](33-glossary.md)"],
  ["Agency QA", "[09-agency-quality-layer.md](09-agency-quality-layer.md)"],
  ["Pre-video approval", "[11-pre-video-qa-gates.md](11-pre-video-qa-gates.md)"],
])}

## Change Rules

- Update docs when implementation changes.
- Update schemas when object shape changes.
- Update diagrams when workflow changes.
- Add an ADR when a major architectural decision changes.
- Do not duplicate conflicting definitions across files.
- Keep Notion action-plan pages as execution summaries only.
`);

  write("docs/oprealm-content-machine/01-product-vision.md", `${generatedWarning}
${docHeader("Product Vision", "OPREALM is being rebuilt as a private/business-facing AI content production machine for repeatable marketing output.")}
## Audience

The first business audience is founders, agencies, creators, service businesses, and client/friend workspaces that need content volume without losing quality control.

## Inputs

${mdList(["Business name and website", "Product or service details", "Brand assets and product media", "Testimonials, FAQs, existing ads, source videos", "Target audience, offer, CTA, platforms, cadence, duration, token budget"])}

## Outputs

${mdList(["Brand Brain", "Creative Brief", "Campaign strategy", "UGC scripts and videos", "Product creative packs", "YouTube packages and thumbnails", "Shorts/Reels/TikToks", "Captions, hashtags, calendars, scheduled posts", "Approval queues", "Analytics records and next-batch recommendations"])}

## End State

OPREALM should feel like a business can enter its raw material once, approve the strategic direction, and receive a reusable content engine that learns from performance.
`);

  write("docs/oprealm-content-machine/02-ecosystem-overview.md", `${generatedWarning}
${docHeader("Ecosystem Overview", "This document defines the responsibilities of OPREALM and external reference layers.")}
## OPREALM Owns

${mdList(["User accounts, workspaces, friend/client access", "Token wallet, token packs, reservations, pricing, grants, refunds, and cost tracking", "Brand Brain, brand sources, campaign strategy, creative briefs, content runs, blueprints, atoms, approvals, assets, publishing mirror, analytics memory", "Provider abstraction and business rules for what to generate, why, when, who approves, and who pays"])}

## Generation Reference

Generative-Media-Skills is a recipe and workflow reference for UGC, product ads, social packs, YouTube thumbnails, image editing, image-to-video, audio, and upscaling. OPREALM exposes outcome tools such as "Create UGC Ad Pack" and "Repurpose Winning Content" instead of raw recipe names.

## Scheduling Reference

BrightBean-style scheduling is represented as a Scheduling Layer abstraction for OAuth, uploads, calendar drafts, scheduled publishing, retries, platform IDs, analytics pulls, and client review flows.

## Boundary Rule

OPREALM stores canonical business state and generated asset records even if a provider or scheduling layer stores a copy.
`);

  write("docs/oprealm-content-machine/03-master-workflow.md", `${generatedWarning}
${docHeader("Master Workflow", "This is the canonical end-to-end flow from first business input to analytics-improved future batches.")}
## Full Flow

${workflowTable()}

## Acceptance Summary

- Every transition writes a durable state or audit event.
- Expensive media jobs are blocked until Agency QA and Pre-Video Gate pass.
- Publishing is idempotent by calendar item, platform, social account, and scheduled time.
- Analytics updates campaign memory and informs future recommendations.
`);

  write("docs/oprealm-content-machine/04-user-input-to-brand-brain.md", `${generatedWarning}
${docHeader("User Input To Brand Brain", "The first form creates a draft ContentMachineRun and enough source material for Brand Brain ingestion.")}
## Required Fields

${mdList(firstInputFields.map((field) => `\`${field}\``))}

## Validation Steps

${mdList([
  "Confirm user is authenticated.",
  "Confirm workspace exists or create one.",
  "Confirm brand exists or create one.",
  "Confirm website URL format if provided.",
  "Confirm at least one business goal is selected.",
  "Confirm at least one platform or manual export mode is selected.",
  "Confirm at least one content pack is selected.",
  "Confirm token wallet exists.",
  "Confirm user has enough tokens or route to top-up.",
  "Confirm social accounts are connected where auto-publishing is requested.",
  "If no social accounts are connected, set `manualExportMode = true`.",
  "Save draft `ContentMachineRun`.",
])}

## Example

Business: Brisbane Solar Co. Goal: generate residential solar quote enquiries. Audience: homeowners in Brisbane and Gold Coast aged 30-60. Offer: free solar savings assessment. Platforms: YouTube, Shorts, Reels, TikTok, Facebook. Packs: UGC Ad Pack, YouTube Content Pack, Monthly Social Calendar.
`);

  write("docs/oprealm-content-machine/05-brand-brain.md", `${generatedWarning}
${docHeader("Brand Brain", "Brand Brain is the approved reusable business memory for generation, QA, campaign strategy, and analytics feedback.")}
## Inputs

${mdList(["Website URL", "Business notes", "Brand guide/logo", "Product images/videos", "Source videos", "Testimonials", "FAQs", "Pricing and offer details", "Social profile links", "Existing ads", "Competitor examples"])}

## Workflow

${mdList([
  "Create BrandSource records for each submitted source.",
  "Queue `brand-ingest-worker`.",
  "Fetch homepage and relevant internal pages.",
  "Strip navigation, footer, cookie banners, and duplicate boilerplate where practical.",
  "Extract raw source text and store it.",
  "Parse documents and transcribe audio/video where available.",
  "Extract category, products, offer, CTAs, audience, pain points, outcomes, proof points, objections, testimonials, FAQs, tone, colors, and visual style.",
  "Create retrieval chunks and an initial Brand Brain.",
  "Mark status `draft_ready`.",
  "User edits or approves.",
  "Mark status `approved_for_generation`.",
])}

## Required Object Shape

See [schemas/brand-brain.schema.json](schemas/brand-brain.schema.json).

## Failure Handling

Website failures retry with backoff. Parse failures are source-level errors. Transcription failures fall back to manual notes. Incomplete extraction marks the Brand Brain as \`needs_review\`.
`);

  write("docs/oprealm-content-machine/06-creative-brief.md", `${generatedWarning}
${docHeader("Creative Brief", "The Creative Brief translates Brand Brain and business goal into a campaign operating document.")}
## Purpose

Before generating campaign content, OPREALM creates a brief that every generation and QA agent can reference.

## Contents

${mdList(["Campaign objective", "Audience", "Offer", "Primary CTA", "Key message", "Proof points", "Emotional angle", "Content pillars", "Visual direction", "Tone of voice", "Platform notes", "Must include", "Must avoid"])}

## QA

The Creative Brief must pass Creative Brief QA before the Campaign Engine expands concepts, hooks, scripts, or media plans.

## Schema

See [schemas/creative-brief.schema.json](schemas/creative-brief.schema.json).
`);

  write("docs/oprealm-content-machine/07-campaign-engine.md", `${generatedWarning}
${docHeader("Campaign Engine", "The Campaign Engine turns an approved Brand Brain and Creative Brief into content strategy and campaign structure.")}
## Responsibilities

${mdList(["Interpret business objective.", "Create pillars, angles, hooks, platform plan, content mix, cadence, and campaign narrative.", "Generate Best-of-N concept directions before execution.", "Create token quote inputs.", "Send strategy through Agency QA before blueprint creation."])}

## Business Goal Objectives

${mdList(["lead_generation", "sales", "bookings", "brand_awareness", "youtube_growth", "retargeting", "community_growth", "product_launch", "ugc_testing"])}

## Acceptance

Campaign strategy is ready only when it has a clear offer, audience, CTA, platform plan, content mix, realistic cadence, and QA score high enough to continue.
`);

  write("docs/oprealm-content-machine/08-content-blueprint.md", `${generatedWarning}
${docHeader("Content Blueprint", "The Content Blueprint converts strategy into planned deliverables before generation work begins.")}
## Blueprint Item Contract

Each blueprint item describes a planned post, video, image creative, thumbnail, caption, script, or package component.

## Fields

${mdList(["workspaceId", "brandId", "campaignId", "runId", "platform", "format", "contentPack", "angle", "hook", "targetDurationSeconds", "aspectRatio", "requiredAssets", "status", "estimatedTokenCost"])}

## Output

Accepted blueprint items become Content Atoms. Content Atoms carry stage status, QA status, media job links, asset versions, calendar links, and analytics feedback.
`);

  write("docs/oprealm-content-machine/09-agency-quality-layer.md", `${generatedWarning}
${docHeader("Agency Quality Layer", "Agency QA makes OPREALM behave like a creative team, not a generic generator.")}
## Core Rule

Never move directly from script or prompt to expensive video generation.

Every video workflow must pass:

${mdList(["Strategy QA", "Copy/script QA", "Visual direction QA", "Storyboard or shot-list QA", "Static keyframe / thumbnail / preview image QA", "Platform-native QA", "Pre-video production approval"])}

## Mandatory Gates

${mdList(qaGates)}

## Scorecard Threshold

${codeBlock("txt", `Overall score >= 85/100
No blocker findings
No category below 7/10`)}

## Best-Of-N

Important campaigns generate 3-5 low-cost concepts first. QA scores each concept and expands only the winner or top recommendations into scripts, storyboards, keyframes, and media jobs.

## Human Override

Users may approve despite warnings, request another revision, regenerate with the same brief, regenerate with a new angle, lock a version, or approve for video/calendar/publishing. Overrides must be logged with reason, actor, timestamp, and affected entity.
`);

  write("docs/oprealm-content-machine/10-creative-review-agents.md", `${generatedWarning}
${docHeader("Creative Review Agents", "These agents are documented future modules for agency-level QA and revision planning.")}
${table(["Agent", "Responsibility"], reviewAgents)}

## Shared Output

Every agent contributes to a CreativeScorecard and may emit QAFeedback findings. The Revision Planner converts accepted findings into RevisionRequests.
`);

  write("docs/oprealm-content-machine/11-pre-video-qa-gates.md", `${generatedWarning}
${docHeader("Pre-Video QA Gates", "This file defines the hard gate before high-cost video generation.")}
## Required Sequence

${codeBlock("txt", `planned
  -> creative_brief_ready
  -> concepts_generated
  -> concepts_reviewed
  -> copy_generated
  -> copy_reviewed
  -> storyboard_generated
  -> storyboard_reviewed
  -> static_keyframes_generated
  -> static_keyframes_reviewed
  -> approved_for_video
  -> video_generation_queued
  -> video_generated
  -> post_render_reviewed
  -> asset_ready
  -> calendar_draft_created`)}

## Hard Rule

If \`mediaJob.assetType = video\`, require:

${mdList(["`contentAtom.videoGenerationStatus = approved_for_video`", "Latest static keyframe QA passes.", "Latest pre-video QA passes.", "Token reservation is valid.", "Platform specs and expected duration are valid.", "No unresolved blocker findings exist unless manually overridden with audit logging."])}

## Diagram

See [diagrams/pre-video-gate-flow.mmd](diagrams/pre-video-gate-flow.mmd).
`);

  write("docs/oprealm-content-machine/12-revision-engine.md", `${generatedWarning}
${docHeader("Revision Engine", "The Revision Engine turns QA findings into low-cost improvements before expensive generation.")}
## Loop

${codeBlock("txt", `Draft asset created
  -> Creative Review Job created
  -> QA agents score asset
  -> Findings generated
  -> Revision Planner creates patch instructions
  -> Generation engine applies fixes
  -> Revised asset/version created
  -> QA re-check runs
  -> Asset passes, loops again, or moves to human review`)}

## Default Max Loops

${table(["Stage", "Max loops"], [["copy/script", "3"], ["storyboard", "3"], ["static keyframes", "3"], ["thumbnail", "3"], ["post-render video", "2"]])}

If max loops are exceeded, set status \`needs_human_review\`.
`);

  write("docs/oprealm-content-machine/13-generation-workflows.md", `${generatedWarning}
${docHeader("Generation Workflows", "Generation workflows expose business outcomes, not provider recipe names.")}
## Outcome Tools

${mdList(["Create UGC Ad Pack", "Create Product Creative Pack", "Create YouTube Content Pack", "Create Monthly Social Calendar", "Create Thumbnail Pack", "Generate More Like This", "Repurpose Winning Content", "Schedule Approved Content"])}

## Video Workflow Contract

All video workflows must create strategy, concepts, copy/scripts, storyboards, visual direction, static keyframes, QA scorecards, and pre-video approval before media jobs are queued.

## UGC Ad Pack

Produces hooks, scripts, persona notes, shot lists, captions, static previews, video variants, calendar drafts, and QA scorecards.

## Product Creative Pack

Produces product hero images, carousel frames, product videos, ad variants, offer graphics, and platform-specific exports.

## YouTube Content Pack

Produces titles, selected title, script, chapters, thumbnail concepts, generated thumbnail, description, tags, pinned comment, Shorts cutdowns, and community teaser.
`);

  write("docs/oprealm-content-machine/14-media-generation-adapter.md", `${generatedWarning}
${docHeader("Media Generation Adapter", "The adapter isolates OPREALM business state from provider-specific APIs.")}
## Responsibilities

${mdList(["Normalize provider inputs and outputs.", "Apply child/business safety and claim constraints.", "Record provider job IDs and costs.", "Store generated assets in OPREALM asset records.", "Return deterministic failure categories for retries and refunds.", "Prevent video jobs unless Pre-Video Gate passes."])}

## Provider Rule

Do not expose provider keys to clients. Do not let provider-specific recipe names leak into the primary OPREALM UI.
`);

  write("docs/oprealm-content-machine/15-asset-library.md", `${generatedWarning}
${docHeader("Asset Library", "The Asset Library is OPREALM's private workspace record of source and generated assets.")}
## Asset Rules

${mdList(["Assets are private to the workspace by default.", "Each generated asset has version history.", "Assets reference source prompts, source inputs, provider job IDs, QA scores, token costs, and publishing usage.", "Calendar and publishing reference final approved asset versions, not mutable drafts."])}

## Versioning

${codeBlock("txt", `Content Atom v1
  -> QA feedback
  -> Revision v2
  -> QA pass
  -> Approved for video
  -> Video v1
  -> Post-render QA
  -> Calendar draft`)}
`);

  write("docs/oprealm-content-machine/16-token-billing.md", `${generatedWarning}
${docHeader("Token Billing", "Tokens are internal usage credits used to quote, reserve, spend, release, grant, and refund work.")}
## Token Rules

${mdList(["Cheap upstream work is allowed before video generation.", "Expensive video generation requires `approved_for_video`.", "Video tokens are quoted and reserved only after pre-video QA passes unless using a protected bundled reserve.", "Failed QA before video generation must not spend video-generation tokens.", "Revision loops consume low-cost generation/review tokens.", "Failed provider jobs refund or release unused reserves according to ledger rules.", "Provider costs are recorded for margin analysis."])}

## Ledger Types

purchase, admin_grant, reservation, reservation_release, spend, refund, adjustment.

## Stripe Token Top-Ups

${mdList(["Users buy server-defined active token packs through Stripe Checkout in one-time `payment` mode.", "`POST /api/billing/token-topup` accepts only `tokenPackId`; token amounts and prices always come from the server token pack.", "Checkout Sessions carry reconciliation metadata: userId, tokenPackId, tokens, and source.", "Wallets are credited only from verified Stripe webhooks, never from the checkout creation route.", "`POST /api/webhooks/stripe` verifies the raw request body with `STRIPE_WEBHOOK_SECRET` before parsing JSON.", "Successful `checkout.session.completed` events create `purchase` transactions, increase `balance` and `lifetimePurchased`, and do not change `reservedBalance`.", "Duplicate Stripe Event IDs and duplicate Checkout Session IDs must not double-credit wallets.", "Required server-only environment values are `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `APP_URL`; default token-pack currency is AUD unless changed in the database."])}

## Stripe Top-Up Diagrams

- [Checkout flow](diagrams/stripe-token-topup-flow.mmd)
- [Webhook crediting flow](diagrams/stripe-webhook-crediting-flow.mmd)
- [Token purchase state machine](diagrams/token-purchase-state-machine.mmd)
`);

  write("docs/oprealm-content-machine/17-calendar-and-approval.md", `${generatedWarning}
${docHeader("Calendar And Approval", "Calendar drafts are created after assets pass required QA and packaging.")}
## Approval States

draft, needs_changes, approved, scheduled, publishing, published, failed, cancelled, manual_export_ready.

## Business Approval

Approval is the business publishing gate. It is separate from moderation and Agency QA. ApprovalEvents capture actor, action, reason, previous state, next state, and affected asset versions.
`);

  write("docs/oprealm-content-machine/18-scheduling-and-publishing.md", `${generatedWarning}
${docHeader("Scheduling And Publishing", "Scheduling and publishing deliver approved calendar items without duplicate posts.")}
## Publishing Rule

Publishing attempts are idempotent by workspace, calendar item, platform, social account, approved asset version, and scheduled time.

## Scheduling Layer

The scheduling layer may be an external BrightBean-style service or native OPREALM module. OPREALM still stores approval state, final assets, publishing attempt records, platform post IDs, URLs, and analytics references.
`);

  write("docs/oprealm-content-machine/19-social-connectors.md", `${generatedWarning}
${docHeader("Social Connectors", "Social connectors are platform-specific integrations behind a common publishing contract.")}
## Platforms

YouTube, YouTube Shorts, Instagram, Facebook, TikTok, LinkedIn, and manual export mode.

## Connector Requirements

${mdList(["OAuth or manually configured export state.", "Media upload support.", "Caption/title/description/hashtag metadata.", "Platform constraint validation.", "Rate-limit and retry handling.", "Analytics pull support where available.", "Secure token storage and refresh handling."])}
`);

  write("docs/oprealm-content-machine/20-youtube-engine.md", `${generatedWarning}
${docHeader("YouTube Engine", "YouTube packages require deeper packaging than a short social post.")}
## Package Contents

${mdList(["Title options and selected title", "Thumbnail concepts and generated thumbnail", "Thumbnail QA score", "Script", "Description", "Tags", "Chapters", "Pinned comment", "End-screen notes", "Shorts cutdown plan", "Community post teaser", "First comment CTA"])}

## QA

Title and thumbnail must work together, the hook must be strong, sections must support retention, the thumbnail must be readable at small size, and unsupported claims must be avoided.
`);

  write("docs/oprealm-content-machine/21-analytics-feedback-loop.md", `${generatedWarning}
${docHeader("Analytics Feedback Loop", "Analytics turns published performance into better future content batches.")}
## Metrics

Views, watch time, retention, completion rate, clicks, CTR, saves, shares, comments, leads, bookings, purchases, platform-specific engagement, posting time, hook, angle, CTA, format, duration, and thumbnail.

## Feedback

Analytics updates campaign memory and Brand Brain insights, then powers Generate More Like This, Repurpose Winners, new hooks, revised cadence, and platform-specific recommendations.
`);

  write("docs/oprealm-content-machine/22-data-models.md", `${generatedWarning}
${docHeader("Data Models", "This is the canonical entity index. JSON schemas are the canonical object-shape anchors.")}
${table(["Entity", "Purpose"], entities)}

## Schema Directory

All object-shape changes must update [schemas/](schemas/content-machine-run.schema.json).
`);

  write("docs/oprealm-content-machine/23-api-surface.md", `${generatedWarning}
${docHeader("API Surface", "This is the canonical route map for future implementation.")}
${table(["Group", "Endpoint", "Purpose"], apiGroups)}

## Route Rules

All write routes must authenticate the user, authorize workspace access, validate body shape, write audit state where relevant, and be idempotent for queued work.
`);

  write("docs/oprealm-content-machine/24-worker-architecture.md", `${generatedWarning}
${docHeader("Worker Architecture", "Workers own asynchronous ingestion, generation, QA, packaging, publishing, analytics, and cost reconciliation.")}
${table(["Worker", "Responsibility"], workers)}

## Worker Rules

Workers must be idempotent, safe to retry, explicit about token spend/refund/release, and must write durable status for UI polling.
`);

  write("docs/oprealm-content-machine/25-state-machines.md", `${generatedWarning}
${docHeader("State Machines", "All canonical workflow states live here.")}
## Content Machine Run States

${codeBlock("txt", contentMachineStates.join("\n"))}

## Content Atom Video States

${codeBlock("txt", `planned
creative_brief_ready
concepts_generated
concepts_reviewed
copy_generated
copy_reviewed
storyboard_generated
storyboard_reviewed
static_keyframes_generated
static_keyframes_reviewed
approved_for_video
video_generation_queued
video_generated
post_render_reviewed
asset_ready
calendar_draft_created
needs_human_review
failed
cancelled`)}

## Creative Review Job States

queued, running, passed, passed_with_minor_notes, revise_and_recheck, blocked, needs_human_review, overridden, failed.

## Media Job States

queued, running, provider_pending, succeeded, failed_retryable, failed_terminal, cancelled, refunded.

## Token Reservation States

created, reserved, partially_spent, spent, released, refunded, failed.

## Token Purchase States

checkout_requested, checkout_created, payment_pending, checkout_completed, webhook_received, signature_verified, idempotency_checked, wallet_credited, transaction_recorded, processed, rejected_pack_missing, rejected_pack_inactive, rejected_invalid_signature, ignored_unsupported_event, failed_missing_metadata, ignored_duplicate.
`);

  write("docs/oprealm-content-machine/26-error-handling-and-retries.md", `${generatedWarning}
${docHeader("Error Handling And Retries", "Failures must be recoverable, visible, and financially correct.")}
## Categories

${mdList(["validation_error: user or request must change.", "missing_input: ask for required business/source data.", "qa_blocker: revision or human override required.", "provider_retryable: retry with backoff.", "provider_terminal: fail job and release/refund unused reserve.", "stripe_checkout_error: do not credit wallet; show checkout creation failure.", "stripe_invalid_signature: reject webhook and do not persist or credit.", "stripe_duplicate_event: return success without duplicate credit.", "stripe_duplicate_checkout_session: return success without duplicate credit.", "stripe_metadata_failure: record failed webhook and do not credit.", "rate_limited: retry after provider/window reset.", "publishing_duplicate_guard: do not post again; surface existing attempt.", "analytics_unavailable: retry later without blocking completed publishing."])}

## QA Failure

QA blocker findings set the relevant stage to \`revise_and_recheck\` or \`needs_human_review\`. Video jobs remain blocked until passing QA or manual override.
`);

  write("docs/oprealm-content-machine/27-admin-and-friend-access.md", `${generatedWarning}
${docHeader("Admin And Friend Access", "Admin and friend/client access support controlled private usage before broad release.")}
## Friend/Client Access

Friend invites grant scoped workspace access and may include token grants, role, expiration, usage limits, and approval permissions.

## Admin

Admin views must support user/workspace lookup, token grants, provider costs, gross margin, failed jobs, publishing attempts, manual adjustments, and audit logs.
`);

  write("docs/oprealm-content-machine/28-security-and-secrets.md", `${generatedWarning}
${docHeader("Security And Secrets", "Provider secrets, OAuth tokens, and business assets require strict server-side handling.")}
## Rules

${mdList(["Never expose provider API keys to clients.", "Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` server-only.", "Stripe webhooks do not require user auth, but must verify the raw body and Stripe-Signature header before parsing JSON.", "Checkout creation requires an authenticated user and accepts only server-defined active token packs.", "Users cannot self-credit tokens; wallet purchase credits come only from verified webhooks.", "Store OAuth tokens encrypted or in platform secret storage.", "Authorize every workspace-scoped read/write.", "Default assets to private workspace access.", "Separate approval, QA, and moderation concepts.", "Log manual overrides and admin grants.", "Avoid storing unnecessary raw secrets in analytics or logs."])}
`);

  write("docs/oprealm-content-machine/29-implementation-roadmap.md", `${generatedWarning}
${docHeader("Implementation Roadmap", "Build OPREALM Content Machine phase by phase.")}
${table(["Phase", "Name", "Goal"], [
  ["0", "Documentation Source of Truth", "Create canonical docs, schemas, diagrams, ADRs, checklists, AGENTS.md, and Notion action plan."],
  ["1", "Foundation", "Users, workspaces, friend invites, assets, token wallets."],
  ["2", "Stripe Token Top-Ups", "Checkout Sessions, verified webhooks, purchase ledger credits, and idempotency."],
  ["3", "Brand Foundation", "Brands, brand sources, source linking, and editable Brand Brain placeholder."],
  ["4", "Creative Brief + Campaign Engine", "Goals, briefs, angles, hooks, blueprints."],
  ["5", "Agency QA Layer", "Review agents, scorecards, revision loop, pre-video approval."],
  ["6", "Media Generation Adapter", "Selected provider adapters behind OPREALM job rules."],
  ["7", "UGC Ad Pack", "Scripts, storyboards, keyframes, videos, captions, drafts."],
  ["8", "Product Creative Pack", "Product media, carousel frames, ad variants."],
  ["9", "YouTube Content Pack", "Titles, scripts, thumbnails, Shorts, metadata."],
  ["10", "Calendar + Approval", "Drafts, approvals, bulk approvals, schedule states."],
  ["11", "Manual Export Mode", "Export packages before connector completion."],
  ["12", "Publishing Connectors", "YouTube, Instagram/Facebook, TikTok, LinkedIn."],
  ["13", "Analytics Feedback", "Pull metrics, score winners, generate more like this."],
  ["14", "Admin Revenue Dashboard", "Token revenue, provider costs, gross margin, grants."],
])}
`);

  write("docs/oprealm-content-machine/30-pr-breakdown.md", `${generatedWarning}
${docHeader("PR Breakdown", "Suggested implementation PR order for future Codex tasks.")}
${table(["PR", "Scope", "Depends on"], [
  ["1", "Docs source-of-truth and AGENTS.md", "none"],
  ["2", "Workspace/user/friend-invite foundation", "PR 1"],
  ["3", "Token wallet ledger and reservations", "PR 2"],
  ["4", "Stripe token top-ups", "PR 3"],
  ["5", "Asset library base and source uploads", "PR 2"],
  ["6", "Brand Brain source ingestion", "PR 5"],
  ["7", "Creative Brief and Campaign Engine", "PR 6"],
  ["8", "Content Machine Run orchestration", "PR 7"],
  ["9", "Agency QA schemas, workers, scorecards", "PR 8"],
  ["10", "Revision engine and low-cost generation loop", "PR 9"],
  ["11", "Pre-video gate enforcement", "PR 9"],
  ["12", "Media generation adapter", "PR 11"],
  ["13", "UGC Ad Pack", "PR 12"],
  ["14", "Product Creative Pack", "PR 12"],
  ["15", "YouTube Content Pack", "PR 12"],
  ["16", "Calendar and approval", "PR 13-15"],
  ["17", "Manual export", "PR 16"],
  ["18", "Publishing connector 1", "PR 16"],
  ["19", "Analytics feedback", "PR 18"],
  ["20", "Admin cost/revenue dashboard", "PR 3, PR 12, PR 19"],
])}
`);

  write("docs/oprealm-content-machine/31-acceptance-criteria.md", `${generatedWarning}
${docHeader("Acceptance Criteria", "These criteria define done for the OPREALM Content Machine build.")}
## System Criteria

${mdList(["OPREALM can create a Content Machine Run from required first input.", "Authenticated users can buy active token packs through Stripe Checkout.", "Stripe checkout creation never credits wallets directly.", "Verified Stripe checkout.session.completed webhooks credit purchase tokens exactly once.", "Duplicate Stripe Event IDs and duplicate Checkout Session IDs do not double-credit wallets.", "Invalid Stripe signatures and invalid metadata never credit wallets.", "Brand ingestion produces editable Brand Brain.", "Creative Brief and Campaign Strategy are generated and QA reviewed.", "Token quote and reservation happen before generation spend.", "Content Blueprint creates Content Atoms.", "A generated video job cannot start until creative QA passes.", "UGC script is reviewed before storyboarding.", "Storyboard is reviewed before keyframes.", "Static keyframe is reviewed before image-to-video generation.", "Creative review produces numeric scorecard and structured findings.", "Revision Planner can turn findings into change instructions.", "OPREALM can revise low-cost assets before video generation.", "Blocker findings block video generation.", "Manual override is available with audit logging.", "QA status appears in the Content Machine Run UI.", "Post-render QA runs before calendar draft approval.", "Pre-publish QA runs before scheduled publishing.", "Publishing retries cannot create duplicate posts.", "Analytics feeds next-batch recommendations."])}
`);

  write("docs/oprealm-content-machine/32-open-questions.md", `${generatedWarning}
${docHeader("Open Questions", "Unresolved decisions live here instead of scattered TBDs.")}
${table(["Question", "Why it matters", "Current leaning"], [
  ["Which scheduling layer first?", "Determines OAuth and calendar architecture.", "Start with manual export, then one connector."],
  ["Which first paid customer workflow?", "Narrows MVP surface.", "UGC Ad Pack plus Monthly Social Calendar."],
  ["Which provider stack for video?", "Controls cost and QA detail.", "Adapter interface first; provider choice per task."],
  ["How many friend/client roles?", "Affects permissions.", "owner, admin, editor, reviewer, viewer."],
  ["What is initial token pricing?", "Affects margins.", "Model with provider-cost records before public pricing."],
  ["Which Stripe payment methods are enabled?", "Delayed payment methods may need additional webhook events.", "Start with one-time Checkout payment mode and credit paid completed sessions."],
  ["Which analytics metrics are MVP?", "Avoids overbuilding.", "views, watch time, CTR, engagement, leads where available."],
])}
`);

  write("docs/oprealm-content-machine/33-glossary.md", `${generatedWarning}
${docHeader("Glossary", "Canonical terms for OPREALM Content Machine.")}
${table(["Term", "Meaning"], [
  ["Brand Brain", "Reusable approved business memory used by strategy, generation, QA, and analytics."],
  ["Content Machine Run", "End-to-end run from first input to analytics feedback."],
  ["Creative Brief", "Campaign operating document used by agents and generation modules."],
  ["Content Blueprint", "Plan of deliverables before generation."],
  ["Content Atom", "Individual creative unit such as script, post, video, thumbnail, or caption."],
  ["Agency QA", "Creative quality control layer, not moderation."],
  ["Pre-Video Gate", "Hard approval gate before expensive video media jobs."],
  ["Static Keyframe", "Low-cost preview frame used to catch visual problems before motion generation."],
  ["Token", "Internal usage credit, not a blockchain asset."],
  ["Reservation", "Protected hold against token wallet before provider spend."],
  ["Scheduling Layer", "Abstraction for calendar uploads, schedule, publish, retries, and platform IDs."],
  ["Manual Export Mode", "Downloadable package path when social accounts are not connected."],
])}
`);
}

const schemaBase = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: true,
};

function schema(title, required, properties) {
  return {
    ...schemaBase,
    title,
    required,
    properties,
  };
}

const str = { type: "string" };
const date = { type: "string", format: "date-time" };
const id = { type: "string", minLength: 1 };
const num = { type: "number" };
const bool = { type: "boolean" };
const arrStr = { type: "array", items: str, default: [] };
const obj = { type: "object", additionalProperties: true };

const schemas = {
  "workspace.schema.json": schema("Workspace", ["id", "name", "ownerUserId", "createdAt"], { id, name: str, ownerUserId: id, type: { enum: ["personal", "business", "friend", "client", "admin"] }, role: str, createdAt: date, updatedAt: date }),
  "workspace-member.schema.json": schema("WorkspaceMember", ["id", "workspaceId", "userId", "role", "createdAt"], { id, workspaceId: id, userId: id, role: { enum: ["owner", "admin", "member", "viewer", "client", "friend"] }, email: str, displayName: str, createdAt: date, updatedAt: date }),
  "user.schema.json": schema("User", ["id", "email", "createdAt"], { id, email: str, name: str, role: { enum: ["owner", "admin", "member", "reviewer"] }, createdAt: date, updatedAt: date }),
  "friend-invite.schema.json": schema("FriendInvite", ["id", "workspaceId", "email", "status", "createdAt"], { id, workspaceId: id, email: str, role: { enum: ["admin", "member", "viewer", "client", "friend"] }, tokenGrantAmount: num, status: { enum: ["pending", "accepted", "expired", "revoked"] }, invitedByUserId: id, acceptedByUserId: str, expiresAt: date, acceptedAt: date, revokedAt: date, createdAt: date, updatedAt: date }),
  "brand.schema.json": schema("Brand", ["id", "workspaceId", "name", "createdAt"], { id, workspaceId: id, name: str, websiteUrl: str, industry: str, createdAt: date, updatedAt: date }),
  "brand-source.schema.json": schema("BrandSource", ["id", "workspaceId", "brandId", "type", "status", "createdAt"], { id, workspaceId: id, brandId: id, type: { enum: ["website", "upload", "logo", "image", "video", "testimonial", "note", "existing_ad", "social_profile"] }, uri: str, rawText: str, assetId: str, status: { enum: ["queued", "fetched", "parsed", "failed", "ignored"] }, error: str, createdAt: date }),
  "brand-brain.schema.json": schema("BrandBrain", ["id", "workspaceId", "brandId", "status", "name", "productOrService", "offer", "primaryCTA", "targetAudience", "createdAt"], { id, workspaceId: id, brandId: id, status: { enum: ["draft_ready", "approved_for_generation", "needs_review", "archived"] }, name: str, industry: str, website: str, productOrService: str, offer: str, primaryCTA: str, targetAudience: str, painPoints: arrStr, objections: arrStr, desiredOutcomes: arrStr, proofPoints: arrStr, testimonials: arrStr, FAQs: arrStr, toneOfVoice: str, brandWords: arrStr, avoidWords: arrStr, visualIdentity: obj, sourceIds: arrStr, createdAt: date, updatedAt: date }),
  "creative-brief.schema.json": schema("CreativeBrief", ["id", "brandId", "campaignId", "campaignObjective", "audience", "offer", "primaryCTA"], { id, workspaceId: id, brandId: id, campaignId: id, campaignObjective: str, audience: str, offer: str, primaryCTA: str, keyMessage: str, proofPoints: arrStr, emotionalAngle: str, contentPillars: arrStr, visualDirection: str, toneOfVoice: str, platformNotes: obj, mustInclude: arrStr, mustAvoid: arrStr, status: { enum: ["draft", "qa_pending", "approved", "needs_revision"] }, createdAt: date, updatedAt: date }),
  "business-goal.schema.json": schema("BusinessGoal", ["id", "workspaceId", "brandId", "objective", "targetAudience", "offer", "primaryCTA"], { id, workspaceId: id, brandId: id, objective: { enum: ["lead_generation", "sales", "bookings", "brand_awareness", "youtube_growth", "retargeting", "community_growth", "product_launch", "ugc_testing"] }, targetAudience: str, offer: str, primaryCTA: str, platforms: arrStr, postingCadence: obj, contentMix: obj }),
  "campaign.schema.json": schema("Campaign", ["id", "workspaceId", "brandId", "status", "createdAt"], { id, workspaceId: id, brandId: id, creativeBriefId: str, businessGoalId: str, status: { enum: ["draft", "strategy_ready", "qa_pending", "qa_passed", "active", "completed", "archived"] }, pillars: arrStr, angles: arrStr, hooks: arrStr, platforms: arrStr, createdAt: date, updatedAt: date }),
  "content-machine-run.schema.json": schema("ContentMachineRun", ["id", "workspaceId", "brandId", "status", "createdAt"], { id, workspaceId: id, brandId: id, campaignId: str, status: { enum: contentMachineStates }, input: obj, tokenQuote: obj, tokenReservationId: str, manualExportMode: bool, createdAt: date, updatedAt: date }),
  "content-blueprint-item.schema.json": schema("ContentBlueprintItem", ["id", "workspaceId", "campaignId", "platform", "format", "status"], { id, workspaceId: id, brandId: id, campaignId: id, runId: str, platform: str, format: str, contentPack: str, angle: str, hook: str, targetDurationSeconds: num, aspectRatio: str, requiredAssets: arrStr, status: { enum: ["planned", "approved", "converted_to_atom", "cancelled"] }, estimatedTokenCost: num }),
  "content-atom.schema.json": schema("ContentAtom", ["id", "workspaceId", "campaignId", "type", "status"], { id, workspaceId: id, brandId: id, campaignId: id, blueprintItemId: str, type: str, platform: str, status: str, videoGenerationStatus: { enum: ["not_applicable", "planned", "approved_for_video", "video_generation_queued", "video_generated", "blocked", "overridden"] }, latestScorecardId: str, assetVersionIds: arrStr, createdAt: date, updatedAt: date }),
  "creative-review-job.schema.json": schema("CreativeReviewJob", ["id", "workspaceId", "stage", "status", "createdAt"], { id, workspaceId: id, brandId: str, campaignId: str, contentAtomId: str, mediaJobId: str, stage: { enum: ["brand_brain", "creative_brief", "campaign_strategy", "concept", "copy_script", "visual_direction", "storyboard", "static_keyframe", "platform_native", "pre_video", "post_render", "pre_publish", "campaign_coherence"] }, status: { enum: ["queued", "running", "passed", "passed_with_minor_notes", "revise_and_recheck", "blocked", "needs_human_review", "overridden", "failed"] }, force: bool, createdAt: date, completedAt: date }),
  "creative-scorecard.schema.json": schema("CreativeScorecard", ["id", "reviewJobId", "overallScore", "pass", "decision", "createdAt"], { id, reviewJobId: id, workspaceId: str, brandId: str, campaignId: str, contentAtomId: str, overallScore: num, pass: bool, requiredChanges: arrStr, recommendedChanges: arrStr, blockers: arrStr, scores: obj, decision: { enum: ["pass", "pass_with_minor_notes", "revise_and_recheck", "blocked", "approved_for_video", "approved_for_calendar", "approved_for_publish"] }, createdAt: date }),
  "qa-feedback.schema.json": schema("QAFeedback", ["id", "reviewJobId", "severity", "category", "finding", "suggestedFix", "createdAt"], { id, reviewJobId: id, severity: { enum: ["info", "minor", "major", "blocker"] }, category: str, finding: str, whyItMatters: str, suggestedFix: str, targetEntityType: str, targetEntityId: str, targetField: str, requiresRegeneration: bool, createdAt: date }),
  "revision-request.schema.json": schema("RevisionRequest", ["id", "workspaceId", "sourceReviewJobId", "status", "createdAt"], { id, workspaceId: id, contentAtomId: str, sourceReviewJobId: id, revisionNumber: num, changeInstructions: obj, beforeJson: obj, afterJson: obj, status: { enum: ["created", "queued", "applied", "qa_pending", "accepted", "needs_human_review", "failed"] }, createdAt: date }),
  "asset-version.schema.json": schema("AssetVersion", ["id", "assetId", "version", "createdAt"], { id, assetId: id, version: num, sourcePrompt: str, sourceAssetIds: arrStr, qaScorecardId: str, tokenCost: num, uri: str, createdAt: date }),
  "media-job.schema.json": schema("MediaJob", ["id", "workspaceId", "assetType", "status", "createdAt"], { id, workspaceId: id, brandId: str, campaignId: str, contentAtomId: str, assetType: { enum: ["image", "video", "audio", "caption", "thumbnail", "export"] }, provider: str, providerJobId: str, status: { enum: ["queued", "running", "provider_pending", "succeeded", "failed_retryable", "failed_terminal", "cancelled", "refunded"] }, tokenReservationId: str, costTokens: num, createdAt: date, completedAt: date }),
  "asset.schema.json": schema("Asset", ["id", "workspaceId", "assetType", "title", "storageUrl", "visibility", "createdAt"], { id, workspaceId: id, userId: id, brandId: str, campaignId: str, mediaJobId: str, assetType: { enum: ["image", "video", "audio", "document", "logo", "product_image", "source_video", "generated_image", "generated_video", "thumbnail", "export_package"] }, title: str, storageUrl: str, thumbnailUrl: str, visibility: { enum: ["private", "workspace", "public_link", "archived"] }, metadata: obj, archivedAt: date, createdAt: date, updatedAt: date }),
  "calendar-item.schema.json": schema("CalendarItem", ["id", "workspaceId", "platform", "status", "createdAt"], { id, workspaceId: id, campaignId: str, contentAtomId: str, platform: str, socialAccountId: str, assetVersionId: str, caption: str, hashtags: arrStr, scheduledAt: date, status: { enum: ["draft", "needs_changes", "approved", "scheduled", "publishing", "published", "failed", "cancelled", "manual_export_ready"] }, createdAt: date }),
  "approval-event.schema.json": schema("ApprovalEvent", ["id", "workspaceId", "calendarItemId", "action", "actorUserId", "createdAt"], { id, workspaceId: id, calendarItemId: id, action: { enum: ["approve", "reject", "request_changes", "bulk_approve", "override", "lock_version"] }, actorUserId: id, reason: str, previousStatus: str, nextStatus: str, createdAt: date }),
  "social-account.schema.json": schema("SocialAccount", ["id", "workspaceId", "platform", "status", "createdAt"], { id, workspaceId: id, platform: str, displayName: str, externalAccountId: str, status: { enum: ["connected", "expired", "revoked", "manual_export"] }, scopes: arrStr, createdAt: date, updatedAt: date }),
  "publishing-attempt.schema.json": schema("PublishingAttempt", ["id", "workspaceId", "calendarItemId", "idempotencyKey", "status", "createdAt"], { id, workspaceId: id, calendarItemId: id, socialAccountId: str, idempotencyKey: str, status: { enum: ["queued", "publishing", "published", "failed_retryable", "failed_terminal", "duplicate_guarded"] }, platformPostId: str, platformUrl: str, error: str, createdAt: date, completedAt: date }),
  "analytics-record.schema.json": schema("AnalyticsRecord", ["id", "workspaceId", "platform", "capturedAt"], { id, workspaceId: id, campaignId: str, contentAtomId: str, calendarItemId: str, platform: str, metrics: obj, hook: str, angle: str, cta: str, format: str, capturedAt: date }),
  "token-wallet.schema.json": schema("TokenWallet", ["id", "userId", "balance", "reservedBalance", "createdAt"], { id, userId: id, balance: num, reservedBalance: num, lifetimePurchased: num, lifetimeSpent: num, currency: { const: "OPREALM_TOKEN" }, createdAt: date, updatedAt: date }),
  "token-transaction.schema.json": schema("TokenTransaction", ["id", "userId", "walletId", "type", "amount", "createdAt"], { id, userId: id, walletId: id, type: { enum: ["purchase", "admin_grant", "reservation", "reservation_release", "spend", "refund", "adjustment"] }, amount: num, balanceAfter: num, reservedBalanceAfter: num, relatedReservationId: str, relatedMediaJobId: str, stripeCheckoutSessionId: str, stripePaymentIntentId: str, metadata: obj, createdAt: date }),
  "token-reservation.schema.json": schema("TokenReservation", ["id", "userId", "walletId", "status", "amountReserved", "createdAt"], { id, userId: id, walletId: id, status: { enum: ["created", "reserved", "partially_spent", "spent", "released", "refunded", "failed"] }, amountReserved: num, amountSpent: num, amountReleased: num, amountRefunded: num, reason: str, metadata: obj, createdAt: date, updatedAt: date, completedAt: date }),
  "token-pack.schema.json": schema("TokenPack", ["id", "name", "tokens", "priceCents", "currency"], { id, name: str, tokens: num, priceCents: num, currency: str, active: bool, metadata: obj, createdAt: date }),
  "stripe-webhook-event.schema.json": schema("StripeWebhookEvent", ["id", "stripeEventId", "eventType", "status", "payloadJson", "createdAt"], { id, stripeEventId: id, eventType: str, status: { enum: ["received", "processed", "ignored", "failed"] }, checkoutSessionId: str, paymentIntentId: str, userId: str, tokenPackId: str, tokens: num, payloadJson: str, errorMessage: str, processedAt: date, createdAt: date, updatedAt: date }),
  "provider-cost-record.schema.json": schema("ProviderCostRecord", ["id", "workspaceId", "provider", "costCents", "createdAt"], { id, workspaceId: id, mediaJobId: str, provider: str, model: str, operation: str, costCents: num, tokensCharged: num, marginCents: num, createdAt: date }),
};

function writeSchemas() {
  for (const [file, data] of Object.entries(schemas)) {
    write(`docs/oprealm-content-machine/schemas/${file}`, JSON.stringify(data, null, 2));
  }
}

function writeDiagrams() {
  const diagrams = {
    "master-flow.mmd": `flowchart LR
  A[Business input] --> B[Brand Brain]
  B --> C[Creative Brief]
  C --> D[Campaign Engine]
  D --> E[Content Blueprint]
  E --> F[Best-of-N Concepts]
  F --> G[Copy Script Storyboard]
  G --> H[Agency QA Gates]
  H --> I[Static Keyframes]
  I --> J[Pre-Video QA Approval]
  J --> K[Media Generation]
  K --> L[Post-Render QA]
  L --> M[Asset Library]
  M --> N[Content Calendar]
  N --> O[Business Approval]
  O --> P[Scheduled Publishing]
  P --> Q[Analytics Feedback]
  Q --> R[Better next batch]
  R --> D`,
    "ecosystem-map.mmd": `flowchart TD
  U[Users and Workspaces] --> O[OPREALM Orchestration]
  O --> BB[Brand Brain]
  O --> CE[Campaign Engine]
  O --> QA[Agency QA Layer]
  O --> TW[Token Wallet]
  O --> AL[Asset Library]
  O --> CAL[Calendar and Approval]
  CE --> BP[Content Blueprint]
  BP --> MG[Media Generation Adapter]
  MG --> GMS[Generative-Media-Skills Reference]
  CAL --> SL[Scheduling Layer Abstraction]
  SL --> SP[Social Platforms]
  SP --> AN[Analytics]
  AN --> BB`,
    "content-machine-state-machine.mmd": `stateDiagram-v2
  [*] --> draft
  draft --> input_collected
  input_collected --> brand_ingestion_started
  brand_ingestion_started --> brand_brain_ready
  brand_brain_ready --> brand_brain_qa_pending
  brand_brain_qa_pending --> brand_brain_qa_passed
  brand_brain_qa_passed --> creative_brief_ready
  creative_brief_ready --> creative_brief_qa_pending
  creative_brief_qa_pending --> creative_brief_qa_passed
  creative_brief_qa_passed --> campaign_strategy_ready
  campaign_strategy_ready --> campaign_strategy_qa_pending
  campaign_strategy_qa_pending --> campaign_strategy_qa_passed
  campaign_strategy_qa_passed --> token_quote_ready
  token_quote_ready --> awaiting_token_confirmation
  awaiting_token_confirmation --> tokens_reserved
  tokens_reserved --> content_blueprints_created
  content_blueprints_created --> concepts_generated
  concepts_generated --> concepts_reviewed
  concepts_reviewed --> copy_generated
  copy_generated --> copy_qa_pending
  copy_qa_pending --> copy_qa_passed
  copy_qa_passed --> storyboards_generated
  storyboards_generated --> storyboard_qa_pending
  storyboard_qa_pending --> storyboard_qa_passed
  storyboard_qa_passed --> static_keyframes_generated
  static_keyframes_generated --> static_keyframe_qa_pending
  static_keyframe_qa_pending --> static_keyframe_qa_passed
  static_keyframe_qa_passed --> approved_for_video_generation
  approved_for_video_generation --> media_jobs_queued
  media_jobs_queued --> media_generated
  media_generated --> post_render_qa_pending
  post_render_qa_pending --> post_render_qa_passed
  post_render_qa_passed --> calendar_drafts_created
  calendar_drafts_created --> awaiting_business_approval
  awaiting_business_approval --> approved
  approved --> scheduled
  scheduled --> publishing
  publishing --> published
  published --> analytics_pending
  analytics_pending --> analytics_collected
  analytics_collected --> campaign_memory_updated
  campaign_memory_updated --> completed
  completed --> [*]`,
    "token-flow.mmd": `flowchart TD
  A[Token wallet] --> B[Quote run]
  B --> C{Enough available?}
  C -- No --> D[Top up]
  C -- Yes --> E[Reserve tokens]
  E --> F[Low-cost QA and revisions]
  F --> G{Pre-video QA passed?}
  G -- No --> H[Release video reserve or continue low-cost revisions]
  G -- Yes --> I[Queue video job]
  I --> J{Provider result}
  J -- Success --> K[Capture tokens]
  J -- Retryable fail --> I
  J -- Terminal fail --> L[Refund or release unused reserve]`,
    "publishing-flow.mmd": `flowchart TD
  A[Calendar item approved] --> B[Scheduled time due]
  B --> C[Publishing worker]
  C --> D{Idempotency key exists?}
  D -- Yes --> E[Return existing attempt]
  D -- No --> F[Validate account assets metadata]
  F --> G{Valid?}
  G -- No --> H[Fail with actionable error]
  G -- Yes --> I[Publish to platform]
  I --> J[Store post ID URL attempt]
  J --> K[Analytics pending]`,
    "analytics-feedback-loop.mmd": `flowchart LR
  A[Published content] --> B[Analytics worker]
  B --> C[Normalize metrics]
  C --> D[Compare hook angle CTA platform time]
  D --> E[Update campaign memory]
  E --> F[Update Brand Brain insights]
  F --> G[Recommend next batch]
  G --> H[Generate More Like This]`,
    "brand-ingestion-flow.mmd": `flowchart TD
  A[First input and sources] --> B[Create BrandSource records]
  B --> C[Fetch website pages]
  C --> D[Parse uploads and transcripts]
  D --> E[Extract offer audience CTAs proof tone visuals]
  E --> F[Create Brand Brain draft]
  F --> G[Brand Brain QA]
  G --> H{Pass?}
  H -- Yes --> I[approved_for_generation]
  H -- No --> J[needs_review]`,
    "campaign-generation-flow.mmd": `flowchart TD
  A[Approved Brand Brain] --> B[Creative Brief]
  B --> C[Creative Brief QA]
  C --> D[Campaign strategy]
  D --> E[Strategy QA]
  E --> F[Content pillars angles hooks]
  F --> G[Content Blueprint]
  G --> H[Content Atoms]`,
    "agency-qa-flow.mmd": `flowchart TD
  A[Draft creative stage] --> B[Creative QA Worker]
  B --> C[Creative Director]
  B --> D[Brand Consistency]
  B --> E[Copy Chief]
  B --> F[Art Director]
  B --> G[Platform Native]
  C --> H[Scorecard]
  D --> H
  E --> H
  F --> H
  G --> H
  H --> I{Pass threshold?}
  I -- Yes --> J[Approve next stage]
  I -- No --> K[Structured findings]
  K --> L[Revision Planner]
  L --> M[Low-cost revision]
  M --> B`,
    "pre-video-gate-flow.mmd": `flowchart TD
  A[Content Atom ready for video] --> B{Script QA passed?}
  B -- No --> X[Block video job]
  B -- Yes --> C{Storyboard QA passed?}
  C -- No --> X
  C -- Yes --> D{Visual direction QA passed?}
  D -- No --> X
  D -- Yes --> E{Static keyframe QA passed?}
  E -- No --> X
  E -- Yes --> F{Token reservation valid?}
  F -- No --> Y[Requote tokens]
  F -- Yes --> G{Platform specs valid?}
  G -- No --> X
  G -- Yes --> H[Mark approved_for_video]
  H --> I[Queue video media job]`,
    "revision-loop-flow.mmd": `flowchart TD
  A[QA findings] --> B[Revision Planner]
  B --> C[Patch instructions]
  C --> D[Apply low-cost revision]
  D --> E[Create new asset version]
  E --> F[QA re-check]
  F --> G{Pass?}
  G -- Yes --> H[Advance]
  G -- No --> I{Max loops reached?}
  I -- No --> B
  I -- Yes --> J[Needs human review]`,
    "ugc-generation-flow.mmd": `flowchart TD
  A[UGC Ad Pack request] --> B[Persona and hook options]
  B --> C[Script drafts]
  C --> D[Copy QA]
  D --> E[Shot list storyboard]
  E --> F[Storyboard QA]
  F --> G[Static keyframes]
  G --> H[Pre-video gate]
  H --> I[UGC video job]
  I --> J[Post-render QA]
  J --> K[Calendar draft]`,
    "product-creative-generation-flow.mmd": `flowchart TD
  A[Product Creative Pack] --> B[Product proof and offer]
  B --> C[Creative concepts]
  C --> D[Hero frames and carousels]
  D --> E[Static QA]
  E --> F[Product video gate]
  F --> G[Media generation]
  G --> H[Ad variants]
  H --> I[Asset library]`,
    "youtube-generation-flow.mmd": `flowchart TD
  A[YouTube Content Pack] --> B[Title and thumbnail concepts]
  B --> C[Script and chapters]
  C --> D[YouTube QA]
  D --> E[Thumbnail generation]
  E --> F[Pre-video gate]
  F --> G[Long-form video package]
  G --> H[Shorts cutdowns]
  H --> I[Publishing metadata]`,
    "calendar-approval-flow.mmd": `flowchart TD
  A[Packaged assets] --> B[Calendar drafts]
  B --> C[Business review]
  C --> D{Decision}
  D -- Approve --> E[Scheduled]
  D -- Reject --> F[Archived]
  D -- Changes --> G[Revision request]
  D -- Override --> H[Approved with audit]
  E --> I[Publishing worker]`,
    "media-job-state-machine.mmd": `stateDiagram-v2
  [*] --> queued
  queued --> running
  running --> provider_pending
  provider_pending --> succeeded
  provider_pending --> failed_retryable
  failed_retryable --> queued
  provider_pending --> failed_terminal
  failed_terminal --> refunded
  queued --> cancelled
  succeeded --> [*]`,
    "creative-review-state-machine.mmd": `stateDiagram-v2
  [*] --> queued
  queued --> running
  running --> passed
  running --> passed_with_minor_notes
  running --> revise_and_recheck
  running --> blocked
  running --> failed
  revise_and_recheck --> queued
  blocked --> needs_human_review
  needs_human_review --> overridden
  passed --> [*]
  overridden --> [*]`,
    "token-transaction-state-machine.mmd": `stateDiagram-v2
  [*] --> created
  created --> reserved
  reserved --> partially_spent
  partially_spent --> spent
  reserved --> spent
  reserved --> released
  partially_spent --> released
  reserved --> refunded
  partially_spent --> refunded
  reserved --> failed
  spent --> refunded
  spent --> [*]
  released --> [*]
  refunded --> [*]
  failed --> [*]`,
    "stripe-token-topup-flow.mmd": `flowchart TD
  A[User selects token pack] --> B[POST /api/billing/token-topup]
  B --> C[Require authenticated user]
  C --> D[Load active token pack]
  D --> E{Pack active?}
  E -- No --> F[Reject request]
  E -- Yes --> G[Create Stripe Checkout Session]
  G --> H[Return checkoutUrl]
  H --> I[User pays in Stripe Checkout]
  I --> J[Stripe emits checkout.session.completed]
  J --> K[POST /api/webhooks/stripe]
  K --> L[Verify raw-body signature]
  L --> M[Idempotency checks]
  M --> N[Credit wallet exactly once]
  N --> O[Create purchase transaction]`,
    "stripe-webhook-crediting-flow.mmd": `flowchart TD
  A[Stripe webhook received] --> B[Read raw body]
  B --> C[Read Stripe-Signature header]
  C --> D{Signature valid?}
  D -- No --> E[Reject; no wallet credit]
  D -- Yes --> F[Parse Stripe event]
  F --> G{Event already processed?}
  G -- Yes --> H[Return 200; no duplicate credit]
  G -- No --> I{Event type checkout.session.completed?}
  I -- No --> J[Record ignored; return 200]
  I -- Yes --> K[Validate session metadata]
  K --> L{Metadata valid?}
  L -- No --> M[Record failed; no wallet credit]
  L -- Yes --> N{Checkout session already credited?}
  N -- Yes --> O[Mark processed; return 200]
  N -- No --> P[Credit wallet via token service]
  P --> Q[Create purchase transaction]
  Q --> R[Mark webhook processed]
  R --> S[Return 200]`,
    "token-purchase-state-machine.mmd": `stateDiagram-v2
  [*] --> checkout_requested
  checkout_requested --> checkout_created
  checkout_created --> payment_pending
  payment_pending --> checkout_completed
  checkout_completed --> webhook_received
  webhook_received --> signature_verified
  signature_verified --> idempotency_checked
  idempotency_checked --> wallet_credited
  wallet_credited --> transaction_recorded
  transaction_recorded --> processed
  processed --> [*]
  checkout_requested --> rejected_pack_missing
  checkout_requested --> rejected_pack_inactive
  webhook_received --> rejected_invalid_signature
  signature_verified --> ignored_unsupported_event
  signature_verified --> failed_missing_metadata
  idempotency_checked --> ignored_duplicate`,
  };

  for (const [file, content] of Object.entries(diagrams)) {
    write(`docs/oprealm-content-machine/diagrams/${file}`, content);
  }
}

function writeAdrs() {
  const adrs = [
    ["ADR-001-docs-as-source-of-truth.md", "Docs As Source Of Truth", "Use GitHub docs as the canonical source of truth before implementation.", "Prevents scattered assumptions and keeps Codex tasks aligned."],
    ["ADR-002-oprealm-as-orchestration-layer.md", "OPREALM As Orchestration Layer", "OPREALM owns business state, workflow decisions, billing, approval, and analytics memory.", "External providers can change without losing product control."],
    ["ADR-003-generative-media-skills-as-generation-reference.md", "Generative Media Skills As Generation Reference", "Use Generative-Media-Skills as a reference, not as primary UI language.", "Users buy business outcomes, not provider recipes."],
    ["ADR-004-brightbean-style-scheduling-layer.md", "BrightBean Style Scheduling Layer", "Represent scheduling/publishing behind an abstraction.", "Allows native or external scheduling implementation later."],
    ["ADR-005-tokenized-internal-credit-system.md", "Tokenized Internal Credit System", "Tokens are internal credits with wallet, ledger, reservation, spend, release, and refund.", "Protects provider spend and enables friend/client usage."],
    ["ADR-006-approval-as-business-publishing-gate.md", "Approval As Business Publishing Gate", "Business approval is distinct from moderation and creative QA.", "Keeps review concepts clean."],
    ["ADR-007-oprealm-owned-asset-records.md", "OPREALM Owned Asset Records", "OPREALM stores canonical asset records and versions.", "Provider copies are not the source of truth."],
    ["ADR-008-idempotent-publishing-worker.md", "Idempotent Publishing Worker", "Publishing worker uses idempotency keys to prevent duplicate posts.", "Retries must be safe."],
    ["ADR-009-agency-qa-before-video-generation.md", "Agency QA Before Video Generation", "No high-cost video generation before Agency QA and Pre-Video Gate pass or are overridden.", "Improves quality and protects token spend."],
    ["ADR-010-static-keyframes-before-motion.md", "Static Keyframes Before Motion", "Generate low-cost static preview frames before video.", "Catches visual defects before expensive generation."],
    ["ADR-011-revision-loop-before-token-expensive-work.md", "Revision Loop Before Token Expensive Work", "Use low-cost revision loops before high-cost media jobs.", "Raises quality without wasting video tokens."],
    ["ADR-012-notion-as-action-plan-not-source-of-truth.md", "Notion As Action Plan Not Source Of Truth", "Notion-ready docs track execution only.", "Prevents conflicting architecture between Notion and GitHub."],
  ];

  for (const [file, title, decision, consequence] of adrs) {
    write(`docs/oprealm-content-machine/adr/${file}`, `${generatedWarning}
# ${title}

## Status

Accepted.

## Context

OPREALM Content Machine needs repeatable implementation guidance for future Codex work.

## Decision

${decision}

## Consequences

${consequence}

Future implementation changes that conflict with this decision require a new ADR or an update to this ADR plus linked docs, schemas, and diagrams.
`);
  }
}

function writeChecklists() {
  const checklists = {
    "brand-ingestion-checklist.md": ["Sources stored", "Website fetched or failure logged", "Documents parsed", "Videos transcribed where available", "Offer extracted", "Audience extracted", "Proof points extracted", "Visual identity extracted", "Brand Brain QA complete"],
    "creative-brief-checklist.md": ["Objective clear", "Audience clear", "Offer and CTA clear", "Proof points attached", "Platform notes present", "Must include and avoid lists present", "Creative Brief QA complete"],
    "campaign-generation-checklist.md": ["Pillars generated", "Angles varied", "Hooks specific", "Cadence realistic", "Content mix maps to platforms", "Strategy QA passed"],
    "agency-qa-checklist.md": ["Review job created", "All relevant agents ran", "Scorecard created", "Findings structured", "Blockers identified", "Decision persisted", "Next stage approved or revision requested"],
    "pre-video-gate-checklist.md": ["Script QA passed", "Storyboard QA passed", "Visual direction QA passed", "Static keyframe QA passed", "Platform specs valid", "Token reservation valid", "No blockers", "approved_for_video set"],
    "ugc-pack-checklist.md": ["Persona chosen", "Hooks scored", "Script QA passed", "Shot list QA passed", "Keyframes approved", "UGC video generated", "Post-render QA passed", "Calendar draft created"],
    "youtube-pack-checklist.md": ["Title options", "Selected title", "Thumbnail concepts", "Script and chapters", "Description/tags", "Shorts cutdown plan", "Thumbnail QA", "Pre-video gate"],
    "product-creative-pack-checklist.md": ["Product source attached", "Offer visible", "Hero frame approved", "Carousel variants", "Video gate passed", "Exports packaged"],
    "scheduling-checklist.md": ["Calendar item approved", "Scheduled time valid", "Social account or manual export selected", "Metadata attached", "Asset version locked"],
    "publishing-checklist.md": ["Idempotency key generated", "Platform constraints valid", "Upload completed", "Post ID stored", "URL stored", "Attempt status persisted"],
    "billing-checklist.md": ["Wallet exists", "Quote generated", "Reservation created", "Low-cost spend recorded", "Video spend gated", "Provider cost recorded", "Refund/release handled"],
    "analytics-checklist.md": ["Published post mapped", "Metrics pulled", "Metrics normalized", "Hook/angle/CTA tagged", "Campaign memory updated", "Next-batch recommendation created"],
    "release-readiness-checklist.md": ["Source-of-truth docs current", "Schemas valid", "State machines updated", "ADR updated for major decisions", "No video bypasses QA", "Tests pass", "Manual export works", "Admin cost view works"],
  };

  for (const [file, items] of Object.entries(checklists)) {
    write(`docs/oprealm-content-machine/checklists/${file}`, `${generatedWarning}
# ${file.replace(".md", "").replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}

${items.map((item) => `- [ ] ${item}`).join("\n")}
`);
  }
}

function writeNotion() {
  const pages = {
    "OPREALM Action Plan - Notion Home.md": `# OPREALM Action Plan - Notion Home

> Source of truth rule:
> GitHub docs under \`docs/oprealm-content-machine/\` are canonical. This Notion action plan tracks execution only. If a technical decision changes, update GitHub docs first, then update this Notion action plan.

## Purpose

This is the execution dashboard for building OPREALM Content Machine. It tracks phases, priorities, tasks, risks, decisions, and launch readiness.

## Key Links

- GitHub source of truth: \`docs/oprealm-content-machine/README.md\`
- Roadmap: \`docs/oprealm-content-machine/29-implementation-roadmap.md\`
- PR breakdown: \`docs/oprealm-content-machine/30-pr-breakdown.md\`
- Acceptance criteria: \`docs/oprealm-content-machine/31-acceptance-criteria.md\`
`,
    "01 Build Phases.md": `# Build Phases

${table(["Phase", "Name", "Status", "Goal"], [
  ["0", "Documentation Source of Truth", "In Progress", "Create canonical docs, schemas, diagrams, ADRs, checklists."],
  ["1", "Foundation: Users, Workspaces, Friends, Assets, Tokens", "Not Started", "Core private workspace and token base."],
  ["2", "Brand Brain and Source Ingestion", "Not Started", "Website/source ingestion and editable Brand Brain."],
  ["3", "Creative Brief and Campaign Engine", "Not Started", "Goals, briefs, hooks, angles, blueprints."],
  ["4", "Agency QA Layer and Pre-Video Gates", "Not Started", "QA scorecards, revision loop, approved_for_video gate."],
  ["5", "Media Generation Adapter", "Not Started", "Provider adapters behind OPREALM rules."],
  ["6", "UGC Ad Pack", "Not Started", "UGC scripts, storyboards, keyframes, videos."],
  ["7", "Product Creative Pack", "Not Started", "Product ads, carousels, product videos."],
  ["8", "YouTube Content Pack", "Not Started", "Titles, thumbnails, scripts, Shorts."],
  ["9", "Calendar Drafts and Business Approval", "Not Started", "Drafts and approvals."],
  ["10", "Manual Export Mode", "Not Started", "Downloadable campaign packages."],
  ["11", "YouTube Publishing Connector", "Not Started", "First auto-publishing connector."],
  ["12", "Instagram/Facebook Publishing Connector", "Not Started", "Meta connector."],
  ["13", "TikTok and LinkedIn Connectors", "Not Started", "Additional connectors."],
  ["14", "Analytics Feedback Loop", "Not Started", "Performance memory and recommendations."],
  ["15", "Admin Revenue and Provider Cost Dashboard", "Not Started", "Margin, grants, and provider costs."],
  ["16", "Generate More Like This / Repurpose Winners", "Not Started", "Scale winners into next batches."],
])}`,
    "02 Roadmap Board Template.md": `# Roadmap Board Template

${table(["Card", "Phase", "Priority", "Status", "GitHub Source", "Notes"], [
  ["Token wallet foundation", "Phase 1", "P0", "Not Started", "docs/oprealm-content-machine/16-token-billing.md", ""],
  ["Brand Brain ingestion", "Phase 2", "P0", "Not Started", "docs/oprealm-content-machine/05-brand-brain.md", ""],
  ["Agency QA gate", "Phase 4", "P0", "Not Started", "docs/oprealm-content-machine/11-pre-video-qa-gates.md", ""],
])}`,
    "03 Sprint Plan.md": `# Sprint Plan

## Current Sprint Objective

Complete Phase 0 and prepare Phase 1 foundation implementation.

## P0

- [ ] Source-of-truth docs complete
- [ ] Schemas valid
- [ ] AGENTS.md updated
- [ ] Foundation implementation issue list created

## P1

- [ ] Token wallet implementation plan
- [ ] Workspace model implementation plan
`,
    "04 Task Database Template.md": `# Task Database Template

${table(["Field", "Type", "Description"], [
  ["Task", "Title", "Human-readable task name"],
  ["Phase", "Select", "Build phase"],
  ["Status", "Select", "Not Started, In Progress, Blocked, In Review, Done"],
  ["Priority", "Select", "P0, P1, P2, P3"],
  ["Owner", "Person/Text", "Responsible owner"],
  ["GitHub Docs Reference", "URL/Text", "Canonical doc path"],
  ["PR Number", "Text", "Related PR"],
  ["Dependencies", "Relation/Text", "Blocking tasks"],
  ["Acceptance Criteria", "Text", "Done definition"],
  ["Notes", "Text", "Implementation notes"],
])}`,
    "05 Current Priorities.md": `# Current Priorities

${[
  "Create GitHub source-of-truth docs.",
  "Create Notion action plan.",
  "Update AGENTS.md so future Codex tasks read the docs first.",
  "Implement token wallet foundation.",
  "Implement brand/workspace foundation.",
  "Implement Brand Brain ingestion.",
  "Implement Creative Brief and Campaign Engine.",
  "Implement Agency QA data models and workers before media generation.",
  "Implement low-cost concept/copy/storyboard/keyframe generation.",
  "Implement video generation only after pre-video QA gates are working.",
  "Implement asset library and versioning.",
  "Implement calendar drafts and approval.",
  "Implement manual export.",
  "Add social publishing connectors one at a time.",
  "Add analytics feedback and Generate More Like This.",
].map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
    "06 Agency QA Implementation Plan.md": `# Agency QA Implementation Plan

${[
  "Add CreativeReviewJob, CreativeScorecard, QAFeedback, RevisionRequest, and AssetVersion schemas.",
  "Add creative QA state machine docs.",
  "Add Agency QA ADR.",
  "Add pre-video gate rule to AGENTS.md.",
  "Build low-cost generation stages first: concepts, copy, storyboard, static keyframes.",
  "Build Creative Review Job creation.",
  "Build QA scorecard generation.",
  "Build Revision Planner.",
  "Build revision loop.",
  "Add token rules so video tokens are reserved only after approved_for_video.",
  "Add post-render QA.",
  "Add campaign coherence review.",
  "Add admin/human review fallback after max revision loops.",
].map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
    "07 GitHub Source of Truth Index.md": `# GitHub Source Of Truth Index

${table(["Area", "GitHub reference"], [
  ["Source rules", "docs/oprealm-content-machine/00-source-of-truth.md"],
  ["Workflow", "docs/oprealm-content-machine/03-master-workflow.md"],
  ["Agency QA", "docs/oprealm-content-machine/09-agency-quality-layer.md"],
  ["Pre-video gates", "docs/oprealm-content-machine/11-pre-video-qa-gates.md"],
  ["Data models", "docs/oprealm-content-machine/22-data-models.md"],
  ["API", "docs/oprealm-content-machine/23-api-surface.md"],
  ["Workers", "docs/oprealm-content-machine/24-worker-architecture.md"],
  ["States", "docs/oprealm-content-machine/25-state-machines.md"],
])}`,
    "08 Decision Log.md": `# Decision Log

${table(["Date", "Decision", "Context", "Options considered", "Final decision", "GitHub doc updated"], [["", "", "", "", "", ""]])}`,
    "09 Risk Register.md": `# Risk Register

${table(["Risk", "Severity", "Likelihood", "Mitigation", "GitHub reference"], [
  ["Video tokens wasted on weak concepts", "High", "High", "Require Agency QA and static keyframes before video generation", "docs/oprealm-content-machine/09-agency-quality-layer.md"],
  ["Notion becomes conflicting source of truth", "Medium", "Medium", "GitHub docs canonical; Notion action plan only", "docs/oprealm-content-machine/00-source-of-truth.md"],
  ["Publishing duplicates posts", "High", "Medium", "Idempotency key per calendar item/platform/account/time", "docs/oprealm-content-machine/18-scheduling-and-publishing.md"],
  ["Provider costs exceed token revenue", "High", "Medium", "Provider cost records and token margin dashboard", "docs/oprealm-content-machine/16-token-billing.md"],
  ["Generated campaigns feel inconsistent", "High", "High", "Campaign Coherence Agent and brand design system", "docs/oprealm-content-machine/09-agency-quality-layer.md"],
])}`,
    "10 Acceptance Checklist.md": `# Acceptance Checklist

${["GitHub source-of-truth docs complete", "Notion action plan complete", "AGENTS.md updated", "Token wallet working", "Brand Brain working", "Creative Brief working", "Campaign Engine working", "Agency QA gates working", "Pre-video approved_for_video gate enforced", "Media generation adapter working", "Asset library working", "Calendar drafts working", "Business approval working", "Manual export working", "First publishing connector working", "Analytics sync working", "Admin cost/revenue dashboard working"].map((item) => `- [ ] ${item}`).join("\n")}`,
    "11 Weekly Execution Plan.md": `# Weekly Execution Plan

## Week of: YYYY-MM-DD

**Main objective:**

**P0 tasks:**

- [ ]
- [ ]
- [ ]

**P1 tasks:**

- [ ]
- [ ]

## Blocked

${table(["Blocker", "Impact", "Owner", "Next step"], [["", "", "", ""]])}

## Decisions Needed

${table(["Decision", "Options", "Recommended", "Due"], [["", "", "", ""]])}`,
    "12 Backlog.md": `# Backlog

${table(["Task", "Phase", "Priority", "Status", "Canonical Reference"], [
  ["Create token wallet schema and migrations", "Phase 1", "P0", "Not Started", "docs/oprealm-content-machine/16-token-billing.md"],
  ["Create Brand Brain ingestion worker", "Phase 2", "P0", "Not Started", "docs/oprealm-content-machine/05-brand-brain.md"],
  ["Create Creative Review Job worker", "Phase 4", "P0", "Not Started", "docs/oprealm-content-machine/10-creative-review-agents.md"],
])}`,
    "13 Launch Readiness.md": `# Launch Readiness

${["Docs current", "Schemas valid", "AGENTS.md current", "No high-cost video bypass", "Token ledger reconciles", "Manual export works", "At least one connector works", "Analytics feedback visible", "Admin cost dashboard visible", "Security review complete"].map((item) => `- [ ] ${item}`).join("\n")}`,
  };

  for (const [file, content] of Object.entries(pages)) {
    write(`docs/notion/oprealm-action-plan/${file}`, content);
  }
}

function writeAgents() {
  write("AGENTS.md", `# OPRealm Repository Instructions

## OPREALM Content Machine source of truth

Before implementing OPREALM content-machine features, read:

- docs/oprealm-content-machine/00-source-of-truth.md
- docs/oprealm-content-machine/03-master-workflow.md
- docs/oprealm-content-machine/09-agency-quality-layer.md
- docs/oprealm-content-machine/11-pre-video-qa-gates.md
- docs/oprealm-content-machine/22-data-models.md
- docs/oprealm-content-machine/23-api-surface.md
- docs/oprealm-content-machine/24-worker-architecture.md
- docs/oprealm-content-machine/25-state-machines.md
- docs/oprealm-content-machine/29-implementation-roadmap.md

GitHub docs are canonical. Notion-ready docs under \`docs/notion/oprealm-action-plan/\` are execution planning documents only.

Do not introduce new workflow states, database entities, token rules, QA gates, worker behavior, publishing behavior, scheduling behavior, or analytics behavior without updating the source-of-truth docs, schemas, diagrams, and ADRs.

No high-cost video-generation workflow may be implemented without the documented Agency QA and Pre-Video Gate sequence.
`);
}

writeCoreDocs();
writeSchemas();
writeDiagrams();
writeAdrs();
writeChecklists();
writeNotion();
writeAgents();

console.log("Generated OPREALM Content Machine documentation source of truth.");
