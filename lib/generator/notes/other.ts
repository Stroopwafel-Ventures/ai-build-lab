/**
 * Topic sections for notes that are NOT portfolio check-ins: candidate
 * chats, investor meetings, expert calls, corporate meetings and event
 * conversations. These lean on the structured data (employment history,
 * fund focus, open jobs) so each note stays consistent with the tables.
 */
import type { ContactFixture, EmploymentFixture, JobFixture } from "../../fixtures";
import { DEPT_TO_FN } from "../careers";
import { INDUSTRY_LABEL } from "../companies";
import { listify } from "../employment";
import type { Fn } from "../types";
import { bullet, fullName, mentionContact, t, userToken, userWithRole, type Bullet, type NoteCtx, type Section } from "./context";
import { money } from "./grammar";
import { CORP_AREAS, INDUSTRY } from "./industry";

type Gen = (ctx: NoteCtx) => Section | null;
const h = (ctx: NoteCtx, options: string[]) => t(ctx, ctx.rng.pick(options));
const year = (iso: string | null) => (iso ? iso.slice(0, 4) : "?");
export const stageLabel = (s: string | null) => ({ "pre-seed": "pre-seed", seed: "seed", "series-a": "Series A", "series-b": "Series B", "series-c+": "Series C+" } as Record<string, string>)[s ?? ""] ?? "early-stage";
const GOLDEN_CORPS = ["Noordhaven Bank", "Assistora", "Veenstroom Energy", "Huisgoed Retail Group"];

function history(ctx: NoteCtx, c: ContactFixture): EmploymentFixture[] {
  return [...(ctx.employmentByContact.get(c.id) ?? [])].sort((a, b) => (b.started_on ?? "").localeCompare(a.started_on ?? ""));
}

/** "Career so far" bullets built from the contact's real employment rows. */
export const background: Gen = (ctx) => {
  const p = ctx.people[0];
  const rows = history(ctx, p);
  const bullets: Bullet[] = rows.slice(0, 4).map((e, i) => {
    const span = `${year(e.started_on)}–${e.finished_on ? year(e.finished_on) : "present"}`;
    const lead = i === 0 && !e.finished_on ? "[Currently|Now]" : i === 0 ? "Most recently" : "[Before that|Earlier]";
    const where = ["Self-employed", "Independent"].includes(e.company_name) ? `${e.title}, self-employed` : `${e.title} at ${e.company_name}`;
    return bullet(ctx, `${lead} ${where} (${span})`, [
      e.description ?? t(ctx, "[Broad remit|Hands-on role], [reporting to the founders|reporting to the CEO|in a team of about {n}]", { n: ctx.rng.int(5, 40) }),
      ...(i === 0 ? [t(ctx, `[Strongest stories|Best examples] are about ${listify(p.expertise_tags.slice(0, 2))}`)] : []),
    ]);
  });
  bullets.push(bullet(ctx, `Based in ${p.location ?? "the Netherlands"}[; open to hybrid in Amsterdam|; prefers remote-first teams|, happy to commute to Amsterdam three days a week]`, ["[Commute|Travel] [fine|manageable] [two or three days a week|for team days]"]));
  bullets.push(
    bullet(ctx, "[Studied|Has a degree in] [econometrics|computer science|business|industrial engineering|law] [in the Netherlands|abroad|at a technical university], [then|followed by] [a graduate programme|an early start-up job|consulting]", [
      "[Speaks|Fluent in] [Dutch and English|English, Dutch and German|English and French]",
    ])
  );
  return { key: "background", heading: h(ctx, ["Background", "Career so far", "Experience", "Profile"]), bullets };
};

// ---------------------------------------------------------------------------
// Candidate chats
// ---------------------------------------------------------------------------
const SEN_LEVEL: Record<JobFixture["seniority"], number> = { junior: 0, mid: 1, senior: 2, lead: 3, director: 4, vp: 5, "c-level": 6 };

export function fittingJobs(ctx: NoteCtx, c: ContactFixture): JobFixture[] {
  const m = ctx.world.contactMeta[c.id];
  const goldenJobs = new Set(ctx.world.golden.map((g) => g.jobId));
  return ctx.world.jobs.filter((j) =>
    j.status === "open" && j.posted_on <= ctx.date && !goldenJobs.has(j.id) &&
    (DEPT_TO_FN[j.department] as Fn[]).includes(m.fn) && Math.abs(SEN_LEVEL[j.seniority] - (m.level + 1)) <= 1);
}

export const lookingFor: Gen = (ctx) => {
  const p = ctx.people[0];
  const m = ctx.world.contactMeta[p.id];
  const bullets: Bullet[] = [
    bullet(ctx, "[Looking for|Wants] a [step up into|move into] [a lead role|more ownership|a broader remit] at a [Series A–B|seed to Series A|growth-stage] company", [
      `[Preferred sectors|Sectors of interest]: ${listify(p.expertise_tags.slice(0, 3))}`,
      "[Wants|Values] [a strong product culture|founders who listen|a clear path to leadership] [above all|more than title]",
    ]),
    bullet(ctx, m.betweenRoles
      ? "[Left their last role|Between roles] after [a restructuring|the company was acquired|the team was reorganised]; [taking time to choose well|actively interviewing]"
      : "[Motivation for moving|Why now]: [wants more ownership|the company is restructuring|wants to work closer to customers|growth has stalled where they are]", [
      "[No rush|Not in a hurry], but [would move quickly for the right role|has started a few processes]",
    ]),
    bullet(ctx, "[Team size|Ideal team] [preference|]: [small and senior|a team of five to fifteen|wants to build a team from scratch]", ["[Has|Has not] [built|hired] a team [from scratch|from zero] [before|so far]", "[Prefers|Likes] [hands-on|player-coach] roles [over|to] pure management"]),
    bullet(ctx, "[Location|Where]: [Amsterdam or remote within CET|happy in Amsterdam, Rotterdam or Utrecht|would relocate for the right role]", [
      "[Travel|Occasional travel] [fine|no problem] [up to a week a month|for customer work]",
    ]),
    bullet(ctx, "[Dealbreakers|Red flags for them]: [no clear product-market fit|founders who micromanage|a sales-only culture|unclear funding runway]", [
      "[Asked|Wants] to see [the latest board update|runway and burn] before [final rounds|an offer]",
    ]),
    bullet(ctx, "[Stage preference|Preferred stage]: [post-product-market fit|Series A to B|first 50 employees], [ideally|preferably] B2B", [
      "[Has seen|Experienced] [the 20-to-100 transition|a hypergrowth phase] [before|once] and [wants to do it again|liked it]",
      "[Less interested in|Not keen on] [pre-seed chaos|large corporates|consumer businesses]",
    ]),
  ];
  return { key: "looking", heading: h(ctx, ["What they're looking for", "What's next", "Goals", "Next role"]), bullets };
};

