export const PAGE_SIZE = 50;

export const CONTACT_TYPES = ["portfolio_exec", "investor", "candidate", "expert", "corporate", "operator", "other"] as const;
export const COMPANY_KINDS = ["portfolio", "corporate", "investor", "startup", "other"] as const;
export const STAGES = ["pre-seed", "seed", "series-a", "series-b", "series-c+"] as const;
export const MEETING_TYPES = ["portfolio_checkin", "founder_catchup", "candidate_chat", "investor_meeting", "expert_call", "corporate_meeting", "event_conversation"] as const;
export const DEPARTMENTS = ["engineering", "sales", "marketing", "product", "ops", "finance", "people", "exec"] as const;
export const SENIORITIES = ["junior", "mid", "senior", "lead", "director", "vp", "c-level"] as const;
export const REMOTE = ["onsite", "hybrid", "remote"] as const;
export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "fractional"] as const;
