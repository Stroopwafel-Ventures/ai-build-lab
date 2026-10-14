import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * List queries shared by the list pages AND their CSV exports, so the
 * download always matches what's on screen. Each takes the page's search
 * params and returns { rows, total }. Pass page = null to get everything.
 */
export type Params = Record<string, string | string[] | undefined>;
export { PAGE_SIZE } from "@/lib/constants";
import { PAGE_SIZE } from "@/lib/constants";

export const str = (p: Params, k: string) => {
  const v = p[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() || "";
};
const pageOf = (p: Params) => Math.max(1, Number(str(p, "page")) || 1);
const ilike = (q: string) => `%${q.replace(/[%_,()]/g, " ")}%`;

function paginate<T extends { range: (a: number, b: number) => T }>(query: T, page: number | null) {
  if (page === null) return query.range(0, 9999);
  return query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
}

// ---------------------------------------------------------------- companies
export async function listCompanies(p: Params, all = false) {
  const supabase = await createClient();
  let q = supabase
    .from("companies")
    .select("id, name, kind, industry, stage, hq_location, employee_count_range, invested_on, website, jobs(count)", { count: "exact" })
    .order("name");
  const search = str(p, "q");
  if (search) q = q.or(`name.ilike.${ilike(search)},industry.ilike.${ilike(search)},description.ilike.${ilike(search)}`);
  if (str(p, "kind")) q = q.eq("kind", str(p, "kind"));
  if (str(p, "stage")) q = q.eq("stage", str(p, "stage"));
  if (str(p, "industry")) q = q.eq("industry", str(p, "industry"));
  const { data, count, error } = await paginate(q, all ? null : pageOf(p));
  if (error) throw error;
  const rows = (data ?? []).map((c) => ({
    ...c,
    job_count: (c.jobs as unknown as { count: number }[])?.[0]?.count ?? 0,
    jobs: undefined,
  }));
  return { rows, total: count ?? 0 };
}

// ---------------------------------------------------------------- jobs
export async function listJobs(p: Params, all = false) {
  const supabase = await createClient();
  let q = supabase
    .from("jobs")
    .select("id, title, department, seniority, location, remote_policy, employment_type, status, posted_on, company_id, companies(name)", { count: "exact" })
    .order("posted_on", { ascending: false });
  const search = str(p, "q");
  if (search) q = q.or(`title.ilike.${ilike(search)},description.ilike.${ilike(search)},location.ilike.${ilike(search)}`);
  for (const k of ["department", "seniority", "remote_policy", "employment_type", "company_id"]) {
    if (str(p, k)) q = q.eq(k, str(p, k));
  }
  q = q.eq("status", str(p, "status") || "open");
  const { data, count, error } = await paginate(q, all ? null : pageOf(p));
  if (error) throw error;
  const rows = (data ?? []).map((j) => ({
    ...j,
    company_name: (j.companies as unknown as { name: string } | null)?.name ?? "",
    companies: undefined,
  }));
  return { rows, total: count ?? 0 };
}

// ---------------------------------------------------------------- contacts
export async function listContacts(p: Params, all = false, myUserId?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("contacts")
    .select("id, first_name, last_name, email, current_title, current_company_name, current_company_id, contact_type, location, expertise_tags, linkedin_url, user_contacts(strength, user_id)", { count: "exact" })
    .order("last_name")
    .order("first_name");
  const search = str(p, "q");
  if (search) q = q.textSearch("search", search, { type: "websearch", config: "english" });
  if (str(p, "type")) q = q.eq("contact_type", str(p, "type"));
  if (str(p, "tag")) q = q.contains("expertise_tags", [str(p, "tag")]);
  if (str(p, "company_id")) q = q.eq("current_company_id", str(p, "company_id"));

  // "known" filter: me | anyone | nobody. Done in two steps because
  // PostgREST can't express "has no related rows" directly.
  const known = str(p, "known");
  if (known) {
    let rel = supabase.from("user_contacts").select("contact_id").range(0, 9999);
    if (known === "me" && myUserId) rel = rel.eq("user_id", myUserId);
    const { data: relRows } = await rel;
    const ids = [...new Set((relRows ?? []).map((r) => r.contact_id))];
    if (known === "nobody") q = q.not("id", "in", `(${ids.join(",") || "00000000-0000-0000-0000-000000000000"})`);
    else q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, count, error } = await paginate(q, all ? null : pageOf(p));
  if (error) throw error;
  const rows = (data ?? []).map((c) => {
    const rels = (c.user_contacts ?? []) as { strength: number; user_id: string }[];
    return {
      ...c,
      known_by_count: rels.length,
      max_strength: rels.reduce((m, r) => Math.max(m, r.strength), 0) || null,
      my_strength: rels.find((r) => r.user_id === myUserId)?.strength ?? null,
      user_contacts: undefined,
    };
  });
  return { rows, total: count ?? 0 };
}

// ---------------------------------------------------------------- users
export async function listUsers(p: Params) {
  const supabase = await createClient();
  let q = supabase
    .from("users")
    .select("id, key, full_name, title, role, is_participant, avatar_initials, source, user_contacts(count)", { count: "exact" })
    .order("is_participant")
    .order("full_name");
  const search = str(p, "q");
  if (search) q = q.or(`full_name.ilike.${ilike(search)},title.ilike.${ilike(search)}`);
  if (str(p, "role")) q = q.eq("role", str(p, "role"));
  const { data, count, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((u) => ({
    ...u,
    contact_count: (u.user_contacts as unknown as { count: number }[])?.[0]?.count ?? 0,
    user_contacts: undefined,
  }));
  return { rows, total: count ?? 0 };
}

// ---------------------------------------------------------------- notes
export async function listNotes(p: Params, all = false) {
  const supabase = await createClient();
  let q = supabase
    .from("meeting_notes")
    .select("id, met_on, title, meeting_type, summary, company_id, companies(name), created_by, users(full_name)", { count: "exact" })
    .order("met_on", { ascending: false });
  const search = str(p, "q");
  if (search) q = q.textSearch("search", search, { type: "websearch", config: "english" });
  if (str(p, "type")) q = q.eq("meeting_type", str(p, "type"));
  if (str(p, "company_id")) q = q.eq("company_id", str(p, "company_id"));
  if (str(p, "created_by")) q = q.eq("created_by", str(p, "created_by"));
  const { data, count, error } = await paginate(q, all ? null : pageOf(p));
  if (error) throw error;
  const rows = (data ?? []).map((n) => ({
    ...n,
    company_name: (n.companies as unknown as { name: string } | null)?.name ?? "",
    created_by_name: (n.users as unknown as { full_name: string } | null)?.full_name ?? "",
    companies: undefined,
    users: undefined,
  }));
  return { rows, total: count ?? 0 };
}
