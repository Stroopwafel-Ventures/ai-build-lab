/**
 * addParticipant(): the ONE function every "add a person" path uses
 * (admin page, CLI, seed script). It is idempotent:
 *   - upserts the `users` row (matched by key, then any of the emails, then
 *     an unambiguous exact full name)
 *   - creates a confirmed Supabase auth user for each email that lacks one
 *   - links each email in `user_logins`
 * Calling it again with a new email just adds that email.
 *
 * Takes a service-role client so it works from both Next.js and scripts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/fixtures";

export const ROLES: UserRole[] = [
  "investment", "platform", "talent", "community", "partnerships", "operations", "admin",
];

export interface ParticipantInput {
  key?: string;
  full_name: string;
  title?: string | null;
  role?: UserRole | string | null;
  emails: string[];
  source?: "seed" | "admin";
  is_participant?: boolean;
}

export interface AddParticipantResult {
  user_id: string;
  key: string;
  created: boolean;
  emailsAdded: string[];
  warnings: string[];
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .filter((c) => /[A-Z]/.test(c))
    .slice(0, 2)
    .join("") || "?";
}

export function normalizeRole(role: string | null | undefined): UserRole {
  const r = (role ?? "").trim().toLowerCase();
  return (ROLES as string[]).includes(r) ? (r as UserRole) : "platform";
}

/** Next free participant key: p18, p19, … */
export async function nextParticipantKey(db: SupabaseClient, alsoTaken: string[] = []) {
  const { data } = await db.from("users").select("key").like("key", "p%");
  const nums = [...(data ?? []).map((r) => r.key as string), ...alsoTaken]
    .map((k) => Number(k.replace(/^p/, "")))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `p${String(next).padStart(2, "0")}`;
}

/** Find an auth user by email (the admin API has no direct lookup). */
async function findAuthUserId(db: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** Create (or find) a confirmed auth user for this email. */
async function ensureAuthUser(db: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (data?.user) return data.user.id;
  const existing = await findAuthUserId(db, email);
  if (existing) return existing;
  throw error ?? new Error(`Could not create auth user for ${email}`);
}

export async function addParticipant(
  db: SupabaseClient,
  input: ParticipantInput,
): Promise<AddParticipantResult> {
  const warnings: string[] = [];
  const emails = [...new Set(input.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!input.full_name?.trim()) throw new Error("full_name is required");

  // 1. Find the existing person: by key first, then by any linked email.
  let existing: { id: string; key: string } | null = null;
  if (input.key) {
    const { data } = await db.from("users").select("id, key").eq("key", input.key).maybeSingle();
    existing = data;
  }
  if (!existing && emails.length) {
    const { data } = await db
      .from("user_logins").select("user_id, users(id, key)").in("email", emails).limit(1).maybeSingle();
    existing = (data?.users as unknown as { id: string; key: string } | null) ?? null;
  }
  if (!existing && !input.key) {
    // Last resort: same full name (case-insensitive), only if unambiguous.
    const { data } = await db.from("users").select("id, key").ilike("full_name", input.full_name.trim().replace(/[%_]/g, ""));
    if (data?.length === 1) existing = data[0]!;
  }

  // 2. Upsert the users row.
  const key = existing?.key ?? input.key ?? (await nextParticipantKey(db));
  const row = {
    key,
    full_name: input.full_name.trim(),
    title: input.title ?? null,
    role: normalizeRole(input.role),
    is_participant: input.is_participant ?? true,
    avatar_initials: initialsOf(input.full_name),
    source: input.source ?? "admin",
  };
  let userId: string;
  if (existing) {
    // Keep the original source so admin-added people stay "admin".
    const { source: _ignored, ...update } = row;
    void _ignored;
    const { error } = await db.from("users").update(update).eq("id", existing.id);
    if (error) throw error;
    userId = existing.id;
  } else {
    const { data, error } = await db.from("users").insert(row).select("id").single();
    if (error) throw error;
    userId = data.id;
  }

  // 3. Make sure every email has a confirmed auth user and a login row.
  const emailsAdded: string[] = [];
  for (const email of emails) {
    const { data: login } = await db
      .from("user_logins").select("user_id, auth_user_id").eq("email", email).maybeSingle();
    if (login && login.user_id !== userId) {
      warnings.push(`${email} already belongs to another person; skipped`);
      continue;
    }
    if (login?.auth_user_id) continue; // already fully linked
    const authUserId = await ensureAuthUser(db, email);
    const { error } = await db
      .from("user_logins")
      .upsert({ email, user_id: userId, auth_user_id: authUserId }, { onConflict: "email" });
    if (error) throw error;
    emailsAdded.push(email);
  }

  return { user_id: userId, key, created: !existing, emailsAdded, warnings };
}

/** Unlink an email and delete its auth user, so it can no longer sign in. */
export async function removeLogin(db: SupabaseClient, email: string) {
  const e = email.trim().toLowerCase();
  const { data: login } = await db.from("user_logins").select("auth_user_id").eq("email", e).maybeSingle();
  await db.from("user_logins").delete().eq("email", e);
  if (login?.auth_user_id) await db.auth.admin.deleteUser(login.auth_user_id);
}

// ---------------------------------------------------------------------------
// Bulk paste parsing. Accepts one person per line in any of these formats:
//   Jane Doe <jane@x.com>
//   jane@x.com
//   Jane Doe, Platform Lead, platform, jane@x.com[, alt@y.com]
// ---------------------------------------------------------------------------
export interface ParsedLine {
  line: string;
  full_name: string;
  title: string | null;
  role: UserRole;
  emails: string[];
  error?: string;
}

const EMAIL_RE = /[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/g;

function nameFromEmail(email: string) {
  return email
    .split("@")[0]!
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(" ");
}

export function parseBulkLines(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((line) => {
      const emails = (line.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase());
      if (!emails.length) {
        return { line, full_name: "", title: null, role: "platform", emails, error: "No email found" };
      }
      // "Name <email>"
      const angle = line.match(/^(.*?)<[^>]+>/);
      if (angle && !line.includes(",")) {
        const name = angle[1]!.trim().replace(/^"|"$/g, "");
        return { line, full_name: name || nameFromEmail(emails[0]!), title: null, role: "platform", emails };
      }
      // "Name, Title, role, email[, email]"
      if (line.includes(",")) {
        const parts = line.split(",").map((p) => p.trim()).filter((p) => !p.match(EMAIL_RE));
        const [name, title, role] = parts;
        return {
          line,
          full_name: name || nameFromEmail(emails[0]!),
          title: title || null,
          role: normalizeRole(role),
          emails,
        };
      }
      // bare email
      return { line, full_name: nameFromEmail(emails[0]!), title: null, role: "platform", emails };
    });
}
