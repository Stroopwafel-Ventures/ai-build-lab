/**
 * Stage 6: jobs at portfolio companies.
 *
 * 0–12 per company (later stage → more), ~300 in total, all posted in the
 * 90 days before TODAY. Mostly open, some paused or filled. Descriptions
 * are 2–4 paragraphs built from department-specific phrase banks.
 */
import type { CompanyFixture, ContactFixture, JobFixture } from "../fixtures";
import { cityOf } from "./contacts";
import { daysAgo } from "./dates";
import { slugify, stableId } from "./ids";
import type { Rng } from "./rng";
import type { CompanyMeta, IndustryKey } from "./types";

type Dept = JobFixture["department"];
type Sen = JobFixture["seniority"];
type JobTemplate = [string, Dept, Sen];

const GENERIC: JobTemplate[] = [
  ["Backend Engineer", "engineering", "mid"], ["Senior Backend Engineer", "engineering", "senior"],
  ["Senior Full-Stack Engineer", "engineering", "senior"], ["Frontend Engineer", "engineering", "mid"],
  ["Staff Engineer", "engineering", "lead"], ["Engineering Manager", "engineering", "lead"],
  ["Senior Data Engineer", "engineering", "senior"], ["Site Reliability Engineer", "engineering", "senior"],
  ["Junior Software Engineer", "engineering", "junior"], ["Mobile Engineer (iOS)", "engineering", "mid"],
  ["Security Engineer", "engineering", "senior"], ["Head of Engineering", "engineering", "director"],
  ["Account Executive", "sales", "mid"], ["Senior Account Executive", "sales", "senior"],
  ["Sales Development Representative", "sales", "junior"], ["Enterprise Account Executive", "sales", "senior"],
  ["Head of Sales", "sales", "director"], ["Sales Manager Benelux", "sales", "lead"],
  ["Partnerships Manager", "sales", "mid"], ["Solutions Engineer", "sales", "senior"],
  ["Product Marketing Manager", "marketing", "senior"], ["Growth Marketer", "marketing", "mid"],
  ["Content Marketing Manager", "marketing", "mid"], ["Head of Marketing", "marketing", "director"],
  ["Product Manager", "product", "mid"], ["Senior Product Manager", "product", "senior"],
  ["Product Designer", "product", "mid"], ["Senior Product Designer", "product", "senior"],
  ["Head of Product", "product", "director"], ["UX Researcher", "product", "mid"],
  ["Operations Manager", "ops", "mid"], ["Customer Success Manager", "ops", "mid"],
  ["Customer Support Specialist", "ops", "junior"], ["Implementation Manager", "ops", "mid"],
  ["Head of Operations", "ops", "director"], ["Business Operations Analyst", "ops", "junior"],
  ["Finance Manager", "finance", "mid"], ["Financial Controller", "finance", "senior"],
  ["Head of Finance", "finance", "director"], ["FP&A Analyst", "finance", "junior"],
  ["Talent Acquisition Partner", "people", "mid"], ["People Operations Manager", "people", "mid"],
  ["Head of People", "people", "director"], ["Technical Recruiter", "people", "mid"],
  ["VP Engineering", "exec", "vp"], ["VP Sales", "exec", "vp"], ["Chief Operating Officer", "exec", "c-level"],
  ["VP Marketing", "exec", "vp"], ["CFO", "exec", "c-level"],
];

const INDUSTRY_EXTRA: Record<IndustryKey, JobTemplate[]> = {
  fintech: [["Compliance Officer", "ops", "senior"], ["Risk Analyst", "ops", "mid"], ["Payments Engineer", "engineering", "senior"]],
  climate: [["Field Operations Lead", "ops", "lead"], ["Energy Markets Analyst", "ops", "mid"], ["Installation Planner", "ops", "mid"], ["Embedded Software Engineer", "engineering", "senior"]],
  saas: [["Integrations Engineer", "engineering", "mid"], ["Onboarding Specialist", "ops", "junior"]],
  health: [["Clinical Operations Lead", "ops", "lead"], ["Regulatory Affairs Manager", "ops", "senior"], ["Medical Content Specialist", "marketing", "mid"]],
  devtools: [["Developer Advocate", "marketing", "senior"], ["Developer Relations Engineer", "engineering", "mid"], ["Senior Go Engineer", "engineering", "senior"]],
  marketplace: [["Supply Growth Manager", "ops", "mid"], ["Marketplace Operations Analyst", "ops", "junior"], ["Trust & Safety Lead", "ops", "lead"]],
  aiinfra: [["ML Infrastructure Engineer", "engineering", "senior"], ["Research Engineer", "engineering", "senior"], ["GPU Kernel Engineer", "engineering", "senior"]],
};

