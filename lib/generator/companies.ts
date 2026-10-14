/**
 * Stage 1: companies.
 *
 * Every organisation in the world: 50 Stroopwafel portfolio companies,
 * ~11 large corporates, 10 other VC funds and 60 startups / scale-ups that
 * mostly exist as former employers. All names are invented; websites use
 * the reserved `.example` TLD so nothing ever resolves to a real site.
 */
import type { CompanyFixture, CompanyStage } from "../fixtures";
import { monthOf, monthToIso, TODAY_MONTH } from "./dates";
import { slugify, stableId } from "./ids";
import type { Rng } from "./rng";
import type { CompanyMeta, CorpKind, IndustryKey } from "./types";

export const INDUSTRY_LABEL: Record<IndustryKey, string> = {
  fintech: "Fintech",
  climate: "Climate tech",
  saas: "B2B SaaS",
  health: "Health tech",
  devtools: "Developer tools",
  marketplace: "Marketplaces",
  aiinfra: "AI infrastructure",
};

// [name, industry, stage, hq, product, customer]
type PortfolioSeed = [string, IndustryKey, CompanyStage, string, string, string];

export const PORTFOLIO_SEEDS: PortfolioSeed[] = [
  // Fintech
  ["Kademint", "fintech", "series-a", "Amsterdam", "cash management and treasury software", "finance teams at 20–250 person SMEs"],
  ["Grachtpay", "fintech", "series-b", "Amsterdam", "embedded payments infrastructure", "B2B marketplaces and vertical SaaS platforms"],
  ["Ledgerbloom", "fintech", "seed", "Utrecht", "accounts-payable automation", "mid-market finance teams"],
  ["Tallyhaven", "fintech", "series-a", "Berlin", "spend management and corporate cards", "scale-ups with distributed teams"],
  ["Quaycredit", "fintech", "seed", "Rotterdam", "revenue-based financing", "e-commerce brands doing €1–20m in sales"],
  ["Muntwerk", "fintech", "pre-seed", "Amsterdam", "multi-currency accounts", "freelancers and micro-agencies working cross-border"],
  ["Sluisline", "fintech", "series-b", "Amsterdam", "KYB and compliance automation", "banks, EMIs and payment companies"],
  ["Fennel Payroll", "fintech", "series-a", "Dublin", "payroll and contractor payments", "companies hiring across the EU"],
  ["Driftmark", "fintech", "seed", "Amsterdam", "embedded insurance APIs", "mobility and rental platforms"],
  // Climate
  ["Windvane Grid", "climate", "series-a", "Amsterdam", "grid-flexibility software for batteries and heat pumps", "energy suppliers and asset owners"],
  ["Polderheat", "climate", "series-b", "Rotterdam", "end-to-end heat pump installation", "homeowners and housing associations"],
  ["Carbonwick", "climate", "seed", "Copenhagen", "carbon accounting", "SMEs facing CSRD reporting via their customers"],
  ["Reclaimr", "climate", "seed", "Amsterdam", "reusable packaging and returns logistics", "grocery and home-goods retailers"],
  ["Solenne Storage", "climate", "series-a", "Eindhoven", "home battery leasing", "households with rooftop solar"],
  ["Dykeline", "climate", "pre-seed", "Delft", "leak detection for water networks", "water utilities and municipalities"],
  ["Gale & Ember", "climate", "series-c+", "Hamburg", "industrial heat electrification", "food, paper and chemicals plants"],
  ["Mossgrid", "climate", "series-b", "Amsterdam", "EV fleet charging orchestration", "logistics and leasing fleets"],
  // B2B SaaS
  ["Rosterwell", "saas", "series-a", "Amsterdam", "shift planning and workforce scheduling", "hospitality and retail chains"],
  ["Clausewise", "saas", "series-b", "London", "contract lifecycle management", "in-house legal teams"],
  ["Tenderloop", "saas", "seed", "Utrecht", "procurement intake and supplier onboarding", "procurement teams at mid-sized enterprises"],
  ["Kettlebridge", "saas", "series-a", "Antwerp", "field service management", "installers and maintenance contractors"],
  ["Pallet Atlas", "saas", "series-b", "Rotterdam", "warehouse operations software", "3PLs and omnichannel retailers"],
  ["Hearthdesk", "saas", "seed", "Amsterdam", "property management software", "residential landlords and housing associations"],
  ["Nordlicht Analytics", "saas", "series-c+", "Berlin", "retail demand forecasting", "grocery and fashion retailers"],
  ["Plumline", "saas", "pre-seed", "Haarlem", "a vertical CRM", "plumbing and HVAC installers"],
  ["Signalbay", "saas", "series-a", "Amsterdam", "customer feedback analytics", "support and product teams at B2C companies"],
  // Health
  ["Corvia Health", "health", "series-b", "Amsterdam", "remote cardiac monitoring", "cardiology departments and insurers"],
  ["Mendwell", "health", "series-a", "Amsterdam", "digital physiotherapy for back and joint pain", "employers and health insurers"],
  ["Kliniq Flow", "health", "seed", "Utrecht", "operating-room scheduling", "hospital planning teams"],
  ["Dosewise", "health", "seed", "Ghent", "medication adherence", "pharmacies and chronic-care patients"],
  ["Fertiel", "health", "series-a", "London", "fertility and family-forming benefits", "employers across Europe"],
  ["Pulsebridge Labs", "health", "pre-seed", "Leiden", "clinical trial patient matching", "sponsors and CROs"],
  ["Sanavo Care", "health", "series-b", "Rotterdam", "home-care workforce management", "home-care providers"],
  // Devtools
  ["Stackharbor", "devtools", "series-a", "Amsterdam", "ephemeral preview environments", "platform and product engineering teams"],
  ["Lintwright", "devtools", "seed", "Berlin", "AI-assisted code review", "engineering teams of 20–500 developers"],
  ["Flagpost", "devtools", "seed", "Amsterdam", "feature flags and progressive delivery", "product engineering teams"],
  ["Tracewell", "devtools", "series-b", "Amsterdam", "observability for data pipelines", "data platform teams"],
  ["Schemata Labs", "devtools", "pre-seed", "Amsterdam", "safe database schema migrations", "backend teams on Postgres"],
  ["Patchyard", "devtools", "series-a", "Munich", "dependency and supply-chain security", "security and platform teams"],
  ["Cobble API", "devtools", "seed", "Lisbon", "API mocking and contract testing", "teams shipping public APIs"],
  // Marketplaces
  ["Klusjesclub", "marketplace", "series-a", "Amsterdam", "a marketplace for vetted local tradespeople", "homeowners in the Benelux"],
  ["Freightnest", "marketplace", "series-b", "Rotterdam", "a digital freight marketplace", "shippers and small carriers"],
  ["Ateliermarkt", "marketplace", "seed", "Amsterdam", "a booking marketplace for creative studios", "photographers and production crews"],
  ["Locumbridge", "marketplace", "series-a", "Utrecht", "a staffing marketplace for locum clinicians", "hospitals and GP practices"],
  ["Refurbo", "marketplace", "seed", "Eindhoven", "a marketplace for refurbished office equipment", "SMEs and facility managers"],
  // AI infrastructure
  ["Tokenmill", "aiinfra", "series-a", "Amsterdam", "LLM inference cost optimisation", "AI product teams"],
  ["Evalgarden", "aiinfra", "seed", "London", "model evaluation and regression testing", "teams shipping LLM features"],
  ["Computesluis", "aiinfra", "pre-seed", "Amsterdam", "GPU scheduling across clouds", "ML platform teams"],
  ["Annotaire", "aiinfra", "series-b", "Paris", "expert data labelling", "foundation-model and applied AI teams"],
  ["Fenceline AI", "aiinfra", "seed", "Amsterdam", "guardrails and red-teaming for LLM apps", "regulated enterprises"],
];

