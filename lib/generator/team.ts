/**
 * Stage 2: the investment team and deal teams.
 *
 * i01–i05 are fictional and written to team.json. The participants
 * (p01–p17) are real people, so the generator only ever knows their KEY
 * and ROLE. Their names live in seed/participants.local.json, which the
 * generator never reads.
 */
import type { CompanyFixture, DealTeamFixture, TeamFixture, UserRole } from "../fixtures";
import type { Rng } from "./rng";
import type { TeamMember } from "./types";

export const INVESTMENT_TEAM: TeamFixture[] = [
  { key: "i01", full_name: "Maartje Oosterveld", title: "General Partner", role: "investment", avatar_initials: "MO" },
  { key: "i02", full_name: "Henrik Solvang", title: "General Partner", role: "investment", avatar_initials: "HS" },
  { key: "i03", full_name: "Tomasz Wierzbowski", title: "Principal", role: "investment", avatar_initials: "TW" },
  { key: "i04", full_name: "Adaeze Lindqvist-Okoro", title: "Principal", role: "investment", avatar_initials: "AL" },
  { key: "i05", full_name: "Lucía Ferrándiz", title: "Associate", role: "investment", avatar_initials: "LF" },
];

/** Participant keys and roles. Names are deliberately absent. */
export const PARTICIPANTS: { key: string; role: UserRole }[] = [
  { key: "p01", role: "admin" },
  { key: "p02", role: "community" },
  { key: "p03", role: "community" },
  { key: "p04", role: "talent" },
  { key: "p05", role: "platform" },
  { key: "p06", role: "platform" },
  { key: "p07", role: "talent" },
  { key: "p08", role: "partnerships" },
  { key: "p09", role: "platform" },
  { key: "p10", role: "platform" },
  { key: "p11", role: "talent" },
  { key: "p12", role: "platform" },
  { key: "p13", role: "platform" },
  { key: "p14", role: "partnerships" },
  { key: "p15", role: "operations" },
  { key: "p16", role: "partnerships" },
  { key: "p17", role: "operations" },
];

export function teamMembers(): TeamMember[] {
  return [
    ...INVESTMENT_TEAM.map((t) => ({ key: t.key, role: t.role as UserRole, title: t.title })),
    // Participants' real titles are unknown to the generator; notes show "(Stroopwafel Ventures)".
    ...PARTICIPANTS.map((p) => ({ key: p.key, role: p.role, title: "" })),
  ];
}

export const keysByRole = (role: UserRole) => PARTICIPANTS.filter((p) => p.role === role).map((p) => p.key);

/**
 * Each portfolio company gets exactly one `lead` from the investment team.
 * Later-stage deals are led by GPs, earlier ones more often by the
 * principals or the associate. Many companies also have a different
 * investment-team member in a `board` seat, and some have 1–2 participant
 * `support` members (platform, talent, partnerships, community).
 */
export function buildDealTeam(portfolio: CompanyFixture[], rng: Rng): DealTeamFixture[] {
  const rows: DealTeamFixture[] = [];
  const supportPool = [...keysByRole("platform"), ...keysByRole("platform"), ...keysByRole("talent"), ...keysByRole("partnerships"), ...keysByRole("community")];

  // Planted leads for golden-scenario companies keep the stories coherent.
  const fixedLead: Record<string, string> = {
    Kademint: "i03", Reclaimr: "i04", Stackharbor: "i02", "Corvia Health": "i01",
    Signalbay: "i03", "Sanavo Care": "i01", "Windvane Grid": "i02", Grachtpay: "i01",
  };

  for (const c of portfolio) {
    const late = c.stage === "series-b" || c.stage === "series-c+";
    const lead = fixedLead[c.name] ?? (late
      ? rng.weighted([["i01", 4], ["i02", 4], ["i03", 1], ["i04", 1]] as const)
      : rng.weighted([["i01", 1], ["i02", 1], ["i03", 3], ["i04", 3], ["i05", c.stage === "series-a" ? 0.5 : 2]] as const));
    rows.push({ company_id: c.id, user_key: lead, role: "lead" });

    // Board seat: common from seed onwards, held by someone other than the lead.
    if (c.stage !== "pre-seed" && rng.chance(late ? 0.85 : 0.55)) {
      const options = lead === "i01" || lead === "i02" ? ["i03", "i04"] : ["i01", "i02"];
      rows.push({ company_id: c.id, user_key: rng.pick(options), role: "board" });
    }

    // Platform support: 0–2 participants.
    const nSupport = rng.weighted([[0, 4], [1, 4], [2, 2]] as const);
    for (const key of new Set(rng.sample(supportPool, nSupport))) {
      rows.push({ company_id: c.id, user_key: key, role: "support" });
    }
  }
  return rows;
}
