const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
};

const MessageFlags = {
  EPHEMERAL: 1 << 6,
};

const ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  LINK: 5,
};

const TIER_CREDITS = {
  explorer: 10,
  creator: 150,
  pro: 400,
  elite: 1500,
};

const CREDIT_COSTS = {
  idea: 0.5,
  image: 4,
  image_pro: 20,
  game_cover: 20,
  sprite: 8,
  sound: 8,
  music: 15,
  trailer: 10,
  trailer_pro: 25,
  storyboard: 12,
  voice: 3,
};

const TEXT_MODEL = "gpt-5-mini";
const TEXT_MODEL_FALLBACKS = ["gpt-4.1-mini", "gpt-4o-mini"];
const TEXT_MODEL_INPUT_COST_PER_1M = 0.25;
const TEXT_MODEL_OUTPUT_COST_PER_1M = 2;

const ESTIMATED_OPENAI_COSTS_USD = {
  idea: 0.001,
  image: 0.034,
  image_pro: 0.211,
  game_cover: 0.211,
  sprite: 0.034,
  sound: 0.02,
  music: 0.08,
  trailer: 0.005,
  trailer_pro: 0.02,
  storyboard: 0.01,
  voice: 0.01,
};

const UNSAFE_PHRASES = [
  "dm me",
  "message me",
  "add me",
  "friend me",
  "what is your discord",
  "what's your discord",
  "phone number",
  "address",
  "school name",
  "password",
  "free robux",
  "private chat",
  "meet me",
];

export async function onRequestPost({ request, env, waitUntil }) {
  const verification = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);

  if (!verification.valid) {
    return new Response("Bad request signature", { status: 401 });
  }

  const interaction = JSON.parse(verification.body);

  if (interaction.type === InteractionType.PING) {
    return json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    return handleResultComponent(interaction, env, waitUntil);
  }

  if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
    return ephemeral("That interaction is not supported yet.");
  }

  const command = interaction.data?.name;

  try {
    if (command === "credits") {
      return handleCredits(interaction, env);
    }

    if (command === "safety-status") {
      return handleSafetyStatus(interaction, env);
    }

    if (command === "report") {
      return handleReport(interaction, env);
    }

    if (command === "safety-tip") {
      return handleSafetyTip(interaction);
    }

    if (command === "help-safe") {
      return handleHelpSafe();
    }

    if (command === "parent-help") {
      return handleParentHelp();
    }

    if (command === "mod-note") {
      return handleModNote(interaction, env);
    }

    if (command === "idea") {
      const channelCheck = requireChannel(interaction, env, "idea");
      if (channelCheck) return channelCheck;
      return handleTextAiTool(interaction, env, waitUntil, command);
    }

    if (command === "image" || command === "image-pro" || command === "game-cover" || command === "sprite") {
      const tool = command === "image-pro" ? "image_pro" : command === "game-cover" ? "game_cover" : command;
      const channelCheck = requireChannel(interaction, env, tool);
      if (channelCheck) return channelCheck;
      return handleImageTool(interaction, env, waitUntil, tool);
    }

    if (command === "sound" || command === "voice" || command === "music") {
      const channelCheck = requireChannel(interaction, env, command);
      if (channelCheck) return channelCheck;
      return handleElevenLabsAudioTool(interaction, env, waitUntil, command);
    }

    if (command === "trailer" || command === "trailer-pro" || command === "story-board") {
      const tool = command === "trailer-pro" ? "trailer_pro" : command === "story-board" ? "storyboard" : command;
      const channelCheck = requireChannel(interaction, env, tool);
      if (channelCheck) return channelCheck;
      return handleTextAiTool(interaction, env, waitUntil, tool);
    }

    if (command === "setup-help") {
      return handleSetupHelp(env);
    }

    return ephemeral("I do not know that OPRealm command yet.");
  } catch (error) {
    console.error(error);
    return ephemeral("Something went wrong while handling that command. A moderator can check the bot logs.");
  }
}

async function handleCredits(interaction, env) {
  const member = await getMemberRecord(interaction, env);
  const tier = member?.tier || inferTierFromRoles(interaction, env) || "explorer";
  const monthlyAllowance = TIER_CREDITS[tier] ?? 0;
  const credits = member?.credits_remaining ?? monthlyAllowance;

  return ephemeral(`Your OPRealm tier is **${formatTier(tier)}** and you currently have **${formatCredits(credits)} Creator credits** available.`);
}

async function handleSafetyStatus(interaction, env) {
  const hasSafetyRole = hasRole(interaction, env.SAFETY_COMPLETED_ROLE_ID);

  if (hasSafetyRole) {
    return ephemeral("Safety Academy complete. You can access OPRealm spaces included in your membership tier.");
  }

  return ephemeral("Safety Academy is not complete yet. Please finish the Online Safety Academy before using member channels or AI tools.");
}

async function handleReport(interaction, env) {
  const reportType = getOption(interaction, "type") || "other";
  const details = getOption(interaction, "details") || "No details provided.";
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";
  const severity = severityForReport(reportType);

  if (env.OPREALM_DB) {
    await env.OPREALM_DB.prepare(
      `
        INSERT INTO safety_events (discord_user_id, guild_id, event_type, detail, severity, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `,
    )
      .bind(discordUserId, guildId, `student_report:${reportType}`, details.slice(0, 1500), severity)
      .run();
  }

  await sendSafetyIncidentAlert(env, {
    discordUserId,
    guildId,
    channelId: interaction.channel_id,
    reportType,
    details,
    severity,
  });

  return ephemeral(
    [
      "Thank you for reporting this. OPRealm keeps safety reports private.",
      "",
      "A moderator can review the concern. If someone is asking you to DM, add them, share personal information, or move chats outside OPRealm, do not reply to them.",
      "",
      "If you feel worried or unsafe, tell a parent or trusted adult too.",
    ].join("\n"),
  );
}

