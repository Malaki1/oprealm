import { fail, getFoundation, ok, readBody } from "../../../../_lib/content-api.js";

export async function onRequestPost({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const body = await readBody(request);
    return ok(await services.releaseReservation(params.reservationId, body.metadata || body, user.id));
  } catch (error) {
    return fail(error, "Could not release token reservation.");
  }
}
