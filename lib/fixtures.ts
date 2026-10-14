/**
 * Shape of the committed fixtures in seed/data/*.json.
 *
 * Rules:
 * - Every id is a stable UUID, so re-seeding keeps URLs working.
 * - Team members are referenced ONLY by key ("p01"…"p17" participants,
 *   "i01"…"i05" fictional investment team). Never by name or email.
 * - Inside meeting-note bodies, a team member's name is written as the
 *   token {{user:p04}}. `npm run seed` swaps in the real name at load time,
 *   so names never land in git.
 */

export type UserRole =
  | "investment" | "platform" | "talent" | "community"
  | "partnerships" | "operations" | "admin";

export type CompanyKind = "portfolio" | "corporate" | "investor" | "startup" | "other";
export type CompanyStage = "pre-seed" | "seed" | "series-a" | "series-b" | "series-c+";
export type ContactType =
  | "portfolio_exec" | "investor" | "candidate" | "expert"
  | "corporate" | "operator" | "other";
export type MeetingType =
  | "portfolio_checkin" | "founder_catchup" | "candidate_chat" | "investor_meeting"
  | "expert_call" | "corporate_meeting" | "event_conversation";

/** seed/data/team.json — the fictional investment team (i01–i05). */
export interface TeamFixture {
  key: string;            // "i01"
  full_name: string;
  title: string;          // "General Partner", "Principal", "Associate"
  role: "investment";
  avatar_initials: string;
}

/** seed/data/companies.json */
export interface CompanyFixture {
  id: string;
  name: string;
  kind: CompanyKind;
  industry: string;
  hq_location: string;
  website: string;               // https://name.example
  description: string;
  employee_count_range: string;  // "11-50", "51-200", …
  linkedin_url: string | null;
  stage: CompanyStage | null;    // portfolio only
  invested_on: string | null;    // ISO date, portfolio only
}

/** seed/data/company_deal_team.json */
export interface DealTeamFixture {
  company_id: string;
  user_key: string;              // "i01" or "p05"
  role: "lead" | "board" | "support";
}

/** seed/data/jobs.json */
export interface JobFixture {
  id: string;
  company_id: string;
  title: string;
  department: "engineering" | "sales" | "marketing" | "product" | "ops" | "finance" | "people" | "exec";
  seniority: "junior" | "mid" | "senior" | "lead" | "director" | "vp" | "c-level";
  location: string;
  remote_policy: "onsite" | "hybrid" | "remote";
  employment_type: "full-time" | "part-time" | "contract" | "fractional";
  description: string;
  status: "open" | "paused" | "filled";
  posted_on: string;
}

/** seed/data/contacts.json */
export interface ContactFixture {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;          // always @*.example when present
  linkedin_url: string | null;   // https://www.linkedin.com/in/fictional-slug-xxxx
  headline: string | null;
  summary: string | null;
  location: string | null;
  current_company_id: string | null;
  current_company_name: string | null;
  current_title: string | null;
  contact_type: ContactType;
  expertise_tags: string[];
  source: "seed";
}

/** seed/data/contact_employment.json */
export interface EmploymentFixture {
  id: string;
  contact_id: string;
  company_id: string | null;
  company_name: string;
  title: string;
  description: string | null;
  location: string | null;
  started_on: string | null;
  finished_on: string | null;    // null = current
}

/** seed/data/user_contacts.json */
export interface UserContactFixture {
  user_key: string;
  contact_id: string;
  strength: 1 | 2 | 3 | 4 | 5;
}

/** seed/data/meeting_notes.json */
export interface MeetingNoteFixture {
  id: string;
  met_on: string;
  title: string;
  meeting_type: MeetingType;
  company_id: string | null;
  summary: string;
  body: string;                  // markdown; team names as {{user:pXX}}
  created_by_key: string;
  attendee_user_keys: string[];
  attendee_contact_ids: string[];
}
