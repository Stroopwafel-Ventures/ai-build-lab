/**
 * npm run validate:fixtures
 *
 * Sanity-checks the committed fixtures in seed/data against the fixture
 * contract (lib/fixtures.ts), the SQL schema and the seed spec:
 *   - counts within the expected ranges
 *   - every foreign key resolves
 *   - enum values match the SQL enums / check constraints
 *   - exactly one investment-team lead per portfolio company
 *   - exactly one current role per contact (except candidates between roles)
 *   - ~15% of contacts known by nobody
 *   - meeting notes are 700–1,200 words with the expected structure
 *   - every {{user:key}} token refers to a known key
 *   - no email outside .example / example.com
 *   - no participant names or emails (checked against seed/participants.local.json
 *     if it exists; names are never printed)
 *   - golden scenarios hold (best contact at strength 4–5, decoy weak or overlap-only)
 *
 * Exits with code 1 if any check fails.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  CompanyFixture, ContactFixture, DealTeamFixture, EmploymentFixture, JobFixture,
  MeetingNoteFixture, TeamFixture, UserContactFixture,
} from "../lib/fixtures";
import { GOLDEN_SPECS } from "../lib/generator/golden";
import { stableId } from "../lib/generator/ids";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "seed", "data");
const TODAY = "2026-10-14";

const failures: string[] = [];
const warnings: string[] = [];
let passed = 0;

function check(ok: boolean, message: string) {
  if (ok) passed++;
  else failures.push(message);
}
function between(n: number, lo: number, hi: number, label: string) {
  check(n >= lo && n <= hi, `${label}: ${n} not in [${lo}, ${hi}]`);
}
const load = <T,>(file: string): T[] => JSON.parse(readFileSync(path.join(DATA, file), "utf8"));
const daysBefore = (iso: string) => Math.round((Date.parse(`${TODAY}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86400000);

// ---------------------------------------------------------------------------
const companies = load<CompanyFixture>("companies.json");
const team = load<TeamFixture>("team.json");
const deal = load<DealTeamFixture>("company_deal_team.json");
const contacts = load<ContactFixture>("contacts.json");
const employment = load<EmploymentFixture>("contact_employment.json");
const userContacts = load<UserContactFixture>("user_contacts.json");
const jobs = load<JobFixture>("jobs.json");
const notes = load<MeetingNoteFixture>("meeting_notes.json");
const goldenDoc = readFileSync(path.join(ROOT, "seed", "GOLDEN_SCENARIOS.md"), "utf8");

const PARTICIPANT_KEYS = Array.from({ length: 17 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);
const INVESTMENT_KEYS = ["i01", "i02", "i03", "i04", "i05"];
const USER_KEYS = new Set([...PARTICIPANT_KEYS, ...team.map((t) => t.key)]);
const companyById = new Map(companies.map((c) => [c.id, c]));
const contactById = new Map(contacts.map((c) => [c.id, c]));

// --- Enums from the SQL schema ----------------------------------------------
const sql = readFileSync(path.join(ROOT, "supabase", "migrations", "0001_init.sql"), "utf8");
const enumType = (name: string) => {
  const m = sql.match(new RegExp(`create type ${name} as enum \\(([^)]*)\\)`));
  if (!m) throw new Error(`enum ${name} not found in SQL`);
  return new Set(m[1].split(",").map((s) => s.trim().replace(/'/g, "")));
};
const checkIn = (col: string) => {
  const m = sql.match(new RegExp(`${col} text[^\\n]*check \\(${col} in \\(([^)]*)\\)\\)`));
  if (!m) throw new Error(`check constraint for ${col} not found in SQL`);
  return new Set(m[1].split(",").map((s) => s.trim().replace(/'/g, "")));
};
const ENUM = {
  user_role: enumType("user_role"), company_kind: enumType("company_kind"), company_stage: enumType("company_stage"),
  deal_team_role: enumType("deal_team_role"), contact_type: enumType("contact_type"), meeting_type: enumType("meeting_type"),
  department: checkIn("department"), seniority: checkIn("seniority"), remote_policy: checkIn("remote_policy"),
  employment_type: checkIn("employment_type"), status: checkIn("status"),
};
const enumCheck = (values: (string | null)[], set: Set<string>, label: string) => {
  const bad = values.filter((v) => v !== null && !set.has(v));
  check(bad.length === 0, `${label}: invalid values ${[...new Set(bad)].slice(0, 5).join(", ")}`);
};
enumCheck(team.map((t) => t.role), ENUM.user_role, "team.role");
enumCheck(companies.map((c) => c.kind), ENUM.company_kind, "companies.kind");
enumCheck(companies.map((c) => c.stage), ENUM.company_stage, "companies.stage");
enumCheck(deal.map((d) => d.role), ENUM.deal_team_role, "company_deal_team.role");
enumCheck(contacts.map((c) => c.contact_type), ENUM.contact_type, "contacts.contact_type");
enumCheck(notes.map((n) => n.meeting_type), ENUM.meeting_type, "meeting_notes.meeting_type");
enumCheck(jobs.map((j) => j.department), ENUM.department, "jobs.department");
enumCheck(jobs.map((j) => j.seniority), ENUM.seniority, "jobs.seniority");
enumCheck(jobs.map((j) => j.remote_policy), ENUM.remote_policy, "jobs.remote_policy");
enumCheck(jobs.map((j) => j.employment_type), ENUM.employment_type, "jobs.employment_type");
enumCheck(jobs.map((j) => j.status), ENUM.status, "jobs.status");
check(contacts.every((c) => c.source === "seed"), "contacts.source must be 'seed'");
check(userContacts.every((u) => Number.isInteger(u.strength) && u.strength >= 1 && u.strength <= 5), "user_contacts.strength must be 1–5");

// --- Ids ----------------------------------------------------------------------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
for (const [label, rows] of [["companies", companies], ["contacts", contacts], ["contact_employment", employment], ["jobs", jobs], ["meeting_notes", notes]] as const) {
  const ids = rows.map((r) => r.id);
  check(ids.every((id) => UUID.test(id)), `${label}: every id is a UUID`);
  check(new Set(ids).size === ids.length, `${label}: ids are unique`);
}

// --- Counts -------------------------------------------------------------------
const byKind = (k: string) => companies.filter((c) => c.kind === k).length;
check(byKind("portfolio") === 50, `portfolio companies: ${byKind("portfolio")} (expected 50)`);
between(byKind("corporate"), 8, 14, "corporates");
between(byKind("investor"), 8, 12, "other VC funds");
between(byKind("startup"), 50, 70, "startups / scale-ups");
check(team.length === 5 && team.every((t) => INVESTMENT_KEYS.includes(t.key)), "team.json has i01–i05");
between(contacts.length, 420, 490, "contacts");
const typeCount = (t: string) => contacts.filter((c) => c.contact_type === t).length;
between(typeCount("portfolio_exec"), 115, 145, "portfolio execs");
between(typeCount("investor"), 32, 50, "investors");
between(typeCount("candidate"), 65, 95, "candidates");
between(typeCount("expert"), 32, 50, "experts");
between(typeCount("corporate"), 50, 75, "corporate contacts");
between(userContacts.length, 620, 800, "user_contacts");
between(jobs.length, 260, 340, "jobs");
between(notes.length, 110, 130, "meeting notes");
const portfolioNotes = notes.filter((n) => n.meeting_type === "portfolio_checkin" || n.meeting_type === "founder_catchup").length;
between(Math.round((portfolioNotes / notes.length) * 100), 55, 65, "% of notes with portfolio execs");

// --- Foreign keys ---------------------------------------------------------------
check(deal.every((d) => companyById.get(d.company_id)?.kind === "portfolio"), "deal team rows point at portfolio companies");
check(deal.every((d) => USER_KEYS.has(d.user_key)), "deal team user keys are known");
check(new Set(deal.map((d) => `${d.company_id}|${d.user_key}`)).size === deal.length, "deal team (company, user) pairs are unique");
check(jobs.every((j) => companyById.get(j.company_id)?.kind === "portfolio"), "jobs belong to portfolio companies");
check(contacts.every((c) => c.current_company_id === null || companyById.has(c.current_company_id)), "contacts.current_company_id resolves");
check(employment.every((e) => contactById.has(e.contact_id)), "contact_employment.contact_id resolves");
check(employment.every((e) => e.company_id === null || companyById.has(e.company_id)), "contact_employment.company_id resolves");
check(employment.every((e) => !!e.company_name), "contact_employment.company_name always populated");
check(userContacts.every((u) => contactById.has(u.contact_id) && USER_KEYS.has(u.user_key)), "user_contacts keys and contacts resolve");
check(new Set(userContacts.map((u) => `${u.user_key}|${u.contact_id}`)).size === userContacts.length, "user_contacts pairs are unique");
check(notes.every((n) => n.company_id === null || companyById.has(n.company_id)), "meeting_notes.company_id resolves");
check(notes.every((n) => USER_KEYS.has(n.created_by_key) && n.attendee_user_keys.every((k) => USER_KEYS.has(k))), "meeting note user keys are known");
check(notes.every((n) => n.attendee_contact_ids.every((id) => contactById.has(id))), "meeting note attendee contacts resolve");
check(notes.every((n) => n.attendee_user_keys.includes(n.created_by_key)), "note author is an attendee");

// --- Deal team leads --------------------------------------------------------------
for (const c of companies.filter((x) => x.kind === "portfolio")) {
  const leads = deal.filter((d) => d.company_id === c.id && d.role === "lead");
  check(leads.length === 1 && INVESTMENT_KEYS.includes(leads[0].user_key), `${c.name}: exactly one lead from i01–i05`);
  check(!!c.stage && !!c.invested_on, `${c.name}: portfolio company has stage and invested_on`);
  const n = jobs.filter((j) => j.company_id === c.id).length;
  check(n <= 12, `${c.name}: ${n} jobs (max 12)`);
}
check(companies.filter((c) => c.kind !== "portfolio").every((c) => c.stage === null && c.invested_on === null), "stage / invested_on only on portfolio companies");

// --- Employment & current roles ------------------------------------------------------
const empByContact = new Map<string, EmploymentFixture[]>();
for (const e of employment) empByContact.set(e.contact_id, [...(empByContact.get(e.contact_id) ?? []), e]);
let betweenRoles = 0;
for (const c of contacts) {
  const rows = empByContact.get(c.id) ?? [];
  check(rows.length >= 2 && rows.length <= 5, `${c.first_name} ${c.last_name}: ${rows.length} positions (expected 2–5)`);
  const current = rows.filter((r) => r.finished_on === null);
  if (current.length === 0) {
    betweenRoles++;
    check(c.contact_type === "candidate" && c.current_company_id === null && c.current_title === null, `${c.id}: no current role but not a between-roles candidate`);
  } else {
    check(current.length === 1, `${c.id}: ${current.length} current roles`);
    check(current[0].company_name === c.current_company_name && current[0].title === c.current_title, `${c.id}: current_* fields match the current position`);
  }
  for (const r of rows) {
    check(!r.started_on || !r.finished_on || r.started_on <= r.finished_on, `${r.id}: started_on after finished_on`);
    check(!r.finished_on || r.finished_on <= TODAY, `${r.id}: finished_on in the future`);
  }
}
between(betweenRoles, 1, 10, "candidates between roles");
const unlinked = employment.filter((e) => e.company_id === null && companies.some((c) => c.name === e.company_name)).length;
between(unlinked, 5, 30, "employment rows with null company_id but a matching company_name");

// --- Relationships --------------------------------------------------------------------
const known = new Set(userContacts.map((u) => u.contact_id));
const unknownPct = (contacts.filter((c) => !known.has(c.id)).length / contacts.length) * 100;
between(Math.round(unknownPct), 10, 20, "% of contacts known by nobody");
const mid = userContacts.filter((u) => u.strength === 2 || u.strength === 3).length / userContacts.length;
check(mid > 0.5, `strength skew: only ${(mid * 100).toFixed(0)}% of relationships are strength 2–3`);

// --- Jobs and notes dates ---------------------------------------------------------------
check(jobs.every((j) => daysBefore(j.posted_on) >= 0 && daysBefore(j.posted_on) <= 90), "jobs posted in the last 90 days");
check(jobs.filter((j) => j.status === "open").length / jobs.length > 0.6, "most jobs are open");
check(notes.every((n) => daysBefore(n.met_on) >= 0 && daysBefore(n.met_on) <= 366), "notes dated within the last 12 months");

// --- Meeting note structure ------------------------------------------------------------------
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const REQUIRED = ["### Attendees", "### Context", "### Asks & opportunities", "### Next steps"];
const wc = notes.map((n) => words(n.body));
for (const n of notes) {
  const w = words(n.body);
  check(w >= 700 && w <= 1200, `note ${n.id} (${n.title}): ${w} words`);
  const lines = n.body.split("\n");
  check(REQUIRED.every((h) => lines.filter((l) => l.trim() === h).length === 1), `note ${n.id}: required sections`);
  const topics = lines.filter((l) => l.startsWith("### ") && !REQUIRED.includes(l.trim())).length;
  check(topics >= 4 && topics <= 6, `note ${n.id}: ${topics} topic sections (expected 4–6)`);
  const steps = n.body.slice(n.body.indexOf("\n### Next steps\n") + 1).split("\n").slice(1).filter((l) => l.trim());
  check(steps.length > 0 && steps.every((l) => /^- \[ \] .+: .+ \(by .+\)$/.test(l)), `note ${n.id}: next steps format`);
  check(!/\[[^\]\n]*\|[^\]\n]*\]/.test(n.body), `note ${n.id}: unexpanded template choice`);
  check(!/\{[a-zA-Z]+\}/.test(n.body.replace(/\{\{user:[a-z0-9]+\}\}/g, "")), `note ${n.id}: unexpanded template variable`);
  for (const k of n.attendee_user_keys) check(n.body.includes(`{{user:${k}}}`), `note ${n.id}: attendee ${k} missing from body`);
  for (const id of n.attendee_contact_ids) {
    const c = contactById.get(id)!;
    check(n.body.includes(`${c.first_name} ${c.last_name}`), `note ${n.id}: attendee contact missing from body`);
  }
  check(!!n.summary && n.summary.length <= 420, `note ${n.id}: summary present and short`);
}

// --- Tokens, emails, names ---------------------------------------------------------------------
const files = ["companies.json", "team.json", "company_deal_team.json", "contacts.json", "contact_employment.json", "user_contacts.json", "jobs.json", "meeting_notes.json"];
const corpus: [string, string][] = [...files.map((f) => [f, readFileSync(path.join(DATA, f), "utf8")] as [string, string]), ["GOLDEN_SCENARIOS.md", goldenDoc]];
for (const [file, text] of corpus) {
  const badTokens = [...text.matchAll(/\{\{user:([a-z0-9]+)\}\}/g)].map((m) => m[1]).filter((k) => !USER_KEYS.has(k));
  check(badTokens.length === 0, `${file}: unknown {{user:…}} tokens ${[...new Set(badTokens)].join(", ")}`);
  const emails = [...text.matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)].map((m) => m[1].toLowerCase());
  const badEmails = emails.filter((d) => !d.endsWith(".example") && d !== "example.com" && !d.endsWith(".example.com"));
  check(badEmails.length === 0, `${file}: emails outside .example (${[...new Set(badEmails)].slice(0, 3).join(", ")})`);
  const urls = [...text.matchAll(/https?:\/\/([^/\s"')]+)/g)].map((m) => m[1].toLowerCase());
  const badUrls = urls.filter((h) => !h.endsWith(".example") && h !== "www.linkedin.com");
  check(badUrls.length === 0, `${file}: URLs outside .example / fictional LinkedIn (${[...new Set(badUrls)].slice(0, 3).join(", ")})`);
}
check(companies.every((c) => c.website === "" || /^https:\/\/[a-z0-9-]+\.example$/.test(c.website)), "company websites use .example");
check(contacts.every((c) => !c.linkedin_url || c.linkedin_url.startsWith("https://www.linkedin.com/in/fictional-")), "contact LinkedIn URLs are fictional");
// Investment-team names live in team.json only; everywhere else team members are tokens.
for (const t of team) {
  const leaks = corpus.filter(([f, text]) => f !== "team.json" && text.includes(t.full_name)).map(([f]) => f);
  check(leaks.length === 0, `${t.key}: full name appears outside team.json (${leaks.join(", ")})`);
}

// Real participant data: only checked when the local file exists; never printed.
const localPath = path.join(ROOT, "seed", "participants.local.json");
if (existsSync(localPath)) {
  const local = JSON.parse(readFileSync(localPath, "utf8")) as { key: string; full_name: string; email?: string; emails?: string[] }[];
  for (const p of local) {
    const needles = [p.full_name, ...(p.email ? [p.email] : []), ...(p.emails ?? [])].filter((s) => s && s.trim().length > 3).map((s) => s.toLowerCase());
    for (const [file, text] of corpus) {
      const lower = text.toLowerCase();
      check(!needles.some((n) => lower.includes(n)), `participant ${p.key}: name or email found in ${file}`);
    }
  }
  console.log(`Checked ${local.length} local participants against the fixtures (names not printed).`);
} else {
  warnings.push("seed/participants.local.json not found: participant-name check skipped.");
}

// --- Golden scenarios ----------------------------------------------------------------------------
const strengthOf = (contactId: string) => userContacts.filter((u) => u.contact_id === contactId);
const overlaps = (a: EmploymentFixture, b: EmploymentFixture) => (a.started_on ?? "") <= (b.finished_on ?? "9999") && (b.started_on ?? "") <= (a.finished_on ?? "9999");
for (const g of GOLDEN_SPECS) {
  const best = contactById.get(stableId(`contact:${g.best.slug}`));
  const decoy = contactById.get(stableId(`contact:${g.decoy.slug}`));
  check(!!best && !!decoy, `${g.key}: best and decoy contacts exist`);
  if (!best || !decoy) continue;
  const bestRows = strengthOf(best.id);
  check(bestRows.some((u) => u.user_key === g.warm.userKey && u.strength >= 4), `${g.key}: best contact reachable at strength 4–5 via ${g.warm.userKey}`);
  const decoyRows = strengthOf(decoy.id);
  if ("userKey" in g.decoyPath) {
    check(decoyRows.length > 0 && decoyRows.every((u) => u.strength <= 2), `${g.key}: decoy only reachable at strength 1–2`);
  } else {
    const overlapCompany = g.decoyPath.company;
    check(decoyRows.length === 0, `${g.key}: decoy known by nobody (overlap-only)`);
    const company = companies.find((c) => c.name === overlapCompany)!;
    const d = (empByContact.get(decoy.id) ?? []).filter((e) => e.company_id === company.id);
    const b = (empByContact.get(best.id) ?? []).filter((e) => e.company_id === company.id);
    check(d.some((x) => b.some((y) => overlaps(x, y))), `${g.key}: decoy overlaps with the best contact at ${company.name}`);
  }
  const company = companies.find((c) => c.name === g.company)!;
  if (g.job) {
    const job = jobs.find((j) => j.company_id === company.id && j.title === g.job![0]);
    check(job?.status === "open", `${g.key}: planted job "${g.job[0]}" exists and is open`);
  }
  const note = notes.find((n) => n.company_id === company.id && g.note.bullets.every((b) => n.body.includes(b.text)));
  check(!!note, `${g.key}: planted need is in a ${company.name} meeting note`);
  check(goldenDoc.includes(best.id) && goldenDoc.includes(decoy.id), `${g.key}: documented in GOLDEN_SCENARIOS.md`);
  // The planted contacts should never be name-dropped in other notes.
  const leaks = notes.filter((n) => n !== note && (n.body.includes(`${best.first_name} ${best.last_name}`) || n.body.includes(`${decoy.first_name} ${decoy.last_name}`)));
  check(leaks.length === 0, `${g.key}: golden contacts not mentioned in unrelated notes`);
}

// ---------------------------------------------------------------------------
console.log(`Notes: ${notes.length}, words min/avg/max ${Math.min(...wc)}/${Math.round(wc.reduce((a, b) => a + b, 0) / wc.length)}/${Math.max(...wc)}`);
console.log(`Counts: companies ${companies.length}, contacts ${contacts.length}, employment ${employment.length}, user_contacts ${userContacts.length}, jobs ${jobs.length}, deal team ${deal.length}`);
console.log(`Unknown contacts: ${unknownPct.toFixed(1)}%, between roles: ${betweenRoles}, unlinked employment rows: ${unlinked}`);
for (const w of warnings) console.log(`warning: ${w}`);
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed (${passed} passed):`);
  for (const f of failures.slice(0, 50)) console.error(`  ✗ ${f}`);
  if (failures.length > 50) console.error(`  … and ${failures.length - 50} more`);
  process.exit(1);
}
console.log(`\nAll ${passed} checks passed.`);
