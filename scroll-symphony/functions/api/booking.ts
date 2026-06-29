type Env = {
  N8N_WEBHOOK_BOOKING?: string;
  CALENDLY_API_TOKEN?: string;
  CALENDLY_EVENT_TYPE_URI?: string;
  GOOGLE_CALENDAR_ID?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return Response.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (env.N8N_WEBHOOK_BOOKING) {
    await fetch(env.N8N_WEBHOOK_BOOKING, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        calendarProvider: env.CALENDLY_API_TOKEN ? "calendly" : env.GOOGLE_CALENDAR_ID ? "google-calendar" : "demo"
      })
    });
  }

  return Response.json({
    ok: true,
    mode: env.N8N_WEBHOOK_BOOKING ? "webhook-forwarded" : "demo-captured"
  });
};
