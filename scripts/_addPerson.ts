/** Shared by add-user and add-users: Supabase + local participant file. */
import fs from "node:fs";
import { createServiceClient } from "@/lib/supabase/service";
import { addParticipant, nextParticipantKey, normalizeRole } from "@/lib/participants";
import { LOCAL_FILE, emailsOf, readParticipants, type ParticipantEntry } from "./_participants";

export async function addPersonEverywhere(input: { full_name: string; emails: string[]; title?: string; role?: string; key?: string }) {
  const db = createServiceClient();
  const local: ParticipantEntry[] = fs.existsSync(LOCAL_FILE) ? readParticipants(LOCAL_FILE) : [];
  const emails = input.emails.map((e) => e.trim().toLowerCase());

  // Same person already in the local file (by key or email)? Reuse their key.
  const sameName = local.filter((p) => p.full_name.trim().toLowerCase() === input.full_name.trim().toLowerCase());
  const existing =
    local.find((p) => p.key === input.key || emailsOf(p).some((e) => emails.includes(e))) ??
    (!input.key && sameName.length === 1 ? sameName[0] : undefined);
  const key = input.key ?? existing?.key ?? (await nextParticipantKey(db, local.map((p) => p.key)));

  const result = await addParticipant(db, {
    key, full_name: input.full_name, title: input.title ?? existing?.title ?? null,
    role: input.role ?? existing?.role, emails, source: "seed",
  });

  // Write back to the git-ignored local file.
  const entry: ParticipantEntry = existing ?? { key: result.key, full_name: input.full_name };
  entry.full_name = input.full_name;
  if (input.title) entry.title = input.title;
  entry.role = normalizeRole(input.role ?? entry.role);
  const all = [...new Set([...emailsOf(entry), ...emails])];
  delete entry.email;
  delete entry.emails;
  if (all.length === 1) entry.email = all[0];
  else entry.emails = all;
  if (!existing) local.push(entry);
  local.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  fs.writeFileSync(LOCAL_FILE, "[\n" + local.map((p) => "  " + JSON.stringify(p)).join(",\n") + "\n]\n");

  return result;
}