export const compensation: Gen = (ctx) => {
  const lvl = ctx.world.contactMeta[ctx.people[0].id].level;
  const base = [42, 55, 70, 85, 105, 130, 160][Math.min(6, lvl)] * 1000;
  const bullets: Bullet[] = [
    bullet(ctx, `Current base [around|roughly] ${money(base * (0.95 + ctx.rng.float() * 0.1))}; [expects|looking for] ${money(base * 1.12)}–${money(base * 1.25)} plus equity`, ["[Equity matters|Open to more equity for a lower base] [at the right stage|if the story is strong]"]),
    bullet(ctx, `Notice period [of|is] [one|two|three] month[s|s|s]`, ["[Could start|Earliest start] [in|around] [{nextMonth}|early {nextQ}]"]),
    bullet(ctx, `[In process with|Talking to] ${ctx.rng.int(1, 4)} other companies[, one at offer stage|, all early stage|]`, ["[Wants|Would like] to [decide|make a decision] [within six weeks|before the end of the quarter]"]),
    bullet(ctx, "[Benefits that matter|What matters beyond salary]: [learning budget|flexible hours|a four-day week option|parental leave]", ["[Not a dealbreaker|Nice to have], but [it came up twice|clearly important to them]"]),
    bullet(ctx, "[Open to|Would consider] [a short contract or trial project|a fractional start|starting part-time] [before committing|to test the fit]", [
      "[Has done|Did] [this before|something similar] at [a previous company|their last role] [and it worked well|with good results]",
    ]),
  ];
  return { key: "comp", heading: h(ctx, ["Compensation & timing", "Comp & availability", "Timing"]), bullets };
};

export const portfolioFit: Gen = (ctx) => {
  const p = ctx.people[0];
  const jobs = ctx.rng.sample(fittingJobs(ctx, p), 3);
  const companyById = new Map(ctx.world.companies.map((c) => [c.id, c]));
  const bullets: Bullet[] = jobs.map((j) => {
    const co = companyById.get(j.company_id)!;
    const fit = ctx.rng.pick(["strong", "good", "partial"]);
    ctx.steps.push({ owner: userToken(userWithRole(ctx, ["talent"])), action: `intro ${p.first_name} to ${co.name} for the ${j.title} role`, by: t(ctx, "[next week|end of week|{soon}]") });
    return bullet(ctx, `${co.name}: ${j.title} (${j.location}) [is a|looks like a] ${fit} fit`, [
      fit === "partial" ? "[Seniority|Scope] [slightly|a bit] [above|below] what they want" : `[Relevant|Directly relevant] experience in ${listify(p.expertise_tags.slice(0, 2))}`,
      `${co.name} is a ${stageLabel(co.stage)} ${co.industry.toLowerCase()} company with ${co.employee_count_range} people`,
    ]);
  });
  if (!bullets.length) bullets.push(bullet(ctx, "[Nothing live|No open role] in the portfolio that fits right now", ["[Keep warm|Worth keeping warm] for [the next wave of Series A hiring|two companies planning to hire in {nextQ}]"]));
  if (jobs[0]) ctx.summaryBits.push(`possible fit for ${listify(jobs.map((j) => j.title))}`);
  return { key: "fit", heading: h(ctx, ["Fit with portfolio roles", "Portfolio matches", "Possible roles", "Where they could fit"]), bullets, pinned: bullets.length };
};

export const strengths: Gen = (ctx) => {
  const p = ctx.people[0];
  const [a, b] = ctx.rng.sample(p.expertise_tags, 2);
  const bullets: Bullet[] = [
    bullet(ctx, `[Strengths|Clear strengths]: ${a ?? "execution"}[ and | plus ]${b ?? "communication"}`, ["[Gave|Shared] concrete examples with numbers[, which is rare|]"]),
    bullet(ctx, "[Watch-out|Watch-outs]: [has not managed managers yet|limited exposure to enterprise customers|has mostly worked in larger companies|short tenures in the last two roles]", ["[Worth probing|Probe] in references"]),
    bullet(ctx, "[Communication|Presence] [clear and structured|warm, a bit long-winded|crisp]; [would|should] [do well with technical founders|suit a fast-moving team]", ["[Would|Should] [test|probe] how they [handle|deal with] [ambiguity|pushback] in a [case|working session]"]),
    bullet(ctx, "[Culture add|Team fit]: [calm under pressure|high ownership|good at bringing structure to chaos]", ["[Would complement|Could balance] a [visionary|fast-moving|very technical] founder"]),
    bullet(ctx, "[Self-awareness|Reflection] [strong|good]: [named|was clear about] [their gaps|what they still need to learn] [without prompting|unprompted]", [
      "[Wants|Looking for] a [manager|founder] who will [coach|stretch] them on [strategy|people leadership]",
    ]),
  ];
  return { key: "strengths", heading: h(ctx, ["Strengths & watch-outs", "Assessment", "Impressions"]), bullets };
};

/** People the contact overlapped with at a past employer (true overlaps from the data). */
export const references: Gen = (ctx) => {
  const p = ctx.people[0];
  const mine = history(ctx, p).filter((e) => e.company_id);
  const found: Bullet[] = [];
  for (const e of mine) {
    const overlap = ctx.world.employment.find((o) =>
      o.company_id === e.company_id && o.contact_id !== p.id && !ctx.excluded.has(o.contact_id) && !ctx.mentioned.has(o.contact_id) &&
      (o.started_on ?? "") <= (e.finished_on ?? "9999") && (o.finished_on ?? "9999") >= (e.started_on ?? ""));
    if (!overlap) continue;
    const other = ctx.world.contacts.find((c) => c.id === overlap.contact_id)!;
    if (ctx.world.contactMeta[other.id].duplicateOf) continue;
    ctx.mentioned.add(other.id);
    found.push(bullet(ctx, `Overlapped with ${fullName(other)} at ${e.company_name}`, [
      `${other.first_name} is now ${other.current_title ?? "between roles"}${other.current_company_name ? ` at ${other.current_company_name}` : ""}; [could be a reference|worth asking for a back-channel]`,
    ]));
    if (found.length >= 2) break;
  }
  if (!found.length) return null;
  return { key: "refs", heading: h(ctx, ["References", "Back-channel options", "Mutual connections"]), bullets: found };
};

// ---------------------------------------------------------------------------
// Investor meetings
// ---------------------------------------------------------------------------
export const fundOverview: Gen = (ctx) => {
  const fund = ctx.company!;
  const size = ctx.rng.pick([60, 85, 120, 150, 220, 300, 450]);
  const bullets: Bullet[] = [
    bullet(ctx, `${fund.name} [is investing from|deploying] Fund ${ctx.rng.pick(["II", "III", "IV"])} (€${size}m), [final close|first close] in ${ctx.rng.int(2023, 2026)}`, [
      `${fund.description}`,
      `[About|Roughly] ${ctx.rng.int(30, 75)}% [deployed|committed] so far; [pace of|aiming for] ${ctx.rng.int(6, 14)} new investments a year`,
    ]),
    bullet(ctx, `[Initial cheques|First cheques] of ${money(size * 1e6 * 0.012)}–${money(size * 1e6 * 0.04)}, [reserves of|reserving] [1:1|about 1.5x] for follow-ons`, ["[Prefer to|Like to] [lead|co-lead] and take a board seat[ from Series A|]"]),
    bullet(ctx, `Team of ${ctx.rng.int(3, 7)} partners[ plus a platform lead| and a small investment team|]`, ["[Each partner|Partners] [covers|cover] [one or two|two] sectors; [decisions|investment decisions] by [consensus|majority]"]),
    bullet(ctx, `[Portfolio|Current portfolio] of ${ctx.rng.int(12, 45)} companies, [mostly|largely] in [Benelux|Northern Europe|the UK and DACH]`, [
      "[Recent|Latest] investments [include|are] [two AI tooling companies|a payments startup|a grid-software company] [at seed|at Series A]",
    ]),
    bullet(ctx, "[LP base|Their LPs]: [mostly family offices and a fund-of-funds|a mix of institutions and founders|a corporate anchor plus private investors]", [
      "[Next fund|Fund raising] [planned|expected] in [{nextYear}|about two years]",
    ]),
  ];
  return { key: "fund", heading: h(ctx, ["Fund overview", "About the fund", "Fund & strategy"]), bullets };
};