// [name, corpKind, industry, hq, employees, description]
type CorporateSeed = [string, CorpKind, string, string, string, string];

export const CORPORATE_SEEDS: CorporateSeed[] = [
  ["Noordhaven Bank", "bank", "Banking", "Amsterdam", "10,001+", "A Dutch universal bank serving retail, SME and corporate clients across the Benelux."],
  ["Ravelpay", "payments", "Payments", "Amsterdam", "1,001-5,000", "A European payments processor handling online and in-store acquiring for merchants of every size."],
  ["Assistora", "support_software", "Customer support software", "Dublin", "1,001-5,000", "A customer-support platform offering ticketing, chat and help-centre software to 40,000 businesses."],
  ["Lowland Telecom", "telco", "Telecommunications", "The Hague", "5,001-10,000", "A Benelux mobile and fixed-line operator with a growing IoT and business-connectivity unit."],
  ["Veenstroom Energy", "energy", "Energy", "Arnhem", "5,001-10,000", "An integrated energy supplier and network operator with 2.4 million retail customers."],
  ["Huisgoed Retail Group", "retail", "Retail", "Zaandam", "10,001+", "A grocery and home-goods retailer operating 900 stores and a large online business."],
  ["Ashgrove Strategy Partners", "consultancy", "Management consulting", "London", "5,001-10,000", "A strategy and operations consultancy with practices in financial services, energy and retail."],
  ["Dijkwacht Insurance", "insurance", "Insurance", "Utrecht", "5,001-10,000", "A health and property insurer covering 3 million policyholders in the Netherlands."],
  ["Havenlink Logistics", "logistics", "Logistics", "Rotterdam", "10,001+", "A port-centred logistics group running warehousing, freight forwarding and road transport."],
  ["Rivierland Hospital Group", "hospital", "Hospitals & health care", "Utrecht", "10,001+", "A group of seven teaching and general hospitals in the centre of the Netherlands."],
  ["Cloudmere", "cloud", "Cloud infrastructure", "Dublin", "10,001+", "A European cloud and hosting provider with data centres in five countries."],
];

