# OPREALM Cloudflare Website

This is the first Cloudflare-ready version of the OPREALM website.

## What is included

- Parent-friendly homepage
- Safety-first messaging
- Approved OPREALM AI Coach mascot asset
- Course path cards for Roblox, Minecraft, Web Games, 2D Game Builder, AI Story Games and Game Safety
- Branch pages for Safety, Parents, AI Coach and course paths
- Cloudflare Pages configuration

## Preview locally

```powershell
npm.cmd run dev
```

If Wrangler asks you to log in:

```powershell
npx.cmd wrangler login
```

## Deploy to Cloudflare Pages

```powershell
npm.cmd run deploy
```

The deploy command publishes the `public` folder to a Cloudflare Pages project called `oprealm`.
