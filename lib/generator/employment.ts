/**
 * Stage 4: employment history (LinkedIn "Positions").
 *
 * Expands each contact's career plan into 2–5 positions, newest last:
 *   [older roles …] [cluster stint, if any] [roles in between …] [current]
 * Cluster stints are placed so they contain the cluster's core month,
 * which guarantees overlapping dates between cluster members.
 *
 * Also writes each contact's first-person `summary`, because only now do
 * we know their previous employers.
 */
import type { CompanyFixture, ContactFixture, EmploymentFixture } from "../fixtures";
import { FN_BLURBS, titleFor } from "./careers";
import { countryOf } from "./companies";
import { cityOf } from "./contacts";
import { monthToIso, TODAY_MONTH, yearOfMonth } from "./dates";
import { stableId } from "./ids";
import type { Rng } from "./rng";
import type { Cluster, CompanyMeta, ContactMeta, Fn } from "./types";

/** Former employers that are not in the companies table (company_id stays null). */
const OFF_GRAPH_EMPLOYERS = [
  "Blauwbrug Software", "Kroketlab Digital", "Tulip Lane Agency", "Northsea Data Consultancy", "Molenaar & Zonen",
  "Vondel Interactive", "Brickhouse Commerce", "Zuidas Advisory Group", "Lindenhof Logistics", "Keizers Media",
  "Pijp Partners", "Oostpoort Systems", "Amstelveen IT Services", "Riverbend Analytics", "Sterling Mill Consulting",
];

interface Stint {
  companyId: string | null;
  companyName: string;
  title: string;
  start: number;
  end: number | null;
  fn: Fn;
}