// [name, hq, focus sectors, description]
type InvestorSeed = [string, string, IndustryKey[], string];

export const INVESTOR_SEEDS: InvestorSeed[] = [
  ["Lantern Peak Capital", "London", ["saas", "devtools", "aiinfra"], "A Series A and B fund backing European software companies."],
  ["Haringvliet Partners", "Amsterdam", ["climate", "marketplace"], "A Dutch climate and circular-economy fund writing first institutional cheques."],
  ["Brightmoor Ventures", "Berlin", ["fintech", "saas"], "A seed fund focused on fintech and vertical software in the DACH region."],
  ["Kestrel Bay Capital", "Paris", ["aiinfra", "devtools", "saas"], "An early-stage fund investing in AI infrastructure and developer platforms."],
  ["Oakmeadow Partners", "London", ["fintech", "health", "saas"], "A growth fund leading Series B and C rounds in Europe."],
  ["Fjordline Ventures", "Copenhagen", ["climate", "health", "saas"], "A Nordic generalist seed and Series A fund."],
  ["Molenwiek Capital", "Amsterdam", ["fintech", "marketplace", "saas"], "A Benelux pre-seed and seed fund with a large angel network."],
  ["Saltmarsh Ventures", "Dublin", ["devtools", "aiinfra"], "A technical-founder fund backing developer tools and infrastructure."],
  ["Copperbeech Growth", "London", ["health", "fintech"], "A growth-stage investor specialising in health tech and medtech."],
  ["Dune & Delta Ventures", "Rotterdam", ["climate", "marketplace", "health"], "A corporate-backed fund investing in logistics, energy and care."],
];

// [name, industry label, hq, employees, one-liner]
type StartupSeed = [string, string, string, string, string];

