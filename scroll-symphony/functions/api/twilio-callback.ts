type Env = {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  N8N_WEBHOOK_CALLBACK?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return Response.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (env.N8N_WEBHOOK_CALLBACK) {
    await fetch(env.N8N_WEBHOOK_CALLBACK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        twilioConfigured: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER)
      })
    });
  }

  return Response.json({
    ok: true,
    mode: env.N8N_WEBHOOK_CALLBACK ? "webhook-forwarded" : "demo-captured"
  });
};
