/**
 * Stage 3: contacts and clusters.
 *
 * Decides WHO exists and where they work today:
 *   - portfolio execs (2–4 per portfolio company, founder/CEO first)
 *   - investors at the other VC funds, plus a few angels
 *   - corporate contacts across functions
 *   - experts / NEDs / fractional execs
 *   - candidates (a few between roles)
 *   - operators at startups and scale-ups, and a handful of "other"
 *
 * Then it forms CLUSTERS: 3–10 people who worked at the same corporate,
 * fund or scale-up at overlapping times. Every member's stint at the
 * cluster company contains the cluster's `coreMonth`, so any two members
 * overlapped there. Clusters are what make "reachable via a former
 * colleague" paths possible.
 *
 * The employment stage (employment.ts) later expands each contact's
 * career plan into 2–5 LinkedIn-style positions.
 */
import type { CompanyFixture, ContactFixture, ContactType } from "../fixtures";
import { FN_TAGS, LADDERS, titleFor } from "./careers";
import { countryOf, INDUSTRY_LABEL, lowerIndustry } from "./companies";
import { monthOf, TODAY_MONTH } from "./dates";
import { emailLocal, slugify, stableId } from "./ids";
import type { NameFactory } from "./names";
import type { Rng } from "./rng";
import type { Cluster, CompanyMeta, ContactMeta, Fn } from "./types";

export const cityOf = (c: CompanyFixture) => c.hq_location.split(",")[0];

/**
 * Golden scenarios need some corporate functions to be "empty" so the
 * planted best-fit contact is the obvious answer. Random corporate
 * contacts are never generated in these functions at these companies.
 */
const RESERVED_FUNCTIONS: Record<string, Fn[]> = {
  "Noordhaven Bank": ["partnerships"],
  "Huisgoed Retail Group": ["procurement"],
  Assistora: ["partnerships"],
  "Veenstroom Energy": ["strategy", "energy_systems"],
};
/** Portfolio companies whose golden need is a role they do not have yet. */
const RESERVED_EXEC_FNS: Record<string, Fn[]> = {
  Stackharbor: ["engineering"],
  "Sanavo Care": ["finance"],
};

const CORP_FUNCTIONS: Record<string, Fn[]> = {
  bank: ["finance", "product", "strategy", "engineering", "legal", "sales", "data", "operations"],
  payments: ["partnerships", "sales", "product", "engineering", "legal", "strategy"],
  support_software: ["product", "engineering", "sales", "marketing", "customer_success"],
  telco: ["partnerships", "product", "strategy", "engineering", "sales", "procurement"],
  energy: ["product", "engineering", "data", "marketing", "sales", "operations"],
  retail: ["marketing", "operations", "engineering", "data", "finance", "strategy"],
  consultancy: ["strategy"],
  insurance: ["product", "partnerships", "strategy", "data", "finance"],
  logistics: ["operations", "procurement", "engineering", "sales", "strategy"],
  hospital: ["operations", "clinical", "procurement", "finance", "data"],
  cloud: ["partnerships", "sales", "engineering", "product", "marketing"],
};
const CORP_HEADCOUNT: Record<string, number> = {
  bank: 8, payments: 6, support_software: 6, telco: 6, energy: 6, retail: 7,
  consultancy: 6, insurance: 4, logistics: 4, hospital: 4, cloud: 4,
};

// Expert archetypes: [count, fn, current title, level]
const EXPERT_ARCHETYPES: [number, Fn, string[], number][] = [
  [5, "finance", ["Fractional CFO", "Interim CFO", "Fractional Finance Director"], 6],
  [4, "marketing", ["Fractional CMO", "Growth Advisor"], 6],
  [3, "engineering", ["Fractional CTO", "Engineering Advisor"], 6],
  [3, "people", ["Fractional Chief People Officer", "Interim Head of People"], 5],
  [5, "general_management", ["Non-Executive Director", "Board Member & Advisor"], 6],
  [4, "legal", ["Independent Regulatory Advisor", "Payments Licensing Consultant", "MDR & Privacy Advisor"], 5],
  [3, "clinical", ["Medical Advisor", "Clinical Strategy Advisor"], 6],
  [4, "sales", ["GTM Advisor", "Sales Leadership Coach", "Enterprise Sales Advisor"], 5],
  [3, "product", ["Fractional CPO", "Product Advisor"], 6],
  [2, "strategy", ["Pricing Consultant", "Corporate Venturing Advisor"], 5],
  [2, "energy_systems", ["Energy Markets Advisor"], 5],
  [2, "data", ["AI & Data Advisor"], 5],
];

