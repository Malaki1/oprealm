export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      const jobId = String(message.body?.jobId || "").trim();
      if (!jobId) {
        message.ack();
        continue;
      }

      const finalAttempt = Number(message.attempts || 1) >= 5;
      const response = await fetch(env.OPREALM_INTERNAL_IMAGE_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-oprealm-queue-secret": env.OPREALM_QUEUE_SECRET,
          "x-oprealm-final-attempt": finalAttempt ? "true" : "false",
        },
        body: JSON.stringify({ jobId }),
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        message.ack();
        continue;
      }
      if (!result.retryable || finalAttempt) {
        message.ack();
        continue;
      }
      message.retry({ delaySeconds: Math.min(120, 15 * 2 ** Math.max(0, Number(message.attempts || 1) - 1)) });
    }
  },
};
