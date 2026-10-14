/**
 * Optional prose enrichment with Claude.
 *
 * The deterministic generator already produces complete, valid fixtures.
 * When ANTHROPIC_API_KEY is set (and --offline is not passed), this module
 * asks Claude to REWRITE the prose fields so they read more naturally:
 *
 *   companies.description, jobs.description, contacts.summary,
 *   meeting_notes.summary + meeting_notes.body
 *
 * The skeleton never changes: ids, links, counts, attendees, dates, planted
 * needs and {{user:key}} tokens stay exactly as generated. Every rewritten
 * item is validated; anything that fails validation keeps its template text.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ContactFixture, JobFixture, MeetingNoteFixture } from "../fixtures";
import type { World } from "./types";

const model = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const CONCURRENCY = 4;

const SYSTEM = `You write prose for a FICTIONAL dataset used in a hands-on workshop about AI matching and warm introductions at "Stroopwafel Ventures", a fictional early-stage VC fund in Amsterdam.

Hard rules:
- Everything is fictional. Never mention real companies, brands, products, funds, universities, conferences, regulators' staff or people. Only use organisation and person names that appear in the input.
- Never write email addresses, phone numbers or URLs.
- Stroopwafel team members appear as tokens like {{user:p04}} or {{user:i02}}. Copy tokens exactly. Never replace a token with a name and never invent a new token.
- Keep every number, date, job title, company name and person name that the input gives you consistent; you may rephrase around them.
- Reply with JSON only, no commentary, in exactly the shape requested.`;

type Log = (msg: string) => void;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/** One request → parsed JSON `{ items: [...] }`, or null if anything goes wrong. */
async function askForItems<T>(instructions: string, payload: unknown, maxTokens: number, log: Log): Promise<T[] | null> {
  try {
    const stream = getClient().messages.stream({
      model: model(),
      max_tokens: maxTokens,
      system: SYSTEM,
      messages: [{ role: "user", content: `${instructions}\n\nReply as {"items": [...]}.\n\nINPUT:\n${JSON.stringify(payload, null, 1)}` }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal" || msg.stop_reason === "max_tokens") {
      log(`  ! ${msg.stop_reason}; keeping template text for this batch`);
      return null;
    }
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as { items?: T[] };
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) log(`  ! API error ${err.status}: ${err.message}`);
    else log(`  ! could not parse reply: ${(err as Error).message}`);
    return null;
  }
}

/** Run async jobs with a small concurrency limit. */
async function pool<T>(items: T[], worker: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }));
}

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const clean = (s: string) => !/@|https?:\/\/|www\./i.test(s);
const tokens = (s: string) => new Set(s.match(/\{\{user:[a-z0-9]+\}\}/g) ?? []);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

// ---------------------------------------------------------------------------

export async function enrichCompanies(world: World, log: Log) {
  const batches = chunk(world.companies, 20);
  let ok = 0;
  await pool(batches, async (batch, i) => {
    log(`  companies batch ${i + 1}/${batches.length}`);
    const payload = batch.map((c) => ({ id: c.id, name: c.name, kind: c.kind, industry: c.industry, hq: c.hq_location, stage: c.stage, size: c.employee_count_range, product: world.companyMeta[c.id].product, current: c.description }));
    const items = await askForItems<{ id: string; description: string }>(
      "Rewrite each company's description: 1–3 sentences, at most 60 words, concrete and plausible, no hype. Keep the company name and what it does.",
      payload, 8000, log);
    for (const it of items ?? []) {
      const c = batch.find((x) => x.id === it.id);
      if (!c || typeof it.description !== "string") continue;
      const d = it.description.trim();
      if (d && words(d) <= 70 && clean(d) && !d.includes("{{") && d.includes(c.name.split(" ")[0])) { c.description = d; ok++; }
    }
  });
  log(`  companies: ${ok}/${world.companies.length} descriptions rewritten`);
}