async function sendSafetyIncidentAlert(env, report) {
  if (!env.DISCORD_BOT_TOKEN || !env.SAFETY_INCIDENTS_CHANNEL_ID) return;

  const content = [
    "**OPRealm Safety Report**",
    `Severity: **${report.severity}**`,
    `Type: **${formatReportType(report.reportType)}**`,
    `Student: <@${report.discordUserId}>`,
    `Source channel: <#${report.channelId}>`,
    "",
    `Details: ${report.details.slice(0, 1500)}`,
  ].join("\n");

  const response = await fetch(`https://discord.com/api/v10/channels/${env.SAFETY_INCIDENTS_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      content,
      allowed_mentions: { parse: [] },
    }),
  });

  if (!response.ok) {
    console.error(`Failed to send safety incident alert: ${response.status} ${await response.text()}`);
  }
}

function handleSafetyTip(interaction) {
  const topic = getOption(interaction, "topic") || "online_safety";
  const tips = {
    private_info: "Never share your real name, school, address, phone number, passwords, or social handles in OPRealm or any game.",
    dms: "Keep OPRealm conversations inside moderated channels. Do not ask for DMs, friend requests, or private chats.",
    scams: "Free Robux, free items, and password requests are common scams. Do not click, reply, or share account details.",
    kindness: "Be kind and specific with feedback. If a message feels mean, unsafe, or pressuring, report it instead of arguing.",
    ai: "Use AI to create safely. Do not ask AI for personal information, unsafe content, private chats, or ways around rules.",
    online_safety: "Pause before you post. Keep personal details private, stay in moderated channels, and ask a trusted adult if something feels wrong.",
  };

  return ephemeral(tips[topic] || tips.online_safety);
}

function handleHelpSafe() {
  return ephemeral(
    [
      "If something feels wrong, use these steps:",
      "",
      "1. Do not reply or move to DMs.",
      "2. Take a screenshot if you can.",
      "3. Use /report and describe what happened.",
      "4. Tell a parent, guardian, or OPRealm moderator.",
      "",
      "You will not be in trouble for asking for help.",
    ].join("\n"),
  );
}

function handleParentHelp() {
  return ephemeral(
    [
      "Parent help:",
      "",
      "For account, safety, billing, or Discord concerns, please contact OPRealm support through the parent support channel or your official parent account area.",
      "",
      "Students should not move support conversations into private DMs with other members.",
    ].join("\n"),
  );
}

async function handleModNote(interaction, env) {
  if (!hasRole(interaction, env.MODERATOR_ROLE_ID)) {
    return ephemeral("This command is only available to OPRealm moderators.");
  }

  const targetUserId = getOption(interaction, "user");
  const action = getOption(interaction, "action") || "note";
  const severity = getOption(interaction, "severity") || "info";
  const details = getOption(interaction, "details") || "No details provided.";
  const moderatorId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";

  if (env.OPREALM_DB) {
    await env.OPREALM_DB.prepare(
      `
        INSERT INTO safety_events (discord_user_id, guild_id, event_type, detail, severity, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `,
    )
      .bind(targetUserId, guildId, `mod_note:${action}`, `Moderator <@${moderatorId}>: ${details}`.slice(0, 1500), severity)
      .run();
  }

  await sendSafetyIncidentAlert(env, {
    discordUserId: targetUserId,
    guildId,
    channelId: interaction.channel_id,
    reportType: `mod_note:${action}`,
    details: `Moderator <@${moderatorId}> logged action **${action}**: ${details}`,
    severity,
  });

  return ephemeral(`Moderator note saved for <@${targetUserId}>.`);
}

async function handleTextAiTool(interaction, env, waitUntil, tool) {
  const blocked = requireSafety(interaction, env);
  if (blocked) return blocked;

  if (isPremiumAiTool(tool)) {
    const premiumBlocked = requirePremiumAiAccess(interaction, env);
    if (premiumBlocked) return premiumBlocked;
  }

  if (!env.OPENAI_API_KEY) {
    return ephemeral("The OPRealm AI tools are not connected yet. Ask an OPRealm admin to add the OpenAI API key.");
  }

  const prompt = getOption(interaction, "prompt") || defaultPromptForTextTool(tool);
  const safetyWarning = checkPromptSafety(prompt);
  if (safetyWarning) return safetyWarning;

  const creditCheck = await checkCredits(interaction, env, CREDIT_COSTS[tool]);
  if (creditCheck) return creditCheck;

  const generationTask = generatePrivateTextResult(interaction, env, prompt, tool);

  if (waitUntil) {
    waitUntil(generationTask);
  } else {
    generationTask.catch((error) => console.error(error));
  }

  return deferredEphemeral();
}

async function generatePrivateTextResult(interaction, env, prompt, tool) {
  const label = textToolLabel(tool);

  try {
    await editOriginalInteraction(interaction, env, [
      `Creating your private OPRealm ${label}...`,
      "",
      "I will keep it game-related, beginner-friendly, and safe to use inside OPRealm.",
    ].join("\n"));

    const result = await generateOpenAIText(env, prompt, tool);
    await deductCredits(interaction, env, CREDIT_COSTS[tool], tool, prompt, {
      provider: "openai",
      model: result.model || TEXT_MODEL,
      providerUnits: result.usage?.totalTokens || 0,
      estimatedCostUsd: estimateTextCostUsd(result.usage),
      metadata: {
        responseId: result.responseId,
        toolMode: textToolMode(tool),
        usage: result.usage,
      },
    });

    const recommendedCourse = tool === "idea" ? recommendedCourseForIdea(result.content, prompt) : null;
    const resultId = await saveAiResult(interaction, env, {
      tool,
      prompt,
      content: result.content,
    });

    const fullBriefBytes = textToBytes(result.content);
    const preview = truncateDiscordMessage(result.content, 1450);

    await editOriginalInteraction(
      interaction,
      env,
      [
        preview,
        "",
        "Full result attached below so it does not get cut off.",
        "This result is private to you. Share only appropriate finished work in approved OPRealm showcase channels.",
        `Credits used: **${formatCredits(CREDIT_COSTS[tool])}**`,
      ].join("\n"),
      fullBriefBytes,
      `oprealm-${tool}-brief.txt`,
      resultActionComponents(resultId, recommendedCourse),
      "text/plain",
    );
  } catch (error) {
    console.error(error);
    await editOriginalInteraction(interaction, env, [
      `I could not finish that ${label} request.`,
      "",
      "No credits were used. Try a simpler, safe game-related prompt.",
    ].join("\n"));
  }
}

async function handleImageTool(interaction, env, waitUntil, tool = "image") {
  const blocked = requireSafety(interaction, env);
  if (blocked) return blocked;

  if (isPremiumAiTool(tool)) {
    const premiumBlocked = requirePremiumAiAccess(interaction, env);
    if (premiumBlocked) return premiumBlocked;
  }

  if (!env.OPENAI_API_KEY) {
    return ephemeral("The OPRealm image generator is not connected yet. Ask an OPRealm admin to add the OpenAI API key.");
  }

  const prompt = getOption(interaction, "prompt") || "";
  const safetyWarning = checkPromptSafety(prompt);
  if (safetyWarning) return safetyWarning;

  const creditCheck = await checkCredits(interaction, env, CREDIT_COSTS[tool]);
  if (creditCheck) return creditCheck;

  const generationTask = generatePrivateImage(interaction, env, prompt, tool);

  if (waitUntil) {
    waitUntil(generationTask);
  } else {
    generationTask.catch((error) => console.error(error));
  }

  return deferredEphemeral();
}

async function handleElevenLabsAudioTool(interaction, env, waitUntil, tool) {
  const blocked = requireSafety(interaction, env);
  if (blocked) return blocked;

  if (!env.ELEVENLABS_API_KEY) {
    return ephemeral("The OPRealm audio generator is not connected yet. Ask an OPRealm admin to add the ElevenLabs API key.");
  }

  const prompt = getOption(interaction, "prompt") || defaultPromptForAudioTool(tool);
  const safetyWarning = checkPromptSafety(prompt);
  if (safetyWarning) return safetyWarning;

  const creditCheck = await checkCredits(interaction, env, CREDIT_COSTS[tool]);
  if (creditCheck) return creditCheck;

  const generationTask = generatePrivateElevenLabsAudio(interaction, env, prompt, tool);

  if (waitUntil) {
    waitUntil(generationTask);
  } else {
    generationTask.catch((error) => console.error(error));
  }

  return deferredEphemeral();
}

async function generatePrivateImage(interaction, env, prompt, tool = "image") {
  const toolLabel = tool === "sprite" ? "sprite sheet" : tool === "game_cover" ? "game cover" : tool === "image_pro" ? "premium image" : "image";
  const filename = tool === "sprite" ? "oprealm-sprite-sheet.png" : tool === "game_cover" ? "oprealm-game-cover.png" : tool === "image_pro" ? "oprealm-premium-image.png" : "oprealm-image.png";

  try {
    await editOriginalInteraction(interaction, env, [
      `Creating your OPRealm ${toolLabel} privately...`,
      "",
      "This can take a little while. Keep this result private until you choose to share finished work in an approved showcase channel.",
    ].join("\n"));

    const image = await generateOpenAIImage(env, prompt, tool);
    await deductCredits(interaction, env, CREDIT_COSTS[tool], tool, prompt, {
      provider: "openai",
      model: image.model,
      quality: image.quality,
      providerUnits: image.usage?.total_tokens || image.usage?.totalTokens || 1,
      estimatedCostUsd: image.estimatedCostUsd,
      metadata: {
        fallbackUsed: image.fallbackUsed,
        usage: image.usage || null,
      },
    });
    const resultId = crypto.randomUUID();

    const message = await editOriginalInteraction(
      interaction,
      env,
      [
        `Your private OPRealm ${toolLabel} is ready.`,
        "",
        "Review it first. Only share appropriate finished work in approved showcase channels.",
        "",
        `Credits used: **${formatCredits(CREDIT_COSTS[tool])}**`,
      ].join("\n"),
      image.bytes,
      filename,
      resultActionComponents(resultId),
    );

    const attachment = message?.attachments?.[0];
    await saveAiResult(interaction, env, {
      id: resultId,
      tool,
      prompt,
      content: [
        `Your private OPRealm ${toolLabel} is ready.`,
        "",
        "Review it first. Only share appropriate finished work in approved showcase channels.",
      ].join("\n"),
      attachmentUrl: attachment?.url || null,
      attachmentFilename: attachment?.filename || filename,
    });

    if (tool === "sound") {
      await savePrivateSfxAsset(interaction, env, {
        id: resultId,
        prompt,
        attachmentUrl: attachment?.url || null,
      }, audio);
    }
  } catch (error) {
    console.error(error);
    await editOriginalInteraction(interaction, env, [
      `I could not finish that ${toolLabel} request.`,
      "",
      `No credits were used if generation failed before the ${toolLabel} was created. Try a simpler, safe game-related prompt.`,
    ].join("\n"));
  }
}

async function generatePrivateElevenLabsAudio(interaction, env, prompt, tool) {
  const label = tool === "voice" ? "voice narration" : tool === "music" ? "music loop" : "sound effect";
  const filename = tool === "voice" ? "oprealm-voice.mp3" : tool === "music" ? "oprealm-music-loop.mp3" : "oprealm-sound-effect.mp3";

  try {
    await editOriginalInteraction(interaction, env, [
      `Creating your private OPRealm ${label}...`,
      "",
      "This may take a moment. Keep generated audio appropriate and use it only for game projects.",
    ].join("\n"));

    const audio = tool === "voice"
      ? await generateElevenLabsVoice(env, prompt)
      : tool === "music"
        ? await generateElevenLabsMusic(env, prompt)
        : await generateElevenLabsSound(env, prompt);

    await deductCredits(interaction, env, CREDIT_COSTS[tool], tool, prompt, {
      provider: "elevenlabs",
      model: audio.model,
      providerUnits: audio.characterCost,
      estimatedCostUsd: estimatedCostForUsage(tool),
      metadata: {
        outputFormat: audio.outputFormat,
        characterCost: audio.characterCost,
        mode: tool === "voice" ? "text_to_speech" : tool === "music" ? "music_generation" : "sound_generation",
      },
    });

    const resultId = crypto.randomUUID();
    const message = await editOriginalInteraction(
      interaction,
      env,
      [
        `Your private OPRealm ${label} is ready.`,
        "",
        tool === "voice"
          ? "Disclosure: this voice clip is AI-generated, not a human recording."
          : tool === "music"
            ? "Review it first. Only use original, appropriate music in approved OPRealm projects."
            : "Review it first. Only share appropriate finished work in approved showcase channels.",
        "",
        `Credits used: **${formatCredits(CREDIT_COSTS[tool])}**`,
      ].join("\n"),
      audio.bytes,
      filename,
      resultActionComponents(resultId, null, tool),
      "audio/mpeg",
    );

    const attachment = message?.attachments?.[0];
    await saveAiResult(interaction, env, {
      id: resultId,
      tool,
      prompt,
      content: [
        `Your private OPRealm ${label} is ready.`,
        tool === "voice" ? "This voice clip is AI-generated." : "Generated for an OPRealm game project.",
      ].join("\n"),
      attachmentUrl: attachment?.url || null,
      attachmentFilename: attachment?.filename || filename,
    });

    if (tool === "sound") {
      await savePrivateSfxAsset(interaction, env, {
        id: resultId,
        prompt,
        attachmentUrl: attachment?.url || null,
      }, audio);
    }

    if (tool === "music") {
      await savePrivateMusicAsset(interaction, env, {
        id: resultId,
        prompt,
        attachmentUrl: attachment?.url || null,
      }, audio);
    }
  } catch (error) {
    console.error(error);
    await editOriginalInteraction(interaction, env, [
      `I could not finish that ${label} request.`,
      "",
      "No credits were used if generation failed before the audio was created. Try a simpler, safe game-related prompt.",
    ].join("\n"));
  }
}

async function handleResultComponent(interaction, env, waitUntil) {
  const customId = interaction.data?.custom_id || "";
  const match = customId.match(/^oprealm_result:(dm|share|retry|submit_sfx|submit_music):([a-zA-Z0-9-]+)$/);

  if (!match) {
    return ephemeral("That OPRealm button is not supported yet.");
  }

  const [, action, resultId] = match;
  const task = handleResultAction(interaction, env, action, resultId);

  if (waitUntil) {
    waitUntil(task);
  } else {
    task.catch((error) => console.error(error));
  }

  return deferredEphemeral();
}

async function handleResultAction(interaction, env, action, resultId) {
  try {
    const blocked = requireSafety(interaction, env);
    if (blocked) {
      await editOriginalInteraction(interaction, env, "Please complete the Online Safety Academy before using OPRealm result actions.");
      return;
    }

    const result = await getAiResult(interaction, env, resultId);

    if (!result) {
      await editOriginalInteraction(interaction, env, "I could not find that saved result. Try generating it again.");
      return;
    }

    if (!isResultOwner(interaction, result)) {
      await editOriginalInteraction(interaction, env, "That result belongs to another OPRealm creator, so I cannot share or resend it for you.");
      return;
    }

    if (action === "dm") {
      await sendResultToDm(interaction, env, result);
      await editOriginalInteraction(interaction, env, "Sent to your private OPRealm bot inbox. Keep personal chats with other students inside moderated channels.");
      return;
    }

    if (action === "share") {
      const channelId = showcaseChannelForMember(interaction, env);

      if (!channelId) {
        await editOriginalInteraction(interaction, env, "The showcase channel for your age band is not connected yet. Ask an OPRealm admin to add the showcase channel ID.");
        return;
      }

      await shareResultToShowcase(interaction, env, result, channelId);
      await editOriginalInteraction(interaction, env, `Shared to <#${channelId}> for moderator-safe community viewing.`);
      return;
    }

    if (action === "submit_sfx") {
      if (result.tool !== "sound") {
        await editOriginalInteraction(interaction, env, "Only generated sound effects can be submitted to the shared SFX Library.");
        return;
      }

      await submitSfxForReview(interaction, env, result);
      await editOriginalInteraction(interaction, env, "Submitted to the OPRealm SFX Library review queue. A moderator will review it before it appears in the shared library.");
      return;
    }

    if (action === "submit_music") {
      if (result.tool !== "music") {
        await editOriginalInteraction(interaction, env, "Only generated music can be submitted to the shared Music Library.");
        return;
      }

      await submitMusicForReview(interaction, env, result);
      await editOriginalInteraction(interaction, env, "Submitted to the OPRealm Music Library review queue. A moderator will review it before it appears in the shared library.");
      return;
    }

    if (action === "retry") {
      await retryAiResult(interaction, env, result);
      return;
    }
  } catch (error) {
    console.error(error);
    await editOriginalInteraction(interaction, env, "I could not complete that result action. Please try again or ask an OPRealm moderator.");
  }
}

