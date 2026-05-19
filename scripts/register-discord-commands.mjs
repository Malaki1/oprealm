const applicationId = process.env.DISCORD_APPLICATION_ID || "1505815651103539280";
const guildId = process.env.DISCORD_GUILD_ID;
const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN");
  process.exit(1);
}

if (!guildId) {
  console.error("Missing DISCORD_GUILD_ID. Register commands to your server first, then move global later if needed.");
  process.exit(1);
}

const commands = [
  {
    name: "credits",
    description: "Check your OPRealm Creator credit balance.",
  },
  {
    name: "safety-status",
    description: "Check whether you have completed the OPRealm Safety Academy.",
  },
  {
    name: "report",
    description: "Privately report bullying, unsafe behavior, scams, or DM requests.",
    options: [
      {
        type: 3,
        name: "type",
        description: "What are you reporting?",
        required: true,
        choices: [
          { name: "Bullying or mean behavior", value: "bullying" },
          { name: "DM or friend request", value: "dm_request" },
          { name: "Personal information request", value: "private_info" },
          { name: "Scam or free Robux", value: "scam" },
          { name: "Something else", value: "other" },
        ],
      },
      {
        type: 3,
        name: "details",
        description: "Briefly explain what happened. Do not include passwords or private details.",
        required: true,
      },
    ],
  },
  {
    name: "safety-tip",
    description: "Get a quick OPRealm safety reminder.",
    options: [
      {
        type: 3,
        name: "topic",
        description: "Choose a safety topic.",
        required: false,
        choices: [
          { name: "Private information", value: "private_info" },
          { name: "DMs and friend requests", value: "dms" },
          { name: "Scams and free Robux", value: "scams" },
          { name: "Kind communication", value: "kindness" },
          { name: "Safe AI use", value: "ai" },
          { name: "Online safety", value: "online_safety" },
        ],
      },
    ],
  },
  {
    name: "help-safe",
    description: "Learn what to do if something feels unsafe.",
  },
  {
    name: "parent-help",
    description: "Get parent support guidance for OPRealm safety or account issues.",
  },
  {
    name: "mod-note",
    description: "Moderator-only: log a follow-up action for a student safety case.",
    default_member_permissions: "1099511627776",
    options: [
      {
        type: 6,
        name: "user",
        description: "Student or member this note is about.",
        required: true,
      },
      {
        type: 3,
        name: "action",
        description: "What action was taken?",
        required: true,
        choices: [
          { name: "Note only", value: "note" },
          { name: "Warning", value: "warning" },
          { name: "Timeout", value: "timeout" },
          { name: "Parent review", value: "parent_review" },
          { name: "Resolved", value: "resolved" },
          { name: "Escalated", value: "escalated" },
        ],
      },
      {
        type: 3,
        name: "severity",
        description: "How serious is this note?",
        required: true,
        choices: [
          { name: "Info", value: "info" },
          { name: "Low", value: "low" },
          { name: "Medium", value: "medium" },
          { name: "High", value: "high" },
          { name: "Urgent", value: "urgent" },
        ],
      },
      {
        type: 3,
        name: "details",
        description: "Short moderation note.",
        required: true,
      },
    ],
  },
  {
    name: "idea",
    description: "Create a safe beginner-friendly game idea with the AI Coach.",
    options: [
      {
        type: 3,
        name: "prompt",
        description: "What kind of game do you want to make?",
        required: true,
      },
    ],
  },
  {
    name: "image",
    description: "Request a safe AI image for a game project.",
    options: [
      {
        type: 3,
        name: "prompt",
        description: "Describe the image you need.",
        required: true,
      },
    ],
  },
  {
    name: "sprite",
    description: "Request a safe sprite sheet concept.",
    options: [
      {
        type: 3,
        name: "prompt",
        description: "Describe the character or object.",
        required: true,
      },
    ],
  },
  {
    name: "sound",
    description: "Create a safe downloadable game sound effect.",
    options: [
      {
        type: 3,
        name: "prompt",
        description: "Describe the sound effect.",
        required: true,
      },
    ],
  },
  {
    name: "voice",
    description: "Create a safe AI narration clip for a story or game guide.",
    options: [
      {
        type: 3,
        name: "prompt",
        description: "Write the narration text.",
        required: true,
      },
    ],
  },
  {
    name: "music",
    description: "Create a safe downloadable instrumental game music loop.",
    options: [
      {
        type: 3,
        name: "prompt",
        description: "Describe the mood and scene.",
        required: true,
      },
    ],
  },
  {
    name: "trailer",
    description: "Create a safe game trailer storyboard and prompt pack.",
    options: [
      {
        type: 3,
        name: "prompt",
        description: "Describe the game and trailer style.",
        required: true,
      },
    ],
  },
  {
    name: "setup-help",
    description: "Admin check for OPRealm bot configuration.",
    default_member_permissions: "268435456",
  },
];

const url = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;
const response = await fetch(url, {
  method: "PUT",
  headers: {
    authorization: `Bot ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!response.ok) {
  console.error(`Discord command registration failed: ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const registered = await response.json();
console.log(`Registered ${registered.length} OPRealm Discord commands.`);
