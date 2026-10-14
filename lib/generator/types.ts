/**
 * Internal types for the generator's "world": the fixture rows plus extra
 * metadata the later stages need (which industry vocabulary a company uses,
 * which cluster a contact belongs to, ...). Only the fixture rows are
 * written to seed/data; the metadata stays in memory.
 */
import type {
  CompanyFixture, ContactFixture, DealTeamFixture, EmploymentFixture, JobFixture,
  MeetingNoteFixture, TeamFixture, UserContactFixture, UserRole,
} from "../fixtures";

export type IndustryKey = "fintech" | "climate" | "saas" | "health" | "devtools" | "marketplace" | "aiinfra";

/** Kinds of large corporates: matched against portfolio needs ("intro to a bank"). */
export type CorpKind =
  | "bank" | "payments" | "support_software" | "telco" | "energy" | "retail"
  | "consultancy" | "insurance" | "logistics" | "hospital" | "cloud";

/** Job functions drive titles, career ladders and expertise tags. */
export type Fn =
  | "engineering" | "product" | "design" | "data" | "sales" | "marketing" | "customer_success"
  | "finance" | "operations" | "people" | "partnerships" | "procurement" | "strategy"
  | "legal" | "investing" | "general_management" | "clinical" | "energy_systems";

export interface CompanyMeta {
  id: string;
  slug: string;
  domain: string;              // "kademint.example"
  industryKey: IndustryKey | null;
  corpKind: CorpKind | null;
  product: string;             // "cash management for SMEs"
  customer: string;            // "finance teams at 20-200 person companies"
  foundedMonth: number;        // month number (see dates.ts)
  focus: string[];             // investors: sectors they back
}

export interface ContactMeta {
  id: string;
  fn: Fn;
  level: number;               // 0 junior … 6 c-level, used for title ladders
  homeCity: string;
  region: string;
  clusterId: string | null;
  betweenRoles: boolean;
  duplicateOf: string | null;  // planted near-duplicate
  golden: string | null;       // golden scenario key, if planted
  portfolioRole: "founder" | "exec" | null;
  // Career plan, decided in the contacts stage and expanded in the employment stage.
  bgFn: Fn;                    // function of earlier roles (a CEO may come from sales)
  currentCompanyId: string | null;
  currentCompanyName: string | null;
  currentTitle: string | null;
  currentStart: number;        // month number
  currentEnd: number | null;   // set only for candidates between roles
  positions: number;           // 2–5 total positions
}

export interface Cluster {
  id: string;
  companyId: string;
  coreMonth: number;           // every member's stint at the company contains this month
  memberIds: string[];
}

export interface TeamMember {
  key: string;
  role: UserRole;
  title: string;               // used in note attendee lines
}

export interface GoldenScenario {
  key: string;                 // "G1"
  title: string;
  needKind: "note" | "job";
  needSummary: string;
  companyId: string;           // the company with the need
  jobId: string | null;
  noteId: string | null;       // filled in by the notes stage
  noteNeedText: string[];      // bullets planted into the note
  bestContactId: string;
  bestWhy: string;
  warmPath: { userKey: string; strength: number };
  decoyContactId: string;
  decoyWhy: string;
  decoyPath: { userKey: string; strength: number } | { overlapVia: string; company: string };
  queryHint: string;
}

export interface World {
  companies: CompanyFixture[];
  companyMeta: Record<string, CompanyMeta>;
  team: TeamFixture[];
  teamMembers: TeamMember[];   // investment team + participants, by key only
  dealTeam: DealTeamFixture[];
  contacts: ContactFixture[];
  contactMeta: Record<string, ContactMeta>;
  clusters: Cluster[];
  employment: EmploymentFixture[];
  userContacts: UserContactFixture[];
  jobs: JobFixture[];
  golden: GoldenScenario[];
  notes: MeetingNoteFixture[];
}