async function retryAiResult(interaction, env, result) {
  const tool = result.tool;
  const prompt = `${result.prompt}\n\nCreate a fresh variation with different details, while keeping it safe and beginner-friendly.`;

  if (tool === "image" || tool === "sprite") {
    const creditCheck = await checkCredits(interaction, env, CREDIT_COSTS[tool]);
    if (creditCheck) {
      await editOriginalInteraction(interaction, env, `You need **${formatCredits(CREDIT_COSTS[tool])} Creator credits** to create another variation.`);
      return;
    }

    await generatePrivateImage(interaction, env, prompt, tool);
    return;
  }

  if (tool === "sound" || tool === "voice" || tool === "music") {
    const creditCheck = await checkCredits(interaction, env, CREDIT_COSTS[tool]);
    if (creditCheck) {
      await editOriginalInteraction(interaction, env, `You need **${formatCredits(CREDIT_COSTS[tool])} Creator credits** to create another variation.`);
      return;
    }

    await generatePrivateElevenLabsAudio(interaction, env, prompt, tool);
    return;
  }

  const creditCheck = await checkCredits(interaction, env, CREDIT_COSTS[tool]);
  if (creditCheck) {
    await editOriginalInteraction(interaction, env, `You need **${formatCredits(CREDIT_COSTS[tool])} Creator credits** to create another variation.`);
    return;
  }

  await generatePrivateTextResult(interaction, env, prompt, tool);
}

async function generateOpenAIImage(env, prompt, tool = "image") {
  const promptText = buildSafeImagePrompt(prompt, tool);
  let lastError = null;

  for (const spec of imageGenerationSpecsForTool(tool)) {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: spec.model,
        prompt: promptText,
        size: "1024x1024",
        quality: spec.quality,
        n: 1,
        output_format: "png",
        moderation: "auto",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      lastError = new Error(`OpenAI image generation failed for ${spec.model}/${spec.quality}: ${response.status} ${JSON.stringify(data).slice(0, 500)}`);

      if (spec.allowFallback && [400, 403, 404].includes(response.status)) {
        console.warn(lastError.message);
        continue;
      }

      throw lastError;
    }

    const base64 = data.data?.[0]?.b64_json;

    if (!base64) {
      lastError = new Error(`OpenAI image response did not include image data for ${spec.model}/${spec.quality}`);
      if (spec.allowFallback) continue;
      throw lastError;
    }

    return {
      bytes: base64ToBytes(base64),
      model: spec.model,
      quality: spec.quality,
      estimatedCostUsd: spec.estimatedCostUsd,
      fallbackUsed: spec.fallback,
      usage: data.usage || null,
    };
  }

  throw lastError || new Error("OpenAI image generation failed");
}