export function buildEmployment(
  companies: CompanyFixture[], companyMeta: Record<string, CompanyMeta>,
  contacts: ContactFixture[], meta: Record<string, ContactMeta>, clusters: Cluster[], rng: Rng,
): EmploymentFixture[] {
  const rows: EmploymentFixture[] = [];
  const companyById = Object.fromEntries(companies.map((c) => [c.id, c]));
  const clusterById = Object.fromEntries(clusters.map((c) => [c.id, c]));
  const kinds = {
    corporate: companies.filter((c) => c.kind === "corporate"),
    startup: companies.filter((c) => c.kind === "startup"),
    investor: companies.filter((c) => c.kind === "investor"),
    consultancy: companies.filter((c) => companyMeta[c.id].corpKind === "consultancy"),
  };

  /** Pick a plausible former employer for a stint starting at `start`. */
  const pickEmployer = (type: string, bgFn: Fn, start: number, avoid: Set<string>): CompanyFixture | null => {
    if (rng.chance(0.1)) return null; // off-graph employer
    const pools: [CompanyFixture[], number][] = {
      portfolio_exec: [[kinds.corporate, 2], [kinds.startup, 3], [kinds.consultancy, bgFn === "strategy" || bgFn === "finance" ? 2 : 0.3], [kinds.investor, bgFn === "investing" ? 1 : 0.1]],
      investor: [[kinds.consultancy, 2], [kinds.corporate, 1], [kinds.startup, 2], [kinds.investor, 2]],
      corporate: [[kinds.corporate, 3], [kinds.consultancy, 1], [kinds.startup, 1.5]],
      expert: [[kinds.corporate, 2], [kinds.startup, 2], [kinds.consultancy, 0.5]],
    }[type] as [CompanyFixture[], number][] ?? [[kinds.startup, 3], [kinds.corporate, 1.5]];
    for (let attempt = 0; attempt < 12; attempt++) {
      const pool = rng.weighted(pools.filter(([p, w]) => p.length && w > 0));
      const c = rng.pick(pool);
      if (!avoid.has(c.id) && companyMeta[c.id].foundedMonth <= start) return c;
    }
    return rng.pick(kinds.corporate.filter((c) => !avoid.has(c.id)));
  };

  for (const contact of contacts) {
    const m = meta[contact.id];
    if (m.golden) continue; // golden contacts get hand-written histories (golden.ts)
    const cluster = m.clusterId ? clusterById[m.clusterId] : null;
    const alumniOf = cluster && cluster.companyId !== m.currentCompanyId ? cluster : null;

    const current: Stint = {
      companyId: m.currentCompanyId, companyName: m.currentCompanyName ?? "Self-employed",
      title: m.currentTitle ?? titleFor(m.fn, m.level), start: m.currentStart, end: m.currentEnd, fn: m.fn,
    };
    const avoid = new Set<string>([m.currentCompanyId ?? "", cluster?.companyId ?? ""]);
    const past: Stint[] = []; // oldest first
    let slots = m.positions - 1;

    // Level of the role just before the current one; founders/experts were senior already.
    let level = m.portfolioRole === "founder" ? rng.int(3, 5) : Math.max(0, m.level - rng.int(0, 1));
    const fnFor = (c: CompanyFixture | null) => (c?.kind === "investor" ? "investing" : m.bgFn) as Fn;
    const titleAt = (c: CompanyFixture | null, lvl: number) => titleFor(fnFor(c), lvl, !!c && companyMeta[c.id].corpKind === "consultancy");

    // Cluster stint (alumni only) plus roles between it and the current job.
    let olderThan = current.start; // all remaining stints end before this month
    if (alumniOf) {
      const host = companyById[alumniOf.companyId];
      const end = Math.min(alumniOf.coreMonth + rng.int(3, 30), current.start - rng.int(1, 3));
      const start = Math.max(companyMeta[host.id].foundedMonth, alumniOf.coreMonth - rng.int(3, 30));
      const room = current.start - end;
      const between = Math.min(slots - 1, Math.floor(room / 16), rng.int(0, 2));
      // in-between roles, laid out evenly
      const seg = between > 0 ? Math.floor((room - 1) / between) : 0;
      const betweenStints: Stint[] = [];
      for (let b = 0; b < between; b++) {
        const s = end + 1 + b * seg + (b === 0 ? rng.int(0, 2) : 0);
        const e = Math.min(end + (b + 1) * seg, current.start - 1);
        const c = pickEmployer(contact.contact_type, m.bgFn, s, avoid);
        if (c) avoid.add(c.id);
        betweenStints.push({ companyId: c?.id ?? null, companyName: c?.name ?? rng.pick(OFF_GRAPH_EMPLOYERS), title: titleAt(c, level), start: s, end: e, fn: fnFor(c) });
      }
      const anchorLevel = Math.max(0, level - (between > 0 ? 1 : 0) - rng.int(0, 1));
      past.unshift(...betweenStints);
      past.unshift({ companyId: host.id, companyName: host.name, title: titleAt(host, anchorLevel), start, end, fn: fnFor(host) });
      slots -= between + 1;
      level = Math.max(0, anchorLevel - rng.int(0, 1));
      olderThan = start;
    }

    // Older roles, walking backwards in time.
    for (let k = 0; k < slots; k++) {
      const end = olderThan - rng.int(0, 3);
      const start = end - rng.int(12, 44);
      const c = pickEmployer(contact.contact_type, m.bgFn, start, avoid);
      if (c) avoid.add(c.id);
      past.unshift({ companyId: c?.id ?? null, companyName: c?.name ?? rng.pick(OFF_GRAPH_EMPLOYERS), title: titleAt(c, level), start, end: Math.max(start + 6, end), fn: fnFor(c) });
      level = Math.max(0, level - rng.int(0, 1));
      olderThan = start;
    }

    const stints = [...past, current];
    stints.forEach((s, i) => {
      const company = s.companyId ? companyById[s.companyId] : null;
      const city = company && rng.chance(0.8) ? cityOf(company) : m.homeCity;
      rows.push({
        id: stableId(`employment:${contact.id}:${i}`),
        contact_id: contact.id,
        company_id: s.companyId,
        company_name: s.companyName,
        title: s.title,
        description: rng.chance(0.55) ? rng.pick(FN_BLURBS[s.fn]) : null,
        location: rng.chance(0.8) ? `${city}, ${countryOf(city)}` : null,
        started_on: monthToIso(s.start),
        finished_on: s.end === null ? null : monthToIso(Math.min(s.end, TODAY_MONTH)),
      });
    });

    contact.summary = rng.chance(0.9) ? writeSummary(contact, m, stints, companyMeta, rng) : null;
  }
  return rows;
}

