/**
 * Industry vocabulary for meeting notes: what each kind of company ships,
 * who buys it, what goes wrong, which corporates it partners with.
 * Every competitor is described generically; no real brands appear.
 */
import type { CorpKind, IndustryKey } from "../types";

export interface IndustryProfile {
  buyers: string[];              // who signs the contract
  shipped: string[];             // things shipped recently
  roadmap: string[];             // next priorities
  risks: string[];               // what keeps the founder up at night
  competitors: string[];         // generic competitor archetypes
  regulation: string[];          // regulatory topics (may be empty)
  corpKinds: CorpKind[];         // corporates that matter as partners/customers
  markets: string[];             // expansion markets
  pricing: string[];             // pricing model notes
  churnReasons: string[];
  expansionDrivers: string[];
  opsTopics: string[];
  volume: { label: string; kind: "money" | "count" | "rate" };
}

export const INDUSTRY: Record<IndustryKey, IndustryProfile> = {
  fintech: {
    buyers: ["CFOs at 50–500 person companies", "heads of finance", "platform product leads", "treasury managers"],
    shipped: ["multi-entity support", "the accounting-software sync rewrite", "instant SEPA payouts", "a cash-forecasting module", "approval workflows for larger finance teams", "the new onboarding flow that cut KYB time to under a day"],
    roadmap: ["card issuing in-house instead of via a programme manager", "open-banking data in forecasts", "a partner API for platforms", "multi-currency accounts", "self-serve onboarding for the smallest customers"],
    risks: ["dependency on a single sponsor bank", "fraud losses creeping up with volume", "the timeline for their own licence", "interest income falling as rates drop"],
    competitors: ["a well-funded US player entering Europe", "the banks' own bundled tools", "spreadsheets plus an outsourced bookkeeper", "two local incumbents with older products"],
    regulation: ["the e-money licence application", "safeguarding audits", "PSD3 changes to strong customer authentication", "DORA operational-resilience requirements", "transaction-monitoring thresholds the regulator flagged"],
    corpKinds: ["bank", "payments", "consultancy", "insurance"],
    markets: ["Germany", "Belgium", "France", "the Nordics", "Spain"],
    pricing: ["a subscription plus interchange", "basis points on volume", "per-seat pricing with a platform fee"],
    churnReasons: ["customers acquired by larger groups that use the group bank", "very small accounts that never activated", "one customer moving to an ERP bundle"],
    expansionDrivers: ["more entities per customer", "payment volume growing with customers", "upsell to the forecasting module"],
    opsTopics: ["KYB backlog", "chargeback handling", "the support queue during month-end close"],
    volume: { label: "payment volume", kind: "money" },
  },
  climate: {
    buyers: ["energy suppliers", "housing associations", "fleet managers", "plant managers", "sustainability leads"],
    shipped: ["the installer app", "remote diagnostics for installed units", "a quoting tool that cut survey-to-offer time in half", "a first version of the trading optimiser", "automated subsidy paperwork"],
    roadmap: ["balancing-market participation", "a financing product for customers", "a second hardware supplier", "expanding the installer network outside the big western cities", "a utility white-label offering"],
    risks: ["grid-connection delays", "hardware supply and pricing", "subsidy changes in the next budget", "installer capacity", "working capital tied up in inventory"],
    competitors: ["vertically integrated utilities", "a large German installer roll-up", "local installers competing on price", "a hardware maker going direct"],
    regulation: ["the new grid-tariff structure", "changes to the net-metering scheme", "balancing-market prequalification", "CSRD reporting requirements for customers"],
    corpKinds: ["energy", "logistics", "retail", "insurance", "bank"],
    markets: ["Belgium", "Germany", "the UK", "Denmark"],
    pricing: ["hardware margin plus a monthly service fee", "a lease model", "revenue share on flexibility income"],
    churnReasons: ["customers moving house", "a housing association pausing its programme", "a pilot customer that never scaled"],
    expansionDrivers: ["more sites per customer", "adding service contracts to hardware", "flexibility revenue share"],
    opsTopics: ["installer scheduling", "inventory and lead times", "first-time-fix rate"],
    volume: { label: "installed systems", kind: "count" },
  },
  saas: {
    buyers: ["operations directors", "heads of legal", "procurement leads", "COOs at mid-sized companies", "IT managers"],
    shipped: ["SSO and audit logs for enterprise", "a reporting module customers had asked for", "the integrations marketplace", "AI-assisted drafting", "a mobile app for frontline users", "role-based permissions"],
    roadmap: ["an enterprise tier", "usage-based pricing", "a partner programme", "AI features on top of the data they already hold", "German and French localisation"],
    risks: ["longer enterprise sales cycles", "security reviews slowing deals", "dependence on a few large logos", "a horizontal platform adding the same feature"],
    competitors: ["a US category leader", "legacy on-premise vendors", "in-house tools built on spreadsheets", "two seed-stage copycats"],
    regulation: ["GDPR data-processing agreements", "the EU AI Act for AI features", "ISO 27001 certification"],
    corpKinds: ["support_software", "consultancy", "cloud", "retail", "logistics", "telco"],
    markets: ["Germany", "the UK", "France", "the Nordics", "the US"],
    pricing: ["per-seat pricing", "a platform fee plus usage", "three tiers with an enterprise add-on"],
    churnReasons: ["a customer consolidating vendors after an acquisition", "SMB customers that never onboarded fully", "a champion leaving"],
    expansionDrivers: ["seat expansion", "the enterprise tier", "new departments adopting the product"],
    opsTopics: ["onboarding time", "support ticket volume", "implementation backlog"],
    volume: { label: "active users", kind: "count" },
  },
  health: {
    buyers: ["hospital boards", "health insurers", "HR directors at large employers", "care-provider COOs", "clinical leads"],
    shipped: ["the clinician dashboard", "integration with two hospital EHR systems", "a patient app redesign", "remote onboarding for patients", "automated reporting for insurers"],
    roadmap: ["CE marking for the next device class", "reimbursement in Germany", "a second clinical study", "an employer offering", "integration with GP systems"],
    risks: ["reimbursement decisions slipping", "long hospital procurement cycles", "clinical evidence requirements", "data-protection reviews at each hospital"],
    competitors: ["hospital in-house solutions", "a large medtech incumbent", "a UK startup with more funding", "insurers building their own apps"],
    regulation: ["MDR class IIa certification", "the notified-body audit", "NEN 7510 for data security", "the German fast-track reimbursement route for digital apps"],
    corpKinds: ["hospital", "insurance", "consultancy", "telco"],
    markets: ["Germany", "Belgium", "the UK", "France"],
    pricing: ["per-patient-per-month fees", "a licence per hospital department", "per-employee pricing for employers"],
    churnReasons: ["a hospital pilot that ended without budget", "an employer changing benefits provider"],
    expansionDrivers: ["more departments per hospital", "insurer contracts adding members", "new care pathways"],
    opsTopics: ["clinical staffing", "patient onboarding", "care-team utilisation"],
    volume: { label: "active patients", kind: "count" },
  },
  devtools: {
    buyers: ["VPs of engineering", "platform team leads", "CTOs", "security leads", "staff engineers who champion tools bottom-up"],
    shipped: ["the self-hosted option", "a CLI rewrite", "an integration with the main code hosts", "SOC 2 Type I", "usage analytics for admins", "a free tier with a generous limit"],
    roadmap: ["an enterprise tier with SSO and audit logs", "a hosted runner fleet", "an open-source core", "AI-assisted features", "support for more languages and frameworks"],
    risks: ["converting free users to paid", "cloud costs growing faster than revenue", "a big platform bundling the feature", "developer attention shifting to AI tooling"],
    competitors: ["the major code-hosting platforms' built-in tools", "an open-source project with a hosted offering", "a well-funded US startup", "internal tooling at larger companies"],
    regulation: ["SOC 2 Type II", "the Cyber Resilience Act", "data-residency questions from European customers"],
    corpKinds: ["cloud", "telco", "bank", "consultancy"],
    markets: ["the US", "the UK", "Germany", "the Nordics"],
    pricing: ["per-seat pricing", "usage-based pricing on build minutes", "a free tier plus team and enterprise plans"],
    churnReasons: ["teams consolidating on their code host's built-in tools", "a startup customer that shut down", "a customer bringing it in-house"],
    expansionDrivers: ["more teams per company", "usage growth", "enterprise upgrades"],
    opsTopics: ["infrastructure cost per customer", "support load from free users", "documentation gaps"],
    volume: { label: "weekly active developers", kind: "count" },
  },
  marketplace: {
    buyers: ["homeowners", "shippers", "procurement at hospitals", "small business owners", "production companies"],
    shipped: ["instant booking", "a supply-side app for professionals", "dynamic pricing", "reviews and verification", "invoicing and payouts inside the platform"],
    roadmap: ["a subscription for repeat buyers", "managed service for larger customers", "expansion to two new cities", "embedded insurance at checkout", "a B2B offering"],
    risks: ["disintermediation after the first job", "supply quality", "seasonality", "paid-acquisition costs rising"],
    competitors: ["classifieds sites", "two well-funded local marketplaces", "offline agencies", "a horizontal gig platform"],
    regulation: ["platform-worker rules", "the Digital Services Act requirements for marketplaces", "payment-licensing questions for payouts"],
    corpKinds: ["insurance", "retail", "logistics", "bank", "hospital"],
    markets: ["Belgium", "Germany", "France"],
    pricing: ["a take rate on each transaction", "a supply-side subscription", "lead fees"],
    churnReasons: ["buyers going direct after the first job", "seasonal drop-off"],
    expansionDrivers: ["repeat bookings", "larger basket sizes", "B2B accounts"],
    opsTopics: ["supply onboarding", "fill rate", "dispute handling"],
    volume: { label: "GMV", kind: "money" },
  },
  aiinfra: {
    buyers: ["ML platform leads", "heads of AI", "CTOs at AI-native startups", "data science managers"],
    shipped: ["a self-serve SDK", "support for open-weight models", "a cost dashboard", "on-prem deployment for regulated customers", "batch evaluation runs"],
    roadmap: ["an enterprise control plane", "fine-tuning workflows", "a marketplace listing with a cloud provider", "agent-level tracing", "EU-only data residency"],
    risks: ["model providers adding the same capability", "GPU availability and pricing", "customers' AI budgets moving around", "long security reviews"],
    competitors: ["the hyperscalers' native tooling", "an open-source library with a cloud offering", "two US startups that raised large rounds", "in-house tools at larger customers"],
    regulation: ["the EU AI Act's obligations for high-risk use cases", "data-residency requirements", "model-provider terms of service"],
    corpKinds: ["cloud", "telco", "bank", "support_software", "insurance"],
    markets: ["the US", "the UK", "Germany", "France"],
    pricing: ["usage-based pricing on tokens or GPU hours", "a platform fee plus usage", "annual enterprise contracts with committed spend"],
    churnReasons: ["a customer building in-house after hiring an ML team", "a startup customer whose product pivoted"],
    expansionDrivers: ["usage growth as customers move to production", "more teams onboarding", "committed-spend contracts"],
    opsTopics: ["GPU capacity planning", "on-call load", "customer onboarding time"],
    volume: { label: "monthly inference requests", kind: "count" },
  },
};

/** Functional areas worth an intro at each kind of corporate. */
export const CORP_AREAS: Record<CorpKind, string[]> = {
  bank: ["trade finance", "the corporate banking innovation team", "digital onboarding", "the startup and scale-up desk"],
  payments: ["merchant partnerships", "the platform and marketplace team", "risk and underwriting"],
  support_software: ["product for AI agents", "the marketplace team", "enterprise sales"],
  telco: ["the IoT business unit", "business connectivity", "the innovation lab", "procurement for SME products"],
  energy: ["the business-customer team", "network operations", "the startup programme"],
  retail: ["store operations", "e-commerce", "supply chain", "sustainability"],
  consultancy: ["the digital transformation practice", "the financial-services practice", "the energy practice"],
  insurance: ["claims innovation", "the health-insurance purchasing team", "distribution partnerships"],
  logistics: ["warehouse operations", "freight procurement", "the innovation team"],
  hospital: ["the cardiology department", "IT and procurement", "operating-room planning", "the innovation board"],
  cloud: ["the startup programme", "the marketplace and partner team", "enterprise sales for the Benelux"],
};