async function generateElevenLabsSound(env, prompt) {
  const outputFormat = "mp3_44100_128";
  const response = await fetch(`https://api.elevenlabs.io/v1/sound-generation?output_format=${outputFormat}`, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: buildSafeSoundPrompt(prompt),
      model_id: "eleven_text_to_sound_v2",
      duration_seconds: 2.5,
      prompt_influence: 0.35,
      loop: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs sound generation failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    model: "eleven_text_to_sound_v2",
    outputFormat,
    durationSeconds: 2.5,
    characterCost: Number(response.headers.get("character-cost") || prompt.length || 0),
  };
}

async function generateElevenLabsMusic(env, prompt) {
  const outputFormat = "mp3_44100_128";
  const response = await fetch(`https://api.elevenlabs.io/v1/music?output_format=${outputFormat}`, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prompt: buildSafeMusicPrompt(prompt),
      music_length_ms: 10000,
      model_id: "music_v1",
      force_instrumental: true,
      sign_with_c2pa: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs music generation failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    model: "music_v1",
    outputFormat,
    durationSeconds: 10,
    characterCost: Number(response.headers.get("character-cost") || prompt.length || 0),
  };
}

async function generateElevenLabsVoice(env, prompt) {
  const outputFormat = "mp3_44100_128";
  const voiceId = env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: buildSafeVoiceText(prompt),
      model_id: env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs voice generation failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    model: env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2",
    outputFormat,
    durationSeconds: null,
    characterCost: Number(response.headers.get("character-cost") || prompt.length || 0),
  };
}

function buildSafeSoundPrompt(prompt) {
  return [
    "Kid-friendly short game sound effect.",
    "No voices, no screams, no weapons, no gore, no realistic violence, no copyrighted sounds, no personal information.",
    "Style: polished, playful, bright, suitable for a children's game development project.",
    `Sound request: ${prompt.slice(0, 280)}`,
  ].join(" ");
}

function buildSafeMusicPrompt(prompt) {
  return [
    "Create a short original instrumental loop for a kid-friendly game project.",
    "No vocals, no lyrics, no artist names, no copyrighted references, no scary or violent tone.",
    "Make it clean, loopable, playful, and suitable for children aged 7-16.",
    "Keep the arrangement simple enough for a beginner game.",
    `Music request: ${prompt.slice(0, 350)}`,
  ].join(" ");
}

function buildSafeVoiceText(prompt) {
  return [
    "AI-generated OPRealm narration.",
    prompt.trim().replace(/\s+/g, " ").slice(0, 650),
  ].join(" ");
}

async function generateOpenAIText(env, prompt, tool) {
  const modelsToTry = [TEXT_MODEL, ...TEXT_MODEL_FALLBACKS];
  let lastError = null;

  for (const model of modelsToTry) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: buildTextToolInstructions(tool),
        input: buildTextToolInput(prompt, tool),
        max_output_tokens: maxOutputTokensForTextTool(tool),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      lastError = new Error(`OpenAI text generation failed for ${model}: ${response.status} ${JSON.stringify(data).slice(0, 500)}`);

      if (response.status === 400 || response.status === 404) {
        continue;
      }

      throw lastError;
    }

    const content = extractResponseText(data).trim();

    if (!content) {
      lastError = new Error(`OpenAI text response did not include text output for ${model}`);
      continue;
    }

    return {
      content,
      model,
      responseId: data.id || null,
      usage: normalizeOpenAIUsage(data.usage),
    };
  }

  throw lastError || new Error("OpenAI text generation failed");
}

function buildTextToolInstructions(tool) {
  return [
    "You are OPRealm AI Coach, a friendly game creation assistant for children and teens aged 7-16.",
    "Keep every answer safe, practical, encouraging, and beginner-friendly.",
    "Do not ask for private messages, usernames, addresses, school names, phone numbers, passwords, social handles, or off-platform contact.",
    "Do not include copyrighted characters, copyrighted songs, real people, gore, hate, bullying, romance, dating, or unsafe instructions.",
    "Only mention OPRealm courses that currently exist: Roblox Creator, Minecraft Modding, Web Game Dev, 2D Game Builder, AI Story Games, and Game Safety.",
    "Do not recommend unavailable OPRealm courses, external course brands, Scratch, Godot, Unity, Unreal, or other platforms unless the student explicitly asks how the idea could be adapted outside OPRealm.",
    tool === "idea"
      ? "For game ideas, write a full design brief because the complete result will be attached as a text file."
      : "Keep the output concise enough for a Discord private slash-command response.",
    "Use clear headings, short bullets, and an immediate next step.",
    textToolSpecificInstruction(tool),
  ].join("\n");
}

function textToolSpecificInstruction(tool) {
  const instructions = {
    idea: [
      "Create one original, comprehensive beginner-friendly game design brief.",
      "Minimum length: 700 words.",
      "Use Markdown formatting.",
      "Do not stop after the first few sections.",
      "Use every section below, in this exact order, with bold section labels and no commas after labels:",
      "**Title**",
      "**One-Sentence Pitch**",
      "**Best OPRealm Course Fit**",
      "**Player Goal**",
      "**Core Game Loop**",
      "**Main Mechanics**",
      "**First Build Steps**",
      "**Starter Assets Needed**",
      "**AI Prompts To Try**",
      "**Safe Multiplayer Rules**",
      "**Easy Upgrade Ideas**",
      "**First 60-Minute Mission**",
      "Every section must contain useful detail. Core Game Loop, Main Mechanics, First Build Steps, AI Prompts To Try, and First 60-Minute Mission must each include at least 4 bullets.",
      "For Best OPRealm Course Fit, choose exactly one from: Roblox Creator, Minecraft Modding, Web Game Dev, 2D Game Builder, AI Story Games, or Game Safety.",
      "Make it practical enough that a child could start building immediately.",
    ].join(" "),
    sound: "Create a sound effect design brief, not an audio file. Include: Sound Name, When It Plays, 3-Layer Sound Recipe, Safe Generation Prompt, and In-Game Use Tip.",
    music: "Create a loopable background music design brief, not an audio file. Include: Track Name, Mood, Tempo, Instruments, Loop Structure, Safe Generation Prompt, and In-Game Use Tip.",
    trailer: "Create a game trailer storyboard, not a video file. Include: Trailer Hook, 5 Shot Plan, On-Screen Text, Music/SFX Direction, Safe Video Prompt, and Next Step.",
    trailer_pro: "Create a premium game trailer planning pack, not a video file. Include: Trailer Strategy, 8 Shot Storyboard, Voiceover Script, On-Screen Text, Music/SFX Direction, Asset Checklist, Safe Video Prompt, Thumbnail Prompt, and Production Next Steps.",
    storyboard: "Create a game story-board for a beginner game project. Include: Story Premise, Main Character, World Setup, 8 Scene Beats, Player Choices, Quest Objectives, Dialogue Starters, Safety Boundaries, and First Build Steps.",
  };

  return instructions[tool] || instructions.idea;
}

function buildTextToolInput(prompt, tool) {
  return [
    `Tool: ${tool}`,
    `Student request: ${prompt.slice(0, 900)}`,
    "",
    "Make it creative but realistic for a young beginner building a game project.",
  ].join("\n");
}

function maxOutputTokensForTextTool(tool) {
  if (tool === "idea") return 2600;
  if (tool === "trailer_pro") return 2200;
  if (tool === "trailer" || tool === "storyboard") return 1300;
  if (tool === "music") return 900;
  return 550;
}

function extractResponseText(data) {
  if (data.output_text) return data.output_text.trim();

  const parts = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      const text = content.text || content.value;
      if (typeof text === "string") parts.push(text);
    }
  }

  return parts.join("\n").trim();
}

function normalizeOpenAIUsage(usage = {}) {
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;

  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens || inputTokens + outputTokens,
  };
}

function estimateTextCostUsd(usage = {}) {
  const input = ((usage.inputTokens || 0) / 1_000_000) * TEXT_MODEL_INPUT_COST_PER_1M;
  const output = ((usage.outputTokens || 0) / 1_000_000) * TEXT_MODEL_OUTPUT_COST_PER_1M;
  return Number((input + output).toFixed(6));
}