export const thesis: Gen = (ctx) => {
  const focus = ctx.world.companyMeta[ctx.company!.id].focus;
  const labels = focus.map((f) => INDUSTRY_LABEL[f].toLowerCase());
  const bullets: Bullet[] = [
    bullet(ctx, `Focus areas: ${listify(labels)}`, [`[Excited about|Spending a lot of time on] [AI-native workflows in regulated industries|infrastructure for the energy transition|vertical software with embedded payments|developer tooling for AI agents]`]),
    bullet(ctx, "[Avoiding|Staying away from] [consumer|hardware-heavy models|businesses that depend on a single channel] [for now|in this fund]", ["[Learned|Lesson] from [a write-off|the last fund]: [avoid|be careful with] [capital-heavy|channel-dependent] models"]),
    bullet(ctx, `[Market view|Their read on the market]: [seed valuations back to 2019 levels outside AI|Series A bar now ~€${ctx.rng.int(1, 3)}m ARR with strong retention|later-stage rounds are taking ${ctx.rng.int(3, 6)} months]`, ["[LPs|Their LPs] [pushing for|asking about] [DPI|distributions] [more than ever|before re-upping]"]),
    bullet(ctx, "[Ownership target|Target ownership] [of|around] [10–15%|12–20%|8–12%] at entry", ["[Will|Happy to] [stretch|go higher] for [category leaders|exceptional teams]"]),
    bullet(ctx, "[Due diligence|DD] [style|approach]: [heavy on customer calls|data-room driven|founder references first]", [
      `[Typically|Usually] [${ctx.rng.int(6, 15)} customer calls|two weeks of DD] before [IC|investment committee]`,
    ]),
    bullet(ctx, "[Anti-portfolio regret|A deal they regret missing]: [a vertical SaaS company that is now a category leader|an early AI tooling company]", [
      "[Changed|Shifted] how they [think about|weigh] [early traction|founder-market fit]",
    ]),
  ];
  return { key: "thesis", heading: h(ctx, ["Thesis & focus", "What they invest in", "Investment focus"]), bullets };
};

export const ourRaising: Gen = (ctx) => {
  const focus = ctx.world.companyMeta[ctx.company!.id].focus;
  const goldenCos = new Set(ctx.world.golden.map((g) => g.companyId));
  const cos = ctx.rng.sample(ctx.world.companies.filter((c) => c.kind === "portfolio" && focus.includes(ctx.world.companyMeta[c.id].industryKey!) && !goldenCos.has(c.id)), 3);
  const bullets: Bullet[] = cos.map((c) => bullet(ctx, `${c.name} (${stageLabel(c.stage)}, ${c.industry.toLowerCase()}): [likely raising|planning a raise|might raise] in [{nextQ}|the next six months|early {nextYear}]`, [
    `[Builds|Makes] ${ctx.world.companyMeta[c.id].product}; [they asked for|they'd like] [the deck|a first call|an update in a month]`,
  ]));
  cos.forEach((c) => ctx.steps.push({ owner: userToken(userWithRole(ctx, ["investment"])), action: `send the ${c.name} one-pager`, by: t(ctx, "[{soon}|next week]") }));
  if (cos[0]) ctx.summaryBits.push(`shared ${listify(cos.map((c) => c.name))} as potential deals`);
  return { key: "raising", heading: h(ctx, ["Our companies raising", "Portfolio companies to share", "Deal flow from our side"]), bullets, pinned: bullets.length };
};

export const coinvest: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, "[Open to|Keen on] sharing deal flow [where we overlap|in shared focus areas]", ["[Would like|Want] a [quarterly|bi-monthly] call between [the partnerships|the investment teams]"]),
    bullet(ctx, "[Process|Their process]: partner meeting [every Monday|weekly], [term sheet within|typically] [three to five|four to six] weeks of first meeting", ["[Prefer|Strongly prefer] warm intros via [co-investors|founders they know]"]),
    bullet(ctx, "[Platform support|Value-add]: [talent network and an executive search partner|US go-to-market programme|a founder CFO community]", ["[Founders|Portfolio founders] [rate|use] it [highly|a lot], [especially|mostly] for [senior hires|first US hires]"]),
    bullet(ctx, "[Reference calls|References]: [two|three] founders [speak highly of|recommend] the partner [we met|in the room]", ["[Worth|Good to] [cross-check|double-check] with [our|portfolio] founders who [know them|have worked with them]"]),
    bullet(ctx, "[Board style|On boards they are]: [hands-off between meetings|very involved in hiring|strong on finance and governance]", [
      "[Founders|Two founders we know] [describe them as|say they are] [supportive in hard moments|demanding but fair]",
    ]),
  ];
  return { key: "coinvest", heading: h(ctx, ["Co-investment & process", "How they work", "Relationship"]), bullets };
};

// ---------------------------------------------------------------------------
// Expert calls
// ---------------------------------------------------------------------------
const EXPERT_ADVICE: Partial<Record<Fn, string[]>> = {
  finance: ["Most Series A companies under-invest in finance until the first audit forces it", "A 13-week cash forecast beats a beautiful three-year model", "Debt is cheapest when you don't need it"],
  marketing: ["Positioning work pays off more than adding channels", "Most B2B startups hire a demand-gen lead too early", "Customer proof beats feature messaging in enterprise deals"],
  engineering: ["Platform work needs an explicit budget or it never happens", "Hiring senior engineers is mostly a sell problem", "On-call health is the earliest signal of scaling pain"],
  people: ["Levelling frameworks prevent half of the comp fights", "The first people hire should be a generalist with recruiting chops", "Manager training is the cheapest retention lever"],
  general_management: ["Boards work best with a clear agenda split between decisions and updates", "Founders should build the exec team one stage ahead", "Independent board members are worth it from Series A"],
  legal: ["Start licensing conversations with the regulator early and informally", "Most delays come from incomplete governance documentation", "Outsourced compliance works until about 50 people"],
  clinical: ["Clinical evidence plans should be designed with reimbursement in mind", "Hospitals buy through pilots that need a medical champion", "Insurers want real-world outcome data, not just RCTs"],
  sales: ["The first sales hire should be a builder, not a closer", "Enterprise deals need a mutual action plan from the first call", "Discounting is a symptom of weak qualification"],
  product: ["Usage-based pricing needs a product that makes usage visible", "Discovery should be a weekly habit, not a phase", "Roadmaps should be outcome-based once you pass 20 engineers"],
  strategy: ["Corporates buy pilots, not products, at first", "Price on value metrics customers already track", "Venture clienting programmes need a business-unit sponsor"],
  energy_systems: ["Flexibility markets reward aggregators who own the customer relationship", "Grid-tariff changes will reshape home-battery economics", "Balancing-market prequalification takes longer than anyone plans for"],
  data: ["Evaluation is the bottleneck for AI features, not models", "Most companies need data engineering before data science", "Start with one high-value AI use case and instrument it well"],
};