export const STARTUP_SEEDS: StartupSeed[] = [
  ["Bikeshed Mobility", "Mobility", "Amsterdam", "201-500", "E-bike subscriptions for commuters"],
  ["Fluxdam", "Fintech", "Amsterdam", "501-1,000", "Mobile banking for young professionals"],
  ["Ovenfresh", "Food delivery", "Amsterdam", "1,001-5,000", "Quick-commerce grocery delivery"],
  ["Paperkite", "B2B SaaS", "Amsterdam", "201-500", "Document workflow automation"],
  ["Hopwise", "Travel tech", "Amsterdam", "501-1,000", "Online travel booking for small groups"],
  ["Datamoor", "Data infrastructure", "Amsterdam", "201-500", "A managed data warehouse for analysts"],
  ["Greenhalm Energy", "Energy", "Utrecht", "201-500", "A green energy supplier for households"],
  ["Tellerbird", "Payments", "Berlin", "501-1,000", "Point-of-sale payments for restaurants"],
  ["Kalmhuis Health", "Health tech", "Berlin", "201-500", "Online GP consultations"],
  ["Northquay Robotics", "Robotics", "Eindhoven", "51-200", "Warehouse picking robots"],
  ["Quillstack", "Developer tools", "Berlin", "201-500", "A hosted CI/CD platform"],
  ["Brightgrove HR", "HR tech", "Amsterdam", "201-500", "HR and payroll software for SMEs"],
  ["Peppermill Foods", "Consumer goods", "Rotterdam", "201-500", "Plant-based ready meals"],
  ["Lumacart", "E-commerce", "Amsterdam", "501-1,000", "An online marketplace for home décor"],
  ["Silverbirch Lending", "Fintech", "London", "201-500", "SME lending marketplace"],
  ["Orbitdesk", "B2B SaaS", "London", "501-1,000", "IT service management software"],
  ["Wavelength Audio", "Consumer tech", "Copenhagen", "51-200", "Wireless headphones and audio software"],
  ["Rentsy", "Proptech", "Amsterdam", "51-200", "Rental platform for students"],
  ["Tidewater Analytics", "Data & analytics", "Rotterdam", "51-200", "Port and shipping analytics"],
  ["Crestline Security", "Cybersecurity", "Munich", "201-500", "Endpoint security for mid-market IT teams"],
  ["Hearthguard Insurtech", "Insurtech", "Amsterdam", "51-200", "Digital home insurance"],
  ["Junoflow", "B2B SaaS", "Amsterdam", "201-500", "Marketing automation for e-commerce"],
  ["Parcelpost Labs", "Logistics", "Utrecht", "201-500", "Same-day parcel delivery"],
  ["Vitalis Diagnostics", "Health tech", "Leiden", "51-200", "At-home blood testing"],
  ["Quantwell", "Fintech", "London", "201-500", "Wealth management app"],
  ["Sproutcode", "Edtech", "Amsterdam", "51-200", "Online coding courses for adults"],
  ["Coldchain Collective", "Logistics", "Rotterdam", "51-200", "Refrigerated freight for food producers"],
  ["Mintleaf Software", "B2B SaaS", "Utrecht", "51-200", "Accounting software for bookkeepers"],
  ["Ferrybox", "Logistics", "Hamburg", "201-500", "Container booking for small forwarders"],
  ["Gridlight Solar", "Energy", "Eindhoven", "201-500", "Commercial rooftop solar installer"],
  ["Murmuration Labs", "AI", "London", "51-200", "Conversational AI for contact centres"],
  ["Basalt Cloud", "Cloud infrastructure", "Frankfurt", "201-500", "Managed Kubernetes for enterprises"],
  ["Ticketline Events", "Events", "Amsterdam", "51-200", "Event ticketing for festivals"],
  ["Medilane", "Health tech", "Utrecht", "201-500", "Pharmacy software and e-prescriptions"],
  ["Upbeat Commerce", "E-commerce", "Berlin", "501-1,000", "Headless commerce platform"],
  ["Carrotcake Studio", "Design", "Amsterdam", "11-50", "Product design agency"],
  ["Driftwood Games", "Gaming", "Helsinki", "201-500", "Mobile puzzle games"],
  ["Nettlebank", "Fintech", "Amsterdam", "201-500", "Business current accounts for freelancers"],
  ["Lumeno Scooters", "Mobility", "Rotterdam", "51-200", "Shared electric scooters"],
  ["Spindle Analytics", "Data & analytics", "London", "201-500", "Product analytics for mobile apps"],
  ["Tessellate", "Developer tools", "Amsterdam", "51-200", "Front-end component platform"],
  ["Copperline Payments", "Payments", "Dublin", "201-500", "Payouts and treasury APIs"],
  ["Harbourmaster", "B2B SaaS", "Rotterdam", "51-200", "Port-call scheduling software"],
  ["Willowcare", "Health tech", "Amsterdam", "201-500", "Mental health app for employers"],
  ["Pollux Compliance", "Regtech", "Luxembourg", "51-200", "AML transaction monitoring"],
  ["Fieldfare", "Agtech", "Wageningen", "51-200", "Precision-farming sensors"],
  ["Stitchwell", "Fashion tech", "Amsterdam", "201-500", "Online made-to-measure clothing"],
  ["Ironbark Systems", "Industrial software", "Eindhoven", "201-500", "Maintenance software for manufacturers"],
  ["Lanternfish", "AI", "Paris", "51-200", "Computer vision for retail shelves"],
  ["Mapleleaf Recruiting", "Recruitment", "Amsterdam", "51-200", "Tech recruitment agency"],
  ["Pebblepath", "Proptech", "Utrecht", "51-200", "Mortgage comparison platform"],
  ["Ripplecast", "Media", "Amsterdam", "51-200", "Podcast advertising marketplace"],
  ["Sablewood Ventures Studio", "Venture studio", "Amsterdam", "11-50", "Venture studio building B2B startups"],
  ["Thornbury Labs", "Developer tools", "London", "51-200", "API gateway for fintechs"],
  ["Upstream Water", "Climate tech", "Delft", "51-200", "Water treatment monitoring"],
  ["Velvet Robotics", "Robotics", "Munich", "51-200", "Kitchen automation robots"],
  ["Waypoint Freight", "Logistics", "Antwerp", "201-500", "Freight forwarding software"],
  ["Yondermere Health", "Health tech", "London", "201-500", "Remote patient monitoring for chronic disease"],
  ["Galewind Charging", "Climate tech", "Amsterdam", "201-500", "Public EV charging network"],
  ["Kindling Data", "AI", "Amsterdam", "51-200", "Data labelling platform"],
];

