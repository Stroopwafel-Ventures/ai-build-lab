"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addParticipant, parseBulkLines, removeLogin } from "@/lib/participants";
import { giveStarterNetwork } from "@/lib/seed";

export interface ActionState {
  ok?: string;
  error?: string;
}

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function addPersonAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const emails = s(form, "emails").split(/[\s,;]+/).filter(Boolean);
    if (!emails.length) return { error: "At least one email is required" };
    const r = await addParticipant(createAdminClient(), {
      full_name: s(form, "full_name"),
      title: s(form, "title") || null,
      role: s(form, "role"),
      emails,
      source: "admin",
    });
    revalidatePath("/admin/people");
    return { ok: `${r.created ? "Added" : "Updated"} ${s(form, "full_name")} (${r.key}). ${r.warnings.join(" ")}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addEmailAction(form: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: user } = await db.from("users").select("*").eq("id", s(form, "user_id")).single();
  if (!user || !s(form, "email")) return;
  await addParticipant(db, { key: user.key, full_name: user.full_name, title: user.title, role: user.role, emails: [s(form, "email")], is_participant: user.is_participant });
  revalidatePath("/admin/people");
}

export async function removeEmailAction(form: FormData) {
  await requireAdmin();
  await removeLogin(createAdminClient(), s(form, "email"));
  revalidatePath("/admin/people");
}

export async function bulkAddAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const lines = parseBulkLines(s(form, "bulk")).filter((l) => !l.error);
  if (!lines.length) return { error: "Nothing to add" };
  const db = createAdminClient();
  const done: string[] = [];
  const problems: string[] = [];
  for (const l of lines) {
    try {
      const r = await addParticipant(db, { full_name: l.full_name, title: l.title, role: l.role, emails: l.emails, source: "admin" });
      done.push(`${l.full_name} (${r.key})`);
      problems.push(...r.warnings);
    } catch (e) {
      problems.push(`${l.line}: ${(e as Error).message}`);
    }
  }
  revalidatePath("/admin/people");
  return { ok: `Added/updated ${done.length}: ${done.join(", ")}`, error: problems.join(" · ") || undefined };
}

export async function starterNetworkAction(form: FormData) {
  await requireAdmin();
  await giveStarterNetwork(createAdminClient(), s(form, "user_id"));
  revalidatePath("/admin/people");
}