export const expertise: Gen = (ctx) => {
  const p = ctx.people[0];
  const fn = ctx.world.contactMeta[p.id].fn;
  const advice = EXPERT_ADVICE[fn] ?? EXPERT_ADVICE.general_management!;
  const bullets: Bullet[] = [
    bullet(ctx, `[Core areas|Where they help most]: ${listify(p.expertise_tags.slice(0, 3))}`, ["[Typically works with|Usually engaged by] [Series A–C companies|seed to Series B founders|growth-stage teams]"]),
    ...ctx.rng.sample(advice, 3).map((a) => bullet(ctx, `[View|Point of view|Strong opinion]: ${a.charAt(0).toLowerCase()}${a.slice(1)}`, ["[Gave|Shared] [an example|two examples] from [a previous company|recent clients]"])),
    bullet(ctx, "[Sectors|Industries] [they know best|of deepest experience]: [B2B software and fintech|health care and insurance|energy and industrial|marketplaces and e-commerce]", [
      "[Less|Limited] experience with [deep tech|consumer|very early teams]",
    ]),
  ];
  return { key: "expertise", heading: h(ctx, ["Where they can help", "Expertise", "Areas of expertise", "Market view"]), bullets };
};

export const expertMatches: Gen = (ctx) => {
  const goldenCos = new Set(ctx.world.golden.map((g) => g.companyId));
  const cos = ctx.rng.sample(ctx.world.companies.filter((c) => c.kind === "portfolio" && !goldenCos.has(c.id)), 3);
  const bullets: Bullet[] = cos.map((c) => bullet(ctx, `${c.name}: [could use help with|would benefit from a session on] [board reporting|pricing|hiring a first manager|the next fundraise|go-to-market in Germany]`, [
    `${stageLabel(c.stage)}, ${ctx.world.companyMeta[c.id].product}`,
  ]));
  cos.slice(0, 2).forEach((c) => ctx.steps.push({ owner: userToken(userWithRole(ctx, ["platform", "community", "operations"])), action: `check with ${c.name} whether an intro is useful`, by: t(ctx, "[{soon}|next week]") }));
  bullets.push(
    bullet(ctx, "[General|Broader] [fit|value]: [most Series A companies|several seed companies] [could use|would benefit from] a [one-off|short] session on this", [
      "[Could|Might] [run|host] it as a [workshop|roundtable] for [several founders at once|a small group]",
    ])
  );
  return { key: "matches", heading: h(ctx, ["Portfolio matches", "Who they could help", "Possible portfolio fits"]), bullets };
};

export const terms: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, `[Day rate|Rate] [around|roughly] €${(ctx.rng.int(9, 20) * 100).toLocaleString("en-GB")}[; open to a monthly retainer|; discount for Stroopwafel companies|]`, ["[Open to|Would consider] equity for [pre-seed|very early] companies"]),
    bullet(ctx, `[Availability|Capacity]: [one or two days a month|about two days a week|one new client] from [{nextMonth}|{nextQ}]`, ["[Can|Could] [ramp up|add capacity] for a [short|time-boxed] project if needed"]),
    bullet(ctx, "[Happy|Glad] to [speak at|run a session at] a [founder breakfast|portfolio workshop] on [their topic|a topic of our choosing]", ["[Topics|Ideas]: [board reporting|pricing|first sales hires|preparing for due diligence]"]),
    bullet(ctx, "[References|Former clients] [available|happy to talk]: [two|three] founders from [recent|past] engagements", ["[Will|Promised to] [send|share] [names|contact details] [after the call|by email]"]),
    bullet(ctx, "[Contracting|Paperwork] [via|through] [their own company|a simple advisory agreement]; [NDA|confidentiality] [fine|standard]", [
      "[Standard|Typical] [vesting|equity] for advisory work: [0.1–0.25%|0.2–0.5%] over two years",
    ]),
  ];
  return { key: "terms", heading: h(ctx, ["Terms & availability", "Availability", "How to work together"]), bullets };
};

// ---------------------------------------------------------------------------
// Corporate meetings
// ---------------------------------------------------------------------------
const CORP_PRIORITIES: Record<string, string[]> = {
  bank: ["digitising SME onboarding", "cutting cost-to-serve in retail banking", "embedded finance partnerships", "fraud and AML efficiency"],
  payments: ["platform and marketplace merchants", "faster payouts", "reducing merchant churn"],
  support_software: ["AI agents for first-line support", "growing the app marketplace", "enterprise expansion"],
  telco: ["IoT connectivity for business customers", "B2B bundles for SMEs", "network energy efficiency"],
  energy: ["residential flexibility", "business-customer retention", "grid congestion"],
  retail: ["store labour efficiency", "packaging reduction targets", "e-commerce margin"],
  consultancy: ["AI transformation work for clients", "an ecosystem of startup partners", "energy-transition practice growth"],
  insurance: ["claims automation", "prevention services", "digital distribution"],
  logistics: ["warehouse automation", "decarbonising road freight", "visibility for shippers"],
  hospital: ["capacity planning", "remote monitoring to free up beds", "staff shortages"],
  cloud: ["startup programme growth", "sovereign-cloud offerings", "marketplace partners"],
};

export const corpPriorities: Gen = (ctx) => {
  const kind = ctx.world.companyMeta[ctx.company!.id].corpKind!;
  const [p1, p2, p3] = ctx.rng.sample(CORP_PRIORITIES[kind], 3);
  const bullets: Bullet[] = [p1, p2, p3].filter(Boolean).map((p, i) => bullet(ctx, `${i === 0 ? "[Top priority|Number one priority]" : "[Also|Another priority]"}: ${p}`, [
    `[Budget|Programme budget] [of roughly|around] ${money(ctx.rng.int(2, 30) * 100_000)} [for {nextYear}|this year]`,
    "[Board-level|Executive] [sponsor|attention] [in place|still being secured]",
  ]));
  bullets.push(
    bullet(ctx, "[Board|Executive] [pressure|focus] on [cost reduction|growth in new segments|sustainability targets] for {nextYear}", [
      "[Startups|External partners] [seen as|positioned as] a way to [move faster|test ideas cheaply]",
    ]),
    bullet(ctx, "[Targets|KPIs] [tied to|linked to] [these priorities|the programme] [are|have been] [published internally|set at board level]", [
      "[Progress|Status] [reviewed|checked] [quarterly|every six months] by [the executive committee|the board]",
    ])
  );
  return { key: "priorities", heading: h(ctx, ["Their priorities", "What they care about", "Strategic priorities"]), bullets };
};

export const corpProcess: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, `Pilots need a business sponsor and a [${ctx.rng.int(4, 10)}-week|multi-week] security review`, ["[Paid pilots|Pilot budgets] capped at [around|roughly] " + money(ctx.rng.int(2, 8) * 10_000)]),
    bullet(ctx, `Vendor onboarding via central procurement takes ${ctx.rng.int(6, 16)} weeks`, ["[Tip|Advice]: [start onboarding in parallel with the pilot|get on the preferred-supplier list early]"]),
    bullet(ctx, `[Budget cycle|Planning cycle] closes in [${["September", "October", "November"][ctx.rng.int(0, 2)]}|the autumn]; new initiatives must be in the plan by then`, ["[Late|Out-of-cycle] [requests|proposals] [need|require] [an executive sponsor|special approval]"]),
    bullet(ctx, "[Innovation team|Their startup team] is [small|two people] and acts as [a door-opener|a broker] to the business units", ["[Good|Useful] [first contact|entry point], but [business units|the BUs] [own|hold] the budgets"]),
    bullet(ctx, `[Success|Pilot success] [measured on|judged by] [hard savings|time saved|NPS] [within|after] ${ctx.rng.int(8, 16)} weeks`, ["[Metrics|Criteria] [agreed|set] [up front|before the pilot starts] with the [business owner|sponsor]"]),
    bullet(ctx, "[IT security|Information security] [checklist|questionnaire] has [~200|over 150] questions; [ISO 27001|SOC 2] [helps a lot|shortcuts most of it]", [
      "[Data|Hosting] [must stay|preferably] in the EU",
    ]),
    bullet(ctx, "[Contracting|Legal] [uses|insists on] [their own templates|a framework agreement]; [liability caps|IP clauses] [are the usual sticking point|take the longest]", [
      "[Tip|Advice]: [flag deviations early|send redlines in one round]",
    ]),
  ];
  return { key: "process", heading: h(ctx, ["How they work with startups", "Pilot & procurement process", "Working with them"]), bullets };
};

