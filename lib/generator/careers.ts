/**
 * Career vocabulary: title ladders, expertise tags and position blurbs per
 * job function. Level 0 = junior … 6 = C-level.
 */
import type { Fn } from "./types";

export const LADDERS: Record<Fn, string[]> = {
  engineering: ["Junior Software Engineer", "Software Engineer", "Senior Software Engineer", "Engineering Manager", "Director of Engineering", "VP Engineering", "CTO"],
  product: ["Associate Product Manager", "Product Manager", "Senior Product Manager", "Group Product Manager", "Head of Product", "VP Product", "Chief Product Officer"],
  design: ["Junior Product Designer", "Product Designer", "Senior Product Designer", "Lead Product Designer", "Head of Design", "VP Design", "Chief Design Officer"],
  data: ["Data Analyst", "Data Scientist", "Senior Data Scientist", "Lead Data Scientist", "Head of Data", "VP Data", "Chief Data Officer"],
  sales: ["Sales Development Representative", "Account Executive", "Senior Account Executive", "Sales Manager", "Head of Sales", "VP Sales", "Chief Revenue Officer"],
  marketing: ["Marketing Associate", "Marketing Manager", "Senior Marketing Manager", "Growth Lead", "Head of Marketing", "VP Marketing", "Chief Marketing Officer"],
  customer_success: ["Customer Support Specialist", "Customer Success Manager", "Senior Customer Success Manager", "Customer Success Lead", "Head of Customer Success", "VP Customer Success", "Chief Customer Officer"],
  finance: ["Financial Analyst", "Senior Financial Analyst", "Finance Manager", "Financial Controller", "Head of Finance", "VP Finance", "CFO"],
  operations: ["Operations Associate", "Operations Manager", "Senior Operations Manager", "Operations Lead", "Head of Operations", "VP Operations", "COO"],
  people: ["People Coordinator", "Talent Acquisition Partner", "Senior Recruiter", "People Partner Lead", "Head of People", "VP People", "Chief People Officer"],
  partnerships: ["Partnerships Associate", "Partner Manager", "Senior Partner Manager", "Partnerships Lead", "Head of Partnerships", "VP Partnerships", "Chief Business Officer"],
  procurement: ["Procurement Analyst", "Buyer", "Senior Buyer", "Category Manager", "Head of Procurement", "Procurement Director", "Chief Procurement Officer"],
  strategy: ["Strategy Analyst", "Strategy Manager", "Senior Strategy Manager", "Innovation Lead", "Head of Strategy", "Director of Strategy", "Chief Strategy Officer"],
  legal: ["Compliance Analyst", "Legal Counsel", "Senior Legal Counsel", "Compliance Lead", "Head of Legal & Compliance", "General Counsel", "Chief Legal Officer"],
  investing: ["Analyst", "Associate", "Senior Associate", "Principal", "Partner", "General Partner", "Managing Partner"],
  general_management: ["Business Analyst", "Chief of Staff", "Senior Manager", "General Manager", "Managing Director", "Vice President", "CEO"],
  clinical: ["Clinical Specialist", "Clinical Lead", "Senior Clinical Lead", "Medical Manager", "Head of Clinical Operations", "Medical Director", "Chief Medical Officer"],
  energy_systems: ["Energy Analyst", "Energy Trader", "Senior Energy Analyst", "Energy Markets Lead", "Head of Energy Markets", "Director of Energy Trading", "Chief Energy Officer"],
};

/** Consultancies use their own ladder regardless of function. */
export const CONSULTING_LADDER = ["Business Analyst", "Consultant", "Senior Consultant", "Engagement Manager", "Principal", "Partner", "Managing Partner"];

export function titleFor(fn: Fn, level: number, atConsultancy = false): string {
  const ladder = atConsultancy ? CONSULTING_LADDER : LADDERS[fn];
  return ladder[Math.max(0, Math.min(6, level))];
}

