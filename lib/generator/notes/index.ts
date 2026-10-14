/**
 * Stage 8: meeting notes.
 *
 * ~120 Granola-style notes over the 12 months before TODAY (weighted to
 * recent months): ~60% with portfolio execs, the rest with candidates,
 * investors, experts, corporates and people met at events.
 *
 * For each note we
 *   1. pick the meeting type, company, date and attendees,
 *   2. build a context (metrics at that date, open jobs, needs),
 *   3. generate candidate topic sections and choose 4–6 of them,
 *   4. plant the golden-scenario need if this is a golden note,
 *   5. compose the markdown body to a target length.
 */
import type { CompanyFixture, ContactFixture, EmploymentFixture, MeetingNoteFixture, MeetingType } from "../../fixtures";
import { INDUSTRY_LABEL } from "../companies";
import { addDays, daysAgo, monthName, quarterOf, shortDate } from "../dates";
import { listify } from "../employment";
import { goldenSpecFor } from "../golden";
import { stableId } from "../ids";
import { Rng } from "../rng";
import type { TeamMember, World } from "../types";
import { attendeeLines, compose } from "./compose";
import { fullName, t, userToken, type NextStep, type NoteCtx, type Section } from "./context";
import { cap, money, type Vars } from "./grammar";
import { INDUSTRY } from "./industry";
import { metricsAt } from "./metrics";
import { planNeeds } from "./needs";
import { OTHER_SECTIONS } from "./other";
import { PORTFOLIO_SECTIONS, portfolioSectionWeights } from "./portfolio";

const COUNTS: Record<Exclude<MeetingType, "portfolio_checkin" | "founder_catchup">, number> = {
  candidate_chat: 16, investor_meeting: 11, expert_call: 9, corporate_meeting: 8, event_conversation: 4,
};
const PORTFOLIO_NOTES = 72; // 60% of 120
const CHECKINS = 50;

const EVENTS: [string, string][] = [
  ["the Canal Founders Breakfast", "Amsterdam"], ["Waffle Iron Tech Week", "Amsterdam"], ["a Delta Startup Accelerator demo day", "Rotterdam"],
  ["the Polder Climate Builders meetup", "Utrecht"], ["an AI builders evening at the Grachtengordel Startup Hub", "Amsterdam"],
  ["the Stroopwafel Ventures portfolio summer party", "Amsterdam"], ["a health-data roundtable", "Leiden"],
];

const NEXT_ROUND: Record<string, [string, number, number]> = {
  "pre-seed": ["seed round", 1.5, 3.5], seed: ["Series A", 6, 12], "series-a": ["Series B", 18, 32], "series-b": ["Series C", 35, 55], "series-c+": ["Series D", 60, 90],
};

interface PlannedNote {
  type: MeetingType;
  date: string;
  company: CompanyFixture | null;
  people: ContactFixture[];
  users: TeamMember[];
  goldenKey: string | null;
}

/** Recent-weighted date in the last 12 months. */
function noteDate(rng: Rng): string {
  return daysAgo(1 + Math.floor(363 * Math.pow(rng.float(), 1.7)));
}

function quarterLabel(iso: string, offsetQ: number): string {
  const [y, m] = iso.split("-").map(Number);
  const q0 = y * 4 + Math.floor((m - 1) / 3) + offsetQ;
  return `Q${(q0 % 4) + 1} ${Math.floor(q0 / 4)}`;
}