export const corpFit: Gen = (ctx) => {
  const kind = ctx.world.companyMeta[ctx.company!.id].corpKind!;
  const goldenCos = new Set(ctx.world.golden.map((g) => g.companyId));
  const relevant = ctx.world.companies.filter((c) => c.kind === "portfolio" && !goldenCos.has(c.id) && INDUSTRY[ctx.world.companyMeta[c.id].industryKey!].corpKinds.includes(kind));
  const cos = ctx.rng.sample(relevant, 3);
  const areas = CORP_AREAS[kind];
  const bullets: Bullet[] = cos.map((c) => bullet(ctx, `${c.name}: [relevant for|could help with] ${ctx.rng.pick(areas)}`, [`[Builds|Offers] ${ctx.world.companyMeta[c.id].product}; [worth a first call|they'd want a sponsor in the business]`]));
  cos.slice(0, 2).forEach((c) => ctx.steps.push({ owner: userToken(userWithRole(ctx, ["partnerships"])), action: `send a short intro note on ${c.name}`, by: t(ctx, "[{soon}|next week]") }));
  bullets.push(
    bullet(ctx, "[Also interested in|Open to hearing about] [AI tools for internal teams|sustainability reporting|workforce planning] [even if outside the core brief|as a second track]", [
      "[No|Small] budget [yet|for now], but [could|might] [run a test|join a pilot] in {nextQ}",
    ])
  );
  bullets.push(
    bullet(ctx, "[Prefer|Want] [one or two|a small number of] [well-prepared|high-quality] intros over a long list", ["[Each|Every] intro should [come with|include] a [one-pager|short case] and a [named|clear] use case"])
  );
  return { key: "corpfit", heading: h(ctx, ["Portfolio fit", "Relevant portfolio companies", "Possible matches"]), bullets };
};

// ---------------------------------------------------------------------------
// Event conversations
// ---------------------------------------------------------------------------
export const eventHighlights: Gen = (ctx) => {
  const bullets: Bullet[] = ctx.people.map((p) => bullet(ctx, `${fullName(p)} (${p.current_title ?? "between roles"}${p.current_company_name ? `, ${p.current_company_name}` : ""}) [talked about|is focused on|is working on] ${listify(p.expertise_tags.slice(0, 2))}`, [
    "[Interesting point|Takeaway]: [most teams underestimate onboarding|AI budgets are moving from pilots to production|procurement is the new bottleneck|hiring senior people is easier than a year ago]",
  ]));
  bullets.push(bullet(ctx, "[General mood|Room temperature]: [cautiously optimistic|busy, lots of hiring talk|lots of AI, less fundraising chatter than last year]", ["[Attendance|Turnout] [around|roughly] " + ctx.rng.int(60, 250) + " people[, more corporates than usual|, mostly founders]"]));
  bullets.push(
    bullet(ctx, `[Lots of|Plenty of] [founders|operators] [asking about|talking about] [hiring senior engineers|AI pilots|fundraising timelines]`, ["[Useful|Good] [signal|input] for the [next portfolio newsletter|community programme]"])
  );
  return { key: "highlights", heading: h(ctx, ["Conversation highlights", "Who we spoke to", "Key conversations"]), bullets };
};

export const eventConnections: Gen = (ctx) => {
  const goldenCos = new Set(ctx.world.golden.map((g) => g.companyId));
  const cos = ctx.rng.sample(ctx.world.companies.filter((c) => c.kind === "portfolio" && !goldenCos.has(c.id)), 2);
  const p = ctx.rng.pick(ctx.people);
  const bullets: Bullet[] = cos.map((c) => bullet(ctx, `${p.first_name} could be useful for ${c.name}[ (${ctx.world.companyMeta[c.id].product})|]`, ["[Worth a coffee|Worth an intro] [once they're back from holiday|after the event]"]));
  bullets.push(
    bullet(ctx, "[More broadly|In general], [good|useful] [people|contacts] for the [community|operator network]", [
      `${userToken(userWithRole(ctx, ["community", "platform"]))} to [add them to|invite them to] the [next|upcoming] [community evening|founder breakfast]`,
    ])
  );
  bullets.push(
    bullet(ctx, `[Could|Might] [invite|ask] ${ctx.people.map((p) => p.first_name).join(" and ")} to the next [founder breakfast|community evening]`, ["[Would|Should] [fit|work] well in the [operator|founder] [crowd|community]"])
  );
  return { key: "connections", heading: h(ctx, ["Possible connections", "Who they should meet", "Intro ideas"]), bullets };
};

export const eventOther: Gen = (ctx) => {
  const someone = mentionContact(ctx, (c) => c.contact_type === "operator" || c.contact_type === "expert");
  const bullets: Bullet[] = [
    bullet(ctx, `[Also bumped into|Also chatted briefly with] ${someone ? fullName(someone) : "a few portfolio founders"}${someone ? ` (${someone.current_title ?? ""}${someone.current_company_name ? `, ${someone.current_company_name}` : ""})` : ""}`, ["[Quick|Short] catch-up, [nothing urgent|no follow-up needed]"]),
    bullet(ctx, "[Event itself|The event] [well organised|a bit crowded|good mix of founders and corporates]; [worth going again|probably worth sponsoring next year]", ["[Good|Strong] [turnout|attendance] from [portfolio founders|corporates|other funds]"]),
    bullet(ctx, "[Logistics|Format] [note|feedback]: [shorter talks|more time for networking|smaller roundtables] would [work better|help] next time", ["[Will|To] [pass on|share] [feedback|the suggestion] to the [organisers|programme team]"]),
    bullet(ctx, "[Several|A few] [portfolio founders|Stroopwafel founders] [were there|attended]; [good|nice] to [see them|catch up] [in person|informally]", [
      "[One|Two] [mentioned|flagged] [hiring pain|fundraising timing] [worth following up on|to pick up in the next check-in]",
    ]),
  ];
  return { key: "other", heading: h(ctx, ["Other notes", "Misc", "Also"]), bullets };
};

// ---------------------------------------------------------------------------
// Extra sections so non-portfolio notes reach the same depth
// ---------------------------------------------------------------------------
export const leadershipStyle: Gen = (ctx) => {
  const p = ctx.people[0];
  const lvl = ctx.world.contactMeta[p.id].level;
  const bullets: Bullet[] = [
    bullet(ctx, lvl >= 3 ? `Has managed [teams of|up to] ${ctx.rng.int(4, 25)} people[, including two managers|]` : "[Has not managed people yet|No direct reports so far], [keen to|wants to] [mentor juniors first|grow into it]", [
      "[Describes their style as|Calls their style] [high-context and hands-off|coaching-heavy|direct, with clear goals]",
    ]),
    bullet(ctx, "[Best|Strongest] example: [rebuilt an underperforming team in six months|took a new product from zero to first revenue|ran the process that cut onboarding time in half]", [
      "[Numbers held up|The numbers were credible] when we [probed|dug in]",
    ]),
    bullet(ctx, "[Toughest|Hardest] moment: [a layoff round|a failed product launch|a co-founder conflict at their last company]", ["[Reflective|Honest] about [what they would do differently|their part in it]"]),
    bullet(ctx, "[Decision-making|How they decide]: [data first, then gut|fast with reversible decisions, slow with irreversible ones|consults the team, then decides]", [
      "[Example|Gave an example] from [a pricing change|a reorg|a vendor choice]",
    ]),
    bullet(ctx, "[Feedback culture|On feedback]: [asks for it weekly|runs regular retros|prefers direct, in-the-moment feedback]", ["[Matches|Consistent with] what [a former colleague|their reference] [said|told us]"]),
  ];
  return { key: "style", heading: h(ctx, ["How they work", "Leadership & working style", "Working style"]), bullets };
};

