/**
 * The world builder: runs every stage in order and returns the full,
 * deterministic world. Nothing here touches the network or the disk.
 *
 *   companies → investment team → contacts & clusters → employment →
 *   relationships → jobs → golden scenarios → meeting notes
 *
 * Optional prose enrichment with Claude lives in enrich.ts and only
 * rewrites text fields; ids, links and counts always come from here.
 */
import { buildCompanies } from "./companies";
import { buildContacts } from "./contacts";
import { plantDuplicates } from "./duplicates";
import { buildEmployment, unlinkSomeEmployment } from "./employment";
import { buildGolden, GOLDEN_NAMES } from "./golden";
import { buildJobs } from "./jobs";
import { NameFactory } from "./names";
import { buildNotes } from "./notes";
import { buildRelationships } from "./relationships";
import { Rng } from "./rng";
import { buildDealTeam, INVESTMENT_TEAM, teamMembers } from "./team";
import type { World } from "./types";

/** Change this and every fixture changes. Keep it fixed so URLs stay stable. */
export const SEED = 20261014;

export const STAGES = ["companies", "team", "contacts", "employment", "relationships", "jobs", "golden", "notes"] as const;
export type Stage = (typeof STAGES)[number];

export function buildWorld(seed = SEED, log: (msg: string) => void = () => {}): World {
  const root = new Rng(seed);
  const names = new NameFactory(root.fork("names"));
  for (const [first, last] of GOLDEN_NAMES) names.reserve(first, last);
  for (const t of INVESTMENT_TEAM) names.reserve(t.full_name.split(" ")[0], t.full_name.split(" ").slice(1).join(" "));

  // 1. Companies
  const { companies, meta: companyMeta } = buildCompanies(root.fork("companies"));
  log(`companies: ${companies.length}`);

  // 2. Investment team + deal teams
  const portfolio = companies.filter((c) => c.kind === "portfolio");
  const dealTeam = buildDealTeam(portfolio, root.fork("team"));
  log(`team: ${INVESTMENT_TEAM.length} investment-team members, ${dealTeam.length} deal-team rows`);

  // 3. Contacts and clusters
  const { contacts, contactMeta, clusters } = buildContacts(companies, companyMeta, root.fork("contacts"), names);
  log(`contacts: ${contacts.length} in ${clusters.length} clusters`);

  // 4. Employment (+ light mess: duplicates, unlinked rows)
  const employment = buildEmployment(companies, companyMeta, contacts, contactMeta, clusters, root.fork("employment"));
  plantDuplicates(contacts, contactMeta, employment, root.fork("duplicates"));
  unlinkSomeEmployment(employment, contactMeta, root.fork("unlink"));
  log(`employment: ${employment.length} positions`);

  // 5. Relationships
  const team = teamMembers();
  const userContacts = buildRelationships(contacts, contactMeta, team, dealTeam, root.fork("relationships"));
  log(`user_contacts: ${userContacts.length}`);

  // 6. Jobs
  const jobs = buildJobs(portfolio, companyMeta, contacts, root.fork("jobs"));
  log(`jobs: ${jobs.length}`);

  // 7. Golden scenarios: planted contacts, histories, warm paths and jobs
  const golden = buildGolden(companies, companyMeta, root.fork("golden"));
  contacts.push(...golden.contacts);
  Object.assign(contactMeta, golden.meta);
  employment.push(...golden.employment);
  userContacts.push(...golden.userContacts);
  jobs.push(...golden.jobs);
  log(`golden scenarios: ${golden.scenarios.length}`);

  const world: World = {
    companies, companyMeta, team: INVESTMENT_TEAM, teamMembers: team, dealTeam,
    contacts, contactMeta, clusters, employment, userContacts, jobs, golden: golden.scenarios, notes: [],
  };

  // 8. Meeting notes
  world.notes = buildNotes(world, root, seed);
  log(`meeting notes: ${world.notes.length}`);
  return world;
}