export function planNotes(world: World, rng: Rng): PlannedNote[] {
  const plans: PlannedNote[] = [];
  const team = world.teamMembers;
  const byKey = (k: string) => team.find((t) => t.key === k)!;
  const goldenIds = new Set(world.golden.flatMap((g) => [g.bestContactId, g.decoyContactId]));
  const usable = (c: ContactFixture) => !goldenIds.has(c.id) && !world.contactMeta[c.id].duplicateOf;
  const portfolio = world.companies.filter((c) => c.kind === "portfolio");
  const execsOf = (co: CompanyFixture) => world.contacts.filter((c) => c.current_company_id === co.id && c.contact_type === "portfolio_exec" && usable(c));

  // Rotating pools so every participant shows up in some notes.
  const rotate = (keys: string[]) => { let i = rng.int(0, keys.length - 1); return () => keys[i++ % keys.length]; };
  const nextTalent = rotate(["p04", "p07", "p11"]);
  const nextPartnerships = rotate(["p08", "p14", "p16"]);
  const nextPlatform = rotate(["p05", "p06", "p09", "p10", "p12", "p13"]);
  const nextExpertHost = rotate(["p05", "p06", "p09", "p10", "p12", "p13", "p15", "p17", "p02", "p03", "p01"]);
  const nextCommunity = rotate(["p02", "p03", "p01", "p17"]);
  const nextInvestment = rotate(["i01", "i02", "i03", "i04", "i05"]);

  // --- Portfolio notes ------------------------------------------------------
  const slots: CompanyFixture[] = [...portfolio];
  const weightFor = (c: CompanyFixture) => ({ "pre-seed": 0.5, seed: 1, "series-a": 1.6, "series-b": 2.2, "series-c+": 2.2 }[c.stage!]);
  while (slots.length < PORTFOLIO_NOTES) slots.push(rng.weighted(portfolio.map((c) => [c, weightFor(c)] as const)));
  const goldenDone = new Set<string>();
  const portfolioPlans: PlannedNote[] = slots.map((co) => {
    const spec = goldenSpecFor(co.name);
    const isGolden = !!spec && !goldenDone.has(co.name);
    if (isGolden) goldenDone.add(co.name);
    const deal = world.dealTeam.filter((d) => d.company_id === co.id);
    const lead = deal.find((d) => d.role === "lead")!.user_key;
    const users = [byKey(rng.chance(0.8) ? lead : (deal.find((d) => d.role === "board")?.user_key ?? lead))];
    for (const d of deal.filter((d) => d.role === "support")) if (rng.chance(0.5)) users.push(byKey(d.user_key));
    if (rng.chance(0.18)) users.push(byKey(nextPlatform()));
    if (rng.chance(0.12)) users.push(byKey(nextTalent()));
    const execs = execsOf(co);
    const ceo = execs.find((e) => world.contactMeta[e.id].portfolioRole === "founder" && /CEO/.test(e.current_title ?? "")) ?? execs[0];
    const others = rng.sample(execs.filter((e) => e !== ceo), rng.weighted([[0, 3], [1, 4], [2, 2]] as const));
    return {
      type: isGolden ? spec!.note.meetingType : "portfolio_checkin",
      date: isGolden ? daysAgo(rng.int(3, 20)) : noteDate(rng),
      company: co, people: [ceo, ...others], users: dedupe(users), goldenKey: isGolden ? spec!.key : null,
    };
  });
  // Exactly CHECKINS check-ins; the rest are founder catch-ups (smaller attendee lists).
  let catchups = portfolioPlans.filter((p) => p.type === "founder_catchup").length;
  for (const p of rng.shuffle(portfolioPlans)) {
    if (catchups >= PORTFOLIO_NOTES - CHECKINS) break;
    if (p.goldenKey || p.type === "founder_catchup") continue;
    p.type = "founder_catchup";
    p.people = p.people.slice(0, rng.chance(0.75) ? 1 : 2);
    p.users = p.users.slice(0, 1);
    catchups++;
  }
  plans.push(...portfolioPlans);

  // --- Candidate chats --------------------------------------------------------
  const candidates = rng.shuffle(world.contacts.filter((c) => c.contact_type === "candidate" && usable(c)));
  for (let i = 0; i < COUNTS.candidate_chat; i++) {
    const users = [byKey(nextTalent())];
    if (rng.chance(0.25)) users.push(byKey(nextInvestment()));
    plans.push({ type: "candidate_chat", date: noteDate(rng), company: null, people: [candidates[i]], users, goldenKey: null });
  }

  // --- Investor meetings ------------------------------------------------------
  const funds = world.companies.filter((c) => c.kind === "investor");
  for (let i = 0; i < COUNTS.investor_meeting; i++) {
    const fund = funds[i % funds.length];
    const people = rng.sample(world.contacts.filter((c) => c.current_company_id === fund.id && usable(c)), rng.int(1, 2));
    const users = dedupe([byKey(nextInvestment()), ...(rng.chance(0.4) ? [byKey(nextInvestment())] : [])]);
    plans.push({ type: "investor_meeting", date: noteDate(rng), company: fund, people, users, goldenKey: null });
  }

  // --- Expert calls -----------------------------------------------------------
  const experts = rng.shuffle(world.contacts.filter((c) => c.contact_type === "expert" && usable(c)));
  for (let i = 0; i < COUNTS.expert_call; i++) {
    const users = dedupe([byKey(nextExpertHost()), ...(rng.chance(0.3) ? [byKey(nextExpertHost())] : [])]);
    plans.push({ type: "expert_call", date: noteDate(rng), company: null, people: [experts[i]], users, goldenKey: null });
  }

  // --- Corporate meetings -----------------------------------------------------
  const corps = rng.shuffle(world.companies.filter((c) => c.kind === "corporate" && !["Noordhaven Bank", "Assistora", "Veenstroom Energy", "Huisgoed Retail Group"].includes(c.name)));
  for (let i = 0; i < COUNTS.corporate_meeting; i++) {
    const corp = corps[i % corps.length];
    const people = rng.sample(world.contacts.filter((c) => c.current_company_id === corp.id && usable(c)), rng.int(1, 2));
    const users = dedupe([byKey(nextPartnerships()), ...(rng.chance(0.5) ? [byKey(nextPlatform())] : [])]);
    plans.push({ type: "corporate_meeting", date: noteDate(rng), company: corp, people, users, goldenKey: null });
  }

  // --- Event conversations ----------------------------------------------------
  const mingle = world.contacts.filter((c) => ["operator", "corporate", "other", "expert"].includes(c.contact_type) && usable(c));
  for (let i = 0; i < COUNTS.event_conversation; i++) {
    const users = dedupe([byKey(nextCommunity()), ...(rng.chance(0.5) ? [byKey(nextCommunity())] : [])]);
    plans.push({ type: "event_conversation", date: noteDate(rng), company: null, people: rng.sample(mingle, rng.int(2, 3)), users, goldenKey: null });
  }

  return plans.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

function dedupe(users: TeamMember[]): TeamMember[] {
  return users.filter((u, i) => users.findIndex((x) => x.key === u.key) === i);
}

// ---------------------------------------------------------------------------

export function buildNotes(world: World, rootRng: Rng, seed: number): MeetingNoteFixture[] {
  const rng = rootRng.fork("notes");
  const plans = planNotes(world, rng.fork("plan"));
  const employmentByContact = new Map<string, EmploymentFixture[]>();
  for (const e of world.employment) employmentByContact.set(e.contact_id, [...(employmentByContact.get(e.contact_id) ?? []), e]);
  const excluded = new Set(world.golden.flatMap((g) => [g.bestContactId, g.decoyContactId]));
  const counters: Record<string, number> = {};

  return plans.map((plan) => {
    const n = (counters[plan.type] = (counters[plan.type] ?? 0) + 1);
    const id = stableId(`note:${plan.type}:${n}`);
    const nrng = rng.fork(id);
    const note = buildOne(world, plan, nrng, seed, employmentByContact, excluded, id);
    if (plan.goldenKey) world.golden.find((g) => g.key === plan.goldenKey)!.noteId = id;
    return note;
  });
}

function baseVars(date: string, rng: Rng): Vars {
  return {
    Q: quarterOf(date), prevQ: quarterLabel(date, -1).split(" ")[0], nextQ: quarterLabel(date, 1),
    month: monthName(date), monthPrev: monthName(addDays(date, -30)), nextMonth: monthName(addDays(date, 32)),
    year: date.slice(0, 4), nextYear: String(Number(date.slice(0, 4)) + 1), soon: shortDate(addDays(date, rng.int(4, 10))),
  };
}

function buildOne(
  world: World, plan: PlannedNote, rng: Rng, seed: number, employmentByContact: Map<string, EmploymentFixture[]>,
  excluded: Set<string>, id: string,
): MeetingNoteFixture {
  const co = plan.company;
  const cmeta = co ? world.companyMeta[co.id] : null;
  const isPortfolio = plan.type === "portfolio_checkin" || plan.type === "founder_catchup";
  const spec = plan.goldenKey && co ? goldenSpecFor(co.name)! : null;
  const ctx: NoteCtx = {
    rng, world, date: plan.date, type: plan.type, company: co, cmeta,
    profile: isPortfolio && cmeta ? INDUSTRY[cmeta.industryKey!] : null,
    metrics: isPortfolio && co && cmeta ? metricsAt(co, cmeta, plan.date, seed) : null,
    people: plan.people, users: plan.users,
    jobs: co ? world.jobs.filter((j) => j.company_id === co.id) : [],
    golden: spec?.note ?? null, goldenKey: plan.goldenKey,
    vars: baseVars(plan.date, rng), mentioned: new Set(plan.people.map((p) => p.id)),
    asks: [], steps: [], summaryBits: [], excluded, employmentByContact,
  };
  plan.people.forEach((p) => ctx.mentioned.add(p.id));

  let sections: Section[] = [];
  let reserve: Section[] = [];
  let needsSummary: string[] = [];

  if (isPortfolio && co && cmeta && ctx.metrics) {
    const m = ctx.metrics;
    const ceo = plan.people[0];
    const execs = world.contacts.filter((c) => c.current_company_id === co.id && c.contact_type === "portfolio_exec");
    const cto = execs.find((e) => /CTO|COO/.test(e.current_title ?? "") && e.id !== ceo.id) ?? ceo;
    const [round, lo, hi] = NEXT_ROUND[co.stage!];
    const runwayEnd = addDays(plan.date, m.runway * 30);
    const lead = world.dealTeam.find((d) => d.company_id === co.id && d.role === "lead")!.user_key;
    Object.assign(ctx.vars, {
      company: co.name, ceo: ceo.first_name, ceoFull: fullName(ceo), cto: cto.first_name,
      industry: INDUSTRY_LABEL[cmeta.industryKey!].toLowerCase(), arr: money(m.arr), g: m.growthQoQ,
      runway: m.runway, runwayDate: `${monthName(runwayEnd)} ${runwayEnd.slice(0, 4)}`,
      nextRound: round, raiseAmount: money(rng.int(lo * 10, hi * 10) * 100_000),
      raiseQ: quarterLabel(addDays(plan.date, Math.max(60, (m.runway - 9) * 30)), 0),
      competitor: rng.pick(ctx.profile!.competitors), lead: userToken(lead),
    });

    // Needs first, so their bullets land in the right sections.
    const needCount = spec ? rng.int(0, 1) : rng.weighted([[1, 4], [2, 4], [3, 2]] as const);
    const needs = planNeeds(ctx, needCount);
    needsSummary = needs.map((n) => n.summary);

    // Choose topic sections (4–6 incl. the golden one).
    const weights = portfolioSectionWeights(ctx);
    const wanted = new Set<string>(needs.filter((n) => n.bullet).map((n) => n.sectionKey));
    const total = rng.int(4, 6) - (spec ? 1 : 0);
    const order: string[] = [];
    if (plan.type === "portfolio_checkin") order.push("performance");
    for (const k of wanted) if (!order.includes(k) && PORTFOLIO_SECTIONS[k]) order.push(k);
    const pool = weights.filter(([k]) => !order.includes(k));
    while (order.length < total && pool.length) {
      const k = rng.weighted(pool);
      pool.splice(pool.findIndex(([x]) => x === k), 1);
      order.push(k);
    }
    const make = (k: string) => PORTFOLIO_SECTIONS[k](ctx);
    sections = order.map(make).filter((s): s is Section => !!s);
    reserve = pool.map(([k]) => k).slice(0, 4).map(make).filter((s): s is Section => !!s);

    // Plant need bullets (pinned at the top of their section).
    for (const need of needs) {
      if (!need.bullet) continue;
      const s = sections.find((x) => x.key === need.sectionKey) ?? sections[sections.length - 1];
      s.bullets.unshift(need.bullet);
      s.pinned = (s.pinned ?? 0) + 1;
    }
    ctx.asks.push(...needs.map((n) => n.ask));

    if (spec) {
      const g: Section = { key: "golden", heading: spec.note.sectionHeading, bullets: spec.note.bullets.map((b) => ({ ...b })), pinned: spec.note.bullets.length };
      sections.splice(Math.min(1, sections.length), 0, g);
      ctx.asks.unshift(spec.note.ask);
      ctx.steps.unshift({ owner: userToken(lead), action: spec.note.nextStep, by: shortDate(addDays(plan.date, rng.int(5, 12))) });
      needsSummary.unshift(spec.note.sectionHeading);
    }

    // Default follow-ups from the company side.
    ctx.steps.push({ owner: ceo.first_name, action: rng.pick(["send the updated KPI sheet", "share the draft board deck", "send the revised hiring plan", "share the pipeline export", "circulate the budget draft"]), by: shortDate(addDays(plan.date, rng.int(4, 14))) });
    if (rng.chance(0.5)) ctx.asks.push(`Opportunity: ${co.name} ${rng.pick(["could speak at the next founder breakfast about", "is happy to share learnings with other portfolio founders on", "could host a portfolio session on"])} ${rng.pick(["hiring", "pricing", "enterprise sales", "board reporting", "fundraising"])}.`);
  } else {
    const p = plan.people[0];
    Object.assign(ctx.vars, { name: fullName(p), first: p.first_name, company: co?.name ?? p.current_company_name ?? "" });
    const gens = rng.shuffle([...OTHER_SECTIONS[plan.type as keyof typeof OTHER_SECTIONS]]);
    // keep the most informative section first for each type
    const firstKey = { candidate_chat: "background", investor_meeting: "fund", expert_call: "background", corporate_meeting: "priorities", event_conversation: "people" }[plan.type as string];
    const built = gens.map((g) => g(ctx)).filter((s): s is Section => !!s);
    built.sort((a, b) => (a.key === firstKey ? -1 : b.key === firstKey ? 1 : 0));
    // Must-have sections first, then the rest in random order.
    const must = { candidate_chat: ["fit"], investor_meeting: ["raising"], expert_call: ["expertise", "matches"], corporate_meeting: ["corpfit"], event_conversation: ["connections"] }[plan.type as string] ?? [];
    built.sort((a, b) => (a.key === firstKey ? -2 : must.includes(a.key) ? -1 : 0) - (b.key === firstKey ? -2 : must.includes(b.key) ? -1 : 0));
    const want = rng.int(5, 6);
    sections = built.slice(0, want);
    reserve = built.slice(want);
    otherAsksAndSteps(ctx, plan);
  }

  if (ctx.steps.length < 3) ctx.steps.push({ owner: userToken(plan.users[0].key), action: rng.pick(["log the follow-ups in the CRM", "add notes to the contact record", "schedule the next check-in"]), by: shortDate(addDays(plan.date, rng.int(3, 10))) });
  const steps = dedupeSteps(ctx.steps).slice(0, rng.int(3, 5)).map((s) => ({ ...s, action: t(ctx, s.action) }));
  if (spec && !steps.some((s) => s.action === spec.note.nextStep)) steps.unshift(ctx.steps.find((s) => s.action === spec.note.nextStep)!);

  const context = contextLine(ctx, plan, sections);
  const { body } = compose({
    attendees: attendeeLines(ctx), context, sections, reserve, asks: ctx.asks.slice(0, 4), steps, targetWords: rng.int(760, 1140),
  });

  return {
    id,
    met_on: plan.date,
    title: titleFor(ctx, plan),
    meeting_type: plan.type,
    company_id: co?.id ?? null,
    summary: summaryFor(ctx, plan, needsSummary),
    body,
    created_by_key: plan.users[0].key,
    attendee_user_keys: plan.users.map((u) => u.key),
    attendee_contact_ids: plan.people.map((p) => p.id),
  };
}

function dedupeSteps(steps: NextStep[]): NextStep[] {
  return steps.filter((s, i) => steps.findIndex((x) => x.action === s.action) === i);
}

function otherAsksAndSteps(ctx: NoteCtx, plan: PlannedNote) {
  const p = plan.people[0];
  const r = ctx.rng;
  const host = userToken(plan.users[0].key);
  switch (plan.type) {
    case "candidate_chat":
      ctx.asks.push(r.pick([`${p.first_name} asked for intros to [founders hiring|companies hiring] in ${p.expertise_tags[0] ?? "their area"}.`, `Keep ${p.first_name} in mind for [senior|lead] roles in ${listify(p.expertise_tags.slice(0, 2))}.`]).replace(/\[([^\]|]*\|[^\]]*)\]/g, (_, a: string) => r.pick(a.split("|"))));
      ctx.asks.push(`Opportunity: ${p.first_name} could refer [two or three|a few] strong people from their network.`.replace(/\[([^\]|]*\|[^\]]*)\]/g, (_, a: string) => r.pick(a.split("|"))));
      ctx.steps.push({ owner: host, action: "add to the talent pool with tags", by: shortDate(addDays(plan.date, r.int(2, 6))) });
      ctx.steps.push({ owner: p.first_name, action: "send an updated CV", by: shortDate(addDays(plan.date, r.int(3, 9))) });
      break;
    case "investor_meeting":
      ctx.asks.push(`${plan.company!.name} asked to see more ${listify(ctx.world.companyMeta[plan.company!.id].focus.map((f) => INDUSTRY_LABEL[f].toLowerCase()))} deal flow from us.`);
      ctx.asks.push("Opportunity: co-invest in a portfolio company's next round where the focus overlaps.");
      ctx.steps.push({ owner: p.first_name, action: "share their current portfolio list", by: shortDate(addDays(plan.date, r.int(5, 12))) });
      break;
    case "expert_call":
      ctx.asks.push(`${p.first_name} is open to [advising one or two portfolio companies|joining the expert bench]; ${p.first_name} asked for intros where there's a clear need.`.replace(/\[([^\]|]*\|[^\]]*)\]/g, (_, a: string) => r.pick(a.split("|"))));
      ctx.asks.push(`Opportunity: run a portfolio session with ${p.first_name} on ${p.expertise_tags[0] ?? "their area"}.`);
      ctx.steps.push({ owner: host, action: `add ${p.first_name} to the expert bench with rates and availability`, by: shortDate(addDays(plan.date, r.int(3, 8))) });
      break;
    case "corporate_meeting":
      ctx.asks.push(`${plan.company!.name} wants a shortlist of startups for their [${ctx.vars.nextYear} plan|next pilot round].`.replace(/\[([^\]|]*\|[^\]]*)\]/g, (_, a: string) => r.pick(a.split("|"))));
      ctx.asks.push(`${p.first_name} asked for a [contact at a peer fund|benchmark of how other corporates run pilots].`.replace(/\[([^\]|]*\|[^\]]*)\]/g, (_, a: string) => r.pick(a.split("|"))));
      ctx.steps.push({ owner: p.first_name, action: "share the pilot criteria document", by: shortDate(addDays(plan.date, r.int(5, 14))) });
      break;
    case "event_conversation": {
      const [ev, city] = r.pick(EVENTS);
      ctx.vars.event = ev; ctx.vars.city = city;
      ctx.asks.push(...plan.people.slice(0, 2).map((x) => `${x.first_name} would welcome intros to [founders|people] working on ${x.expertise_tags[0] ?? "similar problems"}.`.replace(/\[([^\]|]*\|[^\]]*)\]/g, (_, a: string) => r.pick(a.split("|")))));
      ctx.steps.push({ owner: host, action: "send follow-up emails to everyone we met", by: shortDate(addDays(plan.date, r.int(1, 4))) });
      break;
    }
  }
}