export const candidateQuestions: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, "Asked [a lot|several questions] about [founder dynamics|runway|how decisions get made] at the portfolio companies", ["[Good sign|Signals] [they have been burned before|they think like an owner]"]),
    bullet(ctx, "[Wanted to know|Asked] how Stroopwafel [supports|helps] portfolio hires [after joining|in the first 90 days]", [`Pointed them to the [operator community|portfolio Slack] run by ${userToken(userWithRole(ctx, ["community", "platform"]))}`]),
    bullet(ctx, "[Curious|Asked] about [equity norms|typical option packages] at [Series A|this stage] in the Netherlands", ["[Shared|Gave] [rough ranges|the usual ranges] and the [new|current] tax treatment of options"]),
    bullet(ctx, "[Asked|Wanted to know] [which founders are best to work for|where the strongest teams are] [in the portfolio|among our companies]", [
      "[Kept it|Stayed] [high level|general]; [suggested|offered] [specific intros|to set up calls] once there is a concrete role",
    ]),
  ];
  return { key: "questions", heading: h(ctx, ["Questions they asked", "What they wanted to know", "Their questions"]), bullets };
};

export const marketView: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, `[Seeing|They see] [${ctx.rng.int(20, 45)}%|about a third] more [seed|Series A] decks than last year, [mostly|largely] AI-related`, ["[Quality|Average quality] [mixed|lower than the volume suggests]"]),
    bullet(ctx, `[Exits|Liquidity] [still slow|picking up slightly]: [secondaries|small trade sales] [are|remain] the main route`, [`[Expect|They expect] [a few IPO windows|more strategic M&A] in {nextYear}`]),
    bullet(ctx, "[Valuations|Pricing] [stable outside AI|bifurcated: AI rounds hot, the rest disciplined]", ["[Boards|Investors] [pushing|focused on] capital efficiency [over growth at all costs|and burn multiples]"]),
    bullet(ctx, "[Co-investment appetite|Appetite for co-investing] [high|strong] for [Benelux|Dutch] deals with a [clear|credible] path to [€10m|€5m] ARR", ["[Especially|Particularly] [keen|interested] in [B2B software|climate|fintech] [follow-ons|deals]"]),
    bullet(ctx, "[AI|AI-native companies] [taking|absorbing] [a large share|most] of [new|fresh] capital", [
      "[Non-AI|Other] [founders|companies] [need|must show] [efficiency|clear unit economics] to raise",
    ]),
  ];
  return { key: "market", heading: h(ctx, ["Market view", "Market notes", "How they see the market"]), bullets };
};

export const questionsForUs: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, "[Asked about|Wanted to understand] how Stroopwafel [thinks about reserves|runs its platform team|sources deals]", [`${userToken(userWithRole(ctx, ["investment"]))} [explained|walked through] [our pro-rata approach|the platform programme|the founder community]`]),
    bullet(ctx, "[Curious about|Asked about] [our Benelux deal flow|which sectors we are seeing most|where we see valuation discipline]", ["[Shared|Gave] [a quick view|our honest view]; they [shared theirs|reciprocated] on [UK|DACH] [deal flow|valuations]"]),
    bullet(ctx, "[Interested in|Asked about] [co-hosting a founder event|joint office hours] in [{nextMonth}|{nextQ}]", [`${userToken(userWithRole(ctx, ["community", "platform", "investment"]))} to [follow up|check dates]`]),
    bullet(ctx, "[Wanted|Asked for] [our view|our read] on [the Dutch scale-up ecosystem|Amsterdam talent costs|exit routes for Benelux companies]", [
      "[Shared|Gave] [examples|a few data points] from [recent|the latest] portfolio [rounds|hires]",
    ]),
  ];
  return { key: "theirq", heading: h(ctx, ["Questions for us", "What they asked us", "Their questions"]), bullets };
};

export const recentWork: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, `[Recently|Last year] [helped|worked with] a [Series B|growth-stage|Series A] [SaaS|fintech|health-tech|marketplace] company on [their first audit|a pricing overhaul|hiring a first VP|a German launch|board reporting]`, [
      `[Outcome|Result]: [${ctx.rng.int(10, 40)}% improvement|cut the timeline by half|closed the gap in a quarter]`,
    ]),
    bullet(ctx, "[Currently|Right now] [advising|working with] [two|three] companies[, one in our space|]", ["[Fully booked until|Capacity frees up in] [{nextMonth}|{nextQ}]"]),
    bullet(ctx, "[Prefers|Likes] engagements with a [clear scope|defined outcome] and a [founder sponsor|single owner]", ["[Avoids|Turns down] [open-ended|vague] [mandates|engagements] [without|lacking] clear [goals|ownership]"]),
    bullet(ctx, "[Speaks|Writes] [regularly|occasionally] on [their topic|this] at [founder events|industry meetups|a newsletter]", [
      "[Content|Material] [could|would] [work|be useful] for the [portfolio newsletter|founder community]",
    ]),
  ];
  return { key: "recent", heading: h(ctx, ["Recent engagements", "Recent work", "Track record"]), bullets };
};

export const corpOrg: Gen = (ctx) => {
  const corp = ctx.company!;
  const colleague = mentionContact(ctx, (c) => c.current_company_id === corp.id && !ctx.people.some((p) => p.id === c.id));
  const bullets: Bullet[] = [
    bullet(ctx, `${ctx.people[0].first_name} [sits in|reports into] [the strategy team|the business unit|the COO's office]`, ["[Influence|Mandate]: [can open doors but cannot sign|owns a small pilot budget]"]),
    colleague
      ? bullet(ctx, `[Suggested we also speak to|Recommended] ${fullName(colleague)} (${colleague.current_title})`, ["[Owns|Close to] [the budget|the operational problem] for [this area|the pilots we discussed]"])
      : bullet(ctx, "[Will introduce us to|Offered to connect us with] [the business-unit owner|the procurement lead] [after the summer|next month]", ["[Need to|Should] [follow up|nudge] [in a few weeks|after the summer]"]),
    bullet(ctx, `[Recent|Last] reorganisation [moved|shifted] [innovation|partnerships] under [the CFO|the COO|a new Chief Digital Officer]`, ["[Some|A lot of] [uncertainty|flux] about [budgets|ownership] for {nextYear}"]),
    bullet(ctx, "[Decision-making|Influence] [sits|lies] with [business units|central functions] [more than|rather than] the [innovation|startup] team", [
      "[Best path|Route in]: [find a BU sponsor first|land a small paid pilot|start with one country]",
    ]),
  ];
  return { key: "org", heading: h(ctx, ["Their organisation", "Who's who", "Org & stakeholders"]), bullets };
};

