import { fail, getFoundation, ok, readBody } from "../_lib/content-api.js";

export async function onRequestGet({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    return ok({ workspaces: await services.listWorkspaces(user) });
  } catch (error) {
    return fail(error, "Could not load workspaces.");
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const workspace = await services.createWorkspace(user, await readBody(request));
    return ok({ workspace }, 201);
  } catch (error) {
    return fail(error, "Could not create workspace.");
  }
}