function contextLine(ctx: NoteCtx, plan: PlannedNote, sections: Section[]): string {
  const topics = listify(sections.slice(0, 3).map((s) => s.heading.toLowerCase()));
  const p = plan.people[0];
  const others = plan.people.slice(1).map(fullName);
  const t = (s: string) => s.replace(/\[([^\]|]*\|[^\]]*)\]/g, (_, a: string) => ctx.rng.pick(a.split("|")));
  switch (plan.type) {
    case "portfolio_checkin":
      return t(`[Regular|Monthly|Quarterly|Scheduled] check-in with ${fullName(p)}${others.length ? ` and ${listify(others)}` : ""}. [Main topics:|We covered|Focus was on] ${topics}.`);
    case "founder_catchup":
      return t(`[Informal|1:1] catch-up with ${fullName(p)} [over coffee|over lunch near their office|on a video call|during a walk along the canal]. [Mostly about|${p.first_name} wanted to talk through] ${topics}.`);
    case "candidate_chat":
      return t(`[Intro call|First conversation|Exploratory chat] with ${fullName(p)}, [referred by a portfolio founder|who reached out via LinkedIn|whom we met at a community event]. [Exploring|Open to] next steps and possible roles in the portfolio.`);
    case "investor_meeting":
      return t(`[Intro|Catch-up|Coffee] with ${listify(plan.people.map(fullName))} from ${plan.company!.name} to [compare notes on the market|share deal flow|explore co-investment opportunities].`);
    case "expert_call":
      return t(`[Call|Intro call] with ${fullName(p)} to [understand where they could help portfolio companies|consider them for the expert bench|get their view on ${p.expertise_tags[0] ?? "their area"}].`);
    case "corporate_meeting":
      return t(`[Meeting|Intro meeting|Follow-up meeting] with ${listify(plan.people.map(fullName))} from ${plan.company!.name} about [their startup programme|working with portfolio companies|their priorities for next year].`);
    case "event_conversation":
      return `Conversations at ${ctx.vars.event} in ${ctx.vars.city}. Brief notes on the people worth following up with.`;
  }
}

