import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminEmails } from "@/lib/env";
import type { User } from "@/lib/types";

export interface CurrentUser {
  authUserId: string;
  email: string;
  /** The team member's profile. Null only if their login isn't linked yet. */
  profile: User | null;
  isAdmin: boolean;
}

/**
 * Who is signed in? Resolves auth user → user_logins → users, so signing in
 * from any linked email lands on the same profile. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const email = (user.email ?? "").toLowerCase();
  const { data: login } = await supabase
    .from("user_logins")
    .select("user_id, users(*)")
    .or(`auth_user_id.eq.${user.id},email.eq."${email.replace(/"/g, "")}"`)
    .limit(1)
    .maybeSingle();

  const profile = (login?.users as unknown as User | null) ?? null;
  const isAdmin = adminEmails().includes(email) || profile?.role === "admin";
  return { authUserId: user.id, email, profile, isAdmin };
});

/** Use at the top of any page that needs a signed-in user. */
export async function requireUser(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return me;
}

/** Use at the top of admin pages and admin server actions. */
export async function requireAdmin(): Promise<CurrentUser> {
  const me = await requireUser();
  if (!me.isAdmin) redirect("/");
  return me;
}