const OTHER_PEOPLE: [string, string, Fn][] = [
  ["Community Lead", "Canal Founders Collective", "marketing"],
  ["Tech Journalist", "Amstel Tech Weekly", "marketing"],
  ["Research Fellow, Applied AI", "Polder Institute for Applied Computing", "data"],
  ["Programme Director", "Delta Startup Accelerator", "general_management"],
  ["Innovation Policy Advisor", "Metropolitan Innovation Office", "strategy"],
  ["Founder & Organiser", "Waffle Iron Tech Week", "marketing"],
  ["Podcast Host", "Syrup & Servers Podcast", "marketing"],
  ["Lecturer in Entrepreneurship", "Hogeschool Amstelland", "strategy"],
  ["Founder Services Lead", "Expat Founders Desk", "operations"],
  ["Ecosystem Lead", "Grachtengordel Startup Hub", "partnerships"],
];

interface Spec {
  slugKey: string;
  type: ContactType;
  fn: Fn;
  bgFn: Fn;
  level: number;
  companyId: string | null;
  companyName: string | null;
  title: string | null;
  currentStart: number;
  currentEnd: number | null;
  portfolioRole: "founder" | "exec" | null;
  preferRegion?: string;
  positions: number;
  extraTags: string[];
}

export interface ContactsStage {
  contacts: ContactFixture[];
  contactMeta: Record<string, ContactMeta>;
  clusters: Cluster[];
}