function titleFor(ctx: NoteCtx, plan: PlannedNote): string {
  const r = ctx.rng;
  const p = plan.people[0];
  const co = plan.company;
  switch (plan.type) {
    case "portfolio_checkin":
      return r.pick([`${co!.name}: ${quarterOf(plan.date)} check-in`, `${co!.name} monthly sync`, `${co!.name} x Stroopwafel check-in`, `${co!.name}: ${monthName(plan.date)} update`, `Check-in: ${co!.name}`]);
    case "founder_catchup":
      return r.pick([`Catch-up with ${fullName(p)} (${co!.name})`, `Founder catch-up: ${co!.name}`, `Coffee with ${fullName(p)}`, `${co!.name} founder 1:1`]);
    case "candidate_chat":
      return r.pick([`Candidate chat: ${fullName(p)}`, `Intro call with ${fullName(p)}`, `${fullName(p)}: talent conversation`]);
    case "investor_meeting":
      return r.pick([`${co!.name}: intro call`, `Catch-up with ${co!.name}`, `${co!.name} x Stroopwafel`]);
    case "expert_call":
      return r.pick([`Expert call: ${fullName(p)}`, `${fullName(p)} on ${p.expertise_tags[0] ?? "advisory"}`, `Advisor intro: ${fullName(p)}`]);
    case "corporate_meeting":
      return r.pick([`${co!.name}: partnerships meeting`, `Meeting with ${co!.name}`, `${co!.name} startup programme`]);
    case "event_conversation":
      return `Notes from ${String(ctx.vars.event).replace(/^(the|an|a) /, "")}`;
  }
}

