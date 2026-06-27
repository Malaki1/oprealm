import { requireUser } from "./auth.js";
import {
  createD1FoundationStore,
  createFoundationServices,
  ensureContentFoundationSchema,
  isAdminRequest,
} from "./content-foundation.js";
import { json, readJson } from "./http.js";

export async function getFoundation(request, env) {
  const user = await requireUser(request, env);
  await ensureContentFoundationSchema(env);
  return { user, services: createFoundationServices(createD1FoundationStore(env.OPREALM_DB)) };
}

export async function getAdminFoundation(request, env) {
  if (!isAdminRequest(request, env)) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  await ensureContentFoundationSchema(env);
  return { services: createFoundationServices(createD1FoundationStore(env.OPREALM_DB)) };
}

export async function readBody(request) {
  return readJson(request, "Invalid content foundation request.");
}

export function ok(data, status = 200) {
  return json({ ok: true, ...data }, status);
}

export function fail(error, fallback = "Content foundation request failed.") {
  return json({ ok: false, error: error.message || fallback }, error.status || 500);
}

export function query(request) {
  return new URL(request.url).searchParams;
}
