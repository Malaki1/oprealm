import { fail, getFoundation, ok, readBody } from "../../../_lib/content-api.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    return ok({ invites: await services.listFriendInvites(user, params.workspaceId) });
  } catch (error) {
    return fail(error, "Could not load invites.");
  }
}

export async function onRequestPost({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const invite = await services.createFriendInvite(user, params.workspaceId, await readBody(request));
    return ok({ invite }, 201);
  } catch (error) {
    return fail(error, "Could not create invite.");
  }
}