function truncateDiscordMessage(content, maxLength) {
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength - 80).trim()}\n\n[Shortened to fit Discord. Try a narrower prompt for more detail.]`;
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

function imageModelForTool(tool) {
  if (tool === "image_pro" || tool === "game_cover") return "gpt-image-2";
  return "gpt-image-1.5";
}

function imageQualityForTool(tool) {
  if (tool === "image_pro" || tool === "game_cover") return "high";
  return "medium";
}

function imageGenerationSpecsForTool(tool) {
  if (tool === "image_pro" || tool === "game_cover") {
    return [
      {
        model: "gpt-image-2",
        quality: "high",
        estimatedCostUsd: ESTIMATED_OPENAI_COSTS_USD[tool],
        allowFallback: true,
        fallback: false,
      },
      {
        model: "gpt-image-1.5",
        quality: "high",
        estimatedCostUsd: 0.133,
        allowFallback: false,
        fallback: true,
      },
    ];
  }

  if (tool === "sprite") {
    return [
      {
        model: "gpt-image-1.5",
        quality: "medium",
        estimatedCostUsd: ESTIMATED_OPENAI_COSTS_USD.sprite,
        allowFallback: true,
        fallback: false,
      },
      {
        model: "gpt-image-1-mini",
        quality: "high",
        estimatedCostUsd: 0.036,
        allowFallback: false,
        fallback: true,
      },
    ];
  }

  return [
    {
      model: "gpt-image-1.5",
      quality: "medium",
      estimatedCostUsd: ESTIMATED_OPENAI_COSTS_USD.image,
      allowFallback: true,
      fallback: false,
    },
    {
      model: "gpt-image-1-mini",
      quality: "high",
      estimatedCostUsd: 0.036,
      allowFallback: false,
      fallback: true,
    },
  ];
}

function buildSafeImagePrompt(prompt, tool = "image") {
  if (tool === "sprite") {
    return [
      "Create a clean, usable 2D sprite sheet for a beginner game development course called OPRealm.",
      "The output must look like production-ready game assets, not concept art.",
      "Use a strict 2x2 grid with exactly 4 sprites. Each sprite must be isolated inside its own cell with generous padding.",
      "Keep the same character or object design in every cell: same head size, body proportions, colors, outfit, outline thickness, camera angle, and lighting.",
      "Use simple game-ready shapes: clean silhouette, chunky friendly proportions, simplified hands and feet, readable outline, no tiny facial details.",
      "Preferred style: polished cute 2D platformer sprite, flat-color cel shading, soft outline, bright friendly colors, suitable for children aged 7-16.",
      "Pose set: idle, walk step, jump, collect or celebrate. Keep poses mild and anatomically consistent.",
      "Use a plain light neutral background or transparent-looking checker-safe background. Do not use a black background.",
      "Do not include text, labels, logos, weapons, gore, scary realism, copyrighted characters, real children, usernames, school names, phone numbers, private chat prompts, bullying, hate, or personal information.",
      "If the request asks for something too complex, simplify it into a cute beginner-friendly sprite object or character.",
      `Student request: ${prompt.slice(0, 900)}`,
    ].join("\n");
  }

  if (tool === "image_pro" || tool === "game_cover") {
    const requestedOutput = tool === "game_cover"
      ? "The result should look like polished game cover art: one strong focal subject, clear mood, clean composition, no readable title text."
      : "The result should look polished enough for a course thumbnail, game concept pitch, or final creative showcase.";

    return [
      "Create a premium, production-quality, kid-friendly game development image for OPRealm.",
      requestedOutput,
      "Style: high-quality modern game art, strong composition, readable subject, bright friendly colors, suitable for children aged 7-16.",
      "Avoid: personal information, real children, usernames, school names, phone numbers, scary realism, gore, bullying, hate, weapons-focused imagery, private chat prompts, copyrighted characters, logos, and readable text.",
      "If the request is too broad, simplify it into one strong, safe game asset or scene.",
      `Student request: ${prompt.slice(0, 900)}`,
    ].join("\n");
  }

  return [
    "Create a kid-friendly, age-appropriate game development asset or concept image for OPRealm.",
    "Style: polished modern game concept art, bright, friendly, suitable for children aged 7-16.",
    "Avoid: personal information, real children, usernames, school names, phone numbers, scary realism, gore, bullying, hate, weapons-focused imagery, private chat prompts, copyrighted characters, logos, and readable text.",
    `Student request: ${prompt.slice(0, 900)}`,
  ].join("\n");
}

function handleSetupHelp(env) {
  const missing = [
    ["DISCORD_BOT_TOKEN", env.DISCORD_BOT_TOKEN],
    ["DISCORD_GUILD_ID", env.DISCORD_GUILD_ID],
    ["SAFETY_COMPLETED_ROLE_ID", env.SAFETY_COMPLETED_ROLE_ID],
    ["OPREALM_WEBHOOK_SECRET", env.OPREALM_WEBHOOK_SECRET],
    ["ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY],
    ["JUNIOR_SHOWCASE_CHANNEL_ID", env.JUNIOR_SHOWCASE_CHANNEL_ID],
    ["CREATOR_CREW_SHOWCASE_CHANNEL_ID", env.CREATOR_CREW_SHOWCASE_CHANNEL_ID],
    ["TEEN_STUDIO_SHOWCASE_CHANNEL_ID", env.TEEN_STUDIO_SHOWCASE_CHANNEL_ID],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => `- ${name}`)
    .join("\n");

  if (!missing) {
    return ephemeral("Core OPRealm Discord settings are present. Next step: connect course completion and AI generation providers.");
  }

  return ephemeral(`These required OPRealm settings are still missing:\n${missing}`);
}

function requireSafety(interaction, env) {
  if (!env.SAFETY_COMPLETED_ROLE_ID) {
    return ephemeral("The Safety Completed role has not been configured yet. Ask an OPRealm admin to finish the server setup.");
  }

  if (!hasRole(interaction, env.SAFETY_COMPLETED_ROLE_ID)) {
    return ephemeral("Please complete the Online Safety Academy before using AI tools or creator commands.");
  }

  return null;
}

function isPremiumAiTool(tool) {
  return tool === "image_pro" || tool === "game_cover" || tool === "trailer_pro";
}

function requirePremiumAiAccess(interaction, env) {
  const hasPremiumRole =
    hasRole(interaction, env.AI_PRO_ACCESS_ROLE_ID) ||
    hasRole(interaction, env.CREATOR_PRO_ROLE_ID) ||
    hasRole(interaction, env.ELITE_ROLE_ID);

  if (hasPremiumRole) return null;

  return ephemeral("The premium AI image tool is for Creator Pro, Elite, or AI Pro access members.");
}

function requireChannel(interaction, env, command) {
  const allowedChannelId = {
    idea: env.AI_IDEA_CHANNEL_ID,
    image: env.AI_IMAGE_CHANNEL_ID,
    image_pro: env.AI_IMAGE_PRO_CHANNEL_ID || env.AI_PREMIUM_CHANNEL_ID || env.AI_IMAGE_CHANNEL_ID,
    game_cover: env.AI_GAME_COVER_CHANNEL_ID || env.AI_IMAGE_PRO_CHANNEL_ID || env.AI_IMAGE_CHANNEL_ID,
    sprite: env.AI_SPRITE_CHANNEL_ID,
    sound: env.AI_SOUND_CHANNEL_ID,
    voice: env.AI_VOICE_CHANNEL_ID || env.AI_SOUND_CHANNEL_ID,
    music: env.AI_MUSIC_CHANNEL_ID,
    trailer: env.AI_TRAILER_CHANNEL_ID,
    trailer_pro: env.AI_TRAILER_PRO_CHANNEL_ID || env.AI_TRAILER_CHANNEL_ID,
    storyboard: env.AI_STORY_BOARD_CHANNEL_ID || env.AI_TRAILER_CHANNEL_ID,
  }[command];

  if (!allowedChannelId || interaction.channel_id === allowedChannelId) {
    return null;
  }

  const channelName = {
    idea: "ai-idea-lab",
    image: "ai-image-lab",
    image_pro: "ai-image-pro",
    game_cover: "ai-game-cover",
    sprite: "ai-sprite-lab",
    sound: "ai-sound-lab",
    voice: "ai-sound-lab",
    music: "ai-music-lab",
    trailer: "ai-trailer-lab",
    trailer_pro: "ai-trailer-pro",
    storyboard: "ai-story-board",
  }[command];

  const commandName = command === "image_pro" ? "image-pro" : command === "game_cover" ? "game-cover" : command === "trailer_pro" ? "trailer-pro" : command === "storyboard" ? "story-board" : command;
  return ephemeral(`Please use /${commandName} inside **#${channelName}** so OPRealm AI tools stay organized and moderated.`);
}