export const corpConcerns: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, "[Concern|Worry] about [startup longevity|vendor concentration|data residency] [for critical processes|if they scale a pilot]", ["[Mitigation|Answer]: [escrow and step-in rights|a Stroopwafel intro to the founders|EU-only hosting]"]),
    bullet(ctx, `[Past|Previous] startup collaborations: [${ctx.rng.int(2, 9)} pilots in two years|a handful of pilots], [only one|two] [made it to a contract|scaled]`, ["[Main reason|Why]: [no business owner after the pilot|integration costs|budget not planned]"]),
    bullet(ctx, "[Legal|Their legal team] [insists on|requires] [their own contract templates|a full security questionnaire] even for pilots", ["[Template|Their template] [is|is fairly] [one-sided|heavy] on [liability|IP]; [expect|plan for] [two|three] rounds of comments"]),
    bullet(ctx, "[Worried|Concerned] about [internal capacity|change management|integration with legacy systems] [for|during] a [pilot|rollout]", [
      "[Want|Asked for] startups that [bring implementation support|can work with their IT partner]",
    ]),
  ];
  return { key: "concerns", heading: h(ctx, ["Open questions & concerns", "Concerns", "Risks they raised"]), bullets };
};

export const eventTrends: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, "[Several founders|Lots of people] [mentioned|talked about] [AI agents replacing first-line work|procurement cycles getting longer|hiring getting easier for senior roles]", ["[Matches|Consistent with] what we hear in [portfolio check-ins|board meetings]"]),
    bullet(ctx, "[Corporates|Large companies] [present|in the room] [mostly looking for|asking about] [pilots with clear ROI|AI use cases|sustainability reporting tools]", ["[Several|A few] [asked|wanted to know] [how to find|where to find] [relevant|vetted] startups"]),
    bullet(ctx, `[Investors|VCs] [there|in the room] [talking about|focused on] [AI infrastructure|climate adaptation|vertical software] [more than|over] [fintech|consumer]`, ["[Lots of|Plenty of] [interest|questions] in [what we see|our view] on [AI tooling|grid software]"]),
    bullet(ctx, "[Talent market|Hiring market] [loosening|tight] for [senior engineers|sales leaders|product managers]", ["[Salaries|Comp expectations] [flat|still rising] [year on year|in Amsterdam]"]),
    bullet(ctx, "[Lots of|Plenty of] [chat|talk] about [the new EU rules for AI|CSRD reporting|grid congestion] and [what it means|how it affects] startups", [
      "[Could|Might] [be|make] a good [topic|theme] for a [portfolio session|community event]",
    ]),
  ];
  return { key: "trends", heading: h(ctx, ["Themes we heard", "Trends", "What people were talking about"]), bullets };
};


// ---------------------------------------------------------------------------
// Deeper sections (keep non-portfolio notes as substantial as check-ins)
// ---------------------------------------------------------------------------
export const highlights: Gen = (ctx) => {
  const p = ctx.people[0];
  const cur = history(ctx, p)[0];
  const where = cur ? cur.company_name : "their last company";
  const bullets: Bullet[] = [
    bullet(ctx, `[Walked us through|Described] how they [rebuilt|took over] [the ${p.expertise_tags[0] ?? "core"} function|a struggling team] at ${where}`, [
      `[Moved|Improved] the [main|headline] metric by ${ctx.rng.int(20, 70)}% in [two|three|four] quarters`,
      "[Hired|Brought in] [three|four|five] people and [replaced|restructured] [the reporting line|the old process]",
    ]),
    bullet(ctx, "[Biggest|Proudest] [win|achievement]: [a launch that became a top-three revenue line|landing the first enterprise customer|cutting churn in half]", [
      "[Gave credit to|Credited] the team [generously|without being asked], [which we liked|a good sign]",
      `[Numbers|Figures] [checked out|consistent] when [{first} walked through them|we pushed for detail]`,
    ]),
    bullet(ctx, "[Something that went wrong|A failure they owned]: [a hire that did not work out|a project they killed too late|underestimating a migration]", [
      "[Lesson|What they learned]: [hire slower, fire faster|set kill criteria up front|over-communicate with stakeholders]",
    ]),
    bullet(ctx, `[Comfortable|Experienced] working with [founders|a CEO] [directly|day to day] and [presenting to|reporting into] a board`, [
      "[Has|Has not yet] [presented|written] a board [update|section] [themselves|on their own]",
    ]),
    bullet(ctx, "[Customer|Stakeholder] [orientation|focus] [came through|was obvious]: [spends time with customers every week|built a customer council|sits in on sales calls]", [
      "[Rare|Unusual] for [someone in this function|this level]",
    ]),
  ];
  return { key: "highlights", heading: h(ctx, ["Highlights from the conversation", "Stories that stood out", "Track record", "Notable work"]), bullets };
};

export const investorPortfolio: Gen = (ctx) => {
  const fund = ctx.company!.name;
  const bullets: Bullet[] = [
    bullet(ctx, `${fund} [made|closed] ${ctx.rng.int(3, 9)} new investments in the last twelve months`, [
      `[Mostly|Mainly] [seed|Series A] [rounds|deals] of ${money(ctx.rng.int(15, 60) * 100_000)}–${money(ctx.rng.int(70, 150) * 100_000)}`,
      "[Two|One] [of them|follow-ons] [co-led|syndicated] with [UK|German|Nordic] funds",
    ]),
    bullet(ctx, "[Strongest|Best-performing] [companies|portfolio companies] [are|sit] in [vertical software|infrastructure|payments]", [
      "[Two|Three] [markups|up-rounds] in the past year; [one|no] [write-downs|write-offs] [announced|so far]",
    ]),
    bullet(ctx, "[Portfolio support|Platform] [is|has become] a bigger part of the pitch: [talent|go-to-market|finance] [programmes|workshops]", [
      `[Open to|Interested in] [joint|shared] [sessions|workshops] with ${userToken(userWithRole(ctx, ["platform", "community", "investment"]))}`,
    ]),
    bullet(ctx, "[Reserves|Follow-on capacity] [healthy|tighter than they would like] [for|in] the current fund", [
      "[Will|May] [need|look for] co-investors for [larger|later] rounds",
    ]),
    bullet(ctx, "[Exits|Liquidity] in the [current|previous] fund: [one trade sale|two small acquisitions|a secondary sale]", [
      "[DPI|Distributions] [still modest|below where LPs want it]",
    ]),
  ];
  return { key: "theirportfolio", heading: h(ctx, ["Their portfolio", "Recent activity", "Portfolio & deployment"]), bullets };
};

export const collaborate: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, "[Agreed to|Will] [share|swap] [pipeline|deal notes] [every quarter|on a regular basis] in overlapping sectors", [
      "[Start with|First step]: a [shared|short] list of [companies we are both tracking|three to five names each]",
    ]),
    bullet(ctx, "[Talked about|Discussed] [co-hosting|running] a [founder dinner|CFO roundtable|talent evening] [together|jointly]", [
      `${userToken(userWithRole(ctx, ["community", "platform", "investment"]))} to [propose dates|check the calendar] for [{nextMonth}|{nextQ}]`,
    ]),
    bullet(ctx, "[Interested in|Open to] [introductions to|meeting] [our LPs|other Benelux funds|corporate venture teams] we know", [
      "[Reciprocal|In return], [they offered|they can share] [intros to US funds|their talent network]",
    ]),
    bullet(ctx, "[Talent|Hiring] [overlap|collaboration]: [could share|agreed to share] [candidates|a talent pool] for [senior|exec] roles", [
      `${userToken(userWithRole(ctx, ["talent", "platform"]))} to [align|connect] with their [platform|talent] lead`,
    ]),
  ];
  return { key: "collab", heading: h(ctx, ["Ways to collaborate", "Working together", "Next steps on collaboration"]), bullets };
};