export function buildContacts(
  companies: CompanyFixture[],
  companyMeta: Record<string, CompanyMeta>,
  rng: Rng,
  names: NameFactory,
): ContactsStage {
  const specs: Spec[] = [];
  const byKind = (k: string) => companies.filter((c) => c.kind === k);
  const portfolio = byKind("portfolio");
  const corporates = byKind("corporate");
  const investors = byKind("investor");
  const startups = byKind("startup");
  const positionsFor = (level: number) => Math.min(5, Math.max(2, rng.int(2, 3) + (level >= 4 ? rng.int(0, 2) : 0)));
  const dutch = (c: CompanyFixture) => (c.hq_location.endsWith("Netherlands") && rng.chance(0.5) ? "nl" : undefined);
  const industryTag = (c: CompanyFixture) => {
    const m = companyMeta[c.id];
    return m.industryKey ? lowerIndustry(INDUSTRY_LABEL[m.industryKey]) : lowerIndustry(c.industry);
  };

  // --- Portfolio execs ------------------------------------------------------
  for (const c of portfolio) {
    const m = companyMeta[c.id];
    const ind = m.industryKey!;
    const n = { "pre-seed": 2, seed: rng.chance(0.4) ? 3 : 2, "series-a": rng.chance(0.6) ? 3 : 2, "series-b": rng.chance(0.5) ? 4 : 3, "series-c+": 4 }[c.stage!];
    const techy = ["devtools", "aiinfra", "saas", "fintech"].includes(ind);
    const founderBg: Fn[] = ["product", "sales", "strategy", "finance", "general_management", "operations",
      ...(ind === "health" ? (["clinical"] as Fn[]) : []), ...(ind === "climate" ? (["energy_systems"] as Fn[]) : [])];
    const roles: { title: string; fn: Fn; bgFn: Fn; level: number; founder: boolean }[] = [
      { title: rng.pick(["Co-founder & CEO", "Founder & CEO", "CEO & Co-founder"]), fn: "general_management", bgFn: rng.pick(founderBg), level: 6, founder: true },
      techy || rng.chance(0.5)
        ? { title: "Co-founder & CTO", fn: "engineering", bgFn: "engineering", level: 6, founder: true }
        : { title: "Co-founder & COO", fn: "operations", bgFn: "operations", level: 6, founder: true },
    ];
    const late = c.stage === "series-b" || c.stage === "series-c+";
    type ExecRole = { title: string; fn: Fn; level: number };
    const pool = ([
      { title: late ? "VP Sales" : "Head of Sales", fn: "sales", level: late ? 5 : 4 },
      { title: "Head of Product", fn: "product", level: 4 },
      { title: late ? "CFO" : "Head of Finance", fn: "finance", level: late ? 6 : 4 },
      { title: "Head of People", fn: "people", level: 4 },
      { title: late ? "VP Marketing" : "Head of Growth", fn: "marketing", level: late ? 5 : 4 },
      { title: late ? "VP Engineering" : "Head of Engineering", fn: "engineering", level: late ? 5 : 4 },
      ...(ind === "health" ? [{ title: "Chief Medical Officer", fn: "clinical" as Fn, level: 6 }] : []),
      ...(ind === "marketplace" ? [{ title: "Head of Supply", fn: "operations" as Fn, level: 4 }] : []),
      ...(ind === "climate" ? [{ title: "Head of Operations", fn: "operations" as Fn, level: 4 }] : []),
      ...(ind === "fintech" ? [{ title: "Head of Compliance", fn: "legal" as Fn, level: 4 }] : []),
      ...(ind === "saas" || ind === "devtools" ? [{ title: "Head of Customer Success", fn: "customer_success" as Fn, level: 4 }] : []),
    ] as ExecRole[]).filter((r) => !(RESERVED_EXEC_FNS[c.name] ?? []).includes(r.fn) && !(roles[1].fn === r.fn));
    for (const r of rng.sample(pool, n - 2)) roles.push({ ...r, bgFn: r.fn, founder: false });

    roles.forEach((r, i) => {
      const start = r.founder ? m.foundedMonth : rng.int(m.foundedMonth + 4, Math.max(m.foundedMonth + 5, TODAY_MONTH - 2));
      specs.push({
        slugKey: `portfolio:${m.slug}:${i}`, type: "portfolio_exec", fn: r.fn, bgFn: r.bgFn, level: r.level,
        companyId: c.id, companyName: c.name, title: r.title, currentStart: start, currentEnd: null,
        portfolioRole: r.founder ? "founder" : "exec", preferRegion: dutch(c),
        positions: r.founder ? rng.int(2, 4) : positionsFor(r.level), extraTags: [industryTag(c)],
      });
    });
  }

  // --- Investors at other funds, plus angels --------------------------------
  investors.forEach((c, fi) => {
    const m = companyMeta[c.id];
    const count = c.name === "Copperbeech Growth" || c.name === "Fjordline Ventures" ? 2 : fi < 4 ? 4 : 3;
    const levels = [rng.pick([4, 5]), 3, 1, 2].slice(0, count);
    if (c.name === "Copperbeech Growth") levels.splice(0, 2, 3, 1); // golden scenario plants the health partner
    levels.forEach((level, i) => {
      specs.push({
        slugKey: `investor:${m.slug}:${i}`, type: "investor", fn: "investing", bgFn: rng.pick(["strategy", "finance", "product", "general_management", "investing"] as Fn[]),
        level, companyId: c.id, companyName: c.name, title: titleFor("investing", level),
        currentStart: TODAY_MONTH - rng.int(8, 84), currentEnd: null, portfolioRole: null, preferRegion: dutch(c),
        positions: positionsFor(level), extraTags: m.focus.map((f) => lowerIndustry(INDUSTRY_LABEL[f as keyof typeof INDUSTRY_LABEL])),
      });
    });
  });
  for (let i = 0; i < 6; i++) {
    specs.push({
      slugKey: `angel:${i}`, type: "investor", fn: "investing", bgFn: "general_management", level: 6,
      companyId: null, companyName: "Self-employed", title: rng.pick(["Angel Investor", "Angel Investor & Advisor"]),
      currentStart: TODAY_MONTH - rng.int(12, 72), currentEnd: null, portfolioRole: null, positions: rng.int(3, 5),
      extraTags: ["angel investing", rng.pick(["fintech", "B2B SaaS", "climate tech", "health tech"])],
    });
  }

  // --- Corporate contacts ---------------------------------------------------
  for (const c of corporates) {
    const m = companyMeta[c.id];
    const fns = CORP_FUNCTIONS[m.corpKind!].filter((f) => !(RESERVED_FUNCTIONS[c.name] ?? []).includes(f));
    for (let i = 0; i < CORP_HEADCOUNT[m.corpKind!]; i++) {
      const fn = rng.pick(fns);
      const level = rng.weighted([[2, 3], [3, 4], [4, 4], [5, 2]] as const);
      specs.push({
        slugKey: `corporate:${m.slug}:${i}`, type: "corporate", fn, bgFn: fn, level,
        companyId: c.id, companyName: c.name, title: titleFor(fn, level, m.corpKind === "consultancy"),
        currentStart: TODAY_MONTH - rng.int(6, 120), currentEnd: null, portfolioRole: null, preferRegion: dutch(c),
        positions: positionsFor(level), extraTags: [lowerIndustry(c.industry)],
      });
    }
  }

  // --- Experts / NEDs / fractional -----------------------------------------
  let ei = 0;
  for (const [count, fn, titles, level] of EXPERT_ARCHETYPES) {
    for (let k = 0; k < count; k++, ei++) {
      const ned = fn === "general_management";
      const board = ned ? rng.pick(startups) : null;
      specs.push({
        slugKey: `expert:${ei}`, type: "expert", fn, bgFn: fn === "general_management" ? rng.pick(["sales", "product", "finance", "operations"] as Fn[]) : fn,
        level, companyId: board?.id ?? null, companyName: board?.name ?? rng.pick(["Self-employed", "Self-employed", "Independent"]),
        title: rng.pick(titles), currentStart: TODAY_MONTH - rng.int(4, 54), currentEnd: null, portfolioRole: null,
        positions: rng.int(3, 5), extraTags: [rng.pick(["fractional", "advisory", "board work"])],
      });
    }
  }

  // --- Candidates -----------------------------------------------------------
  const deptFns: [Fn, number][] = [["engineering", 26], ["data", 5], ["sales", 18], ["partnerships", 3], ["product", 12], ["design", 3], ["marketing", 10], ["operations", 7], ["customer_success", 4], ["finance", 7], ["people", 5]];
  const betweenRoles = new Set(rng.sample([...Array(80).keys()], 6));
  for (let i = 0; i < 80; i++) {
    const fn = rng.weighted(deptFns);
    const level = rng.weighted([[1, 2], [2, 4], [3, 4], [4, 3], [5, 1.5]] as const);
    const atCorp = rng.chance(0.3);
    let employer = rng.pick(atCorp ? corporates : startups);
    while ((RESERVED_FUNCTIONS[employer.name] ?? []).includes(fn)) employer = rng.pick(startups);
    const between = betweenRoles.has(i);
    const start = TODAY_MONTH - rng.int(between ? 14 : 6, 60);
    specs.push({
      slugKey: `candidate:${i}`, type: "candidate", fn, bgFn: fn, level,
      companyId: employer.id, companyName: employer.name,
      title: titleFor(fn, level, companyMeta[employer.id].corpKind === "consultancy"),
      currentStart: start, currentEnd: between ? TODAY_MONTH - rng.int(1, 6) : null, portfolioRole: null,
      positions: positionsFor(level), extraTags: [lowerIndustry(employer.industry)],
    });
  }

  // --- Operators at startups / scale-ups -----------------------------------
  const opFns: Fn[] = ["engineering", "engineering", "product", "design", "data", "sales", "sales", "marketing", "customer_success", "finance", "operations", "people", "partnerships"];
  for (let i = 0; i < 70; i++) {
    const fn = rng.pick(opFns);
    const level = rng.weighted([[1, 2], [2, 3], [3, 4], [4, 3], [5, 1]] as const);
    const employer = rng.pick(startups);
    specs.push({
      slugKey: `operator:${i}`, type: "operator", fn, bgFn: fn, level,
      companyId: employer.id, companyName: employer.name, title: titleFor(fn, level),
      currentStart: Math.max(companyMeta[employer.id].foundedMonth + 2, TODAY_MONTH - rng.int(4, 72)), currentEnd: null,
      portfolioRole: null, preferRegion: dutch(employer), positions: positionsFor(level), extraTags: [lowerIndustry(employer.industry)],
    });
  }

  // --- Other (community, media, academia) ----------------------------------
  OTHER_PEOPLE.forEach(([title, org, fn], i) => {
    specs.push({
      slugKey: `other:${i}`, type: "other", fn, bgFn: fn, level: 4, companyId: null, companyName: org, title,
      currentStart: TODAY_MONTH - rng.int(6, 60), currentEnd: null, portfolioRole: null, preferRegion: "nl",
      positions: rng.int(2, 4), extraTags: ["startup ecosystem"],
    });
  });

  // --- Materialise contacts -------------------------------------------------
  const contacts: ContactFixture[] = [];
  const contactMeta: Record<string, ContactMeta> = {};
  const companyById = Object.fromEntries(companies.map((c) => [c.id, c]));
  for (const s of specs) {
    const id = stableId(`contact:${s.slugKey}`);
    const name = names.next(s.preferRegion);
    const company = s.companyId ? companyById[s.companyId] : null;
    const between = s.currentEnd !== null;
    const city = company && rng.chance(0.7) ? cityOf(company) : name.homeCity;
    const tags = Array.from(new Set([...rng.sample(FN_TAGS[s.fn], rng.int(2, 3)), ...s.extraTags, ...(s.bgFn !== s.fn ? rng.sample(FN_TAGS[s.bgFn], 1) : [])]));
    contacts.push({
      id,
      first_name: name.first,
      last_name: name.last,
      email: makeEmail(name.first, name.last, company ? companyMeta[company.id].domain : null, between, rng),
      linkedin_url: rng.chance(0.88) ? `https://www.linkedin.com/in/fictional-${slugify(`${name.first}-${name.last}`)}-${rng.hex(4)}` : null,
      headline: null, // filled below once titles are final
      summary: null, // written by the employment stage, which knows the full history
      location: rng.chance(0.95) ? `${city}, ${countryOf(city)}` : null,
      current_company_id: between ? null : s.companyId,
      current_company_name: between ? null : s.companyName,
      current_title: between ? null : s.title,
      contact_type: s.type,
      expertise_tags: tags,
      source: "seed",
    });
    contactMeta[id] = {
      id, fn: s.fn, level: s.level, homeCity: name.homeCity, region: name.region, clusterId: null,
      betweenRoles: between, duplicateOf: null, golden: null, portfolioRole: s.portfolioRole, bgFn: s.bgFn,
      currentCompanyId: s.companyId, currentCompanyName: s.companyName, currentTitle: s.title,
      currentStart: s.currentStart, currentEnd: s.currentEnd, positions: s.positions,
    };
  }
  for (const c of contacts) c.headline = makeHeadline(c, contactMeta[c.id], rng);

  const clusters = buildClusters(companies, companyMeta, contacts, contactMeta, rng);
  return { contacts, contactMeta, clusters };
}

