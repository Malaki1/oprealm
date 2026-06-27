import { fail, getFoundation, ok, readBody } from "../../../_lib/content-api.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    return ok({ members: await services.listWorkspaceMembers(user, params.workspaceId) });
  } catch (error) {
    return fail(error, "Could not load workspace members.");
  }
}

export async function onRequestPost({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const member = await services.addWorkspaceMember(user, params.workspaceId, await readBody(request));
    return ok({ member }, 201);
  } catch (error) {
    return fail(error, "Could not add workspace member.");
  }
}
