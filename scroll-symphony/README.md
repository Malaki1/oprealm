# The Scroll Symphony

Interactive founder portfolio for Malaki Aiono.

Built as a cinematic, scroll-controlled Next.js experience with GSAP ScrollTrigger, Framer Motion, Lenis, Tailwind CSS, Cloudflare Pages Functions, and a polished AI Malaki interface.

## Local Setup

```bash
cd scroll-symphony
npm install
npm run dev
```

## Build

```bash
npm run build
```

The app uses `output: "export"` and builds to `out/`, so it is Cloudflare Pages-friendly. Pages Functions live in `functions/api/*` and run on the Cloudflare Workers runtime when deployed through Pages.

## Cloudflare Pages

Recommended Pages settings:

- Framework preset: Next.js or none/custom
- Build command: `npm run build`
- Build output directory: `out`
- Node version: latest supported LTS in Cloudflare Pages
- Deploy command for direct upload: `npm run deploy`

Required Cloudflare project settings:

- Add environment variables from `.env.example`
- Store secrets with Cloudflare Pages environment variables, not client code
- Configure Cloudflare Web Analytics in the dashboard and paste the beacon snippet in `app/layout.tsx` if required
- Add Turnstile site key and secret when enabling bot protection on forms
- Keep WAF and DDoS protection enabled at the zone level

## AI Malaki Integrations

The current frontend ships with a polished demo mode. It does not pretend to place a live call unless provider credentials and account-specific setup are present.

Environment variables:

- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
- `ELEVENLABS_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `N8N_WEBHOOK_LEAD_CAPTURE`
- `N8N_WEBHOOK_BOOKING`
- `N8N_WEBHOOK_CALLBACK`
- `N8N_WEBHOOK_FOLLOWUP`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_CLIENT_EMAIL`
- `GOOGLE_CALENDAR_PRIVATE_KEY`
- `CALENDLY_API_TOKEN`
- `CALENDLY_EVENT_TYPE_URI`
- `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`
- `POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

Pages Function endpoints:

- `POST /api/callback`
- `POST /api/lead-capture`
- `POST /api/booking`
- `POST /api/followup`
- `POST /api/elevenlabs-session`
- `POST /api/twilio-callback`

These endpoints forward to n8n webhooks when configured and return `demo-captured` when not configured.

## Notes

- Real provider secrets are never exposed client-side.
- The site respects `prefers-reduced-motion`.
- All meaningful visual mockups use labels or semantic surrounding text; decorative motion layers are hidden from assistive technology.
- No Vercel-specific runtime config is used.