function defaultPromptForTextTool(tool) {
  const prompts = {
    idea: "a beginner-friendly game idea",
    sound: "a friendly game sound effect",
    music: "a loopable game music idea",
    trailer: "a short trailer for a beginner game",
    trailer_pro: "a polished trailer plan for a finished beginner game",
    storyboard: "a beginner-friendly game story with scenes, characters, and quest beats",
  };

  return prompts[tool] || prompts.idea;
}

function defaultPromptForAudioTool(tool) {
  const prompts = {
    sound: "a cheerful coin pickup sound for a kid-friendly game",
    music: "a cheerful 10 second instrumental loop for a space platformer",
    voice: "Welcome, creator. Your next mission is to build something safe, fun, and original.",
  };

  return prompts[tool] || prompts.sound;
}

function textToolLabel(tool) {
  const labels = {
    idea: "game idea",
    image: "AI image",
    image_pro: "premium AI image",
    game_cover: "game cover",
    sprite: "sprite sheet",
    sound: "sound effect",
    music: "music brief",
    trailer: "trailer storyboard",
    trailer_pro: "premium trailer storyboard",
    storyboard: "game storyboard",
    voice: "voice narration",
  };

  return labels[tool] || "AI result";
}

function textToolMode(tool) {
  const modes = {
    idea: "game_idea",
    sound: "sound_effect_brief",
    music: "music_brief",
    trailer: "trailer_storyboard",
    trailer_pro: "premium_trailer_storyboard",
    storyboard: "game_storyboard",
  };

  return modes[tool] || "text_result";
}

function resultActionComponents(resultId, recommendedCourse = null, tool = null) {
  if (!resultId) return [];

  const buttons = [
    {
      type: 2,
      style: ButtonStyle.SECONDARY,
      label: "Send to my bot inbox",
      custom_id: `oprealm_result:dm:${resultId}`,
    },
  ];

  if (recommendedCourse) {
    buttons.push({
      type: 2,
      style: ButtonStyle.LINK,
      label: "Start Course",
      url: courseUrl(recommendedCourse),
    });
  }

  if (tool === "sound") {
    buttons.push({
      type: 2,
      style: ButtonStyle.SECONDARY,
      label: "Submit to SFX Library",
      custom_id: `oprealm_result:submit_sfx:${resultId}`,
    });
  }

  if (tool === "music") {
    buttons.push({
      type: 2,
      style: ButtonStyle.SECONDARY,
      label: "Submit to Music Library",
      custom_id: `oprealm_result:submit_music:${resultId}`,
    });
  }

  buttons.push(
    {
      type: 2,
      style: ButtonStyle.SUCCESS,
      label: "Share to showcase",
      custom_id: `oprealm_result:share:${resultId}`,
    },
    {
      type: 2,
      style: ButtonStyle.PRIMARY,
      label: "Create another variation",
      custom_id: `oprealm_result:retry:${resultId}`,
    },
  );

  return [
    {
      type: 1,
      components: buttons,
    },
  ];
}

function recommendedCourseForIdea(content, prompt) {
  const text = `${content}\n${prompt}`.toLowerCase();
  const courseMatches = [
    { slug: "roblox", names: ["roblox creator", "roblox", "lua", "obby", "tycoon"] },
    { slug: "minecraft", names: ["minecraft modding", "minecraft", "modding", "blocks", "biome"] },
    { slug: "web-games", names: ["web game dev", "web games", "browser game", "javascript", "html", "css"] },
    { slug: "2d-games", names: ["2d game builder", "2d games", "platformer", "drag-and-drop", "sprite"] },
    { slug: "ai-stories", names: ["ai story games", "story", "quest", "dialogue", "branching"] },
    { slug: "game-safety", names: ["game safety", "online safety", "privacy", "safe chat", "scam"] },
  ];

  return courseMatches.find((course) => course.names.some((name) => text.includes(name)))?.slug || "roblox";
}

function courseUrl(slug) {
  const paths = {
    roblox: "roblox.html",
    minecraft: "minecraft.html",
    "web-games": "web-games.html",
    "2d-games": "2d-games.html",
    "ai-stories": "ai-stories.html",
    "game-safety": "../safety.html",
  };

  return `https://oprealm.com/${slug === "game-safety" ? "safety.html" : `courses/${paths[slug] || paths.roblox}`}`;
}

async function saveAiResult(interaction, env, result) {
  const id = result.id || crypto.randomUUID();

  if (!env.OPREALM_DB) return id;

  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";

  try {
    await env.OPREALM_DB.prepare(
      `
        INSERT OR REPLACE INTO ai_results (
          id,
          discord_user_id,
          guild_id,
          channel_id,
          tool,
          prompt,
          content,
          attachment_url,
          attachment_filename,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
    )
      .bind(
        id,
        discordUserId,
        guildId,
        interaction.channel_id || null,
        result.tool,
        result.prompt.slice(0, 1500),
      result.content.slice(0, 9000),
        result.attachmentUrl || null,
        result.attachmentFilename || null,
      )
      .run();
  } catch (error) {
    console.error("Failed to save AI result for Discord buttons", error);
  }

  return id;
}

async function savePrivateSfxAsset(interaction, env, result, audio) {
  if (!env.OPREALM_DB) return;

  const asset = classifySfxAsset(result.prompt);
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";
  const ageBand = ageBandForMember(interaction, env);
  const r2Key = `sfx/${guildId}/${discordUserId}/${result.id}.mp3`;

  if (env.OPREALM_ASSETS) {
    await env.OPREALM_ASSETS.put(r2Key, audio.bytes, {
      httpMetadata: {
        contentType: "audio/mpeg",
      },
      customMetadata: {
        tool: "sound",
        owner: discordUserId,
        category: asset.category,
      },
    });
  }

  await env.OPREALM_DB.prepare(
    `
      INSERT OR REPLACE INTO sfx_assets (
        id,
        owner_discord_user_id,
        guild_id,
        title,
        prompt,
        category,
        tags,
        mood,
        course,
        age_band,
        r2_key,
        discord_attachment_url,
        duration_seconds,
        file_size,
        visibility,
        review_status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'private', 'private', datetime('now'))
    `,
  )
    .bind(
      result.id,
      discordUserId,
      guildId,
      asset.title,
      result.prompt.slice(0, 1500),
      asset.category,
      asset.tags.join(", "),
      asset.mood,
      courseForPrompt(result.prompt),
      ageBand,
      env.OPREALM_ASSETS ? r2Key : null,
      result.attachmentUrl || null,
      audio.durationSeconds || null,
      audio.bytes?.byteLength || null,
    )
    .run();
}

async function submitSfxForReview(interaction, env, result) {
  if (!env.OPREALM_DB) {
    throw new Error("OPRealm database is not connected");
  }

  const asset = classifySfxAsset(result.prompt);

  await env.OPREALM_DB.prepare(
    `
      INSERT INTO sfx_assets (
        id,
        owner_discord_user_id,
        guild_id,
        title,
        prompt,
        category,
        tags,
        mood,
        course,
        age_band,
        r2_key,
        discord_attachment_url,
        duration_seconds,
        file_size,
        visibility,
        review_status,
        created_at,
        submitted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 'pending', datetime('now'), datetime('now'))
      ON CONFLICT(id)
      DO UPDATE SET
        review_status = 'pending',
        visibility = 'pending_review',
        submitted_at = datetime('now'),
        discord_attachment_url = COALESCE(excluded.discord_attachment_url, sfx_assets.discord_attachment_url)
    `,
  )
    .bind(
      result.id,
      interaction.member?.user?.id || interaction.user?.id,
      interaction.guild_id || env.DISCORD_GUILD_ID || "unknown",
      asset.title,
      result.prompt.slice(0, 1500),
      asset.category,
      asset.tags.join(", "),
      asset.mood,
      courseForPrompt(result.prompt),
      ageBandForMember(interaction, env),
      null,
      result.attachment_url || result.attachmentUrl || null,
      null,
      null,
    )
    .run();
}

async function savePrivateMusicAsset(interaction, env, result, audio) {
  if (!env.OPREALM_DB) return;

  const asset = classifyMusicAsset(result.prompt);
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";
  const ageBand = ageBandForMember(interaction, env);
  const r2Key = `music/${guildId}/${discordUserId}/${result.id}.mp3`;

  if (env.OPREALM_ASSETS) {
    await env.OPREALM_ASSETS.put(r2Key, audio.bytes, {
      httpMetadata: {
        contentType: "audio/mpeg",
      },
      customMetadata: {
        tool: "music",
        owner: discordUserId,
        category: asset.category,
      },
    });
  }

  await env.OPREALM_DB.prepare(
    `
      INSERT OR REPLACE INTO music_assets (
        id,
        owner_discord_user_id,
        guild_id,
        title,
        prompt,
        category,
        tags,
        mood,
        course,
        age_band,
        r2_key,
        discord_attachment_url,
        duration_seconds,
        file_size,
        visibility,
        review_status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'private', 'private', datetime('now'))
    `,
  )
    .bind(
      result.id,
      discordUserId,
      guildId,
      asset.title,
      result.prompt.slice(0, 1500),
      asset.category,
      asset.tags.join(", "),
      asset.mood,
      courseForPrompt(result.prompt),
      ageBand,
      env.OPREALM_ASSETS ? r2Key : null,
      result.attachmentUrl || null,
      audio.durationSeconds || null,
      audio.bytes?.byteLength || null,
    )
    .run();
}

async function submitMusicForReview(interaction, env, result) {
  if (!env.OPREALM_DB) {
    throw new Error("OPRealm database is not connected");
  }

  const asset = classifyMusicAsset(result.prompt);

  await env.OPREALM_DB.prepare(
    `
      INSERT INTO music_assets (
        id,
        owner_discord_user_id,
        guild_id,
        title,
        prompt,
        category,
        tags,
        mood,
        course,
        age_band,
        r2_key,
        discord_attachment_url,
        duration_seconds,
        file_size,
        visibility,
        review_status,
        created_at,
        submitted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 'pending', datetime('now'), datetime('now'))
      ON CONFLICT(id)
      DO UPDATE SET
        review_status = 'pending',
        visibility = 'pending_review',
        submitted_at = datetime('now'),
        discord_attachment_url = COALESCE(excluded.discord_attachment_url, music_assets.discord_attachment_url)
    `,
  )
    .bind(
      result.id,
      interaction.member?.user?.id || interaction.user?.id,
      interaction.guild_id || env.DISCORD_GUILD_ID || "unknown",
      asset.title,
      result.prompt.slice(0, 1500),
      asset.category,
      asset.tags.join(", "),
      asset.mood,
      courseForPrompt(result.prompt),
      ageBandForMember(interaction, env),
      null,
      result.attachment_url || result.attachmentUrl || null,
      null,
      null,
    )
    .run();
}

async function getAiResult(interaction, env, resultId) {
  if (!env.OPREALM_DB) return null;

  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";

  try {
    return env.OPREALM_DB.prepare(
      "SELECT * FROM ai_results WHERE id = ? AND guild_id = ? LIMIT 1",
    )
      .bind(resultId, guildId)
      .first();
  } catch (error) {
    console.error("Failed to load AI result", error);
    return null;
  }
}

function isResultOwner(interaction, result) {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  return result.discord_user_id === discordUserId;
}

async function sendResultToDm(interaction, env, result) {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const channelResponse = await discordBotFetch(env, "/users/@me/channels", {
    method: "POST",
    body: JSON.stringify({ recipient_id: discordUserId }),
  });
  const dmChannel = await channelResponse.json();

  await discordBotFetch(env, `/channels/${dmChannel.id}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: formatResultMessage(result, "Your saved OPRealm AI result"),
      allowed_mentions: { parse: [] },
    }),
  });
}