/**
 * Clusters: every corporate, the larger funds and ~15 scale-ups get one.
 * Members are some current employees (whose start date is moved before
 * the core month) plus alumni (who get a past stint containing it).
 */
function buildClusters(
  companies: CompanyFixture[], companyMeta: Record<string, CompanyMeta>,
  contacts: ContactFixture[], meta: Record<string, ContactMeta>, rng: Rng,
): Cluster[] {
  const clusters: Cluster[] = [];
  const hosts = [
    ...companies.filter((c) => c.kind === "corporate"),
    ...rng.sample(companies.filter((c) => c.kind === "investor"), 6),
    ...rng.sample(companies.filter((c) => c.kind === "startup"), 15),
  ];
  const typeWeight: Record<string, number> = { portfolio_exec: 3, candidate: 2, operator: 2, expert: 1.5, corporate: 1, investor: 1, other: 0.3 };

  for (const host of hosts) {
    const hm = companyMeta[host.id];
    const earliest = Math.max(monthOf("2014-01-01"), hm.foundedMonth + 18);
    const latest = host.kind === "corporate" ? monthOf("2023-06-01") : monthOf("2022-06-01");
    if (earliest >= latest) continue;
    const core = rng.int(earliest, latest);
    const cluster: Cluster = { id: `cluster:${hm.slug}`, companyId: host.id, coreMonth: core, memberIds: [] };
    const size = rng.int(3, 10);

    // Current employees who were already there at the core month.
    const current = rng.shuffle(contacts.filter((c) => meta[c.id].currentCompanyId === host.id && !meta[c.id].clusterId && !meta[c.id].betweenRoles));
    for (const c of current.slice(0, Math.min(rng.int(1, 4), size - 2))) {
      const m = meta[c.id];
      m.currentStart = Math.max(hm.foundedMonth, Math.min(m.currentStart, core - rng.int(3, 30)));
      m.clusterId = cluster.id;
      cluster.memberIds.push(c.id);
    }

    // Alumni: anyone whose current job started comfortably after the core month.
    const alumniPool = contacts.filter((c) => {
      const m = meta[c.id];
      return !m.clusterId && m.currentCompanyId !== host.id && m.currentStart >= core + 8 && m.level >= 1;
    });
    while (cluster.memberIds.length < size && alumniPool.length) {
      const pick = rng.weighted(alumniPool.map((c) => [c, (typeWeight[c.contact_type] ?? 1) * (host.kind === "investor" && c.contact_type === "investor" ? 3 : 1)] as const));
      alumniPool.splice(alumniPool.indexOf(pick), 1);
      meta[pick.id].clusterId = cluster.id;
      cluster.memberIds.push(pick.id);
    }
    if (cluster.memberIds.length >= 3) clusters.push(cluster);
    else for (const id of cluster.memberIds) meta[id].clusterId = null;
  }
  return clusters;
}

