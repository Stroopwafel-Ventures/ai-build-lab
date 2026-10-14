/** Row types for the main tables. Hand-written to keep things readable. */
import type {
  CompanyKind, CompanyStage, ContactType, MeetingType, UserRole,
} from "@/lib/fixtures";

export type { CompanyKind, CompanyStage, ContactType, MeetingType, UserRole };

export interface User {
  id: string;
  key: string;
  full_name: string;
  title: string | null;
  role: UserRole;
  is_participant: boolean;
  avatar_initials: string | null;
  source: "seed" | "admin";
}

export interface Company {
  id: string;
  name: string;
  kind: CompanyKind;
  industry: string | null;
  hq_location: string | null;
  website: string | null;
  description: string | null;
  employee_count_range: string | null;
  linkedin_url: string | null;
  stage: CompanyStage | null;
  invested_on: string | null;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  department: string | null;
  seniority: string | null;
  location: string | null;
  remote_policy: string | null;
  employment_type: string | null;
  description: string | null;
  status: "open" | "paused" | "filled";
  posted_on: string | null;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  linkedin_url: string | null;
  headline: string | null;
  summary: string | null;
  location: string | null;
  current_company_id: string | null;
  current_company_name: string | null;
  current_title: string | null;
  contact_type: ContactType;
  expertise_tags: string[];
  source: string;
}

export interface Employment {
  id: string;
  contact_id: string;
  company_id: string | null;
  company_name: string;
  title: string | null;
  description: string | null;
  location: string | null;
  started_on: string | null;
  finished_on: string | null;
}

export interface MeetingNote {
  id: string;
  met_on: string;
  title: string;
  meeting_type: MeetingType;
  company_id: string | null;
  summary: string | null;
  body: string | null;
  created_by: string | null;
}

export const STRENGTH_LABELS: Record<number, string> = {
  1: "Barely know",
  2: "Acquainted",
  3: "Know well",
  4: "Close",
  5: "Gezellig",
};