async function shareResultToShowcase(interaction, env, result, channelId) {
  const alias = await displayAliasForInteraction(interaction, env);

  await discordBotFetch(env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: formatResultMessage(result, `OPRealm ${textToolLabel(result.tool)} shared by ${alias}`),
      allowed_mentions: { parse: [] },
    }),
  });
}

function formatResultMessage(result, title) {
  const lines = [
    `**${title}**`,
    "",
    truncateDiscordMessage(result.content || "Saved OPRealm result.", 1600),
  ];

  if (result.attachment_url) {
    lines.push("", result.attachment_url);
  }

  return lines.join("\n");
}

function showcaseChannelForMember(interaction, env) {
  if (hasRole(interaction, env.JUNIOR_ACCESS_ROLE_ID)) return env.JUNIOR_SHOWCASE_CHANNEL_ID;
  if (hasRole(interaction, env.CREATOR_CREW_ACCESS_ROLE_ID)) return env.CREATOR_CREW_SHOWCASE_CHANNEL_ID;
  if (hasRole(interaction, env.TEEN_STUDIO_ACCESS_ROLE_ID)) return env.TEEN_STUDIO_SHOWCASE_CHANNEL_ID;
  return null;
}

function ageBandForMember(interaction, env) {
  if (hasRole(interaction, env.JUNIOR_ACCESS_ROLE_ID)) return "junior";
  if (hasRole(interaction, env.CREATOR_CREW_ACCESS_ROLE_ID)) return "creator_crew";
  if (hasRole(interaction, env.TEEN_STUDIO_ACCESS_ROLE_ID)) return "teen_studio";
  return "unknown";
}

function classifySfxAsset(prompt) {
  const text = prompt.toLowerCase();
  const rules = [
    { category: "Coins & Rewards", tags: ["coin", "reward", "collect", "pickup", "gem", "points"], mood: "bright" },
    { category: "UI", tags: ["click", "menu", "button", "select", "confirm"], mood: "clean" },
    { category: "Movement", tags: ["dash", "run", "slide", "step", "footstep", "speed"], mood: "active" },
    { category: "Jump & Landing", tags: ["jump", "bounce", "land", "spring"], mood: "playful" },
    { category: "Magic", tags: ["magic", "spell", "portal", "sparkle", "fairy"], mood: "magical" },
    { category: "Sci-Fi", tags: ["space", "laser", "robot", "digital", "sci-fi", "futuristic"], mood: "futuristic" },
    { category: "Fantasy", tags: ["dragon", "castle", "quest", "crystal", "forest"], mood: "adventure" },
    { category: "Alerts", tags: ["alert", "warning", "timer", "alarm", "notice"], mood: "attention" },
    { category: "Success", tags: ["win", "success", "complete", "level up", "achievement"], mood: "celebration" },
    { category: "Failure", tags: ["fail", "mistake", "wrong", "lose"], mood: "soft" },
    { category: "Environment", tags: ["wind", "rain", "water", "forest", "cave", "ambience"], mood: "ambient" },
    { category: "Vehicles", tags: ["car", "spaceship", "engine", "rocket", "bike"], mood: "motion" },
    { category: "Combat-Free Action", tags: ["impact", "hit", "thud", "block", "shield"], mood: "arcade" },
  ];
  const match = rules.find((rule) => rule.tags.some((tag) => text.includes(tag))) || {
    category: "General Game SFX",
    tags: ["game", "sfx"],
    mood: "playful",
  };

  return {
    title: titleFromPrompt(prompt, match.category),
    category: match.category,
    tags: [...new Set(match.tags.filter((tag) => text.includes(tag)).concat([match.category.toLowerCase()]))],
    mood: match.mood,
  };
}

function classifyMusicAsset(prompt) {
  const text = prompt.toLowerCase();
  const rules = [
    { category: "Adventure", tags: ["adventure", "quest", "explore", "journey"], mood: "uplifting" },
    { category: "Arcade", tags: ["arcade", "fast", "retro", "platformer", "race"], mood: "energetic" },
    { category: "Fantasy", tags: ["fantasy", "magic", "dragon", "castle", "forest"], mood: "magical" },
    { category: "Sci-Fi", tags: ["space", "sci-fi", "robot", "futuristic", "laser"], mood: "futuristic" },
    { category: "Calm", tags: ["calm", "peaceful", "soft", "relaxing", "ambient"], mood: "calm" },
    { category: "Victory", tags: ["victory", "win", "success", "level up", "celebration"], mood: "celebration" },
    { category: "Mystery", tags: ["mystery", "puzzle", "secret", "night", "cave"], mood: "curious" },
  ];
  const match = rules.find((rule) => rule.tags.some((tag) => text.includes(tag))) || {
    category: "Game Loop",
    tags: ["music", "loop"],
    mood: "playful",
  };

  return {
    title: titleFromPrompt(prompt, match.category),
    category: match.category,
    tags: [...new Set(match.tags.filter((tag) => text.includes(tag)).concat([match.category.toLowerCase(), "music"]))],
    mood: match.mood,
  };
}