export async function enrichJobs(world: World, log: Log) {
  const batches = chunk(world.jobs, 8);
  const companyById = new Map(world.companies.map((c) => [c.id, c]));
  let ok = 0;
  await pool(batches, async (batch, i) => {
    log(`  jobs batch ${i + 1}/${batches.length}`);
    const payload = batch.map((j: JobFixture) => {
      const c = companyById.get(j.company_id)!;
      return { id: j.id, company: c.name, company_description: c.description, stage: c.stage, title: j.title, department: j.department, seniority: j.seniority, location: j.location, remote_policy: j.remote_policy, employment_type: j.employment_type, current: j.description };
    });
    const items = await askForItems<{ id: string; description: string }>(
      "Rewrite each job description as 2–4 short paragraphs separated by a blank line: about the company, what the person will do, who we are looking for, and (optionally) practicalities. Plain text, no bullet lists, no salary numbers. Keep the title, location, remote policy and employment type consistent.",
      payload, 16000, log);
    for (const it of items ?? []) {
      const j = batch.find((x) => x.id === it.id);
      if (!j || typeof it.description !== "string") continue;
      const d = it.description.trim();
      const paras = d.split(/\n\s*\n/).length;
      const co = companyById.get(j.company_id)!.name;
      if (paras >= 2 && paras <= 4 && clean(d) && d.includes(co) && !d.includes("{{") && words(d) < 450) { j.description = d; ok++; }
    }
  });
  log(`  jobs: ${ok}/${world.jobs.length} descriptions rewritten`);
}

export async function enrichContacts(world: World, log: Log) {
  const targets = world.contacts.filter((c) => c.summary);
  const batches = chunk(targets, 25);
  const byContact = new Map<string, typeof world.employment>();
  for (const e of world.employment) byContact.set(e.contact_id, [...(byContact.get(e.contact_id) ?? []), e]);
  let ok = 0;
  await pool(batches, async (batch, i) => {
    log(`  contacts batch ${i + 1}/${batches.length}`);
    const payload = batch.map((c: ContactFixture) => ({
      id: c.id, name: `${c.first_name} ${c.last_name}`, type: c.contact_type, title: c.current_title, company: c.current_company_name,
      positions: (byContact.get(c.id) ?? []).map((e) => ({ title: e.title, company: e.company_name, from: e.started_on, to: e.finished_on })),
      tags: c.expertise_tags, current: c.summary,
    }));
    const items = await askForItems<{ id: string; summary: string }>(
      "Rewrite each person's LinkedIn 'About' summary in the first person: 2–3 sentences, at most 70 words, grounded only in their listed positions and tags. Vary tone and structure between people.",
      payload, 12000, log);
    for (const it of items ?? []) {
      const c = batch.find((x) => x.id === it.id);
      if (!c || typeof it.summary !== "string") continue;
      const s = it.summary.trim();
      if (s && words(s) <= 80 && clean(s) && !s.includes("{{")) { c.summary = s; ok++; }
    }
  });
  log(`  contacts: ${ok}/${targets.length} summaries rewritten`);
}

const REQUIRED = ["### Attendees", "### Context", "### Asks & opportunities", "### Next steps"];

/** Validate a rewritten note against its template skeleton. Returns a reason on failure. */
export function checkNoteRewrite(original: MeetingNoteFixture, body: string, summary: string, planted: string[]): string | null {
  for (const h of REQUIRED) if (body.split("\n").filter((l) => l.trim() === h).length !== 1) return `missing or duplicate "${h}"`;
  const topics = body.split("\n").filter((l) => l.startsWith("### ") && !REQUIRED.includes(l.trim())).length;
  if (topics < 4 || topics > 6) return `${topics} topic sections`;
  const w = words(body);
  if (w < 700 || w > 1200) return `${w} words`;
  const before = tokens(original.body);
  for (const t of tokens(body)) if (!before.has(t)) return `new token ${t}`;
  for (const k of original.attendee_user_keys) if (!body.includes(`{{user:${k}}}`)) return `lost attendee token ${k}`;
  if (!clean(body) || !clean(summary)) return "email or URL";
  const steps = body.slice(body.indexOf("\n### Next steps\n") + 1).split("\n").slice(1).filter((l) => l.trim());
  if (!steps.length || !steps.every((l) => /^- \[ \] .+: .+ \(by .+\)$/.test(l))) return "next steps format";
  for (const p of planted) if (!body.includes(p)) return "planted need text changed";
  if (!summary || summary.length > 420) return "summary length";
  return null;
}

