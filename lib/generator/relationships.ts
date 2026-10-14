/**
 * Stage 5: relationships (user_contacts).
 *
 * Who on the Stroopwafel team knows whom, and how well (1–5):
 *   - the investment team mostly knows founders and investors
 *   - talent participants know candidates (and operators)
 *   - partnerships and community participants know corporates and experts
 *   - deal-team members know their portfolio company's execs well
 * About 15% of contacts are known by nobody: they are reachable only via
 * someone they worked with (employment overlap).
 */
import type { ContactFixture, DealTeamFixture, UserContactFixture, UserRole } from "../fixtures";
import type { Rng } from "./rng";
import type { ContactMeta, TeamMember } from "./types";

// Affinity of each role for each contact type (relative weights).
const AFFINITY: Record<UserRole, Record<string, number>> = {
  investment: { portfolio_exec: 6, investor: 8, expert: 1.5, corporate: 1, candidate: 0.4, operator: 1, other: 0.5 },
  talent: { portfolio_exec: 1.5, investor: 0.2, expert: 1, corporate: 0.5, candidate: 9, operator: 4, other: 0.5 },
  partnerships: { portfolio_exec: 1.5, investor: 0.8, expert: 3, corporate: 9, candidate: 0.3, operator: 1, other: 1 },
  community: { portfolio_exec: 2, investor: 1, expert: 5, corporate: 3, candidate: 1, operator: 4, other: 6 },
  platform: { portfolio_exec: 5, investor: 0.5, expert: 2.5, corporate: 1.5, candidate: 1, operator: 2, other: 1 },
  operations: { portfolio_exec: 1.5, investor: 1, expert: 3, corporate: 0.8, candidate: 0.5, operator: 1, other: 2 },
  admin: { portfolio_exec: 0.6, investor: 0.3, expert: 0.6, corporate: 0.4, candidate: 0.3, operator: 0.6, other: 0.6 },
};

const BASE_STRENGTH = [[1, 12], [2, 38], [3, 33], [4, 12], [5, 5]] as const;

export function buildRelationships(
  contacts: ContactFixture[], meta: Record<string, ContactMeta>, team: TeamMember[], dealTeam: DealTeamFixture[], rng: Rng,
): UserContactFixture[] {
  const rows = new Map<string, UserContactFixture>();
  const add = (user_key: string, contact_id: string, strength: number) => {
    const k = `${user_key}|${contact_id}`;
    const s = Math.max(1, Math.min(5, strength)) as UserContactFixture["strength"];
    const prev = rows.get(k);
    if (!prev || prev.strength < s) rows.set(k, { user_key, contact_id, strength: s });
  };

  // 1. Pick the ~15% nobody knows. Never founders; mostly operators, corporates, candidates.
  const unknownWeight: Record<string, number> = { operator: 4, corporate: 3, candidate: 2.5, other: 2, expert: 1, investor: 0.6, portfolio_exec: 0.4 };
  const pool = contacts.filter((c) => meta[c.id].portfolioRole !== "founder" && !meta[c.id].golden);
  const target = Math.round(contacts.length * 0.15);
  const unknown = new Set<string>();
  // Duplicates are mostly unknown (nobody linked the second record).
  for (const c of contacts) if (meta[c.id].duplicateOf && rng.chance(0.6)) unknown.add(c.id);
  while (unknown.size < target) {
    const c = rng.weighted(pool.filter((p) => !unknown.has(p.id)).map((p) => [p, (unknownWeight[p.contact_type] ?? 1) * (meta[p.id].clusterId ? 2 : 1)] as const));
    unknown.add(c.id);
  }

  // 2. Deal teams know their companies' execs.
  const dealByCompany = new Map<string, DealTeamFixture[]>();
  for (const d of dealTeam) dealByCompany.set(d.company_id, [...(dealByCompany.get(d.company_id) ?? []), d]);

  for (const c of contacts) {
    const m = meta[c.id];
    if (unknown.has(c.id) || m.golden) continue;

    if (c.contact_type === "portfolio_exec" && c.current_company_id && !m.duplicateOf) {
      for (const d of dealByCompany.get(c.current_company_id) ?? []) {
        const founder = m.portfolioRole === "founder";
        if (d.role === "lead") add(d.user_key, c.id, founder ? rng.weighted([[4, 5], [5, 4], [3, 1]] as const) : rng.weighted([[2, 3], [3, 4], [4, 2]] as const));
        else if (d.role === "board" && (founder || rng.chance(0.4))) add(d.user_key, c.id, rng.weighted([[2, 2], [3, 4], [4, 2]] as const));
        else if (d.role === "support" && rng.chance(founder ? 0.8 : 0.5)) add(d.user_key, c.id, rng.weighted([[2, 3], [3, 4], [4, 1]] as const));
      }
    }

    // 3. Everyone else: 1–4 knowers chosen by role affinity.
    const already = [...rows.values()].filter((r) => r.contact_id === c.id).length;
    const knowers = Math.max(0, rng.weighted([[1, 60], [2, 29], [3, 8], [4, 3]] as const) - (already ? 1 : 0));
    const candidates = team.filter((t) => ![...rows.keys()].includes(`${t.key}|${c.id}`));
    for (let k = 0; k < knowers; k++) {
      const pick = rng.weighted(candidates.map((t) => [t, AFFINITY[t.role][c.contact_type] ?? 0.5] as const));
      candidates.splice(candidates.indexOf(pick), 1);
      let s: number = rng.weighted(BASE_STRENGTH);
      if (m.duplicateOf) s = rng.pick([1, 2]);
      add(pick.key, c.id, s);
    }
  }
  return [...rows.values()];
}
