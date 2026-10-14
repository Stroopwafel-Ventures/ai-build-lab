import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for scripts (seed, add-user, embed). Bypasses RLS.
 * Inside the Next.js app, import createAdminClient from ./admin instead.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env.example)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