const STAGE_SIZE: Record<CompanyStage, string[]> = {
  "pre-seed": ["2-10"],
  seed: ["11-50"],
  "series-a": ["11-50", "51-200"],
  "series-b": ["51-200"],
  "series-c+": ["201-500"],
};

// How long ago (in months) Stroopwafel invested, by stage.
const STAGE_INVESTED_AGO: Record<CompanyStage, [number, number]> = {
  "pre-seed": [2, 16],
  seed: [6, 30],
  "series-a": [14, 44],
  "series-b": [30, 66],
  "series-c+": [54, 92],
};

export function domainFor(name: string): string {
  return `${slugify(name).replace(/-/g, "")}.example`;
}

function portfolioDescription(name: string, product: string, customer: string, stage: CompanyStage, foundedYear: number, city: string, rng: Rng): string {
  const lead = rng.pick([
    `${name} builds ${product} for ${customer}.`,
    `${name} offers ${product} to ${customer}.`,
    `${name} provides ${product} for ${customer}.`,
  ]);
  const middle = rng.pick([
    `Founded in ${foundedYear} and headquartered in ${city}, the company is at ${stage} stage.`,
    `The ${city}-based team started in ${foundedYear} and has raised through ${stage}.`,
    `Started in ${city} in ${foundedYear}, it is now a ${stage} company.`,
  ]);
  return `${lead} ${middle}`;
}