export const howTheyWork: Gen = (ctx) => {
  const p = ctx.people[0];
  const bullets: Bullet[] = [
    bullet(ctx, `[Typical|Usual] engagement: [a diagnostic in the first two weeks|a fixed-scope project|a monthly retainer] focused on ${p.expertise_tags[0] ?? "their area"}`, [
      "[Then|After that], [hands-on|weekly] [support|sessions] with [the founder|the relevant lead]",
      "[Prefers|Insists on] [a written brief|clear success criteria] [before starting|up front]",
    ]),
    bullet(ctx, "[Works best with|Most useful for] [first-time founders|teams between 20 and 100 people|companies preparing a round]", [
      "[Less useful|Not a fit] for [very early|pre-revenue|large corporate] [teams|clients]",
    ]),
    bullet(ctx, "[Sources|Gets] [clients|work] [through|via] [VCs|former colleagues|their own network]", [
      "[Happy|Glad] to [be on|join] [our|the Stroopwafel] expert bench",
    ]),
    bullet(ctx, "[Uses|Brings] [templates|playbooks] [from previous companies|they have refined over years]", [
      "[Offered|Will share] [a sample|an anonymised example] [after the call|by email]",
    ]),
    bullet(ctx, "[Availability|Response time] [fast|good]: [usually replies within a day|keeps Fridays for advisory work]", ["[Easy|Straightforward] to [work with|schedule] in the [few|two] interactions so far"]),
  ];
  return { key: "howwork", heading: h(ctx, ["How they work", "Engagement model", "Working style"]), bullets };
};

export const expertQuestions: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, "[Asked|Wanted to know] [which portfolio companies|who in the portfolio] [have the most urgent need|are preparing a round]", [
      "[Shared|Gave] a [high-level|rough] [picture|overview] without [names|details]",
    ]),
    bullet(ctx, "[Curious|Asked] about [how we vet experts|our expectations on response times|whether we take a fee]", [
      "[Explained|Clarified] [that we don't take a fee|that founders decide|the light-touch process]",
    ]),
    bullet(ctx, "[Interested in|Asked about] [speaking at|joining] [a portfolio session|the founder community]", [
      `${userToken(userWithRole(ctx, ["community", "platform"]))} to [follow up|send the calendar]`,
    ]),
    bullet(ctx, "[Asked|Wanted to know] about [the profile of our founders|typical company size|what success looks like for us]", [
      "[Seemed|Looked] [keen|genuinely interested] [rather than|not just] [selling|looking for work]",
    ]),
  ];
  return { key: "expertq", heading: h(ctx, ["Questions they asked", "Their questions", "What they wanted to know"]), bullets };
};

export const pastCollabs: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, `[Ran|Have run] ${ctx.rng.int(3, 12)} startup pilots in the last two years[, mostly in ${ctx.rng.pick(["operations", "customer service", "IT", "sustainability"])}|]`, [
      `[Only|Just] ${ctx.rng.int(1, 3)} [became|turned into] [contracts|production deployments]`,
      "[Successful ones|The ones that worked] had a [business owner|budget holder] from day one",
    ]),
    bullet(ctx, "[Best|Most successful] [collaboration|partnership]: [a scheduling tool now used across the company|an analytics vendor that replaced an incumbent]", [
      "[Took|Needed] [nine|twelve] months from pilot to [rollout|full contract]",
    ]),
    bullet(ctx, "[Failed|Stalled] [pilots|projects] [mostly|usually] [died|stalled] at [procurement|IT security|the budget round]", [
      "[They|The team] [now|has started to] [involve procurement earlier|pre-approve vendor paperwork]",
    ]),
    bullet(ctx, "[Venture clienting|Buying from startups] [now|is] [a formal programme|on the agenda] with [a small team|one dedicated person]", [
      "[Programme|Team] [reports to|sits under] [the COO|strategy|IT]",
    ]),
  ];
  return { key: "past", heading: h(ctx, ["Previous startup collaborations", "Track record with startups", "What has worked before"]), bullets };
};

export const budgetTiming: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, `[Innovation|Pilot] budget for {nextYear} [roughly|about] ${money(ctx.rng.int(3, 25) * 100_000)}[, ring-fenced|, not yet approved|]`, [
      "[Business units|BUs] [co-fund|must co-fund] [pilots|anything beyond a pilot]",
    ]),
    bullet(ctx, "[Decision makers|Sign-off] [sits with|needs] [the BU director|the CFO|a steering committee] for anything above [€50k|€100k]", [
      "[Steering committee|The committee] [meets|convenes] [monthly|every six weeks]",
    ]),
    bullet(ctx, "[Best timing|Ideal timing] for new [proposals|pilots]: [before the summer|in the first quarter|during the autumn planning round]", [
      "[Late|Last-minute] proposals [rarely|almost never] [get funded|make it into the plan]",
    ]),
    bullet(ctx, "[Payment terms|Invoicing]: [60|45|90] days [standard|by default]; [shorter|faster] terms [possible|negotiable] for [small vendors|startups]", [
      "[Worth|Important to] [flag|raise] [early|up front] for [cash-sensitive|smaller] companies",
    ]),
  ];
  return { key: "budget", heading: h(ctx, ["Budget & timing", "Budget and decision-making", "How decisions get made"]), bullets };
};

/** One section per person met at an event, built from their real profile. */
export const eventPeople: Gen = (ctx) => {
  const bullets: Bullet[] = [];
  for (const p of ctx.people) {
    const rows = history(ctx, p);
    const prev = rows.find((r) => r.finished_on);
    bullets.push(bullet(ctx, `${fullName(p)}: ${p.current_title ?? "between roles"}${p.current_company_name ? ` at ${p.current_company_name}` : ""}`, [
      prev ? `Previously ${prev.title} at ${prev.company_name}` : "[Long tenure|Has been there a while]",
      `[Working on|Focused on] ${listify(p.expertise_tags.slice(0, 2))}; [looking for|interested in] [peers to compare notes with|startups in this space|their next hire]`,
    ]));
    bullets.push(bullet(ctx, `[How we could help|What ${p.first_name} needs]: [intros to founders|a sounding board on hiring|visibility for their programme|feedback on a new idea]`, [
      "[Low effort|Easy win] for us; [worth doing|good relationship builder]",
    ]));
  }
  bullets.push(
    bullet(ctx, "[Overall|All in all], [a useful|a good] [set of conversations|evening] for [the community|portfolio support]", [
      "[Most|All] [three|of them] [open to|happy with] [follow-up intros|a coffee]",
    ])
  );
  return { key: "people", heading: h(ctx, ["People we met", "Who we spoke with", "People"]), bullets };
};

export const OTHER_SECTIONS = {
  candidate_chat: [background, lookingFor, compensation, portfolioFit, strengths, references, leadershipStyle, candidateQuestions, highlights],
  investor_meeting: [fundOverview, thesis, ourRaising, coinvest, marketView, questionsForUs, investorPortfolio, collaborate],
  expert_call: [background, expertise, expertMatches, terms, recentWork, howTheyWork, expertQuestions],
  corporate_meeting: [corpPriorities, corpProcess, corpFit, corpOrg, corpConcerns, pastCollabs, budgetTiming],
  event_conversation: [eventPeople, eventHighlights, eventConnections, eventOther, eventTrends],
} as const;
