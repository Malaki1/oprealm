import { fail, getFoundation, ok } from "../../../_lib/content-api.js";

export async function onRequestPost({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    return ok({ invite: await services.revokeFriendInvite(user, params.inviteId) });
  } catch (error) {
    return fail(error, "Could not revoke invite.");
  }
}