const COUNT_BY_STAGE: Record<string, [number, number]> = {
  "pre-seed": [0, 2], seed: [1, 5], "series-a": [5, 10], "series-b": [7, 12], "series-c+": [10, 12],
};

/** Titles never posted at these companies: golden scenarios plant them explicitly. */
const RESERVED_JOB_TITLES: Record<string, RegExp> = {
  Stackharbor: /VP Engineering|Head of Engineering|Engineering Manager/,
  Grachtpay: /Head of Sales|VP Sales/,
  "Sanavo Care": /Finance|CFO|Controller|FP&A/,
};

export function buildJobs(
  portfolio: CompanyFixture[], companyMeta: Record<string, CompanyMeta>, contacts: ContactFixture[], rng: Rng,
): JobFixture[] {
  const jobs: JobFixture[] = [];
  for (const c of portfolio) {
    const m = companyMeta[c.id];
    const [lo, hi] = COUNT_BY_STAGE[c.stage!];
    const n = rng.int(lo, hi);
    const execTitles = new Set(contacts.filter((p) => p.current_company_id === c.id).map((p) => p.current_title));
    const early = c.stage === "pre-seed" || c.stage === "seed";
    const pool = [...GENERIC, ...INDUSTRY_EXTRA[m.industryKey!], ...INDUSTRY_EXTRA[m.industryKey!]].filter(([title, dept, sen]) => {
      if (execTitles.has(title)) return false;
      if (RESERVED_JOB_TITLES[c.name]?.test(title)) return false;
      if (early && (sen === "vp" || sen === "c-level" || dept === "people" || dept === "finance")) return false;
      if (c.stage === "pre-seed" && dept !== "engineering" && dept !== "product") return false;
      return true;
    });
    const chosen = new Map<string, JobTemplate>();
    // Engineering dominates hiring at most startups.
    while (chosen.size < Math.min(n, pool.length)) {
      const t = rng.weighted(pool.map((p) => [p, p[1] === "engineering" ? 2.2 : p[1] === "sales" ? 1.4 : 1] as const));
      chosen.set(t[0], t);
    }
    for (const t of chosen.values()) jobs.push(makeJob(c, m, t, rng));
  }
  return jobs;
}

export function makeJob(c: CompanyFixture, m: CompanyMeta, [title, department, seniority]: JobTemplate, rng: Rng, overrides: Partial<JobFixture> = {}): JobFixture {
  const city = cityOf(c);
  const remote_policy = rng.weighted([["hybrid", 6], ["onsite", 2], ["remote", 2]] as const);
  const employment_type = seniority === "director" && (department === "finance" || department === "marketing") && rng.chance(0.4)
    ? "fractional"
    : rng.weighted([["full-time", 90], ["contract", 5], ["part-time", 3]] as const);
  const job: JobFixture = {
    id: stableId(`job:${m.slug}:${slugify(title)}`),
    company_id: c.id,
    title,
    department,
    seniority,
    location: remote_policy === "remote" ? rng.pick(["Remote (EU)", "Remote (CET ±2h)", `Remote or ${city}`]) : city,
    remote_policy,
    employment_type,
    description: "",
    status: rng.weighted([["open", 78], ["paused", 12], ["filled", 10]] as const),
    posted_on: daysAgo(rng.int(1, 89)),
    ...overrides,
  };
  job.description = overrides.description ?? jobDescription(job, c, m, rng);
  return job;
}

// ---------------------------------------------------------------------------
// Job description phrase banks
// ---------------------------------------------------------------------------

