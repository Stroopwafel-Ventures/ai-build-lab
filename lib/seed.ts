/**
 * Loads the committed fixtures (seed/data/*.json) into Supabase.
 * Used by `npm run seed` (scripts/seed.ts) and the admin "Re-seed" button.
 *
 *  - Wipes app data tables via reset_app_data() (never users or logins).
 *  - Upserts the fictional investment team (i01–i05) by key.
 *  - Resolves participant keys (p01…) to users.id. Rows for keys that
 *    don't exist yet are skipped and reported.
 *  - Replaces {{user:p04}} tokens in note bodies with real names, at load
 *    time, so names never live in git.
 * Safe to re-run any time.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompanyFixture, ContactFixture, DealTeamFixture, EmploymentFixture, JobFixture,
  MeetingNoteFixture, TeamFixture, UserContactFixture,
} from "@/lib/fixtures";
import companies from "@/seed/data/companies.json";
import team from "@/seed/data/team.json";
import dealTeam from "@/seed/data/company_deal_team.json";
import jobs from "@/seed/data/jobs.json";
import contacts from "@/seed/data/contacts.json";
import employment from "@/seed/data/contact_employment.json";
import userContacts from "@/seed/data/user_contacts.json";
import notes from "@/seed/data/meeting_notes.json";

export interface SeedReport {
  counts: Record<string, number>;
  skipped: string[];
}

async function insertBatches(db: SupabaseClient, table: string, rows: object[], size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return rows.length;
}

export async function loadFixtures(db: SupabaseClient, log: (msg: string) => void = () => {}): Promise<SeedReport> {
  const counts: Record<string, number> = {};
  const skipped: string[] = [];

  // 1. Investment team (fictional). Upsert by key, never delete.
  const teamRows = (team as unknown as TeamFixture[]).map((t) => ({ ...t, is_participant: false, source: "seed" }));
  const { error: teamErr } = await db.from("users").upsert(teamRows, { onConflict: "key" });
  if (teamErr) throw teamErr;

  // 2. Key → id map for everyone currently in users.
  const { data: users, error: usersErr } = await db.from("users").select("id, key, full_name");
  if (usersErr) throw usersErr;
  const byKey = new Map(users!.map((u) => [u.key as string, u as { id: string; key: string; full_name: string }]));
  const idOf = (key: string, where: string) => {
    const u = byKey.get(key);
    if (!u) skipped.push(`${where}: unknown user key ${key}`);
    return u?.id;
  };

  // 3. Wipe app data (users + logins untouched).
  log("Resetting app data…");
  const { error: resetErr } = await db.rpc("reset_app_data");
  if (resetErr) throw resetErr;

  // 4. Insert in dependency order.
  counts.companies = await insertBatches(db, "companies", companies as unknown as CompanyFixture[]);
  log(`companies: ${counts.companies}`);

  counts.company_deal_team = await insertBatches(
    db, "company_deal_team",
    (dealTeam as unknown as DealTeamFixture[]).flatMap((d) => {
      const user_id = idOf(d.user_key, "deal team");
      return user_id ? [{ company_id: d.company_id, user_id, role: d.role }] : [];
    }),
  );
  counts.jobs = await insertBatches(db, "jobs", jobs as unknown as JobFixture[]);
  counts.contacts = await insertBatches(db, "contacts", contacts as unknown as ContactFixture[]);
  counts.contact_employment = await insertBatches(db, "contact_employment", employment as unknown as EmploymentFixture[]);
  log(`jobs: ${counts.jobs}, contacts: ${counts.contacts}, employment: ${counts.contact_employment}`);

  counts.user_contacts = await insertBatches(
    db, "user_contacts",
    (userContacts as unknown as UserContactFixture[]).flatMap((r) => {
      const user_id = idOf(r.user_key, "user_contacts");
      return user_id ? [{ user_id, contact_id: r.contact_id, strength: r.strength }] : [];
    }),
  );

  const nameOf = (key: string) => byKey.get(key)?.full_name ?? "a Stroopwafel teammate";
  const noteRows = (notes as unknown as MeetingNoteFixture[]).map((n) => ({
    id: n.id,
    met_on: n.met_on,
    title: n.title.replace(/\{\{user:(\w+)\}\}/g, (_, k) => nameOf(k)),
    meeting_type: n.meeting_type,
    company_id: n.company_id,
    summary: n.summary.replace(/\{\{user:(\w+)\}\}/g, (_, k) => nameOf(k)),
    body: n.body.replace(/\{\{user:(\w+)\}\}/g, (_, k) => nameOf(k)),
    created_by: byKey.get(n.created_by_key)?.id ?? null,
  }));
  counts.meeting_notes = await insertBatches(db, "meeting_notes", noteRows, 100);
  counts.meeting_note_users = await insertBatches(
    db, "meeting_note_users",
    (notes as unknown as MeetingNoteFixture[]).flatMap((n) =>
      [...new Set(n.attendee_user_keys)].flatMap((k) => {
        const user_id = idOf(k, `note ${n.id}`);
        return user_id ? [{ note_id: n.id, user_id }] : [];
      }),
    ),
  );
  counts.meeting_note_contacts = await insertBatches(
    db, "meeting_note_contacts",
    (notes as unknown as MeetingNoteFixture[]).flatMap((n) => [...new Set(n.attendee_contact_ids)].map((contact_id) => ({ note_id: n.id, contact_id }))),
  );
  log(`relationships: ${counts.user_contacts}, notes: ${counts.meeting_notes}`);

  return { counts, skipped: [...new Set(skipped)] };
}

// ---------------------------------------------------------------------------
// "Give this person a starter network": ~30 random contacts matching their role.
// ---------------------------------------------------------------------------
const AFFINITY: Record<string, string[]> = {
  investment: ["portfolio_exec", "investor"],
  talent: ["candidate", "operator", "portfolio_exec"],
  partnerships: ["corporate", "expert"],
  community: ["corporate", "expert", "operator"],
  platform: ["portfolio_exec", "expert", "operator", "corporate"],
  operations: ["operator", "portfolio_exec", "expert"],
  admin: ["portfolio_exec", "investor", "expert", "corporate"],
};

export async function giveStarterNetwork(db: SupabaseClient, userId: string, size = 30) {
  const { data: user } = await db.from("users").select("role").eq("id", userId).single();
  const types = AFFINITY[user?.role ?? "platform"] ?? AFFINITY.platform;
  const [{ data: matching }, { data: others }, { data: existing }] = await Promise.all([
    db.from("contacts").select("id").in("contact_type", types).range(0, 9999),
    db.from("contacts").select("id").not("contact_type", "in", `(${types.join(",")})`).range(0, 9999),
    db.from("user_contacts").select("contact_id").eq("user_id", userId),
  ]);
  const have = new Set((existing ?? []).map((r) => r.contact_id));
  const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
  // ~80% from the role's usual contact types, ~20% from anywhere.
  const picks = [
    ...shuffle((matching ?? []).filter((c) => !have.has(c.id))).slice(0, Math.round(size * 0.8)),
    ...shuffle((others ?? []).filter((c) => !have.has(c.id))).slice(0, Math.round(size * 0.2)),
  ];
  const strength = () => {
    const r = Math.random();
    return r < 0.1 ? 1 : r < 0.45 ? 2 : r < 0.8 ? 3 : r < 0.95 ? 4 : 5;
  };
  const rows = picks.map((c) => ({ user_id: userId, contact_id: c.id, strength: strength() }));
  if (rows.length) {
    const { error } = await db.from("user_contacts").upsert(rows, { onConflict: "user_id,contact_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  return rows.length;
}