function titleFromPrompt(prompt, fallback) {
  const words = prompt
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  if (!words.length) return fallback;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

function courseForPrompt(prompt) {
  const course = recommendedCourseForIdea("", prompt);
  return {
    roblox: "Roblox Creator",
    minecraft: "Minecraft Modding",
    "web-games": "Web Game Dev",
    "2d-games": "2D Game Builder",
    "ai-stories": "AI Story Games",
    "game-safety": "Game Safety",
  }[course] || "General";
}

async function displayAliasForInteraction(interaction, env) {
  const member = await getMemberRecord(interaction, env);
  const discordUserId = interaction.member?.user?.id || interaction.user?.id || "0000";
  return member?.alias || `Creator-${discordUserId.slice(-4)}`;
}

async function discordBotFetch(env, path, init = {}) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Discord API failed ${path}: ${response.status} ${await response.text()}`);
  }

  return response;
}

function checkPromptSafety(prompt) {
  const lower = prompt.toLowerCase();
  const matched = UNSAFE_PHRASES.find((phrase) => lower.includes(phrase));

  if (!matched) return null;

  return ephemeral(
    "OPRealm keeps students inside moderated spaces. Please do not ask for private messages, personal details, account details, free Robux, or anything that moves communication outside the server.",
  );
}

async function checkCredits(interaction, env, amount) {
  if (!env.OPREALM_DB) return null;

  const member = await getMemberRecord(interaction, env);
  const tier = member?.tier || inferTierFromRoles(interaction, env) || "explorer";
  const current = member?.credits_remaining ?? (TIER_CREDITS[tier] || 0);

  if (current < amount) {
    return ephemeral(`You need **${formatCredits(amount)} Creator credits** for this command, but you only have **${formatCredits(current)}** left.`);
  }

  return null;
}

async function deductCredits(interaction, env, amount, tool, prompt, usage = {}) {
  if (!env.OPREALM_DB) return;

  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";
  const member = await getMemberRecord(interaction, env);
  const tier = member?.tier || inferTierFromRoles(interaction, env) || "explorer";
  const current = member?.credits_remaining ?? (TIER_CREDITS[tier] || 0);

  await insertAiUsage(interaction, env, amount, tool, prompt, usage);

  await env.OPREALM_DB.prepare(
    `
      INSERT INTO members (discord_user_id, guild_id, tier, credits_remaining, safety_completed, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(discord_user_id, guild_id)
      DO UPDATE SET credits_remaining = excluded.credits_remaining, updated_at = datetime('now')
    `,
  )
    .bind(discordUserId, guildId, tier, current - amount, hasRole(interaction, env.SAFETY_COMPLETED_ROLE_ID) ? 1 : 0)
    .run();
}

async function insertAiUsage(interaction, env, amount, tool, prompt, usage = {}) {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";

  try {
    await env.OPREALM_DB.prepare(
      `
        INSERT INTO ai_usage (
          discord_user_id,
          guild_id,
          tool,
          prompt,
          credits_used,
          provider,
          model,
          quality,
          provider_units,
          estimated_cost_usd,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
    )
      .bind(
        discordUserId,
        guildId,
        tool,
        prompt.slice(0, 1500),
        amount,
        usage.provider || providerForTool(tool),
        usage.model || modelForUsage(tool),
        usage.quality || qualityForUsage(tool),
        usage.providerUnits ?? unitsForUsage(tool),
        usage.estimatedCostUsd ?? estimatedCostForUsage(tool),
        usage.metadata ? JSON.stringify(usage.metadata).slice(0, 1500) : null,
      )
      .run();
    return;
  } catch (error) {
    console.error("Detailed ai_usage insert failed, falling back to base schema", error);
  }

  await env.OPREALM_DB.prepare(
    `
      INSERT INTO ai_usage (discord_user_id, guild_id, tool, prompt, credits_used, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `,
  )
    .bind(discordUserId, guildId, tool, prompt.slice(0, 1500), amount)
    .run();
}

function providerForTool(tool) {
  if (["idea", "sound", "music", "trailer"].includes(tool)) return "openai";
  return "openai";
}

function modelForUsage(tool) {
  if (["idea", "sound", "music", "trailer"].includes(tool)) return TEXT_MODEL;
  if (tool === "trailer_pro" || tool === "storyboard") return TEXT_MODEL;
  if (tool === "image" || tool === "image_pro" || tool === "game_cover" || tool === "sprite") return imageModelForTool(tool);
  return null;
}

function qualityForUsage(tool) {
  if (tool === "image" || tool === "image_pro" || tool === "game_cover" || tool === "sprite") return imageQualityForTool(tool);
  return null;
}

function unitsForUsage(tool) {
  if (tool === "image" || tool === "image_pro" || tool === "game_cover" || tool === "sprite") return 1;
  return 0;
}

function estimatedCostForUsage(tool) {
  return ESTIMATED_OPENAI_COSTS_USD[tool] || 0;
}

async function getMemberRecord(interaction, env) {
  if (!env.OPREALM_DB) return null;

  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const guildId = interaction.guild_id || env.DISCORD_GUILD_ID || "unknown";

  return env.OPREALM_DB.prepare(
    "SELECT * FROM members WHERE discord_user_id = ? AND guild_id = ? LIMIT 1",
  )
    .bind(discordUserId, guildId)
    .first();
}

function inferTierFromRoles(interaction, env) {
  if (hasRole(interaction, env.ELITE_ROLE_ID)) return "elite";
  if (hasRole(interaction, env.CREATOR_PRO_ROLE_ID)) return "pro";
  if (hasRole(interaction, env.CREATOR_ROLE_ID)) return "creator";
  if (hasRole(interaction, env.EXPLORER_ROLE_ID)) return "explorer";
  return null;
}

function hasRole(interaction, roleId) {
  if (!roleId) return false;
  return interaction.member?.roles?.includes(roleId) || false;
}

function getOption(interaction, name) {
  return interaction.data?.options?.find((option) => option.name === name)?.value;
}

function severityForReport(reportType) {
  if (["private_info", "dm_request", "scam", "bullying"].includes(reportType)) {
    return "high";
  }

  return "medium";
}

function formatReportType(reportType) {
  return {
    bullying: "Bullying or mean behavior",
    dm_request: "DM or friend request",
    private_info: "Personal information request",
    scam: "Scam or free Robux",
    other: "Something else",
  }[reportType] || "Something else";
}

function formatTier(tier) {
  return {
    explorer: "Explorer Pass",
    creator: "Creator Membership",
    pro: "Creator Pro Membership",
    elite: "Elite Creator Intensive",
  }[tier] || "Unknown";
}

function formatCredits(value) {
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function ephemeral(content) {
  return json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: MessageFlags.EPHEMERAL,
    },
  });
}

function deferredEphemeral() {
  return json({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: MessageFlags.EPHEMERAL,
    },
  });
}

async function editOriginalInteraction(interaction, env, content, fileBytes, filename = "oprealm-image.png", components = [], mimeType = "image/png") {
  const applicationId = env.DISCORD_APPLICATION_ID || interaction.application_id;
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interaction.token}/messages/@original`;

  let response;

  if (fileBytes) {
    const form = new FormData();
    form.append("payload_json", JSON.stringify({
      content,
      attachments: [{ id: 0, filename }],
      components,
      allowed_mentions: { parse: [] },
    }));
    form.append("files[0]", new Blob([fileBytes], { type: mimeType }), filename);

    response = await fetch(url, {
      method: "PATCH",
      body: form,
    });
  } else {
    response = await fetch(url, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content,
        components,
        allowed_mentions: { parse: [] },
      }),
    });
  }

  if (!response.ok) {
    throw new Error(`Discord original response edit failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      ...(init.headers || {}),
    },
  });
}

async function verifyDiscordRequest(request, publicKey) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const body = await request.text();

  if (!signature || !timestamp || !publicKey) {
    return { valid: false, body };
  }

  const message = new TextEncoder().encode(timestamp + body);
  const publicKeyBytes = hexToBytes(publicKey);
  const signatureBytes = hexToBytes(signature);

  try {
    const key = await crypto.subtle.importKey("raw", publicKeyBytes, "Ed25519", false, ["verify"]);
    const valid = await crypto.subtle.verify("Ed25519", key, signatureBytes, message);
    return { valid, body };
  } catch (error) {
    console.error("Discord signature verification failed", error);
    return { valid: false, body };
  }
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}
