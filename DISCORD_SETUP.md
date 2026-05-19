# OPRealm Discord Safety + AI Tools Setup

This guide connects the OPRealm Discord app to the Cloudflare backend.

## Current Discord App Details

- Application ID: `1505815651103539280`
- Public Key: `e15d7e676d0683255da823a7f3cbfba595554d189838c624bbcc6de2be2c5f88`
- Server ID: `1505810853621006381`

## Correct Bot Invite URL

Use this invite URL after adding the bot user in the Discord Developer Portal:

```text
https://discord.com/oauth2/authorize?client_id=1505815651103539280&permissions=1119241710608&scope=bot+applications.commands
```

The permissions included are:

- Manage Roles
- Manage Channels
- View Channels
- Send Messages
- Manage Messages
- Read Message History
- Use Slash Commands
- Moderate Members
- Manage Nicknames
- Manage Threads

Keep the OPRealm bot role below Owner/Admin roles, but above the roles it needs to assign.

## Required Discord Roles

Create these roles in Discord:

- `Explorer Pass`: `1505824899216969759`
- `Creator Member`: `1505825182957310073`
- `Creator Pro`: `1505825280575537183`
- `Elite Creator`: `1505825330139627620`
- `Safety Academy Complete`: `1505899111843364974`
- `Moderator`: `1505840448634093619`
- `Junior Access`: `1505841730430173334`
- `Creator Crew Access`: `1505841531628683354`
- `Teen Studio Access`: `1505841615170703420`
- `Course Roblox`: `1505879617968275528`
- `Course Minecraft`: `1505879754895654912`
- `Course Web Games`: `1505879816212058152`
- `Course 2D Games`: `1505879876203446312`
- `Course AI Stories`: `1505879925436186716`
- `AI Basic Access`: `1505881668387606568`
- `AI Pro Access`: `1505881734674383028`
- `Parent`
- `OPRealm Bot`

The most important rule:

```text
Membership Role + Safety Completed Role = access
```

Payment alone should not unlock member spaces. Students must finish the Safety Academy first.

## Recommended Channel Structure

Only visible before safety completion:

- `#welcome`
- `#parent-info`
- `#safety-academy-start`
- `#how-to-unlock-access`
- `#support`

Unlocked after `Safety Completed`:

- `#announcements`
- `#creator-chat`
- `#showcase`
- `#monthly-challenges`
- `#build-feedback`

AI tool channels:

- `#ai-idea-lab`: `1505873142260695050`
- `#ai-image-lab`: `1505873430715695134`
- `#ai-sprite-lab`: `1505873536164696066`
- `#ai-sound-lab`: `1505873627030093945`
- `#ai-music-lab`: `1505873856517378068`
- `#ai-trailer-lab`: `1505874085517725736`

AI commands are intentionally restricted:

- `/idea` only works in `#ai-idea-lab`
- `/image` only works in `#ai-image-lab`
- `/sprite` only works in `#ai-sprite-lab`
- `/sound` only works in `#ai-sound-lab`
- `/music` only works in `#ai-music-lab`
- `/trailer` only works in `#ai-trailer-lab`

AI command responses should stay private first. Students can review generated ideas or assets privately, then share only appropriate finished work in approved showcase channels.

Staff channels:

- `#mod-alerts`
- `#safety-incidents-log`: `1505922895803846772`
- `#safety-cases`
- `#parent-support`
- `#appeals`
- `#urgent-review`

Elite-only:

- `#elite-cohort`
- `#elite-feedback`
- `#elite-launch-plan`

## Safety Rules To Enforce

Add these to Discord AutoMod and the OPRealm Safety Bot policy:

- No asking for DMs
- No friend requests
- No asking to add each other privately
- No sharing real names, school names, addresses, phone numbers, usernames, passwords, or social handles
- No free Robux scams
- No moving support outside OPRealm channels
- No bullying, harassment, hate, threats, or pile-ons
- All help, feedback, and sharing stays inside moderated OPRealm spaces

## Discord Developer Portal Setup

1. Open the OPRealm app in the Discord Developer Portal.
2. Go to **Bot** and create/reset the bot token.
3. Do not paste the token into chat.
4. Add the bot to your server using the invite URL above.
5. Go to **General Information** and confirm the public key matches this file.
6. Set the Interactions Endpoint URL after the next Cloudflare deployment:

```text
https://oprealm.pages.dev/api/discord
```

## Cloudflare Environment Variables

Public values already added to `wrangler.jsonc`:

- `DISCORD_APPLICATION_ID`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_GUILD_ID`
- `EXPLORER_ROLE_ID`
- `CREATOR_ROLE_ID`
- `CREATOR_PRO_ROLE_ID`
- `ELITE_ROLE_ID`
- `SAFETY_COMPLETED_ROLE_ID`
- `MODERATOR_ROLE_ID`
- `JUNIOR_ACCESS_ROLE_ID`
- `CREATOR_CREW_ACCESS_ROLE_ID`
- `TEEN_STUDIO_ACCESS_ROLE_ID`
- `COURSE_ROBLOX_ROLE_ID`
- `COURSE_MINECRAFT_ROLE_ID`
- `COURSE_WEB_GAMES_ROLE_ID`
- `COURSE_2D_GAMES_ROLE_ID`
- `COURSE_AI_STORIES_ROLE_ID`
- `AI_BASIC_ACCESS_ROLE_ID`
- `AI_PRO_ACCESS_ROLE_ID`
- `AI_IDEA_CHANNEL_ID`
- `AI_IMAGE_CHANNEL_ID`
- `AI_SPRITE_CHANNEL_ID`
- `AI_SOUND_CHANNEL_ID`
- `AI_MUSIC_CHANNEL_ID`
- `AI_TRAILER_CHANNEL_ID`
- `SAFETY_INCIDENTS_CHANNEL_ID`

Add these as Cloudflare secrets or environment variables:

- `DISCORD_BOT_TOKEN`
- `OPREALM_WEBHOOK_SECRET`

Optional later:

- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

`OPENAI_API_KEY` powers private-first AI image generation for `/image`. Generated image files are returned ephemerally to the student, then students can choose whether to share appropriate finished work in approved showcase channels.

## Database Setup

Cloudflare D1 database:

- Database name: `oprealm-discord`
- Database ID: `36bdaaf2-db1a-45c3-ae05-20edb77bea67`
- Binding name: `OPREALM_DB`

If recreating it later:

```powershell
npx.cmd wrangler d1 create oprealm-discord
```

Then add the returned database ID to `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "OPREALM_DB",
    "database_name": "oprealm-discord",
    "database_id": "36bdaaf2-db1a-45c3-ae05-20edb77bea67"
  }
]
```

Apply the schema:

```powershell
npx.cmd wrangler d1 migrations apply oprealm-discord
```

## Register Slash Commands

After adding the bot token and guild ID locally:

```powershell
$env:DISCORD_BOT_TOKEN="your-bot-token"
$env:DISCORD_GUILD_ID="your-server-id"
npm.cmd run discord:register
```

Commands included:

- `/credits`
- `/safety-status`
- `/report`
- `/safety-tip`
- `/help-safe`
- `/parent-help`
- `/mod-note`
- `/idea`
- `/image`
- `/sprite`
- `/sound`
- `/music`
- `/trailer`
- `/setup-help`

## Safety Completion Unlock Flow

When a student passes the Online Safety Academy, the LMS or site should call:

```text
POST https://oprealm.pages.dev/api/safety-complete
Authorization: Bearer YOUR_OPREALM_WEBHOOK_SECRET
Content-Type: application/json
```

Example body:

```json
{
  "discordUserId": "123456789012345678",
  "tier": "creator",
  "ageBand": "crew",
  "course": "roblox"
}
```

The backend will:

1. Add `Safety Completed`
2. Add the correct membership role
3. Add the correct age access role
4. Add the selected course role for Creator members, or all course roles for Pro and Elite
5. Add the correct AI access role
6. Assign a safe server nickname like `Creator-5678`
7. Store their tier and credits in D1

Accepted `ageBand` values:

- `junior`
- `crew`
- `teen`

Accepted `course` values:

- `roblox`
- `minecraft`
- `web_games`
- `two_d_games`
- `ai_stories`

## Important Discord Limitation

The bot can assign a safe server nickname, but Discord does not fully hide a user's underlying account username from other members if they open the profile.

The safety stack must therefore include:

- Safe aliases
- No friend-request/DM rules
- AutoMod filters
- Safety Bot blocking phrases like "DM me" and "add me"
- Safety Academy privacy setup checklist
- Moderated channels only