export const FN_TAGS: Record<Fn, string[]> = {
  engineering: ["platform engineering", "distributed systems", "engineering leadership", "cloud infrastructure", "TypeScript", "Go", "hiring engineers", "DevOps"],
  product: ["product management", "product discovery", "B2B product", "roadmapping", "pricing", "user research", "product-led growth"],
  design: ["product design", "design systems", "UX research", "brand", "prototyping"],
  data: ["data science", "analytics", "machine learning", "data engineering", "experimentation", "forecasting"],
  sales: ["enterprise sales", "B2B sales", "sales leadership", "SaaS sales", "pipeline building", "mid-market sales", "outbound"],
  marketing: ["growth marketing", "B2B marketing", "brand", "demand generation", "content marketing", "performance marketing"],
  customer_success: ["customer success", "account management", "onboarding", "retention", "support operations"],
  finance: ["FP&A", "fundraising", "financial reporting", "unit economics", "audit", "treasury", "board reporting"],
  operations: ["operations", "scaling teams", "process design", "supply chain", "business operations"],
  people: ["talent acquisition", "people operations", "employer branding", "compensation", "org design"],
  partnerships: ["partnerships", "business development", "channel sales", "ecosystem", "alliances"],
  procurement: ["procurement", "vendor management", "category management", "supplier onboarding", "sourcing"],
  strategy: ["corporate strategy", "innovation", "M&A", "venture clienting", "transformation"],
  legal: ["regulatory compliance", "contract negotiation", "GDPR", "licensing", "corporate law"],
  investing: ["venture capital", "seed investing", "Series A", "due diligence", "portfolio support", "board work"],
  general_management: ["general management", "fundraising", "go-to-market", "company building", "P&L ownership"],
  clinical: ["clinical operations", "medical affairs", "reimbursement", "clinical validation", "MDR"],
  energy_systems: ["energy markets", "grid operations", "energy trading", "renewables"],
};

export const FN_BLURBS: Record<Fn, string[]> = {
  engineering: [
    "Led the platform team through a migration from a monolith to services.",
    "Built the core API and grew the team from 4 to 18 engineers.",
    "Owned reliability and on-call; cut incident volume by half.",
    "Shipped the mobile app rebuild and introduced trunk-based development.",
  ],
  product: [
    "Owned the onboarding and activation funnel.",
    "Launched the self-serve tier and the first usage-based pricing plan.",
    "Ran discovery with enterprise customers and owned the integrations roadmap.",
    "Product lead for the payments and billing area.",
  ],
  design: ["Built the first design system.", "Led research and design for the core workflow product.", "Redesigned the checkout and onboarding flows."],
  data: ["Built the experimentation platform.", "Owned demand forecasting models.", "Set up the analytics stack and self-serve dashboards."],
  sales: [
    "Closed the company's first seven-figure enterprise contract.",
    "Built the outbound motion and the SDR team.",
    "Ran mid-market sales for the Benelux and DACH.",
    "Carried a quota for strategic accounts; consistently above 110% of target.",
  ],
  marketing: ["Built demand generation from scratch.", "Owned brand and the website relaunch.", "Ran paid acquisition across six markets."],
  customer_success: ["Set up onboarding and QBR playbooks.", "Owned net revenue retention for the enterprise segment.", "Built the support team across two time zones."],
  finance: [
    "Ran FP&A and the monthly board pack.",
    "Led the Series B data room and audit preparation.",
    "Built the finance function: close, payroll, treasury.",
    "Owned pricing and unit-economics analysis.",
  ],
  operations: ["Scaled operations into three new markets.", "Owned the fulfilment network and carrier contracts.", "Ran business operations and planning."],
  people: ["Hired 120 people in 18 months.", "Built the people team, levelling framework and compensation bands.", "Owned employer branding and recruiting operations."],
  partnerships: ["Built the partner ecosystem and integration marketplace.", "Ran strategic alliances with banks and payment providers.", "Owned channel partnerships across the Benelux."],
  procurement: ["Managed a €40m non-food category.", "Ran supplier onboarding and vendor risk.", "Led the indirect procurement transformation."],
  strategy: ["Ran the corporate venturing and startup partnerships programme.", "Led strategy projects for the executive board.", "Owned the innovation portfolio and pilots."],
  legal: ["Owned licensing and regulatory relationships.", "Led commercial contracting and privacy.", "Built the compliance function."],
  investing: ["Sourced and led seed investments in software.", "Sat on four portfolio boards.", "Covered fintech and B2B software deals."],
  general_management: ["Ran the business unit P&L.", "Chief of staff to the CEO through a period of rapid growth.", "Launched the company in two new countries."],
  clinical: ["Led clinical validation studies.", "Ran medical affairs and reimbursement dossiers.", "Built clinical operations for remote care."],
  energy_systems: ["Traded day-ahead and intraday power.", "Built the flexibility trading desk.", "Ran grid-balancing analytics."],
};

/** Departments on job posts map onto contact functions (for candidate fit). */
export const DEPT_TO_FN: Record<string, Fn[]> = {
  engineering: ["engineering", "data"],
  sales: ["sales", "partnerships"],
  marketing: ["marketing"],
  product: ["product", "design"],
  ops: ["operations", "customer_success"],
  finance: ["finance"],
  people: ["people"],
  exec: ["general_management", "operations", "finance"],
};