const DOING: Record<Dept, string[]> = {
  engineering: [
    "design and ship services that sit on the critical path of every customer request",
    "own features end to end, from the first design doc to monitoring in production",
    "work closely with product and design in a small, autonomous squad",
    "raise the bar on reliability, testing and observability",
    "help us pay down the right technical debt without slowing delivery",
    "mentor other engineers and shape how we hire",
  ],
  sales: [
    "run full-cycle deals from first call to signed contract",
    "build pipeline through a mix of outbound, partner referrals and inbound",
    "work with product to feed what customers tell you back into the roadmap",
    "forecast accurately and keep the CRM honest",
    "open doors with larger accounts where procurement and security reviews are the norm",
  ],
  marketing: [
    "own the narrative and positioning for our core product",
    "build campaigns that create qualified pipeline, not just traffic",
    "turn customer stories into content that sales can actually use",
    "run experiments across channels and report on what works",
  ],
  product: [
    "talk to customers every week and turn what you learn into clear problem statements",
    "own a product area end to end with an engineering squad",
    "make trade-offs explicit and write them down",
    "work with design to keep the product simple as it grows",
  ],
  ops: [
    "build the processes and tooling that let us scale without adding headcount linearly",
    "own a core operational metric and report on it weekly",
    "be the person customers and colleagues rely on when things get messy",
    "work across sales, product and finance to remove friction",
  ],
  finance: [
    "own the monthly close, cash forecasting and reporting to the board",
    "build the financial model and keep it honest",
    "prepare us for audit, due diligence and the next fundraise",
    "partner with every budget owner on spend and hiring plans",
  ],
  people: [
    "run hiring processes that are fast, fair and well calibrated",
    "build the foundations: levelling, onboarding, reviews and compensation",
    "be a trusted partner for managers on everything people-related",
  ],
  exec: [
    "join the leadership team and own a function end to end",
    "set the plan, hire the team and report progress to the board",
    "turn a fast-growing group into a predictable, high-performing organisation",
    "work closely with the founders on strategy and fundraising",
  ],
};

const LOOKING_FOR: Record<Sen, string[]> = {
  junior: ["You have one or two years of relevant experience or an equivalent project track record.", "You learn quickly, ask good questions and enjoy a fast pace."],
  mid: ["You have three or more years of relevant experience.", "You can own a problem without a lot of supervision."],
  senior: ["You have six or more years of experience, ideally including time at a scale-up.", "You have shipped things that matter and can explain the trade-offs you made."],
  lead: ["You have led a team or a major initiative before.", "You combine hands-on depth with the ability to coach others."],
  director: ["You have built and led a team of eight or more.", "You are comfortable reporting to the founders and the board."],
  vp: ["You have led a function through a period of rapid growth, ideally from 20 to 80+ people.", "You have hired senior managers and built the operating cadence around them."],
  "c-level": ["You have held a senior leadership role at a venture-backed company.", "You have worked closely with a board and investors, including through a fundraise."],
};

function jobDescription(job: JobFixture, c: CompanyFixture, m: CompanyMeta, rng: Rng): string {
  const stageWord = { "pre-seed": "a pre-seed", seed: "a seed-stage", "series-a": "a Series A", "series-b": "a Series B", "series-c+": "a growth-stage" }[c.stage!];
  const p1 = rng.pick([
    `${c.name} builds ${m.product} for ${m.customer}. We are ${stageWord} company of ${c.employee_count_range} people based in ${cityOf(c)}, backed by Stroopwafel Ventures.`,
    `At ${c.name} we make ${m.product} for ${m.customer}. We are ${stageWord} team in ${cityOf(c)} and growing quickly.`,
    `${c.name} is ${stageWord} company in ${cityOf(c)} building ${m.product}. Our customers are ${m.customer}.`,
  ]);
  const doing = rng.sample(DOING[job.department], 3);
  const p2 = `As our ${job.title}, you will ${doing[0]}. You will also ${doing[1]}, and ${doing[2]}.`;
  const p3 = `${LOOKING_FOR[job.seniority].join(" ")} ${rng.pick([
    "Experience in our industry helps, but it is not required.",
    "You care about the customer and like working in small teams.",
    "Dutch is a plus, not a requirement; we work in English.",
  ])}`;
  const p4 = rng.pick([
    `This is a ${job.employment_type} role, ${job.remote_policy === "remote" ? "fully remote within Europe" : `${job.remote_policy} in ${cityOf(c)}`}. The process is an intro call, a practical exercise and a conversation with the founders.`,
    `We offer a competitive salary, meaningful equity and a ${job.remote_policy} setup. We aim to complete interviews within three weeks.`,
    "",
  ]);
  return [p1, p2, p3, p4].filter(Boolean).join("\n\n");
}
