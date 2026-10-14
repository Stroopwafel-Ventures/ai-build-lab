import "server-only";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Guardrails for every AI / integration route:
 *   1. must be signed in (and linked to a team member)
 *   2. per-user rate limit
 *
 *   const guard = await guardApi("ai:example", { limit: 20 });
 *   if (guard instanceof Response) return guard;
 *   const me = guard; // CurrentUser
 */
export async function guardApi(
  bucket: string,
  { limit = 30, windowSeconds = 3600 }: { limit?: number; windowSeconds?: number } = {},
): Promise<CurrentUser | Response> {
  const me = await getCurrentUser();
  if (!me?.profile) return Response.json({ error: "Not signed in" }, { status: 401 });
  const rl = await rateLimit(bucket, limit, windowSeconds);
  if (!rl.ok) return Response.json({ error: rl.message }, { status: 429 });
  return me;
}