export function buildCompanies(rng: Rng): { companies: CompanyFixture[]; meta: Record<string, CompanyMeta> } {
  const companies: CompanyFixture[] = [];
  const meta: Record<string, CompanyMeta> = {};

  const add = (c: CompanyFixture, m: Omit<CompanyMeta, "id" | "slug" | "domain">) => {
    const slug = slugify(c.name);
    companies.push(c);
    meta[c.id] = { id: c.id, slug, domain: domainFor(c.name), ...m };
  };

  for (const [name, industry, stage, hq, product, customer] of PORTFOLIO_SEEDS) {
    const slug = slugify(name);
    const [minAgo, maxAgo] = STAGE_INVESTED_AGO[stage];
    const investedMonth = TODAY_MONTH - rng.int(minAgo, maxAgo);
    const foundedMonth = investedMonth - rng.int(stage === "pre-seed" ? 2 : 8, stage === "pre-seed" ? 10 : 30);
    const invested_on = `${monthToIso(investedMonth).slice(0, 8)}${String(rng.int(1, 28)).padStart(2, "0")}`;
    add(
      {
        id: stableId(`company:${slug}`),
        name,
        kind: "portfolio",
        industry: INDUSTRY_LABEL[industry],
        hq_location: `${hq}, ${countryOf(hq)}`,
        website: `https://${domainFor(name)}`,
        description: portfolioDescription(name, product, customer, stage, Math.floor(foundedMonth / 12), hq, rng),
        employee_count_range: rng.pick(STAGE_SIZE[stage]),
        linkedin_url: rng.chance(0.92) ? `https://www.linkedin.com/company/fictional-${slug}` : null,
        stage,
        invested_on,
      },
      { industryKey: industry, corpKind: null, product, customer, foundedMonth, focus: [] },
    );
  }

  for (const [name, corpKind, industry, hq, size, description] of CORPORATE_SEEDS) {
    const slug = slugify(name);
    add(
      {
        id: stableId(`company:${slug}`), name, kind: "corporate", industry,
        hq_location: `${hq}, ${countryOf(hq)}`, website: `https://${domainFor(name)}`, description,
        employee_count_range: size, linkedin_url: `https://www.linkedin.com/company/fictional-${slug}`,
        stage: null, invested_on: null,
      },
      { industryKey: null, corpKind, product: industry.toLowerCase(), customer: "", foundedMonth: monthOf("1990-01-01") - rng.int(0, 600), focus: [] },
    );
  }

  for (const [name, hq, focus, description] of INVESTOR_SEEDS) {
    const slug = slugify(name);
    add(
      {
        id: stableId(`company:${slug}`), name, kind: "investor", industry: "Venture capital",
        hq_location: `${hq}, ${countryOf(hq)}`, website: `https://${domainFor(name)}`, description,
        employee_count_range: rng.pick(["11-50", "11-50", "2-10"]),
        linkedin_url: rng.chance(0.9) ? `https://www.linkedin.com/company/fictional-${slug}` : null,
        stage: null, invested_on: null,
      },
      { industryKey: null, corpKind: null, product: "venture capital", customer: "founders", foundedMonth: monthOf("2008-01-01") + rng.int(0, 140), focus },
    );
  }

  for (const [name, industry, hq, size, oneLiner] of STARTUP_SEEDS) {
    const slug = slugify(name);
    const founded = 2010 + rng.int(0, 10);
    add(
      {
        id: stableId(`company:${slug}`), name, kind: "startup", industry,
        hq_location: `${hq}, ${countryOf(hq)}`,
        website: rng.chance(0.93) ? `https://${domainFor(name)}` : "",
        description: `${oneLiner}. Founded in ${founded}, based in ${hq}.`,
        employee_count_range: size,
        linkedin_url: rng.chance(0.85) ? `https://www.linkedin.com/company/fictional-${slug}` : null,
        stage: null, invested_on: null,
      },
      { industryKey: null, corpKind: null, product: oneLiner.toLowerCase(), customer: "", foundedMonth: founded * 12, focus: [] },
    );
  }

  return { companies, meta };
}

const COUNTRY: Record<string, string> = {
  Amsterdam: "Netherlands", Rotterdam: "Netherlands", Utrecht: "Netherlands", "The Hague": "Netherlands",
  Eindhoven: "Netherlands", Haarlem: "Netherlands", Delft: "Netherlands", Leiden: "Netherlands",
  Groningen: "Netherlands", Zaandam: "Netherlands", Arnhem: "Netherlands", Wageningen: "Netherlands",
  Berlin: "Germany", Munich: "Germany", Hamburg: "Germany", Cologne: "Germany", Frankfurt: "Germany",
  London: "United Kingdom", Manchester: "United Kingdom", Edinburgh: "United Kingdom", Bristol: "United Kingdom",
  Dublin: "Ireland", Paris: "France", Lyon: "France", Lille: "France", Copenhagen: "Denmark", Aarhus: "Denmark",
  Stockholm: "Sweden", Oslo: "Norway", Helsinki: "Finland", Antwerp: "Belgium", Ghent: "Belgium", Brussels: "Belgium",
  Lisbon: "Portugal", Porto: "Portugal", Madrid: "Spain", Barcelona: "Spain", Valencia: "Spain", Milan: "Italy",
  Turin: "Italy", Bologna: "Italy", Rome: "Italy", Vienna: "Austria", Zurich: "Switzerland", Warsaw: "Poland",
  Krakow: "Poland", Prague: "Czechia", Budapest: "Hungary", Bucharest: "Romania", Ljubljana: "Slovenia",
  Athens: "Greece", Istanbul: "Türkiye", Luxembourg: "Luxembourg", "New York": "United States",
  "San Francisco": "United States", Boston: "United States",
};

export function countryOf(city: string): string {
  return COUNTRY[city] ?? "Netherlands";
}