/**
 * Light mess: a few past positions lose their company_id although the
 * company_name matches a company exactly (as if typed in by hand).
 */
export function unlinkSomeEmployment(rows: EmploymentFixture[], meta: Record<string, ContactMeta>, rng: Rng, count = 14) {
  const candidates = rows.filter((r) => r.company_id && r.finished_on && !meta[r.contact_id]?.golden);
  for (const r of rng.sample(candidates, count)) r.company_id = null;
}

/** First-person LinkedIn-style "About" text. */
function writeSummary(c: ContactFixture, m: ContactMeta, stints: Stint[], companyMeta: Record<string, CompanyMeta>, rng: Rng): string {
  const prev = stints.slice(0, -1).reverse();
  const prevNames = prev.map((s) => s.companyName).filter((n, i, a) => a.indexOf(n) === i);
  const before = prevNames.length
    ? rng.pick([`Before that I was at ${listify(prevNames.slice(0, 2))}.`, `Previously: ${prev.slice(0, 2).map((s) => `${s.title} at ${s.companyName}`).join("; ")}.`, `I spent the earlier part of my career at ${listify(prevNames.slice(0, 3))}.`])
    : "";
  const tags = c.expertise_tags.slice(0, 3);
  const cur = stints[stints.length - 1];
  const product = cur.companyId ? companyMeta[cur.companyId]?.product : "";
  const year = yearOfMonth(cur.start);

  switch (c.contact_type) {
    case "portfolio_exec":
      return m.portfolioRole === "founder"
        ? rng.pick([
            `I co-founded ${cur.companyName} in ${year} to build ${product}. ${before} I care about ${listify(tags)}.`,
            `Building ${cur.companyName} (${product}) since ${year}. ${before} Happy to talk about ${listify(tags.slice(0, 2))} with other founders.`,
          ])
        : rng.pick([
            `${cur.title} at ${cur.companyName}, where we build ${product}. ${before}`,
            `I joined ${cur.companyName} in ${year} as ${cur.title}. ${before} Focus areas: ${listify(tags)}.`,
          ]);
    case "investor":
      return rng.pick([
        `${cur.title} at ${cur.companyName}. I back early-stage teams in ${listify(tags.slice(-2))}. ${before}`,
        `Investor since ${year}. ${before} Always happy to meet founders working on ${listify(tags.slice(0, 2))}.`,
      ]);
    case "expert":
      return rng.pick([
        `${cur.title} working with growth-stage companies on ${listify(tags.slice(0, 2))}. ${before}`,
        `I help founders with ${listify(tags.slice(0, 2))}. ${before} Currently taking on one or two new clients.`,
        `Operator turned advisor. ${before} Today I work as ${cur.title.toLowerCase()} for a small number of companies.`,
      ]);
    case "candidate":
      return m.betweenRoles
        ? `Most recently ${cur.title} at ${cur.companyName}. ${before} Taking some time to choose my next role, ideally in ${listify(tags.slice(0, 2))}.`
        : rng.pick([
            `${cur.title} at ${cur.companyName}. ${before} Interested in ${listify(tags.slice(0, 2))}.`,
            `I work on ${listify(tags.slice(0, 2))} at ${cur.companyName}. ${before}`,
          ]);
    case "corporate":
      return rng.pick([
        `${cur.title} at ${cur.companyName}. ${before} I work with startups on pilots and partnerships when there is a clear business case.`,
        `${cur.title} at ${cur.companyName} since ${year}. ${before}`,
      ]);
    default:
      return `${cur.title} at ${cur.companyName}. ${before}`.trim();
  }
}

export function listify(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