function summaryFor(ctx: NoteCtx, plan: PlannedNote, needs: string[]): string {
  const p = plan.people[0];
  const co = plan.company;
  switch (plan.type) {
    case "portfolio_checkin":
    case "founder_catchup": {
      const label = plan.type === "portfolio_checkin" ? "check-in" : "founder catch-up";
      const facts = ctx.summaryBits.slice(0, 2);
      const first = `${co!.name} ${label}${facts.length ? `: ${listify(facts)}` : ` with ${fullName(p)}`}.`;
      return needs.length ? `${first} ${cap(`main needs: ${listify(needs.slice(0, 3))}.`)}` : first;
    }
    case "candidate_chat":
      return `Intro chat with ${fullName(p)} (${p.current_title ?? "between roles"}${p.current_company_name ? `, ${p.current_company_name}` : ""})${ctx.summaryBits[0] ? `; ${ctx.summaryBits[0]}` : ""}.`;
    case "investor_meeting":
      return `Met ${co!.name} to compare notes and share deal flow${ctx.summaryBits[0] ? `; ${ctx.summaryBits[0]}` : ""}.`;
    case "expert_call":
      return `Call with ${fullName(p)} (${p.current_title}) about helping portfolio companies with ${listify(p.expertise_tags.slice(0, 2))}.`;
    case "corporate_meeting":
      return `Meeting with ${co!.name} about their priorities and how they run pilots with startups.`;
    case "event_conversation":
      return `Follow-ups from ${ctx.vars.event}: ${listify(plan.people.map(fullName))}.`;
  }
}

