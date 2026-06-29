type Env = {
  N8N_WEBHOOK_LEAD_CAPTURE?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return Response.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (env.N8N_WEBHOOK_LEAD_CAPTURE) {
    await fetch(env.N8N_WEBHOOK_LEAD_CAPTURE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  return Response.json({
    ok: true,
    mode: env.N8N_WEBHOOK_LEAD_CAPTURE ? "webhook-forwarded" : "demo-captured"
  });
};