export async function enrichNotes(world: World, log: Log, only?: Set<string>) {
  const targets = world.notes.filter((n) => !only || only.has(n.id));
  const batches = chunk(targets, 3);
  const companyById = new Map(world.companies.map((c) => [c.id, c]));
  let ok = 0;
  await pool(batches, async (batch, i) => {
    log(`  notes batch ${i + 1}/${batches.length}`);
    const payload = batch.map((n) => {
      const co = n.company_id ? companyById.get(n.company_id) : null;
      const golden = world.golden.find((g) => g.noteId === n.id);
      return {
        id: n.id, meeting_type: n.meeting_type, met_on: n.met_on, title: n.title,
        company: co ? { name: co.name, kind: co.kind, industry: co.industry, stage: co.stage, description: co.description } : null,
        attendees: n.body.slice(n.body.indexOf("### Attendees"), n.body.indexOf("### Context")).trim(),
        jobs_at_company: co ? world.jobs.filter((j) => j.company_id === co.id).map((j) => ({ title: j.title, status: j.status, posted_on: j.posted_on, location: j.location })) : [],
        planted_need_bullets_keep_verbatim: golden ? golden.noteNeedText : [],
        current_summary: n.summary,
        current_body: n.body,
      };
    });
    const items = await askForItems<{ id: string; summary: string; body: string }>(
      `Rewrite each meeting note so it reads like polished, AI-enhanced meeting notes (Granola style): scannable, specific, varied in wording, never repetitive across notes.
Keep EXACTLY this markdown structure:
### Attendees  (copy the attendee lines verbatim)
### Context  (1–2 sentences)
4–6 topic sections ("### Heading"), each with "- " bullets and indented "  - " sub-bullets with concrete numbers
### Asks & opportunities  (explicit and implied needs; keep every need from the current body)
### Next steps  (lines exactly like "- [ ] Owner: action (by when)")
Keep all facts, numbers, names, job titles and {{user:...}} tokens from current_body; do not add new people or organisations. Jobs mentioned must be in jobs_at_company and match their status and dates. Copy every string in planted_need_bullets_keep_verbatim word for word as a bullet. Length: 750–1,150 words per body. Also return a 1–2 sentence summary.
Return items as {"id","summary","body"}.`,
      payload, 32000, log);
    for (const it of items ?? []) {
      const n = batch.find((x) => x.id === it.id);
      if (!n || typeof it.body !== "string" || typeof it.summary !== "string") continue;
      // The attendee block is authoritative: always restore it exactly.
      const attendees = n.body.slice(0, n.body.indexOf("### Context"));
      const rest = it.body.indexOf("### Context") >= 0 ? it.body.slice(it.body.indexOf("### Context")) : "";
      const body = (attendees + rest).trim();
      const planted = world.golden.find((g) => g.noteId === n.id)?.noteNeedText ?? [];
      const problem = checkNoteRewrite(n, body, it.summary.trim(), planted);
      if (problem) { log(`  - note ${n.id.slice(0, 8)} kept template (${problem})`); continue; }
      n.body = body;
      n.summary = it.summary.trim();
      ok++;
    }
  });
  log(`  notes: ${ok}/${targets.length} rewritten`);
}

export const ENRICHERS = {
  companies: enrichCompanies,
  contacts: enrichContacts,
  jobs: enrichJobs,
  notes: enrichNotes,
} as const;