const PERSONAL_DOMAINS = ["mailbox.example", "inbox.example", "postvak.example", "fastmail.example"];

export function makeEmail(first: string, last: string, companyDomain: string | null, between: boolean, rng: Rng): string | null {
  const r = rng.float();
  if (companyDomain && !between && r < 0.55) {
    return rng.chance(0.8) ? `${emailLocal(first, last)}@${companyDomain}` : `${slugify(first).replace(/-/g, "")}@${companyDomain}`;
  }
  if (r < 0.72) return `${emailLocal(first, last)}${rng.chance(0.3) ? rng.int(1, 99) : ""}@${rng.pick(PERSONAL_DOMAINS)}`;
  return null; // like real LinkedIn exports, many contacts have no email
}

function makeHeadline(c: ContactFixture, m: ContactMeta, rng: Rng): string | null {
  if (rng.chance(0.05)) return null;
  if (m.betweenRoles) {
    const role = LADDERS[m.fn][Math.min(6, m.level + 1)];
    return rng.pick([`Open to ${role} roles`, `${LADDERS[m.fn][m.level]} | Exploring what's next`, `Former ${m.currentTitle} at ${m.currentCompanyName}`]);
  }
  const at = c.current_company_name && !["Self-employed", "Independent"].includes(c.current_company_name) ? ` at ${c.current_company_name}` : "";
  const tags = c.expertise_tags.slice(0, 2).map((t) => t[0].toUpperCase() + t.slice(1)).join(" · ");
  return rng.pick([`${c.current_title}${at}`, `${c.current_title}${at} | ${tags}`, `${c.current_title}${at}`, `${tags} | ${c.current_title}`]);
}
