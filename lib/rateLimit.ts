import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Simple per-user rate limit backed by the `rate_limits` table.
 * Returns { ok: false } when the user has made more than `limit` calls
 * to `bucket` in the current window.
 *
 *   const rl = await rateLimit("ai:example", 20, 60 * 60); // 20 per hour
 *   if (!rl.ok) return Response.json({ error: rl.message }, { status: 429 });
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bump_rate_limit", {
    p_bucket: bucket,
    p_window_seconds: windowSeconds,
  });
  if (error) return { ok: false as const, count: 0, message: `Rate limit check failed: ${error.message}` };
  const count = data as number;
  return count > limit
    ? { ok: false as const, count, message: `Slow down: ${limit} calls per ${Math.round(windowSeconds / 60)} min.` }
    : { ok: true as const, count, message: "" };
}
