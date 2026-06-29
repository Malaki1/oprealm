type Env = {
  ELEVENLABS_API_KEY?: string;
  NEXT_PUBLIC_ELEVENLABS_AGENT_ID?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  if (!env.ELEVENLABS_API_KEY || !env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID) {
    return Response.json({
      ok: true,
      mode: "demo",
      message: "ElevenLabs credentials are not configured. The frontend should use polished demo mode."
    });
  }

  // TODO: Replace this with the account-specific ElevenLabs signed conversation/session endpoint
  // once the final agent configuration is available. Secrets stay server-side in Cloudflare Pages.
  return Response.json({
    ok: true,
    mode: "configured",
    agentId: env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  });
};
